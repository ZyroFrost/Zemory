/**
 * DÒ TOÀN CẦU — tầng 3 của `plan/24 §1c`, đúng giao thức **global discovery v3** của Syncthing.
 *
 * 🔴 **Đây là mảnh mang nhãn "✅ LẤY — CỐT LÕI" từ 2026-09-13 mà tới 22/09 vẫn `0 dòng`** (bảng đo
 * `§6d` ghi đúng con số đó). Chín ngày mang nhãn đã-lấy mà chưa ai viết, trong khi các phiên đi
 * dựng relay (rồi gỡ), mã chở địa chỉ (rồi gỡ), đục lỗ — toàn đồ tự nghĩ. Thứ chặn nó là một dòng
 * **do agent tự viết** ở `§1c-a` (*"KHÔNG dùng cụm công khai của Syncthing"*), không phải user chốt.
 * User đã yêu cầu dùng chính cách của Syncthing **cả chục lần**. Dòng đó nay bị đảo.
 *
 * ── CƠ CHẾ (nguyên văn giao thức của họ) ───────────────────────────────────────────────────
 * · **Đăng ký:** `POST <server>/v2/` body `{"addresses":["tcp://0.0.0.0:<cổng>"]}`, **xác thực bằng
 *   CHÍNH chứng chỉ client** (mTLS) — server tự suy device ID ra từ cert, nên **không tài khoản,
 *   không đăng ký, không mật khẩu**. Khai `0.0.0.0` ⇒ **server lấy IP NGUỒN của gói**, tức một lời
 *   gọi vừa đăng địa chỉ vừa cho ta biết địa chỉ công khai của chính mình.
 * · **Tra:** `GET <server>/v2/?device=<ID>` → `200 {"addresses":[…]}` · `404` chưa ai đăng.
 * · `Reannounce-After` (giây) nói nhịp kế; `429` là quá nhịp.
 *
 * ── VÌ SAO DÙNG ĐƯỢC VỚI ID CỦA TA ────────────────────────────────────────────────────────
 * Danh tính của zemory **đã là scheme của họ** (`§1b ①` lấy "gần như nguyên xi"):
 * `device ID = base32(SHA-256 của DER)`. Server chỉ băm cert ta xuất trình rồi lưu — nó không cần
 * biết ta là app nào. Khác duy nhất là **cách nhóm khi hiển thị**: ta nhóm 7+1, Syncthing nhóm
 * 13+1 thành 4 cụm 14 ký tự. Nên trên dây phải đổi sang dạng canonical của họ, còn trong nhà ta
 * giữ nguyên dạng của ta — `toSyncthingId` là chỗ duy nhất biết chuyện đó.
 *
 * **Thoả `§1a-0`:** cụm server công khai, miễn phí, **không tài khoản** — user không phải đăng ký
 * gì, không phải nuôi máy nào. Đó chính là phép thử mà relay tự-host đã trượt.
 *
 * **Điều 7:** server giữ `ID → địa chỉ`, **0 byte dữ liệu** — cùng lý lẽ đã chốt ở `§1c-a`, và nhẹ
 * hơn hẳn Drive (đang giữ trọn kho dạng `.enc`).
 *
 * **Fail-open tuyệt đối** (điều 9): server im, mạng chặn, trả rác — lane này trả rỗng và mọi đường
 * cũ (dò LAN · bảng thư mục chung · địa chỉ trong mã) chạy y nguyên. Nó THÊM một đường.
 */
import https from "node:https";
import { luhn32, normalizeDeviceId, type ChannelIdentity } from "./identity.js";

/**
 * Cụm server công khai của Syncthing.
 *
 * Nhiều nhà để một server chết không kéo cả lane; thứ tự là thứ tự thử. Ghim vân tay server KHÔNG
 * làm ở đây: ta không xác thực server bằng CA (`rejectUnauthorized: false`) vì thứ ta gửi lên là
 * **địa chỉ công khai của chính mình** — không có bí mật nào để mất nếu nói chuyện nhầm máy, và
 * địa chỉ nhận về luôn phải qua bắt tay TLS + chìa chung mới dùng được.
 */
export const PUBLIC_DISCOVERY = [
  "https://discovery.syncthing.net/v2/",
  "https://discovery-v4.syncthing.net/v2/",
  "https://discovery-v6.syncthing.net/v2/",
] as const;

/** Nhịp đăng lại mặc định khi server không nói `Reannounce-After`. */
export const DEFAULT_REANNOUNCE_S = 1800;

/** Trạng thái lượt đăng gần nhất — đủ để quyết có đăng lại hay không, không hơn. */
export interface AnnounceMark {
  ok: boolean;
  /** Mốc tới lượt đăng kế, theo `Reannounce-After` của server. */
  nextAt: number;
  /** Địa chỉ ngoài lúc đăng. `null`/thiếu = chưa đo được ⇒ mất phép bắt lúc đổi, không sao. */
  host?: string | null;
}

/**
 * Tới lượt đăng lại chưa?
 *
 * 🔴 **Đổi địa chỉ thì đăng NGAY, không đợi hết nhịp** — đây là chỗ quyết định lane này sống hay
 * chết, nên nó tách ra thành hàm THUẦN để có cổng soi được. Nhịp server nói là ~63 phút (đo 22/09:
 * `Reannounce-After: 3774`), mà địa chỉ ngoài của máy này đổi **BỐN lần trong chưa tới hai ngày**.
 * Đi đúng nhịp thôi thì có những quãng cả tiếng cụm dò trả về một địa chỉ đã đổi chủ — tức tái
 * diễn đúng bệnh của mã-chở-địa-chỉ mà lane này sinh ra để chữa.
 *
 * Chỉ tính là "đổi" khi lượt trước THÀNH CÔNG và cả hai địa chỉ đều biết: một lượt trước đã trượt
 * thì `nextAt` vốn đã ngắn (1 phút), còn `null` là *chưa đo được* chứ không phải *đã đổi* — coi nó
 * là đổi thì mỗi nhịp 60 giây lại nện cụm công khai một lần và ăn `429`.
 */
export function shouldAnnounceNow(mark: AnnounceMark | null, host: string | null, now: number): boolean {
  if (!mark) return true; // chưa đăng lần nào
  if (mark.ok && host && mark.host && host !== mark.host) return true; // đã đổi địa chỉ
  return now >= mark.nextAt;
}

/**
 * Đổi device ID của ta sang dạng CANONICAL của Syncthing.
 *
 * Hai bước RIÊNG BIỆT, đừng gộp — đây đúng là chỗ tôi làm sai lần đầu:
 * 1. *luhnify*: cắt 52 ký tự thô thành 4 khúc 13, mỗi khúc gắn một chữ số kiểm → **nối LIỀN**
 *    thành 56 ký tự. Chữ số kiểm tính theo khúc 13, KHÔNG theo khúc 7.
 * 2. *chunkify*: chèn gạch sau **mỗi 7** ký tự của chuỗi 56 đó → 8 cụm 7.
 *
 * Nhóm-13 và nhóm-7 là hai phép khác nhau chồng lên nhau; gộp thành "4 cụm 14" ra đúng 56 ký tự
 * dữ liệu nên **tra vẫn trúng** (server bóc gạch trước khi so) — thứ hỏng là chuỗi in ra bề mặt:
 * dán nó vào một Syncthing thật thì trượt. Đo 22/09: bản 4-cụm-14 announce `204`, lookup `200`,
 * vẫn ra đúng địa chỉ — tức gate phải soi **hình dạng chuỗi**, vì mạng không nói cho ta biết.
 *
 * Ta nhóm 7+1 (chữ số kiểm mỗi 7) cho dễ chép; họ nhóm 13+1 rồi mới cắt 7. Cùng một phép băm,
 * khác cách trình bày — chỗ duy nhất được biết chuyện này là hàm này, đừng rải ra nơi khác.
 */
export function toSyncthingId(deviceId: string): string | null {
  const raw = normalizeDeviceId(deviceId);
  if (raw.length !== 52) return null; // không phải ID của scheme này ⇒ không đoán
  const luhnified = (raw.match(/.{13}/g) ?? []).map((g) => g + luhn32(g)).join("");
  if (luhnified.length !== 56) return null;
  return (luhnified.match(/.{7}/g) ?? []).join("-");
}

interface HttpOut {
  status: number;
  body: string;
  headers: Record<string, string | string[] | undefined>;
}

/** Một lời gọi HTTPS mang chứng chỉ client. Không bao giờ ném — lỗi nào cũng thành `status: 0`. */
function call(
  url: string,
  o: { method: "GET" | "POST"; identity?: ChannelIdentity; body?: string; timeoutMs: number },
): Promise<HttpOut> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (r: HttpOut): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(r);
    };
    const timer = setTimeout(() => done({ status: 0, body: "", headers: {} }), o.timeoutMs);
    try {
      const u = new URL(url);
      const req = https.request(
        {
          host: u.hostname,
          port: u.port || 443,
          path: u.pathname + u.search,
          method: o.method,
          // Chứng chỉ client CHÍNH LÀ danh tính — đây là chỗ thay cho tài khoản/mật khẩu.
          key: o.identity?.keyPem,
          cert: o.identity?.certPem,
          // Không nhờ CA phán server: xem chú thích ở `PUBLIC_DISCOVERY`.
          rejectUnauthorized: false,
          headers: o.body ? { "content-type": "application/json", "content-length": Buffer.byteLength(o.body) } : {},
        },
        (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (c: string) => {
            // Trần đọc: một server lạ trả vô hạn không được quyền ăn hết RAM.
            if (body.length < 64 * 1024) body += c;
          });
          res.on("end", () => done({ status: res.statusCode ?? 0, body, headers: res.headers }));
        },
      );
      req.on("error", () => done({ status: 0, body: "", headers: {} }));
      if (o.body) req.write(o.body);
      req.end();
    } catch {
      done({ status: 0, body: "", headers: {} });
    }
  });
}

export interface AnnounceResult {
  /** Có server nào nhận không. `false` = lane này im, KHÔNG phải lỗi. */
  ok: boolean;
  /** Giây tới lượt đăng lại, theo `Reannounce-After` của server. */
  reannounceAfterS: number;
  /** Server nào đã nhận — để bề mặt nói được nó đang dựa vào đâu. */
  server?: string;
  /** Mã trạng thái của từng server, cho chẩn đoán. `0` = không nối được. */
  tried: { server: string; status: number }[];
}

/**
 * Đăng địa chỉ của máy này lên cụm dò toàn cầu.
 *
 * Khai `tcp://0.0.0.0:<cổng>` CÓ CHỦ ĐÍCH: server thay `0.0.0.0` bằng **IP nguồn** của chính gói
 * này, nên ta không cần biết trước địa chỉ công khai của mình — một lời gọi làm cả hai việc. Đây là
 * chỗ giao thức của họ gọn hơn hẳn đường tự mò (đo STUN riêng rồi mới đăng).
 */
export async function announceGlobal(o: {
  identity: ChannelIdentity;
  port: number;
  /**
   * Địa chỉ RELAY đang chờ (`relay://…`), nếu máy này đã tham gia một relay.
   *
   * 🔴 Đây là mảnh làm tầng 4 CHẠY ĐƯỢC, không phải thông tin thêm: máy kia phải biết ta đang chờ
   * ở relay NÀO thì mới xin phiên đúng chỗ. Không đăng nó thì tầng relay dựng xong vẫn vô dụng —
   * hai máy cùng ở trong pool mà không bên nào biết tìm bên nào.
   */
  relays?: readonly string[];
  servers?: readonly string[];
  timeoutMs?: number;
}): Promise<AnnounceResult> {
  const servers = o.servers ?? PUBLIC_DISCOVERY;
  const body = JSON.stringify({
    addresses: [`tcp://0.0.0.0:${o.port}`, ...(o.relays ?? []).filter((r) => r.startsWith("relay://"))],
  });
  const tried: { server: string; status: number }[] = [];
  for (const server of servers) {
    const r = await call(server, { method: "POST", identity: o.identity, body, timeoutMs: o.timeoutMs ?? 8000 });
    tried.push({ server, status: r.status });
    // 204 là câu trả lời đúng của giao thức; nhận cả 2xx khác cho server đời khác.
    if (r.status >= 200 && r.status < 300) {
      const raw = r.headers["reannounce-after"];
      const secs = Number(Array.isArray(raw) ? raw[0] : raw);
      return {
        ok: true,
        reannounceAfterS: Number.isFinite(secs) && secs > 0 ? secs : DEFAULT_REANNOUNCE_S,
        server,
        tried,
      };
    }
  }
  return { ok: false, reannounceAfterS: DEFAULT_REANNOUNCE_S, tried };
}

/**
 * Tra địa chỉ HIỆN TẠI của một máy theo device ID.
 *
 * Trả danh sách `host:port` đã bóc khỏi dạng `tcp://…` của họ. Rỗng = chưa ai đăng, hoặc server im
 * — hai ca đó **không phân biệt được ở tầng này** và cũng không cần: người gọi chỉ thử đường khác.
 */
export interface GlobalAddresses {
  /** Địa chỉ gọi THẲNG (`host:port`), đã bỏ dải riêng. */
  direct: string[];
  /** Địa chỉ RELAY nguyên văn (`relay://…`) — máy kia đang chờ ở đó. */
  relays: string[];
}

/**
 * Tra và PHÂN LOẠI địa chỉ của một máy.
 *
 * 🔴 Vì sao trả cả hai trong MỘT lời gọi: cụm dò trả cùng một danh sách cho cả hai loại, nên tách
 * thành hai hàm là hai vòng mạng cho cùng một câu trả lời — và tệ hơn, là hai chỗ để luật phân loại
 * lệch nhau. Người gọi tự chọn thử cái nào trước.
 */
export async function lookupGlobalAddresses(
  deviceId: string,
  o: { identity?: ChannelIdentity; servers?: readonly string[]; timeoutMs?: number } = {},
): Promise<GlobalAddresses> {
  const raw = await lookupGlobalRaw(deviceId, o);
  return {
    direct: [...new Set(raw.map((a) => parseWireAddress(a)).filter((a): a is string => Boolean(a)))],
    // Chỉ giữ dạng `relay://` — lọc thật sự nằm ở `parseRelayUrl` của lớp relay, đừng đoán ở đây.
    relays: [...new Set(raw.filter((a) => a.trim().startsWith("relay://")))],
  };
}

/** Như `lookupGlobalAddresses` nhưng chỉ lấy đường gọi THẲNG — giữ cho nơi gọi cũ. */
export async function lookupGlobal(
  deviceId: string,
  o: { identity?: ChannelIdentity; servers?: readonly string[]; timeoutMs?: number } = {},
): Promise<string[]> {
  return (await lookupGlobalAddresses(deviceId, o)).direct;
}

/** Danh sách địa chỉ THÔ đúng như cụm dò trả về — chưa lọc, chưa phân loại. */
async function lookupGlobalRaw(
  deviceId: string,
  o: { identity?: ChannelIdentity; servers?: readonly string[]; timeoutMs?: number } = {},
): Promise<string[]> {
  const id = toSyncthingId(deviceId);
  if (!id) return [];
  const servers = o.servers ?? PUBLIC_DISCOVERY;
  const timeoutMs = o.timeoutMs ?? 5000;
  // 🔴 SONG SONG, không tuần tự — và đây là ràng buộc về THỜI GIAN, không phải tối ưu cho vui.
  // Người gọi là `/channel-sync`, vốn có trần 25 giây cho CẢ lượt (kể cả bắt tay với mọi ứng viên).
  // Tuần tự 3 server × trần mỗi cái = một con số không ai hứa được, và nó ăn hết ngân sách trước
  // khi kịp gọi tới máy nào. Tra thì server nào trả lời trước cũng dùng được như nhau — khác hẳn
  // ĐĂNG KÝ, nơi thứ tự có nghĩa (`discovery.syncthing.net` chỉ-đọc, trả `403` khi đăng).
  const answers = await Promise.all(
    servers.map(async (server) => {
      const r = await call(`${server}?device=${encodeURIComponent(id)}`, {
        method: "GET",
        identity: o.identity,
        timeoutMs,
      });
      if (r.status !== 200) return [];
      try {
        const j = JSON.parse(r.body) as { addresses?: unknown };
        const list = Array.isArray(j.addresses) ? j.addresses : [];
        // THÔ thật — KHÔNG lọc ở đây. Bản đầu gọi `parseWireAddress` ngay chỗ này, và nó âm thầm
        // vứt mọi `relay://`: tầng relay sẽ không bao giờ thấy máy kia đang chờ ở relay nào, mà
        // cũng không có lỗi nào nổ. Phân loại là việc của `lookupGlobalAddresses`, đúng một chỗ.
        return list.map((a) => String(a).trim()).filter(Boolean);
      } catch {
        return []; // server trả rác ⇒ coi như im, các server kia vẫn tính
      }
    }),
  );
  // Gộp theo thứ tự server rồi bỏ trùng: hai server thường trả CÙNG một địa chỉ, và một máy có
  // thể đăng nhiều địa chỉ (nhiều đường ra) — giữ hết, người gọi thử lần lượt.
  return [...new Set(answers.flat())];
}

/**
 * `tcp://1.2.3.4:22000` → `1.2.3.4:22000`. Trả `null` cho thứ không dùng được.
 *
 * Bỏ **địa chỉ dải riêng**: máy kia có thể đăng cả địa chỉ LAN của nó (giao thức cho phép), mà một
 * địa chỉ LAN của máy khác mạng là vô dụng **và** làm người đọc tin nhầm — cùng lý lẽ với bảng địa
 * chỉ ở `presence.ts`. IPv6 bỏ ở bản này: lớp nối đang đi IPv4 (`family: 4`).
 */
export function parseWireAddress(wire: string): string | null {
  const m = /^(?:tcp|tcp4|quic)?:?\/*\[?([0-9.]+)\]?:(\d{1,5})$/.exec(wire.trim());
  if (!m) return null;
  const [, host, portText] = m;
  const port = Number(portText);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return null;
  const p = host.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  const [a, b] = p;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return null;
  if (a === 172 && b >= 16 && b <= 31) return null;
  if (a === 192 && b === 168) return null;
  if (a === 169 && b === 254) return null;
  if (a === 100 && b >= 64 && b <= 127) return null; // CGNAT — không gọi vào được
  return `${host}:${port}`;
}
