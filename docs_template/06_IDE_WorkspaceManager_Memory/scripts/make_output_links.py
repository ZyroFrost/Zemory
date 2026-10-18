"""make_output_links.py — put `_SharePoint.url` shortcuts into data/<task>/01_raw/ (input_url) and 03_output/ (output_url) of every task that runs on the VM (DW repo docs/plan/22 §7).

    python scripts\\make_output_links.py            (run from the repo root; safe to re-run)

Why: scheduled tasks run on the VM and upload their final result to SharePoint DataReport; on the work PC their
`03_output` stays empty, which looks broken. The shortcut says where the final result lives — one double-click opens it.
It is a LINK, not a sync: nothing written locally ever reaches SharePoint (a OneDrive-synced folder would turn a local
test run into a published report).
Where the link comes from: the `output_url:` field in the header of tasks/<task>/spec.md (one URL, or several separated by
` | `). Only tasks that run on the VM (have tasks/<task>/vm_deploy.json) are looked at; one with no output_url is listed —
fill the field, re-run.
Shipped by zemory: store part Skill_Task_VmAutomation (its installs). Change the store part, never the repo copy.
"""
import re
import sys
from pathlib import Path

ROOT = Path.cwd()
if not (ROOT / "tasks").is_dir():
    sys.exit("run from the repo root (no tasks/ here: %s)" % ROOT)


def header(spec):
    t = spec.read_text(encoding="utf-8", errors="replace")
    m = re.match(r"^---\s*\n(.*?)\n---", t, re.S)
    out = {}
    for line in (m.group(1).splitlines() if m else []):
        if ":" in line and not line.startswith(" "):
            k, v = line.split(":", 1)
            out[k.strip()] = re.sub(r"\s+#.*$", "", v).strip().strip('"').strip("'")
    return out


made, skipped = 0, []
# user 04/10 (new standard): a task that runs on the VM keeps NO data on the work PC — 01_raw and 03_output each hold only a
# shortcut to where the real thing lives (input: SharePoint DataInput, versions = what each run read · output: DataReport).
# Cases / one-off work run on the PC keep the classic 3 stages and are not looked at (no vm_deploy.json).
SLOTS = (("01_raw", "input_url", False), ("03_output", "output_url", True))   # (folder, spec field, field required)
for spec in sorted(ROOT.glob("tasks/*/spec.md")):
    task = spec.parent.name
    h = header(spec)
    # the first VM pilot: judge by "is it on the VM" (has vm_deploy.json), not by cadence — a Monthly case that is not built yet
    # is not a scheduled task and must not be reported as missing output_url.
    if not (spec.parent / "vm_deploy.json").exists():
        continue
    for folder, field, required in SLOTS:
        urls = [u.strip() for u in (h.get(field) or "").split("|") if u.strip().startswith("http")]
        d = ROOT / "data" / task / folder
        if not urls:
            if required:
                skipped.append((task, field))
        else:
            d.mkdir(parents=True, exist_ok=True)
            for i, u in enumerate(urls):
                name = "_SharePoint.url" if i == 0 else "_SharePoint_%d.url" % (i + 1)
                (d / name).write_text("[InternetShortcut]\r\nURL=%s\r\n" % u, encoding="ascii", errors="ignore")
                made += 1
            print("link  %-45s %-10s -> %s" % (task, folder, " | ".join(urls)))
        # 01_raw/reference/ = reference files received from others that code/tests rebuild against (not a run input) — stays
        # on the PC by design (user 04/10), so it is not an extra. 05/10 (the department standard §5c mục 3, xếp theo CHIỀU §1c):
        # 03_output/reference/ = templates / benchmarks of the DELIVERABLE — same rule, also not an extra
        extra = sorted(f.name for f in d.iterdir() if not f.name.startswith("_SharePoint")
                       and not (folder in ("01_raw", "03_output") and f.name == "reference" and f.is_dir())) if d.is_dir() else []
        if extra:
            print("EXTRA %-45s %-10s must hold only the shortcut — %d other file(s): %s  -> scripts/move_outputs_to_vm.py"
                  % (task, folder, len(extra), ", ".join(extra[:5]) + (" …" if len(extra) > 5 else "")))
print("%d shortcut(s) written" % made)
for t, f in skipped:
    print("SKIP  %-45s task on the VM with no %s in spec.md — fill it, re-run" % (t, f))
