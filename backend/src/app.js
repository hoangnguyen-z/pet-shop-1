require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const routes = require('./routes');
const { errorHandler, errorConverter } = require('./middleware/errorHandler');
const connectDB = require('./config/database');

const app = express();
const uploadRoot = path.join(__dirname, '..', 'uploads');
const rawCorsOrigins = String(process.env.CORS_ORIGIN || '*')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
const allowAllOrigins = rawCorsOrigins.includes('*') || rawCorsOrigins.length === 0;

connectDB();
fs.mkdirSync(uploadRoot, { recursive: true });

app.use(helmet());
app.use(cors({
    origin(origin, callback) {
        if (allowAllOrigins || !origin || rawCorsOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Origin không được phép truy cập API'));
    },
    credentials: false
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/uploads', express.static(uploadRoot));

app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api', limiter);

app.use('/api', routes);

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Pet Marketplace API',
        version: '1.0.0',
        docs: '/api/health'
    });
});

app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Không tìm thấy ${req.originalUrl}`
    });
});

app.use(errorConverter);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Pet Marketplace API running on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION:', err);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    process.exit(1);
});

module.exports = app;
