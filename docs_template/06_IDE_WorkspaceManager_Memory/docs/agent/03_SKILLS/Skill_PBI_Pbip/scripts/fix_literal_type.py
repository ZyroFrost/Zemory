"""Drop filter terms whose value has another type than the column (literal-type of pbi_gate.py).

    python scripts/fix_literal_type.py <report folder> [...]          # dry run: prints every term it would drop
    python scripts/fix_literal_type.py <report folder> [...] --apply

A term is Not(Comparison(column = literal)) or a value of In (...) whose literal kind does not fit the column dataType read
from the report's own model ('Unknown' on Dim_Date.DateKey dateTime / Dim_Date.Year int64). An And with one bad side becomes
its other side; an In loses the bad values. Files keep Desktop's own layout (indent 2, line ends); a file whose layout differs
is skipped and named.
"""
import glob
import json
import os
import re
import sys

KIND_OK = {'string': {'text'}, 'int64': {'int', 'num'}, 'double': {'num', 'int'}, 'decimal': {'num', 'int'},
           'dateTime': {'date'}, 'boolean': {'bool'}}


def lit_kind(v):
    if v == 'null':
        return 'null'
    if v.startswith("'"):
        return 'text'
    if v.startswith('datetime'):
        return 'date'
    if v in ('true', 'false'):
        return 'bool'
    if re.fullmatch(r'-?\d+L', v):
        return 'int'
    if re.fullmatch(r'-?[\d.]+[DM]?', v):
        return 'num'
    return '?'


def model_types(report_dir):
    types = {}
    for t in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        s = open(t, encoding='utf-8').read()
        m = re.search(r"(?m)^table\s+('(?:[^']|'')+'|\S+)", s)
        if not m:
            continue
        tab = m.group(1).strip("'").replace("''", "'")
        for c in re.finditer(r"(?m)^\tcolumn\s+('(?:[^']|'')+'|[^\s=]+)[^\n]*\n((?:\t\t[^\n]*\n)*)", s):
            dt = re.search(r'dataType:\s*(\w+)', c.group(2))
            if dt:
                types[(tab, c.group(1).strip("'").replace("''", "'").lower())] = dt.group(1)
    return types


def col_type(col, alias, types):
    sr = col.get('Expression', {}).get('SourceRef', {})
    tab = sr.get('Entity') or alias.get(sr.get('Source'))
    return tab, types.get((tab, str(col.get('Property', '')).lower()))


def bad_literal(dt, lv):
    return dt in KIND_OK and lv not in (None, 'null') and lit_kind(lv) not in KIND_OK[dt]


def is_bad_term(node, alias, types):
    """Not(Comparison(col, literal)) or Comparison(col, literal) with a value of another type."""
    e = node.get('Not', {}).get('Expression', node) if isinstance(node, dict) else None
    c = e.get('Comparison') if isinstance(e, dict) else None
    if not isinstance(c, dict) or 'Column' not in c.get('Left', {}):
        return None
    tab, dt = col_type(c['Left']['Column'], alias, types)
    lv = c.get('Right', {}).get('Literal', {}).get('Value')
    return '%s[%s] (%s) = %s' % (tab, c['Left']['Column'].get('Property'), dt, lv) if bad_literal(dt, lv) else None


def clean(node, alias, types, dropped):
    if isinstance(node, list):
        return [clean(x, alias, types, dropped) for x in node]
    if not isinstance(node, dict):
        return node
    if isinstance(node.get('From'), list):
        alias = dict(alias, **{s.get('Name'): s.get('Entity') for s in node['From'] if isinstance(s, dict)})
    if isinstance(node.get('And'), dict):
        left, right = node['And'].get('Left'), node['And'].get('Right')
        bl, br = is_bad_term(left, alias, types), is_bad_term(right, alias, types)
        if bl and not br:
            dropped.append(bl)
            return clean(right, alias, types, dropped)
        if br and not bl:
            dropped.append(br)
            return clean(left, alias, types, dropped)
    inn = node.get('In')
    if isinstance(inn, dict) and len(inn.get('Expressions', [])) == 1 and 'Column' in inn['Expressions'][0]:
        tab, dt = col_type(inn['Expressions'][0]['Column'], alias, types)
        keep = []
        for row in inn.get('Values', []):
            lv = row[0].get('Literal', {}).get('Value') if row and isinstance(row[0], dict) else None
            if bad_literal(dt, lv):
                dropped.append('%s[%s] (%s) in %s' % (tab, inn['Expressions'][0]['Column'].get('Property'), dt, lv))
            else:
                keep.append(row)
        if keep and len(keep) != len(inn['Values']):
            inn['Values'] = keep
    return {k: clean(v, alias, types, dropped) for k, v in node.items()}


def dump(d, raw):
    nl = '\r\n' if b'\r\n' in raw else '\n'
    return (json.dumps(d, indent=2, ensure_ascii=False).replace('\n', nl) + (nl if raw.endswith(b'\n') else '')).encode('utf-8')


def main(argv):
    apply = '--apply' in argv
    total = 0
    for rep in [a for a in argv if not a.startswith('--')]:
        types = model_types(rep)
        rdir = glob.glob(os.path.join(rep, '*.Report'))[0]
        for f in sorted(glob.glob(os.path.join(rdir, 'definition', '**', '*.json'), recursive=True)):
            raw = open(f, 'rb').read()
            try:
                d = json.loads(raw)
            except ValueError:
                continue
            # the layout is judged on the file as read: clean() edits an In's value list in place, so comparing after it
            # called every In fix a layout change and skipped it
            same_layout = dump(d, raw) == raw
            dropped = []
            new = clean(d, {}, types, dropped)
            if not dropped:
                continue
            rel = os.path.relpath(f, rep).replace(os.sep, '/')
            if not same_layout:
                print('SKIP (layout differs, fix by hand): %s %s' % (rel, dropped))
                continue
            total += len(dropped)
            for x in dropped:
                print('%s  %s: drop %s' % ('fix' if apply else 'would fix', rel, x))
            if apply:
                open(f, 'wb').write(dump(new, raw))
    print('%s %d term(s)' % ('dropped' if apply else 'dry run:', total))


if __name__ == '__main__':
    main(sys.argv[1:])
