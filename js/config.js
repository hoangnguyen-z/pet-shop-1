(function(global) {
    global.APP_CONFIG = global.APP_CONFIG || {
        // Để trống nếu frontend và backend chạy cùng máy/cùng domain.
        // Nếu người khác chỉ mở frontend để dùng dữ liệu của chủ dự án,
        // hãy dán địa chỉ backend của chủ dự án vào đây.
        // Ví dụ:
        // API_BASE_URL: 'https://ten-backend-cua-ban/api'
        API_BASE_URL: ''
    };

    const current = global.APP_CONFIG;
    const configured = typeof current.API_BASE_URL === 'string' ? current.API_BASE_URL.trim() : '';
    const fallback = `${global.location.origin}/api`;

    global.APP_CONFIG = {
        ...current,
        API_BASE_URL: (configured || fallback).replace(/\/+$/, '')
    };

    global.getPetShopApiBaseUrl = function() {
        return global.APP_CONFIG.API_BASE_URL;
    };
})(window);
