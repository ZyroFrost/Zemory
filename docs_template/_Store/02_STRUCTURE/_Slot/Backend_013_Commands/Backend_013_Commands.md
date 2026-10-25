---
id: Slot_13
aka: 03-13
name: commands
version: 5
path: backend/src/commands/
---
# Backend_013_Commands commands — CLI commands

- Role:
  - CLI commands, when the app is a CLI.
  - A thin surface for the CLI: only wires into the domain, holds no business logic.
- May hold / may not hold: Not here: business logic.
- Naming: One file per verb.
