const mongoose = require('mongoose');

const passwordResetCodeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true
    },
    codeHash: {
        type: String,
        required: true
    },
    purpose: {
        type: String,
        enum: ['password_reset'],
        default: 'password_reset'
    },
    expiresAt: {
        type: Date,
        required: true
    },
    usedAt: {
        type: Date,
        default: null
    },
    attempts: {
        type: Number,
        default: 0,
        min: 0
    },
    maxAttempts: {
        type: Number,
        default: 5,
        min: 1
    },
    requestedIp: String,
    userAgent: String
}, {
    timestamps: true
});

passwordResetCodeSchema.index({ user: 1, purpose: 1, usedAt: 1, createdAt: -1 });
passwordResetCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordResetCode', passwordResetCodeSchema);
