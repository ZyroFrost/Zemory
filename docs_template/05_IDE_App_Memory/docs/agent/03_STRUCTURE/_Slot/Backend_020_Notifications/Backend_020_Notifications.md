---
id: Slot_20
aka: 03-20
name: notifications
version: 4
path: backend/src/notifications/
from: _Store/03_STRUCTURE/_Slot/Backend_020_Notifications @v4 #e9cff7688da4
---
# Backend_020_Notifications notifications — điều phối email/SMS/push

- Vai trò:
  - Điều phối EMAIL/SMS/PUSH: gửi gì, khi nào.
  - Kênh gửi (SendGrid/Twilio/FCM) → `integrations/` · template → `backend/resources/locales/`.
- Được chứa / không chứa: Không chứa: client kênh gửi · template.
