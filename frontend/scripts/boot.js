// TÁCH TỪ app.js 2026-08-06 — global scope (không IIFE), thứ tự nạp khai ở app.html.
// Cắt CƠ HỌC giữ hành vi; dời hàm giữa file là việc của đợt sau. Xem 06_CHANGES.
// Chạy CUỐI: mọi định nghĩa đã nạp. renderHarness() dời từ shell xuống đây —
// nó gọi stdRenderReal (harness.js) mà hồi còn một IIFE thì hoisting che hộ.
  renderHarness();
  zboot();
  // ── restore: theme → sub-tab của từng màn → màn đang mở (go() nạp đúng sub đó)
  try{var st=localStorage.getItem('zemory.app.theme');if(st)setTheme(st);}catch(e){}
  Object.keys(PERSIST).forEach(function(a){try{var v=localStorage.getItem('zemory.sub.'+PERSIST[a]);if(v)subApply(a,v);}catch(_){}});
  // Màn cũ (Sessions · Insights · System · Settings) đã gộp → map sang màn+sub-tab mới,
  // để ai còn lưu tên cũ trong localStorage không mở lên thấy trắng trang.
  var LEGACY={sessions:['recall','sess'],insights:['gmem','mem'],memory:['gmem','sync'],settings:['home',null]};
  try{
    var sc=localStorage.getItem('zemory.app.screen')||'home',lg=LEGACY[sc];
    if(lg){go(lg[0]);if(lg[1])subSet(SUBATTR[lg[0]],lg[1]);}
    else go(TITLES[sc]?sc:'home');
  }catch(e){go('home');}
