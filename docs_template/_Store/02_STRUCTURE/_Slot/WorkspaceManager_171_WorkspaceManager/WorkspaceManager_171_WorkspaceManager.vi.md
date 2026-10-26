---
version: 1
lang: vi
---
# WorkspaceManager_171_WorkspaceManager workspace-manager — repo tổng quản của một tổ chức không có DW

## Vai trò

`Workspace\Company\<Tổ chức>\_WorkspaceManager\` là repo quản các repo của tổ chức khi tổ chức không chạy DW — không làm việc với
database, không có app riêng, ví dụ một cụm repo tài liệu hay báo cáo. Nó đứng ngang cấp với `_DB_<Hệ>\` và được ráp cùng một khung,
`Struc_Repo_WorkspaceManager`: là `owner` của các repo `Dept_<Mã>\`, giữ giá trị của cụm (`Data_140_WorkspaceValues`) và bộ mail chung
(`Config_139_Mail`), và sửa chuẩn chung trên HS.

Khác Db_155_Db: repo DW `_DB_<Hệ>\` chỉ giữ vai tổng quản khi đi kèm một database (schema, tác vụ nạp); `_WorkspaceManager\` giữ vai tổng
quản mà không có database, nên không cung cấp dịch vụ `data`.

## Khi nào dùng

1. Tổ chức đã có repo DW (`_DB_<Hệ>\` mang khung `Struc_Repo_WorkspaceManager`) chưa?
   - Có ⇒ repo đó là tổng quản; không tạo `_WorkspaceManager\`.
   - Chưa ⇒ repo tổng quản là `_WorkspaceManager\`, tạo khi repo phòng ban đầu tiên cần `owner`.
2. Về sau tổ chức dựng DW ⇒ giữ `_WorkspaceManager\` làm tổng quản và để `_DB_<Hệ>\` mới là repo dữ liệu (`Struc_Repo_AppData` hoặc một
   DW không quản ai), hoặc dời vai tổng quản trong một đợt (`Skill_Harness_RepoMove`). Không bao giờ có hai tổng quản cùng lúc.

## Được chứa / không được chứa

- Chứa: giá trị của cụm · bộ mail chung · tài liệu và skill của cụm · chuẩn mà các repo phòng ban theo.
- Không ở đây: báo cáo của một phòng (`Dept_<Mã>\`) · mã của app (`_Project\<Nhóm>\<repo>\`) · giấy tờ của chủ máy với tổ chức
  (`_Profile\`).

## Đặt tên

Đúng `_WorkspaceManager` — một cái mỗi tổ chức, không hậu tố.

## Phép kiểm

- `zemory conform --layout <ổ>\Workspace\Company\<Tổ chức>`: `_WorkspaceManager\` là slot đã biết; thư mục viết khác đi là thư mục lạ
  (`unknown-folder`).
- `zemory conform` chạy TRONG các repo phòng ban kiểm `owner` của chúng ghi đúng repo tổng quản.
- "Một tổng quản mỗi tổ chức" (`Struc_Region_Company`, mỗi vai dịch vụ một nhà cung cấp) do chủ máy phán; chưa có chốt máy.
