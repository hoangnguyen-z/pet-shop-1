const mongoose = require('mongoose');
const { CARE_SERVICE_BOOKING_STATUS } = require('../config/constants');

const careServiceBookingSchema = new mongoose.Schema({
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CareServiceOffering',
        required: true
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    contactName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    contactPhone: {
        type: String,
        required: true,
        trim: true
    },
    contactEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    petName: {
        type: String,
        trim: true,
        maxlength: 120
    },
    petType: {
        type: String,
        trim: true,
        maxlength: 80
    },
    bookingMode: {
        type: String,
        enum: ['in_store', 'at_home'],
        default: 'in_store'
    },
    branchName: {
        type: String,
        trim: true,
        maxlength: 160
    },
    homeServiceAddress: {
        addressLine: {
            type: String,
            trim: true,
            maxlength: 240
        },
        ward: {
            type: String,
            trim: true,
            maxlength: 120
        },
        district: {
            type: String,
            trim: true,
            maxlength: 120
        },
        city: {
            type: String,
            trim: true,
            maxlength: 120
        },
        note: {
            type: String,
            trim: true,
            maxlength: 500
        }
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    appointmentDate: {
        type: Date,
        required: true
    },
    timeSlot: {
        type: String,
        trim: true,
        maxlength: 80
    },
    durationMinutes: {
        type: Number,
        min: 15
    },
    priceSnapshot: {
        type: Number,
        min: 0,
        default: 0
    },
    travelSurcharge: {
        type: Number,
        min: 0,
        default: 0
    },
    totalAmount: {
        type: Number,
        min: 0,
        default: 0
    },
    status: {
        type: String,
        enum: Object.values(CARE_SERVICE_BOOKING_STATUS),
        default: CARE_SERVICE_BOOKING_STATUS.PENDING
    },
    sellerNote: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    buyerNote: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    confirmedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    rejectedAt: Date,
    reviewedAt: Date,
    cancellationDeadlineAt: Date,
    rescheduleDeadlineAt: Date,
    rescheduledAt: Date,
    rescheduleCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

careServiceBookingSchema.index({ shop: 1, status: 1, appointmentDate: -1 });
careServiceBookingSchema.index({ buyer: 1, appointmentDate: -1 });

module.exports = mongoose.model('CareServiceBooking', careServiceBookingSchema);
