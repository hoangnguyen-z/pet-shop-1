const Permission = require('../models/admin/Permission');
const AdminRole = require('../models/admin/AdminRole');
const ApiError = require('../utils/ApiError');

const checkPermission = (...requiredPermissions) => {
    return async (req, res, next) => {
        try {
            if (!req.admin) {
                throw ApiError.unauthorized('Vui lòng đăng nhập');
            }

            if (req.admin.isSuperAdmin) {
                return next();
            }

            const admin = await AdminRole.findById(req.admin.role._id || req.admin.role)
                .populate('permissions');

            if (!admin) {
                throw ApiError.forbidden('Không tìm thấy vai trò');
            }

            const userPermissions = admin.permissions.map(p => p.code || p.slug);
            const hasAllPermissions = requiredPermissions.every(
                perm => userPermissions.includes(perm)
            );

            if (!hasAllPermissions) {
                throw ApiError.forbidden('Bạn không có quyền thực hiện thao tác này');
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

const checkAnyPermission = (...requiredPermissions) => {
    return async (req, res, next) => {
        try {
            if (!req.admin) {
                throw ApiError.unauthorized('Vui lòng đăng nhập');
            }

            if (req.admin.isSuperAdmin) {
                return next();
            }

            const admin = await AdminRole.findById(req.admin.role._id || req.admin.role)
                .populate('permissions');

            if (!admin) {
                throw ApiError.forbidden('Không tìm thấy vai trò');
            }

            const userPermissions = admin.permissions.map(p => p.code || p.slug);
            const hasAnyPermission = requiredPermissions.some(
                perm => userPermissions.includes(perm)
            );

            if (!hasAnyPermission) {
                throw ApiError.forbidden('Bạn không có quyền thực hiện thao tác này');
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = {
    checkPermission,
    checkAnyPermission
};
