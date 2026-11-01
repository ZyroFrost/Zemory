"""Headless mail transport over Microsoft Graph - for pipelines that send a report by mail on a schedule.

Why this exists: the Outlook COM path needs Outlook desktop installed AND an interactive logged-on session, which forces the
task scheduler into "run only when user is logged on". A mail sent by hand is a mail that eventually goes out with the wrong
file or the wrong Cc; Graph removes the person from the loop.

Requires the app registration to hold the APPLICATION permission `Mail.Send` WITH admin consent. Without it Graph answers 403
and this module says exactly which step is missing rather than failing with a bare HTTP code.

Secrets come from the machine vault only (vault_conn.py; the app named by region value `m365_app` = <SERVICE>/<RESOURCE>/<APP>);
held in memory per run, never logged. A repo keeps no copy of them (plan/32: no repo vault, no data/secrets/).

Installed by the HS skill task-upload: edit it on HS, not in a repo copy (the next `zemory sync` puts the HS version back).
"""
from __future__ import annotations

import base64
import json
import os
import re
from pathlib import Path


def _requests():
    """Import `requests` LATE, only when a network call is made.

    A send step imports this module at its top: importing `requests` here at load time would kill the whole step before its
    blocking checks (an unfinished file, a missing note) could run when the library is absent. A blocking check must not
    depend on the mail library.
    """
    try:
        import requests
        return requests
    except ImportError:
        raise MailError(
            "the `requests` library is missing - Graph cannot be called.\n"
            "  Install: pip install requests   (or switch to `transport: smtp`, standard library only)")


REPO = Path(__file__).resolve().parents[1]
GRAPH = "https://graph.microsoft.com/v1.0"

SEND_ROLE = "Mail.Send"

# Graph rejects an inline attachment over ~3 MB; anything bigger needs an upload session.
MAX_INLINE_BYTES = 3 * 1024 * 1024


class MailError(RuntimeError):
    """Anything that must stop the send. The message is meant to be read by a person."""


def _machine_vault_app() -> tuple[str, str, str] | None:
    """(tenant, client, secret) of the region's Entra app from the machine vault, or None."""
    try:
        import sys
        here = str(Path(__file__).resolve().parent)
        sys.path.insert(0, here)
        import vault_conn
        from region_values import value as region_value
        app = region_value(here, "m365_app", "").split("/")
        if len(app) != 3:
            return None
        s = vault_conn.secrets()
        got = tuple(s.get(vault_conn.key(*app, kind)) for kind in ("TENANT", "ID", "SECRET"))
        return got if all(got) else None
    except ImportError:
        return None


def get_token() -> str:
    app = _machine_vault_app()
    if not app:
        raise MailError("the Entra app is not in this machine's vault: region value `m365_app` names <SERVICE>/<RESOURCE>/<APP>, "
                        "and api\\credentials\\services.env must hold its _TENANT / _ID / _SECRET")
    tenant, client, secret = app
    r = _requests().post(
        f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
        data={"client_id": client, "client_secret": secret,
              "scope": "https://graph.microsoft.com/.default",
              "grant_type": "client_credentials"},
        timeout=60)
    if r.status_code != 200:
        raise MailError(f"Graph token failed ({r.status_code}): {r.text[:300]}")
    return r.json()["access_token"]


def token_roles(token: str) -> list[str]:
    """Application permissions actually present on the token - the only honest source.
       What the admin portal lists means nothing until admin consent is granted."""
    payload = token.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    return sorted(json.loads(base64.urlsafe_b64decode(payload)).get("roles", []))


def missing_permission_help(roles: list[str]) -> str:
    return (
        f"the app registration is missing the application permission `{SEND_ROLE}`.\n"
        f"  Token currently carries: {', '.join(roles) or '(none)'}\n"
        "  Fix (tenant admin, one time):\n"
        "    Entra ID -> App registrations -> <the app this repo uses> -> API permissions\n"
        "    -> Add a permission -> Microsoft Graph -> APPLICATION permissions -> Mail.Send\n"
        "    -> Add, then -> Grant admin consent for <tenant>\n"
        "  Ask the admin to scope it with an application access policy so the app can only send\n"
        "  as the reporting mailbox, not as anyone in the tenant."
    )


def _recipients(raw: str) -> list[dict]:
    """Config allows addresses separated by `;` or `,`. Anything without an @ is dropped
       rather than handed to Graph, which would reject the whole request."""
    out = []
    for part in re.split(r"[;,]", raw or ""):
        addr = part.strip()
        if addr and "@" in addr:
            out.append({"emailAddress": {"address": addr}})
    return out


def _attachment(path: str) -> dict:
    size = os.path.getsize(path)
    if size > MAX_INLINE_BYTES:
        raise MailError(
            f"{os.path.basename(path)} is {size/1024/1024:.1f} MB - over the {MAX_INLINE_BYTES/1024/1024:.0f} MB "
            "inline limit. Graph needs an upload session for this; not implemented.")
    with open(path, "rb") as fh:
        blob = base64.b64encode(fh.read()).decode()
    return {"@odata.type": "#microsoft.graph.fileAttachment",
            "name": os.path.basename(path), "contentBytes": blob}


def build_message(to: str, cc: str, subject: str, html: str, attachment: str | None) -> dict:
    if not _recipients(to):
        raise MailError(f"no valid To address in config: {to!r}")
    msg = {
        "subject": subject,
        "body": {"contentType": "HTML", "content": html},
        "toRecipients": _recipients(to),
        "ccRecipients": _recipients(cc),
    }
    if attachment:
        msg["attachments"] = [_attachment(attachment)]
    return msg


def send(token: str, mailbox: str, message: dict, *, draft: bool) -> str:
    """draft=True parks the mail in the mailbox's Drafts for a person to review and send.
       draft=False sends it and keeps a copy in Sent Items.
       Returns a short readable confirmation."""
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    if draft:
        url = f"{GRAPH}/users/{mailbox}/messages"
        r = _requests().post(url, headers=headers, json=message, timeout=180)
        ok = r.status_code in (200, 201)
    else:
        url = f"{GRAPH}/users/{mailbox}/sendMail"
        r = _requests().post(url, headers=headers,
                             json={"message": message, "saveToSentItems": True}, timeout=180)
        ok = r.status_code in (200, 202)

    if not ok:
        if r.status_code == 403:
            raise MailError(f"Graph refused (403).\n{missing_permission_help(token_roles(token))}\n"
                            f"  Raw: {r.text[:300]}")
        if r.status_code == 404:
            raise MailError(
                f"mailbox '{mailbox}' not found. `from_mailbox` in the config must be a real "
                f"mailbox in this tenant.\n  Raw: {r.text[:300]}")
        raise MailError(f"Graph {'draft' if draft else 'send'} failed "
                        f"({r.status_code}): {r.text[:400]}")

    if draft:
        return f"draft created in {mailbox} -> open Outlook/OWA, review, press Send"
    return f"sent from {mailbox} (copy kept in Sent Items)"


def preflight(token: str) -> None:
    """Fail before doing anything visible if the permission is not really there."""
    roles = token_roles(token)
    if SEND_ROLE not in roles:
        raise MailError(missing_permission_help(roles))
