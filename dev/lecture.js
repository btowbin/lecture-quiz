/* ====================================================================
   PREPARED LECTURES  (lecturer: #lecture) — an ordered list of polls and quiz questions, presented one after another in ONE room.
   A "lecture" has its own permanent room code / QR code (kept in this browser), a course (where its quiz questions come from) and a list of items:
     {id, kind:'poll', type:'choice'|'num'|'word', q, opts?, correct?}   an instant poll (same types as #poll)
     {id, kind:'quiz', qid}                                              a single-choice question of the course
   The student page already shows either kind: poll states carry kind:'poll', quiz states carry course + qid (like the live quiz).
   Storage (presenter browser): 'lq.lectures' = {lectures:[{id,name,code,lang,course,created}], last}; 'lq.lecture.<id>' = {items, run, draft}.
   run = {cur: item id, phase: 'lobby'|'q'|'r'|'c', pph: phase before a pause, rv, answers:{itemId:{studentId:value}}}.
   JSON export / import: 'Download JSON' in the editor, 'Load from file' on the lecture list.
   ==================================================================== */
const LKEY='lq.lectures', LVERS='lecture1', LFORMAT='lecture-quiz-lecture';
const lecStore = () => { const s=LS.get(LKEY,null); return (s&&Array.isArray(s.lectures))?s:{lectures:[],last:null}; };
const lecStoreSave = s => LS.set(LKEY,s);
const lid = () => 'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
let Lc=null;

/* ---- helpers on items ---- */
const lcValid = it => it.kind==='quiz' ? !!(COURSE && Lc.course===COURSE.id && byId[it.qid]) : true;
const lcList = () => Lc.items.filter(lcValid);
const lcCur = () => Lc.run.cur ? lcList().find(x=>x.id===Lc.run.cur)||null : null;
const lcQid = it => it.kind==='quiz' ? it.qid : it.id;                 // what the students see as qid
const lcAns = it => Lc.run.answers[it.id] || (Lc.run.answers[it.id]={});
const lcPit = it => ({type:it.type, opts:it.opts, answers:lcAns(it)});   // poll item in the shape pollResults() expects
const lcHasCorrect = it => it.kind==='poll' && it.type==='choice' && it.correct!=null;
const LC_GREEK={alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',theta:'θ',lambda:'λ',mu:'μ',pi:'π',sigma:'σ',tau:'τ',omega:'ω',Delta:'Δ',cdot:'·',times:'×',to:'→',rightarrow:'→',leq:'≤',geq:'≥',approx:'≈',pm:'±',infty:'∞'};
const lcPlain = s => String(s||'').replace(/<[^>]*>/g,'').replace(/\\(?:mathrm|mathbf|text|textbf|mathit)\{([^}]*)\}/g,'$1').replace(/\\([A-Za-z]+)/g,(m,w)=>LC_GREEK[w]||w).replace(/[$\\{}^_]/g,'').replace(/\s+/g,' ').trim();
const lcLabel = (it,n) => { const q=it.kind==='quiz'?byId[it.qid]:null; const t=q?(q.topic||q.id):(it.q||PTYPES[it.type]); const s=lcPlain(t); return (n&&s.length>n)?s.slice(0,n)+'…':s; };
function lcQuizCounts(it){ const q=byId[it.qid], c=q.opts.map(()=>0); Object.values(lcAns(it)).forEach(v=>{ if(c[v]!=null) c[v]++; }); return c; }
function lcAnswered(it){ const a=Lc.run.answers[it.id]; return a?Object.keys(a).length:0; }
function lcCleanItem(x){
  if(!x||typeof x!=='object') return null;
  if(x.kind==='quiz'){ const q=String(x.qid||'').slice(0,40); return q?{id:lid(),kind:'quiz',qid:q}:null; }
  const type=['choice','num','word'].includes(x.type)?x.type:null; if(!type) return null;
  const it={id:lid(),kind:'poll',type,q:String(x.q||'').slice(0,500)};
  if(type==='choice'){
    let o=Array.isArray(x.opts)?x.opts.slice(0,8).map(v=>String(v==null?'':v).slice(0,120)):[]; if(o.length<2) o=['','','',''];
    it.opts=o; if(Number.isInteger(x.correct)&&x.correct>=0&&x.correct<o.length) it.correct=x.correct;
  }
  return it;
}

/* ---- open / save / leave ---- */
function lectureOpen(id){
  const st=lecStore(), meta=st.lectures.find(x=>x.id===id); if(!meta) return;
  const d=LS.get('lq.lecture.'+id,null)||{};
  if(meta.course && COURSES[meta.course]) useCourse(meta.course);
  const run=Object.assign({cur:null,phase:'lobby',pph:null,rv:1,answers:{}}, d.run||{}); if(!run.answers||typeof run.answers!=='object') run.answers={};
  Lc={ id, name:meta.name, code:meta.code, lang:meta.lang||'en', course:meta.course||null, items:Array.isArray(d.items)?d.items:[], run,
       draft:Object.assign({type:'choice',q:'',n:4,opts:[]}, d.draft||{}), mode:'edit', pres:new Map(), cls:[], ui:{overlay:null,exp:false,msg:'',qlec:null,qdiff:[1,2,3]}, dead:false, status:'connecting' };
  if(Lc.run.cur && !lcCur()){ Lc.run.cur=null; Lc.run.phase='lobby'; Lc.run.pph=null; }
  st.last=id; lecStoreSave(st);
  lcConnect(); Lc.cntT=setInterval(lcCount,5000); lcPaint();
}
function lcSave(){ if(!Lc) return; LS.set('lq.lecture.'+Lc.id,{items:Lc.items, run:Lc.run, draft:Lc.draft}); }
let lcSaveT; function lcSaveSoon(){ clearTimeout(lcSaveT); lcSaveT=setTimeout(lcSave,400); }
function lcSaveMeta(){ const st=lecStore(), m=st.lectures.find(x=>x.id===Lc.id); if(m){ m.name=Lc.name; m.lang=Lc.lang; lecStoreSave(st); } }
function lectureLeave(){
  if(!Lc){ document.onkeydown=null; return; }
  Lc.dead=true; clearInterval(Lc.cntT); lcSave();
  Lc.cls.forEach(cl=>{ try{ if(cl.connected) cl.publish(topic(Lc.code,'host'),enc({on:false}),{qos:1,retain:true}); cl.end(false); }catch(e){} }); Lc.cls=[]; Lc=null;
}
window.addEventListener('pagehide',()=>{ if(Lc) lcSave(); });
const lcURL = () => location.origin+location.pathname+'?join='+Lc.code;

/* ---- room: state sent to the students ---- */
function lcState(){
  const base={t:'state',code:Lc.code,rv:Lc.run.rv,lang:Lc.lang,name:Lc.name};
  const it=lcCur(), ph=Lc.run.phase;
  if(!it||ph==='lobby') return Object.assign(base,{kind:'poll',ver:LVERS,phase:'lobby'});
  if(it.kind==='quiz'){
    const q=byId[it.qid], quizzes=lcList().filter(x=>x.kind==='quiz');
    const out=Object.assign(base,{ver:VER,course:COURSE.id,phase:ph,qid:q.id,n:quizzes.indexOf(it)+1,N:quizzes.length});
    if(ph==='r'){ out.counts=lcQuizCounts(it); out.correct=correctOf(q); }
    return out;
  }
  const out=Object.assign(base,{kind:'poll',ver:LVERS,phase:ph,qid:it.id,item:{id:it.id,type:it.type,q:it.q,opts:it.opts}});
  if(ph==='r'||ph==='c') out.res=pollResults(lcPit(it));
  if(ph==='c'&&it.correct!=null) out.correct=it.correct;
  return out;
}
function lpub(t,o,retain){ Lc.cls.forEach(cl=>{ try{ if(cl.connected) cl.publish(topic(Lc.code,t),enc(o),{qos:1,retain:!!retain}); }catch(e){} }); }
function lcBroadcast(){ lpub('state',lcState(),true); }
function lcPersonal(s){ const it=lcCur(); if(!it) return; const a=Lc.run.answers[it.id]||{}; lpub('s/'+s,{qid:lcQid(it),mine:(s in a)?a[s]:null}); }
function lcConnect(){
  if(!Lc||Lc.dead) return;
  if(!window.mqtt){ Lc.status='error:lib'; lcStatus(); setTimeout(lcConnect,3000); return; }
  const me=Lc, code=Lc.code;
  Lc.cls=BROKERS.map(url=>{
    const cl=mqtt.connect(url,{clientId:'sbql_'+code+'_'+Math.random().toString(36).slice(2,8), clean:true, keepalive:30, connectTimeout:8000, reconnectPeriod:3000,
      protocolVersion:4, will:{topic:topic(code,'host'), payload:enc({on:false}), qos:1, retain:true}});
    cl.on('connect',()=>{
      if(Lc!==me||me.code!==code) return;
      cl.subscribe([topic(code,'p'),topic(code,'a')],{qos:1});
      cl.publish(topic(code,'host'),enc({on:true,ver:LVERS,lecture:true}),{qos:1,retain:true});
      cl.publish(topic(code,'state'),enc(lcState()),{qos:1,retain:true});
      lcStatus();
    });
    cl.on('message',(t,b)=>{ if(Lc===me&&me.code===code) lcMsg(t.slice(topic(code,'').length), dec(b)); });
    ['close','offline','error','reconnect'].forEach(ev=>cl.on(ev,()=>{ if(Lc===me) lcStatus(); }));
    return cl;
  });
  lcStatus();
}
function lcMsg(k,m){
  if(!m||!Lc||typeof m.sid!=='string') return;
  const s=m.sid.slice(0,40);
  if(k==='p'){
    const e=Lc.pres.get(s); if(m.t==='bye'){ if(e&&e.cid===m.cid) Lc.pres.delete(s); } else Lc.pres.set(s,{t:Date.now(),cid:m.cid});
    if(m.t==='hello') lcPersonal(s);
    lcCount();
  } else if(k==='a'){
    const e=Lc.pres.get(s); Lc.pres.set(s,{t:Date.now(),cid:e?e.cid:m.cid});
    const it=lcCur(); if(!it||Lc.run.phase!=='q'||m.qid!==lcQid(it)){ lcPersonal(s); return; }
    let v=m.v!==undefined?m.v:m.choice;
    if(it.kind==='quiz'){ if(!Number.isInteger(v)||v<0||v>=byId[it.qid].opts.length) return; if(s in lcAns(it)){ lcPersonal(s); return; } }      // quiz: first answer counts
    else if(it.type==='choice'){ if(!Number.isInteger(v)||v<0||v>=it.opts.length) return; }
    else if(it.type==='num'){ if(typeof v!=='number'||!isFinite(v)||Math.abs(v)>1e12) return; }
    else { if(typeof v!=='string') return; v=v.replace(/\s+/g,' ').trim().slice(0,40); if(!v) return; }
    lcAns(it)[s]=v; lcPersonal(s); lcCount(); lcSaveSoon();
  }
}
const lcPresent = () => { if(!Lc) return 0; const lim=Date.now()-50000; let n=0; Lc.pres.forEach(e=>{ if(e.t>lim) n++; }); return n; };
function lcCount(){
  if(!Lc) return; const it=lcCur();
  document.querySelectorAll('[data-hc]').forEach(el=>el.textContent=lcPresent());
  document.querySelectorAll('[data-ha]').forEach(el=>el.textContent=it?lcAnswered(it):0);
}
function lcStatus(){
  const el=document.getElementById('hstat'); if(!el||!Lc) return;
  const n=Lc.cls.filter(c=>c.connected).length, N=BROKERS.length; let txt, cls;
  if(Lc.status==='error:lib'&&!window.mqtt){ txt='Connection library not loaded (offline?)'; cls='off'; }
  else if(n===N){ txt='Room online'; cls='on'; }
  else if(n>0){ txt='Room online ('+n+' of '+N+' message services reachable)'; cls='on'; }
  else { txt='Connecting to the message service… (if this stays: the network blocks '+BROKERS.map(hostOf).join(' and ')+')'; cls='wait'; }
  el.innerHTML='<i class="dot '+cls+'"></i> '+txt;
}

/* ---- running the lecture ---- */
function lcSetPhase(ph,id){ Lc.run.phase=ph; if(id!==undefined) Lc.run.cur=id; if(ph!=='lobby') Lc.run.pph=null; Lc.ui.exp=false; lcSave(); lcBroadcast(); lcPaint(); window.scrollTo(0,0); }
function lcAdvance(){
  const list=lcList(); if(!list.length) return;
  const ph=Lc.run.phase, it=lcCur();
  if(ph==='lobby'||!it){ lcSetPhase(it?(Lc.run.pph||'q'):'q', it?it.id:list[0].id); }
  else if(ph==='q') lcSetPhase('r');
  else if(ph==='r'&&lcHasCorrect(it)) lcSetPhase('c');
  else { const i=list.indexOf(it); if(i+1<list.length) lcSetPhase('q',list[i+1].id); else { Lc.ui.overlay='done'; lcPaint(); } }
}
function lcBack(){
  const list=lcList(), it=lcCur(); if(!it||Lc.run.phase==='lobby') return; const ph=Lc.run.phase;
  if(ph==='c') lcSetPhase('r'); else if(ph==='r') lcSetPhase('q');
  else { const i=list.indexOf(it); if(i>0){ const pv=list[i-1]; lcSetPhase(lcHasCorrect(pv)?'c':'r',pv.id); } else lcSetPhase('lobby'); }
}
function lcPause(){ if(Lc.run.phase==='lobby') return; const ph=Lc.run.phase; Lc.run.phase='lobby'; Lc.run.pph=ph; lcSave(); lcBroadcast(); lcPaint(); }
function lcKey(e){
  if(!Lc||route.name!=='lecture'||e.ctrlKey||e.metaKey||e.altKey) return; const k=e.key, tg=(e.target||{}).tagName||'';
  if(Lc.ui.overlay && k==='Escape'){ Lc.ui.overlay=null; lcPaint(); return; }
  if(Lc.mode!=='run' || /^(INPUT|TEXTAREA|SELECT)$/.test(tg)) return;
  if(Lc.ui.overlay) return;
  if(k===' '||k==='ArrowRight'||k==='Enter'||k==='PageDown'){ if(/^BUTTON$/.test(tg)&&k!==' '&&k!=='ArrowRight'&&k!=='PageDown') return; e.preventDefault(); lcAdvance(); }
  else if(k==='ArrowLeft'||k==='PageUp'){ e.preventDefault(); lcBack(); }
  else if(k==='r'||k==='R'){ if(Lc.run.phase==='q') lcSetPhase('r'); }
  else if(k==='e'||k==='E'){ Lc.ui.exp=!Lc.ui.exp; lcPaint(); }
  else if(k==='p'||k==='P'){ if(Lc.run.phase==='lobby') lcAdvance(); else lcPause(); }
  else if(k==='l'||k==='L'){ Lc.ui.overlay='list'; lcPaint(); }
  else if(k==='q'||k==='Q'){ Lc.ui.overlay=Lc.ui.overlay==='qr'?null:'qr'; lcPaint(); }
  else if(k==='f'||k==='F'){ ACTS.hfull(); }
}

/* ---- views ---- */
function viewLecture(){ document.title='Prepare lecture'; Lc=null; lcPaint(); document.onkeydown=lcKey; }
function lcPaint(){
  if(route.name!=='lecture') return;
  if(!Lc) return lcPickerPaint();
  if(Lc.mode==='run') lcRunPaint(); else lcEditPaint();
  lcStatus(); lcCount(); typeset(app);
}
function lcPickerPaint(){
  const st=lecStore(), act=activeCourses();
  const rows=st.lectures.map(m=>{ const d=LS.get('lq.lecture.'+m.id,{})||{}, n=(d.items||[]).length, c=COURSES[m.course];
    return '<div class="row" style="gap:10px;margin:8px 0"><div style="flex:1 1 200px;min-width:0"><b>'+esc(m.name)+'</b><div class="muted small">'+n+' item'+(n===1?'':'s')+' · '+(c?esc(c.title):(m.course?esc(m.course)+' (not available)':'no course'))+' · room code <span class="mono">'+esc(m.code)+'</span> · students '+(m.lang==='de'?'German':'English')+'</div></div>'+
      '<button class="btn '+(st.last===m.id?'primary':'')+'" data-act="lcopen" data-arg="'+esc(m.id)+'">Open</button><button class="btn ghost" data-act="lcdelete" data-arg="'+esc(m.id)+'" title="Delete this lecture and its results">Delete</button></div>'; }).join('');
  const opts=act.map(c=>'<option value="'+esc(c.id)+'"'+(COURSE&&COURSE.id===c.id?' selected':'')+'>'+esc(c.title)+'</option>').join('')+'<option value="">(no course — polls only)</option>';
  app.innerHTML='<div class="wrap" style="max-width:760px">'+header()+'<h1 style="margin-bottom:6px">Prepare lecture</h1>'+
    '<p class="muted">Build a lecture in advance: polls and quiz questions in one ordered list. In the lecture they follow one another in a single room, so students scan one QR code once and stay in it.</p>'+
    '<div class="card stack"><h2>Your lectures</h2>'+(rows||'<p class="muted">No lecture yet — create one below.</p>')+'</div>'+
    '<div class="card stack" style="margin-top:14px"><h2>New lecture</h2><div class="row"><input id="lcnewname" class="pin" style="flex:1 1 240px" maxlength="60" placeholder="Name, e.g. Transgenic organisms HS26">'+
    '<select id="lcnewcourse" aria-label="Course for the quiz questions" title="Course the quiz questions come from">'+opts+'</select><select id="lcnewlang" aria-label="Language of the student page"><option value="en">Students: English</option><option value="de">Students: Deutsch</option></select><button class="btn primary" data-act="lcnew">Create</button></div>'+
    '<div class="row small muted" style="gap:10px">or <button class="btn" data-act="lcloadpick">Load from file (JSON)…</button><input id="lcfile" type="file" accept=".json,application/json" style="display:none"><span id="lcpickmsg">'+esc(lcPickMsg)+'</span></div></div>'+
    '<p class="muted small" style="margin-top:20px"><button class="link" data-act="back">← Back</button></p></div>';
  const i=document.getElementById('lcnewname'); if(i) i.addEventListener('keydown',e=>{ if(e.key==='Enter') ACTS.lcnew(); });
}
let lcPickMsg='';

function lcDraftSpec(){
  const d=Lc.draft, type=d.type||'choice', n=Math.max(2,Math.min(8,d.n||4)), sp={type, q:(d.q||'').trim()};
  if(type==='choice'){ sp.opts=Array.from({length:n},(_,i)=>((d.opts||[])[i]||'').trim()); if(Number.isInteger(d.correct)&&d.correct>=0&&d.correct<n) sp.correct=d.correct; }
  return sp;
}
function lcRow(it,i,N){
  let tx, pill;
  if(it.kind==='quiz'){
    const q=byId[it.qid];
    if(COURSE&&Lc.course===COURSE.id&&q){ pill='<span class="pill">Quiz</span>'; tx='<b>'+esc(q.id+' · '+(q.topic||''))+'</b><div class="muted small">'+esc(lcPlain(q.q).slice(0,110))+'</div>'; }
    else { pill='<span class="pill" style="background:var(--bad);color:#fff">Missing</span>'; tx='<b>'+esc(it.qid)+'</b><div class="muted small">Question not found in the course — it is skipped when presenting.</div>'; }
  } else {
    pill='<span class="pill">'+esc(PTYPES[it.type])+'</span>';
    tx='<b>'+esc(it.q||'(no question text)')+'</b><div class="muted small">'+esc(prepSummary(it))+'</div>';
  }
  const cur=Lc.run.cur===it.id&&Lc.run.phase!=='lobby';
  return '<div class="lcrow'+(cur?' cur':'')+'" data-lcrow="'+esc(it.id)+'"><span class="n">'+(i+1)+'</span>'+pill+'<div class="tx">'+tx+'</div>'+
    '<button class="btn primary" data-act="lcstartat" data-arg="'+esc(it.id)+'" title="Start the lecture with this item">▶</button>'+
    '<button class="btn ghost" data-act="lcmove" data-arg="'+esc(it.id)+':-1" title="Move up"'+(i===0?' disabled':'')+'>↑</button><button class="btn ghost" data-act="lcmove" data-arg="'+esc(it.id)+':1" title="Move down"'+(i===N-1?' disabled':'')+'>↓</button>'+
    (it.kind==='poll'?'<button class="btn ghost" data-act="lcedititem" data-arg="'+esc(it.id)+'">Edit</button>':'')+
    '<button class="btn ghost" data-act="lcdel" data-arg="'+esc(it.id)+'" title="Remove from the lecture">✕</button></div>';
}
function lcEditPaint(){
  const url=lcURL(), N=Lc.items.length, d=Lc.draft, n=Math.max(2,Math.min(8,d.n||4)), nq=Lc.items.filter(x=>x.kind==='quiz').length, running=Lc.run.phase!=='lobby';
  const seg=(v,l)=>'<button class="seg'+(d.type===v?' on':'')+'" data-act="lcptype" data-arg="'+v+'">'+l+'</button>';
  const chips=[2,3,4,5,6,7,8].map(k=>'<button class="seg'+(n===k?' on':'')+'" data-act="lcpn" data-arg="'+k+'">'+k+'</button>').join('');
  const ins=Array.from({length:n},(_,i)=>'<div class="popt"><span class="k">'+LETTERS[i]+'</span><input id="lco'+i+'" data-lc="o'+i+'" maxlength="120" autocomplete="off" placeholder="(empty = just “'+LETTERS[i]+'”)" value="'+esc((d.opts||[])[i]||'')+'"><button class="cbtn'+(d.correct===i?' on':'')+'" data-act="lcpcorrect" data-arg="'+i+'" title="Mark as the correct answer (optional)" aria-pressed="'+(d.correct===i)+'">✓</button></div>').join('');
  const hasRes=Object.keys(Lc.run.answers).some(k=>Object.keys(Lc.run.answers[k]||{}).length);
  const course=COURSES[Lc.course];
  const left='<div class="stack" style="min-width:0"><div class="card stack"><div class="muted small">Room code</div><div class="code" style="font-size:clamp(24px,3vw,40px)">'+Lc.code+'</div>'+
    '<div class="qrbox lcqr">'+qrSvg(url)+'</div><div class="joinurl" style="font-size:.8rem;word-break:break-all">'+esc(url.replace(/^https?:\/\//,''))+'</div>'+
    '<div><span class="bigcount" data-hc style="font-size:1.8em">'+lcPresent()+'</span> <span class="muted">connected</span></div>'+
    '<div class="row"><button class="btn primary big" data-act="lcrun"'+(lcList().length?'':' disabled')+'>'+(running?'Resume lecture ▶':'Start lecture ▶')+'</button></div>'+
    '<div class="segs" title="Language of the student page"><button class="seg'+(Lc.lang==='en'?' on':'')+'" data-act="lclang" data-arg="en">EN</button><button class="seg'+(Lc.lang==='de'?' on':'')+'" data-act="lclang" data-arg="de">DE</button></div></div>'+
    '<div class="card stack"><h2 style="margin:0">Results &amp; backup</h2><div class="row"><button class="btn" data-act="lccsv"'+(hasRes?'':' disabled')+'>Results (CSV)</button><button class="btn" data-act="lcjson">Download JSON</button></div>'+
    '<div class="row"><button class="btn ghost" data-act="lcreset"'+(hasRes?'':' disabled')+' title="Clear all collected answers (e.g. before the next run)">Clear answers</button><button class="btn ghost" data-act="lcstop"'+(running?'':' disabled')+' title="Show the waiting screen on the students\' phones and go back to the start">Reset to start</button></div></div></div>';
  const list=Lc.items.length?Lc.items.map((it,i)=>lcRow(it,i,N)).join(''):'<p class="muted">The lecture is empty. Add polls below or choose quiz questions from the course.</p>';
  const add='<div class="card stack" style="margin-top:14px"><h2 style="margin:0">'+(Lc.editing?'Edit poll':'Add to the lecture')+'</h2>'+
    '<div class="row" style="justify-content:space-between"><div class="segs">'+seg('choice','Choice')+seg('num','Number')+seg('word','Word / phrase')+'</div></div>'+
    '<textarea id="lcq" data-lc="q" rows="2" class="pin" placeholder="Question (optional – you can also just ask it aloud)">'+esc(d.q||'')+'</textarea>'+
    (d.type==='choice'?'<div class="row small muted" style="gap:8px">Number of answers '+chips+'</div><div class="popts">'+ins+'</div><div class="muted small">Leave the answer texts empty to let students simply vote A, B, C… Optionally mark the correct answer with ✓: the reveal then has two steps (answers first, then the solution).</div>'
      :'<div class="muted small">'+(d.type==='num'?'Students type a number; the reveal shows the distribution.':'Students type a word or short phrase; the reveal shows a word cloud.')+'</div>')+
    '<div class="row"><button class="btn primary" data-act="lcpadd">'+(Lc.editing?'Save changes':'Add poll')+'</button>'+(Lc.editing?'<button class="btn" data-act="lcpcancel">Cancel</button>':'<button class="btn" data-act="lcbulk">Add several polls…</button><button class="btn" data-act="lcqpick"'+(course?'':' disabled')+'>Add quiz questions…</button>')+'</div>'+
    '<div class="small muted" id="lcmsg">'+esc(Lc.ui.msg||'')+'</div></div>';
  let html='<div class="wrap" style="max-width:1180px">'+header()+
    '<div class="row" style="gap:12px;margin:6px 0 14px"><button class="btn ghost" data-act="lcclose">← Lectures</button><input id="lcname" data-lc="name" class="pin" style="flex:1 1 260px;max-width:460px;font-weight:700" maxlength="60" value="'+esc(Lc.name)+'" aria-label="Lecture name"><span class="pill">'+(course?esc(course.title):'no course')+'</span><span class="sp" style="flex:1"></span><span id="hstat" class="status"></span></div>'+
    '<div class="lcgrid">'+left+'<div style="min-width:0"><div class="card stack"><div class="row" style="justify-content:space-between"><h2 style="margin:0">Lecture <span class="muted small">('+N+' item'+(N===1?'':'s')+(nq?', '+nq+' quiz':'')+')</span></h2></div><div>'+list+'</div></div>'+add+'</div></div></div>';
  if(Lc.ui.overlay==='qr') html+=lcQrOverlay();
  if(Lc.ui.overlay==='bulk') html+='<div class="overlay" data-act="lcclose2"><div class="modal" style="width:min(92vw,720px)"><h2 style="margin-top:0">Add several polls</h2><p class="muted small">One poll per line. Answers after “|” (empty answers = just a letter; put <code>*</code> before the correct one, e.g. <code>*Prophase</code>). <code>#num</code> / <code>#word</code> at the start makes a number or word-cloud poll. Lines starting with <code>##</code> are ignored.</p><textarea id="lcbulktx" class="pin" rows="10" placeholder="#word What is a transgenic organism?\nWhich is cheapest? | Cas9 | TALEN | ZFN | Meganuclease"></textarea><div class="row" style="margin-top:12px"><button class="btn primary" data-act="lcbulkadd">Add</button><button class="btn" data-act="lcclose2">Cancel</button></div></div></div>';
  if(Lc.ui.overlay==='qpick') html+=lcQPickOverlay();
  app.innerHTML=html;
  const bk=document.getElementById('lcbulktx'); if(bk) bk.focus();
}
function lcQrOverlay(){ const url=lcURL(); return '<div class="overlay" data-act="lcclose2"><div class="modal" style="text-align:center"><div class="qrbox">'+qrSvg(url)+'</div><div class="code" style="margin-top:14px">'+Lc.code+'</div><div class="joinurl" style="margin-top:8px">'+esc(url)+'</div></div></div>'; }
function lcQPickOverlay(){
  const live=QUESTIONS.filter(isLive), sel=Lc.ui.qlec||lecNums.slice(), dif=Lc.ui.qdiff||[1,2,3];
  const pool=live.filter(q=>sel.includes(q.lec)&&dif.includes(q.diff));
  const inLec=id=>Lc.items.some(x=>x.kind==='quiz'&&x.qid===id);
  const chips=lecNums.map(n=>{ const k=live.filter(x=>x.lec===n).length; if(!k) return ''; return '<button class="chip'+(sel.includes(n)?' on':'')+'" data-act="lcqchip" data-arg="'+n+'"><b>'+esc(lecLabel(n))+'</b><span>'+k+' questions</span></button>'; }).join('');
  const rows=pool.map(q=>{ const on=inLec(q.id);
    return '<button class="sq'+(on?' on':'')+'" data-act="lcqtoggle" data-arg="'+esc(q.id)+'"><span class="cb">'+(on?'✓':'')+'</span><span class="sqm"><span class="id">'+esc(q.id)+'</span> <b>'+esc(q.topic)+'</b>'+diffTag(q)+'<span class="sqt">'+q.q+'</span></span></button>'; }).join('');
  const nOther=QUESTIONS.length-live.length;
  return '<div class="overlay" data-act="lcclose2"><div class="modal setup"><div class="row spread" style="margin-bottom:10px"><h2>Add quiz questions — '+esc(COURSE.title)+'</h2><button class="btn primary" data-act="lcclose2">Done</button></div>'+
    '<p class="muted small" style="margin:0 0 8px">Click a question to add it at the end of the lecture; click again to remove it. '+Lc.items.filter(x=>x.kind==='quiz').length+' quiz question(s) in the lecture.</p>'+
    '<div class="muted small slab">Lectures</div><div class="chips">'+chips+'</div>'+
    '<div class="muted small slab">Difficulty</div><div class="segs">'+[1,2,3].map(x=>'<button class="seg'+(dif.includes(x)?' on':'')+'" data-act="lcqdiff" data-arg="'+x+'">'+'●'.repeat(x)+' '+T(DIFF[x])+'</button>').join('')+'</div>'+
    '<div class="row spread slab"><span><b>'+pool.length+'</b> questions shown</span><button class="btn ghost" data-act="lcqall">Add / remove all shown</button></div><div class="sqlist">'+(rows||'<p class="muted">No questions match.</p>')+'</div>'+
    (nOther?'<p class="muted small" style="margin-top:12px">'+nOther+' true/false and short-answer questions of this course are for practice mode only and are not listed here.</p>':'')+'</div></div>';
}

/* presenter view while running */
function lcRunPaint(){
  const it=lcCur(), ph=Lc.run.phase, list=lcList(), url=lcURL(); let html;
  const fileWarn = location.protocol==='file:' ? '<div class="banner" style="margin:0 0 12px">This page was opened from a local file. Students cannot reach it — publish it (e.g. GitHub Pages) and open that address, otherwise the QR code will not work.</div>' : '';
  if(!it||ph==='lobby'){
    const started=!!it, i=it?list.indexOf(it):-1;
    html='<div class="proj"><div class="ph"><button class="btn ghost" data-act="lcedit" style="white-space:nowrap">← Edit lecture</button><span class="brand" style="font-size:1em">'+esc(Lc.name)+'</span><span class="sp"></span><span id="hstat" class="status"></span><button class="btn ghost" data-act="theme" aria-label="Toggle theme">'+THEME_ICON+'</button></div>'+
      '<div class="lobby"><div>'+fileWarn+'<div class="qrbox">'+qrSvg(url)+'</div></div><div class="stack" style="min-width:0"><div class="muted">Scan the QR code, or go to</div><div class="joinurl">'+esc(location.host+location.pathname.replace(/index\.html$/,''))+'</div><div class="muted">and enter the code</div><div class="code">'+Lc.code+'</div>'+
      '<div><span class="bigcount" data-hc>'+lcPresent()+'</span> <span class="muted">connected</span></div>'+
      '<div class="sumbox"><div class="muted small">'+(started?'Paused at':'Next')+'</div><div class="sumtxt"><b>'+(started?'Item '+(i+1)+' of '+list.length+': ':'Item 1 of '+list.length+': ')+esc(lcLabel(started?it:list[0],60))+'</b></div></div>'+
      '<div class="row"><button class="btn primary big" data-act="lcnext">'+(started?'Resume ▶':'Start lecture ▶')+'</button><button class="btn ghost" data-act="lclist">Items…</button></div></div></div></div>';
  } else if(it.kind==='quiz'){
    const q=byId[it.qid], rev=ph==='r', cs=lcQuizCounts(it), tot=cs.reduce((a,b)=>a+b,0), cor=correctOf(q), ord=optOrder(q,''), idx=list.indexOf(it)+1;
    const opts=ord.map((oi,pos)=>{ let cls='opt'; if(rev) cls+=' stat'+(oi===cor?' ok':' dim'); const pct=tot?Math.round(100*cs[oi]/tot):0;
      return '<div class="'+cls+'" style="--pct:'+pct+'%"><span class="k">'+LETTERS[pos]+'</span><span class="t">'+q.opts[oi]+'</span>'+(rev?'<span class="cnt">'+cs[oi]+' · '+pct+'%</span>':'')+'</div>'; }).join('');
    let tally; if(!rev) tally='<div class="anscount"><span>'+T('Answers received:')+'</span><span class="anum" data-ha>'+tot+'</span><span class="muted">'+T('of {0} online','<span data-hc>'+lcPresent()+'</span>')+'</span></div>';
    else { const k=cs[cor], w=tot-k, noans=Math.max(0,lcPresent()-tot); tally='<div class="tally"><span>'+T(tot===1?'{0} answer:':'{0} answers:',tot)+'</span><span class="ok">✓ '+k+' '+T('correct')+(tot?' ('+Math.round(100*k/tot)+' %)':'')+'</span><span class="bad">✗ '+w+' '+T('wrong')+(tot?' ('+Math.round(100*w/tot)+' %)':'')+'</span>'+(noans?'<span class="no">'+noans+' '+T('no answer')+'</span>':'')+'</div>'; }
    const exp = rev && Lc.ui.exp ? '<div class="feedback" style="margin-top:18px"><div>'+(q.exp||'')+'</div>'+expFigs(q)+srcLine(q)+'</div>' : '';
    html='<div class="proj"><div class="ph"><button class="btn ghost" data-act="lcedit" style="white-space:nowrap" title="Back to the editor (the room stays online)">← Edit</button><span class="lec" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:28vw">'+esc(Lc.name)+'</span><span class="muted">·</span><span style="white-space:nowrap">Item '+idx+' / '+list.length+'</span><span class="pill">Quiz</span>'+diffTag(q)+'<span class="sp"></span>'+
      '<span id="hstat" class="status"></span><span class="pill">'+(rev?T('Results'):'<span data-ha>0</span> '+T('answered'))+' · <span data-hc>'+lcPresent()+'</span> '+T('online')+'</span></div>'+
      '<div class="pm'+(q.fig?' hasfig':'')+'"><div><div class="qtext">'+q.q+'</div><div class="opts">'+opts+'</div>'+tally+exp+'</div>'+(q.fig?figHTML(q):'')+'</div>'+lcFooter(it,ph,rev)+'</div>';
  } else {
    const rev=ph==='r'||ph==='c', res=pollResults(lcPit(it)), tot=res.n, idx=list.indexOf(it)+1; let body;
    if(rev) body=pollResBody(lcPit(it),res,null,Lc.lang,ph==='c'?it.correct:null);
    else if(it.type==='choice') body='<div class="opts">'+it.opts.map((o,i)=>'<div class="opt"><span class="k">'+LETTERS[i]+'</span><span class="t">'+(o?esc(o):'')+'</span></div>').join('')+'</div>';
    else body='<div class="muted" style="font-size:clamp(18px,2vw,34px);margin-top:14px">'+(it.type==='num'?'Students are entering a number…':'Students are typing a word or short phrase…')+'</div>';
    const tally=rev?'<div class="tally"><span>'+tot+' answer'+(tot===1?'':'s')+'</span>'+(ph==='c'?(function(){ const k=res.counts[it.correct]||0; return '<span class="ok">✓ '+k+' correct'+(tot?' ('+Math.round(100*k/tot)+' %)':'')+'</span>'; })():'')+'</div>'
      :'<div class="anscount"><span>Answers received:</span><span class="anum" data-ha>'+tot+'</span><span class="muted">of <span data-hc>'+lcPresent()+'</span> online</span></div>';
    html='<div class="proj"><div class="ph"><button class="btn ghost" data-act="lcedit" style="white-space:nowrap" title="Back to the editor (the room stays online)">← Edit</button><span class="lec" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:28vw">'+esc(Lc.name)+'</span><span class="muted">·</span><span style="white-space:nowrap">Item '+idx+' / '+list.length+'</span><span class="pill">'+esc(PTYPES[it.type])+'</span><span class="sp"></span><span id="hstat" class="status"></span></div>'+
      '<div class="pm pollm"><div><div class="qtext">'+(it.q?esc(it.q):'<span class="muted">'+(it.type==='choice'?'Vote!':'Answer on your phone')+'</span>')+'</div>'+body+tally+'</div></div>'+lcFooter(it,ph,rev)+'</div>';
  }
  if(Lc.ui.overlay==='qr') html+=lcQrOverlay();
  else if(Lc.ui.overlay==='list'){
    const items=list.map((x,i)=>{ const n=lcAnswered(x); return '<button class="qli'+(it&&it.id===x.id?' cur':'')+'" data-act="lcjump" data-arg="'+esc(x.id)+'"><span class="id">'+(i+1)+'</span><span class="tp"><span class="pill" style="margin-right:8px">'+(x.kind==='quiz'?'Quiz':esc(PTYPES[x.type]))+'</span>'+esc(lcLabel(x,70))+'</span><span class="st">'+(n?n+' answers':'')+'</span></button>'; }).join('');
    html+='<div class="overlay" data-act="lcclose2"><div class="modal"><div class="row spread" style="margin-bottom:12px"><h2>Lecture items</h2><div class="row"><button class="btn" data-act="lccsv">Results (CSV)</button><button class="btn" data-act="lcpause">Pause / waiting screen</button><button class="btn primary" data-act="lcclose2">Close</button></div></div><div class="qlist" style="display:grid;gap:6px">'+items+'</div></div></div>';
  } else if(Lc.ui.overlay==='done'){
    html+='<div class="overlay"><div class="modal" style="text-align:center;max-width:520px"><h2>End of the lecture</h2><p class="muted">All '+list.length+' items have been presented. The results stay in this browser until you clear them.</p><div class="row" style="justify-content:center"><button class="btn" data-act="lccsv">Results (CSV)</button><button class="btn" data-act="lcclose2">Stay on the last item</button><button class="btn primary" data-act="lcstop">Back to the editor</button></div></div></div>';
  }
  app.innerHTML=html;
  if(Lc.ui.overlay) { const b=app.querySelector('.modal .btn.primary'); if(b) b.focus(); }
}
function lcFooter(it,ph,rev){
  const list=lcList(), i=list.indexOf(it); let label;
  if(ph==='q') label=it.kind==='quiz'?'Reveal answer':'Reveal results';
  else if(ph==='r'&&lcHasCorrect(it)) label='Show correct answer ▶';
  else if(i+1<list.length) label='Next: '+lcLabel(list[i+1],26)+' ▶';
  else label='Finish ■';
  return '<div class="pf"><span class="info">Join: <b>'+esc(location.host+location.pathname.replace(/index\.html$/,''))+'</b> · code <b>'+Lc.code+'</b></span>'+
    '<button class="btn" data-act="lcprev" title="← Back">◀</button><button class="btn primary" data-act="lcnext" title="Space / →">'+esc(label)+'</button>'+
    (it.kind==='quiz'&&rev?'<button class="btn" data-act="lcexp" title="E">'+(Lc.ui.exp?'Hide explanation':'Show explanation')+'</button>':'')+
    '<button class="btn" data-act="lcpause" title="P — students see the waiting screen">Pause</button><button class="btn" data-act="lclist" title="L">Items</button><button class="btn" data-act="lcqr" title="Q">QR code</button><button class="btn" data-act="hfull" title="F">⛶</button><button class="btn ghost" data-act="theme" aria-label="Toggle theme">'+THEME_ICON+'</button></div>';
}

/* ---- results / export ---- */
function lcDownload(name,text,type){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:type||'text/plain'})); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500); }
const lcSlug = s => String(s||'lecture').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'lecture';
function lcCSV(){
  const rows=[['lecture','item','kind','type','question_id','question','correct','answer']];
  lcList().forEach((it,i)=>{ const a=Lc.run.answers[it.id]||{};
    Object.values(a).forEach(v=>{
      if(it.kind==='quiz'){ const q=byId[it.qid], cor=correctOf(q); rows.push([Lc.name,i+1,'quiz','choice',q.id,lcPlain(q.q),LETTERS[optOrder(q,'').indexOf(cor)]+': '+lcPlain(q.opts[cor]),LETTERS[optOrder(q,'').indexOf(v)]+': '+lcPlain(q.opts[v])+(v===cor?' (correct)':' (wrong)')]); }
      else rows.push([Lc.name,i+1,'poll',it.type,'',it.q||'',(it.type==='choice'&&it.correct!=null)?LETTERS[it.correct]:'',it.type==='choice'?LETTERS[v]+(it.opts[v]?': '+it.opts[v]:''):v]);
    }); });
  lcDownload('lecture-results-'+lcSlug(Lc.name)+'-'+new Date().toISOString().slice(0,10)+'.csv', rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n'), 'text/csv');
}
function lcExportObj(){ return {format:LFORMAT, version:1, name:Lc.name, code:Lc.code, lang:Lc.lang, course:Lc.course,
  items:Lc.items.map(x=>{ if(x.kind==='quiz') return {kind:'quiz',qid:x.qid}; const o={kind:'poll',type:x.type,q:x.q}; if(x.type==='choice'){ o.opts=x.opts; if(x.correct!=null) o.correct=x.correct; } return o; })}; }
function lcImport(text){
  let o; try{ o=JSON.parse(text); }catch(e){ return 'This file is not valid JSON.'; }
  if(!o||o.format!==LFORMAT||!Array.isArray(o.items)) return 'This is not a lecture file (expected format “'+LFORMAT+'”).';
  const items=o.items.map(lcCleanItem).filter(Boolean); if(!items.length&&o.items.length) return 'No usable items in this file.';
  const st=lecStore(), used=new Set(st.lectures.map(m=>m.code).concat(pollStore().classes.map(c=>c.code)));
  let code=/^[A-Z0-9]{3,8}$/.test(String(o.code||''))&&!used.has(o.code)?o.code:genCode(); while(used.has(code)) code=genCode();
  const id=lid(), course=(typeof o.course==='string'&&o.course)?o.course.slice(0,40):null;
  st.lectures.push({id,name:String(o.name||'Imported lecture').slice(0,60),code,lang:o.lang==='de'?'de':'en',course,created:Date.now()}); st.last=id; lecStoreSave(st);
  LS.set('lq.lecture.'+id,{items,run:{cur:null,phase:'lobby',pph:null,rv:1,answers:{}},draft:{type:'choice',q:'',n:4,opts:[]}});
  return {id, n:items.length, kept:code===o.code};
}
document.addEventListener('change', e=>{
  const t=e.target; if(!t||t.id!=='lcfile'||route.name!=='lecture') return; const f=t.files&&t.files[0]; if(!f) return;
  const rd=new FileReader(); rd.onload=()=>{ const r=lcImport(String(rd.result)); if(typeof r==='string'){ lcPickMsg=r; lcPaint(); } else { lcPickMsg=''; lectureOpen(r.id); } }; rd.readAsText(f);
});
document.addEventListener('input', e=>{
  const t=e.target; if(!t||!t.dataset||!t.dataset.lc||!Lc) return; const k=t.dataset.lc;
  if(k==='name'){ Lc.name=t.value.slice(0,60)||'Lecture'; lcSaveMeta(); lcBroadcast(); return; }
  if(k==='q') Lc.draft.q=t.value; else if(/^o\d+$/.test(k)){ Lc.draft.opts=Lc.draft.opts||[]; Lc.draft.opts[+k.slice(1)]=t.value; }
  lcSaveSoon();
});

Object.assign(ACTS,{
  lcnew(){
    const i=document.getElementById('lcnewname'), name=((i&&i.value)||'').trim()||('Lecture '+(lecStore().lectures.length+1));
    const course=(document.getElementById('lcnewcourse')||{}).value||null, lang=(document.getElementById('lcnewlang')||{}).value||'en';
    const st=lecStore(), used=new Set(st.lectures.map(m=>m.code).concat(pollStore().classes.map(c=>c.code))); let code=genCode(); while(used.has(code)) code=genCode();
    const id=lid(); st.lectures.push({id,name:name.slice(0,60),code,lang,course,created:Date.now()}); st.last=id; lecStoreSave(st); lcPickMsg=''; lectureOpen(id);
  },
  lcopen(id){ lcPickMsg=''; lectureOpen(id); },
  lcdelete(id){ const st=lecStore(), m=st.lectures.find(x=>x.id===id); if(!m||!confirm('Delete the lecture “'+m.name+'” with its room code, items and collected answers?')) return;
    st.lectures=st.lectures.filter(x=>x.id!==id); if(st.last===id) st.last=null; lecStoreSave(st); try{ localStorage.removeItem('lq.lecture.'+id); }catch(e){} lcPaint(); },
  lcloadpick(){ const f=document.getElementById('lcfile'); if(f) f.click(); },
  lcclose(){ lectureLeave(); lcPaint(); },
  lcclose2(){ Lc.ui.overlay=null; lcPaint(); },
  lcrun(){ Lc.mode='run'; Lc.ui.overlay=null; lcPaint(); },
  lcedit(){ Lc.mode='edit'; Lc.ui.overlay=null; lcPaint(); },
  lcnext(){ lcAdvance(); }, lcprev(){ lcBack(); }, lcpause(){ Lc.ui.overlay=null; lcPause(); },
  lcexp(){ Lc.ui.exp=!Lc.ui.exp; lcPaint(); },
  lclist(){ Lc.ui.overlay='list'; lcPaint(); }, lcqr(){ Lc.ui.overlay='qr'; lcPaint(); },
  lcjump(id){ Lc.ui.overlay=null; Lc.mode='run'; lcSetPhase('q',id); },
  lcstartat(id){ Lc.mode='run'; Lc.ui.overlay=null; lcSetPhase('q',id); },
  lcstop(){ Lc.ui.overlay=null; Lc.mode='edit'; Lc.run.cur=null; Lc.run.phase='lobby'; Lc.run.pph=null; lcSave(); lcBroadcast(); lcPaint(); },
  lclang(v){ Lc.lang=v; lcSaveMeta(); lcBroadcast(); lcPaint(); },
  lcreset(){ if(!confirm('Clear all collected answers of this lecture?')) return; Lc.run.answers={}; Lc.run.rv=(Lc.run.rv||1)+1; lcSave(); lcBroadcast(); lcPaint(); },
  lccsv(){ lcCSV(); },
  lcjson(){ lcDownload('lecture-'+lcSlug(Lc.name)+'.json', JSON.stringify(lcExportObj(),null,2), 'application/json'); },
  lcptype(v){ Lc.draft.type=v; if(v!=='choice') Lc.draft.correct=null; lcSaveSoon(); lcPaint(); },
  lcpn(v){ Lc.draft.n=+v; lcSaveSoon(); lcPaint(); },
  lcpcorrect(i){ const d=Lc.draft; d.correct=(d.correct===+i)?null:+i; lcSaveSoon(); lcPaint(); },
  lcpadd(){
    const sp=lcDraftSpec(); if(sp.type==='choice'&&!sp.q&&!sp.opts.some(Boolean)){ Lc.ui.msg='Type a question or answers first.'; lcPaint(); return; }
    if(sp.type!=='choice'&&!sp.q){ Lc.ui.msg='Type the question first.'; lcPaint(); return; }
    const it=Object.assign({id:Lc.editing||lid(),kind:'poll'},sp);
    if(Lc.editing){ const x=Lc.items.find(y=>y.id===Lc.editing); if(x){ Object.keys(x).forEach(k=>{ if(k!=='id'&&k!=='kind') delete x[k]; }); Object.assign(x,sp); } else Lc.items.push(it); Lc.ui.msg='Changes saved.'; Lc.editing=null; }
    else { Lc.items.push(it); Lc.ui.msg='Poll added at the end of the lecture.'; }
    Lc.draft={type:Lc.draft.type,q:'',n:Lc.draft.n||4,opts:[],correct:null}; lcSave(); lcBroadcastIfRunning(); lcPaint();
    const q=document.getElementById('lcq'); if(q) q.focus();
  },
  lcpcancel(){ Lc.editing=null; Lc.draft={type:'choice',q:'',n:4,opts:[]}; Lc.ui.msg=''; lcSaveSoon(); lcPaint(); },
  lcedititem(id){ const x=Lc.items.find(y=>y.id===id); if(!x||x.kind!=='poll') return; Lc.editing=id; Lc.draft={type:x.type,q:x.q||'',n:x.type==='choice'?x.opts.length:4,opts:(x.opts||[]).slice(),correct:x.correct==null?null:x.correct}; Lc.ui.msg=''; lcSaveSoon(); lcPaint(); const q=document.getElementById('lcq'); if(q){ q.focus(); window.scrollTo(0,document.body.scrollHeight); } },
  lcdel(id){ if(!confirm('Remove this item from the lecture?')) return; Lc.items=Lc.items.filter(y=>y.id!==id); delete Lc.run.answers[id]; if(Lc.run.cur===id){ Lc.run.cur=null; Lc.run.phase='lobby'; Lc.run.pph=null; } if(Lc.editing===id){ Lc.editing=null; } lcSave(); lcBroadcast(); lcPaint(); },
  lcmove(a){ const [id,d]=a.split(':'), i=Lc.items.findIndex(y=>y.id===id), j=i+(+d); if(i<0||j<0||j>=Lc.items.length) return; const x=Lc.items[i]; Lc.items[i]=Lc.items[j]; Lc.items[j]=x; lcSave(); lcPaint(); },
  lcbulk(){ Lc.ui.overlay='bulk'; lcPaint(); },
  lcbulkadd(){
    const el=document.getElementById('lcbulktx'); const add=parseBulk(el?el.value:'').filter(x=>x.heading===undefined); let n=0;
    add.forEach(x=>{ const it=lcCleanItem(Object.assign({kind:'poll'},x)); if(it){ Lc.items.push(it); n++; } });
    Lc.ui.msg=n?n+' poll'+(n>1?'s':'')+' added.':'Nothing to add — one poll per line.'; Lc.ui.overlay=null; if(n){ lcSave(); lcBroadcastIfRunning(); } lcPaint();
  },
  lcqpick(){ if(!COURSE||Lc.course!==COURSE.id) return; Lc.ui.overlay='qpick'; lcPaint(); },
  lcqchip(n){ n=+n; const s=Lc.ui.qlec||(Lc.ui.qlec=lecNums.slice()), i=s.indexOf(n); if(i>=0) s.splice(i,1); else s.push(n); lcPaint(); },
  lcqdiff(d){ d=+d; const a=Lc.ui.qdiff||(Lc.ui.qdiff=[1,2,3]), i=a.indexOf(d); if(i>=0){ if(a.length>1) a.splice(i,1); } else a.push(d); lcPaint(); },
  lcqtoggle(id){ const i=Lc.items.findIndex(x=>x.kind==='quiz'&&x.qid===id); if(i>=0){ const it=Lc.items[i]; Lc.items.splice(i,1); delete Lc.run.answers[it.id]; if(Lc.run.cur===it.id){ Lc.run.cur=null; Lc.run.phase='lobby'; Lc.run.pph=null; } } else Lc.items.push({id:lid(),kind:'quiz',qid:id});
    lcSave(); lcBroadcast(); const m=document.querySelector('.modal.setup'), keep=m?m.scrollTop:0; lcPaint(); const m2=document.querySelector('.modal.setup'); if(m2&&keep) m2.scrollTop=keep; },
  lcqall(){ const live=QUESTIONS.filter(isLive), sel=Lc.ui.qlec||lecNums.slice(), dif=Lc.ui.qdiff||[1,2,3], pool=live.filter(q=>sel.includes(q.lec)&&dif.includes(q.diff));
    const has=id=>Lc.items.some(x=>x.kind==='quiz'&&x.qid===id), all=pool.every(q=>has(q.id));
    if(all){ pool.forEach(q=>{ const i=Lc.items.findIndex(x=>x.kind==='quiz'&&x.qid===q.id); if(i>=0){ delete Lc.run.answers[Lc.items[i].id]; Lc.items.splice(i,1); } }); if(Lc.run.cur&&!lcCur()){ Lc.run.cur=null; Lc.run.phase='lobby'; Lc.run.pph=null; } }
    else pool.forEach(q=>{ if(!has(q.id)) Lc.items.push({id:lid(),kind:'quiz',qid:q.id}); });
    lcSave(); lcBroadcast(); lcPaint(); },
});
function lcBroadcastIfRunning(){ if(Lc.run.phase!=='lobby') lcBroadcast(); }
