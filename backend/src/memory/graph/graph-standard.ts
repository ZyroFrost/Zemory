// Taxonomy graph lấy TỪ CHÍNH BẢN CHUẨN của harness — 0 LLM, 0 front-matter.
//
// Bối cảnh (user chốt 2026-07-26): bài mẫu "Knowledge Graph Viewer" có node giàu
// (user_story · requirement · …) nhờ mỗi doc mang một khối front-matter. zemory KHÔNG
// cần đường đó: bản chuẩn đã tự khai vai trò rồi —
//   · `SLOT_ROLES` (68 slot)               → vai trò của từng thư mục
//   · `01_CONSTITUTION` §Điều khoản        → điều 1..N, đánh số sẵn
//   · `04_SKILLS`                          → tự khai "mỗi `## <tên>` là MỘT skill"
//   · `docs/plan/NN_tên.md`                → spec đánh số
//   · `03_STRUCTURE §4` bảng routing       → concern → slot
// Tất cả parse TẤT ĐỊNH ⇒ mọi cạnh ở đây là hạng KHAI BÁO (HP điều 13), rebuild được,
// vứt đi dựng lại lúc nào cũng ra y hệt (điều 3).
//
// Ranh giới: cái bản chuẩn KHÔNG nói là TRẠNG THÁI NGHIỆP VỤ của nội dung (status:draft,
// priority:P0, persona…). Chuẩn nói "file này thuộc slot pages", không nói "story này đang
// draft". Muốn lớp đó thì mới cần front-matter — cố ý CHƯA làm, và nếu làm phải OPT-IN
// (bắt buộc mọi project = cố định NỘI DUNG docs = trái điều 3).

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { harnessPathsAt, readMarker } from "../../core/config.js";
import { constitutionArticles } from "../../docs/validate.js";
import { isFolderHarness, isRetired, leafOf, listParts, listStructures, mainOf, mainPath, structureSlots, withStoreReadCache, type Part } from "../../docs/store.js";
import { implementsOf, linksOf } from "../../docs/law-links.js";
import { hooksOf } from "../../docs/rule-core.js";
import { LEDGER, SHELF } from "../../docs/harness-names.js";
import { findRegionRepo as findRegionRepoOnDisk, regionBase, regionRepos, repoRole } from "../../docs/region-links.js";
import { slotDictFor } from "./graph.js";

/** Từ điển slot §3 — thước duy nhất để phân biệt SLOT với TẦNG.
 *  Tính THEO REPO (`slotDictFor`), không phải bảng cứng: repo non-app khai slot riêng ở chính §3
 *  của nó, và điều 13 đòi graph nói cùng chuyện với cây thư mục (xem `plan/13 §4b`). */

// `slot` = slot chuẩn CÓ file thật trong repo · `slot_unused` = chuẩn có khai nhưng project
// này chưa dùng. Tách 2 loại vì chuẩn nói rõ "INDEX = TỪ ĐIỂN TÊN, KHÔNG phải checklist phải
// tạo — app điển hình chỉ 4–10 slot hiện diện": gộp chung sẽ trông như repo thiếu 48 folder.
// Folder harness (plan/28 · plan/29): `rule` · `cons` · `structure` are parts, `set` is the kit the marker names, `gate` is an
// enforcement mechanism shared by many parts (guard · read-first · prompt · conform · test:…), `hook` is one hook file.
export type StdNodeType =
  | "harness_doc" | "plan_spec" | "hp_dieu" | "skill" | "slot" | "slot_unused" | "layer" | "concern"
  | "rule" | "cons" | "structure" | "set" | "gate" | "hook";

export interface StdNode {
  id: string;
  label: string;
  type: StdNodeType;
  /** thư mục ảo, để layout "theo folder" xếp nhóm được */
  dir: string;
  /** vị trí khai báo, cho người truy ngược về nguồn */
  src?: string;
}

export interface StdEdge {
  from: string;
  to: string;
  /** contains · routing = concern → slot (03 §4 table) · references = a doc names an article.
   *  Folder harness: assembled = set → part with a `from:` line · gate = part → hook/gate, hook → guard · implements =
   *  skill → law · declares / related = a law's `## Links` · checked = a part's `checked:` header. */
  kind: "contains" | "routing" | "references" | "assembled" | "gate" | "implements" | "declares" | "related" | "checked";
}

export interface StandardGraph {
  nodes: StdNode[];
  edges: StdEdge[];
  stats: {
    hpDieu: number; skills: number; plans: number; slots: number; slotsUnused: number; concerns: number;
    rules: number; cons: number; gates: number; hooks: number;
  };
}

const AGENT_DOCS = [
  "01_CONSTITUTION.md",
  "02_RULES.md",
  "03_STRUCTURE.md",
  "04_SKILLS.md",
  "05_TODO.md",
  "06_CHANGES.md",
];

function read(root: string, rel: string): string | null {
  try {
    return readFileSync(join(root, rel), "utf8");
  } catch {
    return null; // fail-open (điều 9): thiếu file nào thì bỏ phần đó, graph vẫn dựng
  }
}

function listPlans(planDir: string): string[] {
  try {
    return readdirSync(planDir)
      .filter((f) => /^\d{2}_.+\.md$/.test(f))
      .sort();
  } catch {
    return [];
  }
}

/** Cắt tiêu đề dài cho nhãn node (graph không đọc được nhãn 200 ký tự). */
function short(s: string, n = 52): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

/**
 * Lấy thân của MỘT section `## …` (từ heading tới heading `##` kế tiếp).
 * Bẫy đã dính: `txt.slice(at).split(/^##\s+/m)[0]` trả về CHUỖI RỖNG, vì chuỗi bắt đầu
 * ngay bằng chính dấu phân tách ⇒ phần tử [0] luôn rỗng (hp_dieu + concern ra 0).
 */
function sectionBody(txt: string, headingRe: RegExp): string | null {
  const at = txt.search(headingRe);
  if (at < 0) return null;
  const rest = txt.slice(at);
  const next = rest.slice(1).search(/^##\s+/m);
  return next >= 0 ? rest.slice(0, next + 1) : rest;
}

/** id ổn định, đọc được, từ một tiêu đề tiếng Việt. */
function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

/**
 * Dựng lớp node/cạnh "chuẩn" cho một project.
 * @param files node file của code-graph (để nối slot → file bằng cạnh `contains`)
 */
export function buildStandardGraph(root: string, files: { id: string; slot?: string }[]): StandardGraph {
  const nodes: StdNode[] = [];
  const edges: StdEdge[] = [];
  const has = new Set<string>();
  const slotDict = slotDictFor(root); // bảng chuẩn ∪ slot repo tự khai ở §3 (plan/13 §4b)
  const present = new Set(files.map((f) => f.slot).filter((s): s is string => !!s));
  const slotType = (s: string): StdNodeType => (present.has(s) ? "slot" : "slot_unused");
  const add = (n: StdNode): void => {
    if (has.has(n.id)) return;
    has.add(n.id);
    nodes.push(n);
  };

  // ADAPT v2 · N2 — nhà của harness lấy từ MARKER, phân giải MỘT lần ở đây.
  //
  // Trước đó `docs/agent` · `docs/plan` là literal ở 19 chỗ trong chính file này, nên với
  // repo đặt harness chỗ khác thì cả tầng chuẩn biến mất KHÔNG một tiếng động: đo trên repo
  // tham chiếu (harness ở `harness/agent`, hiến pháp có nội dung thật) — `conform` in
  // "điều 0", kéo theo cạnh `references` và phép kiểm "điều nào không ai trích dẫn" thành
  // vô nghĩa. Cổng vẫn XANH, nên không ai biết mình đang mất gì; đó mới là kiểu hỏng đắt.
  const hp = harnessPathsAt(root);
  const rel = (abs: string): string => relative(root, abs).replace(/\\/g, "/");
  const AGENT = rel(hp.agent);
  const PLAN = rel(hp.plan);
  const SKILLS = rel(hp.skills);

  // A folder harness has none of the single files below: its parts are read by addFolderParts.
  const folder = isFolderHarness(hp.agent);
  if (folder) addFolderParts(root, hp.agent, rel, add, edges, slotType);

  // harness docs (01..06 + AGENTS.md): the entry to everything below
  for (const f of folder ? [] : AGENT_DOCS) {
    if (read(root, join(AGENT,f)) === null) continue;
    add({ id: `doc:agent/${f}`, label: f.replace(/\.md$/, ""), type: "harness_doc", dir: AGENT, src: `${AGENT}/${f}` });
  }
  if (read(root, "AGENTS.md") !== null) add({ id: "doc:AGENTS.md", label: "AGENTS.md", type: "harness_doc", dir: ".", src: "AGENTS.md" });

  // ── hp_dieu: CHỈ danh sách đánh số nằm SAU "## Điều khoản".
  //    Bẫy: §Mục đích phía trên cũng có list "1. … 2. …" — quét cả file sẽ đẻ điều giả.
  const consti = folder ? null : read(root, join(AGENT,"01_CONSTITUTION.md"));
  if (consti) {
    const body = sectionBody(consti, /^##\s*Điều khoản/m);
    if (body) {
      // Same parser as validate / the no-gate block (its own `N. **…**` regex missed emoji-marked and wrapped articles).
      for (const a of constitutionArticles(body)) {
        const id = `hp:${a.n}`;
        add({ id, label: `Điều ${a.n} — ${short(a.title, 44)}`, type: "hp_dieu", dir: AGENT, src: `${AGENT}/01_CONSTITUTION.md` });
        edges.push({ from: "doc:agent/01_CONSTITUTION.md", to: id, kind: "contains" });
      }
    }
  }

  // ── skill: HAI hình dạng, vì Phase 3 (2026-07-31) dời playbook ra file riêng.
  //    · MỚI  — mỗi skill là `.claude/skills/<tên>/SKILL.md`. Đếm THƯ MỤC THẬT, không
  //      đếm heading của `04_SKILLS`: file đó giờ là sổ đăng ký, heading của nó là
  //      "Luật dùng skill"/"Danh mục"/"Thêm một skill" — đếm heading ra 4 "skill" không
  //      tồn tại, tức con số trong `conform` nói sai về chính thứ nó đang chấm.
  //    · CŨ   — playbook inline: dùng dòng tự khai ("Skill inline hiện có: `a` · `b`")
  //      nên không phải đoán heading nào là skill, heading nào là luật.
  const skillsDir = hp.skills;
  const skillDirs = !folder && existsSync(skillsDir)
    ? readdirSync(skillsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && existsSync(join(skillsDir, e.name, "SKILL.md")))
        .map((e) => e.name)
        .sort()
    : [];
  const skills = folder ? null : read(root, join(AGENT,"04_SKILLS.md"));
  if (skillDirs.length) {
    for (const name of skillDirs) {
      const id = `skill:${slug(name)}`;
      add({ id, label: name, type: "skill", dir: SKILLS, src: `${SKILLS}/${name}/SKILL.md` });
      if (skills) edges.push({ from: "doc:agent/04_SKILLS.md", to: id, kind: "contains" });
    }
  } else if (skills) {
    const roster = skills.match(/\*\*Skill inline hiện có:\*\*(.+)/);
    const declared = roster ? [...roster[1].matchAll(/`([^`]+)`/g)].map((x) => x[1].trim()) : [];
    for (const m of skills.matchAll(/^##\s+(.+?)\s*$/gm)) {
      const title = m[1].trim();
      // Khớp với roster nếu có; không có roster thì bỏ mục "LUẬT chung" (không phải skill).
      const isSkill = declared.length ? declared.some((d) => title.toLowerCase().startsWith(d.toLowerCase())) : !/LUẬT chung/i.test(title);
      if (!isSkill) continue;
      const id = `skill:${slug(title.split("(")[0])}`;
      add({ id, label: short(title, 40), type: "skill", dir: AGENT, src: `${AGENT}/04_SKILLS.md` });
      edges.push({ from: "doc:agent/04_SKILLS.md", to: id, kind: "contains" });
    }
  }

  // ── plan_spec: docs/plan/NN_tên.md (nhãn lấy H1 nếu có)
  for (const f of listPlans(hp.plan)) {
    const txt = read(root, join(PLAN, f)) ?? "";
    const h1 = txt.match(/^#\s+(.+)$/m);
    add({ id: `plan:${f}`, label: short(h1 ? h1[1] : f.replace(/\.md$/, ""), 46), type: "plan_spec", dir: PLAN, src: `${PLAN}/${f}` });
  }

  // ── references: doc/plan nhắc "điều N" → cạnh tới hp_dieu (khai báo, parse thuần)
  const refSources: { id: string; rel: string }[] = [
    ...AGENT_DOCS.map((f) => ({ id: `doc:agent/${f}`, rel: join(AGENT, f) })),
    ...listPlans(hp.plan).map((f) => ({ id: `plan:${f}`, rel: join(PLAN, f) })),
  ];
  for (const s of refSources) {
    if (!has.has(s.id)) continue;
    const txt = read(root, s.rel);
    if (!txt) continue;
    const seen = new Set<string>();
    for (const m of txt.matchAll(/điều\s+(\d{1,2})\b/gi)) {
      const to = `hp:${m[1]}`;
      if (!has.has(to) || seen.has(to)) continue;
      seen.add(to);
      if (s.id !== "doc:agent/01_CONSTITUTION.md") edges.push({ from: s.id, to, kind: "references" });
    }
  }

  // ── slot + routing: bảng "## 4. Routing" trong 03_STRUCTURE.
  //    Mỗi hàng `| concern | …`backend/src/api/`… |` ⇒ node concern + cạnh routing → slot.
  const struct = read(root, join(AGENT,"03_STRUCTURE.md"));
  // §4 định tuyến vào HAI thứ khác hạng, và phải phân biệt:
  //   · SLOT (§3) — vai trò BÊN TRONG một tầng: `backend/src/api/` → `api`. Có trong từ điển.
  //   · TẦNG / thư mục đã khai (§2, §3 dải ①②③) — `attic/` `data/` `external/` `frontend/`,
  //     hoặc thư mục con của tầng như `data/logs/` `data/secrets/`. KHÔNG có trong từ điển.
  // Bản trước lấy mù đoạn cuối đường dẫn nên gọi TẤT CẢ là "slot" ⇒ đẻ 13 node `slot:*` sai
  // hạng (`attic` `data` `dist` `external` `frontend` `logs` `secrets`…). Lộ ra khi thử thêm
  // một check conform "routing tới slot ngoài từ điển": nó báo oan đúng 13 mục đó, tức lỗi
  // nằm ở phép phân loại này chứ không phải ở repo. Trộn tầng với slot làm hỏng taxonomy —
  // và `slot_unused` bị thổi phồng bởi những cái chưa bao giờ là slot.
  const routeTarget = (path: string): { id: string; label: string; slot: string | null } | null => {
    const parts = path.split("/").filter(Boolean);
    // Đích có thể trỏ thẳng vào MỘT FILE (`config/servers.yaml`, `backend/src/store/queries.*`).
    // Vị trí thật là THƯ MỤC CHỨA nó — bỏ đoạn cuối nếu đó là tên file, nếu không sẽ đẻ ra
    // node "config/servers.yaml/" (một file gắn dấu / thành thư mục ma).
    if (parts.length > 1 && /\.[a-z0-9*]+$/i.test(parts[parts.length - 1])) parts.pop();
    const last = parts[parts.length - 1];
    if (!last) return null;
    // CHO PHÉP CHỮ SỐ: `i18n` là slot có thật trong từ điển, mà `[a-z_]+` lại loại nó ra ⇒
    // một slot thật bị xếp nhầm thành tầng (bắt được ngay lần đo đầu sau khi sửa).
    if (/^[a-z0-9_]+$/.test(last) && slotDict.has(last)) return { id: `slot:${last}`, label: last + "/", slot: last };
    // Không phải slot ⇒ là tầng/thư mục đã khai. Giữ NGUYÊN đường dẫn làm định danh để không
    // mất thông tin (`data/logs/` khác `data/secrets/`), bỏ phần placeholder `<...>`.
    const clean = parts.filter((p) => !p.includes("<")).join("/");
    if (!clean || !/^[a-z0-9_/.-]+$/i.test(clean)) return null;
    return { id: `layer:${clean}`, label: clean + "/", slot: null };
  };
  if (struct) {
    // Bám TÊN, không bám SỐ: Routing là §4 ở chuẩn APP nhưng §3 ở chuẩn NON-APP. Ghim số làm cả
    // lớp concern/routing biến mất với mọi repo non-app mà không một lỗi nào — đo 2026-09-16 trên
    // `Dept_IT`: concerns = 0 (Zemory: 67). Cùng lớp lỗi với `declaredSlots` (structure-tree.ts).
    const body = sectionBody(struct, /^##\s*\d+\.\s*Routing/mu);
    if (body) {
      let i = 0;
      for (const line of body.split("\n")) {
        const m = line.match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/);
        if (!m) continue;
        const concern = m[1].replace(/\*\*/g, "").trim();
        if (!concern || /^-+$/.test(concern) || /Có gì|cần làm/i.test(concern)) continue; // header/separator
        const targets = [...m[2].matchAll(/`([^`]+)`/g)].map((x) => x[1]).filter((x) => x.includes("/"));
        const seenT = new Set<string>();
        const dests = targets
          .map(routeTarget)
          .filter((x): x is { id: string; label: string; slot: string | null } => !!x)
          .filter((x) => (seenT.has(x.id) ? false : (seenT.add(x.id), true)));
        if (!dests.length) continue;
        const cid = `concern:${i++}`;
        add({ id: cid, label: short(concern, 46), type: "concern", dir: AGENT, src: `${AGENT}/03_STRUCTURE.md §4` });
        for (const d of dests) {
          add({
            id: d.id,
            label: d.label,
            type: d.slot ? slotType(d.slot) : "layer",
            dir: d.slot ? "slot" : "layer",
            src: `${AGENT}/03_STRUCTURE.md §4`,
          });
          edges.push({ from: cid, to: d.id, kind: "routing" });
        }
      }
    }
  }

  // ── contains: slot → file thật đang nằm trong slot đó (nối lớp chuẩn vào code-graph)
  for (const f of files) {
    if (!f.slot) continue;
    const sid = `slot:${f.slot}`;
    if (!has.has(sid)) add({ id: sid, label: f.slot + "/", type: "slot", dir: "slot", src: `${AGENT}/03_STRUCTURE.md §3` });
    edges.push({ from: sid, to: f.id, kind: "contains" });
  }

  const count = (t: StdNodeType): number => nodes.filter((n) => n.type === t).length;
  return {
    nodes,
    edges,
    stats: {
      hpDieu: count("hp_dieu"),
      skills: count("skill"),
      plans: count("plan_spec"),
      slots: count("slot"),
      slotsUnused: count("slot_unused"),
      concerns: count("concern"),
      rules: count("rule"),
      cons: count("cons"),
      gates: count("gate"),
      hooks: count("hook"),
    },
  };
}

export interface WorkspaceGraph {
  /** The folder the workspace is read from (regionBase); empty when the repo belongs to no workspace. */
  base: string;
  nodes: Array<{ id: string; label: string; type: string; dir: string; root: string }>;
  edges: Array<{ from: string; to: string; kind: "owner" | "uses"; label?: string }>;
}

/**
 * Level 1 of the four-level graph (plan/13 §0c): the repos of the workspace `root` sits in, each typed by the role of its
 * template, tied by what the markers declare — `owner` (the manager → the repo it manages) and `uses.<kind>` (the repo → the
 * provider). Read with the same functions conform's region check uses; a name that resolves to no repo draws no edge.
 */
export function buildWorkspaceGraph(root: string): WorkspaceGraph {
  // one read of HS for the whole graph (sets, structures): each repo's role used to read it again
  return withStoreReadCache(() => buildWorkspaceGraphOnce(root));
}

function buildWorkspaceGraphOnce(root: string): WorkspaceGraph {
  const repos = regionRepos(root);
  if (repos.length < 2) return { base: "", nodes: [], edges: [] };
  const base = regionBase(root);
  const id = (abs: string): string => `repo:${basename(abs)}`;
  const nodes = repos.map((abs) => ({
    id: id(abs),
    label: basename(abs),
    type: repoRole(abs)?.name ?? "no-set",
    dir: relative(base, dirname(abs)).replace(/\\/g, "/") || ".",
    root: abs,
  }));
  // sibling folders with no set are not a workspace (a personal folder of loose repos)
  if (!nodes.some((n) => n.type !== "no-set")) return { base: "", nodes: [], edges: [] };
  const edges: WorkspaceGraph["edges"] = [];
  // a named repo is looked up among the region's repos already found; only a name not among them walks the tree again
  // (a walk per owner/uses link through a Docker drive mount made one graph take 588 s, measured 2026-10-23)
  const byName = new Map(repos.map((abs) => [basename(abs), abs]));
  const findRegionRepo = (name: string, from: string): string | null => byName.get(name) ?? findRegionRepoOnDisk(name, from);
  for (const abs of repos) {
    const m = readMarker(abs)?.data ?? {};
    if (typeof m.owner === "string" && m.owner) {
      const at = findRegionRepo(m.owner, abs);
      if (at) edges.push({ from: id(at), to: id(abs), kind: "owner" });
    }
    const uses = (m.uses && typeof m.uses === "object" ? m.uses : {}) as Record<string, unknown>;
    for (const [kind, target] of Object.entries(uses)) {
      const at = typeof target === "string" && target ? findRegionRepo(target, abs) : null;
      if (at) edges.push({ from: id(abs), to: id(at), kind: "uses", label: kind });
    }
  }
  return { base, nodes, edges };
}

type GateJson = { hook?: string | string[]; gate?: unknown; prompt?: unknown; read?: unknown; conform?: unknown };

function gateJson(dir: string): GateJson | null {
  try {
    return JSON.parse(readFileSync(join(dir, "gate.json"), "utf8")) as GateJson;
  } catch {
    return null; // absent or unreadable: conform reports an unreadable one, the graph just has no gate edge
  }
}

/**
 * The parts of a folder harness as nodes, and the declared ties between them: the set that assembled each part (`from:`),
 * structure → slot, part → gate/hook (`gate.json`), skill → law (`## Implements` and a law's `Implements:` line, one edge),
 * a law's `Repo declares` / `Related` links, and a part's `checked:` list. Every tie is parsed from the files, never guessed.
 * Slot nodes keep the `slot:<name>` id the file layer uses, so `slot → file` edges are added by the caller's loop.
 */
function addFolderParts(
  root: string,
  agentDir: string,
  rel: (abs: string) => string,
  add: (n: StdNode) => void,
  edges: StdEdge[],
  slotType: (s: string) => StdNodeType,
): void {
  const seenEdge = new Set<string>();
  const edge = (from: string, to: string, kind: StdEdge["kind"]): void => {
    const k = `${from}\0${to}\0${kind}`;
    if (from === to || seenEdge.has(k)) return;
    seenEdge.add(k);
    edges.push({ from, to, kind });
  };

  const kit = readMarker(root)?.data.kit;
  const setId = typeof kit === "string" && kit ? `set:${kit}` : null;
  if (setId) add({ id: setId, label: String(kit), type: "set", dir: ".", src: "docs/.harness.json" });

  const byLeaf = new Map<string, string>();
  const placed: Array<{ p: Part; id: string }> = [];
  const put = (p: Part, id: string, label: string, type: StdNodeType): void => {
    add({ id, label, type, dir: rel(dirname(p.dir)), src: rel(mainPath(p.dir, mainOf(p))) });
    byLeaf.set(leafOf(p.folder), id);
    placed.push({ p, id });
    if (setId && p.from) edge(setId, id, "assembled");
  };

  for (const p of listParts(agentDir, SHELF.rules)) if (!isRetired(p)) put(p, `rule:${p.key}`, leafOf(p.folder), "rule");
  for (const p of listParts(agentDir, SHELF.constitution)) if (!isRetired(p)) put(p, `cons:${p.key}`, leafOf(p.folder), "cons");
  // a frame (Skill_Frame_Own) is the shape a repo's own skill is written in, not a skill: the host builds nothing from it
  for (const p of listParts(agentDir, SHELF.skills)) {
    if (String(p.meta.frame ?? "") !== "true") put(p, `skill:${leafOf(p.folder)}`, leafOf(p.folder), "skill");
  }
  const slots = listParts(agentDir, SHELF.structure).filter((p) => p.meta.kind !== "guide");
  for (const p of slots) put(p, `slot:${p.name}`, String(p.meta.path || `${p.name}/`), slotType(p.name));
  for (const s of listStructures(agentDir)) {
    const id = `structure:${leafOf(s.folder)}`;
    put(s, id, leafOf(s.folder), "structure");
    for (const slot of structureSlots(s, slots).slots) edge(id, `slot:${slot.name}`, "contains");
  }

  for (const { p, id } of placed) {
    const g = gateJson(p.dir);
    if (g) {
      const mech = (mark: string): void => {
        add({ id: `gate:${mark}`, label: mark, type: "gate", dir: "gate", src: "gate.json" });
        edge(id, `gate:${mark}`, "gate");
      };
      for (const h of hooksOf(g)) {
        const file = rel(join(p.dir, h));
        add({ id: `hook:${file}`, label: basename(h), type: "hook", dir: rel(p.dir), src: file });
        edge(id, `hook:${file}`, "gate");
        // a part's hook file is called by the guard
        add({ id: "gate:guard", label: "guard", type: "gate", dir: "gate", src: "gate.json" });
        edge(`hook:${file}`, "gate:guard", "gate");
      }
      if (typeof g.gate === "string" && g.gate) mech(g.gate);
      if (g.prompt) mech("prompt");
      if (g.read) mech("read-first");
      if (g.conform) mech("conform");
    }
    const text = read(root, relative(root, mainPath(p.dir, mainOf(p)))) ?? "";
    if (p.shelf === SHELF.skills) {
      for (const law of implementsOf(text)) {
        const to = byLeaf.get(law);
        if (to) edge(id, to, "implements");
      }
    } else {
      for (const l of linksOf(text)) {
        const other = byLeaf.get(l.name);
        if (!other) continue;
        // one direction for one tie: implements always runs skill → law, whichever side wrote it
        if (l.kind === "implements") edge(other, id, "implements");
        else edge(id, other, l.kind);
      }
    }
    const checked = p.meta.checked;
    for (const name of Array.isArray(checked) ? checked : typeof checked === "string" && checked ? [checked] : []) {
      const to = byLeaf.get(name);
      if (to) edge(id, to, "checked");
    }
  }

  for (const f of [LEDGER.todo, LEDGER.changes]) {
    const abs = join(agentDir, f);
    if (existsSync(abs)) add({ id: `doc:${rel(abs)}`, label: f.replace(/\.md$/, ""), type: "harness_doc", dir: rel(agentDir), src: rel(abs) });
  }
}
