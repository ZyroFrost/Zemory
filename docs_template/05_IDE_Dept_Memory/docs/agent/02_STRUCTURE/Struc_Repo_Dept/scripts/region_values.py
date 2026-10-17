# -*- coding: utf-8 -*-
"""Values of the region a department repo belongs to (plan/28 §0k ④ · §2e).

The region manager is the repo that holds the company's warehouse and the region's real values. Found, in order:
  1. the environment variable DW_REPO (a path)
  2. the region root: an ancestor folder whose docs/.harness.json names "manager": "<folder>" (workstations)
  3. a sibling repo whose .env holds WAREHOUSE_CONN, the current repo excepted (a server layout without the region root)
Real values live in <manager>/data/region/values.json (git does not track data/): warehouse_server · theme_file ·
icons_dir · vm_ssh_alias. Nothing company-specific lives in the tools.
"""
import json
import os


def _marker_manager(cur):
    m = os.path.join(cur, 'docs', '.harness.json')
    if not os.path.isfile(m):
        return None
    try:
        name = json.load(open(m, encoding='utf-8-sig')).get('manager')
    except Exception:
        return None
    p = os.path.join(cur, name) if name else None
    return p if p and os.path.isdir(p) else None


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
    cur = start
    while True:
        m = _marker_manager(cur)
        if m:
            return m
        up = os.path.dirname(cur)
        if up == cur:
            break
        cur = up
    # no region root: a sibling of the repo the start sits in, holding the warehouse connection
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
