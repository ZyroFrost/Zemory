# 15 — UI refactor: "AI Memory OS" (rebrand gold + nav rail + 10 màn)

> Spec cho đợt refactor UI LỚN (user đưa 3 ảnh thiết kế GPT 2026-07-22). Ghi chú/roadmap — không phải luật (luật → `01_CONSTITUTION`). Nắn theo hiến pháp: điều 6 (0 LLM), điều 12 (0 counterfactual), `03_STRUCTURE §5/§9` (token-first · resize seam · dialog 3-size · no-build · i18n 2 dict).

## Mục tiêu
Nâng cockpit 1-trang → **app đa-màn** ("Zemory · AI Memory OS"): nav rail dọc, 10 màn, rebrand **gold trên nền đen**. Ăn khớp sẵn app/non-app (màn Harness) + graph + nav mình vừa dựng.

## Ảnh thiết kế nguồn (GPT) — `docs_visual/design/`
> Chuẩn (03_STRUCTURE §3/§5): ảnh thiết kế/mockup cho NGƯỜI xem → **`docs_visual/`** (NGOÀI `docs/` ⇒ agent KHÔNG auto-đọc, 0 token). Mỗi ảnh có tóm tắt 1–3 dòng ở đây (file `.md` chủ trỏ tới). **Ảnh SHIP trong app** (logo thật render) → `frontend/assets/` (media UI); **ảnh THIẾT KẾ tham chiếu** → `docs_visual/`.
- [UI_Zemory_Logo.png](../../docs_visual/design/UI_Zemory_Logo.png) — logo gold Z + mạch 3 node trên nền đen; **nguồn của bộ icon** (favicon/tray/brand/packaging) qua `backend/scripts/make-icons.mjs`.
- [UI_Zemory_Home.png](../../docs_visual/design/UI_Zemory_Home.png) — mockup màn **Home** (gold-on-black, nav rail dọc).
- [UI_Zemory_Page.png](../../docs_visual/design/UI_Zemory_Page.png) — mockup màn **nội dung/trang** (layout tham chiếu).

## Cách làm (user chốt 2026-07-23)
- **Phase 1 — STATIC MOCK trước** (mock data, 0 backend) → user duyệt look/feel + light mode → **Phase 2 — wire endpoint thật từng màn**. Mock khớp shape payload thật.
- **Làm hết 1 lần** (không phân kỳ duyệt từng bước); user duyệt mắt bản mock.
- Giữ cockpit cũ chạy tới khi bản mới wire xong (không gãy daemon).

## Brand & token (nguồn giá trị = `frontend/styles`, 0 literal)
- Palette gold: **primary `#FFD166`** · bg `#0E0F13` · surface `#15171C` · text `#E5E7EB` · border `#23262F` (+ dẫn xuất: primary-dim, success/warn/danger, wash, glow).
- **Dark** = gold-on-near-black (mặc định). **Light** = TRẮNG + CHỪA VÀNG (gold-on-light — user muốn xem thử; thay bản monochrome cũ). Mỗi theme 1 bộ token ĐẦY ĐỦ, verify "mọi màu = token".
- Logo mới = Z gold + mạch 3 node (`ChatGPT Image ...11_24_04`). Cần re-gen bộ icon (make-icons.mjs) từ logo mới; brand ở góc nav rail.

## IA — CHỐT LẠI 2026-07-26: **5 màn** (bãi bỏ IA 10 màn bên dưới)
> 🔄 **Supersede IA "10 màn" của mục kế tiếp.** IA 10 màn là bản GPT vẽ; dựng thật ra **9 tab
> trùng chức năng** và user bác: *"ko biết session trước sao nó lại làm 1 đống tab ntn, có mấy
> cái trùng chức năng lận… mục đích là phải tối giản, ko phải đẻ thêm thứ ko cần"*.
>
> **LUẬT IA (bắt buộc, để phiên sau không dựng lại 9 tab):**
> **Một màn nhiều việc thì tách SUB-TAB — TUYỆT ĐỐI KHÔNG đẻ tab nav mới.** Và **một con số /
> một card chỉ được sống ở ĐÚNG MỘT chỗ**; chỗ khác cần thì điều hướng tới (`data-goto="màn:sub"`).
>
> | # | Màn nav | Sub-tab | Gồm |
> |---|---|---|---|
> | 1 | **Trang chủ** | Tổng quan · Tính năng & Kiểm tra | 6 ô at-a-glance · Dự án/Phiên gần đây · quick action · inventory 14 capability + Kiểm/Bật |
> | 2 | **Recall** | Tìm kiếm · Phiên | search+filter+preview · list phiên + thread + Export .md (MỘT viewer dùng chung) |
> | 3 | **Dự án** | *(trong detail)* Harness · Graph | card grid + pin/gỡ/prune · docs per-project · graph + cây folder |
> | 4 | **Global Memory** | — | bảng số → chart NHỎ → **hành động: nguồn/scope · quét · Drive sync · sao lưu** |
> | 5 | **Harness** | Docs harness · Cấu trúc folder | `docs_template` App/Non-app · cây chuẩn + routing |
>
> ⚙ **Settings = dialog** (góc phải trên), không phải màn nav.
>
> **Vì sao Global Memory KHÔNG tách "số liệu" vs "đồng bộ"** (user chốt: *"ban đầu thiết kế là
> sync đi với global memory, chứ ko có từ ingest nào hết"*): sync **LÀ** thao tác trên bộ nhớ, và
> số liệu bộ nhớ chính là thứ cần nhìn để quyết định có sync/scan hay không — tách ra là bắt nhảy
> 2 màn để làm 1 việc. Đo thực tế cũng bác: tách ra thì **không màn nào đủ nội dung**, dư khoảng
> trống mênh mông. "Ingest" là thuật ngữ nội bộ, KHÔNG dùng làm nhãn UI.
>
> **Chart = thứ tham khảo, cho không gian NHỎ** (user chốt): `.mini-row` cap chiều cao card 190px
> / svg 96px. Giữ 3 chart thấp cùng một hàng (Top Sources · Hoạt động theo ngày · Tăng trưởng);
> **Top Sources chỉ MỘT bản** (trước bị vẽ 2 lần: `gmSources` từ scopeTree + `Top Agents` từ
> `/insights`). Donut "Sức khoẻ" + card "Vector Index" riêng đã bỏ → thành tile trong bảng số.
>
> **Session viewer — luật hiển thị:** prose hiện **FULL TEXT y như lúc chat** (không cắt chữ);
> **khối code + `tool_use`/`tool_result` THU LẠI**, bấm mới mở (`<details class="fold">`).
> *Đo 2026-07-26 trên 167.738 tin:* **52,5%** tin chứa tool_use/tool_result ⇒ đó mới là thứ làm
> viewer khó đọc; `THREAD_CAP` **không** phải nguyên nhân (0 session vượt 5.000 tin); `clip()`
> 4.000 ký tự/block chỉ đụng **4,18%** tin.

## IA CŨ — nav rail dọc (10 màn) ⤴ ĐÃ BỊ THAY bởi mục trên (2026-07-26); giữ làm lịch sử
1. **Home** — greeting TRUNG TÍNH (KHÔNG "Good evening <user>" — local, không login; hiện máy + trạng thái) · 6 stat card (Messages·Sessions·Memory Health·Last Sync·Vector Coverage·Storage) · Recent Projects · Recent Sessions · System Status · Alerts (đếm THẬT) · Recall inline · Thread preview · Quick Actions · Recent Activity.
2. **Projects** — grid card (mỗi project: sessions/messages/agents + health) + **pin 📌 / gỡ ✕ / prune** (dời từ tab-menu) + search/filter/sort/paginate.
3. **Global Memory** — stats + Memory Health donut + Memory Statistics + Top Sources + **scope/provenance tree** (Local/Web×máy×agent, bỏ tick lane) + Quick Actions + Vector Index.
4. **Recall & Search** — search + filter (project·Hybrid·Rerank·Time·Type·Origin·Agent) + kết quả có score + preview thread + open session.
5. **Memory & Sync** — This Machine (Scan/Deep Scan) · Drive Sync (link/unlink/sync) · Bundles · Sync Mode (Lean/Full) · Sync Depth · **Backup/Restore/Forget/Redact** (privacy) · **automation 3 công tắc** (scheduler·autostart·autosync).
6. **Harness (Docs & Standards)** — tabs Architecture·Workflow·Standards·TODO·Changes·History · file tree (01→06+AGENTS) · doc viewer + Navigation Index panel (**2 standards APP·NON-APP** · 4 roles · routing) · **badge profile App/Non-app** · New Doc · **validate/reindex/init·sync**.
7. **Graph View** — force-directed (node=file) · Layout·Orphans·Labels · Node Inspector (fitness·nav-cost·depends/used-by·**Open in editor**). **BỎ "Ask AI about this file"** (điều 6).
8. **Insights** — CHỈ giữ TẤT ĐỊNH: Usage Trends · Top Agents · Memory Growth · **Health/Checks** (orphan/broken/never-modified — từ graph; projects-need-sync — từ watermark). **BỎ "Intelligence"/"Recommendations" kiểu AI sinh lời khuyên** (điều 6). Đổi nhãn "Intelligence"→"Health".
9. **Dialogs (Session Viewer)** — session list · Session Info · thread viewer · Actions (Export·Open in editor·Create Note — KHÔNG AI).
10. **Settings** — tabs General·Sources·Memory·Sync·Backup·Security·About · Appearance (theme·accent) · Language (VI/EN) · startup·tray · **relocate DB** (Sources) · About (version/build/engine) · Check for updates.

## NẮN theo hiến pháp (user chốt: "gpt làm quá về chức năng, zemory đâu có AI")
- **BỎ mọi thứ gọi AI:** "Ask AI about this file" (Graph) · "Intelligence"/AI-Recommendations (Insights) · greeting cá nhân hoá. zemory KHÔNG có AI riêng — trí tuệ là agent nối vào project. Cái nào không TẤT ĐỊNH → **xoá luôn**, không cố đổi tên.
- Giữ số ĐO THẬT (nav-cost "56.3x cheaper" = ratio đo được), KHÔNG trưng "đã tiết kiệm N" (điều 12).

## Nút/chức năng THIẾU so với năng lực thật → BỔ SUNG
scope/provenance exclude tree · pin/gỡ/prune trên project card · forget/redact (dry-run+backup) · 3 công tắc automation (scheduler·autostart·autosync) · relocate DB · validate/reindex/init·sync harness · **resize seam mọi vùng ≥2 panel (§5 luật)** · MCP status (nhỏ).

## File structure (no-build, `03_STRUCTURE §5`)
`frontend/pages/cockpit.html` (shell: nav rail + topbar + 10 screen container) · `frontend/styles/*` (token gold + per-concern) · `frontend/scripts/*` (router theo `data-screen` nhớ localStorage + per-screen render). Tách file theo concern, global scope, node --check sau mỗi sửa.

## Wire map (Phase 2 — endpoint phần lớn ĐÃ có)
Home/Global Memory → `/status`·`/memory-status` · Projects → `/status.knownProjects` + coverage · pin/gỡ → `/pin-project`·`/forget-project`·`/prune-projects` · Recall → `/memory-search` (chưa có? kiểm) · Harness → `/standard-doc?profile=`·`/doc`·`/folder-tree`·`/validate`·`/sync` · Graph → `/code-graph`·`/nav-cost` · Memory&Sync → `/memory-scan`·`/sync`·drive·`/set-*` · Settings → `/set-lang`·`/set-hybrid`·`/set-rerank`·autostart/autosync/scheduler·relocate. Thiếu endpoint nào → thêm ở `ui.ts` (surface mỏng).

## Trạng thái
- [x] Phase 1 static mock + Phase 2 wire — XONG (các entry `06_CHANGES` 2026-07-23 → 07-25).
- [x] **Gộp IA 9 → 5 màn (2026-07-26)** — xem §IA chốt lại ở trên. Diệt 5 nhóm trùng: 3 màn cùng nói về bộ nhớ · 2 viewer hội thoại · Top Sources vẽ 2 lần · 2 list "sức khoẻ" hardcode song song (`renderHomeChecks` ≡ `FEATURES`) · 2 màn cùng tên "memory".
- [x] **XONG 2026-07-27** — user duyệt ("ok cái UI rồi"), đã ghi `06_CHANGES` + commit + push. IA cuối là **6 màn** (tách lại "Tính năng & Kiểm tra" khỏi Home).
- [x] **XONG 2026-07-27** — `backend/test/app-ui.test.mjs` (27 test) khoá: nav đúng 6 mục · mỗi nút sub-tab có đúng một khối `.sub` · không id trùng · i18n hai chiều. Mục cũ: "nav đúng 5 mục" + "không tái sinh `sessDlg`/`homeChecks`/`gmSources`/`gmHealth`/`gmVector`".
- Backup: 5 commit đã push `origin/main` b0f07c6 (trước refactor).
