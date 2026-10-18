# <PROJECT> — Structure index · Mục lục cấu trúc

<!-- zemory:generated · written by sync from the parts in this folder; never edited by hand · máy sinh lúc sync, không sửa tay -->

Structure · Cấu trúc: [`Struc_Repo_NonApp`](Struc_Repo_NonApp/Struc_Repo_NonApp.md) — NON-APP

Before creating, renaming or moving a folder, open the slot whose path holds it. A folder no slot covers is proposed to HS
(`Rule_Gate_85_ProposeChecked`).
Trước khi tạo, đổi tên hay dời thư mục, mở slot có đường chứa nó. Thư mục không slot nào phủ thì đề xuất lên HS.

| Slot | Path · Đường | Holds · Chứa |
|---|---|---|
| [`Root_001_Entry`](_Slot/Root_001_Entry/Root_001_Entry.md) | `AGENTS.md` · `CLAUDE.md` | cửa vào harness |
| [`Docs_004_Docs`](_Slot/Docs_004_Docs/Docs_004_Docs.md) | `docs/` | harness tài liệu |
| [`Docs_005_Agent`](_Slot/Docs_005_Agent/Docs_005_Agent.md) | `docs/agent/` | bộ tài liệu lõi cho agent |
| [`Docs_006_Plan`](_Slot/Docs_006_Plan/Docs_006_Plan.md) | `docs/plan/` | spec / plan theo section |
| [`DocsVisual_073_DocsVisual`](_Slot/DocsVisual_073_DocsVisual/DocsVisual_073_DocsVisual.md) | `docs_visual/` | bản xem trực quan cho người |
| [`DocsPublic_074_DocsPublic`](_Slot/DocsPublic_074_DocsPublic/DocsPublic_074_DocsPublic.md) | `docs_public/` | media công khai kèm README |
| [`Config_075_Config`](_Slot/Config_075_Config/Config_075_Config.md) | `config/` | file config operator tự sửa |
| [`External_077_External`](_Slot/External_077_External/External_077_External.md) | `external/` | code ngoài clone tham chiếu |
| [`Attic_079_Attic`](_Slot/Attic_079_Attic/Attic_079_Attic.md) | `attic/` | backup / rollback |
| [`Share_081_Share`](_Slot/Share_081_Share/Share_081_Share.md) | `share/` | bundle sync mã hoá xuyên máy |
| [`Bin_082_Bin`](_Slot/Bin_082_Bin/Bin_082_Bin.md) | `bin/` | entry CLI / launcher |
| [`Root_083_ReadmeMd`](_Slot/Root_083_ReadmeMd/Root_083_ReadmeMd.md) | `README.md` | giới thiệu repo |
| [`Root_084_License`](_Slot/Root_084_License/Root_084_License.md) | `LICENSE` | giấy phép |
| [`Root_085_Gitignore`](_Slot/Root_085_Gitignore/Root_085_Gitignore.md) | `.gitignore` | danh sách ignore |
| [`Root_086_Gitattributes`](_Slot/Root_086_Gitattributes/Root_086_Gitattributes.md) | `.gitattributes` | eol + LFS |
| [`Github_087_Github`](_Slot/Github_087_Github/Github_087_Github.md) | `.github/` | CI/CD |
| [`Claude_088_Claude`](_Slot/Claude_088_Claude/Claude_088_Claude.md) | `.claude/` | config agent |
| [`Claude_089_Skills`](_Slot/Claude_089_Skills/Claude_089_Skills.md) | `.claude/skills/` | quy trình thao tác (skill) |
| [`Vscode_090_Vscode`](_Slot/Vscode_090_Vscode/Vscode_090_Vscode.md) | `.vscode/` | config editor |
| [`Idea_091_Idea`](_Slot/Idea_091_Idea/Idea_091_Idea.md) | `.idea/` | config editor |
| [`Root_093_Env`](_Slot/Root_093_Env/Root_093_Env.md) | `.env` | secret runtime thật |
| [`Data_094_Data`](_Slot/Data_094_Data/Data_094_Data.md) | `data/` | runtime / file thật theo máy |
| [`Data_102_Secrets`](_Slot/Data_102_Secrets/Data_102_Secrets.md) | `data/secrets/` | mọi bí mật của repo: khoá · token · két mã hoá |
| [`Reports_111_Reports`](_Slot/Reports_111_Reports/Reports_111_Reports.md) | `reports/` | deliverable BI |
| [`Models_112_Models`](_Slot/Models_112_Models/Models_112_Models.md) | `models/` | deliverable data: semantic/transform layer |
| [`Content_113_Content`](_Slot/Content_113_Content/Content_113_Content.md) | `content/` | deliverable docs-only |
| [`Design_114_Design`](_Slot/Design_114_Design/Design_114_Design.md) | `design/` | deliverable design |
| [`Tasks_115_Tasks`](_Slot/Tasks_115_Tasks/Tasks_115_Tasks.md) | `tasks/` | đơn vị công việc: 1 case = 1 folder |
| [`Tasks_116_Cadence`](_Slot/Tasks_116_Cadence/Tasks_116_Cadence.md) | `tasks/<cadence>/` | case định kỳ |
| [`Tasks_117_Case`](_Slot/Tasks_117_Case/Tasks_117_Case.md) | `tasks/<case>/` | hồ sơ một case |
| [`Tasks_118_Pipeline`](_Slot/Tasks_118_Pipeline/Tasks_118_Pipeline.md) | `tasks/<case>/pipeline/` | script chạy của chính case |
| [`Templates_119_Templates`](_Slot/Templates_119_Templates/Templates_119_Templates.md) | `templates/` | file mẫu chờ điền |
| [`Sources_120_Sources`](_Slot/Sources_120_Sources/Sources_120_Sources.md) | `sources/` | định nghĩa nguồn |
| [`Measures_121_Measures`](_Slot/Measures_121_Measures/Measures_121_Measures.md) | `measures/` | thư viện measure đặt tên |
| [`Queries_122_Queries`](_Slot/Queries_122_Queries/Queries_122_Queries.md) | `queries/` | SQL/DAX/M đặt tên dùng chung |
| [`Pipelines_123_Pipelines`](_Slot/Pipelines_123_Pipelines/Pipelines_123_Pipelines.md) | `pipelines/` | pipeline gom theo nguồn |
| [`Pipelines_124_Domain`](_Slot/Pipelines_124_Domain/Pipelines_124_Domain.md) | `pipelines/<domain>/` | script gom theo nguồn/domain |
| [`Notebooks_125_Notebooks`](_Slot/Notebooks_125_Notebooks/Notebooks_125_Notebooks.md) | `notebooks/` | phân tích thăm dò |
| [`Fixtures_126_Fixtures`](_Slot/Fixtures_126_Fixtures/Fixtures_126_Fixtures.md) | `fixtures/` | data mẫu nhỏ |
| [`Assets_127_Assets`](_Slot/Assets_127_Assets/Assets_127_Assets.md) | `assets/` | theme / logo / bảng màu report |
| [`Scripts_128_Scripts`](_Slot/Scripts_128_Scripts/Scripts_128_Scripts.md) | `scripts/` | tự động hoá kéo / điền / upload |
| [`Data_129_Extract`](_Slot/Data_129_Extract/Data_129_Extract.md) | `data/extract/` | raw pull dùng chung |
| [`Data_130_Adhoc`](_Slot/Data_130_Adhoc/Data_130_Adhoc.md) | `data/adhoc/` | file lẻ check nhanh |
| [`Data_131_Case`](_Slot/Data_131_Case/Data_131_Case.md) | `data/<case>/` | data làm việc của một case |
| [`Data_132_01Raw`](_Slot/Data_132_01Raw/Data_132_01Raw.md) | `data/<case>/01_raw/` | đầu vào từ ngoài, chỉ đọc |
| [`Data_133_02Processing`](_Slot/Data_133_02Processing/Data_133_02Processing.md) | `data/<case>/02_processing/` | trung gian pipeline sinh |
| [`Data_134_03Output`](_Slot/Data_134_03Output/Data_134_03Output.md) | `data/<case>/03_output/` | bản giao đi |
| [`Exports_135_Exports`](_Slot/Exports_135_Exports/Exports_135_Exports.md) | `exports/` | bản render / publish sinh ra |
| [`Root_136_Principles`](_Slot/Root_136_Principles/Root_136_Principles.md) | `.` | nguyên tắc chung của chuẩn cấu trúc |

| Host note · Ghi chú host | About · Về |
|---|---|
| [`GUI`](_Host/GUI/GUI.md) | agent chạy trong một app đứng riêng |
