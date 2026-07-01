export const PAGE = String.raw`<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>zemory live memory cockpit</title>
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
    display: grid;
    gap: 4px;
    padding: 10px 12px 15px;
    border: 1px solid var(--line);
    border-radius: 5px;
    background: linear-gradient(180deg, rgba(120, 223, 155, .06), rgba(255, 255, 255, .02));
  }
  .brand h1 { margin: 0; color: var(--green); font-size: 33px; letter-spacing: -.075em; line-height: 1; }
  .brand p { margin: 0; color: var(--muted); font-size: 12px; }
  .proj-pick { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px; align-items: center; }
  .proj-pick select { width: 100%; }
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
    display: grid;
    grid-template-columns: 116px 124px minmax(220px, 1fr) auto;
    gap: 8px;
    align-items: center;
    border: 1px solid var(--line);
    border-radius: 7px;
    background: rgba(8, 15, 14, .74);
    padding: 8px;
    box-shadow: var(--shadow);
  }
  .commandbar .field, .commandbar .search-command {
    min-height: 32px;
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
  .commandbar select, .commandbar input {
    min-height: 32px;
    border-radius: 6px;
    padding: 0 9px;
    background: rgba(5, 10, 9, .5);
  }
  .commandbar .search-command input { border: 0; box-shadow: none; background: transparent; padding: 0; }
  .icon-btns { display: flex; gap: 6px; justify-content: flex-end; }
  .icon-btns button { min-width: 32px; height: 32px; padding: 0; border-radius: 6px; }
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
  .modal.big { width: min(920px, calc(100vw - 40px)); }
  .doc-body { max-height: 72vh; overflow: auto; white-space: pre-wrap; word-break: break-word; font: 12px/1.5 var(--mono); color: #cbe8d5; background: rgba(0, 0, 0, .28); border-radius: 10px; padding: 12px; margin: 0; }
  .session-body { max-height: 72vh; overflow: auto; display: flex; flex-direction: column; gap: 6px; }
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
  #overlay, #docOverlay, #sessionOverlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .62);
    backdrop-filter: blur(10px);
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
  .modal {
    width: min(380px, calc(100vw - 32px));
    border: 1px solid var(--line-strong);
    border-radius: 16px;
    background: #101713;
    box-shadow: var(--shadow);
    padding: 18px;
  }
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
        <h1>zemory</h1>
        <p>Local memory cockpit</p>
      </div>
      <div class="rail-scroll">
        <section class="panel" id="project" data-grow="rail0" data-grow-default="1.6" style="flex-grow:1.6">
          <div class="panel-head"><div><h3>Project harness<span class="q" title="A per-project docs harness: rules + TODO + changelog (docs/.harness.json + docs/agent/*.md) that zemory reads and keeps in sync. The brain is GLOBAL; this only chooses which project's harness files to view/apply. Pick a project below; click a doc to read it.">?</span></h3><p>Docs &amp; rules for the selected project.</p></div></div>
          <div class="panel-pad">
            <div class="proj-pick"><select id="proj" onchange="pick()"></select><button class="ghost" title="Setup / fresh" onclick="openMenu()">⚙</button></div>
            <div id="app" style="margin-top:8px"></div>
          </div>
        </section>
        <div class="resize-handle horizontal panel-split" data-resize="split" role="separator" aria-orientation="horizontal" tabindex="0" title="Drag to resize. Double-click to reset."></div>
        <section class="panel" id="checks" data-grow="rail1" data-grow-default="1" style="flex-grow:1">
          <div class="panel-head"><div><h3>Capability checks<span class="q" title="Live probes that zemory's core capabilities actually run on this machine: full-text + Vietnamese search, cross-session recall, docs-harness validation, and the grill workflow. Green bar = working. NOT about compression (dropped).">?</span></h3><p>Do the core features actually run?</p></div><button class="ghost" onclick="runChecks()">Re-test</button></div>
          <div class="panel-pad" id="checksBody"></div>
        </section>
      </div>
      <div class="rail-foot">
        <div class="foot-row"><span>CLI</span><b><span class="live-dot"></span> Connected</b></div>
        <div class="foot-row"><span>Version</span><b>0.0.1</b></div>
      </div>
    </aside>
    <div class="resize-handle vertical" data-resize="rail" role="separator" aria-orientation="vertical" tabindex="0" title="Drag to resize sidebar. Double-click to reset."></div>

    <main class="workspace">
      <header class="commandbar">
        <div class="field"><span class="live-dot"></span> Env local</div>
        <div class="field">↗ CLI connected</div>
        <div class="search-command" title="Folder where encrypted memory bundles are synced (Google Drive / OneDrive). Each machine exports its bundle here; the others merge it. The live DB is NOT synced.">
          <span>☁</span>
          <input type="text" id="driveLink" placeholder="Drive sync folder, e.g. G:\My Drive\zemory ..." onkeydown="if(event.key==='Enter')testDrive()">
          <span id="driveState" class="drive-state"></span>
        </div>
        <div class="icon-btns">
          <button class="ghost" id="driveBtn" title="Test connection & link this Drive folder" onclick="testDrive()">Link</button>
          <button class="ghost" id="syncBtn" title="Sync now: export this machine's bundle to the Drive folder + merge every other machine's bundle there" onclick="driveSync()">⟳ Sync</button>
          <button class="ghost" title="Setup" onclick="openMenu()">⚙</button>
          <button class="ghost" title="Refresh" onclick="manualRefresh()">↻</button>
        </div>
      </header>

      <section class="panel recall" id="recall">
        <div class="recall-head">
          <div class="recall-title">
            <h2>Recall</h2>
            <p>Search past Codex, Claude, Continue, and LM Studio sessions.</p>
          </div>
        </div>
        <div class="searchline">
          <input type="text" id="bq" placeholder="how we implemented streaming tool output for agents" autocomplete="off" oninput="onType()" onkeydown="if(event.key==='Enter')brainSearch()">
          <button onclick="brainSearch()">Search ⌘↵</button>
        </div>
        <div class="filterline">
          <label class="toggle" title="Search every project's sessions (the brain is global). Off = only the selected project."><input type="checkbox" id="ball" checked onchange="setScope()"> Scope: all projects</label>
          <label class="toggle" title="Semantic recall: FTS + vector. Off = keyword FTS only."><input type="checkbox" id="hybrid" onchange="setHybrid()"> Hybrid</label>
          <label class="toggle" title="Cross-encoder rerank: rescore the top hybrid candidates for sharper order. Needs the reranker model."><input type="checkbox" id="rerank" onchange="setRerank()"> Rerank</label>
          <select id="fTime" class="filter-sel" onchange="brainSearch()" title="Filter by recency">
            <option value="0">Time: any</option><option value="1">Last 24h</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
          </select>
          <select id="fType" class="filter-sel" onchange="brainSearch()" title="Filter by message role">
            <option value="">Type: any</option><option value="user">user</option><option value="assistant">assistant</option><option value="tool">tool</option>
          </select>
          <select id="fAgent" class="filter-sel" onchange="brainSearch()" title="Filter by agent/source">
            <option value="">Agent: any</option>
          </select>
          <span class="tiny" style="margin-left:auto;cursor:pointer" id="queryHint" onclick="clearFilters()">Clear</span>
        </div>
        <div class="result-meta">
          <span id="resultCount">Type at least 2 characters to search.</span>
          <span id="sortState" onclick="cycleSort()" title="Click to change sort (relevance / newest / oldest)">Sorted by relevance ⇅</span>
        </div>
        <div class="recall-workbench">
          <div id="brainhits" class="result-list">
            <div class="empty">Search opens a ranked result list here.</div>
          </div>
          <div class="resize-handle vertical" data-resize="recall" role="separator" aria-orientation="vertical" tabindex="0" title="Drag to resize results and preview. Double-click to reset."></div>
          <div id="threadPreview" class="preview">
            <div class="preview-title"><b>Thread preview</b><span>waiting</span></div>
            <div class="empty">Select a result to preview nearby messages without leaving the cockpit.</div>
          </div>
        </div>
      </section>

      <div id="msg"></div>
    </main>
    <div class="resize-handle vertical" data-resize="inspector" role="separator" aria-orientation="vertical" tabindex="0" title="Drag to resize inspector. Double-click to reset."></div>

    <aside class="inspector">
      <section class="panel" id="brain" data-grow="insp0" data-grow-default="2.1" style="flex-grow:2.1">
        <div class="panel-head"><div><h3>Global memory<span class="q" title="The whole brain in one local SQLite DB (~/.zemory/global_memory.db): totals, then sessions/messages broken down by machine and by agent, plus raw table sizes. 'Search' = current recall mode. Local + rebuildable from transcripts.">?</span></h3><p id="memSub">One SQLite brain.</p></div></div>
        <div class="panel-pad" id="memoryPanel"></div>
      </section>
      <div class="resize-handle horizontal panel-split" data-resize="split" role="separator" aria-orientation="horizontal" tabindex="0" title="Drag to resize. Double-click to reset."></div>
      <section class="panel" id="capture" data-grow="insp1" data-grow-default=".85" style="flex-grow:.85">
        <div class="panel-head"><div><h3>Scan &amp; capture<span class="q" title="Read agent transcripts on THIS machine into the brain. 'Scan known' re-reads known stores (fast); 'Deep scan' walks the whole disk to find new agent folders.">?</span></h3><p>Pull new context from this machine.</p></div></div>
        <div class="panel-pad">
          <div class="action-stack"><button onclick="brainScan(false)">Scan known</button><button class="ghost warn" onclick="brainScan(true)">Deep scan</button></div>
          <div id="brainmsg" style="margin-top:10px"></div>
          <div id="brainreport" class="mini-list" style="margin-top:8px"></div>
        </div>
      </section>
      <div class="resize-handle horizontal panel-split" data-resize="split" role="separator" aria-orientation="horizontal" tabindex="0" title="Drag to resize. Double-click to reset."></div>
      <section class="panel" id="coverage" data-grow="insp2" data-grow-default="1.1" style="flex-grow:1.1">
        <div class="panel-head"><div><h3>Capture coverage<span class="q" title="Where the brain pulls from: the transcript stores it found (Claude/Codex/Continue/LM Studio folders) and the project folders those sessions ran in.">?</span></h3><p>Transcript stores &amp; project folders.</p></div></div>
        <div class="panel-pad" id="coveragePanel"></div>
      </section>
      <div class="resize-handle horizontal panel-split" data-resize="split" role="separator" aria-orientation="horizontal" tabindex="0" title="Drag to resize. Double-click to reset."></div>
      <section class="panel" id="share" data-grow="insp3" data-grow-default=".75" style="flex-grow:.75">
        <div class="panel-head"><div><h3>Share / sync<span class="q" title="Encrypted bundle (.zemory.enc) to move memory between machines. 'Sync now' = export THIS machine's bundle into the linked Drive folder + merge every other machine's bundle there. Then run 'zemory brain embed --all' to vectorize new rows. The live DB is never synced.">?</span></h3><p>Encrypted bundle for cross-machine merge.</p></div><button class="ghost" onclick="driveSync()" title="Export my bundle to the Drive folder + merge others">Sync now</button></div>
        <div class="panel-pad"><div id="syncMsg" class="tiny" style="margin-bottom:8px;white-space:normal"></div><div id="sharePanel"></div></div>
      </section>
    </aside>
  </div>

  <div id="overlay" onclick="if(event.target===this)closeMenu()">
    <div class="modal">
      <div class="mtitle">Setup actions - <span id="mproj"></span></div>
      <button class="opt" onclick="act('/sync')"><b>Sync</b><span>Add missing docs, never overwrite DB source.</span></button>
      <button class="opt warn" onclick="actConfirm('/init-fresh','Rename current docs aside (docs.old-...) and create a fresh set?')"><b>Fresh start</b><span>Keep old docs aside, create clean set.</span></button>
      <button class="opt cancel" onclick="closeMenu()">Cancel</button>
    </div>
  </div>

  <div id="docOverlay" onclick="if(event.target===this)closeDoc()">
    <div class="modal big doc-modal">
      <div class="mtitle"><b id="docName" style="color:var(--text)"></b> <button class="ghost" style="float:right;padding:4px 10px" onclick="closeDoc()">✕</button></div>
      <pre id="docBody" class="doc-body">loading...</pre>
    </div>
  </div>

  <div id="sessionOverlay" onclick="if(event.target===this)closeSession()">
    <div class="modal big session-modal">
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
  function readLayout(){
    try { return JSON.parse(localStorage.getItem(layoutKey) || '{}') || {}; }
    catch(e){ return {}; }
  }
  function writeLayout(patch){
    const next = readLayout();
    Object.keys(patch).forEach(k => patch[k] == null ? delete next[k] : next[k] = patch[k]);
    try { localStorage.setItem(layoutKey, JSON.stringify(next)); } catch(e){}
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
  function applyRoot(path){ if(!path || !path.trim()) return; curRoot = path.trim(); checks = {}; el('msg').textContent = 'Target project: ' + curRoot; tick(); brainTick(); runChecks(); }
  function goRoot(){ applyRoot(el('rootpath').value); }
  function rootKey(e){ if(e.key === 'Enter') goRoot(); }
  async function manualRefresh(){ await tick(); await brainTick(); if(el('bq').value.trim().length >= 2) await brainSearch(); }

  function renderStatus(){
    if(!last) return;
    el('proj').innerHTML = projOpts();
    const docsOk = last.docs.filter(d => d.ok).length;
    let h = '';
    h += row(last.project.name || 'No project', last.project.connected ? 'on' : 'off', last.project.root || 'run zemory init', 'Whether the selected folder has docs/.harness.json.');
    h += '<div class="tiny" style="margin:8px 0 4px">Docs (click to read)</div>';
    h += '<div class="chips" style="margin-bottom:10px">' + (last.docs || []).map(d => '<span class="chip doc-link ' + (d.ok ? 'on' : 'off') + '" onclick="openDoc(\'' + esc(d.file) + '\')" title="Open ' + esc(d.file) + '">' + esc(d.file) + '</span>').join('') + '</div>';
    if(last.setup) h += row('Setup / onboarding', last.setup.complete ? 'on' : 'warn', last.setup.detail, 'Required docs plus plan are present.');
    if(last.plan) h += row('Plan mirror', last.plan.needsReconcile ? 'warn' : (last.plan.exists ? 'on' : 'planned'), last.plan.detail, 'docs/plan mirrors come from global_memory.db.');
    h += '<div class="chips" style="margin-top:10px">' + chip(docsOk + '/' + (last.docs || []).length + ' docs', docsOk === (last.docs || []).length ? 'on' : 'off') + chip((last.knownProjects || []).length + ' known projects', 'on') + '</div>';
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
    const t = brain.totals || {};
    const vectors = brain.vectors || {};
    const info = brain.info || {};
    const share = brain.share || {};
    const capture = brain.coverage || {};
    const captureTotals = capture.totals || {};
    const stores = capture.stores || [];
    const projects = capture.projects || [];
    el('hybrid').checked = !!brain.hybrid;
    el('rerank').checked = !!brain.rerank;
    el('ball').checked = brain.scope !== false;
    const fa = el('fAgent'); const faCur = fa.value;
    fa.innerHTML = '<option value="">Agent: any</option>' + (brain.agents || []).map(a => '<option value="' + esc(a.source) + '">' + esc(a.source) + '</option>').join('');
    fa.value = faCur;
    const drive = brain.drive || {};
    if(document.activeElement !== el('driveLink')) el('driveLink').value = drive.path || '';
    renderDriveState(drive);
    const vectorCoverage = vectors.coverage == null ? '-' : vectors.coverage + '%';
    const agents = brain.agents || [];
    const hosts = brain.hosts || [];
    el('memSub').textContent = (t.sessions ? 'Healthy' : 'Empty') + ' · updated ' + fmtTime(brain.generatedAt);
    el('memoryPanel').innerHTML =
      '<div class="coverage-stats">' +
      '<div class="coverage-stat"><b>' + fmtN(t.messages) + '</b><span>messages</span></div>' +
      '<div class="coverage-stat"><b>' + fmtN(t.sessions) + '</b><span>sessions</span></div>' +
      '<div class="coverage-stat"><b>' + fmtBytes(brain.sizeKB) + '</b><span>DB size</span></div>' +
      '</div>' +
      '<div class="mini-list" style="margin-top:8px">' +
      miniRow('Search', (brain.hybrid ? 'BM25 + Vector' : 'FTS only') + (brain.rerank ? ' + rerank' : '')) +
      miniRow('Vector index', fmtN(vectors.count) + ' vec · ' + vectorCoverage + (vectors.remaining ? (' · ' + fmtN(vectors.remaining) + ' pending') : '') + (vectors.error ? ' · error' : '')) +
      '</div>' +
      sectionTitle('By machine') +
      (hosts.length ? hosts.map(h => miniRow(h.host, fmtN(h.sessions) + ' sess · ' + fmtN(h.messages) + ' msg')).join('') : '<div class="muted">none</div>') +
      sectionTitle('By agent') +
      (agents.length ? agents.map(a => miniRow(a.source, fmtN(a.sessions) + ' sess · ' + fmtN(a.messages) + ' msg')).join('') : '<div class="muted">none</div>') +
      sectionTitle('Tables') +
      ((info.tables || []).map(r => miniRow(r.name, fmtN(r.rows) + (r.detail ? ' · ' + esc(r.detail) : ''))).join('') || '<div class="muted">none</div>') +
      '<div class="path" style="margin-top:8px">' + esc(brain.dbPath || '') + '</div>';
    el('sharePanel').innerHTML =
      '<div class="chips">' + chip('bundle ' + (share.bundle && share.bundle.exists ? 'ready' : 'missing'), share.bundle && share.bundle.exists ? 'on' : 'off') +
      chip('key ' + (share.key && share.key.exists ? 'in repo' : 'missing'), share.key && share.key.exists ? 'warn' : 'off') +
      chip('Git LFS', share.lfs ? 'on' : 'warn') + '</div>' +
      '<div class="mini-list" style="margin-top:8px">' +
      miniRow('bundle size', share.bundle && share.bundle.exists ? fmtBytes(share.bundle.sizeKB) : '-') +
      miniRow('bundle mtime', share.bundle && share.bundle.mtime ? fmtDay(share.bundle.mtime) : '-') +
      '<div class="path">' + esc(share.bundle ? share.bundle.path : '') + '</div>' +
      '</div>';
    el('coveragePanel').innerHTML =
      sectionTitle('Transcript stores') +
      (stores.length ? stores.map(s => folderLine(s.source, s.root, 'found ' + fmtDay(s.foundAt))).join('') : '<div class="muted">No transcript stores recorded yet. Run Deep scan once.</div>') +
      sectionTitle('Project folders') +
      (projects.length ? projects.map(p => folderLine(projName(p.path), p.path, fmtN(p.sessions) + ' sess / ' + fmtN(p.messages) + ' msg / ' + fmtN(p.agents) + ' agents')).join('') : '<div class="muted">No project folders captured yet.</div>');
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
  function renderDriveState(d){
    const s = el('driveState');
    s.title = (d && d.error) ? d.error : '';
    if(!d || !d.linked){ s.className = 'drive-state'; s.textContent = 'not linked'; return; }
    if(!d.exists){ s.className = 'drive-state bad'; s.textContent = '✗ ' + (/^https?:/i.test(d.path) ? 'paste a local folder' : 'folder not found'); return; }
    if(!d.writable){ s.className = 'drive-state bad'; s.textContent = '⚠ read-only'; return; }
    s.className = 'drive-state ok'; s.textContent = '✓ linked · ' + fmtN(d.bundles) + ' bundle(s)';
  }
  async function testDrive(){
    const path = el('driveLink').value.trim();
    el('driveState').className = 'drive-state'; el('driveState').textContent = 'testing...';
    try {
      const d = await (await fetch('/set-drive?path=' + encodeURIComponent(path), { method: 'POST' })).json();
      renderDriveState(d);
    } catch(e){ el('driveState').className = 'drive-state bad'; el('driveState').textContent = '✗ error'; }
  }
  async function openDoc(file){
    el('docName').textContent = file;
    el('docBody').textContent = 'loading...';
    el('docOverlay').style.display = 'flex';
    try {
      const r = await (await fetch('/doc' + ru({file: file}))).json();
      el('docBody').textContent = r.content || '(empty)';
    } catch(e){ el('docBody').textContent = 'error: ' + e; }
  }
  function closeDoc(){ el('docOverlay').style.display = 'none'; }
  function clearFilters(){ el('fTime').value = '0'; el('fType').value = ''; el('fAgent').value = ''; brainSearch(); }
  async function openSession(sid){
    el('sessName').textContent = 'Full session';
    el('sessMeta').textContent = '';
    el('sessBody').innerHTML = '<div class="muted">loading full session...</div>';
    el('sessionOverlay').style.display = 'flex';
    try {
      const s = await (await fetch('/brain-session' + ru({id: sid}))).json();
      if(!s || !s.messages){ el('sessBody').innerHTML = '<div class="muted">(session not found)</div>'; return; }
      el('sessName').textContent = s.title || projName(s.project);
      el('sessMeta').textContent = esc(s.source) + ' · ' + esc(projName(s.project)) + ' · ' + s.messages.length + ' messages';
      el('sessBody').innerHTML = s.messages.map(m =>
        '<div class="smsg ' + esc(m.role || '') + '"><div class="role">' + esc(m.role || 'message') + ' · ' + fmtDay(m.timestamp) + ' · #' + m.id + '</div><div class="txt">' + esc(m.content || '') + '</div></div>'
      ).join('');
      el('sessBody').scrollTop = 0;
    } catch(e){ el('sessBody').innerHTML = '<div class="muted">session error: ' + esc(e) + '</div>'; }
  }
  function closeSession(){ el('sessionOverlay').style.display = 'none'; }
  async function driveSync(){
    const ds = el('driveState'), sb = el('syncBtn');
    ds.className = 'drive-state'; ds.textContent = 'syncing...'; ds.title = ''; if(sb) sb.disabled = true;
    el('syncMsg').textContent = 'Syncing... exporting bundle (this can take a moment).';
    try {
      const r = await (await fetch('/drive-sync', { method: 'POST' })).json();
      if(!r.ok){ ds.className = 'drive-state bad'; ds.textContent = '✗ sync failed'; ds.title = r.error || ''; el('syncMsg').textContent = '✗ ' + (r.error || 'sync failed'); return; }
      const ms = r.merged || [];
      const added = ms.reduce((a, m) => a + (m.messagesAdded || 0), 0);
      let msg = '✓ exported ' + r.exported + ' · merged ' + ms.length + ' bundle(s) (+' + fmtN(added) + ' msg)';
      if(r.vectorRemaining) msg += ' · ' + fmtN(r.vectorRemaining) + ' to embed (run brain embed --all)';
      el('syncMsg').textContent = msg;
      await brainTick();
    } catch(e){ ds.className = 'drive-state bad'; ds.textContent = '✗ error'; el('syncMsg').textContent = '✗ ' + e; }
    finally { if(sb) sb.disabled = false; }
  }
  async function brainScan(deep){
    el('brainmsg').textContent = deep ? 'Deep scanning the whole machine...' : 'Scanning known locations...';
    el('brainreport').innerHTML = '';
    try {
      const r = await (await fetch('/brain-scan' + (deep ? '?deep=1' : ''), { method: 'POST' })).json();
      el('brainmsg').textContent = 'Loaded +' + fmtN(r.totals.newMessages) + ' message(s) · ' + r.changedFiles + ' session(s) changed · scanned ' + r.scannedFiles + ' file(s).';
      let h = '';
      if(r.unknown && r.unknown.length) h += '<div class="chip warn">' + r.unknown.length + ' unrecognized stores</div>';
      if(r.stores && r.stores.length) {
        h += sectionTitle('Stores scanned');
        h += r.stores.slice(0, 6).map(s => folderLine(s.source, s.root, 'transcripts')).join('');
      }
      if(r.sessions && r.sessions.length) h += sectionTitle('Changed sessions');
      h += (r.sessions || []).slice(0, 8).map(s => miniRow(s.source + ' / ' + projName(s.project), '+' + fmtN(s.newMessages) + ' msg')).join('');
      el('brainreport').innerHTML = h;
      await brainTick();
      await tick();
    } catch(e){ el('brainmsg').textContent = 'scan error: ' + e; }
  }
  function onType(){ clearTimeout(typer); typer = setTimeout(brainSearch, 220); }
  async function brainSearch(){
    const q = el('bq').value.trim();
    if(q.length < 2){
      el('resultCount').textContent = 'Type at least 2 characters to search.';
      el('brainhits').innerHTML = '<div class="empty">Search opens a ranked result list here.</div>';
      el('threadPreview').innerHTML = '<div class="preview-title"><b>Thread preview</b><span>waiting</span></div><div class="empty">Select a result to preview nearby messages without leaving the cockpit.</div>';
      return;
    }
    const all = el('ball').checked;
    const terms = queryTerms();
    el('resultCount').textContent = 'Searching...';
    el('brainhits').innerHTML = '<div class="empty">searching...</div>';
    try {
      const hits = await (await fetch('/brain-search' + ru({q: q, all: all ? '1' : '0', days: el('fTime').value, agent: el('fAgent').value, role: el('fType').value}))).json();
      if(!hits.length){
        el('resultCount').textContent = '0 results';
        el('brainhits').innerHTML = '<div class="empty">No matches' + (all ? '.' : ' in this project. Try all projects.') + '</div>';
        el('threadPreview').innerHTML = '<div class="preview-title"><b>Thread preview</b><span>empty</span></div><div class="empty">No result selected.</div>';
        return;
      }
      el('resultCount').textContent = hits.length + ' results';
      lastHits = hits;
      selectedHit = hits[0].id;
      renderHits();
      await selectHit(selectedHit);
    } catch(e){
      el('resultCount').textContent = 'Search error';
      el('brainhits').innerHTML = '<div class="empty">search error: ' + esc(e) + '</div>';
    }
  }
  function renderHitRow(h, i, terms){
    const title = (h.role ? h.role + ' · ' : '') + projName(h.project);
    return '<div class="result-row ' + (h.id === selectedHit ? 'selected' : '') + '" id="hit' + h.id + '" onclick="selectHit(' + h.id + ')">' +
      '<div class="score">' + scoreValue(h, i) + '</div>' +
      '<div><div class="result-title"><span>' + esc(title) + '</span>' + badge(h.source || 'session', 'on') + badge(projName(h.project), '') + '</div>' +
      '<div class="result-snip">' + highlight(clip(h.snippet, 170), terms) + '</div>' +
      '<div class="result-foot"><span>' + fmtDay(h.timestamp) + '</span><span>#' + h.id + '</span><span>' + esc(h.role || 'message') + '</span></div></div>' +
      '<div class="open-arrow" onclick="event.stopPropagation();openSession(\'' + esc(h.sessionId) + '\')" title="Open full session">⤢</div></div>';
  }
  function renderHits(){
    const terms = queryTerms();
    const hits = lastHits.slice();
    if(sortMode === 'new') hits.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
    else if(sortMode === 'old') hits.sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')));
    el('brainhits').innerHTML = hits.map((h, i) => renderHitRow(h, i, terms)).join('');
  }
  function cycleSort(){
    sortMode = sortMode === 'rel' ? 'new' : sortMode === 'new' ? 'old' : 'rel';
    el('sortState').textContent = (sortMode === 'rel' ? 'Sorted by relevance' : sortMode === 'new' ? 'Newest first' : 'Oldest first') + ' ⇅';
    if(lastHits.length) renderHits();
  }
  async function selectHit(id){
    selectedHit = id;
    document.querySelectorAll('.result-row').forEach(n => n.classList.toggle('selected', n.id === 'hit' + id));
    el('threadPreview').innerHTML = '<div class="preview-title"><b>Thread preview</b><span>loading</span></div><div class="empty">loading context...</div>';
    try {
      const ctx = await (await fetch('/brain-context' + ru({id: id}))).json();
      if(!ctx || !ctx.messages){
        el('threadPreview').innerHTML = '<div class="preview-title"><b>Thread preview</b><span>empty</span></div><div class="empty">(no context)</div>';
        return;
      }
      const terms = queryTerms();
      const thread = ctx.messages.map(m =>
        '<div class="tmsg ' + (m.isHit ? 'hit' : 'ctx') + '"><span class="who">' + esc(m.role) + '</span>' +
        (m.isHit ? highlight(clip(m.content, 1200), terms) : esc(clip(m.content, 390))) + '</div>'
      ).join('');
      el('threadPreview').innerHTML =
        '<div class="preview-title"><b>Thread preview</b><span>' + ctx.messages.length + ' nearby</span>' +
        '<button class="ghost" style="padding:4px 9px;margin-left:auto" onclick="openSession(\'' + esc(ctx.sessionId) + '\')">Full session ⤢</button></div>' +
        '<div class="preview-meta">Selected message #' + id + '</div>' +
        '<div class="thread">' + thread + '</div>';
    } catch(e){
      el('threadPreview').innerHTML = '<div class="preview-title"><b>Thread preview</b><span>error</span></div><div class="empty">context error: ' + esc(e) + '</div>';
    }
  }
  function expandHit(id){ selectHit(id); }
  function openMenu(){ el('mproj').textContent = (last && last.project && last.project.name) || 'this folder'; el('overlay').style.display = 'flex'; }
  function closeMenu(){ el('overlay').style.display = 'none'; }
  function summarize(r){
    if(r.needsReconcile) return 'Docs non-standard - run zemory migrate, docs sync/rm/render.';
    const a = r.added && r.added.length ? 'added ' + r.added.join(', ') : 'nothing missing';
    return (r.renamedTo ? 'renamed old -> ' + r.renamedTo + '\n' : '') + (r.createdConfig ? 'created .harness.json - ' : '') + a;
  }
  async function act(ep){
    closeMenu();
    el('msg').textContent = 'working...';
    try {
      const r = await (await fetch(ep + ru(), { method: 'POST' })).json();
      el('msg').textContent = 'OK - ' + summarize(r);
      await tick();
      await runChecks();
    } catch(e){ el('msg').textContent = 'error: ' + e; }
  }
  function actConfirm(ep, q){ if(confirm(q)) act(ep); }

  (async () => {
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
