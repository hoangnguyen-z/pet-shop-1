const {
    Shop,
    SellerApplication,
    SellerTermsAcceptance,
    AdminReviewLog,
    ShopStatusHistory,
    ShopVerificationLevel,
    ViolationRecord,
    Product
} = require('../models');
const {
    ROLES,
    SHOP_STATUS,
    SELLER_APPLICATION_STATUS,
    SHOP_LABELS,
    SHOP_VERIFICATION_LEVEL,
    USER_STATUS,
    VIOLATION_ACTION
} = require('../config/constants');
const { normalizeSellerLabels, resolveVerificationLevel } = require('./sellerAccessService');

const makeShopSlug = (name) => {
    const base = String(name || 'shop')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'shop';
    return `${base}-${Date.now().toString(36)}`;
};

function normalizeAddress(address = {}) {
    return {
        street: String(address.street || '').trim(),
        ward: String(address.ward || '').trim(),
        district: String(address.district || '').trim(),
        city: String(address.city || '').trim(),
        fullAddress: String(address.fullAddress || '').trim()
    };
}

function normalizeGoodsCategories(goodsCategories) {
    const source = Array.isArray(goodsCategories)
        ? goodsCategories
        : String(goodsCategories || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    return Array.from(new Set(source));
}

function labelsForApproval(applicationType, labels = []) {
    const normalized = normalizeSellerLabels(labels);
    if (!normalized.length) {
        if (applicationType === 'petmall') {
            return [SHOP_LABELS.PETMALL];
        }
        return [SHOP_LABELS.VERIFIED_SELLER];
    }
    return normalized;
}

async function recordAdminReview({ applicationId, adminId, action, note, payload }) {
    return AdminReviewLog.create({
        application: applicationId,
        admin: adminId,
        action,
        note,
        payload
    });
}

async function recordShopStatusHistory({ shopId, sellerId, status, reason, adminId, changedBySystem = false }) {
    if (!shopId) return null;
    return ShopStatusHistory.create({
        shop: shopId,
        seller: sellerId,
        status,
        reason,
        changedByAdmin: adminId,
        changedBySystem
    });
}

async function upsertTermsAcceptance({ userId, applicationId, accepted, acceptedAt, legalResponsibilityConfirmed, ipAddress, userAgent, termsVersion }) {
    return SellerTermsAcceptance.findOneAndUpdate(
        { user: userId, application: applicationId },
        {
            accepted,
            acceptedAt,
            termsVersion: termsVersion || 'v1',
            legalResponsibilityConfirmed,
            legalResponsibilityConfirmedAt: legalResponsibilityConfirmed ? acceptedAt : undefined,
            ipAddress,
            userAgent
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
}

async function syncUserSellerState(user, { status, applicationType, verificationLevel, labels }) {
    if (!user) return null;
    user.role = ROLES.SELLER;
    user.sellerProfile = {
        ...(user.sellerProfile?.toObject?.() || user.sellerProfile || {}),
        applicationStatus: status,
        applicationType: applicationType || user.sellerProfile?.applicationType,
        verificationLevel: verificationLevel || user.sellerProfile?.verificationLevel,
        labels: normalizeSellerLabels(labels || user.sellerProfile?.labels || []),
        applicationSubmittedAt: (
            status === SELLER_APPLICATION_STATUS.SUBMITTED
            || status === SELLER_APPLICATION_STATUS.PENDING_REVIEW
            || status === SELLER_APPLICATION_STATUS.NEED_MORE_INFORMATION
            || status === SELLER_APPLICATION_STATUS.APPROVED
        ) ? (user.sellerProfile?.applicationSubmittedAt || new Date()) : user.sellerProfile?.applicationSubmittedAt,
        approvedAt: status === SELLER_APPLICATION_STATUS.APPROVED ? new Date() : user.sellerProfile?.approvedAt,
        suspendedAt: status === SELLER_APPLICATION_STATUS.SUSPENDED ? new Date() : user.sellerProfile?.suspendedAt,
        permanentlyBannedAt: status === SELLER_APPLICATION_STATUS.PERMANENTLY_BANNED ? new Date() : user.sellerProfile?.permanentlyBannedAt
    };
    await user.save();
    return user;
}

async function createOrUpdateApprovedShop({ application, user, adminId, labels, note }) {
    const normalizedLabels = labelsForApproval(application.applicationType, labels);
    const verificationLevel = resolveVerificationLevel(normalizedLabels, application.verificationLevel);

    let shop = application.approvedShop
        ? await Shop.findById(application.approvedShop)
        : await Shop.findOne({ owner: user._id });

    const shopData = {
        owner: user._id,
        name: application.proposedShopName,
        description: application.shopDescription || '',
        phone: application.shopPhone || application.representativePhone,
        email: application.shopEmail || application.representativeEmail,
        address: normalizeAddress(application.shopAddress),
        status: SHOP_STATUS.APPROVED,
        verificationLevel,
        labels: normalizedLabels,
        isVerified: true,
        sellerApplication: application._id,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        statusReason: note || ''
    };

    if (!shop) {
        shop = await Shop.create({
            ...shopData,
            slug: makeShopSlug(application.proposedShopName)
        });
    } else {
        Object.assign(shop, shopData);
        if (!shop.slug) {
            shop.slug = makeShopSlug(application.proposedShopName);
        }
        await shop.save();
    }

    await ShopVerificationLevel.findOneAndUpdate(
        { shop: shop._id },
        {
            level: verificationLevel,
            labels: normalizedLabels,
            grantedBy: adminId,
            grantedAt: new Date(),
            note: note || ''
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await recordShopStatusHistory({
        shopId: shop._id,
        sellerId: user._id,
        status: SHOP_STATUS.APPROVED,
        reason: note || 'Ho so mo shop duoc phe duyet',
        adminId
    });

    application.status = SELLER_APPLICATION_STATUS.APPROVED;
    application.reviewedBy = adminId;
    application.reviewedAt = new Date();
    application.adminNote = note || application.adminNote || '';
    application.assignedLabels = normalizedLabels;
    application.verificationLevel = verificationLevel;
    application.approvedShop = shop._id;
    await application.save();

    await syncUserSellerState(user, {
        status: SELLER_APPLICATION_STATUS.APPROVED,
        applicationType: application.applicationType,
        verificationLevel,
        labels: normalizedLabels
    });

    await recordAdminReview({
        applicationId: application._id,
        adminId,
        action: 'approved',
        note,
        payload: {
            verificationLevel,
            labels: normalizedLabels,
            shopId: shop._id
        }
    });

    return { shop, verificationLevel, labels: normalizedLabels };
}

async function updateApplicationStatus({ application, user, adminId, status, note, labels }) {
    application.status = status;
    application.reviewedBy = adminId;
    application.reviewedAt = new Date();
    application.adminNote = note || '';

    if (status === SELLER_APPLICATION_STATUS.APPROVED) {
        return createOrUpdateApprovedShop({ application, user, adminId, labels, note });
    }

    await application.save();
    await syncUserSellerState(user, {
        status,
        applicationType: application.applicationType,
        verificationLevel: application.verificationLevel,
        labels: application.assignedLabels || application.requestedLabels
    });

    if (application.approvedShop) {
        const shop = await Shop.findById(application.approvedShop);
        if (shop) {
            if (status === SELLER_APPLICATION_STATUS.SUSPENDED) {
                shop.status = SHOP_STATUS.SUSPENDED;
            } else if (status === SELLER_APPLICATION_STATUS.PERMANENTLY_BANNED) {
                shop.status = SHOP_STATUS.PERMANENTLY_BANNED;
            } else if (status === SELLER_APPLICATION_STATUS.REJECTED) {
                shop.status = SHOP_STATUS.REJECTED;
            }

            if ([SELLER_APPLICATION_STATUS.SUSPENDED, SELLER_APPLICATION_STATUS.PERMANENTLY_BANNED, SELLER_APPLICATION_STATUS.REJECTED].includes(status)) {
                shop.statusReason = note || '';
                shop.reviewedBy = adminId;
                shop.reviewedAt = new Date();
                await shop.save();
                await recordShopStatusHistory({
                    shopId: shop._id,
                    sellerId: user._id,
                    status: shop.status,
                    reason: note || '',
                    adminId
                });
            }
        }
    }

    await recordAdminReview({
        applicationId: application._id,
        adminId,
        action: status,
        note,
        payload: { labels }
    });

    return { application };
}

async function createViolationAndApplyAction({
    application,
    user,
    adminId,
    violationType,
    severity,
    description,
    actionTaken,
    note
}) {
    const record = await ViolationRecord.create({
        shop: application?.approvedShop || undefined,
        seller: user?._id,
        application: application?._id,
        violationType,
        severity,
        description,
        actionTaken,
        note,
        recordedBy: adminId,
        handledAt: new Date()
    });

    if (application?.approvedShop && actionTaken === VIOLATION_ACTION.HIDE_PRODUCTS) {
        await Product.updateMany(
            { shop: application.approvedShop },
            { $set: { isActive: false } }
        );
    }

    if (actionTaken === VIOLATION_ACTION.SUSPEND_SHOP) {
        await updateApplicationStatus({
            application,
            user,
            adminId,
            status: SELLER_APPLICATION_STATUS.SUSPENDED,
            note: note || description
        });
    }

    if (actionTaken === VIOLATION_ACTION.LOCK_SELLER) {
        user.status = USER_STATUS.BANNED;
        await user.save();
        await updateApplicationStatus({
            application,
            user,
            adminId,
            status: SELLER_APPLICATION_STATUS.SUSPENDED,
            note: note || description
        });
    }

    if (actionTaken === VIOLATION_ACTION.PERMANENTLY_BAN) {
        user.status = USER_STATUS.BANNED;
        await user.save();
        await updateApplicationStatus({
            application,
            user,
            adminId,
            status: SELLER_APPLICATION_STATUS.PERMANENTLY_BANNED,
            note: note || description
        });
    }

    return record;
}

module.exports = {
    normalizeAddress,
    normalizeGoodsCategories,
    labelsForApproval,
    recordAdminReview,
    recordShopStatusHistory,
    upsertTermsAcceptance,
    syncUserSellerState,
    createOrUpdateApprovedShop,
    updateApplicationStatus,
    createViolationAndApplyAction
};
