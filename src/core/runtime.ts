import { builtinModules } from "../modules/index.js";
import { HookBus } from "./hooks.js";
import { Registry } from "./registry.js";
import { Router } from "./router.js";
import type { Capability, Context, Module } from "./types.js";

const DEFAULT_PROVIDERS: Record<Capability, string> = {
  memory: "global",
  search: "keyword",
  harness: "docs",
  health: "core",
};

export interface Runtime {
  registry: Registry;
  router: Router;
  hooks: HookBus;
}

/** Resolve exactly one configured provider for every capability slot. */
export function createRuntime(ctx: Context, available: Module[] = builtinModules): Runtime {
  const registry = new Registry();
  for (const capability of Object.keys(DEFAULT_PROVIDERS) as Capability[]) {
    const selected = ctx.config.adapters[capability] ?? DEFAULT_PROVIDERS[capability];
    const provider = available.find(
      (candidate) => candidate.provides === capability && candidate.name === selected,
    );
    if (!provider) {
      const choices = available
        .filter((candidate) => candidate.provides === capability)
        .map((candidate) => candidate.name)
        .join(", ");
      throw new Error(
        `Unknown provider "${selected}" for ${capability}. Available: ${choices || "none"}.`,
      );
    }
    registry.register(provider);
  }
  return {
    registry,
    router: new Router(registry, ctx),
    hooks: new HookBus(registry.all()),
  };
}
