---
id: Skill_App_Glass
name: app-glass
version: 2
type: process
checked: [Skill_App_Base, Skill_PBI_White, Design_172_Design]
installs: [scripts/fx_check.mjs]
description: The Glass kind of an app surface - translucent panels over a coloured wallpaper, light and dark, a switch to solid panels. Use when a repo declares {"style": "Glass"} in frontend/config/ui.json, or when building, porting or changing colours, fonts, spacing, shadows, blur, animations or icons of a Glass app. The rules every kind shares are in app-base. Vietnamese triggers - "kiểu glass", "kính mờ", "giao diện glass", "đổi màu theme", "hiệu ứng", "bóng đổ", "blur".
---

# app-glass — the Glass kind of an app surface

> A KIND skill, in the mould of the Power BI kinds: `app-base` holds what every app follows whatever it looks like; this skill
> holds only what makes a surface Glass. It names the token keys and the effects; the real values live in the approved template
> and in the repo's `frontend/styles/`, never copied here.

## 0. Choosing the kind

- A repo with a UI declares its ONE kind in `frontend/config/ui.json`: `{"style": "Glass"}`. No declaration ⇒ no kind skill
  applies, only `app-base`.
- A new kind (another look) is a new skill `Skill_App_<Kind>` beside this one, with the same sections; a repo never mixes two
  kinds on one surface.
- The direction is settled BEFORE any code: a surface built "to be styled later" falls back to a generic look and is redone.

## 1. The source of the kind

- The approved Glass template lives in the organisation's design repo (slot `Design_172_Design`, `Web_Template/`). It is the
  ONE source of every token value and every effect; a running app ports from it, never from another app's copy.
- A repo carries the ported tokens and effects in `frontend/styles/` (one file for the kind, e.g. `glass.css`), the page CSS
  in its own files. Two apps that disagree ⇒ both are checked against the template, not against each other.
- A change of look is made in the template first, approved (`Rule_Keys_62_DesignChangeApproval`), then ported.

## 2. Tokens — the keys a Glass surface carries

Every colour, size, curve and duration is a CSS variable with the `--g-` prefix, declared once at `:root`; a literal in a rule
is a bug (`app-base`, tokens). Each theme redeclares the WHOLE set.

| group | keys | rule |
|---|---|---|
| ground and text | `--g-bg` · `--g-text` · `--g-muted` | contrast of text on the glass layer meets WCAG AA in both themes |
| glass layers | `--g-glass` · `--g-glass-strong` · `--g-edge` · `--g-edge-soft` · `--g-dim` | the strong layer is what a panel falls back to without blur |
| depth | `--g-shadow` · `--g-blur` | one shadow token per elevation; blur only through the token |
| accent and states | `--g-accent` · `--g-accent-2` · `--g-good` · `--g-warn` · the brand colour | a state colour never doubles as an accent (`app-base` F11) |
| wallpaper | `--g-blob-a` · `--g-blob-b` · `--g-blob-c`, one tone set per `data-wall` value | the default tone is the brand's; others are choices |
| type | `--g-font` (one family with a system fallback) + one size scale | no second family on a page |
| motion | `--g-spring` · `--g-out` (the two curves) | durations stay in the 0.2–0.8 s band of the template |

- **Light and dark:** `[data-theme="light"]` redeclares every ground, glass, depth, accent and state key; a key missing from one
  theme shows the other theme's value — measure both.
- **Spacing, radius and density** follow the template's scale; a new value joins the scale, never a one-off number.

## 3. Effects

The template names each effect with an `FX:` marker; a port keeps the marker so the two can be compared line by line.

| effect | what it does | rule |
|---|---|---|
| wallpaper | blurred colour blobs behind the shell, drifting slowly | fixed, behind everything, never catches a click |
| glass | translucent panel with `backdrop-filter` blur and an edge line | readable over every wallpaper tone, both themes |
| pill · switch | the moving highlight of a tab row · a toggle | one engine for every pill |
| tooltip · popover · toast | floating layers | a popover is OPAQUE (`app-base` F18); a toast never covers a control |
| route · reveal · ripple · progress | page change · content entering · press feedback · load bar | short; never delays input |

- **EVERY effect of the template is ported - none goes missing.** The table above names the shell effects only; the
  template carries more (charts, lens, tilt, palette, timeline...), and each one comes over with its `FX:` marker on the
  code that carries it. Not porting one is a decision: it is written in `frontend/config/ui.json` `fx_dropped` with the
  reason and who approved it; nothing else counts. Effects that belong to a page are ported with that page, never left
  for later without that entry.
- **The solid switch:** a visible setting turns blur off (`html.solid`): panels take `--g-glass-strong` (dark: an opaque
  colour), no `backdrop-filter`. Low-power machines and remote desktops use it; it is saved like any UI setting (`app-base` F8).
- **Reduced motion:** under `@media (prefers-reduced-motion: reduce)` every effect above that moves (drift · pill · route ·
  reveal · ripple · toast slide · tooltip lift) stops or becomes an instant change. One block per effect file covers all of them;
  an effect added later is added to that block in the same change.
- **Supplied artwork** (logos, pictures) keeps its own colours over glass (`app-base` F20): no blend mode, no filter on it.
- **Icons:** one icon set, one stroke width and one size scale across the app; an icon-only button still carries a label
  (`app-base` F4 ②).

## 4. Check

- `scripts/fx_check.mjs` (installed by this skill) lists every `FX:` marker of the template named in
  `frontend/config/ui.json` (`{"style": "Glass", "template": "<path>"}`) and every marker in `frontend/src`: a template
  effect the app does not carry and has not dropped with a reason is red (exit 1); a dropped entry without a reason, or for
  an effect that is in fact ported, is red too. `--self-test` judges six built-in cases. A marker proves the port, not that
  the effect runs: the repo's own browser test measures each effect running.
- `scripts/ui_check.mjs` of `app-base` runs on every page at every width, in both themes and with the solid switch on.
- Every `--g-` key used in a rule is declared at `:root` and again in `[data-theme="light"]` where the template declares it:
  compare the two key lists of the repo's kind file with the template's.
- `prefers-reduced-motion`: open the app with the system setting on; nothing drifts, slides or springs. Accepted by EYE, not yet
  by a checker code.

## Implements · Thi hành luật
- `Rule_Keys_62_DesignChangeApproval` — the look of a kind is approved in the template before it is ported · kiểu được duyệt trên template trước khi chép sang app
