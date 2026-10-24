---
id: Slot_145
name: personal
version: 5
path: Personal/<PersonalKind>/
values: [StudyProjects, Games, Apps]
scope: layout
---
# Personal_145_Personal personal — the owner's own code, by kind

## Role

`Workspace\Personal\` holds the code the owner OWNS (step 3 of `Workspace_143`). Every repo sits under ONE kind folder, so a look
at `Personal\` tells an exercise from a product.

## The question of this level — the first true answer wins

| step | the fact | goes to | inside |
|---|---|---|---|
| 1 | there is real learning material for it: a folder `Study\X` exists | `StudyProjects\` | mirrors `Study\`: `School\<School>\<Subject>\<repo>\` · `Self\<Field>\<repo>\` |
| 2 | a game the owner develops | `Games\` | `<repo>\` |
| 3 | everything else | `Apps\` | `[<Project>\]<repo>\` — a project level when one project has two repos or more |

Real examples: `Workspace\Personal\StudyProjects\School\OpenUniversity\Databases\finance-tracker\` (and
`Study\School\OpenUniversity\Databases\` exists) · `Workspace\Personal\Games\PixelRunner\` · `Workspace\Personal\Apps\BudgetTracker\`.

## Rules

- Exactly three kinds, the level is required: no repo or folder straight under `Personal\`, no fourth kind.
- `StudyProjects\X` needs `Study\X`; without it the repo is not a study project ⇒ step 2 or 3.
- A folder shared by several repos of one kind sits beside them with a `_` name: `Apps\_Prompt\` holds the prompts two apps of
  one field use. It is not a repo.
- An app keeps the output it produces inside its own repo, in `workspaces/<name>/` (one folder per unit of output, shared items
  with a `_` name, gitignored) — never in a store outside the repo.
- A study project that grows into a product ⇒ `zemory project move` to `Apps\` (keeps its Global Memory history).
- A repo folder is named as on its remote; a folder whose name differs is renamed with `zemory project move <old> <new>` when the
  owner decides; until then the difference is allowed.
- No loose file at the `Personal\` level or at a kind level.

## Not here ⇒ goes to

Work for an organisation, freelance included ⇒ `Company\<Org>\` · code of others ⇒ `External\` · learning material that is read or
watched ⇒ `Study\`.

## Check

`zemory conform --layout <drive>\Workspace` reds (`unknown-value`) any folder straight under `Personal\` that is not one of the three
kinds. From the drive root it also reds (`study-unmatched`) a `StudyProjects\School\<School>\<Subject>\` or `Self\<Field>\` with no
matching folder under `Study\`.
