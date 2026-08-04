// Còn gì CHỈ có trên Drive (máy cũ) mà máy này chưa có — chạy TRƯỚC khi xoá Drive.
//
// Dùng Node chứ không PowerShell: tên tiếng Việt trên Windows có hai cách mã hoá dấu
// (tổ hợp / dựng sẵn). So chuỗi đường dẫn trong PowerShell trượt liên tục — đã dính 3 lần
// trong phiên này, có lần suýt báo mất file mà thực ra nó vẫn còn. Node đọc UTF-8 nhất quán,
// và ở đây còn chuẩn hoá thêm bằng `normalize("NFC")` để hai bên so được với nhau.
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DRIVE = "G:\\Other computers\\My laptop\\Zyro";
const LOCALS = ["D:\\huy.nguyen", "E:\\Zyro"];

/** Bỏ qua: rác build, ruột git (nội dung nằm trong commit), file khoá tạm. */
const SKIP = new Set(["node_modules", ".git", "__pycache__", ".venv", "dist", ".pytest_cache"]);
const skipFile = (n) => n.startsWith(".~lock") || n === "Thumbs.db" || n === "desktop.ini";

function walk(root, base = root, out = new Map()) {
  let items;
  try {
    items = readdirSync(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const it of items) {
    if (it.isDirectory()) {
      if (SKIP.has(it.name)) continue;
      walk(join(root, it.name), base, out);
    } else {
      if (skipFile(it.name)) continue;
      const rel = relative(base, join(root, it.name)).normalize("NFC");
      let size = 0;
      try {
        size = statSync(join(root, it.name)).size;
      } catch {
        /* biến mất giữa chừng */
      }
      out.set(rel, size);
    }
  }
  return out;
}

console.log("đang quét Drive…");
const drive = walk(DRIVE);
console.log(`  Drive: ${drive.size.toLocaleString()} file`);

const localSets = [];
for (const l of LOCALS) {
  const m = walk(l);
  console.log(`  ${l}: ${m.size.toLocaleString()} file`);
  localSets.push(m);
}

// CHỈ có trên Drive = không tìm thấy ở bất kỳ bản local nào (so theo đường TƯƠNG ĐỐI).
const only = [];
for (const [rel, size] of drive) {
  const found = localSets.some((m) => m.has(rel));
  if (!found) only.push({ rel, size });
}

console.log(`\n=== CHỈ CÓ TRÊN DRIVE: ${only.length.toLocaleString()} file ===`);
const byTop = new Map();
for (const f of only) {
  const k = f.rel.split("\\").slice(0, 2).join("\\");
  const o = byTop.get(k) ?? { n: 0, b: 0 };
  o.n++;
  o.b += f.size;
  byTop.set(k, o);
}
for (const [k, v] of [...byTop].sort((a, b) => b[1].n - a[1].n).slice(0, 20)) {
  console.log(`  ${String(v.n).padStart(6)} file · ${(v.b / 1048576).toFixed(1).padStart(8)} MB  ${k}`);
}
console.log("\n--- 15 file lớn nhất chỉ có trên Drive ---");
for (const f of only.sort((a, b) => b.size - a.size).slice(0, 15)) {
  console.log(`  ${(f.size / 1048576).toFixed(1).padStart(8)} MB  ${f.rel}`);
}
