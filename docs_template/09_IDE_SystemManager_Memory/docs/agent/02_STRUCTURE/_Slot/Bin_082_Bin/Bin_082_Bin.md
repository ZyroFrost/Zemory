---
id: Slot_82
aka: 03-82
name: bin
version: 3
path: bin/
from: _Store/02_STRUCTURE/_Slot/Bin_082_Bin @v3 #402b1bcd4d46
---
# Bin_082_Bin bin — entry CLI / launcher

- Vai trò:
  - Hệ APP: entry CLI theo npm convention: `bin/<name>` → `dist/cli.js`.
  - Hệ NON-APP: LAUNCHER gõ tay (`.cmd`/`.sh`) — `bin/<tên>.cmd`: `<tên> <stage>` dispatch · `<tên> auto` = cổng 00 (exit-code gate) → chạy chuỗi stage nếu đủ. Case định kỳ dùng launcher ở đây.
  - Gốc repo sạch: launcher đặt ở `bin/`, không ở gốc. Đánh đổi có ý thức: gõ `bin\<tên> pull` thay vì `<tên> pull`.
- Được chứa / không chứa:
  - Launcher THUẦN ASCII — dấu tiếng Việt làm cmd.exe vỡ parse.
  - Không đặt dấu `>` trong dòng `rem` — cmd vẫn redirect ⇒ sinh file rỗng.
