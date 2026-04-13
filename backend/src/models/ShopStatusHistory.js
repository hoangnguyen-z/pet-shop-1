const mongoose = require('mongoose');

const shopStatusHistorySchema = new mongoose.Schema({
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },
    reason: {
        type: String,
        trim: true,
        maxlength: 4000
    },
    changedByAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    changedBySystem: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

shopStatusHistorySchema.index({ shop: 1, createdAt: -1 });

module.exports = mongoose.model('ShopStatusHistory', shopStatusHistorySchema);
