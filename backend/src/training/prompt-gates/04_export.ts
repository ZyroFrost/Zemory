// Step 04 of the prompt-gates model (plan/38 §8, HS slot Backend_174_Training): switch a self-trained model on or off, and
// answer the reminder hook at run time. Default is the regex for everyone; only a person who trained on their own GM and ran
// `--enable` gets model verdicts, and only for the doors where the model beat the regex on the held-out part.
// The model is the text n-gram one (gate-text.ts): a prompt is scored in ~0.2 ms in the hook's own thread, no embedding
// model, no daemon round trip. Every failure falls back to the regex (HP article 9): no enabled.json, no model file, a model
// of another kind, a rule whose text changed since the labels (ruleHash), any error.
// Second machine (02-1): enabled.json and the model stay in data/ (outside git) on the machine that trained; another machine
// either trains on its own GM or copies 03_output/ by hand (the model carries hashed grams, no sentence).

import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promptMatches } from "../../docs/harness-names.js";
import { trainingDir } from "./01_pull.js";
import { dot, f32, gramCounts, MODEL_FILE, ruleHashOf, stackScore, tfidf, type GateModel } from "./gate-text.js";

export interface GateSwitch {
  version: 2;
  model: string;
  enabledAt: string;
  /** the doors whose mode is not "regex" in the model when it was switched on */
  doors: string[];
}

const outDir = (dir: string): string => join(dir, "03_output");
export const switchPath = (dir = trainingDir()): string => join(outDir(dir), "enabled.json");
export const modelPath = (dir = trainingDir()): string => join(outDir(dir), MODEL_FILE);

/** Switch the trained model on: writes enabled.json listing the doors that use it. Throws without a model. */
export function enableGates(dir = trainingDir()): GateSwitch {
  const mp = modelPath(dir);
  if (!existsSync(mp)) throw new Error(`no model (${mp}): run --fit first`);
  const model = JSON.parse(readFileSync(mp, "utf8")) as GateModel;
  if (model.version !== 2 || model.kind !== "text-ngram") throw new Error(`${mp} is not a text model: run --fit again`);
  const sw: GateSwitch = {
    version: 2, model: MODEL_FILE, enabledAt: new Date().toISOString(),
    doors: model.doors.filter((d) => d.mode !== "regex" && d.w).map((d) => d.part),
  };
  mkdirSync(outDir(dir), { recursive: true });
  writeFileSync(switchPath(dir), JSON.stringify(sw, null, 2) + "\n", "utf8");
  return sw;
}

/** Back to the regex for every door. True when a switch was removed. */
export function disableGates(dir = trainingDir()): boolean {
  const p = switchPath(dir);
  if (!existsSync(p)) return false;
  rmSync(p);
  return true;
}

interface RuntimeDoor { mode: "text" | "stack"; threshold: number; stack?: GateModel["doors"][number]["stack"]; ruleHash: string; w: Float32Array; b: number }
interface Runtime { idf: Float32Array; bits: number; doors: Map<string, RuntimeDoor>; key: string }
let cached: Runtime | null = null;

/** The switch and its model, re-read only when either file changes. Null = regex everywhere. */
export function loadGates(dir = trainingDir()): Runtime | null {
  try {
    const sp = switchPath(dir);
    if (!existsSync(sp)) return null;
    const sw = JSON.parse(readFileSync(sp, "utf8")) as GateSwitch;
    if (sw.version !== 2 || !Array.isArray(sw.doors) || !sw.doors.length) return null;
    const mp = join(outDir(dir), sw.model);
    if (!existsSync(mp)) return null;
    const key = `${sp}:${statSync(sp).mtimeMs}|${mp}:${statSync(mp).mtimeMs}`;
    if (cached?.key === key) return cached;
    const model = JSON.parse(readFileSync(mp, "utf8")) as GateModel;
    if (model.version !== 2 || model.kind !== "text-ngram") return null;
    const on = new Set(sw.doors);
    const doors = new Map<string, RuntimeDoor>();
    for (const d of model.doors) {
      if (!on.has(d.part) || d.mode === "regex" || !d.w || typeof d.b !== "number") continue;
      doors.set(d.part, { mode: d.mode, threshold: d.threshold, stack: d.stack, ruleHash: d.ruleHash, w: f32(d.w), b: d.b });
    }
    if (!doors.size) return null;
    cached = { idf: f32(model.idf), bits: model.bits, doors, key };
    return cached;
  } catch {
    return null;
  }
}

export interface DoorAsk { part?: string; dir?: string; re: string }

/** Model verdicts for the doors the switch covers: part → fire or not. A door missing from the answer keeps its regex. */
export function modelVerdicts(prompt: string, doors: DoorAsk[], dir?: string): Map<string, boolean> {
  const out = new Map<string, boolean>();
  try {
    const rt = loadGates(dir);
    if (!rt || !prompt.trim()) return out;
    const asks = doors.filter((d) => {
      const door = d.part ? rt.doors.get(d.part) : undefined;
      return door !== undefined && door.ruleHash === ruleHashOf(d.dir, d.part!, d.re);
    });
    if (!asks.length) return out;
    const x = tfidf(gramCounts(prompt, rt.bits), rt.idf);
    for (const d of asks) {
      const door = rt.doors.get(d.part!)!;
      const s = dot(door.w, x) + door.b;
      const score = door.mode === "stack" && door.stack ? stackScore(door.stack, s, promptMatches(d.re, prompt) ? 1 : 0) : s;
      out.set(d.part!, score >= door.threshold);
    }
  } catch {
    out.clear();
  }
  return out;
}
