---
version: 5
lang: vi
---
# Dept_154_Dept dept — repo của một phòng ban

## Vai trò

`Workspace\Company\<Tổ chức>\Dept_<Mã>\` là repo chứa việc của MỘT phòng ban: báo cáo, số liệu tổng hợp, tác vụ chạy định kỳ
(hằng tuần, hằng tháng) của phòng đó. Mỗi phòng đúng một repo. Repo được ráp HS theo khung `Struc_Repo_Dept`.

Ví dụ: `D:\Workspace\Company\Acme\Dept_FIN\` (phòng tài chính) · `D:\Workspace\Company\Acme\Dept_LOG\` (phòng hậu cần).

## Quan hệ với repo khác — khai trong `docs\.harness.json` của repo phòng ban

- `owner` — BẮT BUỘC: tên thư mục của repo quản các phòng ban của tổ chức, tức repo ráp khung `Struc_Repo_WorkspaceManager`
  (vai `workspace-manager`). Trong một tổ chức, repo đó là kho dữ liệu (DW). Ví dụ `"owner": "_DB_Warehouse"`. Chỉ một tên.
  Khi tổ chức chưa có repo nào ráp khung đó, `conform` chỉ nhắc, chưa chặn.
- `uses` — repo cung cấp dịch vụ mà phòng dùng, theo từng loại. Phòng đọc số liệu từ kho dữ liệu ⇒
  `"uses": { "data": "_DB_Warehouse" }`. Repo được nêu phải ráp khung có cung cấp đúng loại đó: `data` do
  `Struc_Repo_WorkspaceManager` cung cấp.
- Không nhầm với repo quản ứng dụng (`Struc_Repo_SystemManager`, ví dụ `_Project\ERP\_Hub\`): repo đó quản app và hệ dữ liệu
  của app, KHÔNG quản phòng ban, nên không được làm `owner` của phòng ban.
- Phòng ban không quản repo nào khác.

## Luật

- Phòng KHÔNG giữ bản sao dữ liệu của hệ nguồn: số liệu đọc qua repo `_DB_<Hệ>` mà nó `uses`, không chép bảng về repo phòng.
- Phòng KHÔNG giữ bản riêng của khuôn báo cáo chung: khuôn lấy từ `_Design\<Công cụ>_Template\` của tổ chức, logo và icon từ `_Design\Assets\` (Design_172): báo cáo chép đúng tệp nó dùng vào chỗ của nó và commit.
- Git của repo phòng ban là bản lưu tại máy (`git: local` trong khung): có lịch sử commit, KHÔNG có remote, không push.

## Khuôn tên

`Dept_<Mã>`, mã phòng viết HOA, 2 đến 4 chữ cái, không số, không dấu gạch: `Dept_FIN` · `Dept_LOG` · `Dept_SAL`. Sai khuôn
(`Dept_finance`, `Dept_Fin`, `Dept_FINANCE`) là lệch chuẩn.

## Phép kiểm

- `zemory conform --layout <ổ>\Workspace\Company\<Tổ chức>`: thư mục phòng ban sai khuôn tên bị coi là thư mục lạ
  (`unknown-folder`).
- `zemory conform` chạy TRONG repo phòng ban: thiếu `owner` khi tổ chức đã có repo quản cụm, `owner` không phải repo quản
  cụm, `uses.data` trỏ tới repo không cung cấp `data` — đều báo đỏ.
