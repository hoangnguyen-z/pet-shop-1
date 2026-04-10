const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        unique: true
    },
    excerpt: String,
    content: {
        type: String,
        required: true
    },
    image: String,
    category: {
        type: String,
        enum: ['news', 'care_guide', 'promotion', 'announcement'],
        default: 'news'
    },
    tags: [String],
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'scheduled', 'archived'],
        default: 'draft'
    },
    publishedAt: Date,
    scheduledAt: Date,
    viewCount: {
        type: Number,
        default: 0
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    seoTitle: String,
    seoDescription: String
}, {
    timestamps: true
});

articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ category: 1 });

module.exports = mongoose.model('Article', articleSchema);
