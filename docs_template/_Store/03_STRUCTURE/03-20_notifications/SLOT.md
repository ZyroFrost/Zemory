---
id: 03-20
name: notifications
version: 1
path: backend/src/notifications/
applies: [App]
---
# 03-20 notifications — điều phối email/SMS/push

- Vai trò:
  - Điều phối EMAIL/SMS/PUSH: gửi gì, khi nào.
  - Kênh gửi (SendGrid/Twilio/FCM) → `integrations/` · template → `backend/resources/locales/`.
- Được chứa / không chứa: Không chứa: client kênh gửi · template.
