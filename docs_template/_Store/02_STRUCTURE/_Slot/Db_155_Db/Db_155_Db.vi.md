---
version: 3
lang: vi
---
# Db_155_Db db — repo dữ liệu của một hệ

## Vai trò

`Workspace\Company\<Tổ chức>\_DB_<Hệ>\` là repo của MỘT hệ dữ liệu dùng chung trong tổ chức: lược đồ, truy vấn có tên, tác vụ
nạp dữ liệu, tài liệu về nguồn. Dấu `_` đầu tên nói đây là thứ dùng chung của cả tổ chức, không của riêng phòng nào.

## Ba loại — mỗi loại ráp một khung khác nhau

| loại | ví dụ | khung ráp | vai trong tổ chức |
|---|---|---|---|
| kho dữ liệu (DW) | `_DB_Warehouse` | `Struc_Repo_WorkspaceManager` | quản các repo phòng ban (là `owner` của `Dept_<Mã>`), cung cấp `data` cho các phòng |
| hệ dữ liệu của một ứng dụng (nghiệp vụ nguồn: ERP, POS…) | `_DB_Erp` | `Struc_Repo_AppData` | cung cấp `app-data` cho ứng dụng; `owner` bắt buộc là repo quản ứng dụng (`Struc_Repo_SystemManager`) |
| trung tâm log | `_DB_Log` | `Struc_Repo_LogCenter` | cung cấp `log`; không có `owner` |

Một tổ chức có đúng MỘT kho dữ liệu (nơi cung cấp `data`) và đúng MỘT trung tâm log (nơi cung cấp `log`) — luật "mỗi vai dịch vụ
một nơi cung cấp" của `Struc_Region_Company`. Hệ dữ liệu của ứng dụng thì mỗi ứng dụng một repo.

## Được chứa / không chứa

- Chứa: lược đồ (schema) · truy vấn có tên · tác vụ nạp và làm sạch dữ liệu · tài liệu mô tả nguồn.
- Không chứa: báo cáo của một phòng ban (để ở `Dept_<Mã>\` của phòng đó) · mã ứng dụng (để ở `_Project\<Nhóm>\<repo>\`) ·
  dữ liệu thô dung lượng lớn kéo về (để trong cơ sở dữ liệu, không để trong repo).

## Khuôn tên

`_DB_<Hệ>`: tiền tố `_DB_` cố định, tên hệ PascalCase, không dấu, không dấu cách: `_DB_Warehouse` · `_DB_Erp` · `_DB_Log`.

## Phép kiểm

- `zemory conform --layout <ổ>\Workspace\Company\<Tổ chức>`: thư mục không khớp khuôn `_DB_<Hệ>` hay slot nào khác bị coi là
  thư mục lạ (`unknown-folder`).
- `zemory conform` chạy TRONG repo: hệ dữ liệu của ứng dụng thiếu `owner` (khi tổ chức đã có repo quản ứng dụng), `owner`
  không quản `app-data` — báo đỏ.
