"""query.py — run one read-only query through the region's query app, with this repo's own account.

    python scripts\\query.py <db_id> "<SELECT ...>" [limit]      rows as JSON (one line per row)
    python scripts\\query.py --map                               the db_ids the app serves (<server>.<database>)
    python scripts\\query.py --check                             sign in and run SELECT 1 (the account and the network work)

For probing, looking up and reconciling by the agent on the work PC (skill task-pull §Dò dữ liệu). The code a task runs on the
server reads the warehouse through its connection variable, never through this tool.

Where things come from — nothing company-specific lives in this file:
  · region values (scripts/region_values.py › <manager>/data/region/values.json):
      query_client_dir   the folder holding the app's client (web_query.py + gate_account.py)
      query_python       the python that can import that client (it needs the app's own packages)
      query_vault_file   the file name of the account in a repo's vault
      query_row_cap      rows the app returns per call at most
      query_warehouse_id the app's db_id of the warehouse (what --check asks)
  · the account: data/secrets/vault/<query_vault_file> of THIS repo (encrypted for the Windows user; one account per
    department, so the app's log names the department that asked). Never another repo's vault.

The app's rules hold: one SELECT / WITH statement, no ';', no write keyword; at most query_row_cap rows per call — page with
OFFSET ... FETCH NEXT and do not conclude while the last page is still full.
Shipped by zemory: store part Skill_Task_Pull (its installs). Change the store part, never the repo copy.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from region_values import value as region_value  # noqa: E402

ROOT = HERE.parent
VAULT_DIR = ROOT / "data" / "secrets" / "vault"


def fail(msg, code=2):
    sys.stderr.write("query.py: " + msg + "\n")
    sys.exit(code)


def need(key):
    v = region_value(str(ROOT), key, "")
    if not v:
        fail("region value '%s' is not set (data/region/values.json of the region manager)" % key)
    return v


def main(argv):
    client_dir, py, vault_name = need("query_client_dir"), need("query_python"), need("query_vault_file")
    vault = VAULT_DIR / vault_name
    if not vault.is_file():
        if (ROOT / ".vault" / vault_name).is_file():
            fail("the account is still in .vault/ — move the vault to data/secrets/vault/ (slot Data_102_Secrets), then run again")
        fail("no account in %s — ask the user for a temporary password, then set it up with the app's gate_account setup" % vault)
    # the client imports the app's packages: re-run under the app's python unless this one already is it
    if os.path.normcase(os.path.abspath(sys.executable)) != os.path.normcase(os.path.abspath(py)) and not os.environ.get("ZQ_CHILD"):
        if not Path(py).is_file():
            fail("query_python does not exist on this machine: %s" % py)
        env = dict(os.environ, ZQ_CHILD="1", PYTHONUTF8="1")
        sys.exit(subprocess.call([py, str(Path(__file__).resolve())] + argv, env=env))
    sys.path.insert(0, client_dir)
    import gate_account  # noqa: E402  (the app's client)
    from web_query import WebQuery  # noqa: E402
    gate_account.STORE = vault
    acc = gate_account.load()
    if not acc:
        fail("the account in %s does not decrypt for this Windows user — ask the user for a new temporary password" % vault)
    wq = WebQuery(acc["url"], acc["user"], acc["password"])
    if argv[:1] == ["--map"]:
        with wq.opener.open(wq.api_url("/api/map"), timeout=60) as r:
            print(json.dumps(json.loads(r.read() or b"{}"), ensure_ascii=False))
        return 0
    if argv[:1] == ["--check"]:
        db = need("query_warehouse_id")
        rows = wq.query(db, "SELECT 1 AS ok, DB_NAME() AS db")["rows"]
        print("ok · user %s · %s · %s" % (acc["user"], db, rows))
        return 0
    if len(argv) < 2:
        fail('usage: python scripts\\query.py <db_id> "<SELECT ...>" [limit]  ·  --map  ·  --check', 1)
    cap = int(region_value(str(ROOT), "query_row_cap", 1000) or 1000)
    limit = int(argv[2]) if len(argv) > 2 else cap
    rows = wq.query(argv[0], argv[1], min(limit, cap)).get("rows") or []
    for row in rows:
        print(json.dumps(row, ensure_ascii=False, default=str))
    if len(rows) >= cap:
        sys.stderr.write("query.py: %d rows = the cap — page with OFFSET ... FETCH NEXT; the result may be cut\n" % len(rows))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
