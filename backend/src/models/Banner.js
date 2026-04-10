const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    subtitle: String,
    image: {
        type: String,
        required: true
    },
    link: String,
    badge: String,
    type: {
        type: String,
        enum: ['primary', 'secondary'],
        default: 'primary'
    },
    backgroundColor: String,
    secondaryColor: String,
    position: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    startDate: Date,
    endDate: Date
}, {
    timestamps: true
});

module.exports = mongoose.model('Banner', bannerSchema);
