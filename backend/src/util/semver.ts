// So sánh semver — MỘT bản duy nhất cho cả repo.
//
// Vì sao tách ra khỏi `memory/share.ts` (2026-09-15): phép "có bản mới không" nay đo từ git
// (`update/remote-version.ts`), mà module đó chỉ cần đúng hàm này. Nhập `share.js` vào nó là
// kéo NGUYÊN đường đồng bộ (DB · mã hoá · Drive) vào một tiến trình chỉ chạy hai lệnh git —
// cùng lý lẽ đã tách `appVersion`/`uiPort` ra `core/config.ts`. `share.ts` xuất lại tên này
// nên mọi nơi gọi cũ (và cổng `channel-version`) không phải đổi neo.

/** So semver. Trả >0 nếu a mới hơn b. Phần không phải số ⇒ coi là 0 (fail-open). */
export function cmpSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
