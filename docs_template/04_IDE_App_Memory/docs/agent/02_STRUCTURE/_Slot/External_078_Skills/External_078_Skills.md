---
id: Slot_78
aka: 03-78
name: skills
version: 6
path: external/skills/
from: _Store/02_STRUCTURE/_Slot/External_078_Skills @v6 #02126ac2da80
---
# External_078_Skills skills — the vendored skill store

- Role:
  - The STORE of other people's vendored SKILLS, kept as the originals.
  - Indexed in `03_SKILLS`; where adapting really shows is the UI design slot dictionary of `02_STRUCTURE`: the agent reads the original directly for aesthetic ideas, then maps them onto the design slots.
  - Read on demand; never copied into each project.
- May hold / may not hold: Cloned as is: drop `.git`, KEEP `LICENSE`, never edit the content.
- Naming: One skill = one folder with EXACTLY THE ORIGINAL REPO'S NAME: `external/skills/<repo-name>/`.
