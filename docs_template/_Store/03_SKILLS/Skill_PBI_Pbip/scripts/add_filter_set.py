"""Give every filter panel of a White / Red report the department's common filter set, synced across pages.

    python scripts/add_filter_set.py <report folder>            # dry run: prints every box it would add or move
    python scripts/add_filter_set.py <report folder> --apply

The set = the gate's location keys (pbi_gate.FILTER_SET, minus filter_skip of the page) + the repo's own list in
config/pbi-gate.json 'filter_set' ({"<folder>": [{"key", "field": "Table.Column", "caption", "pages": "*" | [names]}]}).
For each page with a Filter_Panel group:
  - a missing box = a copy of the panel's Year slicer and its label: field, caption (label text + projection displayName),
    no selection, the visual filter 'not blank' (null + the warehouse labels on a text column), syncGroup FilterSet_<key>;
  - every box of the set gets its syncGroup (Year / Month too), except filter_unsynced;
  - the panel is laid out again on the fixed step (label 20 + box 40 + gap 5 = 65 from y 65), set order first;
  - every bookmark of the page gets the new box and label in the state of the Year box and label (display, targets,
    and in a bookmark that captures slicer data, an empty selection).
A field the model does not have is skipped and named. Files keep Desktop's layout (indent 2, line ends).
Close Power BI Desktop first and checkpoint the folder (git add): the gate's user-save check.
"""
import copy
import glob
import json
import os
import re
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pbi_gate as G  # noqa: E402

LABELS = ['null', "'Unknown'", "'Not Applicable'", "'#NA'", "'#UNKNOWN'"]   # warehouse labels of an empty dim cell
STEP, TOP, ROWS_MAX = 65, 65, 10
CAPTION = {'AreaManager': 'Area Manager', 'StoreName': 'Store', 'District': 'District', 'Channel': 'Channel'}


def nid():
    return uuid.uuid4().hex[:20]


def read(f):
    raw = open(f, 'rb').read()
    return json.loads(raw), raw


def dump(d, raw):
    nl = '\r\n' if b'\r\n' in raw else '\n'
    return (json.dumps(d, indent=2, ensure_ascii=False).replace('\n', nl) + (nl if raw.endswith(b'\n') else '')).encode('utf-8')


def col(ent, prop, source=None):
    return {'Column': {'Expression': {'SourceRef': ({'Source': source} if source else {'Entity': ent})}, 'Property': prop}}


def not_blank(ent, prop, is_text):
    vals = LABELS if is_text else ['null']
    return {'Version': 2, 'From': [{'Name': 'd1', 'Entity': ent, 'Type': 0}],
            'Where': [{'Condition': {'Not': {'Expression': {'In': {
                'Expressions': [col(ent, prop, 'd1')], 'Values': [[{'Literal': {'Value': v}}] for v in vals]}}}}}]}


def model_columns(report_dir):
    out = {}
    for t in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        s = open(t, encoding='utf-8').read()
        tab = os.path.basename(t)[:-5]
        for c in re.finditer(r"(?m)^\tcolumn\s+('(?:[^']|'')+'|[^\s=]+)[^\n]*\n((?:\t\t[^\n]*\n)*)", s):
            dt = re.search(r'dataType:\s*(\w+)', c.group(2))
            out['%s.%s' % (tab, c.group(1).strip("'"))] = dt.group(1) if dt else '?'
    return out


def slicer_field(v):
    pr = v.get('visual', {}).get('query', {}).get('queryState', {}).get('Values', {}).get('projections', [])
    return pr[0].get('queryRef') if pr else None


def title(v):
    try:
        return v['visual']['visualContainerObjects']['title'][0]['properties']['text']['expr']['Literal']['Value'].strip("'")
    except (KeyError, IndexError):
        return None


def set_title(v, text):
    v['visual']['visualContainerObjects']['title'][0]['properties']['text'] = {'expr': {'Literal': {'Value': "'%s'" % text}}}


def wanted(folder, page, cols):
    """[(key, field, caption)] for this page, in panel order: the gate's set first, then the repo's own list."""
    out = []
    skip = G.filter_skip(folder, page)
    for key, refs, _eq in G.FILTER_SET:
        if key in G.FILTER_ADD and key not in skip and refs[0] in cols:
            out.append((key, refs[0], CAPTION.get(key, key)))
    for e in G.gate_cfg().get('filter_set', {}).get(folder, []):
        pages = e.get('pages', '*')
        if pages == '*' or page in pages:
            out.append((e['key'], e['field'], e.get('caption', e['key'])))
    return out


def set_key(ref, folder, page):
    """Key of a slicer field in the whole set (gate keys incl. Year / Month, then the repo list), else None."""
    for key, refs, eq in G.FILTER_SET:
        if ref in refs or any(ref in e for e in eq):
            return key
    for e in G.gate_cfg().get('filter_set', {}).get(folder, []):
        if e['field'] == ref:
            return e['key']
    return {'Dim_Date.CurrentYearLabel': 'Year', 'Dim_Date.CurrentMonthLabel': 'Month'}.get(ref)


def order_rank(key, folder):
    names = [k for k, _r, _e in G.FILTER_SET] + [e['key'] for e in G.gate_cfg().get('filter_set', {}).get(folder, [])]
    return names.index(key) if key in names else len(names)


def run(report_dir, apply):
    folder = os.path.basename(os.path.normpath(report_dir))
    cols = model_columns(report_dir)
    d_def = glob.glob(os.path.join(report_dir, '*.Report', 'definition'))[0]
    unsynced = G.filter_unsynced(folder)
    bm_files = glob.glob(os.path.join(d_def, 'bookmarks', '*.bookmark.json'))
    writes = {}
    for pdir in sorted(glob.glob(os.path.join(d_def, 'pages', '*', ''))):
        pid = os.path.basename(os.path.normpath(pdir))
        pjson = os.path.join(pdir, 'page.json')
        if not os.path.isfile(pjson):
            continue
        page = read(pjson)[0]
        if page.get('visibility') == 'HiddenInViewMode':
            continue
        pname = page.get('displayName')
        V, RAW, FILES = {}, {}, {}
        for f in glob.glob(os.path.join(pdir, 'visuals', '*', 'visual.json')):
            d, raw = read(f)
            V[d['name']], RAW[d['name']], FILES[d['name']] = d, raw, f
        panel = next((n for n, d in V.items() if d.get('visualGroup', {}).get('displayName') == 'Filter_Panel'), None)
        if not panel:
            continue
        kids = [n for n, d in V.items() if d.get('parentGroupName') == panel]
        slicers = [n for n in kids if V[n].get('visual', {}).get('visualType') == 'slicer']
        labels = [n for n in kids if V[n].get('visual', {}).get('visualType') == 'shape'
                  and V[n]['position'].get('height', 0) <= 30 and V[n]['position'].get('y', 0) >= 60]

        def label_of(s):
            y = V[s]['position']['y']
            return next((l for l in labels if abs(V[l]['position']['y'] + V[l]['position']['height'] - y) <= 1), None)
        tpl = next((s for s in slicers if slicer_field(V[s]) == 'Dim_Date.CurrentYearLabel'), slicers[0] if slicers else None)
        if not tpl or not label_of(tpl):
            print('page %s: no slicer + label to copy - skipped' % pname)
            continue
        tpl_label = label_of(tpl)
        have = {slicer_field(V[s]) for s in slicers}
        added = []
        for key, field, caption in wanted(folder, pname, cols):
            if field in have:
                continue
            if field not in cols:
                print('page %s: %s field %s not in the model - skipped' % (pname, key, field))
                continue
            ent, prop = field.split('.', 1)
            s = copy.deepcopy(V[tpl])
            s['name'] = nid()
            vis = s['visual']
            vis['query'] = {'queryState': {'Values': {'projections': [dict(field=col(ent, prop), queryRef=field,
                                                                       nativeQueryRef=prop, active=True, displayName=caption)]}}}
            for e in vis.get('objects', {}).get('general', []):
                e.get('properties', {}).pop('filter', None)
            vis['objects']['data'] = [{'properties': {'mode': {'expr': {'Literal': {'Value': "'Dropdown'"}}}}}]
            s['filterConfig'] = {'filters': [
                {'name': nid(), 'field': col(ent, prop), 'type': 'Categorical'},
                {'name': nid(), 'field': col(ent, prop), 'type': 'Advanced',
                 'filter': not_blank(ent, prop, cols[field] == 'string'), 'howCreated': 'User'}]}
            set_title(s, 'Slicer_%s' % key)
            lab = copy.deepcopy(V[tpl_label])
            lab['name'] = nid()
            set_title(lab, caption)
            V[s['name']], V[lab['name']] = s, lab
            RAW[s['name']], RAW[lab['name']] = RAW[tpl], RAW[tpl_label]
            FILES[s['name']] = os.path.join(pdir, 'visuals', s['name'], 'visual.json')
            FILES[lab['name']] = os.path.join(pdir, 'visuals', lab['name'], 'visual.json')
            slicers.append(s['name'])
            labels.append(lab['name'])
            added.append((s['name'], lab['name'], key))
            print('page %s: add %s (%s, "%s")' % (pname, key, field, caption))
        pairs = [(s, label_of(s) if s not in [a[0] for a in added] else next(a[1] for a in added if a[0] == s)) for s in slicers]
        keyed = [(order_rank(set_key(slicer_field(V[s]), folder, pname), folder), V[s]['position']['y'], s, l) for s, l in pairs]
        keyed.sort()
        if len(keyed) > ROWS_MAX:
            print('page %s: %d boxes > %d - the panel cannot hold them all' % (pname, len(keyed), ROWS_MAX))
        changed = {a[0] for a in added} | {a[1] for a in added}
        for i, (_r, _y, s, l) in enumerate(keyed):
            for n, y in ((s, TOP + 20 + STEP * i), (l, TOP + STEP * i)):
                if n and V[n]['position']['y'] != y:
                    V[n]['position']['y'] = y
                    changed.add(n)
            key = set_key(slicer_field(V[s]), folder, pname)
            if key and (key, pname) not in unsynced:
                sg = {'groupName': 'FilterSet_%s' % key, 'fieldChanges': True, 'filterChanges': True}
                if V[s]['visual'].get('syncGroup') != sg:
                    V[s]['visual']['syncGroup'] = sg
                    changed.add(s)
        for n in changed:
            writes[FILES[n]] = dump(V[n], RAW[n])
        if not added:
            continue
        for bf in bm_files:
            b, raw = writes.get(bf + '#obj') or read(bf)
            vc = b.get('explorationState', {}).get('sections', {}).get(pid, {}).get('visualContainers')
            if vc is None:
                continue
            tg = b.get('options', {}).get('targetVisualNames')
            for s, lab, key in added:
                ent, prop = slicer_field(V[s]).split('.', 1)
                if tpl in vc:
                    e = copy.deepcopy(vc[tpl])
                    if 'filters' in e:
                        e['filters'] = {'byExpr': [
                            {'name': V[s]['filterConfig']['filters'][0]['name'], 'type': 'Categorical',
                             'expression': col(ent, prop), 'howCreated': 1},
                            {'name': V[s]['filterConfig']['filters'][1]['name'], 'type': 'Advanced',
                             'expression': col(ent, prop), 'howCreated': 1,
                             'filter': V[s]['filterConfig']['filters'][1]['filter']}]}
                    sv = e.get('singleVisual', {})
                    if 'activeProjections' in sv:
                        sv['activeProjections'] = {'Values': [col(ent, prop)]}
                    vc[s] = e
                if tpl_label in vc:
                    vc[lab] = copy.deepcopy(vc[tpl_label])
                if isinstance(tg, list):
                    if tpl in tg:
                        tg.append(s)
                    if tpl_label in tg:
                        tg.append(lab)
            writes[bf + '#obj'] = (b, raw)
    out = {}
    for k, v in writes.items():
        if k.endswith('#obj'):
            out[k[:-4]] = dump(*v)
        else:
            out[k] = v
    for f in sorted(out):
        print('%s %s' % ('write' if apply else 'would write', os.path.relpath(f, report_dir).replace(os.sep, '/')))
        if apply:
            os.makedirs(os.path.dirname(f), exist_ok=True)
            open(f, 'wb').write(out[f])
    print('%s %d file(s)' % ('wrote' if apply else 'dry run:', len(out)))


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    for r in args:
        run(r, '--apply' in sys.argv)
