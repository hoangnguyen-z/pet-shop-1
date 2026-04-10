const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    description: String,
    images: [String],
    paymentMethod: {
        type: String,
        enum: ['vnpay', 'momo', 'cod', 'bank_transfer'],
        required: true
    },
    bankInfo: {
        bankName: String,
        bankAccount: String,
        accountHolder: String
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    approvedAt: Date,
    rejectedReason: String,
    transactionId: String,
    completedAt: Date,
    failureReason: String
}, {
    timestamps: true
});

refundSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Refund', refundSchema);
