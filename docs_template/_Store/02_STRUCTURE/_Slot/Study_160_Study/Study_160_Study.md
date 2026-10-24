---
id: Slot_160
name: study
version: 1
path: Study/[<Kind>/]<Subject>/
scope: layout
---
# Study_160_Study study — what the owner is learning

## Role

`<data root>\Study\` holds the material of what the owner is learning NOW: lectures, slides, exercises, notes, recordings of a
course. Branch ① of `Struc_Disk_Data`: the owner's own notes and work live here as originals. Once a subject is finished and only
kept to look things up, it moves to `Library\` (Library_163).

## Inside

Two kinds, each its own folder:

| folder | holds | real example |
|---|---|---|
| `School\<School>\<Subject>\` | a subject taken at a school or university, one folder per subject | `Study\School\OpenUniversity\Statistics\` |
| `Self\<Field>\` | self-study: an online course, a book worked through, a certificate track | `Study\Self\DataEngineering\` · `Study\Self\Japanese\` |

A subject folder is split by what the owner needs, for example `Lectures\` · `Exercises\` · `Notes\` · `Exams\`.

## Rules

- Code that runs goes to `Workspace\`, not here: an exercise repo, a course project, a notebook that is executed lives in
  `Workspace\Personal\StudyProjects\<Subject>\` (Personal_145), named as its subject folder here, so the two are found together.
  Material that is only read or watched stays in `Study\`.
- A finished subject kept for reference ⇒ move the whole folder to `Library\<Field>\`. A finished subject with nothing worth
  keeping ⇒ delete it, or move it to `Archive\Study\...` if it must be kept.
- No loose file at the `Study\`, `School\` or `Self\` level.

## Naming

PascalCase, no spaces: `OpenUniversity` · `Statistics` · `DataEngineering`. The school and subject names as the owner calls them.

## Sync

Not in git. The owner's own notes are originals: back them up like the rest of branch ①.

## Check

`zemory conform --layout <data root>` accepts `Study\` as a top-level folder. The inside of `Study\` has no machine check; the
owner keeps the two kinds above.
