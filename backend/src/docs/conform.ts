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
import { dirname, join, relative } from "node:path";
import { harnessPathsAt, readMarker } from "../core/config.js";
import { buildCodeGraph } from "../memory/graph/graph.js";
import { buildStandardGraph } from "../memory/graph/graph-standard.js";
import { declaredSlots, extraDirOk, NONAPP_FREEFORM_PARENTS, SLOT_ROLES } from "./structure-tree.js";

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
/** Bỏ dấu `/` thừa + chuẩn hoá `\` → `/` để so đường khai với đường thật không lệch vì hình thức. */
function normDir(d: string): string {
  return d.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
}

export interface ForeignLayout {
  /** slot (từ điển zemory) → đường THẬT trong repo. */
  slots: Record<string, string>;
  /** Folder repo có mà từ điển không có — hợp lệ, nhưng phải được KHAI. */
  extra: string[];
  /** ADAPT v2 · N7 — CỘNG THÊM vào bộ ignore mặc định. Chỗ để repo khai một lần thứ
   *  thuộc về nó mà harness không cần soi (vd `docs/` do team sở hữu). */
  ignore: string[];
}

/**
 * Đọc khai báo hệ ADAPT từ `docs/.harness.json`, hay `null` nếu repo không ở hệ này.
 *
 * CỐ Ý chặt: chỉ nhận khi `layout === "foreign"` VÀ có ít nhất một khai báo. Thiếu là trả `null`
 * ⇒ rơi về cổng chuẩn (đòi slot), chứ KHÔNG im lặng bỏ qua. Một file `.harness.json` gõ sai
 * không được phép biến cổng thành vô hiệu — đó đúng là kiểu xanh-giả mà hệ này sinh ra để tránh.
 */
export function foreignLayout(root: string): ForeignLayout | null {
  try {
    // ADAPT v2 · N5 — marker theo THANG (readMarker: một người đọc, đã lột BOM), không
    // phải một đường cứng. Đọc cứng `docs/.harness.json` như bản trước có hệ quả trớ trêu:
    // repo đặt harness ở `harness/` (đúng luật ADAPT) thì hàm này trả null ⇒ chính hệ
    // ADAPT tự vô hiệu ⇒ repo bị đem đi soi bằng cổng chuẩn APP.
    const marker = readMarker(root);
    if (!marker) return null;
    const j = marker.data as {
      layout?: unknown;
      slots?: unknown;
      extra?: unknown;
      ignore?: unknown;
    };
    // `"adapt"` là tên v2 của cùng một hệ; `"foreign"` giữ làm alias để marker cũ chạy y nguyên.
    if (j.layout !== "foreign" && j.layout !== "adapt") return null;
    const slots: Record<string, string> = {};
    if (j.slots && typeof j.slots === "object") {
      for (const [k, v] of Object.entries(j.slots as Record<string, unknown>)) if (typeof v === "string" && v.trim()) slots[k] = v.trim();
    }
    const extra = Array.isArray(j.extra) ? j.extra.filter((x): x is string => typeof x === "string" && Boolean(x.trim())).map((x) => x.trim()) : [];
    const ignore = Array.isArray(j.ignore) ? j.ignore.filter((x): x is string => typeof x === "string" && Boolean(x.trim())).map((x) => x.trim()) : [];
    if (!Object.keys(slots).length && !extra.length) return null; // khai rỗng = chưa nhận repo
    return { slots, extra, ignore };
  } catch {
    return null;
  }
}

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
  //    SÁU MIỄN TRỪ — đều là thứ CHUẨN CHO PHÉP, báo lên là báo oan (đã lộ ra khi chạy thử
  //    trên 3 repo khác + báo cáo repo PBI 2026-08-20; checker kêu oan thì lần sau không
  //    ai đọc nữa):
  //    · gốc repo — "Tool ép root: MỌI config tool đọc từ root = ĐỂ YÊN" (03 §5)
  //    · `backend` · `frontend` · `docs` — là 4 VAI TRÒ bắt buộc, không phải slot
  //    · `NN_<tên>` — thư mục đánh số của hệ non-app (`tasks/NN_` · `pipelines/NN_` · `data/NN_`)
  //      là convention ĐÃ KHAI, không phải lệch
  //    · `docs_template/**` — TEMPLATE là hàng ship đi, không phải code sống của repo này;
  //      ruột nó theo CHUẨN CỦA PROJECT ĐÍCH (bộ Cowork mang cả script tự kiểm `.py` là
  //      thiết kế có chủ đích, 2026-07-29). Soi ruột template bằng thước của repo CHỨA nó
  //      là lấy nhầm thước.
  //    · profile NON-APP: con của `tasks/` · `pipelines/` · `data/` tên TỰ DO — chuẩn non-app
  //      tự khai ở BA chỗ (`tasks/<case>/` · `pipelines/<domain>/` · `data/<case>/`, legacy
  //      KHÔNG đánh số cùng tồn tại). Đo 2026-08-20: `pipelines/excel_loader/` bị chặn
  //      blocking trong khi doc cho phép — máy chỉ miễn tiền tố `NN_`. CHỈ non-app: chuẩn
  //      APP nói ngược lại ("trong domain chỉ dùng slot từ CÙNG từ điển"), miễn cả họ
  //      subdir bên app là mở lỗ.
  //    · `ignore` trong marker — trước CHỈ nhánh `layout:"foreign"` đọc, repo theo chuẩn
  //      không có đường khai miễn nào; nay áp cả nhánh chuẩn.
  const md = (readMarker(root)?.data ?? {}) as { profile?: unknown; ignore?: unknown };
  const profile = md.profile === "non-app" ? "non-app" : "app";
  const markerIgnore = (Array.isArray(md.ignore) ? md.ignore : [])
    .filter((x): x is string => typeof x === "string" && Boolean(x.trim()))
    .map((x) => normDir(x.trim()));
  const exempt = (dir: string): boolean => {
    if (!dir) return true;
    if (dir === "docs_template" || dir.startsWith("docs_template/")) return true;
    const seg = dir.split("/");
    const last = seg[seg.length - 1];
    if (seg.length === 1 && ["backend", "frontend", "docs"].includes(last)) return true;
    if (/^\d{2}_/.test(last)) return true;
    if (profile === "non-app" && NONAPP_FREEFORM_PARENTS.includes(seg[0])) return true;
    const nd = normDir(dir);
    return markerIgnore.some((i) => nd === i || nd.startsWith(i + "/"));
  };
  // ①bis — HỆ ADAPT (`layout: "foreign"`): repo có cấu trúc RIÊNG và KHÔNG được nắn (repo bên
  // thứ ba, repo làm nhóm, repo có CI/import khoá cứng theo tên folder). Ở đây câu hỏi ĐỔI:
  // không phải "có đúng slot chuẩn không" mà là **"có đúng bản đã KHAI không"**.
  //
  // Vì sao vẫn phải có cổng: nếu chuẩn uốn theo bất cứ thứ gì nó nhìn thấy thì `conform` thành
  // lời nói vòng — "repo tuân thủ đúng cái repo đang là", luôn xanh, gác con số không. Nên bản
  // ánh xạ phải được NGƯỜI DUYỆT rồi KHOÁ vào `.harness.json`, và từ đó cổng so **thực tế với
  // bản khoá**. Folder mới mọc lên mà không ai khai ⇒ ĐỎ. Đường khai mà không tồn tại ⇒ ĐỎ.
  const fh = foreignLayout(root);
  if (fh) {
    const declared = new Set([...Object.values(fh.slots), ...fh.extra].map(normDir));
    const tops = [...new Set(g.nodes.filter((n) => n.dir).map((n) => n.dir.split("/")[0]))].filter((d) => d && !exempt(d)).sort();
    // ADAPT v2 · N7 — GÁNH KHAI BÁO KHÔNG ĐƯỢC ĐÈ LÊN REPO.
    //
    // Bản trước bắt khai MỌI thư mục cấp 1 và chặn (blocking) nếu thiếu. Đo trên repo thật:
    // 4 lần chặn cho `.claude` · `.github` · `data` · `secrets` — KHÔNG cái nào là drift thật.
    // Đo trên 23 repo lớn: 6–31 thư mục cấp 1 (trung vị ~13), và 22/23 mang ít nhất một
    // dot-entry ở gốc. Tức luật cũ bắt người ta khai hàng chục mục rồi đỏ lại mỗi lần mọc
    // thêm một cái — mà cổng kêu oan thì lần sau không ai đọc nữa (đúng bài học ①).
    //
    // Nay chia hai mức: thư mục CHỨA CODE mà không khai ⇒ vẫn chặn (đây mới là drift thật,
    // và giữ nó thì cổng vẫn nổ được); còn lại ⇒ advisory. `ignore` trong marker cộng thêm
    // vào danh sách này, để repo khai một lần cho thứ riêng của mình (vd `docs/` của team).
    const IGNORED_TOPS = new Set([
      "node_modules", "dist", "build", "out", "coverage", "vendor", "third_party", "external",
      "__pycache__", ".pytest_cache", ".ruff_cache", ".venv", "venv", "target",
      "data", "attic", "secrets", "tmp", "temp", "logs",
    ]);
    const ignored = (d: string): boolean =>
      d.startsWith(".") || IGNORED_TOPS.has(d) || fh.ignore.some((i) => normDir(i) === normDir(d));
    // "Chứa code" = code-graph đã index ít nhất một file NGUỒN trong đó. Thư mục chỉ có `.md`
    // (vd `notes/`) không phải drift cấu trúc ⇒ không đáng chặn ai.
    const hasCode = new Set(g.nodes.filter((n) => n.dir).map((n) => n.dir.split("/")[0]));
    const undeclared = tops.filter((d) => !declared.has(normDir(d)) && !ignored(d));
    push(
      "foreign-undeclared-dir",
      "blocking",
      "Thư mục CHỨA CODE ở cấp 1 chưa được khai trong .harness.json (cấu trúc gốc đã đổi?)",
      undeclared.filter((d) => hasCode.has(d)),
      "chạy skill `adopt` để đọc lại cây rồi cập nhật `slots`/`extra` + 03_STRUCTURE §3 — ĐỪNG nới bảng cho khỏi đỏ",
    );
    push(
      "foreign-undeclared-dir-advisory",
      "advisory",
      "Thư mục cấp 1 chưa khai (không chứa code — chỉ đáng xem, KHÔNG chặn)",
      undeclared.filter((d) => !hasCode.has(d)),
      "khai vào `extra` nếu là phần của repo, hoặc thêm vào `ignore` trong .harness.json",
    );
    push(
      "foreign-missing-dir",
      "blocking",
      "Đường đã khai trong .harness.json nhưng KHÔNG tồn tại",
      [...declared].filter((d) => !existsSync(join(root, d))),
      "bảng ánh xạ đã lỗi thời — chạy skill `adopt` để đọc lại cây thật",
    );
  } else {
    // `noImportLayer` = file ngôn ngữ MỞ RỘNG (bash/java/go/rust…), vừa được nhận vào graph
    // 2026-08-21. CỐ Ý loại khỏi phép chấm này: mở `SRC_EXT` cho graph mà để nó lan sang cổng
    // BLOCKING là đổi hành vi conform ngoài phạm vi — đo thật cùng ngày: thư mục `devops/` chỉ
    // chứa `deploy.sh` bỗng thành off-standard, tức mọi repo pull bản mới có thể ĐỎ ĐỘT NGỘT ở
    // chỗ hôm qua còn xanh. Gate đỏ oan = gate bị bỏ qua (luật 7). Muốn conform soi cả ngôn ngữ
    // mở rộng thì đó là QUYẾT ĐỊNH RIÊNG của user (đề xuất đã ghi `05_TODO`), không phải hệ quả
    // âm thầm của một đợt build graph.
    // Slot repo tự KHAI trong `03_STRUCTURE §3` (HP điều 3 file-wins · điều 13: khai vào chuẩn
    // rồi máy honour) + hai quy ước chuẩn (python `backend/<pkg>/` · `api/vN`). Trước đây off-standard
    // chỉ tra `SLOT_ROLES` cứng ⇒ báo oan concern đã khai (đo 2026-08-14 trên music_video_flow: 16
    // mục blocking cho `backend/app` · `api/v1` · `schemas` · `workspaces/*` — không mục nào lệch
    // thật, tool bảo "thêm slot vào chuẩn nếu là concern thật" rồi phớt lờ chính việc đó). `extraDirOk`
    // KHÔNG nới cổng: dir tên vô nghĩa CHƯA khai (không phải pkg-root/api-version) vẫn rơi vào đây.
    const declared = declaredSlots(root);
    const offDirs = [
      ...new Set(
        g.nodes
          .filter((n) => !n.slot && n.dir && !n.noImportLayer && !exempt(n.dir) && !extraDirOk(n.dir, root, declared))
          .map((n) => n.dir),
      ),
    ].sort();
    push(
      "off-standard-dir",
      "blocking",
      "Thư mục chứa code nhưng KHÔNG khớp slot chuẩn nào",
      offDirs,
      "đổi tên về đúng slot (03_STRUCTURE §3) HOẶC thêm slot vào chuẩn nếu là concern thật",
    );
  }

  // ② Harness thiếu file bắt buộc.
  //
  // ADAPT v2 · N2 — đường lấy từ MARKER, không phải hằng số. Bản trước đóng cứng
  // `docs/agent/01..06` + `docs/plan/00_overview.md`, nên repo đặt harness ở `harness/agent`
  // (có ĐỦ cả 6 file) vẫn bị báo THIẾU cả 7 — cổng đi tìm ở chỗ không ai bảo nó tìm.
  // Đo trên repo thật trước khi vá: đúng 7 mục báo oan, trong khi file nằm đủ bên `harness/`.
  const hp = harnessPathsAt(root);
  const need = [
    ...hp.entries,
    ...["01_CONSTITUTION", "02_RULES", "03_STRUCTURE", "04_SKILLS", "05_TODO", "06_CHANGES"].map((f) =>
      join(hp.agent, `${f}.md`),
    ),
    join(hp.plan, "00_overview.md"),
  ];
  // Hai cửa vào ở gốc: chỉ cần MỘT là harness nạp được (AGENTS.md là chuẩn liên-hãng,
  // CLAUDE.md tồn tại vì Claude Code chỉ đọc tên đó). Đòi đủ cả hai là đòi thừa.
  const entryOk = hp.entries.some((e) => existsSync(e));
  push(
    "harness-missing",
    "blocking",
    "Thiếu file harness bắt buộc",
    need
      .filter((f) => !existsSync(f))
      .filter((f) => !(entryOk && hp.entries.includes(f)))
      .map((f) => relative(root, f).replace(/\\/g, "/")),
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

  // ④ Sổ đăng ký skill (04_SKILLS) lệch với skill THẬT.
  //    HAI hình dạng, vì Phase 3 (2026-07-31) dời playbook ra `.claude/skills/`:
  //      · MỚI  — mỗi skill một thư mục; roster = bảng §2 của 04; đối chiếu 3 chiều
  //               (thư mục ↔ §2 ↔ bảng trigger AGENTS), vì thiếu MỘT chỗ là skill mồ côi:
  //               nó tồn tại mà không phiên nào tìm ra, tức tốn công viết mà không ai dùng.
  //      · CŨ   — playbook inline; roster = dòng "Skill inline hiện có"; đối chiếu với `##`.
  //    Giữ cả hai để project chưa migrate không bị báo oan.
  const sk = read(root, relative(root, join(hp.agent, "04_SKILLS.md")).replace(/\\/g, "/"));
  const skillsDir = hp.skills;
  const onDisk = existsSync(skillsDir)
    ? readdirSync(skillsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && existsSync(join(skillsDir, e.name, "SKILL.md")))
        .map((e) => e.name)
        .sort()
    : [];
  if (sk && onDisk.length) {
    const declared = [...sk.matchAll(/^\|\s*`([a-z0-9-]+)\/`\s*\|/gm)].map((m) => m[1]);
    push(
      "skill-roster-drift",
      "blocking",
      "Skill khai trong `04_SKILLS` §2 nhưng KHÔNG có `.claude/skills/<tên>/SKILL.md`",
      declared.filter((d) => !onDisk.includes(d)),
      "tạo skill đó, hoặc bỏ dòng khỏi sổ đăng ký",
    );
    push(
      "skill-unregistered",
      "blocking",
      "Skill có thật nhưng KHÔNG khai trong `04_SKILLS` §2 (skill mồ côi)",
      onDisk.filter((d) => !declared.includes(d)),
      "thêm một dòng vào `04_SKILLS` §2",
    );
    const agents = read(root, "AGENTS.md") ?? "";
    push(
      "skill-no-trigger",
      "advisory",
      "Skill không có dòng nào trong bảng trigger `AGENTS.md` (chỉ được gọi khi harness tự nạp)",
      onDisk.filter((d) => !agents.includes(`.claude/skills/${d}/`)),
      "thêm một dòng “mở khi …” vào bảng trigger trong `AGENTS.md`",
    );
  } else if (sk) {
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
  // Đường lấy từ MARKER (N2). Ghép cứng `docs/agent`·`docs/plan` ở đây làm ba phép kiểm cuối
  // (skill mồ côi · dangling-ref · control-char trong docs) MÙ HẲN trên repo đặt harness chỗ
  // khác — mà mù thì `conform` vẫn in "không lệch chuẩn", tức phát ra lời bảo đảm cho thứ nó
  // chưa hề nhìn. Audit cùng ngày bắt được đúng lỗ này sau khi các phần khác đã vét xong.
  const hpRel = (abs: string) => relative(root, abs).replace(/\\/g, "/");
  const mdFiles: string[] = [...listMd(hpRel(hp.agent)), ...listMd(hpRel(hp.plan))];
  //   (a) `điều N` trỏ tới số điều không có trong 01_CONSTITUTION. Đây đúng là kiểu
  //       hỏng mà việc ĐÁNH SỐ LẠI hiến pháp từng gây ra ở chính repo này.
  const dieuNums = new Set<string>();
  const consti = read(root, hpRel(join(hp.agent, "01_CONSTITUTION.md")));
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
  // KHÔNG soi code của người khác: file vendor/thư viện nhúng và bundle đã minify vốn
  // chứa byte điều khiển hợp lệ, và ta cũng không có quyền sửa chúng. Đo trên repo tham
  // chiếu: `app/public/vendor/mermaid.min.js` (3,3 MB, 0x01) bị báo — một phát hiện mà
  // người nhận không thể hành động gì, tức đúng loại báo oan giết lòng tin vào cổng.
  const isVendored = (rel: string): boolean =>
    /(^|\/)(vendor|third_party|node_modules|external)\//.test(rel) || /\.min\.(js|css)$/.test(rel);
  const ctrlHits: string[] = [];
  for (const rel of [...new Set([...g.nodes.map((n) => n.id), ...mdFiles])]) {
    if (isVendored(rel)) continue;
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
