require('dotenv').config();

const mongoose = require('mongoose');
const {
    Shop,
    CareServiceApplication,
    CareServiceDocument,
    CareServiceTermsAcceptance,
    CareServiceAdminReviewLog,
    CareServiceOffering
} = require('../models');
const Admin = require('../models/admin/Admin');
const {
    CARE_SERVICE_APPLICATION_STATUS,
    CARE_SERVICE_LABELS,
    CARE_SERVICE_TYPES,
    CARE_SERVICE_DOCUMENT_TYPE,
    SHOP_STATUS
} = require('../config/constants');
const { syncShopCareServiceProfile } = require('../services/careServiceWorkflow');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pet_marketplace';

const APPROVED_AT = new Date('2026-04-13T10:00:00.000Z');
const TERMS_VERSION = 'care-v1';

const SHOP_CARE_CONFIGS = [
    {
        slug: 'dog-shop',
        facilityName: 'Happy Dog Care Studio',
        requestedLabel: CARE_SERVICE_LABELS.PREMIUM_CARE_PARTNER,
        serviceDescription: 'Trung tam cham soc cho cho cung cap day du cac dich vu tam say, grooming, ve sinh, luu tru va cham soc tai nha theo lich hen.',
        hotline: '0910000001',
        contactEmail: 'care@happydoghouse.vn',
        operatingHours: {
            open: '08:00',
            close: '20:00',
            notes: 'Nhan lich ca tuan, uu tien khach dat lich truoc.'
        },
        supportsHomeService: true,
        facilityImages: [
            'https://images.unsplash.com/photo-1516734212186-65266f79a5fe?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80'
        ],
        businessRegistrationNumber: 'HCM-DOG-2026-001',
        businessOwnerName: 'Nguyen Hoang Anh',
        qualityCommitment: 'Cam ket su dung san pham cham soc co nguon goc ro rang, quy trinh ve sinh khu dich vu duoc kiem soat moi ngay.',
        responsibilityCommitment: 'Cam ket tiep nhan, cham soc va theo doi tinh trang thu cung xuyen suot qua trinh su dung dich vu.',
        supportingNotes: 'Shop PetMall co doi ngu grooming kinh nghiem va khu luu tru rieng cho cho vua va nho.',
        offerings: [
            {
                serviceType: CARE_SERVICE_TYPES.BATHING_DRYING,
                name: 'Tam say khui mui cao cap cho cho',
                description: 'Tam lam sach long, say kho, khu mui nhe va duong long mem muot cho thu cung.',
                price: 180000,
                durationMinutes: 60,
                image: 'https://images.unsplash.com/photo-1516734212186-65266f79a5fe?auto=format&fit=crop&w=1200&q=80',
                supportsHomeService: false
            },
            {
                serviceType: CARE_SERVICE_TYPES.GROOMING_SPA,
                name: 'Grooming spa tao kieu',
                description: 'Cat tia long, tao kieu theo giong cho, ket hop cham soc da va duong long.',
                price: 320000,
                durationMinutes: 90,
                image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80',
                supportsHomeService: false
            },
            {
                serviceType: CARE_SERVICE_TYPES.NAIL_EAR_HYGIENE,
                name: 'Ve sinh tai va cat mong',
                description: 'Lam sach tai, cat mong an toan va kiem tra nhanh tinh trang ve sinh co ban.',
                price: 90000,
                durationMinutes: 30,
                image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80',
                supportsHomeService: true
            },
            {
                serviceType: CARE_SERVICE_TYPES.PET_HOTEL,
                name: 'Khach san thu cung qua dem',
                description: 'Phong nghi rieng sach se, co camera, co lich cho an va theo doi theo khung gio.',
                price: 280000,
                durationMinutes: 720,
                image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=1200&q=80',
                supportsHomeService: false
            },
            {
                serviceType: CARE_SERVICE_TYPES.PET_BOARDING,
                name: 'Giu thu cung ban ngay',
                description: 'Nhan giu ban ngay voi khu vui choi va nhan vien theo doi lien tuc.',
                price: 160000,
                durationMinutes: 480,
                image: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?auto=format&fit=crop&w=1200&q=80',
                supportsHomeService: false
            },
            {
                serviceType: CARE_SERVICE_TYPES.BASIC_CARE,
                name: 'Cham soc co ban tai nha',
                description: 'Ho tro cham soc, cho an, ve sinh co ban va dong hanh ngan gio tai nha.',
                price: 220000,
                durationMinutes: 120,
                image: 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=1200&q=80',
                supportsHomeService: true
            }
        ]
    },
    {
        slug: 'cat-shop',
        facilityName: 'Cozy Cat Care Lounge',
        requestedLabel: CARE_SERVICE_LABELS.PREMIUM_CARE_PARTNER,
        serviceDescription: 'Khu dich vu danh rieng cho meo voi phong grooming yen tinh, khu luu tru rieng va cac goi cham soc nhe nhang phu hop tinh cach meo.',
        hotline: '0910000002',
        contactEmail: 'care@cozycatcorner.vn',
        operatingHours: {
            open: '09:00',
            close: '21:00',
            notes: 'Uu tien khung gio chieu toi va co phong cho rieng cho meo nhat.'
        },
        supportsHomeService: true,
        facilityImages: [
            'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=1200&q=80'
        ],
        businessRegistrationNumber: 'HCM-CAT-2026-002',
        businessOwnerName: 'Tran Minh Chau',
        qualityCommitment: 'Cam ket quy trinh tiep nhan meo than trong, khong gay stress va su dung san pham phu hop voi da nhay cam.',
        responsibilityCommitment: 'Cam ket giam sat xuyen suot, cap nhat thong tin thu cung cho chu nuoi trong suot lich hen va thoi gian luu tru.',
        supportingNotes: 'Shop PetMall co khu luu tru rieng cho meo va dich vu dat lich linh hoat trong ngay.',
        offerings: [
            {
                serviceType: CARE_SERVICE_TYPES.BATHING_DRYING,
                name: 'Tam say em diu cho meo',
                description: 'Tam lam sach, say kho nhiet do phu hop va giup meo de chiu hon sau buoi cham soc.',
                price: 200000,
                durationMinutes: 60,
                image: 'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&w=1200&q=80',
                supportsHomeService: false
            },
            {
                serviceType: CARE_SERVICE_TYPES.GROOMING_SPA,
                name: 'Grooming spa thu gian',
                description: 'Cat tia long roi, go roi, duong long mem va ve sinh vung bung chan cho meo.',
                price: 340000,
                durationMinutes: 90,
                image: 'https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=1200&q=80',
                supportsHomeService: false
            },
            {
                serviceType: CARE_SERVICE_TYPES.NAIL_EAR_HYGIENE,
                name: 'Ve sinh tai mong nhe nhang',
                description: 'Cat mong, ve sinh tai va kiem tra nhanh cac dau hieu kich ung thuong gap.',
                price: 95000,
                durationMinutes: 30,
                image: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=1200&q=80',
                supportsHomeService: true
            },
            {
                serviceType: CARE_SERVICE_TYPES.PET_HOTEL,
                name: 'Khach san meo yen tinh',
                description: 'Phong luu tru rieng, khu leo treo va khung gio cho an theo thoi quen cua meo.',
                price: 300000,
                durationMinutes: 720,
                image: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=1200&q=80',
                supportsHomeService: false
            },
            {
                serviceType: CARE_SERVICE_TYPES.PET_BOARDING,
                name: 'Nhan giu meo ban ngay',
                description: 'Nhan giu ban ngay cho meo can noi o tam thoi, co goc nghi va goc choi rieng.',
                price: 170000,
                durationMinutes: 480,
                image: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?auto=format&fit=crop&w=1200&q=80',
                supportsHomeService: false
            },
            {
                serviceType: CARE_SERVICE_TYPES.BASIC_CARE,
                name: 'Cham soc co ban tai nha cho meo',
                description: 'Ho tro cho an, thay cat, choi cung meo va theo doi tinh trang co ban tai nha.',
                price: 230000,
                durationMinutes: 120,
                image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=80',
                supportsHomeService: true
            }
        ]
    }
];

function buildServiceAddress(shop, config) {
    const street = shop.address?.street || '';
    const ward = shop.address?.ward || '';
    const district = shop.address?.district || '';
    const city = shop.address?.city || '';
    const fullAddress = [street, ward, district, city].filter(Boolean).join(', ');

    return {
        street,
        ward,
        district,
        city,
        fullAddress
    };
}

function buildDocumentPayloads(application, shop, owner, config) {
    return [
        {
            application: application._id,
            shop: shop._id,
            user: owner._id,
            type: CARE_SERVICE_DOCUMENT_TYPE.BUSINESS_REGISTRATION,
            title: 'Giay dang ky co so dich vu cham soc',
            fileName: `${shop.slug}-business-registration.pdf`,
            fileUrl: `https://petshop.local/documents/${shop.slug}/business-registration.pdf`,
            mimeType: 'application/pdf',
            size: 245000,
            note: config.businessRegistrationNumber
        },
        {
            application: application._id,
            shop: shop._id,
            user: owner._id,
            type: CARE_SERVICE_DOCUMENT_TYPE.QUALITY_COMMITMENT,
            title: 'Cam ket chat luong dich vu',
            fileName: `${shop.slug}-quality-commitment.pdf`,
            fileUrl: `https://petshop.local/documents/${shop.slug}/quality-commitment.pdf`,
            mimeType: 'application/pdf',
            size: 146000,
            note: 'Cam ket chat luong va quy trinh ve sinh'
        },
        {
            application: application._id,
            shop: shop._id,
            user: owner._id,
            type: CARE_SERVICE_DOCUMENT_TYPE.RESPONSIBILITY_COMMITMENT,
            title: 'Cam ket trach nhiem voi thu cung tiep nhan',
            fileName: `${shop.slug}-responsibility-commitment.pdf`,
            fileUrl: `https://petshop.local/documents/${shop.slug}/responsibility-commitment.pdf`,
            mimeType: 'application/pdf',
            size: 138000,
            note: 'Cam ket boi thuong va xu ly su co theo quy dinh cua san'
        },
        {
            application: application._id,
            shop: shop._id,
            user: owner._id,
            type: CARE_SERVICE_DOCUMENT_TYPE.TRAINING_CERTIFICATE,
            title: 'Chung chi grooming',
            fileName: `${shop.slug}-grooming-certificate.pdf`,
            fileUrl: `https://petshop.local/documents/${shop.slug}/grooming-certificate.pdf`,
            mimeType: 'application/pdf',
            size: 121000,
            note: 'Nhan su phu trach grooming da qua dao tao'
        },
        ...config.facilityImages.map((fileUrl, index) => ({
            application: application._id,
            shop: shop._id,
            user: owner._id,
            type: CARE_SERVICE_DOCUMENT_TYPE.FACILITY_IMAGE,
            title: `Anh co so dich vu ${index + 1}`,
            fileName: `${shop.slug}-facility-${index + 1}.jpg`,
            fileUrl,
            mimeType: 'image/jpeg',
            size: 320000 + (index * 20000),
            note: 'Anh khu cham soc va tiep nhan thu cung'
        }))
    ];
}

async function ensureApprovedLog(application, shop, adminId, note, label) {
    const existing = await CareServiceAdminReviewLog.findOne({
        application: application._id,
        admin: adminId,
        action: CARE_SERVICE_APPLICATION_STATUS.APPROVED
    });

    if (existing) return existing;

    return CareServiceAdminReviewLog.create({
        application: application._id,
        shop: shop._id,
        admin: adminId,
        action: CARE_SERVICE_APPLICATION_STATUS.APPROVED,
        note,
        payload: { label }
    });
}

async function upsertOfferings(shop, owner, config) {
    let activeCount = 0;

    for (const offering of config.offerings) {
        const updated = await CareServiceOffering.findOneAndUpdate(
            {
                shop: shop._id,
                seller: owner._id,
                serviceType: offering.serviceType
            },
            {
                shop: shop._id,
                seller: owner._id,
                name: offering.name,
                serviceType: offering.serviceType,
                description: offering.description,
                price: offering.price,
                durationMinutes: offering.durationMinutes,
                image: offering.image,
                supportsHomeService: offering.supportsHomeService,
                isActive: true
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true
            }
        );

        await CareServiceOffering.updateMany(
            {
                shop: shop._id,
                seller: owner._id,
                serviceType: offering.serviceType,
                _id: { $ne: updated._id }
            },
            { isActive: false }
        );

        activeCount += 1;
    }

    return activeCount;
}

async function seedShopCareServices(admin, config) {
    const shop = await Shop.findOne({ slug: config.slug }).populate('owner');
    if (!shop) {
        throw new Error(`Khong tim thay shop voi slug ${config.slug}`);
    }

    if (shop.status !== SHOP_STATUS.APPROVED) {
        shop.status = SHOP_STATUS.APPROVED;
        await shop.save();
    }

    const owner = shop.owner;
    const serviceAddress = buildServiceAddress(shop, config);
    const serviceTypes = Object.values(CARE_SERVICE_TYPES);
    const note = `Duyet day du dich vu cham soc cho shop PetMall ${shop.name}.`;

    const application = await CareServiceApplication.findOneAndUpdate(
        { shop: shop._id },
        {
            user: owner._id,
            shop: shop._id,
            requestedLabel: config.requestedLabel,
            assignedLabel: CARE_SERVICE_LABELS.PREMIUM_CARE_PARTNER,
            facilityName: config.facilityName,
            serviceDescription: config.serviceDescription,
            serviceTypes,
            serviceAddress,
            hotline: config.hotline,
            contactEmail: config.contactEmail,
            operatingHours: config.operatingHours,
            supportsHomeService: config.supportsHomeService,
            facilityImages: config.facilityImages,
            businessRegistrationNumber: config.businessRegistrationNumber,
            businessOwnerName: config.businessOwnerName,
            qualityCommitment: config.qualityCommitment,
            responsibilityCommitment: config.responsibilityCommitment,
            supportingNotes: config.supportingNotes,
            termsAccepted: true,
            termsAcceptedAt: APPROVED_AT,
            termsVersion: TERMS_VERSION,
            legalResponsibilityConfirmed: true,
            legalResponsibilityConfirmedAt: APPROVED_AT,
            status: CARE_SERVICE_APPLICATION_STATUS.APPROVED,
            adminNote: note,
            reviewedBy: admin._id,
            reviewedAt: APPROVED_AT,
            submittedAt: APPROVED_AT,
            lastResubmittedAt: APPROVED_AT
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    await CareServiceTermsAcceptance.findOneAndUpdate(
        { user: owner._id, application: application._id },
        {
            shop: shop._id,
            accepted: true,
            acceptedAt: APPROVED_AT,
            termsVersion: TERMS_VERSION,
            legalResponsibilityConfirmed: true,
            legalResponsibilityConfirmedAt: APPROVED_AT,
            ipAddress: '127.0.0.1',
            userAgent: 'pet-shop-seed'
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    await CareServiceDocument.deleteMany({ application: application._id });
    await CareServiceDocument.insertMany(buildDocumentPayloads(application, shop, owner, config));

    await syncShopCareServiceProfile({
        shop,
        application,
        adminId: admin._id,
        status: CARE_SERVICE_APPLICATION_STATUS.APPROVED,
        note,
        label: CARE_SERVICE_LABELS.PREMIUM_CARE_PARTNER
    });

    await ensureApprovedLog(
        application,
        shop,
        admin._id,
        note,
        CARE_SERVICE_LABELS.PREMIUM_CARE_PARTNER
    );

    const activeOfferings = await upsertOfferings(shop, owner, config);

    return {
        shop: shop.name,
        slug: shop.slug,
        owner: owner.email,
        applicationStatus: application.status,
        label: application.assignedLabel,
        activeOfferings
    };
}

async function run() {
    await mongoose.connect(MONGODB_URI);

    try {
        const admin = await Admin.findOne({ email: 'admin@petshop.com' });
        if (!admin) {
            throw new Error('Khong tim thay tai khoan admin@petshop.com');
        }

        const results = [];
        for (const config of SHOP_CARE_CONFIGS) {
            const result = await seedShopCareServices(admin, config);
            results.push(result);
        }

        console.log('Da cap nhat dich vu cham soc cho cac shop PetMall:');
        results.forEach((result) => {
            console.log(`- ${result.shop} (${result.slug}) | ${result.label} | ${result.activeOfferings} dich vu`);
        });
    } finally {
        await mongoose.disconnect();
    }
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
