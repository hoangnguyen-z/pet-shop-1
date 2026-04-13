const {
    Shop,
    SellerApplication,
    SellerDocument
} = require('../models');
const {
    SELLER_APPLICATION_STATUS,
    SHOP_STATUS,
    SHOP_VERIFICATION_LEVEL,
    SHOP_LABELS
} = require('../config/constants');

function normalizeSellerLabels(labels = []) {
    const unique = new Set((Array.isArray(labels) ? labels : []).filter(Boolean));
    return Array.from(unique);
}

function resolveVerificationLevel(labels = [], fallback) {
    if (labels.includes(SHOP_LABELS.PETMALL)) return SHOP_VERIFICATION_LEVEL.PETMALL;
    if (labels.includes(SHOP_LABELS.OFFICIAL_BRAND)) return SHOP_VERIFICATION_LEVEL.OFFICIAL_BRAND;
    if (labels.includes(SHOP_LABELS.VERIFIED_SELLER)) return SHOP_VERIFICATION_LEVEL.VERIFIED_SELLER;
    return fallback || SHOP_VERIFICATION_LEVEL.STANDARD;
}

function deriveAccessStatus({ user, application, shop }) {
    if (user?.sellerProfile?.applicationStatus) {
        return user.sellerProfile.applicationStatus;
    }
    if (application?.status) {
        return application.status;
    }
    if (shop?.status === SHOP_STATUS.APPROVED) {
        return SELLER_APPLICATION_STATUS.APPROVED;
    }
    if (shop?.status === SHOP_STATUS.SUSPENDED || shop?.status === SHOP_STATUS.INACTIVE) {
        return SELLER_APPLICATION_STATUS.SUSPENDED;
    }
    if (shop?.status === SHOP_STATUS.PERMANENTLY_BANNED) {
        return SELLER_APPLICATION_STATUS.PERMANENTLY_BANNED;
    }
    return null;
}

async function resolveSellerAccessContext(user) {
    if (!user) {
        return {
            shop: null,
            application: null,
            documents: [],
            sellerAccessStatus: null,
            canAccessSellerCenter: false,
            verificationLevel: null,
            labels: []
        };
    }

    const [shop, application] = await Promise.all([
        Shop.findOne({ owner: user._id }),
        SellerApplication.findOne({ user: user._id })
    ]);

    const documents = application
        ? await SellerDocument.find({ application: application._id }).sort({ createdAt: 1 })
        : [];
    const sellerAccessStatus = deriveAccessStatus({ user, application, shop });
    const labels = normalizeSellerLabels(
        shop?.labels?.length ? shop.labels : (
            application?.assignedLabels?.length
                ? application.assignedLabels
                : user?.sellerProfile?.labels
        )
    );
    const verificationLevel = shop?.verificationLevel
        || application?.verificationLevel
        || user?.sellerProfile?.verificationLevel
        || resolveVerificationLevel(labels);

    const canAccessSellerCenter = Boolean(
        sellerAccessStatus === SELLER_APPLICATION_STATUS.APPROVED
        && shop
        && shop.status === SHOP_STATUS.APPROVED
    );

    return {
        shop,
        application,
        documents,
        sellerAccessStatus,
        canAccessSellerCenter,
        verificationLevel,
        labels
    };
}

module.exports = {
    normalizeSellerLabels,
    resolveVerificationLevel,
    resolveSellerAccessContext
};
