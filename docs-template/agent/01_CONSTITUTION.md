<!-- zemory template · HIẾN PHÁP riêng của project — CHỈ USER được chốt/sửa; agent đề xuất, không tự đổi. Áp cho CẢ app lẫn non-app (chốt 2026-07-16) -->
# <PROJECT> — Hiến pháp (bất biến kiến trúc)

> **Tầng TỐI CAO của harness — đọc TRƯỚC mọi file khác.** Mọi plan / code / quyết định phải đối chiếu về đây; **vi phạm = bug thiết kế**, kể cả khi code chạy được.
> KHÁC `02_RULES.md`: RULES là luật LÀM VIỆC **chung mọi project** (hành xử, ngôn ngữ, quy ước docs — ship nguyên từ template); hiến pháp là bất biến KIẾN TRÚC **riêng của <PROJECT>** — mỗi app một bản, như mỗi quốc gia một hiến pháp.
> **1 nguồn sự thật cho "luật riêng":** luật riêng của app chốt Ở ĐÂY. Plan/spec chỉ DẪN CHIẾU điều khoản (`HP điều N`), KHÔNG tự đẻ luật nằm rải trong plan.

## Điều khoản
<!-- Mỗi điều: 1 câu đậm (bất biến) + 1-2 câu vì-sao/ranh-giới. Chỉ đưa vào đây thứ TỐI CAO,
     gần như không bao giờ đổi (kiến trúc nền, ranh giới dữ liệu, nguyên tắc an toàn).
     Quy ước vặt / workflow → 02_RULES (nếu chung) hoặc docs/plan (nếu là thiết kế). -->

1. **(chưa chốt)** — thêm điều khoản khi user chốt thiết kế nền của project.

## Sửa đổi hiến pháp
- **Chỉ user quyết.** Agent thấy cần sửa/thêm → ghi đề xuất vào `04_TODO.md` chờ duyệt, KHÔNG tự sửa file này.
- Khi user chốt đổi: cập nhật điều khoản tại đây + ghi `05_CHANGES.md` (supersede — nêu điều cũ, lý do đổi).
