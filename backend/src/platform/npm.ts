import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * MỘT nguồn duy nhất cho câu hỏi "gọi npm thế nào". Trước đây câu trả lời bị chép ở HAI chỗ
 * (`commands/selfupdate.ts` và `ui.ts`) và cả hai cùng sai y hệt nhau — đúng kiểu hỏng mà audit
 * mặt ③ gọi là NGUỒN TRÙNG: cùng một sự thật nằm ở hai nơi thì chắc chắn sẽ lệch, và ở đây nó
 * lệch theo hướng tệ nhất là cùng hỏng.
 *
 * Vì sao không gọi thẳng `npm.cmd`: từ Node 20.12 (vá CVE-2024-27980), `execFile`/`spawn` một tệp
 * `.cmd` mà KHÔNG `shell: true` bị từ chối thẳng bằng **EINVAL**. Đo 2026-09-18 trên Node v24.19.0:
 *   execFileSync("npm.cmd", ["--version"])                  -> EINVAL  spawnSync npm.cmd EINVAL
 *   execFileSync("npm.cmd", ["--version"], { shell: true }) -> 11.17.0
 * Đó chính là lý do nút "Cập nhật ngay" chết câm trên Windows.
 *
 * Thứ tự ưu tiên — ĐƯỜNG KHÔNG SHELL TRƯỚC:
 *  ① `node <npm-cli.js>` — npm là JavaScript, nên chạy nó bằng chính `node` đang chạy là đường
 *     thẳng nhất: không `.cmd`, không shell, không phải lo chuyện nối chuỗi tham số.
 *  ② `npm.cmd` + `shell: true` — chỉ khi không tìm thấy ① (bản Node lạ, nvm/scoop bố trí khác).
 *     Tham số của ta là hằng chết (`install` · `run build` · `link`), không có gì từ người dùng
 *     lọt vào, nên cảnh báo "shell nối chuỗi không escape" của Node không thành lỗ hổng ở đây.
 *
 * ⚠ Đừng thay bằng `require.resolve("npm/bin/npm-cli.js")`: npm KHÔNG phải dependency của repo
 * này, nên lời gọi đó ném MODULE_NOT_FOUND (đã đo 2026-09-18). Phải dò cạnh chính `node.exe`.
 */
export interface NpmInvocation {
  cmd: string;
  args: string[];
  shell: boolean;
  /** Đường nào đã được chọn — để nhật ký nói rõ, khỏi đoán khi máy người khác hỏng. */
  via: "node-cli" | "shell-cmd" | "posix";
}

/** Đường tới `npm-cli.js` đi kèm bản Node đang chạy, hoặc null nếu bố trí khác thường. */
export function npmCliScript(): string | null {
  const base = dirname(process.execPath);
  const candidates = [
    join(base, "node_modules", "npm", "bin", "npm-cli.js"),
    join(base, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
  ];
  return candidates.find((c) => existsSync(c)) ?? null;
}

/**
 * Quyết định THUẦN, mọi đầu vào truyền tay. Tách ra vì cổng phải kiểm được CẢ BA nhánh trên bất kỳ
 * máy nào: máy chạy test luôn có `npm-cli.js` nên nhánh dự phòng `.cmd` không bao giờ được đi qua,
 * và một nhánh không đi qua được là một nhánh không ai canh — đúng ca đã đo: đột biến bỏ `shell`
 * khỏi nhánh đó SỐNG SÓT qua cổng.
 */
export function npmInvocationFor(platform: string, cliScript: string | null, args: string[], nodeExe: string): NpmInvocation {
  if (platform !== "win32") return { cmd: "npm", args, shell: false, via: "posix" };
  if (cliScript) return { cmd: nodeExe, args: [cliScript, ...args], shell: false, via: "node-cli" };
  return { cmd: "npm.cmd", args, shell: true, via: "shell-cmd" };
}

/** Cách gọi npm an toàn trên nền đang chạy. KHÔNG BAO GIỜ trả về `.cmd` mà thiếu `shell`. */
export function npmInvocation(args: string[]): NpmInvocation {
  return npmInvocationFor(process.platform, npmCliScript(), args, process.execPath);
}
