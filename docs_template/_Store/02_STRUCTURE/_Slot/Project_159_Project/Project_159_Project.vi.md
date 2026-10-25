---
version: 3
lang: vi
---
# Project_159_Project project — dự án và ứng dụng của tổ chức

## Vai trò

`Workspace\Company\<Tổ chức>\_Project\` chứa repo KHÔNG thuộc riêng một phòng ban: ứng dụng nội bộ của tổ chức, ứng dụng do bên
cung cấp làm, dự án nhiều phòng cùng làm. Mỗi repo nằm trong một nhóm: `_Project\<Nhóm>\<repo>\`.

## Các nhóm

| nhóm | chứa gì | ví dụ |
|---|---|---|
| `ERP\` | ứng dụng nội bộ dựng trên hệ nghiệp vụ của tổ chức, và repo quản các ứng dụng đó | `_Project\ERP\AcmeFlow\` · `_Project\ERP\_Hub\` |
| `Vendor\` | ứng dụng do bên cung cấp làm cho tổ chức; có thể không ráp HS nếu mã do bên kia giữ | `_Project\Vendor\CameraAI\` |

## Khung ráp và quan hệ

- Repo ứng dụng ráp `Struc_Repo_App` (vai `app`). `owner` là tuỳ chọn; nếu khai thì phải là repo quản ứng dụng.
- Repo quản ứng dụng ráp `Struc_Repo_SystemManager` (vai `system-manager`), thường tên `_Hub`. Nó quản các repo `app` và các
  hệ dữ liệu của ứng dụng (`_DB_<Hệ>` ráp `Struc_Repo_AppData`). Nó KHÔNG quản phòng ban — phòng ban thuộc kho dữ liệu
  (`Struc_Repo_WorkspaceManager`).
- Quan hệ khai trong `docs\.harness.json` của chính repo ứng dụng, ví dụ `"owner": "_Hub"`.

## Luật

- Repo của MỘT phòng ban thì đặt ở `Dept_<Mã>\`, không đặt vào `_Project\`.
- Không đặt repo thẳng dưới `_Project\`: luôn có cấp nhóm.

## Khuôn tên

Nhóm PascalCase (`ERP` · `Vendor`). Repo giữ đúng tên như trên git.

## Phép kiểm

- `zemory conform --layout <ổ>\Workspace\Company\<Tổ chức>` kiểm `_Project` là thư mục hợp lệ của tổ chức.
- `zemory conform` chạy TRONG repo ứng dụng: `owner` khai mà không phải repo quản ứng dụng — báo đỏ.
