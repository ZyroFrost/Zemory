---
id: Slot_121
aka: 03-121
name: measures
version: 6
path: measures/
from: _Store/02_STRUCTURE/_Slot/Measures_121_Measures @v6 #54f58e50e4c8
---
# Measures_121_Measures measures — the library of named measures

- Role:
  - The library of named DAX / calculations with notes — pulled out for review / reuse. Shared by several cases.
  - Must compute exactly as defined in the constitution frame `Cons_Gate_12_SourceOfTruth` (section Definitions) and as the repo's own skill `Skill_Own_<Name>` computes it; a real formula that differs from the description ⇒ REPORT it, never fix either side on your own.
- Naming: The name is `measures/` — not `dax` or `calc`.
