const express = require('express');
const router = express.Router();
const { User, Product } = require('../models');
const { authenticate } = require('../middleware/auth');
const { sendSuccess } = require('../middleware/responseHandler');
const ApiError = require('../utils/ApiError');

function requireBuyer(req, res, next) {
    if (req.user.role !== 'buyer') {
        return next(ApiError.forbidden('Chi tai khoan nguoi mua moi duoc su dung gio hang va danh sach yeu thich'));
    }
    next();
}

router.use(authenticate);
router.use(requireBuyer);

router.get('/cart', authenticate, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).populate('cart.items.product');
        sendSuccess(res, 'Lấy giỏ hàng thành công', user.cart);
    } catch (error) {
        next(error);
    }
});

router.post('/cart/add', authenticate, async (req, res, next) => {
    try {
        const { productId, quantity = 1 } = req.body;
        const nextQuantity = parseInt(quantity, 10);

        if (!productId) throw ApiError.badRequest('Product is required');
        if (!Number.isInteger(nextQuantity) || nextQuantity <= 0) throw ApiError.badRequest('Quantity must be greater than 0');

        const product = await Product.findById(productId);
        if (!product || !product.isActive || !product.isVerified) {
            throw ApiError.badRequest('Product is not available');
        }

        const user = await User.findById(req.user.id);

        const existingItem = user.cart.items.find(
            item => item.product.toString() === productId
        );

        if (existingItem) {
            if (existingItem.quantity + nextQuantity > product.stock) {
                throw ApiError.badRequest(`Only ${product.stock} items are available`);
            }
            existingItem.quantity += nextQuantity;
        } else {
            if (nextQuantity > product.stock) {
                throw ApiError.badRequest(`Only ${product.stock} items are available`);
            }
            user.cart.items.push({ product: productId, quantity: nextQuantity });
        }

        await user.save();
        await user.populate('cart.items.product');

        sendSuccess(res, 'Thêm vào giỏ hàng thành công', user.cart);
    } catch (error) {
        next(error);
    }
});

router.put('/cart/:productId', authenticate, async (req, res, next) => {
    try {
        const { quantity } = req.body;
        const nextQuantity = parseInt(quantity, 10);

        const user = await User.findById(req.user.id);

        const item = user.cart.items.find(
            i => i.product.toString() === req.params.productId
        );

        if (!item) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không có trong giỏ hàng' });
        }

        if (!Number.isInteger(nextQuantity)) {
            throw ApiError.badRequest('Quantity must be a whole number');
        }

        if (nextQuantity <= 0) {
            user.cart.items = user.cart.items.filter(
                i => i.product.toString() !== req.params.productId
            );
        } else {
            const product = await Product.findById(req.params.productId);
            if (!product || !product.isActive || !product.isVerified) {
                throw ApiError.badRequest('Product is not available');
            }
            if (nextQuantity > product.stock) {
                throw ApiError.badRequest(`Only ${product.stock} items are available`);
            }
            item.quantity = nextQuantity;
        }

        await user.save();
        await user.populate('cart.items.product');

        sendSuccess(res, 'Cập nhật giỏ hàng thành công', user.cart);
    } catch (error) {
        next(error);
    }
});

router.delete('/cart/:productId', authenticate, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        user.cart.items = user.cart.items.filter(
            item => item.product.toString() !== req.params.productId
        );

        await user.save();

        sendSuccess(res, 'Xóa khỏi giỏ hàng thành công', user.cart);
    } catch (error) {
        next(error);
    }
});

router.delete('/cart', authenticate, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        user.cart.items = [];
        await user.save();
        sendSuccess(res, 'Xóa giỏ hàng thành công');
    } catch (error) {
        next(error);
    }
});

router.get('/wishlist', authenticate, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).populate('wishlist.product');
        sendSuccess(res, 'Lấy danh sách yêu thích thành công', user.wishlist);
    } catch (error) {
        next(error);
    }
});

router.post('/wishlist/:productId', authenticate, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        const exists = user.wishlist.some(
            item => item.product.toString() === req.params.productId
        );

        if (!exists) {
            user.wishlist.push({ product: req.params.productId });
            await user.save();
        }

        sendSuccess(res, exists ? 'Đã có trong danh sách' : 'Thêm vào danh sách yêu thích thành công');
    } catch (error) {
        next(error);
    }
});

router.delete('/wishlist/:productId', authenticate, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        user.wishlist = user.wishlist.filter(
            item => item.product.toString() !== req.params.productId
        );

        await user.save();

        sendSuccess(res, 'Xóa khỏi danh sách yêu thích thành công');
    } catch (error) {
        next(error);
    }
});

router.get('/notifications', authenticate, async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const Notification = require('../models/Notification');

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find({ user: req.user.id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Notification.countDocuments({ user: req.user.id }),
            Notification.countDocuments({ user: req.user.id, isRead: false })
        ]);

        sendSuccess(res, 'Lấy thông báo thành công', {
            notifications,
            unreadCount
        }, {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        next(error);
    }
});

router.put('/notifications/:id/read', authenticate, async (req, res, next) => {
    try {
        const Notification = require('../models/Notification');

        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });

        res.json({ success: true, message: 'Đánh dấu đã đọc thành công' });
    } catch (error) {
        next(error);
    }
});

router.put('/notifications/read-all', authenticate, async (req, res, next) => {
    try {
        const Notification = require('../models/Notification');

        await Notification.updateMany(
            { user: req.user.id, isRead: false },
            { isRead: true }
        );

        res.json({ success: true, message: 'Đánh dấu tất cả đã đọc thành công' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
