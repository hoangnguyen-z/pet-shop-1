const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên sản phẩm là bắt buộc'],
        trim: true,
        maxlength: [500, 'Tên không quá 500 ký tự']
    },
    slug: {
        type: String,
        lowercase: true
    },
    sku: {
        type: String,
        unique: true,
        sparse: true
    },
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
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    subcategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    description: {
        type: String,
        maxlength: [5000, 'Mô tả không quá 5000 ký tự']
    },
    shortDescription: String,
    price: {
        type: Number,
        required: [true, 'Giá là bắt buộc'],
        min: [0, 'Giá không thể âm']
    },
    originalPrice: Number,
    costPrice: Number,
    stock: {
        type: Number,
        default: 0,
        min: 0
    },
    images: [{
        type: String
    }],
    thumbnail: String,
    brand: String,
    unit: {
        type: String,
        default: 'cái'
    },
    weight: Number,
    dimensions: {
        length: Number,
        width: Number,
        height: Number
    },
    tags: [String],
    attributes: [{
        name: String,
        value: String
    }],
    specifications: mongoose.Schema.Types.Mixed,
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
    soldCount: {
        type: Number,
        default: 0
    },
    viewCount: {
        type: Number,
        default: 0
    },
    wishlistCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    variants: [{
        name: String,
        sku: String,
        price: Number,
        stock: Number,
        attributes: [{
            name: String,
            value: String
        }],
        images: [String]
    }],
    flashSale: {
        isActive: { type: Boolean, default: false },
        startTime: Date,
        endTime: Date,
        discountPrice: Number,
        discountPercent: Number
    }
}, {
    timestamps: true
});

productSchema.index({ shop: 1, isActive: 1 });
productSchema.index({ category: 1 });
productSchema.index({ seller: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ soldCount: -1 });
productSchema.index({ rating: -1 });

module.exports = mongoose.model('Product', productSchema);
