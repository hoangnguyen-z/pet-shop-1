const mongoose = require('mongoose');

const orderLogSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    event: {
        type: String,
        enum: [
            'created',
            'inventory_reserved',
            'inventory_released',
            'status_changed',
            'payment_pending',
            'payment_paid',
            'payment_failed',
            'cancelled',
            'note'
        ],
        required: true
    },
    actorType: {
        type: String,
        enum: ['buyer', 'seller', 'admin', 'system'],
        default: 'system'
    },
    actorId: mongoose.Schema.Types.ObjectId,
    message: {
        type: String,
        required: true
    },
    data: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
});

orderLogSchema.index({ order: 1, createdAt: -1 });

module.exports = mongoose.model('OrderLog', orderLogSchema);
