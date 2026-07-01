import type { Capability, Module } from "./types.js";

/**
 * Holds modules keyed by capability slot. Enforces the core invariant:
 * one slot = one provider. Registering a second module for an occupied slot
 * throws — this is how "no duplicate capability" is structural, not manual.
 */
export class Registry {
  private bySlot = new Map<Capability, Module>();

  register(mod: Module): void {
    const existing = this.bySlot.get(mod.provides);
    if (existing && existing.name !== mod.name) {
      throw new Error(
        `Capability conflict: slot "${mod.provides}" is claimed by both ` +
          `"${existing.name}" and "${mod.name}". One slot = one provider.`,
      );
    }
    this.bySlot.set(mod.provides, mod);
  }

  resolve(cap: Capability): Module | undefined {
    return this.bySlot.get(cap);
  }

  all(): Module[] {
    return [...this.bySlot.values()];
  }
}
