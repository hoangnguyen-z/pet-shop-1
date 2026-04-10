const mongoose = require('mongoose');
require('dotenv').config();

const { User, Shop, Category, Product, Coupon, Promotion, Review, Banner } = require('../models');
const { ROLES, SHOP_STATUS, COUPON_TYPES, COUPON_STATUS } = require('../config/constants');
const { getDemoShopLocation } = require('./shop-location-pool');

const image = (id) => {
    const localImages = {
        'photo-1587300003388-59208cc962cb': '/assets/photos/dog.jpg',
        'photo-1548199973-03cce0bbc87b': '/assets/photos/dog.jpg',
        'photo-1518717758536-85ae29035b6d': '/assets/photos/dog.jpg',
        'photo-1507146426996-ef05306b995a': '/assets/photos/dog.jpg',
        'photo-1574158622682-e40e69881006': '/assets/photos/cat.jpg',
        'photo-1514888286974-6c03e2ca1dba': '/assets/photos/cat.jpg',
        'photo-1552728089-57bdde30beb3': '/assets/photos/bird.jpg',
        'photo-1444464666168-49d633b86797': '/assets/photos/bird.jpg',
        'photo-1522069169874-c58ec4b76be5': '/assets/photos/fish.jpg',
        'photo-1585110396000-c9ffd4e4b308': '/assets/photos/rabbit.jpg',
        'photo-1425082661705-1834bfd09dca': '/assets/photos/hamster.jpg',
        'photo-1548767797-d8c844163c4c': '/assets/photos/hamster.jpg',
        'photo-1533371356817-02152aef1506': '/assets/photos/reptile.jpg',
        'photo-1598300042247-d088f8ab3a91': '/assets/photos/reptile.jpg',
        'photo-1516734212186-a967f81ad0d7': '/assets/photos/grooming.jpg',
        'photo-1628009368231-7bb7cfcb0def': '/assets/photos/dog.jpg',
        'photo-1601758125946-6ec2ef64daf8': '/assets/photos/rabbit.jpg',
        'photo-1601758124510-52d02ddb7cbd': '/assets/photos/food.jpg',
        'photo-1601758177266-bc599de87707': '/assets/photos/dog.jpg',
        'photo-1450778869180-41d0601e046e': '/assets/photos/dog.jpg'
    };
    if (!id) return '/assets/photos/dog.jpg';
    if (localImages[id]) return localImages[id];
    if (String(id).startsWith('http') || String(id).startsWith('/')) return id;
    return '/assets/photos/dog.jpg';
};

const shopPlans = [
    {
        key: 'dog',
        owner: 'Dog Care Owner',
        email: 'seller.dog@petshop.com',
        phone: '0910000001',
        shop: 'Happy Dog House',
        category: 'Dog',
        petType: 'dog',
        image: 'photo-1587300003388-59208cc962cb',
        brands: ['Royal Canin', 'Pedigree', 'Kong', 'Blue Buffalo'],
        products: ['Adult Dog Food', 'Puppy Food', 'Dental Chews', 'Rubber Chew Toy', 'Dog Bed', 'Dog House', 'Leash Set', 'Training Treats', 'Shampoo', 'Travel Crate', 'Food Bowl', 'Health Supplement']
    },
    {
        key: 'cat',
        owner: 'Cat Care Owner',
        email: 'seller.cat@petshop.com',
        phone: '0910000002',
        shop: 'Cozy Cat Corner',
        category: 'Cat',
        petType: 'cat',
        image: 'photo-1574158622682-e40e69881006',
        brands: ['Whiskas', 'Purina ONE', 'Me-O', 'Catit'],
        products: ['Indoor Cat Food', 'Kitten Food', 'Clumping Litter', 'Cat Tree', 'Cat Scratcher', 'Interactive Wand Toy', 'Covered Litter Box', 'Cat Carrier', 'Hairball Treats', 'Wet Food Pouch', 'Cat Tunnel', 'Grooming Brush']
    },
    {
        key: 'bird',
        owner: 'Bird Care Owner',
        email: 'seller.bird@petshop.com',
        phone: '0910000003',
        shop: 'Bright Bird Supplies',
        category: 'Bird',
        petType: 'bird',
        image: 'photo-1552728089-57bdde30beb3',
        brands: ['Kaytee', 'Vitakraft', 'Zupreem', 'Hagen'],
        products: ['Parakeet Seed Mix', 'Cockatiel Food', 'Bird Cage Small', 'Bird Cage Large', 'Wooden Perch Set', 'Mineral Block', 'Swing Toy', 'Seed Cup', 'Bath Tub', 'Nest Box', 'Millet Spray', 'Travel Cage']
    },
    {
        key: 'fish',
        owner: 'Fish Care Owner',
        email: 'seller.fish@petshop.com',
        phone: '0910000004',
        shop: 'Aqua Fish Market',
        category: 'Fish',
        petType: 'fish',
        image: 'photo-1522069169874-c58ec4b76be5',
        brands: ['Tetra', 'API', 'Hikari', 'Seachem'],
        products: ['Tropical Fish Flakes', 'Goldfish Pellets', 'Aquarium Filter', 'LED Aquarium Light', 'Water Conditioner', 'Aquarium Gravel', 'Air Pump', 'Fish Net', 'Tank Heater', 'Decor Plant Set', 'Betta Food', 'Glass Fish Bowl']
    },
    {
        key: 'rabbit',
        owner: 'Rabbit Care Owner',
        email: 'seller.rabbit@petshop.com',
        phone: '0910000005',
        shop: 'Bunny Garden Shop',
        category: 'Rabbit',
        petType: 'rabbit',
        image: 'photo-1585110396000-c9ffd4e4b308',
        brands: ['Oxbow', 'Vitakraft', 'Kaytee', 'Small Pet Select'],
        products: ['Timothy Hay', 'Rabbit Pellets', 'Rabbit Cage', 'Wooden Hideout', 'Chew Sticks', 'Water Bottle', 'Food Dish', 'Litter Tray', 'Play Tunnel', 'Grooming Comb', 'Alfalfa Treats', 'Portable Carrier']
    },
    {
        key: 'hamster',
        owner: 'Hamster Care Owner',
        email: 'seller.hamster@petshop.com',
        phone: '0910000006',
        shop: 'Tiny Paws Habitat',
        category: 'Hamster',
        petType: 'hamster',
        image: 'photo-1425082661705-1834bfd09dca',
        brands: ['Kaytee', 'Vitakraft', 'Savic', 'Living World'],
        products: ['Hamster Food Mix', 'Hamster Cage', 'Exercise Wheel', 'Wood Bedding', 'Sand Bath', 'Hideout House', 'Chew Blocks', 'Water Bottle Mini', 'Food Bowl Mini', 'Play Tube Set', 'Carry Pod', 'Seed Treat Bar']
    },
    {
        key: 'reptile',
        owner: 'Reptile Care Owner',
        email: 'seller.reptile@petshop.com',
        phone: '0910000007',
        shop: 'Reptile Habitat Co',
        category: 'Reptile',
        petType: 'reptile',
        image: 'photo-1533371356817-02152aef1506',
        brands: ['Zoo Med', 'Exo Terra', 'Flukers', 'Repti Zoo'],
        products: ['Terrarium Glass Tank', 'Heat Lamp', 'UVB Bulb', 'Reptile Calcium', 'Substrate Mat', 'Water Dish', 'Hide Cave', 'Climbing Branch', 'Thermometer', 'Humidity Gauge', 'Turtle Food', 'Feeding Tongs']
    },
    {
        key: 'small-pet',
        owner: 'Small Pet Owner',
        email: 'seller.smallpet@petshop.com',
        phone: '0910000008',
        shop: 'Small Pet Comforts',
        category: 'Small Pet',
        petType: 'small-pet',
        image: 'photo-1548767797-d8c844163c4c',
        brands: ['Oxbow', 'Kaytee', 'Ferplast', 'Vitakraft'],
        products: ['Guinea Pig Pellets', 'Small Pet Hay Rack', 'Large Playpen', 'Corner Toilet', 'Soft Bedding', 'Vitamin Drops', 'Cuddle Bed', 'Wooden Bridge', 'Small Pet Harness', 'Nail Clippers', 'Treat Mix', 'Cleaning Spray']
    },
    {
        key: 'grooming',
        owner: 'Grooming Owner',
        email: 'seller.grooming@petshop.com',
        phone: '0910000009',
        shop: 'Pet Grooming Depot',
        category: 'Grooming',
        petType: 'all-pets',
        image: 'photo-1516734212186-a967f81ad0d7',
        brands: ['Furminator', 'TropiClean', 'Hartz', 'Earthbath'],
        products: ['Dog Shampoo', 'Cat Shampoo', 'Slicker Brush', 'Nail Clipper', 'Ear Cleaner', 'Paw Balm', 'Toothbrush Kit', 'Pet Wipes', 'Deodorizing Spray', 'Grooming Glove', 'Deshedding Tool', 'Dry Towel']
    },
    {
        key: 'habitat',
        owner: 'Habitat Owner',
        email: 'seller.habitat@petshop.com',
        phone: '0910000010',
        shop: 'Pet Homes & Habitats',
        category: 'Homes & Habitats',
        petType: 'all-pets',
        image: 'photo-1601758125946-6ec2ef64daf8',
        brands: ['Petmate', 'Ferplast', 'Savic', 'MidWest'],
        products: ['Wooden Dog House', 'Cat Condo', 'Bird Aviary', 'Rabbit Hutch', 'Hamster Mansion Cage', 'Reptile Terrarium', 'Portable Pet Tent', 'Soft Pet Bed', 'Outdoor Playpen', 'Travel Carrier', 'Plastic Kennel', 'Foldable Crate']
    }
];

shopPlans.push(
    {
        key: 'dog-food-premium',
        owner: 'Premium Dog Owner',
        email: 'seller.premiumdog@petshop.com',
        phone: '0910000011',
        shop: 'Premium Dog Pantry',
        category: 'Premium Dog Food',
        petType: 'dog',
        image: 'photo-1548199973-03cce0bbc87b',
        brands: ['Acana', 'Orijen', 'Royal Canin', 'Taste of the Wild'],
        products: ['Grain Free Adult Food', 'Sensitive Skin Kibble', 'Large Breed Puppy Food', 'Senior Dog Nutrition', 'Freeze Dried Chicken Treats', 'Salmon Training Bites', 'Dental Care Chews', 'Joint Support Soft Chews', 'Slow Feeder Bowl', 'Measuring Scoop Set', 'Fresh Food Topper', 'High Protein Snack Pack']
    },
    {
        key: 'cat-luxury',
        owner: 'Luxury Cat Owner',
        email: 'seller.luxurycat@petshop.com',
        phone: '0910000012',
        shop: 'Luxury Cat Lounge',
        category: 'Luxury Cat Supplies',
        petType: 'cat',
        image: 'photo-1514888286974-6c03e2ca1dba',
        brands: ['Royal Canin', 'Catit', 'Neko', 'Purina Pro Plan'],
        products: ['Premium Wet Food Set', 'Hairball Control Kibble', 'Luxury Cat Tree', 'Window Hammock', 'Tofu Cat Litter', 'Automatic Water Fountain', 'Stainless Food Bowl', 'Calming Cat Bed', 'Tunnel Toy', 'Catnip Mouse Pack', 'Travel Backpack Carrier', 'Self Grooming Brush']
    },
    {
        key: 'avian-home',
        owner: 'Avian Home Owner',
        email: 'seller.avianhome@petshop.com',
        phone: '0910000013',
        shop: 'Avian Home Studio',
        category: 'Bird Homes',
        petType: 'bird',
        image: 'photo-1444464666168-49d633b86797',
        brands: ['Prevue', 'Kaytee', 'Hagen', 'Zupreem'],
        products: ['Canary Seed Blend', 'Parrot Pellet Mix', 'Tall Bird Cage', 'Breeding Nest Box', 'Natural Perch Bundle', 'Rope Climbing Toy', 'Foraging Ball', 'Mirror Bell Toy', 'Cuttlebone Holder', 'Bird Bath Tray', 'Cage Cleaning Spray', 'Outdoor Travel Cage']
    },
    {
        key: 'aquascape',
        owner: 'Aquascape Owner',
        email: 'seller.aquascape@petshop.com',
        phone: '0910000014',
        shop: 'Aquascape World',
        category: 'Aquarium Supplies',
        petType: 'fish',
        image: 'photo-1522069169874-c58ec4b76be5',
        brands: ['Tetra', 'Fluval', 'API', 'Seachem'],
        products: ['Nano Aquarium Kit', 'Planted Tank Substrate', 'Aquarium CO2 Diffuser', 'Bio Filter Media', 'Betta Leaf Hammock', 'Premium Fish Flakes', 'Shrimp Mineral Food', 'Water Test Kit', 'Aquarium Thermometer', 'Glass Cleaner Magnet', 'Aquascape Rock Set', 'Live Plant Fertilizer']
    },
    {
        key: 'reptile-pro',
        owner: 'Reptile Pro Owner',
        email: 'seller.reptilepro@petshop.com',
        phone: '0910000015',
        shop: 'Reptile Pro Lab',
        category: 'Reptile Gear',
        petType: 'reptile',
        image: 'photo-1598300042247-d088f8ab3a91',
        brands: ['Exo Terra', 'Zoo Med', 'Repti Zoo', 'Arcadia'],
        products: ['Desert Terrarium Kit', 'Rainforest Habitat Kit', 'UVB Lighting Combo', 'Ceramic Heat Emitter', 'Digital Thermostat', 'Reptile Misting Bottle', 'Coconut Fiber Substrate', 'Gecko Diet Powder', 'Turtle Dock Ramp', 'Basking Platform', 'Decor Vine Pack', 'Feeding Cup Holder']
    },
    {
        key: 'small-mammal',
        owner: 'Small Mammal Owner',
        email: 'seller.smallmammal@petshop.com',
        phone: '0910000016',
        shop: 'Little Mammal Market',
        category: 'Small Mammal Supplies',
        petType: 'small-pet',
        image: 'photo-1425082661705-1834bfd09dca',
        brands: ['Oxbow', 'Kaytee', 'Burgess', 'Living World'],
        products: ['Guinea Pig Hay Blend', 'Chinchilla Bath Sand', 'Ferret Hammock Bed', 'Multi Level Cage', 'Chew Tunnel Bridge', 'Small Animal Playpen', 'Vitamin C Drops', 'Natural Bedding Pack', 'Ceramic Food Bowl', 'No Drip Water Bottle', 'Forage Mix Treats', 'Hideout Grass House']
    },
    {
        key: 'pet-health',
        owner: 'Pet Health Owner',
        email: 'seller.pethealth@petshop.com',
        phone: '0910000017',
        shop: 'Pet Health Pharmacy',
        category: 'Pet Health',
        petType: 'all-pets',
        image: 'photo-1628009368231-7bb7cfcb0def',
        brands: ['Virbac', 'Bayer', 'Frontline', 'Nutri-Vet'],
        products: ['Flea Tick Protection', 'Ear Cleaning Solution', 'Dental Water Additive', 'Multivitamin Tablets', 'Probiotic Powder', 'Wound Care Spray', 'Eye Wash Solution', 'Calming Supplement', 'Joint Care Chews', 'Paw Repair Balm', 'Pet First Aid Kit', 'Digital Pet Thermometer']
    },
    {
        key: 'pet-fashion',
        owner: 'Pet Fashion Owner',
        email: 'seller.petfashion@petshop.com',
        phone: '0910000018',
        shop: 'Pet Fashion Closet',
        category: 'Pet Fashion',
        petType: 'all-pets',
        image: 'photo-1507146426996-ef05306b995a',
        brands: ['Puppia', 'Canada Pooch', 'Ruffwear', 'FashionPet'],
        products: ['Rain Jacket', 'Warm Hoodie', 'Cooling Vest', 'Reflective Harness', 'Cute Bandana Set', 'Leather Collar', 'Adjustable Leash', 'Winter Sweater', 'Birthday Costume', 'Travel Harness', 'Pet Socks', 'Bow Tie Collar']
    },
    {
        key: 'training-supplies',
        owner: 'Training Owner',
        email: 'seller.training@petshop.com',
        phone: '0910000019',
        shop: 'Smart Pet Training',
        category: 'Training Supplies',
        petType: 'dog',
        image: 'photo-1518717758536-85ae29035b6d',
        brands: ['Kong', 'PetSafe', 'Outward Hound', 'Nina Ottosson'],
        products: ['Clicker Training Kit', 'Treat Pouch Bag', 'Puzzle Feeder Toy', 'Long Training Leash', 'Agility Cone Set', 'Recall Whistle', 'Training Reward Treats', 'No Pull Harness', 'Interactive Snuffle Mat', 'Potty Training Pads', 'Dog Training Book', 'Command Target Stick']
    },
    {
        key: 'cleaning-care',
        owner: 'Cleaning Care Owner',
        email: 'seller.cleaningcare@petshop.com',
        phone: '0910000020',
        shop: 'Fresh Home Pet Care',
        category: 'Cleaning & Care',
        petType: 'all-pets',
        image: 'photo-1516734212186-a967f81ad0d7',
        brands: ['Nature Miracle', 'Simple Solution', 'TropiClean', 'Earth Rated'],
        products: ['Odor Eliminator Spray', 'Stain Remover Foam', 'Biodegradable Poop Bags', 'Cat Litter Deodorizer', 'Pet Laundry Detergent', 'Grooming Wipes', 'Disinfectant Floor Cleaner', 'Portable Waste Bin', 'Lint Roller Pack', 'Pet Hair Vacuum Brush', 'Travel Cleaning Kit', 'Paw Cleaning Cup']
    }
);

async function ensureSeller(plan) {
    let seller = await User.findOne({ email: plan.email }).select('+password');
    if (!seller) {
        seller = await User.create({
            name: plan.owner,
            email: plan.email,
            phone: plan.phone,
            password: 'Seller123',
            role: ROLES.SELLER,
            status: 'active'
        });
    } else {
        seller.name = plan.owner;
        seller.phone = plan.phone;
        seller.role = ROLES.SELLER;
        seller.status = 'active';
        if (!seller.password) seller.password = 'Seller123';
        await seller.save();
    }
    return seller;
}

async function ensureReviewBuyer() {
    let buyer = await User.findOne({ email: 'buyer.review@petshop.com' }).select('+password');
    if (!buyer) {
        buyer = await User.create({
            name: 'Review Buyer',
            email: 'buyer.review@petshop.com',
            phone: '0987654321',
            password: 'Petshop1',
            role: ROLES.BUYER,
            status: 'active'
        });
    } else {
        buyer.name = 'Review Buyer';
        buyer.phone = buyer.phone || '0987654321';
        buyer.role = ROLES.BUYER;
        buyer.status = 'active';
        if (!buyer.password) buyer.password = 'Petshop1';
        await buyer.save();
    }
    return buyer;
}

async function ensureCategory(name, slug, order) {
    return Category.findOneAndUpdate(
        { slug },
        {
            name,
            slug,
            description: `${name} products and supplies`,
            icon: slug,
            order,
            isActive: true
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

function productPayload(plan, productName, category, shop, seller, index) {
    const brand = plan.brands[index % plan.brands.length];
    const base = 8 + ((index + 1) * 4) + (plan.key.length % 5);
    const price = Number((base + (index % 3) * 2.5).toFixed(2));
    const originalPrice = Number((price * (1.12 + (index % 4) * 0.04)).toFixed(2));
    const sku = `${plan.key.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${String(index + 1).padStart(3, '0')}`;

    return {
        name: `${brand} ${productName}`,
        slug: `${plan.key}-${productName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        sku,
        shop: shop._id,
        seller: seller._id,
        category: category._id,
        brand,
        shortDescription: `${productName} for ${plan.category.toLowerCase()} care.`,
        description: `${brand} ${productName} is a demo marketplace product for testing search, filters, cart, checkout, seller order flow, stock, promotions, and coupons.`,
        price,
        originalPrice,
        stock: 25 + index * 3,
        images: [
            image(plan.image),
            image(index % 2 === 0 ? 'photo-1601758124510-52d02ddb7cbd' : 'photo-1601758177266-bc599de87707')
        ],
        thumbnail: image(plan.image),
        tags: [plan.petType, plan.category.toLowerCase(), productName.toLowerCase()],
        attributes: [
            { name: 'Pet Type', value: plan.petType },
            { name: 'Product Type', value: productName },
            { name: 'Brand', value: brand }
        ],
        rating: Number((4 + (index % 10) / 10).toFixed(1)),
        reviewCount: 5 + index * 2,
        soldCount: index * 4,
        isActive: true,
        isFeatured: index < 4,
        isVerified: true,
        flashSale: {
            isActive: index % 5 === 0,
            startTime: new Date(Date.now() - 86400000),
            endTime: new Date(Date.now() + 14 * 86400000),
            discountPrice: index % 5 === 0 ? Number((price * 0.9).toFixed(2)) : undefined,
            discountPercent: index % 5 === 0 ? 10 : undefined
        }
    };
}

async function seedPublicBanners() {
    const banners = [
        {
            title: 'Chợ thú cưng cuối tuần',
            subtitle: 'Đồ ăn, nhà nuôi, đồ chơi và chăm sóc thú cưng từ các shop đã duyệt.',
            badge: 'Marketplace deals',
            image: image('photo-1450778869180-41d0601e046e'),
            link: '#shop',
            backgroundColor: '#004589',
            secondaryColor: '#009ddc'
        },
        {
            title: 'Góc chó mèo thật đông',
            subtitle: 'Tìm sản phẩm theo shop, pet type, thương hiệu và giá trong một trang.',
            badge: 'Dog & Cat',
            image: image('photo-1548199973-03cce0bbc87b'),
            link: '#shop?petType=dog',
            backgroundColor: '#91310a',
            secondaryColor: '#e97b32'
        },
        {
            title: 'Nhà, lồng và habitat',
            subtitle: 'Shop chim, cá, hamster, thỏ và bò sát đã có hàng để test đặt mua.',
            badge: 'Homes & habitats',
            image: image('photo-1601758125946-6ec2ef64daf8'),
            link: '#shop?search=habitat',
            backgroundColor: '#005d16',
            secondaryColor: '#008b3a'
        }
    ];

    await Banner.updateMany({}, { isActive: false });

    for (let index = 0; index < banners.length; index += 1) {
        const banner = banners[index];
        await Banner.findOneAndUpdate(
            { title: banner.title },
            {
                ...banner,
                position: index + 1,
                type: index === 0 ? 'primary' : 'secondary',
                isActive: true,
                startDate: new Date(Date.now() - 86400000),
                endDate: new Date(Date.now() + 60 * 86400000)
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    }
}

async function seedProductReview(product, shop, buyer, productIndex) {
    await Review.findOneAndUpdate(
        { product: product._id, user: buyer._id },
        {
            product: product._id,
            shop: shop._id,
            user: buyer._id,
            rating: 5 - (productIndex % 2),
            title: productIndex % 2 === 0 ? 'Sản phẩm đúng mô tả' : 'Dễ dùng để test mua hàng',
            comment: productIndex % 2 === 0
                ? 'Ảnh rõ, giá và tồn kho hiển thị đúng. Dữ liệu này dùng để test phần đánh giá public.'
                : 'Shop phản hồi tốt, sản phẩm phù hợp cho luồng kiểm thử giỏ hàng và đơn hàng.',
            isVerifiedPurchase: true,
            status: 'visible'
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

async function seedMarketplace() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pet_marketplace');

    const reviewBuyer = await ensureReviewBuyer();
    await Product.updateMany(
        { $or: [{ images: /^\/assets\/images\// }, { thumbnail: /^\/assets\/images\// }, { images: /images\.unsplash\.com/ }, { thumbnail: /images\.unsplash\.com/ }] },
        { isFeatured: false }
    );
    await seedPublicBanners();

    let createdProducts = 0;
    for (let shopIndex = 0; shopIndex < shopPlans.length; shopIndex += 1) {
        const plan = shopPlans[shopIndex];
        const seller = await ensureSeller(plan);
        const category = await ensureCategory(plan.category, plan.key, shopIndex + 20);
        const shopMapData = getDemoShopLocation(shopIndex);

        const shop = await Shop.findOneAndUpdate(
            { owner: seller._id },
            {
                owner: seller._id,
                name: plan.shop,
                slug: `${plan.key}-shop`,
                description: `${plan.shop} specializes in ${plan.category.toLowerCase()} products, food, homes, cages, toys, and care supplies.`,
                logo: image(plan.image),
                banner: image(plan.image),
                phone: plan.phone,
                email: plan.email,
                status: SHOP_STATUS.APPROVED,
                rating: Number((4.3 + (shopIndex % 6) / 10).toFixed(1)),
                reviewCount: 20 + shopIndex * 7,
                productCount: plan.products.length,
                isVerified: true,
                address: shopMapData.address,
                location: shopMapData.location,
                policies: {
                    shipping: 'Ships within 24-48 hours for demo orders.',
                    return: 'Accepts returns for eligible unopened products.',
                    warranty: 'Warranty depends on product type and supplier.'
                },
                operatingHours: { open: '08:00', close: '21:00' },
                bankAccount: {
                    bankName: 'Demo Bank',
                    bankAccount: `9704${String(shopIndex + 1).padStart(8, '0')}`,
                    accountHolder: plan.owner.toUpperCase()
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        for (let productIndex = 0; productIndex < plan.products.length; productIndex += 1) {
            const product = productPayload(plan, plan.products[productIndex], category, shop, seller, productIndex);
            const productDoc = await Product.findOneAndUpdate(
                { sku: product.sku },
                product,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            await seedProductReview(productDoc, shop, reviewBuyer, productIndex);
            createdProducts += 1;
        }

        shop.productCount = await Product.countDocuments({ shop: shop._id, isActive: true });
        await shop.save();

        const couponEnd = new Date(Date.now() + 90 * 86400000);
        await Coupon.findOneAndUpdate(
            { code: `${plan.key.toUpperCase().replace(/[^A-Z0-9]/g, '')}10` },
            {
                code: `${plan.key.toUpperCase().replace(/[^A-Z0-9]/g, '')}10`,
                shop: shop._id,
                seller: seller._id,
                type: COUPON_TYPES.PERCENTAGE,
                value: 10,
                minOrderAmount: 10,
                maxDiscount: 20,
                maxUsage: 200,
                endDate: couponEnd,
                status: COUPON_STATUS.ACTIVE,
                description: `10% off at ${plan.shop}`
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await Promotion.findOneAndUpdate(
            { title: `${plan.shop} Weekly Deals` },
            {
                title: `${plan.shop} Weekly Deals`,
                description: `Deals for ${plan.category.toLowerCase()} products and supplies.`,
                image: image(plan.image),
                link: `#shop?petType=${plan.petType}`,
                shop: shop._id,
                seller: seller._id,
                type: 'deal',
                discountPercent: 10 + (shopIndex % 4) * 5,
                startDate: new Date(Date.now() - 86400000),
                endDate: new Date(Date.now() + 30 * 86400000),
                isActive: true
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        category.productCount = await Product.countDocuments({ category: category._id, isActive: true });
        await category.save();
    }

    const totals = {
        sellers: await User.countDocuments({ role: ROLES.SELLER }),
        shops: await Shop.countDocuments({ status: SHOP_STATUS.APPROVED }),
        products: await Product.countDocuments({ isActive: true }),
        coupons: await Coupon.countDocuments({ status: COUPON_STATUS.ACTIVE }),
        promotions: await Promotion.countDocuments({ isActive: true }),
        banners: await Banner.countDocuments({ isActive: true }),
        reviews: await Review.countDocuments({ status: 'visible' })
    };

    console.log('Marketplace demo data ready');
    console.log(JSON.stringify({ createdProducts, totals }, null, 2));
    console.log('All demo seller passwords: Seller123');
    await mongoose.disconnect();
}

seedMarketplace().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
});
