const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Shop = require('../../models/Shop');
const AuditLog = require('../../models/admin/AuditLog');
const { authenticateAdmin } = require('../../middleware/adminAuth');
const { checkPermission } = require('../../middleware/permissionGuard');
const { sendSuccess, sendCreated } = require('../../middleware/responseHandler');
const { buildQuery, getPagination } = require('../../middleware/pagination');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const getAllUsers = asyncHandler(async (req, res) => {
    const { query, sort, page, limit } = buildQuery(req);
    
    const users = await User.find(query)
        .select('-password')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await User.countDocuments(query);

    sendSuccess(res, {
        users,
        pagination: getPagination(total, page, limit)
    });
});

const getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
        throw ApiError.notFound('Không tìm thấy người dùng');
    }

    let shop = null;
    if (user.role === 'seller') {
        shop = await Shop.findOne({ owner: user._id });
    }

    sendSuccess(res, { ...user.toObject(), shop });
});

const updateUser = asyncHandler(async (req, res) => {
    const { status, role } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
        throw ApiError.notFound('Không tìm thấy người dùng');
    }

    if (status && ['active', 'banned'].includes(status)) {
        user.status = status;
    }

    if (role && ['buyer', 'seller'].includes(role)) {
        user.role = role;
    }

    await user.save();

    await AuditLog.create({
        admin: req.admin._id,
        action: 'update',
        resource: 'user',
        resourceId: user._id,
        description: `Updated user: ${user.email}`,
        changes: { status, role },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
    }, 'Cập nhật người dùng thành công');
});

const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        throw ApiError.notFound('Không tìm thấy người dùng');
    }

    if (user.role === 'seller') {
        await Shop.deleteMany({ owner: user._id });
    }

    await User.findByIdAndDelete(req.params.id);

    await AuditLog.create({
        admin: req.admin._id,
        action: 'delete',
        resource: 'user',
        resourceId: req.params.id,
        description: `Deleted user: ${user.email}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, null, 'Xóa người dùng thành công');
});

const getUserStats = asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const bannedUsers = await User.countDocuments({ status: 'banned' });
    const buyers = await User.countDocuments({ role: 'buyer' });
    const sellers = await User.countDocuments({ role: 'seller' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newUsersToday = await User.countDocuments({
        createdAt: { $gte: today }
    });

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const newUsersThisMonth = await User.countDocuments({
        createdAt: { $gte: thisMonth }
    });

    sendSuccess(res, {
        total: totalUsers,
        active: activeUsers,
        banned: bannedUsers,
        buyers,
        sellers,
        newToday: newUsersToday,
        newThisMonth: newUsersThisMonth
    });
});

router.use(authenticateAdmin);

router.get('/', checkPermission('users.view'), getAllUsers);
router.get('/stats', checkPermission('users.view'), getUserStats);
router.get('/:id', checkPermission('users.view'), getUserById);
router.put('/:id', checkPermission('users.update'), updateUser);
router.put('/:id/status', checkPermission('users.update'), updateUser);
router.put('/:id/role', checkPermission('users.update'), updateUser);
router.delete('/:id', checkPermission('users.delete'), deleteUser);

module.exports = router;
