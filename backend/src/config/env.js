require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/pet_marketplace',
    jwt: {
        secret: process.env.JWT_SECRET || 'fallback_secret_key',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
        adminSecret: process.env.JWT_ADMIN_SECRET || 'admin_secret_key_change_in_production',
        adminExpiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '24h'
    },
    cors: {
        origin: process.env.CORS_ORIGIN || '*'
    },
    pagination: {
        defaultLimit: 20,
        maxLimit: 100
    },
    mail: {
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: Number(process.env.MAIL_PORT || 587),
        secure: String(process.env.MAIL_SECURE || 'false').toLowerCase() === 'true',
        user: process.env.MAIL_USER || '',
        pass: process.env.MAIL_PASS || '',
        from: process.env.MAIL_FROM || process.env.MAIL_USER || '',
        verificationExpiryMinutes: Math.max(Number(process.env.PAYMENT_EXPIRY_MINUTES || 15), 5)
    }
};
