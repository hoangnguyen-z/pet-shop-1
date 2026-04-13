const mongoose = require('mongoose');
const {
    SELLER_APPLICATION_TYPE,
    SELLER_APPLICATION_STATUS,
    SHOP_LABELS,
    SHOP_VERIFICATION_LEVEL
} = require('../config/constants');

const sellerApplicationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    applicationType: {
        type: String,
        enum: Object.values(SELLER_APPLICATION_TYPE),
        default: SELLER_APPLICATION_TYPE.STANDARD
    },
    requestedLabels: [{
        type: String,
        enum: Object.values(SHOP_LABELS)
    }],
    assignedLabels: [{
        type: String,
        enum: Object.values(SHOP_LABELS)
    }],
    verificationLevel: {
        type: String,
        enum: Object.values(SHOP_VERIFICATION_LEVEL),
        default: SHOP_VERIFICATION_LEVEL.STANDARD
    },
    representativeName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    representativeEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    representativePhone: {
        type: String,
        required: true,
        trim: true
    },
    identityNumber: {
        type: String,
        trim: true
    },
    proposedShopName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    shopDescription: {
        type: String,
        trim: true,
        maxlength: 4000
    },
    shopPhone: {
        type: String,
        trim: true
    },
    shopEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    shopAddress: {
        street: String,
        ward: String,
        district: String,
        city: String,
        fullAddress: String
    },
    goodsCategories: [{
        type: String,
        trim: true
    }],
    legalEntityName: {
        type: String,
        trim: true,
        maxlength: 200
    },
    businessLicenseNumber: {
        type: String,
        trim: true,
        maxlength: 120
    },
    taxCode: {
        type: String,
        trim: true,
        maxlength: 120
    },
    operatingLicenseNumber: {
        type: String,
        trim: true,
        maxlength: 120
    },
    legalRepresentative: {
        type: String,
        trim: true,
        maxlength: 120
    },
    sourceOfGoodsDescription: {
        type: String,
        trim: true,
        maxlength: 4000
    },
    qualityCommitment: {
        type: String,
        trim: true,
        maxlength: 4000
    },
    legalResponsibilityConfirmed: {
        type: Boolean,
        default: false
    },
    legalResponsibilityConfirmedAt: Date,
    termsAccepted: {
        type: Boolean,
        default: false
    },
    termsAcceptedAt: Date,
    termsVersion: {
        type: String,
        default: 'v1'
    },
    status: {
        type: String,
        enum: Object.values(SELLER_APPLICATION_STATUS),
        default: SELLER_APPLICATION_STATUS.DRAFT
    },
    adminNote: {
        type: String,
        trim: true,
        maxlength: 4000
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    reviewedAt: Date,
    submittedAt: Date,
    lastResubmittedAt: Date,
    approvedShop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop'
    }
}, {
    timestamps: true
});

sellerApplicationSchema.index({ status: 1, applicationType: 1, createdAt: -1 });
sellerApplicationSchema.index({ representativeEmail: 1, representativePhone: 1, proposedShopName: 'text' });

module.exports = mongoose.model('SellerApplication', sellerApplicationSchema);
