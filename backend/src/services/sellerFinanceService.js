const {
    ORDER_STATUS,
    PAYMENT_STATUS,
    SETTLEMENT_STATUS,
    SELLER_FUND_FLOW_STATUS
} = require('../config/constants');

const SELLER_PLATFORM_FEE_RATE = Number(process.env.SELLER_PLATFORM_FEE_RATE || 0.05);
const SELLER_SETTLEMENT_BUFFER_DAYS = Math.max(Number(process.env.SELLER_SETTLEMENT_BUFFER_DAYS || 3), 1);

function roundMoney(value) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function getSellerItems(order, sellerId) {
    return (order?.items || []).filter((item) => String(item?.seller) === String(sellerId));
}

function getSellerOrderStatus(order, sellerId) {
    const sellerItems = getSellerItems(order, sellerId);
    return sellerItems[0]?.shopStatus || order?.orderStatus || order?.status || ORDER_STATUS.PENDING;
}

function getSellerGrossAmount(order, sellerId) {
    return roundMoney(getSellerItems(order, sellerId).reduce((sum, item) => {
        return sum + (Number(item?.price || 0) * Number(item?.quantity || 0));
    }, 0));
}

function findSettlementForOrder(orderId, settlements = []) {
    return settlements.find((settlement) => {
        return (settlement?.orders || []).some((entry) => String(entry) === String(orderId) || String(entry?._id) === String(orderId));
    }) || null;
}

function getEffectivePaymentStatus(order, sellerStatus) {
    const currentStatus = order?.paymentStatus || order?.payment?.status || PAYMENT_STATUS.UNPAID;

    if ([PAYMENT_STATUS.PAID, PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.FAILED, PAYMENT_STATUS.EXPIRED, PAYMENT_STATUS.CANCELLED].includes(currentStatus)) {
        return currentStatus;
    }

    if (
        order?.paymentMethod === 'cod'
        && [ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETED].includes(sellerStatus)
    ) {
        return PAYMENT_STATUS.PAID;
    }

    return currentStatus;
}

function buildEstimatedSettlementAt({ order, sellerStatus, paymentStatus, settlement }) {
    if (settlement?.completedAt) {
        return settlement.completedAt;
    }

    if (paymentStatus !== PAYMENT_STATUS.PAID) {
        return null;
    }

    if (![ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETED].includes(sellerStatus)) {
        return null;
    }

    const anchor = order?.updatedAt || order?.createdAt || new Date();
    const expected = new Date(anchor);
    expected.setDate(expected.getDate() + SELLER_SETTLEMENT_BUFFER_DAYS);
    return expected;
}

function getFundFlowStatus({ sellerStatus, paymentStatus, settlement }) {
    if (paymentStatus === PAYMENT_STATUS.REFUNDED || sellerStatus === ORDER_STATUS.RETURNED) {
        return SELLER_FUND_FLOW_STATUS.REFUNDED;
    }

    if (sellerStatus === ORDER_STATUS.RETURN_PENDING) {
        return SELLER_FUND_FLOW_STATUS.DISPUTED;
    }

    if (
        [PAYMENT_STATUS.FAILED, PAYMENT_STATUS.EXPIRED, PAYMENT_STATUS.CANCELLED].includes(paymentStatus)
        || sellerStatus === ORDER_STATUS.CANCELLED
    ) {
        return SELLER_FUND_FLOW_STATUS.CANCELLED;
    }

    if (paymentStatus !== PAYMENT_STATUS.PAID) {
        return SELLER_FUND_FLOW_STATUS.UNPAID;
    }

    if (settlement?.status === SETTLEMENT_STATUS.COMPLETED) {
        return SELLER_FUND_FLOW_STATUS.SETTLED;
    }

    if ([SETTLEMENT_STATUS.PENDING, SETTLEMENT_STATUS.PROCESSING].includes(settlement?.status)) {
        return SELLER_FUND_FLOW_STATUS.PENDING_SETTLEMENT;
    }

    if ([ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETED].includes(sellerStatus)) {
        return SELLER_FUND_FLOW_STATUS.PENDING_SETTLEMENT;
    }

    return SELLER_FUND_FLOW_STATUS.PLATFORM_HOLDING;
}

function buildSellerFinancial(order, sellerId, { settlements = [] } = {}) {
    const sellerStatus = getSellerOrderStatus(order, sellerId);
    const grossAmount = getSellerGrossAmount(order, sellerId);
    const platformFee = roundMoney(grossAmount * SELLER_PLATFORM_FEE_RATE);
    const netAmount = roundMoney(Math.max(grossAmount - platformFee, 0));
    const settlement = findSettlementForOrder(order?._id, settlements);
    const paymentStatus = getEffectivePaymentStatus(order, sellerStatus);
    const fundFlowStatus = getFundFlowStatus({ sellerStatus, paymentStatus, settlement });

    return {
        grossAmount,
        platformFee,
        netAmount,
        paymentMethod: order?.paymentMethod || order?.payment?.method || 'cod',
        paymentChannel: order?.payment?.channel || '',
        paymentStatus,
        fundFlowStatus,
        settlementId: settlement?._id || null,
        settlementStatus: settlement?.status || null,
        estimatedSettlementAt: buildEstimatedSettlementAt({
            order,
            sellerStatus,
            paymentStatus,
            settlement
        }),
        settledAt: settlement?.completedAt || null
    };
}

function enrichSellerOrder(order, sellerId, { settlements = [] } = {}) {
    const plainOrder = typeof order?.toObject === 'function' ? order.toObject() : { ...(order || {}) };
    return {
        ...plainOrder,
        sellerFinancial: buildSellerFinancial(order, sellerId, { settlements })
    };
}

function buildSellerWalletSummary(orders, sellerId, { settlements = [] } = {}) {
    const summary = {
        availableBalance: 0,
        pendingSettlementBalance: 0,
        platformHoldingBalance: 0,
        unpaidBalance: 0,
        refundedBalance: 0,
        disputedBalance: 0,
        totalNetRevenue: 0,
        totalGrossRevenue: 0
    };

    (orders || []).forEach((order) => {
        const financial = buildSellerFinancial(order, sellerId, { settlements });
        summary.totalGrossRevenue += financial.grossAmount;
        summary.totalNetRevenue += financial.netAmount;

        switch (financial.fundFlowStatus) {
            case SELLER_FUND_FLOW_STATUS.SETTLED:
                summary.availableBalance += financial.netAmount;
                break;
            case SELLER_FUND_FLOW_STATUS.PENDING_SETTLEMENT:
                summary.pendingSettlementBalance += financial.netAmount;
                break;
            case SELLER_FUND_FLOW_STATUS.PLATFORM_HOLDING:
                summary.platformHoldingBalance += financial.netAmount;
                break;
            case SELLER_FUND_FLOW_STATUS.UNPAID:
                summary.unpaidBalance += financial.netAmount;
                break;
            case SELLER_FUND_FLOW_STATUS.REFUNDED:
            case SELLER_FUND_FLOW_STATUS.CANCELLED:
                summary.refundedBalance += financial.netAmount;
                break;
            case SELLER_FUND_FLOW_STATUS.DISPUTED:
                summary.disputedBalance += financial.netAmount;
                break;
            default:
                break;
        }
    });

    Object.keys(summary).forEach((key) => {
        summary[key] = roundMoney(summary[key]);
    });

    return summary;
}

module.exports = {
    SELLER_PLATFORM_FEE_RATE,
    SELLER_SETTLEMENT_BUFFER_DAYS,
    getSellerItems,
    getSellerOrderStatus,
    getSellerGrossAmount,
    getEffectivePaymentStatus,
    buildSellerFinancial,
    enrichSellerOrder,
    buildSellerWalletSummary
};
