---
id: Slot_15
aka: 03-15
name: integrations
version: 4
path: backend/src/integrations/
from: _Store/02_STRUCTURE/_Slot/Backend_015_Integrations @v4 #62580753e8ab
---
# Backend_015_Integrations integrations — client gọi service ngoài (biên ra)

- Vai trò:
  - Client gọi SERVICE NGOÀI (SaaS: Stripe/Slack/SendGrid/FCM/S3-client…). BIÊN RA — chiều gọi đi ra ngoài.
  - Nhận phần client của các concern khác: kênh gửi notifications (SendGrid/Twilio/FCM) · client S3 của storage · APM/Sentry/Datadog của logging · một nơi THỰC THI cho tool LLM gọi.
  - Ba loại kết nối: `api/` = mình mở · `integrations/` = service ngoài · `store/` = database. Khác `external/` (code họ clone về).
- Được chứa / không chứa: Không chứa: client gọi về backend của mình (→ `frontend/client/`) · code ngoài clone về (→ `external/`).
