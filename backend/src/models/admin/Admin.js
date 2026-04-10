const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    phone: String,
    avatar: String,
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminRole'
    },
    roles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminRole'
    }],
    isSuperAdmin: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'locked'],
        default: 'active'
    },
    lastLogin: Date,
    lastLoginAt: Date,
    lastLoginIp: String,
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,
    lockedUntil: Date,
    refreshToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    permissions: [String],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, {
    timestamps: true
});

adminSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

adminSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

adminSchema.methods.validatePassword = function(candidatePassword) {
    return bcrypt.compareSync(candidatePassword, this.password);
};

adminSchema.methods.isLocked = function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

adminSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    delete obj.refreshToken;
    return obj;
};

module.exports = mongoose.model('Admin', adminSchema);
