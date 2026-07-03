import { readFileSync, writeFileSync } from "node:fs";
const [, , path, outPath] = process.argv;
const arr = JSON.parse(readFileSync(path, "utf8"));
const KW = ["chính trị","địa chính trị","cánh tả","cánh hữu","cộng hòa","dân chủ","trump","biden","palestine","israel","iran","ukraine","nato","cấm vận","chủ quyền","bầu cử","tổng thống","chiến tranh","xung đột","cộng sản","tư bản"];
const norm = (s) => (s || "").toLowerCase();
const msgsOf = (conv) => {
  const m = conv.mapping || {}; const list = [];
  for (const id in m) {
    const msg = m[id]?.message; if (!msg?.author || msg.author.role === "system") continue;
    const parts = msg.content?.parts;
    const t = Array.isArray(parts) ? parts.filter((p) => typeof p === "string").join("\n") : (typeof msg.content === "string" ? msg.content : "");
    if (t.trim()) list.push({ role: msg.author.role, t, ts: msg.create_time });
  }
  return list.sort((a, b) => (a.ts || 0) - (b.ts || 0));
};
const hits = [];
for (const c of arr) {
  const msgs = msgsOf(c);
  const hay = norm(c.title) + "\n" + msgs.map((m) => norm(m.t)).join("\n");
  const matched = KW.filter((k) => hay.includes(k));
  if (!matched.length) continue;
  let score = 0; for (const k of matched) score += hay.split(k).length - 1;
  let snip = "";
  for (const m of msgs) { const lo = norm(m.t); const idx = lo.indexOf(matched[0]); if (idx >= 0) { snip = "[" + m.role + "] " + m.t.slice(Math.max(0, idx - 45), idx + 90).replace(/\s+/g, " ").trim(); break; } }
  if (!snip) snip = "[title match]";
  hits.push({ title: c.title || "(no title)", date: c.create_time ? new Date(c.create_time * 1000).toISOString().slice(0, 10) : "?", n: msgs.length, kw: matched.slice(0, 7), score, snip });
}
hits.sort((a, b) => b.score - a.score);
const out = [`Search chủ đề CHÍNH TRỊ trong ${arr.length} hội thoại đã kéo → ${hits.length} hội thoại khớp`, ""];
hits.forEach((h, i) => {
  out.push(`${String(i + 1).padStart(2)}. ${h.date} · ${h.n}msg · ${h.title.slice(0, 62)}`);
  out.push(`      kw: ${h.kw.join(", ")}  (x${h.score})`);
  out.push(`      ↳ ${h.snip.slice(0, 150)}`);
});
writeFileSync(outPath, out.join("\n") + "\n", "utf8");
console.log("written", hits.length);
