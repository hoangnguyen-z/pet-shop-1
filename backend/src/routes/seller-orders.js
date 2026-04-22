const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const { Order, Product, Notification, Settlement } = require('../models');
const ReturnRequest = require('../models/admin/Return');
const { authenticate, requireApprovedSeller } = require('../middleware/auth');
const { getPaginationMeta } = require('../middleware/pagination');
const { sendSuccess } = require('../middleware/responseHandler');
const ApiError = require('../utils/ApiError');
const { ORDER_STATUS, PAYMENT_METHODS, PAYMENT_STATUS } = require('../config/constants');
const { syncOrderState, deriveShippingStatus, writeOrderLog } = require('../services/orderService');
const { enrichSellerOrder } = require('../services/sellerFinanceService');

router.use(authenticate);
router.use(requireApprovedSeller);

async function loadSettlementsForOrders(sellerId, orders) {
    if (!orders.length) {
        return [];
    }

    return Settlement.find({
        seller: sellerId,
        orders: { $in: orders.map((order) => order._id) }
    }).select('_id orders status completedAt createdAt amount fee netAmount');
}

async function getSellerOrderIds(sellerId) {
    const orders = await Order.find({ 'items.seller': sellerId }).select('_id');
    return orders.map((order) => order._id);
}

async function loadSellerReturnRequest(returnId, sellerId) {
    const orderIds = await getSellerOrderIds(sellerId);
    const request = await ReturnRequest.findOne({
        _id: returnId,
        order: { $in: orderIds }
    })
        .populate('order', 'orderNumber orderStatus paymentStatus finalAmount shippingAddress createdAt')
        .populate('buyer', 'name email phone')
        .populate('shop', 'name');

    if (!request) {
        throw ApiError.notFound('Không tìm thấy yêu cầu hoàn hàng của shop');
    }

    return request;
}

async function setReturnOrderHold(returnRequest, status, sellerId, note) {
    const order = await Order.findById(returnRequest.order);
    if (!order) return null;

    order.items = (order.items || []).map((item) => {
        if (String(item.seller) === String(sellerId)) {
            item.shopStatus = status;
            if (note) item.statusNote = note;
        }
        return item;
    });

    syncOrderState(order, {
        orderStatus: status,
        shippingStatus: deriveShippingStatus(status)
    });
    order.statusHistory.push({
        status,
        note,
        updatedBy: sellerId
    });
    await order.save();
    return order;
}

router.get('/', async (req, res, next) => {
    try {
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 20);
        const { status, search } = req.query;
        const skip = (page - 1) * limit;

        const filter = {
            'items.seller': req.user.id
        };

        if (status) {
            filter['items.shopStatus'] = status;
        }

        if (search) {
            filter.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
                { 'shippingAddress.phone': { $regex: search, $options: 'i' } }
            ];
        }

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .populate('buyer', 'name email phone')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Order.countDocuments(filter)
        ]);

        const settlements = await loadSettlementsForOrders(req.user.id, orders);
        const sellerOrders = orders.map((order) => {
            const sellerItems = order.items.filter((item) => String(item.seller) === String(req.user.id));
            return enrichSellerOrder({
                ...order.toObject(),
                items: sellerItems
            }, req.user.id, { settlements });
        });

        sendSuccess(
            res,
            'Lấy danh sách đơn hàng thành công',
            sellerOrders,
            getPaginationMeta(total, { page, limit })
        );
    } catch (error) {
        next(error);
    }
});

router.get('/stats', async (req, res, next) => {
    try {
        const sellerId = new mongoose.Types.ObjectId(req.user.id);

        const stats = await Order.aggregate([
            { $match: { 'items.seller': sellerId } },
            { $unwind: '$items' },
            { $match: { 'items.seller': sellerId } },
            {
                $group: {
                    _id: '$items.shopStatus',
                    count: { $sum: 1 },
                    revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                }
            }
        ]);

        const result = {
            waiting_payment: { count: 0, revenue: 0 },
            paid: { count: 0, revenue: 0 },
            pending: { count: 0, revenue: 0 },
            confirmed: { count: 0, revenue: 0 },
            preparing: { count: 0, revenue: 0 },
            shipping: { count: 0, revenue: 0 },
            delivered: { count: 0, revenue: 0 },
            completed: { count: 0, revenue: 0 },
            cancelled: { count: 0, revenue: 0 }
        };

        stats.forEach((entry) => {
            if (result[entry._id]) {
                result[entry._id] = {
                    count: entry.count,
                    revenue: entry.revenue
                };
            }
        });

        sendSuccess(res, 'Lấy thống kê đơn hàng thành công', result);
    } catch (error) {
        next(error);
    }
});

router.get('/returns', async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const orderIds = await getSellerOrderIds(req.user.id);
        const query = { order: { $in: orderIds } };
        if (status) query.status = status;

        const [returns, total] = await Promise.all([
            ReturnRequest.find(query)
                .populate('order', 'orderNumber orderStatus paymentStatus finalAmount createdAt')
                .populate('buyer', 'name email phone')
                .populate('shop', 'name')
                .sort({ createdAt: -1 })
                .skip((Number(page) - 1) * Number(limit))
                .limit(Number(limit)),
            ReturnRequest.countDocuments(query)
        ]);

        sendSuccess(res, 'Lấy danh sách yêu cầu hoàn hàng thành công', returns, getPaginationMeta(total, { page, limit }));
    } catch (error) {
        next(error);
    }
});

router.get('/returns/:returnId', async (req, res, next) => {
    try {
        const request = await loadSellerReturnRequest(req.params.returnId, req.user.id);
        sendSuccess(res, 'Lấy chi tiết yêu cầu hoàn hàng thành công', request);
    } catch (error) {
        next(error);
    }
});

router.patch('/returns/:returnId/approve', async (req, res, next) => {
    try {
        const request = await loadSellerReturnRequest(req.params.returnId, req.user.id);
        const note = String(req.body.note || '').trim() || 'Người bán chấp nhận yêu cầu hoàn hàng';

        request.status = 'seller_approved';
        request.sellerNote = note;
        request.sellerReviewedBy = req.user.id;
        request.sellerReviewedAt = new Date();
        request.addHistory('seller_approved', note, 'seller', req.user.id);
        request.addHistory('return_shipping', 'Vui lòng gửi trả sản phẩm theo hướng dẫn của shop. Tiền vẫn được sàn giữ trong thời gian xử lý.', 'system');
        await request.save();

        const order = await setReturnOrderHold(request, ORDER_STATUS.RETURN_PENDING, req.user.id, note);
        await writeOrderLog({
            orderId: request.order,
            event: 'return_requested',
            actorType: 'seller',
            actorId: req.user.id,
            message: 'Seller approved return request',
            data: { returnId: request._id, note }
        });

        if (order?.buyer) {
            await Notification.create({
                user: order.buyer,
                type: 'order',
                title: 'Người bán đã chấp nhận hoàn hàng',
                message: `Shop đã chấp nhận yêu cầu hoàn hàng cho đơn #${order.orderNumber}`,
                data: { orderId: order._id, returnId: request._id }
            });
        }

        sendSuccess(res, 'Đã chấp nhận yêu cầu hoàn hàng', request);
    } catch (error) {
        next(error);
    }
});

router.patch('/returns/:returnId/reject', async (req, res, next) => {
    try {
        const request = await loadSellerReturnRequest(req.params.returnId, req.user.id);
        const note = String(req.body.note || req.body.reason || '').trim();
        if (!note) {
            throw ApiError.badRequest('Người bán bắt buộc ghi rõ lý do từ chối');
        }

        request.status = 'seller_rejected';
        request.sellerNote = note;
        request.sellerReviewedBy = req.user.id;
        request.sellerReviewedAt = new Date();
        request.addHistory('seller_rejected', note, 'seller', req.user.id);
        request.addHistory('admin_reviewing', 'Người mua có thể gửi khiếu nại lên admin nếu không đồng ý với kết quả này.', 'system');
        await request.save();

        const order = await setReturnOrderHold(request, ORDER_STATUS.RETURN_PENDING, req.user.id, note);
        await writeOrderLog({
            orderId: request.order,
            event: 'return_requested',
            actorType: 'seller',
            actorId: req.user.id,
            message: 'Seller rejected return request',
            data: { returnId: request._id, note }
        });

        if (order?.buyer) {
            await Notification.create({
                user: order.buyer,
                type: 'order',
                title: 'Người bán đã từ chối hoàn hàng',
                message: `Shop đã từ chối yêu cầu hoàn hàng cho đơn #${order.orderNumber}. Bạn có thể khiếu nại lên admin.`,
                data: { orderId: order._id, returnId: request._id }
            });
        }

        sendSuccess(res, 'Đã từ chối yêu cầu hoàn hàng', request);
    } catch (error) {
        next(error);
    }
});

router.patch('/returns/:returnId/request-evidence', async (req, res, next) => {
    try {
        const request = await loadSellerReturnRequest(req.params.returnId, req.user.id);
        const note = String(req.body.note || '').trim();
        if (!note) {
            throw ApiError.badRequest('Vui lòng ghi rõ bằng chứng cần bổ sung');
        }

        request.status = 'need_more_evidence';
        request.sellerNote = note;
        request.sellerReviewedBy = req.user.id;
        request.sellerReviewedAt = new Date();
        request.addHistory('need_more_evidence', note, 'seller', req.user.id);
        await request.save();

        const order = await setReturnOrderHold(request, ORDER_STATUS.RETURN_PENDING, req.user.id, note);
        if (order?.buyer) {
            await Notification.create({
                user: order.buyer,
                type: 'order',
                title: 'Shop yêu cầu bổ sung bằng chứng',
                message: `Shop cần thêm bằng chứng cho yêu cầu hoàn hàng đơn #${order.orderNumber}`,
                data: { orderId: order._id, returnId: request._id }
            });
        }

        sendSuccess(res, 'Đã yêu cầu người mua bổ sung bằng chứng', request);
    } catch (error) {
        next(error);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            'items.seller': req.user.id
        }).populate('buyer', 'name email phone avatar');

        if (!order) {
            throw ApiError.notFound('Đơn hàng không tồn tại');
        }

        const sellerItems = order.items.filter((item) => String(item.seller) === String(req.user.id));
        const settlements = await Settlement.find({
            seller: req.user.id,
            orders: order._id
        }).select('_id orders status completedAt createdAt amount fee netAmount');
        const activeReturns = await ReturnRequest.find({
            order: order._id,
            status: { $nin: ['closed', 'return_rejected', 'refunded'] }
        }).sort({ createdAt: -1 });

        sendSuccess(res, 'Lấy thông tin đơn hàng thành công', enrichSellerOrder({
            ...order.toObject(),
            items: sellerItems,
            activeReturns
        }, req.user.id, { settlements }));
    } catch (error) {
        next(error);
    }
});

router.put('/:id/status', async (req, res, next) => {
    try {
        const { status, reason, carrier, trackingNumber, estimatedDelivery } = req.body;

        const validTransitions = {
            [ORDER_STATUS.WAITING_PAYMENT]: [],
            [ORDER_STATUS.PAID]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.PREPARING]: [ORDER_STATUS.SHIPPING, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.SHIPPING]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.COMPLETED]
        };

        const order = await Order.findOne({
            _id: req.params.id,
            'items.seller': req.user.id
        });

        if (!order) {
            throw ApiError.notFound('Đơn hàng không tồn tại');
        }

        const item = order.items.find((entry) => String(entry.seller) === String(req.user.id));

        if (!item) {
            throw ApiError.notFound('Không tìm thấy dòng hàng của shop trong đơn này');
        }

        if (!validTransitions[item.shopStatus]?.includes(status)) {
            throw ApiError.badRequest(`Không thể chuyển từ ${item.shopStatus} sang ${status}`);
        }

        const previousStatus = item.shopStatus;
        item.shopStatus = status;

        if (reason) {
            item.statusNote = reason;
        }

        if (carrier || trackingNumber || estimatedDelivery) {
            const currentTracking = order.tracking?.toObject?.() || order.tracking || {};
            order.tracking = {
                ...currentTracking,
                carrier: carrier || order.tracking?.carrier,
                trackingNumber: trackingNumber || order.tracking?.trackingNumber,
                estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : order.tracking?.estimatedDelivery,
                updates: [
                    ...(order.tracking?.updates || []),
                    {
                        status,
                        description: reason || `Người bán cập nhật đơn sang ${status}`,
                        timestamp: new Date()
                    }
                ]
            };
        }

        if (status === ORDER_STATUS.CANCELLED && previousStatus !== ORDER_STATUS.CANCELLED) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: {
                    stock: item.quantity,
                    soldCount: -item.quantity
                }
            });
        }

        const allSameStatus = order.items.every((entry) => entry.shopStatus === status);
        if (allSameStatus) {
            syncOrderState(order, {
                orderStatus: status,
                shippingStatus: deriveShippingStatus(status)
            });
        }

        if (
            status === ORDER_STATUS.COMPLETED
            && order.paymentMethod === PAYMENT_METHODS.COD
            && [PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING].includes(order.paymentStatus)
        ) {
            syncOrderState(order, {
                paymentMethod: PAYMENT_METHODS.COD,
                paymentStatus: PAYMENT_STATUS.PAID
            });
            order.payment.paidAt = order.payment.paidAt || new Date();
        }

        if (
            status === ORDER_STATUS.CANCELLED
            && order.paymentMethod === PAYMENT_METHODS.ONLINE
            && order.paymentStatus === PAYMENT_STATUS.PAID
        ) {
            syncOrderState(order, {
                paymentMethod: PAYMENT_METHODS.ONLINE,
                paymentStatus: PAYMENT_STATUS.REFUNDED
            });
        }

        order.statusHistory.push({
            status,
            note: reason,
            updatedBy: req.user.id
        });

        await order.save();

        await writeOrderLog({
            orderId: order._id,
            event: status === ORDER_STATUS.CANCELLED ? 'cancelled' : 'status_changed',
            actorType: 'seller',
            actorId: req.user.id,
            message: `Seller updated order item status to ${status}`,
            data: { reason, carrier, trackingNumber, estimatedDelivery }
        });

        await Notification.create({
            user: order.buyer,
            type: 'order',
            title: 'Cập nhật đơn hàng',
            message: `Đơn hàng #${order.orderNumber} đã được cập nhật: ${status}`,
            data: { orderId: order._id }
        });

        sendSuccess(res, 'Cập nhật trạng thái thành công', order);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
