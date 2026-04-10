const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    type: {
        type: String,
        enum: ['import', 'export', 'adjustment', 'return', 'order'],
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    stockBefore: Number,
    stockAfter: Number,
    reason: String,
    reference: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'inventoryLog.referenceType'
    },
    referenceType: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
