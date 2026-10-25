---
id: Slot_147
name: software
version: 5
path: Software/
scope: layout
---
# Software_147_Software software — every program of the machine

## Role

`<data root>\Software\` is step 6 of the drive's question chain (`Struc_Disk_Data`): a program — its installer, its installed copy,
its own data — games, launchers and game tools included, and a program's output buffer. It is the ONLY place for programs: a new
machine rebuilds every program by walking this tree.

```
Software\
└── <Group>\                       one of the fifteen groups of Software_148 (AI · Dev · Game · Office …)
    └── [<Vendor>\]<App>\          one program: only Setup\ · App\ · Data\, each when it holds something (Software_149)
```

Real examples: `D:\Software\Dev\Microsoft\VSCode\{Setup, App, Data}` · `D:\Software\Game\Steam\{Setup, App, Data}` (the game library
is the launcher's `Data\`).

## Rules

- Every program whose installer lets the owner choose a place installs into `Software\<Group>\[<Vendor>\]<App>\App\`.
- A program forced onto the system drive still has its folder here, its installer in `Setup\` (`Software_149_Program`,
  exception 1).
- The `Software\` level holds only the groups of `Software_148_Group`: no program straight here, no loose file, no repo, no papers.
- One exception, by the block law of `Struc_Disk_Data`: a vendor's kit that its programs in SEVERAL groups share (a licence
  service, a keygen, a patch for every program of the vendor) sits beside the groups in `Software\_<Vendor>\`, e.g.
  `Software\_Autodesk\` for what AutoCAD (`CAD\`) and Maya (`3D\`) both use. It holds only that shared kit, never a program.
  A kit shared inside ONE group stays in that group: `<Group>\<Vendor>\_Setup\` (Software_148).
- A program found anywhere else (inside `Documents\`, `Study\`, `Game\`) moves here (Law 2 of `Struc_Disk_Data`).

## Sync

Not in git, not synced: an installed copy belongs to one machine, an installer can be downloaded again.

## Check

`zemory conform --layout <data root>`: a group outside Software_148 (`unknown-value`) · an item in a program folder outside
its three parts (`program-stray`) · a repo inside `Software\` (`repo-outside-workspace`).
