<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Plan 14: App hoá zemory — daemon chạy nền + UI đa-project (+ tab Graph)

> Trạng thái: **BUILT 07-19→21** — A daemon(4444) · D UI+graph · B tự-động(autostart/scheduler) · C write-gate · E tray(systray2)+lối tắt+**sync chạy ẩn**(child job). Còn: F headless. §7.2–7.6 (tray/cache/autosync) ĐÃ CHỐT bởi code — xem `06_CHANGES` + `05_TODO §🔥`. §3/§3b mô tả cũ: heavy pass giờ chạy **tiến trình con**, không worker in-process. *(Sử: SPEC DRAFT chốt hướng 2026-07-18.)* Ý user (làm rõ 2026-07-18): multi-máy ĐÃ có (bundle sync); **gap thật = zemory chưa có LỚP TỰ ĐỘNG** — chưa được "cài đặt" như một app, chưa có setting *tự mở khi mở PC*, chưa có setting *tự sync brain khi dữ liệu lệch*. Mọi thứ đang THỦ CÔNG (`zemory ui` tự gõ, `brain sync` tự chạy). Plan này = app hoá + tự động hoá; graph (plan 13) vào UI thành **tab lớn riêng**, sub-tab chọn project.
> Liên quan: plan 13 (graph — consumer đầu tiên của daemon UI) · plan 08 (sync xuyên máy) · plan 02 §0 (provenance).

## 1. Mục tiêu — TỰ ĐỘNG HOÁ (đang thủ công → thành setting bật/tắt)
| Hiện tại (thủ công) | Đích (tự động, user bật trong Cài đặt) |
|---|---|
| Gõ `zemory ui` mỗi lần, port ngẫu nhiên | **Daemon nền**: port CỐ ĐỊNH **4444**, 1 instance, tray icon |
| Mở PC xong phải tự bật | Setting **"Mở cùng PC"** (autostart per-OS) |
| `zemory brain sync` tự nhớ mà chạy | Setting **"Tự sync brain"**: daemon phát hiện KHÁC BIỆT dữ liệu (local mới chưa export / bundle mới chưa merge) → tự export/import theo cơ chế plan 08 |
| `brain scan`/`embed` tự gõ | Scheduler nền chạy lúc idle (scan → embed → digest) |
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
│ ├─ UI cockpit (tab: Harness · Bộ nhớ · GRAPH · Cài đặt)      │
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

### 3b. Auto-sync brain (setting — tự động hoá plan 08, KHÔNG cơ chế mới)
- **Phát hiện khác biệt** (daemon check định kỳ + lúc idle, rẻ): ① local có message mới sau lần export cuối (so max rowid/timestamp với marker export) → **tự export** bundle `.enc` ra Drive folder; ② Drive folder có bundle máy khác mới hơn lần merge cuối (mtime + tên host) → **tự `import --merge`** (additive, HP điều 11 — không ghi đè, provenance giữ nguyên).
- **Chỉ dùng đường plan 08 sẵn có** (export/import bundle mã hóa) — auto-sync = tự BẤM cái nút user đang bấm tay, không thêm kênh truyền nào khác (HP điều 7: vẫn chỉ bundle `.enc`; setting bật = "user chủ động" ở dạng consent bền, mặc định **OFF**).
- Guard: không export khi đang có write nặng (rebuild/embed --all); debounce (vd tối thiểu N phút giữa 2 lần); log kết quả vào UI (panel Drive sync sẵn có); lỗi → báo tray, KHÔNG retry điên (fail-open, điều 9).

## 4. UI — THIẾT KẾ LẠI: project-first, tách GLOBAL vs PER-PROJECT
> 🔄 Sửa layout nháp cũ ("tab GRAPH lớn + sub-tab project") — **user chốt 2026-07-18: graph ĐI THEO project đang chọn**, hiển thị CHUNG với harness của project đó. Nguyên tắc chia: **cái thuộc BRAIN CHUNG (cấp máy) → tầng tổng · cái thuộc PROJECT RIÊNG (harness · graph) → tab của từng project.**

```text
┌────────────────────────────────────────────────────────────────┐
│ [ GLOBAL MEMORY ] [ zemory ] [ SasinFlow ] [ powerbi… ] [＋] [⚙]│
│    ↑ Main chính      ↑ tab project CỐ ĐỊNH   ↑ project ngoài    │
│   (nhãn UI:         (harness+graph của       (add từ registry/  │
│    "Global Memory",  CHÍNH zemory — nó cũng   browse folder;    │
│    KHÔNG ghi         là 1 project như ai)     mỗi project        │
│    "brain")                                    = 1 TAB riêng)    │
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
- **Thứ tự tab (user chốt 2026-07-18):** ① `GLOBAL MEMORY` = Main (nhãn UI là "Global Memory" — KHÔNG dùng chữ "brain" trên UI; brain chỉ là tên nội bộ CLI/code) → ② tab `zemory` cố định (dogfood: chính zemory hiển thị harness+graph của nó, cùng khuôn mọi project) → ③ các tab project ngoài + nút **[＋] add** (từ registry `rememberProject` / browse folder). Mỗi project = 1 tab; tab đang mở nhớ qua phiên (state layout user chỉnh phải lưu — `03_STRUCTURE §5` Dialog/layout).
- **Tab project chia 2 SUB-TAB (user chốt 2026-07-20):** trong mỗi tab project, tách **① Harness** (6 file docs status + validate/TODO + **Kiểm tra chi tiết** — checks per-project dời từ modal Settings ra đây) và **② Graph** (cây folder chuẩn bên trái + canvas graph). CSS-driven `body[data-ptab="harness|graph"]`, KHÔNG dời DOM (cùng pattern `data-tab`). Sub-tab Graph: cây folder VSCode-like = `structure-tree.ts` (`/folder-tree`, chỉ slot đã dùng, đánh dấu folder lạ chuẩn = check conformance); graph động + đồng bộ-sáng theo plan 13 (chưa code).
- **Chuẩn dùng chung KHÔNG lặp trong tab project (user chốt 2026-07-19):** khối "CHUẨN DÙNG CHUNG" (`docs_template/`: AGENTS + 01→06) là tài sản **cấp máy**, thuộc **Global Memory** (hoặc một tab riêng của nó) — **tab của mỗi project CHỈ hiển thị harness của CHÍNH nó**, không kèm bản chuẩn dùng chung. Lý do: lặp ở mọi tab vừa gây nhiễu vừa khiến user tưởng bản chuẩn là của project đó.
- **Lọc project trong thanh tab (user nêu 2026-07-19 — UI lag):** registry đang gom **mọi** folder từng chạy agent (`ztmpl1–8`, `harness-test`, `demo-proj`… ~15 mục) → thanh tab tràn + chậm. Cần: chỉ hiện project **đã pin/đang dùng**, phần còn lại đưa vào menu "…"; kèm đường **gỡ project khỏi registry**. Đây là điều kiện để tab dùng được thật.
- Graph build theo plan 13 (cạnh KHAI BÁO baseline; overlay suy luận sau) — cache per `project_root`, invalidate theo mtime. Lint layer: badge thống kê (broken-link/broken-ref/orphan/cycle) + tô đỏ + click-nhảy — prototype 2026-07-18 đã minh chứng (bắt orphan thật `core/index.ts`).

### 4b. Redesign — đơn giản hoá + tông màu (user yêu cầu 2026-07-18)
- **Đơn giản hoá:** mỗi vùng đúng 1 việc (brain=nhớ · project=harness+graph · settings=máy); bỏ dồn nút rải rác (đợt gom vào modal ⚙ 2026-07-11 đi tiếp hướng này); mật độ thông tin giảm — mặc định hiện TÓM TẮT, chi tiết mở dialog (3-size, `03_STRUCTURE §5`).
- **Theme — CHỐT (user 2026-07-18, làm rõ 2026-07-20): 2 theme chuyển được.** Toggle trong ⚙, lưu config (như `lang`). Token màu = **CSS variables 1 chỗ** trong embed UI (vai trò `frontend/styles`) — mọi màn ăn theo biến, đổi theme = đổi bộ biến, KHÔNG hardcode màu rải (đã dogfood: 0 literal màu ngoài token def, test khoá).
  - **Dark (mặc định) = có MÀU** — nền tối, accent XANH LÁ (brand zemory), amber/đỏ cho warn/error. Đây là bản sắc thương hiệu.
  - **Light = TRẮNG ĐEN (monochrome)** — user chốt 2026-07-20: *"lightmode chỉ trắng đen, như dark mode nhưng ĐẢO MÀU, không phải light-với-màu-linh-tinh"*. Light KHÔNG có màu accent: nền trắng · chữ đen · accent = **gần đen** (nút/tab/checkbox đen chữ trắng) · warn/error = xám đậm · glow tắt. Là bản đảo tông của dark, sạch trơn.
  - **Logo theo accent** (user 2026-07-20): ô logo dùng token `--green/--green2` + stroke `--bg` → dark = ô xanh, light = ô đen viền trắng. Tự đổi theo theme, KHÔNG cố định 1 màu.
  - Graph node/edge cũng đọc từ token (dark có màu nhóm · light xám theo tông).
- i18n VI/EN + luật "UI = tiếng Anh hoặc i18n" giữ nguyên.

## 5. Cài đặt & multi-machine — QUYẾT ĐỊNH: native chính, Docker chỉ headless
**Chốt (2026-07-18, sau phản biện — ghi rõ để khỏi bàn lại):**
- **Workstation (máy làm việc) = NATIVE**, KHÔNG Docker. Lý do: zemory phải (a) đọc transcript + `docs/` theo path thật của máy (`project_root` Windows tuyệt đối — container làm lệch provenance/registry), (b) SQLite WAL kỵ bind-mount (cùng họ lỗi cloud-sync, điều 11), (c) `brain scan-web` cần mở browser THẬT để user login (không làm được trong container), (d) model ONNX + native deps thêm ma sát vô ích.
- **Cài máy mới = 3 lệnh** (mọi OS): `git clone` → `npm ci && npm run build` → `npm i -g .`. Native deps (better-sqlite3, onnxruntime-node) có prebuilt Win/Mac/Linux. Dữ liệu kéo về bằng `zemory brain import --merge <bundle.enc>` (plan 08; share/ đã tracked git-LFS).
- **Docker = profile PHỤ, chỉ khi có headless server** (Linux/VPS chỉ serve index + nhận sync, không quét local, không browser). Chưa có nhu cầu thật thì chưa làm.
- Chạy nền = **tray app + autostart** theo pattern SasinFlow (`backend/resources/packaging/` icon tray/exe — convention "Icon 3 vai trò" `03_STRUCTURE §5`; đóng gói dùng slot sẵn: `.spec`/scripts/dist).

## 6. Phân kỳ đề xuất
- [x] **A. Daemon tối thiểu — XONG 2026-07-19:** port **4444** cố định (`ZEMORY_UI_PORT` override) + endpoint `/ping` (`{app:"zemory",pid}`) để nhận diện instance + single-instance: `zemory ui` lần 2 **attach** vào bản đang chạy (in pid, mở cửa sổ, thoát 0) thay vì dựng bản thứ hai. Cổng bị **app khác** chiếm → rơi về cổng tự do + báo rõ lý do (không từ chối khởi động). Verify thật cả 3 nhánh.
> 🔄 **Đảo thứ tự B↔D (user chốt 2026-07-19):** làm **giao diện TRƯỚC**, vì các setting tự-động cần chỗ để đặt và để bấm thử. Thứ tự thực thi: A ✓ → **D** → B → C → E.

- [x] **D. UI redesign + Graph v1 — XONG 2026-07-20:** cockpit tab (Global Memory · zemory · project ngoài + [＋]), theme **Dark có màu / Light TRẮNG ĐEN** (token CSS 1 chỗ, 0 literal), tab project = 2 sub-tab **Harness | Graph**, graph code THẬT (import-graph TS+Python + symbol + fan-in/out + orphan) đồng bộ 2 chiều với cây folder chuẩn. Chi tiết `05_TODO`.
- [x] **B. Tự động hoá lõi — XONG 2026-07-20:** `backend/src/autostart.ts` (**"Mở cùng PC"** per-OS: Win Startup .cmd · mac launchd · Linux xdg-desktop; reconcile lúc daemon bind) + `backend/src/jobs/scheduler.ts` (**idle scheduler** embed backlog + **"Tự sync brain"** §3b qua `syncDrive`, opt-in) + pane ⚙ **⚡ Tự động** (3 công tắc) + endpoints `/automation`/`/set-autostart`/`/set-autosync`/`/set-scheduler`. Test `autostart.test.mjs`. Mặc định: scheduler ON, autostart/autosync OFF.
- [x] **C. Write gate — XONG 2026-07-20:** `backend/src/jobs/writegate.ts` — daemon giữ cờ hold auto-hết-hạn; scheduler nhường khi CLI ghi. CLI heavy-write (`scan`/`scan-web`/`embed`/`digest`) probe daemon `/ping` → `/gate-acquire` → chạy trực tiếp → `/gate-release`; daemon chết → chạy thẳng (fallback). KHÔNG delegate job dài (tránh HTTP timeout). Trị gốc "database is locked" (plan 12). Test `writegate.test.mjs`.
- [~] **E. Đóng gói — MỘT PHẦN 2026-07-20:** **lối tắt Desktop** (`setDesktopShortcut`: Win .lnk qua WScript · Linux .desktop · mac .command) + công tắc trong pane ⚡ + `npm i -g` vốn đã chạy (bin `zemory`→`dist/cli.js`). **CÒN LẠI — TRAY ICON THẬT (hoãn có chủ đích):** khay hệ thống có menu cần chọn cơ chế — native npm module (rà license, rủi ro build — HP điều 2) HOẶC helper PowerShell Windows-only (fragile, khó test). Là quyết định mở §7.2; KHÔNG ship code GUI chưa verify để tránh lỗi. Chờ user chốt hướng tray.
- **F. (khi có nhu cầu thật) profile headless/Docker.**
Mỗi giai đoạn qua gate test/migration/fallback rồi mới bật mặc định (HP điều 12).

## 7. Quyết định mở (cần chốt khi làm)
1. ~~Số port~~ **CHỐT: 4444** (user 2026-07-18).
2. Tray app bằng gì trên Windows/Node (hidden window? helper nhỏ? — SasinFlow dùng pystray phía Python, zemory là Node).
3. Write gate phủ NHỮNG lệnh nào trước (scan/embed/digest là nặng nhất).
4. Autostart per-OS cơ chế cụ thể (Win: Startup shortcut / Task Scheduler · macOS: launchd · Linux: systemd-user).
5. Graph cache: lưu bảng trong `global_memory.db` (plan 13) hay file JSON per-project.
6. Auto-sync: chu kỳ check (đề xuất: lúc khởi động + mỗi 30–60 phút idle) · có auto-embed phần mới sau merge không. **Tiền đề: làm DELTA EXPORT trước (plan 08 backlog, chốt 2026-07-18)** — bundle hiện snapshot nguyên DB ~700MB (chở cả index dẫn xuất); delta chỉ vài MB/ngày → auto-sync mới chạy thoải mái được.
