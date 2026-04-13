const mongoose = require('mongoose');
require('dotenv').config();

const {
    User,
    Shop,
    Product,
    SellerApplication,
    ShopVerificationLevel
} = require('../models');
const {
    SHOP_STATUS,
    SELLER_APPLICATION_STATUS,
    SHOP_LABELS,
    SHOP_VERIFICATION_LEVEL
} = require('../config/constants');
const { pickProductImage, pickShopMedia } = require('./storefront-media');

const PETMALL_SHOP_SLUGS = new Set(['dog-shop', 'cat-shop']);

async function refreshStorefrontMedia() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pet_marketplace');

    const approvedShops = await Shop.find({ status: SHOP_STATUS.APPROVED });
    let updatedShops = 0;
    let updatedProducts = 0;

    for (const shop of approvedShops) {
        const media = pickShopMedia(shop);
        const isPetMall = PETMALL_SHOP_SLUGS.has(shop.slug);

        shop.logo = media.logo || shop.logo;
        shop.banner = media.banner || shop.banner;
        shop.isVerified = true;
        shop.reviewedAt = shop.reviewedAt || new Date();

        if (isPetMall) {
            shop.labels = [SHOP_LABELS.PETMALL];
            shop.verificationLevel = SHOP_VERIFICATION_LEVEL.PETMALL;
        }

        await shop.save();
        updatedShops += 1;

        const owner = await User.findById(shop.owner);
        if (owner) {
            owner.sellerProfile = {
                ...(owner.sellerProfile?.toObject?.() || owner.sellerProfile || {}),
                applicationStatus: SELLER_APPLICATION_STATUS.APPROVED,
                approvedAt: owner.sellerProfile?.approvedAt || new Date(),
                verificationLevel: isPetMall ? SHOP_VERIFICATION_LEVEL.PETMALL : (owner.sellerProfile?.verificationLevel || SHOP_VERIFICATION_LEVEL.VERIFIED_SELLER),
                labels: isPetMall ? [SHOP_LABELS.PETMALL] : (owner.sellerProfile?.labels?.length ? owner.sellerProfile.labels : [SHOP_LABELS.VERIFIED_SELLER])
            };
            await owner.save();
        }

        const application = await SellerApplication.findOne({ user: shop.owner });
        if (application) {
            application.status = SELLER_APPLICATION_STATUS.APPROVED;
            application.approvedShop = shop._id;
            application.reviewedAt = application.reviewedAt || new Date();
            if (isPetMall) {
                application.applicationType = 'petmall';
                application.verificationLevel = SHOP_VERIFICATION_LEVEL.PETMALL;
                application.assignedLabels = [SHOP_LABELS.PETMALL];
            }
            await application.save();
        }

        await ShopVerificationLevel.findOneAndUpdate(
            { shop: shop._id },
            {
                shop: shop._id,
                level: isPetMall ? SHOP_VERIFICATION_LEVEL.PETMALL : (shop.verificationLevel || SHOP_VERIFICATION_LEVEL.VERIFIED_SELLER),
                labels: isPetMall ? [SHOP_LABELS.PETMALL] : (shop.labels?.length ? shop.labels : [SHOP_LABELS.VERIFIED_SELLER]),
                grantedAt: new Date(),
                note: isPetMall
                    ? 'Cap nhan PetMall cho shop uy tin, ho so day du.'
                    : 'Cap nhan seller da duoc duyet tren san.'
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const products = await Product.find({ shop: shop._id });
        for (const product of products) {
            const nextImage = pickProductImage(product);
            if (!nextImage) continue;
            product.images = [nextImage];
            product.thumbnail = nextImage;
            product.image = nextImage;
            await product.save();
            updatedProducts += 1;
        }
    }

    console.log(`Updated ${updatedShops} shops and ${updatedProducts} products with refreshed storefront media.`);
    console.log('PetMall shops:', Array.from(PETMALL_SHOP_SLUGS).join(', '));

    await mongoose.disconnect();
}

refreshStorefrontMedia().catch((error) => {
    console.error(error);
    mongoose.disconnect().finally(() => process.exit(1));
});
