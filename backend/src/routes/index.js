const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const productRoutes = require('./products');
const shopRoutes = require('./shops');
const sellerApplicationRoutes = require('./seller-applications');
const sellerProductRoutes = require('./seller-products');
const buyerOrderRoutes = require('./buyer-orders');
const sellerOrderRoutes = require('./seller-orders');
const sellerRoutes = require('./seller');
const sellerCareServiceRoutes = require('./seller-care-services');
const userRoutes = require('./user');
const userCareServiceRoutes = require('./user-care-services');
const adminRoutes = require('./admin');
const publicRoutes = require('./public');
const uploadRoutes = require('./uploads');
const paymentRoutes = require('./payments');
const chatRoutes = require('./chat');

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/shops', shopRoutes);
router.use('/seller-applications', sellerApplicationRoutes);
router.use('/seller/products', sellerProductRoutes);
router.use('/buyer/orders', buyerOrderRoutes);
router.use('/orders', buyerOrderRoutes);
router.use('/seller/orders', sellerOrderRoutes);
router.use('/seller', sellerRoutes);
router.use('/seller/care-services', sellerCareServiceRoutes);
router.use('/user', userRoutes);
router.use('/user/care-services', userCareServiceRoutes);
router.use('/admin', adminRoutes);
router.use('/public', publicRoutes);
router.use('/uploads', uploadRoutes);
router.use('/payments', paymentRoutes);
router.use('/chat', chatRoutes);

router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Pet Marketplace API is running',
        version: '1.0.0',
        timestamp: new Date()
    });
});

module.exports = router;
