const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');
const Refund = require('../../models/admin/Refund');
const Return = require('../../models/admin/Return');
const AuditLog = require('../../models/admin/AuditLog');
const { authenticateAdmin } = require('../../middleware/adminAuth');
const { checkPermission } = require('../../middleware/permissionGuard');
const { sendSuccess } = require('../../middleware/responseHandler');
const { buildQuery, getPagination } = require('../../middleware/pagination');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');
const { syncOrderState, deriveShippingStatus, writeOrderLog, normalizePaymentMethod } = require('../../services/orderService');

const getAllOrders = asyncHandler(async (req, res) => {
    const { query, sort, page, limit } = buildQuery(req);
    
    const orders = await Order.find(query)
        .populate('buyer', 'name email phone')
        .populate('items.product', 'name image price')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await Order.countDocuments(query);

    sendSuccess(res, {
        orders,
        pagination: getPagination(total, page, limit)
    });
});

const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('buyer', 'name email phone address')
        .populate('items.product', 'name image price');

    if (!order) {
        throw ApiError.notFound('Không tìm thấy đơn hàng');
    }

    sendSuccess(res, order);
});

const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status, note } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
        throw ApiError.notFound('Không tìm thấy đơn hàng');
    }

    const validStatuses = ['pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'completed', 'cancelled', 'return_pending', 'returned'];
    if (!validStatuses.includes(status)) {
        throw ApiError.badRequest('Trạng thái không hợp lệ');
    }

    order.status = status;
    syncOrderState(order, {
        orderStatus: status,
        shippingStatus: deriveShippingStatus(status)
    });
    if (note) {
        order.statusHistory = order.statusHistory || [];
        order.statusHistory.push({
            status,
            note,
            updatedBy: req.admin._id,
            updatedAt: new Date()
        });
    }

    await order.save();
    await writeOrderLog({
        orderId: order._id,
        event: 'status_changed',
        actorType: 'admin',
        actorId: req.admin._id,
        message: `Admin updated order status to ${status}`,
        data: { note }
    });

    await AuditLog.create({
        admin: req.admin._id,
        action: 'update',
        resource: 'order',
        resourceId: order._id,
        description: `Updated order status to: ${status}`,
        changes: { status, note },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, order, 'Cập nhật trạng thái thành công');
});

const updatePaymentStatus = asyncHandler(async (req, res) => {
    const { status, method, transactionId } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
        throw ApiError.notFound('Order not found');
    }

    if (status && !['unpaid', 'pending', 'paid', 'failed', 'refunded'].includes(status)) {
        throw ApiError.badRequest('Invalid payment status');
    }

    let normalizedMethod;
    if (method) {
        normalizedMethod = normalizePaymentMethod(method);
    }

    if (status) order.payment.status = status;
    if (normalizedMethod) order.payment.method = normalizedMethod;
    if (transactionId !== undefined) order.payment.transactionId = transactionId;
    if (status === 'paid' && !order.payment.paidAt) order.payment.paidAt = new Date();
    if (status && status !== 'paid') order.payment.paidAt = undefined;

    syncOrderState(order, {
        paymentMethod: normalizedMethod || order.payment.method,
        paymentStatus: status || order.payment.status
    });

    await order.save();
    await writeOrderLog({
        orderId: order._id,
        event: status === 'paid' ? 'payment_paid' : status === 'failed' ? 'payment_failed' : 'payment_pending',
        actorType: 'admin',
        actorId: req.admin._id,
        message: `Admin updated payment status to ${status || order.payment.status}`,
        data: { method: normalizedMethod || order.payment.method, transactionId }
    });

    await AuditLog.create({
        admin: req.admin._id,
        action: 'update',
        resource: 'payment',
        resourceId: order._id,
        description: `Updated payment for order: ${order.orderNumber}`,
        changes: { status, method, transactionId },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, order, 'Payment updated');
});

const getOrderStats = asyncHandler(async (req, res) => {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
    const shippingOrders = await Order.countDocuments({ status: 'shipping' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    const completedOrders = await Order.countDocuments({ status: 'completed' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const ordersToday = await Order.countDocuments({
        createdAt: { $gte: today }
    });

    const revenueResult = await Order.aggregate([
        { $match: { status: { $in: ['delivered', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    const todayRevenueResult = await Order.aggregate([
        { $match: { 
            status: { $in: ['delivered', 'completed'] },
            createdAt: { $gte: today }
        }},
        { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const todayRevenue = todayRevenueResult[0]?.total || 0;

    sendSuccess(res, {
        total: totalOrders,
        pending: pendingOrders,
        confirmed: confirmedOrders,
        shipping: shippingOrders,
        delivered: deliveredOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        ordersToday,
        totalRevenue,
        todayRevenue
    });
});

const getRefunds = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) query.status = status;

    const refunds = await Refund.find(query)
        .populate('order')
        .populate('requestedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Refund.countDocuments(query);

    sendSuccess(res, {
        refunds,
        pagination: getPagination(total, page, limit)
    });
});

const processRefund = asyncHandler(async (req, res) => {
    const { status, note } = req.body;
    const refund = await Refund.findById(req.params.id);

    if (!refund) {
        throw ApiError.notFound('Không tìm thấy yêu cầu hoàn tiền');
    }

    if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
        throw ApiError.badRequest('Trạng thái không hợp lệ');
    }

    refund.status = status;
    if (note) refund.adminNote = note;
    if (status === 'completed') refund.processedAt = new Date();
    
    await refund.save();

    if (status === 'approved' || status === 'completed') {
        await Order.findByIdAndUpdate(refund.order, { status: 'refunded' });
    }

    await AuditLog.create({
        admin: req.admin._id,
        action: 'update',
        resource: 'refund',
        resourceId: refund._id,
        description: `Processed refund: ${status}`,
        changes: { status, note },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, refund, 'Xử lý hoàn tiền thành công');
});

router.use(authenticateAdmin);

router.get('/', checkPermission('orders.view'), getAllOrders);
router.get('/stats', checkPermission('orders.view'), getOrderStats);
router.get('/refunds', checkPermission('refunds.view'), getRefunds);
router.get('/:id', checkPermission('orders.view'), getOrderById);
router.put('/:id/status', checkPermission('orders.update'), updateOrderStatus);
router.put('/:id/payment', checkPermission('orders.update'), updatePaymentStatus);
router.post('/refunds/:id/process', checkPermission('refunds.process'), processRefund);

module.exports = router;
