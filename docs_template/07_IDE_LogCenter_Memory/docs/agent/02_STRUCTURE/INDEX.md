# <PROJECT> — Structure index · Mục lục cấu trúc

<!-- zemory:generated · written by sync from the parts in this folder; never edited by hand · máy sinh lúc sync, không sửa tay -->

Structure · Cấu trúc: [`Struc_Repo_LogCenter`](Struc_Repo_LogCenter/Struc_Repo_LogCenter.md) — LOG-CENTER

Before creating, renaming or moving a folder, open the slot whose path holds it. A folder no slot covers is proposed to HS
(`Rule_Gate_85_ProposeChecked`).
Trước khi tạo, đổi tên hay dời thư mục, mở slot có đường chứa nó. Thư mục không slot nào phủ thì đề xuất lên HS.

| Slot | Path · Đường | Holds · Chứa |
|---|---|---|
| [`Root_001_Entry`](_Slot/Root_001_Entry/Root_001_Entry.md) | `AGENTS.md` · `CLAUDE.md` | the harness entry |
| [`Docs_004_Docs`](_Slot/Docs_004_Docs/Docs_004_Docs.md) | `docs/` | the documentation harness |
| [`Docs_005_Agent`](_Slot/Docs_005_Agent/Docs_005_Agent.md) | `docs/agent/` | the core documents for the agent |
| [`Docs_006_Plan`](_Slot/Docs_006_Plan/Docs_006_Plan.md) | `docs/plan/` | specs / plans by section |
| [`Root_059_PackageJson`](_Slot/Root_059_PackageJson/Root_059_PackageJson.md) | `package.json \` · `pyproject.toml \` · `requirements.txt` | manifest |
| [`DocsVisual_073_DocsVisual`](_Slot/DocsVisual_073_DocsVisual/DocsVisual_073_DocsVisual.md) | `docs_visual/` | visual views for people |
| [`DocsPublic_074_DocsPublic`](_Slot/DocsPublic_074_DocsPublic/DocsPublic_074_DocsPublic.md) | `docs_public/` | public media for the README |
| [`Config_075_Config`](_Slot/Config_075_Config/Config_075_Config.md) | `config/` | config files the operator edits |
| [`External_077_External`](_Slot/External_077_External/External_077_External.md) | `external/` | outside code cloned for reference |
| [`Attic_079_Attic`](_Slot/Attic_079_Attic/Attic_079_Attic.md) | `attic/` | backup / rollback |
| [`Share_081_Share`](_Slot/Share_081_Share/Share_081_Share.md) | `share/` | encrypted cross-machine sync bundles |
| [`Bin_082_Bin`](_Slot/Bin_082_Bin/Bin_082_Bin.md) | `bin/` | CLI entry / launchers |
| [`Root_083_ReadmeMd`](_Slot/Root_083_ReadmeMd/Root_083_ReadmeMd.md) | `README.md` | the repo's introduction |
| [`Root_084_License`](_Slot/Root_084_License/Root_084_License.md) | `LICENSE` | licence |
| [`Root_085_Gitignore`](_Slot/Root_085_Gitignore/Root_085_Gitignore.md) | `.gitignore` | danh sách ignore |
| [`Root_086_Gitattributes`](_Slot/Root_086_Gitattributes/Root_086_Gitattributes.md) | `.gitattributes` | eol + LFS |
| [`Github_087_Github`](_Slot/Github_087_Github/Github_087_Github.md) | `.github/` | CI/CD |
| [`Claude_088_Claude`](_Slot/Claude_088_Claude/Claude_088_Claude.md) | `.claude/` | agent config |
| [`Claude_089_Skills`](_Slot/Claude_089_Skills/Claude_089_Skills.md) | `.claude/skills/` | work procedures (skills) |
| [`Vscode_090_Vscode`](_Slot/Vscode_090_Vscode/Vscode_090_Vscode.md) | `.vscode/` | editor config |
| [`Idea_091_Idea`](_Slot/Idea_091_Idea/Idea_091_Idea.md) | `.idea/` | editor config |
| [`Root_093_Env`](_Slot/Root_093_Env/Root_093_Env.md) | `.env` | the real runtime secrets |
| [`Data_094_Data`](_Slot/Data_094_Data/Data_094_Data.md) | `data/` | runtime / real files per machine |
| [`Data_102_Secrets`](_Slot/Data_102_Secrets/Data_102_Secrets.md) | `data/secrets/` | every secret of the repo: keys · tokens · the encrypted vault |
| [`Reports_111_Reports`](_Slot/Reports_111_Reports/Reports_111_Reports.md) | `reports/` | BI deliverable |
| [`Models_112_Models`](_Slot/Models_112_Models/Models_112_Models.md) | `models/` | deliverable data: the model layer, or the build chain of one database |
| [`Content_113_Content`](_Slot/Content_113_Content/Content_113_Content.md) | `content/` | docs-only deliverable |
| [`Design_114_Design`](_Slot/Design_114_Design/Design_114_Design.md) | `design/` | design deliverable |
| [`Tasks_115_Tasks`](_Slot/Tasks_115_Tasks/Tasks_115_Tasks.md) | `tasks/` | the unit of work: 1 case = 1 folder |
| [`Tasks_116_Cadence`](_Slot/Tasks_116_Cadence/Tasks_116_Cadence.md) | `tasks/<cadence>/` | recurring cases |
| [`Tasks_117_Case`](_Slot/Tasks_117_Case/Tasks_117_Case.md) | `tasks/<case>/` | the file of one case |
| [`Tasks_118_Pipeline`](_Slot/Tasks_118_Pipeline/Tasks_118_Pipeline.md) | `tasks/<case>/pipeline/` | the case's own run scripts |
| [`Templates_119_Templates`](_Slot/Templates_119_Templates/Templates_119_Templates.md) | `templates/` | template files waiting to be filled |
| [`Sources_120_Sources`](_Slot/Sources_120_Sources/Sources_120_Sources.md) | `sources/` | source definitions |
| [`Measures_121_Measures`](_Slot/Measures_121_Measures/Measures_121_Measures.md) | `measures/` | the library of named measures |
| [`Queries_122_Queries`](_Slot/Queries_122_Queries/Queries_122_Queries.md) | `queries/` | shared named SQL/DAX/M |
| [`Pipelines_123_Pipelines`](_Slot/Pipelines_123_Pipelines/Pipelines_123_Pipelines.md) | `pipelines/` | pipelines grouped by source |
| [`Pipelines_124_Domain`](_Slot/Pipelines_124_Domain/Pipelines_124_Domain.md) | `pipelines/<domain>/` | scripts grouped by source/domain |
| [`Notebooks_125_Notebooks`](_Slot/Notebooks_125_Notebooks/Notebooks_125_Notebooks.md) | `notebooks/` | exploratory analysis |
| [`Fixtures_126_Fixtures`](_Slot/Fixtures_126_Fixtures/Fixtures_126_Fixtures.md) | `fixtures/` | small sample data |
| [`Assets_127_Assets`](_Slot/Assets_127_Assets/Assets_127_Assets.md) | `assets/` | theme / logo / bảng màu report |
| [`Scripts_128_Scripts`](_Slot/Scripts_128_Scripts/Scripts_128_Scripts.md) | `scripts/` | automation: pull / fill / upload, and setting up the repo's own machine |
| [`Data_129_Extract`](_Slot/Data_129_Extract/Data_129_Extract.md) | `data/extract/` | raw pulls shared by cases |
| [`Data_130_Adhoc`](_Slot/Data_130_Adhoc/Data_130_Adhoc.md) | `data/adhoc/` | loose files for a quick check |
| [`Data_131_Case`](_Slot/Data_131_Case/Data_131_Case.md) | `data/<case>/` | the working data of one case |
| [`Data_132_01Raw`](_Slot/Data_132_01Raw/Data_132_01Raw.md) | `data/<case>/01_raw/` | input from outside, read only |
| [`Data_133_02Processing`](_Slot/Data_133_02Processing/Data_133_02Processing.md) | `data/<case>/02_processing/` | pipeline intermediates |
| [`Data_134_03Output`](_Slot/Data_134_03Output/Data_134_03Output.md) | `data/<case>/03_output/` | what is handed over |
| [`Exports_135_Exports`](_Slot/Exports_135_Exports/Exports_135_Exports.md) | `exports/` | generated renders / published copies |
| [`Root_136_Principles`](_Slot/Root_136_Principles/Root_136_Principles.md) | `.` | the general principles of the structure standard |
| [`Root_141_Stignore`](_Slot/Root_141_Stignore/Root_141_Stignore.md) | `.stignore` | what Syncthing never carries to another machine |

| Host note · Ghi chú host | About · Về |
|---|---|
| [`IDE`](_Host/IDE/IDE.md) | the agent inside a code editor |
