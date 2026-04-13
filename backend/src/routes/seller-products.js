const express = require('express');
const router = express.Router();
const { Product, Order, Category, InventoryLog } = require('../models');
const { authenticate, requireApprovedSeller } = require('../middleware/auth');
const { pagination, getPaginationMeta } = require('../middleware/pagination');
const { sendSuccess, sendCreated } = require('../middleware/responseHandler');
const ApiError = require('../utils/ApiError');
const { ROLES, ORDER_STATUS } = require('../config/constants');

router.use(authenticate);
router.use(requireApprovedSeller);

function sanitizeProductInput(body = {}) {
    const allowedFields = [
        'name',
        'slug',
        'sku',
        'category',
        'subcategory',
        'description',
        'shortDescription',
        'price',
        'originalPrice',
        'costPrice',
        'stock',
        'images',
        'thumbnail',
        'brand',
        'unit',
        'weight',
        'dimensions',
        'tags',
        'attributes',
        'specifications',
        'variants',
        'flashSale',
        'isActive',
        'isFeatured'
    ];

    return allowedFields.reduce((data, field) => {
        if (Object.prototype.hasOwnProperty.call(body, field)) data[field] = body[field];
        return data;
    }, {});
}

async function refreshShopProductCount(shop) {
    if (!shop) return;
    shop.productCount = await Product.countDocuments({ shop: shop._id, isActive: true });
    await shop.save();
}

router.get('/', async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search, category, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const skip = (page - 1) * limit;

        const filter = { seller: req.user.id };

        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        if (category) {
            filter.category = category;
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [products, total] = await Promise.all([
            Product.find(filter)
                .populate('category', 'name')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Product.countDocuments(filter)
        ]);

        sendSuccess(res, 'Láº¥y danh sĂ¡ch sáº£n pháº©m thĂ nh cĂ´ng', products, getPaginationMeta(total, { page, limit }));
    } catch (error) {
        next(error);
    }
});

router.post('/', async (req, res, next) => {
    try {
        if (req.user.role !== ROLES.SELLER) {
            throw ApiError.forbidden('Chá»‰ ngÆ°á»i bĂ¡n má»›i cĂ³ thá»ƒ táº¡o sáº£n pháº©m');
        }

        if (!req.user.shop) {
            throw ApiError.badRequest('Báº¡n cáº§n táº¡o cá»­a hĂ ng trÆ°á»›c');
        }

        const product = await Product.create({
            ...sanitizeProductInput(req.body),
            shop: req.user.shop._id,
            seller: req.user.id
        });

        await refreshShopProductCount(req.user.shop);

        sendCreated(res, 'Táº¡o sáº£n pháº©m thĂ nh cĂ´ng', product);
    } catch (error) {
        next(error);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            seller: req.user.id
        }).populate('category', 'name');

        if (!product) {
            throw ApiError.notFound('Sáº£n pháº©m khĂ´ng tá»“n táº¡i');
        }

        sendSuccess(res, 'Láº¥y thĂ´ng tin sáº£n pháº©m thĂ nh cĂ´ng', product);
    } catch (error) {
        next(error);
    }
});

router.put('/:id', async (req, res, next) => {
    try {
        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, seller: req.user.id },
            sanitizeProductInput(req.body),
            { new: true, runValidators: true }
        );

        if (!product) {
            throw ApiError.notFound('Sáº£n pháº©m khĂ´ng tá»“n táº¡i');
        }

        await refreshShopProductCount(req.user.shop);

        sendSuccess(res, 'Cáº­p nháº­t sáº£n pháº©m thĂ nh cĂ´ng', product);
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            seller: req.user.id
        });

        if (!product) {
            throw ApiError.notFound('Sáº£n pháº©m khĂ´ng tá»“n táº¡i');
        }

        const hasActiveOrders = await Order.exists({
            'items.product': product._id,
            'items.seller': req.user.id,
            status: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED, ORDER_STATUS.COMPLETED] }
        });

        if (hasActiveOrders) {
            product.isActive = false;
            await product.save();
            await refreshShopProductCount(req.user.shop);
            return sendSuccess(res, 'Product has active orders and was hidden instead of deleted', product);
        }

        await product.deleteOne();

        const shop = req.user.shop;
        if (shop) {
            shop.productCount = await Product.countDocuments({ shop: shop._id, isActive: true });
            await shop.save();
        }

        sendSuccess(res, 'XĂ³a sáº£n pháº©m thĂ nh cĂ´ng');
    } catch (error) {
        next(error);
    }
});

router.put('/:id/stock', async (req, res, next) => {
    try {
        const { stock, note } = req.body;

        const product = await Product.findOne({
            _id: req.params.id,
            seller: req.user.id
        });

        if (!product) {
            throw ApiError.notFound('Sáº£n pháº©m khĂ´ng tá»“n táº¡i');
        }

        const stockBefore = product.stock;
        product.stock = stock;
        await product.save();

        await InventoryLog.create({
            product: product._id,
            shop: req.user.shop._id,
            type: 'adjustment',
            quantity: stock - stockBefore,
            stockBefore,
            stockAfter: stock,
            reason: note,
            createdBy: req.user.id
        });

        sendSuccess(res, 'Cáº­p nháº­t tá»“n kho thĂ nh cĂ´ng', product);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
