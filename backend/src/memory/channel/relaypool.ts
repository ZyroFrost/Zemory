/**
 * RELAY — tầng 4 của `plan/24 §1c`, đi qua **cụm relay CÔNG KHAI của Syncthing**.
 *
 * 🔴 **Vì sao tầng này phải có, và vì sao không code nào thay được nó.** Đục lỗ chỉ ăn khi ít nhất
 * một đầu gọi vào được. `§6d` đã đo: **cả hai** đầu kín NAT ⇒ không bên nào mở được cổng. Ca đó
 * không phải hiếm — một máy ở công ty, một ở nhà là đúng nó. Lúc đó **bắt buộc phải có máy thứ
 * ba** mà cả hai cùng gọi RA được. Đó là sự thật vật lý, không phải thiếu sót của bản trước.
 *
 * ⛔ **Nhưng máy thứ ba KHÔNG phải là máy của user.** Đây là chỗ bản 21/09 đi sai: nó dựng
 * `zemory relay serve` — relay TỰ HOST — rồi phải gỡ vì trượt `§1a-0` (bắt user nuôi một máy có IP
 * công khai). Cụm relay công khai của Syncthing giải đúng ca đó: **~100 relay, miễn phí, không tài
 * khoản**. Ta là CLIENT của cụm, không phải chủ server.
 *
 * ── ĐO THẬT 2026-09-23, trước khi viết một dòng nào (điều 12) ──────────────────────────────
 * · `GET relays.syncthing.net/endpoint` → **200**, **100 relay** ·
 * · `JoinRelayRequest` với chứng chỉ của zemory → **3/3 relay trả `code=0 "success"`** ·
 * · một đầu NGHE + một đầu GỌI qua relay thật ⇒ **cả hai nhận được `SessionInvitation`** ·
 * · `JoinSessionRequest` → **`code=0 "success"`** ⇒ từ đó là ống byte thô cho TLS của ta.
 *
 * ── VÌ SAO KHÔNG ĐỤNG ĐIỀU 7 ───────────────────────────────────────────────────────────────
 * Hai đầu bắt tay **TLS BÊN TRONG** phiên (`secure()` trên chính socket này), và khối vốn đã `.enc`.
 * Relay thấy **siêu dữ liệu**: hai ID nói chuyện với nhau, bao nhiêu byte. Không byte nội dung nào.
 * Nhẹ hơn hẳn Drive — thứ đang giữ TRỌN kho.
 *
 * ── MÓN QUÀ CỦA GIAO THỨC: RELAY TỰ PHÂN VAI ───────────────────────────────────────────────
 * `SessionInvitation.serverSocket` nói thẳng đầu nào làm TLS server. Lớp đục lỗ KHÔNG có thứ này —
 * ở đó vai do cú bắt tay nào ăn trước quyết định, tức **tung đồng xu**, và đó đúng là họ lỗi
 * *"hook đặt sai vai"* đã đốt nhiều ngày (`06_CHANGES [2026-09-22]`). Ở đây không còn chỗ cho nó.
 *
 * **Fail-open tuyệt đối** (điều 9): cụm im, mạng chặn, relay đầy — lane này trả rỗng và mọi đường
 * cũ (dò LAN · bảng chung · cụm dò · đục lỗ) chạy y nguyên. Nó là đường CUỐI, thử sau tất cả.
 */
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import { deviceIdBytes, type ChannelIdentity } from "./identity.js";

/** Nhà của danh sách cụm relay công khai. */
export const RELAY_POOL_URL = "https://relays.syncthing.net/endpoint";

/**
 * Số nhận dạng khung của giao thức relay v1.
 *
 * Mọi tin mở bằng 4 byte này. Nhận được thứ khác nghĩa là **đang nói chuyện với một thứ không phải
 * relay** — đóng ngay chứ đừng cố đọc tiếp: đọc tiếp một luồng lạ là tự dựng một chỗ hỏng mới.
 */
export const RELAY_MAGIC = 0x9e79bc40;

/** Các kiểu tin của relay v1 — đúng tên trong giao thức của họ, đừng đặt tên khác. */
export const RELAY_MSG = {
  ping: 0,
  pong: 1,
  joinRelay: 2,
  joinSession: 3,
  response: 4,
  connect: 5,
  invite: 6,
  relayFull: 7,
} as const;

/** Trần đọc một tin. Relay lạ trả độ dài khổng lồ thì không được quyền ăn hết RAM. */
const MAX_FRAME = 64 * 1024;

export interface RelayEndpoint {
  host: string;
  port: number;
  /** Nguyên văn `relay://…` của cụm — đây là thứ đi vào lượt đăng ký dò toàn cầu. */
  url: string;
}

/**
 * `relay://1.2.3.4:22067/?id=…` → `{host, port}`.
 *
 * Trả `null` cho thứ không dùng được thay vì đoán: một địa chỉ relay sai làm cả lane treo cho tới
 * khi hết trần, trong khi các đường khác đã xong từ lâu.
 */
export function parseRelayUrl(raw: string): RelayEndpoint | null {
  const s = raw.trim();
  if (!s.startsWith("relay://")) return null;
  try {
    const u = new URL("http://" + s.slice("relay://".length));
    const port = Number(u.port || 22067);
    if (!u.hostname || !Number.isInteger(port) || port <= 0 || port > 65535) return null;
    return { host: u.hostname, port, url: s };
  } catch {
    return null;
  }
}

/** Khung một tin relay: `<magic u32><kiểu i32><độ dài i32><thân>`. */
export function frameMessage(type: number, body: Buffer = Buffer.alloc(0)): Buffer {
  const head = Buffer.alloc(12);
  head.writeUInt32BE(RELAY_MAGIC, 0);
  head.writeInt32BE(type, 4);
  head.writeInt32BE(body.length, 8);
  return Buffer.concat([head, body]);
}

/**
 * Trường chuỗi byte của họ: `<độ dài u32><dữ liệu><đệm cho tròn 4>`.
 *
 * Phần ĐỆM là chỗ dễ quên nhất và nó hỏng CÂM: thiếu đệm thì trường kế đọc lệch vài byte, relay
 * chỉ thấy một tin vô nghĩa và lặng lẽ bỏ qua — không có lỗi nào để lần.
 */
export function bytesField(b: Buffer): Buffer {
  const pad = (4 - (b.length % 4)) % 4;
  const head = Buffer.alloc(4);
  head.writeUInt32BE(b.length, 0);
  return Buffer.concat([head, b, Buffer.alloc(pad)]);
}

export interface RelayFrame {
  type: number;
  body: Buffer;
}

/**
 * Bóc các tin TRỌN VẸN khỏi đệm, trả phần thừa lại cho người gọi.
 *
 * Hàm THUẦN, tách riêng để có cổng soi: một tin có thể tới làm nhiều mảnh TCP, và HAI tin có thể
 * tới trong CÙNG một gói. Vòng đọc tự viết thường chỉ xử đúng ca một-tin-một-gói rồi hỏng ở ca
 * kia — mà ca kia chỉ xảy ra lúc mạng bận, tức lúc khó lần nhất.
 */
export function readFrames(buf: Buffer): { frames: RelayFrame[]; rest: Buffer; bad: boolean } {
  const frames: RelayFrame[] = [];
  let b = buf;
  for (;;) {
    if (b.length < 12) return { frames, rest: b, bad: false };
    if (b.readUInt32BE(0) !== RELAY_MAGIC) return { frames, rest: b, bad: true };
    const type = b.readInt32BE(4);
    const len = b.readInt32BE(8);
    if (len < 0 || len > MAX_FRAME) return { frames, rest: b, bad: true };
    if (b.length < 12 + len) return { frames, rest: b, bad: false };
    frames.push({ type, body: b.subarray(12, 12 + len) });
    b = b.subarray(12 + len);
  }
}

export interface SessionInvitation {
  /** ID (32 byte thô) của máy bên kia. */
  from: Buffer;
  /** Khoá phiên — thứ duy nhất mở được ống byte ở relay. */
  key: Buffer;
  /** Địa chỉ phiên. RỖNG nghĩa là *dùng chính IP của relay* — xem chú thích dưới. */
  host: string | null;
  port: number;
  /** Relay phân vai: `true` ⇒ đầu này làm TLS **server**. */
  serverSocket: boolean;
}

/**
 * Giải mã `SessionInvitation`: `from` · `key` · `address` (chuỗi byte) · `port` (u32) · `serverSocket` (u32).
 *
 * ⚠ **`address` RỖNG là ca THƯỜNG, không phải lỗi** — đo 23/09: cả hai lời mời đều trả 0 byte, và
 * nghĩa của nó là *"nối về chính relay này"*. Coi rỗng là hỏng thì lane chết ở đúng ca phổ biến
 * nhất; nên hàm này trả `host: null` và người gọi điền host của relay.
 */
export function parseInvitation(body: Buffer): SessionInvitation | null {
  try {
    let off = 0;
    const take = (): Buffer => {
      const n = body.readUInt32BE(off);
      off += 4;
      if (n > MAX_FRAME || off + n > body.length) throw new Error("trường vượt khung");
      const v = body.subarray(off, off + n);
      off += n + ((4 - (n % 4)) % 4);
      return v;
    };
    const from = take();
    const key = take();
    const addr = take();
    if (off + 8 > body.length) return null;
    const port = body.readUInt32BE(off);
    const serverSocket = body.readUInt32BE(off + 4) !== 0;
    if (!from.length || !key.length) return null;
    if (!Number.isInteger(port) || port <= 0 || port > 65535) return null;
    // Địa chỉ 4 byte = IPv4. Độ dài khác (kể cả 0) ⇒ để người gọi dùng host của relay.
    const host = addr.length === 4 ? Array.from(addr).join(".") : null;
    return { from, key, host, port, serverSocket };
  } catch {
    return null;
  }
}

/** Mở một kết nối TLS tới relay, mang chứng chỉ của máy — chứng chỉ CHÍNH LÀ danh tính. */
function connectRelay(e: RelayEndpoint, identity: ChannelIdentity, timeoutMs: number): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const sock = tls.connect(
      {
        host: e.host,
        port: e.port,
        key: identity.keyPem,
        cert: identity.certPem,
        // Không nhờ CA phán relay: thứ ta gửi lên là địa chỉ + lời mời phiên, không có bí mật nào.
        // Thứ gác cửa thật là lớp TLS của CHÍNH TA chạy BÊN TRONG phiên, cộng chìa chung.
        rejectUnauthorized: false,
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(sock);
      },
    );
    const fail = (e2: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        sock.destroy();
      } catch {
        /* đóng được thì tốt */
      }
      reject(e2);
    };
    const timer = setTimeout(() => fail(new Error("ETIMEDOUT")), timeoutMs);
    sock.on("error", fail);
  });
}

export interface PoolOptions {
  timeoutMs?: number;
  poolUrl?: string;
}

/**
 * Lấy danh sách cụm relay công khai.
 *
 * Trả rỗng khi không lấy được — và đó KHÔNG phải lỗi cần báo: lane này là đường cuối, im lặng
 * nhường cho các đường khác đúng như điều 9.
 */
export async function fetchRelayPool(o: PoolOptions = {}): Promise<RelayEndpoint[]> {
  const url = o.poolUrl ?? RELAY_POOL_URL;
  const raw = await new Promise<string>((resolve) => {
    let done = false;
    const fin = (s: string): void => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve(s);
      }
    };
    const timer = setTimeout(() => fin(""), o.timeoutMs ?? 8000);
    try {
      const req = https.get(url, { timeout: o.timeoutMs ?? 8000 }, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return fin("");
        }
        let b = "";
        res.setEncoding("utf8");
        res.on("data", (c: string) => {
          if (b.length < 1024 * 1024) b += c;
        });
        res.on("end", () => fin(b));
      });
      req.on("error", () => fin(""));
      req.on("timeout", () => {
        req.destroy();
        fin("");
      });
    } catch {
      fin("");
    }
  });
  if (!raw) return [];
  try {
    const j = JSON.parse(raw) as { relays?: { url?: unknown }[] };
    const list = Array.isArray(j.relays) ? j.relays : [];
    return list.map((r) => parseRelayUrl(String(r?.url ?? ""))).filter((x): x is RelayEndpoint => Boolean(x));
  } catch {
    return [];
  }
}

export interface RelayJoin {
  endpoint: RelayEndpoint;
  stop(): void;
}

/**
 * THAM GIA cụm với vai NGHE: giữ một kết nối thường trực, chờ `SessionInvitation`.
 *
 * 🔴 **`ping` phải được trả lời bằng `pong`, và đó là điều kiện SỐNG của lane.** Relay đá ra bất kỳ
 * client nào im — nên bỏ nhánh pong đi thì lane chạy vài phút rồi chết lặng, đúng kiểu hỏng khó lần
 * nhất (không lỗi, không log, chỉ là một hôm nào đó không ai gọi vào được nữa).
 */
export function joinRelay(o: {
  endpoint: RelayEndpoint;
  identity: ChannelIdentity;
  onInvite: (inv: SessionInvitation, endpoint: RelayEndpoint) => void;
  onClose?: (why: string) => void;
  timeoutMs?: number;
}): Promise<RelayJoin> {
  return new Promise((resolve, reject) => {
    let stopped = false;
    let joined = false;
    connectRelay(o.endpoint, o.identity, o.timeoutMs ?? 10_000).then(
      (sock) => {
        let buf: Buffer = Buffer.alloc(0);
        const shut = (why: string): void => {
          if (stopped) return;
          stopped = true;
          try {
            sock.destroy();
          } catch {
            /* đóng được thì tốt */
          }
          o.onClose?.(why);
          if (!joined) reject(new Error(why));
        };
        sock.on("data", (d: Buffer) => {
          buf = Buffer.concat([buf, d]);
          const r = readFrames(buf);
          buf = r.rest;
          if (r.bad) return shut("khung lạ — không phải relay");
          for (const f of r.frames) {
            if (f.type === RELAY_MSG.ping) {
              sock.write(frameMessage(RELAY_MSG.pong));
            } else if (f.type === RELAY_MSG.response) {
              const code = f.body.length >= 4 ? f.body.readInt32BE(0) : -1;
              if (code !== 0) return shut(`relay từ chối: mã ${code}`);
              joined = true;
              resolve({
                endpoint: o.endpoint,
                stop: () => shut("đã dừng"),
              });
            } else if (f.type === RELAY_MSG.relayFull) {
              return shut("relay đầy");
            } else if (f.type === RELAY_MSG.invite) {
              const inv = parseInvitation(f.body);
              if (inv) o.onInvite(inv, o.endpoint);
            }
          }
        });
        sock.on("error", (e: Error) => shut(e.message.slice(0, 90)));
        sock.on("close", () => shut("relay đóng kết nối"));
        sock.write(frameMessage(RELAY_MSG.joinRelay));
      },
      (e: Error) => reject(e),
    );
  });
}

/**
 * XIN PHIÊN tới một máy qua relay: gửi `ConnectRequest`, chờ `SessionInvitation`.
 *
 * `null` = relay không biết máy đó (nó chưa tham gia relay NÀY), hoặc mạng im. Người gọi thử relay
 * khác hoặc bỏ cuộc — không có gì để báo lỗi, vì đây vẫn là đường cuối.
 */
export async function connectViaRelay(o: {
  endpoint: RelayEndpoint;
  identity: ChannelIdentity;
  peerDeviceId: string;
  timeoutMs?: number;
}): Promise<SessionInvitation | null> {
  const id = deviceIdBytes(o.peerDeviceId);
  if (!id) return null; // ID méo ⇒ đừng chạm mạng
  const timeoutMs = o.timeoutMs ?? 10_000;
  let sock: tls.TLSSocket;
  try {
    sock = await connectRelay(o.endpoint, o.identity, timeoutMs);
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    let done = false;
    const fin = (v: SessionInvitation | null): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        sock.destroy();
      } catch {
        /* đóng được thì tốt */
      }
      resolve(v);
    };
    const timer = setTimeout(() => fin(null), timeoutMs);
    let buf: Buffer = Buffer.alloc(0);
    sock.on("data", (d: Buffer) => {
      buf = Buffer.concat([buf, d]);
      const r = readFrames(buf);
      buf = r.rest;
      if (r.bad) return fin(null);
      for (const f of r.frames) {
        if (f.type === RELAY_MSG.invite) return fin(parseInvitation(f.body));
        if (f.type === RELAY_MSG.response) {
          const code = f.body.length >= 4 ? f.body.readInt32BE(0) : -1;
          if (code !== 0) return fin(null); // máy kia không có trên relay này
        }
        if (f.type === RELAY_MSG.ping) sock.write(frameMessage(RELAY_MSG.pong));
      }
    });
    sock.on("error", () => fin(null));
    sock.on("close", () => fin(null));
    sock.write(frameMessage(RELAY_MSG.connect, bytesField(id)));
  });
}

/**
 * MỞ ỐNG BYTE của một phiên: nối tới địa chỉ phiên rồi `JoinSessionRequest` bằng khoá phiên.
 *
 * Trả một socket THÔ — từ đây trở đi relay chỉ là một cái ống, và lớp gọi bọc TLS của ta lên trên
 * (`secure()`), y hệt đường đục lỗ. Relay không có khoá của lớp đó.
 *
 * Socket này là TCP TRẦN, KHÔNG phải TLS: lời mời chỉ cho ta một chỗ hẹn, không phải một kênh an
 * toàn. Bọc TLS là việc của người gọi, và bỏ bước đó là chở khối trần qua máy người lạ.
 */
export function openRelaySession(
  endpoint: RelayEndpoint,
  inv: SessionInvitation,
  timeoutMs = 10_000,
): Promise<net.Socket | null> {
  return new Promise((resolve) => {
    let done = false;
    const host = inv.host ?? endpoint.host; // rỗng ⇒ chính relay này (đo 23/09)
    const sock = net.connect({ host, port: inv.port });
    const fin = (v: net.Socket | null): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (!v) {
        try {
          sock.destroy();
        } catch {
          /* đóng được thì tốt */
        }
      }
      resolve(v);
    };
    const timer = setTimeout(() => fin(null), timeoutMs);
    let buf: Buffer = Buffer.alloc(0);
    /**
     * 🔴 Đọc bằng `readable` + `read()`, **KHÔNG** bằng `data` — và đây là ràng buộc, không phải
     * sở thích. Gắn `data` là đẩy socket sang chế độ CHẢY, mà ở chế độ đó `unshift` trả byte về
     * rồi chúng **rơi mất**: đo 23/09 — `readableLength` báo đủ 12 byte, nhưng lớp gắn sau nhận
     * được **0**. Thử `pause()` trước khi `unshift` cũng không cứu: `pause()` tường minh khiến
     * việc gắn `data` sau đó KHÔNG mở lại luồng.
     *
     * Ở chế độ đọc thì socket chưa bao giờ chảy, nên byte nằm yên trong đệm tới khi lớp TLS lấy.
     * Đây chính là khuôn Node dùng cho mọi ca nâng cấp giao thức.
     */
    const onReadable = (): void => {
      for (;;) {
        const d = sock.read() as Buffer | null;
        if (d === null) return;
        buf = Buffer.concat([buf, d]);
        const r = readFrames(buf);
        buf = r.rest;
        // 🔴 XỬ TIN TRƯỚC, phán "khung lạ" SAU — thứ tự này cũng là ràng buộc. Ngay sau `Response`
        // là byte của **TLS**, thứ không bao giờ mang magic của relay ⇒ `readFrames` luôn trả
        // `bad: true` kèm chính đám byte đó. Bản đầu kiểm `bad` trước nên nó đóng phiên ngay lúc
        // phiên vừa mở — lane chết ở đúng ca THÀNH CÔNG. Cổng bắt được, mạng thì sẽ không.
        for (const f of r.frames) {
          if (f.type === RELAY_MSG.response) {
            const code = f.body.length >= 4 ? f.body.readInt32BE(0) : -1;
            if (code !== 0) return fin(null);
            // Gỡ trình đọc TRƯỚC khi trả socket: để nó lại là lớp này ăn mất byte đầu của cú bắt
            // tay TLS — một kiểu hỏng câm, TLS chỉ thấy luồng thiếu đầu rồi báo lỗi vô nghĩa.
            sock.off("readable", onReadable);
            if (buf.length) sock.unshift(buf); // byte sau `Response` là của TLS, trả nguyên vẹn
            return fin(sock);
          }
        }
        // Chưa thấy `Response` mà luồng đã lạ ⇒ đây KHÔNG phải relay. Đóng.
        if (r.bad) return fin(null);
      }
    };
    sock.on("readable", onReadable);
    sock.on("error", () => fin(null));
    sock.on("close", () => fin(null));
    sock.on("connect", () => sock.write(frameMessage(RELAY_MSG.joinSession, bytesField(inv.key))));
  });
}
