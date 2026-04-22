const sellerMessagesState = {
    conversations: [],
    selectedId: '',
    search: '',
    pollTimer: null
};

function sellerChatEscape(value = '') {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sellerChatImage(url = '') {
    if (!url) return '/assets/photos/cat.jpg';
    return /^https?:\/\//i.test(url) || url.startsWith('/') ? url : '/assets/photos/cat.jpg';
}

function sellerChatTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
    }).format(date);
}

function getConversationBuyerName(conversation = {}) {
    return conversation.buyer?.name || conversation.buyer?.email || 'Người mua';
}

function getFilteredConversations() {
    const keyword = sellerMessagesState.search.toLowerCase();
    if (!keyword) return sellerMessagesState.conversations;
    return sellerMessagesState.conversations.filter((conversation) => [
        getConversationBuyerName(conversation),
        conversation.product?.name,
        conversation.lastMessage,
        conversation.shop?.name
    ].filter(Boolean).join(' ').toLowerCase().includes(keyword));
}

function renderSellerConversationList() {
    const container = document.getElementById('sellerConversationList');
    if (!container) return;
    const conversations = getFilteredConversations();

    if (!conversations.length) {
        container.innerHTML = '<div class="seller-empty-state"><strong>Chưa có hội thoại</strong><p>Khi người mua nhắn tin, hội thoại sẽ xuất hiện tại đây.</p></div>';
        return;
    }

    container.innerHTML = conversations.map((conversation) => {
        const isActive = String(conversation._id) === String(sellerMessagesState.selectedId);
        const unread = Number(conversation.sellerUnreadCount || 0);
        return `
            <button class="seller-chat-thread ${isActive ? 'active' : ''}" type="button" data-seller-conversation="${conversation._id}">
                <img src="${sellerChatImage(conversation.buyer?.avatar)}" alt="${sellerChatEscape(getConversationBuyerName(conversation))}">
                <span>
                    <strong>${sellerChatEscape(getConversationBuyerName(conversation))}</strong>
                    <small>${sellerChatEscape(conversation.product?.name || conversation.lastMessage || 'Tin nhắn tư vấn')}</small>
                </span>
                ${unread ? `<em>${unread}</em>` : ''}
            </button>
        `;
    }).join('');

    container.querySelectorAll('[data-seller-conversation]').forEach((button) => {
        button.addEventListener('click', () => {
            sellerMessagesState.selectedId = button.dataset.sellerConversation;
            const url = new URL(window.location.href);
            url.searchParams.set('conversation', sellerMessagesState.selectedId);
            window.history.replaceState({}, '', url.toString());
            renderSellerConversationList();
            loadSellerMessages();
        });
    });
}

function renderSellerMessageRows(messages = []) {
    if (!messages.length) {
        return '<div class="seller-empty-state">Chưa có tin nhắn trong hội thoại này.</div>';
    }

    const userId = String(authManager.user?._id || authManager.user?.id || '');
    return messages.map((message) => {
        const mine = String(message.sender?._id || message.sender) === userId;
        return `
            <div class="seller-chat-bubble-row ${mine ? 'mine' : 'theirs'}">
                <div class="seller-chat-bubble">
                    <p>${sellerChatEscape(message.body || '')}</p>
                    <time>${sellerChatTime(message.createdAt)}</time>
                </div>
            </div>
        `;
    }).join('');
}

async function loadSellerMessages({ silent = false } = {}) {
    const panel = document.getElementById('sellerChatPanel');
    const selected = sellerMessagesState.conversations.find((item) => String(item._id) === String(sellerMessagesState.selectedId));
    if (!panel || !selected) return;

    if (!silent) {
        panel.innerHTML = '<div class="seller-empty-state">Đang tải tin nhắn...</div>';
    }

    try {
        const response = await api.sellerApi.getChatMessages(selected._id);
        const payload = response.data || {};
        const messages = payload.messages || [];
        panel.innerHTML = `
            <div class="seller-chat-panel-head">
                <div>
                    <h3>${sellerChatEscape(getConversationBuyerName(selected))}</h3>
                    <p>${selected.product ? `Sản phẩm: ${sellerChatEscape(selected.product.name)}` : 'Hội thoại tư vấn chung'}</p>
                </div>
                ${selected.product ? `<a class="seller-secondary-button" href="/#product?id=${selected.product._id}" target="_blank" rel="noreferrer">Xem sản phẩm</a>` : ''}
            </div>
            <div class="seller-chat-messages" id="sellerChatMessages">${renderSellerMessageRows(messages)}</div>
            <form class="seller-chat-compose" id="sellerChatForm">
                <textarea id="sellerChatInput" rows="2" maxlength="2000" placeholder="Nhập phản hồi cho người mua..." required></textarea>
                <button class="seller-primary-button" type="submit">Gửi</button>
            </form>
        `;

        const messageBox = document.getElementById('sellerChatMessages');
        if (messageBox) messageBox.scrollTop = messageBox.scrollHeight;
        await api.sellerApi.markChatConversationRead(selected._id).catch(() => {});

        document.getElementById('sellerChatForm')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const input = document.getElementById('sellerChatInput');
            const body = input.value.trim();
            if (!body) return;
            const button = event.currentTarget.querySelector('button[type="submit"]');
            button.disabled = true;
            button.textContent = 'Đang gửi...';
            try {
                await api.sellerApi.sendChatMessage(selected._id, body);
                input.value = '';
                await loadSellerConversations({ keepSelected: true, silent: true });
                await loadSellerMessages({ silent: true });
            } catch (error) {
                authManager.showNotification(error.message || 'Không thể gửi tin nhắn.', 'error');
            } finally {
                button.disabled = false;
                button.textContent = 'Gửi';
            }
        });
    } catch (error) {
        panel.innerHTML = `<div class="seller-empty-state">${sellerChatEscape(error.message || 'Không thể tải tin nhắn.')}</div>`;
    }
}

async function loadSellerConversations({ keepSelected = false, silent = false } = {}) {
    if (!silent) {
        document.getElementById('sellerConversationList').innerHTML = '<div class="seller-empty-state">Đang tải hội thoại...</div>';
    }

    const response = await api.sellerApi.getChatConversations({ limit: 100 });
    sellerMessagesState.conversations = response.data || [];

    const querySelected = new URLSearchParams(window.location.search).get('conversation') || '';
    if (!keepSelected) {
        sellerMessagesState.selectedId = querySelected || sellerMessagesState.conversations[0]?._id || '';
    } else if (!sellerMessagesState.conversations.some((item) => String(item._id) === String(sellerMessagesState.selectedId))) {
        sellerMessagesState.selectedId = sellerMessagesState.conversations[0]?._id || '';
    }

    renderSellerConversationList();
    if (sellerMessagesState.selectedId) {
        await loadSellerMessages({ silent });
    }
}

function bindSellerMessagesShell() {
    document.getElementById('sellerSidebarToggle')?.addEventListener('click', () => {
        document.body.classList.toggle('seller-sidebar-open');
    });
    document.getElementById('sellerSidebarBackdrop')?.addEventListener('click', () => {
        document.body.classList.remove('seller-sidebar-open');
    });
    document.getElementById('sellerMessagesRefresh')?.addEventListener('click', () => loadSellerConversations({ keepSelected: true }));
    document.getElementById('sellerMessagesSearch')?.addEventListener('input', (event) => {
        sellerMessagesState.search = String(event.target.value || '').trim();
        renderSellerConversationList();
    });
    document.getElementById('sellerMessagesName').textContent = authManager.user?.name || 'Người bán';
    document.getElementById('sellerMessagesAvatar').src = sellerChatImage(authManager.user?.avatar);
}

async function initSellerMessagesPage() {
    if (!authManager.isLoggedIn() || !authManager.isSeller()) {
        authManager.showNotification('Vui lòng đăng nhập bằng tài khoản người bán', 'error');
        window.location.href = '/';
        return;
    }

    if (!authManager.hasSellerCenterAccess()) {
        authManager.showNotification('Shop chưa được duyệt nên chưa thể sử dụng tin nhắn.', 'error');
        window.location.href = '/pages/seller/dashboard.html';
        return;
    }

    bindSellerMessagesShell();
    await loadSellerConversations();
    sellerMessagesState.pollTimer = setInterval(() => {
        loadSellerConversations({ keepSelected: true, silent: true }).catch(console.error);
    }, 8000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initSellerMessagesPage().catch(console.error));
} else {
    initSellerMessagesPage().catch(console.error);
}
