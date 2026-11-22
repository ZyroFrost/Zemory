---
id: Slot_77
aka: 03-77
name: external
version: 4
path: external/
from: _Store/02_STRUCTURE/_Slot/External_077_External @v4 #ea297db655aa
---
# External_077_External external — outside code cloned for reference

- Role:
  - Repos / OUTSIDE CODE cloned in FOR REFERENCE — their code (non-app: an old system's ETL · another department's scripts · someone else's model): read / call / extend only.
  - One of the 6 kinds of non-code (external = outside code). Not `integrations/` (clients calling outside services).
  - Whatever has no home moves into someone else's: outside code must have its home here, even when it looks like a pipeline.
- May hold / may not hold: Never pasted into `backend`, never pushed into `pipelines/` or `scripts/`, never edited into our own.
- Naming: File/folder names that are not ours (vendor code) are left alone — the ASCII English naming rule does not apply.
