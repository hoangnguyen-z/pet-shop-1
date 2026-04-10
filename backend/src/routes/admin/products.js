const express = require('express');
const router = express.Router();
const Product = require('../../models/Product');
const Shop = require('../../models/Shop');
const AuditLog = require('../../models/admin/AuditLog');
const { authenticateAdmin } = require('../../middleware/adminAuth');
const { checkPermission } = require('../../middleware/permissionGuard');
const { sendSuccess } = require('../../middleware/responseHandler');
const { buildQuery, getPagination } = require('../../middleware/pagination');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const getAllProducts = asyncHandler(async (req, res) => {
    const { query, sort, page, limit } = buildQuery(req);
    
    const products = await Product.find(query)
        .populate('shop', 'name')
        .populate('category', 'name')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await Product.countDocuments(query);

    sendSuccess(res, {
        products,
        pagination: getPagination(total, page, limit)
    });
});

const getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id)
        .populate('shop', 'name owner')
        .populate('category', 'name');

    if (!product) {
        throw ApiError.notFound('Không tìm thấy sản phẩm');
    }

    sendSuccess(res, product);
});

const updateProduct = asyncHandler(async (req, res) => {
    const { status, isFeatured } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
        throw ApiError.notFound('Không tìm thấy sản phẩm');
    }

    if (status && ['active', 'inactive', 'out_of_stock', 'deleted'].includes(status)) {
        product.isActive = status === 'active';
    }

    if (isFeatured !== undefined) {
        product.isFeatured = isFeatured;
    }

    await product.save();

    await AuditLog.create({
        admin: req.admin._id,
        action: 'update',
        resource: 'product',
        resourceId: product._id,
        description: `Updated product: ${product.name}`,
        changes: { status, isFeatured },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, product, 'Cập nhật sản phẩm thành công');
});

const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        throw ApiError.notFound('Không tìm thấy sản phẩm');
    }

    await Product.findByIdAndDelete(req.params.id);

    await AuditLog.create({
        admin: req.admin._id,
        action: 'delete',
        resource: 'product',
        resourceId: req.params.id,
        description: `Deleted product: ${product.name}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, null, 'Xóa sản phẩm thành công');
});

const getProductStats = asyncHandler(async (req, res) => {
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const inactiveProducts = await Product.countDocuments({ isActive: false });
    const outOfStockProducts = await Product.countDocuments({ stock: 0 });
    const featuredProducts = await Product.countDocuments({ isFeatured: true });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newProductsToday = await Product.countDocuments({
        createdAt: { $gte: today }
    });

    sendSuccess(res, {
        total: totalProducts,
        active: activeProducts,
        inactive: inactiveProducts,
        outOfStock: outOfStockProducts,
        featured: featuredProducts,
        newToday: newProductsToday
    });
});

const toggleFeatured = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        throw ApiError.notFound('Không tìm thấy sản phẩm');
    }

    product.isFeatured = !product.isFeatured;
    await product.save();

    await AuditLog.create({
        admin: req.admin._id,
        action: 'update',
        resource: 'product',
        resourceId: product._id,
        description: `${product.isFeatured ? 'Featured' : 'Unfeatured'} product: ${product.name}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, { isFeatured: product.isFeatured }, 'Cập nhật thành công');
});

router.use(authenticateAdmin);

router.get('/', checkPermission('products.view'), getAllProducts);
router.get('/stats', checkPermission('products.view'), getProductStats);
router.get('/:id', checkPermission('products.view'), getProductById);
router.put('/:id', checkPermission('products.update'), updateProduct);
router.put('/:id/verify', checkPermission('products.update'), asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        throw ApiError.notFound('KhĂ´ng tĂ¬m tháº¥y sáº£n pháº©m');
    }

    product.isVerified = true;
    product.isActive = true;
    await product.save();

    await AuditLog.create({
        admin: req.admin._id,
        action: 'update',
        resource: 'product',
        resourceId: product._id,
        description: `Verified product: ${product.name}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, product, 'Duyá»‡t sáº£n pháº©m thĂ nh cĂ´ng');
}));
router.post('/:id/toggle-featured', checkPermission('products.update'), toggleFeatured);
router.delete('/:id', checkPermission('products.delete'), deleteProduct);

module.exports = router;
