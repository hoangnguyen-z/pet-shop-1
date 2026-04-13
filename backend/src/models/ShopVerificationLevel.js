const mongoose = require('mongoose');
const { SHOP_VERIFICATION_LEVEL, SHOP_LABELS } = require('../config/constants');

const shopVerificationLevelSchema = new mongoose.Schema({
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        unique: true
    },
    level: {
        type: String,
        enum: Object.values(SHOP_VERIFICATION_LEVEL),
        default: SHOP_VERIFICATION_LEVEL.STANDARD
    },
    labels: [{
        type: String,
        enum: Object.values(SHOP_LABELS)
    }],
    grantedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    grantedAt: Date,
    note: {
        type: String,
        trim: true,
        maxlength: 1000
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ShopVerificationLevel', shopVerificationLevelSchema);
