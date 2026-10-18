"""Matrix / table column fit (user 14/10): every column of a matrix is as wide as its longest number - no number wraps -
and the columns together fill the frame exactly - no horizontal scroll bar, only vertical. When the numbers cannot fit,
large amounts switch to millions with one decimal (user 14/10, option A: '111.4M').

  python scripts/matrix_fit.py measure <report dir> <plan.json>   Desktop has the report OPEN: read every table / matrix of
                                                                  the visible pages (tab content too) on the engine
  python scripts/matrix_fit.py apply <plan.json>                  Desktop CLOSED: write columnWidth + display units
  python scripts/matrix_fit.py check <report dir>                 Desktop OPEN: report what wraps / scrolls (gate matrix-fit)

The plan lives OUTSIDE the repo (a temp file). Power BI gives ONE width to all the columns of one measure in a matrix with a
Columns field, so the width of a measure is its longest formatted value over every cell, column total and grand total.
Live data grows until month end: amounts are sized for 1.5 x the largest value shown now (CAPACITY)."""
import glob
import json
import math
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pbi_gate as G

CAPACITY = 1.5          # amounts are sized for this many times today's largest value (the month keeps growing)
CELL_PAD = 14           # px of a cell around its text (Power BI default padding), = pbi_gate OVF_PAD
FRAME_LOSS = 20         # px of a table frame no column gets: the vertical scroll bar + borders
DEFAULT_PT = 10.0       # Power BI table / matrix default font size
MILLION = 1000000
TABLES = ('pivotTable', 'tableEx')
QUERY_TIMEOUT = 120     # s per query - a table whose query runs longer is reported, not waited for
# Power BI Desktop's bin folder: PBI_DESKTOP_DIR, else the first install found (the same places pbi_gate looks)
EXE_DIR = next((d for d in (r'D:\Software\Office\PowerBI\App\bin',
                            os.path.join(os.environ.get('ProgramFiles', r'C:\Program Files'), 'Microsoft Power BI Desktop', 'bin'))
                if os.path.isdir(d)), '')


# ------------------------------------------------------------------ engine
def find_port(report_dir):
    """Port of the Analysis Services engine of the Desktop that has this report open, or None."""
    leaf = os.path.basename(os.path.normpath(report_dir))
    ps = ("$pd = Get-CimInstance Win32_Process -Filter \"Name='PBIDesktop.exe'\" | Where-Object { $_.CommandLine -like '*%s*' } "
          "| Select-Object -First 1; if ($pd) { $ms = Get-CimInstance Win32_Process -Filter \"Name='msmdsrv.exe'\" | "
          "Where-Object { $_.ParentProcessId -eq $pd.ProcessId } | Select-Object -First 1; if ($ms) { "
          "(Get-NetTCPConnection -OwningProcess $ms.ProcessId -State Listen -ErrorAction SilentlyContinue | "
          "Select-Object -First 1).LocalPort } }" % leaf)
    out = subprocess.run(['powershell', '-NoProfile', '-Command', ps], capture_output=True, text=True).stdout.strip()
    return int(out) if out.isdigit() else None


class Engine:
    def __init__(self, port):
        import clr
        clr.AddReference(os.path.join(os.environ.get('PBI_DESKTOP_DIR', EXE_DIR), 'Microsoft.PowerBI.AdomdClient.dll'))
        from Microsoft.AnalysisServices.AdomdClient import AdomdConnection
        self.c = AdomdConnection('Data Source=localhost:%s' % port)
        self.c.Open()

    def q(self, text):
        cmd = self.c.CreateCommand(); cmd.CommandText = text; cmd.CommandTimeout = QUERY_TIMEOUT
        r = cmd.ExecuteReader(); out = []
        while r.Read():
            out.append([None if r.IsDBNull(i) else r.GetValue(i) for i in range(r.FieldCount)])
        r.Close()
        return out


# ------------------------------------------------------------------ PBIR -> DAX (the visual's own query and filters)
def ref(e, alias):
    if 'Column' in e:
        x = e['Column']; ent = x['Expression']['SourceRef'].get('Entity') or alias.get(x['Expression']['SourceRef'].get('Source'))
        return "'%s'[%s]" % (ent, x['Property'].replace(']', ']]')), 'col'
    if 'Measure' in e:
        x = e['Measure']
        return "[%s]" % x['Property'].replace(']', ']]'), 'measure'
    if 'Aggregation' in e:
        a = e['Aggregation']; inner, _ = ref(a['Expression'], alias)
        fn = {0: 'SUM', 1: 'AVERAGE', 2: 'DISTINCTCOUNT', 3: 'MIN', 4: 'MAX', 5: 'COUNT', 6: 'COUNTA'}.get(a.get('Function'), 'SUM')
        return '%s(%s)' % (fn, inner), 'measure'
    if 'HierarchyLevel' in e:
        h = e['HierarchyLevel']; src = h['Expression']['Hierarchy']['Expression']
        ent = src.get('SourceRef', {}).get('Entity') or src.get('PropertyVariationSource', {}).get('Expression', {}).get('SourceRef', {}).get('Entity')
        return "'%s'[%s]" % (ent, h['Level']), 'col'
    return None, None


def lit(v):
    s = v.get('Literal', {}).get('Value')
    if s is None:
        return None
    if s.startswith("'"):
        return '"%s"' % s[1:-1].replace("''", "'").replace('"', '""')
    m = re.match(r"datetime'(\d{4})-(\d\d)-(\d\d)", s)
    if m:
        return 'DATE(%d,%d,%d)' % tuple(int(x) for x in m.groups())
    if s in ('true', 'false', 'null'):
        return {'true': 'TRUE()', 'false': 'FALSE()', 'null': 'BLANK()'}[s]
    return re.sub(r'[LDM]$', '', s)


def cond(cn, alias):
    if 'Not' in cn:
        b, col = cond(cn['Not']['Expression'], alias)
        return ('NOT(%s)' % b, col) if b else (None, None)
    if 'And' in cn or 'Or' in cn:
        k = 'And' if 'And' in cn else 'Or'
        l, c1 = cond(cn[k]['Left'], alias); r, c2 = cond(cn[k]['Right'], alias)
        return ('(%s %s %s)' % (l, '&&' if k == 'And' else '||', r), c1) if l and r and c1 == c2 else (None, None)
    if 'In' in cn:
        ex = cn['In']['Expressions']
        if len(ex) != 1:
            return None, None
        col, kind = ref(ex[0], alias)
        vals = [lit(r[0]) for r in cn['In'].get('Values', [])]
        if kind != 'col' or not vals or None in vals:
            return None, None
        return '%s IN {%s}' % (col, ', '.join(vals)), col
    if 'Comparison' in cn:
        cp = cn['Comparison']; col, kind = ref(cp['Left'], alias); v = lit(cp['Right'])
        if kind != 'col' or v is None:
            return None, None
        op = {0: '=', 1: '>', 2: '>=', 3: '<', 4: '<='}.get(cp['ComparisonKind'], '=')
        return '%s %s %s' % (col, op, v), col
    return None, None


def filters_of(fc, out):
    """Column filters of a filterConfig as KEEPFILTERS(...) arguments; measure filters (TopN, ~Recent) are left out - they
    do not cut the columns of a matrix (skill pbi-mix 5n), so sizing over every column is the right capacity."""
    for x in (fc or {}).get('filters', []):
        f = x.get('filter')
        if not f or 'Measure' in x.get('field', {}):
            continue
        alias = {s['Name']: s.get('Entity') for s in f.get('From', [])}
        for w in f.get('Where', []):
            b, col = cond(w['Condition'], alias)
            if b:
                out.append('KEEPFILTERS(FILTER(ALL(%s), %s))' % (col, b))


# ------------------------------------------------------------------ text of a formatted value
def split_sections(fmt):
    out, cur, q = [], '', False
    for ch in fmt:
        if ch == '"':
            q = not q
        if ch == ';' and not q:
            out.append(cur); cur = ''
        else:
            cur += ch
    out.append(cur)
    return out


def fmt_text(v, fmt, units=None, precision=None):
    """The text Power BI prints for value v under format string fmt (or display units). Widths only need the right
    LENGTH and characters, not locale-perfect output."""
    if v is None:
        return ''
    if isinstance(v, str):
        return v
    if isinstance(v, bool):
        return str(v)
    try:
        x = float(v)
    except (TypeError, ValueError):
        return str(v)
    if units:
        p = 1 if precision is None else int(precision)
        return '{:,.{p}f}{u}'.format(x / units, p=p, u={1000: 'K', MILLION: 'M', 10 ** 9: 'bn'}.get(units, ''))
    if not fmt:
        return '{:,.0f}'.format(x) if abs(x - round(x)) < 1e-9 else '{:,.2f}'.format(x)
    secs = split_sections(fmt)
    sec = secs[1] if x < 0 and len(secs) > 1 else secs[2] if x == 0 and len(secs) > 2 else secs[0]
    neg = x < 0 and len(secs) == 1
    lits = ''.join(re.findall(r'"([^"]*)"', sec))
    core = re.sub(r'"[^"]*"', '', sec)
    pct = '%' in core
    scale = len(re.search(r'(,*)$', re.sub(r'[^0#,.]', '', core)).group(1))   # '#,0.0,,' = / 1,000,000
    core = re.sub(r',+(?=[^0#,]*$)', '', core) if scale else core
    y = abs(x) * (100 if pct else 1) / (1000 ** scale)
    dec = len(re.search(r'\.([0#]*)', core).group(1)) if '.' in core else 0
    body = ('{:,.%df}' if ',' in core else '{:.%df}') % dec
    s = body.format(y)
    pre = re.match(r'^[^0#,.]*', core).group(0)
    post = re.search(r'[^0#,.]*$', core).group(0)
    return ('-' if neg else '') + pre + s + post + lits


def capacity(v, fmt):
    """Live amounts grow until month end: size them for CAPACITY x; ratios and percentages do not grow."""
    if isinstance(v, (int, float)) and not isinstance(v, bool) and '%' not in (fmt or '') and abs(v) >= 1000:
        return v * CAPACITY
    return v


# ------------------------------------------------------------------ one table / matrix
def obj_prop(vis, obj, key):
    for e in vis.get('objects', {}).get(obj, []):
        if 'selector' not in e and key in e.get('properties', {}):
            return G.lit(e['properties'][key])
    return None


def font_pt(vis, obj):
    v = obj_prop(vis, obj, 'fontSize')
    return float(str(v).rstrip('D')) if v else DEFAULT_PT


def units_of(vis):
    """queryRef -> (labelDisplayUnits, labelPrecision) set per column."""
    out = {}
    for e in vis.get('objects', {}).get('columnFormatting', []):
        m = e.get('selector', {}).get('metadata')
        if not m:
            continue
        u = G.lit(e.get('properties', {}).get('labelDisplayUnits', {}))
        p = G.lit(e.get('properties', {}).get('labelPrecision', {}))
        cur = out.setdefault(m, [None, None])
        if u:
            cur[0] = float(str(u).rstrip('DL'))
        if p is not None:
            cur[1] = int(str(p).rstrip('L'))
    return out


def widths_of(vis):
    out = {}
    for e in vis.get('objects', {}).get('columnWidth', []):
        m = e.get('selector', {}).get('metadata'); v = G.lit(e.get('properties', {}).get('value', {}))
        if m and v:
            out[m] = float(str(v).rstrip('D'))
    return out


def totals_on(vis, which):
    for e in vis.get('objects', {}).get('subTotals', []):
        v = G.lit(e.get('properties', {}).get(which, {}))
        if v is not None:
            return v != 'false'
    return True


def table_plan(eng, d, flt, fmts, switches=frozenset()):
    v = d['visual']; qs = v.get('query', {}).get('queryState', {})
    rows = [p for p in qs.get('Rows', qs.get('Values', {}) if v['visualType'] == 'tableEx' else {}).get('projections', [])]
    if v['visualType'] == 'tableEx':
        rows = []
        cols_tbl = [p for p in qs.get('Values', {}).get('projections', []) if ref(p['field'], {})[1] == 'col']
    cols = qs.get('Columns', {}).get('projections', [])
    meas = [p for p in qs.get('Values', {}).get('projections', []) if ref(p['field'], {})[1] == 'measure' and not p.get('hidden')]
    if not meas:
        return None
    rdax = [ref(p['field'], {})[0] for p in rows] if v['visualType'] == 'pivotTable' else [ref(p['field'], {})[0] for p in cols_tbl]
    cdax = [ref(p['field'], {})[0] for p in cols]
    mdax = [ref(p['field'], {})[0] for p in meas]
    vf = []; filters_of(d.get('filterConfig'), vf)
    # totals only when the table SHOWS them: rowSubtotals off = no Total row, columnSubtotals off = no Total column; the grand
    # total cell needs both (14/10: an always-on grand total of 28.5 bn sized every hour column of a matrix that shows none)
    row_tot = totals_on(v, 'rowSubtotals'); col_tot = bool(cdax) and totals_on(v, 'columnSubtotals')
    groups = [rdax + cdax]
    if v['visualType'] == 'pivotTable':
        if cdax and row_tot:
            groups.append(cdax)                      # the total row
        if col_tot:
            groups.append(rdax)                      # the total column
        if row_tot and (col_tot or not cdax):
            groups.append([])                        # grand total
    else:
        groups.append([])
    seen, data = set(), []
    for g in groups:
        args = list(dict.fromkeys(g)) + flt + vf + ['"m%d", %s' % (i, m) for i, m in enumerate(mdax)]
        res = eng.q('EVALUATE SUMMARIZECOLUMNS(%s)' % ', '.join(args))
        k = len(set(g))
        for r in res:
            data.append((g, r[:k], r[k:]))
    ncol = len({tuple(x[1][len(rdax):]) for x in data if x[0] == groups[0]}) if cdax else 1
    if cdax and not any("'Dim_Date'" in c or "'Parameter_Date'" in c for c in cdax):
        # capacity (14/10, store x hour: 16 hours today, 18 over the year - hours 0 and 7 come and go): a Columns field that
        # is not a date has as many columns as members with a value in the last 12 months, whatever period is selected
        keep = [x for x in flt + vf if "'Dim_Date'" not in x and "'Parameter_Date'" not in x]
        year = "KEEPFILTERS(FILTER(ALL('Dim_Date'[DateKey]), 'Dim_Date'[DateKey] >= TODAY() - 365))"
        cap = eng.q('EVALUATE SUMMARIZECOLUMNS(%s)' % ', '.join(list(dict.fromkeys(cdax)) + keep + [year] + ['"m0", %s' % mdax[0]]))
        ncol = max(ncol, len(cap))                   # the Total column is added just below
    if v['visualType'] == 'pivotTable' and col_tot:
        ncol += 1
    # text widths
    vpt, hpt, rpt = font_pt(v, 'values'), font_pt(v, 'columnHeaders'), font_pt(v, 'rowHeaders')
    units = units_of(v)
    plan = {'rows_ref': rows[0]['queryRef'] if rows else None, 'measures': [], 'ncol': ncol}
    if rows or (v['visualType'] == 'tableEx' and cols_tbl):
        lead = rows[0] if rows else cols_tbl[0]
        texts = {str(x[1][0]) for x in data if x[0] == groups[0] and x[1] and x[1][0] is not None} | {'Total'}
        hdr = lead.get('displayName') or lead['queryRef'].split('.', 1)[1]
        w = max([G.w_text(t, rpt, False) for t in texts] + [G.w_text(hdr, hpt, True)]) + CELL_PAD + 12 * max(0, len(rows) - 1)
        plan['rows_ref'] = lead['queryRef']; plan['rows_w'] = math.ceil(w)
    else:
        plan['rows_w'] = 0
    # column header captions of a matrix (the Columns members, e.g. week numbers) only need their own width
    col_hdr = max([G.w_text(str(x[1][len(rdax):][0]), hpt, True) for x in data if x[0] == groups[0] and cdax and x[1][len(rdax):]] + [0])
    if v['visualType'] == 'tableEx':                 # the other text columns of a flat table are columns too
        for j, p in enumerate(cols_tbl[1:], start=1):
            texts = sorted({str(x[1][j]) for x in data if x[0] == groups[0] and len(x[1]) > j and x[1][j] is not None}, key=len)[-3:]
            hdr = p.get('displayName') or p['queryRef'].split('.', 1)[1]
            plan['measures'].append({'ref': p['queryRef'], 'fmt': None, 'big': 0, 'units': None, 'precision': None, 'texts': texts,
                                     'hdr_w': max(G.w_text(wd, hpt, True) for wd in (hdr.split() or [''])), 'vpt': vpt,
                                     'vals_sample': []})
    for i, p in enumerate(meas):
        name = p['queryRef'].split('.', 1)[1]
        fl = fmts.get(name) or fmts.get(re.sub(r'^[#~%]', '', name)) or [None]
        vals = [x[2][i] for x in data]
        num = [x for x in vals if isinstance(x, (int, float)) and not isinstance(x, bool)]
        big = max([abs(x) for x in num] + [0])
        u, prec = units.get(p['queryRef'], [None, None])
        hdr = p.get('displayName') or name
        plan['measures'].append({'ref': p['queryRef'], 'fmt': fl, 'big': big, 'units': u, 'precision': prec,
                                 'switch': name in switches,
                                 'texts': sorted({fmt_text(capacity(x, f), f) for x in vals if x is not None for f in fl}, key=len)[-3:],
                                 # a Columns member caption ('Yesterday') spans the columns of every measure under it
                                 # one measure under a Columns field: Power BI shows no measure-name row - only the members
                                 'hdr_w': max(([] if cdax and len(meas) == 1 else [G.w_text(wd, hpt, True) for wd in (hdr.split() or [''])]) +
                                              ([col_hdr / len(meas)] if cdax else [0])),
                                 'vpt': vpt, 'vals_sample': sorted(num, key=abs)[-3:]})
    return plan


def need_w(m, units=None, precision=None):
    fl = m['fmt'] if isinstance(m['fmt'], list) else [m['fmt']]
    # a dynamic format with a millions branch ('#,0.0,,"M"' for Revenue, '#,0' for TC / TA): the plain branch only ever
    # prints the metrics under a million (TA ~250,000), never today's revenue - cap what it is measured with
    scaled = any(re.search(r',,', f or '') for f in fl) and len(fl) > 1
    cap = lambda x, f: min(abs(x), MILLION - 1) if scaled and not re.search(r',,', f or '') and isinstance(x, (int, float)) else x
    texts = [fmt_text(capacity(cap(x, f), f), f, units, precision) for x in m['vals_sample'] for f in fl] if m['vals_sample'] else m['texts']
    texts = texts or m['texts'] or ['']
    if m.get('switch') and len(fl) > 1:
        # a Metric switch: today's values are one metric; the plain branch must also fit TA / GA (up to 999,999)
        texts = texts + [fmt_text(MILLION - 1, f) for f in fl if f and '"' not in f and '%' not in f]
    return math.ceil(max([G.w_text(t, m['vpt'], False) for t in texts] + [m['hdr_w']]) + CELL_PAD)


def fit(plan, frame):
    """Widths that fill frame - FRAME_LOSS exactly; amounts >= 1M go to millions when they do not fit (not a metric
    switch: its unit lives in the measure's own formatStringDefinition)."""
    avail = frame - FRAME_LOSS
    for m in plan['measures']:
        m['to_units'] = None
        m['w'] = need_w(m, m['units'], m['precision'])
    total = lambda: plan['rows_w'] + sum(plan['ncol'] * m['w'] for m in plan['measures'])
    if total() > avail:
        for m in plan['measures']:
            if not m['units'] and not m.get('switch') and m['big'] >= MILLION and not any('%' in (f or '') for f in (m['fmt'] or [None])):
                m['to_units'] = MILLION
                m['w'] = need_w(m, MILLION, 1)
    t = total()
    plan['fits'] = t <= avail
    plan['need'] = t
    plan['avail'] = avail
    if plan['fits'] and t < avail:
        extra = avail - t                            # fill the frame: spread the spare width over the value columns
        cols = plan['ncol'] * len(plan['measures'])
        for m in plan['measures']:
            m['w'] += math.floor(extra / cols)
    return plan


# ------------------------------------------------------------------ report walk
def tables(report_dir):
    d_def = glob.glob(os.path.join(report_dir, '*.Report', 'definition'))[0]
    rep_f = []; filters_of(json.load(open(os.path.join(d_def, 'report.json'), encoding='utf-8')).get('filterConfig'), rep_f)
    for pg in json.load(open(os.path.join(d_def, 'pages', 'pages.json'), encoding='utf-8'))['pageOrder']:
        page = json.load(open(os.path.join(d_def, 'pages', pg, 'page.json'), encoding='utf-8'))
        if page.get('visibility') == 'HiddenInViewMode':
            continue
        files = glob.glob(os.path.join(d_def, 'pages', pg, 'visuals', '*', 'visual.json'))
        vis = [(f, json.load(open(f, encoding='utf-8'))) for f in files]
        pg_f = []; filters_of(page.get('filterConfig'), pg_f)
        for f, v in vis:
            if v.get('visual', {}).get('visualType') == 'slicer':
                fl = v['visual'].get('objects', {}).get('general', [{}])[0].get('properties', {}).get('filter', {}).get('filter')
                if fl:
                    filters_of({'filters': [{'filter': fl, 'field': {}}]}, pg_f)
        for f, v in vis:
            if v.get('visual', {}).get('visualType') in TABLES:
                yield page['displayName'], f, v, rep_f + pg_f


def formats(report_dir):
    """measure -> its format strings: the static one, plus every literal a formatStringDefinition can return (a metric
    switch prints millions for Revenue and plain counts for TC - both must fit)."""
    out = {k: [x.get('fmt')] for k, x in G.model_measures(report_dir).items()}
    for f in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        cur = None
        for line in open(f, encoding='utf-8'):
            m = re.match(r"^\tmeasure\s+('(?:[^']|'')+'|\S+)\s*=", line)
            if m:
                cur = m.group(1).strip("'").replace("''", "'")
            m = re.match(r'^\t\tformatStringDefinition\s*=\s*(.*)$', line.rstrip())
            if m and cur in out:
                lits = [s.replace('""', '"') for s in re.findall(r'"((?:[^"]|"")*)"', m.group(1))]
                out[cur] = [s for s in lits if re.search(r'[0#]', s)] or out[cur]
                out[cur + '\0dynamic'] = True
    return out


def switch_measures(report_dir):
    """Measures whose meaning changes with a slicer (the Metric switch): one display unit cannot fit them all."""
    out = set()
    for f in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        cur = None
        for line in open(f, encoding='utf-8'):
            m = re.match(r"^\tmeasure\s+('(?:[^']|'')+'|\S+)\s*=(.*)$", line)
            if m:
                cur = m.group(1).strip("'").replace("''", "'")
            if cur and ('[~Selected Metric]' in line or 'formatStringDefinition' in line):
                out.add(cur)
    return out


def measure(report_dir, out_path, only=None):
    port = find_port(report_dir)
    if not port:
        print('the report is not open in Desktop - open it, then run again')
        return 2
    eng = Engine(port); fmts = formats(report_dir); sw = switch_measures(report_dir); plans = []
    for page, f, v, flt in tables(report_dir):
        if only and page not in only:
            continue
        title = G.lit(v['visual'].get('visualContainerObjects', {}).get('title', [{}])[0].get('properties', {}).get('text', {})) or v['name']
        try:
            p = table_plan(eng, v, flt, fmts, sw)
        except Exception as e:
            print('  ? %-24s %-40s query failed: %s' % (page[:24], str(title)[:40], str(e).split('\n')[0][:120]), flush=True)
            continue
        if not p:
            continue
        fit(p, v['position']['width'])
        p.update(file=f, page=page, title=str(title).strip("'"), frame=v['position']['width'])
        plans.append(p)
        print('  %s %-24s %-42s need %5d / %5d px  %s' % (' ' if p['fits'] else 'X', page[:24], p['title'][:42], p['need'], p['avail'],
              ', '.join('%s->M' % m['ref'].split('.', 1)[1] for m in p['measures'] if m['to_units']) or ''), flush=True)
        json.dump(plans, open(out_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=str)
    json.dump(plans, open(out_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=str)
    bad = [p for p in plans if not p['fits']]
    print('tables %d · fit %d · still too wide %d -> %s' % (len(plans), len(plans) - len(bad), len(bad), out_path))
    return 0


def apply(plan_path):
    plans = json.load(open(plan_path, encoding='utf-8')); n = 0
    for p in plans:
        if not p['fits']:
            continue
        raw = open(p['file'], 'rb').read().decode('utf-8'); d = json.loads(raw); o = d['visual'].setdefault('objects', {})
        sizes = {m['ref']: m['w'] for m in p['measures']}
        if p.get('rows_ref') and p.get('rows_w'):
            sizes[p['rows_ref']] = p['rows_w']
        # a width dragged on ONE member in Desktop (selector 'data': hour 11, 'Mon') beats the per-field width - drop them
        # (14/10: 23 per-hour widths of 60-90 px kept the store x hour matrix scrolling after the fit was written)
        cw = [e for e in o.get('columnWidth', []) if e.get('selector', {}).get('metadata') not in sizes
              and 'data' not in e.get('selector', {})]
        cw += [{'properties': {'value': {'expr': {'Literal': {'Value': '%dD' % w}}}}, 'selector': {'metadata': r}} for r, w in sizes.items()]
        o['columnWidth'] = cw
        ch = o.setdefault('columnHeaders', [{'properties': {}}])
        ch[0].setdefault('properties', {})['autoSizeColumnWidth'] = {'expr': {'Literal': {'Value': 'false'}}}
        for m in p['measures']:
            if m.get('to_units'):
                cf = o.setdefault('columnFormatting', [])
                e = next((x for x in cf if x.get('selector', {}).get('metadata') == m['ref']), None)
                if not e:
                    e = {'properties': {}, 'selector': {'metadata': m['ref']}}; cf.append(e)
                e['properties']['labelDisplayUnits'] = {'expr': {'Literal': {'Value': '%dD' % m['to_units']}}}
                e['properties']['labelPrecision'] = {'expr': {'Literal': {'Value': '1L'}}}
        out = json.dumps(d, ensure_ascii=False, indent=2)
        open(p['file'], 'wb').write((out.replace('\n', '\r\n') if '\r\n' in raw else out).encode('utf-8'))
        n += 1
    print('tables written', n, '· skipped (too wide even in millions)', sum(1 for p in plans if not p['fits']))
    return 0


def check(report_dir, fail=None):
    """Gate matrix-fit on the open Desktop: a column narrower than its longest value wraps it; columns wider than the
    frame make a horizontal scroll bar. Returns the messages (appends them to fail when given)."""
    msgs = []
    port = find_port(report_dir)
    if not port:
        return None
    eng = Engine(port); fmts = formats(report_dir); sw = switch_measures(report_dir)
    for page, f, v, flt in tables(report_dir):
        try:
            p = table_plan(eng, v, flt, fmts, sw)
        except Exception:
            continue
        if not p:
            continue
        have = widths_of(v['visual'])
        auto = obj_prop(v['visual'], 'columnHeaders', 'autoSizeColumnWidth') != 'false'
        member = [e for e in v['visual'].get('objects', {}).get('columnWidth', []) if 'data' in e.get('selector', {})]
        if member:
            msgs.append("page '%s' table %s: %d column widths set on single members override the per-field width "
                        "(matrix-fit: python scripts/matrix_fit.py apply drops them)" % (page, str(v['name']), len(member)))
        title = str(G.lit(v['visual'].get('visualContainerObjects', {}).get('title', [{}])[0].get('properties', {}).get('text', {})) or v['name']).strip("'")
        avail = v['position']['width'] - FRAME_LOSS
        tot = p['rows_w'] if auto or p['rows_ref'] not in have else have[p['rows_ref']]
        wraps = []
        for m in p['measures']:
            need = need_w(m, m['units'], m['precision'])
            w = need if auto or m['ref'] not in have else have[m['ref']]
            tot += p['ncol'] * w
            if w + 0.5 < need:
                wraps.append('%s %d < %d' % (m['ref'].split('.', 1)[1], w, need))
        if wraps:
            msgs.append("page '%s' table %s: values wrap - %s px (matrix-fit: python scripts/matrix_fit.py measure)" % (page, title, '; '.join(wraps)))
        if tot > avail + 1:
            msgs.append("page '%s' table %s: columns %d px > frame %d - a horizontal scroll bar (matrix-fit)" % (page, title, tot, avail))
    if fail is not None:
        fail.extend(msgs)
    return msgs


if __name__ == '__main__':
    a = sys.argv[1:]
    if len(a) >= 3 and a[0] == 'measure':
        sys.exit(measure(a[1], a[2], a[3].split(',') if len(a) > 3 else None))
    if len(a) == 2 and a[0] == 'apply':
        sys.exit(apply(a[1]))
    if len(a) == 2 and a[0] == 'check':
        r = check(a[1])
        if r is None:
            print('the report is not open in Desktop'); sys.exit(2)
        print('\n'.join('  X ' + m for m in r) or 'matrix-fit GREEN'); sys.exit(1 if r else 0)
    print(__doc__); sys.exit(2)
