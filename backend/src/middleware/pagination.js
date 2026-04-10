const config = require('../config/env');

const pagination = (defaultLimit = config.pagination.defaultLimit) => {
    return (req, res, next) => {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || defaultLimit, config.pagination.maxLimit);
        const skip = (page - 1) * limit;

        req.pagination = { page, limit, skip };
        next();
    };
};

const getPaginationMeta = (total, { page, limit }) => {
    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
    };
};

const getPagination = (total, page, limit) => ({
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    pages: Math.ceil(total / limit),
    totalPages: Math.ceil(total / limit)
});

const buildQuery = (req) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || config.pagination.defaultLimit, config.pagination.maxLimit);
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const query = {};

    if (req.query.search) {
        const regex = { $regex: req.query.search, $options: 'i' };
        query.$or = [
            { name: regex },
            { email: regex },
            { phone: regex },
            { title: regex },
                { slug: regex },
                { code: regex },
                { sku: regex },
            { orderNumber: regex },
            { code: regex }
        ];
    }

    ['status', 'role', 'category', 'shop', 'seller', 'buyer', 'type'].forEach(field => {
        if (req.query[field]) query[field] = req.query[field];
    });

    if (req.query.isActive !== undefined) {
        query.isActive = req.query.isActive === 'true';
    }

    if (req.query.isVerified !== undefined) {
        query.isVerified = req.query.isVerified === 'true';
    }

    if (req.query.featured !== undefined) {
        query.isFeatured = req.query.featured === 'true';
    }

    return {
        query,
        sort: { [sortBy]: sortOrder },
        page,
        limit
    };
};

module.exports = { pagination, getPaginationMeta, buildQuery, getPagination };
