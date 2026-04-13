(function () {
    if (typeof window === 'undefined' || typeof api === 'undefined') return;

    const originalRenderHashView = typeof renderHashView === 'function' ? renderHashView : null;
    const originalRenderOrdersView = typeof renderOrdersView === 'function' ? renderOrdersView : null;
    let paymentPollingTimer = null;
    let paymentCountdownTimer = null;

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

    function notify(message, type = 'success') {
        if (window.authManager?.showNotification) {
            window.authManager.showNotification(message, type);
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

    function formatDateTime(value) {
        if (!value) return 'Chưa có';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Chưa có';
        return date.toLocaleString('vi-VN');
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

    function normalizeStatus(value = '') {
        return String(value || '').trim().toLowerCase();
    }

    window.formatReadableStatus = formatReadableStatus = function formatReadableStatusOverride(value = '') {
        const normalized = normalizeStatus(value);
        const labelMap = {
            waiting_payment: 'Chờ thanh toán',
            pending: 'Chờ xử lý',
            confirmed: 'Đã xác nhận',
            preparing: 'Đang chuẩn bị',
            shipping: 'Đang giao',
            delivered: 'Đã giao',
            completed: 'Hoàn tất',
            cancelled: 'Đã hủy',
            returned: 'Đã hoàn trả',
            unpaid: 'Chưa thanh toán',
            processing: 'Đang xử lý',
            paid: 'Đã thanh toán',
            failed: 'Thất bại',
            expired: 'Hết hạn',
            refunded: 'Đã hoàn tiền',
            active: 'Đang hoạt động',
            inactive: 'Ngừng hoạt động',
            hidden: 'Đang ẩn',
            visible: 'Đang hiển thị',
            reported: 'Bị báo cáo',
            qr: 'QR',
            internet_banking: 'Ngân hàng / Internet Banking',
            linked_gateway: 'Tài khoản liên kết / Cổng thanh toán'
        };
        return labelMap[normalized] || String(value || '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (letter) => letter.toUpperCase());
    };

    window.formatPaymentMethod = formatPaymentMethod = function formatPaymentMethodOverride(method = '') {
        const normalized = normalizeStatus(method);
        if (normalized === 'cod') return 'Thanh toán khi nhận hàng';
        if (normalized === 'bank_transfer') return 'Chuyển khoản ngân hàng';
        if (normalized === 'online') return 'Thanh toán online';
        if (normalized === 'vnpay') return 'VNPay';
        if (normalized === 'momo') return 'MoMo';
        return formatReadableStatus(normalized || 'cod');
    };

    window.formatPaymentChannel = function formatPaymentChannel(channel = '') {
        const normalized = normalizeStatus(channel);
        if (normalized === 'qr') return 'Thanh toán bằng QR';
        if (normalized === 'internet_banking') return 'Ngân hàng / Internet Banking';
        if (normalized === 'linked_gateway') return 'Tài khoản liên kết / Cổng thanh toán';
        return formatReadableStatus(normalized || 'qr');
    };

    window.getOrderStatusBadge = getOrderStatusBadge = function getOrderStatusBadgeOverride(order = {}) {
        const status = typeof getOrderStatus === 'function' ? getOrderStatus(order) : (order.orderStatus || order.status || 'pending');
        const variantMap = {
            waiting_payment: 'warning',
            pending: 'warning',
            confirmed: 'info',
            paid: 'info',
            preparing: 'info',
            shipping: 'info',
            delivered: 'success',
            completed: 'success',
            cancelled: 'danger',
            returned: 'danger'
        };
        return buildStatusBadge(formatReadableStatus(status), variantMap[status] || 'neutral');
    };

    window.getPaymentStatusBadge = getPaymentStatusBadge = function getPaymentStatusBadgeOverride(order = {}) {
        const status = typeof getPaymentStatus === 'function' ? getPaymentStatus(order) : (order.paymentStatus || order.payment?.status || 'pending');
        const variantMap = {
            unpaid: 'warning',
            pending: 'warning',
            processing: 'info',
            paid: 'success',
            refunded: 'neutral',
            failed: 'danger',
            expired: 'danger',
            cancelled: 'danger'
        };
        return buildStatusBadge(formatReadableStatus(status), variantMap[status] || 'neutral');
    };

    function getSelectedValue(form, name, fallback = '') {
        return form.querySelector(`input[name="${name}"]:checked`)?.value || fallback;
    }

    function getFallbackShippingFee(baseSubtotal, shippingMethod) {
        return shippingMethod === 'express'
            ? (baseSubtotal >= 75 ? 8.5 : 12.5)
            : (baseSubtotal >= 35 ? 0 : 5);
    }

    function renderPaymentOptionCards(selectedMethod = 'cod') {
        return `
            <div class="checkout-payment-list">
                <label class="checkout-payment-option ${selectedMethod === 'cod' ? 'checkout-payment-option-active' : ''}">
                    <input type="radio" name="paymentMethod" value="cod" ${selectedMethod === 'cod' ? 'checked' : ''}>
                    <div>
                        <strong>Thanh toán khi nhận hàng</strong>
                        <span>Người bán thấy đơn đã tạo, thanh toán ở trạng thái chưa thanh toán</span>
                    </div>
                </label>
                <label class="checkout-payment-option ${selectedMethod === 'online' ? 'checkout-payment-option-active' : ''}">
                    <input type="radio" name="paymentMethod" value="online" ${selectedMethod === 'online' ? 'checked' : ''}>
                    <div>
                        <strong>Thanh toán online</strong>
                        <span>Tạo giao dịch riêng cho đơn hàng và sàn xác nhận thanh toán</span>
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
                        <p>Chọn kênh thanh toán trước khi tạo giao dịch</p>
                    </div>
                </div>
                <div class="checkout-choice-grid">
                    <label class="checkout-choice-card ${selectedChannel === 'qr' ? 'checkout-choice-card-active' : ''}">
                        <input type="radio" name="paymentChannel" value="qr" ${selectedChannel === 'qr' ? 'checked' : ''}>
                        <strong>Thanh toán bằng QR</strong>
                        <span>Mã QR demo tượng trưng cho phía ngân hàng</span>
                        <em>Hiển thị số tiền, nội dung chuyển khoản và thời gian hiệu lực</em>
                    </label>
                    <label class="checkout-choice-card ${selectedChannel === 'internet_banking' ? 'checkout-choice-card-active' : ''}">
                        <input type="radio" name="paymentChannel" value="internet_banking" ${selectedChannel === 'internet_banking' ? 'checked' : ''}>
                        <strong>Ngân hàng / Internet Banking</strong>
                        <span>Luồng thanh toán online qua ngân hàng</span>
                        <em>Demo bước xác thực và cập nhật trạng thái thanh toán</em>
                    </label>
                    <label class="checkout-choice-card ${selectedChannel === 'linked_gateway' ? 'checkout-choice-card-active' : ''}">
                        <input type="radio" name="paymentChannel" value="linked_gateway" ${selectedChannel === 'linked_gateway' ? 'checked' : ''}>
                        <strong>Tài khoản liên kết / Cổng thanh toán</strong>
                        <span>Ví, tài khoản liên kết hoặc cổng thanh toán</span>
                        <em>Giữ trải nghiệm thanh toán online như một sàn thương mại thật</em>
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

    function setInlineMessage(element, message = '', type = '') {
        if (!element) return;
        element.textContent = message;
        element.className = `editorial-inline-message ${type}`.trim();
    }

    function renderQuoteSummary(quote, baseSubtotal) {
        const subtotal = Number(quote?.subtotal ?? baseSubtotal);
        const shippingFee = Number(quote?.shipping_fee ?? 0);
        const discountAmount = Number(quote?.discount_amount ?? 0);
        const totalAmount = Number(quote?.total_amount ?? (subtotal + shippingFee - discountAmount));

        document.getElementById('checkoutSubtotal').textContent = formatCurrency(subtotal);
        document.getElementById('checkoutShipping').textContent = formatCurrency(shippingFee);
        document.getElementById('checkoutDiscount').textContent = `-${formatCurrency(discountAmount)}`;
        document.getElementById('checkoutTotal').textContent = formatCurrency(totalAmount);
    }

    async function renderCheckoutViewOverride() {
        clearPaymentTimers();
        if (!requireBuyerView()) return;

        const [cartRes, profileRes] = await Promise.all([api.getCart(), api.getProfile()]);
        const user = profileRes?.data || authManager?.user || {};
        const items = cartRes?.data?.items || [];
        const addresses = user.addresses || [];
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
                                    <span>Số nhà & tên đường</span>
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
                                    <em>Miễn phí từ $35, thấp hơn tính $5.00</em>
                                </label>
                                <label class="checkout-choice-card">
                                    <input type="radio" name="shippingMethod" value="express">
                                    <strong>Giao hàng nhanh</strong>
                                    <span>Giao trong 24-48 giờ</span>
                                    <em>$12.50 hoặc $8.50 với đơn giá trị cao</em>
                                </label>
                            </div>
                        </section>

                        <section class="checkout-panel">
                            <div class="checkout-panel-heading">
                                <span class="checkout-step">4</span>
                                <div>
                                    <h3>Phương thức thanh toán</h3>
                                    <p>Nếu chọn thanh toán online, hệ thống sẽ tạo giao dịch riêng cho đơn hàng.</p>
                                </div>
                            </div>
                            ${renderPaymentOptionCards('cod')}
                            ${renderPaymentChannels('qr', false)}
                            <p id="paymentMethodHint" class="editorial-inline-note">Đơn COD sẽ được tạo ngay và người bán nhìn thấy trạng thái thanh toán là chưa thanh toán.</p>
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

        function toggleChoiceClasses() {
            document.querySelectorAll('.checkout-choice-card').forEach((card) => {
                card.classList.toggle('checkout-choice-card-active', !!card.querySelector('input')?.checked);
            });
            document.querySelectorAll('.checkout-payment-option').forEach((card) => {
                card.classList.toggle('checkout-payment-option-active', !!card.querySelector('input')?.checked);
            });

            const paymentMethod = getSelectedValue(form, 'paymentMethod', 'cod');
            const channel = getSelectedValue(form, 'paymentChannel', 'qr');
            onlineChannelPanel?.classList.toggle('is-hidden', paymentMethod !== 'online');

            if (paymentMethod === 'online') {
                paymentMethodHint.textContent = `Bạn sẽ chuyển sang bước thanh toán online với kênh: ${formatPaymentChannel(channel)}.`;
                placeOrderButton.textContent = 'Tạo giao dịch thanh toán';
            } else {
                paymentMethodHint.textContent = 'Đơn COD sẽ được tạo ngay và người bán nhìn thấy trạng thái thanh toán là chưa thanh toán.';
                placeOrderButton.textContent = 'Đặt hàng';
            }
        }

        async function refreshQuote(showCouponError = false) {
            try {
                const response = await api.getOrderQuote(buildCheckoutPayload(form, items, appliedCoupon));
                renderQuoteSummary(response.data || {}, baseSubtotal);
                if (appliedCoupon) {
                    setInlineMessage(couponMessage, `Đã áp dụng mã ${appliedCoupon} thành công.`, 'success');
                } else {
                    setInlineMessage(couponMessage, '');
                }
                setInlineMessage(checkoutMessage, '');
                return response.data;
            } catch (error) {
                renderQuoteSummary({
                    subtotal: baseSubtotal,
                    shipping_fee: getFallbackShippingFee(baseSubtotal, getSelectedValue(form, 'shippingMethod', 'standard')),
                    discount_amount: 0,
                    total_amount: baseSubtotal + getFallbackShippingFee(baseSubtotal, getSelectedValue(form, 'shippingMethod', 'standard'))
                }, baseSubtotal);
                if (appliedCoupon) {
                    appliedCoupon = '';
                    couponInput.value = '';
                }
                if (showCouponError) {
                    setInlineMessage(couponMessage, error.message || 'Mã giảm giá không hợp lệ.', 'error');
                } else {
                    setInlineMessage(couponMessage, '');
                }
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

        form.querySelectorAll('input[name="shippingMethod"], input[name="paymentMethod"], input[name="paymentChannel"]').forEach((input) => {
            input.addEventListener('change', async () => {
                toggleChoiceClasses();
                await refreshQuote(false);
            });
        });

        document.getElementById('applyCoupon')?.addEventListener('click', async () => {
            const code = couponInput.value.trim().toUpperCase();
            if (!code) {
                setInlineMessage(couponMessage, 'Hãy nhập mã giảm giá trước.', 'error');
                return;
            }
            try {
                await api.validateCoupon(code, buildCheckoutPayload(form, items));
                appliedCoupon = code;
                couponInput.value = code;
                await refreshQuote(true);
            } catch (error) {
                appliedCoupon = '';
                setInlineMessage(couponMessage, error.message || 'Mã giảm giá không hợp lệ.', 'error');
            }
        });

        document.getElementById('clearCoupon')?.addEventListener('click', async () => {
            appliedCoupon = '';
            couponInput.value = '';
            setInlineMessage(couponMessage, '');
            await refreshQuote(false);
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            setInlineMessage(checkoutMessage, '');
            if (!form.reportValidity()) return;

            placeOrderButton.disabled = true;
            placeOrderButton.textContent = 'Đang xử lý...';

            try {
                await refreshQuote(true);
                const orderResponse = await api.createOrder(buildCheckoutPayload(form, items, appliedCoupon));
                const orderId = orderResponse.data?.order_id || orderResponse.data?._id || orderResponse.data?.order?._id;
                const paymentMethod = getSelectedValue(form, 'paymentMethod', 'cod');

                updateCartCount();

                if (!orderId) {
                    throw new Error('Không tạo được đơn hàng.');
                }

                if (paymentMethod === 'online') {
                    const paymentResponse = await api.createPayment({
                        order_id: orderId,
                        payment_channel: getSelectedValue(form, 'paymentChannel', 'qr')
                    });
                    const paymentId = paymentResponse.data?._id || paymentResponse.data?.payment_id;
                    notify('Đơn hàng đã được tạo. Tiếp tục hoàn tất thanh toán online.', 'success');
                    window.location.hash = `payment?paymentId=${paymentId}&orderId=${orderId}`;
                    return;
                }

                notify('Đặt hàng thành công.', 'success');
                window.location.hash = `order?id=${orderId}`;
            } catch (error) {
                setInlineMessage(checkoutMessage, error.message || 'Không thể tạo đơn hàng.', 'error');
            } finally {
                placeOrderButton.disabled = false;
                toggleChoiceClasses();
            }
        });

        toggleChoiceClasses();
        await refreshQuote(false);
    }

    function buildPaymentStatusSummary(payment) {
        const paymentStatus = normalizeStatus(payment.payment_status);
        const resultClass = paymentStatus === 'paid'
            ? 'status-badge-success'
            : ['failed', 'expired', 'cancelled'].includes(paymentStatus)
                ? 'status-badge-danger'
                : 'status-badge-warning';

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
            orderId ? api.getOrder(orderId) : Promise.resolve({ data: null })
        ]);
        return {
            payment: paymentResponse.data || {},
            order: orderResponse.data || null
        };
    }

    function mountPaymentCountdown(expiredAt, onExpired) {
        const countdownEl = document.getElementById('paymentCountdown');
        if (!countdownEl) return;

        function renderTick() {
            const diff = new Date(expiredAt).getTime() - Date.now();
            if (diff <= 0) {
                countdownEl.textContent = 'Đã hết hạn';
                clearPaymentTimers();
                if (typeof onExpired === 'function') onExpired();
                return;
            }

            const totalSeconds = Math.floor(diff / 1000);
            const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
            const seconds = String(totalSeconds % 60).padStart(2, '0');
            countdownEl.textContent = `${minutes}:${seconds}`;
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

    async function renderPaymentViewOverride(paymentId, orderId, preferredChannel = 'qr') {
        clearPaymentTimers();
        if (!requireBuyerView()) return;
        if (!paymentId) {
            setSpaContent('Thanh toán online', '<p>Không tìm thấy giao dịch thanh toán.</p>');
            return;
        }

        const { payment, order } = await refreshPaymentView(paymentId, orderId);
        if (await routeFromPaymentStatus(payment, orderId)) return;

        const activeChannel = normalizeStatus(payment.payment_channel || preferredChannel || 'qr');
        const isQr = activeChannel === 'qr';

        setSpaContent('Thanh toán online', `
            <div class="payment-shell">
                <section class="payment-grid">
                    <article class="payment-card payment-card-primary">
                        <div class="payment-card-head">
                            <div>
                                <span class="editorial-kicker">Giao dịch thanh toán</span>
                                <h2>Hoàn tất thanh toán online</h2>
                                <p>Sau khi thanh toán thành công, người bán sẽ thấy trạng thái thanh toán là <strong>Đã thanh toán</strong> và dòng tiền là <strong>Sàn đang giữ</strong>.</p>
                            </div>
                            <div class="payment-countdown">
                                <span>Hiệu lực còn lại</span>
                                <strong id="paymentCountdown">--:--</strong>
                            </div>
                        </div>
                        ${buildPaymentStatusSummary(payment)}
                        <div class="payment-channel-tabs">
                            <button type="button" class="btn btn-secondary payment-channel-switch ${activeChannel === 'qr' ? 'is-active' : ''}" data-channel="qr">QR</button>
                            <button type="button" class="btn btn-secondary payment-channel-switch ${activeChannel === 'internet_banking' ? 'is-active' : ''}" data-channel="internet_banking">Ngân hàng / Internet Banking</button>
                            <button type="button" class="btn btn-secondary payment-channel-switch ${activeChannel === 'linked_gateway' ? 'is-active' : ''}" data-channel="linked_gateway">Tài khoản liên kết</button>
                        </div>
                        ${isQr ? `
                            <div class="payment-qr-layout">
                                <div class="payment-qr-box">
                                    <img src="${escapeHtml(payment.qr_image_url || '')}" alt="QR thanh toán">
                                </div>
                                <div class="payment-qr-info">
                                    <div class="payment-info-row"><span>Số tiền cần thanh toán</span><strong>${formatCurrency(payment.amount || 0)}</strong></div>
                                    <div class="payment-info-row"><span>Nội dung thanh toán</span><strong id="paymentContentValue">${escapeHtml(payment.payment_content || '')}</strong></div>
                                    <div class="payment-info-row"><span>Mã đơn hàng</span><strong>${escapeHtml(payment.order_number || order?.orderNumber || orderId || '--')}</strong></div>
                                    <div class="payment-info-row"><span>Kênh thanh toán</span><strong>${escapeHtml(formatPaymentChannel(payment.payment_channel))}</strong></div>
                                    <p class="payment-helper-text">Mã QR là bản demo tượng trưng cho phía ngân hàng. Trạng thái thanh toán vẫn được lưu và cập nhật thật trong hệ thống.</p>
                                </div>
                            </div>
                        ` : `
                            <div class="payment-alt-layout">
                                <div class="payment-alt-card">
                                    <h3>${escapeHtml(formatPaymentChannel(payment.payment_channel))}</h3>
                                    <p>Đây là giao diện thanh toán online demo. Sau khi xác nhận, hệ thống sẽ cập nhật thanh toán cho đơn hàng và người bán sẽ nhìn thấy trạng thái mới.</p>
                                    <div class="payment-info-row"><span>Số tiền cần thanh toán</span><strong>${formatCurrency(payment.amount || 0)}</strong></div>
                                    <div class="payment-info-row"><span>Nội dung thanh toán</span><strong id="paymentContentValue">${escapeHtml(payment.payment_content || '')}</strong></div>
                                </div>
                            </div>
                        `}
                        <div class="payment-actions">
                            <button type="button" class="btn btn-secondary" id="copyPaymentContent">Copy nội dung</button>
                            <button type="button" class="btn btn-secondary" id="checkPaymentStatus">Kiểm tra lại thanh toán</button>
                            <button type="button" class="btn btn-primary" id="confirmPaymentDemo">${isQr ? 'Tôi đã thanh toán (demo)' : 'Xác nhận thanh toán demo'}</button>
                            <button type="button" class="btn btn-secondary" id="cancelPaymentTransaction">Hủy giao dịch</button>
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
                            <a class="btn btn-secondary" href="#home">Về trang chủ</a>
                        </div>
                    </aside>
                </section>
            </div>
        `);

        const paymentMessage = document.getElementById('paymentMessage');

        async function reloadPayment() {
            const latest = await api.getPaymentStatus(paymentId);
            const latestData = latest.data || {};
            if (await routeFromPaymentStatus(latestData, orderId)) return;
            setInlineMessage(paymentMessage, `Trạng thái hiện tại: ${formatReadableStatus(latestData.payment_status || 'pending')}.`, 'info');
        }

        mountPaymentCountdown(payment.expired_at, async () => {
            setInlineMessage(paymentMessage, 'Giao dịch đã hết hạn. Vui lòng tạo lại giao dịch thanh toán.', 'error');
            const latest = await api.getPaymentStatus(paymentId);
            await routeFromPaymentStatus(latest.data || payment, orderId);
        });

        paymentPollingTimer = setInterval(async () => {
            try {
                await reloadPayment();
            } catch (error) {
                console.error('Polling payment failed', error);
            }
        }, 5000);

        document.querySelectorAll('.payment-channel-switch').forEach((button) => {
            button.addEventListener('click', async () => {
                const channel = button.dataset.channel;
                try {
                    setInlineMessage(paymentMessage, 'Đang cập nhật kênh thanh toán...', 'info');
                    const response = await api.createPayment({
                        order_id: orderId || payment.order_id,
                        payment_channel: channel
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
                notify('Đã copy nội dung thanh toán.', 'success');
            } catch (error) {
                setInlineMessage(paymentMessage, 'Không thể copy nội dung thanh toán.', 'error');
            }
        });

        document.getElementById('checkPaymentStatus')?.addEventListener('click', async () => {
            try {
                setInlineMessage(paymentMessage, 'Đang kiểm tra lại trạng thái thanh toán...', 'info');
                await api.checkPayment(paymentId);
                await reloadPayment();
            } catch (error) {
                setInlineMessage(paymentMessage, error.message || 'Không thể kiểm tra lại giao dịch.', 'error');
            }
        });

        document.getElementById('confirmPaymentDemo')?.addEventListener('click', async () => {
            try {
                setInlineMessage(paymentMessage, 'Đang xác nhận thanh toán demo...', 'info');
                const callback = await api.submitPaymentCallback({
                    payment_id: paymentId,
                    callback_token: payment.callback_token,
                    status: 'paid',
                    source: 'demo-gateway',
                    note: 'Nguoi dung xac nhan da thanh toan tren giao dien demo'
                });
                await routeFromPaymentStatus(callback.data || payment, orderId);
            } catch (error) {
                setInlineMessage(paymentMessage, error.message || 'Không thể xác nhận thanh toán.', 'error');
            }
        });

        document.getElementById('cancelPaymentTransaction')?.addEventListener('click', async () => {
            try {
                setInlineMessage(paymentMessage, 'Đang hủy giao dịch...', 'info');
                const callback = await api.submitPaymentCallback({
                    payment_id: paymentId,
                    callback_token: payment.callback_token,
                    status: 'cancelled',
                    source: 'demo-gateway',
                    note: 'Nguoi dung huy giao dich tren giao dien demo'
                });
                await routeFromPaymentStatus(callback.data || payment, orderId);
            } catch (error) {
                setInlineMessage(paymentMessage, error.message || 'Không thể hủy giao dịch.', 'error');
            }
        });
    }

    async function renderPaymentResultViewOverride(resultType = 'success', paymentId, orderId) {
        clearPaymentTimers();
        if (!requireBuyerView()) return;

        const [paymentRes, orderRes] = await Promise.all([
            paymentId ? api.getPaymentStatus(paymentId).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
            orderId ? api.getOrder(orderId).catch(() => ({ data: null })) : Promise.resolve({ data: null })
        ]);

        const payment = paymentRes.data || {};
        const order = orderRes.data || {};
        const result = resultType === 'success' ? 'success' : 'failed';
        const title = result === 'success' ? 'Thanh toán thành công' : 'Thanh toán chưa thành công';
        const message = result === 'success'
            ? 'Hệ thống đã xác nhận giao dịch. Đơn hàng đang ở trạng thái chờ người bán xác nhận.'
            : 'Giao dịch chưa hoàn tất. Bạn có thể thử lại hoặc đổi sang phương thức thanh toán khác.';

        setSpaContent(title, `
            <div class="payment-result-shell">
                <article class="payment-result-card ${result}">
                    <div class="payment-result-icon">${result === 'success' ? '✓' : '!'}</div>
                    <h2>${title}</h2>
                    <p>${message}</p>
                    <div class="payment-result-grid">
                        <div class="payment-info-row"><span>Mã đơn hàng</span><strong>${escapeHtml(order.orderNumber || payment.order_number || '--')}</strong></div>
                        <div class="payment-info-row"><span>Số tiền</span><strong>${formatCurrency(payment.amount || order.finalAmount || 0)}</strong></div>
                        <div class="payment-info-row"><span>Trạng thái thanh toán</span><strong>${escapeHtml(formatReadableStatus(payment.payment_status || (result === 'success' ? 'paid' : 'failed')))}</strong></div>
                        <div class="payment-info-row"><span>Trạng thái đơn hàng</span><strong>${escapeHtml(formatReadableStatus(order.orderStatus || order.status || (result === 'success' ? 'pending' : 'waiting_payment')))}</strong></div>
                    </div>
                    <div class="payment-actions center">
                        <a class="btn btn-primary" href="#order?id=${escapeHtml(orderId || payment.order_id || '')}">Xem đơn hàng</a>
                        ${result === 'failed' ? `<a class="btn btn-secondary" href="#payment?paymentId=${escapeHtml(paymentId || '')}&orderId=${escapeHtml(orderId || payment.order_id || '')}">Thử lại</a>` : ''}
                        <a class="btn btn-secondary" href="#home">Về trang chủ</a>
                    </div>
                </article>
            </div>
        `);
    }

    async function renderOrderDetailViewOverride(orderId) {
        clearPaymentTimers();
        if (!requireBuyerView()) return;
        if (!orderId) {
            if (typeof originalRenderOrdersView === 'function') return originalRenderOrdersView();
            return;
        }

        const response = await api.getOrder(orderId);
        const order = response.data || {};
        const paymentStatus = normalizeStatus(order.paymentStatus || order.payment?.status || 'pending');
        const continuePaymentLink = ['waiting_payment', 'pending', 'processing', 'expired', 'cancelled'].includes(paymentStatus)
            && order.payment?.paymentId
            ? `#payment?paymentId=${order.payment.paymentId}&orderId=${order._id}`
            : '';

        setSpaContent(`Đơn hàng #${escapeHtml(order.orderNumber || order._id || '')}`, `
            <div class="order-detail-layout">
                <section class="account-content">
                    <div class="order-detail-head">
                        <div>
                            <span class="editorial-kicker">Chi tiết đơn hàng</span>
                            <h2>#${escapeHtml(order.orderNumber || order._id || '')}</h2>
                            <p>${escapeHtml(formatDateTime(order.createdAt))}</p>
                        </div>
                        <div class="order-card-badges">
                            ${getOrderStatusBadge(order)}
                            ${getPaymentStatusBadge(order)}
                            ${getShippingStatusBadge(order)}
                        </div>
                    </div>

                    <div class="order-detail-summary-grid">
                        <div class="order-detail-box">
                            <h3>Người nhận</h3>
                            <p><strong>${escapeHtml(order.shippingAddress?.fullName || '')}</strong></p>
                            <p>${escapeHtml(order.shippingAddress?.phone || '')}</p>
                            <p>${escapeHtml(order.shippingAddress?.email || '')}</p>
                            <p>${escapeHtml(formatAddressLine(order.shippingAddress || {}))}</p>
                        </div>
                        <div class="order-detail-box">
                            <h3>Thông tin thanh toán</h3>
                            <p><strong>Phương thức:</strong> ${escapeHtml(formatPaymentMethod(order.paymentMethod || order.payment?.method || 'cod'))}</p>
                            <p><strong>Trạng thái thanh toán:</strong> ${escapeHtml(formatReadableStatus(paymentStatus))}</p>
                            <p><strong>Kênh thanh toán:</strong> ${escapeHtml(formatPaymentChannel(order.payment?.channel || ''))}</p>
                            <p><strong>Mã giao dịch:</strong> ${escapeHtml(order.payment?.transactionId || '--')}</p>
                            <p><strong>Thanh toán lúc:</strong> ${escapeHtml(formatDateTime(order.payment?.paidAt))}</p>
                            ${continuePaymentLink ? `<p><a class="btn btn-secondary" href="${continuePaymentLink}">Tiếp tục thanh toán</a></p>` : ''}
                        </div>
                        <div class="order-detail-box">
                            <h3>Tóm tắt đơn</h3>
                            <p>Tạm tính: ${formatCurrency(order.subtotal || 0)}</p>
                            <p>Phí vận chuyển: ${formatCurrency(order.shippingFee || 0)}</p>
                            <p>Giảm giá: ${formatCurrency(order.discountAmount || order.discount || 0)}</p>
                            <p><strong>Tổng thanh toán: ${formatCurrency(order.finalAmount || order.total || 0)}</strong></p>
                        </div>
                    </div>

                    <div class="order-detail-items">
                        <h3>Sản phẩm</h3>
                        ${(order.items || []).map((item) => `
                            <article class="order-item-card">
                                <div class="order-item-card-main">
                                    <img src="${productImage(item.product || item)}" alt="${escapeHtml(item.name || '')}" class="order-item-thumb">
                                    <div>
                                        <strong>${escapeHtml(item.name || '')}</strong>
                                        <p>Số lượng: ${item.quantity || 0} x ${formatCurrency(item.price || 0)}</p>
                                        ${item.sku ? `<p>SKU: ${escapeHtml(item.sku)}</p>` : ''}
                                    </div>
                                    <div class="order-item-line-total">${formatCurrency((item.price || 0) * (item.quantity || 0))}</div>
                                </div>
                            </article>
                        `).join('')}
                    </div>
                </section>

                <aside class="account-content order-detail-sidebar">
                    <h3>Lịch sử trạng thái</h3>
                    <div class="order-log-list">
                        ${(order.logs || []).map((log) => `
                            <div class="order-log-item">
                                <strong>${escapeHtml(formatReadableStatus(log.event))}</strong>
                                <p>${escapeHtml(log.message || '')}</p>
                                <span>${escapeHtml(formatDateTime(log.createdAt))}</span>
                            </div>
                        `).join('') || '<p>Chưa có nhật ký hoạt động.</p>'}
                    </div>
                    ${['waiting_payment', 'pending', 'confirmed'].includes(normalizeStatus(order.orderStatus || order.status)) ? `<button class="btn btn-secondary cancel-order" data-order-id="${escapeHtml(order._id || '')}">Hủy đơn</button>` : ''}
                </aside>
            </div>
        `);

        document.querySelectorAll('.cancel-order').forEach((button) => {
            button.addEventListener('click', async () => {
                if (!confirm('Bạn có chắc muốn hủy đơn này không?')) return;
                await api.cancelOrder(button.dataset.orderId, 'Khach hang yeu cau huy');
                notify('Đơn hàng đã được hủy.', 'success');
                renderOrderDetailViewOverride(button.dataset.orderId);
            });
        });
    }

    function resolveApiAssetUrl(url = '') {
        const raw = String(url || '').trim();
        if (!raw) return '';
        if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;

        if (raw.startsWith('/')) {
            try {
                return new URL(raw, api.baseUrl).toString();
            } catch (error) {
                return raw;
            }
        }

        return raw;
    }

    function getBuyerProfilePayload(response) {
        return response?.data?.user || response?.data || {};
    }

    function parseBirthDateParts(value) {
        if (!value) return { day: '', month: '', year: '' };

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return { day: '', month: '', year: '' };
        }

        return {
            day: String(date.getDate()),
            month: String(date.getMonth() + 1),
            year: String(date.getFullYear())
        };
    }

    function buildSelectOptions(start, end, selected, formatter = (value) => String(value)) {
        const step = start <= end ? 1 : -1;
        const options = [];

        for (let value = start; step > 0 ? value <= end : value >= end; value += step) {
            options.push(`<option value="${value}" ${String(selected) === String(value) ? 'selected' : ''}>${escapeHtml(formatter(value))}</option>`);
        }

        return options.join('');
    }

    function getBuyerAvatar(user = {}) {
        return resolveApiAssetUrl(user.avatar) || displayImage('generic');
    }

    function renderAddressRowsOverride(addresses = []) {
        if (!addresses.length) {
            return `
                <div class="buyer-address-empty">
                    <strong>Chưa có địa chỉ giao hàng</strong>
                    <p>Thêm địa chỉ để lần thanh toán sau điền nhanh hơn.</p>
                </div>
            `;
        }

        return addresses.map((address, index) => `
            <article class="buyer-address-card">
                <div class="buyer-address-card-head">
                    <div>
                        <h4>${escapeHtml(address.fullName || 'Người nhận')}</h4>
                        <p>${escapeHtml(address.phone || '')}</p>
                    </div>
                    ${address.isDefault ? '<span class="buyer-pill buyer-pill-primary">Mặc định</span>' : ''}
                </div>
                <p class="buyer-address-card-line">${escapeHtml(formatAddressLine(address))}</p>
                <div class="buyer-address-actions">
                    <button class="btn btn-secondary buyer-inline-button" type="button" data-edit-address="${index}">Sửa</button>
                    ${address.isDefault ? '' : `<button class="btn btn-secondary buyer-inline-button" type="button" data-default-address="${index}">Đặt mặc định</button>`}
                    <button class="btn btn-secondary buyer-inline-button danger" type="button" data-delete-address="${index}">Xóa</button>
                </div>
            </article>
        `).join('');
    }

    async function renderAccountViewOverride() {
        if (!requireBuyerView()) return;

        const response = await api.getProfile();
        const user = getBuyerProfilePayload(response);
        const addresses = Array.isArray(user.addresses) ? user.addresses : [];
        const birth = parseBirthDateParts(user.dateOfBirth);
        const currentYear = new Date().getFullYear();
        const accountName = user.name || 'Người mua';

        setSpaContent('Tài khoản của tôi', `
            <div class="buyer-account-shell">
                <aside class="buyer-account-sidebar">
                    <div class="buyer-account-sidebar-card">
                        <div class="buyer-account-sidebar-head">
                            <img id="buyerSidebarAvatar" src="${escapeHtml(getBuyerAvatar(user))}" alt="${escapeHtml(accountName)}" class="buyer-account-sidebar-avatar">
                            <div>
                                <h3>${escapeHtml(accountName)}</h3>
                                <p>Tài khoản mua hàng</p>
                            </div>
                        </div>
                        <nav class="buyer-account-nav">
                            <button class="buyer-account-nav-link is-active" type="button" data-account-nav="profile">Hồ sơ cá nhân</button>
                            <button class="buyer-account-nav-link" type="button" data-account-nav="address">Địa chỉ giao hàng</button>
                            <button class="buyer-account-nav-link" type="button" data-account-nav="password">Đổi mật khẩu</button>
                            <a class="buyer-account-nav-link" href="#orders">Đơn hàng của tôi</a>
                        </nav>
                    </div>
                </aside>

                <section class="buyer-account-main">
                    <article class="buyer-account-card" id="buyerAccountProfileSection">
                        <div class="buyer-account-card-head">
                            <div>
                                <h2>Hồ sơ của tôi</h2>
                                <p>Quản lý thông tin cá nhân để việc mua hàng và nhận đơn được thuận tiện hơn.</p>
                            </div>
                        </div>

                        <div class="buyer-profile-layout">
                            <form id="buyerProfileForm" class="buyer-account-form">
                                <div class="buyer-form-row buyer-form-row-static">
                                    <label>Tên đăng nhập</label>
                                    <div>${escapeHtml((user.email || '').split('@')[0] || 'Chưa có')}</div>
                                </div>
                                <div class="buyer-form-row">
                                    <label for="buyerName">Họ và tên</label>
                                    <div><input id="buyerName" name="name" type="text" value="${escapeHtml(user.name || '')}" placeholder="Nhập họ và tên" required></div>
                                </div>
                                <div class="buyer-form-row buyer-form-row-static">
                                    <label>Email</label>
                                    <div>${escapeHtml(user.email || 'Chưa cập nhật')}</div>
                                </div>
                                <div class="buyer-form-row">
                                    <label for="buyerPhone">Số điện thoại</label>
                                    <div><input id="buyerPhone" name="phone" type="text" value="${escapeHtml(user.phone || '')}" placeholder="Nhập số điện thoại"></div>
                                </div>
                                <div class="buyer-form-row">
                                    <label>Giới tính</label>
                                    <div class="buyer-radio-group">
                                        <label class="buyer-radio-option"><input type="radio" name="gender" value="male" ${user.gender === 'male' ? 'checked' : ''}><span>Nam</span></label>
                                        <label class="buyer-radio-option"><input type="radio" name="gender" value="female" ${user.gender === 'female' ? 'checked' : ''}><span>Nữ</span></label>
                                        <label class="buyer-radio-option"><input type="radio" name="gender" value="other" ${user.gender === 'other' ? 'checked' : ''}><span>Khác</span></label>
                                    </div>
                                </div>
                                <div class="buyer-form-row">
                                    <label>Ngày sinh</label>
                                    <div class="buyer-birth-grid">
                                        <select name="birthDay" aria-label="Ngày sinh"><option value="">Ngày</option>${buildSelectOptions(1, 31, birth.day, (value) => String(value).padStart(2, '0'))}</select>
                                        <select name="birthMonth" aria-label="Tháng sinh"><option value="">Tháng</option>${buildSelectOptions(1, 12, birth.month, (value) => `Tháng ${value}`)}</select>
                                        <select name="birthYear" aria-label="Năm sinh"><option value="">Năm</option>${buildSelectOptions(currentYear, 1950, birth.year)}</select>
                                    </div>
                                </div>
                                <div class="buyer-form-actions">
                                    <button id="buyerProfileSubmit" class="btn btn-primary" type="submit">Lưu hồ sơ</button>
                                </div>
                                <input id="buyerAvatarUrl" name="avatar" type="hidden" value="${escapeHtml(user.avatar || '')}">
                            </form>

                            <div class="buyer-avatar-panel">
                                <div class="buyer-avatar-preview-wrap">
                                    <img id="buyerAvatarPreview" src="${escapeHtml(getBuyerAvatar(user))}" alt="${escapeHtml(accountName)}" class="buyer-avatar-preview">
                                </div>
                                <button id="buyerAvatarPickButton" class="btn btn-secondary buyer-avatar-button" type="button">Chọn ảnh đại diện</button>
                                <input id="buyerAvatarFile" type="file" accept="image/*" hidden>
                                <p class="buyer-avatar-note">Dung lượng tối đa 5MB. Hỗ trợ JPG, PNG, WEBP.</p>
                            </div>
                        </div>
                    </article>

                    <article class="buyer-account-card" id="buyerAccountAddressSection">
                        <div class="buyer-account-card-head">
                            <div>
                                <h2>Địa chỉ giao hàng</h2>
                                <p>Lưu sẵn địa chỉ để thanh toán nhanh hơn và hạn chế nhập lại nhiều lần.</p>
                            </div>
                        </div>
                        <div class="buyer-address-layout">
                            <div id="buyerAddressList" class="buyer-address-list">${renderAddressRowsOverride(addresses)}</div>
                            <form id="buyerAddressForm" class="buyer-address-form">
                                <div class="buyer-address-form-head">
                                    <h3 id="buyerAddressFormTitle">Thêm địa chỉ mới</h3>
                                    <button id="buyerAddressCancelButton" class="btn btn-secondary buyer-inline-button is-hidden" type="button">Hủy sửa</button>
                                </div>
                                <input type="hidden" name="editIndex" value="-1">
                                <div class="buyer-form-grid">
                                    <input name="fullName" type="text" placeholder="Tên người nhận" required>
                                    <input name="phone" type="text" placeholder="Số điện thoại" required>
                                    <input name="street" type="text" placeholder="Số nhà, tên đường" required>
                                    <input name="ward" type="text" placeholder="Phường / Xã">
                                    <input name="district" type="text" placeholder="Quận / Huyện">
                                    <input name="city" type="text" placeholder="Tỉnh / Thành phố" required>
                                </div>
                                <label class="buyer-checkbox-row">
                                    <input name="isDefault" type="checkbox">
                                    <span>Đặt làm địa chỉ mặc định</span>
                                </label>
                                <div class="buyer-form-actions">
                                    <button id="buyerAddressSubmit" class="btn btn-primary" type="submit">Lưu địa chỉ</button>
                                </div>
                            </form>
                        </div>
                    </article>

                    <article class="buyer-account-card" id="buyerAccountPasswordSection">
                        <div class="buyer-account-card-head">
                            <div>
                                <h2>Đổi mật khẩu</h2>
                                <p>Chọn mật khẩu đủ mạnh để bảo vệ tài khoản và lịch sử mua hàng của bạn.</p>
                            </div>
                        </div>
                        <form id="buyerPasswordForm" class="buyer-account-form buyer-password-form">
                            <div class="buyer-form-row"><label for="buyerCurrentPassword">Mật khẩu hiện tại</label><div><input id="buyerCurrentPassword" name="currentPassword" type="password" placeholder="Nhập mật khẩu hiện tại" required></div></div>
                            <div class="buyer-form-row"><label for="buyerNewPassword">Mật khẩu mới</label><div><input id="buyerNewPassword" name="newPassword" type="password" placeholder="Tối thiểu 6 ký tự" required></div></div>
                            <div class="buyer-form-row"><label for="buyerConfirmPassword">Nhập lại mật khẩu mới</label><div><input id="buyerConfirmPassword" name="confirmPassword" type="password" placeholder="Nhập lại mật khẩu mới" required></div></div>
                            <div class="buyer-form-actions"><button id="buyerPasswordSubmit" class="btn btn-primary" type="submit">Cập nhật mật khẩu</button></div>
                        </form>
                    </article>
                </section>
            </div>
        `);

        const profileForm = document.getElementById('buyerProfileForm');
        const avatarInput = document.getElementById('buyerAvatarFile');
        const avatarButton = document.getElementById('buyerAvatarPickButton');
        const avatarPreview = document.getElementById('buyerAvatarPreview');
        const sidebarAvatar = document.getElementById('buyerSidebarAvatar');
        const avatarUrlInput = document.getElementById('buyerAvatarUrl');
        const addressForm = document.getElementById('buyerAddressForm');
        const addressTitle = document.getElementById('buyerAddressFormTitle');
        const addressCancelButton = document.getElementById('buyerAddressCancelButton');
        const addressSubmitButton = document.getElementById('buyerAddressSubmit');
        const passwordForm = document.getElementById('buyerPasswordForm');

        const scrollMap = {
            profile: document.getElementById('buyerAccountProfileSection'),
            address: document.getElementById('buyerAccountAddressSection'),
            password: document.getElementById('buyerAccountPasswordSection')
        };

        document.querySelectorAll('[data-account-nav]').forEach((button) => {
            button.addEventListener('click', () => {
                document.querySelectorAll('[data-account-nav]').forEach((item) => item.classList.remove('is-active'));
                button.classList.add('is-active');
                scrollMap[button.dataset.accountNav]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });

        function syncAvatar(url) {
            const resolved = resolveApiAssetUrl(url) || displayImage('generic');
            avatarPreview.src = resolved;
            sidebarAvatar.src = resolved;
            avatarUrlInput.value = url || '';
        }

        function resetAddressForm() {
            addressForm.reset();
            addressForm.editIndex.value = '-1';
            addressTitle.textContent = 'Thêm địa chỉ mới';
            addressSubmitButton.textContent = 'Lưu địa chỉ';
            addressCancelButton.classList.add('is-hidden');
        }

        avatarButton.addEventListener('click', () => avatarInput.click());
        avatarInput.addEventListener('change', async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            const originalText = avatarButton.textContent;
            avatarButton.disabled = true;
            avatarButton.textContent = 'Đang tải ảnh...';

            try {
                const uploadResponse = await api.uploadImage(file, 'avatars');
                syncAvatar(uploadResponse?.data?.url || '');
                notify('Đã tải ảnh đại diện lên. Nhớ bấm lưu hồ sơ để cập nhật chính thức.', 'success');
            } catch (error) {
                notify(error.message || 'Không thể tải ảnh đại diện.', 'error');
            } finally {
                avatarInput.value = '';
                avatarButton.disabled = false;
                avatarButton.textContent = originalText;
            }
        });

        profileForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(profileForm);
            const birthDay = formData.get('birthDay');
            const birthMonth = formData.get('birthMonth');
            const birthYear = formData.get('birthYear');
            let dateOfBirth = null;

            if (birthDay && birthMonth && birthYear) {
                dateOfBirth = new Date(`${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}T00:00:00`).toISOString();
            }

            const button = document.getElementById('buyerProfileSubmit');
            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = 'Đang lưu...';

            try {
                const updateResponse = await api.updateProfile({
                    name: String(formData.get('name') || '').trim(),
                    phone: String(formData.get('phone') || '').trim(),
                    avatar: String(formData.get('avatar') || '').trim(),
                    gender: profileForm.querySelector('input[name="gender"]:checked')?.value || null,
                    dateOfBirth
                });

                localStorage.setItem('user', JSON.stringify(updateResponse?.data || {}));
                authManager.checkAuthStatus?.();
                notify('Đã cập nhật hồ sơ cá nhân.', 'success');
                renderAccountViewOverride();
            } catch (error) {
                notify(error.message || 'Không thể cập nhật hồ sơ.', 'error');
            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });

        addressForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(addressForm);
            const editIndex = Number(formData.get('editIndex'));
            const nextAddress = {
                fullName: String(formData.get('fullName') || '').trim(),
                phone: String(formData.get('phone') || '').trim(),
                street: String(formData.get('street') || '').trim(),
                ward: String(formData.get('ward') || '').trim(),
                district: String(formData.get('district') || '').trim(),
                city: String(formData.get('city') || '').trim(),
                isDefault: formData.get('isDefault') === 'on'
            };

            const nextAddresses = addresses.map((address) => ({ ...address }));
            if (editIndex >= 0 && nextAddresses[editIndex]) {
                nextAddresses[editIndex] = { ...nextAddresses[editIndex], ...nextAddress };
            } else {
                nextAddresses.push(nextAddress);
            }

            if (nextAddress.isDefault) {
                nextAddresses.forEach((address, index) => {
                    address.isDefault = index === (editIndex >= 0 ? editIndex : nextAddresses.length - 1);
                });
            } else if (nextAddresses.length === 1) {
                nextAddresses[0].isDefault = true;
            }

            const originalText = addressSubmitButton.textContent;
            addressSubmitButton.disabled = true;
            addressSubmitButton.textContent = editIndex >= 0 ? 'Đang cập nhật...' : 'Đang thêm...';

            try {
                await api.updateProfile({ addresses: nextAddresses });
                notify(editIndex >= 0 ? 'Đã cập nhật địa chỉ.' : 'Đã thêm địa chỉ mới.', 'success');
                renderAccountViewOverride();
            } catch (error) {
                notify(error.message || 'Không thể lưu địa chỉ.', 'error');
            } finally {
                addressSubmitButton.disabled = false;
                addressSubmitButton.textContent = originalText;
            }
        });

        addressCancelButton.addEventListener('click', resetAddressForm);

        document.querySelectorAll('[data-edit-address]').forEach((button) => {
            button.addEventListener('click', () => {
                const index = Number(button.dataset.editAddress);
                const current = addresses[index];
                if (!current) return;

                addressForm.editIndex.value = String(index);
                addressForm.fullName.value = current.fullName || '';
                addressForm.phone.value = current.phone || '';
                addressForm.street.value = current.street || '';
                addressForm.ward.value = current.ward || '';
                addressForm.district.value = current.district || '';
                addressForm.city.value = current.city || '';
                addressForm.isDefault.checked = Boolean(current.isDefault);

                addressTitle.textContent = 'Chỉnh sửa địa chỉ';
                addressSubmitButton.textContent = 'Cập nhật địa chỉ';
                addressCancelButton.classList.remove('is-hidden');
                scrollMap.address?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });

        document.querySelectorAll('[data-default-address]').forEach((button) => {
            button.addEventListener('click', async () => {
                const selectedIndex = Number(button.dataset.defaultAddress);
                const nextAddresses = addresses.map((address, index) => ({
                    ...address,
                    isDefault: index === selectedIndex
                }));

                try {
                    await api.updateProfile({ addresses: nextAddresses });
                    notify('Đã cập nhật địa chỉ mặc định.', 'success');
                    renderAccountViewOverride();
                } catch (error) {
                    notify(error.message || 'Không thể cập nhật địa chỉ mặc định.', 'error');
                }
            });
        });

        document.querySelectorAll('[data-delete-address]').forEach((button) => {
            button.addEventListener('click', async () => {
                if (!confirm('Bạn có chắc muốn xóa địa chỉ này không?')) return;

                const selectedIndex = Number(button.dataset.deleteAddress);
                const nextAddresses = addresses.filter((_, index) => index !== selectedIndex).map((address) => ({ ...address }));
                if (nextAddresses.length && !nextAddresses.some((address) => address.isDefault)) {
                    nextAddresses[0].isDefault = true;
                }

                try {
                    await api.updateProfile({ addresses: nextAddresses });
                    notify('Đã xóa địa chỉ.', 'success');
                    renderAccountViewOverride();
                } catch (error) {
                    notify(error.message || 'Không thể xóa địa chỉ.', 'error');
                }
            });
        });

        passwordForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(passwordForm);
            const currentPassword = String(formData.get('currentPassword') || '');
            const newPassword = String(formData.get('newPassword') || '');
            const confirmPassword = String(formData.get('confirmPassword') || '');

            if (newPassword.length < 6) {
                notify('Mật khẩu mới cần có ít nhất 6 ký tự.', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                notify('Mật khẩu nhập lại chưa khớp.', 'error');
                return;
            }

            const button = document.getElementById('buyerPasswordSubmit');
            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = 'Đang cập nhật...';

            try {
                await api.changePassword(currentPassword, newPassword);
                passwordForm.reset();
                notify('Đã cập nhật mật khẩu.', 'success');
            } catch (error) {
                notify(error.message || 'Không thể đổi mật khẩu.', 'error');
            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });
    }

    async function renderContactViewOverride() {
        const response = await api.getContactInfo();
        const info = response?.data || {};
        const mapUrl = info.mapUrl || '#';

        setSpaContent('Liên hệ', `
            <div class="contact-shell">
                <header class="contact-hero">
                    <h2>Liên hệ với chúng tôi</h2>
                    <p>Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ cộng đồng yêu thú cưng. Hãy kết nối với Pet Shop Marketplace ngay hôm nay.</p>
                </header>

                <div class="contact-grid">
                    <section class="contact-sidebar">
                        <article class="contact-card contact-info-card">
                            <h3>Thông tin liên hệ</h3>
                            <div class="contact-info-list">
                                <div class="contact-info-item"><span class="contact-info-icon">☎</span><div><strong>Điện thoại</strong><p>${escapeHtml(info.phone || '1900 0000')}</p></div></div>
                                <div class="contact-info-item"><span class="contact-info-icon">✉</span><div><strong>Email</strong><p>${escapeHtml(info.email || 'support@petshop.local')}</p></div></div>
                                <div class="contact-info-item"><span class="contact-info-icon">⌂</span><div><strong>Địa chỉ</strong><p>${escapeHtml(info.address || '123 Pet Street, TP. Hồ Chí Minh')}</p></div></div>
                                <div class="contact-info-item"><span class="contact-info-icon">◷</span><div><strong>Giờ làm việc</strong><p>${escapeHtml(info.workingHours || '08:00 - 21:00')}</p></div></div>
                            </div>
                        </article>

                        <article class="contact-card contact-map-card">
                            <div class="contact-map-visual">
                                <img src="${resolveApiAssetUrl(info.mapImage) || displayImage('article')}" alt="Bản đồ liên hệ">
                                <div class="contact-map-overlay">
                                    <a class="btn btn-secondary contact-map-button" href="${escapeHtml(mapUrl)}" target="_blank" rel="noreferrer">Xem bản đồ lớn hơn</a>
                                </div>
                            </div>
                        </article>
                    </section>

                    <section class="contact-card contact-form-card">
                        <form id="spaContactForm" class="contact-form-grid">
                            <div class="contact-field"><label for="contactName">Họ và tên</label><input id="contactName" name="name" type="text" placeholder="Nguyễn Văn A" required></div>
                            <div class="contact-field"><label for="contactEmail">Email</label><input id="contactEmail" name="email" type="email" placeholder="example@email.com" required></div>
                            <div class="contact-field"><label for="contactPhone">Số điện thoại</label><input id="contactPhone" name="phone" type="tel" placeholder="090 123 4567"></div>
                            <div class="contact-field"><label for="contactSubject">Chủ đề</label><select id="contactSubject" name="subject"><option>Hỗ trợ khách hàng</option><option>Hợp tác kinh doanh</option><option>Góp ý dịch vụ</option><option>Khác</option></select></div>
                            <div class="contact-field contact-field-full"><label for="contactMessage">Tin nhắn</label><textarea id="contactMessage" name="message" rows="6" placeholder="Nhập nội dung tin nhắn của bạn..." required></textarea></div>
                            <div class="contact-form-actions">
                                <button id="contactSubmitButton" class="btn btn-primary" type="submit">Gửi tin nhắn</button>
                                <p id="spaContactMessage" class="contact-form-message"></p>
                            </div>
                        </form>
                    </section>
                </div>
            </div>
        `);

        document.getElementById('spaContactForm').addEventListener('submit', async (event) => {
            event.preventDefault();

            const button = document.getElementById('contactSubmitButton');
            const message = document.getElementById('spaContactMessage');
            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = 'Đang gửi...';
            message.textContent = '';
            message.className = 'contact-form-message';

            try {
                await api.sendContact(Object.fromEntries(new FormData(event.currentTarget).entries()));
                event.currentTarget.reset();
                message.textContent = 'Tin nhắn của bạn đã được gửi thành công. Chúng tôi sẽ phản hồi sớm.';
                message.classList.add('is-success');
                notify('Đã gửi liên hệ thành công.', 'success');
            } catch (error) {
                message.textContent = error.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.';
                message.classList.add('is-error');
                notify(error.message || 'Không thể gửi tin nhắn.', 'error');
            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });
    }

    window.renderCheckoutView = renderCheckoutView = renderCheckoutViewOverride;
    window.renderPaymentView = renderPaymentViewOverride;
    window.renderPaymentResultView = renderPaymentResultViewOverride;
    window.renderAddressRows = renderAddressRows = renderAddressRowsOverride;
    window.renderAccountView = renderAccountView = renderAccountViewOverride;
    window.renderContactView = renderContactView = renderContactViewOverride;
    window.renderOrderDetailView = renderOrderDetailView = renderOrderDetailViewOverride;

    window.renderHashView = renderHashView = async function renderHashViewOverride() {
        clearPaymentTimers();
        const { route, params } = parseHashRoute();
        if (route === 'payment') {
            showSpaView();
            return renderPaymentViewOverride(params.get('paymentId'), params.get('orderId'), params.get('channel'));
        }
        if (route === 'payment-result') {
            showSpaView();
            return renderPaymentResultViewOverride(params.get('result'), params.get('paymentId'), params.get('orderId'));
        }
        if (originalRenderHashView) {
            return originalRenderHashView();
        }
    };
})();
