---
id: Slot_20
aka: 03-20
name: notifications
version: 5
path: backend/src/notifications/
---
# Backend_020_Notifications notifications — orchestrating email/SMS/push

- Role:
  - Orchestrates EMAIL/SMS/PUSH: what is sent, and when.
  - Sending channels (SendGrid/Twilio/FCM) → `integrations/` · templates → `backend/resources/locales/`.
- May hold / may not hold: Not here: channel clients · templates.
