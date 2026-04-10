const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    description: String,
    logo: String,
    banner: String,
    website: String,
    country: String,
    isVerified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    productCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

brandSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Brand', brandSchema);
