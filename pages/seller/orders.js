const sellerOrdersState = {
    page: 1,
    limit: 5,
    status: '',
    search: '',
    actionable: 'all',
    orders: [],
    meta: { page: 1, limit: 5, total: 0, totalPages: 1 },
    stats: null,
    summaryOrders: [],
    selectedOrderId: null,
    selectedOrder: null,
    searchTimer: null
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

const PAYMENT_STATUS_LABELS = {
    unpaid: 'Chưa thanh toán',
    pending: 'Chờ thanh toán',
    processing: 'Đang xử lý thanh toán',
    paid: 'Đã thanh toán',
    failed: 'Thất bại',
    expired: 'Hết hạn',
    cancelled: 'Đã hủy',
    refunded: 'Đã hoàn tiền'
};

const FUND_FLOW_LABELS = {
    unpaid: 'Chưa thu tiền',
    platform_holding: 'Sàn đang giữ',
    pending_settlement: 'Chờ đối soát',
    settled: 'Đã đối soát',
    refunded: 'Đã hoàn tiền',
    disputed: 'Đang tranh chấp',
    cancelled: 'Đã hủy'
};

const PAYMENT_METHOD_LABELS = {
    cod: 'COD',
    bank_transfer: 'Chuyển khoản',
    online: 'Thanh toán online',
    vnpay: 'VNPay',
    momo: 'MoMo'
};

const SHIPPING_METHOD_LABELS = {
    standard: 'Giao tiêu chuẩn',
    express: 'Giao nhanh'
};

const ORDER_ACTIONS = {
    paid: { status: 'confirmed', label: 'Xác nhận đơn', icon: 'check' },
    pending: { status: 'confirmed', label: 'Xác nhận đơn', icon: 'check' },
    confirmed: { status: 'preparing', label: 'Chuẩn bị hàng', icon: 'inventory_2' },
    preparing: { status: 'shipping', label: 'Bàn giao vận chuyển', icon: 'local_shipping' },
    shipping: { status: 'delivered', label: 'Xác nhận đã giao', icon: 'check_circle' },
    delivered: { status: 'completed', label: 'Hoàn tất đơn', icon: 'task_alt' }
};

const ORDER_CANCELABLE = new Set(['paid', 'pending', 'confirmed', 'preparing', 'shipping']);
const DEFAULT_AVATAR = '/assets/photos/cat.jpg';
const DEFAULT_PRODUCT = '/assets/photos/food.jpg';

const sellerOrderMoneyFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
});

let sellerOrdersInitialized = false;

async function initSellerOrdersPage() {
    if (sellerOrdersInitialized) return;
    sellerOrdersInitialized = true;

    if (!authManager.isLoggedIn() || !authManager.isSeller()) {
        authManager.showNotification('Vui lòng đăng nhập seller để vào quản lý đơn hàng', 'error');
        window.location.href = '/';
        return;
    }

    bindSellerOrdersShell();
    hydrateSellerIdentity();
    await loadSellerOrdersPage({ refreshSummary: true });
}

function bootSellerOrdersPage() {
    initSellerOrdersPage().catch((error) => {
        console.error('Seller orders init failed', error);
        renderOrdersErrorState(error.message || 'Không thể khởi tạo trang đơn hàng.');
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootSellerOrdersPage);
} else {
    bootSellerOrdersPage();
}

function bindSellerOrdersShell() {
    document.getElementById('sellerSidebarToggle')?.addEventListener('click', () => {
        document.body.classList.toggle('seller-sidebar-open');
    });

    document.getElementById('sellerSidebarBackdrop')?.addEventListener('click', () => {
        document.body.classList.remove('seller-sidebar-open');
    });

    document.getElementById('ordersNotificationButton')?.addEventListener('click', () => {
        document.getElementById('ordersActivitySection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.getElementById('ordersTipAction')?.addEventListener('click', () => {
        if ((sellerOrdersState.stats?.pendingActionCount || 0) > 0) {
            sellerOrdersState.status = 'pending';
            sellerOrdersState.page = 1;
            document.getElementById('ordersStatusFilter').value = 'pending';
            document.getElementById('ordersFilterPanel').hidden = false;
            loadSellerOrdersPage();
            return;
        }

        document.querySelector('.seller-orders-table-shell')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.getElementById('ordersSearchInput')?.addEventListener('input', (event) => {
        clearTimeout(sellerOrdersState.searchTimer);
        sellerOrdersState.searchTimer = setTimeout(() => {
            sellerOrdersState.search = event.target.value.trim();
            sellerOrdersState.page = 1;
            loadSellerOrdersPage();
        }, 350);
    });

    document.getElementById('ordersFilterToggle')?.addEventListener('click', () => {
        const panel = document.getElementById('ordersFilterPanel');
        panel.hidden = !panel.hidden;
    });

    document.getElementById('ordersApplyFilters')?.addEventListener('click', () => {
        sellerOrdersState.status = document.getElementById('ordersStatusFilter').value;
        sellerOrdersState.limit = Number(document.getElementById('ordersLimitFilter').value) || 5;
        sellerOrdersState.actionable = document.getElementById('ordersActionableFilter').value || 'all';
        sellerOrdersState.page = 1;
        loadSellerOrdersPage();
    });

    document.getElementById('ordersResetFilters')?.addEventListener('click', () => {
        sellerOrdersState.status = '';
        sellerOrdersState.limit = 5;
        sellerOrdersState.actionable = 'all';
        sellerOrdersState.page = 1;
        sellerOrdersState.search = '';
        document.getElementById('ordersStatusFilter').value = '';
        document.getElementById('ordersLimitFilter').value = '5';
        document.getElementById('ordersActionableFilter').value = 'all';
        document.getElementById('ordersSearchInput').value = '';
        loadSellerOrdersPage();
    });

    document.getElementById('ordersExportButton')?.addEventListener('click', exportSellerOrdersReport);
    document.getElementById('ordersPrevTop')?.addEventListener('click', () => changeOrdersPage(-1));
    document.getElementById('ordersNextTop')?.addEventListener('click', () => changeOrdersPage(1));
    document.getElementById('ordersPrevBottom')?.addEventListener('click', () => changeOrdersPage(-1));
    document.getElementById('ordersNextBottom')?.addEventListener('click', () => changeOrdersPage(1));
    document.getElementById('ordersCloseDrawer')?.addEventListener('click', closeSellerOrderDrawer);
    document.getElementById('sellerOrdersDrawerBackdrop')?.addEventListener('click', closeSellerOrderDrawer);
    document.getElementById('ordersTableBody')?.addEventListener('click', handleOrdersTableClick);
    document.getElementById('ordersPageList')?.addEventListener('click', handlePageListClick);
    document.getElementById('ordersDrawerBody')?.addEventListener('click', handleOrderDrawerClick);
}

function hydrateSellerIdentity() {
    setText('ordersSellerName', authManager.user?.name || 'Người bán');
    setText('ordersSellerRole', authManager.shop?.name || 'Chủ cửa hàng');
    document.getElementById('ordersSellerAvatar').src = authManager.user?.avatar || DEFAULT_AVATAR;
}

async function loadSellerOrdersPage({ refreshSummary = false } = {}) {
    renderOrdersLoadingState();

    try {
        const [visibleResult, summaryOrders] = await Promise.all([
            fetchVisibleOrders(),
            refreshSummary || !sellerOrdersState.summaryOrders.length
                ? fetchOrderSummaryOrders()
                : Promise.resolve(sellerOrdersState.summaryOrders)
        ]);

        sellerOrdersState.orders = visibleResult.orders;
        sellerOrdersState.meta = visibleResult.meta;
        sellerOrdersState.summaryOrders = summaryOrders;
        sellerOrdersState.stats = buildOrderFinanceStats(summaryOrders);

        safelyRenderSellerOrdersPanel(renderOrdersStats, 'renderOrdersStats');
        safelyRenderSellerOrdersPanel(renderOrdersTable, 'renderOrdersTable');
        safelyRenderSellerOrdersPanel(renderOrdersPagination, 'renderOrdersPagination');
        safelyRenderSellerOrdersPanel(renderRecentOrderActivity, 'renderRecentOrderActivity');
        safelyRenderSellerOrdersPanel(renderOrdersTip, 'renderOrdersTip');
        safelyRenderSellerOrdersPanel(updateOrdersNotificationState, 'updateOrdersNotificationState');

        if (sellerOrdersState.selectedOrderId) {
            await openSellerOrderDetail(sellerOrdersState.selectedOrderId, { silent: true });
        }
    } catch (error) {
        console.error('Failed to load seller orders', error);
        renderOrdersErrorState(error.message || 'Không thể tải dữ liệu đơn hàng lúc này.');
        authManager.showNotification(error.message || 'Không thể tải đơn hàng', 'error');
    }
}

async function fetchVisibleOrders() {
    const params = {};
    if (sellerOrdersState.status) params.status = sellerOrdersState.status;
    if (sellerOrdersState.search) params.search = sellerOrdersState.search;

    if (sellerOrdersState.actionable === 'actionable') {
        const response = await api.sellerApi.getOrders({ ...params, page: 1, limit: 100 });
        const sourceOrders = response.data || [];
        const actionableOrders = sourceOrders.filter((order) => canOrderReceiveAction(order));
        const total = actionableOrders.length;
        const totalPages = Math.max(1, Math.ceil(total / sellerOrdersState.limit));
        const page = Math.min(sellerOrdersState.page, totalPages);
        const start = (page - 1) * sellerOrdersState.limit;
        sellerOrdersState.page = page;

        return {
            orders: actionableOrders.slice(start, start + sellerOrdersState.limit),
            meta: { page, limit: sellerOrdersState.limit, total, totalPages }
        };
    }

    const response = await api.sellerApi.getOrders({
        ...params,
        page: sellerOrdersState.page,
        limit: sellerOrdersState.limit
    });

    const meta = normalizeMeta(response.meta || response.pagination, sellerOrdersState.page, sellerOrdersState.limit);
    if (meta.totalPages && sellerOrdersState.page > meta.totalPages) {
        sellerOrdersState.page = meta.totalPages;
        return fetchVisibleOrders();
    }

    return {
        orders: response.data || [],
        meta
    };
}

function safelyRenderSellerOrdersPanel(renderFn, label) {
    try {
        renderFn();
    } catch (error) {
        console.error(`Seller orders panel failed: ${label}`, error);
    }
}

async function fetchOrderSummaryOrders() {
    const response = await api.sellerApi.getOrders({ page: 1, limit: 100 });
    return response.data || [];
}

function normalizeMeta(meta, fallbackPage, fallbackLimit) {
    return {
        page: Number(meta?.page || fallbackPage || 1),
        limit: Number(meta?.limit || fallbackLimit || 5),
        total: Number(meta?.total || 0),
        totalPages: Number(meta?.totalPages || 1)
    };
}

function buildOrderFinanceStats(orders) {
    return (orders || []).reduce((acc, order) => {
        const status = getSellerOrderStatus(order);
        const financial = order.sellerFinancial || {};
        if (['pending', 'confirmed', 'preparing'].includes(status)) {
            acc.pendingActionCount += 1;
        }
        if (financial.fundFlowStatus === 'platform_holding') {
            acc.holdingBalance += Number(financial.netAmount || 0);
        }
        if (financial.fundFlowStatus === 'pending_settlement') {
            acc.pendingSettlementBalance += Number(financial.netAmount || 0);
        }
        if (['cancelled', 'refunded'].includes(financial.fundFlowStatus)) {
            acc.cancelledCount += 1;
        }
        return acc;
    }, {
        pendingActionCount: 0,
        holdingBalance: 0,
        pendingSettlementBalance: 0,
        cancelledCount: 0
    });
}

function renderOrdersLoadingState() {
    document.getElementById('ordersTableBody').innerHTML = `
        <tr>
            <td colspan="8" class="seller-orders-loading-cell">Đang tải đơn hàng...</td>
        </tr>
    `;
    setText('ordersTableSubtitle', 'Đang đồng bộ danh sách đơn hàng từ hệ thống.');
}

function renderOrdersErrorState(message) {
    document.getElementById('ordersTableBody').innerHTML = `
        <tr>
            <td colspan="8" class="seller-orders-loading-cell seller-orders-loading-cell-error">${escapeHtml(message)}</td>
        </tr>
    `;
    setText('ordersTableSubtitle', message);
}

function renderOrdersStats() {
    const stats = sellerOrdersState.stats || {};
    setText('statPendingCount', String(stats.pendingActionCount || 0));
    setText('statPendingDelta', `${stats.pendingActionCount || 0} đơn cần xác nhận hoặc chuẩn bị`);
    setText('statHoldingCount', formatOrderMoney(stats.holdingBalance || 0));
    setText('statHoldingDelta', `${formatOrderMoney(stats.holdingBalance || 0)} đang được sàn giữ`);
    setText('statSettlementCount', formatOrderMoney(stats.pendingSettlementBalance || 0));
    setText('statSettlementDelta', `${formatOrderMoney(stats.pendingSettlementBalance || 0)} chờ đối soát`);
    setText('statCancelledCount', String(stats.cancelledCount || 0));
    setText('statCancelledDelta', `${stats.cancelledCount || 0} đơn bị hủy hoặc hoàn tiền`);
}

function renderOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    const orders = sellerOrdersState.orders || [];

    if (!orders.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="seller-orders-loading-cell">
                    Không có đơn hàng phù hợp với bộ lọc hiện tại.
                </td>
            </tr>
        `;
        setText('ordersTableSubtitle', buildOrdersSubtitle());
        return;
    }

    tbody.innerHTML = orders.map((order) => renderOrderRow(order)).join('');
    setText('ordersTableSubtitle', buildOrdersSubtitle());
}

function renderOrderRow(order) {
    const status = getSellerOrderStatus(order);
    const action = getPrimaryOrderAction(status);
    const buyerName = getBuyerName(order);
    const buyerEmail = order.buyer?.email || order.shippingAddress?.email || 'Chưa có email';
    const financial = order.sellerFinancial || {};

    return `
        <tr class="seller-orders-row" data-order-row="${order._id}">
            <td class="seller-orders-code-cell">
                <strong>#${escapeHtml(order.orderNumber || order._id)}</strong>
                <span>${(order.items || []).length} sản phẩm</span>
            </td>
            <td>
                <div class="seller-orders-customer">
                    <div class="seller-orders-avatar">${escapeHtml(getInitials(buyerName))}</div>
                    <div>
                        <strong>${escapeHtml(buyerName)}</strong>
                        <span>${escapeHtml(buyerEmail)}</span>
                    </div>
                </div>
            </td>
            <td class="seller-orders-date-cell">${escapeHtml(formatShortDate(order.createdAt))}</td>
            <td class="seller-orders-total-cell">
                <strong>${escapeHtml(formatOrderMoney(financial.grossAmount || 0))}</strong>
                <span>Thực nhận ${escapeHtml(formatOrderMoney(financial.netAmount || 0))}</span>
            </td>
            <td>
                <span class="seller-orders-status-badge ${statusBadgeClass(status)}">${escapeHtml(ORDER_STATUS_LABELS[status] || formatLabel(status))}</span>
            </td>
            <td>
                <div class="seller-orders-status-stack">
                    <span class="seller-orders-status-badge ${paymentBadgeClass(financial.paymentStatus)}">${escapeHtml(formatPaymentLabel(financial.paymentStatus || order.paymentStatus))}</span>
                    <small>${escapeHtml(PAYMENT_METHOD_LABELS[financial.paymentMethod || order.paymentMethod] || formatLabel(order.paymentMethod || 'cod'))}</small>
                </div>
            </td>
            <td>
                <div class="seller-orders-status-stack">
                    <span class="seller-orders-status-badge ${fundFlowBadgeClass(financial.fundFlowStatus)}">${escapeHtml(FUND_FLOW_LABELS[financial.fundFlowStatus] || formatLabel(financial.fundFlowStatus))}</span>
                    <small>${escapeHtml(formatSettlementHint(financial))}</small>
                </div>
            </td>
            <td class="seller-orders-row-actions-cell">
                <div class="seller-orders-row-actions">
                    ${action ? `
                        <button class="seller-orders-action seller-orders-action-success" type="button" title="${escapeHtml(action.label)}" data-order-primary="${order._id}">
                            <span class="material-symbols-outlined">${action.icon}</span>
                        </button>
                    ` : ''}
                    <button class="seller-orders-action seller-orders-action-view" type="button" title="Xem chi tiết" data-order-view="${order._id}">
                        <span class="material-symbols-outlined">visibility</span>
                    </button>
                    ${canCancelOrder(order) ? `
                        <button class="seller-orders-action seller-orders-action-danger" type="button" title="Hủy đơn" data-order-cancel="${order._id}">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

function buildOrdersSubtitle() {
    const filters = [];
    if (sellerOrdersState.status) filters.push(ORDER_STATUS_LABELS[sellerOrdersState.status] || formatLabel(sellerOrdersState.status));
    if (sellerOrdersState.search) filters.push(`từ khóa "${sellerOrdersState.search}"`);
    if (sellerOrdersState.actionable === 'actionable') filters.push('chỉ đơn còn thao tác');

    return filters.length
        ? `Đang hiển thị ${sellerOrdersState.meta.total} đơn theo ${filters.join(' · ')}.`
        : `Đang hiển thị ${sellerOrdersState.meta.total} đơn hàng mới nhất của shop.`;
}

function renderOrdersPagination() {
    const meta = sellerOrdersState.meta;
    const visibleCount = ((meta.page - 1) * meta.limit) + sellerOrdersState.orders.length;
    setText('ordersPaginationSummary', meta.total
        ? `Hiển thị ${Math.min(meta.total, visibleCount)} trên ${meta.total} đơn hàng`
        : 'Hiển thị 0 đơn hàng');

    const prevDisabled = meta.page <= 1;
    const nextDisabled = meta.page >= meta.totalPages;
    ['ordersPrevTop', 'ordersPrevBottom'].forEach((id) => { document.getElementById(id).disabled = prevDisabled; });
    ['ordersNextTop', 'ordersNextBottom'].forEach((id) => { document.getElementById(id).disabled = nextDisabled; });

    const pages = [];
    const start = Math.max(1, meta.page - 1);
    const end = Math.min(meta.totalPages, start + 2);
    for (let page = start; page <= end; page += 1) {
        pages.push(`<button type="button" class="${page === meta.page ? 'active' : ''}" data-page="${page}">${page}</button>`);
    }
    document.getElementById('ordersPageList').innerHTML = pages.join('');
}

function renderRecentOrderActivity() {
    const activityList = document.getElementById('ordersActivityList');
    if (!activityList) return;
    const activities = (sellerOrdersState.summaryOrders || [])
        .map((order) => getLatestOrderEvent(order))
        .filter(Boolean)
        .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp))
        .slice(0, 6);

    if (!activities.length) {
        activityList.innerHTML = '<li class="seller-orders-empty-activity">Chưa có hoạt động nào để hiển thị.</li>';
        return;
    }

    activityList.innerHTML = activities.map((activity) => `
        <li>
            <span class="seller-orders-activity-dot ${statusBadgeClass(activity.status)}"></span>
            <div>
                <strong>${escapeHtml(activity.title)}</strong>
                <span>${escapeHtml(activity.meta)}</span>
            </div>
        </li>
    `).join('');
}

function renderOrdersTip() {
    const stats = sellerOrdersState.stats || {};
    let tip = 'Don hang dang duoc dong bo on dinh. Ban co the theo doi thanh toan va doi soat ngay trong chi tiet tung don.';

    if ((stats.pendingActionCount || 0) > 0) {
        tip = `Co ${stats.pendingActionCount} don dang cho xac nhan hoac chuan bi. Xu ly som giup mo dong tien ve doi soat nhanh hon.`;
    } else if ((stats.holdingBalance || 0) > 0) {
        tip = `${formatOrderMoney(stats.holdingBalance)} dang o trang thai "San dang giu". Hay theo doi cac don da thanh toan de chuyen sang doi soat sau khi hoan tat.`;
    } else if ((stats.pendingSettlementBalance || 0) > 0) {
        tip = `${formatOrderMoney(stats.pendingSettlementBalance)} dang cho doi soat. Ban co the gui yeu cau doi soat tu dashboard doanh thu.`;
    }

    setText('ordersTipText', tip);
}

function updateOrdersNotificationState() {
    const dot = document.getElementById('ordersNotificationDot');
    if (!dot) return;
    dot.style.display = Number(sellerOrdersState.stats?.pendingActionCount || 0) > 0 ? 'block' : 'none';
}

function handleOrdersTableClick(event) {
    const primaryButton = event.target.closest('[data-order-primary]');
    const viewButton = event.target.closest('[data-order-view]');
    const cancelButton = event.target.closest('[data-order-cancel]');

    if (primaryButton) {
        const order = sellerOrdersState.orders.find((item) => item._id === primaryButton.dataset.orderPrimary);
        quickAdvanceOrder(order);
        return;
    }

    if (viewButton) {
        openSellerOrderDetail(viewButton.dataset.orderView);
        return;
    }

    if (cancelButton) {
        const order = sellerOrdersState.orders.find((item) => item._id === cancelButton.dataset.orderCancel);
        requestOrderCancellation(order);
    }
}

function handlePageListClick(event) {
    const button = event.target.closest('[data-page]');
    if (!button) return;
    sellerOrdersState.page = Number(button.dataset.page);
    loadSellerOrdersPage();
}

function handleOrderDrawerClick(event) {
    const nextButton = event.target.closest('[data-drawer-next]');
    const cancelButton = event.target.closest('[data-drawer-cancel]');
    const refreshButton = event.target.closest('[data-drawer-refresh]');

    if (nextButton) {
        submitOrderStatusChange(sellerOrdersState.selectedOrderId, nextButton.dataset.drawerNext, { fromDrawer: true });
        return;
    }

    if (cancelButton) {
        requestOrderCancellation(sellerOrdersState.selectedOrder, { fromDrawer: true });
        return;
    }

    if (refreshButton) {
        openSellerOrderDetail(sellerOrdersState.selectedOrderId);
    }
}

function changeOrdersPage(delta) {
    const nextPage = sellerOrdersState.page + delta;
    if (nextPage < 1 || nextPage > sellerOrdersState.meta.totalPages) return;
    sellerOrdersState.page = nextPage;
    loadSellerOrdersPage();
}

async function quickAdvanceOrder(order) {
    if (!order) return;
    const action = getPrimaryOrderAction(getSellerOrderStatus(order));

    if (!action) {
        openSellerOrderDetail(order._id);
        return;
    }

    if (action.status === 'shipping') {
        openSellerOrderDetail(order._id);
        authManager.showNotification('Điền thêm đơn vị vận chuyển và mã vận đơn trong chi tiết đơn.', 'info');
        return;
    }

    await submitOrderStatusChange(order._id, action.status, {
        reason: `Seller cap nhat trang thai sang ${ORDER_STATUS_LABELS[action.status] || action.status}`
    });
}

async function requestOrderCancellation(order, { fromDrawer = false } = {}) {
    if (!order) return;
    const confirmed = window.confirm(`Bạn có chắc muốn hủy đơn #${order.orderNumber || order._id}?`);
    if (!confirmed) return;

    const reason = window.prompt('Lý do hủy đơn (không bắt buộc)', '') || 'Người bán hủy đơn';
    await submitOrderStatusChange(order._id, 'cancelled', { reason, fromDrawer });
}

async function submitOrderStatusChange(orderId, status, { reason = '', fromDrawer = false } = {}) {
    const tracking = {};
    if (fromDrawer) {
        const carrier = document.getElementById('ordersDrawerCarrier')?.value.trim();
        const trackingNumber = document.getElementById('ordersDrawerTrackingNumber')?.value.trim();
        const estimatedDelivery = document.getElementById('ordersDrawerEstimatedDelivery')?.value;
        const note = document.getElementById('ordersDrawerReason')?.value.trim();

        if (carrier) tracking.carrier = carrier;
        if (trackingNumber) tracking.trackingNumber = trackingNumber;
        if (estimatedDelivery) tracking.estimatedDelivery = estimatedDelivery;
        if (!reason && note) reason = note;
    }

    try {
        await api.sellerApi.updateOrderStatus(orderId, status, reason, tracking);
        authManager.showNotification(`Đã cập nhật đơn sang "${ORDER_STATUS_LABELS[status] || status}"`, 'success');
        await loadSellerOrdersPage({ refreshSummary: true });
        if (fromDrawer) await openSellerOrderDetail(orderId, { silent: true });
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể cập nhật trạng thái đơn', 'error');
        if (fromDrawer) await openSellerOrderDetail(orderId, { silent: true });
    }
}

async function openSellerOrderDetail(orderId, { silent = false } = {}) {
    if (!orderId) return;

    sellerOrdersState.selectedOrderId = orderId;
    sellerOrdersState.selectedOrder = null;

    const drawer = document.getElementById('ordersDetailDrawer');
    const backdrop = document.getElementById('sellerOrdersDrawerBackdrop');
    const body = document.getElementById('ordersDrawerBody');

    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.hidden = false;
    body.innerHTML = '<div class="seller-orders-drawer-loading">Đang tải chi tiết đơn hàng...</div>';

    try {
        const response = await api.sellerApi.getOrder(orderId);
        sellerOrdersState.selectedOrder = response.data || null;
        renderOrderDrawer(sellerOrdersState.selectedOrder);
    } catch (error) {
        body.innerHTML = `<div class="seller-orders-drawer-loading seller-orders-drawer-loading-error">${escapeHtml(error.message || 'Không thể tải chi tiết đơn hàng')}</div>`;
        if (!silent) authManager.showNotification(error.message || 'Không thể tải chi tiết đơn hàng', 'error');
    }
}

function closeSellerOrderDrawer() {
    sellerOrdersState.selectedOrderId = null;
    sellerOrdersState.selectedOrder = null;
    document.getElementById('ordersDetailDrawer').classList.remove('open');
    document.getElementById('ordersDetailDrawer').setAttribute('aria-hidden', 'true');
    document.getElementById('sellerOrdersDrawerBackdrop').hidden = true;
}

function renderOrderDrawer(order) {
    const body = document.getElementById('ordersDrawerBody');
    const status = getSellerOrderStatus(order);
    const action = getPrimaryOrderAction(status);
    const financial = order.sellerFinancial || {};

    setText('ordersDrawerTitle', `#${order.orderNumber || order._id}`);
    body.innerHTML = `
        <section class="seller-orders-drawer-summary">
            <div class="seller-orders-drawer-summary-head">
                <span class="seller-orders-status-badge ${statusBadgeClass(status)}">${escapeHtml(ORDER_STATUS_LABELS[status] || formatLabel(status))}</span>
                <button class="seller-secondary-button seller-orders-drawer-refresh" type="button" data-drawer-refresh>
                    <span class="material-symbols-outlined">refresh</span>
                    <span>Tải lại</span>
                </button>
            </div>
            <div class="seller-orders-drawer-metrics">
                <article><span>Tổng tiền shop</span><strong>${escapeHtml(formatOrderMoney(financial.grossAmount || 0))}</strong></article>
                <article><span>Trạng thái thanh toán</span><strong>${escapeHtml(formatPaymentLabel(financial.paymentStatus || order.paymentStatus))}</strong></article>
                <article><span>Dòng tiền</span><strong>${escapeHtml(FUND_FLOW_LABELS[financial.fundFlowStatus] || formatLabel(financial.fundFlowStatus))}</strong></article>
            </div>
        </section>

        <section class="seller-orders-drawer-grid">
            <article class="seller-orders-drawer-card">
                <h4>Người nhận</h4>
                <dl>
                    <div><dt>Họ tên</dt><dd>${escapeHtml(getBuyerName(order))}</dd></div>
                    <div><dt>Điện thoại</dt><dd>${escapeHtml(order.shippingAddress?.phone || order.buyer?.phone || 'Chưa có')}</dd></div>
                    <div><dt>Email</dt><dd>${escapeHtml(order.buyer?.email || order.shippingAddress?.email || 'Chưa có')}</dd></div>
                    <div><dt>Địa chỉ</dt><dd>${escapeHtml(formatOrderAddress(order.shippingAddress))}</dd></div>
                    <div><dt>Ghi chú</dt><dd>${escapeHtml(order.notes || 'Không có ghi chú')}</dd></div>
                </dl>
            </article>

            <article class="seller-orders-drawer-card">
                <h4>Thông tin thanh toán</h4>
                <dl>
                    <div><dt>Phương thức</dt><dd>${escapeHtml(PAYMENT_METHOD_LABELS[financial.paymentMethod || order.paymentMethod] || formatLabel(order.paymentMethod || 'cod'))}</dd></div>
                    <div><dt>Kênh thanh toán</dt><dd>${escapeHtml(formatLabel(financial.paymentChannel || order.payment?.channel || 'cod'))}</dd></div>
                    <div><dt>Trạng thái thanh toán</dt><dd>${escapeHtml(formatPaymentLabel(financial.paymentStatus || order.paymentStatus))}</dd></div>
                    <div><dt>Trạng thái dòng tiền</dt><dd>${escapeHtml(FUND_FLOW_LABELS[financial.fundFlowStatus] || formatLabel(financial.fundFlowStatus))}</dd></div>
                    <div><dt>Tổng tiền đơn</dt><dd>${escapeHtml(formatOrderMoney(financial.grossAmount || 0))}</dd></div>
                    <div><dt>Phí sàn</dt><dd>${escapeHtml(formatOrderMoney(financial.platformFee || 0))}</dd></div>
                    <div><dt>Thực nhận</dt><dd>${escapeHtml(formatOrderMoney(financial.netAmount || 0))}</dd></div>
                    <div><dt>Dự kiến đối soát</dt><dd>${escapeHtml(formatOrderDateTime(financial.estimatedSettlementAt))}</dd></div>
                </dl>
            </article>
        </section>

        <section class="seller-orders-drawer-card">
            <h4>Sản phẩm trong đơn</h4>
            <div class="seller-orders-drawer-items">
                ${(order.items || []).map((item) => `
                    <article class="seller-orders-drawer-item">
                        <img src="${escapeAttribute(item.image || DEFAULT_PRODUCT)}" alt="${escapeAttribute(item.name || 'Product')}">
                        <div>
                            <strong>${escapeHtml(item.name || 'Sản phẩm')}</strong>
                            <span>SKU: ${escapeHtml(item.sku || 'Chưa có')}</span>
                            <span>Số lượng: ${item.quantity || 0} · Giá: ${escapeHtml(formatOrderMoney(item.price || 0))}</span>
                        </div>
                        <span class="seller-orders-status-badge ${statusBadgeClass(item.shopStatus || status)}">${escapeHtml(ORDER_STATUS_LABELS[item.shopStatus || status] || formatLabel(item.shopStatus || status))}</span>
                    </article>
                `).join('')}
            </div>
        </section>

        <section class="seller-orders-drawer-card">
            <h4>Cập nhật xử lý</h4>
            <div class="seller-orders-drawer-form-grid">
                <label><span>Đơn vị vận chuyển</span><input id="ordersDrawerCarrier" type="text" value="${escapeAttribute(order.tracking?.carrier || '')}" placeholder="VD: Giao Hang Nhanh"></label>
                <label><span>Mã vận đơn</span><input id="ordersDrawerTrackingNumber" type="text" value="${escapeAttribute(order.tracking?.trackingNumber || '')}" placeholder="VD: GHN123456"></label>
                <label><span>Dự kiến giao</span><input id="ordersDrawerEstimatedDelivery" type="date" value="${escapeAttribute(formatDateInput(order.tracking?.estimatedDelivery))}"></label>
                <label class="seller-orders-drawer-note"><span>Ghi chú trạng thái</span><textarea id="ordersDrawerReason" rows="3" placeholder="Ví dụ: Đã bàn giao cho đơn vị vận chuyển">${escapeHtml(order.statusHistory?.[order.statusHistory.length - 1]?.note || '')}</textarea></label>
            </div>
            <div class="seller-orders-drawer-actions">
                ${action ? `
                    <button class="seller-primary-button" type="button" data-drawer-next="${action.status}">
                        <span class="material-symbols-outlined">${action.icon}</span>
                        <span>${escapeHtml(action.label)}</span>
                    </button>
                ` : ''}
                ${canCancelOrder(order) ? `
                    <button class="seller-secondary-button seller-orders-drawer-danger" type="button" data-drawer-cancel>
                        <span class="material-symbols-outlined">close</span>
                        <span>Hủy đơn</span>
                    </button>
                ` : ''}
            </div>
        </section>

        <section class="seller-orders-drawer-card">
            <h4>Lịch sử đơn hàng</h4>
            <ul class="seller-orders-drawer-timeline">${buildOrderTimeline(order)}</ul>
        </section>
    `;
}

function buildOrderTimeline(order) {
    const history = [...(order.statusHistory || [])].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
    if (!history.length) {
        return '<li><strong>Chưa có lịch sử cập nhật nào.</strong></li>';
    }

    return history.map((entry) => `
        <li>
            <span class="seller-orders-activity-dot ${statusBadgeClass(entry.status)}"></span>
            <div>
                <strong>${escapeHtml(ORDER_STATUS_LABELS[entry.status] || formatLabel(entry.status))}</strong>
                <span>${escapeHtml(entry.note || 'Không có ghi chú')} · ${escapeHtml(formatOrderDateTime(entry.updatedAt))}</span>
            </div>
        </li>
    `).join('');
}

function exportSellerOrdersReport() {
    const orders = sellerOrdersState.orders || [];
    if (!orders.length) {
        authManager.showNotification('Không có đơn hàng nào để xuất trong bộ lọc hiện tại', 'info');
        return;
    }

    const header = ['order_number', 'buyer_name', 'created_at', 'gross_amount', 'order_status', 'payment_status', 'fund_flow_status', 'net_amount'];
    const rows = orders.map((order) => {
        const financial = order.sellerFinancial || {};
        return [
            order.orderNumber || order._id,
            getBuyerName(order),
            formatOrderDateTime(order.createdAt),
            String(financial.grossAmount || 0),
            getSellerOrderStatus(order),
            financial.paymentStatus || '',
            financial.fundFlowStatus || '',
            String(financial.netAmount || 0)
        ];
    });

    const csv = [header, ...rows]
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    downloadTextFile(csv, `seller-orders-page-${sellerOrdersState.page}.csv`, 'text/csv;charset=utf-8;');
}

function downloadTextFile(content, fileName, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

function getSellerOrderStatus(order) {
    return order?.items?.[0]?.shopStatus || order?.orderStatus || order?.status || 'pending';
}

function getPrimaryOrderAction(status) {
    return ORDER_ACTIONS[status] || null;
}

function canCancelOrder(order) {
    return ORDER_CANCELABLE.has(getSellerOrderStatus(order));
}

function canOrderReceiveAction(order) {
    const status = getSellerOrderStatus(order);
    return Boolean(getPrimaryOrderAction(status) || canCancelOrder(order));
}

function getBuyerName(order) {
    return order.buyer?.name || order.shippingAddress?.fullName || 'Khách hàng';
}

function getInitials(name) {
    return String(name || 'KH').trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'KH';
}

function getLatestOrderEvent(order) {
    const history = order.statusHistory || [];
    const latest = history[history.length - 1];
    const status = latest?.status || getSellerOrderStatus(order);
    const financial = order.sellerFinancial || {};
    return {
        status,
        timestamp: latest?.updatedAt || order.updatedAt || order.createdAt,
        title: `${ORDER_STATUS_LABELS[status] || formatLabel(status)} đơn #${order.orderNumber || order._id}`,
        meta: `${getBuyerName(order)} · ${formatPaymentLabel(financial.paymentStatus || order.paymentStatus)} · ${timeAgo(latest?.updatedAt || order.updatedAt || order.createdAt)}`
    };
}

function statusBadgeClass(status) {
    if (['completed', 'paid', 'confirmed', 'settled'].includes(status)) return 'seller-orders-status-success';
    if (['shipping', 'preparing', 'delivered', 'platform_holding', 'pending_settlement', 'waiting_payment'].includes(status)) return 'seller-orders-status-warm';
    if (['cancelled', 'failed', 'refunded', 'disputed'].includes(status)) return 'seller-orders-status-danger';
    return 'seller-orders-status-neutral';
}

function paymentBadgeClass(status) {
    if (status === 'paid') return 'seller-orders-status-success';
    if (['pending', 'processing'].includes(status)) return 'seller-orders-status-warm';
    if (['failed', 'cancelled', 'refunded', 'expired'].includes(status)) return 'seller-orders-status-danger';
    return 'seller-orders-status-neutral';
}

function fundFlowBadgeClass(status) {
    if (status === 'settled') return 'seller-orders-status-success';
    if (['platform_holding', 'pending_settlement'].includes(status)) return 'seller-orders-status-warm';
    if (['cancelled', 'refunded', 'disputed'].includes(status)) return 'seller-orders-status-danger';
    return 'seller-orders-status-neutral';
}

function formatOrderMoney(amount) {
    return sellerOrderMoneyFormatter.format(Number(amount || 0));
}

function formatShortDate(value) {
    if (!value) return 'Chưa có ngày';
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
}

function formatOrderDateTime(value) {
    if (!value) return 'Chưa có dữ liệu';
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatDateInput(value) {
    if (!value) return '';
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatOrderAddress(address) {
    if (!address) return 'Chưa có địa chỉ';
    return [address.addressLine || address.street, address.ward, address.district, address.city, address.country].filter(Boolean).join(', ');
}

function formatPaymentLabel(status = '') {
    return PAYMENT_STATUS_LABELS[status] || formatLabel(status);
}

function formatSettlementHint(financial = {}) {
    if (financial.settledAt) return `Đã xử lý ${formatShortDate(financial.settledAt)}`;
    if (financial.estimatedSettlementAt) return `Dự kiến ${formatShortDate(financial.estimatedSettlementAt)}`;
    return 'Chưa có lịch đối soát';
}

function formatLabel(value) {
    return String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function timeAgo(value) {
    const diff = Date.now() - new Date(value).getTime();
    const minutes = Math.round(diff / 60000);
    if (minutes < 1) return 'vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.round(hours / 24)} ngày trước`;
}

function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
}
