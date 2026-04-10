const { validationResult } = require('express-validator');

const sendValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();

    return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array().map(e => ({
            field: e.path,
            message: e.msg
        }))
    });
};

const validate = (validations, res, next) => {
    if (!Array.isArray(validations)) {
        return sendValidationErrors(validations, res, next);
    }

    return async (req, res, next) => {
        for (const validation of validations) {
            const result = await validation.run(req);
            if (result.errors.length) break;
        }

        return sendValidationErrors(req, res, next);
    };
};

module.exports = validate;
