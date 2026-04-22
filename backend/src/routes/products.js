const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Product, Category, Review, Shop } = require('../models');
const { optionalAuth } = require('../middleware/auth');
const { pagination, getPaginationMeta } = require('../middleware/pagination');
const { sendSuccess } = require('../middleware/responseHandler');
const ApiError = require('../utils/ApiError');
const { SHOP_STATUS } = require('../config/constants');

const PUBLIC_SHOP_POPULATE = 'name logo rating labels verificationLevel';
const DISPLAY_PRICE_MULTIPLIER = 25000;

function escapeRegex(value = '') {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSearchText(value = '') {
    return String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function parsePriceFilter(value) {
    if (value === undefined || value === null || value === '') return null;
    const normalized = String(value).replace(/[^\d.]/g, '');
    if (!normalized) return null;
    const number = Number(normalized);
    return Number.isFinite(number) && number >= 0 ? number : null;
}

function displayPriceExpression() {
    return {
        $cond: [
            { $and: [{ $gt: ['$price', 0] }, { $lt: ['$price', 1000] }] },
            { $multiply: ['$price', DISPLAY_PRICE_MULTIPLIER] },
            '$price'
        ]
    };
}

function buildSearchTerms(search = '') {
    const raw = String(search || '').trim();
    if (!raw) return [];

    const normalized = normalizeSearchText(raw);
    const words = new Set(normalized.split(/[\s,.;:/\\|_-]+/).filter(Boolean));
    const petSynonyms = [
        { exactKeys: ['cho', 'chó'], wordKeys: ['cun', 'cún', 'dog', 'puppy'], accentedWords: ['chó'], terms: ['dog', 'chó', 'cún', 'puppy'] },
        { exactKeys: ['meo', 'mèo'], wordKeys: ['meo', 'mèo', 'cat', 'kitten'], terms: ['cat', 'mèo', 'kitten'] },
        { exactKeys: ['chim'], wordKeys: ['chim', 'bird', 'avian'], terms: ['bird', 'chim', 'avian'] },
        { exactKeys: ['ca', 'cá'], wordKeys: ['fish', 'aqua', 'aquarium'], accentedWords: ['cá'], terms: ['fish', 'cá', 'aquarium', 'aqua'] },
        { exactKeys: ['tho', 'thỏ'], wordKeys: ['rabbit', 'bunny'], accentedWords: ['thỏ'], terms: ['rabbit', 'thỏ', 'bunny'] },
        { exactKeys: ['hamster'], wordKeys: ['hamster'], terms: ['hamster'] },
        { exactKeys: ['bo sat', 'bò sát', 'reptile', 'reptiles'], wordKeys: ['reptile', 'reptiles'], accentedWords: ['bò sát'], terms: ['reptile', 'bò sát'] }
    ];

    const exactPetMatch = petSynonyms.find(group => group.exactKeys.includes(normalized) || group.exactKeys.includes(raw.toLowerCase()));
    if (exactPetMatch) return exactPetMatch.terms;

    const terms = new Set([raw]);
    petSynonyms.forEach(group => {
        const hasWordMatch = group.wordKeys.some(key => words.has(normalizeSearchText(key)));
        const hasAccentedWordMatch = (group.accentedWords || []).some(word => raw.toLowerCase().includes(word));
        if (hasWordMatch || hasAccentedWordMatch) {
            group.terms.forEach(term => terms.add(term));
        }
    });

    return [...terms].filter(Boolean);
}

async function getApprovedShopIds(shopId, options = {}) {
    const filter = { status: SHOP_STATUS.APPROVED };
    if (shopId) filter._id = shopId;
    if (options.mallOnly) {
        filter.$or = [
            { labels: { $in: ['petmall'] } },
            { verificationLevel: 'petmall' }
        ];
    }
    return Shop.find(filter).distinct('_id');
}

async function getPublicProductFilter(extra = {}, shopId = null, options = {}) {
    const approvedShopIds = await getApprovedShopIds(shopId, options);
    return {
        isActive: true,
        shop: { $in: approvedShopIds },
        ...extra
    };
}

router.get('/', optionalAuth, pagination(20), async (req, res, next) => {
    try {
        const { page, limit, skip } = req.pagination;
        const {
            search,
            category,
            shop,
            minPrice,
            maxPrice,
            brand,
            petType,
            inStock,
            onSale,
            minRating,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            mallOnly,
            featured,
            isActive = true
        } = req.query;

        const filter = await getPublicProductFilter({}, shop, { mallOnly: mallOnly === 'true' });
        if (isActive === 'false' && req.user?.role === 'admin') filter.isActive = false;
        const andFilters = [];

        if (search) {
            const searchTerms = buildSearchTerms(search);
            andFilters.push({ $or: [
                ...searchTerms.flatMap(term => {
                    const regex = { $regex: escapeRegex(term), $options: 'i' };
                    return [
                        { name: regex },
                        { description: regex },
                        { shortDescription: regex },
                        { brand: regex },
                        { tags: regex },
                        { 'attributes.value': regex }
                    ];
                })
            ] });
        }

        if (category) filter.category = category;
        if (shop) filter.shop = { $in: await getApprovedShopIds(shop) };
        if (brand) filter.brand = { $regex: brand, $options: 'i' };

        if (petType) {
            andFilters.push({ $or: [
                { tags: { $regex: petType, $options: 'i' } },
                { 'attributes.value': { $regex: petType, $options: 'i' } }
            ] });
        }

        if (minPrice || maxPrice) {
            const parsedMinPrice = parsePriceFilter(minPrice);
            const parsedMaxPrice = parsePriceFilter(maxPrice);
            const priceChecks = [];
            const displayedPrice = displayPriceExpression();
            if (parsedMinPrice !== null) priceChecks.push({ $gte: [displayedPrice, parsedMinPrice] });
            if (parsedMaxPrice !== null) priceChecks.push({ $lte: [displayedPrice, parsedMaxPrice] });
            if (priceChecks.length) andFilters.push({ $expr: { $and: priceChecks } });
        }

        if (inStock === 'true') filter.stock = { $gt: 0 };
        if (onSale === 'true') andFilters.push({ $expr: { $gt: ['$originalPrice', '$price'] } });
        if (minRating) filter.rating = { $gte: parseFloat(minRating) };
        if (featured === 'true') filter.isFeatured = true;
        if (andFilters.length) filter.$and = andFilters;

        const allowedSorts = ['createdAt', 'price', 'soldCount', 'rating', 'originalPrice'];
        const sort = {};
        sort[allowedSorts.includes(sortBy) ? sortBy : 'createdAt'] = sortOrder === 'asc' ? 1 : -1;

        const [products, total] = await Promise.all([
            Product.find(filter)
                .populate('category', 'name slug')
                .populate('shop', PUBLIC_SHOP_POPULATE)
                .sort(sort)
                .skip(skip)
                .limit(limit),
            Product.countDocuments(filter)
        ]);

        sendSuccess(res, 'Lay danh sach san pham thanh cong', products, getPaginationMeta(total, { page, limit }));
    } catch (error) {
        next(error);
    }
});

router.get('/featured', async (req, res, next) => {
    try {
        const { limit = 8 } = req.query;
        const products = await Product.find(await getPublicProductFilter({ isFeatured: true }))
            .populate('category', 'name slug')
            .populate('shop', PUBLIC_SHOP_POPULATE)
            .sort({ soldCount: -1, createdAt: -1 })
            .limit(parseInt(limit));

        sendSuccess(res, 'Lay san pham noi bat thanh cong', products);
    } catch (error) {
        next(error);
    }
});

router.get('/new', async (req, res, next) => {
    try {
        const { limit = 8 } = req.query;
        const products = await Product.find(await getPublicProductFilter())
            .populate('category', 'name slug')
            .populate('shop', PUBLIC_SHOP_POPULATE)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        sendSuccess(res, 'Lay san pham moi thanh cong', products);
    } catch (error) {
        next(error);
    }
});

router.get('/sale', async (req, res, next) => {
    try {
        const { limit = 8 } = req.query;
        const products = await Product.find(await getPublicProductFilter({
            $expr: { $gt: ['$originalPrice', '$price'] }
        }))
            .populate('category', 'name slug')
            .populate('shop', PUBLIC_SHOP_POPULATE)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        sendSuccess(res, 'Lay san pham khuyen mai thanh cong', products);
    } catch (error) {
        next(error);
    }
});

router.get('/bestsellers', async (req, res, next) => {
    try {
        const { limit = 8 } = req.query;
        const products = await Product.find(await getPublicProductFilter())
            .populate('category', 'name slug')
            .populate('shop', PUBLIC_SHOP_POPULATE)
            .sort({ soldCount: -1 })
            .limit(parseInt(limit));

        sendSuccess(res, 'Lay san pham ban chay thanh cong', products);
    } catch (error) {
        next(error);
    }
});

router.get('/search', async (req, res, next) => {
    try {
        const { q, limit = 20 } = req.query;
        if (!q) return sendSuccess(res, 'Ket qua tim kiem', []);

        const products = await Product.find(await getPublicProductFilter({
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { shortDescription: { $regex: q, $options: 'i' } },
                { brand: { $regex: q, $options: 'i' } },
                { tags: { $regex: q, $options: 'i' } }
            ]
        }))
            .populate('category', 'name slug')
            .populate('shop', PUBLIC_SHOP_POPULATE)
            .limit(parseInt(limit));

        sendSuccess(res, 'Tim kiem thanh cong', products);
    } catch (error) {
        next(error);
    }
});

router.get('/categories', async (req, res, next) => {
    try {
        const approvedShopIds = await getApprovedShopIds();
        const [categories, counts] = await Promise.all([
            Category.find({ isActive: true }).populate('parent', 'name slug').sort({ order: 1, name: 1 }),
            Product.aggregate([
                { $match: { isActive: true, shop: { $in: approvedShopIds }, category: { $ne: null } } },
                { $group: { _id: '$category', count: { $sum: 1 } } }
            ])
        ]);

        const countMap = new Map(counts.map(item => [item._id.toString(), item.count]));
        const data = categories.map(category => ({
            ...category.toObject(),
            productCount: countMap.get(category._id.toString()) || 0
        }));

        sendSuccess(res, 'Lay danh muc thanh cong', data);
    } catch (error) {
        next(error);
    }
});

router.get('/filters', async (req, res, next) => {
    try {
        const approvedShopIds = await getApprovedShopIds();
        const [brands, categories] = await Promise.all([
            Product.distinct('brand', { isActive: true, shop: { $in: approvedShopIds }, brand: { $nin: [null, ''] } }),
            Category.find({ isActive: true }).sort({ order: 1, name: 1 })
        ]);

        sendSuccess(res, 'Lay bo loc thanh cong', {
            brands: brands.filter(Boolean).sort(),
            petTypes: ['dog', 'cat', 'bird', 'fish', 'small-pet', 'reptile'],
            ratings: [5, 4, 3, 2, 1],
            categories
        });
    } catch (error) {
        next(error);
    }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, isActive: true, shop: { $in: await getApprovedShopIds() } })
            .populate('category', 'name slug')
            .populate('subcategory', 'name slug')
            .populate('shop', 'name logo rating reviewCount description status labels verificationLevel');

        if (!product) throw ApiError.notFound('San pham khong ton tai');

        product.viewCount += 1;
        await product.save();

        const relatedProducts = await Product.find({
            _id: { $ne: product._id },
            isActive: true,
            shop: { $in: await getApprovedShopIds() },
            $or: [
                { category: product.category?._id || product.category },
                { shop: product.shop?._id || product.shop },
                ...(product.brand ? [{ brand: product.brand }] : [])
            ]
        })
            .populate('category', 'name slug')
            .populate('shop', PUBLIC_SHOP_POPULATE)
            .limit(8);

        sendSuccess(res, 'Lay thong tin san pham thanh cong', {
            ...product.toObject(),
            relatedProducts
        });
    } catch (error) {
        next(error);
    }
});

router.get('/:id/reviews', async (req, res, next) => {
    try {
        const { page = 1, limit = 10, rating } = req.query;
        const skip = (page - 1) * limit;
        const productId = new mongoose.Types.ObjectId(req.params.id);
        const filter = { product: productId, status: 'visible' };
        if (rating) filter.rating = parseInt(rating);

        const [reviews, total, stats] = await Promise.all([
            Review.find(filter)
                .populate('user', 'name avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Review.countDocuments(filter),
            Review.aggregate([
                { $match: { product: productId, status: 'visible' } },
                {
                    $group: {
                        _id: null,
                        average: { $avg: '$rating' },
                        total: { $sum: 1 },
                        5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
                        4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
                        3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                        2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
                        1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
                    }
                }
            ])
        ]);

        sendSuccess(res, 'Lay danh gia thanh cong', {
            reviews,
            stats: stats[0] || { average: 0, total: 0 }
        }, getPaginationMeta(total, { page, limit }));
    } catch (error) {
        next(error);
    }
});

module.exports = router;
