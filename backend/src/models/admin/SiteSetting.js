const mongoose = require('mongoose');

const siteSettingSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true
    },
    value: mongoose.Schema.Types.Mixed,
    type: {
        type: String,
        enum: ['string', 'number', 'boolean', 'json', 'array'],
        default: 'string'
    },
    group: {
        type: String,
        enum: ['general', 'email', 'sms', 'payment', 'shipping', 'fee', 'limit', 'social', 'seo', 'other'],
        default: 'general'
    },
    label: String,
    description: String,
    isPublic: {
        type: Boolean,
        default: false
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('SiteSetting', siteSettingSchema);
