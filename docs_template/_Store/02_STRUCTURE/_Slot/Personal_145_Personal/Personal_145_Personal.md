---
id: Slot_145
name: personal
version: 4
path: Personal/<PersonalKind>/
values: [Apps, StudyProjects, Games, Freelance, Social]
scope: layout
---
# Personal_145_Personal personal — the owner's own work, by kind

## Role

`Workspace\Personal\` holds the work the owner OWNS: self-written tools and products, code written while learning, games the
owner develops, work done for outside clients, and the owner's own channels. Every item sits under ONE kind folder, so that
looking at `Personal\` shows what each thing is — a product, an exercise, a client job — instead of thirty folders side by side.

## Five kinds — a fixed list, the level is required

| kind | holds | inside | real example |
|---|---|---|---|
| `Apps\` | the owner's own tools and products | `[<Project>\]<repo>\` — a project level when one project has two repos or more | `Workspace\Personal\Apps\BudgetTracker\` · `Workspace\Personal\Apps\HomeLab\{homelab-api, homelab-ui}\` |
| `StudyProjects\` | code written to learn, that runs | mirrors `Study\` (Study_160): `School\<School>\<Subject>\<repo>\` · `Self\<Field>\<repo>\` | `Workspace\Personal\StudyProjects\School\OpenUniversity\Databases\finance-tracker\` |
| `Games\` | games the owner develops (games the owner plays are in `Game\`) | `<repo>\` | `Workspace\Personal\Games\PixelRunner\` |
| `Freelance\` | work done for outside clients, outside any organisation | `<Client>\` — repos AND non-repo work files (designs, drawings, deliveries) | `Workspace\Personal\Freelance\ClientA\ShopSite\` · `Workspace\Personal\Freelance\ClientB\house-design.skp` |
| `Social\` | the owner's own channels (video, music, posts): the tools AND the output they produce | `<Platform>\<Channel>\` — repos AND non-repo output (tracks, renders, prompts, images) | `Workspace\Personal\Social\Youtube\<Channel>\_tracks\` · `Workspace\Personal\Social\Facebook\Avatar\` |

## Rules

- Every item of `Personal\` sits in one of the five kinds; there is no repo or folder straight under `Personal\`, and no sixth
  kind.
- `Apps\`, `StudyProjects\` and `Games\` hold repos only. `Freelance\` and `Social\` may also hold work that is not a repo, because
  a client job or a channel is made of files a repo does not hold (a drawing, 40 GB of rendered video).
- Learning: code that runs ⇒ `StudyProjects\`; material that is only read or watched (lectures, books, exams, notes) ⇒ `Study\`;
  knowledge kept to look things up ⇒ `Library\`. `StudyProjects\X` and `Study\X` use the same `X`. A school project: its code ⇒
  `StudyProjects\School\<School>\<Subject>\<repo>\`; its papers (brief, report, grades) ⇒ `Study\School\<School>\<Subject>\`.
- Someone else's code cloned to learn from ⇒ `StudyProjects\Self\<Field>\`; cloned to use ⇒ `Workspace\External\`.
- A study project that grows into a product ⇒ move it to `Apps\` with `zemory project move` (keeps its Global Memory history).
- Only the owner's own work. A repo of an organisation ⇒ `Company\<Org>\`.
- No loose file at the `Personal\` level or at a kind level.

## Naming

- Kind folders exactly as in the table.
- A repo folder is named as the repo is on its remote (`github.com/<account>/ZFlow` ⇒ `ZFlow\`). A folder whose name differs from
  its remote is renamed with `zemory project move <old> <new>`, one repo at a time, when the owner decides to; until then the
  difference is allowed.
- Project, client, platform and channel names in PascalCase, no spaces.

## Check

`zemory conform --layout <drive>\Workspace` reds (`unknown-value`) any folder straight under `Personal\` that is not one of the
five kinds — a repo placed straight under `Personal\` included. The levels inside a kind have no machine check yet.
