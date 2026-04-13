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
    unpaid: 'Chua thu tien',
    platform_holding: 'San dang giu',
    pending_settlement: 'Cho doi soat',
    settled: 'Da doi soat',
    refunded: 'Da hoan tien',
    disputed: 'Dang tranh chap',
    cancelled: 'Da huy'
};

const ORDER_STATUS_LABELS = {
    waiting_payment: 'Cho thanh toan',
    paid: 'Da thanh toan',
    pending: 'Cho xac nhan',
    confirmed: 'Da xac nhan',
    preparing: 'Dang chuan bi',
    shipping: 'Dang giao',
    delivered: 'Da giao',
    completed: 'Hoan tat',
    cancelled: 'Da huy',
    return_pending: 'Cho xu ly hoan tra',
    returned: 'Da hoan tra'
};

document.addEventListener('DOMContentLoaded', async () => {
    if (!authManager.isLoggedIn() || !authManager.isSeller()) {
        authManager.showNotification('Vui long dang nhap bang tai khoan nguoi ban', 'error');
        window.location.href = '/';
        return;
    }

    bindDashboardShell();

    if (!authManager.hasSellerCenterAccess()) {
        renderPendingSellerDashboard();
        return;
    }

    await loadSellerDashboard();
});

function bindDashboardShell() {
    const addProductTarget = authManager.hasSellerCenterAccess()
        ? '/pages/seller/create-product.html'
        : '/pages/account/seller-application.html';
    const orderTarget = authManager.hasSellerCenterAccess()
        ? '/pages/seller/orders.html'
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
        button.addEventListener('click', () => authManager.logout());
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
    document.getElementById('dashboardManageProductsButton')?.addEventListener('click', () => {
        window.location.href = authManager.hasSellerCenterAccess()
            ? '/pages/seller/products.html'
            : '/pages/account/seller-application.html';
    });
    document.getElementById('dashboardGoStorefrontButton')?.addEventListener('click', openStorefront);
    document.getElementById('dashboardOpenStoreButton')?.addEventListener('click', openStorefront);
    document.getElementById('walletRequestSettlementButton')?.addEventListener('click', requestSettlement);

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

    setText('dashboardSellerName', authManager.user?.name || 'Nguoi ban');
    document.getElementById('dashboardSellerAvatar').src = safeImage(authManager.user?.avatar, DEFAULT_AVATAR);
    document.getElementById('dashboardCurrentDate').innerHTML = `
        <span class="material-symbols-outlined">calendar_today</span>
        <span>${formatFullDate(new Date())}</span>
    `;
}

function renderPendingSellerDashboard() {
    const sellerName = firstName(authManager.user?.name) || 'ban';
    const accessStatus = authManager.sellerAccess?.status || authManager.sellerApplication?.status || 'draft';
    const applicationUrl = '/pages/account/seller-application.html';
    const pendingCard = `
        <div class="seller-empty-state">
            <strong>Seller Center dang cho duyet</strong>
            <p>Tai khoan cua ban da dang nhap thanh cong nhung chua the van hanh shop. Trang thai ho so hien tai: <strong>${formatLabel(accessStatus)}</strong>.</p>
            <a class="seller-inline-action" href="${applicationUrl}">Mo ho so mo shop</a>
        </div>
    `;

    setText('dashboardGreeting', `Chao ${sellerName}!`);
    setText('dashboardHeroDescription', 'Hoan tat ho so mo shop va cho Admin phe duyet de mo quyen dang san pham, xu ly don va nhan doi soat.');
    setText('dashboardSellerRole', `Trang thai ho so: ${formatLabel(accessStatus)}`);
    setText('dashboardSearchSummary', 'Dashboard dang o che do cho duyet seller.');

    ['statTotalOrders', 'statTodayRevenue', 'statMonthRevenue', 'statProductCount', 'statPendingOrders'].forEach((id) => setText(id, '--'));
    ['revenueToday', 'revenueMonth', 'revenueYear', 'revenueTotal', 'revenuePlatformFee', 'revenueNet', 'walletAvailableBalance', 'walletPendingSettlement', 'walletHoldingBalance', 'walletRefundedBalance'].forEach((id) => setText(id, '--'));

    setText('statTotalOrdersDelta', 'Se mo sau khi shop duoc duyet.');
    setText('statTodayRevenueDelta', 'Doanh thu chua duoc kich hoat.');
    setText('statMonthRevenueDelta', 'Doanh thu chua duoc kich hoat.');
    setText('statVisibleProducts', 'Chua the dang san pham.');
    setText('statConfirmedOrders', 'Chua the xu ly don hang.');
    setText('walletSummaryNote', 'Admin can phe duyet seller truoc khi mo luong thanh toan va doi soat cho shop.');

    ['dashboardInventoryHighlights', 'dashboardRecentOrders', 'dashboardBestSelling', 'dashboardRecentReviews', 'dashboardSettlements'].forEach((id) => {
        document.getElementById(id).innerHTML = pendingCard;
    });

    document.getElementById('revenueTrendChart').innerHTML = '';
    document.getElementById('revenueTrendLabels').innerHTML = '<span>Bieu do doanh thu se hien thi sau khi shop duoc duyet.</span>';
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
        console.error('Khong the tai dashboard seller', error);
        authManager.showNotification(error.message || 'Khong the tai du lieu tong quan nguoi ban', 'error');
        setText('dashboardHeroDescription', error.message || 'Khong the tai du lieu tong quan vao luc nay.');
    }
}

async function loadRevenueTrend() {
    try {
        const points = await buildRevenueTrendPoints(Number(sellerDashboardState.trendRange || 7));
        sellerDashboardState.revenueTrend = points;
        renderRevenueTrend();
    } catch (error) {
        console.error('Khong the tai bieu do doanh thu', error);
        document.getElementById('revenueTrendChart').innerHTML = '';
        document.getElementById('revenueTrendLabels').innerHTML = '<span>Khong tai duoc bieu do doanh thu.</span>';
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
        ? `Day la toan canh doanh thu, thanh toan va doi soat cua ${shop.name}.`
        : 'Day la nhung gi dang dien ra voi shop cua ban hom nay.');
    setText('dashboardSellerName', authManager.user?.name || 'Nguoi ban');
    setText('dashboardSellerRole', shop.status === 'approved' ? 'Shop da xac minh' : 'Shop dang cho duyet');
    document.getElementById('dashboardSellerAvatar').src = safeImage(authManager.user?.avatar, DEFAULT_AVATAR);

    document.getElementById('dashboardShopBanner').src = safeImage(shop.banner, DEFAULT_BANNER);
    document.getElementById('dashboardShopLogo').src = safeImage(shop.logo, DEFAULT_LOGO);
    setText('dashboardShopName', shop.name || 'Cua hang cua ban');
    setText('dashboardShopSummary', shop.description || 'Cap nhat mo ta shop de khach hang hieu ro hon ve thuong hieu cua ban.');
    setText('dashboardShopRating', `${Number(shop.rating || 0).toFixed(1)} diem`);
    setText('dashboardReviewCount', String(shop.reviewCount || data.recentReviews?.length || 0));
    setText('dashboardShopContact', [shop.phone, shop.email].filter(Boolean).join(' · ') || 'Chua cap nhat');
    setText('dashboardShopAddress', formatShopAddress(shop.address));
    setText('dashboardActiveProductCount', String(activeProducts));
    setText('dashboardHiddenProductCount', String(data.hiddenProductCount || 0));

    const shopStatus = document.getElementById('dashboardShopStatus');
    shopStatus.textContent = formatLabel(shop.status || 'pending');
    shopStatus.className = `seller-status-pill ${statusClass(shop.status || 'pending')}`;

    setText('statTotalOrders', compactMetric(totalOrders));
    setText('statTotalOrdersDelta', completedOrders
        ? `${completedOrders} don da hoan tat hoac giao thanh cong`
        : 'Chua co don hoan tat');
    setText('statTodayRevenue', formatMoney(revenue.today));
    setText('statTodayRevenueDelta', pendingOrders
        ? `${pendingOrders} don dang cho xac nhan hoac chuan bi`
        : 'Khong co don moi dang cho');
    setText('statMonthRevenue', formatMoney(revenue.month));
    setText('statMonthRevenueDelta', revenue.total
        ? `${Math.min(100, Math.round((Number(revenue.month || 0) / Math.max(Number(revenue.total || 1), 1)) * 100))}% tren tong doanh thu da ghi nhan`
        : 'Chua co doanh thu tich luy');
    setText('statProductCount', compactMetric(data.productCount || 0));
    setText('statVisibleProducts', lowStockCount
        ? `${activeProducts} dang hien thi · ${lowStockCount} sap het`
        : `${activeProducts} dang hien thi tren san`);
    setText('statPendingOrders', String(pendingOrders));
    setText('statConfirmedOrders', pendingOrders
        ? `Co ${pendingOrders} don can uu tien xu ly`
        : 'Khong co don can xu ly ngay');

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
    setText('dashboardSearchSummary', 'Chua ap dung bo loc tim kiem tren trang tong quan.');
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
        container.innerHTML = '<div class="seller-empty-state">Khong co san pham sap het kho theo bo loc hien tai.</div>';
        return;
    }

    container.innerHTML = products.map((product) => `
        <article class="seller-list-card seller-list-card-compact">
            <div class="seller-list-main">
                <div class="seller-list-main-head">
                    <strong>${escapeHtml(product.name)}</strong>
                    <span class="seller-muted-pill">Kho ${Number(product.stock || 0)}</span>
                </div>
                <p>${escapeHtml(product.sku || 'Chua co SKU')} · ${formatMoney(product.price)}</p>
            </div>
            <button class="seller-inline-action" type="button" onclick="window.location.href='/pages/seller/products.html'">Cap nhat</button>
        </article>
    `).join('');
}

function renderRecentOrders(orders) {
    const container = document.getElementById('dashboardRecentOrders');
    if (!orders.length) {
        container.innerHTML = '<div class="seller-empty-state">Khong co don hang nao khop voi bo loc hien tai.</div>';
        return;
    }

    container.innerHTML = orders.map((order) => {
        const firstItem = order.items?.[0] || {};
        const status = firstItem.shopStatus || order.orderStatus || order.status;
        const financial = order.sellerFinancial || {};
        return `
            <article class="seller-order-card">
                <div class="seller-order-thumb">
                    <img src="${safeImage(firstItem.image, DEFAULT_PRODUCT)}" alt="${escapeHtml(firstItem.name || 'San pham')}">
                </div>
                <div class="seller-list-main">
                    <div class="seller-list-main-head">
                        <strong>#${escapeHtml(order.orderNumber || order._id)}</strong>
                        <span class="seller-status-pill ${statusClass(status)}">${escapeHtml(ORDER_STATUS_LABELS[status] || formatLabel(status))}</span>
                    </div>
                    <p>${escapeHtml(order.buyer?.name || 'Khach hang')} · ${escapeHtml(formatMoney(financial.grossAmount || order.finalAmount || order.total || 0))}</p>
                    <small>${escapeHtml(FUND_FLOW_LABELS[financial.fundFlowStatus] || 'Chua xac dinh')} · ${escapeHtml(formatPaymentLabel(financial.paymentStatus || order.paymentStatus))}</small>
                </div>
                <div class="seller-list-side">
                    <strong>${formatMoney(financial.netAmount || 0)}</strong>
                    <button class="seller-inline-action" type="button" onclick="window.location.href='/pages/seller/orders.html'">Xu ly</button>
                </div>
            </article>
        `;
    }).join('');
}

function renderBestSelling(products) {
    const container = document.getElementById('dashboardBestSelling');
    if (!products.length) {
        container.innerHTML = '<div class="seller-empty-state">Chua co du lieu doanh so cho danh sach nay.</div>';
        return;
    }

    container.innerHTML = products.map((product) => `
        <article class="seller-top-product">
            <div class="seller-top-product-image">
                <img src="${safeImage(product.thumbnail || product.images?.[0], DEFAULT_PRODUCT)}" alt="${escapeHtml(product.name)}">
            </div>
            <div class="seller-top-product-copy">
                <strong>${escapeHtml(product.name)}</strong>
                <span>${Number(product.soldCount || 0)} luot ban · ${formatMoney(product.price)}</span>
            </div>
        </article>
    `).join('');
}

function renderRecentReviews(reviews) {
    const container = document.getElementById('dashboardRecentReviews');
    if (!reviews.length) {
        container.innerHTML = '<div class="seller-empty-state">Chua co danh gia nao khop voi bo loc hien tai.</div>';
        return;
    }

    container.innerHTML = reviews.map((review) => `
        <article class="seller-list-card">
            <div class="seller-list-main">
                <div class="seller-list-main-head">
                    <strong>${escapeHtml(review.user?.name || 'Khach hang')}</strong>
                    <span class="seller-review-stars">${renderStars(review.rating)}</span>
                </div>
                <p>${escapeHtml(review.product?.name || 'San pham')} · ${escapeHtml(review.comment || review.title || 'Khong co nhan xet')}</p>
                <small>${review.sellerReply?.comment ? 'Da phan hoi' : 'Chua phan hoi'} · ${formatDate(review.createdAt)}</small>
            </div>
        </article>
    `).join('');
}

function renderSettlements(settlements) {
    const container = document.getElementById('dashboardSettlements');
    if (!settlements.length) {
        container.innerHTML = '<div class="seller-empty-state">Chua co lich su doi soat hoac dot chuyen tien nao.</div>';
        return;
    }

    container.innerHTML = settlements.map((settlement) => `
        <article class="seller-list-card">
            <div class="seller-list-main">
                <div class="seller-list-main-head">
                    <strong>${formatMoney(settlement.netAmount || settlement.amount || 0)}</strong>
                    <span class="seller-status-pill ${statusClass(settlement.status)}">${formatSettlementStatus(settlement.status)}</span>
                </div>
                <p>${escapeHtml(settlement.notes || 'Dot doi soat / chuyen tien cho shop')}</p>
                <small>${formatDate(settlement.completedAt || settlement.createdAt)}</small>
            </div>
            <div class="seller-list-side">
                <span class="seller-list-subtle">Phi san</span>
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
        labels.innerHTML = '<span>Chua co du lieu doanh thu.</span>';
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
        authManager.showNotification('Hien chua co so du nao du dieu kien doi soat', 'info');
        return;
    }

    try {
        await api.sellerApi.requestSettlement('Yeu cau doi soat tu dashboard seller');
        authManager.showNotification('Da gui yeu cau doi soat thanh cong', 'success');
        await loadSellerDashboard();
    } catch (error) {
        authManager.showNotification(error.message || 'Khong the tao yeu cau doi soat luc nay', 'error');
    }
}

function renderSearchSummary(summary) {
    const target = document.getElementById('dashboardSearchSummary');
    if (!target) return;

    if (!sellerDashboardState.search) {
        target.textContent = 'Chua ap dung bo loc tim kiem tren trang tong quan.';
        return;
    }

    target.textContent = `Dang loc theo "${sellerDashboardState.search}": ${summary.orders} don, ${summary.products} san pham ban chay, ${summary.reviews} danh gia, ${summary.inventory} canh bao kho, ${summary.settlements} ban ghi doi soat.`;
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
    const shopId = sellerDashboardState.data?.shop?._id;
    window.location.href = shopId ? `/#shop-detail?id=${shopId}` : '/#shop';
}

function buildInsightText(data) {
    const lowStock = data.lowStockProducts || [];
    const bestSelling = data.bestSellingProducts || [];
    const waitingPayment = Number(data.orderStats?.waiting_payment || 0);
    const pending = Number(data.orderStats?.pending || 0);
    const wallet = data.wallet || {};

    if (waitingPayment > 0) {
        return `Co ${waitingPayment} don dang cho thanh toan tu phia nguoi mua. Hay theo doi de tranh giao hang khi chua ghi nhan tien.`;
    }
    if (pending > 0) {
        return `Co ${pending} don dang cho xac nhan. Xu ly som se giup tien vao luong doi soat nhanh hon.`;
    }
    if (Number(wallet.pendingSettlementBalance || 0) > 0) {
        return `Ban dang co ${formatMoney(wallet.pendingSettlementBalance)} cho doi soat. Co the tao yeu cau doi soat ngay tu dashboard.`;
    }
    if (lowStock.length) {
        return `${lowStock[0].name} chi con ${lowStock[0].stock} san pham. Day la luc phu hop de restock hoac day san pham thay the.`;
    }
    if (bestSelling.length) {
        return `${bestSelling[0].name} dang dan doanh so voi ${bestSelling[0].soldCount || 0} luot ban. Ban co the can nhac ghep combo hoac coupon rieng cho dong nay.`;
    }
    return 'Shop dang o trang thai on dinh. Ban co the tap trung toi uu mo ta san pham hoac day them hang moi.';
}

function buildOrderSummaryText(data) {
    const orders = data.recentOrders || [];
    const uniqueBuyers = countUniqueRecentBuyers(orders);
    const wallet = data.wallet || {};

    if (Number(wallet.platformHoldingBalance || 0) > 0) {
        return `${formatMoney(wallet.platformHoldingBalance)} dang o trang thai "San dang giu". So tien nay se chuyen sang doi soat khi don hoan tat.`;
    }

    if (Number(wallet.pendingSettlementBalance || 0) > 0) {
        return `${formatMoney(wallet.pendingSettlementBalance)} dang cho doi soat. Ban nen ra soat cac don da hoan tat va thong tin ngan hang cua shop.`;
    }

    if (uniqueBuyers > 0) {
        return `Co ${uniqueBuyers} khach hang moi hoac gan day vua phat sinh don. Day la thoi diem tot de cham soc sau ban.`;
    }

    return 'Chua co bien dong lon ve don hang va dong tien hom nay.';
}

function buildWalletSummary(wallet = {}) {
    if (Number(wallet.pendingSettlementBalance || 0) > 0) {
        return `${formatMoney(wallet.pendingSettlementBalance)} dang cho doi soat. Sau khi gui yeu cau va he thong xu ly xong, khoan nay se chuyen sang so du kha dung.`;
    }

    if (Number(wallet.platformHoldingBalance || 0) > 0) {
        return `${formatMoney(wallet.platformHoldingBalance)} dang duoc san tam giu cho den khi don hoan tat.`;
    }

    return 'So du da duoc phan loai thanh tien kha dung, tien cho doi soat va tien dang duoc san tam giu.';
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

function formatDate(value) {
    return value ? new Date(value).toLocaleString('vi-VN') : 'Chua cap nhat';
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
            return 'Cho doi soat';
        case 'processing':
            return 'Dang xu ly';
        case 'completed':
            return 'Da chuyen tien';
        case 'cancelled':
            return 'Da huy';
        default:
            return formatLabel(status);
    }
}

function formatPaymentLabel(status = '') {
    switch (status) {
        case 'unpaid':
            return 'Chua thanh toan';
        case 'pending':
            return 'Cho thanh toan';
        case 'processing':
            return 'Dang xu ly thanh toan';
        case 'paid':
            return 'Da thanh toan';
        case 'failed':
            return 'Thanh toan that bai';
        case 'expired':
            return 'Da het han';
        case 'cancelled':
            return 'Da huy';
        case 'refunded':
            return 'Da hoan tien';
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
    if (hour < 12) return 'Chao buoi sang';
    if (hour < 18) return 'Chao buoi chieu';
    return 'Chao buoi toi';
}

function formatShopAddress(address = {}) {
    const parts = [address.street, address.ward, address.district, address.city].filter(Boolean);
    return parts.length ? parts.join(', ') : 'Chua cap nhat';
}

function matchesSearch(search, values) {
    if (!search) return true;
    const haystack = values.filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(search);
}

function renderStars(rating) {
    const value = Math.max(0, Math.min(5, Math.round(Number(rating || 0))));
    return value ? `${'★'.repeat(value)}${'☆'.repeat(5 - value)}` : 'Chua co sao';
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
