---
id: Rule_97
name: bar-one-size
version: 2
kind: action
code: 05_Domain
checked: [Skill_App_SneatGlass, Skill_App_Shell, Rule_Keys_90_AppFamilyContract]
---
# Rule_Gate_97_BarOneSize — Every control of the page bar is the bar's one size

## What
In an app of the Sneat-Glass kind, every control of the page bar is ONE height: the page's own tools (the add button and its
"+"), every filter pinned on the bar, the filter button, the filter box and the view switch. The size is `--tool-h` (38 px), set
once on `.page-toolbar`; a button that carries only an icon is a square of it. No style rule gives a control of the bar a size
of its own (pinned filters stood 34 px beside a 38 px "+", "phải khóa lại chính xác size").

## When
- Writing or editing a style rule (`.css` · `.scss` · `.less`) whose selector names a control of the page bar, in a repo whose
  `frontend/config/ui.json` declares a Sneat style.
- Adding a tool, a filter or a button to the page bar.

## Do
1. A control of the bar takes `height: var(--tool-h)`; an icon-only button also `width: var(--tool-h)`. Never a number
   (`34px`, `2.5rem`).
2. To change the size of the bar, change `--tool-h` on `.page-toolbar` - every control follows.
3. A field keeps its own width (the filter box, a pinned filter shrinking with the others); only its height is the bar's.
4. The shared rule `bar-one-size` of `scripts/sneat_glass_check.mjs` (skill app-sneat-glass) runs on every page in the
   repo's browser test and in the live check: every control drawn within 1 px of `--tool-h`, every icon-only button square.

## Example
- Situation: the pinned filters of the bar are given a smaller height so they look lighter.
- ✗ Wrong: `.filter-row .form-select { height: 34px; }` - the "+" and the filter button stay 38 px and the row is uneven
  (a family's frame, and every app wearing that build of it).
- ✓ Right: `.filter-row .form-select { height: var(--tool-h); }`; a lighter look comes from the fill, never the size.

## Check
- The hook blocks a write to a style file that adds, under a selector of a control of the page bar, a height (or a width for a
  button) given as a number in `px` · `rem` · `em` instead of `var(--tool-h)`. Passed: `var(--tool-h)` and `calc()` of it ·
  a list, a popover, an icon or a mark inside a control · a field's width · a repo not of a Sneat style · a declaration already
  there. The hook failing lets the write through.
- What the hook cannot see (an inline style, a size from a script, a rule of the kit) the shared rule `bar-one-size` catches on
  the drawn page.

## Links · Liên kết
- Implements · Thi hành: `Skill_App_SneatGlass` — the page bar and its shared rules · thanh trang và luật chung của nó
- Related · Liên quan: `Rule_Keys_90_AppFamilyContract` — the frame is built once by the system-manager · khung do repo quản hệ dựng một lần
