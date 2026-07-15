<!-- HIẾN PHÁP riêng của zemory — CHỈ USER được chốt/sửa; agent đề xuất qua TODO, không tự đổi -->
# zemory — Hiến pháp (bất biến kiến trúc)

> **Tầng TỐI CAO của harness — đọc TRƯỚC mọi file khác.** Mọi plan / code / quyết định phải đối chiếu về đây; **vi phạm = bug thiết kế**, kể cả khi code chạy được.
> KHÁC `02_RULES.md`: RULES là luật LÀM VIỆC chung mọi project (ship từ template); hiến pháp là bất biến KIẾN TRÚC **riêng của zemory** — mỗi app một bản, như mỗi quốc gia một hiến pháp.
> **1 nguồn sự thật cho "luật riêng":** luật riêng của zemory chốt Ở ĐÂY. Plan/spec chỉ DẪN CHIẾU điều khoản (`HP điều N`), KHÔNG tự đẻ luật nằm rải trong plan.

## Điều khoản

1. **Mục tiêu tối thượng: TIẾT KIỆM TOKEN — cái nào tối ưu hơn thì dùng.** Ưu tiên *gọi / extend* tool tốt nhất hiện có hơn là tự viết lại (kể cả tool ngoài, nếu license cho phép). Chỉ tự build khi không có sẵn cái tốt hơn, hoặc phải sửa đúng phần lõi mà extend không với tới. KHÔNG thờ rule cũ nếu có đường tối ưu hơn — rule phục vụ mục tiêu, không phải ngược lại.
2. **Ranh giới `backend/src/` (của mình) vs `external/` (của người ta).** `backend/src/` = 100% code của mình, một giọng. `external/` = repo/lib public (model, lib) — **gọi/extend**, KHÔNG dán vào backend. Luôn rạch ròi "của mình vs người ta".
3. **1 NGUỒN sự thật = docs của project.** Không tạo kho thứ 2. Search index = lăng kính dẫn xuất (vứt/dựng lại được).
4. **1 capability = 1 slot = 1 provider.** Registry ép conflict nếu 2 module đòi cùng slot.
5. **Tách BỘ MÁY (tool) khỏi DỮ LIỆU (docs project).** Tool đọc docs, không nằm trong project.

## Sửa đổi hiến pháp
- **Chỉ user quyết.** Agent thấy cần sửa/thêm → ghi đề xuất vào `04_TODO.md` chờ duyệt, KHÔNG tự sửa file này.
- Khi user chốt đổi: cập nhật điều khoản tại đây + ghi `05_CHANGES.md` (supersede — nêu điều cũ, lý do đổi).
