"""Move every report folder of a department repo to the current name pattern, in one pass.

    python scripts/rename_reports.py            # dry run: prints every move and every file it would repoint
    python scripts/rename_reports.py --apply    # git mv each folder, then repoint every reference

Pattern (pbi_gate.py file-name, 2026-10-19):
    folder <DEPT>_<NN>_<FUNCTION>[-<Tier>]_<IP|DR>_<Legacy|Classic|White|Red>      OPS_02_STORE-REPORT-AM_DR_White
    file   <DEPT>_<NN>_<FUNCTION>[-<Tier>]_<Live|Scheduled>[_V<n>]                 OPS_02_STORE-REPORT-AM_Live
Old folders it moves:
    <DEPT>_<NN><IP|DR>_<Function>[AM|OM]_<Kind>     OPS_02DR_StoreReportAM_Mix  -> OPS_02_STORE-REPORT-AM_DR_White
    <DEPT>_<NN>_<FUNCTION>[-<Tier>]_<IP|DR>_<Mix|Main>                          -> the kind renamed (Mix White, Main Red)
    <DEPT>_<NN>_<FUNCTION>[-<Tier>]_<Type>_<IP|DR>                              -> code before kind

Only FOLDER names change; the files inside (the Service item names) already carry the file pattern and are not touched.
A reference is the old folder name as a whole token in any tracked text file - config/pbi-gate.json keys (strict_page,
pct_neutral, matrix_exempt, dropped_visuals ...), reports/README.md, task notes, scripts. Close Power BI Desktop first:
it locks the files and git mv fails with Permission denied.
"""
import os
import re
import subprocess
import sys

KIND = {'Mix': 'White', 'Main': 'Red', 'Legacy': 'Legacy', 'Classic': 'Classic', 'White': 'White', 'Red': 'Red'}
OLD_RX = re.compile(r'^([A-Z]{2,4})_(\d\d)(IP|DR)_([A-Z][A-Za-z0-9]*?)(AM|OM)?_(Legacy|Classic|Mix|Main)$')
# the new shape with an old kind, and the kind-before-code order of the first 19/10 message
OLD_KIND_RX = re.compile(r'^([A-Z]{2,4})_(\d\d)_([A-Z0-9]+(?:-[A-Z0-9]+)*)_(IP|DR)_(Mix|Main)$')
SWAPPED_RX = re.compile(r'^([A-Z]{2,4})_(\d\d)_([A-Z0-9]+(?:-[A-Z0-9]+)*)_(Legacy|Classic|White|Red|Mix|Main)_(IP|DR)$')
TEXT_EXT = {'.md', '.json', '.py', '.ps1', '.psm1', '.bat', '.cmd', '.txt', '.yml', '.yaml', '.toml', '.csv', '.js',
            '.mjs', '.ts', '.ini', '.cfg', '.pbir', '.pbism', '.tmdl', '.sql', '.dax', '.html'}
MAX_BYTES = 5 * 1024 * 1024


# a line that tells the history of a name keeps the old name (a department repo 19/10: "tên tới 15/10: <old>" became a folder
# that never existed)
HISTORY_RX = re.compile(r'(tên (tới|cũ|trước)|đổi tên|trước đây|renamed|formerly|was named|old name|until \d)', re.I)


def names_rx(moves):
    return re.compile(r'(?<![A-Za-z0-9_-])(%s)(?![A-Za-z0-9_-])' % '|'.join(re.escape(o) for o, _ in moves))


def file_function(folder_function):
    """PascalCase folder token -> file token (same as pbi_gate.file_function): StoreReport -> STORE-REPORT."""
    return '-'.join(w.upper() for w in re.findall(r'[A-Z0-9]+(?![a-z])|[A-Z][a-z0-9]*', folder_function))


def new_name(name):
    m = OLD_RX.match(name)
    if m:
        dept, num, mode, func, tier, kind = m.groups()
        return '%s_%s_%s%s_%s_%s' % (dept, num, file_function(func), '-' + tier if tier else '', mode, KIND[kind])
    m = OLD_KIND_RX.match(name)
    if m:
        dept, num, func, mode, kind = m.groups()
        return '%s_%s_%s_%s_%s' % (dept, num, func, mode, KIND[kind])
    m = SWAPPED_RX.match(name)
    if m:
        dept, num, func, kind, mode = m.groups()
        return '%s_%s_%s_%s_%s' % (dept, num, func, mode, KIND[kind])
    return None


def tracked_files(root):
    try:
        out = subprocess.run(['git', 'ls-files', '-z'], cwd=root, capture_output=True, check=True).stdout
        return [p for p in out.decode('utf-8').split('\0') if p]
    except Exception:
        return [os.path.relpath(os.path.join(d, f), root) for d, ds, fs in os.walk(root)
                if not ds.__setitem__(slice(None), [x for x in ds if x not in ('.git', 'node_modules', '.venv')])
                for f in fs]


def main(argv):
    apply = '--apply' in argv
    root = os.path.abspath(next((a for a in argv if not a.startswith('--')), '.'))
    rdir = os.path.join(root, 'reports')
    if not os.path.isdir(rdir):
        print('no reports/ folder under %s' % root)
        return 1
    moves = []
    for name in sorted(os.listdir(rdir)):
        if not os.path.isdir(os.path.join(rdir, name)):
            continue
        nn = new_name(name)
        if nn and nn != name:
            moves.append((name, nn))
    if not moves:
        print('every report folder already follows the pattern')
        return 0
    targets = [n for _, n in moves]
    clash = [n for n in targets if targets.count(n) > 1 or os.path.exists(os.path.join(rdir, n))]
    if clash:
        print('STOP - two folders would take one name, or the name exists: %s' % ', '.join(sorted(set(clash))))
        return 1
    edits = []
    for rel in tracked_files(root):
        p = os.path.join(root, rel)
        if os.path.splitext(rel)[1].lower() not in TEXT_EXT or not os.path.isfile(p) or os.path.getsize(p) > MAX_BYTES:
            continue
        try:
            s = open(p, 'rb').read().decode('utf-8')
        except (OSError, UnicodeDecodeError):
            continue
        n = sum(len(names_rx(moves).findall(line)) for line in s.split('\n') if not HISTORY_RX.search(line))
        if n:
            edits.append((rel, n))
    for o, n in moves:
        print('move  reports/%s  ->  reports/%s' % (o, n))
    for rel, n in edits:
        print('edit  %s  (%d reference%s)' % (rel, n, '' if n == 1 else 's'))
    if not apply:
        print('dry run: %d folder(s), %d file(s) - run again with --apply' % (len(moves), len(edits)))
        return 0
    done, stop = [], ''
    for o, n in moves:
        src, dst = os.path.join('reports', o), os.path.join('reports', n)
        tracked = subprocess.run(['git', 'ls-files', '--', src], cwd=root, capture_output=True, text=True)
        if tracked.returncode != 0 or not tracked.stdout.strip():
            # git tracks nothing here (a folder holding only an ignored .pbix: "fatal: source directory is empty")
            try:
                os.rename(os.path.join(root, src), os.path.join(root, dst))
            except OSError as e:
                stop = '%s: %s' % (o, e)
                break
        else:
            r = subprocess.run(['git', 'mv', src, dst], cwd=root, capture_output=True, text=True)
            if r.returncode != 0:
                stop = '%s: %s' % (o, r.stderr.strip())
                break
        done.append((o, n))
    # every folder that moved is repointed, also when the run stopped half way: a second run no longer sees its old name
    fixed = 0
    if done:
        rx, to = names_rx(done), dict(done)
        for rel, _ in edits:
            rel_now = rel
            for o, n in done:
                rel_now = re.sub(r'(^|[\\/])%s(?=[\\/])' % re.escape(o), lambda m: m.group(1) + n, rel_now)
            p = os.path.join(root, rel_now)
            if not os.path.isfile(p):
                continue
            s = open(p, 'rb').read().decode('utf-8')
            new = '\n'.join(line if HISTORY_RX.search(line) else rx.sub(lambda m: to[m.group(1)], line) for line in s.split('\n'))
            if new != s:
                open(p, 'wb').write(new.encode('utf-8'))
                fixed += 1
    print('moved %d of %d folder(s), repointed %d file(s).%s' % (len(done), len(moves), fixed,
          ' STOPPED at %s - close Power BI Desktop if it holds the file, then run again' % stop if stop else
          ' Run scripts/pbi_gate.py on each report; the Service item names do not change.'))
    return 1 if stop else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
