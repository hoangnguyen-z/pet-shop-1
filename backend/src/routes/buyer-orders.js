const express = require('express');
const router = express.Router();
const { Order, Product, Review, Coupon, OrderLog } = require('../models');
const ReturnRequest = require('../models/admin/Return');
const { authenticate } = require('../middleware/auth');
const { getPaginationMeta } = require('../middleware/pagination');
const { sendSuccess, sendCreated } = require('../middleware/responseHandler');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../config/constants');
const { quoteOrder, createOrder, syncOrderState, deriveShippingStatus, writeOrderLog } = require('../services/orderService');

const PAYMENT_CALLBACK_SECRET = process.env.PAYMENT_CALLBACK_SECRET || 'dev-payment-secret';

router.post('/:id/payment-callback', asyncHandler(async (req, res) => {
    const secret = req.get('x-payment-secret');
    if (secret !== PAYMENT_CALLBACK_SECRET) {
        throw ApiError.forbidden('Invalid payment callback secret');
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
        throw ApiError.notFound('Order not found');
    }

    const status = String(req.body.status || '').toLowerCase();
    const transactionId = req.body.transaction_id || req.body.transactionId || '';
    if (!['paid', 'failed', 'pending', 'processing', 'unpaid', 'expired', 'cancelled'].includes(status)) {
        throw ApiError.badRequest('Invalid payment callback status');
    }

    const nextOrderStatus = status === PAYMENT_STATUS.PAID
        ? ORDER_STATUS.PAID
        : order.orderStatus === ORDER_STATUS.WAITING_PAYMENT
            ? ORDER_STATUS.WAITING_PAYMENT
            : order.orderStatus;

    syncOrderState(order, {
        orderStatus: nextOrderStatus,
        paymentStatus: status
    });
    order.items = (order.items || []).map((item) => {
        if (nextOrderStatus) {
            item.shopStatus = nextOrderStatus;
        }
        return item;
    });
    if (transactionId) order.payment.transactionId = transactionId;
    if (status === PAYMENT_STATUS.PAID) order.payment.paidAt = new Date();
    await order.save();

    await writeOrderLog({
        orderId: order._id,
        event: status === PAYMENT_STATUS.PAID ? 'payment_paid' : status === PAYMENT_STATUS.FAILED ? 'payment_failed' : 'payment_pending',
        actorType: 'system',
        message: `Payment callback received: ${status}`,
        data: { transactionId }
    });

    sendSuccess(res, {
        order_id: order._id,
        order_number: order.orderNumber,
        payment_status: order.paymentStatus
    }, 'Payment callback processed');
}));

router.use(authenticate);
router.use((req, res, next) => {
    if (req.user.role !== 'buyer') {
        return next(ApiError.forbidden('Chi tai khoan nguoi mua moi duoc dat hang va quan ly don mua'));
    }
    next();
});

router.post('/quote', asyncHandler(async (req, res) => {
    const context = await quoteOrder({
        userId: req.user.id,
        payload: req.body,
        requireShippingAddress: false
    });

    sendSuccess(res, context.response, 'Order quote calculated');
}));

router.post('/validate-coupon', asyncHandler(async (req, res) => {
    const context = await quoteOrder({
        userId: req.user.id,
        payload: {
            ...req.body,
            voucher_code: req.body.code || req.body.voucher_code || req.body.voucherCode
        },
        requireShippingAddress: false
    });

    if (!context.couponResult.coupon) {
        throw ApiError.badRequest('Voucher is required');
    }

    sendSuccess(res, {
        code: context.couponResult.coupon.code,
        type: context.couponResult.coupon.type,
        value: context.couponResult.coupon.value,
        discount: context.couponResult.discountAmount,
        subtotal: context.subtotal,
        shipping_fee: context.shippingFee,
        total_amount: context.finalAmount
    }, 'Voucher applied');
}));

router.get('/my-orders', asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;
    const filter = { buyer: req.user.id, isDeleted: false };

    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
        Order.countDocuments(filter)
    ]);

    sendSuccess(res, orders, 'Loaded orders', getPaginationMeta(total, { page, limit }));
}));

router.get('/:id', asyncHandler(async (req, res) => {
    const order = await Order.findOne({
        _id: req.params.id,
        buyer: req.user.id
    }).populate('items.product', 'name images thumbnail');

    if (!order) {
        throw ApiError.notFound('Order not found');
    }

    const logs = await OrderLog.find({ order: order._id }).sort({ createdAt: 1 });
    sendSuccess(res, { ...order.toObject(), logs }, 'Loaded order detail');
}));

router.post('/', asyncHandler(async (req, res) => {
    const result = await createOrder({
        userId: req.user.id,
        payload: req.body
    });

    sendCreated(res, {
        _id: result.order._id,
        order_id: result.order._id,
        order_number: result.order.orderNumber,
        total_amount: result.order.finalAmount,
        payment_status: result.order.paymentStatus,
        redirect_url: result.redirectUrl,
        order: result.order
    }, 'Order created successfully');
}));

router.post('/:orderId/reviews/:productId', asyncHandler(async (req, res) => {
    const { rating, title, comment, images = [] } = req.body;

    const order = await Order.findOne({
        _id: req.params.orderId,
        buyer: req.user.id,
        status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETED] },
        'items.product': req.params.productId
    });

    if (!order) {
        throw ApiError.forbidden('You can only review delivered products you purchased');
    }

    const item = order.items.find(entry => entry.product.toString() === req.params.productId);
    if (item.isReviewed) {
        throw ApiError.badRequest('Product already reviewed for this order');
    }

    const product = await Product.findById(req.params.productId);
    if (!product) {
        throw ApiError.notFound('Product not found');
    }

    const review = await Review.create({
        product: product._id,
        shop: product.shop,
        user: req.user.id,
        order: order._id,
        rating,
        title,
        comment,
        images,
        isVerifiedPurchase: true,
        status: 'visible'
    });

    item.isReviewed = true;
    await order.save();

    const stats = await Review.aggregate([
        { $match: { product: product._id, status: 'visible' } },
        { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    product.rating = stats[0]?.average || 0;
    product.reviewCount = stats[0]?.count || 0;
    await product.save();

    sendCreated(res, review, 'Review created');
}));

router.post('/:id/return-request', asyncHandler(async (req, res) => {
    const { reason, description = '', images = [], items = [], resolution = 'refund' } = req.body;

    if (!String(reason || '').trim()) {
        throw ApiError.badRequest('Return reason is required');
    }

    const order = await Order.findOne({
        _id: req.params.id,
        buyer: req.user.id,
        isDeleted: false
    }).populate('items.product', 'name images thumbnail');

    if (!order) {
        throw ApiError.notFound('Order not found');
    }

    const eligibleStatuses = [ORDER_STATUS.SHIPPING, ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETED];
    const currentStatus = order.orderStatus || order.status;
    if (!eligibleStatuses.includes(currentStatus)) {
        throw ApiError.badRequest('Order is not eligible for a return request yet');
    }

    const existingRequest = await ReturnRequest.findOne({ order: order._id }).sort({ createdAt: -1 });
    if (existingRequest && !['rejected', 'rejected_inspection'].includes(existingRequest.status)) {
        throw ApiError.badRequest('A return request for this order is already being processed');
    }

    const selectedProductIds = new Set(
        (Array.isArray(items) ? items : [])
            .map((item) => String(item.productId || item.product || '').trim())
            .filter(Boolean)
    );

    const selectedOrderItems = (order.items || []).filter((item) => selectedProductIds.has(String(item.product?._id || item.product)));
    if (!selectedOrderItems.length) {
        throw ApiError.badRequest('Please select at least one product to return');
    }

    const returnItems = selectedOrderItems.map((item) => ({
        product: item.product?._id || item.product,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        reason
    }));

    const refundAmount = returnItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
    const shopId = selectedOrderItems[0]?.shop;

    const request = await ReturnRequest.create({
        order: order._id,
        buyer: req.user.id,
        shop: shopId,
        items: returnItems,
        reason,
        description: [description, `Requested resolution: ${resolution}`].filter(Boolean).join('\n'),
        images: Array.isArray(images) ? images : [],
        refundAmount,
        status: 'pending'
    });

    syncOrderState(order, {
        orderStatus: ORDER_STATUS.RETURN_PENDING,
        paymentStatus: order.paymentStatus
    });
    order.items = (order.items || []).map((item) => {
        if (selectedProductIds.has(String(item.product?._id || item.product))) {
            item.shopStatus = ORDER_STATUS.RETURN_PENDING;
        }
        return item;
    });
    order.statusHistory.push({
        status: ORDER_STATUS.RETURN_PENDING,
        note: `Buyer requested return: ${reason}`,
        updatedBy: req.user.id
    });
    await order.save();

    await writeOrderLog({
        orderId: order._id,
        event: 'return_requested',
        actorType: 'buyer',
        actorId: req.user.id,
        message: `Buyer requested return for order ${order.orderNumber}`,
        data: {
            reason,
            resolution,
            itemCount: returnItems.length
        }
    });

    sendCreated(res, request, 'Return request created successfully');
}));

router.put('/:id/cancel', asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const order = await Order.findOne({
        _id: req.params.id,
        buyer: req.user.id
    });

    if (!order) {
        throw ApiError.notFound('Order not found');
    }

    if (![ORDER_STATUS.WAITING_PAYMENT, ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED].includes(order.status)) {
        throw ApiError.badRequest('Order cannot be cancelled in the current status');
    }

    for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity, soldCount: -item.quantity }
        });
    }

    if (order.coupon?.couponId) {
        await Coupon.findByIdAndUpdate(order.coupon.couponId, { $inc: { usedCount: -1 } });
    } else if (order.coupon?.code) {
        await Coupon.findOneAndUpdate({ code: order.coupon.code }, { $inc: { usedCount: -1 } });
    }

    syncOrderState(order, {
        orderStatus: ORDER_STATUS.CANCELLED,
        shippingStatus: deriveShippingStatus(ORDER_STATUS.CANCELLED),
        paymentStatus: order.paymentStatus === PAYMENT_STATUS.PAID
            ? PAYMENT_STATUS.REFUNDED
            : order.paymentMethod === 'online'
                ? PAYMENT_STATUS.CANCELLED
                : order.paymentStatus
    });
    order.items = (order.items || []).map((item) => {
        item.shopStatus = ORDER_STATUS.CANCELLED;
        return item;
    });
    order.notes = reason || order.notes;
    order.statusHistory.push({
        status: ORDER_STATUS.CANCELLED,
        note: reason || 'Customer requested cancellation',
        updatedBy: req.user.id
    });
    await order.save();

    await writeOrderLog({
        orderId: order._id,
        event: 'cancelled',
        actorType: 'buyer',
        actorId: req.user.id,
        message: reason || 'Buyer cancelled the order'
    });

    await writeOrderLog({
        orderId: order._id,
        event: 'inventory_released',
        actorType: 'system',
        message: 'Inventory returned after cancellation'
    });

    sendSuccess(res, order, 'Order cancelled successfully');
}));

module.exports = router;
