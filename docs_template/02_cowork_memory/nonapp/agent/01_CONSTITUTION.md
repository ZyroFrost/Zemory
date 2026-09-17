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

## Điều khoản GỢI Ý (ship từ template — user CHỐT hoặc XOÁ cả mục)
<!-- ĐÂY CHƯA PHẢI LUẬT của project này. Mỗi mục dưới đây là một điều đã TRẢ GIÁ THẬT ở repo khác
     dùng cùng bộ khung: nó sinh ra sau một sự cố, không phải từ lý thuyết. Ship kèm để user chốt
     bằng một câu, thay vì phát hiện lại bằng chính sự cố đó.
     Cách dùng: giữ điều nào → CHUYỂN LÊN §Điều khoản và đánh số (plan/docs dẫn chiếu `HP điều N`);
     không cần → XOÁ cả mục này. Để nguyên ở đây = chưa chốt, agent KHÔNG được coi là luật. -->

- **Bí mật: "ngoài git" KHÔNG phải "ngoài repo".** File bí mật thật (két, `.env`, khoá, connection
  string) **không bao giờ lên git**, nhưng **nằm TRONG cây repo là ĐƯỢC — miễn `.gitignore` chặn**;
  slot chuẩn `data/secrets/`. **CẤM đẻ thư mục bí mật NGOÀI cây repo** — đó là làm rác cấu trúc,
  không phải bảo mật thêm. — *Thứ quyết định an toàn là **gitignore**, không phải vị trí thư mục.
  Hiểu lệch câu "để ngoài git" thành "để ngoài repo" đã sinh ra thư mục backup lạc bên ngoài, và
  đã có ca chìa bị bỏ lại trong thư mục đang đồng bộ đám mây. Nếu có ngoại lệ buộc phải nằm ngoài
  (vd một con trỏ nói "dữ liệu ở đâu" — để cạnh dữ liệu thì thành vòng luẩn quẩn) thì ghi rõ ngoại
  lệ đó ở đây, và nó KHÔNG được chứa bí mật.*

- **Cùng chức năng thì DÙNG CHUNG một bề mặt + BỘ LỌC, không nhân bản.** Trước khi thêm
  bảng/hộp thoại/màn mới → rà cái sẵn có; trùng chức năng thì thêm chế độ lọc. Bộ lọc phải **thuần
  "chọn dòng nào hiện"**, không đổi *cái được tính*; chế độ mới mà đổi logic tính ⇒ **tách ra**,
  đừng nhét. — *Hai bề mặt tự vẽ riêng sớm muộn nói hai sự thật khác nhau về cùng một dữ liệu, và
  lớp bug đó không phụ thuộc ai cẩn thận. Gộp lại thì nó không xảy ra được về mặt cấu trúc.*

- **Đóng gói: ĐỌC phiên bản ĐANG CHẠY trước khi đặt số mới.** Số mới phải lớn hơn số đang chạy ở
  nơi phát hành thật; không đọc được thì **HỎI**, tuyệt đối không cộng theo trí nhớ. — *Trùng số
  không phải lỗi nhỏ: cơ chế "có bản mới" so THEO SỐ, trùng số là im lặng ⇒ người dùng không bao
  giờ được mời cập nhật, còn agent thì tưởng đã xong.*

- **Tài liệu/hướng dẫn NẰM TRONG sản phẩm phải khớp code, sửa trong CÙNG thay đổi.** Đổi chức
  năng mà không rà lại phần hướng dẫn hiện cho người dùng = **bug tài liệu**, sửa như bug. — *Cùng
  nguyên tắc với "index phải khớp code": tài liệu lệch còn nguy hơn thiếu, vì người đọc tin nó.*

- **Một concern MỘT TÊN — có từ điển định danh, không trộn hai ngôn ngữ.** Chốt bảng tên
  nghiệp vụ → định danh trong code, và đổi tên thì đổi hết một lượt rồi CHẠY KIỂM. — *Trộn tên là
  đường dẫn tới hai hàm cùng việc khác tên, rồi hai hành vi khác nhau.*

- **UI không mang TÊN KỸ THUẬT.** Nhãn người dùng thấy dùng từ nghiệp vụ, không phải tên
  bảng/cột/mã nội bộ. Ngoại lệ: chỗ cố tình phơi kỹ thuật (editor truy vấn, dialog chú thích). —
  *Nhãn kỹ thuật rò ra UI là dấu hiệu bề mặt đang nói ngôn ngữ của DB chứ không của người dùng.*

- **Bố cục user đã chốt là BẤT BIẾN — agent không tự đổi vị trí/thứ tự.** Muốn đổi thì HỎI. — *Kèm
  quy ước dễ quên: mọi dòng/panel TỔNG nằm **DƯỚI** nội dung (chuẩn bảng tính).*

- **Làm liền được thì LÀM, đừng đẩy vào backlog.** `05_TODO` chỉ dành cho việc NHIỀU quá chưa làm
  liền được; việc trong tầm tay thì làm rồi ghi `06_CHANGES`. — *TODO phình lên vì thói "đề xuất
  rồi chờ" sẽ chôn mất thứ thật sự đang chặn.*

## Sửa đổi hiến pháp
- **Chỉ user quyết** — cả §Mục đích lẫn §Điều khoản. Agent thấy cần sửa/thêm → **HỎI user ngay trong phiên**, user gật mới ghi; KHÔNG tự sửa file này. *(Luật đầy đủ về cửa vào — kể cả vế BÃI BỎ "đậu đề xuất vào `05_TODO` chờ duyệt" — ở `02_RULES` §Sổ việc `05_TODO`. Không lặp ở đây.)*
- Khi user chốt đổi: cập nhật tại đây + ghi `06_CHANGES.md` (supersede — nêu điều cũ, lý do đổi).
- **Mục đích còn "(chưa chốt)" = harness chưa xong** — hỏi user chốt sớm; mọi điều khoản chỉ có nghĩa khi biết project phục vụ cái gì.
