<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
<!-- HIẾN PHÁP riêng của zemory — CHỈ USER được chốt/sửa; agent đề xuất qua TODO, không tự đổi -->
# zemory — Hiến pháp (bất biến kiến trúc)

> **Tầng TỐI CAO của harness — đọc TRƯỚC mọi file khác.** Mọi plan / code / quyết định phải đối chiếu về đây; **vi phạm = bug thiết kế**, kể cả khi code chạy được.
> KHÁC `02_RULES.md`: RULES là luật LÀM VIỆC chung mọi project (ship từ template); hiến pháp là bất biến KIẾN TRÚC **riêng của zemory** — mỗi app một bản, như mỗi quốc gia một hiến pháp.
> **1 nguồn sự thật cho "luật riêng":** luật riêng của zemory chốt Ở ĐÂY (gom 2026-07-14 từ các điều nằm rải trong plan 00/02/04–08/10–12). Plan/spec chỉ DẪN CHIẾU điều khoản (`HP điều N`), KHÔNG tự phát sinh luật mới nằm rải trong plan.

## Mục đích

**zemory là lớp quản trị BỘ NHỚ + CONTEXT cho coding agent — một lõi dùng chung cho MỌI project trên máy.** Hai vai, không hơn:
1. **Một bộ não chung** — mọi phiên agent (Claude Code · Codex · Continue · LM Studio) + web chat (ChatGPT…) được ingest vào MỘT SQLite local, dedup, redact, tìm được bằng cả keyword lẫn ngữ nghĩa, **xuyên project và xuyên máy** (sync bundle mã hóa). Mục tiêu thật: agent **nhớ được việc phiên trước** thay vì bắt user kể lại — đó là chỗ token thật sự tiết kiệm (điều 1).
2. **Một harness chuẩn cho từng project** — hiến pháp / rules / structure / TODO / changelog + plan đánh số, để agent bám theo thay vì mỗi repo một kiểu.

Trí tuệ là **agent đang lái terminal**, không phải zemory (điều 6). zemory chỉ lo **nhớ** + **kỷ luật**.

**Hệ quả — repo này còn là NGUỒN CHUẨN GỐC để project khác copy:** `docs_template/` là bản mẫu TRẮNG mọi repo khác lấy về (`docs/agent/*` + `docs/plan/*` là docs RIÊNG đã điền của chính zemory, KHÔNG phải bản mẫu). Nên agent của **project khác** ghé vào đây chỉ được **ĐỌC** (đọc `docs_template/` → áp vào repo của họ, chạy lệnh bên họ); **cấm ghi / cấm chạy lệnh `zemory` với cwd ở đây** khi user chưa cho phép — repo này thường có phiên agent khác đang làm việc. Banner ⛔ ở đầu `AGENTS.md` là cửa chặn; luật đầy đủ ở `02_RULES` §Phạm vi project.

**PHI-MỤC-TIÊU (cố tình KHÔNG làm):**
- **Không proxy / không tự gọi model API** (điều 6) — không `ANTHROPIC_BASE_URL`, không rewrite history, không sinh văn bản.
- **Không nén ngữ cảnh (compression)** — từng build rồi **BỎ khỏi scope 2026-06-25** (không cho net saving thật trên subscription); code ở `attic/`, xem plan 03 DROPPED.
- **Không cố định NỘI DUNG docs của project** — zemory chỉ cố định **cấu trúc folder + rule chung + bộ harness**; nội dung do agent/user viết, bám chuẩn là đủ (điều 3, FILE WINS).
- **Không dựng kho thứ hai / không auto-summary thành nguồn** (điều 3).
- **Không đụng ngoài phạm vi được giao** — project khác, remote git: cấm ghi khi chưa được phép (xem `02_RULES` §Phạm vi project, §Git).

## Điều khoản

1. **Mục tiêu tối thượng: TIẾT KIỆM TOKEN — cái nào tối ưu hơn thì dùng.** Ưu tiên *gọi / extend* tool tốt nhất hiện có hơn là tự viết lại (kể cả tool ngoài, nếu license cho phép). Chỉ tự build khi không có sẵn cái tốt hơn, hoặc phải sửa đúng phần lõi mà extend không với tới. KHÔNG thờ rule cũ nếu có đường tối ưu hơn — rule phục vụ mục tiêu, không phải ngược lại. *(gốc: build plan §1–2)*

2. **Ranh giới "của mình vs của người ta".** `backend/src/` = 100% code của mình, một giọng. Engine/lib/model public = gọi qua dependency/adapter (`external/` nếu clone repo) — **KHÔNG dán source người khác vào backend**. Model weight **tải/cache lúc runtime, KHÔNG commit vào repo**; dependency/model mới phải rà license (Apache-2.0 tương thích) trước khi thêm. *(gốc: build plan §2.2, §7)*

3. **Mỗi lớp dữ liệu có ĐÚNG MỘT nguồn; mọi index là lăng kính DẪN XUẤT.** Curated docs (rules/plan/TODO/changelog): **FILE `.md` là NGUỒN** — agent viết/sửa tự do BÁM CHUẨN harness; DB doc/section/changelog chỉ là **INDEX dẫn xuất** cho search, dựng lại được từ file (**file wins**). Episodic: transcript gốc của host là nguồn, `sessions/messages` + FTS + vector + digest là dẫn xuất — **vứt/dựng lại được bất cứ lúc nào**. Hệ quả bất di bất dịch: **tối ưu/can thiệp CHỈ vào lớp dẫn xuất — KHÔNG BAO GIỜ xóa/sửa `sessions`/`messages` gốc**; không tạo kho thứ hai, không auto-summary thành nguồn thứ hai. *(SỬA ĐỔI 2026-07-16, user quyết — bãi bỏ vế cũ "DB là nguồn curated docs, .md là mirror": zemory chưa đủ ổn định để làm nguồn NỘI DUNG docs; nó chỉ cố định CẤU TRÚC folder + RULE chung + BỘ HARNESS, agent viết docs bám theo chuẩn là được. Gốc: build plan §2.3 §5, plan 02 §0 — phần curated đã supersede; xem changelog.)*

4. **1 capability = 1 slot = 1 provider.** Registry ép conflict nếu 2 module đòi cùng slot; engine phụ (vector, rerank) là engine NỘI BỘ của slot `search`, không tạo slot mới. *(gốc: build plan §2.4, plan 04 §3, plan 05 §1)*

5. **Tách BỘ MÁY (tool) khỏi DỮ LIỆU (docs project).** Tool cài toàn máy, đọc docs của project; không nằm trong project. Root project chỉ cần `AGENTS.md`; config ở `docs/.harness.json`. *(gốc: build plan §2.8, plan 04 §4)*

6. **zemory KHÔNG BAO GIỜ tự gọi LLM / không proxy model API.** Không `ANTHROPIC_BASE_URL`, không rewrite history/cache, không sinh văn bản. "Trí tuệ" là agent đang lái terminal; zemory chỉ là bộ nhớ + kỷ luật. Embed/rerank model nhỏ chạy local chỉ *đo nghĩa* (chấm điểm/xếp hạng), không *sinh văn bản* — vẫn đúng luật. *(gốc: build plan §2.5 §2.7, plan 05 §2, plan 06 §2.4 §4B)*

7. **Local-only + privacy mặc định.** Mọi dữ liệu nằm trên máy user; không transmit đi đâu ngoài bundle **mã hóa** do user chủ động sync. Credential-shaped content bị redact NGAY lúc ingest (mọi đường: file, web). Password/2FA của nền web **không bao giờ nhập vào zemory** (login trên trang thật, chỉ mượn phiên). **KHÔNG commit data thật/PII vào git** — chỉ code + docs; bundle sync phải là `.enc`. *(gốc: plan 07 §4 §13 §14, plan 08, share.ts design)*

8. **Recall on-demand + progressive disclosure — KHÔNG auto-inject.** Agent tự gọi khi cần; search trả snippet/ID trước, mở message/section/digest cụ thể khi cần. Không nhét broad memory vào mỗi prompt. *(gốc: build plan §2.6 §5, plan 04 §4, plan 06 §6)*

9. **Fail-open ở mọi lớp phụ.** Vector/rerank/digest/model lỗi hay thiếu → recall RƠI VỀ FTS/heuristic, không bao giờ chết theo. FTS5 là baseline LUÔN CÓ; lớp semantic chỉ THÊM, không thay. *(gốc: plan 05 §2, plan 06 §7, plan 12)*

10. **Capture cơ học, 0 token, không vượt quyền host.** Hook chỉ đọc transcript file incremental — không gọi model, không rewrite command, không bypass permission của host. App cơ học, agent phán đoán; quyết định curated do user/agent duyệt. *(gốc: build plan §2.7, plan 04 §7)*

11. **Sync xuyên máy = ADDITIVE, provenance KHÔNG LẪN.** Merge chỉ thêm, không ghi đè; mỗi session giữ nguyên `host`/`origin`/`source` gốc — bộ chọn scope chỉ *lọc*, KHÔNG đổi/gộp nguồn, KHÔNG xóa (muốn xóa phải qua `forget` tường minh có dry-run + backup). DB sống không bao giờ đặt trong folder cloud-sync (WAL corrupt). *(gốc: plan 08 §1 §5, plan 02 §0, relocate design)*

12. **Đo trung thực + gate trước khi bật mặc định.** TUYỆT ĐỐI không trưng số counterfactual/ảo ("tiết kiệm N token" khi không đo được). Mọi lớp mới (hybrid, rerank, dims, migration…) chỉ bật mặc định SAU khi qua gate: benchmark thắng net trên corpus có nhãn + test + migration an toàn + health check + fallback rõ. *(gốc: build plan §2.1, plan 04 §9, plan 05 §2 §6, plan 10, plan 12 §2)*

## Sửa đổi hiến pháp
- **Chỉ user quyết** — cả §Mục đích lẫn §Điều khoản. Agent thấy cần sửa/thêm → ghi đề xuất vào `05_TODO.md` chờ duyệt, KHÔNG tự sửa file này.
- Khi user chốt đổi: cập nhật tại đây + ghi `06_CHANGES.md` (supersede — nêu điều cũ, lý do đổi).
