---
id: Slot_28
aka: 03-28
name: jobs
version: 3
path: backend/src/jobs/
from: _Store/03_STRUCTURE/_Struc_Slot/Slot_Backend_028_Jobs @v3 #365835ce0344
---
# Slot_Backend_028_Jobs jobs — job nền / cron / queue

- Vai trò:
  - Job nền / cron / queue / scheduled task.
  - Write-gate / advisory lock chống ghi DB đồng thời giữa daemon và CLI nằm ở đây — cơ chế điều phối ghi đi cùng scheduler.
