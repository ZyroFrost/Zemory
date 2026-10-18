# <PROJECT> — Structure index · Mục lục cấu trúc

<!-- zemory:generated · written by sync from the parts in this folder; never edited by hand · máy sinh lúc sync, không sửa tay -->

Structure · Cấu trúc: [`Struc_Repo_App`](Struc_Repo_App/Struc_Repo_App.md) — APP

Before creating, renaming or moving a folder, open the slot whose path holds it. A folder no slot covers is proposed to HS
(`Rule_Gate_85_ProposeChecked`).
Trước khi tạo, đổi tên hay dời thư mục, mở slot có đường chứa nó. Thư mục không slot nào phủ thì đề xuất lên HS.

| Slot | Path · Đường | Holds · Chứa |
|---|---|---|
| [`Root_001_Entry`](_Slot/Root_001_Entry/Root_001_Entry.md) | `AGENTS.md` · `CLAUDE.md` | cửa vào harness |
| [`Backend_002_Backend`](_Slot/Backend_002_Backend/Backend_002_Backend.md) | `backend/` | phía server: code của mình + entry |
| [`Frontend_003_Frontend`](_Slot/Frontend_003_Frontend/Frontend_003_Frontend.md) | `frontend/` | giao diện người dùng |
| [`Docs_004_Docs`](_Slot/Docs_004_Docs/Docs_004_Docs.md) | `docs/` | harness tài liệu |
| [`Docs_005_Agent`](_Slot/Docs_005_Agent/Docs_005_Agent.md) | `docs/agent/` | bộ tài liệu lõi cho agent |
| [`Docs_006_Plan`](_Slot/Docs_006_Plan/Docs_006_Plan.md) | `docs/plan/` | spec / plan theo section |
| [`Backend_007_Src`](_Slot/Backend_007_Src/Backend_007_Src.md) | `backend/src/` | nơi chứa code |
| [`Backend_008_Api`](_Slot/Backend_008_Api/Backend_008_Api.md) | `backend/src/api/` | endpoint app mở ra (biên vào) |
| [`Backend_009_Graphql`](_Slot/Backend_009_Graphql/Backend_009_Graphql.md) | `backend/src/graphql/` | schema + resolver GraphQL |
| [`Backend_010_Realtime`](_Slot/Backend_010_Realtime/Backend_010_Realtime.md) | `backend/src/realtime/` | WebSocket / SSE |
| [`Backend_011_Events`](_Slot/Backend_011_Events/Backend_011_Events.md) | `backend/src/events/` | nhận event / webhook inbound |
| [`Backend_012_Functions`](_Slot/Backend_012_Functions/Backend_012_Functions.md) | `backend/src/functions/` | serverless handler |
| [`Backend_013_Commands`](_Slot/Backend_013_Commands/Backend_013_Commands.md) | `backend/src/commands/` | lệnh CLI |
| [`Backend_014_Middleware`](_Slot/Backend_014_Middleware/Backend_014_Middleware.md) | `backend/src/middleware/` | pipeline request |
| [`Backend_015_Integrations`](_Slot/Backend_015_Integrations/Backend_015_Integrations.md) | `backend/src/integrations/` | client gọi service ngoài (biên ra) |
| [`Backend_016_Store`](_Slot/Backend_016_Store/Backend_016_Store.md) | `backend/src/store/` | data-access: driver + schema DB |
| [`Backend_017_Queries`](_Slot/Backend_017_Queries/Backend_017_Queries.md) | `backend/src/store/queries.*` | kho SQL đặt tên |
| [`Backend_018_Cache`](_Slot/Backend_018_Cache/Backend_018_Cache.md) | `backend/src/cache/` | lớp cache ứng dụng |
| [`Backend_019_Storage`](_Slot/Backend_019_Storage/Backend_019_Storage.md) | `backend/src/storage/` | object/blob & file-upload |
| [`Backend_020_Notifications`](_Slot/Backend_020_Notifications/Backend_020_Notifications.md) | `backend/src/notifications/` | điều phối email/SMS/push |
| [`Backend_021_Services`](_Slot/Backend_021_Services/Backend_021_Services.md) | `backend/src/services/` | nghiệp vụ cốt lõi |
| [`Backend_022_Ai`](_Slot/Backend_022_Ai/Backend_022_Ai.md) | `backend/src/ai/` | lớp AI: provider + adapter |
| [`Backend_023_Agents`](_Slot/Backend_023_Agents/Backend_023_Agents.md) | `backend/src/agents/` | vòng lặp agent của app |
| [`Backend_024_Tools`](_Slot/Backend_024_Tools/Backend_024_Tools.md) | `backend/src/tools/` | định nghĩa tool cho LLM gọi |
| [`Backend_025_Evals`](_Slot/Backend_025_Evals/Backend_025_Evals.md) | `backend/src/evals/` | đo chất lượng model/agent/RAG |
| [`Backend_026_Search`](_Slot/Backend_026_Search/Backend_026_Search.md) | `backend/src/search/` | index & retrieval |
| [`Backend_027_Pipelines`](_Slot/Backend_027_Pipelines/Backend_027_Pipelines.md) | `backend/src/pipelines/` | ETL / ingest / batch nhiều bước |
| [`Backend_028_Jobs`](_Slot/Backend_028_Jobs/Backend_028_Jobs.md) | `backend/src/jobs/` | job nền / cron / queue |
| [`Backend_029_Validators`](_Slot/Backend_029_Validators/Backend_029_Validators.md) | `backend/src/validators/` | validate / parse input |
| [`Backend_030_Core`](_Slot/Backend_030_Core/Backend_030_Core.md) | `backend/src/core/` | composition root |
| [`Backend_031_Auth`](_Slot/Backend_031_Auth/Backend_031_Auth.md) | `backend/src/auth/` | authentication + authorization |
| [`Backend_032_Vault`](_Slot/Backend_032_Vault/Backend_032_Vault.md) | `backend/src/vault/` | mã hoá + key |
| [`Backend_033_Config`](_Slot/Backend_033_Config/Backend_033_Config.md) | `backend/src/config/` | config code + feature-flag |
| [`Backend_034_Logging`](_Slot/Backend_034_Logging/Backend_034_Logging.md) | `backend/src/logging/` | logger + observability |
| [`Backend_035_Audit`](_Slot/Backend_035_Audit/Backend_035_Audit.md) | `backend/src/audit/` | audit trail bảo mật |
| [`Backend_036_Errors`](_Slot/Backend_036_Errors/Backend_036_Errors.md) | `backend/src/errors/` | error types + handler trung tâm |
| [`Backend_037_I18n`](_Slot/Backend_037_I18n/Backend_037_I18n.md) | `backend/src/i18n/` | đa ngôn ngữ (chức năng) |
| [`Backend_038_Update`](_Slot/Backend_038_Update/Backend_038_Update.md) | `backend/src/update/` | tự cập nhật phiên bản |
| [`Backend_039_Migrations`](_Slot/Backend_039_Migrations/Backend_039_Migrations.md) | `backend/src/migrations/` | DB migration |
| [`Backend_040_Platform`](_Slot/Backend_040_Platform/Backend_040_Platform.md) | `backend/src/platform/` | tích hợp OS |
| [`Backend_041_Shared`](_Slot/Backend_041_Shared/Backend_041_Shared.md) | `backend/src/shared/` | code + type dùng chung BE↔FE |
| [`Backend_042_Contracts`](_Slot/Backend_042_Contracts/Backend_042_Contracts.md) | `backend/src/contracts/` | file spec hợp đồng API |
| [`Backend_043_Plugins`](_Slot/Backend_043_Plugins/Backend_043_Plugins.md) | `backend/src/plugins/` | điểm mở rộng cho bên thứ 3 |
| [`Backend_044_Modules`](_Slot/Backend_044_Modules/Backend_044_Modules.md) | `backend/src/modules/` | gói theo domain/feature |
| [`Backend_045_Util`](_Slot/Backend_045_Util/Backend_045_Util.md) | `backend/src/util/` | helper thuần (backend) |
| [`Backend_047_Graph`](_Slot/Backend_047_Graph/Backend_047_Graph.md) | `backend/src/<domain>/graph/` | engine graph dẫn xuất |
| [`Backend_049_Test`](_Slot/Backend_049_Test/Backend_049_Test.md) | `backend/test/` | test tự động |
| [`Backend_050_Scripts`](_Slot/Backend_050_Scripts/Backend_050_Scripts.md) | `backend/scripts/` | script dev/build/ops/deploy |
| [`Backend_051_Infra`](_Slot/Backend_051_Infra/Backend_051_Infra.md) | `backend/infra/` | IaC |
| [`Backend_052_Resources`](_Slot/Backend_052_Resources/Backend_052_Resources.md) | `backend/resources/` | resource đóng gói tracked |
| [`Backend_053_Prompts`](_Slot/Backend_053_Prompts/Backend_053_Prompts.md) | `backend/resources/prompts/` | prompt LLM tracked |
| [`Backend_054_Sql`](_Slot/Backend_054_Sql/Backend_054_Sql.md) | `backend/resources/sql/` | SQL đóng gói |
| [`Backend_055_Seed`](_Slot/Backend_055_Seed/Backend_055_Seed.md) | `backend/resources/seed/` | dữ liệu seed đóng gói |
| [`Backend_056_Packaging`](_Slot/Backend_056_Packaging/Backend_056_Packaging.md) | `backend/resources/packaging/` | resource đóng gói exe / tray |
| [`Backend_057_Locales`](_Slot/Backend_057_Locales/Backend_057_Locales.md) | `backend/resources/locales/` | file dịch phía server |
| [`Backend_058_Run`](_Slot/Backend_058_Run/Backend_058_Run.md) | `backend/run.*` | entry chạy app |
| [`Root_059_PackageJson`](_Slot/Root_059_PackageJson/Root_059_PackageJson.md) | `package.json \` · `pyproject.toml \` · `requirements.txt` | manifest |
| [`Frontend_060_Assets`](_Slot/Frontend_060_Assets/Frontend_060_Assets.md) | `frontend/assets/` | media UI |
| [`Frontend_061_Components`](_Slot/Frontend_061_Components/Frontend_061_Components.md) | `frontend/components/` | component UI dùng lại |
| [`Frontend_062_Styles`](_Slot/Frontend_062_Styles/Frontend_062_Styles.md) | `frontend/styles/` | token + CSS/theme |
| [`Frontend_063_Pages`](_Slot/Frontend_063_Pages/Frontend_063_Pages.md) | `frontend/pages/` | trang / màn hình / route |
| [`Frontend_064_Layouts`](_Slot/Frontend_064_Layouts/Frontend_064_Layouts.md) | `frontend/layouts/` | layout khung trang |
| [`Frontend_065_State`](_Slot/Frontend_065_State/Frontend_065_State.md) | `frontend/state/` | state client |
| [`Frontend_066_Hooks`](_Slot/Frontend_066_Hooks/Frontend_066_Hooks.md) | `frontend/hooks/` | hook |
| [`Frontend_067_Client`](_Slot/Frontend_067_Client/Frontend_067_Client.md) | `frontend/client/` | client gọi backend của mình (biên ra) |
| [`Frontend_068_Locales`](_Slot/Frontend_068_Locales/Frontend_068_Locales.md) | `frontend/locales/` | bản dịch UI |
| [`Frontend_069_Config`](_Slot/Frontend_069_Config/Frontend_069_Config.md) | `frontend/config/` | setting UI mặc định ship |
| [`Frontend_070_Util`](_Slot/Frontend_070_Util/Frontend_070_Util.md) | `frontend/util/` | helper thuần (client) |
| [`Frontend_071_Types`](_Slot/Frontend_071_Types/Frontend_071_Types.md) | `frontend/types/` | type chỉ dùng client |
| [`Frontend_072_Public`](_Slot/Frontend_072_Public/Frontend_072_Public.md) | `frontend/public/` | file tĩnh serve thẳng |
| [`DocsVisual_073_DocsVisual`](_Slot/DocsVisual_073_DocsVisual/DocsVisual_073_DocsVisual.md) | `docs_visual/` | bản xem trực quan cho người |
| [`DocsPublic_074_DocsPublic`](_Slot/DocsPublic_074_DocsPublic/DocsPublic_074_DocsPublic.md) | `docs_public/` | media công khai kèm README |
| [`Config_075_Config`](_Slot/Config_075_Config/Config_075_Config.md) | `config/` | file config operator tự sửa |
| [`Contracts_076_Contracts`](_Slot/Contracts_076_Contracts/Contracts_076_Contracts.md) | `contracts/` | spec API ở gốc (escape-hatch) |
| [`External_077_External`](_Slot/External_077_External/External_077_External.md) | `external/` | code ngoài clone tham chiếu |
| [`External_078_Skills`](_Slot/External_078_Skills/External_078_Skills.md) | `external/skills/` | kho skill vendored |
| [`Attic_079_Attic`](_Slot/Attic_079_Attic/Attic_079_Attic.md) | `attic/` | backup / rollback |
| [`DocsTemplate_080_DocsTemplate`](_Slot/DocsTemplate_080_DocsTemplate/DocsTemplate_080_DocsTemplate.md) | `docs_template/` | bộ docs mẫu trắng |
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
| [`Serena_092_Serena`](_Slot/Serena_092_Serena/Serena_092_Serena.md) | `.serena/` | config agent |
| [`Root_093_Env`](_Slot/Root_093_Env/Root_093_Env.md) | `.env` | secret runtime thật |
| [`Data_094_Data`](_Slot/Data_094_Data/Data_094_Data.md) | `data/` | runtime / file thật theo máy |
| [`Data_095_State`](_Slot/Data_095_State/Data_095_State.md) | `data/state/` | trạng thái runtime |
| [`Data_096_Cache`](_Slot/Data_096_Cache/Data_096_Cache.md) | `data/cache/` | file cache runtime |
| [`Data_097_Settings`](_Slot/Data_097_Settings/Data_097_Settings.md) | `data/settings/` | setting người dùng chỉnh |
| [`Data_098_Logs`](_Slot/Data_098_Logs/Data_098_Logs.md) | `data/logs/` | log file |
| [`Data_099_Tmp`](_Slot/Data_099_Tmp/Data_099_Tmp.md) | `data/tmp/` | file tạm |
| [`Data_100_Snapshots`](_Slot/Data_100_Snapshots/Data_100_Snapshots.md) | `data/snapshots/` | snapshot dữ liệu |
| [`Data_101_Models`](_Slot/Data_101_Models/Data_101_Models.md) | `data/models/` | model weight |
| [`Data_102_Secrets`](_Slot/Data_102_Secrets/Data_102_Secrets.md) | `data/secrets/` | mọi bí mật của repo: khoá · token · két mã hoá |
| [`Data_103_Uploads`](_Slot/Data_103_Uploads/Data_103_Uploads.md) | `data/uploads/` | bytes file upload |
| [`Generated_104_Generated`](_Slot/Generated_104_Generated/Generated_104_Generated.md) | `generated/` | code sinh tự động |
| [`Dist_105_Dist`](_Slot/Dist_105_Dist/Dist_105_Dist.md) | `dist/` | output build |
| [`Build_106_Build`](_Slot/Build_106_Build/Build_106_Build.md) | `build/` | output build |
| [`Coverage_107_Coverage`](_Slot/Coverage_107_Coverage/Coverage_107_Coverage.md) | `coverage/` | output coverage |
| [`Venv_108_Venv`](_Slot/Venv_108_Venv/Venv_108_Venv.md) | `.venv/` | môi trường Python |
| [`NodeModules_109_NodeModules`](_Slot/NodeModules_109_NodeModules/NodeModules_109_NodeModules.md) | `node_modules/` | deps Node |
| [`Pycache_110_Pycache`](_Slot/Pycache_110_Pycache/Pycache_110_Pycache.md) | `__pycache__/` | cache bytecode Python |
| [`Exports_135_Exports`](_Slot/Exports_135_Exports/Exports_135_Exports.md) | `exports/` | bản render / publish sinh ra |
| [`Root_136_Principles`](_Slot/Root_136_Principles/Root_136_Principles.md) | `.` | nguyên tắc chung của chuẩn cấu trúc |
| [`Frontend_137_UiDictionary`](_Slot/Frontend_137_UiDictionary/Frontend_137_UiDictionary.md) | `frontend/` | từ điển slot thiết kế UI/UX |

| Host note · Ghi chú host | About · Về |
|---|---|
| [`IDE`](_Host/IDE/IDE.md) | agent trong trình soạn code |
