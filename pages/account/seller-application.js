(function() {
    const statusMeta = {
        none: {
            badge: 'Chua tao',
            description: 'Hoan tat ho so, tai giay to va gui cho Admin xet duyet. Chi khi duoc phe duyet, tai khoan moi co the vao Seller Center va van hanh shop.',
            progressApplication: 'Chua gui ho so.',
            progressReview: 'Chua tiep nhan.',
            progressCenter: 'Chua co quyen truy cap.',
            badgeClass: 'inline-flex rounded-full bg-surfaceMuted px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'
        },
        draft: {
            badge: 'Ban nhap',
            description: 'Ho so dang o trang thai ban nhap. Ban co the cap nhat thong tin, tai giay to va gui cho Admin bat cu luc nao.',
            progressApplication: 'Dang luu ban nhap.',
            progressReview: 'Admin chua tiep nhan.',
            progressCenter: 'Chua co quyen truy cap.',
            badgeClass: 'inline-flex rounded-full bg-surfaceMuted px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'
        },
        submitted: {
            badge: 'Da gui',
            description: 'Ho so da duoc gui. Admin se tiep nhan, kiem tra giay to va cap nhat ket qua xet duyet.',
            progressApplication: 'Da gui ho so thanh cong.',
            progressReview: 'Dang cho Admin tiep nhan.',
            progressCenter: 'Dang khoa cho den khi duoc duyet.',
            badgeClass: 'inline-flex rounded-full bg-amber-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-700'
        },
        pending_review: {
            badge: 'Dang xet duyet',
            description: 'Admin dang xem xet ho so, doi chieu giay to va danh gia dieu kien mo shop.',
            progressApplication: 'Ho so da duoc tiep nhan.',
            progressReview: 'Admin dang xem xet.',
            progressCenter: 'Dang khoa cho den khi duoc duyet.',
            badgeClass: 'inline-flex rounded-full bg-blue-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700'
        },
        need_more_information: {
            badge: 'Can bo sung',
            description: 'Admin da yeu cau bo sung thong tin hoac giay to. Ban cap nhat lai ho so roi gui lai de tiep tuc xet duyet.',
            progressApplication: 'Can gui bo sung ho so.',
            progressReview: 'Admin dang cho bo sung.',
            progressCenter: 'Chua co quyen truy cap.',
            badgeClass: 'inline-flex rounded-full bg-orange-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-700'
        },
        approved: {
            badge: 'Da duyet',
            description: 'Ho so da duoc phe duyet. Ban da co quyen vao Seller Center va van hanh shop tren san.',
            progressApplication: 'Ho so da hoan tat.',
            progressReview: 'Admin da phe duyet.',
            progressCenter: 'Da mo quyen Seller Center.',
            badgeClass: 'inline-flex rounded-full bg-green-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-green-700'
        },
        rejected: {
            badge: 'Bi tu choi',
            description: 'Ho so da bi tu choi. Ban xem ghi chu tu Admin, cap nhat thong tin neu can va gui lai tu dau.',
            progressApplication: 'Ho so can chinh sua de gui lai.',
            progressReview: 'Admin da tu choi ho so hien tai.',
            progressCenter: 'Chua co quyen truy cap.',
            badgeClass: 'inline-flex rounded-full bg-red-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-red-700'
        },
        suspended: {
            badge: 'Tam khoa',
            description: 'Shop hoac tai khoan dang bi tam khoa. Ban can lam viec voi Admin de biet ly do va huong xu ly tiep theo.',
            progressApplication: 'Ho so da bi tam khoa.',
            progressReview: 'Admin da ap dung bien phap tam khoa.',
            progressCenter: 'Seller Center dang bi khoa.',
            badgeClass: 'inline-flex rounded-full bg-red-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-red-700'
        },
        permanently_banned: {
            badge: 'Cam vinh vien',
            description: 'Tai khoan hoac shop da bi cam vinh vien do vi pham nghiem trong. He thong se luu lich su de phuc vu doi chieu khi can.',
            progressApplication: 'Ho so da bi cam vinh vien.',
            progressReview: 'Admin da ket luan vi pham nghiem trong.',
            progressCenter: 'Khong con quyen truy cap Seller Center.',
            badgeClass: 'inline-flex rounded-full bg-red-200 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-red-800'
        }
    };

    const documentTypeLabels = {
        identity_document: 'Giay to dinh danh',
        business_license: 'Giay phep kinh doanh',
        tax_code: 'Ma so thue',
        brand_authorization: 'Uy quyen thuong hieu',
        source_of_goods: 'Nguon goc hang hoa',
        quality_commitment: 'Cam ket chat luong',
        operating_license: 'Giay phep hoat dong',
        other: 'Tai lieu khac'
    };

    const applicationTypeLabels = {
        standard: 'Shop thuong',
        petmall: 'PetMall / Thuong hieu'
    };

    const verificationLabels = {
        standard: 'Shop thuong',
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
            documentsList.innerHTML = '<p class="text-sm text-textSoft">Chua co giay to nao duoc tai len.</p>';
            documentSummaryList.innerHTML = '<p class="text-sm text-textSoft">Chua co giay to nao.</p>';
            return;
        }

        documentsList.innerHTML = state.documents.map((document, index) => `
            <div class="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 md:flex-row md:items-center md:justify-between">
                <div class="min-w-0">
                    <p class="text-sm font-semibold">${documentTypeLabels[document.type] || 'Tai lieu'}</p>
                    <p class="mt-1 break-all text-sm text-textSoft">${document.title || document.fileName || document.originalName || 'Tai lieu da tai'}</p>
                    <p class="mt-1 text-xs text-textSoft">${document.mimeType || 'Khong ro dinh dang'} • ${Math.max(1, Math.round((document.size || 0) / 1024))} KB</p>
                </div>
                <div class="flex flex-wrap gap-3">
                    <a class="inline-flex min-h-10 items-center justify-center rounded-full border border-line bg-white px-4 text-xs font-bold text-textMain transition hover:border-primary/30 hover:text-primary" href="${document.fileUrl}" target="_blank" rel="noopener noreferrer">Xem tep</a>
                    <button class="inline-flex min-h-10 items-center justify-center rounded-full border border-red-200 bg-white px-4 text-xs font-bold text-danger transition hover:bg-red-50" data-remove-document="${index}" type="button">Xoa</button>
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
        document.getElementById('applicationTypePreview').textContent = applicationTypeLabels[state.application?.applicationType || 'standard'] || 'Shop thuong';
        document.getElementById('applicationLabelPreview').textContent = labels.length
            ? labels.map(label => verificationLabels[label] || label).join(', ')
            : 'Shop thuong';
        document.getElementById('applicationVerificationPreview').textContent = verificationLabels[state.sellerAccess?.verificationLevel || state.application?.verificationLevel || 'standard'] || 'Chua cap';

        const adminNote = state.application?.adminNote || '';
        document.getElementById('adminNoteBox').hidden = !adminNote;
        document.getElementById('adminNoteText').textContent = adminNote;

        saveDraftButton.hidden = !editable;
        submitApplicationButton.hidden = !editable;
        submitApplicationButton.textContent = ['need_more_information', 'rejected'].includes(status) ? 'Gui lai ho so' : 'Gui ho so';

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
            showAlert(error.message || 'Khong the tai ho so mo shop. Vui long dang nhap lai.');
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
            showToast(response.message || 'Da luu nhap ho so mo shop.');
        } catch (error) {
            showAlert(error.message || 'Khong the luu nhap ho so.');
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
            showToast(response.message || 'Da gui ho so mo shop thanh cong.');
        } catch (error) {
            showAlert(error.message || 'Khong the gui ho so mo shop.');
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
            showToast('Da tai tai lieu len thanh cong.');
        } catch (error) {
            showAlert(error.message || 'Tai tai lieu len that bai.');
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
