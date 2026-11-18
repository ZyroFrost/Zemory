// Phone remote (plan/41): the phone is a MAIL-ONLY peer of each machine. This file holds what both paths share
// (the paired-phone book, the pairing code, letter sealing) and path 2, the shared Google Drive folder.
//
// The phone never holds `share.key` (it decrypts the whole GM). Each (phone, machine) pair has its own random
// token, born at pairing on the machine and carried to the phone inside the pairing code; letters on Drive are
// sealed with a key derived from that token, so a machine opens only its own files and revoking a phone on one
// machine closes that machine alone.
//
// Drive layout under the shared GM folder (plan/41 §5):
//   phone/<name>/out/<machine-fp>/<id>.enc   phone -> machine   (machine imports, then DELETES = received)
//   phone/<name>/in/<machine-fp>/<id>.enc    machine -> phone   (phone reads, then deletes)
//   phone/<name>/roster/<machine-fp>.enc     machine overwrites each tick: host · at
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { currentMemoryDir } from "./db.js";
import { asEnvelope, sameHost, type MailEnvelope, type MailHooks } from "./mail.js";

export interface PhoneEntry {
  name: string;
  /** base64url, 32 random bytes. Secret: it opens this machine's mail with the phone. */
  token: string;
  createdAt: string;
}

/** How often the daemon looks at `phone/` on Drive. Drive itself adds its own delay on top. */
export const PHONE_DRIVE_TICK_MS = 20_000;

const NAME_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;
// A file name on Drive becomes a path here: only plain ids, never a separator or a dot-dot.
const ID_RE = /^[A-Za-z0-9-]{1,64}$/;

/** The mail host a phone writes from and is written to. Never a real machine's name, so mail.ts's "not to this
 *  machine" check never trips on a reply. */
export const phoneHost = (name: string): string => `phone-${name}`;

export function phonesPath(machineDir = currentMemoryDir()): string {
  return join(machineDir, "secrets", "phones.json");
}

export function listPhones(path = phonesPath()): PhoneEntry[] {
  if (!existsSync(path)) return [];
  try {
    const v = JSON.parse(readFileSync(path, "utf8")) as unknown;
    return Array.isArray(v) ? (v as PhoneEntry[]).filter((p) => p && NAME_RE.test(p.name) && typeof p.token === "string") : [];
  } catch {
    return [];
  }
}

function savePhones(list: PhoneEntry[], path: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(list, null, 2), { mode: 0o600 });
  renameSync(tmp, path);
}

/** Pair (or re-pair) a phone: a new token every time, so re-pairing also cuts off a lost phone of the same name. */
export function pairPhone(name: string, path = phonesPath()): PhoneEntry {
  const n = name.trim().toLowerCase();
  if (!NAME_RE.test(n)) throw new Error(`phone name "${name}" - use a-z, 0-9 and '-', at most 32 characters`);
  const entry: PhoneEntry = { name: n, token: randomBytes(32).toString("base64url"), createdAt: new Date().toISOString() };
  savePhones([...listPhones(path).filter((p) => p.name !== n), entry], path);
  return entry;
}

/** Forget a phone. With `driveDir`, also removes this machine's folders for it on Drive (both directions). */
export function revokePhone(name: string, o: { path?: string; driveDir?: string; deviceId?: string } = {}): boolean {
  const path = o.path ?? phonesPath();
  const n = name.trim().toLowerCase();
  const before = listPhones(path);
  const after = before.filter((p) => p.name !== n);
  if (after.length === before.length) return false;
  savePhones(after, path);
  if (o.driveDir && o.deviceId) {
    const base = join(o.driveDir, "phone", n);
    for (const d of [join(base, "out", o.deviceId), join(base, "in", o.deviceId), join(base, "roster", `${o.deviceId}.enc`)])
      rmSync(d, { recursive: true, force: true });
  }
  return true;
}

export interface PairingCode {
  v: 1;
  /** The phone's own name, as paired. */
  name: string;
  /** The machine's mail host name. */
  host: string;
  /** The machine's channel fingerprint (relay path pins it; Drive path names folders by it). */
  fp: string;
  token: string;
}

/** One string the phone pastes or scans: `zph1.<base64url JSON>`. It carries the token - show it once, never log it. */
export function pairingCode(c: Omit<PairingCode, "v">): string {
  return `zph1.${Buffer.from(JSON.stringify({ v: 1, ...c })).toString("base64url")}`;
}

export function parsePairingCode(s: string): PairingCode | null {
  const m = /^zph1\.([A-Za-z0-9_-]+)$/.exec(s.trim());
  if (!m) return null;
  try {
    const c = JSON.parse(Buffer.from(m[1], "base64url").toString("utf8")) as PairingCode;
    return c.v === 1 && NAME_RE.test(c.name) && c.host && c.fp && c.token ? c : null;
  } catch {
    return null;
  }
}

const driveKey = (token: string, fp: string): Buffer =>
  Buffer.from(hkdfSync("sha256", Buffer.from(token, "base64url"), "zemory-phone-drive-v1", fp, 32));

/** Seal a payload for one direction. The id and direction sit in the AAD: a file moved to another name or folder
 *  does not open. */
export function sealLetter(payload: unknown, o: { token: string; fp: string; dir: "in" | "out" | "roster"; id: string }): Buffer {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", driveKey(o.token, o.fp), iv);
  c.setAAD(Buffer.from(`${o.dir}|${o.id}`));
  const ct = Buffer.concat([c.update(JSON.stringify(payload), "utf8"), c.final()]);
  return Buffer.from(JSON.stringify({ v: 1, iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), ct: ct.toString("base64") }));
}

/** Open a sealed file; `null` for anything that does not decrypt (wrong key, moved, cut short, tampered). */
export function openLetter(buf: Buffer, o: { token: string; fp: string; dir: "in" | "out" | "roster"; id: string }): unknown {
  try {
    const f = JSON.parse(buf.toString("utf8")) as { v: number; iv: string; tag: string; ct: string };
    if (f.v !== 1) return null;
    const d = createDecipheriv("aes-256-gcm", driveKey(o.token, o.fp), Buffer.from(f.iv, "base64"));
    d.setAAD(Buffer.from(`${o.dir}|${o.id}`));
    d.setAuthTag(Buffer.from(f.tag, "base64"));
    return JSON.parse(Buffer.concat([d.update(Buffer.from(f.ct, "base64")), d.final()]).toString("utf8"));
  } catch {
    return null;
  }
}

/** Write via a temp name then rename: a reader on the other side never sees half a file. */
function writeAtomic(file: string, data: Buffer): void {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, data);
  renameSync(tmp, file);
}

export interface PhoneTickResult {
  received: number;
  sent: number;
  /** Files dropped: did not decrypt, or claimed a sender/target they may not. */
  rejected: number;
}

/**
 * One pass of the Drive path for every paired phone: import the phone's letters to this machine, write this
 * machine's letters to the phone, refresh the roster. Fail-open per phone: one bad folder never stops the others.
 */
export function phoneDriveTick(o: {
  driveDir: string;
  /** This machine's channel fingerprint. */
  fp: string;
  /** This machine's mail host name. */
  host: string;
  hooks: MailHooks;
  phonesFile?: string;
  log?: (s: string) => void;
}): PhoneTickResult {
  const r: PhoneTickResult = { received: 0, sent: 0, rejected: 0 };
  if (!o.driveDir || !existsSync(o.driveDir)) return r;
  for (const p of listPhones(o.phonesFile)) {
    const base = join(o.driveDir, "phone", p.name);
    const from = phoneHost(p.name);
    try {
      // phone -> this machine
      const outDir = join(base, "out", o.fp);
      for (const f of existsSync(outDir) ? readdirSync(outDir) : []) {
        if (!f.endsWith(".enc")) continue; // `.tmp` = still being written
        const id = f.slice(0, -4);
        const file = join(outDir, f);
        if (!ID_RE.test(id)) {
          rmSync(file, { force: true });
          r.rejected++;
          continue;
        }
        let raw: Buffer;
        try {
          raw = readFileSync(file);
        } catch {
          continue; // Drive still fetching it - next tick
        }
        const env = asEnvelope(openLetter(raw, { token: p.token, fp: o.fp, dir: "out", id }));
        // The token proves WHICH phone wrote it, so the letter may only speak as that phone and only to this
        // machine; anything else is dropped, not imported.
        if (!env || env.id !== id || !sameHost(env.from.host, from) || !sameHost(env.to.host, o.host)) {
          o.log?.(`[phone] ${p.name}: dropped ${f} (does not open, or wrong sender/target)`);
          rmSync(file, { force: true });
          r.rejected++;
          continue;
        }
        o.hooks.receive(env, from);
        rmSync(file, { force: true });
        r.received++;
      }
      // this machine -> phone
      const inDir = join(base, "in", o.fp);
      for (const env of o.hooks.outgoing(from) as MailEnvelope[]) {
        if (!ID_RE.test(env.id)) continue;
        const file = join(inDir, `${env.id}.enc`);
        if (!existsSync(file)) writeAtomic(file, sealLetter(env, { token: p.token, fp: o.fp, dir: "in", id: env.id }));
        // On Drive = delivered as far as this machine goes: the phone deletes it once read.
        o.hooks.acked(env.id);
        r.sent++;
      }
      writeAtomic(
        join(base, "roster", `${o.fp}.enc`),
        sealLetter({ host: o.host, at: new Date().toISOString() }, { token: p.token, fp: o.fp, dir: "roster", id: o.fp }),
      );
    } catch (e) {
      o.log?.(`[phone] ${p.name}: Drive pass failed - ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return r;
}
