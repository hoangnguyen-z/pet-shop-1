const sellerProductsState = {
    products: [],
    filteredProducts: [],
    categories: [],
    selectedStatus: 'active',
    selectedCategory: '',
    search: '',
    page: 1,
    limit: 8,
    selectedProductId: null
};

const DEFAULT_SELLER_AVATAR = '/assets/photos/cat.jpg';
const DEFAULT_PRODUCT_IMAGE = '/assets/photos/dog.jpg';

document.addEventListener('DOMContentLoaded', async () => {
    if (!authManager.isLoggedIn() || !authManager.isSeller()) {
        authManager.showNotification('Vui lòng đăng nhập seller để quản lý sản phẩm', 'error');
        window.location.href = '/';
        return;
    }

    hydrateProductsQueryState();
    bindProductsPage();
    await loadProductsPage();
});

function hydrateProductsQueryState() {
    const params = new URLSearchParams(window.location.search);
    const status = String(params.get('status') || 'active').trim();
    sellerProductsState.search = String(params.get('search') || '').trim().toLowerCase();
    sellerProductsState.selectedCategory = String(params.get('category') || '').trim();
    sellerProductsState.selectedStatus = ['active', 'hidden', 'out_of_stock'].includes(status) ? status : 'active';
}

function bindProductsPage() {
    document.getElementById('sellerSidebarToggle')?.addEventListener('click', () => {
        document.body.classList.toggle('seller-sidebar-open');
    });

    document.getElementById('sellerSidebarBackdrop')?.addEventListener('click', () => {
        document.body.classList.remove('seller-sidebar-open');
    });

    document.getElementById('productsNotificationButton')?.addEventListener('click', () => {
        window.location.href = '/pages/seller/orders.html';
    });

    document.getElementById('productsSearchInput').value = sellerProductsState.search;

    document.getElementById('productsSearchInput')?.addEventListener('input', (event) => {
        sellerProductsState.search = event.target.value.trim().toLowerCase();
        sellerProductsState.page = 1;
        applyProductFilters();
    });

    document.getElementById('productsCategoryFilter')?.addEventListener('change', (event) => {
        sellerProductsState.selectedCategory = event.target.value;
        sellerProductsState.page = 1;
        applyProductFilters();
    });

    document.querySelectorAll('[data-product-status]').forEach((button) => {
        button.addEventListener('click', () => {
            sellerProductsState.selectedStatus = button.dataset.productStatus || 'active';
            sellerProductsState.page = 1;
            updateStatusButtons();
            applyProductFilters();
        });
    });

    document.getElementById('productsPrevPage')?.addEventListener('click', () => changeProductPage(-1));
    document.getElementById('productsNextPage')?.addEventListener('click', () => changeProductPage(1));
    document.getElementById('productsGoDashboardButton')?.addEventListener('click', () => {
        window.location.href = '/pages/seller/dashboard.html';
    });

    document.getElementById('productsTableBody')?.addEventListener('click', handleProductsTableClick);
    document.getElementById('productEditorClose')?.addEventListener('click', closeProductEditor);
    document.getElementById('productEditorBackdrop')?.addEventListener('click', closeProductEditor);
    document.getElementById('productEditorForm')?.addEventListener('submit', saveEditedProduct);
    document.getElementById('productEditorDelete')?.addEventListener('click', deleteEditedProduct);

    window.addEventListener('resize', () => {
        if (window.innerWidth > 1100) {
            document.body.classList.remove('seller-sidebar-open');
        }
    });
}

async function loadProductsPage() {
    try {
        renderProductsLoadingState();

        const [productsResponse, categoriesResponse, myShopResponse] = await Promise.all([
            api.sellerApi.getProducts({ limit: 200, sortBy: 'createdAt', sortOrder: 'desc' }),
            api.getCategories(),
            api.getMyShop().catch(() => ({ data: authManager.shop || null }))
        ]);

        const products = Array.isArray(productsResponse?.data)
            ? productsResponse.data
            : (productsResponse?.data?.products || []);

        sellerProductsState.products = products;
        sellerProductsState.categories = categoriesResponse?.data || [];
        if (myShopResponse?.data) {
            authManager.shop = myShopResponse.data;
            localStorage.setItem('shop', JSON.stringify(myShopResponse.data));
        }

        hydrateProductsHeader();
        populateProductCategoryOptions();
        updateStatusButtons();
        applyProductFilters();
    } catch (error) {
        console.error('Failed to load seller products page', error);
        renderProductsErrorState(error.message || 'Không thể tải danh sách sản phẩm lúc này.');
    }
}

function hydrateProductsHeader() {
    document.getElementById('productsSellerName').textContent = authManager.shop?.name || authManager.user?.name || 'Người bán';
    document.getElementById('productsSellerRole').textContent = authManager.shop?._id
        ? `Mã người bán: #${String(authManager.shop._id).slice(-4).toUpperCase()}`
        : 'Mã người bán';
    document.getElementById('productsSellerAvatar').src = authManager.user?.avatar || DEFAULT_SELLER_AVATAR;
    document.getElementById('productsNotificationDot').style.display =
        sellerProductsState.products.some((product) => product.isActive && Number(product.stock || 0) <= 10) ? 'block' : 'none';
}

function populateProductCategoryOptions() {
    const select = document.getElementById('productsCategoryFilter');
    const options = ['<option value="">Tất cả danh mục</option>'];

    sellerProductsState.categories
        .filter((category) => category?.isActive !== false)
        .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'vi'))
        .forEach((category) => {
            options.push(`<option value="${category._id}">${escapeHtml(category.name)}</option>`);
        });

    select.innerHTML = options.join('');
    select.value = sellerProductsState.selectedCategory;
}

function updateStatusButtons() {
    document.querySelectorAll('[data-product-status]').forEach((button) => {
        button.classList.toggle('active', button.dataset.productStatus === sellerProductsState.selectedStatus);
    });
}

function applyProductFilters() {
    const filtered = sellerProductsState.products.filter((product) => {
        if (sellerProductsState.selectedCategory && String(product.category?._id || product.category) !== sellerProductsState.selectedCategory) {
            return false;
        }

        if (!matchesProductStatus(product, sellerProductsState.selectedStatus)) {
            return false;
        }

        if (!sellerProductsState.search) {
            return true;
        }

        const haystack = [
            product.name,
            product.sku,
            product.brand,
            product.category?.name,
            product.shortDescription
        ].filter(Boolean).join(' ').toLowerCase();

        return haystack.includes(sellerProductsState.search);
    });

    sellerProductsState.filteredProducts = filtered;
    const totalPages = getProductTotalPages();
    if (sellerProductsState.page > totalPages) {
        sellerProductsState.page = totalPages;
    }

    renderProductsSummary();
    renderProductsTable();
    renderProductsPagination();
}

function matchesProductStatus(product, status) {
    const stock = Number(product.stock || 0);

    if (status === 'hidden') {
        return !product.isActive;
    }

    if (status === 'out_of_stock') {
        return stock <= 0;
    }

    return product.isActive && stock > 0;
}

function renderProductsSummary() {
    const allProducts = sellerProductsState.products;
    const filtered = sellerProductsState.filteredProducts;
    const activeCount = allProducts.filter((product) => product.isActive && Number(product.stock || 0) > 0).length;
    const lowStockCount = allProducts.filter((product) => product.isActive && Number(product.stock || 0) > 0 && Number(product.stock || 0) <= 10).length;
    const hiddenCount = allProducts.filter((product) => !product.isActive || Number(product.stock || 0) <= 0).length;
    const inventoryValue = allProducts.reduce((sum, product) => sum + (Number(product.price || 0) * Number(product.stock || 0)), 0);
    const visibilityRate = allProducts.length ? Math.round((activeCount / allProducts.length) * 100) : 0;

    document.getElementById('productsInventoryValue').textContent = formatCurrencyVND(inventoryValue);
    document.getElementById('productsTotalCount').textContent = String(allProducts.length);
    document.getElementById('productsActiveCount').textContent = String(activeCount);
    document.getElementById('productsLowStockCount').textContent = String(lowStockCount);
    document.getElementById('productsHiddenCount').textContent = String(hiddenCount);
    document.getElementById('productsVisibilityRate').textContent = `${visibilityRate}%`;
    document.getElementById('productsTotalHint').textContent = `${filtered.length} sản phẩm phù hợp với bộ lọc hiện tại`;
    document.getElementById('productsActiveHint').textContent = `${activeCount} sản phẩm đang hiển thị trên sàn`;
    document.getElementById('productsLowStockHint').textContent = lowStockCount ? `${lowStockCount} sản phẩm còn 10 đơn vị hoặc ít hơn` : 'Kho đang ổn định';
    document.getElementById('productsHiddenHint').textContent = hiddenCount ? `${hiddenCount} sản phẩm cần xem lại trạng thái` : 'Không có sản phẩm đang ẩn';
    document.getElementById('productsVisibilityHint').textContent = visibilityRate >= 80
        ? 'Danh mục đang hiển thị tốt trên gian hàng'
        : 'Bạn có thể mở lại một số sản phẩm đang ẩn để tăng độ phủ';
    document.getElementById('productsCtaText').textContent = lowStockCount
        ? `Bạn đang có ${lowStockCount} sản phẩm sắp hết hàng. Nên nhập thêm hoặc chạy chiến dịch đẩy các sản phẩm còn tồn kho cao.`
        : 'Kho đang cân bằng. Bạn có thể đẩy thêm bộ sưu tập nổi bật hoặc thêm sản phẩm mới để tăng doanh thu.';

    document.getElementById('productsVisibilityHint').textContent = visibilityRate >= 80
        ? 'Danh mục đang hiển thị tốt trên gian hàng'
        : 'Bạn có thể mở lại một số sản phẩm đang ẩn để tăng độ phủ.';
    document.getElementById('productsCtaText').textContent = lowStockCount
        ? `Bạn đang có ${lowStockCount} sản phẩm sắp hết hàng. Nên nhập thêm hoặc chạy chiến dịch đẩy các sản phẩm còn tồn kho cao.`
        : 'Kho đang cân bằng. Bạn có thể đẩy thêm bộ sưu tập nổi bật hoặc thêm sản phẩm mới để tăng doanh thu.';

    renderProductsMiniChart([activeCount, lowStockCount, hiddenCount, filtered.length, allProducts.length]);
}

function renderProductsMiniChart(values) {
    const chart = document.getElementById('productsMiniChart');
    const items = Array.from(chart.children);
    const max = Math.max(...values, 1);

    items.forEach((bar, index) => {
        const ratio = values[index] ? (values[index] / max) : 0.15;
        bar.style.height = `${Math.max(20, Math.round(ratio * 100))}%`;
    });
}

function renderProductsLoadingState() {
    document.getElementById('productsTableBody').innerHTML = `
        <tr>
            <td colspan="6" class="seller-products-loading-cell">Đang tải sản phẩm...</td>
        </tr>
    `;
}

function renderProductsErrorState(message) {
    document.getElementById('productsTableBody').innerHTML = `
        <tr>
            <td colspan="6" class="seller-products-loading-cell seller-products-loading-cell-error">${escapeHtml(message)}</td>
        </tr>
    `;
}

function renderProductsTable() {
    const tbody = document.getElementById('productsTableBody');
    const visibleProducts = getVisibleProducts();

    if (!visibleProducts.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="seller-products-loading-cell">Không có sản phẩm phù hợp với bộ lọc hiện tại.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = visibleProducts.map((product) => {
        const stock = Number(product.stock || 0);
        const stockRatio = Math.max(0, Math.min(100, Math.round((stock / Math.max(stock, 20)) * 100)));
        const status = getProductStatusMeta(product);
        const actionVisibilityIcon = product.isActive ? 'visibility_off' : 'visibility';
        const actionVisibilityLabel = product.isActive ? 'Ẩn' : 'Hiển thị';

        return `
            <tr class="seller-products-row">
                <td>
                    <div class="seller-products-product-cell">
                        <div class="seller-products-product-image">
                            <img src="${escapeAttribute(product.images?.[0] || product.thumbnail || DEFAULT_PRODUCT_IMAGE)}" alt="${escapeAttribute(product.name)}">
                        </div>
                        <div class="seller-products-product-copy">
                            <strong>${escapeHtml(product.name)}</strong>
                            <span>SKU: ${escapeHtml(product.sku || 'Chưa có')}</span>
                        </div>
                    </div>
                </td>
                <td><span class="seller-products-muted">${escapeHtml(product.category?.name || 'Chưa phân loại')}</span></td>
                <td><strong>${formatCurrencyVND(product.price || 0)}</strong></td>
                <td>
                    <div class="seller-products-stock-cell">
                        <strong class="${stock <= 10 ? 'seller-products-stock-danger' : ''}">${stock} đơn vị</strong>
                        <div class="seller-products-stock-bar">
                            <span style="width:${stock > 0 ? stockRatio : 0}%"></span>
                        </div>
                    </div>
                </td>
                <td><span class="seller-products-status-badge ${status.className}">${status.label}</span></td>
                <td class="seller-products-row-actions">
                    <button class="seller-products-icon-button" type="button" data-product-edit="${product._id}" title="Chỉnh sửa">
                        <span class="material-symbols-outlined">edit_square</span>
                    </button>
                    <button class="seller-products-icon-button seller-products-icon-danger" type="button" data-product-delete="${product._id}" title="Xóa">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                    <button class="seller-products-icon-button ${product.isActive ? '' : 'seller-products-icon-success'}" type="button" data-product-visibility="${product._id}" title="${actionVisibilityLabel}">
                        <span class="material-symbols-outlined">${actionVisibilityIcon}</span>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderProductsPagination() {
    const total = sellerProductsState.filteredProducts.length;
    const totalPages = getProductTotalPages();
    const start = total ? ((sellerProductsState.page - 1) * sellerProductsState.limit) + 1 : 0;
    const end = Math.min(total, sellerProductsState.page * sellerProductsState.limit);

    document.getElementById('productsPaginationSummary').textContent = total
        ? `Hiển thị ${start} - ${end} của ${total} sản phẩm`
        : 'Hiển thị 0 sản phẩm';

    document.getElementById('productsPrevPage').disabled = sellerProductsState.page <= 1;
    document.getElementById('productsNextPage').disabled = sellerProductsState.page >= totalPages;

    const pageList = document.getElementById('productsPageList');
    pageList.innerHTML = '';

    for (let page = 1; page <= totalPages; page += 1) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = String(page);
        button.classList.toggle('active', page === sellerProductsState.page);
        button.addEventListener('click', () => {
            sellerProductsState.page = page;
            renderProductsTable();
            renderProductsPagination();
        });
        pageList.appendChild(button);
    }
}

function getVisibleProducts() {
    const start = (sellerProductsState.page - 1) * sellerProductsState.limit;
    return sellerProductsState.filteredProducts.slice(start, start + sellerProductsState.limit);
}

function getProductTotalPages() {
    return Math.max(1, Math.ceil(sellerProductsState.filteredProducts.length / sellerProductsState.limit));
}

function changeProductPage(delta) {
    const nextPage = sellerProductsState.page + delta;
    if (nextPage < 1 || nextPage > getProductTotalPages()) return;
    sellerProductsState.page = nextPage;
    renderProductsTable();
    renderProductsPagination();
}

function handleProductsTableClick(event) {
    const editButton = event.target.closest('[data-product-edit]');
    if (editButton) {
        openProductEditor(editButton.dataset.productEdit);
        return;
    }

    const visibilityButton = event.target.closest('[data-product-visibility]');
    if (visibilityButton) {
        toggleProductVisibility(visibilityButton.dataset.productVisibility);
        return;
    }

    const deleteButton = event.target.closest('[data-product-delete]');
    if (deleteButton) {
        deleteProductById(deleteButton.dataset.productDelete);
    }
}

function openProductEditor(productId) {
    const product = sellerProductsState.products.find((item) => item._id === productId);
    if (!product) {
        authManager.showNotification('Không tìm thấy sản phẩm để chỉnh sửa', 'error');
        return;
    }

    sellerProductsState.selectedProductId = productId;

    document.getElementById('productEditorTitle').textContent = product.name || 'Sản phẩm';
    document.getElementById('productEditorImage').src = product.images?.[0] || product.thumbnail || DEFAULT_PRODUCT_IMAGE;
    document.getElementById('productEditorSku').textContent = product.sku || 'SKU chưa có';
    document.getElementById('productEditorCategoryText').textContent = product.category?.name || 'Chưa có danh mục';
    document.getElementById('productEditorName').value = product.name || '';
    document.getElementById('productEditorPrice').value = product.price || 0;
    document.getElementById('productEditorOriginalPrice').value = product.originalPrice || '';
    document.getElementById('productEditorStock').value = product.stock || 0;
    document.getElementById('productEditorBrand').value = product.brand || '';
    document.getElementById('productEditorSkuInput').value = product.sku || '';
    document.getElementById('productEditorActive').checked = Boolean(product.isActive);
    document.getElementById('productEditorShortDescription').value = product.shortDescription || '';

    const categorySelect = document.getElementById('productEditorCategory');
    categorySelect.innerHTML = ['<option value="">Chọn danh mục</option>']
        .concat(
            sellerProductsState.categories
                .filter((category) => category?.isActive !== false)
                .map((category) => `<option value="${category._id}">${escapeHtml(category.name)}</option>`)
        )
        .join('');
    categorySelect.value = String(product.category?._id || product.category || '');

    document.getElementById('productEditor').classList.add('open');
    document.getElementById('productEditor').setAttribute('aria-hidden', 'false');
    document.getElementById('productEditorBackdrop').hidden = false;
}

function closeProductEditor() {
    sellerProductsState.selectedProductId = null;
    document.getElementById('productEditor').classList.remove('open');
    document.getElementById('productEditor').setAttribute('aria-hidden', 'true');
    document.getElementById('productEditorBackdrop').hidden = true;
}

async function saveEditedProduct(event) {
    event.preventDefault();
    const productId = sellerProductsState.selectedProductId;
    if (!productId) return;

    const button = document.getElementById('productEditorSave');
    const originalText = button.textContent;

    try {
        button.disabled = true;
        button.textContent = 'Đang lưu...';

        const payload = {
            name: document.getElementById('productEditorName').value.trim(),
            category: document.getElementById('productEditorCategory').value || undefined,
            price: Number(document.getElementById('productEditorPrice').value || 0),
            originalPrice: document.getElementById('productEditorOriginalPrice').value
                ? Number(document.getElementById('productEditorOriginalPrice').value)
                : undefined,
            stock: Number(document.getElementById('productEditorStock').value || 0),
            brand: document.getElementById('productEditorBrand').value.trim() || undefined,
            sku: document.getElementById('productEditorSkuInput').value.trim() || undefined,
            shortDescription: document.getElementById('productEditorShortDescription').value.trim() || undefined,
            isActive: document.getElementById('productEditorActive').checked
        };

        await api.sellerApi.updateProduct(productId, payload);
        authManager.showNotification('Đã cập nhật sản phẩm', 'success');
        closeProductEditor();
        await loadProductsPage();
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể cập nhật sản phẩm', 'error');
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

async function toggleProductVisibility(productId) {
    const product = sellerProductsState.products.find((item) => item._id === productId);
    if (!product) return;

    try {
        await api.sellerApi.updateProduct(productId, { isActive: !product.isActive });
        authManager.showNotification(product.isActive ? 'Đã ẩn sản phẩm' : 'Đã hiển thị lại sản phẩm', 'success');
        await loadProductsPage();
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể cập nhật trạng thái sản phẩm', 'error');
    }
}

async function deleteProductById(productId) {
    const product = sellerProductsState.products.find((item) => item._id === productId);
    if (!product) return;

    const confirmed = window.confirm(`Bạn có chắc muốn xóa "${product.name}"?`);
    if (!confirmed) return;

    try {
        await api.sellerApi.deleteProduct(productId);
        authManager.showNotification('Đã xử lý xóa sản phẩm', 'success');
        if (sellerProductsState.selectedProductId === productId) {
            closeProductEditor();
        }
        await loadProductsPage();
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể xóa sản phẩm', 'error');
    }
}

async function deleteEditedProduct() {
    if (!sellerProductsState.selectedProductId) return;
    await deleteProductById(sellerProductsState.selectedProductId);
}

function getProductStatusMeta(product) {
    const stock = Number(product.stock || 0);
    if (!product.isActive) {
        return { label: 'Đang ẩn', className: 'seller-products-status-hidden' };
    }
    if (stock <= 0) {
        return { label: 'Hết hàng', className: 'seller-products-status-out' };
    }
    if (stock <= 10) {
        return { label: 'Sắp hết hàng', className: 'seller-products-status-low' };
    }
    return { label: 'Đang bán', className: 'seller-products-status-active' };
}

function formatCurrencyVND(value) {
    return `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))} ₫`;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
    return escapeHtml(value);
}
