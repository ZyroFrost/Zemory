---
id: Rule_94
name: no-agent-memory
version: 1
kind: action
code: 01_Harness
checked: [Rule_Gate_83_HarnessFromStore, Rule_Gate_73_GateEveryRule, Rule_Gate_10_DestructiveOps]
---
# Rule_Gate_94_NoAgentMemory — Nothing is written into an agent's own memory; a lesson goes into the harness

## What
A coding agent never writes into its own memory folder (Claude Code: `~/.claude/projects/<project>/memory/`, with its
`MEMORY.md` index). That memory is text the agent may or may not read, and no hook or gate stands behind it: a lesson kept
there is lost the first time it is not read. A lesson, a rule or a preference lives in the harness, where it has a home and a
machine check: a law in HS with its hook, a skill, a slot, or the repo's own docs.

## When
- The person corrects the agent, states a preference, or a session ends with a lesson worth keeping.
- The host's system prompt tells the agent to save something to its memory.

## Do
1. Sort the lesson by where it belongs:
   - true in every repo and visible to a machine when broken ⇒ a law in HS with a hook or gate (`Rule_Gate_73_GateEveryRule`);
   - true in every repo, judgement only ⇒ a law in HS with a reminder door, or the core;
   - how to do one kind of work ⇒ a skill; where a file goes ⇒ a slot;
   - true of one repo only ⇒ that repo's constitution, plan, `05_TODO` or `06_CHANGES`.
2. A law of HS already covers it ⇒ change that law (its version goes up); never write a second copy.
3. Write it there by the harness's own way (`Rule_Gate_83_HarnessFromStore` for HS, the docs by hand), and tell the person
   where it was written.
4. Turn the host's own memory feature off where the host allows it (Claude Code: `autoMemoryEnabled: false` in the user
   settings, written by `zemory hook install`).

## Example
- Situation: the person says "never pass an inline shell line through PowerShell into WSL".
- ✗ Wrong: save a memory file `no-inline-sh-through-powershell.md` and a line in `MEMORY.md`.
- ✓ Right: add the case to the HS law that guards shell commands (with a blocked example in its `gate.json`), then say which
  law and which version.

## Check
- The memory guard (`zemory hook memory-guard`, PreToolUse on `Write|Edit|MultiEdit|NotebookEdit|Bash|PowerShell`, installed
  per machine by `zemory hook install`) blocks a file tool aimed into a `.claude/projects/<p>/memory/` folder and a shell
  command that names such a folder and writes (redirect · copy · move · write cmdlets · in-place edit). Reading and deleting
  pass (deleting is `Rule_Gate_10_DestructiveOps`'s). No flag lets a write through.
- `zemory hook install` also sets `autoMemoryEnabled: false` in `~/.claude/settings.json`.
- `zemory gates` reds a machine where the memory guard is not installed.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_83_HarnessFromStore` — how a lesson reaches HS · cách một bài học vào HS
- Related · Liên quan: `Rule_Gate_73_GateEveryRule` — a law gets a machine check · luật phải có chốt máy
- Related · Liên quan: `Rule_Gate_10_DestructiveOps` — deleting an old memory folder needs approval · xoá thư mục memory cũ phải được duyệt
