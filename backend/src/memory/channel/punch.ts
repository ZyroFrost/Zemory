/**
 * ĐỤC LỖ NAT — mảnh cuối của Syncthing mà zemory còn thiếu (plan/24 §7 ⑩).
 *
 * Bài toán: hai máy đều sau NAT kín, không bên nào nhận được kết nối vào không mời
 * (đo `§6d`: NAT-PMP câm ở CẢ HAI đầu, UPnP không có). Đục lỗ giải nó bằng cách cho
 * **cả hai cùng gọi RA**: cú gọi ra tự tạo ánh xạ trên NAT của mình, và ánh xạ đó là
 * cái lỗ để gói của máy kia đi vào.
 *
 * ── VÌ SAO HÌNH DẠNG NÀY, chứ không phải hai hình dạng sách vở ──────────────────
 * Đo trên Node 24 / Windows 10 (`§6e` hệ quả 1):
 *   · **nghe trên cổng P VÀ gọi ra từ chính P cùng lúc ⇒ `EADDRINUSE`.** Node không
 *     phơi `SO_REUSEADDR` cho TCP, nên hình dạng *listener + đục lỗ cùng cổng* —
 *     hình dạng tỉ lệ cao nhất — **viết không được**.
 *   · **TCP simultaneous open ⇒ CHƯA ĐO ĐƯỢC** (loopback trả RST ngay, phép đo vô
 *     hiệu). Không dựng thiết kế trên một thứ chưa ai đo.
 *   · **bắn lại từ cùng cổng nguồn sau một SYN trượt ⇒ 3/3 được.**
 * Còn lại đúng một hình dạng dùng được cả ba dữ kiện: **BẮN rồi NGHE, SO LE PHA.**
 * Mỗi vòng chia hai nửa — nửa *bắn* gọi ra từ cổng P (cú SYN đó đục lỗ, trượt cũng
 * không sao), nửa *nghe* bind đúng P để nhận SYN của máy kia đi qua cái lỗ vừa đục.
 * Không lúc nào cổng bị hai kẻ giữ ⇒ không `EADDRINUSE`.
 *
 * 🔴 **SO LE PHA là thứ làm nó chạy, không phải chi tiết vặt.** Hai máy chạy CÙNG
 * lịch thì hai nửa *bắn* trùng nhau và hai nửa *nghe* trùng nhau ⇒ một cú gọi không
 * bao giờ gặp một lớp nghe. Nên pha suy TẤT ĐỊNH từ hai vân tay: bên có device ID
 * **nhỏ hơn** bắn ở nửa ĐẦU, bên kia nghe ở nửa đầu. Cả hai tự tính ra cùng một
 * cách chia từ dữ kiện đã có — **không thêm một tin thương lượng nào**.
 *
 * ── Giữ nguyên mọi thứ đã có ────────────────────────────────────────────────────
 * Lớp này chỉ lo **mở được một socket TCP**. Xong rồi thì:
 *   bên NHẬN ⇒ TLS server · bên GỌI ⇒ TLS client · rồi `runSessionOn` NGUYÊN VẸN.
 * Không bản sao thứ hai của giao thức phiên (HP điều 1), không đổi định dạng khối,
 * không đụng merge/watermark (`§8` phi-mục-tiêu).
 *
 * **0 dependency mới** (HP điều 2): `node:net` · `node:tls`.
 * **Fail-open** (HP điều 9): hết vòng mà không nối được ⇒ trả lý do rõ, không ném,
 * và mọi đường cũ (cùng mạng · địa chỉ gõ tay) không bị đụng tới.
 */
import net from "node:net";
import tls from "node:tls";
import { normalizeDeviceId, type ChannelIdentity } from "./identity.js";
import { emptyOutcome, runSessionOn, type SessionOptions, type SyncOutcome } from "./peer.js";

/** Một vòng = một nửa bắn + một nửa nghe. 2 giây đủ cho một lượt bắt tay LAN/WAN. */
export const DEFAULT_ROUND_MS = 2000;
/** Mười vòng ≈ 20 giây. Quá mức này thì gần như chắc là NAT đối xứng, không phải kém may. */
export const DEFAULT_ROUNDS = 10;

export interface PunchTarget {
  /** Địa chỉ NGOÀI của máy kia (máy đó tự đo bằng STUN rồi khai). */
  host: string;
  port: number;
  /** Vân tay máy kia — chỉ để báo cho người đọc; thứ GÁC CỬA vẫn là `allowedPeers`. */
  deviceId?: string;
}

export interface PunchOptions extends SessionOptions {
  /** Cổng NỘI dùng để bắn và để nghe. KHÔNG được là cổng daemon đang nghe. */
  localPort: number;
  rounds?: number;
  roundMs?: number;
  /**
   * Nhịp bắn lại TRONG một nửa. Mặc định dày (`RETRY_MS`) cho lượt NGẮN do người vừa bấm;
   * chế độ CHỜ dài thì truyền số lớn hơn — giữ lỗ mở hàng phút không cần bắn dồn dập.
   */
  retryMs?: number;
  /**
   * Dừng giữa đường. Điều kiện để có một CHỖ CHỜ huỷ được: không có nó thì một lượt chờ dài
   * chỉ tắt bằng cách tắt daemon, và người dùng không rút lại được cú bấm của mình.
   */
  shouldStop?: () => boolean;
  /** Báo tiến độ cho bề mặt — đục lỗ mất hàng chục giây, im lặng là bề mặt nói dối. */
  onRound?: (info: { round: number; phase: "ban" | "nghe"; note?: string }) => void;
}

export interface PunchResult extends SyncOutcome {
  /** Cửa nào ăn: ta gọi được, hay ta nhận được. `null` = không vòng nào ăn. */
  won: "goi" | "nhan" | null;
  rounds: number;
}

// Dựng từ `emptyOutcome()` chứ không gõ lại từng trường: hình dạng của `SyncOutcome` có
// đúng MỘT nguồn, nên thêm một bộ đếm ở lớp phiên không để lại chỗ nào trả số thiếu.
const fail = (error: string, rounds: number): PunchResult => ({ ...emptyOutcome(error), won: null, rounds });

/**
 * Ai bắn ở nửa ĐẦU của vòng.
 *
 * Tách thành hàm THUẦN để cổng test soi được luật mà không cần mạng: đây là chỗ mà
 * một đột biến (trả hằng số) làm cả cơ chế chết mà vẫn "chạy" — hai máy cùng pha thì
 * không bao giờ gặp nhau, và triệu chứng chỉ là *"đục lỗ không ăn"*, không phải một lỗi.
 */
export function dialsFirst(myDeviceId: string, peerDeviceId: string): boolean {
  const a = normalizeDeviceId(myDeviceId);
  const b = normalizeDeviceId(peerDeviceId);
  if (!b) return true; // chưa biết máy kia ⇒ cứ bắn trước, còn hơn cả hai cùng nghe
  return a < b;
}

/**
 * Pha của MỘT VÒNG cụ thể — biết máy kia thì cố định, chưa biết thì ĐỔI mỗi vòng.
 *
 * 🔴 Vì sao phải đổi pha khi chưa biết: `dialsFirst` trả `true` cho đối phương rỗng, tức ta bắn
 * ở nửa đầu MỌI vòng. Máy kia biết ta nên pha của nó cố định theo thứ tự ID — và nếu ID nó nhỏ
 * hơn thì nó CŨNG bắn nửa đầu ⇒ hai bên bắn cùng lúc, nghe cùng lúc, **không bao giờ gặp**.
 * Không lỗi nào nổ; triệu chứng duy nhất là *"đục lỗ không ăn"*. Đổi pha theo vòng thì dù pha
 * bên kia cố định kiểu nào, **cứ hai vòng là trùng một lần**.
 *
 * Tách thành hàm THUẦN có chủ đích: đây là luật mà một đột biến làm chết cả cơ chế trong khi mọi
 * thứ vẫn "chạy", nên nó phải soi được **không cần mạng**. Đo đầu-cuối KHÔNG đủ để canh nó —
 * hai bên trôi lệch theo thời gian nên đôi khi vẫn gặp nhau dù pha sai (đo được: đột biến cố
 * định pha vẫn làm cổng đầu-cuối XANH).
 */
export function dialsFirstInRound(myDeviceId: string, peerDeviceId: string, round: number): boolean {
  if (!normalizeDeviceId(peerDeviceId)) return round % 2 === 1;
  return dialsFirst(myDeviceId, peerDeviceId);
}

/**
 * Bọc TLS lên một socket TCP đã mở. Bên nhận là server, bên gọi là client.
 *
 * 🔴 **TRẦN THỜI GIAN Ở ĐÂY LÀ BẮT BUỘC, không phải cẩn thận thừa.** Bắt được lúc dựng
 * cổng: bản đầu không có trần và **test treo quá 7 phút**. Cơ chế: cú gọi của ta nối
 * được đúng lúc lớp nghe bên kia VỪA hết nửa của nó — hệ điều hành đã hoàn tất bắt tay
 * TCP vào hàng chờ trước khi server đóng, nên ta có một socket mở nhưng **bên kia không
 * còn ai đọc nó** ⇒ `tls.connect` chờ một `ServerHello` không bao giờ tới, vô hạn.
 * Đây đúng họ lỗi mà `02_RULES` gọi là treo lặng: không lỗi nào nổ, chỉ là không xong.
 */
/**
 * 🔄 XUẤT RA từ 2026-09-23: lớp RELAY dùng CHUNG hàm này. Phiên relay cũng chỉ là một socket
 * TCP, nên nó phải được bọc bằng ĐÚNG lớp TLS này — viết một bản TLS thứ hai cho relay là mở
 * đường cho hai bản lệch nhau đúng ở chỗ quyết định bảo mật.
 */
export function secureSocket(
  raw: net.Socket,
  // CHỈ đòi thứ thật sự dùng — `PunchOptions` kéo theo `localPort`, thứ vô nghĩa với một phiên
  // relay. Bắt người gọi dựng một trường giả để qua kiểu là cách chữ ký nói dối về phụ thuộc.
  o: { identity: ChannelIdentity },
  asServer: boolean,
  timeoutMs: number,
): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    // Không có CA nào ở đây theo THIẾT KẾ — danh tính là vân tay chứng chỉ, kiểm
    // trong `runSession`. Giống y `connectToPeer`/`serveChannel`, không nới một nấc nào.
    const common = {
      key: o.identity.keyPem,
      cert: o.identity.certPem,
      rejectUnauthorized: false,
      minVersion: "TLSv1.3" as const,
    };
    let settled = false;
    const done = (err: Error | null, sock?: tls.TLSSocket): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) {
        try {
          raw.destroy();
        } catch {
          /* đóng được thì tốt */
        }
        reject(err);
        return;
      }
      resolve(sock as tls.TLSSocket);
    };
    const timer = setTimeout(() => done(new Error("bắt tay TLS hết giờ")), Math.max(1000, timeoutMs));
    if (asServer) {
      const sock = new tls.TLSSocket(raw, { ...common, isServer: true, requestCert: true });
      sock.once("secure", () => done(null, sock));
      sock.once("error", (e) => done(e));
      return;
    }
    const sock = tls.connect({ ...common, socket: raw }, () => done(null, sock));
    sock.once("error", (e) => done(e));
  });
}

/**
 * Cổng vừa nhả ra chưa chắc bind lại được NGAY.
 *
 * 🔴 Đây không phải phòng xa — nó là thứ đo được: cả hai nửa dùng CÙNG một cổng và đổi
 * vai mỗi ~350 ms, nên Windows thường xuyên còn giữ socket cũ một nhịp và bind kế tiếp
 * nhận `EADDRINUSE` **tạm thời**. Bản đầu coi đó là "nửa này trượt" rồi bỏ cả nửa ⇒ lượt
 * đục lỗ mất rất nhiều cơ hội, và cổng test dao động **474 ms ↔ 5.635 ms** giữa các lượt
 * (một cổng chập chờn thì tệ hơn không có cổng). Nay thử lại trong PHẠM VI cùng nửa đó.
 *
 * Phân biệt hai loại `EADDRINUSE`: **tạm** (vừa nhả, thử lại là được) và **thật**
 * (daemon của chính máy này đang giữ cổng — thử lại bao nhiêu cũng vậy). Không phân biệt
 * được bằng mã lỗi, nên cách duy nhất trung thực là **hết nửa thì thôi**, và người gọi
 * phải chọn cổng khác cổng daemon.
 */
const RETRY_MS = 40;

/** Nửa BẮN: một cú gọi ra từ `localPort`. Ăn ⇒ ta là bên GỌI. Trượt ⇒ lỗ vẫn đã đục. */
function dialHalf(
  target: PunchTarget,
  localPort: number,
  windowMs: number,
  retryMs: number,
  stop?: () => boolean,
  /** Mã lỗi ĐẦU TIÊN của nửa này — chỉ một lần, để không rải log mỗi 40 ms. */
  report?: (code: string) => void,
): Promise<net.Socket | null> {
  return new Promise((resolve) => {
    let settled = false;
    let current: net.Socket | null = null;
    const until = Date.now() + windowMs;
    const finish = (s: net.Socket | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!s && current) {
        try {
          current.destroy();
        } catch {
          /* đóng được thì tốt */
        }
      }
      resolve(s);
    };
    const timer = setTimeout(() => finish(null), windowMs);
    const attempt = (): void => {
      if (settled || stop?.()) return;
      let sock: net.Socket;
      try {
        sock = net.connect({ host: target.host, port: target.port, localPort, family: 4 });
      } catch {
        if (Date.now() + retryMs < until) setTimeout(attempt, retryMs);
        return;
      }
      current = sock;
      sock.once("connect", () => finish(sock));
      sock.once("error", (err: NodeJS.ErrnoException) => {
        if (report) {
          report(err.code ?? "ERR");
          report = undefined;
        }
        try {
          sock.destroy();
        } catch {
          /* đóng được thì tốt */
        }
        // 🔴 Thử lại với MỌI mã lỗi, không riêng `EADDRINUSE`.
        // Bản trước chỉ thử lại khi cổng nguồn chưa nhả, và cổng test **đỏ 4/5 lượt**. Gốc:
        // hai đầu đổi pha ĐỒNG THỜI, nên cú gọi luôn bắn trước lúc lớp nghe bên kia kịp lên
        // ⇒ `ECONNREFUSED` ở millisecond đầu, rồi nằm im hết nửa. Một bộ đục lỗ thật thì
        // **bắn lặp lại suốt nửa của nó** — mỗi cú SYN vừa là một lần thử vừa giữ lỗ mở.
        if (Date.now() + retryMs < until) setTimeout(attempt, retryMs);
      });
    };
    attempt();
  });
}

/** Nửa NGHE: bind đúng `localPort` để nhận SYN đi qua cái lỗ vừa đục. */
function listenHalf(
  localPort: number,
  windowMs: number,
  retryMs: number,
  stop?: () => boolean,
  /** Mã lỗi bind ĐẦU TIÊN của nửa này — nửa nghe không bind được là ca hỏng câm nhất. */
  report?: (code: string) => void,
): Promise<net.Socket | null> {
  return new Promise((resolve) => {
    let settled = false;
    let current: net.Server | null = null;
    const until = Date.now() + windowMs;
    const finish = (s: net.Socket | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Đóng lớp nghe NGAY khi đã nhận được: cổng phải rảnh cho nửa bắn của vòng sau.
      // Socket đã nhận vẫn sống sau khi server đóng — đó là hành vi của `net`, và là
      // điều kiện để phiên chạy tiếp trên nó.
      //
      // 🔴 Nửa RỖNG (không nhận được ai) phải CHỜ cổng nhả THẬT rồi mới trả về.
      // `server.close()` là bất đồng bộ; trả về ngay thì nửa BẮN của vòng sau giành đúng cổng
      // đó và ăn `EADDRINUSE`, rồi nó quay vòng thử lại suốt nửa và giữ cổng, làm nửa NGHE kế
      // tiếp cũng bind trượt — **đổ dây chuyền**, và triệu chứng duy nhất là *"đục lỗ không ăn"*.
      // Đo được: cổng test gặp-nhau đỏ ~50% lượt, lượt đỏ chạy hết cả 8 vòng.
      //
      // CHỈ chờ khi nửa rỗng: `close(cb)` đợi mọi kết nối đang mở kết thúc, nên khi ĐÃ nhận
      // được một socket (thứ ta cố tình giữ sống) thì callback sẽ không bao giờ tới.
      // Thêm trần 150 ms để không bao giờ treo vì một handle cứng đầu.
      if (!s && current?.listening) {
        let released = false;
        const release = (): void => {
          if (released) return;
          released = true;
          resolve(s);
        };
        const guard = setTimeout(release, 150);
        guard.unref?.();
        try {
          current.close(() => {
            clearTimeout(guard);
            release();
          });
        } catch {
          clearTimeout(guard);
          release();
        }
        return;
      }
      try {
        current?.close();
      } catch {
        /* đóng được thì tốt */
      }
      resolve(s);
    };
    const timer = setTimeout(() => finish(null), windowMs);
    const attempt = (): void => {
      if (settled || stop?.()) return;
      const srv = net.createServer();
      current = srv;
      srv.once("connection", (s) => finish(s));
      // Cổng bị chiếm ⇒ nửa nghe thử lại trong phạm vi nửa này; hết nửa thì bỏ qua và
      // KHÔNG làm chết cả lượt đục lỗ (fail-open, điều 9).
      srv.once("error", (err: NodeJS.ErrnoException) => {
        if (report) {
          report(err.code ?? "ERR");
          report = undefined;
        }
        try {
          srv.close();
        } catch {
          /* đóng được thì tốt */
        }
        if (Date.now() + retryMs < until) setTimeout(attempt, retryMs);
      });
      srv.listen(localPort, "0.0.0.0");
    };
    attempt();
  });
}

/**
 * Đục lỗ tới một máy, rồi chạy MỘT phiên trên kết nối vừa mở.
 *
 * ⚠ `localPort` **không được** là cổng daemon đang nghe — nửa nghe sẽ trượt sạch vì
 * cổng đã bị chính máy này giữ. Mặc định của bề mặt là `cổng kênh + 1`.
 */
export async function punchToPeer(target: PunchTarget, o: PunchOptions): Promise<PunchResult> {
  const rounds = o.rounds ?? DEFAULT_ROUNDS;
  const roundMs = o.roundMs ?? DEFAULT_ROUND_MS;
  const half = Math.max(200, Math.floor(roundMs / 2));
  const retryMs = Math.max(20, o.retryMs ?? RETRY_MS);
  // Trần CỦA CẢ LƯỢT. Từng nửa đã có trần riêng, nhưng một lượt đục lỗ nằm trên đường
  // đồng bộ: nó phải hứa một mốc kết thúc, không được để người gọi treo vì một nhánh
  // chậm nào chưa ai nghĩ tới. Nới 50% so với lịch để không cắt oan vòng cuối.
  const deadline = Date.now() + Math.ceil(rounds * roundMs * 1.5);

  for (let round = 1; round <= rounds; round++) {
    // Người dùng rút lại cú bấm ⇒ dừng ở chốt AN TOÀN, không cắt giữa một nửa đang mở socket.
    if (o.shouldStop?.()) return fail(`đã huỷ sau ${round - 1} vòng`, round - 1);
    if (Date.now() > deadline) return fail(`đục lỗ hết giờ sau ${round - 1} vòng`, round - 1);
    // Thứ tự hai nửa ĐẢO theo pha — đây là chỗ hai máy gặp được nhau. Luật nằm trong
    // `dialsFirstInRound` (hàm THUẦN, có cổng riêng): biết máy kia ⇒ pha tất định theo hai vân
    // tay, 0 tin thương lượng; chưa biết ⇒ đổi pha mỗi vòng.
    const dialFirstNow = dialsFirstInRound(o.identity.deviceId, target.deviceId ?? "", round);
    const order: ("ban" | "nghe")[] = dialFirstNow ? ["ban", "nghe"] : ["nghe", "ban"];
    for (const phase of order) {
      o.onRound?.({ round, phase });
      // Mã lỗi đầu tiên của mỗi nửa đi ra `onRound` — "đục lỗ không ăn" mà không kèm lý do là
      // câu vô dụng đúng lúc cần nhất: không phân biệt được *cổng bind trượt* với *bên kia chưa
      // nghe* với *mạng không có đường*, mà ba thứ đó vá ba kiểu khác nhau.
      const note = (what: string) => (code: string) => o.onRound?.({ round, phase, note: `${what}: ${code}` });
      const raw =
        phase === "ban"
          ? await dialHalf(target, o.localPort, half, retryMs, o.shouldStop, note("bắn trượt"))
          : await listenHalf(o.localPort, half, retryMs, o.shouldStop, note("nghe không bind được"));
      if (!raw) continue;

      const asServer = phase === "nghe";
      let sock: tls.TLSSocket;
      try {
        sock = await secureSocket(raw, o, asServer, half);
      } catch (e) {
        // Bắt tay TLS trượt ⇒ hoặc máy lạ, hoặc dây đứt. Đóng rồi thử vòng sau; KHÔNG
        // kết luận "đục lỗ không được" từ một cú bắt tay hỏng.
        try {
          raw.destroy();
        } catch {
          /* đóng được thì tốt */
        }
        o.onRound?.({ round, phase, note: `bắt tay TLS trượt: ${(e as Error).message}` });
        continue;
      }
      // Bên NHẬN là server ⇒ `initiator: false`, đúng y vai của `serveChannel`.
      const outcome = await runSessionOn(sock, o, !asServer);
      return { ...outcome, won: asServer ? "nhan" : "goi", rounds: round };
    }
  }
  return fail(
    `đục lỗ không ăn sau ${rounds} vòng — nghi NAT đối xứng ở một đầu; chạy \`channel probe\` ở CẢ HAI máy`,
    rounds,
  );
}
