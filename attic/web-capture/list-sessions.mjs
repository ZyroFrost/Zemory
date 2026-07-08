// Liệt kê session thật trong brain (đọc trực tiếp global_memory.db qua module của app).
import { writeFileSync } from "node:fs";
import { openBrain, BRAIN_DB } from "file:///d:/Zyro/Tool/Zemory/dist/brain/db.js";

const trunc = (s, n = 68) => (typeof s === "string" && s.length > n ? s.slice(0, n) + "…" : s);
const db = openBrain(BRAIN_DB);
const out = [];

const total = db.prepare("SELECT COUNT(*) c FROM sessions").get().c;
const totMsg = db.prepare("SELECT COALESCE(SUM(message_count),0) c FROM sessions").get().c;
out.push(`TỔNG: ${total} session · ${totMsg} message`);

out.push("\nTHEO SOURCE:");
for (const r of db.prepare("SELECT source, COUNT(*) c, COALESCE(SUM(message_count),0) m FROM sessions GROUP BY source ORDER BY c DESC").all())
  out.push(`  ${String(r.source).padEnd(14)} ${String(r.c).padStart(4)} session · ${r.m} msg`);

const web = db.prepare("SELECT COUNT(*) c FROM sessions WHERE source LIKE '%-web'").get().c;
out.push(`\nWEB-CHAT (chatgpt-web/gemini-web/claude-web): ${web} session` + (web === 0 ? "  → CHƯA có (chưa import export nào)" : ""));

out.push("\n30 SESSION GẦN NHẤT — [source] #msg · thời điểm · title · project:");
const rows = db.prepare(`
  SELECT source, COALESCE(host,'?') host, message_count mc,
         COALESCE(substr(ended_at,1,16),'?') t,
         COALESCE(NULLIF(title,''),'(no title)') title,
         COALESCE(project_root,'') proj
  FROM sessions ORDER BY ended_at DESC LIMIT 30`).all();
let i = 0;
for (const r of rows) {
  i++;
  const proj = r.proj ? " · " + r.proj.split(/[\\/]/).pop() : "";
  out.push(`${String(i).padStart(2)}. [${String(r.source).padEnd(11)}] ${String(r.mc).padStart(5)}msg · ${r.t} · ${trunc(r.title)}${proj}`);
}
db.close();
writeFileSync(process.argv[2], out.join("\n") + "\n", "utf8");
console.log("written " + out.length + " lines");
