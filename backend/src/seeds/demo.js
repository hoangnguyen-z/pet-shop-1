const mongoose = require('mongoose');
require('dotenv').config();

const { User, Shop, Category, Product, Coupon, Promotion, Banner } = require('../models');
const Article = require('../models/admin/Article');
const Page = require('../models/admin/Page');
const SiteSetting = require('../models/admin/SiteSetting');
const { ROLES, SHOP_STATUS, COUPON_TYPES, COUPON_STATUS } = require('../config/constants');
const { getDemoShopLocation } = require('./shop-location-pool');
const { unsplashPhoto } = require('./storefront-media');
const { localizeCategoryToVi, localizeProductToVi } = require('./product-localization');

const image = (id) => {
    if (String(id).startsWith('http') || String(id).startsWith('/')) return id;
    if (!id) return unsplashPhoto('photo-1548199973-03cce0bbc87b');
    return unsplashPhoto(id);
};

const categories = [
    { name: 'Dog Food', slug: 'dog-food', icon: 'dog', order: 1 },
    { name: 'Cat Food', slug: 'cat-food', icon: 'cat', order: 2 },
    { name: 'Treats', slug: 'treats', icon: 'bone', order: 3 },
    { name: 'Toys', slug: 'toys', icon: 'ball', order: 4 },
    { name: 'Bird Supplies', slug: 'bird-supplies', icon: 'bird', order: 5 },
    { name: 'Fish Supplies', slug: 'fish-supplies', icon: 'fish', order: 6 }
];

const products = [
    {
        name: 'Blue Buffalo Life Protection Adult Dog Food',
        slug: 'blue-buffalo-life-protection-adult-dog-food',
        sku: 'DEMO-DOG-FOOD-001',
        categorySlug: 'dog-food',
        brand: 'Blue Buffalo',
        price: 42.99,
        originalPrice: 54.99,
        stock: 80,
        soldCount: 245,
        rating: 4.7,
        reviewCount: 128,
        isFeatured: true,
        tags: ['dog', 'food', 'adult'],
        images: [image('photo-1589924691995-400dc9ecc119')],
        shortDescription: 'Balanced dry food for adult dogs.',
        description: 'A complete daily dog food with protein, vitamins, minerals, and digestible grains for adult dogs.'
    },
    {
        name: 'Purina ONE Indoor Advantage Dry Cat Food',
        slug: 'purina-one-indoor-advantage-dry-cat-food',
        sku: 'DEMO-CAT-FOOD-001',
        categorySlug: 'cat-food',
        brand: 'Purina ONE',
        price: 38.49,
        originalPrice: 45.99,
        stock: 65,
        soldCount: 183,
        rating: 4.8,
        reviewCount: 96,
        isFeatured: true,
        tags: ['cat', 'food', 'indoor'],
        images: [image('photo-1583337130417-3346a1be7dee')],
        shortDescription: 'Dry food for indoor cats.',
        description: 'Indoor cat nutrition with high-quality protein and fiber support for a healthy routine.'
    },
    {
        name: 'Pedigree Adult Complete Nutrition Dog Treats',
        slug: 'pedigree-adult-complete-nutrition-dog-treats',
        sku: 'DEMO-DOG-TREAT-001',
        categorySlug: 'treats',
        brand: 'Pedigree',
        price: 15.99,
        originalPrice: 21.99,
        stock: 120,
        soldCount: 340,
        rating: 4.5,
        reviewCount: 212,
        isFeatured: true,
        tags: ['dog', 'treats'],
        images: [image('photo-1568640347023-a616a30bc3bd')],
        shortDescription: 'Crunchy daily dog treats.',
        description: 'Tasty treats for adult dogs, useful for training, rewards, and daily bonding.'
    },
    {
        name: 'Kaytee Forti-Diet Pro Health Bird Food',
        slug: 'kaytee-forti-diet-pro-health-bird-food',
        sku: 'DEMO-BIRD-FOOD-001',
        categorySlug: 'bird-supplies',
        brand: 'Kaytee',
        price: 12.99,
        originalPrice: 16.99,
        stock: 54,
        soldCount: 86,
        rating: 4.4,
        reviewCount: 42,
        isFeatured: true,
        tags: ['bird', 'food'],
        images: [image('photo-1552728089-57bdde30beb3')],
        shortDescription: 'Daily food mix for birds.',
        description: 'A balanced bird food blend for daily feeding with seeds, grains, and nutrients.'
    },
    {
        name: 'Tropical Fish Flakes',
        slug: 'tropical-fish-flakes',
        sku: 'DEMO-FISH-FOOD-001',
        categorySlug: 'fish-supplies',
        brand: 'Tetra',
        price: 8.49,
        originalPrice: 10.99,
        stock: 90,
        soldCount: 155,
        rating: 4.6,
        reviewCount: 67,
        isFeatured: true,
        tags: ['fish', 'food'],
        images: [image('photo-1522069169874-c58ec4b76be5')],
        shortDescription: 'Floating flakes for tropical fish.',
        description: 'Nutritious fish flakes designed for everyday tropical aquarium feeding.'
    },
    {
        name: 'Kong Classic Dog Toy',
        slug: 'kong-classic-dog-toy',
        sku: 'DEMO-DOG-TOY-001',
        categorySlug: 'toys',
        brand: 'Kong',
        price: 16.99,
        originalPrice: 19.99,
        stock: 75,
        soldCount: 420,
        rating: 4.9,
        reviewCount: 310,
        isFeatured: true,
        tags: ['dog', 'toy'],
        images: [image('photo-1535294435445-d7249524ef2e')],
        shortDescription: 'Durable dog enrichment toy.',
        description: 'A durable toy for chewing, play, and enrichment for active dogs.'
    }
];

async function upsertDemoData() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pet_marketplace');

    const seller = await User.findOneAndUpdate(
        { email: 'seller.demo@petshop.com' },
        {
            name: 'Demo Seller',
            email: 'seller.demo@petshop.com',
            phone: '0987654321',
            role: ROLES.SELLER,
            status: 'active'
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (!seller.password) {
        seller.password = 'Seller123';
        await seller.save();
    }

    const demoShopMapData = getDemoShopLocation(20);

    const shop = await Shop.findOneAndUpdate(
        { owner: seller._id },
        {
            owner: seller._id,
            name: 'Petco Demo Store',
            slug: 'petco-demo-store',
            description: 'Demo approved shop for testing buyer flows.',
            phone: '0987654321',
            email: seller.email,
            status: SHOP_STATUS.APPROVED,
            isVerified: true,
            rating: 4.8,
            reviewCount: 124,
            address: demoShopMapData.address,
            location: demoShopMapData.location
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const categoryMap = new Map();
    for (const category of categories) {
        const localizedCategory = localizeCategoryToVi(category);
        const doc = await Category.findOneAndUpdate(
            { slug: category.slug },
            { ...category, ...localizedCategory, isActive: true },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        categoryMap.set(category.slug, doc);
    }

    for (const product of products) {
        const category = categoryMap.get(product.categorySlug);
        const localizedProduct = localizeProductToVi({
            ...product,
            categoryName: category?.name,
            petType: product.tags?.[0],
            attributes: [
                { name: 'Pet Type', value: product.tags?.[0] },
                { name: 'Brand', value: product.brand }
            ]
        });
        await Product.findOneAndUpdate(
            { sku: product.sku },
            {
                ...product,
                name: localizedProduct.name,
                shortDescription: localizedProduct.shortDescription,
                description: localizedProduct.description,
                categorySlug: undefined,
                shop: shop._id,
                seller: seller._id,
                category: category?._id,
                isActive: true,
                isVerified: true,
                unit: 'item',
                attributes: localizedProduct.attributes
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    }

    for (const category of categoryMap.values()) {
        category.productCount = await Product.countDocuments({ category: category._id, isActive: true });
        await category.save();
    }

    shop.productCount = await Product.countDocuments({ shop: shop._id, isActive: true });
    await shop.save();

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 6);
    await Coupon.findOneAndUpdate(
        { code: 'PET10' },
        {
            code: 'PET10',
            shop: shop._id,
            seller: seller._id,
            type: COUPON_TYPES.PERCENTAGE,
            value: 10,
            minOrderAmount: 10,
            maxDiscount: 15,
            maxUsage: 500,
            endDate,
            status: COUPON_STATUS.ACTIVE,
            description: 'Demo 10% off coupon'
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Promotion.findOneAndUpdate(
        { title: 'Demo Pet Deals' },
        {
            title: 'Demo Pet Deals',
            description: 'Save on selected pet food and toys.',
            image: image('photo-1601758124510-52d02ddb7cbd'),
            link: '#shop?onSale=true',
            shop: shop._id,
            seller: seller._id,
            startDate: new Date(),
            endDate,
            isActive: true,
            order: 1
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Banner.findOneAndUpdate(
        { title: 'Spring Pet Essentials' },
        {
            title: 'Spring Pet Essentials',
            subtitle: 'Food, treats, toys, and care essentials',
            image: image('photo-1558788353-f76d92427f16'),
            link: '#shop',
            startDate: new Date(),
            endDate,
            isActive: true,
            order: 1
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const pages = [
        ['return-policy', 'Return Policy', 'policy', '<p>Return eligible products within 7 days with original packaging.</p>'],
        ['warranty-policy', 'Warranty Policy', 'policy', '<p>Warranty depends on the product and seller policy shown on each product page.</p>'],
        ['shipping-policy', 'Shipping Policy', 'policy', '<p>Orders are prepared by sellers and shipped to the buyer address entered at checkout.</p>'],
        ['terms-of-use', 'Terms of Use', 'policy', '<p>Use the marketplace responsibly and follow buyer, seller, and platform rules.</p>'],
        ['privacy-policy', 'Privacy Policy', 'policy', '<p>We store account, order, and support information needed to run the marketplace.</p>'],
        ['vet-services', 'Vet Services', 'other', '<p>Vet services are listed as support content in this demo marketplace.</p>']
    ];

    for (const [slug, title, type, content] of pages) {
        await Page.findOneAndUpdate(
            { slug },
            { slug, title, type, content, status: 'published' },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    }

    await Article.findOneAndUpdate(
        { slug: 'basic-pet-care-guide' },
        {
            title: 'Basic Pet Care Guide',
            slug: 'basic-pet-care-guide',
            excerpt: 'Daily care basics for food, play, hygiene, and health checks.',
            content: '<p>Keep a stable feeding schedule, provide clean water, rotate safe toys, and monitor behavior changes.</p>',
            image: image('photo-1601758177266-bc599de87707'),
            category: 'care_guide',
            tags: ['care', 'pet'],
            status: 'published',
            publishedAt: new Date(),
            isFeatured: true
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const settings = [
        ['phone', '1900 0000', 'string', 'general', 'Phone'],
        ['email', 'support@petshop.local', 'string', 'general', 'Email'],
        ['address', '123 Pet Street, Ho Chi Minh City', 'string', 'general', 'Address'],
        ['workingHours', '08:00 - 21:00', 'string', 'general', 'Working hours'],
        ['facebook', 'https://facebook.com', 'string', 'social', 'Facebook'],
        ['instagram', 'https://instagram.com', 'string', 'social', 'Instagram'],
        ['mapUrl', 'https://maps.google.com', 'string', 'general', 'Google Maps']
    ];

    for (const [key, value, type, group, label] of settings) {
        await SiteSetting.findOneAndUpdate(
            { key },
            { key, value, type, group, label, isPublic: true },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    }

    console.log('Demo data ready');
    console.log('Seller: seller.demo@petshop.com / Seller123');
    console.log('Coupon: PET10');
    await mongoose.disconnect();
}

upsertDemoData().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
});
