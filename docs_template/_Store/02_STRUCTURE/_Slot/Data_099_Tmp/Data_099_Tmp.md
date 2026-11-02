---
id: Slot_99
aka: 03-99
name: tmp
version: 6
path: data/tmp/
---
# Data_099_Tmp tmp — temporary files

## Role

`data/tmp/` holds what the repo's own code makes for a moment and throws away: a run's scratch files, a download being
unpacked, and the temp folders of the repo's tests. A test's temp folder belongs to the repo it tests, never to the machine's
system TEMP (on Windows that is drive C:, and a long account name turns it into an 8.3 short path that breaks path round trips).

## Inside

```
data/tmp/
├── <tool>-<purpose>/      a run's scratch folder, removed by the code that made it (finally / after)
└── <runner>-test/run-*/   one folder per test run: TEMP, TMP and TMPDIR of every test point here
```

## Rules

- Nothing here is kept: the code that writes a folder removes it when it ends, even on error; a runner sweeps run folders it
  left behind (older than a run can last) before it starts.
- Never in git: `data/` is ignored at the repo root (`/data/`).
- A test run in here must keep its fixtures out of the repo around it: the runner sets `GIT_CEILING_DIRECTORIES` and the
  harness ceiling (`ZEMORY_PROJECT_CEILING`) to the run folder, so a fixture project never climbs into the repo's own marker
  or `.git`.
- Not a cache: what is rebuilt and reused goes to `data/cache/` (Data_096_Cache).

## Check

A test run leaves `data/tmp/<runner>-test/` with no run folder older than its sweep age.
