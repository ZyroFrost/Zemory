// plan/28 §0o — the ONE place that knows how harness parts are named.
//
// A part name is a row of components separated by `_`; inside a component words run together, first letter of each word
// upper-case (the folder-name rule of the disk standard, plan/28 §5). Every component has one meaning:
//
//   shelf code · group · number · name
//   Rule_Keys_08_ClarifyFirst         a common rule, enforced by keyword reminders, number 8 of the rules shelf
//   Cons_Gate_05_OneNameDictionary    a constitution article, enforced by a machine gate
//   Struc_Repo_App                    a structure bundle covering one repo (no number: a bundle is chosen by name)
//   Backend_013_Commands              a slot (inner layer `_Slot/`): area `backend/`, number 13 — no code, the layer says it
//   GUI                               a host (inner layer `_Host/`): the kind of environment — no code, the layer says it
//   Skill_Doc_WriteDocx               a skill of the Doc group (no number; its host copy is `doc-write-docx`)
//
// The NUMBER never changes and is what identifies a part: the key `Rule_14` stays the same when the rule moves from
// Core to Keys or is renamed, so a citation of an old full name still resolves (lookup ignores group and name).
// Legacy ids (`02-14` for rules, `01-5` for articles, `03-93` for slots) map onto keys through `legacyKey`.
// An inner-layer part names only its own content (plan/28 §0p): the layer folder (`_Slot` · `_Host`) already says what
// it is. The older prefixed forms (`Slot_Backend_013_Commands` · `Host_GUI`) are still read.

/**
 * Shelf folders of a repo harness and of the store, in reading order (plan/28 §0q). The law shelf `01_LAW` holds two inner
 * layers: `_Rule` (common rules, the same text in every repo) and `_Cons` (constitution frames: a common rule that makes the
 * repo declare one kind of invariant, plus the `Cons.md` the repo writes for itself). A shelf value is a path below the
 * harness folder, so the two law layers are addressed exactly like the other shelves.
 */
export const LAW_SHELF = "01_LAW";
export const SHELF = {
  rules: `${LAW_SHELF}/_Rule`,
  constitution: `${LAW_SHELF}/_Cons`,
  structure: "02_STRUCTURE",
  skills: "03_SKILLS",
} as const;
export type ShelfName = (typeof SHELF)[keyof typeof SHELF];

/** Old shelf folder → new. Every earlier layout (file harness, first and second folder harness) used these; sync renames them. */
export const LEGACY_SHELF: Record<string, ShelfName> = {
  "01_RULES": SHELF.rules,
  "02_RULES": SHELF.rules,
  "02_CONSTITUTION": SHELF.constitution,
  "01_CONSTITUTION": SHELF.constitution,
  "03_STRUCTURE": SHELF.structure,
  "04_SKILLS": SHELF.skills,
};

/** The two ledger files of a repo harness (plan/28 §0q), and the names earlier layouts gave them. */
export const LEDGER = { todo: "04_TODO.md", changes: "05_CHANGES.md" } as const;
export const LEGACY_LEDGER: Record<string, string> = {
  "05_TODO.md": LEDGER.todo,
  "06_CHANGES.md": LEDGER.changes,
};
/** Every name the TODO / CHANGES ledger has had, current first — for readers that must find it in any repo. */
export const LEDGER_NAMES = {
  todo: [LEDGER.todo, "05_TODO.md"],
  changes: [LEDGER.changes, "06_CHANGES.md"],
} as const;

/** The file a constitution frame's repo copy is written in (plan/28 §0q): the repo's own text, never overwritten by sync. */
export const CONS_REPO_FILE = "Cons.md";
/** Numbers from here up are the repo's own articles; the store never uses them. */
export const OWN_ARTICLE_FROM = 101;

/** The code a part name starts with, per kind of part. */
export const CODE = { rule: "Rule", constitution: "Cons", structure: "Struc", slot: "Slot", skill: "Skill", host: "Host" } as const;
export type Code = (typeof CODE)[keyof typeof CODE];

/** How a machine enforces a rule or article (plan/28 §0o): blocks · reminds by keyword · nothing (core text only). */
export const ENFORCEMENT = ["Gate", "Keys", "Core"] as const;
export type Enforcement = (typeof ENFORCEMENT)[number];

/** How far a structure bundle reaches. */
export const SCOPE = ["Repo", "Region", "Disk"] as const;
export type Scope = (typeof SCOPE)[number];

/** Skill groups. A new group is added here first — a part name with an unknown component is a red gate. */
export const SKILL_GROUP = ["Doc", "Harness", "Dev", "Task", "PBI"] as const;

/** The hosts (plan/28 §0p E): the KIND of environment the agent runs in, never an app's name — a GUI app of its own, an IDE
 *  panel, a terminal. They live in the structure shelf's inner layer `_Host/`; a set carries exactly one. */
export const HOST_KIND = ["GUI", "IDE", "CLI"] as const;

/** One parsed part name. `nn` is the number as written (`05`), `no` the number (5). */
export interface PartName {
  code: Code;
  /** Enforcement (Rule · Cons), scope (Struc), area (Slot), group (Skill). */
  group: string;
  no?: number;
  nn?: string;
  name: string;
}

const WORD = "[A-Z][A-Za-z0-9]*";
// The name component may open with a number of the thing it names (`01Raw` — the slot of `data/<case>/01_raw/`).
const NAME = "[A-Z0-9][A-Za-z0-9]*";
const PATTERNS: Array<[Code, RegExp]> = [
  ["Rule", new RegExp(`^Rule_(${ENFORCEMENT.join("|")})_(\\d{2,3})_(${NAME})$`)],
  ["Cons", new RegExp(`^Cons_(${ENFORCEMENT.join("|")})_(\\d{2,3})_(${NAME})$`)],
  ["Struc", new RegExp(`^Struc_(${SCOPE.join("|")})_(${NAME})$`)],
  ["Slot", new RegExp(`^Slot_(${WORD})_(\\d{2,3})_(${NAME})$`)],
  ["Skill", new RegExp(`^Skill_(${SKILL_GROUP.join("|")})_(${NAME})$`)],
  ["Host", new RegExp(`^Host_()(${HOST_KIND.join("|")})$`)],
  // the inner-layer forms: a slot is <Area>_<NNN>_<Name> (three digits — rules and articles have two and a code), a host its kind
  ["Slot", new RegExp(`^(${WORD})_(\\d{3})_(${NAME})$`)],
  ["Host", new RegExp(`^()(${HOST_KIND.join("|")})$`)],
];

/** Parse a part folder name; null when it does not follow the dictionary (a red gate for store parts). */
export function parsePartName(folder: string): PartName | null {
  for (const [code, re] of PATTERNS) {
    const m = re.exec(folder);
    if (!m) continue;
    if (code === "Struc" || code === "Skill" || code === "Host") return { code, group: m[1], name: m[2] };
    return { code, group: m[1], nn: m[2], no: Number(m[2]), name: m[3] };
  }
  return null;
}

/** Digits a number is written with: two for rules and articles, three for slots (the shelf already holds 136). */
const WIDTH: Partial<Record<Code, number>> = { Rule: 2, Cons: 2, Slot: 3 };

export function formatPartName(p: Omit<PartName, "nn">): string {
  if (p.code === "Host") return p.name;
  if (p.code === "Struc" || p.code === "Skill") return `${p.code}_${p.group}_${p.name}`;
  const nn = String(p.no ?? 0).padStart(WIDTH[p.code] ?? 2, "0");
  if (p.code === "Slot") return `${p.group}_${nn}_${p.name}`;
  return `${p.code}_${p.group}_${nn}_${p.name}`;
}

/** The stable identity of a part: code + number (`Rule_14`), or code + group + name for unnumbered parts. */
export function keyOf(p: Pick<PartName, "code" | "group" | "no" | "name">): string {
  if (p.code === "Host") return `Host_${p.name}`;
  return p.no === undefined ? `${p.code}_${p.group}_${p.name}` : `${p.code}_${p.no}`;
}

/** A citation (full name, key, or legacy id) → key; null when it is none of them. Group and name are ignored. */
export function citationKey(s: string): string | null {
  const t = s.trim();
  const parsed = parsePartName(t);
  if (parsed) return keyOf(parsed);
  const k = /^(Rule|Cons|Slot)_(\d{1,3})$/.exec(t);
  if (k) return `${k[1]}_${Number(k[2])}`;
  return legacyKey(t);
}

/** Legacy id → key: `02-14` → `Rule_14` · `01-5` → `Cons_5` · `03-93` → `Slot_93`. */
export function legacyKey(id: string): string | null {
  const m = /^0([123])-(\d{1,3})$/.exec(id.trim());
  if (!m) return null;
  const code = m[1] === "2" ? "Rule" : m[1] === "1" ? "Cons" : "Slot";
  return `${code}_${Number(m[2])}`;
}

/** Key → legacy id: `Rule_14` → `02-14` · `Cons_5` → `01-5` · `Slot_93` → `03-93`; null for an unnumbered key. */
export function legacyIdOf(key: string): string | null {
  const m = /^(Rule|Cons|Slot)_(\d+)$/.exec(key);
  if (!m) return null;
  return `${m[1] === "Rule" ? "02" : m[1] === "Cons" ? "01" : "03"}-${Number(m[2])}`;
}

/** `challenge-design` / `sql_one_way` / `ui design` → `ChallengeDesign` (a legacy kebab name becomes the name component). */
export function camelName(s: string): string {
  return s
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    // An all-capitals word is one word, not an acronym run (`README` → `Readme`, `LICENSE` → `License`).
    .map((w) => (w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w) ? w[0] + w.slice(1).toLowerCase() : w[0].toUpperCase() + w.slice(1)))
    .join("");
}

/** A slot's area: its first path segment as a name component; a file at the repo root is `Root`. */
export function slotArea(path: string): string {
  const first = path.replace(/\\/g, "/").replace(/^\.?\//, "").split("/")[0] ?? "";
  const isRootFile = !path.includes("/") || path.replace(/\/+$/, "") === first && !path.endsWith("/");
  if (!first || isRootFile) return "Root";
  return camelName(first.replace(/^\./, "")) || "Root";
}

/** Host skill name (Agent Skills: lower-case letters, digits, `-`, equal to its folder): `Skill_Doc_WriteDocx` → `doc-write-docx`. */
export function hostSkillName(p: Pick<PartName, "group" | "name">): string {
  const kebab = (s: string): string => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2").toLowerCase();
  return `${kebab(p.group)}-${kebab(p.name)}`;
}

// ── prompt keywords (Keys rules) ────────────────────────────────────────────────────────────────────────────────────
// The reminder hook and the example runner match a rule's keywords EXACTLY the way the keyword table was measured
// (plan/28 §0o: 1,200 labelled real requests + 16,417 for noise): `\b` is a Unicode word edge (JS `\b` knows only ASCII
// letters, so it never fires next to "ể"), and a request is tried as typed and with its marks stripped, so an unmarked
// keyword also catches the same word typed without diacritics.
const EDGE = String.raw`(?:(?<![\p{L}\p{N}])(?=[\p{L}\p{N}])|(?<=[\p{L}\p{N}])(?![\p{L}\p{N}]))`;
const unmarked = (t: string): string => t.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D");

/** Does a keyword pattern fire on a request? A bad pattern never fires (fail-open). */
export function promptMatches(re: string, text: string): boolean {
  let rx: RegExp;
  try {
    rx = new RegExp(re.replaceAll("\\b", EDGE), "iu");
  } catch {
    return false;
  }
  return rx.test(text) || rx.test(unmarked(text));
}

/** Enforcement a part really has, read from its gate.json (plan/28 §0o): a blocking key ⇒ Gate · only a prompt ⇒ Keys · none ⇒ Core. */
export function enforcementOf(gate: Record<string, unknown> | null): Enforcement {
  if (!gate) return "Core";
  if (gate.hook || gate.gate || gate.conform || gate.read) return "Gate";
  if (gate.prompt) return "Keys";
  return "Core";
}

// ── sets ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const TIER = ["Basic", "Memory"] as const;

/**
 * Names repos were marked with before the sets took their current names: such a marker still finds its set. The
 * numbers of the old registers (`06` · `08`) meant other sets and are not listed.
 */
export const LEGACY_SETS: Record<string, string> = {
  "05_app": "04_IDE_App_Memory",
  "05_IDE_App_Memory": "04_IDE_App_Memory",
  "02_GUI_App_Memory": "04_IDE_App_Memory",
  "06_IDE_App_Memory": "04_IDE_App_Memory",
  "Kit_GUI_02_AppMemory": "04_IDE_App_Memory",
  "Kit_IDE_06_AppMemory": "04_IDE_App_Memory",
  "02_Common_App_Dev_Memory": "04_IDE_App_Memory",
  "02_Rule_App_Dev_Memory": "04_IDE_App_Memory",
  "01_cowork_basic": "01_GUI_NonApp_Basic",
  "03_Common_NonApp_Task_Basic": "01_GUI_NonApp_Basic",
  "03_Rule_NonApp_Task_Basic": "01_GUI_NonApp_Basic",
  "02_cowork_memory": "02_GUI_NonApp_Memory",
  "04_GUI_NonApp_Memory": "02_GUI_NonApp_Memory",
  "Kit_GUI_04_NonAppMemory": "02_GUI_NonApp_Memory",
  "03_nonapp": "03_IDE_NonApp_Memory",
  "08_IDE_NonApp_Memory": "03_IDE_NonApp_Memory",
  "Kit_IDE_08_NonAppMemory": "03_IDE_NonApp_Memory",
  "04_Common_NonApp_Task_Memory": "03_IDE_NonApp_Memory",
  "04_Rule_NonApp_Task_Memory": "03_IDE_NonApp_Memory",
};

/**
 * A set name says only what is fixed for the set (plan/28 §0p): `<NN>_<host>_<structure>_<tier>` — `03_IDE_NonApp_Memory`.
 * The host comes first, as `_Host/` comes before the structures in the structure shelf and the environment is chosen
 * before the project's kind. Rules, articles and skills are chosen per set and change over time, so they are never in a
 * name. Null when the name does not follow that shape.
 */
export function parseSetName(name: string): { nn: string; structure: string; host: string; tier: string } | null {
  const m = new RegExp(`^(\\d{2})_(${HOST_KIND.join("|")})_(${NAME})_(${TIER.join("|")})$`).exec(name);
  return m ? { nn: m[1], host: m[2], structure: m[3], tier: m[4] } : null;
}
