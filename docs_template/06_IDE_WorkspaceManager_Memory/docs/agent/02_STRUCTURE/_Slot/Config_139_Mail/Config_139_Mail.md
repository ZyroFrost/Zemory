---
id: Slot_139
name: mail
version: 3
path: config/mail/
checked: [Config_075_Config, Data_102_Secrets, Backend_020_Notifications]
from: _Store/02_STRUCTURE/_Slot/Config_139_Mail @v3 #4efc87dd3502
---
# Config_139_Mail mail — the group's shared mail set: contacts, senders, sending keys

- Role: ONE mail set for every repo of the group, only in the workspace manager template (`Struc_Repo_WorkspaceManager`). A department repo reads it
  here when it sends mail, keeping no contact list of its own.
  - `mail_vault.json` — the contact list: `senders[]` (sending mailbox · key NAME) · `groups[]` (recipient groups) · `stores[]` (the address of each receiving
    point, if any). Holds no password. Contact data ⇒ outside git.
  - Sending keys (`SMTP_*`): their place is `data/secrets/` (one place for secrets); keep `config/mail/mail.env` only when the sync channel cannot carry
    `data/secrets/` to the machine that runs the task, and then declare the exception in the frame `Cons_Gate_14_Access`.
  - `README.md` · `mail_vault.example.json` · `mail.env.example` — templates, in git.
- Adding or changing a recipient ⇒ the department messages the manager's session; the manager's agent edits the contact list.
- Not `Config_075_Config` (config the operator edits, in every repo): the mail set has rules of its own — only the manager template
  has it (`config/mail/` in another repo is in the wrong place), the contact list is contact data outside git, the sending keys follow the secrets law, other
  repos change it only through the manager's session.
- Not here: the content of a mail (subject, body) — it belongs to the task of the department that owns it, in `tasks/<case>/`.
