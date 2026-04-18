(function() {
    const statusMeta = {
        none: {
            badge: 'Chưa tạo',
            description: 'Hoàn tất hồ sơ, tải giấy tờ và gửi cho Admin xét duyệt. Chỉ khi được phê duyệt, tài khoản mới có thể vào Seller Center và vận hành shop..',
            progressApplication: 'Chưa gửi hồ sơ.',
            progressReview: 'Chưa tiếp nhận.',
            progressCenter: 'Chưa có quyền truy cập.',
            badgeClass: 'inline-flex rounded-full bg-surfaceMuted px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'
        },
        draft: {
            badge: 'Bản nháp',
            description: 'Hồ sơ đang ở trạng thái bản nháp. Bạn có thể cập nhật thông tin, tải giấy tờ và gửi cho Admin bất cứ lúc nào.',
            progressApplication: 'Đang lưu bản nháp.',
            progressReview: 'Admin chưa tiếp nhận.',
            progressCenter: 'Chưa có quyền truy cập.',
            badgeClass: 'inline-flex rounded-full bg-surfaceMuted px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'
        },
        submitted: {
            badge: 'Đã gửi',
            description: 'Hồ sơ đã được gửi. Admin sẽ tiếp nhận, kiểm tra giấy tờ và cập nhật kết quả xét duyệt.',
            progressApplication: 'Đã gửi hồ sơ thành công.',
            progressReview: 'Đang chờ Admin tiếp nhận.',
            progressCenter: 'Đang khóa cho đến khi được duyệt.',
            badgeClass: 'inline-flex rounded-full bg-amber-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-700'
        },
        pending_review: {
            badge: 'Đang xét duyệt',
            description: 'Admin đang xem xét hồ sơ, đối chiếu giấy tờ và đánh giá điều kiện mở shop.',
            progressApplication: 'Hồ sơ đã được tiếp nhận.',
            progressReview: 'Admin đang xem xét.',
            progressCenter: 'Đang khóa cho đến khi được duyệt.',
            badgeClass: 'inline-flex rounded-full bg-blue-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700'
        },
        need_more_information: {
            badge: 'Cần bổ sung',
            description: 'Admin đã yêu cầu bổ sung thông tin hoặc giấy tờ. Bạn cập nhật lại hồ sơ rồi gửi lại để tiếp tục xét duyệt.',
            progressApplication: 'Cần gửi bổ sung hồ sơ.',
            progressReview: 'Admin đang chờ bổ sung.',
            progressCenter: 'Chưa có quyền truy cập.',
            badgeClass: 'inline-flex rounded-full bg-orange-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-700'
        },
        approved: {
            badge: 'Đã duyệt',
            description: 'Hồ sơ đã được duyệt. Bạn đã có quyền vào Seller Center và vận hành shop trên sàn.',
            progressApplication: 'Hồ sơ đã hoàn tất.',
            progressReview: 'Admin đã duyệt.',
            progressCenter: 'Đã mở quyền Seller Center.',
            badgeClass: 'inline-flex rounded-full bg-green-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-green-700'
        },
        rejected: {
            badge: 'Bị từ chối',
            description: 'Hồ sơ đã bị từ chối. Bạn xem ghi chú từ Admin, cập nhật thông tin nếu cần và gửi lại từ đầu.',
            progressApplication: 'Hồ sơ cần chỉnh sửa để gửi lại.',
            progressReview: 'Admin đã từ chối hồ sơ hiện tại.',
            progressCenter: 'Chưa có quyền truy cập.',
            badgeClass: 'inline-flex rounded-full bg-red-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-red-700'
        },
        suspended: {
            badge: 'Tạm khóa',
            description: 'Shop hoặc tài khoản đang bị tạm khóa. Bạn cần làm việc với Admin để biết lý do và hướng xử lý tiếp theo.',
            progressApplication: 'Hồ sơ đã bị tạm khóa.',
            progressReview: 'Admin đã áp dụng biện pháp tạm khóa.',
            progressCenter: 'Seller Center đang bị khóa.',
            badgeClass: 'inline-flex rounded-full bg-red-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-red-700'
        },
        permanently_banned: {
            badge: 'Cấm vĩnh viễn',
            description: 'Tài khoản hoặc shop đã bị cấm vĩnh viễn do vi phạm nghiêm trọng. Hệ thống sẽ lưu lịch sử để phục vụ đối chiếu khi cần.',
            progressApplication: 'Hồ sơ đã bị cấm vĩnh viễn.',
            progressReview: 'Admin đã kết luận vi phạm nghiêm trọng.',
            progressCenter: 'Không còn quyền truy cập Seller Center.',
            badgeClass: 'inline-flex rounded-full bg-red-200 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-red-800'
        }
    };

    const documentTypeLabels = {
        identity_document: 'Giấy tờ định danh',
        business_license: 'Giấy phép kinh doanh',
        tax_code: 'Mã số thuế',
        brand_authorization: 'Ủy quyền thương hiệu',
        source_of_goods: 'Nguồn gốc hàng hóa',
        quality_commitment: 'Cam kết chất lượng',
        operating_license: 'Giấy phép hoạt động',
        other: 'Tài liệu khác'
    };

    const applicationTypeLabels = {
        standard: 'Shop thường',
        petmall: 'PetMall / Thương hiệu'
    };

    const verificationLabels = {
        standard: 'Shop thường',
        verified_seller: 'Verified Seller',
        official_brand: 'Official Brand',
        petmall: 'PetMall'
    };

    const state = {
        user: null,
        application: null,
        documents: [],
        shop: null,
        sellerAccess: null
    };

    const form = document.getElementById('sellerApplicationForm');
    const alertBox = document.getElementById('applicationAlert');
    const toastBox = document.getElementById('applicationToast');
    const documentFileInput = document.getElementById('documentFileInput');
    const documentTypeSelect = document.getElementById('documentTypeSelect');
    const documentsList = document.getElementById('documentsList');
    const documentSummaryList = document.getElementById('documentSummaryList');
    const saveDraftButton = document.getElementById('saveDraftButton');
    const submitApplicationButton = document.getElementById('submitApplicationButton');
    const goToSellerCenterButton = document.getElementById('goToSellerCenterButton');

    function showAlert(message) {
        alertBox.textContent = message;
        alertBox.classList.remove('hidden');
        toastBox.classList.add('hidden');
    }

    function showToast(message) {
        toastBox.textContent = message;
        toastBox.classList.remove('hidden');
        alertBox.classList.add('hidden');
        window.clearTimeout(showToast._timer);
        showToast._timer = window.setTimeout(() => {
            toastBox.classList.add('hidden');
        }, 3500);
    }

    function clearMessages() {
        alertBox.classList.add('hidden');
        toastBox.classList.add('hidden');
    }

    function getStatusMeta(status) {
        return statusMeta[status] || statusMeta.none;
    }

    function getCurrentStatus() {
        return state.application?.status || state.sellerAccess?.status || 'none';
    }

    function syncStoredAuth(payload) {
        if (!payload) return;

        if (payload.user) {
            state.user = payload.user;
            localStorage.setItem('user', JSON.stringify(payload.user));
            if (payload.user.role) {
                localStorage.setItem('role', payload.user.role);
            }
        }

        if (payload.shop) {
            state.shop = payload.shop;
            localStorage.setItem('shop', JSON.stringify(payload.shop));
        } else {
            state.shop = null;
            localStorage.removeItem('shop');
        }

        if (payload.application) {
            state.application = payload.application;
            localStorage.setItem('sellerApplication', JSON.stringify(payload.application));
        } else {
            state.application = null;
            localStorage.removeItem('sellerApplication');
        }

        if (payload.sellerAccess) {
            state.sellerAccess = payload.sellerAccess;
            localStorage.setItem('sellerAccess', JSON.stringify(payload.sellerAccess));
        } else {
            state.sellerAccess = null;
            localStorage.removeItem('sellerAccess');
        }

        if (window.authManager && typeof window.authManager.checkAuthStatus === 'function') {
            window.authManager.checkAuthStatus();
        }
    }

    function joinedAddress(address = {}) {
        return [
            address.street,
            address.ward,
            address.district,
            address.city
        ].filter(Boolean).join(', ');
    }

    function readApplicationPayload() {
        const applicationType = form.querySelector('input[name="applicationType"]:checked')?.value || 'standard';
        const shopAddress = {
            street: document.getElementById('shopStreet').value.trim(),
            ward: document.getElementById('shopWard').value.trim(),
            district: document.getElementById('shopDistrict').value.trim(),
            city: document.getElementById('shopCity').value.trim()
        };

        return {
            applicationType,
            representativeName: document.getElementById('representativeName').value.trim(),
            representativePhone: document.getElementById('representativePhone').value.trim(),
            representativeEmail: document.getElementById('representativeEmail').value.trim(),
            identityNumber: document.getElementById('identityNumber').value.trim(),
            proposedShopName: document.getElementById('proposedShopName').value.trim(),
            shopPhone: document.getElementById('shopPhone').value.trim(),
            shopEmail: document.getElementById('shopEmail').value.trim(),
            goodsCategories: document.getElementById('goodsCategories').value
                .split(',')
                .map(item => item.trim())
                .filter(Boolean),
            shopDescription: document.getElementById('shopDescription').value.trim(),
            shopAddress: {
                ...shopAddress,
                fullAddress: joinedAddress(shopAddress)
            },
            legalEntityName: document.getElementById('legalEntityName').value.trim(),
            legalRepresentative: document.getElementById('legalRepresentative').value.trim(),
            taxCode: document.getElementById('taxCode').value.trim(),
            businessLicenseNumber: document.getElementById('businessLicenseNumber').value.trim(),
            operatingLicenseNumber: document.getElementById('operatingLicenseNumber').value.trim(),
            sourceOfGoodsDescription: document.getElementById('sourceOfGoodsDescription').value.trim(),
            qualityCommitment: document.getElementById('qualityCommitment').value.trim(),
            termsAccepted: document.getElementById('termsAccepted').checked,
            legalResponsibilityConfirmed: document.getElementById('legalResponsibilityConfirmed').checked,
            shopDocuments: state.documents.map(document => ({
                type: document.type,
                title: document.title || document.fileName || '',
                fileName: document.fileName || document.originalName || '',
                fileUrl: document.fileUrl,
                mimeType: document.mimeType,
                size: document.size,
                note: document.note || ''
            }))
        };
    }

    function fillForm() {
        const application = state.application || {};
        const user = state.user || JSON.parse(localStorage.getItem('user') || 'null') || {};
        const address = application.shopAddress || {};

        const applicationType = application.applicationType || 'standard';
        const typeInput = form.querySelector(`input[name="applicationType"][value="${applicationType}"]`);
        if (typeInput) {
            typeInput.checked = true;
        }

        document.getElementById('representativeName').value = application.representativeName || user.name || '';
        document.getElementById('representativePhone').value = application.representativePhone || user.phone || '';
        document.getElementById('representativeEmail').value = application.representativeEmail || user.email || '';
        document.getElementById('identityNumber').value = application.identityNumber || '';
        document.getElementById('proposedShopName').value = application.proposedShopName || '';
        document.getElementById('shopPhone').value = application.shopPhone || '';
        document.getElementById('shopEmail').value = application.shopEmail || '';
        document.getElementById('goodsCategories').value = Array.isArray(application.goodsCategories) ? application.goodsCategories.join(', ') : '';
        document.getElementById('shopDescription').value = application.shopDescription || '';
        document.getElementById('shopStreet').value = address.street || '';
        document.getElementById('shopWard').value = address.ward || '';
        document.getElementById('shopDistrict').value = address.district || '';
        document.getElementById('shopCity').value = address.city || '';
        document.getElementById('legalEntityName').value = application.legalEntityName || '';
        document.getElementById('legalRepresentative').value = application.legalRepresentative || '';
        document.getElementById('taxCode').value = application.taxCode || '';
        document.getElementById('businessLicenseNumber').value = application.businessLicenseNumber || '';
        document.getElementById('operatingLicenseNumber').value = application.operatingLicenseNumber || '';
        document.getElementById('sourceOfGoodsDescription').value = application.sourceOfGoodsDescription || '';
        document.getElementById('qualityCommitment').value = application.qualityCommitment || '';
        document.getElementById('termsAccepted').checked = Boolean(application.termsAccepted);
        document.getElementById('legalResponsibilityConfirmed').checked = Boolean(application.legalResponsibilityConfirmed);
    }

    function renderDocuments() {
        if (!state.documents.length) {
            documentsList.innerHTML = '<p class="text-sm text-textSoft">Chưa có giấy tờ nào được tải lên.</p>';
            documentSummaryList.innerHTML = '<p class="text-sm text-textSoft">Chưa có giấy tờ nào.</p>';
            return;
        }

        documentsList.innerHTML = state.documents.map((document, index) => `
            <div class="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 md:flex-row md:items-center md:justify-between">
                <div class="min-w-0">
                    <p class="text-sm font-semibold">${documentTypeLabels[document.type] || 'Tài liệu'}</p>
                    <p class="mt-1 break-all text-sm text-textSoft">${document.title || document.fileName || document.originalName || 'Tài liệu đã tải'}</p>
                    <p class="mt-1 text-xs text-textSoft">${document.mimeType || 'Không rõ định dạng'} • ${Math.max(1, Math.round((document.size || 0) / 1024))} KB</p>
                </div>
                <div class="flex flex-wrap gap-3">
                    <a class="inline-flex min-h-10 items-center justify-center rounded-full border border-line bg-white px-4 text-xs font-bold text-textMain transition hover:border-primary/30 hover:text-primary" href="${document.fileUrl}" target="_blank" rel="noopener noreferrer">Xem tập tin</a>
                    <button class="inline-flex min-h-10 items-center justify-center rounded-full border border-red-200 bg-white px-4 text-xs font-bold text-danger transition hover:bg-red-50" data-remove-document="${index}" type="button">Xóa</button>
                </div>
            </div>
        `).join('');

        const summary = state.documents.reduce((accumulator, document) => {
            const key = document.type || 'other';
            accumulator[key] = (accumulator[key] || 0) + 1;
            return accumulator;
        }, {});

        documentSummaryList.innerHTML = Object.entries(summary).map(([type, count]) => `
            <div class="flex items-center justify-between gap-4 rounded-2xl bg-surface p-4 text-sm">
                <span>${documentTypeLabels[type] || 'Tai lieu khac'}</span>
                <strong>${count}</strong>
            </div>
        `).join('');

        documentsList.querySelectorAll('[data-remove-document]').forEach(button => {
            button.addEventListener('click', () => {
                const index = Number(button.dataset.removeDocument);
                state.documents.splice(index, 1);
                renderDocuments();
            });
        });
    }

    function updateStatusUI() {
        const status = getCurrentStatus();
        const meta = getStatusMeta(status);
        const labels = state.sellerAccess?.labels || state.application?.assignedLabels || state.application?.requestedLabels || [];
        const canAccessSellerCenter = Boolean(state.sellerAccess?.canAccessSellerCenter);
        const editable = ['none', 'draft', 'need_more_information', 'rejected'].includes(status);

        const badge = document.getElementById('applicationStatusBadge');
        badge.className = meta.badgeClass;
        badge.textContent = meta.badge;

        document.getElementById('applicationStatusDescription').textContent = meta.description;
        document.getElementById('progressApplicationText').textContent = meta.progressApplication;
        document.getElementById('progressReviewText').textContent = meta.progressReview;
        document.getElementById('progressCenterText').textContent = meta.progressCenter;
        document.getElementById('applicationTypePreview').textContent = applicationTypeLabels[state.application?.applicationType || 'standard'] || 'Shop thường';
        document.getElementById('applicationLabelPreview').textContent = labels.length
            ? labels.map(label => verificationLabels[label] || label).join(', ')
            : 'Shop thường';
        document.getElementById('applicationVerificationPreview').textContent = verificationLabels[state.sellerAccess?.verificationLevel || state.application?.verificationLevel || 'standard'] || 'Chưa cấp';

        const adminNote = state.application?.adminNote || '';
        document.getElementById('adminNoteBox').hidden = !adminNote;
        document.getElementById('adminNoteText').textContent = adminNote;

        saveDraftButton.hidden = !editable;
        submitApplicationButton.hidden = !editable;
        submitApplicationButton.textContent = ['need_more_information', 'rejected'].includes(status) ? 'Gửi lại hồ sơ' : 'Gửi hồ sơ';

        Array.from(form.elements).forEach(element => {
            if (element.id === 'termsAccepted' || element.id === 'legalResponsibilityConfirmed') {
                element.disabled = !editable;
                return;
            }

            if (element.type === 'button' || element.type === 'submit' || element.type === 'file') {
                return;
            }

            element.disabled = !editable;
        });

        document.getElementById('pickDocumentButton').disabled = !editable;

        goToSellerCenterButton.hidden = !canAccessSellerCenter;
    }

    async function loadApplication() {
        try {
            clearMessages();

            const [profileResponse, applicationResponse] = await Promise.all([
                api.getProfile(),
                api.getSellerApplication()
            ]);

            const profileData = profileResponse.data || {};
            const applicationData = applicationResponse.data || {};

            syncStoredAuth({
                user: applicationData.user || profileData.user || JSON.parse(localStorage.getItem('user') || 'null'),
                shop: applicationData.shop || profileData.shop || null,
                application: applicationData.application || profileData.application || null,
                sellerAccess: applicationData.sellerAccess || profileData.sellerAccess || null
            });

            state.documents = Array.isArray(applicationData.documents) ? applicationData.documents.map(document => ({
                ...document,
                fileUrl: document.fileUrl || document.url
            })) : [];

            fillForm();
            renderDocuments();
            updateStatusUI();
        } catch (error) {
            showAlert(error.message || 'Không thể tải hồ sơ mở shop. Vui lòng đăng nhập lại.');
            if (error.status === 401 || error.status === 403) {
                window.setTimeout(() => {
                    window.location.href = '/pages/account/login.html';
                }, 1200);
            }
        }
    }

    async function saveDraft() {
        try {
            clearMessages();
            saveDraftButton.disabled = true;
            const response = await api.saveSellerApplication(readApplicationPayload());
            syncStoredAuth(response.data || {});
            state.documents = Array.isArray((response.data || {}).documents) ? response.data.documents.map(document => ({
                ...document,
                fileUrl: document.fileUrl || document.url
            })) : state.documents;
            fillForm();
            renderDocuments();
            updateStatusUI();
            showToast(response.message || 'Đã lưu nhập hồ sơ mở shop.');
        } catch (error) {
            showAlert(error.message || 'Không thể lưu nhập hồ sơ.');
        } finally {
            saveDraftButton.disabled = false;
        }
    }

    async function submitApplication() {
        try {
            clearMessages();
            submitApplicationButton.disabled = true;
            const payload = readApplicationPayload();
            const status = getCurrentStatus();
            const response = ['need_more_information', 'rejected'].includes(status)
                ? await api.resubmitSellerApplication(payload)
                : await api.submitSellerApplication(payload);

            syncStoredAuth(response.data || {});
            state.documents = Array.isArray((response.data || {}).documents) ? response.data.documents.map(document => ({
                ...document,
                fileUrl: document.fileUrl || document.url
            })) : state.documents;
            fillForm();
            renderDocuments();
            updateStatusUI();
            showToast(response.message || 'Đã gửi hồ sơ mở shop thành công.');
        } catch (error) {
            showAlert(error.message || 'Không thể gửi hồ sơ mở shop.');
        } finally {
            submitApplicationButton.disabled = false;
        }
    }

    async function uploadDocuments(files) {
        if (!files.length) {
            return;
        }

        const selectedType = documentTypeSelect.value || 'other';
        clearMessages();
        document.getElementById('pickDocumentButton').disabled = true;

        try {
            for (const file of files) {
                const response = await api.uploadDocument(file, 'documents');
                const payload = response.data || {};
                state.documents.push({
                    type: selectedType,
                    title: payload.originalName || file.name,
                    fileName: payload.originalName || file.name,
                    fileUrl: payload.url,
                    mimeType: payload.mimeType || file.type,
                    size: payload.size || file.size
                });
            }

            renderDocuments();
            showToast('Đã tải tài liệu lên thành công.');
        } catch (error) {
            showAlert(error.message || 'Tải tài liệu lên thất bại.');
        } finally {
            document.getElementById('pickDocumentButton').disabled = false;
            documentFileInput.value = '';
        }
    }

    function bindEvents() {
        saveDraftButton.addEventListener('click', saveDraft);
        submitApplicationButton.addEventListener('click', submitApplication);
        document.getElementById('pickDocumentButton').addEventListener('click', () => documentFileInput.click());
        documentFileInput.addEventListener('change', () => uploadDocuments(Array.from(documentFileInput.files || [])));
        goToSellerCenterButton.addEventListener('click', () => {
            window.location.href = '/pages/seller/dashboard.html';
        });

        form.querySelectorAll('input[name="applicationType"]').forEach(input => {
            input.addEventListener('change', updateStatusUI);
        });
    }

    function init() {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            window.location.href = '/pages/account/login.html';
            return;
        }

        bindEvents();
        loadApplication();
    }

    init();
})();
