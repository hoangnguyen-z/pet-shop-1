# Pet Shop Marketplace

README này dành cho 2 trường hợp:

## 1. Chỉ xem giao diện

Người khác có thể tải code về và tự mở frontend để xem giao diện **bất cứ lúc nào**.

Họ **không cần**:
- MongoDB
- backend
- seed dữ liệu

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

Nếu người khác muốn dùng đầy đủ chức năng thì:

### Chủ dự án phải bật

- MongoDB
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

## 3. Nếu bạn là chủ dự án và muốn tự chạy toàn bộ hệ thống

### Cần chuẩn bị

- Node.js 18+
- npm
- MongoDB đang chạy

### Cài backend

```powershell
cd "D:\pet shop\backend"
npm install
```

### Tạo dữ liệu demo

```powershell
cd "D:\pet shop\backend"
npm run seed:admin
npm run seed:admin-access
npm run seed:marketplace
npm run seed:shop-locations
```

### Chạy backend

Mở terminal thứ nhất:

```powershell
cd "D:\pet shop\backend"
node src\app.js
```

### Chạy frontend

Mở terminal thứ hai:

```powershell
cd "D:\pet shop"
node dev-static-server.js
```

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

