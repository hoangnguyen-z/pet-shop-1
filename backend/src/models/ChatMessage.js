const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    senderRole: {
        type: String,
        enum: ['buyer', 'seller'],
        required: true
    },
    body: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    attachments: [{
        url: String,
        type: {
            type: String,
            enum: ['image', 'file'],
            default: 'image'
        },
        name: String
    }],
    readAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

chatMessageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
