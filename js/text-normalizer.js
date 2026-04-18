(function () {
    const replacements = new Map([
        ['Pet Marketplace - Thá»©c Äƒn, phá»¥ kiá»‡n vĂ  dá»‹ch vá»¥ thĂº cÆ°ng', 'Pet Marketplace - Thức ăn, phụ kiện và dịch vụ thú cưng'],
        ['Miá»…n phĂ­ váº­n chuyá»ƒn cho Ä‘Æ¡n tá»« 900.000 ₫', 'Miễn phí vận chuyển cho đơn từ 900.000 ₫'],
        ['TĂ¬m cá»­a hĂ ng', 'Tìm cửa hàng'],
        ['TÆ° váº¥n trá»±c tuyáº¿n cĂ¹ng chuyĂªn gia thĂº cÆ°ng', 'Tư vấn trực tuyến cùng chuyên gia thú cưng'],
        ['Theo dĂµi Ä‘Æ¡n', 'Theo dõi đơn'],
        ['Há»— trá»£', 'Hỗ trợ'],
        ['Táº¥t cáº£', 'Tất cả'],
        ['ChĂ³', 'Chó'],
        ['MĂ¨o', 'Mèo'],
        ['CĂ¡', 'Cá'],
        ['ThĂº nhá»', 'Thú nhỏ'],
        ['BĂ² sĂ¡t', 'Bò sát'],
        ['TĂ¬m thá»©c Äƒn, bĂ¡nh thÆ°á»Ÿng, Ä‘á»“ chÆ¡i vĂ  nhiá»u hÆ¡n...', 'Tìm thức ăn, bánh thưởng, đồ chơi và nhiều hơn...'],
        ['Cá»­a hĂ ng', 'Cửa hàng'],
        ['Dá»‹ch vá»¥ thĂº y', 'Dịch vụ thú y'],
        ['ÄÄƒng nháº­p', 'Đăng nhập'],
        ['Giá» hĂ ng', 'Giỏ hàng'],
        ['Mua theo danh má»¥c', 'Mua theo danh mục'],
        ['Thá»©c Äƒn', 'Thức ăn'],
        ['BĂ¡nh thÆ°á»Ÿng', 'Bánh thưởng'],
        ['Äá»“ chÆ¡i', 'Đồ chơi'],
        ['Phá»¥ kiá»‡n', 'Phụ kiện'],
        ['Spa & chÄƒm sĂ³c', 'Spa & chăm sóc'],
        ['ThĂº y', 'Thú y'],
        ['Æ¯u Ä‘Ă£i', 'Ưu đãi'],
        ['ÄÄƒng kĂ½ & tiáº¿t kiá»‡m', 'Đăng ký & tiết kiệm'],
        ['Æ¯u Ä‘Ă£i cĂ³ háº¡n', 'Ưu đãi có hạn'],
        ['Ä‘Æ¡n tá»«', 'đơn từ'],
        ['Ä‘Æ¡n', 'đơn'],
        ['Ä‘á»ƒ', 'để'],
        ['Ä‘áº¿n', 'đến'],
        ['Ä‘Æ°á»£c', 'được'],
        ['Ä‘Ă£', 'đã'],
        ['Ä‘á»‹a chá»‰', 'địa chỉ'],
        ['Ä‘Ă¡nh giĂ¡', 'đánh giá'],
        ['chá»', 'chờ'],
        ['há»‡ thá»‘ng', 'hệ thống'],
        ['vá»›i', 'với'],
        ['chá»‹u', 'chịu'],
        ['MĂ¹a mua sáº¯m tiáº¿t kiá»‡m', 'Mùa mua sắm tiết kiệm'],
        ['Giáº£m Ä‘áº¿n 50% cho nhiá»u sáº£n pháº©m ná»•i báº­t. ChÄƒm thĂº cÆ°ng tá»‘t hÆ¡n vá»›i má»©c giĂ¡ dá»… chá»‹u hÆ¡n.', 'Giảm đến 50% cho nhiều sản phẩm nổi bật. Chăm thú cưng tốt hơn với mức giá dễ chịu hơn.'],
        ['ChĂ³ cÆ°ng vui váº»', 'Chó cưng vui vẻ'],
        ['Cháº¥t lÆ°á»£ng cao cáº¥p', 'Chất lượng cao cấp'],
        ['Thá»©c Äƒn thĂº cÆ°ng cao cáº¥p', 'Thức ăn thú cưng cao cấp'],
        ['Dinh dÆ°á»¡ng phĂ¹ há»£p cho tá»«ng bĂ© cÆ°ng, nguyĂªn liá»‡u chá»n lá»c vĂ  hiá»‡u quáº£ rĂµ rĂ ng.', 'Dinh dưỡng phù hợp cho từng bé cưng, nguyên liệu chọn lọc và hiệu quả rõ ràng.'],
        ['KhĂ¡m phĂ¡ ngay', 'Khám phá ngay'],
        ['TÆ° váº¥n miá»…n phĂ­', 'Tư vấn miễn phí'],
        ['TÆ° váº¥n thĂº y miá»…n phĂ­', 'Tư vấn thú y miễn phí'],
        ['Nháº­n tÆ° váº¥n tá»« chuyĂªn gia Ä‘á»ƒ chÄƒm sĂ³c sá»©c khá»e cho thĂº cÆ°ng tá»‘t hÆ¡n ngay hĂ´m nay.', 'Nhận tư vấn từ chuyên gia để chăm sóc sức khỏe cho thú cưng tốt hơn ngay hôm nay.'],
        ['Äáº·t lá»‹ch', 'Đặt lịch'],
        ['Mua theo thĂº cÆ°ng', 'Mua theo thú cưng'],
        ['Xem táº¥t cáº£', 'Xem tất cả'],
        ['CĂ³ háº¡n', 'Có hạn'],
        ['Ăp dá»¥ng cho má»™t sá»‘ bĂ¡nh thÆ°á»Ÿng cho chĂ³', 'Áp dụng cho một số bánh thưởng cho chó'],
        ['Khuyáº¿n mĂ£i thá»©c Äƒn cho mĂ¨o', 'Khuyến mãi thức ăn cho mèo'],
        ['Giáº£m Ä‘áº¿n 40%', 'Giảm đến 40%'],
        ['HĂ ng má»›i vá»', 'Hàng mới về'],
        ['Äá»“ chÆ¡i vĂ  phá»¥ kiá»‡n', 'Đồ chơi và phụ kiện'],
        ['Sáº£n pháº©m ná»•i báº­t', 'Sản phẩm nổi bật'],
        ['BĂ¡n cháº¡y', 'Bán chạy'],
        ['HĂ ng má»›i', 'Hàng mới'],
        ['Æ¯u Ä‘Ă£i tá»‘t', 'Ưu đãi tốt'],
        ['Äang táº£i sáº£n pháº©m tháº­t tá»« há»‡ thá»‘ng...', 'Đang tải sản phẩm thật từ hệ thống...'],
        ['Shop PetMall ná»•i báº­t', 'Shop PetMall nổi bật'],
        ['Nhá»¯ng cá»­a hĂ ng Ä‘Ă£ Ä‘Æ°á»£c sĂ n kiá»ƒm duyá»‡t ká»¹ hÆ¡n vá» cháº¥t lÆ°á»£ng vĂ  Ä‘á»™ uy tĂ­n.', 'Những cửa hàng đã được sàn kiểm duyệt kỹ hơn về chất lượng và độ uy tín.'],
        ['Xem toĂ n bá»™ PetMall', 'Xem toàn bộ PetMall'],
        ['Dá»‹ch vá»¥ cho thĂº cÆ°ng', 'Dịch vụ cho thú cưng'],
        ['Xem táº¥t cáº£ dá»‹ch vá»¥', 'Xem tất cả dịch vụ'],
        ['TÆ° váº¥n vĂ  chÄƒm sĂ³c thĂº y chuyĂªn nghiá»‡p cho thĂº cÆ°ng cá»§a báº¡n', 'Tư vấn và chăm sóc thú y chuyên nghiệp cho thú cưng của bạn'],
        ['Dá»‹ch vá»¥ chÄƒm sĂ³c chuyĂªn nghiá»‡p Ä‘á»ƒ bĂ© cÆ°ng luĂ´n sáº¡ch Ä‘áº¹p', 'Dịch vụ chăm sóc chuyên nghiệp để bé cưng luôn sạch đẹp'],
        ['LÆ°u trĂº', 'Lưu trú'],
        ['KhĂ´ng gian an toĂ n vĂ  thoáº£i mĂ¡i cho thĂº cÆ°ng lÆ°u trĂº', 'Không gian an toàn và thoải mái cho thú cưng lưu trú'],
        ['Huáº¥n luyá»‡n', 'Huấn luyện'],
        ['Huáº¥n luyá»‡n hĂ nh vi vĂ  vĂ¢ng lá»i cho thĂº cÆ°ng', 'Huấn luyện hành vi và vâng lời cho thú cưng'],
        ['ThÆ°Æ¡ng hiá»‡u ná»•i báº­t', 'Thương hiệu nổi bật'],
        ['Äiá»ƒm Ä‘áº¿n tin cáº­y cho thá»©c Äƒn, phá»¥ kiá»‡n vĂ  dá»‹ch vá»¥ thĂº cÆ°ng. Äá»“ng hĂ nh cĂ¹ng niá»m vui vĂ  sá»©c khá»e cá»§a cĂ¡c bĂ© cÆ°ng má»—i ngĂ y.', 'Điểm đến tin cậy cho thức ăn, phụ kiện và dịch vụ thú cưng. Đồng hành cùng niềm vui và sức khỏe của các bé cưng mỗi ngày.'],
        ['Dá»‹ch vá»¥', 'Dịch vụ'],
        ['LiĂªn káº¿t nhanh', 'Liên kết nhanh'],
        ['LiĂªn há»‡', 'Liên hệ'],
        ['Vá» chĂºng tĂ´i', 'Về chúng tôi'],
        ['Äiá»u khoáº£n sá»­ dá»¥ng', 'Điều khoản sử dụng'],
        ['ChĂ­nh sĂ¡ch báº£o máº­t', 'Chính sách bảo mật'],
        ['Báº£o lÆ°u má»i quyá»n.', 'Bảo lưu mọi quyền.'],
        ['Há»— trá»£ truy cáº­p', 'Hỗ trợ truy cập'],
        ['Táº¡m tĂ­nh', 'Tạm tính'],
        ['PhĂ­ váº­n chuyá»ƒn sáº½ Ä‘Æ°á»£c tĂ­nh á»Ÿ bÆ°á»›c thanh toĂ¡n', 'Phí vận chuyển sẽ được tính ở bước thanh toán'],
        ['Tiáº¿p tá»¥c mua sáº¯m', 'Tiếp tục mua sắm'],
        ['TĂ i khoáº£n cá»§a tĂ´i', 'Tài khoản của tôi'],
        ['KhĂ¡ch', 'Khách'],
        ['Há»“ sÆ¡ cá»§a tĂ´i', 'Hồ sơ của tôi'],
        ['ÄÆ¡n hĂ ng cá»§a tĂ´i', 'Đơn hàng của tôi'],
        ['Äá»‹a chá»‰', 'Địa chỉ'],
        ['ÄÄƒng xuáº¥t', 'Đăng xuất'],
        ['Chá»‰nh sá»­a', 'Chỉnh sửa'],
        ['Há» vĂ  tĂªn', 'Họ và tên'],
        ['Sá»‘ Ä‘iá»‡n thoáº¡i', 'Số điện thoại'],
        ['LÆ°u thay Ä‘á»•i', 'Lưu thay đổi'],
        ['Há»§y', 'Hủy'],
        ['Tham gia tá»«', 'Tham gia từ'],
        ['NgÆ°á»i dĂ¹ng', 'Người dùng'],
        ['ÄĂ£ cáº­p nháº­t há»“ sÆ¡!', 'Đã cập nhật hồ sơ!'],
        ['Thanh toĂ¡n', 'Thanh toán'],
        ['Thanh toĂ¡n an toĂ n', 'Thanh toán an toàn'],
        ['Äá»‹a chá»‰ giao hĂ ng', 'Địa chỉ giao hàng'],
        ['TĂªn', 'Tên'],
        ['Há»', 'Họ'],
        ['Äá»‹a chá»‰ Ä‘Æ°á»ng', 'Địa chỉ đường'],
        ['ThĂ nh phá»‘', 'Thành phố'],
        ['Tá»‰nh / Bang', 'Tỉnh / Bang'],
        ['MĂ£ bÆ°u chĂ­nh', 'Mã bưu chính'],
        ['Quá»‘c gia', 'Quốc gia'],
        ['PhÆ°Æ¡ng thá»©c thanh toĂ¡n', 'Phương thức thanh toán'],
        ['Thanh toĂ¡n khi nháº­n hĂ ng', 'Thanh toán khi nhận hàng'],
        ['Thanh toĂ¡n khi nháº­n Ä‘Æ¡n hĂ ng', 'Thanh toán khi nhận đơn hàng'],
        ['Thanh toĂ¡n an toĂ n vá»›i VNPay', 'Thanh toán an toàn với VNPay'],
        ['TĂ³m táº¯t Ä‘Æ¡n hĂ ng', 'Tóm tắt đơn hàng'],
        ['PhĂ­ váº­n chuyá»ƒn', 'Phí vận chuyển'],
        ['Tá»•ng cá»™ng', 'Tổng cộng'],
        ['Äáº·t hĂ ng', 'Đặt hàng'],
        ['MĂ£ hĂ³a SSL 256-bit an toĂ n', 'Mã hóa SSL 256-bit an toàn'],
        ['Giá» hĂ ng cá»§a báº¡n Ä‘ang trá»‘ng', 'Giỏ hàng của bạn đang trống'],
        ['Giỏ hàng cá»§a báº¡n Ä‘ang trá»‘ng', 'Giỏ hàng của bạn đang trống'],
        ['CĂ³ váº» báº¡n chÆ°a thĂªm sáº£n pháº©m nĂ o vĂ o giá» hĂ ng.', 'Có vẻ bạn chưa thêm sản phẩm nào vào giỏ hàng.'],
        ['Quay vá» trang chá»§', 'Quay về trang chủ'],
        ['Giá» hĂ ng (${items.length} sáº£n pháº©m)', 'Giỏ hàng (${items.length} sản phẩm)'],
        ['ÄÆ¡n giĂ¡:', 'Đơn giá:'],
        ['XĂ³a', 'Xóa'],
        ['XĂ³a toĂ n bá»™ giá» hĂ ng', 'Xóa toàn bộ giỏ hàng'],
        ['Mua thĂªm', 'Mua thêm'],
        ['Ä‘á»ƒ Ä‘Æ°á»£c miá»…n phĂ­ váº­n chuyá»ƒn!', 'để được miễn phí vận chuyển!'],
        ['Báº¡n cĂ³ mĂ£ giáº£m giĂ¡?', 'Bạn có mã giảm giá?'],
        ['Nháº­p mĂ£ giáº£m giĂ¡', 'Nhập mã giảm giá'],
        ['Ăp dá»¥ng', 'Áp dụng'],
        ['Báº¡n cĂ³ cháº¯c muá»‘n xĂ³a toĂ n bá»™ giá» hĂ ng khĂ´ng?', 'Bạn có chắc muốn xóa toàn bộ giỏ hàng không?'],
        ['TĂ­nh nÄƒng mĂ£ giáº£m giĂ¡ sáº½ sá»›m Ä‘Æ°á»£c cáº­p nháº­t!', 'Tính năng mã giảm giá sẽ sớm được cập nhật!'],
        ['Chá» xá»­ lĂ½', 'Chờ xử lý'],
        ['ÄĂ£ xĂ¡c nháº­n', 'Đã xác nhận'],
        ['Äang giao', 'Đang giao'],
        ['ChÆ°a cĂ³ Ä‘Æ¡n hĂ ng nĂ o', 'Chưa có đơn hàng nào'],
        ['HĂ£y báº¯t Ä‘áº§u mua sáº¯m Ä‘á»ƒ xem Ä‘Æ¡n hĂ ng cá»§a báº¡n táº¡i Ä‘Ă¢y', 'Hãy bắt đầu mua sắm để xem đơn hàng của bạn tại đây'],
        ['ÄÆ¡n #', 'Đơn #'],
        ['Sá»‘ lÆ°á»£ng:', 'Số lượng:'],
        ['Tá»•ng:', 'Tổng:'],
        ['KhĂ´ng thá»ƒ táº£i Ä‘Æ¡n hĂ ng', 'Không thể tải đơn hàng'],
        ['Báº¡n cĂ³ cháº¯c muá»‘n há»§y Ä‘Æ¡n hĂ ng nĂ y khĂ´ng?', 'Bạn có chắc muốn hủy đơn hàng này không?'],
        ['ÄÆ¡n hĂ ng Ä‘Ă£ Ä‘Æ°á»£c há»§y', 'Đơn hàng đã được hủy'],
        ['${reviews} Ä‘Ă¡nh giĂ¡', '${reviews} đánh giá'],
        ['ChÆ°a cĂ³ mĂ´ táº£ chi tiáº¿t.', 'Chưa có mô tả chi tiết.'],
        ['Tá»“n kho:', 'Tồn kho:'],
        ['sáº£n pháº©m', 'sản phẩm'],
        ['Háº¿t hĂ ng', 'Hết hàng'],
        ['ThÆ°Æ¡ng hiá»‡u:', 'Thương hiệu:'],
        ['ChÆ°a cĂ³', 'Chưa có'],
        ['Danh má»¥c:', 'Danh mục:'],
        ['Loáº¡i thĂº cÆ°ng:', 'Loại thú cưng:'],
        ['NgÆ°á»i bĂ¡n:', 'Người bán:'],
        ['ThĂªm vĂ o giá»', 'Thêm vào giỏ'],
        ['ÄĂ¡nh giĂ¡', 'Đánh giá'],
        ['Äang táº£i Ä‘Ă¡nh giĂ¡...', 'Đang tải đánh giá...'],
        ['ChÆ°a cĂ³ sáº£n pháº©m liĂªn quan.', 'Chưa có sản phẩm liên quan.'],
        ['KhĂ´ng thá»ƒ táº£i sáº£n pháº©m', 'Không thể tải sản phẩm'],
        ['ChÆ°a cĂ³ Ä‘Ă¡nh giĂ¡ Ä‘Ă£ duyá»‡t.', 'Chưa có đánh giá đã duyệt.'],
        ['tá»« ${stats.total || reviews.length} Ä‘Ă¡nh giĂ¡', 'từ ${stats.total || reviews.length} đánh giá'],
        ['NgÆ°á»i mua', 'Người mua'],
        ['Hiá»‡n chÆ°a táº£i Ä‘Æ°á»£c Ä‘Ă¡nh giĂ¡.', 'Hiện chưa tải được đánh giá.'],
        ['ÄĂ£ thĂªm vĂ o giá» hĂ ng!', 'Đã thêm vào giỏ hàng!'],
        ['Má»›i nháº¥t', 'Mới nhất'],
        ['GiĂ¡: tháº¥p Ä‘áº¿n cao', 'Giá: thấp đến cao'],
        ['GiĂ¡: cao Ä‘áº¿n tháº¥p', 'Giá: cao đến thấp'],
        ['ÄĂ¡nh giĂ¡ cao', 'Đánh giá cao'],
        ['Giáº£m nhiá»u nháº¥t', 'Giảm nhiều nhất'],
        ['Danh má»¥c', 'Danh mục'],
        ['Táº¥t cáº£ danh má»¥c', 'Tất cả danh mục'],
        ['Khoáº£ng giĂ¡', 'Khoảng giá'],
        ['Tá»«', 'Từ'],
        ['Äáº¿n', 'Đến'],
        ['Lá»c', 'Lọc'],
        ['Loáº¡i thĂº cÆ°ng', 'Loại thú cưng'],
        ['Táº¥t cáº£ thĂº cÆ°ng', 'Tất cả thú cưng'],
        ['ThÆ°Æ¡ng hiá»‡u', 'Thương hiệu'],
        ['Táº¥t cáº£ thÆ°Æ¡ng hiá»‡u', 'Tất cả thương hiệu'],
        ['TĂ¬nh tráº¡ng', 'Tình trạng'],
        ['Chá»‰ hiá»ƒn thá»‹ cĂ²n hĂ ng', 'Chỉ hiển thị còn hàng'],
        ['Äang giáº£m giĂ¡', 'Đang giảm giá'],
        ['Táº¥t cáº£ má»©c Ä‘Ă¡nh giĂ¡', 'Tất cả mức đánh giá'],
        ['Tá»« 4 sao trá»Ÿ lĂªn', 'Từ 4 sao trở lên'],
        ['Tá»« 3 sao trá»Ÿ lĂªn', 'Từ 3 sao trở lên'],
        ['Tá»« 2 sao trá»Ÿ lĂªn', 'Từ 2 sao trở lên'],
        ['KhĂ´ng thá»ƒ táº£i danh má»¥c:', 'Không thể tải danh mục:'],
        ['KhĂ´ng tĂ¬m tháº¥y sáº£n pháº©m nĂ o', 'Không tìm thấy sản phẩm nào'],
        ['KhĂ´ng thá»ƒ táº£i danh sĂ¡ch sáº£n pháº©m', 'Không thể tải danh sách sản phẩm'],
        ['Cá»­a hĂ ng thĂº cÆ°ng', 'Cửa hàng thú cưng'],
        ['Ho?n t?t h? s?, t?i gi?y t? v? g?i cho Admin x?t duy?t. Ch? khi ???c ph? duy?t, t?i kho?n m?i c? th? v?o Seller Center v? v?n h?nh shop.', 'Hoàn tất hồ sơ, tải giấy tờ và gửi cho Admin xét duyệt. Chỉ khi được phê duyệt, tài khoản mới có thể vào Seller Center và vận hành shop.']
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
