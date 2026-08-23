---
name: session-close
description: Close out a work session correctly - route everything that happened into the right file so the next session can pick up where this one stopped. Use when the user asks to write things down, log progress, wrap up, or says the context is running out or they are switching sessions. Vietnamese triggers - "note lại", "docs lại", "ghi sổ", "chốt phiên", "sắp hết context", "đổi session", "mở phiên mới", "tổng kết lại".
---

# session-close — chốt phiên / ghi sổ

> Kích hoạt (luật cứng, `02_RULES §Chốt phiên`): user nói "note lại" · "docs lại" · "ghi sổ" · "chốt phiên" · "sắp hết context / đổi session / mở phiên mới" — hoặc bất kỳ cách nói nào mang nghĩa **kết sổ phiên này để phiên sau đọc tiếp**.

**TUYỆT ĐỐI không ghi docs theo trí nhớ tóm tắt.** Ghi theo tóm tắt = mất chi tiết, và cái mất luôn là cái phiên sau cần nhất.

**Global Memory là NGUỒN THẬT của phiên — trí nhớ trong context thì KHÔNG.** Khi context bị tóm tắt/trim, chi tiết phiên vẫn còn NGUYÊN trong episodic memory (DB); cái bạn "nhớ" trong context đã bị lược. Đây là GỐC của "đổi session là sót/lệch". Nên **mọi lần ghi docs / audit / báo cáo — nhất là khi ĐỔI SESSION — BẮT BUỘC dò Global Memory + đối chiếu code THẬT để verify TRƯỚC khi khẳng định bất cứ điều gì.**

**Bước 0 — DÒ GLOBAL MEMORY + VERIFY (bắt buộc, KHÔNG skip, làm TRƯỚC Bước 1):**
1. `zemory memory digest <session>` + `zemory memory search "<chủ đề phiên>" [--all]` → dựng lại ĐẦY ĐỦ việc/đổi/quyết định/lỗi của phiên, kể cả đoạn đã trôi khỏi context.
2. **Verify từng mục sắp ghi vào docs với NGUỒN THẬT** = GM (điều đã thực sự làm/nói/quyết) + code/file THẬT (đọc lại dòng liên quan). Chỉ mục SỐNG SÓT verify mới được ghi; claim chưa verify = KHÔNG ghi.
3. **SOÁT `05_TODO` = ĐO LẠI, KHÔNG đọc rồi chép** (`02_RULES §Hành xử` — luật áp **MỌI LÚC**, chốt phiên chỉ là một trường hợp): mỗi mục là một **KHẲNG ĐỊNH VỀ TRẠNG THÁI**, mà khẳng định phải truy được về nguồn kiểm được. **BA NGUỒN, chạy ĐỦ CẢ BA cho MỌI mục — không chọn nguồn theo loại mục**: ① **mã** · ② **lịch sử quyết định** (`memory search --all`, lọc lời USER — quyết định hay nằm ở phiên khác, thậm chí **repo khác**) · ③ **chạy thật** (gọi endpoint · mở app nhìn · đọc log tiến trình đang chạy). Chỉ khi **cả ba khớp** mới kết luận; lệch ⇒ **cái mới hơn thắng** (lời user CÓ HẠN DÙNG, có thể bị chính việc làm sau đó supersede). Nguồn nào không chạm được ⇒ ghi "chưa xác minh được" kèm nguồn đã thử, KHÔNG mặc định "chưa làm", KHÔNG lấy 2 nguồn còn lại làm đủ. **Mục quá 7 ngày không ai đụng = NGHI NGỜ.** Hỏi lại user một việc đã chốt là **LỖI**, không phải cẩn thận.
4. **Áp CẢ cho audit / báo cáo lỗi:** mỗi finding phải đối chiếu code + GM trước khi gọi là "lỗi thật" — phần lớn false-positive đến từ đọc code thiếu ngữ cảnh hoặc không biết quyết định lịch sử. Bẫy điển hình: tên file cũ trong entry changelog CŨ là **BẢN GHI LỊCH SỬ**, KHÔNG phải link gãy cần sửa (sửa = vi phạm luật supersede); chuỗi ngôn-ngữ-gốc có thể là **thuật ngữ kỹ thuật GIỮ NGUYÊN**, KHÔNG phải leak i18n. KHÔNG tin kết quả subagent chưa tự kiểm lại.

**Bước 1 — ĐỌC LẠI ĐỦ 3 nguồn TRƯỚC khi ghi:**
1. **FULL phiên hiện tại** — đọc lại từ ĐẦU hội thoại, kể cả đoạn đã bị tóm tắt/trôi khỏi context (dùng `zemory memory digest <session>` / `memory search` để moi lại). Rút ra: đã LÀM gì · đã ĐỔI gì · QUYẾT ĐỊNH gì · còn DỞ gì · phát hiện LỖI gì chưa sửa.
2. **FULL `docs/plan/*`** — mọi file, để biết việc vừa làm có đụng/lệch spec nào không.
3. **FULL `docs/agent/*`** — `01_CONSTITUTION` · `02_RULES` · `03_STRUCTURE` · `04_SKILLS` · `05_TODO` · `06_CHANGES`, để biết chỗ nào phải cập nhật và không ghi trùng cái đã có.

**Bước 2 — định tuyến từng thứ về đúng file, KHÔNG BỎ SÓT:**

| Thứ phát sinh trong phiên | Ghi vào |
|---|---|
| Việc đã xong / đã sửa code | `06_CHANGES.md` (sau khi user OK) **và xoá khỏi** `05_TODO.md` |
| Việc còn dở · việc phát sinh · việc phiên sau làm | `05_TODO.md` — nêu rõ trạng thái `[~]`, **đã tới đâu, bước kế tiếp là gì** |
| Thiết kế / quyết định thay đổi | `docs/plan/NN_*.md` (+ supersede ở changelog nếu đảo quyết định cũ) |
| Luật / bất biến riêng phát sinh | **HỎI user ngay trong phiên**, gật thì ghi thẳng vào đúng nhà (`01`/`02`) — KHÔNG tự sửa `01_CONSTITUTION.md`, và KHÔNG đậu vào `05_TODO` chờ duyệt (vế đó đã BÃI BỎ) |

**Chuẩn "không bỏ sót":** mọi việc đã làm trong phiên phải tìm được ở CHANGES **hoặc** TODO — không việc nào chỉ nằm trong đầu rồi mất theo phiên. Chẩn đoán sai / đường cụt / thứ đã thử mà không xong **cũng phải ghi** (để phiên sau khỏi đâm lại chỗ đó).

**Đảo một quyết định cũ?** Mệnh đề `> 🔄 **Supersede:**` phải nêu ĐÚNG khoá ngày của entry bị thay (`2026-07-29l`) — máy chỉ nối được khi có khoá đó, và nối rồi thì ai tra trúng entry CŨ mới thấy nhãn “⚠ ĐÃ BỊ THAY”. Viết trống ngày ⇒ quyết định chết vẫn hiện như đang sống (`02_RULES §Changelog`).

**Bước 3 — TỰ DỌN hai file sổ (bắt buộc, đừng chờ ai nhớ gõ lệnh):**

Chạy `zemory archive` ngay sau khi ghi. Nó làm hai việc KHÁC NHAU, đúng bản chất từng file:
- **`05_TODO.md` — KHÔNG có ngưỡng.** Mọi mục đã xong — dấu `[x]` **hoặc** `✅`, `archive` nhận cả
  hai (bản chỉ-biết-`[x]` từng làm lệnh **chưa bao giờ nhặt được mục nào** ở repo viết `✅`, trong
  khi sổ vẫn phình và lệnh báo *"nothing to do"* mỗi lần) — bị chuyển sang `docs/agent/archive/05_TODO.md`
  ngay, vì một mục đã xong là **đặt sai chỗ kể từ giây nó xong** — không liên quan file dài hay ngắn.
  (Đo 2026-07-29: gác bằng ngưỡng kích thước là lý do 107 mục đã xong nằm lại chiếm **46%** một file
  vốn được nạp MỌI phiên.) Mục còn mở `[ ]`/`[~]` giữ nguyên toàn bộ.
- **`06_CHANGES.md` — có trần.** Entry **cũ nhất** chuyển sang `archive/06_CHANGES.md`, giữ bản mới nhất
  tại chỗ. Ngưỡng khai trong `docs/.harness.json` (`thresholds.changes_lines`/`changes_keep`).

**Chép NGUYÊN VĂN, KHÔNG tóm tắt** — tầng archive là để TRA LẠI, không phải để nén; cả hai tầng được
reindex nên mục vừa chuyển tra được ngay (`zemory changelog search` · `zemory memory search`).
**Không chạy được `zemory`?** Làm tay đúng hai luật trên, rồi báo user đã chuyển bao nhiêu mục.

**Bước cuối:** `zemory validate` (đọc file trực tiếp — xanh mới coi là chốt xong) → BÁO CÁO user. Không tự `git push` (`02_RULES §Git`).
