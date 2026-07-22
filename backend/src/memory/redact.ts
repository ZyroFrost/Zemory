// Scrub obvious secrets before they land in the memory. Transcripts can contain
// API keys / tokens pasted into prompts or printed by tools; we replace known
// credential shapes with [REDACTED] at ingest. Local-only DB, but defense in
// depth: the memory shouldn't become the one file that leaks every key.
// (Pattern set mirrors agentmemory's; conservative — known prefixes only.)

const PATTERNS: RegExp[] = [
  /sk-ant-[A-Za-z0-9-]{20,}/g, // Anthropic
  /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g, // OpenAI
  /AKIA[0-9A-Z]{16}/g, // AWS access key id
  /gh[pousr]_[A-Za-z0-9]{20,}/g, // GitHub tokens
  /AIza[0-9A-Za-z\-_]{35}/g, // Google API key
  /xox[baprs]-[A-Za-z0-9-]{10,}/g, // Slack
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWT
];

/** Replace credential-shaped substrings with [REDACTED]. */
export function redact(text: string): string {
  if (!text) return text;
  let out = text;
  for (const re of PATTERNS) out = out.replace(re, "[REDACTED]");
  return out;
}
