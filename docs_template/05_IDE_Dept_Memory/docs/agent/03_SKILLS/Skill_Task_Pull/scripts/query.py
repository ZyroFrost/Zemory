"""query.py — run one read-only query through the region's query app, with this repo's own account.

    python scripts\\query.py <db_id> "<SELECT ...>" [limit]      rows as JSON (one line per row)
    python scripts\\query.py --map                               the db_ids the app serves (<server>.<database>)
    python scripts\\query.py --check                             sign in and run SELECT 1 (the account and the network work)

For probing, looking up and reconciling by the agent on the work PC (skill task-pull §Dò dữ liệu). The code a task runs on the
server reads the warehouse through vault_conn.py, never through this tool. Standard library only: no client of the app, no venv.

Where things come from — nothing company-specific lives in this file:
  · region values (scripts/region_values.py › <manager>/data/region/values.json):
      query_origin       the address of the sign-in service and the app (scheme + host)
      query_app_path     the app's path on it
      query_vault        <MACHINE>/<APP>, the first two segments of the account's key in the machine vault
      query_row_cap      rows the app returns per call at most
      query_warehouse_id the app's db_id of the warehouse (what --check asks)
  · the account: `ai.<department>` (the repo folder's last word, so the app's log names the department that asked), read from the
    machine vault by vault_conn.py: <MACHINE>_<APP>_AI-<DEPARTMENT>_ID / _PASS. Every request names the repo in X-Acting-Repo.

The app's rules hold: one SELECT / WITH statement, no ';', no write keyword; at most query_row_cap rows per call — page with
OFFSET ... FETCH NEXT and do not conclude while the last page is still full.
Shipped by zemory: store part Skill_Task_Pull (its installs). Change the store part, never the repo copy.
"""
import http.cookiejar
import json
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
try:
    from region_values import value as region_value  # noqa: E402
    import vault_conn  # noqa: E402
except ImportError:
    # region_values.py comes with a department structure (its region manager holds the values); a repo without one has no
    # region query app to ask, so say that instead of a traceback
    sys.stderr.write("query.py: this repo has no scripts/region_values.py or vault_conn.py - the region query app serves department"
                     " repos only; pull from the source directly (skill task-pull)\n")
    sys.exit(2)

ROOT = HERE.parent


def fail(msg, code=2):
    sys.stderr.write("query.py: " + msg + "\n")
    sys.exit(code)


def need(key):
    v = region_value(str(ROOT), key, "")
    if not v:
        fail("region value '%s' is not set (data/region/values.json of the region manager)" % key)
    return v


def client():
    ctx = ssl.create_default_context()       # the app's certificate comes from an internal CA: no verification, this host only
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    op = urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx),
                                     urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    op.addheaders = [("X-Acting-Repo", ROOT.name)]
    return op


def post(op, url, body, timeout=180):
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), method="POST", headers={"Content-Type": "application/json"})
    try:
        with op.open(req, timeout=timeout) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except ValueError:
            return e.code, {}
    except urllib.error.URLError as e:
        fail("cannot reach %s: %s (office LAN or VPN?)" % (url, e.reason))


def main(argv):
    origin = need("query_origin").rstrip("/")
    base = origin + "/" + need("query_app_path").strip("/")
    machine, app = need("query_vault").split("/", 1)
    account = "ai-" + ROOT.name.split("_")[-1].lower()
    user, password = vault_conn.secret(machine, app, account, "ID"), vault_conn.secret(machine, app, account, "PASS")
    op = client()
    st, body = post(op, origin + "/api/auth/login", {"username": user, "password": password}, 30)
    if st != 200:
        fail("sign-in as %s failed (HTTP %s): %s" % (user, st, body.get("detail", "")))
    if argv[:1] == ["--map"]:
        with op.open(base + "/api/map", timeout=60) as r:
            print(json.dumps(json.loads(r.read() or b"{}"), ensure_ascii=False))
        return 0

    def query(db_id, sql, limit):
        st, res = post(op, base + "/api/query", {"db_id": db_id, "sql": sql, "limit": int(limit)})
        if st != 200:
            fail("HTTP %s: %s" % (st, res.get("detail", "")), 1)
        return res.get("rows") or []

    cap = int(region_value(str(ROOT), "query_row_cap", 1000) or 1000)
    if argv[:1] == ["--check"]:
        db = need("query_warehouse_id")
        print("ok · user %s · %s · %s" % (user, db, query(db, "SELECT 1 AS ok, DB_NAME() AS db", cap)))
        return 0
    if len(argv) < 2:
        fail('usage: python scripts\\query.py <db_id> "<SELECT ...>" [limit]  ·  --map  ·  --check', 1)
    rows = query(argv[0], argv[1], min(int(argv[2]) if len(argv) > 2 else cap, cap))
    for row in rows:
        print(json.dumps(row, ensure_ascii=False, default=str))
    if len(rows) >= cap:
        sys.stderr.write("query.py: %d rows = the cap — page with OFFSET ... FETCH NEXT; the result may be cut\n" % len(rows))
    return 0


if __name__ == "__main__":
    for _s in (sys.stdout, sys.stderr):
        try:
            _s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    sys.exit(main(sys.argv[1:]))
