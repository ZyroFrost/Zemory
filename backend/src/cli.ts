#!/usr/bin/env node
// zemory CLI — thin dispatcher. Each verb lives in commands/<group>.ts; this file
// only parses argv and routes (03_STRUCTURE §3: surface is thin, wires a domain).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startUi } from "./ui.js";
import { runMcpStdio } from "./mcp.js";
import { cmdGraph } from "./commands/graph.js";
import { cmdMemory } from "./commands/memory.js";
import { cmdHook } from "./commands/hook.js";
import { cmdPlan, cmdDocs, cmdChangelog } from "./commands/docs.js";
import {
  cmdInit,
  cmdMigrate,
  cmdSync,
  cmdDoctor,
  cmdArchive,
  cmdValidate,
  cmdSetup,
  cmdStructure,
  cmdGrill,
  cmdReindex,
} from "./commands/harness.js";
import { cmdHelp } from "./commands/help.js";

const VERSION = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8"),
) as { version: string };

const [cmd, ...args] = process.argv.slice(2);
try {
  await main();
} catch (error) {
  // One catch for every command: a thrown Error prints as a clean one-liner and
  // exit 1, never a raw UnhandledRejection stack (e.g. export with a bad path).
  console.error(`zemory ${cmd ?? ""}: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

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
    cmdArchive();
    break;
  case "validate":
    cmdValidate();
    break;
  case "reindex":
    cmdReindex();
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
    await runMcpStdio();
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
    cmdSetup();
    break;
  case "--version":
  case "-v":
    console.log(`zemory ${VERSION.version}`);
    break;
  default:
    cmdHelp();
}
}
