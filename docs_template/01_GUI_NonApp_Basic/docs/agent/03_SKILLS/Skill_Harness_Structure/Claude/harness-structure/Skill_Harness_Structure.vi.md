---
version: 18
lang: vi
---

# Chuẩn thư mục — hệ NON-APP

> Dự án là **SẢN PHẨM / TÀI SẢN** (deliverable), KHÔNG có code-app chạy. Agent chỉ **đọc · dò · kéo · điền · xuất FILE** — kể cả mở `.pbix` ra dò rồi đổ số vào template. ⇒ **0 luật UI**.
> Quy ước đầy đủ (đặt tên, đánh số, tracked vs gitignore) → [`references/conventions.md`](references/conventions.md). Kiểm tự động → `scripts/check_structure.py`.

## 1. Nguyên tắc

- Mô tả theo **VAI TRÒ** — BI / data / docs-only / design áp gần như không đổi cấu trúc.
- **1 TÊN duy nhất cho mỗi concern.** Chỉ theo tên khác khi công cụ ÉP CỨNG (`.pbip`/`.Report`/`.SemanticModel`, dbt `models/`).
- **Cây dưới là TỪ ĐIỂN ĐỂ TRA, KHÔNG phải danh sách phải tạo.** Chỉ tạo thư mục khi **CÓ file thật bỏ vào**. **TUYỆT ĐỐI KHÔNG tạo thư mục rỗng** cho "đủ bộ". Một dự án non-app điển hình chỉ dùng **3–8 slot**.
- **BẮT BUỘC 3 vai trò:** `docs/` · `AGENTS.md` · **≥1 folder deliverable**. KHÔNG có `backend/`+`frontend/`.

## 2. Cây thư mục

`★` bắt buộc · `◆` deliverable (≥1) · `[opt]` chỉ tạo khi có concern thật.
Tên slot viết **thường**, nhiều từ nối bằng `_`. Tên file/vendor có sẵn **giữ nguyên** (`TargetAll.xlsx`, `.pbix`, `.Report/`).
**MỌI tên file/folder do MÌNH đặt viết bằng tiếng Anh ASCII thuần** — KHÔNG ngôn ngữ bản địa (cả có dấu lẫn mất dấu), KHÔNG ký tự ngoài ASCII; hay vi phạm nhất là tên case `tasks/<case>/` và `docs/plan/NN_tên.md`. NỘI DUNG bên trong theo `Rule_Gate_02_ReaderText` · `Rule_Gate_31_NoBrokenVietnamese` — luật này chỉ nói về TÊN. Lý do: tên bị gõ lại trong lệnh·đường dẫn·link, dấu vỡ theo encoding và ký tự đồng hình (`с` Cyrillic vs `c` Latin) làm ref chết không nhìn ra.

```
<project>/
│ ═══ TRACKED — nguồn + định nghĩa + deliverable ═══
├── AGENTS.md         ★  cửa vào: mô tả dự án + hợp đồng nạp
├── docs/             ★  agent/(01·02·05·06) · plan/ · .harness.json
│       └ 02_STRUCTURE/INDEX.md = mục lục slot do máy sinh · định nghĩa: khung HP Cons_Gate_12_SourceOfTruth
├── docs_visual/      [opt] sơ đồ · lineage cho NGƯỜI xem (.html/.svg), NGOÀI docs/
│ ─── DELIVERABLE — chọn theo loại, ≥1 ───
├── reports/          ◆  BI: .pbix/.pbip/.twb                    [LFS nếu nặng]
├── models/           ◆  data: dbt · tabular .bim · DAX model
├── content/          ◆  docs-only: .md/.mdx là sản phẩm chính
├── design/           ◆  design: .fig/.sketch/.psd               [LFS]
│ ─── CÔNG VIỆC ───
├── tasks/            [opt] case: SCHEDULE.md + mỗi case 1 folder <MÃ PHÒNG>_<NHỊP>_<TênViệc>/ + spec.md, không đánh số
├── templates/        [opt] file mẫu TRỐNG chờ ĐIỀN  (≠ fixtures)
│ ─── ĐẦU VÀO / XỬ LÝ ───
├── sources/          [opt] định nghĩa nguồn: M · connection spec · SQL kéo
├── measures/         [opt] DAX / công thức đặt tên + chú thích
├── queries/          [opt] SQL/DAX/M gọi theo tên — KHÔNG rải inline
├── pipelines/        [opt] <domain>/ ETL nhiều case dùng · common.py + stage 00,01,02…
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
| **đơn vị công việc** (báo cáo tuần, đợt phân tích) | `tasks/<MÃ PHÒNG>_<NHỊP>_<TênViệc>/spec.md`, không đánh số · data thật → `data/<case>/` |
| **thứ của MỘT case** (SQL kéo · query check · config · findings) | `tasks/<case>/` — hỏi trước: thuộc một case hay dùng chung? (slot `Tasks_115_Tasks`) |
| **pipeline thực thi task** (stage đánh số) | `tasks/<case>/pipeline/` · `common.py` + `00_`/`01_`/`02_`; ETL nhiều case dùng → `pipelines/<domain>/` |
| **danh mục việc định kỳ** (nhịp + câu đã dán vào lịch) | `tasks/SCHEDULE.md` — MỘT dòng mỗi task |
| **launcher chạy task** | `bin/<tên>.cmd` — ASCII thuần (slot `Bin_082_Bin`) |
| **output stage / deliverable** | trung gian `data/<task>/NN_*` · deliverable tên nghiệp vụ (KHÔNG prefix số) |
| **file mẫu chờ ĐIỀN** (report trống) | `templates/` |
| **định nghĩa nguồn dùng chung** (M / connection / SQL kéo, từ hai case trở lên) | `sources/` — trỏ TÊN env, KHÔNG secret thật |
| DAX / measure đặt tên | `measures/` |
| SQL / DAX / M gọi theo tên, từ hai case trở lên dùng | `queries/` — KHÔNG rải inline |
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
| định nghĩa metric/cột (nguồn sự thật) | khung HP `Cons_Gate_12_SourceOfTruth` (mục Định nghĩa) · cách tính: skill riêng `Skill_Own_<Tên>` |
| sơ đồ luồng/lineage xem trực quan | `docs_visual/` — NGOÀI `docs/`, có `.md` chủ trỏ tới |
| bản cũ deliverable / trước publish | `attic/` |
| tài liệu / luật / plan | `docs/` — sửa file `.md` trực tiếp (file wins) |
| quy trình thao tác lặp lại | `.claude/skills/<tên>/SKILL.md` |

## 4. Trước khi tạo hoặc dời bất cứ gì

1. Tra bảng §3 → ra slot. Không có dòng nào khớp → **HỎI**, đừng đẻ tên mới.
2. Đối chiếu [`references/conventions.md`](references/conventions.md) cho quy ước đặt tên và đánh số.
3. **Dời file có sẵn = ĐỀ XUẤT, không tự làm.** In bảng `file/nhóm · đang ở · nên ở · vì sao`, chờ gật từng mục. Nắn cả thư mục → skill `reconcile`.
4. Thêm slot mới vào chuẩn = **đổi chuẩn** → làm theo §5, trình duyệt trước.

## 5. Đề xuất slot hoặc template mới

1. Ghi ra đường dẫn và loại file của thứ cần chỗ đặt.
2. Dò MỌI slot trên HS theo **đường dẫn** (trùng · nằm trong folder của một slot) và theo **loại file** (cùng vai dưới tên
   khác: `package.json` · `pyproject.toml` · `requirements.txt` đều là file khai phụ thuộc). Tên slot không phải phép dò.
3. Slot có sẵn nhận được ⇒ mở rộng `path:` của nó, hoặc thêm slot đó vào template cần nó. Không đẻ slot mới.
4. Nội dung là chuẩn dùng chung (luật, quy trình, khung) ⇒ rã vào phần HS tương ứng, không giữ thành folder của repo.
5. Chỉ khi thứ đó có **luật riêng** mà slot cũ không có (template nào được có · ai được sửa · có vào git không) ⇒ slot
   mới: header `checked: [<slot đã cân>, …]`, thân bài có dòng `Khác <slot cũ>: <luật riêng>` cho từng slot nó chồng lên.
6. Template cấu trúc mới: dò các `Struc_*` cùng cách; template có sẵn nhận thêm slot hay `role` được ⇒ sửa template đó.
7. Đề xuất đi qua `Rule_Gate_85_ProposeChecked` và `Rule_Gate_83_HarnessFromStore`.

- Ví dụ ✗: slot `Root_142_Requirements` cho `requirements.txt` và `Content_141_WorkspaceStandard` cho thư mục bộ chuẩn chung.
- Ví dụ ✓: thêm `requirements.txt` vào `path:` của `Root_059_PackageJson`; rã thư mục bộ chuẩn chung vào luật và skill trên HS.
- Máy kiểm: gate đỏ khi slot mới chồng lên slot cũ mà thiếu `checked:` hoặc thiếu dòng `Khác`.

## Implements · Thi hành luật
- `Rule_Gate_85_ProposeChecked` — proposing a slot or a structure template · đề xuất slot hay template cấu trúc
