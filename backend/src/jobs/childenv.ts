// Environment for a BACKGROUND child that will load the ONNX embedder (scheduler steps, the
// machine-started sync round). One knob lives here so both spawn sites agree.

/**
 * Intra-op thread cap for background ONNX children.
 *
 * Why 4 and not "all cores" (measured 2026-09-07, 24 real windows, A/B/A/B, two rounds each,
 * i5-13420H = 4 P-cores + 4 E-cores): default (12 threads) used 6.5–6.8 cores and 386–404
 * CPU-seconds; 4 threads used 3.7–3.8 cores and **189–218 CPU-seconds** — half the CPU for the
 * same work — and was 5–12 % FASTER on wall time (2,091 vs 2,375 ms/window). On a hybrid CPU the
 * fast threads wait for the slow E-cores at every matmul barrier, so the extra threads burn
 * cycles without producing vectors. Vectors are identical to the last bit across thread counts
 * (max component diff 0.00e+0 on 8 real texts), so this touches cost only, never quality.
 *
 * Only for children the MACHINE starts. A user-started job ("Sync now", `zemory memory embed`
 * from a shell) keeps the runtime default — the user is sitting there waiting, and the
 * priority boundary plan/14 §3 draws for CPU priority applies here too. An explicit
 * `ZEMORY_ONNX_THREADS` in the daemon's own environment always wins.
 */
export const BACKGROUND_ONNX_THREADS = "4";

export function backgroundChildEnv(base: NodeJS.ProcessEnv, lowPriority: boolean): NodeJS.ProcessEnv {
  if (!lowPriority) return { ...base };
  return { ...base, ZEMORY_ONNX_THREADS: base.ZEMORY_ONNX_THREADS ?? BACKGROUND_ONNX_THREADS };
}
