const mongoose = require('mongoose');
const { CARE_SERVICE_TYPES } = require('../config/constants');

const careServiceOfferingSchema = new mongoose.Schema({
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    serviceType: {
        type: String,
        enum: Object.values(CARE_SERVICE_TYPES),
        required: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    price: {
        type: Number,
        min: 0,
        required: true
    },
    durationMinutes: {
        type: Number,
        min: 15,
        max: 1440,
        required: true
    },
    image: String,
    supportsHomeService: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

careServiceOfferingSchema.index({ shop: 1, serviceType: 1, isActive: 1, updatedAt: -1 });

module.exports = mongoose.model('CareServiceOffering', careServiceOfferingSchema);
