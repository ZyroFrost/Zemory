#!/usr/bin/env node
// screens.mjs - the screens every app of a system is built for and checked on (installed by Skill_App_Screens; Rule_Gate_78).
// One list for every app: a size a page needs that is not here is added HERE (on HS, version + 1), never written in one check.
//   screen - the screen in CSS px at the scaling the system sets (a 1920 x 1080 laptop at 125 % is 1536 x 864)
//   view   - the page area a full-screen browser window leaves: the screen less the browser's bars (a check sets THIS)
//   kind   - desktop · tablet · phone (a phone is measured with mobile: true)
// Usage: import {REQUIRED_SCREENS, SCREENS, layoutOf, zoomOf} from './screens.mjs'
//        node scripts/screens.mjs --list | --required | --json

export const CANVAS = Object.freeze({ w: 1920, h: 1080 });

export const SCREENS = Object.freeze([
  { id: "D1", kind: "desktop", name: "FHD monitor at 100 %", screen: [1920, 1080], ratio: "16:9", view: [1920, 950] },
  { id: "D2", kind: "desktop", name: "FHD laptop at 125 %", screen: [1536, 864], ratio: "16:9", view: [1536, 730] },
  { id: "D3", kind: "desktop", name: "FHD laptop at 150 %", screen: [1280, 720], ratio: "16:9", view: [1280, 590] },
  { id: "D4", kind: "desktop", name: "HD laptop", screen: [1366, 768], ratio: "16:9", view: [1366, 640] },
  { id: "D5", kind: "desktop", name: "16:10 laptop", screen: [1440, 900], ratio: "16:10", view: [1440, 770] },
  { id: "D6", kind: "desktop", name: "14-inch MacBook", screen: [1512, 982], ratio: "3:2", view: [1512, 900] },
  { id: "D7", kind: "desktop", name: "QHD monitor at 100 %", screen: [2560, 1440], ratio: "16:9", view: [2560, 1310] },
  { id: "D8", kind: "desktop", name: "Ultrawide FHD monitor", screen: [2560, 1080], ratio: "21:9", view: [2560, 950] },
  { id: "D9", kind: "desktop", name: "Ultrawide QHD monitor", screen: [3440, 1440], ratio: "21:9", view: [3440, 1310] },
  { id: "T1", kind: "tablet", name: "Tablet, landscape", screen: [1180, 820], ratio: "10:7", view: [1180, 760] },
  { id: "T2", kind: "tablet", name: "Tablet, portrait", screen: [820, 1180], ratio: "7:10", view: [820, 1110] },
  { id: "P1", kind: "phone", name: "Phone (iPhone 12-16)", screen: [390, 844], ratio: "9:19.5", view: [390, 664] },
  { id: "P2", kind: "phone", name: "Phone (common Android)", screen: [360, 800], ratio: "9:20", view: [360, 690] },
  { id: "P3", kind: "phone", name: "Large phone", screen: [430, 932], ratio: "9:19.5", view: [430, 750] },
  { id: "P4", kind: "phone", name: "Phone on its side", screen: [844, 390], ratio: "19.5:9", view: [844, 340] },
].map(Object.freeze));

// the screens every browser check of an app measures before its build is called good: the most used computer screens, the
// two ends (the ultrawide, the old laptop), a portrait tablet, a phone and a phone on its side
export const REQUIRED = Object.freeze(["D1", "D2", "D4", "D9", "T2", "P1", "P4"]);
export const REQUIRED_SCREENS = Object.freeze(SCREENS.filter((s) => REQUIRED.includes(s.id)));

// the zoom of the design canvas for a window: an app page keeps it between 0.7 and 1 (the frame's scale), a full-screen scene
// takes it whole
export function zoomOf(w, h, kind = "app") {
  const z = Math.min(w / CANVAS.w, h / CANVAS.h);
  return kind === "scene" ? z : Math.min(1, Math.max(0.7, z));
}

// the layout a window gets:
//   app   - "phone" at 768 px wide or less (the phone layer), else "canvas" (the 1920 x 1080 canvas zoomed to the window)
//   scene - a full-screen page (sign-in, a launcher splash, a board): "canvas" when the window is 900 x 560 or more and at
//           least 1.2 times wider than tall, else "column" (one column that scrolls)
export function layoutOf(w, h, kind = "app") {
  if (kind === "scene") return w >= 900 && h >= 560 && w / h >= 1.2 ? "canvas" : "column";
  return w <= 768 ? "phone" : "canvas";
}

// the text factor of a scene on the canvas: text grows on a small screen so it stays readable, at most 1.5 times
export function textUpOf(w, h) {
  return Math.min(1.5, Math.max(1, 1 / zoomOf(w, h, "scene")));
}

// the DevTools page size of a screen
export function metricsOf(s) {
  return { width: s.view[0], height: s.view[1], deviceScaleFactor: 1, mobile: s.kind === "phone" };
}

const self = process.argv[1] && import.meta.url.endsWith(process.argv[1].split(String.fromCharCode(92)).join("/").split("/").pop());
if (self) {
  const a = process.argv.slice(2);
  if (a.includes("--json")) console.log(JSON.stringify({ CANVAS, SCREENS, REQUIRED }, null, 2));
  else if (a.includes("--required")) console.log(REQUIRED_SCREENS.map((s) => s.id + " " + s.view.join("x")).join("\n"));
  else {
    const pad = (x, n) => String(x).padEnd(n);
    console.log(pad("id", 4) + pad("screen", 12) + pad("ratio", 8) + pad("view", 12) + pad("app", 8) + pad("scene", 8) + "name");
    for (const s of SCREENS) {
      const [w, h] = s.view;
      console.log(pad(s.id + (REQUIRED.includes(s.id) ? "*" : ""), 4) + pad(s.screen.join("x"), 12) + pad(s.ratio, 8) + pad(s.view.join("x"), 12) +
        pad(layoutOf(w, h), 8) + pad(layoutOf(w, h, "scene"), 8) + s.name);
    }
    console.log("* required: every browser check of an app measures these");
  }
}
