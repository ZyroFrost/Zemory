---
id: Slot_132
aka: 03-132
name: 01_raw
version: 6
path: data/<case>/01_raw/
from: _Store/02_STRUCTURE/_Slot/Data_132_01Raw @v6 #cbec131d1d46
---
# Data_132_01Raw 01_raw — input from outside, read only

- Role: INPUT from outside (a sender · pulled from a source) for one case — cannot be rebuilt if deleted.
- May hold / may not hold: READ ONLY, never overwritten (`Rule_Gate_10_DestructiveOps`); cleaning happens on a copy in `02_processing/`.
- The three stages of a case have three lifecycles: `01_raw` cannot be undone · `02_processing` is deleted freely and rebuilt · `03_output` is kept for checking.
- Machine lock: declare the glob `data/*/01_raw` in the marker's `protected` key (one glob covers every case, new ones included).
