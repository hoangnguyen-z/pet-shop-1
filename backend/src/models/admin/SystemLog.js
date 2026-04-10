const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
    level: {
        type: String,
        enum: ['error', 'warn', 'info', 'debug'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    stack: String,
    context: mongoose.Schema.Types.Mixed,
    ip: String,
    userAgent: String,
    adminId: mongoose.Schema.Types.ObjectId,
    endpoint: String,
    method: String,
    statusCode: Number,
    responseTime: Number
}, {
    timestamps: true
});

systemLogSchema.index({ level: 1, createdAt: -1 });
systemLogSchema.index({ adminId: 1 });

module.exports = mongoose.model('SystemLog', systemLogSchema);
