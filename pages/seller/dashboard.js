const sellerDashboardState = {
    data: null,
    search: '',
    trendRange: '7',
    revenueTrend: []
};

const sellerMoneyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
});

const sellerCompactFormatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
});

const DEFAULT_BANNER = '/assets/photos/dog.jpg';
const DEFAULT_LOGO = '/assets/photos/cat.jpg';
const DEFAULT_AVATAR = '/assets/photos/cat.jpg';
const DEFAULT_PRODUCT = '/assets/photos/food.jpg';

document.addEventListener('DOMContentLoaded', async () => {
    if (!authManager.isLoggedIn() || !authManager.isSeller()) {
        authManager.showNotification('Vui lòng đăng nhập bằng tài khoản người bán', 'error');
        window.location.href = '/';
        return;
    }

    bindDashboardShell();
    await loadSellerDashboard();
});

function bindDashboardShell() {
    document.querySelectorAll('[data-dashboard-add-product]').forEach((button) => {
        button.addEventListener('click', () => {
            window.location.href = '/pages/seller/create-product.html';
        });
    });

    document.querySelectorAll('[data-dashboard-view-orders]').forEach((button) => {
        button.addEventListener('click', () => {
            window.location.href = '/pages/seller/orders.html';
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
        window.location.href = '/pages/seller/products.html';
    });
    document.getElementById('dashboardGoStorefrontButton')?.addEventListener('click', openStorefront);
    document.getElementById('dashboardOpenStoreButton')?.addEventListener('click', openStorefront);

    document.getElementById('sellerSidebarToggle')?.addEventListener('click', () => {
        document.body.classList.toggle('seller-sidebar-open');
    });

    document.getElementById('sellerSidebarBackdrop')?.addEventListener('click', () => {
        document.body.classList.remove('seller-sidebar-open');
    });

    document.querySelectorAll('.seller-nav-link').forEach((link) => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                document.body.classList.remove('seller-sidebar-open');
            }
        });
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) {
            document.body.classList.remove('seller-sidebar-open');
        }
    });

    document.getElementById('dashboardSellerName').textContent = authManager.user?.name || 'Người bán';
    document.getElementById('dashboardSellerAvatar').src = safeImage(authManager.user?.avatar, DEFAULT_AVATAR);
    document.getElementById('dashboardCurrentDate').innerHTML = `
        <span class="material-symbols-outlined">calendar_today</span>
        <span>${formatFullDate(new Date())}</span>
    `;
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
        console.error('Không thể tải dữ liệu tổng quan người bán', error);
        authManager.showNotification(error.message || 'Không thể tải dữ liệu tổng quan người bán', 'error');
        document.getElementById('dashboardHeroDescription').textContent = error.message || 'Không thể tải dữ liệu tổng quan vào lúc này.';
    }
}

async function loadRevenueTrend() {
    try {
        const points = await buildRevenueTrendPoints(Number(sellerDashboardState.trendRange || 7));
        sellerDashboardState.revenueTrend = points;
        renderRevenueTrend();
    } catch (error) {
        console.error('Failed to load revenue trend', error);
        document.getElementById('revenueTrendChart').innerHTML = '';
        document.getElementById('revenueTrendLabels').innerHTML = '<span>Không tải được biểu đồ doanh thu.</span>';
    }
}

function hydrateDashboardSummary() {
    const data = sellerDashboardState.data || {};
    const shop = data.shop || authManager.shop || {};
    const orderStats = data.orderStats || {};
    const revenue = data.revenue || {};
    const totalOrders = sumValues(orderStats);
    const pendingOrders = Number(orderStats.pending || 0);
    const completedOrders = Number(orderStats.completed || 0) + Number(orderStats.delivered || 0);
    const activeProducts = Number(data.activeProductCount || 0);
    const lowStockCount = (data.lowStockProducts || []).length;
    const searchSummary = document.getElementById('dashboardSearchSummary');

    document.getElementById('dashboardGreeting').textContent = `${getGreeting()}, ${firstName(authManager.user?.name) || 'bạn'}!`;
    document.getElementById('dashboardHeroDescription').textContent = shop.description
        ? `Đây là bức tranh toàn cảnh của ${shop.name}: doanh thu, đơn hàng, tồn kho và trải nghiệm khách hàng đều đã được gom lại ở đây.`
        : 'Đây là những gì đang diễn ra với cửa hàng của bạn hôm nay.';

    document.getElementById('dashboardSellerName').textContent = authManager.user?.name || 'Người bán';
    document.getElementById('dashboardSellerRole').textContent = shop.status === 'approved' ? 'Nhà bán đã xác minh' : 'Shop đang chờ duyệt';
    document.getElementById('dashboardSellerAvatar').src = safeImage(authManager.user?.avatar, DEFAULT_AVATAR);

    document.getElementById('dashboardShopBanner').src = safeImage(shop.banner, DEFAULT_BANNER);
    document.getElementById('dashboardShopLogo').src = safeImage(shop.logo, DEFAULT_LOGO);
    document.getElementById('dashboardShopName').textContent = shop.name || 'Cửa hàng của bạn';
    document.getElementById('dashboardShopSummary').textContent = shop.description || 'Cập nhật mô tả shop để khách hàng hiểu rõ hơn về thương hiệu và các dòng sản phẩm bạn đang bán.';
    document.getElementById('dashboardShopRating').textContent = `${Number(shop.rating || 0).toFixed(1)} điểm`;
    document.getElementById('dashboardReviewCount').textContent = String(shop.reviewCount || data.recentReviews?.length || 0);
    document.getElementById('dashboardShopContact').textContent = [shop.phone, shop.email].filter(Boolean).join(' · ') || 'Chưa cập nhật';
    document.getElementById('dashboardShopAddress').textContent = formatShopAddress(shop.address);
    document.getElementById('dashboardActiveProductCount').textContent = String(activeProducts);
    document.getElementById('dashboardHiddenProductCount').textContent = String(data.hiddenProductCount || 0);

    const shopStatus = document.getElementById('dashboardShopStatus');
    shopStatus.textContent = formatLabel(shop.status || 'pending');
    shopStatus.className = `seller-status-pill ${statusClass(shop.status || 'pending')}`;

    document.getElementById('statTotalOrders').textContent = compactMetric(totalOrders);
    document.getElementById('statTotalOrdersDelta').textContent = completedOrders
        ? `${completedOrders} đơn đã hoàn tất hoặc giao thành công`
        : 'Chưa có đơn hoàn tất';
    document.getElementById('statTodayRevenue').textContent = formatMoney(revenue.today);
    document.getElementById('statTodayRevenueDelta').textContent = pendingOrders
        ? `${pendingOrders} đơn đang chờ xác nhận`
        : 'Không có đơn mới đang chờ';
    document.getElementById('statMonthRevenue').textContent = formatMoney(revenue.month);
    document.getElementById('statMonthRevenueDelta').textContent = revenue.total
        ? `Đạt ${Math.min(100, Math.round((Number(revenue.month || 0) / Math.max(Number(revenue.total || 1), 1)) * 100))}% trên tổng doanh thu toàn kỳ`
        : 'Chưa có doanh thu tích lũy';
    document.getElementById('statProductCount').textContent = compactMetric(data.productCount || 0);
    document.getElementById('statVisibleProducts').textContent = lowStockCount
        ? `${activeProducts} hiển thị · ${lowStockCount} sắp hết`
        : `${activeProducts} hiển thị trên sàn`;
    document.getElementById('statPendingOrders').textContent = String(pendingOrders);
    document.getElementById('statConfirmedOrders').textContent = pendingOrders
        ? `Có ${pendingOrders} đơn cần xử lý ngay`
        : 'Hiện không có đơn chờ xác nhận';

    document.getElementById('revenueToday').textContent = formatMoney(revenue.today);
    document.getElementById('revenueMonth').textContent = formatMoney(revenue.month);
    document.getElementById('revenueYear').textContent = formatMoney(revenue.year);
    document.getElementById('revenueTotal').textContent = formatMoney(revenue.total);
    document.getElementById('revenuePlatformFee').textContent = formatMoney(revenue.platformFee);
    document.getElementById('revenueNet').textContent = formatMoney(revenue.netRevenue);

    document.getElementById('dashboardInsight').textContent = buildInsightText(data);
    document.getElementById('dashboardOrderSummaryText').textContent = buildOrderSummaryText(data);
    document.getElementById('dashboardNewBuyerCount').textContent = String(countUniqueRecentBuyers(data.recentOrders || []));
    if (searchSummary) {
        searchSummary.textContent = 'Chưa áp dụng bộ lọc tìm kiếm trên trang tổng quan.';
    }

    const notificationDot = document.getElementById('dashboardNotificationDot');
    if (notificationDot) {
        notificationDot.style.display = pendingOrders > 0 ? 'block' : 'none';
    }

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
        settlement.notes
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
        container.innerHTML = '<div class="seller-empty-state">Không có sản phẩm sắp hết kho theo bộ lọc hiện tại.</div>';
        return;
    }

    container.innerHTML = products.map((product) => `
        <article class="seller-list-card seller-list-card-compact">
            <div class="seller-list-main">
                <div class="seller-list-main-head">
                    <strong>${escapeHtml(product.name)}</strong>
                    <span class="seller-muted-pill">Stock ${Number(product.stock || 0)}</span>
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
        return `
            <article class="seller-order-card">
                <div class="seller-order-thumb">
                    <img src="${safeImage(firstItem.image, DEFAULT_PRODUCT)}" alt="${escapeHtml(firstItem.name || 'Order product')}">
                </div>
                <div class="seller-list-main">
                    <div class="seller-list-main-head">
                        <strong>#${escapeHtml(order.orderNumber || order._id)}</strong>
                        <span class="seller-status-pill ${statusClass(status)}">${formatLabel(status)}</span>
                    </div>
                    <p>${escapeHtml(order.buyer?.name || 'Khách hàng')} · ${escapeHtml(order.buyer?.phone || 'Chưa có số điện thoại')}</p>
                    <small>${escapeHtml(firstItem.name || 'Đơn hàng')} · ${formatDate(order.createdAt)}</small>
                </div>
                <div class="seller-list-side">
                    <strong>${formatMoney(order.finalAmount || order.total)}</strong>
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
                <small>${review.sellerReply?.comment ? 'Đã phản hồi' : 'Chưa phản hồi'} · ${formatDate(review.createdAt)}</small>
            </div>
        </article>
    `).join('');
}

function renderSettlements(settlements) {
    const container = document.getElementById('dashboardSettlements');
    if (!settlements.length) {
        container.innerHTML = '<div class="seller-empty-state">Chưa có lịch sử đối soát hoặc thông báo thanh toán.</div>';
        return;
    }

    container.innerHTML = settlements.map((settlement) => `
        <article class="seller-list-card">
            <div class="seller-list-main">
                <div class="seller-list-main-head">
                    <strong>${formatMoney(settlement.netAmount || settlement.amount || 0)}</strong>
                    <span class="seller-status-pill ${statusClass(settlement.status)}">${formatLabel(settlement.status)}</span>
                </div>
                <p>${escapeHtml(settlement.notes || 'Yêu cầu đối soát / thanh toán cho seller')}</p>
                <small>${formatDate(settlement.createdAt)}</small>
            </div>
            <div class="seller-list-side">
                <span class="seller-list-subtle">Phí</span>
                <strong>${formatMoney(settlement.fee || 0)}</strong>
            </div>
        </article>
    `).join('');
}

function renderOrderBreakdown() {
    const orderStats = sellerDashboardState.data?.orderStats || {};
    const total = Math.max(sumValues(orderStats), 1);
    const successCount = Number(orderStats.completed || 0) + Number(orderStats.delivered || 0);
    const shippingCount = Number(orderStats.pending || 0) + Number(orderStats.confirmed || 0) + Number(orderStats.preparing || 0) + Number(orderStats.shipping || 0);
    const cancelledCount = Number(orderStats.cancelled || 0) + Number(orderStats.returned || 0) + Number(orderStats.return_pending || 0);

    setProgress('orderSuccessBar', 'orderSuccessLabel', successCount, total);
    setProgress('orderShippingBar', 'orderShippingLabel', shippingCount, total);
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

function renderSearchSummary(summary) {
    const target = document.getElementById('dashboardSearchSummary');
    if (!target) return;

    if (!sellerDashboardState.search) {
        target.textContent = 'Chưa áp dụng bộ lọc tìm kiếm trên trang tổng quan.';
        return;
    }

    target.textContent = `Đang lọc theo "${sellerDashboardState.search}": ${summary.orders} đơn, ${summary.products} sản phẩm bán chạy, ${summary.reviews} đánh giá, ${summary.inventory} cảnh báo kho, ${summary.settlements} đối soát.`;
}

function exportDashboardReport() {
    if (!sellerDashboardState.data) return;

    const reportPayload = {
        generatedAt: new Date().toISOString(),
        shop: sellerDashboardState.data.shop,
        summary: {
            productCount: sellerDashboardState.data.productCount || 0,
            activeProductCount: sellerDashboardState.data.activeProductCount || 0,
            hiddenProductCount: sellerDashboardState.data.hiddenProductCount || 0,
            orderStats: sellerDashboardState.data.orderStats || {},
            revenue: sellerDashboardState.data.revenue || {}
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
    const pending = Number(data.orderStats?.pending || 0);

    if (pending > 0) {
        return `Có ${pending} đơn đang chờ xác nhận. Ưu tiên xử lý sớm để giữ SLA và tăng khả năng nhận đánh giá tốt từ khách hàng.`;
    }
    if (lowStock.length) {
        return `${lowStock[0].name} chỉ còn ${lowStock[0].stock} sản phẩm. Đây là lúc phù hợp để restock hoặc đẩy sản phẩm thay thế.`;
    }
    if (bestSelling.length) {
        return `${bestSelling[0].name} đang dẫn doanh số với ${bestSelling[0].soldCount || 0} lượt bán. Bạn có thể cân nhắc ghép combo hoặc coupon riêng cho dòng này.`;
    }
    return 'Shop đang ở trạng thái ổn định. Bạn có thể tập trung cập nhật thêm sản phẩm mới hoặc tối ưu nội dung mô tả để tăng chuyển đổi.';
}

function buildOrderSummaryText(data) {
    const orders = data.recentOrders || [];
    const uniqueBuyers = countUniqueRecentBuyers(orders);
    const shipping = Number(data.orderStats?.shipping || 0) + Number(data.orderStats?.preparing || 0);

    if (shipping > 0) {
        return `${shipping} đơn đang ở giai đoạn chuẩn bị hoặc vận chuyển. Có ${uniqueBuyers} khách hàng gần đây cần được theo dõi trải nghiệm giao hàng.`;
    }

    if (uniqueBuyers > 0) {
        return `Có ${uniqueBuyers} khách hàng mới hoặc gần đây tương tác với shop. Đây là thời điểm tốt để tối ưu chăm sóc sau bán.`;
    }

    return 'Chưa có biến động lớn về đơn hàng hôm nay. Trang tổng quan sẽ cập nhật ngay khi có giao dịch mới.';
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
    if (['approved', 'paid', 'completed', 'delivered', 'active'].includes(normalized)) return 'seller-pill-success';
    if (['pending', 'preparing', 'draft'].includes(normalized)) return 'seller-pill-warning';
    if (['confirmed', 'shipping', 'processing', 'in_progress'].includes(normalized)) return 'seller-pill-info';
    if (['cancelled', 'rejected', 'failed', 'inactive', 'returned', 'return_pending'].includes(normalized)) return 'seller-pill-danger';
    return 'seller-muted-pill';
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
