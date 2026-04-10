const mongoose = require('mongoose');

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
        quantity: Number,
        price: Number,
        reason: String
    }],
    reason: {
        type: String,
        required: true
    },
    description: String,
    images: [String],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'return_shipping', 'delivered', 'inspected', 'refunded', 'rejected_inspection'],
        default: 'pending'
    },
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
    resolvedAt: Date
}, {
    timestamps: true
});

returnSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Return', returnSchema);
