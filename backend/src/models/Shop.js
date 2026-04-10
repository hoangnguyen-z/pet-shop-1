const mongoose = require('mongoose');
const { SHOP_STATUS } = require('../config/constants');

const shopSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Tên cửa hàng là bắt buộc'],
        trim: true,
        maxlength: [200, 'Tên không quá 200 ký tự']
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        maxlength: [2000, 'Mô tả không quá 2000 ký tự']
    },
    logo: String,
    banner: String,
    address: {
        street: String,
        city: String,
        district: String,
        ward: String
    },
    location: {
        latitude: {
            type: Number,
            min: -90,
            max: 90
        },
        longitude: {
            type: Number,
            min: -180,
            max: 180
        },
        googleMapsUrl: String,
        embedUrl: String
    },
    phone: String,
    email: String,
    status: {
        type: String,
        enum: Object.values(SHOP_STATUS),
        default: SHOP_STATUS.PENDING
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviewCount: {
        type: Number,
        default: 0
    },
    followerCount: {
        type: Number,
        default: 0
    },
    productCount: {
        type: Number,
        default: 0
    },
    totalSales: {
        type: Number,
        default: 0
    },
    bankAccount: {
        bankName: String,
        bankAccount: String,
        accountHolder: String
    },
    policies: {
        shipping: String,
        return: String,
        warranty: String
    },
    operatingHours: {
        open: String,
        close: String
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationRequest: {
        requestedAt: Date,
        status: String,
        documents: [String]
    },
    stats: {
        totalOrders: { type: Number, default: 0 },
        completedOrders: { type: Number, default: 0 },
        cancelledOrders: { type: Number, default: 0 },
        pendingOrders: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

shopSchema.index({ owner: 1 });
shopSchema.index({ status: 1 });
shopSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Shop', shopSchema);
