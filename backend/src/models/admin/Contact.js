const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: String,
    subject: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['general', 'support', 'business', 'partnership', 'feedback', 'complaint'],
        default: 'general'
    },
    status: {
        type: String,
        enum: ['new', 'pending', 'processing', 'resolved', 'closed'],
        default: 'new'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    department: {
        type: String,
        enum: ['sales', 'support', 'technical', 'management'],
        default: 'support'
    },
    responses: [{
        message: String,
        respondedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin'
        },
        createdAt: { type: Date, default: Date.now }
    }],
    ip: String,
    userAgent: String
}, {
    timestamps: true
});

contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ type: 1 });

module.exports = mongoose.model('Contact', contactSchema);
