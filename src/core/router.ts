import type { Capability, Context } from "./types.js";
import type { Registry } from "./registry.js";

/**
 * Routes a capability request to its single provider. The agent never picks a
 * provider directly — it asks for a capability ("search", "memory", ...) and the
 * router dispatches to whichever module fills that slot.
 */
export class Router {
  constructor(
    private registry: Registry,
    private ctx: Context,
  ) {}

  async call(cap: Capability, op: string, payload?: unknown): Promise<unknown> {
    const mod = this.registry.resolve(cap);
    if (!mod) throw new Error(`No provider registered for capability "${cap}".`);
    if (!mod.run) throw new Error(`Module "${mod.name}" (slot "${cap}") has no run().`);
    return mod.run(this.ctx, op, payload);
  }
}
