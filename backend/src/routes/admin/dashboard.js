const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Shop = require('../../models/Shop');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const AuditLog = require('../../models/admin/AuditLog');
const { authenticateAdmin } = require('../../middleware/adminAuth');
const { checkPermission } = require('../../middleware/permissionGuard');
const { sendSuccess } = require('../../middleware/responseHandler');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const getDashboardStats = asyncHandler(async (req, res) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
        totalUsers, totalShops, totalProducts, totalOrders
    ] = await Promise.all([
        User.countDocuments(),
        Shop.countDocuments({ status: 'approved' }),
        Product.countDocuments({ isActive: true }),
        Order.countDocuments()
    ]);

    const [newUsersToday, newShopsToday, newProductsToday, newOrdersToday] = await Promise.all([
        User.countDocuments({ createdAt: { $gte: today } }),
        Shop.countDocuments({ createdAt: { $gte: today } }),
        Product.countDocuments({ createdAt: { $gte: today } }),
        Order.countDocuments({ createdAt: { $gte: today } })
    ]);

    const [newUsersThisMonth, newOrdersThisMonth] = await Promise.all([
        User.countDocuments({ createdAt: { $gte: thisMonth } }),
        Order.countDocuments({ createdAt: { $gte: thisMonth } })
    ]);

    const lastMonthOrders = await Order.countDocuments({
        createdAt: { $gte: lastMonth, $lte: endOfLastMonth }
    });

    const lastMonthRevenue = await Order.aggregate([
        { $match: { 
            createdAt: { $gte: lastMonth, $lte: endOfLastMonth },
            status: { $in: ['delivered', 'completed'] }
        }},
        { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const currentRevenue = await Order.aggregate([
        { $match: { 
            createdAt: { $gte: thisMonth },
            status: { $in: ['delivered', 'completed'] }
        }},
        { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const todayRevenue = await Order.aggregate([
        { $match: { 
            createdAt: { $gte: today },
            status: { $in: ['delivered', 'completed'] }
        }},
        { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const revenueGrowth = lastMonthRevenue[0]?.total > 0
        ? ((currentRevenue[0]?.total || 0) - lastMonthRevenue[0].total) / lastMonthRevenue[0].total * 100
        : 0;

    const orderStats = await Order.aggregate([
        { $group: {
            _id: '$status',
            count: { $sum: 1 }
        }}
    ]);

    const orderStatusCounts = orderStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
    }, {});

    const recentOrders = await Order.find()
        .populate('buyer', 'name email')
        .sort({ createdAt: -1 })
        .limit(5);

    const topProducts = await Product.find({ isActive: true })
        .sort({ soldCount: -1 })
        .limit(5)
        .select('name images thumbnail price soldCount');

    sendSuccess(res, {
        overview: {
            totalUsers,
            totalShops,
            totalProducts,
            totalOrders,
            newUsersToday,
            newShopsToday,
            newProductsToday,
            newOrdersToday,
            newUsersThisMonth,
            newOrdersThisMonth
        },
        revenue: {
            today: todayRevenue[0]?.total || 0,
            thisMonth: currentRevenue[0]?.total || 0,
            lastMonth: lastMonthRevenue[0]?.total || 0,
            growth: revenueGrowth.toFixed(2)
        },
        orders: {
            pending: orderStatusCounts.pending || 0,
            confirmed: orderStatusCounts.confirmed || 0,
            shipping: orderStatusCounts.shipping || 0,
            delivered: orderStatusCounts.delivered || 0,
            completed: orderStatusCounts.completed || 0,
            cancelled: orderStatusCounts.cancelled || 0
        },
        recentOrders,
        topProducts
    });
});

const getRevenueStats = asyncHandler(async (req, res) => {
    const { period = 'month', year = new Date().getFullYear() } = req.query;
    
    const matchStage = {
        status: { $in: ['delivered', 'completed'] }
    };

    if (period === 'year') {
        matchStage.createdAt = {
            $gte: new Date(parseInt(year), 0, 1),
            $lte: new Date(parseInt(year), 11, 31, 23, 59, 59)
        };
    } else if (period === 'month') {
        const startDate = new Date(parseInt(year), new Date().getMonth(), 1);
        const endDate = new Date(parseInt(year), new Date().getMonth() + 1, 0, 23, 59, 59);
        matchStage.createdAt = { $gte: startDate, $lte: endDate };
    } else {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        matchStage.createdAt = { $gte: startDate };
    }

    const revenueData = await Order.aggregate([
        { $match: matchStage },
        { $group: {
            _id: period === 'year' 
                ? { $month: '$createdAt' }
                : period === 'month'
                    ? { $dayOfMonth: '$createdAt' }
                    : { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 }
        }},
        { $sort: { '_id': 1 } }
    ]);

    sendSuccess(res, revenueData);
});

const getUserStats = asyncHandler(async (req, res) => {
    const { period = 'month' } = req.query;
    
    const now = new Date();
    let startDate;

    if (period === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
        startDate = new Date(now.getFullYear(), 0, 1);
    }

    const userGrowth = await User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: {
            _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
    ]);

    const roleDistribution = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    sendSuccess(res, {
        growth: userGrowth,
        roles: roleDistribution
    });
});

const getAuditLogs = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, action, resource, admin, startDate, endDate } = req.query;

    const query = {};
    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (admin) query.admin = admin;
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
        .populate('admin', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    sendSuccess(res, {
        logs,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

router.use(authenticateAdmin);

router.get('/stats', checkPermission('dashboard.view'), getDashboardStats);
router.get('/revenue', checkPermission('reports.view'), getRevenueStats);
router.get('/users', checkPermission('reports.view'), getUserStats);
router.get('/audit-logs', checkPermission('audit_logs.view'), getAuditLogs);

module.exports = router;
