---
frame: Cons_Gate_09_Purpose
status: written
---
# Zemory — Mục đích

> **Tầng TỐI CAO của harness — đọc TRƯỚC mọi file khác.** Mọi plan / code / quyết định phải đối chiếu về đây; **vi phạm = bug thiết kế**, kể cả khi code chạy được.
> KHÁC luật chung (`01_LAW/_Rule/`): luật chung là luật LÀM VIỆC chung mọi project (ship từ template); hiến pháp là bất biến KIẾN TRÚC **riêng của zemory** — mỗi app một bản, như mỗi quốc gia một hiến pháp.
> **1 nguồn sự thật cho "luật riêng":** luật riêng của zemory chốt Ở ĐÂY (gom 2026-07-14 từ các điều nằm rải trong plan 00/02/04–08/10–12). Plan/spec chỉ DẪN CHIẾU điều khoản (`HP điều N`), KHÔNG tự phát sinh luật mới nằm rải trong plan.

## Mục đích

**zemory là lớp quản trị BỘ NHỚ + CONTEXT cho coding agent — một lõi dùng chung cho MỌI project trên máy.** Hai vai, không hơn:
1. **Một Global Memory chung** — mọi phiên agent (Claude Code · Codex · Continue · LM Studio) + web chat (ChatGPT…) được ingest vào MỘT SQLite local, dedup, redact, tìm được bằng cả keyword lẫn ngữ nghĩa, **xuyên project và xuyên máy** (sync bundle mã hóa). Mục tiêu thật: agent **nhớ được việc phiên trước** thay vì bắt user kể lại — đó là chỗ token thật sự tiết kiệm.
2. **Một harness chuẩn cho từng project** — hiến pháp / rules / structure / TODO / changelog + plan đánh số, để agent bám theo thay vì mỗi repo một kiểu.

Trí tuệ là **agent đang lái terminal**, không phải zemory (điều 6). zemory chỉ lo **nhớ** + **kỷ luật**.

**Hệ quả — repo này còn là NGUỒN CHUẨN GỐC để project khác copy:** `docs_template/` là bản mẫu TRẮNG mọi repo khác lấy về (`docs/agent/*` + `docs/plan/*` là docs RIÊNG đã điền của chính zemory, KHÔNG phải bản mẫu). Nên agent của **project khác** ghé vào đây chỉ được **ĐỌC** (đọc `docs_template/` → áp vào repo của họ, chạy lệnh bên họ); **cấm ghi / cấm chạy lệnh `zemory` với cwd ở đây** khi user chưa cho phép — repo này thường có phiên agent khác đang làm việc. Banner ⛔ ở đầu `AGENTS.md` là cửa chặn; luật đầy đủ ở `Rule_Gate_44_RepoScope`.

**PHI-MỤC-TIÊU (cố tình KHÔNG làm):**
- **Không proxy / không tự gọi model API** (điều 6) — không `ANTHROPIC_BASE_URL`, không rewrite history, không sinh văn bản.
- **Không nén ngữ cảnh (compression)** — từng build rồi **BỎ khỏi scope 2026-06-25** (không cho net saving thật trên subscription); code ở `attic/`, xem plan 03 DROPPED.
- **Không cố định NỘI DUNG docs của project** — zemory chỉ cố định **cấu trúc folder + rule chung + bộ harness**; nội dung do agent/user viết, bám chuẩn là đủ (điều 3, FILE WINS).
- **Không dựng kho thứ hai / không auto-summary thành nguồn** (điều 3).
- **Không đụng ngoài phạm vi được giao** — project khác, remote git: cấm ghi khi chưa được phép (xem `Rule_Gate_44_RepoScope`).

## Sửa đổi hiến pháp
- **Chỉ user quyết** — cả §Mục đích lẫn §Điều khoản. Agent thấy cần sửa/thêm → **HỎI user ngay trong phiên**, user gật mới ghi; KHÔNG tự sửa file này. *(Luật đầy đủ về cửa vào — kể cả vế BÃI BỎ "đậu đề xuất vào `04_TODO` chờ duyệt" — nằm ở `Rule_Gate_38_TodoDoor`. Không lặp ở đây.)*
- Khi user chốt đổi: cập nhật tại đây + ghi `05_CHANGES.md` (supersede — nêu điều cũ, lý do đổi).

## Làm gì, cho ai

zemory giúp coding agent (Claude Code · Codex · Continue · LM Studio) trên mọi project của máy nhớ được việc phiên trước qua một Global Memory chung và bám một harness chuẩn, để người dùng không phải kể lại và mọi repo theo cùng một kiểu (§Mục đích).

## Ưu tiên tối cao

Khi chất lượng truy hồi của bộ nhớ xung đột với dung lượng hay một khoản tốc độ vặt ⇒ chất lượng thắng (`Cons_Core_115_MemoryQualityFirst`, điều 15).

## Ngoài phạm vi

Danh sách PHI-MỤC-TIÊU ở §Mục đích: không proxy, không tự gọi model API · không nén ngữ cảnh · không cố định nội dung docs của project · không dựng kho thứ hai, không auto-summary thành nguồn · không đụng ngoài phạm vi được giao.
