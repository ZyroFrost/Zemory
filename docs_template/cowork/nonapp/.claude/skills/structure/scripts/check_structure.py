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
# Bon muc BAT BUOC trong tasks/NN_*/spec.md (khuon o reference/conventions.md).
# Khop LONG: bo dau roi tim tu khoa trong cac dong tieu de. Khong doi dung chu, va
# khong doi co dau - agent moi nguoi dat tieu de mot kieu, khoa chat la bao oan.
SPEC_SECTIONS = [
    ("Nhip", r"nhip|cadence|tan suat"),
    ("Cau dat lich", r"dat lich|cau lenh lich|schedule prompt"),
    ("Cac buoc", r"cac buoc|buoc lam|quy trinh lam|steps"),
    ("San pham giao di", r"san pham|deliverable|dau ra|output"),
]


def fold(s):
    """Bo dau tieng Viet + ha chu thuong, de khop tieu de ma khong ep phai co dau."""
    import unicodedata

    out = unicodedata.normalize("NFD", s).lower()
    out = "".join(c for c in out if not unicodedata.combining(c))
    return out.replace("đ", "d")  # 'd' gach ngang khong tach duoc bang NFD
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
        add("BLOCK", "vai tro", "thieu AGENTS.md o goc")
    if not os.path.isdir(os.path.join(root, "docs")):
        add("BLOCK", "vai tro", "thieu thu muc docs/")
    present = [d for d in DELIVERABLES if os.path.isdir(os.path.join(root, d))]
    if not present:
        add("BLOCK", "vai tro",
            "khong co folder deliverable nao (can >=1 trong: %s)" % " | ".join(DELIVERABLES))


def check_docs(root):
    agent = os.path.join(root, "docs", "agent")
    if not os.path.isdir(agent):
        add("BLOCK", "docs", "thieu docs/agent/")
        return
    for name in REQUIRED_DOCS:
        if not os.path.isfile(os.path.join(agent, name)):
            add("BLOCK", "docs", "thieu docs/agent/%s" % name)
    harness = os.path.join(root, "docs", ".harness.json")
    if not os.path.isfile(harness):
        add("BLOCK", "docs", "thieu docs/.harness.json")
        return
    try:
        # utf-8-sig: editors on Windows often save this file with a BOM.
        with open(harness, encoding="utf-8-sig") as fh:
            cfg = json.load(fh)
    except (OSError, ValueError) as exc:
        add("BLOCK", "docs", ".harness.json khong doc duoc: %s" % exc)
        return
    if cfg.get("profile") != "non-app":
        add("INFO", "docs", "profile trong .harness.json la '%s', khong phai 'non-app'"
            % cfg.get("profile"))


def check_empty_and_unknown(root):
    """No empty folders; flag top-level names the standard does not declare."""
    for name in subdirs(root):
        if name.startswith(".") or name in ROOT_EXEMPT:
            continue
        path = os.path.join(root, name)
        if not os.listdir(path):
            add("BLOCK", "rong", "thu muc rong: %s/ - chuan cam tao folder rong" % name)
        elif name not in KNOWN_SLOTS:
            add("INFO", "la", "thu muc khong khop slot nao: %s/ - dat sai cho, hay la concern that?" % name)


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
    # Lich THAT nam o tac vu dinh ky cua Cowork, khong nam trong repo. Neu repo khong
    # ghi lai thi khong ai doc ra duoc du an dang chay lich gi, va nguoi sau khong biet
    # cau nao da dan. Doi xung voi quy trinh: quy trinh la file VA co mot dong trong
    # danh muc. Nen tasks/SCHEDULE.md la BAT BUOC khi da co viec dinh ky, va moi task
    # phai co mot dong trong do.
    if tasks:
        sched = os.path.join(root, "tasks", "SCHEDULE.md")
        if not os.path.isfile(sched):
            add("BLOCK", "task", "tasks/ co viec dinh ky nhung thieu tasks/SCHEDULE.md (danh muc lich)")
        else:
            try:
                with open(sched, encoding="utf-8") as fh:
                    roster = fh.read()
            except OSError:
                roster = ""
            for nn, name in sorted(tasks.items()):
                if name not in roster:
                    add("BLOCK", "task", "tasks/SCHEDULE.md khong co dong cho tasks/%s" % name)
            for m in re.finditer(r"^\s*\|\s*([0-9]{2}_[A-Za-z0-9_\-]+)\s*\|", roster, re.M):
                if m.group(1) not in tasks.values():
                    add("INFO", "task", "tasks/SCHEDULE.md co dong '%s' ma khong co thu muc tuong ung" % m.group(1))
    for nn, name in sorted(tasks.items()):
        spec = os.path.join(root, "tasks", name, "spec.md")
        if not os.path.isfile(spec):
            add("BLOCK", "task", "tasks/%s/ thieu spec.md" % name)
        else:
            # Lich dinh ky chay mot phien TRANG: spec.md phai tu chua du de lam xong
            # viec, va cau dat lich chi la mot dong tro vao no. Thieu bat cu muc nao
            # trong bon muc duoi la phien dinh ky phai DOAN -> chan luon.
            try:
                with open(spec, encoding="utf-8") as fh:
                    heads = [ln for ln in fh.read().splitlines() if ln.lstrip().startswith("#")]
            except OSError:
                heads = []
            blob = fold("\n".join(heads))
            for label, pat in SPEC_SECTIONS:
                if not re.search(pat, blob):
                    add("BLOCK", "task", "tasks/%s/spec.md thieu muc '%s'" % (name, label))
        if pipes and nn not in pipes:
            add("INFO", "mirror", "tasks/%s khong co pipelines/%s_* tuong ung" % (name, nn))
        if datas and nn in datas and datas[nn] != name:
            add("INFO", "mirror", "so %s lech ten: tasks/%s vs data/%s" % (nn, name, datas[nn]))
    for nn, name in sorted(pipes.items()):
        if nn not in tasks:
            add("INFO", "mirror", "pipelines/%s khong co tasks/%s_* tuong ung" % (name, nn))


def check_gitignore(root):
    path = os.path.join(root, ".gitignore")
    if not os.path.isdir(os.path.join(root, ".git")):
        return  # not a git repo - nothing to enforce
    if not os.path.isfile(path):
        add("BLOCK", "gitignore", "co .git/ nhung khong co .gitignore")
        return
    with open(path, encoding="utf-8", errors="replace") as fh:
        body = fh.read()
    lines = {ln.strip().rstrip("/") for ln in body.splitlines() if ln.strip()}
    for entry in MUST_IGNORE:
        target = entry.rstrip("/")
        if not os.path.exists(os.path.join(root, target)):
            continue
        if target not in lines:
            add("BLOCK", "gitignore", "%s ton tai nhung khong nam trong .gitignore" % entry)


def check_adhoc_marker(root):
    adhoc = os.path.join(root, "data", "adhoc")
    if os.path.isdir(adhoc) and not os.path.isfile(os.path.join(adhoc, "README.md")):
        add("INFO", "adhoc", "data/adhoc/ thieu README.md lam marker")


def main():
    root = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
    if not os.path.isdir(root):
        print("Khong tim thay thu muc: %s" % root)
        return 2

    for check in (check_required_roles, check_docs, check_empty_and_unknown,
                  check_task_mirror, check_gitignore, check_adhoc_marker):
        check(root)

    print("Kiem chuan thu muc — %s" % root)
    print("-" * 72)
    if not findings:
        print("  OK — khong lech chuan.")
        return 0

    blocking = [f for f in findings if f[0] == "BLOCK"]
    for sev, area, msg in sorted(findings, key=lambda f: (f[0] != "BLOCK", f[1])):
        mark = "PHAI SUA" if sev == "BLOCK" else "xem xet "
        print("  [%s] %-10s %s" % (mark, area, msg))
    print("-" * 72)
    print("  %d phai sua · %d dang xem xet" % (len(blocking), len(findings) - len(blocking)))
    print()
    print("  Ghi chu: 'xem xet' KHONG phai loi — chi may bao la khong khop slot nao.")
    print("  Nguoi/agent quyet dinh no thuoc slot nao, hay la concern that can them vao chuan.")
    print("  TUYET DOI khong tu di chuyen/xoa dua tren bang nay — de xuat, cho user gat.")
    return 1 if blocking else 0


if __name__ == "__main__":
    sys.exit(main())
