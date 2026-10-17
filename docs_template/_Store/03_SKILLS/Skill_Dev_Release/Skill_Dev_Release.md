---
id: Skill_Dev_Release
name: dev-release
version: 2
description: Release a build of an app - pick the version number, read the version that is running, check the tree before pushing, and push with the bump in the same commit. Use whenever a build is about to be pushed or packaged, or a release, publish, bump or deploy is asked for. Vietnamese triggers - "lên version", "phát hành", "đóng gói", "đẩy bản mới", "push bản build".
---

# dev-release — phát hành một bản build

> Áp khi đợt đang đẩy có bản build đi kèm (đụng `backend/` · `frontend/` · file version). Quyền push vẫn theo
> `Rule_Gate_50_Git`: chỉ đẩy khi lời gọi có lệnh push.

## 1. Soát trước khi đẩy

- Chạy gate hoặc lint của repo; đỏ thì dừng.
- `git status` không lọt dữ liệu thật hay bí mật (`Rule_Gate_21_WhatEntersGit`).
- Rà `04_TODO`: mục nào đợt này làm xong thì đóng theo `Rule_Gate_38_TodoDoor`.

## 2. Chọn số

- Mỗi lần phát hành có bản build là một số mới; không phát hành lại với số cũ, hai bản trong cùng ngày là hai số. Máy
  khác quyết định có cập nhật hay không bằng cách so số: hai bản khác nhau cùng một số ⇒ máy đã ở số đó không thấy bản mới.
- Số mới lớn hơn số đang chạy ở nơi phát hành thật: đọc số đó trước khi đặt (thư mục dùng chung · trang phát hành · file
  version của bản đang chạy); không đọc được ⇒ hỏi, không cộng theo trí nhớ.
- Chọn cột theo việc được yêu cầu, không theo lượng mã đã đổi:

| Cột | Khi nào |
|---|---|
| 1 (major) | đụng cấu trúc, hoặc thêm một tính năng rất lớn |
| 2 (minor) | thêm hoặc bổ sung một tính năng |
| 3 (patch) | sửa lỗi của tính năng đang có |

- Một loạt bản vá đẩy liền nhau trong một đợt ⇒ gom một số.
- Đợt chỉ đụng docs ⇒ đẩy không nâng số: docs không sinh bản build, nâng số là báo bản mới khi không có.

## 3. Đẩy

- Nâng số trong file version (`package.json` · `pyproject.toml` · file của nền tảng) + commit + push trong cùng một mốc.
- Bản sửa chỉ cần có hiệu lực trên máy đang chạy ⇒ build lại là đủ, không cần push.
- Vẫn phải hỏi trước: force-push · xoá tag hoặc nhánh trên remote.
- Chốt máy: guard so số trong `package.json` với số đã phát hành (repo Node); repo dùng file version khác chưa có chốt
  máy ⇒ soát bằng tay ở bước 2.
