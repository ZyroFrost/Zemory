import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dist = new URL("../../dist", import.meta.url);

try {
  rmSync(dist, { recursive: true, force: true });
} catch (e) {
  // EPERM/EBUSY ở đây gần như LUÔN là một nguyên nhân duy nhất: daemon đang chạy dưới
  // `dist/zemory.exe`, và Windows khoá ảnh đang nạp. Lỗi trần của `rm` không hề nói điều đó, nên
  // người đọc quay sang ngờ quyền thư mục — sai hướng hoàn toàn. Đo 2026-09-18: xoá tệp exe 89 MB
  // đang chạy trả về `EPERM, Permission denied … dist\zemory.exe`.
  if (e && (e.code === "EPERM" || e.code === "EBUSY")) {
    console.error(`clean: không xoá được ${fileURLToPath(dist)}`);
    console.error(`  ${e.code}: có tiến trình đang GIỮ tệp trong dist/ — gần như chắc chắn là daemon`);
    console.error("  chạy dưới dist/zemory.exe (Windows khoá ảnh đang nạp).");
    console.error("  → tắt daemon rồi dựng lại. Cập nhật một-nút thì dùng `zemory selfupdate` hoặc");
    console.error("    nút “Cập nhật ngay” — cả hai tự tiễn daemon trước khi dựng.");
    process.exit(1);
  }
  throw e;
}
