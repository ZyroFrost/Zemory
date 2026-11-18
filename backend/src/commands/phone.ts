// `zemory phone pair|ls|revoke` - phones that may hand work to this machine's agents (plan/41). A phone is a
// mail-only peer: it sends letters to <this host>/<repo> and reads the replies, nothing else.
//
//   pair <name>     pair (or re-pair) a phone; prints the pairing code ONCE - it carries the secret token
//   ls              paired phones (no tokens)
//   revoke <name>   forget a phone and remove this machine's Drive folders for it
import { hostname } from "node:os";
import { getDriveDir } from "../config/settings.js";
import { channelIdentity } from "../memory/channel/index.js";
import { listPhones, pairPhone, pairingCode, phoneHost, revokePhone } from "../memory/phone.js";

const USAGE = ["usage: zemory phone pair <name>", "       zemory phone ls", "       zemory phone revoke <name>"];

export function cmdPhone(args: string[]): void {
  const [verb, name] = args;
  if (verb === "pair" && name) {
    const p = pairPhone(name);
    const code = pairingCode({ name: p.name, host: hostname(), fp: channelIdentity().deviceId, token: p.token });
    console.log(`zemory phone pair - ${p.name} paired with ${hostname()} (replies go to ${phoneHost(p.name)}/phone)`);
    console.log("  Pairing code - enter it on the phone. It is shown once and opens this machine's mail with that phone:");
    console.log(`  ${code}`);
    console.log("  Pairing again gives a new code and cuts off the old one. Lost the phone: zemory phone revoke " + p.name);
    return;
  }
  if (verb === "ls") {
    const list = listPhones();
    if (!list.length) return void console.log("zemory phone ls - no phone paired. Pair one: zemory phone pair <name>");
    console.log(`zemory phone ls - ${list.length} phone(s) paired with ${hostname()}`);
    for (const p of list) console.log(`  ${p.name.padEnd(20)} paired ${p.createdAt.slice(0, 16).replace("T", " ")}  -> ${phoneHost(p.name)}/phone`);
    return;
  }
  if (verb === "revoke" && name) {
    const ok = revokePhone(name, { driveDir: getDriveDir() || undefined, deviceId: channelIdentity().deviceId });
    console.log(ok ? `zemory phone revoke - ${name} can no longer reach ${hostname()}` : `zemory phone revoke - no phone named ${name}`);
    if (!ok) process.exitCode = 1;
    return;
  }
  console.log(USAGE.join("\n"));
  if (verb) process.exitCode = 1;
}
