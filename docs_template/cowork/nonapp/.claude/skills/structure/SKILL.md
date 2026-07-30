---
name: structure
description: Folder standard and routing table for a non-app project (BI, report, data, docs-only, design) — decides where every file belongs. Use before creating, naming, moving, or tidying any file or folder, or when asked where something should go. Vietnamese triggers - "để ở đâu", "đặt file này vào đâu", "sắp xếp lại thư mục", "tạo thư mục", "dọn cho gọn", "file này thuộc chỗ nào".
---

# Chuẩn thư mục — hệ NON-APP

> Dự án là **SẢN PHẨM / TÀI SẢN** (deliverable), KHÔNG có code-app chạy. Agent chỉ **đọc · dò · kéo · điền · xuất FILE** — kể cả mở `.pbix` ra dò rồi đổ số vào template. ⇒ **0 luật UI**.
> Quy ước đầy đủ (đặt tên, đánh số, tracked vs gitignore) → [`reference/conventions.md`](reference/conventions.md). Kiểm tự động → `scripts/check_structure.py`.

## 1. Nguyên tắc

- Mô tả theo **VAI TRÒ** — BI / data / docs-only / design áp gần như không đổi cấu trúc.
- **1 TÊN duy nhất cho mỗi concern.** Chỉ theo tên khác khi công cụ ÉP CỨNG (`.pbip`/`.Report`/`.SemanticModel`, dbt `models/`).
- **Cây dưới là TỪ ĐIỂN ĐỂ TRA, KHÔNG phải danh sách phải tạo.** Chỉ tạo thư mục khi **CÓ file thật bỏ vào**. **TUYỆT ĐỐI KHÔNG tạo thư mục rỗng** cho "đủ bộ". Một dự án non-app điển hình chỉ dùng **3–8 slot**.
- **BẮT BUỘC 3 vai trò:** `docs/` · `AGENTS.md` · **≥1 folder deliverable**. KHÔNG có `backend/`+`frontend/`.

## 2. Cây thư mục

`★` bắt buộc · `◆` deliverable (≥1) · `[opt]` chỉ tạo khi có concern thật.
Tên slot viết **thường**, nhiều từ nối bằng `_`. Tên file/vendor có sẵn **giữ nguyên** (`TargetAll.xlsx`, `.pbix`, `.Report/`).

```
<project>/
│ ═══ TRACKED — nguồn + định nghĩa + deliverable ═══
├── AGENTS.md         ★  cửa vào: mô tả dự án + hợp đồng nạp
├── docs/             ★  agent/(01·02·05·06) · plan/ · .harness.json
│   └── dictionary.md    [opt] định nghĩa metric/cột — BI/data NÊN có
├── docs_visual/      [opt] sơ đồ · lineage cho NGƯỜI xem (.html/.svg), NGOÀI docs/
│ ─── DELIVERABLE — chọn theo loại, ≥1 ───
├── reports/          ◆  BI: .pbix/.pbip/.twb                    [LFS nếu nặng]
├── models/           ◆  data: dbt · tabular .bim · DAX model
├── content/          ◆  docs-only: .md/.mdx là sản phẩm chính
├── design/           ◆  design: .fig/.sketch/.psd               [LFS]
│ ─── CÔNG VIỆC ───
├── tasks/            [opt] việc định kỳ: SCHEDULE.md + mỗi task 1 folder NN_<tên>/ + spec.md
├── templates/        [opt] file mẫu TRỐNG chờ ĐIỀN  (≠ fixtures)
│ ─── ĐẦU VÀO / XỬ LÝ ───
├── sources/          [opt] định nghĩa nguồn: M · connection spec · SQL kéo
├── measures/         [opt] DAX / công thức đặt tên + chú thích
├── queries/          [opt] SQL/DAX/M gọi theo tên — KHÔNG rải inline
├── pipelines/        [opt] NN_<tên>/ MIRROR tasks/ · common.py + stage 00,01,02…
├── notebooks/        [opt] phân tích thăm dò .ipynb
├── fixtures/         [opt] data MẪU nhỏ (tracked) — mở deliverable khỏi cần nguồn thật
├── assets/           [opt] theme · logo · icon · bảng màu
├── scripts/          [opt] tự động hoá: kéo · điền · publish (THIN, agent gọi)
├── config/           [opt] profile connection: *.example.* tracked · thật → gitignore
├── attic/            [opt] bản cũ / snapshot TRƯỚC publish (rollback) — tracked
│ ═══ ROOT — tool ép vị trí, KHÔNG dời ═══
├── README.md · LICENSE · .gitignore · .gitattributes
├── <tên>.cmd         [opt] launcher task đánh số — **THUẦN ASCII** (dấu tiếng Việt vỡ cmd.exe)
├── .github/ · .vscode/ · .idea/   [opt] để yên ở root
│ ═══ GITIGNORE — KHÔNG commit ═══
├── data/             [opt] file THẬT (nặng/PII): extract/ · adhoc/ · <task>/
├── exports/          [opt] bản render/publish — tạo lại được
└── .env              [opt] connection string · token THẬT
```

**Cây tối thiểu:** `AGENTS.md` + `docs/` + **≥1 deliverable**. Mọi slot khác `[opt]`.

## 3. Routing — cần gì / có gì → vào đâu

| Có gì / cần làm | → Slot |
|---|---|
| báo cáo / model / nội dung / thiết kế giao đi | `reports/` \| `models/` \| `content/` \| `design/` ◆ |
| **đơn vị công việc** (báo cáo tuần, đợt phân tích) | `tasks/NN_<tên>/spec.md` · data thật → `data/<task>/` |
| **pipeline thực thi task** (stage đánh số) | `pipelines/NN_<tên>/` MIRROR `tasks/` · `common.py` + `00_`/`01_`/`02_` |
| **danh mục việc định kỳ** (nhịp + câu đã dán vào lịch) | `tasks/SCHEDULE.md` — MỘT dòng mỗi task |
| **launcher chạy task** | `<tên>.cmd` ở GỐC — ASCII thuần |
| **output stage / deliverable** | trung gian `data/<task>/NN_*` · deliverable tên nghiệp vụ (KHÔNG prefix số) |
| **file mẫu chờ ĐIỀN** (report trống) | `templates/` |
| **định nghĩa nguồn** (M / connection / SQL kéo) | `sources/` — trỏ TÊN env, KHÔNG secret thật |
| DAX / measure đặt tên | `measures/` |
| SQL / DAX / M gọi theo tên | `queries/` — KHÔNG rải inline |
| ETL / transform nhiều bước | `pipelines/` |
| phân tích thăm dò | `notebooks/` |
| data mẫu nhỏ mở được deliverable | `fixtures/` (tracked) |
| theme / logo / bảng màu | `assets/` |
| **tự động KÉO / ĐIỀN / UPLOAD** | `scripts/` (thin) + skill `pull` · `fill` · `upload` |
| profile workspace/connection | `config/` — `*.example.*` tracked · thật gitignore |
| **raw extract kéo về** (nặng, PII) | `data/extract/` (gitignore) |
| **file lẻ check 1 lần, không thuộc task** | `data/adhoc/` (+ README marker) |
| data làm việc của 1 task | `data/<task>/` (gitignore, mirror `tasks/`) |
| bản render/publish sinh ra | `exports/` (gitignore) |
| connection string / token THẬT | `.env` (gitignore) |
| định nghĩa metric/cột (nguồn sự thật) | `docs/dictionary.md` |
| sơ đồ luồng/lineage xem trực quan | `docs_visual/` — NGOÀI `docs/`, có `.md` chủ trỏ tới |
| bản cũ deliverable / trước publish | `attic/` |
| tài liệu / luật / plan | `docs/` — sửa file `.md` trực tiếp (file wins) |
| quy trình thao tác lặp lại | `.claude/skills/<tên>/SKILL.md` |

## 4. Trước khi tạo hoặc dời bất cứ gì

1. Tra bảng §3 → ra slot. Không có dòng nào khớp → **HỎI**, đừng đẻ tên mới.
2. Đối chiếu [`reference/conventions.md`](reference/conventions.md) cho quy ước đặt tên và đánh số.
3. **Dời file của user = ĐỀ XUẤT, không tự làm.** In bảng `file/nhóm · đang ở · nên ở · vì sao`, chờ gật từng mục. Nắn cả thư mục → skill `reconcile`.
4. Thêm slot mới vào chuẩn = **đổi chuẩn** → trình user duyệt trước.
