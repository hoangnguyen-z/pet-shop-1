const mongoose = require('mongoose');
const {
    PAYMENT_STATUS,
    PAYMENT_METHODS,
    PAYMENT_CHANNELS
} = require('../config/constants');

const paymentStatusHistorySchema = new mongoose.Schema({
    status: {
        type: String,
        enum: Object.values(PAYMENT_STATUS),
        required: true
    },
    note: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const paymentTransactionSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        index: true
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: {
        type: String,
        enum: Object.values(PAYMENT_METHODS),
        default: PAYMENT_METHODS.ONLINE
    },
    paymentChannel: {
        type: String,
        enum: Object.values(PAYMENT_CHANNELS),
        required: true
    },
    transactionCode: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    paymentContent: {
        type: String,
        default: ''
    },
    qrPayload: {
        type: String,
        default: ''
    },
    qrImageUrl: {
        type: String,
        default: ''
    },
    paymentUrl: {
        type: String,
        default: ''
    },
    bankCode: {
        type: String,
        default: ''
    },
    verificationRequired: {
        type: Boolean,
        default: false
    },
    verificationCode: {
        type: String,
        default: ''
    },
    verificationAttempts: {
        type: Number,
        default: 0
    },
    verificationVerifiedAt: {
        type: Date
    },
    callbackToken: {
        type: String,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: Object.values(PAYMENT_STATUS),
        default: PAYMENT_STATUS.PENDING,
        index: true
    },
    expiredAt: {
        type: Date,
        required: true
    },
    paidAt: {
        type: Date
    },
    cancelledAt: {
        type: Date
    },
    callbackData: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    checkCount: {
        type: Number,
        default: 0
    },
    statusHistory: {
        type: [paymentStatusHistorySchema],
        default: []
    }
}, {
    timestamps: true
});

paymentTransactionSchema.index({ buyer: 1, createdAt: -1 });
paymentTransactionSchema.index({ order: 1, status: 1 });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
