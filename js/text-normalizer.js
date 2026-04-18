(function () {
    const replacements = new Map([
        ['Pet Marketplace - Thức ăn, phụ kiện và dịch vụ thú cưng', 'Pet Marketplace - Thức ăn, phụ kiện và dịch vụ thú cưng'],
        ['Miễn phí vận chuyển cho đơn từ 900.000 ₫', 'Miễn phí vận chuyển cho đơn từ 900.000 ₫'],
        ['Tìm cửa hàng', 'Tìm cửa hàng'],
        ['Tư vấn trực tuyến cùng chuyên gia thú cưng', 'Tư vấn trực tuyến cùng chuyên gia thú cưng'],
        ['Theo dõi đơn', 'Theo dõi đơn'],
        ['Hỗ trợ', 'Hỗ trợ'],
        ['Tất cả', 'Tất cả'],
        ['Chó', 'Chó'],
        ['Mèo', 'Mèo'],
        ['Cá', 'Cá'],
        ['Thú nhỏ', 'Thú nhỏ'],
        ['Bò sát', 'Bò sát'],
        ['Tìm thức ăn, bánh thưởng, đồ chơi và nhiều hơn...', 'Tìm thức ăn, bánh thưởng, đồ chơi và nhiều hơn...'],
        ['Cửa hàng', 'Cửa hàng'],
        ['Dịch vụ thú y', 'Dịch vụ thú y'],
        ['Đăng nhập', 'Đăng nhập'],
        ['Giỏ hàng', 'Giỏ hàng'],
        ['Mua theo danh mục', 'Mua theo danh mục'],
        ['Thức ăn', 'Thức ăn'],
        ['Bánh thưởng', 'Bánh thưởng'],
        ['Đồ chơi', 'Đồ chơi'],
        ['Phụ kiện', 'Phụ kiện'],
        ['Spa & chăm sóc', 'Spa & chăm sóc'],
        ['Thú y', 'Thú y'],
        ['Ưu đãi', 'Ưu đãi'],
        ['Đăng ký & tiết kiệm', 'Đăng ký & tiết kiệm'],
        ['Ưu đãi có hạn', 'Ưu đãi có hạn'],
        ['đơn từ', 'đơn từ'],
        ['đơn', 'đơn'],
        ['để', 'để'],
        ['đến', 'đến'],
        ['được', 'được'],
        ['đã', 'đã'],
        ['địa chỉ', 'địa chỉ'],
        ['đánh giá', 'đánh giá'],
        ['chờ', 'chờ'],
        ['hệ thống', 'hệ thống'],
        ['với', 'với'],
        ['chịu', 'chịu'],
        ['Mùa mua sắm tiết kiệm', 'Mùa mua sắm tiết kiệm'],
        ['Giảm đến 50% cho nhiều sản phẩm nổi bật. Chăm thú cưng tốt hơn với mức giá dễ chịu hơn.', 'Giảm đến 50% cho nhiều sản phẩm nổi bật. Chăm thú cưng tốt hơn với mức giá dễ chịu hơn.'],
        ['Chó cưng vui vẻ', 'Chó cưng vui vẻ'],
        ['Chất lượng cao cấp', 'Chất lượng cao cấp'],
        ['Thức ăn thú cưng cao cấp', 'Thức ăn thú cưng cao cấp'],
        ['Dinh dưỡng phù hợp cho từng bé cưng, nguyên liệu chọn lọc và hiệu quả rõ ràng.', 'Dinh dưỡng phù hợp cho từng bé cưng, nguyên liệu chọn lọc và hiệu quả rõ ràng.'],
        ['Khám phá ngay', 'Khám phá ngay'],
        ['Tư vấn miễn phí', 'Tư vấn miễn phí'],
        ['Tư vấn thú y miễn phí', 'Tư vấn thú y miễn phí'],
        ['Nhận tư vấn từ chuyên gia để chăm sóc sức khỏe cho thú cưng tốt hơn ngay hôm nay.', 'Nhận tư vấn từ chuyên gia để chăm sóc sức khỏe cho thú cưng tốt hơn ngay hôm nay.'],
        ['Đặt lịch', 'Đặt lịch'],
        ['Mua theo thú cưng', 'Mua theo thú cưng'],
        ['Xem tất cả', 'Xem tất cả'],
        ['Có hạn', 'Có hạn'],
        ['Áp dụng cho một số bánh thưởng cho chó', 'Áp dụng cho một số bánh thưởng cho chó'],
        ['Khuyến mãi thức ăn cho mèo', 'Khuyến mãi thức ăn cho mèo'],
        ['Giảm đến 40%', 'Giảm đến 40%'],
        ['Hàng mới về', 'Hàng mới về'],
        ['Đồ chơi và phụ kiện', 'Đồ chơi và phụ kiện'],
        ['Sản phẩm nổi bật', 'Sản phẩm nổi bật'],
        ['Bán chạy', 'Bán chạy'],
        ['Hàng mới', 'Hàng mới'],
        ['Ưu đãi tốt', 'Ưu đãi tốt'],
        ['Đang tải sản phẩm thật từ hệ thống...', 'Đang tải sản phẩm thật từ hệ thống...'],
        ['Shop PetMall nổi bật', 'Shop PetMall nổi bật'],
        ['Những cửa hàng đã được sàn kiểm duyệt kỹ hơn về chất lượng và độ uy tín.', 'Những cửa hàng đã được sàn kiểm duyệt kỹ hơn về chất lượng và độ uy tín.'],
        ['Xem toàn bộ PetMall', 'Xem toàn bộ PetMall'],
        ['Dịch vụ cho thú cưng', 'Dịch vụ cho thú cưng'],
        ['Xem tất cả dịch vụ', 'Xem tất cả dịch vụ'],
        ['Tư vấn và chăm sóc thú y chuyên nghiệp cho thú cưng của bạn', 'Tư vấn và chăm sóc thú y chuyên nghiệp cho thú cưng của bạn'],
        ['Dịch vụ chăm sóc chuyên nghiệp để bé cưng luôn sạch đẹp', 'Dịch vụ chăm sóc chuyên nghiệp để bé cưng luôn sạch đẹp'],
        ['Lưu trú', 'Lưu trú'],
        ['Không gian an toàn và thoải mái cho thú cưng lưu trú', 'Không gian an toàn và thoải mái cho thú cưng lưu trú'],
        ['Huấn luyện', 'Huấn luyện'],
        ['Huấn luyện hành vi và vâng lời cho thú cưng', 'Huấn luyện hành vi và vâng lời cho thú cưng'],
        ['Thương hiệu nổi bật', 'Thương hiệu nổi bật'],
        ['Điểm đến tin cậy cho thức ăn, phụ kiện và dịch vụ thú cưng. Đồng hành cùng niềm vui và sức khỏe của các bé cưng mỗi ngày.', 'Điểm đến tin cậy cho thức ăn, phụ kiện và dịch vụ thú cưng. Đồng hành cùng niềm vui và sức khỏe của các bé cưng mỗi ngày.'],
        ['Dịch vụ', 'Dịch vụ'],
        ['Liên kết nhanh', 'Liên kết nhanh'],
        ['Liên hệ', 'Liên hệ'],
        ['Về chúng tôi', 'Về chúng tôi'],
        ['Điều khoản sử dụng', 'Điều khoản sử dụng'],
        ['Chính sách bảo mật', 'Chính sách bảo mật'],
        ['Bảo lưu mọi quyền.', 'Bảo lưu mọi quyền.'],
        ['Hỗ trợ truy cập', 'Hỗ trợ truy cập'],
        ['Tạm tính', 'Tạm tính'],
        ['Phí vận chuyển sẽ được tính ở bước thanh toán', 'Phí vận chuyển sẽ được tính ở bước thanh toán'],
        ['Tiếp tục mua sắm', 'Tiếp tục mua sắm'],
        ['Tài khoản của tôi', 'Tài khoản của tôi'],
        ['Khách', 'Khách'],
        ['Hồ sơ của tôi', 'Hồ sơ của tôi'],
        ['Đơn hàng của tôi', 'Đơn hàng của tôi'],
        ['Địa chỉ', 'Địa chỉ'],
        ['Đăng xuất', 'Đăng xuất'],
        ['Chỉnh sửa', 'Chỉnh sửa'],
        ['Họ và tên', 'Họ và tên'],
        ['Số điện thoại', 'Số điện thoại'],
        ['Lưu thay đổi', 'Lưu thay đổi'],
        ['Hủy', 'Hủy'],
        ['Tham gia từ', 'Tham gia từ'],
        ['Người dùng', 'Người dùng'],
        ['Đã cập nhật hồ sơ!', 'Đã cập nhật hồ sơ!'],
        ['Thanh toán', 'Thanh toán'],
        ['Thanh toán an toàn', 'Thanh toán an toàn'],
        ['Địa chỉ giao hàng', 'Địa chỉ giao hàng'],
        ['Tên', 'Tên'],
        ['Họ', 'Họ'],
        ['Địa chỉ đường', 'Địa chỉ đường'],
        ['Thành phố', 'Thành phố'],
        ['Tỉnh / Bang', 'Tỉnh / Bang'],
        ['Mã bưu chính', 'Mã bưu chính'],
        ['Quốc gia', 'Quốc gia'],
        ['Phương thức thanh toán', 'Phương thức thanh toán'],
        ['Thanh toán khi nhận hàng', 'Thanh toán khi nhận hàng'],
        ['Thanh toán khi nhận đơn hàng', 'Thanh toán khi nhận đơn hàng'],
        ['Thanh toán an toàn với VNPay', 'Thanh toán an toàn với VNPay'],
        ['Tóm tắt đơn hàng', 'Tóm tắt đơn hàng'],
        ['Phí vận chuyển', 'Phí vận chuyển'],
        ['Tổng cộng', 'Tổng cộng'],
        ['Đặt hàng', 'Đặt hàng'],
        ['Mã hóa SSL 256-bit an toàn', 'Mã hóa SSL 256-bit an toàn'],
        ['Giỏ hàng của bạn đang trống', 'Giỏ hàng của bạn đang trống'],
        ['Có vẻ bạn chưa thêm sản phẩm nào vào giỏ hàng.', 'Có vẻ bạn chưa thêm sản phẩm nào vào giỏ hàng.'],
        ['Quay về trang chủ', 'Quay về trang chủ'],
        ['Giỏ hàng (${items.length} sản phẩm)', 'Giỏ hàng (${items.length} sản phẩm)'],
        ['Đơn giá:', 'Đơn giá:'],
        ['Xóa', 'Xóa'],
        ['Xóa toàn bộ giỏ hàng', 'Xóa toàn bộ giỏ hàng'],
        ['Mua thêm', 'Mua thêm'],
        ['để được miễn phí vận chuyển!', 'để được miễn phí vận chuyển!'],
        ['Bạn có mã giảm giá?', 'Bạn có mã giảm giá?'],
        ['Nhập mã giảm giá', 'Nhập mã giảm giá'],
        ['Áp dụng', 'Áp dụng'],
        ['Bạn có chắc muốn xóa toàn bộ giỏ hàng không?', 'Bạn có chắc muốn xóa toàn bộ giỏ hàng không?'],
        ['Tính năng mã giảm giá sẽ sớm được cập nhật!', 'Tính năng mã giảm giá sẽ sớm được cập nhật!'],
        ['Chờ xử lý', 'Chờ xử lý'],
        ['Đã xác nhận', 'Đã xác nhận'],
        ['Đang giao', 'Đang giao'],
        ['Chưa có đơn hàng nào', 'Chưa có đơn hàng nào'],
        ['Hãy bắt đầu mua sắm để xem đơn hàng của bạn tại đây', 'Hãy bắt đầu mua sắm để xem đơn hàng của bạn tại đây'],
        ['Đơn #', 'Đơn #'],
        ['Số lượng:', 'Số lượng:'],
        ['Tổng:', 'Tổng:'],
        ['Không thể tải đơn hàng', 'Không thể tải đơn hàng'],
        ['Bạn có chắc muốn hủy đơn hàng này không?', 'Bạn có chắc muốn hủy đơn hàng này không?'],
        ['Đơn hàng đã được hủy', 'Đơn hàng đã được hủy'],
        ['${reviews} đánh giá', '${reviews} đánh giá'],
        ['Chưa có mô tả chi tiết.', 'Chưa có mô tả chi tiết.'],
        ['Tồn kho:', 'Tồn kho:'],
        ['sản phẩm', 'sản phẩm'],
        ['Hết hàng', 'Hết hàng'],
        ['Thương hiệu:', 'Thương hiệu:'],
        ['Chưa có', 'Chưa có'],
        ['Danh mục:', 'Danh mục:'],
        ['Loại thú cưng:', 'Loại thú cưng:'],
        ['Người bán:', 'Người bán:'],
        ['Thêm vào giỏ', 'Thêm vào giỏ'],
        ['Đánh giá', 'Đánh giá'],
        ['Đang tải đánh giá...', 'Đang tải đánh giá...'],
        ['Chưa có sản phẩm liên quan.', 'Chưa có sản phẩm liên quan.'],
        ['Không thể tải sản phẩm', 'Không thể tải sản phẩm'],
        ['Chưa có đánh giá đã duyệt.', 'Chưa có đánh giá đã duyệt.'],
        ['từ ${stats.total || reviews.length} đánh giá', 'từ ${stats.total || reviews.length} đánh giá'],
        ['Người mua', 'Người mua'],
        ['Hiện chưa tải được đánh giá.', 'Hiện chưa tải được đánh giá.'],
        ['Đã thêm vào giỏ hàng!', 'Đã thêm vào giỏ hàng!'],
        ['Mới nhất', 'Mới nhất'],
        ['Giá: thấp đến cao', 'Giá: thấp đến cao'],
        ['Giá: cao đến thấp', 'Giá: cao đến thấp'],
        ['Đánh giá cao', 'Đánh giá cao'],
        ['Giảm nhiều nhất', 'Giảm nhiều nhất'],
        ['Danh mục', 'Danh mục'],
        ['Tất cả danh mục', 'Tất cả danh mục'],
        ['Khoảng giá', 'Khoảng giá'],
        ['Từ', 'Từ'],
        ['Đến', 'Đến'],
        ['Lọc', 'Lọc'],
        ['Loại thú cưng', 'Loại thú cưng'],
        ['Tất cả thú cưng', 'Tất cả thú cưng'],
        ['Thương hiệu', 'Thương hiệu'],
        ['Tất cả thương hiệu', 'Tất cả thương hiệu'],
        ['Tình trạng', 'Tình trạng'],
        ['Chỉ hiển thị còn hàng', 'Chỉ hiển thị còn hàng'],
        ['Đang giảm giá', 'Đang giảm giá'],
        ['Tất cả mức đánh giá', 'Tất cả mức đánh giá'],
        ['Từ 4 sao trở lên', 'Từ 4 sao trở lên'],
        ['Từ 3 sao trở lên', 'Từ 3 sao trở lên'],
        ['Từ 2 sao trở lên', 'Từ 2 sao trở lên'],
        ['Không thể tải danh mục:', 'Không thể tải danh mục:'],
        ['Không tìm thấy sản phẩm nào', 'Không tìm thấy sản phẩm nào'],
        ['Không thể tải danh sách sản phẩm', 'Không thể tải danh sách sản phẩm'],
        ['Cửa hàng thú cưng', 'Cửa hàng thú cưng'],
        ['Hoàn tất hồ sơ, tải giấy tờ và gửi cho Admin xét duyệt. Chỉ khi được phê duyệt, tài khoản mới có thể vào Seller Center và vận hành shop.', 'Hoàn tất hồ sơ, tải giấy tờ và gửi cho Admin xét duyệt. Chỉ khi được phê duyệt, tài khoản mới có thể vào Seller Center và vận hành shop.']
    ]);

    let isApplying = false;

    function normalizeText(value) {
        let output = value;
        for (const [from, to] of replacements.entries()) {
            output = output.split(from).join(to);
        }
        return output;
    }

    function normalizeNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const normalized = normalizeText(node.nodeValue || '');
            if (normalized !== node.nodeValue) {
                node.nodeValue = normalized;
            }
            return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return;

        ['placeholder', 'title', 'alt', 'aria-label', 'value'].forEach(attr => {
            const current = node.getAttribute?.(attr);
            if (!current) return;
            const normalized = normalizeText(current);
            if (normalized !== current) {
                node.setAttribute(attr, normalized);
            }
        });

        for (const child of node.childNodes) {
            normalizeNode(child);
        }
    }

    function applyNormalization(root = document.body) {
        if (!root || isApplying) return;
        isApplying = true;
        try {
            normalizeNode(root);
            document.title = normalizeText(document.title);
        } finally {
            isApplying = false;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        applyNormalization();

        const observer = new MutationObserver(mutations => {
            if (isApplying) return;
            for (const mutation of mutations) {
                mutation.addedNodes.forEach(node => normalizeNode(node));
                if (mutation.type === 'characterData' && mutation.target) {
                    normalizeNode(mutation.target);
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    });
})();
