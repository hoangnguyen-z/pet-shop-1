const express = require('express');
const router = express.Router();
const Banner = require('../../models/Banner');
const Promotion = require('../../models/Promotion');
const Coupon = require('../../models/Coupon');
const Review = require('../../models/Review');
const Order = require('../../models/Order');
const Settlement = require('../../models/Settlement');
const Article = require('../../models/admin/Article');
const Page = require('../../models/admin/Page');
const Contact = require('../../models/admin/Contact');
const Feedback = require('../../models/admin/Feedback');
const Complaint = require('../../models/admin/Complaint');
const ReturnRequest = require('../../models/admin/Return');
const Refund = require('../../models/admin/Refund');
const Report = require('../../models/admin/Report');
const SiteSetting = require('../../models/admin/SiteSetting');
const SystemLog = require('../../models/admin/SystemLog');
const AuditLog = require('../../models/admin/AuditLog');
const { authenticateAdmin } = require('../../middleware/adminAuth');
const { checkPermission } = require('../../middleware/permissionGuard');
const { sendSuccess, sendCreated } = require('../../middleware/responseHandler');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const slugify = value => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const pageParams = req => ({
    page: Math.max(parseInt(req.query.page, 10) || 1, 1),
    limit: Math.min(parseInt(req.query.limit, 10) || 20, 100)
});

const pagination = (total, page, limit) => ({
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    totalPages: Math.ceil(total / limit)
});

const audit = async (req, action, resource, resourceId, description, newData = null) => {
    await AuditLog.create({
        admin: req.admin._id,
        action,
        resource,
        resourceId,
        description,
        newData,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
};

const listDocuments = async ({ req, res, model, key, query = {}, sort = { createdAt: -1 }, populate = [] }) => {
    const { page, limit } = pageParams(req);
    let cursor = model.find(query).sort(sort).skip((page - 1) * limit).limit(limit);

    for (const item of populate) {
        cursor = cursor.populate(item);
    }

    const [items, total] = await Promise.all([
        cursor,
        model.countDocuments(query)
    ]);

    sendSuccess(res, {
        [key]: items,
        pagination: pagination(total, page, limit)
    });
};

const textSearch = (search, fields) => {
    if (!search) return {};
    return {
        $or: fields.map(field => ({
            [field]: { $regex: search, $options: 'i' }
        }))
    };
};

const getBanners = asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';
    const banners = await Banner.find(query).sort({ position: 1, createdAt: -1 });
    sendSuccess(res, banners);
});

const createBanner = asyncHandler(async (req, res) => {
    const { title, subtitle, image, link, badge, type, backgroundColor, secondaryColor, position, isActive, startDate, endDate } = req.body;

    if (!title || !image) throw ApiError.badRequest('Title and image are required');

    const banner = await Banner.create({
        title,
        subtitle,
        image,
        link,
        badge,
        type: type || 'primary',
        backgroundColor,
        secondaryColor,
        position: Number(position) || 0,
        isActive: isActive !== false,
        startDate,
        endDate
    });

    await audit(req, 'create', 'banner', banner._id, `Created banner: ${title}`, banner);
    sendCreated(res, banner, 'Banner created');
});

const updateBanner = asyncHandler(async (req, res) => {
    const allowed = ['title', 'subtitle', 'image', 'link', 'badge', 'type', 'backgroundColor', 'secondaryColor', 'position', 'isActive', 'startDate', 'endDate'];
    const banner = await Banner.findById(req.params.id);

    if (!banner) throw ApiError.notFound('Banner not found');

    allowed.forEach(field => {
        if (req.body[field] !== undefined) banner[field] = field === 'position' ? Number(req.body[field]) : req.body[field];
    });

    await banner.save();
    await audit(req, 'update', 'banner', banner._id, `Updated banner: ${banner.title}`, banner);
    sendSuccess(res, banner, 'Banner updated');
});

const deleteBanner = asyncHandler(async (req, res) => {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) throw ApiError.notFound('Banner not found');
    await audit(req, 'delete', 'banner', req.params.id, `Deleted banner: ${banner.title}`);
    sendSuccess(res, null, 'Banner deleted');
});

const getPromotions = asyncHandler(async (req, res) => {
    const query = {
        ...textSearch(req.query.search, ['title', 'description'])
    };
    if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';
    if (req.query.type) query.type = req.query.type;

    await listDocuments({
        req,
        res,
        model: Promotion,
        key: 'promotions',
        query,
        populate: [
            { path: 'shop', select: 'name slug' },
            { path: 'seller', select: 'name email' }
        ]
    });
});

const createPromotion = asyncHandler(async (req, res) => {
    const { title, description, image, link, shop, seller, type, discountPercent, startDate, endDate, products, isActive } = req.body;

    if (!title || !endDate) throw ApiError.badRequest('Title and endDate are required');

    const promotion = await Promotion.create({
        title,
        description,
        image,
        link,
        shop,
        seller,
        type: type || 'deal',
        discountPercent,
        startDate: startDate || new Date(),
        endDate,
        products: products || [],
        isActive: isActive !== false
    });

    await audit(req, 'create', 'promotion', promotion._id, `Created promotion: ${title}`, promotion);
    sendCreated(res, promotion, 'Promotion created');
});

const updatePromotion = asyncHandler(async (req, res) => {
    const allowed = ['title', 'description', 'image', 'link', 'shop', 'seller', 'type', 'discountPercent', 'startDate', 'endDate', 'products', 'isActive'];
    const promotion = await Promotion.findById(req.params.id);

    if (!promotion) throw ApiError.notFound('Promotion not found');

    allowed.forEach(field => {
        if (req.body[field] !== undefined) promotion[field] = req.body[field];
    });

    await promotion.save();
    await audit(req, 'update', 'promotion', promotion._id, `Updated promotion: ${promotion.title}`, promotion);
    sendSuccess(res, promotion, 'Promotion updated');
});

const deletePromotion = asyncHandler(async (req, res) => {
    const promotion = await Promotion.findByIdAndDelete(req.params.id);
    if (!promotion) throw ApiError.notFound('Promotion not found');
    await audit(req, 'delete', 'promotion', req.params.id, `Deleted promotion: ${promotion.title}`);
    sendSuccess(res, null, 'Promotion deleted');
});

const getCoupons = asyncHandler(async (req, res) => {
    const query = {
        ...textSearch(req.query.search, ['code', 'description'])
    };
    if (req.query.status) query.status = req.query.status;
    if (req.query.shop) query.shop = req.query.shop;

    await listDocuments({
        req,
        res,
        model: Coupon,
        key: 'coupons',
        query,
        populate: [
            { path: 'shop', select: 'name slug' },
            { path: 'seller', select: 'name email' }
        ]
    });
});

const createCoupon = asyncHandler(async (req, res) => {
    const { code, shop, seller, type, value, minOrderAmount, maxDiscount, maxUsage, perUserLimit, startDate, endDate, status, applicableProducts, applicableCategories, description } = req.body;

    if (!code || value === undefined || !endDate) throw ApiError.badRequest('Code, value and endDate are required');

    const coupon = await Coupon.create({
        code: String(code).toUpperCase(),
        shop,
        seller,
        type: type || 'percentage',
        value,
        minOrderAmount: minOrderAmount || 0,
        maxDiscount,
        maxUsage,
        perUserLimit: perUserLimit || 1,
        startDate: startDate || new Date(),
        endDate,
        status: status || 'active',
        applicableProducts: applicableProducts || [],
        applicableCategories: applicableCategories || [],
        description
    });

    await audit(req, 'create', 'coupon', coupon._id, `Created coupon: ${coupon.code}`, coupon);
    sendCreated(res, coupon, 'Coupon created');
});

const updateCoupon = asyncHandler(async (req, res) => {
    const allowed = ['shop', 'seller', 'type', 'value', 'minOrderAmount', 'maxDiscount', 'maxUsage', 'perUserLimit', 'startDate', 'endDate', 'status', 'applicableProducts', 'applicableCategories', 'description'];
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) throw ApiError.notFound('Coupon not found');
    if (req.body.code) coupon.code = String(req.body.code).toUpperCase();
    allowed.forEach(field => {
        if (req.body[field] !== undefined) coupon[field] = req.body[field];
    });

    await coupon.save();
    await audit(req, 'update', 'coupon', coupon._id, `Updated coupon: ${coupon.code}`, coupon);
    sendSuccess(res, coupon, 'Coupon updated');
});

const deleteCoupon = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) throw ApiError.notFound('Coupon not found');
    await audit(req, 'delete', 'coupon', req.params.id, `Deleted coupon: ${coupon.code}`);
    sendSuccess(res, null, 'Coupon deleted');
});

const getArticles = asyncHandler(async (req, res) => {
    const query = {
        ...textSearch(req.query.search, ['title', 'excerpt', 'content'])
    };
    if (req.query.category) query.category = req.query.category;
    if (req.query.status) query.status = req.query.status;

    await listDocuments({
        req,
        res,
        model: Article,
        key: 'articles',
        query,
        populate: [{ path: 'author', select: 'name email' }]
    });
});

const getArticleById = asyncHandler(async (req, res) => {
    const article = await Article.findById(req.params.id).populate('author', 'name email');
    if (!article) throw ApiError.notFound('Article not found');
    sendSuccess(res, article);
});

const createArticle = asyncHandler(async (req, res) => {
    const { title, slug, content, excerpt, category, tags, image, status, isPublished, scheduledAt, isFeatured, seoTitle, seoDescription } = req.body;

    if (!title || !content) throw ApiError.badRequest('Title and content are required');

    const articleStatus = status || (isPublished === true ? 'published' : 'draft');
    const article = await Article.create({
        title,
        slug: slug || slugify(title),
        content,
        excerpt,
        category: category || 'news',
        tags: tags || [],
        image,
        status: articleStatus,
        publishedAt: articleStatus === 'published' ? new Date() : undefined,
        scheduledAt,
        isFeatured: !!isFeatured,
        seoTitle,
        seoDescription,
        author: req.admin._id
    });

    await audit(req, 'create', 'article', article._id, `Created article: ${title}`, article);
    sendCreated(res, article, 'Article created');
});

const updateArticle = asyncHandler(async (req, res) => {
    const allowed = ['title', 'slug', 'content', 'excerpt', 'category', 'tags', 'image', 'status', 'scheduledAt', 'isFeatured', 'seoTitle', 'seoDescription'];
    const article = await Article.findById(req.params.id);

    if (!article) throw ApiError.notFound('Article not found');

    allowed.forEach(field => {
        if (req.body[field] !== undefined) article[field] = req.body[field];
    });
    if (req.body.isPublished !== undefined) article.status = req.body.isPublished ? 'published' : 'draft';
    if (article.status === 'published' && !article.publishedAt) article.publishedAt = new Date();

    await article.save();
    await audit(req, 'update', 'article', article._id, `Updated article: ${article.title}`, article);
    sendSuccess(res, article, 'Article updated');
});

const deleteArticle = asyncHandler(async (req, res) => {
    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article) throw ApiError.notFound('Article not found');
    await audit(req, 'delete', 'article', req.params.id, `Deleted article: ${article.title}`);
    sendSuccess(res, null, 'Article deleted');
});

const getPages = asyncHandler(async (req, res) => {
    const query = {
        ...textSearch(req.query.search, ['title', 'slug', 'content'])
    };
    if (req.query.type) query.type = req.query.type;
    if (req.query.status) query.status = req.query.status;

    const pages = await Page.find(query).sort({ title: 1 });
    sendSuccess(res, pages);
});

const getPageBySlug = asyncHandler(async (req, res) => {
    const page = await Page.findOne({ slug: req.params.slug });
    if (!page) throw ApiError.notFound('Page not found');
    sendSuccess(res, page);
});

const createPage = asyncHandler(async (req, res) => {
    const { title, slug, content, type, status, metaTitle, metaDescription, isActive } = req.body;

    if (!title || !content) throw ApiError.badRequest('Title and content are required');

    const page = await Page.create({
        title,
        slug: slug || slugify(title),
        content,
        type: type || 'other',
        status: status || (isActive === false ? 'draft' : 'published'),
        metaTitle,
        metaDescription,
        updatedBy: req.admin._id
    });

    await audit(req, 'create', 'page', page._id, `Created page: ${title}`, page);
    sendCreated(res, page, 'Page created');
});

const updatePage = asyncHandler(async (req, res) => {
    const allowed = ['title', 'slug', 'content', 'type', 'status', 'metaTitle', 'metaDescription'];
    const page = await Page.findById(req.params.id);

    if (!page) throw ApiError.notFound('Page not found');

    allowed.forEach(field => {
        if (req.body[field] !== undefined) page[field] = req.body[field];
    });
    if (req.body.isActive !== undefined) page.status = req.body.isActive ? 'published' : 'draft';
    page.updatedBy = req.admin._id;

    await page.save();
    await audit(req, 'update', 'page', page._id, `Updated page: ${page.title}`, page);
    sendSuccess(res, page, 'Page updated');
});

const deletePage = asyncHandler(async (req, res) => {
    const page = await Page.findByIdAndDelete(req.params.id);
    if (!page) throw ApiError.notFound('Page not found');
    await audit(req, 'delete', 'page', req.params.id, `Deleted page: ${page.title}`);
    sendSuccess(res, null, 'Page deleted');
});

const getReviews = asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.rating) query.rating = Number(req.query.rating);

    await listDocuments({
        req,
        res,
        model: Review,
        key: 'reviews',
        query,
        populate: [
            { path: 'product', select: 'name sku' },
            { path: 'shop', select: 'name slug' },
            { path: 'user', select: 'name email' }
        ]
    });
});

const updateReview = asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id);
    if (!review) throw ApiError.notFound('Review not found');

    if (req.body.status) review.status = req.body.status;
    if (req.body.sellerReply) review.sellerReply = req.body.sellerReply;

    await review.save();
    await audit(req, 'update', 'review', review._id, `Updated review ${review._id}`, review);
    sendSuccess(res, review, 'Review updated');
});

const deleteReview = asyncHandler(async (req, res) => {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) throw ApiError.notFound('Review not found');
    await audit(req, 'delete', 'review', req.params.id, `Deleted review ${req.params.id}`);
    sendSuccess(res, null, 'Review deleted');
});

const listContacts = asyncHandler(async (req, res) => {
    const query = {
        ...textSearch(req.query.search, ['name', 'email', 'subject', 'message'])
    };
    if (req.query.status) query.status = req.query.status;
    if (req.query.type) query.type = req.query.type;

    await listDocuments({ req, res, model: Contact, key: 'contacts', query, populate: [{ path: 'assignedTo', select: 'name email' }] });
});

const updateContact = asyncHandler(async (req, res) => {
    const contact = await Contact.findById(req.params.id);
    if (!contact) throw ApiError.notFound('Contact not found');

    ['status', 'priority', 'department', 'assignedTo'].forEach(field => {
        if (req.body[field] !== undefined) contact[field] = req.body[field] || undefined;
    });
    if (req.body.response) {
        contact.responses.push({ message: req.body.response, respondedBy: req.admin._id });
    }

    await contact.save();
    await audit(req, 'update', 'contact', contact._id, `Updated contact: ${contact.subject}`, contact);
    sendSuccess(res, contact, 'Contact updated');
});

const listFeedback = asyncHandler(async (req, res) => {
    const query = {
        ...textSearch(req.query.search, ['subject', 'content'])
    };
    if (req.query.status) query.status = req.query.status;
    if (req.query.type) query.type = req.query.type;

    await listDocuments({ req, res, model: Feedback, key: 'feedback', query, populate: [{ path: 'user', select: 'name email' }, { path: 'assignedTo', select: 'name email' }] });
});

const updateFeedback = asyncHandler(async (req, res) => {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) throw ApiError.notFound('Feedback not found');

    ['status', 'priority', 'assignedTo'].forEach(field => {
        if (req.body[field] !== undefined) feedback[field] = req.body[field] || undefined;
    });
    if (req.body.response) feedback.responses.push({ message: req.body.response, respondedBy: req.admin._id });
    if (feedback.status === 'resolved' && !feedback.resolvedAt) feedback.resolvedAt = new Date();

    await feedback.save();
    await audit(req, 'update', 'feedback', feedback._id, `Updated feedback: ${feedback.subject}`, feedback);
    sendSuccess(res, feedback, 'Feedback updated');
});

const listComplaints = asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.type) query.type = req.query.type;

    await listDocuments({
        req,
        res,
        model: Complaint,
        key: 'complaints',
        query,
        populate: [
            { path: 'buyer', select: 'name email phone' },
            { path: 'order', select: 'orderNumber total status' },
            { path: 'shop', select: 'name slug' },
            { path: 'assignedTo', select: 'name email' }
        ]
    });
});

const updateComplaint = asyncHandler(async (req, res) => {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) throw ApiError.notFound('Complaint not found');

    ['status', 'priority', 'assignedTo', 'refundAmount'].forEach(field => {
        if (req.body[field] !== undefined) complaint[field] = req.body[field] || undefined;
    });
    if (req.body.adminDecision) {
        complaint.adminDecision = {
            ...complaint.adminDecision,
            ...req.body.adminDecision,
            resolvedBy: req.admin._id,
            resolvedAt: new Date()
        };
    }
    if (['resolved', 'closed'].includes(complaint.status) && !complaint.resolvedAt) complaint.resolvedAt = new Date();

    await complaint.save();
    await audit(req, 'update', 'complaint', complaint._id, `Updated complaint: ${complaint.subject}`, complaint);
    sendSuccess(res, complaint, 'Complaint updated');
});

const listReturns = asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.status) query.status = req.query.status;

    await listDocuments({
        req,
        res,
        model: ReturnRequest,
        key: 'returns',
        query,
        populate: [
            { path: 'buyer', select: 'name email phone' },
            { path: 'order', select: 'orderNumber total status' },
            { path: 'shop', select: 'name slug' },
            { path: 'approvedBy', select: 'name email' }
        ]
    });
});

const updateReturn = asyncHandler(async (req, res) => {
    const request = await ReturnRequest.findById(req.params.id);
    if (!request) throw ApiError.notFound('Return request not found');

    ['status', 'returnTracking', 'inspectionNotes', 'refundAmount'].forEach(field => {
        if (req.body[field] !== undefined) request[field] = req.body[field];
    });
    if (['approved', 'rejected'].includes(req.body.status)) {
        request.approvedBy = req.admin._id;
        request.approvedAt = new Date();
    }
    if (['refunded', 'rejected_inspection'].includes(request.status) && !request.resolvedAt) request.resolvedAt = new Date();

    await request.save();
    await audit(req, 'update', 'return', request._id, `Updated return request ${request._id}`, request);
    sendSuccess(res, request, 'Return updated');
});

const listRefunds = asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.status) query.status = req.query.status;

    await listDocuments({
        req,
        res,
        model: Refund,
        key: 'refunds',
        query,
        populate: [
            { path: 'buyer', select: 'name email phone' },
            { path: 'order', select: 'orderNumber total status' },
            { path: 'shop', select: 'name slug' },
            { path: 'approvedBy', select: 'name email' }
        ]
    });
});

const updateRefund = asyncHandler(async (req, res) => {
    const refund = await Refund.findById(req.params.id);
    if (!refund) throw ApiError.notFound('Refund not found');

    ['status', 'rejectedReason', 'transactionId', 'failureReason'].forEach(field => {
        if (req.body[field] !== undefined) refund[field] = req.body[field];
    });
    if (['approved', 'rejected'].includes(req.body.status)) {
        refund.approvedBy = req.admin._id;
        refund.approvedAt = new Date();
    }
    if (refund.status === 'completed' && !refund.completedAt) refund.completedAt = new Date();

    await refund.save();
    await audit(req, 'update', 'refund', refund._id, `Updated refund ${refund._id}`, refund);
    sendSuccess(res, refund, 'Refund updated');
});

const listReports = asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.targetType) query.targetType = req.query.targetType;

    await listDocuments({ req, res, model: Report, key: 'reports', query, populate: [{ path: 'reporter', select: 'name email' }, { path: 'handledBy', select: 'name email' }] });
});

const updateReport = asyncHandler(async (req, res) => {
    const report = await Report.findById(req.params.id);
    if (!report) throw ApiError.notFound('Report not found');

    ['status', 'resolution', 'actionTaken'].forEach(field => {
        if (req.body[field] !== undefined) report[field] = req.body[field];
    });
    report.handledBy = req.admin._id;
    if (['resolved', 'valid', 'invalid'].includes(report.status)) report.resolvedAt = new Date();

    await report.save();
    await audit(req, 'update', 'report', report._id, `Updated report ${report._id}`, report);
    sendSuccess(res, report, 'Report updated');
});

const listPayments = asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.paymentStatus) query['payment.status'] = req.query.paymentStatus;
    if (req.query.method) query['payment.method'] = req.query.method;

    await listDocuments({
        req,
        res,
        model: Order,
        key: 'payments',
        query,
        populate: [{ path: 'buyer', select: 'name email phone' }],
        sort: { createdAt: -1 }
    });
});

const listSettlements = asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.shop) query.shop = req.query.shop;

    await listDocuments({
        req,
        res,
        model: Settlement,
        key: 'settlements',
        query,
        sort: { createdAt: -1 },
        populate: [
            { path: 'shop', select: 'name slug bankAccount' },
            { path: 'seller', select: 'name email phone' },
            { path: 'orders', select: 'orderNumber total payment status' }
        ]
    });
});

const updateSettlement = asyncHandler(async (req, res) => {
    const settlement = await Settlement.findById(req.params.id);
    if (!settlement) throw ApiError.notFound('Settlement not found');

    const nextStatus = req.body.status || settlement.status;
    if (nextStatus === 'completed' && !(req.body.transactionId || settlement.transactionId)) {
        throw ApiError.badRequest('Transaction ID is required when completing a settlement');
    }

    ['status', 'transactionId', 'notes', 'bankInfo'].forEach(field => {
        if (req.body[field] !== undefined) settlement[field] = req.body[field];
    });
    if (settlement.status === 'completed' && !settlement.completedAt) {
        settlement.completedAt = new Date();
    }
    if (settlement.status !== 'completed' && req.body.status) {
        settlement.completedAt = undefined;
    }

    await settlement.save();
    await audit(req, 'update', 'settlement', settlement._id, `Updated settlement ${settlement._id}`, settlement);
    sendSuccess(res, settlement, 'Settlement updated');
});

const listSettings = asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.group) query.group = req.query.group;
    const settings = await SiteSetting.find(query).populate('updatedBy', 'name email').sort({ group: 1, key: 1 });
    sendSuccess(res, settings);
});

const upsertSetting = asyncHandler(async (req, res) => {
    const { key, value, type, group, label, description, isPublic } = req.body;
    if (!key) throw ApiError.badRequest('Setting key is required');

    const setting = await SiteSetting.findOneAndUpdate(
        { key },
        { value, type, group, label, description, isPublic, updatedBy: req.admin._id },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    await audit(req, 'update', 'site_setting', setting._id, `Updated setting: ${key}`, setting);
    sendSuccess(res, setting, 'Setting saved');
});

const updateSetting = asyncHandler(async (req, res) => {
    const setting = await SiteSetting.findById(req.params.id);
    if (!setting) throw ApiError.notFound('Setting not found');

    ['value', 'type', 'group', 'label', 'description', 'isPublic'].forEach(field => {
        if (req.body[field] !== undefined) setting[field] = req.body[field];
    });
    setting.updatedBy = req.admin._id;

    await setting.save();
    await audit(req, 'update', 'site_setting', setting._id, `Updated setting: ${setting.key}`, setting);
    sendSuccess(res, setting, 'Setting updated');
});

const deleteSetting = asyncHandler(async (req, res) => {
    const setting = await SiteSetting.findByIdAndDelete(req.params.id);
    if (!setting) throw ApiError.notFound('Setting not found');
    await audit(req, 'delete', 'site_setting', req.params.id, `Deleted setting: ${setting.key}`);
    sendSuccess(res, null, 'Setting deleted');
});

const listSystemLogs = asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.level) query.level = req.query.level;
    if (req.query.adminId) query.adminId = req.query.adminId;
    await listDocuments({ req, res, model: SystemLog, key: 'systemLogs', query });
});

router.use(authenticateAdmin);

router.get('/banners', checkPermission('banners.view'), getBanners);
router.post('/banners', checkPermission('banners.create'), createBanner);
router.put('/banners/:id', checkPermission('banners.update'), updateBanner);
router.delete('/banners/:id', checkPermission('banners.delete'), deleteBanner);

router.get('/promotions', checkPermission('promotions.view'), getPromotions);
router.post('/promotions', checkPermission('promotions.create'), createPromotion);
router.put('/promotions/:id', checkPermission('promotions.update'), updatePromotion);
router.delete('/promotions/:id', checkPermission('promotions.delete'), deletePromotion);

router.get('/coupons', checkPermission('promotions.view'), getCoupons);
router.post('/coupons', checkPermission('promotions.create'), createCoupon);
router.put('/coupons/:id', checkPermission('promotions.update'), updateCoupon);
router.delete('/coupons/:id', checkPermission('promotions.delete'), deleteCoupon);

router.get('/articles', checkPermission('articles.view'), getArticles);
router.get('/articles/:id', checkPermission('articles.view'), getArticleById);
router.post('/articles', checkPermission('articles.create'), createArticle);
router.put('/articles/:id', checkPermission('articles.update'), updateArticle);
router.delete('/articles/:id', checkPermission('articles.delete'), deleteArticle);

router.get('/pages', checkPermission('pages.view'), getPages);
router.get('/pages/:slug', checkPermission('pages.view'), getPageBySlug);
router.post('/pages', checkPermission('pages.create'), createPage);
router.put('/pages/:id', checkPermission('pages.update'), updatePage);
router.delete('/pages/:id', checkPermission('pages.delete'), deletePage);

router.get('/reviews', checkPermission('reports.view'), getReviews);
router.put('/reviews/:id', checkPermission('reports.view'), updateReview);
router.delete('/reviews/:id', checkPermission('reports.view'), deleteReview);

router.get('/contacts', checkPermission('reports.view'), listContacts);
router.put('/contacts/:id', checkPermission('reports.view'), updateContact);

router.get('/feedback', checkPermission('reports.view'), listFeedback);
router.put('/feedback/:id', checkPermission('reports.view'), updateFeedback);

router.get('/complaints', checkPermission('reports.view'), listComplaints);
router.put('/complaints/:id', checkPermission('reports.view'), updateComplaint);

router.get('/returns', checkPermission('refunds.view'), listReturns);
router.put('/returns/:id', checkPermission('refunds.process'), updateReturn);

router.get('/refunds', checkPermission('refunds.view'), listRefunds);
router.put('/refunds/:id', checkPermission('refunds.process'), updateRefund);

router.get('/reports', checkPermission('reports.view'), listReports);
router.put('/reports/:id', checkPermission('reports.view'), updateReport);

router.get('/payments', checkPermission('reports.view'), listPayments);
router.get('/settlements', checkPermission('reports.view'), listSettlements);
router.put('/settlements/:id', checkPermission('reports.view'), updateSettlement);

router.get('/settings', checkPermission('settings.view'), listSettings);
router.post('/settings', checkPermission('settings.update'), upsertSetting);
router.put('/settings/:id', checkPermission('settings.update'), updateSetting);
router.delete('/settings/:id', checkPermission('settings.update'), deleteSetting);

router.get('/system-logs', checkPermission('audit_logs.view'), listSystemLogs);

module.exports = router;
