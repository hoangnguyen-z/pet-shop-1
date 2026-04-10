const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
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
    group: String,
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

permissionSchema.pre('validate', function(next) {
    if (!this.code && this.slug) this.code = this.slug;
    if (!this.slug && this.code) this.slug = this.code;
    if (!this.group) this.group = 'system';
    next();
});

module.exports = mongoose.model('Permission', permissionSchema);
