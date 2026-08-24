// Claude Code CURATED-memory adapter (#13, user approved 2026-08-24). Ingests the
// facts the agent already distilled — ~/.claude/projects/<enc>/memory/*.md (incl.
// MEMORY.md) — as a separate, filterable lane: source "claude-code-memory".
//
// Why this exists: memory-promotion (#12) needs high-signal curated facts, and the
// agent ALREADY distills them into these files. Ingesting them is 0-LLM (điều 6),
// read-only (điều 3/10 — never write back), redacted by the shared ingest path
// (điều 7), and re-ingested on change via the whole-replace machinery (source_sig
// = ingest_state size/mtime, same as every whole-mode adapter).
//
// Shape: ONE memory FILE = ONE session (one distilled fact = one recallable unit);
// the file body is a single message with role "memory" (tool_name NULL → it joins
// the word+trigram+vector lanes like prose, and the tool demotion never touches it).
//
// Session ids carry the HOSTNAME on purpose: the same project path exists on every
// machine, so a host-less id would make two machines' genuinely different files
// merge into one session on sync — provenance must not blend (điều 11).
//
// The signature is SHARED with the claude-code transcript adapter (.claude/projects)
// — same store root, different files (it takes *.jsonl at depth 1, we take
// memory/*.md at depth 2). Discovery enumerates both per adapter; recordStore
// dedupes by root which only affects known_stores persistence, not enumeration.

import { hostname } from "node:os";
import { basename, dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import { isDir, safeReaddir, safeStat, toTranscript } from "./_shared.js";
import { listKnownProjects } from "../../projects.js";
import type { Adapter, ParsedSessionMulti, TranscriptFile } from "./types.js";

/** Claude Code's project-dir encoding: every non-alphanumeric byte becomes "-". */
export function encodeProjectDir(root: string): string {
  return root.replace(/[^a-zA-Z0-9]/g, "-");
}

/**
 * <enc> → real project root, by encoding every KNOWN project root the same way
 * Claude does and matching (case-insensitive — Windows paths). The encoding is
 * lossy ("-" could have been "\", ":" or "."), so decoding is impossible; the
 * registry is the only honest map. No match → null (session lands in "(unknown)").
 */
export function decodeProjectDir(enc: string): string | null {
  const want = enc.toLowerCase();
  try {
    for (const p of listKnownProjects()) {
      if (encodeProjectDir(p.root).toLowerCase() === want) return p.root;
    }
  } catch {
    /* registry unreadable → unknown project; ingest must not fail over a lookup */
  }
  return null;
}

/** Frontmatter `description:` (fallback `name:`) → session title; else first `# heading`. */
export function memoryTitle(text: string, fileStem: string): string {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (fm) {
    const desc = /^description:\s*(.+)$/m.exec(fm[1]);
    if (desc?.[1].trim()) return desc[1].trim();
    const name = /^name:\s*(.+)$/m.exec(fm[1]);
    if (name?.[1].trim()) return name[1].trim();
  }
  const h1 = /^#\s+(.+)$/m.exec(text);
  if (h1?.[1].trim()) return h1[1].trim();
  return fileStem;
}

export const claudeMemoryAdapter: Adapter = {
  source: "claude-code-memory",
  mode: "whole",
  signature: join(".claude", "projects"),

  enumerate(storeRoot: string): TranscriptFile[] {
    const out: TranscriptFile[] = [];
    for (const proj of safeReaddir(storeRoot)) {
      const memDir = join(storeRoot, proj, "memory");
      if (!isDir(memDir)) continue;
      for (const f of safeReaddir(memDir)) {
        if (!f.endsWith(".md")) continue;
        const t = toTranscript("claude-code-memory", join(memDir, f));
        if (t) out.push(t);
      }
    }
    return out;
  },

  sessionId(filePath: string): string {
    const enc = basename(dirname(dirname(filePath)));
    const stem = basename(filePath).replace(/\.md$/i, "");
    return `claude-memory-${hostname()}-${enc}-${stem}`;
  },

  // parseFileMulti (1-element) instead of parseFile: it is the whole-mode path that
  // honors `project` and whole-replaces on change, verified in ingest.ts.
  parseFileMulti(filePath: string): ParsedSessionMulti[] | null {
    let text: string;
    try {
      text = readFileSync(filePath, "utf8");
    } catch {
      return null;
    }
    if (!text.trim()) return null;
    const stem = basename(filePath).replace(/\.md$/i, "");
    const enc = basename(dirname(dirname(filePath)));
    const project = decodeProjectDir(enc) ?? undefined;
    const ts = new Date(safeStat(filePath)?.mtimeMs ?? Date.now()).toISOString();
    return [
      {
        sessionId: this.sessionId(filePath),
        project,
        title: memoryTitle(text, stem),
        messages: [
          {
            // uuid = file stem: stable across edits, so an unchanged file re-scanned
            // after whole-replace inserts the exact same row (idempotent).
            uuid: stem,
            role: "memory",
            content: text,
            toolName: null,
            timestamp: ts,
          },
        ],
      },
    ];
  },
};
