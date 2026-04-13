const express = require('express');

const router = express.Router();

const {
    User,
    Shop,
    CareServiceApplication,
    CareServiceDocument,
    CareServiceAdminReviewLog,
    CareServiceOffering,
    CareServiceBooking,
    CareServiceReview
} = require('../../models');
const { authenticateAdmin } = require('../../middleware/adminAuth');
const { checkPermission } = require('../../middleware/permissionGuard');
const { sendSuccess } = require('../../middleware/responseHandler');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');
const {
    CARE_SERVICE_APPLICATION_STATUS,
    CARE_SERVICE_LABELS
} = require('../../config/constants');
const {
    updateCareApplicationStatus,
    recordCareAdminReview
} = require('../../services/careServiceWorkflow');

function buildApplicationQuery(req) {
    const query = {};

    if (req.query.status) {
        query.status = req.query.status;
    }

    if (req.query.label) {
        query.$or = [
            { requestedLabel: req.query.label },
            { assignedLabel: req.query.label }
        ];
    }

    return query;
}

async function getApplicationAndContext(applicationId) {
    const application = await CareServiceApplication.findById(applicationId)
        .populate('user', 'name email phone status')
        .populate('shop', 'name slug status careService');

    if (!application) {
        throw ApiError.notFound('Không tìm thấy hồ sơ dịch vụ chăm sóc');
    }

    const user = await User.findById(application.user?._id || application.user);
    const shop = await Shop.findById(application.shop?._id || application.shop);

    if (!user || !shop) {
        throw ApiError.notFound('Không tìm thấy người bán hoặc shop của hồ sơ này');
    }

    return { application, user, shop };
}

const listApplications = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 100);
    const skip = (page - 1) * limit;
    const query = buildApplicationQuery(req);
    const search = String(req.query.search || '').trim();

    if (search) {
        const regex = { $regex: search, $options: 'i' };
        const [shopIds, userIds] = await Promise.all([
            Shop.find({ name: regex }).distinct('_id'),
            User.find({
                $or: [
                    { name: regex },
                    { email: regex },
                    { phone: regex }
                ]
            }).distinct('_id')
        ]);

        query.$and = (query.$and || []).concat([{
            $or: [
                { facilityName: regex },
                { hotline: regex },
                { contactEmail: regex },
                { businessOwnerName: regex },
                ...(shopIds.length ? [{ shop: { $in: shopIds } }] : []),
                ...(userIds.length ? [{ user: { $in: userIds } }] : [])
            ]
        }]);
    }

    const [applications, total] = await Promise.all([
        CareServiceApplication.find(query)
            .populate('user', 'name email phone status')
            .populate('shop', 'name slug status careService')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit),
        CareServiceApplication.countDocuments(query)
    ]);

    const rows = await Promise.all(applications.map(async (application) => {
        const documentCount = await CareServiceDocument.countDocuments({ application: application._id });
        return {
            ...application.toObject(),
            documentCount
        };
    }));

    sendSuccess(res, {
        applications: rows,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    });
});

const getApplicationDetail = asyncHandler(async (req, res) => {
    const { application, shop } = await getApplicationAndContext(req.params.id);

    const [documents, reviewLogs, offerings, bookings, reviews] = await Promise.all([
        CareServiceDocument.find({ application: application._id }).sort({ createdAt: 1 }),
        CareServiceAdminReviewLog.find({ application: application._id }).populate('admin', 'name email').sort({ createdAt: -1 }),
        CareServiceOffering.find({ shop: shop._id }).sort({ updatedAt: -1 }),
        CareServiceBooking.find({ shop: shop._id })
            .populate('buyer', 'name email phone')
            .populate('service', 'name serviceType price durationMinutes')
            .sort({ appointmentDate: -1 })
            .limit(20),
        CareServiceReview.find({ shop: shop._id })
            .populate('buyer', 'name avatar')
            .populate('service', 'name')
            .sort({ createdAt: -1 })
            .limit(20)
    ]);

    sendSuccess(res, {
        ...application.toObject(),
        documents,
        reviewLogs,
        offerings,
        bookings,
        reviews
    });
});

const startReview = asyncHandler(async (req, res) => {
    const { application, shop } = await getApplicationAndContext(req.params.id);

    if (![CARE_SERVICE_APPLICATION_STATUS.SUBMITTED, CARE_SERVICE_APPLICATION_STATUS.NEED_MORE_INFORMATION].includes(application.status)) {
        throw ApiError.badRequest('Chỉ có thể tiếp nhận hồ sơ đã gửi hoặc đang chờ bổ sung');
    }

    application.status = CARE_SERVICE_APPLICATION_STATUS.PENDING_REVIEW;
    application.reviewedBy = req.admin._id;
    application.reviewedAt = new Date();
    application.adminNote = String(req.body.note || '').trim();
    await application.save();

    shop.careService = {
        ...(shop.careService?.toObject?.() || shop.careService || {}),
        status: CARE_SERVICE_APPLICATION_STATUS.PENDING_REVIEW,
        isEnabled: false,
        statusReason: application.adminNote
    };
    await shop.save();

    await recordCareAdminReview({
        applicationId: application._id,
        shopId: shop._id,
        adminId: req.admin._id,
        action: CARE_SERVICE_APPLICATION_STATUS.PENDING_REVIEW,
        note: application.adminNote
    });

    sendSuccess(res, 'Đã tiếp nhận hồ sơ dịch vụ chăm sóc', application);
});

const requestMoreInformation = asyncHandler(async (req, res) => {
    const note = String(req.body.note || '').trim();
    if (!note) {
        throw ApiError.badRequest('Admin phải ghi rõ nội dung cần bổ sung');
    }

    const { application, shop } = await getApplicationAndContext(req.params.id);
    const result = await updateCareApplicationStatus({
        application,
        shop,
        adminId: req.admin._id,
        status: CARE_SERVICE_APPLICATION_STATUS.NEED_MORE_INFORMATION,
        note
    });

    sendSuccess(res, 'Đã yêu cầu người bán bổ sung hồ sơ dịch vụ', result.application);
});

const approveApplication = asyncHandler(async (req, res) => {
    const { application, shop } = await getApplicationAndContext(req.params.id);
    const note = String(req.body.note || '').trim();
    const label = Object.values(CARE_SERVICE_LABELS).includes(req.body.label)
        ? req.body.label
        : CARE_SERVICE_LABELS.STANDARD;

    const result = await updateCareApplicationStatus({
        application,
        shop,
        adminId: req.admin._id,
        status: CARE_SERVICE_APPLICATION_STATUS.APPROVED,
        note,
        label
    });

    sendSuccess(res, 'Phê duyệt dịch vụ chăm sóc thành công', {
        application: result.application,
        shop: result.shop
    });
});

const rejectApplication = asyncHandler(async (req, res) => {
    const note = String(req.body.note || '').trim();
    if (!note) {
        throw ApiError.badRequest('Admin phải ghi lý do từ chối');
    }

    const { application, shop } = await getApplicationAndContext(req.params.id);
    const result = await updateCareApplicationStatus({
        application,
        shop,
        adminId: req.admin._id,
        status: CARE_SERVICE_APPLICATION_STATUS.REJECTED,
        note
    });

    sendSuccess(res, 'Đã từ chối hồ sơ dịch vụ chăm sóc', result.application);
});

const suspendApplication = asyncHandler(async (req, res) => {
    const note = String(req.body.note || '').trim();
    if (!note) {
        throw ApiError.badRequest('Admin phải ghi lý do tạm khóa');
    }

    const { application, shop } = await getApplicationAndContext(req.params.id);
    const result = await updateCareApplicationStatus({
        application,
        shop,
        adminId: req.admin._id,
        status: CARE_SERVICE_APPLICATION_STATUS.SUSPENDED,
        note
    });

    sendSuccess(res, 'Đã tạm khóa dịch vụ chăm sóc của shop', result.application);
});

const permanentlyBanApplication = asyncHandler(async (req, res) => {
    const note = String(req.body.note || '').trim();
    if (!note) {
        throw ApiError.badRequest('Admin phải ghi lý do cấm vĩnh viễn');
    }

    const { application, shop } = await getApplicationAndContext(req.params.id);
    const result = await updateCareApplicationStatus({
        application,
        shop,
        adminId: req.admin._id,
        status: CARE_SERVICE_APPLICATION_STATUS.PERMANENTLY_BANNED,
        note
    });

    sendSuccess(res, 'Đã cấm vĩnh viễn phần dịch vụ chăm sóc của shop', result.application);
});

router.use(authenticateAdmin);

router.get('/applications', checkPermission('shops.view'), listApplications);
router.get('/applications/:id', checkPermission('shops.view'), getApplicationDetail);
router.post('/applications/:id/start-review', checkPermission('shops.approve'), startReview);
router.post('/applications/:id/request-more-info', checkPermission('shops.approve'), requestMoreInformation);
router.post('/applications/:id/approve', checkPermission('shops.approve'), approveApplication);
router.post('/applications/:id/reject', checkPermission('shops.approve'), rejectApplication);
router.post('/applications/:id/suspend', checkPermission('shops.update'), suspendApplication);
router.post('/applications/:id/ban', checkPermission('shops.update'), permanentlyBanApplication);

module.exports = router;
