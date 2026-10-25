---
id: Slot_133
aka: 03-133
name: 02_processing
version: 5
path: data/<case>/02_processing/
---
# Data_133_02Processing 02_processing — pipeline intermediates

- Role: Intermediates a pipeline produces (`.csv` extract · drafts · `_state.json`) — deleted and run again, they must be rebuilt; nobody outside sees them.
- Naming: Intermediate files keep the stage number prefix (`01_pull_*.csv`).
