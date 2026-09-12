#!/usr/bin/env python3
"""Check a non-app project against the zemory folder standard.

Standard library only, no install required - it runs inside the Cowork VM as well
as on a normal machine. Read-only: it never creates, moves or deletes anything.

Usage:
    python check_structure.py [project_root]     # defaults to cwd

Exit codes:
    0  no blocking deviation
    1  at least one blocking deviation
"""

import json
import os
import re
import sys

# Slot names declared by the standard. Anything else at top level is reported as
# unknown - the agent decides whether it is a real concern or a misplaced folder.
KNOWN_SLOTS = {
    "docs", "docs_visual", "reports", "models", "content", "design",
    "tasks", "templates", "sources", "measures", "queries", "pipelines",
    "notebooks", "fixtures", "assets", "scripts", "config", "attic",
    "data", "exports", "share",
}
DELIVERABLES = ["reports", "models", "content", "design"]
# The four MANDATORY sections of tasks/NN_*/spec.md (the shape lives in reference/conventions.md).
# LOOSE matching: fold the diacritics away, then look for keywords in the heading lines. It does not demand exact
# wording, and it does not demand diacritics - everyone writes headings differently, and a strict key raises false alarms.
SPEC_SECTIONS = [
    ("Nhip", r"nhip|cadence|tan suat"),
    ("Cau dat lich", r"dat lich|cau lenh lich|schedule prompt"),
    ("Cac buoc", r"cac buoc|buoc lam|quy trinh lam|steps"),
    ("San pham giao di", r"san pham|deliverable|dau ra|output"),
]


def fold(s):
    """Strip Vietnamese diacritics and lower-case, so headings match without being forced to carry diacritics."""
    import unicodedata

    out = unicodedata.normalize("NFD", s).lower()
    out = "".join(c for c in out if not unicodedata.combining(c))
    return out.replace("đ", "d")  # a crossed d does not decompose under NFD
REQUIRED_DOCS = ["01_CONSTITUTION.md", "02_RULES.md", "05_TODO.md", "06_CHANGES.md"]
MUST_IGNORE = ["data/", "exports/", ".env"]
# Tooling and OS folders that legitimately sit at the root.
ROOT_EXEMPT = {".git", ".github", ".vscode", ".idea", ".claude", "node_modules", "__pycache__"}

NUMBERED = re.compile(r"^(\d{2})_")

findings = []  # (severity, area, message)


def add(sev, area, msg):
    findings.append((sev, area, msg))


def subdirs(path):
    if not os.path.isdir(path):
        return []
    return sorted(d for d in os.listdir(path) if os.path.isdir(os.path.join(path, d)))


def check_required_roles(root):
    """Three roles are mandatory: AGENTS.md, docs/, at least one deliverable."""
    if not os.path.isfile(os.path.join(root, "AGENTS.md")):
        add("BLOCK", "role", "AGENTS.md is missing at the root")
    if not os.path.isdir(os.path.join(root, "docs")):
        add("BLOCK", "role", "the docs/ folder is missing")
    present = [d for d in DELIVERABLES if os.path.isdir(os.path.join(root, d))]
    if not present:
        add("BLOCK", "vai tro",
            "there is no deliverable folder (at least 1 of: %s)" % " | ".join(DELIVERABLES))


def check_docs(root):
    agent = os.path.join(root, "docs", "agent")
    if not os.path.isdir(agent):
        add("BLOCK", "docs", "docs/agent/ is missing")
        return
    for name in REQUIRED_DOCS:
        if not os.path.isfile(os.path.join(agent, name)):
            add("BLOCK", "docs", "docs/agent/%s is missing" % name)
    harness = os.path.join(root, "docs", ".harness.json")
    if not os.path.isfile(harness):
        add("BLOCK", "docs", "docs/.harness.json is missing")
        return
    try:
        # utf-8-sig: editors on Windows often save this file with a BOM.
        with open(harness, encoding="utf-8-sig") as fh:
            cfg = json.load(fh)
    except (OSError, ValueError) as exc:
        add("BLOCK", "docs", ".harness.json is unreadable: %s" % exc)
        return
    if cfg.get("profile") != "non-app":
        add("INFO", "docs", "the profile in .harness.json is '%s', not 'non-app'"
            % cfg.get("profile"))


def check_empty_and_unknown(root):
    """No empty folders; flag top-level names the standard does not declare."""
    for name in subdirs(root):
        if name.startswith(".") or name in ROOT_EXEMPT:
            continue
        path = os.path.join(root, name)
        if not os.listdir(path):
            add("BLOCK", "empty", "empty folder: %s/ - the standard forbids empty folders" % name)
        elif name not in KNOWN_SLOTS:
            add("INFO", "stray", "this folder matches no slot: %s/ - is it misplaced, or a real concern?" % name)


def check_task_mirror(root):
    """A numbered task must carry the same NN across tasks/, pipelines/ and data/."""
    def numbered(folder):
        out = {}
        for d in subdirs(os.path.join(root, folder)):
            m = NUMBERED.match(d)
            if m:
                out[m.group(1)] = d
        return out

    tasks, pipes, datas = numbered("tasks"), numbered("pipelines"), numbered("data")
    # The REAL schedule lives in Cowork's recurring tasks, not in the repo. If the repo does not
    # record it, nobody can tell which schedules the project is running, and whoever comes next will not know
    # which prompt was used. Symmetric with a workflow: a workflow is a file AND a row in the
    # index. So tasks/SCHEDULE.md is MANDATORY once recurring work exists, and every task
    # must have a row in it.
    if tasks:
        sched = os.path.join(root, "tasks", "SCHEDULE.md")
        if not os.path.isfile(sched):
            add("BLOCK", "task", "tasks/ holds recurring work but tasks/SCHEDULE.md (the schedule index) is missing")
        else:
            try:
                with open(sched, encoding="utf-8") as fh:
                    roster = fh.read()
            except OSError:
                roster = ""
            for nn, name in sorted(tasks.items()):
                if name not in roster:
                    add("BLOCK", "task", "tasks/SCHEDULE.md has no row for tasks/%s" % name)
            for m in re.finditer(r"^\s*\|\s*([0-9]{2}_[A-Za-z0-9_\-]+)\s*\|", roster, re.M):
                if m.group(1) not in tasks.values():
                    add("INFO", "task", "tasks/SCHEDULE.md has a row '%s' with no matching folder" % m.group(1))
    for nn, name in sorted(tasks.items()):
        spec = os.path.join(root, "tasks", name, "spec.md")
        if not os.path.isfile(spec):
            add("BLOCK", "task", "tasks/%s/ is missing spec.md" % name)
        else:
            # A recurring schedule runs in a BLANK session: spec.md must hold enough to finish the
            # job on its own, and the scheduling prompt is only a line pointing at it. Missing any of
            # the four sections below means the recurring session has to GUESS -> block it.
            try:
                with open(spec, encoding="utf-8") as fh:
                    heads = [ln for ln in fh.read().splitlines() if ln.lstrip().startswith("#")]
            except OSError:
                heads = []
            blob = fold("\n".join(heads))
            for label, pat in SPEC_SECTIONS:
                if not re.search(pat, blob):
                    add("BLOCK", "task", "tasks/%s/spec.md is missing the section '%s'" % (name, label))
        if pipes and nn not in pipes:
            add("INFO", "mirror", "tasks/%s has no matching pipelines/%s_*" % (name, nn))
        if datas and nn in datas and datas[nn] != name:
            add("INFO", "mirror", "so %s lech ten: tasks/%s vs data/%s" % (nn, name, datas[nn]))
    for nn, name in sorted(pipes.items()):
        if nn not in tasks:
            add("INFO", "mirror", "pipelines/%s has no matching tasks/%s_*" % (name, nn))


def check_gitignore(root):
    path = os.path.join(root, ".gitignore")
    if not os.path.isdir(os.path.join(root, ".git")):
        return  # not a git repo - nothing to enforce
    if not os.path.isfile(path):
        add("BLOCK", "gitignore", "there is a .git/ but no .gitignore")
        return
    with open(path, encoding="utf-8", errors="replace") as fh:
        body = fh.read()
    lines = {ln.strip().rstrip("/") for ln in body.splitlines() if ln.strip()}
    for entry in MUST_IGNORE:
        target = entry.rstrip("/")
        if not os.path.exists(os.path.join(root, target)):
            continue
        if target not in lines:
            add("BLOCK", "gitignore", "%s exists but is not in .gitignore" % entry)


def check_adhoc_marker(root):
    adhoc = os.path.join(root, "data", "adhoc")
    if os.path.isdir(adhoc) and not os.path.isfile(os.path.join(adhoc, "README.md")):
        add("INFO", "adhoc", "data/adhoc/ is missing a README.md marker")


STAGES = ("01_raw", "02_processing", "03_output")


def check_data_stages(root):
    """data/<task>/ must be split into 3 stages; adhoc/ must NOT be (loose files, disposable).

    The three stages have three different LIFETIMES: the input cannot be recreated · the intermediate
    can · what was handed over must be kept for comparison. Piled in one place, nobody dares delete
    anything at tidy-up time, and one wrong overwrite onto the input loses it for real.
    """
    data = os.path.join(root, "data")
    if not os.path.isdir(data):
        return
    for name in sorted(os.listdir(data)):
        d = os.path.join(data, name)
        if not os.path.isdir(d) or name == "adhoc":
            continue
        have = [s for s in STAGES if os.path.isdir(os.path.join(d, s))]
        if not have:
            add("INFO", "data-3-chang",
                "data/%s/ is not split into 3 stages (01_raw · 02_processing · 03_output)" % name)
        elif len(have) < len(STAGES):
            add("INFO", "data-3-chang",
                "data/%s/ is missing stages: %s" % (name, " ".join(s for s in STAGES if s not in have)))


def main():
    root = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
    if not os.path.isdir(root):
        print("Folder not found: %s" % root)
        return 2

    for check in (check_required_roles, check_docs, check_empty_and_unknown,
                  check_task_mirror, check_gitignore, check_adhoc_marker,
                  check_data_stages):
        check(root)

    print("Folder standard check — %s" % root)
    print("-" * 72)
    if not findings:
        print("  OK — no drift from the standard.")
        return 0

    blocking = [f for f in findings if f[0] == "BLOCK"]
    for sev, area, msg in sorted(findings, key=lambda f: (f[0] != "BLOCK", f[1])):
        mark = "PHAI SUA" if sev == "BLOCK" else "xem xet "
        print("  [%s] %-10s %s" % (mark, area, msg))
    print("-" * 72)
    print("  %d to fix · %d to consider" % (len(blocking), len(findings) - len(blocking)))
    print()
    print("  Note: 'consider' is NOT an error — the machine is only saying it matches no slot.")
    print("  A person or the agent decides which slot it belongs to, or whether it is a real concern to add to the standard.")
    print("  NEVER move or delete anything on the strength of this table — propose it, and wait for the user to agree.")
    return 1 if blocking else 0


if __name__ == "__main__":
    sys.exit(main())
