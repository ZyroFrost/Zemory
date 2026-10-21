# -*- coding: utf-8 -*-
"""STATIC acceptance gate for a .pbip report - run it BEFORE opening Power BI Desktop.

STANDARD TOOL - one source for every department (user 2026-09-28: 'the gate is the standard').
Shipped by zemory: store part Skill_PBI_Pbip (its installs), assembled into scripts/ of every
department repo. Do not fork a repo copy - change the store part, then zemory sync. Company values (warehouse server, theme,
icons, VM alias) come from region_values.py (the region manager's data/region/values.json), never from this code.
Department differences live in the repo's config/ (older repos: docs/hooks/), never in this code.

Why it exists: rules written in a skill do not enforce themselves. Many times a rule that
ALREADY existed in `.claude/skills/pbi-*/SKILL.md` was still broken, and the user had to point
out every spot. This file turns the MEASURABLE rules into checks a machine runs.

    python scripts/pbi_gate.py <report folder> [--page <pageId>] [--pre-open | --static]

  <report folder>   folder that holds *.Report  (e.g. reports/ABC_02_STORE-REPORT-AM_DR_White)
  --page            page that gets the FULL standard; other pages only warn
  --verbose         print every warning line (default: summary only)

THREE LAYERS, one verdict (user 2026-09-28): static (the files) · dw (every source column against the live
warehouse) · engine (Desktop: objects in error + one row through every DirectQuery table).
  --pre-open   static + dw; the engine layer runs once Desktop has the file open (run the gate again then)
  --open-check what the hook runs before Desktop opens a file: blocks only what breaks the file (OPEN_BREAKERS),
               every other finding is printed as TO CHECK (user 09/10)
  --static     files only (layers dw + engine reported NOT CHECKED)
Exit 0 = green on every layer that applies. Exit 1 = errors, each spot printed. Exit 3 = INCOMPLETE: no
error found but a layer could not run (named, with the reason) - never reported as green.
Never edits report files. The engine layer may open Desktop and closes it without saving.
Rule source: .claude/skills/pbi-white/SKILL.md  §3b §4f §4g §5b §7
"""
import json
import glob
import os
import re
import sys
import math
import subprocess

ROOT_KEYS_OK = {'$schema', 'name', 'position', 'visual', 'visualGroup',
                'parentGroupName', 'howCreated', 'isHidden', 'filterConfig'}
CANVAS_W, CANVAS_H = 1280, 720
PAD = 5
# k table CALIBRATED from one REAL measurement by the user (2026-09-24):
#   'STORE REPORT' · fontSize 24 · bold · padding 20+20 · user set the frame to 270
#   => text width = 230 => Sum k = 230/24 = 9.583 ; the old table gave 7.54
#   => factor 1.271. The old table came out 27% SHORT because the header uses a BOLD font.
_K_BASE = {'up': 0.66, 'low': 0.52, 'sp': 0.28, 'dig': 0.60, 'amp': 0.78}
K_SCALE = 1.271
K_TEXT = dict((k, v * K_SCALE) for k, v in _K_BASE.items())
STRUCT_GROUPS = ('BG_Header', 'BG_Glossary', 'BG_FilterPanel', 'BG_CloseFilter')
FILTER_PITCH = 65          # filter panel: label 20 + slicer 40 + gap 5 (filter-rows)
DONUT_HEAD = 60            # pie / donut: title + legend row; below it the ring is at most as tall as wide (donut-shape)


RULES = [
    ('root-keys',   'visual.json may only use the 9 valid root keys'),
    ('visual-link', 'visualLink must sit in visual.visualContainerObjects and point to a bookmark that EXISTS'),
    ('bm-structure', 'bookmark: visualContainers holds leaves ONLY · visualContainerGroups holds groups ONLY'),
    ('bm-orphan',   'a bookmark does not point to a DELETED visual'),
    ('bm-complete', 'a bookmark applied to the WHOLE PAGE must list EVERY leaf visual'),
    ('bm-default',  'a scoped bookmark must declare exactly 1 visible in every _On/_Off pair'),
    ('bm-name',     'bookmark name: <NN>_<PageKey>_<Action>'),
    ('bm-main',     '<Page>_Main must match the default tab bookmark exactly'),
    ('enum-real',   'every enum value must be one Desktop has already written in a Legacy/Classic/Red file'),
    ('default-main', 'the state WHEN THE FILE OPENS must match bookmark <Page>_Main exactly'),
    ('axis-sort',   'a week axis (WeekPeriod) must declare sortDefinition by WeekFridayStart, unless the model sorts it (sortByColumn)'),
    ('images',      'every ItemName has a real file AND is declared in report.json'),
    ('on-off-pair', '_On/_Off pair: exactly 1 visible · x·y·w·h match number for number · z(_On)>z(_Off)'),
    ('tab-default', 'page default: ONLY ONE tab group is visible'),
    ('name',        'Selection name matches regex ^[A-Z][A-Za-z0-9]*(_[A-Z0-9][A-Za-z0-9]*)*$'),
    ('name-abbrev', 'abbreviate only when the source word has >=6 characters and it saves >=3 (TXT->Text)'),
    ('name-label',  'reader-facing labels are EXEMPT: children of Filter_Panel and Title'),
    ('title-original', 'a leaf visual SHOWING its title keeps the Legacy original text; technical names (Chart_ ...) are BANNED'),
    ('grid5',       'every x·y·width·height is divisible by 5 - except an EQUAL split that lands on .5 (660 or 1270 with a 5 px gap = 327.5 / 632.5): a block with a same-size sibling, the block right after it, and what sits inside it'),
    ('equal-split', 'two neighbour blocks of one column (same x + width) or one row (same y + height) that differ by <= 5 px are an unequal split - split exactly (327.5 + 5 + 327.5), never push the remainder into one block (user 2026-10-08)'),
    ('matrix-few',  'a matrix / table never shows little: no row field (= ONE row) -> card; one row field with <= 6 values and no column field -> a chart (user 2026-10-08)'),
    ('field-ref',   'every field named OUTSIDE the query - selector.metadata (column formats, colour scales), FillRule Input SelectRef.ExpressionName, expansionStates queryRefs - exists in the model; a dangling one shows nothing and Power BI says nothing. Classic / White / Red (a department repo 2026-10-17: every colour scale of MKT_01 Classic gone)'),
    ('bg-inset',    'inside a dashboard group: the chart is inset from its BG by exactly 5 on every side'),
    ('page-margin', 'a BG_ frame stays >= 5 from the page edge'),
    ('dashboard',   'every dashboard = 1 group with EXACTLY ONE BG_ background'),
    ('kpi-card',    'cardVisual: has objects.layout · NO border · colours from the closed palette · value font size 18D'),
    ('button-edge', "a block's button sits a multiple of 5 from the right edge of its frame"),
    ('header-text', 'report name frame = grid5(W_text + padding); the page name joins right after it - on EVERY visible page (user 2026-10-14: Franchise cut to Fra)'),
    ('title-style', 'chart title: 12D · left aligned · #2D2D2D'),
    ('file-name',   'folder <DEPT>_<num>_<FUNCTION>[-<Tier>]_<IP|DR>_<Legacy|Classic|White|Red> · file <DEPT>_<num>_<FUNCTION>[-<Tier>]_<Live|Scheduled>[_V<n>] (= Service name; same function as the folder; DR = Live, IP = Scheduled; _V<n> only when two builds share the number and the load mode; underscore between parts, hyphen joins words inside a part, function UPPER)'),
    ('storage-mode', 'IP = every warehouse table Import, DR = every one DirectQuery; a live connection to a Service model is IP'),
    ('dw-model',    'tables reading SQL: server uses the gateway string · no legacy source'),
    ('dw-only-tables', 'keep the warehouse Kimball structure: every Dim_/Fact_/Bridge_/Agg_ is the warehouse table of the same name (no self-made table; the report owns only #Measure · Parameter_* · @) and every relationship between warehouse tables matches a warehouse foreign key; selecting columns/rows is free - user 2026-10-10'),
    ('canvas',      'White: every visible page is 1280x720'),
    ('fillrule-bare', 'a FillRule gradient stop (min/mid/max color, nullColoringStrategy) is a BARE Literal - an expr wrapper kills Save/Publish'),
    ('few-cards',   'White: page with 1-3 cards: self-made cards are dropped, Legacy cards are topped up to 4'),
    ('card-row',    'White: the Card group holds card tiles only (BG_ + cardVisual/Card_ + Pct_); charts/tables in it are dropped'),
    ('pct-period',  'White: an unlabelled Pct_ line needs the period in the measure format ("MoM", "WoW", "vs Target")'),
    ('pct-color',   'White: a % on a card/table/chart label is coloured by a rule on THAT measure: up #007A36, down #C51E24'),
    ('single-page-overview', 'White: a report with ONE visible page names it Overview - the header already carries the report name; the first tab stays Summary'),
    ('page-name',   'White: the page name says what the page is; generic department names (Phong ..., a department code, Report, Page 1) fail; no department code, no Report / Dashboard word - the header already says it (Monthly, not Monthly Report ABC)'),
    ('tab-big-charts', 'White: a tab holds at most 3 big charts (block height >= 250)'),
    ('axis-scroll', 'White: categories x 20px must not exceed the plot area (53 weeks, 31 days...) - a chart must not scroll by itself'),
    ('long-chart',  'White: long charts (>= 28 categories) at most 2 blocks per tab, stacked top/bottom; X axis concatenateLabels=true'),
    ('matrix-scroll', 'White: a pivot whose COLUMNS spread over week/day/month must not overflow its frame (filter ~Recent 4 Weeks = 1)'),
    ('matrix-style', 'White: every matrix / table has ONE look - header bold white on #44546A, banded rows, bold totals on #E3E8EE, and every % column (by its FORMAT) coloured up #007A36 / down #C51E24 by its own measure (scripts/mix_palette.py --matrices)'),
    ('table-overflow', 'White: a table/pivot whose columns (header or typical value, the wider) add up to more than its frame scrolls sideways - widen the frame / move blocks; a truly long table goes to matrix_exempt with a reason (estimate)'),
    ('param-groupby', 'a field-parameter table has relatedColumnDetails groupByColumn Parameter Fields on its display column - user 2026-10-14'),
    ('param-value', 'a slicer / bookmark selects only fields the field parameter really lists (NAMEOF) - user 2026-10-14'),
    ('title-font', 'every shown chart / table title is Segoe UI Semibold, not bold-off (same rule as a department repo 13/10) - on every visible page'),
    ('title-case', 'visual titles: each word capitalised, no ALL-CAPS word except a business acronym, joining words lower case (same rule as a department repo 12/10); White / Red only - Classic keeps its design'),
    ('overview-first', 'a page named Overview is the first page of the report - user 2026-10-14'),
    ('tab-page-name', 'a tab label is never also a page name (page Overview + tab Overview read twice; first tab = Summary) - user 2026-10-14'),
    ('ui-english','page and tab names are English (labels / titles / column names English; only data values stay Vietnamese - the warehouse delivers English names) - user 2026-10-14'),
    ('tab-case', 'every word of a tab label starts with a capital (Tổng Quan, Theo Tháng) - one way on every tab - user 2026-10-14'),
    ('sort-order', "a sort field is one of the visual's own fields (else Desktop drops it), and a bar chart by category runs from the largest value down - user 2026-10-14"),
    ('tab-label',   'White: a tab label is at most 10 characters - bold 12pt in a 90-125px button, longer is cut off ("Nguoi ban &..")'),
    ('theme-standard', 'White: the report theme carries the company theme data colours + good/neutral/bad (the region manager/assets/theme/the region theme file = Theme1 of the Original template)'),
    ('compare-grey', 'White: a comparison series (LY / LM / LMTD / LW / PY / Last / Target, not a %) is grey #A2A2A2 (a second one #595959; 3-4 on one chart add #7F7F7F / #3F3F3F), never a theme slot'),
    ('tab-hole',    'White: inside a tab every 10x10 px spot is covered by a block - blocks of one row end on the same bottom (user 08/10, Delivery)'),
    ('row-wrap', 'White/Red, dw: every text column of a table / matrix fits its text - max(longest warehouse value, header) + padding, half of it (two lines) over ROW_WRAP px; no spare room (Stepped matrix: one shared column) - user 2026-10-14'),
    ('header-wrap', 'a table / matrix with a column header longer than HEADER_WRAP px on one line takes fixed widths: long headers at half their text + padding (two lines), measures >= VALUE_MIN, spread to the frame; auto-size off - user 2026-10-14'),
    ('narrow-table', 'White: every table / matrix fills its frame - Auto-size behaviour Grow to fit (columnHeaders autoSizeColumnWidth true + columnAdjustment growToFit; Desktop spreads the room over whatever columns the data brings) (user 08/10 Promotion, 14/10 "so với tổng size của chính group chứa")'),
    ('panel-label', 'White: the label right above a filter-panel slicer says that slicer\'s field caption (user 08/10, Daily Day slicer under "Area Manager")'),
    ('pct-label', 'White: the % line labels are bold, labelPosition Above, without a background box'),
    ('matrix-grid', 'White: a matrix draws horizontal grid lines only'),
    ('topn-column', 'White: a Top / Bottom N chart is a vertical column chart, not horizontal bars'),
    ('card-icon', 'White: every KPI card carries its icon - a square 5 px in from the card, the colour of the card value, from the icon library at the 17.0-18.0 px stroke mark (scripts/card_icons.py)'),
    ('chart-fill-shape', 'White: a chart with ONE measure on its main axis keeps its colour in the selector-less dataPoint entry - Desktop ignores a metadata selector there and draws theme colour 1'),
    ('chart-palette', 'White: chart data colours by ROLE only - accent #256ABF, accent2 #86B6EF, accent3 #184F95, compare grey #A6A6A6, % line #595959 (+ the ramp for pies); red/green/black are system colours, never a series; data colours as THEME references ColorId 2..9 like the Original template'),
    ('open-page',   'White: activePageName = the first page (Desktop Save often changes it)'),
    ('display-option', 'White: visible pages use displayOption FitToWidth like page 1'),
    ('glossary',    'White: every page has its own glossary, not a verbatim copy'),
    ('legacy-parity', 'White: every Legacy page and visual is present (a card counts if its measure is still on a card); drops go to dropped_visuals'),
    ('bm-scope',    'bookmark with a target list: options.applyOnlyToTargetVisuals = true (else it resets the tab)'),
    ('slicer-style', 'White: every slicer takes the Red design - item box #E8E8E8, text #2D2D2D, container #E8E8E8'),
    ('target-stack', 'Target is never stacked on revenue (the stack would add them) - clustered columns -VAT / +VAT / Target side by side - user 2026-10-12/14'),
    ('axis-invisible', 'an axis that is shown must not print in the background colour (white labels on white take room, read nothing) - user 2026-10-12'),
    ('row-uniform', 'column charts side by side in one row share one column width (categoryAxis innerPadding) and one legend setting - user 2026-10-12'),
    ('title-padding', 'a one-line textbox under 40 px (a block title) sets padding top/bottom 0 and is at least 1.5 x its font tall - the default padding pushes the text down, cuts it and shows a scroll bar - user 2026-10-12'),
    ('legend-plain', 'a chart series / legend name is the field name only - no explanation in brackets (the Glossary button explains) - user 2026-10-12'),
    ('label-overlap', 'data labels of a column/bar chart must fit: plot width / (categories x labelled series) >= one label - else label fewer series - user 2026-10-12'),
    ('clear-filter', 'every filter panel keeps the Ori refresh button BT_ClearFilter (240,20 40x40) -> <Page>_ClearFilter: Data on, every panel slicer in its targets (any tier, every department)'),
    ('panel-title', 'White: every filter panel item (title, labels, slicers, buttons) sits above BG_FilterPanel - else the panel paints over it'),
    ('slicer-blank', 'White: every slicer column carries the visual filter "is not blank" - no slicer may show (Blank)'),
    ('slicer-current', 'engine: a period slicer with a "Current ..." member lists NO member that starts after it - the label and the slicer filter share one reference date'),
    ('bm-number',   'White: bookmark prefix NN = real position of its page among visible pages; no bookmark of a deleted page'),
    ('measure-folder', 'White: #Measure folders lettered in page order: A. Calculation, then B.. = <page name> for every visible page'),
    ('measure-dup', 'two measures with the same name (case-insensitive) in a table - Desktop refuses to open the project'),
    ('diagram',     'model diagram (pbip 1c): every table has a node, no overlap, 20px grid, <= 13 columns, #Measure alone in the last column full length (White fails, other tiers warn)'),
    ('legend',      'legend of an axis chart = Top (left anchored), donut/pie = RightCenter; TopLeft is NOT valid - WARNING'),
]


def lit(o):
    try:
        return o['expr']['Literal']['Value'].strip("'")
    except Exception:
        return None


def sel_name(d):
    if 'visualGroup' in d:
        return d['visualGroup'].get('displayName')
    t = d.get('visual', {}).get('visualContainerObjects', {}).get('title')
    return lit(t[0]['properties'].get('text', {})) if t else None


def title_shown(d):
    """With the title ON, title.text is the TEXT ON SCREEN, not a Selection label."""
    t = d.get('visual', {}).get('visualContainerObjects', {}).get('title')
    if not t:
        return False
    sh = t[0]['properties'].get('show')
    if sh is None:
        # not declared: shape/image/textbox/slicer default to OFF (a slicer shows its text via its own header), charts default to ON
        return d.get('visual', {}).get('visualType') not in ('shape', 'image', 'textbox', 'slicer')
    return lit(sh) == 'true'


def grid5(x):
    """Round up to the 5 grid with a 1px tolerance - falling short by under 1px does not jump a whole step."""
    return int(math.ceil((x - 1.0) / 5.0) * 5)


FONT_DIR = os.path.join(os.environ.get('WINDIR', 'C:/Windows'), 'Fonts')
FONT_FILE = {(False, False): 'segoeui.ttf', (True, False): 'segoeuib.ttf',
             (False, True): 'segoeuii.ttf', (True, True): 'segoeuiz.ttf'}


_W_CACHE = {}
_FONTS = {}


def w_text(text, size, bold=True, italic=False):
    """Cached front of _w_text: the two-line / balanced-width search measures the same words thousands of times."""
    k = (text, size, bool(bold), bool(italic))
    if k not in _W_CACHE:
        _W_CACHE[k] = _w_text(text, size, bold, italic)
    return _W_CACHE[k]


def _w_text(text, size, bold=True, italic=False):
    """REAL text width (px) measured with the Windows Segoe UI font itself; size is in pt like Power BI.
    Calibrated 2026-09-25: 'STORE REPORT' 24pt bold = 229.2px + margin 40 -> grid5 = 270, exactly the
    frame the user dragged. The old factor table (w_text_table) came out SHORT for italic/wide text: 'Weekly Report ABC'
    17pt bold italic is really 205px, the old table gave 195 -> 'ABC' got cut. Without PIL/the font it falls back to the old table."""
    try:
        from PIL import ImageFont
        fk = (bool(bold), bool(italic), size)
        if fk not in _FONTS:
            _FONTS[fk] = ImageFont.truetype(os.path.join(FONT_DIR, FONT_FILE[(bool(bold), bool(italic))]),
                                            round(size * 96 / 72 * 100))
        f = _FONTS[fk]
        return f.getlength(text or '') / 100.0
    except Exception:
        return w_text_table(text, size)


def w_text_table(text, size):
    t = 0.0
    for c in text or '':
        if c == '&':
            t += K_TEXT['amp']
        elif c == ' ':
            t += K_TEXT['sp']
        elif c.isdigit():
            t += K_TEXT['dig']
        elif c.isupper():
            t += K_TEXT['up']
        else:
            t += K_TEXT['low']
    return size * t


def load(report_dir, fail):
    rep = glob.glob(os.path.join(report_dir, '*.Report'))
    if not rep:
        return None, None, None, None
    rep = rep[0]
    d_def = os.path.join(rep, 'definition')
    vis, bms = {}, {}
    for f in glob.glob(os.path.join(d_def, 'pages', '*', 'visuals', '*', 'visual.json')):
        pg = os.path.basename(os.path.dirname(os.path.dirname(os.path.dirname(f))))
        vid = os.path.basename(os.path.dirname(f))
        try:
            vis[(pg, vid)] = json.load(open(f, encoding='utf-8'))
        except Exception as e:
            fail.append('broken JSON: %s (%s)' % (f, e))
    for f in glob.glob(os.path.join(d_def, 'bookmarks', '*.bookmark.json')):
        try:
            b = json.load(open(f, encoding='utf-8'))
            bms[b['name']] = b
        except Exception as e:
            fail.append('broken JSON: %s (%s)' % (f, e))
    return rep, d_def, vis, bms


# Classic / Legacy keep the OLD design on purpose (skill pbi-classic §1: "Lưới 5 và bảng màu của chuẩn không áp cho bản mô
# phỏng"; user 09/10: the Classic 01 Scheduled could not even be opened for 203 naming / bookmark findings that all come from
# the legacy a department file). For those tiers the design rules below (selection names, whole-page bookmark coverage, links to
# missing bookmarks) are skipped; every structural / warehouse / model check still runs. Set by main() from the folder name.
KEEP_OLD_DESIGN = False

# Findings that make Desktop refuse the file or open it with "report has issues" - the only ones --open-check blocks on.
OPEN_BREAKERS = ('broken JSON', 'unknown root keys', 'visualLink in the WRONG PLACE', 'still has the singleVisualGroup key',
                 'image NOT on disk', 'image not declared', 'declared twice', 'points to a DELETED visual',
                 'a GROUP sits in visualContainers', 'a LEAF sits in visualContainerGroups',
                 'same field projected twice', 'm-step-comma', 'bookmark-filter-objects', 'filter-where-field', 'dead-entity', 'dead-field', 'literal-type',
                 'measure-format-both', 'tmdl-multiline')


def check_structure(vis, bms, groups, leaves, put, fail):
    for (pg, i), d in vis.items():
        bad = set(d) - ROOT_KEYS_OK
        if bad:
            fail.append('%s: unknown root keys %s' % (i, sorted(bad)))
        if 'visualLink' in d.get('visual', {}):
            fail.append('%s: visualLink in the WRONG PLACE - it must be in visual.visualContainerObjects' % i)
        # One field = one display name per visual: the same queryRef twice under two labels opens with "report has issues"
        # (a department repo 12/10, 05 Classic visual 60606443608bcbf7d2bb: Fact_Headcount.JobPositionName as "IDJobTitle" and "Vị Trí").
        for role, r in d.get('visual', {}).get('query', {}).get('queryState', {}).items():
            seen = {}
            for p in r.get('projections', []):
                q = p.get('queryRef')
                if q in seen and seen[q] != p.get('displayName'):
                    fail.append('%s: same field projected twice in %s - %s as %s and %s'
                                % (sel_name(d) or i, role, q, ascii(seen[q]), ascii(p.get('displayName'))))
                seen.setdefault(q, p.get('displayName'))

    for n, b in bms.items():
        dn = b.get('displayName', n)
        if 'singleVisualGroup' in json.dumps(b):
            fail.append('%s: still has the singleVisualGroup key' % dn)
        for pg, sec in b.get('explorationState', {}).get('sections', {}).items():
            for i in sec.get('visualContainers', {}):
                if (pg, i) in groups:
                    put(pg, '%s: a GROUP sits in visualContainers -> %s' % (dn, i))
                elif (pg, i) not in vis:
                    put(pg, '%s: points to a DELETED visual -> %s' % (dn, i))

            def walk(m):
                for k, v in m.items():
                    if (pg, k) in leaves:
                        put(pg, '%s: a LEAF sits in visualContainerGroups -> %s' % (dn, k))
                    walk(v.get('children', {}))
            walk(sec.get('visualContainerGroups', {}))
            tgt = b.get('options', {}).get('targetVisualNames')
            if tgt == [] and not KEEP_OLD_DESIGN:
                # applied to the WHOLE PAGE -> the state must list EVERY leaf visual
                want = set(i for (p, i) in leaves if p == pg)
                miss = want - set(sec.get('visualContainers', {}))
                if miss:
                    put(pg, '%s: applied to the WHOLE PAGE but misses %d/%d leaf visuals'
                        % (dn, len(miss), len(want)))
            elif tgt:
                # SCOPED: the state STILL captures the whole page (Desktop runs this structure fine).
                # But everything OUTSIDE the scope must declare the CORRECT default state - declaring
                # everything "visible" makes a click on the filter/glossary button switch on all 4 tab shapes.
                # An _On/_Off pair outside the scope must still have exactly ONE visible.
                vc2 = sec.get('visualContainers', {})
                g_hid = {}

                def walk_g(m):
                    for k, v in m.items():
                        g_hid[k] = bool(v.get('isHidden'))
                        walk_g(v.get('children', {}))
                walk_g(sec.get('visualContainerGroups', {}))
                pr2, in_hidden = {}, set()
                for i2 in vc2:
                    n2 = sel_name(vis.get((pg, i2), {}))
                    for suf in ('_On', '_Off'):
                        if n2 and n2.endswith(suf):
                            pr2.setdefault(n2[:-len(suf)], {})[suf] = (
                                'hidden' in json.dumps(vc2[i2]))
                            if ancestor_hidden(vis, pg, i2, lambda g: g_hid.get(g, False)):
                                in_hidden.add(n2[:-len(suf)])
                for base, st2 in sorted(pr2.items()):
                    n_on = sum(1 for h in st2.values() if not h)
                    if base in in_hidden and n_on <= 1:
                        continue      # pair inside a hidden group (e.g. another tab) -> 0/2 is correct
                    if len(st2) == 2 and n_on != 1:
                        put(pg, '%s: pair %s has %d/2 visible in the state - must be exactly 1'
                            % (dn, base, sum(1 for h in st2.values() if not h)))

    for (pg, i), d in vis.items():
        vl = d.get('visual', {}).get('visualContainerObjects', {}).get('visualLink')
        if not vl:
            continue
        p = vl[0]['properties']
        if lit(p.get('type', {})) != 'Bookmark':
            continue
        tgt = lit(p.get('bookmark', {}))
        if tgt not in bms and not KEEP_OLD_DESIGN:
            put(pg, '%s: points to a bookmark that DOES NOT EXIST %s' % (sel_name(d) or i, tgt))


def check_images(rep, d_def, vis, fail):
    rj = os.path.join(d_def, 'report.json')
    declared, ondisk, used = set(), set(), set()
    if os.path.exists(rj):
        r = json.load(open(rj, encoding='utf-8'))
        declared = set(it['name'] for p in r.get('resourcePackages', [])
                       for it in p.get('items', []))
        used |= set(re.findall(r'"ItemName":\s*"([^"]+)"',
                               open(rj, encoding='utf-8').read()))
    rr = os.path.join(rep, 'StaticResources', 'RegisteredResources')
    if os.path.isdir(rr):
        ondisk = set(os.listdir(rr))
    for d in vis.values():
        used |= set(re.findall(r'"ItemName":\s*"([^"]+)"', json.dumps(d)))
    for u in sorted(used):
        if u not in ondisk:
            fail.append('image NOT on disk: %s' % u)
        if u not in declared:
            fail.append('image not declared in report.json: %s' % u)


def ancestor_hidden(vis, pg, i, is_hidden):
    """Whether any ancestor group is hidden. An _On/_Off pair in a hidden tab: both hidden is CORRECT
    (Desktop hiding a group = hiding every child). Born from the table-toggle button pair in tab 2 of the Daily Sales page 2026-09-25."""
    g = vis.get((pg, i), {}).get('parentGroupName')
    while g:
        if is_hidden(g):
            return True
        g = vis.get((pg, g), {}).get('parentGroupName')
    return False


def check_states(vis, bms, put, fail):
    pairs = {}
    for (pg, i), d in vis.items():
        nm = sel_name(d)
        for suf in ('_On', '_Off'):
            if nm and nm.endswith(suf):
                pairs.setdefault((pg, nm[:-len(suf)]), {})[suf] = (i, d)
    for (pg, base), st in sorted(pairs.items()):
        if len(st) != 2:
            continue
        shown = sum(1 for (_i, d) in st.values() if not d.get('isHidden'))
        hid_anc = all(ancestor_hidden(vis, pg, _i, lambda g: bool(vis.get((pg, g), {}).get('isHidden')))
                      for (_i, _d) in st.values())
        if shown != 1 and not (hid_anc and shown == 0):
            put(pg, 'pair %s: %d/2 visible - must be exactly 1' % (base, shown))

        # On/off buttons are STACKED on each other => THE COORDINATES MUST MATCH NUMBER FOR NUMBER.
        # Off by a little and a click lands on the one below, which looks like "it turns on but will not turn off".
        # Exception: tab pairs (BT_Tab<n>_...) - the user designed the active tab to stick out TALLER.
        if re.match(r'^BT_Tab\d+_', base):
            continue
        da, db = st['_On'][1], st['_Off'][1]
        ra = tuple(da['position'].get(k) for k in ('x', 'y', 'width', 'height'))
        rb = tuple(db['position'].get(k) for k in ('x', 'y', 'width', 'height'))
        if ra != rb:
            put(pg, 'pair %s: _On%s and _Off%s DIFFER - two stacked buttons must match number for number'
                % (base, ra, rb))
        za = da['position'].get('z') or 0
        zb = db['position'].get('z') or 0
        if za <= zb:
            put(pg, 'pair %s: _On z=%s is not above _Off z=%s - the off button covers the on button'
                % (base, za, zb))

    # compare PER PAGE: <Page>_Main against <Page>_Tab1_* with the same activeSection (the old version only compared
    # the first pair found in the whole file - with several pages it compared the wrong page)
    by_pg = {}
    for b in bms.values():
        dn = str(b.get('displayName', ''))
        pg = b.get('explorationState', {}).get('activeSection')
        if dn.endswith('_Main'):
            by_pg.setdefault(pg, {})['main'] = b
        elif re.search(r'_Tab1_', dn):
            by_pg.setdefault(pg, {})['tab1'] = b
    for pg, mt in by_pg.items():
        if 'main' in mt and 'tab1' in mt:
            a = json.dumps(mt['main']['explorationState'], sort_keys=True)
            b = json.dumps(mt['tab1']['explorationState'], sort_keys=True)
            if a != b:
                put(pg, '%s does not match %s exactly'
                    % (mt['main']['displayName'], mt['tab1']['displayName']))

    # tab-blank (pixel layer 02/10): a tab bookmark must SHOW at least one content visual of its own tab group.
    # A kept block in a non-default tab took its state from the old _Main, where its whole tab is hidden => the tab
    # bookmark hid every leaf, Daily & Hourly 'Chi tiết' opened blank with its view buttons hidden too.
    for b in bms.values():
        dn = str(b.get('displayName', ''))
        m = re.search(r'_Tab(\d+)_', dn)
        pg = b.get('explorationState', {}).get('activeSection')
        if not m or (b.get('options', {}).get('targetVisualNames') or []):
            continue
        tg = [i for (p, i), d in vis.items() if p == pg and 'visualGroup' in d
              and str(d['visualGroup'].get('displayName', '')).startswith('Tab%s_' % m.group(1))]
        if not tg:
            continue
        vc = b['explorationState'].get('sections', {}).get(pg, {}).get('visualContainers', {})
        inside = [i for (p, i), d in vis.items() if p == pg and 'visualGroup' not in d
                  and d.get('visual', {}).get('visualType') not in ('shape', 'image', 'textbox', 'actionButton')
                  and any(g in tg for g in _ancestors(vis, pg, i))]
        shown = [i for i in inside if vc.get(i, {}).get('singleVisual', {}).get('display', {}).get('mode') != 'hidden']
        if inside and not shown:
            put(pg, '%s: shows none of the %d content visuals of its tab - the tab opens BLANK (tab-blank)'
                % (dn, len(inside)))


def _ancestors(vis, pg, i):
    out, g = [], vis.get((pg, i), {}).get('parentGroupName')
    while g:
        out.append(g)
        g = vis.get((pg, g), {}).get('parentGroupName')
    return out


# Selection names: every segment STARTS WITH A CAPITAL, segments joined by UNDERSCORES.
#   Chart_RevenueByStore · BG_Tab2_PanelTop · BT_Tab1_TongQuan_On · Pct_RevenueOfTarget
# Banned: spaces · hyphens · ALL CAPS (abbreviations of <=3 characters are allowed).
NAME_RX = re.compile(r'^[A-Z][A-Za-z0-9]*(_[A-Z0-9][A-Za-z0-9]*)*$')
# A SHOWN title carrying a Selection prefix = the reader sees a technical name.
TECH_TITLE_RX = re.compile(r'^(BG|BT|Pct|Card|Chart|Table|Text|Slicer|Logo|Line|Image|Label|TXT)_')
CAPTION_EXEMPT = {}

# ABBREVIATIONS HAVE A THRESHOLD (user decided 2026-09-24):
#   "only abbreviate words longer than 5-6 characters, down to 2 characters.
#    text and txt differ by 1 character, why abbreviate at all"
# => an abbreviation is accepted only when the source word is LONG (>=6) and it saves A LOT (>=3 characters).
ABBREV_OK = {          # abbreviation -> source word       saved
    'BG': 'Background',       # 10 -> 2   : 8   OK
    'BT': 'Button',           #  6 -> 2   : 4   OK
    'Pct': 'Percent',         #  7 -> 3   : 4   OK
}
ABBREV_BAD = {         # saves too little -> must be spelled OUT
    'TXT': 'Text',            #  4 -> 3   : 1   too little
    'IMG': 'Image',           #  5 -> 3   : 2   too little
    'LBL': 'Label',           #  5 -> 3   : 2   too little
    'BTN': 'Button',          # BT_ already exists and is shorter, two styles is confusing
    'GRP': 'Group',
    'BKG': 'Background',      # BG_ already exists
    'CHT': 'Chart',
    'SLC': 'Slicer',
}


def caption_exempt(vis):
    """Visuals whose title is shown BUT that text is a LABEL FOR THE READER:
    - everything in the Filter_Panel group (Year · Month · Area Manager · FILTERS PANEL)
    - the two text frames in the Title group (report name · page name)
    Renaming them = changing the text the user sees -> exempt from the naming rule."""
    out = {}
    for (pg, i), d in vis.items():
        if 'visualGroup' not in d:
            continue
        nmg = sel_name(d)
        if nmg not in ('Filter_Panel', 'Title'):
            continue
        st = [i]
        while st:
            c = st.pop()
            for (p2, k), v in vis.items():
                if p2 == pg and v.get('parentGroupName') == c:
                    out.setdefault(pg, set()).add(k)
                    st.append(k)
    return out


TEMPLATE = ['#2A78D6', '#EB6834', '#169A6B', '#4A3AA7', '#D95F8E', '#015A80', '#B8A365', '#199900', '#5E9AD7', '#13678A', '#127369', '#34517B', '#15274B', '#A2A2A2', '#595959']   # 30/09: cards set B; charts = Original template Theme1 + greys
PALETTE = set(TEMPLATE) | {'#C51E24', '#136C99', '#2D2D2D', '#FFFFFF', '#E8E8E8', '#007A36'}
PCT_UP, PCT_DOWN = '#007A36', '#C51E24'   # pbi-white 4j (user 2026-09-27); up darker 30/09 (was #00B050)
PCT_UP_ON_BARS = '#4ADE80'   # chart % labels over dark columns: brighter up green (user 2026-10-01)


def check_dashboard(page_vis, fail):
    """Every dashboard = ONE group with exactly ONE BG_ background of its own (user decided 2026-09-24)."""
    kids = {}
    for i, d in page_vis.items():
        if d.get('parentGroupName'):
            kids.setdefault(d['parentGroupName'], []).append(i)
    for gid, ks in kids.items():
        if gid not in page_vis or 'visualGroup' not in page_vis[gid]:
            continue
        gname = str(sel_name(page_vis[gid]) or '')
        anc, cur = [], page_vis[gid]
        while cur is not None and cur.get('parentGroupName'):
            anc.append(str(sel_name(page_vis[cur['parentGroupName']]) or ''))
            cur = page_vis.get(cur['parentGroupName'])
        if 'Chart' not in anc:
            continue
        if gname.startswith('Tab') or gname == 'Card':
            continue
        has_chart = any('visualGroup' not in page_vis[k] and
                        page_vis[k]['visual'].get('visualType')
                        not in ('shape', 'image', 'textbox') for k in ks)
        if not has_chart:
            continue
        bgs = [k for k in ks if str(sel_name(page_vis[k]) or '').startswith('BG_')]
        if len(bgs) != 1:
            fail.append('group %s: has %d BG_ backgrounds - every dashboard must have EXACTLY ONE'
                        % (gname or gid, len(bgs)))


CARD_VALUE_SIZE = '18D'


# Room for the label of a cardVisual = box width - CARD_LABEL_SLACK. Measured 2026-10-03 on Product Mix (render): a 260 px
# Card_ box showed 'COGS incl. damaged & packagi...' = 204.9 px of Segoe UI bold 10 and cut the 210.4 px full label
# => the image column + paddings take 55 px; 5 px kept as margin.
CARD_LABEL_SLACK = 60


def card_label(d):
    """(label text, px of room) of a cardVisual - the label is the projection displayName, else the measure name."""
    pr = (d.get('visual', {}).get('query', {}).get('queryState', {}).get('Data', {}).get('projections') or [{}])[0]
    lab = pr.get('displayName') or (pr.get('queryRef') or '').split('.', 1)[-1]
    return lab, d.get('position', {}).get('width', 0) - CARD_LABEL_SLACK


def card_label_size(d):
    for e in d.get('visual', {}).get('objects', {}).get('label', []):
        v = lit(e.get('properties', {}).get('fontSize', {}))
        if v:
            return float(str(v).rstrip('D'))
    return 10.0


def check_card(page_vis, fail):
    """KPI card: no border · has the layout block · text colour within the CLOSED palette."""
    for i, d in page_vis.items():
        vt = d.get('visual', {}).get('visualType')
        nm = sel_name(d) or i
        if vt == 'card' and str(nm).startswith('Card_'):
            # OLD-style card (a department's older report): the value sits in objects.labels.fontSize. Pct_ (the percent
            # under a card) is an old card but NOT a card tile -> not checked.
            sz = {lit(e.get('properties', {}).get('fontSize', {}))
                  for e in d['visual'].get('objects', {}).get('labels', [])} - {None}
            if sz != {CARD_VALUE_SIZE}:
                fail.append('%s: card value font size = %s, the standard is %s for EVERY card'
                            % (nm, ', '.join(sorted(sz)) or 'not declared', CARD_VALUE_SIZE))
            continue
        if vt != 'cardVisual':
            continue
        o = d['visual'].get('objects', {})
        if 'layout' not in o:
            fail.append('%s: cardVisual is MISSING objects.layout - PBI falls back to the default '
                        'layout, bold/icon position have no effect' % nm)
        # card-label (user 2026-10-03: "COGS incl. damaged & packagi..." - a label must never run past its card)
        lab, room = card_label(d)
        if lab and w_text(lab, card_label_size(d), True) > room:
            fail.append("%s: label '%s' is %d px, the card shows %d px - it is cut ('...'); shorten it "
                        "(mix_builder --card-labels drops the qualifier: 'incl. ...', '(...)')"
                        % (nm, lab, w_text(lab, card_label_size(d), True), room))
        bd = d['visual'].get('visualContainerObjects', {}).get('border')
        if bd and lit(bd[0]['properties'].get('show', {})) == 'true':
            fail.append('%s: card border is ON - the user decided cards have NO border' % nm)
        # User decided 2026-09-26: the value font size of EVERY card = 18. At size 20, '139.04K' is 101px wide
        # while the value column of a 150-wide card only holds ~90px -> it shows '139.0...'.
        sizes = {lit(e.get('properties', {}).get('fontSize', {})) for e in o.get('value', [])} - {None}
        if sizes != {CARD_VALUE_SIZE}:
            fail.append('%s: card value font size = %s, the standard is %s for EVERY card'
                        % (nm, ', '.join(sorted(sizes)) or 'not declared', CARD_VALUE_SIZE))
        for e in o.get('value', []):
            fc = e.get('properties', {}).get('fontColor')
            if not fc:
                continue
            if 'ThemeDataColor' in json.dumps(fc):
                # user 2026-10-01: colours come from the THEME like the Original template (a hard-coded code is what
                # kept the theme from applying) - a reference to a dataColors slot (ColorId 2..9) is the standard
                ids = {int(x) for x in re.findall(r'"ColorId": (\d+)', json.dumps(fc))}
                if not ids <= THEME_IDS:
                    fail.append('%s: value colour ThemeDataColor %s is not a dataColors slot (ColorId 2..9)' % (nm, sorted(ids)))
                continue
            c = lit(((fc.get('solid') or {}).get('color') or {}))
            if c and c.upper() not in PALETTE:
                fail.append('%s: text colour %s is OUTSIDE the closed palette - the palette is a '
                            'CLOSED list, if a colour is missing ASK' % (nm, c))


def check_button_edge(page_vis, fail):
    """A block's button must sit exactly 5 from the RIGHT edge of the frame that holds it."""
    for i, d in page_vis.items():
        nm = str(sel_name(d) or '')
        if not nm.startswith('BT_') or 'Tab' in nm:
            continue
        par = d.get('parentGroupName')
        if not par or par not in page_vis:
            continue
        pw = page_vis[par]['position'].get('width')
        if not pw:
            continue
        right = pw - (d['position']['x'] + d['position']['width'])
        if right < 0 or right % PAD != 0:
            fail.append('%s: right edge is %.1f from its frame - must be a multiple of %d'
                        % (nm, right, PAD))


# <NN>_<PageKey>_<Action>[_<Detail>]  e.g. 01_Monthly_OpenFilter ·
#                                          01_Monthly_Tab1_TongQuan
BM_RX = re.compile(r'^\d{2}_[A-Za-z0-9]+(_[A-Za-z0-9]+)+$')


def check_bookmark_names(bms, fail):
    """Bookmark name: <page number>_<PageKey>_<Action>  e.g. 01_Monthly_OpenFilter."""
    for n, b in bms.items():
        dn = str(b.get('displayName', ''))
        if not BM_RX.match(dn):
            fail.append('bookmark %r breaks the naming standard - must be <NN>_<PageKey>_<Action>'
                        % dn)


def check_tab_default(vis, put):
    """Page default: ONLY ONE tab group is visible.
    With both visible, the contents of the two tabs are drawn on top of each other as one block -
    user reported 2026-09-24. A correct bookmark cannot save it, because this is the state WHEN THE FILE OPENS."""
    tabs = {}
    for (pg, i), d in vis.items():
        if 'visualGroup' not in d:
            continue
        nmg = str(sel_name(d) or '')
        if re.match(r'^Tab\d+_', nmg):
            tabs.setdefault(pg, []).append((nmg, bool(d.get('isHidden'))))
    for pg, lst in tabs.items():
        shown = [n for n, h in lst if not h]
        if len(lst) >= 2 and len(shown) != 1:
            put(pg, 'page default: %d/%d tab groups visible (%s) - must be exactly 1'
                % (len(shown), len(lst), ', '.join(shown) or 'none'))


ENUM_RX = re.compile(r"^'[A-Za-z][A-Za-z0-9]*'$")
ENUM_SKIP = {'text', 'displayName', 'fontFamily', 'name', 'heading', 'imageType', 'bookmark', 'navigationSection', 'url'}
ENUM_SOURCES = ('Legacy', 'Classic', 'Red')   # files written BY Desktop itself -> the vocabulary of valid values
# match on TOKENS of the folder name <DEPT>_<num>_<Function>[<Tier>]_<DesignKind> - the design kind is the last token


def enum_values(v):
    """(object.property) -> set of enum values written as a one-word string Literal."""
    out = {}
    for sect in ('objects', 'visualContainerObjects'):
        for obj, entries in (v.get(sect) or {}).items():
            for e in entries or []:
                for prop, val in (e.get('properties') or {}).items():
                    lv = lit(val) if isinstance(val, dict) else None
                    raw = val.get('expr', {}).get('Literal', {}).get('Value') if isinstance(val, dict) else None
                    if prop in ENUM_SKIP or not isinstance(raw, str) or not ENUM_RX.match(raw):
                        continue
                    out.setdefault(obj + '.' + prop, set()).add(lv)
    return out


def enum_vocab(root='reports'):
    voc = {}
    for rep in glob.glob(os.path.join(root, '*', '*.Report')):
        if not set(os.path.basename(os.path.dirname(rep)).split('_')) & set(ENUM_SOURCES):
            continue
        for f in glob.glob(os.path.join(rep, 'definition', 'pages', '*', 'visuals', '*', 'visual.json')):
            try:
                v = json.load(open(f, encoding='utf-8')).get('visual', {})
            except Exception:
                continue
            for k, vals in enum_values(v).items():
                voc.setdefault(k, set()).update(vals)
    return voc


def check_enums(vis, put, warn_list):
    """Enum values: deny (known self-invented values) -> ERROR; never seen in a Desktop-written file and not in
    allow -> WARNING 'unverified'. Born from legend.position = TopLeft 2026-09-25."""
    voc = enum_vocab()
    cfg = {}
    try:
        cfg = json.load(open(next((p for p in (os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', d, 'pbi-enum.json') for d in ('config', os.path.join('docs', 'hooks'))) if os.path.exists(p)), 'pbi-enum.json'), encoding='utf-8'))
    except Exception:
        pass
    deny = cfg.get('deny', {}); allow = cfg.get('allow', {})
    for (pg, i), d in vis.items():
        v = d.get('visual')
        if not v:
            continue
        for k, vals in enum_values(v).items():
            for val in sorted(vals):
                if val in deny.get(k, {}):
                    put(pg, '%s: %s = %r is NOT valid - %s' % (sel_name(d) or i, k, val, deny[k][val]))
                elif k in voc and val not in voc[k] and val not in allow.get(k, {}):
                    warn_list.append((pg, '%s: %s = %r never seen written by Desktop - open Desktop to verify, then add it to config/pbi-enum.json'
                                      % (sel_name(d) or i, k, val)))

AXIS_NEED_SORT = {
    # the axis column usually repeats across years so it cannot take a sortByColumn (must be 1:1) -> the visual must declare
    # its own sort; a model that does give it one (a year + week key) is already sorted and passes
    'Dim_Date.WeekPeriod': 'Dim_Date.WeekFridayStart',
}


def sorted_columns(report_dir):
    """'Table.Column' of every model column that declares a sortByColumn in its TMDL."""
    out = set()
    for t in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        txt = open(t, encoding='utf-8').read()
        tab = re.search(r"(?m)^table\s+('(?:[^']|'')+'|\S+)", txt)
        tab = tab.group(1).strip("'").replace("''", "'") if tab else os.path.basename(t)[:-5]
        for m in re.finditer(r"(?m)^\tcolumn\s+('(?:[^']|'')+'|[^\s=]+)[^\n]*\n((?:\t\t.*\n|\s*\n)+?)(?=^\t\S|\Z)", txt):
            if re.search(r'(?m)^\t\tsortByColumn:', m.group(2)):
                out.add('%s.%s' % (tab, m.group(1).strip("'").replace("''", "'")))
    return out


def check_axis_sort(vis, put, model_sorted=frozenset()):
    """An axis column without sortByColumn on a visual without sortDefinition -> Power BI sorts by the
    measure value (weeks 19 16 29 38...). Born from the Weekly White page 2026-09-25. A column the model sorts
    (sortByColumn in its TMDL - a department repo 20/10: WeekPeriod by WeekPeriodSort) needs nothing on the visual."""
    for (pg, i), d in vis.items():
        q = (d.get('visual') or {}).get('query') or {}
        cat = [p.get('queryRef') for p in q.get('queryState', {}).get('Category', {}).get('projections', [])]
        for ax, by in AXIS_NEED_SORT.items():
            if ax not in cat or ax in model_sorted:
                continue
            ent, prop = by.split('.', 1)
            srt = q.get('sortDefinition', {}).get('sort', [])
            ok = any(s.get('field', {}).get('Column', {}).get('Property') == prop and
                     s.get('field', {}).get('Column', {}).get('Expression', {}).get('SourceRef', {}).get('Entity') == ent
                     for s in srt)
            if not ok:
                put(pg, '%s: axis %s declares no sortDefinition by %s - Power BI will sort by the measure value'
                    % (sel_name(d) or i, ax, by))
            elif by not in cat:
                put(pg, '%s: sorts by %s but that column is not on the axis - add it to Category'
                    % (sel_name(d) or i, by))

TOPN_TITLE = re.compile(r'(?i)\b(top|bottom)\s*(\d+)\b')
TOPN_MEASURE = re.compile(r'^~(Top|Bottom)\s*(\d+)\b')


def check_topn(vis, put):
    """topn-exact (user 2026-10-03: "bottom 5 mà lại hiện full list … tên hiển thị phải khớp với data filter, nói ra phải
    hiện 5"). Power BI's TopN filter KEEPS TIES: 12 items sold exactly 1 => 'Bottom 5 Bad Selling Product' showed 12.
    A title saying Top/Bottom N must be backed by an exact filter: a measure '~Top N …' / '~Bottom N …' (TOPN with the
    item name as tie-breaker, mix_builder --topn-exact) = 1, and the N in the title = the N of that measure."""
    for (pg, i), d in vis.items():
        v = d.get('visual', {})
        t = v.get('visualContainerObjects', {}).get('title', [{}])
        title = str(lit((t[0].get('properties', {}) if t else {}).get('text', {})) or '')
        filters = d.get('filterConfig', {}).get('filters', [])
        # an unset TopN (Desktop writes name / field / type, no 'filter') filters nothing (a department repo 19/10)
        topn = [f for f in filters if f.get('type') == 'TopN' and isinstance(f.get('filter'), dict)]
        m = TOPN_TITLE.search(title)
        nm = sel_name(d) or i
        # 2026-10-04: an exact-N MEASURE filter (ALLSELECTED) went blank - it did not see the chart's own filters.
        # The TopN filter respects them; it must only be ordered by a '~Sort Key …' measure (no two equal keys)
        for f in topn:
            js = json.dumps(f)
            if '~Sort Key ' not in js:
                put(pg, "%s ('%s'): Top N filter ordered by a plain measure keeps ties - it can show more than N "
                        "items; order it by a '~Sort Key' measure (mix_builder --topn-tiebreak)" % (nm, title))
            n = re.search(r'"Top":\s*(\d+)', js)
            if m and n and n.group(1) != m.group(2):
                put(pg, "%s: title says %s, the Top N filter keeps %s" % (nm, m.group(2), n.group(1)))
        for f in filters:
            if TOPN_MEASURE.match(f.get('field', {}).get('Measure', {}).get('Property', '') or ''):
                put(pg, "%s: filtered on '%s' - an ALLSELECTED measure filter ignores the chart's own filters "
                        "(went blank 04/10); use the TopN filter + '~Sort Key' (mix_builder --topn-tiebreak)"
                        % (nm, f['field']['Measure']['Property']))
        if m and not topn:
            put(pg, "%s: title '%s' promises %s %s but no Top N filter limits it" % (nm, title, m.group(1), m.group(2)))


def check_fillrule_dead(vis, put):
    """fillrule-dead (2026-10-04): a colour scale (FillRule) whose selector names a field the table does not have shows
    NOTHING and Power BI says nothing. White carried 54 such entries: 33 lost by a rebinding that renamed the rule's Input
    but not its selector (colour gone vs Legacy), 21 dead since Legacy. Fix: mix_palette --repair-fillrules."""
    for (pg, i), d in vis.items():
        v = d.get('visual', {})
        refs = {p['queryRef'] for r in v.get('query', {}).get('queryState', {}).values() for p in r.get('projections', [])}
        dead = sorted({e.get('selector', {}).get('metadata') for es in v.get('objects', {}).values() for e in es
                       if 'FillRule' in json.dumps(e) and e.get('selector', {}).get('metadata')
                       and e['selector']['metadata'] not in refs})
        if dead:
            put(pg, '%s: %d colour scale(s) point at fields the table does not have (%s) - they never show; run '
                    'mix_palette --repair-fillrules (fillrule-dead)' % (sel_name(d) or i, len(dead), ', '.join(dead[:3])))


def check_field_refs(report_dir, d_def, fail):
    """field-ref (a department repo 2026-10-17): a field named OUTSIDE the visual's query - selector.metadata (column format,
    colour scale), FillRule Input SelectRef.ExpressionName (the gradient's input), expansionStates queryRefs - must exist
    in the model. A rebinding that renames the query but not these leaves them dangling: no error, the colour / format /
    expand state just disappears. MKT_01 Classic 16/10 carried 97 (62 metadata, 8 ExpressionName, 27 queryRefs) - the
    blue scales of every table gone vs Legacy. Not for _Legacy: the original is read-only, its own dead entries are noise."""
    if os.path.basename(os.path.normpath(report_dir)).endswith('_Legacy'):
        return
    tdir = glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables'))
    if not tdir:
        return
    fields = set()
    for f in glob.glob(os.path.join(tdir[0], '*.tmdl')):
        t = os.path.basename(f)[:-5]
        for m in re.finditer(r"(?m)^\t(?:column|measure) ('(?:[^']|'')+'|[^\s=]+)", open(f, encoding='utf-8').read()):
            n = m.group(1)
            fields.add('%s.%s' % (t, n[1:-1].replace("''", "'") if n.startswith("'") else n))
    # plain refs only: Table.Field or Fn(Table.Field). A nested expression (SparklineData(...), Divide(..., ScopedEval
    # (...))) is skipped - 50 such across the estate 17/10, the rule cannot parse them so it must not guess.
    plain = re.compile(r'^(?:\w+\()?([^().\[\]]+\.[^()\[\]]+)\)?$')
    for f in glob.glob(os.path.join(d_def, 'pages', '*', 'visuals', '*', 'visual.json')):
        dead = set()

        def walk(o, key=None):
            if isinstance(o, dict):
                for k, v in o.items():
                    walk(v, k)
            elif isinstance(o, list):
                for v in o:
                    walk(v, key)
            elif isinstance(o, str) and key in ('metadata', 'ExpressionName', 'queryRefs') and '.' in o:
                m = plain.match(o)
                if m and m.group(1) not in fields:
                    dead.add(o)
        walk(json.load(open(f, encoding='utf-8-sig')))
        if dead:
            fail.append('%s: %d field reference(s) outside the query point at nothing in the model (%s) - colour scale / '
                        'column format / expand state silently lost; rebind them to the model names (field-ref)'
                        % (os.path.basename(os.path.dirname(f)), len(dead), ', '.join(sorted(dead)[:3])))


def check_default_vs_main(vis, bms, put):
    """The state WHEN THE FILE OPENS must match bookmark <Page>_Main exactly.
    Desktop Save writes the state BEING VIEWED as the default: 2026-09-25 the user saved while on tab 2
    -> the file opened on tab 2 with tab 1 hidden entirely. check_tab_default does not catch it because exactly 1 tab is still visible."""
    for b in bms.values():
        dn = str(b.get('displayName', ''))
        pg = b.get('explorationState', {}).get('activeSection')
        if not dn.endswith('_Main') or not pg:
            continue
        sec = b['explorationState'].get('sections', {}).get(pg, {})
        want = {}
        for k, v in sec.get('visualContainers', {}).items():
            want[k] = (v.get('singleVisual', {}).get('display', {}).get('mode') == 'hidden')

        def walk(t):
            for k, v in t.items():
                want[k] = bool(v.get('isHidden'))
                walk(v.get('children', {}))
        walk(sec.get('visualContainerGroups', {}))
        diff = [i for (p, i), d in vis.items()
                if p == pg and i in want and bool(d.get('isHidden')) != want[i]]
        if diff:
            put(pg, 'page default drifts from %s: %d visuals differ from the bookmark state (e.g. %s) - '
                'reapply the %s state as the default'
                % (dn, len(diff), ', '.join(str(sel_name(vis[(pg, i)]) or i) for i in diff[:3]), dn))


def check_names(vis, put):
    if KEEP_OLD_DESIGN:
        return            # Classic / Legacy keep the old selection names (see KEEP_OLD_DESIGN)
    for (pg, i), d in vis.items():
        nm = sel_name(d)
        if title_shown(d):
            # This name IS the text shown on the canvas (Power BI uses one field for both).
            # User decided 2026-09-26: GROUPS keep the standard name; a LEAF visual showing its title
            # keeps the ORIGINAL TEXT of the Legacy version (literal or dynamic measure). Only the opposite
            # is an error: a title that shows a technical name like 'Chart_RevenueByDay'.
            if i in CAPTION_EXEMPT.get(pg, set()):
                continue
            if nm and TECH_TITLE_RX.match(nm):
                put(pg, '%s: the shown title is a TECHNICAL NAME %r - restore the original text '
                    'of the Legacy version (only groups need a standard name)' % (i, nm))
            continue
        if nm is None:
            put(pg, '%s: NOT NAMED in Selection' % i)
        elif nm.split('_')[0] in ABBREV_BAD:
            abbr = nm.split('_')[0]
            full = ABBREV_BAD[abbr]
            put(pg, '%s: name %r abbreviates %r and saves %d characters - too little, '
                'spell out %r (threshold: word >=6 characters and saves >=3)'
                % (i, nm, abbr, len(full) - len(abbr), full))
        elif not NAME_RX.match(nm):
            why = []
            if ' ' in nm:
                why.append('has spaces')
            if '-' in nm:
                why.append('has hyphens')
            for seg in nm.split('_'):
                if seg and not seg[0].isupper():
                    why.append('segment %r does not start with a capital' % seg)
                    break
            if any(x.isupper() and len(x) > 3 for x in nm.split('_')):
                why.append('ALL CAPS')
            put(pg, '%s: name %r breaks the standard (%s)' % (i, nm, ', '.join(why) or 'does not match the regex'))


def check_geometry(page_vis, fail, folder=None):
    # baseline_align (13/10, Product Mix): a column chart shortened so the foot of its columns stands on the row line
    # (its axis labels are one line, the charts beside it cap theirs) keeps 5 on L/T/R; only its bottom inset is free -
    # declared per visual in pbi-gate.json with the pixel measure that proves it
    align = gate_cfg().get('baseline_align', {}).get(folder or '', {})

    def absrect(i):
        x = y = 0.0
        d = page_vis[i]
        w = d['position'].get('width') or 0
        h = d['position'].get('height') or 0
        cur = d
        while cur is not None:
            x += cur['position'].get('x') or 0
            y += cur['position'].get('y') or 0
            cur = page_vis.get(cur.get('parentGroupName'))
        return x, y, x + w, y + h

    def off(v):
        return abs(v - round(v)) > 1e-6 or round(v) % PAD != 0

    def half_ok(i, d, k, v):
        """grid5 exception: an EQUAL split may land off the grid (2 on 660 = 327.5, 4 on 1270 = 313.75). Allowed for a
        block with a same-size sibling, the block right after an off-grid sibling, and anything inside an off-grid block."""
        dim, at = ('width', 'x') if k in ('x', 'width') else ('height', 'y')
        par = d.get('parentGroupName')
        P = page_vis.get(par)
        if P and off(P['position'].get(dim) or 0):
            return True
        sibs = [s['position'] for j, s in page_vis.items() if j != i and s.get('parentGroupName') == par]
        if k == dim:
            return any(abs((s.get(dim) or 0) - v) < 1e-6 for s in sibs)
        return any(off(s.get(dim) or 0) and abs((s.get(at) or 0) + (s.get(dim) or 0) + PAD - v) < 1e-6 for s in sibs)

    for i, d in page_vis.items():
        for k in ('x', 'y', 'width', 'height'):
            v = d['position'].get(k)
            if v is None:
                continue
            if off(v) and not half_ok(i, d, k, v):
                fail.append('%s: %s=%s is off the %d grid'
                            % (sel_name(d) or i, k, v, PAD))

    # equal-split (user 2026-10-08): neighbour blocks of one column / one row must be EXACTLY equal when they differ by
    # one grid step - 325 + 5 + 330 is the remainder pushed into one block (measured 08/10: 33 such pairs at a department repo)
    blocks = {}
    for i, d in page_vis.items():
        if 'visualGroup' in d:   # hidden tabs too - a tab is shown by its bookmark
            blocks.setdefault(d.get('parentGroupName'), []).append(d)
    for par, bs in blocks.items():
        for a in bs:
            for b in bs:
                pa, pb = a['position'], b['position']
                for at, dim, oat, odim in (('y', 'height', 'x', 'width'), ('x', 'width', 'y', 'height')):
                    # neighbours across one cut: they overlap on the other axis (a 2-block row over a 4-block row counts -
                    # 08/10 Theo tháng was 325 over 330 with different widths and slipped through a same-width test)
                    same_line = min(pa.get(oat, 0) + pa.get(odim, 0), pb.get(oat, 0) + pb.get(odim, 0)) - max(pa.get(oat, 0), pb.get(oat, 0)) > 1e-6
                    touching = abs(pa.get(at, 0) + pa.get(dim, 0) + PAD - pb.get(at, 0)) < 1e-6
                    diff = abs(pa.get(dim, 0) - pb.get(dim, 0))
                    if same_line and touching and 1e-6 < diff <= PAD:
                        fail.append('%s / %s: %s %s vs %s - unequal split, make both %s (equal-split)' % (
                            sel_name(a) or a['name'], sel_name(b) or b['name'], dim, pa.get(dim), pb.get(dim),
                            (pa.get(dim, 0) + pb.get(dim, 0)) / 2))

    # matrix-few, static half (user 2026-10-08: "matrix ko bao giờ dc dùng để hiển thị thông tin ít"): a matrix with no
    # row / column field, or a table of measures only, is ONE row -> a card. The few-rows half runs in layer engine.
    for i, d in page_vis.items():
        v = d.get('visual', {})
        if v.get('visualType') not in ('pivotTable', 'tableEx'):   # hidden tabs too
            continue
        q = v.get('query', {}).get('queryState', {})
        if v['visualType'] == 'pivotTable':
            one = not q.get('Rows', {}).get('projections') and not q.get('Columns', {}).get('projections')
        else:
            one = all('Measure' in p.get('field', {}) for p in q.get('Values', {}).get('projections', []))
        if one:
            fail.append('%s: a %s that is ONE row - show it as a card (matrix-few)' % (sel_name(d) or i, v['visualType']))

    kids = {}
    for i, d in page_vis.items():
        if d.get('parentGroupName'):
            kids.setdefault(d['parentGroupName'], []).append(i)
    for gid, ks in kids.items():
        bgs = [k for k in ks if str(sel_name(page_vis[k]) or '').startswith('BG_')]
        if len(bgs) != 1 or gid not in page_vis:
            continue
        anc, cur = [], page_vis[gid]
        while cur is not None and cur.get('parentGroupName'):
            anc.append(str(sel_name(page_vis[cur['parentGroupName']]) or ''))
            cur = page_vis.get(cur['parentGroupName'])
        gname = str(sel_name(page_vis[gid]) or '')
        if 'Chart' not in anc or gname.startswith('Tab') or gname == 'Card':
            continue        # structural frames / the card row have rules of their own
        b = page_vis[bgs[0]]['position']
        # two-layer block of the Original template (page 2 'Payment & Channel', user 09/10): an outer frame holds a
        # Title_ and inner groups (each its own BG); an inner group stacks a Title_ (or a Card_) over its chart. The outer frame's
        # inner groups / title are not insets; a chart under a title / card starts 5 below it instead of 5 below the top.
        card_bottom = max((page_vis[k]['position']['y'] + page_vis[k]['position']['height'] for k in ks
                           if str(sel_name(page_vis[k]) or '').startswith(('Card_', 'Title_'))), default=None)
        for k in ks:
            nmk = str(sel_name(page_vis[k]) or '')
            if k == bgs[0] or nmk.startswith(('BT_', 'Card_', 'Pct_', 'Title_')) or 'visualGroup' in page_vis[k]:
                continue
            if nmk.startswith('Image_') and page_vis[k].get('visual', {}).get('visualType') == 'image':
                continue    # a card's icon sits at its right edge on purpose - rule card-icon places it (01/10)
            p = page_vis[k]['position']
            top = (b['y'] + PAD) if card_bottom is None else (card_bottom + PAD)
            off = (p['x'] - b['x'], PAD + p['y'] - top,
                   (b['x'] + b['width']) - (p['x'] + p['width']),
                   (b['y'] + b['height']) - (p['y'] + p['height']))
            if k in align:
                off = off[:3] + (PAD,) if off[3] >= PAD else off
            if any(abs(o - PAD) > 1e-6 for o in off):
                fail.append('%s: inset from BG L/T/R/B=%s, must be %d on every side'
                            % (nmk or k, tuple(round(o, 2) for o in off), PAD))

    for i, d in page_vis.items():
        nm = str(sel_name(d) or '')
        if not nm.startswith('BG_') or 'Panel' in nm or nm in STRUCT_GROUPS:
            continue
        x1, y1, x2, y2 = absrect(i)
        if x1 < PAD - 1e-6 or CANVAS_W - x2 < PAD - 1e-6 or CANVAS_H - y2 < PAD - 1e-6:
            fail.append('%s: page margin < %d (left %.0f right %.0f bottom %.0f)'
                        % (nm, PAD, x1, CANVAS_W - x2, CANVAS_H - y2))


def pad_of(d):
    """REAL padding of a text frame. Header frames often have left/right 20 - ignoring it
    undercounts by 40px and the text gets cut to 'STORE R...' (paid for on 2026-09-24)."""
    vco = d.get('visual', {}).get('visualContainerObjects', {})
    pr = (vco.get('padding') or [{'properties': {}}])[0]['properties']
    out = {}
    for k in ('left', 'right', 'top', 'bottom'):
        v = lit(pr.get(k, {}))
        out[k] = float(v[:-1]) if v and v.endswith('D') else (float(v) if v else 0.0)
    return out


def G_w(t):
    """Tab label width: Segoe UI bold 12 (the White tab font)."""
    return w_text(t, 12, True, False)


def check_header(page_vis, fail):
    # Do NOT look it up by name: for a shape with its title ON, title.text IS the displayed
    # text, so the name follows the content ('STORE REPORT') and is no longer 'TXT_ReportType'.
    # Identify by STRUCTURE: the two text shapes in the 'Title' group, sorted by x.
    tg = None
    for i, d in page_vis.items():
        if 'visualGroup' in d and d['visualGroup'].get('displayName') == 'Title':
            tg = i
    if tg is None:
        return
    texts = []
    for i, d in page_vis.items():
        if d.get('parentGroupName') != tg or 'visualGroup' in d:
            continue
        if d['visual'].get('visualType') != 'shape' or not title_shown(d):
            continue
        pr = d['visual']['visualContainerObjects']['title'][0]['properties']
        if not lit(pr.get('text', {})) or not lit(pr.get('fontSize', {})):
            continue
        texts.append((d['position']['x'], d))
    texts.sort()
    if len(texts) < 2:
        return
    rt, pn = texts[0][1], texts[1][1]

    def tp(d, k):
        pr = d['visual']['visualContainerObjects']['title'][0]['properties']
        return lit(pr.get(k, {}))

    t1, s1 = tp(rt, 'text'), float((tp(rt, 'fontSize') or '0D')[:-1])
    t2, s2 = tp(pn, 'text'), float((tp(pn, 'fontSize') or '0D')[:-1])
    p1, p2 = pad_of(rt), pad_of(pn)
    fl = lambda d, k: tp(d, k) == 'true'
    w1 = w_text(t1, s1, fl(rt, 'bold'), fl(rt, 'italic'))
    w2 = w_text(t2, s2, fl(pn, 'bold'), fl(pn, 'italic'))

    need1 = grid5(w1 + p1['left'] + p1['right'])
    if rt['position']['width'] != need1:
        fail.append("report name frame '%s': is %s, the formula wants %s "
                    "(text %.0f + padding %.0f, rounded up to grid 5)"
                    % (t1, rt['position']['width'], need1, w1, p1['left'] + p1['right']))
    # 01/10: 160.1 px of text in a 160 frame wrapped to 'Daily &' - the frame holds the text + NAME_SLACK, on grid 5
    need2 = 5 * math.ceil((w2 + p2['left'] + p2['right'] + NAME_SLACK) / 5.0)   # no -1 px tolerance here
    if not (w2 + p2['left'] + p2['right'] + NAME_SLACK <= pn['position']['width'] <= need2 + 5):
        fail.append("page name frame '%s': is %s, the formula wants %s (text %.1f + padding + %d slack)"
                    % (t2, pn['position']['width'], need2, w2, NAME_SLACK))
    # the page name JOINS RIGHT AFTER the report name frame (the breathing gap is already inside the right padding)
    x_need = rt['position']['x'] + rt['position']['width']
    if pn['position']['x'] != x_need:
        fail.append('page name is detached: x=%s, it must join right after the report name frame = %s'
                    % (pn['position']['x'], x_need))
    # the page name must END before the tab strip starts (gap >= 5) - a department repo 12/10: 'STORE REPORT AM' pushed the page
    # name under the tabs on Weekly / DSR and the two checks above stayed green (they only compare the two title frames)
    def ax(n):
        x = 0
        while n in page_vis:
            x += page_vis[n]['position']['x']; n = page_vis[n].get('parentGroupName')
        return x
    tab = next((i for i, d in page_vis.items() if d.get('visualGroup', {}).get('displayName') == 'Tab'), None)
    if tab:
        pend, tstart = ax(pn['name']) + pn['position']['width'], ax(tab)
        if tstart < pend + 5:
            fail.append("page name '%s' runs into the tab strip: it ends at x=%s, the tabs start at x=%s (need a gap >= 5) "
                        "- narrow the tabs to their labels or shorten the page name" % (t2, pend, tstart))


TITLE_SMALL = {'by','vs', 'of', 'and', 'per', 'in', 'on', 'to', 'the', 'or', 'a', 'over'}
# common business acronyms; the region adds its own words (values.json "acronyms") where region_values is loaded
TITLE_ACRO = {'ADS', 'COGS', 'KPI', 'LW', 'LM', 'LY', 'TY', 'MTD', 'YTD', 'AM', 'OM', 'B2C', 'MoM', 'WoW', 'LYTD', 'LMTD', 'LWTD',
              'B2B', 'POS', 'VAT', 'SKU', 'ID', 'HQ'}

# business terms whose second word is an English joining word but keeps its capital (a department repo 14/10: Sell In = the company
# selling to franchise stores, Sell Out = the stores' own sales) - masked before the word test
TITLE_TERMS = ('Sell In', 'Sell Out')


def check_field_params(report_dir, d_def, fail):
    """param-groupby + param-value (user 14/10, Franchise Purchases quantity view: "Something's wrong with one or more
    fields ... (Parameter_PhanTichTheo) Phan Tich Theo", then an empty table). A field-parameter table (column 'Parameter
    Fields' with ParameterMetadata) needs relatedColumnDetails groupByColumn 'Parameter Fields' on its display column,
    and every value a slicer / bookmark selects on 'Parameter Fields' must be one of the NAMEOF fields of the table
    (the Legacy value 'Measure'[<quantity>] survived the rename of the table to '#Measure' and selected nothing)."""
    params = {}
    for t in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        s = open(t, encoding='utf-8-sig').read()
        if 'ParameterMetadata' not in s or "column 'Parameter Fields'" not in s:
            continue
        name = re.search(r"^table\s+('?)(.+?)\1\s*$", s, re.M).group(2)
        params[name] = set("'%s'[%s]" % (a.strip("'"), b) for a, b in re.findall(r"NAMEOF\(\s*('[^']+'|\w+)\[([^\]]+)\]\s*\)", s))
        disp = [c for c in re.findall(r"(?m)^\tcolumn ('[^']+'|\S+)", s) if c.strip("'") not in ('Parameter Fields', 'Parameter Order')]
        if disp:
            blk = s[s.index('\tcolumn %s' % disp[0]):]
            end = blk.find('\n\tcolumn ', 5)
            blk = blk[:end] if end > 0 else blk
            if "groupByColumn: 'Parameter Fields'" not in blk:
                fail.append("field parameter %s: column %s has no relatedColumnDetails groupByColumn 'Parameter Fields' - "
                            "a visual using it reports Missing_References (param-groupby)" % (name, disp[0]))
    if not params:
        return
    for f in glob.glob(os.path.join(d_def, 'bookmarks', '*.json')) + glob.glob(os.path.join(d_def, 'pages', '*', 'visuals', '*', 'visual.json')):
        raw = open(f, encoding='utf-8-sig').read()
        if 'Parameter Fields' not in raw:
            continue
        for tname, allowed in params.items():
            if '"Entity": "%s"' % tname not in raw:     # exact name: Parameter_PhanTich is inside Parameter_PhanTichTheo
                continue
            # a selected field is written as the literal "'''<table>''[<field>]'" (DAX text inside a quoted literal)
            for v in set(re.findall(r'"Value": "\'(\'\'[^"]*?\])\'"', raw)):
                val = v.replace("''", "'")
                if val not in allowed:
                    fail.append("%s: selects %s on %s[Parameter Fields] - not a field of the parameter (%s); the "
                                "selection picks nothing and the visual stays empty (param-value)"
                                % (os.path.relpath(f, d_def), val, tname, ', '.join(sorted(allowed))))


def check_title_case(d_def, fail):
    """title-case (a department repo 12/10, user: "cấu trúc tên bảng phải đồng nhất"; a department repo 14/10: "1 chuẩn duy nhất là viết
    hoa caption đầu"): on White / Red every shown visual title follows the company template style ('Total Revenue by
    Brand'): each word capitalised, never a whole word in capitals unless it is a business acronym, joining words lower
    case except first. 02 White had 34 ALL-CAPS + 40 Title Case. Same rule and name as a department repo - one rule for every department."""
    bad = []
    for f in glob.glob(os.path.join(d_def, 'pages', '*', 'visuals', '*', 'visual.json')):
        vis = json.load(open(f, encoding='utf-8')).get('visual', {})
        if vis.get('visualType') in (None, 'shape', 'image', 'textbox', 'slicer', 'actionButton', 'card', 'cardVisual'):
            continue
        tt = vis.get('visualContainerObjects', {}).get('title', [{}])[0].get('properties', {})
        t = lit(tt.get('text', {}))
        if not t or lit(tt.get('show', {})) == 'false':
            continue
        t0 = t
        for term in TITLE_TERMS:
            t_ = t.replace(term, term.replace(' ', ''))
            t = t_
        words = re.findall(r'[^\W\d_][^\W_]*', t)   # Unicode letters: 'Lợi Nhuận' is two words, not 'L' 'i' 'Nhu' 'n'
        for i, w in enumerate(words):
            if w in TITLE_ACRO or w.upper() in TITLE_ACRO:
                if w not in TITLE_ACRO and w.upper() != w:
                    bad.append((t0, w)); break
                continue
            if w.lower() in TITLE_SMALL and i > 0:
                if w != w.lower():
                    bad.append((t0, w)); break
                continue
            if not w[:1].isupper() or (len(w) > 1 and w.isupper()):
                bad.append((t0, w)); break
    for t, w in sorted(set(bad)):
        fail.append("visual title %s: word %s breaks the title style (each word capitalised, no ALL-CAPS word except a "
                    "business acronym, joining words lower case) (title-case)" % (ascii(t), ascii(w)))


def title_case(t):
    """The fix that check_title_case accepts (mix_builder --title-style): acronyms as TITLE_ACRO writes them, joining
    words lower case except first, every other word capitalised with the rest small when it was ALL-CAPS."""
    n = [0]
    acro = dict((a.upper(), a) for a in TITLE_ACRO)
    def one(m):
        w, i = m.group(0), n[0]
        n[0] += 1
        if w.upper() in acro:
            return acro[w.upper()]
        if w.lower() in TITLE_SMALL and i > 0:
            return w.lower()
        return w[:1].upper() + (w[1:].lower() if len(w) > 1 and w.isupper() else w[1:])
    out = re.sub(r'[^\W\d_][^\W_]*', one, t)
    for term in TITLE_TERMS:
        out = re.sub(re.escape(term), term, out, flags=re.I)
    return out


def check_typography(page_vis, fail, legend_warn):
    skip = ('shape', 'image', 'textbox', 'slicer', 'card', 'cardVisual')
    for i, d in page_vis.items():
        if 'visualGroup' in d or d['visual'].get('visualType') in skip:
            continue
        t = d['visual'].get('visualContainerObjects', {}).get('title')
        if t and title_shown(d):   # with the title OFF nobody sees its font size/alignment
            p = t[0]['properties']
            if lit(p.get('fontSize', {})) != '12D' or lit(p.get('alignment', {})) != 'left':
                fail.append('%s: title size=%s align=%s - must be 12D / left'
                            % (sel_name(d) or i, lit(p.get('fontSize', {})),
                               lit(p.get('alignment', {}))))
            # title-font (user 13/10, Executive: "cổng kiểm title viết Bold và chung 1 loại font đâu má?"): one title
            # look on every chart / table - Segoe UI Semibold (skill pbi-white 786); no font set = the theme's regular
            # Segoe (01 White had 30, 02 White 18), bold false = a thin title
            fam = str(lit(p.get('fontFamily', {})) or '')
            if 'Segoe UI Semibold' not in fam or lit(p.get('bold', {})) == 'false':
                fail.append("%s: title font %s%s - every chart / table title is Segoe UI Semibold (title-font)"
                            % (sel_name(d) or i, fam.split("''")[0].strip("'") or 'not set (theme regular)',
                               ', bold off' if lit(p.get('bold', {})) == 'false' else ''))
        # WARNING, does NOT block. The legend is something the USER sets in Desktop - the agent only REPORTS.
        # 2026-09-25: 'TopLeft' DOES NOT exist in Power BI (the agent invented it in aa676ee); Desktop only
        # writes Top/Bottom/Left/Right/TopCenter/BottomCenter/LeftCenter/RightCenter. "Left anchored" = 'Top'.
        # The user's donut/pie = 'RightCenter'. No position declared = Power BI default 'Top'.
        pos = legend_position(d['visual'])
        if pos is not None:
            want = LEGEND_WANT_CATEGORY if d['visual'].get('visualType') in LEGEND_BY_CATEGORY else LEGEND_WANT
            if pos not in LEGEND_VALID:
                legend_warn.append('%s: legend %r is NOT valid in Power BI - use %r'
                                   % (sel_name(d) or i, pos, want))
            elif pos != want:
                legend_warn.append('%s: legend at %s - the standard is %s' % (sel_name(d) or i, pos, want))


LEGEND_BY_CATEGORY = ('pieChart', 'donutChart', 'treemap', 'funnel')
LEGEND_VALID = ('Top', 'Bottom', 'Left', 'Right', 'TopCenter', 'BottomCenter', 'LeftCenter', 'RightCenter')
LEGEND_WANT = 'Top'
LEGEND_WANT_CATEGORY = 'RightCenter'
LEGEND_NEVER = ('pivotTable', 'tableEx', 'matrix', 'multiRowCard', 'kpi', 'gauge')
LEGEND_ROLES_SERIES = ('Series', 'Legend')
LEGEND_ROLES_VALUES = ('Y', 'Y2', 'Values')


def legend_position(v):
    """Position of a chart's VISIBLE legend; None = no legend shown.
    A legend only shows when the chart has a legend field, or a pie/donut/treemap has a category,
    or it has 2 or more value series - for a single-series chart Power BI draws no legend."""
    if v.get('visualType') in LEGEND_NEVER:
        return None
    qs = v.get('query', {}).get('queryState', {})
    n_proj = lambda roles: sum(len(qs.get(r, {}).get('projections', [])) for r in roles)
    has = (n_proj(LEGEND_ROLES_SERIES) > 0
           or (v.get('visualType') in LEGEND_BY_CATEGORY and n_proj(('Category',)) > 0)
           or n_proj(LEGEND_ROLES_VALUES) >= 2)
    show, pos = None, None
    for e in v.get('objects', {}).get('legend', []) or []:
        p = e.get('properties', {})
        if 'show' in p:
            show = lit(p['show'])
        if 'position' in p:
            pos = lit(p['position'])
    if not has or show == 'false':
        return None
    return pos or 'Top'


# ---------------------------------------------------------------- report-level rules
# User 2026-09-25/26: every rule must be machine-checked, not only written in the skill.
# Naming rule of 2026-09-28 (user): the folder glues the storage mode to the number - IP = Import, DR = DirectQuery.
# 2026-10-04 (user): the FILE (= the name on the Service) carries the storage mode as a readable SUFFIX instead, so a
# reader knows what kind of report it is; the folder keeps the short code (the repo reads it fine):
#   folder <DEPT>_<num><IP|DR>_<Function>[<Tier>]_<Kind>        (the 2026-10-04 folder, replaced 2026-10-19 below)
#   file   <DEPT>_<num>_<FUNCTION>[-<Tier>]_<Live|Scheduled>    OPS_02_STORE-REPORT-AM_Live
# 2026-10-05 (user, a department repo): the suffix pairs two STATES - Live (reads the warehouse) / Scheduled (Import, refreshed
# on a schedule) - instead of the verb 'Refresh'; the function is UPPER CASE so it catches the eye on the Service,
# and the parts follow one delimiter rule (user 05/10, as in session names a department repo_Claude_4-10-2026): '_' separates
# PARTS, '-' joins words INSIDE a part (StoreReport -> STORE-REPORT); the tier is PART OF the function (user 2026-10-05: 'bậc là 1 phần của tên', as the folder StoreReportAM).
# Two builds of one report with different storage (a DR report kept with an IP backup that still shows the last
# refresh when the warehouse is down) share the number and differ in the suffix - two items on the Service.
# 2026-10-19 (a department repo): the folder takes the file's own shape and ends in storage code + kind (the code where the file has its load mode); the kinds Mix and
# Main are renamed White and Red. A file name gets _V<n> only when two builds share the number and the load mode:
#   folder <DEPT>_<num>_<FUNCTION>[-<Tier>]_<IP|DR>_<Kind>                 OPS_02_STORE-REPORT-AM_DR_White
#   file   <DEPT>_<num>_<FUNCTION>[-<Tier>]_<Live|Scheduled>[_V<n>]        OPS_02_STORE-REPORT-AM_Live
# groups: 1 dept · 2 num · 3 function (tier included) · 4 storage code · 5 kind
KINDS = ('Legacy', 'Classic', 'White', 'Red')
FOLDER_RX = re.compile(r'^([A-Z]{2,4})_(\d\d)_([A-Z0-9]+(?:-[A-Z0-9]+)*)_(IP|DR)_(Legacy|Classic|White|Red)$')
ARTIFACT_RX = re.compile(r'^([A-Z]{2,4})_(\d\d)_([A-Z0-9]+(?:-[A-Z0-9]+)*)_(Live|Scheduled)(?:_V(\d+))?$')
MODE_SUFFIX = {'DR': 'Live', 'IP': 'Scheduled'}    # folder code -> file suffix


def file_function(folder_function):
    """Folder token (PascalCase) -> file token: words split, UPPER, joined by '-'.
    StoreReport -> STORE-REPORT · IncomeStatement -> INCOME-STATEMENT · B2CSales -> B2C-SALES · Overview -> OVERVIEW."""
    return '-'.join(w.upper() for w in re.findall(r'[A-Z0-9]+(?![a-z])|[A-Z][a-z0-9]*', folder_function))
from region_values import manager_root, value as region_value  # noqa: E402 - company values live with the region manager
DW_SERVER = region_value(os.path.dirname(os.path.abspath(__file__)), 'warehouse_server', '')  # the gateway connection text, exactly
LEGACY_SRC = tuple(region_value(os.path.dirname(os.path.abspath(__file__)), 'legacy_sources', []))  # the old system's sources a model must not read
TITLE_ACRO |= set(region_value(os.path.dirname(os.path.abspath(__file__)), 'acronyms', []))  # the region's own business acronyms
# dw-only-tables (user 2026-10-10): the report keeps the warehouse's Kimball structure. Only two things break it:
#   1. a self-made table - every Dim_/Fact_/Bridge_/Agg_ of the model is the warehouse table of the same name, read from the
#      warehouse; the report may own only #Measure · Parameter_* · @ (the department standard 2c-4/6);
#   2. a wrong relationship line - every relationship between two warehouse tables matches a warehouse foreign key, else the
#      model joins on something the source of truth does not have and cannot be reconciled.
# Selecting columns or rows (Power Query or a plain SELECT) does not change the structure and is NOT checked here.
OWN_TABLE_RX = re.compile(r'^(#|@|Parameter_)')
DW_TABLE_RX = re.compile(r'^(Dim|Fact|Bridge|Agg)_[A-Z][A-Za-z0-9]*$')


def check_dw_only_tables(report_dir, fail):
    """Part 1 (static): no self-made table."""
    for f in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        tb = os.path.basename(f)[:-5]
        if OWN_TABLE_RX.match(tb):
            continue
        t = open(f, encoding='utf-8-sig').read()
        part = t[t.find('\tpartition '):] if '\tpartition ' in t else ''
        why = None
        if not DW_TABLE_RX.match(tb):
            why = 'not a warehouse table name and not #Measure / Parameter_* / @ - self-made table'
        elif re.search(r'(?m)^\tpartition .+= calculated', t):
            why = 'calculated (DAX) table - a Dim_/Fact_/Bridge_/Agg_ must be the warehouse table'
        elif 'Sql.Database(' not in part:
            why = 'does not read the warehouse'
        elif not (re.search(r'Item\s*=\s*"%s"' % re.escape(tb), part)
                  or re.search(r'(?i)\bFROM\s+(\[?dbo\]?\.)?\[?%s\]?(?![A-Za-z0-9_])' % re.escape(tb), part)):
            why = 'does not read dbo.%s - the table must be the warehouse table of the same name' % tb
        if why:
            fail.append('table %s: %s (dw-only-tables)' % (tb, why))


def model_column_sources(report_dir):
    """{(table, model column) -> source column} for every table of the model (lower case)."""
    out = {}
    for f in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        tb = os.path.basename(f)[:-5]
        col = None
        for line in open(f, encoding='utf-8-sig'):
            m = re.match(r"^\tcolumn\s+'?([^'=]+?)'?\s*(=.*)?$", line.rstrip())
            if m:
                col = m.group(1).strip()
                out[(tb.lower(), col.lower())] = col.lower()
                continue
            m = re.match(r'^\t\tsourceColumn:\s*(.+?)\s*$', line)
            if m and col:
                out[(tb.lower(), col.lower())] = m.group(1).strip().strip("'\"").lower()
    return out


def check_dw_relationships(report_dir, cur, fail):
    """Part 2 (layer dw): every relationship between two warehouse tables matches a warehouse foreign key."""
    fks = set()
    for pt, pc, rt, rc in cur.execute(
            "select tp.name, cp.name, tr.name, cr.name from sys.foreign_key_columns k "
            "join sys.tables tp on tp.object_id = k.parent_object_id "
            "join sys.columns cp on cp.object_id = k.parent_object_id and cp.column_id = k.parent_column_id "
            "join sys.tables tr on tr.object_id = k.referenced_object_id "
            "join sys.columns cr on cr.object_id = k.referenced_object_id and cr.column_id = k.referenced_column_id"):
        fks.add((pt.lower(), pc.lower(), rt.lower(), rc.lower()))
    src = model_column_sources(report_dir)
    ref = re.compile(r"^\t(from|to)Column:\s*'?([^'.]+?)'?\.'?([^']+?)'?\s*$")
    for f in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'relationships.tmdl')):
        ends = {}
        for line in open(f, encoding='utf-8-sig').read().splitlines() + ['relationship _end']:
            if line.startswith('relationship '):
                if 'from' in ends and 'to' in ends:
                    (ft, fc), (tt, tc) = ends['from'], ends['to']
                    if DW_TABLE_RX.match(ft) and DW_TABLE_RX.match(tt):
                        a = (ft.lower(), src.get((ft.lower(), fc.lower()), fc.lower()))
                        b = (tt.lower(), src.get((tt.lower(), tc.lower()), tc.lower()))
                        if a + b not in fks and b + a not in fks:
                            fail.append('relationship %s.%s -> %s.%s: no warehouse foreign key joins these columns - a '
                                        'relationship line must follow the warehouse model (dw-only-tables)' % (ft, fc, tt, tc))
                ends = {}
                continue
            m = ref.match(line)
            if m:
                ends[m.group(1)] = (m.group(2).strip(), m.group(3).strip())


DECOR = {'shape', 'image', 'textbox', 'actionButton', None}
BIG_CHART_H = 250                    # a dashboard this tall or taller counts as a big chart


# categories a field puts on an axis (upper bound for one year / month / network)
AXIS_N = {'WeekPeriod': 53, 'WeekFridayStart': 53, 'WeekNum': 53, 'Week': 53, 'Day': 31,
          'MonthNumber': 12, 'MonthNameShort': 12, 'MonthName': 12, 'Month': 12, 'HourStart': 17,
          'DayNameShort': 7, 'DayName': 7, 'ShortName': 50, 'StoreName': 50, 'ItemName': 50}
NUMERIC_AXIS = {'Day', 'MonthNumber', 'HourStart', 'WeekNum', 'Month'}
MIN_CAT_W = 20            # Power BI minimum category width (px); preferredCategoryWidth cannot go lower
LONG_AXIS_N = 28          # 28+ categories = a long chart
H_AXIS_CHARTS = ('columnChart', 'clusteredColumnChart', 'lineChart', 'areaChart', 'ribbonChart',
                 'lineClusteredColumnComboChart', 'lineStackedColumnComboChart', 'stackedAreaChart',
                 'hundredPercentStackedColumnChart', 'waterfallChart')
V_AXIS_CHARTS = ('barChart', 'clusteredBarChart', 'hundredPercentStackedBarChart')


CAT_PX, SCALAR_PX, AXIS_PX, Y2_PX, WIDTH_SLACK, MIN_CHART_W = 60, 20, 80, 60, 1.25, 320


def topn_n(d):
    """Match-like object whose group(1) is the N a visual keeps: a TopN filter's Top, or an exact '~Top/~Bottom N'
    measure filter (mix_builder --topn-exact, 2026-10-03). None when neither."""
    m = re.search(r'"Top":\s*(\d+)', json.dumps(d.get('filterConfig', {})))
    if m:
        return m
    for f in d.get('filterConfig', {}).get('filters', []):
        mm = re.match(r'^~(?:Top|Bottom)\s*(\d+)', f.get('field', {}).get('Measure', {}).get('Property', '') or '')
        if mm:
            return mm
    return None


MONTH_AXIS = {'MonthNumber', 'MonthNameShort', 'MonthName', 'Month'}


def month_cut(pages, vis, pg, i):
    """True when a page slicer on <table>.IsCurrentMonth filters chart i (no NoFilter interaction from it): the month
    axis then shows the selected month only, not 12 (user 2026-10-05, Product Mix 'Revenue vs Margin vs Discount Amount
    By Month' drew 2 columns in a 635 px block because the gate counted 12 months; Legacy had NoFilter, the rebuild lost it)."""
    # only a slicer that HOLDS a selection cuts the axis: Legacy Monthly selects nothing, so its month charts show 12
    slicers = [k for (p2, k), x in vis.items() if p2 == pg and x.get('visual', {}).get('visualType') == 'slicer'
               and any(pr.get('queryRef', '').endswith('.IsCurrentMonth')
                       for pr in x['visual'].get('query', {}).get('queryState', {}).get('Values', {}).get('projections', []))
               and '"Where"' in json.dumps(x['visual'].get('objects', {}).get('general', []))]
    free = {it.get('source') for it in pages.get(pg, {}).get('visualInteractions', [])
            if it.get('target') == i and it.get('type') == 'NoFilter'}
    return any(s not in free for s in slicers)


def chart_need(d, cut_month=False):
    """(need_px, n, field, scalar) - the width a chart's categories need (user 2026-10-02: "dashboard là cột, thứ bị dư là
    chiều ngang"). Measured on the Ori template: 7 weekdays in 170 px x3 side by side, 12 months in 590-810, ~6 brands in
    400 => ~60 px a category (bars <= 24 px thick + air, skill dataviz); a continuous numeric axis packs a day in 20 px.
    cut_month: a current-month slicer filters the chart (month_cut) => a month axis has 1 category."""
    vis = d.get('visual', {})
    if vis.get('visualType') not in H_AXIS_CHARTS:
        return None
    q = vis.get('query', {}).get('queryState', {})
    cats = [pr['queryRef'].split('.', 1)[1] for pr in q.get('Category', {}).get('projections', [])]
    known = [(1 if cut_month and c in MONTH_AXIS else AXIS_N[c], c) for c in cats if c in AXIS_N]
    if not known:
        return None
    n, field = max(known)
    m = topn_n(d)
    if m:
        n = min(n, int(m.group(1)))
    ax = {k: lit(x) for e in vis.get('objects', {}).get('categoryAxis', []) for k, x in e.get('properties', {}).items()}
    scalar = ax.get('axisType') == 'Scalar' and all(c in NUMERIC_AXIS for c in cats)
    need = AXIS_PX + (Y2_PX if q.get('Y2', {}).get('projections') else 0) + n * (SCALAR_PX if scalar else CAT_PX)
    return need, n, field, scalar


def axis_scroll(d, cut_month=False):
    """(n, need_px, room_px, field) for a categorical-axis chart, else None. cut_month as in chart_need."""
    vis = d.get('visual', {})
    vt = vis.get('visualType')
    if vt not in H_AXIS_CHARTS + V_AXIS_CHARTS:
        return None
    q = vis.get('query', {}).get('queryState', {})
    cats = [pr['queryRef'].split('.', 1)[1] for pr in q.get('Category', {}).get('projections', [])]
    known = [(1 if cut_month and c in MONTH_AXIS else AXIS_N[c], c) for c in cats if c in AXIS_N]
    if not known:
        return None
    n, field = max(known)
    ax = {}
    for e in vis.get('objects', {}).get('categoryAxis', []):
        for k, x in e.get('properties', {}).items():
            ax[k] = lit(x)
    if ax.get('axisType') == 'Scalar' and all(c in NUMERIC_AXIS for c in cats):
        return None                        # continuous numeric axis never scrolls
    m = topn_n(d)
    if m:
        n = min(n, int(m.group(1)))
    w = MIN_CAT_W
    if ax.get('preferredCategoryWidth'):
        w = max(w, float(ax['preferredCategoryWidth'].rstrip('DL')))
    pos = d['position']
    if vt in V_AXIS_CHARTS:
        room = pos['height'] - 60
    else:
        room = pos['width'] - 80 - (60 if q.get('Y2', {}).get('projections') else 0)
    return n, int(n * w), int(room), field


MATRIX_COL_W = 90         # px one numeric value column needs (e.g. '8,146,809,443')
MATRIX_ROW_HDR = 150      # px row-header column
# AXIS_N HourStart = 17: hours that carry sales (06:00-22:00, measured on the warehouse, August 2026)
RECENT_WEEKS = 4          # columns left by a ~Recent <N> Weeks visual filter


def matrix_scroll(d):
    """(cols, need_px, room_px, field) for a pivot/table whose COLUMNS spread over a time field."""
    vis = d.get('visual', {})
    if vis.get('visualType') not in ('pivotTable', 'tableEx'):
        return None
    q = vis.get('query', {}).get('queryState', {})
    cols = [pr['queryRef'].split('.', 1)[1] for pr in q.get('Columns', {}).get('projections', [])]
    known = [(AXIS_N[c], c) for c in cols if c in AXIS_N]
    if not known:
        return None
    n, field = max(known)
    fl = json.dumps(d.get('filterConfig', {}), ensure_ascii=False)
    m = re.search(r'"Property": "~Recent (\d+) (Days|Weeks|Months)"', fl)
    if m:
        n = min(n, int(m.group(1)) * (7 if m.group(2) == 'Weeks' and field in ('Day',) else 1))
    nv = max(1, len(q.get('Values', {}).get('projections', [])))
    for e in vis.get('objects', {}).get('values', []):
        if lit(e.get('properties', {}).get('valuesOnRow', {})) == 'true':
            nv = 1                          # measures go to rows, one column per period
    col_w = MATRIX_COL_W
    ch = {k: lit(x) for e in vis.get('objects', {}).get('columnHeaders', []) for k, x in e.get('properties', {}).items()}
    fixed = [float(lit(e.get('properties', {}).get('value', {})).rstrip('D'))
             for e in vis.get('objects', {}).get('columnWidth', [])
             if '"Property": "%s"' % field in json.dumps(e.get('selector', {})) and lit(e.get('properties', {}).get('value', {}))]
    if ch.get('autoSizeColumnWidth') == 'false' and fixed:
        col_w = max(fixed)                  # widths fixed on purpose (e.g. Hourly 17 hour columns x 60px)
    need = MATRIX_ROW_HDR + n * nv * col_w
    return n * nv, need, int(d['position']['width']), field


TAB_LABEL_MAX = 10                    # tab-label (user 2026-09-29): 'Người bán & Sàn' (15) was cut to 'Người bán &..'
TAB_TEXT_PAD = 15                     # tab-label width (01/10): 'Doanh thu' 79 px in 85 showed 'Doanh…'; 'Tổng quan' 81 in 100 shows
NAME_SLACK = 20                       # header-text: room Desktop keeps INSIDE a shape title (page-name padding is 0): user 14/10 "Overview" 99.3 px in a 100 frame showed "Overvie", the 120 frame showed it whole; 01/10 160.1 px in 160 wrapped "Daily &"
LONG_PER_TAB, LONG_MIN_H = 3, 150     # long-chart (user 01/10 supreme rule): stacked, low
CHART_FILLS = {'#015A80', '#B8A365', '#199900', '#5E9AD7', '#13678A', '#127369', '#34517B', '#15274B', '#A2A2A2', '#595959',
               '#7F7F7F', '#3F3F3F'}   # literals allowed (greys); theme slots are ThemeDataColor 2..9   # chart-palette 30/09: the Original template's Theme1 exactly, + comparison greys
THEME_IDS = set(range(2, 10))   # ThemeDataColor ColorId 2..9 = theme dataColors[0..7] (0 background, 1 foreground; measured 01/10)
# table-overflow estimate (user 2026-09-29: "quá ngắn thì phải cân chỉnh sao cho mất luôn scroll bar"):
# a column is as wide as its header or its typical value, whichever is wider; px per char ~ 0.73 x font pt.
# Calibrated on a department White: a 5-column table at 445px and a 2-column table at 340px scrolled (caught), 625px did not.
OVF_PX_PER_PT, OVF_PAD, OVF_VALUE_CHARS, OVF_PCT_CHARS, OVF_MEMBER_CHARS = 0.73, 14, 11, 7, 12


# label-overlap (user 2026-10-12: 'sửa lại luật và bộ dò ko để nó đè số'): one data label ('45.000bn' at the default 9 pt) needs
# ~LABEL_PX; the category axis takes ~LABEL_AXIS_PX; categories of the known date columns
TITLE_BOX_MAX = 40   # title-padding: a textbox lower than this holds one line
TITLE_LINE = 1.5     # line height / font size (pt -> px x 4/3)
LABEL_PX = 52
LABEL_AXIS_PX = 50   # own name: AXIS_PX is the chart-width rule's
CATEGORY_COUNT = {'QuarterLabel': 4, 'Quarter': 4, 'QuarterNumber': 4, 'MonthNumber': 12, 'MonthName': 12, 'MonthLabel': 12,
                  'Month': 12, 'DayName': 7, 'WeekdayName': 7}
LABEL_CHARTS = {'clusteredColumnChart', 'columnChart', 'lineClusteredColumnComboChart', 'clusteredBarChart', 'barChart'}
SLICER_TEXT = '10D'  # slicer-style: the one item text size (Red default; mix_builder.SLICER_TEXT)
# (key, page) kept OUT of the sync group (user 2026-10-05): Legacy Monthly selects no month, so its month charts show the
# year; synced with the 'Current Month' pages it would inherit one month. mix_builder --filter-set reads this too.
# Department data, so it lives in config/pbi-gate.json key "filter_unsynced" (DW review 2026-10-05: a page name
# of one department does not belong in the shared tool). Read through filter_unsynced(folder).
# month-pin (user 2026-10-05): a synced month slicer holds 'Current Month' (the label rolls with the data); a fixed month
# ('09', saved by a Desktop Save on 04/10) froze six pages on September
MONTH_ROLLING = "'Current Month'"
# filter-set (mix_builder.FILTER_SET): (key, own field, accepted equivalents); location keys must be on every panel
FILTER_SET = [('Year', ['Dim_Date.IsCurrentYear'], [['Dim_Date.CurrentYearLabel']]),
              ('Month', ['Dim_Date.IsCurrentMonth'], [['Dim_Date.CurrentMonthLabel']]),
              ('AreaManager', ['Dim_Store.AreaManagerShortName'], [['Dim_Store.AreaManager']]),
              ('District', ['Dim_Store.District'], []), ('StoreName', ['Dim_Store.ShortName'], []),
              ('Channel', ['Dim_Channel.ChannelGroup', 'Dim_Channel.ChannelNameStandard'],
               [['Dim_Channel.ChannelType', 'Dim_Channel.ChannelName']])]
FILTER_ADD = ('AreaManager', 'District', 'StoreName', 'Channel')
FILTER_SKIP = {'MCP': ('Channel',), 'Power Consumption': ('Channel',)}      # P&L by store has no channel dimension (mix_builder.FILTER_SKIP)
PANEL_BOX = 40
# a legend over a fixed multi-value list (channel groups) is several series, like a time split (Daily channel x weekday)
MULTI_SPLIT = {'Dim_Channel.ChannelGroup', 'Dim_Channel.ChannelNameStandard', 'Dim_Channel.ChannelName',
               'Dim_Channel.ChannelType', 'Dim_Store.AreaManagerShortName', 'Dim_Store.StoreGroup'}
CHART_ONE_H = 330    # chart-size: a one-series chart takes at most HALF a tab (Promotion 'Sale of Promotion By Day' was 465) - 01/10
SCROLL_BIG = 1.5     # scroll-alone: content / frame from which a table's scrollbar counts as big
FILL_SLACK = 40      # narrow-table (user 14/10): content may stop at most this short of the frame (scroll bar + padding)
# header-wrap (user 14/10, E-Commerce / Conversion: Grow to fit lays every header on ONE line, a 300 px product name per
# column; the user's own widths broke them in two). A header wider than HEADER_WRAP on one line -> fixed widths, 2 lines.
HEADER_WRAP = 150    # px, one-line header text above which the column is cut to two lines
CELL_PAD = 20        # px, header cell padding + sort arrow room (the user's hand widths: half the text + 18..32)
VALUE_MIN = 70       # px, narrowest measure column (a 6-digit number + padding)
WRAP_MIN = 80        # px, inside a wrapped table every header wider than this goes to two lines (the user's 70 px 'Ớt độ 10gr/gói')
ROW_MIN = 400        # px, row-header column without a width yet: warehouse item names run to ~700 px, they wrap (user's own 404)
SCROLL_W = 20        # px, vertical scroll bar + border kept free when the columns are spread to the frame


def wrap_width(text, size, bold=False):
    """Narrowest width (px, no padding) at which `text` wraps to AT MOST TWO lines with every word whole (user 14/10:
    "lỗi số chữ của 2 dòng mà nhảy ra 3 dòng là ko dc ... ko có để 2 dòng mà xuống 1 có chữ" - half the text cut
    'MonthNumber' into 'Month / Numbe / r'): the best split between two words, never below the widest word."""
    words = str(text or '').split()
    if not words:
        return 0.0
    whole = w_text(' '.join(words), size, bold, False)
    if len(words) == 1:
        return whole
    best = min(max(w_text(' '.join(words[:k]), size, bold, False), w_text(' '.join(words[k:]), size, bold, False))
               for k in range(1, len(words)))
    return max(best, max(w_text(w, size, bold, False) for w in words))


def table_headers(d):
    """[(queryRef, header text, role)] of a table / matrix in column order: matrix Rows then Values, table Values.
    Header text = the projection displayName, else the field name. role 'row' | 'value'."""
    v = d.get('visual', {})
    qs = v.get('query', {}).get('queryState', {})
    out = []
    roles = (('Rows', 'row'), ('Values', 'value')) if v.get('visualType') == 'pivotTable' else (('Values', 'value'),)
    for r, role in roles:
        for p in qs.get(r, {}).get('projections', []):
            f = p.get('field', {})
            nm = p.get('displayName') or next((x.get('Property') for x in f.values() if isinstance(x, dict) and x.get('Property')), p.get('queryRef', ''))
            out.append((p.get('queryRef', ''), nm, role))
    return out


def header_font(d):
    pr = next((e.get('properties', {}) for e in d.get('visual', {}).get('objects', {}).get('columnHeaders', []) if 'selector' not in e), {})
    sz = lit(pr.get('fontSize', {}))
    return (float(sz[:-1]) if sz and sz.endswith('D') else 10.0), lit(pr.get('bold', {})) == 'true'


def column_plan(d):
    """The width rule of a table / matrix (shared by mix_builder --grow-to-fit and gates narrow-table + header-wrap).
    Returns None = Grow to fit (no header longer than HEADER_WRAP, or a matrix whose column headers come from the data),
    else {queryRef: width}: headers over WRAP_MIN on two lines, words whole (wrap_width) + CELL_PAD, shorter ones on one line, measures at
    least VALUE_MIN, the row header at its current width (or ROW_MIN), then spread over the frame when they stop short."""
    v = d.get('visual', {})
    if v.get('visualType') == 'pivotTable' and v.get('query', {}).get('queryState', {}).get('Columns', {}).get('projections'):
        return None
    size, bold = header_font(d)
    cols = table_headers(d)
    one = {q: w_text(h, size, bold, False) for q, h, _ in cols}
    if not any(w > HEADER_WRAP for w in one.values()):
        return None
    cur = {}
    for e in v.get('objects', {}).get('columnWidth', []):
        m = e.get('selector', {}).get('metadata')
        val = lit(e.get('properties', {}).get('value', {}))
        if m and val:
            cur[m] = float(val.rstrip('D'))
    plan = {}
    for q, h, role in cols:
        w = one[q]
        need = math.ceil(wrap_width(h, size, bold)) + CELL_PAD if w > WRAP_MIN else math.ceil(w) + CELL_PAD
        plan[q] = max(need, VALUE_MIN) if role == 'value' else max(need, cur.get(q, ROW_MIN))
    room = d.get('position', {}).get('width', 0) - SCROLL_W
    tot = sum(plan.values())
    if tot < room:
        plan = {q: w * room / tot for q, w in plan.items()}
    return {q: round(w, 1) for q, w in plan.items()}
# panel-label: reader captions accepted for a slicer field (normalised: letters/digits, lower case)
PANEL_ALIASES = [{'month', 'iscurrentmonth', 'monthnumber', 'monthname'},
                 {'areamanager', 'areamanagershortname', 'ams', 'am'},
                 {'channel', 'channelgroup', 'channelname', 'channelnamestandard', 'channeltype', 'channelname2'},
                 {'week', 'sortweektodate', 'auto5weeknearly', 'iscurrentweek', 'weekfridaystart', 'weeknum'},
                 {'storename', 'shortname', 'store'},
                 {'datepart', 'datepartsale'},
                 {'weekday', 'weekdaytype'},
                 {'displaygroup', 'group'},
                 {'year', 'iscurrentyear'},
                 {'salesrep', 'salesrepname', 'salesrepdisplayname', 'salesperson'},   # English captions
                 {'customer', 'customername', 'customerb2bname'},
                 {'date', 'datekey'}]
ROW_H, TABLE_HEAD_H = 20, 40
# rows a row field brings (upper bounds, warehouse 10/2026: 45 southern stores, ~250 items sold a month); unknown = 0
ROWS_N = {'ShortName': 45, 'StoreName': 45, 'ItemName': 250, 'ProgramName': 40, 'Day': 31, 'DayNameShort': 7,
          'Weekday Name': 7, 'WeekFridayStart': 53, 'HourStart': 17, 'MonthNumber': 12, 'DatePartSale': 5,
          'AreaManager': 5, 'AreaManagerShortName': 5, 'District': 15, 'StoreGroup': 4, 'MenuGroupLegacy': 12,
          'DisplayName': 27, 'Metric': 7, 'Label': 4, 'DateKey': 31}


def table_scroll_ratio(d, mm):
    """(wide, tall) content / frame of a pivot or table. Wide ignores a ~Recent filter: a measure filter on a matrix does
    NOT drop columns (user 01/10, Weekly 'Revenue by Store by Week' showed ~40 weeks under ~Recent 4 Weeks)."""
    vis = d.get('visual', {})
    if vis.get('visualType') not in ('pivotTable', 'tableEx'):
        return None
    q = vis.get('query', {}).get('queryState', {})
    w = d['position']['width'] or 1
    wide = 0.0
    cols = [pr['queryRef'].split('.', 1)[1] for pr in q.get('Columns', {}).get('projections', [])]
    known = [AXIS_N[c] for c in cols if c in AXIS_N]
    if known:
        nv = max(1, len(q.get('Values', {}).get('projections', [])))
        if any(lit(e.get('properties', {}).get('valuesOnRow', {})) == 'true' for e in vis.get('objects', {}).get('values', [])):
            nv = 1
        wide = (MATRIX_ROW_HDR + max(known) * nv * MATRIX_COL_W) / w
    else:
        t = table_overflow(d, mm)
        if t:
            wide = t[0] / w
    rows = [p['queryRef'].split('.', 1)[1] for p in q.get('Rows', {}).get('projections', [])] or \
           [p['queryRef'].split('.', 1)[1] for p in q.get('Values', {}).get('projections', [])
            if not p['queryRef'].startswith('#Measure.')]
    if vis['visualType'] == 'pivotTable' and 'expansionStates' not in json.dumps(vis):
        rows = rows[:1]                     # a pivot opens collapsed: only the first row level shows
    n = max([ROWS_N.get(r, 0) for r in rows] or [0])
    if vis['visualType'] == 'pivotTable' and any(lit(e.get('properties', {}).get('valuesOnRow', {})) == 'true'
                                                 for e in vis.get('objects', {}).get('values', [])):
        n = max(n, 1) * max(1, len(q.get('Values', {}).get('projections', [])))
    tall = (TABLE_HEAD_H + (n + 1) * ROW_H) / (d['position']['height'] or 1) if n else 0.0
    return wide, tall


def table_overflow(d, mm):
    """(need_px, frame_px, parts) for a pivot/table WITHOUT period columns (those are matrix_scroll's job)."""
    vis = d.get('visual', {})
    if vis.get('visualType') not in ('pivotTable', 'tableEx'):
        return None
    q = vis.get('query', {}).get('queryState', {})
    if q.get('Columns', {}).get('projections'):
        return None

    def pt(obj):
        for e in vis.get('objects', {}).get(obj, []):
            v = lit(e.get('properties', {}).get('fontSize', {}))
            if v:
                return float(str(v).rstrip('D'))
        return 10.0
    vpt, hpt = pt('values'), pt('columnHeaders')
    fixed = {}
    for e in vis.get('objects', {}).get('columnWidth', []):
        v, m = lit(e.get('properties', {}).get('value', {})), e.get('selector', {}).get('metadata')
        if v and m:
            fixed[m] = float(str(v).rstrip('D'))
    need, parts = 0.0, []
    rows = q.get('Rows', {}).get('projections', [])
    vals = q.get('Values', {}).get('projections', [])
    on_row = vis.get('visualType') == 'pivotTable' and any(
        lit(e.get('properties', {}).get('valuesOnRow', {})) == 'true' for e in vis.get('objects', {}).get('values', []))
    if on_row and vals:
        # valuesOnRow: the measure names become row captions, the values ONE column (Delivery total table,
        # 9 measures, was read as 9 columns = 856px > 290 on 29/09 - a false alarm)
        names = [len(p.get('displayName') or p['queryRef'].split('.', 1)[1]) for p in vals]
        hdr = max(names + ([len(rows[0].get('displayName') or rows[0]['queryRef'].split('.', 1)[1])] if rows else []))
        w1 = hdr * vpt * OVF_PX_PER_PT + 12 * len(rows) + OVF_PAD
        w2 = OVF_VALUE_CHARS * vpt * OVF_PX_PER_PT + OVF_PAD
        return int(w1 + w2), int(d['position']['width']), [int(w1), int(w2)]
    if rows:                                   # stepped row header = one column, indented per level;
        # its caption is the FIRST level's name only (a 19-char deeper field name gave a false alarm on 29/09)
        hdr = len(rows[0].get('displayName') or rows[0]['queryRef'].split('.', 1)[1])
        w = max(hdr * hpt, OVF_MEMBER_CHARS * vpt) * OVF_PX_PER_PT + 12 * (len(rows) - 1) + OVF_PAD
        # a row header the USER sized in Desktop is that wide (14/10, Daily 'Revenue by Day Part': Day Part 82 was read as 113)
        w = fixed.get(rows[0]['queryRef'], w)
        need += w
        parts.append(int(w))
    for p in q.get('Values', {}).get('projections', []):
        qr = p['queryRef']
        if qr in fixed:
            need += fixed[qr]
            parts.append(int(fixed[qr]))
            continue
        name = p.get('displayName') or qr.split('.', 1)[1]
        if qr.startswith('#Measure.') or 'Measure' in p.get('field', {}):
            fmt = (mm.get(qr.split('.', 1)[1]) or {}).get('fmt') or ''
            chars = OVF_PCT_CHARS if '%' in fmt else OVF_VALUE_CHARS
        else:
            chars = OVF_MEMBER_CHARS
        w = max(len(name) * hpt, chars * vpt) * OVF_PX_PER_PT + OVF_PAD
        need += w
        parts.append(int(w))
    return int(need), int(d['position']['width']), parts


def tab_labels(d):
    """Shown texts of a tab button (BT_Tab*), without its Selection name."""
    s = json.dumps(d.get('visual', {}).get('objects', {}), ensure_ascii=False)
    return [t for t in re.findall(r'"text": \{"expr": \{"Literal": \{"Value": "\'([^\']*)\'"', s) if not t.startswith('BT_')]


def page_meta(d_def):
    out = {}
    for f in glob.glob(os.path.join(d_def, 'pages', '*', 'page.json')):
        p = json.load(open(f, encoding='utf-8'))
        out[os.path.basename(os.path.dirname(f))] = p
    return out


def is_card(d):
    vt = d.get('visual', {}).get('visualType')
    return vt == 'cardVisual' or (vt == 'card' and str(sel_name(d) or '').startswith('Card_'))


GAP_WARN = []
MATRIX_WARN = []   # matrix-scroll: tables exempt with a reason in pbi-gate.json matrix_exempt
CFG_PATH = next((p for p in (os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', d, 'pbi-gate.json') for d in ('config', os.path.join('docs', 'hooks'))) if os.path.exists(p)),
                os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'config', 'pbi-gate.json'))  # config/ first; older repos: docs/hooks/


def twin_keys(cfg):
    """The IP and DR builds of one report share its settings (user 2026-09-28: the IP build is a copy of the DR one):
    every per-folder key <..>_DR_<Type> also answers for <..>_IP_<Type> and back, unless that key is set itself (the folder
    shape of 2026-10-19; the old <..>_<num>DR_<..> match no longer paired the new names - a department repo 19/10)."""
    for sect, v in list(cfg.items()):
        if isinstance(v, dict):
            for k in list(v):
                for a_, b_ in (('DR', 'IP'), ('IP', 'DR')):
                    t = re.sub(r'_%s_(Legacy|Classic|White|Red)$' % a_, r'_%s_\1' % b_, k)
                    if t != k and t not in v:
                        v[t] = v[k]
    return cfg


def gate_cfg():
    try:
        return twin_keys(json.load(open(CFG_PATH, encoding='utf-8')))
    except Exception:
        return {}


def filter_unsynced(folder):
    """{(filter key, page name)} kept OUT of the FilterSet sync group for this report (pbi-gate.json 'filter_unsynced':
    {"<folder>": [["Month", "Monthly"]]}) - e.g. Legacy Monthly selects no month, so its month charts show the year."""
    return {tuple(x) for x in gate_cfg().get('filter_unsynced', {}).get(folder, [])}


def filter_skip(folder, page):
    """Location keys a page of this report does not take (pbi-gate.json 'filter_skip': {"<folder>": {"<page name>":
    {"keys": [...], "reason": "..."}}}) - added in a department repo 2026-10-07: FILTER_SKIP above is one department's store model; another
    page about sales reps / channels has no Dim_Channel and no store meaning. Department data, so it lives in the json."""
    ent = gate_cfg().get('filter_skip', {}).get(folder, {}).get(page) or {}
    return set(ent.get('keys', [])) if isinstance(ent, dict) else set()


def known_gaps(folder):
    """Pages whose missing Legacy visuals are BLOCKED by the warehouse, declared with a reason
    in config/pbi-gate.json -> they warn instead of fail. Any other page still fails."""
    return gate_cfg().get('known_gaps', {}).get(folder, {})


DIAG_WARN = []
DEPT_CODES = tuple(region_value(os.path.dirname(os.path.abspath(__file__)), 'dept_codes', []) or ('__no_region__',))  # the region's department codes
GENERIC_PAGE_RX = re.compile(r'^(ph[oò]ng\b.*|page \d+|trang \d+|report|dashboard|(%s)( report| dashboard)?)$'
                             % '|'.join(c.lower() for c in DEPT_CODES), re.I)


def model_measures(report_dir):
    """name -> {'fmt': formatString, 'wraps': the measure it only re-exposes (`= [X]`) or None}."""
    out = {}
    for f in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        cur = None
        for line in open(f, encoding='utf-8'):
            line = line.rstrip('\r\n')
            m = re.match(r"^\tmeasure\s+('(?:[^']|'')+'|\S+)\s*=\s*(.*)$", line)
            if m:
                cur = m.group(1).strip("'").replace("''", "'")
                w = re.match(r"^\[([^\]]+)\]\s*$", m.group(2).strip())
                out[cur] = {'fmt': None, 'wraps': w.group(1) if w else None}
                continue
            m = re.match(r"^\t\tformatString:\s*(.*)$", line)
            if m and cur:
                out[cur]['fmt'] = m.group(1)
            elif re.match(r"^\t\S", line):
                cur = None
    return out


def measures_in(o, acc=None):
    acc = set() if acc is None else acc
    if isinstance(o, dict):
        if isinstance(o.get('Measure'), dict) and 'Property' in o['Measure']:
            acc.add(o['Measure']['Property'])
        for v in o.values():
            measures_in(v, acc)
    elif isinstance(o, list):
        for v in o:
            measures_in(v, acc)
    return acc


def hexes_in(o):
    return {h.upper() for h in re.findall(r"#[0-9A-Fa-f]{6}", json.dumps(o))}


SHARE_RE = re.compile(r'\bof (Revenue|Total|Sales?)\b|\bShare\b|\bMix\b', re.I)


def check_pct_decided(report_dir, folder, pages, visible, vis, fail):
    """pct-decided (a department repo 13/10, user: "lỗi % đang ko có màu xanh đỏ đúng chuẩn lên xuống ... phải có trong skill và cổng"):
    a '% ... of Revenue / of Total' measure is EITHER a share (no direction, pct_neutral) OR a margin (up/down, threshold)
    - the name cannot tell (03 White: %Actual of Revenue = share of a P&L line, coloured green on every cost line;
    %Ebitda of Revenue2 = margin, its chart labels uncoloured). Every such measure shown must be declared one or the other
    (pbi-gate.json pct_neutral / mix_specs.PALETTE pct_threshold); a declared margin on a chart Y2 must have its label colour rule."""
    neutral = gate_cfg().get('pct_neutral', {}).get(folder, {})
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from mix_specs import PALETTE
        thr = PALETTE.get('pct_threshold', {})
    except Exception:
        thr = {}
    seen = set()
    for (pg, i), d in vis.items():
        if pg not in visible or d.get('isHidden'):
            continue
        v = d.get('visual', {})
        for role, r in v.get('query', {}).get('queryState', {}).items():
            for p in r.get('projections', []):
                m = p.get('field', {}).get('Measure', {}).get('Property', '')
                if not m.startswith('%') or not SHARE_RE.search(m) or m in neutral or m in thr or m in seen:
                    continue
                seen.add(m)
                fail.append("%% measure %s ('%s', page '%s') reads like a share or a margin - declare it: share -> pbi-gate.json "
                            "pct_neutral (no colour), margin -> mix_specs.PALETTE pct_threshold (up/down) (pct-decided)"
                            % (ascii(m), p.get('displayName') or m, pages[pg]['displayName']))
        if 'Chart' in str(v.get('visualType')):
            labs = v.get('objects', {}).get('labels', [])
            for p in v.get('query', {}).get('queryState', {}).get('Y2', {}).get('projections', []):
                m = p.get('field', {}).get('Measure', {}).get('Property', '')
                if m in thr and not any(e.get('selector', {}).get('metadata', '').endswith('.' + m) and 'color' in e.get('properties', {})
                                        for e in labs):
                    fail.append("chart %s: the %% line %s has no up/down label colour (mix_palette.py) (pct-decided)"
                                % (ascii(sel_name(d) or d['name']), ascii(m)))


# glossary-cover (user 13/10: "cái nút grossary ở mỗi trang có cổng kiểm là phải chú thích đủ cho mọi từ xuất hiện trong
# dashboard trong trang đó chưa?"): every word a reader sees on a page - card, chart and table titles, column / axis /
# legend names, slicer fields, the text values a measure prints (STAR, HORSE ...) - is named in that page's Glossary,
# unless it is an everyday dashboard word below. Plural 's' and case are folded; an acronym must appear as written.
GLOSSARY_COMMON = set('''
a an and or of on in to by vs per with from for the at as all no not is be this that each every than
store stores month months year years day days week weeks date hour hours time period weekday weekend
revenue sale sales selling sold target total top bottom best bad worst high low new old last current this next
product products item items name names quantity amount price value values count number average share rate
channel channels district area manager region group category code line lines detail details actual compare change
growth grow trend list overview summary report month year previous base before after up down left right
daily weekly monthly yearly over
'''.split())
INTERNAL_TITLE = re.compile(r'^(Card|Slicer|Text|BG|BT|Chart|Pct|Icon|Line)_')


def common_word(w):
    lw = w.lower()
    return lw in GLOSSARY_COMMON or (lw.endswith('s') and lw[:-1] in GLOSSARY_COMMON) or \
        (lw.endswith('ies') and lw[:-3] + 'y' in GLOSSARY_COMMON)


def words_of(s):
    out = []
    for tok in re.findall(r'[A-Za-z][A-Za-z0-9]*', s or ''):
        if tok in TITLE_ACRO:                           # MoM, WoW stay whole
            out.append(tok)
            continue
        # StoreName -> Store Name; COGS LT stays; ADS stays
        out += re.findall(r'[A-Z]{2,}(?=[A-Z][a-z]|\b|[0-9])|[A-Z]?[a-z]+|[A-Z]+|[0-9]+', tok) if not tok.isupper() else [tok]
    return [w for w in out if not w.isdigit()]


def switch_case_spans(s):
    """(start, end) of every case-value argument of each SWITCH in a DAX text: SWITCH(expr, v1, r1, v2, r2 [, else]) -
    v1, v2 ... are compared, r1, r2 ... and else are returned. Strings and nested brackets are skipped while splitting."""
    out = []
    for m in re.finditer(r'(?i)\bSWITCH\s*\(', s):
        args, depth, start, i, q = [], 1, m.end(), m.end(), False
        while i < len(s) and depth:
            c = s[i]
            if q:
                if c == '"' and s[i + 1:i + 2] == '"':
                    i += 1                              # "" is a quote inside the string
                elif c == '"':
                    q = False
            elif c == '"':
                q = True
            elif c in '([{':
                depth += 1
            elif c in ')]}':
                depth -= 1
                if not depth:
                    args.append((start, i))
            elif c == ',' and depth == 1:
                args.append((start, i))
                start = i + 1
            i += 1
        n_pairs = (len(args) - 1) // 2
        out += [args[1 + 2 * k] for k in range(n_pairs)]
    return out


def printed(s):
    """Upper-case text literals a DAX measure RETURNS (after '(' or ','), not the ones it compares: = "APP", or a SWITCH
    case value - SWITCH(x, "ROYALTY", [NetRevenueFR]) prints the measure, not the word (a department repo 20/10)."""
    cases = switch_case_spans(s)
    return {m.group(1) for m in re.finditer(r'"([A-Z]{3,})"', s) if s[:m.start()].rstrip()[-1:] in ('(', ',')
            and not any(a <= m.start() and m.end() <= b and s[a:b].strip() == m.group(0) for a, b in cases)}


def measure_text_values(report_dir):
    """measure -> the upper-case text values its DAX can print ("STAR", "HIGH" ...): what the reader sees in its cells."""
    body, cur = {}, None                            # the whole DAX of each measure: a SWITCH spans lines
    for f in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        for line in open(f, encoding='utf-8'):
            line = line.rstrip('\r\n')
            m = re.match(r"^\tmeasure\s+('(?:[^']|'')+'|\S+)\s*=(.*)$", line)
            if m:
                cur = m.group(1).strip("'").replace("''", "'")
                body[cur] = m.group(2)
            elif cur and (line.startswith('\t\t') or not line.strip()) and not re.match(r'^\t\t[a-zA-Z]+:', line):
                body[cur] += '\n' + line
            elif re.match(r'^\t\S', line) or re.match(r'^\t\t[a-zA-Z]+:', line):
                cur = None
    out = {k: printed(v) for k, v in body.items()}
    return {k: v for k, v in out.items() if v}


# acronym-origin (user 13/10: "từ viết tắt phải tra ra từ nguyên gốc và viết vào chứ, cái này cũng phải có cổng kiểm"): every
# acronym the Glossary uses or the page shows is written out in the Glossary as 'ACR (Origin ...'. The origin is LOOKED UP, with
# its source - a new acronym is added here only after it is found in one of them:
#   [BG] the region's business glossary   [LD] the legacy system's dictionary
#   [DW] the region manager's lineage / structure docs  [REPO] the department repo (docs, DAX)  [F&B] restaurant-industry standard, no
#   company source yet (TA, GA, ADS - told to the user 13/10)  [VN] a Vietnamese abbreviation of this company
ACRONYM_ORIGIN = dict(region_value(os.path.dirname(os.path.abspath(__file__)), 'acronym_origin', {}) or {})  # the region's acronyms and their origins

# upper-case words that are not acronyms: class labels, code / table names quoted in a sentence
NOT_ACRONYM = {'STAR', 'HORSE', 'CHALLENGE', 'DOG', 'HIGH', 'LOW', 'PROFIT', 'DATA', 'WAREHOUSE', 'DB', 'Q1', 'Q2', 'Q3', 'Q4'}
NOT_ACRONYM |= set(region_value(os.path.dirname(os.path.abspath(__file__)), 'not_acronyms', []))  # the region's own words
MIXED_ACRONYM = {'WoW', 'MoM', 'Ebitda', 'L4L', 'B2B', 'B2C'}


def acronyms_in(s):
    out = set()
    for tok in re.findall(r'[A-Za-z][A-Za-z0-9]*', s or ''):
        if tok in MIXED_ACRONYM or (tok.isupper() and len(tok) > 1 and tok not in NOT_ACRONYM
                                    and sum(c.isalpha() for c in tok) > 1):
            out.add('EBITDA' if tok.lower() == 'ebitda' else tok)
    return out


def acronym_written_out(acr, text):
    o = ACRONYM_ORIGIN.get(acr)
    pat = r'Ebitda|EBITDA' if acr == 'EBITDA' else re.escape(acr)
    return bool(o) and bool(re.search(r'(?<![A-Za-z])(?:%s)\s*\(\s*%s' % (pat, re.escape(o)), text, re.I))


# glossary-one-def (user 14/10: "mỗi 1 định nghĩa phải xuống dòng chứ ko có dính chùm ntn"): one bullet of the Glossary holds
# ONE definition - 'TC (Transaction Count): ...' or 'TA = ...'. A definition is a sentence that opens with a term (up to ~60
# characters, its origin in brackets allowed) and then ': ' or ' = '; '06:00' (a colon before a digit) is not one.
DEF_START = re.compile(r'^\s*(?:%\s*)?[A-Za-z"][^:=.]{0,60}?(?::\s|\s=\s)')


def glossary_sentences(b):
    """A bullet cut into sentences at '. ' followed by a capital, a digit, '%' or a quote."""
    return [s for s in re.split(r'(?<=\.)\s+(?=[A-Z0-9%"À-Ỹ])', b.strip()) if s]


def split_definitions(b):
    """One bullet -> bullets of one definition each; a sentence that is not a definition stays with the one before it."""
    out = []
    for s in glossary_sentences(b):
        if out and DEF_START.match(s):
            out.append(s)
        elif out:
            out[-1] += ' ' + s
        else:
            out.append(s)
    return out


def check_glossary_cover(report_dir, pages, visible, vis, fail):
    texts = measure_text_values(report_dir)
    dd = glob.glob(os.path.join(report_dir, '*.Report', 'definition'))
    per_item = item_measures(dd[0]) if dd else set()
    for pg in visible:
        gl = ' '.join(r.get('value', '') for (p2, i), d in vis.items() if p2 == pg and sel_name(d) == 'Text_Glossary'
                      for par in d['visual'].get('objects', {}).get('general', [{}])[0].get('properties', {}).get('paragraphs', [])
                      for r in par.get('textRuns', []))
        if not gl:
            continue
        seen = {}                                       # word -> where the reader meets it
        panels = {i for (p2, i), d in vis.items() if p2 == pg and 'visualGroup' in d
                  and any(sel_name(x) == 'BG_FilterPanel' for (p3, k), x in vis.items() if p3 == pg and x.get('parentGroupName') == i)}
        for (p2, i), d in vis.items():
            v = d.get('visual', {})
            vt = v.get('visualType', '')
            if p2 != pg or not vt:
                continue
            if vt == 'shape' and d.get('parentGroupName') in panels and d['position']['height'] == 20:
                lab = (lit(((v.get('visualContainerObjects', {}).get('title') or [{}])[0].get('properties', {})).get('text', {})) or '').strip("'")
                for w in words_of(lab):                 # the label over a slicer is what the reader reads
                    if not common_word(w):
                        seen.setdefault(w, lab)
                continue
            if vt in ('textbox', 'shape', 'image', 'actionButton', 'slicer'):
                continue
            if vt == 'card' and lit((v.get('objects', {}).get('categoryLabels') or [{}])[0].get('properties', {}).get('show', {})) == 'false':
                continue                                # a Pct_ line under a KPI tile shows its number only
            where = []
            tp = (v.get('visualContainerObjects', {}).get('title') or [{}])[0].get('properties', {})
            t = lit(tp.get('text', {})) if 'Literal' in json.dumps(tp.get('text', {})) else ''
            t = (t or '').strip("'")
            if t and not INTERNAL_TITLE.match(t) and lit(tp.get('show', {})) != 'false':
                where.append(t)
            for r_ in v.get('query', {}).get('queryState', {}).values():
                for p_ in r_.get('projections', []):
                    if p_.get('hidden') or 'NativeVisualCalculation' in p_.get('field', {}):
                        continue
                    if p_.get('field', {}).get('Measure', {}).get('Property') in per_item:
                        continue                        # a one-item measure's header is the item's name: data (user 18/10)
                    nm = p_.get('displayName') or p_.get('nativeQueryRef') or p_.get('queryRef', '').split('.')[-1]
                    if not nm.startswith('Divide('):
                        where.append(nm)
                    ms = p_.get('field', {}).get('Measure', {}).get('Property')
                    where += sorted(texts.get(ms, ()))
            for s in where:
                for w in words_of(s):
                    if not common_word(w):
                        seen.setdefault(w, s)
        miss = []
        for w, s in seen.items():
            lw = w.lower()
            if (w.isupper() and len(w) > 1) or w in TITLE_ACRO:
                ok = re.search(r'(?<![A-Za-z])%s(?![a-z])' % re.escape(w), gl)
            else:
                stem = re.escape(w[:-3] + 'y' if lw.endswith('ies') else w[:-1] if lw.endswith('s') and len(w) > 3 else w)
                ok = re.search(r'(?<![A-Za-z])%s' % stem, gl, re.I)
            if not ok:
                miss.append('%s (%s)' % (w, s) if w != s else w)
        if miss:
            fail.append("page '%s': the Glossary does not name %d word(s) the reader sees: %s - add them to the page's "
                        "Glossary (glossary-cover)" % (pages[pg]['displayName'], len(miss), ', '.join(sorted(miss, key=str.lower))))
        bullets = ' '.join(r.get('value', '') for (p2, i), d in vis.items() if p2 == pg and sel_name(d) == 'Text_Glossary'
                           for par in d['visual'].get('objects', {}).get('general', [{}])[0].get('properties', {}).get('paragraphs', [])
                           if par.get('listType') == 'bullet' for r in par.get('textRuns', []))
        chained = [b for (p2, i), d in vis.items() if p2 == pg and sel_name(d) == 'Text_Glossary'
                   for par in d['visual'].get('objects', {}).get('general', [{}])[0].get('properties', {}).get('paragraphs', [])
                   if par.get('listType') == 'bullet'
                   for b in [''.join(r.get('value', '') for r in par.get('textRuns', []))] if len(split_definitions(b)) > 1]
        if chained:
            fail.append("page '%s': %d Glossary line(s) chain several definitions, e.g. '%s' - one definition per line "
                        "(glossary-one-def)" % (pages[pg]['displayName'], len(chained), chained[0][:80]))
        acrs = acronyms_in(bullets).union(*(acronyms_in(w) for w in seen))
        unknown = sorted(a for a in acrs if a not in ACRONYM_ORIGIN)
        bare = sorted(a for a in acrs if a in ACRONYM_ORIGIN and not acronym_written_out(a, gl))
        if unknown:
            fail.append("page '%s': acronym(s) %s have no looked-up origin - find it (the region's business glossary, the legacy dictionary, "
                        "the warehouse docs) and add it to ACRONYM_ORIGIN with its source (acronym-origin)"
                        % (pages[pg]['displayName'], ', '.join(unknown)))
        if bare:
            fail.append("page '%s': the Glossary uses %s without writing them out - write 'TC (Transaction Count): ...' "
                        "(acronym-origin)" % (pages[pg]['displayName'], ', '.join(bare)))


TITLE_ROW = 20        # a 12D visual title takes ~20 units above the content


def check_button_over_table(pages, visible, vis, fail):
    """button-over-table (user 14/10, Daily & Hourly tab Chi tiet: "nút ở đây bị lỗi, bị đè lên matrix"): view-switch buttons
    (BT_) laid over a table / matrix sit in its title row; a button taller than that row covers the column headers. The table
    keeps its frame and gets visualContainerObjects.padding.top >= button bottom - table top - title row."""
    def absr(pg, d):
        x = y = 0; cur = d
        while cur:
            x += cur['position']['x']; y += cur['position']['y']
            cur = vis.get((pg, cur.get('parentGroupName'))) if cur.get('parentGroupName') else None
        return x, y, d['position']['width'], d['position']['height']
    for (pg, i), t in vis.items():
        tv = t.get('visual', {})
        if pg not in visible or tv.get('visualType') not in ('pivotTable', 'tableEx'):
            continue
        tx, ty, tw, th = absr(pg, t)
        title = TITLE_ROW if title_shown(t) else 0
        pad = lit((tv.get('visualContainerObjects', {}).get('padding') or [{}])[0].get('properties', {}).get('top', {}))
        pad = float(str(pad).rstrip('DL')) if pad not in (None, '') else 0
        for (p2, k), b in vis.items():
            if p2 != pg or b.get('parentGroupName') != t.get('parentGroupName') or not str(sel_name(b) or '').startswith('BT_'):
                continue
            bx, by, bw, bh = absr(pg, b)
            if bx < tx + tw and bx + bw > tx and by < ty + th and by + bh > ty:
                need = by + bh - ty - title
                if need > pad:
                    fail.append("page '%s': button %s covers the column headers of table %s (%g units below its title row, top "
                                "padding %g) - padding.top >= %g (button-over-table)"
                                % (pages[pg]['displayName'], sel_name(b), sel_name(t) or i, need, pad, need))
                    break


AXIS_CAP_CHARTS = ('columnChart', 'clusteredColumnChart', 'stackedColumnChart', 'hundredPercentStackedColumnChart')


def check_axis_cap(pages, visible, vis, fail):
    """axis-cap (user 13/10, Product Mix: "điểm đáy của mấy cái cột đang ko đều nhau so với các chart khác, phải nhìn đều
    nhau hết chứ"): the axis labels under a column chart wrap to as many lines as its longest name, so two charts of one
    row stand their columns at different heights. Column charts of one row whose axis is text (items, stores - not dates)
    cap the label area at the SAME categoryAxis.maxMarginFactor; the render check is pbi_pixel 'baseline'."""
    def top(pg, d):
        y, cur = 0, d
        while cur:
            y += cur['position']['y']
            cur = vis.get((pg, cur.get('parentGroupName'))) if cur.get('parentGroupName') else None
        return round(y)
    rows = {}
    for (pg, i), d in vis.items():
        v = d.get('visual', {})
        if pg not in visible or v.get('visualType') not in AXIS_CAP_CHARTS:
            continue
        cat = v.get('query', {}).get('queryState', {}).get('Category', {}).get('projections', [])
        if not cat or any(p['queryRef'].startswith(('Dim_Date.', 'Parameter_Date.')) for p in cat):
            continue
        par = vis.get((pg, d.get('parentGroupName')), d)
        key = (pg, top(pg, par), round(par['position']['height']), d.get('isHidden', False))
        cap = lit((v.get('objects', {}).get('categoryAxis') or [{}])[0].get('properties', {}).get('maxMarginFactor', {}))
        rows.setdefault(key, []).append((sel_name(d) or i, cap))
    for (pg, y, h, _), lst in rows.items():
        if len(lst) > 1 and (len({c for _, c in lst}) > 1 or None in {c for _, c in lst}):
            fail.append("page '%s' row at y %d: column charts %s cap their axis labels differently - one "
                        "categoryAxis.maxMarginFactor for the row so the columns stand on one line (axis-cap)"
                        % (pages[pg]['displayName'], y, ', '.join('%s=%s' % (n, c or 'auto') for n, c in lst)))


def check_compare_slicers(pages, visible, vis, fail):
    """compare-month + slicer-unique (a department repo 13/10, user: "filter 2 cái select year thì sao chọn má? cái này nó là từ year
    tới year đúng ko" -> "phải ghi lại tên làm hiểu sai ... thêm cổng dò"): ONE comparison month is ONE slicer on
    Parameter_Date[Year Month] labelled 'Compare With' - a Year + a Month slicer read as a range; and two slicers of one
    page never filter columns of the same name (Year / Year, Month / Month: the reader cannot tell them apart)."""
    by = {}
    for (pg, i), d in vis.items():
        if pg in visible and d.get('visual', {}).get('visualType') == 'slicer':
            p = d['visual'].get('query', {}).get('queryState', {}).get('Values', {}).get('projections', [{}])[0]
            by.setdefault(pg, []).append((p.get('queryRef', ''), sel_name(d) or i, p.get('displayName') or p.get('queryRef', '')))
    for pg, lst in by.items():
        refs = [q for q, _, _ in lst]
        names = [n for _, _, n in lst]
        for n in sorted({n for n in names if names.count(n) > 1}):
            fail.append("page '%s': %d slicers read the same name '%s' - each one filters its own visuals, so name it after them "
                        "(Month A / Month B ...) (slicer-unique)" % (pages[pg]['displayName'], names.count(n), n))
        if 'Parameter_Date.Year' in refs and 'Parameter_Date.Month' in refs:
            fail.append("page '%s': the comparison month is split into a Year and a Month slicer (reads as 'from .. to ..') - "
                        "one slicer on Parameter_Date[Year Month] labelled 'Compare With' (compare-month)" % pages[pg]['displayName'])
        seen = {}
        for q, n, _ in lst:
            seen.setdefault(q.split('.')[-1].lower(), []).append(q)
        for k, qs in seen.items():
            if len(set(qs)) > 1:
                fail.append("page '%s': slicers on %s all read '%s' - the reader cannot tell them apart; merge them or give each its "
                            "own meaning (slicer-unique)" % (pages[pg]['displayName'], ', '.join(sorted(set(qs))), k))


def check_pct(report_dir, folder, pages, visible, vis, fail):
    """pct-period + pct-color (pbi-white 4j)."""
    mm = model_measures(report_dir)
    cfg = gate_cfg()
    neutral = cfg.get('pct_neutral', {}).get(folder, {})
    pending = cfg.get('pct_pending', {}).get(folder, {})

    def is_pct(m):
        return '%' in (mm.get(m, {}).get('fmt') or '')

    def fam(m):
        return {m, mm.get(m, {}).get('wraps')} - {None}
    for (pg, i), d in vis.items():
        if pg not in visible or 'visual' not in d:
            continue
        vt = d['visual'].get('visualType')
        nm = str(sel_name(d) or i)
        where = "page '%s' %s" % (pages[pg]['displayName'], nm)
        shown = [m for m in measures_in(d['visual'].get('query', {})) if is_pct(m)]
        if not shown:
            continue
        o = d['visual'].get('objects', {})
        todo = [m for m in shown if not (fam(m) & set(neutral))]
        if vt == 'card' and nm.startswith('Pct_'):
            for m in todo:          # a neutral share has no period to name
                if not re.search(r'"[^"]+"', mm.get(m, {}).get('fmt') or ''):
                    fail.append('%s: the %% line shows %s bare (format %s) - it does not say which PERIOD it '
                                'compares; use a wrapper measure formatted +0.00%% "MoM"'
                                % (where, m, mm.get(m, {}).get('fmt')))
        if vt == 'card':
            col = [e.get('properties', {}).get('color') for e in o.get('labels', [])]
        elif vt == 'cardVisual':
            col = [e.get('properties', {}).get('fontColor') for e in o.get('value', [])]
        elif vt in ('pivotTable', 'tableEx'):
            # only conditional TEXT colour is checked; conditional background tints wait for the user (4j)
            col = [e.get('properties', {}).get('fontColor') for e in o.get('values', [])
                   if 'Conditional' in json.dumps(e.get('properties', {}).get('fontColor', {}))]
        else:
            col = [e.get('properties', {}).get('color') for e in o.get('labels', [])
                   if 'Conditional' in json.dumps(e.get('properties', {}).get('color', {}))]
        col = [c for c in col if c]
        if not todo or (vt not in ('card', 'cardVisual') and not col):
            continue
        cond = [c for c in col if 'Conditional' in json.dumps(c)]
        if vt == 'cardVisual' and not cond and d.get('parentGroupName') and any(
                x.get('parentGroupName') == d['parentGroupName'] and str(sel_name(x) or '').startswith('Pct_')
                for (pg2, _), x in vis.items() if pg2 == pg):
            # user 2026-09-29 ("ko dc màu đỏ"): a card VALUE takes the colour template (4k); its Pct_ line carries direction
            continue
        if vt in ('card', 'cardVisual') and not cond:
            fail.append('%s: %% (%s) has ONE fixed colour - colour it by direction, up #007A36 / down #C51E24'
                        % (where, ', '.join(todo)))
            continue
        allowed = {PCT_UP, PCT_DOWN} | ({'#2D2D2D'} if vt in ('pivotTable', 'tableEx') else set())
        if 'Chart' in vt:
            allowed |= {PCT_UP_ON_BARS}   # % labels over dark Theme1 columns (user 01/10); text on white keeps PCT_UP
        for c in cond:
            extra = hexes_in(c) - allowed
            if extra:
                why = pending.get(i) or pending.get(nm)
                if why:
                    DIAG_WARN.append('%s: colour %s waits for the user - %s' % (where, ', '.join(sorted(extra)), why))
                else:
                    fail.append('%s: %% colour %s is outside the pair up #007A36 / down #C51E24'
                                % (where, ', '.join(sorted(extra))))
            if vt in ('card', 'cardVisual'):
                used = measures_in(c)
                ok = set().union(*[fam(m) for m in todo])
                if used and not used <= ok:
                    fail.append('%s: shows %s but is coloured by %s - colour it by THAT measure'
                                % (where, ', '.join(todo), ', '.join(sorted(used))))


def check_card_row(pages, visible, vis, fail):
    """card-row: the Card group holds card tiles only (pbi-white 4i)."""
    kids = {}
    for (pg, i), d in vis.items():
        if d.get('parentGroupName'):
            kids.setdefault((pg, d['parentGroupName']), []).append(i)
    for (pg, i), d in vis.items():
        if pg not in visible or 'visualGroup' not in d or str(sel_name(d) or '') != 'Card':
            continue
        st = list(kids.get((pg, i), []))
        while st:
            k = st.pop()
            v = vis[(pg, k)]
            if 'visualGroup' in v:
                st.extend(kids.get((pg, k), []))
                continue
            vt = v.get('visual', {}).get('visualType')
            nm = str(sel_name(v) or k)
            if vt in ('cardVisual', 'card') or (vt == 'shape' and nm.startswith('BG_')):
                continue
            # the card's own icon (user 2026-10-01): Image_<Key> beside its Card_<Key> in the same tile group
            if vt == 'image' and nm.startswith('Image_') and any(
                    str(sel_name(x) or '') == 'Card_' + nm[6:] and x.get('parentGroupName') == v.get('parentGroupName')
                    for (pg2, _), x in vis.items() if pg2 == pg):
                continue
            fail.append("page '%s': the card row holds %s (%s) - the card row holds cards only; "
                        "drop it and declare it in dropped_visuals" % (pages[pg]['displayName'], nm, vt))


def check_diagram(report_dir, strict, fail):
    """diagram (pbip 1c): every table has a node, no overlap, 20px grid, <= 13 columns, #Measure alone in the last column."""
    out = fail if strict else DIAG_WARN
    sm = glob.glob(os.path.join(report_dir, '*.SemanticModel'))
    if not sm:
        return
    tables = []
    for f in glob.glob(os.path.join(sm[0], 'definition', 'tables', '*.tmdl')):
        first = open(f, encoding='utf-8').readline()
        m = re.match(r"^table\s+('(?:[^']|'')+'|\S+)", first)
        if m:
            tables.append(m.group(1).strip("'").replace("''", "'"))
    try:
        dg = json.load(open(os.path.join(sm[0], 'diagramLayout.json'), encoding='utf-8'))['diagrams'][0]
    except Exception:
        out.append('model diagram: diagramLayout.json cannot be read')
        return
    nodes = {n['nodeIndex']: n for n in dg.get('nodes', [])}
    miss = [t for t in tables if t not in nodes]
    if miss:
        out.append('model diagram misses %d/%d tables: %s' % (len(miss), len(tables), ', '.join(sorted(miss))))
    ns = [n for n in nodes.values() if n['nodeIndex'] in tables]
    if not ns:
        return
    x0 = min(n['location']['x'] for n in ns)
    y0 = min(n['location']['y'] for n in ns)
    off = [n['nodeIndex'] for n in ns if (n['location']['x'] - x0) % 20 or (n['location']['y'] - y0) % 20]
    if off:
        out.append('model diagram: %d tables off the 20px grid: %s' % (len(off), ', '.join(sorted(off))))
    for a in ns:
        for b in ns:
            if a['nodeIndex'] < b['nodeIndex']:
                ax, ay, bx, by = a['location']['x'], a['location']['y'], b['location']['x'], b['location']['y']
                if ax < bx + b['size']['width'] and bx < ax + a['size']['width'] and \
                        ay < by + b['size']['height'] and by < ay + a['size']['height']:
                    out.append('model diagram: %s overlaps %s' % (a['nodeIndex'], b['nodeIndex']))
    # user 2026-09-27: at most 8 columns, raised to 9 on 2026-09-28; #Measure alone in the last column, full length
    body = [n for n in ns if n['nodeIndex'] != '#Measure']
    cols = sorted({n['location']['x'] for n in body})
    if len(cols) > 13:   # was 9: a store model has 13 sales facts
        out.append('model diagram: %d columns - at most 13 (the diagram must fit one screen)' % len(cols))
    m = next((n for n in ns if n['nodeIndex'] == '#Measure'), None)
    if m and body:
        top = min(n['location']['y'] for n in ns)
        bot = max(n['location']['y'] + n['size']['height'] for n in body)
        if m['location']['x'] <= max(cols):
            out.append('model diagram: #Measure must stand alone in the column right of all other tables')
        if m['location']['y'] > top or m['location']['y'] + m['size']['height'] < bot - 20:
            out.append('model diagram: #Measure must run the whole height of the diagram (%s..%s)' % (top, bot))


def check_clear_filter(d_def, vis, fail):
    """clear-filter (user 2026-09-27, Ori template): every filter panel keeps the refresh button BT_ClearFilter at
    (240, 20) 40x40, linked to a bookmark that captures DATA and covers every slicer of the panel. Any tier - the
    every department's files are checked."""
    pages = page_meta(d_def)
    bms = {}
    for f in glob.glob(os.path.join(d_def, 'bookmarks', '*.bookmark.json')):
        b = json.load(open(f, encoding='utf-8'))
        bms[b['name']] = b
    for (pg, i), d in vis.items():
        if sel_name(d) != 'Filter_Panel' or pages.get(pg, {}).get('visibility') == 'HiddenInViewMode':
            continue
        pn = pages.get(pg, {}).get('displayName', pg)
        kids = {k: v for (p2, k), v in vis.items() if p2 == pg and v.get('parentGroupName') == i}
        btn = next((v for v in kids.values() if sel_name(v) == 'BT_ClearFilter'), None)
        if not btn:
            fail.append("page '%s': filter panel has no refresh button BT_ClearFilter (Ori: image refresh_2_white at "
                        "240,20 40x40 -> bookmark <Page>_ClearFilter) - mix_builder --clear-filter" % pn)
            continue
        pos = btn['position']
        if (pos['x'], pos['y'], pos['width'], pos['height']) != (240, 20, 40, 40):
            fail.append("page '%s': BT_ClearFilter at %s,%s %sx%s - Ori puts it at 240,20 40x40"
                        % (pn, pos['x'], pos['y'], pos['width'], pos['height']))
        lk = (btn['visual'].get('visualContainerObjects', {}).get('visualLink') or [{}])[0].get('properties', {})
        b = bms.get(lit(lk.get('bookmark', {})) or '')
        if lit(lk.get('type', {})) != 'Bookmark' or not b:
            fail.append("page '%s': BT_ClearFilter is not linked to an existing bookmark" % pn)
            continue
        o = b.get('options', {})
        if o.get('suppressData'):
            fail.append("page '%s': bookmark %s has Data off - the refresh button would not clear the slicers"
                        % (pn, b['displayName']))
        sl = {k for k, v in kids.items() if v.get('visual', {}).get('visualType') == 'slicer'}
        miss = sl - set(o.get('targetVisualNames') or []) if o.get('applyOnlyToTargetVisuals') else set()
        if miss:
            fail.append("page '%s': bookmark %s leaves slicers out of its targets: %s"
                        % (pn, b['displayName'], ', '.join(sorted(sel_name(kids[k]) or k for k in miss))))


def region_path(report_dir, key):
    """A path inside the region manager named by the region value <key> (theme_file · icons_dir), or a path that does not
    exist when the region is not declared - the checks that need it then find nothing, as before (01/10: a wrong root made
    the theme and icon-stroke checks find nothing silently)."""
    m = manager_root(report_dir)
    rel = region_value(report_dir, key, '')
    return os.path.join(m, rel) if m and rel else os.path.join(os.path.abspath(report_dir), '.no-region', key)


def check_fillrule(d_def, fail):
    """fillrule-bare (2026-10-05): inside a FillRule (linearGradient2/3) the stops are bare {"Literal": ...}. A stop
    wrapped as {"expr": {"Literal": ...}} still renders, but Desktop cannot rebuild the report on Save: Save, Save As
    and Publish die silently (NullReferenceException in ReportViewDocumentProvider.GetEnhancedReportDocument) -
    the two White reports lost Save for a day this way (84cb1304)."""
    def walk(o, inside, hits):
        if isinstance(o, dict):
            for k, v in o.items():
                f2 = inside or k == 'FillRule'
                if f2 and k in ('color', 'strategy') and isinstance(v, dict) and 'expr' in v:
                    hits.append(k)
                walk(v, f2, hits)
        elif isinstance(o, list):
            for v in o:
                walk(v, inside, hits)
    for f in glob.glob(os.path.join(d_def, 'pages', '*', 'visuals', '*', 'visual.json')):
        hits = []
        walk(json.load(open(f, encoding='utf-8')), False, hits)
        if hits:
            fail.append('%s: %d FillRule gradient stop(s) wrapped in "expr" - write the bare {"Literal": ...}; the wrapped '
                        'form breaks Save/Publish in Desktop (fillrule-bare)' % (os.path.basename(os.path.dirname(f)), len(hits)))


def check_bookmark_filter_objects(d_def, fail):
    """bookmark-filter-objects (a department repo 12/10): a filter saved inside a bookmark may NOT carry 'objects' - Desktop opens
    with "An additional property 'objects' was included in .../filters/byExpr/N" (94 issues on White 01, after the
    inverted-selection flag of a visual filter was copied into the bookmark copies of the same filter)."""
    def walk(x, out):
        if isinstance(x, dict):
            if 'filter' in x and 'objects' in x and 'name' in x:
                out.append(x['name'])
            for v in x.values():
                walk(v, out)
        elif isinstance(x, list):
            for v in x:
                walk(v, out)
    for f in glob.glob(os.path.join(d_def, 'bookmarks', '*.bookmark.json')):
        out = []
        walk(json.load(open(f, encoding='utf-8')).get('explorationState', {}), out)
        if out:
            fail.append("%s: %d filter(s) in the bookmark carry 'objects' - not allowed in a bookmark filter, Desktop reports "
                        "'An additional property objects' (bookmark-filter-objects)" % (os.path.basename(f), len(out)))


def check_m_steps(report_dir, fail):
    """m-step-comma (a department repo 12/10): in a partition's Power Query 'let ... in', every step but the last ends with a
    comma. A missing one opens the project with 'M Engine error: Token ',' expected' and the model does not load -
    happened when a Clean step was appended under 'Source = Sql.Database(...)' in three Classic models."""
    for t in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        txt = open(t, encoding='utf-8').read().replace('\r\n', '\n')
        for m in re.finditer(r'\n(\t+)let\n(.*?)\n\1in\n', txt, re.S):
            body = m.group(2).split('\n')
            starts = [i for i, ln in enumerate(body) if re.match(r'^\t+ {4}#?"?[A-Za-z_][\w ]*"?\s*=\s', ln)]
            for a, b in zip(starts, starts[1:]):
                prev = body[b - 1].rstrip()
                if not prev.endswith(','):
                    fail.append("%s: Power Query step before '%s' does not end with a comma - Desktop stops with "
                                "\"Token ',' expected\" (m-step-comma)" % (os.path.basename(t), body[b].strip()[:40]))


def check_filter_where_field(d_def, fail):
    """filter-where-field (a department repo 13/10): a filter's header 'field' and the column inside its Where must be the same.
    Rebinding a legacy report renamed the header (CapChiTieu -> LineLevel, chi_tieu -> LineName, BU -> BusinessUnit ...)
    but left the condition on the legacy column - Desktop draws "Something's wrong with one or more filters" in place of
    the visual (03 IP Classic: 12 filters, P&L This Year blank) and all three layers stayed green."""
    def cols(y, out):
        if isinstance(y, dict):
            if isinstance(y.get('Column'), dict) and 'Property' in y['Column']:
                out.add(y['Column']['Property'])
            for v in y.values():
                cols(v, out)
        elif isinstance(y, list):
            for v in y:
                cols(v, out)

    def walk(x, f):
        if isinstance(x, dict):
            if isinstance(x.get('field'), dict) and isinstance(x.get('filter'), dict) and x['field']:
                k = next(iter(x['field']))
                hp = x['field'][k].get('Property') if isinstance(x['field'][k], dict) else None
                got = set()
                cols(x['filter'].get('Where', []), got)
                if hp and k in ('Column', 'Hierarchy') and got and hp not in got:
                    fail.append("%s: filter %s is on field '%s' but its condition reads '%s' - point the Where/From at the same "
                                "column, Desktop shows \"Something's wrong with one or more filters\" (filter-where-field)"
                                % (os.path.relpath(f, d_def), x.get('name'), hp, "', '".join(sorted(got))))
            for v in x.values():
                walk(v, f)
        elif isinstance(x, list):
            for v in x:
                walk(v, f)
    for f in glob.glob(os.path.join(d_def, '**', '*.json'), recursive=True):
        try:
            walk(json.load(open(f, encoding='utf-8')), f)
        except ValueError:
            pass   # broken JSON has its own check


def check_dead_entity(report_dir, d_def, fail):
    """dead-entity (a department repo 13/10): every table a report file names (SourceRef Entity, From Entity, queryRefs
    '<table>.<field>') must exist in the model. 03 IP Classic kept 5 page filters on the deleted legacy DimIndicator
    and two matrices' expansionStates on DimIndicator.ma_so: the P&L pages errored and every gate layer was green."""
    tabs = set()
    for t in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        m = re.search(r"(?m)^table\s+('(?:[^']|'')+'|\S+)", open(t, encoding='utf-8').read())
        if m:
            tabs.add(m.group(1).strip("'").replace("''", "'"))
    if not tabs:
        return              # thin report (live connection): no local model to check against
    bad = {}
    hidden = {os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(d_def, 'pages', '*', 'page.json'))
              if json.load(open(p, encoding='utf-8')).get('visibility') == 'HiddenInViewMode'}
    for f in glob.glob(os.path.join(d_def, '**', '*.json'), recursive=True):
        rel = os.path.relpath(f, d_def).split(os.sep)
        if len(rel) > 1 and rel[0] == 'pages' and rel[1] in hidden:
            continue        # a hidden legacy page nobody can open (old campaign pages of 12 North): not a viewer-facing break
        s = open(f, encoding='utf-8').read()
        names = set(re.findall(r'"Entity":\s*"([^"]+)"', s))
        names |= {q.split('.', 1)[0] for q in re.findall(r'"queryRefs":\s*\[\s*"([^"]+)"', s) if '.' in q}
        for n in names - tabs:
            bad.setdefault(n, []).append(os.path.relpath(f, d_def))
    for n, fs in sorted(bad.items()):
        fail.append("table '%s' is named in %d report file(s) (e.g. %s) but is not in the model - Desktop errors on those "
                    "visuals/filters; rebind to the warehouse table (dead-entity)" % (n, len(fs), fs[0]))


def check_extension_ref(d_def, fail):
    """extension-ref (a department repo 17/10, 04 IP Classic): a field with SourceRef "Schema": "extension" is a REPORT-level measure
    (reportExtensions.json of a thin report). The legacy 04 measures were moved into the model and reportExtensions.json removed,
    but 4 visuals kept "Schema": "extension" ⇒ after refresh "Something's wrong with one or more fields"; 'Fix this' then
    DELETED the fields (3 columns of Revenue Yesterday of Store). Every page counts, hidden tooltip pages included."""
    ext, have = os.path.join(d_def, 'reportExtensions.json'), set()
    if os.path.exists(ext):
        for e in json.load(open(ext, encoding='utf-8')).get('entities', []):
            have |= {(e.get('name'), m.get('name')) for m in e.get('measures', [])}
    bad = {}
    def walk(o, f):
        if isinstance(o, dict):
            for kind in ('Measure', 'Column'):
                n = o.get(kind)
                if isinstance(n, dict) and isinstance(n.get('Expression'), dict):
                    sr = n['Expression'].get('SourceRef', {})
                    if sr.get('Schema') == 'extension' and (sr.get('Entity'), n.get('Property')) not in have:
                        bad.setdefault('%s[%s]' % (sr.get('Entity'), n.get('Property')), []).append(f)
            for v in o.values():
                walk(v, f)
        elif isinstance(o, list):
            for v in o:
                walk(v, f)
    for f in glob.glob(os.path.join(d_def, 'pages', '**', '*.json'), recursive=True):
        try:
            walk(json.load(open(f, encoding='utf-8')), os.path.relpath(f, d_def))
        except ValueError:
            pass
    for k, fs in sorted(bad.items()):
        fail.append('%s is referenced as a report-level (extension) measure in %d file(s) (e.g. %s) but reportExtensions.json does '
                    'not define it - drop "Schema": "extension" when the measure lives in the model (extension-ref)' % (k, len(fs), fs[0]))


def check_dead_field(report_dir, d_def, fail):
    """dead-field (a department repo 13/10): every column / measure a report file names (with its table, through From aliases
    too) must exist in that model table. 03 IP Classic: the PnL Report slicer kept its saved selection on
    Dim_ProfitLossLine[CapChiTieu] (renamed LineLevel) - the matrix errored; dead-entity is blind to it (table exists)."""
    fields = {}
    for t in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        s = open(t, encoding='utf-8').read()
        m = re.search(r"(?m)^table\s+('(?:[^']|'')+'|\S+)", s)
        if not m:
            continue
        tab = m.group(1).strip("'").replace("''", "'")
        names = re.findall(r"(?m)^\t(?:column|measure|hierarchy)\s+('(?:[^']|'')+'|[^\s=]+)", s)
        fields[tab] = {n.strip("'").replace("''", "'").lower() for n in names}   # model names are case-insensitive
    if not fields:
        return
    hidden = {os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(d_def, 'pages', '*', 'page.json'))
              if json.load(open(p, encoding='utf-8')).get('visibility') == 'HiddenInViewMode'}
    bad = {}

    def walk(x, alias, f):
        if isinstance(x, dict):
            if isinstance(x.get('From'), list):
                alias = dict(alias, **{s.get('Name'): s.get('Entity') for s in x['From'] if isinstance(s, dict)})
            for kind in ('Column', 'Measure'):
                c = x.get(kind)
                if isinstance(c, dict) and isinstance(c.get('Expression'), dict) and 'Property' in c:
                    sr = c['Expression'].get('SourceRef', {})
                    tab = sr.get('Entity') or alias.get(sr.get('Source'))
                    if tab in fields and c['Property'].lower() not in fields[tab]:
                        bad.setdefault('%s[%s]' % (tab, c['Property']), []).append(f)
            for v in x.values():
                walk(v, alias, f)
        elif isinstance(x, list):
            for v in x:
                walk(v, alias, f)
    for f in glob.glob(os.path.join(d_def, '**', '*.json'), recursive=True):
        rel = os.path.relpath(f, d_def).split(os.sep)
        if len(rel) > 1 and rel[0] == 'pages' and rel[1] in hidden:
            continue
        try:
            walk(json.load(open(f, encoding='utf-8')), {}, os.path.relpath(f, d_def))
        except ValueError:
            pass
    for k, fs in sorted(bad.items()):
        fail.append("%s is named in %d report file(s) (e.g. %s) but the model table has no such column/measure - "
                    "rebind it (dead-field)" % (k, len(fs), fs[0]))


LITERAL_KINDS = {'string': ('text',), 'int64': ('int', 'num'), 'double': ('num', 'int'), 'decimal': ('num', 'int'),
                 'dateTime': ('date',), 'boolean': ('bool',)}


def literal_fits(dt, lv):
    """A filter literal fits a column type: 'x' text · 5L int · 5D / 5.0 / 5M number · datetime'..' date · true / false."""
    if dt not in LITERAL_KINDS:
        return True
    if lv.startswith("'"):
        k = 'text'
    elif lv.startswith('datetime'):
        k = 'date'
    elif lv in ('true', 'false'):
        k = 'bool'
    elif re.fullmatch(r'-?\d+L', lv):
        k = 'int'
    elif re.fullmatch(r'-?[\d.]+[DM]?', lv):
        k = 'num'
    else:
        return True
    return k in LITERAL_KINDS[dt]


def check_literal_type(report_dir, d_def, fail):
    """literal-type (a department repo 13/10): an In / Not In filter value must have the column's type. Text on a number column
    (03 White: Year slicers' 'is not blank' also listed 'Unknown' / 'Not Applicable') or a number on a text column (03 Classic:
    the SelectMonth slicer kept '05' while Parameter_Date[Month] had become a number) fails in Desktop with "CONTAINSROW
    does not support comparing values of type Text with values of type Integer" - static and engine layers were green."""
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
    if not types:
        return
    bad = {}

    def walk(x, alias, f):
        if isinstance(x, dict):
            if isinstance(x.get('From'), list):
                alias = dict(alias, **{s.get('Name'): s.get('Entity') for s in x['From'] if isinstance(s, dict)})
            # a Comparison (column = literal) too: 'is not blank' written as Not(col = null) And Not(col = 'Unknown') on
            # Dim_Date.DateKey / Year (a department repo 21/10, 4 White files) - the In-only walk let all 8 terms through
            cmp_ = x.get('Comparison')
            if isinstance(cmp_, dict) and 'Column' in cmp_.get('Left', {}):
                col = cmp_['Left']['Column']; sr = col.get('Expression', {}).get('SourceRef', {})
                tab = sr.get('Entity') or alias.get(sr.get('Source'))
                dt = types.get((tab, str(col.get('Property', '')).lower()))
                lv = cmp_.get('Right', {}).get('Literal', {}).get('Value') or ''
                if dt and lv not in ('', 'null') and not literal_fits(dt, lv):
                    bad.setdefault('%s[%s] (%s) = %s' % (tab, col.get('Property'), dt, lv), []).append(f)
            inn = x.get('In')
            if isinstance(inn, dict) and len(inn.get('Expressions', [])) == 1 and 'Column' in inn['Expressions'][0]:
                col = inn['Expressions'][0]['Column']; sr = col.get('Expression', {}).get('SourceRef', {})
                tab = sr.get('Entity') or alias.get(sr.get('Source'))
                dt = types.get((tab, str(col.get('Property', '')).lower()))
                for row in inn.get('Values', []):
                    lv = (row[0].get('Literal', {}).get('Value') if row and isinstance(row[0], dict) else None) or ''
                    if not dt or lv in ('', 'null'):
                        continue
                    if not literal_fits(dt, lv):
                        bad.setdefault('%s[%s] (%s) = %s' % (tab, col.get('Property'), dt, lv), []).append(f)
                        break
            for v in x.values():
                walk(v, alias, f)
        elif isinstance(x, list):
            for v in x:
                walk(v, alias, f)
    for f in glob.glob(os.path.join(d_def, '**', '*.json'), recursive=True):
        try:
            walk(json.load(open(f, encoding='utf-8')), {}, os.path.relpath(f, d_def))
        except ValueError:
            pass
    for k, fs in sorted(bad.items()):
        fail.append("filter on %s - the value's type is not the column's type, Desktop fails the visual (CONTAINSROW Text vs "
                    "Integer); %d file(s), e.g. %s (literal-type)" % (k, len(fs), fs[0]))


def check_select_all(d_def, fail):
    """select-all (a department repo 21/10: every filter offers All): every slicer is multi-choice with the 'Select all' row
    (objects.selection selectAllCheckboxEnabled true, no singleSelect / strictSingleSelect). Only a field parameter
    (Parameter_*, one field at a time) stays single-choice. Measured on a White copy: 34 of 48 slicers lacked the row; on
    another, 20 single-choice Year / Month boxes and copies of them had passed as exempt."""
    for f in sorted(glob.glob(os.path.join(d_def, 'pages', '*', 'visuals', '*', 'visual.json'))):
        try:
            d = json.load(open(f, encoding='utf-8'))
        except ValueError:
            continue
        v = d.get('visual', {})
        if v.get('visualType') != 'slicer':
            continue
        sel = ((v.get('objects', {}).get('selection') or [{}])[0] or {}).get('properties', {})
        refs = [x.get('queryRef') for x in v.get('query', {}).get('queryState', {}).get('Values', {}).get('projections', [])]
        if all(str(r or '').startswith('Parameter_') for r in refs) and refs:
            continue
        if lit(sel.get('selectAllCheckboxEnabled')) != 'true' or lit(sel.get('singleSelect')) == 'true' \
                or lit(sel.get('strictSingleSelect')) == 'true':
            page = os.path.basename(os.path.dirname(os.path.dirname(os.path.dirname(f))))
            fail.append("page %s: slicer %s (%s) has no 'Select all' row or is single-choice - drop singleSelect / "
                        "strictSingleSelect, set objects.selection selectAllCheckboxEnabled true; only a field parameter stays "
                        "single (select-all)" % (page, d.get('name'), '+'.join(r for r in refs if r) or '?'))


def check_dead_visual(d_def, fail):
    """dead-visual (a department repo 21/10, 01 IP White): a visual with a query that is hidden in visual.json AND in every
    bookmark of its page, while a sibling in its group (the BG_ shape) is shown, is a dashboard nobody can ever see - the
    frame shows empty. The copy brought back from attic had the Franchise combo chart (Overview) and the product bar chart
    (In-Store) hidden this way; the Live White of the same report shows both. A visual whose whole group is hidden too
    (the off state of a button pair, a closed panel) is not counted."""
    bms = []
    for f in glob.glob(os.path.join(d_def, 'bookmarks', '*.bookmark.json')):
        try:
            bms.append(json.load(open(f, encoding='utf-8')))
        except ValueError:
            pass

    def mode(vc, k):
        if k not in vc:
            return None
        return ((vc[k].get('singleVisual') or vc[k].get('visualContainerGroup') or {}).get('display') or {}).get('mode', 'shown')

    for pdir in glob.glob(os.path.join(d_def, 'pages', '*', '')):
        pid = os.path.basename(os.path.normpath(pdir))
        V = {}
        for f in glob.glob(os.path.join(pdir, 'visuals', '*', 'visual.json')):
            try:
                d = json.load(open(f, encoding='utf-8'))
            except ValueError:
                continue
            V[d.get('name')] = d
        pb = [b['explorationState']['sections'][pid].get('visualContainers', {}) for b in bms
              if pid in b.get('explorationState', {}).get('sections', {})]

        def ever_shown(n):
            return (not V[n].get('isHidden')) or any(mode(vc, n) == 'shown' for vc in pb)
        for n, d in V.items():
            if 'visualGroup' in d or not d.get('isHidden') or not d.get('visual', {}).get('query'):
                continue
            if any(mode(vc, n) == 'shown' for vc in pb):
                continue
            sib = [m for m, e in V.items() if m != n and 'visualGroup' not in e
                   and e.get('parentGroupName') == d.get('parentGroupName')]
            if d.get('parentGroupName') and any(ever_shown(m) for m in sib):
                fail.append("page %s: visual %s (%s) is hidden in visual.json and in every bookmark while its group's frame is "
                            "shown - an empty dashboard; show it in the states its BG_ shape shows (dead-visual)"
                            % (pid, n, d['visual'].get('visualType')))


def check_own_background(d_def, fail):
    """own-background (a department repo 21/10: one block read grey among white ones): the colour of a dashboard is its BG_
    shape. A visual inside a group that holds a BG_ shape keeps visualContainerObjects.background off - its own background
    (a theme colour darkened 10 %, or #FAFAFA over the frame) paints a second colour over the frame. 7 + 3 visuals on four
    White copies had it on; the 'dashboard' check only counted the BG_ shapes."""
    for pdir in glob.glob(os.path.join(d_def, 'pages', '*', '')):
        V = {}
        for f in glob.glob(os.path.join(pdir, 'visuals', '*', 'visual.json')):
            try:
                d = json.load(open(f, encoding='utf-8'))
            except ValueError:
                continue
            V[d.get('name')] = d
        framed = {d.get('parentGroupName') for d in V.values()
                  if d.get('visual', {}).get('visualType') == 'shape' and str(sel_name(d) or '').startswith('BG_')}
        framed.discard(None)
        for n, d in V.items():
            v = d.get('visual', {})
            if not v.get('visualType') or v['visualType'] == 'shape' or d.get('parentGroupName') not in framed:
                continue
            bgp = ((v.get('visualContainerObjects', {}).get('background') or [{}])[0] or {}).get('properties', {})
            if lit(bgp.get('show')) == 'true':
                fail.append("page %s: visual %s (%s %s) paints its own background inside a BG_ frame - turn "
                            "visualContainerObjects.background.show off, the frame gives the colour (own-background)"
                            % (os.path.basename(os.path.normpath(pdir)), n, v['visualType'], ascii(sel_name(d) or '')))


def check_user_save(report_dir, fail):
    """user-save (a department repo 21/10: a Save the user made must never be lost): files of the report changed on disk and not in git are
    a Desktop Save of the user (or an agent edit not yet checkpointed). Before any agent write they go into the index
    (`git add <report folder>`), so the user's save is always kept and every agent step starts from a known state. The
    gate only reads `git status`; no git ⇒ not checked."""
    try:
        out = subprocess.run(['git', 'status', '--porcelain', '--untracked-files=all', '--', '.'], cwd=report_dir,
                             capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.SubprocessError):
        return
    if out.returncode != 0:
        return
    dirty = [ln for ln in out.stdout.splitlines() if len(ln) > 3 and (ln[1] != ' ' or ln[:2] == '??')
             and not re.search(r'[\\/](\.pbi[\\/](cache\.abf|localSettings\.json)|\.gitignore)$', ln)]
    if dirty:
        fail.append("%d file(s) of this report changed on disk and are not in git (a Desktop Save?), e.g. %s - keep them: "
                    "git add %s before any agent write (user-save)"
                    % (len(dirty), dirty[0][3:].strip(), os.path.normpath(report_dir)))


def check_bridge_bypass(report_dir, fail):
    """bridge-bypass (a department repo 13/10): a fact that reaches a dim only through a bridge (some measure applies
    TREATAS(SUMMARIZE(Bridge_*, ...), Fact[...])) must be aggregated through that bridge in EVERY measure. 05 Classic
    '#Tenure Months' = SUM(Fact_Headcount[TenureMonths]) ignored Dim_Store, so the export table listed each employee
    once per store (45 rows for one person) while the bridged '#Employee Distinct' total stayed right."""
    for t in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        s = open(t, encoding='utf-8').read()
        ms = re.findall(r"(?ms)^\tmeasure ('[^']+'|\S+) =(.*?)(?=^\t\t(?:formatString|displayFolder|lineageTag|annotation)|^\tmeasure |\Z)", s)
        bridged = set(re.findall(r"TREATAS\s*\(\s*SUMMARIZE\s*\(\s*Bridge_\w+[^)]*\)\s*,\s*'?(\w+)'?\[", s))
        for name, body in ms:
            for fact in bridged:
                if re.search(r"\b(?:SUM|COUNTROWS|DISTINCTCOUNT|COUNT|COUNTA|MAX|MIN|AVERAGE)X?\s*\(\s*'?%s'?\b" % fact, body) \
                        and 'Bridge_' not in body:
                    fail.append("measure %s aggregates %s directly but %s reaches the store/AM dims only through a bridge - "
                                "wrap it in the same TREATAS(SUMMARIZE(Bridge_…)) or rows repeat per store (bridge-bypass)"
                                % (name, fact, fact))


WAREHOUSE_DB = region_value(os.path.dirname(os.path.abspath(__file__)), 'warehouse_db', '')  # the warehouse database name


def check_kimball16_classic(report_dir, fail):
    """kimball16-classic (a department repo 13/10): Classic maps the warehouse labels 'Unknown' / 'Not Applicable' back to null in
    Power Query (the legacy report showed blank there). Every Dim_* that reads the warehouse needs that Clean step -
    03 / 05 Classic missed it (slicer 'Area Manager' listed 'Unknown', 99 store + 107 P&L rows labelled)."""
    for t in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', 'Dim_*.tmdl')):
        if os.path.basename(t) == 'Dim_Date.tmdl':
            continue   # the date dim has no labelled members
        s = open(t, encoding='utf-8').read()
        if WAREHOUSE_DB and WAREHOUSE_DB in s and '"Unknown", null' not in s:
            fail.append("%s: reads the warehouse but has no Clean step mapping 'Unknown' / 'Not Applicable' to null - "
                        "Classic shows blank where the legacy report did (kimball16-classic)" % os.path.basename(t))






# legacy / warehouse field names written as ONE capitalised word, invisible to the camelCase test ('Monthnumber' on 03 White)
JOINED_FIELD_WORDS = {'monthnumber', 'weeknum', 'weeknumber', 'weekperiod', 'storename', 'itemname', 'storeid', 'dateint',
                      'yearmonth', 'dayofweek', 'dayofmonth', 'monthname', 'hourstart', 'parentname', 'groupcontract'}


def column_name_problem(name):
    """Why a header / legend name is not reader text, or None. English Title Case like the visual titles (user 13/10)."""
    n = (name or '').strip().strip('"').strip()
    if not n:
        return 'empty'
    if re.fullmatch(r'%\s*\d*', n):          # '%', '%1', '%2' (03 White 13/10)
        return "a bare '%' - say what it is a share of ('% Revenue')"
    if '_' in n:
        return 'underscore'
    if re.search(r'[A-Za-z]\d+$', n) and not re.search(r'\b(?:Q[1-4]|B2C|B2B|Top \d+)$', n):
        return 'trailing number'
    words = re.findall(r'[^\W\d_][^\W_]*', n)
    for i, w in enumerate(words):
        if w in TITLE_ACRO or w.upper() in TITLE_ACRO:
            continue
        if re.search(r'[a-z][A-Z]', w) or w.lower() in JOINED_FIELD_WORDS:
            return "joined words '%s'" % w
        if len(w) > 3 and w.isupper():
            return "ALL-CAPS '%s'" % w
        if w.lower() in TITLE_SMALL and (i > 0 or n.startswith('%')):     # '% vs Target': '%' is the first word
            continue
        if not w[:1].isupper():
            return "lower-case word '%s'" % w
    return None


VI_LETTER = re.compile('[\u00c0-\u00c3\u00c8-\u00ca\u00cc\u00cd\u00d2-\u00d5\u00d9\u00da\u00dd\u00e0-\u00e3\u00e8-\u00ea\u00ec\u00ed'
                       '\u00f2-\u00f5\u00f9\u00fa\u00fd\u0102\u0103\u0110\u0111\u0128\u0129\u0168\u0169\u01a0\u01a1\u01af\u01b0'
                       '\u1ea0-\u1ef9]')


def model_measure_dax(d_def):
    """{measure name: DAX text} of the report's own semantic model (a thin report has none). Named apart from
    model_measures(report_dir): the same name defined twice shadowed that one, and legacy-parity saw no wrapper measure
    (a department repo 19/10: 18 % cards reported lost on each White report)."""
    out = {}
    for t in glob.glob(os.path.join(d_def, '..', '..', '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        txt = open(t, encoding='utf-8').read()
        for blk in re.split(r'(?m)^(?=\t(?:measure|column|partition|hierarchy)\s)', txt):
            m = re.match(r"\tmeasure\s+('(?:[^']|'')+'|[^\s=]+)\s*=", blk)
            if m:
                out[m.group(1).strip("'").replace("''", "'")] = blk
    return out


def item_measures(d_def):
    """Measures that count ONE item: their DAX filters a single ItemID (EcomComboQty_TGVI0087). The header a visual gives such
    a measure is the item's name - data, not frame text (a department repo 18/10)."""
    return {n for n, b in model_measure_dax(d_def).items() if len(set(re.findall(r'\[ItemID\]\s*=\s*"([^"]+)"', b))) == 1}


def check_measure_names(d_def, fail):
    """measure-name (user 18/10): a measure is a variable - English name, no Vietnamese letters; the Vietnamese a reader needs
    goes to the visual's displayName or comes from the data. White / Red only (Classic keeps the legacy names)."""
    for n in sorted(model_measure_dax(d_def)):
        if VI_LETTER.search(n):
            fail.append("measure %s is named in Vietnamese - a measure is a variable: give it an English name (the reader text "
                        "goes to the visual's displayName) (measure-name)" % ascii(n))


def check_column_names(d_def, fail):
    """column-name (a department repo 13/10, user: "tên cột đang ko đúng chuẩn loạn xạ hết, cái này cũng phải có trong skill và
    cổng kiểm"): every field a visible table / matrix / chart shows (its displayName, else the field name) reads as English
    Title Case reader text - no warehouse/legacy names (chi_tieu, ChiPhi2, StoreName2, ITEM_NAME, PARENT3NAME), no bare
    '%'. Slicers are labelled by their own label shapes. White / Red only (Classic keeps the legacy wording)."""
    hidden = {os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(d_def, 'pages', '*', 'page.json'))
              if json.load(open(p, encoding='utf-8')).get('visibility') == 'HiddenInViewMode'}
    bad = {}
    per_item = item_measures(d_def)
    for f in glob.glob(os.path.join(d_def, 'pages', '*', 'visuals', '*', 'visual.json')):
        if f.split(os.sep)[-4] in hidden:
            continue
        d = json.load(open(f, encoding='utf-8')); v = d.get('visual', {})
        vt = v.get('visualType')
        # a visual hidden by default is still read: the tabs show their content by bookmark (13/10: Operation 'Swith METRIX',
        # Weekly 'vsWTDLW', Daily 'DatePart_Lable' all sat in tab groups hidden on open, so the check never saw them)
        if vt in (None, 'slicer', 'shape', 'image', 'textbox', 'actionButton'):
            continue
        if vt == 'card' and lit((v.get('objects', {}).get('categoryLabels') or [{}])[0].get('properties', {}).get('show', {})) == 'false':
            continue        # a Pct_ line under a KPI tile: the number only, its field name is never shown
        for role, r in v.get('query', {}).get('queryState', {}).items():
            for p in r.get('projections', []):
                if p.get('hidden'):
                    continue
                fld = p.get('field', {}); k = next(iter(fld), None)
                if k == 'NativeVisualCalculation':
                    continue
                if k == 'Measure' and fld['Measure'].get('Property') in per_item:
                    continue        # the header of a one-item measure is the item's name: data (user 18/10)
                name = p.get('displayName')
                if name is None:
                    x = fld.get(k, {})
                    if k == 'Aggregation':
                        x = x.get('Expression', {}).get('Column', {})
                    name = x.get('Property') or x.get('Level') or p.get('queryRef', '')
                    name = re.sub(r'^[#~]', '', name)
                why = column_name_problem(name)
                if why:
                    bad.setdefault((sel_name(d) or d['name'], name), why)
    for (vis, name), why in sorted(bad.items()):
        fail.append("visual %s shows the field name %s - %s; give it a reader name (displayName) in English Title Case "
                    "(column-name)" % (ascii(vis), ascii(name), why))


def check_kimball16(d_def, fail):
    """kimball16 (a department repo 12/10): the warehouse labels empty dim cells 'Unknown' / 'Not Applicable' (Kimball #16,
    live since 09/10), so on a report that KEEPS the labels (White / Red) an 'is not blank' filter on a Dim_* column lets
    those rows through. Every such filter (visual · page · report · bookmark) must also exclude both labels. Classic
    maps the labels back to null in Power Query, so it is not checked there. 292 filters were found open on 2 White files."""
    def walk(node, alias, out):
        if isinstance(node, dict):
            if isinstance(node.get('From'), list):
                alias = dict(alias)
                alias.update({x.get('Name'): x.get('Entity') for x in node['From'] if isinstance(x, dict)})
            if 'Not' in node:
                s = json.dumps(node['Not'])
                if '"null"' in s and not ("'Unknown'" in s and "'Not Applicable'" in s):
                    e = node['Not'].get('Expression', {})
                    for c in e.get('In', {}).get('Expressions', []) + [e.get('Comparison', {}).get('Left', {})]:
                        col = c.get('Column', {}); sr = col.get('Expression', {}).get('SourceRef', {})
                        ent = sr.get('Entity') or alias.get(sr.get('Source'))
                        if ent and ent.startswith('Dim_') and col.get('Property'):
                            out.append('%s.%s' % (ent, col['Property']))
            for v in node.values():
                walk(v, alias, out)
        elif isinstance(node, list):
            for v in node:
                walk(v, alias, out)
    # only TEXT columns of Dim_* tables (Dim_Date excluded): a date / number / true-false column never carries the labels,
    # and Not In ['Unknown'] on it is a type error - the column types are read from the report's own model
    text_cols = set()
    for t in glob.glob(os.path.join(os.path.dirname(d_def), '..', '*.SemanticModel', 'definition', 'tables', 'Dim_*.tmdl')):
        tb = os.path.basename(t)[:-5]
        if tb == 'Dim_Date':
            continue
        for col, typ in re.findall(r"\n\tcolumn '?([A-Za-z0-9_]+)'?[^\n]*\n\t\tdataType: (\w+)", open(t, encoding='utf-8').read()):
            if typ == 'string':
                text_cols.add('%s.%s' % (tb, col))
    hits = {}
    for f in glob.glob(os.path.join(d_def, '**', '*.json'), recursive=True):
        out = []
        walk(json.load(open(f, encoding='utf-8')), {}, out)
        for c in out:
            if c in text_cols:
                hits[c] = hits.get(c, 0) + 1
    for c, n in sorted(hits.items()):
        fail.append("%d 'is not blank' filter(s) on %s do not exclude 'Unknown' and 'Not Applicable' - the warehouse labels "
                    "empty dim cells (Kimball #16); write Not In [null, 'Unknown', 'Not Applicable'] (kimball16)" % (n, c))


def matrix_fitted(d):
    """Sized by scripts/matrix_fit.py from the engine (autoSize off + a width for every measure): the static width rules
    (scroll estimate, narrow-table, header-wrap) are guesses about a table that was measured - the engine gate matrix-fit
    owns it."""
    v = d.get('visual', {}); o = v.get('objects', {})
    if lit((o.get('columnHeaders') or [{}])[0].get('properties', {}).get('autoSizeColumnWidth', {})) != 'false':
        return False
    widths = {e.get('selector', {}).get('metadata') for e in o.get('columnWidth', [])}
    meas = [p['queryRef'] for p in v.get('query', {}).get('queryState', {}).get('Values', {}).get('projections', [])]
    return bool(meas) and all(m in widths for m in meas)


ONE_SERIES_TYPES = ('lineChart', 'areaChart', 'clusteredColumnChart', 'clusteredBarChart', 'columnChart', 'barChart',
                    'stackedAreaChart')


def one_series_chart(d):
    """A chart of ONE series: one measure and no legend split by time. A legend split by TIME (one line per year -
    Seasonal) is many series; a split by another field can be filtered down to one value (Promotion: DISCOUNTNAME under
    the campaign filter) and still reads as one series."""
    v = d.get('visual', {})
    if v.get('visualType', '') not in ONE_SERIES_TYPES:
        return False
    q_ = v.get('query', {}).get('queryState', {})
    n_meas = sum(len(q_.get(r, {}).get('projections', [])) for r in ('Y', 'Y2', 'Values'))
    by_time = any(p_['queryRef'].startswith('Dim_Date.') or p_['queryRef'] in MULTI_SPLIT
                  for p_ in q_.get('Series', {}).get('projections', []))
    return n_meas <= 1 and not by_time


def check_report_level(report_dir, rep, d_def, vis, fail):
    check_clear_filter(d_def, vis, fail)
    folder = os.path.basename(os.path.normpath(report_dir))
    art = os.path.basename(rep)[:-len('.Report')]
    fm, am = FOLDER_RX.match(folder), ARTIFACT_RX.match(art)
    # file-name (user 2026-09-28, suffix 2026-10-04, UPPER function + Scheduled 2026-10-05, folder in the file's shape
    # 2026-10-19): folder <DEPT>_<num>_<FUNCTION>[-<Tier>]_<IP|DR>_<Kind> / file <DEPT>_<num>_<FUNCTION>[-<Tier>]_<Live|Scheduled>[_V<n>]
    if not fm:
        fail.append("folder name %r breaks the pattern <DEPT>_<num>_<FUNCTION>[-AM|-OM]_<IP|DR>_<Legacy|Classic|White|Red> "
                    "(e.g. ABC_02_STORE-REPORT-AM_DR_White; scripts/rename_reports.py moves an old name)" % folder)
    if not am:
        fail.append("file name %r breaks the pattern <DEPT>_<num>_<FUNCTION>[-AM|-OM]_<Live|Scheduled>[_V<n>] "
                    "(e.g. OPS_02_STORE-REPORT-AM_Live) - ASCII, no spaces, it is the name on the Service" % art)
    if not (fm and am):
        return
    num, mode, kind = fm.group(2), fm.group(4), fm.group(5)
    want = '%s_%s_%s_%s' % (fm.group(1), num, fm.group(3), MODE_SUFFIX[mode])
    if art != want and not re.match(r'^%s_V\d+$' % re.escape(want), art):
        fail.append('folder %r and file %r differ - a %s folder needs the file %r (or %r_V<n> when two builds share '
                    'the number and the load mode)' % (folder, art, mode, want, want))
    dept = re.search(r'Dept_([A-Z]+)', os.path.abspath(report_dir))
    if am.group(1) not in DEPT_CODES or (dept and dept.group(1) != am.group(1)):
        fail.append('file name %r: prefix %r must be the department code%s'
                    % (art, am.group(1), ' %s' % dept.group(1) if dept else ''))
    # storage-mode (user 2026-09-28): IP = every warehouse table Import, DR = every one DirectQuery; a thin report
    # on a Service model (Legacy) reads an Import model, so it is IP
    live = any('byConnection' in open(p, encoding='utf-8').read()
               for p in glob.glob(os.path.join(report_dir, '*.Report', 'definition.pbir')))
    # aggregations: a table that is alternateOf another needs that base table in DirectQuery - else Desktop refuses
    # the whole model (IP copy of the White, 2026-09-28: 'partition Fact_Sale ... must be set to DirectQuery')
    for sm in glob.glob(os.path.join(report_dir, '*.SemanticModel')):
        tdir = os.path.join(sm, 'definition', 'tables')
        for f in glob.glob(os.path.join(tdir, '*.tmdl')):
            bases = set(re.findall(r"(?m)^\t\t\tbaseColumn:\s*'?([^'.\[\s]+)", open(f, encoding='utf-8').read()))
            for base in sorted(bases):
                bf = os.path.join(tdir, base + '.tmdl')
                if os.path.exists(bf) and '\t\tmode: directQuery' not in open(bf, encoding='utf-8').read():
                    fail.append('table %s is an aggregation (alternateOf) of %s, which is not DirectQuery - Desktop '
                                'refuses the model; drop the alternateOf mapping or keep %s DirectQuery'
                                % (os.path.basename(f)[:-5], base, base))
    if live and mode != 'IP':
        fail.append('folder %r: a live connection to a Service model is IP, not %s' % (folder, mode))
    for f in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        t = open(f, encoding='utf-8').read()
        if 'Sql.Database(' not in t:
            continue
        tm = set(re.findall(r'(?m)^\t\tmode: (\w+)', t))
        want = 'import' if mode == 'IP' else 'directQuery'
        if tm and tm != {want}:
            fail.append('table %s is %s but the folder says %s - %s means every warehouse table is %s'
                        % (os.path.basename(f)[:-5], '/'.join(sorted(tm)), mode, mode, want))
    if kind == 'Legacy':
        return
    check_diagram(report_dir, kind == 'White', fail)
    # model: read the warehouse with DirectQuery, server string equal to the gateway, no legacy source left
    for f in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        t = open(f, encoding='utf-8').read()
        tb = os.path.basename(f)[:-5]
        for s in LEGACY_SRC:
            if re.search(r'\b%s\b' % re.escape(s), t):
                fail.append('table %s still reads legacy source %r - a warehouse build must leave the legacy system completely' % (tb, s))
        if 'Sql.Database(' in t:
            for srv in re.findall(r'Sql\.Database\("([^"]+)"', t):
                if DW_SERVER and srv != DW_SERVER:
                    fail.append('table %s: server %r - must use exactly the gateway string %r' % (tb, srv, DW_SERVER))
    check_dw_only_tables(report_dir, fail)
    if kind != 'White':
        return
    pages = page_meta(d_def)
    visible = {p for p, m in pages.items() if m.get('visibility') != 'HiddenInViewMode'}
    # canvas 1280x720
    for p in visible:
        m = pages[p]
        if (m.get('width'), m.get('height')) != (1280, 720):
            fail.append("page '%s' %sx%s - every White page is 1280x720 (split long content into tabs)"
                        % (m['displayName'], m.get('width'), m.get('height')))
    # page-name: the name says what the page is, not which department owns it (user 2026-09-27)
    for p in visible:
        if GENERIC_PAGE_RX.match(pages[p]['displayName'].strip()):
            fail.append("page '%s': generic department/unit name - the page name must say what the page is"
                        % pages[p]['displayName'])
        # the report already belongs to the department: no department code in a page name (user 2026-09-27)
        elif re.search(r'\b(%s)\b' % '|'.join(DEPT_CODES), pages[p]['displayName']):
            fail.append("page '%s': carries a department code - the report already belongs to the department, drop it"
                        % pages[p]['displayName'])
        # the header already says STORE REPORT: 'Report' / 'Dashboard' in a page name is a repeat (user 2026-09-30)
        elif re.search(r'(?i)\b(report|dashboard)\b', pages[p]['displayName']):
            fail.append("page '%s': 'Report' / 'Dashboard' repeats the header - drop the word (Monthly Report -> Monthly)"
                        % pages[p]['displayName'])
    # single-page-overview: one visible page = Overview; the header already carries the report name, a page named after
    # the report repeats it (a department report, 2026-10-18). HiddenInViewMode pages do not count.
    if len(visible) == 1:
        only = pages[next(iter(visible))]['displayName'].strip()
        if only != 'Overview':
            fail.append("page '%s': the only visible page is named Overview - the header already carries the report name" % only)
    check_card_row(pages, visible, vis, fail)
    # slicer-blank: no slicer may show (Blank) (the design standard, user 2026-09-10 / 2026-09-27)
    for (pg, i), d in vis.items():
        if pg not in visible or d.get('visual', {}).get('visualType') != 'slicer':
            continue
        fl = d.get('filterConfig', {}).get('filters', [])
        for b in d['visual'].get('query', {}).get('queryState', {}).values():
            for pr in b.get('projections', []):
                col = pr.get('field', {}).get('Column')
                if not col:
                    continue
                ok = any(x.get('field', {}).get('Column', {}).get('Property') == col['Property']
                         and '"Not"' in json.dumps(x) and '"Value": "null"' in json.dumps(x) for x in fl)
                if not ok:
                    fail.append("page '%s' slicer %s: column %s has no 'is not blank' filter - the slicer can show (Blank)"
                                % (pages[pg]['displayName'], sel_name(d) or i, col['Property']))
    # panel-title: the big FILTERS PANEL title must be drawn above the panel background (user 2026-09-27)
    for (pg, i), d in vis.items():
        if pg not in visible or sel_name(d) != 'Filter_Panel':
            continue
        kids = {sel_name(v): v for (p2, k), v in vis.items() if p2 == pg and v.get('parentGroupName') == i}
        t, b = kids.get('FILTERS PANEL'), kids.get('BG_FilterPanel')
        if b:
            under = [n_ for n_, v in kids.items() if not str(n_).startswith('BG_')
                     and v['position'].get('z', 0) <= b['position'].get('z', 0)]
            if under:
                fail.append("page '%s': filter panel items drawn under BG_FilterPanel (z <= %s): %s - the panel hides them"
                            % (pages[pg]['displayName'], b['position'].get('z', 0), ', '.join(sorted(map(str, under)))))
    # filter-rows (user 13/10: "sao filter mới lại bị rỗng 1 hàng, cổng kiểm là filter phải nối liền nhau theo hàng chứ, vì
    # số nối liền nhau là cố định rồi"): the slicers of a filter panel follow one another at the fixed pitch (label 20 +
    # box 40 + gap 5 = 65) - removing or merging a slicer moves the ones below it up, no empty row is left
    for (pg, i), d in vis.items():
        if pg not in visible or 'visualGroup' not in d:
            continue
        kids = [v for (p2, k), v in vis.items() if p2 == pg and v.get('parentGroupName') == i]
        if not any(sel_name(v) == 'BG_FilterPanel' for v in kids):
            continue
        ys = sorted(v['position']['y'] for v in kids if v.get('visual', {}).get('visualType') == 'slicer')
        gaps = [(a, b_) for a, b_ in zip(ys, ys[1:]) if round(b_ - a) != FILTER_PITCH]
        if gaps:
            fail.append("page '%s': filter panel slicers are not one after another at %d px: %s - move the ones below up "
                        "(filter-rows)" % (pages[pg]['displayName'], FILTER_PITCH,
                                           ', '.join('y %g -> %g' % (a, b_) for a, b_ in gaps)))
    # slicer-style: one slicer look, the Red one (user 2026-09-27: filter colours differ between slicers)
    for (pg, i), d in vis.items():
        if pg not in visible or d.get('visual', {}).get('visualType') != 'slicer':
            continue
        o = d['visual'].get('objects', {})
        box = {lit(((e.get('properties', {}).get('background') or {}).get('solid') or {}).get('color') or {})
               for e in o.get('items', []) if 'selector' not in e}
        bad = hexes_in(d['visual']) - {'#E8E8E8', '#2D2D2D', '#FFFFFF', '#A8161C'}
        if box != {'#E8E8E8'} or bad:
            fail.append("page '%s' slicer %s: not the Red slicer design (item box %s, other colours %s)"
                        % (pages[pg]['displayName'], sel_name(d) or i, ', '.join(sorted(x or '-' for x in box)) or '-',
                           ', '.join(sorted(bad)) or '-'))
        # one size, no hover bar, no frame-in-frame (user 01/10: "lỗi tùm lum ... sai cả size box ... trỏ chuột vào nó bị
        # mất hết chữ" - text 14 vs 9, visualHeader shown over the label, a container frame around a smaller box)
        vc_ = d['visual'].get('visualContainerObjects', {})
        size = {lit(e.get('properties', {}).get('textSize', {})) for e in o.get('items', []) if 'selector' not in e}
        hdr = lit((vc_.get('visualHeader') or [{}])[0].get('properties', {}).get('show', {}))
        frame = lit((vc_.get('background') or [{}])[0].get('properties', {}).get('show', {}))
        # the slicer's own header (objects.header) - no 'show' means ON: the field name printed again inside the box under
        # the panel's own label shape (user 13/10, 03 White: "đã dùng filter rời thì ko dc bật filter của slicer")
        own = lit((o.get('header') or [{}])[0].get('properties', {}).get('show', {}))
        if own != 'false':
            fail.append("page '%s' slicer %s: its own header is on (objects.header.show %s) - the panel label is a separate "
                        "shape, the slicer must not print the field name again (mix_builder.py --slicers) (slicer-header)"
                        % (pages[pg]['displayName'], sel_name(d) or i, own or 'unset'))
        if size != {SLICER_TEXT} or hdr != 'false' or frame != 'false':
            fail.append("page '%s' slicer %s: text size %s (must be %s), visual header %s, container frame %s - both "
                        "must be off (mix_builder.py --slicers)" % (pages[pg]['displayName'], sel_name(d) or i,
                        '/'.join(sorted(str(x) for x in size)), SLICER_TEXT, hdr or 'on', frame or 'default'))
    # target-stack + axis-invisible + row-uniform (user 2026-10-12: "doanh thu kiểu này phải làm dạng stack column" -> "thử đi, và
    # size ngang của cột phải đồng bộ với nhau"; the % axis printed white on white)
    STACKED = ('lineStackedColumnComboChart', 'stackedColumnChart', 'columnChart', 'stackedBarChart', 'barChart')
    WHITE = ('#FFFFFF', '#FFF')
    def colour(c):
        c = (c or {}).get('solid', {}).get('color', {}).get('expr', {})
        if 'ThemeDataColor' in c:
            t = c['ThemeDataColor']
            return '#FFFFFF' if t.get('ColorId') == 0 and not t.get('Percent') else 'theme'
        return str(c.get('Literal', {}).get('Value', '')).strip("'").upper()
    rows = {}
    for (pg, i), d in vis.items():
        v_ = d.get('visual', {}); vt_ = v_.get('visualType', '')
        if pg not in visible or 'query' not in v_:
            continue
        o_ = v_.get('objects', {}); qs_ = v_['query'].get('queryState', {})
        ys = [p['field'].get('Measure', {}).get('Property', '') for p in qs_.get('Y', {}).get('projections', [])]
        if vt_ in STACKED and len(ys) > 1 and any(y == 'Target' or (y.startswith('Target') and '%' not in y) for y in ys):
            fail.append("page '%s' %s %s: Target stacked on %s - the column would add them; clustered columns "
                        "-VAT / +VAT / Target side by side (target-stack)" % (pages[pg]['displayName'], vt_, sel_name(d) or i,
                                                                    ', '.join(y for y in ys if not (y == 'Target' or (y.startswith('Target') and '%' not in y)))))
        for ax in o_.get('valueAxis', [])[:1] + o_.get('categoryAxis', [])[:1]:
            pr = ax.get('properties', {})
            for show, col in (('show', 'labelColor'), ('secShow', 'secLabelColor')):
                if col in pr and lit(pr.get(show, {})) != 'false' and colour(pr[col]) in WHITE:
                    fail.append("page '%s' %s %s: %s on with labels in the background colour - turn it off (axis-invisible)"
                                % (pages[pg]['displayName'], vt_, sel_name(d) or i, show))
        if 'Column' in vt_ or vt_ == 'columnChart':
            pad = lit(o_.get('categoryAxis', [{}])[0].get('properties', {}).get('innerPadding', {})) or 'default'
            leg = lit(o_.get('legend', [{}])[0].get('properties', {}).get('show', {})) or 'true'   # unset = shown
            tab_, cur_, y_abs = None, d, d['position']['y']   # the tab the chart sits in + its y on the page
            while cur_.get('parentGroupName'):
                cur_ = vis.get((pg, cur_['parentGroupName']), {})
                y_abs += cur_.get('position', {}).get('y', 0)
                if tab_ is None and str(sel_name(cur_) or '').startswith('Tab'):
                    tab_ = cur_.get('name')
            key = (pg, tab_, round(y_abs), round(d['position']['height']))
            rows.setdefault(key, []).append((sel_name(d) or i, pad, leg))
    for (pg, _, _, _), items in rows.items():
        if len(items) < 2:
            continue
        for what, idx in (('column width (innerPadding)', 1), ('legend', 2)):
            vals = {x[idx] for x in items}
            if len(vals) > 1:
                fail.append("page '%s': charts side by side differ in %s - %s; one row = one setting (row-uniform)"
                            % (pages[pg]['displayName'], what, ', '.join('%s=%s' % (x[0], x[idx]) for x in items)))
    # title-padding (user 2026-10-12: "title phải ko dc có padding ở trên ... phải đẩy lên mới ko bị đè mất ... cuối title có 1 cục
    # màu xám" - a 12 pt title in a 25 px textbox with the default padding: the text pushed down and cut, a scroll bar at the end)
    for (pg, i), d in vis.items():
        v_ = d.get('visual', {})
        if pg not in visible or v_.get('visualType') != 'textbox' or d['position'].get('height', 99) >= TITLE_BOX_MAX:
            continue
        runs = [tr for p in v_.get('objects', {}).get('general', [{}])[0].get('properties', {}).get('paragraphs', [])
                for tr in p.get('textRuns', []) if (tr.get('value') or '').strip()]
        if not runs:
            continue
        pt = max(float(re.sub('[^0-9.]', '', tr.get('textStyle', {}).get('fontSize', '10pt')) or 10) for tr in runs)
        pad = (v_.get('visualContainerObjects', {}).get('padding') or [{}])[0].get('properties', {})
        top, bot = lit(pad.get('top', {})), lit(pad.get('bottom', {}))
        need = pt * 4 / 3 * TITLE_LINE
        h = d['position']['height']
        if top not in ('0D', '0L', '0') or bot not in ('0D', '0L', '0') or h < need:
            fail.append("page '%s' textbox %s: %g pt in %g px, padding top %s bottom %s - set padding top/bottom 0 and height >= %.0f "
                        "px, else the text is pushed down, cut and a scroll bar shows (title-padding)"
                        % (pages[pg]['displayName'], sel_name(d) or i, pt, h, top or 'default', bot or 'default', need))
    # legend-plain (user 2026-10-12: "t ko mượn legend phải mở ngoặc ... việc chú thích là nút glossary đã làm rồi") +
    # label-overlap (user 2026-10-12: data labels of two series in a 281 px quarter chart printed over each other)
    for (pg, i), d in vis.items():
        v_ = d.get('visual', {}); vt_ = v_.get('visualType', '')
        if pg not in visible or vt_ in ('textbox', 'slicer', 'shape', 'image', 'actionButton', 'tableEx', 'pivotTable',
                                         'cardVisual', 'card', 'multiRowCard'):
            continue
        qs_ = v_.get('query', {}).get('queryState', {})
        for role in ('Y', 'Y2', 'Series', 'Legend', 'Values'):
            for p in qs_.get(role, {}).get('projections', []):
                nm_ = p.get('displayName') or ''
                if '(' in nm_ or ')' in nm_:
                    fail.append("page '%s' %s %s: series name '%s' carries a bracket note - name the field only, the Glossary "
                                "explains (legend-plain)" % (pages[pg]['displayName'], vt_, sel_name(d) or i, nm_))
        if vt_ not in LABEL_CHARTS or 'Series' in qs_:
            continue
        lab_ = v_.get('objects', {}).get('labels', [])
        base = [e for e in lab_ if 'selector' not in e or 'dataViewWildcard' in json.dumps(e['selector'])]
        if not base or lit(base[0].get('properties', {}).get('show', {})) != 'true':
            continue
        off = {e['selector'].get('metadata') for e in lab_ if 'selector' in e and
               lit(e.get('properties', {}).get('showSeries', e.get('properties', {}).get('show', {}))) == 'false'}
        ys = [p['queryRef'] for p in qs_.get('Y', {}).get('projections', []) if p['queryRef'] not in off]
        cat = [p['field'].get('Column', {}).get('Property') for p in qs_.get('Category', {}).get('projections', [])]
        n_cat = CATEGORY_COUNT.get(cat[-1]) if cat else None
        if not n_cat or len(ys) < 2:
            continue
        pos_ = d['position']; span = pos_['height'] if 'Bar' in vt_ else pos_['width']
        slot = (span - LABEL_AXIS_PX) / (n_cat * len(ys))
        if slot < LABEL_PX:
            fail.append("page '%s' %s %s: %d labelled series x %d categories in %d px = %.0f px per label (< %d) - the numbers "
                        "print over each other; label one series (showSeries false on the others) or widen (label-overlap)"
                        % (pages[pg]['displayName'], vt_, sel_name(d) or i, len(ys), n_cat, span, slot, LABEL_PX))
    # filter-set (user 2026-10-01: "filter có nên làm 1 bộ chung cho mọi trang và tab ko? ... bị rối" -> one set, synced by
    # period kind): every page with a filter panel has the location slicers, the common ones synced, in the common order,
    # every box PANEL_BOX high (mix_builder.py --filter-set + page build)
    for pg in visible:
        panel = next((i for (p, i), d in vis.items() if p == pg and sel_name(d) == 'Filter_Panel'), None)
        if not panel:
            continue
        sl = sorted([d for (p, i), d in vis.items() if p == pg and d.get('visual', {}).get('visualType') == 'slicer'],
                    key=lambda d: d['position']['y'])
        # the department's own common set (pbi-gate.json 'filter_set', user 2026-10-21 in a department repo: every fixed,
        # short list the page's numbers are cut by gets a synced box) comes after the location keys
        own_set = [e for e in gate_cfg().get('filter_set', {}).get(folder, [])
                   if e.get('pages', '*') == '*' or pages[pg]['displayName'] in e.get('pages', [])]
        order = [x[0] for x in FILTER_SET] + [e['key'] for e in gate_cfg().get('filter_set', {}).get(folder, [])]

        def fkey(d):
            r = [x['queryRef'] for x in d['visual'].get('query', {}).get('queryState', {}).get('Values', {}).get('projections', [])]
            for key, refs, eq in FILTER_SET:
                if r == refs:
                    return key, True
                if r in eq:
                    return key, key in ('Year', 'Month')   # the period boxes are synced whichever date column they read
            for e in gate_cfg().get('filter_set', {}).get(folder, []):
                if r == [e['field']]:
                    return e['key'], True
            return None, False
        keys = [fkey(d) for d in sl]
        where = "page '%s' filter panel" % pages[pg]['displayName']
        miss = [k for k in FILTER_ADD if k not in {x[0] for x in keys}
                and k not in FILTER_SKIP.get(pages[pg]['displayName'], ())
                and k not in filter_skip(folder, pages[pg]['displayName'])]
        miss += ['%s (%s)' % (e['key'], e['field']) for e in own_set if e['key'] not in {x[0] for x in keys}]
        if miss:
            fail.append('%s lacks %s (add_filter_set.py)' % (where, ', '.join(miss)))
        ranks = [order.index(k) if k in order else len(order) for k, _e in keys]
        if ranks != sorted(ranks):
            fail.append("%s is not in the common order %s, then the page's own (%s) - rebuild the page"
                        % (where, ', '.join(order), ', '.join(k or 'own' for k, _e in keys)))
        for d, (k, exact) in zip(sl, keys):
            free = (k, pages[pg]['displayName']) in filter_unsynced(folder)
            grp = (d['visual'].get('syncGroup') or {}).get('groupName')
            if k and exact and not free and grp != 'FilterSet_' + k:
                fail.append("%s: slicer %s is not synced (syncGroup FilterSet_%s)" % (where, sel_name(d), k))
            if k and free and grp:
                fail.append("%s: slicer %s must stay OUT of the sync group (pbi-gate.json filter_unsynced - Legacy selects nothing here)"
                            % (where, sel_name(d)))
            if k == 'Month' and exact:
                vals = [x.get('Literal', {}).get('Value')
                        for e in d['visual'].get('objects', {}).get('general', [])
                        for c in (e.get('properties', {}).get('filter', {}).get('filter', {}).get('Where', []))
                        for row in c.get('Condition', {}).get('In', {}).get('Values', []) for x in row]
                if free and vals:
                    fail.append("%s: month slicer preselects %s - this page selects nothing (Legacy: the year shows)"
                                % (where, ', '.join(vals)))
                elif not free and vals and vals != [MONTH_ROLLING]:
                    fail.append("%s: month slicer is pinned to %s - select %s so the page rolls to the newest month"
                                % (where, ', '.join(vals), MONTH_ROLLING))
            if d['position']['height'] != PANEL_BOX:
                fail.append('%s: slicer %s is %s px high - every box is %d (one geometry on every page)'
                            % (where, sel_name(d), d['position']['height'], PANEL_BOX))
    check_pct(report_dir, folder, pages, visible, vis, fail)
    check_pct_decided(report_dir, folder, pages, visible, vis, fail)
    check_compare_slicers(pages, visible, vis, fail)
    check_axis_cap(pages, visible, vis, fail)
    check_button_over_table(pages, visible, vis, fail)
    # open-page: the file opens on the first page (Desktop Save writes the page being viewed as activePageName)
    pj = json.load(open(os.path.join(d_def, 'pages', 'pages.json'), encoding='utf-8'))
    # overview-first (user 14/10: "trang overview phải luôn ở đầu")
    ov_ = [p_ for p_ in pj.get('pageOrder', []) if p_ in visible and pages[p_].get('displayName') == 'Overview']
    first_ = next((p_ for p_ in pj.get('pageOrder', []) if p_ in visible), None)
    if ov_ and first_ != ov_[0]:
        fail.append("page 'Overview' is not the first page (first is '%s') - Overview always opens the report (overview-first)"
                    % pages[first_]['displayName'])
    if pj.get('pageOrder') and pj.get('activePageName') != pj['pageOrder'][0]:
        fail.append("pages.json activePageName = '%s' - the file must open on the first page '%s'"
                    % (pages.get(pj.get('activePageName'), {}).get('displayName'), pages[pj['pageOrder'][0]]['displayName']))
    # display-option: the same display mode as page 1 (FitToWidth) - ActualSize shows scrollbars (user 2026-09-26)
    for p in visible:
        if pages[p].get('displayOption') != 'FitToWidth':
            fail.append("page '%s' displayOption=%s - White uses FitToWidth like page 1 (ActualSize shows scrollbars)"
                        % (pages[p]['displayName'], pages[p].get('displayOption')))
    # tab-big-charts: do not cram 4 BIG charts (height >= 250) into one tab/screen (user 2026-09-26)
    kids = {}
    for (pg, i), d in vis.items():
        if d.get('parentGroupName'):
            kids.setdefault((pg, d['parentGroupName']), []).append(i)
    for (pg, i), d in vis.items():
        if pg not in visible or 'visualGroup' not in d:
            continue
        nmg = str(sel_name(d) or '')
        par = vis.get((pg, d.get('parentGroupName')), {})
        if not (nmg.startswith('Tab') or (nmg == 'Chart' and not d.get('parentGroupName'))):
            continue
        big = []
        for k in kids.get((pg, i), []):
            g = vis[(pg, k)]
            # big = tall AND wider than half the tab: a 2 x 2 grid of half-width charts (the Ori layout) is not crammed
            if 'visualGroup' not in g or g['position'].get('height', 0) < BIG_CHART_H or g['position'].get('width', 0) <= 640:
                continue
            # pie / donut / treemap / funnel show a few parts of a whole: low-content, they are SHRUNK and grouped, not
            # spread over tabs (user 01/10 supreme rule: optimise space - 6 Product pies share one tab)
            if any(vis[(pg, c)].get('visual', {}).get('visualType') in ('pieChart', 'donutChart', 'treemap', 'funnel')
                   for c in kids.get((pg, k), [])):
                continue
            if any(str(sel_name(vis[(pg, c)]) or '').startswith('BG_') for c in kids.get((pg, k), [])):
                big.append(str(sel_name(g)))
        if len(big) >= 4:
            fail.append("page '%s' %s crams %d big charts (%s) - at most 3, move the rest to another tab"
                        % (pages[pg]['displayName'], nmg, len(big), ', '.join(big)))
    # scroll-alone (user 2026-10-01: "mọi cái scroll bar quá lớn đặc biệt là matrix đều phải tách nằm riêng 1 tab"):
    # a table whose content is >= SCROLL_BIG x its frame (either way) is the ONLY block of its tab
    mm_sa = model_measures(report_dir)
    for (pg, i), d in vis.items():
        if pg not in visible or 'visualGroup' not in d or not str(sel_name(d) or '').startswith('Tab'):
            continue
        def has_data(g):          # a block of only text / shapes (a note under a table) is not crowding it
            st, seen_ = [g], False
            while st and not seen_:
                for c in kids.get((pg, st.pop()), []):
                    vt_ = vis[(pg, c)].get('visual', {}).get('visualType')
                    if 'visualGroup' in vis[(pg, c)]:
                        st.append(c)
                    elif vt_ and vt_ not in ('textbox', 'shape', 'image', 'actionButton'):
                        seen_ = True
            return seen_
        blocks = [k for k in kids.get((pg, i), []) if 'visualGroup' in vis[(pg, k)] and has_data(k)]
        if len(blocks) < 2:
            continue
        stack, leaves = list(blocks), []
        while stack:
            k = stack.pop()
            for c in kids.get((pg, k), []):
                (stack if 'visualGroup' in vis[(pg, c)] else leaves).append(c)
        for c in leaves:
            r = table_scroll_ratio(vis[(pg, c)], mm_sa)
            # only a table that scrolls a lot DOWN is 'full of information' and takes a tab (user 01/10: "cuộn nhiều và chứa
            # đầy thông tin, thì tab riêng"); a few-row table that only scrolls sideways shares a tab
            if r and r[1] >= SCROLL_BIG:
                fail.append("page '%s' %s: table '%s' scrolls a lot (%.1fx wide, %.1fx tall) but shares the tab with "
                            "%d other block(s) - a big-scroll table sits ALONE in its own tab (skill pbi-white 5l-bis)"
                            % (pages[pg]['displayName'], sel_name(d), sel_name(vis[(pg, c)]) or c, r[0], r[1],
                               len(blocks) - 1))
    # tab-hole (user 2026-10-08, Delivery: "cái 1 group lệch kì vậy" - DeliveryAM ended 120 px above its row neighbour and
    # the gate saw nothing): inside a tab, every 10x10 px spot is covered by some block; the 5 px gutters fit no 10x10
    for (pg, i), d in vis.items():
        if pg not in visible or 'visualGroup' not in d or not re.match(r'Tab\d', str(sel_name(d) or '')):
            continue
        W, H = int(d['position']['width']) // 5, int(d['position']['height']) // 5
        cov = [[False] * W for _ in range(H)]
        for c in kids.get((pg, i), []):
            p = vis[(pg, c)]['position']
            # floor the start, ceil the end: an equal split lands off the grid (x 318.75 w 313.75) and int() made the 5 px
            # gap between two such blocks read as a 10 px hole (a department repo 09/10)
            x0, y0 = int(math.floor(p.get('x', 0) / 5)), int(math.floor(p.get('y', 0) / 5))
            x1 = int(math.ceil((p.get('x', 0) + p.get('width', 0)) / 5))
            y1 = int(math.ceil((p.get('y', 0) + p.get('height', 0)) / 5))
            for yy in range(max(0, y0), min(H, y1)):
                row = cov[yy]
                for xx in range(max(0, x0), min(W, x1)):
                    row[xx] = True
        holes = [(xx, yy) for yy in range(H - 1) for xx in range(W - 1)
                 if not (cov[yy][xx] or cov[yy][xx + 1] or cov[yy + 1][xx] or cov[yy + 1][xx + 1])]
        if holes:
            xs, ys = [h[0] for h in holes], [h[1] for h in holes]
            # a one-series chart in the tab cannot be stretched to close the hole: chart-size holds it at CHART_ONE_H (a
            # department repo 20/10, Monthly Franchise / Summary: an area chart of one measure beside a two-measure line)
            def leaves(c):
                sub = kids.get((pg, c))
                return [x for k in sub for x in leaves(k)] if sub else [c]
            held = [sel_name(vis[(pg, c)]) or c for c in leaves(i) if one_series_chart(vis[(pg, c)])]
            fail.append("page '%s' %s: a hole no block covers, about x %d-%d y %d-%d - %s (skill pbi-white 5l-bis rule 0)"
                        % (pages[pg]['displayName'], sel_name(d), min(xs) * 5, (max(xs) + 2) * 5, min(ys) * 5, (max(ys) + 2) * 5,
                           "blocks of one row end on the same bottom and fill the tab; %s shows one series, so chart-size "
                           "holds it at %d px - give it a second series (last year), put other content under it, or move "
                           "it to a tab with other content" % (', '.join(held), CHART_ONE_H) if held
                           else "blocks of one row end on the same bottom and fill the tab"))
    # narrow-table (user 2026-10-08, Promotion quantity tab: a ~300 px table alone in a 1260 px frame): a table narrower
    # short of its frame by more than FILL_SLACK leaves the right side empty - widen its columns (mix_builder --fit-columns)
    for (pg, i), d in vis.items():
        if pg not in visible:
            continue
        v_ = d.get('visual', {})
        if v_.get('visualType') in ('pivotTable', 'tableEx'):
            if matrix_fitted(d):
                continue
            ch_ = [e.get('properties', {}) for e in v_.get('objects', {}).get('columnHeaders', []) if 'selector' not in e]
            grow = any(lit(e.get('columnAdjustment', {})) == 'growToFit' and lit(e.get('autoSizeColumnWidth', {})) != 'false' for e in ch_)
            plan = column_plan(d)
            if plan is not None:
                # header-wrap (user 14/10: "title quá dài ntn thì phải cắt ra 2 dòng ... mọi bảng luôn"): long headers ->
                # fixed widths from column_plan, auto-size off (it would lay each header on one line again)
                auto = any(lit(e.get('autoSizeColumnWidth', {})) == 'true' for e in ch_)
                cur = {e.get('selector', {}).get('metadata'): float(lit(e['properties']['value']).rstrip('D'))
                       for e in v_.get('objects', {}).get('columnWidth', [])
                       if e.get('selector', {}).get('metadata') and lit(e.get('properties', {}).get('value', {}))}
                rowq = set(q for q, _, r in table_headers(d) if r == 'row' or not q.startswith('#Measure.'))   # text columns: dw rule row-wrap
                off = [q for q, w in plan.items() if q not in rowq and abs(cur.get(q, -99) - w) > 1]
                if auto or off:
                    fail.append("page '%s' %s '%s': a header is longer than %d px on one line - fixed widths, long headers on "
                                "two lines, spread to the frame: %s (mix_builder.py --grow-to-fit, or measure it: matrix_fit.py) (header-wrap)"
                                % (pages[pg]['displayName'], v_.get('visualType'), sel_name(d) or i, HEADER_WRAP,
                                   'auto-size is on' if auto else '%d column(s) off the formula, e.g. %s' % (len(off), off[0])))
                continue
            if not grow:
                fail.append("page '%s' %s '%s': Auto-size behaviour is not Grow to fit - the columns stop short of the frame "
                            "whenever the data brings fewer columns (mix_builder.py --grow-to-fit, or measure it: matrix_fit.py) (narrow-table)"
                            % (pages[pg]['displayName'], v_.get('visualType'), sel_name(d) or i))
            continue
        r = table_overflow(d, mm_sa)
        if r and r[1] >= 400 and r[0] < r[1] - FILL_SLACK:
            fail.append("page '%s' table '%s' fills ~%dpx of its %dpx frame - widen its columns to the frame "
                        "(mix_builder.py --fit-columns <page> <visual>) or give the room to another block"
                        % (pages[pg]['displayName'], sel_name(d) or i, r[0], r[1]))
    # panel-label (user 2026-10-08: the Day slicer of Daily sat under a label reading 'Area Manager'): the label right
    # above a slicer in the filter panel says that slicer's field caption
    for (pg, i), d in vis.items():
        if pg not in visible or str(sel_name(d) or '') != 'Filter_Panel':
            continue
        ch = [vis[(pg, c)] for c in kids.get((pg, i), [])]
        labels = [v for v in ch if v.get('visual', {}).get('visualType') == 'shape' and title_shown(v)
                  and v['position'].get('height', 0) <= 30 and v['position'].get('y', 0) >= 60]
        for s in ch:
            if s.get('visual', {}).get('visualType') != 'slicer':
                continue
            pr = s['visual'].get('query', {}).get('queryState', {}).get('Values', {}).get('projections', [])
            above = [l for l in labels if abs(l['position']['y'] + l['position']['height'] - s['position']['y']) <= 1]
            if not pr or not above:
                continue
            norm = lambda t: re.sub(r'\W', '', str(t)).lower()
            names = {norm(p.get('displayName') or '') for p in pr} | {norm(p['queryRef'].split('.', 1)[1]) for p in pr}
            for grp in PANEL_ALIASES:
                if names & grp:
                    names |= grp
            txt = str(sel_name(above[0]) or '')
            if norm(txt) not in names:
                fail.append("page '%s' filter panel: the label above slicer '%s' reads '%s' - not this slicer's field "
                            "(%s); the labels slid onto the wrong slicers" % (pages[pg]['displayName'],
                            sel_name(s) or s['name'], txt, ', '.join(p['queryRef'] for p in pr)))
    # axis-scroll / long-chart (user 2026-09-26): no chart may show a scrollbar by itself;
    # long charts (>= 28 categories on the axis) at most 2 blocks per tab, stacked top/bottom.
    long_by_tab = {}
    for (pg, i), d in vis.items():
        if pg not in visible or 'visualGroup' in d:
            continue
        est = axis_scroll(d, month_cut(pages, vis, pg, i))
        if not est:
            continue
        n, need, room, field = est
        if need > room:
            fail.append("page '%s' chart %s WILL SCROLL: %d categories %s x %dpx = %dpx > plot area %dpx - widen the chart"
                        % (pages[pg]['displayName'], sel_name(d) or i, n, field, need // n, need, room))
        if n >= LONG_AXIS_N:
            ca = {k: lit(x) for e in d['visual'].get('objects', {}).get('categoryAxis', [])
                  for k, x in e.get('properties', {}).items()}
            if ca.get('concatenateLabels') != 'true':
                fail.append("page '%s' long chart %s: the X axis must set concatenateLabels=true (labels are not broken up)"
                            % (pages[pg]['displayName'], sel_name(d) or i))
            grp, tab = d.get('parentGroupName'), None
            cur = d
            while cur.get('parentGroupName'):
                par = vis.get((pg, cur['parentGroupName']), {})
                if str(sel_name(par) or '').startswith('Tab') or (str(sel_name(par) or '') == 'Chart' and not par.get('parentGroupName')):
                    tab = cur['parentGroupName']
                    break
                grp = cur['parentGroupName']
                cur = par
            long_by_tab.setdefault((pg, tab), set()).add(grp)
    for (pg, i), d in vis.items():
        if pg not in visible or 'visualGroup' in d or matrix_fitted(d):
            continue
        est = matrix_scroll(d)
        ex = gate_cfg().get('matrix_exempt', {}).get(folder, {})
        why = ex.get(i) or ex.get(str(sel_name(d) or ''))
        if est and est[1] > est[2] and why:
            MATRIX_WARN.append("table %s exempt from matrix-scroll: %s" % (sel_name(d) or i, why))
            continue
        if est and est[1] > est[2]:
            fail.append("page '%s' table %s WILL SCROLL SIDEWAYS: %d columns (%s x measures) ~ %dpx > frame %dpx - "
                        "add the filter ~Recent <N> <Days|Weeks|Months> = 1, valuesOnRow, or pivot the table"
                        % (pages[pg]['displayName'], sel_name(d) or i, est[0], est[3], est[1], est[2]))
    # table-overflow (user 2026-09-29): a SHORT overflow is fixed by widening / moving blocks, never left scrolling
    mm_o = model_measures(report_dir)
    for (pg, i), d in vis.items():
        if pg not in visible or 'visualGroup' in d or matrix_scroll(d) or matrix_fitted(d):
            continue
        est = table_overflow(d, mm_o)
        if not est or est[0] <= est[1]:
            continue
        ex = gate_cfg().get('matrix_exempt', {}).get(folder, {})
        why = ex.get(i) or ex.get(str(sel_name(d) or ''))
        if why:
            MATRIX_WARN.append("table %s exempt from table-overflow: %s" % (sel_name(d) or i, why))
            continue
        fail.append("page '%s' table %s WILL SCROLL SIDEWAYS: columns ~%dpx (%s) > frame %dpx - widen the frame or "
                    "move blocks so it fits; only a truly long table may scroll (matrix_exempt + reason)"
                    % (pages[pg]['displayName'], sel_name(d) or i, est[0], '+'.join(map(str, est[2])), est[1]))
    # matrix-style (user 2026-09-30: "matrix đang quá xấu, ko có cả header bold, màu header, rồi màu condition - phải đưa
    # vào luật và skill áp dụng cho mọi matrix"): one look for every pivot / table (skill pbi-white 4l)
    def colr(x):
        try:
            return x['solid']['color']['expr']['Literal']['Value'].strip("'").upper()
        except Exception:
            return None
    neutral_m = gate_cfg().get('pct_neutral', {}).get(folder, {})
    for (pg, i), d in vis.items():
        v = d.get('visual', {})
        if pg not in visible or v.get('visualType') not in ('pivotTable', 'tableEx'):
            continue
        o = v.get('objects', {})
        pl = lambda name: next((e.get('properties', {}) for e in o.get(name, []) if 'selector' not in e), {})
        h, bad = pl('columnHeaders'), []
        if lit(h.get('bold', {})) != 'true':
            bad.append('header not bold')
        if colr(h.get('backColor')) != '#44546A' or colr(h.get('fontColor')) != '#FFFFFF':
            bad.append('header not white on #44546A')
        if not pl('values').get('backColorSecondary'):
            bad.append('rows not banded')
        # title like every chart (user 01/10): shown, left, 12D, #2D2D2D, no title background, a READER text
        tp = (v.get('visualContainerObjects', {}).get('title') or [{}])[0].get('properties', {})
        ttxt = lit(tp.get('text', {})) or ''
        if lit(tp.get('show', {})) != 'true' or lit(tp.get('fontSize', {})) != '12D' or lit(tp.get('alignment', {})) != 'left' \
                or colr(tp.get('fontColor')) != '#2D2D2D' or 'background' in tp:
            bad.append('title not in the chart style (shown, left, 12D, #2D2D2D, no background)')
        if re.match(r'^[A-Z][A-Za-z0-9]*_', ttxt):
            bad.append("title shows the technical name '%s' - give it a reader title (mix_specs.MATRIX_TITLES)" % ttxt)
        if v['visualType'] == 'pivotTable' and lit(pl('subTotals').get('bold', {})) != 'true':
            bad.append('totals not bold')
        # a column colour counts only with the cell scope Desktop writes (740/740: data = dataViewWildcard matchingOption 1);
        # 'metadata' alone is kept by Desktop but never drawn - DSR 01/10 had 42 such % columns, all black, gate green
        cond = [e for e in o.get('values', []) if e.get('selector', {}).get('metadata')
                and 'Conditional' in json.dumps(e.get('properties', {}).get('fontColor', {}))]
        coloured = {e['selector']['metadata'] for e in cond
                    if any(x.get('dataViewWildcard', {}).get('matchingOption') == 1 for x in e['selector'].get('data', []))}
        unscoped = {e['selector']['metadata'] for e in cond} - coloured
        for p in v.get('query', {}).get('queryState', {}).get('Values', {}).get('projections', []):
            q = p['queryRef']
            if not q.startswith('#Measure.'):
                continue
            m = mm_o.get(q.split('.', 1)[1]) or {}
            if '%' in (m.get('fmt') or '') and q.split('.', 1)[1] not in neutral_m and m.get('wraps') not in neutral_m \
                    and q not in coloured:
                bad.append('%% column %s has no up/down colour%s' % (p.get('displayName') or q.split('.', 1)[1],
                           ' (its rule has no data scope, Desktop never draws it)' if q in unscoped else ''))
        if bad:
            fail.append("page '%s' matrix %s breaks the matrix look: %s - run scripts/mix_palette.py --matrices"
                        % (pages[pg]['displayName'], sel_name(d) or i, '; '.join(bad)))
    # 01/10 "mấy cái skill đều phải lên script dò dc hết": the remaining skill rules of pbi-white 4k / 4l as machine checks
    # theme-standard: the report's theme carries the company theme's data colours (Theme1 of the Original template)
    std = region_path(report_dir, 'theme_file')
    mine = glob.glob(os.path.join(report_dir, '*.Report', 'StaticResources', 'RegisteredResources', os.path.basename(std)))
    if os.path.exists(std) and mine:
        s_t = json.load(open(std, encoding='utf-8-sig'))
        m_t = json.load(open(mine[0], encoding='utf-8-sig'))
        norm = lambda x: [str(c).upper() for c in x] if isinstance(x, list) else str(x).upper()
        for k in ('dataColors', 'good', 'neutral', 'bad'):
            a_, b_ = m_t.get(k), s_t.get(k)
            if norm(a_) != norm(b_):
                fail.append("theme %s = %s - the company theme (the region manager/assets/theme/the region theme file) has %s (skill pbi-white 4k)"
                            % (k, a_, b_))
    compare_rx = re.compile(r'(\bLY\b|\bLM\b|LMTD|\bLW\b|\bPY\b|Last|Previous|Target|\bTG\b)')
    for (pg, i), d in vis.items():
        v = d.get('visual', {})
        vt = v.get('visualType', '')
        if pg not in visible:
            continue
        where = "page '%s' %s" % (pages[pg]['displayName'], sel_name(d) or i)
        q = v.get('query', {}).get('queryState', {})
        o = v.get('objects', {})
        # topn-column: a Top / Bottom N chart is a vertical column chart (user 01/10 "mẫu này nên là chart dọc")
        if vt == 'clusteredBarChart' and re.match(r'(?i)(top|bottom) ?\d', str(sel_name(d) or '')):
            fail.append('%s: a Top/Bottom N chart drawn as horizontal bars - it is a column chart (mix_palette.py --bars-to-columns)'
                        % where)
        # matrix-grid: horizontal lines only (pbi-white 4l)
        if vt in ('pivotTable', 'tableEx'):
            g = next((e.get('properties', {}) for e in o.get('grid', []) if 'selector' not in e), {})
            if lit(g.get('gridVertical', {})) != 'false':
                fail.append('%s: matrix grid draws vertical lines - horizontal lines only (mix_palette.py --matrices)' % where)
        if 'Chart' not in vt or q.get('Series'):
            continue
        axis = [p['queryRef'] for r in ('Y', 'Values') for p in q.get(r, {}).get('projections', [])]
        y2 = [p['queryRef'] for p in q.get('Y2', {}).get('projections', [])]
        dp = o.get('dataPoint', [])
        # compare-grey: an amount named LY / LM / target is drawn grey (#A2A2A2, a second one #595959; 3-4 comparisons on one
        # chart add #7F7F7F / #3F3F3F - user 2026-10-08), never a theme slot
        for qr in axis + y2:
            name = qr.split('.', 1)[-1]
            if name.startswith('%') or not compare_rx.search(name):
                continue
            ent = next((e for e in dp if e.get('selector', {}).get('metadata') == qr and 'fill' in e.get('properties', {})), None)
            if ent is None and len(axis) == 1 and qr == axis[0]:
                ent = next((e for e in dp if not e.get('selector') and 'fill' in e.get('properties', {})), None)
            fc = json.dumps(ent['properties']['fill']) if ent else ''
            if ent and not re.search(r"'#(A2A2A2|7F7F7F|595959|3F3F3F)'", fc, re.I):
                fail.append("%s: comparison series '%s' is not grey #A2A2A2 / #7F7F7F / #595959 / #3F3F3F (skill pbi-white 4k)"
                            % (where, name))
        # pct-label: the % line labels are bold, above the point, without a box (a box hid the line - user 01/10)
        for qr in y2:
            if not qr.split('.', 1)[-1].startswith('%'):
                continue
            ent = next((e for e in o.get('labels', []) if e.get('selector', {}).get('metadata') == qr
                        and 'Conditional' in json.dumps(e.get('properties', {}).get('color', {}))), None)
            if ent is None:
                continue
            lab = ent.get('properties', {})
            # per-point scope: metadata alone = the measure evaluated ONCE for the series -> every label red
            if not any(x.get('dataViewWildcard', {}).get('matchingOption') == 1 for x in ent['selector'].get('data', [])):
                fail.append("%s: %% label '%s' colour rule has no data scope (dataViewWildcard) - Power BI colours every "
                            "label from ONE value (mix_palette.per_point)" % (where, qr.split('.', 1)[-1]))
            # series-level keys sit in the METADATA-ONLY entry (Desktop: bold 37x, enableBackground 106x there); in the
            # per-point entry Power BI ignores them - 01/10 the labels lost bold and showed the default box again
            if any(k in lab for k in ('bold', 'enableBackground', 'labelPosition', 'backgroundColor')):
                fail.append("%s: %% label '%s' carries bold / box / position in its per-point colour entry - Power BI "
                            "ignores them there; they belong to the metadata-only entry (mix_palette.py)"
                            % (where, qr.split('.', 1)[-1]))
            st_ = next((e.get('properties', {}) for e in o.get('labels', []) if e.get('selector') == {'metadata': qr}), {})
            if lit(st_.get('bold', {})) != 'true' or lit(st_.get('labelPosition', {})) != 'Above' \
                    or lit(st_.get('enableBackground', {})) != 'false':
                fail.append("%s: %% label '%s' must be bold, labelPosition Above, enableBackground false in its "
                            "metadata entry (mix_palette.py)" % (where, qr.split('.', 1)[-1]))
    # card-icon (user 2026-10-01): every KPI card carries an icon on its right - a SQUARE 5 px in from the visible card
    # (its BG_), the colour of the card's value, drawn from the icon library at the ~17.5 px stroke mark (skill pbi-white 4m)
    reg_dir = glob.glob(os.path.join(report_dir, '*.Report', 'StaticResources', 'RegisteredResources'))
    reg_items = set()
    for rp in json.load(open(os.path.join(d_def, 'report.json'), encoding='utf-8')).get('resourcePackages', []):
        if rp.get('name') == 'RegisteredResources':
            reg_items = {x.get('name') for x in rp.get('items', [])}
    lib = region_path(report_dir, 'icons_dir')
    thick_seen = {}
    for (pg, i), d in vis.items():
        v = d.get('visual', {})
        nm = str(sel_name(d) or '')
        if pg not in visible or v.get('visualType') != 'cardVisual' or not nm.startswith('Card_'):
            continue
        par = d.get('parentGroupName')
        sib = {str(sel_name(x) or ''): x for (pg2, _), x in vis.items() if pg2 == pg and x.get('parentGroupName') == par}
        bg = next((x for k, x in sib.items() if k.startswith('BG_')), None)
        ic = sib.get('Image_' + nm[5:])
        where = "page '%s' card %s" % (pages[pg]['displayName'], nm)
        if not bg:
            continue
        if not ic:
            fail.append('%s has no icon (Image_%s) - run scripts/card_icons.py place' % (where, nm[5:]))
            continue
        p, q = bg['position'], ic['position']
        s = int(5 * ((0.6 * (p['height'] - 10)) // 5))   # top-right square, 60% of full height (user 01/10)
        if (q['width'], q['height']) != (s, s) or q['x'] != p['x'] + p['width'] - 5 - s or q['y'] != p['y'] + 5:
            fail.append('%s: icon frame %sx%s at (%s,%s) - it must be a %sx%s square anchored top-right 5 px in (%s,%s)'
                        % (where, q['width'], q['height'], q['x'], q['y'], s, s, p['x'] + p['width'] - 5 - s, p['y'] + 5))
        for k2, x2 in sib.items():            # the % line (row 3) must start at least 5 px below the icon
            if k2.startswith('Pct_') and x2['position']['y'] < q['y'] + q['height'] + 5 and \
                    x2['position']['x'] + x2['position']['width'] > q['x']:
                fail.append('%s: %s (y=%s) touches the icon (bottom y=%s) - row 3 must clear it by 5 px'
                            % (where, k2, x2['position']['y'], q['y'] + q['height']))
        for k2, x2 in sib.items():            # text of the card must stop 5 px before the icon, never run under it
            if k2 == nm and x2['position']['x'] + x2['position']['width'] > q['x'] - 5:
                fail.append('%s: %s runs to x=%s, under its icon at x=%s - stop it 5 px before (card_icons.py place)'
                            % (where, k2, x2['position']['x'] + x2['position']['width'], q['x']))
        item = re.search(r'"ItemName": "([^"]+)"', json.dumps(ic.get('visual', {}).get('objects', {})))
        item = item.group(1) if item else None
        if not item or item not in reg_items or not (reg_dir and os.path.exists(os.path.join(reg_dir[0], item))):
            fail.append('%s: icon image %s is not registered / not on disk' % (where, item))
            continue
        m = re.match(r'^(.+)_([0-9a-f]{6})\.png$', item)
        vc = re.search(r'"ColorId": (\d+)', json.dumps([e.get('properties', {}).get('fontColor') for e in v.get('objects', {}).get('value', [])]))
        th = [c.upper() for c in (json.load(open(glob.glob(os.path.join(report_dir, '*.Report', 'StaticResources',
              'RegisteredResources', os.path.basename(region_path(report_dir, 'theme_file'))))[0], encoding='utf-8-sig')).get('dataColors') or [])] if reg_dir else []
        want = th[int(vc.group(1)) - 2] if vc and th and 2 <= int(vc.group(1)) < 2 + len(th) else None
        if not m or (want and '#' + m.group(2).upper() != want):
            fail.append('%s: icon colour %s is not the card value colour %s' % (where, m.group(2) if m else item, want))
        if m and os.path.isdir(lib):
            base = os.path.join(lib, m.group(1) + '.png')
            if base not in thick_seen:
                try:
                    from PIL import Image
                    import numpy as np
                    a = np.array(Image.open(base).convert('RGBA'))[:, :, 3] > 127
                    pad = np.pad(a, 1)
                    inner = pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
                    thick_seen[base] = 2.0 * a.sum() / max(int((a & ~inner).sum()), 1)
                except Exception:
                    thick_seen[base] = None
            tk = thick_seen[base]
            if tk is not None and not 17.0 <= tk <= 18.0:
                fail.append('%s: icon %s stroke %.1f px - the library mark is 17.0-18.0 px on 512' % (where, m.group(1), tk))
    # tab-label (user 2026-09-29): short labels, cut-off text is a defect
    for (pg, i), d in vis.items():
        if pg not in visible or not str(sel_name(d) or '').startswith('BT_Tab'):
            continue
        for t in set(tab_labels(d)):
            if G_w(t) + TAB_TEXT_PAD > d['position']['width']:
                fail.append("page '%s' tab label '%s' needs %d px (text %.0f + %d) but the tab is %s - Desktop cuts it to '…' "
                            "(widen tabw in mix_specs or a shorter word)" % (pages[pg]['displayName'], t,
                            grid5(G_w(t) + TAB_TEXT_PAD), G_w(t), TAB_TEXT_PAD, d['position']['width']))
            if len(t) > TAB_LABEL_MAX:
                fail.append("page '%s' tab label '%s' has %d characters - at most %d, find a shorter natural word"
                            % (pages[pg]['displayName'], t, len(t), TAB_LABEL_MAX))
            if not t.isascii():
                fail.append("page '%s' tab label '%s' is not English - tabs, pages, titles and column names are English, only "
                            "data values stay Vietnamese (ui-english)" % (pages[pg]['displayName'], t))
            # tab-case (user 2026-10-14: "chuẩn cho toàn bộ tên tab là phải viết hoa chữ đầu hết ... ko có gì lúc Tổng quan rồi Nhân Viên")
            low = [w for w in t.split() if w[:1].isalpha() and not w[:1].isupper()]
            if low:
                fail.append("page '%s' tab label '%s': %s not capitalised - every word starts with a capital (tab-case)"
                            % (pages[pg]['displayName'], t, ', '.join("'%s'" % w for w in low)))
            # tab-page-name (user 2026-10-14: page Overview with a tab Overview read twice - a word names a page OR a tab)
            clash = [pages[p]['displayName'] for p in visible if str(pages[p].get('displayName', '')).strip().lower() == t.strip().lower()]
            if clash:
                fail.append("page '%s' tab label '%s' is also a page name - a word belongs to a page or to a tab, never both "
                            "(rename the tab, e.g. the first tab is 'Summary') (tab-page-name)" % (pages[pg]['displayName'], t))
    for pg in visible:
        if not str(pages[pg].get('displayName', '')).isascii():
            fail.append("page '%s': page name is not English (ui-english)" % pages[pg]['displayName'])
    # sort-order (user 2026-10-14: "cái dashboard ở dưới phải xếp từ cao xuống thấp chứ" - the chart sorted on a measure it no
    # longer showed, Desktop dropped the sort and the bars came out in no order)
    for (pg, i), d in vis.items():
        v_ = d.get('visual', {})
        if pg not in visible or 'query' not in v_:
            continue
        qs_ = v_['query'].get('queryState', {})
        own = set()
        for q_ in qs_.values():
            for p in q_.get('projections', []):
                f_ = p.get('field', {}); k_ = next(iter(f_), None)
                if k_ in ('Measure', 'Column', 'Aggregation', 'HierarchyLevel'):
                    own.add(json.dumps(f_.get(k_, {}).get('Property') or f_, sort_keys=True))
        srt = v_['query'].get('sortDefinition', {}).get('sort', [])
        where = "page '%s' %s %s" % (pages[pg]['displayName'], v_.get('visualType'), sel_name(d) or i)
        for x in srt:
            f_ = x.get('field', {}); k_ = next(iter(f_), None)
            prop = f_.get(k_, {}).get('Property') if k_ else None
            if prop and json.dumps(prop, sort_keys=True) not in own:
                fail.append("%s: sorted on '%s', which is not one of its fields - Desktop drops that sort; sort on a shown "
                            "field (sort-order)" % (where, prop))
        if v_.get('visualType') in ('clusteredBarChart', 'barChart'):
            cats = [p['field'].get('Column', {}) for p in qs_.get('Category', {}).get('projections', [])]
            if cats and all(c.get('Expression', {}).get('SourceRef', {}).get('Entity') != 'Dim_Date' for c in cats):
                ok = any('Measure' in x.get('field', {}) and x.get('direction') == 'Descending' for x in srt)
                if not ok:
                    fail.append("%s: bars by category must run from the largest value down - sort Descending on the main "
                                "measure (sort-order)" % where)
    # chart-width (user 2026-10-02: "rõ ràng dashboard là cột, thứ bị dư là chiều ngang ... m lại đi nhét thêm 1 chart ở dưới
    # nữa, bóp nhỏ thêm chiều dọc rồi làm trống thêm chiều ngang"): a chart is as wide as its categories need, charts with
    # room to spare sit SIDE BY SIDE; a day axis is continuous (Scalar) so 31 days fit half a tab
    def tab_blocks(pg, d):
        cur = d
        while cur.get('parentGroupName'):
            par = vis.get((pg, cur['parentGroupName']), {})
            if str(sel_name(par) or '').startswith('Tab'):
                return [k for (p2, k), x in vis.items() if p2 == pg and x.get('parentGroupName') == cur['parentGroupName']
                        and 'visualGroup' in x]
            cur = par
        return []
    for (pg, i), d in vis.items():
        if pg not in visible or 'visualGroup' in d:
            continue
        cn = chart_need(d, month_cut(pages, vis, pg, i))
        if not cn:
            continue
        need, n, field, scalar = cn
        where = "page '%s' chart %s" % (pages[pg]['displayName'], sel_name(d) or i)
        vt = d['visual'].get('visualType')
        ncat = len(d['visual'].get('query', {}).get('queryState', {}).get('Category', {}).get('projections', []))
        # a Month > Day hierarchy (a campaign crossing months) cannot be Scalar: it stays categorical and wide
        if field == 'Day' and not scalar and vt != 'ribbonChart' and ncat == 1:
            fail.append("%s: day axis is categorical - set categoryAxis axisType 'Scalar' (31 days in ~%d px, no scroll) "
                        "so it can sit beside another chart (mix_palette.py --scalar-days)"
                        % (where, AXIS_PX + 31 * SCALAR_PX))
            continue
        w = d['position']['width']
        # a reason in pbi-gate.json chart_width_exempt turns it into a warning (user 2026-10-05: Bottom 5 Bad Selling gets
        # 2 cells because combo names are long - the gate cannot see label length, only the category count)
        ex = gate_cfg().get('chart_width_exempt', {}).get(folder, {})
        why = ex.get(i) or ex.get(str(sel_name(d) or ''))
        if w > max(WIDTH_SLACK * need, MIN_CHART_W) and len(tab_blocks(pg, d)) > 1 and why:
            MATRIX_WARN.append("chart %s exempt from chart-width: %s" % (sel_name(d) or i, why))
        elif w > max(WIDTH_SLACK * need, MIN_CHART_W) and len(tab_blocks(pg, d)) > 1:
            fail.append("%s: %d %s on %s px - its categories need ~%d px; put it beside another chart instead of "
                        "stretching it (skill pbi-white 5l-bis item 0)" % (where, n, field, w, need))
    # donut-shape (user 13/10, 01 Monthly: "bạn để donut dài dọc cả 2 hàng làm cho donut group bị trắng"): a pie / donut is
    # round - in a block much taller than wide the ring takes the width and the rest is white; it sits in ONE row
    for (pg, i), d in vis.items():
        if pg in visible and d.get('visual', {}).get('visualType') in ('pieChart', 'donutChart'):
            w, h = d['position']['width'], d['position']['height']
            if h - DONUT_HEAD > w:
                fail.append("page '%s' chart %s: %s on %gx%g px - a round chart in a tall column leaves the block white; give "
                            "it one row (wide, not tall) and let the chart beside it take the full width (donut-shape)"
                            % (pages[pg]['displayName'], sel_name(d) or i, d['visual']['visualType'], w, h))
    # card-structure (user 2026-10-01: "cấu trúc card bạn cũng ko áp cho hết mọi trang, bộ dò ki vậy ko dò dc à"): a number
    # tile is the KPI card (BG_ + cardVisual Card_ + Pct_ + icon); an old 'card' grid (Operation 25, Promotion 12) is a defect
    for (pg, i), d in vis.items():
        if pg in visible and d.get('visual', {}).get('visualType') == 'card' and not str(sel_name(d) or '').startswith('Pct_'):
            fail.append("page '%s' %s is an old 'card' tile - number tiles use the KPI card structure (BG_ + cardVisual + Pct_ "
                        "+ icon; mix_specs '__cards__')" % (pages[pg]['displayName'], sel_name(d) or i))
    # chart-size (user 01/10: "chart by day thông tin ko có gì thì ai lại để 1 cái chart to đùng chiếm hết chỗ"): a chart of
    # ONE series (one measure, no legend split) is at most CHART_ONE_H tall - its space goes to other content
    for (pg, i), d in vis.items():
        if pg not in visible or not one_series_chart(d):
            continue
        n_split = len(d['visual'].get('query', {}).get('queryState', {}).get('Series', {}).get('projections', []))
        if d['position']['height'] > CHART_ONE_H:
            fail.append("page '%s' chart %s shows one series%s in %s px - at most %d tall, give the room to other content"
                        % (pages[pg]['displayName'], sel_name(d) or i, ' (split by a legend)' if n_split else '',
                           d['position']['height'], CHART_ONE_H))
    # pct-bold on cards: every card % line (Pct_) is bold (user 01/10 "in đậm mọi số %")
    for (pg, i), d in vis.items():
        v = d.get('visual', {})
        if pg in visible and v.get('visualType') == 'card' and str(sel_name(d) or '').startswith('Pct_'):
            b = [lit(e.get('properties', {}).get('bold', {})) for e in v.get('objects', {}).get('labels', []) if 'selector' not in e]
            if b != ['true']:
                fail.append("page '%s' card %% line %s is not bold (scripts/mix_palette.py --cards)"
                            % (pages[pg]['displayName'], sel_name(d)))
    # chart-palette (user 2026-09-29): one colour map for every chart, by the role of the number (pbi-white 4k)
    def is_chart(v):        # treemap / funnel carry no 'Chart' in their type (01/10: Daily treemaps kept Legacy colours)
        return 'Chart' in v.get('visualType', '') or v.get('visualType') in ('treemap', 'funnel')
    for (pg, i), d in vis.items():
        v = d.get('visual', {})
        if pg not in visible or not is_chart(v):
            continue
        q_ = v.get('query', {}).get('queryState', {})
        where = "page '%s' chart %s" % (pages[pg]['displayName'], sel_name(d) or i)
        o_ = v.get('objects', {})
        # chart-coloured (user 2026-10-01 "mọi chart đều phải theo mã màu"): a chart of measures (no split field) names
        # the colour of its series - left blank, Power BI draws theme 1/2 on every chart (Power Consumption 01/10)
        split = q_.get('Series', {}).get('projections') or (
            v.get('visualType') in ('pieChart', 'donutChart', 'treemap', 'funnel')
            and (q_.get('Category', {}).get('projections') or q_.get('Group', {}).get('projections')))
        if not split and not any('fill' in e.get('properties', {}) for e in o_.get('dataPoint', [])):
            fail.append('%s has no series colour - Power BI falls back to theme 1/2 on every chart '
                        '(scripts/mix_palette.py)' % where)
        # label-box + pct-bold (user 01/10: "ko tạo nền cho % phía sau ... che mất chart, chỉ in đậm bold ... in đậm mọi
        # số %"): no label of any chart sits on a box; every % series with labels shown is bold
        if any(lit(e.get('properties', {}).get('enableBackground', {})) == 'true' for e in o_.get('labels', [])):
            fail.append('%s: a data label sits on a background box - it hides the chart (scripts/mix_palette.py)' % where)
        if any(lit(e.get('properties', {}).get('show', {})) == 'true' for e in o_.get('labels', []) if 'selector' not in e):
            for r_ in ('Y', 'Values', 'Y2'):
                for p_ in q_.get(r_, {}).get('projections', []):
                    qr = p_['queryRef']
                    if not (re.match(r'^#?Measure\.', qr) and qr.split('.', 1)[1].startswith('%')):
                        continue
                    e = next((x for x in o_.get('labels', []) if x.get('selector') == {'metadata': qr}), None)
                    if e is None or lit(e.get('properties', {}).get('bold', {})) != 'true':
                        fail.append("%s: %% label '%s' is not bold - every %% number is bold (scripts/mix_palette.py)"
                                    % (where, qr.split('.', 1)[1]))
        dp = json.dumps(d['visual'].get('objects', {}).get('dataPoint', []))
        bad = sorted({c.upper() for c in re.findall(r"'(#[0-9A-Fa-f]{6})'", dp)} - CHART_FILLS)
        tids = {int(x) for x in re.findall(r'"ThemeDataColor": \{"ColorId": (\d+)', dp)}
        if bad or not tids <= THEME_IDS:
            fail.append("page '%s' chart %s paints data %s - chart colours come from the set of 30/09 "
                        "(the Original template Theme1 in order, comparisons grey #A2A2A2; scripts/mix_palette.py)"
                        % (pages[pg]['displayName'], sel_name(d) or i, ', '.join(bad) or 'ThemeDataColor %s outside the dataColors slots' % sorted(tids - THEME_IDS)))
    # chart-palette, run per tab (user 2026-09-29: "2 chart có 2 cột thì chart sau đổi lại màu"): two charts of one
    # tab with >= 2 measure series must not repeat the same colours - the next chart continues the template
    def tab_of(pg, d):
        cur = d.get('parentGroupName')
        while cur and (pg, cur) in vis:
            if str(sel_name(vis[(pg, cur)]) or '').startswith('Tab'):
                return cur
            cur = vis[(pg, cur)].get('parentGroupName')
        return None
    # chart-fill-shape (user 2026-09-30 "mấy này phải có script kiểm"): a chart with ONE measure on its main axis carries
    # that colour in the selector-less dataPoint entry - Desktop IGNORES a metadata selector there and draws theme colour 1
    # (Desktop-written: combo Y=1 plain 15x; 6 Product bars + REVENUE & TARGET rendered wrong until fixed)
    for (pg, i), d in vis.items():
        v = d.get('visual', {})
        if pg not in visible or 'Chart' not in v.get('visualType', '') or v.get('query', {}).get('queryState', {}).get('Series'):
            continue
        q = v.get('query', {}).get('queryState', {})
        axis = [p['queryRef'] for r in ('Y', 'Values') for p in q.get(r, {}).get('projections', [])]
        if len(axis) != 1:
            continue
        dp = v.get('objects', {}).get('dataPoint', [])
        if any(e.get('selector', {}).get('metadata') == axis[0] and 'fill' in e.get('properties', {}) for e in dp):
            fail.append("page '%s' chart %s: its one series is coloured through a metadata selector - Desktop ignores it and "
                        "draws theme colour 1; put the fill in the selector-less entry (scripts/mix_palette.py)"
                        % (pages[pg]['displayName'], sel_name(d) or i))
    seen_fills = {}
    for (pg, i), d in vis.items():
        if pg not in visible or 'Chart' not in d.get('visual', {}).get('visualType', ''):
            continue
        # plain (single-series) fills count too - 30/09 six one-series charts of a tab shared one colour unseen
        _dp = json.dumps([e for e in d['visual'].get('objects', {}).get('dataPoint', [])
                          if 'metadata' in e.get('selector', {}) or not e.get('selector')])
        # a theme slot counts as a colour too (01/10: mains are ThemeDataColor references now)
        # two groups -> findall yields (hex, id) pairs; flatten to text or the error message below crashes
        fills = tuple(h or 'ColorId ' + c for h, c in re.findall(r"'(#[0-9A-Fa-f]{6})'|\"ColorId\": (\d+)", _dp))
        if len(fills) < 1:
            continue
        key = (pg, tab_of(pg, d), fills)
        if key in seen_fills:
            fail.append("page '%s' charts %s and %s repeat the same colours %s in one tab - the next chart continues "
                        "the template (scripts/mix_palette.py)"
                        % (pages[pg]['displayName'], seen_fills[key], sel_name(d) or i, '/'.join(fills)))
        else:
            seen_fills[key] = sel_name(d) or i
    for (pg, tab), grps in long_by_tab.items():
        # user 01/10 supreme rule (optimise space): up to LONG_PER_TAB long charts stacked, each >= LONG_MIN_H tall -
        # two by-day charts of one column each filled a whole tab ('2 chart có đúng 2 cột mà chiếm hết 1 tab')
        low = [g for g in grps if g and vis.get((pg, g), {}).get('position', {}).get('height', 999) < LONG_MIN_H]
        if tab and (len(grps) > LONG_PER_TAB or low):
            fail.append("page '%s' %s has %d long chart blocks%s - at most %d per tab, stacked, each >= %d px"
                        % (pages[pg]['displayName'], sel_name(vis[(pg, tab)]), len(grps),
                           ' (%d below %d px)' % (len(low), LONG_MIN_H) if low else '', LONG_PER_TAB, LONG_MIN_H))
    # few-cards: a page with only 1-3 cards drops its card row
    for p in visible:
        n = sum(1 for (pg, i), d in vis.items() if pg == p and is_card(d))
        if 0 < n <= 3:
            fail.append("page '%s' has only %d cards - drop a self-made card row, top Legacy cards up to 4"
                        % (pages[p]['displayName'], n))
    # glossary: every page has its own
    seen = {}
    for (pg, i), d in vis.items():
        if pg in visible and d.get('visual', {}).get('visualType') == 'textbox' \
                and str(sel_name(d) or '') == 'Text_Glossary':
            txt = json.dumps(d['visual'].get('objects', {}).get('general', ''), ensure_ascii=False)
            if txt in seen and seen[txt] != pg:
                fail.append("Glossary of page '%s' is a verbatim copy of page '%s' - every page has its own glossary"
                            % (pages[pg]['displayName'], pages[seen[txt]]['displayName']))
            seen.setdefault(txt, pg)
    check_glossary_cover(report_dir, pages, visible, vis, fail)
    # legacy-parity: every page / visual compared with the Legacy of the same number + tier
    pat = '%s_%s_%s_??_Legacy' % (fm.group(1), num, fm.group(3))
    leg = [x for x in glob.glob(os.path.join(os.path.dirname(os.path.normpath(report_dir)), pat))
           if FOLDER_RX.match(os.path.basename(x))]
    if not leg:
        return
    ld = glob.glob(os.path.join(leg[0], '*.Report', 'definition'))
    if not ld:
        return
    lpages = page_meta(ld[0])
    dropped_v = gate_cfg().get('dropped_visuals', {}).get(folder, {})
    mm = model_measures(report_dir)
    cls = glob.glob(os.path.join(os.path.dirname(os.path.normpath(report_dir)),
                                 '%s_%s_%s_??_Classic' % (fm.group(1), num, fm.group(3)), '*.Report', 'definition'))
    on_cards = {}
    # a measure declared equivalent (same number from another table, e.g. a warehouse aggregation) stands for it
    equiv = gate_cfg().get('equivalent_measures', {}).get(folder, {})
    for (pg, i), d in vis.items():
        if d.get('visual', {}).get('visualType') in ('card', 'cardVisual'):
            for m0 in measures_in(d['visual'].get('query', {})):
                on_cards.setdefault(pg, set()).update({m0, mm.get(m0, {}).get('wraps'),
                                                       equiv.get(m0, {}).get('of')} - {None})
    for p, m in lpages.items():
        if m['displayName'] in gate_cfg().get('dropped_pages', {}).get(folder, {}):
            continue                      # dropped on purpose, reason in pbi-gate.json
        if p not in pages:
            fail.append("missing Legacy page '%s' - the White version must take over every page" % m['displayName'])
            continue
        for f in glob.glob(os.path.join(ld[0], 'pages', p, 'visuals', '*', 'visual.json')):
            v = json.load(open(f, encoding='utf-8'))
            vt = v.get('visual', {}).get('visualType')
            if 'visualGroup' in v or vt in DECOR or v['name'] in dropped_v:
                continue
            if vt in ('card', 'cardVisual', 'multiRowCard') and (p, v['name']) not in vis:
                # a Legacy card counts as kept while its (Classic, warehouse) measure is still shown on a card
                cf = glob.glob(os.path.join(cls[0], 'pages', p, 'visuals', v['name'], 'visual.json')) if cls else []
                want = measures_in(json.load(open(cf[0], encoding='utf-8'))['visual'].get('query', {})) if cf else set()
                if want and want <= on_cards.get(p, set()):
                    continue
                fail.append("page '%s' lost Legacy card %s (%s) - keep Legacy cards and top the row up to 4"
                            % (m['displayName'], v['name'], ', '.join(sorted(want)) or '?'))
                continue
            if (p, v['name']) not in vis:
                msg = "page '%s' misses Legacy visual %s (%s)" % (m['displayName'], v['name'], vt)
                gap = known_gaps(folder).get(m['displayName'])
                (GAP_WARN if gap else fail).append(msg + (' - declared gap: ' + gap if gap else ''))


# ================================================================ layers 2 + 3: the warehouse and the engine
# User 2026-09-28: "why not one gate - and it must see everything". Reading files (layer 1) cannot see a column the
# warehouse renamed, nor a calculated column the engine refuses (DirectQuery: no CONTAINSROW / ISERROR / FIND) -
# both happened on 2026-09-28 with the static gate GREEN. A layer that cannot run is reported NOT CHECKED and the
# verdict is INCOMPLETE (exit 3), never GREEN.
LAYER_NOTES = []            # (layer, status, detail) printed in the summary


def _m_unescape(s):
    s = s.replace('#(lf)', '\n').replace('#(cr)', '\r').replace('#(tab)', '\t')
    return re.sub(r'#\(([0-9a-fA-F]{4})\)', lambda m: chr(int(m.group(1), 16)), s).replace('""', '"')


def dw_conn_string(report_dir):
    """WAREHOUSE_CONN from the environment, else from the nearest .env upwards, else the region manager repo's .env."""
    v = os.environ.get('WAREHOUSE_CONN')
    if v:
        return v
    cands, d = [], os.path.abspath(report_dir)
    while True:
        cands.append(os.path.join(d, '.env'))
        nd = os.path.dirname(d)
        if nd == d:
            break
        d = nd
    mgr = manager_root(os.path.abspath(__file__))
    if mgr:
        cands.append(os.path.join(mgr, '.env'))                         # the region manager's .env
    for p in cands:
        if os.path.exists(p):
            for line in open(p, encoding='utf-8', errors='ignore'):
                if line.strip().startswith('WAREHOUSE_CONN='):
                    return line.split('=', 1)[1].strip()
    return None


def _kind(report_dir):
    m = FOLDER_RX.match(os.path.basename(os.path.normpath(report_dir)))
    return m.group(5) if m else None


ROW_WRAP = 300       # px, row-wrap (user 14/10 combo matrix): a row-header column whose longest name is wider than this goes
                     # to half that name + CELL_PAD, two lines - long names no longer push the other columns off the frame


def calc_columns(report_dir):
    """'Table.Column' of the model's calculated columns (TMDL `column X = <DAX>`). The DW has no such column, so the
    row-wrap read of the DW skips them (a department repo 19/10: Dim_Date.DayOfMonth - Invalid column name)."""
    out = set()
    for f in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        tb = os.path.basename(f)[:-5]
        for m in re.finditer(r"(?m)^\tcolumn\s+('(?:[^']|'')+'|[^\s=]+)\s*=", open(f, encoding='utf-8').read()):
            out.add(tb + '.' + m.group(1).strip("'").replace("''", "'"))
    return out


def row_long_px(report_dir, d, cur, cache=None):
    """{queryRef: (one-line px, two-line px)} of the longest warehouse values of each text row field of a table / matrix (matrix Rows; table: the text
    columns of Values), read from the dimension itself (active rows when it has IsActive - 2026-10-19, the fact filter
    held the warehouse). Font = rowHeaders (matrix) / values (table) font. Fields of a table no fact links are skipped."""
    cache = {} if cache is None else cache
    v = d.get('visual', {})
    obj = 'rowHeaders' if v.get('visualType') == 'pivotTable' else 'values'
    pr = next((e.get('properties', {}) for e in v.get('objects', {}).get(obj, []) if 'selector' not in e), {})
    sz = lit(pr.get('fontSize', {}))
    size, bold = (float(sz[:-1]) if sz and sz.endswith('D') else 10.0), lit(pr.get('bold', {})) == 'true'
    if 'rel' not in cache:
        rel = {}
        for f in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'relationships.tmdl')):
            s = open(f, encoding='utf-8').read()
            for fr, to in re.findall(r'fromColumn:\s*(\S+)\s*\n\s*toColumn:\s*(\S+)', s):
                ft, fc = fr.split('.', 1)
                tt, tc = to.split('.', 1)
                rel.setdefault(tt.strip("'"), []).append((ft.strip("'"), fc.strip("'"), tc.strip("'")))
        cache['rel'] = rel
    if 'calc' not in cache:
        cache['calc'] = calc_columns(report_dir)
    out = {}
    for q, _, role in table_headers(d):
        if role != 'row' and v.get('visualType') == 'pivotTable':
            continue
        if q.startswith('#Measure.') or '.' not in q or q in cache['calc']:
            continue
        names = dw_longest(q, cur, cache)
        if names:
            out[q] = (max(w_text(x, size, bold, False) for x in names),
                      max(wrap_width(x, size, bold) for x in names))
    return out


def dw_longest(q, cur, cache):
    """The 30 longest warehouse values of field `q` ('Table.Column') over the dimension rows a fact of the model points
    at (cache['rel'] from row_long_px); None when the field has no fact link or no text."""
    t, c = q.split('.', 1)
    links = cache['rel'].get(t)
    if not links:
        return None
    key = (t, c)
    if key not in cache:
        # a department repo 2026-10-19: the old query kept only the rows a fact points at, by a UNION over every linked
        # fact - on Fact_SaleDetail it ran 30+ minutes and its locks blocked the warehouse load jobs. The dimension alone
        # is read (its active rows when it has IsActive), with a query timeout. The longest names WITH TIES: a plain
        # TOP 30 picked a different 30 among equal lengths each run, and the gate flipped between red and green.
        try:
            cache[key] = [r[0] for r in dw_rows(cur, "select top 30 with ties [%s] from (select distinct [%s] from dbo.[%s]"
                                                "%s) v where [%s] is not null order by len([%s]) desc"
                                                % (c, c, t, dim_active(cur, t), c, c)) if isinstance(r[0], str)] or None
        except Exception as e:
            dw_skip('row-wrap', '%s: %s' % (q, str(e).splitlines()[0][:100]))
            cache[key] = None
    return cache[key]


DW_QUERY_TIMEOUT = 60   # s, one gate query; the gate must never hold the warehouse (a department repo 2026-10-19)


def dw_rows(cur, sql):
    """Run a read of the gate: no shared locks and no waiting on a lock (READ UNCOMMITTED, LOCK_TIMEOUT), and a
    query timeout on the connection, so a load job is never blocked by a report check."""
    try:
        cur.connection.timeout = DW_QUERY_TIMEOUT
    except Exception:
        pass
    cur.execute('set transaction isolation level read uncommitted; set lock_timeout 5000; ' + sql)
    return cur.fetchall()


def dim_active(cur, t):
    """' where IsActive = 1' when dimension t has an IsActive column, else ''."""
    k = ('active', t)
    if k not in DW_SEEN:
        try:
            DW_SEEN[k] = bool(dw_rows(cur, "select 1 from INFORMATION_SCHEMA.COLUMNS where TABLE_SCHEMA='dbo' and "
                                           "TABLE_NAME='%s' and COLUMN_NAME='IsActive'" % t.replace("'", "''")))
        except Exception:
            DW_SEEN[k] = False
    return ' where IsActive = 1' if DW_SEEN[k] else ''


DW_SEEN = {}


def dw_skip(check, why):
    """A warehouse read that failed leaves its check NOT CHECKED, never silently green."""
    LAYER_NOTES.append(('dw', 'NOT CHECKED', '%s - %s' % (check, why)))


MEMBER_MAX_LINES = 4        # col-member (user 14/10: "size cột bị dài vô lý ... số ít thì đâu cần title dài" -> chose 3, then "bề rộng vẫn rộng" -> 4):
MEMBER_3LINE_SHARE = 0.02   # header lines of a data-driven column; at most this share of the names may take one more


def wrap_lines(text, w, size, bold=False):
    """Lines Power BI makes of `text` in a cell `w` px wide: greedy, whole words (a word wider than w stays alone)."""
    lines, cur_ = [], ''
    for x in str(text or '').split():
        n = (cur_ + ' ' + x).strip()
        if not cur_ or w_text(n, size, bold, False) <= w:
            cur_ = n
        else:
            lines.append(cur_)
            cur_ = x
    return lines + ([cur_] if cur_ else [])


def dw_all_names(q, cur, cache, limit=5000):
    """Every warehouse value of `q` (active dimension rows) - the distribution, not only the longest."""
    key = ('all',) + tuple(q.split('.', 1))
    if key not in cache:
        t, c = q.split('.', 1)
        links = cache['rel'].get(t)
        if not links:
            cache[key] = None
            return None
        try:
            act = dim_active(cur, t)
            cache[key] = [r[0] for r in dw_rows(cur, "select distinct top %d [%s] from dbo.[%s]%s%s [%s] is not null order by [%s]"
                                                % (limit, c, t, act, ' and' if act else ' where', c, c)) if isinstance(r[0], str)] or None
        except Exception as e:
            dw_skip('row-wrap', '%s: %s' % (q, str(e).splitlines()[0][:100]))
            cache[key] = None
    return cache[key]


def balanced_width(names, size, bold):
    """Shared header width for data-driven matrix columns (user 14/10: "gom 2 dòng sao cho nó 2 dòng ngang nhau để cân
    bằng" - Power BI keeps ONE width per value column for every member, so a width fitting the single longest name on
    two lines leaves the others lopsided). The narrowest width (5 px steps) where every name fits MEMBER_MAX_LINES lines
    with whole words, at most MEMBER_3LINE_SHARE of them one line more, never below the widest word. The numbers of
    such a column are short (franchise items: 78,303 at most = 59 px), so the header lines carry the width: 2 lines
    needed 270 px, 3 lines 195 px (user 14/10 chose 3)."""
    lo = max(w_text(w, size, bold, False) for n in names for w in n.split())
    hi = max(wrap_width(n, size, bold) for n in names)
    w = 5 * int(lo // 5)
    while w < hi:
        ls = [len(wrap_lines(n, w, size, bold)) for n in names]
        if max(ls) <= MEMBER_MAX_LINES + 1 and sum(1 for x in ls if x > MEMBER_MAX_LINES) <= MEMBER_3LINE_SHARE * len(names):
            return float(w)
        w += 5
    return float(hi)


def col_member_plan(report_dir, d, cur, cache):
    """{measure queryRef: width} for a matrix whose COLUMNS field brings long names from the data (user 14/10, Purchases
    'Sản Lượng Tiêu Thụ Tháng': "trang này phải theo chuẩn 2 dòng chứ? sao cột dài thòng vậy" - Grow to fit laid each
    item name on one line, ~350 px a column). Each member header spans its value columns: balanced_width (two lines,
    at most 2% of the names on three) + CELL_PAD, shared by the value columns, each at least VALUE_MIN. Only when the names need
    more than the value columns would take anyway; short members (months, codes) keep Grow to fit."""
    v = d.get('visual', {})
    qs = v.get('query', {}).get('queryState', {})
    if v.get('visualType') != 'pivotTable' or not qs.get('Columns', {}).get('projections'):
        return {}
    row_long_px(report_dir, d, cur, cache)          # fills cache['rel']
    size, bold = header_font(d)
    need = 0.0
    for p in qs['Columns']['projections']:
        qr = p.get('queryRef', '')
        names = dw_all_names(qr, cur, cache) if '.' in qr and qr not in cache.get('calc', set()) else None
        if names:
            need = max(need, balanced_width(names, size, bold))
    vals = [p.get('queryRef') for p in qs.get('Values', {}).get('projections', [])]
    if not vals or need + CELL_PAD <= VALUE_MIN * len(vals):
        return {}
    w = float(max(VALUE_MIN, math.ceil((need + CELL_PAD) / len(vals))))
    return dict((q, w) for q in vals)


def row_plan(longest, d=None):
    """{queryRef: width} of the text columns (matrix row headers / table text columns) measured in the warehouse - fit
    to the text, no spare room (user 14/10 "cột ko dc dư ... phải vừa khít chữ"): one line when the longest value is at
    most ROW_WRAP px, else two lines with whole words (wrap_width) - never three, never a word cut in two (user 14/10
    'Numbe / r'). The header of the column fits on two lines with whole words too; a matrix with a Columns field shows
    that field's caption in the corner cell above its LAST row column, so that column holds the caption as well.
    Stepped layout stacks the row levels in ONE column -> every row field gets the widest; Tabular / Outline keep one each."""
    if d is None:
        return {q: float(math.ceil(two if one > ROW_WRAP else one) + CELL_PAD) for q, (one, two) in longest.items()}
    hsize, hbold = header_font(d)
    cols = table_headers(d)
    v = d.get('visual', {})
    out = {}
    for q, h, _ in cols:
        if q not in longest:
            continue
        one, two = longest[q]
        body = two if one > ROW_WRAP else one
        out[q] = float(math.ceil(max(body, wrap_width(h, hsize, hbold))) + CELL_PAD)
    rows = [q for q, _, r in cols if r == 'row']
    caps = [p.get('displayName') or p.get('queryRef', '').split('.', 1)[-1]
            for p in v.get('query', {}).get('queryState', {}).get('Columns', {}).get('projections', [])]
    if v.get('visualType') == 'pivotTable' and rows and caps:
        need = float(math.ceil(max(wrap_width(c, hsize, hbold) for c in caps)) + CELL_PAD)
        if rows[-1] in out or need > 0:
            out[rows[-1]] = max(out.get(rows[-1], 0.0), need)
    layout = next((lit(e.get('properties', {}).get('layout', {})) for e in v.get('objects', {}).get('general', [])
                   if 'selector' not in e), '') or 'Stepped'
    if out and v.get('visualType') == 'pivotTable' and layout.strip("'") == 'Stepped':
        w = max(out.values())
        out = {q: w for q in rows}
    return out


def check_dw_row_wrap(report_dir, cur, fail):
    """row-wrap (user 2026-10-14, 'Số Lượng Combo Theo Cửa Hàng': "tên sản phẩm quá dài cũng nên tách làm 2, chia đôi ra
    để đừng có đẩy phần cột khác quá dài"): a row-header column with names longer than ROW_WRAP px is fixed at half the
    longest name + CELL_PAD (mix_builder.py --grow-to-fit writes it). White / Red only: Classic keeps the old design."""
    if _kind(report_dir) in ('Classic', 'Legacy'):
        return
    cache = {}
    for f in glob.glob(os.path.join(report_dir, '*.Report', 'definition', 'pages', '*', 'visuals', '*', 'visual.json')):
        d = json.load(open(f, encoding='utf-8'))
        if d.get('visual', {}).get('visualType') not in ('pivotTable', 'tableEx'):
            continue
        pj = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(f))), 'page.json')
        if json.load(open(pj, encoding='utf-8-sig')).get('visibility') == 'HiddenInViewMode':
            continue                                    # hidden pages are not laid out (mix_builder skips them too)
        want = row_plan(row_long_px(report_dir, d, cur, cache), d)
        member = col_member_plan(report_dir, d, cur, cache)
        cur_w = {e.get('selector', {}).get('metadata'): float(lit(e['properties']['value']).rstrip('D'))
                 for e in d['visual'].get('objects', {}).get('columnWidth', [])
                 if e.get('selector', {}).get('metadata') and lit(e.get('properties', {}).get('value', {}))}
        # data-driven column headers: mix_builder --member-width measures the names the visual SHOWS in the engine, so the
        # warehouse layer only bounds it - set, at least VALUE_MIN, never wider than every warehouse name needs
        for q, w in member.items():
            have = cur_w.get(q)
            if have is None or have < VALUE_MIN - 1 or have > w + 1:
                fail.append("%s '%s' column %s: is %s - long names as column headers take a balanced two-line width "
                            "between %d and %.0f (mix_builder.py --member-width with the report open in Desktop) (row-wrap)"
                            % (d['visual']['visualType'], sel_name(d) or d.get('name'), q, 'auto' if have is None else '%.0f' % have,
                               VALUE_MIN, w))
        for q, w in want.items():
            if abs(cur_w.get(q, -99) - w) > 1:
                have = cur_w.get(q)
                fail.append("%s '%s' column %s: is %s, the text wants %.0f (longest warehouse value / header + %d, two "
                            "lines over %d px) - %s (mix_builder.py --grow-to-fit) (row-wrap)"
                            % (d['visual']['visualType'], sel_name(d) or d.get('name'), q, 'auto' if have is None else '%.0f' % have,
                               w, CELL_PAD, ROW_WRAP, 'spare room' if have is not None and have > w else 'too narrow / not set'))


EMPTY_LABELS = {'unknown', 'not applicable', '#na', '#unknown'}


def check_dw_filter_mixed(report_dir, cur, fail):
    """filter-mixed (a department repo 21/10: the Team Leader box listed 'E-Commerce', a channel, among the people): one box
    of the common set holds ONE grouping. A value of a filter_set field (live warehouse values, empty-cell labels and the
    entry's 'exclude' left out) that is also a value of another filter_set field of the report means the box mixes two
    groupings - exclude the value in pbi-gate.json filter_set (exclude: [...], with the reason) or fix the data."""
    folder = os.path.basename(os.path.normpath(report_dir))
    mine = gate_cfg().get('filter_set', {}).get(folder, [])
    if not mine:
        return
    # the other boxes come from the department's whole vocabulary (every report's filter_set), so a channel listed in a
    # person box is caught even on a report that has no channel box
    ents, seen = list(mine), {e['field'] for e in mine}
    for f_, lst in gate_cfg().get('filter_set', {}).items():
        for e in (lst if isinstance(lst, list) else []):
            if e['field'] not in seen:
                ents.append(dict(e, _other=True))
                seen.add(e['field'])
    src = {}
    for t in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        m = re.search(r'Item\s*=\s*"(\w+)"', open(t, encoding='utf-8').read())
        if m:
            src[os.path.basename(t)[:-5]] = m.group(1)
    vals = {}
    for e in ents:
        tab, colname = e['field'].split('.', 1)
        if tab not in src and not e.get('_other'):
            continue
        try:
            rows = dw_rows(cur, 'select distinct cast([%s] as nvarchar(400)) from dbo.[%s]' % (colname.replace(']', ']]'),
                                                                                             src.get(tab, tab).replace(']', ']]')))
        except Exception as ex:
            dw_skip('filter-mixed %s' % e['key'], str(ex).splitlines()[0][:120])
            continue
        drop = {str(x).lower() for x in e.get('exclude', [])} | EMPTY_LABELS
        vals[e['key']] = {str(r[0]).strip(): e for r in rows if r[0] is not None and str(r[0]).strip().lower() not in drop}
    keys = list(vals)
    own = {e['key'] for e in mine}
    for i, a in enumerate(keys):
        for b in keys[i + 1:]:
            if a not in own and b not in own:
                continue
            both = sorted(set(x.lower() for x in vals[a]) & set(x.lower() for x in vals[b]))
            for v in both:
                fail.append("filter box %s (%s) and box %s (%s) both list '%s' - one box mixes two groupings; exclude it from "
                            "the box it does not belong to (pbi-gate.json filter_set exclude) or fix the data (filter-mixed)"
                            % (a, vals[a][next(x for x in vals[a] if x.lower() == v)]['field'], b,
                               vals[b][next(x for x in vals[b] if x.lower() == v)]['field'], v))


def check_dw(report_dir, fail):
    """Layer 2 - every warehouse-backed table: native SQL must run (sp_describe_first_result_set), a navigated table
    must exist, and every sourceColumn / SelectColumns name must exist in the warehouse or be built in the query."""
    if _kind(report_dir) == 'Legacy':
        LAYER_NOTES.append(('dw', 'n/a', 'Legacy reads the old system'))
        return
    tables = []
    for f in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        s = open(f, encoding='utf-8').read()
        if 'Sql.Database(' in s:
            tables.append((os.path.basename(f)[:-5], s))
    if not tables:
        LAYER_NOTES.append(('dw', 'n/a', 'no table reads the warehouse'))
        return
    cs = dw_conn_string(report_dir)
    if not cs:
        LAYER_NOTES.append(('dw', 'NOT CHECKED', 'no WAREHOUSE_CONN (env, a .env upwards, or the region manager/.env)'))
        return
    try:
        import pyodbc
        cur = pyodbc.connect(cs, timeout=30).cursor()
        dw, dw_exact = {}, {}
        for t, col in cur.execute("select TABLE_NAME, COLUMN_NAME from INFORMATION_SCHEMA.COLUMNS where TABLE_SCHEMA='dbo'"):
            dw.setdefault(t.lower(), set()).add(col.lower())
            dw_exact.setdefault(t.lower(), set()).add(col)      # Power Query matches column names CASE-SENSITIVELY
    except Exception as e:
        LAYER_NOTES.append(('dw', 'NOT CHECKED', 'warehouse unreachable: %s' % str(e).splitlines()[0][:120]))
        return
    check_dw_relationships(report_dir, cur, fail)
    check_dw_row_wrap(report_dir, cur, fail)
    check_dw_filter_mixed(report_dir, cur, fail)
    n_tab, n_col, unknown = 0, 0, []
    for tbl, s in tables:
        src = s[s.find('\tpartition '):]
        built = set(x.lower() for x in re.findall(r'Table\.AddColumn\([^,]+,\s*"([^"]+)"', src))
        built |= set(b.lower() for a, b in re.findall(r'\{\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\}', src))
        cols = [c.strip().strip("'\"") for c in re.findall(r'(?m)^\t\tsourceColumn:\s*(.+?)\s*$', s)]
        # the SQL may be one literal or several joined with & (a department repo Dim_Date, 2026-09-28)
        q = re.search(r'(?:Query\s*=|Value\.NativeQuery\([^,]+,)\s*((?:"(?:[^"]|"")*"\s*&\s*)*"(?:[^"]|"")*")', src)
        if q:
            sql = _m_unescape(''.join(re.findall(r'"((?:[^"]|"")*)"', q.group(1))))
            try:
                got = set(r[2].lower() for r in cur.execute('EXEC sp_describe_first_result_set @tsql = ?', sql).fetchall() if r[2])
            except Exception as e:
                fail.append("table %s: its SQL does not run on the warehouse - %s" % (tbl, str(e).splitlines()[0][:200]))
                n_tab += 1
                continue
            have = got | built
        else:
            it = re.search(r'Item\s*=\s*"(\w+)"', src)
            if not it:
                unknown.append(tbl)
                continue
            if it.group(1).lower() not in dw:
                fail.append("table %s: warehouse table dbo.%s does not exist (renamed or dropped?)" % (tbl, it.group(1)))
                n_tab += 1
                continue
            have = dw[it.group(1).lower()] | built
            # 2026-10-05: the warehouse renamed 7 columns by CASE only (CogsKey -> COGSKey ...); the lower-case test let
            # Table.SelectColumns {"CogsKey"} pass while Power Query (case-sensitive) fails on it. Exact test for M names.
            exact = dw_exact[it.group(1).lower()] | set(re.findall(r'Table\.AddColumn\([^,]+,\s*"([^"]+)"', src)) | \
                set(b for a, b in re.findall(r'\{\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\}', src))
            by_low = {x.lower(): x for x in dw_exact[it.group(1).lower()]}
            for grp in re.findall(r'Table\.SelectColumns\([^,]+,\s*\{([^}]*)\}', src):
                for nm in re.findall(r'"([^"]+)"', grp):
                    if nm.lower() not in have:
                        fail.append("table %s: Power Query selects %s, not a column of dbo.%s" % (tbl, nm, it.group(1)))
                    elif nm not in exact:
                        fail.append("table %s: Power Query selects %s but dbo.%s spells it %s - Power Query matches names "
                                    "case-sensitively" % (tbl, nm, it.group(1), by_low.get(nm.lower(), '?')))
            for c in cols:
                if c.lower() in have and c not in exact and c.lower() in by_low:
                    fail.append("table %s: sourceColumn %s but dbo.%s spells it %s - case-sensitive in Power Query"
                                % (tbl, c, it.group(1), by_low[c.lower()]))
        n_tab += 1
        for c in cols:
            n_col += 1
            if c.lower() not in have:
                fail.append("table %s: column %s is not produced by its warehouse source (renamed or dropped?)" % (tbl, c))
    detail = '%d tables, %d columns against the live warehouse' % (n_tab, n_col)
    if unknown:
        detail += ' - source shape not understood, NOT checked: %s' % ', '.join(sorted(unknown))
        LAYER_NOTES.append(('dw', 'NOT CHECKED', detail))
    else:
        LAYER_NOTES.append(('dw', 'checked', detail))


ENGINE_PS = r"""
param([string]$Dir, [int]$Wait = 240, [string]$Cols = '', [string]$NegFile = '')
# UTF-8 out: Python reads utf-8; the console default (cp1252) turned 'năm' into 'nam' and 'tháng' into 'th?ng' (13/10)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
function Out($o) { '@@' + ($o | ConvertTo-Json -Compress -Depth 4) }
$leaf = Split-Path $Dir -Leaf
$pbip = (Get-ChildItem -LiteralPath $Dir -Filter *.pbip | Select-Object -First 1).FullName
$pd = Get-CimInstance Win32_Process -Filter "Name='PBIDesktop.exe'" | Where-Object { $_.CommandLine -like "*$leaf*" } | Select-Object -First 1
$own = $false
if ($pd) { $pid0 = [int]$pd.ProcessId; $exe = $pd.ExecutablePath } else {
  $exe = $env:PBI_DESKTOP
  if (-not $exe) { $exe = @('D:\Software\Office\PowerBI\App\bin\PBIDesktop.exe', "$env:ProgramFiles\Microsoft Power BI Desktop\bin\PBIDesktop.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1 }
  if (-not $exe) { Out @{ event = 'skip'; msg = 'Power BI Desktop not found (set PBI_DESKTOP)' }; exit }
  $p = Start-Process -FilePath $exe -ArgumentList ('"' + $pbip + '"') -PassThru; $pid0 = $p.Id; $own = $true
}
Out @{ event = 'desktop'; pid = $pid0; own = $own }
$deadline = (Get-Date).AddSeconds($Wait); $port = $null
while ((Get-Date) -lt $deadline -and -not $port) {
  $ms = Get-CimInstance Win32_Process -Filter "Name='msmdsrv.exe'" | Where-Object { $_.ParentProcessId -eq $pid0 } | Select-Object -First 1
  if ($ms) { $l = Get-NetTCPConnection -OwningProcess $ms.ProcessId -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($l) { $port = $l.LocalPort } }
  if (-not $port) { Start-Sleep -Seconds 5 }
}
function Close-Own {
  if (-not $own) { return }
  $p = Get-Process -Id $pid0 -ErrorAction SilentlyContinue; if (-not $p) { return }
  [void]$p.CloseMainWindow()
  Add-Type -TypeDefinition @'
using System; using System.Text; using System.Reflection; using System.Collections.Generic; using System.Runtime.InteropServices;
public class GateClose {
 public delegate bool CB(IntPtr h, IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumWindows(CB cb, IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p, CB cb, IntPtr l);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
 [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
 [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern uint RegisterWindowMessage(string s);
 [DllImport("user32.dll")] public static extern IntPtr SendMessageTimeout(IntPtr h, uint m, IntPtr w, IntPtr l, uint f, uint t, out IntPtr r);
 [DllImport("oleacc.dll", PreserveSig=false)] [return: MarshalAs(UnmanagedType.Interface)] public static extern object ObjectFromLresult(IntPtr l, [MarshalAs(UnmanagedType.LPStruct)] Guid iid, IntPtr w);
 static object G(object o, string p) { return o.GetType().InvokeMember(p, BindingFlags.GetProperty, null, o, null); }
 static object C(object o, string m, params object[] a) { return o.GetType().InvokeMember(m, BindingFlags.InvokeMethod, null, o, a); }
 public static string DontSave(uint pid) {
  var ie = new List<IntPtr>();
  EnumWindows((h,l)=>{ uint p; GetWindowThreadProcessId(h, out p); if (p==pid) EnumChildWindows(h,(c,l2)=>{ var sb=new StringBuilder(64); GetClassName(c,sb,64); if (sb.ToString()=="Internet Explorer_Server") ie.Add(c); return true; }, IntPtr.Zero); return true; }, IntPtr.Zero);
  foreach (var h in ie) {
   uint m = RegisterWindowMessage("WM_HTML_GETOBJECT"); IntPtr r; SendMessageTimeout(h, m, IntPtr.Zero, IntPtr.Zero, 2, 2000, out r);
   if (r == IntPtr.Zero) continue;
   object doc = ObjectFromLresult(r, new Guid("626FC520-A41E-11CF-A731-00A0C9082637"), IntPtr.Zero);
   object all = G(doc, "all"); int n = (int)G(all, "length");
   for (int i = 0; i < n; i++) { object e = C(all, "item", i); string t = (G(e, "innerText") as string) ?? ""; string cls = (G(e,"className") as string) ?? ""; if (cls.Contains("o-action-button") && t.Trim().StartsWith("Don't save")) { C(e, "click"); return "clicked"; } }
  }
  return "none";
 } }
'@ -ErrorAction SilentlyContinue
  for ($i = 0; $i -lt 24; $i++) {
    Start-Sleep -Seconds 5
    if (-not (Get-Process -Id $pid0 -ErrorAction SilentlyContinue)) { Out @{ event = 'closed' }; return }
    try { [void][GateClose]::DontSave([uint32]$pid0) } catch { }
  }
  Out @{ event = 'close-failed'; msg = 'Desktop still open after 2 minutes (a dialog needs the user)' }
}
if (-not $port) { Out @{ event = 'skip'; msg = "engine did not start within $Wait s" }; Close-Own; exit }
try {
  Add-Type -Path (Join-Path (Split-Path $exe) 'Microsoft.PowerBI.AdomdClient.dll')
  $script:cat = $null
  function Open-Conn {
    $script:c = New-Object Microsoft.AnalysisServices.AdomdClient.AdomdConnection("Data Source=localhost:$port"); $script:c.Open()
    if ($script:cat) { $script:c.ChangeDatabase($script:cat) }
  }
  function Q1($text, $timeout) {
    $cmd = $script:c.CreateCommand(); $cmd.CommandTimeout = $timeout; $cmd.CommandText = $text
    $r = $cmd.ExecuteReader(); $rows = @()
    while ($r.Read()) { $vals = @(); for ($i = 0; $i -lt $r.FieldCount; $i++) { $vals += [string]$r.GetValue($i) }; $rows += ,$vals }
    $r.Close(); return ,$rows
  }
  # a dropped connection is the GATE's problem, not the report's: reconnect and retry once before reporting
  function Q($text, $timeout = 180) {
    try { return ,(Q1 $text $timeout) } catch {
      $e = $_.Exception.Message
      if ($script:c.State -ne 'Open' -or $e -match 'connection|end of the stream') { Start-Sleep -Seconds 10; Open-Conn; return ,(Q1 $text $timeout) }
      throw
    }
  }
  Open-Conn
  while ((Get-Date) -lt $deadline.AddSeconds(120) -and -not $script:cat) {
    try { $x = Q 'SELECT [CATALOG_NAME] FROM $SYSTEM.DBSCHEMA_CATALOGS'; if ($x.Count) { $script:cat = $x[0][0] } } catch { }
    if (-not $script:cat) { Start-Sleep -Seconds 5 }
  }
  if (-not $script:cat) { Out @{ event = 'skip'; msg = 'model did not load' }; Close-Own; exit }
  $script:c.ChangeDatabase($script:cat)
  # ready = the engine answers a query; then let Desktop finish its own start-up queries (measured 2026-09-28: querying
  # 10 s after the catalog appeared dropped the connection and every later query failed)
  $ready = $false
  while ((Get-Date) -lt $deadline.AddSeconds(240) -and -not $ready) {
    try { [void](Q 'EVALUATE ROW("ok", 1)' 60); $ready = $true } catch { Start-Sleep -Seconds 10 }
  }
  if (-not $ready) { Out @{ event = 'skip'; msg = 'engine never answered a query' }; Close-Own; exit }
  Start-Sleep -Seconds 30
  $tabs = @{}; foreach ($t in (Q 'SELECT [ID], [Name] FROM $SYSTEM.TMSCHEMA_TABLES')) { $tabs[$t[0]] = $t[1] }
  foreach ($m in (Q 'SELECT [TableID], [Name], [State], [ErrorMessage] FROM $SYSTEM.TMSCHEMA_MEASURES WHERE [State] <> 1')) { Out @{ event = 'bad'; kind = 'measure'; table = $tabs[$m[0]]; name = $m[1]; state = $m[2]; msg = $m[3] } }
  foreach ($m in (Q 'SELECT [TableID], [ExplicitName], [State], [ErrorMessage] FROM $SYSTEM.TMSCHEMA_COLUMNS WHERE [State] <> 1')) { Out @{ event = 'bad'; kind = 'column'; table = $tabs[$m[0]]; name = $m[1]; state = $m[2]; msg = $m[3] } }
  $dq = @(); $nodata = 0
  foreach ($m in (Q 'SELECT [TableID], [Name], [State], [Mode], [ErrorMessage] FROM $SYSTEM.TMSCHEMA_PARTITIONS')) {
    if ($m[3] -eq '1' -or $m[3] -eq '4') { $dq += $tabs[$m[0]] }
    if ($m[2] -eq '3') { $nodata++ } elseif ($m[2] -ne '1') { Out @{ event = 'bad'; kind = 'partition'; table = $tabs[$m[0]]; name = $m[1]; state = $m[2]; msg = $m[4] } }
  }
  foreach ($t in ($dq | Sort-Object -Unique)) {
    try { [void](Q ("EVALUATE TOPN(1, '" + $t.Replace("'", "''") + "')") 240) } catch { Out @{ event = 'bad'; kind = 'query'; table = $t; name = 'TOPN(1)'; state = ''; msg = $_.Exception.Message.Split("`n")[0] } }
  }
  # slicer-sort: the values of every text column a slicer shows without a sortByColumn (Python decides)
  foreach ($pair in ($Cols -split ';;' | Where-Object { $_ })) {
    $tc = $pair -split '\|', 2
    try {
      $vals = Q ("EVALUATE TOPN(400, VALUES('" + $tc[0].Replace("'", "''") + "'[" + $tc[1].Replace(']', ']]') + "]))") 240
      Out @{ event = 'vals'; table = $tc[0]; name = $tc[1]; vals = @($vals | ForEach-Object { [string]$_[0] }) }
    } catch { }
  }
  # neg-bars: lowest value a column/bar chart can draw (Python decides; one line = label TAB DAX scalar)
  if ($NegFile -and (Test-Path $NegFile)) {
    foreach ($ln in (Get-Content -LiteralPath $NegFile -Encoding UTF8 | Where-Object { $_ })) {
      $kv = $ln -split "`t", 2
      try { $r = Q ('EVALUATE ROW("v", ' + $kv[1] + ')') 120; Out @{ event = 'neg'; label = $kv[0]; v = [string]$r[0][0] } }
      catch { Out @{ event = 'neg'; label = $kv[0]; v = ''; msg = $_.Exception.Message.Split("`n")[0] } }
    }
  }
  Out @{ event = 'done'; directquery = ($dq | Sort-Object -Unique).Count; import_not_loaded = $nodata }
  $script:c.Close()
} catch { Out @{ event = 'skip'; msg = 'engine query failed: ' + $_.Exception.Message.Split("`n")[0] } }
Close-Own
"""


def slicer_text_columns(report_dir):
    """(table, column) of every TEXT column shown by a slicer with no sortByColumn - layer engine reads their values
    (user 01/10: Week slicer listed 27, 28, 29, 3, 30 - week numbers stored as text sort as text)."""
    used = set()
    for f in glob.glob(os.path.join(report_dir, '*.Report', 'definition', 'pages', '*', 'visuals', '*', 'visual.json')):
        try:
            v = json.load(open(f, encoding='utf-8-sig')).get('visual', {})
        except Exception:
            continue
        if v.get('visualType') != 'slicer':
            continue
        for p in v.get('query', {}).get('queryState', {}).get('Values', {}).get('projections', []):
            c = p.get('field', {}).get('Column', {})
            ent = c.get('Expression', {}).get('SourceRef', {}).get('Entity')
            if ent and c.get('Property'):
                used.add((ent, c['Property']))
    out = []
    for t in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        txt = open(t, encoding='utf-8').read()
        tab = re.search(r"(?m)^table\s+('(?:[^']|'')+'|\S+)", txt)
        tab = tab.group(1).strip("'").replace("''", "'") if tab else os.path.basename(t)[:-5]
        for m in re.finditer(r"(?m)^\tcolumn\s+('(?:[^']|'')+'|[^\s=]+)\s*\n((?:\t\t.*\n|\s*\n)+?)(?=^\t\S|\Z)", txt):
            col, body = m.group(1).strip("'").replace("''", "'"), m.group(2)
            if (tab, col) in used and 'dataType: string' in body and 'sortByColumn' not in body:
                out.append((tab, col))
    return sorted(out)


def _dax_lit(v):
    """PBIR literal -> DAX literal ('x' -> "x", 1L -> 1, null -> BLANK()); None when the shape is unknown."""
    if not isinstance(v, str):
        return None
    if v == 'null':
        return 'BLANK()'
    if v.startswith("'") and v.endswith("'"):
        return '"%s"' % v[1:-1].replace("''", "'").replace('"', '""')
    m = re.fullmatch(r'(-?\d+(?:\.\d+)?)[LDM]?', v)
    if m:
        return m.group(1)
    if v in ('true', 'false'):
        return v.upper() + '()'
    return None


def _dax_cond(cond, ref):
    """One PBIR filter condition on table `ref` -> DAX boolean, or None when a part is outside this table / unknown."""
    if 'Not' in cond:
        inner = _dax_cond(cond['Not'].get('Expression', {}), ref)
        return None if inner is None else 'NOT ( %s )' % inner
    if 'Comparison' in cond:
        c = cond['Comparison']
        col = c.get('Left', {}).get('Column', {}).get('Property')
        lit_ = _dax_lit(c.get('Right', {}).get('Literal', {}).get('Value'))
        if not col or lit_ is None or c.get('ComparisonKind', 0) != 0:
            return None
        return 'ISBLANK ( %s[%s] )' % (ref, col) if lit_ == 'BLANK()' else '%s[%s] = %s' % (ref, col, lit_)
    if 'In' in cond:
        ex = cond['In'].get('Expressions', [])
        if len(ex) != 1 or not ex[0].get('Column', {}).get('Property'):
            return None
        vals = [_dax_lit(r[0].get('Literal', {}).get('Value')) for r in cond['In'].get('Values', []) if r]
        if not vals or None in vals:
            return None
        return '%s[%s] IN { %s }' % (ref, ex[0]['Column']['Property'], ', '.join(vals))
    return None


def slicer_current_exprs(report_dir):
    """slicer-current (a department report, 2026-10-18: the Month slicer listed 'Current Month' = 09 AND then '10' - the label
    followed the last closed month while the slicer filter let the next month through). For every slicer on a date table
    (a dateTime key column) one DAX scalar = the number of members, other than a 'Current ...' one, that hold ANY date
    (MAX, under the slicer's own visual filters) after the last date of the 'Current ...' member. > 0 = red. MAX, not MIN:
    a month member spans years ('10' = 10/2025 + 10/2026), so its first date hides the part that runs past Current.
    Visual filters translated: =, IN, NOT, is blank on the slicer's own table; a filter on another table is skipped."""
    keys = {}
    for t in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        txt = open(t, encoding='utf-8').read()
        tab = re.search(r"(?m)^table\s+('(?:[^']|'')+'|\S+)", txt)
        tab = tab.group(1).strip("'").replace("''", "'") if tab else os.path.basename(t)[:-5]
        for m in re.finditer(r"(?m)^\tcolumn\s+('(?:[^']|'')+'|[^\s=]+)\s*\n((?:\t\t.*\n|\s*\n)+?)(?=^\t\S|\Z)", txt):
            if 'dataType: dateTime' in m.group(2) and re.search(r'(?m)^\t\tisKey\s*$', m.group(2)):
                keys[tab] = m.group(1).strip("'").replace("''", "'")
    out = []
    for f in sorted(glob.glob(os.path.join(report_dir, '*.Report', 'definition', 'pages', '*', 'visuals', '*', 'visual.json'))):
        try:
            d = json.load(open(f, encoding='utf-8-sig'))
        except Exception:
            continue
        v = d.get('visual', {})
        if v.get('visualType') != 'slicer':
            continue
        projs = v.get('query', {}).get('queryState', {}).get('Values', {}).get('projections', [])
        if len(projs) != 1:
            continue
        c = projs[0].get('field', {}).get('Column', {})
        tab, col = c.get('Expression', {}).get('SourceRef', {}).get('Entity'), c.get('Property')
        if tab not in keys or not col:
            continue
        ref = "'%s'" % tab.replace("'", "''")
        conds = []
        for fl in d.get('filterConfig', {}).get('filters', []):
            for w in (fl.get('filter') or {}).get('Where', []):
                dc = _dax_cond(w.get('Condition', {}), ref)
                if dc:
                    conds.append(dc)
        # KEEPFILTERS: intersect with the member filter the context transition brings (a plain column predicate on the
        # slicer's own column would REPLACE it and measure every member at once)
        flt = ''.join(', KEEPFILTERS ( %s )' % x for x in conds)
        tc, dk = '%s[%s]' % (ref, col), '%s[%s]' % (ref, keys[tab])
        expr = ('VAR cur = CALCULATE ( MAX ( %s ), FILTER ( ALL ( %s ), LEFT ( %s, 8 ) = "Current " )%s ) '
                'RETURN IF ( ISBLANK ( cur ), 0, COUNTROWS ( FILTER ( CALCULATETABLE ( VALUES ( %s )%s ), '
                'LEFT ( %s, 8 ) <> "Current " && CALCULATE ( MAX ( %s )%s ) > cur ) ) + 0 )'
                % (dk, tc, tc, flt, tc, flt, tc, dk, flt))
        out.append(('slicer-current|%s|%s|%s[%s]' % (os.path.basename(os.path.dirname(os.path.dirname(os.path.dirname(f)))),
                                                    d.get('name'), tab, col), expr))
    return out


FEW_ROWS = 6


def matrix_row_fields(report_dir):
    """matrix-few, engine half: {(table, column): [visual title]} for every visible matrix with ONE row field and no
    column field (and every table with one non-measure column) - layer engine counts the field's values; <= FEW_ROWS
    means the matrix shows a handful of lines in a frame -> a chart (user 2026-10-08: 4 e-com channels in a matrix)."""
    out = {}
    for f in glob.glob(os.path.join(report_dir, '*.Report', 'definition', 'pages', '*', 'visuals', '*', 'visual.json')):
        try:
            d = json.load(open(f, encoding='utf-8-sig'))
        except Exception:
            continue
        v = d.get('visual', {})
        if v.get('visualType') not in ('pivotTable', 'tableEx'):   # hidden tabs too
            continue
        q = v.get('query', {}).get('queryState', {})
        if v['visualType'] == 'pivotTable':
            if q.get('Columns', {}).get('projections'):
                continue
            cols = [p['field']['Column'] for p in q.get('Rows', {}).get('projections', []) if 'Column' in p.get('field', {})]
        else:
            cols = [p['field']['Column'] for p in q.get('Values', {}).get('projections', []) if 'Column' in p.get('field', {})]
        if len(cols) != 1 or 'Entity' not in cols[0]['Expression'].get('SourceRef', {}):
            continue
        key = (cols[0]['Expression']['SourceRef']['Entity'], cols[0]['Property'])
        out.setdefault(key, []).append(sel_name(d) or d.get('name'))
    return out


def neg_bar_exprs(report_dir):
    """neg-bars (user 2026-10-04: "ko đc đảo chiều chart từ trên xuống"): one DAX scalar per (column/bar chart, amount
    measure on its value axis) = the lowest value the chart can draw. A negative one hangs DOWN from the axis.
    Within the chart's own Top/Bottom N when it has one (Bottom 5 Bad Margin shows the 5 worst, not every item);
    '%' measures are exempt (a negative growth is its meaning)."""
    out = []
    for f in glob.glob(os.path.join(report_dir, '*.Report', 'definition', 'pages', '*', 'visuals', '*', 'visual.json')):
        try:
            d = json.load(open(f, encoding='utf-8-sig'))
        except Exception:
            continue
        v = d.get('visual', {})
        if v.get('visualType') not in H_AXIS_CHARTS + V_AXIS_CHARTS or d.get('isHidden'):
            continue
        q = v.get('query', {}).get('queryState', {})
        cats = [p.get('field', {}).get('Column') for p in q.get('Category', {}).get('projections', [])]
        if len(cats) != 1 or not cats[0]:
            continue
        cref = "'%s'[%s]" % (cats[0]['Expression']['SourceRef']['Entity'], cats[0]['Property'])
        rows = 'VALUES(%s)' % cref
        top = next((x for x in d.get('filterConfig', {}).get('filters', [])
                    if x.get('type') == 'TopN' and isinstance(x.get('filter'), dict)), None)
        if top:
            try:
                sq = top['filter']['From'][0]['Expression']['Subquery']['Query']
                ob = sq['OrderBy'][0]
                km = ob['Expression'].get('Measure', {}).get('Property')
            except (KeyError, IndexError, TypeError):    # a Top N of another shape: the whole value list is checked
                km = None
            if km:
                rows = 'TOPN(%d, FILTER(VALUES(%s), NOT ISBLANK([%s])), [%s], %s)' % (
                    int(sq['Top']), cref, km, km, 'ASC' if ob['Direction'] == 1 else 'DESC')
        # the chart's own value-list filters (In / Not In on a column) - without them the check cried wolf on
        # 'BOTTOM 5 REVENUE BY PRODUCT', whose IsSaleLine = 1 drops the negative discount lines (04/10)
        conds = []
        for x in d.get('filterConfig', {}).get('filters', []):
            if x.get('type') != 'Categorical' or 'Column' not in x.get('field', {}):
                continue
            c = x['field']['Column']
            col = "'%s'[%s]" % (c['Expression']['SourceRef']['Entity'], c['Property'])
            for w in x.get('filter', {}).get('Where', []):
                cond, neg = w.get('Condition', {}), False
                if 'Not' in cond:
                    cond, neg = cond['Not'].get('Expression', {}), True
                vals = cond.get('In', {}).get('Values')
                if not vals:
                    continue
                lits = []
                for row in vals:
                    s = row[0].get('Literal', {}).get('Value', '')
                    lits.append('"%s"' % s[1:-1].replace("''", "'").replace('"', '""') if s.startswith("'")
                                else s.rstrip('LDM') if re.fullmatch(r'-?\d+(\.\d+)?[LDM]?', s) else s.upper())
                lst = '{%s}' % ', '.join(lits)
                conds.append('FILTER(ALL(%s), NOT(%s IN %s))' % (col, col, lst) if neg
                             else 'KEEPFILTERS(TREATAS(%s, %s))' % (lst, col))
        for p in q.get('Y', {}).get('projections', []):
            m = p.get('field', {}).get('Measure')
            if not m or m['Property'].startswith('%'):
                continue
            ent = m['Expression']['SourceRef'].get('Entity')
            mref = '[%s]' % m['Property'] if ent == '#Measure' else "'%s'[%s]" % (ent, m['Property'])
            label = '%s|%s|%s' % (f.split(os.sep)[-4], sel_name(d) or d['name'], m['Property'])
            expr = 'MINX(%s, %s)' % (rows, mref)
            if conds:
                expr = 'CALCULATE(%s, %s)' % (expr, ', '.join(conds))
            out.append((label, expr))
    return out


def filter_literals(report_dir):
    """filter-value-gone, engine half (a department repo 13/10): {(table, column): [(where, [text values])]} of every 'In' filter
    (report · page · visual) that keeps rows by TEXT value. 05 Classic Export Data kept the legacy spelling 'Partime'
    while the warehouse says 'Parttime' - the filter matched nothing and the table showed no row, every layer green."""
    out = {}
    d_def = glob.glob(os.path.join(report_dir, '*.Report', 'definition'))
    if not d_def:
        return out
    files = [os.path.join(d_def[0], 'report.json')] + glob.glob(os.path.join(d_def[0], 'pages', '*', 'page.json')) + \
        glob.glob(os.path.join(d_def[0], 'pages', '*', 'visuals', '*', 'visual.json'))
    for f in files:
        try:
            d = json.load(open(f, encoding='utf-8-sig'))
        except Exception:
            continue
        for x in d.get('filterConfig', {}).get('filters', []):
            c = x.get('field', {}).get('Column')
            if x.get('type') != 'Categorical' or not c or 'Entity' not in c.get('Expression', {}).get('SourceRef', {}):
                continue
            for w in x.get('filter', {}).get('Where', []):
                rows = w.get('Condition', {}).get('In', {}).get('Values') or []     # Not In: a missing value hides nothing
                lits = [r[0].get('Literal', {}).get('Value', '') for r in rows if r and 'Literal' in r[0]]
                txt = [s[1:-1].replace("''", "'") for s in lits if s.startswith("'")]
                if txt and len(txt) == len(lits):
                    out.setdefault((c['Expression']['SourceRef']['Entity'], c['Property']), []).append(
                        (os.path.relpath(f, d_def[0]), txt))
    return out


def check_engine(report_dir, fail, wait=240):
    """Layer 3 - the Desktop engine: measures / columns / partitions in error, and one row read through every
    DirectQuery table. Attaches to a Desktop that already has this report open, else opens one and closes it
    WITHOUT saving (pressing "Don't save" on this report only)."""
    if _kind(report_dir) == 'Legacy':
        # the read-only original: its dead measures cannot be fixed (3 found on a department Legacy) - like the design rules
        LAYER_NOTES.append(('engine', 'n/a', 'Legacy is the read-only original'))
        return
    pbir = glob.glob(os.path.join(report_dir, '*.Report', 'definition.pbir'))
    if pbir and 'byConnection' in open(pbir[0], encoding='utf-8').read():
        LAYER_NOTES.append(('engine', 'n/a', 'live connection to the Service - no local model'))
        return
    import subprocess, tempfile
    ps = os.path.join(tempfile.gettempdir(), 'pbi_gate_engine.ps1')
    open(ps, 'w', encoding='utf-8-sig').write(ENGINE_PS)
    cols = slicer_text_columns(report_dir)
    slicer_cols = set(cols)
    few = matrix_row_fields(report_dir)
    cols = cols + sorted(k for k in few if k not in slicer_cols)
    flt = filter_literals(report_dir)
    cols = cols + sorted(k for k in flt if k not in set(cols))
    negf = os.path.join(tempfile.gettempdir(), 'pbi_gate_neg.txt')
    open(negf, 'w', encoding='utf-8').write('\n'.join('%s\t%s' % x for x in neg_bar_exprs(report_dir)
                                                      + slicer_current_exprs(report_dir)))
    try:
        out = subprocess.run(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps,
                              '-Dir', os.path.abspath(report_dir), '-Wait', str(wait),
                              '-Cols', ';;'.join('%s|%s' % c for c in cols), '-NegFile', negf],
                             capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=wait + 1800).stdout
    except Exception as e:
        LAYER_NOTES.append(('engine', 'NOT CHECKED', 'could not run PowerShell: %s' % e))
        return
    ev = [json.loads(l[2:]) for l in out.splitlines() if l.startswith('@@')]
    skip = [e for e in ev if e.get('event') == 'skip']
    for e in ev:
        if e.get('event') == 'bad':
            fail.append('engine: %s %s[%s] state %s - %s' % (e.get('kind'), e.get('table'), e.get('name'), e.get('state'),
                                                             (e.get('msg') or '').strip()[:200]))
        if e.get('event') == 'close-failed':
            fail.append('engine: %s' % e.get('msg'))
        if e.get('event') == 'neg' and (e.get('label') or '').startswith('slicer-current|'):
            _, pg_, vn_, col_ = e['label'].split('|', 3)
            if e.get('msg'):
                fail.append('engine: slicer %s (%s) - the slicer-current query failed: %s' % (vn_, col_, e['msg']))
            elif (e.get('v') or '0') not in ('', '0'):
                fail.append("engine: slicer %s on %s shows %s member(s) reaching past its 'Current ...' member - the label "
                            "and the slicer filter must use ONE reference date (skill pbi-white 3d slicer-current)" % (vn_, col_, e['v']))
            continue
        if e.get('event') == 'neg':
            try:
                low = float(e.get('v') or 'nan')
            except ValueError:
                low = float('nan')
            if low < 0:
                pg_, vn_, m_ = (e.get('label') or '||').split('|', 2)
                fail.append("engine: chart %s draws %s down to %s - a column must not hang DOWN from the axis; plot a "
                            "positive measure (e.g. the loss = -profit, label keeps the minus) (neg-bars)" % (vn_, m_, e.get('v')))
        if e.get('event') == 'vals' and (e['table'], e['name']) in few:
            n = len([x for x in (e.get('vals') or []) if (x or '').strip()])
            # design rule: Classic keeps the old matrices; 0 values = table not loaded yet, not "a handful" (03 IP 13/10)
            if 0 < n <= FEW_ROWS and not KEEP_OLD_DESIGN:
                fail.append("engine: %s show(s) only %d values of %s[%s] - a matrix of a handful of lines is a chart "
                            "(matrix-few)" % (', '.join(few[(e['table'], e['name'])]), n, e['table'], e['name']))
        if e.get('event') == 'vals' and (e['table'], e['name']) in flt:
            have = {(x or '').strip().lower() for x in (e.get('vals') or [])}
            if have - {''} and len(e.get('vals') or []) < 400:      # 400 = TOPN cap: a cut list proves nothing
                for where, txt in flt[(e['table'], e['name'])]:
                    if not any(t.strip().lower() in have for t in txt):
                        fail.append("engine: %s filters %s[%s] on %s - no such value in the data (it has e.g. %s): the "
                                    "filter keeps NO row (filter-value-gone)" % (where, e['table'], e['name'], ', '.join(
                                        "'%s'" % t for t in txt), ', '.join("'%s'" % v for v in sorted(have - {''})[:4])))
        if e.get('event') == 'vals' and (e['table'], e['name']) in slicer_cols:
            nums = [x for x in (e.get('vals') or []) if re.fullmatch(r'-?\d+', x or '')]
            if len(nums) >= 2 and sorted(nums) != sorted(nums, key=int):
                fail.append("engine: slicer column %s[%s] sorts as TEXT (%s) - give it a numeric sortByColumn "
                            "(skill pbi-white 3d slicer-sort)" % (e['table'], e['name'], ', '.join(sorted(nums)[:6]) + ' ...'))
    done = [e for e in ev if e.get('event') == 'done']
    how = next(('attached to the open Desktop' if not e.get('own') else 'opened + closed without saving'
                for e in ev if e.get('event') == 'desktop'), '')
    if skip or not done:
        LAYER_NOTES.append(('engine', 'NOT CHECKED', (skip[0]['msg'] if skip else 'no result from the engine') +
                            (' (%s)' % how if how else '')))
        return
    d = done[0]
    # matrix-fit (user 14/10): no number of a table / matrix wraps, the columns fill the frame without a horizontal scroll
    # bar. Needs the report OPEN (it reads every table's own query); when the gate opened + closed Desktop itself, deferred.
    attached = any(e.get('event') == 'desktop' and not e.get('own') for e in ev)
    if _kind(report_dir) in ('White', 'Red'):
        if attached:
            try:
                import matrix_fit
                matrix_fit.check(report_dir, fail)
            except Exception as e:
                LAYER_NOTES.append(('engine', 'matrix-fit NOT CHECKED', str(e).split('\n')[0][:160]))
        else:
            LAYER_NOTES.append(('engine', 'matrix-fit deferred', 'open the report in Desktop and run the gate again'))
    LAYER_NOTES.append(('engine', 'checked', '%s; %s DirectQuery tables read%s' % (
        how, d.get('directquery'), '; %s import partitions not loaded (their SQL is checked by layer dw)' % d.get('import_not_loaded')
        if d.get('import_not_loaded') else '')))


def run(report_dir, strict_page=None, verbose=False, layers='all'):
    fail, warn, legend_warn = [], [], []
    rep, d_def, vis, bms = load(report_dir, fail)
    if rep is None:
        print('NO *.Report found in', report_dir)
        return 2

    groups = set((p, i) for (p, i), d in vis.items() if 'visualGroup' in d)
    # measure-dup (2026-09-29): two measures with the same name (case-insensitive) - Desktop refuses to open the project
    # ("TMDL objects cannot be merged because both declare a description"); a placeholder added twice did exactly that
    for mt_ in glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '*.tmdl')):
        seen_ = {}
        for nm_ in re.findall(r"(?m)^	measure\s+('(?:[^']|'')+'|[^\s=]+)\s*=", open(mt_, encoding='utf-8').read()):
            k_ = nm_.strip("'").lower()
            if k_ in seen_:
                fail.append('measure %s declared twice in %s - Desktop will not open the file' % (nm_, os.path.basename(mt_)))
            seen_[k_] = 1
        # measure-format-both (14/10, 01 White ~Metrix by Ty Hour): a measure with a formatStringDefinition must NOT keep its
        # static formatString - Desktop opens with "Issues were found ... both FormatString property and FormatStringDefinition"
        # and loads no model (every DirectQuery query then fails "Unable to convert an M query")
        for blk_ in re.split(r'(?m)^(?=	(?:measure|column|partition|hierarchy)\s)', open(mt_, encoding='utf-8').read()):
            mm_ = re.match(r"	measure\s+('(?:[^']|'')+'|[^\s=]+)", blk_)
            if mm_ and re.search(r'(?m)^		formatString:', blk_) and re.search(r'(?m)^		formatStringDefinition\s*=', blk_):
                fail.append('measure %s has both formatString and formatStringDefinition in %s - drop the static formatString '
                            '(measure-format-both)' % (mm_.group(1), os.path.basename(mt_)))
            # tmdl-multiline (17/10, 04 IP Classic '#Sale Yesterday LW'): code after "measure X =" on the SAME line and more code
            # lines below - TMDL wants a multi-line expression to START on the next line. Desktop: "TMDL Format Error ...
            # InvalidLineType - Unexpected line type: Other!" and loads no model
            mh_ = re.match(r"	measure\s+(?:'(?:[^']|'')+'|[^\s=]+)\s*=[ \t]*(\S[^\n]*)\n((?:			[^\n]*\n)+)", blk_ or '')
            if mm_ and mh_ and not mh_.group(1).startswith('```'):   # a ``` fence after "=" is valid TMDL (fenced expression)
                fail.append('measure %s in %s starts its expression on the "=" line and continues below - move the whole expression '
                            'to the lines under "=" (tmdl-multiline)' % (mm_.group(1), os.path.basename(mt_)))
    leaves = set(vis) - groups

    pmeta = page_meta(d_def)
    if strict_page == 'all':
        strict_set = {p for p, m in pmeta.items() if m.get('visibility') != 'HiddenInViewMode'}
    else:
        strict_set = {strict_page} if strict_page else None

    def put(pg, msg):
        (fail if (strict_set is None or pg in strict_set) else warn).append(msg)

    global KEEP_OLD_DESIGN
    KEEP_OLD_DESIGN = os.path.basename(os.path.normpath(report_dir)).endswith(('_Classic', '_Legacy'))
    check_structure(vis, bms, groups, leaves, put, fail)
    # field parameters: a model rule for the versions we build - not kept on _Legacy (its original cannot be fixed)
    check_field_params(report_dir, d_def, fail)
    f_rl = len(fail)
    check_report_level(report_dir, rep, d_def, vis, fail)
    check_fillrule(d_def, fail)
    check_field_refs(report_dir, d_def, fail)
    check_m_steps(report_dir, fail)
    check_bookmark_filter_objects(d_def, fail)
    check_filter_where_field(d_def, fail)
    if not os.path.basename(os.path.normpath(report_dir)).endswith('_Legacy'):
        check_dead_entity(report_dir, d_def, fail)
        check_extension_ref(d_def, fail)
        check_dead_field(report_dir, d_def, fail)
        check_literal_type(report_dir, d_def, fail)
        # design rules of the White copy (its BG_ frames by group, its filter panel); literal-type above is a file error and
        # runs on every tier
        if _kind(report_dir) == 'White':
            check_dead_visual(d_def, fail)
            check_select_all(d_def, fail)
    check_user_save(report_dir, fail)
    check_bridge_bypass(report_dir, fail)
    if not KEEP_OLD_DESIGN:
        check_own_background(d_def, fail)
        check_kimball16(d_def, fail)
        check_column_names(d_def, fail)
        check_measure_names(d_def, fail)
    elif os.path.basename(os.path.normpath(report_dir)).endswith('_Classic'):
        check_kimball16_classic(report_dir, fail)
    # visual titles: White / Red only - Classic keeps the old design (a department 14/10, newer than the 12/10 call
    # to check Classic too); the Legacy original is exempt anyway
    if not KEEP_OLD_DESIGN:
        check_title_case(d_def, fail)
    f_rl_end = len(fail)
    #  _Legacy = the ORIGINAL of the old system, read-only (skill pbi-legacy forbids editing it). Only the folder /
    #  file-name rule applies; every design rule (Selection names, geometry, bookmarks ...) is for the versions we
    #  BUILD. a department repo 28/09: 81 and 203 false errors on two department Legacy files -> gate noise nobody may fix.
    legacy = os.path.basename(os.path.normpath(report_dir)).endswith('_Legacy')
    if _kind(report_dir) == 'White':
        # measure-folder (user 2026-09-27): Power BI sorts folders as text (1, 10, 11, 2) -> letters in page order
        mt = glob.glob(os.path.join(report_dir, '*.SemanticModel', 'definition', 'tables', '#Measure.tmdl'))
        if mt:
            folders = set(re.findall(r'(?m)^\t\tdisplayFolder: (.+?)\r?$', open(mt[0], encoding='utf-8').read()))
            order0 = json.load(open(os.path.join(d_def, 'pages', 'pages.json'), encoding='utf-8'))['pageOrder']
            pm0 = page_meta(d_def)
            vis0 = [p for p in order0 if pm0.get(p, {}).get('visibility') != 'HiddenInViewMode']
            want = {'A. Calculation'} | {'%s. %s' % (chr(ord('A') + i + 1), pm0[p]['displayName']) for i, p in enumerate(vis0)}
            for f in sorted(folders - want):
                fail.append("#Measure folder '%s' is not A. Calculation or '<letter>. <page name>' in page order - "
                            "run mix_builder --measure-folders" % f)
            for f in sorted(want - folders):
                fail.append("#Measure folder '%s' missing - every page keeps its folder (hidden ~Placeholder)" % f)
        # bm-number (user 2026-09-27): numbers follow the real page order, renumbered after any page change
        order = json.load(open(os.path.join(d_def, 'pages', 'pages.json'), encoding='utf-8'))['pageOrder']
        pm = page_meta(d_def)
        visible_order = [p for p in order if pm.get(p, {}).get('visibility') != 'HiddenInViewMode']
        for n_, b_ in bms.items():
            pg_ = b_.get('explorationState', {}).get('activeSection')
            dn_ = str(b_.get('displayName', n_))
            if pg_ not in pm:
                fail.append('%s: bookmark of a deleted page - delete it and move the numbers below up' % dn_)
                continue
            if pg_ in visible_order:
                want = '%02d' % (visible_order.index(pg_) + 1)
                if not dn_.startswith(want + '_'):
                    fail.append("%s: prefix must be %s (page '%s' is page %d of %d) - run mix_builder --renumber-bookmarks"
                                % (dn_, want, pm[pg_]['displayName'], visible_order.index(pg_) + 1, len(visible_order)))
    for n_, b_ in (bms.items() if _kind(report_dir) == 'White' else []):
        o_ = b_.get('options', {})
        if o_.get('targetVisualNames') and o_.get('applyOnlyToTargetVisuals') is not True:
            fail.append('%s: has a target list but no applyOnlyToTargetVisuals=true - Power BI applies it to the '
                        'whole page (pressing it resets the tab)' % b_.get('displayName', n_))
    check_images(rep, d_def, vis, fail)
    check_states(vis, bms, put, fail)
    global CAPTION_EXEMPT
    CAPTION_EXEMPT = caption_exempt(vis)
    check_names(vis, put)
    check_tab_default(vis, put)
    check_default_vs_main(vis, bms, put)
    check_axis_sort(vis, put, sorted_columns(report_dir))
    if not os.path.basename(os.path.normpath(report_dir)).endswith(('_Legacy', '_Classic')):
        check_topn(vis, put)       # Legacy/Classic keep the old behaviour on purpose (the number match is their test)
    if _kind(report_dir) in ('White', 'Red'):
        check_fillrule_dead(vis, put)
    enum_warn = []
    check_enums(vis, put, enum_warn)

    # header-text on EVERY visible page (user 14/10: 'Franchise' cut to 'Fra' on several pages - the check ran only on the
    # strict page, so renamed pages kept the frame of the old name)
    for sp in sorted(p for p, m in pmeta.items() if m.get('visibility') != 'HiddenInViewMode'):
        hf, tf = [], []
        pv_ = dict((i, d) for (pg, i), d in vis.items() if pg == sp)
        check_header(pv_, hf)
        if sp not in (strict_set or ()) and not KEEP_OLD_DESIGN:
            check_typography(pv_, tf, [])           # title size / align / Semibold on every White / Red page (14/10)
        grp_ = dict((d['visualGroup'].get('displayName'), d) for d in pv_.values() if 'visualGroup' in d)
        if 'Title' in grp_ and 'Tab' in grp_ and grp_['Tab']['position']['x'] < grp_['Title']['position']['width'] + 5:
            hf.append("the Title group ends at %s, the tab strip starts at %s - the name runs under the tabs (shorter name, or "
                      "fewer / narrower tabs)" % (grp_['Title']['position']['width'], grp_['Tab']['position']['x']))
        fail.extend("[%s] %s (header-text, mix_builder.py --fit-header)" % (pmeta[sp]['displayName'], x) for x in hf)
        fail.extend("[%s] %s%s" % (pmeta[sp]['displayName'], x, '' if x.endswith(')') else ' (title-style, mix_builder.py --title-style)')
                    for x in tf)
    for sp in sorted(strict_set or []):
        page_vis = dict((i, d) for (pg, i), d in vis.items() if pg == sp)
        before = len(fail)
        if KEEP_OLD_DESIGN:
            # Classic keeps the old layout on purpose (skill pbi-classic §1: grid 5 / header / typography do NOT apply).
            # a department repo 13/10: '--page all' on 03 IP Classic gave 153 grid + title-size errors that nobody may fix.
            continue
        check_geometry(page_vis, fail, os.path.basename(os.path.normpath(report_dir)))
        check_header(page_vis, fail)
        check_typography(page_vis, fail, legend_warn)
        check_dashboard(page_vis, fail)
        check_card(page_vis, fail)
        check_button_edge(page_vis, fail)
        if strict_page == 'all':
            fail[before:] = ["[%s] %s" % (pmeta[sp]['displayName'], x) for x in fail[before:]]
    if strict_set and not KEEP_OLD_DESIGN:   # Classic keeps the legacy bookmark names ('Summary', 'TC&TA' ...)
        check_bookmark_names(bms, fail)

    if legacy:
        fail[:] = fail[f_rl:f_rl_end]
        warn[:] = []
        legend_warn[:] = []
        enum_warn = []
        GAP_WARN[:] = []
        MATRIX_WARN[:] = []
        DIAG_WARN[:] = []
        print('LEGACY (read-only original): only the folder / file-name rule is checked.')
    n_static = len(fail)
    if layers in ('all', 'pre-open'):
        check_dw(report_dir, fail)
    elif layers == 'open':
        # the open check blocks only what breaks the file: a warehouse finding never blocks the opening, and reading the
        # warehouse took minutes on a 13-fact model - past the host's hook timeout, so the hook was killed and blocked nothing
        LAYER_NOTES.append(('dw', 'deferred', 'the open check blocks only what breaks the file - the full gate reads the warehouse'))
    else:
        LAYER_NOTES.append(('dw', 'NOT CHECKED', '--static'))
    if layers == 'all':
        check_engine(report_dir, fail)
    elif layers in ('pre-open', 'open'):
        LAYER_NOTES.append(('engine', 'deferred', 'runs once Desktop has the file open - run the gate again then'))
    else:
        LAYER_NOTES.append(('engine', 'NOT CHECKED', '--static'))
    print('visual=%d  leaf=%d  group=%d  bookmark=%d'
          % (len(vis), len(leaves), len(groups), len(bms)))
    print('-' * 64)
    if warn:
        # fold the warnings of pages NOT yet standardised into a summary - so they do not
        # drown the real errors. Add --verbose to see every line.
        kinds = {}
        for x in warn:
            k = ('unnamed' if 'NOT NAMED' in x
                 else 'bad name' if ': name ' in x or 'standard name' in x
                 else 'bookmark' if 'bookmark' in x.lower() or 'WHOLE PAGE' in x
                 else 'other')
            kinds[k] = kinds.get(k, 0) + 1
        print('  ! %d warnings on pages NOT yet standardised: %s'
              % (len(warn), ', '.join('%s x%d' % kv for kv in sorted(kinds.items()))))
        if verbose:
            for x in warn:
                print('      -', x)
        print('')
    for x in legend_warn:
        print('  ! LEGEND (the user sets it, the agent does NOT edit it):', x)
    for x in MATRIX_WARN:
        print('  ! MATRIX SCROLL:', x)
    for x in GAP_WARN:
        print('  ! GAP (no warehouse source yet):', x)
    for x in DIAG_WARN:
        print('  ! PENDING / OTHER TIER:', x)
    for pg2, m in enum_warn:
        if strict_set is None or pg2 in strict_set:
            print('  ! ENUM:', m)
    if legend_warn:
        print('')
    if layers == 'open':
        # --open-check (user 09/10: "thiết kế là để kiểm cho chuẩn, chứ chặn ko cho mở luôn thì sao t kiểm dc"): the hook
        # before Desktop opens a file blocks ONLY what breaks the file itself; every design / warehouse finding is listed
        # for the user to look at, and the full gate still runs once the file is open.
        breaks = [x for x in fail if any(p in x for p in OPEN_BREAKERS)]
        design = [x for x in fail if x not in breaks]
        for x in design:
            print('  ! TO CHECK (does not block opening):', x)
        fail[:] = breaks
        n_static = len(fail)
    for x in fail:
        print('  X', x)
    print('LAYER static : %s' % ('%d errors' % n_static if n_static else 'checked'))
    for ly, st, dt in LAYER_NOTES:
        print('LAYER %-7s: %s - %s' % (ly, st, dt))
    if fail:
        print('')
        print('GATE RED: %d errors' % len(fail))
        return 1
    missing = [ly for ly, st, dt in LAYER_NOTES if st == 'NOT CHECKED']
    if missing:
        print('GATE INCOMPLETE - no error found, but NOT CHECKED: %s (see LAYER lines)' % ', '.join(missing))
        return 3
    print('GATE GREEN - no errors on every layer that applies')
    return 0


def audit(root, verbose=False):
    """--audit (a department repo 21/10: the gate must find on its own every report that falls short): the static layer over
    EVERY report folder under <root> (default reports/), one table - errors per report, the filter-panel findings
    (missing boxes · order · sync) named page by page - so the files off the standard are found without opening each.
    Each report runs in its own process (the gate keeps per-report globals). Exit 1 when any report has an error."""
    folders = sorted(os.path.dirname(p) for p in glob.glob(os.path.join(root, '*', '*.Report')))
    if not folders:
        print('no report folder (*/*.Report) under', root)
        return 2
    worst = 0
    print('%-40s %7s %7s' % ('report', 'errors', 'filter'))
    detail = []
    for f in folders:
        out = subprocess.run([sys.executable, os.path.abspath(__file__), f, '--static', '--verbose'],
                             capture_output=True, text=True, encoding='utf-8', errors='backslashreplace')
        lines = [ln.strip()[2:] for ln in out.stdout.splitlines() if ln.strip().startswith('X ')]
        m = re.search(r'LAYER static\s*:\s*(\d+) errors', out.stdout)
        n = int(m.group(1)) if m else (0 if 'checked' in out.stdout else -1)
        flt = [ln for ln in lines if 'filter panel' in ln]
        print('%-40s %7s %7d' % (os.path.basename(f), n if n >= 0 else '?', len(flt)))
        detail += [(os.path.basename(f), ln) for ln in (lines if verbose else flt)]
        worst = max(worst, 1 if n else 0)
    for rep, ln in detail:
        print('  %s: %s' % (rep, ln))
    return worst


if __name__ == '__main__':
    sys.stdout.reconfigure(errors='backslashreplace')   # Windows console is cp1252: a Vietnamese name must not crash the report
    argv = sys.argv[1:]
    if '--rules' in argv:
        print('The pbi_gate gate checks %d rule groups:' % len(RULES))
        for k, v in RULES:
            print('  %-15s %s' % (k, v))
        print('')
        print('Full rules (with the why, diagrams, JSON templates, examples already paid for): '
              '.claude/skills/pbi-white/SKILL.md')
        sys.exit(0)
    page = None
    if '--page' in argv:
        k = argv.index('--page')
        page = argv[k + 1] if k + 1 < len(argv) else None
        del argv[k:k + 2]
    verbose = '--verbose' in argv
    layers = ('open' if '--open-check' in argv else 'pre-open' if '--pre-open' in argv
              else 'static' if '--static' in argv else 'all')
    pos = [a for a in argv if not a.startswith('--')]
    if '--audit' in argv:
        sys.exit(audit(pos[0] if pos else 'reports', verbose))
    if not pos:
        print(__doc__)
        sys.exit(2)
    sys.exit(run(pos[0], page, verbose, layers))
