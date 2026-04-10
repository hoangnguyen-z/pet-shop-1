const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'create',
            'update',
            'delete',
            'login',
            'logout',
            'approve',
            'reject',
            'hide',
            'unhide',
            'lock',
            'unlock',
            'reset_password',
            'change_password',
            'change_status'
        ]
    },
    resource: {
        type: String,
        required: true
    },
    resourceId: mongoose.Schema.Types.ObjectId,
    description: String,
    oldData: mongoose.Schema.Types.Mixed,
    newData: mongoose.Schema.Types.Mixed,
    ip: String,
    userAgent: String,
    metadata: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
});

auditLogSchema.index({ admin: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, action: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
