---
id: Slot_157
name: template
version: 2
path: _<Công cụ>_Template/
scope: layout
---
# Template_157_Template template — khuôn báo cáo chung

## Vai trò

`Workspace\Company\<Tổ chức>\_<Công cụ>_Template\` giữ KHUÔN báo cáo gốc dùng chung của một công cụ báo cáo (BI) trong tổ
chức: bố cục, màu, logo, trang mẫu, bảng đo chuẩn. Mọi phòng ban dựng báo cáo mới thì lấy khuôn từ đây. Đây là nơi cung cấp
vai `template`, ráp khung `Struc_Repo_Reference`.

Ví dụ: `D:\Workspace\Company\Acme\_PBI_Template\` chứa tệp khuôn Power BI (`.pbit`) và tệp chủ đề (`.json`) của Acme.

## Luật

- Mỗi công cụ báo cáo một thư mục khuôn; phòng ban KHÔNG giữ bản khuôn riêng trong repo của mình. Sửa khuôn thì sửa ở đây,
  mọi phòng dùng chung bản mới.
- Là thư mục ĐỒNG BỘ bằng Syncthing, KHÔNG phải repo git: không `git init`, không push.
- Chỉ chứa tệp khuôn của công cụ. Không chứa báo cáo đã điền số liệu (báo cáo thuộc repo phòng ban).

## Khuôn tên

`_<Công cụ>_Template`: tên công cụ viết tắt HOA giữa `_` và `_Template`: `_PBI_Template` (Power BI) · `_TBL_Template` (Tableau).

## Phép kiểm

`zemory conform --layout <ổ>\Workspace\Company\<Tổ chức>` kiểm tên thư mục khớp khuôn `_<Công cụ>_Template`. Chưa có phép kiểm
máy cho nội dung bên trong.
