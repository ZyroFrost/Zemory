// `zemory conform` — CHẤM ĐỘ BÁM CHUẨN: so *chuẩn đã KHAI* với *thực tế trong repo*,
// ra một BẢNG LỆCH NGẮN. Tất định, 0 token, 0 LLM.
//
// Vì sao tồn tại (user chốt 2026-07-26): agent luôn ở trong vòng (dựng repo mới, bảo trì)
// — luật là GIẢM GÁNH cho agent, KHÔNG loại trừ nó. Nhưng đo thật: nạp cả graph vào ngữ
// cảnh tốn **~56.000 token**, chỉ rẻ hơn đọc cả repo 4,8× ⇒ cho agent "đọc graph để kiểm"
// là đốt quota. Nên MÁY chấm trước (miễn phí), agent chỉ đọc bảng lệch (~vài trăm token)
// rồi phán phần ngữ nghĩa mà máy không hiểu được.
//
// Ranh giới với `validate`: `validate` hỏi "bộ docs harness có đúng khuôn không"
// (link gãy · độ dài changelog · tầng folder). `conform` hỏi "CODE + DOCS có bám chuẩn
// đã khai không". Hai việc khác nhau ⇒ hai lệnh (02_RULES: mỗi thứ làm đúng một việc).
//
// KHÔNG báo cái vốn ĐÚNG CHUẨN: slot khai mà repo không dùng là BÌNH THƯỜNG — chuẩn nói rõ
// "INDEX = từ điển tên, KHÔNG phải checklist phải tạo; app điển hình chỉ 4–10 slot hiện
// diện". Báo nó thành lỗi là hiểu ngược chuẩn.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildCodeGraph } from "../memory/graph/graph.js";
import { buildStandardGraph } from "../memory/graph/graph-standard.js";
import { SLOT_ROLES } from "./structure-tree.js";

export interface ConformItem {
  /** mã kiểm, ổn định để CI bám */
  check: string;
  /** `blocking` = lệch chuẩn thật, gate đỏ · `advisory` = đáng xem, không chặn */
  level: "blocking" | "advisory";
  title: string;
  /** vài ví dụ đại diện — CỐ Ý không in hết, bảng phải NGẮN mới rẻ token */
  samples: string[];
  count: number;
  /** sửa ở đâu — agent đọc là biết đường, khỏi đoán */
  fix: string;
}

export interface ConformReport {
  root: string;
  items: ConformItem[];
  stats: { files: number; slotsUsed: number; slotsDeclared: number; hpDieu: number; skills: number };
  ok: boolean;
}

const SAMPLE_CAP = 6;

function read(root: string, rel: string): string | null {
  try {
    return readFileSync(join(root, rel), "utf8");
  } catch {
    return null;
  }
}

/** Chấm độ bám chuẩn của một project. Thuần đọc — không sửa gì. */
export function conform(root: string): ConformReport {
  const g = buildCodeGraph(root);
  const std = buildStandardGraph(
    root,
    g.nodes.map((n) => ({ id: n.id, slot: n.slot })),
  );
  const slotNames = new Set(Object.keys(SLOT_ROLES));
  const items: ConformItem[] = [];
  const push = (
    check: string,
    level: ConformItem["level"],
    title: string,
    all: string[],
    fix: string,
  ): void => {
    if (!all.length) return;
    items.push({ check, level, title, samples: all.slice(0, SAMPLE_CAP), count: all.length, fix });
  };

  // ① File nằm trong thư mục KHÔNG khớp slot nào của từ điển ⇒ lệch chuẩn thật.
  //    BỐN MIỄN TRỪ — đều là thứ CHUẨN CHO PHÉP, báo lên là báo oan (đã lộ ra khi chạy thử
  //    trên 3 repo khác; checker kêu oan thì lần sau không ai đọc nữa):
  //    · gốc repo — "Tool ép root: MỌI config tool đọc từ root = ĐỂ YÊN" (03 §5)
  //    · `backend` · `frontend` · `docs` — là 4 VAI TRÒ bắt buộc, không phải slot
  //    · `NN_<tên>` — thư mục đánh số của hệ non-app (`tasks/NN_` · `pipelines/NN_` · `data/NN_`)
  //      là convention ĐÃ KHAI, không phải lệch
  //    · `docs_template/**` — TEMPLATE là hàng ship đi, không phải code sống của repo này;
  //      ruột nó theo CHUẨN CỦA PROJECT ĐÍCH (bộ Cowork mang cả script tự kiểm `.py` là
  //      thiết kế có chủ đích, 2026-07-29). Soi ruột template bằng thước của repo CHỨA nó
  //      là lấy nhầm thước.
  const exempt = (dir: string): boolean => {
    if (!dir) return true;
    if (dir === "docs_template" || dir.startsWith("docs_template/")) return true;
    const seg = dir.split("/");
    const last = seg[seg.length - 1];
    return seg.length === 1 && ["backend", "frontend", "docs"].includes(last) ? true : /^\d{2}_/.test(last);
  };
  const offDirs = [...new Set(g.nodes.filter((n) => !n.slot && n.dir && !exempt(n.dir)).map((n) => n.dir))].sort();
  push(
    "off-standard-dir",
    "blocking",
    "Thư mục chứa code nhưng KHÔNG khớp slot chuẩn nào",
    offDirs,
    "đổi tên về đúng slot (03_STRUCTURE §3) HOẶC thêm slot vào chuẩn nếu là concern thật",
  );

  // ② Harness thiếu file bắt buộc.
  const need = [
    "AGENTS.md",
    "docs/agent/01_CONSTITUTION.md",
    "docs/agent/02_RULES.md",
    "docs/agent/03_STRUCTURE.md",
    "docs/agent/04_SKILLS.md",
    "docs/agent/05_TODO.md",
    "docs/agent/06_CHANGES.md",
    "docs/plan/00_overview.md",
  ];
  push(
    "harness-missing",
    "blocking",
    "Thiếu file harness bắt buộc",
    need.filter((f) => !existsSync(join(root, f))),
    "chạy `zemory sync` để gap-fill từ template (không ghi đè file đã có)",
  );

  // ③ Điều hiến pháp KHÔNG được doc nào trích dẫn ⇒ luật có nguy cơ chết/bị quên.
  //    Advisory: có điều đúng là nền tảng, không cần ai nhắc.
  const cited = new Set(std.edges.filter((e) => e.kind === "references").map((e) => e.to));
  const uncited = std.nodes
    .filter((n) => n.type === "hp_dieu" && !cited.has(n.id))
    .map((n) => n.label);
  push(
    "hp-uncited",
    "advisory",
    "Điều hiến pháp không doc nào trích dẫn",
    uncited,
    "nếu điều còn hiệu lực: dẫn chiếu từ plan/rules liên quan; nếu đã lỗi thời: đề xuất user sửa hiến pháp",
  );

  // ④ Roster skill (dòng tự khai trong 04_SKILLS) lệch với các section `##` thật.
  const sk = read(root, join("docs", "agent", "04_SKILLS.md"));
  if (sk) {
    const roster = sk.match(/\*\*Skill inline hiện có:\*\*(.+)/);
    if (roster) {
      const declared = [...roster[1].matchAll(/`([^`]+)`/g)].map((x) => x[1].trim());
      const heads = [...sk.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1].trim());
      const missing = declared.filter(
        (d) => !heads.some((h) => h.toLowerCase().startsWith(d.toLowerCase())),
      );
      push(
        "skill-roster-drift",
        "blocking",
        "Skill khai trong roster nhưng KHÔNG có section `##`",
        missing,
        "thêm section cho skill, hoặc bỏ tên khỏi dòng “Skill inline hiện có”",
      );
    }
  }

  // ⑤ Thư mục slot TỒN TẠI trên đĩa nhưng KHÔNG chứa file nguồn nào ⇒ vi phạm luật
  //    "KHÔNG tạo folder rỗng" (03 §5).
  //    CỐ Ý KHÔNG báo "slot chuẩn khai mà repo không dùng": đó là TRẠNG THÁI ĐÚNG —
  //    chuẩn nói "INDEX = từ điển tên, KHÔNG phải checklist phải tạo; app điển hình chỉ
  //    4–10 slot hiện diện". Bản đầu tôi báo 48 mục như vậy: đúng kiểu nhiễu làm người
  //    đọc mất tin vào báo cáo, và tự mâu thuẫn với chính ghi chú đầu file này.
  //    "Rỗng" = KHÔNG có file nào (mọi loại), không phải "không có file source": `docs/`,
  //    `docs_template/app/agent/`, `backend/resources/` đầy `.md`/resource — báo chúng là
  //    rỗng thì sai hẳn (bản đầu dính đúng lỗi này vì đo bằng node của code-graph).
  const hasAnyFile = (rel: string, depth = 0): boolean => {
    if (depth > 4) return true; // quá sâu thì coi như có, thà bỏ sót còn hơn báo oan
    let ents;
    try {
      ents = readdirSync(join(root, rel), { withFileTypes: true });
    } catch {
      return true;
    }
    for (const e of ents) {
      if (e.isFile()) return true;
      if (e.isDirectory() && hasAnyFile(rel ? `${rel}/${e.name}` : e.name, depth + 1)) return true;
    }
    return false;
  };
  const emptyDirs: string[] = [];
  const walk = (rel: string, depth: number): void => {
    if (depth > 4) return;
    let ents;
    try {
      ents = readdirSync(join(root, rel), { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      if (!e.isDirectory()) continue;
      if (/^(node_modules|dist|build|coverage|\.|data|attic|external)/.test(e.name)) continue;
      const sub = rel ? `${rel}/${e.name}` : e.name;
      if (slotNames.has(e.name) && !hasAnyFile(sub)) emptyDirs.push(sub + "/");
      else walk(sub, depth + 1);
    }
  };
  walk("", 0);
  push(
    "empty-slot-dir",
    "advisory",
    "Thư mục slot tồn tại nhưng không có file nguồn nào (chuẩn: KHÔNG tạo folder rỗng)",
    emptyDirs.sort(),
    "xoá folder rỗng, hoặc đưa file thật vào — slot chỉ tạo KHI CÓ concern",
  );

  // ⑥ THAM CHIẾU TREO — docs trỏ tới thứ KHÔNG TỒN TẠI. Bộ dò mâu thuẫn của zemory,
  //    tất định 100%: chỉ là phép trừ tập hợp, không suy đoán, không LLM (điều 6).
  //    Cách làm phổ biến ngoài kia là hỏi model xem hai phát biểu có chọi nhau không;
  //    ở đây nguồn vào ĐÃ CÓ CẤU TRÚC (chuẩn đã khai) nên so định danh là đủ và chắc.
  //
  //    ĐỌC THẲNG TỪ .md, KHÔNG đi qua cạnh của graph-standard: graph-standard `continue`
  //    bỏ qua mọi tham chiếu không resolve được TRƯỚC khi tạo cạnh, nên soi cạnh thì
  //    vĩnh viễn ra 0 — một check không bao giờ nổ được còn tệ hơn không có, vì nó
  //    phát ra lời bảo đảm "không mâu thuẫn" trong khi chưa hề nhìn. (Bản đầu tôi viết
  //    đúng kiểu đó; bắt được khi hỏi "cái gì làm nó đỏ?" mà không trả lời nổi.)
  //
  //    Vì sao chặn (blocking): agent duyệt graph gặp ngõ cụt thường TỰ BỊA ra đích đến
  //    thay vì báo thiếu — hỏng lặng lẽ, đắt hơn nhiều so với việc sửa một link.
  const dangling: string[] = [];
  //    Liệt kê .md tại chỗ thay vì mượn helper của graph-standard: chúng là hàm nội
  //    bộ ở đó, và conform không nên buộc graph-standard mở rộng bề mặt công khai.
  const listMd = (sub: string): string[] => {
    try {
      return readdirSync(join(root, sub)).filter((f) => f.endsWith(".md")).sort().map((f) => join(sub, f));
    } catch {
      return [];
    }
  };
  const mdFiles: string[] = [...listMd(join("docs", "agent")), ...listMd(join("docs", "plan"))];
  //   (a) `điều N` trỏ tới số điều không có trong 01_CONSTITUTION. Đây đúng là kiểu
  //       hỏng mà việc ĐÁNH SỐ LẠI hiến pháp từng gây ra ở chính repo này.
  const dieuNums = new Set<string>();
  const consti = read(root, join("docs", "agent", "01_CONSTITUTION.md"));
  if (consti) {
    // CHỈ quét từ mục "Điều khoản" trở đi: 01_CONSTITUTION có HAI danh sách đánh số
    // (§Mục đích và §Điều khoản); quét cả file sẽ đẻ ra số điều ma.
    const body = consti.slice(consti.search(/^##\s*.*Điều khoản/m));
    for (const m of body.matchAll(/^(\d{1,2})\.\s/gm)) dieuNums.add(m[1]);
  }
  if (dieuNums.size) {
    for (const rel of mdFiles) {
      const txt = read(root, rel);
      if (!txt) continue;
      const seen = new Set<string>();
      for (const m of txt.matchAll(/điều\s+(\d{1,2})\b/gi)) {
        if (dieuNums.has(m[1]) || seen.has(m[1])) continue;
        seen.add(m[1]);
        dangling.push(`${rel} → "điều ${m[1]}" (01_CONSTITUTION chỉ có 1..${dieuNums.size})`);
      }
    }
  }
  //   (b) Link markdown nội bộ tới file không có trên đĩa.
  for (const rel of mdFiles) {
    const txt = read(root, rel);
    if (!txt) continue;
    for (const m of txt.matchAll(/\]\(([^)\s#]+\.md)(?:#[^)]*)?\)/g)) {
      const target = m[1];
      if (/^[a-z]+:\/\//i.test(target)) continue; // link ngoài — không phải việc của conform
      const abs = join(root, dirname(rel), target);
      if (!existsSync(abs)) dangling.push(`${rel} → ${target} (không có file này)`);
    }
  }
  //   CỐ Ý KHÔNG kiểm "§4 định tuyến vào slot ngoài từ điển §3". Thử rồi: ra 13 mục
  //   (`attic` `data` `dist` `external` `frontend` `logs` `secrets`…) và TẤT CẢ đều
  //   báo oan — đó là TẦNG (§2) chứ không phải slot (§3), §4 trỏ tới chúng là đúng.
  //   Gốc rễ là `slotOf()` bên graph-standard lấy đoạn cuối đường dẫn nên gọi mọi thứ
  //   là "slot"; đó là chuyện của graph-standard, không phải một lệch chuẩn của repo.
  //   Ghi vào 05_TODO. Bài học đã trả giá hai lần: checker kêu oan thì lần sau không
  //   ai đọc nữa, và một mục nhiễu đủ giết cả bảng.
  push(
    "dangling-ref",
    "blocking",
    "Docs trỏ tới thứ không tồn tại (điều đã đánh số lại · file đã xoá · slot ngoài từ điển)",
    [...new Set(dangling)].sort(),
    "sửa NGUỒN .md: bỏ tham chiếu chết hoặc tạo lại đích — .md là nguồn, DB chỉ là index (điều 3)",
  );

  // ⑦ KÝ TỰ ĐIỀU KHIỂN lọt vào file nguồn — thứ làm MÙ chính công cụ đo.
  //
  //    Vì sao chặn: một byte NUL trong file .ts khiến ripgrep xếp cả file vào loại NHỊ PHÂN
  //    rồi BỎ QUA nó. Ở repo này đã xảy ra thật (2026-07-28): `ingest.ts` (777 dòng) và
  //    `ui.ts` — hai file lớn nhất của bề mặt — mang NUL gõ thẳng vào template literal làm
  //    ký tự nối khoá, nên MỌI đợt audit bằng grep (export mồ côi · endpoint chết · i18n ·
  //    chuỗi hardcode) chưa từng nhìn vào chúng. `tsc` xanh, test xanh, không dấu hiệu nào.
  //    Đây đúng loại lỗi mà `04_SKILLS §audit toàn diện` luật 1 nói: gate xanh KHÔNG chứng
  //    minh nó đang soi thứ đang chạy.
  //
  //    Cùng họ: 4 byte 0x08 nằm sẵn trong docs vì chuỗi `\b` bị nuốt khi soạn, làm câu văn
  //    mất chủ ngữ mà đọc lướt không thấy.
  //
  //    Duyệt theo MÃ KÝ TỰ, không dùng regex: viết dải điều khiển trong class regex vừa khó
  //    đọc vừa dễ nuốt nhầm — chính lỗi đó đã bị lint bắt khi vá đợt này.
  const firstCtrl = (txt: string): { line: number; code: number } | null => {
    for (let i = 0; i < txt.length; i++) {
      const c = txt.charCodeAt(i);
      if (c < 9 || c === 11 || c === 12 || (c > 13 && c < 32) || c === 127) {
        return { line: txt.slice(0, i).split("\n").length, code: c };
      }
    }
    return null;
  };
  const ctrlHits: string[] = [];
  for (const rel of [...new Set([...g.nodes.map((n) => n.id), ...mdFiles])]) {
    const txt = read(root, rel);
    if (!txt) continue;
    const hit = firstCtrl(txt);
    if (hit) ctrlHits.push(`${rel}:${hit.line} (0x${hit.code.toString(16).padStart(2, "0")})`);
  }
  push(
    "control-char",
    "blocking",
    "Ký tự điều khiển trong file nguồn — grep sẽ coi file là nhị phân và BỎ QUA nó",
    ctrlHits.sort(),
    "thay bằng escape (vd \\u0000 · \\b) — giá trị runtime y hệt, nhưng file đọc/grep được trở lại",
  );

  return {
    root,
    items,
    stats: {
      files: g.nodes.length,
      slotsUsed: std.stats.slots,
      slotsDeclared: std.stats.slots + std.stats.slotsUnused,
      hpDieu: std.stats.hpDieu,
      skills: std.stats.skills,
    },
    ok: !items.some((i) => i.level === "blocking"),
  };
}
