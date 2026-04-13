const express = require('express');
const router = express.Router();

const adminAuthRoutes = require('./admin/auth');
const adminRoutes = require('./admin/admins');
const roleRoutes = require('./admin/roles');
const userRoutes = require('./admin/users');
const shopRoutes = require('./admin/shops');
const sellerApplicationRoutes = require('./admin/seller-applications');
const careServiceRoutes = require('./admin/care-services');
const productRoutes = require('./admin/products');
const orderRoutes = require('./admin/orders');
const categoryRoutes = require('./admin/categories');
const contentRoutes = require('./admin/content');
const dashboardRoutes = require('./admin/dashboard');

router.use('/auth', adminAuthRoutes);
router.use('/admins', adminRoutes);
router.use('/roles', roleRoutes);
router.use('/users', userRoutes);
router.use('/shops', shopRoutes);
router.use('/seller-applications', sellerApplicationRoutes);
router.use('/care-services', careServiceRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/categories', categoryRoutes);
router.use('/content', contentRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
