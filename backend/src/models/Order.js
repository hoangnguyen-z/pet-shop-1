const mongoose = require('mongoose');
const { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS, SHIPPING_STATUS, SHIPPING_METHODS } = require('../config/constants');

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        shop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shop'
        },
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        name: String,
        image: String,
        sku: String,
        price: Number,
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        variant: mongoose.Schema.Types.Mixed,
        isReviewed: {
            type: Boolean,
            default: false
        },
        shopStatus: {
            type: String,
            enum: Object.values(ORDER_STATUS),
            default: ORDER_STATUS.PENDING
        }
    }],
    shippingAddress: {
        fullName: String,
        phone: String,
        email: String,
        addressLine: String,
        street: String,
        city: String,
        district: String,
        ward: String,
        postalCode: String,
        country: { type: String, default: 'Vietnam' }
    },
    billingAddress: {
        fullName: String,
        phone: String,
        street: String,
        city: String,
        district: String,
        ward: String
    },
    subtotal: {
        type: Number,
        required: true
    },
    shippingFee: {
        type: Number,
        default: 0
    },
    shippingMethod: {
        type: String,
        enum: Object.values(SHIPPING_METHODS),
        default: SHIPPING_METHODS.STANDARD
    },
    shippingStatus: {
        type: String,
        enum: Object.values(SHIPPING_STATUS),
        default: SHIPPING_STATUS.PENDING
    },
    discount: {
        type: Number,
        default: 0
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    coupon: {
        couponId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coupon'
        },
        code: String,
        type: String,
        value: Number,
        discountAmount: Number
    },
    total: {
        type: Number,
        required: true
    },
    finalAmount: {
        type: Number,
        required: true
    },
    tax: {
        type: Number,
        default: 0
    },
    paymentMethod: {
        type: String,
        enum: Object.values(PAYMENT_METHODS),
        default: PAYMENT_METHODS.COD
    },
    paymentStatus: {
        type: String,
        enum: Object.values(PAYMENT_STATUS),
        default: PAYMENT_STATUS.UNPAID
    },
    payment: {
        method: {
            type: String,
            enum: Object.values(PAYMENT_METHODS),
            default: PAYMENT_METHODS.COD
        },
        status: {
            type: String,
            enum: Object.values(PAYMENT_STATUS),
            default: PAYMENT_STATUS.PENDING
        },
        transactionId: String,
        paidAt: Date
    },
    status: {
        type: String,
        enum: Object.values(ORDER_STATUS),
        default: ORDER_STATUS.PENDING
    },
    orderStatus: {
        type: String,
        enum: Object.values(ORDER_STATUS),
        default: ORDER_STATUS.PENDING
    },
    statusHistory: [{
        status: String,
        note: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedAt: { type: Date, default: Date.now }
    }],
    tracking: {
        carrier: String,
        trackingNumber: String,
        estimatedDelivery: Date,
        updates: [{
            status: String,
            location: String,
            description: String,
            timestamp: { type: Date, default: Date.now }
        }]
    },
    notes: String,
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

orderSchema.pre('save', async function(next) {
    if (!this.orderNumber) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.orderNumber = `PET${timestamp}${random}`;
    }

    if (!this.finalAmount) this.finalAmount = this.total;
    if (!this.discountAmount) this.discountAmount = this.discount || 0;
    if (!this.paymentMethod) this.paymentMethod = this.payment?.method || PAYMENT_METHODS.COD;
    if (!this.paymentStatus) this.paymentStatus = this.payment?.status || PAYMENT_STATUS.UNPAID;
    if (this.payment) {
        this.payment.method = this.paymentMethod;
        this.payment.status = this.paymentStatus;
    }
    if (!this.orderStatus) this.orderStatus = this.status || ORDER_STATUS.PENDING;
    this.status = this.orderStatus;
    if (!this.shippingStatus) this.shippingStatus = SHIPPING_STATUS.PENDING;
    if (this.shippingAddress && !this.shippingAddress.street && this.shippingAddress.addressLine) {
        this.shippingAddress.street = this.shippingAddress.addressLine;
    }
    if (this.shippingAddress && !this.shippingAddress.addressLine && this.shippingAddress.street) {
        this.shippingAddress.addressLine = this.shippingAddress.street;
    }
    next();
});

orderSchema.index({ buyer: 1 });
orderSchema.index({ 'items.shop': 1 });
orderSchema.index({ 'items.seller': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
