// The Harness screen (docs/plan/31): the sets as they are on disk, and building a set from the parts of HS.
// A set is its folder beside HS (no register); saving a draft assembles that folder. Global scope, load order in app.html.
  var HS_SHELVES=[['rules','hs.shRules'],['constitution','hs.shCons'],['structure','hs.shStruc'],['skills','hs.shSkills']];
  var hs={sets:null,cat:null,set:null,part:null,draft:null,report:null,q:'',timer:null};
  // the key a set lists a part by: laws by id, skills and structures by folder
  function hsKey(shelf,p){return shelf==='rules'||shelf==='constitution'?p.id:p.folder;}
  function hsFind(shelf,key){var l=(hs.cat&&hs.cat[shelf])||[];for(var i=0;i<l.length;i++)if(hsKey(shelf,l[i])===key)return l[i];return null;}
  function hsLabel(shelf,key){var p=hsFind(shelf,key);return p?p.name||p.folder:key;}
  function hsList(set,shelf){return shelf==='structure'?(set.structure?[set.structure]:[]):(set[shelf]||[]);}
  function hsCur(){if(!hs.sets)return null;for(var i=0;i<hs.sets.length;i++)if(hs.sets[i].name===hs.set)return hs.sets[i];return null;}

  function hsLoad(force){
    if(hs.sets&&hs.cat&&!force)return Promise.resolve();
    return Promise.all([zGet('/harness-sets'),zGet('/harness-catalog')]).then(function(r){
      hs.sets=(r[0]&&r[0].ok&&r[0].value)||[];hs.cat=(r[1]&&r[1].ok&&r[1].value)||null;
      if(!hsCur())hs.set=hs.sets.length?hs.sets[0].name:null;
    }).catch(function(){hs.sets=hs.sets||[];});
  }

  // ── Sets tab ──────────────────────────────────────────────────────────────
  function hsSetsRender(){
    var box=zid('hsSets');if(!box)return;
    var chips=(hs.sets||[]).map(function(s){return '<button class="fchip'+(s.name===hs.set?' on':'')+'" data-hs-set="'+stdEsc(s.name)+'">'+stdEsc(s.name)+'</button>';});
    chips.push('<button class="fchip" data-act="hs-new">＋ '+stdEsc(t('hs.new'))+'</button>');
    box.innerHTML=chips.join('');
    var c=hsCur(),note=zid('hsSetNote'),ed=zid('hsEdit');
    if(note)note.textContent=c?[c.host,c.tier,c.structure].filter(Boolean).join(' · '):t('hs.noSet');
    if(ed)ed.style.display=c?'':'none';
    var parts=zid('hsSetParts');if(!parts)return;
    if(!c){parts.innerHTML='<div class="muted">'+t('hs.noSet')+'</div>';hsPartRender();return;}
    parts.innerHTML=HS_SHELVES.map(function(sh){
      var l=hsList(c,sh[0]);if(!l.length)return '';
      return '<div class="section-t">'+stdEsc(t(sh[1]))+'</div>'+l.map(function(k){
        var on=hs.part&&hs.part.shelf===sh[0]&&hs.part.key===k;
        return '<div class="ti ind'+(on?' on':'')+'" data-hs-shelf="'+sh[0]+'" data-hs-key="'+stdEsc(k)+'">'+stdEsc(hsLabel(sh[0],k))+'</div>';
      }).join('');
    }).join('');
    hsPartRender();
  }
  var hsPartCache={};
  function hsPartRender(){
    var tt=zid('hsPartTitle'),body=zid('hsPartBody');if(!tt||!body)return;
    var p=hs.part;
    if(!p){tt.textContent='';body.innerHTML='<div class="muted">'+t('hs.pickPart')+'</div>';return;}
    tt.textContent=hsLabel(p.shelf,p.key);
    var ck=p.shelf+'|'+p.key;
    if(hsPartCache[ck]!=null){body.innerHTML=stdMd(hsPartCache[ck]);return;}
    body.innerHTML='<div class="muted">'+t('hs.loading')+'</div>';
    zGet('/harness-part?shelf='+encodeURIComponent(p.shelf)+'&folder='+encodeURIComponent(p.key)).then(function(r){
      var txt=r&&r.ok&&r.value?r.value.text:null;
      if(txt==null){body.innerHTML='<div class="muted">'+t('hs.partErr')+'</div>';return;}
      hsPartCache[ck]=txt;if(hs.part&&hs.part.shelf+'|'+hs.part.key===ck)body.innerHTML=stdMd(txt);
    }).catch(function(){body.innerHTML='<div class="muted">'+t('hs.partErr')+'</div>';});
  }

  // ── Build tab ─────────────────────────────────────────────────────────────
  function hsNewDraft(from){
    var hosts=(hs.cat&&hs.cat.hosts)||[],tiers=(hs.cat&&hs.cat.tiers)||[];
    if(!from)return {host:hosts[0]||'',tier:tiers[0]||'',title:'',structure:'',rules:[],constitution:[],skills:[]};
    // NN_<host>_<title>_<tier>: the title is what sits between host and tier
    var bits=from.name.split('_');
    return {editing:from.name,host:from.host,tier:from.tier,title:bits.slice(2,-1).join('_'),structure:from.structure,
      rules:(from.rules||[]).slice(),constitution:(from.constitution||[]).slice(),skills:(from.skills||[]).slice()};
  }
  function hsHas(shelf,key){var d=hs.draft;return !!d&&(shelf==='structure'?d.structure===key:(d[shelf]||[]).indexOf(key)>=0);}
  function hsAdd(shelf,key){
    var d=hs.draft;if(!d||!hsFind(shelf,key))return;
    if(shelf==='structure')d.structure=key;else if(d[shelf].indexOf(key)<0)d[shelf].push(key);
    hsBuildRender();hsCheckSoon();
  }
  function hsRemove(shelf,key){
    var d=hs.draft;if(!d)return;
    if(shelf==='structure'){if(d.structure===key)d.structure='';}else d[shelf]=d[shelf].filter(function(x){return x!==key;});
    hsBuildRender();hsCheckSoon();
  }
  function hsCatalogRender(){
    var box=zid('hsCatalog');if(!box)return;
    if(!hs.cat){box.innerHTML='<div class="muted">'+t('hs.noCatalog')+'</div>';return;}
    var q=hs.q.toLowerCase();
    box.innerHTML=HS_SHELVES.map(function(sh){
      var rows=(hs.cat[sh[0]]||[]).filter(function(p){return !q||((p.id||'')+' '+(p.name||'')+' '+(p.folder||'')).toLowerCase().indexOf(q)>=0;});
      if(!rows.length)return '';
      return '<div class="section-t">'+stdEsc(t(sh[1]))+'</div>'+rows.map(function(p){
        var k=hsKey(sh[0],p),inDraft=hsHas(sh[0],k);
        return '<div class="ti ind hs-item'+(inDraft?' on':'')+'" draggable="true" data-hs-shelf="'+sh[0]+'" data-hs-key="'+stdEsc(k)+'" title="'+stdEsc(p.folder)+'">'
          +'<span class="hs-nm">'+stdEsc(p.name||p.folder)+'</span>'
          +(inDraft?'':'<button class="btn xs" data-act="hs-add" data-hs-shelf="'+sh[0]+'" data-hs-key="'+stdEsc(k)+'" title="'+stdEsc(t('hs.add'))+'" aria-label="'+stdEsc(t('hs.add'))+'">+</button>')+'</div>';
      }).join('');
    }).join('')||'<div class="muted">'+t('hs.noMatch')+'</div>';
  }
  function hsDraftRender(){
    var box=zid('hsDraft'),d=hs.draft;if(!box||!d)return;
    var hd=zid('hsDraftTitle');if(hd)hd.textContent=d.editing||t('hs.draft');
    box.innerHTML=HS_SHELVES.map(function(sh){
      var l=hsList(d,sh[0]);
      return '<div class="section-t">'+stdEsc(t(sh[1]))+'</div><div class="hs-drop" data-hs-drop="'+sh[0]+'">'+(l.length?l.map(function(k){
        return '<div class="ti ind hs-item" draggable="true" data-hs-shelf="'+sh[0]+'" data-hs-key="'+stdEsc(k)+'" data-hs-in="1"><span class="hs-nm">'+stdEsc(hsLabel(sh[0],k))+'</span>'
          +'<button class="btn xs" data-act="hs-rm" data-hs-shelf="'+sh[0]+'" data-hs-key="'+stdEsc(k)+'" title="'+stdEsc(t('hs.remove'))+'" aria-label="'+stdEsc(t('hs.remove'))+'">×</button></div>';
      }).join(''):'<div class="muted hs-empty">'+stdEsc(t(sh[0]==='structure'?'hs.dropStruc':'hs.dropHere'))+'</div>')+'</div>';
    }).join('');
    var host=zid('hsHost'),tier=zid('hsTier'),title=zid('hsTitle');
    var opt=function(v,cur){return '<option value="'+stdEsc(v)+'"'+(v===cur?' selected':'')+'>'+stdEsc(v)+'</option>';};
    if(host){host.innerHTML=((hs.cat&&hs.cat.hosts)||[]).map(function(v){return opt(v,d.host);}).join('');host.disabled=!!d.editing;}
    if(tier){tier.innerHTML=((hs.cat&&hs.cat.tiers)||[]).map(function(v){return opt(v,d.tier);}).join('');tier.disabled=!!d.editing;}
    // an edited set keeps its folder name: name, host and tier are fixed while editing
    if(title&&document.activeElement!==title){title.value=d.title;title.disabled=!!d.editing;}
  }
  function hsChecksRender(){
    var box=zid('hsChecks'),save=zid('hsSave');if(!box)return;
    var r=hs.report;
    if(!r){box.innerHTML='<div class="muted">'+t('hs.checking')+'</div>';if(save)save.disabled=true;return;}
    var probs=r.problems||[];
    var head='<div class="section-t">'+stdEsc(r.name||'')+'</div>';
    box.innerHTML=head+(probs.length?probs.map(function(p){
      return '<div class="hs-prob">⚠ '+stdEsc(t('hs.p.'+p.code).replace('{a}',p.a||'').replace('{b}',p.b||''))+'</div>';
    }).join(''):'<div class="hs-ok">✓ '+stdEsc(t('hs.canSave'))+'</div>');
    if(save)save.disabled=probs.length>0;
  }
  function hsBuildRender(){hsCatalogRender();hsDraftRender();hsChecksRender();}
  function hsPost(url,body){return fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json();});}
  function hsCheckSoon(){
    if(hs.timer)clearTimeout(hs.timer);
    hs.report=null;hsChecksRender();
    hs.timer=setTimeout(function(){
      var d=hs.draft;if(!d)return;
      hsPost('/harness-check',d).then(function(r){if(hs.draft===d){hs.report=r&&r.ok?r.value:{name:'',problems:[{code:'unknown',a:(r&&r.error)||'?'}]};hsChecksRender();}}).catch(function(){});
    },300);
  }
  function hsOpenBuild(from){
    hs.draft=hsNewDraft(from);hs.report=null;
    if(typeof subSet==='function')subSet('data-ht','build');
    hsBuildRender();hsCheckSoon();
  }
  function hsSave(){
    var d=hs.draft,r=hs.report;if(!d||!r||(r.problems||[]).length)return;
    var btn=zid('hsSave');if(btn)btn.disabled=true;
    // what Save writes, read from the same list assembly works from: each part folder and its number of files
    hsPost('/harness-preview',d).then(function(pv){
      if(btn)btn.disabled=false;
      var w=(pv&&pv.ok&&pv.value&&pv.value.writes)||[];
      var total=w.reduce(function(n,x){return n+x.files;},0);
      var lines=w.map(function(x){return x.path+'  ('+t('hs.files').replace('{n}',x.files)+')';});
      hsConfirmSave(d,r,t('hs.saveBody').replace('{name}',r.name).replace('{n}',w.length).replace('{f}',total)+'\n• '+lines.join('\n• '));
    }).catch(function(){if(btn)btn.disabled=false;});
  }
  function hsConfirmSave(d,r,body){
    zConfirm({title:t('hs.saveTitle'),body:body,okLabel:t('hs.save'),onOk:function(){
      hsPost('/harness-save',d).then(function(res){
        var v=res&&res.ok?res.value:null;
        if(!v||!v.ok){hs.report={name:r.name,problems:((v&&v.errors)||[(res&&res.error)||'?']).map(function(e){return {code:'save',a:e};})};hsChecksRender();return;}
        hs.set=v.name;hs.part=null;hs.draft=null;
        hsLoad(true).then(function(){if(typeof subSet==='function')subSet('data-ht','sets');hsSetsRender();});
      }).catch(function(){});
    }});
  }

  function renderHarness(){
    hsLoad().then(function(){
      hsSetsRender();
      if(!hs.draft)hs.draft=hsNewDraft(null);
      hsBuildRender();if(!hs.report)hsCheckSoon();
    });
  }

  document.addEventListener('click',function(e){
    var el=e.target.closest&&e.target.closest('[data-hs-set],[data-act^="hs-"],#hsSetParts [data-hs-key]');if(!el)return;
    if(el.dataset.hsSet){if(el.dataset.hsSet!==hs.set){hs.set=el.dataset.hsSet;hs.part=null;hsSetsRender();}return;}
    var act=el.getAttribute('data-act');
    if(act==='hs-new'){hsOpenBuild(null);return;}
    if(act==='hs-edit'){var c=hsCur();if(c)hsOpenBuild(c);return;}
    if(act==='hs-add'){hsAdd(el.dataset.hsShelf,el.dataset.hsKey);return;}
    if(act==='hs-rm'){hsRemove(el.dataset.hsShelf,el.dataset.hsKey);return;}
    if(act==='hs-save'){hsSave();return;}
    if(el.dataset.hsKey){hs.part={shelf:el.dataset.hsShelf,key:el.dataset.hsKey};hsSetsRender();}
  });
  document.addEventListener('input',function(e){
    if(e.target.id==='hsCatQ'){hs.q=e.target.value||'';hsCatalogRender();return;}
    if(e.target.id==='hsTitle'&&hs.draft){hs.draft.title=e.target.value||'';hsCheckSoon();}
  });
  document.addEventListener('change',function(e){
    if(!hs.draft)return;
    if(e.target.id==='hsHost'){hs.draft.host=e.target.value;hsCheckSoon();}
    if(e.target.id==='hsTier'){hs.draft.tier=e.target.value;hsCheckSoon();}
  });
  // drag a part from the catalog into the draft, or out of the draft to take it away
  var hsDrag=null;
  document.addEventListener('dragstart',function(e){
    var it=e.target.closest&&e.target.closest('.hs-item');if(!it)return;
    hsDrag={shelf:it.dataset.hsShelf,key:it.dataset.hsKey,inDraft:it.dataset.hsIn==='1'};
    try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',hsDrag.key);}catch(_){}
  });
  document.addEventListener('dragover',function(e){
    if(!hsDrag)return;
    var z=e.target.closest&&e.target.closest('[data-hs-drop],#hsCatalog');if(!z)return;
    if(z.dataset.hsDrop&&z.dataset.hsDrop!==hsDrag.shelf)return; // a part goes on its own shelf only
    e.preventDefault();z.classList.add('hs-over');
  });
  document.addEventListener('dragleave',function(e){var z=e.target.closest&&e.target.closest('.hs-over');if(z)z.classList.remove('hs-over');});
  document.addEventListener('drop',function(e){
    if(!hsDrag)return;
    var z=e.target.closest&&e.target.closest('[data-hs-drop],#hsCatalog');
    document.querySelectorAll('.hs-over').forEach(function(x){x.classList.remove('hs-over');});
    if(z){e.preventDefault();if(z.id==='hsCatalog'){if(hsDrag.inDraft)hsRemove(hsDrag.shelf,hsDrag.key);}else hsAdd(hsDrag.shelf,hsDrag.key);}
    hsDrag=null;
  });
  document.addEventListener('dragend',function(){hsDrag=null;document.querySelectorAll('.hs-over').forEach(function(x){x.classList.remove('hs-over');});});
