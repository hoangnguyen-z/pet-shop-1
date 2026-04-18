class CartManager {
    constructor() {
        this.buyerApi = api.buyerApi;
        this.items = [];
        this.isLoggedIn = false;
        this.userRole = null;

        this.init();
    }

    async init() {
        this.checkAuth();
        this.setupEventListeners();
        await this.loadCart();
    }

    checkAuth() {
        const token = localStorage.getItem('accessToken');
        let user = null;
        try {
            user = JSON.parse(localStorage.getItem('user') || 'null');
        } catch (error) {
            console.warn('Ignoring invalid cart user state in localStorage', error);
            localStorage.removeItem('user');
        }
        this.isLoggedIn = !!token;
        this.userRole = user?.role || null;
    }

    setupEventListeners() {
        document.addEventListener('click', event => {
            const addButton = event.target.closest('[data-action="add-to-cart"]');
            if (addButton) {
                const productId = addButton.dataset.productId;
                const quantity = parseInt(addButton.dataset.quantity || '1', 10);
                this.addToCart(productId, quantity);
            }
        });

        document.getElementById('cartSidebarCheckout')?.addEventListener('click', () => this.checkout());
        document.getElementById('cartClose')?.addEventListener('click', () => this.closeCartShell());
        document.getElementById('cartOverlay')?.addEventListener('click', () => this.closeCartShell());
    }

    async loadCart() {
        this.checkAuth();

        if (this.userRole === 'seller') {
            this.items = [];
            this.updateCartUI();
            return;
        }

        if (!this.isLoggedIn) {
            this.loadLocalCart();
            return;
        }

        try {
            const response = await this.buyerApi.getCart();
            this.items = response.data?.items || [];
            this.updateCartUI();
        } catch (error) {
            console.error('Failed to load cart:', error);
            this.loadLocalCart();
        }
    }

    loadLocalCart() {
        const savedCart = localStorage.getItem('cart');
        this.items = savedCart ? JSON.parse(savedCart) : [];
        this.updateCartUI();
    }

    saveLocalCart() {
        localStorage.setItem('cart', JSON.stringify(this.items));
    }

    async addToCart(productId, quantity = 1) {
        this.checkAuth();

        if (!this.isLoggedIn) {
            this.showNotification('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng', 'info');
            authManager.showLoginModal();
            return;
        }

        if (this.userRole === 'seller') {
            this.showNotification('Tài khoản người bán không được thêm sản phẩm vào giỏ hàng', 'error');
            return;
        }

        try {
            const response = await this.buyerApi.addToCart(productId, quantity);
            this.items = response.data?.items || response.data?.cart?.items || [];
            this.updateCartUI();
            this.showNotification('Đã thêm vào giỏ hàng!', 'success');
        } catch (error) {
            console.error('Failed to add to cart:', error);
            this.showNotification('Không thể thêm sản phẩm vào giỏ hàng', 'error');
        }
    }

    async updateQuantity(itemId, quantity) {
        if (quantity <= 0) {
            await this.removeItem(itemId);
            return;
        }

        if (!this.isLoggedIn) {
            const item = this.items.find(i => i._id === itemId || i.id === itemId);
            if (item) {
                item.quantity = quantity;
                this.saveLocalCart();
                this.updateCartUI();
            }
            return;
        }

        try {
            const response = await this.buyerApi.updateCartItem(itemId, quantity);
            this.items = response.data?.items || response.data?.cart?.items || [];
            this.updateCartUI();
        } catch (error) {
            console.error('Failed to update cart:', error);
            this.showNotification('Không thể cập nhật số lượng', 'error');
        }
    }

    async removeItem(itemId) {
        if (!this.isLoggedIn) {
            this.items = this.items.filter(item => item._id !== itemId && item.id !== itemId);
            this.saveLocalCart();
            this.updateCartUI();
            return;
        }

        try {
            const response = await this.buyerApi.removeFromCart(itemId);
            this.items = response.data?.items || response.data?.cart?.items || [];
            this.updateCartUI();
            this.showNotification('Đã xóa sản phẩm khỏi giỏ hàng', 'success');
        } catch (error) {
            console.error('Failed to remove item:', error);
            this.showNotification('Không thể xóa sản phẩm', 'error');
        }
    }

    async clearCart() {
        if (!this.isLoggedIn) {
            this.items = [];
            this.saveLocalCart();
            this.updateCartUI();
            return;
        }

        try {
            await this.buyerApi.clearCart();
            this.items = [];
            this.updateCartUI();
        } catch (error) {
            console.error('Failed to clear cart:', error);
        }
    }

    updateCartUI() {
        const cartCountNodes = document.querySelectorAll('.cart-count');
        const cartItems = document.getElementById('cartItems');
        const cartEmpty = document.getElementById('cartEmpty');
        const cartFooter = document.getElementById('cartFooter');
        const cartSubtotal = document.getElementById('cartSubtotal');
        const totalItems = this.items.reduce((sum, item) => sum + (item.quantity || 1), 0);

        cartCountNodes.forEach(node => {
            node.textContent = totalItems;
        });

        if (!cartItems) return;

        if (this.items.length === 0) {
            cartItems.innerHTML = '';
            if (cartEmpty) cartEmpty.style.display = 'flex';
            if (cartFooter) cartFooter.style.display = 'none';
            return;
        }

        if (cartEmpty) cartEmpty.style.display = 'none';
        if (cartFooter) cartFooter.style.display = 'block';

        let subtotal = 0;
        cartItems.innerHTML = this.items.map((item, index) => {
            const product = this.getItemProduct(item);
            const price = item.price || product?.price || 0;
            const quantity = item.quantity || 1;
            const name = item.name || product?.name || 'Sản phẩm';
            const image = item.image || product?.images?.[0] || '';
            const itemId = this.getItemProductId(item) || item._id || item.id || index;

            subtotal += price * quantity;

            return `
                <div class="cart-item" data-item-id="${itemId}">
                    <div class="cart-item-image">
                        ${image ? `<img src="${image}" alt="${name}">` : '<i class="fas fa-box-open"></i>'}
                    </div>
                    <div class="cart-item-details">
                        <h4>${name}</h4>
                        <p>${window.utils.formatPrice(price)} x ${quantity}</p>
                    </div>
                    <div class="cart-item-quantity">
                        <button class="qty-btn" onclick="cartManager.updateQuantity('${itemId}', ${quantity - 1})">-</button>
                        <span>${quantity}</span>
                        <button class="qty-btn" onclick="cartManager.updateQuantity('${itemId}', ${quantity + 1})">+</button>
                    </div>
                    <button class="cart-item-remove" onclick="cartManager.removeItem('${itemId}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');

        if (cartSubtotal) {
            cartSubtotal.textContent = window.utils.formatPrice(subtotal);
        }
    }

    getItems() {
        return this.items;
    }

    getItemProduct(item) {
        return item.product || item.productId || null;
    }

    getItemProductId(item) {
        const product = this.getItemProduct(item);
        if (typeof product === 'string') return product;
        return product?._id || item.productId || item.product || item._id || item.id;
    }

    getItemCount() {
        return this.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    }

    getSubtotal() {
        return this.items.reduce((sum, item) => {
            const product = this.getItemProduct(item);
            const price = item.price || product?.price || 0;
            const quantity = item.quantity || 1;
            return sum + (price * quantity);
        }, 0);
    }

    async checkout() {
        this.checkAuth();

        if (!this.isLoggedIn) {
            authManager.showLoginModal();
            return;
        }

        if (this.userRole === 'seller') {
            this.showNotification('Tài khoản người bán không được thanh toán theo luồng người mua', 'error');
            return;
        }

        if (this.items.length === 0) {
            this.showNotification('Giỏ hàng của bạn đang trống', 'error');
            return;
        }

        this.closeCartShell();
        window.location.hash = 'checkout';
    }

    openCartShell() {
        document.getElementById('cartShell')?.classList.add('open');
        document.getElementById('cartOverlay')?.classList.add('open');
        document.body.classList.add('cart-open');
    }

    closeCartShell() {
        document.getElementById('cartShell')?.classList.remove('open');
        document.getElementById('cartOverlay')?.classList.remove('open');
        document.body.classList.remove('cart-open');
    }

    showNotification(message, type = 'info') {
        authManager?.showNotification?.(message, type);
    }
}

window.cartManager = new CartManager();
