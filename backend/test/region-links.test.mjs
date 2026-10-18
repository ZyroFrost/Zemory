// plan/29 §14b (user 2026-10-19): the workspace is the cluster; the role belongs to the template a repo is assembled from.
// The marker names only which repo is the owner and whose services it uses; conform checks both ends' template roles.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { findRegionRepo, regionLinkFindings, repoRole, templateRole } from "../../dist/docs/region-links.js";
import { assembleSet } from "../../dist/docs/kit-apply.js";
import { STORE_DIR } from "../../dist/docs/store.js";
import { tempDir } from "./helpers.mjs";

function put(root, rel, text) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
}

// a store whose templates carry roles, and one set per template
function store(t) {
  const root = tempDir(t, "zemory-roles-store-");
  execFileSync("git", ["init", "-q"], { cwd: root, windowsHide: true });
  const s = join(root, "_Store");
  put(s, "02_STRUCTURE/_Slot/03-1_entry/SLOT.md", "---\nid: 03-1\nname: entry\nversion: 1\npath: AGENTS.md\n---\n# entry\n");
  const struc = (id, role) => {
    put(s, `02_STRUCTURE/${id}/STRUCTURE.md`, `---\nid: ${id}\nname: ${id.toLowerCase()}\nversion: 1\nprofile: non-app\n---\n# ${id}\n`);
    put(s, `02_STRUCTURE/${id}/structure.json`, JSON.stringify({ slots: ["03-1_entry"], role }));
  };
  struc("Struc_Repo_WorkspaceManager", { name: "workspace-manager", manages: ["dept"], managed_by: [], owner: "none", provides: ["data", "mail"] });
  struc("Struc_Repo_Dept", { name: "dept", manages: [], managed_by: ["workspace-manager"], owner: "required", provides: [] });
  struc("Struc_Repo_LogCenter", { name: "log-center", manages: [], managed_by: [], owner: "none", provides: ["log"] });
  struc("Struc_Repo_App", { name: "app", manages: [], managed_by: ["system-manager"], owner: "optional", provides: [] });
  const sets = [["01", "01_IDE_WorkspaceManager_Memory", "Struc_Repo_WorkspaceManager"], ["02", "02_IDE_Dept_Memory", "Struc_Repo_Dept"],
    ["03", "03_IDE_LogCenter_Memory", "Struc_Repo_LogCenter"], ["04", "04_IDE_App_Memory", "Struc_Repo_App"]];
  for (const [no, name, structure] of sets) {
    assembleSet({ no, name, structure, tier: "Memory", host: "IDE", status: "built", legacy: [], requires: [], tools: [], constitution: [], rules: [], skills: [] }, s);
  }
  return s;
}

function workspace(t) {
  const w = tempDir(t, "zemory-workspace-");
  const repo = (rel, marker) => {
    put(w, `${rel}/docs/.harness.json`, JSON.stringify({ docs: "docs/agent", ...marker }));
    return join(w, rel);
  };
  return {
    dw: repo("_DB_DataWarehouse", { kit: "01_IDE_WorkspaceManager_Memory" }),
    log: repo("_DB_Log", { kit: "03_IDE_LogCenter_Memory" }),
    raw: repo("_DB_AppCore", {}),
    good: repo("Dept_A", { kit: "02_IDE_Dept_Memory", owner: "_DB_DataWarehouse", uses: { data: "_DB_DataWarehouse", mail: "_DB_DataWarehouse", log: "_DB_Log" } }),
    noOwner: repo("Dept_B", { kit: "02_IDE_Dept_Memory" }),
    wrongOwner: repo("Dept_C", { kit: "02_IDE_Dept_Memory", owner: "_DB_Log" }),
    twoOwners: repo("Dept_D", { kit: "02_IDE_Dept_Memory", owner: ["_DB_DataWarehouse", "_DB_Log"] }),
    wrongKind: repo("Dept_E", { kit: "02_IDE_Dept_Memory", owner: "_DB_DataWarehouse", uses: { glossary: "_DB_Log" } }),
    ghost: repo("Dept_F", { kit: "02_IDE_Dept_Memory", owner: "Nowhere" }),
    oldRole: repo("Dept_G", { kit: "02_IDE_Dept_Memory", owner: "_DB_DataWarehouse", role: "dept" }),
    pendingOwner: repo("Dept_H", { kit: "02_IDE_Dept_Memory", owner: "_DB_AppCore" }),
    ownedTop: repo("_Other_Manager", { kit: "01_IDE_WorkspaceManager_Memory", owner: "_DB_Log" }),
    guestApp: repo("_Project/Vendor/Cam", { kit: "04_IDE_App_Memory" }),
    noSet: repo("Loose", { owner: "Whatever" }),
  };
}

test("every repo template of the real store carries its role; the workspace keeps no role table", () => {
  const S = join(STORE_DIR, "02_STRUCTURE");
  const want = { Struc_Repo_WorkspaceManager: "workspace-manager", Struc_Repo_Dept: "dept", Struc_Repo_SystemManager: "system-manager",
    Struc_Repo_App: "app", Struc_Repo_AppData: "app-data", Struc_Repo_LogCenter: "log-center", Struc_Repo_Reference: "reference", Struc_Repo_NonApp: "non-app" };
  for (const [s, name] of Object.entries(want)) assert.equal(templateRole(join(S, s))?.name, name, s);
  assert.deepEqual(templateRole(join(S, "Struc_Repo_WorkspaceManager")).manages, ["dept"]);
  assert.ok(templateRole(join(S, "Struc_Repo_WorkspaceManager")).provides.includes("mail"), "the mail store is a service of the manager");
  assert.deepEqual(JSON.parse(readFileSync(join(S, "Struc_Region_Workspace", "structure.json"), "utf8")).roles, undefined);
  assert.ok(JSON.parse(readFileSync(join(S, "Struc_Repo_WorkspaceManager", "structure.json"), "utf8")).slots.includes("Config_139_Mail"),
    "the mail slot sits only in the manager's template");
  assert.ok(!JSON.parse(readFileSync(join(S, "Struc_Repo_Dept", "structure.json"), "utf8")).slots.includes("Config_139_Mail"));
});

test("a repo is found by name up the workspace, nested two levels deep (_Project/Vendor/<app>)", (t) => {
  const w = workspace(t);
  assert.equal(findRegionRepo("_DB_Log", w.good), w.log);
  assert.equal(findRegionRepo("Cam", w.good), w.guestApp);
  assert.equal(findRegionRepo("Nowhere", w.good), null);
});

test("region-links: the role comes from the template; right declarations pass, every wrong one is named", (t) => {
  const s = store(t);
  const w = workspace(t);
  const f = (root) => regionLinkFindings(root, s);
  const wrong = (root) => f(root).wrong.join(" | ");
  assert.equal(repoRole(w.good, s)?.name, "dept", "the set's template gives the role");
  assert.equal(wrong(w.good), "", "a department under the manager, using its data and mail and the log center");
  assert.equal(wrong(w.dw), "", "the manager names no owner");
  assert.equal(wrong(w.guestApp), "", "an app with no owner and no service: a guest, nothing to declare");
  assert.match(wrong(w.noOwner), /a dept must name its owner/);
  assert.match(wrong(w.wrongOwner), /owner "_DB_Log" \(log-center\) does not manage a dept/);
  assert.match(wrong(w.twoOwners), /one owner only/);
  assert.match(wrong(w.wrongKind), /uses\.glossary "_DB_Log" \(log-center\) does not provide glossary/);
  assert.match(wrong(w.ghost), /owner "Nowhere" is no repo of this workspace/);
  assert.match(wrong(w.oldRole), /the marker key "role" is gone/);
  assert.match(wrong(w.ownedTop), /has no owner \(its template says owner: none\)/);
  assert.equal(wrong(w.pendingOwner), "", "an owner not on a template yet is not wrong");
  assert.match(f(w.pendingOwner).pending.join(" | "), /owner "_DB_AppCore" is assembled from no template yet/);
  assert.deepEqual(f(w.noSet), { wrong: [], pending: [] }, "a repo on no set is not judged");
});

test("sync drops the old marker key role (the template gives it); owner and uses stay", async (t) => {
  const { applyKit } = await import("../../dist/docs/kit-apply.js");
  const root = tempDir(t, "zemory-role-drop-");
  execFileSync("git", ["init", "-q"], { cwd: root, windowsHide: true });
  applyKit(root, { kitRef: "05", apply: true });
  const mf = join(root, "docs", ".harness.json");
  const m = JSON.parse(readFileSync(mf, "utf8"));
  writeFileSync(mf, JSON.stringify({ ...m, role: "dept", owner: "_DB_DataWarehouse", uses: { data: "_DB_DataWarehouse" } }, null, 2));
  applyKit(root, { apply: true });
  const after = JSON.parse(readFileSync(mf, "utf8"));
  assert.equal(after.role, undefined, "role is gone");
  assert.equal(after.owner, "_DB_DataWarehouse");
  assert.deepEqual(after.uses, { data: "_DB_DataWarehouse" });
});
