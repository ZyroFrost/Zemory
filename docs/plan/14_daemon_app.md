<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Plan 14: App hoá zemory — daemon chạy nền + UI đa-project (+ tab Graph)

> Trạng thái: **BUILT 07-19→21** — A daemon(4444) · D UI+graph · B tự-động(autostart/scheduler) · C write-gate · E tray(systray2)+lối tắt+**sync chạy ẩn**(child job). Còn: F headless. §7.2–7.6 (tray/cache/autosync) ĐÃ CHỐT bởi code — xem `06_CHANGES` + `05_TODO §🔥`. §3/§3b mô tả cũ: heavy pass giờ chạy **tiến trình con**, không worker in-process. *(Sử: SPEC DRAFT chốt hướng 2026-07-18.)* Ý user (làm rõ 2026-07-18): multi-máy ĐÃ có (bundle sync); **gap thật = zemory chưa có LỚP TỰ ĐỘNG** — chưa được "cài đặt" như một app, chưa có setting *tự mở khi mở PC*, chưa có setting *tự sync memory khi dữ liệu lệch*. Mọi thứ đang THỦ CÔNG (`zemory ui` tự gõ, `memory sync` tự chạy). Plan này = app hoá + tự động hoá; graph (plan 13) vào UI thành **tab lớn riêng**, sub-tab chọn project.
> Liên quan: plan 13 (graph — consumer đầu tiên của daemon UI) · plan 08 (sync xuyên máy) · plan 02 §0 (provenance).

## 1. Mục tiêu — TỰ ĐỘNG HOÁ (đang thủ công → thành setting bật/tắt)
| Hiện tại (thủ công) | Đích (tự động, user bật trong Cài đặt) |
|---|---|
| Gõ `zemory ui` mỗi lần, port ngẫu nhiên | **Daemon nền**: port CỐ ĐỊNH **4444**, 1 instance, tray icon |
| Mở PC xong phải tự bật | Setting **"Mở cùng PC"** (autostart per-OS) |
| `zemory memory sync` tự nhớ mà chạy | Setting **"Tự sync memory"**: daemon phát hiện KHÁC BIỆT dữ liệu (local mới chưa export / bundle mới chưa merge) → tự export/import theo cơ chế plan 08 |
| `memory scan`/`embed` tự gõ | Scheduler nền chạy lúc idle (scan → embed → digest) |
- UI quản **nhiều project** từ một chỗ (registry `rememberProject` đã có); đọc project khác = **read-only** (`02_RULES §Phạm vi project` — GHI vẫn cấm mặc định).
- **Tab Graph** (plan 13): tab lớn riêng; sub-tab = project (từ registry); loại: Code | Docs | (sau) Traceability.

## 2. Bất biến (dẫn chiếu — plan không phát sinh luật)
- Local-only, không transmit ngoài bundle mã hóa (HP điều 7). Daemon chỉ bind loopback; giữ Host/Origin guard hiện có (chống DNS-rebinding).
- Không proxy/LLM (HP điều 6); capture 0-token (điều 10); recall on-demand (điều 8).
- Đọc project khác read-only; mọi GHI ra project ngoài phải qua user (`02_RULES §Phạm vi project`).
- DB sống không nằm trong folder cloud-sync (điều 11).

## 3. Kiến trúc daemon
```text
┌─ zemory daemon (1 instance / máy) ───────────────────────────┐
│ HTTP server  127.0.0.1:4444 (CHỐT — user 2026-07-18;         │
│              đổi được trong ~/.zemory/config.json)            │
│ ├─ UI (tab: Harness · Bộ nhớ · GRAPH · Cài đặt)              │
│ ├─ status/data API (như hiện tại)                             │
│ └─ WRITE GATE: mọi ghi DB đi QUA daemon (serialize)           │
│ Scheduler nền: scan / embed / digest / AUTO-SYNC — CHỈ chạy  │
│              lúc idle, throttle CPU (embed ~58 msg/phút)      │
│ Tray icon + autostart (per-OS) + tự hồi phục khi crash        │
└──────────────────────────────────────────────────────────────┘
CLI `zemory …`  → nếu daemon sống: gọi qua daemon (hết "database is locked")
                → nếu daemon chết: mở DB trực tiếp như cũ (fail-open)
```
- **Port CHỐT = 4444** (user 2026-07-18); ghi trong config, đổi được; UI/CLI/hook đều biết tìm ở đâu. Single-instance = lock (port bind + lockfile).
- **WRITE GATE — lý do tồn tại chính của daemon:** sự cố thật "database is locked" (rebuild plan 12) do 2 tiến trình ghi đồng thời. Khi daemon sống, CLI/hook chuyển ghi qua daemon (HTTP local) → serialize; retry-with-backoff hiện có giữ làm lưới dưới.
- **Idle scheduler:** embed/scan nền chỉ chạy khi máy rảnh + có backlog; không rebuild graph mỗi thay đổi nhỏ (debounce theo mtime).
  > **CÁCH HIỆN THỰC "máy rảnh" — chốt 2026-08-14 (khác mô tả ban đầu).** Code KHÔNG tự dò trạng
  > thái rảnh; nó chạy theo đồng hồ 30 phút và **nhường CPU bằng ĐỘ ƯU TIÊN tiến trình**
  > (`setPriority` → `BELOW_NORMAL` cho mọi con do `runStep` sinh, và cho auto-sync qua cờ
  > `lowPriority`). Máy rảnh thì job vẫn ăn trọn 12 core; máy bận thì hệ điều hành tự cắt nhịp.
  > **Vì sao không tự dò idle:** "có backlog thì mới chạy" hoá ra là điều kiện gần như LUÔN đúng —
  > đo 2026-08-13, hook capture ghi **~23 tin/phút** trong lúc làm việc, nên backlog embed gần như
  > không bao giờ về 0. Dò idle rồi hoãn sẽ thành **bỏ đói vĩnh viễn**; hạ ưu tiên thì vừa chạy
  > được vừa không giành CPU.
  > **RANH GIỚI bắt buộc:** chỉ hạ việc do MÁY tự chạy. Việc NGƯỜI DÙNG bấm (nút *Đồng bộ ngay* —
  > cùng hàm `startSyncJob`, *Tìm sâu*, *Quét web*) giữ `Normal`, vì lúc đó người dùng đang ngồi
  > chờ kết quả. Cổng `scheduler-contract.test.mjs` canh đúng ranh giới này.
  >
  > **MỞ RỘNG 2026-08-28 — cùng thứ tự ưu tiên, nhưng cho QUYỀN VÀO KHO chứ không chỉ CPU.**
  > Ranh giới trên mới chỉ nói về nhịp CPU; token ghi kho thì vẫn "ai tới trước giữ tới xong", nên
  > một chuỗi bảo trì dài **chặn cứng** nút người dùng bấm. Nay:
  > · **người bấm** (`startSyncJob({preempt:true})`) ⇒ chuỗi bảo trì phải **NHƯỜNG** — cờ `chainAbort`
  >   + giết con đang chạy; chuỗi dừng ở chốt kế tiếp và nhả token ở `finally`;
  > · **máy tự chạy** ⇒ **xếp hàng** như cũ (`syncTick` hẹn lại 3 phút), KHÔNG cắt ngang ai;
  > · **token do tiến trình KHÁC giữ** (CLI ngoài) ⇒ **không giật** — bất khả đảo trên việc không sở hữu;
  > · **`scan` KHÔNG bị cắt**: nó là bước duy nhất đưa tin mới vào, cắt nó là đẩy một gói THIẾU tin
  >   lên kênh chung (trái HP điều 16). Chỉ `embed`/`digest` — hai thứ dựng lại được — mới nhường.
  >
  > **Vì sao cắt `embed` an toàn (ĐO, không phải cảm giác):** ghi theo transaction TỪNG TIN
  > (`vectors.ts insTx`) và `embedPending` luôn chọn phần CÒN THIẾU ⇒ mất nhiều nhất một tin. Bằng
  > chứng thực địa: log daemon **80 lượt embed khởi động / 48 lượt có `finished`** ⇒ **32 lượt đã bị
  > giết giữa chừng** bởi các lần restart, `verifyMemory` chưa lần nào báo kho hỏng.
  >
  > **Cái giá của việc KHÔNG có luật này, đo 27–28/08:** auto-sync thử lần cuối 27/08 07:11Z rồi
  > **19 giờ · 8 lần restart · 0 lượt thử**, watermark đứng, **5.266 tin ứ**. Cơ chế chống bỏ đói
  > 12/08 vẫn chạy đúng — nó nhường rồi hẹn lại 3 phút — nhưng cửa sổ trống không bao giờ tới.
  > **Chống bỏ đói bằng "hẹn quay lại" chỉ ăn khi kẻ chặn có lúc nghỉ.**

### 3b. Auto-sync memory (setting — tự động hoá plan 08, KHÔNG cơ chế mới)
- **Phát hiện khác biệt** (daemon check định kỳ + lúc idle, rẻ): ① local có message mới sau lần export cuối (so max rowid/timestamp với marker export) → **tự export** bundle `.enc` ra Drive folder; ② Drive folder có bundle máy khác mới hơn lần merge cuối (mtime + tên host) → **tự `import --merge`** (additive, HP điều 11 — không ghi đè, provenance giữ nguyên).
- **Chỉ dùng đường plan 08 sẵn có** (export/import bundle mã hóa) — auto-sync = tự BẤM cái nút user đang bấm tay, không thêm kênh truyền nào khác (HP điều 7: vẫn chỉ bundle `.enc`; setting bật = "user chủ động" ở dạng consent bền, mặc định **OFF**).
- Guard: không export khi đang có write nặng (rebuild/embed --all); debounce (vd tối thiểu N phút giữa 2 lần); log kết quả vào UI (panel Drive sync sẵn có); lỗi → báo tray, KHÔNG retry điên (fail-open, điều 9).

## 4. UI — THIẾT KẾ LẠI: project-first, tách GLOBAL vs PER-PROJECT
> 🔄 Sửa layout nháp cũ ("tab GRAPH lớn + sub-tab project") — **user chốt 2026-07-18: graph ĐI THEO project đang chọn**, hiển thị CHUNG với harness của project đó. Nguyên tắc chia: **cái thuộc Global Memory (cấp máy) → tầng tổng · cái thuộc PROJECT RIÊNG (harness · graph) → tab của từng project.**

```text
┌────────────────────────────────────────────────────────────────┐
│ [ GLOBAL MEMORY ] [ zemory ] [ SasinFlow ] [ powerbi… ] [＋] [⚙]│
│    ↑ Main chính      ↑ tab project CỐ ĐỊNH   ↑ project ngoài    │
│   (nhãn UI:         (harness+graph của       (add từ registry/  │
│    "Global Memory",  CHÍNH zemory — nó cũng   browse folder;    │
│    KHÔNG ghi         là 1 project như ai)     mỗi project        │
│    "memory")                                    = 1 TAB riêng)    │
├────────────────────────────────────────────────────────────────┤
│ GLOBAL MEMORY (Main — cấp máy, KHÔNG lệ thuộc project):        │
│    tìm bộ nhớ (hybrid) · nguồn/scope (Local/Web·máy·agent)     │
│    · Drive sync · thống kê DB/vector                            │
│ TAB <project> (zemory và mọi project add thêm, CÙNG khuôn):    │
│    ├─ Harness : 6 file docs status · validate · TODO/CHANGES   │
│    └─ Graph   : Code | Docs của CHÍNH project đó               │
│                 (lint badge · tô đỏ · blast radius)             │
│ ⚙ CÀI ĐẶT (máy): Mở cùng PC · Tự sync · port 4444 · ngôn ngữ  │
│    · nơi lưu · kiểm tra capability                              │
└────────────────────────────────────────────────────────────────┘
```
- **Thứ tự tab (user chốt 2026-07-18):** ① `GLOBAL MEMORY` = Main (nhãn UI là "Global Memory" — KHÔNG dùng chữ "memory" trên UI; memory chỉ là tên nội bộ CLI/code) → ② tab `zemory` cố định (dogfood: chính zemory hiển thị harness+graph của nó, cùng khuôn mọi project) → ③ các tab project ngoài + nút **[＋] add** (từ registry `rememberProject` / browse folder). Mỗi project = 1 tab; tab đang mở nhớ qua phiên (state layout user chỉnh phải lưu — `03_STRUCTURE §5` Dialog/layout).
- **Tab project chia 2 SUB-TAB (user chốt 2026-07-20):** trong mỗi tab project, tách **① Harness** (6 file docs status + validate/TODO + **Kiểm tra chi tiết** — checks per-project dời từ modal Settings ra đây) và **② Graph** (cây folder chuẩn bên trái + canvas graph). CSS-driven `body[data-ptab="harness|graph"]`, KHÔNG dời DOM (cùng pattern `data-tab`). Sub-tab Graph: cây folder VSCode-like = `structure-tree.ts` (`/folder-tree`, chỉ slot đã dùng, đánh dấu folder lạ chuẩn = check conformance); graph động + đồng bộ-sáng theo plan 13 (chưa code).
- **Chuẩn dùng chung KHÔNG lặp trong tab project (user chốt 2026-07-19):** khối "CHUẨN DÙNG CHUNG" (`docs_template/`: AGENTS + 01→06) là tài sản **cấp máy**, thuộc **Global Memory** (hoặc một tab riêng của nó) — **tab của mỗi project CHỈ hiển thị harness của CHÍNH nó**, không kèm bản chuẩn dùng chung. Lý do: lặp ở mọi tab vừa gây nhiễu vừa khiến user tưởng bản chuẩn là của project đó.
- **Lọc project trong thanh tab (user nêu 2026-07-19 — UI lag):** registry đang gom **mọi** folder từng chạy agent (`ztmpl1–8`, `harness-test`, `demo-proj`… ~15 mục) → thanh tab tràn + chậm. Cần: chỉ hiện project **đã pin/đang dùng**, phần còn lại đưa vào menu "…"; kèm đường **gỡ project khỏi registry**. Đây là điều kiện để tab dùng được thật.
- Graph build theo plan 13 (cạnh KHAI BÁO baseline; overlay suy luận sau) — cache per `project_root`, invalidate theo mtime. Lint layer: badge thống kê (broken-link/broken-ref/orphan/cycle) + tô đỏ + click-nhảy — prototype 2026-07-18 đã minh chứng (bắt orphan thật `core/index.ts`).

### 4b. Redesign — đơn giản hoá + tông màu (user yêu cầu 2026-07-18)
- **Đơn giản hoá:** mỗi vùng đúng 1 việc (memory=nhớ · project=harness+graph · settings=máy); bỏ dồn nút rải rác (đợt gom vào modal ⚙ 2026-07-11 đi tiếp hướng này); mật độ thông tin giảm — mặc định hiện TÓM TẮT, chi tiết mở dialog (3-size, `03_STRUCTURE §5`).
- **Theme — CHỐT (user 2026-07-18, làm rõ 2026-07-20): 2 theme chuyển được.** Toggle trong ⚙, lưu config (như `lang`). Token màu = **CSS variables 1 chỗ** trong embed UI (vai trò `frontend/styles`) — mọi màn ăn theo biến, đổi theme = đổi bộ biến, KHÔNG hardcode màu rải (đã dogfood: 0 literal màu ngoài token def, test khoá).
  - **Dark (mặc định) = có MÀU** — nền tối, accent XANH LÁ (brand zemory), amber/đỏ cho warn/error. Đây là bản sắc thương hiệu.
  - **Light = TRẮNG ĐEN (monochrome)** — user chốt 2026-07-20: *"lightmode chỉ trắng đen, như dark mode nhưng ĐẢO MÀU, không phải light-với-màu-linh-tinh"*. Light KHÔNG có màu accent: nền trắng · chữ đen · accent = **gần đen** (nút/tab/checkbox đen chữ trắng) · warn/error = xám đậm · glow tắt. Là bản đảo tông của dark, sạch trơn.
  - **Logo theo accent** (user 2026-07-20): ô logo dùng token `--green/--green2` + stroke `--bg` → dark = ô xanh, light = ô đen viền trắng. Tự đổi theo theme, KHÔNG cố định 1 màu.
  - Graph node/edge cũng đọc từ token (dark có màu nhóm · light xám theo tông).
- i18n VI/EN + luật "UI = tiếng Anh hoặc i18n" giữ nguyên.

## 5. Cài đặt & multi-machine — QUYẾT ĐỊNH: native chính, Docker chỉ headless
**Chốt (2026-07-18, sau phản biện — ghi rõ để khỏi bàn lại):**
- **Workstation (máy làm việc) = NATIVE**, KHÔNG Docker. Lý do: zemory phải (a) đọc transcript + `docs/` theo path thật của máy (`project_root` Windows tuyệt đối — container làm lệch provenance/registry), (b) SQLite WAL kỵ bind-mount (cùng họ lỗi cloud-sync, điều 11), (c) `memory scan-web` cần mở browser THẬT để user login (không làm được trong container), (d) model ONNX + native deps thêm ma sát vô ích.
- **Cài máy mới = 3 lệnh** (mọi OS): `git clone` → `npm ci && npm run build` → `npm i -g .`. Native deps (better-sqlite3, onnxruntime-node) có prebuilt Win/Mac/Linux. Dữ liệu kéo về bằng `zemory memory import --merge <bundle.enc>` (plan 08; share/ đã tracked git-LFS).
- **Docker = profile PHỤ, chỉ khi có headless server** (Linux/VPS chỉ serve index + nhận sync, không quét local, không browser). Chưa có nhu cầu thật thì chưa làm.
- Chạy nền = **tray app + autostart** theo pattern SasinFlow (`backend/resources/packaging/` icon tray/exe — convention "Icon 3 vai trò" `03_STRUCTURE §5`; đóng gói dùng slot sẵn: `.spec`/scripts/dist).

## 6. Phân kỳ đề xuất
- [x] **A. Daemon tối thiểu — XONG 2026-07-19:** port **4444** cố định (`ZEMORY_UI_PORT` override) + endpoint `/ping` (`{app:"zemory",pid}`) để nhận diện instance + single-instance: `zemory ui` lần 2 **attach** vào bản đang chạy (in pid, mở cửa sổ, thoát 0) thay vì dựng bản thứ hai. Cổng bị **app khác** chiếm → rơi về cổng tự do + báo rõ lý do (không từ chối khởi động). Verify thật cả 3 nhánh.
> 🔄 **Đảo thứ tự B↔D (user chốt 2026-07-19):** làm **giao diện TRƯỚC**, vì các setting tự-động cần chỗ để đặt và để bấm thử. Thứ tự thực thi: A ✓ → **D** → B → C → E.

- [x] **D. UI redesign + Graph v1 — XONG 2026-07-20:** cockpit tab (Global Memory · zemory · project ngoài + [＋]), theme **Dark có màu / Light TRẮNG ĐEN** (token CSS 1 chỗ, 0 literal), tab project = 2 sub-tab **Harness | Graph**, graph code THẬT (import-graph TS+Python + symbol + fan-in/out + orphan) đồng bộ 2 chiều với cây folder chuẩn. Chi tiết `05_TODO`.
- [x] **B. Tự động hoá lõi — XONG 2026-07-20:** `backend/src/autostart.ts` (**"Mở cùng PC"** per-OS: Win Startup .cmd · mac launchd · Linux xdg-desktop; reconcile lúc daemon bind) + `backend/src/jobs/scheduler.ts` (**idle scheduler** embed backlog + **"Tự sync memory"** §3b qua `syncDrive`, opt-in) + pane ⚙ **⚡ Tự động** (3 công tắc) + endpoints `/automation`/`/set-autostart`/`/set-autosync`/`/set-scheduler`. Test `autostart.test.mjs`. Mặc định: scheduler ON, autostart/autosync OFF.
- [x] **C. Write gate — XONG 2026-07-20:** `backend/src/jobs/writegate.ts` — daemon giữ cờ hold auto-hết-hạn; scheduler nhường khi CLI ghi. CLI heavy-write (`scan`/`scan-web`/`embed`/`digest`) probe daemon `/ping` → `/gate-acquire` → chạy trực tiếp → `/gate-release`; daemon chết → chạy thẳng (fallback). KHÔNG delegate job dài (tránh HTTP timeout). Trị gốc "database is locked" (plan 12). Test `writegate.test.mjs`.
- [x] **E. Đóng gói — XONG:** **lối tắt Desktop** (`setDesktopShortcut`: Win .lnk qua WScript · Linux .desktop · mac .command) + công tắc trong pane ⚡ + `npm i -g` vốn đã chạy (bin `zemory`→`dist/cli.js`). **TRAY ICON THẬT nay ĐÃ CÓ** — `platform/tray.ts` (`startTray`/`stopTray`, menu Open/Quit, fail-open theo HP điều 9) + `platform/traysweep.ts` dọn icon MA do bản trước bị kill cứng để lại; wire ở `ui.ts`. Quyết định mở §7.2 vì vậy đã đóng. *(Câu cũ ở đây — "CÒN LẠI: tray icon thật, hoãn có chủ đích, chờ user chốt cơ chế" — là chữ của 07-20, giữ trong git history.)*
- **F. (khi có nhu cầu thật) profile headless/Docker.**
Mỗi giai đoạn qua gate test/migration/fallback rồi mới bật mặc định (HP điều 12).

## 7. Quyết định mở (cần chốt khi làm)
1. ~~Số port~~ **CHỐT: 4444** (user 2026-07-18).
2. Tray app bằng gì trên Windows/Node (hidden window? helper nhỏ? — SasinFlow dùng pystray phía Python, zemory là Node).
3. Write gate phủ NHỮNG lệnh nào trước (scan/embed/digest là nặng nhất).
4. Autostart per-OS cơ chế cụ thể (Win: Startup shortcut / Task Scheduler · macOS: launchd · Linux: systemd-user).
5. Graph cache: lưu bảng trong `global_memory.db` (plan 13) hay file JSON per-project.
6. ~~Auto-sync: tiền đề phải làm DELTA EXPORT trước…~~ **ĐÓNG 2026-08-12 — xem `plan/08 §8`.**
   Đường hiện tại: **một kho chính trên kênh chung, ghi bằng NỐI THÊM**. Một lượt sync bình
   thường nối ~vài trăm KB (tin mới + vector của chúng), không có gì cản auto-sync chạy mỗi 30
   phút; không có tin mới thì **không chạm file**. Vế "auto-embed phần mới sau merge" cũng hết
   là câu hỏi: máy gửi nhúng phần của nó rồi chở kèm, nên máy nhận **không phải nhúng lại**
   (HP điều 16).

## 8. Bề mặt ĐIỀU KHIỂN qua MCP — ba tool, và bốn cách một bề mặt tự khai sai (chốt 2026-08-28)

> User chốt 2026-08-27: *"mọi chức năng đã có sẵn trên zemory hết rồi, MCP chỉ là điều khiển và quản
> lý"*. Đó là ràng buộc thiết kế, không phải lời giới thiệu: ba tool này **không được** cài logic nạp
> hay nhúng của riêng chúng. `memory_scan` gọi `scan()` + `scanWebPlatforms()`; `memory_embed` phóng
> đúng CLI `memory embed --all`; `memory_jobs` chỉ đọc trạng thái đã có. Đẻ chức năng ở tầng này là
> sinh ra một bản sao thứ hai của cùng một nghiệp vụ (trái HP điều 1 và điều 3).

**Ba tool.** `memory_jobs {deep?}` — daemon sống không · job nào đang chạy · còn bao nhiêu chờ nhúng ·
ai giữ khoá. `memory_scan {deep?, web?, platform?}` — chạy INLINE, `need-login` phải được NÓI RA (cửa
sổ trình duyệt đang chờ NGƯỜI, và tool là chỗ duy nhất biết điều đó). `memory_embed {}` — **phóng job
RỜI rồi trả ngay**; ~58 tin/phút nên không lời gọi MCP nào sống tới lúc nó xong. Cả ba qua write-gate:
bận ⇒ trả `busy` kèm TÊN chủ khoá, **không tranh khoá** (hai kẻ ghi đã hỏng kho hai lần — HP điều 11).

**Bốn cái bẫy của một bề mặt ĐIỀU KHIỂN chạy ở TIẾN TRÌNH KHÁC.** Cả bốn đều lọt qua trình biên dịch
và lọt qua mắt; chỉ lộ khi ĐO. Ai làm bề mặt điều khiển tiếp theo nên đọc mục này trước:

1. **Biến trong bộ nhớ daemon KHÔNG đọc được từ ngoài.** `schedulerChildRunning()`/`syncJobRunning()`
   trả `false` cho mọi tiến trình không phải daemon — dùng thẳng là dựng sẵn một bề mặt nói dối. Thứ
   xuyên tiến trình được chỉ có **khoá FILE** (`cli-write.lock`) và **marker FILE** (`daemon-job.lock`);
   phần còn lại phải HỎI qua HTTP, và hỏi không được thì trả `unknown`.
2. **`unknown` ≠ `false`.** Daemon im mà báo "không có gì chạy" là đúng kiểu vỏ-rỗng-trông-như-đang-sống
   mà `02_RULES §Bề mặt CHẾT THEO nền` cấm. Và phải phân biệt **hai** kiểu không-biết: *daemon chết* với
   *daemon sống nhưng trả chậm* — gộp lại thì người đọc không biết tin dòng nào.
3. **Không trả lời ≠ đã chết.** Marker job còn tươi mà `/ping` im ⇒ daemon gần như chắc chắn đang BẬN.
   Đo 2026-08-28 ngay sau khởi động: `/ping` **12.347 → 1.496 → 131 ms**. Ngưỡng chặt biến "bận" thành
   "chết" — và in ra `alive:false` ngay cạnh `daemonJobRunning:true` là tự mâu thuẫn trong một câu.
4. **THỨ TỰ HỎI là một phần của phép đo.** `/memory-status` lượt lạnh mất 7,4 s và KHOÁ event loop của
   daemon, nên mọi endpoint hỏi SAU nó bị bỏ đói rồi báo "daemon not responding" — trong khi curl cùng
   lúc ping được trong 110 ms. **Chính phép đo tạo ra thứ nó đo.** Luật: hỏi RẺ trước, NẶNG cuối.

**Giá của mỗi đường, đo trên kho thật (309k tin · 2,5 GB):** `vectorRemaining()` **15,7 s** (anti-join
toàn bảng) · `/memory-status` **107 ms** ấm, 7,4 s lạnh · `/ping` 85–183 ms lúc rảnh. Nên đường mặc
định của `memory_jobs` là đọc cache của daemon; `deep:true` mới trả tiền đếm thẳng. Kho RIÊNG
(`env.dbPath`) thì LUÔN đếm thẳng — cache của daemon là số của kho MẶC ĐỊNH, trả nó cho người đang hỏi
kho khác là đưa số của kho người ta.

**Còn hở:** chưa đo ba tool này TỪ một phiên Cowork thật (xem `plan/20 §7`) · cơ chế nghẽn `/ping` sau
khởi động mới có SỐ, chưa có bản vá.
