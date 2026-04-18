(function() {
    if (!window.authManager || !window.api) return;

    const manager = window.authManager;
    const safeReadStorageJson = typeof manager.safeReadStorageJson === 'function'
        ? (key) => manager.safeReadStorageJson(key)
        : (key) => {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            try {
                return JSON.parse(raw);
            } catch (error) {
                console.warn(`Ignoring invalid JSON in localStorage key "${key}"`, error);
                localStorage.removeItem(key);
                return null;
            }
        };
    const findAccountActionContainer = typeof manager.findAccountActionContainer === 'function'
        ? () => manager.findAccountActionContainer()
        : () => document.querySelector('.account-action')
            || Array.from(document.querySelectorAll('.header-action')).find((node) => node.querySelector('.fa-user, .fa-user-circle'))
            || null;

    manager.getSellerApplicationPageUrl = function() {
        return '/pages/account/seller-application.html';
    };

    manager.hasSellerCenterAccess = function() {
        return Boolean(this.user?.role === 'seller' && (this.sellerAccess?.canAccessSellerCenter || this.shop?._id));
    };

    manager.syncBuyerOnlyNavigation = function() {
        const sellerMode = this.user?.role === 'seller';

        document.querySelectorAll('.cart-icon, a[href="#cart"], a[href="#checkout"], a[href="#wishlist"]').forEach((node) => {
            node.style.display = sellerMode ? 'none' : '';
        });

        document.querySelectorAll('.top-bar-right a[href="#orders"], .mobile-nav-list a[href="#orders"]').forEach((node) => {
            node.style.display = sellerMode ? 'none' : '';
        });
    };

    manager.checkAuthStatus = function() {
        const token = localStorage.getItem('accessToken');
        const userData = localStorage.getItem('user');
        const shopData = localStorage.getItem('shop');
        const sellerApplicationData = localStorage.getItem('sellerApplication');
        const sellerAccessData = localStorage.getItem('sellerAccess');
        const role = localStorage.getItem('role');

        if (token && userData) {
            this.user = safeReadStorageJson('user');
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
            this.shop = shopData ? safeReadStorageJson('shop') : null;
            this.sellerApplication = sellerApplicationData ? safeReadStorageJson('sellerApplication') : null;
            this.sellerAccess = sellerAccessData ? safeReadStorageJson('sellerAccess') : null;
            this.isAuthenticated = true;
        } else {
            this.user = null;
            this.shop = null;
            this.sellerApplication = null;
            this.sellerAccess = null;
            this.isAuthenticated = false;
        }

        this.updateUI();
    };

    manager.login = async function(email, password, role = 'buyer') {
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
    };

    manager.register = async function(userData, role = 'buyer') {
        const response = await this.api.register(userData, role);
        const payload = response.data || {};
        const user = payload.user ? { ...payload.user, role } : { role };

        if (payload.accessToken) {
            localStorage.setItem('accessToken', payload.accessToken);
        }
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
    };

    manager.logout = function() {
        this.api.logout();
        localStorage.removeItem('sellerApplication');
        localStorage.removeItem('sellerAccess');
        this.user = null;
        this.shop = null;
        this.sellerApplication = null;
        this.sellerAccess = null;
        this.isAuthenticated = false;
        this.updateUI();
        window.location.href = '/';
    };

    manager.updateUI = function() {
        let userAction = findAccountActionContainer();

        if (userAction && userAction.tagName.toLowerCase() === 'a') {
            const replacement = document.createElement('div');
            replacement.className = userAction.className;
            replacement.classList.add('account-action');
            userAction.replaceWith(replacement);
            userAction = replacement;
        } else if (userAction) {
            userAction.classList.add('account-action');
        }

        this.syncBuyerOnlyNavigation();

        if (!userAction) return;

        if (!this.isAuthenticated) {
            userAction.innerHTML = `
                <button class="user-menu-trigger" type="button" data-action="login">
                    <i class="far fa-user"></i>
                    <span>Đăng nhập</span>
                </button>
            `;
            return;
        }

        const sellerPortalLink = this.user?.role === 'seller'
            ? '<a href="/pages/seller/dashboard.html"><i class="fas fa-store"></i> Kênh người bán</a>'
            : '';

        const sellerApplyLink = this.user?.role === 'buyer'
            ? '<a href="#" data-action="become-seller"><i class="fas fa-store"></i> Mở shop bán hàng</a>'
            : (this.user?.role === 'seller' && !this.hasSellerCenterAccess()
                ? `<a href="${this.getSellerApplicationPageUrl()}"><i class="fas fa-file-signature"></i> Hồ sơ mở shop</a>`
                : '');

        const buyerLinks = this.user?.role === 'seller'
            ? ''
            : `
                <a href="#notifications"><i class="fas fa-bell"></i> Thông báo</a>
            `;

        userAction.innerHTML = `
            <button class="user-menu-trigger" type="button" aria-expanded="false">
                <i class="fas fa-user-circle"></i>
                <span>${this.user?.name || 'Tài khoản'}</span>
                <i class="fas fa-chevron-down user-menu-chevron"></i>
            </button>
            <div class="user-dropdown" id="userDropdown">
                <a href="#account"><i class="fas fa-user"></i> Tài khoản của tôi</a>
                ${buyerLinks}
                ${sellerPortalLink}
                ${this.user?.role === 'admin' ? '<a href="/pages/admin/dashboard.html"><i class="fas fa-cog"></i> Trang quản trị</a>' : ''}
                ${sellerApplyLink}
                <div class="dropdown-divider"></div>
                <a href="#" data-action="logout"><i class="fas fa-sign-out-alt"></i> Đăng xuất</a>
            </div>
        `;
    };

    manager.showBecomeSellerModal = function() {
        if (!this.isAuthenticated) {
            this.showLoginModal();
            return;
        }

        window.location.href = this.getSellerApplicationPageUrl();
    };

    manager.ensureSellerCenterAccess = function() {
        if (!this.isAuthenticated) {
            this.showLoginModal();
            return false;
        }

        if (this.user?.role !== 'seller') {
            this.showNotification('Ban can dang nhap bang tai khoan nguoi ban', 'error');
            window.location.href = '/';
            return false;
        }

        const isSellerDashboard = window.location.pathname.endsWith('/pages/seller/dashboard.html');

        if (!this.hasSellerCenterAccess() && !isSellerDashboard) {
            window.location.href = this.getSellerApplicationPageUrl();
            return false;
        }

        return true;
    };

    manager.checkAuthStatus();

    if (window.location.pathname.startsWith('/pages/seller/')) {
        window.setTimeout(() => {
            if (!manager.ensureSellerCenterAccess()) {
                document.body.style.opacity = '1';
            }
        }, 0);
    }
})();
