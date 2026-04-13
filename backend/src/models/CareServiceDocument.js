const mongoose = require('mongoose');
const { CARE_SERVICE_DOCUMENT_TYPE } = require('../config/constants');

const careServiceDocumentSchema = new mongoose.Schema({
    application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CareServiceApplication',
        required: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: Object.values(CARE_SERVICE_DOCUMENT_TYPE),
        default: CARE_SERVICE_DOCUMENT_TYPE.OTHER
    },
    title: {
        type: String,
        trim: true,
        maxlength: 200
    },
    fileName: {
        type: String,
        trim: true,
        maxlength: 255
    },
    fileUrl: {
        type: String,
        required: true,
        trim: true
    },
    mimeType: {
        type: String,
        trim: true,
        maxlength: 120
    },
    size: Number,
    note: {
        type: String,
        trim: true,
        maxlength: 1000
    }
}, {
    timestamps: true
});

careServiceDocumentSchema.index({ application: 1, type: 1 });

module.exports = mongoose.model('CareServiceDocument', careServiceDocumentSchema);
