---
id: Slot_152
name: documents
version: 2
path: Documents/<mảng>/
scope: layout
---
# Documents_152_Documents documents — tài liệu cá nhân

## Vai trò

`<ổ dữ liệu>\Documents\` giữ tài liệu của CHÍNH người dùng mà không thuộc repo nào: hồ sơ cá nhân, giấy tờ, bản scan, hợp
đồng lao động, chứng chỉ.

## Cách chia

Chia theo MẢNG của đời sống, mỗi mảng một thư mục; trong mảng chia tiếp theo việc khi cần. Ví dụ:

```
Documents\
└── Profile\              hồ sơ cá nhân
    ├── HR\               hồ sơ xin việc, CV, giấy tờ lao động
    └── Certificates\     bằng cấp, chứng chỉ (bản scan)
```

## Luật

- Không chứa tài liệu CÔNG VIỆC của một tổ chức: tài liệu đó thuộc repo của tổ chức trong `Workspace\Company\<Tổ chức>\`.
- Không chứa bản cài (`Software\`), cấu hình hay khoá công cụ (`AppConfig\`), repo (`Workspace\`).
- Máy là tài sản của tổ chức (laptop công ty) thì không đặt tài liệu cá nhân ở đây; bản chính để ở máy riêng của người dùng.
- Không vào git công khai. Có đồng bộ hay không là lựa chọn của người dùng.

## Khuôn tên

Tiếng Anh, PascalCase, không dấu, không dấu cách: `Profile` · `HR` · `Certificates`.

## Phép kiểm

`zemory conform --layout <gốc ổ>` kiểm `Documents` là thư mục hợp lệ ở gốc ổ và báo repo nằm trong nó
(`repo-outside-workspace`). Bên trong các mảng không bị kiểm khuôn.
