// region_values.py — the reader of the workspace values that the PBI and VM-task tools import. Both cluster templates install
// it (Struc_Repo_Dept · Struc_Repo_WorkspaceManager); the two store copies must stay byte-equal. It must find the manager from
// a department repo (owner), from inside the manager itself (its values, or on the server copy its own warehouse .env), and
// from a department's server copy (the sibling holding the warehouse connection). Before 2026-10-19 the manager never found
// itself: task_run.py inside the warehouse repo lost its run-log connection.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { tempDir } from "./helpers.mjs";

const STRUC = join(import.meta.dirname, "..", "..", "docs_template", "_Store", "02_STRUCTURE");
const DEPT_COPY = join(STRUC, "Struc_Repo_Dept", "scripts", "region_values.py");
const MGR_COPY = join(STRUC, "Struc_Repo_WorkspaceManager", "scripts", "region_values.py");

test("the two store copies of region_values.py are byte-equal", () => {
  assert.equal(readFileSync(MGR_COPY, "utf8"), readFileSync(DEPT_COPY, "utf8"));
});

const python = ["python", "python3", "py"].find((p) => spawnSync(p, ["--version"], { windowsHide: true }).status === 0);

test("the manager is found from a dept repo, from itself, and on the server copies", { skip: !python && "no python" }, (t) => {
  const w = tempDir(t, "zemory-region-values-");
  const put = (rel, text) => { mkdirSync(dirname(join(w, rel)), { recursive: true }); writeFileSync(join(w, rel), text); };
  // work PC: the manager holds the values; a dept names it as owner and has an .env of its own without the connection
  put("pc/Mgr/data/region/values.json", JSON.stringify({ k: "v" }));
  put("pc/Mgr/docs/.harness.json", "{}");
  put("pc/Mgr/scripts/x.txt", "");
  put("pc/Dept_A/docs/.harness.json", JSON.stringify({ owner: "Mgr" }));
  put("pc/Dept_A/.env", "OTHER=1\n");
  put("pc/Dept_A/scripts/x.txt", "");
  // server: copies carry no marker and no data/region; the manager's copy has the warehouse .env
  put("vm/Mgr/.env", "WAREHOUSE_CONN=x\n");
  put("vm/Mgr/scripts/x.txt", "");
  put("vm/Dept_A/scripts/x.txt", "");
  const find = (from) => {
    const r = spawnSync(python, ["-c", "import sys; sys.path.insert(0, sys.argv[1]); import region_values as r; print(r.manager_root(sys.argv[2]) or '')",
      dirname(DEPT_COPY), join(w, from)], { encoding: "utf8", windowsHide: true, env: { ...process.env, DW_REPO: "" } });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim();
  };
  assert.equal(find("pc/Dept_A/scripts"), join(w, "pc", "Mgr"), "a dept finds its owner");
  assert.equal(find("pc/Mgr/scripts"), join(w, "pc", "Mgr"), "the manager finds itself by its values");
  assert.equal(find("vm/Mgr/scripts"), join(w, "vm", "Mgr"), "the manager's server copy finds itself by its warehouse .env");
  assert.equal(find("vm/Dept_A/scripts"), join(w, "vm", "Mgr"), "a dept's server copy finds the sibling holding the connection");
});
