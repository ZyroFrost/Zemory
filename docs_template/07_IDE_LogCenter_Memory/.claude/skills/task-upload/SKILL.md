---
id: Skill_Task_Upload
aka: upload
name: task-upload
version: 11
type: process
installs: [scripts/smtp_mail.py, scripts/graph_mail.py]
description: Publish a finished deliverable to its destination (BI workspace, Drive, SharePoint, shared folder). Use when the deliverable is complete and needs to go out, or when asked to publish, push, send, or upload the report. Vietnamese triggers - "đẩy lên", "publish", "up báo cáo", "đưa lên workspace", "gửi bản cuối", "đăng lên".
from: _Store/03_SKILLS/Skill_Task_Upload @v11 #602215e18dfb
---

# upload — push / publish a deliverable to its destination

> Trigger: the deliverable is finished → send it to its destination (BI workspace · Drive · SharePoint · shared folder).
> See `Scripts_128_Scripts` — PULL / FILL / UPLOAD files.
>
> ⚠️ This action is **hard to undo**. Pushing over the copy in use is like `git push` — it needs clear
> approval when the destination is a real/production environment.

## Procedure

1. **CONFIRM THE DESTINATION AND SCOPE BEFORE PUSHING.** State clearly: which file, to where, over what. Wait for a yes.
2. **Keep the current copy in `attic/`** before overwriting — so it can be rolled back (the mirror of an app's
   "two-way deploy backup").
3. Run the publish script in **`scripts/`** (pbi-tools / PowerShell / API). The destination and credentials come from
   **`config/`** or `.env`, **NEVER hardcoded**.
4. **Verify at the destination**: open the copy just pushed, check a few anchor numbers. Pushed but not opened and looked at is not
   done yet.
5. **Record the publish** in `05_CHANGES.md` — once approved.

## Forbidden

- Pushing before the destination is confirmed.
- Overwriting the copy in use without a backup in `attic/`.
- Taking "write the changelog" or "done" as approval to publish. **Recording ≠ publishing.**
