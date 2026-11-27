---
id: Rule_76
name: deploy-checks-frame
version: 6
kind: action
code: 05_Domain
checked: [Skill_App_ShellUse, Skill_App_SneatGlass, Skill_App_Report, Skill_App_Release, Rule_Keys_90_AppFamilyContract]
from: _Store/01_LAW/_Rule/05_Domain/Rule_Gate_76_DeployChecksFrame @v6 #b96a83277541
---
# Rule_Gate_76_DeployChecksFrame — An app of a family deploys only through the frame's shared checks

## What
An app that wears the family's frame (it pins a build in `frontend/config/shell.json`) ships a build only through a browser
check that loads the shared rules of the frame: `RULES` · `PROBES` · `DIALOG_RULES` of `scripts/sneat_glass_check.mjs`, plus
`RULES` of `scripts/report_layout_check.mjs` when the app has a report page (`data-rp-page`). No switch of the deploy leaves the
check out. (v5, the requester 26/11: "giờ t bắt buộc deploy liền rồi mới kiểm") Every build ships first and is checked right after,
on the build that shipped; a red is said aloud and fixed at once. The pinned frame build is never below the family's floor; below
the newest build is a warning, not a block.

## When
- Running the deploy script of an app that pins a frame build (`deploy*.ps1` · `deploy*.sh`), not a dry check or a rollback.

## Do
1. (v5) The deploy installs first, then runs the browser check on the build that shipped (skill app-shell-use §6): every page at
   a desktop and a phone width, both themes. Red => the deploy reports itself failed, the red is said aloud, fixed and shipped
   again at once. The person waits on no check to get a build. The fast gates of the deploy script itself (seconds: sign-in
   fail-closed, the account, the frame paths) still run before it installs.
2. `-Revert <commit>` (v4) stays accepted: it names the commit whose break the build undoes, for the ledger; the order is the
   same as every deploy.
3. That check imports the shared names, or hands the shared rules file to the family's runner (`live-app.mjs` of the system
   manager), which loads all three. An app with a report page also loads the report rules.
4. Never add a switch that skips the check (`-SkipLive`, `-NoCheck` ...), and never run the deploy with one. The check runs
   after the install, never not at all.
5. The pin stays at or above the floor in `shell_floor.json` beside this rule. The system manager raises the floor when a
   build fixes a grave fault of the frame, and writes the newest build there when it publishes one (skill app-shell).
6. The check stands on the app's own ports and stops only the processes the deploy started, by id with their tree - never
   whatever listens on a port, which may be another app's check halfway through (skill app-shell-use §6).

## Example
- Situation: a report app's deploy script runs its unit tests and the build, then ships.
- ✗ Wrong: deploy; the pages were never drawn against the frame's rules, and a page bar out of size goes live.
- ✓ Right: the deploy installs, then runs `scripts/sneat_check.mjs` on the mock built from the same commit, which imports `RULES`,
  `PROBES`, `DIALOG_RULES` and the report `RULES`; a red reports the deploy failed and is fixed and shipped again at once.

## Check
- The hook blocks the run of a deploy script in a repo with `frontend/config/shell.json` when: what the script runs (the `.mjs`
  and `.py` files it names, `npm run` scripts, and what those run or import, three levels down; comments do not count) does not
  load the shared names · the app has a `data-rp-page` and the report rules are not loaded · the command carries a switch that
  skips a check · `-Revert` names no commit, or names one that is not a commit of the repo (v4) · the pin is below `floor`. A
  revert naming its commit is let through when the script still runs the check (it runs after). A pin below `latest` is
  blocked once per session as a warning; the retry passes.
  Passed: a dry check (`-Check`) or a rollback · a repo that pins no frame · a command that only names the script. The hook
  failing lets the call through.
- `zemory conform` (`rule-conform`, advisory) runs the same loading check on every `deploy*` script of an app that pins a frame,
  as the repo stands: the hook exports `conform(root)`. It also names the line of the deploy script, or of the check it runs,
  that stops a port's owner (`Get-NetTCPConnection … | Stop-Process`, `… .OwningProcess`, `netstat … | taskkill`,
  `fuser -k`, `lsof -t -i … | kill`, `kill-port`; comments do not count).
- What the hook cannot see (the check run but its result ignored) is the deploy script's own gate, judged by the owner.

## Links · Liên kết
- Implements · Thi hành: `Skill_App_ShellUse` — an app wears the frame and runs its check · app mang khung và chạy bộ kiểm của nó
- Related · Liên quan: `Skill_App_SneatGlass` — the shared rules of the frame · luật chung của khung
- Related · Liên quan: `Skill_App_Report` — the report rules · luật trang báo cáo
- Related · Liên quan: `Rule_Keys_90_AppFamilyContract` — an app wears the build it pins · app mang bản khung nó ghim
