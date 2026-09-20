/**
 * RELAY — tầng 4 của chồng kết nối (plan/24 §1 ⑨ · §1c · §7 ⑧), CỦA ZEMORY, học cơ chế relay v1 của
 * Syncthing (user chốt 2026-09-21: *"dùng cơ chế của syncthing để nối giữa các máy cài zemory, chứ
 * không phải dùng Syncthing"*).
 *
 * Nó giải đúng MỘT ca, và là ca thường gặp nhất đo được (`§6d`, 15/09): hai máy ở hai mạng, cả hai
 * đầu kín NAT, không bên nào gọi vào được. Không có bên thứ ba có địa chỉ công khai thì KHÔNG có
 * cách nào nối hai đầu như vậy — đó là tính chất của định tuyến IP, không phải thiếu sót của lớp kênh.
 *
 * Ba vai, cùng một khung `<kiểu><độ dài><thân>` của `wire.ts`:
 *   · máy NGHE  — `join` rồi giữ kết nối thường trực tới relay (hộp thư của nó);
 *   · máy GỌI   — `connect <deviceId>`; relay phát `invite {key}` cho CẢ HAI;
 *   · hai đầu   — mỗi bên mở MỘT kết nối mới, gửi `session {key}`; relay ghép đôi theo `key`
 *                 rồi `pipe()` hai socket vào nhau và THÔI đọc — từ đây nó là ống câm.
 *
 * 🔴 Bắt tay TLS + chứng minh cùng chìa chạy BÊN TRONG ống đó (`runSession` y nguyên, không sửa một
 * dòng). Relay thấy: IP hai đầu · device ID (chuỗi công khai) · lưu lượng. Relay KHÔNG thấy: nội dung
 * (TLS 1.3 hai chiều) và cũng chẳng có gì để giải mã vì khối vốn đã `.enc` bằng chìa share. Đúng
 * điều 7: không byte dữ liệu nào ra khỏi vòng mã hoá. Cổng `p2p-relay` có ca ÂM canh đúng điều này.
 *
 * Không dùng pool relay của Syncthing (`§1c-a`): giao thức khác, ID khác, hạ tầng của họ cho người dùng
 * họ. Relay này chạy bằng `zemory memory channel relay-serve` trên một máy có IP công khai do user cấp.
 */
import { createServer, connect, type Server, type Socket } from "node:net";
import tls, { type TLSSocket } from "node:tls";
import { randomBytes } from "node:crypto";
import { createFrameReader, FRAME_JSON } from "./wire.js";
import { runSessionOn, type SessionOptions, type SyncOutcome } from "./peer.js";

export const DEFAULT_RELAY_PORT = 21039;
/** Hai bên phải mở kết nối phiên trong khoảng này, không thì lời mời hết hạn. */
const INVITE_TTL_MS = 15_000;
/** Bên nghe nối lại relay theo lùi luỹ tiến — mất relay không được làm chết daemon (điều 9). */
const REJOIN_MIN_MS = 5_000;
const REJOIN_MAX_MS = 60_000;

// ── tin điều khiển giữa máy ↔ relay (KHÔNG trộn vào ControlMessage của phiên) ─────────────────────
type RelayMsg =
  | { t: "join"; deviceId: string }
  | { t: "joined" }
  | { t: "connect"; deviceId: string }
  | { t: "invite"; key: string; deviceId: string }
  | { t: "session"; key: string }
  /** Relay đã ghép hai đầu — TỪ BYTE KẾ TIẾP là TLS của đầu kia. Hai đầu chờ tin này rồi mới bật TLS. */
  | { t: "paired" }
  | { t: "error"; reason: string };

function enc(m: RelayMsg): Buffer {
  const body = Buffer.from(JSON.stringify(m), "utf8");
  const head = Buffer.alloc(5);
  head.writeUInt8(FRAME_JSON, 0);
  head.writeUInt32BE(body.length, 1);
  return Buffer.concat([head, body]);
}
function parse(body: Buffer): RelayMsg | null {
  try {
    const m = JSON.parse(body.toString("utf8")) as RelayMsg;
    return m && typeof m.t === "string" ? m : null;
  } catch {
    return null;
  }
}
const normId = (s: string): string => s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

/** Đọc từng tin JSON từ một socket; ném khung hỏng là đóng, không đoán. */
function onMessages(sock: Socket, fn: (m: RelayMsg) => void, onBad: (why: string) => void): void {
  const read = createFrameReader();
  sock.on("data", (d: Buffer) => {
    let frames;
    try {
      frames = read(d);
    } catch (e) {
      return onBad(e instanceof Error ? e.message : "khung hỏng");
    }
    for (const f of frames) {
      if (f.kind !== FRAME_JSON) return onBad("relay chỉ nhận tin điều khiển");
      const m = parse(f.body);
      if (!m) return onBad("tin không đọc được");
      fn(m);
    }
  });
}

// ── MÁY CHỦ RELAY ─────────────────────────────────────────────────────────────────────────────────
export interface RelayServer {
  port: number;
  /** Số máy đang chờ (đã `join`). */
  waiting: () => number;
  close: () => void;
}
export interface RelayServeOptions {
  port: number;
  host?: string;
  log?: (msg: string) => void;
  /**
   * CHỈ cho cổng test: mọi byte relay chuyển tiếp giữa hai đầu đi qua đây. Ca ÂM dùng nó để chứng
   * minh relay không nhìn thấy plaintext nào của phiên (mọi thứ sau khi ghép đôi là TLS).
   */
  observe?: (bytes: Buffer) => void;
}

/** Chạy relay. Không giữ trạng thái gì ngoài RAM: relay chết là hết, không có gì để rò. */
export function serveRelay(o: RelayServeOptions): Promise<RelayServer> {
  const log = o.log ?? (() => {});
  /** Máy đang chờ, theo device ID chuẩn hoá → socket điều khiển của nó. */
  const waiting = new Map<string, Socket>();
  /** Lời mời đang mở: key → hai đầu đã tới (chờ đủ hai rồi ghép). */
  const pendingSessions = new Map<string, { socks: Socket[]; timer: NodeJS.Timeout }>();

  const pair = (a: Socket, b: Socket): void => {
    // Từ đây relay là ỐNG CÂM: gỡ mọi listener đọc tin, chỉ chuyển byte. `pipe` hai chiều; một bên
    // đóng thì bên kia đóng theo — không để một nửa ống treo mãi.
    a.removeAllListeners("data");
    b.removeAllListeners("data");
    // 🔴 Báo `paired` TRƯỚC khi nối ống. Bản đầu không có bước này: bên gọi bật TLS ngay sau `session`,
    // ClientHello (kind 0x16) tới lúc relay còn đọc khung ⇒ bị nuốt làm một khung dở và cổng TREO.
    a.write(enc({ t: "paired" }));
    b.write(enc({ t: "paired" }));
    const tap = (s: Socket, to: Socket): void => {
      s.on("data", (d: Buffer) => {
        o.observe?.(d);
        to.write(d);
      });
      s.on("end", () => to.end());
      s.on("error", () => to.destroy());
      s.on("close", () => to.destroy());
    };
    tap(a, b);
    tap(b, a);
    a.resume();
    b.resume();
  };

  return new Promise((resolve, reject) => {
    const srv: Server = createServer((sock) => {
      sock.setNoDelay(true);
      let joinedAs: string | null = null;
      const drop = (why: string): void => {
        try {
          sock.write(enc({ t: "error", reason: why }));
        } catch {
          /* đang chết thì thôi */
        }
        sock.destroy();
      };
      onMessages(
        sock,
        (m) => {
          if (m.t === "join") {
            const id = normId(m.deviceId);
            if (!id) return drop("thiếu device ID");
            waiting.get(id)?.destroy(); // máy đó nối lại ⇒ bản cũ là xác, bỏ
            waiting.set(id, sock);
            joinedAs = id;
            sock.write(enc({ t: "joined" }));
            log(`[relay] ${m.deviceId.slice(0, 11)}… đang chờ (${waiting.size} máy)`);
            return;
          }
          if (m.t === "connect") {
            const target = waiting.get(normId(m.deviceId));
            if (!target) return drop("máy kia không đang chờ ở relay này");
            const key = randomBytes(32).toString("base64");
            const timer = setTimeout(() => {
              const p = pendingSessions.get(key);
              if (!p) return;
              pendingSessions.delete(key);
              for (const s of p.socks) s.destroy();
              log(`[relay] lời mời hết hạn — một đầu không mở phiên trong ${INVITE_TTL_MS / 1000}s`);
            }, INVITE_TTL_MS);
            timer.unref();
            pendingSessions.set(key, { socks: [], timer });
            target.write(enc({ t: "invite", key, deviceId: m.deviceId }));
            sock.write(enc({ t: "invite", key, deviceId: m.deviceId }));
            log(`[relay] mời phiên cho ${m.deviceId.slice(0, 11)}…`);
            return;
          }
          if (m.t === "session") {
            const p = pendingSessions.get(m.key);
            if (!p) return drop("phiên không tồn tại hoặc đã hết hạn");
            p.socks.push(sock);
            if (p.socks.length === 2) {
              clearTimeout(p.timer);
              pendingSessions.delete(m.key);
              const [a, b] = p.socks;
              pair(a, b);
              log("[relay] đã ghép hai đầu — từ đây chỉ chuyển byte");
            }
            return;
          }
          drop(`tin lạ: ${m.t}`);
        },
        drop,
      );
      sock.on("close", () => {
        if (joinedAs && waiting.get(joinedAs) === sock) waiting.delete(joinedAs);
      });
      sock.on("error", () => {
        /* đã có close */
      });
    });
    srv.once("error", reject);
    srv.listen(o.port, o.host ?? "0.0.0.0", () => {
      const a = srv.address();
      const port = typeof a === "object" && a ? a.port : o.port;
      log(`[relay] đang nghe cổng ${port}`);
      resolve({
        port,
        waiting: () => waiting.size,
        close: () => {
          for (const s of waiting.values()) s.destroy();
          for (const p of pendingSessions.values()) {
            clearTimeout(p.timer);
            for (const s of p.socks) s.destroy();
          }
          try {
            srv.close();
          } catch {
            /* đóng được thì tốt */
          }
        },
      });
    });
  });
}

// ── PHÍA MÁY ──────────────────────────────────────────────────────────────────────────────────────
export interface RelayAddress {
  host: string;
  port: number;
}

/** Mở kết nối PHIÊN tới relay và bọc TLS lên đó. Bên nghe là TLS server, bên gọi là TLS client. */
function openSession(relay: RelayAddress, key: string, o: SessionOptions, initiator: boolean): Promise<SyncOutcome> {
  return new Promise((resolve) => {
    const fail = (error: string): void => resolve({ peerDeviceId: null, sentBlocks: 0, receivedBlocks: 0, bytesSent: 0, error });
    const raw = connect({ host: relay.host, port: relay.port }, () => {
      raw.setNoDelay(true);
      raw.write(enc({ t: "session", key }));
    });
    raw.on("error", (e: NodeJS.ErrnoException) => fail(e.code ?? e.message));
    // CHỜ `paired` rồi mới bật TLS — không thì ClientHello tới trước khi relay thôi đọc khung.
    const read = createFrameReader();
    const onData = (d: Buffer): void => {
      let frames;
      try {
        frames = read(d);
      } catch (e) {
        return fail(e instanceof Error ? e.message : "khung hỏng");
      }
      for (let i = 0; i < frames.length; i++) {
        const m = frames[i].kind === FRAME_JSON ? parse(frames[i].body) : null;
        if (m?.t === "error") return fail(`relay: ${m.reason}`);
        if (m?.t !== "paired") continue;
        raw.removeListener("data", onData);
        // Byte dư sau `paired` (nếu relay đã kịp chuyển byte của đầu kia) trả lại cho TLS đọc.
        const rest = frames.slice(i + 1);
        if (rest.length) raw.unshift(Buffer.concat(rest.map((f) => Buffer.concat([Buffer.from([f.kind, 0, 0, 0, 0]), f.body]))));
        startTls();
        return;
      }
    };
    raw.on("data", onData);
    const startTls = (): void => {
      const tlsOpts = {
        key: o.identity.keyPem,
        cert: o.identity.certPem,
        rejectUnauthorized: false, // vân tay kiểm trong runSession, không nhờ CA
        minVersion: "TLSv1.3" as const,
      };
      if (initiator) {
        const sock = tls.connect({ ...tlsOpts, socket: raw }, () => {
          void runSessionOn(sock, o, true).then(resolve);
        });
        sock.on("error", (e: NodeJS.ErrnoException) => fail(e.code ?? e.message));
      } else {
        const sock: TLSSocket = new tls.TLSSocket(raw, { ...tlsOpts, isServer: true, requestCert: true });
        sock.once("secure", () => {
          void runSessionOn(sock, o, false).then(resolve);
        });
        sock.on("error", (e: NodeJS.ErrnoException) => fail(e.code ?? e.message));
      }
    };
  });
}

export interface RelayJoinHandle {
  stop: () => void;
  /** Đang giữ kết nối thường trực tới relay không. */
  connected: () => boolean;
}

/**
 * Bên NGHE: giữ một kết nối thường trực tới relay để máy khác gọi vào được dù mình sau NAT.
 * Mỗi `invite` ⇒ mở một phiên mới (song song, không chặn hộp thư). Mất relay ⇒ nối lại theo lùi
 * luỹ tiến; không bao giờ ném ra ngoài — relay là lớp PHỤ (điều 9).
 */
export function joinRelay(
  relay: RelayAddress,
  o: SessionOptions,
  hooks: { log?: (m: string) => void; onSession?: (r: SyncOutcome) => void } = {},
): RelayJoinHandle {
  const log = hooks.log ?? (() => {});
  let stopped = false;
  let ctl: Socket | null = null;
  let connected = false;
  let backoff = REJOIN_MIN_MS;
  let timer: NodeJS.Timeout | null = null;

  const schedule = (): void => {
    if (stopped) return;
    timer = setTimeout(dial, backoff);
    timer.unref();
    backoff = Math.min(REJOIN_MAX_MS, backoff * 2);
  };
  const dial = (): void => {
    if (stopped) return;
    const s = connect({ host: relay.host, port: relay.port }, () => {
      s.setNoDelay(true);
      s.write(enc({ t: "join", deviceId: o.identity.deviceId }));
    });
    ctl = s;
    onMessages(
      s,
      (m) => {
        if (m.t === "joined") {
          connected = true;
          backoff = REJOIN_MIN_MS;
          log(`[channel] đang chờ ở relay ${relay.host}:${relay.port}`);
          return;
        }
        if (m.t === "invite") {
          log(`[channel] relay mời phiên từ ${m.deviceId.slice(0, 11)}…`);
          void openSession(relay, m.key, o, false).then((r) => hooks.onSession?.(r));
          return;
        }
        if (m.t === "error") log(`[channel] relay từ chối: ${m.reason}`);
      },
      (why) => {
        log(`[channel] relay: ${why}`);
        s.destroy();
      },
    );
    s.on("error", (e: NodeJS.ErrnoException) => {
      if (!connected) log(`[channel] không tới được relay ${relay.host}:${relay.port}: ${e.code ?? e.message}`);
    });
    s.on("close", () => {
      connected = false;
      ctl = null;
      schedule();
    });
  };
  dial();
  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      ctl?.destroy();
    },
    connected: () => connected,
  };
}

/**
 * Bên GỌI: xin relay ghép với `targetDeviceId`. Dùng khi gọi thẳng đã trượt — thứ tự
 * *thẳng trước, relay sau* là của `§1c` (thử rẻ trước, rơi dần xuống).
 */
export function connectViaRelay(relay: RelayAddress, targetDeviceId: string, o: SessionOptions): Promise<SyncOutcome> {
  return new Promise((resolve) => {
    const fail = (error: string): void => resolve({ peerDeviceId: null, sentBlocks: 0, receivedBlocks: 0, bytesSent: 0, error });
    let settled = false;
    const once = (r: SyncOutcome): void => {
      if (settled) return;
      settled = true;
      resolve(r);
    };
    const ctl = connect({ host: relay.host, port: relay.port }, () => {
      ctl.setNoDelay(true);
      ctl.write(enc({ t: "connect", deviceId: targetDeviceId }));
    });
    onMessages(
      ctl,
      (m) => {
        if (m.t === "invite") {
          ctl.end(); // hộp thư đã xong việc; phiên đi kết nối riêng
          void openSession(relay, m.key, o, true).then(once);
          return;
        }
        if (m.t === "error") {
          ctl.destroy();
          once({ peerDeviceId: null, sentBlocks: 0, receivedBlocks: 0, bytesSent: 0, error: `relay: ${m.reason}` });
        }
      },
      (why) => {
        ctl.destroy();
        once({ peerDeviceId: null, sentBlocks: 0, receivedBlocks: 0, bytesSent: 0, error: `relay: ${why}` });
      },
    );
    ctl.on("error", (e: NodeJS.ErrnoException) => once(failOutcome(e.code ?? e.message)));
    function failOutcome(error: string): SyncOutcome {
      return { peerDeviceId: null, sentBlocks: 0, receivedBlocks: 0, bytesSent: 0, error: `relay: ${error}` };
    }
    void fail;
  });
}
