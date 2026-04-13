const mongoose = require('mongoose');
const { SELLER_DOCUMENT_TYPE } = require('../config/constants');

const sellerDocumentSchema = new mongoose.Schema({
    application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SellerApplication',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: Object.values(SELLER_DOCUMENT_TYPE),
        default: SELLER_DOCUMENT_TYPE.OTHER
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

sellerDocumentSchema.index({ application: 1, type: 1 });

module.exports = mongoose.model('SellerDocument', sellerDocumentSchema);
