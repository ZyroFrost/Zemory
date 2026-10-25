---
id: Skill_Harness_Conform
aka: conform
name: harness-conform
version: 12
type: process
description: Measure how closely the project folder follows the declared standard - machine scores, agent judges. Run before closing a session, after restructuring, when taking over an unfamiliar folder, or periodically. Not needed after every small edit. Vietnamese triggers - "soi chuẩn", "kiểm chuẩn", "có đúng chuẩn không", "check cấu trúc", "dự án này có bám chuẩn không".
from: _Store/03_SKILLS/Skill_Harness_Conform @v12 #7d4df96ba1f2
---

# conform — measuring how closely the repo follows the standard

> Trigger: before **closing a session** · after **reshaping structure / adding a slot** · on taking over an **unfamiliar repo**
> · periodically. Not needed after every small code edit.
>
> **The machine scores first, the agent judges after.** The machine only knows "this folder matches no slot"; **only the agent
> knows which slot it *should* go to, or whether it is a real concern the standard needs to add**.

**Principle:** the derived
layer (graph · index · taxonomy) is built by the MACHINE, deterministically. **The agent NEVER writes into the derived layer** — to have
something in it, DECLARE it in the standard or change the SOURCE (docs · code) and let the machine rebuild. The agent is the one who **CHECKS**,
not the one who generates.

**Why not inspect by eye, and why not load the whole graph into context:** reading the whole folder tree and comparing by hand
**burns context** — dozens of times the cost of the drift table, and still misses things. Measured: the graph payload of a
medium repo ≈ **56,000 tokens**, only ~4.8× cheaper than reading the whole repo. Loading it periodically burns quota. The machine scores
first, the agent reads only the **drift table** (~a few hundred tokens).

**Procedure:**
1. **Run the scorer** → the drift table.
   - With the `zemory` CLI: `zemory conform`. `--json` for machines, `--gate` for CI (exit 1 when there is a
     `blocking` item).
   - A set without the CLI: `python .claude/skills/harness-structure/scripts/check_structure.py .` — exit `0` =
     nothing to fix · exit `1` = at least one item.
2. **Read each item by level:** `blocking` / `MUST FIX` = really off-standard, must be dealt with · `advisory` /
   `review` = worth a look, the machine cannot judge, **the agent decides**.
3. **Judge the MEANING the machine cannot understand** — a folder that "matches no slot" has three possibilities:
   in the wrong place · a REAL concern the standard has not declared · junk to delete.
4. **Fix the SOURCE**, never the derived layer / the report:
   - wrong place → `git mv` to the right slot (keeping history) + fix imports; many to move → propose it through
     the `reconcile` skill
   - a REAL concern not declared → **propose a new slot to HS** (`<Area>_<NNN>_<Name>` in `02_STRUCTURE/_Slot/`, the next number) — this is **changing the standard**:
     search the existing slots first (`Rule_Gate_85_ProposeChecked`), send the proposal to the zemory session (`Rule_Gate_83_HarnessFromStore`)
   - an empty folder / junk → **propose deleting it, wait for confirmation** before deleting, never on your own
   - never edit the scoring script to make it stop crying
5. **Run** the scorer **again** → confirm the drift is gone. Fixed → `05_CHANGES`; what is still off → **report it, ask before
   writing it into `04_TODO`** (`Rule_Gate_38_TodoDoor`).

**The boundary with `zemory validate`:** `validate` asks *"is the harness doc set in the right shape"* (links,
changelog length, folder layers). `conform` asks *"do code + docs + folders follow the DECLARED standard"*. Two different
jobs — never merged, never a substitute for each other.

**Forbidden:**
- Adding nodes/edges "to be complete"; adding a slot to the standard "to be complete" while no real file belongs
  to it.
- Taking the report as truth without opening the real file / code to compare.
- Deleting a folder/file just because the report says so, without asking.

## Implements · Thi hành luật
- `Rule_Gate_86_LawLayersAgree` — the check that finds broken links and contradictions between layers · phép kiểm tìm liên kết gãy và mâu thuẫn giữa các tầng
