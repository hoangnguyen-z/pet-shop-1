const crypto = require('crypto');
const { Order, PaymentTransaction } = require('../models');
const ApiError = require('../utils/ApiError');
const {
    ORDER_STATUS,
    PAYMENT_STATUS,
    PAYMENT_METHODS,
    PAYMENT_CHANNELS
} = require('../config/constants');
const { syncOrderState, writeOrderLog } = require('./orderService');
const { sendPaymentVerificationEmail, maskEmail } = require('./mailService');
const { resolveFrontendBaseUrlFromValue } = require('../utils/frontendUrl');

const PAYMENT_EXPIRY_MINUTES = Math.max(Number(process.env.PAYMENT_EXPIRY_MINUTES || 15), 5);
const PAYMENT_CALLBACK_SECRET = process.env.PAYMENT_CALLBACK_SECRET || 'dev-payment-secret';

function normalizePaymentChannel(value) {
    const channel = String(value || '').trim().toLowerCase();
    if (!channel || channel === PAYMENT_CHANNELS.QR) return PAYMENT_CHANNELS.QR;
    if (['bank', 'internet_banking', 'banking'].includes(channel)) return PAYMENT_CHANNELS.INTERNET_BANKING;
    if (['gateway', 'linked_gateway', 'wallet', 'linked'].includes(channel)) return PAYMENT_CHANNELS.LINKED_GATEWAY;
    throw ApiError.badRequest('Kenh thanh toan online khong hop le');
}

function isFinalPaymentStatus(status) {
    return [
        PAYMENT_STATUS.PAID,
        PAYMENT_STATUS.FAILED,
        PAYMENT_STATUS.EXPIRED,
        PAYMENT_STATUS.CANCELLED,
        PAYMENT_STATUS.REFUNDED
    ].includes(status);
}

function generateTransactionCode() {
    const stamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `PAY${stamp}${random}`;
}

function generateCallbackToken() {
    return crypto.randomBytes(18).toString('hex');
}

function generateVerificationCode() {
    return String(crypto.randomInt(100000, 1000000));
}

function requiresVerificationCode(paymentChannel) {
    return [PAYMENT_CHANNELS.INTERNET_BANKING, PAYMENT_CHANNELS.LINKED_GATEWAY].includes(paymentChannel);
}

function buildPaymentContent(order) {
    return `PETPAY ${order.orderNumber}`;
}

function buildQrPayload({ amount, transactionCode, paymentContent }) {
    return [
        'BANK:PET_MARKETPLACE',
        `AMOUNT:${Math.round(amount)}`,
        `CONTENT:${paymentContent}`,
        `REF:${transactionCode}`
    ].join('|');
}

function buildQrImageUrl(qrPayload) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrPayload)}`;
}

function buildPaymentUrl(payment, frontendBaseUrl = '') {
    const baseUrl = resolveFrontendBaseUrlFromValue(frontendBaseUrl);
    return `${baseUrl}/#payment?paymentId=${payment._id}&orderId=${payment.order}&channel=${payment.paymentChannel}`;
}

function resolveTransactionPaymentMethod(order = {}) {
    const method = String(order?.paymentMethod || order?.payment?.method || '').trim().toLowerCase();
    if ([PAYMENT_METHODS.BANK_TRANSFER, PAYMENT_METHODS.VNPAY, PAYMENT_METHODS.MOMO].includes(method)) {
        return method;
    }
    return PAYMENT_METHODS.ONLINE;
}

function appendStatusHistory(payment, status, note) {
    payment.statusHistory = payment.statusHistory || [];
    payment.statusHistory.push({
        status,
        note: note || ''
    });
}

function setAllOrderItemsStatus(order, status) {
    order.items = (order.items || []).map((item) => {
        item.shopStatus = status;
        return item;
    });
}

function assignVerificationCode(payment, order) {
    if (!requiresVerificationCode(payment.paymentChannel)) {
        payment.verificationRequired = false;
        payment.verificationCode = '';
        payment.verificationAttempts = 0;
        payment.verificationVerifiedAt = undefined;
        payment.verificationEmail = '';
        payment.verificationEmailMasked = '';
        payment.verificationSentAt = undefined;
        return;
    }

    payment.verificationRequired = true;
    payment.verificationCode = generateVerificationCode();
    payment.verificationAttempts = 0;
    payment.verificationVerifiedAt = undefined;
}

async function deliverVerificationCode(payment, order) {
    if (!payment.verificationRequired) {
        return payment;
    }

    const buyerEmail = order?.shippingAddress?.email;
    if (!buyerEmail) {
        throw ApiError.badRequest('Don hang chua co email nguoi mua de gui ma xac minh');
    }

    const sent = await sendPaymentVerificationEmail({
        to: buyerEmail,
        verificationCode: payment.verificationCode,
        orderNumber: order?.orderNumber,
        amount: payment.amount,
        expiryMinutes: PAYMENT_EXPIRY_MINUTES
    });

    payment.verificationEmail = sent.sentTo;
    payment.verificationEmailMasked = sent.maskedEmail || maskEmail(sent.sentTo);
    payment.verificationSentAt = new Date();
    appendStatusHistory(payment, PAYMENT_STATUS.PENDING, 'Da gui ma xac minh thanh toan qua email');
    await payment.save();
    return payment;
}

async function syncOrderForWaitingPayment(order, payment) {
    const paymentMethod = payment?.paymentMethod || resolveTransactionPaymentMethod(order);
    syncOrderState(order, {
        orderStatus: ORDER_STATUS.WAITING_PAYMENT,
        paymentMethod,
        paymentStatus: payment.status
    });

    setAllOrderItemsStatus(order, ORDER_STATUS.WAITING_PAYMENT);
    order.payment.paymentId = payment._id;
    order.payment.channel = payment.paymentChannel;
    order.payment.transactionId = payment.transactionCode;
    order.payment.redirectUrl = payment.paymentUrl;
    order.payment.qrCodeUrl = payment.qrImageUrl;
    order.payment.paymentContent = payment.paymentContent;
    order.payment.expiredAt = payment.expiredAt;

    await order.save();
}

async function syncOrderForPaid(order, payment) {
    const paymentMethod = payment?.paymentMethod || resolveTransactionPaymentMethod(order);
    syncOrderState(order, {
        orderStatus: ORDER_STATUS.PAID,
        paymentMethod,
        paymentStatus: PAYMENT_STATUS.PAID
    });

    setAllOrderItemsStatus(order, ORDER_STATUS.PAID);
    order.payment.paymentId = payment._id;
    order.payment.channel = payment.paymentChannel;
    order.payment.transactionId = payment.transactionCode;
    order.payment.redirectUrl = payment.paymentUrl;
    order.payment.qrCodeUrl = payment.qrImageUrl;
    order.payment.paymentContent = payment.paymentContent;
    order.payment.expiredAt = payment.expiredAt;
    order.payment.paidAt = payment.paidAt || new Date();

    order.statusHistory.push({
        status: ORDER_STATUS.PAID,
        note: 'Thanh toan online thanh cong',
        updatedAt: new Date()
    });

    await order.save();
}

async function syncOrderForPendingPayment(order, payment, paymentStatus) {
    const paymentMethod = payment?.paymentMethod || resolveTransactionPaymentMethod(order);
    syncOrderState(order, {
        orderStatus: ORDER_STATUS.WAITING_PAYMENT,
        paymentMethod,
        paymentStatus
    });

    setAllOrderItemsStatus(order, ORDER_STATUS.WAITING_PAYMENT);
    order.payment.paymentId = payment._id;
    order.payment.channel = payment.paymentChannel;
    order.payment.transactionId = payment.transactionCode;
    order.payment.redirectUrl = payment.paymentUrl;
    order.payment.qrCodeUrl = payment.qrImageUrl;
    order.payment.paymentContent = payment.paymentContent;
    order.payment.expiredAt = payment.expiredAt;
    if (paymentStatus !== PAYMENT_STATUS.PAID) {
        order.payment.paidAt = undefined;
    }

    await order.save();
}

async function expirePaymentIfNeeded(payment) {
    if (!payment) return null;

    if (
        [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING].includes(payment.status)
        && payment.expiredAt
        && payment.expiredAt.getTime() <= Date.now()
    ) {
        payment.status = PAYMENT_STATUS.EXPIRED;
        appendStatusHistory(payment, PAYMENT_STATUS.EXPIRED, 'Giao dich het han');
        await payment.save();

        const order = await Order.findById(payment.order);
        if (order) {
            await syncOrderForPendingPayment(order, payment, PAYMENT_STATUS.EXPIRED);
            await writeOrderLog({
                orderId: order._id,
                event: 'payment_expired',
                actorType: 'system',
                message: `Giao dich ${payment.transactionCode} da het han`
            });
        }
    }

    return payment;
}

async function applyPaymentStatus(payment, normalizedStatus, callbackData = {}) {
    await expirePaymentIfNeeded(payment);
    if (isFinalPaymentStatus(payment.status)) {
        return payment;
    }

    payment.status = normalizedStatus;
    payment.callbackData = callbackData;
    if (normalizedStatus === PAYMENT_STATUS.PAID) {
        payment.paidAt = new Date();
        if (payment.verificationRequired) {
            payment.verificationVerifiedAt = new Date();
        }
    }
    if (normalizedStatus === PAYMENT_STATUS.CANCELLED) {
        payment.cancelledAt = new Date();
    }
    appendStatusHistory(payment, normalizedStatus, callbackData?.note || 'Cap nhat thanh toan');
    await payment.save();

    const order = await Order.findById(payment.order);
    if (!order) {
        return payment;
    }

    if (normalizedStatus === PAYMENT_STATUS.PAID) {
        await syncOrderForPaid(order, payment);
        await writeOrderLog({
            orderId: order._id,
            event: 'payment_paid',
            actorType: 'system',
            message: `Thanh toan thanh cong cho giao dich ${payment.transactionCode}`,
            data: callbackData
        });
    } else if ([PAYMENT_STATUS.FAILED, PAYMENT_STATUS.CANCELLED, PAYMENT_STATUS.PROCESSING].includes(normalizedStatus)) {
        await syncOrderForPendingPayment(order, payment, normalizedStatus);
        await writeOrderLog({
            orderId: order._id,
            event: normalizedStatus === PAYMENT_STATUS.PROCESSING
                ? 'payment_processing'
                : normalizedStatus === PAYMENT_STATUS.CANCELLED
                    ? 'payment_cancelled'
                    : 'payment_failed',
            actorType: 'system',
            message: `Cap nhat thanh toan ${normalizedStatus} cho giao dich ${payment.transactionCode}`,
            data: callbackData
        });
    }

    return payment;
}

async function createPaymentTransaction({ order, buyerId, paymentChannel, bankCode = '', frontendBaseUrl = '' }) {
    if (!order) throw ApiError.badRequest('Don hang khong hop le');
    if (String(order.buyer) !== String(buyerId)) {
        throw ApiError.forbidden('Ban khong co quyen tao thanh toan cho don hang nay');
    }
    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
        throw ApiError.badRequest('Don hang nay da duoc thanh toan');
    }
    if (order.status === ORDER_STATUS.CANCELLED) {
        throw ApiError.badRequest('Don hang da bi huy');
    }

    const normalizedChannel = normalizePaymentChannel(paymentChannel);
    const paymentMethod = resolveTransactionPaymentMethod(order);
    const existingTransactions = await PaymentTransaction.find({
        order: order._id,
        status: { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING] }
    }).sort({ createdAt: -1 });

    for (const transaction of existingTransactions) {
        await expirePaymentIfNeeded(transaction);
        if ([PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING].includes(transaction.status)) {
            transaction.paymentMethod = paymentMethod;
            transaction.paymentChannel = normalizedChannel;
            transaction.bankCode = bankCode || transaction.bankCode || '';
            if (normalizedChannel === PAYMENT_CHANNELS.QR) {
                transaction.qrPayload = buildQrPayload({
                    amount: order.finalAmount,
                    transactionCode: transaction.transactionCode,
                    paymentContent: transaction.paymentContent
                });
                transaction.qrImageUrl = buildQrImageUrl(transaction.qrPayload);
            } else {
                transaction.qrPayload = '';
                transaction.qrImageUrl = '';
            }
            assignVerificationCode(transaction, order);
            transaction.paymentUrl = buildPaymentUrl(transaction, frontendBaseUrl);
            await transaction.save();
            await deliverVerificationCode(transaction, order);
            await syncOrderForWaitingPayment(order, transaction);
            return transaction;
        }
    }

    const transactionCode = generateTransactionCode();
    const paymentContent = buildPaymentContent(order);
    const qrPayload = buildQrPayload({
        amount: order.finalAmount,
        transactionCode,
        paymentContent
    });

    const transaction = await PaymentTransaction.create({
        order: order._id,
        buyer: buyerId,
        amount: order.finalAmount,
        paymentMethod,
        paymentChannel: normalizedChannel,
        transactionCode,
        paymentContent,
        qrPayload,
        qrImageUrl: normalizedChannel === PAYMENT_CHANNELS.QR ? buildQrImageUrl(qrPayload) : '',
        callbackToken: generateCallbackToken(),
        expiredAt: new Date(Date.now() + PAYMENT_EXPIRY_MINUTES * 60 * 1000),
        bankCode,
        verificationRequired: requiresVerificationCode(normalizedChannel),
        status: PAYMENT_STATUS.PENDING,
        statusHistory: [{
            status: PAYMENT_STATUS.PENDING,
            note: 'Tao giao dich thanh toan'
        }]
    });

    assignVerificationCode(transaction, order);
    transaction.paymentUrl = buildPaymentUrl(transaction, frontendBaseUrl);
    await transaction.save();
    await deliverVerificationCode(transaction, order);
    await syncOrderForWaitingPayment(order, transaction);

    await writeOrderLog({
        orderId: order._id,
        event: 'payment_created',
        actorType: 'system',
        message: `Tao giao dich ${transaction.transactionCode}`,
        data: {
            paymentId: transaction._id,
            paymentChannel: transaction.paymentChannel,
            amount: transaction.amount
        }
    });

    return transaction;
}

async function findPaymentForBuyer(paymentId, buyerId) {
    const payment = await PaymentTransaction.findById(paymentId).populate('order');
    if (!payment) throw ApiError.notFound('Khong tim thay giao dich thanh toan');
    if (String(payment.buyer) !== String(buyerId)) {
        throw ApiError.forbidden('Ban khong co quyen xem giao dich nay');
    }
    await expirePaymentIfNeeded(payment);
    return payment;
}

function serializePayment(payment) {
    const order = payment.order && typeof payment.order.toObject === 'function'
        ? payment.order.toObject()
        : payment.order;

    return {
        _id: payment._id,
        order_id: order?._id || payment.order,
        order_number: order?.orderNumber,
        buyer_id: payment.buyer,
        amount: payment.amount,
        payment_method: payment.paymentMethod,
        payment_channel: payment.paymentChannel,
        transaction_code: payment.transactionCode,
        payment_content: payment.paymentContent,
        qr_payload: payment.qrPayload,
        qr_image_url: payment.qrImageUrl,
        payment_url: payment.paymentUrl,
        payment_status: payment.status,
        expired_at: payment.expiredAt,
        paid_at: payment.paidAt,
        verification_required: payment.verificationRequired,
        verification_expires_at: payment.expiredAt,
        verification_attempts: payment.verificationAttempts || 0,
        verification_verified_at: payment.verificationVerifiedAt,
        verification_email_masked: payment.verificationEmailMasked || '',
        verification_sent_at: payment.verificationSentAt,
        callback_token: payment.callbackToken,
        bank_code: payment.bankCode,
        callback_data: payment.callbackData,
        status_history: payment.statusHistory || []
    };
}

async function processPaymentCallback({
    paymentId,
    transactionCode,
    callbackToken,
    callbackSecret,
    status,
    callbackData = {}
}) {
    const normalizedStatus = String(status || '').trim().toLowerCase();
    if (![PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED, PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.CANCELLED].includes(normalizedStatus)) {
        throw ApiError.badRequest('Trang thai callback thanh toan khong hop le');
    }

    const payment = paymentId
        ? await PaymentTransaction.findById(paymentId)
        : await PaymentTransaction.findOne({ transactionCode });

    if (!payment) {
        throw ApiError.notFound('Khong tim thay giao dich thanh toan');
    }

    const canUseSecret = callbackSecret && callbackSecret === PAYMENT_CALLBACK_SECRET;
    const canUseToken = callbackToken && callbackToken === payment.callbackToken;
    if (!canUseSecret && !canUseToken) {
        throw ApiError.forbidden('Xac thuc callback thanh toan khong hop le');
    }

    return applyPaymentStatus(payment, normalizedStatus, callbackData);
}

async function checkPaymentStatus(payment, { markProcessing = false } = {}) {
    await expirePaymentIfNeeded(payment);

    if (
        markProcessing
        && payment.status === PAYMENT_STATUS.PENDING
        && payment.expiredAt
        && payment.expiredAt.getTime() > Date.now()
    ) {
        payment.status = PAYMENT_STATUS.PROCESSING;
        payment.checkCount = (payment.checkCount || 0) + 1;
        appendStatusHistory(payment, PAYMENT_STATUS.PROCESSING, 'Nguoi dung kiem tra lai trang thai thanh toan');
        await payment.save();

        const order = await Order.findById(payment.order);
        if (order) {
            await syncOrderForPendingPayment(order, payment, PAYMENT_STATUS.PROCESSING);
        }
    }

    return payment;
}

async function processPaymentVerification({ paymentId, buyerId, verificationCode }) {
    const payment = await findPaymentForBuyer(paymentId, buyerId);

    if (isFinalPaymentStatus(payment.status)) {
        return payment;
    }

    if (!payment.verificationRequired) {
        throw ApiError.badRequest('Giao dich nay khong yeu cau ma xac minh');
    }

    if (!verificationCode) {
        throw ApiError.badRequest('Ma xac minh la bat buoc');
    }

    if (payment.expiredAt && payment.expiredAt.getTime() <= Date.now()) {
        await expirePaymentIfNeeded(payment);
        return payment;
    }

    const normalizedCode = String(verificationCode).trim();
    if (normalizedCode !== String(payment.verificationCode || '').trim()) {
        payment.verificationAttempts = (payment.verificationAttempts || 0) + 1;
        return applyPaymentStatus(payment, PAYMENT_STATUS.FAILED, {
            source: 'verification',
            note: 'Nhap sai ma xac minh thanh toan',
            verification_result: 'invalid',
            verification_attempts: payment.verificationAttempts
        });
    }

    return applyPaymentStatus(payment, PAYMENT_STATUS.PAID, {
        source: 'verification',
        note: 'Xac minh ma thanh toan thanh cong',
        verification_result: 'verified'
    });
}

module.exports = {
    PAYMENT_CALLBACK_SECRET,
    normalizePaymentChannel,
    createPaymentTransaction,
    findPaymentForBuyer,
    serializePayment,
    processPaymentCallback,
    checkPaymentStatus,
    processPaymentVerification,
    expirePaymentIfNeeded
};
