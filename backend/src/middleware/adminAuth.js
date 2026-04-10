const jwt = require('jsonwebtoken');
const config = require('../config/env');
const Admin = require('../models/admin/Admin');
const AdminRole = require('../models/admin/AdminRole');
const ApiError = require('../utils/ApiError');

const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw ApiError.unauthorized('Vui lòng đăng nhập');
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, config.jwt.adminSecret);
            const admin = await Admin.findById(decoded.id).populate('role');

            if (!admin) {
                throw ApiError.unauthorized('Tài khoản admin không tồn tại');
            }

            if (admin.status === 'inactive') {
                throw ApiError.forbidden('Tài khoản đã bị vô hiệu hóa');
            }

            if (admin.status === 'locked') {
                throw ApiError.forbidden('Tài khoản đã bị khóa. Vui lòng liên hệ super admin');
            }

            req.admin = admin;
            req.admin.id = admin._id;

            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                throw ApiError.unauthorized('Token đã hết hạn');
            }
            if (jwtError.name === 'JsonWebTokenError') {
                throw ApiError.unauthorized('Token không hợp lệ');
            }
            throw jwtError;
        }
    } catch (error) {
        next(error);
    }
};

const authorizeAdminRole = (...roles) => {
    return (req, res, next) => {
        if (!req.admin) {
            return next(ApiError.unauthorized('Vui lòng đăng nhập'));
        }
        if (!roles.includes(req.admin.role.slug)) {
            return next(ApiError.forbidden('Bạn không có quyền truy cập'));
        }
        next();
    };
};

const authorizeAdminPermission = (...permissions) => {
    return async (req, res, next) => {
        try {
            if (!req.admin) {
                return next(ApiError.unauthorized('Vui lòng đăng nhập'));
            }

            const admin = await Admin.findById(req.admin._id).populate({
                path: 'role',
                populate: { path: 'permissions' }
            });

            if (!admin.role) {
                return next(ApiError.forbidden('Tài khoản chưa được gán vai trò'));
            }

            const userPermissions = admin.role.permissions.map(p => p.slug);
            const hasPermission = permissions.every(p => userPermissions.includes(p));

            if (!hasPermission) {
                return next(ApiError.forbidden('Bạn không có quyền thực hiện thao tác này'));
            }

            req.admin = admin;
            next();
        } catch (error) {
            next(error);
        }
    };
};

const optionalAdminAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, config.jwt.adminSecret);
                const admin = await Admin.findById(decoded.id).populate('role');
                if (admin && admin.status === 'active') {
                    req.admin = admin;
                    req.admin.id = admin._id;
                }
            } catch (e) {
                // Ignore invalid token for optional auth
            }
        }
        next();
    } catch (error) {
        next();
    }
};

module.exports = {
    authenticateAdmin,
    authorizeAdminRole,
    authorizeAdminPermission,
    optionalAdminAuth
};
