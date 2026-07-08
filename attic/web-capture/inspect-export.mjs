// Soi cấu trúc file export web-chat (KHÔNG đổ hết nội dung — text bị cắt ngắn).
// Dùng: node inspect-export.mjs <path tới conversations.json | MyActivity.json | .jsonl>
// Mục đích: xác nhận format THẬT trước khi viết parser (ChatGPT / Claude / Gemini).
import { readFileSync, statSync } from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("usage: node inspect-export.mjs <file.json|.jsonl>");
  process.exit(1);
}

const CAP = 90; // cắt mọi string dài hơn thế này
const trunc = (s) =>
  typeof s !== "string" ? s : s.length <= CAP ? s : `${s.slice(0, CAP)}… (+${s.length - CAP} ký tự)`;
const typeOf = (v) =>
  Array.isArray(v) ? `array[${v.length}]` : v === null ? "null" : typeof v;
const keysOf = (o) =>
  o && typeof o === "object" && !Array.isArray(o) ? Object.keys(o) : [];
const line = (s = "") => console.log(s);

const size = statSync(path).size;
line(`FILE : ${path}`);
line(`SIZE : ${(size / 1048576).toFixed(2)} MB`);

const raw = readFileSync(path, "utf8");
let data;
if (path.toLowerCase().endsWith(".jsonl")) {
  data = raw.split("\n").filter((l) => l.trim()).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
  line(`FORMAT: JSONL — ${data.length} dòng`);
} else {
  try { data = JSON.parse(raw); }
  catch (e) { line(`✗ JSON.parse lỗi: ${e.message}`); process.exit(1); }
  line("FORMAT: JSON");
}

line(`TOP-LEVEL: ${typeOf(data)}`);
const arr = Array.isArray(data)
  ? data
  : Array.isArray(data?.conversations) ? data.conversations : null;

if (!arr) {
  line(`\n⚠ Không phải mảng và không có .conversations[]. Keys top-level:`);
  line("  " + keysOf(data).join(", "));
  process.exit(0);
}
line(`SỐ PHẦN TỬ (conversation/record): ${arr.length}`);

const c0 = arr[0];
line(`\n--- phần tử[0]: keys ---`);
for (const k of keysOf(c0)) line(`  ${k}: ${typeOf(c0[k])}`);

if (c0?.mapping) {
  line(`\n>>> Nhận diện: CHATGPT (cây "mapping")`);
  line(`  title        : ${trunc(c0.title)}`);
  line(`  create_time  : ${c0.create_time} (${typeof c0.create_time})`);
  line(`  current_node : ${c0.current_node}`);
  const ids = Object.keys(c0.mapping);
  line(`  mapping nodes: ${ids.length}`);
  const node = ids.map((id) => c0.mapping[id]).find((n) => n?.message?.content);
  if (node) {
    const m = node.message;
    line(`  node keys    : ${keysOf(node).join(", ")}`);
    line(`  message keys : ${keysOf(m).join(", ")}`);
    line(`  author       : ${JSON.stringify(m.author)}`);
    line(`  content_type : ${m.content?.content_type}  | content keys: ${keysOf(m.content).join(", ")}`);
    const p0 = Array.isArray(m.content?.parts) ? m.content.parts[0] : m.content;
    line(`  parts[0]     : ${trunc(typeof p0 === "string" ? p0 : JSON.stringify(p0))}`);
    line(`  msg create_time: ${m.create_time} (${typeof m.create_time})`);
  }
} else if (c0?.chat_messages) {
  line(`\n>>> Nhận diện: CLAUDE.AI (chat_messages phẳng)`);
  line(`  uuid       : ${c0.uuid}`);
  line(`  name       : ${trunc(c0.name)}`);
  line(`  created_at : ${c0.created_at}`);
  line(`  chat_messages: ${c0.chat_messages.length}`);
  const m = c0.chat_messages[0] ?? {};
  line(`  msg keys   : ${keysOf(m).join(", ")}`);
  line(`  sender     : ${m.sender}`);
  line(`  text       : ${trunc(m.text)}`);
  line(`  created_at : ${m.created_at}`);
  line(`  content    : ${typeOf(m.content)}${m.content?.[0] ? " | content[0] keys: " + keysOf(m.content[0]).join(", ") : ""}`);
} else if (c0 && (c0.header || c0.titleUrl || c0.time || c0.publishedAt)) {
  line(`\n>>> Nhận diện: GEMINI TAKEOUT (log hoạt động)`);
  line(`  record keys: ${keysOf(c0).join(", ")}`);
  line(`  header     : ${c0.header}`);
  line(`  time       : ${c0.time || c0.publishedAt}`);
  line(`  title      : ${trunc(c0.title)}`);
  line(`  titleUrl   : ${c0.titleUrl}`);
  // đếm record theo header để thấy có phải trộn nhiều product không
  const byHeader = {};
  for (const r of arr) byHeader[r?.header ?? "(none)"] = (byHeader[r?.header ?? "(none)"] || 0) + 1;
  line(`  phân bố header: ${JSON.stringify(byHeader)}`);
} else {
  line(`\n>>> Shape LẠ — xem keys phần tử[0] ở trên. Dán output cho tôi.`);
}
