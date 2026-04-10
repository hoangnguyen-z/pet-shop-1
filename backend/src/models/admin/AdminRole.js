const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    slug: {
        type: String,
        unique: true,
        sparse: true
    },
    description: String,
    permissions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission'
    }],
    isSystem: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

roleSchema.pre('validate', function(next) {
    if (!this.code && this.slug) this.code = this.slug;
    if (!this.slug && this.code) this.slug = this.code;
    next();
});

module.exports = mongoose.model('AdminRole', roleSchema);
