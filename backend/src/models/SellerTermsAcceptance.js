const mongoose = require('mongoose');

const sellerTermsAcceptanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SellerApplication',
        required: true
    },
    accepted: {
        type: Boolean,
        default: false
    },
    acceptedAt: Date,
    termsVersion: {
        type: String,
        default: 'v1'
    },
    legalResponsibilityConfirmed: {
        type: Boolean,
        default: false
    },
    legalResponsibilityConfirmedAt: Date,
    ipAddress: String,
    userAgent: String
}, {
    timestamps: true
});

sellerTermsAcceptanceSchema.index({ user: 1, application: 1 }, { unique: true });

module.exports = mongoose.model('SellerTermsAcceptance', sellerTermsAcceptanceSchema);
