<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-07-22] — feat(app): NATIVE WINDOW (hết icon Edge) · resize §5 · logo+màu toàn cục · audit 5-mặt + Bước 0 chốt phiên · sync index↔structure↔graph

Phiên rất dài (Opus). **2 commit ĐÃ push** (`0992490` privacy · `3849168` harness); phần còn lại (resize · logo/native · sync-audit · **tầng 1: pin/gỡ · hộp đen daemon · cruft P3** — §G) **CHƯA commit** — chờ user duyệt mắt. Gate `npm run check` **165/165** ở mốc cuối. Chốt sổ theo Bước 0 (dò Global Memory + verify code thật, không ghi theo trí nhớ).

### A. Bước 0 chốt phiên + privacy/harness (2 commit ĐÃ PUSH)
- **Bước 0 — DÒ GLOBAL MEMORY + VERIFY** vào `04_SKILLS §chốt phiên` + `02_RULES §Chốt phiên` (repo + template): đổi session/ghi docs/audit ⇒ BẮT BUỘC dò Global Memory + đối chiếu code THẬT, verify từng mục trước khi ghi/khẳng định. **Trị gốc "đổi session là sót/lệch"** (user than "docs cứ thiếu"). Mã hoá bài học: tên cũ trong changelog = bản ghi lịch sử (đừng sửa), chuỗi EN = thuật ngữ (đừng tưởng leak i18n), đừng tin subagent chưa kiểm.
- **redact.ts** +4 pattern shape-based (PEM · Bearer · connstring · quoted-secret), verify không over-redact prose (điều 7). **gitignore/gitattributes** phủ tên bundle delta `global_memory.*.enc`.
- **AGENTS.md** `brain scan/sync`→`memory scan/sync` (rename `492cd16` sót). **plan/09** ví dụ `ui-page.ts` (đã tách frontend/). **archive** 06_CHANGES 739→227 dòng (cũ sang `docs/agent/archive/`).
- TODO sửa đúng thực tế: 4 commit cũ VERIFIED **đã push** (`git branch -r --contains`); `graph*.ts` **đã ở** `memory/graph/` (điều 13 thoả).

### B. Audit 5-mặt (đọc-chỉ) — vá thật + loại false-positive
5 subagent (structure · UI · BE↔FE · backend · docs). **Thật (verify):** `share/share.key` committed + gitignore mời bundle `.enc` (điều 7 — mìn, chưa rò vì chưa commit `.enc`); recall embed ONNX trên event-loop (freeze/native-crash risk, nghi = daemon exit-1); redact hẹp; gitignore mù delta. **False-positive đã loại:** i18n "leaks" phần lớn là thuật ngữ giữ EN đúng luật; "3 stale link CHANGES" là entry lịch sử (cấm sửa — luật supersede); "graph chưa move" (đã move). → verify từng finding, không tin subagent.

### C. Resize §5 — 1 engine data-driven + 2 seam thiếu
`frontend/scripts/02-layout.js`: gộp `initResizers` (branch-per-type) + `initPanelSplits` (flex-grow chết) → **1 bảng descriptor `seam()`** (thêm seam = khai dữ liệu). Gỡ code chết `bottom`/`panel-split`. **+2 seam:** inspector "Bộ nhớ & Đồng bộ" (`--gm-cov-w`: Dự án|Nạp&Đồng bộ) + graph 2×2 **chữ thập** (`--graph-col-w`+`--graph-row-h`, kéo 2 chiều). Khai `:root` 3 var. Test khoá `cockpit.test.mjs` (đổi assert `1fr 1fr`→seam + test §5 mới).

### D. Logo+màu TOÀN CỤC + NATIVE WINDOW (trị dứt icon Edge)
> User đưa ảnh logo (Z gradient xanh→tím + não/database-khoá/node). Yêu cầu logo global + đổi màu app theo logo. Vật lộn icon Edge cả session → cuối cùng **NATIVE WINDOW** mới trị được.
- **Bộ icon 1 nguồn:** `backend/scripts/make-icons.mjs` (sharp) sinh favicon.ico multi-size · logo-192/512 · favicon-256 · `packaging/zemory.ico` (app) + `zemory-logo.png` · **RGBA** (`ensureAlpha`) · rewrite tray.ts base64. Đổi logo lần sau = chạy lại 1 script.
- **Favicon + web manifest SERVED** (`ui.ts` route `/favicon.ico`·`/manifest.webmanifest`·`/assets/*` binary + no-cache; head cockpit link). **Tray** icon Z. **Brand** góc tab = ảnh logo (thay SVG). **Màu dark** green→**xanh dương `#4f8bff`→tím `#b3a6ff`** (token `--green*` giữ tên; light MONOCHROME giữ nguyên — user đã chốt). Test màu pass.
- **Start Menu + Desktop shortcut** (`autostart.ts`): mục "Zemory" icon Z, **launcher VBS ẩn** (không console). **+Fix bug thật `cliEntry()`** trỏ `dist/platform/cli.js` (KHÔNG tồn tại — regression khi dời autostart vào `platform/`) → `dist/cli.js`.
- **NATIVE WINDOW (mấu chốt):** Edge `--app` KHÔNG cho đổi icon taskbar (bám AppUserModelID của Edge) — favicon/manifest/xoá-cache đều vô ích. Giải = **cửa sổ webview native tự sở hữu icon**:
  - `@nativewindow/webview` (MIT, wry+tao, WebView2, **optional dep** prebuilt) + helper `backend/src/platform/window.ts` (native window + loadUrl 4444 + `setIcon`). `ui.ts`: **native-first → fallback msedge** (điều 9); `closePrevWindow` +lọc `WINDOWTITLE` (helper cùng image node.exe ⇒ tránh kill nhầm daemon).
  - **3 bug trị dọc đường (verify từng cái):** ① WebView2 `Access denied 0x80070005` (user-data mặc định cạnh node.exe ở Program Files) → set `WEBVIEW2_USER_DATA_FOLDER` ghi được · ② icon `.ico` PNG không RGBA (tao image crate từ chối) → `ensureAlpha` · ③ **taskbar hiện cube xanh (icon node.exe)** dù setIcon ăn (chỉ fix title bar) → thiếu **AppUserModelID**; thêm **koffi** (MIT FFI) gọi `SetCurrentProcessExplicitAppUserModelID("Zemory.Cockpit")` TRƯỚC khi tạo window (hr=0). **User xác nhận taskbar ra Z.**

### E. Audit index↔structure↔graph đồng bộ (user nhắc) — chống drift bằng CODE
- **P1 live drift:** slot `platform` (chuẩn 03 §3/§4 + folder thật `backend/src/platform/`) **thiếu key trong `SLOT_ROLES`** (`structure-tree.ts`) → folder-tree gán nhầm "non-standard". Gốc: SLOT_ROLES chép tay, 0 cơ chế sync.
- **Fix:** thêm role `platform`. **+Test parity `structure-sync.test.mjs`:** parse routing `03_STRUCTURE` → assert mọi slot 03 trỏ tới đều có role trong graph ⇒ drift = gate ĐỎ. **Ghi HP điều 13:** "chuẩn cấu trúc (03) + index điều hướng (routing §4) + từ điển slot graph (SLOT_ROLES) = 3 lăng kính 1 cấu trúc, đồng bộ bằng CODE (gate test), KHÔNG dựa trí nhớ agent" (user chốt).

### F. BE↔FE contract-impact graph — ĐỀ XUẤT (hấp thụ Grapuco, chờ chốt)
Ghi đầy đủ `05_TODO §🧩 Graph`: cạnh contract/api-seam (declared, từ chuẩn 03 slot) · trần 3 tầng (khai báo/suy luận/ngữ nghĩa) · "fix triệt để = contract-first+codegen chứ KHÔNG phải graph" · protocol đo Grapuco thật trước khi tin · KHÔNG hấp thụ chat/security/recommend (điều 6). Chờ user chốt → graduate plan 13.

### G. Tầng 1 (làm hết theo user 2026-07-22 chiều) — pin/gỡ · hộp đen daemon · cruft P3
- **#2 registry pin/gỡ/dọn — nút vào LIST "Dự án"** (user duyệt bố trí trước khi code, §Hành xử): mỗi hàng project *đã liên kết* (máy này) có 📌 ghim/bỏ-ghim + ✕ gỡ (hover hiện; pinned thì 📌 sáng sẵn) + nút "Dọn dự án đã mất" cuối nhóm máy. Nút nằm NGOÀI `.cov-open` (mở tab) → không đụng nhau. Wire vào endpoint sẵn có `/pin-project`·`/forget-project`·`/prune-projects` (trước đó sống mà 0 nút gọi sau khi bỏ ☰). `07-memory.js` covRow + handler · `04-tabs.css` `.cov-line/.cov-acts/.cov-act` (opacity, không reflow).
- **#3 hộp đen daemon bắt được NATIVE crash** — nghi daemon exit-1 (07-21) = segfault better-sqlite3/onnxruntime (qua mặt handler JS) HOẶC stderr detached không capture. Thêm `backend/src/logging/daemon-log.ts` (slot `logging` chuẩn): `daemonLog()` ghi `~/.zemory/logs/daemon.log` + mirror stderr · `armCrashReport()` bật `process.report` (reportOnFatalError + reportOnUncaughtException) → dump JSON stack native cạnh log. `ui.ts` arm NGAY khi thắng port + log lifecycle (up/shutdown/exit/uncaught/unhandled) ra file.
- **#4 cruft P3:** gỡ **☰ tab-menu chết** (`#tabMenu` + `renderTabMenu`/`toggleTabMenu` + handler `data-mact` + escLayers entry + CSS `.tabmenu-*`) — surface pin/gỡ đã dời sang list Dự án (#2). Gỡ **`.itab` chết** (`setInspectorTab` + `.itabs/.itab` CSS + `data-itab` body + restore localStorage). Gỡ **8 i18n mồ côi ×2 dict** (`tab.moreTitle/manageTitle/menuHead/none` + `itab.*`). **autostart quoting:** escape `'` cho PowerShell shortcut (username `O'Brien`) + quote path có space trong `.desktop Exec`. **`sourceSignature`** thêm FNV-1a hash đường dẫn ⇒ `git mv` (giữ count+mtime) vẫn đổi chữ ký (cache graph không stale). Cite `plan 14 §B`→`§6.B` (settings/autostart) · gỡ "cockpit" plan14:28 · `.gitattributes` binary ảnh + eol=lf source. **Để lại:** `CANON_ROOT` gộp case GIỮA-path (rare, đổi hiển thị — tách sau).
- **Test:** +2 ratchet `cockpit.test.mjs` (list có `data-cov-*`, ☰-menu/itab chết không tái sinh) + `graph.test.mjs` (`sourceSignature` đổi khi rename, ổn định khi không đổi). Gate `npm run check` **165/165**.

### Bài học
- **Icon cửa sổ browser `--app` = icon browser, bất khả đổi** — chỉ native window (tự sở hữu icon + AUMID) mới ra icon riêng (như SasinFlow/pywebview).
- **Native host bằng node.exe → taskbar lấy icon node** trừ khi set `AppUserModelID` (setIcon chỉ fix title bar/alt-tab).
- **Daemon + native-window helper cùng khoá `dist`** ⇒ phải kill CẢ HAI trước `npm run build` (helper detached, kill daemon không đủ).
- **Verify từng finding subagent** — nhiều false-positive (lịch sử / thuật ngữ / đã-xong).

### Còn treo (05_TODO §🔥)
Commit + xin phép push cả cụm (gồm tầng 1 vừa xong) · L3 sync (chờ user gật) · `adapters` (thêm 03 hay giữ domain-internal) · `CANON_ROOT` mid-path (edge) · README viết lại (đang làm). **ĐÃ XONG tầng 1:** registry pin/gỡ · hộp đen daemon (native crash) · cruft P3. Khi chạy gate phải kill daemon+helper trước (cùng khoá dist).

## [2026-07-21] — chore(session): CHỐT SỔ chiều 07-21 (Opus) — audit 5-agent + vá P1/P2 + sync chạy ẩn + 3-cột (design BỊ BÁC) — CHƯA commit

Phiên chiều (nối sáng 07-21). Chạy **audit toàn diện 5 subagent** (đọc-chỉ) rồi vá loạt bug CHÍNH nó bắt được — toàn loại "chạy được nhưng sai ngầm" mà `npm run check` sáng (152/152) KHÔNG phủ (5 module mới chưa có test). Gate cuối: **`npm run check` 161/161** (+9 test parser). **CHƯA commit/push** — cả sáng+chiều còn ở working tree.

### A. Audit 5-agent (UI · backend mới · structure · docs · test)
Bắt **8 P1** trong code SÁNG nay + nhiều P2/P3. Giá trị: mấy bug icon/tray/gate/graph "chạy được nên mắt + gate không thấy".

### B. Vá P1 (đã verify)
- **cmdMemory chạy ĐÚP lệnh heavy khi lỗi** (catch bọc cả acquire lẫn run → nuốt lỗi → chạy lại; `embed --rebuild` drop index 2 lần) → tách: gate best-effort, run đúng 1 lần, lỗi propagate.
- **Write-gate hết hạn 5' giữa job dài** → **heartbeat** re-acquire mỗi 2'; **gate 2 chiều** (daemon-job token) — CLI biết daemon-child đang ghi để CHỜ.
- **Tray "fail-open" KHÔNG fail-open** (`onError()` luôn throw vì lib set `_process` sau await → `tray` ref mất, helper hỏng → unhandledRejection GIẾT daemon) → `ready().then(store)/catch(null)` + onClick `.catch`. + **hộp đen** SIGINT/SIGTERM/exit/uncaught/unhandledRejection log (daemon không chết câm).
- **taskkill pid mù danh tính** (pid file sống qua reboot → tái cấp → kill nhầm) → ghi `pid|image`, kill lọc `IMAGENAME`.
- **`calls` edge `kind:"declared"`** mà mang confidence ladder → vi phạm điều 13 → đổi `kind:"inferred"`.
- **supersede ~33/34 cạnh RÁC** (regex bắt prose + nối mọi entry cùng ngày) → anchor `> 🔄 Supersede:` + chỉ nối ngày DUY NHẤT (giờ 0 — số trung thực).
- **click-mở-tab Dự án hỏng** (setTab return sớm + canon `D:\` vs select `d:\` case-sensitive) → `openProjectPath` match case-insensitive.
- **Tự bắt khi verify:** scheduler embed-child TỰ CHẶN qua gate của chính nó → child daemon set `ZEMORY_DAEMON_CHILD=1` bỏ qua gate.

### C. Vá P2
`esc()` thêm `&#39;` (sessionId từ máy khác nhúng `onclick='…'`) · `semanticEdges` chia lô 16 (bài học "batch 16") · `vectorRemaining()` idle-backoff 30' khi backlog=0.

### D. Sync CHẠY ẨN (user) — VERIFIED E2E
Gốc: `/drive-sync` `await syncDrive()` INLINE trên event loop → daemon đơ 5+' (cùng họ bug scheduler). → `jobs/syncrun.ts` (child chạy syncDrive, in JSON) + `jobs/syncjob.ts` (daemon track state, 1 job/lúc, chung với auto-sync) + `/drive-sync` start-and-return + `/sync-status` poll. UI nút **"Chạy ẩn"** (ESC/backdrop=thu nhỏ, KHÔNG huỷ) · spinner ⟳ tab Global · reload bám lại. **Đo thật: sync chạy → /ping vẫn trả suốt, delta 94KB/+52msg, kết thúc đúng.**

### E. Coverage tách theo MÁY + linked/quét-được + ngày-giờ (user)
Tab "Dự án" nhóm theo **host** (máy này mở, máy khác gập); trong máy này tách **đã liên kết** (registry) vs **▸ Quét được** (gập). Stamp → **ngày+giờ đầy đủ** (`fmtDateTime`).

### F. Layout Global Memory 3 CỘT — BUILT nhưng USER BÁC → REDO (05_TODO §🔥)
Dựng 1 tab 3 cột (Bộ nhớ+Recall · Nạp&Đồng bộ · Dự án) + Chuẩn chung tab riêng. **User bác:** recall phải đi với **harness**, 3 cái kia 1 tab riêng — *"tách vớ vẩn"*. Chưa redo (chốt layout với user trước).

### G. Hiến pháp + i18n + test
**Điều 13** vào `01_CONSTITUTION` (graph=lớp dẫn xuất, declared/inferred không lẫn — user duyệt) · từ khoá kỹ thuật giữ EN trong dict VI (isolated/util purity/Code fitness; force/cluster/import layers) · brand "Zemory" · **+9 test** (`graph-docs` CRLF hard-assert · `graph-cache` chống stale · `graph-semantic` nhãn inferred) + sửa 1 test **vacuous** (`var I18N`→`var T = {`).

### Còn treo (05_TODO §🔥)
Redo layout (recall+harness) · **bug icon cửa sổ Edge màn extend CHƯA hết** (favicon PNG không đủ) · registry pin/gỡ (bỏ hay ⚙?) · L3 sync-kèm-file (chờ gật) · commit+push · dọn cruft P3.

### Bài học
- **Audit đa-agent bắt bug mắt + gate bỏ sót** — 5 module mới pass `check` chỉ vì CHƯA test; fail-open sai (tray) chạy y như thật.
- **Đừng khoe số chưa soi:** "34 supersede edges" verify sáng hoá ra ~33 rác.
- **Verify E2E mới lộ self-deadlock** (embed-child chờ gate của chính nó) — build+gate không thấy.

## [2026-07-21] — feat: delta sync · graph A→C + touches/export · UI redesign đợt 2 · vendored skill kho — CHỐT SỔ, CHƯA commit

Phiên rất dài (nối tiếp 07-20). `npm run check` **152/152** · `validate` xanh · daemon chạy bản mới. **CHƯA commit/push** — cả phiên + 4 commit cũ vẫn local, chờ user duyệt.

### A. Sync — mức độ + DELTA thật (plan 08 §7, plan 14 §3b)
- **L1/L2 selector** (`syncLevel` config · `/set-sync-level` · `memory sync --full`): **Gọn** = bundle rows (mặc định) · **Đầy đủ** = snapshot cả DB. UI ở tab Nạp & Đồng bộ.
- **DELTA drive sync** — thay "1 file/host ghi đè" bằng **series**: `global_memory.<host>.<seq>.enc` = baseline + delta theo watermark; **compaction** khi ≥12 file (baseline mới là superset ⇒ xoá file cũ không mất dữ liệu). Nhận: bảng **`merged_bundles`** (schema **v14**) nhớ file đã merge theo chữ ký `size:createdAt` đọc từ **header plaintext** (không cần giải mã) ⇒ bỏ qua file không đổi.
- **Đo thật:** baseline 192.14 MB → **delta 0.04 MB (40 KB)** = −99.98%. Kiểm DB: `merged_bundles` ghi file 800MB của máy kia **1 lần rồi skip**; `sync_state[drive:<host>]` watermark đúng.
- Phát hiện: file 800MB trên Drive là **bundle CŨ của máy kia** (v1, 15/07, trước lean) — không phải máy này đẩy. Máy kia cập nhật code rồi sync thì tự co.
- Test `drive-sync.test.mjs` (5): baseline→delta · **máy bỏ lỡ sync vẫn ghép đủ** · dedup không merge lại · compaction không mất row · full dọn series. Seam `host`/`embed` cho test.

### B. Graph — hấp thụ CALM, phase A→C + moat memory (plan 13 §9)
> Khảo sát + **ĐO THẬT** CALM (cài `@eilodon/calm-mcp` 0.3.4, index corpus zemory, bơm JSON-RPC): nó thắng RÕ ở symbol-callers (38 caller quy kết đúng hàm) + `fitness_report`; nhưng **file-level dependencies của nó BUG** (nuốt SQL trong template literal → 2.6k token rác) và semantic search 0 kết quả. Con số "29–241×" của nó là so với *đọc cả file*, không phải so Grep. ⇒ user chốt **"chỉ lấy cái nó tốt hơn"**, không consume MCP (hệ này không nối MCP — đã kiểm: `zemory mcp` có code từ 06-29 nhưng 0 nơi wire).
- **Phase A** — `zemory graph impact <file>` (blast-radius TƯ VẤN, không chặn: fan-in/out · importer trực tiếp + **bắc cầu** · cờ HUB) + **`graph fitness [--gate]`** (hub% · isolated% · util-purity, exit 1 khi fail ⇒ CI-able) + dải chip Sức khoẻ ở sub-tab Graph. Đặt tên trung thực: "isolated" chứ không phải "dead".
- **Phase B** — `graph-symbols.ts`: **tree-sitter WASM** thay regex → symbol AST đúng (function/class/**method gắn class** + số dòng), loại hàm lồng. **71/90 file** enriched. Bug đã trị: **ABI mismatch câm** (`web-tree-sitter@0.26` từ chối grammar build bằng CLI 0.20.8, lỗi RỖNG) → **ghim cặp** `web-tree-sitter@0.20.8` + `tree-sitter-wasms@0.1.13`; và test ban đầu **xanh giả** (`if(n===0) return`) → đổi thành hard-assert.
- **Phase C** — cạnh `calls` name-match + **nhãn confidence trung thực**: bare `foo()`→function/class · member `x.foo()`→**chỉ method** (chặn `console.log`→`log` nội bộ) · 1 định nghĩa=`inferred`, 2–4=`textual` từng ứng viên, >4=bỏ · KHÔNG bao giờ tự phong `resolved`. Đo: `graph callers openMemory` = **57 call-site quy kết đúng hàm bao**. **Regression test chống đúng bug CALM**: call-looking text trong template literal → 0 cạnh giả.
- **Phase D (tsserver/pyright) CỐ Ý HOÃN** — gate = decision rule 2–4 tuần dùng thật.
- **MOAT graph ↔ MEMORY** — `graph-memory.ts`: cạnh **`touches`** từ `session_digest.paths` (0 LLM) ⇒ `graph impact` in thêm *"file này từng được N phiên trước đụng"*. Cross-machine: cùng repo ở 2 máy có 2 đường dẫn tuyệt đối khác nhau → match thêm theo **tên folder project** ⇒ 11→**23 digest, 59 file**.
- **`zemory graph export --json [--out]`** — contract v1: nodes(+symbols+touchedBy) · edges(imports+calls, kèm confidence) · orphans · fitness · stats.

### C. UI — đợt 2 (theo phản hồi trực tiếp)
- **Panel lệch (ping-pong nhiều vòng) — GỐC RỄ THẬT:** `.workspace` có `grid-template-rows: auto minmax(0,1fr) auto`; track thứ 3 (cho `#msg`) + `gap:8px` **luôn chừa 8px** dù `#msg` rỗng ⇒ panel trái dừng cao hơn inspector đúng 8px. Bỏ track đuôi. Trước đó còn vá `.shell` thiếu `grid-template-rows` (hàng co theo nội dung ⇒ 2 cột `height:100%` ra 2 giá trị khác nhau).
- **Dialog 3-size → tỉ lệ 16:9 CHUẨN MÀN HÌNH**, width-driven, cao suy từ tỉ lệ, cap `min(Pvw, Pvh*16/9)` ⇒ không méo trên mọi màn. **S 40% · M 60% · L 90% khung app** (user chốt). Bỏ `height:Nvh` cố định (thứ đẻ ra "hộp dài thòng"). Settings = L, hết nhảy khi đổi tab.
- **Inspector 4 panel xếp dọc → 4 TAB** (`body[data-itab]`, không dời DOM, nhớ localStorage); gộp **Quét + Đồng bộ Drive thành 1 tab "Nạp & Đồng bộ"** (Drive rời khỏi ⚙, một concern một chỗ).
- **Graph canvas**: **zoom con lăn tại con trỏ · kéo nền pan · KÉO NODE** (circle+nhãn+cạnh theo, không nuốt click chọn) · **Ctrl+Z/Ctrl+Y undo-redo** vị trí node · **3 kiểu sắp xếp** (lực hút · cụm folder · tầng import), nhớ lựa chọn · dblclick reset.
- **Cây folder** hết "gộp ngắn": `MAX_DEPTH` 4→**6**.
- **Card & đo lường trung thực (HP điều 12):** `token đã thu`→**`token bộ nhớ`** (tài sản, không phải chi phí); thêm card **`token mỗi recall`** (~540, suy từ `DEFAULT_SEARCH_LIMIT`×`SNIPPET_MAX_CHARS`, không hardcode); **6 card đều nhau** qua helper `statCard`. Bảng **Chi phí điều hướng** (`nav-cost.ts`): *"sửa X ở đâu"* 123.8× · *"đụng ai"* 1.352× · *"phiên trước làm gì"* 4.099× — **cả 2 vế đều đo từ byte/message thật**, có header cột + tooltip; gộp cùng hàng với Sức khoẻ cho đỡ choán.
- **Add project** = dialog app chuẩn (S, ESC/backdrop/Enter) thay `window.prompt`; gỡ pill `↗ CLI` chết; preview chat `height:100%`+cuộn trong (2 cột bằng đáy).
- **i18n:** test xác nhận key đủ 2 dict; leak thật là **3 chuỗi hardcode** (tooltip brand · tooltip scope-tree · option "Agent: mọi") → token hoá. Tooltip fitness/nav-cost dựng **client-side từ i18n** (chuỗi `detail` của server là EN-only, chỉ cho CLI).

### D. Harness — luật, chuẩn, kho skill
- **`02_RULES §Hành xử` (repo+template):** **"MỌI thiết kế UI/UX phải TRÌNH DUYỆT trước — không tự ý"**. Phân định: *bug kỹ thuật* = sửa thẳng · *hình hài thiết kế* = phải hỏi.
- **`03_STRUCTURE §9` MỚI = TỪ ĐIỂN SLOT thiết kế UI** (song song §3): 4 dải A–D, mỗi slot `★/[opt]`, gộp luật zemory đã khoá + concern mới. Ranh giới ghi rõ: **stack (Tailwind/no-build) = CẤU TRÚC cố định** · **layout & gu = agent bàn với user rồi chốt**.
- **KHO SKILL VENDORED** — `external/skills/<tên-repo>/`: clone **nguyên bản** repo gốc (đúng tên, bỏ `.git`, **giữ LICENSE**), KHÔNG sửa nội dung người ta (HP điều 1/2). Ca đầu: **`ui-ux-pro-max-skill`** (MIT, 17MB, v2.11.0). Kho nằm **1 chỗ ở repo zemory**, đọc on-demand, **KHÔNG copy sang từng project**.
- **`04_SKILLS` = INDEX MỎNG + GUARDRAIL** "file này KHÔNG BAO GIỜ phình" (nội dung dài → thuộc skill gốc hoặc 03); **cấm viết prose adapter ở 04** — chỗ "adapt hiện ra thật" là `03 §9`. Hai khuôn: NGẮN→inline · DÀI→vendor + 1 dòng index.
- **Single-instance probe** — trước coi *timeout* = "chưa ai chạy" ⇒ đẻ daemon thứ 2 (2 tiến trình ghi 1 DB, đúng thứ write-gate sinh ra để chặn). Nay phân biệt **refused (trống) vs timeout/busy (có người)** → không dựng bản thứ 2.
- Template đã nhân: §3 slot · §4 routing · §9 · `04` (bảng kho để trống) · luật UI.

### Đo thật đáng nhớ
| | |
|---|---|
| Drive sync lần 2 | 192.14 MB → **40 KB** |
| `graph callers openMemory` | **57** call-site quy kết đúng hàm bao |
| touches (graph↔memory) | **23 digest · 59 file**, gộp 2 máy |
| fitness zemory | hub 7.9% (khớp đúng 7.88% CALM đo độc lập) · isolated 9% · util 0 |
| `/ping` khi daemon nghẽn | **28.289 ms** (bug ONNX, chưa vá) |

### Bài học (để phiên sau khỏi vấp)
- **Backtick trong comment** bên trong template literal `ui-page.ts` = đứt chuỗi → build đỏ. Dính **2 lần** phiên này. Trước khi build: `grep '\`' ui-page.ts` phải chỉ ra 2 dòng (mở/đóng PAGE).
- **Test có nhánh `if (x===0) return` = XANH GIẢ** — enrichment fail vẫn pass. Dùng hard-assert.
- **Đừng tự viết lại skill người ta** — đã lỡ author một bộ ui-design rồi phải gỡ; đúng cách là **vendor nguyên bản + adapter ở 03**.
- **Ping-pong sửa layout** = dấu hiệu chưa tìm ra cơ chế; phải đọc ra ĐÚNG rule CSS gây lệch (phantom gap) rồi mới sửa.

## [2026-07-20] — chore(session): CHỐT SỔ phiên 07-20 — UI redesign + graph thật + tự-động-hoá (plan 14 B/C/E) — CHƯA commit/push, CHỜ USER DUYỆT MẮT

Phiên rất dài. Toàn bộ **đã verify tự động (`npm run check` 114/114 · `node --check` JS nhúng · endpoint thật)** nhưng **user CHƯA nghiệm thu bằng mắt** (light theme, gap, graph, sub-tab). **KHÔNG commit, KHÔNG push** — 4 commit cũ (`d72fb3e`·`977e6f9`·`76523fb`·`1ef6422`) vẫn local. Cả phiên nằm ở working tree (~15 file, +5 file mới). Session sau: xem mắt → nếu OK thì commit + (xin phép) push.

### A. UI cockpit — 7 việc user giao + hàng loạt chỉnh theo phản hồi
1. **Delay đổi ngôn ngữ** — gốc: `/set-lang` `invalidateDashboard()` (regression tự thêm) xoá heavyCache + `memoryTick(true)` ép quét toàn DB mỗi cú bấm. Vá: bỏ invalidate (payload memory không có chuỗi server-dịch), `setLangUI` chỉ refetch `/status`+`/check` song song; TTL dashboard 15s→60s (>poll 30s); Hybrid/Rerank cập nhật cục bộ; scope-lane dùng `invalidateDashboardSoft` (giữ heavyCache).
2. **Danh sách "Kiểm tra" cũ** — gộp `search`+`memory` (trùng code) → 1; `grill` kiểm THẬT (đọc 04_SKILLS §grill); `validate` hết luôn-xanh (state theo `rep.ok`) + help bỏ "docs render"; memory assert bảng FTS. Pane health dời khỏi Settings sang sub-tab Harness.
3. **Light theme = TRẮNG ĐEN (monochrome)** — user chốt: *"lightmode chỉ trắng đen, như dark nhưng đảo màu"*. Token hoá TOÀN BỘ (~126 literal → var), light khai lại đủ bộ **xám** (accent→gần đen, warn/error→xám, glow tắt); dark giữ xanh brand. Logo theo accent (dark ô xanh/light ô đen). 0 literal màu ngoài 2 token `--shadow`. **Bug tự gây + đã sửa:** script tokenize làm hỏng 13 token def (tự-tham-chiếu `--x:var(--x)` → vô hiệu cả dark) + `))` thừa (`.sw`/`.switch`) + ăn nhầm `)` của `linear-gradient`/`calc`/`minmax` → **vỡ toàn UI 1 lần**; đã phục hồi + test khoá cân-bằng-ngoặc + không-tự-tham-chiếu. Checkbox thêm `accent-color`.
4. **Cài đặt 1 cửa** — chỉ còn ⚙ tab bar (PIN cố định phải qua tách `.tab-strip` cuộn / `.tab-actions` cố định); gỡ 4 lối vào thừa; 2 pill 🗄/☁ giữ làm status.
5. **ESC đóng mọi dialog** — 1 global keydown đóng overlay trên cùng (trừ sync đang chạy). Ghi **luật chung** `03_STRUCTURE §5` (repo + template generic).
6. **Tab project = 2 sub-tab** `Harness | Graph` (CSS `body[data-ptab]`, không dời DOM). Panel "Dự án" GỠ HẲN (user: vào 2 tab liền); nút "Chạy" bỏ (Run harness đã có ở ⚙→Docs harness); select #proj ẩn làm nguồn sự thật.
7. **Brand về main** — logo+"zemory" lên góc trái tab bar (cố định mọi tab), gỡ khỏi rail; ô "Thêm dự án" trong panel bỏ ([＋] tab bar hỏi path qua prompt).
- **Gỡ chữ "cockpit"** (user ghét): window title `Zemory Cockpit`→`zemory`, sạch mọi comment/string user thấy (giữ path `~/.zemory/cockpit/browser` để không mất login ChatGPT).
- **Gap hộp-lồng-hộp** — ở tab project `.rail` (viền+nền+padding) lồng `#project` panel (viền+nền+padding) = khoảng thừa; strip chrome rail ở project mode + panel-pad flex lấp đầy.
- **Registry** (từ đầu phiên) — schema v2 `{root,pinned,lastSeen}`, chặn scratch-root (tmpdir), fold hoa/thường win32, pin/forget/prune, seam `ZEMORY_REGISTRY_FILE`; **prune registry thật 331→6**. Thanh tab: pin + 5 gần đây + menu `…`. Test `registry.test.mjs`.
- **Lag** (từ đầu phiên) — `/memory-status` ~4s bị poll 2.5s + vòng lặp render vô hạn `renderStatus→renderTabs→applyLang→renderStatus` (6.4k DOM/lần, RangeError bị nuốt). Vá: cache 2 tầng TTL + poll giãn + cắt vòng (renderTabs dịch bằng `t()`, guard `applyLangBusy`). Test `ui-page.test.mjs` (JS parse · vòng lặp · i18n đủ 2 dict · ngoặc cân bằng · light toàn token · ratchet onclick=8).

### B. Graph THẬT (user: "làm graph thật đi") — plan 14 §6.D
- `backend/src/structure-tree.ts` (`/folder-tree`): cây folder VSCode-like + từ điển ~60 slot `03_STRUCTURE §4` + đánh dấu slot đã dùng / lạ chuẩn (check conformance). 0 LLM.
- `backend/src/graph.ts` (`/code-graph`): import-graph TĨNH ĐỊNH **TS/JS + Python** (resolve `./x.js`→x.ts/index; Python dotted suffix-match + relative) + symbol (function/class/const · def/class) + fan-in/out + orphan. **Đo: zemory 81 file/175 import/db.ts fan-in 19 · SasinFlow 22 file/40 import/config.py fan-in 7.** Test `graph.test.mjs` 6/6.
- UI sub-tab Graph: force-layout SVG thuần (PRNG seed cố định, 0 lib) · node theo fan-in · màu theo slot · **đồng bộ 2 chiều** (bấm node→sáng import + sáng folder cây; bấm folder→lọc node) · toggle orphan · Dựng lại.

### C. Tự động hoá — plan 14 §6.B/C/E (user: "làm hết 3 cái trong lịch")
- **B (autostart + autosync + scheduler):** `autostart.ts` per-OS (Win Startup .cmd/mac launchd/Linux xdg, reconcile lúc daemon bind) + `jobs/scheduler.ts` (idle embed backlog + auto-sync §3b qua `syncDrive`, opt-in) + pane ⚙ **⚡ Tự động** + endpoints. Mặc định scheduler ON, autostart/autosync OFF. Test `autostart.test.mjs`.
- **C (write gate):** `jobs/writegate.ts` cờ hold auto-hết-hạn; scheduler nhường khi CLI ghi; CLI heavy-write probe daemon `/ping`→`/gate-acquire`→chạy→`/gate-release`, fallback chạy thẳng. Trị gốc "database is locked". Test `writegate.test.mjs`.
- **E (đóng gói) MỘT PHẦN:** lối tắt Desktop (`setDesktopShortcut`) + công tắc pane ⚡ + `npm i -g` sẵn. **TRAY ICON HOÃN** — cần chốt cơ chế (native dep vs PS helper Windows), quyết định mở §7.2; cố ý chưa ship GUI chưa test.

### Còn treo (session sau)
1. **USER DUYỆT MẮT** light monochrome · gap · graph render · 2 sub-tab. → OK thì **commit + xin phép push** (cả 4 commit cũ + phiên này).
2. **Tray icon** — chờ user chốt hướng (native dep / PowerShell / bỏ).
3. **L3 mức-độ-sync** (plan 08 §7) — file đính kèm, chờ user chốt (L1/L2 selector chưa dựng UI).
4. **Graph nâng cao** (plan 13 §8) — cạnh suy-luận (semantic) · docs-graph · `graph export --json` + MCP.
5. **Pane "Docs harness" (Sync/Dựng mới)** trong ⚙ = `zemory sync`/`fresh` (scaffold harness, KHÁC `docs sync` đã gỡ) — hợp lệ nhưng ít dùng; user hỏi có nên giữ trong UI không → chờ chốt.
6. **Cruft vô hại chưa dọn:** ~10 khối CSS mồ côi (`.proj-pick/.status-card/.grid-bottom/.switch/.nav/.rail-foot`…) + 13 key i18n mồ côi + dead code `pick()`/setTab root-branch/bottom-panel-resizer (audit `ad32a857` liệt kê đủ). Không ảnh hưởng chạy.

### Bài học (để phiên sau khỏi vấp)
- **KHÔNG dùng script regex tự-động sửa màu/token trên chuỗi CSS nhúng** — 2 lần gây bug nặng (self-ref + ăn nhầm `)` gradient) làm vỡ UI. Sửa tay có chủ đích + test cân-bằng-ngoặc.
- **Backtick trong comment** bên trong template literal `ui-page.ts` = đứt chuỗi (tsc bắt được — build đỏ, không phải runtime). Tránh backtick trong comment vùng đó.
- **`npm run build`/`node --check` KHÔNG thấy lỗi CSS/logic trong chuỗi HTML** — phải có test chạy trên PAGE đã sinh (đã có `ui-page.test.mjs`).

## [2026-07-19] — chore(session): CHỐT SỔ phiên 07-18→07-19 — bàn giao sang phiên sau

Chốt sổ trước khi đổi session. Chi tiết từng mục ở các entry bên dưới; đây là bản tổng + bàn giao.

### Đã làm (đều đã verify, 4 commit LOCAL chưa push)
1. **`6180618` — slot `04_SKILLS` + renumber** `04_TODO→05_TODO`, `05_CHANGES→06_CHANGES` (repo+template) + **dọn single-responsibility** cả bộ 6 file (Dialog 3-size dồn về `03_STRUCTURE §5`, gỡ khỏi RULES; RULES §Cấu trúc rút còn pointer). Luật mới: *mỗi file harness làm đúng MỘT việc, không lặp — cần thì dẫn chiếu*. `04_SKILLS` = **kho skill**, chỉ chứa skill.
2. **`4e71980` — chốt design** `plan/13` (Graph) + `plan/14` (App hoá zemory/daemon) + backlog delta ở `plan/08`. Chưa code, push làm mốc backup.
3. **`1ef6422` — bundle LEAN + DELTA:** **709.1MB → 184.6MB (−74%) → delta 1.8MB**. Round-trip khớp tuyệt đối (1173 session/144.396 msg, FTS dựng lại đúng 13.946 hit).
4. **`76523fb` — cổng CỐ ĐỊNH 4444** + `/ping` + single-instance attach + fail-open khi cổng bị chiếm.

### Đang dở — ĐỌC `05_TODO` §🔥 TRƯỚC KHI LÀM TIẾP
**Bước D (giao diện tab) chạy được nhưng CHƯA commit và CHƯA đạt.** Thanh tab + theme Dark/Light + nhớ trạng thái đã xong; user xem thật rồi nêu **2 lỗi phải sửa**: ① **UI lag** vì registry gom ~15 project rác (`ztmpl1–8`, `harness-test`, `demo-proj`) → cần lọc + đường gỡ project; ② **"CHUẨN DÙNG CHUNG" (`docs_template/`) đang lặp trong tab project** → phải đưa về Global Memory (hoặc tab riêng), tab project chỉ còn harness của chính nó.

### Quyết định đã chốt trong phiên (ngoài các entry dưới)
- **Thứ tự thực thi đảo: D (giao diện) → B (tự động) → C** — vì công tắc tự-động cần chỗ đặt để test.
- **Cài đặt: NATIVE là chính, Docker CHỈ cho headless server** — lý do ở `plan/14 §5` (path Windows thật · SQLite/WAL trên bind-mount · `scan-web` cần browser thật để user login). **Đừng bàn lại.**
- **Port 4444** · theme **Dark+Light** · Global Memory là tab Main (nhãn UI KHÔNG dùng chữ "memory").
- **Multi-máy KHÔNG phải gap** (đã có bundle sync); gap thật là **lớp TỰ ĐỘNG** (chưa có "mở cùng PC", chưa có "tự sync") — đó là bước B.

### Bài học kỹ thuật (để phiên sau khỏi vấp lại)
- **`ui-page.ts`: KHÔNG viết `onclick` inline trong chuỗi sinh HTML** — nháy bị nhân đôi qua template literal ⇒ hỏng cú pháp JS nhúng, mà **`npm run build` KHÔNG bắt được**. Dùng `data-*` + listener uỷ quyền, và **luôn trích `<script>` ra file rồi `node --check`** sau khi sửa.
- **Chạy `zemory ui | head -n`** trông như treo — đó là **artifact của shell** (stdout qua pipe bị đệm khối), không phải lỗi. Kiểm bằng cách chạy nền rồi đọc file output.
- **Đo trước khi tin:** check thô "còn nhắc tên cũ" kêu oan 10 lần (toàn lịch sử hợp lệ); chỉ check trên **cấu trúc khai báo** mới đáng tin.

### Còn treo (chi tiết `05_TODO` §Quyết định mở)
Graph build loại lỗi nào trước · độ mịn/overlay · plan 14 §7 (tray Node, write-gate, autostart, cache) · **đề xuất hiến pháp về Graph chờ user chốt** · **4 commit chưa push**.

## [2026-07-19] — feat(ui): cổng CỐ ĐỊNH 4444 + single-instance (plan 14.A)

Bước A của app-hoá. Trước đây `zemory ui` bind **cổng ngẫu nhiên** mỗi lần chạy — URL đổi liên tục (không bookmark được, browser mất `localStorage` vì đổi origin), và gõ 2 lần thì dựng 2 server song song.

- **Cổng 4444 cố định** (`DEFAULT_UI_PORT`, override bằng env `ZEMORY_UI_PORT`).
- **`GET /ping`** → `{app:"zemory", ui:true, pid}` — probe rẻ, không làm việc gì, để phân biệt "cockpit của mình đang giữ cổng" với "app khác chiếm 4444".
- **Single-instance:** khởi động sẽ probe trước; nếu cockpit đã chạy → in `already running (pid N)`, mở cửa sổ trỏ vào bản đó, **thoát 0** (không dựng server thứ hai).
- **Fail-open khi cổng bị app khác giữ:** rơi về cổng tự do + in rõ lý do, thay vì từ chối khởi động (đúng HP điều 9).
- Helper `listenOn()` bọc `server.listen` thành Promise bắt được `EADDRINUSE` (Node phát lỗi này qua event, `await listen` thường không bắt được).

**Verify thật cả 3 nhánh:** ① bind 4444 + `/ping` trả đúng pid · ② instance 2 attach, exit 0 · ③ dựng server lạ giữ 4444 → zemory rơi về cổng tạm kèm cảnh báo. `npm run check` **87/87**.

> Ghi chú kiểm thử: chạy `zemory ui | head -3` trông như "treo" — đó là **artifact của shell** (stdout qua pipe bị đệm khối, tiến trình nền chưa xả), không phải lỗi. Chạy nền rồi đọc file output cho thấy exit code 0 và đúng thông điệp.

## [2026-07-19] — perf(sync): bundle LEAN (chỉ bảng nguồn) + DELTA theo watermark — 709MB → 184MB → 1.8MB

Thực thi bước 1 của lộ trình build (plan 08 backlog; tiền đề auto-sync plan 14 §3b).

**Phát hiện gốc rễ:** `mergeMemoryBundle` **VỐN chỉ đọc 3 bảng** — `sessions`, `messages`, `known_stores`. Toàn bộ FTS + `vec_*` + digest + doc/section/changelog trong bundle là **hàng chết được mã hoá và chở đi rồi vứt**. Đó chính là ~87% dung lượng (khớp số đo dbstat plan 11).

**Thay đổi:**
- **`payload: "rows"` là MẶC ĐỊNH** — dựng một SQLite tạm chỉ gồm 3 bảng nguồn, **DDL copy verbatim từ `sqlite_master` của source** (schema đổi sau này không phải sửa chỗ này). Đọc trong 1 transaction → writer chạy song song không xé được bản export. `--full` giữ nguyên hành vi cũ (snapshot byte) cho disaster-restore.
- **DELTA:** `sinceMessageId` → chỉ message có `id >` watermark + đúng những session chứa chúng. `messages.id` là AUTOINCREMENT cục bộ nên KHÔNG bao giờ đi theo bundle (merge khớp bằng `UNIQUE(session_id,uuid)` / content identity).
- **Watermark:** bảng mới `sync_state(bundle, last_message_id, updated_at)` — **schema v13**, per-máy, cùng hạng với `ingest_state`: KHÔNG nằm trong `ROWS_TABLES` nên không đi theo bundle. CLI `memory export --delta` tự đọc + chỉ nâng watermark SAU khi file đã ghi xong.
- **Import payload rows:** không thể replace file thẳng (thiếu lớp dẫn xuất) → tạo DB trắng đã migrate đầy đủ bằng `openMemory` rồi merge rows vào. Merge bỏ bước normalize cho bundle rows (đã đúng schema, không WAL).
- Header bundle **v2** (`payload`/`rows`); bundle v1 cũ vẫn đọc được (thiếu `payload` ⇒ hiểu là `full`).

**Đo thật trên DB sống 709.1MB:**

| | Size | Thời gian |
|---|---|---|
| Bundle **lean** (đủ dữ liệu) | **184.6 MB** (−74%) | 4.0s |
| Bundle **delta** (~1.6k msg mới) | **1.8 MB** | 0.2s |

**Verify tính đúng đắn (quan trọng hơn size):** export lean → import vào DB trắng → **1173 session / 144.396 msg khớp tuyệt đối**; **FTS dựng lại đúng** — 13.946 hit `zemory`, khớp y hệt nguồn (FTS là lớp dẫn xuất, không đi theo bundle, trigger dựng lại lúc insert); re-merge cùng bundle **+0/+0** (idempotent). Gate: `npm run check` **87/87** (+4 test khoá: lean-mặc-định-và-nhỏ-hơn-full · delta-chỉ-chở-phần-mới-và-ghép-đúng · watermark-per-bundle-không-đi-theo-bundle · import-rows-dựng-lại-FTS). Smoke CLI trên DB thật + `doctor`/`validate` xanh.

> **CỐ Ý chưa làm:** `syncDrive` vẫn đẩy **lean baseline** chứ không delta — file `global_memory.<host>.zemory.enc` là 1 file/máy bị ghi đè mỗi lần sync, nên phải **tự-đủ**; máy bỏ lỡ vài lần sync sẽ hổng dữ liệu nếu file chỉ chứa delta cuối. Delta cần file tích luỹ + compact định kỳ → làm cùng daemon auto-sync (plan 14 §3b). Riêng lean đã cắt 74%.

## [2026-07-18] — docs(plan): CHỐT design Graph (plan 13) + App hoá zemory (plan 14) — chưa code, push làm backup trước khi build

Phiên thiết kế (Fable). Hai plan mới + 1 backlog sync, đều CHƯA code — chốt spec xong push làm mốc backup, build ở phiên sau.

**Plan 13 — Graph (mới):** app phụ trợ vẽ đồ thị cho mọi repo theo chuẩn zemory. Seam: zemory BUILD graph dẫn xuất + `graph export --json` (contract) · app/UI CONSUME. **2 hạng cạnh:** KHAI BÁO (routing·references·supersede·touches — baseline, tất định, 0 LLM) vs SUY LUẬN (overlay fail-open, gắn nhãn, semantic từ vector sẵn). Bất biến dẫn chiếu HP 1/3/5/6/8/9. **Prototype cùng ngày xác nhận hướng:** docs-graph + code-graph thật (55 module/154 import, cụm theo domain, slider layout) — lint bắt **orphan thật `core/index.ts`** (barrel 0 ai import) + blast-radius click-node (`memory/db.ts` fan-in 18). Kết luận: code-graph là chính, docs-graph phụ; giá trị = LINT tô đỏ + thống kê, không phải bức vẽ. §8#1 chốt: graph = TAB trong `zemory ui`, seam JSON giữ để tách app sau.

**Plan 14 — App hoá zemory (mới):** gap user nêu = LỚP TỰ ĐỘNG (đang toàn thủ công), không phải multi-máy (đã có). Chốt: daemon **port 4444** · single-instance + WRITE GATE (CLI ghi qua daemon — trị gốc "database is locked" plan 12) · setting **"Mở cùng PC"** + **"Tự sync memory"** (§3b: tự bấm nút plan 08, mặc định OFF, additive) · idle scheduler · **UI thiết kế lại:** tab `GLOBAL MEMORY` = Main (KHÔNG dùng chữ "memory" trên UI) → tab `zemory` cố định (harness+graph chính nó, cùng khuôn) → tab project ngoài + nút [＋] add; graph đi THEO project trong tab · **theme Dark+Light toggle giống SasinFlow** (dark mặc định, token CSS-var 1 chỗ) · cài NATIVE là chính, **Docker chỉ headless** (lý do §5: path thật/WAL/browser-login — đừng bàn lại). Phân kỳ A→F.

**Plan 08 (+backlog) — export gọn + DELTA:** trả lời "sao bundle 700MB": `exportMemoryBundle` snapshot NGUYÊN DB (chở cả index dẫn xuất ~87%). Nấc ① chỉ export bảng nguồn (~150–200MB) · nấc ② delta theo watermark per-host (vài MB/ngày; merge vốn additive-idempotent nên ghép thẳng). **Delta là TIỀN ĐỀ auto-sync** (plan 14 §7.6).

**Thứ tự build đề xuất:** delta export (plan 08) → daemon 4444 (14.A) → tự động hoá lõi (14.B) → write gate (14.C) → UI redesign + graph (14.D).

Sau khi thêm `04_SKILLS`, chốt nguyên tắc + dọn (user chỉ đạo): **mỗi file trong bộ 6 làm đúng MỘT việc, KHÔNG chứa nội dung của file khác** — đọc trùng/lạc chỗ khiến agent bị loạn.

- **Luật mới** (`02_RULES §Tài liệu`, repo + template): một nội dung sống ở ĐÚNG MỘT nhà; file khác cần thì **DẪN CHIẾU** (link + số hiệu), KHÔNG chép lại. Đọc hết 6 file không được thấy trùng.
- **`04_SKILLS` = KHO SKILL** — mô tả đầu file + nhãn ở `02_RULES`/`03_STRUCTURE`: chỉ chứa skill (mỗi `##` = 1 skill), KHÔNG nhét luật / norm / cấu trúc / linh tinh khác.
- **Dialog 3-size (design) dồn về `03_STRUCTURE §5`; gỡ `02_RULES §Thiết kế UI`** — RULES là luật **LÀM VIỆC** chung, không phải luật thiết kế. Spec đầy đủ (S/M/L kích thước · trần · overflow · lưu layout) gói gọn 1 dòng convention ở `03 §5`. Comment `ui-page.ts` (×2) trỏ sang `03 §5`.
- **`02_RULES §Cấu trúc`** rút còn pointer + giữ đúng luật-làm-việc "index phải KHỚP code"; bỏ liệt kê nội dung của `03` (BẮT BUỘC=4 · 1 tên/concern · tracked-vs-gitignore).
- **`02_RULES` bullet Plan** gộp: giữ "plan chỉ chứa specs, KHÔNG luật/todo" (luật làm việc); chuẩn đánh số `NN_` → `03 §5`.
- **KHÔNG đụng (khác tầng, không phải trùng):** FILE WINS ở `01_CONSTITUTION điều 3` (nguyên lý) vs `02_RULES` (thao tác sửa `.md` + reindex).

**Verify:** `npm run check` **83/83** · `validate` xanh · `doctor` grill "ready (04_SKILLS §grill)".
