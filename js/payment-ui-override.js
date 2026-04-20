(function () {
    if (typeof window === 'undefined' || typeof api === 'undefined') return;

    const originalRenderHashView = typeof renderHashView === 'function' ? renderHashView : null;
    let paymentPollingTimer = null;
    let paymentCountdownTimer = null;

    const BANK_OPTIONS = [
        { code: 'VCB', label: 'Vietcombank' },
        { code: 'TCB', label: 'Techcombank' },
        { code: 'MB', label: 'MB Bank' },
        { code: 'ACB', label: 'ACB' },
        { code: 'BIDV', label: 'BIDV' }
    ];

    const LINKED_PROVIDER_OPTIONS = [
        { type: 'wallet', code: 'MOMO', label: 'MoMo' },
        { type: 'wallet', code: 'ZALOPAY', label: 'ZaloPay' },
        { type: 'gateway', code: 'PAYOO', label: 'Payoo' },
        { type: 'gateway', code: 'VNPAY', label: 'VNPay' },
        { type: 'bank', code: 'VCB', label: 'Vietcombank' },
        { type: 'bank', code: 'TCB', label: 'Techcombank' }
    ];

    function clearPaymentTimers() {
        if (paymentPollingTimer) {
            clearInterval(paymentPollingTimer);
            paymentPollingTimer = null;
        }
        if (paymentCountdownTimer) {
            clearInterval(paymentCountdownTimer);
            paymentCountdownTimer = null;
        }
    }

    function notify(message, type) {
        if (window.authManager?.showNotification) {
            window.authManager.showNotification(message, type || 'success');
        }
    }

    function escapeHtml(value = '') {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeStatus(value = '') {
        return String(value || '').trim().toLowerCase();
    }

    function getBuyerPayload(response) {
        return response?.data?.user || response?.data || {};
    }

    function syncBuyerProfile(user = {}, nextAccounts = []) {
        user.linkedPaymentAccounts = nextAccounts;
        try {
            const raw = localStorage.getItem('user');
            if (!raw) return;
            const currentUser = JSON.parse(raw);
            currentUser.linkedPaymentAccounts = nextAccounts;
            localStorage.setItem('user', JSON.stringify(currentUser));
        } catch (error) {
            console.warn('Không thể đồng bộ tài khoản thanh toán trong localStorage:', error);
        }
    }

    function setInlineMessage(element, message = '', type = '') {
        if (!element) return;
        element.textContent = message;
        element.className = `editorial-inline-message ${type}`.trim();
    }

    function getSelectedValue(form, name, fallback = '') {
        return form.querySelector(`[name="${name}"]:checked`)?.value || fallback;
    }

    function formatShortDateTime(value) {
        if (!value) return 'Chưa có';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Chưa có';
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getFallbackShippingFee(baseSubtotal, shippingMethod) {
        return shippingMethod === 'express'
            ? (baseSubtotal >= 75 ? 8.5 : 12.5)
            : (baseSubtotal >= 35 ? 0 : 5);
    }

    function maskLinkedIdentifier(identifier = '') {
        const cleaned = String(identifier || '').trim();
        if (!cleaned) return '';
        if (cleaned.includes('@')) {
            const [name, domain] = cleaned.split('@');
            const head = name.slice(0, 2);
            const tail = name.slice(-1);
            return `${head}${'*'.repeat(Math.max(name.length - 3, 2))}${tail}@${domain}`;
        }
        const digits = cleaned.replace(/\s+/g, '');
        if (digits.length <= 4) return digits;
        return `${'*'.repeat(Math.max(digits.length - 4, 4))}${digits.slice(-4)}`;
    }

    function normalizeLinkedAccounts(accounts = []) {
        return (Array.isArray(accounts) ? accounts : []).map((account) => ({
            _id: account?._id || `${account?.providerCode || 'LINK'}-${account?.accountIdentifier || Date.now()}`,
            providerType: account?.providerType || 'gateway',
            providerCode: account?.providerCode || '',
            providerName: account?.providerName || account?.providerCode || 'Tài khoản liên kết',
            accountName: account?.accountName || '',
            accountIdentifier: account?.accountIdentifier || '',
            accountMask: account?.accountMask || maskLinkedIdentifier(account?.accountIdentifier || ''),
            isDefault: !!account?.isDefault,
            savedAt: account?.savedAt || new Date().toISOString()
        }));
    }

    function persistSelectedLinkedAccount(account) {
        if (!account) return;
        sessionStorage.setItem('activeLinkedPaymentAccount', JSON.stringify(account));
    }

    function readSelectedLinkedAccount() {
        try {
            const raw = sessionStorage.getItem('activeLinkedPaymentAccount');
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    }

    function normalizeCheckoutItems(items = []) {
        return (Array.isArray(items) ? items : [])
            .map((item) => ({
                product: item?.product || null,
                quantity: Math.max(Number(item?.quantity || 1), 1)
            }))
            .filter((item) => item.product?._id);
    }

    function readBuyNowCheckoutItems() {
        try {
            const raw = sessionStorage.getItem('buyNowCheckoutItems');
            return raw ? normalizeCheckoutItems(JSON.parse(raw)) : [];
        } catch (error) {
            return [];
        }
    }

    function clearBuyNowCheckoutItems() {
        sessionStorage.removeItem('buyNowCheckoutItems');
    }

    function buildLinkedAccountRecord(form) {
        const providerCode = form.linkedProviderCode.value.trim();
        const providerType = form.linkedProviderType.value.trim() || 'gateway';
        const providerName = LINKED_PROVIDER_OPTIONS.find((item) => item.code === providerCode)?.label || providerCode;
        const accountName = form.linkedAccountName.value.trim();
        const accountIdentifier = form.linkedAccountIdentifier.value.trim();

        return {
            _id: `linked-${Date.now()}`,
            providerType,
            providerCode,
            providerName,
            accountName,
            accountIdentifier,
            accountMask: maskLinkedIdentifier(accountIdentifier),
            isDefault: !!form.linkedAccountDefault?.checked,
            savedAt: new Date().toISOString()
        };
    }

    function buildBankAccountRecord(form) {
        const providerCode = form.bankProviderCode?.value?.trim() || 'VCB';
        const providerName = BANK_OPTIONS.find((item) => item.code === providerCode)?.label || providerCode;
        const accountName = form.bankAccountName?.value?.trim() || '';
        const accountIdentifier = form.bankAccountIdentifier?.value?.trim() || '';

        return {
            _id: `bank-${Date.now()}`,
            providerType: 'bank',
            providerCode,
            providerName,
            accountName,
            accountIdentifier,
            accountMask: maskLinkedIdentifier(accountIdentifier),
            isDefault: !!form.bankAccountDefault?.checked,
            savedAt: new Date().toISOString()
        };
    }

    function renderPaymentOptionCards(selectedMethod = 'cod') {
        return `
            <div class="checkout-payment-list">
                <label class="checkout-payment-option ${selectedMethod === 'cod' ? 'checkout-payment-option-active' : ''}">
                    <input type="radio" name="paymentMethod" value="cod" ${selectedMethod === 'cod' ? 'checked' : ''}>
                    <div>
                        <strong>Thanh toán khi nhận hàng</strong>
                        <span>Thanh toán trực tiếp khi đơn hàng được giao đến bạn.</span>
                    </div>
                </label>
                <label class="checkout-payment-option ${selectedMethod === 'online' ? 'checkout-payment-option-active' : ''}">
                    <input type="radio" name="paymentMethod" value="online" ${selectedMethod === 'online' ? 'checked' : ''}>
                    <div>
                        <strong>Thanh toán online</strong>
                        <span>Tạo giao dịch riêng cho đơn hàng và xác thực trên cổng thanh toán an toàn.</span>
                    </div>
                </label>
            </div>
        `;
    }

    function renderPaymentChannels(selectedChannel = 'qr', visible = false) {
        return `
            <div id="onlineChannelPanel" class="checkout-online-panel ${visible ? '' : 'is-hidden'}">
                <div class="checkout-panel-heading compact">
                    <div>
                        <h4>Chọn hình thức thanh toán online</h4>
                        <p>Chọn kênh thanh toán trước khi tạo giao dịch.</p>
                    </div>
                </div>
                <div class="checkout-choice-grid">
                    <label class="checkout-choice-card ${selectedChannel === 'qr' ? 'checkout-choice-card-active' : ''}">
                        <input type="radio" name="paymentChannel" value="qr" ${selectedChannel === 'qr' ? 'checked' : ''}>
                        <strong>Thanh toán bằng QR</strong>
                        <span>Quét mã bằng ứng dụng ngân hàng hoặc ví điện tử để thanh toán.</span>
                        <em>Hiển thị số tiền, nội dung chuyển khoản và thời gian hiệu lực giao dịch.</em>
                    </label>
                    <label class="checkout-choice-card ${selectedChannel === 'internet_banking' ? 'checkout-choice-card-active' : ''}">
                        <input type="radio" name="paymentChannel" value="internet_banking" ${selectedChannel === 'internet_banking' ? 'checked' : ''}>
                        <strong>Ngân hàng / Internet Banking</strong>
                        <span>Chuyển sang giao diện thanh toán an toàn để xác thực giao dịch.</span>
                        <em>Hỗ trợ chọn ngân hàng và kiểm tra lại trạng thái thanh toán.</em>
                    </label>
                    <label class="checkout-choice-card ${selectedChannel === 'linked_gateway' ? 'checkout-choice-card-active' : ''}">
                        <input type="radio" name="paymentChannel" value="linked_gateway" ${selectedChannel === 'linked_gateway' ? 'checked' : ''}>
                        <strong>Tài khoản liên kết / Cổng thanh toán</strong>
                        <span>Dùng ví hoặc tài khoản đã liên kết để hoàn tất giao dịch nhanh hơn.</span>
                        <em>Có thể lưu lại để dùng cho các lần thanh toán tiếp theo.</em>
                    </label>
                </div>
            </div>
        `;
    }

    function renderInternetBankingSection(accounts = [], selectedCode = 'VCB') {
        const bankAccounts = normalizeLinkedAccounts(accounts).filter((account) => account.providerType === 'bank');
        const rememberedBankAccount = readSelectedLinkedAccount();
        const selectedSaved = bankAccounts.find((account) => (
            rememberedBankAccount
            && rememberedBankAccount.providerType === 'bank'
            && String(account._id) === String(rememberedBankAccount._id)
        ))?._id || bankAccounts.find((account) => account.isDefault)?._id || bankAccounts[0]?._id || '';

        return `
            <div id="internetBankingSection" class="checkout-extra-panel is-hidden">
                <div class="checkout-panel-heading compact">
                    <div>
                        <h4>Ngân hàng liên kết</h4>
                        <p>Chọn ngân hàng đã lưu hoặc liên kết tài khoản ngân hàng mới để thanh toán nhanh hơn ở những lần sau.</p>
                    </div>
                </div>
                ${bankAccounts.length ? `
                    <label class="checkout-linked-toggle">
                        <input type="radio" name="bankAccountMode" value="saved" checked>
                        <span>Dùng tài khoản ngân hàng đã liên kết</span>
                    </label>
                    <div class="checkout-linked-list" id="savedBankAccounts">
                        ${bankAccounts.map((account) => `
                            <label class="checkout-linked-card ${account._id === selectedSaved ? 'is-active' : ''}">
                                <input type="radio" name="savedBankAccountId" value="${escapeHtml(account._id)}" ${account._id === selectedSaved ? 'checked' : ''}>
                                <div>
                                    <strong>${escapeHtml(account.providerName)}</strong>
                                    <span>${escapeHtml(account.accountName || 'Tài khoản ngân hàng đã liên kết')}</span>
                                    <em>${escapeHtml(account.accountMask || account.accountIdentifier || '')}</em>
                                </div>
                                ${account.isDefault ? '<span class="buyer-pill buyer-pill-primary">Mặc định</span>' : ''}
                            </label>
                        `).join('')}
                    </div>
                ` : '<div class="checkout-linked-empty">Bạn chưa lưu tài khoản ngân hàng nào.</div>'}
                <label class="checkout-linked-toggle">
                    <input type="radio" name="bankAccountMode" value="new" ${bankAccounts.length ? '' : 'checked'}>
                    <span>Liên kết tài khoản ngân hàng mới</span>
                </label>
                <div id="bankAccountFormPanel" class="checkout-linked-form ${bankAccounts.length ? 'is-hidden' : ''}">
                    <div class="checkout-field-grid two-up">
                        <label class="checkout-field">
                            <span>Ngân hàng liên kết</span>
                            <select name="bankProviderCode" id="checkoutBankCode">
                                ${BANK_OPTIONS.map((item) => `<option value="${item.code}" ${item.code === selectedCode ? 'selected' : ''}>${item.label}</option>`).join('')}
                            </select>
                        </label>
                        <label class="checkout-field">
                            <span>Tên chủ tài khoản</span>
                            <input name="bankAccountName" type="text" placeholder="Ví dụ: Nguyễn Minh Anh">
                        </label>
                        <label class="checkout-field checkout-field-full">
                            <span>Số tài khoản ngân hàng</span>
                            <input name="bankAccountIdentifier" type="text" placeholder="Nhập số tài khoản hoặc số điện thoại liên kết">
                        </label>
                    </div>
                    <label class="checkout-linked-toggle">
                        <input name="saveBankAccount" type="checkbox" checked>
                        <span>Lưu tài khoản ngân hàng này cho những lần thanh toán sau</span>
                    </label>
                    <label class="checkout-linked-toggle">
                        <input name="bankAccountDefault" type="checkbox" ${bankAccounts.length ? '' : 'checked'}>
                        <span>Đặt làm tài khoản ngân hàng mặc định</span>
                    </label>
                </div>
            </div>
        `;
    }

    function renderLinkedAccountSection(accounts = []) {
        const linkedAccounts = normalizeLinkedAccounts(accounts).filter((account) => account.providerType !== 'bank');
        const rememberedAccount = readSelectedLinkedAccount();
        const selectedSaved = linkedAccounts.find((item) => (
            rememberedAccount
            && rememberedAccount.providerType !== 'bank'
            && String(item._id) === String(rememberedAccount._id)
        ))?._id || linkedAccounts.find((item) => item.isDefault)?._id || linkedAccounts[0]?._id || '';

        return `
            <div id="linkedAccountSection" class="checkout-extra-panel is-hidden">
                <div class="checkout-panel-heading compact">
                    <div>
                        <h4>Tài khoản liên kết</h4>
                        <p>Chọn tài khoản đã lưu hoặc liên kết tài khoản mới để sử dụng ở lần thanh toán này.</p>
                    </div>
                </div>
                ${linkedAccounts.length ? `
                    <label class="checkout-linked-toggle">
                        <input type="radio" name="linkedAccountMode" value="saved" checked>
                        <span>Dùng tài khoản liên kết đã lưu</span>
                    </label>
                    <div class="checkout-linked-list" id="savedLinkedAccounts">
                        ${linkedAccounts.map((account) => `
                            <label class="checkout-linked-card ${account._id === selectedSaved ? 'is-active' : ''}">
                                <input type="radio" name="savedLinkedAccountId" value="${escapeHtml(account._id)}" ${account._id === selectedSaved ? 'checked' : ''}>
                                <div>
                                    <strong>${escapeHtml(account.providerName)}</strong>
                                    <span>${escapeHtml(account.accountName || 'Tài khoản đã lưu')}</span>
                                    <em>${escapeHtml(account.accountMask || account.accountIdentifier || '')}</em>
                                </div>
                                ${account.isDefault ? '<span class="buyer-pill buyer-pill-primary">Mặc định</span>' : ''}
                            </label>
                        `).join('')}
                    </div>
                ` : '<div class="checkout-linked-empty">Bạn chưa lưu tài khoản liên kết nào.</div>'}
                <label class="checkout-linked-toggle">
                    <input type="radio" name="linkedAccountMode" value="new" ${linkedAccounts.length ? '' : 'checked'}>
                    <span>Liên kết tài khoản mới</span>
                </label>
                <div id="linkedAccountFormPanel" class="checkout-linked-form ${linkedAccounts.length ? 'is-hidden' : ''}">
                    <div class="checkout-field-grid two-up">
                        <label class="checkout-field">
                            <span>Loại tài khoản</span>
                            <select name="linkedProviderType" id="linkedProviderType">
                                <option value="wallet">Ví điện tử</option>
                                <option value="gateway">Cổng thanh toán</option>
                            </select>
                        </label>
                        <label class="checkout-field">
                            <span>Đơn vị liên kết</span>
                            <select name="linkedProviderCode" id="linkedProviderCode">
                                ${LINKED_PROVIDER_OPTIONS.filter((item) => item.type !== 'bank').map((item) => `<option value="${item.code}" data-type="${item.type}">${item.label}</option>`).join('')}
                            </select>
                        </label>
                        <label class="checkout-field">
                            <span>Tên chủ tài khoản</span>
                            <input name="linkedAccountName" type="text" placeholder="Ví dụ: Nguyễn Minh Anh">
                        </label>
                        <label class="checkout-field">
                            <span>Số điện thoại / email / số tài khoản</span>
                            <input name="linkedAccountIdentifier" type="text" placeholder="090xxxxxxx hoặc ten@email.com">
                        </label>
                    </div>
                    <label class="checkout-linked-toggle">
                        <input name="saveLinkedAccount" type="checkbox" checked>
                        <span>Lưu tài khoản này cho những lần thanh toán sau</span>
                    </label>
                    <label class="checkout-linked-toggle">
                        <input name="linkedAccountDefault" type="checkbox" ${linkedAccounts.length ? '' : 'checked'}>
                        <span>Đặt làm tài khoản mặc định</span>
                    </label>
                </div>
            </div>
        `;
    }

    function buildCheckoutPayload(form, items, appliedCoupon = '') {
        return {
            items: items.map((item) => ({
                product_id: item.product?._id,
                quantity: item.quantity || 1
            })),
            shipping_address: {
                full_name: form.fullName.value.trim(),
                phone: form.phone.value.trim(),
                email: form.email.value.trim(),
                address_line: form.addressLine.value.trim(),
                ward: form.ward.value.trim(),
                district: form.district.value.trim(),
                city: form.city.value.trim()
            },
            shipping_method: getSelectedValue(form, 'shippingMethod', 'standard'),
            payment_method: getSelectedValue(form, 'paymentMethod', 'cod'),
            payment_channel: getSelectedValue(form, 'paymentChannel', 'qr'),
            voucher_code: appliedCoupon || undefined,
            note: form.note.value.trim()
        };
    }

    async function persistLinkedAccountIfNeeded(user, form) {
        const existingAccounts = normalizeLinkedAccounts(user.linkedPaymentAccounts || []);
        const linkedGatewayAccounts = existingAccounts.filter((account) => account.providerType !== 'bank');
        const mode = getSelectedValue(form, 'linkedAccountMode', linkedGatewayAccounts.length ? 'saved' : 'new');

        if (mode === 'saved') {
            const selectedId = getSelectedValue(form, 'savedLinkedAccountId', '');
            const selected = linkedGatewayAccounts.find((item) => String(item._id) === String(selectedId));
            if (!selected) {
                throw new Error('Vui lòng chọn tài khoản liên kết để tiếp tục.');
            }
            persistSelectedLinkedAccount(selected);
            return { account: selected, accounts: existingAccounts };
        }

        const draft = buildLinkedAccountRecord(form);
        if (!draft.providerCode || !draft.accountName || !draft.accountIdentifier) {
            throw new Error('Vui lòng nhập đầy đủ thông tin tài khoản liên kết.');
        }

        const shouldSave = !!form.saveLinkedAccount?.checked;
        let nextAccounts = existingAccounts.slice();

        if (shouldSave) {
            const duplicateIndex = nextAccounts.findIndex((item) => item.providerCode === draft.providerCode && item.accountIdentifier === draft.accountIdentifier);

            if (draft.isDefault || !linkedGatewayAccounts.length) {
                nextAccounts = nextAccounts.map((item) => (
                    item.providerType !== 'bank'
                        ? { ...item, isDefault: false }
                        : item
                ));
                draft.isDefault = true;
            }

            if (duplicateIndex >= 0) {
                nextAccounts[duplicateIndex] = { ...nextAccounts[duplicateIndex], ...draft };
                draft._id = nextAccounts[duplicateIndex]._id;
            } else {
                nextAccounts.unshift(draft);
            }

            const profileResponse = await api.updateProfile({ linkedPaymentAccounts: nextAccounts });
            const persistedAccounts = normalizeLinkedAccounts(profileResponse?.data?.linkedPaymentAccounts || nextAccounts);
            nextAccounts = persistedAccounts;
            syncBuyerProfile(user, persistedAccounts);

            const persistedDraft = nextAccounts.find((item) => (
                item.providerType !== 'bank'
                && item.providerCode === draft.providerCode
                && item.accountIdentifier === draft.accountIdentifier
            ));
            if (persistedDraft) {
                persistSelectedLinkedAccount(persistedDraft);
                return { account: persistedDraft, accounts: nextAccounts };
            }
        }

        persistSelectedLinkedAccount(draft);
        return { account: draft, accounts: nextAccounts };
    }

    async function persistBankLinkedAccountIfNeeded(user, form) {
        const existingAccounts = normalizeLinkedAccounts(user.linkedPaymentAccounts || []);
        const bankAccounts = existingAccounts.filter((account) => account.providerType === 'bank');
        const mode = getSelectedValue(form, 'bankAccountMode', bankAccounts.length ? 'saved' : 'new');

        if (mode === 'saved') {
            const selectedId = getSelectedValue(form, 'savedBankAccountId', '');
            const selected = bankAccounts.find((account) => String(account._id) === String(selectedId));
            if (!selected) {
                throw new Error('Vui lòng chọn tài khoản ngân hàng để tiếp tục.');
            }
            persistSelectedLinkedAccount(selected);
            return { account: selected, accounts: existingAccounts };
        }

        const draft = buildBankAccountRecord(form);
        if (!draft.providerCode || !draft.accountName || !draft.accountIdentifier) {
            throw new Error('Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng.');
        }

        const shouldSave = !!form.saveBankAccount?.checked;
        let nextAccounts = existingAccounts.slice();

        if (shouldSave) {
            const duplicateIndex = nextAccounts.findIndex((account) => (
                account.providerType === 'bank'
                && account.providerCode === draft.providerCode
                && account.accountIdentifier === draft.accountIdentifier
            ));

            if (draft.isDefault || !bankAccounts.length) {
                nextAccounts = nextAccounts.map((account) => (
                    account.providerType === 'bank'
                        ? { ...account, isDefault: false }
                        : account
                ));
                draft.isDefault = true;
            }

            if (duplicateIndex >= 0) {
                nextAccounts[duplicateIndex] = { ...nextAccounts[duplicateIndex], ...draft };
                draft._id = nextAccounts[duplicateIndex]._id;
            } else {
                nextAccounts.unshift(draft);
            }

            const profileResponse = await api.updateProfile({ linkedPaymentAccounts: nextAccounts });
            const persistedAccounts = normalizeLinkedAccounts(profileResponse?.data?.linkedPaymentAccounts || nextAccounts);
            nextAccounts = persistedAccounts;
            syncBuyerProfile(user, persistedAccounts);

            const persistedDraft = nextAccounts.find((account) => (
                account.providerType === 'bank'
                && account.providerCode === draft.providerCode
                && account.accountIdentifier === draft.accountIdentifier
            ));
            if (persistedDraft) {
                persistSelectedLinkedAccount(persistedDraft);
                return { account: persistedDraft, accounts: nextAccounts };
            }
        }

        persistSelectedLinkedAccount(draft);
        return { account: draft, accounts: nextAccounts };
    }

    function buildPaymentStatusSummary(payment) {
        const paymentStatus = normalizeStatus(payment.payment_status);
        const resultClass = paymentStatus === 'paid'
            ? 'success'
            : ['failed', 'expired', 'cancelled'].includes(paymentStatus)
                ? 'danger'
                : paymentStatus === 'processing'
                    ? 'info'
                    : 'warning';

        return `
            <div class="payment-status-strip">
                <span class="status-badge ${resultClass}">${escapeHtml(formatReadableStatus(paymentStatus))}</span>
                <span class="status-badge status-badge-neutral">${escapeHtml(formatPaymentChannel(payment.payment_channel))}</span>
                <span class="payment-status-code">Mã giao dịch: ${escapeHtml(payment.transaction_code || '--')}</span>
            </div>
        `;
    }

    async function refreshPaymentView(paymentId, orderId) {
        const [paymentResponse, orderResponse] = await Promise.all([
            api.getPaymentStatus(paymentId),
            orderId ? api.getOrder(orderId).catch(() => ({ data: null })) : Promise.resolve({ data: null })
        ]);

        return {
            payment: paymentResponse.data || {},
            order: orderResponse.data || null
        };
    }

    function mountPaymentCountdown(expiredAt, onExpire) {
        const countdownEl = document.getElementById('paymentCountdown');
        if (!countdownEl) return;

        function renderTick() {
            const remaining = new Date(expiredAt).getTime() - Date.now();
            if (remaining <= 0) {
                countdownEl.textContent = '00:00';
                clearInterval(paymentCountdownTimer);
                paymentCountdownTimer = null;
                if (typeof onExpire === 'function') onExpire();
                return;
            }

            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            countdownEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        renderTick();
        paymentCountdownTimer = setInterval(renderTick, 1000);
    }

    async function routeFromPaymentStatus(payment, orderId) {
        const status = normalizeStatus(payment.payment_status);
        if (status === 'paid') {
            window.location.hash = `payment-result?result=success&paymentId=${payment._id}&orderId=${orderId || payment.order_id}`;
            return true;
        }
        if (['failed', 'expired', 'cancelled'].includes(status)) {
            window.location.hash = `payment-result?result=failed&paymentId=${payment._id}&orderId=${orderId || payment.order_id}`;
            return true;
        }
        return false;
    }

    async function renderCheckoutViewReal() {
        clearPaymentTimers();
        if (typeof requireBuyerView === 'function' && !requireBuyerView()) return;

        const buyNowItems = readBuyNowCheckoutItems();
        const [cartRes, profileRes] = await Promise.all([
            buyNowItems.length ? Promise.resolve(null) : api.getCart(),
            api.getProfile()
        ]);
        const user = getBuyerPayload(profileRes);
        const items = buyNowItems.length ? buyNowItems : (cartRes?.data?.items || []);
        const addresses = user.addresses || [];
        const linkedAccounts = normalizeLinkedAccounts(user.linkedPaymentAccounts || []);
        const defaultAddress = addresses.find((address) => address.isDefault) || addresses[0] || {};
        const baseSubtotal = items.reduce((sum, item) => sum + ((item.product?.price || 0) * (item.quantity || 1)), 0);

        if (!items.length) {
            setSpaContent('Thanh toán', `
                <div class="account-content checkout-empty-state">
                    <h2>Giỏ hàng của bạn đang trống.</h2>
                    <p>Hãy thêm sản phẩm trước khi tiến hành thanh toán.</p>
                    <a class="btn btn-primary" href="#shop">Đi tới gian hàng</a>
                </div>
            `);
            return;
        }

        setSpaContent('Thanh toán', `
            <div class="editorial-checkout">
                <div class="editorial-checkout-header">
                    <span class="editorial-kicker">Thanh toán an toàn</span>
                    <h2>Hoàn tất đơn hàng</h2>
                    <p>Kiểm tra thông tin đơn hàng, chọn cách giao hàng và phương thức thanh toán phù hợp.</p>
                </div>
                <div class="editorial-checkout-grid">
                    <form id="spaCheckoutForm" class="editorial-checkout-form">
                        <section class="checkout-panel">
                            <div class="checkout-panel-heading">
                                <span class="checkout-step">1</span>
                                <div>
                                    <h3>Thông tin người nhận</h3>
                                    <p>Người sẽ nhận đơn hàng này.</p>
                                </div>
                            </div>
                            <div class="checkout-field-grid two-up">
                                <label class="checkout-field checkout-field-full">
                                    <span>Họ và tên</span>
                                    <input name="fullName" value="${escapeHtml(defaultAddress.fullName || user.name || '')}" placeholder="Ví dụ: Nguyễn Minh Anh" required>
                                </label>
                                <label class="checkout-field">
                                    <span>Số điện thoại</span>
                                    <input name="phone" value="${escapeHtml(defaultAddress.phone || user.phone || '')}" placeholder="09xx xxx xxx" required>
                                </label>
                                <label class="checkout-field">
                                    <span>Email</span>
                                    <input name="email" type="email" value="${escapeHtml(user.email || '')}" placeholder="care@petshop.vn" required>
                                </label>
                            </div>
                        </section>

                        <section class="checkout-panel checkout-panel-tonal">
                            <div class="checkout-panel-heading">
                                <span class="checkout-step">2</span>
                                <div>
                                    <h3>Địa chỉ nhận hàng</h3>
                                    <p>Chọn địa chỉ đã lưu hoặc nhập địa chỉ mới.</p>
                                </div>
                            </div>
                            ${addresses.length ? `
                                <label class="checkout-field">
                                    <span>Địa chỉ đã lưu</span>
                                    <select id="savedAddress">
                                        <option value="">Dùng địa chỉ mới</option>
                                        ${addresses.map((address, index) => `
                                            <option value="${index}" ${address.isDefault ? 'selected' : ''}>
                                                ${escapeHtml(address.fullName || user.name || 'Người nhận')} - ${escapeHtml(address.street || address.addressLine || '')}, ${escapeHtml(address.city || '')}
                                            </option>
                                        `).join('')}
                                    </select>
                                </label>
                            ` : ''}
                            <div class="checkout-field-grid three-up">
                                <label class="checkout-field">
                                    <span>Tỉnh / Thành phố</span>
                                    <input name="city" value="${escapeHtml(defaultAddress.city || '')}" placeholder="TP. Hồ Chí Minh" required>
                                </label>
                                <label class="checkout-field">
                                    <span>Quận / Huyện</span>
                                    <input name="district" value="${escapeHtml(defaultAddress.district || '')}" placeholder="Quận 1">
                                </label>
                                <label class="checkout-field">
                                    <span>Phường / Xã</span>
                                    <input name="ward" value="${escapeHtml(defaultAddress.ward || '')}" placeholder="Bến Nghé">
                                </label>
                                <label class="checkout-field checkout-field-full">
                                    <span>Số nhà và tên đường</span>
                                    <input name="addressLine" value="${escapeHtml(defaultAddress.street || defaultAddress.addressLine || '')}" placeholder="123 Nguyễn Huệ, P. Bến Nghé" required>
                                </label>
                            </div>
                        </section>

                        <section class="checkout-panel">
                            <div class="checkout-panel-heading">
                                <span class="checkout-step">3</span>
                                <div>
                                    <h3>Phương thức vận chuyển</h3>
                                    <p>Chọn tốc độ giao hàng phù hợp với bạn.</p>
                                </div>
                            </div>
                            <div class="checkout-choice-grid">
                                <label class="checkout-choice-card checkout-choice-card-active">
                                    <input type="radio" name="shippingMethod" value="standard" checked>
                                    <strong>Giao hàng tiêu chuẩn</strong>
                                    <span>Giao trong 3-5 ngày làm việc</span>
                                    <em>Miễn phí từ 900.000 ₫, thấp hơn tính 125.000 ₫</em>
                                </label>
                                <label class="checkout-choice-card">
                                    <input type="radio" name="shippingMethod" value="express">
                                    <strong>Giao hàng nhanh</strong>
                                    <span>Giao trong 24-48 giờ</span>
                                    <em>312.500 ₫ hoặc 212.500 ₫ với đơn giá trị cao</em>
                                </label>
                            </div>
                        </section>

                        <section class="checkout-panel">
                            <div class="checkout-panel-heading">
                                <span class="checkout-step">4</span>
                                <div>
                                    <h3>Phương thức thanh toán</h3>
                                    <p>Chọn hình thức thanh toán phù hợp cho đơn hàng này.</p>
                                </div>
                            </div>
                            ${renderPaymentOptionCards('cod')}
                            ${renderPaymentChannels('qr', false)}
                            ${renderInternetBankingSection(linkedAccounts, 'VCB')}
                            ${renderLinkedAccountSection(linkedAccounts)}
                            <p id="paymentMethodHint" class="editorial-inline-note">Bạn có thể thanh toán khi nhận hàng hoặc chuyển sang bước thanh toán online ngay sau khi tạo đơn.</p>
                        </section>

                        <section class="checkout-panel">
                            <div class="checkout-panel-heading">
                                <span class="checkout-step">5</span>
                                <div>
                                    <h3>Ghi chú đơn hàng</h3>
                                    <p>Thêm ghi chú giao hàng cho người bán nếu cần.</p>
                                </div>
                            </div>
                            <label class="checkout-field">
                                <span>Ghi chú</span>
                                <textarea name="note" placeholder="Ví dụ: giao giờ hành chính, gọi trước khi giao, đóng gói cẩn thận."></textarea>
                            </label>
                        </section>
                    </form>

                    <aside class="editorial-summary">
                        <div class="editorial-summary-card">
                            <h3>Tóm tắt đơn hàng</h3>
                            <div class="editorial-summary-items">
                                ${items.map((item) => `
                                    <div class="editorial-summary-item">
                                        <div class="editorial-summary-thumb">
                                            <img src="${productImage(item.product)}" alt="${escapeHtml(item.product?.name || 'Sản phẩm')}">
                                        </div>
                                        <div class="editorial-summary-meta">
                                            <strong>${escapeHtml(item.product?.name || 'Sản phẩm')}</strong>
                                            <span>Số lượng: ${item.quantity || 1}</span>
                                        </div>
                                        <div class="editorial-summary-price">${formatCurrency((item.product?.price || 0) * (item.quantity || 1))}</div>
                                    </div>
                                `).join('')}
                            </div>

                            <div class="editorial-coupon-box">
                                <label class="checkout-field">
                                    <span>Mã giảm giá</span>
                                    <div class="editorial-coupon-row">
                                        <input id="couponCode" placeholder="PET10">
                                        <button class="btn btn-secondary" id="applyCoupon" type="button">Áp dụng</button>
                                        <button class="btn btn-secondary" id="clearCoupon" type="button">Xóa</button>
                                    </div>
                                </label>
                                <p id="couponMessage" class="editorial-inline-message"></p>
                            </div>

                            <div class="editorial-totals">
                                <div><span>Tạm tính</span><strong id="checkoutSubtotal">${formatCurrency(baseSubtotal)}</strong></div>
                                <div><span>Phí vận chuyển</span><strong id="checkoutShipping">${formatCurrency(0)}</strong></div>
                                <div><span>Giảm giá</span><strong id="checkoutDiscount">-${formatCurrency(0)}</strong></div>
                                <div class="editorial-total-row"><span>Tổng thanh toán</span><strong id="checkoutTotal">${formatCurrency(baseSubtotal)}</strong></div>
                            </div>

                            <div id="checkoutMessage" class="editorial-inline-message"></div>
                            <button class="editorial-place-order" id="placeOrderBtn" type="submit" form="spaCheckoutForm">Tiếp tục thanh toán</button>
                            <p class="editorial-security-note">Thanh toán được mã hóa an toàn. Sàn giữ tiền cho đến khi hoàn tất đơn hàng.</p>
                        </div>
                    </aside>
                </div>
            </div>
        `);

        const form = document.getElementById('spaCheckoutForm');
        const couponInput = document.getElementById('couponCode');
        const couponMessage = document.getElementById('couponMessage');
        const checkoutMessage = document.getElementById('checkoutMessage');
        const paymentMethodHint = document.getElementById('paymentMethodHint');
        const placeOrderButton = document.getElementById('placeOrderBtn');
        const onlineChannelPanel = document.getElementById('onlineChannelPanel');
        const internetBankingSection = document.getElementById('internetBankingSection');
        const linkedAccountSection = document.getElementById('linkedAccountSection');
        const bankAccountFormPanel = document.getElementById('bankAccountFormPanel');
        const linkedAccountFormPanel = document.getElementById('linkedAccountFormPanel');
        let appliedCoupon = '';
        let quoteTimer = null;

        function fillAddress(address = {}) {
            form.fullName.value = address.fullName || user.name || '';
            form.phone.value = address.phone || user.phone || '';
            form.addressLine.value = address.street || address.addressLine || '';
            form.ward.value = address.ward || '';
            form.district.value = address.district || '';
            form.city.value = address.city || '';
        }

        function syncLinkedAccountCards() {
            document.querySelectorAll('#savedLinkedAccounts .checkout-linked-card').forEach((card) => {
                const savedInput = card.querySelector('input[name="savedLinkedAccountId"]');
                const modeInput = form.querySelector('input[name="linkedAccountMode"][value="saved"]');
                const isChecked = !!savedInput?.checked;
                card.classList.toggle('is-active', isChecked && modeInput?.checked);
            });
        }

        function syncBankAccountCards() {
            document.querySelectorAll('#savedBankAccounts .checkout-linked-card').forEach((card) => {
                const savedInput = card.querySelector('input[name="savedBankAccountId"]');
                const modeInput = form.querySelector('input[name="bankAccountMode"][value="saved"]');
                const isChecked = !!savedInput?.checked;
                card.classList.toggle('is-active', isChecked && modeInput?.checked);
            });
        }

        function forceSavedAccountMode(groupName, value) {
            const savedModeInput = form.querySelector(`input[name="${groupName}Mode"][value="saved"]`);
            if (savedModeInput) {
                savedModeInput.checked = true;
            }

            const fieldName = groupName === 'bankAccount' ? 'savedBankAccountId' : 'savedLinkedAccountId';
            const accountInput = Array.from(form.querySelectorAll(`input[name="${fieldName}"]`))
                .find((input) => input.value === value);
            if (accountInput) {
                accountInput.checked = true;
            }
        }

        function togglePaymentPanels() {
            document.querySelectorAll('.checkout-choice-card').forEach((card) => {
                card.classList.toggle('checkout-choice-card-active', !!card.querySelector('input')?.checked);
            });
            document.querySelectorAll('.checkout-payment-option').forEach((card) => {
                card.classList.toggle('checkout-payment-option-active', !!card.querySelector('input')?.checked);
            });

            const paymentMethod = getSelectedValue(form, 'paymentMethod', 'cod');
            const channel = getSelectedValue(form, 'paymentChannel', 'qr');
            const bankAccounts = linkedAccounts.filter((account) => account.providerType === 'bank');
            const linkedGatewayAccounts = linkedAccounts.filter((account) => account.providerType !== 'bank');
            const bankMode = getSelectedValue(form, 'bankAccountMode', bankAccounts.length ? 'saved' : 'new');
            const linkedMode = getSelectedValue(form, 'linkedAccountMode', linkedGatewayAccounts.length ? 'saved' : 'new');

            onlineChannelPanel?.classList.toggle('is-hidden', paymentMethod !== 'online');
            internetBankingSection?.classList.toggle('is-hidden', !(paymentMethod === 'online' && channel === 'internet_banking'));
            linkedAccountSection?.classList.toggle('is-hidden', !(paymentMethod === 'online' && channel === 'linked_gateway'));
            bankAccountFormPanel?.classList.toggle('is-hidden', bankMode !== 'new');
            linkedAccountFormPanel?.classList.toggle('is-hidden', linkedMode !== 'new');
            syncBankAccountCards();
            syncLinkedAccountCards();

            if (paymentMethod === 'online') {
                paymentMethodHint.textContent = `Bạn sẽ chuyển sang bước thanh toán online với kênh: ${formatPaymentChannel(channel)}.`;
                placeOrderButton.textContent = 'Tạo giao dịch thanh toán';
            } else {
                paymentMethodHint.textContent = 'Đơn hàng sẽ được tạo ngay sau khi bạn xác nhận thông tin.';
                placeOrderButton.textContent = 'Đặt hàng';
            }
        }

        async function refreshQuote(showCouponError = false) {
            try {
                const response = await api.getOrderQuote(buildCheckoutPayload(form, items, appliedCoupon));
                const quote = response.data || {};
                document.getElementById('checkoutSubtotal').textContent = formatCurrency(Number(quote.subtotal ?? baseSubtotal));
                document.getElementById('checkoutShipping').textContent = formatCurrency(Number(quote.shipping_fee ?? 0));
                document.getElementById('checkoutDiscount').textContent = `-${formatCurrency(Number(quote.discount_amount ?? 0))}`;
                document.getElementById('checkoutTotal').textContent = formatCurrency(Number(quote.total_amount ?? baseSubtotal));
                setInlineMessage(couponMessage, appliedCoupon ? `Đã áp dụng mã ${appliedCoupon} thành công.` : '', appliedCoupon ? 'success' : '');
                setInlineMessage(checkoutMessage, '');
                return quote;
            } catch (error) {
                const shippingFee = getFallbackShippingFee(baseSubtotal, getSelectedValue(form, 'shippingMethod', 'standard'));
                document.getElementById('checkoutSubtotal').textContent = formatCurrency(baseSubtotal);
                document.getElementById('checkoutShipping').textContent = formatCurrency(shippingFee);
                document.getElementById('checkoutDiscount').textContent = `-${formatCurrency(0)}`;
                document.getElementById('checkoutTotal').textContent = formatCurrency(baseSubtotal + shippingFee);
                if (appliedCoupon) {
                    appliedCoupon = '';
                    couponInput.value = '';
                }
                setInlineMessage(couponMessage, showCouponError ? (error.message || 'Mã giảm giá không hợp lệ.') : '', showCouponError ? 'error' : '');
                return null;
            }
        }

        document.getElementById('savedAddress')?.addEventListener('change', (event) => {
            const address = addresses[parseInt(event.target.value, 10)];
            if (address) fillAddress(address);
        });

        form.querySelectorAll('input[name="fullName"], input[name="phone"], input[name="email"], input[name="addressLine"], input[name="ward"], input[name="district"], input[name="city"], textarea[name="note"]').forEach((input) => {
            input.addEventListener('input', () => {
                clearTimeout(quoteTimer);
                quoteTimer = setTimeout(() => refreshQuote(false), 300);
            });
        });

        form.querySelectorAll('input[name="shippingMethod"], input[name="paymentMethod"], input[name="paymentChannel"], input[name="bankAccountMode"], input[name="savedBankAccountId"], input[name="linkedAccountMode"], input[name="savedLinkedAccountId"]').forEach((input) => {
            input.addEventListener('change', () => {
                togglePaymentPanels();
                clearTimeout(quoteTimer);
                quoteTimer = setTimeout(() => refreshQuote(false), 200);
            });
        });

        form.querySelectorAll('input[name="savedBankAccountId"]').forEach((input) => {
            input.addEventListener('change', () => {
                forceSavedAccountMode('bankAccount', input.value);
                togglePaymentPanels();
            });
        });

        form.querySelectorAll('input[name="savedLinkedAccountId"]').forEach((input) => {
            input.addEventListener('change', () => {
                forceSavedAccountMode('linkedAccount', input.value);
                togglePaymentPanels();
            });
        });

        document.getElementById('linkedProviderCode')?.addEventListener('change', (event) => {
            const selected = LINKED_PROVIDER_OPTIONS.find((item) => item.code === event.target.value);
            if (selected && form.linkedProviderType) {
                form.linkedProviderType.value = selected.type;
            }
        });

        document.getElementById('applyCoupon')?.addEventListener('click', async () => {
            appliedCoupon = couponInput.value.trim();
            await refreshQuote(true);
        });

        document.getElementById('clearCoupon')?.addEventListener('click', async () => {
            appliedCoupon = '';
            couponInput.value = '';
            await refreshQuote(false);
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const originalText = placeOrderButton.textContent;
            placeOrderButton.disabled = true;
            placeOrderButton.textContent = 'Đang xử lý...';

            try {
                await refreshQuote(true);
                const payload = buildCheckoutPayload(form, items, appliedCoupon);
                const paymentMethod = getSelectedValue(form, 'paymentMethod', 'cod');

                if (paymentMethod === 'online' && payload.payment_channel === 'linked_gateway') {
                    const { account } = await persistLinkedAccountIfNeeded(user, form);
                    payload.bank_code = account.providerCode;
                }

                if (paymentMethod === 'online' && payload.payment_channel === 'internet_banking') {
                    const { account } = await persistBankLinkedAccountIfNeeded(user, form);
                    payload.bank_code = account.providerCode;
                }

                const response = await api.createOrder(payload);

                const orderId = response.data?.order_id || response.data?._id || response.data?.order?._id;
                if (buyNowItems.length) {
                    clearBuyNowCheckoutItems();
                } else {
                    updateCartCount?.();
                }
                if (!orderId) {
                    throw new Error('Không thể tạo đơn hàng.');
                }

                if (paymentMethod === 'online') {
                    const paymentResponse = await api.createPayment({
                        order_id: orderId,
                        payment_channel: payload.payment_channel,
                        bank_code: payload.bank_code || ''
                    });
                    const paymentId = paymentResponse.data?._id || paymentResponse.data?.payment_id;
                    window.location.hash = `payment?paymentId=${paymentId}&orderId=${orderId}&channel=${payload.payment_channel}`;
                    return;
                }

                notify('Đặt hàng thành công.', 'success');
                window.location.hash = `order?id=${orderId}`;
            } catch (error) {
                setInlineMessage(checkoutMessage, error.message || 'Không thể tạo đơn hàng hoặc giao dịch thanh toán.', 'error');
                notify(error.message || 'Không thể tạo đơn hàng hoặc giao dịch thanh toán.', 'error');
            } finally {
                placeOrderButton.disabled = false;
                placeOrderButton.textContent = originalText;
            }
        });

        togglePaymentPanels();
        await refreshQuote(false);
    }

    async function renderPaymentViewReal(paymentId, orderId, preferredChannel = 'qr') {
        clearPaymentTimers();
        if (typeof requireBuyerView === 'function' && !requireBuyerView()) return;

        if (!paymentId) {
            setSpaContent('Thanh toán online', '<p>Không tìm thấy giao dịch thanh toán.</p>');
            return;
        }

        const { payment, order } = await refreshPaymentView(paymentId, orderId);
        if (await routeFromPaymentStatus(payment, orderId)) return;

        const activeChannel = normalizeStatus(payment.payment_channel || preferredChannel || 'qr');
        const linkedAccount = readSelectedLinkedAccount();
        const selectedBankAccount = linkedAccount?.providerType === 'bank' ? linkedAccount : null;
        const selectedBank = selectedBankAccount?.providerName || BANK_OPTIONS.find((item) => item.code === payment.bank_code)?.label || payment.bank_code || 'Ngân hàng đã chọn';
        const requiresVerification = !!payment.verification_required && activeChannel !== 'qr';
        const confirmationButtonLabel = requiresVerification ? 'Xác nhận mã' : 'Tôi đã hoàn tất thanh toán';

        setSpaContent('Thanh toán online', `
            <div class="payment-shell">
                <section class="payment-grid">
                    <article class="payment-card payment-card-primary">
                        <div class="payment-card-head">
                            <div>
                                <span class="editorial-kicker">Bước xác thực thanh toán</span>
                                <h2>Hoàn tất thanh toán đơn hàng</h2>
                                <p>Thực hiện giao dịch trên kênh thanh toán bạn đã chọn và xác nhận để hệ thống cập nhật trạng thái đơn hàng.</p>
                            </div>
                            <div class="payment-countdown">
                                <span>Hiệu lực giao dịch</span>
                                <strong id="paymentCountdown">--:--</strong>
                            </div>
                        </div>
                        ${buildPaymentStatusSummary(payment)}
                        <div class="payment-channel-tabs">
                            <button type="button" class="btn btn-secondary payment-channel-switch ${activeChannel === 'qr' ? 'is-active' : ''}" data-channel="qr">QR</button>
                            <button type="button" class="btn btn-secondary payment-channel-switch ${activeChannel === 'internet_banking' ? 'is-active' : ''}" data-channel="internet_banking">Ngân hàng / Internet Banking</button>
                            <button type="button" class="btn btn-secondary payment-channel-switch ${activeChannel === 'linked_gateway' ? 'is-active' : ''}" data-channel="linked_gateway">Tài khoản liên kết</button>
                        </div>

                        ${activeChannel === 'qr' ? `
                            <div class="payment-qr-layout">
                                <div class="payment-qr-box">
                                    <img src="${escapeHtml(payment.qr_image_url || '')}" alt="QR thanh toán">
                                </div>
                                <div class="payment-qr-info">
                                    <div class="payment-info-row"><span>Số tiền cần thanh toán</span><strong>${formatCurrency(payment.amount || 0)}</strong></div>
                                    <div class="payment-info-row"><span>Nội dung thanh toán</span><strong id="paymentContentValue">${escapeHtml(payment.payment_content || '')}</strong></div>
                                    <div class="payment-info-row"><span>Mã đơn hàng</span><strong>${escapeHtml(payment.order_number || order?.orderNumber || orderId || '--')}</strong></div>
                                    <div class="payment-info-row"><span>Kênh thanh toán</span><strong>${escapeHtml(formatPaymentChannel(payment.payment_channel))}</strong></div>
                                    <p class="payment-helper-text">Quét mã bằng ứng dụng ngân hàng hoặc ví điện tử để hoàn tất giao dịch.</p>
                                </div>
                            </div>
                        ` : activeChannel === 'internet_banking' ? `
                            <div class="payment-alt-layout">
                                <div class="payment-alt-card">
                                    <h3>${escapeHtml(selectedBank)}</h3>
                                    <p>Tiếp tục xác thực giao dịch với ngân hàng bạn đã chọn. Sau khi ngân hàng xử lý xong, nhập mã xác minh để hoàn tất.</p>
                                    <div class="payment-info-row"><span>Tài khoản sử dụng</span><strong>${escapeHtml(selectedBankAccount?.accountMask || 'Đang chờ xác thực')}</strong></div>
                                    <div class="payment-info-row"><span>Chủ tài khoản</span><strong>${escapeHtml(selectedBankAccount?.accountName || '--')}</strong></div>
                                    <div class="payment-info-row"><span>Số tiền cần thanh toán</span><strong>${formatCurrency(payment.amount || 0)}</strong></div>
                                    <div class="payment-info-row"><span>Nội dung thanh toán</span><strong id="paymentContentValue">${escapeHtml(payment.payment_content || '')}</strong></div>
                                    <div class="payment-info-row"><span>Trạng thái hiện tại</span><strong>${escapeHtml(formatReadableStatus(payment.payment_status || 'pending'))}</strong></div>
                                </div>
                            </div>
                        ` : `
                            <div class="payment-alt-layout">
                                <div class="payment-alt-card">
                                    <h3>${escapeHtml(linkedAccount?.providerName || 'Tài khoản liên kết')}</h3>
                                    <p>Xác thực giao dịch qua tài khoản liên kết của bạn. Sau khi cổng thanh toán xử lý xong, nhập mã xác minh để hoàn tất.</p>
                                    <div class="payment-info-row"><span>Tài khoản sử dụng</span><strong>${escapeHtml(linkedAccount?.accountMask || linkedAccount?.accountIdentifier || 'Đang chờ xác thực')}</strong></div>
                                    <div class="payment-info-row"><span>Chủ tài khoản</span><strong>${escapeHtml(linkedAccount?.accountName || '--')}</strong></div>
                                    <div class="payment-info-row"><span>Số tiền cần thanh toán</span><strong>${formatCurrency(payment.amount || 0)}</strong></div>
                                    <div class="payment-info-row"><span>Nội dung thanh toán</span><strong id="paymentContentValue">${escapeHtml(payment.payment_content || '')}</strong></div>
                                </div>
                            </div>
                        `}

                        ${requiresVerification ? `
                            <div class="checkout-extra-panel" id="paymentVerificationPanel">
                                <div class="checkout-panel-heading compact">
                                    <div>
                                        <h4>Mã xác minh giao dịch</h4>
                                        <p>Nhập mã xác minh được gửi tới ${escapeHtml(payment.verification_email_masked || 'email thanh toán của bạn')} để hoàn tất thanh toán.</p>
                                    </div>
                                </div>
                                <label class="checkout-field">
                                    <span>Mã xác minh</span>
                                    <input id="paymentVerificationCode" type="text" inputmode="numeric" maxlength="6" placeholder="Nhập 6 số xác minh">
                                </label>
                                <div class="payment-info-row"><span>Email nhận mã</span><strong>${escapeHtml(payment.verification_email_masked || 'Đang cập nhật')}</strong></div>
                                <div class="payment-info-row"><span>Gửi lúc</span><strong>${escapeHtml(formatShortDateTime(payment.verification_sent_at))}</strong></div>
                            </div>
                        ` : ''}

                        <div class="payment-actions">
                            <button type="button" class="btn btn-secondary" id="copyPaymentContent">Sao chép nội dung</button>
                            <button type="button" class="btn btn-secondary" id="checkPaymentStatus">Kiểm tra lại thanh toán</button>
                            <button type="button" class="btn btn-primary" id="confirmPaymentAction">${confirmationButtonLabel}</button>
                            <button type="button" class="btn btn-secondary" id="cancelPaymentAction">Hủy giao dịch</button>
                        </div>
                        <div id="paymentMessage" class="editorial-inline-message"></div>
                    </article>

                    <aside class="payment-card">
                        <h3>Thông tin đơn hàng</h3>
                        <div class="payment-info-list">
                            <div class="payment-info-row"><span>Mã đơn hàng</span><strong>${escapeHtml(order?.orderNumber || payment.order_number || '--')}</strong></div>
                            <div class="payment-info-row"><span>Tổng thanh toán</span><strong>${formatCurrency(order?.finalAmount || payment.amount || 0)}</strong></div>
                            <div class="payment-info-row"><span>Trạng thái đơn</span><strong>${escapeHtml(formatReadableStatus(order?.orderStatus || order?.status || 'waiting_payment'))}</strong></div>
                            <div class="payment-info-row"><span>Trạng thái thanh toán</span><strong>${escapeHtml(formatReadableStatus(payment.payment_status))}</strong></div>
                            <div class="payment-info-row"><span>Tạo lúc</span><strong>${escapeHtml(formatShortDateTime(payment.createdAt || order?.createdAt))}</strong></div>
                            <div class="payment-info-row"><span>Hết hạn lúc</span><strong>${escapeHtml(formatShortDateTime(payment.expired_at))}</strong></div>
                        </div>
                        <div class="payment-sidebar-actions">
                            <a class="btn btn-secondary" href="#order?id=${escapeHtml(orderId || payment.order_id)}">Xem đơn hàng</a>
                            <a class="btn btn-secondary" href="#shop">Về trang mua sắm</a>
                        </div>
                    </aside>
                </section>
            </div>
        `);

        const paymentMessage = document.getElementById('paymentMessage');
        const verificationInput = document.getElementById('paymentVerificationCode');

        async function refreshStatusMessage() {
            const latest = await api.getPaymentStatus(paymentId);
            const latestData = latest.data || {};
            setInlineMessage(paymentMessage, `Trạng thái hiện tại: ${formatReadableStatus(latestData.payment_status || 'pending')}.`, 'info');
            return latestData;
        }

        mountPaymentCountdown(payment.expired_at, async () => {
            setInlineMessage(paymentMessage, 'Giao dịch đã hết hạn. Vui lòng tạo lại giao dịch thanh toán.', 'error');
            const latest = await api.getPaymentStatus(paymentId);
            await routeFromPaymentStatus(latest.data || payment, orderId);
        });

        paymentPollingTimer = setInterval(async () => {
            try {
                const latest = await api.getPaymentStatus(paymentId);
                const latestData = latest.data || {};
                if (await routeFromPaymentStatus(latestData, orderId)) {
                    clearPaymentTimers();
                }
            } catch (error) {
                console.error('Payment polling failed', error);
            }
        }, 8000);

        document.querySelectorAll('.payment-channel-switch').forEach((button) => {
            button.addEventListener('click', async () => {
                const channel = button.dataset.channel;
                if (!channel || channel === activeChannel) return;
                setInlineMessage(paymentMessage, 'Đang cập nhật kênh thanh toán...', 'info');
                try {
                    const response = await api.createPayment({
                        order_id: orderId || payment.order_id,
                        payment_channel: channel,
                        bank_code: channel === 'internet_banking'
                            ? (selectedBankAccount?.providerCode || payment.bank_code || 'VCB')
                            : channel === 'linked_gateway'
                                ? (linkedAccount?.providerCode || '')
                                : ''
                    });
                    const nextPaymentId = response.data?._id || response.data?.payment_id || paymentId;
                    window.location.hash = `payment?paymentId=${nextPaymentId}&orderId=${orderId || payment.order_id}&channel=${channel}`;
                } catch (error) {
                    setInlineMessage(paymentMessage, error.message || 'Không thể đổi kênh thanh toán.', 'error');
                }
            });
        });

        document.getElementById('copyPaymentContent')?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(payment.payment_content || '');
                setInlineMessage(paymentMessage, 'Đã sao chép nội dung thanh toán.', 'success');
            } catch (error) {
                setInlineMessage(paymentMessage, 'Không thể sao chép nội dung thanh toán.', 'error');
            }
        });

        document.getElementById('checkPaymentStatus')?.addEventListener('click', async () => {
            try {
                setInlineMessage(paymentMessage, 'Đang kiểm tra lại trạng thái thanh toán...', 'info');
                await api.checkPayment(paymentId);
                const latestData = await refreshStatusMessage();
                await routeFromPaymentStatus(latestData, orderId);
            } catch (error) {
                setInlineMessage(paymentMessage, error.message || 'Không thể kiểm tra lại giao dịch.', 'error');
            }
        });

        document.getElementById('confirmPaymentAction')?.addEventListener('click', async () => {
            try {
                if (requiresVerification) {
                    const verificationCode = verificationInput?.value?.trim() || '';
                    if (!verificationCode) {
                        setInlineMessage(paymentMessage, 'Vui lòng nhập mã xác minh để tiếp tục.', 'error');
                        verificationInput?.focus();
                        return;
                    }

                    setInlineMessage(paymentMessage, 'Đang xác minh mã thanh toán...', 'info');
                    const verified = await api.verifyPayment(paymentId, verificationCode);
                    const verifiedData = verified.data || {};
                    if (!(await routeFromPaymentStatus(verifiedData, orderId))) {
                        setInlineMessage(paymentMessage, `Trạng thái hiện tại: ${formatReadableStatus(verifiedData.payment_status || 'pending')}.`, 'info');
                    }
                    return;
                }

                setInlineMessage(paymentMessage, 'Đang xác nhận giao dịch...', 'info');
                const callback = await api.submitPaymentCallback({
                    payment_id: paymentId,
                    callback_token: payment.callback_token,
                    status: 'paid',
                    source: 'gateway-ui',
                    note: 'Nguoi mua da hoan tat thanh toan'
                });
                await routeFromPaymentStatus(callback.data || payment, orderId);
            } catch (error) {
                setInlineMessage(paymentMessage, error.message || 'Không thể xác nhận thanh toán.', 'error');
            }
        });

        document.getElementById('cancelPaymentAction')?.addEventListener('click', async () => {
            try {
                setInlineMessage(paymentMessage, 'Đang hủy giao dịch...', 'info');
                const callback = await api.submitPaymentCallback({
                    payment_id: paymentId,
                    callback_token: payment.callback_token,
                    status: 'cancelled',
                    source: 'gateway-ui',
                    note: 'Nguoi mua huy giao dich thanh toan'
                });
                await routeFromPaymentStatus(callback.data || payment, orderId);
            } catch (error) {
                setInlineMessage(paymentMessage, error.message || 'Không thể hủy giao dịch.', 'error');
            }
        });
    }

    window.renderCheckoutView = renderCheckoutView = renderCheckoutViewReal;
    window.renderPaymentView = renderPaymentView = renderPaymentViewReal;

    window.renderHashView = renderHashView = async function renderHashViewPaymentUiOverride() {
        clearPaymentTimers();
        const { route, params } = parseHashRoute();
        if (route === 'payment') {
            showSpaView();
            return renderPaymentViewReal(params.get('paymentId'), params.get('orderId'), params.get('channel'));
        }
        if (originalRenderHashView) {
            return originalRenderHashView();
        }
    };
})();

