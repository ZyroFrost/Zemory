/**
 * BẢNG TRA "số máy → máy đó ở đâu", đặt trên THƯ MỤC DÙNG CHUNG (Drive).
 *
 * Vì sao cần: UltraViewer nối được bằng một ID 9 số vì nó có máy chủ trung gian giữ bảng đó. Zemory
 * không có máy chủ nào — nhưng hai máy của cùng một người ĐÃ dùng chung một thư mục Drive để chở kho
 * nhớ. Dùng chính chỗ đó làm bảng tra thì số máy chạy được cả khi hai máy khác mạng, mà không thêm
 * một dịch vụ nào của bên thứ ba (user chốt 2026-09-19: *"ko có 1 id 9 số dc à?"*).
 *
 * Mỗi máy đăng MỘT tệp nhỏ `peers/<số máy>.json`: số máy · vân tay · các địa chỉ · tên máy · mốc ghi.
 * KHÔNG phải bí mật (cùng hạng với số máy và vân tay — chìa share mới là thứ gác cửa), và cố ý KHÔNG
 * mã hoá: nó phải đọc được trước khi hai máy kịp bắt tay.
 *
 * Fail-open ở MỌI đường (HP điều 9): ổ đám mây treo, thư mục chỉ-đọc, JSON hỏng ⇒ trả rỗng/null và
 * để tầng dò LAN gánh. Một bảng tra hỏng không được phép làm chết lượt ghép.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface Presence {
  /** Số máy 9 chữ số — thứ người dùng gõ. */
  shortId: string;
  /** Vân tay đầy đủ — thứ TLS so lúc bắt tay. */
  deviceId: string;
  /** `host:port` máy đó nghe được ở đâu. */
  addrs: string[];
  name: string;
  /** Mốc đăng gần nhất (ISO) — để bề mặt nói "đăng lúc nào", và để người đọc biết nó có cũ không. */
  at: string;
}

export function presenceDir(driveDir: string): string {
  return join(driveDir, "peers");
}

/** Đăng máy NÀY lên bảng tra. Trả đường tệp đã ghi, `null` nếu không ghi được. */
export function publishPresence(driveDir: string, p: Omit<Presence, "at">): string | null {
  if (!driveDir || !p.shortId) return null;
  try {
    const dir = presenceDir(driveDir);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${p.shortId}.json`);
    writeFileSync(file, JSON.stringify({ ...p, at: new Date().toISOString() }, null, 2) + "\n");
    return file;
  } catch {
    return null;
  }
}

function readOne(file: string): Presence | null {
  try {
    const o = JSON.parse(readFileSync(file, "utf8")) as Partial<Presence>;
    if (typeof o.shortId !== "string" || typeof o.deviceId !== "string" || !o.deviceId.trim()) return null;
    return {
      shortId: o.shortId,
      deviceId: o.deviceId,
      addrs: Array.isArray(o.addrs) ? o.addrs.filter((x): x is string => typeof x === "string") : [],
      name: typeof o.name === "string" ? o.name : "",
      at: typeof o.at === "string" ? o.at : "",
    };
  } catch {
    return null;
  }
}

/** Tra một số máy trên bảng. `null` khi không có, hoặc khi không đọc được thư mục. */
export function findPresence(driveDir: string, shortId: string): Presence | null {
  const num = (shortId ?? "").replace(/[\s-]/g, "");
  if (!driveDir || !/^[0-9]{9}$/.test(num)) return null;
  const file = join(presenceDir(driveDir), `${num}.json`);
  if (!existsSync(file)) return null;
  const p = readOne(file);
  // Tên tệp là số máy, nhưng thứ đáng tin là NỘI DUNG: tệp đặt sai tên (chép tay, đồng bộ lỗi) mà vẫn
  // nhận thì ghép nhầm máy — đúng thứ số máy sinh ra để tránh.
  return p && p.shortId.replace(/[\s-]/g, "") === num ? p : null;
}

/** Mọi máy đang có mặt trên bảng — cho bề mặt liệt kê, và cho phép dọn tệp của chính mình. */
export function listPresence(driveDir: string): Presence[] {
  if (!driveDir) return [];
  try {
    return readdirSync(presenceDir(driveDir))
      .filter((f) => f.endsWith(".json"))
      .map((f) => readOne(join(presenceDir(driveDir), f)))
      .filter((p): p is Presence => p !== null);
  } catch {
    return [];
  }
}
