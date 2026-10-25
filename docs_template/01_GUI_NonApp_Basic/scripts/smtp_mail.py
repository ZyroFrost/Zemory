"""SMTP transport - the path that needs no tenant consent, only a mailbox credential.

Why this exists next to graph_mail.py: Graph app-only sending needs a tenant admin to grant `Mail.Send`. SMTP needs nobody's
approval beyond a mailbox that is allowed to submit (SMTP AUTH enabled on it).

Trade-off, stated plainly: this stores a MAILBOX PASSWORD in the vault, whereas Graph stores an app secret that can be scoped
to one mailbox by policy. A mailbox password is that user's whole identity. Prefer Graph when consent is obtainable; use this
when it is not.

The password never touches the repo - it comes from the DPAPI vault (scripts/vault.ps1) and lives only in memory for the
duration of the call.

`--draft` has no SMTP equivalent: there is no mailbox folder to park a message in. Instead this writes a .eml file that opens in
Outlook/OWA as a ready-to-send mail, so a person can still review before anything leaves.

Installed by the HS skill task-upload: edit it on HS, not in a repo copy (the next `zemory sync` puts the HS version back).
"""
from __future__ import annotations

import os
import re
import smtplib
import subprocess
from email.message import EmailMessage
from email.utils import formataddr
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
VAULT_PS1 = REPO / "scripts" / "vault.ps1"

DEFAULT_HOST = os.environ.get("SMTP_HOST", "smtp.office365.com")
DEFAULT_PORT = int(os.environ.get("SMTP_PORT", "587"))
KEY_PASSWORD = "SMTP_PASSWORD"          # vault set SMTP_PASSWORD


class MailError(RuntimeError):
    """Anything that must stop the send. Written to be read by a person."""


def _read_secret(name: str) -> str:
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
        raise MailError(
            f"cannot read '{name}' from the vault.\n"
            f"  Store it once (the agent never sees the value):  vault set {name}\n"
            f"  It is the password of the mailbox in `from_mailbox`.")
    return proc.stdout.strip()


def _addresses(raw: str) -> list[str]:
    return [a.strip() for a in re.split(r"[;,]", raw or "") if a.strip() and "@" in a.strip()]


XLSX = "vnd.openxmlformats-officedocument.spreadsheetml.sheet"
XLSB = "vnd.ms-excel.sheet.binary.macroEnabled.12"     # .xlsb is a different format from .xlsx


def build_message(sender_name: str, mailbox: str, to: str, cc: str,
                  subject: str, html: str, attachment: str | None,
                  subtype: str = XLSX) -> EmailMessage:
    tos, ccs = _addresses(to), _addresses(cc)
    if not tos:
        raise MailError(f"no valid To address in config: {to!r}")

    msg = EmailMessage()
    msg["From"] = formataddr((sender_name, mailbox)) if sender_name else mailbox
    msg["To"] = ", ".join(tos)
    if ccs:
        msg["Cc"] = ", ".join(ccs)
    msg["Subject"] = subject
    # Plain-text part first, HTML second: mail clients show the LAST part they can render,
    # so this gives HTML readers the table and text-only readers something legible.
    msg.set_content(re.sub(r"<[^>]+>", "", html.replace("</p>", "\n").replace("<br>", "\n")))
    msg.add_alternative(html, subtype="html")

    if attachment:
        with open(attachment, "rb") as fh:
            msg.add_attachment(
                fh.read(), maintype="application", subtype=subtype,
                filename=os.path.basename(attachment))
    return msg


def save_eml(msg: EmailMessage, out_dir: Path, stem: str) -> Path:
    """The --draft stand-in: a file that opens in Outlook as a finished mail."""
    out_dir.mkdir(parents=True, exist_ok=True)
    p = out_dir / f"{stem}.eml"
    p.write_bytes(bytes(msg))
    return p


def send(msg: EmailMessage, mailbox: str, host: str = DEFAULT_HOST,
         port: int = DEFAULT_PORT) -> str:
    password = _read_secret(KEY_PASSWORD)
    recipients = _addresses(msg["To"]) + _addresses(msg.get("Cc", ""))
    try:
        with smtplib.SMTP(host, port, timeout=120) as s:
            s.starttls()
            s.login(mailbox, password)
            s.send_message(msg, from_addr=mailbox, to_addrs=recipients)
    except smtplib.SMTPAuthenticationError as exc:
        raise MailError(
            f"{host} refused the login for {mailbox}.\n"
            f"  Three usual causes, in order of likelihood:\n"
            f"    1. SMTP AUTH is disabled for this mailbox - the mail admin must enable\n"
            f"       client SMTP submission on it (it is off by default).\n"
            f"    2. The mailbox has MFA, so the real password cannot be used here.\n"
            f"    3. The password in the vault is stale - re-run: vault set {KEY_PASSWORD}\n"
            f"  Raw: {exc}")
    except (smtplib.SMTPException, OSError) as exc:
        raise MailError(f"SMTP send failed via {host}:{port} - {exc}")
    return f"sent via {host} as {mailbox} ({len(recipients)} recipients)"
