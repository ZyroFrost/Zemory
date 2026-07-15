// Markdown ↔ sections. Split a doc at HEADING boundaries only (fence-aware);
// each section keeps its body VERBATIM. render(parse(md)) reproduces the file
// (headings normalized to "#×level text"; body byte-exact) — so the DB form and
// the .md form display identically. roundTripOk() proves it before we trust it.

export interface ParsedSection {
  ordinal: number;
  level: number; // 0 = preamble (text before first heading)
  heading: string | null;
  anchor: string | null;
  body: string; // verbatim markdown between this heading and the next
}

const HEADING = /^(#{1,6})[ \t]+(.*?)[ \t]*$/;
const FENCE = /^[ \t]*(```|~~~)/;

// CRLF GUARD (bug found 2026-07-16). A doc written by a Windows editor/
// PowerShell arrives as CRLF; splitting on "\n" leaves a trailing "\r" on every
// line, and in JS neither `.` nor `$` accepts "\r" — so HEADING matched NOTHING
// and the whole file collapsed into one heading-less blob (changelog: ZERO
// entries → `import` reporting "merged 0" over a full file). FILE WINS makes
// hand-editing the primary path, so normalize at the boundary; stored bodies
// are LF.
const normEol = (text: string): string => text.replace(/\r\n/g, "\n");

/** Split markdown into sections at heading boundaries, fence-aware. */
export function parseMarkdown(input: string): ParsedSection[] {
  const text = normEol(input);
  const lines = text.split("\n");
  const offsets: number[] = [];
  let off = 0;
  for (const l of lines) {
    offsets.push(off);
    off += l.length + 1; // + "\n"
  }

  let inFence = false;
  const heads: { idx: number; level: number; heading: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = HEADING.exec(lines[i]);
    if (m) heads.push({ idx: i, level: m[1].length, heading: m[2] });
  }

  const sections: ParsedSection[] = [];
  let ordinal = 0;
  const firstOff = heads.length ? offsets[heads[0].idx] : text.length;
  const preamble = text.slice(0, firstOff);
  if (preamble.length > 0) {
    sections.push({ ordinal: ordinal++, level: 0, heading: null, anchor: null, body: preamble });
  }
  for (let k = 0; k < heads.length; k++) {
    const start = offsets[heads[k].idx];
    const end = k + 1 < heads.length ? offsets[heads[k + 1].idx] : text.length;
    const block = text.slice(start, end);
    const nl = block.indexOf("\n");
    const body = nl < 0 ? "" : block.slice(nl + 1);
    sections.push({
      ordinal: ordinal++,
      level: heads[k].level,
      heading: heads[k].heading,
      anchor: slug(heads[k].heading),
      body,
    });
  }
  return sections;
}

/** Reassemble sections into markdown (db → md). Inverse of parseMarkdown. */
export function renderSections(sections: { level: number; heading: string | null; body: string }[]): string {
  let out = "";
  for (const s of sections) {
    if (s.level === 0 || s.heading == null) out += s.body;
    else {
      if (out.length > 0 && !out.endsWith("\n")) out += "\n";
      out += "#".repeat(s.level) + " " + s.heading + "\n" + s.body;
    }
  }
  return out;
}

// Heading lines are normalized (level + single space + trimmed text), so for
// the fidelity check we normalize BOTH sides and compare — body must be exact,
// only heading whitespace is allowed to differ.
function normalizeHeadings(input: string): string {
  let inFence = false;
  return normEol(input)
    .split("\n")
    .map((l) => {
      if (FENCE.test(l)) {
        inFence = !inFence;
        return l;
      }
      if (inFence) return l;
      const m = HEADING.exec(l);
      return m ? "#".repeat(m[1].length) + " " + m[2] : l;
    })
    .join("\n");
}

/** True if parsing then rendering reproduces the doc (content byte-exact). */
export function roundTripOk(text: string): boolean {
  return normalizeHeadings(text) === renderSections(parseMarkdown(text));
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
