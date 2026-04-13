const LOCAL_IMAGE_BY_KEY = {
    dog: '/assets/images/pet-dog.svg',
    cat: '/assets/images/pet-cat.svg',
    bird: '/assets/images/pet-bird.svg',
    fish: '/assets/images/pet-fish.svg',
    rabbit: '/assets/images/pet-rabbit.svg',
    hamster: '/assets/images/pet-hamster.svg',
    reptile: '/assets/images/pet-reptile.svg',
    'small-pet': '/assets/images/pet-hamster.svg',
    grooming: '/assets/images/pet-grooming.svg',
    habitat: '/assets/images/pet-habitat.svg',
    food: '/assets/images/pet-food.svg',
    toy: '/assets/images/pet-toy.svg',
    vet: '/assets/images/pet-vet.svg',
    article: '/assets/images/pet-article.svg',
    generic: '/assets/images/pet-generic.svg'
};

function remotePhoto(photoId, width = 1200, height = 900) {
    return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
}

const PHOTO_IMAGE_BY_KEY = {
    dog: remotePhoto('photo-1587300003388-59208cc962cb'),
    cat: remotePhoto('photo-1574158622682-e40e69881006'),
    bird: remotePhoto('photo-1444464666168-49d633b86797'),
    fish: remotePhoto('photo-1522069169874-c58ec4b76be5'),
    rabbit: remotePhoto('photo-1585110396000-c9ffd4e4b308'),
    hamster: remotePhoto('photo-1425082661705-1834bfd09dca'),
    reptile: remotePhoto('photo-1533371356817-02152aef1506'),
    'small-pet': remotePhoto('photo-1548767797-d8c844163c4c'),
    grooming: remotePhoto('photo-1516734212186-a967f81ad0d7'),
    habitat: remotePhoto('photo-1601758125946-6ec2ef64daf8'),
    food: remotePhoto('photo-1601758124510-52d02ddb7cbd'),
    toy: remotePhoto('photo-1535294435445-d7249524ef2e'),
    litter: remotePhoto('photo-1514888286974-6c03e2ca1dba'),
    aquarium: remotePhoto('photo-1522069169874-c58ec4b76be5'),
    bed: remotePhoto('photo-1601758125946-6ec2ef64daf8'),
    fashion: remotePhoto('photo-1507146426996-ef05306b995a'),
    health: remotePhoto('photo-1628009368231-7bb7cfcb0def'),
    vet: remotePhoto('photo-1558788353-f76d92427f16'),
    article: remotePhoto('photo-1450778869180-41d0601e046e'),
    generic: remotePhoto('photo-1548199973-03cce0bbc87b')
};

function localImage(key = 'generic') {
    return LOCAL_IMAGE_BY_KEY[key] || LOCAL_IMAGE_BY_KEY.generic;
}

function displayImage(key = 'generic') {
    return PHOTO_IMAGE_BY_KEY[key] || PHOTO_IMAGE_BY_KEY.generic;
}

function normalizeShopLabels(shop = {}) {
    const labels = Array.isArray(shop.labels) ? shop.labels.filter(Boolean) : [];
    if (labels.length) return labels;
    return shop.verificationLevel ? [shop.verificationLevel] : [];
}

function shopLabelText(label = '') {
    const normalized = String(label || '').toLowerCase();
    if (normalized === 'petmall') return 'PetMall';
    if (normalized === 'official_brand') return 'Official Brand';
    if (normalized === 'verified_seller') return 'Verified Seller';
    return normalized ? normalized.replace(/_/g, ' ') : '';
}

function renderShopLabelBadges(shop = {}) {
    const labels = normalizeShopLabels(shop);
    if (!labels.length) return '';

    return `
        <div class="shop-label-row">
            ${labels.map((label) => `<span class="status-badge status-badge-success">${shopLabelText(label)}</span>`).join('')}
        </div>
    `;
}

function escapeHtml(value = '') {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function inferProductImageKey(product = {}) {
    const haystack = [
        product.name,
        product.brand,
        product.category?.name,
        ...(product.tags || []),
        ...(product.attributes || []).map(item => item?.value)
    ].filter(Boolean).join(' ').toLowerCase();

    if (haystack.includes('groom')) return 'grooming';
    if (haystack.includes('litter')) return 'litter';
    if (haystack.includes('aquarium') || haystack.includes('tank')) return 'aquarium';
    if (haystack.includes('house') || haystack.includes('habitat') || haystack.includes('cage') || haystack.includes('crate')) return 'habitat';
    if (haystack.includes('bed') || haystack.includes('blanket') || haystack.includes('mat')) return 'bed';
    if (haystack.includes('toy') || haystack.includes('chew') || haystack.includes('kong')) return 'toy';
    if (haystack.includes('jacket') || haystack.includes('harness') || haystack.includes('collar') || haystack.includes('leash')) return 'fashion';
    if (haystack.includes('health') || haystack.includes('supplement') || haystack.includes('flea') || haystack.includes('vitamin')) return 'health';
    if (haystack.includes('food') || haystack.includes('treat') || haystack.includes('pellet') || haystack.includes('flake') || haystack.includes('hay')) return 'food';
    if (haystack.includes('cat')) return 'cat';
    if (haystack.includes('bird')) return 'bird';
    if (haystack.includes('fish') || haystack.includes('aqua')) return 'fish';
    if (haystack.includes('rabbit') || haystack.includes('bunny')) return 'rabbit';
    if (haystack.includes('hamster')) return 'hamster';
    if (haystack.includes('reptile') || haystack.includes('terrarium')) return 'reptile';
    if (haystack.includes('dog') || haystack.includes('puppy')) return 'dog';
    return 'generic';
}

function isUnstableRemoteImage(url = '') {
    return /petco\.com|scene7|via\.placeholder\.com|placeholder\.com|lh3\.googleusercontent\.com\/aida-public/i.test(String(url));
}

function resolveImage(url, fallbackKey = 'generic') {
    if (!url || isUnstableRemoteImage(url)) return displayImage(fallbackKey);
    return url;
}

function productImage(product = {}) {
    return resolveImage(product.images?.[0] || product.thumbnail || product.image, inferProductImageKey(product));
}

const moneyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
});

function formatCurrency(amount = 0) {
    return moneyFormatter.format(Number(amount) || 0);
}

function formatReadableStatus(value = '') {
    const normalized = String(value || '').toLowerCase();
    const labelMap = {
        pending: 'Chờ xử lý',
        confirmed: 'Đã xác nhận',
        preparing: 'Đang chuẩn bị',
        shipping: 'Đang giao',
        delivered: 'Đã giao',
        completed: 'Hoàn tất',
        cancelled: 'Đã hủy',
        returned: 'Đã hoàn trả',
        unpaid: 'Chưa thanh toán',
        paid: 'Đã thanh toán',
        failed: 'Thất bại',
        active: 'Đang hoạt động',
        inactive: 'Ngừng hoạt động',
        hidden: 'Đang ẩn',
        visible: 'Đang hiển thị',
        reported: 'Bị báo cáo'
    };
    return labelMap[normalized] || String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function getOrderStatus(order = {}) {
    return order.orderStatus || order.status || 'pending';
}

function getPaymentStatus(order = {}) {
    return order.paymentStatus || order.payment?.status || 'pending';
}

function getShippingStatus(order = {}) {
    return order.shippingStatus || 'pending';
}

function getPaymentMethod(order = {}) {
    return order.paymentMethod || order.payment?.method || 'cod';
}

function formatPaymentMethod(method = '') {
    const normalized = String(method || '').toLowerCase();
    if (normalized === 'cod') return 'Thanh toán khi nhận hàng';
    if (normalized === 'bank_transfer') return 'Chuyển khoản ngân hàng';
    if (normalized === 'online') return 'Thanh toán trực tuyến';
    return formatReadableStatus(normalized || 'cod');
}

function formatAddressLine(address = {}) {
    return [
        address.addressLine || address.street || '',
        address.ward || '',
        address.district || '',
        address.city || '',
        address.country || ''
    ].filter(Boolean).join(', ');
}

function buildStatusBadge(label, variant = 'neutral') {
    return `<span class="status-badge status-badge-${variant}">${label}</span>`;
}

function getOrderStatusBadge(order = {}) {
    const status = getOrderStatus(order);
    const variantMap = {
        pending: 'warning',
        confirmed: 'info',
        shipping: 'info',
        delivered: 'success',
        completed: 'success',
        cancelled: 'danger',
        returned: 'danger'
    };
    return buildStatusBadge(formatReadableStatus(status), variantMap[status] || 'neutral');
}

function getPaymentStatusBadge(order = {}) {
    const status = getPaymentStatus(order);
    const variantMap = {
        unpaid: 'warning',
        pending: 'info',
        paid: 'success',
        failed: 'danger'
    };
    return buildStatusBadge(formatReadableStatus(status), variantMap[status] || 'neutral');
}

function getShippingStatusBadge(order = {}) {
    const status = getShippingStatus(order);
    const variantMap = {
        pending: 'warning',
        shipping: 'info',
        delivered: 'success',
        cancelled: 'danger'
    };
    return buildStatusBadge(formatReadableStatus(status), variantMap[status] || 'neutral');
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Pet Marketplace initializing...');

    setupEventListeners();
    initSinglePageViews();
    await loadHomeData();
});

async function loadHomeData() {
    try {
        await Promise.all([
            loadBanners(),
            loadPromotions(),
            loadFeaturedProducts(),
            loadPetMallShops()
        ]);
    } catch (error) {
        console.error('Failed to load home data:', error);
    }
}

async function loadPromotions() {
    const promoGrid = document.querySelector('.promo-grid');
    if (!promoGrid) return;

    try {
        const response = await api.getPromotions();
        const promotions = response.data || [];
        if (!promotions.length) return;

        promoGrid.innerHTML = promotions.slice(0, 3).map((promotion, index) => `
            <a href="${promotion.link || '#shop?onSale=true'}" class="promo-card ${index === 0 ? 'promo-card-large' : ''}" style="background: linear-gradient(135deg, #004589 0%, #009ddc 100%);">
                <div class="promo-content">
                    <span class="promo-tag">${promotion.type || 'Deal'}</span>
                    <h3>${promotion.title}</h3>
                    <p>${promotion.description || `${promotion.discountPercent || ''}% off`}</p>
                    <span class="promo-link">Mua ngay <i class="fas fa-arrow-right"></i></span>
                </div>
                <div class="promo-image"><img src="${resolveImage(promotion.image, 'food')}" alt="${promotion.title}"></div>
            </a>
        `).join('');
    } catch (error) {
        console.error('Failed to load promotions:', error);
    }
}

async function loadBanners() {
    const heroSlider = document.getElementById('heroSlider');
    if (!heroSlider) return;

    try {
        const response = await api.getBanners();
        const banners = response.data || [];
        
        if (banners.length > 0) {
            heroSlider.innerHTML = banners.map((banner, index) => `
                <div class="hero-slide ${index === 0 ? 'active' : ''}" 
                     style="background: linear-gradient(135deg, ${banner.backgroundColor || '#004589'} 0%, ${banner.secondaryColor || '#0066b2'} 100%);">
                    <div class="container">
                        <div class="hero-content">
                            <span class="hero-badge">${banner.badge || 'Ưu đãi nổi bật'}</span>
                            <h1>${banner.title}</h1>
                            <p>${banner.subtitle}</p>
                            <a href="${banner.link || '#'}" class="btn btn-primary">Mua ngay</a>
                        </div>
                        <div class="hero-image">
                            <img src="${resolveImage(banner.image, 'dog')}" alt="${banner.title}" class="hero-pet-img">
                        </div>
                    </div>
                </div>
            `).join('');

            initHeroSlider();
        } else {
            loadDefaultSlider();
        }
    } catch (error) {
        console.error('Failed to load banners:', error);
        loadDefaultSlider();
    }
}

function loadDefaultSlider() {
    const heroSlider = document.getElementById('heroSlider');
    if (!heroSlider) return;

    const slides = [
        {
            badge: 'Chào mừng đến với Pet Marketplace',
            title: 'Mọi thứ thú cưng cần đều có ở đây',
            subtitle: 'Mua sắm hàng nghìn sản phẩm thú cưng từ các nhà bán uy tín với chất lượng tốt và giá hợp lý.',
            image: displayImage('dog'),
            link: '#shop',
            gradient: 'linear-gradient(135deg, #004589 0%, #0066b2 50%, #009ddc 100%)'
        },
        {
            badge: 'Mua theo thú cưng',
            title: 'Thức ăn, chỗ ở và chăm sóc',
            subtitle: 'Các cửa hàng cho chó, mèo, chim, cá, thỏ, hamster và bò sát đã sẵn sàng để bạn trải nghiệm.',
            image: displayImage('cat'),
            link: '#shop?petType=cat',
            gradient: 'linear-gradient(135deg, #91310a 0%, #e97b32 100%)'
        },
        {
            badge: 'Dữ liệu sàn theo thời gian thực',
            title: 'Sản phẩm từ người bán đồng bộ tức thì',
            subtitle: 'Khi người bán thay đổi giá, tồn kho hoặc trạng thái hiển thị, trang công khai sẽ cập nhật ngay từ MongoDB.',
            image: displayImage('rabbit'),
            link: '#shop?search=habitat',
            gradient: 'linear-gradient(135deg, #005d16 0%, #008b3a 100%)'
        }
    ];

    heroSlider.innerHTML = slides.map((slide, index) => `
        <div class="hero-slide ${index === 0 ? 'active' : ''}" style="background: ${slide.gradient};">
            <div class="container">
                <div class="hero-content">
                    <span class="hero-badge">${slide.badge}</span>
                    <h1>${slide.title}</h1>
                    <p>${slide.subtitle}</p>
                    <a href="${slide.link}" class="btn btn-primary">Mua ngay</a>
                </div>
                <div class="hero-image">
                    <img src="${slide.image}" alt="${slide.title}" class="hero-pet-img">
                </div>
            </div>
        </div>
    `).join('');
    initHeroSlider();
}

async function loadFeaturedProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;

    try {
        appShowLoading(productsGrid);
        const response = await api.getFeaturedProducts(8);
        const products = response.data || [];
        
        if (products.length > 0) {
            renderProducts(products);
        } else {
            loadSampleProducts();
        }
    } catch (error) {
        console.error('Failed to load products:', error);
        loadSampleProducts();
    }
}

function renderProducts(products) {
    const container = document.getElementById('productsGrid');
    if (!container) return;

    container.innerHTML = products.map(product => createProductCard(product)).join('');
    bindProductCards(container);
}

function createShopSpotlightCard(shop = {}) {
    const shopId = shop._id || '';
    const shopName = shop.name || 'Cửa hàng PetMall';
    const logo = resolveImage(shop.logo || shop.banner, 'generic');
    const productCount = Number(shop.productCount || 0);
    const addressText = formatShopMapAddress(shop.address || {});

    return `
        <article class="shop-spotlight-card">
            <a class="shop-spotlight-media" href="#shop-detail?id=${shopId}">
                <img src="${logo}" alt="${shopName}" loading="lazy">
            </a>
            <div class="shop-spotlight-content">
                <div class="shop-spotlight-head">
                    <div>
                        <h3><a href="#shop-detail?id=${shopId}">${shopName}</a></h3>
                        ${renderShopLabelBadges(shop)}
                    </div>
                    <span class="shop-spotlight-score">${Number(shop.rating || 0).toFixed(1)}</span>
                </div>
                <p class="shop-spotlight-desc">${shop.description || 'Cửa hàng uy tín đã được sàn kiểm duyệt và gắn nhãn PetMall.'}</p>
                <div class="shop-spotlight-meta">
                    <span>${productCount} sản phẩm</span>
                    <span>${shop.reviewCount || 0} đánh giá</span>
                    ${addressText ? `<span>${addressText}</span>` : ''}
                </div>
                <div class="shop-spotlight-actions">
                    <a class="btn btn-secondary btn-small" href="#shop?shop=${shopId}&mallOnly=true">Xem sản phẩm</a>
                    <a class="btn btn-primary btn-small" href="#shop-detail?id=${shopId}">Vào shop</a>
                </div>
            </div>
        </article>
    `;
}

async function loadPetMallShops() {
    const section = document.getElementById('petMallShopsSection');
    const container = document.getElementById('petMallShopsGrid');
    if (!section || !container) return;

    try {
        const response = await api.getShops({ label: 'petmall', limit: 6 });
        const shops = response.data || [];

        if (!shops.length) {
            section.style.display = 'none';
            return;
        }

        section.style.display = '';
        container.innerHTML = shops.map(createShopSpotlightCard).join('');
    } catch (error) {
        console.error('Failed to load PetMall shops:', error);
        section.style.display = 'none';
    }
}

function isSellerBuyingBlocked() {
    return authManager.isAuthenticated && authManager.user?.role === 'seller';
}

function buildCatalogActionButtons(productId) {
    if (isSellerBuyingBlocked()) {
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

function createProductCard(product) {
    const price = product.price || 0;
    const originalPrice = product.originalPrice || product.salePrice;
    const discount = originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0;
    const image = productImage(product);
    const name = product.name || 'Sản phẩm';
    const rating = product.rating || 4.5;
    const reviewCount = product.reviewCount || 0;
    const productId = product._id || product.id;
    const shop = product.shop || {};
    const shopId = shop._id || '';

    return `
        <div class="product-card" data-product-id="${productId}">
            <div class="product-image">
                ${discount > 0 ? `<span class="product-badge badge-sale">-${discount}%</span>` : ''}
                <a href="#product?id=${productId}">
                    <img src="${image}" alt="${name}" class="product-img" loading="lazy">
                </a>
            </div>
            <div class="product-info">
                <span class="product-brand">${product.brand || 'Cửa hàng thú cưng'}</span>
                <h4 class="product-name"><a href="#product?id=${productId}">${name}</a></h4>
                ${shopId ? `<div class="product-shop-meta"><a class="product-shop-link" href="#shop-detail?id=${shopId}">${escapeHtml(shop.name || 'Cửa hàng')}</a>${renderShopLabelBadges(shop)}</div>` : ''}
                <div class="product-rating">
                    <div class="stars">${appGenerateStars(rating)}</div>
                    <span>(${reviewCount})</span>
                </div>
                <div class="product-price">
                    <span class="price-current">$${price.toFixed(2)}</span>
                    ${originalPrice > price ? `<span class="price-old">$${originalPrice.toFixed(2)}</span>` : ''}
                </div>
                <div class="product-delivery"><i class="fas fa-truck"></i> Giao nhanh trong ngày</div>
                <div class="product-card-actions">
                    ${buildCatalogActionButtons(productId)}
                </div>
            </div>
        </div>
    `;
}

function appGenerateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) stars += '<i class="fas fa-star"></i>';
        else if (i - rating < 1 && i - rating > 0) stars += '<i class="fas fa-star-half-alt"></i>';
        else stars += '<i class="far fa-star"></i>';
    }
    return stars;
}

function loadSampleProducts() {
    const sampleProducts = [
        { _id: '1', name: 'Hạt cao cấp cho chó', price: 42.99, originalPrice: 54.99, rating: 4.5, reviewCount: 2456, images: [displayImage('food')] },
        { _id: '2', name: 'Cát vệ sinh khử mùi cho mèo', price: 18.49, originalPrice: 23.99, rating: 4.8, reviewCount: 1892, images: [displayImage('litter')] },
        { _id: '3', name: 'Bánh thưởng dinh dưỡng cho chó', price: 15.99, originalPrice: 21.99, rating: 4, reviewCount: 3221, images: [displayImage('food')] },
        { _id: '4', name: 'Lồng nuôi chim gỗ cao cấp', price: 62.99, rating: 4.5, reviewCount: 567, images: [displayImage('habitat')] },
        { _id: '5', name: 'Bể cá mini kèm lọc', price: 88.49, rating: 5, reviewCount: 1402, images: [displayImage('aquarium')] },
        { _id: '6', name: 'Đệm ngủ êm cho thỏ và hamster', price: 24.99, rating: 4.5, reviewCount: 892, images: [displayImage('bed')] },
        { _id: '7', name: 'Đồ chơi gặm nhai cao su cho chó', price: 16.99, rating: 5, reviewCount: 5678, images: [displayImage('toy')] },
        { _id: '8', name: 'Yếm và vòng cổ thời trang cho mèo', price: 19.99, originalPrice: 24.99, rating: 4.2, reviewCount: 1234, images: [displayImage('fashion')] }
    ];
    renderProducts(sampleProducts);
}

function bindProductCards(scope = document) {
    scope.querySelectorAll('.product-card[data-product-id]').forEach(card => {
        if (card.dataset.cardBound === 'true') return;
        card.dataset.cardBound = 'true';
        card.addEventListener('click', event => {
            if (event.target.closest('a, button, input, select, textarea, label')) return;
            const productId = card.dataset.productId;
            if (productId) window.location.hash = `product?id=${encodeURIComponent(productId)}`;
        });
    });

    scope.querySelectorAll('[data-product-action="quick-add"]').forEach(button => {
        if (button.dataset.actionBound === 'true') return;
        button.dataset.actionBound = 'true';
        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            addToCart(button.dataset.productId);
        });
    });

    scope.querySelectorAll('[data-product-action="buy-now"]').forEach(button => {
        if (button.dataset.actionBound === 'true') return;
        button.dataset.actionBound = 'true';
        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            buyNow(button.dataset.productId);
        });
    });
}

async function addToCart(productId) {
    if (!authManager.isAuthenticated) {
        authManager.showLoginModal();
        return false;
    }

    if (authManager.user?.role === 'seller') {
        authManager.showNotification('Tài khoản người bán không được thêm sản phẩm vào giỏ hàng.', 'error');
        return false;
    }

    try {
        await api.addToCart(productId, 1);
        authManager.showNotification('Đã thêm vào giỏ hàng!', 'success');
        updateCartCount();
        return true;
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể thêm vào giỏ hàng', 'error');
        return false;
    }
}

async function buyNow(productId) {
    if (!authManager.isAuthenticated) {
        authManager.showLoginModal();
        return false;
    }

    if (authManager.user?.role === 'seller') {
        authManager.showNotification('Tài khoản người bán không được mua hàng theo luồng người mua.', 'error');
        return false;
    }

    try {
        const response = await api.getProduct(productId);
        const product = response?.data?.product || response?.data;

        if (!product?._id) {
            throw new Error('Không tìm thấy sản phẩm để thanh toán ngay.');
        }

        sessionStorage.setItem('buyNowCheckoutItems', JSON.stringify([{
            product,
            quantity: 1
        }]));

        window.location.hash = 'checkout';
        return true;
    } catch (error) {
        authManager.showNotification(error.message || 'Không thể chuyển sang bước thanh toán ngay.', 'error');
        return false;
    }
}

async function updateCartCount() {
    if (!authManager.isAuthenticated) {
        document.querySelectorAll('.cart-count').forEach(el => el.textContent = '0');
        return;
    }

    if (authManager.user?.role === 'seller') {
        document.querySelectorAll('.cart-count').forEach(el => el.textContent = '0');
        return;
    }

    try {
        const response = await api.getCart();
        const count = response.data?.items?.length || 0;
        document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);
    } catch (error) {
        console.error('Failed to update cart count:', error);
    }
}

function setupEventListeners() {
    document.addEventListener('click', event => {
        const actionButton = event.target.closest('[data-product-action]');
        if (actionButton) {
            event.preventDefault();
            event.stopPropagation();
            const productId = actionButton.dataset.productId;
            if (!productId) return;
            if (actionButton.dataset.productAction === 'buy-now') {
                buyNow(productId);
            } else {
                addToCart(productId);
            }
            return;
        }

        const productCard = event.target.closest('.product-card[data-product-id]');
        if (productCard && !event.target.closest('a, button, input, select, textarea, label')) {
            const productId = productCard.dataset.productId;
            if (productId) window.location.hash = `product?id=${encodeURIComponent(productId)}`;
        }
    });

    document.addEventListener('error', event => {
        const image = event.target;
        if (image?.tagName === 'IMG' && !image.dataset.fallbackApplied) {
            image.dataset.fallbackApplied = 'true';
            image.src = localImage('generic');
        }
    }, true);

    const searchInput = document.querySelector('.search-bar input');
    const searchBtn = document.querySelector('.search-btn');
    const searchCategory = document.getElementById('searchCategory');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNav = document.getElementById('mobileNav');
    const mobileNavClose = document.getElementById('mobileNavClose');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');

    const submitMarketplaceSearch = () => {
        const query = searchInput?.value.trim() || '';
        const petType = mapSearchCategoryToPetType(searchCategory?.value);
        const params = new URLSearchParams();

        if (petType) params.set('petType', petType);
        if (query) params.set('search', query);

        window.location.hash = `shop${params.toString() ? `?${params.toString()}` : ''}`;
    };

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', submitMarketplaceSearch);

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitMarketplaceSearch();
            }
        });
    }

    const openMobileNav = () => {
        mobileNav?.classList.add('active');
        mobileNavOverlay?.classList.add('active');
        document.body.classList.add('mobile-nav-open');
    };

    const closeMobileNav = () => {
        mobileNav?.classList.remove('active');
        mobileNavOverlay?.classList.remove('active');
        document.body.classList.remove('mobile-nav-open');
    };

    mobileMenuBtn?.addEventListener('click', openMobileNav);
    mobileNavClose?.addEventListener('click', closeMobileNav);
    mobileNavOverlay?.addEventListener('click', closeMobileNav);
    mobileNav?.querySelectorAll('a[href]').forEach(link => {
        link.addEventListener('click', closeMobileNav);
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeMobileNav();
    });

    document.getElementById('cartSidebarCheckout')?.addEventListener('click', () => {
        window.location.hash = 'checkout';
    });
    document.getElementById('cartClose')?.addEventListener('click', closeStaticCartShell);
    document.getElementById('cartOverlay')?.addEventListener('click', closeStaticCartShell);

    document.querySelectorAll('.product-tab').forEach(tab => {
        tab.addEventListener('click', async function() {
            document.querySelectorAll('.product-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const tabType = this.dataset.tab;
            const productsGrid = document.getElementById('productsGrid');
            appShowLoading(productsGrid);

            try {
                let response;
                switch (tabType) {
                    case 'bestsellers':
                        response = await api.getBestsellers(8);
                        break;
                    case 'new':
                        response = await api.getNewProducts(8);
                        break;
                    case 'deals':
                        response = await api.getSaleProducts(8);
                        break;
                    default:
                        response = await api.getFeaturedProducts(8);
                }

                const products = response.data || [];
                if (products.length > 0) {
                    renderProducts(products);
                }
            } catch (error) {
                console.error('Tab switch failed:', error);
                loadSampleProducts();
            }
        });
    });

    const subscribeForm = document.querySelector('.subscribe-form');
    if (subscribeForm) {
        subscribeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = subscribeForm.querySelector('input').value.trim();
            if (email) {
                authManager.showNotification('Cảm ơn bạn đã đăng ký nhận tin!', 'success');
                subscribeForm.reset();
            }
        });
    }

    updateCartCount();
    normalizeDemoLinks();

    document.querySelectorAll('.pet-card').forEach(card => {
        const petMap = {
            dogs: 'dog',
            cats: 'cat',
            birds: 'bird',
            fish: 'fish',
            'small-pets': 'small-pet',
            reptiles: 'reptile'
        };
        const rawType = card.textContent.trim().toLowerCase().replace(/\s+/g, '-');
        const petType = petMap[rawType] || rawType;
        card.href = `#shop?petType=${encodeURIComponent(petType)}`;
    });
}

function normalizeDemoLinks() {
    const textRouteMap = new Map([
        ['shop by category', '#shop'],
        ['view all', '#shop'],
        ['food', '#shop?search=food'],
        ['fish food', '#shop?petType=fish&search=food'],
        ['food & treats', '#shop?search=food'],
        ['food & hay', '#shop?search=hay'],
        ['treats', '#shop?search=treat'],
        ['treats & chews', '#shop?search=treat'],
        ['toys', '#shop?search=toy'],
        ['supplies', '#shop'],
        ['grooming', '#contact'],
        ['health care', '#shop?search=health'],
        ['beds & blankets', '#shop?search=bed'],
        ['crates & gates', '#shop?search=crate'],
        ['scratchers', '#shop?search=scratcher'],
        ['furniture', '#shop?search=cat tree'],
        ['litter & accessories', '#shop?search=litter'],
        ['cages', '#shop?search=cage'],
        ['aquariums', '#shop?search=aquarium'],
        ['decor', '#shop?search=decor'],
        ['equipment', '#shop?search=equipment'],
        ['cages & habitats', '#shop?search=habitat'],
        ['bedding', '#shop?search=bedding'],
        ['terrariums', '#shop?search=terrarium'],
        ['heating & lighting', '#shop?search=heat'],
        ['vet services', '#page?slug=vet-services'],
        ['deals', '#shop?onSale=true'],
        ['subscribe & save', '#shop?onSale=true'],
        ['shop now', '#shop'],
        ['explore food', '#shop?search=food'],
        ['book now', '#page?slug=vet-services'],
        ['stores', '#shop'],
        ['track order', '#orders'],
        ['help', '#contact'],
        ['sign in', '#login'],
        ['boarding', '#contact'],
        ['training', '#contact'],
        ['doggie day camp', '#contact'],
        ['help center', '#contact'],
        ['store locator', '#shop'],
        ['gift cards', '#shop?onSale=true'],
        ['careers', '#articles'],
        ['accessibility', '#contact']
    ]);

    document.querySelectorAll('a[href="#"]').forEach(link => {
        const text = link.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
        const next = textRouteMap.get(text);
        if (next) link.setAttribute('href', next);
    });
}

function mapSearchCategoryToPetType(value = '') {
    const categoryMap = {
        dogs: 'dog',
        cats: 'cat',
        birds: 'bird',
        fish: 'fish',
        'small-pets': 'small-pet',
        reptiles: 'reptile'
    };

    return categoryMap[String(value || '').trim().toLowerCase()] || '';
}

function closeStaticCartShell() {
    document.getElementById('cartSidebar')?.classList.remove('active');
    document.getElementById('cartOverlay')?.classList.remove('active');
}

function initSinglePageViews() {
    ensureSpaContainer();
    window.addEventListener('hashchange', renderHashView);
    window.addEventListener('auth:changed', renderHashView);
    document.addEventListener('click', interceptLegacyPageLinks);
    renderHashView();
}

function ensureSpaContainer() {
    if (document.getElementById('spaView')) return;
    const spaView = document.createElement('main');
    spaView.id = 'spaView';
    spaView.className = 'spa-view';
    spaView.style.display = 'none';
    const footer = document.querySelector('.main-footer');
    document.body.insertBefore(spaView, footer);
}

function interceptLegacyPageLinks(event) {
    const link = event.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    const mappedHash = mapLegacyHrefToHash(href);
    if (!mappedHash) return;

    event.preventDefault();
    window.location.hash = mappedHash;
}

function mapLegacyHrefToHash(href) {
    if (href === '/pages/shop/shop.html') return 'shop';
    if (href.startsWith('/pages/shop/shop.html?')) return `shop?${href.split('?')[1]}`;
    if (href.startsWith('/pages/shop/product.html?')) return `product?${href.split('?')[1]}`;
    if (href === '/pages/info/articles.html') return 'articles';
    if (href.startsWith('/pages/info/article.html?')) return `article?${href.split('?')[1]}`;
    if (href === '/pages/info/contact.html') return 'contact';
    if (href.startsWith('/pages/info/page.html?')) return `page?${href.split('?')[1]}`;
    if (href === '/pages/shop/cart.html') return 'cart';
    if (href === '/pages/shop/checkout.html') return 'checkout';
    if (href === '/pages/account/profile.html') return 'account';
    if (href === '/pages/account/orders.html') return 'orders';
    if (href === '/pages/account/service-bookings.html') return 'service-bookings';
    if (href === '/pages/account/wishlist.html') return 'wishlist';
    return null;
}

function parseHashRoute() {
    const raw = window.location.hash.replace(/^#/, '');
    if (!raw) return { route: 'home', params: new URLSearchParams() };
    const [route, query = ''] = raw.split('?');
    return { route, params: new URLSearchParams(query) };
}

async function renderHashView() {
    try {
        const { route, params } = parseHashRoute();
        if (route === 'home') {
            showHomeView();
            return;
        }
        if (route === 'login') {
            showHomeView();
            authManager.showLoginModal();
            return;
        }
        if (route === 'register') {
            showHomeView();
            authManager.showRegisterModal();
            return;
        }

        showSpaView();
        if (route === 'shop') return await renderShopView(params);
        if (route === 'shop-detail') return await renderShopDetailView(params.get('id'));
        if (route === 'product') return await renderProductView(params.get('id'));
        if (route === 'articles') return await renderArticlesView();
        if (route === 'article') return await renderArticleView(params.get('slug'));
        if (route === 'contact') return await renderContactView();
        if (route === 'page') return await renderPageView(params.get('slug'));
        if (route === 'cart') return await renderCartView();
        if (route === 'checkout') return await renderCheckoutView();
        if (route === 'account') return await renderAccountView();
        if (route === 'orders') return await renderOrdersView();
        if (route === 'service-bookings') return await renderCareServiceBookingsView();
        if (route === 'order') return await renderOrderDetailView(params.get('id'));
        if (route === 'wishlist') return await renderWishlistView();
        if (route === 'notifications') return await renderNotificationsView();
        if (route === 'reset-password') return await renderResetPasswordView(params);
        showHomeView();
    } catch (error) {
        console.error('Failed to render view:', error);
        setSpaContent('Có lỗi xảy ra', `<p>${error.message || 'Không thể tải nội dung này.'}</p><p><a href="#shop">Quay lại gian hàng</a></p>`);
    }
}

function showHomeView() {
    document.getElementById('spaView').style.display = 'none';
    document.querySelectorAll('body > section').forEach(section => section.style.display = '');
}

function showSpaView() {
    document.querySelectorAll('body > section').forEach(section => section.style.display = 'none');
    const spaView = document.getElementById('spaView');
    spaView.style.display = 'block';
    spaView.innerHTML = '<div class="container" style="padding: 40px 0;"><div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div></div>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setSpaContent(title, content) {
    document.getElementById('spaView').innerHTML = `
        <div class="container" style="padding: 40px 0;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:24px;">
                <h1>${title}</h1>
                <a href="#home" class="btn btn-secondary">Về trang chủ</a>
            </div>
            ${content}
        </div>
    `;
}

async function renderShopView(params = new URLSearchParams()) {
    const search = params.get('search') || '';
    const category = params.get('category') || '';
    const petType = params.get('petType') || '';
    const brand = params.get('brand') || '';
    const minPrice = params.get('minPrice') || '';
    const maxPrice = params.get('maxPrice') || '';
    const inStock = params.get('inStock') || '';
    const onSale = params.get('onSale') || '';
    const minRating = params.get('minRating') || '';
    const mallOnly = params.get('mallOnly') || '';
    const sortBy = params.get('sortBy') || 'createdAt';
    const sortOrder = params.get('sortOrder') || 'desc';
    const shop = params.get('shop') || '';

    const [categoriesRes, filtersRes, productsRes] = await Promise.all([
        api.getCategories(),
        api.getProductFilters(),
        api.getProducts({ search, category, petType, brand, minPrice, maxPrice, inStock, onSale, minRating, mallOnly, sortBy, sortOrder, shop, limit: 24 })
    ]);

    const categories = categoriesRes.data || [];
    const filters = filtersRes.data || {};
    const products = productsRes.data || [];
    const totalProducts = productsRes.meta?.total ?? products.length;

    const titleParts = ['Sản phẩm'];
    if (mallOnly === 'true') titleParts.push('PetMall');
    if (petType) titleParts.push(petType);
    if (search) titleParts.push(`"${search}"`);

    setSpaContent(titleParts.join(' - '), `
        <div class="shop-content">
            <aside class="shop-sidebar">
                <div class="filter-section">
                    <h3>Tìm kiếm</h3>
                    <input id="spaSearch" value="${escapeHtml(search)}" placeholder="Tìm sản phẩm..." style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px;">
                </div>
                <div class="filter-section">
                    <h3>Danh mục</h3>
                    <select id="spaCategory" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px;">
                        <option value="">Tất cả danh mục</option>
                        ${categories.map(item => `<option value="${item._id}" ${item._id === category ? 'selected' : ''}>${escapeHtml(item.name)} (${item.productCount || 0})</option>`).join('')}
                    </select>
                </div>
                <div class="filter-section">
                    <h3>Loại thú cưng</h3>
                    <select id="spaPetType" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px;">
                        <option value="">Tất cả thú cưng</option>
                        ${(filters.petTypes || []).map(item => `<option value="${item}" ${item === petType ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-section">
                    <h3>Thương hiệu</h3>
                    <select id="spaBrand" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px;">
                        <option value="">Tất cả thương hiệu</option>
                        ${(filters.brands || []).map(item => `<option value="${item}" ${item === brand ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-section">
                    <h3>Giá</h3>
                    <input id="spaMinPrice" type="number" min="0" value="${escapeHtml(minPrice)}" placeholder="Từ" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; margin-bottom:8px;">
                    <input id="spaMaxPrice" type="number" min="0" value="${escapeHtml(maxPrice)}" placeholder="Đến" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px;">
                </div>
                <div class="filter-section">
                    <h3>Đánh giá</h3>
                    <select id="spaMinRating" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px;">
                        <option value="">Tất cả mức đánh giá</option>
                        ${(filters.ratings || [5, 4, 3, 2, 1]).map(item => `<option value="${item}" ${String(item) === minRating ? 'selected' : ''}>Từ ${item} sao trở lên</option>`).join('')}
                    </select>
                </div>
                <div class="filter-section">
                    <h3>Sắp xếp</h3>
                    <select id="spaSort" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px;">
                        <option value="createdAt:desc" ${sortBy === 'createdAt' && sortOrder === 'desc' ? 'selected' : ''}>Mới nhất</option>
                        <option value="price:asc" ${sortBy === 'price' && sortOrder === 'asc' ? 'selected' : ''}>Giá thấp đến cao</option>
                        <option value="price:desc" ${sortBy === 'price' && sortOrder === 'desc' ? 'selected' : ''}>Giá cao đến thấp</option>
                        <option value="soldCount:desc" ${sortBy === 'soldCount' && sortOrder === 'desc' ? 'selected' : ''}>Bán chạy</option>
                        <option value="rating:desc" ${sortBy === 'rating' && sortOrder === 'desc' ? 'selected' : ''}>Đánh giá cao</option>
                        <option value="originalPrice:desc" ${sortBy === 'originalPrice' && sortOrder === 'desc' ? 'selected' : ''}>Ưu đãi tốt</option>
                    </select>
                </div>
                <div class="filter-section">
                    <label><input type="checkbox" id="spaInStock" ${inStock === 'true' ? 'checked' : ''}> Còn hàng</label><br>
                    <label><input type="checkbox" id="spaOnSale" ${onSale === 'true' ? 'checked' : ''}> Đang giảm giá</label>
                </div>
                <div class="filter-section">
                    <label><input type="checkbox" id="spaMallOnly" ${mallOnly === 'true' ? 'checked' : ''}> Chỉ xem sản phẩm từ shop PetMall</label>
                </div>
                <button class="btn btn-primary" id="spaApplyFilters" type="button">Áp dụng bộ lọc</button>
            </aside>
            <main>
                <div class="shop-results-header">
                    <div>
                        <strong>${totalProducts}</strong> sản phẩm phù hợp
                        ${category || petType || brand || search || minPrice || maxPrice || inStock || onSale || minRating || mallOnly === 'true' ? '<span class="filter-active-note">Đang áp dụng bộ lọc</span>' : ''}
                    </div>
                    <div class="shop-results-actions">
                        <a class="btn btn-secondary btn-small" href="#shop?mallOnly=true">Chỉ xem PetMall</a>
                        <button class="btn btn-secondary btn-small" id="spaResetFilters" type="button">Xóa lọc</button>
                    </div>
                </div>
                <div class="products-grid" id="spaView">
                    ${products.map(createProductCard).join('') || '<div class="account-content" style="grid-column:1/-1;"><h3>Không có sản phẩm phù hợp</h3><p>Thử bỏ bớt bộ lọc hoặc chọn danh mục khác.</p></div>'}
                </div>
            </main>
        </div>
    `);

    const applyShopFilters = () => {
        const next = new URLSearchParams();
        const nextSearch = document.getElementById('spaSearch').value.trim();
        const nextCategory = document.getElementById('spaCategory').value;
        const nextPetType = document.getElementById('spaPetType').value;
        const nextBrand = document.getElementById('spaBrand').value;
        const nextMinPrice = document.getElementById('spaMinPrice').value;
        const nextMaxPrice = document.getElementById('spaMaxPrice').value;
        const nextMinRating = document.getElementById('spaMinRating').value;
        const [nextSortBy, nextSortOrder] = document.getElementById('spaSort').value.split(':');
        if (nextSearch) next.set('search', nextSearch);
        if (nextCategory) next.set('category', nextCategory);
        if (nextPetType) next.set('petType', nextPetType);
        if (nextBrand) next.set('brand', nextBrand);
        if (nextMinPrice) next.set('minPrice', nextMinPrice);
        if (nextMaxPrice) next.set('maxPrice', nextMaxPrice);
        if (nextMinRating) next.set('minRating', nextMinRating);
        if (nextSortBy) next.set('sortBy', nextSortBy);
        if (nextSortOrder) next.set('sortOrder', nextSortOrder);
        if (document.getElementById('spaInStock').checked) next.set('inStock', 'true');
        if (document.getElementById('spaOnSale').checked) next.set('onSale', 'true');
        if (document.getElementById('spaMallOnly')?.checked) next.set('mallOnly', 'true');
        if (shop) next.set('shop', shop);
        window.location.hash = `shop${next.toString() ? '?' + next.toString() : ''}`;
    };

    let filterTimer = null;
    const scheduleShopFilters = () => {
        clearTimeout(filterTimer);
        filterTimer = setTimeout(applyShopFilters, 450);
    };

    document.getElementById('spaApplyFilters').addEventListener('click', applyShopFilters);
    document.getElementById('spaResetFilters').addEventListener('click', () => {
        window.location.hash = shop ? `shop?shop=${shop}` : 'shop';
    });

    ['spaCategory', 'spaPetType', 'spaBrand', 'spaMinRating', 'spaSort', 'spaInStock', 'spaOnSale', 'spaMallOnly'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', applyShopFilters);
    });

    ['spaSearch', 'spaMinPrice', 'spaMaxPrice'].forEach(id => {
        const input = document.getElementById(id);
        input?.addEventListener('input', scheduleShopFilters);
        input?.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                applyShopFilters();
            }
        });
    });

    bindProductCards(document.getElementById('spaView'));
}

function formatCareServiceType(value = '') {
    const map = {
        bathing_drying: 'Tắm, sấy',
        grooming_spa: 'Grooming, spa',
        nail_ear_hygiene: 'Vệ sinh tai, móng',
        pet_hotel: 'Khách sạn thú cưng',
        pet_boarding: 'Giữ thú cưng',
        basic_care: 'Chăm sóc cơ bản'
    };
    return map[String(value || '').toLowerCase()] || formatReadableStatus(value || '');
}

function formatCareServiceLabel(value = '') {
    const map = {
        premium_care_partner: 'Premium Care Partner',
        standard: 'Dịch vụ thường'
    };
    return map[String(value || '').toLowerCase()] || formatReadableStatus(value || '');
}

function formatCareServiceAddress(address = {}) {
    return [address.street, address.ward, address.district, address.city].filter(Boolean).join(', ');
}

function buildCareServiceMapUrl(careService = {}, fallbackShop = {}) {
    const address = formatCareServiceAddress(careService.address || {}) || formatShopMapAddress(fallbackShop.address || {});
    return address ? `https://www.google.com/maps?q=${encodeURIComponent(address)}` : buildShopMapUrl(fallbackShop);
}

function buildCareServiceMapEmbedUrl(careService = {}, fallbackShop = {}) {
    const address = formatCareServiceAddress(careService.address || {}) || formatShopMapAddress(fallbackShop.address || {});
    return address ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed` : buildShopMapEmbedUrl(fallbackShop);
}

async function renderShopDetailView(shopId) {
    if (!shopId) return renderShopView();

    try {
        const [shopRes, productsRes, careRes] = await Promise.all([
            api.getShop(shopId),
            api.getShopProducts(shopId, { limit: 24, sortBy: 'createdAt', sortOrder: 'desc' }),
            api.getShopCareServices(shopId).catch(() => ({ data: { careService: null, offerings: [], reviews: [], stats: {} } }))
        ]);
        const shop = shopRes.data || productsRes.data?.shop || {};
        const products = productsRes.data?.products || [];
        const carePayload = careRes.data || {};
        const careService = carePayload.careService || null;
        const careOfferings = carePayload.offerings || [];
        const careReviews = carePayload.reviews || [];
        const careStats = carePayload.stats || {};
        const hasCareServices = Boolean(careService);
        const address = formatShopMapAddress(shop.address);
        const mapUrl = buildShopMapUrl(shop);
        const embedUrl = buildShopMapEmbedUrl(shop);
        const careAddress = formatCareServiceAddress(careService?.address || {});
        const careMapUrl = buildCareServiceMapUrl(careService || {}, shop);
        const careMapEmbedUrl = buildCareServiceMapEmbedUrl(careService || {}, shop);
        const canBookCareService = authManager.isAuthenticated && authManager.user?.role === 'buyer';

        setSpaContent(shop.name || 'Cửa hàng', `
            <section class="shop-profile-card">
                <div class="shop-profile-banner">
                    <img src="${resolveImage(shop.banner || shop.logo, 'habitat')}" alt="${shop.name || 'Cửa hàng'}">
                </div>
                <div class="shop-profile-body">
                    <img class="shop-profile-logo" src="${resolveImage(shop.logo, 'generic')}" alt="${shop.name || 'Cửa hàng'}">
                    <div>
                        <h2>${shop.name || 'Cửa hàng'}</h2>
                        ${renderShopLabelBadges(shop)}
                        <p>${shop.description || 'Shop đang bán sản phẩm chăm sóc thú cưng.'}</p>
                        <p>${appGenerateStars(shop.rating || 0)} <strong>${shop.rating ?? 'Chưa có'}</strong> (${shop.reviewCount || 0} đánh giá)</p>
                        <p><strong>Liên hệ:</strong> ${shop.phone || ''} ${shop.email ? `- ${shop.email}` : ''}</p>
                        ${address ? `<p><strong>Địa chỉ:</strong> ${address}</p>` : ''}
                        ${mapUrl ? `<p><a class="btn btn-secondary btn-small" href="${mapUrl}" target="_blank" rel="noreferrer">Xem vị trí trên Google Maps</a></p>` : ''}
                    </div>
                </div>
            </section>
            ${embedUrl ? `
                <section class="account-content" style="margin-top:24px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:14px; flex-wrap:wrap;">
                        <div>
                            <h3 style="margin-bottom:4px;">Vị trí cửa hàng</h3>
                            <p style="margin:0; color:#6b7280;">Khách có thể xem và mở chỉ đường trực tiếp tới shop.</p>
                        </div>
                        ${mapUrl ? `<a class="btn btn-primary btn-small" href="${mapUrl}" target="_blank" rel="noreferrer">Mở Google Maps</a>` : ''}
                    </div>
                    <iframe src="${embedUrl}" title="Bản đồ cửa hàng" loading="lazy" referrerpolicy="no-referrer-when-downgrade" style="width:100%; min-height:320px; border:0; border-radius:14px; background:#f4f4f5;"></iframe>
                </section>
            ` : ''}
            ${hasCareServices ? `
                <section class="account-content" style="margin-top:24px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:18px; flex-wrap:wrap;">
                        <div>
                            <h3 style="margin-bottom:6px;">Khám phá shop</h3>
                            <p style="margin:0; color:#6b7280;">Chuyển nhanh giữa sản phẩm và dịch vụ chăm sóc đã được Admin phê duyệt.</p>
                        </div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap;">
                            <button class="btn btn-secondary shop-detail-tab active" type="button" data-shop-tab-target="products">Sản phẩm</button>
                            <button class="btn btn-secondary shop-detail-tab" type="button" data-shop-tab-target="care-services">Dịch vụ chăm sóc</button>
                        </div>
                    </div>
                </section>
            ` : ''}
            <section style="margin-top:32px;${hasCareServices ? '' : ''}" data-shop-tab-panel="products">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:16px;">
                    <h2>Sản phẩm của shop</h2>
                    <a class="btn btn-secondary" href="#shop?shop=${shop._id || shopId}">Lọc trong shop</a>
                </div>
                <div class="products-grid">${products.map(createProductCard).join('') || '<p>Shop chưa có sản phẩm đang bán.</p>'}</div>
            </section>
            ${hasCareServices ? `
                <section class="account-content" data-shop-tab-panel="care-services" hidden style="margin-top:32px;">
                    <div style="display:grid; gap:18px;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap;">
                            <div>
                                <h2 style="margin-bottom:6px;">Dịch vụ chăm sóc thú cưng</h2>
                                <p style="margin:0 0 8px; color:#6b7280;">${careService.description || 'Shop đã được Admin phê duyệt cung cấp dịch vụ chăm sóc cho thú cưng.'}</p>
                                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                                    <span class="status-badge status-badge-success">${formatCareServiceLabel(careService.label || 'standard')}</span>
                                    ${(careService.serviceTypes || []).map((type) => `<span class="status-badge status-badge-info">${formatCareServiceType(type)}</span>`).join('')}
                                </div>
                            </div>
                            <div style="min-width:220px;">
                                <p><strong>Hotline:</strong> ${careService.hotline || shop.phone || 'Đang cập nhật'}</p>
                                <p><strong>Email:</strong> ${careService.email || shop.email || 'Đang cập nhật'}</p>
                                <p><strong>Giờ hoạt động:</strong> ${careService.operatingHours?.open || '--'} - ${careService.operatingHours?.close || '--'}</p>
                                <p><strong>Hỗ trợ tại nhà:</strong> ${careService.supportsHomeService ? 'Có' : 'Không'}</p>
                                ${careAddress ? `<p><strong>Địa chỉ:</strong> ${careAddress}</p>` : ''}
                            </div>
                        </div>

                        ${careService.images?.length ? `
                            <div class="products-grid" style="grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
                                ${careService.images.map((imageUrl, index) => `
                                    <div class="product-card">
                                        <img class="product-img" src="${imageUrl}" alt="Không gian dịch vụ ${index + 1}">
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}

                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:16px;">
                            ${careOfferings.length ? careOfferings.map((offering) => `
                                <article class="product-card">
                                    <img class="product-img" src="${resolveImage(offering.image, 'grooming')}" alt="${offering.name}">
                                    <div class="product-info">
                                        <span class="product-brand">${formatCareServiceType(offering.serviceType)}</span>
                                        <h4 class="product-name">${offering.name}</h4>
                                        <p>${offering.description || 'Dịch vụ chăm sóc dành cho thú cưng.'}</p>
                                        <div class="product-price">
                                            <span class="price-current">${formatCurrency(offering.price || 0)}</span>
                                            <span class="price-old" style="text-decoration:none; color:#6b7280;">${offering.durationMinutes || 0} phút</span>
                                        </div>
                                        <div class="product-card-actions">
                                            ${canBookCareService
                                                ? `<button class="btn btn-primary btn-small" type="button" data-care-book-service="${offering._id}">Đặt lịch</button>`
                                                : '<button class="btn btn-secondary btn-small" type="button" data-action="login">Đăng nhập để đặt lịch</button>'}
                                        </div>
                                    </div>
                                </article>
                            `).join('') : '<p>Shop đang hoàn thiện bảng giá dịch vụ chăm sóc. Vui lòng quay lại sau.</p>'}
                        </div>

                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
                            <div class="order-detail-box">
                                <h3>Thống kê dịch vụ</h3>
                                <p>Tổng lịch hoàn thành: ${careStats.totalBookings || 0}</p>
                                <p>Đánh giá đã ghi nhận: ${careStats.reviewCount || 0}</p>
                                <p>Điểm trung bình: ${Number(careStats.averageRating || 0).toFixed(1)} / 5</p>
                            </div>
                            <div class="order-detail-box">
                                <h3>Bản đồ cơ sở dịch vụ</h3>
                                <p>${careAddress || address || 'Chưa có địa chỉ chi tiết.'}</p>
                                ${careMapUrl ? `<p><a href="${careMapUrl}" target="_blank" rel="noreferrer">Mở bản đồ dịch vụ</a></p>` : ''}
                            </div>
                        </div>

                        ${careMapEmbedUrl ? `
                            <iframe src="${careMapEmbedUrl}" title="Bản đồ dịch vụ chăm sóc" loading="lazy" referrerpolicy="no-referrer-when-downgrade" style="width:100%; min-height:300px; border:0; border-radius:14px; background:#f4f4f5;"></iframe>
                        ` : ''}

                        <section>
                            <h3>Đánh giá dịch vụ gần đây</h3>
                            ${careReviews.map((review) => `
                                <div class="review-item">
                                    <strong>${review.buyer?.name || 'Khách hàng'}</strong> ${appGenerateStars(review.rating || 0)}
                                    <p>${review.service?.name || 'Dịch vụ chăm sóc'}</p>
                                    <p>${review.comment || 'Khách chưa để lại nhận xét chi tiết.'}</p>
                                </div>
                            `).join('') || '<p>Chưa có đánh giá dịch vụ nào.</p>'}
                        </section>
                    </div>
                </section>
            ` : ''}
        `);
        bindProductCards(document.getElementById('spaView'));

        if (hasCareServices) {
            document.querySelectorAll('[data-shop-tab-target]').forEach((button) => {
                button.addEventListener('click', () => {
                    const nextTab = button.dataset.shopTabTarget;
                    document.querySelectorAll('[data-shop-tab-target]').forEach((item) => item.classList.toggle('active', item === button));
                    document.querySelectorAll('[data-shop-tab-panel]').forEach((panel) => {
                        panel.hidden = panel.dataset.shopTabPanel !== nextTab;
                    });
                });
            });
        }

        document.querySelectorAll('[data-care-book-service]').forEach((button) => {
            button.addEventListener('click', async () => {
                const service = careOfferings.find((item) => item._id === button.dataset.careBookService);
                if (!service) return;
                if (!authManager.isAuthenticated) {
                    authManager.showLoginModal();
                    return;
                }

                const contactName = prompt('Tên người liên hệ đặt lịch', authManager.user?.name || '');
                if (!contactName) return;
                const contactPhone = prompt('Số điện thoại liên hệ', authManager.user?.phone || '');
                if (!contactPhone) return;
                const petName = prompt('Tên thú cưng', '');
                if (petName === null) return;
                const petType = prompt('Loại thú cưng', '');
                if (petType === null) return;
                const appointmentDate = prompt('Ngày hẹn (YYYY-MM-DD)', new Date().toISOString().slice(0, 10));
                if (!appointmentDate) return;
                const timeSlot = prompt('Khung giờ', '09:00');
                if (!timeSlot) return;
                const notes = prompt('Ghi chú thêm cho shop', '') || '';

                try {
                    await api.createCareServiceBooking(shop._id || shopId, {
                        serviceId: service._id,
                        contactName,
                        contactPhone,
                        contactEmail: authManager.user?.email || '',
                        petName,
                        petType,
                        appointmentDate,
                        timeSlot,
                        notes
                    });
                    authManager.showNotification('Đã đặt lịch dịch vụ chăm sóc thành công.', 'success');
                    window.location.hash = 'service-bookings';
                } catch (error) {
                    authManager.showNotification(error.message || 'Không thể đặt lịch dịch vụ.', 'error');
                }
            });
        });
    } catch (error) {
        setSpaContent('Không tìm thấy cửa hàng', `<p>${error.message || 'Không thể tải cửa hàng này.'}</p><p><a href="#shop">Quay lại gian hàng</a></p>`);
    }
}

function formatShopMapAddress(address = {}) {
    return [address.street, address.ward, address.district, address.city].filter(Boolean).join(', ');
}

function buildShopMapUrl(shop = {}) {
    const customUrl = sanitizeShopMapUrl(shop.location?.googleMapsUrl);
    if (customUrl) return customUrl;

    if (shop.location?.latitude !== undefined && shop.location?.longitude !== undefined) {
        return `https://www.google.com/maps?q=${encodeURIComponent(`${shop.location.latitude},${shop.location.longitude}`)}`;
    }

    const address = formatShopMapAddress(shop.address);
    return address ? `https://www.google.com/maps?q=${encodeURIComponent(address)}` : '';
}

function buildShopMapEmbedUrl(shop = {}) {
    const customEmbedUrl = sanitizeShopMapUrl(shop.location?.embedUrl);
    if (customEmbedUrl) return customEmbedUrl;

    if (shop.location?.latitude !== undefined && shop.location?.longitude !== undefined) {
        return `https://maps.google.com/maps?q=${encodeURIComponent(`${shop.location.latitude},${shop.location.longitude}`)}&z=15&output=embed`;
    }

    const address = formatShopMapAddress(shop.address);
    return address ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed` : '';
}

function sanitizeShopMapUrl(value) {
    if (!value) return '';

    try {
        const parsed = new URL(String(value).trim());
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : '';
    } catch (error) {
        return '';
    }
}

async function renderProductView(productId) {
    if (!productId) return renderShopView();
    try {
        const [productRes, reviewsRes] = await Promise.all([
            api.getProduct(productId),
            api.getProductReviews(productId, { limit: 5 })
        ]);
        const product = productRes.data;
        const reviews = reviewsRes.data?.reviews || [];
        const price = product.price || 0;
        const originalPrice = product.originalPrice || 0;
        const image = productImage(product);
        const shop = product.shop || {};
        const shopId = shop._id || shop;
        const shopName = shop.name || 'Cửa hàng';
        const shopLogo = resolveImage(shop.logo, inferProductImageKey(product));
        const sellerViewOnly = isSellerBuyingBlocked();

        setSpaContent(product.name, `
            <div class="product-detail-grid">
                <div class="product-gallery"><img src="${image}" alt="${product.name}"></div>
                <div class="product-info">
                    <div>${appGenerateStars(product.rating || 0)} (${product.reviewCount || 0})</div>
                    <div class="product-price-detail">$${price.toFixed(2)} ${originalPrice > price ? `<span class="product-price-old">$${originalPrice.toFixed(2)}</span>` : ''}</div>
                    <p>${product.shortDescription || ''}</p>
                    <p>${product.description || 'Chưa có mô tả chi tiết cho sản phẩm này.'}</p>
                    <p><strong>Thương hiệu:</strong> ${product.brand || 'Đang cập nhật'}</p>
                    <p><strong>Danh mục:</strong> ${product.category?.name || 'Đang cập nhật'}</p>
                    <p><strong>Tồn kho:</strong> ${product.stock > 0 ? `Còn ${product.stock} sản phẩm` : 'Hết hàng'}</p>
                    <div class="product-shop-card">
                        <img src="${shopLogo}" alt="${shopName}">
                        <div>
                            <strong>${shopName}</strong>
                            ${renderShopLabelBadges(shop)}
                            <p>${appGenerateStars(shop.rating || 0)} ${shop.reviewCount || 0} đánh giá</p>
                        </div>
                        ${shopId ? `<a class="btn btn-secondary btn-small" href="#shop-detail?id=${shopId}">Xem shop</a>` : ''}
                    </div>
                    <div class="product-detail-actions">
                        ${sellerViewOnly
                            ? `
                                <a class="btn btn-secondary" href="/pages/seller/dashboard.html">Về dashboard người bán</a>
                                ${shopId ? `<a class="btn btn-secondary" href="#shop-detail?id=${shopId}">Xem shop</a>` : ''}
                            `
                            : `
                                <button class="btn btn-primary" id="spaAddToCart">Thêm vào giỏ</button>
                                <button class="btn btn-primary" id="spaBuyNow">Đặt hàng ngay</button>
                                <button class="btn btn-secondary" id="spaAddWishlist">Yêu thích</button>
                            `}
                    </div>
                </div>
            </div>
            <section style="margin-top:32px;">
                <h2>Đánh giá</h2>
                ${reviews.map(review => `<div class="review-item"><strong>${review.user?.name || 'Người mua'}</strong> ${appGenerateStars(review.rating || 0)}<p>${review.comment || review.content || ''}</p></div>`).join('') || '<p>Chưa có đánh giá nào được duyệt.</p>'}
            </section>
            <section style="margin-top:32px;">
                <h2>Sản phẩm liên quan</h2>
                <div class="products-grid">${(product.relatedProducts || []).map(createProductCard).join('') || '<p>Chưa có sản phẩm liên quan.</p>'}</div>
            </section>
        `);

        if (!sellerViewOnly) {
            document.getElementById('spaAddToCart').addEventListener('click', () => addToCart(product._id));
            document.getElementById('spaBuyNow').addEventListener('click', () => buyNow(product._id));
            document.getElementById('spaAddWishlist').addEventListener('click', async () => {
                if (!authManager.isAuthenticated) {
                    authManager.showLoginModal();
                    return;
                }
                await api.addToWishlist(product._id);
                authManager.showNotification('Đã thêm vào danh sách yêu thích.', 'success');
            });
        }
        bindProductCards(document.getElementById('spaView'));
    } catch (error) {
        const sample = getSampleProduct(productId);
        if (!sample) {
            setSpaContent('Không tìm thấy sản phẩm', '<p>Không thể tải sản phẩm này.</p>');
            return;
        }

        setSpaContent(sample.name, `
            <div class="product-detail-grid">
                <div class="product-gallery"><img src="${sample.images[0]}" alt="${sample.name}"></div>
                <div class="product-info">
                    <div>${appGenerateStars(sample.rating || 0)} (${sample.reviewCount || 0})</div>
                    <div class="product-price-detail">$${sample.price.toFixed(2)} ${sample.originalPrice ? `<span class="product-price-old">$${sample.originalPrice.toFixed(2)}</span>` : ''}</div>
                    <p>Đây là sản phẩm mẫu. Hãy đăng nhập để tiếp tục mua sắm với dữ liệu thật.</p>
                    <p><strong>Tồn kho:</strong> Có sẵn</p>
                    <button class="btn btn-primary" id="spaSampleAddToCart">Thêm vào giỏ</button>
                </div>
            </div>
        `);
        document.getElementById('spaSampleAddToCart').addEventListener('click', () => {
            if (!authManager.isAuthenticated) {
                authManager.showLoginModal();
                return;
            }
            authManager.showNotification('Sản phẩm mẫu này chưa có trong cơ sở dữ liệu.', 'info');
        });
    }
}

function getSampleProduct(productId) {
    return [
        { _id: '1', name: 'Hạt cao cấp cho chó', price: 42.99, originalPrice: 54.99, rating: 4.5, reviewCount: 2456, images: [displayImage('food')] },
        { _id: '2', name: 'Cát vệ sinh khử mùi cho mèo', price: 18.49, originalPrice: 23.99, rating: 4.8, reviewCount: 1892, images: [displayImage('litter')] },
        { _id: '3', name: 'Bánh thưởng dinh dưỡng cho chó', price: 15.99, originalPrice: 21.99, rating: 4, reviewCount: 3221, images: [displayImage('food')] },
        { _id: '4', name: 'Lồng nuôi chim gỗ cao cấp', price: 62.99, rating: 4.5, reviewCount: 567, images: [displayImage('habitat')] },
        { _id: '5', name: 'Bể cá mini kèm lọc', price: 88.49, rating: 5, reviewCount: 1402, images: [displayImage('aquarium')] },
        { _id: '6', name: 'Đệm ngủ êm cho thỏ và hamster', price: 24.99, rating: 4.5, reviewCount: 892, images: [displayImage('bed')] },
        { _id: '7', name: 'Đồ chơi gặm nhai cao su cho chó', price: 16.99, rating: 5, reviewCount: 5678, images: [displayImage('toy')] },
        { _id: '8', name: 'Yếm và vòng cổ thời trang cho mèo', price: 19.99, originalPrice: 24.99, rating: 4.2, reviewCount: 1234, images: [displayImage('fashion')] }
    ].find(product => product._id === productId);
}

async function renderArticlesView() {
    const response = await api.getArticles({ limit: 24 });
    const articles = response.data || [];
    setSpaContent('Bài viết chăm sóc thú cưng', `
        <div class="products-grid">
            ${articles.map(article => `
                <article class="product-card">
                    <a href="#article?slug=${article.slug}"><img class="product-img" src="${resolveImage(article.image, 'article')}" alt="${article.title}"></a>
                    <div class="product-info">
                        <span class="product-brand">${article.category || 'tin tức'}</span>
                        <h3 class="product-name"><a href="#article?slug=${article.slug}">${article.title}</a></h3>
                        <p>${article.excerpt || ''}</p>
                    </div>
                </article>
            `).join('') || '<p>Chưa có bài viết nào được xuất bản.</p>'}
        </div>
    `);
}

async function renderArticleView(slug) {
    if (!slug) return renderArticlesView();
    try {
        const response = await api.getArticle(slug);
        const article = response.data;
        setSpaContent(article.title, `
            <img src="${resolveImage(article.image, 'article')}" alt="${article.title}" style="width:100%; max-height:420px; object-fit:cover; border-radius:8px; margin-bottom:20px;">
            <article>${article.content}</article>
            <h2 style="margin-top:32px;">Bài viết liên quan</h2>
            ${(article.relatedArticles || []).map(item => `<p><a href="#article?slug=${item.slug}">${item.title}</a></p>`).join('') || '<p>Chưa có bài viết liên quan.</p>'}
        `);
    } catch (error) {
        setSpaContent('Không tìm thấy bài viết', '<p>Bài viết này hiện không khả dụng.</p>');
    }
}

async function renderContactView() {
    const response = await api.getContactInfo();
    const info = response.data || {};
    setSpaContent('Liên hệ', `
        <div class="account-grid">
            <section class="account-content">
                <p><strong>Điện thoại:</strong> ${info.phone || ''}</p>
                <p><strong>Email:</strong> ${info.email || ''}</p>
                <p><strong>Địa chỉ:</strong> ${info.address || ''}</p>
                <p><strong>Giờ làm việc:</strong> ${info.workingHours || ''}</p>
                <p><a href="${info.mapUrl || '#'}" target="_blank">Mở trên Google Maps</a></p>
            </section>
            <form id="spaContactForm" class="account-content" style="display:grid; gap:14px;">
                <input name="name" placeholder="Họ và tên" required>
                <input name="email" type="email" placeholder="Email" required>
                <input name="phone" placeholder="Số điện thoại">
                <input name="subject" placeholder="Chủ đề" required>
                <textarea name="message" rows="5" placeholder="Nội dung" required></textarea>
                <button class="btn btn-primary" type="submit">Gửi liên hệ</button>
                <p id="spaContactMessage"></p>
            </form>
        </div>
    `);

    document.getElementById('spaContactForm').addEventListener('submit', async event => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        const message = document.getElementById('spaContactMessage');
        try {
            await api.sendContact(data);
            message.textContent = 'Tin nhắn của bạn đã được gửi.';
            event.currentTarget.reset();
        } catch (error) {
            message.textContent = error.message || 'Không thể gửi tin nhắn.';
        }
    });
}

async function renderPageView(slug = 'privacy-policy') {
    try {
        const response = await api.getPublicPage(slug);
        const page = response.data;
        setSpaContent(page.title, `<article>${page.content}</article>`);
    } catch (error) {
        setSpaContent('Không tìm thấy nội dung', '<p>Nội dung này chưa được xuất bản.</p>');
    }
}

async function renderResetPasswordView(params) {
    const token = params.get('token') || '';
    const email = params.get('email') || '';
    setSpaContent('Đặt lại mật khẩu', `
        <form id="spaResetPasswordForm" class="account-content" style="display:grid; gap:14px; max-width:520px;">
            <p>${email ? `Đặt lại mật khẩu cho <strong>${email}</strong>.` : 'Nhập mật khẩu mới cho tài khoản của bạn.'}</p>
            <input type="password" name="newPassword" placeholder="Mật khẩu mới, ví dụ: Petshop2" required minlength="6">
            <button class="btn btn-primary" type="submit" ${token ? '' : 'disabled'}>Đặt lại mật khẩu</button>
            ${token ? '' : '<p>Thiếu mã đặt lại mật khẩu. Vui lòng yêu cầu liên kết mới từ mục Đăng nhập -> Quên mật khẩu.</p>'}
        </form>
    `);
    document.getElementById('spaResetPasswordForm').addEventListener('submit', async event => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        try {
            await api.resetPassword(token, formData.get('newPassword'));
            authManager.showNotification('Đã đặt lại mật khẩu. Vui lòng đăng nhập lại.', 'success');
            window.location.hash = '';
            authManager.showLoginModal();
        } catch (error) {
            authManager.showNotification(error.message || 'Đặt lại mật khẩu thất bại.', 'error');
        }
    });
}

function requireBuyerView() {
    if (!authManager.isAuthenticated) {
        authManager.showLoginModal();
        return false;
    }

    if (authManager.user?.role === 'seller') {
        authManager.showNotification('Tài khoản người bán không sử dụng được giỏ hàng, thanh toán và đơn mua.', 'error');
        window.location.hash = '';
        return false;
    }

    if (authManager.user?.role === 'admin') {
        authManager.showNotification('Tài khoản admin không sử dụng được các trang dành cho người mua.', 'error');
        window.location.hash = '';
        return false;
    }

    return true;
}

async function renderCartView() {
    if (!requireBuyerView()) return;
    try {
        const response = await api.getCart();
        const items = response.data?.items || [];
        const subtotal = items.reduce((sum, item) => sum + ((item.product?.price || 0) * (item.quantity || 1)), 0);
        setSpaContent('Giỏ hàng', `
            <div class="account-content">
                ${items.map(item => `
                    <div class="cart-item" style="display:grid; grid-template-columns:80px 1fr auto; gap:16px; align-items:center; border-bottom:1px solid #eee; padding:16px 0;">
                        <img src="${productImage(item.product)}" alt="${item.product?.name || 'Sản phẩm'}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;">
                        <div>
                            <h3><a href="#product?id=${item.product?._id}">${item.product?.name || 'Sản phẩm'}</a></h3>
                            <p>$${(item.product?.price || 0).toFixed(2)}</p>
                            <input class="cart-qty" data-product-id="${item.product?._id}" type="number" min="1" value="${item.quantity || 1}" style="width:80px;padding:8px;">
                        </div>
                        <button class="btn btn-secondary cart-remove" data-product-id="${item.product?._id}">Xóa</button>
                    </div>
                `).join('') || '<p>Giỏ hàng của bạn đang trống.</p>'}
                <h2 style="margin-top:20px;">Tạm tính: $${subtotal.toFixed(2)}</h2>
                <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:16px;">
                    <button class="btn btn-primary" id="goCheckout" ${items.length ? '' : 'disabled'}>Thanh toán</button>
                    <button class="btn btn-secondary" id="clearCart" ${items.length ? '' : 'disabled'}>Xóa giỏ hàng</button>
                    <a class="btn btn-secondary" href="#shop">Tiếp tục mua sắm</a>
                </div>
            </div>
        `);

        document.querySelectorAll('.cart-qty').forEach(input => {
            input.addEventListener('change', async () => {
                await api.updateCartItem(input.dataset.productId, parseInt(input.value) || 1);
                renderCartView();
            });
        });
        document.querySelectorAll('.cart-remove').forEach(button => {
            button.addEventListener('click', async () => {
                await api.removeFromCart(button.dataset.productId);
                renderCartView();
                updateCartCount();
            });
        });
        document.getElementById('clearCart')?.addEventListener('click', async () => {
            await api.clearCart();
            renderCartView();
            updateCartCount();
        });
        document.getElementById('goCheckout')?.addEventListener('click', () => window.location.hash = 'checkout');
    } catch (error) {
        setSpaContent('Giỏ hàng', `<p>${error.message || 'Không thể tải giỏ hàng.'}</p>`);
    }
}

async function renderCheckoutView() {
    if (!requireBuyerView()) return;

    const [cartRes, profileRes] = await Promise.all([api.getCart(), api.getProfile()]);
    const items = cartRes.data?.items || [];
    const user = profileRes.data?.user || {};
    const addresses = user.addresses || [];
    const defaultAddress = addresses.find(address => address.isDefault) || addresses[0] || {};
    const baseSubtotal = items.reduce((sum, item) => sum + ((item.product?.price || 0) * (item.quantity || 1)), 0);

    if (!items.length) {
        setSpaContent('Thanh toán an toàn', `
            <div class="account-content checkout-empty-state">
                <h2>Giỏ hàng của bạn đang trống.</h2>
                <p>Hãy thêm sản phẩm trước khi thanh toán.</p>
                <a class="btn btn-primary" href="#shop">Đi tới gian hàng</a>
            </div>
        `);
        return;
    }

    setSpaContent('Thanh toán an toàn', `
        <div class="editorial-checkout">
            <div class="editorial-checkout-header">
                <span class="editorial-kicker">Thanh toán an toàn</span>
                <h2>Hoàn tất đơn hàng</h2>
                <p>Kiểm tra lại sản phẩm đã chọn và xác nhận thông tin giao hàng cho thú cưng của bạn.</p>
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
                                <input name="fullName" value="${defaultAddress.fullName || user.name || ''}" placeholder="Ví dụ: Nguyễn Minh Anh" required>
                            </label>
                            <label class="checkout-field">
                                <span>Số điện thoại</span>
                                <input name="phone" value="${defaultAddress.phone || user.phone || ''}" placeholder="+84 9xx xxx xxx" required>
                            </label>
                            <label class="checkout-field">
                                <span>Email</span>
                                <input name="email" type="email" value="${user.email || ''}" placeholder="care@petshop.vn" required>
                            </label>
                        </div>
                    </section>

                    <section class="checkout-panel checkout-panel-tonal">
                        <div class="checkout-panel-heading">
                            <span class="checkout-step">2</span>
                            <div>
                                <h3>Địa chỉ giao hàng</h3>
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
                                            ${(address.fullName || user.name || 'Người nhận')} - ${address.street || address.addressLine || ''}, ${address.city || ''}
                                        </option>
                                    `).join('')}
                                </select>
                            </label>
                        ` : ''}
                        <div class="checkout-field-grid three-up">
                            <label class="checkout-field">
                                <span>Tỉnh / Thành phố</span>
                                <input name="city" value="${defaultAddress.city || ''}" placeholder="TP. Hồ Chí Minh" required>
                            </label>
                            <label class="checkout-field">
                                <span>Quận / Huyện</span>
                                <input name="district" value="${defaultAddress.district || ''}" placeholder="Quận 1">
                            </label>
                            <label class="checkout-field">
                                <span>Phường / Xã</span>
                                <input name="ward" value="${defaultAddress.ward || ''}" placeholder="Bến Nghé">
                            </label>
                            <label class="checkout-field checkout-field-full">
                                <span>Số nhà & tên đường</span>
                                <input name="addressLine" value="${defaultAddress.street || defaultAddress.addressLine || ''}" placeholder="123 Nguyễn Huệ, P. Bến Nghé" required>
                            </label>
                        </div>
                    </section>

                    <section class="checkout-panel">
                        <div class="checkout-panel-heading">
                            <span class="checkout-step">3</span>
                            <div>
                                <h3>Phương thức giao hàng</h3>
                                <p>Chọn tốc độ giao hàng phù hợp với bạn.</p>
                            </div>
                        </div>
                        <div class="checkout-choice-grid">
                            <label class="checkout-choice-card checkout-choice-card-active">
                                <input type="radio" name="shippingMethod" value="standard" checked>
                                <strong>Giao hàng tiêu chuẩn</strong>
                                <span>Giao trong 3-5 ngày làm việc</span>
                                <em>Miễn phí từ $35, nếu thấp hơn tính $5.00</em>
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
                                <p>Chọn cách bạn muốn thanh toán cho đơn hàng này.</p>
                            </div>
                        </div>
                        <div class="checkout-payment-list">
                            <label class="checkout-payment-option checkout-payment-option-active">
                                <input type="radio" name="paymentMethod" value="cod" checked>
                                <div>
                                    <strong>Thanh toán khi nhận hàng</strong>
                                    <span>Thanh toán khi đơn hàng được giao tới</span>
                                </div>
                            </label>
                            <label class="checkout-payment-option">
                                <input type="radio" name="paymentMethod" value="bank_transfer">
                                <div>
                                    <strong>Chuyển khoản ngân hàng</strong>
                                    <span>Chuyển khoản an toàn từ ngân hàng của bạn</span>
                                </div>
                            </label>
                            <label class="checkout-payment-option">
                                <input type="radio" name="paymentMethod" value="online">
                                <div>
                                    <strong>Thanh toán trực tuyến</strong>
                                    <span>Visa, Mastercard, ví điện tử</span>
                                </div>
                            </label>
                        </div>
                        <p id="paymentMethodHint" class="editorial-inline-note"></p>
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
                            <textarea name="note" placeholder="Để lại ghi chú về đóng gói, giao hàng hoặc thời gian liên hệ."></textarea>
                        </label>
                    </section>
                </form>

                <aside class="editorial-summary">
                    <div class="editorial-summary-card">
                        <h3>Tóm tắt đơn hàng</h3>
                        <div class="editorial-summary-items">
                            ${items.map(item => `
                                <div class="editorial-summary-item">
                                    <div class="editorial-summary-thumb">
                                        <img src="${productImage(item.product)}" alt="${item.product?.name || 'Sản phẩm'}">
                                    </div>
                                    <div class="editorial-summary-meta">
                                        <strong>${item.product?.name || 'Sản phẩm'}</strong>
                                        <span>Số lượng: ${item.quantity || 1}</span>
                                    </div>
                                    <div class="editorial-summary-price" data-line-total-for="${item.product?._id || ''}">${formatCurrency((item.product?.price || 0) * (item.quantity || 1))}</div>
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
                        <button class="editorial-place-order" id="placeOrderBtn" type="submit" form="spaCheckoutForm">
                            Đặt hàng
                        </button>
                        <p class="editorial-security-note">Giao dịch được mã hóa an toàn</p>
                    </div>

                    <div class="editorial-club-card">
                        <h4>Tham gia Câu lạc bộ chăm pet</h4>
                        <p>Tích điểm cho đơn hàng này và nhận gợi ý dinh dưỡng phù hợp cho thú cưng của bạn.</p>
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
    let appliedCoupon = '';
    let quoteTimer = null;

    function getSelectedValue(name) {
        return form.querySelector(`input[name="${name}"]:checked`)?.value || '';
    }

    function fallbackShippingFee() {
        return getSelectedValue('shippingMethod') === 'express'
            ? (baseSubtotal >= 75 ? 8.5 : 12.5)
            : (baseSubtotal >= 35 ? 0 : 5);
    }

    function toggleChoiceClasses() {
        document.querySelectorAll('.checkout-choice-card').forEach(card => {
            card.classList.toggle('checkout-choice-card-active', card.querySelector('input')?.checked);
        });
        document.querySelectorAll('.checkout-payment-option').forEach(card => {
            card.classList.toggle('checkout-payment-option-active', card.querySelector('input')?.checked);
        });

        const paymentMethod = getSelectedValue('paymentMethod');
        paymentMethodHint.textContent = paymentMethod === 'online'
            ? 'Bạn sẽ được chuyển sang bước thanh toán trực tuyến sau khi tạo đơn.'
            : paymentMethod === 'bank_transfer'
                ? 'Đơn hàng sẽ được tạo ngay và trạng thái thanh toán chờ xác nhận chuyển khoản.'
                : 'Đơn hàng sẽ được tạo ngay và thanh toán khi giao hàng.';
    }

    function fillAddress(address = {}) {
        form.fullName.value = address.fullName || user.name || '';
        form.phone.value = address.phone || user.phone || '';
        form.addressLine.value = address.street || address.addressLine || '';
        form.ward.value = address.ward || '';
        form.district.value = address.district || '';
        form.city.value = address.city || '';
    }

    function buildPayload(includeNote = true) {
        return {
            items: items.map(item => ({
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
            shipping_method: getSelectedValue('shippingMethod'),
            payment_method: getSelectedValue('paymentMethod'),
            voucher_code: appliedCoupon || undefined,
            note: includeNote ? form.note.value.trim() : ''
        };
    }

    function renderQuote(quote) {
        const subtotal = Number(quote.subtotal ?? baseSubtotal);
        const shippingFee = Number(quote.shipping_fee ?? fallbackShippingFee());
        const discountAmount = Number(quote.discount_amount ?? 0);
        const totalAmount = Number(quote.total_amount ?? (subtotal + shippingFee - discountAmount));

        document.getElementById('checkoutSubtotal').textContent = formatCurrency(subtotal);
        document.getElementById('checkoutShipping').textContent = formatCurrency(shippingFee);
        document.getElementById('checkoutDiscount').textContent = `-${formatCurrency(discountAmount)}`;
        document.getElementById('checkoutTotal').textContent = formatCurrency(totalAmount);

        (quote.items || []).forEach(item => {
            const linePrice = document.querySelector(`[data-line-total-for="${item.product_id}"]`);
            if (linePrice) {
                linePrice.textContent = formatCurrency(item.line_total || ((item.price || 0) * (item.quantity || 0)));
            }
        });
    }

    function setCouponMessage(message = '', type = '') {
        couponMessage.textContent = message;
        couponMessage.className = `editorial-inline-message ${type}`.trim();
    }

    function setCheckoutMessage(message = '', type = '') {
        checkoutMessage.textContent = message;
        checkoutMessage.className = `editorial-inline-message ${type}`.trim();
    }

    async function refreshQuote(showCouponError = false) {
        try {
            const response = await api.getOrderQuote(buildPayload(false));
            renderQuote(response.data || {});
            if (appliedCoupon) {
                const appliedCode = response.data?.voucher?.code || appliedCoupon.toUpperCase();
                setCouponMessage(`Đã áp dụng mã ${appliedCode} thành công.`, 'success');
            } else {
                setCouponMessage('');
            }
            setCheckoutMessage('');
            return response.data;
        } catch (error) {
            if (showCouponError) {
                setCouponMessage(error.message || 'Mã giảm giá không hợp lệ.', 'error');
            }
            if (appliedCoupon) {
                appliedCoupon = '';
                couponInput.value = '';
            }
            renderQuote({
                subtotal: baseSubtotal,
                shipping_fee: fallbackShippingFee(),
                discount_amount: 0,
                total_amount: baseSubtotal + fallbackShippingFee()
            });
            if (!showCouponError) setCouponMessage('');
            if (showCouponError) setCheckoutMessage(error.message || 'Không thể cập nhật lại tổng thanh toán.', 'error');
            return null;
        }
    }

    document.getElementById('savedAddress')?.addEventListener('change', event => {
        const address = addresses[parseInt(event.target.value, 10)];
        if (address) fillAddress(address);
    });

    form.querySelectorAll('input[name="fullName"], input[name="phone"], input[name="email"], input[name="addressLine"], input[name="ward"], input[name="district"], input[name="city"], textarea[name="note"]').forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(quoteTimer);
            quoteTimer = setTimeout(() => refreshQuote(false), 350);
        });
    });

    document.querySelectorAll('input[name="shippingMethod"], input[name="paymentMethod"]').forEach(input => {
        input.addEventListener('change', async () => {
            toggleChoiceClasses();
            await refreshQuote(false);
        });
    });

    document.getElementById('applyCoupon').addEventListener('click', async () => {
        const code = couponInput.value.trim().toUpperCase();
        if (!code) {
            setCouponMessage('Hãy nhập mã giảm giá trước.', 'error');
            return;
        }

        try {
            await api.validateCoupon(code, buildPayload(false));
            appliedCoupon = code;
            couponInput.value = code;
            const quote = await refreshQuote(true);
            if (!quote) appliedCoupon = '';
        } catch (error) {
            appliedCoupon = '';
            setCouponMessage(error.message || 'Mã giảm giá không hợp lệ.', 'error');
            await refreshQuote(false);
        }
    });

    document.getElementById('clearCoupon').addEventListener('click', async () => {
        appliedCoupon = '';
        couponInput.value = '';
        setCouponMessage('');
        setCheckoutMessage('');
        await refreshQuote(false);
    });

    couponInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            document.getElementById('applyCoupon').click();
        }
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        setCheckoutMessage('');
        if (!form.reportValidity()) return;
        placeOrderButton.disabled = true;
        placeOrderButton.textContent = 'Processing...';

        try {
            await refreshQuote(true);
            const response = await api.createOrder(buildPayload(true));
            updateCartCount();
            authManager.showNotification('Order placed successfully.', 'success');

            const orderId = response.data?.order_id || response.data?._id || response.data?.order?._id;
            const redirectUrl = response.data?.redirect_url;
            if (redirectUrl) {
                window.location.href = redirectUrl;
            } else if (orderId) {
                window.location.hash = `order?id=${orderId}`;
            } else {
                window.location.hash = 'orders';
            }
        } catch (error) {
            setCheckoutMessage(error.message || 'Không thể đặt hàng.', 'error');
            authManager.showNotification(error.message || 'Không thể đặt hàng.', 'error');
        } finally {
            placeOrderButton.disabled = false;
            placeOrderButton.textContent = 'Đặt hàng';
        }
    });

    toggleChoiceClasses();
    await refreshQuote(false);
}

async function renderAccountView() {
    if (!requireBuyerView()) return;
    const response = await api.getProfile();
    const user = response.data?.user || {};
    const addresses = user.addresses || [];
    setSpaContent('Tài khoản của tôi', `
        <form id="spaProfileForm" class="account-content" style="display:grid; gap:14px;">
            <h2>Hồ sơ cá nhân</h2>
            <input name="name" value="${user.name || ''}" placeholder="Họ và tên" required>
            <input name="phone" value="${user.phone || ''}" placeholder="Số điện thoại">
            <input name="avatar" value="${user.avatar || ''}" placeholder="URL ảnh đại diện">
            <button class="btn btn-primary" type="submit">Lưu hồ sơ</button>
        </form>
        <section class="account-content" style="margin-top:24px;">
            <h2>Địa chỉ giao hàng</h2>
            <div id="addressList">${renderAddressRows(addresses)}</div>
            <form id="spaAddressForm" style="display:grid; gap:10px; margin-top:16px;">
                <input name="fullName" placeholder="Tên người nhận" required>
                <input name="phone" placeholder="Số điện thoại" required>
                <input name="street" placeholder="Số nhà, tên đường" required>
                <input name="ward" placeholder="Phường / Xã">
                <input name="district" placeholder="Quận / Huyện">
                <input name="city" placeholder="Tỉnh / Thành phố" required>
                <label><input type="checkbox" name="isDefault"> Đặt làm địa chỉ mặc định</label>
                <button class="btn btn-secondary" type="submit">Thêm địa chỉ</button>
            </form>
        </section>
        <section class="account-content" style="margin-top:24px;">
            <h2>Đổi mật khẩu</h2>
            <form id="spaPasswordForm" style="display:grid; gap:10px;">
                <input type="password" name="currentPassword" placeholder="Mật khẩu hiện tại" required>
                <input type="password" name="newPassword" placeholder="Mật khẩu mới" required>
                <button class="btn btn-secondary" type="submit">Đổi mật khẩu</button>
            </form>
        </section>
        <section class="account-content" style="margin-top:24px;">
            <h2>Lịch hẹn chăm sóc</h2>
            <p>Theo dõi các lịch tắm, grooming, khách sạn thú cưng và những dịch vụ chăm sóc khác bạn đã đặt.</p>
            <a class="btn btn-secondary" href="#service-bookings">Xem lịch hẹn chăm sóc</a>
        </section>
    `);

    document.getElementById('spaProfileForm').addEventListener('submit', async event => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        const updated = await api.updateProfile(data);
        localStorage.setItem('user', JSON.stringify(updated.data));
        authManager.checkAuthStatus();
        authManager.showNotification('Đã cập nhật hồ sơ.', 'success');
    });

    document.getElementById('spaAddressForm').addEventListener('submit', async event => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        const nextAddresses = [...addresses, { ...data, isDefault: event.currentTarget.isDefault.checked }];
        if (event.currentTarget.isDefault.checked) {
            nextAddresses.forEach((address, index) => address.isDefault = index === nextAddresses.length - 1);
        }
        await api.updateProfile({ addresses: nextAddresses });
        authManager.showNotification('Đã thêm địa chỉ mới.', 'success');
        renderAccountView();
    });

    document.querySelectorAll('[data-delete-address]').forEach(button => {
        button.addEventListener('click', async () => {
            const nextAddresses = addresses.filter((_, index) => index !== parseInt(button.dataset.deleteAddress));
            await api.updateProfile({ addresses: nextAddresses });
            renderAccountView();
        });
    });

    document.querySelectorAll('[data-default-address]').forEach(button => {
        button.addEventListener('click', async () => {
            const selected = parseInt(button.dataset.defaultAddress);
            addresses.forEach((address, index) => address.isDefault = index === selected);
            await api.updateProfile({ addresses });
            renderAccountView();
        });
    });

    document.querySelectorAll('[data-edit-address]').forEach(button => {
        button.addEventListener('click', async () => {
            const index = parseInt(button.dataset.editAddress);
            const current = addresses[index];
            if (!current) return;

            const fullName = prompt('Tên người nhận', current.fullName || user.name || '');
            if (fullName === null) return;
            const phone = prompt('Số điện thoại', current.phone || user.phone || '');
            if (phone === null) return;
            const street = prompt('Số nhà, tên đường', current.street || '');
            if (street === null) return;
            const ward = prompt('Phường / Xã', current.ward || '');
            if (ward === null) return;
            const district = prompt('Quận / Huyện', current.district || '');
            if (district === null) return;
            const city = prompt('Tỉnh / Thành phố', current.city || '');
            if (city === null) return;

            addresses[index] = {
                ...current,
                fullName,
                phone,
                street,
                ward,
                district,
                city
            };

            await api.updateProfile({ addresses });
            authManager.showNotification('Đã cập nhật địa chỉ.', 'success');
            renderAccountView();
        });
    });

    document.getElementById('spaPasswordForm').addEventListener('submit', async event => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        try {
            await api.changePassword(formData.get('currentPassword'), formData.get('newPassword'));
            event.currentTarget.reset();
            authManager.showNotification('Đã đổi mật khẩu.', 'success');
        } catch (error) {
            authManager.showNotification(error.message || 'Không thể đổi mật khẩu.', 'error');
        }
    });
}

function renderAddressRows(addresses) {
    return addresses.map((address, index) => `
        <div style="display:flex; justify-content:space-between; gap:12px; border-bottom:1px solid #eee; padding:12px 0;">
            <div>
                <strong>${address.fullName || 'Người nhận'}</strong> ${address.isDefault ? '<span class="product-badge">Mặc định</span>' : ''}
                <p>${address.phone || ''} - ${address.street || ''}, ${address.ward || ''}, ${address.district || ''}, ${address.city || ''}</p>
            </div>
            <div>
                <button class="btn btn-secondary" data-edit-address="${index}">Sửa</button>
                <button class="btn btn-secondary" data-default-address="${index}">Mặc định</button>
                <button class="btn btn-secondary" data-delete-address="${index}">Xóa</button>
            </div>
        </div>
    `).join('') || '<p>Chưa có địa chỉ đã lưu.</p>';
}

async function renderOrdersView() {
    if (!requireBuyerView()) return;
    const response = await api.getOrders({ limit: 50 });
    const orders = response.data || [];
    setSpaContent('Đơn hàng của tôi', `
        <div class="account-content orders-shell">
            ${orders.map(order => `
                <article class="order-card">
                    <div class="order-card-top">
                        <div>
                            <h3><a href="#order?id=${order._id}">#${order.orderNumber || order._id}</a></h3>
                            <p class="order-card-date">${new Date(order.createdAt).toLocaleString()}</p>
                        </div>
                        <div class="order-card-total">${formatCurrency(order.finalAmount || order.total || 0)}</div>
                    </div>
                    <div class="order-card-badges">
                        ${getOrderStatusBadge(order)}
                        ${getPaymentStatusBadge(order)}
                        ${getShippingStatusBadge(order)}
                    </div>
                    <div class="order-card-meta">
                        <span>${formatPaymentMethod(getPaymentMethod(order))}</span>
                        <span>${(order.items || []).length} sản phẩm</span>
                        <span>${formatAddressLine(order.shippingAddress || {}) || 'Địa chỉ sẽ hiển thị ở trang chi tiết'}</span>
                    </div>
                    <div class="order-card-actions">
                        <a class="btn btn-secondary" href="#order?id=${order._id}">Xem chi tiết</a>
                        ${['pending', 'confirmed'].includes(getOrderStatus(order)) ? `<button class="btn btn-secondary cancel-order" data-order-id="${order._id}">Hủy đơn</button>` : ''}
                    </div>
                </article>
            `).join('') || '<p>Bạn chưa có đơn hàng nào.</p>'}
        </div>
    `);
    document.querySelectorAll('.cancel-order').forEach(button => {
        button.addEventListener('click', async () => {
            if (!confirm('Bạn có chắc muốn hủy đơn này không?')) return;
            await api.cancelOrder(button.dataset.orderId, 'Customer requested');
            renderOrdersView();
        });
    });
}

async function renderCareServiceBookingsView() {
    if (!requireBuyerView()) return;

    const response = await api.getMyCareServiceBookings({ limit: 50 });
    const bookings = response.data || [];

    setSpaContent('Lịch hẹn chăm sóc của tôi', `
        <div class="account-content orders-shell">
            ${bookings.map((booking) => `
                <article class="order-card">
                    <div class="order-card-top">
                        <div>
                            <h3>${booking.service?.name || 'Dịch vụ chăm sóc'}</h3>
                            <p class="order-card-date">${new Date(booking.appointmentDate).toLocaleString('vi-VN')}</p>
                        </div>
                        <div class="order-card-total">${formatCurrency(booking.totalAmount || 0)}</div>
                    </div>
                    <div class="order-card-badges">
                        ${buildStatusBadge(formatReadableStatus(booking.status || 'pending'), booking.status === 'completed' ? 'success' : (booking.status === 'cancelled' || booking.status === 'rejected' ? 'danger' : 'info'))}
                        <span class="status-badge status-badge-neutral">${booking.shop?.name || 'Shop dịch vụ'}</span>
                    </div>
                    <div class="order-card-meta">
                        <span>${formatCareServiceType(booking.service?.serviceType || '')}</span>
                        <span>${booking.timeSlot || 'Chưa chọn khung giờ'}</span>
                        <span>${booking.petName ? `${booking.petName} • ` : ''}${booking.petType || 'Chưa có thông tin thú cưng'}</span>
                    </div>
                    <div class="order-card-actions">
                        ${['pending', 'confirmed'].includes(booking.status) ? `<button class="btn btn-secondary cancel-care-booking" data-care-booking-id="${booking._id}">Hủy lịch</button>` : ''}
                        ${booking.status === 'completed' && !booking.reviewedAt ? `<button class="btn btn-primary review-care-booking" data-care-booking-id="${booking._id}">Đánh giá dịch vụ</button>` : ''}
                        ${booking.shop?._id ? `<a class="btn btn-secondary" href="#shop-detail?id=${booking.shop._id}">Xem shop</a>` : ''}
                    </div>
                </article>
            `).join('') || '<p>Bạn chưa có lịch hẹn chăm sóc nào.</p>'}
        </div>
    `);

    document.querySelectorAll('.cancel-care-booking').forEach((button) => {
        button.addEventListener('click', async () => {
            if (!confirm('Bạn có chắc muốn hủy lịch hẹn này không?')) return;
            await api.cancelMyCareServiceBooking(button.dataset.careBookingId, 'Khách hàng hủy lịch');
            authManager.showNotification('Đã hủy lịch hẹn dịch vụ.', 'success');
            renderCareServiceBookingsView();
        });
    });

    document.querySelectorAll('.review-care-booking').forEach((button) => {
        button.addEventListener('click', async () => {
            const rating = prompt('Chấm điểm dịch vụ từ 1 đến 5 sao', '5');
            if (!rating) return;
            const comment = prompt('Nhận xét về dịch vụ', '') || '';
            await api.createCareServiceReview(button.dataset.careBookingId, {
                rating: Number(rating),
                comment
            });
            authManager.showNotification('Đã gửi đánh giá dịch vụ.', 'success');
            renderCareServiceBookingsView();
        });
    });
}

async function renderOrderDetailView(orderId) {
    if (!requireBuyerView()) return;
    if (!orderId) return renderOrdersView();
    const response = await api.getOrder(orderId);
    const order = response.data;
    setSpaContent(`Order #${order.orderNumber || order._id}`, `
        <div class="order-detail-layout">
            <section class="account-content">
                <div class="order-detail-head">
                    <div>
                        <span class="editorial-kicker">Chi tiết đơn hàng</span>
                        <h2>#${order.orderNumber || order._id}</h2>
                        <p>${new Date(order.createdAt).toLocaleString()}</p>
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
                        <p><strong>${order.shippingAddress?.fullName || ''}</strong></p>
                        <p>${order.shippingAddress?.phone || ''}</p>
                        <p>${order.shippingAddress?.email || ''}</p>
                        <p>${formatAddressLine(order.shippingAddress || {})}</p>
                    </div>
                    <div class="order-detail-box">
                        <h3>Thanh toán</h3>
                        <p>${formatPaymentMethod(getPaymentMethod(order))}</p>
                        <p>Trạng thái: ${formatReadableStatus(getPaymentStatus(order))}</p>
                        ${order.payment?.redirectUrl ? `<p><a href="${order.payment.redirectUrl}">Tiếp tục thanh toán</a></p>` : ''}
                    </div>
                    <div class="order-detail-box">
                        <h3>Tóm tắt</h3>
                        <p>Tạm tính: ${formatCurrency(order.subtotal || 0)}</p>
                        <p>Phí vận chuyển: ${formatCurrency(order.shippingFee || 0)}</p>
                        <p>Giảm giá: ${formatCurrency(order.discountAmount || order.discount || 0)}</p>
                        <p><strong>Tổng thanh toán: ${formatCurrency(order.finalAmount || order.total || 0)}</strong></p>
                    </div>
                </div>

                <div class="order-detail-items">
                    <h3>Sản phẩm</h3>
                    ${(order.items || []).map(item => `
                        <article class="order-item-card">
                            <div class="order-item-card-main">
                                <img src="${productImage(item.product || item)}" alt="${item.name}" class="order-item-thumb">
                                <div>
                                    <strong>${item.name}</strong>
                                    <p>Số lượng: ${item.quantity} x ${formatCurrency(item.price || 0)}</p>
                                    ${item.sku ? `<p>SKU: ${item.sku}</p>` : ''}
                                </div>
                                <div class="order-item-line-total">${formatCurrency((item.price || 0) * (item.quantity || 0))}</div>
                            </div>
                            ${['delivered', 'completed'].includes(getOrderStatus(order)) && !item.isReviewed ? `
                                <form class="review-form order-review-form" data-product-id="${item.product?._id || item.product}" style="display:grid; gap:8px;">
                                    <select name="rating"><option value="5">5 sao</option><option value="4">4 sao</option><option value="3">3 sao</option><option value="2">2 sao</option><option value="1">1 sao</option></select>
                                    <input name="title" placeholder="Tiêu đề đánh giá">
                                    <textarea name="comment" placeholder="Nội dung đánh giá"></textarea>
                                    <button class="btn btn-secondary" type="submit">Gửi đánh giá</button>
                                </form>
                            ` : ''}
                        </article>
                    `).join('')}
                </div>
            </section>

            <aside class="account-content order-detail-sidebar">
                <h3>Lịch sử trạng thái</h3>
                <div class="order-log-list">
                    ${(order.logs || []).map(log => `
                        <div class="order-log-item">
                            <strong>${formatReadableStatus(log.event)}</strong>
                            <p>${log.message || ''}</p>
                            <span>${new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                    `).join('') || '<p>Chưa có nhật ký hoạt động.</p>'}
                </div>
                ${['pending', 'confirmed'].includes(getOrderStatus(order)) ? `<button class="btn btn-secondary cancel-order" data-order-id="${order._id}">Hủy đơn</button>` : ''}
            </aside>
        </div>
    `);

    document.querySelectorAll('.cancel-order').forEach(button => {
        button.addEventListener('click', async () => {
            if (!confirm('Bạn có chắc muốn hủy đơn này không?')) return;
            await api.cancelOrder(button.dataset.orderId, 'Customer requested');
            authManager.showNotification('Đơn hàng đã được hủy.', 'success');
            renderOrderDetailView(button.dataset.orderId);
        });
    });

    document.querySelectorAll('.review-form').forEach(form => {
        form.addEventListener('submit', async event => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(event.currentTarget).entries());
            data.rating = parseInt(data.rating);
            await api.createReview(order._id, event.currentTarget.dataset.productId, data);
            authManager.showNotification('Đã gửi đánh giá thành công.', 'success');
            renderOrderDetailView(order._id);
        });
    });
}

async function renderWishlistView() {
    if (!requireBuyerView()) return;
    const response = await api.getWishlist();
    const wishlist = response.data || [];
    setSpaContent('Danh sách yêu thích', `
        <div class="products-grid">
            ${wishlist.map(item => {
                const product = item.product;
                return product ? `
                    <div class="product-card" data-product-id="${product._id}">
                        <a href="#product?id=${product._id}"><img class="product-img" src="${productImage(product)}" alt="${product.name}"></a>
                        <div class="product-info">
                            <h3 class="product-name"><a href="#product?id=${product._id}">${product.name}</a></h3>
                            <p>$${(product.price || 0).toFixed(2)}</p>
                            <button class="btn btn-primary btn-small" type="button" data-product-action="quick-add" data-product-id="${product._id}">Thêm giỏ</button>
                            <button class="btn btn-secondary wishlist-remove" data-product-id="${product._id}">Xóa</button>
                        </div>
                    </div>
                ` : '';
            }).join('') || '<p>Chưa có sản phẩm yêu thích nào.</p>'}
        </div>
    `);
    document.querySelectorAll('.wishlist-remove').forEach(button => {
        button.addEventListener('click', async () => {
            await api.removeFromWishlist(button.dataset.productId);
            renderWishlistView();
        });
    });
    bindProductCards(document.getElementById('spaView'));
}

async function renderNotificationsView() {
    if (!requireBuyerView()) return;
    const response = await api.getNotifications({ limit: 50 });
    const data = response.data || {};
    const notifications = data.notifications || [];
    setSpaContent('Thông báo', `
        <div class="account-content">
            <button class="btn btn-secondary" id="markAllRead">Mark all read</button>
            ${notifications.map(item => `
                <div style="border-bottom:1px solid #eee; padding:12px 0;">
                    <strong>${item.title || 'Notification'}</strong>
                    <p>${item.message || ''}</p>
                    <p>${item.isRead ? 'Read' : 'Unread'}</p>
                </div>
            `).join('') || '<p>No notifications.</p>'}
        </div>
    `);
    document.getElementById('markAllRead')?.addEventListener('click', async () => {
        await api.markAllNotificationsRead();
        renderNotificationsView();
    });
}

function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    const heroDots = document.getElementById('heroDots');
    const heroPrev = document.getElementById('heroPrev');
    const heroNext = document.getElementById('heroNext');
    
    if (!slides.length) return;

    let currentSlide = 0;
    const totalSlides = slides.length;

    if (heroDots) {
        heroDots.innerHTML = slides.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}"></span>`).join('');
        heroDots.querySelectorAll('.dot').forEach((dot, i) => {
            dot.addEventListener('click', () => goToSlide(i));
        });
    }

    if (heroPrev) heroPrev.addEventListener('click', () => { currentSlide = (currentSlide - 1 + totalSlides) % totalSlides; goToSlide(currentSlide); });
    if (heroNext) heroNext.addEventListener('click', () => { currentSlide = (currentSlide + 1) % totalSlides; goToSlide(currentSlide); });

    let autoSlide = setInterval(() => { currentSlide = (currentSlide + 1) % totalSlides; goToSlide(currentSlide); }, 5000);

    function goToSlide(index) {
        slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
        if (heroDots) heroDots.querySelectorAll('.dot').forEach((dot, i) => dot.classList.toggle('active', i === index));
        currentSlide = index;
    }
}

function appShowLoading(element) {
    if (!element) return;
    element.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';
}



