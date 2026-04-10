const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    targetType: {
        type: String,
        enum: ['product', 'review', 'comment', 'shop', 'user'],
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    reason: {
        type: String,
        enum: [
            'spam',
            'fake_product',
            'counterfeit',
            'inappropriate_content',
            'harassment',
            'fraud',
            'intellectual_property',
            'safety',
            'other'
        ],
        required: true
    },
    description: String,
    evidence: [String],
    status: {
        type: String,
        enum: ['pending', 'reviewing', 'valid', 'invalid', 'resolved'],
        default: 'pending'
    },
    handledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    resolution: String,
    actionTaken: String,
    resolvedAt: Date
}, {
    timestamps: true
});

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('Report', reportSchema);
