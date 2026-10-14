---
id: 03-28
name: jobs
version: 1
path: backend/src/jobs/
applies: [App]
---
# 03-28 jobs — job nền / cron / queue

- Vai trò:
  - Job nền / cron / queue / scheduled task.
  - Write-gate / advisory lock chống ghi DB đồng thời giữa daemon và CLI nằm ở đây — cơ chế điều phối ghi đi cùng scheduler.
