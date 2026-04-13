const express = require('express');
const { body } = require('express-validator');

const router = express.Router();

const {
    User,
    SellerApplication,
    SellerDocument
} = require('../models');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { sendSuccess, sendCreated } = require('../middleware/responseHandler');
const ApiError = require('../utils/ApiError');
const {
    ROLES,
    SELLER_APPLICATION_TYPE,
    SELLER_APPLICATION_STATUS,
    SELLER_DOCUMENT_TYPE
} = require('../config/constants');
const { resolveSellerAccessContext } = require('../services/sellerAccessService');
const {
    normalizeAddress,
    normalizeGoodsCategories,
    upsertTermsAcceptance,
    syncUserSellerState
} = require('../services/sellerApplicationWorkflow');

const applicationValidation = [
    body('applicationType')
        .optional()
        .isIn(Object.values(SELLER_APPLICATION_TYPE)).withMessage('Loai shop dang ky khong hop le'),
    body('representativeName')
        .optional()
        .trim()
        .isLength({ max: 120 }).withMessage('Ten nguoi dai dien khong hop le'),
    body('representativeEmail')
        .optional()
        .trim()
        .isEmail().withMessage('Email dai dien khong hop le')
        .normalizeEmail(),
    body('representativePhone')
        .optional()
        .trim()
        .matches(/^[0-9]{10,11}$/).withMessage('So dien thoai dai dien phai co 10-11 chu so'),
    body('proposedShopName')
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage('Ten shop du kien khong qua 200 ky tu'),
    body('shopDocuments')
        .optional()
        .isArray().withMessage('Danh sach giay to khong hop le')
];

function ensureCanEdit(application) {
    if (!application) return;

    const editableStatuses = new Set([
        SELLER_APPLICATION_STATUS.DRAFT,
        SELLER_APPLICATION_STATUS.NEED_MORE_INFORMATION,
        SELLER_APPLICATION_STATUS.REJECTED
    ]);

    if (!editableStatuses.has(application.status)) {
        throw ApiError.badRequest('Ho so hien tai khong the chinh sua o trang thai nay');
    }
}

function buildApplicationInput(req) {
    const body = req.body || {};
    return {
        applicationType: body.applicationType || SELLER_APPLICATION_TYPE.STANDARD,
        representativeName: String(body.representativeName || req.user.name || '').trim(),
        representativeEmail: String(body.representativeEmail || req.user.email || '').trim().toLowerCase(),
        representativePhone: String(body.representativePhone || req.user.phone || '').trim(),
        identityNumber: String(body.identityNumber || '').trim(),
        proposedShopName: String(body.proposedShopName || '').trim(),
        shopDescription: String(body.shopDescription || '').trim(),
        shopPhone: String(body.shopPhone || '').trim(),
        shopEmail: String(body.shopEmail || '').trim().toLowerCase(),
        shopAddress: normalizeAddress(body.shopAddress || {}),
        goodsCategories: normalizeGoodsCategories(body.goodsCategories),
        legalEntityName: String(body.legalEntityName || '').trim(),
        businessLicenseNumber: String(body.businessLicenseNumber || '').trim(),
        taxCode: String(body.taxCode || '').trim(),
        operatingLicenseNumber: String(body.operatingLicenseNumber || '').trim(),
        legalRepresentative: String(body.legalRepresentative || '').trim(),
        sourceOfGoodsDescription: String(body.sourceOfGoodsDescription || '').trim(),
        qualityCommitment: String(body.qualityCommitment || '').trim(),
        termsAccepted: Boolean(body.termsAccepted),
        termsAcceptedAt: body.termsAccepted ? new Date() : undefined,
        termsVersion: String(body.termsVersion || 'v1').trim(),
        legalResponsibilityConfirmed: Boolean(body.legalResponsibilityConfirmed),
        legalResponsibilityConfirmedAt: body.legalResponsibilityConfirmed ? new Date() : undefined
    };
}

async function replaceDocuments(applicationId, userId, shopDocuments = []) {
    await SellerDocument.deleteMany({ application: applicationId });

    const validDocuments = (Array.isArray(shopDocuments) ? shopDocuments : [])
        .filter((item) => item && item.fileUrl)
        .map((item) => ({
            application: applicationId,
            user: userId,
            type: Object.values(SELLER_DOCUMENT_TYPE).includes(item.type) ? item.type : SELLER_DOCUMENT_TYPE.OTHER,
            title: String(item.title || '').trim(),
            fileName: String(item.fileName || '').trim(),
            fileUrl: String(item.fileUrl || '').trim(),
            mimeType: String(item.mimeType || '').trim(),
            size: Number(item.size || 0) || undefined,
            note: String(item.note || '').trim()
        }));

    if (validDocuments.length) {
        await SellerDocument.insertMany(validDocuments);
    }
}

async function buildResponseForUser(user) {
    const sellerContext = await resolveSellerAccessContext(user);
    return {
        user: user.toJSON(),
        application: sellerContext.application ? sellerContext.application.toJSON() : null,
        documents: sellerContext.documents.map((document) => document.toJSON()),
        shop: sellerContext.shop ? sellerContext.shop.toJSON() : null,
        sellerAccess: {
            status: sellerContext.sellerAccessStatus,
            canAccessSellerCenter: sellerContext.canAccessSellerCenter,
            verificationLevel: sellerContext.verificationLevel,
            labels: sellerContext.labels
        }
    };
}

async function submitApplicationForUser(req, user, existingApplication) {
    const payload = buildApplicationInput(req);

    if (!payload.proposedShopName || !payload.representativeName || !payload.representativeEmail || !payload.representativePhone) {
        throw ApiError.badRequest('Vui long dien day du thong tin co ban cua ho so mo shop');
    }

    if (!payload.termsAccepted || !payload.legalResponsibilityConfirmed) {
        throw ApiError.badRequest('Ban phai dong y dieu khoan va xac nhan trach nhiem phap ly truoc khi gui ho so');
    }

    const isResubmission = Boolean(existingApplication && [
        SELLER_APPLICATION_STATUS.NEED_MORE_INFORMATION,
        SELLER_APPLICATION_STATUS.REJECTED
    ].includes(existingApplication.status));

    if (existingApplication) {
        ensureCanEdit(existingApplication);
    }

    const application = await SellerApplication.findOneAndUpdate(
        { user: user._id },
        {
            ...payload,
            user: user._id,
            submittedAt: existingApplication?.submittedAt || new Date(),
            lastResubmittedAt: isResubmission ? new Date() : existingApplication?.lastResubmittedAt,
            status: SELLER_APPLICATION_STATUS.SUBMITTED
        },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    await replaceDocuments(application._id, user._id, req.body.shopDocuments);
    await upsertTermsAcceptance({
        userId: user._id,
        applicationId: application._id,
        accepted: true,
        acceptedAt: payload.termsAcceptedAt || new Date(),
        legalResponsibilityConfirmed: payload.legalResponsibilityConfirmed,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        termsVersion: payload.termsVersion
    });
    await syncUserSellerState(user, {
        status: SELLER_APPLICATION_STATUS.SUBMITTED,
        applicationType: application.applicationType,
        verificationLevel: application.verificationLevel,
        labels: application.assignedLabels || application.requestedLabels
    });

    return application;
}

router.use(authenticate);

router.get('/me', async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            throw ApiError.notFound('Nguoi dung khong ton tai');
        }

        const payload = await buildResponseForUser(user);
        sendSuccess(res, 'Lay ho so mo shop thanh cong', payload);
    } catch (error) {
        next(error);
    }
});

router.put('/me', applicationValidation, validate, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            throw ApiError.notFound('Nguoi dung khong ton tai');
        }

        if (user.role === ROLES.ADMIN) {
            throw ApiError.forbidden('Tai khoan admin khong the dang ky mo shop');
        }

        let application = await SellerApplication.findOne({ user: user._id });
        ensureCanEdit(application);

        const payload = buildApplicationInput(req);
        if (!payload.proposedShopName) {
            throw ApiError.badRequest('Ten shop du kien la bat buoc');
        }

        const nextStatus = application?.status === SELLER_APPLICATION_STATUS.NEED_MORE_INFORMATION
            ? SELLER_APPLICATION_STATUS.NEED_MORE_INFORMATION
            : (application?.status === SELLER_APPLICATION_STATUS.REJECTED
                ? SELLER_APPLICATION_STATUS.REJECTED
                : SELLER_APPLICATION_STATUS.DRAFT);

        application = await SellerApplication.findOneAndUpdate(
            { user: user._id },
            {
                ...payload,
                user: user._id,
                status: nextStatus
            },
            { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
        );

        await replaceDocuments(application._id, user._id, req.body.shopDocuments);
        await syncUserSellerState(user, {
            status: application.status,
            applicationType: application.applicationType,
            verificationLevel: application.verificationLevel,
            labels: application.assignedLabels || application.requestedLabels
        });

        const responsePayload = await buildResponseForUser(user);
        sendSuccess(res, 'Luu nhap ho so mo shop thanh cong', responsePayload);
    } catch (error) {
        next(error);
    }
});

router.post('/me/submit', applicationValidation, validate, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            throw ApiError.notFound('Nguoi dung khong ton tai');
        }

        if (user.role === ROLES.ADMIN) {
            throw ApiError.forbidden('Tai khoan admin khong the dang ky mo shop');
        }

        const existingApplication = await SellerApplication.findOne({ user: user._id });
        await submitApplicationForUser(req, user, existingApplication);

        const responsePayload = await buildResponseForUser(user);
        sendCreated(res, 'Gui ho so mo shop thanh cong. Ho so cua ban dang cho Admin tiep nhan.', responsePayload);
    } catch (error) {
        next(error);
    }
});

router.post('/me/resubmit', applicationValidation, validate, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            throw ApiError.notFound('Nguoi dung khong ton tai');
        }

        const application = await SellerApplication.findOne({ user: user._id });
        if (!application) {
            throw ApiError.notFound('Ban chua co ho so mo shop');
        }

        if (![SELLER_APPLICATION_STATUS.NEED_MORE_INFORMATION, SELLER_APPLICATION_STATUS.REJECTED].includes(application.status)) {
            throw ApiError.badRequest('Ho so hien tai khong can gui bo sung');
        }

        req.body = {
            ...req.body,
            applicationType: req.body.applicationType || application.applicationType
        };

        await submitApplicationForUser(req, user, application);
        const responsePayload = await buildResponseForUser(user);
        sendSuccess(res, 'Gui lai ho so mo shop thanh cong', responsePayload);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
