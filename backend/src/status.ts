// status() — the single data layer behind every status surface (doctor, ui,
// future VSCode extension). It lists zemory's FEATURES (the token-saving
// capabilities) and whether each is working — NOT internal repo/dep names.

import { existsSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { currentProjectRoot, isConnected, loadContext, normalizeRoot } from "./core/config.js";
import { type KnownProject, listKnownProjects, rememberProject } from "./projects.js";
import { tr } from "./i18n/index.js";

export type FeatureState = "on" | "planned" | "off" | "idle";

export interface FeatureStatus {
  key: string;
  /** Plain-language: what this feature does. */
  label: string;
  /** "token" = token-saver · "workflow" = agent workflow (e.g. grill). */
  group: "token" | "workflow";
  state: FeatureState;
  /** Status line (e.g. "ready", "not built yet"). */
  detail: string;
  /** Longer explanation shown behind the "?" — what it does + why. */
  help: string;
}

export interface StatusReport {
  ts: string;
  /** Project setup layer (foundation) — separate from token-saving features. */
  project: { connected: boolean; name: string | null; root: string | null; docs: string | null };
  docs: { file: string; ok: boolean }[];
  /** Token-saving features layer. */
  features: FeatureStatus[];
  /** Other projects zemory knows about (for the picker); pinned first, then recent. */
  knownProjects: KnownProject[];
  /** docs/plan conformance signal — when it needs agent reconciliation. */
  plan: { exists: boolean; needsReconcile: boolean; detail: string };
  /** Onboarding signal: is the harness filled (done) or still skeleton (run setup). */
  setup: { complete: boolean; detail: string };
}

/**
 * Plan signal. The .md files ARE the source (file wins); global_memory.db is just the
 * derived search index, so the old overview-index reconcile is gone — we just report
 * whether plan docs exist.
 */
function planSignal(docsDir: string): StatusReport["plan"] {
  const planDir = join(dirname(docsDir), "plan");
  if (!existsSync(planDir)) return { exists: false, needsReconcile: false, detail: tr("chưa có plan/", "no plan/ yet") };
  const files = readdirSync(planDir).filter((f) => f.endsWith(".md"));
  return { exists: files.length > 0, needsReconcile: false, detail: tr(`${files.length} file`, `${files.length} file(s)`) };
}

// Canonical markdown docs the harness expects (the rest — plan/changelog — live
// in global_memory.db and render to mirrors). RULES is the one hand-source doc.
const REQUIRED_DOCS = ["01_CONSTITUTION.md", "02_RULES.md", "03_STRUCTURE.md", "04_SKILLS.md", "05_TODO.md", "06_CHANGES.md"];

/**
 * zemory's token-saving features. Each `state` flips to "on" as the feature
 * lands. These are CAPABILITIES (what it does for you), not implementation deps.
 */
function listFeatures(): FeatureStatus[] {
  // state "idle" = not yet tested; the real state comes from running checks.
  // ONE row per real capability — 'search' and 'memory' used to run the identical
  // code path and rendered as two rows; merged into one honest memory check.
  return [
    { key: "memory", group: "token", label: tr("Tìm & nhớ trong memory (FTS5)", "Search & recall in memory (FTS5)"), state: "idle", detail: "—",
      help: tr("Memory toàn cục: full-text (word + trigram tiếng Việt) trên mọi phiên đã lưu — agent tìm đúng đoạn và nhớ quyết định/gotcha phiên trước thay vì giải thích lại. `zemory memory search`.", "Global memory: full-text (word + Vietnamese trigram) over every stored session — the agent finds the exact bit and recalls past decisions/gotchas instead of re-explaining. `zemory memory search`.") },
    { key: "validate", group: "workflow", label: tr("Kiểm tra docs harness", "Validate docs harness"), state: "idle", detail: "—",
      help: tr("Kiểm link nội bộ trong docs/, độ dài changelog vs ngưỡng, sổ supersede, và cấu trúc repo theo 03_STRUCTURE. `zemory validate`.", "Check internal links across docs/, changelog length vs threshold, supersede bookkeeping, and repo structure against 03_STRUCTURE. `zemory validate`.") },
    { key: "grill", group: "workflow", label: tr("Grill trước khi build", "Grill before build"), state: "idle", detail: "—",
      help: tr("Bắt agent tra hỏi plan cùng bạn (từng câu một) TRƯỚC khi build, để build đúng thứ cần. Playbook: 04_SKILLS §grill.", "Make the agent interrogate the plan with you (one question at a time) BEFORE building. Playbook: 04_SKILLS §grill.") },
    { key: "profile-reclaim", group: "workflow", label: tr("Tự thu hồi profile trình duyệt cũ", "Reclaim stale browser profiles"), state: "idle", detail: "—",
      help: tr("Khi trình duyệt mặc định của máy đổi, zemory KHÔNG xoá profile web cũ mà dời sang bên (`<khe>.<hãng>-bak-<epoch>`). Từ 2026-09-02 bản dời đó CÓ đường về: quay lại đúng hãng cũ thì `restoreShelvedSession` trả bản mới nhất CÒN PHIÊN về làm profile sống, khỏi đăng nhập lại. Nên nó không còn là rác-từ-lúc-sinh; nó là bản lùi có giá trị. Nó nằm dưới `data/` đã gitignore nên không cổng nào thấy nó lớn lên (đo 2026-09-02: 17 bản app tạo · 1,5 GB, trong đó 3 bản đang giữ phiên · 730 MB). Daemon thu hồi bản quá 7 ngày ở lượt quét rác 6 giờ, NHƯNG giữ lại bản đang là ĐƯỜNG VỀ CUỐI CÙNG của một khe (có phiên, mà khe sống thì không) bất kể tuổi — nếu không, vòng dọn sẽ xoá đúng phiên duy nhất còn lưu. CHỈ đụng thứ app tự sinh (`-bak-`), không bao giờ đụng khe đang sống hay bản người/agent lưu tay.", "When the machine's default browser changes, zemory does NOT delete the old web profile — it moves it aside (`<slot>.<brand>-bak-<epoch>`). Since 2026-09-02 an aside copy HAS a way back: switch to that same brand again and restoreShelvedSession brings the newest copy that still holds a session back as the live profile, with no re-login. So it is no longer garbage from birth — it is a rollback copy with real value. It lives under gitignored `data/` where no gate sees it grow (measured 2026-09-02: 17 app-created copies · 1.5 GB, of which 3 still hold a session · 730 MB). The daemon reclaims copies older than 7 days on the 6-hour sweep, BUT keeps one that is a lane's LAST WAY BACK (it holds a session while the live slot does not) regardless of age — otherwise the cleanup loop would delete the only stored session. It only ever touches app-created `-bak-` dirs, never a live slot or a hand-made copy.") },
    { key: "storage-safety", group: "token", label: tr("Kho nằm ngoài vùng đồng bộ", "Store outside sync scope"), state: "idle", detail: "—",
      help: tr("Kho SQLite (WAL) nằm trong thư mục do trình đồng bộ đám mây quản là HỎNG — đã xảy ra thật 2 lần. Phép kiểm đọc sổ root của Google DriveFS (gồm cả kênh backup máy), biến môi trường OneDrive, marker Dropbox/Drive và số liên kết cứng của file DB. Đồng bộ xuyên máy đi bằng bundle mã hoá (`memory sync`).", "A live SQLite/WAL store inside a cloud-sync folder WILL corrupt — it happened twice. This check reads Google DriveFS's root table (including the machine-backup channel), OneDrive env vars, Dropbox/Drive markers and the DB file's hardlink count. Cross-machine sync goes through the encrypted bundle (`memory sync`).") },
  ];
}

/**
 * Gather the full status report. `rootArg` targets a specific project (from the
 * UI picker); otherwise the launch directory's project is used.
 */
export async function gatherStatus(rootArg?: string): Promise<StatusReport> {
  // Always have a target: explicit picker root → found project → the launch folder.
  const root = rootArg ? normalizeRoot(rootArg) : currentProjectRoot();
  // ADAPT v2 · N5 — "đã nối" nghĩa là TÌM THẤY marker ở bất kỳ bậc nào của thang, không
  // phải "có đúng file docs/.harness.json". Đây chính là chỗ repo trỏ harness sang
  // `harness/` bị trả về "not connected" dù nối đúng theo luật ADAPT.
  const connected = isConnected(root);
  const report: StatusReport = {
    ts: new Date().toISOString(),
    project: { connected, name: basename(root), root, docs: "docs/agent" },
    docs: [],
    features: listFeatures(),
    knownProjects: [],
    plan: { exists: false, needsReconcile: false, detail: "—" },
    setup: { complete: false, detail: tr("chưa cài đặt", "not set up") },
  };

  if (connected) {
    rememberProject(root);
    const ctx = loadContext(root);
    report.project.docs = ctx.config.docs;
    report.docs = REQUIRED_DOCS.map((file) => ({
      file,
      ok: existsSync(join(ctx.docsDir, file)),
    }));
    report.plan = planSignal(ctx.docsDir);

    // Onboarding: done when the required docs are present and plan exists.
    const docsOk = report.docs.every((d) => d.ok);
    const complete = docsOk && report.plan.exists;
    report.setup = {
      complete,
      detail: complete ? tr("xong", "done") : !docsOk ? tr("thiếu docs → zemory sync", "docs missing → zemory sync") : tr("chưa có plan", "no plan yet"),
    };
  } else {
    // Not set up yet — show the standard docs as missing so the UI invites Setup.
    report.docs = REQUIRED_DOCS.map((file) => ({ file, ok: false }));
  }
  report.knownProjects = listKnownProjects();

  return report;
}
