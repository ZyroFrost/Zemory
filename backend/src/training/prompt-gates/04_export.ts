// Step 04 of the prompt-gates model (plan/38 §8, HS slot Backend_174_Training): switch a self-trained model on or off, and
// answer the reminder hook at run time. Default is the regex for everyone; only a person who trained on their own GM and ran
// `--enable` gets model verdicts, and only for the doors where the model beat the regex on the held-out part.
// Every failure falls back to the regex (HP article 9): no enabled.json, no model file, another embedding profile, a rule
// whose text changed since the labels (ruleHash), an embedding that is slow or fails.
// Second machine (02-1): enabled.json and the model stay in data/ (outside git) on the machine that trained; another machine
// either trains on its own GM or copies 03_output/ by hand (the model carries no sentence).

import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { currentEmbedProfile, embedQuery } from "../../memory/embed.js";
import { promptMatches } from "../../docs/harness-names.js";
import { trainingDir } from "./01_pull.js";
import { centreInto, mlpForward, mlpOf, ruleHashOf, stackScore, type GateModel, type Mlp } from "./03_train.js";

export interface GateSwitch {
  version: 1;
  profile: string;
  model: string;
  enabledAt: string;
  /** the doors whose mode is not "regex" in the model when it was switched on */
  doors: string[];
}

const outDir = (dir: string): string => join(dir, "03_output");
export const switchPath = (dir = trainingDir()): string => join(outDir(dir), "enabled.json");
export const modelPath = (profile: string, dir = trainingDir()): string => join(outDir(dir), `model-${profile}.json`);

/** Switch the model of the current profile on: writes enabled.json listing the doors that use it. Throws without a model. */
export function enableGates(dir = trainingDir(), profile: string = currentEmbedProfile()): GateSwitch {
  const mp = modelPath(profile, dir);
  if (!existsSync(mp)) throw new Error(`no model for profile ${profile} (${mp}): run --fit first`);
  const model = JSON.parse(readFileSync(mp, "utf8")) as GateModel;
  const sw: GateSwitch = {
    version: 1, profile, model: `model-${profile}.json`, enabledAt: new Date().toISOString(),
    doors: model.doors.filter((d) => d.mode !== "regex").map((d) => d.part),
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

interface Runtime { sw: GateSwitch; model: GateModel; mlp: Mlp; key: string }
let cached: Runtime | null = null;

/** The switch and its model, re-read only when either file changes. Null = regex everywhere. */
export function loadGates(dir = trainingDir(), profile: string = currentEmbedProfile()): Runtime | null {
  try {
    const sp = switchPath(dir);
    if (!existsSync(sp)) return null;
    const sw = JSON.parse(readFileSync(sp, "utf8")) as GateSwitch;
    if (sw.version !== 1 || sw.profile !== profile || !Array.isArray(sw.doors) || !sw.doors.length) return null;
    const mp = join(outDir(dir), sw.model);
    if (!existsSync(mp)) return null;
    const key = `${sp}:${statSync(sp).mtimeMs}|${mp}:${statSync(mp).mtimeMs}`;
    if (cached?.key === key) return cached;
    const model = JSON.parse(readFileSync(mp, "utf8")) as GateModel;
    if (model.version !== 1 || model.profile !== profile || model.mean.length !== model.mlp.dim) return null;
    cached = { sw, model, mlp: mlpOf(model), key };
    return cached;
  } catch {
    return null;
  }
}

/** How long the hook waits for the embedding before it keeps the regex (plan/38 §8: round three measured p95 2 s). */
export function gateBudgetMs(): number {
  const v = Number(process.env.ZEMORY_GATE_BUDGET_MS);
  return Number.isFinite(v) && v > 0 ? v : 2500;
}

export interface DoorAsk { part?: string; dir?: string; re: string }

/**
 * Model verdicts for the doors the switch covers: part → fire or not. A door missing from the answer keeps its regex.
 * Never throws and never waits past the budget.
 */
export async function modelVerdicts(prompt: string, doors: DoorAsk[], opts: {
  dir?: string;
  profile?: string;
  budgetMs?: number;
  embed?: (t: string) => Promise<number[] | null>;
} = {}): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>();
  try {
    const profile = opts.profile ?? currentEmbedProfile();
    const rt = loadGates(opts.dir, profile);
    if (!rt || !prompt.trim()) return out;
    const on = new Set(rt.sw.doors);
    const col = new Map(rt.model.doors.map((d, i) => [d.part, i] as const));
    const asks = doors.filter((d): d is DoorAsk & { part: string } => {
      if (!d.part || !on.has(d.part) || !col.has(d.part)) return false;
      const door = rt.model.doors[col.get(d.part)!];
      return door.mode !== "regex" && door.ruleHash === ruleHashOf(d.dir, d.part, d.re);
    });
    if (!asks.length) return out;
    const embed = opts.embed ?? ((t: string) => embedQuery(t, profile as Parameters<typeof embedQuery>[1]));
    let timer: NodeJS.Timeout | undefined;
    const late = new Promise<null>((r) => { timer = setTimeout(() => r(null), opts.budgetMs ?? gateBudgetMs()); });
    const work = embed(prompt).catch(() => null);
    const v = await Promise.race([work, late]).finally(() => clearTimeout(timer));
    if (!v || v.length < rt.model.mean.length) return out;
    const x = new Float32Array(rt.model.mlp.dim);
    centreInto(v, rt.model.mean, x, 0);
    const logits = mlpForward(rt.mlp, x);
    for (const d of asks) {
      const door = rt.model.doors[col.get(d.part)!];
      const s = logits[col.get(d.part)!];
      const score = door.mode === "stack" && door.stack ? stackScore(door.stack, s, promptMatches(d.re, prompt) ? 1 : 0) : s;
      out.set(d.part, score >= door.threshold);
    }
  } catch {
    out.clear();
  }
  return out;
}
