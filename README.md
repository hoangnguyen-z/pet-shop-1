# Pet Shop Marketplace

README này dành cho 2 trường hợp:

## 1. Chỉ xem giao diện
có thể tải code về và tự mở frontend để xem giao diện **bất cứ lúc nào**.
Chỉ cần chạy frontend:
```powershell
cd "D:\pet shop"
node dev-static-server.js
```
Sau đó mở:
- [http://localhost:5500/](http://localhost:5500/)

Lưu ý:
- cách này chủ yếu để **xem giao diện**
- các chức năng cần lưu dữ liệu thật như đăng ký, đăng nhập, đặt hàng, quản lý shop, quản lý admin sẽ **không dùng đầy đủ** nếu không có backend
---
## 2. Muốn dùng full chức năng

Nếu muốn dùng đầy đủ chức năng thì thông báo:
Chủ dự án phải bật
- Databse
- backend
Nếu người test không tự chạy frontend thì chủ dự án bật thêm frontend hoặc gửi link web.
### Người test cần làm

Nếu người test tự chạy frontend trên máy họ, mở file:
```text
D:\pet shop\js\config.js
```
và điền địa chỉ backend của chủ dự án:
```js
window.APP_CONFIG = {
    API_BASE_URL: 'https://dia-chi-backend-cua-chu-du-an/api'
};
```

Sau đó chạy frontend:

```powershell
cd "D:\pet shop"
node dev-static-server.js
```

Khi đó:
- frontend chạy trên máy người test
- nhưng dữ liệu sẽ lưu vào backend + database của chủ dự án

Lưu ý:
- nếu chủ dự án tắt backend hoặc MongoDB thì các chức năng đầy đủ sẽ ngừng hoạt động

---

### Mở web

- Trang chính: [http://localhost:5500/](http://localhost:5500/)
- Admin: [http://localhost:5500/pages/admin/dashboard.html](http://localhost:5500/pages/admin/dashboard.html)
- Seller: [http://localhost:5500/pages/seller/dashboard.html](http://localhost:5500/pages/seller/dashboard.html)

Nếu giao diện chưa cập nhật, nhấn:

```text
Ctrl + F5
```

---

## Tài khoản demo

### Admin

```text
Email: admin@petshop.com
Mật khẩu: admin123
```

### Seller

```text
Email: seller.dog@petshop.com
Mật khẩu: Seller123
```

### Buyer

```text
Email: buyer.review@petshop.com
Mật khẩu: Petshop1
```

---

## Dừng hệ thống

Quay lại terminal đang chạy và nhấn:

```text
Ctrl + C
```

---

## LAN / Phone Access

Run one command:

```powershell
cd "D:\pet shop"
node start-lan.js
```

The terminal will print:
- `Desktop: http://localhost:5500/`
- `Phone: http://<your-computer-lan-ip>:5500/`

Requirements:
- your computer and phone must use the same Wi-Fi
- keep the terminal running while testing on the phone
- if the phone cannot open the link, allow Node.js through Windows Firewall
