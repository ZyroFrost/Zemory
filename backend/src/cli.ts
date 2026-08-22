#!/usr/bin/env node
// zemory CLI — thin dispatcher. Each verb lives in commands/<group>.ts; this file
// only parses argv and routes (03_STRUCTURE §3: surface is thin, wires a domain).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8"),
) as { version: string };

const [cmd, ...args] = process.argv.slice(2);

// LỐI TẮT cho hook — phải đứng TRƯỚC mọi import khác của CLI.
//
// Vì sao: `hook stop` chạy sau MỖI lượt trả lời (capture per-message), mà import tĩnh của
// ESM được kéo hết trước khi một dòng code chạy — nghĩa là mỗi tin nhắn phải trả tiền nạp
// cả `ui.ts`, `mcp`, `graph`, `memory`… trong khi hook chỉ cần đúng một module. Đo
// 2026-08-02: cả CLI ~340ms, việc thật ~70ms. Nạp ĐỘNG đúng thứ cần cắt phần lớn khoản đó.
// Các lệnh khác giữ nguyên đường cũ bên dưới (đổi hết sang động là refactor rộng hơn việc
// đang làm, và không lệnh nào khác chạy mỗi tin).
try {
  if (cmd === "hook") {
    const { cmdHook } = await import("./commands/hook.js");
    await cmdHook(args);
  } else {
    await runRest();
  }
} catch (error) {
  // Một chỗ bắt cho MỌI lệnh: lỗi ném ra in một dòng gọn + exit 1, không phải stack
  // UnhandledRejection thô (vd export sai đường dẫn).
  console.error(`zemory ${cmd ?? ""}: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

async function runRest(): Promise<void> {
const { startUi } = await import("./ui.js");
const { runMcpStdio } = await import("./mcp.js");
const { runMcpHttp } = await import("./mcphttp.js");
const { cmdGraph } = await import("./commands/graph.js");
const { cmdMemory } = await import("./commands/memory.js");
const { cmdHook } = await import("./commands/hook.js");
const { cmdPlan, cmdDocs, cmdChangelog } = await import("./commands/docs.js");
const {
  cmdInit,
  cmdMigrate,
  cmdSync,
  cmdDoctor,
  cmdArchive,
  cmdValidate,
  cmdConform,
  cmdSetup,
  cmdStructure,
  cmdGrill,
  cmdReindex,
  cmdTodoVerify,
} = await import("./commands/harness.js");
const { cmdHelp } = await import("./commands/help.js");
await main();

async function main(): Promise<void> {
switch (cmd) {
  case "init":
    cmdInit(args);
    break;
  case "sync":
    cmdSync();
    break;
  case "migrate":
    cmdMigrate();
    break;
  case "doctor":
    await cmdDoctor();
    break;
  case "ui":
    await startUi();
    break;
  case "archive":
    cmdArchive(args);
    break;
  case "validate":
    cmdValidate();
    break;
  case "conform":
    cmdConform(args);
    break;
  case "reindex":
    cmdReindex();
    break;
  case "todo":
    cmdTodoVerify(args);
    break;
  case "plan":
    await cmdPlan(args);
    break;
  case "docs":
    await cmdDocs(args);
    break;
  case "changelog":
    await cmdChangelog(args);
    break;
  case "memory":
    await cmdMemory(args);
    break;
  case "mcp":
    // stdio là đường mặc định (host tự spawn tiến trình). `--http` cho host KHÔNG spawn
    // được: agent trong máy ảo/sandbox, hoặc host chỉ nói HTTP. Cùng một bộ tool.
    if (args.includes("--http")) {
      const at = args.indexOf("--port");
      const port = at >= 0 ? Number(args[at + 1]) : undefined;
      if (at >= 0 && (!Number.isInteger(port) || port! < 1 || port! > 65535)) {
        console.error("zemory mcp --http: --port cần một số cổng hợp lệ (1–65535).");
        process.exitCode = 1;
        break;
      }
      await runMcpHttp(port);
    } else {
      await runMcpStdio();
    }
    break;
  case "hook":
    await cmdHook(args);
    break;
  case "grill":
    cmdGrill();
    break;
  case "structure":
    cmdStructure();
    break;
  case "graph":
    await cmdGraph(args);
    break;
  case "setup":
    cmdSetup(args);
    break;
  case "--version":
  case "-v":
    console.log(`zemory ${VERSION.version}`);
    break;
  default:
    cmdHelp();
}
}
}
