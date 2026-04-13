const mongoose = require('mongoose');

const adminReviewLogSchema = new mongoose.Schema({
    application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SellerApplication',
        required: true
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    action: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },
    note: {
        type: String,
        trim: true,
        maxlength: 4000
    },
    payload: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

adminReviewLogSchema.index({ application: 1, createdAt: -1 });

module.exports = mongoose.model('AdminReviewLog', adminReviewLogSchema);
