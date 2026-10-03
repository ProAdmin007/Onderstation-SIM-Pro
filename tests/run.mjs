// Automatische tests voor de Onderstation Simulator.
// Start index.html in headless Chrome (software-rendering) en stuurt de simulatie via window.OS.
// Gebruik: npm test   (optioneel CHROME_PATH=/pad/naar/chrome)
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pageUrl = pathToFileURL(path.join(root, 'index.html')).href;
const chrome = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(p => existsSync(p));
if (!chrome) { console.error('Geen Chrome gevonden – zet CHROME_PATH'); process.exit(2); }

const only = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));

// helpers die in de pagina beschikbaar komen
const PAGE_HELPERS = `
  window.T = {
    step(min){ const O=window.OS; const p=O.SIM.paused; O.SIM.paused=false; for(let i=0;i<min*4;i++) O.simStep(0.25*60/O.SIM.speed); O.SIM.paused=p; },
    sleep: ms => new Promise(r=>setTimeout(r,ms)),
    quiet(){ const S=window.OS.SIM; S.nextEvent=1e9; S.nextTaskAt=1e9; },
    toast: () => document.querySelector('#toast').textContent,
  };`;

async function openPage(browser, query) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/AudioContext/.test(m.text())) errors.push(m.text()); });
  await page.goto(pageUrl + query, { waitUntil: 'load', timeout: 120000 });
  for (let i = 0; i < 120 && !(await page.evaluate(() => !!window.OS)); i++) await sleep(500);
  await page.evaluate(PAGE_HELPERS);
  return { page, errors };
}

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const TESTS = [
  { name: 'laadt zonder fouten en iedereen heeft stroom', query: '?autostart&t=12', async run(p) {
      const r = await p.evaluate(() => { T.quiet(); T.step(1); return { off: OS.SIM.off, ring: OS.RING.stations.length }; });
      assert(r.off === 0, `klanten zonder stroom bij start: ${r.off}`);
      assert(r.ring >= 9, `te weinig MS-stations: ${r.ring}`);
  } },
  { name: 'vergrendeling: scheider niet open met vermogenschakelaar in', query: '?autostart', async run(p) {
      const r = await p.evaluate(() => { T.quiet(); OS.SIM.paused = false; OS.operate('L1-Q1', 0); return { st: OS.D['L1-Q1'].state, toast: T.toast() }; });
      assert(r.st === 1, 'L1-Q1 is toch geopend');
      assert(/Vergrendeling/.test(r.toast), `geen vergrendelingsmelding: ${r.toast}`);
  } },
  { name: 'zonder vergrendeling: vlamboog en beveiligingstrip', query: '?autostart', async run(p) {
      const r = await p.evaluate(() => { T.quiet(); OS.SIM.paused = false; OS.SIM.interlock = false; OS.operate('L1-Q1', 0); return { inc: OS.SIM.incidents, q0: OS.D['L1-Q0'].state }; });
      assert(r.inc === 1, `verwacht 1 incident, kreeg ${r.inc}`);
      assert(r.q0 === 0, 'L1-Q0 is niet afgeschakeld');
  } },
  { name: 'reservetransformator neemt 10 kV over na trip T1', query: '?autostart&t=12', async run(p) {
      const r = await p.evaluate(() => { T.quiet(); T.step(0.5); OS.trafoFault('T1'); T.step(0.3); const uit = OS.SIM.off;
        OS.operate('V-T3', 1); T.step(0.5); const na = OS.SIM.off; OS.operate('W-T3', 1); return { uit, na, w: OS.D['W-T3'].state }; });
      assert(r.uit > 5000, `te weinig uitval na trip: ${r.uit}`);
      assert(r.na === 0, `na V-T3 nog ${r.na} klanten uit`);
      assert(r.w === 0, 'W-T3 kon inschakelen terwijl T3 op 10 kV staat');
  } },
  { name: 'ring: kabelfout isoleren en terugvoeden via normaal-open punt', query: '?autostart&t=18', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); T.step(0.5);
        const f3 = OS.FEEDERS.find(f => f.id === 'F3'); const rnd = Math.random; Math.random = () => 0.99; OS.ringFault(f3); Math.random = rnd; T.step(0.2);
        const sec = OS.RING.secs.find(s => s.fault); const uit = OS.SIM.off;
        OS.operate(sec.a + '-R', 0); OS.operate(sec.b + '-L', 0); OS.operate(sec.ring.nop, 1); T.step(0.2); const half = OS.SIM.off;
        await T.sleep(7200); OS.operate('V-F3', 1); T.step(0.5); return { sec: sec.id, uit, half, na: OS.SIM.off, flags: OS.RING.stations.filter(s => s.flag).map(s => s.id) }; });
      assert(r.uit > 0 && r.half < r.uit, `isoleren hielp niet (${r.uit} → ${r.half})`);
      assert(r.na === 0, `na herinschakelen nog ${r.na} klanten uit (fout ${r.sec})`);
      assert(r.flags.length > 0, 'geen kortsluitverklikkers aangesproken');
  } },
  { name: 'ringkabels: stroom, spanningsval en overbelasting bij terugvoeding', query: '?autostart&t=18.6', async run(p) {
      const r = await p.evaluate(() => { T.quiet(); T.step(0.5); const sec = id => OS.RING.secs.find(s => s.id === id);
        const normaal = { kop: Math.round(sec('F3').I), ms3: OS.FLOW.UN.M3 };
        OS.operate('MS3-R', 1); OS.operate('V-F4', 0); T.step(0.5);   // hele ring 1 via V-F3
        return { normaal, kop: Math.round(sec('F3').I), ms1: OS.FLOW.UN.M1, ms5: OS.FLOW.UN.M5, ovl: OS.RING.secs.some(s => s.load > 1), off: OS.SIM.off }; });
      assert(r.normaal.kop > 50, `geen stroom in kopkabel: ${r.normaal.kop}`);
      assert(r.kop > r.normaal.kop * 1.5, `kopstroom steeg niet bij terugvoeding: ${r.normaal.kop} → ${r.kop}`);
      assert(r.ms5 < r.ms1, `geen spanningsval langs de ring: MS1 ${r.ms1} MS5 ${r.ms5}`);
      assert(r.off === 0, `klanten uit bij terugvoeding: ${r.off}`);
  } },
  { name: 'spanningsregelaar brengt rail A terug in de band', query: '?autostart&t=18', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); T.step(0.5); OS.setAVR('T1', 'hand');
        for (let i = 0; i < 3; i++) { OS.tapStep('T1', 1); await T.sleep(1700); } T.step(0.2); const hoog = OS.FLOW.U.RA;
        OS.setAVR('T1', 'auto'); for (let i = 0; i < 16; i++) { T.step(1); await T.sleep(400); } return { hoog, na: OS.FLOW.U.RA }; });
      assert(r.hoog > 10.7, `trappen omhoog gaf geen hoge spanning: ${r.hoog}`);
      assert(Math.abs(r.na - 10.5) < 0.15, `regelaar bracht spanning niet terug: ${r.na}`);
  } },
  { name: 'ziekenhuisscenario loopt tot het rapport', query: '?play=zkh', async run(p) {
      const r = await p.evaluate(async () => { T.step(1.5); OS.operate('V-T3', 1); T.step(16); await T.sleep(7200); OS.operate('V-F5', 1); T.step(45);
        return { ended: OS.GAME.ended, report: !document.querySelector('#report').classList.contains('hidden'), obj: OS.GAME.obj.map(o => o.state) }; });
      assert(r.ended && r.report, 'scenario niet afgesloten met rapport');
      assert(r.obj[0] === 'done', `ziekenhuisdoel niet gehaald: ${r.obj}`);
  } },
  { name: 'geluid per plek werkt binnen, op het terrein en in de wijk', query: '?autostart&t=13', async run(p) {
      const r = await p.evaluate(() => { T.quiet(); OS.AudioSys.init(); const out = [];
        for (const [x, y, z] of [[0, 30, 10], [-60, 1.7, 130], [0, 2.1, 50]]) { OS.camera.position.set(x, y, z); OS.camera.updateMatrixWorld(); OS.updateAudio(); out.push(OS.camInside()); }
        OS.enterKiosk('MS1'); OS.camera.position.set(OS.FP.pos.x, 2, OS.FP.pos.z); OS.updateAudio(); out.push(OS.camInside()); return out; });
      assert(r[2] === 1 && r[3] > 2, `plekherkenning klopt niet: ${r}`);
  } },
  { name: 'portofoon: schakelen bij monteur vraagt eerst melden', query: '?autostart&t=13', async run(p) {
      await p.evaluate(() => { T.quiet(); OS.SIM.paused = false; });
      const r = await p.evaluate(async () => {
        OS.crewDispatch({ box: OS.boxOf('T2'), say: 'Test', until: () => false, rel: ['T2-Q0'] }); T.step(0.1);
        OS.operate('T2-Q0', 0); const modal = !document.querySelector('#radio').classList.contains('hidden'), voor = OS.D['T2-Q0'].state;
        document.querySelector('[data-rd=\"meld\"]').click(); await T.sleep(2200);
        return { modal, voor, na: OS.D['T2-Q0'].state, msgs: [...document.querySelectorAll('#alarmList .al.radio')].length }; });
      assert(r.modal && r.voor === 1, `geen portofoonvenster (modal ${r.modal}, stand ${r.voor})`);
      assert(r.na === 0, 'na melden niet geschakeld');
      assert(r.msgs >= 2, `te weinig portofoonberichten: ${r.msgs}`);
  } },
  { name: 'schakelbrief: foute volgorde afgekeurd, goede goedgekeurd, afwijking bestraft', query: '?autostart&t=10', async run(p) {
      const r = await p.evaluate(() => { T.quiet(); OS.SIM.paused = false; OS.offerTask(); const t = OS.task(), keys = OS.taskActs(t).map(s => OS.actKey(s.act));
        const vrij = !!document.querySelector('#taskBody .bf-opt') && document.querySelectorAll('#taskBody .step').length > 0;   // brief is optioneel: stappen direct zichtbaar
        const e0 = OS.GAME.score; OS.briefWatch(...keys[0].split(':').map((v, i) => i ? +v : v)); const zonder = Math.round(e0 - OS.GAME.score);
        if (zonder) return { zonder };
        t.brief = keys.slice().reverse(); const fout = OS.briefSubmit();
        t.brief = keys.slice(); const goed = OS.briefSubmit(); const s0 = OS.GAME.score;
        const verkeerd = keys.find((k, i) => i > 1 && OS.D[k.split(':')[0]].state !== +k.split(':')[1]).split(':'); OS.operate(verkeerd[0], +verkeerd[1]);   // een latere stap eerst = afwijking
        return { vrij, zonder, n: keys.length, fout, goed, approved: t.approved, straf: Math.round(s0 - OS.GAME.score) }; });
      assert(!r.zonder, `straf zonder schakelbrief terwijl die optioneel is: ${r.zonder}`);
      assert(r.vrij, 'stappen niet zichtbaar of knop voor optionele schakelbrief ontbreekt');
      assert(r.n >= 4, `te weinig stappen in de schakelbrief: ${r.n}`);
      assert(!r.fout && r.goed && r.approved, `controle klopt niet: fout ${r.fout} goed ${r.goed}`);
      assert(r.straf >= 25, `geen straf voor afwijking: ${r.straf}`);
  } },
  { name: 'scenario dubbele kabelfout: eiland en gedeeltelijk herstel', query: '?play=dubbel', async run(p) {
      const r = await p.evaluate(() => { T.step(1.5); const uit = OS.SIM.off;
        ['MS1-R', 'MS2-L', 'MS4-R', 'MS5-L'].forEach(id => OS.operate(id, 0)); OS.operate('MS3-R', 1); OS.operate('V-F3', 1); OS.operate('V-F4', 1); T.step(0.5);
        const aan = OS.RINGS[0].stations.filter(s => OS.EN().has(s.node)).map(s => s.id);
        return { uit, aan, obj: OS.GAME.obj.map(o => o.state), season: OS.WX.type }; });
      assert(r.uit > 5000, `te weinig uitval: ${r.uit}`);
      assert(r.aan.join() === 'MS1,MS5', `verwacht MS1 en MS5 aan, kreeg ${r.aan}`);
      assert(r.obj[0] === 'done', `doel MS1/MS5 niet gehaald: ${r.obj}`);
  } },
  { name: 'scenario hittegolf start met juist seizoen, weer en storing', query: '?play=hitte', async run(p) {
      const r = await p.evaluate(() => { T.step(25); return { wx: OS.WX.type, amb: OS.ambient(), fan: OS.D.T1.fanFail }; });
      assert(r.wx === 'hitte' && r.amb > 30, `geen hittegolf: ${r.wx} ${r.amb}`);
      assert(r.fan === true, 'ventilatorstoring T1 trad niet op');
  } },
  { name: 'Esc opent pauzemenu en pauzeert', query: '?autostart', async run(p) {
      await p.keyboard.press('Escape'); await sleep(800);
      const r = await p.evaluate(() => ({ menu: !document.querySelector('#pauseMenu').classList.contains('hidden'), paused: OS.SIM.paused }));
      assert(r.menu && r.paused, `menu ${r.menu}, pauze ${r.paused}`);
  } },
];

const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--window-size=1280,800'],
  defaultViewport: { width: 1280, height: 800 } });
let failed = 0;
for (const t of TESTS) {
  if (only && !t.name.includes(only)) continue;
  const t0 = Date.now();
  let page, errors = [];
  try {
    ({ page, errors } = await openPage(browser, t.query));
    await t.run(page);
    assert(errors.length === 0, 'paginafouten: ' + errors.join(' | '));
    console.log(`✓ ${t.name} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  } catch (e) {
    failed++; console.log(`✗ ${t.name}\n    ${e.message}`);
  } finally { if (page) await page.close(); }
}
await browser.close();
console.log(failed ? `\n${failed} test(s) mislukt` : '\nAlle tests geslaagd');
process.exit(failed ? 1 : 0);
