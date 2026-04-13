const express = require('express');

const router = express.Router();

const {
    Shop,
    CareServiceApplication,
    CareServiceDocument,
    CareServiceOffering,
    CareServiceBooking,
    CareServiceReview
} = require('../models');
const { authenticate, requireApprovedSeller } = require('../middleware/auth');
const { sendSuccess, sendCreated } = require('../middleware/responseHandler');
const ApiError = require('../utils/ApiError');
const {
    CARE_SERVICE_APPLICATION_STATUS,
    CARE_SERVICE_LABELS,
    CARE_SERVICE_TYPES,
    CARE_SERVICE_DOCUMENT_TYPE,
    CARE_SERVICE_BOOKING_STATUS
} = require('../config/constants');
const {
    ensureApprovedShop,
    normalizeCareAddress,
    normalizeCareServiceTypes,
    upsertCareTermsAcceptance,
    buildCareServiceContextForShop
} = require('../services/careServiceWorkflow');

router.use(authenticate);
router.use(requireApprovedSeller);

function ensureCareApplicationEditable(application) {
    if (!application) return;

    const editableStatuses = new Set([
        CARE_SERVICE_APPLICATION_STATUS.DRAFT,
        CARE_SERVICE_APPLICATION_STATUS.NEED_MORE_INFORMATION,
        CARE_SERVICE_APPLICATION_STATUS.REJECTED
    ]);

    if (!editableStatuses.has(application.status)) {
        throw ApiError.badRequest('Hồ sơ dịch vụ chăm sóc hiện không thể chỉnh sửa ở trạng thái này');
    }
}

function buildApplicationInput(req) {
    const body = req.body || {};
    return {
        requestedLabel: Object.values(CARE_SERVICE_LABELS).includes(body.requestedLabel)
            ? body.requestedLabel
            : CARE_SERVICE_LABELS.STANDARD,
        facilityName: String(body.facilityName || '').trim(),
        serviceDescription: String(body.serviceDescription || '').trim(),
        serviceTypes: normalizeCareServiceTypes(body.serviceTypes),
        serviceAddress: normalizeCareAddress(body.serviceAddress || {}),
        hotline: String(body.hotline || '').trim(),
        contactEmail: String(body.contactEmail || '').trim().toLowerCase(),
        operatingHours: {
            open: String(body.operatingHours?.open || '').trim(),
            close: String(body.operatingHours?.close || '').trim(),
            notes: String(body.operatingHours?.notes || '').trim()
        },
        supportsHomeService: Boolean(body.supportsHomeService),
        facilityImages: Array.isArray(body.facilityImages)
            ? body.facilityImages.filter(Boolean).map((item) => String(item).trim())
            : [],
        businessRegistrationNumber: String(body.businessRegistrationNumber || '').trim(),
        businessOwnerName: String(body.businessOwnerName || '').trim(),
        qualityCommitment: String(body.qualityCommitment || '').trim(),
        responsibilityCommitment: String(body.responsibilityCommitment || '').trim(),
        supportingNotes: String(body.supportingNotes || '').trim(),
        termsAccepted: Boolean(body.termsAccepted),
        termsAcceptedAt: body.termsAccepted ? new Date() : undefined,
        termsVersion: String(body.termsVersion || 'care-v1').trim(),
        legalResponsibilityConfirmed: Boolean(body.legalResponsibilityConfirmed),
        legalResponsibilityConfirmedAt: body.legalResponsibilityConfirmed ? new Date() : undefined
    };
}

async function replaceDocuments(applicationId, shopId, userId, documents = []) {
    await CareServiceDocument.deleteMany({ application: applicationId });

    const validDocuments = (Array.isArray(documents) ? documents : [])
        .filter((item) => item && item.fileUrl)
        .map((item) => ({
            application: applicationId,
            shop: shopId,
            user: userId,
            type: Object.values(CARE_SERVICE_DOCUMENT_TYPE).includes(item.type)
                ? item.type
                : CARE_SERVICE_DOCUMENT_TYPE.OTHER,
            title: String(item.title || '').trim(),
            fileName: String(item.fileName || '').trim(),
            fileUrl: String(item.fileUrl || '').trim(),
            mimeType: String(item.mimeType || '').trim(),
            size: Number(item.size || 0) || undefined,
            note: String(item.note || '').trim()
        }));

    if (validDocuments.length) {
        await CareServiceDocument.insertMany(validDocuments);
    }
}

async function buildSellerCareResponse(shopId) {
    const context = await buildCareServiceContextForShop(shopId);
    const documents = context.application
        ? await CareServiceDocument.find({ application: context.application._id }).sort({ createdAt: 1 })
        : [];
    const [offerings, bookings, reviews] = await Promise.all([
        CareServiceOffering.find({ shop: shopId }).sort({ updatedAt: -1 }),
        CareServiceBooking.find({ shop: shopId })
            .populate('buyer', 'name email phone')
            .populate('service', 'name serviceType price durationMinutes')
            .sort({ appointmentDate: -1 })
            .limit(30),
        CareServiceReview.find({ shop: shopId })
            .populate('buyer', 'name avatar')
            .populate('service', 'name')
            .sort({ createdAt: -1 })
            .limit(10)
    ]);

    return {
        shop: context.shop,
        application: context.application,
        documents,
        offerings,
        bookings,
        reviews,
        careAccess: {
            status: context.careServiceStatus,
            canOperateCareServices: context.canOperateCareServices,
            label: context.careServiceLabel
        }
    };
}

async function submitApplication(req, shop, existingApplication) {
    const payload = buildApplicationInput(req);

    if (!payload.facilityName || !payload.hotline || !payload.contactEmail || !payload.serviceTypes.length) {
        throw ApiError.badRequest('Vui lòng điền đủ tên cơ sở, hotline, email liên hệ và loại dịch vụ chăm sóc');
    }

    if (!payload.qualityCommitment || !payload.responsibilityCommitment) {
        throw ApiError.badRequest('Vui lòng bổ sung cam kết chất lượng và cam kết trách nhiệm đối với thú cưng');
    }

    if (!Array.isArray(req.body.documents) || !req.body.documents.some((item) => item && item.fileUrl)) {
        throw ApiError.badRequest('Vui lòng tải lên ít nhất một giấy tờ bổ sung cho hồ sơ dịch vụ chăm sóc');
    }

    if (!payload.termsAccepted || !payload.legalResponsibilityConfirmed) {
        throw ApiError.badRequest('Bạn phải đồng ý điều khoản và xác nhận trách nhiệm pháp lý trước khi gửi hồ sơ');
    }

    if (existingApplication) {
        ensureCareApplicationEditable(existingApplication);
    }

    const isResubmission = Boolean(existingApplication && [
        CARE_SERVICE_APPLICATION_STATUS.NEED_MORE_INFORMATION,
        CARE_SERVICE_APPLICATION_STATUS.REJECTED
    ].includes(existingApplication.status));

    const application = await CareServiceApplication.findOneAndUpdate(
        { shop: shop._id },
        {
            ...payload,
            user: req.user._id,
            shop: shop._id,
            submittedAt: existingApplication?.submittedAt || new Date(),
            lastResubmittedAt: isResubmission ? new Date() : existingApplication?.lastResubmittedAt,
            status: CARE_SERVICE_APPLICATION_STATUS.SUBMITTED
        },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    await replaceDocuments(application._id, shop._id, req.user._id, req.body.documents);
    await upsertCareTermsAcceptance({
        userId: req.user._id,
        shopId: shop._id,
        applicationId: application._id,
        accepted: true,
        acceptedAt: payload.termsAcceptedAt || new Date(),
        legalResponsibilityConfirmed: payload.legalResponsibilityConfirmed,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        termsVersion: payload.termsVersion
    });

    shop.careService = {
        ...(shop.careService?.toObject?.() || shop.careService || {}),
        status: CARE_SERVICE_APPLICATION_STATUS.SUBMITTED,
        isEnabled: false,
        label: application.assignedLabel || CARE_SERVICE_LABELS.STANDARD,
        facilityName: application.facilityName,
        description: application.serviceDescription,
        serviceTypes: application.serviceTypes,
        address: application.serviceAddress,
        hotline: application.hotline,
        email: application.contactEmail,
        operatingHours: application.operatingHours,
        supportsHomeService: application.supportsHomeService,
        images: application.facilityImages,
        termsVersion: application.termsVersion,
        termsAcceptedAt: application.termsAcceptedAt,
        statusReason: application.adminNote || ''
    };
    await shop.save();

    return application;
}

function ensureCanOperateCareServices(shop) {
    if (!shop?.careService?.isEnabled || shop.careService?.status !== CARE_SERVICE_APPLICATION_STATUS.APPROVED) {
        throw ApiError.forbidden('Dịch vụ chăm sóc chưa được Admin phê duyệt để vận hành');
    }
}

router.get('/me', async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user._id });
        ensureApprovedShop(shop);
        const payload = await buildSellerCareResponse(shop._id);
        sendSuccess(res, 'Lấy hồ sơ dịch vụ chăm sóc thành công', payload);
    } catch (error) {
        next(error);
    }
});

router.put('/me', async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user._id });
        ensureApprovedShop(shop);

        const application = await CareServiceApplication.findOne({ shop: shop._id });
        ensureCareApplicationEditable(application);

        const payload = buildApplicationInput(req);
        if (!payload.facilityName) {
            throw ApiError.badRequest('Tên cơ sở dịch vụ là bắt buộc');
        }

        const nextStatus = application?.status === CARE_SERVICE_APPLICATION_STATUS.NEED_MORE_INFORMATION
            ? CARE_SERVICE_APPLICATION_STATUS.NEED_MORE_INFORMATION
            : (application?.status === CARE_SERVICE_APPLICATION_STATUS.REJECTED
                ? CARE_SERVICE_APPLICATION_STATUS.REJECTED
                : CARE_SERVICE_APPLICATION_STATUS.DRAFT);

        const updated = await CareServiceApplication.findOneAndUpdate(
            { shop: shop._id },
            {
                ...payload,
                user: req.user._id,
                shop: shop._id,
                status: nextStatus
            },
            { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
        );

        await replaceDocuments(updated._id, shop._id, req.user._id, req.body.documents);

        shop.careService = {
            ...(shop.careService?.toObject?.() || shop.careService || {}),
            status: updated.status,
            isEnabled: false,
            label: updated.assignedLabel || updated.requestedLabel || CARE_SERVICE_LABELS.STANDARD,
            facilityName: updated.facilityName,
            description: updated.serviceDescription,
            serviceTypes: updated.serviceTypes,
            address: updated.serviceAddress,
            hotline: updated.hotline,
            email: updated.contactEmail,
            operatingHours: updated.operatingHours,
            supportsHomeService: updated.supportsHomeService,
            images: updated.facilityImages,
            statusReason: updated.adminNote || ''
        };
        await shop.save();

        const responsePayload = await buildSellerCareResponse(shop._id);
        sendSuccess(res, 'Lưu nháp hồ sơ dịch vụ chăm sóc thành công', responsePayload);
    } catch (error) {
        next(error);
    }
});

router.post('/me/submit', async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user._id });
        ensureApprovedShop(shop);
        const existing = await CareServiceApplication.findOne({ shop: shop._id });
        await submitApplication(req, shop, existing);
        const payload = await buildSellerCareResponse(shop._id);
        sendCreated(res, 'Gửi hồ sơ dịch vụ chăm sóc thành công. Hồ sơ đang chờ Admin xét duyệt.', payload);
    } catch (error) {
        next(error);
    }
});

router.post('/me/resubmit', async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user._id });
        ensureApprovedShop(shop);
        const existing = await CareServiceApplication.findOne({ shop: shop._id });

        if (!existing) {
            throw ApiError.notFound('Bạn chưa có hồ sơ dịch vụ chăm sóc');
        }

        if (![CARE_SERVICE_APPLICATION_STATUS.NEED_MORE_INFORMATION, CARE_SERVICE_APPLICATION_STATUS.REJECTED].includes(existing.status)) {
            throw ApiError.badRequest('Hồ sơ hiện tại không cần gửi bổ sung');
        }

        await submitApplication(req, shop, existing);
        const payload = await buildSellerCareResponse(shop._id);
        sendSuccess(res, 'Gửi lại hồ sơ dịch vụ chăm sóc thành công', payload);
    } catch (error) {
        next(error);
    }
});

router.get('/offerings', async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user._id });
        ensureApprovedShop(shop);
        ensureCanOperateCareServices(shop);
        const offerings = await CareServiceOffering.find({ shop: shop._id }).sort({ updatedAt: -1 });
        sendSuccess(res, 'Lấy danh sách dịch vụ thành công', offerings);
    } catch (error) {
        next(error);
    }
});

router.post('/offerings', async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user._id });
        ensureApprovedShop(shop);
        ensureCanOperateCareServices(shop);

        const payload = {
            name: String(req.body.name || '').trim(),
            serviceType: req.body.serviceType,
            description: String(req.body.description || '').trim(),
            price: Number(req.body.price || 0),
            durationMinutes: Number(req.body.durationMinutes || 0),
            image: String(req.body.image || '').trim(),
            supportsHomeService: Boolean(req.body.supportsHomeService),
            isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true
        };

        if (!payload.name || !Object.values(CARE_SERVICE_TYPES).includes(payload.serviceType) || payload.price < 0 || payload.durationMinutes < 15) {
            throw ApiError.badRequest('Thông tin dịch vụ chăm sóc không hợp lệ');
        }

        const offering = await CareServiceOffering.create({
            ...payload,
            shop: shop._id,
            seller: req.user._id
        });

        sendCreated(res, 'Tạo dịch vụ chăm sóc thành công', offering);
    } catch (error) {
        next(error);
    }
});

router.put('/offerings/:id', async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user._id });
        ensureApprovedShop(shop);
        ensureCanOperateCareServices(shop);

        const offering = await CareServiceOffering.findOne({ _id: req.params.id, shop: shop._id, seller: req.user._id });
        if (!offering) {
            throw ApiError.notFound('Không tìm thấy dịch vụ chăm sóc');
        }

        const allowedFields = ['name', 'serviceType', 'description', 'price', 'durationMinutes', 'image', 'supportsHomeService', 'isActive'];
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                offering[field] = field === 'name' || field === 'description' || field === 'image'
                    ? String(req.body[field] || '').trim()
                    : req.body[field];
            }
        });

        if (!offering.name || !Object.values(CARE_SERVICE_TYPES).includes(offering.serviceType) || Number(offering.price) < 0 || Number(offering.durationMinutes) < 15) {
            throw ApiError.badRequest('Thông tin dịch vụ chăm sóc không hợp lệ');
        }

        await offering.save();
        sendSuccess(res, 'Cập nhật dịch vụ chăm sóc thành công', offering);
    } catch (error) {
        next(error);
    }
});

router.delete('/offerings/:id', async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user._id });
        ensureApprovedShop(shop);
        ensureCanOperateCareServices(shop);

        const offering = await CareServiceOffering.findOneAndDelete({ _id: req.params.id, shop: shop._id, seller: req.user._id });
        if (!offering) {
            throw ApiError.notFound('Không tìm thấy dịch vụ chăm sóc');
        }

        sendSuccess(res, 'Xóa dịch vụ chăm sóc thành công');
    } catch (error) {
        next(error);
    }
});

router.get('/bookings', async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user._id });
        ensureApprovedShop(shop);
        ensureCanOperateCareServices(shop);

        const filter = { shop: shop._id };
        if (req.query.status && Object.values(CARE_SERVICE_BOOKING_STATUS).includes(req.query.status)) {
            filter.status = req.query.status;
        }

        const bookings = await CareServiceBooking.find(filter)
            .populate('buyer', 'name email phone')
            .populate('service', 'name serviceType price durationMinutes')
            .sort({ appointmentDate: -1 })
            .limit(parseInt(req.query.limit || '50', 10));

        sendSuccess(res, 'Lấy lịch hẹn dịch vụ thành công', bookings);
    } catch (error) {
        next(error);
    }
});

router.put('/bookings/:id/status', async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user._id });
        ensureApprovedShop(shop);
        ensureCanOperateCareServices(shop);

        const booking = await CareServiceBooking.findOne({ _id: req.params.id, shop: shop._id });
        if (!booking) {
            throw ApiError.notFound('Không tìm thấy lịch hẹn dịch vụ');
        }

        const status = String(req.body.status || '').trim();
        if (!Object.values(CARE_SERVICE_BOOKING_STATUS).includes(status)) {
            throw ApiError.badRequest('Trạng thái lịch hẹn không hợp lệ');
        }

        booking.status = status;
        booking.sellerNote = req.body.sellerNote !== undefined ? String(req.body.sellerNote || '').trim() : booking.sellerNote;

        if (status === CARE_SERVICE_BOOKING_STATUS.CONFIRMED) booking.confirmedAt = new Date();
        if (status === CARE_SERVICE_BOOKING_STATUS.COMPLETED) booking.completedAt = new Date();
        if (status === CARE_SERVICE_BOOKING_STATUS.CANCELLED) booking.cancelledAt = new Date();
        if (status === CARE_SERVICE_BOOKING_STATUS.REJECTED) booking.rejectedAt = new Date();

        await booking.save();
        sendSuccess(res, 'Cập nhật lịch hẹn dịch vụ thành công', booking);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
