const AuditLog = require('../models/admin/AuditLog');
const SystemLog = require('../models/admin/SystemLog');

const logAudit = (action, resource) => {
    return async (req, res, next) => {
        const originalSend = res.send;

        res.send = function (body) {
            res.send = originalSend;
            return res.send(body);
        };

        res.on('finish', async () => {
            try {
                if (req.admin && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
                    const logData = {
                        admin: req.admin._id || req.admin.id,
                        action,
                        resource,
                        resourceId: req.params.id || req.body._id,
                        description: `${action} ${resource}`,
                        ipAddress: req.ip || req.connection.remoteAddress,
                        userAgent: req.get('user-agent'),
                        requestBody: sanitizeBody(req.body),
                        responseStatus: res.statusCode,
                        changes: extractChanges(req.body)
                    };

                    if (res.statusCode >= 400) {
                        logData.status = 'failed';
                    } else {
                        logData.status = 'success';
                    }

                    await AuditLog.create(logData);
                }
            } catch (error) {
                console.error('Audit log error:', error);
            }
        });

        next();
    };
};

const logSystemEvent = async (type, message, details = {}) => {
    try {
        await SystemLog.create({
            type,
            message,
            details,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('System log error:', error);
    }
};

const sanitizeBody = (body) => {
    if (!body) return null;
    
    const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token', 'secret'];
    const sanitized = { ...body };
    
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });
    
    return sanitized;
};

const extractChanges = (body) => {
    if (!body) return null;
    
    const trackedFields = ['status', 'role', 'isActive', 'isVerified', 'permissions'];
    const changes = {};
    
    trackedFields.forEach(field => {
        if (body[field] !== undefined) {
            changes[field] = body[field];
        }
    });
    
    return Object.keys(changes).length > 0 ? changes : null;
};

const auditMiddleware = async (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function (body) {
        res.send = originalSend;
        
        const duration = Date.now() - startTime;

        if (req.admin && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            const actionMap = {
                'POST': 'create',
                'PUT': 'update',
                'PATCH': 'update',
                'DELETE': 'delete'
            };

            const resource = req.originalUrl.split('/').pop().replace(/-/g, '_').replace(/\?.*$/, '') || 'resource';

            AuditLog.create({
                admin: req.admin._id || req.admin.id,
                action: actionMap[req.method],
                resource: resource.replace(/s$/, ''),
                resourceId: req.params.id,
                description: `${actionMap[req.method].toUpperCase()} ${resource} - ${req.originalUrl}`,
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get('user-agent'),
                requestBody: sanitizeBody(req.body),
                responseStatus: res.statusCode,
                responseTime: duration,
                status: res.statusCode >= 400 ? 'failed' : 'success'
            }).catch(err => console.error('Audit log error:', err));
        }

        return res.send(body);
    };

    next();
};

module.exports = {
    logAudit,
    logSystemEvent,
    auditMiddleware
};
