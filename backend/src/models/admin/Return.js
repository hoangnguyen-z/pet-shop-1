const mongoose = require('mongoose');

const RETURN_STATUSES = [
    'return_requested',
    'seller_reviewing',
    'need_more_evidence',
    'seller_approved',
    'seller_rejected',
    'admin_reviewing',
    'return_approved',
    'return_rejected',
    'return_shipping',
    'returned',
    'refunded',
    'closed',
    // Legacy admin statuses kept for old records.
    'pending',
    'approved',
    'rejected',
    'delivered',
    'inspected',
    'rejected_inspection'
];

const returnSchema = new mongoose.Schema({
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
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        name: String,
        quantity: { type: Number, min: 1, default: 1 },
        orderedQuantity: Number,
        price: Number,
        reason: String,
        refundAmount: Number
    }],
    reason: {
        type: String,
        required: true
    },
    description: String,
    resolution: {
        type: String,
        enum: ['refund', 'exchange', 'return_refund'],
        default: 'refund'
    },
    images: [String],
    videos: [String],
    evidence: [{
        type: {
            type: String,
            enum: ['image', 'video', 'link', 'note'],
            default: 'link'
        },
        url: String,
        note: String,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: RETURN_STATUSES,
        default: 'return_requested'
    },
    orderStatusBeforeReturn: String,
    paymentStatusBeforeReturn: String,
    sellerNote: String,
    sellerReviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    sellerReviewedAt: Date,
    adminNote: String,
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    approvedAt: Date,
    returnTracking: {
        carrier: String,
        trackingNumber: String
    },
    inspectedAt: Date,
    inspectionNotes: String,
    refundAmount: Number,
    partialRefundAmount: Number,
    resolvedAt: Date
}, {
    timestamps: true
});

returnSchema.add({
    history: [{
        status: String,
        note: String,
        actorType: {
            type: String,
            enum: ['buyer', 'seller', 'admin', 'system'],
            default: 'system'
        },
        actor: {
            type: mongoose.Schema.Types.ObjectId
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
});

returnSchema.index({ status: 1, createdAt: -1 });
returnSchema.index({ order: 1, status: 1 });
returnSchema.index({ buyer: 1, createdAt: -1 });
returnSchema.index({ shop: 1, createdAt: -1 });

returnSchema.methods.addHistory = function addHistory(status, note, actorType = 'system', actor = null) {
    this.history = this.history || [];
    this.history.push({ status, note, actorType, actor, createdAt: new Date() });
};

module.exports = mongoose.model('Return', returnSchema);
