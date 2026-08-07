#!/usr/bin/env node
// Chot pre-commit - chan secret vao staging, phu CA NGUOI lan agent.
// Sinh boi `zemory hook guard`; luat o policy.json canh file nay.
// Cach noi: .pre-commit-config.yaml (repo tu khai) -> entry `node <duong nay>`,
// hoac .git/hooks/pre-commit goi truc tiep.
"use strict";
const cp = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const POLICY = JSON.parse(fs.readFileSync(path.join(__dirname, "policy.json"), "utf8"));
function globToRe(pat) {
  return new RegExp("^" + pat.replace(/[.+^$(){}|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i");
}
const staged = cp.execSync("git diff --cached --name-only", { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
const bad = [];
for (const f of staged) {
  const name = f.replace(/\\/g, "/").split("/").pop() || "";
  if ((POLICY.secret_allow || []).some((p) => globToRe(p).test(name))) continue;
  if ((POLICY.secret_names || []).some((p) => globToRe(p).test(name))) bad.push(f);
}
if (bad.length) {
  process.stderr.write("CHAN (pre-commit): file khop mau secret trong staging - " + POLICY.secret_reason + "\n");
  for (const f of bad) process.stderr.write("  - " + f + "\n");
  process.exit(1);
}
process.exit(0);
