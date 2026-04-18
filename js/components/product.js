class ProductManager {
    constructor() {
        this.guestApi = api.guestApi;
        this.products = [];
        this.categories = [];
        this.currentProduct = null;
    }

    productImage(product = {}) {
        const haystack = [product.name, product.brand, ...(product.tags || [])]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        const image = product.images?.[0] || product.image || product.thumbnail;
        if (image && !/images\.unsplash\.com|via\.placeholder\.com|placeholder\.com/i.test(image)) {
            return image;
        }
        if (haystack.includes('cat') || haystack.includes('mèo')) return '/assets/images/pet-cat.svg';
        if (haystack.includes('bird') || haystack.includes('chim')) return '/assets/images/pet-bird.svg';
        if (haystack.includes('fish') || haystack.includes('cá')) return '/assets/images/pet-fish.svg';
        if (haystack.includes('rabbit') || haystack.includes('thỏ')) return '/assets/images/pet-rabbit.svg';
        if (haystack.includes('toy') || haystack.includes('đồ chơi')) return '/assets/images/pet-toy.svg';
        if (haystack.includes('food') || haystack.includes('treat') || haystack.includes('thức ăn')) return '/assets/images/pet-food.svg';
        return '/assets/images/pet-generic.svg';
    }

    async init() {
        await this.loadCategories();
    }

    async loadCategories() {
        try {
            const response = await this.guestApi.getCategories();
            this.categories = response.data || [];
            this.renderCategoryDropdown();
        } catch (error) {
            console.error('Không thể tải danh mục:', error);
        }
    }

    renderCategoryDropdown() {
        const dropdowns = document.querySelectorAll('#searchCategory');
        dropdowns.forEach(dropdown => {
            dropdown.innerHTML = [
                '<option value="all">Tất cả danh mục</option>',
                ...this.categories.map(cat => `<option value="${cat._id}">${cat.name}</option>`)
            ].join('');
        });
    }

    async loadFeaturedProducts() {
        try {
            const response = await this.guestApi.getFeaturedProducts();
            this.products = response.data?.products || [];
            this.renderProducts(this.products);
        } catch (error) {
            console.error('Không thể tải sản phẩm nổi bật:', error);
            this.loadSampleProducts();
        }
    }

    async loadProducts(params = {}) {
        try {
            const response = await this.guestApi.getProducts(params);
            this.products = response.data?.products || response.data || [];
            return this.products;
        } catch (error) {
            console.error('Không thể tải sản phẩm:', error);
            return [];
        }
    }

    async loadProduct(id) {
        try {
            const response = await this.guestApi.getProduct(id);
            this.currentProduct = response.data;
            return this.currentProduct;
        } catch (error) {
            console.error('Không thể tải chi tiết sản phẩm:', error);
            return null;
        }
    }

    renderProducts(products, containerId = 'productsGrid') {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!products || products.length === 0) {
            container.innerHTML = '<p class="no-products">Không tìm thấy sản phẩm nào</p>';
            return;
        }

        container.innerHTML = products.map(product => this.createProductCard(product)).join('');

        container.querySelectorAll('.product-card').forEach(card => {
            const quickAddBtn = card.querySelector('.quick-add');
            if (quickAddBtn) {
                quickAddBtn.addEventListener('click', () => {
                    const productId = card.dataset.productId;
                    cartManager.addToCart(productId);
                });
            }
        });
    }

    createProductCard(product) {
        const price = product.price || 0;
        const originalPrice = product.originalPrice || product.salePrice || 0;
        const discount = originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0;
        const image = this.productImage(product);
        const name = product.name || 'Sản phẩm';
        const rating = product.rating || 4.5;
        const reviewCount = product.reviewCount || 0;
        const productId = product._id || product.id;
        const stars = this.renderStars(rating);

        return `
            <div class="product-card" data-product-id="${productId}">
                <div class="product-image">
                    ${discount > 0 ? `<span class="product-badge badge-sale">-${discount}%</span>` : ''}
                    <div class="product-actions">
                        <button class="quick-add" data-product-id="${productId}"><i class="fas fa-plus"></i> Thêm nhanh</button>
                    </div>
                    <img src="${image}" alt="${name}" class="product-img" loading="lazy">
                </div>
                <div class="product-info">
                    <span class="product-brand">${product.brand || 'PetNest'}</span>
                    <h4 class="product-name"><a href="/pages/shop/product.html?id=${productId}">${name}</a></h4>
                    <div class="product-rating">
                        <div class="stars">${stars}</div>
                        <span>(${reviewCount})</span>
                    </div>
                    <div class="product-price">
                        <span class="price-current">${window.utils.formatPrice(price)}</span>
                        ${originalPrice > price ? `<span class="price-old">${window.utils.formatPrice(originalPrice)}</span>` : ''}
                    </div>
                    <div class="product-delivery"><i class="fas fa-truck"></i> Giao nhanh trong ngày</div>
                </div>
            </div>
        `;
    }

    renderStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(rating)) {
                stars += '<i class="fas fa-star"></i>';
            } else if (i - rating < 1 && i - rating > 0) {
                stars += '<i class="fas fa-star-half-alt"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        return stars;
    }

    loadSampleProducts() {
        const sampleProducts = [
            { _id: '1', name: 'Hạt cao cấp cho chó', price: 429000, originalPrice: 549000, rating: 4.5, reviewCount: 2456, images: ['/assets/images/pet-food.svg'] },
            { _id: '2', name: 'Thức ăn trong nhà cho mèo', price: 385000, rating: 5, reviewCount: 1892, images: ['/assets/images/pet-cat.svg'] },
            { _id: '3', name: 'Bánh thưởng dinh dưỡng cho chó', price: 159000, originalPrice: 219000, rating: 4, reviewCount: 3221, images: ['/assets/images/pet-food.svg'] },
            { _id: '4', name: 'Thức ăn cho chim Forti-Diet', price: 129000, rating: 4.5, reviewCount: 567, images: ['/assets/images/pet-bird.svg'] },
            { _id: '5', name: 'Thức ăn cá Tropical Flakes', price: 85000, rating: 5, reviewCount: 4102, images: ['/assets/images/pet-fish.svg'] },
            { _id: '6', name: 'Cỏ khô Timothy cho thỏ', price: 189000, rating: 4.5, reviewCount: 892, images: ['/assets/images/pet-rabbit.svg'] },
            { _id: '7', name: 'Đồ chơi Kong Classic cho chó', price: 169000, rating: 5, reviewCount: 5678, images: ['/assets/images/pet-toy.svg'] },
            { _id: '8', name: 'Đồ chơi đào bới cho mèo', price: 199000, originalPrice: 249000, rating: 4, reviewCount: 1234, images: ['/assets/images/pet-toy.svg'] }
        ];
        this.renderProducts(sampleProducts);
    }

    async searchProducts(query, category = 'all') {
        try {
            let response;
            if (category === 'all') {
                response = await this.guestApi.searchProducts(query);
            } else {
                response = await this.guestApi.getProducts({ search: query, category });
            }
            return response.data?.products || response.data || [];
        } catch (error) {
            console.error('Không thể tìm kiếm sản phẩm:', error);
            return [];
        }
    }

    async loadReviews(productId, page = 1) {
        try {
            const response = await this.guestApi.getProductReviews(productId, { page, limit: 10 });
            return response.data || { reviews: [], ratingStats: {} };
        } catch (error) {
            console.error('Không thể tải đánh giá:', error);
            return { reviews: [], ratingStats: {} };
        }
    }
}

window.productManager = new ProductManager();
