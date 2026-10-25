---
id: Slot_148
name: group
version: 5
path: Software/<Nhóm>/
values: [AI, 3D, CAD, Image_2D, Video, Screen_Record, Audio, Office, Dev, Network, System, Utility, Game, Drivers, Fonts]
scope: layout
---
# Software_148_Group group — the group of a program

## Role

The second level of `Software\`: programs grouped by WHAT THEY DO, so a program is found at a glance and a machine is rebuilt group
by group. Every program is in exactly one group; each program is a folder shaped by `Software_149_Program`.

## The question of this level — fifteen groups, a fixed list

| group | programs that | examples |
|---|---|---|
| `AI` | assist with AI, chat with models, run models locally, agents and model CLIs | `Claude` · `LMStudio` · `Ollama` · `ComfyUI` |
| `3D` | model, render, sculpt in 3D | `Blender` · `Maya` · `ZBrush` |
| `CAD` | technical drawing, mechanical and architectural design | `AutoCAD` · `SolidWorks` · `SketchUp` |
| `Image_2D` | edit photos, draw, 2D graphic design | `Photoshop` · `Krita` · `Figma` |
| `Video` | edit and convert video, effects | `Premiere` · `DaVinciResolve` · `HandBrake` |
| `Screen_Record` | record or capture the screen, stream | `OBS` · `ShareX` · `Bandicam` |
| `Audio` | record, edit, play sound | `Audacity` · `FLStudio` · `Spotify` |
| `Office` | office documents, spreadsheets, slides, BI, PDF readers | `MicrosoftOffice` · `PowerBI` · `FoxitReader` |
| `Dev` | programming: editors, IDEs, databases and their tools, runtimes, containers, git | `Microsoft\VSCode` · `JetBrains\DataGrip` · `Git` |
| `Network` | browsers, VPN, remote control, file sync, messaging, downloaders | `Chrome` · `Syncthing` · `UltraViewer` |
| `System` | tools of the operating system and the machine maker: virtualisation, updates, disks | `Microsoft\WSL` · `RaiDrive` |
| `Utility` | small tools: archives, keyboard input, cleaners | `7-Zip` · `UniKey` |
| `Game` | games, game launchers and game tools (mod managers, emulators, trainers, game support apps) | `Steam` · `EpicGames` · `ModOrganizer` |
| `Drivers` | device driver packs — shaped by `Software_150_Drivers`, not by the three parts | `Drivers\Printer_<Model>\` |
| `Fonts` | font packs downloaded to install | `Fonts\GoogleSans\` |

## Rules

- Exactly the fifteen groups above, spelled as in the table. No sixteenth group.
- A program doing several things goes by the MAIN job the owner installed it for: `PowerBI` ⇒ `Office`, not `Dev`.
- A launcher's game library is the launcher's `Data\` (`Software\Game\Steam\Data\`); a game installed without a launcher is a
  program of its own in `Software\Game\<Game>\`.
- A program that fits no group ⇒ `Utility`.
- No loose file at a group level.
- A vendor level may hold `_Setup\` beside its programs: what several programs of that vendor in this group share (a licence,
  a keygen, a common installer), by the block law. A kit shared across groups goes to `Software\_<Vendor>\` (Software_147).

## Check

`zemory conform --layout <data root>` reds (`unknown-value`) any folder in `Software\` outside the fifteen groups, and
(`program-stray`) any program folder in a group (except `Drivers` · `Fonts`) holding anything besides `Setup\`, `App\`,
`Data\` and `_README.md`.
