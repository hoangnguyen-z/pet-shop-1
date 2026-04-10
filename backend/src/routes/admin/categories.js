const express = require('express');
const router = express.Router();
const Category = require('../../models/Category');
const Brand = require('../../models/admin/Brand');
const Attribute = require('../../models/admin/Attribute');
const AuditLog = require('../../models/admin/AuditLog');
const { authenticateAdmin } = require('../../middleware/adminAuth');
const { checkPermission } = require('../../middleware/permissionGuard');
const { sendSuccess, sendCreated } = require('../../middleware/responseHandler');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const slugify = value => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const audit = async (req, action, resource, resourceId, description) => {
    await AuditLog.create({
        admin: req.admin._id,
        action,
        resource,
        resourceId,
        description,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
    });
};

const normalizeAttributeValues = values => {
    if (!Array.isArray(values)) return [];
    return values.map(item => {
        if (typeof item === 'string') {
            return { label: item, value: slugify(item) || item };
        }
        return {
            label: item.label || item.value,
            value: item.value || slugify(item.label)
        };
    }).filter(item => item.label && item.value);
};

const getAllCategories = asyncHandler(async (req, res) => {
    const { isActive } = req.query;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const categories = await Category.find(query)
        .populate('parent', 'name slug')
        .sort({ order: 1, name: 1 });

    sendSuccess(res, categories);
});

const getCategoryById = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id)
        .populate('parent', 'name slug');

    if (!category) throw ApiError.notFound('Category not found');
    sendSuccess(res, category);
});

const createCategory = asyncHandler(async (req, res) => {
    const { name, slug, description, icon, image, parent, isActive, order } = req.body;

    if (!name) throw ApiError.badRequest('Category name is required');

    const categorySlug = slug || slugify(name);
    const existing = await Category.findOne({ slug: categorySlug });
    if (existing) throw ApiError.badRequest('Category slug already exists');

    const category = new Category({
        name,
        slug: categorySlug,
        description,
        icon,
        image,
        parent: parent || null,
        isActive: isActive !== false,
        order: order || 0
    });

    await category.save();
    await audit(req, 'create', 'category', category._id, `Created category: ${name}`);
    sendCreated(res, category, 'Category created');
});

const updateCategory = asyncHandler(async (req, res) => {
    const { name, slug, description, icon, image, parent, isActive, order } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) throw ApiError.notFound('Category not found');

    if (name) category.name = name;
    if (slug) category.slug = slug;
    if (description !== undefined) category.description = description;
    if (icon !== undefined) category.icon = icon;
    if (image !== undefined) category.image = image;
    if (parent !== undefined) category.parent = parent || null;
    if (isActive !== undefined) category.isActive = isActive;
    if (order !== undefined) category.order = order;

    await category.save();
    await audit(req, 'update', 'category', category._id, `Updated category: ${category.name}`);
    sendSuccess(res, category, 'Category updated');
});

const deleteCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) throw ApiError.notFound('Category not found');

    const hasChildren = await Category.countDocuments({ parent: category._id });
    if (hasChildren > 0) throw ApiError.badRequest('Cannot delete a category that has children');

    await Category.findByIdAndDelete(req.params.id);
    await audit(req, 'delete', 'category', req.params.id, `Deleted category: ${category.name}`);
    sendSuccess(res, null, 'Category deleted');
});

const getBrands = asyncHandler(async (req, res) => {
    const { search, isActive } = req.query;
    const query = {};
    if (search) query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
    ];
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const brands = await Brand.find(query).sort({ name: 1 });
    sendSuccess(res, brands);
});

const createBrand = asyncHandler(async (req, res) => {
    const { name, slug, logo, banner, website, country, description, isVerified, isActive } = req.body;

    if (!name) throw ApiError.badRequest('Brand name is required');

    const brand = new Brand({
        name,
        slug: slug || slugify(name),
        logo,
        banner,
        website,
        country,
        description,
        isVerified: !!isVerified,
        isActive: isActive !== false
    });

    await brand.save();
    sendCreated(res, brand, 'Brand created');
});

const updateBrand = asyncHandler(async (req, res) => {
    const { name, slug, logo, banner, website, country, description, isVerified, isActive } = req.body;
    const brand = await Brand.findById(req.params.id);

    if (!brand) throw ApiError.notFound('Brand not found');

    if (name) brand.name = name;
    if (slug) brand.slug = slug;
    if (logo !== undefined) brand.logo = logo;
    if (banner !== undefined) brand.banner = banner;
    if (website !== undefined) brand.website = website;
    if (country !== undefined) brand.country = country;
    if (description !== undefined) brand.description = description;
    if (isVerified !== undefined) brand.isVerified = isVerified;
    if (isActive !== undefined) brand.isActive = isActive;

    await brand.save();
    sendSuccess(res, brand, 'Brand updated');
});

const deleteBrand = asyncHandler(async (req, res) => {
    const brand = await Brand.findByIdAndDelete(req.params.id);
    if (!brand) throw ApiError.notFound('Brand not found');
    sendSuccess(res, null, 'Brand deleted');
});

const getAttributes = asyncHandler(async (req, res) => {
    const { type, isActive } = req.query;
    const query = {};
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const attributes = await Attribute.find(query)
        .populate('categoryIds', 'name slug')
        .sort({ type: 1, name: 1 });
    sendSuccess(res, attributes);
});

const createAttribute = asyncHandler(async (req, res) => {
    const {
        name,
        code,
        slug,
        type,
        values,
        unit,
        isFilterable,
        isSearchable,
        isRequired,
        isActive,
        categoryIds
    } = req.body;

    if (!name) throw ApiError.badRequest('Attribute name is required');

    const attributeCode = code || slug || slugify(name);
    const existing = await Attribute.findOne({ code: attributeCode });
    if (existing) throw ApiError.badRequest('Attribute code already exists');

    const attribute = new Attribute({
        name,
        code: attributeCode,
        type: type || 'text',
        values: normalizeAttributeValues(values),
        unit,
        isFilterable: !!isFilterable,
        isSearchable: !!isSearchable,
        isRequired: !!isRequired,
        isActive: isActive !== false,
        categoryIds: categoryIds || []
    });

    await attribute.save();
    sendCreated(res, attribute, 'Attribute created');
});

const updateAttribute = asyncHandler(async (req, res) => {
    const {
        name,
        code,
        slug,
        type,
        values,
        unit,
        isFilterable,
        isSearchable,
        isRequired,
        isActive,
        categoryIds
    } = req.body;
    const attribute = await Attribute.findById(req.params.id);

    if (!attribute) throw ApiError.notFound('Attribute not found');

    if (name) attribute.name = name;
    if (code || slug) attribute.code = code || slug;
    if (type) attribute.type = type;
    if (values) attribute.values = normalizeAttributeValues(values);
    if (unit !== undefined) attribute.unit = unit;
    if (isFilterable !== undefined) attribute.isFilterable = isFilterable;
    if (isSearchable !== undefined) attribute.isSearchable = isSearchable;
    if (isRequired !== undefined) attribute.isRequired = isRequired;
    if (isActive !== undefined) attribute.isActive = isActive;
    if (categoryIds !== undefined) attribute.categoryIds = categoryIds;

    await attribute.save();
    sendSuccess(res, attribute, 'Attribute updated');
});

const deleteAttribute = asyncHandler(async (req, res) => {
    const attribute = await Attribute.findByIdAndDelete(req.params.id);
    if (!attribute) throw ApiError.notFound('Attribute not found');
    sendSuccess(res, null, 'Attribute deleted');
});

router.use(authenticateAdmin);

router.get('/categories', checkPermission('categories.view'), getAllCategories);
router.get('/categories/:id', checkPermission('categories.view'), getCategoryById);
router.post('/categories', checkPermission('categories.create'), createCategory);
router.put('/categories/:id', checkPermission('categories.update'), updateCategory);
router.delete('/categories/:id', checkPermission('categories.delete'), deleteCategory);

router.get('/brands', checkPermission('brands.view'), getBrands);
router.post('/brands', checkPermission('brands.create'), createBrand);
router.put('/brands/:id', checkPermission('brands.update'), updateBrand);
router.delete('/brands/:id', checkPermission('brands.delete'), deleteBrand);

router.get('/attributes', checkPermission('attributes.view'), getAttributes);
router.post('/attributes', checkPermission('attributes.create'), createAttribute);
router.put('/attributes/:id', checkPermission('attributes.update'), updateAttribute);
router.delete('/attributes/:id', checkPermission('attributes.delete'), deleteAttribute);

module.exports = router;
