const express = require('express');

const router = express.Router();

const {
    Shop,
    CareServiceOffering,
    CareServiceBooking,
    CareServiceReview
} = require('../models');
const { authenticate } = require('../middleware/auth');
const { sendSuccess, sendCreated } = require('../middleware/responseHandler');
const ApiError = require('../utils/ApiError');
const {
    SHOP_STATUS,
    CARE_SERVICE_APPLICATION_STATUS,
    CARE_SERVICE_BOOKING_STATUS
} = require('../config/constants');

const makeShopSlug = (name) => {
    const base = String(name || 'shop')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'shop';
    return `${base}-${Date.now().toString(36)}`;
};

const sanitizeHttpUrl = (value) => {
    if (!value) return undefined;

    try {
        const parsed = new URL(String(value).trim());
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : undefined;
    } catch (error) {
        return undefined;
    }
};

const normalizeCoordinate = (value, min, max) => {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) return undefined;
    return parsed;
};

const sanitizeLocation = (location = {}) => ({
    ...(() => {
        const latitude = normalizeCoordinate(location.latitude, -90, 90);
        return latitude !== undefined ? { latitude } : {};
    })(),
    ...(() => {
        const longitude = normalizeCoordinate(location.longitude, -180, 180);
        return longitude !== undefined ? { longitude } : {};
    })(),
    ...(() => {
        const googleMapsUrl = sanitizeHttpUrl(location.googleMapsUrl);
        return googleMapsUrl ? { googleMapsUrl } : {};
    })(),
    ...(() => {
        const embedUrl = sanitizeHttpUrl(location.embedUrl);
        return embedUrl ? { embedUrl } : {};
    })()
});

function normalizeBookingMode(value = '') {
    return String(value || '').trim().toLowerCase() === 'at_home' ? 'at_home' : 'in_store';
}

function normalizeHomeServiceAddress(address = {}) {
    return {
        addressLine: String(address.addressLine || address.street || '').trim(),
        ward: String(address.ward || '').trim(),
        district: String(address.district || '').trim(),
        city: String(address.city || '').trim(),
        note: String(address.note || '').trim()
    };
}

function parseAppointmentDate(inputDate, timeSlot = '') {
    const base = new Date(inputDate);
    if (Number.isNaN(base.getTime())) return null;

    const match = String(timeSlot || '').trim().match(/^(\d{1,2}):(\d{2})/);
    if (match) {
        base.setHours(Number(match[1]), Number(match[2]), 0, 0);
    } else {
        base.setHours(9, 0, 0, 0);
    }

    return base;
}

function calculateHomeServiceFee(basePrice) {
    const price = Number(basePrice || 0);
    return Number(Math.max(Math.round(price * 0.18), 30000));
}

function buildCareBookingDeadlines(appointmentDate, bookingMode) {
    const appointment = new Date(appointmentDate);
    const cancelHours = bookingMode === 'at_home' ? 6 : 4;
    return {
        cancellationDeadlineAt: new Date(appointment.getTime() - cancelHours * 60 * 60 * 1000),
        rescheduleDeadlineAt: new Date(appointment.getTime() - cancelHours * 60 * 60 * 1000)
    };
}

router.get('/', async (req, res, next) => {
    try {
        const { search, limit = 20, label, verificationLevel } = req.query;
        const filter = { status: SHOP_STATUS.APPROVED };
        const andFilters = [];

        if (search) {
            andFilters.push({ $or: [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ] });
        }

        const normalizedLabel = String(label || verificationLevel || '').trim().toLowerCase();
        if (normalizedLabel) {
            if (normalizedLabel === 'petmall') {
                andFilters.push({ $or: [
                    { labels: { $in: ['petmall'] } },
                    { verificationLevel: 'petmall' }
                ] });
            } else {
                andFilters.push({ $or: [
                    { labels: { $in: [normalizedLabel] } },
                    { verificationLevel: normalizedLabel }
                ] });
            }
        }

        if (andFilters.length) {
            filter.$and = andFilters;
        }

        const shops = await Shop.find(filter)
            .select('name slug logo banner description rating reviewCount productCount address location operatingHours labels verificationLevel careService')
            .sort({ rating: -1, productCount: -1, createdAt: -1 })
            .limit(parseInt(limit, 10));

        sendSuccess(res, 'Lay danh sach cua hang thanh cong', shops);
    } catch (error) {
        next(error);
    }
});

router.post('/', authenticate, async (req, res, next) => {
    try {
        if (req.user.role !== 'seller') {
            throw ApiError.forbidden('Chi tai khoan nguoi ban moi co the tao shop');
        }

        if (!req.user.canAccessSellerCenter) {
            throw ApiError.forbidden('Ban chua duoc Admin phe duyet mo shop. Vui long gui ho so va cho xet duyet.');
        }

        const existingShop = await Shop.findOne({ owner: req.user.id });
        if (existingShop) {
            throw ApiError.conflict('Ban da co shop');
        }

        const { name, description, logo, banner, address, location, phone, email } = req.body;
        const shop = await Shop.create({
            owner: req.user.id,
            name,
            slug: makeShopSlug(name),
            description,
            logo,
            banner,
            address,
            location: sanitizeLocation(location),
            phone,
            email,
            status: SHOP_STATUS.PENDING
        });

        sendCreated(res, 'Tao shop thanh cong', shop);
    } catch (error) {
        next(error);
    }
});

router.get('/my-shop', authenticate, async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user.id });

        if (!shop || shop.status !== SHOP_STATUS.APPROVED) {
            throw ApiError.notFound('Ban chua co shop duoc phe duyet');
        }

        sendSuccess(res, 'Lay thong tin cua hang thanh cong', shop);
    } catch (error) {
        next(error);
    }
});

router.get('/:id/products', async (req, res, next) => {
    try {
        const Product = require('../models/Product');
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const skip = (page - 1) * limit;
        const shop = await Shop.findById(req.params.id);

        if (!shop || shop.status !== SHOP_STATUS.APPROVED) {
            throw ApiError.notFound('Cua hang khong ton tai');
        }

        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [products, total] = await Promise.all([
            Product.find({ shop: shop._id, isActive: true })
                .populate('category', 'name slug')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit, 10)),
            Product.countDocuments({ shop: shop._id, isActive: true })
        ]);

        sendSuccess(res, 'Lay san pham cua shop thanh cong', {
            shop,
            products,
            pagination: {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ _id: req.params.id, status: SHOP_STATUS.APPROVED });

        if (!shop) {
            throw ApiError.notFound('Cua hang khong ton tai');
        }

        sendSuccess(res, 'Lay thong tin cua hang thanh cong', shop);
    } catch (error) {
        next(error);
    }
});

router.get('/:id/care-services', async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ _id: req.params.id, status: SHOP_STATUS.APPROVED });

        if (!shop) {
            throw ApiError.notFound('Cua hang khong ton tai');
        }

        if (!shop.careService?.isEnabled || shop.careService?.status !== CARE_SERVICE_APPLICATION_STATUS.APPROVED) {
            sendSuccess(res, 'Shop chua kich hoat dich vu cham soc', {
                shop,
                careService: null,
                offerings: [],
                reviews: [],
                stats: {
                    totalBookings: 0,
                    reviewCount: 0,
                    averageRating: 0
                }
            });
            return;
        }

        const [offerings, reviews, bookingCount] = await Promise.all([
            CareServiceOffering.find({ shop: shop._id, isActive: true }).sort({ createdAt: -1 }),
            CareServiceReview.find({ shop: shop._id })
                .populate('buyer', 'name avatar')
                .populate('service', 'name serviceType')
                .sort({ createdAt: -1 })
                .limit(12),
            CareServiceBooking.countDocuments({ shop: shop._id, status: CARE_SERVICE_BOOKING_STATUS.COMPLETED })
        ]);

        const reviewCount = reviews.length;
        const averageRating = reviewCount
            ? reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / reviewCount
            : 0;

        sendSuccess(res, 'Lay thong tin dich vu cham soc cua shop thanh cong', {
            shop,
            careService: shop.careService,
            offerings,
            reviews,
            stats: {
                totalBookings: bookingCount,
                reviewCount,
                averageRating
            }
        });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/care-services/bookings', authenticate, async (req, res, next) => {
    try {
        if (req.user.role !== 'buyer') {
            throw ApiError.forbidden('Chi tai khoan nguoi mua moi duoc dat lich dich vu cham soc');
        }

        const shop = await Shop.findOne({ _id: req.params.id, status: SHOP_STATUS.APPROVED });
        if (!shop) {
            throw ApiError.notFound('Cua hang khong ton tai');
        }

        if (!shop.careService?.isEnabled || shop.careService?.status !== CARE_SERVICE_APPLICATION_STATUS.APPROVED) {
            throw ApiError.badRequest('Shop chua duoc phe duyet dich vu cham soc');
        }

        const service = await CareServiceOffering.findOne({
            _id: req.body.serviceId,
            shop: shop._id,
            isActive: true
        });
        if (!service) {
            throw ApiError.notFound('Khong tim thay dich vu cham soc');
        }

        const bookingMode = normalizeBookingMode(req.body.bookingMode);
        const appointmentDate = parseAppointmentDate(req.body.appointmentDate, req.body.timeSlot);
        if (!appointmentDate || Number.isNaN(appointmentDate.getTime())) {
            throw ApiError.badRequest('Ngay hen khong hop le');
        }
        if (appointmentDate.getTime() < Date.now() - 5 * 60 * 1000) {
            throw ApiError.badRequest('Ngay hen phai lon hon thoi diem hien tai');
        }

        if (bookingMode === 'at_home' && (!shop.careService?.supportsHomeService || !service.supportsHomeService)) {
            throw ApiError.badRequest('Dich vu nay hien khong ho tro cham soc tai nha');
        }

        const homeServiceAddress = normalizeHomeServiceAddress(req.body.homeServiceAddress || {});
        if (bookingMode === 'at_home' && (!homeServiceAddress.addressLine || !homeServiceAddress.city)) {
            throw ApiError.badRequest('Vui long nhap day du dia chi de su dung dich vu tai nha');
        }

        const branchName = String(req.body.branchName || shop.careService?.facilityName || shop.name || '').trim();
        const travelSurcharge = bookingMode === 'at_home' ? calculateHomeServiceFee(service.price) : 0;
        const deadlines = buildCareBookingDeadlines(appointmentDate, bookingMode);

        const booking = await CareServiceBooking.create({
            shop: shop._id,
            service: service._id,
            buyer: req.user._id,
            contactName: String(req.body.contactName || req.user.name || '').trim(),
            contactPhone: String(req.body.contactPhone || req.user.phone || '').trim(),
            contactEmail: String(req.body.contactEmail || req.user.email || '').trim().toLowerCase(),
            petName: String(req.body.petName || '').trim(),
            petType: String(req.body.petType || '').trim(),
            bookingMode,
            branchName,
            homeServiceAddress: bookingMode === 'at_home' ? homeServiceAddress : undefined,
            notes: String(req.body.notes || '').trim(),
            appointmentDate,
            timeSlot: String(req.body.timeSlot || '').trim(),
            durationMinutes: Number(service.durationMinutes || 0),
            priceSnapshot: Number(service.price || 0),
            travelSurcharge,
            totalAmount: Number(service.price || 0) + travelSurcharge,
            buyerNote: String(req.body.notes || '').trim(),
            cancellationDeadlineAt: deadlines.cancellationDeadlineAt,
            rescheduleDeadlineAt: deadlines.rescheduleDeadlineAt
        });

        sendCreated(res, 'Dat lich dich vu cham soc thanh cong', booking);
    } catch (error) {
        next(error);
    }
});

router.put('/my-shop', authenticate, async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user.id });

        if (!shop) {
            throw ApiError.notFound('Ban chua co shop');
        }

        const allowedFields = ['name', 'description', 'logo', 'banner', 'address', 'location', 'phone', 'email', 'policies', 'operatingHours'];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                if (field === 'location') {
                    shop[field] = sanitizeLocation(req.body[field]);
                    return;
                }

                shop[field] = req.body[field];
            }
        });

        await shop.save();

        sendSuccess(res, 'Cap nhat cua hang thanh cong', shop);
    } catch (error) {
        next(error);
    }
});

router.put('/my-shop/bank', authenticate, async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user.id });

        if (!shop) {
            throw ApiError.notFound('Ban chua co shop');
        }

        const { bankName, bankAccount, accountHolder } = req.body;

        shop.bankAccount = { bankName, bankAccount, accountHolder };
        await shop.save();

        sendSuccess(res, 'Cap nhat tai khoan ngan hang thanh cong', shop);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
