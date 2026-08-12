// Chup anh 6 man cockpit cho README — MAY chup, khong bat nguoi chup tay.
//
// Vi sao co script nay: anh trong README la TAI LIEU, ma tai lieu chi dung khi no theo kip giao
// dien. Anh chup tay thi lan doi UI sau se khong ai chup lai, va README bat dau NOI DOI ve san
// pham — cung loai loi "so noi khac code". Chup bang may thi lam tuoi lai chi la chay mot lenh.
//
//   node backend/scripts/shoot-ui.mjs [--port 4444] [--out docs_visual/ui]
//
// Dung Edge/Chrome o che do headless qua CDP (cung loi `memory scan-web` da dung), doi UI nap
// xong roi bam vao tung muc nav. Router cua app luu man dang xem vao localStorage chu khong dung
// hash, nen phai CLICK that chu khong the nap thang URL.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
};
const PORT = Number(arg("port", "4444"));
const OUT = resolve(arg("out", "docs_visual/ui"));
const CDP_PORT = 9333;
const W = 1840;
const H = 1080;

/** Man hinh can chup: [ten file, muc nav, sub-tab (neu co), cho them ms] */
// Thoi gian cho DAI co chu dich. Do 2026-08-11: `/memory-status` mat 18,5 giay (endpoint khac
// 112-246 ms), nen chup som la duoc mot tam anh dang TAI — o so lieu con dau gach, danh sach con
// "...". Anh nhu vay con te hon khong co anh: no ta san pham nhu do dang.
// [ten file, muc nav, [thuoc-tinh-sub, gia-tri] hoac null, cho them ms]
// Ten thuoc tinh doc TU HTML (`data-rc` recall · `data-ht` harness · `data-gm` global memory) —
// lan dau to doan "sessions"/"tree" va anh ra SAI tab ma script van bao xanh, vi no chi kiem cu
// click NAV. Nay co buoc xac nhan sub-tab da 'on' that.
const SHOTS = [
  ["01-home", "home", null, 4000],
  ["02-recall", "recall", ["rc", "sess"], 5000],
  ["03-projects", "projects", null, 4000],
  ["04-global-memory-sync", "gmem", ["gm", "sync"], 9000],
  ["05-harness-docs", "harness", ["ht", "docs"], 5000],
  ["06-harness-structure", "harness", ["ht", "struct"], 5000],
  ["07-features", "system", null, 5000],
];

const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdpTargets() {
  const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
  return r.json();
}

async function main() {
  const ping = await fetch(`http://127.0.0.1:${PORT}/ping`).catch(() => null);
  if (!ping || !ping.ok) {
    console.error(`Daemon khong tra loi o cong ${PORT} — chay \`zemory ui\` truoc.`);
    process.exit(1);
  }
  const exe = BROWSERS.find((p) => existsSync(p));
  if (!exe) {
    console.error("Khong tim thay Edge/Chrome — khong chup duoc.");
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });
  const profile = join(tmpdir(), `zemory-shoot-${process.pid}`);

  const child = spawn(
    exe,
    [
      "--headless=new",
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${profile}`,
      `--window-size=${W},${H}`,
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `http://127.0.0.1:${PORT}/`,
    ],
    { stdio: "ignore", detached: false },
  );

  let ws = null;
  for (let i = 0; i < 40 && !ws; i++) {
    await sleep(500);
    const list = await cdpTargets().catch(() => null);
    const page = list?.find((t) => t.type === "page");
    if (page) ws = page.webSocketDebuggerUrl;
  }
  if (!ws) {
    child.kill();
    console.error("Trinh duyet khong mo duoc cong CDP.");
    process.exit(1);
  }

  const { WebSocket } = await import("node:ws").catch(() => ({ WebSocket: globalThis.WebSocket }));
  const sock = new WebSocket(ws);
  let id = 0;
  const waiting = new Map();
  sock.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && waiting.has(msg.id)) {
      waiting.get(msg.id)(msg);
      waiting.delete(msg.id);
    }
  });
  await new Promise((r) => sock.addEventListener("open", r));
  const send = (method, params) =>
    new Promise((res) => {
      const n = ++id;
      waiting.set(n, res);
      sock.send(JSON.stringify({ id: n, method, params }));
    });

  await send("Page.enable", {});

  // DIEU HUONG LAI cho chac. Edge tren may da dang nhap tai khoan cong ty chen mot trang quang
  // ba "we've signed you in / syncing your browsing data" DE LEN tab dau tien, nen URL truyen
  // luc mo trinh duyet khong phai thu dang hien. Do that 2026-08-12: cho 150 giay van thay
  // trang quang ba chu khong thay app. `Page.navigate` de len no.
  // EP kich thuoc qua CDP, dung tin `--window-size`: trong headless co truong hop khung that
  // ve con 500x450 (do duoc 2026-08-12) => anh bi bop, cot doi cho nhau, doc khong ra gi.
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `http://127.0.0.1:${PORT}/` });
  await sleep(2000);

  // CHO THEO DIEU KIEN, KHONG theo dong ho. Hai lan chup hong deu vi cho co dinh roi doan la
  // xong: lan 1 o so lieu con dau gach, lan 2 giao dien con nguyen tieng Viet du da doi sang en.
  // Cung MOT goc: client ap ca so lieu LAN ngon ngu tu payload `/memory-status`, ma endpoint do
  // mat ~18,5 giay — chua ve toi thi trang van o trang thai mac dinh.
  console.log("  cho /memory-status ve (thuong ~20 giay, toi da 150)…");
  let ready = false;
  for (let i = 0; i < 150 && !ready; i++) {
    await sleep(1000);
    const r = await send("Runtime.evaluate", {
      // So co dau phay = tile da co du lieu that (vd "238,495"), khong con "—".
      expression: `/\\d,\\d{3}/.test(document.body.innerText)`,
      returnByValue: true,
    });
    ready = r?.result?.result?.value === true;
  }
  if (!ready) {
    // In ra THAY GI thay vi chi bao "khong dat" — mot lan that bai cam nin la mot lan phai
    // dung script rieng di do lai tu dau.
    const d = await send("Runtime.evaluate", {
      expression: `JSON.stringify({len:document.body.innerText.length, head:document.body.innerText.slice(0,200).replace(/\\s+/g,' ')})`,
      returnByValue: true,
    });
    console.log("  ✗ so lieu KHONG ve sau 150 giay — KHONG chup anh dang tai.");
    console.log("    trang dang co:", d?.result?.result?.value ?? "(khong doc duoc)");
    sock.close();
    child.kill();
    process.exit(1);
  }
  await sleep(1500); // cho ve xong not phan con lai

  let bad = 0;
  for (const [name, nav, sub, wait] of SHOTS) {
    const sel = sub ? `.screen[data-s="${nav}"] [data-${sub[0]}="${sub[1]}"]` : null;
    const click = `(()=>{const a=document.querySelector('.nav a[data-s="${nav}"]');if(!a)return 'khong thay muc nav';a.click();${
      sub ? `const b=document.querySelector('${sel}');if(!b)return 'khong thay sub-tab ${sub[0]}=${sub[1]}';b.click();` : ""
    }return 'ok';})()`;
    const r = await send("Runtime.evaluate", { expression: click, returnByValue: true });
    let state = r?.result?.result?.value;
    await sleep(wait);

    // XAC NHAN sau khi cho: man dung chua, va sub-tab co that su dang 'on' khong.
    // Thieu buoc nay thi mot cu click truot van cho ra anh SAI TAB ma script bao xanh.
    if (state === "ok") {
      const check = `(()=>{const s=document.querySelector('.screen[data-s="${nav}"]');if(!s||!s.classList.contains('on'))return 'man khong mo';${
        sub ? `const b=document.querySelector('${sel}');if(!b||!b.classList.contains('on'))return 'sub-tab khong an';` : ""
      }return 'ok';})()`;
      const v = await send("Runtime.evaluate", { expression: check, returnByValue: true });
      state = v?.result?.result?.value;
    }

    const shot = await send("Page.captureScreenshot", { format: "png" });
    const data = shot?.result?.data;
    if (!data) {
      console.log(`  ✗ ${name}: khong chup duoc`);
      bad++;
      continue;
    }
    if (state !== "ok") {
      console.log(`  ✗ ${name}: ${state} — KHONG ghi file (anh se sai tab)`);
      bad++;
      continue;
    }
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, "base64"));
    console.log(`  ✓ ${name}.png`);
  }
  if (bad) console.log(`\n⚠ ${bad}/${SHOTS.length} man KHONG chup duoc — xem ly do o tren.`);

  sock.close();
  child.kill();
  await sleep(500);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    /* profile tam - khong sao */
  }
  console.log(`\nXong. Anh o: ${OUT}`);
  console.log("Kiem bang MAT truoc khi commit: man nao con dang tai thi chup lai voi thoi gian cho lau hon.");
}

main();
