import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stripBom } from "../util/read-text.js";
import type { Context, HarnessConfig, HarnessPaths } from "./types.js";

/** Đường marker MẶC ĐỊNH khi tạo mới (nếp cũ — repo của chính zemory dùng nó).
 *  ĐỌC thì KHÔNG được dùng hằng này: hãy gọi `findMarker()`, vì marker có thể nằm
 *  ở `harness/` hoặc ở gốc (ADAPT v2 · N5). */
export const CONFIG_FILE = join("docs", ".harness.json");

/** Thang tìm marker tại MỘT thư mục, theo đúng thứ tự ưu tiên (ADAPT v2 · N5).
 *  ① `harness/` — mặc định v2, đo trên 23 repo lớn: 0/23 cấn tên.
 *  ② `docs/`    — nếp cũ 1.1.0. Đứng thứ hai để repo đang chạy KHÔNG phải sửa gì.
 *  ③ gốc repo   — dùng cho ca N4 (tên folder harness phải đổi vì bị chiếm); nội dung
 *     có thể chỉ là con trỏ `{"home": "<folder>"}`. Dot-entry ở gốc là khe cắm được
 *     96% mẫu repo chấp nhận, nên nó không cấn ai. */
export const MARKER_CANDIDATES = [
  join("harness", ".harness.json"),
  join("docs", ".harness.json"),
  ".harness.json",
] as const;

/**
 * Số hiệu bản zemory đang chạy — MỘT nguồn cho mọi bề mặt (`/ping`, UI, tem kênh chung).
 *
 * Trước đây `package.json` bị đọc rời ở hai chỗ; thêm chỗ thứ ba là đúng kiểu "nguồn trùng"
 * mà mặt ③ của `audit` gọi tên. `cli.ts` CỐ Ý giữ bản đọc riêng của nó: nó chạy trước mọi
 * import tĩnh để giữ lối tắt hook (~340ms → ~70ms), nhập module này vào đó là phá lối tắt.
 *
 * Fail-open: đọc hỏng ⇒ chuỗi rỗng, người gọi tự hiểu là "không tra được".
 */
export function appVersion(): string {
  try {
    const p = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "package.json");
    return (JSON.parse(readFileSync(p, "utf8")) as { version?: string }).version ?? "";
  } catch {
    return "";
  }
}

/** Marker THẬT của một project root — đường tuyệt đối, hoặc null nếu chưa nối harness.
 *  Đây là phép thử "đã nối harness chưa" DUY NHẤT; đừng tự ghép `join(root, CONFIG_FILE)`
 *  ở chỗ khác, vì làm vậy là mù với hai bậc kia của thang. */
export function findMarker(projectRoot: string): string | null {
  for (const rel of MARKER_CANDIDATES) {
    const p = join(projectRoot, rel);
    if (existsSync(p)) return p;
  }
  return null;
}

/** Repo đã nối harness chưa (bất kể harness nằm ở đâu). */
export function isConnected(projectRoot: string): boolean {
  return findMarker(projectRoot) !== null;
}

/** ĐỌC + PARSE marker — MỘT hàm cho mọi người đọc "mềm" (fail-open trả null).
 *
 *  Vì sao phải gom: từng có 5 chỗ tự `JSON.parse(readFileSync(marker))` riêng
 *  (loadContext · foreignLayout · buildPolicy · projectProfile · doctor) — đúng lớp lỗi
 *  "5 bản norm", và cả 5 cùng ngã trên một ca Windows RẤT thật: PowerShell 5.1
 *  `Set-Content -Encoding utf8` ghi BOM (U+FEFF), `JSON.parse` ném ngay ký tự đầu. Hậu quả đo được
 *  trên fixture: buildPolicy nuốt lỗi im lặng ⇒ policy MẤT `protected`; harnessPathsAt
 *  rơi fallback ⇒ guard sinh nhầm chỗ. Sai-im-lặng, không ai biết mình đang mất gì.
 *  (`loadContext` KHÔNG dùng hàm này — nó phải NÉM TO khi marker hỏng, chỉ mượn bước
 *  lột BOM.) */
export function readMarker(projectRoot: string): { path: string; data: Record<string, unknown> } | null {
  const p = findMarker(projectRoot);
  if (!p) return null;
  try {
    const data: unknown = JSON.parse(stripBom(readFileSync(p, "utf8")));
    return data && typeof data === "object" ? { path: p, data: data as Record<string, unknown> } : null;
  } catch {
    return null;
  }
}


function assertConfig(value: unknown, markerRel: string): HarnessConfig {
  if (!value || typeof value !== "object") throw new Error(`Invalid ${markerRel}: expected an object.`);
  const config = value as Partial<HarnessConfig>;
  if (typeof config.docs !== "string" || !config.docs.trim()) {
    throw new Error(`Invalid ${markerRel}: docs must be a relative path.`);
  }
  // ADAPT v2 · N1/N2 — BỎ ràng buộc "docs phải nằm trong docs/" của bản 1.1.0.
  // Ràng buộc đó là lý do repo trỏ harness sang `harness/` bị `zemory doctor` trả
  // "not connected": tool hứa thích nghi mọi repo nhưng lại ép đúng một tên folder.
  // Thứ CẦN chặn là thoát ra ngoài gốc repo, và việc đó `resolveHarnessRel` lo.
  if (!config.adapters || typeof config.adapters !== "object") config.adapters = {};
  if (!config.thresholds || typeof config.thresholds !== "object") config.thresholds = {};
  // Structure profile: which standard validate/structure enforce (03_STRUCTURE).
  config.profile = config.profile === "non-app" ? "non-app" : "app";
  return config as HarnessConfig;
}

/** Canonical spelling of a project root, for use as an index key.
 *
 *  On Windows the case of the drive letter depends on how the shell entered the
 *  directory (`cd d:\x` vs `cd D:\x`), so process.cwd() hands back two different
 *  spellings of the SAME folder. Measured 2026-07-29: this repo's own doc index was
 *  split in two — 24 rows under `D:\Zyro\Tool\Zemory` and 15 stale duplicates under
 *  `d:\Zyro\Tool\Zemory` — so a project-scoped search saw only whichever half matched
 *  the casing of the moment. Upper-casing the drive letter is a safe canonical form
 *  (Windows drive letters are case-insensitive); the rest of the path is left alone,
 *  since folder names are meaningful and other platforms are case-sensitive. */
export function normalizeRoot(path: string): string {
  const abs = resolve(path);
  return process.platform === "win32" ? abs.replace(/^([a-z]):/, (_m, drive: string) => `${drive.toUpperCase()}:`) : abs;
}

/**
 * KHOÁ SO SÁNH của một đường dẫn project — MỘT bản duy nhất cho cả hệ.
 *
 * Khác `normalizeRoot` (trả về dạng CHUẨN để GHI vào index): hàm này trả về khoá để SO,
 * nên nó nắn thêm ba thứ mà việc so hay vấp: dấu phân cách (`/` ↔ `\`), gạch cuối, và
 * hoa/thường trên Windows (hệ tệp không phân biệt).
 *
 * Vì sao phải gom (audit 2026-08-02 — F4): repo từng có **5 bản** tự chế —
 * `projects.ts::key` · `mergeprojects.ts::key` · `search.ts::norm` · `recall.ts::norm` ·
 * `graph-memory.ts::norm` — và chúng ĐÃ LỆCH NHAU: hai bản `norm` không cắt gạch cuối, bản
 * graph đổi ngược `\`→`/`. Hệ quả đo được: `D:\X\` khớp qua `key()` nhưng TRƯỢT qua `norm()`
 * của recall — cùng một thư mục, hai câu trả lời. Một sự thật thì phải có một hàm.
 */
export function projectKey(path: string): string {
  const abs = resolve(path).replace(/\//g, "\\").replace(/[\\/]+$/, "");
  return process.platform === "win32" ? abs.toLowerCase() : abs;
}

/** Walk up from `start` to find the nearest project root — thư mục MANG marker,
 *  bất kể marker nằm ở bậc nào của thang N5. */
export function findProjectRoot(start: string = process.cwd()): string | null {
  let dir = normalizeRoot(start);
  while (true) {
    if (findMarker(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** The project root for the current directory, falling back to the directory itself
 *  when there is no harness above it — always canonical, so what callers look up in
 *  the index matches what was written into it. */
export function currentProjectRoot(): string {
  return findProjectRoot() ?? normalizeRoot(process.cwd());
}

/** Load the project context (config + resolved docs dir) from a project root. */
export function loadContext(projectRoot: string): Context {
  const markerPath = findMarker(projectRoot) ?? join(projectRoot, CONFIG_FILE);
  const markerRel = relative(projectRoot, markerPath).replace(/\\/g, "/");
  let raw: unknown;
  try {
    raw = JSON.parse(stripBom(readFileSync(markerPath, "utf8")));
  } catch (error) {
    throw new Error(
      `Invalid ${markerRel}: ${error instanceof Error ? error.message : "cannot read config"}`,
      { cause: error },
    );
  }
  // Bậc ③ của thang N5: marker ở gốc có thể chỉ là CON TRỎ `{"home": "<folder>"}` —
  // dùng khi tên folder harness mặc định bị repo chiếm (N4). Đi theo con trỏ đúng MỘT
  // bước; con trỏ trỏ tới con trỏ là vòng lặp không ai cần, nên không đuổi tiếp.
  const pointer = (raw as { home?: unknown } | null)?.home;
  if (typeof pointer === "string" && pointer.trim()) {
    const homeMarker = join(resolveHarnessRel(projectRoot, pointer), ".harness.json");
    if (existsSync(homeMarker)) {
      try {
        raw = JSON.parse(stripBom(readFileSync(homeMarker, "utf8")));
      } catch (error) {
        throw new Error(
          `Invalid ${relative(projectRoot, homeMarker).replace(/\\/g, "/")} (trỏ tới từ ${markerRel}): ` +
            `${error instanceof Error ? error.message : "cannot read config"}`,
          { cause: error },
        );
      }
    }
  }
  const config = assertConfig(raw, markerRel);
  return {
    projectRoot,
    docsDir: resolve(projectRoot, config.docs),
    config,
    log: (msg) => console.log(msg),
  };
}

/** Phân giải một đường của harness, CHẶN thoát ra ngoài gốc repo.
 *  Đây là ràng buộc còn lại sau khi bỏ luật "phải nằm trong docs/": harness được đặt ở
 *  đâu trong repo cũng được, nhưng không được trỏ ra ngoài cây repo. */
function resolveHarnessRel(projectRoot: string, rel: string): string {
  const abs = resolve(projectRoot, rel);
  const out = relative(projectRoot, abs);
  if (out.startsWith("..") || isAbsolute(out)) {
    throw new Error(`Invalid harness path "${rel}": phải nằm trong cây project.`);
  }
  return abs;
}

/**
 * MỌI đường của harness — MỘT hàm, MỘT sự thật (ADAPT v2 · N2).
 *
 * Trước v2, `docs/agent` · `docs/plan` · `.claude/skills` là literal nằm rải ở ≥6 module
 * (đo lúc viết hàm này: 147 chỗ / 37 file). Mỗi bản sao là một cơ hội lệch — đúng bài học
 * `projectKey` đã trả giá: *"5 bản norm đã lệch nhau — một sự thật thì phải có một hàm"*.
 *
 * Suy diễn giữ NGUYÊN nếp cũ khi marker không khai `paths`: `plan` là anh em cạnh `agent`,
 * `archive` nằm trong `agent`. Nhờ vậy repo đang chạy chuẩn 1.1.0 không phải sửa một chữ.
 */
/** Bảng đường harness của một repo, chỉ từ đường gốc — cho chỗ gọi không cầm `Context`
 *  (gate, checks, graph). FAIL-OPEN (điều 9): repo chưa nối hoặc marker hỏng ⇒ trả bộ mặc
 *  định theo nếp cũ, để cổng vẫn chạy được chứ không ném giữa chừng. */
export function harnessPathsAt(projectRoot: string): HarnessPaths {
  try {
    return harnessPaths(loadContext(projectRoot));
  } catch {
    // Repo chưa nối / marker hỏng ⇒ vẫn đi qua CHÍNH harnessPaths() với context mặc định
    // nếp cũ — KHÔNG chép tay bộ đường ở đây. Bản đầu của hàm này chép tay 5 đường và đó
    // đúng là lớp lỗi "5 bản norm đã lệch nhau" (audit F4): đổi mặc định trong
    // harnessPaths() là bản chép quên theo, mà fallback thì không test nào soi thường xuyên.
    return harnessPaths({
      projectRoot,
      docsDir: join(projectRoot, "docs", "agent"),
      config: { docs: join("docs", "agent"), adapters: {}, thresholds: {} },
      log: () => {},
    });
  }
}

export function harnessPaths(ctx: Context): HarnessPaths {
  const p = ctx.config.paths ?? {};
  const rel = (v: string | undefined, fallback: string): string =>
    resolveHarnessRel(ctx.projectRoot, v?.trim() ? v : fallback);
  const agent = p.agent?.trim() ? resolveHarnessRel(ctx.projectRoot, p.agent) : ctx.docsDir;
  return {
    agent,
    plan: p.plan?.trim() ? resolveHarnessRel(ctx.projectRoot, p.plan) : join(dirname(agent), "plan"),
    archive: p.archive?.trim() ? resolveHarnessRel(ctx.projectRoot, p.archive) : join(agent, "archive"),
    skills: rel(p.skills, join(".claude", "skills")),
    entries: (p.entries?.length ? p.entries : ["AGENTS.md", "CLAUDE.md"]).map((e) =>
      resolveHarnessRel(ctx.projectRoot, e),
    ),
  };
}
