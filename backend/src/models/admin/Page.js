const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    content: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['policy', 'about', 'contact', 'faq', 'other'],
        default: 'other'
    },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'published'
    },
    metaTitle: String,
    metaDescription: String,
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Page', pageSchema);
