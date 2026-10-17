# -*- coding: utf-8 -*-
"""Lay out the model diagram of a .pbip report by the house standard (skill pbi-pbip 1c, user 2026-09-27).

STANDARD TOOL - one source for every department (user 2026-09-28: 'the gate is the standard').
Shipped by zemory: store part Skill_PBI_Pbip (its installs), assembled into scripts/ of every department repo. Do not
fork a repo copy - change the store part, then zemory sync. Company values (warehouse server, theme, icons, VM alias)
come from region_values.py (the region manager's data/region/values.json), never from this code.
Department differences live in the repo's config/ (older repos: docs/hooks/), never in this code.

    python scripts/pbi_diagram.py <report folder>          # writes <SemanticModel>/diagramLayout.json ("All tables")
    python scripts/pbi_diagram.py <report folder> --dry    # print the plan, write nothing

Rules (why each one exists is in pbip 1c):
  * every card is full length: height = 80 + 26 x (columns + measures), on the 20px grid (all fields visible)
  * three tiers, at most 13 columns (9 until 2026-09-29, 8 until 2026-09-28): top facts BOTTOM-aligned / dims CENTRE-aligned / bottom facts TOP-aligned,
    so the cable channels between tiers stay empty whatever the card heights (Power BI draws a line out of the
    side facing the other card, at that height, then turns into the target - a card on that path hides the line)
  * inside a tier: crossing-minimised order (ELK Layered if node + elkjs are installed, barycenter otherwise),
    then the tallest cards moved to the two ends, short ones in the middle
  * a fact that links only to the hub dim and one small dim with no line going down is tucked UNDER that small
    dim (keeps the rows at 8); lookups (one-side table used by one fact) sit next to their fact, outside the tiers
  * lone tables (Parameter_*, no relationship) fill the free space inside the grid; #Measure (always the
    longest) gets column 9 on its own, as long as the whole diagram
Per-report tier choices live in config/pbi-diagram.json {folder: {"top": [...], "bottom": [...],
"tuck": {fact: dim}}}; without an entry the tiers are chosen automatically.
Close Power BI Desktop before running; reopen and wait ~2 minutes - Model view draws the lines late.
"""
import copy
import glob
import json
import os
import re
import shutil
import subprocess
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
CFG = next((p for p in (os.path.join(REPO, d, 'pbi-diagram.json') for d in ('config', os.path.join('docs', 'hooks')))
            if os.path.isfile(p)), os.path.join(REPO, 'config', 'pbi-diagram.json'))  # config/ first; older repos: docs/hooks/
W, STEP, CH = 234, 280, 180      # card width, column step, cable channel between tiers
CH_TOP = 320                     # top channel (promotion facts -> 8 dims), measured to the TALLEST dim: 180 was too tight,
                                 # the lines of 8 dims piled up (user 2026-09-27, the '3 tiers' trial had 320)
MAX_COLS = 13                    # user 2026-09-29 (was 9): hourly agg + electricity + item-cost links = 13 sales facts


def ceil20(v):
    return -(-int(v) // 20) * 20


def load_model(report_dir):
    sm = glob.glob(os.path.join(report_dir, '*.SemanticModel'))[0]
    rel = open(os.path.join(sm, 'definition', 'relationships.tmdl'), encoding='utf-8').read()
    pairs = [(a.split('.')[0].strip("'"), b.split('.')[0].strip("'"))
             for a, b in re.findall(r'fromColumn: (\S+)\s+toColumn: (\S+)', rel)]
    tags, nfield = {}, {}
    for f in glob.glob(os.path.join(sm, 'definition', 'tables', '*.tmdl')):
        t = open(f, encoding='utf-8').read()
        m = re.search(r"^table\s+('(?:[^']|'')+'|\S+)\s*$", t, re.M)
        n = m.group(1).strip("'").replace("''", "'")
        tags[n] = re.search(r"^\tlineageTag:\s*(\S+)", t[m.end():], re.M).group(1)
        nfield[n] = len(re.findall(r'^\t(?:column|measure) ', t, re.M))
    return sm, pairs, tags, nfield


def crossing_order(tables, edges):
    """x-rank of every table: ELK Layered (node + scripts/node_modules/elkjs) or a barycenter fallback."""
    js = os.path.join(REPO, 'scripts', 'diagram_order.js')
    if shutil.which('node') and os.path.isdir(os.path.join(REPO, 'scripts', 'node_modules', 'elkjs')):
        g = {'nodes': tables, 'edges': edges, 'w': W, 'h': 180, 'direction': 'DOWN'}
        out = subprocess.run(['node', js], input=json.dumps(g), capture_output=True, text=True, check=True).stdout
        return {k: v[0] for k, v in json.loads(out).items()}, 'ELK'
    rank = {t: i for i, t in enumerate(sorted(tables))}
    nb = {t: [] for t in tables}
    for a, b in edges:
        nb[a].append(b)
        nb[b].append(a)
    for _ in range(12):                         # barycenter sweeps
        rank = {t: (sum(rank[n] for n in nb[t]) / len(nb[t]) if nb[t] else rank[t]) for t in tables}
        rank = {t: i for i, t in enumerate(sorted(tables, key=lambda t: (rank[t], t)))}
    return rank, 'barycenter'


def plan(report_dir):
    folder = os.path.basename(os.path.normpath(report_dir))
    sm, pairs, tags, nfield = load_model(report_dir)
    tables = sorted(tags)
    H = {n: ceil20(80 + 26 * c) for n, c in nfield.items()}
    linked = {x for p in pairs for x in p}
    lone = [t for t in tables if t not in linked]
    dims = [t for t in tables if t.startswith('Dim_') and t in linked]
    one_side = {}
    for a, b in pairs:
        one_side.setdefault(b, set()).add(a)
    look = {t for t in tables if t in linked and t not in dims and t not in {a for a, _ in pairs}
            and len(one_side.get(t, ())) == 1}
    owner = {t: next(iter(one_side[t])) for t in look}
    facts = [t for t in tables if t in linked and t not in dims and t not in look]
    edges = [[b, a] if b in dims else [a, b] for a, b in pairs if b in dims or b in look]
    xr, engine = crossing_order(tables, edges)

    cfg = {}
    if os.path.exists(CFG):
        allcfg = json.load(open(CFG, encoding='utf-8'))
        # the IP and DR builds of one report share its tiers (user 2026-09-28)
        twin = re.sub(r'_(\d\d)(IP|DR)_', lambda m: '_%s%s_' % (m.group(1), 'DR' if m.group(2) == 'IP' else 'IP'), folder)
        cfg = allcfg.get(folder) or allcfg.get(twin, {})
    tuck = dict(cfg.get('tuck', {}))
    if cfg.get('top') or cfg.get('bottom'):
        top = [t for t in cfg.get('top', []) if t in facts]
        bottom = [t for t in facts if t not in top and t not in tuck]
    else:
        seq = sorted(facts, key=lambda t: xr[t])
        if len(seq) <= MAX_COLS:
            top, bottom = [], seq
        else:
            half = min(MAX_COLS, (len(seq) + 1) // 2)
            top, bottom = seq[:half], seq[half:]
    for t in list(bottom[MAX_COLS:]):
        print('WARN more than %d facts for the bottom tier: %s stays in the row' % (MAX_COLS, t))

    def edges_out(names):
        names = sorted(names, key=lambda t: xr[t])
        if not names:
            return names
        hs = sorted(H[t] for t in names)
        med = hs[len(hs) // 2]
        tall = sorted([t for t in names if H[t] > 1.4 * med], key=lambda t: -H[t])
        mid = [t for t in names if t not in tall]
        left, right = [], []
        for k, t in enumerate(tall):
            (right if k % 2 == 0 else left).append(t)
        return left + mid + right[::-1]          # tallest outermost right, next tallest outermost left

    top, dims, bottom = edges_out(top), edges_out(dims), edges_out(bottom)
    ncols = max(len(top), len(dims), len(bottom), 1)
    off = lambda row: ((ncols - len(row)) // 2) * STEP      # whole steps: every row on the same column grid
    pos = {}
    top_line = max([H[t] for t in top] or [0])
    for i, t in enumerate(top):
        pos[t] = (off(top) + STEP * i, top_line - H[t])
    band_half = max(H[t] for t in dims) // 2 if dims else 0
    mid_center = top_line + (CH_TOP if top else 0) + band_half
    for i, t in enumerate(dims):
        pos[t] = (off(dims) + STEP * i, mid_center - H[t] // 2)
    if tuck:
        low_body = max(H[t] // 2 for t in dims[1:-1]) if len(dims) > 2 else 0
        y = mid_center + low_body + 60
        for f in sorted(tuck, key=lambda f: pos[tuck[f]][0]):
            pos[f] = (pos[tuck[f]][0], y)
            y += H[f] // 2 + 60                  # the next one starts below this one's line (mid-height)
        band_half = max(band_half, max(pos[f][1] + H[f] for f in tuck) - mid_center + 20)
    bottom_top = mid_center + band_half + CH
    for i, t in enumerate(bottom):
        pos[t] = (off(bottom) + STEP * i, bottom_top)

    last = off(dims) + STEP * (ncols - 1)
    for f in sorted(set(owner.values()), key=lambda f: f):
        lks = sorted(k for k, v in owner.items() if v == f)
        fx = pos[f][0]
        xs = [fx + STEP * (k - (len(lks) - 1) // 2) for k in range(len(lks))]
        if max(xs) > last:
            xs = [x - (max(xs) - last) for x in xs]
        if min(xs) < 0:
            xs = [x - min(xs) for x in xs]
        if f in top:
            for x, lk in zip(xs, lks):
                pos[lk] = (x, min([pos[t][1] for t in top if pos[t][0] in xs + [fx]]) - CH // 2 - H[lk])
        else:
            y = max([pos[t][1] + H[t] for t in bottom + list(tuck) if pos[t][0] in xs + [fx]] or [bottom_top]) + CH // 2
            for x, lk in zip(xs, lks):
                pos[lk] = (x, y)

    # lone tables (not #Measure): free space inside the grid - above short top cards, below short bottom cards
    lk_cols = {pos[t][0] for t in look}
    free = []
    for i in range(ncols):
        x = off(dims) + STEP * i
        if x in lk_cols:
            continue
        up = [pos[t][1] for t in top if pos[t][0] == x]
        if up:
            free.append([x, 0, up[0] - 40, 'up'])
        dn = [pos[t][1] + H[t] for t in bottom if pos[t][0] == x]
        if dn:
            free.append([x, dn[0] + 60, 10 ** 9, 'down'])
    for t in sorted([t for t in lone if t != '#Measure'], key=lambda t: -H[t]):
        slot = next((f for f in free if f[3] == 'up' and f[1] + H[t] <= f[2]), None) or \
            next((f for f in free if f[3] == 'down'), None)
        if slot is None:                     # no free space in the grid: a new slot under the lowest card
            slot = [off(dims), max(y + H[k] for k, (x, y) in pos.items()) + 60, 10 ** 9, 'down']
            free.append(slot)
        pos[t] = (slot[0], slot[1])
        slot[1] += H[t] + 40
    # #Measure: column 9 on its own, as long as the whole diagram
    y0 = min(y for x, y in pos.values())
    y1 = max(y + H[t] for t, (x, y) in pos.items())
    if '#Measure' in tags:
        pos['#Measure'] = (off(dims) + STEP * ncols, y0)
        H['#Measure'] = ceil20(y1 - y0)
    mx = min(x for x, y in pos.values())
    my = min(y for x, y in pos.values())
    pos = {t: (int(round((x - mx) / 20) * 20), int(round((y - my) / 20) * 20)) for t, (x, y) in pos.items()}
    missing = sorted(set(tables) - set(pos))
    overlaps = [(a, b) for a in pos for b in pos if a < b and pos[a][0] < pos[b][0] + W and pos[b][0] < pos[a][0] + W
                and pos[a][1] < pos[b][1] + H[b] and pos[b][1] < pos[a][1] + H[a]]
    return dict(sm=sm, tags=tags, H=H, pos=pos, top=top, dims=dims, bottom=bottom, tuck=tuck, look=sorted(look),
                lone=lone, engine=engine, missing=missing, overlaps=overlaps)


def write(p):
    f = os.path.join(p['sm'], 'diagramLayout.json')
    raw = open(f, 'rb').read().decode('utf-8')
    nl = '\r\n' if '\r\n' in raw else '\n'
    d = json.loads(raw)
    base = {k: copy.deepcopy(v) for k, v in d['diagrams'][0].items() if k != 'nodes'}
    base.update(ordinal=0, name='All tables')
    pos, H, tags = p['pos'], p['H'], p['tags']
    base['nodes'] = [{'location': {'x': pos[t][0], 'y': pos[t][1]}, 'nodeIndex': t, 'nodeLineageTag': tags[t],
                      'size': {'height': H[t], 'width': W}, 'zIndex': z}
                     for z, t in enumerate(sorted(pos, key=lambda t: (pos[t][1], pos[t][0])), 1)]
    d['diagrams'] = [base]                                   # one diagram: trial tabs are dropped
    d['selectedDiagram'] = d['defaultDiagram'] = 'All tables'
    open(f, 'wb').write(json.dumps(d, indent=2, ensure_ascii=False).replace('\n', nl).encode('utf-8'))



if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        print(__doc__)
        sys.exit(2)
    p = plan(args[0])
    print('order engine:', p['engine'])
    for k in ('top', 'dims', 'bottom'):
        print('%-7s %s' % (k, ', '.join('%s(%d)' % (t, p['H'][t]) for t in p[k])))
    print('tucked ', p['tuck'], '\nlookups', p['look'], '\nlone   ', p['lone'])
    if p['missing'] or p['overlaps']:
        print('NOT WRITTEN - missing', p['missing'], 'overlaps', p['overlaps'])
        sys.exit(1)
    if '--dry' not in sys.argv:
        write(p)
        print('diagramLayout.json written: %d nodes' % len(p['pos']))
