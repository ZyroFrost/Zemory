// build-stamp.mjs - write dist/build.json: the app version this dist/ was compiled at.
//
// Why: appVersion() reads package.json LIVE, so it always names the tree, never the code that is running. A daemon or CLI
// whose dist/ was built at a newer version than the zemory tree it writes into regenerated that tree's git-tracked hooks
// ahead of HEAD, and `git pull` then refused ("local changes would be overwritten") - measured on the second machine
// 21/11, twice, the stash equal to origin both times. guard-gen.ts reads this stamp to leave such a tree alone.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "build.json"), JSON.stringify({ version: String(version ?? "") }) + "\n");
