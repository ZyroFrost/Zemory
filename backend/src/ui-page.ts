export const PAGE = String.raw`<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Zemory Cockpit</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJ6ZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzc4ZGY5YiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2I1ZWZjOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjIiIHk9IjIiIHdpZHRoPSIyOCIgaGVpZ2h0PSIyOCIgcng9IjgiIGZpbGw9InVybCgjemcpIi8+PGcgc3Ryb2tlPSIjMDgxMDBlIiBzdHJva2Utd2lkdGg9IjEuNyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSIjMDgxMDBlIj48cGF0aCBmaWxsPSJub25lIiBkPSJNMTYgMTYgTDEwLjUgMTAgTTE2IDE2IEwyMS41IDkuNSBNMTYgMTYgTDIyIDIxLjUgTTE2IDE2IEwxMCAyMS41Ii8+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMi43Ii8+PGNpcmNsZSBjeD0iMTAuNSIgY3k9IjEwIiByPSIyIi8+PGNpcmNsZSBjeD0iMjEuNSIgY3k9IjkuNSIgcj0iMiIvPjxjaXJjbGUgY3g9IjIyIiBjeT0iMjEuNSIgcj0iMiIvPjxjaXJjbGUgY3g9IjEwIiBjeT0iMjEuNSIgcj0iMiIvPjwvZz48L3N2Zz4=">
<style>
  :root {
    color-scheme: dark;
    --bg: #08100e;
    --bg-soft: #0c1512;
    --panel: rgba(13, 21, 19, .86);
    --panel-2: rgba(18, 28, 25, .78);
    --panel-3: rgba(22, 34, 30, .64);
    --line: rgba(146, 172, 153, .18);
    --line-strong: rgba(146, 172, 153, .36);
    --text: #edf4ee;
    --muted: #9aab9d;
    --faint: #708174;
    --green: #78df9b;
    --green-soft: rgba(120, 223, 155, .14);
    --amber: #f0cf63;
    --amber-soft: rgba(240, 207, 99, .15);
    --red: #ed7676;
    --blue: #8cbcff;
    --shadow: 0 22px 70px rgba(0, 0, 0, .36);
    --radius: 18px;
    --mono: "Cascadia Code", "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
    --sans: "Aptos Display", "Segoe UI Variable Display", "SF Pro Display", "Helvetica Neue", sans-serif;
    --rail-w: 244px;
    --inspector-w: 366px;
    --bottom-h: 210px;
    --recall-left: 64%;
  }
  * { box-sizing: border-box; }
  html { width: 100%; height: 100%; overflow: hidden; scroll-behavior: smooth; }
  body {
    margin: 0;
    width: 100%;
    height: 100vh;
    min-height: 0;
    overflow: hidden;
    background:
      radial-gradient(circle at 22% 2%, rgba(120, 223, 155, .18), transparent 26rem),
      radial-gradient(circle at 92% 34%, rgba(143, 188, 255, .12), transparent 24rem),
      linear-gradient(135deg, #06100d 0%, #0a1110 44%, #10130f 100%);
    color: var(--text);
    font: 13px/1.42 var(--sans);
    letter-spacing: -.01em;
  }
  body::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255, 255, 255, .025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, .022) 1px, transparent 1px);
    background-size: 38px 38px;
    mask-image: linear-gradient(to bottom, rgba(0,0,0,.7), transparent 80%);
  }
  button, input, select { font: inherit; }
  button {
    border: 0;
    border-radius: 12px;
    padding: 9px 14px;
    color: #07120c;
    background: linear-gradient(135deg, var(--green), #b5efc8);
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 10px 22px rgba(120, 223, 155, .16);
    transition: transform .18s ease, filter .18s ease, border-color .18s ease;
  }
  button:hover { filter: brightness(1.06); transform: translateY(-1px); }
  button:active { transform: translateY(0); }
  button.ghost {
    color: var(--text);
    background: rgba(255, 255, 255, .045);
    border: 1px solid var(--line);
    box-shadow: none;
  }
  button.warn { background: linear-gradient(135deg, var(--amber), #ffe59b); color: #171008; }
  input[type=text], select {
    width: 100%;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: rgba(4, 9, 8, .74);
    color: var(--text);
    padding: 10px 12px;
    outline: none;
  }
  input[type=text]:focus, select:focus { border-color: rgba(120, 223, 155, .7); box-shadow: 0 0 0 4px rgba(120, 223, 155, .08); }
  code { font-family: var(--mono); color: #cbe8d5; }
  .shell {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: var(--rail-w) 6px minmax(640px, 1fr) 6px var(--inspector-w);
    gap: 8px;
    height: 100vh;
    min-height: 0;
    padding: 10px;
    overflow: hidden;
  }
  .resize-handle {
    position: relative;
    z-index: 3;
    border-radius: 999px;
    background: rgba(255, 255, 255, .025);
    transition: background .18s ease, box-shadow .18s ease;
    touch-action: none;
  }
  .resize-handle::before {
    content: "";
    position: absolute;
    inset: 0;
    margin: auto;
    border-radius: 999px;
    background: rgba(120, 223, 155, .24);
    opacity: 0;
    transition: opacity .18s ease;
  }
  .resize-handle:hover,
  .resize-handle:focus-visible,
  body.resizing .resize-handle.active {
    background: rgba(120, 223, 155, .08);
    box-shadow: 0 0 0 1px rgba(120, 223, 155, .15);
  }
  .resize-handle:hover::before,
  .resize-handle:focus-visible::before,
  body.resizing .resize-handle.active::before { opacity: 1; }
  .resize-handle.vertical { cursor: col-resize; min-width: 6px; }
  .resize-handle.vertical::before { width: 2px; height: 34px; }
  .resize-handle.horizontal { cursor: row-resize; min-height: 6px; }
  .resize-handle.horizontal::before { width: 44px; height: 2px; }
  body.resizing { user-select: none; }
  body.resizing-col { cursor: col-resize; }
  body.resizing-row { cursor: row-resize; }
  .rail, .workspace, .inspector { min-width: 0; min-height: 0; }
  .rail {
    position: sticky;
    top: 10px;
    height: calc(100vh - 20px);
    border: 1px solid var(--line);
    border-radius: 7px;
    background: linear-gradient(180deg, rgba(11, 20, 18, .92), rgba(9, 15, 14, .88));
    box-shadow: var(--shadow);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 12px 12px 15px;
    border: 1px solid var(--line);
    border-radius: 5px;
    background: linear-gradient(180deg, rgba(120, 223, 155, .06), rgba(255, 255, 255, .02));
  }
  .brand-logo { flex: none; width: 38px; height: 38px; display: block; filter: drop-shadow(0 2px 7px rgba(120, 223, 155, .28)); }
  .brand-logo svg { width: 100%; height: 100%; display: block; }
  .brand-text { display: grid; gap: 3px; min-width: 0; }
  .brand h1 { margin: 0; color: var(--green); font-size: 30px; letter-spacing: -.075em; line-height: 1; }
  .brand p { margin: 0; color: var(--muted); font-size: 12px; }
  .proj-pick { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 6px; align-items: center; }
  .proj-pick select { width: 100%; }
  .proj-add { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px; align-items: center; margin-top: 6px; }
  .proj-add input { width: 100%; background: var(--panel-3); border: 1px solid rgba(255, 255, 255, .1); color: #dce7df; border-radius: 6px; padding: 4px 7px; font-size: 12px; min-width: 0; }
  .rail-scroll { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; gap: 0; }
  .rail .panel { box-shadow: none; display: grid; grid-template-rows: auto minmax(0, 1fr); flex: 1 1 0; min-height: 80px; }
  .rail .panel > .panel-pad { overflow: auto; }
  .nav { display: grid; gap: 3px; }
  .nav a {
    color: #c7d2ca;
    text-decoration: none;
    padding: 11px 10px;
    border-radius: 4px;
    display: grid;
    grid-template-columns: 22px 1fr auto;
    gap: 8px;
    align-items: center;
    border-left: 2px solid transparent;
  }
  .nav a.on { color: #dff7e7; background: linear-gradient(90deg, rgba(120, 223, 155, .2), rgba(120, 223, 155, .04)); border-left-color: var(--green); }
  .nav span:last-child { color: var(--faint); font: 11px/1 var(--mono); }
  .rail-foot {
    margin-top: auto;
    border: 1px solid var(--line);
    border-radius: 5px;
    padding: 12px;
    background: rgba(255, 255, 255, .035);
  }
  .foot-row {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 6px 0;
    color: var(--muted);
  }
  .foot-row b { color: #dff7e7; font-weight: 650; }
  .live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); display: inline-block; box-shadow: 0 0 0 6px rgba(120, 223, 155, .11); }
  .tiny { color: var(--faint); font-size: 11px; }
  .workspace {
    height: calc(100vh - 20px);
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 8px;
    align-content: stretch;
    overflow: hidden;
  }
  .commandbar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    min-width: 0;
    border: 1px solid var(--line);
    border-radius: 7px;
    background: rgba(8, 15, 14, .74);
    padding: 8px;
    box-shadow: var(--shadow);
  }
  .commandbar .field, .commandbar .search-command {
    min-height: 32px;
    min-width: 0;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: rgba(255, 255, 255, .035);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 10px;
    color: var(--muted);
    white-space: nowrap;
  }
  .commandbar .field { flex: 0 0 auto; overflow: hidden; text-overflow: ellipsis; }
  .commandbar select, .commandbar input {
    min-height: 32px;
    border-radius: 6px;
    padding: 0 9px;
    background: rgba(5, 10, 9, .5);
  }
  .commandbar .search-command { overflow: hidden; }
  .commandbar .search-command input { flex: 1 1 auto; min-width: 0; border: 0; box-shadow: none; background: transparent; padding: 0; }
  .commandbar .drive-state { flex: 0 1 auto; overflow: hidden; text-overflow: ellipsis; }
  .icon-btns { display: flex; gap: 6px; justify-content: flex-end; }
  .icon-btns button { min-width: 32px; height: 32px; padding: 0 12px; border-radius: 6px; }
  .field.pill-btn { cursor: pointer; }
  .field.pill-btn:hover { border-color: var(--line-strong); color: var(--text); }
  .field.pill-btn b { color: var(--text); font-weight: 600; }
  button.set-open { color: var(--green2, #b5efc8); border-color: var(--green-dim, #2f6b48) !important; background: rgba(120,223,155,.09); font-weight: 600; white-space: nowrap; }
  button.set-open:hover { background: rgba(120,223,155,.16); }
  /* Settings modal — tabbed, one fixed size (see 02_RULES §Thiết kế UI). */
  .settings-modal { display: grid; grid-template-columns: 190px 1fr; width: min(96vw, 780px); max-height: 88vh;
    border: 1px solid var(--line-strong); border-radius: 16px; background: #101713; box-shadow: var(--shadow); overflow: hidden; }
  .set-side { background: rgba(0,0,0,.28); border-right: 1px solid var(--line); padding: 14px 10px; display: flex; flex-direction: column; gap: 3px; }
  .set-title { font-size: 14px; font-weight: 700; color: var(--text); padding: 2px 8px 12px; }
  .set-tab { text-align: left; background: transparent; color: var(--muted); border: 0; border-radius: 8px; padding: 9px 11px; cursor: pointer; font-size: 12.5px; }
  .set-tab:hover { color: var(--text); background: rgba(255,255,255,.05); }
  .set-tab.on { color: var(--green2, #b5efc8); background: rgba(120,223,155,.1); }
  .set-body { position: relative; padding: 22px 24px; overflow: auto; }
  .set-close { position: absolute; top: 14px; right: 16px; background: none; border: 0; color: var(--faint); font-size: 18px; cursor: pointer; }
  .set-pane { display: none; }
  .set-pane.on { display: block; }
  .set-pane h2 { margin: 0 0 4px; font-size: 15px; color: var(--text); }
  .set-desc { color: var(--muted); font-size: 12px; margin: 0 0 18px; line-height: 1.5; }
  .set-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 0; border-top: 1px solid var(--line); }
  .set-row:first-of-type { border-top: 0; }
  .set-lab { font-size: 12.5px; color: var(--text); }
  .set-lab small { display: block; color: var(--faint); font-size: 11px; margin-top: 3px; }
  .seg { display: inline-flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
  .seg button { border: 0; background: transparent; color: var(--muted); padding: 7px 14px; cursor: pointer; font-size: 12px; }
  .seg button.on { background: var(--green); color: #07110e; font-weight: 700; }
  .path-box { display: flex; gap: 8px; }
  .path-box input { flex: 1; min-width: 0; background: rgba(5,10,9,.5); border: 1px solid var(--line); color: var(--text); border-radius: 7px; padding: 8px 10px; font: 11px var(--mono); }
  .mini-btn { border: 1px solid var(--green-dim, #2f6b48); background: rgba(120,223,155,.09); color: var(--green2, #b5efc8); border-radius: 7px; padding: 0 13px; cursor: pointer; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .mini-btn.ghost { border-color: var(--line); background: rgba(255,255,255,.05); color: var(--muted); }
  .set-warn { margin-top: 12px; font-size: 11.5px; color: var(--amber); background: rgba(230,180,90,.08); border: 1px solid rgba(230,180,90,.28); border-radius: 8px; padding: 9px 11px; }
  .sw { width: 38px; height: 21px; border-radius: 999px; background: rgba(255,255,255,.1); border: 1px solid var(--line); position: relative; cursor: pointer; flex: 0 0 auto; }
  .sw::after { content: ""; position: absolute; top: 2px; left: 2px; width: 15px; height: 15px; border-radius: 50%; background: var(--faint); transition: left .15s, background .15s; }
  .sw.on { background: var(--green-dim, #2f6b48); border-color: var(--green-dim, #2f6b48); }
  .sw.on::after { left: 19px; background: var(--green2, #b5efc8); }
  .status-deck {
    display: grid;
    grid-template-columns: 1.35fr .78fr .78fr 1.18fr 1.18fr 1.05fr;
    border: 1px solid var(--line);
    border-radius: 7px;
    background:
      radial-gradient(circle at 16% 35%, rgba(120, 223, 155, .12), transparent 18rem),
      linear-gradient(180deg, rgba(15, 24, 22, .9), rgba(12, 18, 17, .84));
    overflow: hidden;
    box-shadow: var(--shadow);
  }
  .status-card {
    min-height: 72px;
    padding: 12px 16px;
    border-right: 1px solid var(--line);
    display: grid;
    align-content: center;
    gap: 5px;
  }
  .status-card:last-child { border-right: 0; }
  .status-card .label { color: #dbe8de; font-size: 14px; font-weight: 760; }
  .status-card .value { color: var(--green); font-weight: 800; font-size: 13px; }
  .status-card .number { color: #f1f7f2; font-size: 22px; font-weight: 850; letter-spacing: -.05em; line-height: 1; }
  .status-card .sub { color: var(--muted); font: 11px/1.35 var(--mono); }
  .spark {
    width: 76px;
    height: 24px;
    border-radius: 3px;
    background:
      linear-gradient(180deg, rgba(120, 223, 155, .22), transparent),
      linear-gradient(135deg, transparent 6%, rgba(120, 223, 155, .95) 7%, rgba(120, 223, 155, .95) 10%, transparent 11%, transparent 26%, rgba(120, 223, 155, .9) 27%, rgba(120, 223, 155, .9) 30%, transparent 31%, transparent 51%, rgba(120, 223, 155, .9) 52%, rgba(120, 223, 155, .9) 55%, transparent 56%);
  }
  .switch {
    width: 32px;
    height: 18px;
    border-radius: 999px;
    background: rgba(255, 255, 255, .1);
    border: 1px solid var(--line);
    position: relative;
  }
  .switch.on { background: rgba(120, 223, 155, .24); border-color: rgba(120, 223, 155, .45); }
  .switch::after {
    content: "";
    position: absolute;
    width: 12px;
    height: 12px;
    top: 2px;
    left: 3px;
    border-radius: 50%;
    background: var(--muted);
    transition: left .18s ease, background .18s ease;
  }
  .switch.on::after { left: 15px; background: var(--green); }
  .panel {
    border: 1px solid var(--line);
    border-radius: 7px;
    background: var(--panel);
    box-shadow: var(--shadow);
    overflow: hidden;
    min-height: 0;
  }
  .panel-pad { padding: 12px; min-height: 0; }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 12px 0;
  }
  .panel-head h3 { margin: 0; color: #dce7df; font-size: 14px; letter-spacing: .01em; }
  .panel-head p { margin: 3px 0 0; color: var(--muted); font-size: 12px; }
  .recall {
    min-height: 0;
    display: grid;
    grid-template-rows: auto auto auto auto minmax(0, 1fr);
    background:
      radial-gradient(circle at 75% 18%, rgba(143, 188, 255, .1), transparent 20rem),
      linear-gradient(160deg, rgba(12, 21, 19, .94), rgba(9, 15, 14, .9));
  }
  .recall-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: start;
    padding: 13px 13px 8px;
  }
  .recall-title h2 { margin: 0; font-size: 23px; letter-spacing: -.045em; }
  .recall-title p { margin: 4px 0 0; color: var(--muted); }
  .searchline {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 112px;
    gap: 8px;
    padding: 0 13px 8px;
  }
  .searchline input[type=text] { height: 39px; font-size: 14px; }
  .searchline button { height: 39px; border-radius: 7px; }
  .filterline {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 0 13px 9px;
    border-bottom: 1px solid var(--line);
  }
  .filter-pill, .toggle {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    gap: 7px;
    color: var(--muted);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 0 9px;
    background: rgba(255, 255, 255, .035);
    white-space: nowrap;
  }
  .filter-sel {
    width: auto;
    min-height: 28px;
    color: var(--muted);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 0 8px;
    background: rgba(255, 255, 255, .035);
    font-size: 12px;
    cursor: pointer;
  }
  #sortState { cursor: pointer; }
  #sortState:hover { color: var(--text); }
  .result-meta {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 13px;
    color: var(--muted);
    font-size: 12px;
  }
  .recall-workbench {
    display: grid;
    grid-template-columns: minmax(260px, var(--recall-left)) 6px minmax(220px, 1fr);
    min-height: 0;
    border-top: 1px solid var(--line);
    overflow: hidden;
  }
  .result-list {
    border-right: 1px solid var(--line);
    display: grid;
    align-content: start;
    min-height: 0;
    max-height: none;
    overflow: auto;
  }
  .result-row {
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr) 34px;
    gap: 10px;
    min-height: 78px;
    padding: 12px 10px;
    border-left: 3px solid transparent;
    border-bottom: 1px solid rgba(255, 255, 255, .055);
    background: rgba(255, 255, 255, .012);
    cursor: pointer;
  }
  .result-row:hover, .result-row.selected { background: rgba(120, 223, 155, .065); }
  .result-row.selected { border-left-color: var(--green); }
  .score {
    color: var(--green);
    font: 800 13px/1 var(--mono);
    padding-top: 2px;
  }
  .result-title {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    color: #eef6ef;
    font-weight: 780;
  }
  .result-snip {
    margin-top: 5px;
    color: #cdd9d0;
    font-size: 12px;
    line-height: 1.35;
  }
  .result-foot {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    color: var(--muted);
    font: 11px/1 var(--mono);
  }
  .open-arrow { align-self: center; color: var(--muted); text-align: right; cursor: pointer; font-size: 17px; }
  .open-arrow:hover { color: var(--green); }
  .preview {
    min-width: 0;
    min-height: 0;
    padding: 12px 14px;
    display: grid;
    align-content: start;
    gap: 9px;
    max-height: none;
    overflow: auto;
  }
  .preview-title {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    color: var(--muted);
    font-size: 12px;
  }
  .preview-meta { color: var(--muted); font: 11px/1.35 var(--mono); }
  .thread { display: grid; gap: 8px; }
  .tmsg {
    border: 1px solid var(--line);
    border-radius: 7px;
    padding: 9px;
    background: rgba(255, 255, 255, .035);
    white-space: pre-wrap;
    font-size: 12px;
  }
  .tmsg .who { display: block; color: var(--faint); font: 800 10px/1 var(--mono); text-transform: uppercase; margin-bottom: 6px; }
  .tmsg.hit { border-color: rgba(120, 223, 155, .46); background: rgba(120, 223, 155, .08); }
  mark { background: rgba(240, 207, 99, .23); color: #ffeaa4; border-radius: 3px; padding: 0 2px; }
  .empty {
    min-height: 170px;
    display: grid;
    place-items: center;
    color: var(--muted);
    text-align: center;
    padding: 18px;
  }
  .grid-bottom {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    min-height: 0;
    overflow: hidden;
  }
  .grid-bottom .panel, .inspector .panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
  }
  .grid-bottom .panel > .panel-pad, .inspector .panel > .panel-pad {
    overflow: auto;
  }
  .row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 74px minmax(86px, .7fr);
    gap: 8px;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, .06);
  }
  .row:last-child { border-bottom: 0; }
  .name { font-weight: 760; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .d, .muted { color: var(--muted); }
  .rt { display: flex; align-items: center; justify-content: flex-end; gap: 7px; min-width: 0; }
  .rt .d { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
  .bar { height: 7px; background: rgba(255, 255, 255, .08); border-radius: 99px; overflow: hidden; }
  .bar > i { display: block; height: 100%; border-radius: 99px; transition: width .32s ease; }
  .bar > i.ind { width: 45%; animation: slide .8s infinite linear; }
  @keyframes slide { 0% { margin-left: -45%; } 100% { margin-left: 100%; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner { width: 34px; height: 34px; border-radius: 50%; border: 3px solid rgba(255,255,255,.14); border-top-color: var(--green); animation: spin .8s linear infinite; margin: 4px auto 12px; }
  .sync-box { flex: 1 1 auto; min-height: 90px; overflow: auto; }
  .sync-step { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 4px 0; color: var(--muted); }
  .sync-step b { color: #dce7df; font-weight: 700; }
  .sync-done { color: var(--green); }
  .q {
    display: inline-block;
    width: 17px; height: 17px; border-radius: 50%;
    background: rgba(255, 255, 255, .08);
    color: var(--muted);
    font-size: 10px; font-weight: 800;
    text-align: center; line-height: 17px;
    cursor: help; flex: 0 0 auto;
    vertical-align: middle;
  }
  .panel-head h3 .q { margin-left: 7px; }
  .row2 { padding: 9px 0; border-bottom: 1px solid rgba(255, 255, 255, .06); display: grid; gap: 6px; }
  .row2:last-child { border-bottom: 0; }
  .row2-top { display: flex; align-items: center; gap: 7px; }
  .row2-top .name { flex: 0 1 auto; white-space: normal; }
  .row2 > .bar { width: 100%; }
  .row2 .d2 { font-size: 11px; color: var(--muted); line-height: 1.4; word-break: break-word; }
  .drive-state { font-size: 11px; white-space: nowrap; padding: 0 8px; color: var(--muted); }
  .drive-state.ok { color: var(--green); }
  .drive-state.bad { color: var(--amber); }
  .doc-link { cursor: pointer; }
  .doc-link:hover { border-color: var(--line-strong); color: #dff7e7; }
  .doc-body { flex: 1 1 auto; min-height: 0; overflow: auto; white-space: pre-wrap; word-break: break-word; font: 12px/1.5 var(--mono); color: #cbe8d5; background: rgba(0, 0, 0, .28); border-radius: 10px; padding: 12px; margin: 0; }
  .session-body { flex: 1 1 auto; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 6px; }
  .smsg { padding: 8px 10px; border-radius: 8px; background: rgba(255, 255, 255, .03); border-left: 2px solid var(--line); }
  .smsg.user { border-left-color: var(--blue); }
  .smsg.assistant { border-left-color: var(--green); }
  .smsg .role { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--faint); }
  .smsg .txt { white-space: pre-wrap; word-break: break-word; font: 12px/1.5 var(--mono); color: #cbe8d5; margin-top: 4px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip, .badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 3px 7px;
    color: var(--muted);
    background: rgba(255, 255, 255, .04);
    font-size: 11px;
  }
  .chip.on, .badge.on { color: #c9f2d7; border-color: rgba(120, 223, 155, .36); }
  .chip.warn, .badge.warn { color: #f3d999; border-color: rgba(240, 207, 99, .42); }
  .chip.off, .badge.off { color: #f0adb0; border-color: rgba(237, 118, 118, .38); }
  .metric {
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 10px;
    background: rgba(255, 255, 255, .035);
  }
  .metric b { display: block; font-size: 20px; letter-spacing: -.05em; }
  .metric span { display: block; color: var(--muted); font-size: 11px; margin-top: 2px; }
  .coverage-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    margin-bottom: 8px;
  }
  .coverage-stat {
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 8px;
    background: rgba(255, 255, 255, .035);
  }
  .coverage-stat b { display: block; color: #ecf5ef; font-size: 17px; line-height: 1; }
  .coverage-stat span { display: block; color: var(--muted); font-size: 10px; margin-top: 4px; }
  .folder-item {
    border-bottom: 1px solid rgba(255, 255, 255, .06);
    padding: 8px 0;
  }
  .folder-item:last-child { border-bottom: 0; }
  .folder-item .mini-row { border-bottom: 0; padding: 0 0 3px; }
  .mini-list { display: grid; gap: 0; }
  .mini-row {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, .06);
    padding: 7px 0;
  }
  .mini-row:last-child { border-bottom: 0; }
  .mini-row b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 720; }
  .scope-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12px; }
  .scope-tick { flex: 0 0 auto; accent-color: var(--green); cursor: pointer; margin: 0; }
  .scope-tick:disabled { cursor: not-allowed; opacity: .5; }
  .scope-label { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #dce7df; }
  .scope-label.ex { color: var(--faint); text-decoration: line-through; }
  .scope-count { flex: 0 0 auto; color: var(--muted); font-size: 11px; white-space: nowrap; }
  .scope-add { display: flex; gap: 6px; margin: 8px 0 5px; flex-wrap: wrap; align-items: center; }
  .scope-in { background: var(--panel-3); border: 1px solid rgba(255, 255, 255, .1); color: #dce7df; border-radius: 6px; padding: 3px 6px; font-size: 11px; min-width: 0; flex: 1 1 84px; }
  .scope-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 4px; }
  .scope-chip { font-size: 11px; background: rgba(240, 180, 90, .14); color: var(--amber); border-radius: 10px; padding: 2px 8px; cursor: pointer; }
  .scope-chip:hover { background: rgba(240, 180, 90, .24); }
  .path { font-family: var(--mono); font-size: 10px; word-break: break-all; color: var(--faint); }
  .activity { display: grid; gap: 8px; align-content: start; }
  .event {
    border-left: 2px solid rgba(120, 223, 155, .55);
    padding-left: 9px;
    color: #dce8de;
    font-size: 12px;
  }
  .event span { display: block; color: var(--muted); font-size: 11px; margin-top: 2px; }
  .inspector {
    height: calc(100vh - 20px);
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow: hidden;
  }
  .inspector > .panel { box-shadow: none; flex: 1 1 0; min-height: 84px; }
  .panel-split { flex: 0 0 6px; margin: 1px 0; }
  .action-stack { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  #brainmsg:empty, #msg:empty { display: none; }
  #brainmsg, #msg {
    border-radius: 7px;
    padding: 10px;
    background: rgba(120, 223, 155, .08);
    border: 1px solid rgba(120, 223, 155, .2);
    color: #c9f2d7;
    white-space: pre-wrap;
    font-size: 12px;
  }
  #settingsOverlay, #docOverlay, #sessionOverlay, #syncOverlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .62);
    backdrop-filter: blur(10px);
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
  /* Dialog harness — pick ONE fixed size at open time (see 02_RULES §Thiết kế UI).
     No dynamic resize; overflowing content scrolls INSIDE the dialog, never grows it. */
  .modal {
    display: flex;
    flex-direction: column;
    width: min(94vw, max(380px, 30vw)); /* fallback = S if no size class */
    max-width: 94vw;
    max-height: 90vh;
    overflow: hidden;
    border: 1px solid var(--line-strong);
    border-radius: 16px;
    background: #101713;
    box-shadow: var(--shadow);
    padding: 18px;
  }
  .modal.s { width: min(94vw, max(380px, 30vw)); max-height: 45vh; }
  .modal.m { width: min(94vw, max(560px, 50vw)); max-height: 70vh; }
  .modal.l { width: min(94vw, max(820px, 72vw)); max-height: 85vh; }
  .modal > .mtitle { flex: 0 0 auto; }
  .mtitle { color: var(--muted); margin-bottom: 12px; }
  .opt {
    width: 100%;
    text-align: left;
    margin: 8px 0;
    border-radius: 12px;
    background: rgba(255, 255, 255, .06);
    color: var(--text);
    box-shadow: none;
  }
  .opt b { display: block; }
  .opt span { display: block; color: var(--muted); font-weight: 500; margin-top: 2px; }
  .opt.cancel { text-align: center; background: transparent; color: var(--muted); }
  @media (max-width: 1180px) {
    .shell {
      grid-template-columns: minmax(0, 1fr) 320px;
      grid-template-rows: auto minmax(0, 1fr);
    }
    .shell > .resize-handle { display: none; }
    .rail {
      grid-column: 1 / -1;
      position: relative;
      top: 0;
      height: 72px;
      flex-direction: row;
      align-items: center;
    }
    .brand { min-width: 190px; }
    .nav { display: none; }
    .rail-foot { margin-left: auto; min-width: 250px; }
    .workspace { grid-column: 1; height: auto; }
    .inspector {
      grid-column: 2;
      height: auto;
      grid-template-columns: 1fr;
      grid-template-rows: minmax(82px, .72fr) minmax(120px, .9fr) minmax(160px, 1.35fr) minmax(104px, .9fr) minmax(116px, .95fr) minmax(92px, .72fr);
    }
    .commandbar { grid-template-columns: minmax(180px, 1fr) 112px 120px; }
    .commandbar .search-command { grid-column: 1 / -1; }
    .status-deck { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid-bottom { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 760px) {
    body { font-size: 12px; }
    .shell {
      height: 100dvh;
      grid-template-columns: 1fr;
      grid-template-rows: auto minmax(0, 1fr);
      padding: 8px;
      gap: 8px;
    }
    .rail {
      grid-column: 1;
      height: auto;
      display: block;
    }
    .brand { margin-bottom: 8px; }
    .rail-foot { display: none; }
    .workspace {
      grid-column: 1;
      height: auto;
      grid-template-rows: auto auto minmax(0, 1fr);
      overflow: hidden;
    }
    .resize-handle { display: none; }
    .grid-bottom, .inspector { display: none; }
    .commandbar, .status-deck, .searchline, .recall-head, .recall-workbench, .grid-bottom, .inspector, .action-stack {
      grid-template-columns: 1fr;
    }
    .status-deck {
      grid-template-columns: repeat(6, minmax(148px, 1fr));
      overflow-x: auto;
      overflow-y: hidden;
    }
    .status-card {
      height: 72px;
      min-height: 72px;
      padding: 8px 10px;
      overflow: hidden;
      border-right: 1px solid var(--line);
      border-bottom: 0;
    }
    .status-card .spark { display: none; }
    .status-card:last-child { border-right: 0; }
    .recall-head { display: none; }
    .recall-workbench { min-height: 0; }
    .result-list { border-right: 0; max-height: none; }
    .preview { border-top: 1px solid var(--line); max-height: none; }
    .searchline button { width: 100%; }
    .row { grid-template-columns: 1fr; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; }
  }
</style></head>
<body>
  <div class="shell">
    <aside class="rail">
      <div class="brand">
        <span class="brand-logo"><svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="zbrand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#78df9b"/><stop offset="1" stop-color="#b5efc8"/></linearGradient></defs><rect x="2" y="2" width="28" height="28" rx="8" fill="url(#zbrand)"/><g stroke="#08100e" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="#08100e"><path fill="none" d="M16 16 L10.5 10 M16 16 L21.5 9.5 M16 16 L22 21.5 M16 16 L10 21.5"/><circle cx="16" cy="16" r="2.7"/><circle cx="10.5" cy="10" r="2"/><circle cx="21.5" cy="9.5" r="2"/><circle cx="22" cy="21.5" r="2"/><circle cx="10" cy="21.5" r="2"/></g></svg></span>
        <div class="brand-text">
          <h1>zemory</h1>
          <p data-i18n="brand.tag">Bộ nhớ &amp; harness docs cho agent lập trình · v0.0.1</p>
        </div>
      </div>
      <div class="rail-scroll">
        <section class="panel" id="project" data-grow="rail0" data-grow-default="1" style="flex-grow:1">
          <div class="panel-head"><div><h3 data-i18n="proj.title">Dự án</h3><p data-i18n="proj.sub">Docs &amp; quy tắc của dự án đang chọn.</p></div></div>
          <div class="panel-pad">
            <div class="proj-pick"><select id="proj" onchange="pick()"></select><button class="ghost" title="Chạy harness: dựng docs của dự án theo chuẩn (bổ sung file thiếu, đánh số plan, không ghi đè nguồn DB)" data-i18n-title="tt.runHarness" onclick="runHarness()" data-i18n="proj.run">Chạy</button><button class="ghost" title="Cài đặt" data-i18n-title="tt.settings" onclick="openSettings()">⚙</button></div>
            <div class="proj-add"><input id="newProj" data-i18n-ph="ph.addproj" placeholder="Thêm dự án bằng đường dẫn folder…" onkeydown="if(event.key==='Enter')addProject()"><button class="ghost" onclick="addProject()" data-i18n="proj.add">+ Thêm</button></div>
            <div id="app" style="margin-top:8px"></div>
          </div>
        </section>
      </div>
    </aside>
    <div class="resize-handle vertical" data-resize="rail" role="separator" aria-orientation="vertical" tabindex="0" title="Drag to resize sidebar. Double-click to reset."></div>

    <main class="workspace">
      <header class="commandbar">
        <div class="field"><span class="live-dot"></span> <span data-i18n="bar.env">Máy: local</span></div>
        <div class="field">↗ CLI</div>
        <div class="field pill-btn" id="storagePill" title="Nơi lưu DB brain — bấm để mở Cài đặt" data-i18n-title="tt.storage" onclick="openSettings('storage')">🗄 <span id="storagePillTxt">—</span></div>
        <div class="field pill-btn" id="drivePill" title="Đồng bộ Drive — bấm để mở Cài đặt" data-i18n-title="tt.drive" onclick="openSettings('drive')">☁ <span id="drivePillTxt">—</span></div>
        <div class="icon-btns" style="margin-left:auto">
          <button class="ghost set-open" title="Cài đặt" data-i18n-title="tt.settings" onclick="openSettings()">⚙ <span data-i18n="bar.settings">Cài đặt</span></button>
          <button class="ghost" title="Làm mới" data-i18n-title="tt.refresh" onclick="manualRefresh()">↻</button>
        </div>
      </header>

      <section class="panel recall" id="recall">
        <div class="recall-head">
          <div class="recall-title">
            <h2>Recall</h2>
            <p data-i18n="recall.sub">Tìm trong các phiên Codex, Claude, Continue, LM Studio đã lưu.</p>
          </div>
        </div>
        <div class="searchline">
          <input type="text" id="bq" data-i18n-ph="ph.search" placeholder="ví dụ: cách stream tool output cho agent" autocomplete="off" oninput="onType()" onkeydown="if(event.key==='Enter')brainSearch(true)">
          <button onclick="brainSearch(true)"><span data-i18n="recall.search">Tìm</span> ⌘↵</button>
        </div>
        <div class="filterline">
          <label class="toggle" title="Tìm trong phiên của MỌI dự án (brain là toàn cục). Tắt = chỉ dự án đang chọn." data-i18n-title="tt.scopeAll"><input type="checkbox" id="ball" checked onchange="setScope()"> <span data-i18n="recall.scope">Mọi dự án</span></label>
          <label class="toggle" title="Recall semantic: FTS + vector. Tắt = chỉ keyword FTS." data-i18n-title="tt.hybrid"><input type="checkbox" id="hybrid" onchange="setHybrid()"> Hybrid</label>
          <label class="toggle" title="Cross-encoder rerank: xếp lại top ứng viên cho sắc nét hơn. Cần model reranker." data-i18n-title="tt.rerank"><input type="checkbox" id="rerank" onchange="setRerank()"> Rerank</label>
          <select id="fTime" class="filter-sel" onchange="brainSearch()" title="Lọc theo thời gian" data-i18n-title="tt.fTime">
            <option value="0" data-i18n="f.timeAny">Thời gian: mọi lúc</option><option value="1" data-i18n="f.time24">24h qua</option><option value="7" data-i18n="f.time7">7 ngày</option><option value="30" data-i18n="f.time30">30 ngày</option><option value="90" data-i18n="f.time90">90 ngày</option>
          </select>
          <select id="fType" class="filter-sel" onchange="brainSearch()" title="Lọc theo vai trò message" data-i18n-title="tt.fType">
            <option value="" data-i18n="f.typeAny">Loại: mọi</option><option value="user">user</option><option value="assistant">assistant</option><option value="tool">tool</option>
          </select>
          <select id="fOrigin" class="filter-sel" onchange="brainSearch()" title="Local = transcript agent trên đĩa; Web = web-chat đã thu (ChatGPT/…)" data-i18n-title="tt.fOrigin">
            <option value="" data-i18n="f.originAny">Nguồn: mọi</option><option value="local">Local (agents)</option><option value="web">Web chat</option>
          </select>
          <select id="fAgent" class="filter-sel" onchange="brainSearch()" title="Lọc theo agent/nguồn" data-i18n-title="tt.fAgent">
            <option value="">Agent: mọi</option>
          </select>
          <span class="tiny" style="margin-left:auto;cursor:pointer" id="queryHint" onclick="clearFilters()" data-i18n="recall.clear">Xoá lọc</span>
        </div>
        <div class="result-meta">
          <span id="resultCount" data-i18n="recall.hint">Gõ ít nhất 2 ký tự để tìm.</span>
          <span id="sortState" onclick="cycleSort()" title="Bấm để đổi cách sắp (liên quan / mới nhất / cũ nhất)" data-i18n-title="tt.sort">Sắp theo liên quan ⇅</span>
        </div>
        <div class="recall-workbench">
          <div id="brainhits" class="result-list">
            <div class="empty" data-i18n="recall.empty">Kết quả tìm sẽ hiện ở đây.</div>
          </div>
          <div class="resize-handle vertical" data-resize="recall" role="separator" aria-orientation="vertical" tabindex="0" title="Kéo để chỉnh cỡ. Bấm đúp để reset." data-i18n-title="tt.resize"></div>
          <div id="threadPreview" class="preview">
            <div class="preview-title"><b data-i18n="recall.preview">Xem trước phiên</b><span data-i18n="recall.waiting">chờ</span></div>
            <div class="empty" data-i18n="recall.previewEmpty">Chọn một kết quả để xem các message lân cận ngay tại đây.</div>
          </div>
        </div>
      </section>

      <div id="msg"></div>
    </main>
    <div class="resize-handle vertical" data-resize="inspector" role="separator" aria-orientation="vertical" tabindex="0" title="Drag to resize inspector. Double-click to reset."></div>

    <aside class="inspector">
      <section class="panel" id="brain" data-grow="insp0" data-grow-default="2.1" style="flex-grow:2.1">
        <div class="panel-head"><div><h3 data-i18n="mem.title">Bộ nhớ toàn cục</h3><p id="memSub">One SQLite brain.</p></div></div>
        <div class="panel-pad" id="memoryPanel"></div>
      </section>
      <div class="resize-handle horizontal panel-split" data-resize="split" role="separator" aria-orientation="horizontal" tabindex="0" title="Drag to resize. Double-click to reset."></div>
      <section class="panel" id="capture" data-grow="insp1" data-grow-default=".85" style="flex-grow:.85">
        <div class="panel-head"><div><h3><span data-i18n="scan.title">Quét &amp; thu thập</span><span class="q" title="Đọc transcript agent trên MÁY NÀY vào brain. 'Quét nhanh' đọc lại store đã biết (nhanh); 'Quét sâu' rà cả ổ đĩa tìm folder agent mới." data-i18n-title="tt.scan">?</span></h3><p data-i18n="scan.sub">Kéo ngữ cảnh mới từ máy này.</p></div></div>
        <div class="panel-pad">
          <div class="action-stack"><button onclick="brainScan(false)" data-i18n="scan.known">Quét nhanh</button><button class="ghost warn" onclick="brainScan(true)" data-i18n="scan.deep">Quét sâu</button></div>
          <div id="brainmsg" style="margin-top:10px"></div>
          <div id="brainreport" class="mini-list" style="margin-top:8px"></div>
        </div>
      </section>
      <div class="resize-handle horizontal panel-split" data-resize="split" role="separator" aria-orientation="horizontal" tabindex="0" title="Drag to resize. Double-click to reset."></div>
      <section class="panel" id="coverage" data-grow="insp2" data-grow-default="1.1" style="flex-grow:1.1">
        <div class="panel-head"><div><h3><span data-i18n="proj2.title">Dự án</span><span class="q" title="Các folder dự án đã có phiên được thu, kèm số phiên / message / agent mỗi dự án." data-i18n-title="tt.projects">?</span></h3><p data-i18n="proj2.sub">Folder dự án đã có phiên được thu.</p></div></div>
        <div class="panel-pad" id="coveragePanel"></div>
      </section>
    </aside>
  </div>

  <div id="settingsOverlay" onclick="if(event.target===this)closeSettings()">
    <div class="settings-modal">
      <div class="set-side">
        <div class="set-title">⚙ <span data-i18n="set.title">Cài đặt</span></div>
        <button class="set-tab on" data-pane="lang" onclick="setSettingsTab(this)">🌐 <span data-i18n="set.lang">Ngôn ngữ</span></button>
        <button class="set-tab" data-pane="storage" onclick="setSettingsTab(this)">🗄 <span data-i18n="set.storage">Nơi lưu</span></button>
        <button class="set-tab" data-pane="drive" onclick="setSettingsTab(this)">☁ Drive</button>
        <button class="set-tab" data-pane="search" onclick="setSettingsTab(this)">🔍 <span data-i18n="set.search">Tìm kiếm</span></button>
        <button class="set-tab" data-pane="health" onclick="setSettingsTab(this)">🩺 <span data-i18n="set.health">Kiểm tra</span></button>
        <button class="set-tab" data-pane="docs" onclick="setSettingsTab(this)">📄 Docs harness</button>
      </div>
      <div class="set-body">
        <button class="set-close" onclick="closeSettings()" title="Đóng" data-i18n-title="tt.close">✕</button>

        <div class="set-pane on" data-pane="lang">
          <h2 data-i18n="lang.h">Ngôn ngữ giao diện</h2>
          <p class="set-desc" data-i18n="lang.d">Chọn một ngôn ngữ cho toàn bộ giao diện. Thuật ngữ kỹ thuật (Recall, Hybrid, FTS5…) giữ nguyên.</p>
          <div class="set-row"><div class="set-lab"><span data-i18n="lang.row">Ngôn ngữ</span><small data-i18n="lang.note">Áp dụng ngay, lưu vào config.json.</small></div>
            <div class="seg"><button id="langVi" class="on" onclick="setLangUI('vi')">Tiếng Việt</button><button id="langEn" onclick="setLangUI('en')">English</button></div></div>
        </div>

        <div class="set-pane" data-pane="storage">
          <h2 data-i18n="storage.h">Nơi lưu dữ liệu</h2>
          <p class="set-desc" data-i18n="storage.d">DB brain nên nằm ngoài ổ C để ổ C không phình. Con trỏ ~/.zemory/location.json ghi nhớ chỗ này.</p>
          <div class="set-lab" data-i18n="storage.folder">Thư mục lưu brain</div>
          <div class="path-box">
            <input type="text" id="storageLink" placeholder="vd D:\Zyro\Tool\Zemory\data" onkeydown="if(event.key==='Enter')relocateStorage()">
            <button class="mini-btn" id="relocateBtn" onclick="relocateStorage()">⇄ <span data-i18n="storage.move">Dời</span></button>
          </div>
          <div id="storageState" class="drive-state" style="margin-top:8px"></div>
          <div class="set-warn" data-i18n="storage.warn">⚠ Không chọn folder Google Drive / OneDrive đang sync — DB đang mở sẽ hỏng.</div>
        </div>

        <div class="set-pane" data-pane="drive">
          <h2 data-i18n="drive.h">Đồng bộ qua Drive</h2>
          <p class="set-desc" data-i18n="drive.d">Mỗi máy xuất một bundle mã hoá vào folder Drive; máy khác merge vào. DB sống KHÔNG bị sync trực tiếp.</p>
          <div class="set-lab" data-i18n="drive.folder">Folder Drive</div>
          <div class="path-box">
            <input type="text" id="driveLink" placeholder="vd G:\My Drive\zemory" onkeydown="if(event.key==='Enter')testDrive()">
            <button class="mini-btn ghost" id="driveBtn" onclick="testDrive()">Link</button>
            <button class="mini-btn" id="syncBtn" onclick="driveSync()">⟳ Sync</button>
          </div>
          <div id="driveState" class="drive-state" style="margin-top:8px"></div>
        </div>

        <div class="set-pane" data-pane="search">
          <h2 data-i18n="search.h">Mặc định tìm kiếm</h2>
          <p class="set-desc" data-i18n="search.d">Bật/tắt cũng đổi ngay trên thanh Recall. Lưu vào config.json.</p>
          <div id="searchPrefs"></div>
        </div>

        <div class="set-pane" data-pane="health">
          <h2 data-i18n="health.h">Kiểm tra hệ thống</h2>
          <p class="set-desc" data-i18n="health.d">Các tính năng lõi có chạy được trên máy này không (FTS5, recall, harness).</p>
          <div style="margin-bottom:10px"><button class="mini-btn ghost" onclick="runChecks()" data-i18n="health.retest">Kiểm tra lại</button></div>
          <div id="checksBody"></div>
        </div>

        <div class="set-pane" data-pane="docs">
          <h2>Docs harness</h2>
          <p class="set-desc" data-i18n="docs.d">Đồng bộ / dựng lại bộ docs chuẩn cho dự án. Không bao giờ ghi đè nguồn trong DB.</p>
          <button class="opt" onclick="act('/sync')"><b>Sync</b><span data-i18n="docs.sync">Thêm docs còn thiếu, giữ nguyên nguồn DB.</span></button>
          <button class="opt warn" onclick="actConfirm('/init-fresh','Dời docs hiện tại sang bên (docs.old-…) và tạo bộ mới?')"><b data-i18n="docs.fresh">Dựng mới</b><span data-i18n="docs.freshD">Giữ docs cũ sang bên, tạo bộ sạch.</span></button>
        </div>
      </div>
    </div>
  </div>

  <div id="syncOverlay" onclick="if(event.target===this && !window.__syncing)closeSyncBox()">
    <div class="modal m">
      <div class="mtitle">Cross-machine sync</div>
      <div id="syncBox" class="sync-box"></div>
    </div>
  </div>

  <div id="docOverlay" onclick="if(event.target===this)closeDoc()">
    <div class="modal l doc-modal">
      <div class="mtitle"><b id="docName" style="color:var(--text)"></b> <button class="ghost" style="float:right;padding:4px 10px" onclick="closeDoc()">✕</button></div>
      <pre id="docBody" class="doc-body">loading...</pre>
    </div>
  </div>

  <div id="sessionOverlay" onclick="if(event.target===this)closeSession()">
    <div class="modal l session-modal">
      <div class="mtitle"><b id="sessName" style="color:var(--text)"></b> <span id="sessMeta" class="tiny"></span> <button class="ghost" style="float:right;padding:4px 10px" onclick="closeSession()">✕</button></div>
      <div id="sessBody" class="session-body">loading...</div>
    </div>
  </div>

<script>
  const el = (s) => document.getElementById(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  let last = null, brain = null, checks = {}, curRoot = '', typer = null, selectedHit = null, lastHits = [], sortMode = 'rel';
  const layoutKey = 'zemory.ui.layout.v2';
  const layoutDefaults = { railW: '244px', inspectorW: '366px', bottomH: '210px', recallLeft: '64%' };

  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
  // Layout is persisted SERVER-SIDE (~/.zemory/config.json) so a reopen restores
  // it exactly — localStorage is keyed by origin and the cockpit binds a random
  // port every launch, which is why drags used to reset. localStorage is kept as
  // a same-port fast cache; the server is the durable source of truth.
  let layoutCache = null;
  function readLayout(){
    if(layoutCache) return layoutCache;
    try { layoutCache = JSON.parse(localStorage.getItem(layoutKey) || '{}') || {}; }
    catch(e){ layoutCache = {}; }
    return layoutCache;
  }
  function writeLayout(patch){
    const next = readLayout();
    Object.keys(patch).forEach(k => patch[k] == null ? delete next[k] : next[k] = patch[k]);
    layoutCache = next;
    try { localStorage.setItem(layoutKey, JSON.stringify(next)); } catch(e){}
    try { fetch('/set-ui-state?state=' + encodeURIComponent(JSON.stringify(next)), { method: 'POST' }); } catch(e){}
  }
  async function loadLayoutFromServer(){
    try {
      const s = await (await fetch('/ui-state')).json();
      if(s && s.layout && Object.keys(s.layout).length){
        layoutCache = s.layout;
        try { localStorage.setItem(layoutKey, JSON.stringify(s.layout)); } catch(e){}
        applyStoredLayout();
        applyStoredGrows();
      }
    } catch(e){}
  }
  function setLayoutVar(name, value){
    document.documentElement.style.setProperty(name, value);
  }
  function applyStoredLayout(){
    const l = readLayout();
    if(l.railW) setLayoutVar('--rail-w', l.railW);
    if(l.inspectorW) setLayoutVar('--inspector-w', l.inspectorW);
    if(l.bottomH) setLayoutVar('--bottom-h', l.bottomH);
    if(l.recallLeft) setLayoutVar('--recall-left', l.recallLeft);
  }
  function resetResize(type){
    const patch = {};
    if(type === 'rail') { setLayoutVar('--rail-w', layoutDefaults.railW); patch.railW = null; }
    if(type === 'inspector') { setLayoutVar('--inspector-w', layoutDefaults.inspectorW); patch.inspectorW = null; }
    if(type === 'bottom') { setLayoutVar('--bottom-h', layoutDefaults.bottomH); patch.bottomH = null; }
    if(type === 'recall') { setLayoutVar('--recall-left', layoutDefaults.recallLeft); patch.recallLeft = null; }
    writeLayout(patch);
  }
  function applyStoredGrows(){
    const g = (readLayout().grows) || {};
    document.querySelectorAll('[data-grow]').forEach(p => {
      const v = g[p.dataset.grow];
      if(v != null) p.style.flexGrow = v;
    });
  }
  function initPanelSplits(){
    document.querySelectorAll('.panel-split').forEach(h => {
      let drag = null;
      h.addEventListener('pointerdown', e => {
        if(window.matchMedia('(max-width: 760px)').matches) return;
        const prev = h.previousElementSibling, next = h.nextElementSibling;
        if(!prev || !next) return;
        const pH = prev.getBoundingClientRect().height, nH = next.getBoundingClientRect().height;
        const pG = parseFloat(getComputedStyle(prev).flexGrow) || 1;
        const nG = parseFloat(getComputedStyle(next).flexGrow) || 1;
        drag = { prev, next, startY: e.clientY, pH, nH, totalH: pH + nH, totalG: pG + nG };
        try { h.setPointerCapture(e.pointerId); } catch(_){}
        h.classList.add('active');
        document.body.classList.add('resizing', 'resizing-row');
        e.preventDefault();
      });
      h.addEventListener('pointermove', e => {
        if(!drag) return;
        const min = 70;
        const npH = clamp(drag.pH + (e.clientY - drag.startY), min, drag.totalH - min);
        const pg = drag.totalG * (npH / drag.totalH);
        drag.prev.style.flexGrow = pg.toFixed(3);
        drag.next.style.flexGrow = (drag.totalG - pg).toFixed(3);
        e.preventDefault();
      });
      const end = () => {
        if(!drag) return;
        const g = (readLayout().grows) || {};
        if(drag.prev.dataset.grow) g[drag.prev.dataset.grow] = drag.prev.style.flexGrow;
        if(drag.next.dataset.grow) g[drag.next.dataset.grow] = drag.next.style.flexGrow;
        writeLayout({ grows: g });
        h.classList.remove('active');
        document.body.classList.remove('resizing', 'resizing-row');
        drag = null;
      };
      h.addEventListener('pointerup', end);
      h.addEventListener('pointercancel', end);
      h.addEventListener('dblclick', () => {
        const prev = h.previousElementSibling, next = h.nextElementSibling, g = (readLayout().grows) || {};
        [prev, next].forEach(p => { if(p && p.dataset.growDefault){ p.style.flexGrow = p.dataset.growDefault; delete g[p.dataset.grow]; } });
        writeLayout({ grows: g });
      });
    });
  }
  function initResizers(){
    const handles = Array.from(document.querySelectorAll('.resize-handle:not(.panel-split)'));
    let active = null;
    const cssNum = (name, fallback) => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const canResize = (type) => {
      if(window.matchMedia('(max-width: 760px)').matches) return false;
      if((type === 'rail' || type === 'inspector') && window.matchMedia('(max-width: 1180px)').matches) return false;
      return true;
    };
    const update = (type, clientX, clientY, base) => {
      let out = null;
      if(type === 'rail') {
        const r = document.querySelector('.shell').getBoundingClientRect();
        const px = Math.round(clamp(clientX - r.left - 10, 150, 340));
        setLayoutVar('--rail-w', px + 'px');
        out = { railW: px + 'px' };
      }
      if(type === 'inspector') {
        const r = document.querySelector('.shell').getBoundingClientRect();
        const px = Math.round(clamp(r.right - clientX - 10, 230, 460));
        setLayoutVar('--inspector-w', px + 'px');
        out = { inspectorW: px + 'px' };
      }
      if(type === 'recall') {
        const r = document.querySelector('.recall-workbench').getBoundingClientRect();
        const pct = clamp(((clientX - r.left) / Math.max(1, r.width)) * 100, 36, 76);
        const val = pct.toFixed(1) + '%';
        setLayoutVar('--recall-left', val);
        out = { recallLeft: val };
      }
      if(type === 'bottom') {
        const ws = document.querySelector('.workspace').getBoundingClientRect();
        const max = Math.max(150, Math.round(ws.height * .46));
        const px = Math.round(clamp(base.bottomStart - (clientY - base.startY), 112, max));
        setLayoutVar('--bottom-h', px + 'px');
        out = { bottomH: px + 'px' };
      }
      if(out) active.pending = out;
    };
    const stop = () => {
      if(!active) return;
      if(active.pending) writeLayout(active.pending);
      try { active.handle.releasePointerCapture(active.pointerId); } catch(e){}
      active.handle.classList.remove('active');
      document.body.classList.remove('resizing', 'resizing-col', 'resizing-row');
      active = null;
    };
    window.addEventListener('pointermove', e => {
      if(!active) return;
      e.preventDefault();
      update(active.type, e.clientX, e.clientY, active);
    });
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    handles.forEach(handle => {
      const type = handle.dataset.resize;
      handle.addEventListener('pointerdown', e => {
        if(!canResize(type)) return;
        const bottom = document.querySelector('.grid-bottom');
        active = {
          type,
          handle,
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          bottomStart: bottom ? bottom.getBoundingClientRect().height : cssNum('--bottom-h', 210),
          pending: null,
        };
        try { handle.setPointerCapture(e.pointerId); } catch(e){}
        handle.classList.add('active');
        document.body.classList.add('resizing', handle.classList.contains('horizontal') ? 'resizing-row' : 'resizing-col');
        e.preventDefault();
      });
      handle.addEventListener('dblclick', () => resetResize(type));
      handle.addEventListener('keydown', e => {
        if(!canResize(type)) return;
        const big = e.shiftKey ? 32 : 16;
        const layout = readLayout();
        const setAndSave = (name, value) => { setLayoutVar(name, value); writeLayout(name === '--rail-w' ? {railW:value} : name === '--inspector-w' ? {inspectorW:value} : name === '--bottom-h' ? {bottomH:value} : {recallLeft:value}); };
        if(type === 'rail' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          e.preventDefault();
          const cur = parseFloat(layout.railW || getComputedStyle(document.documentElement).getPropertyValue('--rail-w')) || 205;
          setAndSave('--rail-w', Math.round(clamp(cur + (e.key === 'ArrowRight' ? big : -big), 150, 340)) + 'px');
        }
        if(type === 'inspector' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          e.preventDefault();
          const cur = parseFloat(layout.inspectorW || getComputedStyle(document.documentElement).getPropertyValue('--inspector-w')) || 295;
          setAndSave('--inspector-w', Math.round(clamp(cur + (e.key === 'ArrowLeft' ? big : -big), 230, 460)) + 'px');
        }
        if(type === 'bottom' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          e.preventDefault();
          const cur = parseFloat(layout.bottomH || getComputedStyle(document.documentElement).getPropertyValue('--bottom-h')) || 210;
          setAndSave('--bottom-h', Math.round(clamp(cur + (e.key === 'ArrowUp' ? big : -big), 112, 380)) + 'px');
        }
        if(type === 'recall' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          e.preventDefault();
          const cur = parseFloat(layout.recallLeft || getComputedStyle(document.documentElement).getPropertyValue('--recall-left')) || 64;
          setAndSave('--recall-left', clamp(cur + (e.key === 'ArrowRight' ? 3 : -3), 36, 76).toFixed(1) + '%');
        }
      });
    });
  }
  applyStoredLayout();
  applyStoredGrows();

  function ru(extra){
    const p = new URLSearchParams();
    if(curRoot) p.set('root', curRoot);
    if(extra) Object.keys(extra).forEach(k => p.set(k, extra[k]));
    const s = p.toString();
    return s ? ('?' + s) : '';
  }
  function fmtN(n){ return Number(n || 0).toLocaleString(); }
  function fmtBytes(kb){
    const n = Number(kb || 0);
    if(!n) return '0 KB';
    if(n > 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' GB';
    if(n > 1024) return (n / 1024).toFixed(0) + ' MB';
    return n + ' KB';
  }
  function fmtDay(d){ return d ? String(d).slice(0, 10) : '-'; }
  function fmtTime(d){ return d ? new Date(d).toLocaleTimeString() : '-'; }
  function clip(s, n){ s = String(s || '').replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n) + '...' : s; }
  function projName(p){ return String(p || '').split(/[\\/]/).filter(Boolean).pop() || '(unknown)'; }
  function statusClass(state){ return state === 'on' ? 'on' : state === 'warn' ? 'warn' : state === 'off' ? 'off' : ''; }
  function chip(text, state){ return '<span class="chip ' + statusClass(state) + '">' + esc(text) + '</span>'; }
  function badge(text, state){ return '<span class="badge ' + statusClass(state) + '">' + esc(text) + '</span>'; }
  function escapeRegExp(t){
    const specials = ['\\','^','$','.','|','?','*','+','(',')','[',']','{','}'];
    let out = '';
    for (const ch of String(t)) out += specials.includes(ch) ? '\\' + ch : ch;
    return out;
  }
  function queryTerms(){ return el('bq').value.toLowerCase().split(/\s+/).filter(t => t.length >= 2); }
  function highlight(raw, terms){
    let s = esc(raw);
    for (const t of terms) s = s.replace(new RegExp('(' + escapeRegExp(t) + ')', 'gi'), '<mark>$1</mark>');
    return s;
  }
  function scoreValue(h, index){
    const n = Number(h.score || h.rank || h.similarity || 0);
    if(n > 0 && n <= 1) return n.toFixed(2);
    if(n > 1) return Math.min(0.99, n / 100).toFixed(2);
    return (0.89 - Math.min(index, 7) * 0.04).toFixed(2);
  }
  function bar(state) {
    if (state === 'checking') return '<div class="bar"><i class="ind" style="background:var(--amber)"></i></div>';
    const filled = state === 'on' || state === 'off' || state === 'warn';
    const col = state === 'on' ? 'var(--green)' : state === 'off' ? 'var(--red)' : state === 'warn' ? 'var(--amber)' : 'rgba(255,255,255,.15)';
    return '<div class="bar"><i style="width:' + (filled ? '100%' : '0%') + ';background:' + col + '"></i></div>';
  }
  function row(name, state, detail, help) {
    const q = help ? '<span class="q" title="' + esc(help) + '">?</span>' : '';
    return '<div class="row2"><div class="row2-top"><span class="name">' + esc(name) + '</span>'
      + '<span style="flex:1 1 auto"></span>' + q + '</div>'
      + bar(state)
      + '<div class="d2">' + esc(detail) + '</div></div>';
  }
  function miniRow(a, b){ return '<div class="mini-row"><b>' + esc(a) + '</b><span class="muted">' + b + '</span></div>'; }
  function folderLine(label, path, meta){
    return '<div class="folder-item"><div class="mini-row"><b title="' + esc(path) + '">' + esc(label) + '</b><span class="muted">' + esc(meta || '') + '</span></div>' +
      '<div class="path">' + esc(path || '(unknown)') + '</div></div>';
  }
  function sectionTitle(text){
    return '<div class="tiny" style="text-transform:uppercase;letter-spacing:.12em;margin:10px 0 4px">' + esc(text) + '</div>';
  }
  function projOpts(){
    const cur = curRoot || (last && last.project && last.project.root) || '';
    const conn = last && last.project && last.project.connected;
    const seen = new Set();
    let o = '';
    (last && last.knownProjects || []).forEach(p => {
      seen.add(p.root);
      o += '<option value="' + esc(p.root) + '"' + (p.root === cur ? ' selected' : '') + '>' + esc(p.name) + '</option>';
    });
    if(cur && !seen.has(cur)){
      const nm = ((last && last.project && last.project.name) || cur) + (conn ? '' : ' (not set up)');
      o = '<option value="' + esc(cur) + '" selected>' + esc(nm) + '</option>' + o;
    }
    return o || '<option value="">(none)</option>';
  }
  function pick(){ curRoot = el('proj').value; checks = {}; tick(); brainTick(); runChecks(); }
  // Run harness = restructure the selected project's docs to the standard
  // (scaffold missing, register it). The agent then adapts content per AGENTS.md.
  function runHarness(){ act('/sync'); }
  // Add a project by path: target it (shows as "not set up"), then user hits Run.
  function addProject(){ const p = el('newProj').value.trim(); if(!p) return; el('newProj').value = ''; applyRoot(p); }
  function applyRoot(path){ if(!path || !path.trim()) return; curRoot = path.trim(); checks = {}; el('msg').textContent = 'Target project: ' + curRoot; tick(); brainTick(); runChecks(); }
  function goRoot(){ applyRoot(el('rootpath').value); }
  function rootKey(e){ if(e.key === 'Enter') goRoot(); }
  async function manualRefresh(){ await tick(); await brainTick(); if(el('bq').value.trim().length >= 2) await brainSearch(); }

  function renderStatus(){
    if(!last) return;
    el('proj').innerHTML = projOpts();
    const docsOk = last.docs.filter(d => d.ok).length;
    let h = '';
    // Shared standard (docs_template/) — the canonical harness applied to EVERY
    // project. Read-only reference; NOT this or any project's own docs.
    const STD = [['AGENTS.md', 'AGENTS.md'], ['01_CONSTITUTION.md', 'agent/01_CONSTITUTION.md'], ['02_RULES.md', 'agent/02_RULES.md'], ['03_STRUCTURE.md', 'agent/03_STRUCTURE.md'], ['04_TODO.md', 'agent/04_TODO.md'], ['05_CHANGES.md', 'agent/05_CHANGES.md']];
    h += '<div class="tiny" style="text-transform:uppercase;letter-spacing:.12em;margin:2px 0 4px">' + t('r.std') + ' <span class="q" title="' + esc(t('tt.std')) + '">?</span></div>';
    h += '<div class="chips" style="margin-bottom:10px">' + STD.map(s => '<span class="chip doc-link on" onclick="openStandardDoc(\'' + s[1] + '\')" title="' + esc(s[1]) + '">' + esc(s[0]) + '</span>').join('') + '</div>';
    h += row(last.project.name || t('r.noproj'), last.project.connected ? 'on' : 'off', last.project.root || t('r.runinit'), 'docs/.harness.json?');
    h += '<div class="tiny" style="margin:8px 0 4px">' + t('r.projdocs') + '</div>';
    h += '<div class="chips" style="margin-bottom:10px">' + (last.docs || []).map(d => '<span class="chip doc-link ' + (d.ok ? 'on' : 'off') + '" onclick="openDoc(\'' + esc(d.file) + '\')" title="' + esc(d.file) + '">' + esc(d.file) + '</span>').join('') + '</div>';
    if(last.setup) h += row(t('r.setup'), last.setup.complete ? 'on' : 'warn', last.setup.detail, '');
    if(last.plan) h += row(t('r.plan'), last.plan.needsReconcile ? 'warn' : (last.plan.exists ? 'on' : 'planned'), last.plan.detail, 'docs/plan ⟵ global_memory.db');
    h += '<div class="chips" style="margin-top:10px">' + chip(docsOk + '/' + (last.docs || []).length + ' ' + t('r.docs'), docsOk === (last.docs || []).length ? 'on' : 'off') + chip((last.knownProjects || []).length + ' ' + t('r.known'), 'on') + '</div>';
    el('app').innerHTML = h;
    renderChecks();
  }
  function featState(key){ const c = checks[key]; return c ? c.state : 'idle'; }
  function featDetail(key){ const c = checks[key]; return c && c.detail ? c.detail : 'not tested'; }
  function renderChecks(){
    if(!last) return;
    let h = '';
    let pass = 0, total = 0;
    for (const group of [['token','Brain integrity'], ['workflow','Workflow']]) {
      const feats = last.features.filter(f => f.group === group[0]);
      if(!feats.length) continue;
      h += '<div class="tiny" style="text-transform:uppercase;letter-spacing:.12em;margin:8px 0 4px">' + group[1] + '</div>';
      for (const f of feats) {
        total++;
        if(featState(f.key) === 'on') pass++;
        h += row(f.label, featState(f.key), featDetail(f.key), f.help);
      }
    }
    el('checksBody').innerHTML = h || '<div class="muted">No checks.</div>';
  }
  async function tick(){
    try {
      last = await (await fetch('/status' + ru())).json();
      renderStatus();
    } catch(e) {
      el('app').innerHTML = '<div class="muted">status error: ' + esc(e) + '</div>';
    }
  }
  async function runChecks(){
    if(!last) return;
    checks.__docs = { state: 'checking', detail: 'checking docs' };
    renderChecks();
    await sleep(200);
    await tick();
    delete checks.__docs;
    for (const f of last.features) {
      checks[f.key] = { state: 'checking', detail: 'running...' };
      renderChecks();
      await sleep(120);
      try { checks[f.key] = await (await fetch('/check' + ru({feature: f.key}))).json(); }
      catch(e) { checks[f.key] = { state: 'off', detail: 'check error' }; }
      renderChecks();
    }
  }

  function renderBrainSummary(s){
    brain = s || {};
    const tot = brain.totals || {};
    const vectors = brain.vectors || {};
    const info = brain.info || {};
    const capture = brain.coverage || {};
    const projects = capture.projects || [];
    el('hybrid').checked = !!brain.hybrid;
    el('rerank').checked = !!brain.rerank;
    el('ball').checked = brain.scope !== false;
    if(!window.__langApplied){ window.__langApplied = true; applyLang(brain.lang || 'vi'); }
    if(el('settingsOverlay').style.display === 'flex') renderSettingsSearch();
    const fa = el('fAgent'); const faCur = fa.value;
    fa.innerHTML = '<option value="">' + t('f.agentAny') + '</option>' + (brain.agents || []).map(a => '<option value="' + esc(a.source) + '">' + esc(a.source) + '</option>').join('');
    fa.value = faCur;
    const drive = brain.drive || {};
    if(document.activeElement !== el('driveLink')) el('driveLink').value = drive.path || '';
    renderDriveState(drive);
    const storage = brain.storage || null;
    if(storage && document.activeElement !== el('storageLink')) el('storageLink').value = storage.dir || '';
    renderStorageState(storage);
    const vectorCoverage = vectors.coverage == null ? '-' : vectors.coverage + '%';
    el('memSub').textContent = (tot.sessions ? t('m.healthy') : t('m.empty')) + ' · ' + t('m.updated') + ' ' + fmtTime(brain.generatedAt);
    el('memoryPanel').innerHTML =
      '<div class="coverage-stats">' +
      '<div class="coverage-stat"><b>' + fmtN(tot.messages) + '</b><span>' + t('m.msgs') + '</span></div>' +
      '<div class="coverage-stat"><b>' + fmtN(tot.sessions) + '</b><span>' + t('m.sess') + '</span></div>' +
      '<div class="coverage-stat"><b>~' + fmtN(brain.tokensEst) + '</b><span>' + t('m.tok') + '</span></div>' +
      '<div class="coverage-stat"><b>' + fmtBytes(brain.sizeKB) + '</b><span>' + t('m.size') + '</span></div>' +
      '</div>' +
      '<div class="mini-list" style="margin-top:8px">' +
      miniRow(t('m.capcost'), t('m.capval') + '<span class="q" title="' + esc(t('tt.capcost')) + '">?</span>') +
      miniRow(t('m.search'), (brain.hybrid ? 'BM25 + Vector' : t('m.ftsonly')) + (brain.rerank ? ' + rerank' : '')) +
      miniRow('Vector index', fmtN(vectors.count) + ' vec · ' + vectorCoverage + (vectors.remaining ? (' · ' + fmtN(vectors.remaining) + ' ' + t('m.pending')) : '') + (vectors.error ? ' · ' + t('m.err') : '')) +
      '</div>' +
      '<div class="tiny" style="text-transform:uppercase;letter-spacing:.12em;margin:10px 0 4px">' + t('m.sources') + (brain.scopeExcluded ? ' · ' + t('m.excl') + ' ' + brain.scopeExcluded : '') + t('m.untick') + '<span class="q" title="Lane nguồn (máy/agent Local, nền tảng Web) nào feed vào sync + recall. Bỏ tick lane chung/nhiễu để loại — vừa sạch nguồn cho harness vừa ít token rác cho recall. Là bộ lọc, không xoá: dữ liệu vẫn trong DB local.">?</span></div>' +
      renderScopeTree(brain.scopeTree || []) +
      renderScopeAdd(brain.scopeRules || []) +
      sectionTitle(t('m.tables')) +
      ((info.tables || []).map(r => miniRow(r.name, fmtN(r.rows) + (r.detail ? ' · ' + esc(r.detail) : ''))).join('') || '<div class="muted">' + t('m.none') + '</div>') +
      '<div class="path" style="margin-top:8px">' + esc(brain.dbPath || '') + '</div>';
    el('coveragePanel').innerHTML =
      (projects.length ? projects.map(p => folderLine(projName(p.path), p.path, fmtN(p.sessions) + ' ' + t('cov.sess') + ' / ' + fmtN(p.messages) + ' ' + t('cov.msg') + ' / ' + fmtN(p.agents) + ' ' + t('cov.agent'))).join('') : '<div class="muted">' + t('cov.none') + '</div>');
  }
  // Provenance tree (Local/Web × machine × agent). A ticked box = the lane is
  // INCLUDED; untick to exclude it from sync + recall (a filter, never a delete).
  function renderScopeTree(nodes){
    if(!nodes || !nodes.length) return '<div class="muted">none</div>';
    const walk = (n, depth) => {
      const checked = !n.effectiveExcluded;
      const disabled = n.effectiveExcluded && !n.excluded; // an ancestor lane excludes it
      const cls = 'scope-label' + (n.effectiveExcluded ? ' ex' : '');
      let h = '<div class="scope-row" style="padding-left:' + (depth * 14) + 'px">'
        + '<input type="checkbox" class="scope-tick"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '')
        + ' title="Untick = leave this lane out of sync + recall"'
        + ' data-lane="' + esc(JSON.stringify(n.lane || {})) + '" onchange="scopeExcludeEl(this)">'
        + '<span class="' + cls + '">' + esc(n.label) + '</span>'
        + '<span class="scope-count">' + fmtN(n.sessions) + ' · ' + fmtN(n.messages) + ' msg</span>'
        + '</div>';
      for(const c of (n.children || [])) h += walk(c, depth + 1);
      return h;
    };
    return nodes.map(n => walk(n, 0)).join('');
  }
  async function scopeExcludeEl(elm){
    let lane = {};
    try { lane = JSON.parse(elm.getAttribute('data-lane') || '{}'); } catch(e){}
    await setScopeLane(lane, !elm.checked); // ticked = included = not excluded
  }
  async function setScopeLane(lane, exclude){
    const q = new URLSearchParams();
    if(lane.origin) q.set('origin', lane.origin);
    if(lane.host) q.set('host', lane.host);
    if(lane.source) q.set('source', lane.source);
    q.set('on', exclude ? '1' : '0');
    try {
      await fetch('/set-scope-exclude?' + q.toString(), { method: 'POST' });
      await brainTick();
      if(el('bq').value.trim().length >= 2) brainSearch();
    } catch(e){}
  }
  // "+ Add rule": preset a blocklist lane even for a source not captured yet
  // (blank field = wildcard). Pairs with scan-level exclude so it can keep a
  // shared space out of the brain entirely (V2); today it hides from sync+recall.
  function renderScopeAdd(rules){
    const chips = (rules || []).map(r => {
      const parts = [r.origin || 'any', r.host || 'any', r.source || 'any'].join(' · ');
      return '<span class="scope-chip" title="' + t('sc.rm') + '" data-lane="' + esc(JSON.stringify(r)) + '" onclick="scopeRemoveRule(this)">' + esc(parts) + ' ✕</span>';
    }).join('');
    return '<div class="scope-add">'
      + '<select id="scOrigin" class="scope-in"><option value="">' + t('sc.origin') + '</option><option value="local">local</option><option value="web">web</option></select>'
      + '<input id="scHost" class="scope-in" placeholder="' + t('sc.host') + '">'
      + '<input id="scSource" class="scope-in" placeholder="' + t('sc.source') + '">'
      + '<button class="ghost" onclick="scopeAddRule()">' + t('sc.add') + '</button>'
      + '</div>'
      + (rules && rules.length ? '<div class="scope-chips">' + chips + '</div>' : '');
  }
  async function scopeAddRule(){
    const lane = {};
    const o = el('scOrigin').value.trim();
    const h = el('scHost').value.trim();
    const s = el('scSource').value.trim();
    if(o) lane.origin = o;
    if(h) lane.host = h;
    if(s) lane.source = s;
    if(!lane.origin && !lane.host && !lane.source){ el('scSource').focus(); return; }
    await setScopeLane(lane, true);
  }
  async function scopeRemoveRule(elm){
    let lane = {};
    try { lane = JSON.parse(elm.getAttribute('data-lane') || '{}'); } catch(e){}
    await setScopeLane(lane, false);
  }
  async function brainTick(){
    try { renderBrainSummary(await (await fetch('/brain-status' + ru())).json()); }
    catch(e){ el('memoryPanel').innerHTML = '<div class="muted">brain status error: ' + esc(e) + '</div>'; }
  }
  async function setHybrid(){
    try {
      await fetch('/set-hybrid?on=' + (el('hybrid').checked ? 1 : 0), { method: 'POST' });
      await brainTick();
      if(el('bq').value.trim().length >= 2) brainSearch();
    } catch(e){}
  }
  async function setRerank(){
    try {
      await fetch('/set-rerank?on=' + (el('rerank').checked ? 1 : 0), { method: 'POST' });
      await brainTick();
      if(el('bq').value.trim().length >= 2) brainSearch();
    } catch(e){}
  }
  async function setScope(){
    try {
      await fetch('/set-scope?on=' + (el('ball').checked ? 1 : 0), { method: 'POST' });
      if(el('bq').value.trim().length >= 2) brainSearch();
    } catch(e){}
  }
  function setPill(id, txt){ const p = el(id); if(p) p.textContent = txt; }
  function renderDriveState(d){
    const s = el('driveState');
    s.title = (d && d.error) ? d.error : '';
    if(!d || !d.linked){ s.className = 'drive-state'; s.textContent = t('d.notlinked'); setPill('drivePillTxt', t('d.notlinked')); return; }
    if(!d.exists){ s.className = 'drive-state bad'; s.textContent = '✗ ' + (/^https?:/i.test(d.path) ? t('d.pastelocal') : t('d.nofolder')); setPill('drivePillTxt', t('d.err')); return; }
    if(!d.writable){ s.className = 'drive-state bad'; s.textContent = t('d.readonly'); setPill('drivePillTxt', t('d.readonly')); return; }
    s.className = 'drive-state ok'; s.textContent = t('d.linked') + ' · ' + fmtN(d.bundles) + ' ' + t('d.bundle'); setPill('drivePillTxt','✓ ' + fmtN(d.bundles) + ' ' + t('d.bundle'));
  }
  function renderStorageState(s){
    const el0 = el('storageState');
    if(!s){ el0.className = 'drive-state'; el0.textContent = ''; setPill('storagePillTxt','—'); return; }
    const mb = s.exists ? (s.sizeKB/1024).toFixed(0) + ' MB' : t('s.empty');
    if(s.pinnedByEnv){ el0.className = 'drive-state'; el0.textContent = t('s.envpin'); el0.title = 'GLOBAL_MEMORY_DB'; setPill('storagePillTxt', t('s.envpin')); return; }
    if(s.onCloud){ el0.className = 'drive-state bad'; el0.textContent = t('s.oncloud'); el0.title = s.dir; setPill('storagePillTxt','⚠ Drive'); return; }
    el0.className = 'drive-state ok'; el0.textContent = '✓ ' + (s.source === 'default' ? t('s.defaultC') : t('s.moved')) + ' · ' + mb; el0.title = s.dbPath;
    setPill('storagePillTxt', (s.source === 'default' ? t('s.shortC') : t('s.moved')) + ' · ' + mb);
  }
  async function relocateStorage(){
    const path = el('storageLink').value.trim();
    if(!path){ alert(t('rel.needpath')); return; }
    if(!confirm(t('rel.confirm') + '\n' + path + '\n\n' + t('rel.confirm2'))) return;
    const ss = el('storageState'), rb = el('relocateBtn');
    ss.className = 'drive-state'; ss.textContent = t('s.moving'); if(rb) rb.disabled = true;
    try {
      const r = await (await fetch('/relocate?path=' + encodeURIComponent(path), { method: 'POST' })).json();
      if(!r.ok){ ss.className = 'drive-state bad'; ss.textContent = t('s.err') + ' ' + (r.error||''); ss.title = r.error||''; if(rb) rb.disabled = false; return; }
      if(r.pointerOnly){ ss.className = 'drive-state ok'; ss.textContent = t('s.setptr'); }
      else { ss.className = 'drive-state ok'; ss.textContent = t('s.movedOk') + ' · ' + (r.movedBytes/1048576).toFixed(0) + ' MB · ' + r.messages + ' msg'; ss.title = t('rel.bak') + (r.backup||'') + t('rel.bakhint'); }
      if(rb) rb.disabled = false;
      brainTick();
    } catch(e){ ss.className = 'drive-state bad'; ss.textContent = t('s.err'); if(rb) rb.disabled = false; }
  }
  async function testDrive(){
    const path = el('driveLink').value.trim();
    el('driveState').className = 'drive-state'; el('driveState').textContent = '…';
    try {
      const d = await (await fetch('/set-drive?path=' + encodeURIComponent(path), { method: 'POST' })).json();
      renderDriveState(d);
    } catch(e){ el('driveState').className = 'drive-state bad'; el('driveState').textContent = t('d.err'); }
  }
  async function openDoc(file){
    el('docName').textContent = file;
    el('docBody').textContent = t('dv.loading');
    el('docOverlay').style.display = 'flex';
    try {
      const r = await (await fetch('/doc' + ru({file: file}))).json();
      el('docBody').textContent = r.content || t('dv.empty');
    } catch(e){ el('docBody').textContent = t('dv.err') + e; }
  }
  async function openStandardDoc(file){
    el('docName').textContent = 'STANDARD · ' + file;
    el('docBody').textContent = t('dv.loading');
    el('docOverlay').style.display = 'flex';
    try {
      const r = await (await fetch('/standard-doc?file=' + encodeURIComponent(file))).json();
      el('docBody').textContent = r.content || t('dv.empty');
    } catch(e){ el('docBody').textContent = t('dv.err') + e; }
  }
  function closeDoc(){ el('docOverlay').style.display = 'none'; }
  function clearFilters(){ el('fTime').value = '0'; el('fType').value = ''; el('fOrigin').value = ''; el('fAgent').value = ''; brainSearch(); }
  async function openSession(sid){
    el('sessName').textContent = 'Full session';
    el('sessMeta').textContent = '';
    el('sessBody').innerHTML = '<div class="muted">' + t('ss.loading') + '</div>';
    el('sessionOverlay').style.display = 'flex';
    try {
      const s = await (await fetch('/brain-session' + ru({id: sid}))).json();
      if(!s || !s.messages){ el('sessBody').innerHTML = '<div class="muted">' + t('ss.notfound') + '</div>'; return; }
      el('sessName').textContent = s.title || projName(s.project);
      el('sessMeta').textContent = esc(s.source) + ' · ' + esc(projName(s.project)) + ' · ' + s.messages.length + t('ss.msgs') + (s.truncated ? t('ss.trunc1') + s.messages.length + t('ss.trunc2') : '');
      el('sessBody').innerHTML = s.messages.map(m =>
        '<div class="smsg ' + esc(m.role || '') + '"><div class="role">' + esc(m.role || 'message') + ' · ' + fmtDay(m.timestamp) + ' · #' + m.id + '</div><div class="txt">' + esc(m.content || '') + '</div></div>'
      ).join('');
      el('sessBody').scrollTop = 0;
    } catch(e){ el('sessBody').innerHTML = '<div class="muted">' + t('ss.err') + esc(e) + '</div>'; }
  }
  function closeSession(){ el('sessionOverlay').style.display = 'none'; }
  function closeSyncBox(){ if(!window.__syncing) el('syncOverlay').style.display = 'none'; }
  async function driveSync(){
    const ds = el('driveState'), sb = el('syncBtn');
    ds.className = 'drive-state'; ds.textContent = t('sy.syncingShort'); ds.title = ''; if(sb) sb.disabled = true;
    window.__syncing = true;
    const syncStart = Date.now();
    el('syncBox').innerHTML =
      '<div class="spinner"></div>' +
      '<div class="sync-step"><b>' + t('sy.syncing') + '</b><span id="syncElapsed" style="margin-left:auto;font-variant-numeric:tabular-nums;color:#dce7df">0:00</span></div>' +
      '<div class="sync-step">' + t('sy.s1') + '</div>' +
      '<div class="sync-step">' + t('sy.s2') + '</div>' +
      '<div class="sync-step">' + t('sy.s3') + '</div>' +
      '<div class="sync-step">' + t('sy.s4') + '</div>' +
      '<div class="sync-step tiny" style="margin-top:6px">' + t('sy.note') + '</div>';
    el('syncOverlay').style.display = 'flex';
    const syncTimer = setInterval(function(){ var s = Math.floor((Date.now() - syncStart) / 1000), e = document.getElementById('syncElapsed'); if(e) e.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }, 1000);
    try {
      const r = await (await fetch('/drive-sync', { method: 'POST' })).json();
      window.__syncing = false;
      if(!r.ok){
        ds.className = 'drive-state bad'; ds.textContent = t('sy.failShort'); ds.title = r.error || '';
        el('syncBox').innerHTML = '<div class="sync-step" style="color:var(--amber)"><b>' + t('sy.failed') + '</b></div><div class="sync-step">' + esc(r.error || t('sy.unknown')) + '</div>' + syncCloseBtn();
        return;
      }
      const ms = r.merged || [];
      const added = ms.reduce((a, m) => a + (m.messagesAdded || 0), 0);
      const captured = (r.scanned && r.scanned.newMessages) || 0;
      ds.className = 'drive-state ok'; ds.textContent = t('sy.okShort');
      el('syncBox').innerHTML =
        '<div class="sync-step sync-done"><b>' + t('sy.done') + '</b></div>' +
        '<div class="sync-step">' + t('sy.scanned') + '<b>+' + fmtN(captured) + '</b>' + t('sy.newmsg') + '</div>' +
        '<div class="sync-step">' + t('sy.exported') + '<b>' + fmtBytes((r.exportedBytes || 0) / 1024) + '</b></div>' +
        '<div class="sync-step">' + t('sy.merged1') + '<b>' + ms.length + '</b>' + t('sy.merged2') + '<b>+' + fmtN(added) + '</b> msg</div>' +
        '<div class="sync-step">' + t('sy.embedded1') + '<b>' + fmtN(r.embedded || 0) + '</b>' + t('sy.embedded2') + (r.vectorRemaining ? ' · ⚠ ' + fmtN(r.vectorRemaining) + t('sy.pending') : '') + '</div>' +
        '<div class="sync-step tiny" style="margin-top:6px">' + t('sy.cloudnote') + '</div>' +
        syncCloseBtn();
      await brainTick();
    } catch(e){
      window.__syncing = false;
      ds.className = 'drive-state bad'; ds.textContent = t('sy.errShort');
      el('syncBox').innerHTML = '<div class="sync-step" style="color:var(--amber)"><b>' + t('sy.errorT') + '</b></div><div class="sync-step">' + esc(String(e)) + '</div>' + syncCloseBtn();
    }
    finally { clearInterval(syncTimer); if(sb) sb.disabled = false; window.__syncing = false; }
  }
  function syncCloseBtn(){ return '<button class="ghost" style="margin-top:12px;width:100%" onclick="closeSyncBox()">' + t('sy.close') + '</button>'; }
  async function brainScan(deep){
    el('brainmsg').textContent = deep ? t('sn.deep') : t('sn.known');
    el('brainreport').innerHTML = '';
    try {
      const r = await (await fetch('/brain-scan' + (deep ? '?deep=1' : ''), { method: 'POST' })).json();
      el('brainmsg').textContent = t('sn.loaded') + fmtN(r.totals.newMessages) + t('sn.msg') + r.changedFiles + t('sn.changed') + r.scannedFiles + t('sn.file');
      let h = '';
      if(r.unknown && r.unknown.length) h += '<div class="chip warn">' + r.unknown.length + t('sn.strange') + '</div>';
      if(r.stores && r.stores.length) {
        h += sectionTitle(t('sn.stores'));
        h += r.stores.slice(0, 6).map(s => folderLine(s.source, s.root, 'transcripts')).join('');
      }
      if(r.sessions && r.sessions.length) h += sectionTitle(t('sn.changedS'));
      h += (r.sessions || []).slice(0, 8).map(s => miniRow(s.source + ' / ' + projName(s.project), '+' + fmtN(s.newMessages) + ' msg')).join('');
      el('brainreport').innerHTML = h;
      await brainTick();
      await tick();
    } catch(e){ el('brainmsg').textContent = t('sn.err') + e; }
  }
  function onType(){ clearTimeout(typer); typer = setTimeout(function(){ brainSearch(false); }, 220); }
  async function brainSearch(commit){
    const q = el('bq').value.trim();
    if(q.length < 2){
      el('resultCount').textContent = t('recall.hint');
      el('brainhits').innerHTML = '<div class="empty">' + t('recall.empty') + '</div>';
      el('threadPreview').innerHTML = '<div class="preview-title"><b>' + t('recall.preview') + '</b><span>' + t('recall.waiting') + '</span></div><div class="empty">' + t('recall.previewEmpty') + '</div>';
      return;
    }
    const all = el('ball').checked;
    const terms = queryTerms();
    el('resultCount').textContent = t('q.searching');
    el('brainhits').innerHTML = '<div class="empty">' + t('q.searching') + '</div>';
    try {
      const hits = await (await fetch('/brain-search' + ru({q: q, all: all ? '1' : '0', days: el('fTime').value, agent: el('fAgent').value, role: el('fType').value, origin: el('fOrigin').value, commit: commit ? '1' : '0'}))).json();
      if(!hits.length){
        el('resultCount').textContent = t('q.0');
        el('brainhits').innerHTML = '<div class="empty">' + t('q.nomatch') + (all ? t('q.nomatchdot') : t('q.nomatchproj')) + '</div>';
        el('threadPreview').innerHTML = '<div class="preview-title"><b>' + t('recall.preview') + '</b><span>' + t('q.emptyState') + '</span></div><div class="empty">' + t('q.noSel') + '</div>';
        return;
      }
      el('resultCount').textContent = hits.length + t('q.results');
      lastHits = hits;
      selectedHit = hits[0].id;
      renderHits();
      await selectHit(selectedHit);
    } catch(e){
      el('resultCount').textContent = t('q.err');
      el('brainhits').innerHTML = '<div class="empty">' + t('q.errbody') + esc(e) + '</div>';
    }
  }
  function renderHitRow(h, i, terms){
    const title = (h.role ? h.role + ' · ' : '') + projName(h.project);
    return '<div class="result-row ' + (h.id === selectedHit ? 'selected' : '') + '" id="hit' + h.id + '" onclick="selectHit(' + h.id + ')">' +
      '<div class="score">' + scoreValue(h, i) + '</div>' +
      '<div><div class="result-title"><span>' + esc(title) + '</span>' + badge(h.source || 'session', 'on') + badge(projName(h.project), '') + '</div>' +
      '<div class="result-snip">' + highlight(clip(h.snippet, 170), terms) + '</div>' +
      '<div class="result-foot"><span>' + fmtDay(h.timestamp) + '</span><span>#' + h.id + '</span><span>' + esc(h.role || 'message') + '</span></div></div>' +
      '<div class="open-arrow" onclick="event.stopPropagation();openSession(\'' + esc(h.sessionId) + '\')" title="' + t('q.openfull') + '">⤢</div></div>';
  }
  function renderHits(){
    const terms = queryTerms();
    const hits = lastHits.slice();
    if(sortMode === 'new') hits.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
    else if(sortMode === 'old') hits.sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')));
    el('brainhits').innerHTML = hits.map((h, i) => renderHitRow(h, i, terms)).join('');
  }
  function updateSortLabel(){
    var s = el('sortState'); if(!s) return;
    s.textContent = t(sortMode === 'rel' ? 'so.rel' : sortMode === 'new' ? 'so.new' : 'so.old') + ' ⇅';
  }
  function cycleSort(){
    sortMode = sortMode === 'rel' ? 'new' : sortMode === 'new' ? 'old' : 'rel';
    updateSortLabel();
    if(lastHits.length) renderHits();
  }
  async function selectHit(id){
    selectedHit = id;
    document.querySelectorAll('.result-row').forEach(n => n.classList.toggle('selected', n.id === 'hit' + id));
    el('threadPreview').innerHTML = '<div class="preview-title"><b>' + t('recall.preview') + '</b><span>' + t('q.loadingS') + '</span></div><div class="empty">' + t('q.loadingctx') + '</div>';
    try {
      const ctx = await (await fetch('/brain-context' + ru({id: id}))).json();
      if(!ctx || !ctx.messages){
        el('threadPreview').innerHTML = '<div class="preview-title"><b>' + t('recall.preview') + '</b><span>' + t('q.emptyState') + '</span></div><div class="empty">' + t('q.nocontext') + '</div>';
        return;
      }
      const terms = queryTerms();
      const thread = ctx.messages.map(m =>
        '<div class="tmsg ' + (m.isHit ? 'hit' : 'ctx') + '"><span class="who">' + esc(m.role) + '</span>' +
        (m.isHit ? highlight(clip(m.content, 1200), terms) : esc(clip(m.content, 390))) + '</div>'
      ).join('');
      el('threadPreview').innerHTML =
        '<div class="preview-title"><b>' + t('recall.preview') + '</b><span>' + ctx.messages.length + t('q.nearby') + '</span>' +
        '<button class="ghost" style="padding:4px 9px;margin-left:auto" onclick="openSession(\'' + esc(ctx.sessionId) + '\')">' + t('q.fullsession') + '</button></div>' +
        '<div class="preview-meta">' + t('q.selmsg') + id + '</div>' +
        '<div class="thread">' + thread + '</div>';
    } catch(e){
      el('threadPreview').innerHTML = '<div class="preview-title"><b>' + t('recall.preview') + '</b><span>' + t('ctx.error') + '</span></div><div class="empty">' + t('ctx.err') + esc(e) + '</div>';
    }
  }
  function expandHit(id){ selectHit(id); }
  // ---- Settings modal + i18n ----------------------------------------------
  var T = {
    vi: {
      'bar.env':'Máy: local','bar.settings':'Cài đặt','brand.tag':'Bộ nhớ & harness docs cho agent lập trình · v0.0.1',
      'proj.title':'Dự án','proj.sub':'Docs & quy tắc của dự án đang chọn.','proj.run':'Chạy','proj.add':'+ Thêm',
      'recall.sub':'Tìm trong các phiên Codex, Claude, Continue, LM Studio đã lưu.','recall.search':'Tìm','recall.scope':'Mọi dự án','recall.clear':'Xoá lọc','recall.hint':'Gõ ít nhất 2 ký tự để tìm.','recall.empty':'Kết quả tìm sẽ hiện ở đây.','recall.preview':'Xem trước phiên','recall.waiting':'chờ','recall.previewEmpty':'Chọn một kết quả để xem các message lân cận ngay tại đây.',
      'mem.title':'Bộ nhớ toàn cục','scan.title':'Quét & thu thập','scan.sub':'Kéo ngữ cảnh mới từ máy này.','scan.known':'Quét nhanh','scan.deep':'Quét sâu','proj2.title':'Dự án','proj2.sub':'Folder dự án đã có phiên được thu.',
      'set.title':'Cài đặt','set.lang':'Ngôn ngữ','set.storage':'Nơi lưu','set.search':'Tìm kiếm','set.health':'Kiểm tra',
      'lang.h':'Ngôn ngữ giao diện','lang.d':'Chọn một ngôn ngữ cho toàn bộ giao diện. Thuật ngữ kỹ thuật (Recall, Hybrid, FTS5…) giữ nguyên.','lang.row':'Ngôn ngữ','lang.note':'Áp dụng ngay, lưu vào config.json.',
      'storage.h':'Nơi lưu dữ liệu','storage.d':'DB brain nên nằm ngoài ổ C để ổ C không phình. Con trỏ ~/.zemory/location.json ghi nhớ chỗ này.','storage.folder':'Thư mục lưu brain','storage.move':'Dời','storage.warn':'⚠ Không chọn folder Google Drive / OneDrive đang sync — DB đang mở sẽ hỏng.',
      'drive.h':'Đồng bộ qua Drive','drive.d':'Mỗi máy xuất một bundle mã hoá vào folder Drive; máy khác merge vào. DB sống KHÔNG bị sync trực tiếp.','drive.folder':'Folder Drive',
      'search.h':'Mặc định tìm kiếm','search.d':'Bật/tắt cũng đổi ngay trên thanh Recall. Lưu vào config.json.',
      'health.h':'Kiểm tra hệ thống','health.d':'Các tính năng lõi có chạy được trên máy này không (FTS5, recall, harness).','health.retest':'Kiểm tra lại',
      'docs.d':'Đồng bộ / dựng lại bộ docs chuẩn cho dự án. Không bao giờ ghi đè nguồn trong DB.','docs.sync':'Thêm docs còn thiếu, giữ nguyên nguồn DB.','docs.fresh':'Dựng mới','docs.freshD':'Giữ docs cũ sang bên, tạo bộ sạch.',
      'r.std':'Chuẩn dùng chung','r.noproj':'Chưa có dự án','r.runinit':'chạy zemory init','r.projdocs':'Docs dự án này (bấm để đọc)','r.setup':'Cài đặt / onboarding','r.plan':'Bản sao plan','r.docs':'docs','r.known':'dự án đã biết',
      'm.msgs':'tin nhắn','m.sess':'phiên','m.tok':'token đã thu','m.size':'dung lượng DB','m.healthy':'Khoẻ','m.empty':'Trống','m.updated':'cập nhật','m.capcost':'Chi phí thu','m.capval':'0 token phụ trội · free','m.search':'Tìm kiếm','m.ftsonly':'chỉ FTS','m.pending':'chờ','m.err':'lỗi','m.sources':'Nguồn','m.excl':'loại','m.untick':' — bỏ tick để loại khỏi sync + recall','m.tables':'Bảng','m.none':'không có',
      'sc.origin':'nguồn: mọi','sc.host':'máy (trống=mọi)','sc.source':'agent/nền tảng (trống=mọi)','sc.add':'+ Thêm','sc.rm':'Bỏ luật loại này',
      'cov.none':'Chưa có folder dự án nào được thu.','cov.sess':'phiên','cov.msg':'msg','cov.agent':'agent',
      'd.notlinked':'chưa liên kết','d.linked':'✓ đã liên kết','d.bundle':'bundle','d.readonly':'⚠ chỉ đọc','d.pastelocal':'dán folder local','d.nofolder':'không thấy folder','d.err':'✗ lỗi',
      's.defaultC':'ổ C (mặc định)','s.shortC':'ổ C','s.moved':'đã dời','s.empty':'trống','s.envpin':'ghim bởi env','s.oncloud':'⚠ trên Drive (rủi ro)','s.moving':'đang dời...','s.setptr':'✓ đã đặt nơi lưu','s.movedOk':'✓ đã dời','s.err':'✗ lỗi',
      'rel.needpath':'Nhập folder muốn lưu brain, vd D:\\\\Zyro\\\\Tool\\\\Zemory\\\\data','rel.confirm':'Dời DB brain sang:','rel.confirm2':'App sẽ checkpoint + copy + verify rồi đổi con trỏ. Bản cũ được GIỮ lại dạng .bak (không mất gì). Tiếp tục?','rel.bak':'Bản cũ giữ ở: ','rel.bakhint':' (xoá tay khi chắc chắn OK)',
      'sy.syncing':'Đang đồng bộ…','sy.s1':'1 · quét máy này tìm phiên mới','sy.s2':'2 · xuất toàn bộ brain thành bundle mã hoá','sy.s3':'3 · merge bundle của mọi máy khác','sy.s4':'4 · nhúng vector mới','sy.note':'Xuất TOÀN BỘ brain mã hoá — brain lớn (vài trăm MB) sẽ chạy vài phút. Đang chạy; cứ để mở.','sy.failed':'✗ Đồng bộ thất bại','sy.unknown':'lỗi không rõ','sy.done':'✓ Đồng bộ local xong','sy.scanned':'Đã quét máy này · ','sy.newmsg':' msg mới thu','sy.exported':'Đã xuất bundle · ','sy.merged1':'Merge ','sy.merged2':' bundle khác · ','sy.embedded1':'Đã nhúng ','sy.embedded2':' vector mới','sy.pending':' chờ (chạy brain embed --all)','sy.cloudnote':'⏳ Google Drive vẫn đang tải lên cloud ở nền — máy khác nhận được khi Drive xong (xem icon khay Drive).','sy.errorT':'✗ Lỗi đồng bộ','sy.close':'Đóng','sy.syncingShort':'đang đồng bộ...','sy.okShort':'✓ đã đồng bộ','sy.failShort':'✗ đồng bộ lỗi','sy.errShort':'✗ lỗi',
      'sn.deep':'Đang quét sâu cả máy...','sn.known':'Đang quét các vị trí đã biết...','sn.loaded':'Nạp thêm +','sn.msg':' message · ','sn.changed':' phiên đổi · quét ','sn.file':' file.','sn.strange':' store lạ','sn.stores':'Store đã quét','sn.changedS':'Phiên đã đổi','sn.err':'lỗi quét: ',
      'q.searching':'Đang tìm...','q.0':'0 kết quả','q.nomatch':'Không khớp','q.nomatchdot':'.','q.nomatchproj':' trong dự án này. Thử mọi dự án.','q.results':' kết quả','q.err':'Lỗi tìm','q.errbody':'lỗi tìm: ','q.noSel':'Chưa chọn kết quả.','q.emptyState':'trống','q.loadingctx':'đang tải ngữ cảnh...','q.loadingS':'đang tải','q.nocontext':'(không có ngữ cảnh)','q.nearby':' lân cận','q.fullsession':'Phiên đầy đủ ⤢','q.selmsg':'Message đã chọn #','q.openfull':'Mở phiên đầy đủ',
      'ss.loading':'đang tải phiên...','ss.notfound':'(không thấy phiên)','ss.msgs':' messages','ss.trunc1':' (hiển thị ','ss.trunc2':' đầu — phiên còn dài hơn)','ss.err':'lỗi phiên: ',
      'so.rel':'Sắp theo liên quan','so.new':'Sắp mới nhất','so.old':'Sắp cũ nhất',
      'ph.search':'ví dụ: cách stream tool output cho agent','ph.addproj':'Thêm dự án bằng đường dẫn folder…','f.agentAny':'Agent: mọi','f.timeAny':'Thời gian: mọi lúc','f.time24':'24h qua','f.time7':'7 ngày','f.time30':'30 ngày','f.time90':'90 ngày','f.typeAny':'Loại: mọi','f.originAny':'Nguồn: mọi',
      'dv.loading':'đang tải...','dv.empty':'(trống)','dv.err':'lỗi: ','ctx.err':'lỗi ngữ cảnh: ','ctx.error':'lỗi',
      'act.working':'đang xử lý...','act.nonstd':'Docs chưa chuẩn — chạy zemory migrate, docs sync/rm/render.','act.added':'đã thêm ','act.nomiss':'không thiếu gì','act.renamed':'đã đổi tên cũ → ','act.created':'đã tạo .harness.json — ',
      'tt.runHarness':'Chạy harness: dựng docs của dự án theo chuẩn (bổ sung file thiếu, đánh số plan, không ghi đè nguồn DB)','tt.settings':'Cài đặt','tt.refresh':'Làm mới','tt.storage':'Nơi lưu DB brain — bấm để mở Cài đặt','tt.drive':'Đồng bộ Drive — bấm để mở Cài đặt','tt.scopeAll':'Tìm trong phiên của MỌI dự án (brain là toàn cục). Tắt = chỉ dự án đang chọn.','tt.hybrid':'Recall semantic: FTS + vector. Tắt = chỉ keyword FTS.','tt.rerank':'Cross-encoder rerank: xếp lại top ứng viên cho sắc nét hơn. Cần model reranker.','tt.fTime':'Lọc theo thời gian','tt.fType':'Lọc theo vai trò message','tt.fOrigin':'Local = transcript agent trên đĩa; Web = web-chat đã thu (ChatGPT/…)','tt.fAgent':'Lọc theo agent/nguồn','tt.sort':'Bấm để đổi cách sắp (liên quan / mới nhất / cũ nhất)','tt.resize':'Kéo để chỉnh cỡ. Bấm đúp để reset.','tt.scan':'Đọc transcript agent trên MÁY NÀY vào brain. "Quét nhanh" đọc lại store đã biết (nhanh); "Quét sâu" rà cả ổ đĩa tìm folder agent mới.','tt.projects':'Các folder dự án đã có phiên được thu, kèm số phiên / message / agent mỗi dự án.','tt.close':'Đóng','tt.std':'Harness chuẩn trong docs_template/ — đi kèm zemory, tách khỏi docs của dự án. Đây là thứ Run dựng ra và agent điều chỉnh cho từng dự án. Chỉ đọc (sửa chuẩn trong docs_template/).','tt.capcost':'Thu thập là miễn phí: hook đọc FILE transcript của agent lúc kết thúc phiên — không gọi model, không tốn API. ~token đã thu = SUM(len)/4, đo lượng ngữ cảnh brain đang giữ, không phải giảm hoá đơn.'
    },
    en: {
      'bar.env':'Env: local','bar.settings':'Settings','brand.tag':'Memory & docs harness for coding agents · v0.0.1',
      'proj.title':'Project','proj.sub':'Docs & rules for the selected project.','proj.run':'Run','proj.add':'+ Add',
      'recall.sub':'Search saved Codex, Claude, Continue, LM Studio sessions.','recall.search':'Search','recall.scope':'All projects','recall.clear':'Clear','recall.hint':'Type at least 2 characters to search.','recall.empty':'Search results appear here.','recall.preview':'Thread preview','recall.waiting':'waiting','recall.previewEmpty':'Select a result to preview nearby messages without leaving the cockpit.',
      'mem.title':'Global memory','scan.title':'Scan & capture','scan.sub':'Pull new context from this machine.','scan.known':'Scan known','scan.deep':'Deep scan','proj2.title':'Projects','proj2.sub':'Project folders with captured sessions.',
      'set.title':'Settings','set.lang':'Language','set.storage':'Storage','set.search':'Search','set.health':'Health',
      'lang.h':'Interface language','lang.d':'Pick one language for the whole UI. Technical terms (Recall, Hybrid, FTS5…) stay as-is.','lang.row':'Language','lang.note':'Applies instantly, saved to config.json.',
      'storage.h':'Data storage','storage.d':'Keep the brain DB off C: so it never bloats. The pointer at ~/.zemory/location.json remembers it.','storage.folder':'Brain folder','storage.move':'Move','storage.warn':'⚠ Do not pick a synced Google Drive / OneDrive folder — a live DB corrupts.',
      'drive.h':'Drive sync','drive.d':'Each machine exports an encrypted bundle to a Drive folder; others merge it. The live DB is NOT synced directly.','drive.folder':'Drive folder',
      'search.h':'Search defaults','search.d':'Toggling also flips it on the Recall bar. Saved to config.json.',
      'health.h':'Health checks','health.d':'Do the core features actually run on this machine (FTS5, recall, harness).','health.retest':'Re-test',
      'docs.d':'Sync / rebuild the standard docs set for the project. Never overwrites the DB source.','docs.sync':'Add missing docs, keep the DB source.','docs.fresh':'Fresh start','docs.freshD':'Keep old docs aside, create a clean set.',
      'r.std':'Shared standard','r.noproj':'No project','r.runinit':'run zemory init','r.projdocs':"This project's docs (click to read)",'r.setup':'Setup / onboarding','r.plan':'Plan mirror','r.docs':'docs','r.known':'known projects',
      'm.msgs':'messages','m.sess':'sessions','m.tok':'tokens captured','m.size':'DB size','m.healthy':'Healthy','m.empty':'Empty','m.updated':'updated','m.capcost':'Capture cost','m.capval':'0 extra tokens · free','m.search':'Search','m.ftsonly':'FTS only','m.pending':'pending','m.err':'error','m.sources':'Sources','m.excl':'excluded','m.untick':' — untick to leave out of sync + recall','m.tables':'Tables','m.none':'none',
      'sc.origin':'origin: any','sc.host':'machine (blank=any)','sc.source':'agent/platform (blank=any)','sc.add':'+ Add','sc.rm':'Remove this exclude rule',
      'cov.none':'No project folders captured yet.','cov.sess':'sess','cov.msg':'msg','cov.agent':'agent',
      'd.notlinked':'not linked','d.linked':'✓ linked','d.bundle':'bundle','d.readonly':'⚠ read-only','d.pastelocal':'paste a local folder','d.nofolder':'folder not found','d.err':'✗ error',
      's.defaultC':'C: (default)','s.shortC':'C:','s.moved':'moved','s.empty':'empty','s.envpin':'env-pinned','s.oncloud':'⚠ on Drive (risky)','s.moving':'moving...','s.setptr':'✓ storage location set','s.movedOk':'✓ moved','s.err':'✗ error',
      'rel.needpath':'Enter a folder for the brain, e.g. D:\\\\Zyro\\\\Tool\\\\Zemory\\\\data','rel.confirm':'Move the brain DB to:','rel.confirm2':'It will checkpoint + copy + verify, then flip the pointer. The old DB is KEPT as a .bak (nothing lost). Continue?','rel.bak':'Old kept at: ','rel.bakhint':' (delete manually once confirmed OK)',
      'sy.syncing':'Syncing…','sy.s1':'1 · scanning this machine for new sessions','sy.s2':'2 · exporting your whole brain as an encrypted bundle','sy.s3':"3 · merging every other machine's bundle",'sy.s4':'4 · embedding new vectors','sy.note':'Exports the FULL encrypted brain — on a large brain (hundreds of MB) this runs a few minutes. It is working; leave it open.','sy.failed':'✗ Sync failed','sy.unknown':'unknown error','sy.done':'✓ Local sync complete','sy.scanned':'Scanned this machine · ','sy.newmsg':' new msg captured','sy.exported':'Exported bundle · ','sy.merged1':'Merged ','sy.merged2':' other bundle(s) · ','sy.embedded1':'Embedded ','sy.embedded2':' new vector(s)','sy.pending':' pending (run brain embed --all)','sy.cloudnote':'⏳ Google Drive is still uploading to the cloud in the background — other machines receive it once Drive finishes (watch the Drive tray icon).','sy.errorT':'✗ Sync error','sy.close':'Close','sy.syncingShort':'syncing...','sy.okShort':'✓ synced','sy.failShort':'✗ sync failed','sy.errShort':'✗ error',
      'sn.deep':'Deep scanning the whole machine...','sn.known':'Scanning known locations...','sn.loaded':'Loaded +','sn.msg':' message(s) · ','sn.changed':' session(s) changed · scanned ','sn.file':' file(s).','sn.strange':' unrecognized stores','sn.stores':'Stores scanned','sn.changedS':'Changed sessions','sn.err':'scan error: ',
      'q.searching':'Searching...','q.0':'0 results','q.nomatch':'No matches','q.nomatchdot':'.','q.nomatchproj':' in this project. Try all projects.','q.results':' results','q.err':'Search error','q.errbody':'search error: ','q.noSel':'No result selected.','q.emptyState':'empty','q.loadingctx':'loading context...','q.loadingS':'loading','q.nocontext':'(no context)','q.nearby':' nearby','q.fullsession':'Full session ⤢','q.selmsg':'Selected message #','q.openfull':'Open full session',
      'ss.loading':'loading full session...','ss.notfound':'(session not found)','ss.msgs':' messages','ss.trunc1':' (showing first ','ss.trunc2':' — session is longer)','ss.err':'session error: ',
      'so.rel':'Sorted by relevance','so.new':'Sorted newest','so.old':'Sorted oldest',
      'ph.search':'e.g. how we stream tool output for agents','ph.addproj':'Add a project by folder path…','f.agentAny':'Agent: any','f.timeAny':'Time: any','f.time24':'Last 24h','f.time7':'Last 7 days','f.time30':'Last 30 days','f.time90':'Last 90 days','f.typeAny':'Type: any','f.originAny':'Origin: any',
      'dv.loading':'loading...','dv.empty':'(empty)','dv.err':'error: ','ctx.err':'context error: ','ctx.error':'error',
      'act.working':'working...','act.nonstd':'Docs non-standard — run zemory migrate, docs sync/rm/render.','act.added':'added ','act.nomiss':'nothing missing','act.renamed':'renamed old → ','act.created':'created .harness.json — ',
      'tt.runHarness':'Run harness: scaffold the project docs to standard (add missing files, number plans, never overwrite the DB source)','tt.settings':'Settings','tt.refresh':'Refresh','tt.storage':'Brain DB location — click to open Settings','tt.drive':'Drive sync — click to open Settings','tt.scopeAll':'Search sessions across ALL projects (the brain is global). Off = only the selected project.','tt.hybrid':'Semantic recall: FTS + vector. Off = keyword FTS only.','tt.rerank':'Cross-encoder rerank: reorder the top candidates for sharper results. Needs the reranker model.','tt.fTime':'Filter by time','tt.fType':'Filter by message role','tt.fOrigin':'Local = agent transcripts on disk; Web = captured web chats (ChatGPT/…)','tt.fAgent':'Filter by agent/source','tt.sort':'Click to change sort (relevance / newest / oldest)','tt.resize':'Drag to resize. Double-click to reset.','tt.scan':'Read agent transcripts on THIS machine into the brain. "Quick scan" re-reads known stores (fast); "Deep scan" sweeps the whole disk for new agent folders.','tt.projects':'Project folders with captured sessions, showing session / message / agent counts each.','tt.close':'Close','tt.std':'The standard harness in docs_template/ — shipped with zemory, separate from any project docs. This is what Run scaffolds and the agent adapts per project. Read-only (edit the standard in docs_template/).','tt.capcost':'Capture is free: the hook reads the agent transcript FILE at session end — no model call, no API cost. ~tokens captured = SUM(len)/4, a measure of context the brain holds, not a bill reduction.'
    }
  };
  function t(k){ var d = T[window.__lang === 'en' ? 'en' : 'vi']; return (d && d[k] != null) ? d[k] : (T.vi[k] != null ? T.vi[k] : k); }
  function applyLang(lang){
    if(lang !== 'en') lang = 'vi';
    window.__lang = lang;
    var dict = T[lang] || {};
    document.querySelectorAll('[data-i18n]').forEach(function(e){
      var v = dict[e.getAttribute('data-i18n')];
      if(v != null) e.textContent = v;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function(e){
      var v = dict[e.getAttribute('data-i18n-ph')];
      if(v != null) e.setAttribute('placeholder', v);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function(e){
      var v = dict[e.getAttribute('data-i18n-title')];
      if(v != null) e.setAttribute('title', v);
    });
    var vi = el('langVi'), en = el('langEn');
    if(vi && en){ vi.classList.toggle('on', lang !== 'en'); en.classList.toggle('on', lang === 'en'); }
    // Re-render JS-built views so their strings flip too (they cache last data).
    try { if(last) renderStatus(); } catch(e){}
    try { if(brain && Object.keys(brain).length) renderBrainSummary(brain); } catch(e){}
    try { renderSettingsSearch(); } catch(e){}
    try { updateSortLabel(); } catch(e){}
    // Idle recall panels (no active query) → refresh their empty/hint text.
    if(!(lastHits && lastHits.length)){
      var rc = el('resultCount'); if(rc && (el('bq').value.trim().length < 2)) rc.textContent = t('recall.hint');
      var bh = el('brainhits'); if(bh && el('bq').value.trim().length < 2) bh.innerHTML = '<div class="empty">' + t('recall.empty') + '</div>';
    } else { try { renderHits(); } catch(e){} }
  }
  async function setLangUI(lang){
    try { await fetch('/set-lang?lang=' + lang, { method: 'POST' }); } catch(e){}
    applyLang(lang);
    // Backend strings (status/checks details) are localized server-side → refetch.
    try { await tick(); } catch(e){}
    try { await brainTick(); } catch(e){}
  }
  function openSettings(pane){
    el('settingsOverlay').style.display = 'flex';
    renderSettingsSearch();
    if(pane){ var b = document.querySelector('.set-tab[data-pane="' + pane + '"]'); if(b) setSettingsTab(b); }
  }
  function closeSettings(){ el('settingsOverlay').style.display = 'none'; }
  function setSettingsTab(btn){
    document.querySelectorAll('.set-tab').forEach(function(t){ t.classList.remove('on'); });
    document.querySelectorAll('.set-pane').forEach(function(p){ p.classList.remove('on'); });
    btn.classList.add('on');
    var pane = document.querySelector('.set-pane[data-pane="' + btn.getAttribute('data-pane') + '"]');
    if(pane) pane.classList.add('on');
  }
  function swRow(id, key, label, note){
    var on = el(id) && el(id).checked;
    return '<div class="set-row"><div class="set-lab">' + label + '<small>' + note + '</small></div>'
      + '<div class="sw' + (on ? ' on' : '') + '" onclick="flipPref(\'' + id + '\',\'' + key + '\')"></div></div>';
  }
  function renderSettingsSearch(){
    var box = el('searchPrefs'); if(!box) return;
    var lang = window.__lang === 'en' ? 'en' : 'vi';
    var L = lang === 'en'
      ? { hy:['Hybrid','FTS + vector (semantic). Off = keyword only.'], re:['Rerank','Cross-encoder rescoring. Needs the reranker model.'], sc:['Scope: all projects','The brain is global. Off = current project only.'] }
      : { hy:['Hybrid','FTS + vector (semantic). Tắt = chỉ keyword.'], re:['Rerank','Cross-encoder xếp lại top. Cần model reranker.'], sc:['Phạm vi: mọi dự án','Brain là toàn cục. Tắt = chỉ dự án đang chọn.'] };
    box.innerHTML = swRow('hybrid','hybrid',L.hy[0],L.hy[1]) + swRow('rerank','rerank',L.re[0],L.re[1]) + swRow('ball','scope',L.sc[0],L.sc[1]);
  }
  function flipPref(id, key){
    var c = el(id); if(!c) return;
    c.checked = !c.checked;
    if(key === 'hybrid') setHybrid(); else if(key === 'rerank') setRerank(); else setScope();
    renderSettingsSearch();
  }
  function summarize(r){
    if(r.needsReconcile) return t('act.nonstd');
    const a = r.added && r.added.length ? t('act.added') + r.added.join(', ') : t('act.nomiss');
    return (r.renamedTo ? t('act.renamed') + r.renamedTo + '\n' : '') + (r.createdConfig ? t('act.created') : '') + a;
  }
  async function act(ep){
    closeSettings();
    el('msg').textContent = t('act.working');
    try {
      const r = await (await fetch(ep + ru(), { method: 'POST' })).json();
      el('msg').textContent = 'OK · ' + summarize(r);
      await tick();
      await runChecks();
    } catch(e){ el('msg').textContent = t('dv.err') + e; }
  }
  function actConfirm(ep, q){ if(confirm(q)) act(ep); }

  (async () => {
    await loadLayoutFromServer();
    initResizers();
    initPanelSplits();
    await tick();
    if(!curRoot && last && last.project && last.project.root) curRoot = last.project.root;
    await brainTick();
    runChecks();
    if(window.matchMedia('(min-width: 761px)').matches) el('bq').focus();
  })();
  setInterval(tick, 5000);
  setInterval(brainTick, 2500);
</script></body></html>`;
