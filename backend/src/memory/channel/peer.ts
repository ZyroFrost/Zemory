/**
 * PHIÊN NGANG HÀNG — một lượt đồng bộ máy-tới-máy (plan/24 §7c ②).
 *
 * Đối xứng: hai đầu chạy CÙNG một máy trạng thái, chỉ khác ai gọi trước. Trình tự:
 *   ① TLS + so vân tay chứng chỉ hai chiều   (danh tính — identity.ts)
 *   ② hello {nonce} ↔ proof {hmac}           (cùng chìa share, hỏi–đáp có nonce)
 *   ③ have {tập danh tính khối}              (mỗi bên khai mình có gì)
 *   ④ khối còn thiếu, byte thô               (mỗi bên tự lọc theo `have` bên kia)
 *   ⑤ done                                   (xong phần của mình)
 *
 * Khối nhận được nối vào khúc ĐANG MỞ của máy này — không bao giờ đụng khúc đã
 * niêm phong (HP điều 16). Khung chưa trọn thì chưa chạm đĩa, nên đứt dây giữa
 * chừng không làm rách khúc (đo: plan/24 §6b phép ④).
 */
import tls, { type TLSSocket } from "node:tls";
import { appendReceivedBlock, inventoryIds, missingOnPeer, readBlockBytes } from "./blocks.js";
import { peerDeviceId, sameDeviceId, type ChannelIdentity } from "./identity.js";
import {
  FRAME_BLOCK,
  FRAME_JSON,
  computeProof,
  createFrameReader,
  encodeBlock,
  encodeJson,
  newNonce,
  parseControl,
  proofMatches,
  type ControlMessage,
} from "./wire.js";

export interface SyncOutcome {
  peerDeviceId: string | null;
  sentBlocks: number;
  receivedBlocks: number;
  bytesSent: number;
  error?: string;
}

export interface SessionOptions {
  channelDir: string;
  identity: ChannelIdentity;
  shareKey: string;
  appVersion: string;
  /** ID được phép nói chuyện. Rỗng ⇒ TỪ CHỐI tất (không bao giờ mặc định mở). */
  allowedPeers: string[];
  /**
   * Bên GỌI: người dùng vừa gõ địa chỉ để nối tới một máy CHƯA quen ⇒ xin nhận sau khi chứng minh
   * cùng chìa. Không bật ⇒ phiên chỉ nói chuyện với máy đã có trong sổ.
   */
  wantPair?: boolean;
  /**
   * Bên NGHE: ghi vân tay máy vừa chứng minh cùng chìa vào sổ, trả `true` nếu nhận.
   *
   * 🔄 **Bỏ MÃ KẾT NỐI (user chốt 2026-09-20).** Trước đây đây là `acceptPair(code, peerId)` và máy
   * lạ phải đọc thêm một mã 6 số. Đo lại thứ tự bắt tay thì mã nằm SAU bước chứng minh cùng
   * `share.key` — mà chìa đó đã giải mã được TOÀN BỘ kho, nên mã canh một cánh cửa nằm sau một cánh
   * cửa mạnh hơn nó nhiều. Nguyên văn user: *"giờ xài ip thì 1 cơ chế nhập ip thôi chứ còn nhập mã
   * chi cho rối thêm"*. Bỏ mã KHÔNG mất lớp bảo vệ nào có thật, và trả lại điều 16 mục 9
   * (*tự động — người dùng không phải nhớ bấm gì*).
   */
  acceptPeer?: (peerDeviceId: string) => boolean;
  /** Bên GỌI: máy kia đã nhận, đây là vân tay của nó — ghi lại để lần sau khỏi gõ địa chỉ.*/
  onPaired?: (peerDeviceId: string) => void;
  /** Trần một lượt — phiên treo không được giữ tiến trình mãi. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 120_000;

/** Lái một phiên trên socket đã bắt tay TLS. Dùng chung cho cả bên gọi lẫn bên nghe. */
function runSession(sock: TLSSocket, o: SessionOptions, initiator: boolean): Promise<SyncOutcome> {
  return new Promise((resolve) => {
    const out: SyncOutcome = { peerDeviceId: null, sentBlocks: 0, receivedBlocks: 0, bytesSent: 0 };
    let settled = false;
    const myNonce = newNonce();
    let peerNonce = "";
    let proofOk = false;
    let sentDone = false;
    let gotDone = false;
    const pending: Buffer[] = [];

    /**
     * 🔴 `end()` để ĐẨY NỐT, `destroy()` chỉ khi HỎNG.
     *
     * Bug thật bắt được lúc dựng cổng: bản đầu gọi `end()` rồi `destroy()` ngay dòng
     * sau. `destroy()` **huỷ phần ghi chưa kịp đẩy**, nên bên kia mất đúng những khối
     * vừa được xếp vào bộ đệm — biểu hiện là `nối khối trượt (thấy 0 khối, chờ 1)`.
     * Đường lành phải để `end()` làm nốt việc của nó; chỉ ca lỗi/hết giờ mới cắt phũ.
     */
    const finish = (error?: string): void => {
      if (settled) return;
      settled = true;
      if (error) out.error = error;
      clearTimeout(timer);
      try {
        if (error) sock.destroy();
        else sock.end();
      } catch {
        /* đóng được thì tốt, không thì thôi */
      }
      resolve(out);
    };
    const timer = setTimeout(() => finish("hết giờ phiên"), o.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    // ① Vân tay đối phương — TỰ tính, không nhờ CA phán.
    const peerId = peerDeviceId(sock.getPeerCertificate()?.raw);
    out.peerDeviceId = peerId;
    if (!peerId) return finish("đối phương không xuất trình chứng chỉ");
    // Máy lạ chỉ đi tiếp được khi bên này ĐANG MỞ cửa sổ ghép — và vẫn phải qua bằng chứng cùng chìa
    // trước khi được ghi vào sổ. Không có cửa sổ ⇒ từ chối y như cũ.
    const known = o.allowedPeers.some((a) => sameDeviceId(a, peerId));
    // HAI ĐẦU đều phải nới: bên NGHE khi đang mở cửa sổ ghép, bên GỌI khi cầm mã ghép. Bản đầu chỉ
    // nới bên nghe, nên lượt ghép đầu tiên chết ngay ở chính máy đi gọi — danh sách của nó còn rỗng.
    const pairing = !known && (typeof o.acceptPeer === "function" || Boolean(o.wantPair));
    if (!known && !pairing) {
      return finish(`máy lạ, chưa ghép đôi: ${peerId}`);
    }
    let paired = known;

    const send = (buf: Buffer): void => {
      out.bytesSent += buf.length;
      sock.write(buf);
    };

    /** Sau khi bằng chứng khớp mới khai kho — không nói gì với máy chưa chứng minh cùng chìa. */
    const sendHave = (): void => {
      send(encodeJson({ t: "have", ids: inventoryIds(o.channelDir) }));
    };

    const onControl = (m: ControlMessage): void => {
      if (m.t === "hello") {
        peerNonce = m.nonce;
        const [a, b] = initiator ? [myNonce, peerNonce] : [peerNonce, myNonce];
        send(encodeJson({ t: "proof", hmac: computeProof(o.shareKey, a, b) }));
        return;
      }
      if (m.t === "proof") {
        if (!peerNonce) return finish("nhận bằng chứng trước khi có nonce");
        const [a, b] = initiator ? [myNonce, peerNonce] : [peerNonce, myNonce];
        if (!proofMatches(computeProof(o.shareKey, a, b), m.hmac)) {
          // Ngắt TRƯỚC khi chở byte nào — khác chìa thì mọi khối đều vô dụng.
          return finish("chìa share KHÁC nhau — hai máy không đọc được kho của nhau");
        }
        proofOk = true;
        // Bên GỌI đang nối tới máy chưa quen ⇒ xin nhận trước khi khai kho.
        if (initiator && o.wantPair) {
          send(encodeJson({ t: "pair" }));
          return;
        }
        if (!paired) return; // bên NGHE: chờ lời xin nhận, chưa khai gì cả
        sendHave();
        return;
      }
      if (m.t === "pair") {
        if (!proofOk) return finish("xin kết nối trước khi chứng minh cùng chìa");
        if (paired) return; // đã nhận rồi thì lời xin là thừa, bỏ qua
        if (!o.acceptPeer || !peerId || !o.acceptPeer(peerId)) {
          return finish("máy này không nhận kết nối mới");
        }
        paired = true;
        send(encodeJson({ t: "paired", id: o.identity.deviceId }));
        sendHave();
        return;
      }
      if (m.t === "paired") {
        // Bên GỌI: máy kia đã nhận. Ghi vân tay của nó rồi mới khai kho.
        if (!proofOk) return finish("nhận xác nhận ghép trước khi chứng minh cùng chìa");
        paired = true;
        o.onPaired?.(m.id || peerId || "");
        sendHave();
        return;
      }
      if (m.t === "have") {
        if (!paired) return finish("khai kho trước khi ghép đôi");
        if (!proofOk) return finish("khai kho trước khi chứng minh cùng chìa");
        void shipMissing(m.ids);
        return;
      }
      if (m.t === "done") {
        gotDone = true;
        tryFinish();
      }
    };

    /**
     * 🔴 CHỈ đóng phiên khi ĐÃ NỐI XONG mọi khối đang chờ.
     *
     * Bug thật bắt được lúc dựng cổng: khung `done` và các khung KHỐI về trong
     * CÙNG một lượt `data`. Bản đầu xử lý `done` đồng bộ rồi `finish()` ngay, trong
     * khi khối vẫn đang nối vào đĩa bất đồng bộ ⇒ `destroy()` cắt ngang và bên nhận
     * mất khối — im lặng, đúng loại hỏng mà cả plan này sinh ra để chặn.
     */
    const tryFinish = (): void => {
      if (sentDone && gotDone && pending.length === 0 && !draining) finish();
    };

    const shipMissing = async (peerIds: string[]): Promise<void> => {
      try {
        const missing = missingOnPeer(o.channelDir, peerIds);
        for (const block of missing) {
          const bytes = await readBlockBytes(block);
          send(encodeBlock(bytes));
          out.sentBlocks++;
        }
        send(encodeJson({ t: "done", sent: missing.length }));
        sentDone = true;
        tryFinish();
      } catch (e) {
        finish(e instanceof Error ? e.message : "lỗi khi chở khối");
      }
    };

    /** Nối tuần tự — hai lượt `appendChunkVerified` chồng nhau là hỏng đuôi khúc. */
    let draining = false;
    const drain = async (): Promise<void> => {
      if (draining) return;
      draining = true;
      try {
        while (pending.length > 0) {
          const bytes = pending.shift() as Buffer;
          await appendReceivedBlock(o.channelDir, bytes);
          out.receivedBlocks++;
        }
      } catch (e) {
        finish(e instanceof Error ? e.message : "lỗi khi nối khối");
      } finally {
        draining = false;
      }
      tryFinish();
    };

    const read = createFrameReader();
    sock.on("data", (data: Buffer) => {
      if (settled) return;
      let frames;
      try {
        frames = read(data);
      } catch (e) {
        return finish(e instanceof Error ? e.message : "khung hỏng");
      }
      for (const f of frames) {
        if (f.kind === FRAME_JSON) {
          const m = parseControl(f.body);
          if (!m) return finish("tin điều khiển không đọc được");
          onControl(m);
        } else if (f.kind === FRAME_BLOCK) {
          if (!proofOk) return finish("gửi khối trước khi chứng minh cùng chìa");
          pending.push(Buffer.from(f.body));
          void drain();
        }
      }
    });
    sock.on("error", (e: NodeJS.ErrnoException) => finish(e.code ?? e.message));
    sock.on("close", () => {
      // Dây đứt KHÔNG có nghĩa là bỏ phần đã nhận: nối nốt rồi mới đóng sổ.
      if (pending.length === 0 && !draining) finish();
    });

    send(encodeJson({ t: "hello", deviceId: o.identity.deviceId, appVersion: o.appVersion, nonce: myNonce, initiator }));
  });
}

/**
 * Chạy MỘT phiên trên một socket TLS đã bắt tay xong — cho lớp relay (`relay.ts`) dùng lại
 * NGUYÊN giao thức phiên trên một ống đi qua bên thứ ba. Không có bản sao logic thứ hai.
 */
export function runSessionOn(sock: TLSSocket, o: SessionOptions, initiator: boolean): Promise<SyncOutcome> {
  return runSession(sock, o, initiator);
}

/** Gọi sang một máy đã ghép đôi. */
export function connectToPeer(addr: { host: string; port: number }, o: SessionOptions): Promise<SyncOutcome> {
  return new Promise((resolve) => {
    const sock = tls.connect(
      {
        host: addr.host,
        port: addr.port,
        key: o.identity.keyPem,
        cert: o.identity.certPem,
        // Không có CA nào ở đây theo THIẾT KẾ: danh tính là vân tay chứng chỉ,
        // kiểm trong `runSession`. Bỏ qua bước này là mở cửa cho máy lạ.
        rejectUnauthorized: false,
        minVersion: "TLSv1.3",
      },
      () => {
        void runSession(sock, o, true).then(resolve);
      },
    );
    sock.on("error", (e: NodeJS.ErrnoException) =>
      resolve({ peerDeviceId: null, sentBlocks: 0, receivedBlocks: 0, bytesSent: 0, error: e.code ?? e.message }),
    );
  });
}

export interface ChannelServer {
  port: number;
  close: () => void;
}

/** Nghe kết nối từ máy đã ghép đôi. `onDone` bắn sau mỗi phiên để bề mặt cập nhật. */
export function serveChannel(
  o: SessionOptions & { port: number; host?: string },
  onDone?: (r: SyncOutcome) => void,
): Promise<ChannelServer> {
  return new Promise((resolve, reject) => {
    const srv = tls.createServer(
      {
        key: o.identity.keyPem,
        cert: o.identity.certPem,
        requestCert: true,          // BẮT BUỘC: không có cert thì không có danh tính
        rejectUnauthorized: false,  // tự xử vân tay, không nhờ CA
        minVersion: "TLSv1.3",
      },
      (sock) => {
        void runSession(sock, o, false).then((r) => onDone?.(r));
      },
    );
    srv.once("error", reject);
    srv.listen(o.port, o.host ?? "0.0.0.0", () => {
      const a = srv.address();
      resolve({
        port: typeof a === "object" && a ? a.port : o.port,
        close: () => {
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
