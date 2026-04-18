const express = require('express');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const router = express.Router();

const config = require('../config/env');
const { User, SellerApplication } = require('../models');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { sendSuccess, sendCreated } = require('../middleware/responseHandler');
const ApiError = require('../utils/ApiError');
const { resolveFrontendBaseUrl } = require('../utils/frontendUrl');
const {
    ROLES,
    SELLER_APPLICATION_STATUS,
    SELLER_APPLICATION_TYPE
} = require('../config/constants');
const { resolveSellerAccessContext } = require('../services/sellerAccessService');
const { normalizeAddress, syncUserSellerState } = require('../services/sellerApplicationWorkflow');

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
        .notEmpty().withMessage('Ho ten la bat buoc')
        .isLength({ max: 100 }).withMessage('Ho ten khong qua 100 ky tu'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email la bat buoc')
        .isEmail().withMessage('Email khong hop le')
        .normalizeEmail(),
    body('phone')
        .trim()
        .notEmpty().withMessage('So dien thoai la bat buoc')
        .matches(/^[0-9]{10,11}$/).withMessage('So dien thoai phai co 10-11 chu so'),
    body('password')
        .notEmpty().withMessage('Mat khau la bat buoc')
        .isLength({ min: 6 }).withMessage('Mat khau phai co it nhat 6 ky tu')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mat khau phai chua it nhat 1 chu hoa, 1 chu thuong va 1 so')
];

const sellerRegisterValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Ho ten la bat buoc')
        .isLength({ max: 100 }).withMessage('Ho ten khong qua 100 ky tu'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email la bat buoc')
        .isEmail().withMessage('Email khong hop le')
        .normalizeEmail(),
    body('phone')
        .trim()
        .notEmpty().withMessage('So dien thoai la bat buoc')
        .matches(/^[0-9]{10,11}$/).withMessage('So dien thoai phai co 10-11 chu so'),
    body('password')
        .notEmpty().withMessage('Mat khau la bat buoc')
        .isLength({ min: 6 }).withMessage('Mat khau phai co it nhat 6 ky tu')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mat khau phai chua it nhat 1 chu hoa, 1 chu thuong va 1 so'),
    body('applicationType')
        .optional()
        .isIn(Object.values(SELLER_APPLICATION_TYPE)).withMessage('Loai ho so mo shop khong hop le'),
    body('shopName')
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage('Ten shop du kien khong qua 200 ky tu'),
    body('shopDescription')
        .optional()
        .isLength({ max: 2000 }).withMessage('Mo ta shop khong qua 2000 ky tu'),
    body('shopPhone')
        .optional()
        .matches(/^[0-9]{10,11}$/).withMessage('So dien thoai shop phai co 10-11 chu so'),
    body('shopAddress')
        .optional()
        .isObject(),
    body('identityNumber')
        .optional()
        .trim()
        .isLength({ max: 40 }).withMessage('Giay to dinh danh khong hop le')
];

const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email la bat buoc')
        .isEmail().withMessage('Email khong hop le')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Mat khau la bat buoc')
];

const forgotPasswordValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email la bat buoc')
        .isEmail().withMessage('Email khong hop le')
        .normalizeEmail()
];

const resetPasswordValidation = [
    body('token')
        .notEmpty().withMessage('Token la bat buoc'),
    body('newPassword')
        .notEmpty().withMessage('Mat khau moi la bat buoc')
        .isLength({ min: 6 }).withMessage('Mat khau phai co it nhat 6 ky tu')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mat khau phai chua it nhat 1 chu hoa, 1 chu thuong va 1 so')
];

const changePasswordValidation = [
    body('currentPassword')
        .notEmpty().withMessage('Mat khau hien tai la bat buoc'),
    body('newPassword')
        .notEmpty().withMessage('Mat khau moi la bat buoc')
        .isLength({ min: 6 }).withMessage('Mat khau phai co it nhat 6 ky tu')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mat khau phai chua it nhat 1 chu hoa, 1 chu thuong va 1 so')
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('Mat khau moi phai khac mat khau hien tai');
            }
            return true;
        })
];

async function createDraftApplicationIfNeeded(user, payload) {
    const {
        shopName,
        shopDescription,
        shopPhone,
        shopAddress,
        identityNumber,
        applicationType
    } = payload;

    if (!shopName && !shopDescription && !identityNumber && !applicationType) {
        return null;
    }

    const application = await SellerApplication.findOneAndUpdate(
        { user: user._id },
        {
            user: user._id,
            applicationType: applicationType || SELLER_APPLICATION_TYPE.STANDARD,
            representativeName: user.name,
            representativeEmail: user.email,
            representativePhone: user.phone,
            identityNumber: identityNumber || '',
            proposedShopName: shopName || `Shop cua ${user.name}`,
            shopDescription: shopDescription || '',
            shopPhone: shopPhone || user.phone,
            shopEmail: user.email,
            shopAddress: normalizeAddress(shopAddress),
            status: SELLER_APPLICATION_STATUS.DRAFT
        },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    await syncUserSellerState(user, {
        status: SELLER_APPLICATION_STATUS.DRAFT,
        applicationType: application.applicationType
    });

    return application;
}

async function buildSellerPayload(user) {
    const sellerContext = await resolveSellerAccessContext(user);
    return {
        user: user.toJSON(),
        shop: sellerContext.shop ? sellerContext.shop.toJSON() : null,
        application: sellerContext.application ? sellerContext.application.toJSON() : null,
        sellerAccess: {
            status: sellerContext.sellerAccessStatus,
            canAccessSellerCenter: sellerContext.canAccessSellerCenter,
            verificationLevel: sellerContext.verificationLevel,
            labels: sellerContext.labels
        }
    };
}

router.post('/register/buyer', buyerRegisterValidation, validate, async (req, res, next) => {
    try {
        const { name, email, phone, password } = req.body;

        const existingUser = await User.findOne({
            $or: [{ email }, { phone }]
        });

        if (existingUser) {
            if (existingUser.email === email) {
                throw ApiError.badRequest('Email da duoc su dung');
            }
            throw ApiError.badRequest('So dien thoai da duoc su dung');
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

        sendCreated(res, 'Dang ky thanh cong', {
            user: user.toJSON(),
            ...tokens
        });
    } catch (error) {
        next(error);
    }
});

router.post('/register/seller', sellerRegisterValidation, validate, async (req, res, next) => {
    try {
        const {
            name,
            email,
            phone,
            password
        } = req.body;

        const existingUser = await User.findOne({
            $or: [{ email }, { phone }]
        });

        if (existingUser) {
            if (existingUser.email === email) {
                throw ApiError.badRequest('Email da duoc su dung');
            }
            throw ApiError.badRequest('So dien thoai da duoc su dung');
        }

        const user = await User.create({
            name,
            email,
            phone,
            password,
            role: ROLES.SELLER
        });

        const application = await createDraftApplicationIfNeeded(user, req.body);
        const tokens = generateTokens(user._id);
        user.refreshToken = tokens.refreshToken;
        await user.save();

        sendCreated(res, 'Dang ky tai khoan nguoi ban thanh cong. Vui long gui ho so mo shop de duoc Admin xet duyet.', {
            user: user.toJSON(),
            application: application ? application.toJSON() : null,
            sellerAccess: {
                status: application?.status || null,
                canAccessSellerCenter: false
            },
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
            throw ApiError.unauthorized('Email hoac mat khau khong dung');
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw ApiError.unauthorized('Email hoac mat khau khong dung');
        }

        if (user.status === 'banned') {
            throw ApiError.forbidden('Tai khoan da bi khoa. Vui long lien he ho tro.');
        }

        const tokens = generateTokens(user._id);
        user.refreshToken = tokens.refreshToken;
        user.lastLoginAt = new Date();
        await user.save();

        sendSuccess(res, 'Dang nhap thanh cong', {
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
            throw ApiError.unauthorized('Email hoac mat khau khong dung');
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw ApiError.unauthorized('Email hoac mat khau khong dung');
        }

        if (user.status === 'banned') {
            throw ApiError.forbidden('Tai khoan da bi khoa. Vui long lien he ho tro.');
        }

        const tokens = generateTokens(user._id);
        user.refreshToken = tokens.refreshToken;
        user.lastLoginAt = new Date();
        await user.save();

        const payload = await buildSellerPayload(user);

        sendSuccess(res, 'Dang nhap thanh cong', {
            ...payload,
            ...tokens
        });
    } catch (error) {
        next(error);
    }
});

router.post('/logout', authenticate, async (req, res, next) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { refreshToken: null });
        sendSuccess(res, 'Dang xuat thanh cong');
    } catch (error) {
        next(error);
    }
});

router.post('/refresh-token', async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw ApiError.badRequest('Refresh token la bat buoc');
        }

        try {
            const decoded = jwt.verify(refreshToken, config.jwt.secret);

            if (decoded.type !== 'refresh') {
                throw ApiError.badRequest('Token khong hop le');
            }

            const user = await User.findById(decoded.id).select('+refreshToken');
            if (!user || user.refreshToken !== refreshToken) {
                throw ApiError.badRequest('Token khong hop le');
            }

            if (user.status === 'banned') {
                throw ApiError.forbidden('Tai khoan da bi khoa');
            }

            const tokens = generateTokens(user._id);
            user.refreshToken = tokens.refreshToken;
            await user.save();

            sendSuccess(res, 'Lam moi token thanh cong', tokens);
        } catch (error) {
            throw ApiError.unauthorized('Token da het han hoac khong hop le');
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
            return sendSuccess(res, 'Neu email ton tai, chung toi da tao lien ket dat lai mat khau');
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpires = Date.now() + 30 * 60 * 1000;
        await user.save();

        const resetUrl = `${resolveFrontendBaseUrl(req)}/#reset-password?token=${resetToken}&email=${email}`;
        console.log(`Password Reset Link: ${resetUrl}`);

        sendSuccess(res, 'Neu email ton tai, chung toi da tao lien ket dat lai mat khau');
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
            throw ApiError.badRequest('Token dat lai mat khau khong hop le hoac da het han');
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.refreshToken = null;
        await user.save();

        sendSuccess(res, 'Dat lai mat khau thanh cong. Vui long dang nhap lai.');
    } catch (error) {
        next(error);
    }
});

router.get('/me', authenticate, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            throw ApiError.notFound('Nguoi dung khong ton tai');
        }

        if (user.role === ROLES.SELLER) {
            const payload = await buildSellerPayload(user);
            return sendSuccess(res, 'Lay thong tin thanh cong', payload);
        }

        sendSuccess(res, 'Lay thong tin thanh cong', {
            user: user.toJSON(),
            shop: null,
            application: null,
            sellerAccess: null
        });
    } catch (error) {
        next(error);
    }
});

router.put('/profile', authenticate, async (req, res, next) => {
    try {
        const allowedFields = ['name', 'phone', 'avatar', 'dateOfBirth', 'gender', 'addresses', 'linkedPaymentAccounts'];
        const updates = {};

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(
            req.user.id,
            updates,
            { new: true, runValidators: true }
        );

        sendSuccess(res, 'Cap nhat ho so thanh cong', user.toJSON());
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
            throw ApiError.badRequest('Mat khau hien tai khong dung');
        }

        user.password = newPassword;
        await user.save();

        sendSuccess(res, 'Doi mat khau thanh cong');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
