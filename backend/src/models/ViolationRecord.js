const mongoose = require('mongoose');
const { VIOLATION_SEVERITY, VIOLATION_STATUS, VIOLATION_ACTION } = require('../config/constants');

const violationRecordSchema = new mongoose.Schema({
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop'
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SellerApplication'
    },
    violationType: {
        type: String,
        required: true,
        trim: true,
        maxlength: 160
    },
    severity: {
        type: String,
        enum: Object.values(VIOLATION_SEVERITY),
        default: VIOLATION_SEVERITY.WARNING
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 4000
    },
    actionTaken: {
        type: String,
        enum: Object.values(VIOLATION_ACTION),
        default: VIOLATION_ACTION.WARNING
    },
    status: {
        type: String,
        enum: Object.values(VIOLATION_STATUS),
        default: VIOLATION_STATUS.OPEN
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    handledAt: Date,
    note: {
        type: String,
        trim: true,
        maxlength: 2000
    }
}, {
    timestamps: true
});

violationRecordSchema.index({ shop: 1, seller: 1, createdAt: -1 });
violationRecordSchema.index({ status: 1, severity: 1 });

module.exports = mongoose.model('ViolationRecord', violationRecordSchema);
