"""Colour every chart and card value of a White report with the set of 30/09 (user chose option B: the dataviz skill's
validated palette - blue, orange, green, violet, pink). Ported from a department repo scripts/mix_palette.py; --cards for a department's card row.
  * cards: tile i of a row -> colour i of PALETTE['order'], cycling; the % line under a card stays green/red.
  * charts: main series take PALETTE['mains'] in order and the next chart of the same tab CONTINUES the run; an amount
    named LY / LM / target (PALETTE['compare_re']) is grey; a % line on Y2 is dark violet, its label bold green/red.

Usage:  python scripts/mix_palette.py [--dry] [--cards]        (template: PALETTE in scripts/mix_specs.py)
        (MIX_ROOT=reports/<report> picks the report; --dry shows the scope; fix the REAL file, git is the safety net - commit
         first, no sandbox copy, user 08/10, the department standard §2)

Per chart (visualType contains 'Chart'):
  * dataPoint: every hard-coded fill is dropped, then each measure series takes the colour of its ROLE - a comparison
    (name matches PALETTE['compare_re']: LY / LM / target) grey, main series accent then accent2 (accent3 when grey is
    on the chart), a % line (Y2) dark grey; a series field listed in PALETTE['series'] gives its values the ramp in
    legend order ((Blank) grey); any other series field is left to the theme (the same ramp).
  * labels: the % line label is coloured by a rule on that measure (up #007A36 / down #C51E24, threshold from
    PALETTE['pct_threshold']) without a background box; every other label colour becomes PALETTE['label'].
Other properties of those objects (transparency, precision, position...) are kept. Re-runnable.
"""
import copy, glob, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mix_builder as B  # noqa: E402
from mix_specs import PALETTE  # noqa: E402


# a measure of ANY measure table: '#Measure.' and the OM model's 'Measure.' (01/10: the Power Consumption charts were
# skipped - two charts side by side drew the same two default colours)
MEASURE_REF = re.compile(r'^#?Measure\.')
PCT_LABEL_BOX = {'enableBackground': {'expr': {'Literal': {'Value': 'false'}}},   # no box: it hid the line (user 30/09)
                 'labelPosition': {'expr': {'Literal': {'Value': "'Above'"}}}}      # above the point instead (Desktop writes it 30x)


def solid(c):
    return {'solid': {'color': {'expr': {'Literal': {'Value': "'%s'" % c}}}}}


def colour(c):
    """A colour of the theme's dataColors as a THEME reference, like the Original template (user 2026-10-01: "do bạn chỉnh
    thủ công nên màu của theme ko áp dc"); anything else (greys, up/down) stays a literal. ColorId 0 = background,
    1 = foreground, 2 = dataColors[0] ... - measured 01/10 on the Original: ColorId 6 renders #13678A (dataColors[4])."""
    th = [x.upper() for x in PALETTE.get('theme', [])]
    if c.upper() in th:
        return {'solid': {'color': {'expr': {'ThemeDataColor': {'ColorId': 2 + th.index(c.upper()), 'Percent': 0}}}}}
    return solid(c)


def refs(v, role):
    st = v.get('query', {}).get('queryState', {}).get(role)
    return [p['queryRef'] for p in st['projections']] if st else []


def series_selector(qref, value):
    ent, prop = qref.split('.', 1)
    right = {'Literal': {'Value': 'null'}} if value is None else {'Literal': {'Value': "'%s'" % value}}
    return {'data': [{'scopeId': {'Comparison': {
        'ComparisonKind': 0,
        'Left': {'Column': {'Expression': {'SourceRef': {'Entity': ent}}, 'Property': prop}},
        'Right': right}}}]}


def paint(v, start=0):
    """Paint one chart visual in place; series take slots from `start` on. Returns (dropped fills, log, slots used)."""
    log, used = [], 0
    objs = v.setdefault('objects', {})
    keep = []
    for e in objs.get('dataPoint', []):
        pr = e.get('properties', {})
        if 'fill' in pr:
            pr = {k: x for k, x in pr.items() if k != 'fill'}
            if not pr:
                continue
            e = dict(e, properties=pr)
        keep.append(e)
    dropped = len(objs.get('dataPoint', [])) - len(keep)
    order = PALETTE['chart_order']                 # charts: the light set (cards use PALETTE['order'], dark)
    ser = refs(v, 'Series')
    if not ser and v.get('visualType') in ('pieChart', 'donutChart') and refs(v, 'Category')[:1] and refs(v, 'Category')[0] in PALETTE['series']:
        ser = refs(v, 'Category')   # a pie split by a fixed-list field (channel group) takes the fixed slots too
    if ser and ser[0] in PALETTE['series']:
        vals = PALETTE['series'][ser[0]]
        for k, val in enumerate(vals):
            keep.append({'properties': {'fill': colour(order[k % len(order)])}, 'selector': series_selector(ser[0], val)})
        keep.append({'properties': {'fill': colour(PALETTE['blank'])}, 'selector': series_selector(ser[0], None)})
        log.append('series %s -> slots 1..%d' % (ser[0], len(vals)))
    elif ser:
        # split by a field with no fixed value list (leader, marketplace): the theme, whose dataColors ARE this order
        log.append('series %s -> theme (same order)' % ser[0])
    elif v.get('visualType') in ('pieChart', 'donutChart', 'treemap', 'funnel') and (refs(v, 'Category') or refs(v, 'Group')):
        # a pie is coloured PER SLICE (category); one fill on the measure would paint every slice
        # the same - leave it to the theme, whose dataColors are this order (a treemap names its split 'Group')
        log.append('slices %s -> theme (same order)' % (refs(v, 'Category') or refs(v, 'Group'))[0])
    else:
        # colour by ROLE (user 2026-09-30): a comparison (LY / LM / target) is grey, main series take accent then
        # accent2, a % line (Y2) is dark grey; every chart starts again at the accent
        comp = re.compile(PALETTE['compare_re'])
        roles = []
        for role in ('Y', 'Values', 'Y2'):
            for q in refs(v, role):
                if MEASURE_REF.match(q):
                    name = q.split('.', 1)[1]
                    # a % series is a line whatever its name ('%Revenue of Target'); an amount named LY / LM / target
                    # is a comparison, drawn on Y2 or not ('#Target Total' as a line is still grey)
                    pct = name.startswith('%')
                    roles.append((q, 'line' if pct and role == 'Y2' else 'compare' if comp.search(name) and not pct
                                  else 'line' if role == 'Y2' else 'main'))
        # main series take PALETTE['mains'] in order, CONTINUING the tab's run (user 29/09: two charts of one tab
        # must not share colours); the % line is dark violet (PALETTE["lines"]), comparisons are grey
        mains, lines, compares = PALETTE['mains'], PALETTE['lines'], PALETTE['compares']
        compares = PALETTE.get('compares_by_count', {}).get(sum(1 for _, r in roles if r == 'compare'), compares)
        axis = [q for role in ('Y', 'Values') for q in refs(v, role) if MEASURE_REF.match(q)]
        single = set(axis) if len(axis) == 1 else set()
        nm = nl_ = nc = 0
        for q, r in roles:
            if r == 'compare':
                c = compares[min(nc, len(compares) - 1)]; nc += 1
            elif r == 'line':
                c = lines[min(nl_, len(lines) - 1)]; nl_ += 1
            else:
                # first main: the tab's next colour; a second main on the SAME chart: the light step of that colour
                # (user 30/09: two neutral mains side by side were too close)
                # the run cycles mains + their light steps (4 colours - a department repo 30/09: a tab of 4 charts repeated
                # chart 1 at chart 3 with only 2 colours, and the gate forbids two charts of one tab with one set);
                # a second main on the same chart takes the pair of the first (dark <-> light)
                cyc = PALETTE.get('cycle') or (list(mains) + list(PALETTE['mains_light']))
                if PALETTE.get('mains_light'):
                    first = cyc[start % len(cyc)]
                    pair = dict(zip(mains, PALETTE['mains_light'])); pair.update({v: k for k, v in list(pair.items())})
                    c = first if nm == 0 else pair.get(first, first)
                else:                                   # one ordered set (Theme1): a 2nd main takes the next colour
                    c = cyc[(start + nm) % len(cyc)]
                nm += 1
            if q in single:
                # ONE measure on the main axis: Desktop keeps its colour in the selector-less entry and IGNORES a
                # metadata selector (30/09: 6 Product bars + REVENUE & TARGET rendered theme colour 1). Desktop-written
                # combos with Y=1 use the plain entry 15x; the Y2 lines keep their metadata selectors.
                pe = next((e for e in keep if 'selector' not in e), None)
                if pe is None:
                    keep.insert(0, {'properties': {'fill': colour(c)}})
                else:
                    pe.setdefault('properties', {})['fill'] = colour(c)
            else:
                keep.append({'properties': {'fill': colour(c)}, 'selector': {'metadata': q}})
            log.append('%s=%s' % (q.split('.', 1)[1], c))
        used = (1 if nm else 0) if PALETTE.get('mains_light') else nm
    objs['dataPoint'] = keep
    # labels
    y2 = {q: q.split('.', 1)[1] for q in refs(v, 'Y2')}
    seen = set()
    for e in objs.get('labels', []):
        pr = e.setdefault('properties', {})
        m = e.get('selector', {}).get('metadata')
        if m in y2 and 'data' not in e.get('selector', {}) and 'color' not in pr:
            continue    # the series-level entry (bold / position): turning it per-point made every run add one (02/10)
        if m in y2 and y2[m] in PALETTE['pct_threshold']:
            e['selector'] = per_point(m)
            pr['color'] = B.pct_color(y2[m], PALETTE['pct_threshold'][y2[m]], up=B.UP_ON_BARS)
            pr['bold'] = {'expr': {'Literal': {'Value': 'true'}}}     # user 2026-09-30: % labels bold to read
            pr.update(PCT_LABEL_BOX)       # user 30/09: % label above its point, no box
            pr.pop('backgroundColor', None); pr.pop('backgroundTransparency', None)
            seen.add(m)
        elif 'color' in pr:
            pr['color'] = solid(PALETTE['label'])
    for m, name in y2.items():
        if m not in seen and name in PALETTE['pct_threshold']:
            objs.setdefault('labels', []).append({'properties': {
                'color': B.pct_color(name, PALETTE['pct_threshold'][name], up=B.UP_ON_BARS),
                'bold': {'expr': {'Literal': {'Value': 'true'}}}, **PCT_LABEL_BOX}, 'selector': per_point(m)})
    # EVERY label: no box behind it, EVERY % number bold (user 2026-10-01: "đã có luật ko tạo nền cho % phía sau rồi mà,
    # nó làm che mất chart, chỉ in đậm bold số lên thôi, in đậm mọi số %" - 10 label entries still had a box, on the
    # whole chart ('all') or on amount series, which the Y2-only pass above never touched)
    for e in objs.get('labels', []):
        pr = e.setdefault('properties', {})
        if json.dumps(pr.get('enableBackground', {})).find('true') >= 0 or 'backgroundColor' in pr:
            pr['enableBackground'] = {'expr': {'Literal': {'Value': 'false'}}}
            pr.pop('backgroundColor', None); pr.pop('backgroundTransparency', None)
    # SERIES-LEVEL keys live in the metadata-only entry, as Desktop writes them (bold 37x, enableBackground 106x on
    # 'metadata' selectors); in a per-point (dataViewWildcard) entry Power BI reads only the conditional colour and
    # ignores them - 01/10 the % labels lost bold and got the default box back after the colour moved per point
    static = ('bold', 'enableBackground', 'backgroundColor', 'backgroundTransparency', 'labelPosition')
    labs = objs.get('labels', [])
    for e in list(labs):
        sel_ = e.get('selector', {})
        if 'data' in sel_ and sel_.get('metadata'):
            moved = {k: e['properties'].pop(k) for k in static if k in e.get('properties', {})}
            if moved:
                meta = next((x for x in labs if x.get('selector') == {'metadata': sel_['metadata']}), None)
                if meta is None:
                    meta = {'properties': {}, 'selector': {'metadata': sel_['metadata']}}
                    labs.append(meta)
                meta.setdefault('properties', {}).update(moved)
    for role in ('Y', 'Values', 'Y2'):
        for q in refs(v, role):
            if not (MEASURE_REF.match(q) and q.split('.', 1)[1].startswith('%')):
                continue
            e = next((x for x in labs if x.get('selector') == {'metadata': q}), None)
            if e is None:
                e = {'properties': {}, 'selector': {'metadata': q}}
                labs.append(e)
            e.setdefault('properties', {}).update({'bold': {'expr': {'Literal': {'Value': 'true'}}}}, **PCT_LABEL_BOX)
            e['properties'].pop('backgroundColor', None); e['properties'].pop('backgroundTransparency', None)
    # identical entries are noise Desktop does not need - the non-idempotent run above left up to 11 copies (02/10)
    uniq, keys = [], set()
    for e in labs:
        k = json.dumps(e, sort_keys=True)
        if k not in keys:
            keys.add(k); uniq.append(e)
    labs = uniq
    if labs:
        objs['labels'] = labs
    return dropped, log, used


def per_point(m):
    """Selector of a rule evaluated PER DATA POINT - as Desktop writes it (labels of 4 Legacy combos, values of 194 matrix
    cells): data = dataViewWildcard + metadata. With metadata alone Power BI evaluates the measure ONCE for the whole series
    (a department White: every % Target label red, 107-138% included; the same file with the wildcard: >= 100% green)."""
    return {'data': [{'dataViewWildcard': {'matchingOption': 1}}], 'metadata': m}


def sel(d):
    """Selection name: visualGroup.displayName, or the title text."""
    if 'visualGroup' in d:
        return d['visualGroup'].get('displayName') or ''
    try:
        return d['visual']['visualContainerObjects']['title'][0]['properties']['text']['expr']['Literal']['Value'].strip("'")
    except (KeyError, IndexError, TypeError):
        return ''


def page_runs(pg):
    """Charts of one page grouped by tab, each tab's charts in reading order (absolute y, then x)."""
    vdir = os.path.join(B.DEF, 'pages', pg, 'visuals')
    vis = {}
    for f in glob.glob(os.path.join(vdir, '*', 'visual.json')):
        d, nl = B.rd(f)
        vis[d['name']] = (f, d, nl)

    def absolute(name):
        x = y = 0
        while name in vis:
            p = vis[name][1]['position']
            x, y = x + p.get('x', 0), y + p.get('y', 0)
            name = vis[name][1].get('parentGroupName')
        return y, x

    def tab_of(name):
        cur = vis[name][1].get('parentGroupName')
        while cur in vis:
            if sel(vis[cur][1]).startswith('Tab'):
                return cur
            cur = vis[cur][1].get('parentGroupName')
        return None
    runs = {}
    for name, (f, d, nl) in vis.items():
        # treemap / funnel carry no 'Chart' in their type: 01/10 the Daily treemaps kept the Legacy slice colours
        if 'Chart' in d.get('visual', {}).get('visualType', '') or d.get('visual', {}).get('visualType') in ('treemap', 'funnel'):
            runs.setdefault(tab_of(name), []).append((absolute(name), f, d, nl))
    return {t: sorted(xs, key=lambda r: r[0]) for t, xs in runs.items()}


def main(dry):
    n = 0
    for pdir in sorted(glob.glob(os.path.join(B.DEF, 'pages', '*'))):
        pg = os.path.basename(pdir)
        if not os.path.isdir(os.path.join(pdir, 'visuals')):
            continue
        for tab, charts in page_runs(pg).items():
            slot = 0                                   # every tab (screen) starts the template at slot 1
            for _, f, d, nl in charts:
                v = d['visual']
                before = json.dumps(v, sort_keys=True)
                dropped, log, used = paint(v, slot)
                slot += used
                if json.dumps(v, sort_keys=True) == before:
                    continue
                n += 1
                print('%-36s %-22s %-32s dropped %d fill | %s' % (pg, os.path.basename(os.path.dirname(f)), v['visualType'],
                                                                  dropped, ', '.join(log)))
                if not dry:
                    B.wr(f, d, nl)
    print('charts %s: %d' % ('to change' if dry else 'changed', n))


def card_rows(pg):
    """cardVisual Card_* of one page grouped by card row (nearest ancestor group named 'Card'), left to right."""
    vdir = os.path.join(B.DEF, 'pages', pg, 'visuals')
    vis = {}
    for f in glob.glob(os.path.join(vdir, '*', 'visual.json')):
        d, nl = B.rd(f)
        vis[d['name']] = (f, d, nl)

    def ax(name):
        x = 0
        while name in vis:
            x += vis[name][1]['position'].get('x', 0)
            name = vis[name][1].get('parentGroupName')
        return x

    def row(name):
        cur = vis[name][1].get('parentGroupName')
        while cur in vis:
            if sel(vis[cur][1]) == 'Card':
                return cur
            cur = vis[cur][1].get('parentGroupName')
        return vis[name][1].get('parentGroupName')
    rows = {}
    for name, (f, d, nl) in vis.items():
        if d.get('visual', {}).get('visualType') == 'cardVisual' and sel(d).startswith('Card_'):
            rows.setdefault(row(name), []).append((ax(name), f, d, nl))
    return {r: sorted(xs, key=lambda t: t[0]) for r, xs in rows.items()}


def scalar_days(dry):
    """Every chart on Dim_Date[Day] (int) gets a CONTINUOUS axis (user 2026-10-02: the waste on a column dashboard is the
    width - 31 days on a continuous axis fit half a tab, ~20 px a day, never scroll). Key as Desktop writes it:
    categoryAxis axisType 'Scalar' in the plain entry (Classic Total Bill combo). Ribbon charts have no Scalar axis."""
    n = 0
    for f in sorted(glob.glob(os.path.join(B.DEF, 'pages', '*', 'visuals', '*', 'visual.json'))):
        d, nl = B.rd(f)
        v = d.get('visual', {})
        cats = refs(v, 'Category')
        if v.get('visualType') == 'ribbonChart' or not cats or not all(c == 'Dim_Date.Day' for c in cats):
            continue
        ca = v.setdefault('objects', {}).setdefault('categoryAxis', [{'properties': {}}])
        e = next((x for x in ca if 'selector' not in x), None)
        if e is None:
            e = {'properties': {}}
            ca.insert(0, e)
        if json.dumps(e.get('properties', {}).get('axisType', {})).find('Scalar') < 0:
            e.setdefault('properties', {})['axisType'] = {'expr': {'Literal': {'Value': "'Scalar'"}}}
            n += 1
            if not dry:
                B.wr(f, d, nl)
    print('day charts %s Scalar: %d' % ('to set' if dry else 'set', n))


def bold_pct_lines(dry):
    """Every card % line (Pct_) bold (user 01/10: "in đậm mọi số %"; 44/44 Pct_ lines were plain). Key labels.bold - Desktop
    writes it on cards 18x in the estate."""
    n = 0
    for f in sorted(glob.glob(os.path.join(B.DEF, 'pages', '*', 'visuals', '*', 'visual.json'))):
        d, nl = B.rd(f)
        v = d.get('visual', {})
        if v.get('visualType') != 'card' or not sel(d).startswith('Pct_'):
            continue
        lab = v.setdefault('objects', {}).setdefault('labels', [{'properties': {}}])
        e = next((x for x in lab if 'selector' not in x), None)
        if e is None:
            e = {'properties': {}}
            lab.insert(0, e)
        if json.dumps(e.get('properties', {}).get('bold', {})).find('true') < 0:
            e.setdefault('properties', {})['bold'] = {'expr': {'Literal': {'Value': 'true'}}}
            n += 1
            if not dry:
                B.wr(f, d, nl)
    print('card %% lines %s bold: %d' % ('to set' if dry else 'set', n))


def paint_cards(dry):
    """Card VALUE colour = template slot by position in its row (user 2026-09-29: no red on a card value, the % line
    below carries up/down). Only objects.value fontColor changes."""
    order, n = PALETTE['order'], 0
    for pdir in sorted(glob.glob(os.path.join(B.DEF, 'pages', '*'))):
        pg = os.path.basename(pdir)
        if not os.path.isdir(os.path.join(pdir, 'visuals')):
            continue
        for r, tiles in card_rows(pg).items():
            for i, (_, f, d, nl) in enumerate(tiles):
                want = order[i % len(order)]          # tile i of a row -> colour i of the set (user 2026-09-30: "card cũng phải đủ bộ màu")
                ch = False
                for e in d['visual'].get('objects', {}).get('value', []):
                    pr = e.get('properties', {})
                    if 'fontColor' in pr and pr['fontColor'] != colour(want):
                        pr['fontColor'] = colour(want); ch = True
                if ch:
                    n += 1
                    print('%-36s %-24s slot %d %s' % (pg, sel(d), i % len(order) + 1, want))
                    if not dry:
                        B.wr(f, d, nl)
    print('card values %s: %d' % ('to change' if dry else 'changed', n))


# ---- MATRIX STYLE (user 2026-09-30: "matrix đang quá xấu, ko có cả header bold, màu header, rồi màu condition - phải
# đưa vào luật và skill áp dụng cho mọi matrix"). One look for every pivotTable / tableEx of a White report; keys all read
# from Desktop-written files (columnHeaders.backColor 356x, values.backColorSecondary 172x, subTotals.bold 15x ...).
MX = {'head_bg': '#44546A', 'head_fg': '#FFFFFF', 'text': '#2D2D2D', 'band1': '#FFFFFF', 'band2': '#F4F6F8',
      'total_bg': '#E3E8EE', 'grid': '#E3E3E3', 'size': '10D'}
TARGET_RE = re.compile(r'(?i)(of target|vs target|/target|% ?target|archive)')    # an attainment ratio: threshold 1


def lit(v):
    return {'expr': {'Literal': {'Value': v}}}


def plain(objs, name):
    """The selector-less entry of an object list (Desktop keeps show/format defaults there); created if missing."""
    lst = objs.setdefault(name, [])
    e = next((x for x in lst if 'selector' not in x), None)
    if e is None:
        e = {'properties': {}}
        lst.insert(0, e)
    return e.setdefault('properties', {})


def pct_measures(v, mm, neutral):
    """queryRef -> threshold for every VALUE whose measure is a % (by its FORMAT, not its name: 'vsWTDLW' is a %)."""
    out = {}
    for p in v.get('query', {}).get('queryState', {}).get('Values', {}).get('projections', []):
        if not p['queryRef'].startswith('#Measure.'):     # pct_color points at #Measure; Sum(col) / other tables skip
            continue
        name = p['queryRef'].split('.', 1)[1]
        m = mm.get(name) or {}
        fmt = m.get('fmt') or ''
        if '%' not in fmt or name in neutral or (m.get('wraps') and m['wraps'] in neutral):
            continue
        out[p['queryRef']] = PALETTE['pct_threshold'].get(name) or ('1D' if TARGET_RE.search(name) else '0D')
    return out


CHART_TITLE = {'alignment': lit("'left'"), 'fontSize': lit('12D'),
               'fontFamily': lit("'''Segoe UI Semibold'', wf_segoe-ui_semibold, helvetica, arial, sans-serif'"),
               'fontColor': solid('#2D2D2D')}               # the title of every chart (Trend Revenue by ...), measured 01/10


def style_title(v, vid):
    """Matrix title = the chart title (user 01/10): shown, left, Segoe UI Semibold 12, #2D2D2D, no title background;
    text from MATRIX_TITLES when the table had none (a technical Selection name never shows)."""
    from mix_specs import MATRIX_TITLES
    vco = v.setdefault('visualContainerObjects', {})
    tl = vco.setdefault('title', [{'properties': {}}])
    pr = tl[0].setdefault('properties', {})
    if vid in MATRIX_TITLES:
        pr['text'] = lit("'%s'" % MATRIX_TITLES[vid].replace("'", "''"))
    pr.update(CHART_TITLE)
    pr['show'] = lit('true')
    pr.pop('background', None)
    pr.pop('titleWrap', None)


def style_matrix(v, mm, neutral, vid=None):
    objs = v.setdefault('objects', {})
    if vid:
        style_title(v, vid)
    h = plain(objs, 'columnHeaders')
    h.update(bold=lit('true'), fontColor=solid(MX['head_fg']), backColor=solid(MX['head_bg']), fontSize=lit(MX['size']))
    for e in objs['columnHeaders']:                      # per-column header colours from Legacy go: one header look
        if 'selector' in e:
            for k in ('fontColor', 'backColor'):
                e.get('properties', {}).pop(k, None)
    r = plain(objs, 'rowHeaders')
    r.update(fontColor=solid(MX['text']), backColor=solid(MX['band1']), fontSize=lit(MX['size']))
    val = plain(objs, 'values')
    for k in ('backColor', 'fontColor'):
        val.pop(k, None)
    val.update(backColorPrimary=solid(MX['band1']), backColorSecondary=solid(MX['band2']),
               fontColorPrimary=solid(MX['text']), fontColorSecondary=solid(MX['text']), fontSize=lit(MX['size']))
    pcts = pct_measures(v, mm, neutral)
    keep, seen = [], set()
    for e in objs['values']:
        m = e.get('selector', {}).get('metadata')
        pr = e.get('properties', {})
        if m:
            bc = pr.get('backColor')
            if bc and 'FillRule' not in json.dumps(bc):  # a flat per-column fill breaks the banding; heat-maps stay
                pr.pop('backColor')
            if m in pcts and m in seen:                   # one colour entry per column: a second one keeps its other
                pr.pop('fontColor', None)                 # properties and its own selector, loses the colour
            elif m in pcts:
                pr['fontColor'] = B.pct_color(m.split('.', 1)[1], pcts[m]); seen.add(m)
                e['selector'] = per_point(m)
            elif 'fontColor' in pr and 'Conditional' not in json.dumps(pr['fontColor']):
                pr.pop('fontColor')
            if not pr:
                continue
        keep.append(e)
    for m, th in pcts.items():
        if m not in seen:
            keep.append({'properties': {'fontColor': B.pct_color(m.split('.', 1)[1], th)}, 'selector': per_point(m)})
    objs['values'] = keep
    tot = {'fontColor': solid(MX['text']), 'backColor': solid(MX['total_bg'])}
    if v.get('visualType') == 'pivotTable':
        s = plain(objs, 'subTotals')
        s.update(bold=lit('true'), applyToHeaders=lit('true'), **tot)
        for name in ('columnTotal', 'rowTotal'):
            if name in objs:
                plain(objs, name).update(bold=lit('true') if name == 'columnTotal' else plain(objs, name).get('bold', lit('true')), **tot)
    else:
        plain(objs, 'total').update(**tot)
    g = plain(objs, 'grid')
    for k in ('gridVerticalWeight', 'gridVerticalColor'):
        g.pop(k, None)
    g.update(gridVertical=lit('false'), gridHorizontal=lit('true'), gridHorizontalColor=solid(MX['grid']),
             gridHorizontalWeight=lit('1D'))
    return len(pcts)


def paint_matrices(dry):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import pbi_gate as G
    mm = G.model_measures(B.ROOT)
    folder = os.path.basename(os.path.normpath(B.ROOT))
    neutral = G.gate_cfg().get('pct_neutral', {}).get(folder, {})
    n = 0
    for f in sorted(glob.glob(os.path.join(B.DEF, 'pages', '*', 'visuals', '*', 'visual.json'))):
        d, nl = B.rd(f)
        v = d.get('visual', {})
        if v.get('visualType') not in ('pivotTable', 'tableEx'):
            continue
        before = json.dumps(v, sort_keys=True)
        k = style_matrix(v, mm, neutral, d['name'])
        if json.dumps(v, sort_keys=True) != before:
            n += 1
            print('%-36s %-22s %-10s %% columns coloured: %d  %s' % (f.split(os.sep)[-4], d['name'], v['visualType'], k, sel(d)[:40]))
            if not dry:
                B.wr(f, d, nl)
    print('matrices %s: %d' % ('to change' if dry else 'changed', n))


def bars_to_columns(dry):
    """Top / Bottom N charts drawn as horizontal bars become vertical columns (user 01/10: "mẫu này nên là chart dọc mới đủ hiện
    top5"). Same roles (Category / Y) and the same objects - only visualType changes."""
    n = 0
    for f in sorted(glob.glob(os.path.join(B.DEF, 'pages', '*', 'visuals', '*', 'visual.json'))):
        d, nl = B.rd(f)
        v = d.get('visual', {})
        if v.get('visualType') == 'clusteredBarChart' and re.match(r'(?i)(top|bottom) ?\d', sel(d)):
            v['visualType'] = 'clusteredColumnChart'
            n += 1
            print('%-36s %-34s bar -> column' % (f.split(os.sep)[-4], sel(d)[:34]))
            if not dry:
                B.wr(f, d, nl)
    print('charts %s: %d' % ('to change' if dry else 'changed', n))


# ---- HEAT MAP (user 2026-10-04: "có nên thêm màu mức độ cho dễ phân biệt" -> tô cả 2 bảng, một tông #015A80). One hue, white
# to #015A80 lightened 45% (#73A4B9): the dark text #2D2D2D stays 5.3:1 on the darkest cell, so no value-dependent font
# colour is needed (no Desktop-written shape for one to copy). Scale over the whole table (one gradient per measure).
HEAT = ('#FFFFFF', '#73A4B9')


def heatmap(pg, vid, dry=False):
    """values.backColor FillRule linearGradient2 per value measure, as Desktop writes it (Classic ff7149093e07c11ab874:
    Input measure, nullColoringStrategy asZero, selector dataViewWildcard matchingOption 1 + metadata = totals stay
    plain). FillRule entries whose selector points at a field the table no longer has (Legacy names such as
    'Measure.Sale/DateofWeek' - dead, Power BI ignores them) are dropped."""
    f = os.path.join(B.DEF, 'pages', pg, 'visuals', vid, 'visual.json')
    d, nl = B.rd(f)
    v = d['visual']
    refs = {p['queryRef']: p for p in v['query']['queryState'].get('Values', {}).get('projections', [])}
    vals = v.setdefault('objects', {}).setdefault('values', [])
    kept = [e for e in vals if 'FillRule' not in json.dumps(e.get('properties', {}).get('backColor', {}))]
    for q, p in refs.items():
        m = p.get('field', {}).get('Measure')
        if not m:
            continue
        # inside a FillRule the stops are BARE literals - no 'expr' wrapper: the wrapped form renders, but Desktop
        # cannot rebuild the report on Save (NullReferenceException in GetEnhancedReportDocument, Save/Publish dead
        # without a message - 84cb1304, found 2026-10-05)
        bare = lambda v: {'Literal': {'Value': v}}
        kept.append({'properties': {'backColor': {'solid': {'color': {'expr': {'FillRule': {
            'Input': {'Measure': m},
            'FillRule': {'linearGradient2': {
                'min': {'color': bare("'%s'" % HEAT[0])}, 'max': {'color': bare("'%s'" % HEAT[1])},
                'nullColoringStrategy': {'strategy': bare("'asZero'")}}}}}}}}},
            'selector': per_point(q)})
    v['objects']['values'] = kept
    if not dry:
        B.wr(f, d, nl)
    return len(refs)


def live_refs(v):
    return {p['queryRef']: p for r in v.get('query', {}).get('queryState', {}).values() for p in r.get('projections', [])}


def fillrule_input_ref(e, refs):
    """queryRef of the table field a FillRule reads (its Input), or None when that field is not in the table."""
    def find(o):
        if isinstance(o, dict):
            if 'FillRule' in o and isinstance(o['FillRule'], dict) and 'Input' in o['FillRule']:
                return o['FillRule']['Input']
            for x in o.values():
                r = find(x)
                if r is not None:
                    return r
        elif isinstance(o, list):
            for x in o:
                r = find(x)
                if r is not None:
                    return r
        return None
    inp = find(e)
    if not isinstance(inp, dict):
        return None
    if 'SelectRef' in inp:
        q = inp['SelectRef']['ExpressionName']
        return q if q in refs else None
    meas = inp.get('Measure')
    if not meas:
        return None
    for q, p in refs.items():
        f = p.get('field', {}).get('Measure')
        if f and f.get('Property') == meas.get('Property') and \
                f['Expression']['SourceRef'].get('Entity') == meas['Expression']['SourceRef'].get('Entity'):
            return q
    return None


def repair_fillrules(dry=False):
    """Colour scales copied from Legacy whose selector names a field the table no longer has (user 2026-10-04: "bổ sung
    đủ màu lại"). Measured 04/10: Legacy and Classic carry 21 such entries, White 54 - the White rebinding renamed the
    rule's Input to the warehouse measure but left selector.metadata on the old name, so 33 rules that showed colour in
    Legacy went silent. Input is a field of the table => point the selector at it (colour back, as in Legacy);
    Input is not in the table => the rule never showed, even in Legacy => drop it. Exact duplicates are dropped."""
    revived = dropped = 0
    for f in glob.glob(os.path.join(B.DEF, 'pages', '*', 'visuals', '*', 'visual.json')):
        d, nl = B.rd(f)
        v = d.get('visual', {})
        refs = live_refs(v)
        ch = False
        for k, es in list(v.get('objects', {}).items()):
            out, seen = [], set()
            for e in es:
                m = e.get('selector', {}).get('metadata')
                if 'FillRule' in json.dumps(e) and m and m not in refs:
                    q = fillrule_input_ref(e, refs)
                    ch = True
                    if q is None:
                        dropped += 1
                        continue
                    e['selector']['metadata'] = q
                    revived += 1
                key = json.dumps(e, sort_keys=True)
                if key in seen:
                    ch = True
                    continue
                seen.add(key)
                out.append(e)
            v['objects'][k] = out
        if ch and not dry:
            B.wr(f, d, nl)
    print('colour scales revived: %d · dropped (dead since Legacy): %d' % (revived, dropped))
    return revived, dropped


if __name__ == '__main__':
    if '--repair-fillrules' in sys.argv:
        repair_fillrules('--dry' in sys.argv)
        sys.exit(0)
    if '--heatmap' in sys.argv:
        # --heatmap <pageId> <visualId> [<visualId> ...]
        i = sys.argv.index('--heatmap')
        pg = sys.argv[i + 1]
        for vid in sys.argv[i + 2:]:
            if not vid.startswith('--'):
                print(vid, 'heat map on', heatmap(pg, vid, '--dry' in sys.argv), 'measure(s)')
        sys.exit(0)
    if '--matrices' in sys.argv:
        paint_matrices('--dry' in sys.argv)
        sys.exit(0)
    if '--scalar-days' in sys.argv:
        scalar_days('--dry' in sys.argv)
        sys.exit(0)
    if '--bars-to-columns' in sys.argv:
        bars_to_columns('--dry' in sys.argv)
        sys.exit(0)
    main('--dry' in sys.argv)
    if '--cards' in sys.argv:
        paint_cards('--dry' in sys.argv)
        bold_pct_lines('--dry' in sys.argv)
