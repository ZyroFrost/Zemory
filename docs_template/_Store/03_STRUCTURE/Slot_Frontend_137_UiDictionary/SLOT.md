---
id: Slot_137
aka: 03-137
name: ui-dictionary
version: 3
kind: guide
path: frontend/
applies: [App]
---
# Slot_Frontend_137_UiDictionary ui-dictionary — từ điển slot thiết kế UI/UX

- Vai trò:
  - Nơi skill thiết kế ADAPT hiện ra thật. Skill gốc đầy đủ nằm ở `external/skills/`; agent đọc thẳng bản gốc để lấy ý tưởng thẩm mỹ rồi khớp về các slot dưới đây để ra đúng cấu trúc/ràng buộc của project. Index skill: `04_SKILLS`.
  - Tra như từ điển folder: slot để TRA — chỉ dùng slot có concern thật, không ép đủ bộ. `★` = nên có ở mọi UI · `[opt]` = khi có concern.
  - Ranh giới: STACK (Tailwind / no-build CSS-var / framework) là CẤU TRÚC — cố định theo project, không bàn lại mỗi lần. LAYOUT & GU là thứ agent bàn rồi chốt (`Rule_Keys_62_UiDesignApproval` — thiết kế UI phải trình duyệt trước).
  - Giá trị THẬT (token/palette của repo) sống ở `frontend/styles`, không ở đây.
- A. Nền token:
  - `tokens` ★ — mọi màu/size = CSS-var một chỗ, 0 literal.
  - `theme` ★ — mỗi theme một bộ token đầy đủ; toggle lưu config.
  - `color` [opt] — palette primary / secondary / CTA / bg / text + mood.
  - `typography` [opt] — cặp font heading/body + thang cỡ.
  - `spacing` [opt] — thang spacing + radius + mật độ.
- B. Gu / aesthetic:
  - `ui-style` [opt] — chốt MỘT hướng TRƯỚC khi code (Minimal / Glass / Brutal / Bento / Dark-native / AI-native…) — chống rơi về generic default.
  - `motion` [opt] — transition · micro-interaction · hover; tôn trọng `prefers-reduced-motion`.
  - `depth` [opt] — elevation / shadow / glow, token hoá, tắt được ở light.
  - `iconography` [opt] — phong cách icon nhất quán; icon có 3 vai trò (media UI → `frontend/assets/` · icon exe và icon tray/cửa sổ → `backend/resources/packaging/`).
- C. Component / pattern:
  - `dialog` ★ — 3-size 16:9: S 40% · M 60% · L 90% khung app, `min(Pvw, Pvh*16/9)`; ESC + backdrop đóng, trừ tác vụ bất khả huỷ; khung không nhảy theo nội dung.
  - `layout` [opt] — grid/responsive, lấp đủ khung app, không vh-cap để lại gap.
  - `resizable` ★ — ≥2 panel kề nhau ⇒ BẮT BUỘC seam kéo được: tự do thật · 2D kéo cả hai chiều · MỘT engine data-driven dùng chung (`frontend/components/`, biến layout ở `frontend/styles/`) · lưu + khôi phục · double-click reset.
  - `navigation` [opt] — tab / menu / breadcrumb; nhớ tab qua phiên.
  - `forms` [opt] — input · validate · lỗi hiện inline.
  - `feedback` [opt] — toast · loading · skeleton thay vì nhảy layout.
  - `states` [opt] — empty · loading · error · zero-data: mọi list/panel đủ 4 trạng thái.
  - `data-viz` [opt] — chart/dashboard → dùng skill `dataviz`, chỉ TRỎ, không lặp.
- D. Cổng chất lượng (luôn áp, như pre-delivery check):
  - `accessibility` ★ — WCAG AA: contrast · focus visible · keyboard · ARIA/label · target size.
  - `i18n` ★ — UI = English hoặc i18n đủ 2 dict, 0 chuỗi hardcode.
  - `no-build` ★ — app embed/tĩnh: tách file theo concern, 0 bundler; framework có build chỉ dùng khi STACK của project vốn có bundler.
  - `anti-patterns` ★ — checklist cấm: literal màu · dialog nhảy · layout dịch khi load · low-contrast · icon-only không label · generic default.
- Được chứa / không chứa: chỉ tên slot thiết kế + ràng buộc; không chứa giá trị token thật (→ `frontend/styles`) và không chép đặc tả component của skill `app-design`.
