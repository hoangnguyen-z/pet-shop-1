const {
    Shop,
    CareServiceApplication,
    CareServiceTermsAcceptance,
    CareServiceAdminReviewLog
} = require('../models');
const ApiError = require('../utils/ApiError');
const {
    SHOP_STATUS,
    CARE_SERVICE_APPLICATION_STATUS,
    CARE_SERVICE_LABELS,
    CARE_SERVICE_TYPES
} = require('../config/constants');

function normalizeCareAddress(address = {}) {
    return {
        street: String(address.street || '').trim(),
        ward: String(address.ward || '').trim(),
        district: String(address.district || '').trim(),
        city: String(address.city || '').trim(),
        fullAddress: String(address.fullAddress || '').trim()
    };
}

function normalizeCareServiceTypes(serviceTypes) {
    const source = Array.isArray(serviceTypes)
        ? serviceTypes
        : String(serviceTypes || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);

    return Array.from(new Set(source.filter((item) => Object.values(CARE_SERVICE_TYPES).includes(item))));
}

function ensureApprovedShop(shop) {
    if (!shop || shop.status !== SHOP_STATUS.APPROVED) {
        throw ApiError.forbidden('Shop chưa được Admin duyệt nên chưa thể đăng ký dịch vụ chăm sóc');
    }
}

async function upsertCareTermsAcceptance({
    userId,
    shopId,
    applicationId,
    accepted,
    acceptedAt,
    legalResponsibilityConfirmed,
    ipAddress,
    userAgent,
    termsVersion
}) {
    return CareServiceTermsAcceptance.findOneAndUpdate(
        { user: userId, application: applicationId },
        {
            shop: shopId,
            accepted,
            acceptedAt,
            termsVersion: termsVersion || 'care-v1',
            legalResponsibilityConfirmed,
            legalResponsibilityConfirmedAt: legalResponsibilityConfirmed ? acceptedAt : undefined,
            ipAddress,
            userAgent
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
}

async function recordCareAdminReview({ applicationId, shopId, adminId, action, note, payload }) {
    return CareServiceAdminReviewLog.create({
        application: applicationId,
        shop: shopId,
        admin: adminId,
        action,
        note,
        payload
    });
}

async function syncShopCareServiceProfile({ shop, application, adminId, status, note, label }) {
    if (!shop) return null;

    const nextStatus = status || application?.status || CARE_SERVICE_APPLICATION_STATUS.DRAFT;
    const nextLabel = label || application?.assignedLabel || CARE_SERVICE_LABELS.STANDARD;
    const approved = nextStatus === CARE_SERVICE_APPLICATION_STATUS.APPROVED;

    shop.careService = {
        ...(shop.careService?.toObject?.() || shop.careService || {}),
        status: nextStatus,
        isEnabled: approved,
        label: nextLabel,
        facilityName: application?.facilityName || shop.careService?.facilityName || '',
        description: application?.serviceDescription || shop.careService?.description || '',
        serviceTypes: application?.serviceTypes || shop.careService?.serviceTypes || [],
        address: normalizeCareAddress(application?.serviceAddress || shop.careService?.address || {}),
        hotline: application?.hotline || shop.careService?.hotline || '',
        email: application?.contactEmail || shop.careService?.email || '',
        operatingHours: {
            open: application?.operatingHours?.open || shop.careService?.operatingHours?.open || '',
            close: application?.operatingHours?.close || shop.careService?.operatingHours?.close || '',
            notes: application?.operatingHours?.notes || shop.careService?.operatingHours?.notes || ''
        },
        supportsHomeService: Boolean(application?.supportsHomeService ?? shop.careService?.supportsHomeService),
        images: Array.isArray(application?.facilityImages) ? application.facilityImages : (shop.careService?.images || []),
        termsVersion: application?.termsVersion || shop.careService?.termsVersion || 'care-v1',
        termsAcceptedAt: application?.termsAcceptedAt || shop.careService?.termsAcceptedAt,
        approvedAt: approved ? new Date() : shop.careService?.approvedAt,
        reviewedAt: new Date(),
        reviewedBy: adminId || shop.careService?.reviewedBy,
        statusReason: note || ''
    };

    await shop.save();
    return shop;
}

async function updateCareApplicationStatus({ application, shop, adminId, status, note, label }) {
    application.status = status;
    application.reviewedBy = adminId;
    application.reviewedAt = new Date();
    application.adminNote = note || '';

    if (label && Object.values(CARE_SERVICE_LABELS).includes(label)) {
        application.assignedLabel = label;
    }

    await application.save();
    await syncShopCareServiceProfile({
        shop,
        application,
        adminId,
        status,
        note,
        label: application.assignedLabel
    });
    await recordCareAdminReview({
        applicationId: application._id,
        shopId: shop._id,
        adminId,
        action: status,
        note,
        payload: { label: application.assignedLabel }
    });

    return { application, shop };
}

async function buildCareServiceContextForShop(shopId) {
    const [shop, application] = await Promise.all([
        Shop.findById(shopId),
        CareServiceApplication.findOne({ shop: shopId })
    ]);

    return {
        shop,
        application,
        careServiceStatus: application?.status || shop?.careService?.status || null,
        canOperateCareServices: Boolean(
            shop
            && shop.status === SHOP_STATUS.APPROVED
            && shop.careService?.status === CARE_SERVICE_APPLICATION_STATUS.APPROVED
            && shop.careService?.isEnabled
        ),
        careServiceLabel: shop?.careService?.label || application?.assignedLabel || CARE_SERVICE_LABELS.STANDARD
    };
}

module.exports = {
    ensureApprovedShop,
    normalizeCareAddress,
    normalizeCareServiceTypes,
    upsertCareTermsAcceptance,
    recordCareAdminReview,
    syncShopCareServiceProfile,
    updateCareApplicationStatus,
    buildCareServiceContextForShop
};
