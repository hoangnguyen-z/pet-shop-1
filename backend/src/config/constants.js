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
        INACTIVE: 'inactive'
    },
    ORDER_STATUS: {
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
        PAID: 'paid',
        FAILED: 'failed',
        REFUNDED: 'refunded'
    },
    PAYMENT_METHODS: {
        COD: 'cod',
        BANK_TRANSFER: 'bank_transfer',
        ONLINE: 'online',
        VNPAY: 'vnpay',
        MOMO: 'momo'
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
    }
};
