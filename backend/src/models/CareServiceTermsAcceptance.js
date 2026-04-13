const mongoose = require('mongoose');

const careServiceTermsAcceptanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CareServiceApplication',
        required: true
    },
    accepted: {
        type: Boolean,
        default: false
    },
    acceptedAt: Date,
    termsVersion: {
        type: String,
        default: 'care-v1'
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

careServiceTermsAcceptanceSchema.index({ user: 1, application: 1 }, { unique: true });

module.exports = mongoose.model('CareServiceTermsAcceptance', careServiceTermsAcceptanceSchema);
