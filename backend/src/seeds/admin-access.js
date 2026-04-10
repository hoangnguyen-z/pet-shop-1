const mongoose = require('mongoose');
require('dotenv').config();

const Admin = require('../models/admin/Admin');
const AdminRole = require('../models/admin/AdminRole');
const Permission = require('../models/admin/Permission');

const PERMISSIONS = [
    'dashboard.view',
    'admins.view', 'admins.create', 'admins.update', 'admins.delete',
    'roles.view', 'roles.create', 'roles.update', 'roles.delete',
    'users.view', 'users.update', 'users.delete',
    'shops.view', 'shops.approve', 'shops.update', 'shops.delete',
    'products.view', 'products.update', 'products.delete',
    'orders.view', 'orders.update',
    'refunds.view', 'refunds.process',
    'categories.view', 'categories.create', 'categories.update', 'categories.delete',
    'brands.view', 'brands.create', 'brands.update', 'brands.delete',
    'attributes.view', 'attributes.create', 'attributes.update', 'attributes.delete',
    'banners.view', 'banners.create', 'banners.update', 'banners.delete',
    'promotions.view', 'promotions.create', 'promotions.update', 'promotions.delete',
    'articles.view', 'articles.create', 'articles.update', 'articles.delete',
    'pages.view', 'pages.create', 'pages.update', 'pages.delete',
    'reports.view', 'reports.export',
    'audit_logs.view',
    'settings.view', 'settings.update'
];

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pet_marketplace');

    const permissionIds = [];
    for (const code of PERMISSIONS) {
        const permission = await Permission.findOneAndUpdate(
            { $or: [{ code }, { slug: code }] },
            {
                name: code,
                code,
                slug: code,
                group: code.split('.')[0],
                isActive: true
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );
        permissionIds.push(permission._id);
    }

    const role = await AdminRole.findOneAndUpdate(
        { $or: [{ code: 'super_admin' }, { slug: 'super_admin' }] },
        {
            name: 'Super Admin',
            code: 'super_admin',
            slug: 'super_admin',
            description: 'Full system access',
            permissions: permissionIds,
            isSystem: true,
            isActive: true
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    let admin = await Admin.findOne({ email: 'admin@petshop.com' }).select('+password');
    if (!admin) {
        admin = new Admin({ email: 'admin@petshop.com' });
    }

    admin.name = 'Super Admin';
    admin.password = 'admin123';
    admin.role = role._id;
    admin.roles = [role._id];
    admin.isSuperAdmin = true;
    admin.status = 'active';
    admin.loginAttempts = 0;
    admin.lockedUntil = null;
    admin.lockUntil = null;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    await admin.save();

    console.log('Admin access ready: admin@petshop.com / admin123');
    await mongoose.disconnect();
}

seed().catch(async error => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
});
