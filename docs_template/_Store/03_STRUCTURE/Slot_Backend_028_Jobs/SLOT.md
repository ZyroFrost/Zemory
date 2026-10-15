---
id: Slot_28
aka: 03-28
name: jobs
version: 2
path: backend/src/jobs/
applies: [App]
---
# Slot_Backend_028_Jobs jobs — job nền / cron / queue

- Vai trò:
  - Job nền / cron / queue / scheduled task.
  - Write-gate / advisory lock chống ghi DB đồng thời giữa daemon và CLI nằm ở đây — cơ chế điều phối ghi đi cùng scheduler.
