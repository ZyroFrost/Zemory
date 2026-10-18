---
id: Slot_140
name: workspace-values
version: 3
path: data/region/
checked: [Data_094_Data, Config_075_Config]
from: _Store/02_STRUCTURE/_Slot/Data_140_WorkspaceValues @v3 #2a74edb93396
---
# Data_140_WorkspaceValues workspace-values — giá trị thật của cụm

- Vai trò: `data/region/values.json` — giá trị thật dùng chung của cả cụm, chỉ có trong template tổng quản
  (`Struc_Repo_WorkspaceManager`). Git không theo dõi `data/`. Tool và skill chỉ nêu TÊN KHOÁ, không bao giờ chép giá trị;
  repo phòng ban đọc qua `scripts/region_values.py` (tìm tổng quản theo `owner` trong marker).
- Khác `Data_094_Data` (dữ liệu thật của chính repo): giá trị cụm có luật riêng — chỉ template tổng quản có nó, mọi repo
  của cụm đọc nó qua `owner` (không chép), và tool chỉ được nêu TÊN khoá.
- Thiếu một khoá ⇒ tool rơi về mặc định trung tính (danh sách rỗng, đường dẫn không tồn tại) và cổng liên quan báo thiếu; không tool
  nào tự điền giá trị công ty.
- Khoá chung:

| khoá | là gì |
|---|---|
| `warehouse_server` · `warehouse_db` | chuỗi máy chủ của kho dữ liệu (gateway so khớp từng chữ) và tên cơ sở dữ liệu |
| `theme_file` · `icons_dir` · `template_report` · `glossary_dir` | theme báo cáo · thư viện icon · khuôn gốc · bảng thuật ngữ — đường dẫn trong tổng quản |
| `design_values` | bảng giá trị thiết kế của cụm: mã màu theo vai, thông số khung, số đo trên trang gốc, logo — đường dẫn trong tổng quản (luật thiết kế: `Skill_PBI_Base`) |
| `dept_codes` · `acronyms` | bộ mã phòng ban · từ viết tắt nghiệp vụ được giữ in hoa trong tiêu đề |
| `legacy_sources` | nguồn, site, thư mục, khoá của hệ cũ mà model và task không được đọc |
| `card_icons` | khoá thẻ KPI → tên icon, gộp lên bộ mặc định của `card_icons.py` |
| `vm_ssh_alias` · `vm_run_dir` · `vm_work_dir` · `sharepoint_site` | máy chủ chạy task và chỗ giao kết quả |
| `acronym_origin` · `not_acronyms` | nguyên gốc của từng từ viết tắt (kèm nguồn) · chữ in hoa không phải viết tắt |
| `query_app` · `query_row_cap` | công cụ truy vấn chỉ đọc agent dùng để dò (tên, cách gọi) · trần dòng một lượt |
| `mail_signature` · `mail_cc` · `shared_mailbox` · `shared_mailbox_signature` | chữ ký và Cc mặc định của mail báo cáo; hộp thư chung và chữ ký của nó |
