const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { sendCreated } = require('../middleware/responseHandler');
const ApiError = require('../utils/ApiError');

const router = express.Router();
const uploadRoot = path.join(__dirname, '..', '..', 'uploads');
const allowedFolders = new Set(['avatars', 'shops', 'products', 'general']);
const allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
]);

function normalizeFolder(folder) {
    const normalized = String(folder || 'general').trim().toLowerCase();
    return allowedFolders.has(normalized) ? normalized : 'general';
}

function buildFileName(file = {}) {
    const originalName = String(file.originalname || 'image').replace(/[^\w.-]+/g, '-').toLowerCase();
    const extension = path.extname(originalName) || '.jpg';
    const baseName = path.basename(originalName, extension).replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'image';
    return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${baseName}${extension}`;
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        const folder = normalizeFolder(req.body?.folder || req.query?.folder);
        const targetDir = path.join(uploadRoot, folder);
        fs.mkdirSync(targetDir, { recursive: true });
        req.uploadFolder = folder;
        cb(null, targetDir);
    },
    filename(req, file, cb) {
        cb(null, buildFileName(file));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter(req, file, cb) {
        if (!allowedMimeTypes.has(file.mimetype)) {
            cb(ApiError.badRequest('Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF'));
            return;
        }

        cb(null, true);
    }
});

router.post('/image', authenticate, (req, res, next) => {
    upload.single('image')(req, res, (error) => {
        if (error) {
            if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
                next(ApiError.badRequest('Ảnh tải lên tối đa 5MB'));
                return;
            }

            next(error);
            return;
        }

        next();
    });
}, async (req, res, next) => {
    try {
        if (!req.file) {
            throw ApiError.badRequest('Vui lòng chọn ảnh để tải lên');
        }

        const folder = normalizeFolder(req.uploadFolder);
        const url = `/api/uploads/${folder}/${req.file.filename}`;

        sendCreated(res, 'Tải ảnh lên thành công', {
            url,
            folder,
            originalName: req.file.originalname,
            size: req.file.size,
            mimeType: req.file.mimetype
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
