const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const aedesF = require('aedes'), wsStream = require('websocket-stream');
const dir = __dirname, root = path.join(__dirname, '..'), shots = path.join(dir, 'shots'); fs.mkdirSync(shots, { recursive: true });
const NM = p => path.join(dir, 'node_modules', p);
const CDN = [
  [/katex@0\.16\.9\/dist\/katex\.min\.css/, NM('katex/dist/katex.min.css'), 'text/css'],
  [/katex@0\.16\.9\/dist\/fonts\/(.+)$/, null, null],
  [/katex@0\.16\.9\/dist\/katex\.min\.js/, NM('katex/dist/katex.min.js'), 'text/javascript'],
  [/katex@0\.16\.9\/dist\/contrib\/auto-render\.min\.js/, NM('katex/dist/contrib/auto-render.min.js'), 'text/javascript'],
  [/mqtt@5\.10\.1\/dist\/mqtt\.min\.js/, NM('mqtt/dist/mqtt.min.js'), 'text/javascript'],
  [/qrcode-generator@1\.4\.4\/qrcode\.js/, NM('qrcode-generator/qrcode.js'), 'text/javascript'],
];
const log = (...a) => console.log(...a);
let fails = 0; const check = (c, m) => { if (!c) { fails++; console.log('  FAIL:', m); } else console.log('  ok:', m); };

const BROKERS = ['ws://127.0.0.1:9001/', 'ws://127.0.0.1:9002/'];
async function newPage(ctx, errors, tag, brokers) {
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|WebSocket|ERR_/.test(m.text())) errors.push(tag + ' console: ' + m.text()); });
  await p.addInitScript(b => { window.SBQ_BROKERS = b; window.SBQ_STATS = 'http://127.0.0.1:9301'; window.SBQ_LECT_HASH = ''; }, brokers || BROKERS);
  await p.route(/cdn\.jsdelivr\.net/, route => {
    const u = route.request().url();
    for (const [re, file, type] of CDN) {
      const m = u.match(re); if (!m) continue;
      const f = file || NM('katex/dist/fonts/' + m[1]);
      if (fs.existsSync(f)) return route.fulfill({ body: fs.readFileSync(f), contentType: type || 'font/woff2' });
    }
    route.abort();
  });
  return p;
}

(async () => {
  for (const port of [9001, 9002]) { const a = aedesF(); const srv = http.createServer().listen(port, '127.0.0.1'); wsStream.createServer({ server: srv }, a.handle); }
  const server = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; const f = path.join(root, u);
    if (!f.startsWith(root) || !fs.existsSync(f)) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : 'text/html'); res.end(fs.readFileSync(f)); }).listen(8080, '127.0.0.1');
  const browser = await chromium.launch({ args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] });
  const errors = [];
  const BASE = 'http://127.0.0.1:8080/';

  /* ---------------- practice mode ---------------- */
  log('PRACTICE MODE');
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const p = await newPage(ctx, errors, 'practice');
  await p.goto(BASE + '?course=sysbio'); await p.waitForSelector('.hero');
  await p.screenshot({ path: path.join(shots, 'home.png') });
  await p.click('[data-act=practice]'); await p.waitForSelector('.chip');
  await p.screenshot({ path: path.join(shots, 'practice-setup.png') });
  await p.selectOption('#nq', '0'); // all
  await p.click('[data-act=pstart]'); await p.waitForSelector('.qtext');
  let n = 0, figs = 0, katexOk = true;
  while (true) {
    await p.waitForSelector('.opt');
    const hasFig = await p.$('.fig svg'); const total = await p.$$eval('.opt', e => e.length);
    check(total >= 2, 'q' + (n + 1) + ' has options'); if (total < 2) break;
    // raw "$" left over = math not rendered
    const txt = await p.$eval('.card', e => e.innerText);
    if (/\$/.test(txt)) { katexOk = false; log('  raw $ in q' + (n + 1) + ':', txt.slice(0, 120).replace(/\n/g, ' ')); }
    const errEl = await p.$('.katex-error'); if (errEl) { katexOk = false; log('  katex-error in q' + (n + 1)); }
    await p.keyboard.press('a'); await p.keyboard.press('Enter'); // select + check
    await p.waitForSelector('.feedback');
    if (hasFig) { const svg = await p.$eval('.fig svg', e => e.outerHTML); if (/NaN/.test(svg)) log('  NaN in fig of q' + (n + 1) + ': ' + (await p.$eval('.qmeta', e => e.textContent)) + ' :: ' + (svg.match(/<[^>]*NaN[^>]*>/) || [''])[0].slice(0, 160)); figs++; await p.screenshot({ path: path.join(shots, 'fig-' + (await p.$eval('.qmeta', e => e.textContent)).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) + '.png'), fullPage: true }); }
    if (n === 0) await p.screenshot({ path: path.join(shots, 'practice-q1-checked.png'), fullPage: true });
    n++;
    const done = await p.$('[data-act=pnext]'); const lbl = await done.innerText();
    await p.keyboard.press('Enter');
    if (/results/i.test(lbl)) break;
  }
  await p.waitForSelector('.big-score');
  check(n === 79, 'stepped through all 79 questions (got ' + n + ')'); check(figs >= 9, figs + ' figure questions rendered'); check(katexOk, 'no raw $ / katex errors in any question');
  await p.screenshot({ path: path.join(shots, 'practice-done.png') });

  /* ---------------- live mode ---------------- */
  log('LIVE MODE');
  const hctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const host = await newPage(hctx, errors, 'host');
  await host.goto(BASE + '?course=sysbio#host'); await host.waitForSelector('.code');
  await host.waitForFunction(() => document.getElementById('hstat') && /Room online$/.test(document.getElementById('hstat').textContent.trim()), null, { timeout: 15000 });
  const code = (await host.$eval('.code', e => e.textContent)).trim();
  log('  room code', code); check(/^[A-Z2-9]{5}$/.test(code), 'room code format');
  check(await host.$('.qrbox svg path') !== null, 'QR rendered');
  await host.screenshot({ path: path.join(shots, 'host-lobby.png') });

  const students = [];
  for (let i = 0; i < 6; i++) {
    const c = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const s = await newPage(c, errors, 'student' + i, i === 5 ? ['ws://127.0.0.1:9999/', 'ws://127.0.0.1:9002/'] : (i % 2 ? [BROKERS[1], BROKERS[0]] : BROKERS)); await s.goto(BASE + '?join=' + code); students.push(s);
  }
  await Promise.all(students.map(s => s.waitForSelector('.wait h2', { timeout: 20000 })));
  await host.waitForFunction(() => document.querySelector('[data-hc]').textContent === '6', null, { timeout: 20000 });
  check(true, '6 students connected to host');
  await students[0].screenshot({ path: path.join(shots, 'student-waiting.png') });

  // select lecture 2 only, start
  // ---- session setup panel ----
  const rows = () => host.$$eval('.sqlist .sq', els => els.map(e => ({ id: e.querySelector('.id').textContent, on: e.classList.contains('on') })));
  await host.click('[data-act=hsetup]'); await host.waitForSelector('.modal.setup');
  check((await rows()).length === 8, 'default: random draw of 8');
  for (const n of [1, 3, 4, 5, 6, 7]) await host.click('.modal [data-act=hchip][data-arg="' + n + '"]');
  let r = await rows(); check(r.length === 8 && r.every(x => /^L2-/.test(x.id)), 'lecture filter: 8 drawn, all from L2');
  await host.click('[data-act=hn][data-arg="5"]'); r = await rows(); check(r.length === 5, 'number = 5');
  const before = r.map(x => x.id).join(); let changed = false;
  for (let i = 0; i < 5 && !changed; i++) { await host.click('[data-act=hdraw]'); changed = (await rows()).map(x => x.id).join() !== before; }
  check(changed && (await rows()).length === 5, 'draw again gives a different set of 5');
  await host.click('[data-act=hn][data-arg="0"]'); check((await rows()).length === 14, '"All" = 14 L2 questions');
  await host.click('[data-act=htopick]'); r = await rows(); check(r.length === 14 && r.filter(x => x.on).length === 14, 'edit by hand: 14 ticked');
  await host.click('[data-act=hpicknone]'); check((await rows()).filter(x => x.on).length === 0, 'clear selection');
  for (const id of ['L2-12', 'L2-01', 'L2-05']) await host.click('[data-act=hpick][data-arg="' + id + '"]');
  check((await rows()).filter(x => x.on).length === 3, '3 questions ticked by hand');
  await host.screenshot({ path: path.join(shots, 'host-setup.png') });
  await host.click('.modal [data-act=hsetupdone]');
  check(/3 questions/.test(await host.innerText('.sumbox')), 'lobby summary: 3 questions');
  await host.screenshot({ path: path.join(shots, 'host-lobby2.png') });
  await host.click('[data-act=hnext]'); await host.waitForSelector('.pm .qtext');
  check(/Question 1 \/ 3/.test(await host.innerText('.ph')), 'host shows Question 1 / 3');
  check(await host.evaluate(() => JSON.parse(localStorage.getItem('lq.sysbio.host')).plan.join()) === 'L2-01,L2-05,L2-12', 'plan in lecture order');
  await Promise.all(students.map(s => s.waitForSelector('.qtext', { timeout: 10000 })));
  check(true, 'question pushed to all students');
  const hq = await host.$eval('.qmeta, .ph .lec', e => e.textContent); check(/Lecture 2/.test(hq), 'host shows lecture 2: ' + hq);
  await host.screenshot({ path: path.join(shots, 'host-question.png') });
  await students[0].screenshot({ path: path.join(shots, 'student-question.png'), fullPage: true });

  // students answer: first 4 pick the correct answer (letter shown for original index 0), 2 pick wrong
  const idxs = await host.$$eval('.pm .opt .t', els => els.map(e => e.textContent));
  for (let i = 0; i < 6; i++) {
    const s = students[i];
    const sel = await s.$$('.opt'); // pick by text: correct = first option in source; find via exposed bank? use heuristic below
    await s.click('.opt >> nth=' + (i % 4)); await s.click('[data-act=lsubmit]');
  }
  await host.waitForFunction(() => document.querySelector('[data-ha]').textContent === '6', null, { timeout: 10000 });
  check(true, 'host counted 6 answers');
  await students[0].waitForSelector('.feedback', { timeout: 5000 });
  check((await students[0].innerText('.feedback')).includes('Answer'), 'student sees "answer received"');
  // locked: clicking another option should do nothing
  await host.keyboard.press('Space'); // reveal
  await Promise.all(students.map(s => s.waitForSelector('.feedback.ok, .feedback.bad', { timeout: 10000 })));
  check(true, 'reveal reached all students');
  const tally = await host.$eval('.tally', e => e.innerText.replace(/\n/g, ' ')); log('  tally:', tally);
  check(/correct/.test(tally) && /wrong/.test(tally), 'host shows correct/wrong tally');
  const sumCnt = await host.$$eval('.pm .opt .cnt', els => els.map(e => parseInt(e.textContent)).reduce((a, b) => a + b, 0)); check(sumCnt === 6, 'bars sum to 6 answers (got ' + sumCnt + ')');
  await host.keyboard.press('e'); await host.screenshot({ path: path.join(shots, 'host-reveal.png') });
  await students[1].screenshot({ path: path.join(shots, 'student-reveal.png'), fullPage: true });

  // next question, late joiner, student reconnect after reload
  await host.keyboard.press('Space'); await students[2].waitForFunction(() => /question 2/i.test(document.body.innerText), null, { timeout: 8000 });
  check(true, 'next question pushed');
  const late = await newPage(await browser.newContext({ viewport: { width: 390, height: 800 } }), errors, 'late'); await late.goto(BASE + '?join=' + code);
  await late.waitForSelector('.qtext', { timeout: 20000 }); check(/question 2/i.test(await late.innerText('.qmeta')), 'late joiner sees current question');
  await late.click('.opt >> nth=0'); await late.click('[data-act=lsubmit]'); await students[3].click('.opt >> nth=1'); await students[3].click('[data-act=lsubmit]'); await students[3].waitForFunction(() => /Answer received/.test(document.body.innerText), null, { timeout: 8000 });
  await students[3].reload(); await students[3].waitForSelector('.feedback', { timeout: 20000 });
  check((await students[3].innerText('.feedback')).includes('Answer'), 'reloaded student keeps its locked answer');
  await host.waitForFunction(() => document.querySelector('[data-ha]').textContent === '2', null, { timeout: 8000 }); check(true, 'host counts 2 answers (reload did not double count)');

  // host reload keeps session
  await host.reload(); await host.waitForSelector('.pm .qtext');
  await host.waitForFunction(() => /Room online$/.test(document.getElementById('hstat').textContent.trim()), null, { timeout: 30000 });
  check(/question 2/i.test(await host.innerText('.ph')), 'host resumes at question 2 after reload');
  await host.waitForFunction(() => parseInt(document.querySelector('[data-hc]').textContent) >= 5, null, { timeout: 30000 });
  check(true, 'students auto-reconnect to reloaded host');
  await host.waitForFunction(() => document.querySelector('[data-ha]').textContent === '2', null, { timeout: 5000 }); check(true, 'answers persisted across host reload');

  // question list overlay
  await host.keyboard.press('l'); await host.waitForSelector('.qlist'); await host.screenshot({ path: path.join(shots, 'host-list.png') });
  await host.click('.qli >> nth=2'); await host.waitForFunction(() => /Question 3 \/ 3/.test(document.querySelector('.ph').innerText), null, { timeout: 5000 }); check(true, 'click in question list jumps to question 3');
  await host.keyboard.press('Escape'); await host.keyboard.press('q'); await host.waitForSelector('.modal .qrbox'); await host.screenshot({ path: path.join(shots, 'host-qr.png') });

  await host.keyboard.press('Escape'); await host.keyboard.press('Escape');
  host.once('dialog', d => d.accept()); await host.click('[data-act=hend]'); await host.waitForSelector('[data-act=hsetup]', { timeout: 5000 });
  check(/Start quiz/.test(await host.innerText('[data-act=hnext]')), 'End session returns to start page (Start, not Resume)');
  await students[0].waitForFunction(() => /Waiting for the lecturer/.test(document.body.innerText), null, { timeout: 8000 }); check(true, 'students back to waiting screen');
  log('\nconsole/page errors:', errors.length); errors.slice(0, 15).forEach(e => log('  ', e));
  check(errors.length === 0, 'no console/page errors');
  log(fails ? '\n' + fails + ' CHECK(S) FAILED' : '\nALL CHECKS PASSED');
  await browser.close(); server.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
