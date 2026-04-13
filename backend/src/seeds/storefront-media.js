const { SHOP_LABELS, SHOP_VERIFICATION_LEVEL } = require('../config/constants');

function unsplashPhoto(photoId, width = 1200, height = 900) {
    return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
}

function hashSeed(value = '') {
    return Array.from(String(value)).reduce((total, char) => total + char.charCodeAt(0), 0);
}

function pickFromList(list, seedValue) {
    if (!Array.isArray(list) || !list.length) return '';
    return list[hashSeed(seedValue) % list.length];
}

const PRODUCT_IMAGE_GROUPS = {
    food: [
        unsplashPhoto('photo-1601758124510-52d02ddb7cbd'),
        unsplashPhoto('photo-1589924691995-400dc9ecc119'),
        unsplashPhoto('photo-1568640347023-a616a30bc3bd'),
        unsplashPhoto('photo-1601758228041-f3b2795255f1'),
        unsplashPhoto('photo-1601758064221-9dd5fcb51db8')
    ],
    toy: [
        unsplashPhoto('photo-1535294435445-d7249524ef2e'),
        unsplashPhoto('photo-1601758177266-bc599de87707'),
        unsplashPhoto('photo-1450778869180-41d0601e046e'),
        unsplashPhoto('photo-B4ZWfy_rmQ0'),
        unsplashPhoto('photo-iMUsBn6gHWw'),
        unsplashPhoto('photo-osds0mv1WAo'),
        unsplashPhoto('photo-e3s9BQv6lRw')
    ],
    habitat: [
        unsplashPhoto('photo-1601758125946-6ec2ef64daf8'),
        unsplashPhoto('photo-1444464666168-49d633b86797'),
        unsplashPhoto('photo-1548767797-d8c844163c4c'),
        unsplashPhoto('photo-MMFBzTNeVrQ'),
        unsplashPhoto('photo-YTWzyKVOhF4'),
        unsplashPhoto('photo-uI0RFQtxC-g')
    ],
    bed: [
        unsplashPhoto('photo-1601758125946-6ec2ef64daf8'),
        unsplashPhoto('photo-xj3QAZU_X9o'),
        unsplashPhoto('photo-4pjmFCqqxtw'),
        unsplashPhoto('photo-fFzKr9A7d88'),
        unsplashPhoto('photo-gaweuh7f29s')
    ],
    litter: [
        unsplashPhoto('photo-1514888286974-6c03e2ca1dba'),
        unsplashPhoto('photo-1574158622682-e40e69881006'),
        unsplashPhoto('photo-1548199973-03cce0bbc87b'),
        unsplashPhoto('photo-xj3QAZU_X9o'),
        unsplashPhoto('photo-4pjmFCqqxtw')
    ],
    aquarium: [
        unsplashPhoto('photo-1522069169874-c58ec4b76be5'),
        unsplashPhoto('photo-1533371356817-02152aef1506'),
        unsplashPhoto('photo-1598300042247-d088f8ab3a91')
    ],
    grooming: [
        unsplashPhoto('photo-1516734212186-a967f81ad0d7'),
        unsplashPhoto('photo-1628009368231-7bb7cfcb0def'),
        unsplashPhoto('photo-1558788353-f76d92427f16')
    ],
    fashion: [
        unsplashPhoto('photo-1507146426996-ef05306b995a'),
        unsplashPhoto('photo-1548199973-03cce0bbc87b'),
        unsplashPhoto('photo-1587300003388-59208cc962cb'),
        unsplashPhoto('photo-osds0mv1WAo')
    ],
    generic: [
        unsplashPhoto('photo-1587300003388-59208cc962cb'),
        unsplashPhoto('photo-1574158622682-e40e69881006'),
        unsplashPhoto('photo-1548199973-03cce0bbc87b'),
        unsplashPhoto('photo-xj3QAZU_X9o'),
        unsplashPhoto('photo-B4ZWfy_rmQ0')
    ]
};

const SHOP_MEDIA_BY_SLUG = {
    'dog-shop': {
        logo: unsplashPhoto('photo-1587300003388-59208cc962cb', 640, 640),
        banner: unsplashPhoto('photo-1548199973-03cce0bbc87b', 1600, 900),
        labels: [SHOP_LABELS.PETMALL],
        verificationLevel: SHOP_VERIFICATION_LEVEL.PETMALL
    },
    'cat-shop': {
        logo: unsplashPhoto('photo-1574158622682-e40e69881006', 640, 640),
        banner: unsplashPhoto('photo-1514888286974-6c03e2ca1dba', 1600, 900),
        labels: [SHOP_LABELS.PETMALL],
        verificationLevel: SHOP_VERIFICATION_LEVEL.PETMALL
    },
    'bird-shop': {
        logo: unsplashPhoto('photo-1552728089-57bdde30beb3', 640, 640),
        banner: unsplashPhoto('photo-1444464666168-49d633b86797', 1600, 900)
    },
    'fish-shop': {
        logo: unsplashPhoto('photo-1522069169874-c58ec4b76be5', 640, 640),
        banner: unsplashPhoto('photo-1522069169874-c58ec4b76be5', 1600, 900)
    },
    'rabbit-shop': {
        logo: unsplashPhoto('photo-1585110396000-c9ffd4e4b308', 640, 640),
        banner: unsplashPhoto('photo-1585110396000-c9ffd4e4b308', 1600, 900)
    },
    'hamster-shop': {
        logo: unsplashPhoto('photo-1425082661705-1834bfd09dca', 640, 640),
        banner: unsplashPhoto('photo-1548767797-d8c844163c4c', 1600, 900)
    },
    'reptile-shop': {
        logo: unsplashPhoto('photo-1533371356817-02152aef1506', 640, 640),
        banner: unsplashPhoto('photo-1598300042247-d088f8ab3a91', 1600, 900)
    },
    'small-pet-shop': {
        logo: unsplashPhoto('photo-1548767797-d8c844163c4c', 640, 640),
        banner: unsplashPhoto('photo-1601758125946-6ec2ef64daf8', 1600, 900)
    },
    'grooming-shop': {
        logo: unsplashPhoto('photo-1516734212186-a967f81ad0d7', 640, 640),
        banner: unsplashPhoto('photo-1558788353-f76d92427f16', 1600, 900)
    },
    'habitat-shop': {
        logo: unsplashPhoto('photo-1601758125946-6ec2ef64daf8', 640, 640),
        banner: unsplashPhoto('photo-1601758125946-6ec2ef64daf8', 1600, 900)
    },
    'petco-demo-store': {
        logo: unsplashPhoto('photo-1587300003388-59208cc962cb', 640, 640),
        banner: unsplashPhoto('photo-1548199973-03cce0bbc87b', 1600, 900)
    }
};

function inferProductGroup(product = {}) {
    const haystack = [
        product.name,
        product.brand,
        ...(product.tags || []),
        ...(product.attributes || []).map((item) => item?.value),
        product.category?.name
    ].filter(Boolean).join(' ').toLowerCase();

    if (haystack.includes('litter')) return 'litter';
    if (haystack.includes('bed') || haystack.includes('blanket') || haystack.includes('mat') || haystack.includes('pillow') || haystack.includes('cushion')) return 'bed';
    if (haystack.includes('aquarium') || haystack.includes('tank') || haystack.includes('fish') || haystack.includes('reptile')) return 'aquarium';
    if (haystack.includes('groom') || haystack.includes('health') || haystack.includes('vitamin') || haystack.includes('flea') || haystack.includes('paw')) return 'grooming';
    if (haystack.includes('harness') || haystack.includes('collar') || haystack.includes('leash') || haystack.includes('jacket') || haystack.includes('hoodie')) return 'fashion';
    if (haystack.includes('cage') || haystack.includes('crate') || haystack.includes('house') || haystack.includes('habitat') || haystack.includes('carrier') || haystack.includes('hutch')) return 'habitat';
    if (haystack.includes('toy') || haystack.includes('kong') || haystack.includes('chew') || haystack.includes('wand') || haystack.includes('mouse')) return 'toy';
    if (haystack.includes('food') || haystack.includes('treat') || haystack.includes('pellet') || haystack.includes('flake') || haystack.includes('hay')) return 'food';
    return 'generic';
}

function pickProductImage(product = {}) {
    const group = inferProductGroup(product);
    const list = PRODUCT_IMAGE_GROUPS[group] || PRODUCT_IMAGE_GROUPS.generic;
    return pickFromList(list, product.sku || product.slug || product._id || product.name);
}

function pickShopMedia(shop = {}) {
    const slug = shop.slug || '';
    const direct = SHOP_MEDIA_BY_SLUG[slug];
    if (direct) return direct;

    const seedValue = shop.slug || shop.name || shop._id || 'shop';
    return {
        logo: pickFromList(PRODUCT_IMAGE_GROUPS.generic, seedValue),
        banner: pickFromList(PRODUCT_IMAGE_GROUPS.habitat, `${seedValue}-banner`)
    };
}

module.exports = {
    PRODUCT_IMAGE_GROUPS,
    SHOP_MEDIA_BY_SLUG,
    pickProductImage,
    pickShopMedia,
    unsplashPhoto
};
