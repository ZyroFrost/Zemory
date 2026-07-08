// The plugin contract: capability slots, lifecycle events, and the Module shape.
// Everything pluggable in zemory implements `Module`. The core never changes when
// a new capability is added — you add a module that fills a slot.

/** A capability slot. Exactly ONE provider (module) may fill each slot. */
export type Capability =
  | "memory"
  | "search"
  | "harness"
  | "health";

/** Lifecycle events the core emits; modules subscribe via `Module.hooks`. */
export type HookEvent =
  | "session_start"
  | "before_write"
  | "after_write"
  | "threshold"
  | "on_demand";

/** Per-project config, loaded from `.harness.json` at the project root. */
export interface HarnessConfig {
  /** Path to the project's docs harness, relative to project root. */
  docs: string;
  /** Which provider name fills each capability slot. */
  adapters: Partial<Record<Capability, string>>;
  /** Numeric thresholds (e.g. archive trigger line counts). */
  thresholds: Record<string, number>;
  /** Brownfield role mapping: role -> existing file (optional). */
  roles?: Record<string, string>;
}

/** Shared context handed to every module call. */
export interface Context {
  /** Absolute project root (dir containing .harness.json). */
  projectRoot: string;
  /** Absolute path to the docs harness dir. */
  docsDir: string;
  config: HarnessConfig;
  log: (msg: string) => void;
}

/** Result of a module health check (used by `zemory doctor`). */
export interface HealthReport {
  ok: boolean;
  detail: string;
}

/** A pluggable unit. Fills exactly one capability slot; may react to hooks. */
export interface Module {
  /** Unique module name (the provider name referenced in config.adapters). */
  name: string;
  /** The capability slot this module provides. */
  provides: Capability;
  /** Lifecycle events this module reacts to. */
  hooks?: HookEvent[];
  /** Optional one-time setup. */
  init?(ctx: Context): void | Promise<void>;
  /** Handle a lifecycle event the module subscribed to. */
  onHook?(event: HookEvent, ctx: Context, payload?: unknown): void | Promise<void>;
  /** On-demand invocation: the router routes capability calls here. */
  run?(ctx: Context, op: string, payload?: unknown): unknown | Promise<unknown>;
  /** Health check surfaced by `zemory doctor`. */
  check?(ctx: Context): HealthReport | Promise<HealthReport>;
}
