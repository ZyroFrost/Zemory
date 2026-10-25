---
id: Slot_81
aka: 03-81
name: share
version: 4
path: share/
---
# Share_081_Share share — encrypted cross-machine sync bundles

- Role:
  - ENCRYPTED SYNC bundles across machines: git-lfs `*.enc` + key + README. TRACKED (already encrypted).
  - APP repo: only an app that DOES sync through git. NON-APP repo: only when heavy files must be shared across machines — through an encrypted bundle, never plaintext in git.
  - A Drive-synced folder takes `.enc` bundles only, never a live DB.
