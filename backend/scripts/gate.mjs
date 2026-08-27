// Cửa vào của `npm test`: chạy `run-tests.mjs` TRONG LỒNG RAM khi có thể.
//
// Windows: `gate-cage.ps1` (Job Object) ghim tổng RAM của cả cây tiến trình (mặc định 4 GB) và hạ ưu
// tiên — user chốt 2026-08-27 sau hai lần gate tràn 16 GB làm chết phiên agent. OS khác: chưa có lồng
// tương đương ở đây ⇒ chạy thẳng runner (runner vẫn tự hạ ưu tiên + tắt arena ONNX cho nhóm model),
// và NÓI RÕ là đang chạy không lồng — im lặng bỏ qua một lớp bảo vệ là kiểu hỏng `02_RULES` cấm.
// ZEMORY_GATE_NO_CAGE=1 để ép chạy thẳng trên Windows (gỡ lỗi PowerShell).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const RUNNER = "backend/scripts/run-tests.mjs";
const CAGE = "backend/scripts/gate-cage.ps1";
const useCage = process.platform === "win32" && process.env.ZEMORY_GATE_NO_CAGE !== "1" && existsSync(CAGE);

let r;
if (useCage) {
  r = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", CAGE, process.execPath, RUNNER],
    { stdio: "inherit" },
  );
  if (r.error) {
    console.error(`[gate] không phóng được PowerShell (${r.error.message}) — chạy KHÔNG lồng RAM.`);
    r = spawnSync(process.execPath, [RUNNER], { stdio: "inherit" });
  }
} else {
  console.log(`[gate] ${process.platform === "win32" ? "ZEMORY_GATE_NO_CAGE=1" : process.platform}: chạy KHÔNG lồng RAM — chỉ còn ưu tiên thấp + arena tắt của runner.`);
  r = spawnSync(process.execPath, [RUNNER], { stdio: "inherit" });
}
process.exit(r.status ?? 1);
