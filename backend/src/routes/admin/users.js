const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Shop = require('../../models/Shop');
const Product = require('../../models/Product');
const Review = require('../../models/Review');
const InventoryLog = require('../../models/InventoryLog');
const Coupon = require('../../models/Coupon');
const Promotion = require('../../models/Promotion');
const Settlement = require('../../models/Settlement');
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
        throw ApiError.notFound('Kh\u00f4ng t\u00ecm th\u1ea5y ng\u01b0\u1eddi d\u00f9ng');
    }

    const shopIds = user.role === 'seller'
        ? await Shop.find({ owner: user._id }).distinct('_id')
        : [];

    const productIds = user.role === 'seller'
        ? await Product.find({ $or: [{ seller: user._id }, { shop: { $in: shopIds } }] }).distinct('_id')
        : [];

    if (user.role === 'seller') {
        await Review.deleteMany({ $or: [{ product: { $in: productIds } }, { shop: { $in: shopIds } }] });
        await InventoryLog.deleteMany({
            $or: [
                { createdBy: user._id },
                { product: { $in: productIds } },
                { shop: { $in: shopIds } }
            ]
        });
        await Settlement.deleteMany({ $or: [{ seller: user._id }, { shop: { $in: shopIds } }] });
        await Coupon.deleteMany({ $or: [{ seller: user._id }, { shop: { $in: shopIds } }] });
        await Promotion.deleteMany({ $or: [{ seller: user._id }, { shop: { $in: shopIds } }] });

        if (productIds.length) {
            await Coupon.updateMany(
                { applicableProducts: { $in: productIds } },
                { $pull: { applicableProducts: { $in: productIds } } }
            );
            await Promotion.updateMany(
                { products: { $in: productIds } },
                { $pull: { products: { $in: productIds } } }
            );
            await User.updateMany(
                {},
                {
                    $pull: {
                        'cart.items': { product: { $in: productIds } },
                        wishlist: { product: { $in: productIds } }
                    }
                }
            );
        }

        await Product.deleteMany({ $or: [{ seller: user._id }, { shop: { $in: shopIds } }] });
        await Shop.deleteMany({ owner: user._id });
    } else {
        await Review.deleteMany({ user: user._id });
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

    sendSuccess(res, null, 'X\u00f3a ng\u01b0\u1eddi d\u00f9ng th\u00e0nh c\u00f4ng');
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
