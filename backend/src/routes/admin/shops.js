const express = require('express');
const router = express.Router();
const Shop = require('../../models/Shop');
const User = require('../../models/User');
const Product = require('../../models/Product');
const AuditLog = require('../../models/admin/AuditLog');
const { authenticateAdmin } = require('../../middleware/adminAuth');
const { checkPermission } = require('../../middleware/permissionGuard');
const { sendSuccess } = require('../../middleware/responseHandler');
const { buildQuery, getPagination } = require('../../middleware/pagination');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const getAllShops = asyncHandler(async (req, res) => {
    const { query, sort, page, limit } = buildQuery(req);
    
    const shops = await Shop.find(query)
        .populate('owner', 'name email')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await Shop.countDocuments(query);

    sendSuccess(res, {
        shops,
        pagination: getPagination(total, page, limit)
    });
});

const getShopById = asyncHandler(async (req, res) => {
    const shop = await Shop.findById(req.params.id)
        .populate('owner', 'name email phone');

    if (!shop) {
        throw ApiError.notFound('Không tìm thấy cửa hàng');
    }

    const productCount = await Product.countDocuments({ shop: shop._id });

    sendSuccess(res, { ...shop.toObject(), productCount });
});

const updateShop = asyncHandler(async (req, res) => {
    const { status, isVerified } = req.body;

    const shop = await Shop.findById(req.params.id);

    if (!shop) {
        throw ApiError.notFound('Không tìm thấy cửa hàng');
    }

    if (status && ['pending', 'approved', 'rejected', 'inactive', 'suspended'].includes(status)) {
        shop.status = status === 'suspended' ? 'inactive' : status;
        
        if (shop.status === 'approved' && !shop.isVerified) {
            shop.isVerified = true;
            shop.verifiedAt = new Date();
        }
    }

    if (isVerified !== undefined) {
        shop.isVerified = isVerified;
        if (isVerified) {
            shop.verifiedAt = new Date();
        }
    }

    await shop.save();

    await AuditLog.create({
        admin: req.admin._id,
        action: 'update',
        resource: 'shop',
        resourceId: shop._id,
        description: `Updated shop: ${shop.name}`,
        changes: { status, isVerified },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, shop, 'Cập nhật cửa hàng thành công');
});

const approveShop = asyncHandler(async (req, res) => {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
        throw ApiError.notFound('Không tìm thấy cửa hàng');
    }

    if (shop.status !== 'pending') {
        throw ApiError.badRequest('Cửa hàng không ở trạng thái chờ duyệt');
    }

    shop.status = 'approved';
    shop.isVerified = true;
    shop.verifiedAt = new Date();
    await shop.save();

    await AuditLog.create({
        admin: req.admin._id,
        action: 'approve',
        resource: 'shop',
        resourceId: shop._id,
        description: `Approved shop: ${shop.name}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, shop, 'Phê duyệt cửa hàng thành công');
});

const rejectShop = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const shop = await Shop.findById(req.params.id);

    if (!shop) {
        throw ApiError.notFound('Không tìm thấy cửa hàng');
    }

    if (shop.status !== 'pending') {
        throw ApiError.badRequest('Cửa hàng không ở trạng thái chờ duyệt');
    }

    shop.status = 'rejected';
    shop.rejectionReason = reason;
    await shop.save();

    await AuditLog.create({
        admin: req.admin._id,
        action: 'reject',
        resource: 'shop',
        resourceId: shop._id,
        description: `Rejected shop: ${shop.name}. Reason: ${reason || 'N/A'}`,
        changes: { reason },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, shop, 'Từ chối cửa hàng thành công');
});

const deleteShop = asyncHandler(async (req, res) => {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
        throw ApiError.notFound('Không tìm thấy cửa hàng');
    }

    await Product.deleteMany({ shop: shop._id });
    await Shop.findByIdAndDelete(req.params.id);

    await AuditLog.create({
        admin: req.admin._id,
        action: 'delete',
        resource: 'shop',
        resourceId: req.params.id,
        description: `Deleted shop: ${shop.name}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, null, 'Xóa cửa hàng thành công');
});

const getShopStats = asyncHandler(async (req, res) => {
    const totalShops = await Shop.countDocuments();
    const pendingShops = await Shop.countDocuments({ status: 'pending' });
    const approvedShops = await Shop.countDocuments({ status: 'approved' });
    const suspendedShops = await Shop.countDocuments({ status: 'inactive' });
    const verifiedShops = await Shop.countDocuments({ isVerified: true });

    sendSuccess(res, {
        total: totalShops,
        pending: pendingShops,
        approved: approvedShops,
        suspended: suspendedShops,
        verified: verifiedShops
    });
});

const getPendingShops = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    
    const shops = await Shop.find({ status: 'pending' })
        .populate('owner', 'name email phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Shop.countDocuments({ status: 'pending' });

    sendSuccess(res, {
        shops,
        pagination: getPagination(total, page, limit)
    });
});

router.use(authenticateAdmin);

router.get('/', checkPermission('shops.view'), getAllShops);
router.get('/pending', checkPermission('shops.view'), getPendingShops);
router.get('/stats', checkPermission('shops.view'), getShopStats);
router.get('/:id', checkPermission('shops.view'), getShopById);
router.put('/:id', checkPermission('shops.update'), updateShop);
router.put('/:id/status', checkPermission('shops.update'), updateShop);
router.post('/:id/approve', checkPermission('shops.approve'), approveShop);
router.post('/:id/reject', checkPermission('shops.approve'), rejectShop);
router.delete('/:id', checkPermission('shops.delete'), deleteShop);

module.exports = router;
