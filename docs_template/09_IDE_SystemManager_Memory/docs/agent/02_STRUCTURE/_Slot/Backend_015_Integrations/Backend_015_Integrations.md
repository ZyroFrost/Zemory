---
id: Slot_15
aka: 03-15
name: integrations
version: 5
path: backend/src/integrations/
from: _Store/02_STRUCTURE/_Slot/Backend_015_Integrations @v5 #da499290637f
---
# Backend_015_Integrations integrations — clients calling outside services (outbound edge)

- Role:
  - Clients that call OUTSIDE SERVICES (SaaS: Stripe/Slack/SendGrid/FCM/S3 client…). OUTBOUND EDGE — the direction of calls going out.
  - Takes the client part of other concerns: the sending channels of notifications (SendGrid/Twilio/FCM) · the S3 client of storage · APM/Sentry/Datadog of logging · one place that EXECUTES what an LLM tool calls.
  - Three kinds of connection: `api/` = what we open · `integrations/` = outside services · `store/` = the database. Not `external/` (their code cloned in).
- May hold / may not hold: Not here: the client calling back to our own backend (→ `frontend/client/`) · outside code cloned in (→ `external/`).
