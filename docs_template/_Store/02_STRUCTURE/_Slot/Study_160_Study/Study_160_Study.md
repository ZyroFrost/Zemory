---
id: Slot_160
name: study
version: 2
path: Study/[<Kind>/]<Subject>/
scope: layout
---
# Study_160_Study study — material being learned now

## Role

`<data root>\Study\` is step 9 of the drive's question chain (`Struc_Disk_Data`): material the owner is learning NOW — lectures,
slides, exercises, notes, recordings, and a course downloaded to study (a downloaded course is for study, not a collection). Once
finished and only kept to look things up, it moves to `Library\` (step 10, Library_163).

## Inside — two kinds

| folder | holds | real example |
|---|---|---|
| `School\<School>\<Subject>\` | a subject taken at a school or university | `Study\School\OpenUniversity\Statistics\` |
| `Self\<Field>\` | self-study: a course, a book worked through, a certificate track | `Study\Self\DataEngineering\` |

## Rules

- Code that runs is not here (Law 2, place by nature): the owner's code for a subject ⇒
  `Workspace\Personal\StudyProjects\School\<School>\<Subject>\<repo>\` or `…\StudyProjects\Self\<Field>\<repo>\` — the same path
  as here (Personal_145). Code of others for a subject ⇒ `Workspace\External\<repo>\`; this folder links to it.
- A program used for studying is in `Software\`; a school project's papers (brief, report, grades) stay here.
- Finished and kept to look up ⇒ move the whole folder to `Library\<Field>\`. Finished, nothing worth keeping ⇒ delete it.
- No loose file at the `Study\`, `School\` or `Self\` level.

## Naming

PascalCase, no spaces: `OpenUniversity` · `Statistics` · `DataEngineering`.

## Sync

Not in git. The owner's notes are originals: back them up.

## Check

`zemory conform --layout <data root>` accepts `Study\`, and reds (`study-unmatched`) a study project under
`Workspace\Personal\StudyProjects\` that has no matching folder here.
