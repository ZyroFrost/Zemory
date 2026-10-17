---
id: Slot_28
aka: 03-28
name: jobs
version: 4
path: backend/src/jobs/
from: _Store/02_STRUCTURE/_Slot/Backend_028_Jobs @v4 #732058947af1
---
# Backend_028_Jobs jobs — job nền / cron / queue

- Vai trò:
  - Job nền / cron / queue / scheduled task.
  - Write-gate / advisory lock chống ghi DB đồng thời giữa daemon và CLI nằm ở đây — cơ chế điều phối ghi đi cùng scheduler.
