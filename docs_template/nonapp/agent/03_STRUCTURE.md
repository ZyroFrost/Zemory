# Cấu trúc repo chuẩn — hệ NON-APP (BI / data / docs / design)

> Chuẩn folder cho **hệ NON-APP**: dự án là **SẢN PHẨM / TÀI SẢN** (deliverable), KHÔNG có code-app chạy. Agent chỉ **đọc · dò · kéo · điền · xuất FILE** (kể cả mở `.pbix` ra dò, đổ số vào template) — *không phát triển app* ⇒ **0 luật UI**.
> Cùng triết lý hệ app: mô tả theo **VAI TRÒ** · **1 tên/concern** · **INDEX = từ điển tên, KHÔNG checklist** · **KHÔNG folder rỗng** · nguồn = tracked / file-thật-nặng = gitignore. Harness `docs/` + `AGENTS.md` **GIỮ Y HỆT app** (cùng engine, agent điều hướng như nhau).
> Dự án là **app** (có code chạy mình phát triển)? → dùng `03_STRUCTURE` hệ **app** (`zemory init`), KHÔNG phải file này. `AGENTS.md §Vào việc` bắt agent HỎI user app/non-app trước khi áp chuẩn.

## 1. Nguyên tắc
- Mô tả theo **VAI TRÒ (role)** — áp BI / data / docs-only / design gần như không đổi cấu trúc.
- **1 TÊN duy nhất cho mỗi concern**; chỉ khi công cụ ÉP CỨNG tên (vd Power BI Project `.pbip`/`.Report`/`.SemanticModel`, dbt `models/`) mới theo nó.
- **INDEX = TỪ ĐIỂN TÊN để TRA, KHÔNG phải danh sách folder phải tạo.** Slot dưới đây là *tên có sẵn để tra cứu* — **CHỈ tạo folder khi CÓ concern THẬT**, **TUYỆT ĐỐI KHÔNG tạo folder rỗng** cho "đủ bộ". Một dự án non-app điển hình chỉ hiện diện 3–8 slot.
- **Nguồn = ĐẦU VÀO** (định nghĩa nguồn · measure · template điền · deliverable · spec) = git **tracked**. **File THẬT nặng / PII / kéo-về / render-ra = ĐẦU RA** = **gitignore** (`data/` · `exports/` · `.env`).
- **BẮT BUỘC = 3 VAI TRÒ** (thay cho 4 của app): `docs/` · `AGENTS.md` · **≥1 folder DELIVERABLE** (`reports/` | `models/` | `content/` | `design/` — chọn theo loại). KHÔNG có `backend/` + `frontend/` (không có code-app).

## 2. Cây thư mục — ghi chú TỪNG DÒNG
Marker: `★` = BẮT BUỘC · `◆` = deliverable (≥1) · `[opt]` = tạo KHI CÓ concern. **Tên slot viết THƯỜNG** (nhiều từ → `_`); tên FILE/vendor có sẵn giữ nguyên (`TargetAll.xlsx`, `.pbix`, `.Report/`).
```
<project>/                          # 1 SẢN PHẨM = 1 cây
│ ═════════ ① TRACKED — NGUỒN + ĐỊNH NGHĨA + DELIVERABLE (commit lên git) ═════════
│
├── AGENTS.md            ★  cửa vào: mô tả sản phẩm + trỏ docs/ (profile: non-app)
├── docs/                ★  harness Y HỆT app: agent/(01_CONSTITUTION·02_RULES·03_STRUCTURE·04_SKILLS·05_TODO·06_CHANGES) · plan/ · .harness.json
│   └── dictionary.md   [opt] TỪ ĐIỂN DỮ LIỆU: định nghĩa metric/cột/bảng (BI/data NÊN có — chống mỗi report tính 1 kiểu)
├── docs_visual/        [opt] sơ đồ/flow/lineage XEM TRỰC QUAN cho NGƯỜI (vd luồng nạp DW) — .html tương tác/.svg;
│                            NGOÀI docs/, mỗi file có .md chủ trỏ tới + tóm tắt 1–3 dòng
│ ┄┄ DELIVERABLE — sản phẩm chính giao đi (chọn theo loại, ≥1) ┄┄
├── reports/             ◆  BI: file báo cáo .pbix/.pbip/.twb (bản chính giao đi)          [LFS nếu nhị phân nặng]
├── models/              ◆  data: semantic/transform layer — dbt model · tabular .bim · DAX model
├── content/             ◆  docs-only: nội dung .md/.mdx là sản phẩm chính
├── design/              ◆  design: .fig/.sketch/.psd nguồn thiết kế                        [LFS]
│ ┄┄ CÔNG VIỆC (đơn vị vận hành — định kỳ/lẻ) ┄┄
├── tasks/          [opt]  ĐƠN VỊ CÔNG VIỆC: mỗi task 1 folder `NN_<tên>/` (số + thường, vd `01_weekly/`)
│   │                       = spec + input/output CỦA LẦN chạy đó. Data THẬT của task mirror ở `data/<task>/`.
│   └── 01_weekly/  [opt]    vd task định kỳ: file định kỳ (report tuần) + ghi chú các bước
├── templates/      [opt]  FILE MẪU để ĐIỀN tự động (report/sheet TRỐNG chờ đổ số) — KHÁC `fixtures/` (data mẫu)
│ ┄┄ ĐẦU VÀO / XỬ LÝ ┄┄
├── sources/        [opt]  ĐỊNH NGHĨA nguồn: Power Query (M) · connection spec (trỏ TÊN env) · SQL kéo nguồn — chỗ automation "KÉO" đọc
├── measures/       [opt]  thư viện DAX/tính toán đặt tên + chú thích (trích ra để review/tái dùng)
├── queries/        [opt]  SQL/DAX/M đặt tên, gọi theo tên — KHÔNG rải inline (đối xứng store/queries.* của app)
├── pipelines/      [opt]  ETL/transform nhiều bước (code-driven: dbt/python)
├── notebooks/      [opt]  phân tích thăm dò .ipynb (research/analytics)
├── fixtures/       [opt]  DATA MẪU NHỎ (tracked) để mở report/model KHỎI cần nguồn thật
├── assets/         [opt]  theme .json · logo · icon · bảng màu cho report/design
├── scripts/        [opt]  TỰ ĐỘNG HOÁ: kéo (pull) · điền (fill) · publish/upload — script THIN, agent gọi (§5)
├── config/         [opt]  profile workspace/connection (operator): *.example.* tracked · real→gitignore
├── attic/          [opt]  bản cũ deliverable / snapshot TRƯỚC publish (rollback). Tracked
├── share/          [opt]  bundle sync mã hóa xuyên máy (chỉ khi cần) — như app
│
│ ═════════ ② ROOT — do TOOL ÉP vị trí (tôn trọng, KHÔNG dời) ═════════
│
├── README.md · LICENSE · .gitignore · .gitattributes   (manifest) giới thiệu/giấy phép/ignore/eol-lfs
├── .github/ · .vscode/ · .idea/   [opt] config CI/editor — ĐỂ YÊN ở root
│
│ ═════════ ③ GITIGNORE — KHÔNG commit (file thật / bí mật / theo máy) ═════════
│
├── data/           [opt]  FILE THẬT theo máy (nặng / PII) — ▼ [opt], tạo khi có:
│   ├── extract/    [opt]    raw PULL từ nguồn (SQL dump / rar / kéo từ VM) — theo nguồn
│   ├── adhoc/      [opt]    file LẺ check nhanh, KHÔNG thuộc task nào (README.md tracked = marker giữ folder)
│   └── <task>/     [opt]    data làm việc của từng task (mirror `tasks/<task>/`)
├── exports/        [opt]  bản render/publish sinh ra (PDF/PNG/build) — build lại được
└── .env            [opt]  connection string / token / workspace-id THẬT
```
**Ghi chú ★ — cây tối thiểu:** `AGENTS.md` + `docs/` + **≥1 deliverable**. Mọi slot khác `[opt]` — tạo KHI CÓ concern, KHÔNG folder rỗng.

## 3. Routing — cần gì / có gì → vào đâu
| Có gì / cần làm | → Slot |
|---|---|
| báo cáo / model / nội dung / thiết kế giao đi | `reports/` \| `models/` \| `content/` \| `design/` (deliverable ◆) |
| **đơn vị công việc** (report tuần, đợt phân tích) | `tasks/NN_<tên>/` (spec + I/O của lần chạy) · data thật → `data/<task>/` |
| **file mẫu chờ ĐIỀN** (report trống) | `templates/` (KHÁC `fixtures/`=data mẫu) |
| **định nghĩa nguồn** (M / connection / SQL kéo) | `sources/` (trỏ TÊN env, KHÔNG secret thật) |
| DAX / measure đặt tên | `measures/` |
| SQL / DAX / M gọi theo tên | `queries/` (KHÔNG rải inline) |
| ETL / transform nhiều bước | `pipelines/` (dbt/python) |
| phân tích thăm dò | `notebooks/` |
| data mẫu nhỏ mở được deliverable | `fixtures/` (tracked) |
| theme / logo / bảng màu report | `assets/` |
| **tự động KÉO / ĐIỀN / UPLOAD** | `scripts/` (thin) + playbook `04_SKILLS` (§5) |
| profile workspace/connection operator | `config/` (`.example` tracked · real gitignore) |
| **raw extract kéo về** (nặng, PII) | `data/extract/` (gitignore) |
| **file lẻ check nhanh, không thuộc task** | `data/adhoc/` (+ README marker) |
| data làm việc của 1 task | `data/<task>/` (gitignore, mirror `tasks/`) |
| bản render/publish sinh ra | `exports/` (gitignore, build lại được) |
| connection string / token THẬT | `.env` (gitignore) |
| định nghĩa metric/cột (nguồn sự thật) | `docs/dictionary.md` |
| sơ đồ luồng/lineage xem trực quan | `docs_visual/` (NGOÀI docs/, có .md chủ trỏ tới) |
| bản cũ deliverable / trước publish | `attic/` (rollback) |
| tài liệu / rule / plan | `docs/` — sửa FILE `.md` trực tiếp (file wins) |
| skill / playbook (grill · chốt phiên · reconcile · pull/fill/upload) | `docs/agent/04_SKILLS.md` |

## 4. Quyết định & Convention
```
3 vai trò bắt buộc   docs/ · AGENTS.md · ≥1 deliverable (reports/|models/|content/|design/). KHÔNG backend/frontend
KHÔNG folder rỗng    INDEX = từ điển tên để TRA, KHÔNG checklist. Tạo folder CHỈ khi có file/concern thật; thiếu → bỏ
1 TÊN / concern      sources/ (KHÔNG src|raw) · measures/ (KHÔNG dax|calc) · tên slot THƯỜNG, nhiều từ → `_`
Tên THƯỜNG           slot folder viết thường (tasks · sources · templates · extract · adhoc). TÊN có sẵn của người ta GIỮ NGUYÊN: file (TargetAll.xlsx · ..._REPORT.xlsx), vendor/tool ép (.pbix · .Report/ · .SemanticModel/)
adhoc ≠ task         data/adhoc/ = file LẺ check 1 lần, throwaway (chỉ giữ README marker) · cái gì thuộc DELIVERABLE ĐỊNH KỲ → phải nằm dưới tasks/<task>/ + data/<task>/. KHÔNG quăng file định kỳ vào adhoc
tasks/ đánh số        tasks/NN_<cadence>/ (00→ tăng dần, thường: 01_weekly · 02_monthly). data/<task>/ mirror ĐÚNG TÊN task
templates ≠ fixtures  templates/ = file TRỐNG chờ ĐIỀN (đổ số ra deliverable) · fixtures/ = data MẪU nhỏ để mở deliverable khỏi cần nguồn thật
Nhị phân nặng        .pbix/.twb/.fig/.psd → Git LFS (track file, LFS lo dung lượng); như share/*.enc
Data thật vs mẫu     nguồn/extract THẬT → data/ (gitignore, theo máy) · mẫu nhỏ mở được deliverable → fixtures/ (tracked)
Secret/connection    config/*.example.* tracked (trỏ TÊN env) · connection thật → .env / *.local.* (gitignore). KHÔNG commit secret
Từ điển dữ liệu      BI/data NÊN có docs/dictionary.md — định nghĩa metric/cột = nguồn sự thật, chống mỗi report tính 1 kiểu
SQL/DAX/M            gom queries/ hoặc measures/, đặt tên — KHÔNG rải inline (đối xứng store/queries của app)
Publish/refresh      tự động hóa → scripts/ (§5) · bản render ra → exports/ (gitignore, build lại được)
Sơ đồ trực quan      .html/.svg xem trực quan (luồng/lineage/lưới bảng) → docs_visual/ (NGOÀI docs/, agent KHÔNG auto-đọc); mỗi file có .md chủ trỏ + tóm tắt
Harness = app        docs/agent/* + AGENTS.md y hệt app → cùng lệnh zemory, agent điều hướng non-app đúng như app
KHÔNG luật UI        dự án non-app KHÔNG phát triển app → 0 luật thiết kế UI. "Có dashboard trong deliverable" KHÔNG biến thành app: chừng nào chỉ đọc/dò/kéo/điền/xuất file thì vẫn non-app. Trình bày deliverable (layout report/chart) = quyết định TRÌNH BÀY, trình user (02_RULES §Hành xử), tham khảo skill dataviz — KHÔNG phải luật UI-app
Ngoài phạm vi        app có code chạy (UI/server/CLI) → chuẩn APP · lib/SDK · mobile · game → convention riêng
```

## 5. Tự động hoá — KÉO / ĐIỀN / UPLOAD file
> Đây là năng lực "hệ file cho AI" của non-app. **AGENT là thứ LÀM** 3 động tác; zemory chỉ **NHỚ + KỶ LUẬT** (index việc/task đã làm vào Global Memory), **KHÔNG tự gọi LLM, KHÔNG tự đi kéo file** (điều 6 hiến pháp). Mỗi động tác = **script THIN ở `scripts/`** + **playbook ở `04_SKILLS`** (recipe cụ thể: kéo nguồn nào, điền template nào, up đi đâu).

- **KÉO (pull):** đọc `sources/` (M/connection/SQL) → kéo raw về `data/extract/` (gitignore). Credential lấy từ `.env`/`config/` — **KHÔNG bao giờ nhập password vào zemory** (mượn phiên login trên trang thật nếu là web). Playbook: `04_SKILLS §pull`.
- **ĐIỀN (fill):** lấy file `templates/` (trống) + số từ `data/`/`measures/` → xuất deliverable (`reports/`) hoặc `exports/`. Playbook: `04_SKILLS §fill`.
- **UP (upload/publish):** đẩy deliverable/exports lên đích (workspace BI · Drive · SharePoint) qua `scripts/`. Playbook: `04_SKILLS §upload`.

**Ràng buộc (bất biến):** file THẬT/PII **KHÔNG commit git** (`data/`·`exports/`·`.env` gitignore); chỉ code + định nghĩa + template + deliverable-nhẹ tracked. Xuyên máy cần chia sẻ file nặng → bundle **mã hoá** `share/` (không phải plaintext lên git). Mọi động tác tự động phải **ghi được lại** (task/lần chạy → `06_CHANGES`/`05_TODO`) để phiên sau truy được.

## 6. Reconcile — nắn repo về chuẩn (khi repo lệch)
> Flow HIẾM (chỉ khi dọn repo chưa theo chuẩn). Quy trình đầy đủ → skill **[`04_SKILLS §reconcile`](04_SKILLS.md)**. Bất biến: `zemory validate`/`structure` chỉ **CHỈ RA** chỗ lệch (advisory) — **agent tự nắn (`git mv` giữ history), zemory KHÔNG auto-move**; **đập cấu trúc lớn / khó đảo → HỎI user TRƯỚC** (`02_RULES §Hành xử`, §Git).
