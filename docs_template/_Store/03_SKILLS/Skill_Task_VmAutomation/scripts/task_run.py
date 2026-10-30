"""task_run.py — the wrapper EVERY scheduled task on the VM runs under (DW repo docs/plan/22 §8).

    python scripts\\task_run.py --task OPS_Daily_StoreInventoryReport_Close -- bin\\OPS_Daily_StoreInventoryReport.cmd close live

Runs the launcher, passes its output through unchanged (the Task Scheduler action appends it to data\\logs\\<task>.log),
then writes ONE row to the warehouse run log `dbo.Log_JobRun` through `dbo._LogTaskRun`: start time · duration · exit
code · every `INPUT_CHECK: OK|NONE|INVALID · <file> · <detail>` line (the input gate, the department standard §5c, 2026-10-05)
· every `OUTPUT_CHECK: OK|INVALID · <file> · <detail>` line (the output gate of a direction-out task, the department standard §1c, 05/10)
· every `OUTPUT_URL: <link>` line the task printed (convention: print it right after each upload) · the last lines
of output. So "did it run, was its input there and valid, was it green, where is the result" is one query for every
automated job, SQL Agent or not.

Rules: the task's exit code is returned AS IS · a run-log failure never fails the task (it prints a warning).
Where the run log goes — one database, named `<MACHINE>/<DATABASE>` (the real names), the first that is set of:
  · env RUNLOG_DB (a launcher may set it) ·
  · the repo's `config/runlog.json` {"machine": …, "database": …} — a repo whose run log lives in its OWN database (a data repo
    other than the region's warehouse) declares it there; the file is a setting, it travels with the task to the VM ·
  · the machine vault's setting `_runlog_db` (in `sql\\configs\\connections.json` of that machine) — the region's warehouse,
    where every other repo logs. It lives in the vault, not in the region values, because those do not reach the VM.
The connection comes from the machine vault through scripts/vault_conn.py: `conn(machine, database, account)` with the account
of the vault setting `_runlog_account` when the machine sets one (a work PC whose default account is a read-only agent that may
not run the log procedure), else the account the machine's register names; there is no fallback to .env. Nothing secret lives here. Shipped by zemory: store part
Skill_Task_VmAutomation (its installs); change the store part, never the repo copy.

Which repo is acting (Rule_Keys_90 step 3): `repo_name()` = the folder name of the repo's root (`git rev-parse
--show-toplevel`, else the folder holding docs/.harness.json), never a naming pattern. The launcher gets it as env
ACTING_REPO, so a task's script sends it as header `X-Acting-Repo` to an app of the family, or writes it to the log's
acting-repo column when it inserts into the family's database itself. Attribution only, never a permission.
"""
import argparse
import datetime as dt
import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
REPO_ENV = "ACTING_REPO"                            # the acting repo, handed to the launcher (Rule_Keys_90 step 3)
REPO_MAX = 64


def repo_name(start=None):
    """Folder name of the repo's root: git toplevel, else the folder holding docs/.harness.json, else ''.
    Kept to [A-Za-z0-9._-] and at most 64 characters (what the apps and the log column accept)."""
    import re
    here = Path(start or HERE)
    root = None
    try:
        out = subprocess.run(["git", "-C", str(here), "rev-parse", "--show-toplevel"],
                             capture_output=True, text=True, timeout=10)
        if out.returncode == 0 and out.stdout.strip():
            root = Path(out.stdout.strip())
    except Exception:
        pass
    if root is None:
        for p in [here] + list(here.parents):
            if (p / "docs" / ".harness.json").is_file():
                root = p
                break
    name = root.name if root else ""
    return name if name and len(name) <= REPO_MAX and re.fullmatch(r"[A-Za-z0-9._-]+", name) else ""


def run_log_target():
    """'<MACHINE>/<DATABASE>' of this repo's run log, or '' (see the module text for the order)."""
    if os.environ.get("RUNLOG_DB"):
        return os.environ["RUNLOG_DB"].strip()
    f = REPO / "config" / "runlog.json"
    if f.is_file():
        try:
            d = json.loads(f.read_text(encoding="utf-8-sig"))
            if d.get("machine") and d.get("database"):
                return "%s/%s" % (d["machine"], d["database"])
        except Exception as e:
            print("[task_run] WARNING: config/runlog.json unreadable: %s" % e, flush=True)
    try:
        sys.path.insert(0, str(HERE))
        import vault_conn
        return (vault_conn.setting("_runlog_db") or "").strip()
    except Exception:
        return ""


def log_run(task, started, seconds, rc, message):
    try:
        import pyodbc
        target = run_log_target()
        if not target or "/" not in target:
            print("[task_run] WARNING: no run-log database (RUNLOG_DB · config/runlog.json · vault setting _runlog_db) — run not logged",
                  flush=True)
            return
        sys.path.insert(0, str(HERE))
        import vault_conn
        machine, database = target.split("/", 1)
        account = (vault_conn.setting("_runlog_account") or "").strip() or None
        cn = pyodbc.connect(vault_conn.conn(machine, database, account), timeout=30, autocommit=True)
        cn.execute("EXEC dbo._LogTaskRun @TaskName=?, @StartedAt=?, @DurationSeconds=?, @ExitCode=?, @Message=?, @ServerName=?",
                   task, started.replace(microsecond=0), int(seconds), int(rc), message[:4000], socket.gethostname())
        cn.close()
        print("[task_run] logged to Log_JobRun (%s): %s exit %d (%ds)" % (target, task, rc, seconds), flush=True)
    except BaseException as e:                                # never fail the task because the log could not be written
        print("[task_run] WARNING: run log not written: %s" % e, flush=True)


def main():
    # the first VM pilot: under Task Scheduler stdout is the log FILE and this process has no PYTHONUTF8 (the launcher's
    # `set PYTHONUTF8=1` only reaches the child) -> cp1252 -> the first Vietnamese line killed the wrapper (UnicodeEncodeError).
    # The log is UTF-8, like the child's output.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument("--task", required=True, help="task name = Task Scheduler name = task folder (+ _Night/_Close…)")
    ap.add_argument("--no-log", action="store_true",
                    help="test run on the work PC: pass output through, write NOTHING to Log_JobRun (the first VM pilot)")
    ap.add_argument("command", nargs=argparse.REMAINDER, help="-- <launcher> [args]")
    a = ap.parse_args()
    cmd = a.command[1:] if a.command[:1] == ["--"] else a.command
    if not cmd:
        sys.exit("usage: task_run.py --task NAME -- <launcher> [args]")
    if cmd[0].lower().endswith((".cmd", ".bat")):
        cmd = ["cmd.exe", "/c"] + cmd
    started = dt.datetime.now()
    t0 = time.time()
    print("[task_run] %s start %s :: %s" % (a.task, started.strftime("%Y-%m-%d %H:%M:%S"), " ".join(cmd)), flush=True)
    urls, checks, ochecks, tail = [], [], [], []
    env = dict(os.environ)
    if not env.get(REPO_ENV):                                 # an outer caller may already have set it
        name = repo_name()
        if name:
            env[REPO_ENV] = name
    try:
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=env)
    except Exception as e:                                    # ONLY a failed start is 99
        p, rc, tail = None, 99, ["task_run could not start the launcher: %s" % e]
    if p is not None:
        for raw in p.stdout:
            line = raw.decode("utf-8", errors="replace").rstrip("\r\n")
            try:
                print(line, flush=True)
            except Exception:                                 # echo trouble must never change the task's result
                pass
            if "OUTPUT_URL:" in line:
                urls.append(line.split("OUTPUT_URL:", 1)[1].strip())
            if line.startswith("INPUT_CHECK:"):
                checks.append(line.split("INPUT_CHECK:", 1)[1].strip())
            if line.startswith("OUTPUT_CHECK:"):                # 05/10: output gate of a direction-out task (the department standard §1c)
                ochecks.append(line.split("OUTPUT_CHECK:", 1)[1].strip())
            tail = (tail + [line])[-12:]
        rc = p.wait()
    secs = time.time() - t0
    parts = []
    if checks:                                                # first: it says whether the run even had valid input
        parts.append("INPUT_CHECK: " + " | ".join(checks)[:800])
    if ochecks:                                               # then: whether what it delivered passed its own check
        parts.append("OUTPUT_CHECK: " + " | ".join(ochecks)[:800])
    if urls:
        parts.append("OUTPUT_URL: " + " | ".join(urls))
    parts.append("tail: " + " / ".join(l.strip() for l in tail if l.strip())[-1500:])
    if a.no_log:
        print("[task_run] --no-log: run log NOT written (test run)", flush=True)
    else:
        log_run(a.task, started, secs, rc, " · ".join(parts))
    print("[task_run] %s end exit %d after %ds" % (a.task, rc, secs), flush=True)
    sys.exit(rc)


if __name__ == "__main__":
    main()
