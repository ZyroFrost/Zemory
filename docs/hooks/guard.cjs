// Forwarder left by the move to the folder harness (plan/28): sessions opened before the move still call this path.
// The guard itself lives beside rule 55 (agent/01_LAW/_Rule/Rule_Gate_55_ZemoryHookGuard/guard.cjs). Safe to delete once no such session is open.
require(require("node:path").join(__dirname, "..", "agent/01_LAW/_Rule/Rule_Gate_55_ZemoryHookGuard/guard.cjs"));
