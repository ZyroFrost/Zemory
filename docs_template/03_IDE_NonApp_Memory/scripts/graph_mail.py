"""Headless mail transport over Microsoft Graph - for pipelines that send a report by mail on a schedule.

Why this exists: the Outlook COM path needs Outlook desktop installed AND an interactive logged-on session, which forces the
task scheduler into "run only when user is logged on". A mail sent by hand is a mail that eventually goes out with the wrong
file or the wrong Cc; Graph removes the person from the loop.

Requires the app registration to hold the APPLICATION permission `Mail.Send` WITH admin consent. Without it Graph answers 403
and this module says exactly which step is missing rather than failing with a bare HTTP code.

Secrets come from the DPAPI vault (scripts/vault.ps1), decrypted in memory per run and never logged.

Installed by the HS skill task-upload: edit it on HS, not in a repo copy (the next `zemory sync` puts the HS version back).
"""
from __future__ import annotations

import base64
import json
import os
import re
import subprocess
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
VAULT_PS1 = REPO / "scripts" / "vault.ps1"
GRAPH = "https://graph.microsoft.com/v1.0"

# Vault keys of the app registration: the generic name first, then the name repos stored before this script moved to HS.
KEY_TENANT = ("GRAPH_TENANT_ID", "TENANT_ID_SS_SP")
KEY_CLIENT = ("GRAPH_CLIENT_ID", "CLIENT_ID_SS_SP")
KEY_SECRET = ("GRAPH_CLIENT_SECRET", "CLIENT_SECRET_SS_SP")

SEND_ROLE = "Mail.Send"

# Graph rejects an inline attachment over ~3 MB; anything bigger needs an upload session.
MAX_INLINE_BYTES = 3 * 1024 * 1024


class MailError(RuntimeError):
    """Anything that must stop the send. The message is meant to be read by a person."""


def _read_secret(name: str) -> str | None:
    if not VAULT_PS1.exists():
        raise MailError(f"vault script missing: {VAULT_PS1}")
    script = (
        f". '{VAULT_PS1}'; "
        f"$s = Get-VaultSecret -Name '{name}'; "
        "[Runtime.InteropServices.Marshal]::PtrToStringAuto("
        "[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))"
    )
    proc = subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
        capture_output=True, text=True)
    if proc.returncode != 0 or not proc.stdout.strip():
        return None
    return proc.stdout.strip()


def _read_any(names: tuple[str, ...]) -> str:
    for name in names:
        value = _read_secret(name)
        if value:
            return value
    # stderr may echo the key NAME, never its value
    raise MailError(f"cannot read '{names[0]}' from the vault. Store it with: vault set {names[0]}")


def get_token() -> str:
    tenant, client, secret = (_read_any(k) for k in (KEY_TENANT, KEY_CLIENT, KEY_SECRET))
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
