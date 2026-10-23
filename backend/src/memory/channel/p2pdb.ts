// The data side of the p2p channel (plan/24 §13, HP 18): no block is ever kept. A block is made from the db for one
// receiving machine, travels, is merged into the receiver's db through the write queue, and is thrown away. What each side
// remembers lives in its db: the sender, per receiving machine, the highest of its own messages that machine confirmed
// (`sync_state` `p2p-to:<peer>`) and the vectors it confirmed (`peer_vec_sent`). A link that drops before the `ack` loses
// nothing: the sender sends again from the same mark, and merge dedups.
//
// Pure functions of the db and a working folder under the MACHINE's data folder (`data/p2p/`, never the GM folder) - the
// daemon calls them in a worker thread, the merge runs in the fast lane's child.

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getScopeExclude } from "../../config/settings.js";
import { acquireWriteTurn } from "../../jobs/writeturn.js";
import { currentMemoryDb, currentMemoryDir } from "../db.js";
import { exportMemoryBundle, mergeMemoryBundle, readExportWatermark, wmKeyFor, writeExportWatermark } from "../share.js";
import { Q } from "../store/queries.js";
import { markVectorsSentTo, unsentVectorIdsFor } from "../vectors.js";
import Database from "better-sqlite3";
import { normalizeDeviceId } from "./identity.js";
import { MAX_FRAME_BYTES } from "./wire.js";

/** The channel's working folder: blocks on their way out (`out/`) and in (`in/`). Machine data, never the GM folder. */
export function p2pDir(machineDir = currentMemoryDir()): string {
  return join(machineDir, "p2p");
}

/** The mark's key: one spelling of the device id whatever form it came in (certificate, pairing list, typed). */
export const peerMarkKey = (peer: string): string => `p2p-to:${normalizeDeviceId(peer)}`;
const peerKey = peerMarkKey;
/** The legacy mark of the stored-block channel - where a peer's first protocol-2 round starts. */
export const legacyMarkKey = (host: string): string => wmKeyFor("p2p", wmHost(host));
const fileSafe = (s: string): string => s.replace(/[^A-Za-z0-9-]/g, "_");
/** The watermark key's host is sanitised (`wmKeyFor`), `sessions.host` holds the raw name - as the export does. */
const wmHost = (host: string): string => (host || "unknown").replace(/[^A-Za-z0-9._-]/g, "_");

export interface OutBlock {
  id: string;
  file: string;
  /** The highest own message id this block carries the peer up to. */
  upto: number;
  vecIds: number[];
  messages: number;
  bytes: number;
}

/**
 * The highest own message id `peer` has confirmed. First contact with a peer the channel before HP 18 already served: the
 * mark of that channel (`p2p:<host>`) - both machines converged on its whole block set, so nothing below it is owed.
 */
export function peerMark(peer: string, host: string, dbPath: string = currentMemoryDb()): number {
  const own = readExportWatermark(peerKey(peer), dbPath);
  return own > 0 ? own : readExportWatermark(legacyMarkKey(host), dbPath);
}

function newestOwnAbove(dbPath: string, host: string, from: number): number {
  let db: Database.Database | null = null;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
    db.pragma("busy_timeout = 2000");
    const top = (db.prepare(Q.maxMessageId).get() as { m: number }).m;
    if (top <= from) return 0;
    const r = db.prepare(Q.ownMaxMessageBetween).get(from, top, host) as { m: number | null } | undefined;
    return r?.m ?? 0;
  } catch {
    return 0;
  } finally {
    db?.close();
  }
}

/** Does this machine owe `peer` anything: an own message above its mark, or an own vector it has not confirmed. Cheap. */
export function owesPeer(peer: string, host: string, dbPath: string = currentMemoryDb()): boolean {
  const mark = peerMark(peer, host, dbPath);
  return newestOwnAbove(dbPath, host, mark) > 0 || unsentVectorIdsFor(normalizeDeviceId(peer), host, mark, dbPath, 1).length > 0;
}

/**
 * The blocks `peer` is owed now, written under `data/p2p/out/<peer>/`: own messages above its mark, cut so each block fits a
 * frame, the first one also carrying the own vectors the peer has not confirmed. At most `maxBlocks` per round - the next
 * round goes on from where the acks leave the mark.
 */
export async function buildOutgoing(
  peer: string,
  host: string,
  o: { dbPath?: string; keyFile?: string; machineDir?: string; maxBlocks?: number; startStep?: number } = {},
): Promise<OutBlock[]> {
  const dbPath = o.dbPath ?? currentMemoryDb();
  const dir = join(p2pDir(o.machineDir), "out", fileSafe(peer));
  mkdirSync(dir, { recursive: true });
  sweepStale(dir);
  const mark = peerMark(peer, host, dbPath);
  const top = newestOwnAbove(dbPath, host, mark);
  let catchUp = unsentVectorIdsFor(normalizeDeviceId(peer), host, mark, dbPath);
  const out: OutBlock[] = [];
  const cap = Math.floor(MAX_FRAME_BYTES * 0.9);
  let since = mark;
  let step = o.startStep ?? 20_000;
  while (out.length < (o.maxBlocks ?? 4) && (since < top || catchUp.length)) {
    const id = randomBytes(12).toString("hex");
    const file = join(dir, `${id}.zmb`);
    const until = top > since ? Math.min(top, since + step) : since;
    const r = await exportMemoryBundle({
      outPath: file,
      dbPath,
      keyFile: o.keyFile,
      force: true,
      excludeLanes: getScopeExclude(),
      ownHost: host,
      vectorsLater: true,
      attachments: true,
      ...(since > 0 ? { sinceMessageId: since } : {}),
      ...(top > since ? { untilMessageId: until } : { untilMessageId: since }),
      ...(catchUp.length ? { vectorCatchUpIds: catchUp } : {}),
    });
    if (r.bundleBytes > cap && step > 50) {
      // too big for one frame: the same range again in smaller pieces
      rmSync(file, { force: true });
      step = Math.max(50, Math.floor(step / 4));
      continue;
    }
    const messages = r.rows?.messages ?? 0;
    const vecIds = r.vectorShippedIds ?? [];
    if (!messages && !vecIds.length) rmSync(file, { force: true });
    else out.push({ id, file, upto: Math.max(since, r.rows?.maxMessageId ?? since), vecIds, messages, bytes: r.bundleBytes });
    catchUp = [];
    if (top <= since) break;
    since = until;
  }
  return out;
}

/** `peer` merged a block: its mark rises to the block's `upto`, its vectors are confirmed. Under the store's write turn. */
export async function ackOutgoing(peer: string, block: Pick<OutBlock, "upto" | "vecIds" | "file">, o: { dbPath?: string } = {}): Promise<void> {
  const dbPath = o.dbPath ?? currentMemoryDb();
  const release = await acquireWriteTurn();
  try {
    if (block.upto > readExportWatermark(peerKey(peer), dbPath)) writeExportWatermark(peerKey(peer), block.upto, dbPath);
    markVectorsSentTo(normalizeDeviceId(peer), block.vecIds, dbPath);
  } finally {
    release();
  }
  rmSync(block.file, { force: true });
}

/** Where a block from `peer` waits for the merge lane. */
export function inboxDir(machineDir = currentMemoryDir()): string {
  return join(p2pDir(machineDir), "in");
}

/** Put a received block in the inbox (atomic: a half-written file never looks like a block). Returns its path. */
export async function inboxPut(peer: string, id: string, bytes: Buffer, machineDir = currentMemoryDir()): Promise<string> {
  const dir = inboxDir(machineDir);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${fileSafe(peer)}--${fileSafe(id)}.zmb`);
  const tmp = `${file}.part-${process.pid}`;
  await writeFile(tmp, bytes);
  renameSync(tmp, file);
  return file;
}

/** A block file older than this was never answered (the process died mid-round): its range is made again from the mark. */
const STALE_BLOCK_MS = 60 * 60_000;

function sweepStale(dir: string): void {
  const now = Date.now();
  for (const n of readdirSync(dir)) {
    try {
      if (now - statSync(join(dir, n)).mtimeMs > STALE_BLOCK_MS) rmSync(join(dir, n), { force: true });
    } catch {
      /* gone between list and stat */
    }
  }
}

export interface MergedBlock {
  id: string;
  messagesAdded: number;
  error?: string;
}

/** Merge one inbox block into the db and throw it away - merged or not (a failed one is made again by its sender). */
export async function mergeInboxFile(file: string, o: { dbPath?: string; keyFile?: string } = {}): Promise<number> {
  try {
    const r = await mergeMemoryBundle({ bundlePath: file, dbPath: o.dbPath, keyFile: o.keyFile, excludeLanes: getScopeExclude() });
    return r.messagesAdded;
  } finally {
    rmSync(file, { force: true });
  }
}

/** Merge every block in the inbox into the db and throw each one away. The merge lane's child calls this. */
export async function mergeInbox(o: { dbPath?: string; keyFile?: string; machineDir?: string } = {}): Promise<MergedBlock[]> {
  const dir = inboxDir(o.machineDir);
  if (!existsSync(dir)) return [];
  const out: MergedBlock[] = [];
  const files = readdirSync(dir).filter((x) => x.endsWith(".zmb"));
  // arrival order: blocks of one sender go in the order they were sent
  const at = (f: string): number => {
    try {
      return statSync(join(dir, f)).mtimeMs;
    } catch {
      return 0;
    }
  };
  for (const f of files.map((x) => ({ x, t: at(x) })).sort((a, b) => a.t - b.t).map((e) => e.x)) {
    const id = f.replace(/\.zmb$/, "").split("--").pop() ?? f;
    try {
      out.push({ id, messagesAdded: await mergeInboxFile(join(dir, f), o) });
    } catch (e) {
      out.push({ id, messagesAdded: 0, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return out;
}
