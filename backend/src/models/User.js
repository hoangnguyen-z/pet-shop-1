const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, USER_STATUS } = require('../config/constants');

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
    }]
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
