const express = require('express');
const router = express.Router();

const { Product, Order, Coupon, Promotion, Review, Settlement, InventoryLog } = require('../models');
const { authenticate, requireApprovedSeller } = require('../middleware/auth');
const { sendSuccess, sendCreated } = require('../middleware/responseHandler');
const ApiError = require('../utils/ApiError');
const { ROLES, COUPON_STATUS, ORDER_STATUS } = require('../config/constants');
const { enrichSellerOrder, buildSellerWalletSummary } = require('../services/sellerFinanceService');

router.use(authenticate);
router.use(requireApprovedSeller);

const periodMatch = (field, from, to) => {
    const match = {};
    if (from || to) {
        match[field] = {};
        if (from) match[field].$gte = new Date(from);
        if (to) match[field].$lte = new Date(to);
    }
    return match;
};

const sellerRevenuePipeline = (sellerId, match = {}) => ([
    { $match: { 'items.seller': sellerId, ...match } },
    { $unwind: '$items' },
    { $match: { 'items.seller': sellerId, 'items.shopStatus': { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED] } } },
    {
        $group: {
            _id: null,
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            itemCount: { $sum: '$items.quantity' },
            orderItemCount: { $sum: 1 }
        }
    }
]);

router.get('/dashboard', async (req, res, next) => {
    try {
        const sellerId = req.user._id;
        const shopId = req.user.shop._id;
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        const [
            productCount,
            activeProductCount,
            hiddenProductCount,
            lowStockProducts,
            orderStats,
            todayRevenue,
            monthRevenue,
            yearRevenue,
            totalRevenue,
            bestSellingProducts,
            slowMovingProducts,
            recentOrders,
            walletOrders,
            recentReviews,
            settlements,
            allSettlements
        ] = await Promise.all([
            Product.countDocuments({ seller: sellerId }),
            Product.countDocuments({ seller: sellerId, isActive: true }),
            Product.countDocuments({ seller: sellerId, isActive: false }),
            Product.find({ seller: sellerId, stock: { $lte: 10 } }).select('name sku stock price').sort({ stock: 1 }).limit(10),
            Order.aggregate([
                { $match: { 'items.seller': sellerId } },
                { $unwind: '$items' },
                { $match: { 'items.seller': sellerId } },
                { $group: { _id: '$items.shopStatus', count: { $sum: 1 } } }
            ]),
            Order.aggregate(sellerRevenuePipeline(sellerId, { createdAt: { $gte: startOfDay } })),
            Order.aggregate(sellerRevenuePipeline(sellerId, { createdAt: { $gte: startOfMonth } })),
            Order.aggregate(sellerRevenuePipeline(sellerId, { createdAt: { $gte: startOfYear } })),
            Order.aggregate(sellerRevenuePipeline(sellerId)),
            Product.find({ seller: sellerId }).select('name sku soldCount stock price images thumbnail').sort({ soldCount: -1 }).limit(5),
            Product.find({ seller: sellerId, soldCount: 0 }).select('name sku soldCount stock price images thumbnail').sort({ createdAt: -1 }).limit(5),
            Order.find({ 'items.seller': sellerId }).populate('buyer', 'name email phone').sort({ createdAt: -1 }).limit(5),
            Order.find({ 'items.seller': sellerId })
                .select('items paymentMethod paymentStatus payment orderStatus status createdAt updatedAt')
                .sort({ createdAt: -1 }),
            Review.find({ shop: shopId }).populate('user', 'name avatar').populate('product', 'name images thumbnail').sort({ createdAt: -1 }).limit(5),
            Settlement.find({ seller: sellerId }).sort({ createdAt: -1 }).limit(5),
            Settlement.find({ seller: sellerId }).sort({ createdAt: -1 })
        ]);

        const statusCounts = {};
        orderStats.forEach(item => { statusCounts[item._id] = item.count; });
        const revenue = {
            today: todayRevenue[0]?.revenue || 0,
            month: monthRevenue[0]?.revenue || 0,
            year: yearRevenue[0]?.revenue || 0,
            total: totalRevenue[0]?.revenue || 0
        };
        const feeRate = 0.05;
        const wallet = buildSellerWalletSummary(walletOrders, sellerId, { settlements: allSettlements });
        const recentOrdersWithFinancial = recentOrders.map((order) => enrichSellerOrder(order, sellerId, { settlements: allSettlements }));

        sendSuccess(res, 'Seller dashboard loaded', {
            shop: req.user.shop,
            productCount,
            activeProductCount,
            hiddenProductCount,
            lowStockProducts,
            orderStats: statusCounts,
            revenue: {
                ...revenue,
                platformFee: revenue.total * feeRate,
                netRevenue: revenue.total * (1 - feeRate)
            },
            wallet,
            bestSellingProducts,
            slowMovingProducts,
            recentOrders: recentOrdersWithFinancial,
            recentReviews,
            settlements
        });
    } catch (error) {
        next(error);
    }
});

router.get('/revenue', async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const result = await Order.aggregate(sellerRevenuePipeline(req.user._id, periodMatch('createdAt', from, to)));
        const revenue = result[0]?.revenue || 0;
        sendSuccess(res, 'Seller revenue loaded', {
            revenue,
            platformFee: revenue * 0.05,
            netRevenue: revenue * 0.95,
            itemCount: result[0]?.itemCount || 0,
            orderItemCount: result[0]?.orderItemCount || 0
        });
    } catch (error) {
        next(error);
    }
});

router.get('/inventory-logs', async (req, res, next) => {
    try {
        const logs = await InventoryLog.find({ shop: req.user.shop._id })
            .populate('product', 'name sku')
            .sort({ createdAt: -1 })
            .limit(parseInt(req.query.limit || 50));
        sendSuccess(res, 'Inventory logs loaded', logs);
    } catch (error) {
        next(error);
    }
});

router.get('/coupons', async (req, res, next) => {
    try {
        const coupons = await Coupon.find({ seller: req.user._id }).sort({ createdAt: -1 });
        sendSuccess(res, 'Coupons loaded', coupons);
    } catch (error) {
        next(error);
    }
});

router.post('/coupons', async (req, res, next) => {
    try {
        const coupon = await Coupon.create({
            ...req.body,
            code: String(req.body.code || '').toUpperCase(),
            seller: req.user._id,
            shop: req.user.shop._id
        });
        sendCreated(res, 'Coupon created', coupon);
    } catch (error) {
        next(error);
    }
});

router.put('/coupons/:id', async (req, res, next) => {
    try {
        const updates = { ...req.body };
        if (updates.code) updates.code = String(updates.code).toUpperCase();
        const coupon = await Coupon.findOneAndUpdate(
            { _id: req.params.id, seller: req.user._id },
            updates,
            { new: true, runValidators: true }
        );
        if (!coupon) throw ApiError.notFound('Coupon not found');
        sendSuccess(res, 'Coupon updated', coupon);
    } catch (error) {
        next(error);
    }
});

router.delete('/coupons/:id', async (req, res, next) => {
    try {
        const coupon = await Coupon.findOneAndDelete({ _id: req.params.id, seller: req.user._id });
        if (!coupon) throw ApiError.notFound('Coupon not found');
        sendSuccess(res, 'Coupon deleted');
    } catch (error) {
        next(error);
    }
});

router.put('/coupons/:id/toggle', async (req, res, next) => {
    try {
        const coupon = await Coupon.findOne({ _id: req.params.id, seller: req.user._id });
        if (!coupon) throw ApiError.notFound('Coupon not found');
        coupon.status = coupon.status === COUPON_STATUS.ACTIVE ? COUPON_STATUS.INACTIVE : COUPON_STATUS.ACTIVE;
        await coupon.save();
        sendSuccess(res, 'Coupon status updated', coupon);
    } catch (error) {
        next(error);
    }
});

router.get('/promotions', async (req, res, next) => {
    try {
        const promotions = await Promotion.find({ seller: req.user._id })
            .populate('products', 'name price originalPrice images thumbnail')
            .sort({ createdAt: -1 });
        sendSuccess(res, 'Promotions loaded', promotions);
    } catch (error) {
        next(error);
    }
});

router.post('/promotions', async (req, res, next) => {
    try {
        const ownedProductCount = await Product.countDocuments({
            _id: { $in: req.body.products || [] },
            seller: req.user._id
        });
        if ((req.body.products || []).length && ownedProductCount !== req.body.products.length) {
            throw ApiError.forbidden('Promotion contains products outside your shop');
        }

        const promotion = await Promotion.create({
            ...req.body,
            seller: req.user._id,
            shop: req.user.shop._id
        });
        sendCreated(res, 'Promotion created', promotion);
    } catch (error) {
        next(error);
    }
});

router.put('/promotions/:id', async (req, res, next) => {
    try {
        const promotion = await Promotion.findOneAndUpdate(
            { _id: req.params.id, seller: req.user._id },
            req.body,
            { new: true, runValidators: true }
        );
        if (!promotion) throw ApiError.notFound('Promotion not found');
        sendSuccess(res, 'Promotion updated', promotion);
    } catch (error) {
        next(error);
    }
});

router.delete('/promotions/:id', async (req, res, next) => {
    try {
        const promotion = await Promotion.findOneAndDelete({ _id: req.params.id, seller: req.user._id });
        if (!promotion) throw ApiError.notFound('Promotion not found');
        sendSuccess(res, 'Promotion deleted');
    } catch (error) {
        next(error);
    }
});

router.get('/reviews', async (req, res, next) => {
    try {
        const filter = { shop: req.user.shop._id };
        if (req.query.rating) filter.rating = parseInt(req.query.rating);
        const reviews = await Review.find(filter)
            .populate('user', 'name avatar')
            .populate('product', 'name images thumbnail')
            .sort({ createdAt: -1 })
            .limit(parseInt(req.query.limit || 50));
        sendSuccess(res, 'Reviews loaded', reviews);
    } catch (error) {
        next(error);
    }
});

router.put('/reviews/:id/reply', async (req, res, next) => {
    try {
        const review = await Review.findOne({ _id: req.params.id, shop: req.user.shop._id });
        if (!review) throw ApiError.notFound('Review not found');
        review.sellerReply = {
            comment: req.body.comment,
            repliedAt: new Date()
        };
        await review.save();
        sendSuccess(res, 'Review reply saved', review);
    } catch (error) {
        next(error);
    }
});

router.get('/settlements', async (req, res, next) => {
    try {
        const settlements = await Settlement.find({ seller: req.user._id })
            .populate('orders', 'orderNumber total createdAt')
            .sort({ createdAt: -1 })
            .limit(parseInt(req.query.limit || 50));
        sendSuccess(res, 'Settlements loaded', settlements);
    } catch (error) {
        next(error);
    }
});

router.post('/settlements/request', async (req, res, next) => {
    try {
        const candidateOrders = await Order.find({ 'items.seller': req.user._id }).select(
            'items paymentMethod paymentStatus payment orderStatus status createdAt updatedAt'
        );
        const allSettlements = await Settlement.find({ seller: req.user._id }).select('_id orders status completedAt createdAt amount fee netAmount');

        const pendingOrders = candidateOrders.filter((order) => {
            const financial = enrichSellerOrder(order, req.user._id, { settlements: allSettlements }).sellerFinancial;
            return financial.fundFlowStatus === 'pending_settlement' && !financial.settlementId;
        });

        if (!pendingOrders.length) {
            throw ApiError.badRequest('Khong co don nao dang cho doi soat');
        }

        const totals = pendingOrders.reduce((accumulator, order) => {
            const financial = enrichSellerOrder(order, req.user._id, { settlements: allSettlements }).sellerFinancial;
            accumulator.amount += financial.grossAmount;
            accumulator.fee += financial.platformFee;
            accumulator.netAmount += financial.netAmount;
            return accumulator;
        }, { amount: 0, fee: 0, netAmount: 0 });

        const settlement = await Settlement.create({
            shop: req.user.shop._id,
            seller: req.user._id,
            orders: pendingOrders.map((order) => order._id),
            amount: totals.amount,
            fee: totals.fee,
            netAmount: totals.netAmount,
            bankInfo: req.user.shop.bankAccount || {},
            status: 'pending',
            notes: req.body.notes
        });
        sendCreated(res, 'Settlement request created', settlement);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
