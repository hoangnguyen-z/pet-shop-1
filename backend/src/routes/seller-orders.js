const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { Order, Product, Notification } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { pagination, getPaginationMeta } = require('../middleware/pagination');
const { sendSuccess } = require('../middleware/responseHandler');
const ApiError = require('../utils/ApiError');
const { ORDER_STATUS } = require('../config/constants');
const { syncOrderState, deriveShippingStatus, writeOrderLog } = require('../services/orderService');

router.use(authenticate);

router.get('/', async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, search } = req.query;
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
                .limit(parseInt(limit)),
            Order.countDocuments(filter)
        ]);

        const ordersWithSellerItems = orders.map(order => {
            const sellerItems = order.items.filter(
                item => item.seller.toString() === req.user.id.toString()
            );
            return {
                ...order.toObject(),
                items: sellerItems
            };
        });

        sendSuccess(res, 'Lấy danh sách đơn hàng thành công', ordersWithSellerItems, getPaginationMeta(total, { page, limit }));
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
            pending: { count: 0, revenue: 0 },
            confirmed: { count: 0, revenue: 0 },
            preparing: { count: 0, revenue: 0 },
            shipping: { count: 0, revenue: 0 },
            delivered: { count: 0, revenue: 0 },
            completed: { count: 0, revenue: 0 },
            cancelled: { count: 0, revenue: 0 }
        };

        stats.forEach(s => {
            if (result[s._id]) {
                result[s._id] = { count: s.count, revenue: s.revenue };
            }
        });

        sendSuccess(res, 'Lấy thống kê thành công', result);
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

        const sellerItems = order.items.filter(
            item => item.seller.toString() === req.user.id.toString()
        );

        sendSuccess(res, 'Lấy thông tin đơn hàng thành công', {
            ...order.toObject(),
            items: sellerItems
        });
    } catch (error) {
        next(error);
    }
});

router.put('/:id/status', async (req, res, next) => {
    try {
        const { status, reason, carrier, trackingNumber, estimatedDelivery } = req.body;

        const validTransitions = {
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

        const item = order.items.find(
            i => i.seller.toString() === req.user.id.toString()
        );

        if (!item) {
            throw ApiError.notFound('Sản phẩm không thuộc đơn hàng của bạn');
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
            const trackingData = order.tracking?.toObject?.() || order.tracking || {};
            order.tracking = {
                ...trackingData,
                carrier: carrier || order.tracking?.carrier,
                trackingNumber: trackingNumber || order.tracking?.trackingNumber,
                estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : order.tracking?.estimatedDelivery,
                updates: [
                    ...(order.tracking?.updates || []),
                    {
                        status,
                        description: reason || `Seller updated order to ${status}`,
                        timestamp: new Date()
                    }
                ]
            };
        }

        if (status === ORDER_STATUS.CANCELLED && previousStatus !== ORDER_STATUS.CANCELLED) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: item.quantity, soldCount: -item.quantity }
            });
        }

        const allSameStatus = order.items.every(i => i.shopStatus === status);
        if (allSameStatus) {
            syncOrderState(order, {
                orderStatus: status,
                shippingStatus: deriveShippingStatus(status)
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
