(function () {
    const TAB_LOADERS = {
        bestsellers: () => window.api?.getBestsellers?.(8),
        new: () => window.api?.getNewProducts?.(8),
        deals: () => window.api?.getSaleProducts?.(8)
    };

    function fallbackImage(product = {}) {
        if (typeof productImage === 'function') {
            return productImage(product);
        }

        return product.images?.[0] || product.thumbnail || product.image || '/assets/images/pet-generic.svg';
    }

    function formatPriceSafe(value) {
        if (window.utils?.formatPrice) return window.utils.formatPrice(value || 0);
        return `${Number(value || 0).toLocaleString('vi-VN')} ₫`;
    }

    function createFallbackCard(product = {}) {
        const productId = product._id || product.id || '';
        const price = product.price || 0;
        const originalPrice = product.originalPrice || product.salePrice || 0;
        const discount = originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0;
        const image = fallbackImage(product);
        const name = product.name || 'Product';
        const brand = product.brand || 'Pet Store';
        const shop = product.shop || {};
        const shopId = shop._id || '';
        const shopName = shop.name || 'Store';
        const rating = Number(product.rating || 4);
        const reviewCount = Number(product.reviewCount || 0);

        return `
            <div class="product-card" data-product-id="${productId}">
                <div class="product-image">
                    ${discount > 0 ? `<span class="product-badge badge-sale">-${discount}%</span>` : ''}
                    <a href="#product?id=${encodeURIComponent(productId)}">
                        <img src="${image}" alt="${name}" class="product-img" loading="lazy" onerror="this.onerror=null;this.src='/assets/images/pet-generic.svg';">
                    </a>
                </div>
                <div class="product-info">
                    <span class="product-brand">${brand}</span>
                    <h4 class="product-name"><a href="#product?id=${encodeURIComponent(productId)}">${name}</a></h4>
                    ${shopId ? `<div class="product-shop-meta"><a class="product-shop-link" href="#shop-detail?id=${encodeURIComponent(shopId)}">${shopName}</a></div>` : ''}
                    <div class="product-rating">
                        <div class="stars">${'★'.repeat(Math.max(1, Math.round(rating))).padEnd(5, '☆')}</div>
                        <span>(${reviewCount})</span>
                    </div>
                    <div class="product-price">
                        <span class="price-current">${formatPriceSafe(price)}</span>
                        ${originalPrice > price ? `<span class="price-old">${formatPriceSafe(originalPrice)}</span>` : ''}
                    </div>
                    <div class="product-delivery"><i class="fas fa-truck"></i> Fast delivery today</div>
                    <div class="product-card-actions">
                        <a class="btn btn-secondary btn-small" href="#product?id=${encodeURIComponent(productId)}">View details</a>
                        <button class="btn btn-primary btn-small" type="button" data-product-action="quick-add" data-product-id="${productId}">Add to cart</button>
                        <button class="btn btn-secondary btn-small" type="button" data-product-action="buy-now" data-product-id="${productId}">Buy now</button>
                    </div>
                </div>
            </div>
        `;
    }

    function renderProductCard(product = {}) {
        if (typeof createProductCard === 'function') {
            return createProductCard(product);
        }

        return createFallbackCard(product);
    }

    function renderShopCard(shop = {}) {
        const shopId = shop._id || '';
        const banner = shop.banner || shop.logo || '/assets/images/pet-generic.svg';
        const name = shop.name || 'PetMall Store';
        const description = shop.description || 'Trusted PetMall store.';

        return `
            <article class="shop-spotlight-card">
                <a class="shop-spotlight-media" href="#shop-detail?id=${encodeURIComponent(shopId)}">
                    <img src="${banner}" alt="${name}" onerror="this.onerror=null;this.src='/assets/images/pet-generic.svg';">
                </a>
                <div class="shop-spotlight-body">
                    <div class="shop-spotlight-header">
                        <h3><a href="#shop-detail?id=${encodeURIComponent(shopId)}">${name}</a></h3>
                        <span class="status-badge status-badge-success">PetMall</span>
                    </div>
                    <p>${description}</p>
                    <a class="btn btn-secondary btn-small" href="#shop-detail?id=${encodeURIComponent(shopId)}">Visit store</a>
                </div>
            </article>
        `;
    }

    function bindRescueProductActions(scope = document) {
        if (typeof bindProductCards === 'function') {
            bindProductCards(scope);
        }

        scope.querySelectorAll('.product-card[data-product-id]').forEach((card) => {
            if (card.dataset.rescueCardBound === 'true') return;
            card.dataset.rescueCardBound = 'true';
            card.addEventListener('click', (event) => {
                if (event.target.closest('a, button, input, select, textarea, label')) return;
                const productId = card.dataset.productId;
                if (productId) {
                    window.location.hash = `product?id=${encodeURIComponent(productId)}`;
                }
            });
        });

        scope.querySelectorAll('a[href^="#product?id="], a[href^="#shop-detail?id="]').forEach((link) => {
            if (link.dataset.rescueLinkBound === 'true') return;
            link.dataset.rescueLinkBound = 'true';
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const href = link.getAttribute('href');
                if (!href) return;
                window.location.hash = href.slice(1);
            });
        });
    }

    async function loadProductsForTab(tab = 'bestsellers') {
        const grid = document.getElementById('productsGrid');
        if (!grid) return;

        const loader = TAB_LOADERS[tab] || TAB_LOADERS.bestsellers;

        try {
            const response = await loader();
            const products = response?.data || [];

            if (!Array.isArray(products) || !products.length) {
                grid.innerHTML = '<div class="account-content" style="grid-column: 1 / -1; text-align:center;">No products available right now.</div>';
                return;
            }

            grid.innerHTML = products.map(renderProductCard).join('');
            bindRescueProductActions(grid);
        } catch (error) {
            console.error('Homepage rescue failed to load products:', error);
            grid.innerHTML = '<div class="account-content" style="grid-column: 1 / -1; text-align:center;">Unable to load products right now.</div>';
        }
    }

    async function loadPetMallRescue() {
        const section = document.getElementById('petMallShopsSection');
        const grid = document.getElementById('petMallShopsGrid');
        if (!section || !grid) return;

        try {
            const response = await window.api?.getShops?.({ label: 'petmall', limit: 4 });
            const shops = response?.data || [];

            if (!Array.isArray(shops) || !shops.length) {
                section.style.display = 'none';
                return;
            }

            section.style.display = '';
            grid.innerHTML = shops.map(renderShopCard).join('');
        } catch (error) {
            console.error('Homepage rescue failed to load PetMall stores:', error);
        }
    }

    function bindTabs() {
        document.querySelectorAll('.product-tab[data-tab]').forEach((button) => {
            if (button.dataset.bound === 'true') return;
            button.dataset.bound = 'true';
            button.addEventListener('click', async () => {
                document.querySelectorAll('.product-tab').forEach((tab) => tab.classList.remove('active'));
                button.classList.add('active');
                await loadProductsForTab(button.dataset.tab);
            });
        });
    }

    async function rescueHomepage() {
        bindTabs();

        const grid = document.getElementById('productsGrid');
        if (grid && !grid.querySelector('.product-card')) {
            await loadProductsForTab('bestsellers');
        } else if (grid) {
            bindRescueProductActions(grid);
        }

        await loadPetMallRescue();
    }

    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(rescueHomepage, 150);
    });

    window.addEventListener('load', () => {
        setTimeout(rescueHomepage, 300);
    });
})();
