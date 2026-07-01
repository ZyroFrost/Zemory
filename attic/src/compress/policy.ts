// Compression kill switch + mode. `ZEMORY_COMPRESS` governs the whole compress
// capability WITHOUT touching capture/memory (plan 03 §14). Reading the env here
// lets the pure compress() honor a single global off switch; the value is read
// live (never cached) so a kill switch takes effect immediately, mid-session.
//
//   off          → every compressor returns input verbatim (fail-open passthrough)
//   conservative → only large test/build/log output is compacted (handlers: phase C)
//   balanced     → default
//
// `conservative` is accepted now but behaves like `balanced` until the phase-C
// admission policy lands; it is reserved so the rollout profile is stable.

export type CompressMode = "off" | "conservative" | "balanced";

export function compressMode(): CompressMode {
  const v = process.env.ZEMORY_COMPRESS?.trim().toLowerCase();
  if (v === "off" || v === "0" || v === "false") return "off";
  if (v === "conservative") return "conservative";
  return "balanced";
}

/** True when compression is killed; callers must pass output through verbatim. */
export function compressionOff(): boolean {
  return compressMode() === "off";
}
