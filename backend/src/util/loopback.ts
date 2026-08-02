// Guard "chỉ phục vụ máy này" — dùng chung cho MỌI server HTTP local của zemory
// (daemon UI 4444 và MCP-over-HTTP). Một bản duy nhất: hai bản sao của một luật bảo
// mật là hai chỗ để vá sót (`02_RULES` — 1 tên/concern).
//
// Hai lớp, đã trả giá mới có (xem `06_CHANGES` mục guard của daemon):
//   (a) `Host` phải là tên loopback — trang DNS-rebinding (evil.com trỏ về 127.0.0.1)
//       gửi hostname của chính nó ⇒ rớt. `Origin` lạ cũng rớt.
//   (b) `Sec-Fetch-Site`: trình duyệt gửi header này cho MỌI request kể cả <img>/<script>,
//       nên chặn được cross-site ngay cả trên đường GET. CLI/curl không gửi ⇒ cho qua
//       (fail-open ĐÚNG hướng: chỉ trình duyệt mới là nguồn nguy hiểm ở đây).

import type { IncomingMessage } from "node:http";

export const LOOPBACK = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i;

export type LoopbackVerdict = { ok: true } | { ok: false; why: string };

export function checkLoopback(req: IncomingMessage): LoopbackVerdict {
  const host = req.headers.host ?? "";
  const origin = req.headers.origin ?? "";
  const originHost = origin.replace(/^https?:\/\//i, "");
  if (!LOOPBACK.test(host) || (origin && !LOOPBACK.test(originHost))) {
    return { ok: false, why: "not a loopback host/origin" };
  }
  const site = String(req.headers["sec-fetch-site"] ?? "");
  if (site && site !== "same-origin" && site !== "none") {
    return { ok: false, why: "cross-site request" };
  }
  return { ok: true };
}
