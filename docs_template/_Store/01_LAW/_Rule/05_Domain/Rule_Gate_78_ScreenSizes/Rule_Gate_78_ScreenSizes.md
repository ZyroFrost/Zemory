---
id: Rule_78
name: screen-sizes
version: 2
kind: content
code: 05_Domain
checked: [Skill_App_Screens, Skill_App_Base, Skill_App_ShellUse, Rule_Gate_76_DeployChecksFrame]
---
# Rule_Gate_78_ScreenSizes — Every app is built for one list of screens and checked on it

## What
The apps of a system share one list of screens (skill app-screens, `scripts/screens.mjs`): 15 screens from a 21:9 monitor to a
phone on its side, each with its size, its ratio and the page area a browser leaves. A page is laid out for every screen of the
list by one rule - the 1920 × 1080 canvas zoomed to the window, the phone layer at 768 px or less, one column for a full-screen
scene on a tall or small window - and a browser check measures the 7 required screens of the list. A check never measures a
list of sizes of its own: such lists drift from app to app, and the screen nobody listed is the one that breaks.

## When
- Writing or changing code that sets the size of a browser page (`setDeviceMetricsOverride`, a viewport, `--widths`).
- Running the deploy of an app that wears the frame.
- Building a layout that depends on the window: a scale, a breakpoint, a full-screen page.

## Do
1. Take the sizes from the list: `import {REQUIRED_SCREENS, metricsOf} from './screens.mjs'`, each screen's page area as the page
   size, `mobile` for a phone. A check with time to spare takes all of `SCREENS`.
2. A size the list lacks ⇒ add it to the list on HS (skill app-screens, version + 1), so every app takes it.
3. Lay a page out by the rule of the list (`layoutOf`, skill app-screens §2) and hold §3 on every screen: nothing cut, nothing
   over another part, no sideways scroll, text at least 12 px as it reaches the screen.

## Right way
- Blocked writing a check that sets its own page size ⇒ import `REQUIRED_SCREENS` and `metricsOf` from `screens.mjs` and loop
  over the screens; name a finding by the screen's id.

## Example
- Situation: a sales app's browser check draws its pages at 1440 × 900 and 390 × 844 only.
- ✗ Wrong: keep the two sizes; a store manager's 1366 × 768 laptop cuts the filter bar, a 21:9 monitor stretches the cards, and
  no check ever saw either.
- ✓ Right: the check imports `REQUIRED_SCREENS` and draws every page on the 7 screens; the cut bar shows red at D4 before the
  build is called good.

## Check
- The hook blocks a Write or Edit in an app repo (one with `frontend/config/shell.json`, or the frame's `frontend/shell/`) that
  adds, in code (comments do not count), a line setting a browser page's size with a number - `setDeviceMetricsOverride`,
  `setViewport`, `--window-size`, `defaultViewport`, `--widths`, `widths: [...]` - to a file that does not take the list
  (`screens.mjs`, `REQUIRED_SCREENS`, `SCREENS`). The shared scripts (`screens`, `sneat_glass_check`, `report_layout_check`,
  `ui_check`) and the harness folders are not read.
- Running the deploy of an app whose browser check (what the deploy script runs, three levels down) does not take the list, or
  that passes `--widths`, is blocked once per session as a warning; the retry passes while the apps move to the list.
  `zemory conform` (`rule-conform`, advisory) names every such deploy script as the repo stands.
- The hook failing lets the call through.

## Links · Liên kết
- Implements · Thi hành: `Skill_App_Screens` — the list and the layout rule · danh sách và luật chọn bố cục
- Related · Liên quan: `Rule_Gate_76_DeployChecksFrame` — the deploy runs the frame's browser check · deploy chạy bộ kiểm của khung
- Related · Liên quan: `Skill_App_Base` — the phone layer and the checker · lớp điện thoại và bộ đo
