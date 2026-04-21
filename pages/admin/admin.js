(function() {
    const API_BASE = typeof window.getPetShopApiBaseUrl === 'function'
        ? window.getPetShopApiBaseUrl()
        : `${window.location.origin}/api`;
    const root = document.getElementById('adminRoot');
    const state = {
        token: localStorage.getItem('adminToken') || '',
        admin: JSON.parse(localStorage.getItem('adminUser') || 'null'),
        section: 'overview',
        rows: [],
        actions: {},
        searchTimer: null
    };

    const day = 24 * 60 * 60 * 1000;
    const dateIn = days => new Date(Date.now() + days * day).toISOString();

    const sections = [
        { id: 'overview', group: 'Tổng quan', title: 'Bảng điều khiển' },
        section('admins', 'Tài khoản', 'Tài khoản admin', '/admin/admins', 'admins',
            cols('name:Họ tên', 'email:Email', 'role.name:Vai trò', 'status:Trạng thái:badge', 'createdAt:Ngày tạo:date'),
            { create: { name: '', email: '', password: 'Admin1234', role: 'user_admin' }, edit: item => ({ name: item.name, role: item.role?.code || item.role?.slug || 'user_admin', status: item.status || 'active' }), actions: adminActions }),
        section('roles', 'Tài khoản', 'Vai trò', '/admin/roles', 'roles',
            cols('name:Tên', 'code:Mã', 'description:Mô tả', 'permissions:Quyền:count', 'isSystem:Hệ thống:bool', 'isActive:Hoạt động:bool'),
            { create: { name: '', code: '', description: '', permissions: [] }, edit: item => ({ name: item.name, description: item.description, permissions: (item.permissions || []).map(p => p.code || p.slug), isActive: item.isActive }), actions: roleActions }),
        section('permissions', 'Tài khoản', 'Quyền hạn', '/admin/roles/permissions', 'permissions',
            cols('name:Tên', 'code:Mã', 'group:Nhóm', 'isActive:Hoạt động:bool'), { readOnly: true }),
        section('users', 'Người dùng', 'Người mua và người bán', '/admin/users', 'users',
            cols('name:Họ tên', 'email:Email', 'phone:Số điện thoại', 'role:Vai trò:badge', 'status:Trạng thái:badge', 'lastLoginAt:Đăng nhập cuối:date'),
            {
                statuses: ['active', 'banned', 'inactive'],
                filters: [
                    {
                        id: 'roleInput',
                        query: 'role',
                        options: [
                            { value: '', label: 'Tất cả vai trò' },
                            { value: 'buyer', label: 'Người mua' },
                            { value: 'seller', label: 'Người bán' }
                        ]
                    }
                ],
                allowCreate: false,
                actions: userActions
            }),
        section('sellerApplications', 'Người dùng', 'Hồ sơ mở shop', '/admin/seller-applications', 'applications',
            cols('representativeName:Người đại diện', 'representativeEmail:Email', 'representativePhone:Số điện thoại', 'proposedShopName:Tên shop', 'applicationType:Loại shop:badge', 'status:Trạng thái:badge', 'documentCount:Giấy tờ', 'updatedAt:Cập nhật:date'),
            {
                statuses: ['draft', 'submitted', 'pending_review', 'need_more_information', 'approved', 'rejected', 'suspended', 'permanently_banned'],
                filters: [
                    {
                        id: 'applicationTypeInput',
                        query: 'applicationType',
                        options: [
                            { value: '', label: 'Tất cả loại shop' },
                            { value: 'standard', label: 'Shop thường' },
                            { value: 'petmall', label: 'PetMall / thương hiệu' }
                        ]
                    }
                ],
                allowCreate: false,
                actions: sellerApplicationActions
            }),
        section('careServiceApplications', 'Người dùng', 'Hồ sơ dịch vụ chăm sóc', '/admin/care-services/applications', 'applications',
            cols('facilityName:Tên cơ sở', 'shop.name:Shop', 'contactEmail:Email', 'hotline:Hotline', 'requestedLabel:Nhãn yêu cầu:badge', 'status:Trạng thái:badge', 'documentCount:Hồ sơ', 'updatedAt:Cập nhật:date'),
            {
                statuses: ['draft', 'submitted', 'pending_review', 'need_more_information', 'approved', 'rejected', 'suspended', 'permanently_banned'],
                filters: [
                    {
                        id: 'careLabelInput',
                        query: 'label',
                        options: [
                            { value: '', label: 'Tất cả nhãn dịch vụ' },
                            { value: 'standard', label: 'Dịch vụ thường' },
                            { value: 'premium_care_partner', label: 'Premium Care Partner' }
                        ]
                    }
                ],
                allowCreate: false,
                actions: careServiceApplicationActions
            }),
        section('sellerViolations', 'Người dùng', 'Vi phạm shop', '/admin/seller-applications/violations', 'violations',
            cols('shop.name:Shop', 'seller.email:Người bán', 'violationType:Loại vi phạm', 'severity:Mức độ:badge', 'actionTaken:Xử lý:badge', 'status:Trạng thái:badge', 'createdAt:Ghi nhận:date'),
            {
                statuses: ['open', 'resolved', 'escalated'],
                filters: [
                    {
                        id: 'severityInput',
                        query: 'severity',
                        options: [
                            { value: '', label: 'Tất cả mức độ' },
                            { value: 'notice', label: 'Nhắc nhở' },
                            { value: 'warning', label: 'Cảnh cáo' },
                            { value: 'serious', label: 'Nghiêm trọng' },
                            { value: 'critical', label: 'Rất nghiêm trọng' }
                        ]
                    }
                ],
                allowCreate: false,
                actions: sellerViolationActions
            }),
        section('shops', 'Người dùng', 'Cửa hàng', '/admin/shops', 'shops',
            cols('name:Cửa hàng', 'owner.email:Chủ shop', 'status:Trạng thái:badge', 'isVerified:Xác minh:bool', 'rating:Điểm đánh giá', 'productCount:Sản phẩm'),
            { statuses: ['pending', 'approved', 'rejected', 'inactive'], actions: shopActions }),
        section('products', 'Danh mục', 'Sản phẩm', '/admin/products', 'products',
            cols('name:Sản phẩm', 'shop.name:Cửa hàng', 'category.name:Danh mục', 'price:Giá bán:money', 'stock:Tồn kho', 'isActive:Hiển thị:bool', 'isVerified:Xác minh:bool'),
            { actions: productActions }),
        section('categories', 'Danh mục', 'Danh mục', '/admin/categories/categories', 'categories',
            cols('name:Tên', 'slug:Slug', 'parent.name:Danh mục cha', 'order:Thứ tự', 'isActive:Hoạt động:bool', 'productCount:Sản phẩm'),
            { create: { name: '', slug: '', parent: null, order: 0, isActive: true }, edit: item => pick(item, ['name', 'slug', 'description', 'icon', 'image', 'order', 'isActive']), actions: crudActions }),
        section('brands', 'Danh mục', 'Thương hiệu', '/admin/categories/brands', 'brands',
            cols('name:Tên', 'slug:Slug', 'country:Quốc gia', 'isVerified:Xác minh:bool', 'isActive:Hoạt động:bool', 'productCount:Sản phẩm'),
            { create: { name: '', slug: '', logo: '', country: '', isActive: true }, edit: item => pick(item, ['name', 'slug', 'logo', 'banner', 'website', 'country', 'description', 'isVerified', 'isActive']), actions: crudActions }),
        section('attributes', 'Danh mục', 'Thuộc tính', '/admin/categories/attributes', 'attributes',
            cols('name:Tên', 'code:Mã', 'type:Kiểu', 'values:Giá trị:count', 'isFilterable:Lọc:bool', 'isActive:Hoạt động:bool'),
            { create: { name: '', code: '', type: 'text', values: [], isFilterable: false, isSearchable: false, isRequired: false, isActive: true }, edit: item => pick(item, ['name', 'code', 'type', 'values', 'unit', 'isFilterable', 'isSearchable', 'isRequired', 'isActive']), actions: crudActions }),
        section('orders', 'Đơn hàng', 'Đơn hàng', '/admin/orders', 'orders',
            cols('orderNumber:Mã đơn', 'buyer.email:Khách mua', 'total:Tổng tiền:money', 'status:Trạng thái:badge', 'payment.method:Thanh toán', 'payment.status:Trạng thái thanh toán:badge', 'createdAt:Ngày tạo:date'),
            { statuses: ['pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'completed', 'cancelled', 'return_pending', 'returned'], actions: orderActions }),
        section('payments', 'Đơn hàng', 'Thanh toán', '/admin/content/payments', 'payments',
            cols('orderNumber:Mã đơn', 'buyer.email:Khách mua', 'total:Số tiền:money', 'payment.method:Phương thức', 'payment.status:Trạng thái:badge', 'payment.transactionId:Mã giao dịch', 'createdAt:Ngày tạo:date'),
            { statusQuery: 'paymentStatus', statuses: ['pending', 'paid', 'failed', 'refunded'], actions: paymentActions }),
        section('refunds', 'Đơn hàng', 'Hoàn tiền', '/admin/content/refunds', 'refunds',
            cols('order.orderNumber:Mã đơn', 'buyer.email:Khách mua', 'shop.name:Cửa hàng', 'amount:Số tiền:money', 'status:Trạng thái:badge', 'reason:Lý do'),
            { statuses: ['pending', 'approved', 'rejected', 'processing', 'completed', 'failed'], actions: statusActions('/admin/content/refunds') }),
        section('returns', 'Đơn hàng', 'Đổi trả', '/admin/content/returns', 'returns',
            cols('order.orderNumber:Mã đơn', 'buyer.email:Khách mua', 'shop.name:Cửa hàng', 'status:Trạng thái:badge', 'reason:Lý do'),
            { statuses: ['pending', 'approved', 'rejected', 'return_shipping', 'delivered', 'inspected', 'refunded', 'rejected_inspection'], actions: statusActions('/admin/content/returns') }),
        section('complaints', 'Đơn hàng', 'Khiếu nại', '/admin/content/complaints', 'complaints',
            cols('subject:Chủ đề', 'buyer.email:Khách mua', 'shop.name:Cửa hàng', 'type:Loại', 'status:Trạng thái:badge', 'priority:Mức độ ưu tiên'),
            { statuses: ['pending', 'reviewing', 'seller_replied', 'escalated', 'resolved', 'closed'], actions: statusActions('/admin/content/complaints') }),
        section('banners', 'Nội dung', 'Banner', '/admin/content/banners', 'banners',
            cols('title:Tiêu đề', 'badge:Nhãn', 'type:Loại', 'position:Thứ tự', 'isActive:Hoạt động:bool'),
            { create: { title: '', subtitle: '', image: '/assets/photos/dog.jpg', link: '#shop', badge: '', type: 'primary', position: 0, isActive: true }, edit: item => pick(item, ['title', 'subtitle', 'image', 'link', 'badge', 'type', 'backgroundColor', 'secondaryColor', 'position', 'isActive']), actions: crudActions }),
        section('promotions', 'Nội dung', 'Khuyến mại', '/admin/content/promotions', 'promotions',
            cols('title:Tiêu đề', 'shop.name:Cửa hàng', 'type:Loại', 'discountPercent:Mức giảm', 'endDate:Kết thúc:date', 'isActive:Hoạt động:bool'),
            { statusQuery: 'isActive', statuses: ['true', 'false'], create: { title: '', description: '', image: '/assets/photos/dog.jpg', link: '#shop', type: 'deal', discountPercent: 10, endDate: dateIn(14), isActive: true }, edit: item => pick(item, ['title', 'description', 'image', 'link', 'type', 'discountPercent', 'startDate', 'endDate', 'products', 'isActive']), actions: crudActions }),
        section('coupons', 'Nội dung', 'Mã giảm giá', '/admin/content/coupons', 'coupons',
            cols('code:Mã', 'shop.name:Cửa hàng', 'type:Loại', 'value:Giá trị', 'usedCount:Đã dùng', 'status:Trạng thái:badge', 'endDate:Kết thúc:date'),
            { statuses: ['active', 'inactive', 'expired'], create: { code: '', type: 'percentage', value: 10, minOrderAmount: 0, maxDiscount: 20, maxUsage: 100, perUserLimit: 1, endDate: dateIn(30), status: 'active', description: '' }, edit: item => pick(item, ['code', 'type', 'value', 'minOrderAmount', 'maxDiscount', 'maxUsage', 'perUserLimit', 'startDate', 'endDate', 'status', 'description']), actions: crudActions }),
        section('reviews', 'Nội dung', 'Đánh giá', '/admin/content/reviews', 'reviews',
            cols('product.name:Sản phẩm', 'user.email:Người mua', 'rating:Điểm', 'comment:Nội dung', 'status:Trạng thái:badge'),
            { statuses: ['visible', 'hidden', 'reported'], actions: reviewActions }),
        section('contacts', 'Nội dung', 'Liên hệ', '/admin/content/contacts', 'contacts',
            cols('name:Họ tên', 'email:Email', 'subject:Chủ đề', 'type:Loại', 'status:Trạng thái:badge', 'priority:Mức độ ưu tiên'),
            { statuses: ['new', 'pending', 'processing', 'resolved', 'closed'], actions: messageActions('/admin/content/contacts') }),
        section('feedback', 'Nội dung', 'Phản hồi', '/admin/content/feedback', 'feedback',
            cols('subject:Chủ đề', 'user.email:Người dùng', 'type:Loại', 'rating:Đánh giá', 'status:Trạng thái:badge', 'priority:Mức độ ưu tiên'),
            { statuses: ['new', 'reviewed', 'in_progress', 'resolved', 'closed'], actions: messageActions('/admin/content/feedback') }),
        section('articles', 'Nội dung', 'Bài viết', '/admin/content/articles', 'articles',
            cols('title:Tiêu đề', 'category:Danh mục', 'status:Trạng thái:badge', 'isFeatured:Nổi bật:bool', 'viewCount:Lượt xem', 'createdAt:Ngày tạo:date'),
            { statuses: ['draft', 'published', 'scheduled', 'archived'], create: { title: '', excerpt: '', content: '', category: 'news', tags: [], image: '/assets/photos/dog.jpg', status: 'draft' }, edit: item => pick(item, ['title', 'slug', 'excerpt', 'content', 'category', 'tags', 'image', 'status', 'isFeatured', 'seoTitle', 'seoDescription']), actions: crudActions }),
        section('pages', 'Nội dung', 'Trang chính sách', '/admin/content/pages', 'pages',
            cols('title:Tiêu đề', 'slug:Slug', 'type:Loại', 'status:Trạng thái:badge', 'updatedAt:Cập nhật:date'),
            { statuses: ['draft', 'published'], create: { title: '', slug: '', content: '', type: 'policy', status: 'published', metaTitle: '', metaDescription: '' }, edit: item => pick(item, ['title', 'slug', 'content', 'type', 'status', 'metaTitle', 'metaDescription']), actions: crudActions }),
        section('reports', 'Vận hành', 'Báo cáo vi phạm', '/admin/content/reports', 'reports',
            cols('targetType:Đối tượng', 'reporter.email:Người báo cáo', 'reason:Lý do', 'status:Trạng thái:badge', 'createdAt:Ngày tạo:date'),
            { statuses: ['pending', 'reviewing', 'valid', 'invalid', 'resolved'], actions: statusActions('/admin/content/reports') }),
        section('settlements', 'Vận hành', 'Đối soát người bán', '/admin/content/settlements', 'settlements',
            cols('shop.name:Cửa hàng', 'seller.email:Người bán', 'amount:Số tiền:money', 'fee:Phí sàn:money', 'netAmount:Thực nhận:money', 'status:Trạng thái:badge'),
            { statuses: ['pending', 'processing', 'completed', 'cancelled'], actions: settlementActions('/admin/content/settlements') }),
        section('settings', 'Hệ thống', 'Cấu hình hệ thống', '/admin/content/settings', 'settings',
            cols('key:Khóa', 'group:Nhóm', 'type:Loại', 'value:Giá trị:json', 'isPublic:Công khai:bool'),
            { create: { key: '', value: '', type: 'string', group: 'general', label: '', description: '', isPublic: false }, edit: item => pick(item, ['key', 'value', 'type', 'group', 'label', 'description', 'isPublic']), actions: settingActions }),
        section('auditLogs', 'Hệ thống', 'Nhật ký kiểm tra', '/admin/dashboard/audit-logs', 'logs',
            cols('admin.email:Admin', 'action:Hành động', 'resource:Tài nguyên', 'description:Mô tả', 'createdAt:Ngày tạo:date'), { readOnly: true }),
        section('systemLogs', 'Hệ thống', 'Nhật ký hệ thống', '/admin/content/system-logs', 'systemLogs',
            cols('level:Mức độ:badge', 'message:Nội dung', 'endpoint:Endpoint', 'statusCode:Trạng thái', 'createdAt:Ngày tạo:date'), { statusQuery: 'level', statuses: ['error', 'warn', 'info', 'debug'], readOnly: true })
    ];

    function section(id, group, title, endpoint, key, columns, options = {}) {
        return { id, group, title, endpoint, key, columns, ...options };
    }

    function cols(...items) {
        return items.map(item => {
            const parts = item.split(':');
            return { path: parts[0], label: parts[1] || parts[0], type: parts[2] || '' };
        });
    }

    function pick(source, keys) {
        return keys.reduce((result, key) => {
            result[key] = source?.[key];
            return result;
        }, {});
    }

    function currentSection() {
        return sections.find(section => section.id === state.section) || sections[0];
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function valueAt(source, path) {
        return String(path).split('.').reduce((obj, key) => obj ? obj[key] : undefined, source);
    }

    function translateAdminLabel(value) {
        const map = {
            active: 'Đang hoạt động',
            inactive: 'Ngừng hoạt động',
            pending: 'Chờ xử lý',
            approved: 'Đã duyệt',
            rejected: 'Từ chối',
            banned: 'Đã khóa',
            visible: 'Hiển thị',
            hidden: 'Đang ẩn',
            reported: 'Bị báo cáo',
            paid: 'Đã thanh toán',
            unpaid: 'Chưa thanh toán',
            failed: 'Thất bại',
            refunded: 'Đã hoàn tiền',
            processing: 'Đang xử lý',
            completed: 'Hoàn tất',
            cancelled: 'Đã hủy',
            delivered: 'Đã giao',
            shipping: 'Đang giao',
            confirmed: 'Đã xác nhận',
            preparing: 'Đang chuẩn bị',
            published: 'Đã xuất bản',
            draft: 'Bản nháp',
            scheduled: 'Đã lên lịch',
            archived: 'Đã lưu trữ',
            reviewing: 'Đang xem xét',
            resolved: 'Đã xử lý',
            closed: 'Đã đóng',
            valid: 'Hợp lệ',
            invalid: 'Không hợp lệ',
            true: 'Có',
            false: 'Không',
            error: 'Lỗi',
            warn: 'Cảnh báo',
            info: 'Thông tin',
            debug: 'Gỡ lỗi'
        };
        const normalized = String(value ?? '').toLowerCase();
        return map[normalized] || String(value ?? '');
    }

    function money(value) {
        return `${Number(value || 0).toLocaleString('vi-VN')} ₫`;
    }

    function format(value, type) {
        if (type === 'date') return value ? new Date(value).toLocaleString() : '';
        if (type === 'money') return money(value);
        if (type === 'bool') return `<span class="badge ${value ? 'active' : 'inactive'}">${value ? 'Có' : 'Không'}</span>`;
        if (type === 'badge') return `<span class="badge ${escapeHtml(value)}">${escapeHtml(translateAdminLabel(value || 'n/a'))}</span>`;
        if (type === 'count') return Array.isArray(value) ? value.length : 0;
        if (type === 'json') return escapeHtml(typeof value === 'object' ? JSON.stringify(value) : value);
        if (Array.isArray(value)) return value.length;
        if (value && typeof value === 'object') return escapeHtml(value.name || value.email || value._id || JSON.stringify(value));
        return escapeHtml(value ?? '');
    }

    async function api(path, options = {}) {
        const headers = { ...(options.headers || {}) };
        if (!options.skipJson) headers['Content-Type'] = 'application/json';
        if (!options.noAuth && state.token) headers.Authorization = `Bearer ${state.token}`;

        const response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers,
            body: options.body && !options.skipJson ? JSON.stringify(options.body) : options.body
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body.success === false) {
            throw new Error(body.message || `Request failed: ${response.status}`);
        }
        return body.data !== undefined ? body.data : body;
    }

    function notify(message, type = '') {
        const notice = document.getElementById('notice');
        if (!notice) {
            if (type === 'error') alert(message);
            return;
        }
        notice.className = `notice ${type}`;
        notice.textContent = message;
        notice.hidden = false;
        window.clearTimeout(notice._timer);
        notice._timer = window.setTimeout(() => {
            notice.hidden = true;
        }, 3500);
    }

    function renderLogin() {
        root.innerHTML = `
            <main class="admin-login">
                <section class="admin-login-hero">
                    <div class="brand"><div class="brand-mark">P</div><strong>Trung tâm quản trị Petco</strong></div>
                    <div>
                        <h1>Quản trị sàn thương mại pet.</h1>
                        <p>Cổng riêng cho admin để duyệt shop, kiểm duyệt sản phẩm, xử lý đơn hàng, nội dung, khuyến mại và cấu hình hệ thống.</p>
                    </div>
                    <p>Demo: admin@petshop.com / admin123</p>
                </section>
                <section class="admin-login-card">
                    <form class="admin-card" id="loginForm">
                        <h2>Đăng nhập quản trị</h2>
                        <p class="muted">Người mua và người bán không đăng nhập tại cổng này.</p>
                        <div id="loginNotice" class="notice error" hidden></div>
                        <div class="field"><label>Email</label><input name="email" type="email" value="admin@petshop.com" required></div>
                        <div class="field"><label>Mật khẩu</label><input name="password" type="password" value="admin123" required></div>
                        <button class="primary-btn" type="submit">Đăng nhập</button>
                        <button class="secondary-btn" id="forgotBtn" type="button" style="margin-top: 10px; width: 100%;">Quên / đặt lại mật khẩu</button>
                    </form>
                </section>
            </main>
        `;

        document.getElementById('loginForm').addEventListener('submit', async event => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            try {
                const data = await api('/admin/auth/login', {
                    method: 'POST',
                    noAuth: true,
                    body: { email: form.get('email'), password: form.get('password') }
                });
                state.token = data.token;
                state.admin = data.admin;
                localStorage.setItem('adminToken', state.token);
                localStorage.setItem('adminUser', JSON.stringify(state.admin));
                renderApp();
                await loadSection('overview');
            } catch (error) {
                const notice = document.getElementById('loginNotice');
                notice.hidden = false;
                notice.textContent = error.message;
            }
        });

        document.getElementById('forgotBtn').addEventListener('click', forgotPassword);
    }

    async function forgotPassword() {
        const email = prompt('Email admin', 'admin@petshop.com');
        if (!email) return;
        try {
            const data = await api('/admin/auth/forgot-password', { method: 'POST', noAuth: true, body: { email } });
            if (!data.resetToken) {
                alert('Nếu tài khoản tồn tại, hệ thống đã tạo reset token.');
                return;
            }
            const password = prompt(`Reset token:\n${data.resetToken}\n\nMật khẩu mới:`);
            if (!password) return;
            await api('/admin/auth/reset-password', { method: 'POST', noAuth: true, body: { token: data.resetToken, newPassword: password } });
            alert('Đã đặt lại mật khẩu.');
        } catch (error) {
            alert(error.message);
        }
    }

    function renderApp() {
        let lastGroup = '';
        const nav = sections.map(section => {
            const group = section.group !== lastGroup ? `<div class="nav-group">${escapeHtml(section.group)}</div>` : '';
            lastGroup = section.group;
            return `${group}<button class="nav-btn ${section.id === state.section ? 'active' : ''}" data-section="${section.id}">${escapeHtml(section.title)}</button>`;
        }).join('');

        root.innerHTML = `
            <div class="admin-app">
                <aside class="sidebar">
                    <div class="brand">
                        <div class="brand-mark">P</div>
                        <div><strong>Trung tâm quản trị</strong><div class="muted">${escapeHtml(state.admin?.email || '')}</div></div>
                    </div>
                    <nav>${nav}</nav>
                </aside>
                <main class="admin-main">
                    <header class="topbar">
                        <div><h1 id="pageTitle">Bảng điều khiển</h1><div id="pageSubtitle" class="muted">Tổng quan hệ thống</div></div>
                        <div><button class="secondary-btn" id="storeBtn">Về trang chủ</button> <button class="danger-btn" id="logoutBtn">Đăng xuất</button></div>
                    </header>
                    <section class="content">
                        <div id="notice" class="notice" hidden></div>
                        <div id="adminContent"></div>
                    </section>
                </main>
            </div>
            <div id="modalRoot"></div>
        `;

        root.querySelectorAll('[data-section]').forEach(button => button.addEventListener('click', () => loadSection(button.dataset.section)));
        document.getElementById('logoutBtn').addEventListener('click', logout);
        document.getElementById('storeBtn').addEventListener('click', () => window.location.href = '/');
    }

    function logout() {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        state.token = '';
        state.admin = null;
        renderLogin();
    }

    async function loadSection(id = state.section) {
        state.section = id;
        const active = currentSection();
        document.querySelectorAll('.nav-btn').forEach(button => button.classList.toggle('active', button.dataset.section === id));
        document.getElementById('pageTitle').textContent = active.title;
        document.getElementById('pageSubtitle').textContent = active.readOnly ? 'Chỉ xem' : 'Quản lý dữ liệu';
        if (id === 'overview') return renderOverview();
        return renderList(active);
    }

    async function renderOverview() {
        const container = document.getElementById('adminContent');
        container.innerHTML = '<div class="panel"><div class="empty">Đang tải bảng điều khiển...</div></div>';
        try {
            const data = await api('/admin/dashboard/stats');
            const overview = data.overview || {};
            const revenue = data.revenue || {};
            const orders = data.orders || {};
            container.innerHTML = `
                <div class="stats-grid">
                    ${stat('Người dùng', overview.totalUsers, `+${overview.newUsersToday || 0} hôm nay`)}
                    ${stat('Shop đã duyệt', overview.totalShops, `+${overview.newShopsToday || 0} hôm nay`)}
                    ${stat('Sản phẩm đang bán', overview.totalProducts, `+${overview.newProductsToday || 0} hôm nay`)}
                    ${stat('Đơn hàng', overview.totalOrders, `+${overview.newOrdersToday || 0} hôm nay`)}
                    ${stat('Doanh thu hôm nay', money(revenue.today), `Tháng này: ${money(revenue.thisMonth)}`)}
                    ${stat('Đơn chờ xử lý', orders.pending || 0, 'Cần xử lý sớm')}
                    ${stat('Đơn đang giao', orders.shipping || 0, 'Đang vận chuyển')}
                    ${stat('Đơn đã hủy', orders.cancelled || 0, 'Theo dõi tỷ lệ')}
                </div>
                <div class="panel"><div class="panel-head"><strong>Đơn hàng gần đây</strong></div>${simpleTable(data.recentOrders || [], cols('orderNumber:Mã đơn', 'buyer.email:Khách mua', 'total:Tổng tiền:money', 'status:Trạng thái:badge', 'createdAt:Ngày tạo:date'))}</div>
                <div class="panel"><div class="panel-head"><strong>Sản phẩm bán chạy</strong></div>${simpleTable(data.topProducts || [], cols('name:Sản phẩm', 'price:Giá bán:money', 'soldCount:Đã bán'))}</div>
            `;
        } catch (error) {
            container.innerHTML = `<div class="notice error">${escapeHtml(error.message)}</div>`;
        }
    }

    function stat(label, value, hint) {
        return `<div class="stat"><strong>${escapeHtml(value ?? 0)}</strong><div>${escapeHtml(label)}</div><small class="muted">${escapeHtml(hint || '')}</small></div>`;
    }

    async function renderList(section) {
        const container = document.getElementById('adminContent');
        const existingSearch = document.getElementById('searchInput')?.value || '';
        const existingStatus = document.getElementById('statusInput')?.value || '';
        const params = new URLSearchParams({ limit: '50' });
        if (existingSearch) params.set('search', existingSearch);
        if (existingStatus) params.set(section.statusQuery || 'status', existingStatus);

        container.innerHTML = '<div class="panel"><div class="empty">Đang tải dữ liệu...</div></div>';
        try {
            const data = await api(`${section.endpoint}?${params.toString()}`);
            state.rows = unwrapRows(data, section.key);
            state.actions = {};
            container.innerHTML = `
                <div class="panel">
                    <div class="panel-head">
                        <div><strong>${escapeHtml(section.title)}</strong><div class="muted">Đã tải ${state.rows.length} bản ghi</div></div>
                        <div class="toolbar">
                            <input id="searchInput" placeholder="Tìm kiếm..." value="${escapeHtml(existingSearch)}">
                            ${statusFilter(section, existingStatus)}
                            <button class="secondary-btn" id="refreshBtn">Làm mới</button>
                            ${section.readOnly ? '' : '<button class="primary-btn" id="createBtn">Tạo mới</button>'}
                        </div>
                    </div>
                    ${table(section, state.rows)}
                </div>
            `;
            wireToolbar(section);
            wireActions();
        } catch (error) {
            container.innerHTML = `<div class="notice error">${escapeHtml(error.message)}</div>`;
        }
    }

    function statusFilter(section, value) {
        if (!section.statuses) return '<span></span>';
        return `<select id="statusInput"><option value="">Tất cả</option>${section.statuses.map(status => `<option value="${escapeHtml(status)}" ${status === value ? 'selected' : ''}>${escapeHtml(translateAdminLabel(status))}</option>`).join('')}</select>`;
    }

    function unwrapRows(data, key) {
        if (Array.isArray(data)) return data;
        if (!data || typeof data !== 'object') return [];
        if (Array.isArray(data[key])) return data[key];
        for (const k of ['users', 'shops', 'products', 'orders', 'admins', 'roles', 'permissions', 'categories', 'brands', 'attributes', 'banners', 'promotions', 'coupons', 'reviews', 'contacts', 'feedback', 'articles', 'pages', 'refunds', 'returns', 'complaints', 'reports', 'settlements', 'settings', 'logs', 'systemLogs', 'payments']) {
            if (Array.isArray(data[k])) return data[k];
        }
        return [];
    }

    function wireToolbar(section) {
        document.getElementById('refreshBtn')?.addEventListener('click', () => loadSection(section.id));
        document.getElementById('statusInput')?.addEventListener('change', () => loadSection(section.id));
        document.getElementById('searchInput')?.addEventListener('input', () => {
            window.clearTimeout(state.searchTimer);
            state.searchTimer = window.setTimeout(() => loadSection(section.id), 350);
        });
        document.getElementById('createBtn')?.addEventListener('click', () => createRecord(section));
    }

    function table(section, rows) {
        if (!rows.length) return '<div class="empty">Không tìm thấy bản ghi nào.</div>';
        return `
            <div class="table-wrap">
                <table>
                    <thead><tr>${section.columns.map(col => `<th>${escapeHtml(col.label)}</th>`).join('')}<th>Thao tác</th></tr></thead>
                    <tbody>${rows.map((row, index) => rowHtml(section, row, index)).join('')}</tbody>
                </table>
            </div>
        `;
    }

    function rowHtml(section, row, index) {
        const actions = section.actions ? section.actions(section, row) : [];
        state.actions[index] = actions;
        return `
            <tr>
                ${section.columns.map(col => `<td>${format(valueAt(row, col.path), col.type)}</td>`).join('')}
                <td>${actions.map((action, actionIndex) => `<button class="tiny-btn ${action.kind || ''}" data-row="${index}" data-action="${actionIndex}">${escapeHtml(action.label)}</button>`).join('') || '<span class="muted">Chỉ xem</span>'}</td>
            </tr>
        `;
    }

    function simpleTable(rows, columns) {
        if (!rows.length) return '<div class="empty">Chưa có dữ liệu.</div>';
        return `
            <div class="table-wrap">
                <table>
                    <thead><tr>${columns.map(col => `<th>${escapeHtml(col.label)}</th>`).join('')}</tr></thead>
                    <tbody>${rows.map(row => `<tr>${columns.map(col => `<td>${format(valueAt(row, col.path), col.type)}</td>`).join('')}</tr>`).join('')}</tbody>
                </table>
            </div>
        `;
    }

    function wireActions() {
        document.querySelectorAll('[data-row][data-action]').forEach(button => {
            button.addEventListener('click', async () => {
                const action = state.actions[Number(button.dataset.row)]?.[Number(button.dataset.action)];
                const row = state.rows[Number(button.dataset.row)];
                if (!action || !row) return;
                try {
                    await action.run(row);
                } catch (error) {
                    notify(error.message, 'error');
                }
            });
        });
    }

    function createRecord(section) {
        openJson(`Tạo mới ${section.title}`, section.create || {}, async payload => {
            await api(section.endpoint, { method: 'POST', body: payload });
            notify('Đã tạo mới');
            await loadSection(section.id);
        }, { section });
    }

    function editRecord(section, row) {
        const body = section.edit ? section.edit(row) : row;
        openJson(`Chỉnh sửa ${section.title}`, body, async payload => {
            await api(`${section.endpoint}/${row._id}`, { method: 'PUT', body: payload });
            notify('Đã cập nhật');
            await loadSection(section.id);
        }, { section });
    }

    function deleteRecord(section, row) {
        return async () => {
            if (!confirm('Bạn có chắc muốn xóa bản ghi này không?')) return;
            await api(`${section.endpoint}/${row._id}`, { method: 'DELETE' });
            notify('Đã xóa');
            await loadSection(section.id);
        };
    }

    function humanizeKey(key) {
        return String(key || '')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/^./, char => char.toUpperCase());
    }

    function isObject(value) {
        return value && typeof value === 'object' && !Array.isArray(value);
    }

    function formatDateTimeLocalValue(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 16);
    }

    function detectFieldType(key, value) {
        if (typeof value === 'boolean') return 'checkbox';
        if (typeof value === 'number') return 'number';
        if (Array.isArray(value) || isObject(value)) return 'json';
        if (/password/i.test(key)) return 'password';
        if (/email/i.test(key)) return 'email';
        if (/url|image|logo|banner|website|link/i.test(key)) return 'url';
        if (/date|at$/i.test(key)) return 'datetime-local';
        if (/description|content|excerpt|note|reason|response|seo/i.test(key)) return 'textarea';
        return 'text';
    }

    function renderModalField(key, value) {
        const type = detectFieldType(key, value);
        const id = `field_${key}`;
        if (type === 'checkbox') {
            return `
                <label class="field field-inline" for="${id}">
                    <span>${escapeHtml(humanizeKey(key))}</span>
                    <input id="${id}" name="${escapeHtml(key)}" type="checkbox" ${value ? 'checked' : ''}>
                </label>
            `;
        }
        if (type === 'textarea') {
            return `
                <label class="field" for="${id}">
                    <span>${escapeHtml(humanizeKey(key))}</span>
                    <textarea id="${id}" name="${escapeHtml(key)}">${escapeHtml(value ?? '')}</textarea>
                </label>
            `;
        }
        if (type === 'json') {
            return `
                <label class="field" for="${id}">
                    <span>${escapeHtml(humanizeKey(key))}</span>
                    <textarea id="${id}" name="${escapeHtml(key)}" data-field-type="json">${escapeHtml(JSON.stringify(value ?? (Array.isArray(value) ? [] : {}), null, 2))}</textarea>
                </label>
            `;
        }
        const inputValue = type === 'datetime-local'
            ? formatDateTimeLocalValue(value)
            : value ?? '';
        return `
            <label class="field" for="${id}">
                <span>${escapeHtml(humanizeKey(key))}</span>
                <input id="${id}" name="${escapeHtml(key)}" type="${type}" value="${escapeHtml(inputValue)}">
            </label>
        `;
    }

    function parseModalValue(input, originalValue) {
        if (input.type === 'checkbox') return input.checked;
        if (input.dataset.fieldType === 'json') {
            return input.value.trim() ? JSON.parse(input.value) : (Array.isArray(originalValue) ? [] : {});
        }
        if (input.type === 'number') return input.value === '' ? 0 : Number(input.value);
        if (input.type === 'datetime-local') return input.value ? new Date(input.value).toISOString() : null;
        return input.value;
    }

    function serializePrimitive(value) {
        if (value === null || value === undefined || value === '') return '<span class="muted">Chưa có dữ liệu</span>';
        if (typeof value === 'boolean') return `<span class="badge ${value ? 'active' : 'inactive'}">${value ? 'Có' : 'Không'}</span>`;
        if (typeof value === 'number') return escapeHtml(Number.isFinite(value) ? String(value) : '0');
        return escapeHtml(String(value));
    }

    function renderDetailValue(value, depth = 0) {
        if (value === null || value === undefined || value === '') {
            return '<span class="muted">Chưa có dữ liệu</span>';
        }
        if (Array.isArray(value)) {
            if (!value.length) return '<span class="muted">Không có dữ liệu</span>';
            if (value.every(item => !isObject(item))) {
                return `<div class="chip-list">${value.map(item => `<span class="detail-chip">${escapeHtml(translateAdminLabel(item))}</span>`).join('')}</div>`;
            }
            return `
                <div class="detail-array">
                    ${value.map((item, index) => `
                        <div class="detail-card">
                            <div class="detail-card-title">Mục ${index + 1}</div>
                            ${renderDetailFields(item, depth + 1)}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        if (isObject(value)) {
            return `<div class="detail-card detail-card-nested">${renderDetailFields(value, depth + 1)}</div>`;
        }
        return serializePrimitive(
            typeof value === 'string' && /^https?:\/\//i.test(value)
                ? value
                : value
        );
    }

    function renderDetailFields(payload, depth = 0) {
        const entries = Object.entries(payload || {}).filter(([, value]) => value !== undefined);
        if (!entries.length) {
            return '<div class="empty compact">Không có dữ liệu để hiển thị.</div>';
        }
        return `
            <div class="detail-grid ${depth > 0 ? 'nested' : ''}">
                ${entries.map(([key, value]) => `
                    <div class="detail-item">
                        <div class="detail-label">${escapeHtml(humanizeKey(key))}</div>
                        <div class="detail-value">${renderDetailValue(value, depth)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderRichModal(title, subtitle, body, actionsHtml) {
        const modalRoot = document.getElementById('modalRoot');
        modalRoot.innerHTML = `
            <div class="modal-backdrop">
                <div class="modal modal-rich">
                    <h2>${escapeHtml(title)}</h2>
                    <p class="muted">${escapeHtml(subtitle)}</p>
                    <div id="modalError" class="notice error" hidden></div>
                    ${body}
                    <div class="modal-actions">${actionsHtml}</div>
                </div>
            </div>
        `;
        document.querySelector('.modal-backdrop').addEventListener('click', event => {
            if (event.target.classList.contains('modal-backdrop')) closeModal();
        });
    }

    function openJson(title, payload, onSave, options = {}) {
        const fieldEntries = Object.entries(payload || {});
        const body = `
            <form id="recordForm" class="modal-form">
                ${fieldEntries.map(([key, value]) => renderModalField(key, value)).join('')}
            </form>
        `;
        renderRichModal(
            title,
            options.subtitle || 'Điền thông tin và lưu thay đổi.',
            body,
            `
                <button class="secondary-btn" id="cancelModal">Hủy</button>
                <button class="primary-btn" id="saveModal">Lưu</button>
            `
        );
        document.getElementById('cancelModal').addEventListener('click', closeModal);
        document.getElementById('saveModal').addEventListener('click', async () => {
            const errorBox = document.getElementById('modalError');
            try {
                const form = document.getElementById('recordForm');
                const parsed = {};
                fieldEntries.forEach(([key, originalValue]) => {
                    const input = form.elements.namedItem(key);
                    if (!input) return;
                    parsed[key] = parseModalValue(input, originalValue);
                });
                await onSave(parsed);
                closeModal();
            } catch (error) {
                errorBox.hidden = false;
                errorBox.textContent = error.message;
            }
        });
    }

    function closeModal() {
        const modal = document.getElementById('modalRoot');
        if (modal) modal.innerHTML = '';
    }

    function openReadonlyJson(title, payload, options = {}) {
        const body = `<div class="detail-view">${renderDetailFields(payload)}</div>`;
        renderRichModal(
            title,
            options.subtitle || 'Xem thông tin chi tiết.',
            body,
            `<button class="primary-btn" id="closeReadonlyModal">Đóng</button>`
        );
        document.getElementById('closeReadonlyModal').addEventListener('click', closeModal);
    }

    function details(section, row) {
        return { label: 'Chi tiết', run: () => openReadonlyJson(`Chi tiết ${section.title.toLowerCase()}`, row, { section }) };
    }

    function crudActions(section, row) {
        const actions = [details(section, row), { label: 'Chỉnh sửa', run: () => editRecord(section, row) }];
        if ('isActive' in row) {
            actions.push({
                label: row.isActive ? 'Tắt' : 'Bật',
                kind: row.isActive ? 'warn' : 'success',
                run: async () => {
                    await api(`${section.endpoint}/${row._id}`, { method: 'PUT', body: { isActive: !row.isActive } });
                    notify('Đã cập nhật trạng thái');
                    await loadSection(section.id);
                }
            });
        }
        actions.push({ label: 'Xóa', kind: 'danger', run: deleteRecord(section, row) });
        return actions;
    }

    function adminActions(section, row) {
        return [
            details(section, row),
            { label: 'Chỉnh sửa', run: () => editRecord(section, row) },
            {
                label: row.status === 'active' ? 'Khóa' : 'Mở khóa',
                kind: row.status === 'active' ? 'warn' : 'success',
                run: async () => {
                    await api(`${section.endpoint}/${row._id}`, { method: 'PUT', body: { status: row.status === 'active' ? 'locked' : 'active' } });
                    notify('Đã cập nhật trạng thái admin');
                    await loadSection(section.id);
                }
            },
            {
                label: 'Đặt lại mật khẩu',
                kind: 'warn',
                run: async () => {
                    const newPassword = prompt('Mật khẩu admin mới', 'Admin1234');
                    if (!newPassword) return;
                    await api(`${section.endpoint}/${row._id}/reset-password`, { method: 'POST', body: { newPassword } });
                    notify('Đã đặt lại mật khẩu');
                }
            }
        ];
    }

    function roleActions(section, row) {
        const actions = [details(section, row)];
        if (!row.isSystem) {
            actions.push({ label: 'Chỉnh sửa', run: () => editRecord(section, row) });
            actions.push({ label: 'Xóa', kind: 'danger', run: deleteRecord(section, row) });
        }
        return actions;
    }

    function userActions(section, row) {
        return [
            details(section, row),
            {
                label: row.status === 'active' ? 'Khóa tài khoản' : 'Kích hoạt',
                kind: row.status === 'active' ? 'warn' : 'success',
                run: async () => {
                    await api(`${section.endpoint}/${row._id}/status`, { method: 'PUT', body: { status: row.status === 'active' ? 'banned' : 'active' } });
                    notify('Đã cập nhật trạng thái người dùng');
                    await loadSection(section.id);
                }
            },
            {
                label: row.role === 'seller' ? 'Chuyển thành người mua' : 'Chuyển thành người bán',
                run: async () => {
                    await api(`${section.endpoint}/${row._id}/role`, { method: 'PUT', body: { role: row.role === 'seller' ? 'buyer' : 'seller' } });
                    notify('Đã cập nhật vai trò người dùng');
                    await loadSection(section.id);
                }
            },
            {
                label: 'Xóa tài khoản',
                kind: 'danger',
                run: async () => {
                    const confirmed = confirm(`Bạn có chắc muốn xóa tài khoản ${row.email || row.name || ''}?`);
                    if (!confirmed) return;
                    await api(`${section.endpoint}/${row._id}`, { method: 'DELETE' });
                    notify('Đã xóa tài khoản người dùng');
                    await loadSection(section.id);
                }
            }
        ];
    }

    function shopActions(section, row) {
        return [
            details(section, row),
            {
                label: 'Duyệt',
                kind: 'success',
                run: async () => {
                    await api(`${section.endpoint}/${row._id}/status`, { method: 'PUT', body: { status: 'approved', isVerified: true } });
                    notify('Đã duyệt shop');
                    await loadSection(section.id);
                }
            },
            {
                label: 'Từ chối',
                kind: 'danger',
                run: async () => {
                    await api(`${section.endpoint}/${row._id}/status`, { method: 'PUT', body: { status: 'rejected' } });
                    notify('Đã từ chối shop');
                    await loadSection(section.id);
                }
            },
            {
                label: row.status === 'inactive' ? 'Mở lại' : 'Tạm ngưng',
                kind: 'warn',
                run: async () => {
                    await api(`${section.endpoint}/${row._id}/status`, { method: 'PUT', body: { status: row.status === 'inactive' ? 'approved' : 'inactive' } });
                    notify('Đã cập nhật trạng thái shop');
                    await loadSection(section.id);
                }
            }
        ];
    }

    function productActions(section, row) {
        return [
            details(section, row),
            {
                label: 'Duyệt',
                kind: 'success',
                run: async () => {
                    await api(`${section.endpoint}/${row._id}/verify`, { method: 'PUT', body: {} });
                    notify('Đã duyệt sản phẩm');
                    await loadSection(section.id);
                }
            },
            {
                label: row.isActive ? 'Ẩn' : 'Hiện',
                kind: row.isActive ? 'warn' : 'success',
                run: async () => {
                    await api(`${section.endpoint}/${row._id}`, { method: 'PUT', body: { status: row.isActive ? 'inactive' : 'active' } });
                    notify('Đã cập nhật hiển thị sản phẩm');
                    await loadSection(section.id);
                }
            },
            {
                label: row.isFeatured ? 'Bỏ nổi bật' : 'Đặt nổi bật',
                run: async () => {
                    await api(`${section.endpoint}/${row._id}/toggle-featured`, { method: 'POST', body: {} });
                    notify('Đã cập nhật trạng thái nổi bật');
                    await loadSection(section.id);
                }
            }
        ];
    }

    function orderActions(section, row) {
        return [
            details(section, row),
            {
                label: 'Cập nhật trạng thái',
                run: async () => {
                    const status = prompt('Trạng thái đơn hàng mới', row.status || 'confirmed');
                    if (!status) return;
                    const note = prompt('Ghi chú trạng thái', '');
                    await api(`${section.endpoint}/${row._id}/status`, { method: 'PUT', body: { status, note } });
                    notify('Đã cập nhật đơn hàng');
                    await loadSection(section.id);
                }
            },
            { label: 'Thanh toán', run: () => editPayment(row) }
        ];
    }

    function paymentActions(section, row) {
        return [details(section, row), { label: 'Cập nhật', run: () => editPayment(row, section) }];
    }

    function editPayment(row, section = currentSection()) {
        openJson('Cập nhật thanh toán', {
            status: row.payment?.status || 'paid',
            method: row.payment?.method || 'cod',
            transactionId: row.payment?.transactionId || ''
        }, async payload => {
            await api(`/admin/orders/${row._id}/payment`, { method: 'PUT', body: payload });
            notify('Đã cập nhật thanh toán');
            await loadSection(state.section);
        }, { section });
    }

    function reviewActions(section, row) {
        return [
            details(section, row),
            {
                label: row.status === 'hidden' ? 'Hiện' : 'Ẩn',
                kind: row.status === 'hidden' ? 'success' : 'warn',
                run: async () => {
                    await api(`${section.endpoint}/${row._id}`, { method: 'PUT', body: { status: row.status === 'hidden' ? 'visible' : 'hidden' } });
                    notify('Đã cập nhật đánh giá');
                    await loadSection(section.id);
                }
            },
            { label: 'Xóa', kind: 'danger', run: deleteRecord(section, row) }
        ];
    }

    function messageActions(endpoint) {
        return (section, row) => [
            details(section, row),
            {
                label: 'Phản hồi',
                run: async () => {
                    const status = prompt('Trạng thái mới', row.status || 'processing');
                    if (!status) return;
                    const response = prompt('Nội dung phản hồi', '');
                    await api(`${endpoint}/${row._id}`, { method: 'PUT', body: { status, response } });
                    notify('Đã cập nhật');
                    await loadSection(section.id);
                }
            }
        ];
    }

    function statusActions(endpoint) {
        return (section, row) => [
            details(section, row),
            {
                label: 'Cập nhật trạng thái',
                run: async () => {
                    const status = prompt('Trạng thái mới', row.status || 'pending');
                    if (!status) return;
                    await api(`${endpoint}/${row._id}`, { method: 'PUT', body: { status } });
                    notify('Đã cập nhật trạng thái');
                    await loadSection(section.id);
                }
            }
        ];
    }

    function settlementActions(endpoint) {
        function openSettlementDetail(row) {
            const detail = {
                _id: row._id,
                shop: row.shop ? {
                    _id: row.shop._id,
                    name: row.shop.name,
                    slug: row.shop.slug
                } : null,
                seller: row.seller ? {
                    _id: row.seller._id,
                    name: row.seller.name,
                    email: row.seller.email,
                    phone: row.seller.phone
                } : null,
                amount: row.amount,
                fee: row.fee,
                netAmount: row.netAmount,
                status: row.status,
                transactionId: row.transactionId || '',
                notes: row.notes || '',
                completedAt: row.completedAt || null,
                bankInfo: row.bankInfo || row.shop?.bankAccount || {},
                orders: (row.orders || []).map((order) => ({
                    _id: order._id,
                    orderNumber: order.orderNumber,
                    total: order.total,
                    payment: order.payment,
                    status: order.status
                }))
            };
            openReadonlyJson('Chi tiết đối soát người bán', detail);
        }

        async function updateSettlement(row, payload, successMessage) {
            await api(`${endpoint}/${row._id}`, { method: 'PUT', body: payload });
            notify(successMessage);
            await loadSection(state.section);
        }

        return (section, row) => {
            const actions = [
                { label: 'Chi tiết', run: () => openSettlementDetail(row) }
            ];

            if (row.status === 'pending') {
                actions.push({
                    label: 'Tiếp nhận đối soát',
                    kind: 'success',
                    run: async () => {
                        const notes = prompt('Ghi chú tiếp nhận đối soát', row.notes || 'Admin đã tiếp nhận và đang kiểm tra thông tin chuyển tiền.');
                        await updateSettlement(row, {
                            status: 'processing',
                            notes: notes || row.notes || 'Admin đã tiếp nhận đối soát.'
                        }, 'Đã chuyển yêu cầu sang trạng thái đang xử lý');
                    }
                });
            }

            if (['pending', 'processing'].includes(row.status)) {
                actions.push({
                    label: 'Dánh dấu đã chuyển tiền',
                    kind: 'success',
                    run: async () => {
                        const transactionId = prompt('Nhập mã giao dịch chuyển tiền', row.transactionId || '');
                        if (!transactionId) return;
                        const notes = prompt('Ghi chú đối soát / chuyển tiền', row.notes || 'Đã chuyển tiền cho shop và hoàn tất đối soát.');
                        await updateSettlement(row, {
                            status: 'completed',
                            transactionId,
                            notes: notes || 'Đã hoàn tất đối soát.'
                        }, 'Đã đánh dấu chuyển tiền thành công cho shop');
                    }
                });
            }

            if (row.status === 'completed') {
                actions.push({
                    label: 'Cập nhật mã giao dịch',
                    run: async () => {
                        const transactionId = prompt('Cập nhật mã giao dịch', row.transactionId || '');
                        if (!transactionId) return;
                        const notes = prompt('Ghi chú cập nhật', row.notes || '');
                        await updateSettlement(row, {
                            transactionId,
                            notes: notes || row.notes || ''
                        }, 'Đã cập nhật thông tin chuyển tiền');
                    }
                });
            }

            if (row.status !== 'completed' && row.status !== 'cancelled') {
                actions.push({
                    label: 'Hủy đối soát',
                    kind: 'danger',
                    run: async () => {
                        const notes = prompt('Lý do hủy đối soát', row.notes || 'Admin đã hủy đợt đối soát này.');
                        if (!notes) return;
                        await updateSettlement(row, {
                            status: 'cancelled',
                            notes
                        }, 'Đã hủy yêu cầu đối soát');
                    }
                });
            }

            return actions;
        };
    }

    function settingActions(section, row) {
        return [
            details(section, row),
            { label: 'Chỉnh sửa', run: () => editRecord(section, row) },
            { label: 'Xóa', kind: 'danger', run: deleteRecord(section, row) }
        ];
    }

    const extraAdminLabelMap = {
        submitted: 'Đã gửi',
        pending_review: 'Chờ Admin xét duyệt',
        need_more_information: 'Cần bổ sung',
        suspended: 'Tạm khóa',
        permanently_banned: 'Cấm vĩnh viễn',
        standard: 'Shop thường',
        petmall: 'PetMall',
        verified_seller: 'Verified Seller',
        official_brand: 'Official Brand',
        premium_care_partner: 'Premium Care Partner',
        bathing_drying: 'Tắm, sấy',
        grooming_spa: 'Grooming, spa',
        nail_ear_hygiene: 'Vệ sinh tai, móng',
        pet_hotel: 'Khách sạn thú cưng',
        pet_boarding: 'Giữ thú cưng',
        basic_care: 'Chăm sóc cơ bản',
        notice: 'Nhắc nhở',
        warning: 'Cảnh cáo',
        serious: 'Nghiêm trọng',
        critical: 'Rất nghiêm trọng',
        open: 'Đang mở',
        escalated: 'Đã chuyển xử lý',
        reminder: 'Nhắc nhở',
        hide_products: 'Ẩn sản phẩm',
        suspend_shop: 'Tạm khóa shop',
        lock_seller: 'Khóa người bán',
        permanently_ban: 'Cấm vĩnh viễn',
        report_authorities: 'Báo cơ quan chức năng'
    };

    const baseTranslateAdminLabel = translateAdminLabel;
    translateAdminLabel = function(value) {
        const normalized = String(value ?? '').toLowerCase();
        if (extraAdminLabelMap[normalized]) {
            return extraAdminLabelMap[normalized];
        }
        return baseTranslateAdminLabel(value);
    };

    const baseUnwrapRows = unwrapRows;
    unwrapRows = function(data, key) {
        if (Array.isArray(data?.applications)) return data.applications;
        if (Array.isArray(data?.violations)) return data.violations;
        return baseUnwrapRows(data, key);
    };

    function sellerApplicationActions(section, row) {
        const actions = [
            {
                label: 'Chi tiết',
                run: async () => {
                    const detail = await api(`/admin/seller-applications/${row._id}`);
                    openReadonlyJson('Chi tiết hồ sơ mở shop', detail, { section });
                }
            }
        ];

        if (['submitted', 'need_more_information'].includes(row.status)) {
            actions.push({
                label: 'Tiếp nhận',
                kind: 'warn',
                run: async () => {
                    openJson('Tiếp nhận hồ sơ', { note: row.adminNote || '' }, async payload => {
                        await api(`/admin/seller-applications/${row._id}/start-review`, { method: 'POST', body: payload });
                        notify('Đã chuyển hồ sơ sang trạng thái đang xem xét');
                        await loadSection(section.id);
                    });
                }
            });
        }

        if (['submitted', 'pending_review', 'need_more_information'].includes(row.status)) {
            actions.push({
                label: 'Yêu cầu bổ sung',
                kind: 'warn',
                run: async () => {
                    openJson('Yêu cầu bổ sung hồ sơ', { note: row.adminNote || '' }, async payload => {
                        await api(`/admin/seller-applications/${row._id}/request-more-info`, { method: 'POST', body: payload });
                        notify('Đã gửi yêu cầu bổ sung');
                        await loadSection(section.id);
                    });
                }
            });
            actions.push({
                label: 'Từ chối',
                kind: 'danger',
                run: async () => {
                    openJson('Từ chối hồ sơ', { note: row.adminNote || '' }, async payload => {
                        await api(`/admin/seller-applications/${row._id}/reject`, { method: 'POST', body: payload });
                        notify('Đã từ chối hồ sơ mở shop');
                        await loadSection(section.id);
                    });
                }
            });
        }

        if (['submitted', 'pending_review', 'need_more_information', 'rejected'].includes(row.status)) {
            actions.push({
                label: 'Phê duyệt',
                kind: 'success',
                run: async () => {
                    const defaultLabels = row.applicationType === 'petmall'
                        ? ['petmall']
                        : ['verified_seller'];
                    openJson('Phê duyệt hồ sơ', { note: '', labels: defaultLabels }, async payload => {
                        await api(`/admin/seller-applications/${row._id}/approve`, { method: 'POST', body: payload });
                        notify('Đã phê duyệt hồ sơ mở shop');
                        await loadSection(section.id);
                    });
                }
            });
        }

        if (['approved', 'suspended'].includes(row.status)) {
            actions.push({
                label: row.status === 'approved' ? 'Tạm khóa' : 'Cấm vĩnh viễn',
                kind: 'danger',
                run: async () => {
                    const endpoint = row.status === 'approved' ? 'suspend' : 'ban';
                    const title = row.status === 'approved' ? 'Tạm khóa seller/shop' : 'Cấm vĩnh viễn seller/shop';
                    openJson(title, { note: row.adminNote || '' }, async payload => {
                        await api(`/admin/seller-applications/${row._id}/${endpoint}`, { method: 'POST', body: payload });
                        notify('Đã cập nhật biện pháp xử lý');
                        await loadSection(section.id);
                    });
                }
            });
        }

        if (['approved', 'suspended', 'permanently_banned'].includes(row.status)) {
            actions.push({
                label: 'Ghi nhận vi phạm',
                kind: 'warn',
                run: async () => {
                    openJson('Tạo bản ghi vi phạm', {
                        violationType: '',
                        severity: 'warning',
                        description: '',
                        actionTaken: 'warning',
                        note: ''
                    }, async payload => {
                        await api(`/admin/seller-applications/${row._id}/violations`, { method: 'POST', body: payload });
                        notify('Đã ghi nhận vi phạm cho shop');
                        await loadSection(section.id);
                    });
                }
            });
        }

        return actions;
    }

    function sellerViolationActions(section, row) {
        return [
            details(section, row),
            {
                label: 'Cập nhật trạng thái',
                run: async () => {
                    openJson('Cập nhật vi phạm', {
                        status: row.status || 'open',
                        note: row.note || ''
                    }, async payload => {
                        await api(`/admin/seller-applications/violations/${row._id}/status`, { method: 'PUT', body: payload });
                        notify('Đã cập nhật trạng thái vi phạm');
                        await loadSection(section.id);
                    });
                }
            }
        ];
    }

    function careServiceApplicationActions(section, row) {
        const actions = [
            {
                label: 'Chi tiết',
                run: async () => {
                    const detail = await api(`/admin/care-services/applications/${row._id}`);
                    openReadonlyJson('Chi tiết hồ sơ dịch vụ chăm sóc', detail, { section });
                }
            }
        ];

        if (['submitted', 'need_more_information'].includes(row.status)) {
            actions.push({
                label: 'Tiếp nhận',
                kind: 'warn',
                run: async () => {
                    openJson('Tiếp nhận hồ sơ dịch vụ chăm sóc', { note: row.adminNote || '' }, async payload => {
                        await api(`/admin/care-services/applications/${row._id}/start-review`, { method: 'POST', body: payload });
                        notify('Đã chuyển hồ sơ sang trạng thái đang xem xét');
                        await loadSection(section.id);
                    });
                }
            });
        }

        if (['submitted', 'pending_review', 'need_more_information'].includes(row.status)) {
            actions.push({
                label: 'Yêu cầu bổ sung',
                kind: 'warn',
                run: async () => {
                    openJson('Yêu cầu bổ sung hồ sơ dịch vụ', { note: row.adminNote || '' }, async payload => {
                        await api(`/admin/care-services/applications/${row._id}/request-more-info`, { method: 'POST', body: payload });
                        notify('Đã gửi yêu cầu bổ sung hồ sơ');
                        await loadSection(section.id);
                    });
                }
            });
            actions.push({
                label: 'Từ chối',
                kind: 'danger',
                run: async () => {
                    openJson('Từ chối hồ sơ dịch vụ', { note: row.adminNote || '' }, async payload => {
                        await api(`/admin/care-services/applications/${row._id}/reject`, { method: 'POST', body: payload });
                        notify('Đã từ chối hồ sơ dịch vụ chăm sóc');
                        await loadSection(section.id);
                    });
                }
            });
        }

        if (['submitted', 'pending_review', 'need_more_information', 'rejected'].includes(row.status)) {
            actions.push({
                label: 'Phê duyệt',
                kind: 'success',
                run: async () => {
                    openJson('Phê duyệt hồ sơ dịch vụ chăm sóc', {
                        note: '',
                        label: row.requestedLabel === 'premium_care_partner' ? 'premium_care_partner' : 'standard'
                    }, async payload => {
                        await api(`/admin/care-services/applications/${row._id}/approve`, { method: 'POST', body: payload });
                        notify('Đã phê duyệt hồ sơ dịch vụ chăm sóc');
                        await loadSection(section.id);
                    });
                }
            });
        }

        if (['approved', 'suspended'].includes(row.status)) {
            actions.push({
                label: row.status === 'approved' ? 'Tạm khóa dịch vụ' : 'Cấm vĩnh viễn',
                kind: 'danger',
                run: async () => {
                    const endpoint = row.status === 'approved' ? 'suspend' : 'ban';
                    const title = row.status === 'approved'
                        ? 'Tạm khóa dịch vụ chăm sóc'
                        : 'Cấm vĩnh viễn dịch vụ chăm sóc';
                    openJson(title, { note: row.adminNote || '' }, async payload => {
                        await api(`/admin/care-services/applications/${row._id}/${endpoint}`, { method: 'POST', body: payload });
                        notify('Đã cập nhật biện pháp xử lý dịch vụ');
                        await loadSection(section.id);
                    });
                }
            });
        }

        return actions;
    }

    async function bootstrap() {
        if (!state.token) {
            renderLogin();
            return;
        }
        renderApp();
        try {
            const profile = await api('/admin/auth/profile');
            state.admin = profile;
            localStorage.setItem('adminUser', JSON.stringify(profile));
            renderApp();
            await loadSection('overview');
        } catch (error) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            state.token = '';
            state.admin = null;
            renderLogin();
        }
    }

    bootstrap();
})();
