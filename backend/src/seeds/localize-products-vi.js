const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/Product');
const Category = require('../models/Category');
const env = require('../config/env');
const { localizeCategoryToVi, localizeProductToVi, localizeAttributesToVi } = require('./product-localization');

function normalizeJson(value) {
    return JSON.stringify(value || []);
}

function looksLikeEnglishSeedCopy(text) {
    const clean = String(text || '').trim();
    if (!clean) return true;

    return /demo marketplace product|for testing search|balanced dry food|daily dog treats|daily food mix|floating flakes|durable dog enrichment toy|products and supplies|for .* care|high-quality protein|adult dogs|indoor cats|training, rewards|daily feeding|everyday tropical aquarium feeding|thuộc nhóm chó|thuộc nhóm mèo|thuộc nhóm chim|thuộc nhóm cá|thuộc nhóm thỏ|thuộc nhóm hamster|thuộc nhóm bò sát|thuộc nhóm thú nhỏ|thuộc nhóm thú cưng/i.test(clean);
}

async function localizeCategories() {
    const categories = await Category.find({}).lean();
    let updated = 0;

    for (const category of categories) {
        const localizedCategory = localizeCategoryToVi(category);
        const needsUpdate = localizedCategory.name !== category.name || localizedCategory.description !== category.description;

        if (!needsUpdate) continue;

        await Category.updateOne(
            { _id: category._id },
            {
                $set: {
                    name: localizedCategory.name,
                    description: localizedCategory.description
                }
            }
        );

        updated += 1;
    }

    return updated;
}

async function localizeProducts() {
    const products = await Product.find({ isDeleted: { $ne: true } })
        .populate('category', 'name')
        .lean();

    let updated = 0;

    for (const product of products) {
        const primaryPetType = product.attributes?.find(
            (attribute) => attribute.name === 'Pet Type' || attribute.name === 'Loại thú cưng'
        )?.value || product.tags?.[0];

        const localizedProduct = localizeProductToVi({
            name: product.name,
            brand: product.brand,
            categoryName: product.category?.name,
            petType: primaryPetType,
            attributes: product.attributes
        });

        const localizedAttributes = localizeAttributesToVi(product.attributes || []);
        const update = {};

        if (localizedProduct.name !== product.name) {
            update.name = localizedProduct.name;
            update.shortDescription = localizedProduct.shortDescription;
            update.description = localizedProduct.description;
        } else {
            if (looksLikeEnglishSeedCopy(product.shortDescription)) {
                update.shortDescription = localizedProduct.shortDescription;
            }

            if (looksLikeEnglishSeedCopy(product.description)) {
                update.description = localizedProduct.description;
            }
        }

        if (normalizeJson(localizedAttributes) !== normalizeJson(product.attributes)) {
            update.attributes = localizedAttributes;
        }

        if (!Object.keys(update).length) continue;

        await Product.updateOne({ _id: product._id }, { $set: update });
        updated += 1;
    }

    return updated;
}

async function run() {
    await mongoose.connect(env.mongoUri);

    const updatedCategories = await localizeCategories();
    const updatedProducts = await localizeProducts();

    const samples = await Product.find({ isDeleted: { $ne: true } })
        .select('name shortDescription')
        .limit(12)
        .lean();

    console.log(`Localized ${updatedCategories} categories and ${updatedProducts} products to Vietnamese.`);
    console.log(JSON.stringify(samples, null, 2));

    await mongoose.disconnect();
}

run().catch(async (error) => {
    console.error(error);
    try {
        await mongoose.disconnect();
    } catch (_) {
        // ignore disconnect error during failure path
    }
    process.exit(1);
});
