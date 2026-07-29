#!/usr/bin/env python3
"""Verify a freshly installed harness against the MANIFEST inside BOOTSTRAP.md.

Standard library only, no install required - it runs inside the Cowork VM as well
as on a normal machine. Read-only: it never creates, moves or deletes anything.

This replaces counting lines by hand. A miscount is easy to make and silently
scaffolds a broken harness, so the check is mechanical.

Usage:
    python check_install.py                     # BOOTSTRAP.md next to this script, project = cwd
    python check_install.py <project_dir>
    python check_install.py <project_dir> <path/to/BOOTSTRAP.md>

Exit codes:
    0  every file matches the manifest
    1  at least one file is missing or has the wrong line count
    2  could not read BOOTSTRAP.md or its manifest
"""

import os
import re
import sys

# | 8 | `.claude/skills/structure/SKILL.md` | `<RAW>/.claude/skills/structure/SKILL.md` | 96 |
ROW = re.compile(r"^\|\s*\d+\s*\|\s*`([^`]+)`\s*\|\s*`<RAW>/([^`]+)`\s*\|\s*(\d+)\s*\|\s*$", re.M)
SKILL_PATH = re.compile(r"^\.claude/skills/([a-z0-9-]+)/SKILL\.md$")


def line_count(text):
    """Count lines the way `wc -l` does: number of newline-terminated lines."""
    n = text.count("\n")
    return n if text.endswith("\n") or not text else n + 1


def read(path):
    with open(path, encoding="utf-8-sig") as fh:
        return fh.read()


def find_bootstrap(explicit):
    if explicit:
        return explicit
    here = os.path.dirname(os.path.abspath(__file__))
    local = os.path.join(here, "BOOTSTRAP.md")
    return local if os.path.isfile(local) else None


def main():
    project = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.getcwd()
    bootstrap = find_bootstrap(sys.argv[2] if len(sys.argv) > 2 else None)

    if not bootstrap or not os.path.isfile(bootstrap):
        print("Khong tim thay BOOTSTRAP.md.")
        print("Chay lai kem duong dan:  python check_install.py <thu-muc-du-an> <duong-dan/BOOTSTRAP.md>")
        return 2

    rows = ROW.findall(read(bootstrap))
    if not rows:
        print("Doc duoc BOOTSTRAP.md nhung khong tim thay bang MANIFEST ben trong.")
        return 2

    print("Kiem bo chuan vua cai")
    print("  du an     : %s" % project)
    print("  doi chieu : %s" % bootstrap)
    print("-" * 74)

    missing, wrong, ok = [], [], 0
    for target, _source, want in rows:
        want = int(want)
        path = os.path.join(project, target.replace("/", os.sep))
        if not os.path.isfile(path):
            missing.append(target)
            print("  [THIEU ] %-52s chua co file" % target)
            continue
        got = line_count(read(path))
        if got != want:
            wrong.append((target, want, got))
            print("  [LECH  ] %-52s ky vong %-4d thuc %d" % (target, want, got))
        else:
            ok += 1

    # Every skill must carry a name and a description - the description is the only
    # thing that decides whether the skill is ever picked up.
    bad_meta = []
    for target, _source, _want in rows:
        m = SKILL_PATH.match(target)
        if not m:
            continue
        path = os.path.join(project, target.replace("/", os.sep))
        if not os.path.isfile(path):
            continue
        body = read(path)
        name = re.search(r"^name:\s*(.+)$", body, re.M)
        desc = re.search(r"^description:\s*(.+)$", body, re.M)
        name = name.group(1).strip() if name else ""
        desc = desc.group(1).strip() if desc else ""
        if not re.fullmatch(r"[a-z0-9-]{1,64}", name or ""):
            bad_meta.append("%s: ten khong hop le (%r)" % (target, name))
        elif name != m.group(1):
            bad_meta.append("%s: ten '%s' khong khop thu muc '%s'" % (target, name, m.group(1)))
        if not desc:
            bad_meta.append("%s: thieu dong mo ta" % target)
        elif len(desc) > 1024:
            bad_meta.append("%s: mo ta dai %d ky tu (toi da 1024)" % (target, len(desc)))
    for msg in bad_meta:
        print("  [MOTA  ] %s" % msg)

    harness = os.path.join(project, "docs", ".harness.json")
    no_harness = not os.path.isfile(harness)
    if no_harness:
        print("  [THIEU ] docs/.harness.json                              chua tao")

    print("-" * 74)
    total = len(rows)
    print("  Khop %d/%d file." % (ok, total))
    if not (missing or wrong or bad_meta or no_harness):
        print("  OK - bo chuan da cai dung.")
        return 0

    if missing:
        print("  %d file chua co    -> tai lai dung nhung file do." % len(missing))
    if wrong:
        print("  %d file lech so dong -> file bi cat bot hoac bi sua khi chep." % len(wrong))
        print("     Chep lai NGUYEN VAN, khong tom tat, khong dien dat lai.")
    if bad_meta:
        print("  %d quy trinh sai phan mo ta -> no se khong bao gio duoc goi ra." % len(bad_meta))
    if no_harness:
        print("  Thieu docs/.harness.json -> go thang noi dung nay vao:")
        print('     { "docs": "docs/agent", "profile": "non-app", "standard": "2.0" }')
    print()
    print("  CHUA sua xong thi CHUA duoc bao la da dung xong.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
