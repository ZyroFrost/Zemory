---
id: Rule_77
name: colours-from-theme
version: 1
kind: content
code: 05_Domain
checked: [Skill_App_Glass, Skill_App_SneatGlass, Skill_App_Shell, Rule_Gate_76_DeployChecksFrame]
from: _Store/01_LAW/_Rule/05_Domain/Rule_Gate_77_ColoursFromTheme @v1 #84c10288db90
---
# Rule_Gate_77_ColoursFromTheme — Every colour of an app comes from the theme's tokens

## What
An app of a family wears the frame's theme: the person picks a tone (Settings) and every colour of the page follows it - a
button on, a switch on, a link, a table, the scrollbar. A colour written as a literal (`#hex`, `rgb()`, `rgba()`, `hsl()`)
in a stylesheet never follows: it stays the same in every tone, light and dark. So a stylesheet of an app, or of the frame,
writes no colour literal: it takes the frame's tokens.

## When
- Writing or changing a stylesheet (`.css`, `.scss`, `.less`) of an app or of the frame.

## Do
1. Take a token: `var(--g-accent)`, `var(--g-accent-2)`, `rgba(var(--g-accent-rgb), .16)`, `var(--g-on-accent)` (words on
   an accent fill), `var(--g-text)`, `var(--g-muted)`, `var(--g-pop)`, `var(--g-solid)`, `rgba(var(--g-shade-rgb), .3)` (a
   shadow), `rgba(var(--g-light-rgb), .5)` (a highlight), the status pairs `--g-good` · `--g-warn` · `--g-danger`.
2. A token the frame lacks ⇒ ask the system manager to add it to the frame; never a literal in the app.
3. A colour that must not follow the tone - a brand logo, the official colours of a sign-in button, a page that keeps one fixed
   look - carries a comment on its line: `/* theme-fixed: <why> */`.
4. A token's own definition (`--x: #…`), the frame's wallpaper swatches (`.sw[data-w]`), a mask and a `url(#id)` are not
   colours of the page and pass.

## Example
- Situation: an app styles its chosen row.
- ✗ Wrong: `tr.on { background: rgba(124, 196, 255, .16); }` - the base blue, also under the brand's red tone.
- ✓ Right: `tr.on { background: rgba(var(--g-accent-rgb), .16); }` - the chosen tone's accent, light and dark.

## Check
- Hook: a Write or Edit that adds a line with a colour literal to a stylesheet is blocked, with the line and the tokens to
  take; a line marked `theme-fixed:` passes. Lines already there are left alone until they are changed.
- The frame's own tests red any colour literal in its stylesheets (proven on planted faults); the shared probe of the kind
  switches the tone in the browser and reds a page whose accent surfaces keep one colour.
