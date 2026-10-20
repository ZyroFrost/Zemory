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
  struc("Struc_Repo_AppData", { name: "app-data", manages: [], managed_by: ["system-manager"], owner: "required", provides: ["app-data"] });
  struc("Struc_Repo_SystemManager", { name: "system-manager", manages: ["app", "app-data"], managed_by: [], owner: "none", provides: [] });
  const sets = [["01", "01_IDE_WorkspaceManager_Memory", "Struc_Repo_WorkspaceManager"], ["02", "02_IDE_Dept_Memory", "Struc_Repo_Dept"],
    ["03", "03_IDE_LogCenter_Memory", "Struc_Repo_LogCenter"], ["04", "04_IDE_App_Memory", "Struc_Repo_App"],
    ["05", "05_IDE_AppData_Memory", "Struc_Repo_AppData"], ["06", "06_IDE_SystemManager_Memory", "Struc_Repo_SystemManager"]];
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

test("a required owner no repo of the workspace can be yet is advisory; once a manager exists it is red", (t) => {
  const s = store(t);
  const w = tempDir(t, "zemory-appdata-");
  put(w, "_DB_AppCore/docs/.harness.json", JSON.stringify({ docs: "docs/agent", kit: "05_IDE_AppData_Memory" }));
  put(w, "_Project/ERP/AppA/docs/.harness.json", JSON.stringify({ docs: "docs/agent", kit: "04_IDE_App_Memory" }));
  const core = join(w, "_DB_AppCore");
  assert.equal(regionLinkFindings(core, s).wrong.join(" | "), "", "no system-manager in the workspace: the owner cannot be named yet");
  assert.match(regionLinkFindings(core, s).pending.join(" | "), /app-data names no owner — no repo of the workspace is a system-manager yet/);
  put(w, "_Apps_Manager/docs/.harness.json", JSON.stringify({ docs: "docs/agent", kit: "06_IDE_SystemManager_Memory" }));
  assert.match(regionLinkFindings(core, s).wrong.join(" | "), /an app-data must name its owner|a app-data must name its owner/);
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

test("a manager syncs the repos it manages: owner named, or none named while it is the only manager; never another's or a malformed one", async (t) => {
  // user 2026-10-19: the manager fixes the standard and its sync reaches every repo it manages, each on its own set
  const { managedRepos, writeOwner } = await import("../../dist/docs/kit-sync.js");
  const s = store(t);
  const w = tempDir(t, "zemory-managed-");
  const repo = (rel, marker) => { put(w, `${rel}/docs/.harness.json`, JSON.stringify({ docs: "docs/agent", ...marker }, null, 2) + "\r\n"); return join(w, rel); };
  const dw = repo("_DB_DataWarehouse", { kit: "01_IDE_WorkspaceManager_Memory" });
  repo("_DB_Log", { kit: "03_IDE_LogCenter_Memory" });
  repo("Dept_A", { kit: "02_IDE_Dept_Memory", owner: "_DB_DataWarehouse" });
  const b = repo("Dept_B", { kit: "02_IDE_Dept_Memory" });
  repo("Dept_C", { kit: "02_IDE_Dept_Memory", owner: "_DB_Log" });
  repo("Dept_D", { kit: "02_IDE_Dept_Memory", owner: ["_DB_DataWarehouse", "_DB_Log"] });
  repo("Dept_N", {});
  const log = join(w, "_DB_Log");
  const got = managedRepos(dw, s);
  assert.deepEqual(got.repos.map((r) => [r.name, r.ownerMissing]), [["Dept_A", false], ["Dept_B", true]],
    "named owner and the unnamed one (only manager); another's, a list and a repo with no set are left");
  assert.deepEqual(got.ambiguous, []);
  assert.deepEqual(managedRepos(log, s), { repos: [], ambiguous: [] }, "a repo that manages nothing syncs nobody");
  assert.ok(writeOwner(b, "_DB_DataWarehouse"));
  const text = readFileSync(join(b, "docs", ".harness.json"), "utf8");
  assert.equal(JSON.parse(text).owner, "_DB_DataWarehouse");
  assert.equal(JSON.parse(text).kit, "02_IDE_Dept_Memory", "the other keys stay");
  assert.ok(text.endsWith("\r\n") && !/[^\r]\n/.test(text), "line ends kept");
  assert.deepEqual(managedRepos(dw, s).repos.map((r) => [r.name, r.ownerMissing]), [["Dept_A", false], ["Dept_B", false]]);
  // a second manager of the same role: an unnamed repo is no longer certain
  repo("_Other_Manager", { kit: "01_IDE_WorkspaceManager_Memory" });
  repo("Dept_E", { kit: "02_IDE_Dept_Memory" });
  const two = managedRepos(dw, s);
  assert.deepEqual(two.repos.map((r) => r.name), ["Dept_A", "Dept_B"], "named repos still follow their owner");
  assert.deepEqual(two.ambiguous, ["Dept_E"], "the machine does not guess between two managers");
});

test("a system manager two levels below the workspace reads the whole workspace and manages the app-data repo beside the DW", async (t) => {
  // 20/10: SasinHub (_Project/ERP) could not see _DB_AppCore (beside the DW) - the workspace was read from its own parent
  const { managedRepos } = await import("../../dist/docs/kit-sync.js");
  const { regionBase, regionRepos } = await import("../../dist/docs/region-links.js");
  const s = store(t);
  const w = tempDir(t, "zemory-sysman-");
  const repo = (rel, marker) => { put(w, `${rel}/docs/.harness.json`, JSON.stringify({ docs: "docs/agent", ...marker })); return join(w, rel); };
  repo("_DB_DataWarehouse", { kit: "01_IDE_WorkspaceManager_Memory" });
  const core = repo("_DB_AppCore", { kit: "05_IDE_AppData_Memory" });
  const hub = repo("_Project/ERP/Hub", { kit: "06_IDE_SystemManager_Memory" });
  const app = repo("_Project/ERP/Flow", { kit: "04_IDE_App_Memory" });
  assert.equal(regionBase(hub, s), w, "the base is the folder that holds the workspace manager");
  assert.ok(regionRepos(hub, s).includes(core));
  assert.deepEqual(managedRepos(hub, s).repos.map((r) => r.root).sort(), [app, core].sort());
  // without a workspace manager above, the base stays the repo's own parent
  const lone = tempDir(t, "zemory-lone-");
  put(lone, "a/b/docs/.harness.json", JSON.stringify({ docs: "docs/agent", kit: "04_IDE_App_Memory" }));
  assert.equal(regionBase(join(lone, "a", "b"), s), join(lone, "a"));
});
