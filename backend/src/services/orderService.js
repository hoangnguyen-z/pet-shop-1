const mongoose = require('mongoose');
const { User, Product, Order, Coupon, Notification, OrderLog } = require('../models');
const ApiError = require('../utils/ApiError');
const {
    ORDER_STATUS,
    PAYMENT_METHODS,
    PAYMENT_STATUS,
    SHIPPING_METHODS,
    SHIPPING_STATUS
} = require('../config/constants');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePaymentMethod(value) {
    const method = String(value || '').trim().toLowerCase();
    if (!method) return PAYMENT_METHODS.COD;
    if (['cod', 'cash_on_delivery'].includes(method)) return PAYMENT_METHODS.COD;
    if (['bank', 'bank_transfer', 'transfer'].includes(method)) return PAYMENT_METHODS.BANK_TRANSFER;
    if (['online', 'card', 'gateway'].includes(method)) return PAYMENT_METHODS.ONLINE;
    if ([PAYMENT_METHODS.VNPAY, PAYMENT_METHODS.MOMO].includes(method)) return method;
    throw ApiError.badRequest('Invalid payment method');
}

function normalizeShippingMethod(value) {
    const method = String(value || '').trim().toLowerCase();
    if (!method) return SHIPPING_METHODS.STANDARD;
    if (['standard', 'normal'].includes(method)) return SHIPPING_METHODS.STANDARD;
    if (['express', 'fast'].includes(method)) return SHIPPING_METHODS.EXPRESS;
    throw ApiError.badRequest('Invalid shipping method');
}

function normalizeShippingAddress(raw = {}) {
    const address = {
        fullName: raw.fullName || raw.full_name || '',
        phone: raw.phone || '',
        email: raw.email || '',
        addressLine: raw.addressLine || raw.address_line || raw.street || '',
        street: raw.street || raw.addressLine || raw.address_line || '',
        ward: raw.ward || '',
        district: raw.district || '',
        city: raw.city || '',
        postalCode: raw.postalCode || raw.postal_code || '',
        country: raw.country || 'Vietnam'
    };

    if (!address.fullName.trim()) throw ApiError.badRequest('Shipping full name is required');
    if (!address.phone.trim()) throw ApiError.badRequest('Shipping phone is required');
    if (!address.email.trim() || !emailPattern.test(address.email)) throw ApiError.badRequest('A valid shipping email is required');
    if (!address.addressLine.trim()) throw ApiError.badRequest('Shipping address line is required');
    if (!address.city.trim()) throw ApiError.badRequest('Shipping city is required');

    return address;
}

function normalizeRequestedItems(items = []) {
    if (!Array.isArray(items) || items.length === 0) {
        throw ApiError.badRequest('Order items are required');
    }

    const merged = new Map();
    for (const item of items) {
        const productId = item.product_id || item.productId || item.product;
        const quantity = Number(item.quantity);
        if (!productId) throw ApiError.badRequest('Each item must include product_id');
        if (!Number.isInteger(quantity) || quantity <= 0) throw ApiError.badRequest('Item quantity must be greater than 0');

        const key = String(productId);
        merged.set(key, {
            productId: key,
            quantity: (merged.get(key)?.quantity || 0) + quantity
        });
    }

    return Array.from(merged.values());
}

function resolveProductPrice(product) {
    const now = Date.now();
    if (product.flashSale?.isActive
        && product.flashSale?.discountPrice > 0
        && (!product.flashSale.startTime || new Date(product.flashSale.startTime).getTime() <= now)
        && (!product.flashSale.endTime || new Date(product.flashSale.endTime).getTime() >= now)) {
        return product.flashSale.discountPrice;
    }

    return product.price;
}

function calculateShippingFee(subtotal, shippingMethod) {
    if (shippingMethod === SHIPPING_METHODS.EXPRESS) {
        return subtotal >= 75 ? 8.5 : 12.5;
    }
    return subtotal >= 35 ? 0 : 5;
}

function initialPaymentStatus(paymentMethod) {
    if (paymentMethod === PAYMENT_METHODS.COD) return PAYMENT_STATUS.UNPAID;
    if (paymentMethod === PAYMENT_METHODS.BANK_TRANSFER) return PAYMENT_STATUS.PENDING;
    return PAYMENT_STATUS.PENDING;
}

function deriveShippingStatus(orderStatus) {
    if ([ORDER_STATUS.WAITING_PAYMENT, ORDER_STATUS.PAID, ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PREPARING].includes(orderStatus)) {
        return SHIPPING_STATUS.PENDING;
    }
    if (orderStatus === ORDER_STATUS.SHIPPING) return SHIPPING_STATUS.SHIPPING;
    if ([ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETED].includes(orderStatus)) return SHIPPING_STATUS.DELIVERED;
    if ([ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED].includes(orderStatus)) return SHIPPING_STATUS.CANCELLED;
    return SHIPPING_STATUS.PENDING;
}

function syncOrderState(order, overrides = {}) {
    if (overrides.orderStatus) order.orderStatus = overrides.orderStatus;
    if (order.orderStatus) order.status = order.orderStatus;

    if (overrides.paymentMethod) order.paymentMethod = overrides.paymentMethod;
    if (overrides.paymentStatus) order.paymentStatus = overrides.paymentStatus;
    if (order.payment) {
        order.payment.method = order.paymentMethod || order.payment.method;
        order.payment.status = order.paymentStatus || order.payment.status;
    }

    order.shippingStatus = overrides.shippingStatus || deriveShippingStatus(order.orderStatus || order.status);
    order.discountAmount = order.discountAmount ?? order.discount ?? 0;
    order.finalAmount = order.finalAmount ?? order.total;
    order.total = order.finalAmount;
    return order;
}

async function writeOrderLog({ orderId, event, actorType = 'system', actorId = null, message, data = null, session = null }) {
    return OrderLog.create([{
        order: orderId,
        event,
        actorType,
        actorId,
        message,
        data
    }], session ? { session } : undefined).then(records => records[0]);
}

async function generateUniqueOrderNumber() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).slice(2, 8).toUpperCase();
        const orderNumber = `PET${timestamp}${random}`;
        const exists = await Order.exists({ orderNumber });
        if (!exists) return orderNumber;
    }

    throw ApiError.internal('Unable to generate a unique order number');
}

async function buildPreparedItems(normalizedItems) {
    const productIds = normalizedItems.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } }).populate('shop', 'name status isVerified');
    const productMap = new Map(products.map(product => [String(product._id), product]));

    const preparedItems = normalizedItems.map(item => {
        const product = productMap.get(item.productId);
        if (!product) throw ApiError.badRequest(`Product not found: ${item.productId}`);
        if (!product.isActive) throw ApiError.badRequest(`Product is not available: ${product.name}`);
        if (!product.isVerified) throw ApiError.badRequest(`Product is not approved for sale: ${product.name}`);
        if (!product.shop || product.shop.status !== 'approved') throw ApiError.badRequest(`Shop is not active for product: ${product.name}`);
        if (product.stock < item.quantity) throw ApiError.badRequest(`Insufficient stock for ${product.name}`);

        const unitPrice = resolveProductPrice(product);
        return {
            productId: product._id,
            shopId: product.shop._id || product.shop,
            sellerId: product.seller,
            categoryId: product.category,
            name: product.name,
            image: product.images?.[0] || product.thumbnail || '',
            sku: product.sku,
            quantity: item.quantity,
            price: unitPrice,
            lineTotal: unitPrice * item.quantity
        };
    });

    return preparedItems;
}

async function evaluateCoupon({ voucherCode, preparedItems, subtotal, userId }) {
    if (!voucherCode) {
        return {
            coupon: null,
            eligibleSubtotal: 0,
            discountAmount: 0
        };
    }

    const now = new Date();
    const coupon = await Coupon.findOne({
        code: String(voucherCode).toUpperCase(),
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now }
    });

    if (!coupon) throw ApiError.badRequest('Voucher is invalid or expired');
    if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) throw ApiError.badRequest('Voucher usage limit reached');

    if (coupon.perUserLimit) {
        const usedByUser = await Order.countDocuments({
            buyer: userId,
            status: { $ne: ORDER_STATUS.CANCELLED },
            'coupon.code': coupon.code
        });
        if (usedByUser >= coupon.perUserLimit) {
            throw ApiError.badRequest('Voucher usage limit reached for this account');
        }
    }

    const applicableProducts = new Set((coupon.applicableProducts || []).map(id => String(id)));
    const applicableCategories = new Set((coupon.applicableCategories || []).map(id => String(id)));

    const eligibleItems = preparedItems.filter(item => {
        if (coupon.shop && String(item.shopId) !== String(coupon.shop)) return false;
        if (coupon.seller && String(item.sellerId) !== String(coupon.seller)) return false;
        if (applicableProducts.size > 0 && !applicableProducts.has(String(item.productId))) return false;
        if (applicableCategories.size > 0 && !applicableCategories.has(String(item.categoryId))) return false;
        return true;
    });

    const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + item.lineTotal, 0);
    if (eligibleSubtotal <= 0) throw ApiError.badRequest('Voucher does not apply to the selected items');
    if (eligibleSubtotal < coupon.minOrderAmount) throw ApiError.badRequest(`Voucher requires at least ${coupon.minOrderAmount.toFixed(2)} in eligible items`);

    let discountAmount = coupon.type === 'percentage'
        ? eligibleSubtotal * coupon.value / 100
        : coupon.value;

    if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    discountAmount = Math.min(discountAmount, subtotal);

    return {
        coupon,
        eligibleSubtotal,
        discountAmount
    };
}

function buildQuoteResponse({ preparedItems, shippingMethod, shippingFee, subtotal, couponResult, finalAmount, paymentMethod }) {
    return {
        items: preparedItems.map(item => ({
            product_id: item.productId,
            quantity: item.quantity,
            price: item.price,
            line_total: item.lineTotal
        })),
        shipping_method: shippingMethod,
        shipping_fee: shippingFee,
        subtotal,
        discount_amount: couponResult.discountAmount,
        total_amount: finalAmount,
        payment_method: paymentMethod,
        voucher: couponResult.coupon ? {
            code: couponResult.coupon.code,
            discount_type: couponResult.coupon.type,
            discount_value: couponResult.coupon.value,
            eligible_subtotal: couponResult.eligibleSubtotal,
            discount_amount: couponResult.discountAmount
        } : null
    };
}

async function quoteOrder({ userId, payload, requireShippingAddress = false }) {
    const userIdFromPayload = payload.user_id || payload.userId;
    if (userIdFromPayload && String(userIdFromPayload) !== String(userId)) {
        throw ApiError.forbidden('user_id does not match the authenticated account');
    }

    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    const fallbackCartItems = (user.cart?.items || []).map(item => ({
        productId: item.product,
        quantity: item.quantity
    }));
    const normalizedItems = normalizeRequestedItems(payload.items?.length ? payload.items : fallbackCartItems);
    const rawShippingAddress = payload.shipping_address || payload.shippingAddress || {};
    const shippingAddress = requireShippingAddress
        ? normalizeShippingAddress(rawShippingAddress)
        : {
            fullName: rawShippingAddress.fullName || rawShippingAddress.full_name || '',
            phone: rawShippingAddress.phone || '',
            email: rawShippingAddress.email || '',
            addressLine: rawShippingAddress.addressLine || rawShippingAddress.address_line || rawShippingAddress.street || '',
            street: rawShippingAddress.street || rawShippingAddress.addressLine || rawShippingAddress.address_line || '',
            ward: rawShippingAddress.ward || '',
            district: rawShippingAddress.district || '',
            city: rawShippingAddress.city || '',
            postalCode: rawShippingAddress.postalCode || rawShippingAddress.postal_code || '',
            country: rawShippingAddress.country || 'Vietnam'
        };
    const shippingMethod = normalizeShippingMethod(payload.shipping_method || payload.shippingMethod);
    const paymentMethod = normalizePaymentMethod(payload.payment_method || payload.paymentMethod);
    const preparedItems = await buildPreparedItems(normalizedItems);
    const subtotal = preparedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const shippingFee = calculateShippingFee(subtotal, shippingMethod);
    const couponResult = await evaluateCoupon({
        voucherCode: payload.voucher_code || payload.voucherCode || payload.couponCode,
        preparedItems,
        subtotal,
        userId: user._id
    });
    const finalAmount = Math.max(0, subtotal + shippingFee - couponResult.discountAmount);

    return {
        user,
        shippingAddress,
        shippingMethod,
        paymentMethod,
        preparedItems,
        subtotal,
        shippingFee,
        couponResult,
        finalAmount,
        note: payload.note || '',
        response: buildQuoteResponse({
            preparedItems,
            shippingMethod,
            shippingFee,
            subtotal,
            couponResult,
            finalAmount,
            paymentMethod
        })
    };
}

async function reserveInventory(preparedItems, session = null) {
    const reserved = [];
    try {
        for (const item of preparedItems) {
            const updated = await Product.findOneAndUpdate(
                {
                    _id: item.productId,
                    isActive: true,
                    isVerified: true,
                    stock: { $gte: item.quantity }
                },
                {
                    $inc: {
                        stock: -item.quantity,
                        soldCount: item.quantity
                    }
                },
                session ? { new: true, session } : { new: true }
            );

            if (!updated) {
                throw ApiError.badRequest(`Stock changed while checking out: ${item.name}`);
            }

            reserved.push(item);
        }

        return reserved;
    } catch (error) {
        await releaseInventory(reserved);
        throw error;
    }
}

async function releaseInventory(reservedItems = []) {
    await Promise.all(reservedItems.map(item => Product.findByIdAndUpdate(item.productId, {
        $inc: {
            stock: item.quantity,
            soldCount: -item.quantity
        }
    })));
}

function isTransactionUnsupportedError(error) {
    const message = String(error?.message || '');
    return message.includes('Transaction numbers are only allowed on a replica set member or mongos')
        || message.includes('ReplicaSetNoPrimary')
        || message.includes('Transaction support is not available');
}

async function reserveCouponUsage(coupon, session = null) {
    if (!coupon) return null;

    const filter = { _id: coupon._id };
    if (coupon.maxUsage) {
        filter.usedCount = { $lt: coupon.maxUsage };
    }

    const reservedCoupon = await Coupon.findOneAndUpdate(
        filter,
        { $inc: { usedCount: 1 } },
        session ? { new: true, session } : { new: true }
    );
    if (!reservedCoupon) throw ApiError.badRequest('Voucher usage limit reached');
    return reservedCoupon;
}

function buildOrderDocument({ user, shippingAddress, shippingMethod, paymentMethod, preparedItems, subtotal, shippingFee, couponResult, finalAmount, note, redirectUrl }) {
    const paymentStatus = initialPaymentStatus(paymentMethod);
    const orderStatus = paymentMethod === PAYMENT_METHODS.ONLINE
        ? ORDER_STATUS.WAITING_PAYMENT
        : ORDER_STATUS.PENDING;

    return {
        orderNumber: undefined,
        buyer: user._id,
        items: preparedItems.map(item => ({
            product: item.productId,
            shop: item.shopId,
            seller: item.sellerId,
            name: item.name,
            image: item.image,
            sku: item.sku,
            price: item.price,
            quantity: item.quantity,
            shopStatus: orderStatus
        })),
        shippingAddress,
        shippingMethod,
        shippingFee,
        shippingStatus: SHIPPING_STATUS.PENDING,
        subtotal,
        discount: couponResult.discountAmount,
        discountAmount: couponResult.discountAmount,
        coupon: couponResult.coupon ? {
            couponId: couponResult.coupon._id,
            code: couponResult.coupon.code,
            type: couponResult.coupon.type,
            value: couponResult.coupon.value,
            discountAmount: couponResult.discountAmount
        } : undefined,
        total: finalAmount,
        finalAmount,
        paymentMethod,
        paymentStatus,
        payment: {
            method: paymentMethod,
            status: paymentStatus,
            redirectUrl
        },
        status: orderStatus,
        orderStatus,
        statusHistory: [{
            status: orderStatus,
            note: 'Order created',
            updatedBy: user._id,
            updatedAt: new Date()
        }],
        notes: note
    };
}

async function createNotificationsForOrder(order, preparedItems) {
    const sellerIds = [...new Set(preparedItems.map(item => String(item.sellerId)))];
    const sellerNotifications = sellerIds.map(sellerId => Notification.create({
        user: sellerId,
        type: 'order',
        title: 'New order',
        message: `Order #${order.orderNumber} was placed`,
        data: { orderId: order._id }
    }));

    const buyerNotification = Notification.create({
        user: order.buyer,
        type: 'order',
        title: 'Order placed',
        message: `Your order #${order.orderNumber} was created successfully`,
        data: { orderId: order._id }
    });

    await Promise.allSettled([...sellerNotifications, buyerNotification]);
}

async function removeOrderedItemsFromCart(userId, preparedItems, session = null) {
    const productIds = preparedItems.map(item => item.productId);
    await User.findByIdAndUpdate(userId, {
        $pull: {
            'cart.items': {
                product: { $in: productIds }
            }
        }
    }, session ? { session } : undefined);
}

async function createOrderWithCompensation(context) {
    const reservedItems = await reserveInventory(context.preparedItems);
    let reservedCoupon = null;
    let order = null;

    try {
        reservedCoupon = await reserveCouponUsage(context.couponResult.coupon);
        const orderData = buildOrderDocument({
            user: context.user,
            shippingAddress: context.shippingAddress,
            shippingMethod: context.shippingMethod,
            paymentMethod: context.paymentMethod,
            preparedItems: context.preparedItems,
            subtotal: context.subtotal,
            shippingFee: context.shippingFee,
            couponResult: context.couponResult,
            finalAmount: context.finalAmount,
            note: context.note,
            redirectUrl: null
        });
        orderData.orderNumber = await generateUniqueOrderNumber();

        order = await Order.create(orderData);

        await OrderLog.insertMany([
            {
                order: order._id,
                event: 'created',
                actorType: 'buyer',
                actorId: context.user._id,
                message: 'Order created',
                data: {
                    orderStatus: order.orderStatus,
                    paymentStatus: order.paymentStatus,
                    shippingStatus: order.shippingStatus
                }
            },
            {
                order: order._id,
                event: 'inventory_reserved',
                actorType: 'system',
                message: 'Inventory reserved for checkout',
                data: reservedItems.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity
                }))
            }
        ]);
    } catch (error) {
        await releaseInventory(reservedItems);
        if (reservedCoupon) {
            await Coupon.findByIdAndUpdate(reservedCoupon._id, { $inc: { usedCount: -1 } });
        }
        throw error;
    }

    await Promise.allSettled([
        removeOrderedItemsFromCart(context.user._id, context.preparedItems),
        createNotificationsForOrder(order, context.preparedItems)
    ]);

    return {
        order,
        redirectUrl: order.payment?.redirectUrl || null
    };
}

async function createOrder({ userId, payload }) {
    const context = await quoteOrder({ userId, payload, requireShippingAddress: true });
    const session = await mongoose.startSession();

    try {
        let transactionResult = null;

        try {
            await session.withTransaction(async () => {
                await reserveInventory(context.preparedItems, session);
                await reserveCouponUsage(context.couponResult.coupon, session);

                const orderData = buildOrderDocument({
                    user: context.user,
                    shippingAddress: context.shippingAddress,
                    shippingMethod: context.shippingMethod,
                    paymentMethod: context.paymentMethod,
                    preparedItems: context.preparedItems,
                    subtotal: context.subtotal,
                    shippingFee: context.shippingFee,
                    couponResult: context.couponResult,
                    finalAmount: context.finalAmount,
                    note: context.note,
                    redirectUrl: null
                });
                orderData.orderNumber = await generateUniqueOrderNumber();

                const createdOrders = await Order.create([orderData], { session });
                const order = createdOrders[0];

                await OrderLog.insertMany([
                    {
                        order: order._id,
                        event: 'created',
                        actorType: 'buyer',
                        actorId: context.user._id,
                        message: 'Order created',
                        data: {
                            orderStatus: order.orderStatus,
                            paymentStatus: order.paymentStatus,
                            shippingStatus: order.shippingStatus
                        }
                    },
                    {
                        order: order._id,
                        event: 'inventory_reserved',
                        actorType: 'system',
                        message: 'Inventory reserved for checkout',
                        data: context.preparedItems.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity
                        }))
                    }
                ], { session });

                await removeOrderedItemsFromCart(context.user._id, context.preparedItems, session);

                transactionResult = {
                    order,
                    redirectUrl: order.payment?.redirectUrl || null
                };
            });
        } catch (error) {
            if (!isTransactionUnsupportedError(error)) {
                throw error;
            }
        }

        if (transactionResult) {
            await createNotificationsForOrder(transactionResult.order, context.preparedItems);
            return transactionResult;
        }

        return await createOrderWithCompensation(context);
    } finally {
        await session.endSession();
    }
}

module.exports = {
    quoteOrder,
    createOrder,
    syncOrderState,
    deriveShippingStatus,
    writeOrderLog,
    normalizePaymentMethod
};
