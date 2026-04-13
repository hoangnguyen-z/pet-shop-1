const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { resolveSellerAccessContext } = require('../services/sellerAccessService');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw ApiError.unauthorized('Vui lòng đăng nhập');
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, config.jwt.secret);
            const user = await User.findById(decoded.id);

            if (!user) {
                throw ApiError.unauthorized('Người dùng không tồn tại');
            }

            if (user.status === 'banned') {
                throw ApiError.forbidden('Tài khoản đã bị khóa');
            }

            req.user = user;
            req.user.id = user._id;

            if (user.role === 'seller') {
                const sellerContext = await resolveSellerAccessContext(user);
                req.user.shop = sellerContext.shop;
                req.user.sellerApplication = sellerContext.application;
                req.user.sellerDocuments = sellerContext.documents;
                req.user.sellerAccessStatus = sellerContext.sellerAccessStatus;
                req.user.sellerVerificationLevel = sellerContext.verificationLevel;
                req.user.sellerLabels = sellerContext.labels;
                req.user.canAccessSellerCenter = sellerContext.canAccessSellerCenter;
            } else {
                req.user.shop = null;
                req.user.sellerApplication = null;
                req.user.sellerDocuments = [];
                req.user.sellerAccessStatus = null;
                req.user.sellerVerificationLevel = null;
                req.user.sellerLabels = [];
                req.user.canAccessSellerCenter = false;
            }

            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                throw ApiError.unauthorized('Token đã hết hạn');
            }
            if (jwtError.name === 'JsonWebTokenError') {
                throw ApiError.unauthorized('Token không hợp lệ');
            }
            throw jwtError;
        }
    } catch (error) {
        next(error);
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(ApiError.forbidden('Bạn không có quyền truy cập'));
        }
        next();
    };
};

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, config.jwt.secret);
                const user = await User.findById(decoded.id);
                if (user && user.status === 'active') {
                    req.user = user;
                    req.user.id = user._id;
                }
            } catch (e) {
                // Ignore invalid token for optional auth
            }
        }
        next();
    } catch (error) {
        next();
    }
};

const requireApprovedSeller = (req, res, next) => {
    if (req.user.role !== 'seller') {
        return next(ApiError.forbidden('Chi tai khoan nguoi ban moi duoc truy cap'));
    }

    if (!req.user.canAccessSellerCenter) {
        return next(ApiError.forbidden('Tai khoan ban hang chua duoc phe duyet hoac shop dang bi khoa'));
    }

    next();
};

module.exports = { authenticate, authorize, optionalAuth, requireApprovedSeller };
