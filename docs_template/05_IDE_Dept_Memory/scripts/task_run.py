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
the warehouse connection comes from the sibling warehouse repo `..\\the region manager\\.env` (WAREHOUSE_CONN) — the
same file the task already reads; nothing secret lives here. Shipped by zemory: store part Skill_Task_VmAutomation (its installs);
change the store part, never the repo copy.
"""
import argparse
import datetime as dt
import os
import socket
import subprocess
import sys
import time
from pathlib import Path


def dw_env():
    """WAREHOUSE_CONN from the region manager's .env (region_values.py finds the manager: DW_REPO, the region root, or the
    sibling repo holding WAREHOUSE_CONN - the server layout)."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from region_values import manager_root
    mgr = manager_root(str(Path(__file__).resolve().parent))
    for c in ([Path(mgr)] if mgr else []):
        f = c / ".env"
        if f.exists():
            env = {}
            for line in f.read_text(encoding="utf-8").splitlines():
                if "=" in line and not line.lstrip().startswith("#"):
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip().strip('"').strip("'")
            return env
    return {}


def log_run(task, started, seconds, rc, message):
    try:
        import pyodbc
        conn = dw_env().get("WAREHOUSE_CONN")
        if not conn:
            print("[task_run] WARNING: no WAREHOUSE_CONN found — run not logged", flush=True)
            return
        cn = pyodbc.connect(conn, timeout=30, autocommit=True)
        cn.execute("EXEC dbo._LogTaskRun @TaskName=?, @StartedAt=?, @DurationSeconds=?, @ExitCode=?, @Message=?, @ServerName=?",
                   task, started.replace(microsecond=0), int(seconds), int(rc), message[:4000], socket.gethostname())
        cn.close()
        print("[task_run] logged to Log_JobRun: %s exit %d (%ds)" % (task, rc, seconds), flush=True)
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
    try:
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
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
