const mongoose = require('mongoose');
const {
    CARE_SERVICE_APPLICATION_STATUS,
    CARE_SERVICE_LABELS,
    CARE_SERVICE_TYPES
} = require('../config/constants');

const careServiceApplicationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        unique: true
    },
    requestedLabel: {
        type: String,
        enum: Object.values(CARE_SERVICE_LABELS),
        default: CARE_SERVICE_LABELS.STANDARD
    },
    assignedLabel: {
        type: String,
        enum: Object.values(CARE_SERVICE_LABELS),
        default: CARE_SERVICE_LABELS.STANDARD
    },
    facilityName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    serviceDescription: {
        type: String,
        trim: true,
        maxlength: 4000
    },
    serviceTypes: [{
        type: String,
        enum: Object.values(CARE_SERVICE_TYPES)
    }],
    serviceAddress: {
        street: String,
        ward: String,
        district: String,
        city: String,
        fullAddress: String
    },
    hotline: {
        type: String,
        trim: true
    },
    contactEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    operatingHours: {
        open: String,
        close: String,
        notes: String
    },
    supportsHomeService: {
        type: Boolean,
        default: false
    },
    facilityImages: [String],
    businessRegistrationNumber: {
        type: String,
        trim: true,
        maxlength: 120
    },
    businessOwnerName: {
        type: String,
        trim: true,
        maxlength: 160
    },
    qualityCommitment: {
        type: String,
        trim: true,
        maxlength: 4000
    },
    responsibilityCommitment: {
        type: String,
        trim: true,
        maxlength: 4000
    },
    supportingNotes: {
        type: String,
        trim: true,
        maxlength: 4000
    },
    termsAccepted: {
        type: Boolean,
        default: false
    },
    termsAcceptedAt: Date,
    termsVersion: {
        type: String,
        default: 'care-v1'
    },
    legalResponsibilityConfirmed: {
        type: Boolean,
        default: false
    },
    legalResponsibilityConfirmedAt: Date,
    status: {
        type: String,
        enum: Object.values(CARE_SERVICE_APPLICATION_STATUS),
        default: CARE_SERVICE_APPLICATION_STATUS.DRAFT
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
    lastResubmittedAt: Date
}, {
    timestamps: true
});

careServiceApplicationSchema.index({ status: 1, requestedLabel: 1, updatedAt: -1 });
careServiceApplicationSchema.index({ facilityName: 'text', hotline: 'text', contactEmail: 'text' });

module.exports = mongoose.model('CareServiceApplication', careServiceApplicationSchema);
