---
id: Slot_158
name: legacy
version: 2
path: _Legacy/<Nguồn>/
scope: layout
---
# Legacy_158_Legacy legacy — lưu trữ việc cũ

## Vai trò

`Workspace\Company\<Tổ chức>\_Legacy\` lưu nguyên trạng những việc đã làm TRƯỚC khi có cấu trúc hiện tại: bàn giao của người
làm trước, nội dung chép từ máy chủ cũ, mã và báo cáo của hệ cũ. Mục đích là tra lại được, không phải làm việc tiếp trên đó.
Đây là nơi cung cấp vai `legacy`, ráp khung `Struc_Repo_Reference`.

## Cách đặt

Mỗi NGUỒN một thư mục, đặt tên theo nguồn đó; bên trong giữ NGUYÊN cây như lúc nhận, kể cả tên có dấu và có dấu cách. Ví dụ:

```
_Legacy\
├── OldServer\          chép nguyên từ máy chủ cũ: Reports\ · Queries\ · …
└── PreviousAnalyst\    bàn giao của người làm trước, giữ nguyên tên thư mục gốc
```

## Luật — chỉ đọc

- KHÔNG sửa, KHÔNG xếp lại, KHÔNG đổi tên gì bên trong một nguồn.
- KHÔNG ráp HS vào các nguồn bên trong.
- Muốn dùng lại một phần: CHÉP phần cần sang repo đúng vai (ví dụ một truy vấn cũ ⇒ `_DB_<Hệ>\`, một báo cáo cũ ⇒
  `Dept_<Mã>\`) rồi làm ở đó. Bản trong `_Legacy\` giữ nguyên làm hồ sơ.

## Khuôn tên

`<Nguồn>` là tên người, máy hoặc hệ mà nội dung đến từ đó: tên máy chủ (`OldServer`, `SRV-BI`), tên đơn vị cũ. Viết sao cho
nhìn vào biết ngay nguồn gốc.

## Phép kiểm

`zemory conform --layout <ổ>\Workspace\Company\<Tổ chức>` kiểm `_Legacy` là thư mục hợp lệ của tổ chức. Bên trong không bị
kiểm khuôn (giữ nguyên trạng là chủ ý).
