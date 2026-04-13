const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const { authenticate } = require('../middleware/auth');
const { sendCreated } = require('../middleware/responseHandler');
const ApiError = require('../utils/ApiError');

const router = express.Router();
const uploadRoot = path.join(__dirname, '..', '..', 'uploads');
const allowedFolders = new Set(['avatars', 'shops', 'products', 'general', 'documents']);
const allowedImageMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
]);
const allowedDocumentMimeTypes = new Set([
    ...allowedImageMimeTypes,
    'application/pdf'
]);

function normalizeFolder(folder) {
    const normalized = String(folder || 'general').trim().toLowerCase();
    return allowedFolders.has(normalized) ? normalized : 'general';
}

function buildFileName(file = {}) {
    const originalName = String(file.originalname || 'file').replace(/[^\w.-]+/g, '-').toLowerCase();
    const extension = path.extname(originalName) || '.bin';
    const baseName = path.basename(originalName, extension).replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'file';
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

const imageUpload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(req, file, cb) {
        if (!allowedImageMimeTypes.has(file.mimetype)) {
            cb(ApiError.badRequest('Chi ho tro anh JPG, PNG, WEBP hoac GIF'));
            return;
        }

        cb(null, true);
    }
});

const documentUpload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter(req, file, cb) {
        if (!allowedDocumentMimeTypes.has(file.mimetype)) {
            cb(ApiError.badRequest('Chi ho tro tep JPG, PNG, WEBP, GIF hoac PDF'));
            return;
        }

        cb(null, true);
    }
});

function handleMulter(uploadMiddleware, fieldName, tooLargeMessage) {
    return (req, res, next) => {
        uploadMiddleware.single(fieldName)(req, res, (error) => {
            if (error) {
                if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
                    next(ApiError.badRequest(tooLargeMessage));
                    return;
                }

                next(error);
                return;
            }

            next();
        });
    };
}

function sendUploadSuccess(res, file, folder, message) {
    const url = `/api/uploads/${folder}/${file.filename}`;
    sendCreated(res, message, {
        url,
        folder,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
    });
}

router.post('/image', authenticate, handleMulter(imageUpload, 'image', 'Anh tai len toi da 5MB'), async (req, res, next) => {
    try {
        if (!req.file) {
            throw ApiError.badRequest('Vui long chon anh de tai len');
        }

        sendUploadSuccess(res, req.file, normalizeFolder(req.uploadFolder), 'Tai anh len thanh cong');
    } catch (error) {
        next(error);
    }
});

router.post('/document', authenticate, handleMulter(documentUpload, 'document', 'Tai lieu tai len toi da 10MB'), async (req, res, next) => {
    try {
        if (!req.file) {
            throw ApiError.badRequest('Vui long chon tai lieu de tai len');
        }

        sendUploadSuccess(res, req.file, normalizeFolder(req.uploadFolder || 'documents'), 'Tai tai lieu len thanh cong');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
