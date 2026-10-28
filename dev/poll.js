/* ====================================================================
   INSTANT POLLS  (lecturer: #poll) — questions made on the spot, no course needed.
   A "class" is a poll room with its own permanent QR code / room code (kept in this browser), so students can come back to the same room every week.
   Types: choice (options typed or just A, B, C…), num (students type a number → distribution), word (students type a word → word cloud).
   Same message service as the live quiz; the room state carries kind:'poll' and the current item.
   ==================================================================== */
const PKEY='lq.polls', PVERS='poll1', PTYPES={choice:'Choice', num:'Number', word:'Word / phrase'};
const pollStore = () => { const s=LS.get(PKEY,null); return (s&&Array.isArray(s.classes))?s:{classes:[],last:null}; };
const pollStoreSave = s => LS.set(PKEY,s);
let P=null;
const PSTR={
  en:{wait:'Waiting for the next poll…', in:'You’re in!', poll:'Poll', send:'Send', upd:'Update answer', sent:'✓ Answer received — you can still change it until the results are shown.', num:'Enter a number', word:'Your word or short phrase', res:'Results', mine:'Your answer', n:'answers', none:'No answer submitted', mean:'mean', median:'median', empty:'No answers yet.', bad:'Please enter a number.'},
  de:{wait:'Warten auf die nächste Umfrage…', in:'Sie sind dabei!', poll:'Umfrage', send:'Senden', upd:'Antwort ändern', sent:'✓ Antwort erhalten – bis zur Auflösung können Sie sie noch ändern.', num:'Zahl eingeben', word:'Ihr Wort oder Ausdruck', res:'Ergebnis', mine:'Ihre Antwort', n:'Antworten', none:'Keine Antwort abgegeben', mean:'Mittelwert', median:'Median', empty:'Noch keine Antworten.', bad:'Bitte eine Zahl eingeben.'}
};
const pstr = (L,k) => (PSTR[L]||PSTR.en)[k] || PSTR.en[k];
const fmtN = x => String(+(+x).toPrecision(3));
const parseNum = s => { const v=parseFloat(String(s).trim().replace(',','.')); return (isFinite(v)&&/^[+-]?(\d+([.,]\d*)?|[.,]\d+)(e[+-]?\d+)?$/i.test(String(s).trim()))?v:null; };
const normWord = s => s.toLowerCase().replace(/\s+/g,' ').trim();

/* ---- results (shared by presenter and students) ---- */
function pollResults(it){
  const vals=Object.values(it.answers||{}), n=vals.length;
  if(it.type==='choice'){ const c=it.opts.map(()=>0); vals.forEach(v=>{ if(c[v]!=null) c[v]++; }); return {n, counts:c}; }
  if(it.type==='num'){ return {n, vals:vals.slice().sort((a,b)=>a-b).slice(0,1500)}; }
  const m=new Map(); vals.forEach(v=>{ const k=normWord(v), e=m.get(k); if(e) e.c++; else m.set(k,{w:v.trim(),c:1}); });
  return {n, words:[...m.values()].sort((a,b)=>b.c-a.c||a.w.localeCompare(b.w)).slice(0,80).map(e=>[e.w,e.c])};
}
function histHTML(vals, mine, L){
  if(!vals||!vals.length) return '<p class="muted">'+esc(pstr(L,'empty'))+'</p>';
  const mn=vals[0], mx=vals[vals.length-1], allInt=vals.every(Number.isInteger), bins=[];
  let idx;
  if(allInt && mx-mn<=24){ for(let v=mn;v<=mx;v++) bins.push({c:0,lab:String(v)}); idx=v=>v-mn; }
  else { const k=10, w=(mx-mn)/k||1; for(let i=0;i<k;i++) bins.push({c:0,lab:fmtN(mn+i*w)}); idx=v=>Math.min(k-1,Math.floor((v-mn)/w)); }
  vals.forEach(v=>{ bins[idx(v)].c++; });
  const max=Math.max.apply(null,bins.map(b=>b.c)), mb=(mine!=null&&isFinite(mine)&&mine>=mn&&mine<=mx)?idx(mine):-1;
  const mean=vals.reduce((a,b)=>a+b,0)/vals.length, med=vals.length%2?vals[(vals.length-1)/2]:(vals[vals.length/2-1]+vals[vals.length/2])/2;
  return '<div class="hist">'+bins.map((b,i)=>'<div class="hb"><div class="hv">'+(b.c||'')+'</div><div class="hbar'+(i===mb?' mine':'')+'" style="height:'+Math.round(100*b.c/max)+'%"></div><div class="hl">'+esc(b.lab)+'</div></div>').join('')+'</div>'+
    '<div class="hstats"><span><b>'+vals.length+'</b> '+esc(pstr(L,'n'))+'</span><span>'+esc(pstr(L,'mean'))+' <b>'+fmtN(mean)+'</b></span><span>'+esc(pstr(L,'median'))+' <b>'+fmtN(med)+'</b></span><span>min <b>'+fmtN(mn)+'</b></span><span>max <b>'+fmtN(mx)+'</b></span></div>';
}
function cloudHTML(words, mine, L){
  if(!words||!words.length) return '<p class="muted">'+esc(pstr(L,'empty'))+'</p>';
  const max=words[0][1], mnC=words[words.length-1][1], me=mine?normWord(mine):'';
  const sorted=words.slice().sort((a,b)=>hashStr(a[0])-hashStr(b[0]));
  return '<div class="wcloud">'+sorted.map(([w,c])=>{ const s=max===mnC?1.6:(1+2.6*Math.sqrt((c-mnC)/(max-mnC))); const col=['--c-a','--c-b','--c-c','--c-d'][hashStr(w)%4];
    return '<span class="wc'+(normWord(w)===me?' mine':'')+'" style="font-size:'+s.toFixed(2)+'em;color:var(--'+col.slice(2)+')" title="'+c+'×">'+esc(w)+'</span>'; }).join(' ')+'</div>';
}
function optsResHTML(it, res, mine){
  const tot=res.counts.reduce((a,b)=>a+b,0);
  return '<div class="opts">'+it.opts.map((o,i)=>{ const c=res.counts[i]||0, pct=tot?Math.round(100*c/tot):0;
    return '<div class="opt stat'+(mine===i?' sel':'')+'" style="--pct:'+pct+'%"><span class="k">'+LETTERS[i]+'</span><span class="t">'+(o?esc(o):'')+'</span><span class="cnt">'+c+' · '+pct+'%</span></div>'; }).join('')+'</div>';
}
function pollResBody(it, res, mine, L){
  if(it.type==='choice') return optsResHTML(it,res,mine);
  if(it.type==='num') return histHTML(res.vals,mine,L);
  return cloudHTML(res.words,mine,L);
}

/* ---- presenter: classes ---- */
function viewPoll(){ document.title='Instant poll'; P=null; pollPaint(); document.onkeydown=pollKey; }
function pollLeave(){
  if(!P){ document.onkeydown=null; return; }
  P.dead=true; clearInterval(P.cntT); pollSave();
  P.cls.forEach(cl=>{ try{ if(cl.connected) cl.publish(topic(P.code,'host'),enc({on:false}),{qos:1,retain:true}); cl.end(false); }catch(e){} }); P.cls=[]; P=null;
}
function pollOpen(id){
  const st=pollStore(), c=st.classes.find(x=>x.id===id); if(!c) return;
  const d=LS.get('lq.poll.'+id,null)||{};
  P={ id, name:c.name, code:c.code, lang:c.lang||'en', items:Array.isArray(d.items)?d.items:[], cur:d.cur||null, phase:d.phase||'lobby', rv:d.rv||1,
      draft:Object.assign({type:'choice', q:'', n:4, opts:[]}, d.draft||{}), pres:new Map(), cls:[], ui:{compose:false, overlay:null}, dead:false, status:'connecting' };
  if(P.cur && !P.items.find(x=>x.id===P.cur)){ P.cur=null; P.phase='lobby'; }
  P.ui.compose=!P.cur;
  st.last=id; pollStoreSave(st);
  pollConnect(); P.cntT=setInterval(pollCount,5000); pollPaint();
}
function pollSave(){ if(!P) return; const items=P.items.slice(-300); LS.set('lq.poll.'+P.id,{items, cur:P.cur, phase:P.phase, rv:P.rv, draft:P.draft}); }
let psaveT; function pollSaveSoon(){ clearTimeout(psaveT); psaveT=setTimeout(pollSave,400); }
const pollItem = () => P&&P.cur ? P.items.find(x=>x.id===P.cur)||null : null;
const pollURL = () => location.origin+location.pathname+'?join='+P.code;
function pollState(){
  const it=pollItem(), base={t:'state',kind:'poll',ver:PVERS,code:P.code,rv:P.rv,lang:P.lang,name:P.name};
  if(!it||P.phase==='lobby') return Object.assign(base,{phase:'lobby'});
  const out=Object.assign(base,{phase:P.phase, qid:it.id, item:{id:it.id,type:it.type,q:it.q,opts:it.opts}});
  if(P.phase==='r') out.res=pollResults(it);
  return out;
}
function ppub(t,o,retain){ P.cls.forEach(cl=>{ try{ if(cl.connected) cl.publish(topic(P.code,t),enc(o),{qos:1,retain:!!retain}); }catch(e){} }); }
function pbroadcast(){ ppub('state',pollState(),true); }
function ppersonal(s){ const it=pollItem(); if(!it) return; const a=it.answers||{}; ppub('s/'+s,{qid:it.id, mine:(s in a)?a[s]:null}); }
function pollConnect(){
  if(!P||P.dead) return;
  if(!window.mqtt){ P.status='error:lib'; pollStatus(); setTimeout(pollConnect,3000); return; }
  const me=P, code=P.code;
  P.cls=BROKERS.map(url=>{
    const cl=mqtt.connect(url,{clientId:'sbqp_'+code+'_'+Math.random().toString(36).slice(2,8), clean:true, keepalive:30, connectTimeout:8000, reconnectPeriod:3000,
      protocolVersion:4, will:{topic:topic(code,'host'), payload:enc({on:false}), qos:1, retain:true}});
    cl.on('connect',()=>{
      if(P!==me||me.code!==code) return;
      cl.subscribe([topic(code,'p'),topic(code,'a')],{qos:1});
      cl.publish(topic(code,'host'),enc({on:true,ver:PVERS,poll:true}),{qos:1,retain:true});
      cl.publish(topic(code,'state'),enc(pollState()),{qos:1,retain:true});
      pollStatus();
    });
    cl.on('message',(t,b)=>{ if(P===me&&me.code===code) pollMsg(t.slice(topic(code,'').length), dec(b)); });
    ['close','offline','error','reconnect'].forEach(ev=>cl.on(ev,()=>{ if(P===me) pollStatus(); }));
    return cl;
  });
  pollStatus();
}
function pollMsg(k,m){
  if(!m||!P||typeof m.sid!=='string') return;
  const s=m.sid.slice(0,40);
  if(k==='p'){
    const e=P.pres.get(s); if(m.t==='bye'){ if(e&&e.cid===m.cid) P.pres.delete(s); } else P.pres.set(s,{t:Date.now(),cid:m.cid});
    if(m.t==='hello') ppersonal(s);
    pollCount();
  } else if(k==='a'){
    const e=P.pres.get(s); P.pres.set(s,{t:Date.now(),cid:e?e.cid:m.cid});
    const it=pollItem(); if(!it||P.phase!=='q'||m.qid!==it.id){ ppersonal(s); return; }
    let v=m.v!==undefined?m.v:m.choice;
    if(it.type==='choice'){ if(!Number.isInteger(v)||v<0||v>=it.opts.length) return; }
    else if(it.type==='num'){ if(typeof v!=='number'||!isFinite(v)||Math.abs(v)>1e12) return; }
    else { if(typeof v!=='string') return; v=v.replace(/\s+/g,' ').trim().slice(0,40); if(!v) return; }
    if(!it.answers) it.answers={}; it.answers[s]=v;
    ppersonal(s); pollCount(); pollSaveSoon();
  }
}
function pollPresent(){ if(!P) return 0; const lim=Date.now()-50000; let n=0; P.pres.forEach(e=>{ if(e.t>lim) n++; }); return n; }
function pollCount(){
  if(!P) return; const it=pollItem(), a=it?Object.keys(it.answers||{}).length:0;
  document.querySelectorAll('[data-hc]').forEach(el=>el.textContent=pollPresent());
  document.querySelectorAll('[data-ha]').forEach(el=>el.textContent=a);
}
function pollStatus(){
  const el=document.getElementById('hstat'); if(!el||!P) return;
  const n=P.cls.filter(c=>c.connected).length, N=BROKERS.length; let txt, cls;
  if(P.status==='error:lib'&&!window.mqtt){ txt='Connection library not loaded (offline?)'; cls='off'; }
  else if(n===N){ txt='Room online'; cls='on'; }
  else if(n>0){ txt='Room online ('+n+' of '+N+' message services reachable)'; cls='on'; }
  else { txt='Connecting to the message service…'; cls='wait'; }
  el.innerHTML='<i class="dot '+cls+'"></i> '+txt;
}

/* ---- presenter: screens ---- */
function pollPaint(){
  if(route.name!=='poll') return;
  if(!P) return pollPickerPaint();
  const it=pollItem(), url=pollURL(); let html;
  const bar=(left)=>'<div class="ph">'+left+'<span class="sp"></span><span id="hstat" class="status"></span><button class="btn ghost" data-act="theme" aria-label="Toggle theme">'+THEME_ICON+'</button></div>';
  if(P.ui.compose || !it){
    const d=P.draft, n=Math.max(2,Math.min(8,d.n||4));
    const seg=(v,l)=>'<button class="seg'+(d.type===v?' on':'')+'" data-act="pltype" data-arg="'+v+'">'+l+'</button>';
    const chips=[2,3,4,5,6,7,8].map(k=>'<button class="seg'+(n===k?' on':'')+'" data-act="pln" data-arg="'+k+'">'+k+'</button>').join('');
    const ins=Array.from({length:n},(_,i)=>'<div class="popt"><span class="k">'+LETTERS[i]+'</span><input id="plo'+i+'" data-pl="o'+i+'" maxlength="120" autocomplete="off" placeholder="(empty = just “'+LETTERS[i]+'”)" value="'+esc((d.opts||[])[i]||'')+'"></div>').join('');
    const hist=P.items.slice(-4).reverse().map(x=>'<div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(PTYPES[x.type])+' · '+Object.keys(x.answers||{}).length+' answers · '+esc(x.q||'(no question text)')+'</div>').join('');
    html='<div class="proj">'+bar('<button class="btn ghost" data-act="plclasses">← Classes</button><span class="brand" style="font-size:1em">'+esc(P.name)+' · Instant poll</span>')+
      '<div class="lobby"><div><div class="qrbox">'+qrSvg(url)+'</div></div><div class="stack" style="min-width:0">'+
      '<div class="row" style="gap:20px"><div><div class="muted small">Room code</div><div class="code" style="font-size:clamp(24px,3vw,44px)">'+P.code+'</div></div><div><span class="bigcount" data-hc>'+pollPresent()+'</span> <span class="muted">connected</span></div></div>'+
      '<div class="joinurl">'+esc(url.replace(/^https?:\/\//,''))+'</div>'+
      '<div class="card stack"><div class="row" style="justify-content:space-between"><div class="segs">'+seg('choice','Choice')+seg('num','Number')+seg('word','Word / phrase')+'</div>'+
      '<div class="segs" title="Language of the student page"><button class="seg'+(P.lang==='en'?' on':'')+'" data-act="pllang" data-arg="en">EN</button><button class="seg'+(P.lang==='de'?' on':'')+'" data-act="pllang" data-arg="de">DE</button></div></div>'+
      '<textarea id="plq" data-pl="q" rows="2" class="pin" placeholder="Question (optional – you can also just ask it aloud)">'+esc(d.q||'')+'</textarea>'+
      (d.type==='choice'?'<div class="row small muted" style="gap:8px">Number of answers '+chips+'</div><div class="popts">'+ins+'</div><div class="muted small">Leave the answer texts empty to let students simply vote A, B, C…</div>'
        : '<div class="muted small">'+(d.type==='num'?'Students type a number; the reveal shows the distribution.':'Students type a word or short phrase; the reveal shows a word cloud.')+'</div>')+
      '<div class="row"><button class="btn primary big" data-act="plstart">Start poll ▶</button>'+(it?'<button class="btn" data-act="plcancel">Back to the current poll</button>':'')+'<span class="muted small">Enter in the question field also starts</span></div></div>'+
      (hist?'<div>'+hist+'</div><div class="row"><button class="link small" data-act="plcsv">Download all results (CSV)</button></div>':'')+
      '</div></div></div>';
  } else {
    const rev=P.phase==='r', res=pollResults(it), tot=res.n;
    let body;
    if(rev) body=pollResBody(it,res,null,P.lang);
    else if(it.type==='choice') body='<div class="opts">'+it.opts.map((o,i)=>'<div class="opt"><span class="k">'+LETTERS[i]+'</span><span class="t">'+(o?esc(o):'')+'</span></div>').join('')+'</div>';
    else body='<div class="muted" style="font-size:clamp(18px,2vw,34px);margin-top:14px">'+(it.type==='num'?'Students are entering a number…':'Students are typing a word or short phrase…')+'</div>';
    const tally=rev?'<div class="tally"><span>'+tot+' answer'+(tot===1?'':'s')+'</span></div>':'<div class="anscount"><span>Answers received:</span><span class="anum" data-ha>'+tot+'</span><span class="muted">of <span data-hc>'+pollPresent()+'</span> online</span></div>';
    html='<div class="proj">'+bar('<button class="btn ghost" data-act="plclasses">← Classes</button><span class="lec">'+esc(P.name)+'</span><span class="muted">·</span><span class="pill">'+esc(PTYPES[it.type])+'</span>')+
      '<div class="pm pollm"><div><div class="qtext">'+(it.q?esc(it.q):'<span class="muted">'+(it.type==='choice'?'Vote!':'Answer on your phone')+'</span>')+'</div>'+body+tally+'</div></div>'+
      '<div class="pf"><span class="info">'+T('Join:')+' <b>'+esc(location.host+location.pathname.replace(/index\.html$/,''))+'</b> · code <b>'+P.code+'</b></span>'+
      (rev?'<button class="btn" data-act="plreopen" title="Let students answer again">↺ Reopen</button><button class="btn primary" data-act="plnew" title="Space / N">New poll ▶</button>':'<button class="btn primary" data-act="plreveal" title="Space / →">Reveal results ▶</button>')+
      ''+(rev?'':'<button class="btn" data-act="plnewnow" title="N">New poll</button>')+'<button class="btn" data-act="plqr" title="Q">QR code</button><button class="btn" data-act="hfull" title="F">⛶</button><button class="btn ghost" data-act="theme" aria-label="Toggle theme">'+THEME_ICON+'</button></div></div>';
  }
  if(P.ui.overlay==='qr') html+='<div class="overlay" data-act="plclose"><div class="modal" style="text-align:center"><div class="qrbox">'+qrSvg(url)+'</div><div class="code" style="margin-top:14px">'+P.code+'</div><div class="joinurl" style="margin-top:8px">'+esc(url)+'</div></div></div>';
  app.innerHTML=html; pollStatus(); pollCount(); typeset(app);
  const q=document.getElementById('plq'); if(q&&!P.noFocus){ q.focus(); try{ q.setSelectionRange(q.value.length,q.value.length); }catch(e){} }
}
function pollPickerPaint(){
  const st=pollStore();
  const rows=st.classes.map(c=>'<div class="row" style="gap:10px;margin:8px 0"><div style="flex:1 1 200px;min-width:0"><b>'+esc(c.name)+'</b><div class="muted small">Room code <span class="mono">'+esc(c.code)+'</span> · students '+(c.lang==='de'?'German':'English')+'</div></div>'+
    '<button class="btn '+(st.last===c.id?'primary':'')+'" data-act="plopen" data-arg="'+esc(c.id)+'">Open</button><button class="btn ghost" data-act="pldel" data-arg="'+esc(c.id)+'" title="Delete this class and its results">Delete</button></div>').join('');
  app.innerHTML='<div class="wrap" style="max-width:720px">'+header()+'<h1 style="margin-bottom:6px">Instant poll</h1>'+
    '<p class="muted">Ask questions on the spot. Every class has its own permanent QR code, so students can come back to the same room each week.</p>'+
    '<div class="card stack"><h2>Your classes</h2>'+(rows||'<p class="muted">No class yet — create one below.</p>')+'</div>'+
    '<div class="card stack" style="margin-top:14px"><h2>New class</h2><div class="row"><input id="plname" class="pin" style="flex:1 1 220px" maxlength="40" placeholder="Name, e.g. Systems Biology Mon 10:15"><select id="pllangsel" aria-label="Language of the student page"><option value="en">Students: English</option><option value="de">Students: Deutsch</option></select><button class="btn primary" data-act="plnewclass">Create</button></div></div></div>';
  const i=document.getElementById('plname'); if(i) i.addEventListener('keydown',e=>{ if(e.key==='Enter') ACTS.plnewclass(); });
}
function pollKey(e){
  if(!P||route.name!=='poll'||e.altKey) return; const k=e.key, tg=(e.target||{}).tagName||'';
  if(P.ui.overlay && k==='Escape'){ P.ui.overlay=null; pollPaint(); return; }
  if(P.ui.compose||!pollItem()){
    if(k==='Escape'&&pollItem()){ ACTS.plcancel(); return; }
    if(k==='Enter'&&!e.shiftKey&&(tg==='TEXTAREA'||tg==='INPUT')){
      e.preventDefault(); const id=e.target.id||'';
      if(/^plo\d+$/.test(id)&&!e.ctrlKey){ const nx=document.getElementById('plo'+(+id.slice(3)+1)); if(nx){ nx.focus(); return; } }
      ACTS.plstart();
    }
    return;
  }
  if(e.ctrlKey||e.metaKey||/^(INPUT|TEXTAREA|SELECT)$/.test(tg)) return;
  if(k===' '||k==='ArrowRight'||k==='Enter'||k==='PageDown'){ e.preventDefault(); if(P.phase==='q') ACTS.plreveal(); else ACTS.plnew(); }
  else if(k==='n'||k==='N'){ ACTS.plnewnow(); }
  else if(k==='q'||k==='Q'){ P.ui.overlay=P.ui.overlay==='qr'?null:'qr'; pollPaint(); }
  else if(k==='f'||k==='F'){ ACTS.hfull(); }
}
document.addEventListener('input', e=>{
  const t=e.target; if(!t||!t.dataset||!t.dataset.pl||!P) return; const k=t.dataset.pl;
  if(k==='q') P.draft.q=t.value; else if(/^o\d+$/.test(k)){ P.draft.opts=P.draft.opts||[]; P.draft.opts[+k.slice(1)]=t.value; }
  pollSaveSoon();
});
function pollCSV(){
  const rows=[['class','time','type','question','options','answer']];
  P.items.forEach(it=>{ const t=new Date(it.t||0).toISOString(); Object.values(it.answers||{}).forEach(v=>rows.push([P.name,t,it.type,it.q||'',it.type==='choice'?it.opts.join(' | '):'',it.type==='choice'?LETTERS[v]+(it.opts[v]?': '+it.opts[v]:''):v])); });
  const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='poll-results-'+new Date().toISOString().slice(0,10)+'.csv'; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}
Object.assign(ACTS,{
  plnewclass(){
    const i=document.getElementById('plname'), name=((i&&i.value)||'').trim()||('Class '+(pollStore().classes.length+1)), lang=(document.getElementById('pllangsel')||{}).value||'en';
    const st=pollStore(), id='c'+Date.now().toString(36); st.classes.push({id,name,code:genCode(),lang,created:Date.now()}); st.last=id; pollStoreSave(st); pollOpen(id);
  },
  plopen(id){ pollOpen(id); },
  pldel(id){ const st=pollStore(), c=st.classes.find(x=>x.id===id); if(!c||!confirm('Delete the class “'+c.name+'” with its room code and all collected results?')) return;
    st.classes=st.classes.filter(x=>x.id!==id); if(st.last===id) st.last=null; pollStoreSave(st); try{ localStorage.removeItem('lq.poll.'+id); }catch(e){} pollPaint(); },
  plclasses(){ pollLeave(); pollPaint(); },
  pltype(v){ P.draft.type=v; pollSaveSoon(); P.noFocus=false; pollPaint(); },
  pln(v){ P.draft.n=+v; pollSaveSoon(); pollPaint(); },
  pllang(v){ P.lang=v; const st=pollStore(), c=st.classes.find(x=>x.id===P.id); if(c){ c.lang=v; pollStoreSave(st); } pbroadcast(); pollPaint(); },
  plstart(){
    const d=P.draft, type=d.type||'choice', q=(d.q||'').trim(), n=Math.max(2,Math.min(8,d.n||4));
    const it={ id:'i'+Date.now().toString(36)+Math.random().toString(36).slice(2,4), type, q, t:Date.now(), answers:{} };
    if(type==='choice') it.opts=Array.from({length:n},(_,i)=>((d.opts||[])[i]||'').trim());
    P.items.push(it); P.cur=it.id; P.phase='q'; P.ui.compose=false; pollSave(); pbroadcast(); pollPaint(); window.scrollTo(0,0);
  },
  plcancel(){ P.ui.compose=false; pollPaint(); },
  plnewnow(){ P.ui.compose=true; P.noFocus=false; pollPaint(); },
  plnew(){ P.ui.compose=true; P.noFocus=false; pollPaint(); },
  plreveal(){ if(P.phase!=='q') return; P.phase='r'; pollSave(); pbroadcast(); pollPaint(); },
  plreopen(){ if(P.phase!=='r') return; P.phase='q'; pollSave(); pbroadcast(); pollPaint(); },
  plqr(){ P.ui.overlay='qr'; pollPaint(); },
  plclose(){ P.ui.overlay=null; pollPaint(); },
  plcsv(){ pollCSV(); },
});

/* ---- student side of a poll ---- */
function pollStudentBody(st){
  const L=st.lang||'en', it=st.item, reveal=st.phase==='r', mine=st.mine;
  const head='<div class="qmeta">'+esc(st.name||pstr(L,'poll'))+'</div>';
  if(!it||st.phase==='lobby') return '<div class="card wait"><div class="spin"></div><h2>'+esc(pstr(L,S.status==='on'?'in':'wait'))+'</h2><p class="muted">'+esc(pstr(L,'wait'))+'</p></div>';
  const qh='<div class="qtext">'+(it.q?esc(it.q):'<span class="muted">'+esc(pstr(L,'poll'))+'</span>')+'</div>';
  if(reveal){
    const res=st.res||{n:0};
    const you=mine==null?'<div class="feedback"><b>'+esc(pstr(L,'none'))+'</b></div>':'<div class="feedback"><span class="muted">'+esc(pstr(L,'mine'))+':</span> <b>'+(it.type==='choice'?LETTERS[mine]+(it.opts[mine]?' · '+esc(it.opts[mine]):''):esc(String(mine)))+'</b></div>';
    return '<div class="card">'+head+qh+'<h3 style="margin:14px 0 4px">'+esc(pstr(L,'res'))+' <span class="muted small">('+(res.n||0)+' '+esc(pstr(L,'n'))+')</span></h3>'+pollResBody(it,res,mine,L)+you+'</div>';
  }
  const answered=mine!=null, sent=answered&&(it.type==='choice'?S.sel==null||S.sel===mine:(S.pdraft===undefined||S.pdraft===''||S.pdraft===String(mine)));
  let inp, can;
  if(it.type==='choice'){
    const cur=S.sel!=null?S.sel:mine;
    inp='<div class="opts">'+it.opts.map((o,i)=>'<button class="opt'+(cur===i?' sel':'')+'" data-act="plsel" data-arg="'+i+'"><span class="k">'+LETTERS[i]+'</span><span class="t">'+(o?esc(o):'')+'</span></button>').join('')+'</div>';
    can=S.sel!=null&&S.sel!==mine;
  } else {
    const val=(S.pdraft!==undefined&&S.pdraft!=='')?S.pdraft:(mine!=null?String(mine):'');
    inp='<input id="pin" class="pin big" '+(it.type==='num'?'inputmode="decimal" autocomplete="off" placeholder="'+esc(pstr(L,'num'))+'"':'maxlength="40" autocomplete="off" autocapitalize="none" placeholder="'+esc(pstr(L,'word'))+'"')+' value="'+esc(val)+'" style="margin-top:16px;width:100%">'+(S.perr?'<div class="small" style="color:var(--bad);margin-top:6px">'+esc(pstr(L,'bad'))+'</div>':'');
    can=val.trim()!==''&&val!==String(mine);
  }
  return '<div class="card">'+head+qh+inp+'<div class="row" style="margin-top:16px"><button class="btn primary big grow" data-act="plsend"'+(can?'':' disabled')+'>'+esc(pstr(L,answered?'upd':'send'))+'</button></div>'+(answered?'<div class="feedback" style="margin-top:12px"><span class="muted">'+esc(pstr(L,'sent'))+'</span></div>':'')+'</div>';
}
Object.assign(ACTS,{
  plsel(i){ if(!S||!S.st||S.st.kind!=='poll'||S.st.phase!=='q') return; S.sel=+i; studentPaint(); },
  plsend(){
    if(!S||!S.st||S.st.kind!=='poll'||S.st.phase!=='q'||S.status!=='on') return; const it=S.st.item; let v;
    if(it.type==='choice'){ v=S.sel; if(v==null) return; }
    else if(it.type==='num'){ const el=document.getElementById('pin'); v=parseNum(el?el.value:S.pdraft); if(v==null){ S.perr=true; studentPaint(); return; } S.perr=false; }
    else { const el=document.getElementById('pin'); v=((el?el.value:S.pdraft)||'').replace(/\s+/g,' ').trim().slice(0,40); if(!v) return; }
    if(spub('a',{sid:S.sid,qid:S.st.qid,v},1)){ S.pendingSince=Date.now(); if(it.type!=='choice') S.pdraft=String(v); studentPaint(); }
  },
});
document.addEventListener('input', e=>{ if(S&&e.target&&e.target.id==='pin'){ S.pdraft=e.target.value; S.perr=false; const b=document.querySelector('[data-act=plsend]'); if(b&&S.st&&S.st.item){ const mine=S.st.mine; b.disabled=!(e.target.value.trim()!==''&&e.target.value!==String(mine)); } } });
document.addEventListener('keydown', e=>{ if(e.key==='Enter'&&S&&e.target&&e.target.id==='pin'){ e.preventDefault(); ACTS.plsend(); } });
