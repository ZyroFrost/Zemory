"""vault_conn.py — connections and secrets from the machine vault (Rule_Gate_21_WhatEntersGit step 3a, slot ConfigVault_151).

What several repos use has ONE home: `<data root>\\_ConfigVault\\` of the machine that runs. Every machine has the same tree and the
same key names; only the content differs (the work PC's register names the read-only agent account, the task machine's names the
account its tasks run with). No repo holds a connection string, a password or a variable of its own for one.

    conn("DB-MAIN", "ACME_WAREHOUSE")                         ODBC string, the account this machine uses for that database
    conn("DB-MAIN", "ACME_WAREHOUSE", "jane.doe")             the same with an account named by the caller
    secret("M365", "ACME-COM", "DATA-SYNC", "SECRET")         one value of services.env / smtp.env / logins.env
    private("FA_REPORT_PW")                                    a secret of this repo alone, from the repo's .env (its ONE private home)
    cert("BackupCert.pvk")                                     path of a secret FILE of this repo: _ConfigVault\\certs\\<repo>\\<name>
    load_env()                                                the repo's .env settings into the environment
    mailbox("support")                                        a sending mailbox of the mail book, with its password
    group("dw_lane_alert")                                    {"to": [...], "cc": [...]} of a recipient group
    stores()                                                  {store id: {"address", "name", "cc", "active", ...}}

    python scripts/vault_conn.py                              what this machine can build (names only, never a value)

Vault layout:
    sql\\configs\\connections.json    {"<MACHINE>/<DATABASE>": {"address", "driver"?, "options"?, "account"}}  — not secret;
                                    a key starting with "_" is a machine setting ("_runlog_db": "<MACHINE>/<DATABASE>")
    sql\\credentials\\logins.env      <MACHINE>_<DATABASE>_<ACCOUNT>_ID / _PASS
    api\\credentials\\services.env    <SERVICE>_<RESOURCE>_<ACCOUNT>_<KIND>
    mail\\credentials\\smtp.env       <MAIL HOST>_<RESOURCE>_<ACCOUNT>_ID / _PASS
    mail\\configs\\mailboxes.json     {"mailboxes": {<key>: {"address", "holder", "department", "job_title", "host", "port", "password_key"}}}
    mail\\configs\\recipients.json    {"people": {<address>: {...}}, "stores": {<store id>: {...}}, "groups": {<name>: {"to", "cc"}}}
Key grammar: segments joined by "_", the words inside one segment by "-" (a "." or "_" inside a name becomes "-"), upper case.
Where the vault is (slot ConfigVault_151, two levels): env CONFIGVAULT_DIR, else the nearest `_ConfigVault` walking UP from this repo
that holds secrets (`sql\\` / `api\\` / `mail\\`) - the ORGANISATION vault `Workspace\\Company\\<Org>\\_ConfigVault` on a work PC shared by
several organisations, `<drive>:\\_ConfigVault` on a machine owned by one organisation - else `~/data/_ConfigVault` · `~/_ConfigVault`
(Linux). The machine vault at the drive root keeps only the machine's own tools (no secrets folder) and is skipped.
A missing entry stops with the name of the missing key — never a fallback to .env, never another account, never the value.
Shipped by zemory: store part Skill_Task_VmAutomation (its installs). Change the store part, never the repo copy.
"""
import json
import os
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
REGISTER = Path("sql") / "configs" / "connections.json"
SECRET_FILES = (Path("sql") / "credentials" / "logins.env",
                Path("api") / "credentials" / "services.env",
                Path("mail") / "credentials" / "smtp.env")
DEFAULT_DRIVER = "ODBC Driver 17 for SQL Server"
DEFAULT_OPTIONS = "TrustServerCertificate=yes"


class VaultMissing(SystemExit):
    """An entry the caller needs is not in this machine's vault (the message names the key, never a value)."""


SECRET_DIRS = ("sql", "api", "mail")


def _holds_secrets(p):
    return p.is_dir() and any((p / s).is_dir() for s in SECRET_DIRS)


def vault_dir():
    """The vault this repo reads (organisation level), or None. See the module text: CONFIGVAULT_DIR, else the nearest
    `_ConfigVault` holding secrets walking up from the repo, else the Linux data root."""
    if os.environ.get("CONFIGVAULT_DIR"):
        p = Path(os.environ["CONFIGVAULT_DIR"])
        return p if p.is_dir() else None
    for parent in (REPO, *REPO.parents):
        c = parent / "_ConfigVault"
        if _holds_secrets(c):
            return c
    return next((c for c in (Path.home() / "data" / "_ConfigVault", Path.home() / "_ConfigVault") if _holds_secrets(c)), None)


def segment(name):
    """One key segment: upper case, every '.', '_' or space inside the name becomes '-'."""
    return re.sub(r"[._\s]+", "-", str(name).strip()).upper()


def key(machine, database, account, kind):
    return "_".join([segment(machine), segment(database), segment(account), str(kind).upper()])


def _read_env(path):
    out = {}
    if path.is_file():
        for ln in path.read_text(encoding="utf-8").splitlines():
            ln = ln.strip()
            if ln and not ln.startswith("#") and "=" in ln:
                k, v = ln.split("=", 1)
                out[k.strip()] = v.strip()
    return out


def secrets():
    """Every key of the machine's secret files (logins · services · smtp)."""
    d = vault_dir()
    out = {}
    if d:
        for rel in SECRET_FILES:
            out.update(_read_env(d / rel))
    return out


def register():
    """The machine's shared connection register: {"<MACHINE>/<DATABASE>": {...}}."""
    d = vault_dir()
    f = d / REGISTER if d else None
    if not f or not f.is_file():
        return {}
    return {k: v for k, v in json.loads(f.read_text(encoding="utf-8-sig")).items() if not k.startswith("_")}


def setting(name):
    """A machine setting of the register (a key starting with '_', e.g. '_runlog_db'), or ''."""
    d = vault_dir()
    f = d / REGISTER if d else None
    if not f or not f.is_file():
        return ""
    v = json.loads(f.read_text(encoding="utf-8-sig")).get(name, "")
    return v if isinstance(v, str) else ""


def _entry(machine, database, reg=None):
    reg = register() if reg is None else reg
    want = "%s/%s" % (machine, database)
    for k, v in reg.items():
        if k.lower() == want.lower():
            return v
    return None


def secret(machine, database, account, kind):
    """One value from the machine's secret files by the key grammar."""
    k = key(machine, database, account, kind)
    v = secrets().get(k)
    if not v:
        raise VaultMissing("vault: missing %s (%s)" % (k, vault_dir() or "this machine has no _ConfigVault"))
    return v


def conn(machine, database, account=None):
    """The ODBC string for <machine>/<database>, with the account this machine's register names (or the one given)."""
    spec = _entry(machine, database)
    if not spec:
        raise VaultMissing("vault: %s/%s is not in %s" % (machine, database, (vault_dir() or Path("?")) / REGISTER))
    acct = account or spec.get("account")
    if not acct:
        raise VaultMissing("vault: %s/%s names no account for this machine and the caller gave none" % (machine, database))
    uid = secret(machine, database, acct, "ID")
    pwd = secret(machine, database, acct, "PASS")
    return "Driver={%s};Server=%s;Database=%s;UID=%s;PWD={%s};%s" % (
        spec.get("driver", DEFAULT_DRIVER), spec["address"], database, uid, pwd.replace("}", "}}"),
        spec.get("options", DEFAULT_OPTIONS))


MAIL_BOOK = Path("mail") / "configs"


def _book(name):
    d = vault_dir()
    f = d / MAIL_BOOK / name if d else None
    if not f or not f.is_file():
        raise VaultMissing("vault: missing %s (%s)" % (MAIL_BOOK / name, d or "this machine has no _ConfigVault"))
    return json.loads(f.read_text(encoding="utf-8-sig"))


def mailbox(key):
    """A sending mailbox of the mail book by its key, with "password" read from smtp.env (never printed)."""
    box = _book("mailboxes.json").get("mailboxes", {}).get(key)
    if not box:
        raise VaultMissing("vault: mailbox '%s' is not in %s" % (key, MAIL_BOOK / "mailboxes.json"))
    pwd = secrets().get(box.get("password_key", ""))
    if not pwd:
        raise VaultMissing("vault: missing %s for mailbox '%s'" % (box.get("password_key"), key))
    return dict(box, password=pwd)


def group(name):
    """{"to": [...], "cc": [...]} of a recipient group of the mail book."""
    g = _book("recipients.json").get("groups", {}).get(name)
    if not g:
        raise VaultMissing("vault: group '%s' is not in %s" % (name, MAIL_BOOK / "recipients.json"))
    return {"to": list(g.get("to") or []), "cc": list(g.get("cc") or [])}


def stores():
    """Every store of the mail book: {store id: {"address", "name", "cc", "active", ...}}."""
    return _book("recipients.json").get("stores", {})


def private(name, root=None):
    """A secret of this repo alone from the repo's .env (Root_093_Env: the ONE private home of a repo; plan/32, user 01/11).
    The environment wins when it sets the name. Missing ⇒ stops with the name, never the value."""
    v = os.environ.get(name) or _read_env(Path(root or REPO) / ".env").get(name, "").strip('"').strip("'")
    if not v:
        raise VaultMissing("private: missing %s in %s" % (name, Path(root or REPO) / ".env"))
    return v


def cert(name, repo=None):
    """Path of a secret FILE of one repo in the machine vault: <vault>\\certs\\<repo>\\<name> (repo = this repo's folder name)."""
    d = vault_dir()
    f = d / "certs" / (repo or REPO.name) / name if d else None
    if not f or not f.is_file():
        raise VaultMissing("vault: missing certs\\%s\\%s (%s)" % (repo or REPO.name, name, d or "this machine has no _ConfigVault"))
    return f


def load_env(env=None, root=None):
    """The repo's .env into env (default os.environ) without overriding what is set."""
    env = os.environ if env is None else env
    for k, v in _read_env(Path(root or REPO) / ".env").items():
        env.setdefault(k, v.strip('"').strip("'"))
    return env


if __name__ == "__main__":       # what this machine can build — names only, never a value
    d, reg, sec = vault_dir(), register(), secrets()
    print("vault:", d or "none")
    for name, spec in reg.items():
        machine, database = name.split("/", 1)
        acct = spec.get("account", "")
        ok = acct and key(machine, database, acct, "ID") in sec and key(machine, database, acct, "PASS") in sec \
            and sec.get(key(machine, database, acct, "PASS"))
        print("  %-42s %-22s %s" % (name, acct or "-", "OK" if ok else "MISSING " + key(machine, database, acct or "?", "PASS")))
