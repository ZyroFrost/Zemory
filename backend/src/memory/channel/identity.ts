/**
 * DANH TÍNH MÁY cho kênh máy-tới-máy (plan/24 §1b ① · §7c).
 *
 * Ed25519 → chứng chỉ TỰ KÝ → device ID = base32(SHA-256 của DER).
 * Bên nhận tính lại vân tay từ chứng chỉ đối phương rồi so với ID đã khai ⇒
 * hai máy tin nhau mà KHÔNG cần bên thứ ba làm chứng.
 *
 * 🔴 Vì sao phải TỰ DỰNG DER: `node:crypto` sinh được khoá Ed25519 và ĐỌC được
 * chứng chỉ (`X509Certificate`), nhưng KHÔNG có API TẠO chứng chỉ. Nhờ openssl
 * ngoài thì mất vế "0 dependency" và không máy nào chắc có. Nên ở đây là một bộ
 * mã hoá DER tối thiểu — chỉ đủ cho đúng một hình dạng: chứng chỉ v3 tự ký Ed25519.
 *
 * Chứng chỉ này KHÔNG phải bí mật: nó là khoá CÔNG KHAI, và device ID in ra màn
 * hình thoải mái (khác `share.key` — xem plan/24 §5).
 */
import { generateKeyPairSync, createHash, sign as cryptoSign, randomBytes, X509Certificate, createPrivateKey } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

/** OID 1.3.101.112 (Ed25519), đã mã hoá DER sẵn. */
const OID_ED25519 = Buffer.from([0x06, 0x03, 0x2b, 0x65, 0x70]);
/** OID 2.5.4.3 (commonName). */
const OID_CN = Buffer.from([0x06, 0x03, 0x55, 0x04, 0x03]);

// ── Bộ mã hoá DER tối thiểu ──────────────────────────────────────────────────
/** Độ dài kiểu DER: < 128 thì một byte, còn lại là dạng dài. */
function derLength(n: number): Buffer {
  if (n < 0x80) return Buffer.from([n]);
  const bytes: number[] = [];
  let v = n;
  while (v > 0) {
    bytes.unshift(v & 0xff);
    v >>>= 8;
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}
function tlv(tag: number, value: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), derLength(value.length), value]);
}
const seq = (...parts: Buffer[]): Buffer => tlv(0x30, Buffer.concat(parts));
const set = (...parts: Buffer[]): Buffer => tlv(0x31, Buffer.concat(parts));
/** INTEGER — DER là số CÓ DẤU, nên byte đầu ≥ 0x80 phải chèn 0x00 vào trước. */
function derInteger(raw: Buffer): Buffer {
  let b = raw;
  while (b.length > 1 && b[0] === 0x00 && (b[1] & 0x80) === 0) b = b.subarray(1);
  if (b.length === 0) b = Buffer.from([0x00]);
  if (b[0] & 0x80) b = Buffer.concat([Buffer.from([0x00]), b]);
  return tlv(0x02, b);
}
const derIntSmall = (n: number): Buffer => derInteger(Buffer.from([n]));
/** BIT STRING với 0 bit thừa. */
const derBitString = (value: Buffer): Buffer => tlv(0x03, Buffer.concat([Buffer.from([0x00]), value]));
const derUtf8 = (s: string): Buffer => tlv(0x0c, Buffer.from(s, "utf8"));
/**
 * Thời điểm trong chứng chỉ — CHỌN KHUÔN THEO NĂM, không được ghim một khuôn.
 *
 * 🔴 Bẫy đã trả giá ngay lượt test đầu: `UTCTime` chỉ mang HAI chữ số năm (RFC 5280:
 * hợp lệ 1950–2049), nên hạn 100 năm thành `2126 % 100 = 26` ⇒ mọi bộ đọc hiểu là
 * **2026** và chứng chỉ SINH RA ĐÃ HẾT HẠN. RFC 5280 bắt buộc: tới 2049 dùng
 * `UTCTime`, từ 2050 trở đi dùng `GeneralizedTime` (bốn chữ số năm).
 */
function derTime(d: Date): Buffer {
  const p = (n: number) => String(n).padStart(2, "0");
  const y = d.getUTCFullYear();
  const tail =
    p(d.getUTCMonth() + 1) + p(d.getUTCDate()) +
    p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + "Z";
  return y < 2050
    ? tlv(0x17, Buffer.from(p(y % 100) + tail, "ascii"))        // UTCTime
    : tlv(0x18, Buffer.from(String(y) + tail, "ascii"));        // GeneralizedTime
}
/** Thẻ ngữ cảnh EXPLICIT `[n]`. */
const explicit = (n: number, inner: Buffer): Buffer => tlv(0xa0 | n, inner);

/** Ed25519 dùng AlgorithmIdentifier KHÔNG có tham số (RFC 8410) — không NULL. */
const algEd25519 = (): Buffer => seq(OID_ED25519);
const nameCN = (cn: string): Buffer => seq(set(seq(OID_CN, derUtf8(cn))));

/**
 * Dựng chứng chỉ v3 tự ký cho một khoá Ed25519.
 * Hạn 100 năm: chứng chỉ ở đây chỉ mang VÂN TAY, không có CA nào thu hồi, nên
 * hết hạn chỉ tổ làm hỏng kênh mà không thêm an toàn gì.
 */
export function buildSelfSignedCert(cn: string, keys: { publicKey: Buffer; privateKey: ReturnType<typeof createPrivateKey> }): Buffer {
  const notBefore = new Date(Date.now() - 24 * 3600 * 1000);
  const notAfter = new Date(notBefore.getTime() + 100 * 365 * 24 * 3600 * 1000);
  const tbs = seq(
    explicit(0, derIntSmall(2)),            // version v3
    derInteger(randomBytes(16)),            // serialNumber
    algEd25519(),                           // signature
    nameCN(cn),                             // issuer  (tự ký ⇒ trùng subject)
    seq(derTime(notBefore), derTime(notAfter)),
    nameCN(cn),                             // subject
    keys.publicKey,                         // subjectPublicKeyInfo (SPKI DER)
  );
  const signature = cryptoSign(null, tbs, keys.privateKey);
  return seq(tbs, algEd25519(), derBitString(signature));
}

// ── Danh tính ────────────────────────────────────────────────────────────────
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
/** base32 RFC 4648, không đệm. */
export function base32(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

/**
 * Chữ số kiểm Luhn mod 32 cho một nhóm — bắt LỖI CHÉP, không phải lỗi bảo mật.
 *
 * Vì sao cần (đo 2026-09-15 từ một máy thật): ID không có chữ số kiểm thì chép sai một ký tự
 * lúc ghép đôi **chỉ lộ ra ở bước bắt tay**, và thông báo lúc đó là *"máy lạ, chưa ghép đôi"* —
 * người dùng đi soi tường lửa, soi mạng, soi cổng, trong khi lỗi nằm ở một phím gõ nhầm.
 * `plan/24 §1①` mô tả ID CÓ chữ số kiểm ngay từ đầu; đây là chỗ code chưa theo kịp spec.
 */
export function luhn32(group: string): string {
  const n = B32.length;
  let factor = 1;
  let sum = 0;
  for (const ch of group) {
    const cp = B32.indexOf(ch);
    if (cp < 0) throw new Error(`ký tự ngoài base32: ${ch}`);
    let add = factor * cp;
    factor = factor === 2 ? 1 : 2;
    add = Math.floor(add / n) + (add % n);
    sum += add;
  }
  return B32[(n - (sum % n)) % n];
}

/** Device ID = base32(SHA-256 của DER), nhóm 7 ký tự + 1 chữ số kiểm. */
export function deviceIdFromDer(der: Buffer): string {
  const raw = base32(createHash("sha256").update(der).digest());
  return (raw.match(/.{1,7}/g) ?? []).map((g) => g + luhn32(g)).join("-");
}

/**
 * Bóc chữ số kiểm; `null` khi chuỗi KHÔNG mang chữ số kiểm hợp lệ.
 *
 * Trả `null` cố ý mang hai nghĩa gộp — *"ID đời cũ (chưa có chữ số kiểm)"* và *"chép sai"* — vì
 * ở tầng này không phân biệt được. Người gọi nào cần phân biệt thì dùng `deviceIdLooksTyped`.
 */
function stripChecksum(flat: string): string | null {
  let out = "";
  let i = 0;
  while (i < flat.length) {
    const take = Math.min(8, flat.length - i);
    if (take < 2) return null;
    const body = flat.slice(i, i + take - 1);
    try {
      if (luhn32(body) !== flat[i + take - 1]) return null;
    } catch {
      return null;
    }
    out += body;
    i += take;
  }
  return out;
}

/**
 * Bỏ dấu gạch + hoa hoá, và bóc chữ số kiểm nếu có.
 *
 * Bóc là thứ giữ **tương thích ngược**: một máy đã ghép đôi bằng ID đời cũ (không chữ số kiểm)
 * vẫn khớp với chính nó ở bản mới — nếu so nguyên chuỗi thì bản nâng cấp sẽ cắt mọi cặp đã ghép,
 * tức tự tay dựng lại đúng sự cố mà chữ số kiểm sinh ra để tránh.
 */
export const normalizeDeviceId = (id: string): string => {
  const flat = id.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return stripChecksum(flat) ?? flat;
};

/** `true` khi chuỗi mang chữ số kiểm ĐÚNG — để bề mặt bắt lỗi chép NGAY lúc dán. */
export const deviceIdLooksTyped = (id: string): boolean =>
  stripChecksum(id.replace(/[^A-Za-z0-9]/g, "").toUpperCase()) !== null;

export const sameDeviceId = (a: string, b: string): boolean =>
  normalizeDeviceId(a).length > 0 && normalizeDeviceId(a) === normalizeDeviceId(b);


function pemToDer(pem: string): Buffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  return Buffer.from(b64, "base64");
}
const derToPem = (der: Buffer, label: string): string =>
  `-----BEGIN ${label}-----\n${(der.toString("base64").match(/.{1,64}/g) ?? []).join("\n")}\n-----END ${label}-----\n`;

export interface ChannelIdentity {
  /** Device ID người đọc được, dạng nhóm-7. */
  deviceId: string;
  /** PEM để đưa thẳng cho `node:tls`. */
  certPem: string;
  keyPem: string;
  certDer: Buffer;
}

/**
 * Đọc danh tính từ thư mục, sinh mới nếu chưa có.
 * Khoá riêng ghi mode 0600 — cùng kỷ luật `share.key` (plan/16 §7).
 */
export function loadOrCreateIdentity(dir: string, cn = "zemory"): ChannelIdentity {
  const certPath = join(dir, "device.crt");
  const keyPath = join(dir, "device.key");
  if (existsSync(certPath) && existsSync(keyPath)) {
    const certPem = readFileSync(certPath, "utf8");
    const certDer = pemToDer(certPem);
    return { deviceId: deviceIdFromDer(certDer), certPem, keyPem: readFileSync(keyPath, "utf8"), certDer };
  }
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const spki = publicKey.export({ type: "spki", format: "der" }) as Buffer;
  const certDer = buildSelfSignedCert(cn, { publicKey: spki, privateKey });
  const certPem = derToPem(certDer, "CERTIFICATE");
  const keyPem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
  mkdirSync(dirname(certPath), { recursive: true });
  writeFileSync(certPath, certPem, { mode: 0o600 });
  writeFileSync(keyPath, keyPem, { mode: 0o600 });
  return { deviceId: deviceIdFromDer(certDer), certPem, keyPem, certDer };
}

/**
 * Vân tay của chứng chỉ ĐỐI PHƯƠNG lấy từ socket TLS.
 * `raw` là DER — đúng thứ device ID được băm ra, nên không có chuyện lệch khuôn.
 */
export function peerDeviceId(raw: Buffer | undefined): string | null {
  return raw && raw.length > 0 ? deviceIdFromDer(raw) : null;
}

/** Kiểm chứng chỉ tự dựng có đọc lại được không — dùng cho `doctor`/test. */
export function certIsParsable(der: Buffer): boolean {
  try {
    const x = new X509Certificate(der);
    return typeof x.subject === "string" && x.subject.length > 0;
  } catch {
    return false;
  }
}
