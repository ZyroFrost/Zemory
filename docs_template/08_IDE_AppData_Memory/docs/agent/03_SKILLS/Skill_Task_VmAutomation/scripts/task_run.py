"""task_run.py — the wrapper EVERY scheduled task on the VM runs under (DW repo docs/plan/22 §8).

    python scripts\\task_run.py --task OPS_Daily_StoreInventoryReport_Close -- bin\\OPS_Daily_StoreInventoryReport.cmd close live

Runs the launcher, passes its output through unchanged (the Task Scheduler action appends it to data\\logs\\<task>.log),
then writes ONE row to the warehouse run log `dbo.Log_JobRun` through `dbo._LogTaskRun`: start time · duration · exit
code · every `INPUT_CHECK: OK|NONE|INVALID · <file> · <detail>` line (the input gate, the department standard §5c, 2026-10-05)
· every `OUTPUT_CHECK: OK|INVALID · <file> · <detail>` line (the output gate of a direction-out task, the department standard §1c, 05/10)
· every `OUTPUT_URL: <link>` line the task printed (convention: print it right after each upload) · the last lines
of output. So "did it run, was its input there and valid, was it green, where is the result" is one query for every
automated job, SQL Agent or not.

Rules: the task's exit code is returned AS IS · a run-log failure never fails the task (it prints a warning) ·
the run log goes to the database of the repo whose DATA the running repo uses: a `dept` repo logs to the DW (WAREHOUSE_CONN
in the DW repo's .env), an `app` repo to the `app-data` repo (APPDATA_CONN in its .env), a data repo to its own database.
A data repo whose key has another name points to it in its .env: RUNLOG_CONN_KEY=<KEY> (read before the default keys).
That repo is found by: env RUNLOG_REPO · the marker's `uses.app-data` · `uses.data` · `owner` (work PC) · the repo itself · the
region manager · the first sibling `_DB_*` repo whose .env holds one of the keys (the VM, where docs/ is not deployed and one data
repo sits beside the task). Nothing secret lives here. Shipped by zemory: store part Skill_Task_VmAutomation (its installs);
change the store part, never the repo copy.

Which repo is acting (Rule_Keys_90 step 3): `repo_name()` = the folder name of the repo's root (`git rev-parse
--show-toplevel`, else the folder holding docs/.harness.json), never a naming pattern. The launcher gets it as env
SASIN_REPO, so a task's script sends it as header `X-Sasin-Repo` to an app of the family, or writes it to the log's
acting-repo column when it inserts into the family's database itself. Attribution only, never a permission.
"""
import argparse
import datetime as dt
import os
import socket
import subprocess
import sys
import time
from pathlib import Path


CONN_KEYS = ("WAREHOUSE_CONN", "APPDATA_CONN")     # the DW (role workspace-manager) · the app-data repo (role app-data)
POINTER_KEY = "RUNLOG_CONN_KEY"                    # a data repo names its own key in its .env: RUNLOG_CONN_KEY=<KEY>
REPO_ENV = "SASIN_REPO"                            # the acting repo, handed to the launcher (Rule_Keys_90 step 3)
REPO_MAX = 64


def repo_name(start=None):
    """Folder name of the repo's root: git toplevel, else the folder holding docs/.harness.json, else ''.
    Kept to [A-Za-z0-9._-] and at most 64 characters (what the apps and the log column accept)."""
    import re
    here = Path(start or Path(__file__).resolve().parent)
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


def keys_of(env):
    """The keys to try in one .env: the one it names first, then the defaults."""
    named = env.get(POINTER_KEY)
    return ([named] if named else []) + [k for k in CONN_KEYS if k != named]


def read_env(folder):
    f = Path(folder) / ".env"
    env = {}
    if f.is_file():
        for line in f.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def run_log_conn():
    """(key, connection string, repo) of the database that holds this repo's run log, or None."""
    repo = Path(__file__).resolve().parent.parent
    cands = [Path(os.environ["RUNLOG_REPO"])] if os.environ.get("RUNLOG_REPO") else []
    try:                                                # work PC: the marker names the repo whose data it uses
        import json
        m = json.loads((repo / "docs" / ".harness.json").read_text(encoding="utf-8-sig"))
        uses = m.get("uses") if isinstance(m.get("uses"), dict) else {}
        for name in (uses.get("app-data"), uses.get("data"), m.get("owner")):
            if isinstance(name, str) and name:
                cands.append(repo.parent / name)
    except Exception:
        pass
    cands.append(repo)                                  # a data repo (DW, the app-data repo) logs to its own database
    try:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from region_values import manager_root
        mgr = manager_root(str(Path(__file__).resolve().parent))
        if mgr:
            cands.append(Path(mgr))
    except Exception:
        pass
    try:                                                # the VM: the one managing repo deployed beside this one
        cands += sorted(p for p in repo.parent.iterdir() if p.is_dir() and p.name.startswith("_DB_"))
    except Exception:
        pass
    for c in cands:
        env = read_env(c)
        for k in keys_of(env):
            if env.get(k):
                return k, env[k], c.name
    return None


def log_run(task, started, seconds, rc, message):
    try:
        import pyodbc
        found = run_log_conn()
        if not found:
            print("[task_run] WARNING: no %s (or a key named by %s) found — run not logged" % (" / ".join(CONN_KEYS), POINTER_KEY), flush=True)
            return
        key, conn, where = found
        cn = pyodbc.connect(conn, timeout=30, autocommit=True)
        cn.execute("EXEC dbo._LogTaskRun @TaskName=?, @StartedAt=?, @DurationSeconds=?, @ExitCode=?, @Message=?, @ServerName=?",
                   task, started.replace(microsecond=0), int(seconds), int(rc), message[:4000], socket.gethostname())
        cn.close()
        print("[task_run] logged to Log_JobRun (%s of %s): %s exit %d (%ds)" % (key, where, task, rc, seconds), flush=True)
    except Exception as e:                                    # never fail the task because the log could not be written
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
