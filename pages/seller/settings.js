const settingsState = {
    activeTab: 'profile',
    user: null,
    shop: null,
    avatar: '',
    careService: {
        application: null,
        documents: [],
        offerings: [],
        bookings: [],
        reviews: [],
        access: null,
        facilityImages: []
    },
    toastTimer: null
};

const SETTINGS_DEFAULT_AVATAR = '/assets/photos/cat.jpg';
const SETTINGS_DEFAULT_LOGO = '/assets/photos/cat.jpg';
const SETTINGS_DEFAULT_BANNER = '/assets/photos/dog.jpg';

document.addEventListener('DOMContentLoaded', async () => {
    if (!authManager.isLoggedIn() || !authManager.isSeller()) {
        authManager.showNotification('Vui lòng đăng nhập bằng tài khoản người bán để vào cài đặt', 'error');
        window.location.href = '/';
        return;
    }

    bindSettingsShell();
    await loadSettingsData();
    await loadCareServiceData();
});

function bindSettingsShell() {
    document.getElementById('sellerSidebarToggle')?.addEventListener('click', () => {
        document.body.classList.toggle('seller-sidebar-open');
    });

    document.getElementById('sellerSidebarBackdrop')?.addEventListener('click', () => {
        document.body.classList.remove('seller-sidebar-open');
    });

    document.getElementById('settingsAddProductButton')?.addEventListener('click', () => {
        window.location.href = '/pages/seller/create-product.html';
    });

    document.querySelectorAll('[data-settings-tab]').forEach((button) => {
        button.addEventListener('click', () => setActiveSettingsTab(button.dataset.settingsTab));
    });

    document.getElementById('settingsSearchInput')?.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const search = event.target.value.trim();
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        window.location.href = `/pages/seller/products.html${query}`;
    });

    document.getElementById('settingsNotificationButton')?.addEventListener('click', () => {
        window.location.href = '/pages/seller/orders.html';
    });

    document.getElementById('settingsSelfButton')?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('settingsAvatarPromptButton')?.addEventListener('click', () => openSettingsFilePicker('settingsAvatarFileInput'));
    document.getElementById('settingsAvatarUploadButton')?.addEventListener('click', () => openSettingsFilePicker('settingsAvatarFileInput'));
    document.getElementById('settingsAvatarFileInput')?.addEventListener('change', handleAvatarFileUpload);
    document.getElementById('settingsAvatarRemoveButton')?.addEventListener('click', removeAvatar);

    document.getElementById('settingsShopLogoUploadButton')?.addEventListener('click', () => openSettingsFilePicker('settingsShopLogoFileInput'));
    document.getElementById('settingsShopBannerUploadButton')?.addEventListener('click', () => openSettingsFilePicker('settingsShopBannerFileInput'));
    document.getElementById('settingsShopLogoFileInput')?.addEventListener('change', (event) => handleShopImageUpload(event, 'logo'));
    document.getElementById('settingsShopBannerFileInput')?.addEventListener('change', (event) => handleShopImageUpload(event, 'banner'));

    document.getElementById('settingsToastClose')?.addEventListener('click', hideSettingsToast);
    document.getElementById('settingsProfileForm')?.addEventListener('submit', saveProfileSettings);
    document.getElementById('settingsShopForm')?.addEventListener('submit', saveShopSettings);
    document.getElementById('settingsPasswordForm')?.addEventListener('submit', savePasswordSettings);
    document.getElementById('careServiceApplicationForm')?.addEventListener('submit', (event) => {
        event.preventDefault();
        submitCareServiceApplication();
    });
    document.getElementById('careServiceSaveDraftButton')?.addEventListener('click', saveCareServiceDraft);
    document.getElementById('careFacilityImagesUploadButton')?.addEventListener('click', () => openSettingsFilePicker('careFacilityImagesInput'));
    document.getElementById('careFacilityImagesInput')?.addEventListener('change', handleCareFacilityImagesUpload);
    document.getElementById('careDocumentUploadButton')?.addEventListener('click', () => openSettingsFilePicker('careDocumentInput'));
    document.getElementById('careDocumentInput')?.addEventListener('change', handleCareDocumentUpload);
    document.getElementById('careOfferingForm')?.addEventListener('submit', saveCareOffering);
    document.getElementById('careOfferingResetButton')?.addEventListener('click', resetCareOfferingForm);
    document.getElementById('careOfferingImageUploadButton')?.addEventListener('click', () => openSettingsFilePicker('careOfferingImageInput'));
    document.getElementById('careOfferingImageInput')?.addEventListener('change', handleCareOfferingImageUpload);

    ['settingsShopLogo', 'settingsShopBanner'].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', updateShopPreviewImages);
    });

    [
        'settingsShopLatitude',
        'settingsShopLongitude',
        'settingsShopGoogleMapsUrl',
        'settingsShopEmbedUrl',
        'settingsShopStreet',
        'settingsShopWard',
        'settingsShopDistrict',
        'settingsShopCity'
    ].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', updateShopMapPreview);
    });
}

async function loadSettingsData() {
    try {
        const response = await api.getProfile();
        const payload = response.data || {};
        settingsState.user = payload.user || authManager.user || {};
        settingsState.shop = payload.shop || authManager.shop || {};
        settingsState.avatar = settingsState.user.avatar || '';

        authManager.user = settingsState.user;
        authManager.shop = settingsState.shop || null;
        localStorage.setItem('user', JSON.stringify(settingsState.user));
        if (settingsState.shop) {
            localStorage.setItem('shop', JSON.stringify(settingsState.shop));
        }

        hydrateSettingsView();
    } catch (error) {
        console.error('Không thể tải dữ liệu cài đặt', error);
        authManager.showNotification(error.message || 'Không thể tải dữ liệu cài đặt', 'error');
    }
}

function hydrateSettingsView() {
    const user = settingsState.user || {};
    const shop = settingsState.shop || {};

    document.getElementById('settingsTopbarName').textContent = user.name || 'Người bán';
    document.getElementById('settingsTopbarBadge').textContent = shop.status === 'approved' ? 'Nhà bán kim cương' : 'Shop đang chờ duyệt';
    document.getElementById('settingsTopbarAvatar').src = user.avatar || SETTINGS_DEFAULT_AVATAR;
    document.getElementById('settingsAvatarPreview').src = user.avatar || SETTINGS_DEFAULT_AVATAR;

    document.getElementById('settingsProfileName').value = user.name || '';
    document.getElementById('settingsProfilePhone').value = user.phone || '';
    document.getElementById('settingsProfileEmail').value = user.email || '';

    document.getElementById('settingsShopName').value = shop.name || '';
    document.getElementById('settingsShopPhone').value = shop.phone || '';
    document.getElementById('settingsShopEmail').value = shop.email || '';
    document.getElementById('settingsShopStatus').value = formatLabel(shop.status || 'pending');
    document.getElementById('settingsShopDescription').value = shop.description || '';
    document.getElementById('settingsShopLogo').value = shop.logo || '';
    document.getElementById('settingsShopBanner').value = shop.banner || '';
    document.getElementById('settingsShopStreet').value = shop.address?.street || '';
    document.getElementById('settingsShopWard').value = shop.address?.ward || '';
    document.getElementById('settingsShopDistrict').value = shop.address?.district || '';
    document.getElementById('settingsShopCity').value = shop.address?.city || '';
    document.getElementById('settingsShopLatitude').value = shop.location?.latitude ?? '';
    document.getElementById('settingsShopLongitude').value = shop.location?.longitude ?? '';
    document.getElementById('settingsShopGoogleMapsUrl').value = shop.location?.googleMapsUrl || '';
    document.getElementById('settingsShopEmbedUrl').value = shop.location?.embedUrl || '';
    document.getElementById('settingsPolicyShipping').value = shop.policies?.shipping || '';
    document.getElementById('settingsPolicyReturn').value = shop.policies?.return || '';
    document.getElementById('settingsPolicyWarranty').value = shop.policies?.warranty || '';

    updateShopPreviewImages();
    updateShopMapPreview();
}

function careServiceStatusMeta(status) {
    const map = {
        none: {
            badge: 'Chưa tạo hồ sơ',
            description: 'Shop chưa gửi hồ sơ bổ sung dịch vụ chăm sóc. Bạn có thể lưu nháp, tải giấy tờ và gửi cho Admin khi sẵn sàng.'
        },
        draft: {
            badge: 'Bản nháp',
            description: 'Hồ sơ dịch vụ đang ở bản nháp và chưa được gửi cho Admin.'
        },
        submitted: {
            badge: 'Đã gửi',
            description: 'Hồ sơ đã gửi thành công và đang chờ Admin tiếp nhận.'
        },
        pending_review: {
            badge: 'Đang xét duyệt',
            description: 'Admin đang kiểm tra hồ sơ và giấy tờ dịch vụ chăm sóc của shop.'
        },
        need_more_information: {
            badge: 'Cần bổ sung',
            description: 'Admin yêu cầu bổ sung thêm thông tin hoặc giấy tờ trước khi tiếp tục xét duyệt.'
        },
        approved: {
            badge: 'Đã duyệt',
            description: 'Dịch vụ chăm sóc đã được bật. Shop có thể đăng dịch vụ, nhận lịch hẹn và theo dõi đánh giá.'
        },
        rejected: {
            badge: 'Bị từ chối',
            description: 'Hồ sơ dịch vụ bị từ chối. Bạn có thể chỉnh sửa và gửi lại hồ sơ.'
        },
        suspended: {
            badge: 'Tạm khóa',
            description: 'Phần dịch vụ chăm sóc đang bị tạm khóa theo quyết định của Admin.'
        },
        permanently_banned: {
            badge: 'Cấm vĩnh viễn',
            description: 'Phần dịch vụ chăm sóc đã bị khóa vĩnh viễn do vi phạm nghiêm trọng.'
        }
    };

    return map[status || 'none'] || map.none;
}

const careServiceTypeLabels = {
    bathing_drying: 'Tắm, sấy',
    grooming_spa: 'Grooming, spa',
    nail_ear_hygiene: 'Vệ sinh tai, móng',
    pet_hotel: 'Khách sạn thú cưng',
    pet_boarding: 'Giữ thú cưng',
    basic_care: 'Chăm sóc cơ bản'
};

const careDocumentTypeLabels = {
    business_registration: 'Đăng ký kinh doanh / hộ kinh doanh',
    quality_commitment: 'Cam kết chất lượng',
    responsibility_commitment: 'Cam kết trách nhiệm',
    training_certificate: 'Chứng chỉ / đào tạo grooming',
    facility_image: 'Ảnh cơ sở',
    other: 'Tài liệu khác'
};

async function loadCareServiceData() {
    try {
        const response = await api.getSellerCareService();
        const payload = response.data || {};
        settingsState.careService.application = payload.application || null;
        settingsState.careService.documents = Array.isArray(payload.documents) ? payload.documents : [];
        settingsState.careService.offerings = Array.isArray(payload.offerings) ? payload.offerings : [];
        settingsState.careService.bookings = Array.isArray(payload.bookings) ? payload.bookings : [];
        settingsState.careService.reviews = Array.isArray(payload.reviews) ? payload.reviews : [];
        settingsState.careService.access = payload.careAccess || null;
        settingsState.careService.facilityImages = Array.isArray(payload.application?.facilityImages)
            ? [...payload.application.facilityImages]
            : [];

        hydrateCareServiceView();
    } catch (error) {
        settingsState.careService.application = null;
        settingsState.careService.documents = [];
        settingsState.careService.offerings = [];
        settingsState.careService.bookings = [];
        settingsState.careService.reviews = [];
        settingsState.careService.access = null;
        settingsState.careService.facilityImages = [];

        const description = document.getElementById('careServiceStatusDescription');
        if (description) {
            description.textContent = error.message || 'Không thể tải hồ sơ dịch vụ chăm sóc lúc này.';
        }
        hydrateCareServiceView();
    }
}

function hydrateCareServiceView() {
    const application = settingsState.careService.application || {};
    const access = settingsState.careService.access || {};
    const status = access.status || application.status || 'none';
    const meta = careServiceStatusMeta(status);
    const editable = ['none', 'draft', 'need_more_information', 'rejected'].includes(status);
    const canManage = Boolean(access.canOperateCareServices);

    const badge = document.getElementById('careServiceStatusBadge');
    const description = document.getElementById('careServiceStatusDescription');
    const adminNoteBox = document.getElementById('careServiceAdminNoteBox');
    const adminNoteText = document.getElementById('careServiceAdminNoteText');

    if (badge) badge.textContent = meta.badge;
    if (description) description.textContent = meta.description;
    if (adminNoteBox) adminNoteBox.hidden = !application.adminNote;
    if (adminNoteText) adminNoteText.textContent = application.adminNote || '';

    document.getElementById('careFacilityName').value = application.facilityName || '';
    document.getElementById('careRequestedLabel').value = application.requestedLabel || 'standard';
    document.getElementById('careServiceDescription').value = application.serviceDescription || '';
    document.getElementById('careHotline').value = application.hotline || '';
    document.getElementById('careContactEmail').value = application.contactEmail || '';
    document.getElementById('careOpenHour').value = application.operatingHours?.open || '';
    document.getElementById('careCloseHour').value = application.operatingHours?.close || '';
    document.getElementById('careOperatingNotes').value = application.operatingHours?.notes || '';
    document.getElementById('careSupportsHomeService').checked = Boolean(application.supportsHomeService);
    document.getElementById('careStreet').value = application.serviceAddress?.street || '';
    document.getElementById('careWard').value = application.serviceAddress?.ward || '';
    document.getElementById('careDistrict').value = application.serviceAddress?.district || '';
    document.getElementById('careCity').value = application.serviceAddress?.city || '';
    document.getElementById('careBusinessRegistrationNumber').value = application.businessRegistrationNumber || '';
    document.getElementById('careBusinessOwnerName').value = application.businessOwnerName || '';
    document.getElementById('careQualityCommitment').value = application.qualityCommitment || '';
    document.getElementById('careResponsibilityCommitment').value = application.responsibilityCommitment || '';
    document.getElementById('careSupportingNotes').value = application.supportingNotes || '';
    document.getElementById('careTermsAccepted').checked = Boolean(application.termsAccepted);
    document.getElementById('careLegalResponsibilityConfirmed').checked = Boolean(application.legalResponsibilityConfirmed);
    document.querySelectorAll('#careServiceTypeGrid input[type="checkbox"]').forEach((input) => {
        input.checked = Array.isArray(application.serviceTypes) && application.serviceTypes.includes(input.value);
        input.disabled = !editable;
    });

    [
        'careFacilityName',
        'careRequestedLabel',
        'careServiceDescription',
        'careHotline',
        'careContactEmail',
        'careOpenHour',
        'careCloseHour',
        'careOperatingNotes',
        'careSupportsHomeService',
        'careStreet',
        'careWard',
        'careDistrict',
        'careCity',
        'careBusinessRegistrationNumber',
        'careBusinessOwnerName',
        'careQualityCommitment',
        'careResponsibilityCommitment',
        'careSupportingNotes',
        'careTermsAccepted',
        'careLegalResponsibilityConfirmed'
    ].forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
            element.disabled = !editable;
        }
    });

    const saveButton = document.getElementById('careServiceSaveDraftButton');
    const submitButton = document.getElementById('careServiceSubmitButton');
    if (saveButton) saveButton.disabled = !editable;
    if (submitButton) {
        submitButton.disabled = !editable;
        submitButton.textContent = ['need_more_information', 'rejected'].includes(status)
            ? 'Gửi lại hồ sơ dịch vụ'
            : 'Gửi hồ sơ dịch vụ';
    }

    document.getElementById('careFacilityImagesUploadButton').disabled = !editable;
    document.getElementById('careDocumentUploadButton').disabled = !editable;
    document.getElementById('careDocumentTypeSelect').disabled = !editable;

    document.getElementById('careOfferingsState').textContent = canManage ? 'Đang mở' : 'Đang khóa';
    toggleCareManagementState(canManage);
    renderCareFacilityImages();
    renderCareDocuments();
    renderCareOfferings();
    renderCareBookings();
}

function setActiveSettingsTab(tab) {
    settingsState.activeTab = tab;

    document.querySelectorAll('[data-settings-tab]').forEach((button) => {
        button.classList.toggle('active', button.dataset.settingsTab === tab);
    });

    document.querySelectorAll('[data-settings-panel]').forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.settingsPanel === tab);
    });
}

function openSettingsFilePicker(inputId) {
    document.getElementById(inputId)?.click();
}

async function uploadSettingsImage(file, folder = 'general') {
    if (!file) return '';
    const response = await api.uploadImage(file, folder);
    return response?.data?.url || '';
}

async function handleAvatarFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const button = document.getElementById('settingsAvatarUploadButton');
    const originalText = button.textContent;

    try {
        setLoadingButton(button, 'Đang tải ảnh...');
        const uploadedUrl = await uploadSettingsImage(file, 'avatars');
        settingsState.avatar = uploadedUrl;
        document.getElementById('settingsAvatarPreview').src = uploadedUrl || SETTINGS_DEFAULT_AVATAR;
        document.getElementById('settingsTopbarAvatar').src = uploadedUrl || SETTINGS_DEFAULT_AVATAR;
        authManager.showNotification('Đã tải ảnh đại diện lên, nhớ bấm lưu để cập nhật hồ sơ.', 'success');
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể tải ảnh đại diện lên', 'error');
    } finally {
        event.target.value = '';
        restoreLoadingButton(button, originalText);
    }
}

async function handleShopImageUpload(event, field) {
    const file = event.target.files?.[0];
    if (!file) return;

    const buttonId = field === 'logo' ? 'settingsShopLogoUploadButton' : 'settingsShopBannerUploadButton';
    const inputId = field === 'logo' ? 'settingsShopLogo' : 'settingsShopBanner';
    const button = document.getElementById(buttonId);
    const originalText = button.textContent;

    try {
        setLoadingButton(button, 'Đang tải ảnh...');
        const uploadedUrl = await uploadSettingsImage(file, 'shops');
        document.getElementById(inputId).value = uploadedUrl;
        updateShopPreviewImages();
        authManager.showNotification('Đã tải ảnh lên, nhớ bấm lưu để cập nhật shop.', 'success');
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể tải ảnh shop lên', 'error');
    } finally {
        event.target.value = '';
        restoreLoadingButton(button, originalText);
    }
}

function removeAvatar() {
    settingsState.avatar = '';
    document.getElementById('settingsAvatarPreview').src = SETTINGS_DEFAULT_AVATAR;
    document.getElementById('settingsTopbarAvatar').src = SETTINGS_DEFAULT_AVATAR;
    const avatarInput = document.getElementById('settingsAvatarFileInput');
    if (avatarInput) {
        avatarInput.value = '';
    }
}

async function saveProfileSettings(event) {
    event.preventDefault();
    const button = document.getElementById('settingsProfileSaveButton');
    const originalText = button.textContent;

    try {
        setLoadingButton(button, 'Đang lưu...');
        const payload = {
            name: document.getElementById('settingsProfileName').value.trim(),
            phone: document.getElementById('settingsProfilePhone').value.trim(),
            avatar: settingsState.avatar || undefined
        };

        const response = await api.updateProfile(payload);
        settingsState.user = response.data || settingsState.user;
        authManager.user = settingsState.user;
        localStorage.setItem('user', JSON.stringify(settingsState.user));

        document.getElementById('settingsTopbarName').textContent = settingsState.user.name || 'Người bán';
        document.getElementById('settingsTopbarAvatar').src = settingsState.user.avatar || SETTINGS_DEFAULT_AVATAR;
        document.getElementById('settingsAvatarPreview').src = settingsState.user.avatar || SETTINGS_DEFAULT_AVATAR;

        showSettingsToast('Cập nhật thành công!', 'Thông tin cá nhân đã được lưu.');
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể cập nhật thông tin cá nhân', 'error');
    } finally {
        restoreLoadingButton(button, originalText);
    }
}

async function saveShopSettings(event) {
    event.preventDefault();
    const button = document.getElementById('settingsShopSaveButton');
    const originalText = button.textContent;

    try {
        setLoadingButton(button, 'Đang lưu...');
        const payload = {
            name: document.getElementById('settingsShopName').value.trim(),
            description: document.getElementById('settingsShopDescription').value.trim(),
            logo: document.getElementById('settingsShopLogo').value.trim(),
            banner: document.getElementById('settingsShopBanner').value.trim(),
            phone: document.getElementById('settingsShopPhone').value.trim(),
            email: document.getElementById('settingsShopEmail').value.trim(),
            address: collectShopAddressPayload(),
            location: collectShopLocationPayload(),
            policies: {
                shipping: document.getElementById('settingsPolicyShipping').value.trim(),
                return: document.getElementById('settingsPolicyReturn').value.trim(),
                warranty: document.getElementById('settingsPolicyWarranty').value.trim()
            }
        };

        const response = await api.updateShop(payload);
        settingsState.shop = response.data || settingsState.shop;
        authManager.shop = settingsState.shop;
        localStorage.setItem('shop', JSON.stringify(settingsState.shop));

        document.getElementById('settingsTopbarBadge').textContent = settingsState.shop.status === 'approved' ? 'Nhà bán kim cương' : 'Shop đang chờ duyệt';
        document.getElementById('settingsShopStatus').value = formatLabel(settingsState.shop.status || 'pending');
        hydrateSettingsView();

        showSettingsToast('Đã lưu thông tin shop!', 'Thông tin cửa hàng đã được cập nhật trên hệ thống.');
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể lưu thông tin shop', 'error');
    } finally {
        restoreLoadingButton(button, originalText);
    }
}

async function savePasswordSettings(event) {
    event.preventDefault();
    const button = document.getElementById('settingsPasswordSaveButton');
    const originalText = button.textContent;

    const currentPassword = document.getElementById('settingsCurrentPassword').value;
    const newPassword = document.getElementById('settingsNewPassword').value;
    const confirmPassword = document.getElementById('settingsConfirmPassword').value;

    if (newPassword !== confirmPassword) {
        authManager.showNotification('Mật khẩu xác nhận không khớp', 'error');
        return;
    }

    try {
        setLoadingButton(button, 'Đang đổi...');
        await api.changePassword(currentPassword, newPassword);
        document.getElementById('settingsPasswordForm').reset();
        showSettingsToast('Đổi mật khẩu thành công!', 'Mật khẩu mới đã được cập nhật.');
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể đổi mật khẩu', 'error');
    } finally {
        restoreLoadingButton(button, originalText);
    }
}

function updateShopPreviewImages() {
    document.getElementById('settingsShopLogoPreview').src =
        document.getElementById('settingsShopLogo').value.trim() || SETTINGS_DEFAULT_LOGO;
    document.getElementById('settingsShopBannerPreview').src =
        document.getElementById('settingsShopBanner').value.trim() || SETTINGS_DEFAULT_BANNER;
}

function collectShopLocationPayload() {
    const latitude = parseOptionalNumber(document.getElementById('settingsShopLatitude').value);
    const longitude = parseOptionalNumber(document.getElementById('settingsShopLongitude').value);
    const googleMapsUrl = document.getElementById('settingsShopGoogleMapsUrl').value.trim();
    const embedUrl = document.getElementById('settingsShopEmbedUrl').value.trim();

    return {
        ...(latitude !== undefined ? { latitude } : {}),
        ...(longitude !== undefined ? { longitude } : {}),
        ...(googleMapsUrl ? { googleMapsUrl } : {}),
        ...(embedUrl ? { embedUrl } : {})
    };
}

function collectShopAddressPayload() {
    return {
        street: document.getElementById('settingsShopStreet').value.trim(),
        ward: document.getElementById('settingsShopWard').value.trim(),
        district: document.getElementById('settingsShopDistrict').value.trim(),
        city: document.getElementById('settingsShopCity').value.trim()
    };
}

function updateShopMapPreview() {
    const location = collectShopLocationPayload();
    const address = collectShopAddressPayload();
    const iframe = document.getElementById('settingsShopMapPreview');
    const empty = document.getElementById('settingsShopMapEmpty');
    const link = document.getElementById('settingsShopMapLink');
    const mapUrl = buildShopMapUrl(location, address);
    const embedUrl = buildShopEmbedUrl(location, address);

    if (mapUrl) {
        link.href = mapUrl;
        link.hidden = false;
    } else {
        link.href = '#';
        link.hidden = true;
    }

    if (embedUrl) {
        iframe.src = embedUrl;
        iframe.hidden = false;
        empty.hidden = true;
    } else {
        iframe.src = '';
        iframe.hidden = true;
        empty.hidden = false;
    }
}

function buildShopMapUrl(location = {}, address = {}) {
    const customUrl = sanitizeMapUrl(location.googleMapsUrl);
    if (customUrl) return customUrl;

    if (location.latitude !== undefined && location.longitude !== undefined) {
        return `https://www.google.com/maps?q=${encodeURIComponent(`${location.latitude},${location.longitude}`)}`;
    }

    const query = buildShopAddressQuery(address);
    return query ? `https://www.google.com/maps?q=${encodeURIComponent(query)}` : '';
}

function buildShopEmbedUrl(location = {}, address = {}) {
    const customEmbedUrl = sanitizeMapUrl(location.embedUrl);
    if (customEmbedUrl) return customEmbedUrl;

    if (location.latitude !== undefined && location.longitude !== undefined) {
        return `https://maps.google.com/maps?q=${encodeURIComponent(`${location.latitude},${location.longitude}`)}&z=15&output=embed`;
    }

    const query = buildShopAddressQuery(address);
    return query ? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed` : '';
}

function buildShopAddressQuery(address = {}) {
    return [address.street, address.ward, address.district, address.city].filter(Boolean).join(', ');
}

function parseOptionalNumber(value) {
    const normalized = String(value || '').trim();
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function sanitizeMapUrl(value) {
    if (!value) return '';

    try {
        const parsed = new URL(String(value).trim());
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : '';
    } catch (error) {
        return '';
    }
}

function readCareServiceApplicationPayload() {
    return {
        requestedLabel: document.getElementById('careRequestedLabel').value,
        facilityName: document.getElementById('careFacilityName').value.trim(),
        serviceDescription: document.getElementById('careServiceDescription').value.trim(),
        serviceTypes: Array.from(document.querySelectorAll('#careServiceTypeGrid input[type="checkbox"]:checked')).map((input) => input.value),
        serviceAddress: collectCareServiceAddressPayload(),
        hotline: document.getElementById('careHotline').value.trim(),
        contactEmail: document.getElementById('careContactEmail').value.trim(),
        operatingHours: {
            open: document.getElementById('careOpenHour').value.trim(),
            close: document.getElementById('careCloseHour').value.trim(),
            notes: document.getElementById('careOperatingNotes').value.trim()
        },
        supportsHomeService: document.getElementById('careSupportsHomeService').checked,
        facilityImages: settingsState.careService.facilityImages.slice(),
        businessRegistrationNumber: document.getElementById('careBusinessRegistrationNumber').value.trim(),
        businessOwnerName: document.getElementById('careBusinessOwnerName').value.trim(),
        qualityCommitment: document.getElementById('careQualityCommitment').value.trim(),
        responsibilityCommitment: document.getElementById('careResponsibilityCommitment').value.trim(),
        supportingNotes: document.getElementById('careSupportingNotes').value.trim(),
        termsAccepted: document.getElementById('careTermsAccepted').checked,
        legalResponsibilityConfirmed: document.getElementById('careLegalResponsibilityConfirmed').checked,
        documents: settingsState.careService.documents.map((document) => ({
            type: document.type,
            title: document.title || document.fileName || '',
            fileName: document.fileName || document.originalName || '',
            fileUrl: document.fileUrl || document.url,
            mimeType: document.mimeType,
            size: document.size,
            note: document.note || ''
        }))
    };
}

function validateCareServiceApplicationPayload(payload) {
    const missing = [];

    if (!payload.facilityName) missing.push('Tên khu dịch vụ / cơ sở dịch vụ');
    if (!payload.serviceDescription) missing.push('Mô tả dịch vụ');
    if (!payload.serviceTypes?.length) missing.push('Ít nhất một loại dịch vụ chăm sóc');
    if (!payload.hotline) missing.push('Hotline');
    if (!payload.contactEmail) missing.push('Email liên hệ');
    if (!payload.serviceAddress?.street || !payload.serviceAddress?.district || !payload.serviceAddress?.city) {
        missing.push('Địa chỉ dịch vụ đầy đủ');
    }
    if (!payload.documents?.length) missing.push('Ít nhất một giấy tờ bổ sung');
    if (!payload.qualityCommitment) missing.push('Cam kết chất lượng dịch vụ');
    if (!payload.responsibilityCommitment) missing.push('Cam kết trách nhiệm với thú cưng');
    if (!payload.termsAccepted) missing.push('Xác nhận đã đọc và đồng ý điều khoản');
    if (!payload.legalResponsibilityConfirmed) missing.push('Xác nhận chịu trách nhiệm pháp lý');

    return missing;
}

function collectCareServiceAddressPayload() {
    const address = {
        street: document.getElementById('careStreet').value.trim(),
        ward: document.getElementById('careWard').value.trim(),
        district: document.getElementById('careDistrict').value.trim(),
        city: document.getElementById('careCity').value.trim()
    };

    return {
        ...address,
        fullAddress: [address.street, address.ward, address.district, address.city].filter(Boolean).join(', ')
    };
}

function renderCareFacilityImages() {
    const container = document.getElementById('careFacilityImagesList');
    const images = settingsState.careService.facilityImages || [];

    if (!container) return;

    if (!images.length) {
        container.innerHTML = '<p class="seller-empty-copy">Chưa có ảnh cơ sở nào được tải lên.</p>';
        return;
    }

    container.innerHTML = images.map((url, index) => `
        <article class="seller-care-image-item">
            <img src="${url}" alt="Ảnh cơ sở dịch vụ ${index + 1}">
            <button class="seller-text-danger-button" type="button" data-care-remove-image="${index}">Gỡ ảnh</button>
        </article>
    `).join('');

    container.querySelectorAll('[data-care-remove-image]').forEach((button) => {
        button.addEventListener('click', () => {
            settingsState.careService.facilityImages.splice(Number(button.dataset.careRemoveImage), 1);
            renderCareFacilityImages();
        });
    });
}

function renderCareDocuments() {
    const container = document.getElementById('careDocumentList');
    const documents = settingsState.careService.documents || [];

    if (!container) return;

    if (!documents.length) {
        container.innerHTML = '<p class="seller-empty-copy">Chưa có giấy tờ nào được tải lên.</p>';
        return;
    }

    container.innerHTML = documents.map((document, index) => `
        <article class="seller-care-document-item">
            <div>
                <strong>${careDocumentTypeLabels[document.type] || 'Tài liệu'}</strong>
                <p>${document.title || document.fileName || document.originalName || 'Tài liệu đã tải'}</p>
                <small>${Math.max(1, Math.round((document.size || 0) / 1024))} KB</small>
            </div>
            <div class="seller-care-item-actions">
                <a class="seller-secondary-button seller-inline-link" href="${document.fileUrl || document.url}" target="_blank" rel="noreferrer">Xem</a>
                <button class="seller-text-danger-button" type="button" data-care-remove-document="${index}">Xóa</button>
            </div>
        </article>
    `).join('');

    container.querySelectorAll('[data-care-remove-document]').forEach((button) => {
        button.addEventListener('click', () => {
            settingsState.careService.documents.splice(Number(button.dataset.careRemoveDocument), 1);
            renderCareDocuments();
        });
    });
}

function renderCareOfferings() {
    const container = document.getElementById('careOfferingList');
    const offerings = settingsState.careService.offerings || [];
    const canManage = Boolean(settingsState.careService.access?.canOperateCareServices);

    if (!container) return;

    if (!offerings.length) {
        container.innerHTML = '<p class="seller-empty-copy">Chưa có dịch vụ chăm sóc nào được đăng.</p>';
        return;
    }

    container.innerHTML = offerings.map((offering) => `
        <article class="seller-care-offering-item">
            <div class="seller-care-offering-copy">
                <strong>${offering.name}</strong>
                <p>${careServiceTypeLabels[offering.serviceType] || offering.serviceType}</p>
                <small>${Number(offering.price || 0).toLocaleString('vi-VN')} đ • ${offering.durationMinutes || 0} phút • ${offering.isActive ? 'Đang mở' : 'Đang ẩn'}</small>
            </div>
            <div class="seller-care-item-actions">
                ${canManage ? `
                    <button class="seller-secondary-button seller-inline-button" type="button" data-care-edit-offering="${offering._id}">Sửa</button>
                    <button class="seller-text-danger-button" type="button" data-care-delete-offering="${offering._id}">Xóa</button>
                ` : '<span class="seller-muted-pill">Đang khóa</span>'}
            </div>
        </article>
    `).join('');

    if (canManage) {
        container.querySelectorAll('[data-care-edit-offering]').forEach((button) => {
            button.addEventListener('click', () => fillCareOfferingForm(button.dataset.careEditOffering));
        });

        container.querySelectorAll('[data-care-delete-offering]').forEach((button) => {
            button.addEventListener('click', () => deleteCareOffering(button.dataset.careDeleteOffering));
        });
    }
}

function renderCareBookings() {
    const container = document.getElementById('careBookingList');
    const bookings = settingsState.careService.bookings || [];
    const canManage = Boolean(settingsState.careService.access?.canOperateCareServices);

    if (!container) return;

    if (!bookings.length) {
        container.innerHTML = '<p class="seller-empty-copy">Chưa có lịch hẹn dịch vụ nào.</p>';
        return;
    }

    container.innerHTML = bookings.map((booking) => `
        <article class="seller-care-booking-item">
            <div class="seller-care-booking-copy">
                <strong>${booking.service?.name || 'Dịch vụ chăm sóc'}</strong>
                <p>${booking.buyer?.name || 'Khách hàng'} • ${new Date(booking.appointmentDate).toLocaleDateString('vi-VN')} ${booking.timeSlot || ''}</p>
                <small>${booking.petName ? `${booking.petName} • ` : ''}${booking.petType || 'Chưa ghi loại thú cưng'} • ${Number(booking.totalAmount || 0).toLocaleString('vi-VN')} đ</small>
            </div>
            <div class="seller-care-item-actions">
                ${canManage && booking.status === 'pending' ? `<button class="seller-secondary-button seller-inline-button" type="button" data-care-booking-status="${booking._id}" data-next-status="confirmed">Xác nhận</button>` : ''}
                ${canManage && booking.status === 'confirmed' ? `<button class="seller-secondary-button seller-inline-button" type="button" data-care-booking-status="${booking._id}" data-next-status="completed">Hoàn thành</button>` : ''}
                ${canManage && ['pending', 'confirmed'].includes(booking.status) ? `<button class="seller-text-danger-button" type="button" data-care-booking-status="${booking._id}" data-next-status="cancelled">Hủy</button>` : ''}
                <span class="seller-muted-pill">${formatLabel(booking.status || 'pending')}</span>
            </div>
        </article>
    `).join('');

    if (canManage) {
        container.querySelectorAll('[data-care-booking-status]').forEach((button) => {
            button.addEventListener('click', () => updateCareBookingStatus(button.dataset.careBookingStatus, button.dataset.nextStatus));
        });
    }
}

function toggleCareManagementState(enabled) {
    const offeringFields = [
        'careOfferingName',
        'careOfferingType',
        'careOfferingPrice',
        'careOfferingDuration',
        'careOfferingDescription',
        'careOfferingImage',
        'careOfferingHomeService'
    ];

    offeringFields.forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
            element.disabled = !enabled;
        }
    });

    ['careOfferingImageUploadButton', 'careOfferingResetButton', 'careOfferingSaveButton'].forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
            element.disabled = !enabled;
        }
    });
}

async function handleCareFacilityImagesUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const button = document.getElementById('careFacilityImagesUploadButton');
    const originalText = button.textContent;

    try {
        setLoadingButton(button, 'Đang tải ảnh...');
        for (const file of files) {
            const response = await api.uploadImage(file, 'shops');
            const uploadedUrl = response?.data?.url;
            if (uploadedUrl) {
                settingsState.careService.facilityImages.push(uploadedUrl);
            }
        }
        renderCareFacilityImages();
        authManager.showNotification('Đã tải ảnh cơ sở lên thành công.', 'success');
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể tải ảnh cơ sở lên', 'error');
    } finally {
        event.target.value = '';
        restoreLoadingButton(button, originalText);
    }
}

async function handleCareDocumentUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const button = document.getElementById('careDocumentUploadButton');
    const originalText = button.textContent;
    const documentType = document.getElementById('careDocumentTypeSelect').value;

    try {
        setLoadingButton(button, 'Đang tải hồ sơ...');
        for (const file of files) {
            const response = await api.uploadDocument(file, 'documents');
            const payload = response?.data || {};
            settingsState.careService.documents.push({
                type: documentType,
                title: payload.originalName || file.name,
                fileName: payload.originalName || file.name,
                fileUrl: payload.url,
                mimeType: payload.mimeType || file.type,
                size: payload.size || file.size
            });
        }
        renderCareDocuments();
        authManager.showNotification('Đã tải giấy tờ dịch vụ lên thành công.', 'success');
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể tải giấy tờ dịch vụ', 'error');
    } finally {
        event.target.value = '';
        restoreLoadingButton(button, originalText);
    }
}

async function saveCareServiceDraft() {
    const button = document.getElementById('careServiceSaveDraftButton');
    const originalText = button.textContent;

    try {
        setLoadingButton(button, 'Đang lưu...');
        await api.saveSellerCareServiceApplication(readCareServiceApplicationPayload());
        await loadCareServiceData();
        showSettingsToast('Đã lưu bản nháp', 'Hồ sơ dịch vụ chăm sóc đã được lưu lại.');
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể lưu hồ sơ dịch vụ chăm sóc', 'error');
    } finally {
        restoreLoadingButton(button, originalText);
    }
}

async function submitCareServiceApplication() {
    const button = document.getElementById('careServiceSubmitButton');
    const originalText = button.textContent;

    try {
        setLoadingButton(button, 'Đang gửi...');
        const status = settingsState.careService.access?.status || settingsState.careService.application?.status || 'none';
        if (['need_more_information', 'rejected'].includes(status)) {
            await api.resubmitSellerCareServiceApplication(readCareServiceApplicationPayload());
        } else {
            await api.submitSellerCareServiceApplication(readCareServiceApplicationPayload());
        }
        await loadCareServiceData();
        showSettingsToast('Đã gửi hồ sơ', 'Hồ sơ dịch vụ chăm sóc đã được gửi cho Admin xét duyệt.');
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể gửi hồ sơ dịch vụ chăm sóc', 'error');
    } finally {
        restoreLoadingButton(button, originalText);
    }
}

// Override submit handler with explicit client-side validation and clearer status messaging.
async function submitCareServiceApplication() {
    const button = document.getElementById('careServiceSubmitButton');
    const originalText = button?.textContent || 'Gửi hồ sơ dịch vụ';
    const payload = readCareServiceApplicationPayload();
    const missingFields = validateCareServiceApplicationPayload(payload);

    if (missingFields.length) {
        showSettingsToast(
            'Thiếu thông tin',
            `Vui lòng bổ sung: ${missingFields.join(', ')}`,
            'error'
        );
        return;
    }

    try {
        setLoadingButton(button, 'Đang gửi...');
        const status = settingsState.careService.access?.status || settingsState.careService.application?.status || 'none';
        const isResubmission = ['need_more_information', 'rejected'].includes(status);

        if (isResubmission) {
            await api.resubmitSellerCareServiceApplication(payload);
        } else {
            await api.submitSellerCareServiceApplication(payload);
        }

        await loadCareServiceData();
        showSettingsToast(
            isResubmission ? 'Đã gửi lại thành công' : 'Đã gửi thành công',
            isResubmission
                ? 'Hồ sơ dịch vụ chăm sóc đã được gửi lại và đang chờ Admin xét duyệt.'
                : 'Hồ sơ dịch vụ chăm sóc đã được gửi thành công, vui lòng chờ Admin xét duyệt.',
            'success'
        );
    } catch (error) {
        showSettingsToast(
            'Chưa gửi được hồ sơ',
            error.message || 'Không thể gửi hồ sơ dịch vụ chăm sóc',
            'error'
        );
    } finally {
        restoreLoadingButton(button, originalText);
    }
}

async function handleCareOfferingImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const button = document.getElementById('careOfferingImageUploadButton');
    const originalText = button.textContent;

    try {
        setLoadingButton(button, 'Đang tải ảnh...');
        const response = await api.uploadImage(file, 'products');
        document.getElementById('careOfferingImage').value = response?.data?.url || '';
        authManager.showNotification('Đã tải ảnh dịch vụ lên thành công.', 'success');
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể tải ảnh dịch vụ', 'error');
    } finally {
        event.target.value = '';
        restoreLoadingButton(button, originalText);
    }
}

function readCareOfferingPayload() {
    return {
        name: document.getElementById('careOfferingName').value.trim(),
        serviceType: document.getElementById('careOfferingType').value,
        price: Number(document.getElementById('careOfferingPrice').value || 0),
        durationMinutes: Number(document.getElementById('careOfferingDuration').value || 0),
        description: document.getElementById('careOfferingDescription').value.trim(),
        image: document.getElementById('careOfferingImage').value.trim(),
        supportsHomeService: document.getElementById('careOfferingHomeService').checked,
        isActive: true
    };
}

async function saveCareOffering(event) {
    event.preventDefault();
    const button = document.getElementById('careOfferingSaveButton');
    const originalText = button.textContent;
    const offeringId = document.getElementById('careOfferingId').value;

    try {
        setLoadingButton(button, 'Đang lưu...');
        if (offeringId) {
            await api.updateSellerCareServiceOffering(offeringId, readCareOfferingPayload());
        } else {
            await api.createSellerCareServiceOffering(readCareOfferingPayload());
        }
        resetCareOfferingForm();
        await loadCareServiceData();
        authManager.showNotification('Đã lưu dịch vụ chăm sóc.', 'success');
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể lưu dịch vụ chăm sóc', 'error');
    } finally {
        restoreLoadingButton(button, originalText);
    }
}

function fillCareOfferingForm(offeringId) {
    const offering = (settingsState.careService.offerings || []).find((item) => item._id === offeringId);
    if (!offering) return;

    document.getElementById('careOfferingId').value = offering._id;
    document.getElementById('careOfferingName').value = offering.name || '';
    document.getElementById('careOfferingType').value = offering.serviceType || 'bathing_drying';
    document.getElementById('careOfferingPrice').value = offering.price || 0;
    document.getElementById('careOfferingDuration').value = offering.durationMinutes || 60;
    document.getElementById('careOfferingDescription').value = offering.description || '';
    document.getElementById('careOfferingImage').value = offering.image || '';
    document.getElementById('careOfferingHomeService').checked = Boolean(offering.supportsHomeService);
    document.getElementById('careOfferingSaveButton').textContent = 'Cập nhật dịch vụ';
}

function resetCareOfferingForm() {
    document.getElementById('careOfferingForm')?.reset();
    document.getElementById('careOfferingId').value = '';
    document.getElementById('careOfferingSaveButton').textContent = 'Lưu dịch vụ';
}

async function deleteCareOffering(offeringId) {
    if (!confirm('Bạn có chắc muốn xóa dịch vụ chăm sóc này không?')) {
        return;
    }

    try {
        await api.deleteSellerCareServiceOffering(offeringId);
        await loadCareServiceData();
        authManager.showNotification('Đã xóa dịch vụ chăm sóc.', 'success');
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể xóa dịch vụ chăm sóc', 'error');
    }
}

async function updateCareBookingStatus(bookingId, status) {
    const labelMap = {
        confirmed: 'Xác nhận lịch hẹn',
        completed: 'Hoàn thành lịch hẹn',
        cancelled: 'Hủy lịch hẹn'
    };
    const note = prompt(`${labelMap[status] || 'Cập nhật lịch hẹn'} - ghi chú cho khách (nếu có):`, '') || '';

    try {
        await api.updateSellerCareServiceBookingStatus(bookingId, status, note);
        await loadCareServiceData();
        authManager.showNotification('Đã cập nhật lịch hẹn dịch vụ.', 'success');
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể cập nhật lịch hẹn', 'error');
    }
}

function showSettingsToast(title, message, type = 'success') {
    const toast = document.getElementById('settingsToast');
    toast.dataset.variant = type;
    document.getElementById('settingsToastTitle').textContent = title;
    document.getElementById('settingsToastMessage').textContent = message;
    toast.hidden = false;
    toast.classList.add('show');

    clearTimeout(settingsState.toastTimer);
    settingsState.toastTimer = setTimeout(hideSettingsToast, 3500);
}

function hideSettingsToast() {
    const toast = document.getElementById('settingsToast');
    toast.classList.remove('show');
    settingsState.toastTimer = setTimeout(() => {
        delete toast.dataset.variant;
        toast.hidden = true;
    }, 220);
}

function setLoadingButton(button, text) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = text;
}

function restoreLoadingButton(button, fallbackText) {
    button.disabled = false;
    button.textContent = button.dataset.originalText || fallbackText;
}

function formatLabel(value = '') {
    return String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
