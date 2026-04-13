const express = require('express');

const router = express.Router();

const {
    User,
    Shop,
    SellerApplication,
    SellerDocument,
    ViolationRecord,
    AdminReviewLog,
    ShopStatusHistory
} = require('../../models');
const { authenticateAdmin } = require('../../middleware/adminAuth');
const { checkPermission } = require('../../middleware/permissionGuard');
const { sendSuccess } = require('../../middleware/responseHandler');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');
const {
    SELLER_APPLICATION_STATUS,
    VIOLATION_STATUS
} = require('../../config/constants');
const {
    updateApplicationStatus,
    createViolationAndApplyAction,
    recordAdminReview
} = require('../../services/sellerApplicationWorkflow');

function buildApplicationQuery(req) {
    const query = {};
    const search = String(req.query.search || '').trim();

    if (req.query.status) {
        query.status = req.query.status;
    }

    if (req.query.applicationType) {
        query.applicationType = req.query.applicationType;
    }

    if (search) {
        const regex = { $regex: search, $options: 'i' };
        query.$or = [
            { representativeName: regex },
            { representativeEmail: regex },
            { representativePhone: regex },
            { proposedShopName: regex }
        ];
    }

    return query;
}

const listApplications = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 100);
    const skip = (page - 1) * limit;
    const query = buildApplicationQuery(req);

    const [applications, total] = await Promise.all([
        SellerApplication.find(query)
            .populate('user', 'name email phone status sellerProfile')
            .populate('approvedShop', 'name status verificationLevel labels')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit),
        SellerApplication.countDocuments(query)
    ]);

    const withDocumentCount = await Promise.all(applications.map(async (application) => {
        const documentCount = await SellerDocument.countDocuments({ application: application._id });
        return {
            ...application.toObject(),
            documentCount
        };
    }));

    sendSuccess(res, {
        applications: withDocumentCount,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    });
});

const getApplicationDetail = asyncHandler(async (req, res) => {
    const application = await SellerApplication.findById(req.params.id)
        .populate('user', 'name email phone status sellerProfile')
        .populate('approvedShop');

    if (!application) {
        throw ApiError.notFound('Khong tim thay ho so mo shop');
    }

    const [documents, reviewLogs, violations, histories] = await Promise.all([
        SellerDocument.find({ application: application._id }).sort({ createdAt: 1 }),
        AdminReviewLog.find({ application: application._id }).populate('admin', 'name email').sort({ createdAt: -1 }),
        ViolationRecord.find({ application: application._id }).populate('recordedBy', 'name email').sort({ createdAt: -1 }),
        application.approvedShop
            ? ShopStatusHistory.find({ shop: application.approvedShop._id }).populate('changedByAdmin', 'name email').sort({ createdAt: -1 })
            : []
    ]);

    sendSuccess(res, {
        ...application.toObject(),
        documents,
        reviewLogs,
        violations,
        shopStatusHistory: histories
    });
});

async function getApplicationAndUser(applicationId) {
    const application = await SellerApplication.findById(applicationId).populate('user');
    if (!application) {
        throw ApiError.notFound('Khong tim thay ho so mo shop');
    }

    const user = await User.findById(application.user?._id || application.user);
    if (!user) {
        throw ApiError.notFound('Khong tim thay nguoi dung cua ho so nay');
    }

    return { application, user };
}

const startReview = asyncHandler(async (req, res) => {
    const { application, user } = await getApplicationAndUser(req.params.id);

    if (![
        SELLER_APPLICATION_STATUS.SUBMITTED,
        SELLER_APPLICATION_STATUS.NEED_MORE_INFORMATION
    ].includes(application.status)) {
        throw ApiError.badRequest('Chi co the chuyen ho so sang trang thai dang xem xet tu ho so da gui hoac can bo sung');
    }

    application.status = SELLER_APPLICATION_STATUS.PENDING_REVIEW;
    application.reviewedBy = req.admin._id;
    application.reviewedAt = new Date();
    application.adminNote = String(req.body.note || '').trim();
    await application.save();

    user.sellerProfile = {
        ...(user.sellerProfile?.toObject?.() || user.sellerProfile || {}),
        applicationStatus: SELLER_APPLICATION_STATUS.PENDING_REVIEW
    };
    await user.save();

    await recordAdminReview({
        applicationId: application._id,
        adminId: req.admin._id,
        action: 'pending_review',
        note: application.adminNote
    });

    sendSuccess(res, 'Da tiep nhan ho so va chuyen sang trang thai dang xem xet', application);
});

const requestMoreInformation = asyncHandler(async (req, res) => {
    const note = String(req.body.note || '').trim();
    if (!note) {
        throw ApiError.badRequest('Admin phai ghi ro noi dung can bo sung');
    }

    const { application, user } = await getApplicationAndUser(req.params.id);
    const result = await updateApplicationStatus({
        application,
        user,
        adminId: req.admin._id,
        status: SELLER_APPLICATION_STATUS.NEED_MORE_INFORMATION,
        note
    });

    sendSuccess(res, 'Da yeu cau nguoi dang ky bo sung ho so', result.application || application);
});

const approveApplication = asyncHandler(async (req, res) => {
    const { application, user } = await getApplicationAndUser(req.params.id);
    const note = String(req.body.note || '').trim();
    const labels = Array.isArray(req.body.labels) ? req.body.labels : [];

    const result = await updateApplicationStatus({
        application,
        user,
        adminId: req.admin._id,
        status: SELLER_APPLICATION_STATUS.APPROVED,
        note,
        labels
    });

    sendSuccess(res, 'Phe duyet ho so mo shop thanh cong', {
        application: await SellerApplication.findById(application._id).populate('approvedShop'),
        shop: result.shop,
        verificationLevel: result.verificationLevel,
        labels: result.labels
    });
});

const rejectApplication = asyncHandler(async (req, res) => {
    const note = String(req.body.note || '').trim();
    if (!note) {
        throw ApiError.badRequest('Admin phai ghi ly do tu choi');
    }

    const { application, user } = await getApplicationAndUser(req.params.id);
    const result = await updateApplicationStatus({
        application,
        user,
        adminId: req.admin._id,
        status: SELLER_APPLICATION_STATUS.REJECTED,
        note
    });

    sendSuccess(res, 'Da tu choi ho so mo shop', result.application || application);
});

const suspendSeller = asyncHandler(async (req, res) => {
    const note = String(req.body.note || '').trim();
    if (!note) {
        throw ApiError.badRequest('Admin phai ghi ly do tam khoa');
    }

    const { application, user } = await getApplicationAndUser(req.params.id);
    const result = await updateApplicationStatus({
        application,
        user,
        adminId: req.admin._id,
        status: SELLER_APPLICATION_STATUS.SUSPENDED,
        note
    });

    sendSuccess(res, 'Da tam khoa seller/shop', result.application || application);
});

const permanentlyBanSeller = asyncHandler(async (req, res) => {
    const note = String(req.body.note || '').trim();
    if (!note) {
        throw ApiError.badRequest('Admin phai ghi ly do cam vinh vien');
    }

    const { application, user } = await getApplicationAndUser(req.params.id);
    const result = await updateApplicationStatus({
        application,
        user,
        adminId: req.admin._id,
        status: SELLER_APPLICATION_STATUS.PERMANENTLY_BANNED,
        note
    });

    sendSuccess(res, 'Da cam vinh vien seller/shop', result.application || application);
});

const addViolationRecord = asyncHandler(async (req, res) => {
    const {
        violationType,
        severity,
        description,
        actionTaken,
        note
    } = req.body;

    if (!violationType || !description) {
        throw ApiError.badRequest('Loai vi pham va mo ta vi pham la bat buoc');
    }

    const { application, user } = await getApplicationAndUser(req.params.id);
    const record = await createViolationAndApplyAction({
        application,
        user,
        adminId: req.admin._id,
        violationType,
        severity,
        description,
        actionTaken,
        note
    });

    sendSuccess(res, 'Da ghi nhan vi pham cua shop', record);
});

const listViolationRecords = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 100);
    const skip = (page - 1) * limit;
    const query = {};

    if (req.query.status) {
        query.status = req.query.status;
    }

    if (req.query.severity) {
        query.severity = req.query.severity;
    }

    const search = String(req.query.search || '').trim();
    if (search) {
        query.$or = [
            { violationType: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    const [violations, total] = await Promise.all([
        ViolationRecord.find(query)
            .populate('shop', 'name status labels verificationLevel')
            .populate('seller', 'name email phone')
            .populate('recordedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        ViolationRecord.countDocuments(query)
    ]);

    sendSuccess(res, {
        violations,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    });
});

const updateViolationStatus = asyncHandler(async (req, res) => {
    const record = await ViolationRecord.findById(req.params.id);
    if (!record) {
        throw ApiError.notFound('Khong tim thay ban ghi vi pham');
    }

    const nextStatus = String(req.body.status || '').trim();
    if (!Object.values(VIOLATION_STATUS).includes(nextStatus)) {
        throw ApiError.badRequest('Trang thai vi pham khong hop le');
    }

    record.status = nextStatus;
    record.note = req.body.note !== undefined ? String(req.body.note || '').trim() : record.note;
    if (nextStatus !== VIOLATION_STATUS.OPEN) {
        record.handledAt = new Date();
    }
    await record.save();

    sendSuccess(res, 'Da cap nhat trang thai vi pham', record);
});

router.use(authenticateAdmin);

router.get('/', checkPermission('shops.view'), listApplications);
router.get('/violations', checkPermission('shops.view'), listViolationRecords);
router.put('/violations/:id/status', checkPermission('shops.update'), updateViolationStatus);
router.get('/:id', checkPermission('shops.view'), getApplicationDetail);
router.post('/:id/start-review', checkPermission('shops.approve'), startReview);
router.post('/:id/request-more-info', checkPermission('shops.approve'), requestMoreInformation);
router.post('/:id/approve', checkPermission('shops.approve'), approveApplication);
router.post('/:id/reject', checkPermission('shops.approve'), rejectApplication);
router.post('/:id/suspend', checkPermission('shops.update'), suspendSeller);
router.post('/:id/ban', checkPermission('shops.update'), permanentlyBanSeller);
router.post('/:id/violations', checkPermission('shops.update'), addViolationRecord);

module.exports = router;
