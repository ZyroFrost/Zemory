---
id: Slot_128
aka: 03-128
name: scripts
version: 5
path: scripts/
---
# Scripts_128_Scripts scripts — tự động hoá kéo / điền / upload

- Vai trò:
  - TỰ ĐỘNG HOÁ: kéo (pull) · điền (fill) · publish/upload — script THIN, agent gọi. Dùng chung nhiều case. Publish/refresh tự động hoá ở đây, bản render ra `exports/`.
  - AGENT là thứ làm ba động tác; zemory chỉ nhớ + kỷ luật (index việc/task đã làm vào Global Memory), không tự gọi LLM, không tự đi kéo file. Mỗi động tác = script thin ở đây + playbook ở `.claude/skills/task-pull/` · `fill/` · `upload/` (đăng ký `04_SKILLS`) — playbook giữ recipe cụ thể: kéo nguồn nào, điền template nào, đẩy đi đâu.
  - KÉO: đọc `sources/` → raw về `data/extract/`; credential lấy từ `.env`/`config/`, không bao giờ nhập password vào zemory (nguồn web: mượn phiên login trên trang thật). ĐIỀN: `templates/` + số từ `data/`/`measures/` → `reports/` hoặc `exports/`. UP: đẩy deliverable/exports lên đích (workspace BI · Drive · SharePoint) qua `scripts/` hoặc stage upload của pipeline.
  - Mọi động tác tự động phải ghi lại được (task / lần chạy → `06_CHANGES`/`05_TODO`).
  - Gốc repo sạch: script → `scripts/`.
- Được chứa / không chứa: Không chứa: code ngoài clone về (→ `external/`) · script của riêng một case (→ `tasks/<case>/pipeline/`).
