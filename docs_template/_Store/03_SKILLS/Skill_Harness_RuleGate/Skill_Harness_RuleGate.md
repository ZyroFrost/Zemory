---
id: Skill_Harness_RuleGate
name: harness-rule-gate
version: 8
type: process
checked: [Skill_Frame_Own, Skill_Harness_Conform, Rule_Gate_01_DoneMeansRun, Rule_Gate_86_LawLayersAgree]
description: Write a new rule, constitution frame or skill for a harness, place it in the right home, and build its machine gate with positive and negative cases. Use once adding or changing a rule, a constitution frame or a gate has been approved. Vietnamese triggers - "thêm luật", "viết luật", "dựng cổng", "chốt máy cho luật", "xếp nhà luật".
---

# harness-rule-gate — writing a law and building its machine check

> Runs only once the requester has approved adding or changing a law (`Rule_Gate_79_HarnessEdit`). Naming and where each piece lives:
> `docs_template/_Store/README.md`.

## 1. Find the home before writing

- A sentence about how the agent works in every repo ⇒ a shared law (`01_LAW/_Rule`).
- A sentence about the repo's own product ⇒ the `Cons.md` of the matching frame, or an article of its own from number 101.
- A sentence that is a way to do one kind of work ⇒ a skill. A sentence about where a file goes ⇒ a slot (proposing a slot or a new template: `Skill_Harness_Structure`
  §5). A sentence about a tool mechanism per host ⇒ `_Host`.
- Two pieces saying the same thing ⇒ merge into the existing one; never a new piece.

## 2. Classify by the question: when it is broken, what does the machine see?

1. **An action on a tool** (delete · push · write outside the repo · SQL to a server · edit a protected path · a git command that discards work) ⇒ a
   `PreToolUse` guard branch looking at the tool name and the command/path. An action allowed once ⇒ an `.allow-*` flag.
2. **Content being written** (line endings · names · spelling · quotes · a new ledger item · inline SQL) ⇒ a `PreToolUse` hook
   on Write/Edit, looking only at what is added; files entering git ⇒ pre-commit; the shape of docs ⇒ `zemory validate`; the folder tree ⇒
   `zemory conform`; an invariant of the code ⇒ a test in the repo's gate.
3. **Judgment, words** (ask when unclear · not verified · propose a design) ⇒ no tool call to hook: still, the floor of
   `Rule_Gate_73_GateEveryRule` holds — at least a `prompt` (Keys) on the words that announce it, or `read` (require a skill) in `gate.json`.
   Only a law no word can announce stays `Core`, with a written `"core": "<why>"`.
- A law whose breach cannot be undone (a secret in a commit · a write to a protected path · a push not asked for) ⇒ must have a machine check; text alone
  is not enough.

## 3. Building the check

- The hook sits in the law's folder: `hook.cjs`; a law that took in another law ⇒ add `hook-<name>.cjs`, `gate.json › hook` lists them all.
- The block message names the law in full, what was just caught (file · line · command) and the Right way if the law prescribes how to write it.
- `gate.json` has cases to block (`block`) and cases to let through (`pass`: things that look alike but are right). Break the hook's code, then run again: the block cases
  must go red (`Rule_Gate_01_DoneMeansRun`).
- The hook itself failing ⇒ let it through (fail-open).
- The kind in the name (`Gate` · `Keys` · `Core`) must match what `gate.json` really does; the store's name check reports a mismatch.

## 4. A new constitution frame

- One frame = one kind of invariant many products share. Folder `Cons_Gate_<NN>_<Name>/`: the law file (`frame: true`, "the repo
  must declare …", a written example) · a template `Cons.md` (`status: template`, blanks `<…>`, an `n/a` way out) · `gate.json` `{"gate": "conform"}`.
- An invariant only one product has ⇒ no frame; let the repo write its own article.

## 5. An article covering a whole set ⇒ a register + a gate

- A constitution article demanding that EVERY element of a set has something ("every kind of anomaly keeps its evidence", "every endpoint
  goes through the guard") ⇒ text alone cannot hold it: a new element appears and nobody remembers the article.
- Build a machine-readable register (`register.json`) in the repo's own skill (`Skill_Own_<Name>`, `Skill_Frame_Own`): one entry per
  element, declaring where the duty is kept, with a one-sentence `why`.
- The repo's gate compares both ways: the set in the code (read from its one declaring place, e.g. a registry) == the set in the register; then checks each entry
  — the query name exists, the writing function is called on every path the register names, the reading function exists in every storage layer.
- Check itself by mutation on an in-memory copy (drop an entry · add an element · remove a call · change a name): each mutation
  must turn the gate red (`Rule_Gate_01_DoneMeansRun`). The build calls the gate; the article names the skill and the gate.
- Example: a reconciliation app with the article "never lose an anomaly once found" ⇒ the register declares for each kind of anomaly (11 kinds) whether it is recomputed from
  the source or kept in the app's log; the gate checks 11 = 11 and goes red on 6 mutations.

## Implements · Thi hành luật
- `Rule_Gate_73_GateEveryRule` — classifying a law and building its machine check · phân loại luật và dựng chốt máy
- `Rule_Gate_79_HarnessEdit` — giving a law whose breach cannot be undone its machine check · gắn chốt máy cho luật mà vi phạm không đảo được
- `Rule_Gate_85_ProposeChecked` — proposing a new part after the store was searched · đề xuất phần mới sau khi đã dò HS
