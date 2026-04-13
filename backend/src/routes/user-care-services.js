const express = require('express');

const router = express.Router();

const {
    CareServiceBooking,
    CareServiceReview
} = require('../models');
const { authenticate } = require('../middleware/auth');
const { sendSuccess, sendCreated } = require('../middleware/responseHandler');
const ApiError = require('../utils/ApiError');
const { CARE_SERVICE_BOOKING_STATUS } = require('../config/constants');

function requireBuyer(req, res, next) {
    if (req.user.role !== 'buyer') {
        return next(ApiError.forbidden('Chi tai khoan nguoi mua moi duoc su dung lich hen dich vu cham soc'));
    }
    next();
}

function getCareBookingCutoffHours(booking) {
    return String(booking.bookingMode || '').toLowerCase() === 'at_home' ? 6 : 4;
}

function canBuyerManageBooking(booking) {
    if (![CARE_SERVICE_BOOKING_STATUS.PENDING, CARE_SERVICE_BOOKING_STATUS.CONFIRMED].includes(booking.status)) {
        return false;
    }

    const deadline = booking.rescheduleDeadlineAt || booking.cancellationDeadlineAt;
    if (!deadline) return true;
    return new Date(deadline).getTime() > Date.now();
}

function parseAppointmentDate(inputDate, timeSlot = '') {
    const base = new Date(inputDate);
    if (Number.isNaN(base.getTime())) return null;

    const match = String(timeSlot || '').trim().match(/^(\d{1,2}):(\d{2})/);
    if (match) {
        base.setHours(Number(match[1]), Number(match[2]), 0, 0);
    }

    return base;
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

function buildDeadlines(appointmentDate, bookingMode) {
    const cutoffHours = bookingMode === 'at_home' ? 6 : 4;
    return {
        cancellationDeadlineAt: new Date(appointmentDate.getTime() - cutoffHours * 60 * 60 * 1000),
        rescheduleDeadlineAt: new Date(appointmentDate.getTime() - cutoffHours * 60 * 60 * 1000)
    };
}

router.use(authenticate);
router.use(requireBuyer);

router.get('/bookings', async (req, res, next) => {
    try {
        const filter = { buyer: req.user._id };
        if (req.query.status && Object.values(CARE_SERVICE_BOOKING_STATUS).includes(req.query.status)) {
            filter.status = req.query.status;
        }

        const bookings = await CareServiceBooking.find(filter)
            .populate('shop', 'name logo banner careService location address')
            .populate('service', 'name serviceType price durationMinutes image supportsHomeService')
            .sort({ appointmentDate: -1 });

        sendSuccess(res, 'Lay lich hen dich vu cham soc thanh cong', bookings);
    } catch (error) {
        next(error);
    }
});

router.get('/bookings/:id', async (req, res, next) => {
    try {
        const booking = await CareServiceBooking.findOne({ _id: req.params.id, buyer: req.user._id })
            .populate('shop', 'name logo banner careService location address')
            .populate('service', 'name serviceType price durationMinutes image supportsHomeService');

        if (!booking) {
            throw ApiError.notFound('Khong tim thay lich hen dich vu');
        }

        const review = await CareServiceReview.findOne({ booking: booking._id });
        sendSuccess(res, 'Lay chi tiet lich hen dich vu thanh cong', { booking, review });
    } catch (error) {
        next(error);
    }
});

router.put('/bookings/:id/cancel', async (req, res, next) => {
    try {
        const booking = await CareServiceBooking.findOne({ _id: req.params.id, buyer: req.user._id });
        if (!booking) {
            throw ApiError.notFound('Khong tim thay lich hen dich vu');
        }

        if (!canBuyerManageBooking(booking)) {
            throw ApiError.badRequest(`Lich hen hien tai khong the huy. Vui long huy truoc it nhat ${getCareBookingCutoffHours(booking)} gio.`);
        }

        booking.status = CARE_SERVICE_BOOKING_STATUS.CANCELLED;
        booking.buyerNote = req.body.note !== undefined ? String(req.body.note || '').trim() : booking.buyerNote;
        booking.cancelledAt = new Date();
        await booking.save();

        sendSuccess(res, 'Huy lich hen dich vu thanh cong', booking);
    } catch (error) {
        next(error);
    }
});

router.put('/bookings/:id/reschedule', async (req, res, next) => {
    try {
        const booking = await CareServiceBooking.findOne({ _id: req.params.id, buyer: req.user._id })
            .populate('service', 'supportsHomeService');

        if (!booking) {
            throw ApiError.notFound('Khong tim thay lich hen dich vu');
        }

        if (!canBuyerManageBooking(booking)) {
            throw ApiError.badRequest(`Lich hen hien tai khong the doi lich. Vui long doi lich truoc it nhat ${getCareBookingCutoffHours(booking)} gio.`);
        }

        const appointmentDate = parseAppointmentDate(req.body.appointmentDate, req.body.timeSlot || booking.timeSlot);
        if (!appointmentDate || Number.isNaN(appointmentDate.getTime())) {
            throw ApiError.badRequest('Ngay hen moi khong hop le');
        }
        if (appointmentDate.getTime() < Date.now() + 10 * 60 * 1000) {
            throw ApiError.badRequest('Khung gio moi phai lon hon thoi diem hien tai');
        }

        booking.appointmentDate = appointmentDate;
        booking.timeSlot = String(req.body.timeSlot || booking.timeSlot || '').trim();
        booking.branchName = req.body.branchName !== undefined ? String(req.body.branchName || '').trim() : booking.branchName;
        booking.notes = req.body.notes !== undefined ? String(req.body.notes || '').trim() : booking.notes;
        booking.buyerNote = booking.notes;

        if (String(booking.bookingMode || '') === 'at_home') {
            const nextAddress = normalizeHomeServiceAddress(req.body.homeServiceAddress || {});
            booking.homeServiceAddress = {
                ...(booking.homeServiceAddress?.toObject?.() || booking.homeServiceAddress || {}),
                ...nextAddress
            };
        }

        const deadlines = buildDeadlines(appointmentDate, booking.bookingMode);
        booking.cancellationDeadlineAt = deadlines.cancellationDeadlineAt;
        booking.rescheduleDeadlineAt = deadlines.rescheduleDeadlineAt;
        booking.rescheduledAt = new Date();
        booking.rescheduleCount = Number(booking.rescheduleCount || 0) + 1;
        booking.status = CARE_SERVICE_BOOKING_STATUS.PENDING;
        booking.confirmedAt = undefined;
        await booking.save();

        sendSuccess(res, 'Doi lich hen dich vu thanh cong', booking);
    } catch (error) {
        next(error);
    }
});

router.post('/bookings/:id/reviews', async (req, res, next) => {
    try {
        const booking = await CareServiceBooking.findOne({ _id: req.params.id, buyer: req.user._id });
        if (!booking) {
            throw ApiError.notFound('Khong tim thay lich hen dich vu');
        }

        if (booking.status !== CARE_SERVICE_BOOKING_STATUS.COMPLETED) {
            throw ApiError.badRequest('Chi co the danh gia sau khi lich hen da hoan thanh');
        }

        const rating = Number(req.body.rating || 0);
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            throw ApiError.badRequest('Diem danh gia phai tu 1 den 5 sao');
        }

        const review = await CareServiceReview.findOneAndUpdate(
            { booking: booking._id },
            {
                booking: booking._id,
                shop: booking.shop,
                service: booking.service,
                buyer: req.user._id,
                rating,
                comment: String(req.body.comment || '').trim(),
                images: Array.isArray(req.body.images) ? req.body.images.filter(Boolean) : []
            },
            { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
        );

        booking.reviewedAt = new Date();
        await booking.save();

        sendCreated(res, 'Gui danh gia dich vu thanh cong', review);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
