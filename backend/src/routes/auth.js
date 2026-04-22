const express = require('express');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const router = express.Router();

const config = require('../config/env');
const { User, SellerApplication, PasswordResetCode } = require('../models');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { sendSuccess, sendCreated } = require('../middleware/responseHandler');
const ApiError = require('../utils/ApiError');
const {
    ROLES,
    SELLER_APPLICATION_STATUS,
    SELLER_APPLICATION_TYPE
} = require('../config/constants');
const { resolveSellerAccessContext } = require('../services/sellerAccessService');
const { normalizeAddress, syncUserSellerState } = require('../services/sellerApplicationWorkflow');
const { sendPasswordResetCodeEmail, maskEmail } = require('../services/mailService');

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

function generatePasswordResetCode() {
    return String(crypto.randomInt(100000, 1000000));
}

function hashPasswordResetCode(email, code) {
    return crypto
        .createHmac('sha256', config.jwt.secret)
        .update(`${String(email || '').trim().toLowerCase()}:${String(code || '').trim()}`)
        .digest('hex');
}

function maskLinkedPaymentIdentifier(identifier = '') {
    const cleaned = String(identifier || '').trim();
    if (!cleaned) return '';

    if (cleaned.includes('@')) {
        const [name, domain] = cleaned.split('@');
        const safeHead = name.slice(0, 2);
        const safeTail = name.slice(-1);
        return `${safeHead}${'*'.repeat(Math.max(name.length - 3, 2))}${safeTail}@${domain}`;
    }

    const compact = cleaned.replace(/\s+/g, '');
    if (compact.length <= 4) return compact;
    return `${'*'.repeat(Math.max(compact.length - 4, 4))}${compact.slice(-4)}`;
}

function sanitizeLinkedPaymentAccounts(accounts = []) {
    if (!Array.isArray(accounts)) return [];

    return accounts
        .map((account) => ({
            providerType: ['bank', 'wallet', 'gateway'].includes(account?.providerType) ? account.providerType : 'gateway',
            providerCode: String(account?.providerCode || '').trim(),
            providerName: String(account?.providerName || account?.providerCode || '').trim(),
            accountName: String(account?.accountName || '').trim(),
            accountIdentifier: String(account?.accountIdentifier || '').trim(),
            accountMask: String(account?.accountMask || '').trim(),
            isDefault: !!account?.isDefault,
            savedAt: account?.savedAt || new Date()
        }))
        .filter((account) => account.providerCode && account.accountName && account.accountIdentifier)
        .map((account) => ({
            ...account,
            accountMask: account.accountMask || maskLinkedPaymentIdentifier(account.accountIdentifier)
        }))
        .map((account, index, all) => ({
            ...account,
            isDefault: account.isDefault || (!all.some((item) => item.isDefault) && index === 0)
        }));
}

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
    body('email')
        .trim()
        .notEmpty().withMessage('Email là bắt buộc')
        .isEmail().withMessage('Email không hợp lệ')
        .normalizeEmail(),
    body('code')
        .trim()
        .notEmpty().withMessage('Mã xác minh là bắt buộc')
        .matches(/^[0-9]{6}$/).withMessage('Mã xác minh phải gồm 6 chữ số'),
    body('newPassword')
        .notEmpty().withMessage('Mật khẩu mới là bắt buộc')
        .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số')
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
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const genericMessage = 'Nếu email tồn tại trong hệ thống, PetNest đã gửi mã xác minh đặt lại mật khẩu.';
        const expiryMinutes = config.mail.passwordResetExpiryMinutes;

        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return sendSuccess(res, genericMessage, {
                emailMasked: maskEmail(normalizedEmail),
                expiresInMinutes: expiryMinutes
            });
        }

        const code = generatePasswordResetCode();
        const resetRecord = await PasswordResetCode.create({
            user: user._id,
            email: normalizedEmail,
            codeHash: hashPasswordResetCode(normalizedEmail, code),
            expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
            requestedIp: req.ip,
            userAgent: req.get('user-agent') || ''
        });

        await PasswordResetCode.updateMany({
            user: user._id,
            purpose: 'password_reset',
            usedAt: null,
            _id: { $ne: resetRecord._id }
        }, {
            $set: { usedAt: new Date() }
        });

        try {
            await sendPasswordResetCodeEmail({
                to: user.email,
                name: user.name,
                verificationCode: code,
                expiryMinutes
            });
        } catch (error) {
            resetRecord.usedAt = new Date();
            await resetRecord.save();
            throw error;
        }

        sendSuccess(res, genericMessage, {
            emailMasked: maskEmail(user.email),
            expiresInMinutes: expiryMinutes
        });
    } catch (error) {
        next(error);
    }
});

router.post('/reset-password', resetPasswordValidation, validate, async (req, res, next) => {
    try {
        const { email, code, newPassword } = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();

        const resetRecord = await PasswordResetCode.findOne({
            email: normalizedEmail,
            purpose: 'password_reset',
            usedAt: null
        }).sort({ createdAt: -1 });

        if (!resetRecord) {
            throw ApiError.badRequest('Mã xác minh không hợp lệ hoặc đã được sử dụng');
        }

        if (resetRecord.expiresAt <= new Date()) {
            resetRecord.usedAt = new Date();
            await resetRecord.save();
            throw ApiError.badRequest('Mã xác minh đã hết hạn. Vui lòng yêu cầu mã mới.');
        }

        if (resetRecord.attempts >= resetRecord.maxAttempts) {
            resetRecord.usedAt = new Date();
            await resetRecord.save();
            throw ApiError.badRequest('Bạn đã nhập sai quá số lần cho phép. Vui lòng yêu cầu mã mới.');
        }

        const submittedHash = hashPasswordResetCode(normalizedEmail, code);
        if (submittedHash !== resetRecord.codeHash) {
            resetRecord.attempts += 1;
            const remainingAttempts = Math.max(resetRecord.maxAttempts - resetRecord.attempts, 0);
            if (remainingAttempts === 0) {
                resetRecord.usedAt = new Date();
            }
            await resetRecord.save();
            throw ApiError.badRequest(`Mã xác minh không đúng. Bạn còn ${remainingAttempts} lần thử.`);
        }

        const user = await User.findById(resetRecord.user);
        if (!user || user.email !== normalizedEmail) {
            resetRecord.usedAt = new Date();
            await resetRecord.save();
            throw ApiError.badRequest('Không thể đặt lại mật khẩu cho tài khoản này');
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.refreshToken = null;
        await user.save();

        resetRecord.usedAt = new Date();
        await resetRecord.save();
        await PasswordResetCode.updateMany({
            user: user._id,
            purpose: 'password_reset',
            usedAt: null
        }, {
            $set: { usedAt: new Date() }
        });

        sendSuccess(res, 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
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

        if (updates.linkedPaymentAccounts !== undefined) {
            updates.linkedPaymentAccounts = sanitizeLinkedPaymentAccounts(updates.linkedPaymentAccounts);
        }

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
