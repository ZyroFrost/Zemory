"""Card icons for a White report (user 2026-10-01): the empty right side of every KPI card gets an icon.

Rules (user 2026-10-01, skill pbi-white 4m):
  1. the icon frame is a SQUARE anchored TOP-RIGHT, 5 px in from the top and right edges of the visible card (BG_),
     60% of the full-height square (90 px card -> 45 px) so it clears the % line (row 3)
  2. the icon colour is the colour of that card's value text (its theme slot)
  3. one stroke thickness for every icon, measured in px - the icon library's mark ~17.5 px on a 512 image
     (the design standard §KHO ICON: thickness = 2 x opaque px / edge px; key 17.8, building-store 17.3)
  4. the icon says what the card shows; simple outline icons (Tabler, MIT) - see ICONS

Usage:
  python scripts/card_icons.py render            # Tabler SVG -> 512 px PNG, stroke tuned to the mark, into the icon library
  python scripts/card_icons.py place             # add / refresh Image_<Key> in every card of MIX_ROOT (default AM White)
  python scripts/card_icons.py measure <png>...  # print the stroke thickness of PNG files
"""
import glob, json, os, re, shutil, subprocess, sys, tempfile, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from region_values import manager_root, value as region_value  # noqa: E402
LIB = os.path.join(manager_root(REPO) or os.path.join(REPO, '.no-region'), region_value(REPO, 'icons_dir', 'icons'))
TABLER = 'https://unpkg.com/@tabler/icons@3.19.0/icons/outline/%s.svg'
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
MARK, TOL = 17.5, 0.5                 # stroke px on a 512 image (library mark 17.3-17.9)
SIZE = 512

# card key (Card_<Key>) -> icon name in the library (Tabler outline). One idea per icon, few strokes.
ICONS = {
    'Revenue': 'cash-banknote', 'Target': 'target', 'Cogs': 'package', 'Stores': 'building-store',
    'Customer': 'users', 'Quantity': 'package', 'Orders': 'receipt', 'Refund': 'receipt-dollar',
}
ICONS.update(region_value(REPO, 'card_icons', {}) or {})  # the region's own card keys (values.json "card_icons")


def thickness(path):
    """2 x opaque / edge pixels of the alpha mask (the design standard §KHO ICON)."""
    from PIL import Image
    import numpy as np
    a = np.array(Image.open(path).convert('RGBA'))[:, :, 3] > 127
    pad = np.pad(a, 1)
    inner = pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
    edge = int((a & ~inner).sum())
    return 2.0 * int(a.sum()) / max(edge, 1)


def svg_source(name):
    local = os.path.join(tempfile.gettempdir(), 'tabler_%s.svg' % name)
    if not os.path.exists(local):
        with urllib.request.urlopen(TABLER % name, timeout=60) as r:
            open(local, 'wb').write(r.read())
    return open(local, encoding='utf-8').read()


def render(svg, stroke, out, colour='#000000'):
    """Chrome headless, transparent background (the design standard: chrome --headless --default-background-color=00000000)."""
    s = re.sub(r'stroke-width="[^"]*"', 'stroke-width="%s"' % stroke, svg, count=1)
    s = s.replace('stroke="currentColor"', 'stroke="%s"' % colour)
    s = re.sub(r'width="24"\s+height="24"', 'width="%d" height="%d"' % (SIZE, SIZE), s, count=1)
    d = tempfile.mkdtemp()
    html = os.path.join(d, 'i.html')
    open(html, 'w', encoding='utf-8').write(
        '<!doctype html><html><body style="margin:0;background:transparent">%s</body></html>' % s)
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
                    '--default-background-color=00000000', '--window-size=%d,%d' % (SIZE, SIZE),
                    '--screenshot=%s' % out, 'file:///' + html.replace('\\', '/')],
                   check=True, capture_output=True, timeout=120)
    shutil.rmtree(d, ignore_errors=True)


def tune(name):
    """Stroke width (on the 24 grid) whose render measures MARK px - bisection on the measured value."""
    svg = svg_source(name)
    lo, hi, best = 0.3, 1.6, None
    tmp = os.path.join(tempfile.gettempdir(), 'tune_%s.png' % name)
    for _ in range(12):
        mid = round((lo + hi) / 2, 3)
        render(svg, mid, tmp)
        t = thickness(tmp)
        best = (mid, t)
        if abs(t - MARK) <= TOL / 2:
            break
        lo, hi = (mid, hi) if t < MARK else (lo, mid)
    return svg, best


def recolour(src, dst, colour):
    """Same alpha, RGB replaced by the colour (library rule: variants are generated, shape unchanged)."""
    from PIL import Image
    import numpy as np
    a = np.array(Image.open(src).convert('RGBA'))
    c = colour.lstrip('#')
    a[:, :, 0], a[:, :, 1], a[:, :, 2] = int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)
    Image.fromarray(a).save(dst)


def cmd_render():
    rows = []
    for name in sorted(set(ICONS.values())):
        base = os.path.join(LIB, name + '.png')
        if os.path.exists(base) and abs(thickness(base) - MARK) <= TOL:
            rows.append((name, 'kept (library)', round(thickness(base), 1)))
            continue
        if os.path.exists(base):
            raise SystemExit('%s.png exists in the library with another stroke (%.1f px) - a NEW drawing needs a new '
                             'number (<name>_2), never overwrite (the design standard §KHO ICON step 3)' % (name, thickness(base)))
        svg, (stroke, _) = tune(name)
        render(svg, stroke, base)
        for suffix, colour in (('_red', '#C51E24'), ('_white', '#FFFFFF')):
            recolour(base, os.path.join(LIB, name + suffix + '.png'), colour)
        rows.append((name, 'stroke-width %s' % stroke, round(thickness(base), 1)))
    for r in rows:
        print('%-18s %-22s %s px' % r)


def lit(v):
    return {'expr': {'Literal': {'Value': v}}}


def sel(d):
    if 'visualGroup' in d:
        return d['visualGroup'].get('displayName', '')
    try:
        return d['visual']['visualContainerObjects']['title'][0]['properties']['text']['expr']['Literal']['Value'].strip("'")
    except (KeyError, IndexError, TypeError):
        return ''


def value_colour(card, theme):
    """The hex of the card's value text: a theme slot (ThemeDataColor ColorId 2 = dataColors[0]) or a literal."""
    for e in card['visual'].get('objects', {}).get('value', []):
        fc = e.get('properties', {}).get('fontColor')
        if not fc:
            continue
        s = json.dumps(fc)
        m = re.search(r'"ColorId": (\d+)', s)
        if m and 2 <= int(m.group(1)) < 2 + len(theme):
            return theme[int(m.group(1)) - 2]
        m = re.search(r"'(#[0-9A-Fa-f]{6})'", s)
        if m:
            return m.group(1).upper()
    return None


def image_visual(vid, parent, key, item, x, y, s):
    """A Desktop-shaped image visual (khuôn: a department repo White the company logo - image.sourceFile + fit 'Fill', no background/border)."""
    return {
        '$schema': 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.10.0/schema.json',
        'name': vid,
        'position': {'x': x, 'y': y, 'z': 3000, 'height': s, 'width': s, 'tabOrder': 3000},
        'visual': {
            'visualType': 'image',
            'objects': {'image': [
                {'properties': {'sourceFile': {'image': {'name': lit("'%s'" % item),
                                                         'url': {'expr': {'ResourcePackageItem': {
                                                             'PackageName': 'RegisteredResources', 'PackageType': 1,
                                                             'ItemName': item}}},
                                                         'scaling': lit("'Normal'")}},
                                'sourceType': lit("'image'"), 'fit': lit("'Fill'")}},
                {'properties': {'effects': lit('false'), 'fit': lit("'Fill'")}, 'selector': {'id': 'default'}}]},
            'visualContainerObjects': {
                'title': [{'properties': {'text': lit("'Image_%s'" % key), 'show': lit('false')}}],
                'background': [{'properties': {'show': lit('false')}}],
                'border': [{'properties': {'show': lit('false')}}],
                'padding': [{'properties': {'top': lit('0D'), 'bottom': lit('0D'), 'left': lit('0D'), 'right': lit('0D')}}],
                'visualHeader': [{'properties': {'show': lit('false')}}]},
            'drillFilterOtherVisuals': True},
        'parentGroupName': parent,
        'howCreated': 'InsertVisualButton'}


ICON_SHARE = 0.6                      # icon side = 60% of the full-height square (user 01/10: "nhỏ lại tầm 40%")


def icon_size(card_h):
    """Side of the icon square for a visible card of height card_h, on the 5-grid, rounded DOWN (90 -> 45)."""
    return int(5 * ((ICON_SHARE * (card_h - 10)) // 5))


def head_width(path):
    """The width a visual had at HEAD (before any icon pass), or None."""
    rel = os.path.relpath(path, REPO).replace(os.sep, '/')
    r = subprocess.run(['git', 'show', 'HEAD:' + rel], cwd=REPO, capture_output=True, text=True, encoding='utf-8')
    return json.loads(r.stdout)['position']['width'] if r.returncode == 0 else None


def cmd_place():
    sys.path.insert(0, HERE)
    import hashlib
    import mix_builder as B
    from mix_specs import PALETTE
    theme = [c.upper() for c in PALETTE['theme']]
    reg = os.path.join(os.path.dirname(B.DEF), 'StaticResources', 'RegisteredResources')
    rj = os.path.join(B.DEF, 'report.json')
    report, rnl = B.rd(rj)
    pkg = next(p for p in report['resourcePackages'] if p.get('name') == 'RegisteredResources')
    have = {i['name'] for i in pkg['items']}
    placed, skipped = 0, []
    order = json.load(open(os.path.join(B.DEF, 'pages', 'pages.json'), encoding='utf-8'))['pageOrder']
    for pg in order:
        vdir = os.path.join(B.DEF, 'pages', pg, 'visuals')
        vis = {}
        for f in glob.glob(os.path.join(vdir, '*', 'visual.json')):
            d, nl = B.rd(f)
            vis[d['name']] = (f, d, nl)
        new_ids = {}
        for name, (f, d, nl) in list(vis.items()):
            nm = sel(d)
            if not nm.startswith('Card_') or d.get('visual', {}).get('visualType') != 'cardVisual':
                continue
            key = nm[5:]
            icon = ICONS.get(key)
            par = d.get('parentGroupName')
            bg = next((x for (_, x, _) in vis.values() if x.get('parentGroupName') == par and sel(x).startswith('BG_')), None)
            colour = value_colour(d, theme)
            if not icon or not bg or not colour:
                skipped.append('%s/%s (icon %s, BG %s, colour %s)' % (pg[:8], nm, icon, bool(bg), colour))
                continue
            item = '%s_%s.png' % (icon, colour.lstrip('#').lower())
            dst = os.path.join(reg, item)
            if not os.path.exists(dst):
                recolour(os.path.join(LIB, icon + '.png'), dst, colour)
            if item not in have:
                pkg['items'].append({'name': item, 'path': item, 'type': 'Image'})
                have.add(item)
            p = bg['position']
            # square anchored TOP-RIGHT, 5 px in from the top and right edges, ~40% smaller than the full-height square
            # (user 01/10: "chỉ offset 5 2 cạnh trên thôi ... nhỏ lại tầm 40%, phải ko chạm vào phần chữ ở hàng 3")
            s = icon_size(p['height'])
            # no int(): an equal card row can be 313.75 wide (gate equal-split) - the icon follows the real right edge
            x, y = p['x'] + p['width'] - 5 - s, p['y'] + 5
            x = int(x) if float(x).is_integer() else x
            vid = 'ic' + hashlib.md5(('%s|%s' % (pg, key)).encode()).hexdigest()[:18]
            vf = os.path.join(vdir, vid, 'visual.json')
            os.makedirs(os.path.dirname(vf), exist_ok=True)
            v = image_visual(vid, par, key, item, x, y, s)
            if d.get('isHidden'):
                v['isHidden'] = True
            B.wr(vf, v, nl)
            # the card's text boxes stop 5 px before the icon, so a long number shrinks / ellipsises in its own box instead
            # of running under the icon (screenshot 01/10: '114.08% of Target' touched the icon on a 210 card)
            # the value (row 2) stops 5 px before the icon; the % line (row 3) sits BELOW the icon and keeps its width
            tp = d['position']
            room = x - 5 - tp['x']
            if tp['width'] != room:
                tp['width'] = room
                B.wr(f, d, nl)
            for (tf, tv, tnl) in [t for t in vis.values() if t[1].get('parentGroupName') == par and sel(t[1]).startswith('Pct_')]:
                w0 = head_width(tf)
                if w0 and tv['position']['width'] != w0:
                    tv['position']['width'] = w0
                    B.wr(tf, tv, tnl)
            new_ids[name] = vid
            placed += 1
        if new_ids:
            follow_bookmarks(B, pg, new_ids)
    B.wr(rj, report, rnl)
    print('icons placed:', placed)
    for s in skipped:
        print('  skipped', s)


def follow_bookmarks(B, pg, new_ids):
    """Every bookmark that captures a card also captures its icon, with the SAME display state (tabs / overlays)."""
    for f in glob.glob(os.path.join(B.DEF, 'bookmarks', '*.bookmark.json')):
        b, nl = B.rd(f)
        sec = b.get('explorationState', {}).get('sections', {}).get(pg)
        if not sec:
            continue
        vc = sec.setdefault('visualContainers', {})
        changed = False
        for card, icon in new_ids.items():
            if card in vc:
                st = {'singleVisual': {'visualType': 'image', 'objects': {}}}
                disp = vc[card].get('singleVisual', {}).get('display')
                if disp:
                    st['singleVisual']['display'] = disp
                if vc.get(icon) != st:
                    vc[icon] = st
                    changed = True
            tv = b.get('options', {}).get('targetVisualNames')
            if tv and card in tv and icon not in tv:
                tv.append(icon)
                changed = True
        if changed:
            B.wr(f, b, nl)


if __name__ == '__main__':
    a = sys.argv[1:2]
    if a == ['render']:
        cmd_render()
    elif a == ['measure']:
        for p in sys.argv[2:]:
            print('%-40s %.1f px' % (os.path.basename(p), thickness(p)))
    elif a == ['place']:
        cmd_place()
    else:
        print(__doc__)
