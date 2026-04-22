(function () {
    if (typeof window === 'undefined' || typeof api === 'undefined') return;

    const TXT = {
        accountTitle: 'T&#224;i kho&#7843;n c&#7911;a t&#244;i',
        buyerName: 'Ng&#432;&#7901;i mua',
        buyerAccount: 'T&#224;i kho&#7843;n mua h&#224;ng',
        profileNav: 'H&#7891; s&#417; c&#225; nh&#226;n',
        addressNav: '&#272;&#7883;a ch&#7881; giao h&#224;ng',
        passwordNav: '&#272;&#7893;i m&#7853;t kh&#7849;u',
        ordersNav: '&#272;&#417;n h&#224;ng c&#7911;a t&#244;i',
        messagesNav: 'Tin nh&#7855;n v&#7899;i shop',
        profileHeading: 'H&#7891; s&#417; c&#7911;a t&#244;i',
        profileDesc: 'Qu&#7843;n l&#253; th&#244;ng tin c&#225; nh&#226;n &#273;&#7875; vi&#7879;c mua h&#224;ng v&#224; nh&#7853;n &#273;&#417;n thu&#7853;n ti&#7879;n h&#417;n.',
        username: 'T&#234;n &#273;&#259;ng nh&#7853;p',
        fullName: 'H&#7885; v&#224; t&#234;n',
        email: 'Email',
        phone: 'S&#7889; &#273;i&#7879;n tho&#7841;i',
        gender: 'Gi&#7899;i t&#237;nh',
        male: 'Nam',
        female: 'N&#7919;',
        other: 'Kh&#225;c',
        dateOfBirth: 'Ng&#224;y sinh',
        day: 'Ng&#224;y',
        month: 'Th&#225;ng',
        year: 'N&#259;m',
        saveProfile: 'L&#432;u h&#7891; s&#417;',
        chooseAvatar: 'Ch&#7885;n &#7843;nh &#273;&#7841;i di&#7879;n',
        avatarNote: 'Dung l&#432;&#7907;ng t&#7889;i &#273;a 5MB. H&#7895; tr&#7907; JPG, PNG, WEBP.',
        addressHeading: '&#272;&#7883;a ch&#7881; giao h&#224;ng',
        addressDesc: 'L&#432;u s&#7861;n &#273;&#7883;a ch&#7881; &#273;&#7875; thanh to&#225;n nhanh h&#417;n v&#224; h&#7841;n ch&#7871; nh&#7853;p l&#7841;i nhi&#7873;u l&#7847;n.',
        addNewAddress: 'Th&#234;m &#273;&#7883;a ch&#7881; m&#7899;i',
        cancelEdit: 'H&#7911;y s&#7917;a',
        recipientName: 'T&#234;n ng&#432;&#7901;i nh&#7853;n',
        street: 'S&#7889; nh&#224;, t&#234;n &#273;&#432;&#7901;ng',
        ward: 'Ph&#432;&#7901;ng / X&#227;',
        district: 'Qu&#7853;n / Huy&#7879;n',
        city: 'T&#7881;nh / Th&#224;nh ph&#7889;',
        setDefaultAddress: '&#272;&#7863;t l&#224;m &#273;&#7883;a ch&#7881; m&#7863;c &#273;&#7883;nh',
        saveAddress: 'L&#432;u &#273;&#7883;a ch&#7881;',
        noAddress: 'Ch&#432;a c&#243; &#273;&#7883;a ch&#7881; giao h&#224;ng',
        noAddressDesc: 'Th&#234;m &#273;&#7883;a ch&#7881; &#273;&#7875; l&#7847;n thanh to&#225;n sau &#273;i&#7873;n nhanh h&#417;n.',
        receiver: 'Ng&#432;&#7901;i nh&#7853;n',
        defaultBadge: 'M&#7863;c &#273;&#7883;nh',
        editAddress: 'S&#7917;a',
        defaultAction: '&#272;&#7863;t m&#7863;c &#273;&#7883;nh',
        deleteAddress: 'X&#243;a',
        passwordHeading: '&#272;&#7893;i m&#7853;t kh&#7849;u',
        passwordDesc: 'Ch&#7885;n m&#7853;t kh&#7849;u &#273;&#7911; m&#7841;nh &#273;&#7875; b&#7843;o v&#7879; t&#224;i kho&#7843;n v&#224; l&#7883;ch s&#7917; mua h&#224;ng.',
        currentPassword: 'M&#7853;t kh&#7849;u hi&#7879;n t&#7841;i',
        newPassword: 'M&#7853;t kh&#7849;u m&#7899;i',
        confirmPassword: 'Nh&#7853;p l&#7841;i m&#7853;t kh&#7849;u m&#7899;i',
        savePassword: 'C&#7853;p nh&#7853;t m&#7853;t kh&#7849;u',
        saveLoading: '&#272;ang l&#432;u...',
        uploadLoading: '&#272;ang t&#7843;i &#7843;nh...',
        updateLoading: '&#272;ang c&#7853;p nh&#7853;t...',
        addLoading: '&#272;ang th&#234;m...',
        contactTitle: 'Li&#234;n h&#7879;',
        contactHero: 'Li&#234;n h&#7879; v&#7899;i ch&#250;ng t&#244;i',
        contactDesc: 'Ch&#250;ng t&#244;i lu&#244;n s&#7861;n s&#224;ng l&#7855;ng nghe v&#224; h&#7895; tr&#7907; c&#7897;ng &#273;&#7891;ng y&#234;u th&#250; c&#432;ng. H&#227;y k&#7871;t n&#7889;i v&#7899;i Pet Shop Marketplace ngay h&#244;m nay.',
        contactInfo: 'Th&#244;ng tin li&#234;n h&#7879;',
        hotline: '&#272;i&#7879;n tho&#7841;i',
        address: '&#272;&#7883;a ch&#7881;',
        workingHours: 'Gi&#7901; l&#224;m vi&#7879;c',
        mapButton: 'Xem b&#7843;n &#273;&#7891; l&#7899;n h&#417;n',
        supportCustomer: 'H&#7895; tr&#7907; kh&#225;ch h&#224;ng',
        businessTopic: 'H&#7907;p t&#225;c kinh doanh',
        feedbackTopic: 'G&#243;p &#253; d&#7883;ch v&#7909;',
        otherTopic: 'Kh&#225;c',
        message: 'Tin nh&#7855;n',
        sendMessage: 'G&#7917;i tin nh&#7855;n',
        sendLoading: '&#272;ang g&#7917;i...',
        fullNamePlaceholder: 'Nguy&#7877;n V&#259;n A',
        emailPlaceholder: 'example@email.com',
        phonePlaceholder: '090 123 4567',
        messagePlaceholder: 'Nh&#7853;p n&#7897;i dung tin nh&#7855;n c&#7911;a b&#7841;n...',
        profileUpdated: '&#272;&#227; c&#7853;p nh&#7853;t h&#7891; s&#417; c&#225; nh&#226;n.',
        avatarUploaded: '&#272;&#227; t&#7843;i &#7843;nh &#273;&#7841;i di&#7879;n l&#234;n. Nh&#7899; b&#7845;m l&#432;u h&#7891; s&#417; &#273;&#7875; c&#7853;p nh&#7853;t ch&#237;nh th&#7913;c.',
        avatarFailed: 'Kh&#244;ng th&#7875; t&#7843;i &#7843;nh &#273;&#7841;i di&#7879;n.',
        addressAdded: '&#272;&#227; th&#234;m &#273;&#7883;a ch&#7881; m&#7899;i.',
        addressUpdated: '&#272;&#227; c&#7853;p nh&#7853;t &#273;&#7883;a ch&#7881;.',
        addressDeleted: '&#272;&#227; x&#243;a &#273;&#7883;a ch&#7881;.',
        defaultUpdated: '&#272;&#227; c&#7853;p nh&#7853;t &#273;&#7883;a ch&#7881; m&#7863;c &#273;&#7883;nh.',
        addressFailed: 'Kh&#244;ng th&#7875; l&#432;u &#273;&#7883;a ch&#7881;.',
        passwordUpdated: '&#272;&#227; c&#7853;p nh&#7853;t m&#7853;t kh&#7849;u.',
        passwordShort: 'M&#7853;t kh&#7849;u m&#7899;i c&#7847;n c&#243; &#237;t nh&#7845;t 6 k&#253; t&#7921;.',
        passwordMismatch: 'M&#7853;t kh&#7849;u nh&#7853;p l&#7841;i ch&#432;a kh&#7899;p.',
        passwordFailed: 'Kh&#244;ng th&#7875; &#273;&#7893;i m&#7853;t kh&#7849;u.',
        contactSuccess: 'Tin nh&#7855;n c&#7911;a b&#7841;n &#273;&#227; &#273;&#432;&#7907;c g&#7917;i th&#224;nh c&#244;ng. Ch&#250;ng t&#244;i s&#7869; ph&#7843;n h&#7891;i s&#7899;m.',
        contactFailed: 'Kh&#244;ng th&#7875; g&#7917;i tin nh&#7855;n. Vui l&#242;ng th&#7917; l&#7841;i.',
        contactNotify: '&#272;&#227; g&#7917;i li&#234;n h&#7879; th&#224;nh c&#244;ng.',
        confirmDelete: 'B&#7841;n c&#243; ch&#7855;c mu&#7889;n x&#243;a &#273;&#7883;a ch&#7881; n&#224;y kh&#244;ng?'
    };

    function html(key) { return TXT[key] || ''; }
    function text(key) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = html(key);
        return textarea.value;
    }
    function escapeHtml(value = '') {
        return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function notify(message, type) {
        if (window.authManager?.showNotification) window.authManager.showNotification(message, type || 'success');
    }
    function resolveApiAssetUrl(url = '') {
        const raw = String(url || '').trim();
        if (!raw) return '';
        if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;
        if (raw.startsWith('/')) {
            try { return new URL(raw, api.baseUrl).toString(); } catch (error) { return raw; }
        }
        return raw;
    }
    function getBuyerProfilePayload(response) { return response?.data?.user || response?.data || {}; }
    function getBuyerAvatar(user = {}) { return resolveApiAssetUrl(user.avatar) || (typeof displayImage === 'function' ? displayImage('generic') : ''); }
    function parseBirthDateParts(value) {
        if (!value) return { day: '', month: '', year: '' };
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return { day: '', month: '', year: '' };
        return { day: String(date.getDate()), month: String(date.getMonth() + 1), year: String(date.getFullYear()) };
    }
    function buildSelectOptions(start, end, selected, formatter = (value) => String(value)) {
        const step = start <= end ? 1 : -1;
        const items = [];
        for (let value = start; step > 0 ? value <= end : value >= end; value += step) {
            items.push(`<option value="${value}" ${String(selected) === String(value) ? 'selected' : ''}>${escapeHtml(formatter(value))}</option>`);
        }
        return items.join('');
    }
    function renderAddressRowsOverride(addresses = []) {
        if (!addresses.length) return `<div class="buyer-address-empty"><strong>${html('noAddress')}</strong><p>${html('noAddressDesc')}</p></div>`;
        return addresses.map((address, index) => `
            <article class="buyer-address-card">
                <div class="buyer-address-card-head">
                    <div>
                        <h4>${escapeHtml(address.fullName || text('receiver'))}</h4>
                        <p>${escapeHtml(address.phone || '')}</p>
                    </div>
                    ${address.isDefault ? `<span class="buyer-pill buyer-pill-primary">${html('defaultBadge')}</span>` : ''}
                </div>
                <p class="buyer-address-card-line">${escapeHtml(typeof formatAddressLine === 'function' ? formatAddressLine(address) : [address.street, address.ward, address.district, address.city].filter(Boolean).join(', '))}</p>
                <div class="buyer-address-actions">
                    <button class="btn btn-secondary buyer-inline-button" type="button" data-edit-address="${index}">${html('editAddress')}</button>
                    ${address.isDefault ? '' : `<button class="btn btn-secondary buyer-inline-button" type="button" data-default-address="${index}">${html('defaultAction')}</button>`}
                    <button class="btn btn-secondary buyer-inline-button danger" type="button" data-delete-address="${index}">${html('deleteAddress')}</button>
                </div>
            </article>`).join('');
    }

    async function renderAccountViewOverride() {
        if (typeof requireBuyerView === 'function' && !requireBuyerView()) return;
        const response = await api.getProfile();
        const user = getBuyerProfilePayload(response);
        const addresses = Array.isArray(user.addresses) ? user.addresses : [];
        const birth = parseBirthDateParts(user.dateOfBirth);
        const currentYear = new Date().getFullYear();
        const accountName = user.name || text('buyerName');

        setSpaContent(html('accountTitle'), `
            <div class="buyer-account-shell">
                <aside class="buyer-account-sidebar">
                    <div class="buyer-account-sidebar-card">
                        <div class="buyer-account-sidebar-head">
                            <img id="buyerSidebarAvatar" src="${escapeHtml(getBuyerAvatar(user))}" alt="${escapeHtml(accountName)}" class="buyer-account-sidebar-avatar">
                            <div><h3>${escapeHtml(accountName)}</h3><p>${html('buyerAccount')}</p></div>
                        </div>
                        <nav class="buyer-account-nav">
                            <button class="buyer-account-nav-link is-active" type="button" data-account-nav="profile">${html('profileNav')}</button>
                            <button class="buyer-account-nav-link" type="button" data-account-nav="address">${html('addressNav')}</button>
                            <button class="buyer-account-nav-link" type="button" data-account-nav="password">${html('passwordNav')}</button>
                            <a class="buyer-account-nav-link" href="#orders">${html('ordersNav')}</a>
                            <a class="buyer-account-nav-link" href="#messages">${html('messagesNav')}</a>
                        </nav>
                    </div>
                </aside>
                <section class="buyer-account-main">
                    <article class="buyer-account-card" id="buyerAccountProfileSection">
                        <div class="buyer-account-card-head"><div><h2>${html('profileHeading')}</h2><p>${html('profileDesc')}</p></div></div>
                        <div class="buyer-profile-layout">
                            <form id="buyerProfileForm" class="buyer-account-form">
                                <div class="buyer-form-row buyer-form-row-static"><label>${html('username')}</label><div>${escapeHtml((user.email || '').split('@')[0] || '')}</div></div>
                                <div class="buyer-form-row"><label for="buyerName">${html('fullName')}</label><div><input id="buyerName" name="name" type="text" value="${escapeHtml(user.name || '')}" placeholder="${html('fullName')}" required></div></div>
                                <div class="buyer-form-row buyer-form-row-static"><label>${html('email')}</label><div>${escapeHtml(user.email || '')}</div></div>
                                <div class="buyer-form-row"><label for="buyerPhone">${html('phone')}</label><div><input id="buyerPhone" name="phone" type="text" value="${escapeHtml(user.phone || '')}" placeholder="${html('phone')}" /></div></div>
                                <div class="buyer-form-row"><label>${html('gender')}</label><div class="buyer-radio-group"><label class="buyer-radio-option"><input type="radio" name="gender" value="male" ${user.gender === 'male' ? 'checked' : ''}><span>${html('male')}</span></label><label class="buyer-radio-option"><input type="radio" name="gender" value="female" ${user.gender === 'female' ? 'checked' : ''}><span>${html('female')}</span></label><label class="buyer-radio-option"><input type="radio" name="gender" value="other" ${user.gender === 'other' ? 'checked' : ''}><span>${html('other')}</span></label></div></div>
                                <div class="buyer-form-row"><label>${html('dateOfBirth')}</label><div class="buyer-birth-grid"><select name="birthDay"><option value="">${html('day')}</option>${buildSelectOptions(1, 31, birth.day, (value) => String(value).padStart(2, '0'))}</select><select name="birthMonth"><option value="">${html('month')}</option>${buildSelectOptions(1, 12, birth.month, (value) => `${text('month')} ${value}`)}</select><select name="birthYear"><option value="">${html('year')}</option>${buildSelectOptions(currentYear, 1950, birth.year)}</select></div></div>
                                <div class="buyer-form-actions"><button id="buyerProfileSubmit" class="btn btn-primary" type="submit">${html('saveProfile')}</button></div>
                                <input id="buyerAvatarUrl" name="avatar" type="hidden" value="${escapeHtml(user.avatar || '')}">
                            </form>
                            <div class="buyer-avatar-panel">
                                <div class="buyer-avatar-preview-wrap"><img id="buyerAvatarPreview" src="${escapeHtml(getBuyerAvatar(user))}" alt="${escapeHtml(accountName)}" class="buyer-avatar-preview"></div>
                                <button id="buyerAvatarPickButton" class="btn btn-secondary buyer-avatar-button" type="button">${html('chooseAvatar')}</button>
                                <input id="buyerAvatarFile" type="file" accept="image/*" hidden>
                                <p class="buyer-avatar-note">${html('avatarNote')}</p>
                            </div>
                        </div>
                    </article>
                    <article class="buyer-account-card" id="buyerAccountAddressSection"><div class="buyer-account-card-head"><div><h2>${html('addressHeading')}</h2><p>${html('addressDesc')}</p></div></div><div class="buyer-address-layout"><div id="buyerAddressList" class="buyer-address-list">${renderAddressRowsOverride(addresses)}</div><form id="buyerAddressForm" class="buyer-address-form"><div class="buyer-address-form-head"><h3 id="buyerAddressFormTitle">${html('addNewAddress')}</h3><button id="buyerAddressCancelButton" class="btn btn-secondary buyer-inline-button is-hidden" type="button">${html('cancelEdit')}</button></div><input type="hidden" name="editIndex" value="-1"><div class="buyer-form-grid"><input name="fullName" type="text" placeholder="${html('recipientName')}" required><input name="phone" type="text" placeholder="${html('phone')}" required><input name="street" type="text" placeholder="${html('street')}" required><input name="ward" type="text" placeholder="${html('ward')}"><input name="district" type="text" placeholder="${html('district')}"><input name="city" type="text" placeholder="${html('city')}" required></div><label class="buyer-checkbox-row"><input name="isDefault" type="checkbox"><span>${html('setDefaultAddress')}</span></label><div class="buyer-form-actions"><button id="buyerAddressSubmit" class="btn btn-primary" type="submit">${html('saveAddress')}</button></div></form></div></article>
                    <article class="buyer-account-card" id="buyerAccountPasswordSection"><div class="buyer-account-card-head"><div><h2>${html('passwordHeading')}</h2><p>${html('passwordDesc')}</p></div></div><form id="buyerPasswordForm" class="buyer-account-form buyer-password-form"><div class="buyer-form-row"><label for="buyerCurrentPassword">${html('currentPassword')}</label><div><input id="buyerCurrentPassword" name="currentPassword" type="password" placeholder="${html('currentPassword')}" required></div></div><div class="buyer-form-row"><label for="buyerNewPassword">${html('newPassword')}</label><div><input id="buyerNewPassword" name="newPassword" type="password" placeholder="${html('newPassword')}" required></div></div><div class="buyer-form-row"><label for="buyerConfirmPassword">${html('confirmPassword')}</label><div><input id="buyerConfirmPassword" name="confirmPassword" type="password" placeholder="${html('confirmPassword')}" required></div></div><div class="buyer-form-actions"><button id="buyerPasswordSubmit" class="btn btn-primary" type="submit">${html('savePassword')}</button></div></form></article>
                </section>
            </div>`);

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
        const scrollMap = { profile: document.getElementById('buyerAccountProfileSection'), address: document.getElementById('buyerAccountAddressSection'), password: document.getElementById('buyerAccountPasswordSection') };

        document.querySelectorAll('[data-account-nav]').forEach((button) => {
            button.addEventListener('click', () => {
                document.querySelectorAll('[data-account-nav]').forEach((item) => item.classList.remove('is-active'));
                button.classList.add('is-active');
                scrollMap[button.dataset.accountNav]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });

        function syncAvatar(url) {
            const resolved = resolveApiAssetUrl(url) || (typeof displayImage === 'function' ? displayImage('generic') : '');
            avatarPreview.src = resolved;
            sidebarAvatar.src = resolved;
            avatarUrlInput.value = url || '';
        }

        function resetAddressForm() {
            addressForm.reset();
            addressForm.editIndex.value = '-1';
            addressTitle.innerHTML = html('addNewAddress');
            addressSubmitButton.innerHTML = html('saveAddress');
            addressCancelButton.classList.add('is-hidden');
        }

        avatarButton.addEventListener('click', () => avatarInput.click());
        avatarInput.addEventListener('change', async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const originalText = avatarButton.textContent;
            avatarButton.disabled = true;
            avatarButton.textContent = text('uploadLoading');
            try {
                const uploadResponse = await api.uploadImage(file, 'avatars');
                syncAvatar(uploadResponse?.data?.url || '');
                notify(text('avatarUploaded'), 'success');
            } catch (error) {
                notify(error.message || text('avatarFailed'), 'error');
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
            button.textContent = text('saveLoading');
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
                notify(text('profileUpdated'), 'success');
                renderAccountViewExpandedOverride();
            } catch (error) {
                notify(error.message || 'Khong the cap nhat ho so.', 'error');
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
            if (editIndex >= 0 && nextAddresses[editIndex]) nextAddresses[editIndex] = { ...nextAddresses[editIndex], ...nextAddress };
            else nextAddresses.push(nextAddress);
            if (nextAddress.isDefault) {
                nextAddresses.forEach((address, index) => {
                    address.isDefault = index === (editIndex >= 0 ? editIndex : nextAddresses.length - 1);
                });
            } else if (nextAddresses.length === 1) {
                nextAddresses[0].isDefault = true;
            }
            const originalText = addressSubmitButton.textContent;
            addressSubmitButton.disabled = true;
            addressSubmitButton.textContent = editIndex >= 0 ? text('updateLoading') : text('addLoading');
            try {
                await api.updateProfile({ addresses: nextAddresses });
                notify(text(editIndex >= 0 ? 'addressUpdated' : 'addressAdded'), 'success');
                renderAccountViewExpandedOverride();
            } catch (error) {
                notify(error.message || text('addressFailed'), 'error');
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
                addressTitle.innerHTML = 'Ch&#7881;nh s&#7917;a &#273;&#7883;a ch&#7881;';
                addressSubmitButton.innerHTML = 'C&#7853;p nh&#7853;t &#273;&#7883;a ch&#7881;';
                addressCancelButton.classList.remove('is-hidden');
                scrollMap.address?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });

        document.querySelectorAll('[data-default-address]').forEach((button) => {
            button.addEventListener('click', async () => {
                const selectedIndex = Number(button.dataset.defaultAddress);
                const nextAddresses = addresses.map((address, index) => ({ ...address, isDefault: index === selectedIndex }));
                try {
                    await api.updateProfile({ addresses: nextAddresses });
                    notify(text('defaultUpdated'), 'success');
                    renderAccountViewExpandedOverride();
                } catch (error) {
                    notify(error.message || text('addressFailed'), 'error');
                }
            });
        });

        document.querySelectorAll('[data-delete-address]').forEach((button) => {
            button.addEventListener('click', async () => {
                if (!confirm(text('confirmDelete'))) return;
                const selectedIndex = Number(button.dataset.deleteAddress);
                const nextAddresses = addresses.filter((_, index) => index !== selectedIndex).map((address) => ({ ...address }));
                if (nextAddresses.length && !nextAddresses.some((address) => address.isDefault)) nextAddresses[0].isDefault = true;
                try {
                    await api.updateProfile({ addresses: nextAddresses });
                    notify(text('addressDeleted'), 'success');
                    renderAccountViewExpandedOverride();
                } catch (error) {
                    notify(error.message || text('addressFailed'), 'error');
                }
            });
        });

        passwordForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(passwordForm);
            const currentPassword = String(formData.get('currentPassword') || '');
            const newPassword = String(formData.get('newPassword') || '');
            const confirmPassword = String(formData.get('confirmPassword') || '');
            if (newPassword.length < 6) return notify(text('passwordShort'), 'error');
            if (newPassword !== confirmPassword) return notify(text('passwordMismatch'), 'error');
            const button = document.getElementById('buyerPasswordSubmit');
            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = text('updateLoading');
            try {
                await api.changePassword(currentPassword, newPassword);
                passwordForm.reset();
                notify(text('passwordUpdated'), 'success');
            } catch (error) {
                notify(error.message || text('passwordFailed'), 'error');
            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });
    }

    const renderAccountViewBase = renderAccountViewOverride;

    async function renderContactViewOverride() {
        const response = await api.getContactInfo();
        const info = response?.data || {};
        const mapUrl = info.mapUrl || '#';

        setSpaContent(html('contactTitle'), `<div class="contact-shell"><header class="contact-hero"><h2>${html('contactHero')}</h2><p>${html('contactDesc')}</p></header><div class="contact-grid"><section class="contact-sidebar"><article class="contact-card contact-info-card"><h3>${html('contactInfo')}</h3><div class="contact-info-list"><div class="contact-info-item"><span class="contact-info-icon">☎</span><div><strong>${html('hotline')}</strong><p>${escapeHtml(info.phone || '1900 0000')}</p></div></div><div class="contact-info-item"><span class="contact-info-icon">✉</span><div><strong>${html('email')}</strong><p>${escapeHtml(info.email || 'support@petshop.local')}</p></div></div><div class="contact-info-item"><span class="contact-info-icon">⌂</span><div><strong>${html('address')}</strong><p>${escapeHtml(info.address || '123 Pet Street, TP. HCM')}</p></div></div><div class="contact-info-item"><span class="contact-info-icon">◷</span><div><strong>${html('workingHours')}</strong><p>${escapeHtml(info.workingHours || '08:00 - 21:00')}</p></div></div></div></article><article class="contact-card contact-map-card"><div class="contact-map-visual"><img src="${resolveApiAssetUrl(info.mapImage) || (typeof displayImage === 'function' ? displayImage('article') : '')}" alt="Ban do lien he"><div class="contact-map-overlay"><a class="btn btn-secondary contact-map-button" href="${escapeHtml(mapUrl)}" target="_blank" rel="noreferrer">${html('mapButton')}</a></div></div></article></section><section class="contact-card contact-form-card"><form id="spaContactForm" class="contact-form-grid"><div class="contact-field"><label for="contactName">${html('fullName')}</label><input id="contactName" name="name" type="text" placeholder="${html('fullNamePlaceholder')}" required></div><div class="contact-field"><label for="contactEmail">${html('email')}</label><input id="contactEmail" name="email" type="email" placeholder="${html('emailPlaceholder')}" required></div><div class="contact-field"><label for="contactPhone">${html('phone')}</label><input id="contactPhone" name="phone" type="tel" placeholder="${html('phonePlaceholder')}"></div><div class="contact-field"><label for="contactSubject">Chu de</label><select id="contactSubject" name="subject"><option>${html('supportCustomer')}</option><option>${html('businessTopic')}</option><option>${html('feedbackTopic')}</option><option>${html('otherTopic')}</option></select></div><div class="contact-field contact-field-full"><label for="contactMessage">${html('message')}</label><textarea id="contactMessage" name="message" rows="6" placeholder="${html('messagePlaceholder')}" required></textarea></div><div class="contact-form-actions"><button id="contactSubmitButton" class="btn btn-primary" type="submit">${html('sendMessage')}</button><p id="spaContactMessage" class="contact-form-message"></p></div></form></section></div></div>`);

        document.getElementById('spaContactForm').addEventListener('submit', async (event) => {
            event.preventDefault();
            const button = document.getElementById('contactSubmitButton');
            const message = document.getElementById('spaContactMessage');
            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = text('sendLoading');
            message.textContent = '';
            message.className = 'contact-form-message';
            try {
                await api.sendContact(Object.fromEntries(new FormData(event.currentTarget).entries()));
                event.currentTarget.reset();
                message.textContent = text('contactSuccess');
                message.classList.add('is-success');
                notify(text('contactNotify'), 'success');
            } catch (error) {
                message.textContent = error.message || text('contactFailed');
                message.classList.add('is-error');
                notify(error.message || text('contactFailed'), 'error');
            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });
    }

    async function renderContactViewCleanOverride() {
        const response = await api.getContactInfo();
        const info = response?.data || {};
        const mapUrl = info.mapUrl || '#';
        setSpaContent(html('contactTitle'), `<div class="contact-shell"><header class="contact-hero"><h2>${html('contactHero')}</h2><p>${html('contactDesc')}</p></header><div class="contact-grid"><section class="contact-sidebar"><article class="contact-card contact-info-card"><h3>${html('contactInfo')}</h3><div class="contact-info-list"><div class="contact-info-item"><span class="contact-info-icon">TEL</span><div><strong>${html('hotline')}</strong><p>${escapeHtml(info.phone || '1900 0000')}</p></div></div><div class="contact-info-item"><span class="contact-info-icon">MAIL</span><div><strong>${html('email')}</strong><p>${escapeHtml(info.email || 'support@petshop.local')}</p></div></div><div class="contact-info-item"><span class="contact-info-icon">MAP</span><div><strong>${html('address')}</strong><p>${escapeHtml(info.address || '123 Pet Street, TP. HCM')}</p></div></div><div class="contact-info-item"><span class="contact-info-icon">TIME</span><div><strong>${html('workingHours')}</strong><p>${escapeHtml(info.workingHours || '08:00 - 21:00')}</p></div></div></div></article><article class="contact-card contact-map-card"><div class="contact-map-visual"><img src="${resolveApiAssetUrl(info.mapImage) || (typeof displayImage === 'function' ? displayImage('article') : '')}" alt="Ban do lien he"><div class="contact-map-overlay"><a class="btn btn-secondary contact-map-button" href="${escapeHtml(mapUrl)}" target="_blank" rel="noreferrer">${html('mapButton')}</a></div></div></article></section><section class="contact-card contact-form-card"><form id="spaContactForm" class="contact-form-grid"><div class="contact-field"><label for="contactName">${html('fullName')}</label><input id="contactName" name="name" type="text" placeholder="${html('fullNamePlaceholder')}" required></div><div class="contact-field"><label for="contactEmail">${html('email')}</label><input id="contactEmail" name="email" type="email" placeholder="${html('emailPlaceholder')}" required></div><div class="contact-field"><label for="contactPhone">${html('phone')}</label><input id="contactPhone" name="phone" type="tel" placeholder="${html('phonePlaceholder')}"></div><div class="contact-field"><label for="contactSubject">Chu de</label><select id="contactSubject" name="subject"><option>${html('supportCustomer')}</option><option>${html('businessTopic')}</option><option>${html('feedbackTopic')}</option><option>${html('otherTopic')}</option></select></div><div class="contact-field contact-field-full"><label for="contactMessage">${html('message')}</label><textarea id="contactMessage" name="message" rows="6" placeholder="${html('messagePlaceholder')}" required></textarea></div><div class="contact-form-actions"><button id="contactSubmitButton" class="btn btn-primary" type="submit">${html('sendMessage')}</button><p id="spaContactMessage" class="contact-form-message"></p></div></form></section></div></div>`);
        document.getElementById('spaContactForm').addEventListener('submit', async (event) => {
            event.preventDefault();
            const button = document.getElementById('contactSubmitButton');
            const message = document.getElementById('spaContactMessage');
            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = text('sendLoading');
            message.textContent = '';
            message.className = 'contact-form-message';
            try {
                await api.sendContact(Object.fromEntries(new FormData(event.currentTarget).entries()));
                event.currentTarget.reset();
                message.textContent = text('contactSuccess');
                message.classList.add('is-success');
                notify(text('contactNotify'), 'success');
            } catch (error) {
                message.textContent = error.message || text('contactFailed');
                message.classList.add('is-error');
                notify(error.message || text('contactFailed'), 'error');
            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });
    }

    async function renderNotificationsViewOverride() {
        if (typeof requireBuyerView === 'function' && !requireBuyerView()) return;
        const response = await api.getNotifications({ limit: 50 });
        const data = response?.data || {};
        const notifications = data.notifications || [];
        setSpaContent('Th&#244;ng b&#225;o', `<div class="contact-shell"><header class="contact-hero"><h2>Th&#244;ng b&#225;o</h2><p>C&#7853;p nh&#7853;t v&#7873; &#273;&#417;n h&#224;ng, khuy&#7871;n m&#7841;i v&#224; nh&#7919;ng thay &#273;&#7893;i li&#234;n quan &#273;&#7871;n t&#224;i kho&#7843;n c&#7911;a b&#7841;n.</p></header><section class="contact-card"><div class="buyer-account-card-head"><div></div><button class="btn btn-secondary" id="markAllRead">Danh dau da doc tat ca</button></div><div class="buyer-address-list">${notifications.map((item) => `<article class="buyer-address-card"><div class="buyer-address-card-head"><div><h4>${escapeHtml(item.title || 'Thong bao')}</h4><p>${escapeHtml(item.message || '')}</p></div><span class="buyer-pill ${item.isRead ? '' : 'buyer-pill-primary'}">${item.isRead ? '&#272;&#227; &#273;&#7885;c' : 'Ch&#432;a &#273;&#7885;c'}</span></div><p class="buyer-address-card-line">${escapeHtml(item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '')}</p></article>`).join('') || `<div class="buyer-address-empty"><strong>Ch&#432;a c&#243; th&#244;ng b&#225;o n&#224;o.</strong></div>`}</div></section></div>`);
        document.getElementById('markAllRead')?.addEventListener('click', async () => {
            await api.markAllNotificationsRead();
            notify('Da danh dau tat ca thong bao da doc.', 'success');
            renderNotificationsViewOverride();
        });
    }

    async function renderResetPasswordViewOverride(params) {
        const token = params.get('token') || '';
        const email = params.get('email') || '';
        setSpaContent('&#272;&#7863;t l&#7841;i m&#7853;t kh&#7849;u', `<div class="contact-shell"><section class="contact-card" style="max-width:560px;margin:0 auto;"><div class="buyer-account-card-head"><div><h2>&#272;&#7863;t l&#7841;i m&#7853;t kh&#7849;u</h2><p>${email ? `Cap nhat mat khau cho <strong>${escapeHtml(email)}</strong>.` : 'Nhap mat khau moi cho tai khoan cua ban.'}</p></div></div><form id="spaResetPasswordForm" class="buyer-account-form"><div class="buyer-form-row" style="grid-template-columns:1fr;"><div><input type="password" name="newPassword" placeholder="Mat khau moi, vi du: Petshop2" required minlength="6"></div></div><div class="buyer-form-actions"><button class="btn btn-primary" type="submit" ${token ? '' : 'disabled'}>Dat lai mat khau</button></div>${token ? '' : '<p>Thieu ma dat lai mat khau. Vui long yeu cau lien ket moi tu muc Dang nhap -&gt; Quen mat khau.</p>'}</form></section></div>`);
        document.getElementById('spaResetPasswordForm').addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            try {
                await api.resetPassword(token, formData.get('newPassword'));
                notify('Da dat lai mat khau. Vui long dang nhap lai.', 'success');
                window.location.hash = '';
                authManager.showLoginModal?.();
            } catch (error) {
                notify(error.message || 'Dat lai mat khau that bai.', 'error');
            }
        });
    }

    function bindAccountSectionNavigation(button, target) {
        if (!button || !target) return;
        button.addEventListener('click', () => {
            document.querySelectorAll('.buyer-account-nav-link').forEach((item) => item.classList.remove('is-active'));
            button.classList.add('is-active');
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    async function renderAccountSectionView(sectionId, navSelector) {
        await renderAccountViewExpandedOverride();
        const section = document.getElementById(sectionId);
        const navButton = navSelector ? document.querySelector(navSelector) : null;

        document.querySelectorAll('.buyer-account-nav-link').forEach((item) => item.classList.remove('is-active'));
        if (navButton) navButton.classList.add('is-active');

        if (section) {
            requestAnimationFrame(() => {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
    }

    function renderBuyerOrdersSection(orders = []) {
        if (!orders.length) {
            return `<div class="buyer-address-empty"><strong>Bạn chưa có đơn hàng nào.</strong><p>Khi phát sinh đơn hàng mới, thông tin sẽ hiển thị tại đây.</p></div>`;
        }

        return orders.map((order) => `
            <article class="order-card">
                <div class="order-card-top">
                    <div>
                        <h3><a href="#order?id=${escapeHtml(order._id || '')}">#${escapeHtml(order.orderNumber || order._id || '--')}</a></h3>
                        <p class="order-card-date">${escapeHtml(order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '')}</p>
                    </div>
                    <div class="order-card-total">${typeof formatCurrency === 'function' ? formatCurrency(order.finalAmount || order.total || 0) : (order.finalAmount || order.total || 0)}</div>
                </div>
                <div class="order-card-badges">
                    ${typeof getOrderStatusBadge === 'function' ? getOrderStatusBadge(order) : ''}
                    ${typeof getPaymentStatusBadge === 'function' ? getPaymentStatusBadge(order) : ''}
                    ${typeof getShippingStatusBadge === 'function' ? getShippingStatusBadge(order) : ''}
                </div>
                <div class="order-card-meta">
                    <span>${escapeHtml(typeof formatPaymentMethod === 'function' ? formatPaymentMethod(order.paymentMethod || order.payment?.method || 'cod') : (order.paymentMethod || 'COD'))}</span>
                    <span>${escapeHtml(String((order.items || []).length))} sản phẩm</span>
                </div>
                <div class="order-card-actions">
                    <a class="btn btn-secondary" href="#order?id=${escapeHtml(order._id || '')}">Xem chi tiết</a>
                    ${['shipping', 'delivered', 'completed'].includes(String(order.orderStatus || order.status || '').toLowerCase()) ? `<a class="btn btn-secondary" href="#order?id=${escapeHtml(order._id || '')}">Trả hàng</a>` : ''}
                </div>
            </article>
        `).join('');
    }

    function renderBuyerCareSection(bookings = []) {
        if (!bookings.length) {
            return `<div class="buyer-address-empty"><strong>Chưa có lịch hẹn chăm sóc nào.</strong><p>Khi bạn đặt dịch vụ chăm sóc, lịch hẹn sẽ xuất hiện tại đây.</p></div>`;
        }

        return bookings.map((booking) => `
            <article class="order-card">
                <div class="order-card-top">
                    <div>
                        <h3>${escapeHtml(booking.service?.name || 'Dịch vụ chăm sóc')}</h3>
                        <p class="order-card-date">${escapeHtml(booking.appointmentDate ? new Date(booking.appointmentDate).toLocaleString('vi-VN') : '')}</p>
                    </div>
                    <div class="order-card-total">${typeof formatCurrency === 'function' ? formatCurrency(booking.totalAmount || 0) : (booking.totalAmount || 0)}</div>
                </div>
                <div class="order-card-badges">
                    ${typeof buildStatusBadge === 'function' ? buildStatusBadge(typeof formatReadableStatus === 'function' ? formatReadableStatus(booking.status || 'pending') : (booking.status || 'pending'), booking.status === 'completed' ? 'success' : (booking.status === 'cancelled' || booking.status === 'rejected' ? 'danger' : 'info')) : ''}
                    <span class="status-badge status-badge-neutral">${escapeHtml(booking.shop?.name || 'Shop dịch vụ')}</span>
                </div>
                <div class="order-card-meta">
                    <span>${escapeHtml(booking.timeSlot || 'Chưa chọn khung giờ')}</span>
                    <span>${escapeHtml(booking.petName || 'Thú cưng của bạn')}</span>
                    <span>${escapeHtml(booking.petType || 'Chưa cập nhật loại thú cưng')}</span>
                </div>
                <div class="order-card-actions">
                    ${['pending', 'confirmed'].includes(String(booking.status || '').toLowerCase()) ? `<button class="btn btn-secondary buyer-cancel-care" type="button" data-care-booking-id="${escapeHtml(booking._id || '')}">Hủy lịch</button>` : ''}
                    ${booking.status === 'completed' && !booking.reviewedAt ? `<button class="btn btn-primary buyer-review-care" type="button" data-care-booking-id="${escapeHtml(booking._id || '')}">Đánh giá dịch vụ</button>` : ''}
                    ${booking.shop?._id ? `<a class="btn btn-secondary" href="#shop-detail?id=${escapeHtml(booking.shop._id)}">Xem shop</a>` : ''}
                </div>
            </article>
        `).join('');
    }

    function renderBuyerWishlistSection(items = []) {
        if (!items.length) {
            return `<div class="buyer-address-empty"><strong>Danh sách yêu thích đang trống.</strong><p>Hãy lưu những sản phẩm bạn thích để xem lại nhanh hơn.</p></div>`;
        }

        return items.map((item) => {
            const product = item.product || {};
            const image = typeof productImage === 'function' ? productImage(product) : '';
            return `
                <article class="buyer-address-card">
                    <div class="buyer-address-card-head" style="align-items:flex-start; gap:16px;">
                        <div style="display:flex; gap:16px; width:100%;">
                            <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name || 'Sản phẩm')}" style="width:84px;height:84px;border-radius:16px;object-fit:cover;flex-shrink:0;">
                            <div style="display:grid; gap:6px;">
                                <h4 style="margin:0;">${escapeHtml(product.name || 'Sản phẩm yêu thích')}</h4>
                                <p style="margin:0;">${escapeHtml(product.brand || 'Cửa hàng thú cưng')}</p>
                                <p style="margin:0;font-weight:700;">${typeof formatCurrency === 'function' ? formatCurrency(product.price || 0) : (product.price || 0)}</p>
                            </div>
                        </div>
                    </div>
                    <div class="buyer-address-actions">
                        <a class="btn btn-secondary buyer-inline-button" href="#product?id=${escapeHtml(product._id || '')}">Xem chi tiết</a>
                        <button class="btn btn-primary buyer-inline-button" type="button" data-wishlist-add-cart="${escapeHtml(product._id || '')}">Thêm giỏ hàng</button>
                        <button class="btn btn-secondary buyer-inline-button danger" type="button" data-wishlist-remove="${escapeHtml(product._id || '')}">Xóa</button>
                    </div>
                </article>
            `;
        }).join('');
    }

    async function renderAccountViewExpandedOverride() {
        await renderAccountViewBase();

        const main = document.querySelector('.buyer-account-main');
        const nav = document.querySelector('.buyer-account-nav');
        if (!main || !nav) return;

        const [ordersResponse, bookingsResponse, wishlistResponse] = await Promise.all([
            api.getOrders({ limit: 20 }).catch(() => ({ data: [] })),
            api.getMyCareServiceBookings({ limit: 20 }).catch(() => ({ data: [] })),
            api.getWishlist().catch(() => ({ data: [] }))
        ]);

        const orders = ordersResponse?.data || [];
        const bookings = bookingsResponse?.data || [];
        const wishlist = wishlistResponse?.data || [];

        const currentOrdersLink = nav.querySelector('a[href="#orders"]');
        if (currentOrdersLink) {
            currentOrdersLink.outerHTML = `<button class="buyer-account-nav-link" type="button" data-account-extra-nav="orders">Đơn hàng của tôi</button>`;
        }

        nav.insertAdjacentHTML('beforeend', `
            <button class="buyer-account-nav-link" type="button" data-account-extra-nav="care">Lịch hẹn chăm sóc</button>
            <button class="buyer-account-nav-link" type="button" data-account-extra-nav="wishlist">Danh sách yêu thích</button>
        `);

        main.insertAdjacentHTML('beforeend', `
            <article class="buyer-account-card" id="buyerAccountOrdersSection">
                <div class="buyer-account-card-head"><div><h2>Đơn hàng của tôi</h2><p>Theo dõi trạng thái các đơn hàng gần đây của bạn.</p></div></div>
                <div class="orders-shell">${renderBuyerOrdersSection(orders)}</div>
            </article>
            <article class="buyer-account-card" id="buyerAccountCareSection">
                <div class="buyer-account-card-head"><div><h2>Lịch hẹn chăm sóc</h2><p>Quản lý các lịch tắm, grooming, lưu trú và chăm sóc khác đã đặt.</p></div></div>
                <div class="orders-shell">${renderBuyerCareSection(bookings)}</div>
            </article>
            <article class="buyer-account-card" id="buyerAccountWishlistSection">
                <div class="buyer-account-card-head"><div><h2>Danh sách yêu thích</h2><p>Lưu lại những sản phẩm bạn muốn mua sau hoặc theo dõi thường xuyên.</p></div></div>
                <div class="buyer-address-list">${renderBuyerWishlistSection(wishlist)}</div>
            </article>
        `);

        bindAccountSectionNavigation(document.querySelector('[data-account-extra-nav="orders"]'), document.getElementById('buyerAccountOrdersSection'));
        bindAccountSectionNavigation(document.querySelector('[data-account-extra-nav="care"]'), document.getElementById('buyerAccountCareSection'));
        bindAccountSectionNavigation(document.querySelector('[data-account-extra-nav="wishlist"]'), document.getElementById('buyerAccountWishlistSection'));

        document.querySelectorAll('[data-wishlist-add-cart]').forEach((button) => {
            button.addEventListener('click', async () => {
                await addToCart(button.dataset.wishlistAddCart);
            });
        });

        document.querySelectorAll('[data-wishlist-remove]').forEach((button) => {
            button.addEventListener('click', async () => {
                await api.removeFromWishlist(button.dataset.wishlistRemove);
                notify('Đã xóa sản phẩm khỏi danh sách yêu thích.', 'success');
                renderAccountViewExpandedOverride();
            });
        });

        document.querySelectorAll('.buyer-cancel-care').forEach((button) => {
            button.addEventListener('click', async () => {
                await api.cancelMyCareServiceBooking(button.dataset.careBookingId, 'Khách hàng hủy lịch');
                notify('Đã hủy lịch hẹn chăm sóc.', 'success');
                renderAccountViewExpandedOverride();
            });
        });

        document.querySelectorAll('.buyer-review-care').forEach((button) => {
            button.addEventListener('click', async () => {
                const rating = prompt('Chấm điểm dịch vụ từ 1 đến 5 sao', '5');
                if (!rating) return;
                const comment = prompt('Nhận xét về dịch vụ', '') || '';
                await api.createCareServiceReview(button.dataset.careBookingId, {
                    rating: Number(rating),
                    comment
                });
                notify('Đã gửi đánh giá dịch vụ.', 'success');
                renderAccountViewExpandedOverride();
            });
        });
    }

    function repairCatalogText(value = '') {
        const raw = String(value || '');
        if (!raw) return '';
        if (!/[ÃÂÆÄá»]/.test(raw)) return raw;
        try {
            return decodeURIComponent(escape(raw));
        } catch (error) {
            try {
                const bytes = Uint8Array.from(raw.split('').map((char) => char.charCodeAt(0) & 255));
                return new TextDecoder('utf-8').decode(bytes);
            } catch (decodeError) {
                return raw;
            }
        }
    }

    function translateCatalogText(value = '') {
        let textValue = repairCatalogText(value);
        const phraseMap = [
            ['Pet Product', 'Sản phẩm thú cưng'],
            ['Long Training Leash', 'Dây dắt huấn luyện dài'],
            ['Reflective Harness', 'Đai yếm phản quang'],
            ['Ceramic Heat Emitter', 'Bóng sưởi gốm'],
            ['Bio Filter Media', 'Vật liệu lọc sinh học'],
            ['Training Leash', 'Dây dắt huấn luyện'],
            ['Harness', 'Đai yếm'],
            ['Filter Media', 'Vật liệu lọc'],
            ['Heat Emitter', 'Bóng sưởi'],
            ['Dog Food', 'Thức ăn cho chó'],
            ['Cat Food', 'Thức ăn cho mèo'],
            ['Pet Bed', 'Đệm ngủ thú cưng'],
            ['Pet Toy', 'Đồ chơi thú cưng'],
            ['Cat Litter', 'Cát vệ sinh cho mèo'],
            ['Bird Cage', 'Lồng chim'],
            ['Aquarium', 'Bể cá'],
            ['Pet Shampoo', 'Dầu gội thú cưng'],
            ['Dog', 'Chó'],
            ['Cat', 'Mèo'],
            ['Bird', 'Chim'],
            ['Fish', 'Cá'],
            ['Leash', 'Dây dắt'],
            ['Toy', 'Đồ chơi'],
            ['Food', 'Thức ăn'],
            ['Bed', 'Đệm ngủ'],
            ['Litter', 'Cát vệ sinh'],
            ['Cage', 'Lồng'],
            ['Spa', 'Chăm sóc']
        ];

        phraseMap.forEach(([from, to]) => {
            textValue = textValue.replace(new RegExp(from, 'gi'), to);
        });

        return textValue;
    }

    function buildCatalogActionButtonsVi(productId) {
        if (typeof isSellerBuyingBlocked === 'function' && isSellerBuyingBlocked()) {
            return `
                <a class="btn btn-secondary btn-small" href="#product?id=${productId}">Xem chi tiết</a>
                <a class="btn btn-secondary btn-small" href="/pages/seller/dashboard.html">Về dashboard</a>
            `;
        }

        return `
            <a class="btn btn-secondary btn-small" href="#product?id=${productId}">Xem chi tiết</a>
            <button class="btn btn-primary btn-small quick-add" type="button" data-product-action="quick-add" data-product-id="${productId}">Thêm giỏ</button>
            <button class="btn btn-secondary btn-small" type="button" data-product-action="buy-now" data-product-id="${productId}">Mua ngay</button>
        `;
    }

    function createProductCardVi(product) {
        const price = product.price || 0;
        const originalPrice = product.originalPrice || product.salePrice;
        const discount = originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0;
        const image = typeof productImage === 'function' ? productImage(product) : '';
        const name = translateCatalogText(product.name || 'Sản phẩm');
        const brand = translateCatalogText(product.brand || 'Cửa hàng thú cưng');
        const rating = product.rating || 4.5;
        const reviewCount = product.reviewCount || 0;
        const productId = product._id || product.id;
        const shop = product.shop || {};
        const shopId = shop._id || '';
        const shopName = shop.name || 'Cửa hàng';
        const shopBadges = typeof renderShopLabelBadges === 'function' ? renderShopLabelBadges(shop) : '';

        return `
            <div class="product-card" data-product-id="${productId}">
                <div class="product-image">
                    ${discount > 0 ? `<span class="product-badge badge-sale">-${discount}%</span>` : ''}
                    <a href="#product?id=${productId}">
                        <img src="${image}" alt="${escapeHtml(name)}" class="product-img" loading="lazy">
                    </a>
                </div>
                <div class="product-info">
                    <span class="product-brand">${escapeHtml(brand)}</span>
                    <h4 class="product-name"><a href="#product?id=${productId}">${escapeHtml(name)}</a></h4>
                    ${shopId ? `<div class="product-shop-meta"><a class="product-shop-link" href="#shop-detail?id=${shopId}">${escapeHtml(shopName)}</a>${shopBadges}</div>` : ''}
                    <div class="product-rating">
                        <div class="stars">${typeof appGenerateStars === 'function' ? appGenerateStars(rating) : ''}</div>
                        <span>(${reviewCount})</span>
                    </div>
                    <div class="product-price">
                        <span class="price-current">${typeof formatCurrency === 'function' ? formatCurrency(price) : price}</span>
                        ${originalPrice > price ? `<span class="price-old">${typeof formatCurrency === 'function' ? formatCurrency(originalPrice) : originalPrice}</span>` : ''}
                    </div>
                    <div class="product-delivery"><i class="fas fa-truck"></i> Giao nhanh trong ngày</div>
                    <div class="product-card-actions">
                        ${buildCatalogActionButtonsVi(productId)}
                    </div>
                </div>
            </div>
        `;
    }

    window.renderAddressRows = renderAddressRowsOverride;
    window.renderAccountView = renderAccountViewExpandedOverride;
    window.renderAccountViewOverride = renderAccountViewBase;
    window.renderContactView = renderContactViewCleanOverride;
    window.renderOrdersView = () => renderAccountSectionView('buyerAccountOrdersSection', '[data-account-extra-nav="orders"]');
    window.renderCareServiceBookingsView = () => renderAccountSectionView('buyerAccountCareSection', '[data-account-extra-nav="care"]');
    window.renderWishlistView = () => renderAccountSectionView('buyerAccountWishlistSection', '[data-account-extra-nav="wishlist"]');
    window.renderNotificationsView = renderNotificationsViewOverride;
    window.renderResetPasswordView = renderResetPasswordViewOverride;
    renderAddressRows = renderAddressRowsOverride;
    renderAccountView = renderAccountViewExpandedOverride;
    renderAccountViewOverride = renderAccountViewBase;
    renderContactView = renderContactViewCleanOverride;
    renderOrdersView = window.renderOrdersView;
    renderCareServiceBookingsView = window.renderCareServiceBookingsView;
    renderWishlistView = window.renderWishlistView;
    renderNotificationsView = renderNotificationsViewOverride;
    renderResetPasswordView = renderResetPasswordViewOverride;

    function rerenderBuyerRouteIfNeeded() {
        if (typeof parseHashRoute !== 'function') return;
        const { route } = parseHashRoute();
        const supportedRoutes = new Set([
            'account',
            'contact',
            'orders',
            'service-bookings',
            'wishlist',
            'notifications',
            'reset-password'
        ]);

        if (!supportedRoutes.has(route)) {
            return;
        }

        const rerender = typeof window.renderHashView === 'function'
            ? window.renderHashView
            : (typeof renderHashView === 'function' ? renderHashView : null);

        if (typeof rerender === 'function') {
            Promise.resolve()
                .then(() => rerender())
                .catch((error) => console.warn('Buyer UI rerender skipped:', error));
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', rerenderBuyerRouteIfNeeded, { once: true });
    } else {
        setTimeout(rerenderBuyerRouteIfNeeded, 0);
    }
})();
