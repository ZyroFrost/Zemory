---
version: 5
lang: vi
---
# Backend_028_Jobs jobs — job nền / cron / queue

- Vai trò:
  - Job nền / cron / queue / scheduled task.
  - Write-gate / advisory lock chống ghi DB đồng thời giữa daemon và CLI nằm ở đây — cơ chế điều phối ghi đi cùng scheduler.
