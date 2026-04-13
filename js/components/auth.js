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
            this.user = JSON.parse(userData);
            if (role && !this.user.role) {
                this.user.role = role;
            }
            this.shop = shopData ? JSON.parse(shopData) : null;
            this.sellerApplication = sellerApplicationData ? JSON.parse(sellerApplicationData) : null;
            this.sellerAccess = sellerAccessData ? JSON.parse(sellerAccessData) : null;
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
        let userAction = document.querySelector('.account-action')
            || document.querySelector('.header-action:has(.fa-user), .header-action:has(.fa-user-circle)');

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
                        <a href="#notifications"><i class="fas fa-bell"></i> Thông báo</a>
                        ${this.user?.role === 'seller' ? '<a href="/pages/seller/dashboard.html"><i class="fas fa-store"></i> Kênh người bán</a>' : ''}
                        ${this.user?.role === 'admin' ? '<a href="/pages/admin/dashboard.html"><i class="fas fa-cog"></i> Trang quản trị</a>' : ''}
                        ${this.user?.role === 'buyer' && !this.shop ? '<a href="#" data-action="become-seller"><i class="fas fa-store"></i> Mở shop bán hàng</a>' : ''}
                        <div class="dropdown-divider"></div>
                        <a href="#" data-action="logout"><i class="fas fa-sign-out-alt"></i> Đăng xuất</a>
                    </div>
                `;
            } else {
                userAction.innerHTML = `
                    <button class="user-menu-trigger" type="button" data-action="login">
                        <i class="far fa-user"></i>
                        <span>Đăng nhập</span>
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

    showAuthModal(mode = 'login') {
        document.getElementById('loginModal')?.remove();
        document.getElementById('registerModal')?.remove();
        document.getElementById('authModal')?.remove();

        const isRegister = mode === 'register';
        const roleTabs = isRegister
            ? [
                ['buyer', 'NgÆ°á»i mua'],
                ['seller', 'NgÆ°á»i bĂ¡n']
            ]
            : [
                ['buyer', 'NgÆ°á»i mua'],
                ['seller', 'NgÆ°á»i bĂ¡n'],
                ['admin', 'Admin']
            ];
        const modal = this.createModal('authModal', `
            <div class="auth-shell">
                <button class="modal-close auth-close" type="button" aria-label="ÄĂ³ng">&times;</button>
                <section class="auth-visual" aria-hidden="true">
                    <div class="auth-blob auth-blob-one"></div>
                    <div class="auth-blob auth-blob-two"></div>
                    <div class="auth-brand">
                        <img src="/assets/images/pet-logo.svg" alt="" class="auth-brand-logo">
                        <span>Paws &amp; Palette</span>
                    </div>
                    <div class="auth-visual-copy">
                        <h3>${isRegister ? 'Báº¯t Ä‘áº§u hĂ nh trĂ¬nh chÄƒm pet.' : 'ChĂ o má»«ng trá»Ÿ láº¡i vá»›i ngĂ´i nhĂ  cá»§a thĂº cÆ°ng.'}</h3>
                        <p>${isRegister ? 'Táº¡o tĂ i khoáº£n Ä‘á»ƒ mua sáº¯m, theo dĂµi Ä‘Æ¡n hĂ ng hoáº·c má»Ÿ gian hĂ ng pet cá»§a riĂªng báº¡n.' : 'NÆ¡i phong cĂ¡ch sá»‘ng cá»§a báº¡n vĂ  niá»m vui cá»§a thĂº cÆ°ng hĂ²a lĂ m má»™t.'}</p>
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
                        <h3>${isRegister ? 'ÄÄƒng kĂ½' : 'ÄÄƒng nháº­p'}</h3>
                        <p>${isRegister ? 'Táº¡o tĂ i khoáº£n Ä‘á»ƒ báº¯t Ä‘áº§u mua sáº¯m hoáº·c bĂ¡n sáº£n pháº©m pet.' : 'ChĂ o má»«ng báº¡n quay láº¡i khĂ´ng gian yĂªu thÆ°Æ¡ng.'}</p>
                    </div>
                    <div class="auth-role-tabs" role="tablist" aria-label="Loáº¡i tĂ i khoáº£n">
                        ${roleTabs.map(([value, label], index) => `
                            <button class="auth-role-tab ${index === 0 ? 'active' : ''}" type="button" data-auth-role="${value}">${label}</button>
                        `).join('')}
                    </div>
                    <div class="auth-error" id="authFormError" role="alert"></div>
                    <form id="authForm" class="auth-form" novalidate>
                        <input id="authRole" type="hidden" name="role" value="buyer">
                        ${isRegister ? `
                            <div class="auth-field">
                                <label for="authName">Há» vĂ  tĂªn</label>
                                <div class="auth-input-wrap">
                                    <input id="authName" type="text" name="name" required maxlength="100" autocomplete="name" placeholder="Nguyá»…n VÄƒn A">
                                    <span class="auth-input-icon">ID</span>
                                </div>
                            </div>
                        ` : ''}
                        <div class="auth-field">
                            <label for="authEmail">Email</label>
                            <div class="auth-input-wrap">
                                <input id="authEmail" type="email" name="email" required autocomplete="email" placeholder="name@example.com">
                                <span class="auth-input-icon">@</span>
                            </div>
                        </div>
                        ${isRegister ? `
                            <div class="auth-field">
                                <label for="authPhone">Sá»‘ Ä‘iá»‡n thoáº¡i</label>
                                <div class="auth-input-wrap">
                                    <input id="authPhone" type="tel" name="phone" required pattern="[0-9]{10,11}" inputmode="numeric" autocomplete="tel" placeholder="10-11 chá»¯ sá»‘">
                                    <span class="auth-input-icon">Tel</span>
                                </div>
                            </div>
                        ` : ''}
                        <div class="auth-field">
                            <label for="authPassword">Máº­t kháº©u</label>
                            <div class="auth-input-wrap">
                                <input id="authPassword" type="password" name="password" required minlength="6" autocomplete="${isRegister ? 'new-password' : 'current-password'}" placeholder="${isRegister ? 'VĂ­ dá»¥: Petshop1' : 'Nháº­p máº­t kháº©u'}">
                                <button class="auth-password-toggle" type="button" data-auth-toggle-password>Hiá»‡n</button>
                            </div>
                            ${isRegister ? '<small class="auth-help">Máº­t kháº©u cáº§n cĂ³ chá»¯ hoa, chá»¯ thÆ°á»ng vĂ  sá»‘.</small>' : ''}
                        </div>
                        ${isRegister ? `
                            <div class="auth-field auth-seller-field" id="authSellerShopName" style="display:none;">
                                <label for="authShopName">TĂªn shop</label>
                                <div class="auth-input-wrap">
                                    <input id="authShopName" type="text" name="shopName" maxlength="200" placeholder="TĂªn gian hĂ ng cá»§a báº¡n">
                                    <span class="auth-input-icon">Shop</span>
                                </div>
                            </div>
                        ` : `
                            <div class="auth-actions-row">
                                <label class="auth-remember">
                                    <input type="checkbox" name="remember">
                                    <span>Ghi nhá»› Ä‘Äƒng nháº­p</span>
                                </label>
                                <a href="#" data-action="forgot-password">QuĂªn máº­t kháº©u?</a>
                            </div>
                        `}
                        <button type="submit" class="auth-submit">
                            ${isRegister ? 'Táº¡o tĂ i khoáº£n' : 'ÄÄƒng nháº­p'}
                        </button>
                    </form>
                    <div class="auth-divider"><span>hoáº·c</span></div>
                    <div class="auth-switch-card">
                        <p>
                            ${isRegister ? 'ÄĂ£ cĂ³ tĂ i khoáº£n?' : 'ChÆ°a cĂ³ tĂ i khoáº£n?'}
                            <a href="#" data-auth-switch="${isRegister ? 'login' : 'register'}">${isRegister ? 'ÄÄƒng nháº­p' : 'ÄÄƒng kĂ½ ngay'}</a>
                        </p>
                    </div>
                    <p class="auth-terms">Báº±ng cĂ¡ch tiáº¿p tá»¥c, báº¡n Ä‘á»“ng Ă½ vá»›i Ä‘iá»u khoáº£n dá»‹ch vá»¥ vĂ  chĂ­nh sĂ¡ch quyá»n riĂªng tÆ° cá»§a sĂ n.</p>
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
            submitButton.textContent = loading ? 'Äang xá»­ lĂ½...' : (isRegister ? 'Táº¡o tĂ i khoáº£n' : 'ÄÄƒng nháº­p');
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
            event.currentTarget.textContent = isHidden ? 'áº¨n' : 'Hiá»‡n';
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
                    this.showNotification('ÄÄƒng kĂ½ thĂ nh cĂ´ng!', 'success');
                } else {
                    await this.login(formData.get('email')?.trim(), formData.get('password'), role);
                    this.showNotification('ÄÄƒng nháº­p thĂ nh cĂ´ng!', 'success');
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
                setError(error.message || (isRegister ? 'ÄÄƒng kĂ½ tháº¥t báº¡i' : 'ÄÄƒng nháº­p tháº¥t báº¡i'));
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
                <h3>ÄÄƒng nháº­p</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="loginForm">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" required placeholder="Nháº­p email cá»§a báº¡n">
                    </div>
                    <div class="form-group">
                        <label>Máº­t kháº©u</label>
                        <input type="password" name="password" required placeholder="Nháº­p máº­t kháº©u">
                    </div>
                    <div class="form-group">
                        <label>Loáº¡i tĂ i khoáº£n</label>
                        <select name="role" class="form-control">
                            <option value="buyer">NgÆ°á»i mua</option>
                            <option value="seller">NgÆ°á»i bĂ¡n</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">ÄÄƒng nháº­p</button>
                    <p class="text-center mt-2">
                        <a href="#" data-action="forgot-password">QuĂªn máº­t kháº©u?</a>
                    </p>
                    <p class="text-center mt-2">
                        ChÆ°a cĂ³ tĂ i khoáº£n? <a href="#" data-dismiss="loginModal">ÄÄƒng kĂ½</a>
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
                this.showNotification('ÄÄƒng nháº­p thĂ nh cĂ´ng!', 'success');
                
                if (this.user?.role === 'seller') {
                    setTimeout(() => window.location.href = '/pages/seller/dashboard.html', 500);
                } else if (this.user?.role === 'admin') {
                    setTimeout(() => window.location.href = '/pages/admin/dashboard.html', 500);
                }
            } catch (error) {
                this.showNotification(error.message || 'ÄÄƒng nháº­p tháº¥t báº¡i', 'error');
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
                <h3>Táº¡o tĂ i khoáº£n</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="registerForm">
                    <div class="form-group">
                        <label>Há» vĂ  tĂªn</label>
                        <input type="text" name="name" required placeholder="Nháº­p há» vĂ  tĂªn">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" required placeholder="Nháº­p email">
                    </div>
                    <div class="form-group">
                        <label>Sá»‘ Ä‘iá»‡n thoáº¡i</label>
                        <input type="tel" name="phone" required placeholder="10-11 chá»¯ sá»‘">
                    </div>
                    <div class="form-group">
                        <label>Máº­t kháº©u</label>
                        <input type="password" name="password" required minlength="6" placeholder="Ăt nháº¥t 1 chá»¯ hoa, 1 chá»¯ thÆ°á»ng, 1 sá»‘">
                    </div>
                    <div class="form-group">
                        <label>Loáº¡i tĂ i khoáº£n</label>
                        <select name="role" class="form-control" id="registerRole">
                            <option value="buyer">NgÆ°á»i mua - Mua sáº¯m cho thĂº cÆ°ng</option>
                            <option value="seller">NgÆ°á»i bĂ¡n - BĂ¡n sáº£n pháº©m thĂº cÆ°ng</option>
                        </select>
                    </div>
                    <div class="form-group" id="sellerShopNameGroup" style="display:none;">
                        <label>TĂªn shop</label>
                        <input type="text" name="shopName" placeholder="TĂªn cá»­a hĂ ng cá»§a báº¡n">
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Táº¡o tĂ i khoáº£n</button>
                    <p class="text-center mt-2">
                        ÄĂ£ cĂ³ tĂ i khoáº£n? <a href="#" data-dismiss="registerModal">ÄÄƒng nháº­p</a>
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
                    shopName: formData.get('shopName') || `Cá»­a hĂ ng cá»§a ${formData.get('name')}`,
                    shopPhone: formData.get('phone')
                }, role);

                modal.remove();
                this.showNotification('ÄÄƒng kĂ½ thĂ nh cĂ´ng!', 'success');

                if (role === 'seller') {
                    setTimeout(() => window.location.href = '/pages/seller/dashboard.html', 500);
                }
            } catch (error) {
                this.showNotification(error.message || 'ÄÄƒng kĂ½ tháº¥t báº¡i', 'error');
            }
        });

        this.setupModalClose(modal);
    }

    showBecomeSellerModal() {
        const modal = this.createModal('becomeSellerModal', `
            <div class="modal-header">
                <h3>Táº¡o shop cá»§a báº¡n</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="becomeSellerForm">
                    <div class="form-group">
                        <label>TĂªn shop</label>
                        <input type="text" name="name" required placeholder="Nháº­p tĂªn shop">
                    </div>
                    <div class="form-group">
                        <label>MĂ´ táº£</label>
                        <textarea name="description" rows="3" placeholder="Giá»›i thiá»‡u ngáº¯n vá» cá»­a hĂ ng"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Sá»‘ Ä‘iá»‡n thoáº¡i</label>
                        <input type="tel" name="phone" required placeholder="Sá»‘ Ä‘iá»‡n thoáº¡i cá»­a hĂ ng">
                    </div>
                    <div class="form-group">
                        <label>Äá»‹a chá»‰</label>
                        <input type="text" name="street" required placeholder="Äá»‹a chá»‰ cá»­a hĂ ng">
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Táº¡o shop</button>
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
                this.showNotification('ÄĂ£ táº¡o shop, Ä‘ang chá» duyá»‡t.', 'success');
                setTimeout(() => window.location.href = '/pages/seller/dashboard.html', 1000);
            } catch (error) {
                this.showNotification(error.message || 'KhĂ´ng thá»ƒ táº¡o shop', 'error');
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

    showForgotPasswordModal() {
        const modal = this.createModal('forgotPasswordModal', `
            <div class="modal-header">
                <h3>QuĂªn máº­t kháº©u</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="forgotPasswordForm">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" required placeholder="Nháº­p email cá»§a báº¡n">
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Gá»­i liĂªn káº¿t Ä‘áº·t láº¡i</button>
                </form>
            </div>
        `);

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
        modal.querySelector('#forgotPasswordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await this.api.forgotPassword(new FormData(e.currentTarget).get('email'));
                modal.remove();
                this.showNotification('Náº¿u email tá»“n táº¡i, há»‡ thá»‘ng Ä‘Ă£ táº¡o liĂªn káº¿t Ä‘áº·t láº¡i máº­t kháº©u.', 'success');
            } catch (error) {
                this.showNotification(error.message || 'KhĂ´ng thá»ƒ yĂªu cáº§u Ä‘áº·t láº¡i máº­t kháº©u', 'error');
            }
        });
        this.setupModalClose(modal);
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
            this.showNotification('Báº¡n khĂ´ng cĂ³ quyá»n truy cáº­p trang nĂ y', 'error');
            window.location.href = redirectTo;
            return false;
        }
        return true;
    }
}

window.authManager = new AuthManager();

