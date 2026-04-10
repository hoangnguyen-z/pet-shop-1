const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');
const { User, Shop } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { sendSuccess, sendCreated } = require('../middleware/responseHandler');
const ApiError = require('../utils/ApiError');
const { ROLES, SHOP_STATUS } = require('../config/constants');

const makeShopSlug = (name) => {
    const base = String(name || 'shop')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'shop';
    return `${base}-${Date.now().toString(36)}`;
};

const generateTokens = (userId) => {
    const accessToken = jwt.sign(
        { id: userId },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
        { id: userId, type: 'refresh' },
        config.jwt.secret,
        { expiresIn: config.jwt.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
};

const buyerRegisterValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Họ tên là bắt buộc')
        .isLength({ max: 100 }).withMessage('Họ tên không quá 100 ký tự'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email là bắt buộc')
        .isEmail().withMessage('Email không hợp lệ')
        .normalizeEmail(),
    body('phone')
        .trim()
        .notEmpty().withMessage('Số điện thoại là bắt buộc')
        .matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại phải có 10-11 chữ số'),
    body('password')
        .notEmpty().withMessage('Mật khẩu là bắt buộc')
        .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số')
];

const sellerRegisterValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Họ tên là bắt buộc')
        .isLength({ max: 100 }).withMessage('Họ tên không quá 100 ký tự'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email là bắt buộc')
        .isEmail().withMessage('Email không hợp lệ')
        .normalizeEmail(),
    body('phone')
        .trim()
        .notEmpty().withMessage('Số điện thoại là bắt buộc')
        .matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại phải có 10-11 chữ số'),
    body('password')
        .notEmpty().withMessage('Mật khẩu là bắt buộc')
        .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số'),
    body('shopName')
        .trim()
        .notEmpty().withMessage('Tên cửa hàng là bắt buộc')
        .isLength({ max: 200 }).withMessage('Tên cửa hàng không quá 200 ký tự'),
    body('shopDescription')
        .optional()
        .isLength({ max: 2000 }).withMessage('Mô tả cửa hàng không quá 2000 ký tự'),
    body('shopPhone')
        .optional()
        .matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại cửa hàng phải có 10-11 chữ số'),
    body('shopAddress')
        .optional()
        .isObject()
];

const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email là bắt buộc')
        .isEmail().withMessage('Email không hợp lệ')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Mật khẩu là bắt buộc')
];

const forgotPasswordValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email là bắt buộc')
        .isEmail().withMessage('Email không hợp lệ')
        .normalizeEmail()
];

const resetPasswordValidation = [
    body('token')
        .notEmpty().withMessage('Token là bắt buộc'),
    body('newPassword')
        .notEmpty().withMessage('Mật khẩu mới là bắt buộc')
        .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số')
];

const changePasswordValidation = [
    body('currentPassword')
        .notEmpty().withMessage('Mật khẩu hiện tại là bắt buộc'),
    body('newPassword')
        .notEmpty().withMessage('Mật khẩu mới là bắt buộc')
        .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số')
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('Mật khẩu mới phải khác mật khẩu hiện tại');
            }
            return true;
        })
];

router.post('/register/buyer', buyerRegisterValidation, validate, async (req, res, next) => {
    try {
        const { name, email, phone, password } = req.body;

        const existingUser = await User.findOne({ 
            $or: [{ email }, { phone }] 
        });
        
        if (existingUser) {
            if (existingUser.email === email) {
                throw ApiError.badRequest('Email đã được sử dụng');
            }
            throw ApiError.badRequest('Số điện thoại đã được sử dụng');
        }

        const user = await User.create({
            name,
            email,
            phone,
            password,
            role: ROLES.BUYER
        });

        const tokens = generateTokens(user._id);
        user.refreshToken = tokens.refreshToken;
        await user.save();

        sendCreated(res, 'Đăng ký thành công', {
            user: user.toJSON(),
            ...tokens
        });
    } catch (error) {
        next(error);
    }
});

router.post('/register/seller', sellerRegisterValidation, validate, async (req, res, next) => {
    try {
        const { name, email, phone, password, shopName, shopDescription, shopPhone, shopAddress } = req.body;

        const existingUser = await User.findOne({ 
            $or: [{ email }, { phone }] 
        });
        
        if (existingUser) {
            if (existingUser.email === email) {
                throw ApiError.badRequest('Email đã được sử dụng');
            }
            throw ApiError.badRequest('Số điện thoại đã được sử dụng');
        }

        const user = await User.create({
            name,
            email,
            phone,
            password,
            role: ROLES.SELLER
        });

        const shop = await Shop.create({
            owner: user._id,
            name: shopName,
            slug: makeShopSlug(shopName),
            description: shopDescription || '',
            phone: shopPhone || phone,
            address: shopAddress || {},
            status: SHOP_STATUS.PENDING,
            email: email
        });

        const tokens = generateTokens(user._id);
        user.refreshToken = tokens.refreshToken;
        await user.save();

        sendCreated(res, 'Đăng ký thành công', {
            user: user.toJSON(),
            shop: shop.toJSON(),
            ...tokens
        });
    } catch (error) {
        next(error);
    }
});

router.post('/login/buyer', loginValidation, validate, async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email, role: ROLES.BUYER }).select('+password');
        
        if (!user) {
            throw ApiError.unauthorized('Email hoặc mật khẩu không đúng');
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw ApiError.unauthorized('Email hoặc mật khẩu không đúng');
        }

        if (user.status === 'banned') {
            throw ApiError.forbidden('Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.');
        }

        const tokens = generateTokens(user._id);
        user.refreshToken = tokens.refreshToken;
        user.lastLoginAt = new Date();
        await user.save();

        sendSuccess(res, 'Đăng nhập thành công', {
            user: user.toJSON(),
            ...tokens
        });
    } catch (error) {
        next(error);
    }
});

router.post('/login/seller', loginValidation, validate, async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email, role: ROLES.SELLER }).select('+password');
        
        if (!user) {
            throw ApiError.unauthorized('Email hoặc mật khẩu không đúng');
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw ApiError.unauthorized('Email hoặc mật khẩu không đúng');
        }

        if (user.status === 'banned') {
            throw ApiError.forbidden('Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.');
        }

        const shop = await Shop.findOne({ owner: user._id });
        
        if (!shop) {
            throw ApiError.badRequest('Cửa hàng không tồn tại');
        }

        const tokens = generateTokens(user._id);
        user.refreshToken = tokens.refreshToken;
        user.lastLoginAt = new Date();
        await user.save();

        sendSuccess(res, 'Đăng nhập thành công', {
            user: user.toJSON(),
            shop: shop.toJSON(),
            ...tokens
        });
    } catch (error) {
        next(error);
    }
});

router.post('/logout', authenticate, async (req, res, next) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { refreshToken: null });
        sendSuccess(res, 'Đăng xuất thành công');
    } catch (error) {
        next(error);
    }
});

router.post('/refresh-token', async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw ApiError.badRequest('Refresh token là bắt buộc');
        }

        try {
            const decoded = jwt.verify(refreshToken, config.jwt.secret);

            if (decoded.type !== 'refresh') {
                throw ApiError.badRequest('Token không hợp lệ');
            }

            const user = await User.findById(decoded.id).select('+refreshToken');
            if (!user || user.refreshToken !== refreshToken) {
                throw ApiError.badRequest('Token không hợp lệ');
            }

            if (user.status === 'banned') {
                throw ApiError.forbidden('Tài khoản đã bị khóa');
            }

            const tokens = generateTokens(user._id);
            user.refreshToken = tokens.refreshToken;
            await user.save();

            sendSuccess(res, 'Làm mới token thành công', tokens);
        } catch (e) {
            throw ApiError.unauthorized('Token đã hết hạn hoặc không hợp lệ');
        }
    } catch (error) {
        next(error);
    }
});

router.post('/forgot-password', forgotPasswordValidation, validate, async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        
        if (!user) {
            return sendSuccess(res, 'Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu');
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpires = Date.now() + 30 * 60 * 1000;
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5500'}/#reset-password?token=${resetToken}&email=${email}`;
        
        console.log(`Password Reset Link: ${resetUrl}`);
        
        sendSuccess(res, 'Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu');
    } catch (error) {
        next(error);
    }
});

router.post('/reset-password', resetPasswordValidation, validate, async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;

        const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: resetTokenHash,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            throw ApiError.badRequest('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.refreshToken = null;
        await user.save();

        sendSuccess(res, 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
    } catch (error) {
        next(error);
    }
});

router.get('/me', authenticate, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        let shop = null;

        if (user.role === ROLES.SELLER) {
            shop = await Shop.findOne({ owner: user._id });
        }

        sendSuccess(res, 'Lấy thông tin thành công', {
            user: user.toJSON(),
            shop: shop ? shop.toJSON() : null
        });
    } catch (error) {
        next(error);
    }
});

router.put('/profile', authenticate, async (req, res, next) => {
    try {
        const allowedFields = ['name', 'phone', 'avatar', 'dateOfBirth', 'gender', 'addresses'];
        const updates = {};

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(
            req.user.id,
            updates,
            { new: true, runValidators: true }
        );

        sendSuccess(res, 'Cập nhật hồ sơ thành công', user.toJSON());
    } catch (error) {
        next(error);
    }
});

router.put('/change-password', authenticate, changePasswordValidation, validate, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id).select('+password');

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            throw ApiError.badRequest('Mật khẩu hiện tại không đúng');
        }

        user.password = newPassword;
        await user.save();

        sendSuccess(res, 'Đổi mật khẩu thành công');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
