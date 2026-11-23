---
frame: Cons_Gate_16_Dependencies
status: written
---
# Phụ thuộc và môi trường

## Bắt buộc
- Node.js `>=20.11 <25` — engine của `package.json`.
- SQLite qua `better-sqlite3` + `sqlite-vec` — GM là một file SQLite (điều 18).
- Model nhúng EmbeddingGemma qua `@huggingface/transformers`, chạy local — không có thì recall rơi về FTS (điều 9).
- Windows là nền chính; bản Docker trên WSL là đường cài thứ hai (skill `install-switch`).

## Không có mã nguồn
Google Drive for desktop (thư mục kênh chung) — hỏng thì máy vẫn nối nhau qua đường P2P; Drive chỉ là đường dự phòng.

## Môi trường dùng chung
Hai máy đã ghép đôi (laptop · PC) — đo phiên bản daemon (`/ping`) và trạng thái nối trước khi đo đồng bộ; đồng hồ hai máy phải khớp
(`w32tm /stripchart`) trước khi so mốc giờ.

## Hệ cũ
Harness kiểu file (sáu file đánh số trong `docs/agent/`) — chỉ đọc để đối chiếu ở `docs/archive/file-harness-2026-11-22/`; giữ tới khi
mọi repo đã chuyển sang harness thư mục.
