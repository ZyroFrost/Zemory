---
version: 4
lang: vi
---
# Template_157_Template template — khuôn báo cáo chung

## Vai trò

`Workspace\Company\<Tổ chức>\_Design\<Công cụ>_Template\` giữ KHUÔN báo cáo gốc dùng chung của một công cụ báo cáo (BI)
trong tổ chức: bố cục, theme, trang mẫu, bảng đo chuẩn. Mọi phòng ban dựng báo cáo mới thì lấy khuôn từ đây. Nó nằm trong thư
mục giao diện dùng chung của tổ chức `_Design\` (`Design_172_Design`), cạnh tài nguyên giao diện mà khuôn dùng (logo, icon:
`_Design\Assets\`); `_Design\` cung cấp vai `design`.

Ví dụ: `D:\Workspace\Company\Acme\_Design\PBI_Template\` chứa tệp khuôn Power BI (`.pbit`) và tệp theme (`.json`) của Acme.

## Luật

- Mỗi công cụ báo cáo một thư mục khuôn; phòng ban KHÔNG giữ bản khuôn riêng trong repo của mình. Sửa khuôn thì sửa ở đây,
  mọi phòng dùng chung bản mới.
- Đồng bộ cùng `_Design\` bằng Syncthing, KHÔNG phải repo git: không `git init`, không push.
- Chỉ chứa tệp khuôn của công cụ. Không chứa báo cáo đã điền số liệu (báo cáo thuộc repo phòng ban), không chứa logo hay icon
  (chúng ở `_Design\Assets\`, một bộ cho cả app lẫn báo cáo).

## Khuôn tên

`<Công cụ>_Template`: tên công cụ viết tắt HOA trước `_Template`, nằm trong `_Design\`: `PBI_Template` (Power BI) ·
`TBL_Template` (Tableau). Không có `_` đứng đầu: nó là thư mục con bên trong khối `_Design\` (`Struc_Disk_Data` luật 3).

## Phép kiểm

`zemory conform --layout <ổ>\Workspace\Company\<Tổ chức>` nhận `_Design\` ở cấp tổ chức. Chưa có phép kiểm máy cho nội dung
bên trong.
