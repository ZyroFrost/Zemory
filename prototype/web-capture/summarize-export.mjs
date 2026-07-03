import { readFileSync, writeFileSync } from "node:fs";
const path = process.argv[2], outPath = process.argv[3];
const arr = JSON.parse(readFileSync(path, "utf8"));
const out = [];
const c0 = arr[0];
out.push(`Số hội thoại tải được: ${arr.length}`);
out.push(`Top-level: array | có 'mapping' (ChatGPT tree): ${!!c0?.mapping} | keys[0]: ${Object.keys(c0 || {}).join(", ")}`);

const flatten = (conv) => {
  const m = conv.mapping || {}; const msgs = [];
  for (const id in m) {
    const msg = m[id]?.message; if (!msg?.author) continue;
    if (msg.author.role === "system") continue;
    const parts = msg.content?.parts;
    const text = Array.isArray(parts) ? parts.filter((p) => typeof p === "string").join("\n") : (typeof msg.content === "string" ? msg.content : "");
    if (!text.trim()) continue;
    msgs.push({ role: msg.author.role, ts: msg.create_time });
  }
  return msgs;
};
let totalMsg = 0;
const rows = arr.map((c) => { const m = flatten(c); totalMsg += m.length; return { title: c.title || "(no title)", n: m.length, date: c.create_time ? new Date(c.create_time * 1000).toISOString().slice(0, 10) : "?" }; })
  .sort((a, b) => (a.date < b.date ? 1 : -1));
out.push(`Tổng message (flatten mapping, bỏ system/empty): ${totalMsg}`);
out.push("");
out.push("DANH SÁCH (ngày · #msg · title):");
rows.forEach((r, i) => out.push(`${String(i + 1).padStart(3)}. ${r.date} · ${String(r.n).padStart(4)}msg · ${r.title.slice(0, 72)}`));

const s = arr.find((c) => c.mapping);
const node = s && Object.values(s.mapping).find((n) => typeof n?.message?.content?.parts?.[0] === "string" && n.message.author.role !== "system");
if (node) {
  out.push(""); out.push("MẪU 1 message node:");
  out.push(`  role=${node.message.author.role} · create_time=${node.message.create_time} (${typeof node.message.create_time}) · content_type=${node.message.content.content_type}`);
  out.push(`  parts[0]: ${String(node.message.content.parts[0]).slice(0, 110).replace(/\n/g, " ")}`);
}
writeFileSync(outPath, out.join("\n") + "\n", "utf8");
console.log("written");
