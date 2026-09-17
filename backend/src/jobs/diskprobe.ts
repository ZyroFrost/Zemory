// Dò dung lượng các ổ đĩa của máy — chạy trong TIẾN TRÌNH CON, cùng lý lẽ với `driveprobe.ts`.
//
// Vì sao lại là tiến trình con: `statfs` trên một ổ mây/ổ mạng đang treo thì KHÔNG trả về và cũng
// KHÔNG ném — nó nằm im. Ca thật đã đo được trên chính máy này (Google Drive File Stream treo ở
// tầng hệ điều hành, mọi syscall trên `G:` đứng). Gọi thẳng trong daemon là đóng băng cả bề mặt
// HTTP; gọi trong con thì quá giờ là giết con, daemon không hề hấn.
import { statfsSync } from "node:fs";

export interface DiskInfo {
  /** Gốc ổ, ví dụ `C:\` (Windows) hoặc `/` (POSIX). */
  root: string;
  total: number;
  free: number;
}

/** Các gốc cần thử. Windows: A..Z. POSIX: chỉ `/` — các mount khác không đoán được bằng tên. */
function candidateRoots(): string[] {
  if (process.platform !== "win32") return ["/"];
  const out: string[] = [];
  for (let c = 65; c <= 90; c++) out.push(String.fromCharCode(c) + ":\\");
  return out;
}

export function probeDisks(): DiskInfo[] {
  const out: DiskInfo[] = [];
  for (const root of candidateRoots()) {
    try {
      const s = statfsSync(root);
      const total = Number(s.blocks) * Number(s.bsize);
      const free = Number(s.bavail) * Number(s.bsize);
      // Ổ không tồn tại thì `statfs` ném; ổ tồn tại mà báo 0 byte (ổ đĩa rỗng, thẻ nhớ rút ra)
      // thì KHÔNG đưa vào — một thanh 0/0 không nói được gì, chỉ làm người đọc phân vân.
      if (total > 0) out.push({ root, total, free });
    } catch {
      /* không có ổ này — bỏ qua, đó là trường hợp thường */
    }
  }
  return out;
}

// Điểm vào của con: `node dist/jobs/diskprobe.js` → một dòng JSON trên stdout.
// Giữ CHUNG một module với phần logic để chỉ có đúng một bản cài đặt, không có bản thứ hai để lệch.
if (process.argv[1]?.replace(/\\/g, "/").endsWith("jobs/diskprobe.js")) {
  process.stdout.write(JSON.stringify(probeDisks()));
}
