const sellerDashboardState = {
    data: null,
    search: '',
    trendRange: '7',
    revenueTrend: []
};

const sellerMoneyFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
});

const sellerCompactFormatter = new Intl.NumberFormat('vi-VN', {
    notation: 'compact',
    maximumFractionDigits: 1
});

const DEFAULT_BANNER = '/assets/photos/dog.jpg';
const DEFAULT_LOGO = '/assets/photos/cat.jpg';
const DEFAULT_AVATAR = '/assets/photos/cat.jpg';
const DEFAULT_PRODUCT = '/assets/photos/food.jpg';

const FUND_FLOW_LABELS = {
    unpaid: 'Chưa thu tiền',
    platform_holding: 'Sàn đang giữ',
    pending_settlement: 'Chờ đối soát',
    settled: 'Đã đối soát',
    refunded: 'Đã hoàn tiền',
    disputed: 'Đang tranh chấp',
    cancelled: 'Đã hủy'
};

const ORDER_STATUS_LABELS = {
    waiting_payment: 'Chờ thanh toán',
    paid: 'Đã thanh toán',
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    preparing: 'Đang chuẩn bị',
    shipping: 'Đang giao',
    delivered: 'Đã giao',
    completed: 'Hoàn tất',
    cancelled: 'Đã hủy',
    return_pending: 'Chờ xử lý hoàn trả',
    returned: 'Đã hoàn trả'
};

let sellerDashboardInitialized = false;

async function initSellerDashboard() {
    if (sellerDashboardInitialized) return;
    sellerDashboardInitialized = true;
    if (!authManager.isLoggedIn() || !authManager.isSeller()) {
        authManager.showNotification('Vui lòng đăng nhập bằng tài khoản người bán', 'error');
        window.location.href = '/';
        return;
    }

    bindDashboardShell();

    if (!authManager.hasSellerCenterAccess()) {
        renderPendingSellerDashboard();
        return;
    }

    await loadSellerDashboard();
}

function bootSellerDashboard() {
    initSellerDashboard().catch((error) => {
        console.error('Seller dashboard init failed', error);
        authManager.showNotification(error.message || 'Khong the khoi tao trung tam nguoi ban', 'error');
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootSellerDashboard);
} else {
    bootSellerDashboard();
}

function bindDashboardShell() {
    const addProductTarget = authManager.hasSellerCenterAccess()
        ? '/pages/seller/create-product.html'
        : '/pages/account/seller-application.html';
    const orderTarget = authManager.hasSellerCenterAccess()
        ? '/pages/seller/orders.html'
        : '/pages/account/seller-application.html';
    const productTarget = authManager.hasSellerCenterAccess()
        ? '/pages/seller/products.html'
        : '/pages/account/seller-application.html';

    document.querySelectorAll('[data-dashboard-add-product]').forEach((button) => {
        button.addEventListener('click', () => {
            window.location.href = addProductTarget;
        });
    });

    document.querySelectorAll('[data-dashboard-view-orders]').forEach((button) => {
        button.addEventListener('click', () => {
            window.location.href = orderTarget;
        });
    });

    document.querySelectorAll('[data-dashboard-logout]').forEach((button) => {
        button.addEventListener('click', () => {
            if (typeof authManager?.logout === 'function') {
                authManager.logout();
                return;
            }

            try {
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                localStorage.removeItem('shop');
            } catch (error) {
                console.warn('Failed to clear seller auth state', error);
            }

            window.location.href = '/';
        });
    });

    document.getElementById('dashboardNotificationButton')?.addEventListener('click', () => {
        document.getElementById('recent-orders-overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.getElementById('dashboardSearch')?.addEventListener('input', (event) => {
        sellerDashboardState.search = String(event.target.value || '').trim().toLowerCase();
        renderDashboardPanels();
    });

    document.getElementById('dashboardTrendRange')?.addEventListener('change', async (event) => {
        sellerDashboardState.trendRange = String(event.target.value || '7');
        await loadRevenueTrend();
    });

    document.getElementById('dashboardExportButton')?.addEventListener('click', exportDashboardReport);
    document.getElementById('dashboardManageProductsButton')?.addEventListener('click', (event) => {
        event.preventDefault();
        window.location.href = productTarget;
    });
    document.getElementById('dashboardGoStorefrontButton')?.addEventListener('click', (event) => {
        event.preventDefault();
        openStorefront();
    });
    document.getElementById('dashboardOpenStoreButton')?.addEventListener('click', openStorefront);
    document.getElementById('walletRequestSettlementButton')?.addEventListener('click', requestSettlement);

    document.getElementById('dashboardManageProductsButton')?.setAttribute('href', productTarget);
    document.getElementById('dashboardGoStorefrontButton')?.setAttribute('href', '/#shop');

    document.getElementById('sellerSidebarToggle')?.addEventListener('click', () => {
        document.body.classList.toggle('seller-sidebar-open');
    });

    document.getElementById('sellerSidebarBackdrop')?.addEventListener('click', () => {
        document.body.classList.remove('seller-sidebar-open');
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) {
            document.body.classList.remove('seller-sidebar-open');
        }
    });

    setText('dashboardSellerName', authManager.user?.name || 'Người bán');
    document.getElementById('dashboardSellerAvatar').src = safeImage(authManager.user?.avatar, DEFAULT_AVATAR);
    document.getElementById('dashboardCurrentDate').innerHTML = `
        <span class="material-symbols-outlined">calendar_today</span>
        <span>${formatFullDate(new Date())}</span>
    `;
}

function renderPendingSellerDashboard() {
    const sellerName = firstName(authManager.user?.name) || 'Người bán';
    const accessStatus = authManager.sellerAccess?.status || authManager.sellerApplication?.status || 'draft';
    const applicationUrl = '/pages/account/seller-application.html';
    const pendingCard = `
        <div class="seller-empty-state">
            <strong>Seller Center đang chờ duyệt</strong>
           <p>Tài khoản của bạn đã đăng nhập thành công nhưng chưa thể vận hành shop. Trạng thái hồ sơ hiện tại: <strong>${formatLabel(accessStatus)}</strong>.</p>
            <a class="seller-inline-action" href="${applicationUrl}">Mở hồ sơ mở shop</a>
        </div>
    `;

    setText('dashboardGreeting', `Chào ${sellerName}!`);
    setText('dashboardHeroDescription', 'Hoàn tất hồ sơ mở shop và chờ Admin phê duyệt để mở quyền đăng sản phẩm, xử lý đơn và nhận đối soát.');
    setText('dashboardSellerRole', `Trang thái hồ sơ: ${formatLabel(accessStatus)}`);
    setText('dashboardSearchSummary', 'Dashboard đang ở chế độ chờ duyệt seller.');

    ['statTotalOrders', 'statTodayRevenue', 'statMonthRevenue', 'statProductCount', 'statPendingOrders'].forEach((id) => setText(id, '--'));
    ['revenueToday', 'revenueMonth', 'revenueYear', 'revenueTotal', 'revenuePlatformFee', 'revenueNet', 'walletAvailableBalance', 'walletPendingSettlement', 'walletHoldingBalance', 'walletRefundedBalance'].forEach((id) => setText(id, '--'));

    setText('statTotalOrdersDelta', 'Sẽ mở sau khi shop được duyệt.');
    setText('statTodayRevenueDelta', 'Doanh thu chưa được kích hoạt.');
    setText('statMonthRevenueDelta', 'Doanh thu chưa được kích hoạt.');
    setText('statVisibleProducts', 'Chưa thể đăng sản phẩm.');
    setText('statConfirmedOrders', 'Chưa thể xử lý đơn hàng.');
    setText('walletSummaryNote', 'Admin có thể phê duyệt seller trước khi mở lượng thanh toán và đối soát cho shop.');

    ['dashboardInventoryHighlights', 'dashboardRecentOrders', 'dashboardBestSelling', 'dashboardRecentReviews', 'dashboardSettlements'].forEach((id) => {
        document.getElementById(id).innerHTML = pendingCard;
    });

    document.getElementById('revenueTrendChart').innerHTML = '';
    document.getElementById('revenueTrendLabels').innerHTML = '<span>Biểu đồ doanh thu sẽ hiển thị sau khi shop được duyệt.</span>';
    document.getElementById('walletRequestSettlementButton').disabled = true;
    document.getElementById('dashboardNotificationDot').style.display = 'none';
}

async function loadSellerDashboard() {
    try {
        const response = await api.sellerApi.getDashboard();
        sellerDashboardState.data = response.data || {};

        if (sellerDashboardState.data.shop) {
            authManager.shop = sellerDashboardState.data.shop;
            localStorage.setItem('shop', JSON.stringify(sellerDashboardState.data.shop));
        }

        hydrateDashboardSummary();
        renderDashboardPanels();
        await loadRevenueTrend();
    } catch (error) {
        console.error('Không thể tải dashboard seller', error);
        authManager.showNotification(error.message || 'Không thể tải dữ liệu tổng quan người bán', 'error');
        setText('dashboardHeroDescription', error.message || 'Không thể tải dữ liệu tổng quan vào lúc này.');
    }
}

async function loadRevenueTrend() {
    try {
        const points = await buildRevenueTrendPoints(Number(sellerDashboardState.trendRange || 7));
        sellerDashboardState.revenueTrend = points;
        renderRevenueTrend();
    } catch (error) {
        console.error('Không thể tải biểu đồ doanh thu', error);
        document.getElementById('revenueTrendChart').innerHTML = '';
        document.getElementById('revenueTrendLabels').innerHTML = '<span>Không tải được biểu đồ doanh thu.</span>';
    }
}

function hydrateDashboardSummary() {
    const data = sellerDashboardState.data || {};
    const shop = data.shop || authManager.shop || {};
    const orderStats = data.orderStats || {};
    const revenue = data.revenue || {};
    const wallet = data.wallet || {};
    const totalOrders = sumValues(orderStats);
    const pendingOrders = Number(orderStats.pending || 0) + Number(orderStats.confirmed || 0);
    const completedOrders = Number(orderStats.completed || 0) + Number(orderStats.delivered || 0);
    const activeProducts = Number(data.activeProductCount || 0);
    const lowStockCount = (data.lowStockProducts || []).length;

    setText('dashboardGreeting', `${getGreeting()}, ${firstName(authManager.user?.name) || 'ban'}!`);
    setText('dashboardHeroDescription', shop.description
        ? `Đây là toàn cảnh doanh thu, thanh toán và đối soát của ${shop.name}.`
        : 'Đây là những gì đang diễn ra với shop của bạn hôm nay.');
    setText('dashboardSellerName', authManager.user?.name || 'Người bán');
    setText('dashboardSellerRole', shop.status === 'approved' ? 'Shop đã xác minh' : 'Shop đang chờ duyệt');
    document.getElementById('dashboardSellerAvatar').src = safeImage(authManager.user?.avatar, DEFAULT_AVATAR);

    document.getElementById('dashboardShopBanner').src = safeImage(shop.banner, DEFAULT_BANNER);
    document.getElementById('dashboardShopLogo').src = safeImage(shop.logo, DEFAULT_LOGO);
    setText('dashboardShopName', shop.name || 'Cửa hàng của bạn');
    setText('dashboardShopSummary', shop.description || 'Cập nhật mô tả shop để khách hàng hiểu rõ hơn về thương hiệu của bạn.');
    setText('dashboardShopRating', `${Number(shop.rating || 0).toFixed(1)} điểm`);
    setText('dashboardReviewCount', String(shop.reviewCount || data.recentReviews?.length || 0));
    setText('dashboardShopContact', [shop.phone, shop.email].filter(Boolean).join(' · ') || 'Chưa cập nhật');
    setText('dashboardShopAddress', formatShopAddress(shop.address));
    setText('dashboardActiveProductCount', String(activeProducts));
    setText('dashboardHiddenProductCount', String(data.hiddenProductCount || 0));

    const shopStatus = document.getElementById('dashboardShopStatus');
    shopStatus.textContent = formatLabel(shop.status || 'pending');
    shopStatus.className = `seller-status-pill ${statusClass(shop.status || 'pending')}`;

    setText('statTotalOrders', compactMetric(totalOrders));
    setText('statTotalOrdersDelta', completedOrders
        ? `${completedOrders} đơn đã hoàn tất hoặc giao thành công`
        : 'Chưa có đơn hoàn tất');
    setText('statTodayRevenue', formatMoney(revenue.today));
    setText('statTodayRevenueDelta', pendingOrders
        ? `${pendingOrders} đơn đang chờ xác nhận hoặc chuẩn bị`
        : 'Không có đơn mới đang chờ');
    setText('statMonthRevenue', formatMoney(revenue.month));
    setText('statMonthRevenueDelta', revenue.total
        ? `${Math.min(100, Math.round((Number(revenue.month || 0) / Math.max(Number(revenue.total || 1), 1)) * 100))}% trên tổng doanh số doanh thu đã ghi nhận`
        : 'Chưa có doanh thu tích lũy');
    setText('statProductCount', compactMetric(data.productCount || 0));
    setText('statVisibleProducts', lowStockCount
        ? `${activeProducts} đang hiển thị · ${lowStockCount} sắp hết`
        : `${activeProducts} đang hiển thị trên sàn`);
    setText('statPendingOrders', String(pendingOrders));
    setText('statConfirmedOrders', pendingOrders
        ? `Có ${pendingOrders} đơn cần ưu tiên xử lý`
        : 'Không có đơn cần xử lý ngay');

    setText('revenueToday', formatMoney(revenue.today));
    setText('revenueMonth', formatMoney(revenue.month));
    setText('revenueYear', formatMoney(revenue.year));
    setText('revenueTotal', formatMoney(revenue.total));
    setText('revenuePlatformFee', formatMoney(revenue.platformFee));
    setText('revenueNet', formatMoney(revenue.netRevenue));

    setText('walletAvailableBalance', formatMoney(wallet.availableBalance));
    setText('walletPendingSettlement', formatMoney(wallet.pendingSettlementBalance));
    setText('walletHoldingBalance', formatMoney(wallet.platformHoldingBalance));
    setText('walletRefundedBalance', formatMoney(wallet.refundedBalance));
    setText('walletSummaryNote', buildWalletSummary(wallet));
    document.getElementById('walletRequestSettlementButton').disabled = Number(wallet.pendingSettlementBalance || 0) <= 0;

    setText('dashboardInsight', buildInsightText(data));
    setText('dashboardOrderSummaryText', buildOrderSummaryText(data));
    setText('dashboardNewBuyerCount', String(countUniqueRecentBuyers(data.recentOrders || [])));
    setText('dashboardSearchSummary', 'Chưa áp dụng bộ lọc tìm kiếm trên trang tổng quan.');
    document.getElementById('dashboardNotificationDot').style.display = pendingOrders > 0 ? 'block' : 'none';

    renderOrderBreakdown();
}

function renderDashboardPanels() {
    const data = sellerDashboardState.data || {};
    const search = sellerDashboardState.search;

    const lowStockProducts = (data.lowStockProducts || []).filter((product) => matchesSearch(search, [
        product.name,
        product.sku
    ]));
    const bestSellingProducts = (data.bestSellingProducts || []).filter((product) => matchesSearch(search, [
        product.name,
        product.sku
    ]));
    const recentOrders = (data.recentOrders || []).filter((order) => matchesSearch(search, [
        order.orderNumber,
        order.buyer?.name,
        order.buyer?.email,
        order.buyer?.phone,
        order.items?.[0]?.name
    ]));
    const recentReviews = (data.recentReviews || []).filter((review) => matchesSearch(search, [
        review.user?.name,
        review.product?.name,
        review.comment,
        review.title
    ]));
    const settlements = (data.settlements || []).filter((settlement) => matchesSearch(search, [
        settlement.status,
        settlement.notes,
        settlement.transactionId
    ]));

    renderInventoryHighlights(lowStockProducts);
    renderRecentOrders(recentOrders);
    renderBestSelling(bestSellingProducts);
    renderRecentReviews(recentReviews);
    renderSettlements(settlements);
    renderSearchSummary({
        orders: recentOrders.length,
        products: bestSellingProducts.length,
        reviews: recentReviews.length,
        inventory: lowStockProducts.length,
        settlements: settlements.length
    });
}

function renderInventoryHighlights(products) {
    const container = document.getElementById('dashboardInventoryHighlights');
    if (!products.length) {
        container.innerHTML = '<div class="seller-empty-state">Không có sản phẩm nào ở bộ lọc hiện tại.</div>';
        return;
    }

    container.innerHTML = products.map((product) => `
        <article class="seller-list-card seller-list-card-compact">
            <div class="seller-list-main">
                <div class="seller-list-main-head">
                    <strong>${escapeHtml(product.name)}</strong>
                    <span class="seller-muted-pill">Kho ${Number(product.stock || 0)}</span>
                </div>
                <p>${escapeHtml(product.sku || 'Chưa có SKU')} · ${formatMoney(product.price)}</p>
            </div>
            <button class="seller-inline-action" type="button" onclick="window.location.href='/pages/seller/products.html'">Cập nhật</button>
        </article>
    `).join('');
}

function renderRecentOrders(orders) {
    const container = document.getElementById('dashboardRecentOrders');
    if (!orders.length) {
        container.innerHTML = '<div class="seller-empty-state">Không có đơn hàng nào khớp với bộ lọc hiện tại.</div>';
        return;
    }

    container.innerHTML = orders.map((order) => {
        const firstItem = order.items?.[0] || {};
        const status = firstItem.shopStatus || order.orderStatus || order.status;
        const financial = order.sellerFinancial || {};
        return `
            <article class="seller-order-card">
                <div class="seller-order-thumb">
                    <img src="${safeImage(firstItem.image, DEFAULT_PRODUCT)}" alt="${escapeHtml(firstItem.name || 'Sản phẩm')}">
                </div>
                <div class="seller-list-main">
                    <div class="seller-list-main-head">
                        <strong>#${escapeHtml(order.orderNumber || order._id)}</strong>
                        <span class="seller-status-pill ${statusClass(status)}">${escapeHtml(ORDER_STATUS_LABELS[status] || formatLabel(status))}</span>
                    </div>
                    <p>${escapeHtml(order.buyer?.name || 'Khách hàng')} · ${escapeHtml(formatMoney(financial.grossAmount || order.finalAmount || order.total || 0))}</p>
                    <small>${escapeHtml(FUND_FLOW_LABELS[financial.fundFlowStatus] || 'Chưa xác định')} · ${escapeHtml(formatPaymentLabel(financial.paymentStatus || order.paymentStatus))}</small>
                </div>
                <div class="seller-list-side">
                    <strong>${formatMoney(financial.netAmount || 0)}</strong>
                    <button class="seller-inline-action" type="button" onclick="window.location.href='/pages/seller/orders.html'">Xử lý</button>
                </div>
            </article>
        `;
    }).join('');
}

function renderBestSelling(products) {
    const container = document.getElementById('dashboardBestSelling');
    if (!products.length) {
        container.innerHTML = '<div class="seller-empty-state">Chưa có dữ liệu doanh số cho danh sách này.</div>';
        return;
    }

    container.innerHTML = products.map((product) => `
        <article class="seller-top-product">
            <div class="seller-top-product-image">
                <img src="${safeImage(product.thumbnail || product.images?.[0], DEFAULT_PRODUCT)}" alt="${escapeHtml(product.name)}">
            </div>
            <div class="seller-top-product-copy">
                <strong>${escapeHtml(product.name)}</strong>
                <span>${Number(product.soldCount || 0)} lượt bán · ${formatMoney(product.price)}</span>
            </div>
        </article>
    `).join('');
}

function renderRecentReviews(reviews) {
    const container = document.getElementById('dashboardRecentReviews');
    if (!reviews.length) {
        container.innerHTML = '<div class="seller-empty-state">Chưa có đánh giá nào khớp với bộ lọc hiện tại.</div>';
        return;
    }

    container.innerHTML = reviews.map((review) => `
        <article class="seller-list-card">
            <div class="seller-list-main">
                <div class="seller-list-main-head">
                    <strong>${escapeHtml(review.user?.name || 'Khách hàng')}</strong>
                    <span class="seller-review-stars">${renderStars(review.rating)}</span>
                </div>
                <p>${escapeHtml(review.product?.name || 'Sản phẩm')} · ${escapeHtml(review.comment || review.title || 'Không có nhận xét')}</p>
                <small>${review.sellerReply?.comment ? 'Đã phản hồi' : 'Chưa phản hồi'} · ${formatDashboardDate(review.createdAt)}</small>
            </div>
        </article>
    `).join('');
}

function renderSettlements(settlements) {
    const container = document.getElementById('dashboardSettlements');
    if (!settlements.length) {
        container.innerHTML = '<div class="seller-empty-state">Chưa có lịch sử đối soát hoặc đợt chuyển tiền nào.</div>';
        return;
    }

    container.innerHTML = settlements.map((settlement) => `
        <article class="seller-list-card">
            <div class="seller-list-main">
                <div class="seller-list-main-head">
                    <strong>${formatMoney(settlement.netAmount || settlement.amount || 0)}</strong>
                    <span class="seller-status-pill ${statusClass(settlement.status)}">${formatSettlementStatus(settlement.status)}</span>
                </div>
                <p>${escapeHtml(settlement.notes || 'Đơn đối soát / chuyển tiền cho shop')}</p>
                <small>${formatDashboardDate(settlement.completedAt || settlement.createdAt)}</small>
            </div>
            <div class="seller-list-side">
                <span class="seller-list-subtle">Phí sàn</span>
                <strong>${formatMoney(settlement.fee || 0)}</strong>
            </div>
        </article>
    `).join('');
}

function renderOrderBreakdown() {
    const orderStats = sellerDashboardState.data?.orderStats || {};
    const total = Math.max(sumValues(orderStats), 1);
    const successCount = Number(orderStats.completed || 0) + Number(orderStats.delivered || 0);
    const inProgressCount = Number(orderStats.waiting_payment || 0)
        + Number(orderStats.paid || 0)
        + Number(orderStats.pending || 0)
        + Number(orderStats.confirmed || 0)
        + Number(orderStats.preparing || 0)
        + Number(orderStats.shipping || 0);
    const cancelledCount = Number(orderStats.cancelled || 0);

    setProgress('orderSuccessBar', 'orderSuccessLabel', successCount, total);
    setProgress('orderShippingBar', 'orderShippingLabel', inProgressCount, total);
    setProgress('orderCancelledBar', 'orderCancelledLabel', cancelledCount, total);
}

function renderRevenueTrend() {
    const chart = document.getElementById('revenueTrendChart');
    const labels = document.getElementById('revenueTrendLabels');
    const points = sellerDashboardState.revenueTrend || [];

    if (!points.length) {
        chart.innerHTML = '';
        labels.innerHTML = '<span>Chưa có dữ liệu doanh thu.</span>';
        return;
    }

    const width = 760;
    const height = 240;
    const paddingX = 28;
    const paddingTop = 20;
    const paddingBottom = 42;
    const maxValue = Math.max(...points.map((point) => point.value), 1);
    const stepX = points.length > 1 ? (width - paddingX * 2) / (points.length - 1) : 0;

    const coords = points.map((point, index) => {
        const x = paddingX + (stepX * index);
        const y = paddingTop + ((height - paddingTop - paddingBottom) * (1 - (point.value / maxValue)));
        return { x, y };
    });

    const linePath = coords.map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x} ${coord.y}`).join(' ');
    const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height - paddingBottom} L ${coords[0].x} ${height - paddingBottom} Z`;

    chart.innerHTML = `
        <defs>
            <linearGradient id="sellerRevenueGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#964300" stop-opacity="0.22"></stop>
                <stop offset="100%" stop-color="#964300" stop-opacity="0"></stop>
            </linearGradient>
        </defs>
        <path d="${areaPath}" fill="url(#sellerRevenueGradient)"></path>
        <path d="${linePath}" fill="none" stroke="#964300" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
        ${coords.map((coord) => `<circle cx="${coord.x}" cy="${coord.y}" r="5" fill="#964300"></circle>`).join('')}
    `;

    labels.innerHTML = points.map((point) => `<span>${escapeHtml(point.label)}</span>`).join('');
}

async function buildRevenueTrendPoints(days) {
    const today = new Date();
    const requests = [];
    const descriptors = [];

    for (let index = days - 1; index >= 0; index -= 1) {
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - index, 0, 0, 0, 0);
        const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - index, 23, 59, 59, 999);
        descriptors.push({
            label: days <= 7
                ? start.toLocaleDateString('vi-VN', { weekday: 'short' }).replace('Th ', 'T')
                : start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
            from: start.toISOString(),
            to: end.toISOString()
        });
        requests.push(api.sellerApi.getRevenue({ from: start.toISOString(), to: end.toISOString() }));
    }

    const responses = await Promise.all(requests);
    return descriptors.map((descriptor, index) => ({
        label: descriptor.label,
        value: Number(responses[index]?.data?.revenue || 0)
    }));
}

async function requestSettlement() {
    const wallet = sellerDashboardState.data?.wallet || {};
    if (Number(wallet.pendingSettlementBalance || 0) <= 0) {
        authManager.showNotification('Hiện tại không có số dư nào đủ điều kiện đối soát', 'info');
        return;
    }

    try {
        await api.sellerApi.requestSettlement('Yêu cầu đối soát từ dashboard seller');
        authManager.showNotification('Đã gửi yêu cầu đối soát thành công', 'success');
        await loadSellerDashboard();
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể tạo yêu cầu đối soát lúc này', 'error');
    }
}

function renderSearchSummary(summary) {
    const target = document.getElementById('dashboardSearchSummary');
    if (!target) return;

    if (!sellerDashboardState.search) {
        target.textContent = 'Chưa áp dụng bộ lọc tìm kiếm trên trang tổng quan.';
        return;
    }

    target.textContent = `Đang lọc theo "${sellerDashboardState.search}": ${summary.orders} đơn, ${summary.products} sản phẩm bán chạy, ${summary.reviews} đánh giá, ${summary.inventory} cảnh báo kho, ${summary.settlements} bản ghi đối soát.`;
}

function exportDashboardReport() {
    if (!sellerDashboardState.data) {
        return;
    }

    const reportPayload = {
        generatedAt: new Date().toISOString(),
        shop: sellerDashboardState.data.shop,
        summary: {
            productCount: sellerDashboardState.data.productCount || 0,
            activeProductCount: sellerDashboardState.data.activeProductCount || 0,
            hiddenProductCount: sellerDashboardState.data.hiddenProductCount || 0,
            orderStats: sellerDashboardState.data.orderStats || {},
            revenue: sellerDashboardState.data.revenue || {},
            wallet: sellerDashboardState.data.wallet || {}
        },
        lowStockProducts: sellerDashboardState.data.lowStockProducts || [],
        bestSellingProducts: sellerDashboardState.data.bestSellingProducts || [],
        recentOrders: sellerDashboardState.data.recentOrders || [],
        recentReviews: sellerDashboardState.data.recentReviews || [],
        settlements: sellerDashboardState.data.settlements || [],
        trend: sellerDashboardState.revenueTrend || []
    };

    const blob = new Blob([JSON.stringify(reportPayload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = `seller-dashboard-report-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
}

function openStorefront() {
    const shopId = sellerDashboardState.data?.shop?._id || authManager.shop?._id;
    window.location.href = shopId ? `/#shop-detail?id=${shopId}` : '/#shop';
}

function buildInsightText(data) {
    const lowStock = data.lowStockProducts || [];
    const bestSelling = data.bestSellingProducts || [];
    const waitingPayment = Number(data.orderStats?.waiting_payment || 0);
    const pending = Number(data.orderStats?.pending || 0);
    const wallet = data.wallet || {};

    if (waitingPayment > 0) {
        return `Co ${waitingPayment} đơn hàng đang chờ thanh toán. Bạn có thể ưu tiên liên hệ khách hàng để xác nhận đơn hoặc hỗ trợ thanh toán để tăng tỷ lệ chuyển đổi.`;
    }
    if (pending > 0) {
        return `Co ${pending} đơn hàng đang chờ xác nhận. Bạn có thể xử lý sớm để giúp tiền vào lượng đối soát nhanh hơn.`;
    }
    if (Number(wallet.pendingSettlementBalance || 0) > 0) {
        return `Ban dang co ${formatMoney(wallet.pendingSettlementBalance)} chờ đối soát. Có thể tạo yêu cầu ngay từ dashboard.`;
    }
    if (lowStock.length) {
        return `${lowStock[0].name} chi con ${lowStock[0].stock} sản phầm. Đây là thời điểm phù hợp để restock hoặc đẩy sản phẩm thay thế.`;
    }
    if (bestSelling.length) {
        return `${bestSelling[0].name} dang dan doanh so voi ${bestSelling[0].soldCount || 0} lượt bán. Bạn có thể cân nhắc tăng giá hoặc đẩy mạnh quảng cáo cho sản phẩm này.`;
    }
    return 'Shop đang ở trạng thái ổn định, không có cảnh báo nào cần chú ý từ hệ thống. Hãy tiếp tục duy trì chất lượng sản phẩm và dịch vụ để thu hút khách hàng nhé!';
}

function buildOrderSummaryText(data) {
    const orders = data.recentOrders || [];
    const uniqueBuyers = countUniqueRecentBuyers(orders);
    const wallet = data.wallet || {};

    if (Number(wallet.platformHoldingBalance || 0) > 0) {
        return `${formatMoney(wallet.platformHoldingBalance)} đang ở trạng thái "Sẵn sàng giữ". Số tiền này sẽ chuyển sang đối soát khi đơn hoàn tất.`;
    }

    if (Number(wallet.pendingSettlementBalance || 0) > 0) {
        return `${formatMoney(wallet.pendingSettlementBalance)} đang chờ đối soát. Bạn nên ra soat các đơn đã hoàn tất và thông tin ngân hàng của shop.`;
    }

    if (uniqueBuyers > 0) {
        return `Co ${uniqueBuyers} khách hàng mới hoặc gần đây đã phát sinh đơn. Đây là thời điểm tốt để chăm sóc sau bán hàng.`;
    }

    return 'Chưa có biến động lớn về đơn hàng và dòng tiền hôm nay.';
}

function buildWalletSummary(wallet = {}) {
    if (Number(wallet.pendingSettlementBalance || 0) > 0) {
        return `${formatMoney(wallet.pendingSettlementBalance)} đang chờ đối soát. Sau khi gửi yêu cầu và hệ thống xử lý xong, khoản này sẽ chuyển sang số dư khả dụng.`;
    }

    if (Number(wallet.platformHoldingBalance || 0) > 0) {
        return `${formatMoney(wallet.platformHoldingBalance)} đang được giữ tạm cho đến khi đơn hoàn tất.`;
    }

    return 'Số dư đã được phân loại thành tiền khả dụng, tiền chờ đối soát và tiền đang được giữ tạm.';
}

function countUniqueRecentBuyers(orders) {
    return new Set((orders || []).map((order) => order.buyer?._id || order.buyer?.email).filter(Boolean)).size;
}

function setProgress(barId, labelId, value, total) {
    const percent = total ? Math.round((Number(value || 0) / total) * 100) : 0;
    const bar = document.getElementById(barId);
    const label = document.getElementById(labelId);

    if (bar) bar.style.width = `${percent}%`;
    if (label) label.textContent = `${percent}%`;
}

function sumValues(record = {}) {
    return Object.values(record).reduce((total, value) => total + Number(value || 0), 0);
}

function compactMetric(value) {
    return sellerCompactFormatter.format(Number(value || 0));
}

function safeImage(url, fallback) {
    return url || fallback;
}

function formatMoney(value) {
    return sellerMoneyFormatter.format(Number(value || 0));
}

function formatDashboardDate(value) {
    return value ? new Date(value).toLocaleString('vi-VN') : 'Chưa cập nhật';
}

function formatFullDate(value) {
    return new Intl.DateTimeFormat('vi-VN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(value);
}

function formatLabel(value = '') {
    return String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSettlementStatus(status = '') {
    switch (status) {
        case 'pending':
            return 'Chờ đối soát';
        case 'processing':
            return 'Đang xử lý';
        case 'completed':
            return 'Đã chuyển tiền';
        case 'cancelled':
            return 'Đã hủy';
        default:
            return formatLabel(status);
    }
}

function formatPaymentLabel(status = '') {
    switch (status) {
        case 'unpaid':
            return 'Chưa thanh toán';
        case 'pending':
            return 'Chờ thanh toán';
        case 'processing':
            return 'Đang xử lý thanh toán';
        case 'paid':
            return 'Đã thanh toán';
        case 'failed':
            return 'Thanh toán thất bại';
        case 'expired':
            return 'Đã hết hạn';
        case 'cancelled':
            return 'Đã hủy';
        case 'refunded':
            return 'Đã hoàn tiền';
        default:
            return formatLabel(status);
    }
}

function firstName(name = '') {
    const parts = String(name || '').trim().split(/\s+/);
    return parts.length ? parts[parts.length - 1] : '';
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
}

function formatShopAddress(address = {}) {
    const parts = [address.street, address.ward, address.district, address.city].filter(Boolean);
    return parts.length ? parts.join(', ') : 'Chưa cập nhật';
}

function matchesSearch(search, values) {
    if (!search) return true;
    const haystack = values.filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(search);
}

function renderStars(rating) {
    const value = Math.max(0, Math.min(5, Math.round(Number(rating || 0))));
    return value ? `${'★'.repeat(value)}${'☆'.repeat(5 - value)}` : 'Chưa có sao';
}

function statusClass(status = '') {
    const normalized = String(status || '').toLowerCase();
    if (['approved', 'paid', 'completed', 'delivered', 'active', 'settled'].includes(normalized)) return 'seller-pill-success';
    if (['pending', 'preparing', 'draft', 'platform_holding', 'pending_settlement'].includes(normalized)) return 'seller-pill-warning';
    if (['confirmed', 'shipping', 'processing', 'in_progress'].includes(normalized)) return 'seller-pill-info';
    if (['cancelled', 'rejected', 'failed', 'inactive', 'returned', 'return_pending', 'refunded', 'disputed'].includes(normalized)) return 'seller-pill-danger';
    return 'seller-muted-pill';
}

function setText(id, value) {
    const node = document.getElementById(id);
    if (node) {
        node.textContent = value;
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
