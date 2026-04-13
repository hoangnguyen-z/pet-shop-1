const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
    ROLES,
    USER_STATUS,
    SELLER_APPLICATION_STATUS,
    SELLER_APPLICATION_TYPE,
    SHOP_VERIFICATION_LEVEL,
    SHOP_LABELS
} = require('../config/constants');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên là bắt buộc'],
        trim: true,
        maxlength: [100, 'Tên không quá 100 ký tự']
    },
    email: {
        type: String,
        required: [true, 'Email là bắt buộc'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Mật khẩu là bắt buộc'],
        minlength: [6, 'Mật khẩu tối thiểu 6 ký tự'],
        select: false
    },
    phone: {
        type: String,
        trim: true
    },
    avatar: {
        type: String
    },
    dateOfBirth: {
        type: Date,
        default: null
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', null],
        default: null
    },
    role: {
        type: String,
        enum: Object.values(ROLES),
        default: ROLES.BUYER
    },
    status: {
        type: String,
        enum: Object.values(USER_STATUS),
        default: USER_STATUS.ACTIVE
    },
    addresses: [{
        fullName: String,
        phone: String,
        street: String,
        city: String,
        district: String,
        ward: String,
        isDefault: { type: Boolean, default: false }
    }],
    refreshToken: String,
    lastLoginAt: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    passwordChangedAt: Date,
    cart: {
        items: [{
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            quantity: { type: Number, default: 1 },
            addedAt: { type: Date, default: Date.now }
        }]
    },
    wishlist: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        addedAt: { type: Date, default: Date.now }
    }],
    linkedPaymentAccounts: [{
        providerType: {
            type: String,
            enum: ['bank', 'wallet', 'gateway'],
            default: 'gateway'
        },
        providerCode: {
            type: String,
            trim: true
        },
        providerName: {
            type: String,
            trim: true
        },
        accountName: {
            type: String,
            trim: true
        },
        accountIdentifier: {
            type: String,
            trim: true
        },
        accountMask: {
            type: String,
            trim: true
        },
        isDefault: {
            type: Boolean,
            default: false
        },
        savedAt: {
            type: Date,
            default: Date.now
        }
    }],
    sellerProfile: {
        applicationStatus: {
            type: String,
            enum: Object.values(SELLER_APPLICATION_STATUS)
        },
        applicationType: {
            type: String,
            enum: Object.values(SELLER_APPLICATION_TYPE)
        },
        verificationLevel: {
            type: String,
            enum: Object.values(SHOP_VERIFICATION_LEVEL)
        },
        labels: [{
            type: String,
            enum: Object.values(SHOP_LABELS)
        }],
        applicationSubmittedAt: Date,
        approvedAt: Date,
        suspendedAt: Date,
        permanentlyBannedAt: Date
    }
}, {
    timestamps: true
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    delete obj.refreshToken;
    return obj;
};

module.exports = mongoose.model('User', userSchema);
