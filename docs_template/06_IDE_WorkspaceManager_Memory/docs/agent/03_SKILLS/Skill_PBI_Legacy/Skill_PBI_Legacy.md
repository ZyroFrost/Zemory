---
id: Skill_PBI_Legacy
name: pbi-legacy
version: 5
type: process
description: Handle the LEGACY copy of a Power BI report - the old system's original file, kept to READ and COMPARE, never edited: dissect a .pbix, convert it to .pbip on a copy, prove a rebuild by md5. Use whenever an old .pbix must be read for its design, measures or sources, or a rebuild must be compared with the original. Not for building a report (that is pbi-classic / pbi-white / pbi-red). Vietnamese triggers - "mổ file cũ", "đọc pbix hệ cũ", "chuyển pbix sang pbip", "so với bản gốc".
from: _Store/03_SKILLS/Skill_PBI_Legacy @v5 #cdd953ad0aca
---

# The `Legacy` kind — the old system's original file, READ ONLY

> 🔴 **`Legacy` = old system + old design, the copy nobody has touched** (`Skill_PBI_Base` `reference/naming.md`).
> It exists for exactly one reason: **it is the ONLY reference point** proving a `Classic`/`White` copy has not drifted in
> design and has not drifted in numbers. Editing it loses the reference, and a lost reference cannot be got back.

## 1. Hard rules — three

1. 🔴 **Do NOT edit, do NOT save over it, do NOT open it in Desktop and press Save.** Desktop **writes the file back** on
   Save, even when you meant to change nothing (see §4).
2. 🔴 **Do NOT open a file sitting on OneDrive directly.** Desktop writes → OneDrive syncs that write into the
   handover folder ⇒ **the old system's reference copy is lost, irreversibly**. Copy it into the repo first, then open it.
3. 🔴 **The acceptance of this kind is an `md5` matching the original.** There is no other measurement.

## 2. Where the file sits

```
reports/<DEPT CODE>_<Name>_Legacy_<Tier>/
   <Name>.pbix        <- the original, md5 must match the mirror
   <Name>.pbip + .Report/ + .SemanticModel/   <- the converted copy, for READING
```

Keeping both `.pbix` and `.pbip` here is **on purpose**: the `.pbip` copy is what gets `diff`ed against the `Classic` copy
to prove the design has not drifted. `.pbix` is heavy ⇒ by `Rule_Gate_21_WhatEntersGit` it goes through **Git LFS**.

## 3. Converting `.pbix` → `.pbip` — the ONLY way that works

Work on **a copy**, never touch the original.

```
1. CLOSE EVERY open Desktop session    <- this step decides success or failure
2. open exactly the file to convert
3. A REAL MOUSE CLICK: File -> Save as -> Browse this device
```

⚠ **UIA is useless in the backstage — do not try again.** `FindAll` on the Desktop window returns only 6 panes
`ms-pbi…/reportView.html`; the backstage is embedded HTML so the UIA tree sees no button.
The way that works: coordinates taken from a `PrintWindow` image plus `GetWindowRect`, then `mouse_event`.

📌 **An old version of the ledger once wrote *"the agent CANNOT do it, tried 5 rounds by 3 ways"*.** That measurement was right **at
that moment** — while the machine had a second Desktop session of another repo fighting for the foreground. Closing everything first
gives **full PBIR**. Meeting a "cannot be done" in a ledger, check the conditions again before believing it.

## 4. Reading `.pbix` WITHOUT opening Desktop — prefer this way

```python
import zipfile, json
z = zipfile.ZipFile(r"<path>\<file>.pbix")
lay = json.loads(z.read('Report/Layout').decode('utf-16-le'))   # usually utf-16-le
for s in sorted(lay['sections'], key=lambda x: x.get('ordinal', 0)):
    cfg = json.loads(s.get('config', '{}'))
    print(s['displayName'], len(s.get('visualContainers', [])),
          'hidden' if cfg.get('visibility') == 1 else '')
```

- A hidden page carries `config.visibility == 1` — **do not count it in the official page list**.
- Each visual: `json.loads(v['config'])` → `name` · `parentGroupName` · `singleVisual` /
  `singleVisualGroup`. Coordinates sit **directly on `v`** (`x`·`y`·`width`·`height`), not in `config`.
- 🔴 **This is a schema DIFFERENT from PBIR.** `.pbix` uses `singleVisual` + `vcObjects`; PBIR uses
  `visual.visualType` + `visualContainerObjects`. **Do not convert by hand between the two** — for a PBIR mould
  copy from a PBIR visual that renders.
- ⚠ **The `DataModel` part CANNOT be read** — XPress9 compression, no standard library decodes it. DAX/measures
  **must** go through `.pbip` (§3). This is exactly why the standard requires new builds in `.pbip`.

## 5. Traps when searching an old system's folders

- ⚠ **`LastWriteTime` does NOT say which copy is newest.** A whole batch of files often carries the same timestamp — the trace of a bulk
  copy. To know which copy is live, compare **the refresh date on the Service**.
- ⚠ **Very many copies with the same name** (`- Copy`, `_BK`, `_TEST`, `1`, `- RLS`). Measured on a real folder: 12
  dashboards but **19 same-name copies**, one model alone has 6 copies weighing 438–783 MB.
  **Settle the live copy BEFORE dissecting** — dissecting the wrong one is rebuilding from dead logic.
- ⚠ **Cloud-only files**: opening a file makes OneDrive pull it down. A folder of 113 `.pbix` with 100 still
  placeholders ⇒ opening at random hydrates several GB.
- ⚠ **Old system file names hold character traps**: en dash `–` U+2013 (looks exactly like `-`), Vietnamese diacritics, `(%)`,
  and **spaces**. A guard once broke because a file name had a space — quote paths.

## 6. Acceptance

```
md5(<Name>.pbix) == md5(the original on the mirror)      -> REQUIRED, no exception
git status on the Legacy folder                    -> empty, apart from the first copy
```

To prove a `Classic`/`White` copy has not drifted in design: `diff` that copy's `definition/` folder with the
`Legacy` copy converted to `.pbip`. Right after the split it must give **0 differences**.
