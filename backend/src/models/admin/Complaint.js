const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    type: {
        type: String,
        enum: ['product_issue', 'delivery_issue', 'refund', 'seller_issue', 'other'],
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    images: [String],
    status: {
        type: String,
        enum: ['pending', 'reviewing', 'buyer_confirmed', 'seller_replied', 'escalated', 'resolved', 'closed'],
        default: 'pending'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    buyerResponse: {
        message: String,
        updatedAt: Date
    },
    sellerResponse: {
        message: String,
        updatedAt: Date
    },
    adminDecision: {
        decision: String,
        notes: String,
        action: String,
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin'
        },
        resolvedAt: Date
    },
    refundAmount: Number,
    resolvedAt: Date
}, {
    timestamps: true
});

complaintSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
