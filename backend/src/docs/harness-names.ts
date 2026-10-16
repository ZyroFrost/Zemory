// plan/28 §0o — the ONE place that knows how harness parts are named.
//
// A part name is a row of components separated by `_`; inside a component words run together, first letter of each word
// upper-case (the folder-name rule of the disk standard, plan/28 §5). Every component has one meaning:
//
//   shelf code · group · number · name
//   Rule_Keys_14_ChallengeDesign      a common rule, enforced by keyword reminders, number 14 of the rules shelf
//   Cons_Gate_05_OneNameDictionary    a constitution article, enforced by a machine gate
//   Struc_Repo_App                    a structure bundle covering one repo (no number: a bundle is chosen by name)
//   Slot_Backend_013_Commands         a slot in the `backend/` area, number 13 of the structure shelf
//   Skill_Doc_WriteDocx               a skill of the Doc group (no number; its host copy is `doc-write-docx`)
//
// The NUMBER never changes and is what identifies a part: the key `Rule_14` stays the same when the rule moves from
// Core to Keys or is renamed, so a citation of an old full name still resolves (lookup ignores group and name).
// Legacy ids (`02-14` for rules, `01-5` for articles, `03-93` for slots) map onto keys through `legacyKey`.

/** Shelf folders of a repo harness and of the store, in reading order. */
export const SHELF = {
  rules: "01_RULES",
  constitution: "02_CONSTITUTION",
  structure: "03_STRUCTURE",
  skills: "04_SKILLS",
} as const;
export type ShelfName = (typeof SHELF)[keyof typeof SHELF];

/** Old shelf folder → new. The file harness and the first folder harness used these; sync renames them. */
export const LEGACY_SHELF: Record<string, ShelfName> = {
  "01_CONSTITUTION": SHELF.constitution,
  "02_RULES": SHELF.rules,
  "03_STRUCTURE": SHELF.structure,
  "04_SKILLS": SHELF.skills,
};

/** The code a part name starts with, per kind of part. */
export const CODE = { rule: "Rule", constitution: "Cons", structure: "Struc", slot: "Slot", skill: "Skill" } as const;
export type Code = (typeof CODE)[keyof typeof CODE];

/** How a machine enforces a rule or article (plan/28 §0o): blocks · reminds by keyword · nothing (core text only). */
export const ENFORCEMENT = ["Gate", "Keys", "Core"] as const;
export type Enforcement = (typeof ENFORCEMENT)[number];

/** How far a structure bundle reaches. */
export const SCOPE = ["Repo", "Region", "Disk"] as const;
export type Scope = (typeof SCOPE)[number];

/** Skill groups. A new group is added here first — a part name with an unknown component is a red gate. */
export const SKILL_GROUP = ["Doc", "Harness", "Dev", "Task", "PBI"] as const;

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
];

/** Parse a part folder name; null when it does not follow the dictionary (a red gate for store parts). */
export function parsePartName(folder: string): PartName | null {
  for (const [code, re] of PATTERNS) {
    const m = re.exec(folder);
    if (!m) continue;
    if (code === "Struc" || code === "Skill") return { code, group: m[1], name: m[2] };
    return { code, group: m[1], nn: m[2], no: Number(m[2]), name: m[3] };
  }
  return null;
}

/** Digits a number is written with: two for rules and articles, three for slots (the shelf already holds 136). */
const WIDTH: Partial<Record<Code, number>> = { Rule: 2, Cons: 2, Slot: 3 };

export function formatPartName(p: Omit<PartName, "nn">): string {
  if (p.code === "Struc" || p.code === "Skill") return `${p.code}_${p.group}_${p.name}`;
  const nn = String(p.no ?? 0).padStart(WIDTH[p.code] ?? 2, "0");
  return `${p.code}_${p.group}_${nn}_${p.name}`;
}

/** The stable identity of a part: code + number (`Rule_14`), or code + group + name for unnumbered parts. */
export function keyOf(p: Pick<PartName, "code" | "group" | "no" | "name">): string {
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

/** The rules a set carries, by the code of the rules shelf: `Rule` is every common rule; a group adds its own on top
 *  (`RuleDB` · `RuleDept`). */
export const RULE_SET = ["Rule", "RuleDB", "RuleDept"] as const;
export const TIER = ["Basic", "Memory"] as const;

/**
 * Names repos were marked with before the sets took their current names: such a marker still finds its set. The
 * numbers of the old registers (`06` · `08`) meant other sets and are not listed.
 */
export const LEGACY_SETS: Record<string, string> = {
  "05_app": "02_Rule_App_Dev_Memory",
  "02_GUI_App_Memory": "02_Rule_App_Dev_Memory",
  "06_IDE_App_Memory": "02_Rule_App_Dev_Memory",
  "Kit_GUI_02_AppMemory": "02_Rule_App_Dev_Memory",
  "Kit_IDE_06_AppMemory": "02_Rule_App_Dev_Memory",
  "02_Common_App_Dev_Memory": "02_Rule_App_Dev_Memory",
  "01_cowork_basic": "03_Rule_NonApp_Task_Basic",
  "03_Common_NonApp_Task_Basic": "03_Rule_NonApp_Task_Basic",
  "03_nonapp": "04_Rule_NonApp_Task_Memory",
  "02_cowork_memory": "04_Rule_NonApp_Task_Memory",
  "04_GUI_NonApp_Memory": "04_Rule_NonApp_Task_Memory",
  "08_IDE_NonApp_Memory": "04_Rule_NonApp_Task_Memory",
  "Kit_GUI_04_NonAppMemory": "04_Rule_NonApp_Task_Memory",
  "Kit_IDE_08_NonAppMemory": "04_Rule_NonApp_Task_Memory",
  "04_Common_NonApp_Task_Memory": "04_Rule_NonApp_Task_Memory",
};

/**
 * A set name reads its assembly in shelf order (plan/28 §0o): `<NN>_<01 rules>_<03 structure>_<04 skills>_<tier>` — the
 * constitution (02) is the repo's own and never in a name, an empty shelf leaves its component out
 * (`04_Rule_NonApp_Task_Memory`). Null when the name does not follow that order.
 */
export function parseSetName(name: string): { nn: string; rules: string; structure: string; skills: string; tier: string } | null {
  const skills = SKILL_GROUP.join("|");
  // the structure component is any name that is not a skill group (a set without a structure goes rules → skills)
  const m = new RegExp(`^(\\d{2})_(${RULE_SET.join("|")})(?:_(?!(?:${skills})_)(${NAME}))?(?:_(${skills}))?_(${TIER.join("|")})$`).exec(name);
  return m ? { nn: m[1], rules: m[2], structure: m[3] ?? "", skills: m[4] ?? "", tier: m[5] } : null;
}
