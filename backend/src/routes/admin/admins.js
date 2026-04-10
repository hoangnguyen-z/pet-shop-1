const express = require('express');
const router = express.Router();
const Admin = require('../../models/admin/Admin');
const AdminRole = require('../../models/admin/AdminRole');
const AuditLog = require('../../models/admin/AuditLog');
const { authenticateAdmin } = require('../../middleware/adminAuth');
const { checkPermission } = require('../../middleware/permissionGuard');
const { sendSuccess, sendCreated } = require('../../middleware/responseHandler');
const { buildQuery, getPagination } = require('../../middleware/pagination');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const getAllAdmins = asyncHandler(async (req, res) => {
    const { query, sort, page, limit } = buildQuery(req);
    
    const admins = await Admin.find(query)
        .populate('role', 'name code slug')
        .select('-password')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await Admin.countDocuments(query);

    sendSuccess(res, {
        admins,
        pagination: getPagination(total, page, limit)
    });
});

const getAdminById = asyncHandler(async (req, res) => {
    const admin = await Admin.findById(req.params.id).populate({
        path: 'role',
        populate: { path: 'permissions' }
    }).select('-password');

    if (!admin) {
        throw ApiError.notFound('Không tìm thấy admin');
    }

    sendSuccess(res, admin);
});

const createAdmin = asyncHandler(async (req, res) => {
    const { email, password, name, role: roleCode } = req.body;

    if (!email || !password || !name) {
        throw ApiError.badRequest('Email, mật khẩu và tên là bắt buộc');
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
        throw ApiError.badRequest('Email đã được sử dụng');
    }

    const role = await AdminRole.findOne({
        $or: [{ code: roleCode }, { slug: roleCode }]
    });
    if (!role) {
        throw ApiError.badRequest('Vai trò không hợp lệ');
    }

    const admin = new Admin({
        email,
        password,
        name,
        role: role._id,
        isSuperAdmin: false
    });

    await admin.save();

    await AuditLog.create({
        admin: req.admin._id,
        action: 'create',
        resource: 'admin_user',
        resourceId: admin._id,
        description: `Created admin: ${email}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendCreated(res, {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: role
    }, 'Tạo admin thành công');
});

const updateAdmin = asyncHandler(async (req, res) => {
    const { name, role: roleCode, status } = req.body;
    
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
        throw ApiError.notFound('Không tìm thấy admin');
    }

    if (admin.isSuperAdmin && req.admin._id.toString() !== admin._id.toString()) {
        throw ApiError.forbidden('Không thể chỉnh sửa super admin khác');
    }

    if (name) admin.name = name;
    
    if (roleCode) {
        const role = await AdminRole.findOne({
            $or: [{ code: roleCode }, { slug: roleCode }]
        });
        if (!role) {
            throw ApiError.badRequest('Vai trò không hợp lệ');
        }
        admin.role = role._id;
    }

    if (status && ['active', 'inactive', 'locked'].includes(status)) {
        if (admin.isSuperAdmin && status !== 'active') {
            throw ApiError.forbidden('Không thể khóa super admin');
        }
        admin.status = status;
        
        if (status === 'active') {
            admin.loginAttempts = 0;
            admin.lockedUntil = null;
        }
    }

    await admin.save();

    await AuditLog.create({
        admin: req.admin._id,
        action: 'update',
        resource: 'admin_user',
        resourceId: admin._id,
        description: `Updated admin: ${admin.email}`,
        changes: { name, role: roleCode, status },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        status: admin.status
    }, 'Cập nhật admin thành công');
});

const resetPassword = asyncHandler(async (req, res) => {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
        throw ApiError.badRequest('Mật khẩu mới phải có ít nhất 8 ký tự');
    }

    const admin = await Admin.findById(req.params.id);

    if (!admin) {
        throw ApiError.notFound('Không tìm thấy admin');
    }

    admin.password = newPassword;
    admin.loginAttempts = 0;
    admin.lockedUntil = null;
    await admin.save();

    await AuditLog.create({
        admin: req.admin._id,
        action: 'reset_password',
        resource: 'admin_user',
        resourceId: admin._id,
        description: `Reset password for: ${admin.email}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, null, 'Đặt lại mật khẩu thành công');
});

const deleteAdmin = asyncHandler(async (req, res) => {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
        throw ApiError.notFound('Không tìm thấy admin');
    }

    if (admin.isSuperAdmin) {
        throw ApiError.forbidden('Không thể xóa super admin');
    }

    if (admin._id.toString() === req.admin._id.toString()) {
        throw ApiError.forbidden('Không thể xóa chính mình');
    }

    await Admin.findByIdAndDelete(req.params.id);

    await AuditLog.create({
        admin: req.admin._id,
        action: 'delete',
        resource: 'admin_user',
        resourceId: req.params.id,
        description: `Deleted admin: ${admin.email}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, null, 'Xóa admin thành công');
});

router.use(authenticateAdmin);

router.get('/', checkPermission('admins.view'), getAllAdmins);
router.get('/:id', checkPermission('admins.view'), getAdminById);
router.post('/', checkPermission('admins.create'), createAdmin);
router.put('/:id', checkPermission('admins.update'), updateAdmin);
router.post('/:id/reset-password', checkPermission('admins.update'), resetPassword);
router.delete('/:id', checkPermission('admins.delete'), deleteAdmin);

module.exports = router;
