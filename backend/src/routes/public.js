const express = require('express');
const router = express.Router();
const { Banner, Promotion } = require('../models');
const Article = require('../models/admin/Article');
const Page = require('../models/admin/Page');
const Contact = require('../models/admin/Contact');
const SiteSetting = require('../models/admin/SiteSetting');
const { sendSuccess, sendCreated } = require('../middleware/responseHandler');

const activeDateFilter = () => {
    const now = new Date();
    return {
        isActive: true,
        $and: [
            { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
            { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] }
        ]
    };
};

router.get('/banners', async (req, res, next) => {
    try {
        const banners = await Banner.find(activeDateFilter()).sort({ position: 1, createdAt: -1 });
        sendSuccess(res, 'Lay banner thanh cong', banners);
    } catch (error) {
        next(error);
    }
});

router.get('/promotions', async (req, res, next) => {
    try {
        const now = new Date();
        const promotions = await Promotion.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        })
            .populate('products', 'name price originalPrice images thumbnail')
            .sort({ endDate: 1 });

        sendSuccess(res, 'Lay khuyen mai thanh cong', promotions);
    } catch (error) {
        next(error);
    }
});

router.get('/articles', async (req, res, next) => {
    try {
        const { category, featured, limit = 12 } = req.query;
        const filter = { status: 'published' };
        if (category) filter.category = category;
        if (featured === 'true') filter.isFeatured = true;

        const articles = await Article.find(filter)
            .select('title slug excerpt image category tags publishedAt viewCount isFeatured createdAt')
            .sort({ publishedAt: -1, createdAt: -1 })
            .limit(parseInt(limit));

        sendSuccess(res, 'Lay bai viet thanh cong', articles);
    } catch (error) {
        next(error);
    }
});

router.get('/articles/:slug', async (req, res, next) => {
    try {
        const article = await Article.findOne({ slug: req.params.slug, status: 'published' });
        if (!article) {
            return res.status(404).json({ success: false, message: 'Article not found' });
        }

        article.viewCount += 1;
        await article.save();

        const relatedArticles = await Article.find({
            _id: { $ne: article._id },
            status: 'published',
            category: article.category
        })
            .select('title slug excerpt image category publishedAt')
            .sort({ publishedAt: -1, createdAt: -1 })
            .limit(4);

        sendSuccess(res, 'Lay chi tiet bai viet thanh cong', {
            ...article.toObject(),
            relatedArticles
        });
    } catch (error) {
        next(error);
    }
});

router.get('/pages', async (req, res, next) => {
    try {
        const { type } = req.query;
        const filter = { status: 'published' };
        if (type) filter.type = type;

        const pages = await Page.find(filter)
            .select('title slug type metaTitle metaDescription updatedAt')
            .sort({ type: 1, title: 1 });

        sendSuccess(res, 'Lay danh sach trang thanh cong', pages);
    } catch (error) {
        next(error);
    }
});

router.get('/pages/:slug', async (req, res, next) => {
    try {
        const page = await Page.findOne({ slug: req.params.slug, status: 'published' });
        if (!page) {
            return res.status(404).json({ success: false, message: 'Page not found' });
        }
        sendSuccess(res, 'Lay noi dung trang thanh cong', page);
    } catch (error) {
        next(error);
    }
});

router.get('/contact-info', async (req, res, next) => {
    try {
        const settings = await SiteSetting.find({
            isPublic: true,
            key: { $in: ['phone', 'email', 'address', 'workingHours', 'facebook', 'instagram', 'tiktok', 'mapEmbedUrl', 'mapUrl'] }
        });

        const data = settings.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {
            phone: '1900 0000',
            email: 'support@petshop.local',
            address: 'Pet Marketplace',
            workingHours: '08:00 - 21:00',
            facebook: '#',
            instagram: '#',
            mapUrl: 'https://maps.google.com'
        });

        sendSuccess(res, 'Lay thong tin lien he thanh cong', data);
    } catch (error) {
        next(error);
    }
});

router.post('/contact', async (req, res, next) => {
    try {
        const { name, email, phone, subject, message, type = 'general' } = req.body;
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ success: false, message: 'Name, email, subject and message are required' });
        }

        const contact = await Contact.create({
            name,
            email,
            phone,
            subject,
            message,
            type,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        sendCreated(res, 'Gui lien he thanh cong', contact);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
