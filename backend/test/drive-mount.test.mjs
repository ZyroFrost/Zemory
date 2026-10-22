// Docker on Windows (plan/30 §3i): a Drive folder from a Windows drive letter reaches the container as a 9p mount. When
// Google Drive comes up after WSL the mount misses and Docker binds an empty folder of its own - the probe says so.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { tempDir } from "./helpers.mjs";

const { mountTypeOf, probeDriveFs } = await import("../../dist/jobs/driveprobe.js");

const TABLE = [
  "overlay / overlay rw 0 0",
  "/dev/sdf /home/node/zemory ext4 rw 0 0",
  "G: /host/drive 9p ro,aname=drvfs;path=G: 0 0",
  "/dev/sdf /host/empty\\040drive ext4 rw 0 0",
].join("\n");

test("the mount holding a path is the longest mount point that prefixes it", () => {
  assert.equal(mountTypeOf("/host/drive/channel/a.enc", TABLE), "9p");
  assert.equal(mountTypeOf("/host/drive", TABLE), "9p");
  assert.equal(mountTypeOf("/home/node/zemory/data", TABLE), "ext4");
  assert.equal(mountTypeOf("/host/empty drive/x", TABLE), "ext4", "an escaped space in a mount point");
  assert.equal(mountTypeOf("/host/drivex", TABLE), "overlay", "NEGATIVE: a prefix that is not a whole segment");
});

test("a Drive folder from Windows that is not a 9p mount is reported, not written to", (t) => {
  const dir = tempDir(t, "zemory-drive-");
  const prev = process.env.ZEMORY_DRIVE_FROM_WINDOWS;
  t.after(() => { if (prev === undefined) delete process.env.ZEMORY_DRIVE_FROM_WINDOWS; else process.env.ZEMORY_DRIVE_FROM_WINDOWS = prev; });
  process.env.ZEMORY_DRIVE_FROM_WINDOWS = String.raw`G:\My Drive\Global Memory`;
  const r = probeDriveFs(dir);
  if (process.platform === "linux") {
    assert.equal(r.writable, false);
    assert.match(r.error, /not mounted in the container/);
  } else {
    assert.equal(r.error, null, "no mounts table here (not Linux): the probe reads the folder as before");
  }
  delete process.env.ZEMORY_DRIVE_FROM_WINDOWS;
  assert.equal(probeDriveFs(dir).error, null, "natively nothing changes");
  assert.match(readFileSync(new URL("../../docker-compose.yml", import.meta.url), "utf8"), /ZEMORY_DRIVE_FROM_WINDOWS: "\$\{HOST_DRIVE_NATIVE:-\}"/);
});
