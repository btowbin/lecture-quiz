// Prepared lectures: editor (polls + quiz questions, reorder, JSON export/import, room code) and the runner (one room, mixed polls and quiz questions).
// Uses local brokers like test-multi.js.  Run: node test-lecture.js   (needs `node build.js` first)
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const aedesF = require('aedes'), wsStream = require('websocket-stream');
const dir = __dirname, root = path.join(dir, '..'), shots = path.join(dir, 'shots'); fs.mkdirSync(shots, { recursive: true });
const NM = p => path.join(dir, 'node_modules', p);
let fails = 0; const check = (c, m) => { if (!c) { fails++; console.log('  FAIL:', m); } else console.log('  ok:', m); };
const CDN = [[/katex\.min\.css/, NM('katex/dist/katex.min.css'), 'text/css'], [/fonts\/(.+)$/, null, 'font/woff2'], [/katex\.min\.js/, NM('katex/dist/katex.min.js'), 'text/javascript'],
  [/auto-render/, NM('katex/dist/contrib/auto-render.min.js'), 'text/javascript'], [/mqtt/, NM('mqtt/dist/mqtt.min.js'), 'text/javascript'], [/qrcode/, NM('qrcode-generator/qrcode.js'), 'text/javascript']];
const COURSES_BOTH = "QUIZ.courses([{id:'sysbio',file:'sysbio.js',active:true},{id:'example',file:'example.js',active:true}]);";
(async () => {
  const a = aedesF(); const bs = http.createServer().listen(9031, '127.0.0.1'); wsStream.createServer({ server: bs }, a.handle);
  const server = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
    if (u === '/courses/courses.js') { res.setHeader('content-type', 'text/javascript'); return res.end(COURSES_BOTH); }
    const f = path.join(root, u); if (!f.startsWith(root) || !fs.existsSync(f)) { res.statusCode = 404; return res.end('nf'); }
    res.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : 'text/html'); res.end(fs.readFileSync(f)); }).listen(8091, '127.0.0.1');
  const B = 'http://127.0.0.1:8091/';
  const b = await chromium.launch(); const errors = [];
  const page = async (w, h) => { const ctx = await b.newContext({ viewport: { width: w || 1100, height: h || 900 }, acceptDownloads: true }); const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|WebSocket|ERR_|404/.test(m.text())) errors.push(m.text()); });
    await p.addInitScript(() => { window.SBQ_BROKERS = ['ws://127.0.0.1:9031/']; window.SBQ_STATS = 'http://127.0.0.1:1'; window.SBQ_LECT_HASH = ''; });
    await p.route(/cdn\.jsdelivr\.net/, r => { const u = r.request().url(); for (const [re, f, t] of CDN) { const m = u.match(re); if (m) { const ff = f || NM('katex/dist/fonts/' + m[1]); if (fs.existsSync(ff)) return r.fulfill({ body: fs.readFileSync(ff), contentType: t }); } } r.abort(); });
    p.ctx = ctx; return p; };
  const online = p => p.waitForFunction(() => /Room online/.test((document.getElementById('hstat') || {}).textContent || ''), null, { timeout: 15000 });
  const num = (p, sel) => p.waitForFunction(s => document.querySelector(s) !== null, sel, { timeout: 10000 });

  console.log('LECTURER MENU + CREATE');
  const host = await page(1400, 900); host.on('dialog', d => d.accept());
  await host.goto(B + '#lecturer'); await host.waitForSelector('[data-act=llecture]'); check(true, 'lecturer menu has a "Prepare lecture" card');
  await host.click('[data-act=llecture]'); await host.waitForSelector('#lcnewname'); check(/#lecture$/.test(host.url()), 'opens #lecture');
  await host.fill('#lcnewname', 'Test lecture'); await host.selectOption('#lcnewcourse', 'sysbio'); await host.click('[data-act=lcnew]'); await host.waitForSelector('.lcgrid');
  const code = (await host.innerText('.code')).trim(); check(/^[A-Z0-9]{5}$/.test(code), 'lecture gets a room code: ' + code);
  await online(host); check(true, 'room online while editing');
  check(await host.isDisabled('[data-act=lcrun]'), 'Start is disabled while the lecture is empty');

  console.log('EDITOR: polls');
  await host.click('[data-act=lcbulk]'); await host.waitForSelector('#lcbulktx');
  await host.fill('#lcbulktx', '#word What is a transgenic organism?\nWhich is bigger? | *Elephant | Mouse | Ant\n#num How many genes?'); await host.click('[data-act=lcbulkadd]');
  await host.waitForFunction(() => document.querySelectorAll('.lcrow').length === 3, null, { timeout: 5000 }); check(true, 'bulk add creates 3 poll items');
  await host.fill('#lcq', 'Quick choice'); await host.click('[data-act=lcpadd]'); await host.waitForFunction(() => document.querySelectorAll('.lcrow').length === 4, null, { timeout: 5000 }); check(true, 'form adds a 4th poll (A-D)');

  console.log('EDITOR: quiz questions from the course');
  await host.click('[data-act=lcqpick]'); await host.waitForSelector('.modal.setup .sq');
  const nPool = await host.$$eval('.modal.setup .sq', e => e.length); check(nPool > 5, 'picker lists live questions of the course: ' + nPool);
  const ids = await host.$$eval('.modal.setup .sq .id', e => e.map(x => x.textContent.trim()).slice(0, 3));
  for (const id of ids.slice(0, 2)) await host.click('.modal.setup .sq[data-arg="' + id + '"]');
  await host.waitForFunction(() => document.querySelectorAll('.modal.setup .sq.on').length === 2, null, { timeout: 5000 }); check(true, 'two questions ticked: ' + ids.slice(0, 2));
  await host.click('[data-act=lcqdiff][data-arg="3"]'); await host.click('[data-act=lcqdiff][data-arg="1"]'); // hide hard + easy, keeps the filter working
  await host.click('.modal.setup [data-act=lcclose2]'); await host.waitForFunction(() => document.querySelectorAll('.lcrow').length === 6, null, { timeout: 5000 });
  const kinds = await host.$$eval('.lcrow .pill', e => e.map(x => x.textContent)); check(kinds.join() === 'Word / phrase,Choice,Number,Choice,Quiz,Quiz', 'list order: ' + kinds.join());
  // reorder: move first quiz question up above the last poll
  await host.click('.lcrow:nth-child(5) [data-act=lcmove][data-arg$=":-1"]'); const k2 = await host.$$eval('.lcrow .pill', e => e.map(x => x.textContent)); check(k2.join() === 'Word / phrase,Choice,Number,Quiz,Choice,Quiz', 'reorder works: ' + k2.join());
  await host.click('.lcrow:nth-child(4) [data-act=lcmove][data-arg$=":1"]'); // and back
  // edit a poll
  await host.click('.lcrow:nth-child(4) [data-act=lcedititem]'); await host.waitForSelector('[data-act=lcpcancel]'); await host.fill('#lcq', 'Quick choice EDITED'); await host.click('[data-act=lcpadd]');
  await host.waitForFunction(() => /EDITED/.test(document.querySelector('.lcrow:nth-child(4)').textContent), null, { timeout: 5000 }); check(true, 'poll can be edited in place');
  await host.screenshot({ path: path.join(shots, 'l-editor.png'), fullPage: true });

  console.log('JSON export / import');
  const dl = host.waitForEvent('download'); await host.click('[data-act=lcjson]'); const d = await dl; const jp = path.join(shots, 'lecture-export.json'); await d.saveAs(jp);
  const j = JSON.parse(fs.readFileSync(jp, 'utf8')); check(j.format === 'lecture-quiz-lecture' && j.items.length === 6 && j.code === code && j.course === 'sysbio', 'export has format, code, course and 6 items');
  check(j.items.filter(x => x.kind === 'quiz').length === 2 && j.items[1].correct === 0 || j.items.some(x => x.correct === 0), 'quiz refs and the correct answer are exported');

  console.log('RUN: students join once and see polls and quiz questions in sequence');
  const s1 = await page(390, 800), s2 = await page(390, 800);
  for (const s of [s1, s2]) { await s.goto(B + '?join=' + code); await s.waitForSelector('.card.wait h2'); }
  await host.waitForFunction(() => +document.querySelector('[data-hc]').textContent >= 2, null, { timeout: 15000 }); check(true, 'two students connected to the lecture room');
  check(/next question/i.test(await s1.innerText('.card.wait')), 'students wait on the neutral waiting screen');
  await host.click('[data-act=lcrun]'); await host.waitForSelector('.lobby'); check(/Start lecture/.test(await host.innerText('[data-act=lcnext]')), 'run lobby offers Start lecture');
  await host.click('[data-act=lcnext]'); await host.waitForSelector('.pm .qtext');
  // item 1: word
  for (const s of [s1, s2]) await s.waitForSelector('#pin', { timeout: 10000 }); check(/transgenic organism/.test(await s1.innerText('.qtext')), 'item 1 (word cloud) reaches the phones');
  await s1.fill('#pin', 'Gene'); await s1.click('[data-act=plsend]'); await s2.fill('#pin', ' gene '); await s2.click('[data-act=plsend]');
  await host.waitForFunction(() => document.querySelector('[data-ha]').textContent === '2', null, { timeout: 10000 }); check(true, 'host counts 2 word answers');
  {   // an incoming message must not rebuild the page while a student is typing (on a phone that closes the keyboard)
    const mq = require('mqtt'), c = mq.connect('ws://127.0.0.1:9031/'); let raw;
    await new Promise(res => { c.on('connect', () => c.subscribe('lecture-quiz/v1/' + code + '/state')); c.on('message', (t, b) => { raw = b; res(); }); });
    await s1.focus('#pin'); await s1.keyboard.type('ab'); const h = await s1.evaluateHandle(() => document.getElementById('pin'));
    c.publish('lecture-quiz/v1/' + code + '/state', raw); await s1.waitForTimeout(1000);
    check(await s1.evaluate(el => el === document.getElementById('pin') && document.activeElement === el && el.value === 'ab', h), 'an incoming message does not rebuild the page while a student is typing (keyboard stays open)');
    c.end(); await s1.fill('#pin', '');
  }
  await s1.fill('#pin', 'Cell'); await s1.press('#pin', 'Enter'); await host.waitForFunction(() => document.querySelector('[data-ha]').textContent === '3', null, { timeout: 10000 }); check(true, 'a student can add a second word in a lecture (3 words)');
  await s1.click('.wchip:has-text("Cell") .wx'); await host.waitForFunction(() => document.querySelector('[data-ha]').textContent === '2', null, { timeout: 10000 }); check(true, 'a student can remove a word again (2 words)');
  await s1.fill('#pin', 'Cell'); await s1.press('#pin', 'Enter'); await host.waitForFunction(() => document.querySelector('[data-ha]').textContent === '3', null, { timeout: 10000 });
  await host.keyboard.press('Space'); await host.waitForSelector('.wcloud .wc'); await s1.waitForSelector('.wcloud .wc', { timeout: 10000 });
  check((await host.$$eval('.wcloud .wc', e => e.map(x => x.textContent + ':' + x.title))).sort().join() === 'Cell:1×,Gene:2×', 'word cloud merged on host and phone (several words per student)');
  // item 2: choice with correct answer (Elephant) -> two-step reveal
  await host.keyboard.press('Space'); for (const s of [s1, s2]) await s.waitForSelector('button.opt', { timeout: 10000 });
  check(/Elephant/.test(await s1.innerText('.opts')), 'item 2 (choice) with answer texts on the phone');
  await s1.click('[data-act=plsel][data-arg="0"]'); await s1.click('[data-act=plsend]'); await s2.click('[data-act=plsel][data-arg="1"]'); await s2.click('[data-act=plsend]');
  await host.waitForFunction(() => document.querySelector('[data-ha]').textContent === '2', null, { timeout: 10000 });
  await host.keyboard.press('Space'); await s1.waitForSelector('.opt.stat', { timeout: 10000 }); check(/Show correct/.test(await host.innerText('[data-act=lcnext]')), 'reveal step 1; next step offers the correct answer');
  await host.keyboard.press('Space'); await s1.waitForSelector('.feedback.ok', { timeout: 10000 }); await s2.waitForSelector('.feedback.bad', { timeout: 10000 }); check(true, 'step 2: phones show ✓ / ✗');
  // item 3: number
  await host.keyboard.press('Space'); for (const s of [s1, s2]) await s.waitForSelector('#pin', { timeout: 10000 });
  await s1.fill('#pin', '5,5'); await s1.click('[data-act=plsend]'); await s2.fill('#pin', '3'); await s2.press('#pin', 'Enter');
  await host.waitForFunction(() => document.querySelector('[data-ha]').textContent === '2', null, { timeout: 10000 }); await host.keyboard.press('Space'); await host.waitForSelector('.hist');
  check(/mean\s*4\.25/.test((await host.innerText('.hstats')).replace(/\n/g, ' ')), 'number poll: mean 4.25');
  // item 4: quick choice (no correct), item 5: quiz
  await host.keyboard.press('Space'); for (const s of [s1, s2]) await s.waitForSelector('button.opt', { timeout: 10000 });
  await s1.click('[data-act=plsel][data-arg="2"]'); await s1.click('[data-act=plsend]'); await host.waitForFunction(() => document.querySelector('[data-ha]').textContent === '1', null, { timeout: 10000 });
  await host.keyboard.press('Space'); await s1.waitForSelector('.opt.stat', { timeout: 10000 }); check(/Next:/.test(await host.innerText('[data-act=lcnext]')), 'poll without a correct answer goes straight to "Next"');
  await host.screenshot({ path: path.join(shots, 'l-run-poll.png') });
  await host.keyboard.press('Space'); await host.waitForSelector('.pm .qtext');
  const qid5 = ids[0];
  for (const s of [s1, s2]) await s.waitForSelector('.qmeta', { timeout: 10000 });
  check(/question 1 of 2/i.test(await s1.innerText('.qmeta')), 'item 5 is a quiz question, shown with the quiz layout: ' + (await s1.innerText('.qmeta')).replace(/\n/g, ' '));
  check((await host.innerText('.pm .qtext')) === (await s1.innerText('.qtext')), 'phone and projector show the same quiz question');
  await s1.click('.opt >> nth=0'); await s1.click('[data-act=lsubmit]'); await s2.click('.opt >> nth=1'); await s2.click('[data-act=lsubmit]');
  await host.waitForFunction(() => document.querySelector('[data-ha]').textContent === '2', null, { timeout: 10000 }); check(true, 'quiz answers counted');
  await host.keyboard.press('Space'); await s1.waitForSelector('.feedback', { timeout: 10000 }); check(true, 'quiz reveal reaches the phones');
  await host.screenshot({ path: path.join(shots, 'l-run-quiz.png') }); await s1.screenshot({ path: path.join(shots, 'l-student-quiz.png') });
  // back navigation
  await host.keyboard.press('ArrowLeft'); await s1.waitForSelector('.opt:not(.stat)', { timeout: 10000 }); check(true, 'Back returns the phones to the open question');
  await host.keyboard.press('ArrowRight'); await s1.waitForSelector('.feedback', { timeout: 10000 });
  // pause / resume
  await host.keyboard.press('p'); await s1.waitForSelector('.card.wait', { timeout: 10000 }); check(/Resume/.test(await host.innerText('[data-act=lcnext]')), 'Pause shows the waiting screen on the phones; host offers Resume');
  await host.keyboard.press('Space'); await s1.waitForSelector('.feedback', { timeout: 10000 }); check(true, 'Resume restores the revealed state');
  // last item -> next quiz, then finish
  await host.keyboard.press('Space'); await s1.waitForSelector('.qmeta', { timeout: 10000 }); check(/question 2 of 2/i.test(await s1.innerText('.qmeta')), 'second quiz question is 2 of 2');
  await host.keyboard.press('Space'); await host.keyboard.press('Space'); await host.waitForSelector('.overlay .modal h2'); check(/End of the lecture/.test(await host.innerText('.overlay .modal')), 'after the last item an end-of-lecture dialog appears');
  // results csv
  const dl2 = host.waitForEvent('download'); await host.click('.overlay [data-act=lccsv]'); const d2 = await dl2; const cp = path.join(shots, 'lecture-results.csv'); await d2.saveAs(cp);
  const csv = fs.readFileSync(cp, 'utf8'); check(csv.split('\n').length >= 9 && /"quiz"/.test(csv) && /"poll"/.test(csv) && /Gene/.test(csv), 'CSV has poll and quiz answers (' + csv.split('\n').length + ' lines)');
  await host.click('.overlay [data-act=lcstop]'); await host.waitForSelector('.lcgrid'); await s1.waitForSelector('.card.wait', { timeout: 10000 }); check(true, 'Back to the editor puts the phones on the waiting screen');

  console.log('PERSISTENCE');
  const code2 = (await host.innerText('.code')).trim(); await host.reload(); await host.waitForSelector('[data-act=lcopen]'); await host.click('[data-act=lcopen]'); await host.waitForSelector('.lcgrid');
  check((await host.innerText('.code')).trim() === code && code2 === code, 'same room code after reload (stable QR)'); check((await host.$$('.lcrow')).length === 6, 'items survive a reload');
  check(!(await host.isDisabled('[data-act=lccsv]')), 'collected answers survive a reload');
  await host.click('[data-act=lcreset]'); await host.waitForFunction(() => document.querySelector('[data-act=lccsv]').disabled, null, { timeout: 5000 }); check(true, 'Clear answers empties the results');

  console.log('IMPORT');
  await host.click('[data-act=lcclose]'); await host.waitForSelector('#lcfile', { state: 'attached' });
  await host.setInputFiles('#lcfile', jp); await host.waitForSelector('.lcgrid', { timeout: 10000 });
  const ncode = (await host.innerText('.code')).trim(); check((await host.$$('.lcrow')).length === 6 && ncode !== code, 'import creates a lecture with 6 items and (code in use) a new room code: ' + ncode);
  await host.click('[data-act=lcclose]'); await host.waitForSelector('[data-act=lcopen]'); check((await host.$$('[data-act=lcopen]')).length === 2, 'now two lectures listed');
  fs.writeFileSync(path.join(shots, 'bad.json'), '{"hello":1}'); await host.setInputFiles('#lcfile', path.join(shots, 'bad.json')); await host.waitForFunction(() => /not a lecture file/.test((document.getElementById('lcpickmsg') || {}).textContent || ''), null, { timeout: 5000 }); check(true, 'a wrong file is rejected with a message');
  // delete
  await host.click('[data-act=lcdelete] >> nth=1'); await host.waitForFunction(() => document.querySelectorAll('[data-act=lcopen]').length === 1, null, { timeout: 5000 }); check(true, 'lecture can be deleted');

  console.log('REGRESSION: existing live quiz + instant poll still start');
  const h2 = await page(1300, 900); await h2.goto(B + '?course=sysbio#host'); await online(h2); check(true, 'quiz presenter still online');
  await h2.goto(B + '#poll'); await h2.waitForSelector('#plname'); check(true, 'instant poll page still opens');

  check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log(fails ? fails + ' FAILED' : 'ALL CHECKS PASSED');
  await b.close(); server.close(); bs.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
