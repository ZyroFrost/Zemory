// Struc_Region_Workspace (user 2026-10-18): a repo declares its role, its one owner (solid line) and the services it uses by
// kind (dotted lines); conform checks them against the roles HS declares. A guest (a vendor area) belongs to no one.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { findRegionRepo, regionLinkFindings, regionRoles } from "../../dist/docs/region-links.js";
import { tempDir } from "./helpers.mjs";

function region(t) {
  const r = tempDir(t, "zemory-region-");
  const repo = (rel, marker) => {
    mkdirSync(join(r, rel, "docs"), { recursive: true });
    writeFileSync(join(r, rel, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", ...marker }));
    return join(r, rel);
  };
  return {
    dw: repo("_DB_DataWarehouse", { role: "region-manager" }),
    log: repo("_DB_Log", { role: "log-center" }),
    hub: repo("_Project/ERP/Hub", { role: "system-manager" }),
    good: repo("Dept_A", { role: "dept", owner: "_DB_DataWarehouse", uses: { data: "_DB_DataWarehouse", log: "_DB_Log" } }),
    app: repo("_Project/ERP/App1", { role: "app", owner: "Hub", uses: { log: "_DB_Log" } }),
    wrongOwner: repo("Dept_B", { role: "dept", owner: "_DB_Log" }),
    twoOwners: repo("Dept_C", { role: "dept", owner: ["_DB_DataWarehouse", "Hub"] }),
    wrongKind: repo("Dept_D", { role: "dept", owner: "_DB_DataWarehouse", uses: { glossary: "_DB_Log" } }),
    ghost: repo("Dept_E", { role: "dept", owner: "Nowhere" }),
    guest: repo("_Project/Vendor/Cam", { role: "guest" }),
    badGuest: repo("_Project/Vendor/Cam2", { role: "guest", owner: "Hub" }),
    oddRole: repo("Dept_F", { role: "boss" }),
    noRole: repo("Dept_G", {}),
  };
}

test("HS declares the roles, the guest among them", () => {
  const roles = regionRoles();
  for (const r of ["region-manager", "system-manager", "app-data", "log-center", "reference", "dept", "app", "guest"]) assert.ok(roles[r], r);
  assert.deepEqual(roles["region-manager"].manages, ["dept"]);
});

test("a repo is found by name up the workspace, nested two levels deep (_Project/ERP/<app>)", (t) => {
  const g = region(t);
  assert.equal(findRegionRepo("Hub", g.good), g.hub);
  assert.equal(findRegionRepo("_DB_Log", g.app), g.log);
  assert.equal(findRegionRepo("Nowhere", g.good), null);
});

test("region-links: the right declarations pass, every wrong one is named", (t) => {
  const g = region(t);
  const w = (root) => regionLinkFindings(root).wrong.join(" | ");
  assert.equal(w(g.good), "", "a department under the region manager, using its data and the log center");
  assert.equal(w(g.app), "", "an app under the system manager");
  assert.equal(w(g.guest), "", "a guest declares nothing else");
  assert.match(w(g.wrongOwner), /owner "_DB_Log" \(role log-center\) does not manage a dept/);
  assert.match(w(g.twoOwners), /one owner only/);
  assert.match(w(g.wrongKind), /uses\.glossary "_DB_Log" \(role log-center\) does not provide glossary/);
  assert.match(w(g.ghost), /owner "Nowhere" is no repo of this workspace/);
  assert.match(w(g.badGuest), /a guest belongs to no one/);
  assert.match(w(g.oddRole), /role "boss" is not a role/);
  assert.deepEqual(regionLinkFindings(g.noRole).wrong, []);
  assert.equal(regionLinkFindings(g.noRole).missing.length, 1, "no role yet: named, advisory");
});
