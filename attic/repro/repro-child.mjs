// Tiến trình CON: ghi FTS5 liên tục cho tới khi bị giết.
// Mô phỏng đúng tải mới xuất hiện ngày hỏng: hook per-message chèn từng tin một, mỗi lần chèn
// là trigger đẩy vào messages_fts + messages_fts_tri, và FTS5 tự trộn (automerge) nền.
import Database from "better-sqlite3";

const [, , dbPath, mode] = process.argv;
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma(`synchronous = ${mode === "full" ? "FULL" : "NORMAL"}`);
db.pragma("busy_timeout = 5000");
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, content TEXT);
  CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(content, content='messages', content_rowid='id');
  CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts_tri USING fts5(content, content='messages', content_rowid='id', tokenize='trigram');
  CREATE TRIGGER IF NOT EXISTS m_ai AFTER INSERT ON messages BEGIN
    INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
    INSERT INTO messages_fts_tri(rowid, content) VALUES (new.id, new.content);
  END;
`);

const ins = db.prepare("INSERT INTO messages(content) VALUES (?)");
// Văn bản đủ dài + đủ đa dạng để cây FTS thật sự lớn và phải trộn.
const word = (n) => `tu${n.toString(36)}`;
let i = 0;
process.send?.("ready");
for (;;) {
  // Mỗi "lượt trả lời" = một giao dịch nhỏ, đúng như hook per-message.
  db.transaction(() => {
    for (let k = 0; k < 20; k++) {
      const words = [];
      for (let w = 0; w < 400; w++) words.push(word((i * 997 + w * 31) % 500000));
      ins.run(words.join(" "));
      i++;
    }
  })();
  if (i % 200 === 0) process.send?.(i);
}
