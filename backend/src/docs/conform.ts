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
import { archiveDirOf, harnessPathsAt, readMarker } from "../core/config.js";
import { buildCodeGraph } from "../memory/graph/graph.js";
import { buildStandardGraph } from "../memory/graph/graph-standard.js";
import { declaredSlots, extraDirOk, NONAPP_FREEFORM_PARENTS, SLOT_ROLES } from "./structure-tree.js";
import { bodyOf, consFindings, folderCoreFiles, isFolderHarness, leafOf, listParts, listStructures, shelfDir, skillsIndexOf, SLOT_LAYER, slotGateFailures, structureSlots } from "./store.js";
import { CORE_REINJECT_CAP } from "./rule-core.js";
import { wiredHooks } from "./hook-wiring.js";
import { precommitState } from "./guard-gen.js";
import { editedHarnessCopies } from "./law-sync.js";
import { lawLinkFindings } from "./law-links.js";
import { consColumn, frameShapeFindings, ownSkillFindings } from "./cons-read.js";
import { regionLinkFindings } from "./region-links.js";
import { viName, viPartName } from "./vi-name-judge.js";
import { LEDGER, SHELF } from "./harness-names.js";
import {
  binLauncherFindings, caseHeaderFindings, gitRemoteFindings, caseIndexFindings, deadFlagFindings, ledgerDuplicateHeadings, ledgerTitleFindings,
  ownTextFiles, withTextCache, reportsIndexFindings, RETIRED_HARNESS_NAMES, retiredNameFindings, sharedSlotFindings, supersededFactFindings, vmDeployIgnoredFindings, vmTaskDataFindings,
} from "./case-checks.js";
import { stateDirOf } from "./guard-gen.js";

export interface ConformItem {
  /** mã kiểm, ổn định để CI bám */
  check: string;
  /** `blocking` = lệch chuẩn thật, gate đỏ · `advisory` = đáng xem, không chặn */
  level: "blocking" | "advisory";
  title: string;
  /** vài ví dụ đại diện — CỐ Ý không in hết, bảng phải NGẮN mới rẻ token */
  samples: string[];
  /** every finding, for the off-standard block `zemory sync` writes into the repo's TODO (the repo fixes from it, no re-run) */
  all?: string[];
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
  return withTextCache(() => conformRun(root));
}

function conformRun(root: string): ConformReport {
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
    items.push({ check, level, title, samples: all.slice(0, SAMPLE_CAP), all, count: all.length, fix });
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
  // Folder harness (plan/28 §0c): a rule carries its hook.cjs in its own folder by design — code under the harness folder
  // is a gate, not off-standard source.
  const harnessAgent = harnessPathsAt(root).agent;
  const harnessRel = isFolderHarness(harnessAgent) ? normDir(relative(root, harnessAgent).replace(/\\/g, "/")) : null;
  const archiveRel = normDir(relative(root, archiveDirOf(harnessAgent)).replace(/\\/g, "/"));
  const exempt = (dir: string): boolean => {
    if (!dir) return true;
    if (dir === "docs_template" || dir.startsWith("docs_template/")) return true;
    if (harnessRel && (normDir(dir) === harnessRel || normDir(dir).startsWith(harnessRel + "/"))) return true;
    // the archive keeps retired parts as they were (a rule folder with its hook.cjs): history, not a code folder of the repo
    if (harnessRel && (normDir(dir) === archiveRel || normDir(dir).startsWith(archiveRel + "/"))) return true;
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
  // Folder harness (plan/28 §0c · §0q): the law and structure shelves are assembled folders; the files a repo owns are the
  // two INDEX files and the two ledgers (the constitution is the Cons.md of each frame — checked below).
  const folder = isFolderHarness(hp.agent);
  const need = [
    ...hp.entries,
    ...(folder
      ? [join(shelfDir(hp.agent, SHELF.structure), "INDEX.md"), skillsIndexOf(hp.agent), hp.todo, hp.changes]
      : [...["01_CONSTITUTION", "02_RULES", "03_STRUCTURE", "04_SKILLS"].map((f) => join(hp.agent, `${f}.md`)), hp.todo, hp.changes]),
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

  // ②ter — Folder harness shape (plan/28 §0q, user 2026-10-18): the harness folder holds exactly the shelves and the
  // two ledgers; the archive lives beside it (`docs/archive/`, read by search only), and the old hook folder is gone —
  // hooks live in the rule that owns them. Before this, a loose `archive/` and a leftover `docs/hooks/guard.cjs` passed
  // conform on four reshaped repos and only the user's eye caught them.
  if (folder) {
    const allowed = new Set<string>([SHELF.rules.split("/")[0], SHELF.structure, SHELF.skills, LEDGER.todo, LEDGER.changes]);
    const stray = readdirSync(hp.agent).filter((n) => !allowed.has(n)).map((n) => `${relative(root, join(hp.agent, n)).replace(/\\/g, "/")}`);
    const oldHooks = join(dirname(hp.agent), "hooks");
    if (existsSync(oldHooks)) stray.push(`${relative(root, oldHooks).replace(/\\/g, "/")}/ (hooks live in the rule that owns them)`);
    push("harness-layout", "blocking", "Harness folder holds something outside its shelves and ledgers", stray,
      "run `zemory sync --standard --apply` (moves the archive to docs/archive, removes the old hook forwarder); anything else: move it out by hand");
  }

  // ②quinquies — A hook command in .claude/settings.json whose file is gone: the host runs it, it fails, and a failing hook
  // is let through — the gate stopped without a word (a department's mail gate, 2026-10-18). Any harness.
  {
    const dead = wiredHooks(root).filter((h) => h.file && !existsSync(join(root, h.file))).map((h) => `${h.event}: ${h.command}`);
    // git's pre-commit too: one calling a precommit-guard.cjs the move took away refuses EVERY commit (nine repos, 2026-10-18)
    if (precommitState(root) === "dead") dead.push("git pre-commit: calls a precommit-guard.cjs that is gone");
    push("hook-command-dead", "blocking", "A hook command (.claude/settings.json or git pre-commit) runs a file that does not exist", dead,
      "restore the file, or drop the command if a rule of the set does the job now (`zemory sync --standard --apply` rewrites the tool's own pre-commit)");
  }

  // ②septies — plan/29 §14b: the repo's role comes from its template; its one owner and the services it uses are checked
  // against the roles of the templates on both ends. A repo named whose template is not assembled yet is named (advisory).
  {
    const r = regionLinkFindings(root);
    push("region-links", "blocking", "The marker's owner / uses do not match the roles of the templates", r.wrong,
      "fix the marker: the owner rule of the template; an owner whose template manages this one; each uses.<kind> points at a repo whose template provides it");
    push("region-pending", "advisory", "A repo named in the marker is assembled from no template yet", r.pending,
      "checked once that repo is assembled (its own set)");
  }

  // ②sexies — Rule_Gate_83_HarnessFromStore (user 2026-10-18): a repo uses the harness, it does not own it — a part changes in
  // the zemory store and is synced down; a copy edited here splits the one part into many.
  push("harness-edited-here", "blocking", "A part of the harness (law · slot · skill) was edited in this repo, not in the zemory store", editedHarnessCopies(hp.agent),
    "send the change to the zemory session: it runs `zemory impact <part>`, puts it in the store and syncs down; what only fits this repo becomes its own part, written by zemory once the user agrees");

  // ②septies — Rule_Gate_86_LawLayersAgree (plan/29 §6): every name under a law's `## Links` or a skill's `## Implements`
  // is a living part, and an "Implements" line is answered from the other side when both parts are in the repo.
  if (folder) {
    push("law-links", "blocking", "A link between law, frame and skill points at nothing or is one-sided", lawLinkFindings(hp.agent),
      "name a living part; a law that says a skill implements it is listed under that skill's ## Implements, and the other way round - in the store, then sync");
  }

  // ②octies — plan/29 §13b · §15: the shape of a frame is HS's, the repo fills it; and a value the guard now reads from the
  // written Cons.md has one home there, not a second copy in the marker.
  if (folder) {
    push("own-skill-shape", "blocking", "A skill of the repo's own does not follow the frame Skill_Frame_Own", ownSkillFindings(hp.agent),
      "keep exactly the frame's sections, fill every one, give the header type: and description:; a section the frame lacks is proposed to HS");
    push("cons-frame-shape", "blocking", "A constitution frame's section is missing from the Cons.md the repo wrote", frameShapeFindings(hp.agent),
      "sync puts the missing section in with the template text; fill it (the frame's sections are never removed or renamed)");
    const m = (readMarker(root)?.data ?? {}) as { allowedSqlServers?: unknown; secretNames?: unknown };
    const moved: string[] = [];
    if (Array.isArray(m.allowedSqlServers) && m.allowedSqlServers.length && consColumn(hp.agent, "Cons_Gate_10_ReadOnlySources", "Server").length) {
      moved.push("allowedSqlServers → Cons_Gate_10_ReadOnlySources › Server");
    }
    if (Array.isArray(m.secretNames) && m.secretNames.length && consColumn(hp.agent, "Cons_Gate_14_Access", "File").length) {
      moved.push("secretNames → Cons_Gate_14_Access › File");
    }
    push("marker-key-in-cons", "blocking", "A marker key whose values now live in the constitution (two copies drift)", moved,
      "move any value still only in the marker into the Cons.md table, then drop the key from docs/.harness.json and run `zemory hook guard`");
  }

  // ②quater — The laws no hook holds are read before the first action and put back after a compaction (folderCoreFiles).
  // Past the put-back cap the text is cut: name the biggest files, so the repo knows what to give a hook or trim.
  if (folder) {
    const sized = folderCoreFiles(hp.agent).map((f) => ({ f, n: bodyOf(readFileSync(f, "utf8")).trim().length }));
    const total = sized.reduce((s, x) => s + x.n, 0);
    push("core-size", "advisory", `Laws without a hook come to ${total} characters, over the ${CORE_REINJECT_CAP} put back after a compaction`,
      total > CORE_REINJECT_CAP ? sized.sort((a, b) => b.n - a.n).map((x) => `${relative(root, x.f).replace(/\\/g, "/")} (${x.n})`) : [],
      "give a law a hook (it leaves the forced list) or trim it; an own article that repeats a common rule goes");
  }

  // ②bis — Folder harness: every slot carries its own check in gate.json › conform (files that must exist, text a file
  // must contain). One finding per broken requirement, named after the slot.
  if (folder) {
    const broken: string[] = [];
    for (const p of listParts(hp.agent, SHELF.structure)) {
      const r = slotGateFailures(root, p.dir);
      for (const why of r) broken.push(`${p.id} ${p.name}: ${why}`);
    }
    push("slot-gate", "blocking", "Slot không đạt phép kiểm khai trong gate.json", broken, "sửa repo cho đúng slot (xem SLOT.md của slot đó)");
    // The constitution (plan/28 §0q): every assembled frame must have its Cons.md written for this repo, or marked n/a.
    push("cons-unwritten", "blocking", "Constitution frame not written for this repo", consFindings(hp.agent),
      "write Cons.md from the frame's template for this product, or set status: n/a with the reason");
    // The two layers (plan/28 §0o): every slot sits in the inner layer, and the repo's structure names only slots it has.
    const slots = listParts(hp.agent, SHELF.structure);
    const flat = slots.filter((p) => !p.folder.startsWith(SLOT_LAYER + "/")).map((p) => `${SHELF.structure}/${p.folder}`);
    push("slot-layer", "blocking", "Slot outside the inner layer", flat, `move it into ${SHELF.structure}/${SLOT_LAYER}/ (\`zemory sync --standard\` moves assembled ones)`);
    const dangling: string[] = [];
    for (const s of listStructures(hp.agent)) for (const m of structureSlots(s, slots).missing) dangling.push(`${s.folder} → ${m}`);
    push("structure-slot", "blocking", "Structure names a slot the repo does not have", dangling, "assemble the slot (`zemory sync --standard`) or drop it from structure.json");
    // Rule 30 for names the TOOL wrote (the migration names a repo's own parts from their Vietnamese titles): no hook sees
    // those writes, so the names are judged here, with the same judge the hook runs.
    const viParts: string[] = [];
    for (const shelf of [SHELF.rules, SHELF.constitution, SHELF.structure] as const) {
      for (const p of listParts(hp.agent, shelf)) {
        const vi = viName(leafOf(p.folder)) ?? viPartName(leafOf(p.folder));
        if (vi) viParts.push(`${shelf}/${p.folder} (${vi})`);
        // a law's or an article's header name: is the kebab of its folder's name component (done-means-run ↔ DoneMeansRun);
        // a folder renamed into English kept its old Vietnamese slug there in five repos (2026-10-19). Slots name a real
        // file (package.json · .gitignore), so they are not held to it.
        if (shelf !== SHELF.structure) {
          const comp = leafOf(p.folder).split("_").pop() ?? "";
          const want = comp.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
            .replace(/([A-Za-z])([0-9])/g, "$1-$2").toLowerCase();
          if (p.name && p.name !== want && p.name !== comp && p.name !== leafOf(p.folder)) viParts.push(`${shelf}/${p.folder} name: ${p.name} (want ${want})`);
        }
      }
    }
    push("part-name-vi", "blocking", "Part name reads as Vietnamese without marks, or its header name: is not its folder's name (rule 30: names are English)", viParts,
      "rename the name component of the folder in English, keep the code and the number; set name: to the kebab of that component (keep id/aka)");
  }

  // ②nonies — A repo of cases and tasks (2026-10-19, Dept_FA · Dept_HR): after a reshape every gate was green and a hand
  // check still found these. Each reads files only; a repo without the folder in question gets nothing.
  push("case-index", "blocking", "content/README.md does not match tasks/ (a case missing, a row with no case, a status the spec contradicts)",
    caseIndexFindings(root), "one row per tasks/<case>/, linked to its spec.md; the status cell says closed exactly when the spec's status: is done/closed");
  push("case-header", "blocking", "A spec.md front block lacks status/cadence, its cadence differs from the task name, or a periodic task has no direction",
    caseHeaderFindings(root), "front block: status: open|done|closed|retired · cadence: as in <DEPT>_<Cadence>_<Name> · direction: in|out for Daily/Weekly/Monthly/Quarterly");
  push("vm-task-local-data", "blocking", "A task on the VM keeps files on the work PC (01_raw / 03_output may hold only _SharePoint.url and reference/)",
    vmTaskDataFindings(root), "python scripts/move_outputs_to_vm.py (dry run) then --apply: results to SharePoint + VM, working data to the VM; the local copy goes once both are verified");
  push("vm-deploy-ignored", "blocking", "A file a VM task needs (vm_deploy.json files / needs) sits under a .stignore line - Syncthing never carries it to the VM",
    vmDeployIgnoredFindings(root), "move the file out of the ignored folder (and fix vm_deploy.json), or narrow the .stignore line so it no longer covers it");
  push("bin-launcher", "blocking", "A launcher in bin/ calls a repo path that is gone (a task renamed or retired, a script moved)", binLauncherFindings(root),
    "point the launcher at the task's current folder / the script's new place, or drop the launcher if its task is retired");
  push("shared-slot-case-file", "blocking", "A file in a shared slot (sources/ · config/ · queries/) belongs to one case", sharedSlotFindings(root),
    "move it into tasks/<case>/ and fix the reader's path; shared slots hold what two cases or more read");
  push("reports-index", "blocking", "A report folder in reports/ has no line in reports/README.md", reportsIndexFindings(root),
    "add a row for the folder (and drop a row that says it is not on disk yet)");
  push("ledger-title", "blocking", "A ledger's heading names another repo (the name before a rename)", ledgerTitleFindings(root),
    "start the heading with the repo's folder name");
  push("ledger-duplicate-heading", "advisory", "The same heading twice in the TODO ledger", ledgerDuplicateHeadings(root),
    "merge the two sections into one; drop an empty one");
  const ownText = ownTextFiles(root);
  push("retired-harness-name", "blocking", "Text names a harness file that no longer exists in a folder harness", retiredNameFindings(root, ownText),
    "point at the new home: " + Object.entries(RETIRED_HARNESS_NAMES).map(([k, v]) => `${k} → ${v}`).join(" · ") + " — a file the harness ships is fixed in the zemory store");
  const superseded = supersededFactFindings(root, ownText);
  push("superseded-fact", "blocking", "Text still states a fact of the region that changed (region values › superseded_facts)", superseded.blocking,
    "replace the old fact with the one after the arrow; a change of the region is added to superseded_facts once and every repo is told by sync");
  push("superseded-fact-history", "advisory", "Text names a fact of the region that changed — keep it where it tells history, replace it where it instructs",
    superseded.advisory, "a line that says how things are or what to do takes the fact after the arrow; a line about what happened then stays");
  push("git-remote-on-backup-repo", "blocking", "A repo whose git is its local backup (template role git: local) has a remote", gitRemoteFindings(root),
    "remove it (`git remote remove <name>`): this repo is never pushed; another machine gets it through zemory's backup and Syncthing");
  push("dead-flag", "advisory", "A used one-use flag left in the state folder (revoked, opens nothing)", deadFlagFindings(root, stateDirOf(root)),
    "delete the file; a flag is created anew for each approval");

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
  // The list: `03_SKILLS/INDEX.md` in a folder harness (beside the sources it lists, plan/28 §0o), `04_SKILLS.md` before.
  const sk = read(root, relative(root, folder ? skillsIndexOf(hp.agent) : join(hp.agent, "04_SKILLS.md")).replace(/\\/g, "/"));
  const skillsDir = hp.skills;
  const onDisk = existsSync(skillsDir)
    ? readdirSync(skillsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && existsSync(join(skillsDir, e.name, "SKILL.md")))
        .map((e) => e.name)
        .sort()
    : [];
  if (sk && onDisk.length) {
    // A row names the skill by its host folder: the machine block writes `| Skill_… | .claude/skills/<host>/ | from |`,
    // a row the repo writes by hand is `| <host>/ | … |`.
    const declared = [...new Set([
      ...[...sk.matchAll(/^\|\s*`([a-z0-9-]+)\/`\s*\|/gm)].map((m) => m[1]),
      ...[...sk.matchAll(/`\.claude\/skills\/([a-z0-9-]+)\/`/g)].map((m) => m[1]),
    ])];
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
  //    `docs_template/05_app/agent/`, `backend/resources/` đầy `.md`/resource — báo chúng là
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
      // The standard graph reads 01_CONSTITUTION.md only; a folder harness keeps one folder per article (frames + own).
      hpDieu: folder ? listParts(hp.agent, SHELF.constitution).length : std.stats.hpDieu,
      skills: std.stats.skills,
    },
    ok: !items.some((i) => i.level === "blocking"),
  };
}
