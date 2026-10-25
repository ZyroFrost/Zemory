---
id: Slot_86
aka: 03-86
name: .gitattributes
version: 6
path: .gitattributes
from: _Store/02_STRUCTURE/_Slot/Root_086_Gitattributes @v6 #d02f03ca8d53
---
# Root_086_Gitattributes .gitattributes — eol + LFS

- Role: eol + LFS (a manifest the tool forces at the root). Heavy binaries (deliverables `.pbix`/`.fig`…, bundles `*.enc`) go through LFS.
- Line-ending lock: `* text=auto eol=lf`, written BEFORE the LFS lines (a later line overrides an earlier one). A repo not locked yet is fixed by `Rule_Gate_24_EolKeep`.
- Launchers keep CRLF: `*.cmd text eol=crlf` · `*.bat text eol=crlf` right after the `text=auto` line — cmd.exe misreads an LF launcher (a `rem`
  line is cut, the next line runs as a command). Missing these two lines ⇒ `conform` › `slot-gate` reports it, `zemory sync` puts it in the repo's ledger.
