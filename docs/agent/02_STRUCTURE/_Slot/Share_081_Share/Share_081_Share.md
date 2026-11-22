---
id: Slot_81
aka: 03-81
name: share
version: 4
path: share/
from: _Store/02_STRUCTURE/_Slot/Share_081_Share @v4 #7f55c22ae10b
---
# Share_081_Share share — encrypted cross-machine sync bundles

- Role:
  - ENCRYPTED SYNC bundles across machines: git-lfs `*.enc` + key + README. TRACKED (already encrypted).
  - APP repo: only an app that DOES sync through git. NON-APP repo: only when heavy files must be shared across machines — through an encrypted bundle, never plaintext in git.
  - A Drive-synced folder takes `.enc` bundles only, never a live DB.
