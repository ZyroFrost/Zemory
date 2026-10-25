---
id: Skill_Harness_Reshape
name: harness-reshape
version: 5
type: process
description: Move a repo onto a standard set from the store - measure what the repo has of its own, bring it up to the store first, assemble in two phases, remove the copies that hold nothing of their own, and accept with measurements and a real run. Use whenever a repo moves to the folder harness, changes set, or takes a large store update. Vietnamese triggers - "nắn repo", "áp chuẩn", "áp bộ", "chuyển sang bộ", "reshape", "đưa repo về chuẩn".
---

# harness-reshape — bringing a repo onto a standard set

> Not `Skill_Harness_Reconcile` (files in the wrong place inside a folder) nor `Skill_Harness_Adopt` (taking in someone else's repo, without
> reshaping). This skill brings a repo that uses the harness onto exactly one set of HS, losing nothing, leaving no second copy.

## 0. Before touching the repo

- The repo has an agent session open ⇒ the owner closes that session first. Writing into a repo another session is working in is a real conflict.
- Settle the target set (`<NN>_<host>_<structure>_<tier>`): the structure by the kind of repo (App · NonApp · Dept…), not by habit.
- The repo has uncommitted changes ⇒ write the list down; the reshape does not touch those files.

## 1. Measure the repo's own part — by LINE, against every version of the source

- For each skill, tool, law the repo keeps that HS also has: list the lines only the repo has. Compare against **every version in the history**
  of the source that was copied into the repo (an old copy is often stitched from several states, matching no committed version).
- Ignore line-ending differences (CRLF) before counting.
- The result is a table: `part · own lines · lines only the source has`. Own lines > 0 ⇒ step 2; 0 ⇒ that copy is surplus.

## 2. Merge the own part into HS — BEFORE applying

- An own line that is an upgrade ⇒ put it into the right part of HS (one copy), bump the version. HS already has a better copy ⇒ HS wins.
- A tool that was edited ⇒ compare the HS copy with the repo's copy on **the repo's own real data** (reports, sample files): the results must
  be identical, differing only where a change was meant. Different ⇒ do not apply.
- A value of the company / region ⇒ a region key (`values.json`), never in an HS part.

## 3. Phase 1 — assemble

- Back up the harness surface (`docs/`, `.claude/`, `AGENTS.md`, `CLAUDE.md`) and the `git status` outside the repo.
- Record the state before: the feature table (laws, skills, triggers, guard), a hash of every file outside the harness, the `validate` errors present.
- `zemory sync --standard [--kit <NN>] --apply`.
- A copy with no own lines (step 1) ⇒ **delete** it. Own lines not merged yet ⇒ stop, go back to step 2.
- A tool installed by an HS part (`installs:`) while the repo keeps an old copy with no own lines ⇒ replace it with the HS copy.

## 4. Phase 2 — acceptance (the whole table; one row missing means not done)

| Measurement | Passes when |
|---|---|
| A second `sync` run | `0 to add · 0 to update · 0 conflict` |
| Features | no law, skill, trigger or gate lost compared with before |
| Files outside the harness | only the files the reshape meant to change changed (a tool replaced, a link retargeted); no file disappeared |
| Guard | the block/pass suite runs whole, all right |
| `doctor` | docs · guard · guard wiring all green |
| `conform` | `harness-layout` clean (`docs/agent` holds only the shelves and the two ledgers; archive in `docs/archive/`; the old hooks folder beside `docs/agent/` removed) |
| `validate` | no new error |
| A real run | the repo's tools run inside the repo and read the right values (region, config) |

- A `conform` item that is the repo's own work (a constitution frame not written yet, the name of an own article) ⇒ report it, never write it for them.
- No commit in the reshaped repo; the owner or that repo's session commits.

## 5. Report

- Update the round's progress table: repo · set · the result of each measurement · the work left to the repo.
- A hole in the harness caught while reshaping (a law with text but no machine check, a gate that cries wolf, a tool step skipped) ⇒ fix it in the round, with
  a test and a mutation, then apply it again to the repos reshaped before.

## Forbidden

- Running an old overwrite-copy script (mirror) after the repo was reshaped.
- Deleting a copy that still has own lines.
- Applying while the tool comparison still differs.

## Implements · Thi hành luật
- `Rule_Gate_83_HarnessFromStore` — bringing a repo onto the store's harness and syncing it down · đưa repo về harness của HS và đồng bộ xuống
