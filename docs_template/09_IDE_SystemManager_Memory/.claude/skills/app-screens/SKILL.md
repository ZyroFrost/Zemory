---
id: Skill_App_Screens
name: app-screens
version: 1
type: process
checked: [Skill_App_Base, Skill_App_ShellUse, Skill_App_SneatGlass, Skill_App_Report]
installs: [scripts/screens.mjs]
description: The screens every app of a system is built for and checked on - one list of 15 screens (monitors, laptops, tablets, phones) with their size, ratio and the page area a browser leaves, the rule that picks the layout from the window (the 1920 x 1080 canvas zoomed to it, the phone layer, one column for a full-screen scene), and the 7 screens every browser check measures. Use when building or checking a page for screen sizes, a scale to the window, a phone or tablet layout, a full-screen page, or the page size of a browser check. Vietnamese triggers - "tỉ lệ màn hình", "cỡ màn hình", "kích thước màn hình", "tự scale", "co giãn theo màn", "màn dọc", "màn siêu rộng", "responsive".
---

# app-screens — one list of screens for every app

> Carries out `Rule_Gate_78_ScreenSizes`. The list itself is `scripts/screens.mjs`, installed in every app repo; this page says
> it in words. A screen a page needs that the list lacks is added to the list on HS (version + 1), so every app takes it -
> never written in one app or one check.

## 1. The screens

| Id | Screen | Screen (CSS px) | Ratio | Page area (view) | Required |
|---|---|---|---|---|---|
| D1 | FHD monitor at 100 % | 1920 × 1080 | 16:9 | 1920 × 950 | ✓ |
| D2 | FHD laptop at 125 % (the most common office laptop) | 1536 × 864 | 16:9 | 1536 × 730 | ✓ |
| D3 | FHD laptop at 150 % | 1280 × 720 | 16:9 | 1280 × 590 | |
| D4 | HD laptop | 1366 × 768 | 16:9 | 1366 × 640 | ✓ |
| D5 | 16:10 laptop | 1440 × 900 | 16:10 | 1440 × 770 | |
| D6 | 14-inch MacBook | 1512 × 982 | 3:2 | 1512 × 900 | |
| D7 | QHD monitor at 100 % | 2560 × 1440 | 16:9 | 2560 × 1310 | |
| D8 | Ultrawide FHD monitor | 2560 × 1080 | 21:9 | 2560 × 950 | |
| D9 | Ultrawide QHD monitor | 3440 × 1440 | 21:9 | 3440 × 1310 | ✓ |
| T1 | Tablet, landscape | 1180 × 820 | 10:7 | 1180 × 760 | |
| T2 | Tablet, portrait | 820 × 1180 | 7:10 | 820 × 1110 | ✓ |
| P1 | Phone (iPhone 12-16) | 390 × 844 | 9:19.5 | 390 × 664 | ✓ |
| P2 | Phone (common Android) | 360 × 800 | 9:20 | 360 × 690 | |
| P3 | Large phone | 430 × 932 | 9:19.5 | 430 × 750 | |
| P4 | Phone on its side | 844 × 390 | 19.5:9 | 844 × 340 | ✓ |

- **Screen** is the screen in CSS px at the scaling the system sets: a 1920 × 1080 laptop at 125 % is 1536 × 864.
- **Page area** is what CSS sees in a full-screen browser window: the screen less the browser's bars (about 130 px on a
  computer, 80 px in Safari on a Mac, 180 px on a phone with its bars shown). A check sets the page area, never the screen.
- **Required** are the 7 screens every browser check of an app measures before a build is called good. A check with time to
  spare measures all 15.

## 2. The layout a window gets

**An app page inside the frame** (`layoutOf(w, h)`):
- 768 px wide or less ⇒ the phone layer: no zoom, touch sizes, full-screen dialogs (skill app-base, the phone section).
- Wider ⇒ the page is drawn on the 1920 × 1080 canvas and zoomed to the window: zoom = min(w / 1920, h / 1080), kept between
  0.7 and 1. The canvas takes the rest of the window (w / zoom × h / zoom): a wide or tall window gives more room, the page is
  never stretched.

**A full-screen scene** - the sign-in page, a launcher splash, a board on a wall (`layoutOf(w, h, 'scene')`):
- 900 × 560 or more and at least 1.2 times wider than tall ⇒ the canvas, zoom = min(w / 1920, h / 1080) with no cap. The text
  grows on a small screen so it stays readable: `--up` = `textUpOf(w, h)` = clamp(1, 1 / zoom, 1.5), and the boxes that hold
  the text grow with it.
- Otherwise ⇒ one column that scrolls: a portrait screen, a narrow window, a phone on its side.

## 3. What a page holds on every screen

- Nothing cut, nothing drawn over another part, no sideways scroll of the page itself (a wide table scrolls inside its frame).
- Text never below 12 px as it reaches the screen (zoom included); a control never below 32 px tall on a computer, 44 px on a
  phone.
- On a 21:9 screen the content stays at its canvas size in the middle, the wallpaper at the sides; a tall screen gives the rows
  more room.
- Sizes are written in canvas px (the zoom does the rest); a box sized to the window reads the frame's `--app-w` / `--app-h`,
  not plain `vw` / `vh` (skill app-shell-use).

## 4. The browser check

```js
import {REQUIRED_SCREENS, metricsOf} from './screens.mjs';
for (const s of REQUIRED_SCREENS) {
  await cmd('Emulation.setDeviceMetricsOverride', metricsOf(s));   // the page area, mobile for a phone
  // draw every page, both themes; a finding names the screen: s.id + ' ' + s.view.join('x')
}
```

- Never a list of sizes of the check's own, never `--widths`: a size missing from the list is added to the list.
- `node scripts/screens.mjs --list` prints the table with the layout each screen gets; `--required` the 7 page areas;
  `--json` everything.
- `scripts/ui_check.mjs` (skill app-base) measures the required screens unless its config names widths.

## Implements · Thi hành luật
- `Rule_Gate_78_ScreenSizes` — the list, the layout rule and the screens a check measures · danh sách, luật chọn bố cục và các cỡ bộ kiểm phải đo
