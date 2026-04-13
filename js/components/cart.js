class CartManager {
    constructor() {
        this.buyerApi = api.buyerApi;
        this.items = [];
        this.isLoggedIn = false;
        
        this.init();
    }

    async init() {
        this.checkAuth();
        this.setupEventListeners();
        await this.loadCart();
    }

    checkAuth() {
        const token = localStorage.getItem('accessToken');
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        this.isLoggedIn = !!token;
        this.userRole = user?.role || null;
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="add-to-cart"]')) {
                const productId = e.target.dataset.productId || e.target.closest('[data-action="add-to-cart"]').dataset.productId;
                const quantity = parseInt(e.target.dataset.quantity) || 1;
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
        if (savedCart) {
            this.items = JSON.parse(savedCart);
            this.updateCartUI();
        }
    }

    saveLocalCart() {
        localStorage.setItem('cart', JSON.stringify(this.items));
    }

    async addToCart(productId, quantity = 1) {
        this.checkAuth();
        if (!this.isLoggedIn) {
            this.showNotification('Please login to add items to cart', 'info');
            authManager.showLoginModal();
            return;
        }

        if (this.userRole === 'seller') {
            this.showNotification('Tai khoan nguoi ban khong duoc them san pham vao gio hang', 'error');
            return;
        }

        try {
            const response = await this.buyerApi.addToCart(productId, quantity);
            this.items = response.data?.items || response.data?.cart?.items || [];
            this.updateCartUI();
            this.showNotification('Added to cart!', 'success');
        } catch (error) {
            console.error('Failed to add to cart:', error);
            this.showNotification('Failed to add item to cart', 'error');
        }
    }

    async updateQuantity(itemId, quantity) {
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
            this.showNotification('Failed to update quantity', 'error');
        }
    }

    async removeItem(itemId) {
        if (!this.isLoggedIn) {
            this.items = this.items.filter(i => i._id !== itemId && i.id !== itemId);
            this.saveLocalCart();
            this.updateCartUI();
            return;
        }

        try {
            const response = await this.buyerApi.removeFromCart(itemId);
            this.items = response.data?.items || response.data?.cart?.items || [];
            this.updateCartUI();
            this.showNotification('Item removed from cart', 'success');
        } catch (error) {
            console.error('Failed to remove item:', error);
            this.showNotification('Failed to remove item', 'error');
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

        if (cartCountNodes.length) {
            const totalItems = this.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
            cartCountNodes.forEach(node => {
                node.textContent = totalItems;
            });
        }

        if (cartItems) {
            if (this.items.length === 0) {
                cartItems.innerHTML = '';
                if (cartEmpty) cartEmpty.style.display = 'flex';
                if (cartFooter) cartFooter.style.display = 'none';
            } else {
                if (cartEmpty) cartEmpty.style.display = 'none';
                if (cartFooter) cartFooter.style.display = 'block';

                let subtotal = 0;
                cartItems.innerHTML = this.items.map((item, index) => {
                    const product = this.getItemProduct(item);
                    const price = item.price || product?.price || 0;
                    const quantity = item.quantity || 1;
                    const name = item.name || product?.name || 'Product';
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
                                <p>$${price.toFixed(2)} x ${quantity}</p>
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
                    cartSubtotal.textContent = '$' + subtotal.toFixed(2);
                }
            }
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
            this.showNotification('Tai khoan nguoi ban khong duoc thanh toan theo luong nguoi mua', 'error');
            return;
        }

        if (this.items.length === 0) {
            this.showNotification('Your cart is empty', 'error');
            return;
        }

        this.closeCartShell();

        if (window.location.pathname === '/' || window.location.pathname.endsWith('/index.html')) {
            window.location.hash = 'checkout';
        } else {
            window.location.href = '/#checkout';
        }
    }

    closeCartShell() {
        document.getElementById('cartSidebar')?.classList.remove('active');
        document.getElementById('cartOverlay')?.classList.remove('active');
    }

    showNotification(message, type = 'info') {
        authManager.showNotification(message, type);
    }
}

window.cartManager = new CartManager();
