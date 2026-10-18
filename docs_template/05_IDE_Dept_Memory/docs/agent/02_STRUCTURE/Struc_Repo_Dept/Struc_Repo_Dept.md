---
id: Struc_Repo_Dept
name: repo-dept
version: 4
profile: non-app
label: DEPT
intro: : repo của một phòng ban trong một vùng có tổng quản — việc theo case (kéo · xử lý · giao báo cáo), báo cáo BI, tác vụ chạy định kỳ trên máy chủ; không phát triển app
ask: ; repo phòng ban nhận dữ liệu từ kho của tổng quản và giao báo cáo cho người nhận là DEPT
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
installs: [scripts/region_values.py]
from: _Store/02_STRUCTURE/Struc_Repo_Dept @v4 #7a8453322bb4
---
# Struc_Repo_Dept

Chuẩn cấu trúc của một repo phòng ban: mọi slot của `Struc_Repo_NonApp` (khai `extends`, không chép lại) cộng các slot
riêng của phòng ban. Phòng ban khác NON-APP chung ở khuôn tên và ở việc thuộc về một vùng: tên case và tên file theo khuôn
của vùng, giá trị thật (máy chủ · thư viện chia sẻ · hộp thư · bộ mã phòng) nằm ở repo tổng quản của vùng, không nằm trong
repo phòng ban. Slot nằm ở `_Slot/` và không mang hệ nào.

## Vùng và giá trị vùng

- **Tổng quản** là repo giữ kho dữ liệu và giá trị thật của vùng. `scripts/region_values.py` (cấu trúc này cài vào repo)
  tìm nó theo thứ tự: biến môi trường `DW_REPO` · thư mục gốc vùng (tổ tiên có `docs/.harness.json` khai `"manager"`) ·
  repo anh em có `.env` chứa `WAREHOUSE_CONN` (bố cục máy chủ không có gốc vùng).
- Giá trị thật nằm ở `<tổng quản>/data/region/values.json` (git không theo dõi `data/`). Tool và skill chỉ nêu TÊN KHOÁ,
  không bao giờ chép giá trị:

| khoá | là gì |
|---|---|
| `warehouse_server` · `warehouse_db` | chuỗi máy chủ kho (gateway so khớp từng chữ) và tên cơ sở dữ liệu kho |
| `theme_file` · `icons_dir` · `template_report` · `glossary_dir` | theme báo cáo · thư viện icon · khuôn gốc · kho thuật ngữ — đường dẫn trong tổng quản |
| `design_standard` · `dept_standard` | chuẩn thiết kế báo cáo và chuẩn phòng ban của vùng — đường dẫn trong tổng quản |
| `dept_codes` · `acronyms` | bộ mã phòng ban · từ viết tắt nghiệp vụ được giữ in hoa trong tiêu đề |
| `legacy_sources` | nguồn, site, thư mục, khoá của hệ cũ mà model và task không được đọc |
| `card_icons` | khoá thẻ KPI → tên icon, gộp lên bộ mặc định của `card_icons.py` |
| `vm_ssh_alias` · `vm_run_dir` · `vm_work_dir` · `sharepoint_site` | máy chủ chạy task và chỗ giao kết quả |
| `acronym_origin` · `not_acronyms` | nguyên gốc của từng từ viết tắt (kèm nguồn) · chữ in hoa không phải viết tắt |
| `query_app` · `query_row_cap` | công cụ truy vấn chỉ-đọc agent dùng để dò (tên, cách gọi) · trần dòng một lượt |
| `mail_signature` · `mail_cc` · `shared_mailbox` · `shared_mailbox_signature` | chữ ký và Cc mặc định của mail báo cáo; hộp thư chung và chữ ký của nó |

- Thiếu một khoá ⇒ tool rơi về mặc định trung tính (danh sách rỗng, đường dẫn không tồn tại) và cổng liên quan báo thiếu;
  không tool nào tự điền giá trị công ty.

## Thuộc một vùng

- Repo phòng ban khai trong marker vai `dept`, tổng quản (`owner`) và các dịch vụ dùng (`uses`); vai, quan hệ và ranh giới giữa
  các repo của vùng nằm ở `Struc_Region_Workspace`.
