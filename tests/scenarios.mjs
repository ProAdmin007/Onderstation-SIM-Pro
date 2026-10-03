// Speelt alle scenario's en diensten volledig uit met een automatische operator ("bot")
// en controleert of ze eindigen met een rapport, zonder paginafouten.
// Gebruik: npm run test:scenarios            (alles)
//          npm run test:scenarios -- storm   (alleen scenario's met 'storm' in de naam)
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pageUrl = pathToFileURL(path.join(root, 'index.html')).href;
const chrome = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => existsSync(p));
const only = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- de bot: draait in de pagina en reageert zoals een goede operator
async function bot() {
  const O = window.OS, D = O.D, S = O.SIM, G = O.GAME, wait = ms => new Promise(r => setTimeout(r, ms));
  const log = [], note = m => log.push(`${String(Math.floor(S.t / 60) % 24).padStart(2, '0')}:${String(Math.floor(S.t % 60)).padStart(2, '0')} ${m}`);
  S.speed = 1;   // eigen animatielus laat de tijd dan nauwelijks lopen; de bot stapt zelf
  const step = min => { const p = S.paused; S.paused = false; for (let i = 0; i < min * 4; i++) O.simStep(0.25 * 60 / S.speed); S.paused = p; };
  const isOpen = () => !document.querySelector('#radio').classList.contains('hidden');
  async function op(id, to) {
    const d = D[id]; if (!d || d.state === to) return true;
    if (d.springAt && performance.now() < d.springAt) await wait(d.springAt - performance.now() + 50);
    O.operate(id, to);
    if (isOpen()) { document.querySelector('[data-rd="meld"]').click(); await wait(1700); }   // netjes melden aan de monteur
    if (d.state !== to) note(`kon ${id} niet ${to ? 'inschakelen' : 'uitschakelen'}: ${document.querySelector('#toast').textContent}`);
    return d.state === to;
  }
  const EN = () => O.EN(), shed = new Set();
  const T3 = () => D.T3;
  while (!G.ended) {
    step(0.5); await wait(60);
    // 1. lijnen: weer inschakelen zodra TenneT spanning geeft
    for (const L of ['L1', 'L2']) if (S.lines[L].avail && D[L + '-Q0'].state === 0 && D[L + '-Q9'].state && D[L + '-Q1'].state) await op(L + '-Q0', 1);
    // 2. ringen: fout isoleren, terugvoeden via normaal-open punt, na reparatie normaliseren
    for (const s of O.RING.secs) {
      const iso = [s.a && s.a + '-R', s.b && s.b + '-L'].filter(Boolean);
      if (s.fault && !s.handled) { for (const id of iso) await op(id, 0); await op(s.ring.nop, 1); s.handled = true; note(`ringfout ${s.id} geïsoleerd`); }
      if (!s.fault && s.handled) { for (const id of iso) await op(id, 1); s.handled = false; note(`kabel ${s.id} weer in bedrijf`);
        if (!O.RING.secs.some(x => x.ring === s.ring && x.handled)) await op(s.ring.nop, 0); }
    }
    // 3. transformatoren: geblokkeerd → reserve inzetten; na reset weer terug
    for (const T of ['T1', 'T2']) {
      const t = D[T], lv = T === 'T1' ? 'V-T1' : 'W-T2';
      if (t.blocked && t.resettable) { O.resetLockout(T); note(`${T} gereset`); }
      if (!t.blocked && D[T + '-Q0'].state === 0) { await op(T + '-Q1', 1); await op(T + '-Q0', 1); }
      if (!t.blocked && EN().has(T + 'h') && D[lv].state === 0) await op(lv, 1);
      const need = T === 'T1' ? '10' : '20', res = T === 'T1' ? 'V-T3' : 'W-T3', down = t.blocked || D[lv].state === 0 || (T === 'T1' && t.fanFail);
      if (down && !T3().blocked && D[res].state === 0) {
        if (T3().ratio !== need && !D['V-T3'].state && !D['W-T3'].state) { await op('T3-Q0', 0); O.setRatio(need); await wait(3300); await op('T3-Q0', 1); }
        if (T3().ratio === need) { await op(res, 1); note(`reserve T3 op ${need} kV ingezet`); }
      }
    }
    if (D['T3-Q0'].state === 0 && !T3().blocked && !T3().ratioBusy) await op('T3-Q0', 1);
    if (D['V-K'].state === 0 && !O.task()) await op('V-K', 1);
    // 4. thermiek: kassen afschakelen bij hete transformator, later terug
    const hot = ['T1', 'T2', 'T3'].some(T => D[T].oil > 92);
    if (hot && D['V-F6'].state) { await op('V-F6', 0); shed.add('V-F6'); note('kassen afgeschakeld (hete trafo)'); }
    if (!hot && shed.has('V-F6') && ['T1', 'T3'].every(T => D[T].oil < 78)) { shed.delete('V-F6'); await op('V-F6', 1); }
    // 5. uitgaande velden: na isolatie van een kabelfout of na een overstroomtrip weer inschakelen
    for (const f of O.FEEDERS) {
      if (D[f.cb].state || shed.has(f.cb) || f.backfed) continue;
      if (f.fault && f.fault.stage === 'search') continue;
      if (f.ring) { const head = O.RING.secs.find(s => s.node === f.id); if (head.fault) continue; }
      if (EN().has(f.bus)) await op(f.cb, 1);
    }
  }
  return { obj: G.obj.map(o => `${o.state === 'done' ? '✓' : '✗'} ${o.t}`), score: Math.round(G.score), cml: Math.round(S.cml), incidents: S.incidents,
    report: !document.querySelector('#report').classList.contains('hidden'), log: log.slice(-12) };
}

const RUNS = [
  { name: 'zkh', query: '?play=zkh' }, { name: 'storm', query: '?play=storm' }, { name: 'piek', query: '?play=piek' },
  { name: 'blackout', query: '?play=blackout' }, { name: 'hitte', query: '?play=hitte' }, { name: 'winter', query: '?play=winter' },
  { name: 'dubbel', query: '?play=dubbel' }, { name: 'dagdienst', query: '?play=day' }, { name: 'avonddienst', query: '?play=eve&diff=zwaar' },
];
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--window-size=1100,700'], defaultViewport: { width: 1100, height: 700 } });
let failed = 0;
for (const r of RUNS) {
  if (only && !r.name.includes(only)) continue;
  const page = await browser.newPage(), errors = [], t0 = Date.now();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/AudioContext/.test(m.text())) errors.push(m.text()); });
  await page.goto(pageUrl + r.query, { waitUntil: 'load', timeout: 120000 });
  for (let i = 0; i < 120 && !(await page.evaluate(() => !!window.OS)); i++) await sleep(500);
  try {
    const res = await page.evaluate(bot);
    const missed = res.obj.filter(o => o.startsWith('✗'));
    const ok = res.report && !errors.length;
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} ${r.name} – score ${res.score}, CML ${res.cml}, incidenten ${res.incidents} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    res.obj.forEach(o => console.log('    ' + o));
    if (missed.length || !ok) res.log.forEach(l => console.log('      · ' + l));
    if (errors.length) console.log('    fouten: ' + errors.join(' | '));
  } catch (e) { failed++; console.log(`✗ ${r.name}: ${e.message}`); }
  await page.close();
}
await browser.close();
console.log(failed ? `\n${failed} scenario('s) mislukt` : '\nAlle scenario\'s uitgespeeld');
process.exit(failed ? 1 : 0);
