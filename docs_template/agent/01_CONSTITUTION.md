<!-- zemory template · HIẾN PHÁP riêng của project — CHỈ USER được chốt/sửa; agent đề xuất, không tự đổi. Áp cho CẢ app lẫn non-app (chốt 2026-07-16) -->
# <PROJECT> — Hiến pháp (bất biến kiến trúc)

> **Tầng TỐI CAO của harness — đọc TRƯỚC mọi file khác.** Mọi plan / code / quyết định phải đối chiếu về đây; **vi phạm = bug thiết kế**, kể cả khi code chạy được.
> KHÁC `02_RULES.md`: RULES là luật LÀM VIỆC **chung mọi project** (hành xử, ngôn ngữ, quy ước docs — ship nguyên từ template); hiến pháp là bất biến KIẾN TRÚC **riêng của <PROJECT>** — mỗi app một bản, như mỗi quốc gia một hiến pháp.
> **1 nguồn sự thật cho "luật riêng":** luật riêng của app chốt Ở ĐÂY. Plan/spec chỉ DẪN CHIẾU điều khoản (`HP điều N`), KHÔNG tự phát sinh luật nằm rải trong plan.

## Mục đích (BẮT BUỘC — điền TRƯỚC mọi điều khoản)
<!-- Project NÀY sinh ra để làm gì, cho ai, giải bài toán gì — 2–4 câu, đủ để một agent lạ
     đọc là nắm ngay BỐI CẢNH mà mọi điều khoản dưới đang phục vụ. Đây là nguồn CHỐT của mục
     đích + phi-mục-tiêu (bất biến, user sở hữu). Mô tả SẢN PHẨM chi tiết (tính năng · ý tưởng ·
     kiến trúc tổng thể) nằm ở `docs/plan/00_overview.md` — đọc kèm khi mở phiên; overview MỞ
     RỘNG mục đích này, KHÔNG lặp lại phần bất biến (dẫn chiếu về đây).
     Kèm PHI-MỤC-TIÊU (thứ project cố tình KHÔNG làm) — chống scope creep, và giúp agent biết
     khi nào phải từ chối một đề xuất "nghe hay" nhưng lệch hướng. -->

**(chưa chốt — user điền)** — project này là gì, phục vụ ai, giải bài toán gì.

**PHI-MỤC-TIÊU:** *(chưa chốt)* — những thứ cố tình KHÔNG làm.

## Điều khoản
<!-- Mỗi điều: 1 câu đậm (bất biến) + 1-2 câu vì-sao/ranh-giới. Chỉ đưa vào đây thứ TỐI CAO,
     gần như không bao giờ đổi (kiến trúc nền, ranh giới dữ liệu, nguyên tắc an toàn).
     Quy ước vặt / workflow → 02_RULES (nếu chung) hoặc docs/plan (nếu là thiết kế). -->

1. **(chưa chốt)** — thêm điều khoản khi user chốt thiết kế nền của project.

## Sửa đổi hiến pháp
- **Chỉ user quyết** — cả §Mục đích lẫn §Điều khoản. Agent thấy cần sửa/thêm → ghi đề xuất vào `04_TODO.md` chờ duyệt, KHÔNG tự sửa file này.
- Khi user chốt đổi: cập nhật tại đây + ghi `05_CHANGES.md` (supersede — nêu điều cũ, lý do đổi).
- **Mục đích còn "(chưa chốt)" = harness chưa xong** — hỏi user chốt sớm; mọi điều khoản chỉ có nghĩa khi biết project phục vụ cái gì.
