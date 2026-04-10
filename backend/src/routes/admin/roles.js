const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Admin = require('../../models/admin/Admin');
const AdminRole = require('../../models/admin/AdminRole');
const Permission = require('../../models/admin/Permission');
const AuditLog = require('../../models/admin/AuditLog');
const { authenticateAdmin } = require('../../middleware/adminAuth');
const { checkPermission } = require('../../middleware/permissionGuard');
const { sendSuccess, sendCreated } = require('../../middleware/responseHandler');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const resolvePermissions = async (permissions = []) => {
    if (!Array.isArray(permissions) || permissions.length === 0) return [];

    const ids = permissions.filter(permission => mongoose.Types.ObjectId.isValid(permission));
    const codes = permissions.filter(permission => !mongoose.Types.ObjectId.isValid(permission));

    const docs = await Permission.find({
        $or: [
            ids.length ? { _id: { $in: ids } } : null,
            codes.length ? { code: { $in: codes } } : null,
            codes.length ? { slug: { $in: codes } } : null
        ].filter(Boolean)
    });

    return docs.map(doc => doc._id);
};

const getAllRoles = asyncHandler(async (req, res) => {
    const roles = await AdminRole.find()
        .populate('permissions', 'name code slug group')
        .sort({ isSystem: -1, createdAt: 1 });

    sendSuccess(res, roles);
});

const getRoleById = asyncHandler(async (req, res) => {
    const role = await AdminRole.findById(req.params.id)
        .populate('permissions', 'name code slug group description');

    if (!role) {
        throw ApiError.notFound('Role not found');
    }

    sendSuccess(res, role);
});

const createRole = asyncHandler(async (req, res) => {
    const { name, code, slug, description, permissions, isActive } = req.body;
    const roleCode = code || slug;

    if (!name || !roleCode) {
        throw ApiError.badRequest('Name and code are required');
    }

    const existingRole = await AdminRole.findOne({
        $or: [{ code: roleCode }, { slug: roleCode }]
    });
    if (existingRole) {
        throw ApiError.badRequest('Role code already exists');
    }

    const role = new AdminRole({
        name,
        code: roleCode,
        slug: roleCode,
        description,
        permissions: await resolvePermissions(permissions),
        isActive: isActive !== false,
        isSystem: false
    });

    await role.save();

    await AuditLog.create({
        admin: req.admin._id,
        action: 'create',
        resource: 'admin_role',
        resourceId: role._id,
        description: `Created role: ${name}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendCreated(res, role, 'Role created');
});

const updateRole = asyncHandler(async (req, res) => {
    const { name, description, permissions, isActive } = req.body;
    const role = await AdminRole.findById(req.params.id);

    if (!role) {
        throw ApiError.notFound('Role not found');
    }

    if (role.isSystem) {
        throw ApiError.forbidden('System roles cannot be edited');
    }

    if (name) role.name = name;
    if (description !== undefined) role.description = description;
    if (permissions) role.permissions = await resolvePermissions(permissions);
    if (isActive !== undefined) role.isActive = isActive;

    await role.save();

    await AuditLog.create({
        admin: req.admin._id,
        action: 'update',
        resource: 'admin_role',
        resourceId: role._id,
        description: `Updated role: ${role.name}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, role, 'Role updated');
});

const deleteRole = asyncHandler(async (req, res) => {
    const role = await AdminRole.findById(req.params.id);

    if (!role) {
        throw ApiError.notFound('Role not found');
    }

    if (role.isSystem) {
        throw ApiError.forbidden('System roles cannot be deleted');
    }

    const adminCount = await Admin.countDocuments({ role: role._id });
    if (adminCount > 0) {
        throw ApiError.badRequest(`${adminCount} admins are using this role`);
    }

    await AdminRole.findByIdAndDelete(req.params.id);

    await AuditLog.create({
        admin: req.admin._id,
        action: 'delete',
        resource: 'admin_role',
        resourceId: req.params.id,
        description: `Deleted role: ${role.name}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });

    sendSuccess(res, null, 'Role deleted');
});

const getAllPermissions = asyncHandler(async (req, res) => {
    const permissions = await Permission.find().sort({ group: 1, name: 1 });

    const groupedPermissions = permissions.reduce((acc, perm) => {
        const group = perm.group || 'system';
        if (!acc[group]) acc[group] = [];
        acc[group].push(perm);
        return acc;
    }, {});

    sendSuccess(res, { permissions, groupedPermissions });
});

router.use(authenticateAdmin);

router.get('/', checkPermission('roles.view'), getAllRoles);
router.get('/permissions', checkPermission('roles.view'), getAllPermissions);
router.get('/:id', checkPermission('roles.view'), getRoleById);
router.post('/', checkPermission('roles.create'), createRole);
router.put('/:id', checkPermission('roles.update'), updateRole);
router.delete('/:id', checkPermission('roles.delete'), deleteRole);

module.exports = router;
