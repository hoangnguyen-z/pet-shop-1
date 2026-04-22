const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        default: null
    },
    lastMessage: {
        type: String,
        default: ''
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    lastSender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    buyerUnreadCount: {
        type: Number,
        default: 0,
        min: 0
    },
    sellerUnreadCount: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ['active', 'closed'],
        default: 'active'
    }
}, {
    timestamps: true
});

conversationSchema.index({ buyer: 1, seller: 1, shop: 1, product: 1 }, { unique: true });
conversationSchema.index({ buyer: 1, lastMessageAt: -1 });
conversationSchema.index({ seller: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
