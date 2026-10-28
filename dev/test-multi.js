// Multi-course test: courses.js is served with BOTH courses active; checks picker, per-course storage,
// live mode with the course carried in the state, the #check page (good + broken files).
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const aedesF = require('aedes'), wsStream = require('websocket-stream');
const dir = __dirname, root = path.join(dir, '..'), shots = path.join(dir, 'shots'); fs.mkdirSync(shots, { recursive: true });
const NM = p => path.join(dir, 'node_modules', p);
let fails = 0; const check = (c, m) => { if (!c) { fails++; console.log('  FAIL:', m); } else console.log('  ok:', m); };
const CDN = [[/katex\.min\.css/, NM('katex/dist/katex.min.css'), 'text/css'], [/fonts\/(.+)$/, null, 'font/woff2'], [/katex\.min\.js/, NM('katex/dist/katex.min.js'), 'text/javascript'],
  [/auto-render/, NM('katex/dist/contrib/auto-render.min.js'), 'text/javascript'], [/mqtt/, NM('mqtt/dist/mqtt.min.js'), 'text/javascript'], [/qrcode/, NM('qrcode-generator/qrcode.js'), 'text/javascript']];
const COURSES_BOTH = "QUIZ.courses([{id:'sysbio',file:'sysbio.js',active:true},{id:'example',file:'example.js',active:true},{id:'ghost',file:'ghost.js',active:false}]);";
(async () => {
  const a = aedesF(); const bs = http.createServer().listen(9021, '127.0.0.1'); wsStream.createServer({ server: bs }, a.handle);
  const server = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
    if (u === '/courses/courses.js') { res.setHeader('content-type', 'text/javascript'); return res.end(COURSES_BOTH); }
    const f = path.join(root, u); if (!f.startsWith(root) || !fs.existsSync(f)) { res.statusCode = 404; return res.end('nf'); }
    res.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : 'text/html'); res.end(fs.readFileSync(f)); }).listen(8090, '127.0.0.1');
  const B = 'http://127.0.0.1:8090/';
  const b = await chromium.launch(); const errors = [];
  const page = async (w, h) => { const p = await (await b.newContext({ viewport: { width: w || 1100, height: h || 900 } })).newPage();
    p.on('pageerror', e => { if (!/Unexpected token/.test(e.message)) errors.push(e.message); }); p.on('console', m => { if (m.type() === 'error' && !/favicon|WebSocket|ERR_|404|ghost/.test(m.text())) errors.push(m.text()); });
    await p.addInitScript(() => { window.SBQ_BROKERS = ['ws://127.0.0.1:9021/']; window.SBQ_STATS = 'http://127.0.0.1:1'; if (!window.__LOCKED) window.SBQ_LECT_HASH = ''; });
    await p.route(/cdn\.jsdelivr\.net/, r => { const u = r.request().url(); for (const [re, f, t] of CDN) { const m = u.match(re); if (m) { const ff = f || NM('katex/dist/fonts/' + m[1]); if (fs.existsSync(ff)) return r.fulfill({ body: fs.readFileSync(ff), contentType: t }); } } r.abort(); });
    return p; };

  console.log('PICKER');
  const p = await page(); await p.goto(B); await p.waitForSelector('[data-act=pickcourse]');
  const cs = await p.$$eval('[data-act=pickcourse] b', e => e.map(x => x.textContent)); check(cs.join() === 'Systems Biology,Example course', 'picker lists both active courses: ' + cs);
  await p.screenshot({ path: path.join(shots, 'm-picker.png') });
  await p.click('[data-act=pickcourse][data-arg=example]'); await p.waitForSelector('.hero');
  check(/Example course/.test(await p.innerText('.hero')) && /course=example/.test(p.url()), 'picked course: title + ?course=example');
  await p.click('[data-act=practice]'); const chips = await p.$$eval('[data-act=pchip] b', e => e.map(x => x.textContent));
  check(chips.length === 3 && /Exam practice/.test(chips[2]) && /Lecture 1/.test(chips[0]), 'lecture labels incl. plain one: ' + chips.join(' | '));
  await p.selectOption('#nq', '0'); await p.click('[data-act=pstart]');
  for (let i = 0; i < 6; i++) { await p.waitForSelector('.opt'); await p.keyboard.press('a'); await p.keyboard.press('Enter'); await p.waitForSelector('.feedback'); if (i === 1) await p.screenshot({ path: path.join(shots, 'm-example-q.png'), fullPage: true }); await p.keyboard.press('Enter'); }
  await p.waitForSelector('.big-score');
  const keys = await p.evaluate(() => Object.keys(localStorage)); check(keys.includes('lq.example.progress') && !keys.includes('lq.sysbio.progress'), 'progress stored per course: ' + keys.join(','));
  await p.goto(B + '?course=sysbio'); await p.waitForSelector('.hero'); check(/Systems Biology/.test(await p.innerText('.hero')), 'direct link ?course=sysbio');
  await p.goto(B + '?course=ghost'); await p.waitForSelector('.banner'); check(/not available/.test(await p.innerText('.banner')), 'inactive course link shows a notice');

  console.log('LIVE (course comes with the room)');
  const host = await page(1400, 900); await host.goto(B + '?course=example#host'); await host.waitForFunction(() => /Room online/.test((document.getElementById('hstat') || {}).textContent || ''), null, { timeout: 15000 });
  const code = (await host.$eval('.code', e => e.textContent)).trim();
  await host.click('[data-act=hsetup]'); await host.waitForSelector('.modal.setup');
  check((await host.$$('[data-act=hcourse]')).length === 2, 'setup panel offers the course switch');
  await host.click('.modal [data-act=hsetupdone]');
  const st = await page(390, 800); await st.goto(B + '?join=' + code); await st.waitForSelector('.card.wait h2');
  await host.click('[data-act=hnext]'); await host.waitForSelector('.pm .qtext');
  await st.waitForSelector('.qtext', { timeout: 10000 }); const sq = await st.innerText('.qtext'), hq = await host.innerText('.pm .qtext');
  check(sq === hq, 'student shows the presenter\'s example-course question: ' + sq.slice(0, 40));
  await st.click('.opt >> nth=0'); await st.click('[data-act=lsubmit]'); await host.waitForFunction(() => document.querySelector('[data-ha]').textContent === '1', null, { timeout: 8000 }); check(true, 'answer counted');
  await host.keyboard.press('Space'); await st.waitForSelector('.feedback.ok, .feedback.bad', { timeout: 8000 }); check(true, 'reveal reached student');
  check(!!(await host.evaluate(() => localStorage.getItem('lq.example.host'))), 'host state stored per course');

  console.log('STATS');
  const s2 = await page(); await s2.goto(B + '?course=example#stats'); await s2.waitForSelector('.st-tiles');
  check(/Example course/.test(await s2.innerText('h1')) && (await s2.$$('a.seg')).length === 2, 'stats page per course with course switch');

  console.log('CHECK PAGE');
  const c = await page(1100, 900); await c.goto(B + '#check'); await c.waitForSelector('#dz');
  const rows = await c.$$eval('.st-tbl tr', r => r.slice(1).map(x => x.innerText.replace(/\s+/g, ' ')));
  check(rows.length === 3 && /ghost/.test(rows[2]), 'site table lists the 3 entries of courses.js');
  await c.setInputFiles('#ckfile', path.join(root, 'courses', 'example.js')); await c.waitForSelector('#ckout h2');
  check(/No problems found/.test(await c.innerText('#ckout')) && (await c.$$('#ckout .card')).length >= 7, 'example.js: no problems, all questions previewed');
  await c.screenshot({ path: path.join(shots, 'm-check-ok.png') });
  const bad1 = path.join(shots, 'bad1.js'); fs.writeFileSync(bad1, "QUIZ.course('bad', ({r}) => ({ title:'Bad', lectures:{1:'A'}, questions:[ {id:'B1', lec:2, diff:4, topic:'t', q:r`If $x<y$ then`, opts:[r`a`, r`a`], exp:r`$x`}, {id:'B1', lec:1, diff:1, topic:'t', q:'q', opts:['a','b'], exp:'e', fig:{x:[0,1], y:[0,1], curves:[{fn:'-(x-1)**2'}]}} ] }));");
  await c.setInputFiles('#ckfile', bad1); await c.waitForFunction(() => /problem/.test(document.getElementById('ckout').innerText));
  const t1 = await c.innerText('#ckout'); const wanted = ['not in lectures', 'diff must be', 'duplicate options', 'unbalanced', 'HTML tag', 'duplicate id', 'does not parse'];
  check(wanted.every(w => t1.includes(w)), 'broken course: all 7 problems reported (' + wanted.filter(w => !t1.includes(w)).join(',') + ')');
  await c.screenshot({ path: path.join(shots, 'm-check-bad.png'), fullPage: false });
  const bad2 = path.join(shots, 'bad2.js'); fs.writeFileSync(bad2, "QUIZ.course('x', () => ({ title:'X', questions:[ { id:'a' ]}));");
  await c.setInputFiles('#ckfile', bad2); await c.waitForFunction(() => /JavaScript error/.test(document.getElementById('ckout').innerText));
  check(true, 'syntax error reported: ' + (await c.innerText('#ckout .banner')).slice(0, 80));

  console.log('\nerrors:', errors.length); errors.slice(0, 10).forEach(e => console.log('  ', e));
  check(errors.length === 0, 'no page errors');
  console.log('LECTURER PASSWORD');
  const lk = await page(); await lk.addInitScript(() => { delete window.SBQ_LECT_HASH; });
  await lk.goto(B + '?course=sysbio'); await lk.waitForSelector('.hero');
  const foot = await lk.innerText('body'); check(!/presenter view|Practice statistics|Check/i.test(foot.replace(/Check your/gi, '')) , 'students see no lecturer links');
  for (const h of ['#host', '#stats', '#check']) { await lk.goto(B + '?course=sysbio' + h); await lk.reload(); await lk.waitForSelector('#lpw'); check(true, h + ' asks for the password'); }
  await lk.fill('#lpw', 'wrong'); await lk.click('[data-act=lectlogin]'); await lk.waitForFunction(() => /Wrong/.test(document.getElementById('lerr').textContent)); check(true, 'wrong password rejected');
  await lk.fill('#lpw', 'Towbin-Lecturer'); await lk.click('[data-act=lectlogin]'); await lk.waitForSelector('#dz'); check(true, 'correct password opens the checker');
  await lk.goto(B + '?course=sysbio#stats'); await lk.reload(); await lk.waitForSelector('.st-tiles'); check(true, 'stays unlocked on this browser');
  await lk.goto(B + '?course=sysbio'); await lk.waitForSelector('.hero'); await lk.click('[data-act=lecturer]'); await lk.waitForSelector('[data-act=lhost]'); check(/Presenter view/.test(await lk.innerText('body')), 'Lecturer button opens the menu when logged in');
  await lk.click('[data-act=lstats][data-arg=example]'); await lk.waitForSelector('.st-tiles'); check(true, 'menu -> statistics of a course');
  await lk.goto(B + '?course=sysbio'); await lk.waitForSelector('.hero'); await lk.click('[data-act=lecturer]'); await lk.waitForSelector('[data-act=lcheck]'); await lk.click('[data-act=lcheck]'); await lk.waitForSelector('#dz'); check(true, 'menu -> course checker');
  await lk.goto(B + '?course=sysbio'); await lk.waitForSelector('.hero'); await lk.click('[data-act=lecturer]'); await lk.waitForSelector('[data-act=lectout]'); await lk.click('[data-act=lectout]'); await lk.waitForSelector('.hero');
  await lk.click('[data-act=lecturer]'); await lk.waitForSelector('#lpw'); check(true, 'Lecturer button asks for the password after log out');
  await lk.fill('#lpw', 'Towbin-Lecturer'); await lk.click('[data-act=lectlogin]'); await lk.waitForSelector('[data-act=lhost]'); await lk.click('[data-act=lhost][data-arg=example]');
  await lk.waitForFunction(() => /Room online/.test((document.getElementById('hstat') || {}).textContent || ''), null, { timeout: 15000 }); check(true, 'login from the button -> menu -> presenter view');
  console.log('BACK NAVIGATION');
  const nv = await page(); await nv.goto(B); await nv.waitForSelector('[data-act=pickcourse]');
  const on = async sel => nv.waitForSelector(sel, { timeout: 5000 });
  await nv.click('[data-act=pickcourse][data-arg=example]'); await on('.hero'); await nv.click('[data-act=practice]'); await on('.wrap h2');
  check(/course=example/.test(nv.url()), 'URL follows the course');
  await nv.goBack(); await on('.hero'); check(await nv.$('[data-act=practice]') !== null, 'browser Back: practice setup -> course start page');
  await nv.goBack(); await on('[data-act=pickcourse]'); check(true, 'browser Back: course start page -> course list');
  await nv.goForward(); await on('.hero'); check(/Example course/.test(await nv.innerText('.hero')), 'browser Forward restores the course');
  await nv.click('[data-act=practice]'); await on('[data-act=back]'); await nv.click('[data-act=back]'); await on('.hero'); check(true, 'in-page Back button on the practice page');
  await nv.click('[data-act=lecturer]'); await on('[data-act=lcheck]');
  await nv.click('[data-act=lcheck]'); await on('#dz'); await nv.click('[data-act=back]'); await on('[data-act=lhost]'); check(true, 'Back from the checker returns to the lecturer menu');
  await nv.click('[data-act=lhost][data-arg=example]'); await nv.waitForFunction(() => document.querySelector('.lobby') !== null, null, { timeout: 15000 }); await nv.click('.ph [data-act=back]'); await on('[data-act=lhost]'); check(true, 'Back from the presenter lobby returns to the menu');
  console.log('INSTANT POLLS');
  const pph = await page(1300, 900); await pph.goto(B + '#poll'); await pph.waitForSelector('#plname');
  await pph.fill('#plname', 'Test class'); await pph.click('[data-act=plnewclass]'); await pph.waitForSelector('#plq');
  const pcode = (await pph.innerText('.lobby .code')).trim(); check(/^[A-Z0-9]{5}$/.test(pcode), 'class gets a room code: ' + pcode);
  await pph.screenshot({ path: path.join(shots, 'm-poll-compose.png') });
  await pph.waitForFunction(() => /Room online/.test((document.getElementById('hstat') || {}).textContent || ''), null, { timeout: 15000 });
  const ps1 = await page(390, 800), ps2 = await page(390, 800);
  for (const sp of [ps1, ps2]) { await sp.goto(B + '?join=' + pcode); await sp.waitForSelector('.card.wait h2'); }
  await pph.waitForFunction(() => +document.querySelector('[data-hc]').textContent >= 2, null, { timeout: 15000 }); check(true, 'two students connected to the poll room');
  // 1) choice with blank options
  await pph.fill('#plq', 'Which?'); await pph.click('[data-act=plstart]');
  for (const sp of [ps1, ps2]) await sp.waitForSelector('button.opt', { timeout: 10000 });
  check((await ps1.$$('button.opt')).length === 4 && (await ps1.innerText('.qtext')).includes('Which?'), 'students see the question with A-D buttons');
  await ps1.click('[data-act=plsel][data-arg="2"]'); await ps1.click('[data-act=plsend]'); await ps2.click('[data-act=plsel][data-arg="0"]'); await ps2.click('[data-act=plsend]');
  await pph.waitForFunction(() => document.querySelector('[data-ha]').textContent === '2', null, { timeout: 10000 }); check(true, 'host counts 2 answers');
  await ps1.click('[data-act=plsel][data-arg="1"]'); await ps1.click('[data-act=plsend]'); await ps1.waitForSelector('.feedback'); // change of mind
  await pph.click('[data-act=plreveal]'); await ps1.waitForSelector('.opt.stat', { timeout: 10000 });
  const hostOpts = await pph.$$eval('.pm .opt .cnt', e => e.map(x => x.textContent)); check(hostOpts.join() === '1 · 50%,1 · 50%,0 · 0%,0 · 0%', 'host shows the distribution (changed answer counted once): ' + hostOpts);
  check(/Your answer/.test(await ps1.innerText('.card')), 'student sees result and own answer');
  // 2) number
  await pph.click('[data-act=plnew]'); await pph.waitForSelector('#plq'); await pph.click('[data-act=pltype][data-arg=num]'); await pph.fill('#plq', 'How many?'); await pph.click('[data-act=plstart]');
  for (const sp of [ps1, ps2]) await sp.waitForSelector('#pin', { timeout: 10000 });
  await ps1.fill('#pin', '5,5'); await ps1.click('[data-act=plsend]'); await ps2.fill('#pin', '3'); await ps2.press('#pin', 'Enter');
  await pph.waitForFunction(() => document.querySelector('[data-ha]').textContent === '2', null, { timeout: 10000 });
  await pph.click('[data-act=plreveal]'); await pph.waitForSelector('.hist', { timeout: 5000 }); await ps2.waitForSelector('.hist', { timeout: 10000 });
  check(/mean\s*4\.25/.test((await pph.innerText('.hstats')).replace(/\n/g, ' ')), 'number poll: histogram with mean 4.25: ' + (await pph.innerText('.hstats')).replace(/\n/g, ' '));
  // 3) word cloud
  await pph.click('[data-act=plnew]'); await pph.waitForSelector('#plq'); await pph.click('[data-act=pltype][data-arg=word]'); await pph.fill('#plq', 'One word?'); await pph.click('[data-act=plstart]');
  for (const sp of [ps1, ps2]) await sp.waitForSelector('#pin', { timeout: 10000 });
  await ps1.fill('#pin', 'Gene'); await ps1.click('[data-act=plsend]'); await ps2.fill('#pin', ' gene '); await ps2.click('[data-act=plsend]');
  await pph.waitForFunction(() => document.querySelector('[data-ha]').textContent === '2', null, { timeout: 10000 });
  await pph.click('[data-act=plreveal]'); await pph.waitForSelector('.wcloud .wc', { timeout: 5000 }); await ps1.waitForSelector('.wcloud .wc', { timeout: 10000 });
  const words = await pph.$$eval('.wcloud .wc', e => e.map(x => x.textContent + ':' + x.title)); check(words.join() === 'Gene:2×', 'word cloud merges Gene / gene: ' + words);
  await pph.screenshot({ path: path.join(shots, 'm-poll-cloud.png') }); await ps1.screenshot({ path: path.join(shots, 'm-poll-student.png') });
  // prepared questions
  pph.on('dialog', d => d.accept());
  await pph.click('[data-act=plnew]'); await pph.waitForSelector('#plq'); await pph.click('[data-act=plbulk]'); await pph.waitForSelector('#plbulk');
  await pph.fill('#plbulk', 'Pick one | Red | Green | Blue\n#num Age?\n#word Favourite gene?\nYes or no? | | '); await pph.click('[data-act=plbulkadd]');
  await pph.waitForSelector('.prow'); check((await pph.$$('.prow')).length === 4, 'bulk add creates 4 prepared questions');
  await pph.click('.prow:first-child [data-act=plrun]'); await ps1.waitForSelector('button.opt', { timeout: 10000 });
  check(/Green/.test(await ps1.innerText('.opts')), 'one click starts a prepared question (answers appear on the phone)');
  await ps1.click('[data-act=plsel][data-arg="1"]'); await ps1.click('[data-act=plsend]'); await pph.waitForFunction(() => document.querySelector('[data-ha]').textContent === '1', null, { timeout: 10000 });
  await pph.click('[data-act=plreveal]'); await pph.waitForSelector('[data-act=plnextprep]'); check(/Age\?/.test(await pph.innerText('[data-act=plnextprep]')), 'reveal offers the next prepared question');
  await pph.click('[data-act=plnextprep]'); await ps1.waitForSelector('#pin', { timeout: 10000 }); check(/Age\?/.test(await ps1.innerText('.qtext')), 'next prepared question reaches the students');
  await pph.click('[data-act=plprep]'); await pph.waitForSelector('.modal .prow'); check((await pph.$$('.modal .prow')).length === 4, 'Prepared list opens during a poll'); await pph.keyboard.press('Escape');
  await pph.click('[data-act=plnewnow]'); await pph.waitForSelector('#plq'); await pph.fill('#plq', 'Saved Q'); await pph.click('[data-act=plsaveprep]');
  await pph.waitForFunction(() => document.querySelectorAll('.prow').length === 5, null, { timeout: 5000 }); check(true, 'Save for later adds the current question');
  await pph.click('.prow:last-child [data-act=plprepdel]'); await pph.waitForFunction(() => document.querySelectorAll('.prow').length === 4, null, { timeout: 5000 }); check(true, 'prepared question can be deleted');
  await pph.screenshot({ path: path.join(shots, 'm-poll-prepared.png') });
  // persistence: same room code after reload
  await pph.goto(B + '#poll'); await pph.reload(); await pph.waitForSelector('[data-act=plopen]'); await pph.click('[data-act=plopen]'); await pph.waitForSelector('.lobby .code, .pf .info b', { timeout: 10000 });
  check((await pph.innerText('body')).includes(pcode), 'same room code after reload (stable QR per class)');
  await pph.click('[data-act=plnewnow]').catch(() => {}); await pph.waitForSelector('#plq', { timeout: 5000 }); check((await pph.$$('.prow')).length === 4, 'prepared questions survive a reload');
  await pph.goto(B + '?course=sysbio'); await pph.waitForSelector('.hero');
  console.log(fails ? fails + ' FAILED' : 'ALL CHECKS PASSED');
  await b.close(); server.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
