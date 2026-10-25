---
version: 6
lang: vi
---
# Struc_Repo_WorkspaceManager

Chuẩn cấu trúc của repo tổng quản một cụm: mọi slot của `Struc_Repo_NonApp` (khai `extends`) cộng các slot của dịch vụ nó
cung cấp cho cả cụm. Template này khác nhau theo từng cụm của người dùng; phần chung là vai và các dịch vụ dưới đây.

## Vai

- Quản: repo theo template `Struc_Repo_Dept` (khung, chuẩn báo cáo, bộ mẫu của phòng ban).
- Cung cấp cho cả cụm: `data` (DW, kho dữ liệu) · `workspace-values` (giá trị của cụm, slot `Data_140_WorkspaceValues`) · `mail`
  (bộ mail chung, slot `Config_139_Mail`).
- Không thuộc quyền repo nào (cấp cao nhất của cụm).
- **Sửa chuẩn chung là việc của repo này.** Một quy tắc áp cho mọi repo của cụm (slot · luật · skill · khối máy sinh) ⇒ repo
  này sửa ở HS rồi chạy `zemory sync`; `conform` của mỗi repo bắt phần còn lệch. Không nhắn từng repo tự sửa tay, không để repo
  nào sửa trước chuẩn. Sync ghi vào repo có vai `dept` là ngoại lệ duy nhất của luật chỉ-đo-không-ghi; mọi thay đổi khác trong
  repo đó vẫn là việc của phiên repo đó.
- **Một lệnh `zemory sync` trong repo này phủ mọi repo nó quản.** Máy ráp repo này trước, rồi ráp từng repo có vai nằm trong
  `role.manages` của template này (`dept`):
  - repo có marker khai `owner` là tên repo này;
  - repo chưa khai `owner` khi trong cụm chỉ repo này quản vai đó: `owner` là chắc chắn, sync ghi nó vào marker rồi ráp repo đó.
    Hai repo cùng quản một vai ⇒ máy không đoán: repo chưa khai không được ráp, `conform` của nó yêu cầu khai `owner`.
  - Mỗi repo được ráp theo bộ ghi trong marker của chính nó (`kit`), không theo bộ của repo này ⇒ giữ đúng cấu trúc của nó; phần
    máy không tự sửa được ghi vào `04_TODO` của repo đó.
  - `zemory sync --self` chỉ ráp repo này. Repo có phiên agent đang làm dở ⇒ chờ phiên đó commit rồi mới sync.
- Cài `scripts/region_values.py` như template phòng ban (bản chép từng byte của bản ở `Struc_Repo_Dept`, test giữ hai bản
  bằng nhau): tool của skill PBI và task VM đọc giá trị cụm qua nó; chạy trong chính repo này thì nó nhận repo này là tổng quản.

## Repo khác dùng dịch vụ thế nào

- Repo phòng ban khai `owner` = tên repo này, và `uses` theo mảng (`data` · `mail` …).
- Thêm hoặc sửa thứ trong dịch vụ chung (người nhận mail, một giá trị của cụm) ⇒ nhắn phiên của repo này; repo khác không ghi thẳng
  (`Rule_Gate_44_RepoScope`).
