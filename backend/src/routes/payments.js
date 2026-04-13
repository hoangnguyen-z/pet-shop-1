const express = require('express');

const router = express.Router();

const { Order } = require('../models');
const { authenticate } = require('../middleware/auth');
const { sendSuccess, sendCreated } = require('../middleware/responseHandler');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { PAYMENT_METHODS } = require('../config/constants');
const {
    PAYMENT_CALLBACK_SECRET,
    normalizePaymentChannel,
    createPaymentTransaction,
    findPaymentForBuyer,
    serializePayment,
    processPaymentCallback,
    checkPaymentStatus,
    processPaymentVerification
} = require('../services/paymentService');

router.post('/callback', asyncHandler(async (req, res) => {
    const payment = await processPaymentCallback({
        paymentId: req.body.payment_id || req.body.paymentId,
        transactionCode: req.body.transaction_code || req.body.transactionCode,
        callbackToken: req.body.callback_token || req.body.callbackToken,
        callbackSecret: req.get('x-payment-secret'),
        status: req.body.status,
        callbackData: {
            ...req.body,
            source: req.body.source || (req.get('x-payment-secret') === PAYMENT_CALLBACK_SECRET ? 'gateway' : 'gateway-ui')
        }
    });

    sendSuccess(res, 'Da xu ly callback thanh toan', serializePayment(payment));
}));

router.use(authenticate);
router.use((req, res, next) => {
    if (req.user.role !== 'buyer') {
        return next(ApiError.forbidden('Chi nguoi mua moi duoc su dung thanh toan online'));
    }
    next();
});

router.post('/create', asyncHandler(async (req, res) => {
    const orderId = req.body.order_id || req.body.orderId;
    if (!orderId) {
        throw ApiError.badRequest('order_id la bat buoc');
    }

    const order = await Order.findOne({
        _id: orderId,
        buyer: req.user.id,
        isDeleted: false
    });

    if (!order) {
        throw ApiError.notFound('Khong tim thay don hang can thanh toan');
    }

    if (![PAYMENT_METHODS.ONLINE, PAYMENT_METHODS.BANK_TRANSFER, PAYMENT_METHODS.VNPAY, PAYMENT_METHODS.MOMO].includes(order.paymentMethod)) {
        order.paymentMethod = PAYMENT_METHODS.ONLINE;
        if (order.payment) {
            order.payment.method = PAYMENT_METHODS.ONLINE;
        }
        await order.save();
    }

    const payment = await createPaymentTransaction({
        order,
        buyerId: req.user.id,
        paymentChannel: normalizePaymentChannel(req.body.payment_channel || req.body.paymentChannel),
        bankCode: req.body.bank_code || req.body.bankCode || ''
    });

    sendCreated(res, 'Tao giao dich thanh toan thanh cong', serializePayment(payment));
}));

router.get('/:id/qr', asyncHandler(async (req, res) => {
    const payment = await findPaymentForBuyer(req.params.id, req.user.id);
    sendSuccess(res, 'Lay ma QR thanh toan thanh cong', {
        payment_id: payment._id,
        order_id: payment.order?._id || payment.order,
        order_number: payment.order?.orderNumber,
        amount: payment.amount,
        qr_payload: payment.qrPayload,
        qr_image_url: payment.qrImageUrl,
        payment_content: payment.paymentContent,
        payment_status: payment.status,
        expired_at: payment.expiredAt,
        paid_at: payment.paidAt
    });
}));

router.get('/:id/status', asyncHandler(async (req, res) => {
    const payment = await findPaymentForBuyer(req.params.id, req.user.id);
    sendSuccess(res, 'Lay trang thai thanh toan thanh cong', serializePayment(payment));
}));

router.post('/:id/check', asyncHandler(async (req, res) => {
    const payment = await findPaymentForBuyer(req.params.id, req.user.id);
    const checked = await checkPaymentStatus(payment, { markProcessing: true });
    sendSuccess(res, 'Da kiem tra lai trang thai giao dich', serializePayment(checked));
}));

router.post('/:id/verify', asyncHandler(async (req, res) => {
    const payment = await processPaymentVerification({
        paymentId: req.params.id,
        buyerId: req.user.id,
        verificationCode: req.body.verification_code || req.body.verificationCode
    });
    sendSuccess(res, 'Da cap nhat trang thai xac minh thanh toan', serializePayment(payment));
}));

module.exports = router;
