module.exports = {
    ROLES: {
        GUEST: 'guest',
        BUYER: 'buyer',
        SELLER: 'seller',
        ADMIN: 'admin'
    },
    USER_STATUS: {
        ACTIVE: 'active',
        INACTIVE: 'inactive',
        BANNED: 'banned'
    },
    SHOP_STATUS: {
        PENDING: 'pending',
        APPROVED: 'approved',
        REJECTED: 'rejected',
        INACTIVE: 'inactive',
        SUSPENDED: 'suspended',
        PERMANENTLY_BANNED: 'permanently_banned'
    },
    SELLER_APPLICATION_TYPE: {
        STANDARD: 'standard',
        PETMALL: 'petmall'
    },
    SELLER_APPLICATION_STATUS: {
        DRAFT: 'draft',
        SUBMITTED: 'submitted',
        PENDING_REVIEW: 'pending_review',
        NEED_MORE_INFORMATION: 'need_more_information',
        APPROVED: 'approved',
        REJECTED: 'rejected',
        SUSPENDED: 'suspended',
        PERMANENTLY_BANNED: 'permanently_banned'
    },
    SHOP_VERIFICATION_LEVEL: {
        STANDARD: 'standard',
        VERIFIED_SELLER: 'verified_seller',
        OFFICIAL_BRAND: 'official_brand',
        PETMALL: 'petmall'
    },
    SHOP_LABELS: {
        STANDARD: 'standard',
        VERIFIED_SELLER: 'verified_seller',
        OFFICIAL_BRAND: 'official_brand',
        PETMALL: 'petmall'
    },
    SELLER_DOCUMENT_TYPE: {
        IDENTITY: 'identity_document',
        BUSINESS_LICENSE: 'business_license',
        TAX_CODE: 'tax_code',
        BRAND_AUTHORIZATION: 'brand_authorization',
        SOURCE_OF_GOODS: 'source_of_goods',
        QUALITY_COMMITMENT: 'quality_commitment',
        OPERATING_LICENSE: 'operating_license',
        OTHER: 'other'
    },
    CARE_SERVICE_APPLICATION_STATUS: {
        DRAFT: 'draft',
        SUBMITTED: 'submitted',
        PENDING_REVIEW: 'pending_review',
        NEED_MORE_INFORMATION: 'need_more_information',
        APPROVED: 'approved',
        REJECTED: 'rejected',
        SUSPENDED: 'suspended',
        PERMANENTLY_BANNED: 'permanently_banned'
    },
    CARE_SERVICE_LABELS: {
        STANDARD: 'standard',
        PREMIUM_CARE_PARTNER: 'premium_care_partner'
    },
    CARE_SERVICE_TYPES: {
        BATHING_DRYING: 'bathing_drying',
        GROOMING_SPA: 'grooming_spa',
        NAIL_EAR_HYGIENE: 'nail_ear_hygiene',
        PET_HOTEL: 'pet_hotel',
        PET_BOARDING: 'pet_boarding',
        BASIC_CARE: 'basic_care'
    },
    CARE_SERVICE_DOCUMENT_TYPE: {
        BUSINESS_REGISTRATION: 'business_registration',
        QUALITY_COMMITMENT: 'quality_commitment',
        RESPONSIBILITY_COMMITMENT: 'responsibility_commitment',
        TRAINING_CERTIFICATE: 'training_certificate',
        FACILITY_IMAGE: 'facility_image',
        OTHER: 'other'
    },
    CARE_SERVICE_BOOKING_STATUS: {
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        REJECTED: 'rejected'
    },
    VIOLATION_SEVERITY: {
        NOTICE: 'notice',
        WARNING: 'warning',
        SERIOUS: 'serious',
        CRITICAL: 'critical'
    },
    VIOLATION_STATUS: {
        OPEN: 'open',
        RESOLVED: 'resolved',
        ESCALATED: 'escalated'
    },
    VIOLATION_ACTION: {
        REMINDER: 'reminder',
        WARNING: 'warning',
        HIDE_PRODUCTS: 'hide_products',
        SUSPEND_SHOP: 'suspend_shop',
        LOCK_SELLER: 'lock_seller',
        PERMANENTLY_BAN: 'permanently_ban',
        REPORT_AUTHORITIES: 'report_authorities'
    },
    ORDER_STATUS: {
        WAITING_PAYMENT: 'waiting_payment',
        PAID: 'paid',
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        PREPARING: 'preparing',
        SHIPPING: 'shipping',
        DELIVERED: 'delivered',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        RETURN_PENDING: 'return_pending',
        RETURNED: 'returned'
    },
    PAYMENT_STATUS: {
        UNPAID: 'unpaid',
        PENDING: 'pending',
        PROCESSING: 'processing',
        PAID: 'paid',
        FAILED: 'failed',
        EXPIRED: 'expired',
        CANCELLED: 'cancelled',
        REFUNDED: 'refunded'
    },
    PAYMENT_METHODS: {
        COD: 'cod',
        BANK_TRANSFER: 'bank_transfer',
        ONLINE: 'online',
        VNPAY: 'vnpay',
        MOMO: 'momo'
    },
    PAYMENT_CHANNELS: {
        QR: 'qr',
        INTERNET_BANKING: 'internet_banking',
        LINKED_GATEWAY: 'linked_gateway'
    },
    SHIPPING_METHODS: {
        STANDARD: 'standard',
        EXPRESS: 'express'
    },
    SHIPPING_STATUS: {
        PENDING: 'pending',
        SHIPPING: 'shipping',
        DELIVERED: 'delivered',
        CANCELLED: 'cancelled'
    },
    COUPON_TYPES: {
        PERCENTAGE: 'percentage',
        FIXED: 'fixed'
    },
    COUPON_STATUS: {
        ACTIVE: 'active',
        INACTIVE: 'inactive',
        EXPIRED: 'expired'
    },
    RETURN_STATUS: {
        PENDING: 'pending',
        APPROVED: 'approved',
        REJECTED: 'rejected',
        COMPLETED: 'completed'
    },
    SETTLEMENT_STATUS: {
        PENDING: 'pending',
        PROCESSING: 'processing',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    },
    SELLER_FUND_FLOW_STATUS: {
        UNPAID: 'unpaid',
        PLATFORM_HOLDING: 'platform_holding',
        PENDING_SETTLEMENT: 'pending_settlement',
        SETTLED: 'settled',
        REFUNDED: 'refunded',
        DISPUTED: 'disputed',
        CANCELLED: 'cancelled'
    }
};
