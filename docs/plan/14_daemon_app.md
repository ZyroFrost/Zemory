<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Plan 14: App hoá zemory — daemon chạy nền + UI đa-project (+ tab Graph)

> Trạng thái: **SPEC DRAFT (chốt hướng 2026-07-18, CHƯA code).** Ý user (làm rõ 2026-07-18): multi-máy ĐÃ có (bundle sync); **gap thật = zemory chưa có LỚP TỰ ĐỘNG** — chưa được "cài đặt" như một app, chưa có setting *tự mở khi mở PC*, chưa có setting *tự sync brain khi dữ liệu lệch*. Mọi thứ đang THỦ CÔNG (`zemory ui` tự gõ, `brain sync` tự chạy). Plan này = app hoá + tự động hoá; graph (plan 13) vào UI thành **tab lớn riêng**, sub-tab chọn project.
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
- Graph build theo plan 13 (cạnh KHAI BÁO baseline; overlay suy luận sau) — cache per `project_root`, invalidate theo mtime. Lint layer: badge thống kê (broken-link/broken-ref/orphan/cycle) + tô đỏ + click-nhảy — prototype 2026-07-18 đã minh chứng (bắt orphan thật `core/index.ts`).

### 4b. Redesign — đơn giản hoá + tông màu (user yêu cầu 2026-07-18)
- **Đơn giản hoá:** mỗi vùng đúng 1 việc (brain=nhớ · project=harness+graph · settings=máy); bỏ dồn nút rải rác (đợt gom vào modal ⚙ 2026-07-11 đi tiếp hướng này); mật độ thông tin giảm — mặc định hiện TÓM TẮT, chi tiết mở dialog (3-size, `03_STRUCTURE §5`).
- **Theme — CHỐT (user 2026-07-18): 2 theme Dark + Light chuyển được, giống SasinFlow.** Toggle trong ⚙ Cài đặt, lưu vào config (như `lang`). Token màu = **CSS variables 1 chỗ** trong embed UI (vai trò `frontend/styles`, convention UI-embed single-bin) — mọi màn (cockpit + graph + dialog) ăn theo biến, đổi theme = đổi bộ biến, KHÔNG hardcode màu rải.
  - **Dark (mặc định):** nền `#0f1420` · panel `#161d2e` · viền `#2a3348` · chữ `#e6ebf5`/phụ `#8a97b0` · accent xanh `#5b8cff` · đỏ cảnh báo `#ff5c7a` · lục OK `#7ee787` *(đúng tông prototype graph user đã xem)*.
  - **Light:** cùng bộ vai trò biến, giá trị sáng (nền `#f6f8fc` · panel `#ffffff` · viền `#dde3ee` · chữ `#1a2233`/phụ `#5d6b85` · accent/đỏ/lục giữ hue, chỉnh độ tương phản đạt AA).
  - Graph node/edge cũng đọc từ token (nền/viền/nhãn đổi theo theme; palette nhóm giữ nguyên hue 2 theme).
- i18n VI/EN + luật "UI = tiếng Anh hoặc i18n" giữ nguyên.

## 5. Cài đặt & multi-machine — QUYẾT ĐỊNH: native chính, Docker chỉ headless
**Chốt (2026-07-18, sau phản biện — ghi rõ để khỏi bàn lại):**
- **Workstation (máy làm việc) = NATIVE**, KHÔNG Docker. Lý do: zemory phải (a) đọc transcript + `docs/` theo path thật của máy (`project_root` Windows tuyệt đối — container làm lệch provenance/registry), (b) SQLite WAL kỵ bind-mount (cùng họ lỗi cloud-sync, điều 11), (c) `brain scan-web` cần mở browser THẬT để user login (không làm được trong container), (d) model ONNX + native deps thêm ma sát vô ích.
- **Cài máy mới = 3 lệnh** (mọi OS): `git clone` → `npm ci && npm run build` → `npm i -g .`. Native deps (better-sqlite3, onnxruntime-node) có prebuilt Win/Mac/Linux. Dữ liệu kéo về bằng `zemory brain import --merge <bundle.enc>` (plan 08; share/ đã tracked git-LFS).
- **Docker = profile PHỤ, chỉ khi có headless server** (Linux/VPS chỉ serve index + nhận sync, không quét local, không browser). Chưa có nhu cầu thật thì chưa làm.
- Chạy nền = **tray app + autostart** theo pattern SasinFlow (`backend/resources/packaging/` icon tray/exe — convention "Icon 3 vai trò" `03_STRUCTURE §5`; đóng gói dùng slot sẵn: `.spec`/scripts/dist).

## 6. Phân kỳ đề xuất
- [x] **A. Daemon tối thiểu — XONG 2026-07-19:** port **4444** cố định (`ZEMORY_UI_PORT` override) + endpoint `/ping` (`{app:"zemory",pid}`) để nhận diện instance + single-instance: `zemory ui` lần 2 **attach** vào bản đang chạy (in pid, mở cửa sổ, thoát 0) thay vì dựng bản thứ hai. Cổng bị **app khác** chiếm → rơi về cổng tự do + báo rõ lý do (không từ chối khởi động). Verify thật cả 3 nhánh.
- **B. Tự động hoá lõi:** setting **"Mở cùng PC"** (autostart per-OS) + setting **"Tự sync brain"** (§3b) + idle scheduler scan/embed. Đây là gap user nêu — ưu tiên ngay sau A.
- **C. Write gate:** CLI/hook ghi qua daemon khi daemon sống; fallback mở DB trực tiếp.
- **D. UI redesign + Graph v1:** làm lại cockpit theo §4 (project-first, 3 vùng, tông màu §4b) + graph Code/Docs nằm TRONG tab project; lint badge + tô đỏ.
- **E. Tray icon + đóng gói cài đặt (installer/`npm i -g` + shortcut).**
- **F. (khi có nhu cầu thật) profile headless/Docker.**
Mỗi giai đoạn qua gate test/migration/fallback rồi mới bật mặc định (HP điều 12).

## 7. Quyết định mở (cần chốt khi làm)
1. ~~Số port~~ **CHỐT: 4444** (user 2026-07-18).
2. Tray app bằng gì trên Windows/Node (hidden window? helper nhỏ? — SasinFlow dùng pystray phía Python, zemory là Node).
3. Write gate phủ NHỮNG lệnh nào trước (scan/embed/digest là nặng nhất).
4. Autostart per-OS cơ chế cụ thể (Win: Startup shortcut / Task Scheduler · macOS: launchd · Linux: systemd-user).
5. Graph cache: lưu bảng trong `global_memory.db` (plan 13) hay file JSON per-project.
6. Auto-sync: chu kỳ check (đề xuất: lúc khởi động + mỗi 30–60 phút idle) · có auto-embed phần mới sau merge không. **Tiền đề: làm DELTA EXPORT trước (plan 08 backlog, chốt 2026-07-18)** — bundle hiện snapshot nguyên DB ~700MB (chở cả index dẫn xuất); delta chỉ vài MB/ngày → auto-sync mới chạy thoải mái được.
