// Which way this zemory runs (docs/plan/30 §0): the native install or the Docker image. The two are backups of each
// other - a machine uses ONE - and they never run at the same time (user 2026-10-22: twice the RAM, two stores written
// apart). The image sets ZEMORY_RUNTIME=docker; everything else is native. `/ping` says it, so each side can see the other.

export type Runtime = "native" | "docker";

export const RUNTIME: Runtime = process.env.ZEMORY_RUNTIME?.trim() === "docker" ? "docker" : "native";

/** The runtime a `/ping` body reports (a daemon from before this field is native). */
export function runtimeOf(ping: { runtime?: unknown } | null | undefined): Runtime {
  return ping?.runtime === "docker" ? "docker" : "native";
}

/** The other install answering on the zemory port, or null when it is this one (or nobody). */
export function foreignRuntime(ping: { app?: unknown; runtime?: unknown } | null | undefined): Runtime | null {
  if (!ping || ping.app !== "zemory") return null;
  const r = runtimeOf(ping);
  return r === RUNTIME ? null : r;
}

/** What to tell the user when the other install is running. */
export function otherRuntimeMessage(other: Runtime, port: number): string {
  const how = other === "docker"
    ? "stop it first: `docker compose stop` in the zemory folder (or Docker Desktop ▸ Containers ▸ zemory ▸ Stop)"
    : "stop it first: tray icon ▸ Quit (or end the zemory.exe process)";
  return `zemory (${other}) is already running on port ${port}. The native and Docker installs are backups of each other ` +
    `and never run at the same time - ${how}, then start this one again.`;
}
