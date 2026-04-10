const express = require('express');
const router = express.Router();
const { Shop, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { sendSuccess, sendCreated } = require('../middleware/responseHandler');
const ApiError = require('../utils/ApiError');
const { SHOP_STATUS } = require('../config/constants');

const makeShopSlug = (name) => {
    const base = String(name || 'shop')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'shop';
    return `${base}-${Date.now().toString(36)}`;
};

const sanitizeHttpUrl = (value) => {
    if (!value) return undefined;

    try {
        const parsed = new URL(String(value).trim());
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : undefined;
    } catch (error) {
        return undefined;
    }
};

const normalizeCoordinate = (value, min, max) => {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) return undefined;
    return parsed;
};

const sanitizeLocation = (location = {}) => ({
    ...(() => {
        const latitude = normalizeCoordinate(location.latitude, -90, 90);
        return latitude !== undefined ? { latitude } : {};
    })(),
    ...(() => {
        const longitude = normalizeCoordinate(location.longitude, -180, 180);
        return longitude !== undefined ? { longitude } : {};
    })(),
    ...(() => {
        const googleMapsUrl = sanitizeHttpUrl(location.googleMapsUrl);
        return googleMapsUrl ? { googleMapsUrl } : {};
    })(),
    ...(() => {
        const embedUrl = sanitizeHttpUrl(location.embedUrl);
        return embedUrl ? { embedUrl } : {};
    })()
});

router.get('/', async (req, res, next) => {
    try {
        const { search, limit = 20 } = req.query;
        const filter = { status: SHOP_STATUS.APPROVED };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const shops = await Shop.find(filter)
            .select('name slug logo banner description rating reviewCount productCount address location operatingHours')
            .sort({ rating: -1, productCount: -1, createdAt: -1 })
            .limit(parseInt(limit));

        sendSuccess(res, 'Lay danh sach cua hang thanh cong', shops);
    } catch (error) {
        next(error);
    }
});

router.post('/', authenticate, async (req, res, next) => {
    try {
        if (!['buyer', 'seller'].includes(req.user.role)) {
            throw ApiError.forbidden('Chỉ tài khoản người bán mới có thể tạo cửa hàng');
        }

        const existingShop = await Shop.findOne({ owner: req.user.id });
        if (existingShop) {
            throw ApiError.conflict('Bạn đã có cửa hàng');
        }

        const { name, description, logo, banner, address, location, phone, email } = req.body;

        const shop = await Shop.create({
            owner: req.user.id,
            name,
            slug: makeShopSlug(name),
            description,
            logo,
            banner,
            address,
            location: sanitizeLocation(location),
            phone,
            email,
            status: SHOP_STATUS.PENDING
        });

        const user = await User.findById(req.user.id);
        user.role = 'seller';
        await user.save();

        sendCreated(res, 'Yêu cầu tạo cửa hàng đã được gửi', shop);
    } catch (error) {
        next(error);
    }
});

router.get('/my-shop', authenticate, async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user.id });
        
        if (!shop || shop.status !== SHOP_STATUS.APPROVED) {
            throw ApiError.notFound('Bạn chưa có cửa hàng');
        }

        sendSuccess(res, 'Lấy thông tin cửa hàng thành công', shop);
    } catch (error) {
        next(error);
    }
});

router.get('/:id/products', async (req, res, next) => {
    try {
        const Product = require('../models/Product');
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const skip = (page - 1) * limit;
        const shop = await Shop.findById(req.params.id);

        if (!shop || shop.status !== SHOP_STATUS.APPROVED) {
            throw ApiError.notFound('Cua hang khong ton tai');
        }

        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [products, total] = await Promise.all([
            Product.find({ shop: shop._id, isActive: true })
                .populate('category', 'name slug')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Product.countDocuments({ shop: shop._id, isActive: true })
        ]);

        sendSuccess(res, 'Lay san pham cua shop thanh cong', {
            shop,
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ _id: req.params.id, status: SHOP_STATUS.APPROVED });

        if (!shop) {
            throw ApiError.notFound('Cửa hàng không tồn tại');
        }

        sendSuccess(res, 'Lấy thông tin cửa hàng thành công', shop);
    } catch (error) {
        next(error);
    }
});

router.put('/my-shop', authenticate, async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user.id });

        if (!shop) {
            throw ApiError.notFound('Bạn chưa có cửa hàng');
        }

        const allowedFields = ['name', 'description', 'logo', 'banner', 'address', 'location', 'phone', 'email', 'policies', 'operatingHours'];
        
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'location') {
                    shop[field] = sanitizeLocation(req.body[field]);
                    return;
                }

                shop[field] = req.body[field];
            }
        });

        await shop.save();

        sendSuccess(res, 'Cập nhật cửa hàng thành công', shop);
    } catch (error) {
        next(error);
    }
});

router.put('/my-shop/bank', authenticate, async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user.id });

        if (!shop) {
            throw ApiError.notFound('Bạn chưa có cửa hàng');
        }

        const { bankName, bankAccount, accountHolder } = req.body;

        shop.bankAccount = { bankName, bankAccount, accountHolder };
        await shop.save();

        sendSuccess(res, 'Cập nhật tài khoản ngân hàng thành công', shop);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
