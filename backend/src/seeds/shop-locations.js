const mongoose = require('mongoose');
require('dotenv').config();

const { Shop } = require('../models');
const { getDemoShopLocation } = require('./shop-location-pool');

async function seedShopLocations() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pet_marketplace');

    const shops = await Shop.find({}).sort({ slug: 1, createdAt: 1 });

    for (let index = 0; index < shops.length; index += 1) {
        const shop = shops[index];
        const mapData = getDemoShopLocation(index);

        shop.address = {
            ...(shop.address || {}),
            ...mapData.address
        };

        shop.location = mapData.location;
        await shop.save();
    }

    console.log(`Updated ${shops.length} shop locations.`);
    if (shops[0]) {
        console.log(`Sample shop: ${shops[0].name}`);
        console.log(shops[0].location);
    }
}

seedShopLocations()
    .then(async () => {
        await mongoose.disconnect();
        process.exit(0);
    })
    .catch(async (error) => {
        console.error('Failed to seed shop locations:', error);
        await mongoose.disconnect().catch(() => {});
        process.exit(1);
    });
