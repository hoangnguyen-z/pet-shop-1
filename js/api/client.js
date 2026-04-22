const API_BASE_URL = typeof window.getPetShopApiBaseUrl === 'function'
    ? window.getPetShopApiBaseUrl()
    : `${window.location.origin}/api`;

class ApiClient {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    getToken() {
        return localStorage.getItem('accessToken');
    }

    getRefreshToken() {
        return localStorage.getItem('refreshToken');
    }

    getHeaders() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        try {
            const headers = {
                ...this.getHeaders(),
                ...options.headers
            };
            const isFormData = options.body instanceof FormData;

            if (!isFormData && !headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }

            const response = await fetch(url, {
                ...options,
                headers
            });

            let data = {};
            if (response.status !== 204) {
                const rawBody = await response.text();
                if (rawBody) {
                    try {
                        data = JSON.parse(rawBody);
                    } catch (parseError) {
                        data = {
                            success: false,
                            message: rawBody
                        };
                    }
                }
            }

            if (!response.ok) {
                const isAuthFlow = endpoint.startsWith('/auth/login/')
                    || endpoint.startsWith('/auth/register/')
                    || endpoint.startsWith('/auth/forgot-password')
                    || endpoint.startsWith('/auth/reset-password')
                    || endpoint.startsWith('/admin/auth/login');

                if (response.status === 401 && !isAuthFlow) {
                    this.logout();
                    window.location.href = '/';
                }
                const details = Array.isArray(data.errors)
                    ? data.errors.map(error => `${error.field}: ${error.message}`).join('\n')
                    : '';
                const message = details || data.message || 'Request failed';
                const requestError = new Error(message);
                requestError.status = response.status;
                requestError.errors = data.errors || [];
                requestError.response = data;
                throw requestError;
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async get(endpoint, params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`${endpoint}${query ? '?' + query : ''}`);
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    async uploadImage(file, folder = 'general') {
        const formData = new FormData();
        formData.append('folder', folder);
        formData.append('image', file);

        return this.request('/uploads/image', {
            method: 'POST',
            body: formData
        });
    }

    async uploadDocument(file, folder = 'documents') {
        const formData = new FormData();
        formData.append('folder', folder);
        formData.append('document', file);

        return this.request('/uploads/document', {
            method: 'POST',
            body: formData
        });
    }

    login(email, password, role = 'buyer') {
        if (role === 'admin') {
            return this.post('/admin/auth/login', { email, password });
        }
        return this.post(`/auth/login/${role}`, { email, password });
    }

    register(userData, role = 'buyer') {
        return this.post(`/auth/register/${role}`, userData);
    }

    async refreshToken() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            this.logout();
            throw new Error('No refresh token');
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/auth/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Token refresh failed');
            }
            
            localStorage.setItem('accessToken', data.data.accessToken);
            localStorage.setItem('refreshToken', data.data.refreshToken);
            
            return data.data;
        } catch (error) {
            this.logout();
            throw error;
        }
    }

    forgotPassword(email) {
        return this.post('/auth/forgot-password', { email });
    }

    resetPassword(tokenOrData, newPassword) {
        if (typeof tokenOrData === 'object' && tokenOrData !== null) {
            return this.post('/auth/reset-password', tokenOrData);
        }
        return this.post('/auth/reset-password', { token: tokenOrData, newPassword });
    }

    logout() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('admin');
        localStorage.removeItem('shop');
        localStorage.removeItem('role');
    }

    getProfile() {
        return this.get('/auth/me');
    }

    updateProfile(data) {
        return this.put('/auth/profile', data);
    }

    changePassword(currentPassword, newPassword) {
        return this.put('/auth/change-password', { currentPassword, newPassword });
    }

    getProducts(params = {}) {
        return this.get('/products', params);
    }

    getFeaturedProducts(limit = 8) {
        return this.get('/products/featured', { limit });
    }

    getBestsellers(limit = 8) {
        return this.get('/products/bestsellers', { limit });
    }

    getNewProducts(limit = 8) {
        return this.get('/products/new', { limit });
    }

    getSaleProducts(limit = 8) {
        return this.get('/products/sale', { limit });
    }

    getProduct(id) {
        return this.get(`/products/${id}`);
    }

    searchProducts(query) {
        return this.get('/products/search', { q: query });
    }

    getCategories() {
        return this.get('/products/categories');
    }

    getProductFilters() {
        return this.get('/products/filters');
    }

    getProductReviews(id, params = {}) {
        return this.get(`/products/${id}/reviews`, params);
    }

    getReviews(id, params = {}) {
        return this.getProductReviews(id, params);
    }

    getBanners() {
        return this.get('/public/banners');
    }

    getPromotions() {
        return this.get('/public/promotions');
    }

    getArticles(params = {}) {
        return this.get('/public/articles', params);
    }

    getArticle(slug) {
        return this.get(`/public/articles/${slug}`);
    }

    getPublicPages(params = {}) {
        return this.get('/public/pages', params);
    }

    getPublicPage(slug) {
        return this.get(`/public/pages/${slug}`);
    }

    getContactInfo() {
        return this.get('/public/contact-info');
    }

    sendContact(data) {
        return this.post('/public/contact', data);
    }

    getCart() {
        return this.get('/user/cart');
    }

    addToCart(productId, quantity = 1) {
        return this.post('/user/cart/add', { productId, quantity });
    }

    updateCartItem(productId, quantity) {
        return this.put(`/user/cart/${productId}`, { quantity });
    }

    removeFromCart(productId) {
        return this.delete(`/user/cart/${productId}`);
    }

    clearCart() {
        return this.delete('/user/cart');
    }

    getWishlist() {
        return this.get('/user/wishlist');
    }

    addToWishlist(productId) {
        return this.post(`/user/wishlist/${productId}`);
    }

    removeFromWishlist(productId) {
        return this.delete(`/user/wishlist/${productId}`);
    }

    getOrders(params = {}) {
        return this.get('/orders/my-orders', params);
    }

    getOrder(id) {
        return this.get(`/orders/${id}`);
    }

    getOrderQuote(orderData) {
        return this.post('/orders/quote', orderData);
    }

    createOrder(orderData) {
        return this.post('/orders', orderData);
    }

    createPayment(data) {
        return this.post('/payments/create', data);
    }

    getPaymentQr(id) {
        return this.get(`/payments/${id}/qr`);
    }

    getPaymentStatus(id) {
        return this.get(`/payments/${id}/status`);
    }

    checkPayment(id) {
        return this.post(`/payments/${id}/check`, {});
    }

    verifyPayment(id, verificationCode) {
        return this.post(`/payments/${id}/verify`, { verification_code: verificationCode });
    }

    submitPaymentCallback(data) {
        return this.post('/payments/callback', data);
    }

    validateCoupon(code, orderData = {}) {
        const payload = typeof orderData === 'number'
            ? { code, subtotal: orderData }
            : { code, ...orderData };
        return this.post('/orders/validate-coupon', payload);
    }

    cancelOrder(id, reason) {
        return this.put(`/orders/${id}/cancel`, { reason });
    }

    createReview(orderId, productId, data) {
        return this.post(`/orders/${orderId}/reviews/${productId}`, data);
    }

    requestOrderReturn(id, data) {
        return this.post(`/orders/${id}/returns`, data);
    }

    getBuyerReturns(params = {}) {
        return this.get('/orders/returns', params);
    }

    getBuyerReturn(id) {
        return this.get(`/orders/returns/${id}`);
    }

    addReturnEvidence(id, data) {
        return this.request(`/orders/returns/${id}/add-evidence`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    getMyShop() {
        return this.get('/shops/my-shop');
    }

    getShops(params = {}) {
        return this.get('/shops', params);
    }

    getShop(id) {
        return this.get(`/shops/${id}`);
    }

    getShopProducts(id, params = {}) {
        return this.get(`/shops/${id}/products`, params);
    }

    createShop(shopData) {
        return this.post('/shops', shopData);
    }

    updateShop(shopData) {
        return this.put('/shops/my-shop', shopData);
    }

    updateBankAccount(bankInfo) {
        return this.put('/shops/my-shop/bank', bankInfo);
    }

    getSellerApplication() {
        return this.get('/seller-applications/me');
    }

    saveSellerApplication(data) {
        return this.put('/seller-applications/me', data);
    }

    submitSellerApplication(data) {
        return this.post('/seller-applications/me/submit', data);
    }

    resubmitSellerApplication(data) {
        return this.post('/seller-applications/me/resubmit', data);
    }

    getSellerCareService() {
        return this.get('/seller/care-services/me');
    }

    saveSellerCareServiceApplication(data) {
        return this.put('/seller/care-services/me', data);
    }

    submitSellerCareServiceApplication(data) {
        return this.post('/seller/care-services/me/submit', data);
    }

    resubmitSellerCareServiceApplication(data) {
        return this.post('/seller/care-services/me/resubmit', data);
    }

    getSellerCareServiceOfferings() {
        return this.get('/seller/care-services/offerings');
    }

    createSellerCareServiceOffering(data) {
        return this.post('/seller/care-services/offerings', data);
    }

    updateSellerCareServiceOffering(id, data) {
        return this.put(`/seller/care-services/offerings/${id}`, data);
    }

    deleteSellerCareServiceOffering(id) {
        return this.delete(`/seller/care-services/offerings/${id}`);
    }

    getSellerCareServiceBookings(params = {}) {
        return this.get('/seller/care-services/bookings', params);
    }

    updateSellerCareServiceBookingStatus(id, status, sellerNote = '') {
        return this.put(`/seller/care-services/bookings/${id}/status`, { status, sellerNote });
    }

    getShopCareServices(id) {
        return this.get(`/shops/${id}/care-services`);
    }

    createCareServiceBooking(shopId, data) {
        return this.post(`/shops/${shopId}/care-services/bookings`, data);
    }

    getMyCareServiceBookings(params = {}) {
        return this.get('/user/care-services/bookings', params);
    }

    getMyCareServiceBooking(id) {
        return this.get(`/user/care-services/bookings/${id}`);
    }

    cancelMyCareServiceBooking(id, note = '') {
        return this.put(`/user/care-services/bookings/${id}/cancel`, { note });
    }

    rescheduleMyCareServiceBooking(id, data) {
        return this.put(`/user/care-services/bookings/${id}/reschedule`, data);
    }

    createCareServiceReview(id, data) {
        return this.post(`/user/care-services/bookings/${id}/reviews`, data);
    }

    getSellerProducts(params = {}) {
        return this.get('/seller/products', params);
    }

    createProduct(productData) {
        return this.post('/seller/products', productData);
    }

    updateProduct(id, productData) {
        return this.put(`/seller/products/${id}`, productData);
    }

    deleteProduct(id) {
        return this.delete(`/seller/products/${id}`);
    }

    updateProductStock(id, stock, note) {
        return this.put(`/seller/products/${id}/stock`, { stock, note });
    }

    getSellerOrders(params = {}) {
        return this.get('/seller/orders', params);
    }

    getSellerOrderStats() {
        return this.get('/seller/orders/stats');
    }

    getSellerDashboard() {
        return this.get('/seller/dashboard');
    }

    getSellerRevenue(params = {}) {
        return this.get('/seller/revenue', params);
    }

    getSellerOrder(id) {
        return this.get(`/seller/orders/${id}`);
    }

    updateOrderStatus(id, status, reason, tracking = {}) {
        return this.put(`/seller/orders/${id}/status`, { status, reason, ...tracking });
    }

    getSellerReturns(params = {}) {
        return this.get('/seller/orders/returns', params);
    }

    getSellerReturn(id) {
        return this.get(`/seller/orders/returns/${id}`);
    }

    approveSellerReturn(id, note = '') {
        return this.request(`/seller/orders/returns/${id}/approve`, {
            method: 'PATCH',
            body: JSON.stringify({ note })
        });
    }

    rejectSellerReturn(id, note = '') {
        return this.request(`/seller/orders/returns/${id}/reject`, {
            method: 'PATCH',
            body: JSON.stringify({ note })
        });
    }

    requestSellerReturnEvidence(id, note = '') {
        return this.request(`/seller/orders/returns/${id}/request-evidence`, {
            method: 'PATCH',
            body: JSON.stringify({ note })
        });
    }

    getSellerCoupons() {
        return this.get('/seller/coupons');
    }

    createSellerCoupon(data) {
        return this.post('/seller/coupons', data);
    }

    updateSellerCoupon(id, data) {
        return this.put(`/seller/coupons/${id}`, data);
    }

    deleteSellerCoupon(id) {
        return this.delete(`/seller/coupons/${id}`);
    }

    toggleSellerCoupon(id) {
        return this.put(`/seller/coupons/${id}/toggle`);
    }

    getSellerPromotions() {
        return this.get('/seller/promotions');
    }

    createSellerPromotion(data) {
        return this.post('/seller/promotions', data);
    }

    updateSellerPromotion(id, data) {
        return this.put(`/seller/promotions/${id}`, data);
    }

    deleteSellerPromotion(id) {
        return this.delete(`/seller/promotions/${id}`);
    }

    getSellerReviews(params = {}) {
        return this.get('/seller/reviews', params);
    }

    replySellerReview(id, comment) {
        return this.put(`/seller/reviews/${id}/reply`, { comment });
    }

    getSellerSettlements(params = {}) {
        return this.get('/seller/settlements', params);
    }

    requestSellerSettlement(notes) {
        return this.post('/seller/settlements/request', { notes });
    }

    getNotifications(params = {}) {
        return this.get('/user/notifications', params);
    }

    markNotificationRead(id) {
        return this.put(`/user/notifications/${id}/read`);
    }

    markAllNotificationsRead() {
        return this.put('/user/notifications/read-all');
    }

    getChatConversations(params = {}) {
        return this.get('/chat/conversations', params);
    }

    startChatConversation(data) {
        return this.post('/chat/conversations', data);
    }

    getChatMessages(conversationId) {
        return this.get(`/chat/conversations/${conversationId}/messages`);
    }

    sendChatMessage(conversationId, body) {
        return this.post(`/chat/conversations/${conversationId}/messages`, { body });
    }

    markChatConversationRead(conversationId) {
        return this.request(`/chat/conversations/${conversationId}/read`, { method: 'PATCH' });
    }

    getAdminDashboard() {
        return this.get('/admin/dashboard/stats');
    }

    getAdminUsers(params = {}) {
        return this.get('/admin/users', params);
    }

    updateUserRole(id, role) {
        return this.put(`/admin/users/${id}/role`, { role });
    }

    updateUserStatus(id, status) {
        return this.put(`/admin/users/${id}/status`, { status });
    }

    getAdminShops(params = {}) {
        return this.get('/admin/shops', params);
    }

    updateShopStatus(id, status) {
        return this.put(`/admin/shops/${id}/status`, { status });
    }

    getAdminProducts(params = {}) {
        return this.get('/admin/products', params);
    }

    verifyProduct(id) {
        return this.put(`/admin/products/${id}/verify`);
    }

    getAdminCategories() {
        return this.get('/admin/categories/categories');
    }

    getAdminCareServiceApplications(params = {}) {
        return this.get('/admin/care-services/applications', params);
    }

    getAdminCareServiceApplication(id) {
        return this.get(`/admin/care-services/applications/${id}`);
    }

    startAdminCareServiceReview(id, data = {}) {
        return this.post(`/admin/care-services/applications/${id}/start-review`, data);
    }

    requestAdminCareServiceMoreInfo(id, data) {
        return this.post(`/admin/care-services/applications/${id}/request-more-info`, data);
    }

    approveAdminCareServiceApplication(id, data = {}) {
        return this.post(`/admin/care-services/applications/${id}/approve`, data);
    }

    rejectAdminCareServiceApplication(id, data) {
        return this.post(`/admin/care-services/applications/${id}/reject`, data);
    }

    suspendAdminCareServiceApplication(id, data) {
        return this.post(`/admin/care-services/applications/${id}/suspend`, data);
    }

    banAdminCareServiceApplication(id, data) {
        return this.post(`/admin/care-services/applications/${id}/ban`, data);
    }

    createCategory(data) {
        return this.post('/admin/categories/categories', data);
    }

    updateCategory(id, data) {
        return this.put(`/admin/categories/categories/${id}`, data);
    }

    deleteCategory(id) {
        return this.delete(`/admin/categories/categories/${id}`);
    }
}

const api = new ApiClient();
api.guestApi = api;
api.buyerApi = {
    getProfile: api.getProfile.bind(api),
    updateProfile: api.updateProfile.bind(api),
    getCart: api.getCart.bind(api),
    addToCart: api.addToCart.bind(api),
    updateCartItem: api.updateCartItem.bind(api),
    removeFromCart: api.removeFromCart.bind(api),
    clearCart: api.clearCart.bind(api),
    getWishlist: api.getWishlist.bind(api),
    addToWishlist: api.addToWishlist.bind(api),
    removeFromWishlist: api.removeFromWishlist.bind(api),
    getOrders: api.getOrders.bind(api),
    getOrder: api.getOrder.bind(api),
    getOrderQuote: api.getOrderQuote.bind(api),
    createOrder: api.createOrder.bind(api),
    createPayment: api.createPayment.bind(api),
    getPaymentQr: api.getPaymentQr.bind(api),
    getPaymentStatus: api.getPaymentStatus.bind(api),
    checkPayment: api.checkPayment.bind(api),
    verifyPayment: api.verifyPayment.bind(api),
    submitPaymentCallback: api.submitPaymentCallback.bind(api),
    cancelOrder: api.cancelOrder.bind(api),
    validateCoupon: api.validateCoupon.bind(api),
    createReview: api.createReview.bind(api),
    requestOrderReturn: api.requestOrderReturn.bind(api),
    getChatConversations: api.getChatConversations.bind(api),
    startChatConversation: api.startChatConversation.bind(api),
    getChatMessages: api.getChatMessages.bind(api),
    sendChatMessage: api.sendChatMessage.bind(api),
    markChatConversationRead: api.markChatConversationRead.bind(api)
};
api.sellerApi = {
    getDashboard: api.getSellerDashboard.bind(api),
    getRevenue: api.getSellerRevenue.bind(api),
    uploadImage: api.uploadImage.bind(api),
    uploadDocument: api.uploadDocument.bind(api),
    getProducts: api.getSellerProducts.bind(api),
    createProduct: api.createProduct.bind(api),
    updateProduct: api.updateProduct.bind(api),
    deleteProduct: api.deleteProduct.bind(api),
    updateProductStock: api.updateProductStock.bind(api),
    getOrders: api.getSellerOrders.bind(api),
    getStats: api.getSellerOrderStats.bind(api),
    getOrder: api.getSellerOrder.bind(api),
    updateOrderStatus: api.updateOrderStatus.bind(api),
    getCoupons: api.getSellerCoupons.bind(api),
    createCoupon: api.createSellerCoupon.bind(api),
    updateCoupon: api.updateSellerCoupon.bind(api),
    deleteCoupon: api.deleteSellerCoupon.bind(api),
    toggleCoupon: api.toggleSellerCoupon.bind(api),
    getPromotions: api.getSellerPromotions.bind(api),
    createPromotion: api.createSellerPromotion.bind(api),
    updatePromotion: api.updateSellerPromotion.bind(api),
    deletePromotion: api.deleteSellerPromotion.bind(api),
    getReviews: api.getSellerReviews.bind(api),
    replyReview: api.replySellerReview.bind(api),
    getSettlements: api.getSellerSettlements.bind(api),
    requestSettlement: api.requestSellerSettlement.bind(api),
    getChatConversations: api.getChatConversations.bind(api),
    getChatMessages: api.getChatMessages.bind(api),
    sendChatMessage: api.sendChatMessage.bind(api),
    markChatConversationRead: api.markChatConversationRead.bind(api)
};
api.adminApi = api;
window.api = api;
