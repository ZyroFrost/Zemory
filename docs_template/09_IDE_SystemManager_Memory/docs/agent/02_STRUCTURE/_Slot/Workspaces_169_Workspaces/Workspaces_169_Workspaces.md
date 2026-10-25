---
id: Slot_169
name: workspaces
version: 2
path: workspaces/
checked: [Data_094_Data]
from: _Store/02_STRUCTURE/_Slot/Workspaces_169_Workspaces @v2 #d2dae19fde70
---
# Workspaces_169_Workspaces workspaces — the output an app produces

## Role

`workspaces/` at the root of an APP repo holds the OUTPUT the app produces for its owner: one folder per unit of output (a channel,
a project, a client), each holding what the app made for it. An app keeps its output inside its own repo, never in a store outside
it, so the app and what it produced move, back up and get found together.

## Inside

```
workspaces/
├── <unit>/            one unit of output: a channel, a project
│   └── <item>/        one item the app made for it (a song, a render)
└── _<shared>/         items the units share (a `_` name): tracks, profiles, effects
```

Real example: `workspaces/my-channel/2025-10-20 Song Title/` · `workspaces/_tracks/` · `workspaces/_profile/`.

## Rules

- AI-made items follow the same order as any item (`Struc_Disk_Data`, "Made by AI"); to keep them apart here, add the optional
  sub-folder `AI\` inside a unit's folder (images the app renders stay in the app's `workspaces/`, never in `Media\`).
- Gitignored: the output is data, not code. Large: it may live on a second drive and be linked back (Struc_Disk_Data).
- Secrets the app needs are not here ⇒ `.env` or `data/secrets/`.

## Not here ⇒ goes to — the line with `data/` (Data_094)

`data/` holds what the app needs to RUN (state, cache, settings, logs, its database); `workspaces/` holds what the app PRODUCES for
its owner. The fact that splits them: deleting `data/` resets the app; deleting `workspaces/` loses the owner's work.

## Check

No machine check yet.
