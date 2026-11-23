---
id: Cons_118
aka: 01-18
name: one-memory-file
version: 1
kind: content
---
# Cons_Core_118_OneMemoryFile GM = ĐÚNG MỘT FILE `global_memory.db`.

**GM = ĐÚNG MỘT FILE `global_memory.db`.** Thư mục GM (`global-memory/`) chỉ chứa `global_memory.db` và hai file phụ SQLite tự sinh của chính nó (`-wal` · `-shm`).
    - **Không thứ gì khác nằm trong thư mục GM:** không thư mục con · không bản kênh/khối mã hoá (`channel/`) · không tệp đính kèm rời (`files/`) · không bản sao lưu · không chỉ mục hay file trạng thái để riêng. Mọi lớp của bộ RAG (tin gốc · vector · FTS · digest · tệp đính kèm) sống TRONG file db.
    - **Đồng bộ giữa các máy = ghi THẲNG vào file db đó qua hàng đợi ghi** (FIFO: máy nào gửi trước ghi trước, `jobs/writeturn.ts`). Khối mã hoá chạy trên đường truyền là dạng VẬN CHUYỂN — sinh từ db, nhận xong thì nối vào db rồi bỏ; không lưu thành bản thứ hai cạnh GM. Kênh chung (thư mục Drive) là chỗ gặp nhau, không phải một phần của GM.
    - **Dữ liệu của máy** (bản sao lưu · model · nhật ký · trạng thái kênh) thuộc `data/` của máy, không nằm trong thư mục GM; trong bản cài Docker, mọi thứ đó nằm trên ổ của máy chủ, không chép thêm bản thứ hai.
    - **Phép kiểm:** liệt kê thư mục GM ⇒ chỉ có `global_memory.db` (+ `-wal`/`-shm`). Có thêm bất cứ mục nào ⇒ vi phạm.
    - Thay vế "`global_memory.db` + `channel/` + `files/`" ở điều 14 và vế "dãy khúc" của điều 16 khi chúng nói về nội dung thư mục GM; ý gốc của điều 16 (một GM logic · chở trọn RAG · ghi là nối thêm · có hàng đợi) giữ nguyên.

- **Chốt máy:** guard: `global-memory` trong `protected` (agent không ghi/chép gì vào thư mục GM) · `rule-gates ⑬` (ratchet chỗ code đặt đường vào thư mục GM ngoài db: `channel/` · `files/` → 0 theo `plan/24 §13`)
