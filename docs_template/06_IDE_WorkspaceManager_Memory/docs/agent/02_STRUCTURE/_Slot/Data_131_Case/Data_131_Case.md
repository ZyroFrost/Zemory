---
id: Slot_131
aka: 03-131
name: case
version: 6
path: data/<case>/
from: _Store/02_STRUCTURE/_Slot/Data_131_Case @v6 #050070917541
---
# Data_131_Case case — the working data of one case

- Role:
  - The working data of each case, gitignored.
  - Sort a file in this order, the first true answer wins: ① has this repo itself sent it or pushed it to its target? ⇒ `03_output` · ② received from
    outside and not sent back by this repo (files a predecessor sent included) ⇒ `01_raw` · ③ produced by a pipeline, seen by nobody outside ⇒
    `02_processing`. "Can it be rebuilt if deleted" is not the test: a sent copy that can be rebuilt is still `03_output`.
  - A stage folder is created when its first file arrives, never before (`Struc_Disk_Data` §Rules: a folder exists only when it holds something —
    `data/` being outside git does not change it). A file with nowhere to go yet is sorted by the order above at the moment it lands, so nothing
    is dropped at random.
  - Kept apart from `tasks/<case>/` on purpose (heavy files).
- May hold / may not hold: ONLY THE 3 STAGES, each when it has a file: `01_raw/` · `02_processing/` · `03_output/`.
- Naming: Mirrors the EXACT NAME of `tasks/<case>/`.
