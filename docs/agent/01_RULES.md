<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory plan set` -->
# zemory — Quy tắc làm việc

> AI đọc file này trước khi làm. Tuân thủ tuyệt đối.
> Mở phiên + mọi hướng dẫn quy trình: xem `AGENTS.md` ở root. **Cấu trúc repo: `04_STRUCTURE.md`.** Backlog: `02_TODO.md`. Changelog: `03_CHANGES.md`.
## Bất biến KIẾN TRÚC (không được vi phạm khi code) — từ build plan §2
1. **Mục tiêu tối thượng: TIẾT KIỆM TOKEN — cái nào tối ưu hơn thì dùng.** Ưu tiên *gọi / extend* tool tốt nhất hiện có hơn là tự viết lại (kể cả tool ngoài, nếu license cho phép). Chỉ tự build khi không có sẵn cái tốt hơn, hoặc phải sửa đúng phần lõi mà extend không với tới. **KHÔNG thờ rule cũ nếu có đường tối ưu hơn** — rule phục vụ mục tiêu, không phải ngược lại.
2. **Ranh giới `backend/src/` (của mình) vs `external/` (của người ta).** `backend/src/` = 100% code của mình, một giọng. `external/` = repo/lib public (model, lib) — **gọi/extend**, KHÔNG dán vào backend. Luôn rạch ròi "của mình vs người ta". Cấu trúc folder đầy đủ: `04_STRUCTURE.md`.
3. **1 NGUỒN sự thật = docs của project.** Không tạo kho thứ 2. Search index = lăng kính dẫn xuất (vứt/dựng lại được).
4. **1 capability = 1 slot = 1 provider.** Registry ép conflict nếu 2 module đòi cùng slot.
5. **Tách BỘ MÁY (tool) khỏi DỮ LIỆU (docs project).** Tool đọc docs, không nằm trong project.
## Ngôn ngữ
- **Toàn bộ docs/plan + docs/agent**: tiếng Việt có dấu.
- **Code + UI + CLI output + comment công khai**: tiếng Anh.

## Tài liệu — quy ước cập nhật
| File | Vai trò | Khi nào cập nhật |
|---|---|---|
| `04_STRUCTURE.md` | chuẩn cấu trúc folder (cây + routing + convention) | khi đổi chuẩn cấu trúc |
| `02_TODO.md` | backlog | phát sinh việc / đổi ưu tiên; xong → chuyển sang CHANGES |
| `03_CHANGES.md` | changelog | mỗi lần sửa code; **chỉ ghi sau khi user xác nhận OK** (`zemory changelog add`) |
| `docs/plan/*` | thiết kế dài hạn (specs thuần, KHÔNG todo) | khi chốt/đổi thiết kế |
## Changelog — supersede
- Mới nhất ở trên cùng (chèn ngay sau header).
- Entry **đảo/thay** quyết định cũ → mở đầu bằng: `> 🔄 **Supersede:** thay quyết định "[đề mục] ([ngày])" — [lý do].` Không sửa/xoá entry cũ; tuỳ chọn thêm `> ⤴ Đã bị thay bởi [ngày].` ở entry cũ.

## Hành xử
- **Chỉ làm đúng cái được yêu cầu.** Đụng logic/khác → **hỏi trước**, không tự sửa rồi báo.
- **Thêm chức năng = mở rộng, KHÔNG ghi đè** cái cũ (trừ khi user yêu cầu rõ).
- **Góp ý thẳng** về thiết kế nếu thấy bất hợp lý — TRƯỚC khi làm. Quyết định cuối là của user.
- **Không biết thì hỏi, không đoán.**