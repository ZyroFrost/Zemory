---
id: Slot_28
aka: 03-28
name: jobs
version: 5
path: backend/src/jobs/
---
# Backend_028_Jobs jobs — background jobs / cron / queue

- Role:
  - Background jobs / cron / queue / scheduled tasks.
  - The write-gate / advisory lock that stops the daemon and the CLI writing the DB at once lives here — the write coordination goes with the scheduler.
