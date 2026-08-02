// Shared CLI arg helpers used across command modules (commands/<verb>.ts).

/** Value that follows a --flag on the command line, or undefined. */
export function flagValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

/** Positional (non-flag) args, skipping the value after any known value-flag. */
export function positionalArgs(args: string[], valueFlags = new Set(["--db", "--key-file"])): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (valueFlags.has(a)) {
      i++;
      continue;
    }
    if (!a.startsWith("--")) out.push(a);
  }
  return out;
}

/** Read all of stdin as a string; returns "" on a TTY or after an 800ms timeout. */
export function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve("");
    let d = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (d += c));
    process.stdin.on("end", () => resolve(d));
    // Lưới an toàn: đừng treo nếu không bao giờ có EOF. `.unref()` là phần THIẾU — không có
    // nó thì timer giữ event loop sống nốt 800ms KỂ CẢ khi stdin đã đóng và promise đã
    // resolve. Đo 2026-08-02 trên đường hook: mỗi lượt trả lời tốn thêm ~0,8s hoàn toàn vô
    // ích — với capture per-message thì đó là thuế đánh vào MỌI tin nhắn.
    setTimeout(() => resolve(d), 800).unref?.();
  });
}
