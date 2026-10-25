---
id: Host_IDE
name: host-ide
version: 4
kind: host
---
# IDE The IDE host — the agent inside a code editor

- Scope: the agent runs in a panel of a code editor (an extension), opened on the folder open in the editor.
- Opening a project: open the project folder in the editor → open the agent panel → paste the set's bootstrap line (a Memory set: `zemory init --kit <no>`).
- Sets that can be assembled: Basic and Memory sets.
- Environment check (doctor):
  - Node ≥ 20 and Git on PATH (the guard hook is a Node hook; Git for exit code 2 and the commit gate);
  - Memory set: the `zemory` command on PATH, `zemory doctor` green in the project folder;
  - the hook command is anchored on `CLAUDE_PROJECT_DIR`, not on the session's working folder.

## The machine gates (guard)

- `zemory hook guard` generates the gates from the marker `.harness.json` (keys `protected` · `secretNames` · `allowedRoots` · `allowedSqlServers` · `repoGates` · `readFirst`): `policy.json` (the compiled laws) · `guard.cjs` (the `PreToolUse` hook, blocking before an action touches the disk or the network) · `precommit-guard.cjs` (blocks secrets from entering staging, commits made by a person included).
- The guard is the standard, not an option: the command plugs the guard into `.claude/settings.json` › `PreToolUse` with a matcher covering `Write|Edit|MultiEdit|NotebookEdit|Read|Bash|PowerShell`, keeping every other hook of the repo. Pre-commit is plugged in when the repo has none; a repo with its own pre-commit ⇒ reported, the line calling the guard is added by hand.
- Each law with a hook carries `hook*.cjs` in its folder; the guard calls each file in turn.
- Check: `zemory doctor` reds when the guard is not plugged in or the matcher misses a tool; `zemory gates --all` measures whether every repo really runs the guard · pre-commit.

## One-use flags

- A `.allow-*` flag (in `docs/.harness-state/`) lets exactly one approved action through; the agent creates a flag only after clear approval in the session (`Rule_Keys_61_HookSafetyNet`).
- The guard lets it through, then stamps `ZEMORY-USED <command fingerprint> <time>` into the flag file itself, without deleting it at once: for 90 seconds exactly that command may be tried again; asking for another action or running out of time ⇒ the flag is revoked. The secrets group has no flag.

## Write-protected paths (`protected`)

- A repo's write-protected paths are declared in the marker's `protected` key; the harness is protected in every repo whether declared or not (`Rule_Gate_79_HarnessEdit`).
- `protected` takes globs, not only prefixes: `data/*/01_raw` covers the original input of every case, cases not yet made included.
- Declare only read-only things (original inputs · the secrets vault). Never the product the repo is building: a gate that cries on every everyday edit gets ignored; mistaken edits to the product are guarded by git.

## Work outside the project (`Rule_Gate_44_RepoScope`)

- The guard blocks four groups, with one shared flag `.allow-outside`:
  1. writing to an absolute path outside the repo (Write/Edit · `>`/`>>` · `cp`/`mv`/`robocopy` · `mkdir`/`New-Item`/`Set-Content`/`Out-File`/`tee`/`touch` · an interpreter running a writing command); exempt: the system temp folder · `~/.claude` · `/dev/null` · `NUL` · paths declared in `allowedRoots`;
  2. SQL making the server write a file (`BACKUP … TO DISK` · `RESTORE … FROM DISK` · `CREATE DATABASE … FILENAME`);
  3. SQL changing the server configuration (`sp_configure` · linked servers · `CREATE/DROP/ALTER DATABASE`); a marker declaring `allowedSqlServers` ⇒ servers outside the list are blocked too;
  4. commands run on another machine (`ssh` · `Invoke-Command` · `Enter-PSSession` · `psexec` · `winrs`) whose payload creates · deletes · changes something; copying up to another machine with `scp`/`rsync`. Read-only commands pass.
- Limits: the guard does not see paths or SQL built at run time, held in a variable or inside a script file, nor relative paths after a `cd` outside; the text of the law is the deciding layer.

## Read before writing (`Rule_Gate_59_ReadFirst`)

- The read-first gate compares line by line: a line already seen (through Read, or written by the agent with Edit/Write) need not be read again; a file changed outside Edit/Write ⇒ only the changed lines are asked for.
- A context compaction does not force reading again: the `SessionStart` hook puts back the core and the constitution verbatim. Commands reading Global Memory and looking up sessions (`zemory memory …` · `peers` · `graph`) are not blocked.
- More files to read first: the marker key `readFirst`. A host that writes no transcript ⇒ let through (fail-open).

## Sessions and messages between sessions

- Session titles follow `<Repo>_<Model>_<d-m-yyyy>` (`<Repo>` = the repo folder name, exact case; the date without leading zeros); a topic ⇒ inserted before the date; a second session the same day ⇒ `_<n>` after the date. The owner sets the title; an agent that sees its own session title off the pattern reminds once, never renames it itself. `zemory peers --all --check` scores every session; `--fix` prints a plan, `--apply` runs only when asked.
- Messaging an agent in another session or repo: only a running session with a standard title; a repo with several sessions ⇒ the one with the newest date. A title is not an address: before every send run `zemory peers`, then send to the address marked ★; no ★ ⇒ do not send, report that the target session needs a title. Replying to a message ⇒ use exactly the message's `from` address.
- Check: the machine-wide hook `zemory hook send-guard` blocks sending to a session without ★.
