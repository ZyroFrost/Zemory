---
id: Skill_Harness_SyncPath
aka: sync-path
name: harness-sync-path
version: 14
type: process
description: Declare and PROVE how every new artifact reaches a second machine - code, data layer, derived index, secret, model, config. Run before calling any build "done", when adding a new storage or index layer, when handing a repo to another PC, or when something works on one machine but not the other. Vietnamese triggers - "đồng bộ 2 máy", "máy thứ hai", "bàn giao máy mới", "pull về máy kia", "kẹt giữa 2 máy", "sync đa máy", "máy kia chạy được chưa".
from: _Store/03_SKILLS/Skill_Harness_SyncPath @v14 #cc01e8a9abd4
---

# sync-path — everything produced must have a PATH to another machine, and it must be MEASURED

> Trigger: **before calling a piece of work DONE** · when adding **a new storage / index / secret / model
> layer** · when **handing a repo to another machine** · when "it runs on this machine, not on the other".

**The problem this skill exists to block:** something new gets built on ONE machine and only then turns out
to have no path to the second — and each time it is searched for again, each time a different detour. That is *hunt then
fix*, not a fixed path. The price was paid for real: **43 hours + 12–16 hours** of machine time building an index layer
(vectors), and only then it showed the default sync package **does not carry that layer**; and the handover package export
**does not find the key by itself** while the key sits right beside the data store.

## 1. The rule: NO channel = NOT DONE

Everything that exists after a build must belong to **exactly one** channel below. Fits no cell ⇒
the work is not done, even if the code runs.

| channel | used for | constraint |
|---|---|---|
| **git** | source code · docs · templates · hooks · default config | **no data/secret of any kind** (`Rule_Gate_21_WhatEntersGit`) |
| **encrypted package** (e.g. `.enc`) | the real data store | never through git; never keep the LIVE data store inside a cloud-synced folder |
| **carried by hand** | keys · passwords | not git, not the cloud, never printed on screen |
| **rebuilt on the target machine** | cheap derived layers · build output (`dist/`) · cache | must state the **build command** and the **cost** (how long) |
| **downloaded at run time** | model weights · heavy assets | not committed — remember it may be needed at USE/QUERY time too, not only at build time |

## 2. Three required questions — answered by MEASURING, not from memory

Before treating something as done:

1. **Which channel does it travel?** Place it in the §1 table. If it is "rebuilt on the target machine", **how many hours does it cost**?
   A high cost (many machine hours) ⇒ it is NOT something rebuilt, it is something that must be CARRIED.
2. **Does that channel really carry it?** *Read the code of the carrying path*, do not infer from a flag name. The right question
   is **which tables/files the RECEIVER reads** — the sender packing everything while the receiver reads only part means the rest
   **is thrown away silently**.
3. **Does the target machine run at once?** List everything it needs; ONE missing is a shortfall. For a repo with a data
   store, at least: **code · data+index · key · model**.

## 3. MEASURE — a closed loop, never trust "a file means usable"

"Written to a file" is **not** evidence. The evidence is **decrypting/restoring into a TEMP PLACE and counting
again** — exactly what the other machine will receive:

```
# 1. export by exactly the command written in the documentation (NO hand-added flags)
# 2. import the fresh export into a TEMP path (never pointing at the real data store)
# 3. open the temp copy and COUNT: the integrity check (e.g. quick_check) · record counts (e.g. messages · sessions)
#    · each index layer (e.g. vector count · FTS) · the index configuration
```

The count must cover **the derived layers too**, because they are exactly the layers that get dropped. One total figure ("2 GB") says
nothing — it stays true when most of the size (measured: 87%) is what the receiver will throw away.

**And one more step, the easiest to forget: HAS IT LEFT THE MACHINE?** "Written into the sync folder" is **not**
"in the cloud". A cloud folder is a **lazy surface**: write into it and the file shows at once, while pushing it out
sits in the client's queue — when that queue sticks everything **looks exactly done**. Ask the client itself
(its ledger/queue/log) whether the item has been given a **server-side id**, and whether the server-side size
**matches the local copy**.

*The price was paid for real:* a handover package sat still in the sync folder, **two 317 MB packages stuck for 3 days** with
nobody knowing — while the sync command reported "exported" successfully every time. Exactly the failure that
`Rule_Keys_22_FailLoud` calls **an empty shell: it does not report an error, it lies**.

## 4. Traps already paid for — read before feeling confident

- **Two paths with nearly the same name, completely different behaviour.** *Merging in* (merge) may take only the SOURCE tables;
  only *replacing whole* (import/restore) carries the derived layers. Sending the right package while telling the other side to run the wrong
  command still loses it.
- **Each entry point finds the key its own way.** One command finds it by itself, the other needs it passed by hand ⇒ a person following
  the documentation still fails. **Every entry point of the same path must find it the same way.**
- **Naming by an old-generation suffix.** The reader switches to a new format while the counting spot still matches the old suffix ⇒
  it reports "0 packages" forever though the packages are real.
- **Unanchored gitignore patterns.** A bare pattern matches EVERY depth, and once swallowed the data folder of a vendored
  library ⇒ everyone cloning got a gutted copy. Anchor at the root (`/data/`, not `data/`).
- **Model weights / heavy binaries**: never committed (they once choked a push by exceeding GitHub's 100 MB limit),
  but STATE CLEARLY that the target machine downloads them itself — and that without them the layer depending on them **silently**
  falls back to a lower level (e.g. the semantic layer falls back to word search).

## 5. Let the machine watch, do not lean on memory

A skill is words, and words get forgotten — what BLOCKS drift is **code** (`Rule_Gate_79_HarnessEdit`: a law that cannot be undone must have a machine check). A repo must have
gates for at least two things, and **run them instead of remembering**:

- a gate blocking **data/secrets leaking into git** — with a NEGATIVE case: one exception opening a way for a data package is enough to break it;
- a gate watching that **every entry point of the sync path finds the key the same way**.

Adding a new storage/index layer **without** being able to add a gate watching its channel ⇒ write it straight into
`04_TODO` as **a debt**, do not let it become something the next session has to hunt for again.

## 6. Secrets and config to another machine (`Rule_Gate_21_WhatEntersGit`)

- A tracked file only points to the NAME of an environment variable (`password_env: DB_SOURCE_PASSWORD`); with a `.env.example` listing every name, no
  values.
- The real values sit in `.env` / `*.local.*` or the secret slot, blocked by `.gitignore`; they reach another machine through the sync channel, not through
  git, even when encrypted.
- Measured on the receiving machine: every variable name present, the values readable, the work needing that secret runs.

## Implements · Thi hành luật
- `Rule_Gate_01_DoneMeansRun` — the path to a second machine, measured at the receiving end · đường sang máy thứ hai, đo ở đầu nhận
- `Rule_Gate_21_WhatEntersGit` — secrets travel by the sync channel, never by git · bí mật đi qua kênh đồng bộ, không qua git
