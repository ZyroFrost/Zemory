import type { Context, HookEvent, Module } from "./types.js";

/**
 * Dispatches lifecycle events to the modules that subscribed to them.
 * Modules attach by listing events in `Module.hooks` and implementing `onHook`.
 */
export class HookBus {
  constructor(private modules: Module[]) {}

  async emit(event: HookEvent, ctx: Context, payload?: unknown): Promise<void> {
    for (const mod of this.modules) {
      if (mod.hooks?.includes(event) && mod.onHook) {
        await mod.onHook(event, ctx, payload);
      }
    }
  }
}
