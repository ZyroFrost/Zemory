# -*- coding: utf-8 -*-
"""Values of the region a department repo belongs to (plan/28 §0k ④ · §2e).

The workspace manager is the repo that holds the shared warehouse and the workspace's real values. Found, in order:
  1. the environment variable DW_REPO (a path)
  2. the repo's own marker: docs/.harness.json names "owner": "<folder>" - that folder, looked for up to three levels above
     the repo and two levels below each of those (Struc_Region_Workspace)
  3. a sibling repo whose .env holds WAREHOUSE_CONN, the current repo excepted (a server layout without the owner folder)
Real values live in <manager>/data/region/values.json (git does not track data/): warehouse_server · theme_file ·
icons_dir · vm_ssh_alias. Nothing company-specific lives in the tools.
"""
import json
import os


def _is_repo(d):
    return os.path.isfile(os.path.join(d, 'docs', '.harness.json')) or os.path.isdir(os.path.join(d, '.git'))


def _repo_root(start):
    cur = os.path.abspath(start)
    while True:
        if os.path.isfile(os.path.join(cur, 'docs', '.harness.json')):
            return cur
        up = os.path.dirname(cur)
        if up == cur:
            return None
        cur = up


def _find_repo(name, frm):
    """A repo of the workspace by folder name: up to three levels above frm, two levels below each of those."""
    def seek(d, depth):
        try:
            names = sorted(os.listdir(d))
        except OSError:
            return None
        for e in names:
            if e.startswith('.') or e == 'node_modules':
                continue
            p = os.path.join(d, e)
            if not os.path.isdir(p):
                continue
            if e == name and _is_repo(p):
                return p
            if depth < 2 and not _is_repo(p):
                hit = seek(p, depth + 1)
                if hit:
                    return hit
        return None
    up = os.path.dirname(frm)
    for _ in range(3):
        hit = seek(up, 0)
        if hit:
            return hit
        nxt = os.path.dirname(up)
        if nxt == up:
            break
        up = nxt
    return None


def _owner(start):
    root = _repo_root(start)
    if not root:
        return None
    try:
        name = json.load(open(os.path.join(root, 'docs', '.harness.json'), encoding='utf-8-sig')).get('owner')
    except Exception:
        return None
    return _find_repo(name, root) if isinstance(name, str) and name else None


def _env_has_conn(folder):
    f = os.path.join(folder, '.env')
    try:
        return any(l.strip().startswith('WAREHOUSE_CONN=') for l in open(f, encoding='utf-8', errors='ignore'))
    except OSError:
        return False


def manager_root(start):
    """The region manager's folder, or None."""
    if os.environ.get('DW_REPO') and os.path.isdir(os.environ['DW_REPO']):
        return os.environ['DW_REPO']
    start = os.path.abspath(start)
    m = _owner(start)
    if m:
        return m
    # no owner found: a sibling of the repo the start sits in, holding the warehouse connection
    cur = start
    while True:
        parent = os.path.dirname(cur)
        if parent == cur:
            return None
        try:
            names = sorted(os.listdir(parent))
        except OSError:
            names = []
        for n in names:
            p = os.path.join(parent, n)
            if os.path.normcase(p) != os.path.normcase(cur) and os.path.isdir(p) and _env_has_conn(p):
                return p
        cur = parent


def values(start):
    m = manager_root(start)
    if not m:
        return {}
    try:
        return json.load(open(os.path.join(m, 'data', 'region', 'values.json'), encoding='utf-8-sig'))
    except Exception:
        return {}


def value(start, key, default=None):
    return values(start).get(key, default)
