const mongoose = require('mongoose');

const careServiceReviewSchema = new mongoose.Schema({
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CareServiceBooking',
        required: true,
        unique: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CareServiceOffering',
        required: true
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    images: [String]
}, {
    timestamps: true
});

careServiceReviewSchema.index({ shop: 1, createdAt: -1 });
careServiceReviewSchema.index({ service: 1, createdAt: -1 });

module.exports = mongoose.model('CareServiceReview', careServiceReviewSchema);
