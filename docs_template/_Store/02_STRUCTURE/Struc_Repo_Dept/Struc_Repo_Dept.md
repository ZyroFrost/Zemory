---
id: Struc_Repo_Dept
name: repo-dept
version: 9
profile: non-app
label: DEPT
intro: : repo của một phòng ban trong một vùng có tổng quản — việc theo case (kéo · xử lý · giao báo cáo), báo cáo BI, tác vụ chạy định kỳ trên máy chủ; không phát triển app
ask: ; repo phòng ban nhận dữ liệu từ DW của tổng quản và giao báo cáo cho người nhận là DEPT
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
installs: [scripts/region_values.py]
---
# Struc_Repo_Dept

Chuẩn cấu trúc của một repo phòng ban: mọi slot của `Struc_Repo_NonApp` (khai `extends`, không chép lại) cộng các slot
riêng của phòng ban. Phòng ban khác NON-APP chung ở khuôn tên và ở việc thuộc về một vùng: tên case và tên file theo khuôn
của vùng, giá trị thật (máy chủ · thư viện chia sẻ · hộp thư · bộ mã phòng) nằm ở repo tổng quản của vùng, không nằm trong
repo phòng ban. Slot nằm ở `_Slot/` và không mang hệ nào.

## Thuộc một cụm

- Vai `dept` (khối `role` trong `structure.json`): thuộc quyền repo theo `Struc_Repo_WorkspaceManager`; khai `owner` là bắt
  buộc. Quan hệ và ranh giới giữa các repo của cụm: `Struc_Region_Workspace`.
- Giá trị thật của cụm (máy chủ · thư viện chia sẻ · hộp thư · bộ mã phòng) nằm ở tổng quản (slot `Data_140_WorkspaceValues`).
  `scripts/region_values.py` (template này cài vào repo) tìm tổng quản theo `owner` trong marker; tool và skill chỉ nêu TÊN KHOÁ.
- Mail: người nhận, người gửi và khoá gửi nằm ở bộ mail chung của tổng quản (slot `Config_139_Mail`); repo phòng không giữ danh bạ.

## Mở một repo phòng ban mới

1. Tên `Dept_<MÃ>`: mã thuộc bộ đóng của cụm (khoá `dept_codes`); thêm mã mới do người dùng chốt ở phiên tổng quản. Tên thư mục
   là định danh của repo trong bộ nhớ chung ⇒ chốt một lần; đổi sau là dời `project_root`, làm ở phiên tổng quản.
2. Ráp harness từ bộ phòng ban: `zemory init --kit <số bộ>`; khai marker `owner` = repo tổng quản và `uses` theo mảng cần dùng
   (`data` · `workspace-values` · `mail`); `zemory conform` xanh.
3. Điền các khung hiến pháp (`Cons.md`) theo sản phẩm của chính phòng — không chép điều của phòng khác; bất biến chung của cụm nằm ở
   hiến pháp của tổng quản.
4. Git bắt buộc, chỉ cục bộ: `.gitignore` chặn đủ `data/` · `exports/` · bí mật TRƯỚC → `git init -b main` · `core.autocrlf false`
   · LFS cho nhị phân nặng (`*.pbix` · `*.xlsx`) · hook pre-commit của harness → đọc danh sách staging, 0 bí mật → commit gốc. Không
   remote, không push tới khi người dùng chốt đích (`Rule_Gate_50_Git`).
5. Không tạo slot rỗng: thư mục chỉ có khi có file thật (ngoại lệ: ba chặng của `data/<case>/`, slot `Data_131_Case`).
