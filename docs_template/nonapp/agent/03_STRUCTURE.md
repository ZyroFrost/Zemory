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
├── AGENTS.md            ★  cửa vào: mô tả sản phẩm + trỏ docs/ (profile: non-app) — chuẩn liên-công-cụ agents.md
├── CLAUDE.md            ★  cửa vào thứ 2: CHỈ `@AGENTS.md`. Claude Code đọc CLAUDE.md, KHÔNG đọc AGENTS.md ⇒ thiếu file này là cửa vào không tự nạp
├── docs/                ★  harness Y HỆT app: agent/(01_CONSTITUTION·02_RULES·03_STRUCTURE·04_SKILLS·05_TODO·06_CHANGES) · plan/ · .harness.json
│                            ⚠ TỪ ĐIỂN DỮ LIỆU nằm ở §7 của CHÍNH file này — KHÔNG tạo `docs/dictionary.md`
├── .claude/skills/      ★  QUY TRÌNH thao tác, mỗi skill một thư mục tự chứa (sổ đăng ký: 04_SKILLS)
├── docs_visual/        [opt] sơ đồ/flow/lineage XEM TRỰC QUAN cho NGƯỜI (vd luồng nạp DW) — .html tương tác/.svg;
│                            NGOÀI docs/, mỗi file có .md chủ trỏ tới + tóm tắt 1–3 dòng
│ ┄┄ DELIVERABLE — sản phẩm chính giao đi (chọn theo loại, ≥1) ┄┄
├── reports/             ◆  BI: file báo cáo .pbix/.pbip/.twb (bản chính giao đi)          [LFS nếu nhị phân nặng]
├── models/              ◆  data: semantic/transform layer — dbt model · tabular .bim · DAX model
├── content/             ◆  docs-only: nội dung .md/.mdx là sản phẩm chính.
│                            Repo nặng ĐIỀU TRA (deliverable là hồ sơ case): findings nằm trong
│                            `tasks/<case>/`, `content/` giữ đúng `README.md` = **INDEX case**
│                            (bảng tra: case · trạng thái · chủ đề)
├── design/              ◆  design: .fig/.sketch/.psd nguồn thiết kế                        [LFS]
│ ┄┄ CÔNG VIỆC (đơn vị vận hành — định kỳ/lẻ) ┄┄
├── tasks/          [opt]  **1 CASE = 1 FOLDER** — đơn vị công việc, CẢ định kỳ LẪN theo yêu cầu. Mọi file
│   │                     của một case nằm CÙNG chỗ: `spec.md` (SỔ SỐNG: trạng thái · cách gọi case ·
│   │                     mục lục · việc mở · mở lại khi nào) + findings `<ngày>_<slug>.md` + fix script
│   │                     ĐỀ XUẤT + query CHỈ case đó dùng. Data THẬT → `data/<case>/` (gitignore,
│   │                     mirror ĐÚNG TÊN). Case ĐÓNG mở lại được — folder là hồ sơ sống, không xoá.
│   │ ┄┄ MỌI case đặt tên THƯỜNG, KHÔNG đánh số (số `NN_` chỉ dành cho STAGE trong pipeline) ┄┄
│   ├── <cadence>/  [opt]    case ĐỊNH KỲ, vd `IT_Tuan_TonKho` — pipeline `pipelines/<cùng tên>/`, launcher `bin/<tên>.cmd`
│   │ ┄┄ case theo YÊU CẦU (điều tra · sự cố · dim phải chăm đi chăm lại) → tên thường, KHÔNG số ┄┄
│   └── <case>/     [opt]    mỗi vấn đề một mạch việc quay lại nhiều lần — ngang hàng case định kỳ
│       └── pipeline/ [opt]    script chạy CỦA CHÍNH case: `common.py` + `00_/01_/02_…` (§5)
├── templates/      [opt]  FILE MẪU để ĐIỀN tự động (report/sheet TRỐNG chờ đổ số) — KHÁC `fixtures/` (data mẫu)
│ ┄┄ ĐẦU VÀO / XỬ LÝ ┄┄
├── sources/        [opt]  ĐỊNH NGHĨA nguồn: Power Query (M) · connection spec (trỏ TÊN env) · SQL kéo nguồn — chỗ automation "KÉO" đọc
├── measures/       [opt]  thư viện DAX/tính toán đặt tên + chú thích (trích ra để review/tái dùng)
├── queries/        [opt]  SQL/DAX/M đặt tên, gọi theo tên — KHÔNG rải inline (đối xứng store/queries.* của app)
├── pipelines/      [opt]  PIPELINE thực thi, MIRROR ĐÚNG TÊN tasks/ (§4 “Pipeline mirror theo TÊN”):
│   ├── <cadence>/  [opt]    case ĐỊNH KỲ, vd `IT_Tuan_TonKho` — pipeline `pipelines/<cùng tên>/`, launcher `bin/<tên>.cmd`
│   │                        └ 00_ready.py 01_pull.py 02_fill.py … = mỗi STAGE 1 file, số phẳng theo thứ tự chạy
│   └── <domain>/   [opt]    script gom theo nguồn/domain (fast · haravan · pos…) — legacy KHÔNG đánh số, cùng tồn tại
├── notebooks/      [opt]  phân tích thăm dò .ipynb (research/analytics)
├── fixtures/       [opt]  DATA MẪU NHỎ (tracked) để mở report/model KHỎI cần nguồn thật
├── assets/         [opt]  theme .json · logo · icon · bảng màu cho report/design
├── scripts/        [opt]  TỰ ĐỘNG HOÁ: kéo (pull) · điền (fill) · publish/upload — script THIN, agent gọi (§5)
├── bin/            [opt]  LAUNCHER gõ tay (`.cmd`/`.sh`) — vd `bin/weekly.cmd`: `<tên> <stage>` dispatch ·
│                        `<tên> auto` = cổng 00 (exit-code gate) → chuỗi stage nếu đủ. **THUẦN ASCII**
│                        (dấu tiếng Việt làm cmd.exe vỡ parse). ĐẶT Ở ĐÂY, KHÔNG ở gốc — xem §5 “Gốc repo”
├── config/         [opt]  profile workspace/connection (operator): *.example.* tracked · real→gitignore
├── external/      [opt]  repo/CODE NGOÀI clone THAM CHIẾU — code HỌ (ETL hệ cũ · script phòng khác ·
│                        model của người ta): chỉ ĐỌC/gọi/extend, KHÔNG sửa thành của mình, KHÔNG nhét
│                        vào `pipelines/` hay `scripts/`. Thứ không có nhà thì sẽ chui vào nhà người khác
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
│   ├── extract/    [opt]    raw PULL dùng CHUNG nhiều case (SQL dump / rar / kéo từ VM) — KHÔNG chia 3 chặng
│   ├── adhoc/      [opt]    file LẺ check nhanh, KHÔNG thuộc task nào (README.md tracked = marker giữ folder) — KHÔNG chia 3 chặng
│   └── <case>/     [opt]    data làm việc của từng case (mirror ĐÚNG TÊN `tasks/<case>/`) — **CHIA ĐÚNG 3 CHẶNG**:
│       ├── 01_raw/           ĐẦU VÀO từ ngoài (người gửi · kéo từ nguồn) — 🔴 CHỈ ĐỌC, không ghi đè
│       ├── 02_processing/    TRUNG GIAN pipeline sinh (.csv extract · nháp · _state.json) — xoá đi dựng lại được; file trung gian giữ tiền tố số stage (`01_pull_*.csv`)
│       └── 03_output/        BẢN GIAO ĐI (mail · đẩy SharePoint/BI) — tên NGHIỆP VỤ (`YYYYMMDD_..._REPORT.xlsx`, KHÔNG prefix số)
├── exports/        [opt]  bản render/publish sinh ra (PDF/PNG/build) — build lại được
└── .env            [opt]  connection string / token / workspace-id THẬT
```
**Ghi chú ★ — cây tối thiểu:** `AGENTS.md` + `docs/` + **≥1 deliverable**. Mọi slot khác `[opt]` — tạo KHI CÓ concern, KHÔNG folder rỗng.

## 3. Routing — cần gì / có gì → vào đâu
| Có gì / cần làm | → Slot |
|---|---|
| báo cáo / model / nội dung / thiết kế giao đi | `reports/` \| `models/` \| `content/` \| `design/` (deliverable ◆) |
| **CASE ĐỊNH KỲ / tự động** (report tuần, target quý) | `tasks/<tên>/` · data thật → `data/<case>/` (mirror ĐÚNG TÊN) |
| **CASE theo yêu cầu** (điều tra 1 vấn đề, sự cố, dim phải chăm đi chăm lại) | `tasks/<tên>/` **không số** · data thật → `data/<case>/` |
| **findings / bằng chứng / số đo của một case** | `tasks/<case>/<ngày>_<slug>.md` — KHÔNG để rời ở `content/` |
| **fix script ĐỀ XUẤT** (user tự chạy) | `tasks/<case>/<ngày>_<slug>.sql` |
| **query check CHỈ 1 case dùng** | `tasks/<case>/check_*.sql` |
| **query check NHIỀU case dùng chung** | `queries/check_*.sql` (ngoại lệ của luật 1-case-1-folder) |
| **index tra nhanh "có case nào"** | `content/README.md` |
| **pipeline thực thi task** (stage đánh số) | `tasks/<case>/pipeline/` · `common.py` (helper) + `00_/01_/02_…` (STAGE) |
| **code NGOÀI clone về tham chiếu** (ETL hệ cũ · script phòng khác) | `external/` — KHÔNG nhét vào `pipelines/`/`scripts/` |
| **pipeline gom theo NGUỒN** (repo không theo case) | `pipelines/<domain>/` — hình dạng thứ hai, hợp lệ |
| **launcher chạy task** | `bin/<tên>.cmd` (`<tên> <stage>` · `<tên> auto`) — ASCII thuần, KHÔNG ở gốc |
| **file GỐC người ta gửi / kéo từ nguồn cho 1 case** | `data/<case>/01_raw/` — 🔴 chỉ đọc, KHÔNG ghi đè |
| **file trung gian pipeline sinh** (.csv, nháp, `_state.json`) | `data/<case>/02_processing/` — xoá đi chạy lại phải dựng lại được |
| **bản GIAO ĐI / đẩy lên đích** | `data/<case>/03_output/` — mail · SharePoint · BI; tên nghiệp vụ (KHÔNG prefix số) |
| **file mẫu chờ ĐIỀN** (report trống) | `templates/` (KHÁC `fixtures/`=data mẫu) |
| **định nghĩa nguồn** (M / connection / SQL kéo) | `sources/` (trỏ TÊN env, KHÔNG secret thật) |
| DAX / measure đặt tên | `measures/` |
| SQL / DAX / M gọi theo tên | `queries/` (KHÔNG rải inline) |
| ETL / transform nhiều bước | `pipelines/` (dbt/python) |
| phân tích thăm dò | `notebooks/` |
| data mẫu nhỏ mở được deliverable | `fixtures/` (tracked) |
| theme / logo / bảng màu report | `assets/` |
| **tự động KÉO / ĐIỀN / UPLOAD** | `scripts/` (thin) + skill `pull/` · `fill/` · `upload/` (§5) |
| profile workspace/connection operator | `config/` (`.example` tracked · real gitignore) |
| **raw extract dùng CHUNG nhiều case** (nặng, PII) | `data/extract/` (gitignore) — KHÔNG chia 3 chặng |
| **file lẻ check nhanh, không thuộc task** | `data/adhoc/` (+ README marker) — KHÔNG chia 3 chặng |
| data làm việc của 1 case | `data/<case>/` (gitignore, mirror ĐÚNG TÊN `tasks/`) — chia 3 chặng ▲ |
| bản render/publish sinh ra | `exports/` (gitignore, build lại được) |
| connection string / token THẬT | `.env` (gitignore) |
| định nghĩa metric/cột (nguồn sự thật) | **§7 của file này** — KHÔNG tạo `docs/dictionary.md` |
| quy trình thao tác lặp lại (playbook) | `.claude/skills/<tên>/SKILL.md` (đăng ký ở `04_SKILLS`) |
| sơ đồ luồng/lineage xem trực quan | `docs_visual/` (NGOÀI docs/, có .md chủ trỏ tới) |
| bản cũ deliverable / trước publish | `attic/` (rollback) |
| tài liệu / rule / plan | `docs/` — sửa FILE `.md` trực tiếp (file wins) |
| skill / playbook (grill · chốt phiên · reconcile · pull/fill/upload) | `docs/agent/04_SKILLS.md` |

## 4. Quyết định & Convention

> **Thứ này để đâu? — hỏi ĐÚNG MỘT câu: nó thuộc MỘT case, hay dùng chung?**
> · thuộc một case ⇒ `tasks/<case>/` (spec · findings · SQL · `pipeline/`) + `data/<case>/` (file nặng)
> · dùng chung nhiều case ⇒ `scripts/` · `sources/` · `queries/` · `measures/` theo vai trò
> · **code của NGƯỜI KHÁC** clone về ⇒ `external/` — kể cả khi nó trông giống pipeline
> *(KHÔNG gom mấy slot dùng-chung vào một thư mục cha: ranh giới phòng ban ĐÃ LÀ ranh giới REPO —
> tên repo chính là tên phòng ban — nên một tầng nữa chỉ vẽ lại thứ đã có.)*
```
3 vai trò bắt buộc   docs/ · AGENTS.md · ≥1 deliverable (reports/|models/|content/|design/). KHÔNG backend/frontend.
                     Repo nặng ĐIỀU TRA: deliverable = hồ sơ `tasks/<case>/`, content/ giữ README.md = INDEX case
1 CASE = 1 FOLDER    Mọi file của MỘT case ở tasks/<case>/ — spec.md + findings + fix script + query riêng.
                     spec.md = SỔ SỐNG (trạng thái · cách gọi case · mục lục · việc mở · mở lại khi nào); case ĐÓNG mở lại được.
                     Vì sao: để phẳng thì findings + query + fix của MỘT vấn đề rải 3 slot → tra phải mò 3 nơi và luôn sót.
                     3 ngoại lệ được nằm ngoài: query dùng CHUNG nhiều case → queries/ · định nghĩa metric → §7 · defect/spec dài → docs/plan
KHÔNG folder rỗng    INDEX = từ điển tên để TRA, KHÔNG checklist. Tạo folder CHỈ khi có file/concern thật; thiếu → bỏ
1 TÊN / concern      sources/ (KHÔNG src|raw) · measures/ (KHÔNG dax|calc) · tên slot THƯỜNG, nhiều từ → `_`
Tên THƯỜNG           slot folder viết thường (tasks · sources · templates · extract · adhoc). TÊN có sẵn của người ta GIỮ NGUYÊN: file (TargetAll.xlsx · ..._REPORT.xlsx), vendor/tool ép (.pbix · .Report/ · .SemanticModel/)
Tên file = TIẾNG ANH MỌI tên file/folder do MÌNH đặt viết bằng tiếng Anh ASCII thuần — KHÔNG ngôn ngữ bản địa (cả có dấu lẫn mất dấu), KHÔNG ký tự ngoài ASCII. NỘI DUNG bên trong vẫn theo `02_RULES §Ngôn ngữ` — luật này chỉ nói về TÊN. Lý do: tên là thứ bị gõ lại trong lệnh·import·link·URL, dấu vỡ theo encoding và ký tự đồng hình (`с` Cyrillic vs `c` Latin) làm ref chết không nhìn ra. Áp cho CẢ tên case (`tasks/<case>/`) và tên stage pipeline — đó là chỗ hay bị đặt theo ngôn ngữ bản địa nhất. ĐỂ YÊN tên KHÔNG phải của mình (file/vendor có sẵn, ở dòng trên)
adhoc ≠ task         data/adhoc/ = file LẺ check 1 lần, throwaway (chỉ giữ README marker) · cái gì thuộc DELIVERABLE ĐỊNH KỲ → phải nằm dưới tasks/<task>/ + data/<task>/. KHÔNG quăng file định kỳ vào adhoc
tasks/ KHÔNG SỐ     Case đặt tên THƯỜNG, mô tả việc — KHÔNG đánh số thứ tự. Estate thực tế dùng `<MÃ PHÒNG>_<NHỊP>_<TênViệc>` (vd `IT_Tuan_TonKho`), và đó là quy ước của repo, chuẩn KHÔNG ép. ⚠ Bãi bỏ quy ước cũ `tasks/NN_<cadence>/`: số thứ tự trên TÊN CASE là số chết — case không chạy theo thứ tự, thêm/bỏ case là phải đánh số lại cả dãy, và nó lẫn với số STAGE vốn có nghĩa thật
                     Case theo YÊU CẦU (chạy khi có việc, không lịch) = tên THƯỜNG không số: tasks/<tên>/.
                     Cả hai loại: data/<case>/ mirror ĐÚNG TÊN. Khác data/adhoc/ = file 1 lần, throwaway, KHÔNG có spec
3 CHẶNG DATA        data/<case>/ chia 01_raw/ (đầu vào ngoài, CHỈ ĐỌC) · 02_processing/ (trung gian, dựng lại được) · 03_output/ (bản giao đi).
                     Phép thử xếp file: **xoá đi có dựng lại được không?** — KHÔNG ⇒ 01_raw · CÓ, và không ai ngoài thấy ⇒ 02_processing · CÓ, và đem giao/đẩy đi ⇒ 03_output.
                     Pipeline khai đường bằng HẰNG trong common.py (RAW/PROC/OUT), KHÔNG nối chuỗi đường dẫn trong từng stage.
                     data/adhoc/ + data/extract/ KHÔNG chia chặng
Pipeline THUỘC case  Case-based ⇒ pipeline nằm **TRONG chính case**: `tasks/<tên>/pipeline/` (spec · findings · script cùng một chỗ — đơn vị công việc là CASE, mở một folder là thấy). Stage đánh số phẳng `NN_mô-tả.py` (00=cổng/readiness thường KHÔNG xuất data · 01,02…=bước); logic dùng chung → `common.py` (tên KHÔNG số mới import được). `data/<tên>/` VẪN nằm riêng (file nặng, gitignore) — đó là ngoại lệ có chủ đích, không phải quên. **`NN_` chỉ có ĐÚNG MỘT nghĩa: thứ tự STAGE.** ⚠ Case ĐANG CÓ ở `pipelines/<tên>/` thì dời **khi nào chạm tới case đó** (chạy test của chính nó làm lưới đỡ), KHÔNG dời hàng loạt
pipelines/ (nguồn)   GIỮ cho repo tổ chức theo NGUỒN chứ không theo case (`pipelines/<domain>/`: excel_loader · ipos_loader…) — repo loại này có thể KHÔNG có `tasks/` nào. Đây là hình dạng thứ hai hợp lệ, đừng ép nó thành case
Output khớp số       file trung gian mang tiền tố số stage (`01_pull.py` → `data/<case>/02_processing/01_pull_*.csv`). ⚠ NGOẠI LỆ file DELIVERABLE cuối: nằm `data/<case>/03_output/`, GIỮ TÊN NGHIỆP VỤ (vd `YYYYMMDD_..._REPORT.xlsx`), KHÔNG prefix số — vì đó là file giao/nộp
Right-size stage     chỉ tạo stage task THẬT cần (2–4 là thường), KHÔNG chẻ vụn cho "đủ bộ". Script domain cũ (fast/haravan/pos…) KHÔNG bắt đánh số — cùng tồn tại
Launcher (bin/)      Launcher gõ tay đặt ở `bin/` — `bin/<tên>.cmd`: `<tên> <stage>` dispatch + `<tên> auto` = cổng 00 (exit-code gate) → chuỗi stage nếu đủ. **THUẦN ASCII** (dấu tiếng Việt làm cmd.exe vỡ parse). ⚠ KHÔNG đặt dấu `>` trong dòng `rem` — cmd VẪN redirect ⇒ sinh file rỗng
GỐC REPO SẠCH (LUẬT) Gốc repo CHỈ chứa file mà CÔNG CỤ ÉP phải nằm đó: `AGENTS.md` · `CLAUDE.md` · `README.md` · `LICENSE` · `.gitignore` · `.gitattributes` · `.claude/` · `.github/` · `.vscode/`. **Mọi thứ khác PHẢI có folder** — launcher → `bin/`, script → `scripts/`, config → `config/`. Vì sao thành luật: gốc là chỗ DUY NHẤT không ai sở hữu, nên rác rơi vào đó không ai nhận; đo thật ở một repo estate — **5 file rỗng 0 byte** do `.cmd` redirect nhầm nằm ngay gốc, **2 file đã lọt vào git**. Đánh đổi có ý thức: gõ `bin\nq pull` thay vì `nq pull`
templates ≠ fixtures  templates/ = file TRỐNG chờ ĐIỀN (đổ số ra deliverable) · fixtures/ = data MẪU nhỏ để mở deliverable khỏi cần nguồn thật
Luật khi VIẾT        đã dời sang `02_RULES §Luật khi VIẾT` (luật nổ lúc viết code, `conform` không kiểm được).
Từ điển dữ liệu      §7 của file này là nhà DUY NHẤT — định nghĩa metric/cột = nguồn sự thật, chống mỗi report tính 1 kiểu. KHÔNG tạo docs/dictionary.md (một dự án một từ điển; tách ra là chắc chắn lệch)
Publish/refresh      tự động hóa → scripts/ (§5) · bản render ra → exports/ (gitignore, build lại được)
Sơ đồ trực quan      .html/.svg xem trực quan (luồng/lineage/lưới bảng) → docs_visual/ (NGOÀI docs/, agent KHÔNG auto-đọc); mỗi file có .md chủ trỏ + tóm tắt
Harness = app        docs/agent/* + AGENTS.md y hệt app → cùng lệnh zemory, agent điều hướng non-app đúng như app
KHÔNG luật UI        dự án non-app KHÔNG phát triển app → 0 luật thiết kế UI. "Có dashboard trong deliverable" KHÔNG biến thành app: chừng nào chỉ đọc/dò/kéo/điền/xuất file thì vẫn non-app. Trình bày deliverable (layout report/chart) = quyết định TRÌNH BÀY, trình user (02_RULES §Hành xử), tham khảo skill dataviz — KHÔNG phải luật UI-app
Ngoài phạm vi        app có code chạy (UI/server/CLI) → chuẩn APP · lib/SDK · mobile · game → convention riêng
```

## 5. Tự động hoá — KÉO / ĐIỀN / UPLOAD file
> Đây là năng lực "hệ file cho AI" của non-app. **AGENT là thứ LÀM** 3 động tác; zemory chỉ **NHỚ + KỶ LUẬT** (index việc/task đã làm vào Global Memory), **KHÔNG tự gọi LLM, KHÔNG tự đi kéo file** (xem `01_CONSTITUTION`: trí tuệ là agent, zemory chỉ là bộ nhớ + kỷ luật). Mỗi động tác = **script THIN ở `scripts/`** + **playbook ở `04_SKILLS`** (recipe cụ thể: kéo nguồn nào, điền template nào, up đi đâu).

- **KÉO (pull):** đọc `sources/` (M/connection/SQL) → kéo raw về `data/extract/` (gitignore). Credential lấy từ `.env`/`config/` — **KHÔNG bao giờ nhập password vào zemory** (mượn phiên login trên trang thật nếu là web). Playbook: `.claude/skills/pull/`.
- **ĐIỀN (fill):** lấy file `templates/` (trống) + số từ `data/`/`measures/` → xuất deliverable (`reports/`) hoặc `exports/`. Playbook: `.claude/skills/fill/`.
- **UP (upload/publish):** đẩy deliverable/exports lên đích (workspace BI · Drive · SharePoint) qua `scripts/` hoặc stage `upload` của pipeline. Playbook: `.claude/skills/upload/`.
- **Ánh xạ pipeline đánh số ↔ playbook (`04_SKILLS`):** stage `00`=gate/pull-precheck · `01`=pull (§pull) · `fill`=fill (§fill) · `upload`=upload (§upload). Task mới bám khuôn số này; script domain cũ (fast/haravan/pos…) giữ nguyên, không ép đánh số.

**Ràng buộc (bất biến):** file THẬT/PII **KHÔNG commit git** (`data/`·`exports/`·`.env` gitignore); chỉ code + định nghĩa + template + deliverable-nhẹ tracked. Xuyên máy cần chia sẻ file nặng → bundle **mã hoá** `share/` (không phải plaintext lên git). Mọi động tác tự động phải **ghi được lại** (task/lần chạy → `06_CHANGES`/`05_TODO`) để phiên sau truy được.

## 6. Reconcile — nắn repo về chuẩn (khi repo lệch)
> Flow HIẾM (chỉ khi dọn repo chưa theo chuẩn). Quy trình đầy đủ → skill **`.claude/skills/reconcile/SKILL.md`**. Bất biến: `zemory validate`/`structure` chỉ **CHỈ RA** chỗ lệch (advisory) — **agent tự nắn (`git mv` giữ history), zemory KHÔNG auto-move**; **đập cấu trúc lớn / khó đảo → HỎI user TRƯỚC** (`02_RULES §Hành xử`, §Git).

## 7. Từ điển dữ liệu — metric · cột · thuật ngữ
> **Nhà DUY NHẤT của từ điển. KHÔNG tạo `docs/dictionary.md`** — một dự án một từ điển, và nó nằm cạnh từ điển tên-slot ở §2/§3: hai thứ cùng trả lời một câu hỏi *"cái này gọi là gì, và ở đâu"*. Tách ra hai file là chắc chắn lệch, mà lệch định nghĩa metric thì **số liệu sai chứ không phải tài liệu sai**.
>
> Định nghĩa ở đây là **NGUỒN SỰ THẬT**: `measures/` · `queries/` · script điền đều phải tính đúng như mô tả. Thấy công thức thực tế khác mô tả ⇒ **BÁO**, KHÔNG tự sửa bên nào.

| Tên | Định nghĩa | Công thức / nguồn | Ghi chú |
|---|---|---|---|
| *(chưa có — điền khi dự án có metric đầu tiên)* | | | |

**Quy ước:** một dòng một khái niệm · tên viết đúng như trên deliverable giao đi · **đổi định nghĩa là đổi SỐ LIỆU** ⇒ ghi `06_CHANGES` (supersede nếu đảo định nghĩa cũ) và nêu rõ ảnh hưởng tới bản đã phát hành.
