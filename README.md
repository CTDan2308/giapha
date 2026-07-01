# Gia phả dòng họ — Website tĩnh, lưu trên GitHub

Trang gia phả điện tử **không cần cơ sở dữ liệu**. Toàn bộ nội dung nằm trong file `data/giapha.json`, deploy miễn phí bằng **GitHub Pages**.

**Địa chỉ sau khi deploy:** `https://CTDAN2308.github.io/giapha/`

## Tính năng
- 🌳 **Cây phả đồ** kéo–thả, phóng to/thu nhỏ, thu gọn/mở rộng từng nhánh
- 👤 **Chi tiết từng người**: ảnh, video (YouTube/mp4), tiểu sử, năm sinh, ngày giỗ (Âm & Dương lịch), chức danh
- 👥 **Quan hệ xưng hô** tự tính theo huyết thống (chọn “mình” để xem cách gọi)
- 📜 **Lịch sử dòng họ**
- 🏛️ **Định vị nhà thờ tổ** trên Google Maps (chỉ cần nhập địa chỉ hoặc lat/lng — không cần API key)
- 🕯️ **Lịch nhắc lễ giỗ** + 📅 **Hội họp / sự kiện** (đếm ngược ngày)
- 📰 **Tin tức nội bộ**
- 🖨️ **Xuất phả đồ** (In / lưu PDF) và 💾 **Xuất/Nhập dữ liệu JSON**
- ⚙️ **Trang Quản trị** nhập liệu ngay trong web

## Cấu trúc
```
giapha/
├── index.html          # toàn bộ ứng dụng (React + Tailwind qua CDN)
├── data/
│   ├── giapha.json     # DỮ LIỆU CHÍNH — sửa file này để cập nhật gia phả
│   └── seed.js         # dữ liệu dự phòng khi mở bằng file://
├── assets/             # để ảnh/video dòng họ ở đây (tuỳ chọn)
├── .nojekyll           # để GitHub Pages phục vụ file nguyên trạng
└── README.md
```

## Deploy lên GitHub Pages (tài khoản CTDAN2308)

1. Tạo repo mới tên **`giapha`** trong tài khoản **CTDAN2308** (Public).
2. Tải toàn bộ thư mục này lên (kéo–thả trên web GitHub hoặc dùng git):
   ```bash
   git init
   git add .
   git commit -m "Khởi tạo gia phả dòng họ"
   git branch -M main
   git remote add origin https://github.com/CTDAN2308/giapha.git
   git push -u origin main
   ```
3. Trên GitHub: **Settings → Pages → Source = Deploy from a branch → Branch = `main` / `(root)` → Save**.
4. Chờ 1–2 phút, mở `https://CTDAN2308.github.io/giapha/`.

> Muốn địa chỉ gọn `https://CTDAN2308.github.io` thì đặt tên repo là `CTDAN2308.github.io`.

## Cập nhật nội dung (2 cách)

**Cách A — Dùng trang Quản trị trong web (khuyên dùng):**
1. Mở web → tab **Quản trị** → thêm/sửa thành viên, sự kiện, tin tức…
   (thay đổi được lưu tạm trong trình duyệt của bạn).
2. Vào **Quản trị → Xuất/Nhập dữ liệu → Tải file giapha.json**.
3. Trên GitHub mở `data/giapha.json` → Edit (✏️) → dán nội dung file vừa tải → **Commit**.

**Cách B — Sửa trực tiếp** file `data/giapha.json` trên GitHub rồi Commit.

## Ảnh & video
- Đưa ảnh vào thư mục `assets/` rồi dùng đường dẫn `assets/ten-anh.jpg`, hoặc dán link ảnh bên ngoài.
- Video: dán link **YouTube** (tự nhúng) hoặc link file `.mp4`.

## Ghi chú kỹ thuật
- Cần **Internet** để tải React/Tailwind/Babel từ CDN.
- Babel **phải** dùng bản `@7` (bản 8 gây trắng màn hình với app CDN).
- Mở nhanh trên máy: chạy một web server tĩnh trong thư mục này, ví dụ:
  ```bash
  npx serve .
  # hoặc: python -m http.server 5599
  ```
  (mở trực tiếp `index.html` bằng `file://` vẫn chạy nhờ `data/seed.js`, nhưng nên dùng server để đọc `data/giapha.json`).
