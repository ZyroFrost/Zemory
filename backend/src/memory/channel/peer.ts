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
import { isContentAddressed, MIRROR_AREAS, type MirrorArea, type MirrorEntry } from "./mirror.js";
import {
  FRAME_BLOCK,
  FRAME_FILE,
  FRAME_JSON,
  computeProof,
  createFrameReader,
  encodeBlock,
  encodeFile,
  encodeJson,
  MAX_FRAME_BYTES,
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
  /** plan/24 §9 — lớp FILE. Tách khỏi bộ đếm khối: hai lớp hỏng độc lập nên phải đọc độc lập. */
  sentFiles: number;
  receivedFiles: number;
  /** File nhận được đã ghi thẳng (mục địa chỉ-theo-nội-dung, hoặc cặp một chiều phía đích). */
  appliedFiles: number;
  /** File nhận được đang CHỜ người duyệt (§9.3). */
  queuedFiles: number;
  error?: string;
}

/**
 * Kết quả RỖNG — MỘT nguồn duy nhất cho hình dạng của nó.
 *
 * 🔴 Vì sao là một hàm chứ không phải gõ tay ở từng chỗ: thêm một trường vào `SyncOutcome`
 * mà quên một chỗ dựng thì hoặc gãy lúc biên dịch (may), hoặc trả về một bộ đếm thiếu mà
 * bề mặt đọc thành `0` (không may) — cùng bài học *"thêm một trường vào trạng thái = đi HẾT
 * mọi đường trả nó"* đã trả giá ở `plan/14`. Nay chỉ có một đường.
 */
export function emptyOutcome(error?: string): SyncOutcome {
  return {
    peerDeviceId: null,
    sentBlocks: 0,
    receivedBlocks: 0,
    bytesSent: 0,
    sentFiles: 0,
    receivedFiles: 0,
    appliedFiles: 0,
    queuedFiles: 0,
    ...(error ? { error } : {}),
  };
}

/**
 * Cái mà phiên cần để chạy lớp mirror. Tiêm vào chứ không gọi thẳng `mirrorstate` từ đây:
 * phiên là lớp DÂY, nó không được sở hữu quyết định *áp hay hỏi* — quyết định đó sống ở
 * một chỗ duy nhất (`mirrorstate.receiveFile`), và tiêm được là điều kiện để cổng chạy
 * phiên trên loopback mà không đụng kho thật.
 */
export interface MirrorHooks {
  /** Kiểm kê của MÁY NÀY. Vắng ⇒ phiên không chạy pha mirror. */
  inventory: () => MirrorEntry[];
  /**
   * Byte của MỘT mục trong kiểm kê. `null` = không đọc được (file vừa biến mất, quyền, …)
   * ⇒ bỏ qua một file, không giết cả lượt.
   *
   * 🔴 **Phiên KHÔNG được tự giải đường dẫn.** Bản đầu gọi thẳng `mirrorRoots()` ở đây, tức
   * kiểm kê đi qua gốc ĐƯỢC TIÊM còn phép đọc đi qua gốc MẶC ĐỊNH — hai nguồn sự thật cho
   * cùng một câu hỏi *"file này nằm đâu"*. Cổng bắt được ngay lượt chạy đầu: máy giả khai một
   * file của mình nhưng chở đi nội dung file CÙNG TÊN trong repo thật. Trên máy production hai
   * gốc trùng nhau nên lỗi này **vô hình mãi mãi** — đúng hạng lỗi mà một cổng phải bắt hộ.
   */
  read: (area: MirrorArea, rel: string) => Buffer | null;
  /**
   * Xử một file vừa nhận. Trả về đã ghi thẳng hay đã vào hàng đợi.
   *
   * Nhận `peerId` làm tham số chứ không gắn cứng vào hook: MỘT bộ hook phục vụ mọi phiên,
   * kể cả lượt NGHE nơi ta không biết trước ai sẽ gọi tới. Phiên biết vân tay đối phương
   * ngay từ bước đọc chứng chỉ, trước cả tin đầu tiên, nên nó luôn truyền được.
   */
  receive: (peerId: string, area: MirrorArea, rel: string, body: Buffer) => { applied: boolean; queued: boolean; error?: string };
  /** Máy này có được ĐẨY sang máy đó không — `false` ở phía đích của cặp một chiều (§9.2). */
  mayPush: (peerId: string) => boolean;
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
  /** Trần một lượt — phiên treo không được giữ tiến trình mãi. Chỉ chạy SAU khi bắt tay xong. */
  timeoutMs?: number;
  /**
   * Trần cho NỐI + BẮT TAY (`connectToPeer`). Khác `timeoutMs`: cái kia canh PHIÊN, cái này canh
   * quãng TRƯỚC phiên — quãng duy nhất mà một địa chỉ nuốt gói làm treo vô hạn.
   */
  connectTimeoutMs?: number;
  /**
   * Nói ra những chuyện xảy ra TRONG phiên mà không phải lỗi — ví dụ một khối bị bỏ qua.
   *
   * Không có hố này thì mọi quyết định lặng của phiên đều vô hình, và hai máy lệch nhau một khối
   * mà không bên nào biết.
   */
  log?: (m: string) => void;
  /**
   * Lớp MIRROR THƯ MỤC (plan/24 §9). Vắng ⇒ phiên chạy y như trước, chỉ chở khối.
   *
   * Vắng cũng có nghĩa là ta **không khai** `mirror` trong `hello`, nên máy kia biết ngay
   * là đừng chờ `mdone` của ta — cùng một luật với bản cũ, chỉ khác lý do.
   */
  mirror?: MirrorHooks;
}

const DEFAULT_TIMEOUT_MS = 120_000;

/** Khoá của một file trên dây. Mục + đường, không bao giờ là đường tuyệt đối. */
const fileKey = (area: string, rel: string): string => `${area}/${rel}`;

/** Mục hợp lệ. Dựng TỪ danh sách của `mirror.ts` — gõ tay lần thứ hai là để hai chỗ trôi lệch. */
const MIRROR_AREA_SET: ReadonlySet<string> = new Set<string>(MIRROR_AREAS);

/** Lái một phiên trên socket đã bắt tay TLS. Dùng chung cho cả bên gọi lẫn bên nghe. */
function runSession(sock: TLSSocket, o: SessionOptions, initiator: boolean): Promise<SyncOutcome> {
  return new Promise((resolve) => {
    const out: SyncOutcome = emptyOutcome();
    let settled = false;
    const myNonce = newNonce();
    let peerNonce = "";
    let proofOk = false;
    /** Ta đã GỬI lời xin ghép và đang chờ trả lời — xem nhánh `have` để biết vì sao cần nhớ. */
    let pairAsked = false;
    let sentDone = false;
    let gotDone = false;
    const pending: Buffer[] = [];

    // ── Lớp MIRROR (plan/24 §9) — sổ riêng, kết thúc riêng ──────────────────────────
    /** Máy kia có khai biết mirror không. Chưa nhận `hello` ⇒ chưa biết ⇒ chưa gửi gì. */
    let peerMirror = false;
    let mSentDone = false;
    let mGotDone = false;
    /** Tiêu đề của khung `FRAME_FILE` sắp tới. Byte không tự nói nó thuộc đường nào. */
    let pendingFile: { area: MirrorArea; rel: string; hash: string; size: number } | null = null;
    /** Lớp mirror của ta có chạy trong phiên này không — cần CẢ hai đầu biết nó. */
    const mirrorOn = (): boolean => Boolean(o.mirror) && peerMirror;

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

    /**
     * Sau khi bằng chứng khớp mới khai kho — không nói gì với máy chưa chứng minh cùng chìa.
     *
     * Kiểm kê FILE đi CÙNG LÚC với kiểm kê khối, không xếp sau: hai lớp độc lập nhau, và
     * nối tiếp chúng là để một lớp chậm giữ lớp kia lại mà không được gì.
     */
    const sendHave = (): void => {
      send(encodeJson({ t: "have", ids: inventoryIds(o.channelDir) }));
      sendMirrorInventory();
    };

    const sendMirrorInventory = (): void => {
      if (!mirrorOn()) return;
      let entries: MirrorEntry[];
      try {
        entries = o.mirror?.inventory() ?? [];
      } catch (e) {
        // Quét hỏng KHÔNG được giết lượt chở khối — lớp mirror là lớp THÊM (điều 9).
        o.log?.(`[channel] mirror: quét thư mục thất bại (${e instanceof Error ? e.message : "?"}) — bỏ pha mirror lượt này`);
        send(encodeJson({ t: "mdone", sent: 0 }));
        mSentDone = true;
        return;
      }
      send(
        encodeJson({
          t: "mfiles",
          entries: entries.map((e) => ({ a: e.area, p: e.rel, ...(e.hash ? { h: e.hash } : {}), s: e.size })),
        }),
      );
    };

    const onControl = (m: ControlMessage): void => {
      if (m.t === "hello") {
        peerNonce = m.nonce;
        // Khai năng lực tới TRƯỚC mọi thứ khác, nên tới lúc khai kho ta đã biết có chạy pha
        // mirror hay không. Bản cũ không có trường này ⇒ `undefined` ⇒ tắt, đúng như phải vậy.
        peerMirror = m.mirror === true;
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
        //
        // 🔴 `acceptPeer` cũng tính là "sẵn sàng làm quen", không riêng `wantPair`. Thiếu vế đó
        // thì một bên mở cửa cho máy lạ nhưng KHÔNG BAO GIỜ tự xin khi nó rơi vào vai GỌI — mà
        // vai nào là do cú bắt tay nào ăn trước quyết định, tức **tung đồng xu**. Nửa số lượt
        // sẽ chết bằng `"khai kho trước khi ghép đôi"`: bên kia khai kho vì nó đã quen ta, còn
        // ta thì vẫn đang chờ một lời xin ghép mà chính ta lẽ ra phải gửi. Cổng `cửa lạ` bắt
        // được ca này ngay lượt chạy đầu.
        //
        // `!paired` để không gửi lời xin thừa khi hai bên vốn đã quen nhau.
        // `wantPair` giữ nguyên nghĩa cũ — người dùng vừa gõ địa chỉ là đang TỰ GIỚI THIỆU, và
        // ta không biết bên kia có nhớ ta hay không, nên cứ xin. Vế `acceptPeer` là phần THÊM:
        // bên mở cửa cho máy lạ cũng phải biết tự xin khi nó rơi vào vai GỌI.
        if (initiator && (o.wantPair || (!paired && typeof o.acceptPeer === "function"))) {
          pairAsked = true;
          send(encodeJson({ t: "pair" }));
          return;
        }
        if (!paired) return; // bên NGHE: chờ lời xin nhận, chưa khai gì cả
        sendHave();
        return;
      }
      if (m.t === "pair") {
        if (!proofOk) return finish("xin kết nối trước khi chứng minh cùng chìa");
        // Đã quen nhau rồi ⇒ vẫn phải TRẢ LỜI. Bỏ qua im lặng thì bên kia ngồi chờ một câu
        // không bao giờ tới; một lời xin không được đáp là đúng kiểu treo lặng.
        if (paired) {
          send(encodeJson({ t: "paired", id: o.identity.deviceId }));
          return;
        }
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
        // Đã ghép rồi thì lời xác nhận thứ hai là thừa — khai kho lần nữa là chở TRÙNG.
        if (paired) return;
        paired = true;
        o.onPaired?.(m.id || peerId || "");
        sendHave();
        return;
      }
      if (m.t === "have") {
        // 🔴 Nhận `have` trong lúc ĐANG XIN ghép = bên kia VỐN ĐÃ quen ta. Đó chính là lời
        // chấp nhận, chỉ đến bằng một đường khác — và nó tới TRƯỚC lời xin của ta vì bên kia
        // khai kho ngay sau bước chứng minh chìa, không đợi ai.
        //
        // Thiếu nhánh này thì ca *"ta chưa quen nó, nó đã quen ta"* chết bằng câu
        // `"khai kho trước khi ghép đôi"` — mà vai GỌI/NGHE do cú bắt tay nào ăn trước quyết
        // định, tức nó hỏng theo kiểu TUNG ĐỒNG XU. Cổng `cửa lạ` bắt được ngay lượt đầu.
        //
        // `sendHave()` ở đây là bắt buộc: không khai kho của mình thì bên kia không biết ta
        // thiếu gì và **không bao giờ chở về**, và lượt đồng bộ thành một chiều mà không ai báo.
        if (!paired && proofOk) {
          if (pairAsked) {
            // Ta đang xin ghép, và bên kia khai kho ⇒ nó vốn đã quen ta. Đó LÀ lời chấp nhận.
            paired = true;
            o.onPaired?.(peerId || "");
            sendHave();
          } else if (peerId && o.acceptPeer?.(peerId)) {
            // Ta là bên NGHE, chưa quen nó, nhưng cửa của ta là `acceptPeer` và nó đã chứng minh
            // cùng chìa. Ca này có THẬT và là ca của máy người dùng: sổ máy A bị dọn khi cơ chế
            // ghép đổi (20/09) trong khi B vẫn còn nhớ A ⇒ B không thấy cần xin ghép, A thì
            // không có gì để mở cửa. Hai bên đều "đúng" theo sổ của mình và phiên chết lặng.
            paired = true;
            sendHave();
          }
        }
        if (!paired) return finish("khai kho trước khi ghép đôi");
        if (!proofOk) return finish("khai kho trước khi chứng minh cùng chìa");
        void shipMissing(m.ids);
        return;
      }
      if (m.t === "done") {
        // Nói ra cả hai chiều `done`: một phiên treo tới hết giờ hầu như luôn là MỘT bên không
        // đóng sổ, và không có hai dòng này thì không cách nào biết bên nào.
        o.log?.(`[channel] nhận "xong" từ máy kia (${m.sent ?? "?"} khối)`);
        gotDone = true;
        tryFinish();
        return;
      }
      if (m.t === "mfiles") {
        if (!proofOk) return finish("khai thư mục trước khi chứng minh cùng chìa");
        if (!paired) return finish("khai thư mục trước khi ghép đôi");
        void shipMirror(m.entries);
        return;
      }
      if (m.t === "mfile") {
        if (!proofOk) return finish("gửi file trước khi chứng minh cùng chìa");
        // Tiêu đề KHÔNG được tin: `p` tới từ máy kia. Phép chặn đường thoát nằm ở
        // `resolveMirrorPath` phía `mirrorstate`, nhưng mục thì kiểm ngay ở đây — một mục
        // lạ nghĩa là hai bản lệch giao thức, và đoán tiếp là ghi vào chỗ không ai khai.
        if (!MIRROR_AREA_SET.has(m.a)) {
          o.log?.(`[channel] mirror: bỏ qua mục lạ "${m.a}"`);
          pendingFile = null;
          return;
        }
        pendingFile = { area: m.a as MirrorArea, rel: m.p, hash: m.h, size: m.s };
        return;
      }
      if (m.t === "mdone") {
        o.log?.(`[channel] mirror: nhận "xong" từ máy kia (${m.sent ?? "?"} file)`);
        mGotDone = true;
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
      if (!sentDone || !gotDone) return;
      // Lớp mirror chỉ được tính vào điều kiện đóng khi nó THẬT SỰ chạy. Đòi `mdone` của một
      // máy không biết mirror là treo tới hết giờ — xem `HelloMessage.mirror`.
      if (mirrorOn() && (!mSentDone || !mGotDone)) return;
      if (pending.length > 0 || draining) return;
      finish();
    };

    const shipMissing = async (peerIds: string[]): Promise<void> => {
      try {
        const missing = missingOnPeer(o.channelDir, peerIds);
        let shipped = 0;
        for (const block of missing) {
          // 🔴 MỘT khối quá cỡ KHÔNG được phép kéo sập cả phiên.
          //
          // Đo 23/09 trên hai máy thật: ngăn kênh còn một `global_memory.enc` **nguyên khối 2,6 GB**
          // — baseline đời cũ, sót lại từ trước khi kho chuyển sang cắt khúc. `readBlockBytes` bóc
          // nó ra rồi `readFileSync` chạm trần cứng ~2 GiB của Node (`ERR_FS_FILE_TOO_LARGE`), lỗi
          // ném lên `catch` và **giết trọn lượt chở** — nên bắt tay xong, phiên chạy, rồi 0 khối đi
          // và không ai hiểu vì sao. Cả một kho delta vài trăm KB bị chặn bởi một tệp không liên quan.
          //
          // Khối lớn hơn một khung thì **không có cách nào** gửi (lớp dây chốt `MAX_FRAME_BYTES`),
          // nên bỏ qua là câu trả lời ĐÚNG chứ không phải nhân nhượng — và phải NÓI RA, vì im lặng
          // ở đây là để hai máy vĩnh viễn lệch nhau một khối mà không bên nào biết.
          if (block.chunk.len > MAX_FRAME_BYTES) {
            o.log?.(
              `[channel] bỏ qua một khối ${Math.round(block.chunk.len / 1024 / 1024)} MB — vượt trần khung ${Math.round(MAX_FRAME_BYTES / 1024 / 1024)} MB; đây là baseline nguyên khối đời cũ, khối delta vẫn đi bình thường`,
            );
            continue;
          }
          const bytes = await readBlockBytes(block);
          send(encodeBlock(bytes));
          out.sentBlocks++;
          shipped++;
        }
        send(encodeJson({ t: "done", sent: shipped }));
        o.log?.(`[channel] đã gửi "xong" (${shipped} khối) — chờ máy kia đóng sổ`);
        sentDone = true;
        tryFinish();
      } catch (e) {
        finish(e instanceof Error ? e.message : "lỗi khi chở khối");
      }
    };

    /**
     * Chở phần FILE máy kia còn thiếu (plan/24 §9).
     *
     * Hai mục hai luật, và chúng KHÁC NHAU ở chỗ quyết định:
     * · `files/` — địa chỉ theo nội dung ⇒ chỉ gửi đường nào bên kia **không có**. Trùng tên
     *   là trùng nội dung, nên gửi lại một file họ đã có là ném byte đi không mua gì.
     * · `docs/` · `docs_visual/` · `attic/` — gửi khi bên kia **thiếu HOẶC khác băm**. Ta cố ý
     *   KHÔNG tự phán ai đúng ở đây: phép phân loại `§9.3` cần mốc `base`, mà mốc đó là của
     *   BÊN NHẬN — nó mới biết lần gặp gần nhất hai bên khớp ở đâu. Gửi ứng viên, để bên nhận
     *   quyết. Đây cũng là lý do hàng đợi duyệt nằm ở phía nhận chứ không phía gửi.
     */
    const shipMirror = async (peerEntries: Array<{ a: string; p: string; h?: string; s: number }>): Promise<void> => {
      if (!mirrorOn()) return;
      try {
        if (!o.mirror?.mayPush(peerId ?? "")) {
          // Phía ĐÍCH của cặp một chiều: nhận thì nhận, đẩy thì không bao giờ (§9.2).
          send(encodeJson({ t: "mdone", sent: 0 }));
          mSentDone = true;
          tryFinish();
          return;
        }
        const theirs = new Map(peerEntries.map((e) => [fileKey(e.a, e.p), e.h ?? ""]));
        let shipped = 0;
        for (const e of o.mirror.inventory()) {
          const k = fileKey(e.area, e.rel);
          const has = theirs.has(k);
          if (has && (isContentAddressed(e.area) || theirs.get(k) === (e.hash ?? ""))) continue;
          // File biến mất giữa lúc quét và lúc gửi là chuyện thường (agent đang làm việc).
          // Bỏ qua MỘT file, không giết cả lượt.
          const bytes = o.mirror.read(e.area, e.rel);
          if (!bytes) continue;
          send(encodeJson({ t: "mfile", a: e.area, p: e.rel, h: e.hash ?? "", s: bytes.length }));
          send(encodeFile(bytes));
          out.sentFiles++;
          shipped++;
        }
        send(encodeJson({ t: "mdone", sent: shipped }));
        o.log?.(`[channel] mirror: đã gửi "xong" (${shipped} file)`);
        mSentDone = true;
        tryFinish();
      } catch (e) {
        // Lớp mirror hỏng KHÔNG được kéo theo lớp khối (điều 9): đóng sổ mirror rồi đi tiếp.
        o.log?.(`[channel] mirror: lỗi khi chở file (${e instanceof Error ? e.message : "?"})`);
        if (!mSentDone) {
          send(encodeJson({ t: "mdone", sent: 0 }));
          mSentDone = true;
        }
        tryFinish();
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
        } else if (f.kind === FRAME_FILE) {
          if (!proofOk) return finish("gửi file trước khi chứng minh cùng chìa");
          // 🔴 Byte KHÔNG có tiêu đề ⇒ VỨT, không đoán. Ghi một file mà không biết nó thuộc
          // đường nào thì chỗ duy nhất để đoán là một cái tên bịa ra — đúng thứ không được làm
          // với dữ liệu tới từ máy khác.
          const head = pendingFile;
          pendingFile = null;
          if (!head) {
            o.log?.("[channel] mirror: nhận byte file mà không có tiêu đề — bỏ qua");
            continue;
          }
          const body = Buffer.from(f.body);
          out.receivedFiles++;
          const r = o.mirror?.receive(peerId ?? "", head.area, head.rel, body);
          if (!r) continue;
          if (r.applied) out.appliedFiles++;
          if (r.queued) out.queuedFiles++;
          if (r.error) o.log?.(`[channel] mirror: ${head.area}/${head.rel} — ${r.error}`);
        }
      }
    });
    sock.on("error", (e: NodeJS.ErrnoException) => finish(e.code ?? e.message));
    sock.on("close", () => {
      // Dây đứt KHÔNG có nghĩa là bỏ phần đã nhận: nối nốt rồi mới đóng sổ.
      if (pending.length === 0 && !draining) finish();
    });

    send(
      encodeJson({
        t: "hello",
        deviceId: o.identity.deviceId,
        appVersion: o.appVersion,
        nonce: myNonce,
        initiator,
        mirror: Boolean(o.mirror),
      }),
    );
  });
}

/**
 * Chạy MỘT phiên trên một socket TLS đã bắt tay xong — cho lớp relay (`relay.ts`) dùng lại
 * NGUYÊN giao thức phiên trên một ống đi qua bên thứ ba. Không có bản sao logic thứ hai.
 */
export function runSessionOn(sock: TLSSocket, o: SessionOptions, initiator: boolean): Promise<SyncOutcome> {
  return runSession(sock, o, initiator);
}

/**
 * Trần cho NỐI + BẮT TAY của `connectToPeer`.
 *
 * 🔴 **Thiếu trần ở đây là treo VÔ HẠN, và nó đã xảy ra thật** (máy thứ hai báo 2026-09-22,
 * bản 3.4.1): nối tới một địa chỉ khác mạng mà tường lửa NUỐT gói — TCP bắt tay xong nhưng
 * `ServerHello` không bao giờ tới — thì `tls.connect` chờ mãi, `/channel-sync` `await` nó nên
 * **endpoint không bao giờ trả**, và cửa sổ app đọc thành CHẾT.
 *
 * Đây đúng ca mà `punch.ts` `secure()` đã tả bằng một chú thích dài rồi vá bằng `setTimeout` —
 * nhưng bản vá đó **chỉ áp cho đường đục lỗ**, còn đường gọi thẳng bị bỏ sót. Cùng một cơ chế
 * hỏng, hai đường gọi, vá một nửa: bài học là *vá một ca thì đi soi MỌI chỗ gọi cùng lớp đó*.
 *
 * `error` của socket KHÔNG cứu được ca này: nó chỉ bắn khi TCP hỏng, không bắn khi TCP lành mà
 * TLS im. Và `SessionOptions.timeoutMs` cũng không — đồng hồ đó nằm TRONG `runSession`, tức chỉ
 * chạy SAU khi bắt tay xong.
 */
export const CONNECT_TIMEOUT_MS = 10_000;

/** Gọi sang một máy đã ghép đôi. */
export function connectToPeer(addr: { host: string; port: number }, o: SessionOptions): Promise<SyncOutcome> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (r: SyncOutcome): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(r);
    };
    const giveUp = (code: string): void => {
      try {
        sock.destroy();
      } catch {
        /* đóng được thì tốt */
      }
      done(emptyOutcome(code));
    };
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
        // Bắt tay xong ⇒ trần của PHIÊN (`runSession`) tiếp quản. Giữ đồng hồ này chạy tiếp là
        // cắt ngang một lượt chở khối đang lành.
        clearTimeout(timer);
        void runSession(sock, o, true).then(done);
      },
    );
    // Đồng hồ khai SAU `sock` để nó là `const` (lint), và hai hàm trên vẫn trỏ tới được vì chúng
    // chỉ CHẠY về sau — không có lượt nào đọc `timer` trước khi nó tồn tại.
    const timer = setTimeout(() => giveUp("ETIMEDOUT"), o.connectTimeoutMs ?? CONNECT_TIMEOUT_MS);
    sock.on("error", (e: NodeJS.ErrnoException) => giveUp(e.code ?? e.message));
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
