const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../../config/env');
const Admin = require('../../models/admin/Admin');
const AdminRole = require('../../models/admin/AdminRole');
const AuditLog = require('../../models/admin/AuditLog');
const { authenticateAdmin } = require('../../middleware/adminAuth');
const { sendSuccess, sendCreated, sendNoContent } = require('../../middleware/responseHandler');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw ApiError.badRequest('Email và mật khẩu là bắt buộc');
    }

    const admin = await Admin.findOne({ email }).select('+password').populate('role');

    if (!admin) {
        throw ApiError.unauthorized('Email hoặc mật khẩu không đúng');
    }

    if (admin.status === 'locked') {
        throw ApiError.forbidden('Tài khoản đã bị khóa. Vui lòng liên hệ super admin');
    }

    if (admin.status === 'inactive') {
        throw ApiError.forbidden('Tài khoản đã bị vô hiệu hóa');
    }

    const isPasswordValid = admin.validatePassword(password);

    if (!isPasswordValid) {
        admin.loginAttempts += 1;
        
        if (admin.loginAttempts >= 5) {
            admin.status = 'locked';
            admin.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        }
        
        await admin.save();
        
        throw ApiError.unauthorized('Email hoặc mật khẩu không đúng');
    }

    if (admin.loginAttempts > 0 || admin.lockedUntil) {
        admin.loginAttempts = 0;
        admin.lockedUntil = null;
        await admin.save();
    }

    admin.lastLogin = new Date();
    await admin.save();

    await AuditLog.create({
        admin: admin._id,
        action: 'login',
        resource: 'admin_auth',
        description: 'Admin login',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    const token = jwt.sign(
        { id: admin._id, email: admin.email, role: admin.role?.code || admin.role?.slug },
        config.jwt.adminSecret,
        { expiresIn: config.jwt.adminExpiresIn }
    );

    sendSuccess(res, {
        token,
        admin: {
            id: admin._id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            isSuperAdmin: admin.isSuperAdmin,
            lastLogin: admin.lastLogin
        }
    }, 'Đăng nhập thành công');
});

const register = asyncHandler(async (req, res) => {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
        throw ApiError.badRequest('Email, mật khẩu và tên là bắt buộc');
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
        throw ApiError.badRequest('Email đã được sử dụng');
    }

    const roleCode = role || 'user_admin';
    const adminRole = await AdminRole.findOne({
        $or: [{ code: roleCode }, { slug: roleCode }]
    });
    if (!adminRole) {
        throw ApiError.badRequest('Vai trò không hợp lệ');
    }

    const admin = new Admin({
        email,
        password,
        name,
        role: adminRole._id,
        isSuperAdmin: false
    });

    await admin.save();

    await AuditLog.create({
        admin: req.admin._id,
        action: 'create',
        resource: 'admin_user',
        resourceId: admin._id,
        description: `Created new admin: ${email}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendCreated(res, {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: adminRole
    }, 'Tạo tài khoản admin thành công');
});

const getProfile = asyncHandler(async (req, res) => {
    const admin = await Admin.findById(req.admin._id).populate({
        path: 'role',
        populate: { path: 'permissions' }
    });

    if (!admin) {
        throw ApiError.notFound('Không tìm thấy tài khoản');
    }

    sendSuccess(res, {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isSuperAdmin: admin.isSuperAdmin,
        status: admin.status,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt
    });
});

const updateProfile = asyncHandler(async (req, res) => {
    const { name, currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin._id).select('+password');

    if (newPassword) {
        if (!currentPassword) {
            throw ApiError.badRequest('Vui lòng nhập mật khẩu hiện tại');
        }

        if (!admin.validatePassword(currentPassword)) {
            throw ApiError.badRequest('Mật khẩu hiện tại không đúng');
        }

        admin.password = newPassword;
    }

    if (name) {
        admin.name = name;
    }

    await admin.save();

    await AuditLog.create({
        admin: admin._id,
        action: 'update',
        resource: 'admin_profile',
        description: 'Updated own profile',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, {
        id: admin._id,
        email: admin.email,
        name: admin.name
    }, 'Cập nhật thông tin thành công');
});

const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw ApiError.badRequest('Mật khẩu hiện tại và mật khẩu mới là bắt buộc');
    }

    if (newPassword.length < 8) {
        throw ApiError.badRequest('Mật khẩu mới phải có ít nhất 8 ký tự');
    }

    const admin = await Admin.findById(req.admin._id).select('+password');

    if (!admin.validatePassword(currentPassword)) {
        throw ApiError.badRequest('Mật khẩu hiện tại không đúng');
    }

    admin.password = newPassword;
    await admin.save();

    await AuditLog.create({
        admin: admin._id,
        action: 'change_password',
        resource: 'admin_auth',
        description: 'Changed password',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, null, 'Đổi mật khẩu thành công');
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) throw ApiError.badRequest('Email is required');

    const admin = await Admin.findOne({ email });
    if (!admin) {
        sendSuccess(res, { message: 'If the admin account exists, a reset token has been generated.' });
        return;
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    admin.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    admin.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await admin.save();

    sendSuccess(res, {
        resetToken,
        expiresInMinutes: 30,
        note: 'Demo mode: no email service is configured, so the token is returned here.'
    }, 'Admin reset token generated');
});

const resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) throw ApiError.badRequest('Token and new password are required');
    if (newPassword.length < 8) throw ApiError.badRequest('New password must be at least 8 characters');

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const admin = await Admin.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() }
    });

    if (!admin) throw ApiError.badRequest('Reset token is invalid or expired');

    admin.password = newPassword;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    admin.loginAttempts = 0;
    admin.lockedUntil = null;
    admin.status = 'active';
    await admin.save();

    await AuditLog.create({
        admin: admin._id,
        action: 'reset_password',
        resource: 'admin_auth',
        description: 'Admin reset own password',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, null, 'Admin password reset');
});

const logout = asyncHandler(async (req, res) => {
    await AuditLog.create({
        admin: req.admin._id,
        action: 'logout',
        resource: 'admin_auth',
        description: 'Admin logout',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, null, 'Đăng xuất thành công');
});

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/register', authenticateAdmin, register);
router.get('/profile', authenticateAdmin, getProfile);
router.put('/profile', authenticateAdmin, updateProfile);
router.post('/change-password', authenticateAdmin, changePassword);
router.post('/logout', authenticateAdmin, logout);

module.exports = router;
