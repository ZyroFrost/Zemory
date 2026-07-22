// Folder-tree view of a project annotated with the standard slot dictionary
// (docs/agent/03_STRUCTURE §3/§4). Powers the UI VSCode-like tree in the
// project Graph sub-tab: shows the REAL folders that exist, labels each with its
// standard role, and flags any that are not part of the standard — so the tree
// doubles as a folder-structure conformance check.
//
// Deterministic, 0 LLM (HP điều 6). It only READS the tree; it never moves files
// (reconcile is agent-driven — 03_STRUCTURE §8).

import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The standard slot dictionary — one line per concern, mirroring 03_STRUCTURE
 * §3/§4. Keyed by the single canonical folder name (the standard is "1 name per
 * concern"). Used both under backend/src (or a domain folder) and, for a few,
 * at repo root. Kept in English: these are structural/technical labels and the
 * slot names themselves are English (roles surface as tree tooltips).
 */
export const SLOT_ROLES: Record<string, string> = {
  // ── backend/src slots (§3) ──
  api: "endpoints this app exposes (REST/route + health-check)",
  graphql: "GraphQL schema + resolvers",
  realtime: "WebSocket / SSE realtime push",
  events: "inbound event/webhook consumers & listeners",
  functions: "serverless handlers (Lambda / Cloud Function)",
  commands: "CLI verbs (one file per verb)",
  middleware: "request pipeline: guard / cors / log / rate-limit",
  integrations: "clients calling EXTERNAL services (Stripe/Slack/S3…)",
  store: "data-access: driver + schema (DB); at-rest encryption",
  cache: "app cache layer (Redis/memcached + TTL/invalidate)",
  storage: "object/blob & file-upload handling",
  notifications: "email/SMS/push orchestration",
  services: "core business logic",
  ai: "AI provider interface + adapter (local/OpenAI/Anthropic)",
  agents: "agent loop: planning/reasoning/state-machine",
  tools: "tool definitions for an LLM to call (schema + binding)",
  evals: "quality measurement on a labelled corpus + gate",
  search: "index & retrieval (FTS/vector/Elastic)",
  pipelines: "multi-step ETL / ingest / batch",
  jobs: "background jobs / cron / queue",
  validators: "input validation/parsing (zod/pydantic/schema)",
  core: "composition root: DI/registry/router/runtime/lifecycle",
  auth: "authentication + authorization (login/jwt/role/policy)",
  vault: "encryption + keys: derive/encrypt/decrypt, credential vault",
  config: "config code (env→settings) + feature flags",
  logging: "logger (level/format/sink) + observability",
  audit: "security audit trail (who did what, when)",
  errors: "error types + one central handler/boundary",
  i18n: "localization: load locale + lookup + auto-translate",
  update: "self-update: check releases + download + apply",
  migrations: "DB migrations — one file per schema step",
  shared: "code + types shared BE↔FE (zod/consts/pure logic)",
  contracts: "API spec files (OpenAPI/proto/GraphQL-SDL)",
  plugins: "third-party extension points",
  modules: "domain/feature packages (domain-first unit)",
  util: "pure helpers only (format/date/string)",
  // ── backend siblings ──
  src: "where the code lives (Node); slots sit under here",
  test: "automated tests — only for logic that fails silently",
  scripts: "dev/build/ops/deploy scripts",
  infra: "IaC: k8s/helm/terraform/ansible",
  resources: "packaged tracked resources: prompts/sql/seed/locales",
  // ── harness docs structure ──
  agent: "harness docs: 01_CONSTITUTION → 06_CHANGES",
  plan: "numbered specs (NN_name.md; 00 = overview)",
  // ── domain folders (domain-first, §2) — zemory's own ──
  memory: "domain: global memory (store/ingest/search/digest/ai)",
  docs: "harness docs (agent/ + plan/) OR domain — by context",
  adapters: "per-host ingest adapters (Claude/Codex/…)",
  packaging: "packaging resources: exe/tray icons (.spec reads)",
  skills: "vendored skills: one folder per upstream repo, kept verbatim (03 §3)",
  prompts: "LLM prompt templates (tracked resource)",
  // ── frontend slots (§3) ──
  assets: "UI media: logo · icon · background · banner · font",
  components: "reusable UI components (incl. 3-size Dialog)",
  styles: "design tokens + shared CSS/theme",
  pages: "screens / routes",
  layouts: "page-frame layouts",
  state: "client state (Redux/Zustand)",
  hooks: "React hooks",
  locales: "UI translations (i18n)",
  public: "static files served as-is (favicon/robots/manifest)",
  types: "types (client-only, or shared under backend/src/shared)",
  // ── non-app deliverables (§7) ──
  sources: "source definitions: Power Query / connection spec / SQL",
  measures: "named DAX/metric library",
  queries: "named SQL/DAX/M — not inlined",
  notebooks: "exploratory analysis (.ipynb)",
  fixtures: "small sample data (tracked) to open a deliverable",
  reports: "BI report files (.pbix/.pbip/.twb)",
  models: "semantic/transform layer (dbt · tabular · DAX)",
  content: "docs-only: .md/.mdx that IS the product",
  design: "design source (.fig/.sketch/.psd)",
};

/** Top-level roles that differ from the src-slot meaning of the same name. */
const ROOT_ROLES: Record<string, string> = {
  backend: "server-side: your code + entry (100% yours)",
  frontend: "UI (pages/components/styles/assets)",
  docs: "zemory harness: agent/ (01→06) + plan/ + .harness.json",
  docs_visual: "human-only visual diagrams (agent does NOT read)",
  docs_template: "the blank standard shipped to other projects",
  external: "external repos cloned for reference (their code)",
  attic: "backup: removed code / pre-deploy snapshots",
  share: "encrypted cross-machine sync bundle (git-LFS)",
  config: "operator-editable config (YAML/TOML profiles)",
  contracts: "root API spec (multi-client/SDK)",
  bin: "CLI entry (npm: bin/<name> → dist/cli.js)",
};

/** Directories that are output/noise — never part of the standard tree view. */
const IGNORE = new Set([
  "node_modules", ".git", "dist", "build", "coverage", ".venv", "__pycache__",
  "data", "generated", ".turbo", ".next", ".cache", "models",
]);

/**
 * Folders shown but not descended into: backups / vendored / template mirrors.
 * Their internals are not part of the LIVE standard structure, so recursing just
 * adds noise (attic is a graveyard; docs_template mirrors the standard anyway).
 */
const NO_RECURSE = new Set(["attic", "external", "docs_template"]);

export interface TreeNode {
  name: string;
  /** repo-relative path with forward slashes */
  path: string;
  /** the standard slot this folder maps to, if recognized */
  slot?: string;
  /** one-line role from the dictionary, if recognized */
  role?: string;
  /** true when the folder name is a known standard slot */
  known: boolean;
  children: TreeNode[];
}

// Deep enough for real repos (backend/src/<domain>/<slot>/<sub> is depth 4 and
// was getting CLIPPED at the old limit of 4 — the tree read as "merged short").
const MAX_DEPTH = 6;

function roleFor(name: string, depth: number): { slot?: string; role?: string; known: boolean } {
  // Root level prefers the root-specific meaning; deeper levels use the slot dict.
  if (depth === 0 && ROOT_ROLES[name]) return { slot: name, role: ROOT_ROLES[name], known: true };
  if (SLOT_ROLES[name]) return { slot: name, role: SLOT_ROLES[name], known: true };
  if (ROOT_ROLES[name]) return { slot: name, role: ROOT_ROLES[name], known: true };
  return { known: false };
}

function walk(absDir: string, relDir: string, depth: number): TreeNode[] {
  if (depth > MAX_DEPTH) return [];
  let entries: string[];
  try {
    entries = readdirSync(absDir);
  } catch {
    return [];
  }
  const nodes: TreeNode[] = [];
  for (const name of entries) {
    if (name.startsWith(".") || IGNORE.has(name)) continue;
    const abs = join(absDir, name);
    try {
      if (!statSync(abs).isDirectory()) continue;
    } catch {
      continue;
    }
    const rel = relDir ? relDir + "/" + name : name;
    const meta = roleFor(name, depth);
    const children = NO_RECURSE.has(name) ? [] : walk(abs, rel, depth + 1);
    nodes.push({ name, path: rel, ...meta, children });
  }
  // Known slots first, then alphabetical — mirrors how the standard reads.
  nodes.sort((a, b) => (a.known === b.known ? a.name.localeCompare(b.name) : a.known ? -1 : 1));
  return nodes;
}

export interface FolderTree {
  root: string;
  /** slots present (recognized) vs unknown folder names, deduped by slot name */
  usedSlots: string[];
  unknownDirs: string[];
  tree: TreeNode[];
}

/** Build the annotated folder tree for a project root. */
export function buildFolderTree(root: string): FolderTree {
  const tree = existsSync(root) ? walk(root, "", 0) : [];
  const used = new Set<string>();
  const unknown: string[] = [];
  const visit = (n: TreeNode) => {
    if (n.known && n.slot) used.add(n.slot);
    else unknown.push(n.path);
    n.children.forEach(visit);
  };
  tree.forEach(visit);
  return {
    root,
    usedSlots: [...used].sort(),
    unknownDirs: unknown,
    tree,
  };
}
