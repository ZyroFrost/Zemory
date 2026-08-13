// TÁCH TỪ app.js 2026-08-06 — global scope (không IIFE), thứ tự nạp khai ở app.html.
// Cắt CƠ HỌC giữ hành vi; dời hàm giữa file là việc của đợt sau. Xem 06_CHANGES.
// KHUNG quanh canvas: cây thư mục (vẽ + tương tác) · toolbar · 3-way resize seam ·
// loadProjGraph (điều phối). Gọi sang graph-render.js nên phải nạp SAU nó.
  // ── Per-project code graph + folder tree beside it (nodes=files, label=file name,
  //    edges=imports). Structure ↔ graph sync · zoom/pan · kéo node · Ctrl+Z · layouts.
  // gSelIds = NGUỒN SỰ THẬT của lựa chọn trên graph (1 hoặc nhiều node) — xem gPaintSel().
  var curProjRoot='',gData=null,gLoadedRoot=null,gState=null,gview=null,gUndo=[],gRedo=[],gSuppressClick=false,gSelIds=[];
  var gTreeCache=null,gCollapsed={},gTreeRoot='';
  var GCOLORS=['var(--success)','#7fb2e8','var(--primary)','var(--warn)','#b08fe8','#8fd3d3','#c9c98f'];
  function gSlotColor(slot){if(!slot)return 'var(--text-faint)';var h=0;for(var i=0;i<slot.length;i++)h=(h*31+slot.charCodeAt(i))&0xffff;return GCOLORS[h%GCOLORS.length];}
  // ---- folder tree (structure beside graph) ----
  function gCollKey(r){return 'zemory.ptree:'+r;}
  function gLoadColl(r){try{return JSON.parse(localStorage.getItem(gCollKey(r))||'{}')||{};}catch(e){return {};}}
  function gSaveColl(){try{localStorage.setItem(gCollKey(gTreeRoot),JSON.stringify(gCollapsed));}catch(e){}}
  function gTreeNodeHtml(n){
    if(n.isFile)return '<div class="tnode"><div class="trow file" data-path="'+stdEsc(n.path)+'" data-file="1" title="'+stdEsc(n.path)+'"><span class="ttw leaf">▾</span><span class="tfi">📄</span><span class="tname">'+stdEsc(n.name)+'</span></div></div>';
    var kids=n.children&&n.children.length,coll=!!gCollapsed[n.path];
    var role=n.role?'<span class="trole">'+stdEsc(n.role)+'</span>':(n.known?'':'<span class="trole">'+t('gp.offStdTag')+'</span>');
    var tw=kids?'<span class="ttw'+(coll?' collapsed':'')+'" data-tw="'+stdEsc(n.path)+'">▾</span>':'<span class="ttw leaf">▾</span>';
    var h='<div class="tnode'+(coll?' collapsed':'')+'"><div class="trow'+(n.known?'':' unknown')+'" data-path="'+stdEsc(n.path)+'" title="'+stdEsc(n.path)+'">'+tw+'<span class="tname">'+stdEsc(n.name)+'/</span>'+role+'</div>';
    if(kids)h+='<div class="tchildren">'+n.children.map(gTreeNodeHtml).join('')+'</div>';
    return h+'</div>';}
  function gPaintTree(data){var box=zid('pgTree');if(!box)return;var tree=(data&&data.tree)||[];
    if(!tree.length){box.innerHTML='<div class="muted" style="font-size:11.5px">'+t('gp.noDirs')+'</div>';return;}
    var used=(data.usedSlots||[]).length,unk=(data.unknownDirs||[]).length;
    box.innerHTML='<div class="tree-bar"><button class="btn sm" data-tact="collapse" title="'+t('gp.collapseAll')+'">⊟</button><button class="btn sm" data-tact="expand" title="'+t('gp.expandAll')+'">⊞</button></div>'+tree.map(gTreeNodeHtml).join('')+'<div class="tree-legend">'+used+t('gp.stdSlots')+(unk?' · '+unk+t('gp.offStd'):'')+'</div>';}
  function gSetAllColl(on){var d=gTreeCache;if(!d)return;gCollapsed={};if(on){(function walk(ns){ns.forEach(function(n){if(n.children&&n.children.length){gCollapsed[n.path]=true;walk(n.children);}});})(d.tree||[]);}gSaveColl();gPaintTree(d);}
  function gLoadTree(root){var box=zid('pgTree');if(!box)return;gTreeRoot=root;gCollapsed=gLoadColl(root);
    box.innerHTML='<div class="muted" style="font-size:11.5px">'+t('gp.readingTree')+'</div>';
    zGet('/folder-tree?root='+encodeURIComponent(root)).then(function(d){gTreeCache=d;gPaintTree(d);}).catch(function(){box.innerHTML='<div class="muted" style="font-size:11.5px">'+t('gp.treeErr')+'</div>';});}
  // ---- tree interactions (collapse · click folder → dim non-members · click file → select its graph node · click empty area → deselect) ----
  document.addEventListener('click',function(ev){if(!ev.target.closest)return;
    var tree=ev.target.closest('#pgTree');if(!tree)return;
    var tact=ev.target.closest('#pgTree .tree-bar [data-tact]');if(tact){gSetAllColl(tact.dataset.tact==='collapse');return;}
    var tw=ev.target.closest('#pgTree .ttw');if(tw&&!tw.classList.contains('leaf')){var path=tw.dataset.tw;gCollapsed[path]=!gCollapsed[path];gSaveColl();var node=tw.closest('.tnode');if(node)node.classList.toggle('collapsed',!!gCollapsed[path]);tw.classList.toggle('collapsed',!!gCollapsed[path]);return;}
    var r=ev.target.closest('#pgTree .trow');
    if(!r){gDeselectAll();return;} // clicked empty tree space → cancel selection, both sides
    if(r.dataset.file==='1'){gSelectNode(r.dataset.path);return;}
    gHiDir(r.dataset.path);document.querySelectorAll('#pgTree .trow').forEach(function(x){x.classList.remove('active');});r.classList.add('active');});
  // ---- toolbar (layout picker · orphan · giãn cách · tự xếp lại) ----
  document.addEventListener('change',function(e){if(!e.target)return;
    if(e.target.id==='gLayout'){try{localStorage.setItem('zemory.pglayout',e.target.value);}catch(_){}if(gData)paintProjGraph(gData);}
    else if(e.target.id==='gOrphans'){if(gData)paintProjGraph(gData);}
    else if(e.target.id==='gSpacing'){try{localStorage.setItem('zemory.pgspacing',e.target.value);}catch(_){}if(gData)paintProjGraph(gData);}});
  document.addEventListener('input',function(e){if(e.target&&e.target.id==='gSpacing'){var lv=zid('gSpacingVal');if(lv)lv.textContent=parseFloat(e.target.value).toFixed(1)+'×';}});
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#gRebuild')){gLoadedRoot=null;loadProjGraph(curProjRoot,true);}});
  // ── Graph panel layout: collapse folder tree / info panel · 3-way resize
  //    (tree | canvas | panel via 2 seams) · move the info panel between the RIGHT
  //    column and a TOP full-width bar. State persisted in localStorage.
  var gTreeOpen=true,gPanelOpen=true,gPanelPos='right';
  try{gTreeOpen=localStorage.getItem('zemory.g.tree')!=='0';gPanelOpen=localStorage.getItem('zemory.g.panel')!=='0';gPanelPos=(localStorage.getItem('zemory.g.pos')==='top')?'top':'right';}catch(e){}
  function gApplyLayout(){
    var grid=zid('pgGrid');if(!grid)return;
    var top=zid('gPanelTop'),right=zid('gPanelRight'),panel=zid('gPanel'),tree=zid('pgTree');
    var sTree=grid.querySelector('.seam[data-seam="pgtree"]'),sRight=grid.querySelector('.seam[data-seam="pgright"]');
    var toTop=(gPanelPos==='top'&&gPanelOpen);
    if(panel){var host=toTop?top:right;if(host&&panel.parentNode!==host)host.appendChild(panel);
      panel.style.flexDirection=toTop?'row':'column';panel.style.width=toTop?'100%':'';
      for(var i=0;i<panel.children.length;i++)panel.children[i].style.flex=toTop?'1 1 0':'0 0 auto';}
    if(top)top.style.display=toTop?'flex':'none';
    var tw=gTreeOpen?'var(--pgtree,240px) 8px':'0px 0px';
    var rw=(gPanelOpen&&gPanelPos==='right')?'8px var(--pgright,300px)':'0px 0px';
    grid.style.gridTemplateColumns=tw+' minmax(0,1fr) '+rw;
    if(tree)tree.style.display=gTreeOpen?'':'none';
    if(sTree)sTree.style.display=gTreeOpen?'':'none';
    if(right)right.style.display=(gPanelOpen&&gPanelPos==='right')?'':'none';
    if(sRight)sRight.style.display=(gPanelOpen&&gPanelPos==='right')?'':'none';
    var bt=zid('gTreeToggle'),bp=zid('gPanelToggle');if(bt)bt.textContent=gTreeOpen?'◀':'▶';if(bp)bp.textContent=gPanelOpen?'▶':'◀';
    if(gData&&typeof paintProjGraph==='function')paintProjGraph(gData);
  }
  document.addEventListener('click',function(e){
    if(e.target.id==='gTreeToggle'){gTreeOpen=!gTreeOpen;try{localStorage.setItem('zemory.g.tree',gTreeOpen?'1':'0');}catch(x){}gApplyLayout();return;}
    if(e.target.id==='gPanelToggle'){gPanelOpen=!gPanelOpen;try{localStorage.setItem('zemory.g.panel',gPanelOpen?'1':'0');}catch(x){}gApplyLayout();return;}
    if(e.target.id==='gPanelPos'){gPanelPos=(gPanelPos==='top')?'right':'top';try{localStorage.setItem('zemory.g.pos',gPanelPos);}catch(x){}gApplyLayout();return;}
  });
  function loadProjGraph(root,force){var box=zid('gcanvas');if(!box)return;
    if(!root){box.innerHTML='<div class="muted" style="padding:20px">'+t('gp.pickProject')+'</div>';var pt0=zid('pgTree');if(pt0)pt0.innerHTML='';return;}
    try{var sv=localStorage.getItem('zemory.pglayout');if(sv&&zid('gLayout'))zid('gLayout').value=sv;}catch(_){}
    try{var ss=localStorage.getItem('zemory.pgspacing');if(ss&&zid('gSpacing')){zid('gSpacing').value=ss;var lv=zid('gSpacingVal');if(lv)lv.textContent=parseFloat(ss).toFixed(1)+'×';}}catch(_){}
    if(!force&&gLoadedRoot===root&&gData){paintProjGraph(gData);gPaintTree(gTreeCache);return;}
    box.innerHTML='<div class="muted" style="padding:20px">'+t('gp.building')+'</div>';
    gLoadTree(root);gLoadTrend(root);
    zGet('/code-graph?root='+encodeURIComponent(root)).then(function(d){gLoadedRoot=root;paintProjGraph(d);}).catch(function(){box.innerHTML='<div class="muted" style="padding:20px">'+t('gp.buildErr')+'</div>';});}
