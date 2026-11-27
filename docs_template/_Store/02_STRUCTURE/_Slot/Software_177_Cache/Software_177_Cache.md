---
id: Slot_177
name: cache
version: 1
path: Software/Cache/<tool>/
scope: layout
checked: [Software_147_Software, Software_148_Group, Software_149_Program, Data_096_Cache]
---
# Software_177_Cache cache — the cache many tools share in the account's `.cache` folder

## Role

`<data root>\Software\Cache\` holds what tools write into the account's `.cache` folder (`%USERPROFILE%\.cache` on Windows,
`~/.cache` on Linux) when they give the owner no choice of place: browser-automation runtimes, agent CLIs, dataset and plot
caches, downloaders. The system drive stays small; the cache lives on the data drive, one folder per tool, and can be emptied
at any time without losing work.

## Why a slot of its own

- `Software_148_Group`: its fifteen groups hold programs; a cache is no program and belongs to no single group.
- `Software_149_Program`: a program's own `Data\` holds a cache the program lets the owner place; these tools write to the
  account's `.cache` folder and give no choice, and several of them have no program folder at all (a CLI run by `npx`).
- `Software_147_Software`: its `_<Vendor>\` exception holds a kit one vendor's programs share, not files many vendors' tools write.
- `Data_096_Cache`: the cache of one repo inside that repo; this cache belongs to the machine's account, not to a repo.

## Inside

```
Software\Cache\
├── chrome-devtools-mcp\
├── codex-runtimes\
├── kagglehub\
├── matplotlib\
└── yt-dlp\
```

`%USERPROFILE%\.cache` is a junction to `<data root>\Software\Cache\`, so every tool keeps writing to its usual path.

## Steps — moving the cache onto the data drive

1. Close the tools that write to the cache.
2. Copy `%USERPROFILE%\.cache\` into `<data root>\Software\Cache\` and compare file count and total size.
3. Remove the old folder only once both match, then create the junction:
   `mklink /J "%USERPROFILE%\.cache" "<data root>\Software\Cache"`.
4. Open one tool and check that it writes into `Software\Cache\<tool>\`.

## Rules

- `Cache\` sits beside the groups of `Software_148_Group`; it is not a group and holds no program.
- One folder per tool, named as the tool names it.
- A program that lets the owner choose where its cache goes keeps it in its own `Data\` (`Software_149_Program`), not here.
- Nothing here is the only copy of anything: settings and keys live in `_ConfigVault\`, models in `_Models\`.

## Naming

The folder names the tools write themselves (`kagglehub`, `yt-dlp`); never renamed.

## Sync

Not in git, not synced: a cache belongs to one machine and is rebuilt by the tool that wrote it.

## Check

`zemory conform --layout <data root>` accepts `Software\Cache\` beside the groups (this slot's path); any other folder
beside the groups that is not a group or a `_<Vendor>\` kit stays red (`unknown-value`).
