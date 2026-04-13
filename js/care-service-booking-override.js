(function () {
    if (typeof window === 'undefined' || typeof api === 'undefined') return;

    const originalRenderShopDetailView = typeof renderShopDetailView === 'function' ? renderShopDetailView : null;

    function notify(message, type = 'success') {
        if (window.authManager?.showNotification) {
            window.authManager.showNotification(message, type);
        }
    }

    function h(value = '') {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function money(value = 0) {
        return typeof formatCurrency === 'function'
            ? formatCurrency(value)
            : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value || 0));
    }

    function dt(value) {
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

    function dateValue(value) {
        const date = new Date(value || Date.now());
        if (Number.isNaN(date.getTime())) return '';
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function careType(value = '') {
        if (typeof formatCareServiceType === 'function') return formatCareServiceType(value);
        return value || 'Dịch vụ chăm sóc';
    }

    function modeLabel(value = '') {
        return value === 'at_home' ? 'Tại nhà' : 'Tại shop';
    }

    function statusLabel(value = '') {
        const map = {
            pending: 'Chờ xác nhận',
            confirmed: 'Đã xác nhận',
            completed: 'Hoàn thành',
            cancelled: 'Đã hủy',
            rejected: 'Bị từ chối',
            no_show: 'Không đến'
        };
        return map[value] || value || 'Chờ xác nhận';
    }

    function line(address = {}) {
        if (typeof formatAddressLine === 'function') return formatAddressLine(address);
        return [address.street || address.addressLine, address.ward, address.district, address.city].filter(Boolean).join(', ');
    }

    function buyer(res) {
        return res?.data?.user || res?.data || {};
    }

    function slots(selected = '09:00') {
        return ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']
            .map((item) => `<option value="${item}" ${item === selected ? 'selected' : ''}>${item}</option>`).join('');
    }

    function fee(price, mode) {
        return mode === 'at_home' ? Math.max(Math.round(Number(price || 0) * 0.18), 30000) : 0;
    }

    function canHome(service, care) {
        return !!service?.supportsHomeService && !!care?.supportsHomeService;
    }

    function panelHtml(shop, care, items, user) {
        const home = (Array.isArray(user.addresses) ? user.addresses.find((x) => x.isDefault) || user.addresses[0] : null) || {};
        const first = items[0] || {};
        return `
            <section class="account-content care-booking-composer" id="careBookingHost">
                <div class="care-booking-composer-head">
                    <div>
                        <span class="editorial-kicker">Đặt lịch nhanh</span>
                        <h3>Đặt lịch dịch vụ chăm sóc</h3>
                        <p>Chọn dịch vụ, ngày giờ và hình thức phục vụ phù hợp với thú cưng của bạn.</p>
                    </div>
                    <a class="btn btn-secondary" href="#service-bookings">Lịch hẹn của tôi</a>
                </div>
                <form id="careBookingForm" class="care-booking-form">
                    <div class="care-booking-grid">
                        <div class="care-booking-main">
                            <div class="checkout-field-grid two-up">
                                <label class="checkout-field">
                                    <span>Dịch vụ</span>
                                    <select name="serviceId">${items.map((item) => `<option value="${h(item._id)}">${h(item.name)} - ${h(careType(item.serviceType))}</option>`).join('')}</select>
                                </label>
                                <label class="checkout-field">
                                    <span>Cơ sở phục vụ</span>
                                    <input name="branchName" type="text" readonly value="${h(care?.facilityName || shop?.name || 'Cơ sở dịch vụ')}">
                                </label>
                            </div>
                            <div class="care-mode-row">
                                <label class="care-mode-card is-active"><input type="radio" name="bookingMode" value="in_store" checked><strong>Đặt tại shop</strong><span>Đưa pet đến cơ sở để sử dụng dịch vụ.</span></label>
                                <label class="care-mode-card ${canHome(first, care) ? '' : 'is-disabled'}" data-home-card="1"><input type="radio" name="bookingMode" value="at_home" ${canHome(first, care) ? '' : 'disabled'}><strong>Nhân viên đến nhà</strong><span>Có phụ thu tận nơi, phù hợp khi bạn muốn chăm pet tại nhà.</span></label>
                            </div>
                            <div class="checkout-field-grid three-up">
                                <label class="checkout-field"><span>Ngày hẹn</span><input name="appointmentDate" type="date" value="${dateValue()}" min="${dateValue()}" required></label>
                                <label class="checkout-field"><span>Khung giờ</span><select name="timeSlot">${slots()}</select></label>
                                <label class="checkout-field"><span>Loại thú cưng</span><input name="petType" type="text" placeholder="Ví dụ: Chó Poodle, mèo Anh lông ngắn" required></label>
                            </div>
                            <div class="checkout-field-grid two-up">
                                <label class="checkout-field"><span>Tên người liên hệ</span><input name="contactName" type="text" value="${h(user.name || '')}" required></label>
                                <label class="checkout-field"><span>Số điện thoại</span><input name="contactPhone" type="text" value="${h(user.phone || '')}" required></label>
                                <label class="checkout-field"><span>Email</span><input name="contactEmail" type="email" value="${h(user.email || '')}"></label>
                                <label class="checkout-field"><span>Tên thú cưng</span><input name="petName" type="text" placeholder="Ví dụ: Miu, Bông, Đậu"></label>
                            </div>
                            <div id="careHomeFields" class="checkout-field-grid two-up is-hidden">
                                <label class="checkout-field checkout-field-full"><span>Địa chỉ tại nhà</span><input name="addressLine" type="text" value="${h(home.street || home.addressLine || '')}" placeholder="Số nhà, tên đường"></label>
                                <label class="checkout-field"><span>Phường / Xã</span><input name="ward" type="text" value="${h(home.ward || '')}"></label>
                                <label class="checkout-field"><span>Quận / Huyện</span><input name="district" type="text" value="${h(home.district || '')}"></label>
                                <label class="checkout-field"><span>Tỉnh / Thành phố</span><input name="city" type="text" value="${h(home.city || '')}"></label>
                            </div>
                            <label class="checkout-field"><span>Ghi chú</span><textarea name="notes" rows="4" placeholder="Ví dụ: pet nhạy cảm với tiếng ồn, cần chăm nhẹ nhàng."></textarea></label>
                            <div class="care-booking-actions">
                                <button class="btn btn-primary" id="careBookingSubmit" type="submit">Đặt lịch chăm sóc</button>
                                <div id="careBookingMsg" class="editorial-inline-message"></div>
                            </div>
                        </div>
                        <aside class="care-booking-summary" id="careBookingSummary"></aside>
                    </div>
                </form>
            </section>
        `;
    }

    function summaryHtml(service, mode, branch) {
        const extra = fee(service?.price, mode);
        return `
            <h4>Tóm tắt lịch hẹn</h4>
            <div class="care-summary-list">
                <div class="payment-info-row"><span>Dịch vụ</span><strong>${h(service?.name || 'Chưa chọn')}</strong></div>
                <div class="payment-info-row"><span>Loại dịch vụ</span><strong>${h(careType(service?.serviceType || ''))}</strong></div>
                <div class="payment-info-row"><span>Hình thức</span><strong>${h(modeLabel(mode))}</strong></div>
                <div class="payment-info-row"><span>Thời lượng</span><strong>${h(String(service?.durationMinutes || 0))} phút</strong></div>
                <div class="payment-info-row"><span>Cơ sở</span><strong>${h(branch || '--')}</strong></div>
                <div class="payment-info-row"><span>Giá dịch vụ</span><strong>${money(service?.price || 0)}</strong></div>
                <div class="payment-info-row"><span>Phụ thu tận nơi</span><strong>${money(extra)}</strong></div>
                <div class="payment-info-row"><span>Tổng dự kiến</span><strong>${money(Number(service?.price || 0) + extra)}</strong></div>
            </div>
        `;
    }

    async function mountShopBooking(shopId) {
        const spa = document.getElementById('spaView');
        const carePanel = spa?.querySelector('[data-shop-tab-panel="care-services"]');
        if (!carePanel) return;

        const [shopRes, careRes, profileRes] = await Promise.all([
            api.getShop(shopId),
            api.getShopCareServices(shopId),
            (window.authManager?.isAuthenticated && window.authManager?.user?.role === 'buyer') ? api.getProfile().catch(() => null) : Promise.resolve(null)
        ]);

        const shop = shopRes?.data || {};
        const care = careRes?.data?.careService || null;
        const items = Array.isArray(careRes?.data?.offerings) ? careRes.data.offerings : [];
        if (!care || !items.length) return;

        const isBuyer = window.authManager?.isAuthenticated && window.authManager?.user?.role === 'buyer';
        if (!isBuyer) {
            const guest = document.createElement('section');
            guest.className = 'account-content care-booking-composer';
            guest.innerHTML = `
                <div class="care-booking-composer-head">
                    <div>
                        <span class="editorial-kicker">Đặt lịch nhanh</span>
                        <h3>Đăng nhập để đặt dịch vụ chăm sóc</h3>
                        <p>Bạn cần đăng nhập tài khoản người mua để chọn dịch vụ, ngày giờ và theo dõi lịch hẹn.</p>
                    </div>
                    <button class="btn btn-primary" id="careLoginNow" type="button">Đăng nhập</button>
                </div>
            `;
            carePanel.prepend(guest);
            document.getElementById('careLoginNow')?.addEventListener('click', () => window.authManager?.showLoginModal?.());
            return;
        }

        carePanel.insertAdjacentHTML('afterbegin', panelHtml(shop, care, items, buyer(profileRes)));
        const host = carePanel.querySelector('#careBookingHost');
        const form = host.querySelector('#careBookingForm');
        const summary = host.querySelector('#careBookingSummary');
        const msg = host.querySelector('#careBookingMsg');
        const serviceSelect = form.querySelector('[name="serviceId"]');
        const homeWrap = host.querySelector('#careHomeFields');

        function setMsg(text = '', type = '') {
            msg.textContent = text;
            msg.className = `editorial-inline-message ${type}`.trim();
        }

        function selectedService() {
            return items.find((item) => item._id === serviceSelect.value) || items[0];
        }

        function selectedMode() {
            return form.querySelector('[name="bookingMode"]:checked')?.value || 'in_store';
        }

        function sync() {
            const service = selectedService();
            const mode = selectedMode();
            const atHome = form.querySelector('[name="bookingMode"][value="at_home"]');
            const homeOk = canHome(service, care);
            if (atHome) {
                atHome.disabled = !homeOk;
                if (!homeOk && atHome.checked) {
                    form.querySelector('[name="bookingMode"][value="in_store"]').checked = true;
                }
            }
            host.querySelectorAll('.care-mode-card').forEach((card) => {
                const input = card.querySelector('input');
                card.classList.toggle('is-active', !!input?.checked);
                if (input?.value === 'at_home') card.classList.toggle('is-disabled', !homeOk);
            });
            homeWrap.classList.toggle('is-hidden', selectedMode() !== 'at_home');
            summary.innerHTML = summaryHtml(service, selectedMode(), form.branchName.value);
        }

        carePanel.querySelectorAll('[data-care-book-service]').forEach((oldButton) => {
            const id = oldButton.dataset.careBookService;
            const service = items.find((item) => item._id === id);
            const wrap = document.createElement('div');
            wrap.className = 'product-card-actions care-product-actions';
            wrap.innerHTML = `
                <button class="btn btn-primary btn-small" type="button" data-care-pick="${h(id)}" data-care-mode="in_store">Đặt tại shop</button>
                ${canHome(service, care) ? `<button class="btn btn-secondary btn-small" type="button" data-care-pick="${h(id)}" data-care-mode="at_home">Đặt tại nhà</button>` : ''}
            `;
            oldButton.parentNode.replaceWith(wrap);
        });

        carePanel.querySelectorAll('[data-care-pick]').forEach((button) => {
            button.addEventListener('click', () => {
                serviceSelect.value = button.dataset.carePick;
                const modeInput = form.querySelector(`[name="bookingMode"][value="${button.dataset.careMode || 'in_store'}"]`);
                if (modeInput && !modeInput.disabled) modeInput.checked = true;
                sync();
                host.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });

        serviceSelect.addEventListener('change', sync);
        form.querySelectorAll('[name="bookingMode"]').forEach((input) => input.addEventListener('change', sync));
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const service = selectedService();
            const mode = selectedMode();
            const payload = {
                serviceId: service._id,
                bookingMode: mode,
                branchName: form.branchName.value.trim(),
                contactName: form.contactName.value.trim(),
                contactPhone: form.contactPhone.value.trim(),
                contactEmail: form.contactEmail.value.trim(),
                petName: form.petName.value.trim(),
                petType: form.petType.value.trim(),
                appointmentDate: form.appointmentDate.value,
                timeSlot: form.timeSlot.value,
                notes: form.notes.value.trim()
            };
            if (mode === 'at_home') {
                payload.homeServiceAddress = {
                    addressLine: form.addressLine.value.trim(),
                    ward: form.ward.value.trim(),
                    district: form.district.value.trim(),
                    city: form.city.value.trim()
                };
            }

            const submit = host.querySelector('#careBookingSubmit');
            const text = submit.textContent;
            submit.disabled = true;
            submit.textContent = 'Đang đặt lịch...';
            try {
                await api.createCareServiceBooking(shop._id || shopId, payload);
                notify('Đã đặt lịch dịch vụ chăm sóc thành công.', 'success');
                window.location.hash = 'service-bookings';
            } catch (error) {
                setMsg(error.message || 'Không thể đặt lịch dịch vụ.', 'error');
            } finally {
                submit.disabled = false;
                submit.textContent = text;
            }
        });

        sync();
        bindProductCards?.(document.getElementById('spaView'));
    }

    function bookingCard(item) {
        const home = line(item.homeServiceAddress || {});
        const canManage = ['pending', 'confirmed'].includes(item.status);
        const canReview = item.status === 'completed' && !item.reviewedAt;
        return `
            <article class="order-card care-booking-card">
                <div class="order-card-top">
                    <div>
                        <h3>${h(item.service?.name || 'Dịch vụ chăm sóc')}</h3>
                        <p class="order-card-date">${h(dt(item.appointmentDate))} • ${h(item.timeSlot || '--')}</p>
                    </div>
                    <div class="order-card-total">${money(item.totalAmount || 0)}</div>
                </div>
                <div class="order-card-badges">
                    <span class="status-badge status-badge-${h(item.status === 'completed' ? 'success' : ['cancelled', 'rejected', 'no_show'].includes(item.status) ? 'danger' : item.status === 'confirmed' ? 'info' : 'warning')}">${h(statusLabel(item.status))}</span>
                    <span class="status-badge status-badge-neutral">${h(item.shop?.name || 'Shop dịch vụ')}</span>
                    <span class="status-badge status-badge-info">${h(modeLabel(item.bookingMode))}</span>
                </div>
                <div class="care-booking-meta-grid">
                    <div><strong>Loại dịch vụ</strong><span>${h(careType(item.service?.serviceType || ''))}</span></div>
                    <div><strong>Thú cưng</strong><span>${h(item.petName ? `${item.petName} • ${item.petType || ''}` : (item.petType || 'Chưa cập nhật'))}</span></div>
                    <div><strong>Địa điểm</strong><span>${h(item.bookingMode === 'at_home' ? (home || 'Tại địa chỉ của bạn') : (item.branchName || item.shop?.name || '--'))}</span></div>
                    <div><strong>Phụ thu tận nơi</strong><span>${money(item.travelSurcharge || 0)}</span></div>
                </div>
                <div class="order-card-actions care-booking-actions-inline">
                    ${canManage ? `<button class="btn btn-secondary btn-small" type="button" data-care-reschedule-open="${h(item._id)}">Đổi lịch</button>` : ''}
                    ${canManage ? `<button class="btn btn-secondary btn-small" type="button" data-care-cancel="${h(item._id)}">Hủy lịch</button>` : ''}
                    ${canReview ? `<button class="btn btn-primary btn-small" type="button" data-care-review-open="${h(item._id)}">Đánh giá</button>` : ''}
                    ${item.shop?._id ? `<a class="btn btn-secondary btn-small" href="#shop-detail?id=${h(item.shop._id)}">Xem shop</a>` : ''}
                </div>
                ${canManage ? `
                    <form class="care-inline-panel is-hidden" data-care-reschedule-panel="${h(item._id)}">
                        <h4>Đổi lịch hẹn</h4>
                        <div class="checkout-field-grid two-up">
                            <label class="checkout-field"><span>Ngày hẹn mới</span><input name="appointmentDate" type="date" value="${h(dateValue(item.appointmentDate))}" required></label>
                            <label class="checkout-field"><span>Khung giờ mới</span><select name="timeSlot">${slots(item.timeSlot || '09:00')}</select></label>
                            ${item.bookingMode === 'in_store' ? `<label class="checkout-field checkout-field-full"><span>Cơ sở</span><input name="branchName" type="text" value="${h(item.branchName || item.shop?.name || '')}"></label>` : ''}
                            ${item.bookingMode === 'at_home' ? `<label class="checkout-field checkout-field-full"><span>Địa chỉ</span><input name="addressLine" type="text" value="${h(item.homeServiceAddress?.addressLine || '')}" required></label>` : ''}
                            ${item.bookingMode === 'at_home' ? `<label class="checkout-field"><span>Phường / Xã</span><input name="ward" type="text" value="${h(item.homeServiceAddress?.ward || '')}"></label>` : ''}
                            ${item.bookingMode === 'at_home' ? `<label class="checkout-field"><span>Quận / Huyện</span><input name="district" type="text" value="${h(item.homeServiceAddress?.district || '')}"></label>` : ''}
                            ${item.bookingMode === 'at_home' ? `<label class="checkout-field checkout-field-full"><span>Tỉnh / Thành phố</span><input name="city" type="text" value="${h(item.homeServiceAddress?.city || '')}" required></label>` : ''}
                        </div>
                        <label class="checkout-field"><span>Ghi chú</span><textarea name="notes" rows="3">${h(item.notes || '')}</textarea></label>
                        <div class="care-inline-actions"><button class="btn btn-primary btn-small" type="submit">Lưu lịch mới</button><button class="btn btn-secondary btn-small" type="button" data-care-close="${h(item._id)}">Đóng</button></div>
                    </form>
                ` : ''}
                ${canReview ? `
                    <form class="care-inline-panel is-hidden" data-care-review-panel="${h(item._id)}">
                        <h4>Đánh giá dịch vụ</h4>
                        <div class="care-rating-row">${[1, 2, 3, 4, 5].map((x) => `<label class="care-rating-option"><input type="radio" name="rating-${h(item._id)}" value="${x}" ${x === 5 ? 'checked' : ''}><span>${x} sao</span></label>`).join('')}</div>
                        <label class="checkout-field"><span>Nhận xét</span><textarea name="comment" rows="3" placeholder="Chia sẻ cảm nhận của bạn"></textarea></label>
                        <div class="care-inline-actions"><button class="btn btn-primary btn-small" type="submit">Gửi đánh giá</button><button class="btn btn-secondary btn-small" type="button" data-care-close-review="${h(item._id)}">Đóng</button></div>
                    </form>
                ` : ''}
            </article>
        `;
    }

    async function renderCareBookings() {
        if (typeof requireBuyerView === 'function' && !requireBuyerView()) return;
        const res = await api.getMyCareServiceBookings({ limit: 50 });
        const items = Array.isArray(res.data) ? res.data : [];
        const groups = {
            upcoming: items.filter((x) => ['pending', 'confirmed'].includes(x.status)),
            completed: items.filter((x) => x.status === 'completed'),
            cancelled: items.filter((x) => ['cancelled', 'rejected', 'no_show'].includes(x.status))
        };

        setSpaContent('Lịch hẹn chăm sóc của tôi', `
            <div class="account-content orders-shell care-bookings-shell">
                <div class="care-bookings-head">
                    <div><span class="editorial-kicker">Dịch vụ chăm sóc</span><h2>Lịch hẹn của tôi</h2><p>Theo dõi lịch sắp tới, lịch đã hoàn thành và các lịch đã hủy.</p></div>
                    <a class="btn btn-secondary" href="#shop?mallOnly=true">Tìm shop có dịch vụ</a>
                </div>
                ${[['upcoming', 'Lịch sắp tới'], ['completed', 'Đã hoàn thành'], ['cancelled', 'Đã hủy']].map(([key, title]) => `
                    <section class="care-booking-group">
                        <div class="care-booking-group-head"><div><h3>${title}</h3></div><span class="status-badge status-badge-neutral">${groups[key].length}</span></div>
                        <div class="care-booking-group-list">${groups[key].length ? groups[key].map(bookingCard).join('') : `<div class="buyer-address-empty"><strong>Chưa có mục nào</strong><p>Nhóm lịch hẹn này hiện chưa có dữ liệu.</p></div>`}</div>
                    </section>
                `).join('')}
            </div>
        `);
    }

    function bindCareBookings() {
        const root = document.getElementById('spaView');
        if (!root) return;

        root.querySelectorAll('[data-care-cancel]').forEach((button) => {
            button.addEventListener('click', async () => {
                if (!window.confirm('Bạn có chắc muốn hủy lịch hẹn này không?')) return;
                try {
                    await api.cancelMyCareServiceBooking(button.dataset.careCancel, 'Khách hàng hủy lịch');
                    notify('Đã hủy lịch hẹn dịch vụ.', 'success');
                    await renderCareBookings();
                    bindCareBookings();
                } catch (error) {
                    notify(error.message || 'Không thể hủy lịch hẹn.', 'error');
                }
            });
        });

        root.querySelectorAll('[data-care-reschedule-open]').forEach((button) => {
            button.addEventListener('click', () => root.querySelector(`[data-care-reschedule-panel="${button.dataset.careRescheduleOpen}"]`)?.classList.toggle('is-hidden'));
        });

        root.querySelectorAll('[data-care-close]').forEach((button) => {
            button.addEventListener('click', () => root.querySelector(`[data-care-reschedule-panel="${button.dataset.careClose}"]`)?.classList.add('is-hidden'));
        });

        root.querySelectorAll('[data-care-review-open]').forEach((button) => {
            button.addEventListener('click', () => root.querySelector(`[data-care-review-panel="${button.dataset.careReviewOpen}"]`)?.classList.toggle('is-hidden'));
        });

        root.querySelectorAll('[data-care-close-review]').forEach((button) => {
            button.addEventListener('click', () => root.querySelector(`[data-care-review-panel="${button.dataset.careCloseReview}"]`)?.classList.add('is-hidden'));
        });

        root.querySelectorAll('[data-care-reschedule-panel]').forEach((form) => {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const id = form.dataset.careReschedulePanel;
                const payload = {
                    appointmentDate: form.appointmentDate.value,
                    timeSlot: form.timeSlot.value,
                    branchName: form.branchName?.value?.trim() || '',
                    notes: form.notes.value.trim()
                };
                if (form.addressLine) {
                    payload.homeServiceAddress = {
                        addressLine: form.addressLine.value.trim(),
                        ward: form.ward.value.trim(),
                        district: form.district.value.trim(),
                        city: form.city.value.trim()
                    };
                }
                try {
                    await api.rescheduleMyCareServiceBooking(id, payload);
                    notify('Đã cập nhật lịch hẹn mới.', 'success');
                    await renderCareBookings();
                    bindCareBookings();
                } catch (error) {
                    notify(error.message || 'Không thể đổi lịch.', 'error');
                }
            });
        });

        root.querySelectorAll('[data-care-review-panel]').forEach((form) => {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const id = form.dataset.careReviewPanel;
                const rating = form.querySelector(`input[name="rating-${id}"]:checked`)?.value || '5';
                try {
                    await api.createCareServiceReview(id, { rating: Number(rating), comment: form.comment.value.trim() });
                    notify('Đã gửi đánh giá dịch vụ.', 'success');
                    await renderCareBookings();
                    bindCareBookings();
                } catch (error) {
                    notify(error.message || 'Không thể gửi đánh giá.', 'error');
                }
            });
        });
    }

    if (originalRenderShopDetailView) {
        window.renderShopDetailView = renderShopDetailView = async function (shopId) {
            await originalRenderShopDetailView(shopId);
            try {
                await mountShopBooking(shopId);
            } catch (error) {
                console.error('mountShopBooking failed', error);
            }
        };
    }

    window.renderCareServiceBookingsView = renderCareServiceBookingsView = async function () {
        try {
            await renderCareBookings();
            bindCareBookings();
        } catch (error) {
            setSpaContent('Lịch hẹn chăm sóc của tôi', `<div class="account-content"><p>${h(error.message || 'Không thể tải lịch hẹn dịch vụ chăm sóc.')}</p><a class="btn btn-secondary" href="#shop?mallOnly=true">Tìm shop có dịch vụ</a></div>`);
        }
    };
})();
