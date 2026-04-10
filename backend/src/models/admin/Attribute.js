const mongoose = require('mongoose');

const attributeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    type: {
        type: String,
        enum: ['text', 'number', 'boolean', 'select', 'multiselect'],
        default: 'text'
    },
    values: [{
        label: String,
        value: String
    }],
    unit: String,
    isFilterable: {
        type: Boolean,
        default: false
    },
    isSearchable: {
        type: Boolean,
        default: false
    },
    isRequired: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    categoryIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Attribute', attributeSchema);
