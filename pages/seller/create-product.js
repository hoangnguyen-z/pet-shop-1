const createProductState = {
    imageFields: ['', ''],
    categories: [],
    uploadingImages: false
};

document.addEventListener('DOMContentLoaded', async () => {
    if (!authManager.isLoggedIn() || !authManager.isSeller()) {
        authManager.showNotification('Vui lòng đăng nhập bằng tài khoản người bán để tạo sản phẩm', 'error');
        window.location.href = '/';
        return;
    }

    bindCreateProductShell();
    await loadCreateProductContext();
});

function bindCreateProductShell() {
    document.getElementById('sellerSidebarToggle')?.addEventListener('click', () => {
        document.body.classList.toggle('seller-sidebar-open');
    });

    document.getElementById('sellerSidebarBackdrop')?.addEventListener('click', () => {
        document.body.classList.remove('seller-sidebar-open');
    });

    document.getElementById('sidebarPublishButton')?.addEventListener('click', () => submitCreateProduct('publish'));
    document.getElementById('saveDraftButton')?.addEventListener('click', () => submitCreateProduct('draft'));
    document.getElementById('publishProductButton')?.addEventListener('click', () => submitCreateProduct('publish'));
    document.getElementById('mobileSaveDraftButton')?.addEventListener('click', () => submitCreateProduct('draft'));
    document.getElementById('mobilePublishProductButton')?.addEventListener('click', () => submitCreateProduct('publish'));

    document.getElementById('createProductSearch')?.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const search = event.target.value.trim();
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        window.location.href = `/pages/seller/products.html${query}`;
    });

    document.getElementById('createProductNotificationButton')?.addEventListener('click', () => {
        window.location.href = '/pages/seller/orders.html';
    });

    document.getElementById('addImageFieldButton')?.addEventListener('click', openProductImagePicker);
    document.getElementById('addImageUrlFieldButton')?.addEventListener('click', addImageField);
    document.getElementById('productImageFileInput')?.addEventListener('change', handleProductImageUpload);

    document.querySelectorAll('[data-editor-wrap], [data-editor-prefix]').forEach((button) => {
        button.addEventListener('click', () => applyEditorHelper(button));
    });

    [
        'productName',
        'productCategory',
        'productSku',
        'productPrice',
        'productStock',
        'productDescription',
        'productShortDescription',
        'productTags'
    ].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', updateValidationSummary);
    });

    document.querySelectorAll('#petTypeList input[type="checkbox"]').forEach((input) => {
        input.addEventListener('change', updateValidationSummary);
    });

    document.getElementById('createProductSellerName').textContent = authManager.user?.name || 'Người bán';
    document.getElementById('createProductSellerAvatar').src = authManager.user?.avatar || '/assets/photos/cat.jpg';
    document.getElementById('createProductSellerRole').textContent = authManager.shop?.status === 'approved'
        ? 'Nhà bán đã xác minh'
        : 'Shop đang chờ duyệt';

    renderImageFieldList();
    updateImagePreviews();
    updateValidationSummary();
}

async function loadCreateProductContext() {
    try {
        const [categoriesResponse, shopResponse] = await Promise.all([
            api.getCategories(),
            api.getMyShop()
        ]);

        createProductState.categories = categoriesResponse.data || [];
        populateCategorySelect(createProductState.categories);

        const shop = shopResponse.data || authManager.shop || {};
        if (shop) {
            authManager.shop = shop;
            localStorage.setItem('shop', JSON.stringify(shop));
            document.getElementById('createProductSellerRole').textContent = shop.status === 'approved'
                ? 'Nhà bán đã xác minh'
                : 'Shop đang chờ duyệt';
        }
    } catch (error) {
        console.error('Không thể tải dữ liệu khởi tạo sản phẩm', error);
        authManager.showNotification(error.message || 'Không thể tải dữ liệu khởi tạo sản phẩm', 'error');
        populateCategorySelect([]);
    }
}

function populateCategorySelect(categories) {
    const select = document.getElementById('productCategory');
    const options = ['<option value="">Chon danh muc</option>'];

    categories
        .filter((category) => category?.isActive !== false)
        .sort((left, right) => String(left.name).localeCompare(String(right.name), 'vi'))
        .forEach((category) => {
            const label = category.parent?.name ? `${category.parent.name} > ${category.name}` : category.name;
            options.push(`<option value="${category._id}">${escapeHtml(label)}</option>`);
        });

    select.innerHTML = options.join('');
}

function renderImageFieldList() {
    const list = document.getElementById('productImageFieldList');

    list.innerHTML = createProductState.imageFields.map((value, index) => `
        <div class="seller-image-field-row">
            <input type="url" class="seller-image-url-input" data-image-index="${index}" placeholder="Dan URL anh ${index + 1}" value="${escapeHtml(value)}">
            <button class="seller-icon-ghost" type="button" data-set-main="${index}" title="Dat lam anh chinh">
                <span class="material-symbols-outlined">star</span>
            </button>
            <button class="seller-icon-ghost" type="button" data-remove-image="${index}" title="Xoa anh" ${createProductState.imageFields.length <= 1 ? 'disabled' : ''}>
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
    `).join('');

    list.querySelectorAll('.seller-image-url-input').forEach((input) => {
        input.addEventListener('input', (event) => {
            const index = Number(event.target.dataset.imageIndex);
            createProductState.imageFields[index] = event.target.value.trim();
            updateImagePreviews();
            updateValidationSummary();
        });
    });

    list.querySelectorAll('[data-remove-image]').forEach((button) => {
        button.addEventListener('click', () => {
            removeImageField(Number(button.dataset.removeImage));
        });
    });

    list.querySelectorAll('[data-set-main]').forEach((button) => {
        button.addEventListener('click', () => {
            setMainImage(Number(button.dataset.setMain));
        });
    });
}

function openProductImagePicker() {
    if (getSanitizedImages().length >= 5) {
        authManager.showNotification('Tối đa 5 ảnh cho mỗi sản phẩm', 'info');
        return;
    }

    document.getElementById('productImageFileInput')?.click();
}

async function handleProductImageUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const remainingSlots = 5 - getSanitizedImages().length;
    if (remainingSlots <= 0) {
        authManager.showNotification('Tối đa 5 ảnh cho mỗi sản phẩm', 'info');
        event.target.value = '';
        return;
    }

    const uploadQueue = files.slice(0, remainingSlots);
    const addImageButton = document.getElementById('addImageFieldButton');
    const originalButtonHtml = addImageButton.innerHTML;
    createProductState.uploadingImages = true;

    try {
        addImageButton.disabled = true;
        addImageButton.innerHTML = `
            <div class="seller-media-empty">
                <span class="material-symbols-outlined" style="font-size: 32px; color: var(--seller-primary);">hourglass_top</span>
                <strong style="font-size: 12px;">Đang tải ảnh</strong>
            </div>
        `;

        for (const file of uploadQueue) {
            const response = await api.uploadImage(file, 'products');
            const uploadedUrl = response?.data?.url;
            if (uploadedUrl) {
                insertUploadedImage(uploadedUrl);
            }
        }

        renderImageFieldList();
        updateImagePreviews();
        updateValidationSummary();

        if (files.length > uploadQueue.length) {
            authManager.showNotification(`Da tai ${uploadQueue.length} anh. He thong chi cho toi da 5 anh.`, 'info');
        } else {
            authManager.showNotification(`Da tai len ${uploadQueue.length} anh san pham`, 'success');
        }
    } catch (error) {
        console.error('Failed to upload product images', error);
        authManager.showNotification(error.message || 'Không thể tải ảnh sản phẩm lên', 'error');
    } finally {
        createProductState.uploadingImages = false;
        addImageButton.disabled = false;
        addImageButton.innerHTML = originalButtonHtml;
        event.target.value = '';
    }
}

function insertUploadedImage(url) {
    const emptyIndex = createProductState.imageFields.findIndex((value) => !String(value || '').trim());
    if (emptyIndex >= 0) {
        createProductState.imageFields[emptyIndex] = url;
        return;
    }

    if (createProductState.imageFields.length < 5) {
        createProductState.imageFields.push(url);
    }
}

function addImageField() {
    if (createProductState.imageFields.length >= 5) {
        authManager.showNotification('Tối đa 5 ảnh cho mỗi sản phẩm', 'info');
        return;
    }

    createProductState.imageFields.push('');
    renderImageFieldList();
}

function removeImageField(index) {
    createProductState.imageFields.splice(index, 1);
    if (!createProductState.imageFields.length) {
        createProductState.imageFields = [''];
    }

    renderImageFieldList();
    updateImagePreviews();
    updateValidationSummary();
}

function setMainImage(index) {
    if (index <= 0) return;
    const [picked] = createProductState.imageFields.splice(index, 1);
    createProductState.imageFields.unshift(picked);
    renderImageFieldList();
    updateImagePreviews();
}

function updateImagePreviews() {
    const validImages = getSanitizedImages();
    const mainImage = validImages[0];
    const secondaryImage = validImages[1];

    const mainPreview = document.getElementById('productMainPreview');
    const secondaryPreview = document.getElementById('productSecondaryPreview');
    const mainEmpty = document.getElementById('productMainEmpty');
    const secondaryEmpty = document.getElementById('productSecondaryEmpty');

    mainPreview.src = mainImage || '/assets/photos/dog.jpg';
    secondaryPreview.src = secondaryImage || '/assets/photos/cat.jpg';

    mainEmpty.style.display = mainImage ? 'none' : 'flex';
    secondaryEmpty.style.display = secondaryImage ? 'none' : 'flex';
}

function applyEditorHelper(button) {
    const textarea = document.getElementById('productDescription');
    const selectedText = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
    let replacement = selectedText;

    if (button.dataset.editorWrap) {
        const wrap = button.dataset.editorWrap;
        replacement = `${wrap}${selectedText || 'nội dung'}${wrap}`;
    } else if (button.dataset.editorPrefix) {
        replacement = `${button.dataset.editorPrefix}${selectedText || 'nội dung'}`;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.setRangeText(replacement, start, end, 'end');
    textarea.focus();
    updateValidationSummary();
}

function getSelectedPetTypes() {
    return Array.from(document.querySelectorAll('#petTypeList input[type="checkbox"]:checked')).map((input) => input.value);
}

function getSanitizedImages() {
    return createProductState.imageFields.map((value) => String(value || '').trim()).filter(Boolean);
}

function getMissingRequirements(mode = 'publish') {
    const missing = [];
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value.trim();
    const sku = document.getElementById('productSku').value.trim();
    const price = Number(document.getElementById('productPrice').value || 0);
    const stockValue = document.getElementById('productStock').value;
    const description = document.getElementById('productDescription').value.trim();
    const images = getSanitizedImages();

    if (!name) missing.push('Vui lòng nhập tên sản phẩm');
    if (!price || price <= 0) missing.push('Giá bán phải lớn hơn 0');
    if (stockValue === '' || Number(stockValue) < 0) missing.push('Vui lòng nhập số lượng kho hợp lệ');

    if (mode === 'publish') {
        if (!category) missing.push('Vui lòng chọn danh mục');
        if (!sku) missing.push('Vui lòng nhập SKU sản phẩm');
        if (!description) missing.push('Vui lòng nhập mô tả chi tiết');
        if (images.length < 1) missing.push('Ít nhất 1 hình ảnh sản phẩm để đăng bán');
    } else {
        if (!sku) missing.push('SKU còn thiếu, sản phẩm nháp sẽ khó theo dõi hơn');
        if (!images.length) missing.push('Bạn chưa thêm ảnh nào cho sản phẩm nháp');
    }

    return missing;
}

function updateValidationSummary() {
    const box = document.getElementById('createProductValidationBox');
    const list = document.getElementById('createProductValidationList');
    const missing = getMissingRequirements('publish');
    const title = box.querySelector('strong');

    if (!missing.length) {
        box.classList.add('seller-validation-success');
        title.textContent = 'Sẵn sàng đăng bán';
        list.innerHTML = '<li>Dữ liệu đã sẵn sàng để đăng sản phẩm lên sàn.</li>';
        return;
    }

    box.classList.remove('seller-validation-success');
    title.textContent = 'Thông tin còn thiếu';
    list.innerHTML = missing.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function buildProductPayload(mode) {
    const images = getSanitizedImages();
    const customTags = document.getElementById('productTags').value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    const petTypes = getSelectedPetTypes();

    return {
        name: document.getElementById('productName').value.trim(),
        category: document.getElementById('productCategory').value || undefined,
        brand: document.getElementById('productBrand').value.trim() || undefined,
        sku: document.getElementById('productSku').value.trim() || undefined,
        unit: document.getElementById('productUnit').value.trim() || 'cai',
        shortDescription: document.getElementById('productShortDescription').value.trim() || undefined,
        description: document.getElementById('productDescription').value.trim() || undefined,
        price: Number(document.getElementById('productPrice').value || 0),
        originalPrice: document.getElementById('productOriginalPrice').value
            ? Number(document.getElementById('productOriginalPrice').value)
            : undefined,
        stock: Number(document.getElementById('productStock').value || 0),
        weight: document.getElementById('productWeight').value
            ? Number(document.getElementById('productWeight').value)
            : undefined,
        images,
        thumbnail: images[0] || undefined,
        tags: Array.from(new Set([...petTypes, ...customTags])),
        attributes: petTypes.map((type) => ({ name: 'petType', value: type })),
        isActive: mode === 'publish'
    };
}

async function submitCreateProduct(mode) {
    if (createProductState.uploadingImages) {
        authManager.showNotification('Ảnh đang được tải lên, vui lòng chờ xong rồi đăng sản phẩm', 'info');
        return;
    }

    const button = mode === 'publish'
        ? document.getElementById('publishProductButton')
        : document.getElementById('saveDraftButton');
    const mobileButton = mode === 'publish'
        ? document.getElementById('mobilePublishProductButton')
        : document.getElementById('mobileSaveDraftButton');
    const missing = getMissingRequirements(mode);

    if (mode === 'publish' && missing.length) {
        updateValidationSummary();
        authManager.showNotification('Vui lòng hoàn tất các trường bắt buộc trước khi đăng sản phẩm', 'error');
        return;
    }

    const payload = buildProductPayload(mode);
    const originalButtonHtml = button?.innerHTML;
    const originalMobileHtml = mobileButton?.innerHTML;

    try {
        setButtonLoading(button, mobileButton, true, mode === 'publish' ? 'Đang đăng...' : 'Đang lưu...');
        await api.sellerApi.createProduct(payload);
        authManager.showNotification(mode === 'publish' ? 'Đăng sản phẩm thành công' : 'Lưu nháp thành công', 'success');
        setTimeout(() => {
            window.location.href = '/pages/seller/products.html';
        }, 700);
    } catch (error) {
        console.error('Failed to create product', error);
        authManager.showNotification(error.message || 'Không thể tạo sản phẩm', 'error');
    } finally {
        restoreButtonLoading(button, mobileButton, originalButtonHtml, originalMobileHtml);
    }
}

function setButtonLoading(primary, mobile, isLoading, label) {
    [primary, mobile].filter(Boolean).forEach((button) => {
        button.disabled = isLoading;
        if (isLoading) {
            button.innerHTML = `<span class="material-symbols-outlined">hourglass_top</span><span>${label}</span>`;
        }
    });
}

function restoreButtonLoading(primary, mobile, primaryHtml, mobileHtml) {
    if (primary) {
        primary.disabled = false;
        primary.innerHTML = primaryHtml;
    }
    if (mobile) {
        mobile.disabled = false;
        mobile.innerHTML = mobileHtml;
    }
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
