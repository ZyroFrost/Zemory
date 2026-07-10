<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory changelog add` -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-07-10] — fix(app): quét sạch mọi finding P2/P3 — UI guard, import merge, render salvage, CDP port, WAL race, con trỏ treo, CLI error, thread cap

Dọn nốt toàn bộ finding P2/P3 còn treo của đợt audit — app không còn finding mở.

- **UI chống DNS-rebinding/CSRF** ([ui.ts](../../backend/src/ui.ts)): mọi request phải có `Host` loopback và (nếu có) `Origin` loopback, sai → 403. Verify sống bằng curl: Host `evil.com` → 403, Origin lạ POST `/relocate` → 403, trang cockpit → 200.
- **`changelog import` hết phá dữ liệu** ([changelog.ts](../../backend/src/docs/changelog.ts)): mặc định MERGE — chỉ thêm entry chưa có (khớp date+title), giữ nguyên id/`archived`/`supersedes`; wipe-reseed phải gọi `--replace` tường minh.
- **Render mirror không nuốt hand-edit** ([plan.ts](../../backend/src/docs/plan.ts), schema v10 `doc.rendered_hash`): render lưu sha1; lần render sau nếu file trên đĩa lệch hash (bị sửa tay) → cứu nguyên bản ra `.hand-edited-<ts>.bak` + cảnh báo, rồi mới ghi đè. `renderChangelog` cũng cứu file không có header GENERATED.
- **scan-web hết kẹt port 9222** ([scanweb.ts](../../backend/src/brain/scanweb.ts)): nếu 9222 không có CDP mà TCP lại bận (process khác chiếm) → tự lấy port rảnh cho phiên đó thay vì launch browser fail câm.
- **relocate hết WAL-race** ([relocate.ts](../../backend/src/brain/relocate.ts)): checkpoint → `BEGIN IMMEDIATE` (chặn mọi writer) → xác nhận WAL rỗng → count + copy trong lock; writer chen ngang → retry, 3 lần fail → báo "close other zemory processes".
- **Con trỏ treo hết tạo brain rỗng âm thầm** ([db.ts](../../backend/src/brain/db.ts)): `location.json` trỏ folder không có DB trong khi `~/.zemory` vẫn còn DB cũ → cảnh báo to 1 lần kèm cách sửa.
- **CLI hết nổ UnhandledRejection** ([cli.ts](../../backend/src/cli.ts)): bọc toàn bộ dispatch — mọi lỗi in 1 dòng `zemory <cmd>: <message>` + exit 1 (verify: `brain export` path không tồn tại).
- **Thread 5000-msg hết cắt âm thầm** ([search.ts](../../backend/src/brain/search.ts)): `getSessionThread` trả cờ `truncated`, dialog UI hiện "(hiển thị 5000 đầu — phiên còn dài hơn)".

**Verify:** 66/66 test (thêm docs-guard.test.mjs: merge-giữ-archived + salvage hand-edit); DB thật migrate v10 sạch; guard UI test sống 4/4.

## [2026-07-10] — fix(privacy+storage): bịt lỗ digest lane của forget/redact + path DB động toàn hệ thống + mở gitignore cho share bundle

Fix 3 finding của đợt audit sau khi dời DB sang D:.

- **P1 privacy — forget/redact bỏ sót `session_digest`** ([privacy.ts](../../backend/src/brain/privacy.ts)): digest TRÍCH NGUYÊN VĂN message (tasks/errors/digest_text) và được index FTS riêng → nội dung đã `forget` vẫn tìm được qua `search --digest`, secret đã `redact` vẫn nằm trong digest. Nay: `forget --force` xóa luôn digest của các session bị đụng (trigger dọn 2 bảng FTS; digest rebuild từ message còn lại), `redact` scrub cả 5 cột text của digest (redact chuỗi JSON an toàn vì mọi pattern chỉ khớp `[A-Za-z0-9_.-]`). CLI in thêm số digest. +2 test.
- **P1 git — bundle share không bao giờ vào git**: `.gitignore` có `*.zemory.enc` chặn chính `share/global_memory.zemory.enc` mà share/README mô tả là "tracked by Git LFS" → máy khác clone không restore được. Thêm exception `!share/global_memory.zemory.enc`.
- **P2 — path DB đóng băng lúc load module**: 15 file dùng const `BRAIN_DB`/`BRAIN_DIR` (docs/plan, changelog, digest, search, scope, savings, settings, scanweb, ui, archive, recall, share, vectors, embed, relocate) → server `zemory ui` đang chạy vẫn đọc/ghi vị trí CŨ sau khi relocate. Nay mọi default resolve qua `currentBrainDb()`/`currentBrainDir()` (đọc con trỏ mỗi lần gọi); `settings.ts` đổi `CONFIG_PATH` const thành hàm để config.json cũng đi theo.

**Verify:** 64/64 test xanh; trên DB thật `brain redact` dry-run quét 112.400 msg + 1.131 digest (0 secret); `brain where` vẫn trỏ D:.

## [2026-07-10] — fix(brain): model cache + openBrain theo vị trí đã dời; relocate mang model theo

Hoàn thiện tính năng dời-nơi-lưu để **thật sự đưa dữ liệu nặng khỏi ổ hệ thống**, phát hiện khi dời DB thật (938MB) mà ổ C vẫn còn ~6GB.

- **embed model cache theo BRAIN_DIR** ([embed.ts](../../backend/src/brain/embed.ts)): trước dùng `homedir()` cố định → 598MB model kẹt ở C sau relocate và phình thêm nếu đổi model. Nay `cacheDir = <brain-dir>/models` (env `ZEMORY_MODEL_DIR` vẫn override) → model đi theo DB.
- **openBrain đọc con trỏ ĐỘNG** ([db.ts](../../backend/src/brain/db.ts) `currentBrainDb()`): default resolve lại `location.json` mỗi lần mở → tiến trình dài (server `zemory ui`) nhận relocate mà không cần restart cho mọi thao tác đi qua `openBrain`.
- **relocate mang model theo** ([relocate.ts](../../backend/src/brain/relocate.ts)): sau khi dời DB, best-effort `cpSync` `models/` sang chỗ mới (non-critical; re-cache nếu lỗi).

**Đã thực thi trên máy này:** dời DB `C:\…\.zemory` → `D:\Zyro\Tool\Zemory\data` (937.8MB, 112.400 msg verified) + move model (598MB). `brain where` xác nhận trỏ D.

**Còn lại (chưa tự động):** một số hàm (`vectors`/`share`/`privacy`) vẫn lấy default `BRAIN_DB` const → trong 1 tiến trình đang chạy chỉ đọc đúng vị trí mới sau khi khởi động lại (CLI mới thì luôn đúng). Backup DB cũ + browser profile cũ ở C là rác lịch sử, xoá tay để giải phóng.

**Verify:** `npm run check` xanh (62 test).

## [2026-07-10] — feat(brain): dời nơi lưu DB off ổ C — con trỏ location.json + brain relocate + UI 'Nơi lưu'

Cho phép **dời DB brain KHỎI ổ hệ thống** (ổ C phình không kiểm soát — hiện đã ~938 MB) sang folder local bất kỳ, vd `data/` trong repo (gitignore). Đặt được ngay chỗ Drive-sync trong cockpit, kèm tự-dời an toàn.

**Vì sao:** `global_memory.db` lớn dần vô hạn theo số session; nằm ở `~/.zemory` trên ổ C làm đầy ổ. Trước đây chỉ đổi được qua env `GLOBAL_MEMORY_DB` (ẩn, không persist tiện). Nay có setting + script dời.

**Cơ chế (an toàn, khó-đảo nên làm kỹ):**
- **Con trỏ bootstrap** `~/.zemory/location.json` `{dataDir}` — CỐ ĐỊNH ở home (không thể để cạnh DB: gà–trứng). Thứ tự: env `GLOBAL_MEMORY_DB` > pointer > `~/.zemory` default. Mọi phụ trợ (`config.json`/`browser`/`imports`/`backups`) bám `BRAIN_DIR` nên dời theo cụm. Default GIỮ nguyên `~/.zemory` (không phá máy đang chạy).
- **`brain/relocate.ts`** — `relocateBrain()`: checkpoint WAL → copy `.db`(+`config.json`) → **verify** (`PRAGMA integrity_check` + đếm message khớp) → chỉ khi OK mới đổi con trỏ → GIỮ bản cũ đổi tên `.relocated-*.bak` (không xoá, rollback được). Chặn folder cloud-sync (Google Drive/OneDrive/Dropbox…) trừ `--force` (WAL sống trên Drive = corrupt).
- **CLI**: `zemory brain where` (xem DB ở đâu + size + con trỏ) · `zemory brain relocate <dir> [--force]`.
- **UI cockpit**: ô **"Nơi lưu (máy)"** ngay cạnh "Drive folder" + nút **⇄ Dời**; xác nhận → "đang dời…" → báo bản cũ giữ ở đâu.

**Chuẩn:** cơ chế thuộc data-access domain brain → `backend/src/brain/relocate.ts` (KHÔNG dùng slot `storage/`=blob để tránh lẫn tên). `02_STRUCTURE` thêm routing "nơi lưu DB local + dời off ổ hệ thống" + convention "Nơi lưu DB (di dời)".

**Verify:** `npm run check` xanh (**62 test**, +5 relocate: move+verify+giữ-bak, chặn cloud, pointer-only khi chưa có DB, env-pin chặn, storageInfo). Embedded UI JS parse OK. `brain where` trên máy thật đọc đúng (C:\…\.zemory, 937.8 MB). Chưa tự dời DB thật — user tự bấm khi muốn.

## [2026-07-10] — feat(structure): chuẩn v2 — 2 trục layer/domain-first + phủ đủ slot + luật không-folder-rỗng

Nâng chuẩn cấu trúc (`docs/agent/02_STRUCTURE.md` + `docs-template/`) lên **v2** để phủ đủ mọi project — cái gì cũng có slot gắn vào, không lệch/lẫn, và **KHÔNG đẻ folder rỗng**.

**Vì sao:** audit chuẩn cũ thấy 1 lỗ hổng gốc + 4 vùng hở — chuẩn chỉ mô tả *layer-first* nhưng chính zemory tổ chức *domain-first* (`brain/`/`docs/`/`core/`), nên mọi app nhiều-domain sẽ tự lệch; thiếu nhà cho code dùng chung BE↔FE (chỉ có `types/` type-only), thiếu tên slot cho cache/blob/notifications/search/pipeline/contracts/plugins/codegen; frontend thiếu `util/`/`types/`; và ★ bắt buộc `backend/run.*` khiến chính zemory (Node-CLI, bin ở root) non-conformant.

**Đã làm:**
- **§2 mới — 2 trục sắp xếp:** LAYER-FIRST (slot phẳng dưới `src/`) vs DOMAIN-FIRST (`src/<domain>/` lồng lại slot); cross-cutting luôn ở `src/` gốc. Công nhận cách zemory đang tổ chức → không cần đập cấu trúc.
- **Cây gom theo 6 dải vai trò** (biên-vào · biên-ra · xử-lý · nền-tảng · chia-sẻ · domain) — dễ quét.
- **+10 slot:** `cache/` `storage/` `notifications/` `search/` `pipelines/` `core/` `shared/`(nâng từ `types/`, thêm runtime dùng chung) `contracts/` `plugins/` `generated/`; frontend `+util/ +types/`.
- **Luật KHÔNG folder rỗng** nêu nổi bật: INDEX = từ điển tên để TRA, tạo folder chỉ khi có concern thật (app điển hình 4–10 slot).
- **Sửa ★:** entry = `run.*` HOẶC manifest `bin`/`main`; manifest ở root HOẶC `backend/` → zemory (bin root) nay ĐẠT ★. Thêm convention **UI-embed single-binary** (giữ `ui-page.ts` ở backend, ghi rõ).
- **plan 09** cập nhật quyết định "Chuẩn v2" + sửa cross-ref số mục (§2→§3 cây, §3→§4 routing, §4→§5 convention).
- **README** sửa 2 ref sai: ảnh `assets/`→`frontend/assets/cockpit.png`, `docs/agent/04_STRUCTURE.md`→`02_STRUCTURE.md`.

**Conformance zemory:** domain-first hợp lệ → `brain/`/`docs/`/`core/` GIỮ NGUYÊN, không di chuyển file, không tạo folder mới. `npm run check` xanh (57 test), `zemory validate`/`doctor` xanh.

## [2026-07-10] — docs: update every idea/plan doc — fix 01/00 stale refs, expand plan 09 with all later structure decisions, plan 04 status



## [2026-07-10] — docs(structure): deploy backup is BIDIRECTIONAL — verify VM backup vs local attic/ before overwrite, resync after



## [2026-07-10] — docs(structure): split version-up into AUTO (update/) vs MANUAL deploy-to-VM (git tag+dist+deploy-script+attic backup)



## [2026-07-10] — docs(structure): wire update/ to attic/(backup)+dist/(build)+migrations/(schema) — was floating alone



## [2026-07-10] — docs(structure): add version-up (self-update) as a first-class concern — backend/src/update/



## [2026-07-10] — docs: sweep stale backend/src paths in TODO+plan (00/02/05); fix plan 08 status (scope was already built, doc said 'idea only')



## [2026-07-10] — docs(structure): document zemory's own share/ sync-bundle exception in 02_STRUCTURE — was undocumented



## [2026-07-10] — fix(harness): status.ts REQUIRED_DOCS + ui-page.ts STD chip list were still on old doc names



## [2026-07-10] — fix(harness): auto-rename legacy doc filenames (02_TODO/03_CHANGES) on sync — old projects were permanently blocked from gaining 02_STRUCTURE.md

Fix regression: renumber (02_TODO/03_CHANGES → 03_TODO/04_CHANGES) khoá mọi project cũ khỏi nhận 02_STRUCTURE.md.

Phát hiện: user hỏi "đã áp chuẩn cho project khác chưa" → test `zemory sync` trên SasinFlow thật → nó KHÔNG kéo 02_STRUCTURE.md, báo "existing docs non-standard". Nguyên nhân: STANDARD_AGENT đổi tên nhưng project cũ vẫn giữ tên cũ (02_TODO.md/03_CHANGES.md) — filename không khớp danh sách mới → bị coi non-standard → nhánh gap-fill (fill()) không bao giờ chạy → mọi project có harness TRƯỚC lần renumber này vĩnh viễn không nhận được 02_STRUCTURE.md qua sync.

Fix (backend/src/adopt.ts):
- Thêm LEGACY_RENAME map (02_TODO.md→03_TODO.md, 03_CHANGES.md→04_CHANGES.md).
- Trước khi tính agentMd/nonStandard: tự rename file cũ→mới (cơ học, an toàn, không đụng nội dung).
- Vì TODO là DB-source doc (project_root+path), rename file phải kèm UPDATE doc.path trong global_memory.db (openBrain) — nếu không, project đó vĩnh viễn không match doc row, và render sau này sẽ ghi đè/tạo trùng. CHANGES không cần (nó render từ bảng changelog riêng, không phải doc table).
- Verify: chạy `zemory sync` thật trên SasinFlow → rename đúng, 02_STRUCTURE.md (bản mới nhất, có i18n/audit/logging) gap-fill thành công, doc.path (id 136) cập nhật đúng KHÔNG tạo doc trùng. npm run check 57/57 PASS.

## [2026-07-09] — docs(structure): add server-side i18n (backend/resources/locales) — was frontend-only



## [2026-07-09] — chore(harness): renumber docs — 02_STRUCTURE after RULES; TODO→03, CHANGES→04

Đổi số file harness: cấu trúc lên #2 (đọc ngay sau RULES).

Thứ tự cũ 01_RULES/02_TODO/03_CHANGES/04_STRUCTURE → MỚI: 01_RULES · 02_STRUCTURE · 03_TODO · 04_CHANGES.
Lý do: STRUCTURE là nền tảng "how" (như RULES) → đọc trước; TODO/CHANGES là backlog/history → xuống dưới.

- Rename 6 file (git mv, docs/agent + docs-template/agent, giữ history).
- Code: STANDARD_AGENT (adopt) + STANDARD/mapping (migrate, +structure) + archive/cli/changelog paths (03_CHANGES→04_CHANGES) + structure cmd (→02_STRUCTURE).
- DB: doc.path của TODO (doc 111) → 03_TODO; refs trong RULES(#1058) + plan 09(§1-4) + TODO header(#1089) cập nhật.
- AGENTS §7/§8 + 02_STRUCTURE nội bộ (docs/ tree line thêm 02_STRUCTURE) cập nhật.
- Verify: build + 57 test PASS · docs render KHÔNG orphan · structure→02_STRUCTURE · validate 0 broken link · changelog add ghi đúng 04_CHANGES.

## [2026-07-08] — docs(structure): root config files = open catch-all (tool-forced, leave alone) — not an exhaustive list



## [2026-07-08] — docs(structure): sweep buried cross-cutting concerns — add errors/ logging/ audit/ + meta rule 'every concern must be explicit'

Quét + vá các concern cross-cutting còn NGẦM trong 04 (giống encryption/authz).

Audit 04 → phát hiện 0 lần nhắc: logging, logger, observability, metrics, error, feature-flag, health. Vá:
- §2 index: thêm **errors/** (error types + central handler) · **logging/** (logger + observability, log→data/logs, service→integrations) · **audit/** (audit-trail bảo mật, bảng→store).
- §3 routing: thêm lỗi/handler · logging/observability · audit-trail · feature-flag(→config) · health-check(→api).
- §4 luật: Logging/Observability · Audit trail (KHÁC log debug) · Error handling (không rải try/catch) · **META "Cross-cutting = RÕ": mọi concern xuyên suốt phải có place+type → audit không lọt; thiếu → BÁO thêm vào chuẩn.**

→ Chuẩn giờ liệt kê ĐỦ concern cross-cutting: authn/authz/encryption/secret/validation/error/logging/audit/rate-limit/cors/cache/i18n/feature-flag/health. Concern-không-trong-chuẩn = lọt (bài học từ encryption).

## [2026-07-08] — docs(structure): add authorization/phân quyền as first-class concern; record zemory's accept-plaintext + no-authz decisions

Thêm PHÂN QUYỀN/Authorization thành concern rõ ràng trong 04 (giống encryption — trước lấp ló trong auth/).

- §2 tree `auth/`: tách rõ AUTHENTICATION (là ai: login/jwt/oauth) vs AUTHORIZATION/PHÂN QUYỀN (được gì: role/permission/policy); enforce → middleware/.
- §3 routing: tách "authentication/login → auth/" và thêm "phân quyền/authorization (role·permission·policy) → auth/(định nghĩa) + middleware/(enforce) + store/(role-data) + config/(policy operator)".
- §4 convention: luật "Phân quyền/Authz" — app đa-user/đa-role PHẢI có; single-user/local ghi rõ "không phân quyền".

QUYẾT ĐỊNH zemory (ghi rõ theo luật mới):
- **Mã hóa at-rest: KHÔNG làm — chấp nhận plaintext.** Lý do: DB `~/.zemory/` local cá nhân, không share; redaction + OS file-perm đủ. SQLCipher để dành khi share/đóng gói phát hành.
- **Phân quyền: KHÔNG có — single-user/local.** zemory là tool cá nhân 1 người dùng, không đa-user → không cần role/permission.
- (Nên dọn 5 file .bak plaintext 400-935MB ở ~/.zemory/ — việc vận hành, không phải code.)

## [2026-07-08] — docs(structure): make encryption a first-class concern in 04 (place + type + rule) — was buried in vault/

Đưa MÃ HÓA thành concern rõ ràng trong 04_STRUCTURE (trước chỉ lấp ló trong vault/).

Gap phát hiện: user hỏi "sao refactor không lòi ra DB chưa mã hóa" — vì 04 không có place+type riêng cho encryption → audit/refactor không bắt được. Vá:
- §2 tree: `store/` ghi rõ "MÃ HÓA at-rest (SQLCipher) apply ở đây nếu data nhạy cảm"; `vault/` đổi thành "MÃ HÓA + KEY: derive key, encrypt/decrypt, credential vault".
- §3 routing: thêm dòng "mã hóa/encryption (at-rest DB · key · bundle) → vault/ + store/ + data/secrets/".
- §4 convention: thêm luật "Mã hóa/Encryption" — concern riêng, có place; **app có DATA NHẠY CẢM (chat/PII/log) NÊN mã hóa at-rest; nếu KHÔNG làm phải ghi rõ 'chấp nhận plaintext' để audit thấy, khỏi lọt**.

zemory hiện: DB `~/.zemory/global_memory.db` (935MB, PII chat) = PLAINTEXT, chưa có vault/store cipher → theo luật mới phải quyết: mã hóa hoặc ghi-rõ-chấp-nhận. (Slot vault/ + data/secrets/ đã định sẵn cho khi làm.)

## [2026-07-08] — docs: sync harness with built features — web-capture ChatGPT SHIPPED, savings per-feature, RULES backend/src+external

Đồng bộ docs với chức năng đã build (sau refactor + web-capture + savings per-feature).

- **02_TODO §Web-chat**: đánh dấu ChatGPT ĐÃ SHIP (scan-web `backend/src/brain/scanweb.ts`, schema origin v9, 859 hội thoại + Project chats); Gemini/Claude.ai + facet Local/Web = còn lại. Prototype → attic/web-capture.
- **plan 07** (§title/§5/§10/§15): trạng thái "prototype, chưa vào src" → "v1 SHIPPED ChatGPT"; prototype/ → attic/.
- **plan 10**: title + §3 → dashboard TRUNG THỰC per-FEATURE (% Recall/Digest + catalogue 11 feature n/a), path `backend/src/brain/savings.ts`.
- **01_RULES bất biến #2**: `src/` vs `deps/` → `backend/src/` vs `external/` + trỏ `04_STRUCTURE.md` (deps/ là khái niệm đã bỏ).
- GIỮ nguyên: `03_CHANGES` refs `src/` (lịch sử, đúng thời điểm — không viết lại); plan 00/04 dòng nguyên-tắc cũ (giá trị thấp).

## [2026-07-08] — docs(structure): add .claude/ + catch-all rule for .<tool>/ config folders (tool-forced root, leave alone)



## [2026-07-08] — refactor(structure): dogfood — move zemory itself to the 04_STRUCTURE standard (backend/ frontend/ attic/)

Dogfood: nắn CHÍNH zemory về chuẩn 04_STRUCTURE (git mv giữ history).

- `src/` → `backend/src/` · `test/` → `backend/test/` · `scripts/` → `backend/scripts/`.
- `prototype/web-capture/` → `attic/web-capture/` (nguồn cũ, đã bị brain/scanweb.ts thay).
- `assets/cockpit.png` → `frontend/assets/` (frontend = chỉ asset; UI code-gen vẫn ở backend/src/ui-page.ts).
- `share/` GIỮ root (bundle sync brain qua LFS — tracked cố ý; dồn data/ sẽ hỏng sync).
- Fix path: tsconfig rootDir/include → backend/src; package scripts (clean/lint/test/dev); eslint files; clean.mjs ../../dist; 15 test ../dist→../../dist.
- Fix 2 test migration cũ (hardcode version 6) → so với DB fresh (robust, khỏi vỡ lần bump schema sau).
- .gitignore: prototype→attic path + thêm data/. README + 04 trỏ đúng.
- dist/ + docs-template/ GIỮ root → bin, TEMPLATE_DIR không đổi.
- Verify: npm run check (typecheck+lint+57 test PASS) · zemory structure/validate (backend/frontend/docs/attic — hết cảnh báo thiếu frontend) · UI Cockpit + /savings chạy.

## [2026-07-08] — feat(harness): add 04_STRUCTURE.md — structure standard as its own agent doc; RULES/structure/validate/AGENTS point to it

Tách chuẩn cấu trúc ra file harness thứ 4: docs/agent/04_STRUCTURE.md.

- **04_STRUCTURE.md** (markdown source, như 01_RULES) = chuẩn cấu trúc ĐẦY ĐỦ: §1 nguyên tắc · §2 cây từng-dòng (marker ★BẮT BUỘC/[opt], 3 nhóm tracked/root/gitignore) · §3 routing "sửa gì→đâu" · §4 convention (gộp review GPT 9.8) · §5 phạm vi. Ship cho MỌI app.
- Wire vào STANDARD_AGENT (adopt.ts) → mọi `zemory init` scaffold kèm; không bị coi là non-standard.
- 01_RULES §Cấu trúc → rút còn CON TRỎ tới 04 (bất biến 4 + link).
- `zemory structure` → tóm tắt + trỏ 04. `zemory validate` + AGENTS §7/§8 → tham chiếu 04.
- plan 09 → rationale/quyết định + trỏ 04 (không lặp cây, tránh 2 bản lệch).
- Nội dung chuẩn (chốt qua nhiều vòng + 2 app mẫu SasinFlow/zemory): 1 tên/concern · store/=data-access(remote/cloud/nội-bộ DB) · store/queries gom SQL · config/=file operator (password_env) · vault · resources(prompts/sql/seed/packaging) · ai/+data/models · frontend Dialog 3-size · data/ chia con · version/packaging dùng slot cũ.

## [2026-07-07] — docs(harness): update refactor recipe (AGENTS §7/§8) to new standard — attic/data/.env/CI + test optional



## [2026-07-07] — feat(structure): audit standard — patch 5 gaps (.github/.env/shared-types/fe-test/migrations), demote test to optional

Chuẩn cấu trúc repo — vá 5 chỗ lọt + hạ test xuống optional (audit toàn diện).

- **Bắt buộc rút còn 4:** backend/(code) · frontend/ · docs/ · AGENTS.md. test/scripts/infra/migrations = OPTIONAL (trước ghi sai là bắt buộc).
- **TEST không ép:** thực tế chạy chính app = bàn test; folder test chỉ cho lõi logic dễ sai ngầm (như zemory 15 test). App UI thường → bỏ.
- **5 chỗ vá (app thật có nhưng chuẩn chưa xếp):**
  1. `.github/` (CI/CD) + `.vscode/`/`.idea/` (editor) → ROOT (tool ép, như Docker).
  2. `.env` = secret buộc root + gitignore (dotenv đọc ./.env); `.env.example` = tracked. Secret khác (.key/bundle/.db) → data/.
  3. type/contract dùng chung BE↔FE → backend/src/types/, FE import (KHÔNG đẻ shared/).
  4. test frontend/E2E → frontend/test/ (đối xứng backend/test/).
  5. backend/migrations/ (schema/DB migration — app log/db).
- **attic/ reframe:** backup nguồn cũ + SNAPSHOT bản tốt trước khi up server (rollback khi deploy hỏng).
- Ghi vào: plan doc 09 (§2 cây/§3 routing/§4 quyết định) + docs-template RULES §Cấu trúc + `zemory structure` + `zemory validate` (required = 4, test không ép, present[] thêm attic).

## [2026-07-07] — feat(ui): savings dashboard = % per feature column + TỔNG %; merge recall, add digest

Savings dashboard = bảng %: mỗi feature 1 CỘT, ô = **% token tiết kiệm**, cột CUỐI = TỔNG %.

- Ô = % = token tránh ÷ token nguồn (hover xem token thô). Trước đây để token thô — sai; giờ đúng là %.
- Gộp `search`+`show` → 1 feature **`recall`** (show là drill-down TRONG recall, bỏ log riêng, hết double-count). Migration v9 UPDATE các dòng cũ về 'recall'.
- Thêm feature **`digest`** đo thật: đọc digest gọn vs full session (logDigestRecall — baseline=messages, actual=digest_text).
- savingsByDay trả thêm baseByFeature + baseline mỗi dòng để UI tính %.
- Bảng "tất cả tính năng": liệt kê đủ 11 feature — đo được (Recall/Digest) có số; scoped/index/harness/capture/sync/webcap/rerank/ui = n/a (chất lượng / counterfactual / enabler), KHÔNG phịa.
- Verify: recall 99.88% · digest 99.23% · TỔNG 99.75%.

## [2026-07-07] — feat(ui): per-feature savings pivot — 1 column per feature (search/show) + TỔNG cột cuối

Savings đa-feature: mỗi feature 1 CỘT, cột CUỐI = TỔNG.

- `recall_savings` + cột **`feature`** (schema v8 + ALTER an toàn). Log per-feature: **`search`** (brain_search recall), **`show`** (brain_show / UI brain-context — drill 1 message vs cả session). Sẵn khung cho `plan`/`scoped`.
- `savingsByDay()` → **pivot**: `features[]` = các cột, mỗi ngày `byFeature{feature:avoided}`, cột cuối `avoided` = TỔNG; + grand total + recent (kèm feature).
- Dialog render **cột động theo features** + TỔNG cuối; recent list hiện feature mỗi dòng.
- TRUNG THỰC: chỉ feature phát sinh event đo được mới có cột (search/show). index/capture/UI **không đo được → KHÔNG có cột** (không phịa).
- Verify: 2 cột search+show, TỔNG = sum (search 3.9M + show 289k = 4.196.427).

## [2026-07-07] — tweak(ui): savings % per message row + 2-decimal % (99.xx% thay vì 100% phẳng)

Mỗi dòng "Recall gần đây — mỗi message" giờ có cột **%** (≈tránh/nguồn). Toàn bộ % làm tròn **2 số lẻ** (`toFixed(2)`) → lộ variation thật (vd 99.98% / 99.83%) thay vì luôn hiện 100% phẳng. Số tuyệt đối (token tránh) vẫn là chỉ số chính.

## [2026-07-07] — feat(ui): savings counts per message — MCP logging + per-recall list (query/hits) + %

Savings tính THEO TỪNG MESSAGE + đếm đủ mọi đường recall.

- **Log ở CẢ 3 đường recall chủ động:** CLI `brain search`, **MCP `brain_search`** (agent — TRƯỚC THIẾU nên agent recall không đếm), UI Search/Enter (commit=1). Type-ahead không log (tránh thổi phồng).
- **Per-message:** `recall_savings` thêm `query`+`hits` (schema v7 + ALTER an toàn cho DB cũ). `savingsByDay()` trả `recent[]` (25 recall gần nhất).
- **Dialog:** mục "Recall gần đây — mỗi message" (giờ · query · hits · ≈tránh) + cột **%** ở bảng ngày + tổng.
- **Verify:** 3 recall CLI → tổng 1→5, mỗi cái có query/hits/avoided đúng.
- Lưu ý: % ~100% vì baseline = cả session nguồn (cận trên); số có ý nghĩa là token tránh tuyệt đối.

## [2026-07-07] — feat(harness): complete slots — backend/test, backend/scripts, frontend/assets, attic/, data+secret

Bổ sung slot còn thiếu vào chuẩn cấu trúc (lộ ra khi audit zemory để refactor strict):

- **`backend/test/`** — test (own code). Slot BẮT BUỘC (mọi app có test) — trước thiếu hẳn.
- **`backend/scripts/`** — script dev/build của mình.
- **`frontend/assets/`** — asset (icon/logo/font/ảnh) thuộc frontend.
- **`attic/`** — backup nguồn cũ / code đã gỡ, tracked, giữ tham chiếu (optional).
- **`data/`** — thêm secret/key (`.key`, bundle `.enc`) cạnh log/cache; gitignore (bí mật).
- Cập nhật RULES §Cấu trúc repo (routing + bắt buộc/optional), `zemory structure`, plan 09 (tree + routing).
- Bắt buộc = `backend/` (code+test+scripts) + `frontend/` + `docs/` + `AGENTS.md`. Optional: external/ · data/ · attic/ · backend/infra/ · dist,build,.venv.

## [2026-07-07] — docs(harness): mark dist/build (+env/data) OPTIONAL — build output to run the app, only when built

Ghi rõ `dist/`+`build/` (và `.venv/`,`node_modules/`,`data/`) là **OPTIONAL** — output/generated, KHÔNG bắt buộc.

- `dist/`+`build/` = output **đóng gói để CHẠY/MỞ app**, CHỈ có khi app có bước build/package (app chạy thẳng thì không có). Do build sinh ra, gitignore, không commit.
- Bắt buộc chỉ là NGUỒN: `backend/ frontend/ docs/ AGENTS.md`. Optional: `external/ data/ backend/infra/ dist/ build/ .venv/`.
- Cập nhật: RULES §Cấu trúc repo, `zemory structure`, plan 09 (tree đánh dấu [optional] từng folder).

## [2026-07-07] — feat: data/ runtime-data slot in structure standard + % column in savings dialog

Thêm `data/` vào chuẩn cấu trúc + cột % vào dialog token-saved.

- **Chuẩn: `data/`** (root, GITIGNORE) = chỗ app ghi **runtime data/log** (.db log, cache, state lúc chạy). **OPTIONAL** (chỉ khi app có ghi data); app đóng gói có thể dùng OS app-data (`%LOCALAPPDATA%/<App>`) thay. Cập nhật: `docs-template/agent/01_RULES.md` §Cấu trúc repo, `zemory structure`, plan 09 (tree + routing), validate inventory.
- **Dialog "Token saved": thêm cột `%`** = ≈tránh / nguồn (hiệu suất recall, ước tính cận trên) — mỗi ngày + dòng tổng.

## [2026-07-07] — feat(ui): 'Token saved by recall' dialog — per-day, forward-only, honest estimate

Dialog "📊 Token saved by recall" — báo cáo THEO NGÀY, forward-only, ước tính trung thực (đúng ý user: đo trên recall thật).

- **UI**: nút 📊 Saved ở panel Global memory → dialog (size L) bảng theo ngày: `Ngày · Recalls · Nạp (X) · Nguồn (Y) · ≈ Tránh` + dòng TỔNG.
- **Data**: bảng `recall_savings` (db.ts) + `src/brain/savings.ts` (`logRecall`, `savingsByDay`). Endpoint `/savings`.
- **Log CHỦ ĐỘNG**: CLI `brain search` (mọi lần) + UI Search/Enter (`commit=1`). **KHÔNG log type-ahead** (onType → commit=0) để không thổi phồng. Forward-only (từ hôm bật; recall cũ không log lại).
- **Ước tính**: `actual` = token snippet trả về; `baseline` = full token của session(s) nguồn chứa hit; `≈ tránh = baseline − actual` (cận trên: giả định không-recall thì nạp cả nguồn). Token ≈ chars/4. Nhãn khắp nơi: hiệu suất recall, KHÔNG phải "saved $"/hoá đơn.
- **Nghiệm thu**: commit=1 → log 1 recall (nạp~519 / nguồn~731k / tránh~730k); commit=0 → không log; dialog + nút render đúng.

## [2026-07-07] — feat(ui): honest token panel — ~tokens captured + free-capture (no fake saved)

Panel token TRUNG THỰC (số thật, KHÔNG claim "saved") — đúng hướng "tương đối thật".

- Panel **Global memory** (UI): thêm tile **`~N tokens captured`** (≈chars/4 — đo brain giữ bao nhiêu context) + row **`Capture cost: 0 extra tokens · free`** (hook đọc file, không gọi model) + tooltip nói rõ KHÔNG có metric "saved" phịa (ledger đã bỏ, xem plan 10).
- `dashboardBrain().tokensEst = SUM(len(content))/4` (best-effort).
- Verify: `/brain-status` trả `tokensEst=22,997,560` (110k message); panel render đúng tile + row.
- plan 10 §3 cập nhật: đây là bản "tương đối thật" thay dashboard "saved %" (số phịa đã bỏ). Tùy chọn sau: retrieval ratio per-recall (ghi nhãn "retrieved", không "saved").
