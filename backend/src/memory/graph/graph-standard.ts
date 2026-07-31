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
import { join } from "node:path";
import { SLOT_ROLES } from "../../docs/structure-tree.js";

/** Từ điển slot §3 — thước duy nhất để phân biệt SLOT với TẦNG. */
const slotNames = new Set(Object.keys(SLOT_ROLES));

// `slot` = slot chuẩn CÓ file thật trong repo · `slot_unused` = chuẩn có khai nhưng project
// này chưa dùng. Tách 2 loại vì chuẩn nói rõ "INDEX = TỪ ĐIỂN TÊN, KHÔNG phải checklist phải
// tạo — app điển hình chỉ 4–10 slot hiện diện": gộp chung sẽ trông như repo thiếu 48 folder.
export type StdNodeType = "harness_doc" | "plan_spec" | "hp_dieu" | "skill" | "slot" | "slot_unused" | "layer" | "concern";

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
  /** contains = chứa · routing = concern→slot (bảng 03 §4) · references = nhắc tới */
  kind: "contains" | "routing" | "references";
}

export interface StandardGraph {
  nodes: StdNode[];
  edges: StdEdge[];
  stats: { hpDieu: number; skills: number; plans: number; slots: number; slotsUnused: number; concerns: number };
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

function listPlans(root: string): string[] {
  try {
    return readdirSync(join(root, "docs", "plan"))
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
  const present = new Set(files.map((f) => f.slot).filter((s): s is string => !!s));
  const slotType = (s: string): StdNodeType => (present.has(s) ? "slot" : "slot_unused");
  const add = (n: StdNode): void => {
    if (has.has(n.id)) return;
    has.add(n.id);
    nodes.push(n);
  };

  // ── harness docs (01..06 + AGENTS.md) — cửa vào của mọi thứ bên dưới
  for (const f of AGENT_DOCS) {
    if (read(root, join("docs", "agent", f)) === null) continue;
    add({ id: `doc:agent/${f}`, label: f.replace(/\.md$/, ""), type: "harness_doc", dir: "docs/agent", src: `docs/agent/${f}` });
  }
  if (read(root, "AGENTS.md") !== null) add({ id: "doc:AGENTS.md", label: "AGENTS.md", type: "harness_doc", dir: ".", src: "AGENTS.md" });

  // ── hp_dieu: CHỈ danh sách đánh số nằm SAU "## Điều khoản".
  //    Bẫy: §Mục đích phía trên cũng có list "1. … 2. …" — quét cả file sẽ đẻ điều giả.
  const consti = read(root, join("docs", "agent", "01_CONSTITUTION.md"));
  if (consti) {
    const body = sectionBody(consti, /^##\s*Điều khoản/m);
    if (body) {
      for (const m of body.matchAll(/^(\d+)\.\s+\*\*(.+?)\*\*/gm)) {
        const id = `hp:${m[1]}`;
        add({ id, label: `Điều ${m[1]} — ${short(m[2], 44)}`, type: "hp_dieu", dir: "docs/agent", src: "docs/agent/01_CONSTITUTION.md" });
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
  const skillsDir = join(root, ".claude", "skills");
  const skillDirs = existsSync(skillsDir)
    ? readdirSync(skillsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && existsSync(join(skillsDir, e.name, "SKILL.md")))
        .map((e) => e.name)
        .sort()
    : [];
  const skills = read(root, join("docs", "agent", "04_SKILLS.md"));
  if (skillDirs.length) {
    for (const name of skillDirs) {
      const id = `skill:${slug(name)}`;
      add({ id, label: name, type: "skill", dir: ".claude/skills", src: `.claude/skills/${name}/SKILL.md` });
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
      add({ id, label: short(title, 40), type: "skill", dir: "docs/agent", src: "docs/agent/04_SKILLS.md" });
      edges.push({ from: "doc:agent/04_SKILLS.md", to: id, kind: "contains" });
    }
  }

  // ── plan_spec: docs/plan/NN_tên.md (nhãn lấy H1 nếu có)
  for (const f of listPlans(root)) {
    const txt = read(root, join("docs", "plan", f)) ?? "";
    const h1 = txt.match(/^#\s+(.+)$/m);
    add({ id: `plan:${f}`, label: short(h1 ? h1[1] : f.replace(/\.md$/, ""), 46), type: "plan_spec", dir: "docs/plan", src: `docs/plan/${f}` });
  }

  // ── references: doc/plan nhắc "điều N" → cạnh tới hp_dieu (khai báo, parse thuần)
  const refSources: { id: string; rel: string }[] = [
    ...AGENT_DOCS.map((f) => ({ id: `doc:agent/${f}`, rel: join("docs", "agent", f) })),
    ...listPlans(root).map((f) => ({ id: `plan:${f}`, rel: join("docs", "plan", f) })),
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
  const struct = read(root, join("docs", "agent", "03_STRUCTURE.md"));
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
    if (/^[a-z0-9_]+$/.test(last) && slotNames.has(last)) return { id: `slot:${last}`, label: last + "/", slot: last };
    // Không phải slot ⇒ là tầng/thư mục đã khai. Giữ NGUYÊN đường dẫn làm định danh để không
    // mất thông tin (`data/logs/` khác `data/secrets/`), bỏ phần placeholder `<...>`.
    const clean = parts.filter((p) => !p.includes("<")).join("/");
    if (!clean || !/^[a-z0-9_/.-]+$/i.test(clean)) return null;
    return { id: `layer:${clean}`, label: clean + "/", slot: null };
  };
  if (struct) {
    const body = sectionBody(struct, /^##\s*4\.\s*Routing/m);
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
        add({ id: cid, label: short(concern, 46), type: "concern", dir: "docs/agent", src: "docs/agent/03_STRUCTURE.md §4" });
        for (const d of dests) {
          add({
            id: d.id,
            label: d.label,
            type: d.slot ? slotType(d.slot) : "layer",
            dir: d.slot ? "slot" : "layer",
            src: "docs/agent/03_STRUCTURE.md §4",
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
    if (!has.has(sid)) add({ id: sid, label: f.slot + "/", type: "slot", dir: "slot", src: "docs/agent/03_STRUCTURE.md §3" });
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
    },
  };
}
