const mongoose = require('mongoose');
require('dotenv').config();

const Admin = require('../models/admin/Admin');
const AdminRole = require('../models/admin/AdminRole');
const Permission = require('../models/admin/Permission');
const Category = require('../models/Category');

const PERMISSIONS = [
    { name: 'Xem Dashboard', slug: 'dashboard.view', group: 'Dashboard' },
    
    { name: 'Xem Admin', slug: 'admins.view', group: 'Quản lý Admin' },
    { name: 'Tạo Admin', slug: 'admins.create', group: 'Quản lý Admin' },
    { name: 'Sửa Admin', slug: 'admins.update', group: 'Quản lý Admin' },
    { name: 'Xóa Admin', slug: 'admins.delete', group: 'Quản lý Admin' },
    
    { name: 'Xem Vai trò', slug: 'roles.view', group: 'Vai trò & Quyền' },
    { name: 'Tạo Vai trò', slug: 'roles.create', group: 'Vai trò & Quyền' },
    { name: 'Sửa Vai trò', slug: 'roles.update', group: 'Vai trò & Quyền' },
    { name: 'Xóa Vai trò', slug: 'roles.delete', group: 'Vai trò & Quyền' },
    
    { name: 'Xem Người dùng', slug: 'users.view', group: 'Quản lý Người dùng' },
    { name: 'Sửa Người dùng', slug: 'users.update', group: 'Quản lý Người dùng' },
    { name: 'Xóa Người dùng', slug: 'users.delete', group: 'Quản lý Người dùng' },
    
    { name: 'Xem Cửa hàng', slug: 'shops.view', group: 'Quản lý Cửa hàng' },
    { name: 'Duyệt Cửa hàng', slug: 'shops.approve', group: 'Quản lý Cửa hàng' },
    { name: 'Sửa Cửa hàng', slug: 'shops.update', group: 'Quản lý Cửa hàng' },
    { name: 'Xóa Cửa hàng', slug: 'shops.delete', group: 'Quản lý Cửa hàng' },
    
    { name: 'Xem Sản phẩm', slug: 'products.view', group: 'Quản lý Sản phẩm' },
    { name: 'Sửa Sản phẩm', slug: 'products.update', group: 'Quản lý Sản phẩm' },
    { name: 'Xóa Sản phẩm', slug: 'products.delete', group: 'Quản lý Sản phẩm' },
    
    { name: 'Xem Đơn hàng', slug: 'orders.view', group: 'Quản lý Đơn hàng' },
    { name: 'Sửa Đơn hàng', slug: 'orders.update', group: 'Quản lý Đơn hàng' },
    
    { name: 'Xem Hoàn tiền', slug: 'refunds.view', group: 'Hoàn tiền & Đổi trả' },
    { name: 'Xử lý Hoàn tiền', slug: 'refunds.process', group: 'Hoàn tiền & Đổi trả' },
    
    { name: 'Xem Danh mục', slug: 'categories.view', group: 'Danh mục & Thuộc tính' },
    { name: 'Tạo Danh mục', slug: 'categories.create', group: 'Danh mục & Thuộc tính' },
    { name: 'Sửa Danh mục', slug: 'categories.update', group: 'Danh mục & Thuộc tính' },
    { name: 'Xóa Danh mục', slug: 'categories.delete', group: 'Danh mục & Thuộc tính' },
    
    { name: 'Xem Thương hiệu', slug: 'brands.view', group: 'Danh mục & Thuộc tính' },
    { name: 'Tạo Thương hiệu', slug: 'brands.create', group: 'Danh mục & Thuộc tính' },
    { name: 'Sửa Thương hiệu', slug: 'brands.update', group: 'Danh mục & Thuộc tính' },
    { name: 'Xóa Thương hiệu', slug: 'brands.delete', group: 'Danh mục & Thuộc tính' },
    
    { name: 'Xem Thuộc tính', slug: 'attributes.view', group: 'Danh mục & Thuộc tính' },
    { name: 'Tạo Thuộc tính', slug: 'attributes.create', group: 'Danh mục & Thuộc tính' },
    { name: 'Sửa Thuộc tính', slug: 'attributes.update', group: 'Danh mục & Thuộc tính' },
    { name: 'Xóa Thuộc tính', slug: 'attributes.delete', group: 'Danh mục & Thuộc tính' },
    
    { name: 'Xem Banner', slug: 'banners.view', group: 'Nội dung' },
    { name: 'Tạo Banner', slug: 'banners.create', group: 'Nội dung' },
    { name: 'Sửa Banner', slug: 'banners.update', group: 'Nội dung' },
    { name: 'Xóa Banner', slug: 'banners.delete', group: 'Nội dung' },
    
    { name: 'Xem Khuyến mãi', slug: 'promotions.view', group: 'Nội dung' },
    { name: 'Tạo Khuyến mãi', slug: 'promotions.create', group: 'Nội dung' },
    { name: 'Sửa Khuyến mãi', slug: 'promotions.update', group: 'Nội dung' },
    { name: 'Xóa Khuyến mãi', slug: 'promotions.delete', group: 'Nội dung' },
    
    { name: 'Xem Bài viết', slug: 'articles.view', group: 'Nội dung' },
    { name: 'Tạo Bài viết', slug: 'articles.create', group: 'Nội dung' },
    { name: 'Sửa Bài viết', slug: 'articles.update', group: 'Nội dung' },
    { name: 'Xóa Bài viết', slug: 'articles.delete', group: 'Nội dung' },
    
    { name: 'Xem Trang', slug: 'pages.view', group: 'Nội dung' },
    { name: 'Tạo Trang', slug: 'pages.create', group: 'Nội dung' },
    { name: 'Sửa Trang', slug: 'pages.update', group: 'Nội dung' },
    { name: 'Xóa Trang', slug: 'pages.delete', group: 'Nội dung' },
    
    { name: 'Xem Báo cáo', slug: 'reports.view', group: 'Báo cáo' },
    { name: 'Xuất Báo cáo', slug: 'reports.export', group: 'Báo cáo' },
    
    { name: 'Xem Nhật ký', slug: 'audit_logs.view', group: 'Hệ thống' },
    { name: 'Xem Cài đặt', slug: 'settings.view', group: 'Hệ thống' },
    { name: 'Sửa Cài đặt', slug: 'settings.update', group: 'Hệ thống' },
];

const ROLES = [
    {
        name: 'Super Admin',
        slug: 'super_admin',
        description: 'Toàn quyền hệ thống',
        isSystem: true,
        isSuperAdmin: true,
        permissions: PERMISSIONS.map(p => p.slug)
    },
    {
        name: 'Quản lý Người dùng',
        slug: 'user_admin',
        description: 'Quản lý người dùng và cửa hàng',
        isSystem: true,
        permissions: [
            'dashboard.view',
            'users.view', 'users.update',
            'shops.view', 'shops.approve', 'shops.update',
            'orders.view', 'orders.update'
        ]
    },
    {
        name: 'Quản lý Sản phẩm',
        slug: 'product_admin',
        description: 'Quản lý sản phẩm và danh mục',
        isSystem: true,
        permissions: [
            'dashboard.view',
            'products.view', 'products.update', 'products.delete',
            'categories.view', 'categories.create', 'categories.update', 'categories.delete',
            'brands.view', 'brands.create', 'brands.update', 'brands.delete',
            'attributes.view', 'attributes.create', 'attributes.update', 'attributes.delete'
        ]
    },
    {
        name: 'Hỗ trợ Khách hàng',
        slug: 'customer_support',
        description: 'Xử lý đơn hàng và khiếu nại',
        isSystem: true,
        permissions: [
            'dashboard.view',
            'users.view',
            'orders.view', 'orders.update',
            'refunds.view', 'refunds.process'
        ]
    },
    {
        name: 'Quản lý Nội dung',
        slug: 'content_admin',
        description: 'Quản lý nội dung và khuyến mãi',
        isSystem: true,
        permissions: [
            'dashboard.view',
            'banners.view', 'banners.create', 'banners.update', 'banners.delete',
            'promotions.view', 'promotions.create', 'promotions.update', 'promotions.delete',
            'articles.view', 'articles.create', 'articles.update', 'articles.delete',
            'pages.view', 'pages.create', 'pages.update', 'pages.delete'
        ]
    },
    {
        name: 'Tài chính',
        slug: 'finance_admin',
        description: 'Quản lý tài chính và báo cáo',
        isSystem: true,
        permissions: [
            'dashboard.view',
            'orders.view',
            'refunds.view', 'refunds.process',
            'reports.view', 'reports.export'
        ]
    }
];

const CATEGORIES = [
    { name: 'Chó', slug: 'cho', icon: '🐕', order: 1 },
    { name: 'Mèo', slug: 'meo', icon: '🐱', order: 2 },
    { name: 'Chim', slug: 'chim', icon: '🐦', order: 3 },
    { name: 'Cá', slug: 'ca', icon: '🐟', order: 4 },
    { name: 'Hamster', slug: 'hamster', icon: '🐹', order: 5 },
    { name: 'Thức ăn', slug: 'thuc-an', icon: '🍖', order: 10 },
    { name: 'Đồ chơi', slug: 'do-choi', icon: '🎾', order: 11 },
    { name: 'Phụ kiện', slug: 'phu-kien', icon: '🎀', order: 12 },
    { name: 'Vệ sinh', slug: 've-sinh', icon: '🧹', order: 13 },
    { name: 'Y tế', slug: 'y-te', icon: '💊', order: 14 },
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pet_marketplace');
        console.log('Connected to MongoDB');

        await Permission.deleteMany({});
        console.log('Cleared permissions');

        const createdPermissions = await Permission.insertMany(PERMISSIONS);
        console.log(`Created ${createdPermissions.length} permissions`);

        const permMap = {};
        createdPermissions.forEach(p => permMap[p.slug] = p._id);

        await AdminRole.deleteMany({});
        console.log('Cleared roles');

        for (const role of ROLES) {
            const permIds = role.permissions.map(slug => permMap[slug]).filter(Boolean);
            await AdminRole.create({
                name: role.name,
                slug: role.slug,
                description: role.description,
                isSystem: role.isSystem,
                isSuperAdmin: role.isSuperAdmin || false,
                permissions: permIds,
                isActive: true
            });
        }
        console.log(`Created ${ROLES.length} roles`);

        const superAdminRole = await AdminRole.findOne({ slug: 'super_admin' });
        
        await Admin.deleteMany({ email: 'admin@petshop.com' });
        const admin = await Admin.create({
            email: 'admin@petshop.com',
            password: 'admin123',
            name: 'Super Admin',
            role: superAdminRole._id,
            isSuperAdmin: true,
            status: 'active'
        });
        console.log(`Created admin: ${admin.email}`);

        await Category.deleteMany({});
        const createdCategories = await Category.insertMany(
            CATEGORIES.map(c => ({
                ...c,
                isActive: true
            }))
        );
        console.log(`Created ${createdCategories.length} categories`);

        console.log('\n✅ Seeding completed!');
        console.log('\nLogin credentials:');
        console.log('Email: admin@petshop.com');
        console.log('Password: admin123');

    } catch (error) {
        console.error('Seeding error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

seed();
