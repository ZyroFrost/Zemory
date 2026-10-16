---
id: Rule_64
aka: 02-64
name: local-build-no-push
version: 2
kind: judgment
applies: [App]
from: _Store/01_RULES/Rule_Core_64_LocalBuildNoPush @v2 #1319dc58c092
---
# Rule_Core_64_LocalBuildNoPush Sửa mã chạy trên máy này không cần push

- Mã chạy trên chính máy đang sửa ⇒ build là bản mới chạy ngay; không push chỉ để bản sửa có hiệu lực.
