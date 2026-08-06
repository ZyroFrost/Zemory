// TÁCH TỪ app.js 2026-08-06 — global scope (không IIFE), thứ tự nạp khai ở app.html.
// Cắt CƠ HỌC giữ hành vi; dời hàm giữa file là việc của đợt sau. Xem 06_CHANGES.
// CANVAS: layout · vẽ · zoom/pan/kéo node · chọn (gSelIds là nguồn sự thật) · inspector
// · bộ lọc hạng cạnh · legend · xu hướng fitness. Nạp TRƯỚC graph-panel.js.
  // ---- layouts (force · cluster · layers) ----
  function gRnd(seed){var a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  // Node spacing (user setting): scales the layout's virtual canvas — node/label
  // size stay fixed in viewBox units, so a bigger canvas = more visible gap
  // between nodes (all 3 layouts normalize/fit into this box, so it's a reliable
  // single lever regardless of layout mode).
  function gSpacingK(){var s=zid('gSpacing'),v=s?parseFloat(s.value):1;return (v>0?v:1);}
  function gLayoutCluster(nodes){var sp=gSpacingK(),W=900*sp,H=600*sp,m=30,groups={};nodes.forEach(function(nd){(groups[nd.dir||'(root)']=groups[nd.dir||'(root)']||[]).push(nd);});
    var names=Object.keys(groups).sort(),cols=Math.max(1,Math.ceil(Math.sqrt(names.length*(W/H)))),rows=Math.ceil(names.length/cols),cw=(W-2*m)/cols,ch=(H-2*m)/rows,pos={};
    names.forEach(function(name,gi){var gx=m+(gi%cols)*cw,gy=m+Math.floor(gi/cols)*ch,mem=groups[name].slice().sort(function(a,b){return a.label.localeCompare(b.label);}),gc=Math.max(1,Math.ceil(Math.sqrt(mem.length)));
      mem.forEach(function(nd,i){pos[nd.id]={x:gx+cw*.14+(i%gc)*(cw*.72/gc)+cw*.36/gc,y:gy+ch*.2+Math.floor(i/gc)*(ch*.66/Math.ceil(mem.length/gc))+ch*.12};});});
    return {pos:pos,W:W,H:H};}
  function gLayoutLayers(nodes,edges){var sp=gSpacingK(),W=900*sp,H=600*sp,m=30,depth={};nodes.forEach(function(nd){depth[nd.id]=0;});
    for(var pass=0;pass<Math.min(nodes.length,60);pass++){var chg=false;edges.forEach(function(e){if(depth[e.from]==null||depth[e.to]==null)return;if(depth[e.to]<depth[e.from]+1&&depth[e.from]+1<=nodes.length){depth[e.to]=depth[e.from]+1;chg=true;}});if(!chg)break;}
    var byCol={};nodes.forEach(function(nd){(byCol[depth[nd.id]]=byCol[depth[nd.id]]||[]).push(nd);});
    var keys=Object.keys(byCol).map(Number).sort(function(a,b){return a-b;}),pos={};
    keys.forEach(function(ck,ci){var col=byCol[ck].slice().sort(function(a,b){return (a.dir+a.label).localeCompare(b.dir+b.label);}),x=keys.length===1?W/2:m+ci*((W-2*m)/(keys.length-1));
      col.forEach(function(nd,i){pos[nd.id]={x:x,y:col.length===1?H/2:m+i*((H-2*m)/(col.length-1))};});});
    return {pos:pos,W:W,H:H};}
  function gLayoutForce(nodes,edges){var sp=gSpacingK(),W=900*sp,H=600*sp,n=nodes.length,rnd=gRnd(1337+n),pos={};
    nodes.forEach(function(nd){pos[nd.id]={x:W/2+(rnd()-.5)*W*.8,y:H/2+(rnd()-.5)*H*.8,vx:0,vy:0};});
    var links=edges.filter(function(e){return pos[e.from]&&pos[e.to];}),iters=n>140?160:240;
    for(var it=0;it<iters;it++){var k=1-it/iters;
      for(var i=0;i<n;i++){var a=pos[nodes[i].id];for(var j=i+1;j<n;j++){var b=pos[nodes[j].id];var dx=a.x-b.x,dy=a.y-b.y,d2=dx*dx+dy*dy+.01,f=900/d2;a.vx+=dx*f;a.vy+=dy*f;b.vx-=dx*f;b.vy-=dy*f;}}
      links.forEach(function(e){var a=pos[e.from],b=pos[e.to];var dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy)||1,f=(d-70)*.02;a.vx+=dx/d*f;a.vy+=dy/d*f;b.vx-=dx/d*f;b.vy-=dy/d*f;});
      nodes.forEach(function(nd){var p=pos[nd.id];p.vx+=(W/2-p.x)*.005;p.vy+=(H/2-p.y)*.005;p.x+=p.vx*k*.5;p.y+=p.vy*k*.5;p.vx*=.82;p.vy*=.82;});}
    var mnx=1e9,mny=1e9,mxx=-1e9,mxy=-1e9;nodes.forEach(function(nd){var p=pos[nd.id];mnx=Math.min(mnx,p.x);mny=Math.min(mny,p.y);mxx=Math.max(mxx,p.x);mxy=Math.max(mxy,p.y);});
    var m=34,sx=(W-2*m)/((mxx-mnx)||1),sy=(H-2*m)/((mxy-mny)||1);nodes.forEach(function(nd){var p=pos[nd.id];p.x=m+(p.x-mnx)*sx;p.y=m+(p.y-mny)*sy;});
    return {pos:pos,W:W,H:H};}
  function gMode(){var s=zid('gLayout');return (s&&s.value)||'force';}
  function gLayout(nodes,edges){var mode=gMode();if(mode==='cluster')return gLayoutCluster(nodes);if(mode==='layers')return gLayoutLayers(nodes,edges);return gLayoutForce(nodes,edges);}
  // ---- paint graph ----
  function paintProjGraph(data){var box=zid('gcanvas');if(!box)return;var nodes=(data&&data.nodes)||[],edges=(data&&data.edges)||[];gData=data;gState={nodes:nodes,edges:edges};
    if(!nodes.length){box.innerHTML='<div class="muted" style="padding:20px;max-width:420px">Chưa dựng được graph: code của project này không nằm trên máy này (bộ nhớ xuyên-máy) hoặc không có file nguồn. Graph dựng từ code cục bộ theo đường dẫn project.</div>';gStats(data);return;}
    var orphanOnly=zid('gOrphans')&&zid('gOrphans').checked,orph={};(data.orphans||[]).forEach(function(o){orph[o]=1;});
    gRenderEdgeFilter(data);gRenderLegend(data);
    // Bộ lọc ẩn HẲN khỏi bản vẽ (khác `dim` — dim vẫn chiếm chỗ và vẫn bấm được).
    var hid={};nodes.forEach(function(n){if(gNodeHidden(n))hid[n.id]=1;});
    var L=gLayout(nodes,edges);gState.pos=L.pos;var maxDeg=Math.max(1,Math.max.apply(null,nodes.map(function(n){return n.fanIn+n.fanOut;})));
    var svg='<svg viewBox="0 0 '+L.W+' '+L.H+'" preserveAspectRatio="xMidYMid meet">';
    edges.forEach(function(e){if(gEdgeHidden(e,hid))return;var a=L.pos[e.from],b=L.pos[e.to];if(!a||!b)return;
      svg+='<line class="gedge'+((e.rel==='inferred')?' inferred':'')+'" data-from="'+stdEsc(e.from)+'" data-to="'+stdEsc(e.to)+'" data-kind="'+stdEsc(e.kind||'imports')+'" x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+b.x.toFixed(1)+'" y2="'+b.y.toFixed(1)+'"/>';});
    nodes.forEach(function(nd){if(hid[nd.id])return;var p=L.pos[nd.id];if(!p)return;var deg=nd.fanIn+nd.fanOut,r=3+Math.sqrt(deg/maxDeg)*9,isO=orph[nd.id],cls='gnode'+(isO?' orphan':'')+(orphanOnly&&!isO?' dim':'');
      svg+='<g class="'+cls+'" data-id="'+stdEsc(nd.id)+'" data-dir="'+stdEsc(nd.dir||'')+'"><circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+r.toFixed(1)+'" fill="'+gSlotColor(nd.slot)+'"><title>'+stdEsc(nd.id)+'</title></circle>'+(r>=7?'<text x="'+p.x.toFixed(1)+'" y="'+(p.y-r-2).toFixed(1)+'" text-anchor="middle">'+stdEsc(nd.label)+'</text>':'')+'</g>';});
    svg+='</svg>';box.innerHTML=svg;
    gview={x:0,y:0,w:L.W,h:L.H,W:L.W,H:L.H};gUndo=[];gRedo=[];
    gStats(data);}
  function gMetricName(m){return t(m==='hub_pct'?'graph.mHub':m==='isolated_pct'?'graph.mIso':m==='util_violations'?'graph.mUtil':m);}
  // ── XU HƯỚNG FITNESS ─────────────────────────────────────────────────────────
  // Một mốc = một lần code THẬT SỰ đổi (server chỉ ghi khi chữ ký nguồn khác), nên
  // trục X là nhịp thay đổi của code chứ không phải nhịp mở tab. Cần ≥2 mốc mới có
  // "xu hướng" — 1 mốc thì nói thẳng là chưa đủ, không vẽ đường giả.
  function gTrendLine(vals,mx){
    if(vals.length<2)return '';
    // Trần = mx*1.15 chứ KHÔNG phải mx: chuỗi phẳng (mọi mốc bằng nhau) mà chia cho mx
    // sẽ bị ghim sát mép trên, đọc như "kịch trần" trong khi thực tế là không đổi.
    var top=(mx||1)*1.15,step=100/(vals.length-1);
    return vals.map(function(v,i){return (i*step).toFixed(2)+','+(30-(v/top*28)).toFixed(2);}).join(' ');
  }
  function gRenderTrend(points){
    var box=zid('gTrend');if(!box)return;
    if(!points||!points.length){box.innerHTML='<div class="muted" style="font-size:11.5px">'+t('graph.trendNone')+'</div>';return;}
    if(points.length<2){
      box.innerHTML='<div class="muted" style="font-size:11.5px">'+t('graph.trendOne')+'</div>';return;}
    var names={};points.forEach(function(p){Object.keys(p.values||{}).forEach(function(k){names[k]=1;});});
    var html=Object.keys(names).map(function(k){
      var vals=points.map(function(p){return Number((p.values||{})[k]||0);});
      var mx=vals.reduce(function(a,b){return Math.max(a,b);},0);
      var first=vals[0],last=vals[vals.length-1],dl=last-first;
      // Mọi metric ở đây "thấp hơn = tốt hơn" (hub%, isolated%, số vi phạm).
      var cls=dl>0?'bad':dl<0?'good':'flat',sign=dl>0?'▲ +':dl<0?'▼ ':'= ';
      return '<div style="margin-bottom:10px">'
        +'<div style="display:flex;justify-content:space-between;gap:8px;font-size:11.5px;margin-bottom:3px">'
        +'<span>'+stdEsc(gMetricName(k))+'</span>'
        +'<span class="trend-d '+cls+'">'+sign+(dl===0?'0':Math.abs(dl).toFixed(1))+' · '+last.toFixed(1)+'</span></div>'
        +'<svg class="trendsvg" viewBox="0 0 100 30" preserveAspectRatio="none">'
        +'<polyline points="'+gTrendLine(vals,mx)+'" fill="none" stroke="var(--primary)" stroke-width="1"></polyline></svg></div>';
    }).join('');
    var lbl=points.map(function(p){return String(p.builtAt||'').slice(0,10);});
    box.innerHTML=html+xAxis(lbl,dayShort)
      +'<div class="chart-note">'+points.length+' '+t('graph.trendBuilds')+' · '+t('graph.trendLower')+'</div>';
  }
  function gLoadTrend(root){
    if(!root)return;
    zGet('/graph-fitness-history?root='+encodeURIComponent(root))
      .then(function(d){gRenderTrend((d&&d.points)||[]);})
      .catch(function(){var b=zid('gTrend');if(b)b.innerHTML='<div class="muted" style="font-size:11.5px">'+t('graph.trendNone')+'</div>';});
  }
  // ── Bộ lọc HẠNG CẠNH + legend slot + đếm "đang lọc / tổng" (mượn ý Knowledge Graph
  //    Viewer, user duyệt 2026-07-26). gEdgeOff/gSlotOff = những thứ đang bị TẮT.
  // `slot_unused` (slot chuẩn có khai mà repo chưa dùng) ẩn MẶC ĐỊNH: hữu ích khi cần soi
  // độ phủ chuẩn, nhưng bật sẵn thì ~48 node treo lơ lửng làm rối graph. Bấm legend là hiện.
  var gEdgeOff={},gSlotOff={slot_unused:1};
  function gEdgeKinds(data){var m={};((data&&data.edges)||[]).forEach(function(e){
    var k=e.kind||'imports';(m[k]=m[k]||{n:0,rel:e.rel||'declared'}).n++;});return m;}
  function gRenderEdgeFilter(data){
    var box=zid('gEdgeFilter');if(!box)return;var kinds=gEdgeKinds(data),keys=Object.keys(kinds);
    if(keys.length<2){box.innerHTML='';return;} // 1 hạng thì bộ lọc vô nghĩa
    box.innerHTML=keys.map(function(k){var v=kinds[k];
      return '<label title="'+stdEsc(v.rel==='declared'?t('graph.relDeclared'):t('graph.relInferred'))+'">'
        +'<input type="checkbox" data-ekind="'+stdEsc(k)+'"'+(gEdgeOff[k]?'':' checked')+'> '
        +stdEsc(k)+' <span class="rel">'+stdEsc(v.rel)+'</span> <span class="muted">'+zN(v.n)+'</span></label>';}).join('');
  }
  function gRenderLegend(data){
    var box=zid('gLegend');if(!box)return;var cnt={};
    ((data&&data.nodes)||[]).forEach(function(n){var s=n.type||n.slot||'(ngoài chuẩn)';cnt[s]=(cnt[s]||0)+1;});
    var keys=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a]||a.localeCompare(b);});
    box.innerHTML=keys.map(function(s){
      return '<span class="lg'+(gSlotOff[s]?' off':'')+'" data-slot="'+stdEsc(s)+'" title="'+t('graph.legendTip')+'">'
        +'<span class="dot" style="background:'+gSlotColor(s==='(ngoài chuẩn)'?'':s)+'"></span>'
        +stdEsc(s)+' <span class="n">'+cnt[s]+'</span></span>';}).join('');
  }
  /** Node/cạnh có đang bị bộ lọc ẩn không (dùng chung cho vẽ + đếm). */
  function gNodeHidden(n){return !!gSlotOff[n.type||n.slot||'(ngoài chuẩn)'];}
  function gEdgeHidden(e,hid){return !!gEdgeOff[e.kind||'imports']||hid[e.from]||hid[e.to];}
  document.addEventListener('change',function(ev){var c=ev.target.closest?ev.target.closest('[data-ekind]'):null;if(!c)return;
    var k=c.dataset.ekind;if(c.checked)delete gEdgeOff[k];else gEdgeOff[k]=1;if(gData)paintProjGraph(gData);});
  document.addEventListener('click',function(ev){var l=ev.target.closest?ev.target.closest('#gLegend .lg'):null;if(!l)return;
    var s=l.dataset.slot;if(gSlotOff[s])delete gSlotOff[s];else gSlotOff[s]=1;if(gData)paintProjGraph(gData);});
  function gStats(data){var el=zid('gStats');if(el){var s=data.stats||{};
    // Đếm ĐANG LỌC / TỔNG — thấy ngay bộ lọc đang giấu bao nhiêu (đo trung thực, điều 12).
    var hid={},nShown=0;((data.nodes)||[]).forEach(function(n){if(gNodeHidden(n))hid[n.id]=1;else nShown++;});
    var eAll=(data.edges||[]).length,eShown=(data.edges||[]).filter(function(e){return !gEdgeHidden(e,hid);}).length;
    var nAll=(data.nodes||[]).length;
    var built=data.builtAt?(' · '+t('graph.builtAt')+' '+String(data.builtAt).slice(11,16)):'';
    el.textContent=(nShown===nAll?zN(nAll):zN(nShown)+'/'+zN(nAll))+' node · '
      +(eShown===eAll?zN(eAll):zN(eShown)+'/'+zN(eAll))+' cạnh · '+zN(s.slots||0)+' slot · '
      +((data.orphans||[]).length)+' orphan'+built;}
    var ins=zid('gInspect');if(ins){var f=data.fitness||{},ms=(f.metrics||[]);
      var chips=ms.map(function(m){var pc=m.metric.indexOf('pct')>=0?'%':'';return '<span class="pill '+(m.passed?'ok':'warn')+'" style="margin:0 4px 4px 0" title="'+stdEsc(m.detail||'')+'">'+(m.passed?'✓':'⚠')+' '+stdEsc(gMetricName(m.metric))+' '+m.value+pc+'</span>';}).join('');
      var pass=ms.filter(function(m){return m.passed;}).length;
      ins.innerHTML='<b style="font-size:13px">'+t('graph.overview')+'</b>'
        +'<div class="row" style="margin-top:6px"><span class="nm">Code fitness</span><b style="color:var(--'+(ms.length&&pass===ms.length?'success':'warn')+')">'+pass+'/'+ms.length+' OK</b></div>'
        +(chips?'<div style="margin-top:8px">'+chips+'</div>':'')
        +'<div class="muted" style="font-size:11px;margin-top:8px">'+t('graph.pickNode')+'</div>';}
    gRenderChecks(data);}
  // Checks card = REAL graph-derived (orphan count + fitness metrics with pass/fail
  // + threshold), not the old hardcoded 5/8/OK/OK.
  function gRenderChecks(data){var el=zid('gChecks');if(!el)return;var f=data.fitness||{},ms=(f.metrics||[]),orph=(data.orphans||[]).length;
    var rows='<div class="row"><div class="l"><span class="pill '+(orph?'warn':'ok')+'">'+zN(orph)+'</span><span class="nm">'+t('graph.ckOrphan')+'</span></div><a class="muted">'+t('graph.ckOrphanHint')+'</a></div>';
    ms.forEach(function(m,i){var last=i===ms.length-1,pc=m.metric.indexOf('pct')>=0?'%':'';
      rows+='<div class="row"'+(last?' style="border:0"':'')+'><div class="l"><span class="pill '+(m.passed?'ok':'warn')+'">'+(m.passed?'OK':'⚠')+'</span><span class="nm">'+stdEsc(gMetricName(m.metric))+' '+m.value+pc+'</span></div><a class="muted" title="'+stdEsc(m.detail||'')+'">'+t('graph.ckThreshold')+' '+m.threshold+pc+'</a></div>';});
    el.innerHTML=rows;}
  // ---- zoom/pan/drag node ----
  function gApply(){var svg=document.querySelector('#gcanvas svg');if(svg&&gview)svg.setAttribute('viewBox',gview.x+' '+gview.y+' '+gview.w+' '+gview.h);}
  function gMap(svg,cx,cy){var r=svg.getBoundingClientRect(),s=Math.min(r.width/gview.w,r.height/gview.h),ox=(r.width-gview.w*s)/2,oy=(r.height-gview.h*s)/2;return {x:gview.x+(cx-r.left-ox)/s,y:gview.y+(cy-r.top-oy)/s,s:s};}
  function gMoveNode(id,x,y){var g=document.querySelector('#gcanvas .gnode[data-id="'+id.replace(/"/g,'\\"')+'"]');if(!g)return;var c=g.querySelector('circle');if(!c)return;var r=parseFloat(c.getAttribute('r'))||5;
    c.setAttribute('cx',x.toFixed(1));c.setAttribute('cy',y.toFixed(1));var tx=g.querySelector('text');if(tx){tx.setAttribute('x',x.toFixed(1));tx.setAttribute('y',(y-r-2).toFixed(1));}
    document.querySelectorAll('#gcanvas .gedge').forEach(function(ln){if(ln.dataset.from===id){ln.setAttribute('x1',x.toFixed(1));ln.setAttribute('y1',y.toFixed(1));}if(ln.dataset.to===id){ln.setAttribute('x2',x.toFixed(1));ln.setAttribute('y2',y.toFixed(1));}});
    if(gState&&gState.pos&&gState.pos[id]){gState.pos[id].x=x;gState.pos[id].y=y;}}
  (function(){var box=zid('gcanvas');if(!box)return;
    box.addEventListener('wheel',function(ev){var svg=box.querySelector('svg');if(!svg||!gview)return;ev.preventDefault();var m=gMap(svg,ev.clientX,ev.clientY),k=ev.deltaY>0?1.2:1/1.2,w=Math.min(gview.W*4,Math.max(gview.W/10,gview.w*k)),h=w*gview.H/gview.W;gview.x=m.x-(m.x-gview.x)*(w/gview.w);gview.y=m.y-(m.y-gview.y)*(h/gview.h);gview.w=w;gview.h=h;gApply();},{passive:false});
    var pan=null,ndrag=null,marq=null;
    box.addEventListener('pointerdown',function(ev){var svg=box.querySelector('svg');if(!svg||!gview)return;
      var node=ev.target.closest&&ev.target.closest('.gnode');
      var sc=gMap(svg,ev.clientX,ev.clientY).s;
      if(node){var id=node.dataset.id,p=gState&&gState.pos&&gState.pos[id];if(!p)return;
        // Kéo một node ĐANG nằm trong lựa chọn nhiều ⇒ kéo CẢ NHÓM; ngoài ra kéo một mình.
        var ids=(gSelIds.length>1&&gSelIds.indexOf(id)>=0)?gSelIds.slice():[id];
        var group=ids.map(function(nid){var q=gState.pos[nid];return q?{id:nid,x:q.x,y:q.y}:null;}).filter(Boolean);
        ndrag={id:id,cx:ev.clientX,cy:ev.clientY,s:sc,moved:false,group:group,add:!!(ev.ctrlKey||ev.metaKey)};}
      else if(ev.shiftKey){
        // Shift+kéo nền = BÔI CHỌN nhiều node. Kéo nền TRẦN vẫn là pan (giữ thói quen cũ).
        marq={cx:ev.clientX,cy:ev.clientY,add:!!(ev.ctrlKey||ev.metaKey),el:null,moved:false};}
      else{pan={cx:ev.clientX,cy:ev.clientY,x:gview.x,y:gview.y,s:sc,moved:false};}
      if(box.setPointerCapture)box.setPointerCapture(ev.pointerId);});
    box.addEventListener('pointermove',function(ev){
      if(ndrag){var dx=(ev.clientX-ndrag.cx)/ndrag.s,dy=(ev.clientY-ndrag.cy)/ndrag.s;
        if(!ndrag.moved&&Math.abs(ev.clientX-ndrag.cx)+Math.abs(ev.clientY-ndrag.cy)>4)ndrag.moved=true;
        if(ndrag.moved)ndrag.group.forEach(function(m){gMoveNode(m.id,m.x+dx,m.y+dy);});
        return;}
      if(marq){
        if(!marq.moved&&Math.abs(ev.clientX-marq.cx)+Math.abs(ev.clientY-marq.cy)>3)marq.moved=true;
        if(!marq.moved)return;
        if(!marq.el){marq.el=document.createElement('div');marq.el.className='gmarquee';box.appendChild(marq.el);}
        var r=box.getBoundingClientRect();
        var x1=Math.min(marq.cx,ev.clientX),y1=Math.min(marq.cy,ev.clientY);
        marq.el.style.left=(x1-r.left)+'px';marq.el.style.top=(y1-r.top)+'px';
        marq.el.style.width=Math.abs(ev.clientX-marq.cx)+'px';marq.el.style.height=Math.abs(ev.clientY-marq.cy)+'px';
        marq.lastX=ev.clientX;marq.lastY=ev.clientY;
        return;}
      if(!pan||!gview)return;if(!pan.moved&&Math.abs(ev.clientX-pan.cx)+Math.abs(ev.clientY-pan.cy)>4)pan.moved=true;gview.x=pan.x-(ev.clientX-pan.cx)/pan.s;gview.y=pan.y-(ev.clientY-pan.cy)/pan.s;gApply();});
    // A real drag (node move · marquee · background pan) must not ALSO fire the click-based
    // select/deselect behind it — every path sets gSuppressClick so the click handler below
    // ignores that one click, then clears the flag for next time.
    var endPan=function(){
      if(ndrag&&ndrag.moved){gSuppressClick=true;
        // Một bước undo = CẢ nhóm vừa kéo (không phải mỗi node một bước).
        var moves=ndrag.group.map(function(m){var cur=gState&&gState.pos&&gState.pos[m.id];
          return cur?{id:m.id,from:{x:m.x,y:m.y},to:{x:cur.x,y:cur.y}}:null;}).filter(Boolean);
        if(moves.length){gUndo.push({moves:moves});gRedo=[];}}
      // BẤM (không kéo) một node ⇒ CHỌN ngay tại pointerup, dùng id đã bắt được ở
      // pointerdown. KHÔNG dựa vào event `click`: `setPointerCapture` bên dưới bắt con trỏ
      // về #gcanvas nên click bị đổi target sang canvas, `closest('.gnode')` trả null và
      // handler rơi vào nhánh gDeselectAll ⇒ bấm node KHÔNG chọn được gì (user báo 2026-07-26).
      else if(ndrag&&!ndrag.moved){gSuppressClick=true;if(gState)gSelectNode(ndrag.id,ndrag.add);}
      else if(marq){
        if(marq.moved){gSuppressClick=true;gSelectInRect(marq.cx,marq.cy,marq.lastX,marq.lastY,marq.add);}
        if(marq.el&&marq.el.parentNode)marq.el.parentNode.removeChild(marq.el);}
      else if(pan&&pan.moved){gSuppressClick=true;}
      pan=null;ndrag=null;marq=null;};
    box.addEventListener('pointerup',endPan);box.addEventListener('pointercancel',endPan);
    box.addEventListener('dblclick',function(ev){if(ev.target.closest&&ev.target.closest('.gnode'))return;if(!gview)return;gview.x=0;gview.y=0;gview.w=gview.W;gview.h=gview.H;gApply();});
  })();
  document.addEventListener('keydown',function(ev){if(!(ev.ctrlKey||ev.metaKey))return;var k=(ev.key||'').toLowerCase(),undo=k==='z'&&!ev.shiftKey,redo=k==='y'||(k==='z'&&ev.shiftKey);if(!undo&&!redo)return;
    if(!document.querySelector('.screen[data-s="projects"].on')||!document.querySelector('#projDetail .sub[data-pt="graph"].on'))return;
    if(!gState||!gState.pos)return;var tag=(ev.target&&ev.target.tagName||'').toLowerCase();if(tag==='input'||tag==='textarea')return;
    // Mỗi bước undo là CẢ nhóm vừa kéo (kéo 5 node = 1 lần Ctrl+Z, không phải 5 lần).
    if(undo&&gUndo.length){ev.preventDefault();var c=gUndo.pop();c.moves.forEach(function(m){gMoveNode(m.id,m.from.x,m.from.y);});gRedo.push(c);}
    else if(redo&&gRedo.length){ev.preventDefault();var c2=gRedo.pop();c2.moves.forEach(function(m){gMoveNode(m.id,m.to.x,m.to.y);});gUndo.push(c2);}});
  // ---- node click → select + highlight neighbours + sync tree + inspector ----
  function gHiTreeFolder(dir){document.querySelectorAll('#pgTree .trow').forEach(function(r){r.classList.toggle('active',r.dataset.path===dir);});}
  // Bấm node trên canvas → làm HIỆN dòng file đó trong cây: mở mọi folder cha đang thu
  // gọn, đánh dấu active, rồi cuộn tới. Trị bug user báo 2026-07-25 "bấm node không
  // hiện lên tree": ① `gHiTreeFolder(nd.dir)` bị chính dòng ngay sau ghi đè sạch class
  // active ⇒ highlight chết · ② file nằm trong folder đang collapsed thì có set class
  // cũng KHÔNG ai thấy (không mở cha, không cuộn tới).
  function gRevealTreeFile(id){
    var sel='#pgTree .trow[data-path="'+String(id).replace(/"/g,'\\"')+'"]';
    document.querySelectorAll('#pgTree .trow').forEach(function(x){x.classList.toggle('active',x.dataset.path===id);});
    var row=document.querySelector(sel);if(!row)return;
    var changed=false,p=row.parentElement;
    while(p&&p.id!=='pgTree'){
      if(p.classList&&p.classList.contains('tnode')&&p.classList.contains('collapsed')){
        p.classList.remove('collapsed');
        var head=p.firstElementChild,tw=head&&head.querySelector?head.querySelector('.ttw'):null;
        if(tw){tw.classList.remove('collapsed');if(tw.dataset.tw&&gCollapsed[tw.dataset.tw]){delete gCollapsed[tw.dataset.tw];changed=true;}}
      }
      p=p.parentElement;
    }
    if(changed)gSaveColl();
    // Cuộn TRONG panel cây thôi (scrollIntoView sẽ cuộn cả trang vì .scroll cũng scrollable).
    var host=zid('pgTree');
    if(host){
      var hr=host.getBoundingClientRect(),rr=row.getBoundingClientRect();
      if(rr.top<hr.top+4||rr.bottom>hr.bottom-4)
        host.scrollTop+=(rr.top-hr.top)-(host.clientHeight/2-rr.height/2);
    }
  }
  // Lọc theo folder ⇒ xoá luôn lựa chọn node để không có 2 nguồn sự thật.
  function gHiDir(dir){if(!gState)return;gSelIds=[];document.querySelectorAll('#gcanvas .gnode').forEach(function(x){var under=x.dataset.dir===dir||(x.dataset.dir+'/').indexOf(dir+'/')===0;x.classList.toggle('dim',!under);x.classList.remove('sel');});document.querySelectorAll('#gcanvas .gedge').forEach(function(ln){ln.classList.remove('hot');});}
  // ── LỰA CHỌN: `gSelIds` là NGUỒN SỰ THẬT (1 hoặc nhiều node); mọi cách chọn (bấm node ·
  //    Ctrl+bấm · Shift+bôi · bấm file trong cây) chỉ sửa mảng này rồi gọi gPaintSel().
  //    Nhờ vậy graph ↔ cây ↔ inspector luôn đồng nhất, không nơi nào tự vẽ riêng.
  function gNodeById(id){return gState?gState.nodes.filter(function(x){return x.id===id;})[0]:null;}
  function gPaintSel(){
    var sel={},n=gSelIds.length;gSelIds.forEach(function(id){sel[id]=1;});
    if(!n){
      document.querySelectorAll('#gcanvas .gnode').forEach(function(x){x.classList.remove('sel','dim');});
      document.querySelectorAll('#gcanvas .gedge').forEach(function(ln){ln.classList.remove('hot');});
      document.querySelectorAll('#pgTree .trow').forEach(function(x){x.classList.remove('active');});
      var i0=zid('gInspect');if(i0)i0.innerHTML='<div class="muted" style="font-size:11.5px">'+t('graph.pickNode')+'</div>';
      return;
    }
    // 1 node: làm nổi cả LÁNG GIỀNG (blast-radius, UX cũ). Nhiều node: chỉ làm nổi đúng nhóm
    // đã chọn — kéo theo láng giềng của N node thì sáng gần hết graph, vô nghĩa.
    var keep={};gSelIds.forEach(function(id){keep[id]=1;});
    document.querySelectorAll('#gcanvas .gedge').forEach(function(ln){
      var hot=n===1?(ln.dataset.from===gSelIds[0]||ln.dataset.to===gSelIds[0])
                   :(sel[ln.dataset.from]&&sel[ln.dataset.to]);
      ln.classList.toggle('hot',!!hot);
      if(hot&&n===1){keep[ln.dataset.from]=1;keep[ln.dataset.to]=1;}
    });
    document.querySelectorAll('#gcanvas .gnode').forEach(function(x){
      x.classList.toggle('sel',!!sel[x.dataset.id]);x.classList.toggle('dim',!keep[x.dataset.id]);});
    if(n===1)gRevealTreeFile(gSelIds[0]);
    else document.querySelectorAll('#pgTree .trow').forEach(function(x){x.classList.toggle('active',!!sel[x.dataset.path]);});
    gRenderInspect();
  }
  // Danh sách cạnh ĐI RA / ĐI VÀO có KIỂU, bấm nhảy sang node đó (ý hay nhất mượn được
  // từ Knowledge Graph Viewer). Trước đây inspector chỉ hiện CON SỐ fan-in/out — biết
  // "5 file import mình" mà không biết file nào thì không dùng để tra blast-radius được.
  function gEdgeListHtml(id){
    if(!gState)return '';
    var out=[],inn=[];
    gState.edges.forEach(function(e){
      if(e.from===id)out.push(e);
      else if(e.to===id)inn.push(e);
    });
    function sec(title,rows,otherKey){
      if(!rows.length)return '';
      return '<div class="section-t">'+stdEsc(title)+' ('+rows.length+')</div><div class="eglist">'
        +rows.slice(0,40).map(function(e){var other=e[otherKey];
          return '<div class="eg" data-goto-node="'+stdEsc(other)+'" title="'+stdEsc(other)+'">'
            +'<span class="k">'+stdEsc(e.kind||'imports')+'</span>'
            +'<span class="t">'+stdEsc(other.split('/').pop())+'</span>'
            +'<span class="c">'+(e.count?zN(e.count)+'×':'')+(e.rel==='inferred'?' ~':'')+'</span></div>';}).join('')
        +(rows.length>40?'<div class="muted" style="font-size:10.5px;padding-top:4px">+'+(rows.length-40)+'…</div>':'')
        +'</div>';
    }
    return sec(t('graph.edgeOut'),out,'to')+sec(t('graph.edgeIn'),inn,'from');
  }
  // Bấm một dòng trong danh sách cạnh → chọn node đó (graph + cây + inspector cùng nhảy)
  document.addEventListener('click',function(ev){
    var g=ev.target.closest?ev.target.closest('[data-goto-node]'):null;if(!g)return;
    if(gState)gSelectNode(g.dataset.gotoNode,false);
  });
  function gRenderInspect(){
    var ins=zid('gInspect');if(!ins)return;
    if(gSelIds.length===1){
      var nd=gNodeById(gSelIds[0]);if(!nd){ins.innerHTML='';return;}
      var syms=(nd.symbolsDetail||[]).length?'<div class="muted" style="font-size:10.5px;margin-top:6px;word-break:break-word">'+nd.symbolsDetail.map(function(s){return stdEsc(s.name)+' ('+stdEsc(s.kind)+' L'+s.line+')';}).join(' · ')+'</div>':((nd.symbols||[]).length?'<div class="muted" style="font-size:10.5px;margin-top:6px;word-break:break-word">'+nd.symbols.map(stdEsc).join(' · ')+'</div>':'');
      // Node của LỚP CHUẨN (hp_dieu · skill · plan_spec · slot · concern) không phải file:
      // không có số dòng/symbol, nhưng có `src` = chỗ nó được KHAI BÁO trong docs.
      ins.innerHTML='<b style="font-size:14px">'+stdEsc(nd.label)+'</b><div class="muted" style="font-size:11px;margin-bottom:8px">'
        +'<span class="tagx">'+stdEsc(nd.type||'file')+'</span> '+stdEsc(nd.src||nd.dir||'(root)')+'</div>'
        +'<div class="row"><span class="nm">Fan-in</span><b>'+nd.fanIn+'</b></div><div class="row"><span class="nm">Fan-out</span><b>'+nd.fanOut+'</b></div>'+(nd.loc?'<div class="row"><span class="nm">Dòng</span><b>'+zN(nd.loc)+'</b></div>':'')
        +(nd.touchedBy?'<div class="row"><span class="nm">'+t('graph.touchedBy')+'</span><b>'+zN(nd.touchedBy)+'</b></div>':'')
        +'<div class="row" style="border:0"><span class="nm">'+(nd.loc?'File':'ID')+'</span><span class="muted" style="font-size:10.5px;word-break:break-all">'+stdEsc(nd.id)+'</span></div>'+syms
        +gEdgeListHtml(nd.id);
      return;
    }
    // Nhiều node: tổng hợp ĐO ĐƯỢC (đếm/cộng thẳng từ graph), không suy diễn gì thêm.
    var nds=gSelIds.map(gNodeById).filter(Boolean);
    var loc=nds.reduce(function(a,x){return a+(x.loc||0);},0);
    var inner=0;
    if(gState)gState.edges.forEach(function(e){if(gSelIds.indexOf(e.from)>=0&&gSelIds.indexOf(e.to)>=0)inner++;});
    ins.innerHTML='<b style="font-size:14px">'+nds.length+' '+t('graph.selN')+'</b>'
      +'<div class="muted" style="font-size:11px;margin-bottom:8px">'+t('graph.selHint')+'</div>'
      +'<div class="row"><span class="nm">'+t('graph.selEdges')+'</span><b>'+inner+'</b></div>'
      +'<div class="row"><span class="nm">Fan-in</span><b>'+nds.reduce(function(a,x){return a+(x.fanIn||0);},0)+'</b></div>'
      +'<div class="row"><span class="nm">Fan-out</span><b>'+nds.reduce(function(a,x){return a+(x.fanOut||0);},0)+'</b></div>'
      +'<div class="row" style="border:0"><span class="nm">'+t('graph.selLoc')+'</span><b>'+zN(loc)+'</b></div>'
      +'<div class="muted" style="font-size:10.5px;margin-top:8px;word-break:break-all;max-height:180px;overflow:auto">'
      +nds.map(function(x){return stdEsc(x.id);}).join('<br>')+'</div>';
  }
  /** Chọn/bỏ-chọn 1 node. `additive` (Ctrl/Cmd) = thêm-bớt vào nhóm đang chọn. */
  function gSelectNode(id,additive){
    if(!gState||!gNodeById(id))return;
    if(additive){var i=gSelIds.indexOf(id);if(i>=0)gSelIds.splice(i,1);else gSelIds.push(id);}
    else gSelIds=[id];
    gPaintSel();
  }
  /** BÔI CHỌN: mọi node có tâm nằm trong hình chữ nhật vừa kéo (toạ độ MÀN HÌNH → graph). */
  function gSelectInRect(sx0,sy0,sx1,sy1,additive){
    var box=zid('gcanvas'),svg=box&&box.querySelector('svg');
    if(!svg||!gState||!gState.pos)return;
    var a=gMap(svg,Math.min(sx0,sx1),Math.min(sy0,sy1)),b=gMap(svg,Math.max(sx0,sx1),Math.max(sy0,sy1));
    var hit=gState.nodes.filter(function(nd){var p=gState.pos[nd.id];
      return p&&p.x>=a.x&&p.x<=b.x&&p.y>=a.y&&p.y<=b.y;}).map(function(nd){return nd.id;});
    if(additive)hit.forEach(function(id){if(gSelIds.indexOf(id)<0)gSelIds.push(id);});
    else gSelIds=hit;
    gPaintSel();
  }
  // Cancel any selection — graph (sel/dim/hot) AND tree (active) always move
  // together, never one without the other (user 2026-07-23: "phải luôn đồng
  // nhất với nhau"). Fires on: click empty canvas · click empty tree area.
  function gDeselectAll(){gSelIds=[];gPaintSel();}
  document.addEventListener('click',function(ev){
    var box=zid('gcanvas');if(!box||!ev.target.closest||!box.contains(ev.target))return;
    if(gSuppressClick){gSuppressClick=false;return;} // that click was actually a node-drag or a background pan
    var g=ev.target.closest('.gnode');
    if(g&&gState)gSelectNode(g.dataset.id,!!(ev.ctrlKey||ev.metaKey)); // Ctrl/Cmd = thêm/bớt
    else gDeselectAll(); // clicked empty canvas space → cancel selection, both sides
  });
