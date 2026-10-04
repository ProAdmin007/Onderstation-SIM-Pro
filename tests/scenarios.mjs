// Speelt alle scenario's en diensten volledig uit met een automatische operator ("bot")
// en controleert of ze eindigen met een rapport, zonder paginafouten.
// Gebruik: npm run test:scenarios            (alles)
//          npm run test:scenarios -- storm   (alleen scenario's met 'storm' in de naam)
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
// tests draaien met lagere prioriteit, zodat de rest van de server voorgaat (TEST_PRIORITY=normal om uit te zetten);
// de browsers die hierna starten erven die prioriteit
if (process.env.TEST_PRIORITY !== 'normal') try { os.setPriority(0, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (e) {}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pageUrl = pathToFileURL(path.join(root, 'index.html')).href;
const chrome = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => existsSync(p));
const only = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- de bot: draait in de pagina en reageert zoals een goede operator
async function bot(process_full) {
  const O = window.OS, D = O.D, S = O.SIM, G = O.GAME, wait = ms => new Promise(r => setTimeout(r, ms));
  const log = [], note = m => log.push(`${String(Math.floor(S.t / 60) % 24).padStart(2, '0')}:${String(Math.floor(S.t % 60)).padStart(2, '0')} ${m}`);
  O.closeHandover && O.closeHandover();
  S.localTest = true;   // de bot kan niet lopen: bij de cyberaanval doet hij alsof hij ter plaatse staat
  S.speed = 1;   // eigen animatielus laat de tijd dan nauwelijks lopen; de bot stapt zelf
  const step = min => { const p = S.paused; S.paused = false; for (let i = 0; i < min * 4; i++) O.simStep(0.25 * 60 / S.speed); S.paused = p; };
  const failAt = {}, isOpen = () => !document.querySelector('#radio').classList.contains('hidden');
  async function op(id, to) {
    const d = D[id], k = id + ':' + to; if (!d || d.state === to) return true;
    if (to === 1 && (G.flags.mustOpen || []).includes(id)) return false;   // brandweer binnen: niet inschakelen
    if (failAt[k] && S.t - failAt[k] < 5) return false;   // net mislukt: niet elke tick opnieuw proberen
    if (d.springAt && performance.now() < d.springAt) await wait(d.springAt - performance.now() + 50);
    for (let i = 0; d.busy && i < 100; i++) await wait(100);   // motoraandrijving draait nog
    O.operate(id, to);
    if (isOpen()) { document.querySelector('[data-rd="meld"]').click(); await wait(1700); }   // netjes melden aan de monteur
    const why = `kon ${id} niet ${to ? 'inschakelen' : 'uitschakelen'}: ${document.querySelector('#toast').textContent}`;
    if (d.state !== to) { failAt[k] = S.t; if (!log.some(l => l.endsWith(why))) note(why); }
    return d.state === to;
  }
  const EN = () => O.EN(), shed = new Set(), mine = id => { const t = O.task(); return !!t && O.taskActs(t).some(s => s.act[0] === id); };
  const T3 = () => D.T3, cbOf = F => O.FEEDERS.find(f => f.id === F).cb;
  // werkopdracht: optionele schakelbrief indienen en daarna de stappen uitvoeren
  async function doTask() {
    const t = O.task(); if (!t) return;
    // storing waarvoor het vrijgeschakelde deel nodig is: werk staken en terugzetten
    const lineNeeded = t.line && ['L1', 'L2'].filter(L => L !== t.line).every(L => !S.lines[L].avail);
    const trNeeded = t.tr && ['T1', 'T2'].some(T => T !== t.tr && D[T].blocked);
    if (!t.aborted && (lineNeeded || trNeeded)) { O.abortTask(); note(`werk ${t.code} gestaakt (${lineNeeded ? 'lijn' : 'T3'} nodig)`); return; }
    if (t.pool && !t.approved && !t.tried) { t.tried = true; t.brief = O.taskActs(t).map(s => O.actKey(s.act)); if (O.briefSubmit()) note(`schakelbrief ${t.code} goedgekeurd`); }
    const st = t.steps[t.i]; if (!st || st.wait != null) return;
    if (st.act) return op(...st.act);
    if (st.visit) { const c = O.VIEWS[st.visit].center; O.camera.position.set(c.x + 5, c.y + 3, c.z + 5); return; }   // thermografie: erheen vliegen
    if (/omschakelaar/.test(st.t)) { const r = st.t.includes('20 kV') ? '20' : '10'; if (T3().ratio !== r && !T3().ratioBusy) { await op('T3-Q0', 0); O.setRatio(r); await wait(3300); } }
    else if (/T3 onder spanning/.test(st.t)) { await op('T3-Q1', 1); await op('T3-Q0', 1); }
  }
  const offMin = {}, seen = new Set(); let lastH = -1;
  const watchAlarms = () => [...document.querySelectorAll('#alarmList .al.crit, #alarmList .al.warn')].reverse().forEach(e => { const t = e.textContent; if (!seen.has(t)) { seen.add(t); log.push('  ! ' + t.slice(0, 150)); } });
  while (!G.ended) {
    step(0.5); await wait(60); watchAlarms();
    if (Math.floor(S.t / 60) !== lastH) { lastH = Math.floor(S.t / 60); console.log(`[bot] ${lastH}:00 score ${Math.round(G.score)} uit ${S.off}`); }
    for (const c of O.FEEDERS.filter(f => !f.gen && !f.ring).concat(O.RING.stations)) if (!EN().has(c.node)) offMin[c.id] = (offMin[c.id] || 0) + 0.5;
    // 0. telefoon: opnemen en de juiste diagnose stellen
    if (O.PHONE.queue.length && !O.PHONE.cur) { const c = O.PHONE.cur = O.PHONE.queue[0], g = c.g;
      if (g.lvf && EN().has(g.node)) { O.phoneAnswer('send', g.st.id); note(`telefoon: monteur naar ${g.st.id}`); } else O.phoneAnswer(!EN().has(g.node) ? 'known' : 'own'); }
    // 0b. brandweer vraagt de installatie spanningsloos
    for (const id of G.flags.mustOpen || []) await op(id, 0);
    // 0c. congestie: flexibel vermogen inzetten bij overbelaste trafo's, kabels of een importgrens; na een kwartier rust weer vrijgeven
    const lim = G.flags.lineLimit, need = new Set();
    O.RING.stations.forEach(s => { if ((s.trLoad || 0) > 0.98) O.FLEX.forEach(f => { if (f.c.st === s) need.add(f.id); }); });
    O.RING.secs.forEach(s => { if (s.load > 0.95) O.FLEX.forEach(f => { if (f.c.st && f.c.st.ring === s.ring) need.add(f.id); }); });
    if (lim && O.FLOW.P110 > lim * 0.9) O.FLEX.forEach(f => { if (!f.gen) need.add(f.id); });
    for (const f of O.FLEX) { if (need.has(f.id)) { f.botIdle = 0; if (f.req !== 1) { O.setFlex(f.id, 1); note('flex ' + f.id); } } else if (f.req) { f.botIdle = (f.botIdle || 0) + 0.5; if (f.botIdle > 15) O.setFlex(f.id, 0); } }
    // 1. lijnen: weer inschakelen zodra TenneT spanning geeft
    for (const L of ['L1', 'L2']) if (S.lines[L].avail && !mine(L + '-Q0') && D[L + '-Q0'].state === 0 && D[L + '-Q9'].state && D[L + '-Q1'].state) await op(L + '-Q0', 1);
    // 2. ringen: fout isoleren, terugvoeden via normaal-open punt, na reparatie normaliseren
    for (const s of O.RING.secs) {
      const iso = [s.a && s.a + '-R', s.b && s.b + '-L'].filter(Boolean);
      if (s.fault && !s.handled) { for (const id of iso) await op(id, 0); if (!iso.includes(s.ring.nop)) await op(s.ring.nop, 1); s.handled = true; note(`ringfout ${s.id} geïsoleerd`); }   // fout naast het NOP: niet terugvoeden
      if (!s.fault && s.handled) { if (!s.a) await op(cbOf(s.ring.from), 1); if (!s.b) await op(cbOf(s.ring.to), 1); for (const id of iso) await op(id, 1); s.handled = false; note(`kabel ${s.id} weer in bedrijf`);
        if (!O.RING.secs.some(x => x.ring === s.ring && x.handled)) await op(s.ring.nop, 0); }
    }
    // 2a. vastzittende vermogenschakelaar (weigering): railkeuzescheiders openen zolang de rail dood is
    for (const f of O.FEEDERS) { const d = D[f.cb]; if (d.stuck && !EN().has(f.sel)) for (const q of ['QA', 'QB']) if (D[f.id + '-' + q]?.state) await op(f.id + '-' + q, 0); }
    // 2b. beschadigd of te ontruimen MS-station: vanaf de buren isoleren en terugvoeden; daarna terug
    for (const s of O.RING.stations) { const st = s.ring.stations, i = st.indexOf(s), L = st[i - 1], R = st[i + 1], iso = [L && L.id + '-R', R && R.id + '-L'].filter(Boolean);
      if ((s.damaged || s.evac) && !s.botIso) { if (!iso.includes(s.ring.nop)) await op(s.ring.nop, 1); for (const id of iso) await op(id, 0); if (i === 0) await op(cbOf(s.ring.from), 0); if (i === st.length - 1) await op(cbOf(s.ring.to), 0); s.botIso = true; note(`${s.id} geïsoleerd`); }
      if (!s.damaged && !s.evac && s.botIso) { s.botIso = false; for (const id of iso) await op(id, 1); if (i === 0) await op(cbOf(s.ring.from), 1); if (i === st.length - 1) await op(cbOf(s.ring.to), 1); await op(s.ring.nop, 0); note(`${s.id} weer in de ring`); } }
    // 3. transformatoren: geblokkeerd → reserve inzetten; na reset weer terug
    await doTask();
    if (T3().blocked && T3().resettable) { O.resetLockout('T3'); note('T3 gereset'); }
    for (const T of ['T1', 'T2']) {
      if (O.task() && O.task().tr === T) continue;   // staat in onderhoud via de werkopdracht
      const t = D[T], lv = T === 'T1' ? 'V-T1' : 'W-T2';
      if (t.blocked && t.resettable) { O.resetLockout(T); note(`${T} gereset`); }
      if (!t.blocked && D[T + '-Q0'].state === 0) { await op(T + '-Q1', 1); await op(T + '-Q0', 1); }
      const busOf = id => O.homeBus(id);   // normale rail van een incomer, uit het model
      if (!t.blocked && EN().has(T + 'h') && D[lv].state === 0 && !O.BUSF[busOf(lv)]) await op(lv, 1);
      const need = T === 'T1' ? '10' : '20', res = T === 'T1' ? 'V-T3' : 'W-T3', down = t.blocked || D[lv].state === 0 || (T === 'T1' && t.fanFail) || t.oil > 85;
      if (down && !T3().blocked && D[res].state === 0 && !O.BUSF[busOf(res)]) {
        if (T3().ratio !== need && !D['V-T3'].state && !D['W-T3'].state) { await op('T3-Q0', 0); O.setRatio(need); await wait(3300); await op('T3-Q0', 1); }
        if (T3().ratio === need && await op(res, 1)) note(`reserve T3 op ${need} kV ingezet`);
      }
    }
    if (D['T3-Q0'].state === 0 && !mine('T3-Q0') && !T3().blocked && !T3().ratioBusy) await op('T3-Q0', 1);
    if (D['V-K'].state === 0 && !O.task() && !O.BUSF.RA && !O.BUSF.RB) await op('V-K', 1);
    if (D['W-K'].state === 0 && !mine('W-K') && !O.BUSF.RC && !O.BUSF.RD) await op('W-K', 1);
    // 4. thermiek: kassen afschakelen bij hete transformator, later terug
    const hot = ['T1', 'T2', 'T3'].some(T => D[T].oil > 92);
    if (hot && D['V-F6'].state) { await op('V-F6', 0); shed.add('V-F6'); note('kassen afgeschakeld (hete trafo)'); }
    if (!hot && shed.has('V-F6') && ['T1', 'T3'].every(T => D[T].oil < 78)) { shed.delete('V-F6'); await op('V-F6', 1); }
    // 5. uitgaande velden: na isolatie van een kabelfout of na een overstroomtrip weer inschakelen
    for (const f of O.FEEDERS) {
      if (D[f.cb].state || shed.has(f.cb) || f.backfed || mine(f.cb) || (G.hold && G.hold[f.cb] > S.t)) continue;
      if (f.fault && f.fault.stage === 'search') continue;
      if (f.ring) { const head = O.RING.secs.find(s => s.node === f.id), hs = head.a ? O.RING.stations.find(x => x.id === head.a) : O.RING.stations.find(x => x.id === head.b); if (head.fault || hs.damaged || hs.evac || hs.botIso) continue; }
      if (EN().has(f.bus)) await op(f.cb, 1);
    }
  }
  return { obj: G.obj.map(o => `${o.state === 'done' ? '✓' : '✗'} ${o.t}`), score: Math.round(G.score), cml: Math.round(S.cml), incidents: S.incidents,
    tasks: S.tasksDone, report: !document.querySelector('#report').classList.contains('hidden'), log: process_full ? log : log.slice(-25), off: Object.entries(offMin).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => k + ' ' + v + ' min').join(', ') };
}

const RUNS = [
  { name: 'zkh', query: '?play=zkh' }, { name: 'storm', query: '?play=storm' }, { name: 'piek', query: '?play=piek' },
  { name: 'blackout', query: '?play=blackout' }, { name: 'hitte', query: '?play=hitte' }, { name: 'winter', query: '?play=winter' },
  { name: 'dubbel', query: '?play=dubbel' }, { name: 'aanrijding', query: '?play=aanrijding' }, { name: 'cyber', query: '?play=cyber' },
  { name: 'overstroming', query: '?play=overstroming' }, { name: 'zonnepiek', query: '?play=zonnepiek' }, { name: 'kraan', query: '?play=kraan' }, { name: 'brand', query: '?play=brand' },
  { name: 'evenement', query: '?play=evenement' }, { name: 'laadpiek', query: '?play=laadpiek' }, { name: 'dagdienst', query: '?play=day' }, { name: 'avonddienst', query: '?play=eve&diff=zwaar' },
];
// parallel: elke werker een eigen browser; de lange diensten eerst, zodat ze niet als laatste overblijven
const todo = RUNS.filter(r => !only || r.name.includes(only)).sort((a, b) => /dienst/.test(b.name) - /dienst/.test(a.name));
const jobs = Math.max(1, Math.min(todo.length, +process.env.TEST_JOBS || (process.env.CI ? 2 : Math.min(3, Math.max(1, Math.floor(os.cpus().length / 4))))));
const launch = () => puppeteer.launch({ executablePath: chrome, headless: 'new', protocolTimeout: 30 * 60 * 1000,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--window-size=1100,700',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--num-raster-threads=1', '--renderer-process-limit=2', '--disable-gpu-compositing', '--disable-gpu-rasterization', '--disable-accelerated-2d-canvas', '--mute-audio', '--disable-extensions'], defaultViewport: { width: 1100, height: 700 } });
let failed = 0, next = 0;
const tStart = Date.now();
console.log(`${todo.length} run(s) met ${jobs} parallelle werker(s)\n`);
async function play(browser, r) {
  const page = await browser.newPage(), errors = [], t0 = Date.now(), out = [], say = l => out.push(l);
  // vaste seed voor Math.random, zodat een uitschieter opnieuw te spelen is: SEED=123 npm run test:scenarios
  const seed = +process.env.SEED || Math.floor(Math.random() * 1e6);
  await page.evaluateOnNewDocument(sd => { let a = sd >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, seed);
  page.on('pageerror', e => errors.push((e.stack || e.message).split('\n').slice(0, 3).join(' ← ')));
  page.on('console', m => { if (process.env.FULLLOG && m.text().startsWith('[bot]')) say('  ' + m.text()); if (m.type() === 'error' && !/AudioContext/.test(m.text())) errors.push(m.text()); });
  try {
    await page.goto(pageUrl + r.query + '&lite', { waitUntil: 'load', timeout: 180000 });
    for (let i = 0; i < 120 && !(await page.evaluate(() => !!window.OS)); i++) await sleep(500);
    const res = await page.evaluate(bot, !!process.env.FULLLOG);
    const missed = res.obj.filter(o => o.startsWith('✗'));
    const ok = res.report && !errors.length;
    if (!ok) failed++;
    say(`${ok ? '✓' : '✗'} ${r.name} (seed ${seed}) – score ${res.score}, CML ${res.cml}, incidenten ${res.incidents}, taken ${res.tasks} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    res.obj.forEach(o => say('    ' + o));
    if (res.off) say('    langste uitval: ' + res.off);
    if (missed.length || !ok || res.score < 1000 || process.env.FULLLOG) res.log.forEach(l => say('      · ' + l));
    if (errors.length) say('    fouten: ' + errors.join(' | '));
  } catch (e) { failed++; say(`✗ ${r.name}: ${e.message}`); }
  await page.close().catch(() => {});
  console.log(out.join('\n'));   // per run in één blok, zodat parallelle uitvoer niet door elkaar loopt
}
await Promise.all(Array.from({ length: jobs }, async (_, w) => {
  await sleep(w * 4000);   // werkers na elkaar laten starten: het opbouwen van de 3D-wereld is het zwaarste moment
  const browser = await launch();
  while (next < todo.length) await play(browser, todo[next++]);
  await browser.close();
}));
console.log(failed ? `\n${failed} scenario('s) mislukt` : `\nAlle scenario's uitgespeeld`, `in ${Math.round((Date.now() - tStart) / 1000)} s`);
process.exit(failed ? 1 : 0);
