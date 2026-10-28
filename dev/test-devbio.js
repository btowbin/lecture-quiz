// DevBio course test: German UI, all three question types in practice, images, check page, live mode (single choice only).
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const aedesF = require('aedes'), wsStream = require('websocket-stream');
const dir = __dirname, root = path.join(dir, '..'), shots = path.join(dir, 'shots'); fs.mkdirSync(shots, { recursive: true });
const NM = p => path.join(dir, 'node_modules', p);
let fails = 0; const check = (c, m) => { if (!c) { fails++; console.log('  FAIL:', m); } else console.log('  ok:', m); };
const CDN = [[/katex\.min\.css/, NM('katex/dist/katex.min.css'), 'text/css'], [/fonts\/(.+)$/, null, 'font/woff2'], [/katex\.min\.js/, NM('katex/dist/katex.min.js'), 'text/javascript'],
  [/auto-render/, NM('katex/dist/contrib/auto-render.min.js'), 'text/javascript'], [/mqtt/, NM('mqtt/dist/mqtt.min.js'), 'text/javascript'], [/qrcode/, NM('qrcode-generator/qrcode.js'), 'text/javascript']];
const TYPE = { '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.html': 'text/html' };
(async () => {
  const a = aedesF(); const bs = http.createServer().listen(9031, '127.0.0.1'); wsStream.createServer({ server: bs }, a.handle);
  const server = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
    const f = path.join(root, u); if (!f.startsWith(root) || !fs.existsSync(f)) { res.statusCode = 404; return res.end('nf'); }
    res.setHeader('content-type', TYPE[path.extname(f)] || 'application/octet-stream'); res.end(fs.readFileSync(f)); }).listen(8097, '127.0.0.1');
  const B = 'http://127.0.0.1:8097/';
  const b = await chromium.launch(); const errors = [];
  const page = async (w, h) => { const p = await (await b.newContext({ viewport: { width: w || 1000, height: h || 900 } })).newPage();
    p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|WebSocket|ERR_/.test(m.text())) errors.push(m.text()); });
    await p.addInitScript(() => { window.SBQ_BROKERS = ['ws://127.0.0.1:9031/']; window.SBQ_STATS = 'http://127.0.0.1:1'; });
    await p.route(/cdn\.jsdelivr\.net/, r => { const u = r.request().url(); for (const [re, f, t] of CDN) { const m = u.match(re); if (m) { const ff = f || NM('katex/dist/fonts/' + m[1]); if (fs.existsSync(ff)) return r.fulfill({ body: fs.readFileSync(ff), contentType: t }); } } r.abort(); });
    return p; };

  console.log('HOME + PRACTICE (German UI)');
  const p = await page(); await p.goto(B + '?course=devbio'); await p.waitForSelector('.hero');
  check(/Selbst üben/.test(await p.innerText('body')) && /Üben starten/.test(await p.innerText('body')), 'German home page');
  await p.screenshot({ path: path.join(shots, 'dv-home.png') });
  await p.click('[data-act=practice]'); await p.waitForSelector('[data-act=ptype]');
  const tt = await p.$$eval('[data-act=ptype]', e => e.map(x => x.textContent)); check(tt.length === 3, 'type filter: ' + tt.join(' | '));
  check(/Vorlesung 1 · Zelldifferenzierung/.test(await p.innerText('.chips')), 'lecture labels with "Vorlesung"');
  await p.screenshot({ path: path.join(shots, 'dv-setup.png'), fullPage: true });
  await p.selectOption('#nq', '0'); await p.click('[data-act=pstart]');
  let n = 0, seen = { sc: 0, tf: 0, short: 0 }, imgsBad = 0, shot = {};
  while (true) {
    await p.waitForSelector('.qtext');
    const kind = (await p.$('[data-act=ptf]')) ? 'tf' : (await p.$('#myans')) ? 'short' : 'sc'; seen[kind]++;
    if (kind === 'sc') { await p.keyboard.press('a'); await p.click('[data-act=pcheck]'); }
    else if (kind === 'tf') { const btns = await p.$$('[data-act=ptf]'); for (let i = 0; i < btns.length; i += 2) await p.click(`[data-act=ptf] >> nth=${i}`); await p.click('[data-act=pcheck]'); }
    else { await p.fill('#myans', 'Meine Antwort'); await p.click('[data-act=pcheck]'); await p.waitForSelector('[data-act=pcrit]'); await p.click('[data-act=pcrit] >> nth=0'); }
    await p.waitForSelector('.feedback');
    await p.waitForTimeout(30);
    const bad = await p.$$eval('img', is => is.filter(i => i.complete && i.naturalWidth === 0).map(i => i.src)); imgsBad += bad.length; if (bad.length) console.log('   broken img', bad);
    if (!shot[kind] || (kind === 'sc' && !shot.img && (await p.$('.fig.img')))) { if (await p.$('.fig.img')) shot.img = 1; shot[kind] = 1; await p.screenshot({ path: path.join(shots, 'dv-' + kind + (shot.img ? '-img' : '') + '.png'), fullPage: true }); }
    n++;
    const lbl = await p.innerText('[data-act=pnext]'); await p.click('[data-act=pnext]');
    if (/Ergebnis/.test(lbl)) break;
  }
  await p.waitForSelector('.big-score'); await p.screenshot({ path: path.join(shots, 'dv-done.png'), fullPage: true });
  check(n === 116, 'went through all 116 questions'); check(seen.sc === 77 && seen.tf === 13 && seen.short === 26, 'types: ' + JSON.stringify(seen));
  check(imgsBad === 0, 'all images load'); check(/Punkte:/.test(await p.innerText('.card')), 'result shows points');

  console.log('CHECK PAGE');
  const c = await page(); await c.goto(B + '#check'); await c.waitForSelector('.st-tbl');
  const row = await c.$$eval('.st-tbl tr', r => r.map(x => x.innerText.replace(/\s+/g, ' ')).find(t => /devbio/.test(t))); check(/116 0/.test(row), 'devbio: 116 questions, 0 problems (' + row + ')');
  await c.click('[data-act=ckshow][data-arg=devbio]'); await c.waitForSelector('#ckout h2'); check((await c.$$('#ckout .card')).length >= 117, 'preview of all questions');

  console.log('LIVE (single choice only, German)');
  const host = await page(1400, 900); await host.goto(B + '?course=devbio#host'); await host.waitForFunction(() => /Room online/.test((document.getElementById('hstat') || {}).textContent || ''), null, { timeout: 15000 });
  const code = (await host.$eval('.code', e => e.textContent)).trim();
  await host.click('[data-act=hsetup]'); await host.waitForSelector('.modal.setup');
  check(/practice mode only/.test(await host.innerText('.modal')), 'setup notes practice-only questions');
  await host.click('[data-act=hn][data-arg="0"]'); const nAll = (await host.$$('.sqlist .sq')).length; check(nAll === 77, 'live pool = 77 single-choice questions (' + nAll + ')');
  await host.click('.modal [data-act=hsetupdone]'); await host.click('[data-act=hnext]'); await host.waitForSelector('.pm .qtext');
  const st = await page(390, 800); await st.goto(B + '?join=' + code); await st.waitForSelector('.qtext', { timeout: 15000 });
  const sqm = await st.innerText('.qmeta'), sbody = await st.innerText('body'); check(/Frage 1 von 77/i.test(sqm) && /Antwort abgeben/.test(sbody), 'student sees German live question: ' + sqm.slice(0, 40)); await st.screenshot({ path: path.join(shots, 'dv-student.png') });
  await host.screenshot({ path: path.join(shots, 'dv-host.png') });

  console.log('\nerrors:', errors.length); errors.slice(0, 10).forEach(e => console.log('  ', e));
  check(errors.length === 0, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL CHECKS PASSED');
  await b.close(); server.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
