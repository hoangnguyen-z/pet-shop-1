const settingsState = {
    activeTab: 'profile',
    user: null,
    shop: null,
    avatar: '',
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

function showSettingsToast(title, message) {
    const toast = document.getElementById('settingsToast');
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
