// Per-agent adapter contract. Each agent stores its sessions differently, so
// each gets an adapter that knows (a) where its transcripts live, (b) how to
// turn one into normalized messages. The ingest engine is agent-agnostic.

export interface ParsedMessage {
  uuid: string | null; // agent's own message id (for dedupe); null OK in append mode
  role: string;
  content: string; // flattened, searchable text
  toolName: string | null;
  timestamp: string | null;
}

/** One line of an append-mode (jsonl) transcript, normalized. */
export type ParsedLine =
  | { kind: "message"; msg: ParsedMessage }
  | { kind: "title"; title: string }
  | { kind: "meta"; cwd?: string }
  | { kind: "skip" };

/** A whole-file (json) transcript, normalized. */
export interface ParsedSession {
  cwd?: string;
  /** Grouping folder recorded as `project_root` (falls back to cwd). For web
   *  chats this is the ChatGPT Project name; for agents it's usually the cwd. */
  project?: string;
  title?: string;
  messages: ParsedMessage[];
}

/** One conversation inside a whole-file transcript that holds MANY (e.g. a
 *  web-chat export = an array of conversations). Each carries its own stable
 *  session id so the engine can fan one file out to N sessions. */
export interface ParsedSessionMulti extends ParsedSession {
  sessionId: string;
}

export interface TranscriptFile {
  source: string;
  path: string;
  size: number;
  mtimeMs: number;
}

export interface Adapter {
  /** Agent name recorded as `source` on every session. */
  source: string;
  /**
   * Provenance bucket stamped on every session: 'local' = an agent transcript
   * that lives on disk (default); 'web' = a captured web-chat (chatgpt-web/…).
   * Lets recall separate the two lanes. Absent → treated as 'local'.
   */
  origin?: "local" | "web";
  /**
   * append: jsonl, grown by appending lines → ingest resumes from a line offset.
   * whole:  one JSON file rewritten on change → re-parsed wholesale on change.
   */
  mode: "append" | "whole";
  /**
   * Path tail that identifies this agent's transcript store, relative to a home
   * or any ancestor — e.g. ".codex/sessions". Discovery joins it to the default
   * roots (fast) AND matches it anywhere on disk during a deep scan (portable:
   * finds the agent wherever it is installed, on any machine).
   */
  signature: string;
  /** List transcript files inside one store root directory. */
  enumerate(storeRoot: string): TranscriptFile[];
  /** Stable session id for a transcript file (unique across the agent). */
  sessionId(filePath: string): string;
  /** append mode: parse a single jsonl line. */
  parseLine?(line: string): ParsedLine;
  /** whole mode: parse the whole file into ONE session. */
  parseFile?(filePath: string): ParsedSession | null;
  /**
   * whole mode: parse a file that holds MANY conversations into N sessions (e.g.
   * a web-chat export). Takes precedence over parseFile when present. Each entry
   * is whole-replaced (re-parse on change), keyed by its own sessionId.
   */
  parseFileMulti?(filePath: string): ParsedSessionMulti[] | null;
}
