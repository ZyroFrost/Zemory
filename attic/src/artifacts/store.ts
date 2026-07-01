// Artifact store (phase B): the "safe box" that keeps raw tool output BEFORE any
// compression decision, so anything cut from the transcript is always
// recoverable byte-exact. Plan 03 §10:
//   - raw bytes live as a content-addressed file on disk (named by sha256, with
//     restricted perms), NOT inside the SQLite DB;
//   - `artifact` holds metadata only; `artifact_index` is a REDACTED, per-line
//     index used for search so a search result never leaks a secret;
//   - `no-store` keeps metadata + redacted index but writes no raw file.
//
// This module owns writing; reading is in ./search.ts, expiry/quota in
// ./retention.ts. All paths derive from the brain DB dir so tests inject a temp.

import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { BRAIN_DB, type BrainDB, openBrain } from "../brain/db.js";
import { redact } from "../brain/redact.js";

export type RetentionClass = "default" | "pin" | "no-store";

export interface StoreOptions {
  raw: string;
  projectRoot?: string;
  sessionId?: string;
  source?: string;
  toolName?: string;
  command?: string;
  exitCode?: number;
  mediaType?: string;
  retentionClass?: RetentionClass;
  /** Bytes that actually entered the transcript (the envelope). Defaults to full. */
  admittedBytes?: number;
  dbPath?: string;
  /** Injectable clock (ms) for deterministic tests/retention. */
  now?: number;
}

export interface ArtifactMeta {
  id: string;
  sha256: string;
  rawBytes: number;
  lines: number;
  storagePath: string | null;
  retentionClass: RetentionClass;
  hasSecret: boolean;
  createdAt: string;
  expiresAt: string | null;
}

/** Where raw artifact files live — alongside the brain DB. */
export function artifactDir(dbPath: string = BRAIN_DB): string {
  return join(dirname(dbPath), "artifacts");
}

const lineCount = (s: string): number => (s === "" ? 0 : s.split("\n").length);

function newId(now: number): string {
  return `zmo_${now.toString(36)}${randomBytes(4).toString("hex")}`;
}

/**
 * Store raw output and return its handle. Content-addressed: identical output
 * reuses the same on-disk file. The raw file is the byte-exact recovery source;
 * the DB index is redacted.
 */
export function storeArtifact(opts: StoreOptions): ArtifactMeta {
  const dbPath = opts.dbPath ?? BRAIN_DB;
  const now = opts.now ?? Date.now();
  const raw = opts.raw;
  const sha256 = createHash("sha256").update(raw, "utf8").digest("hex");
  const id = newId(now);
  const rawBytes = Buffer.byteLength(raw, "utf8");
  const retentionClass = opts.retentionClass ?? "default";
  const noStore = retentionClass === "no-store";
  const hasSecret = redact(raw) !== raw;

  const dir = artifactDir(dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const storagePath = noStore ? null : join(dir, `${sha256}.raw`);

  // Write the raw file (content-addressed → idempotent), restricted perms.
  if (storagePath && !existsSync(storagePath)) {
    writeFileSync(storagePath, raw, { mode: 0o600 });
  }

  const createdAt = new Date(now).toISOString();
  // Artifacts are PERMANENT: nothing expires on its own. Disk is managed by
  // archiving cold files (gzip) and warning over quota, never by deletion.
  const expiresAt = null;

  const db: BrainDB = openBrain(dbPath);
  const insert = db.transaction(() => {
    db.prepare(
      `INSERT INTO artifact
        (id, sha256, project_root, session_id, source, tool_name, command_redacted,
         exit_code, media_type, raw_bytes, admitted_bytes, storage_path, retention_class,
         has_secret, created_at, accessed_at, expires_at)
       VALUES (@id, @sha256, @projectRoot, @sessionId, @source, @toolName, @commandRedacted,
         @exitCode, @mediaType, @rawBytes, @admittedBytes, @storagePath, @retentionClass,
         @hasSecret, @createdAt, @createdAt, @expiresAt)`,
    ).run({
      id,
      sha256,
      projectRoot: opts.projectRoot ?? null,
      sessionId: opts.sessionId ?? null,
      source: opts.source ?? null,
      toolName: opts.toolName ?? null,
      commandRedacted: opts.command ? redact(opts.command) : null,
      exitCode: opts.exitCode ?? null,
      mediaType: opts.mediaType ?? "text/plain",
      rawBytes,
      admittedBytes: opts.admittedBytes ?? rawBytes,
      storagePath,
      retentionClass,
      hasSecret: hasSecret ? 1 : 0,
      createdAt,
      expiresAt,
    });
    const idx = db.prepare(
      "INSERT INTO artifact_index (artifact_id, ordinal, text_redacted) VALUES (?, ?, ?)",
    );
    const lines = raw.split("\n");
    for (let i = 0; i < lines.length; i++) idx.run(id, i + 1, redact(lines[i]));
  });
  insert();

  return {
    id,
    sha256,
    rawBytes,
    lines: lineCount(raw),
    storagePath,
    retentionClass,
    hasSecret,
    createdAt,
    expiresAt,
  };
}

export interface CompressionEvent {
  artifactId: string;
  engine?: string;
  handler?: string;
  policy?: string;
  beforeChars?: number;
  afterChars?: number;
  beforeLines?: number;
  afterLines?: number;
  estimatedTokensBefore?: number;
  estimatedTokensAfter?: number;
  passthroughReason?: string;
  dbPath?: string;
  now?: number;
}

/** Record a compression decision for audit (phase C uses this heavily). */
export function recordCompressionEvent(e: CompressionEvent): void {
  const db = openBrain(e.dbPath ?? BRAIN_DB);
  db.prepare(
    `INSERT INTO compression_event
      (artifact_id, engine, handler, policy, before_chars, after_chars, before_lines,
       after_lines, estimated_tokens_before, estimated_tokens_after, passthrough_reason,
       recovery_count, created_at)
     VALUES (@artifactId, @engine, @handler, @policy, @beforeChars, @afterChars, @beforeLines,
       @afterLines, @estimatedTokensBefore, @estimatedTokensAfter, @passthroughReason,
       0, @createdAt)`,
  ).run({
    artifactId: e.artifactId,
    engine: e.engine ?? null,
    handler: e.handler ?? null,
    policy: e.policy ?? null,
    beforeChars: e.beforeChars ?? null,
    afterChars: e.afterChars ?? null,
    beforeLines: e.beforeLines ?? null,
    afterLines: e.afterLines ?? null,
    estimatedTokensBefore: e.estimatedTokensBefore ?? null,
    estimatedTokensAfter: e.estimatedTokensAfter ?? null,
    passthroughReason: e.passthroughReason ?? null,
    createdAt: new Date(e.now ?? Date.now()).toISOString(),
  });
}
