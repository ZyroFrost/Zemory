---
id: Rule_98
name: figure-card-tone
version: 1
kind: action
code: 05_Domain
checked: [Skill_App_Report, Skill_App_SneatGlass, Rule_Gate_97_BarOneSize]
from: _Store/01_LAW/_Rule/05_Domain/Rule_Gate_98_FigureCardTone @v1 #d7387d19f06d
---
# Rule_Gate_98_FigureCardTone — A figure card wears the tinted fill of its tone

## What
On a report page of an app of a Sneat or Glass kind, every figure card (`.kpi-card` in a card row) carries a tone
(`data-tone`, one slot of the theme, card *i* → slot *i*) and is filled with it: a pastel - the slot colour at a low alpha
(`--tone-bg`) - with the words in the text colour and the icon in the full slot colour. Never the bare glass of the frame,
never white, never the tone shown only as a stripe or a border on one side (the user 09/11, through an app of the family:
the frame's glass had painted over the figure cards' own fill, "cái này là skill, nên có hook cho skill").

## When
- Writing or editing a style rule (`.css` · `.scss` · `.less`) whose selector ends on a figure card (`.kpi-card`, a
  `[data-tone]` card) in a repo whose `frontend/config/ui.json` declares a Sneat or Glass style.
- Adding a figure card to a report page.

## Do
1. The card carries `data-tone="<slot>"`; its style takes `background: var(--tone-bg)` (or the slot colour mixed down to a
   pastel), in both themes.
2. The tone is never an edge: no `border-left` / `border-top` stripe, no coloured border alone.
3. The frame keeps the fill of a card that carries `data-tone` (its glass falls on cards without one); an app never raises
   a selector's weight to win it back.
4. The shared rule `rp-card-tone` of `scripts/report_layout_check.mjs` (skill app-report) runs on every report page in the
   repo's browser test: every figure card has its tone and a tinted fill.

## Example
- Situation: the cards of a sales board are made "lighter" with a coloured line on the left.
- ✗ Wrong: `.kpi-card { background: transparent; border-left: 4px solid var(--tone); }` - the card reads as the glass of
  the page, its tone a thin line.
- ✓ Right: `.kpi-card[data-tone] { background: var(--tone-bg); }`, the slot colour at a low alpha; the figure in the text
  colour, the icon in the slot colour.

## Check
- The hook blocks a write to a style file that adds, under a selector ending on a figure card, a fill of none, transparent,
  white or the plain glass (`var(--g-glass…)`), or a coloured border on one side. Passed: a tinted fill (`var(--tone-bg)`,
  an `rgba()` of a colour, `color-mix()`) · a rule on what is inside the card (its title, figure, % line, icon) · a hover ·
  a border set to `0` / `none` · a repo of another style · a declaration already there. The hook failing lets the write
  through.
- What the hook cannot see (an inline style, a card drawn by a script, the frame's own glass) the shared rule
  `rp-card-tone` catches on the drawn page.

## Links · Liên kết
- Implements · Thi hành: `Skill_App_Report` — the figure cards of a report page · thẻ chỉ số của trang báo cáo
- Related · Liên quan: `Rule_Gate_97_BarOneSize` — a style rule of the kind locked by a hook · luật style của kiểu bị khoá bằng hook
