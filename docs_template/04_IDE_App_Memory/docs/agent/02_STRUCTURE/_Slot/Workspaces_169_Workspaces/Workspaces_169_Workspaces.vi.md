---
version: 1
lang: vi
---
# Workspaces_169_Workspaces workspaces — đầu ra app làm ra

## Vai trò

`workspaces/` ở gốc một repo APP chứa ĐẦU RA mà app làm ra cho chủ của nó: mỗi đơn vị đầu ra một thư mục (một kênh, một dự án, một
khách), trong đó là những gì app đã làm cho đơn vị đó. App giữ đầu ra ngay trong repo của nó, không bao giờ để ở nơi chứa ngoài repo,
để app và thứ nó làm ra cùng dời, cùng sao lưu và cùng tìm thấy.

## Bên trong

```
workspaces/
├── <đơn vị>/          một đơn vị đầu ra: một kênh, một dự án
│   └── <món>/         một món app làm cho nó (một bài hát, một bản dựng)
└── _<dùng chung>/     thứ các đơn vị dùng chung (tên có `_`): track, hồ sơ, hiệu ứng
```

Ví dụ thật: `workspaces/my-channel/2025-10-20 Song Title/` · `workspaces/_tracks/` · `workspaces/_profile/`.

## Luật

- Gitignore: đầu ra là dữ liệu, không phải code. Nặng: được đặt ở ổ thứ hai rồi nối về (Struc_Disk_Data).
- Bí mật app cần không nằm ở đây ⇒ `.env` hoặc `data/secrets/`.

## Không thuộc đây ⇒ đi đâu — ranh giới với `data/` (Data_094)

`data/` giữ thứ app cần để CHẠY (trạng thái, cache, thiết lập, log, database của nó); `workspaces/` giữ thứ app LÀM RA cho chủ của nó.
Sự thật tách hai bên: xoá `data/` thì app về trạng thái đầu; xoá `workspaces/` thì mất việc của chủ.

## Phép kiểm

Chưa có phép kiểm máy.
