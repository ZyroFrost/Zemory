// plan/29 §13 — the two INDEX files of a folder harness are tables of contents the machine writes on every sync, from the
// parts assembled into the repo: `02_STRUCTURE/INDEX.md` (the structure and every slot: path, what it holds) and
// `03_SKILLS/INDEX.md` (every skill: source, host folder, type, when to open it). Nobody writes them by hand; the agent reads
// the repo's own harness, and without a contents page it would open some thirty slots to find one path. A hand-written INDEX
// met for the first time is kept whole in the archive before it is replaced — what it said is moved to its proper home
// (the constitution, a skill of the repo's own) by the repo's reshape, never lost.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  bodyOf,
  frontMatter,
  hostSkillOf,
  isRetired,
  leafOf,
  listHostParts,
  listParts,
  listStructures,
  mainOf,
  mainPath,
  shelfDir,
  type Part,
} from "./store.js";
import { SHELF } from "./harness-names.js";

/** The first line of every generated INDEX: what tells a machine-written file from a hand-written one. */
export const INDEX_MARK = "<!-- zemory:generated";
const MARK_LINE = `${INDEX_MARK} · written by sync from the parts in this folder; never edited by hand · máy sinh lúc sync, không sửa tay -->`;

const cell = (s: string): string => s.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

/** What a part's title line says after its name: `# Data_102_Secrets secrets — file key / salt` → `file key / salt`. */
function summaryOf(p: Part): string {
  const f = mainPath(p.dir, mainOf(p));
  const text = existsSync(f) ? readFileSync(f, "utf8") : "";
  const title = /^#\s+(.+)$/m.exec(bodyOf(text))?.[1] ?? "";
  const dash = title.split(/\s+[—–-]\s+/);
  return cell(dash.length > 1 ? dash.slice(1).join(" — ") : title.replace(leafOf(p.folder), "").replace(new RegExp(`^\\s*${p.name}\\b`), ""));
}

const link = (agentShelf: string, p: Part): string => {
  const rel = relative(agentShelf, mainPath(p.dir, mainOf(p))).replace(/\\/g, "/");
  return `[\`${leafOf(p.folder)}\`](${rel})`;
};

/** `02_STRUCTURE/INDEX.md`: the structure the repo is assembled from, every slot, every host note. */
export function structureIndex(agentDir: string, project: string): string {
  const shelf = shelfDir(agentDir, SHELF.structure);
  const strucs = listStructures(agentDir);
  const slots = listParts(agentDir, SHELF.structure).filter((p) => !isRetired(p));
  const hosts = listHostParts(agentDir);
  const lines = [
    `# ${project} — Structure index · Mục lục cấu trúc`,
    "",
    MARK_LINE,
    "",
    strucs.length
      ? `Structure · Cấu trúc: ${strucs.map((s) => `${link(shelf, s)} — ${cell(String(s.meta.label ?? "") || summaryOf(s))}`).join(" · ")}`
      : "Structure · Cấu trúc: (none assembled · chưa ráp)",
    "",
    "Before creating, renaming or moving a folder, open the slot whose path holds it. A folder no slot covers is proposed to HS",
    "(`Rule_Gate_85_ProposeChecked`).",
    "Trước khi tạo, đổi tên hay dời thư mục, mở slot có đường chứa nó. Thư mục không slot nào phủ thì đề xuất lên HS.",
    "",
    "| Slot | Path · Đường | Holds · Chứa |",
    "|---|---|---|",
    ...slots.map((p) => `| ${link(shelf, p)} | ${cell(String(p.meta.path ?? "")).split(/\s*[·|]\s*/).filter(Boolean).map((x) => `\`${x}\``).join(" · ")} | ${summaryOf(p)} |`),
  ];
  if (hosts.length) {
    lines.push("", "| Host note · Ghi chú host | About · Về |", "|---|---|", ...hosts.map((p) => `| ${link(shelf, p)} | ${summaryOf(p)} |`));
  }
  return lines.join("\n") + "\n";
}

/** `03_SKILLS/INDEX.md`: every skill source on the shelf and every host skill folder, with when to open it. */
export function skillsIndex(agentDir: string, skillsDir: string, project: string): string {
  const shelf = shelfDir(agentDir, SHELF.skills);
  const parts = listParts(agentDir, SHELF.skills).filter((p) => !isRetired(p) && String(p.meta.frame ?? "") !== "true");
  const hosted = new Set(parts.map(hostSkillOf));
  const rows = parts.map((p) => {
    const host = hostSkillOf(p);
    const where = existsSync(join(skillsDir, host, "SKILL.md")) ? `\`.claude/skills/${host}/\`` : "(not plugged · chưa cắm)";
    return `| ${link(shelf, p)} | ${where} | ${cell(String(p.meta.type ?? ""))} | ${cell(String(p.meta.description ?? ""))} |`;
  });
  // a skill that lives only in the host folder (the repo's own, from before skills had a source on the shelf)
  const hostOnly = existsSync(skillsDir)
    ? readdirSync(skillsDir, { withFileTypes: true }).filter((e) => e.isDirectory() && !hosted.has(e.name) && existsSync(join(skillsDir, e.name, "SKILL.md"))).map((e) => e.name).sort()
    : [];
  for (const h of hostOnly) {
    const meta = frontMatter(readFileSync(join(skillsDir, h, "SKILL.md"), "utf8"))?.meta ?? {};
    rows.push(`| (host only · chỉ ở host) | \`.claude/skills/${h}/\` | ${cell(String(meta.type ?? ""))} | ${cell(String(meta.description ?? ""))} |`);
  }
  return [
    `# ${project} — Skills · Skill`,
    "",
    MARK_LINE,
    "",
    "The host loads each skill from `.claude/skills/<host>/SKILL.md`; its source is the folder named here. Work that matches",
    "\"Open when\" opens the skill first (`Rule_Gate_63_SkillTrigger`).",
    "Host nạp skill từ `.claude/skills/<host>/SKILL.md`; nguồn là thư mục ghi ở đây. Việc khớp cột \"Open when\" thì mở skill trước.",
    "",
    "| Skill | Host | Type | Open when · Mở khi |",
    "|---|---|---|---|",
    ...rows,
  ].join("\n") + "\n";
}

/**
 * Write both INDEX files. A file that is there without the generated mark is a hand-written one: it is copied whole to
 * `<archive>/harness-index/<date>/` first (once — an identical copy is not made twice). Returns what was written and kept.
 */
export function writeIndexes(
  agentDir: string,
  skillsDir: string,
  archiveDir: string,
  project: string,
  apply: boolean,
  date = new Date().toISOString().slice(0, 10),
): { written: string[]; archived: string[] } {
  const out = { written: [] as string[], archived: [] as string[] };
  const files: Array<[string, string, string]> = [
    [join(shelfDir(agentDir, SHELF.structure), "INDEX.md"), structureIndex(agentDir, project), "02_STRUCTURE-INDEX.md"],
    [join(shelfDir(agentDir, SHELF.skills), "INDEX.md"), skillsIndex(agentDir, skillsDir, project), "03_SKILLS-INDEX.md"],
  ];
  for (const [file, text, keepAs] of files) {
    const had = existsSync(file) ? readFileSync(file, "utf8") : null;
    if (had !== null && had.replace(/\r\n/g, "\n") === text) continue;
    if (had !== null && !had.includes(INDEX_MARK) && had.trim()) {
      const to = join(archiveDir, "harness-index", date, keepAs);
      if (!(existsSync(to) && readFileSync(to, "utf8") === had)) {
        out.archived.push(to);
        if (apply) { mkdirSync(join(to, ".."), { recursive: true }); copyFileSync(file, to); }
      }
    }
    out.written.push(file);
    if (apply) {
      mkdirSync(join(file, ".."), { recursive: true });
      writeFileSync(file, had && had.includes("\r\n") ? text.replace(/\n/g, "\r\n") : text);
    }
  }
  return out;
}
