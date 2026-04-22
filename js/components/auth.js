class AuthManager {
    constructor() {
        this.api = api;
        this.user = null;
        this.shop = null;
        this.sellerApplication = null;
        this.sellerAccess = null;
        this.isAuthenticated = false;
        
        this.init();
    }

    safeReadStorageJson(key) {
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        try {
            return JSON.parse(raw);
        } catch (error) {
            console.warn(`Ignoring invalid JSON in localStorage key "${key}"`, error);
            localStorage.removeItem(key);
            return null;
        }
    }

    findAccountActionContainer() {
        const existing = document.querySelector('.account-action');
        if (existing) return existing;

        return Array.from(document.querySelectorAll('.header-action')).find((node) => {
            return node.querySelector('.fa-user, .fa-user-circle');
        }) || null;
    }

    init() {
        this.checkAuthStatus();
        this.setupEventListeners();
    }

    checkAuthStatus() {
        const token = localStorage.getItem('accessToken');
        const userData = localStorage.getItem('user');
        const shopData = localStorage.getItem('shop');
        const sellerApplicationData = localStorage.getItem('sellerApplication');
        const sellerAccessData = localStorage.getItem('sellerAccess');
        const role = localStorage.getItem('role');

        if (token && userData) {
            this.user = this.safeReadStorageJson('user');
            if (!this.user) {
                this.api.logout();
                this.shop = null;
                this.sellerApplication = null;
                this.sellerAccess = null;
                this.isAuthenticated = false;
                this.updateUI();
                return;
            }
            if (role && !this.user.role) {
                this.user.role = role;
            }
            this.shop = shopData ? this.safeReadStorageJson('shop') : null;
            this.sellerApplication = sellerApplicationData ? this.safeReadStorageJson('sellerApplication') : null;
            this.sellerAccess = sellerAccessData ? this.safeReadStorageJson('sellerAccess') : null;
            this.isAuthenticated = true;
        } else {
            this.user = null;
            this.shop = null;
            this.sellerApplication = null;
            this.sellerAccess = null;
            this.isAuthenticated = false;
        }

        this.updateUI();
    }

    async login(email, password, role = 'buyer') {
        try {
            const response = await this.api.login(email, password, role);
            const payload = response.data || {};
            const user = payload.user || payload.admin;
            const accessToken = payload.accessToken || payload.token;
            
            localStorage.setItem('accessToken', accessToken);
            if (payload.refreshToken) {
                localStorage.setItem('refreshToken', payload.refreshToken);
            }
            localStorage.setItem('user', JSON.stringify({ ...user, role }));
            localStorage.setItem('role', role);
            if (payload.shop) {
                localStorage.setItem('shop', JSON.stringify(payload.shop));
            } else {
                localStorage.removeItem('shop');
            }
            if (payload.application) {
                localStorage.setItem('sellerApplication', JSON.stringify(payload.application));
            } else {
                localStorage.removeItem('sellerApplication');
            }
            if (payload.sellerAccess) {
                localStorage.setItem('sellerAccess', JSON.stringify(payload.sellerAccess));
            } else {
                localStorage.removeItem('sellerAccess');
            }

            this.user = { ...user, role };
            this.shop = payload.shop || null;
            this.sellerApplication = payload.application || null;
            this.sellerAccess = payload.sellerAccess || null;
            this.isAuthenticated = true;
            this.updateUI();

            return response;
        } catch (error) {
            throw error;
        }
    }

    async register(userData, role = 'buyer') {
        try {
            const response = await this.api.register(userData, role);
            const payload = response.data || {};
            const user = payload.user ? { ...payload.user, role } : { role };
            
            localStorage.setItem('accessToken', payload.accessToken);
            if (payload.refreshToken) {
                localStorage.setItem('refreshToken', payload.refreshToken);
            }
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('role', role);
            if (payload.shop) {
                localStorage.setItem('shop', JSON.stringify(payload.shop));
            } else {
                localStorage.removeItem('shop');
            }
            if (payload.application) {
                localStorage.setItem('sellerApplication', JSON.stringify(payload.application));
            } else {
                localStorage.removeItem('sellerApplication');
            }
            if (payload.sellerAccess) {
                localStorage.setItem('sellerAccess', JSON.stringify(payload.sellerAccess));
            } else {
                localStorage.removeItem('sellerAccess');
            }

            this.user = user;
            this.shop = payload.shop || null;
            this.sellerApplication = payload.application || null;
            this.sellerAccess = payload.sellerAccess || null;
            this.isAuthenticated = true;
            this.updateUI();

            return response;
        } catch (error) {
            throw error;
        }
    }

    logout() {
        this.api.logout();
        this.user = null;
        this.shop = null;
        this.sellerApplication = null;
        this.sellerAccess = null;
        this.isAuthenticated = false;
        this.updateUI();
        window.location.href = '/';
    }

    isLoggedIn() {
        return this.isAuthenticated;
    }

    isBuyer() {
        return this.user?.role === 'buyer';
    }

    isSeller() {
        return this.user?.role === 'seller';
    }

    hasSellerCenterAccess() {
        return Boolean(this.user?.role === 'seller' && (this.sellerAccess?.canAccessSellerCenter || this.shop?._id));
    }

    getSellerApplicationPageUrl() {
        return '/pages/account/seller-application.html';
    }

    isAdmin() {
        return this.user?.role === 'admin';
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="login"]')) {
                e.preventDefault();
                this.showLoginModal();
            }
            if (e.target.closest('[data-action="register"]')) {
                e.preventDefault();
                this.showRegisterModal();
            }
            if (e.target.closest('[data-action="forgot-password"]')) {
                e.preventDefault();
                this.showForgotPasswordModal();
            }
            if (e.target.closest('[data-action="logout"]')) {
                e.preventDefault();
                this.logout();
            }
            if (e.target.closest('[data-action="become-seller"]')) {
                e.preventDefault();
                this.showBecomeSellerModal();
            }
            const trigger = e.target.closest('.user-menu-trigger');
            if (trigger) {
                e.preventDefault();
                const dropdown = trigger.parentElement.querySelector('.user-dropdown');
                dropdown?.classList.toggle('show');
                trigger.setAttribute('aria-expanded', dropdown?.classList.contains('show') ? 'true' : 'false');
                return;
            }
            const dropdownLink = e.target.closest('.user-dropdown a');
            if (dropdownLink) {
                document.querySelectorAll('.user-dropdown.show').forEach(dropdown => dropdown.classList.remove('show'));
                document.querySelectorAll('.user-menu-trigger[aria-expanded="true"]').forEach(item => item.setAttribute('aria-expanded', 'false'));
            }
            if (!e.target.closest('.account-action')) {
                document.querySelectorAll('.user-dropdown.show').forEach(dropdown => dropdown.classList.remove('show'));
                document.querySelectorAll('.user-menu-trigger[aria-expanded="true"]').forEach(item => item.setAttribute('aria-expanded', 'false'));
            }
        });
    }

    updateUI() {
        let userAction = this.findAccountActionContainer();

        if (userAction && userAction.tagName.toLowerCase() === 'a') {
            const replacement = document.createElement('div');
            replacement.className = userAction.className;
            replacement.classList.add('account-action');
            userAction.replaceWith(replacement);
            userAction = replacement;
        } else if (userAction) {
            userAction.classList.add('account-action');
        }
        
        if (userAction) {
            if (this.isAuthenticated) {
                userAction.innerHTML = `
                    <button class="user-menu-trigger" type="button" aria-expanded="false">
                        <i class="fas fa-user-circle"></i>
                        <span>${this.user?.name || 'Tài khoản'}</span>
                        <i class="fas fa-chevron-down user-menu-chevron"></i>
                    </button>
                    <div class="user-dropdown" id="userDropdown">
                        <a href="#account"><i class="fas fa-user"></i> Tài khoản của tôi</a>
                        ${this.user?.role === 'buyer' ? '<a href="#messages"><i class="fas fa-comments"></i> Tin nhắn với shop</a>' : ''}
                        <a href="#notifications"><i class="fas fa-bell"></i> Thông báo</a>
                        ${this.user?.role === 'seller' ? '<a href="/pages/seller/dashboard.html"><i class="fas fa-store"></i> Seller Center</a>' : ''}
                        ${this.user?.role === 'admin' ? '<a href="/pages/admin/dashboard.html"><i class="fas fa-cog"></i> Admin Center</a>' : ''}
                        ${this.user?.role === 'buyer' && !this.shop ? '<a href="#" data-action="become-seller"><i class="fas fa-store"></i> Open a seller shop</a>' : ''}
                        <div class="dropdown-divider"></div>
                        <a href="#" data-action="logout"><i class="fas fa-sign-out-alt"></i> Đăng xuất</a>
                    </div>
                `;
            } else {
                userAction.innerHTML = `
                    <button class="user-menu-trigger" type="button" data-action="login">
                        <i class="far fa-user"></i>
                        <span>Sign in</span>
                    </button>
                `;
            }
        }
    }

    showLoginModal() {
        this.showAuthModal('login');
    }

    showRegisterModal() {
        this.showAuthModal('register');
    }

    showForgotPasswordModal() {
        document.getElementById('loginModal')?.remove();
        document.getElementById('registerModal')?.remove();
        document.getElementById('authModal')?.remove();
        document.getElementById('forgotPasswordModal')?.remove();

        const modal = this.createModal('forgotPasswordModal', `
            <div class="auth-shell auth-reset-shell">
                <button class="modal-close auth-close" type="button" aria-label="Đóng">&times;</button>
                <section class="auth-visual" aria-hidden="true">
                    <div class="auth-blob auth-blob-one"></div>
                    <div class="auth-blob auth-blob-two"></div>
                    <div class="auth-brand">
                        <img src="/assets/images/pet-logo.svg" alt="" class="auth-brand-logo">
                        <span>PetNest</span>
                    </div>
                    <div class="auth-visual-copy">
                        <h3>Bảo vệ tài khoản của bạn.</h3>
                        <p>PetNest sẽ gửi mã xác minh 6 số đến email đã đăng ký. Mã chỉ dùng một lần và hết hạn sau vài phút.</p>
                    </div>
                    <div class="auth-image-stack">
                        <div class="auth-image-card auth-image-main"><img src="/assets/images/pet-cat.svg" alt=""></div>
                        <div class="auth-image-card auth-image-overlap"><img src="/assets/images/pet-dog.svg" alt=""></div>
                    </div>
                </section>
                <section class="auth-panel">
                    <div class="auth-heading">
                        <h3>Quên mật khẩu</h3>
                        <p id="forgotPasswordIntro">Nhập email đã đăng ký để nhận mã xác minh đặt lại mật khẩu.</p>
                    </div>
                    <div class="auth-error" id="forgotPasswordError" role="alert"></div>
                    <div class="auth-success" id="forgotPasswordSuccess" role="status" style="display:none;"></div>

                    <form id="forgotRequestForm" class="auth-form" novalidate>
                        <div class="auth-field">
                            <label for="forgotEmail">Email đã đăng ký</label>
                            <div class="auth-input-wrap">
                                <input id="forgotEmail" type="email" name="email" required autocomplete="email" placeholder="ten@example.com">
                                <span class="auth-input-icon">@</span>
                            </div>
                        </div>
                        <button id="forgotRequestSubmit" type="submit" class="auth-submit">Gửi mã xác minh</button>
                    </form>

                    <form id="forgotResetForm" class="auth-form" style="display:none;" novalidate>
                        <input id="forgotResetEmail" type="hidden" name="email">
                        <div class="auth-field">
                            <label for="forgotCode">Mã xác minh 6 số</label>
                            <div class="auth-input-wrap">
                                <input id="forgotCode" type="text" name="code" required inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="123456">
                                <span class="auth-input-icon">OTP</span>
                            </div>
                        </div>
                        <div class="auth-field">
                            <label for="forgotNewPassword">Mật khẩu mới</label>
                            <div class="auth-input-wrap">
                                <input id="forgotNewPassword" type="password" name="newPassword" required minlength="6" autocomplete="new-password" placeholder="Ví dụ: PetNest1">
                                <button class="auth-password-toggle" type="button" data-reset-toggle-password>Hiện</button>
                            </div>
                            <small class="auth-help">Mật khẩu cần có ít nhất một chữ hoa, một chữ thường và một số.</small>
                        </div>
                        <div class="auth-field">
                            <label for="forgotConfirmPassword">Nhập lại mật khẩu mới</label>
                            <div class="auth-input-wrap">
                                <input id="forgotConfirmPassword" type="password" name="confirmPassword" required minlength="6" autocomplete="new-password" placeholder="Nhập lại mật khẩu mới">
                            </div>
                        </div>
                        <button id="forgotResetSubmit" type="submit" class="auth-submit">Đặt lại mật khẩu</button>
                        <button id="forgotResendButton" type="button" class="auth-secondary-submit">Gửi lại mã</button>
                    </form>

                    <div class="auth-switch-card">
                        <p>Đã nhớ mật khẩu? <a href="#" data-reset-back-login>Đăng nhập</a></p>
                    </div>
                    <p class="auth-terms">Không chia sẻ mã xác minh cho bất kỳ ai. PetNest không bao giờ yêu cầu mã qua điện thoại hoặc mạng xã hội.</p>
                </section>
            </div>
        `);

        modal.classList.add('auth-modal');
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);

        const errorBox = modal.querySelector('#forgotPasswordError');
        const successBox = modal.querySelector('#forgotPasswordSuccess');
        const requestForm = modal.querySelector('#forgotRequestForm');
        const resetForm = modal.querySelector('#forgotResetForm');
        const requestSubmit = modal.querySelector('#forgotRequestSubmit');
        const resetSubmit = modal.querySelector('#forgotResetSubmit');
        const resendButton = modal.querySelector('#forgotResendButton');
        const emailInput = modal.querySelector('#forgotEmail');
        const resetEmailInput = modal.querySelector('#forgotResetEmail');

        const setError = (message = '') => {
            errorBox.innerHTML = message ? `<div>${message}</div>` : '';
            errorBox.style.display = message ? 'block' : 'none';
        };

        const setSuccess = (message = '') => {
            successBox.innerHTML = message ? `<div>${message}</div>` : '';
            successBox.style.display = message ? 'block' : 'none';
        };

        const requestCode = async (email) => {
            setError('');
            setSuccess('');
            requestSubmit.disabled = true;
            resendButton.disabled = true;
            requestSubmit.textContent = 'Đang gửi...';
            try {
                const response = await this.api.forgotPassword(email);
                const payload = response.data || {};
                resetEmailInput.value = email;
                requestForm.style.display = 'none';
                resetForm.style.display = 'grid';
                setSuccess(`Mã xác minh đã được gửi đến ${payload.emailMasked || email}. Mã có hiệu lực trong ${payload.expiresInMinutes || 10} phút.`);
            } catch (error) {
                setError(error.message || 'Không thể gửi mã xác minh. Vui lòng thử lại.');
            } finally {
                requestSubmit.disabled = false;
                resendButton.disabled = false;
                requestSubmit.textContent = 'Gửi mã xác minh';
            }
        };

        requestForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!requestForm.checkValidity()) {
                requestForm.reportValidity();
                return;
            }
            await requestCode(emailInput.value.trim());
        });

        resendButton.addEventListener('click', async () => {
            const email = resetEmailInput.value || emailInput.value.trim();
            if (!email) {
                requestForm.style.display = 'grid';
                resetForm.style.display = 'none';
                return;
            }
            await requestCode(email);
        });

        resetForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            setError('');
            if (!resetForm.checkValidity()) {
                resetForm.reportValidity();
                return;
            }

            const formData = new FormData(resetForm);
            const newPassword = formData.get('newPassword');
            const confirmPassword = formData.get('confirmPassword');
            if (newPassword !== confirmPassword) {
                setError('Mật khẩu nhập lại chưa khớp.');
                return;
            }

            resetSubmit.disabled = true;
            resetSubmit.textContent = 'Đang đặt lại...';
            try {
                await this.api.resetPassword({
                    email: formData.get('email'),
                    code: formData.get('code'),
                    newPassword
                });
                setSuccess('Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.');
                this.showNotification('Đặt lại mật khẩu thành công!', 'success');
                setTimeout(() => {
                    modal.remove();
                    this.showLoginModal();
                }, 900);
            } catch (error) {
                setError(error.message || 'Không thể đặt lại mật khẩu.');
            } finally {
                resetSubmit.disabled = false;
                resetSubmit.textContent = 'Đặt lại mật khẩu';
            }
        });

        modal.querySelector('[data-reset-toggle-password]')?.addEventListener('click', (event) => {
            const passwordInput = modal.querySelector('#forgotNewPassword');
            const confirmInput = modal.querySelector('#forgotConfirmPassword');
            const isHidden = passwordInput.type === 'password';
            passwordInput.type = isHidden ? 'text' : 'password';
            confirmInput.type = isHidden ? 'text' : 'password';
            event.currentTarget.textContent = isHidden ? 'Ẩn' : 'Hiện';
        });

        modal.querySelector('[data-reset-back-login]')?.addEventListener('click', (event) => {
            event.preventDefault();
            modal.remove();
            this.showLoginModal();
        });

        this.setupModalClose(modal);
    }

    showAuthModal(mode = 'login') {
        document.getElementById('loginModal')?.remove();
        document.getElementById('registerModal')?.remove();
        document.getElementById('authModal')?.remove();

        const isRegister = mode === 'register';
        const roleTabs = isRegister
            ? [
                ['buyer', 'Người mua'],
                ['seller', 'Người bán']
            ]
            : [
                ['buyer', 'Người mua'],
                ['seller', 'Người bán'],
                ['admin', 'Admin']
            ];
        const modal = this.createModal('authModal', `
            <div class="auth-shell">
                <button class="modal-close auth-close" type="button" aria-label="Close">&times;</button>
                <section class="auth-visual" aria-hidden="true">
                    <div class="auth-blob auth-blob-one"></div>
                    <div class="auth-blob auth-blob-two"></div>
                    <div class="auth-brand">
                        <img src="/assets/images/pet-logo.svg" alt="" class="auth-brand-logo">
                        <span>Paws &amp; Palette</span>
                    </div>
                    <div class="auth-visual-copy">
                        <h3>${isRegister ? 'Bắt đầu hành trình chăm sóc thú cưng của bạn.' : 'Chào mừng bạn quay trở lại với ngôi nhà của thú cưng.'}</h3>
                        <p>${isRegister ? 'Tạo một tài khoản để bắt đầu mua sắm hoặc bán sản phẩm cho thú cưng.' : 'Nơi phong cách sống của bạn và niềm vui của thú cưng hòa làm một.'}</p>
                    </div>
                    <div class="auth-image-stack">
                        <div class="auth-image-card auth-image-main"><img src="/assets/images/pet-dog.svg" alt=""></div>
                        <div class="auth-image-card auth-image-overlap"><img src="/assets/images/pet-cat.svg" alt=""></div>
                    </div>
                </section>
                <section class="auth-panel">
                    <div class="auth-mobile-brand">
                        <img src="/assets/images/pet-logo.svg" alt="" class="auth-brand-logo">
                        <span>Paws &amp; Palette</span>
                    </div>
                    <div class="auth-heading">
                        <h3>${isRegister ? 'Đăng ký' : 'Đăng nhập'}</h3>
                        <p>${isRegister ? 'Tạo một tài khoản để bắt đầu mua sắm hoặc bán sản phẩm cho thú cưng.' : 'Chào mừng bạn quay trở lại với ngôi nhà của thú cưng.'}</p>
                    </div>
                    <div class="auth-role-tabs" role="tablist" aria-label="Account type">
                        ${roleTabs.map(([value, label], index) => `
                            <button class="auth-role-tab ${index === 0 ? 'active' : ''}" type="button" data-auth-role="${value}">${label}</button>
                        `).join('')}
                    </div>
                    <div class="auth-error" id="authFormError" role="alert"></div>
                    <form id="authForm" class="auth-form" novalidate>
                        <input id="authRole" type="hidden" name="role" value="buyer">
                        ${isRegister ? `
                            <div class="auth-field">
                                <label for="authName">Họ và tên</label>
                                <div class="auth-input-wrap">
                                    <input id="authName" type="text" name="name" required maxlength="100" autocomplete="name" placeholder="Nguyễn Văn A">
                                    <span class="auth-input-icon">ID</span>
                                </div>
                            </div>
                        ` : ''}
                        <div class="auth-field">
                            <label for="authEmail">Email</label>
                            <div class="auth-input-wrap">
                                <input id="authEmail" type="email" name="email" required autocomplete="email" placeholder="tên@example.com">
                                <span class="auth-input-icon">@</span>
                            </div>
                        </div>
                        ${isRegister ? `
                            <div class="auth-field">
                                <label for="authPhone">Số điện thoại</label>
                                <div class="auth-input-wrap">
                                    <input id="authPhone" type="tel" name="phone" required pattern="[0-9]{10,11}" inputmode="numeric" autocomplete="tel" placeholder="10-11 chữ số">
                                    <span class="auth-input-icon">Tel</span>
                                </div>
                            </div>
                        ` : ''}
                        <div class="auth-field">
                            <label for="authPassword">Mật khẩu</label>
                            <div class="auth-input-wrap">
                                <input id="authPassword" type="password" name="password" required minlength="6" autocomplete="${isRegister ? 'mật khẩu mới' : 'mật khẩu hiện tại'}" placeholder="${isRegister ? 'Ví dụ: Petshop1' : 'Nhập mật khẩu của bạn'}">
                                <button class="auth-password-toggle" type="button" data-auth-toggle-password>Show</button>
                            </div>
                            ${isRegister ? '<small class="auth-help">Sử dụng ít nhất một chữ hoa, một chữ thường, và một số.</small>' : ''}
                        </div>
                        ${isRegister ? `
                            <div class="auth-field auth-seller-field" id="authSellerShopName" style="display:none;">
                                <label for="authShopName">Tên cửa hàng</label>
                                <div class="auth-input-wrap">
                                    <input id="authShopName" type="text" name="shopName" maxlength="200" placeholder="Tên cửa hàng của bạn">
                                    <span class="auth-input-icon">Shop</span>
                                </div>
                            </div>
                        ` : `
                            <div class="auth-actions-row">
                                <label class="auth-remember">
                                    <input type="checkbox" name="remember">
                                    <span>Nhớ tài khoản của tôi</span>
                                </label>
                                <a href="#" data-action="forgot-password">Quên mật khẩu?</a>
                            </div>
                        `}
                        <button type="submit" class="auth-submit">
                            ${isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}
                        </button>
                    </form>
                    <div class="auth-divider"><span>hoặc</span></div>
                    <div class="auth-switch-card">
                        <p>
                            ${isRegister ? 'Đã có tài khoản?' : 'Người dùng mới?'}
                            <a href="#" data-auth-switch="${isRegister ? 'login' : 'register'}">${isRegister ? 'Đăng nhập' : 'Tạo tài khoản'}</a>
                        </p>
                    </div>
                    <p class="auth-terms">Bằng cách tiếp tục, bạn đồng ý với điều khoản dịch vụ và chính sách bảo mật của hệ thống.</p>
                </section>
            </div>
        `);

        modal.classList.add('auth-modal');
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);

        const form = modal.querySelector('#authForm');
        const roleInput = modal.querySelector('#authRole');
        const submitButton = modal.querySelector('.auth-submit');
        const errorBox = modal.querySelector('#authFormError');
        const shopNameGroup = modal.querySelector('#authSellerShopName');

        const setError = (message = '') => {
            errorBox.innerHTML = message
                ? message.split('\n').map(line => `<div>${line}</div>`).join('')
                : '';
            errorBox.style.display = message ? 'block' : 'none';
        };

        const setLoading = (loading) => {
            submitButton.disabled = loading;
            submitButton.textContent = loading ? 'Đang xử lý...' : (isRegister ? 'Tạo tài khoản' : 'Đăng nhập');
        };

        const updateRole = (role) => {
            roleInput.value = role;
            modal.querySelectorAll('[data-auth-role]').forEach(button => {
                button.classList.toggle('active', button.dataset.authRole === role);
            });
            if (shopNameGroup) {
                shopNameGroup.style.display = role === 'seller' ? 'block' : 'none';
                const shopInput = shopNameGroup.querySelector('input');
                if (shopInput) shopInput.required = role === 'seller';
            }
        };

        modal.querySelectorAll('[data-auth-role]').forEach(button => {
            button.addEventListener('click', () => updateRole(button.dataset.authRole));
        });

        modal.querySelector('[data-auth-toggle-password]')?.addEventListener('click', (event) => {
            const passwordInput = modal.querySelector('#authPassword');
            const isHidden = passwordInput.type === 'password';
            passwordInput.type = isHidden ? 'text' : 'password';
            event.currentTarget.textContent = isHidden ? 'Ẩn' : 'Hiện';
        });

        modal.querySelectorAll('[data-auth-switch]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const nextMode = link.dataset.authSwitch;
                modal.remove();
                this.showAuthModal(nextMode);
            });
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            setError('');

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const formData = new FormData(form);
            const role = formData.get('role') || 'buyer';

            try {
                setLoading(true);

                if (isRegister) {
                    await this.register({
                        name: formData.get('name')?.trim(),
                        email: formData.get('email')?.trim(),
                        phone: formData.get('phone')?.trim(),
                        password: formData.get('password'),
                        shopName: formData.get('shopName')?.trim(),
                        shopPhone: formData.get('phone')?.trim()
                    }, role);
                    this.showNotification('Đăng ký thành công!', 'success');
                } else {
                    await this.login(formData.get('email')?.trim(), formData.get('password'), role);
                    this.showNotification('Đăng nhập thành công!', 'success');
                }

                modal.remove();

                if (this.user?.role === 'seller') {
                    setTimeout(() => window.location.href = '/pages/seller/dashboard.html', 500);
                } else if (this.user?.role === 'admin') {
                    setTimeout(() => window.location.href = '/pages/admin/dashboard.html', 500);
                } else if (window.location.hash === '#cart' || window.location.hash === '#checkout') {
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                } else {
                    window.dispatchEvent(new Event('auth:changed'));
                }
            } catch (error) {
                setError(error.message || (isRegister ? 'Đăng ký thất bại' : 'Đăng nhập thất bại'));
            } finally {
                setLoading(false);
            }
        });

        this.setupModalClose(modal);
    }

    showLegacyLoginModal() {
        document.getElementById('loginModal')?.remove();
        document.getElementById('registerModal')?.remove();
        const modal = this.createModal('loginModal', `
            <div class="modal-header">
                <h3>Đăng nhập</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="loginForm">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" required placeholder="Nhập email của bạn">
                    </div>
                    <div class="form-group">
                        <label>Mật khẩu</label>
                        <input type="password" name="password" required placeholder="Nhập mật khẩu">
                    </div>
                    <div class="form-group">
                        <label>Loại tài khoản</label>
                        <select name="role" class="form-control">
                            <option value="buyer">Người mua</option>
                            <option value="seller">Người bán</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Đăng nhập</button>
                    <p class="text-center mt-2">
                        <a href="#" data-action="forgot-password">Quên mật khẩu?</a>
                    </p>
                    <p class="text-center mt-2">
                        Chưa có tài khoản? <a href="#" data-dismiss="loginModal">Đăng ký</a>
                    </p>
                </form>
            </div>
        `);

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);

        const form = modal.querySelector('#loginForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);

            try {
                await this.login(formData.get('email'), formData.get('password'), formData.get('role'));
                modal.remove();
                this.showNotification('Đăng nhập thành công!', 'success');
                
                if (this.user?.role === 'seller') {
                    setTimeout(() => window.location.href = '/pages/seller/dashboard.html', 500);
                } else if (this.user?.role === 'admin') {
                    setTimeout(() => window.location.href = '/pages/admin/dashboard.html', 500);
                }
            } catch (error) {
                this.showNotification(error.message || 'Đăng nhập thất bại', 'error');
            }
        });

        this.setupModalClose(modal);
    }

    showLegacyRegisterModal() {
        document.getElementById('loginModal')?.remove();
        document.getElementById('registerModal')?.remove();
        const existingModal = document.getElementById('loginModal');
        if (existingModal) existingModal.remove();

        const modal = this.createModal('registerModal', `
            <div class="modal-header">
                <h3>Tạo tài khoản</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="registerForm">
                    <div class="form-group">
                        <label>Họ và tên</label>
                        <input type="text" name="name" required placeholder="Nhập họ và tên">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" required placeholder="Nháº­p email">
                    </div>
                    <div class="form-group">
                        <label>Số điện thoại</label>
                        <input type="tel" name="phone" required placeholder="10-11 chữ số">
                    </div>
                    <div class="form-group">
                        <label>Mật khẩu</label>
                        <input type="password" name="password" required minlength="6" placeholder="Ít nhất 1 chữ hoa, 1 chữ thường, 1 số">
                    </div>
                    <div class="form-group">
                        <label>Loại tài khoản</label>
                        <select name="role" class="form-control" id="registerRole">
                            <option value="buyer">Người mua - Mua sắm cho thú cưng</option>
                            <option value="seller">Người bán - Bán sản phẩm thú cưng</option>
                        </select>
                    </div>
                    <div class="form-group" id="sellerShopNameGroup" style="display:none;">
                        <label>Tên shop</label>
                        <input type="text" name="shopName" placeholder="Tên cửa hàng của bạn">
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Tạo tài khoản</button>
                    <p class="text-center mt-2">
                        Đã có tài khoản? <a href="#" data-dismiss="registerModal">Đăng nhập</a>
                    </p>
                </form>
            </div>
        `);

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);

        const form = modal.querySelector('#registerForm');
        const roleSelect = modal.querySelector('#registerRole');
        const shopNameGroup = modal.querySelector('#sellerShopNameGroup');
        roleSelect.addEventListener('change', () => {
            shopNameGroup.style.display = roleSelect.value === 'seller' ? 'block' : 'none';
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);

            try {
                const role = formData.get('role');
                await this.register({
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    password: formData.get('password'),
                    shopName: formData.get('shopName') || `Cửa hàng của ${formData.get('name')}`,
                    shopPhone: formData.get('phone')
                }, role);

                modal.remove();
                this.showNotification('Đăng ký thành công!', 'success');

                if (role === 'seller') {
                    setTimeout(() => window.location.href = '/pages/seller/dashboard.html', 500);
                }
            } catch (error) {
                this.showNotification(error.message || 'Đăng ký thất bại', 'error');
            }
        });

        this.setupModalClose(modal);
    }

    showBecomeSellerModal() {
        const modal = this.createModal('becomeSellerModal', `
            <div class="modal-header">
                <h3>Tạo shop của bạn</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="becomeSellerForm">
                    <div class="form-group">
                        <label>Tên shop</label>
                        <input type="text" name="name" required placeholder="Nhập tên shop">
                    </div>
                    <div class="form-group">
                        <label>Mô tả</label>
                        <textarea name="description" rows="3" placeholder="Giới thiệu ngắn về cửa hàng"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Số điện thoại</label>
                        <input type="tel" name="phone" required placeholder="Số điện thoại cửa hàng">
                    </div>
                    <div class="form-group">
                        <label>Địa chỉ</label>
                        <input type="text" name="street" required placeholder="Địa chỉ cửa hàng">
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Tạo shop</button>
                </form>
            </div>
        `);

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);

        const form = modal.querySelector('#becomeSellerForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);

            try {
                const response = await api.createShop({
                    name: formData.get('name'),
                    description: formData.get('description'),
                    phone: formData.get('phone'),
                    address: { street: formData.get('street') }
                });

                const shop = response.data?.shop || response.data;
                const user = response.data?.user || { ...this.user, role: 'seller' };
                localStorage.setItem('shop', JSON.stringify(shop));
                localStorage.setItem('user', JSON.stringify({ ...user, role: 'seller' }));
                localStorage.setItem('role', 'seller');
                this.user = { ...user, role: 'seller' };
                this.shop = shop;
                this.isAuthenticated = true;
                this.updateUI();

                modal.remove();
                this.showNotification('Đã tạo shop, đang chờ duyệt.', 'success');
                setTimeout(() => window.location.href = '/pages/seller/dashboard.html', 1000);
            } catch (error) {
                this.showNotification(error.message || 'Không thể tạo shop', 'error');
            }
        });

        this.setupModalClose(modal);
    }

    createModal(id, content) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = id;
        modal.innerHTML = `<div class="modal-content">${content}</div>`;
        return modal;
    }

    setupModalClose(modal) {
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        modal.querySelectorAll('[data-dismiss]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                modal.remove();
                if (link.dataset.dismiss === 'loginModal') this.showRegisterModal();
                else if (link.dataset.dismiss === 'registerModal') this.showLoginModal();
            });
        });

        modal.querySelectorAll('[data-action="forgot-password"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                modal.remove();
                this.showForgotPasswordModal();
            });
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    requireAuth(redirectTo = '/') {
        if (!this.isAuthenticated) {
            this.showLoginModal();
            return false;
        }
        return true;
    }

    requireRole(role, redirectTo = '/') {
        if (!this.isAuthenticated) {
            this.showLoginModal();
            return false;
        }
        if (this.user?.role !== role) {
            this.showNotification('Bạn không có quyền truy cập trang này', 'error');
            window.location.href = redirectTo;
            return false;
        }
        return true;
    }
}

window.authManager = new AuthManager();

