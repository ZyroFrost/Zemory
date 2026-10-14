# Ảnh chụp giao diện — dùng cho `README.md` ở gốc repo

Ảnh **cho NGƯỜI xem** (tài liệu), nên nằm ở `docs_visual/` chứ không phải `frontend/assets/`
(chỗ đó dành cho ảnh SHIP trong app: logo, favicon, icon tray) — theo `03_STRUCTURE §3`.

**MÁY chụp, không chụp tay** — làm tươi lại bằng một lệnh (daemon phải đang chạy):

```
node backend/scripts/shoot-ui.mjs
```

Nó mở Edge/Chrome ẩn qua CDP, bấm vào từng mục nav + sub-tab rồi chụp. Ảnh chụp tay thì lần đổi
giao diện sau sẽ không ai chụp lại, và README bắt đầu **nói dối về sản phẩm** — cùng loại lỗi
"sổ nói khác code".

`README.md` ở gốc trỏ vào **đúng bảy tên dưới đây**:

| tên file | màn |
|---|---|
| `01-home.png` | Trang chủ — 6 ô số liệu · dự án & phiên gần đây |
| `02-recall.png` | Recall — tab Phiên: bộ lọc + danh sách phiên + khung xem hội thoại |
| `03-projects.png` | Dự án — thẻ project đã liên kết + danh sách chưa liên kết chia theo máy |
| `04-global-memory-sync.png` | Global Memory — tab Đồng bộ & Sao lưu (nguồn · tự động · Drive) |
| `05-harness-docs.png` | Harness — tab Docs harness (bộ chuẩn `docs_template`) |
| `06-harness-structure.png` | Harness — tab Cấu trúc folder (cây chuẩn + bảng routing) |
| `07-features.png` | Tính năng — 14 năng lực, trạng thái từng cái |

**Chụp lại khi nào:** khi giao diện đổi tới mức ảnh cũ mô tả sai. Ảnh cũ mà README vẫn tả theo nó
thì tài liệu nói dối — cùng loại lỗi "sổ nói khác code".

**Đừng** để ảnh có nội dung nhạy cảm (đường dẫn nội bộ khách hàng, token, email người khác). Ảnh
trong repo công khai đi xa hơn bạn nghĩ.
