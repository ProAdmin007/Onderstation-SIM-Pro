// Automatische tests voor de Onderstation Simulator.
// Start index.html in headless Chrome (software-rendering) en stuurt de simulatie via window.OS.
// Gebruik: npm test   (optioneel CHROME_PATH=/pad/naar/chrome)
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
    quiet(){ const S=window.OS.SIM; S.nextEvent=1e9; S.nextTaskAt=1e9; window.OS.INC.next=1e9; },
    toast: () => document.querySelector('#toast').textContent,
    async op(id,to){ const O=window.OS,d=O.D[id]; if(d.state===to) return true; if(d.springAt>performance.now()) await T.sleep(d.springAt-performance.now()+50); for(let i=0;d.busy&&i<60;i++) await T.sleep(100);
      O.operate(id,to); const r=document.querySelector('#radio'); if(!r.classList.contains('hidden')){ r.querySelector('[data-rd="meld"]').click(); await T.sleep(1700); } return d.state===to; },
  };`;

// vaste seed voor Math.random in de pagina: standaard afgeleid van de testnaam (altijd herhaalbaar),
// of zelf kiezen met TEST_SEED=123, of TEST_SEED=random voor een willekeurige
const seedOf = name => { if (process.env.TEST_SEED === 'random') return Math.floor(Math.random() * 2 ** 31); if (process.env.TEST_SEED) return +process.env.TEST_SEED;
  let h = 2166136261; for (const c of name) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
async function openPage(browser, query, seed) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(seed => { let a = seed >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, seed);
  const errors = [];
  page.on('pageerror', e => errors.push((e.stack || e.message).split('\n').slice(0, 3).join(' ← ')));
  page.on('console', m => { if (m.type() === 'error' && !/AudioContext/.test(m.text())) errors.push(m.text()); });
  await page.goto(pageUrl + query + (query.includes('?') ? '&' : '?') + 'lite', { waitUntil: 'load', timeout: 180000 });
  for (let i = 0; i < 120 && !(await page.evaluate(() => !!window.OS)); i++) await sleep(500);
  await page.evaluate(PAGE_HELPERS);
  await page.evaluate(() => window.OS.closeHandover && window.OS.closeHandover());
  return { page, errors };
}

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const TESTS = [
  { name: 'laadt zonder fouten en iedereen heeft stroom', query: '?autostart&t=12', async run(p) {
      const r = await p.evaluate(() => { T.quiet(); T.step(1); return { off: OS.SIM.off, ring: OS.RING.stations.length }; });
      assert(r.off === 0, `klanten zonder stroom bij start: ${r.off}`);
      assert(r.ring >= 9, `te weinig MS-stations: ${r.ring}`);
  } },
  { name: 'modelcontrole: model klopt en verkeerde namen worden gevonden', query: '?autostart', async run(p) {
      const r = await p.evaluate(() => { const goed = OS.checkModel(true).length; OS.LESSONS.les1.steps[1].hl.push('BESTAAT-NIET'); OS.D['V-F1'].cb = 'OOK-NIET';
        const fout = OS.checkModel(true); return { goed, fout }; });
      assert(r.goed === 0, `model niet in orde: ${r.goed}`);
      assert(r.fout.length === 2 && r.fout.some(e => /BESTAAT-NIET/.test(e)), `modelcontrole mist fouten: ${JSON.stringify(r.fout)}`);
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
        OS.crewDispatch({ box: OS.boxOf('T2'), say: 'Test', until: () => false, rel: ['T2-Q0', 'T2-Q1'] }); T.step(0.1);
        OS.operate('T2-Q1', 0); const vergrendeld = !document.querySelector('#radio').classList.contains('hidden');   // mag niet: dan ook niet melden
        if (vergrendeld) return { vergrendeld };
        OS.operate('T2-Q0', 0); const modal = !document.querySelector('#radio').classList.contains('hidden'), voor = OS.D['T2-Q0'].state;
        document.querySelector('[data-rd=\"meld\"]').click(); await T.sleep(2200);
        return { modal, voor, na: OS.D['T2-Q0'].state, msgs: [...document.querySelectorAll('#alarmList .al.radio')].length }; });
      assert(!r.vergrendeld, 'portofoon opent voor een vergrendelde handeling');
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
  { name: 'werkopdrachten alleen als ze uitvoerbaar zijn', query: '?autostart&t=10', async run(p) {
      const r = await p.evaluate(() => { T.quiet(); OS.SIM.paused = false; OS.D.T3.blocked = true; OS.D.T3.resettable = false;
        const titels = []; for (let i = 0; i < 7; i++) { OS.offerTask(); const t = OS.task(); if (t) titels.push(t.title); }
        return titels; });
      assert(r.length, 'geen enkele werkopdracht aangeboden');
      assert(!r.some(t => /reservetransformator/.test(t)), `trafo-onderhoud aangeboden met geblokkeerde T3: ${r.join(' | ')}`);
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
  { name: 'scenario brand in het datacenter: blussing faalt, SCADA lang weg, eerst MS-stations terug, binnenlopen is een incident', query: '?play=datacenter', async run(p) {
      const r = await p.evaluate(() => { const O = OS, G = O.GAME; T.quiet(); T.step(3); const voor = !G.flags.scadaDown && !O.FIRE.on;
        T.step(5); const brand = O.FIRE.on && O.FIRE.bld === 'SRV' && G.flags.scadaDown === true && G.flags.dcAlarm && O.SVM.led.opacity === 0;
        const opAfstand = !O.scadaReach('V-F6') && !O.scadaReach('MS1-L');
        // de speler loopt het brandende datacenter in
        const room = O.ROOMS.find(r => r.id === 'SRV'), i0 = O.SIM.incidents; O.enterFP(); O.FP.pos.set((room.x0 + room.x1) / 2, 0, (room.z0 + room.z1) / 2); O.camera.position.set(O.FP.pos.x, 2.1, O.FP.pos.z); T.step(0.5);
        const binnen = O.SIM.incidents === i0 + 1 && G.flags.dcEntered; O.FP.pos.set(25, 0, 62); O.camera.position.set(25, 1.7, 62); O.exitFP();
        T.step(45); const geblust = !O.FIRE.on && G.flags.scadaDown === true;
        T.step(45); const ms = G.flags.scadaDown === 'os' && O.scadaReach('MS1-L') && !O.scadaReach('V-F6');
        T.step(52); const terug = G.flags.scadaDown === false && O.scadaReach('V-F6');
        return { voor, brand, opAfstand, binnen, geblust, ms, terug }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'scenario hittegolf start met juist seizoen, weer en storing', query: '?play=hitte', async run(p) {
      const r = await p.evaluate(() => { T.step(25); return { wx: OS.WX.type, amb: OS.ambient(), fan: OS.D.T1.fanFail }; });
      assert(r.wx === 'hitte' && r.amb > 30, `geen hittegolf: ${r.wx} ${r.amb}`);
      assert(r.fan === true, 'ventilatorstoring T1 trad niet op');
  } },
  { name: 'rail C gesplitst: koppeling W-K, railfout en voeding via T3', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); const O = OS, EN = () => O.EN(); O.SIM.paused = false; T.step(0.2);
        const basis = EN().has('RC') && EN().has('RD');
        await T.op('W-K', 0); T.step(0.2); const gesplitst = EN().has('RC') && !EN().has('RD');
        await T.op('W-K', 1); T.step(0.2); const weer = EN().has('RD');
        O.busFault('RC', 30); T.step(0.2); const fout = !EN().has('RC') && !EN().has('RD') && O.D['W-K'].state === 0;
        await T.op('T3-Q0', 0); O.setRatio('20'); await T.sleep(3300); await T.op('T3-Q0', 1); await T.op('W-T3', 1); T.step(0.2);
        const c2 = EN().has('RD') && !EN().has('RC');
        O.D['W-K'].springAt = 0; O.operate('W-K', 1); T.step(0.2); const beveiligd = O.D['W-K'].state === 0 && EN().has('RD') && O.GAME.stats.recloseFault > 0;
        return { basis, gesplitst, weer, fout, c2, beveiligd }; });
      for (const [k, v] of Object.entries(r)) assert(v, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'beveiligingsinstellingen bepalen afschakeling en schade', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(() => { T.quiet(); const O = OS, f = O.FEEDERS.find(x => x.id === 'F6'); O.SIM.paused = false; T.step(0.2);
        const run = (pick, tms, min) => { O.setProt('f', 'F6', 'pick', pick); O.setProt('f', 'F6', 'tms', tms); Object.assign(f, { oc: 0, heat: 0, fault: null }); O.D['V-F6'].state = 1; O.computeFlows();
          f.temp = null; f.rate = f.P / 1.45; T.step(min); return { uit: O.D['V-F6'].state === 0, schade: !!f.fault, temp: Math.round(f.temp) }; };
        const standaard = run(1.3, 1, 12), ruim = run(1.5, 2, 45);
        O.setProt('tr', 'T1', 'trip', 95); O.D.T1.oil = 96; T.step(0.25);
        return { standaard, ruim, trafo: O.D.T1.blocked && O.D.T1.blockKind === 'temp' }; });
      assert(r.standaard.uit && !r.standaard.schade, `standaardinstelling: ${JSON.stringify(r.standaard)}`);
      assert(r.ruim.schade, `te ruime instelling gaf geen kabelschade: ${JSON.stringify(r.ruim)}`);
      assert(r.trafo, 'trafo schakelde niet af op de lagere thermische instelling');
  } },
  { name: 'werk staken: herstel in omgekeerde volgorde', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); const O = OS, D = O.D; O.SIM.paused = false; O.startTask('railTask'); T.step(7);
        for (const [id, to] of [['W-G3', 0], ['W-G4', 0], ['W-K', 0], ['RD-Q8', 1]]) await T.op(id, to);
        T.step(1); const bijWerk = O.task().steps[O.task().i].wait != null;
        O.abortTask(); const herstel = O.task().steps.map(s => s.act.join(':'));
        const log = []; for (let k = 0; k < 8 && O.task(); k++) { const s = O.task().steps[O.task().i]; const ok = await T.op(...s.act); log.push(s.act.join(':') + (ok ? '' : ' ✗ ' + T.toast())); T.step(0.3); }
        T.step(5); const g3 = O.FEEDERS.find(x => x.id === 'G3');
        return { log, bijWerk, herstel, klaar: !O.task(), normaal: D['W-K'].state === 1 && D['RD-Q8'].state === 0 && O.EN().has('G3') && !g3.backfed }; });
      assert(r.bijWerk, 'werk niet gestart');
      assert(r.herstel.join() === 'RD-Q8:0,W-K:1,W-G4:1,W-G3:1', `verkeerde herstelvolgorde: ${r.herstel}`);
      assert(r.klaar && r.normaal, `niet terug in normale toestand: ${JSON.stringify(r)}`);
  } },
  { name: 'onderhoud MS-station en thermografie-ronde', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); const O = OS; O.SIM.paused = false; O.startTask('stationTask'); let maxOff = 0;
        for (let k = 0; k < 200 && O.task(); k++) { const s = O.task().steps[O.task().i]; if (s.act) await T.op(...s.act); T.step(0.5); maxOff = Math.max(maxOff, O.SIM.off); }
        const station = { klaar: !O.task(), maxOff, done: O.SIM.tasksDone };
        O.startTask('thermoTask'); const t = O.task(), n0 = t.steps.length;
        for (const s of t.steps.slice(0, n0)) { const c = O.VIEWS[s.visit].center; O.camera.position.set(c.x + 5, c.y + 3, c.z + 5); T.step(0.25); }
        return { station, thermo: { gevonden: !!t.found, extra: t.steps.length - n0, titel: t.title } }; });
      assert(r.station.klaar && r.station.done >= 1, `MS-station-onderhoud niet afgerond: ${JSON.stringify(r.station)}`);
      assert(r.station.maxOff === 0, `klanten zonder stroom tijdens onderhoud MS-station: ${r.station.maxOff}`);
      assert(r.thermo.gevonden && r.thermo.extra >= 4, `thermografie: ${JSON.stringify(r.thermo)}`);
  } },
  ...['les1', 'les2', 'les3', 'les4', 'les5', 'les6', 'les7', 'les8', 'les9', 'les10', 'les11'].map(les => ({ name: `leerscenario ${les} is uit te spelen`, query: `?play=${les}`, async run(p) {
      const r = await p.evaluate(async () => { const O = OS, G = O.GAME;
        for (let k = 0; k < 150 && !G.ended; k++) { const L = G.lesson, s = L.steps[L.i];
          if (s && !L.done) { if (s.next) O.lessonGo(); else if (s.acts) { for (const a of s.acts) await T.op(...a); } else if (s.act) await T.op(...s.act); else if (s.auto) s.auto(); }
          T.step(0.5); await T.sleep(s && s.auto ? 900 : 40); }
        return { ended: G.ended, done: G.lesson.done, i: G.lesson.i, obj: G.obj.map(o => o.state), report: !document.querySelector('#report').classList.contains('hidden') }; });
      assert(r.done && r.ended && r.report && r.obj.every(o => o === 'done'), `les niet afgerond: ${JSON.stringify(r)}`);
  } })),
  { name: 'dubbelrail 10 kV: omzetten onder last, vergrendeling en onderhoud rail B', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); const O = OS, D = O.D, EN = () => O.EN(); O.SIM.paused = false; T.step(0.2);
        const rail = id => O.FLOW.TAG[id]?.bus;
        // F5 onder last van rail B naar rail A
        const a1 = await T.op('F5-QA', 1), a2 = await T.op('F5-QB', 0); T.step(0.2);
        const omgezet = a1 && a2 && rail('F5') === 'RA' && EN().has('F5') && O.SIM.incidents === 0;
        // zonder koppeling mag een veld niet op beide rails, en niet onder last omgezet worden
        await T.op('V-K', 0); T.step(0.2); const bDood = !EN().has('RB');
        O.operate('F5-QB', 1); const geweigerd1 = D['F5-QB'].state === 0;
        O.operate('F5-QA', 0); const geweigerd2 = D['F5-QA'].state === 1;
        await T.op('V-K', 1); await T.op('F5-QB', 1); await T.op('F5-QA', 0); T.step(0.2);
        // werkopdracht onderhoud rail B: niemand zonder stroom
        O.startTask('railBTask'); let maxOff = 0;
        for (let k = 0; k < 120 && O.task(); k++) { const s = O.task().steps[O.task().i]; if (s.act) await T.op(...s.act); T.step(0.5); maxOff = Math.max(maxOff, O.SIM.off); }
        return { omgezet, bDood, geweigerd1, geweigerd2, klaar: !O.task(), maxOff, normaal: rail('F5') === 'RB' && D['V-K'].state === 1, detail: [rail('F5'), D['F5-QA'].state, D['F5-QB'].state, D['V-K'].state, O.task()?.title].join('/') }; });
      for (const [k, v] of Object.entries(r)) if (k !== 'maxOff' && k !== 'detail') assert(v, `${k} klopt niet: ${JSON.stringify(r)}`);
      assert(r.maxOff === 0, `klanten zonder stroom tijdens onderhoud rail B: ${r.maxOff}`);
  } },
  { name: 'belastingprognose: verwachting en waarschuwing zonder voeding', query: '?autostart&t=15', async run(p) {
      const r = await p.evaluate(() => { T.quiet(); const O = OS; O.SIM.paused = false; T.step(0.5); const a = O.progAdvice();
        const piek = Math.max(...a.f.map(x => x.p10)); O.D['V-T1'].state = 0; O.computeFlows(); const b = O.progAdvice();
        return { n: a.f.length, piek, cap: a.cap.c10, ok: a.out.some(o => o.lvl === 'ok'), warn: b.out.some(o => o.key === '10') }; });
      assert(r.n === 33 && r.piek > 10 && r.cap > 30, `prognose klopt niet: ${JSON.stringify(r)}`);
      assert(r.ok && r.warn, `advies klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'telefoon: LS-storing alleen via klantmeldingen te vinden', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); const O = OS, P = O.PHONE; O.SIM.paused = false; T.step(0.3);
        const g = O.LVG.find(x => x.id === 'MS1-G2'); O.lvFault('MS1-G2'); T.step(0.2); const off0 = O.SIM.off, scada = O.EN().has(g.node);
        for (let k = 0; k < 40 && !P.queue.length; k++) T.step(0.5);
        const call = P.queue[0]; P.cur = call; const s0 = O.GAME.score; O.phoneAnswer('send', 'MS4'); T.step(25); const fout = O.GAME.score - s0 < 0 && !!g.lvf;
        g.lvf.at = O.SIM.t; O.dispatchLV('MS1'); T.step(25);
        return { off0, scada, gebeld: !!call, adres: call && call.addr, fout, opgelost: !g.lvf && g.outFrac === 0 }; });
      assert(r.off0 > 50 && r.scada, `LS-storing niet stil of zonder uitval: ${JSON.stringify(r)}`);
      assert(r.gebeld && /Lindehof/.test(r.adres), `geen klant gebeld vanaf de Lindehof: ${JSON.stringify(r)}`);
      assert(r.fout && r.opgelost, `verkeerd/juist station klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'telefoon: bij een uitval vangt het storingsbandje de bellers op', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); const O = OS, P = O.PHONE; O.SIM.paused = false; T.step(0.3);
        await T.op('V-F3', 0); T.step(3);
        O.LVG.filter(g => g.cust > 1 && g.kind !== 'ovl' && !O.EN().has(g.node)).forEach(g => O.callFrom(g, 'mv')); O.phoneTick(0.1);
        const rinkelt = P.queue.length, bandje = P.stats.tape, melding = [...document.querySelectorAll('#alarmList .al')].some(e => /Storingsbandje/.test(e.textContent));
        // een losse woning met stroom belt wél, en ophangen tijdens de uitval kost geen punten
        const g = O.LVG.find(x => x.cust > 1 && x.kind !== 'ovl' && O.EN().has(x.node)); P.cd = {}; O.callFrom(g, 'house'); const wel = P.queue.length;
        P.queue.forEach(c => c.wait = 200); O.phoneTick(0.1);
        return { rinkelt, bandje, melding, wel, gemist: P.stats.missed, straf: O.REC.events.some(e => /Klant hing op/.test(JSON.stringify(e))) }; });
      assert(r.rinkelt === 0 && r.bandje > 3 && r.melding, `bandje werkt niet: ${JSON.stringify(r)}`);
      assert(r.wel === 1 && r.gemist === 1 && !r.straf, `gewoon gesprek tijdens uitval klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'dienstoverdracht: afwijkingen en open punten', query: '?play=day', async run(p) {
      const r = await p.evaluate(() => { const O = OS, G = O.GAME, h = G.handover; const it = Object.create(O.HO_POOL.find(x => x.id === 'avr')); it.setup(); h.items.push(it);
        const dev = O.deviations().join(' '), s0 = G.score; O.setAVR('T1', 'auto'); O.handoverTick();
        return { items: h.items.length, gesloten: !h.open && document.querySelector('#handover').classList.contains('hidden'), avr: /T1/.test(dev), done: it.done, pts: Math.round(G.score - s0) }; });
      assert(r.items >= 3 && r.gesloten, `overdracht niet goed opgezet: ${JSON.stringify(r)}`);
      assert(r.avr && r.done && r.pts >= 25 && r.pts % 25 === 0, `open punt niet afgehandeld: ${JSON.stringify(r)}`);
  } },
  { name: 'nieuwe scenario\'s: aanrijding, cyberaanval en zonnepiek', query: '?play=zonnepiek', async run(p) {
      const r = await p.evaluate(() => { const O = OS; T.step(100); const zon = O.D.T2.blocked && O.D.T2.blockKind === 'temp';
        const s = O.RING.stations.find(x => x.id === 'MS5'); O.stationDamage(s, 'test'); O.operate('MS5-L', 0); const kapot = O.D['MS5-L'].state === 1;
        O.GAME.flags.scadaDown = true; O.operate('V-F6', 0); const opAfstand = O.D['V-F6'].state === 1; O.SIM.localTest = true; O.operate('V-F6', 0); const lokaal = O.D['V-F6'].state === 0;
        return { zon, kapot, opAfstand, lokaal }; });
      for (const [k, v] of Object.entries(r)) assert(v, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'tijdlijn, leermomenten en herhaling', query: '?play=zkh', async run(p) {
      const r = await p.evaluate(async () => { const O = OS; T.step(20); O.endGame(); await T.sleep(300);
        const tl = !!document.querySelector('#report svg.tl'), ins = document.querySelectorAll('#report .tl-i').length, live = O.D['V-T1'].state + ':' + O.D['T1-Q0'].state;
        O.startReplay(O.GAME.t0 + 0.5); const terug = O.D['V-T1'].state, rp = !document.querySelector('#replay').classList.contains('hidden');
        O.stopReplay(); return { n: O.REC.samples.length, tl, ins, terug, rp, hersteld: O.D['V-T1'].state + ':' + O.D['T1-Q0'].state === live }; });
      assert(r.n >= 15 && r.tl && r.ins >= 1, `tijdlijn ontbreekt: ${JSON.stringify(r)}`);
      assert(r.rp && r.terug === 1 && r.hersteld, `herhaling klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'zaklamp aan en uit tijdens rondlopen', query: '?autostart&night', async run(p) {
      await p.evaluate(() => OS.enterFP()); await sleep(800); await p.keyboard.press('KeyZ'); await sleep(800);
      const r = await p.evaluate(() => { const a = { aan: OS.TORCH.on, I: OS.TORCH.light.intensity, x: Math.round(OS.TORCH.light.position.distanceTo(OS.camera.position) * 10) / 10 }; OS.exitFP(); return { ...a, naUit: OS.TORCH.on, I2: OS.TORCH.light.intensity }; });
      assert(r.aan && r.I > 0 && r.x < 1, `zaklamp ging niet aan: ${JSON.stringify(r)}`);
      assert(!r.naUit && r.I2 === 0, `zaklamp blijft aan na stoppen met rondlopen: ${JSON.stringify(r)}`);
  } },
  { name: 'flexibel vermogen en overbelaste distributietrafo', query: '?autostart&t=18.5', async run(p) {
      const r = await p.evaluate(() => { T.quiet(); const O = OS, f = O.FEEDERS.find(x => x.id === 'F6'); O.SIM.paused = false; T.step(0.5); const p0 = f.P;
        O.setFlex('F6', 1); T.step(1); const teVroeg = !f.cut; T.step(2); const p1 = f.P, eur = O.GAME.stats.flexEur;
        const s = O.RING.stations.find(x => x.id === 'MS4'); s.kva = 600; T.step(5); const zeker = s.fuse && O.D['MS4-T'].state === 0;
        O.operate('MS4-T', 1); const geweigerd = O.D['MS4-T'].state === 0; T.step(25);
        return { p0, p1, teVroeg, eur, zeker, geweigerd, terug: !s.fuse, cg: O.congestion().length }; });
      assert(r.teVroeg && r.p1 < r.p0 * 0.4 && r.eur > 0, `flex werkt niet: ${JSON.stringify(r)}`);
      assert(r.zeker && r.geweigerd && r.terug && r.cg > 0, `zekeringen/congestie kloppen niet: ${JSON.stringify(r)}`);
  } },
  { name: 'veroudering: weigering (50BF) wordt steeds waarschijnlijker, maar zit niet vast; revisie in andere volgorde', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); const O = OS, D = O.D, d = D['V-F6'], EN = () => O.EN(), rnd0 = Math.random; O.SIM.paused = false; T.step(0.3);
        const ops0 = D['V-F4'].ops, w0 = D['V-F4'].wear; await T.op('V-F4', 0); await T.op('V-F4', 1); const slijt = D['V-F4'].ops === ops0 + 2 && D['V-F4'].wear > w0;
        const aan0 = Object.values(D).filter(x => x.type === 'cb' && x.state === 1).map(x => x.id);
        O.SIM.failTest = true; d.wear = 0.8; const p0 = O.failP(d);
        Math.random = () => 0; O.feederFault('F6', 5); Math.random = rnd0; T.step(0.2);
        const railB = !EN().has('RB'), railA = EN().has('RA'), blijftIn = d.state === 1, geteld = d.refusals === 1, vaker = O.failP(d) > p0 && O.manualP(d) > 0;
        // handmatig: soms weigert hij, maar opnieuw proberen lukt
        Math.random = () => 0; O.operate('V-F6', 0); const handWeigert = d.state === 1; Math.random = () => 0.99; await T.sleep(50); await T.op('V-F6', 0); Math.random = rnd0;
        const losGekregen = d.state === 0;
        for (let k = 0; k < 60 && O.FD('F6').fault; k++) T.step(2);
        O.SIM.failTest = false; for (const id of aan0) if (id !== 'V-F6' && D[id].state === 0) await T.op(id, 1); T.step(0.5); const herstel = EN().has('RB') && EN().has('F5');
        await T.op('V-F6', 1); T.step(0.3); O.FD('F6').clp = 1;
        // revisie, en bij het terugzetten bewust in een andere volgorde: eerst V-F6 IN proberen en het veld op rail A zetten
        O.startTask('cbMaintTask', 'V-F6'); let afwijkend = false;
        for (let k = 0; k < 160 && O.task(); k++) { const t = O.task(), s = t.steps[t.i];
          if (s.act && /railkeuzescheider .*normale rail/.test(s.t) && !afwijkend) { afwijkend = true; O.operate('V-F6', 1); T.step(0.2); await T.op('V-K', 1); await T.op('F6-QA', 1); }
          else if (s.act && D[s.act[0]].state !== s.act[1]) { if (s.act[0] === 'V-F6' && s.act[1] === 1 && d.state === 1) { /* al in */ } else await T.op(...s.act); }
          T.step(0.5); }
        return { slijt, railB, railA, blijftIn, geteld, vaker, handWeigert, losGekregen, herstel, afwijkend, klaar: !O.task() || O.task().steps[O.task().i].t, nieuw: !d.refusals && O.cond(d) > 0.9, aan: EN().has('F6') }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'relaistest met de testkoffer: goed relais goedkeuren', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); const O = OS, D = O.D, EN = () => O.EN(), f = O.FD('F4'); O.SIM.paused = false; T.step(0.3); f.relayYear = 2021;
        O.startTask('relayTask', 'F4'); const sc0 = O.GAME.score; let kit = null, dicht = false;
        for (let k = 0; k < 150 && O.task(); k++) { const t = O.task(), s = t.steps[t.i];
          if (s.kit && !kit) { O.openKit(); dicht = !document.querySelector('#kit').classList.contains('hidden'); for (const x of O.kitTests(f)) O.kitRun(x.id); kit = JSON.parse(JSON.stringify(t.kit.res));
            kit.uit = D['V-F4'].state === 0; document.querySelector('#kit [data-kv="ok"]').click(); O.closeKit(); }
          else if (s.act) await T.op(...s.act); T.step(0.5); }
        const exp = O.kitTests(f).find(x => x.id === 't2').expectT;
        return { open: dicht, p95: kit.p95.txt === 'spreekt niet aan', p105: kit.p105.txt === 'spreekt aan', t2: Math.abs(kit.t2.t / exp - 1) < 0.05, trip: kit.uit && /schakelt af/.test(kit.trip.txt),
          klaar: !O.task(), jaar: f.relayYear === 2026, aan: D['V-F4'].state === 1 && EN().has('F4') && D[O.RINGS.find(g => g.from === 'F4' || g.to === 'F4').nop].state === 0, punten: O.GAME.score > sc0 }; });
      for (const [k, v] of Object.entries(r)) assert(v, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'defect relais: weigert bij storing (rail uit), afkeuren en vervangen', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); const O = OS, D = O.D, EN = () => O.EN(), f = O.FD('F6'); O.SIM.paused = false; T.step(0.3);
        const aan0 = Object.values(D).filter(d => d.type === 'cb' && d.state === 1).map(d => d.id);
        f.relay = { trip: false }; O.feederFault('F6', 5); T.step(0.2);
        const railUit = !EN().has('RB') && EN().has('RA'), bekend = !!f.relayKnown && D['V-F6'].state === 1;
        await T.op('V-F6', 0); for (let k = 0; k < 60 && f.fault; k++) T.step(2);
        for (const id of aan0) if (D[id].state === 0) await T.op(id, 1); f.clp = 1; T.step(1);
        f.relay = { drift: 1.2 }; O.startTask('relayTask', 'F6'); let kit = null;
        for (let k = 0; k < 200 && O.task(); k++) { const t = O.task(), s = t.steps[t.i];
          if (s.kit && !kit) { for (const x of O.kitTests(f)) O.kitRun(x.id); kit = JSON.parse(JSON.stringify(t.kit.res)); O.kitVerdict(t, 'reject'); }
          else if (s.act) await T.op(...s.act); T.step(0.5); }
        return { railUit, bekend, afwijking: kit.p105.txt === 'spreekt niet aan', klaar: !O.task() || O.task().steps[O.task().i].t, nieuw: !O.relayDefect(f) && !f.relayKnown, aan: EN().has('F6') }; });
      for (const [k, v] of Object.entries(r)) assert(v, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'toetsenoverzicht opent met H en sluit met Esc', query: '?autostart', async run(p) {
      await p.keyboard.press('h');
      const r = await p.evaluate(() => { const k = document.querySelector('#keys'); return { open: !k.classList.contains('hidden'), rows: k.querySelectorAll('tr').length, pauze: OS.SIM.paused,
        alle: OS.KEY_HELP.flatMap(g => g[1]).length }; });
      await p.keyboard.press('Escape');
      const dicht = await p.evaluate(() => document.querySelector('#keys').classList.contains('hidden'));
      assert(r.open && r.pauze && r.rows === r.alle && r.alle > 15 && dicht, `toetsenoverzicht klopt niet: ${JSON.stringify({ ...r, dicht })}`);
  } },
  { name: 'scenario evenement: melding bij het begin van het concert', query: '?play=evenement', async run(p) {
      const r = await p.evaluate(() => { T.step(50); return { start: !!OS.GAME.flags.evStart, melding: [...document.querySelectorAll('#alarmList .al')].some(e => /Het concert begint/.test(e.textContent)) }; });
      assert(r.start && r.melding, `concertstart niet gemeld: ${JSON.stringify(r)}`);
  } },
  { name: 'elk apparaatpaneel opent zonder fout, ook bij storingen', query: '?play=free&t=11', async run(p) {
      const r = await p.evaluate(() => { const O = OS, fout = []; O.closeHandover?.(); T.quiet();
        const ronde = wat => { for (const id of Object.keys(O.D)) { try { O.selectDevice(id); O.refreshDevPanel(); O.updateSLD?.(); } catch (e) { fout.push(`${wat} ${id}: ${e.message}`); } } O.selectDevice(null); };
        ronde('normaal'); O.meppelFault(); O.feederFault('F6', 30); O.busFault?.(); O.ringFault(O.FEEDERS.find(f => f.id === 'F3'), O.RING.secs.find(s => s.id === 'K23'), 60); T.step(1); ronde('storing');
        return fout.slice(0, 8); });
      assert(!r.length, `paneel geeft fouten: ${r.join(' | ')}`);
  } },
  { name: 'incident brand (vrije dienst): brandweer schakelt zelf af zonder vals veiligheidsincident', query: '?play=free&t=11', async run(p) {
      const r = await p.evaluate(() => { const O = OS; O.closeHandover?.(); T.quiet(); O.SIM.paused = false; T.step(0.5); const i0 = O.SIM.incidents;
        O.startIncident('brand', true); for (let k = 0; k < 60; k++) T.step(1);
        return { inc: O.SIM.incidents - i0, vals: [...document.querySelectorAll('#alarmList .al')].some(e => /weer spanning op terwijl/.test(e.textContent)), geblust: [...document.querySelectorAll('#alarmList .al')].some(e => /brand geblust/.test(e.textContent)) }; });
      assert(r.inc === 1 && !r.vals && r.geblust, `brand verloopt niet goed: ${JSON.stringify(r)}`);
  } },
  { name: 'punten terugverdienen: herstelbonus, rotatie bij capaciteitstekort en hersteltijd', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); const O = OS, D = O.D, EN = () => O.EN(); const ev = t => O.REC.events.some(e => JSON.stringify(e).includes(t)); O.SIM.paused = false; T.step(0.5);
        O.tripBreaker('V-F3'); T.step(0.3); const ms1 = O.RING.stations.find(x => x.id === 'MS1'); const uit = !EN().has('M1');
        O.setEta(ms1, 30); const eta = ev('Hersteltijd doorgegeven'); const hp = O.CONS.find(c => c.id === 'MS3-G3'); O.callPrio(hp); const prio = ev('Prioriteitsklant');
        T.step(5); await T.op('V-F3', 1); T.step(0.5); const bonus = ev('Herstelbonus'), gehaald = ev('Hersteltijd MS1 gehaald');
        // rotatie: tijdens een capaciteitstekort een station afschakelen telt half en levert bij terugschakelen punten op
        O.GAME.flags.shortUntil = O.SIM.t + 120; await T.op('MS6-T', 0); T.step(0.3); const g = O.LVG.find(x => x.id === 'MS6-G1'); const shed = g.shed && O.shedFactor(g) === 0.5;
        T.step(15); await T.op('MS6-T', 1); T.step(0.3);
        return { uit, eta, prio, bonus, gehaald, shed, rotatie: ev('Rotatie'), geenBonusVoorEigenSchakeling: !O.REC.events.filter(e => JSON.stringify(e).includes('Herstelbonus')).some(e => e.t > O.SIM.t - 1) }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'noodaggregaat: monteur sluit aan, overbelasting, afkoppelen', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); const O = OS, D = O.D, EN = () => O.EN(), s = O.RING.stations.find(x => x.id === 'MS2'); O.SIM.paused = false; T.step(0.5);
        O.tripBreaker('V-F3'); T.step(0.3); O.gsSend(s); const onderweg = O.GENSET.busy === 1 && O.LS_ORDERS.length === 1;
        for (let k = 0; k < 30 && !s.gs; k++) T.step(1);
        const aan = s.gs?.state === 'aan' && D['MS2-T'].state === 0, last = s.gs?.load;
        // te zwaar? dan valt hij uit; daarna groepen lokaal afschakelen en herstarten
        let boven = 0; for (let k = 0; k < 24 && s.gs.state === 'aan'; k++) { T.step(0.25); boven = s.gs.load > 1.1 ? boven + 0.25 : 0; }
        const trip = s.gs.state === 'trip' || boven < 2.5;   // valt uit na ±2 min boven 110%
        O.SIM.localTest = true; for (const g of s.groups.slice(1)) await T.op(g.id, 0); O.SIM.localTest = false;
        for (let k = 0; k < 12 && !(s.gs.state === 'aan' && s.gs.load < 1.1); k++) { if (s.gs.state === 'trip' && !O.LS_ORDERS.length) O.gsRestart(s); T.step(1); }   // zo nodig herstarten
        const draait = s.gs.state === 'aan' && s.gs.load < 1.1 && s.groups[0].backfed && O.SIM.off >= 0;
        await T.op('V-F3', 1); T.step(0.5); const tSlot = await T.op('MS2-T', 1); const vergrendeld = D['MS2-T'].state === 0;
        O.gsOff(s); for (let k = 0; k < 6 && s.gs; k++) T.step(1);
        const terug = !s.gs && D['MS2-T'].state === 1 && EN().has('M2v'); T.step(21);
        return { onderweg, aan, trip, draait, vergrendeld, terug, vrij: O.GENSET.busy === 0 }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'LS-koppeling: alleen met LS-veld open, niet parallel, op afstand via een monteur', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); const O = OS, D = O.D, EN = () => O.EN(); O.SIM.paused = false; T.step(0.5);
        O.tripBreaker('V-F3'); T.step(0.3); const ms3uit = !EN().has('MS3-G4') && EN().has('MS4-G1');
        O.operate('MS3-G4', 0); const opAfstand = D['MS3-G4'].state === 1 && O.LS_ORDERS.some(o => o.args.id === 'MS3-G4');
        O.LS_ORDERS.splice(0); O.SIM.localTest = true;
        await T.op('KK34', 1); const terugvoedWeigert = D.KK34.state === 0;
        await T.op('MS3-G4', 0); await T.op('KK34', 1); T.step(0.3); const gevoed = EN().has('MS3-G4') && !EN().has('M3v') && O.LS_LINKS.find(d => d.id === 'KK34').load > 0;
        await T.op('V-F3', 1); T.step(0.3); await T.op('MS3-G4', 1); const parallelWeigert = D['MS3-G4'].state === 0;
        await T.op('KK34', 0); await T.op('MS3-G4', 1); T.step(0.3); O.SIM.localTest = false;
        return { ms3uit, opAfstand, terugvoedWeigert, gevoed, parallelWeigert, normaal: D['MS3-G4'].state === 1 && D.KK34.state === 0 && EN().has('MS3-G4') }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'LS-spanning: zonnepanelen geven overspanning, vaste trap alleen spanningsloos', query: '?autostart&t=13.5&season=zomer', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); const O = OS, D = O.D, s = O.RING.stations.find(x => x.id === 'MS4'), g = O.LVG.find(x => x.id === 'MS4-G1'); const ev = t => O.REC.events.some(e => JSON.stringify(e).includes(t));
        O.setWeather('helder', true, true); O.SIM.paused = false; s.tapLv = 2; T.step(0.5); const hoog = g.U > 253;
        for (let k = 0; k < 6 && !(g.pvTrip > O.SIM.t); k++) T.step(0.5); const omvormers = g.pvTrip > O.SIM.t;
        O.tapOrder(s, -1); for (let k = 0; k < 15 && O.LS_ORDERS.length; k++) T.step(1); const weigert = s.tapLv === 2;
        await T.op('MS4-T', 0); for (const n of [1, 2, 3]) { O.tapOrder(s, -1); for (let k = 0; k < 15 && O.LS_ORDERS.length; k++) T.step(1); } await T.op('MS4-T', 1); T.step(0.5);
        return { hoog, omvormers, weigert, trap: s.tapLv === -1, opgelost: ev('Spanningsklacht opgelost'), lager: g.U < 253 }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'LS-venster (N) en SCADA-tabblad LS', query: '?autostart&t=11', async run(p) {
      await p.keyboard.press('n');
      const r = await p.evaluate(() => { const O = OS, w = document.querySelector('#lsWin'); const open = !w.classList.contains('hidden') && O.SIM.paused;
        w.querySelector('[data-lst="MS4"]').click(); const ms4 = /MS4 Zuiderveld/.test(w.textContent) && w.querySelectorAll('[data-lsw]').length >= 3;
        O.closeLS(); O.setTab('L'); O.renderLS(); const tab = document.querySelectorAll('#lsG [data-ls]').length >= 9;
        return { open, ms4, tab, dicht: w.classList.contains('hidden') }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'vensters na elkaar: pauze komt goed terug', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(() => { const O = OS; O.SIM.paused = false;
        O.openFlex(); O.openProt(); O.closeFlex(); const nogPauze = O.SIM.paused; O.closeProt(); const loopt = !O.SIM.paused;
        O.SIM.paused = true; O.openKeys(); O.closeKeys(); const blijftPauze = O.SIM.paused; O.SIM.paused = false;
        return { nogPauze, loopt, blijftPauze }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'opgeslagen spel van versie 1 wordt omgezet en hervat', query: '?play=free&t=11', async run(p) {
      await p.evaluate(() => { const O = OS; O.closeHandover?.(); T.quiet(); O.SIM.paused = false; T.step(0.5); O.saveGame(true);
        const d = JSON.parse(localStorage.getItem('osz-save')); d.v = 1; delete d.LS; d.D['V-F6'].stuck = true; delete d.D['V-F6'].refusals; localStorage.setItem('osz-save', JSON.stringify(d)); O.GAME.ended = true; });   // niet opnieuw opslaan bij het verlaten
      await p.goto(pageUrl + '?resume&lite', { waitUntil: 'load', timeout: 180000 });
      for (let i = 0; i < 120 && !(await p.evaluate(() => !!window.OS)); i++) await sleep(500);
      const r = await p.evaluate(() => ({ hervat: OS.GAME.mode === 'free' && document.querySelector('#intro').classList.contains('hidden'), weigering: OS.D['V-F6'].refusals === 1 && !OS.D['V-F6'].stuck, ls: OS.GENSET.busy === 0 }));
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'aardfout in de ring: U0 zonder uitval, rails splitsen, kabel vrijschakelen = gevonden', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); const O = OS, D = O.D, EN = () => O.EN(); const ev = t => O.REC.events.some(e => JSON.stringify(e).includes(t)); O.SIM.paused = false; T.step(0.5);
        const off0 = O.SIM.off; O.earthFault('K23'); T.step(0.5);
        const geenUitval = O.SIM.off === off0 && EN().has('K23'), beide = O.efRails().join() === 'RA,RB', u0 = O.efU0() > 5;
        const scada = /AARDFOUT/.test(document.querySelector('[data-m="ef10"]').textContent);
        await T.op('V-K', 0); T.step(0.3); const alleenA = O.efRails().join() === 'RA';
        await T.op('MS2-R', 0); await T.op('MS3-L', 0); T.step(0.5);
        const s = O.RING.secs.find(x => x.id === 'K23');
        return { geenUitval, beide, u0, scada, alleenA, gevonden: !O.EF.on && s.fault && s.located, punten: ev('Aardfout gevonden') }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'aardfout in een veldkabel en de dubbele aardfout', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); const O = OS, D = O.D, EN = () => O.EN(); const ev = t => O.REC.events.some(e => JSON.stringify(e).includes(t)); O.SIM.paused = false; T.step(0.5);
        O.earthFault('F6'); T.step(0.3); const actief = !!O.EF.on && O.efRails().length > 0;
        await T.op('V-F6', 0); T.step(0.3); const gevonden = !O.EF.on && !!O.FD('F6').fault;
        for (let k = 0; k < 60 && O.FD('F6').fault; k++) T.step(2); await T.op('V-F6', 1); T.step(0.5);
        O.earthFault('K12'); O.EF.on.at = O.SIM.t - 55; for (let k = 0; k < 150 && O.EF.on; k++) T.step(1);   // 5% kans per minuut
        return { actief, gevonden, dubbel: !O.EF.on && ev('Dubbele aardfout') && O.RING.secs.find(x => x.id === 'K12').fault }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'selectiviteit: grafiek, te snelle reserve laat de rail uitvallen, storingsschrijver', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); const O = OS, D = O.D, EN = () => O.EN(), f = O.FD('F6'); O.SIM.paused = false; T.step(0.5);
        const standaard = !O.selectivity(f).bad;
        O.feederFault('F6', 30); T.step(0.2); const railBlijft = EN().has('RB') && D['V-T1'].state === 1, reg = O.FREC[0]?.kind === 'kortsluiting' && O.FREC[0].dev === 'V-F6';
        O.openRec(0); const svg = document.querySelectorAll('#recWin polyline').length >= 6; O.closeRec();
        O.PROT.tr.T1.oc = 0.05; const slecht = O.selectivity(O.FD('F5')).bad;
        O.openProt(); const grafiek = /Niet selectief/.test(document.querySelector('#prot').textContent) || !!document.querySelector('#prot .selc'); O.closeProt();
        O.shortCircuit(O.FD('F5'), 12000); T.step(0.2); const railUit = D['V-T1'].state === 0 && !EN().has('RA') && O.FREC[0].inc === 'V-T1';
        return { standaard, railBlijft, reg, svg, nietSelectief: !!slecht, grafiek, railUit }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'plaatsing: geen object in een ander object (auto in station, boom op de weg …)', query: '?autostart', async run(p) {
      const r = await p.evaluate(() => ({ n: OS.LAYOUT.length, bad: OS.layoutCheck() }));
      assert(r.n > 500 && r.bad.length === 0, `botsingen in de wijk (${r.bad.length}): ${r.bad.slice(0, 6).join(' | ')}`);
      const weg = await p.evaluate(() => { const L = OS.LAYOUT, roads = L.filter(e => e.kind === 'road'), stoep = L.filter(e => e.kind === 'stoep'), ov = (a, b, m = 0.05) => a[0] < b[2] - m && a[2] > b[0] + m && a[1] < b[3] - m && a[3] > b[1] + m;
        return L.filter(e => ['tree', 'car', 'lamp', 'kast', 'kk', 'halte'].includes(e.kind) && roads.some(q => ov(e.r, q.r))).map(e => e.kind + '@' + e.r.map(v => v.toFixed(0)))
          .concat(L.filter(e => (e.kind === 'kast' || e.kind === 'kk') && stoep.some(q => ov(e.r, q.r))).map(e => e.kind + ' op de stoep @' + e.r.map(v => v.toFixed(0)))); });
      assert(weg.length === 0, `op de weg of de stoep: ${weg.slice(0, 6).join(' | ')}`);
  } },
  { name: 'opslaan en hervatten: moffen, graafwerk en een bekende foutplek blijven bewaard', query: '?play=free&t=11', async run(p) {
      const voor = await p.evaluate(async () => { const O = OS; O.closeHandover?.(); T.quiet(); localStorage.removeItem('osz-save-3');
        const c = O.CABLES.find(x => x.id === 'K34'); c.moffen.forEach(m => m.year = 1971); O.KLIC.jobs.length = 0; const j = O.klicNew(O.CABLES.find(x => x.id === 'K12')); j.marked = true;
        const sec = O.RING.secs.find(x => x.id === 'K67'); O.ringFault(O.FEEDERS.find(x => x.id === 'F1'), sec, 200); sec.located = true; sec.spot.known = true;
        O.saveGame(true, '3'); O.GAME.ended = true; return { n: c.moffen.length, d: Math.round(sec.spot.d) }; });
      await p.goto(pageUrl + '?resume=3&lite', { waitUntil: 'load', timeout: 180000 });
      for (let i = 0; i < 120 && !(await p.evaluate(() => !!window.OS)); i++) await sleep(500);
      const na = await p.evaluate(() => { const O = OS, c = O.CABLES.find(x => x.id === 'K34'), sec = O.RING.secs.find(x => x.id === 'K67'), j = O.KLIC.jobs[0];
        const r = { moffen: c.moffen.length && c.moffen.every(m => m.year === 1971), klic: !!j && j.c.id === 'K12' && j.marked, spot: sec.fault && sec.spot?.known && Math.round(sec.spot.d), rep: sec.repairAt > O.SIM.t + 100, dig: O.DIGS.has(sec.spot) };
        localStorage.removeItem('osz-save-3'); return r; });
      assert(na.moffen === true && na.klic === true && na.spot === voor.d && na.rep === true && na.dig === true, `niet goed hervat: ${JSON.stringify({ voor, na })}`);
  } },
  { name: 'meerdere opslagplekken: kiezen, hervatten uit een plek, verwijderen', query: '?play=free&t=11', async run(p) {
      const voor = await p.evaluate(async () => { const O = OS; O.closeHandover?.(); T.quiet(); O.SIM.paused = false; T.step(0.5);
        localStorage.removeItem('osz-save-2'); await T.op('V-F6', 0); O.GAME.score = 4321;
        O.openSlots(); document.querySelector('#slotWin [data-slot="2"]').click();
        O.GAME.score = 1111; O.saveGame(true); O.GAME.ended = true;   // automatisch opslaan (andere stand), daarna niet nog eens bij het verlaten
        return { plekken: O.listSaves().map(x => x.k).join(), dicht: document.querySelector('#slotWin').classList.contains('hidden') }; });
      assert(voor.plekken.includes('auto') && voor.plekken.includes('2') && voor.dicht, `opslaan in plek mislukt: ${JSON.stringify(voor)}`);
      await p.goto(pageUrl + '?lite', { waitUntil: 'load', timeout: 180000 });
      for (let i = 0; i < 120 && !(await p.evaluate(() => !!window.OS)); i++) await sleep(500);
      const menu = await p.evaluate(() => [...document.querySelectorAll('#menu [data-resume]')].map(b => b.dataset.resume).join());
      await p.goto(pageUrl + '?resume=2&lite', { waitUntil: 'load', timeout: 180000 });
      for (let i = 0; i < 120 && !(await p.evaluate(() => !!window.OS)); i++) await sleep(500);
      const na = await p.evaluate(() => { const O = OS, r = { score: Math.round(O.GAME.score), f6: O.D['V-F6'].state };
        O.SIM.paused = false; document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }));
        r.ctrlS = JSON.parse(localStorage.getItem('osz-save-2')).at > Date.now() - 5000; O.deleteSave('2'); r.weg = !O.readSave('2') && !!O.readSave('auto'); O.GAME.ended = true; return r; });
      assert(menu.includes('auto') && menu.includes('2'), `hoofdmenu toont de plekken niet: ${menu}`);
      assert(na.score === 4321 && na.f6 === 0 && na.ctrlS && na.weg, `hervatten uit plek 2 klopt niet: ${JSON.stringify(na)}`);
  } },
  { name: 'dienstrapport als PDF (met tijdlijn)', query: '?play=zkh', async run(p) {
      const r = await p.evaluate(async () => { const O = OS; O.SIM.paused = false; for (let k = 0; k < 400 && !O.GAME.ended; k++) T.step(1);
        const rapport = !document.querySelector('#report').classList.contains('hidden'), knop = !!document.querySelector('#report [data-r="pdf"]');
        const bytes = await O.reportPDF(true); return { rapport, knop, bytes, tijdlijn: !!document.querySelector('#report svg.tl') }; });
      assert(r.rapport && r.knop && r.tijdlijn && r.bytes > 20000 && r.bytes < 400000, `PDF klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'paneel lopende storingen: oorzaken, gevolgen samengevoegd, klikken, opgelost = weg', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); const O = OS; O.SIM.paused = false; T.step(0.3);
        O.renderFaults(); const leeg = /Geen lopende storingen/.test(document.querySelector('#faultList').textContent);
        O.feederFault('F6', 5); O.ringFault(O.FEEDERS.find(f => f.id === 'F3'), O.RING.secs.find(s => s.id === 'K23'), 20); T.step(0.5); O.renderFaults();
        const ks = O.activeFaults().map(f => f.key), ring = O.activeFaults().find(f => f.key === 'rsK23');
        const samen = ks.includes('ffF6') && ks.includes('rsK23') && !ks.some(k => k.startsWith('sxMS')) && ring.cust > 1000 && /MS1/.test(ring.detail);
        document.querySelector('#faultList [data-fgo^="R"]').click(); const klik = O.SLD.tab === 'R';
        for (let k = 0; k < 80 && O.RING.secs.find(s => s.id === 'K23').fault; k++) T.step(2);
        await T.op('V-F3', 1); for (let k = 0; k < 80 && O.FD('F6').fault; k++) T.step(2); await T.op('V-F6', 1); T.step(0.5); O.renderFaults();
        return { leeg, samen, klik, weg: !O.activeFaults().some(f => f.key === 'rsK23' || f.key === 'ffF6'), teller: document.querySelector('#faultCnt').textContent }; });
      for (const [k, v] of Object.entries(r)) if (k !== 'teller') assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'storingsmonteurs rijden met het busje naar werk buiten het hek, binnen het hek lopen ze', query: '?autostart&t=13', async run(p) {
      const r = await p.evaluate(async () => { const O = OS; T.quiet(); window.__klaar = false; const n0 = O.NPCS.length;
        const binnen = O.crewDispatch({ box: O.VIEWS.T2.box, say: 'Inspectie T2', until: () => window.__klaar }), lopend = Array.isArray(binnen) && binnen.length > 0 && O.VANS.length === 0;
        O.NPCS.splice(n0).forEach(n => { n.P.g.parent?.remove(n.P.g); n.el.remove(); });
        const V = O.crewDispatch({ box: O.VIEWS.MS3.box, say: 'Kabelfout graven', until: () => window.__klaar }), busje = !!V && O.VANS.includes(V) && V.state === 'heen' && O.NPCS.length === n0;
        const start = V.g.position.clone(); for (let i = 0; i < 600 && V.state === 'heen'; i++) O.vanTick(0.1);
        const end = V.g.position, gereden = start.distanceTo(end) > 150 && end.distanceTo(O.VIEWS.MS3.center) < 25, uit = V.state === 'werk' && V.npcs.length === 2 && V.npcs.every(n => O.NPCS.includes(n));
        window.__klaar = true; for (let i = 0; i < 200 && V.state === 'werk'; i++) await T.sleep(100);
        const terug = V.state === 'terug'; for (let i = 0; i < 600 && O.VANS.includes(V); i++) O.vanTick(0.1);
        return { lopend, busje, gereden, uit, terug, weg: !O.VANS.includes(V) }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'koperdiefstal in een MS-station: inbraak, onveilig (niet lokaal schakelen, SCADA wel), aarding hersteld', query: '?autostart&t=10', async run(p) {
      const r = await p.evaluate(async () => { const O = OS; T.quiet(); const s = O.RING.stations.find(x => x.id === 'MS2'); O.copperTheft(s);
        const melding = s.theft?.phase === 'melding' && O.activeFaults().some(f => f.key === 'thMS2');
        s.theft.until = O.SIM.t + 1; const rnd0 = Math.random; Math.random = () => 0.2; await T.step(2); Math.random = rnd0;
        const onveilig = s.theft?.phase === 'onveilig' && O.activeFaults().some(f => f.key === 'thMS2' && f.sev === 'crit'), lv = !!s.theft.lv && O.LVG.find(g => g.id === s.theft.lv).lvf?.theft;
        const g = s.groups.find(x => x.kind === 'res' && x.id !== s.theft.lv), st0 = O.D[g.id].state; O.operate(g.id, 0, { crew: true }); const lsGeweigerd = O.D[g.id].state === st0;
        const blokLokaal = !!O.stationBlock(s, 'MS2-L', 0, true), scada = !O.stationBlock(s, 'MS2-L', 0, false);
        s.theft.until = O.SIM.t + 1; await T.step(2); const klaar = !s.theft && !O.LVG.some(x => x.lvf?.theft);
        return { melding, onveilig, lv, lsGeweigerd, blokLokaal, scada, klaar }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'brandende distributietrafo: straten uit, brandweer blust pas spanningsloos, incident bij terugschakelen, trafo vervangen', query: '?autostart&t=10', async run(p) {
      const r = await p.evaluate(async () => { const O = OS; T.quiet(); const s = O.RING.stations.find(x => x.id === 'MS2'); O.trafoFire(s); O.computeFlows();
        const uit = O.D['MS2-T'].state === 0 && !O.stationLive(s) && !!s.burn;
        O.operate('MS2-L', 0); const nietBedienbaar = O.D['MS2-L'].state === 1;
        s.burn.arrive = O.SIM.t; await T.step(1); const wacht = s.burn.phase === 'wacht';
        const sw = O.stNeighborSwitches(s); for (const id of sw) await T.op(id, 0); await T.step(1);
        const blust = s.burn.phase === 'blussen' && O.stIsolated(s);
        const inc0 = O.SIM.incidents; O.D[sw[0]].state = 1; O.computeFlows(); await T.step(1); const incident = O.SIM.incidents > inc0; O.D[sw[0]].state = 0; O.computeFlows();
        s.burn.until = O.SIM.t; await T.step(1); const vervangen = s.burn?.phase === 'vervangen';
        O.operate('MS2-T', 1); const tDicht = O.D['MS2-T'].state === 0;
        s.burn.until = O.SIM.t; await T.step(1); const klaar = !s.burn;
        // niemand reageert: na 25 minuten schakelt de storingsdienst zelf af
        const s2 = O.RING.stations.find(x => x.id === 'MS8'); O.trafoFire(s2); s2.burn.arrive = O.SIM.t; await T.step(1); s2.burn.wait = O.SIM.t - 26; await T.step(1); const auto = s2.burn.phase === 'blussen' || O.stIsolated(s2);
        return { uit, nietBedienbaar, wacht, blust, incident, vervangen, tDicht, klaar, auto }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'trafobrand: afzetting pas als de politie er is, verkeer stopt ervoor, hulpdiensten op afstand', query: '?autostart&t=10', async run(p) {
      const r = await p.evaluate(async () => { const O = OS; T.quiet(); const s = O.RING.stations.find(x => x.id === 'MS3'); O.trafoFire(s); s.burn.arrive = 1e9; O.stationVisuals(0.016);
        const v = O.STV.get(s), eerst = !!v.police && !v.police.arrived && O.CORDONS.length === 0;
        v.police.arrived = true; O.stationVisuals(0.016); const afgezet = O.CORDONS.length === 1 && !!v.cordon && !!v.tape;
        const c = O.VIEWS.MS3.center, afstand = Math.hypot(v.police.g.position.x - c.x, v.police.g.position.z - c.z) > 15 || !v.police.r;
        // een gewone bus mag de afzetting niet in, een hulpdienst wel
        const rt = O.cityRoute([[c.x - 60, c.z + 0.01], [c.x + 60, c.z + 0.01]]), mk = em => ({ r: rt, d: 0, v: 9, vmax: 9, wait: 0, stops: [], len: 6, emergency: em, g: { position: { set() {} }, rotation: { y: 0 } } });
        const bus = mk(false), amb = mk(true); for (let i = 0; i < 200; i++) { O.driveVehicle(bus, 0.1); O.driveVehicle(amb, 0.1); }
        const [bx, bz] = O.routeAt(rt, bus.d + 4), stopt = !O.inCordon(bx, bz) && bus.d < 60, door = amb.d > 80;
        s.burn = null; O.stationVisuals(0.016); const weg = O.CORDONS.length === 0;
        return { eerst, afgezet, afstand, stopt, door, weg }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'regressie: geen hervatten tijdens bekijken, geen moffenwerk op een warme kabel, graafschade aan een spanningsloze LS-kabel geen MS-storing, markt samengevoegd', query: '?autostart&t=10', async run(p) {
      const r = await p.evaluate(async () => { const O = OS; T.quiet();
        O.openWT(); document.querySelector('#pvBar [data-pv="view"]').click(); O.setSpeed(0); const bekijken = O.SIM.paused && !!O.getPreview(); O.closeWT();
        const c = O.CABLES.find(x => x.kind === 'ring' && x.sec.a && x.sec.b); c.moffen.forEach(m => m.year = 1975); c.sec.temp = 120; const warm = O.cableState(c) === 'warm'; O.gisMofReplace(c); const geenWerk = warm && !c.work; c.sec.temp = 20;
        const ls = O.CABLES.find(x => x.kind === 'ls'); O.D[ls.g.id].state = 0; O.computeFlows(); const ff0 = O.FEEDERS.filter(f => f.fault).length, j = O.klicNew(ls); O.klicHit(j);
        const geenMS = O.FEEDERS.filter(f => f.fault).length === ff0 && O.RING.secs.every(x => !x.fault); O.D[ls.g.id].state = 1; O.computeFlows();
        const markt = O.MARKET.children.length <= 14;
        return { bekijken, geenWerk, geenMS, markt }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'noodaggregaat op een aanhanger achter het busje, in het gras naast het station; busje parkeert op de stoep', query: '?autostart&t=13', async run(p) {
      const r = await p.evaluate(async () => { const O = OS; T.quiet(); const s = O.RING.stations.find(x => x.id === 'MS2'); O.D['MS2-L'].state = 0; O.D['MS2-R'].state = 0; O.computeFlows();
        const V = O.crewDispatch({ box: O.VIEWS.MS2.box, n: 1, say: 'noodaggregaat', tow: s, until: () => !!window.__gsKlaar }), aanhanger = !!V && !!V.trailer && V.tow === s && !O.GSV.has(s);
        for (let i = 0; i < 900 && V.state === 'heen'; i++) O.vanTick(0.1); for (let i = 0; i < 30; i++) O.vanTick(0.1);
        const g = O.GSV.get(s), ag = !!g && !V.trailer, gp = g?.g.position, BAD = ['road', 'stoep', 'house', 'apt', 'hall', 'kiosk', 'hedge', 'shed', 'woonerf'];
        const gras = !!gp && !O.LAYOUT.some(e => BAD.includes(e.kind) && gp.x > e.r[0] && gp.x < e.r[2] && gp.z > e.r[1] && gp.z < e.r[3]) && Math.hypot(gp.x - O.VIEWS.MS2.center.x, gp.z - O.VIEWS.MS2.center.z) < 14;
        const vp = V.g.position, stoep = O.LAYOUT.some(e => e.kind === 'stoep' && vp.x > e.r[0] - 0.3 && vp.x < e.r[2] + 0.3 && vp.z > e.r[1] - 0.3 && vp.z < e.r[3] + 0.3) && !O.LAYOUT.some(e => e.kind === 'road' && vp.x > e.r[0] + 0.3 && vp.x < e.r[2] - 0.3 && vp.z > e.r[1] + 0.3 && vp.z < e.r[3] - 0.3);
        window.__gsKlaar = true; s.gs = null; s.genset = false; O.gensetTick(0.1); const weg = !O.GSV.has(s);
        return { aanhanger, ag, gras, stoep, weg }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'updateknop in het hoofdmenu: nieuwe versie op GitHub laat de knop knipperen, eigen of actuele versie niet', query: '?menu', async run(p) {
      const r = await p.evaluate(async () => { const O = OS, url = v => URL.createObjectURL(new Blob([JSON.stringify(v)], { type: 'application/json' })), btn = () => document.querySelector('#updBtn');
        const knop = !!btn() && /versie [0-9a-f]{12}/.test(document.querySelector('#updWrap').textContent);
        await O.checkUpdate(url({ build: 'aaaaaaaaaaaa', date: '2026-11-01', previous: ['dddddddddddd', O.BUILD_ID, 'eeeeeeeeeeee'],
          notes: { aaaaaaaaaaaa: { date: '2026-11-01', text: 'Datacenter <b>realistischer</b>' }, dddddddddddd: { date: '2026-10-31', text: 'Bordjes passen' }, [O.BUILD_ID]: { text: 'al geïnstalleerd' }, eeeeeeeeeeee: { text: 'oud' } } }));
        const nieuw = O.UPD.state === 'nieuw' && btn().classList.contains('upd-new');
        btn().click(); const box = !!document.querySelector('.upd-box [data-upd="install"]');
        const li = [...document.querySelectorAll('.upd-notes li')].map(e => e.textContent), notities = li.length === 2 && /^Datacenter <b>realistischer<\/b>/.test(li[0]) && /^Bordjes passen/.test(li[1]);
        document.querySelector('[data-upd="close"]').click(); const dicht = !document.querySelector('.upd-box');
        await O.checkUpdate(url({ build: O.BUILD_ID, date: '2026-10-26', previous: [] })); const actueel = O.UPD.state === 'actueel' && !btn().classList.contains('upd-new');
        await O.checkUpdate(url({ build: 'bbbbbbbbbbbb', date: '2026-10-20', previous: ['cccccccccccc'] })); const eigen = O.UPD.state === 'eigen' && !btn().classList.contains('upd-new');
        await O.checkUpdate('data:application/json,geen-json'); const fout = O.UPD.state === 'fout';
        return { knop, nieuw, box, notities, dicht, actueel, eigen, fout, datacenterInMenu: !!document.querySelector('#menu [data-mode="datacenter"]') }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'begeleiding: railfout uitgelegd met stappen die zichzelf afvinken, railfout zichtbaar in SCADA', query: '?autostart&t=13', async run(p) {
      const r = await p.evaluate(async () => { const O = OS; T.quiet(); O.setCoach(true);
        O.renderCoach(); const rustig = !document.querySelector('#coach').classList.contains('hidden') && /Begeleiding/.test(document.querySelector('#coach').textContent);
        O.busFault('RB', 120); O.updateSLD(); O.renderCoach();
        const c = O.coachCards().find(x => x.key === 'bfRB'), kaart = !!c && /Wat gebeurt er/i.test(document.querySelector('#coach').textContent);
        const scada = [...document.querySelectorAll('#sld [data-n="RB"]')].some(e => e.classList.contains('busfault')) && /RAILFOUT rail B/.test(document.querySelector('#sld').textContent);
        const st = () => c.steps.map(x => x.done()), voor = st();
        // velden van rail B overzetten naar rail A
        for (const f of ['F4', 'F5', 'F6']) { O.D[f + '-QB'].state = 0; O.D[f + '-QA'].state = 1; } O.computeFlows(); const na = st();
        for (const f of ['F4', 'F5', 'F6']) await T.op('V-' + f, 1); const aan = st();
        O.setCoach(false); const dicht = document.querySelector('#coach').classList.contains('hidden');
        return { rustig, kaart, scada, overzetten: !voor[2] && na[2], inschakelen: aan[3], dicht }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'update installeren: één keer het bestand aanwijzen, daarna direct overschrijven en herstarten; ander bestand geweigerd; anders downloaden', query: '?menu', async run(p) {
      const r = await p.evaluate(async () => { const O = OS, html = "<html><title>OS Zuidwolde</title><script>const BUILD_ID='abcdefabcdef';</script></html>";
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html' })), mem = new Map(); O.UPD.store = { get: async k => mem.get(k), set: async (k, v) => mem.set(k, v), del: async k => mem.delete(k) };
        let inhoud = "<title>OS Zuidwolde</title> BUILD_ID='111111111111'", vragen = 0, kiezen = 0, herstart = 0;
        const handle = { getFile: async () => ({ text: async () => inhoud }), queryPermission: async () => 'prompt', requestPermission: async () => { vragen++; return 'granted'; },
          createWritable: async () => ({ write: async b => { inhoud = await b.text(); }, close: async () => {} }) };
        window.showOpenFilePicker = async () => { kiezen++; return [handle]; }; O.UPD.reload = () => { herstart++; };
        await O.installUpdate(url); await new Promise(r => setTimeout(r, 900));
        const eerste = kiezen === 1 && inhoud === html && herstart === 1 && mem.has('gameFile') && localStorage.getItem('osz-upd-expect') === 'abcdefabcdef' && localStorage.getItem('osz-upd-from') === O.BUILD_ID;
        await O.installUpdate(url); await new Promise(r => setTimeout(r, 900)); const tweede = kiezen === 1 && herstart === 2;   // geen venster meer
        // verkeerd bestand: geweigerd
        mem.clear(); inhoud = '<html>mijn vakantiefoto\'s</html>'; await O.installUpdate(url); const geweigerd = /niet de simulator/.test(O.UPD.msg) && inhoud.includes('vakantie');
        // annuleren
        window.showOpenFilePicker = async () => { throw new DOMException('weg', 'AbortError'); }; await O.installUpdate(url); const geannuleerd = /geannuleerd/.test(O.UPD.msg);
        // andere browsers: download
        delete window.showOpenFilePicker; let dl = null; const orig = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { dl = this.download; };
        await O.installUpdate(url); HTMLAnchorElement.prototype.click = orig; const download = dl === 'index.html' && /gedownload/.test(O.UPD.msg);
        await O.installUpdate(URL.createObjectURL(new Blob(['<html>iets anders</html>']))); const ongeldig = /geen geldige versie/.test(O.UPD.msg); localStorage.removeItem('osz-upd-expect'); localStorage.removeItem('osz-upd-from');
        return { eerste, tweede, geweigerd, geannuleerd, download, ongeldig }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'gebouwen in- en uitlopen: open deuropening, bordes op vloerhoogte, deur gaat open bij nadering en weer dicht; monteurs lopen op de vloer', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(async () => { const O = OS, bld = O.DOORS.filter(d => d.leaves.length === 2 && d.p.z < 440);
        // door elke deur van de stationsgebouwen kun je recht naar binnen lopen
        const vrij = bld.length >= 7 && bld.every(d => { for (let z = d.p.z - 2.2; z < d.p.z + 1.5; z += 0.1) if (O.blockedAt(d.p.x, z)) return false; return true; });
        const d = bld[0], bordes = Math.abs(O.floorAt(d.p.x, d.p.z - 0.6) - 0.45) < 0.01 && Math.abs(O.floorAt(d.p.x, d.p.z - 1.5) - 0.22) < 0.01 && Math.abs(O.floorAt(d.p.x, d.p.z + 1) - 0.45) < 0.01;
        O.enterFP(); O.FP.pos.set(d.p.x, 0, d.p.z - 6); for (let i = 0; i < 10; i++) O.doorTick(0.1); const dichtVer = d.o === 0;
        O.FP.pos.set(d.p.x, 0, d.p.z - 1.8); for (let i = 0; i < 10; i++) O.doorTick(0.1); const open = d.o === 1 && Math.abs(d.leaves[0].g.rotation.y) > 1.5;
        O.FP.pos.set(d.p.x, 0, d.p.z - 8); for (let i = 0; i < 10; i++) O.doorTick(0.1); const weerDicht = d.o === 0 && d.leaves[0].g.rotation.y === 0; O.exitFP();
        // een monteur die naar binnen loopt, staat binnen op de vloer
        O.crewSpawn({ box: O.VIEWS['V-F6'].box, say: '', until: () => false, n: 1 }); const n = O.NPCS[O.NPCS.length - 1]; let y = 0;
        for (let i = 0; i < 2000 && n.state !== 'work'; i++) O.updateNPCs(0.05); y = n.P.g.position.y;
        const opVloer = n.state === 'work' && Math.abs(y - 0.45) < 0.05;
        return { vrij, bordes, dichtVer, open, weerDicht, opVloer, y }; });
      for (const [k, v] of Object.entries(r)) if (typeof v === 'boolean') assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'straatverlichting: brandt alleen in het donker en met spanning op het OVL-veld, gedimd na 23 uur, lichtkegel bij mist', query: '?autostart&t=21.5', async run(p) {
      const r = await p.evaluate(async () => { const O = OS, s = O.RING.stations.find(x => x.lampMat && x.lamps > 2), t0 = O.SIM.t; O.updateSky(0.5); O.setWeather('helder', true, true); O.updateStreetLights();
        const aan = s.lampMat.emissiveIntensity > 4 && s.poolMat.opacity > 0.2 && s.coneMat.opacity < 0.01; O.SIM.t = t0 + 2 * 60; O.updateStreetLights(); const gedimd = Math.abs(s.lampMat.emissiveIntensity - 4.2) < 0.01; O.SIM.t = t0;
        O.setWeather('mist', true, true); O.updateStreetLights(); const kegel = s.coneMat.opacity > 0.02;
        O.D[s.ovl].state = 0; O.computeFlows(); O.updateStreetLights(); const zonderSpanning = s.lampMat.emissiveIntensity === 0; O.D[s.ovl].state = 1; O.computeFlows();
        O.updateSky(12); O.updateStreetLights(); const dag = s.lampMat.emissiveIntensity === 0;
        return { lampen: O.LAMPS.n > 30, aan, gedimd, kegel, zonderSpanning, dag, defect: O.LAMPS.defect.length > 0 }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'aggregaat vanuit het MS-stationspaneel: sturen als het station spanningsloos is, daarna afkoppelen', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(async () => { const O = OS, D = O.D; T.quiet(); const s = O.RING.stations.find(x => x.id === 'MS2');
        O.selectDevice('MS2'); O.refreshDevPanel(); const btn = k => document.querySelector(`#devpanel [data-act="${k}"]`);
        const knoppen = !!btn('gs') && !!btn('gsoff') && !!btn('gsrestart') && btn('gs').disabled && /beschikbaar/.test(document.querySelector('#devpanel').textContent);
        D['MS2-L'].state = 0; D['MS2-R'].state = 0; O.computeFlows(); O.refreshDevPanel(); const kan = !btn('gs').disabled;
        btn('gs').click(); O.refreshDevPanel(); const onderweg = O.LS_ORDERS.some(o => o.st === 'MS2' && o.kind === 'gs') && btn('gs').disabled && /onderweg/.test(document.querySelector('#devpanel').textContent);
        T.step(30); O.refreshDevPanel(); const draait = !!s.gs && !btn('gsoff').disabled && /draait/.test(document.querySelector('#devpanel').textContent);
        btn('gsoff').click(); const af = O.LS_ORDERS.some(o => o.st === 'MS2' && o.kind === 'gsoff');
        return { knoppen, kan, onderweg, draait, af }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'OS Meppel staat aan de noordkant van de stad, met een inrit tussen de bomen door en een eigen camerastandpunt', query: '?autostart', async run(p) {
      const r = await p.evaluate(() => { const O = OS, M = O.MEPPEL, L = O.LAYOUT;
        const gebouwd = !!M.gate && L.some(e => e.kind === 'site' && e.r[0] === M.x0 && e.r[1] === M.z0) && M.z0 > 440;
        const vrij = !L.some(e => e.kind === 'tree' && e.r[0] < 37 && e.r[2] > 27 && e.r[3] > M.gate[0] && e.r[1] < M.gate[1]);
        const binnen = !L.some(e => e.kind === 'tree' && e.r[2] > M.x0 && e.r[0] < M.x1 && e.r[3] > M.z0 && e.r[1] < M.z1);
        const view = O.VIEWPOS.length === 14 && !!document.querySelector('[data-v="13"]');
        return { gebouwd, vrij, binnen, view }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'sirenes: brandweer, ambulance en politie klinken verschillend', query: '?autostart', async run(p) {
      const r = await p.evaluate(() => { const A = OS.AudioSys, orig = A.tone, rec = []; A.tone = function (o) { rec.push(o); };
        const take = k => { rec.length = 0; A.siren(1, k); return rec.map(o => `${o.type || 'sine'}:${Math.round(o.f)}>${o.f2 ? Math.round(o.f2) : ''}@${o.delay || 0}`).join(' '); };
        const b = take('brandweer'), a = take('ambulance'), po = take('politie'); A.tone = orig;
        return { verschillend: new Set([b, a, po]).size === 3 && b.length > 0, wail: /640>1420/.test(a), b, a, po }; });
      assert(r.verschillend && r.wail, `sirenes: ${JSON.stringify(r)}`);
  } },
  { name: 'aanwijzen: gebouwen zonder apparaat (datacenter) geven geen fout bij hover en rondlopen', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(() => { const O = OS, c = O.VIEWS.SRV.center; O.camera.position.set(c.x, c.y + 40, c.z + 25); O.camera.lookAt(c); O.camera.updateMatrixWorld();
        const v = c.clone().project(O.camera), x = (v.x + 1) / 2 * innerWidth, y = (1 - v.y) / 2 * innerHeight; let fout = null, id;
        try { id = O.pickAt(x, y); } catch (e) { fout = e.message; } return { fout, id: id ?? null }; });
      assert(!r.fout && r.id !== 'SRV', `aanwijzen gaat mis: ${JSON.stringify(r)}`);
  } },
  { name: 'meetwagen rukt automatisch uit zodra de kabelfout gevonden en geïsoleerd is (instelling), en niet als hij uit staat', query: '?autostart&t=10', async run(p) {
      const r = await p.evaluate(async () => { const O = OS; T.quiet(); const sec = O.RING.secs.find(s => s.id === 'K23'), f = O.FEEDERS.find(x => x.id === 'F3');
        O.setAutoMeet(true); O.ringFault(f, sec, 200); sec.located = true; await T.step(2); const nietGeisoleerd = !sec.meas;
        O.isoSwitches(sec).forEach(id => O.D[id].state = 0); O.computeFlows(); await T.step(2); const auto = !!sec.meas;
        const sec2 = O.RING.secs.find(s => s.id === 'K78'); O.setAutoMeet(false); O.ringFault(O.FEEDERS.find(x => x.id === 'F1'), sec2, 200); sec2.located = true;
        O.isoSwitches(sec2).forEach(id => O.D[id].state = 0); O.computeFlows(); await T.step(3); const uit = !sec2.meas; O.setAutoMeet(true);
        return { nietGeisoleerd, auto, uit }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'stadsleven: weekmarkt, schoolplein, trein met overweg, bus met haltes (wacht bij een dichte overweg)', query: '?autostart&t=10&season=zomer', async run(p) {
      const r = await p.evaluate(async () => { const O = OS, tick = (s, dt = 0.1) => { for (let i = 0; i < s / dt; i++) O.cityTick(dt); };
        const zat = O.cityDay() === 6; tick(1); const markt = O.marketOn() && O.MARKET.visible && O.FIG.slice(0, 16).every(f => f.on);
        // trein: sprinter laten komen; overweg dicht als hij nadert, stopt bij het station
        const T = O.TRAIN; T.state = 'idle'; T.next = 0; tick(0.2); T.kind = 'sprinter'; T.dir = 1; T.z = 419.25; T.x = -700; T.v = 26; T.left = false; T.cars.forEach((c, i) => c.visible = i < 3);
        let dichtVoorStop = false, stopt = false; for (let i = 0; i < 900 && !stopt; i++) { O.cityTick(0.1); if (O.XING.closed) dichtVoorStop = true; if (T.state === 'stopt') stopt = true; }
        T.wait = 14; O.cityTick(0.1); const openAanPerron = !O.XING.closed; T.wait = 8; O.cityTick(0.1); const dichtBijVertrek = O.XING.closed;
        T.state = 'rijdt'; T.kind = 'intercity'; T.dir = -1; T.z = 424.25; T.x = 600; T.v = 36; T.left = false; T.cars.forEach(c => c.visible = true); let icDicht = false; for (let i = 0; i < 200 && !icDicht; i++) { O.cityTick(0.1); if (O.XING.closed && T.x > 30) icDicht = true; }
        const dicht = !dichtVoorStop && openAanPerron && dichtBijVertrek && icDicht;
        const perron = O.FIG.slice(25, 29).some(f => f.on) || stopt;
        // bus bij de overweg: wacht zolang de bomen dicht zijn
        const B = O.BUS; B.g ??= null; tick(0.2); B.on = true; B.idle = 0; B.v = 9; B.wait = 0; B.stops.forEach(s => s.done = true); B.d = 0;
        let d = 0; for (; d < 200; d += 1) { const [x, z] = O.routeAt(B.r, d); if (z < 440) break; } B.d = d - 6; O.XING.k = 1; O.XING.closed = true; const d0 = B.d;
        for (let i = 0; i < 30; i++) { O.XING.k = 1; O.driveVehicle(B, 0.1); } const wacht = O.routeAt(B.r, B.d + B.len / 2)[1] > 432.5;
        O.XING.k = 0; for (let i = 0; i < 40; i++) O.driveVehicle(B, 0.1); const verder = B.d > d0 + 8;
        // schoolplein op maandag in de ochtendpauze
        O.SIM.t = (48 + 10.33) * 60; tick(1); const school = O.schoolBreak() && O.FIG.slice(32).every(f => f.on && f.s < 0.7);
        return { zat, markt, dicht, stopt, perron, wacht, verder, school }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'kabeltracés: elke kabel een route langs de straat (niet door gebouwen), röntgenblik en kabeltablet', query: '?autostart&t=13', async run(p) {
      const r = await p.evaluate(() => { const O = OS, C = O.CABLES, BL = new Set(['house', 'apt', 'hall', 'small', 'kiosk']), bad = [];
        const at = (c, d) => { for (let i = 1; i < c.pts.length; i++) { const [ax, az] = c.pts[i - 1], [bx, bz] = c.pts[i], l = Math.hypot(bx - ax, bz - az); if (d <= l) return [ax + (bx - ax) * d / l, az + (bz - az) * d / l]; d -= l; } return c.pts[c.pts.length - 1]; };
        for (const c of C) { if (c.far) continue; for (let d = 6; d < c.len - 6; d += 1.5) { const [x, z] = at(c, d); if (O.LAYOUT.some(e => BL.has(e.kind) && x > e.r[0] + 0.2 && x < e.r[2] - 0.2 && z > e.r[1] + 0.2 && z < e.r[3] - 0.2)) { bad.push(c.id); break; } } }
        const ring = O.RING.secs.every(s => C.some(c => c.sec === s)), ls = O.LVG.filter(g => g.kind !== 'ovl').every(g => C.some(c => c.g === g)), feed = ['F5', 'F6', 'G4'].every(id => C.some(c => c.f?.id === id && !c.far && c.len > 100));
        O.setXray(true); const xr = O.XRAY.root.visible && O.XRAY.mats.size === C.length;
        O.openTablet(); const cv = document.querySelector('#gtMap'), K = C.find(c => c.kind === 'ring'), m = K.pts[Math.floor(K.pts.length / 2)];
        O.TAB.follow = false; O.TAB.cx = m[0]; O.TAB.cz = m[1]; O.TAB.zoom = 2; O.drawTablet();
        const rc = cv.getBoundingClientRect(); cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: rc.left + rc.width / 2, clientY: rc.top + rc.height / 2, bubbles: true }));
        cv.dispatchEvent(new PointerEvent('pointerup', { clientX: rc.left + rc.width / 2, clientY: rc.top + rc.height / 2, bubbles: true }));
        const info = document.querySelector('#gtInfo').textContent, tab = !document.querySelector('#gisTab').classList.contains('hidden') && /kabel/i.test(info) && /aangelegd \d{4}/.test(info);
        O.closeTablet(); O.setXray(false);
        return { bad: bad.length ? bad : true, ring, ls, feed, xr, tab, info: info.slice(0, 120) }; });
      for (const k of ['bad', 'ring', 'ls', 'feed', 'xr', 'tab']) assert(r[k] === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'kabels in het spel: foutplaats bepalen versnelt de reparatie, oude moffen geven vaker storing', query: '?autostart&t=10', async run(p) {
      const r = await p.evaluate(async () => { const O = OS; T.quiet(); const sec = O.RING.secs.find(s => s.id === 'K23'), c = O.cableOf(sec), f = O.FEEDERS.find(x => x.id === 'F3');
        O.ringFault(f, sec, 120); const t0 = O.SIM.t, spot = !!sec.spot && sec.repairAt > t0 + 100;
        const vroeg = (O.gisMeasure(c), !sec.meas);   // nog niet gevonden: meten mag niet
        sec.located = true; O.gisMeasure(c); const onder = !sec.meas;   // nog niet geïsoleerd
        O.isoSwitches(sec).forEach(id => O.D[id].state = 0); O.computeFlows(); O.gisMeasure(c); const meet = !!sec.meas;
        await T.step(12); const bekend = sec.spot.known && sec.repairAt < t0 + 60 && O.DIGS.has(sec.spot);
        await T.step(45); const klaar = !sec.fault && !O.DIGS.size && c.moffen.some(m => m.year === 2026);
        // ouderdom: een kabel met oude moffen weegt zwaarder
        const oud = { moffen: [{ year: 1975 }, { year: 1981 }] }, nieuw = { moffen: [{ year: 2015 }, { year: 2003 }] };
        const risk = O.cableRisk(oud) > O.cableRisk(nieuw) + 0.5;
        return { spot, vroeg, onder, meet, bekend, klaar, risk }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'graafwerk (KLIC): kabels aanwijzen voorkomt schade, graafschade geeft een storing op een bekende plek', query: '?autostart&t=10', async run(p) {
      const r = await p.evaluate(async () => { const O = OS; T.quiet(); const K = O.KLIC; K.jobs.length = 0; K.next = 1e9;
        const c1 = O.CABLES.find(c => c.id === 'K12'), j1 = O.klicNew(c1), melding = /KLIC-melding/.test(document.querySelector('#alarmList').textContent) && O.activeFaults().some(f => f.key === 'kl' + j1.id);
        O.klicMark(j1); await T.step(16); const aangewezen = j1.marked && !O.activeFaults().some(f => f.key === 'kl' + j1.id);
        const c2 = O.CABLES.find(c => c.id === 'K45'), j2 = O.klicNew(c2); j2.start = O.SIM.t + 1; j2.hitAt = O.SIM.t + 2; const rnd0 = Math.random; Math.random = () => 0.1;
        await T.step(4); Math.random = rnd0; const sec = c2.sec, schade = j2.hit && sec.fault && sec.located && sec.spot?.known && O.DIGS.has(sec.spot) && !O.DIGS.has(j2);
        return { melding, aangewezen, schade }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'moffen preventief vervangen: alleen spanningsloos, onder spanning brengen tijdens het werk is een veiligheidsincident', query: '?autostart&t=10', async run(p) {
      const r = await p.evaluate(async () => { const O = OS; T.quiet(); const c = O.CABLES.find(x => x.kind === 'ring' && x.sec.a && x.sec.b && x.moffen.some(m => m.year < 1990)) || O.CABLES.find(x => x.kind === 'ring' && x.sec.a && x.sec.b);
        c.moffen.forEach(m => m.year = 1978); if (!c.moffen.length) c.moffen.push({ d: 20, x: c.pts[1][0], z: c.pts[1][1], year: 1978 });
        O.gisMofReplace(c); const weiger = !c.work;
        const iso = O.isoSwitches(c.sec); iso.forEach(id => O.D[id].state = 0); O.computeFlows(); O.gisMofReplace(c); const bezig = !!c.work;
        await T.step(Math.ceil(c.work.until - O.SIM.t) + 2); const klaar = !c.work && c.moffen.every(m => m.year === 2026);
        c.moffen.forEach(m => m.year = 1978); O.gisMofReplace(c); const inc0 = O.SIM.incidents || 0; iso.forEach(id => O.D[id].state = 1); O.computeFlows(); await T.step(2);
        return { weiger, bezig, klaar, incident: (O.SIM.incidents || 0) > inc0 && !c.work }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'prestaties: wereld per zone samengevoegd en geculd, schaduw alleen bij beweging, automatische resolutie', query: '?autostart&t=12', async run(p) {
      const r = await p.evaluate(async () => { const O = OS, baked = []; O.scene.traverse(o => { if (o.userData.baked) baked.push(o); });
        const cull = baked.length > 50 && baked.every(o => o.frustumCulled && o.geometry.boundingSphere);
        const sm = O.renderer.shadowMap, lazy = sm.autoUpdate === false;
        const D = O.DYN, pr0 = O.renderer.getPixelRatio(); O.GFX.autoRes = true; Object.assign(D, { k: 1, low: 0, high: 0, t: 0, told: true, test: true });
        const win = fps => { for (let i = 0; i < fps / 2; i++) O.fpsTick(1 / fps); };
        for (let i = 0; i < 12; i++) win(20); const k1 = D.k, pr1 = O.renderer.getPixelRatio();
        for (let i = 0; i < 80; i++) win(60); const omlaag = k1 < 1 && pr1 < O.renderer.getPixelRatio(), omhoog = D.k === 1;
        O.GFX.autoRes = false; for (let i = 0; i < 12; i++) win(20); const uit = D.k === 1; D.test = false; O.renderer.setPixelRatio(pr0);
        return { cull, lazy, omlaag, omhoog, uit, n: baked.length }; });
      for (const [k, v] of Object.entries(r)) if (k !== 'n') assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'brand 10 kV: vlammen uit het dak, brandweerwagens en brandweerlieden, blussen na spanningsloos, alles weer weg', query: '?autostart&t=14', async run(p) {
      const r = await p.evaluate(async () => { const O = OS; T.quiet(); O.startIncident('brand', true); const F = O.FIRE;
        const start = F.on && F.flames.length > 10 && F.trucks.length === 2 && F.trucks.some(t => t.lad) && O.NPCS.filter(n => n.say === 'Brandweer').length === 4 && typeof O.AudioSys.fireBell === 'function' && typeof O.AudioSys.siren === 'function';
        await T.step(6); O.D['V-T1'].state = 0; O.D['V-T3'].state = 0; O.computeFlows(); await T.step(2);
        const blust = F.douseAt != null; await T.step(20); O.fireTick(0.02); const kleiner = F.k < 0.5;
        await T.step(15); const uit = !F.on && F.flames.length === 0 && !F.scorch && F.trucks.every(t => t.state !== 'come' && t.state !== 'park');
        return { start, blust, kleiner, uit }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'noodaggregaat voedt altijd alle huizen van één MS-station, ook op de koudste winteravond', query: '?autostart&lite&t=18&season=winter', async run(p) {
      const r = await p.evaluate(() => { const O = OS; T.quiet(); O.WX.cur.dT = -12; let worst = 0, at = '';
        for (let m = 16 * 60; m < 22 * 60; m += 10) { O.SIM.t = m; O.computeFlows();
          for (const s of O.RING.stations) { const L = s.groups.filter(g => g.kind === 'res' || g.kind === 'ovl').reduce((a, g) => a + Math.max(0, g.demand || 0) / (g.clp || 1), 0) / O.gsCap(); if (L > worst) { worst = L; at = s.id; } } }
        return { worst: +worst.toFixed(2), at }; });
      assert(r.worst <= 1, `huizen van ${r.at} vragen ${Math.round(r.worst * 100)}% van het aggregaat`);
  } },
  { name: 'zonnepark: alleen overdag een overstroomfout; grote incidenten niet dubbel in Lopende storingen', query: '?autostart&lite&t=1&season=zomer', async run(p) {
      const r = await p.evaluate(() => { const O = OS; T.quiet(); const g1 = O.FEEDERS.find(f => f.id === 'G1');
        const count = h => { O.SIM.t = h * 60; O.computeFlows(); let n = 0; for (let i = 0; i < 400; i++) { O.feederFault(); if (g1.fault) n++; O.FEEDERS.forEach(f => { f.fault = null; O.D[f.cb].state = 1; }); O.RING.secs.forEach(s => s.fault = false); O.computeFlows(); } return n; };
        const nacht = count(1), dag = count(13);
        O.startIncident('storm', true); const inc = O.activeFaults().some(f => f.key === 'inc' || /incident/i.test(f.title));
        return { nacht, dag, inc }; });
      assert(r.nacht === 0, `zonnepark kreeg 's nachts ${r.nacht} keer een overstroomfout`);
      assert(r.dag > 0, 'zonnepark kreeg overdag nooit een fout');
      assert(!r.inc, 'groot incident staat ook in Lopende storingen');
  } },
  { name: 'voetgangers lopen over de stoepen (meer overdag dan s nachts)', query: '?autostart&t=12&season=zomer', async run(p) {
      await new Promise(r => setTimeout(r, 1500));
      const r = await p.evaluate(async () => { const O = OS; O.camera.position.set(-40, 30, 200); O.controls.target.set(-40, 0, 240); O.controls.update(); await T.sleep(800);
        const st = O.LAYOUT.filter(e => e.kind === 'stoep'), dag = O.walkActive(), W = O.getWalkers();
        const off = W.slice(0, dag).filter(w => !w.cross && !st.some(e => w.x >= e.r[0] - 0.05 && w.x <= e.r[2] + 0.05 && w.z >= e.r[1] - 0.05 && w.z <= e.r[3] + 0.05)).length;
        O.SIM.t = 3 * 60; await T.sleep(500); return { dag, off, nacht: O.walkActive() }; });
      assert(r.dag >= 20, `overdag maar ${r.dag} voetgangers`);
      assert(r.off === 0, `${r.off} voetgangers naast de stoep`);
      assert(r.nacht < r.dag / 3, `'s nachts nog ${r.nacht} voetgangers`);
  } },
  { name: 'kleine afnemers in de wijk: elk aan een eigen LS-groep, lichten uit bij spanningsloos, wereld compact', query: '?autostart&t=22&season=winter', async run(p) {
      const r = await p.evaluate(async () => { const O = OS; O.updateSmall();
        const named = O.SMALL.filter(e => !e.g).map(e => e.name), E = O.SMALL.find(e => e.name === 'Basisschool De Linde'), H = O.SMALL.find(e => e.name === 'Huisartsenpost');
        const lit = E.signs[0].color.r > 0.9 && H.glow[0].opacity > 0.3 && E.lampMat.emissiveIntensity > 0;
        O.D[E.g.id].state = 0; O.computeFlows(); O.updateSmall();
        const uit = E.signs[0].color.r < 0.3 && E.glow.every(m => m.opacity === 0) && E.lampMat.emissiveIntensity === 0 && H.glow[0].opacity > 0.3;
        O.D[E.g.id].state = 1; O.computeFlows(); O.updateSmall(); const terug = E.signs[0].color.r > 0.9;
        const far = Math.max(...['zkh', 'rwzi'].map(k => Math.hypot(O.SITE[k].x, O.SITE[k].z)), O.SITE.kassen.x0);
        return { named: named.length === 0 ? true : named, aantal: O.SMALL.length >= 16, lit, uit, terug, compact: far < 500, layout: O.layoutCheck().length === 0 }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'afnemers in de wereld: ziekenhuis, kassen en waterzuivering tonen of ze stroom hebben', query: '?autostart&t=22&season=winter', async run(p) {
      const r = await p.evaluate(() => { T.quiet(); const O = OS, S = O.SITE; O.SIM.paused = false; T.step(0.2); O.updateSites(0.1);
        const aan = { zkh: S.zkh.glow[0].opacity > 0.5, kassen: S.kassen.glow[0].opacity > 0.3, rwzi: S.rwzi.lamp.emissiveIntensity > 1 };
        for (const cb of ['V-F5', 'V-F6', 'W-G4']) O.D[cb].state = 0; O.computeFlows(); O.updateSites(0.1);
        const uit = { zkh: S.zkh.glow[0].opacity < 0.1 && !S.zkh.on, kassen: S.kassen.glow[0].opacity === 0, rwzi: S.rwzi.lamp.emissiveIntensity === 0 };
        return { aan, uit }; });
      assert(Object.values(r.aan).every(Boolean) && Object.values(r.uit).every(Boolean), `afnemers tonen hun toestand niet: ${JSON.stringify(r)}`);
  } },
  { name: 'weer en tijd tijdens de simulatie: weer kiezen, bui laten overtrekken, doorspoelen (stopt bij een storing), minder regen', query: '?autostart&t=11&season=zomer', async run(p) {
      const r = await p.evaluate(async () => { const O = OS; T.quiet(); O.openWT(); const bar = document.querySelector('#pvBar'), click = sel => bar.querySelector(sel).click();
        click('[data-wt="onweer"]'); const gekozen = O.WX.type === 'onweer' && O.WX.lock && !O.SIM.paused;
        O.setWeather('onweer', true, true); O.updateHUD(); const knop = !document.querySelector('#wxSkip').classList.contains('hidden');
        O.openWT(); O.closeWT(); O.openWT(); click('[data-wt="skip"]'); const over = !O.wetNow() && !O.WX.lock && O.WX.cur.thunder === 0;
        click('[data-wt="auto"]'); const auto = !O.WX.lock;
        const t0 = O.SIM.t; click('[data-ff="60"]'); for (let i = 0; i < 200 && O.FF.to != null; i++) await T.sleep(50); const door = O.SIM.t >= t0 + 59.9 && O.SIM.t < t0 + 62 && O.FF.to == null;
        O.ffStart(180); const t1 = O.SIM.t; await T.sleep(100); O.pushAlarm('test: storing', 'crit'); for (let i = 0; i < 40 && O.FF.to != null; i++) await T.sleep(50); const stop = O.FF.to == null && O.SIM.t < t1 + 170;
        // minder regen en onweer in de zomer
        let nat = 0; for (let i = 0; i < 20000; i++) if (['regen', 'onweer'].includes(O.pickWeather())) nat++;
        O.closeWT(); return { gekozen, knop, over, auto, door, stop, nat: nat / 20000 < 0.12 ? true : nat / 20000 }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'weer en tijd bekijken: klok schuiven en weer kiezen zonder de simulatie te raken', query: '?autostart&t=11&season=zomer', async run(p) {
      await p.keyboard.press('t');
      const r = await p.evaluate(() => { const O = OS, venster = !document.querySelector('#pvBar').classList.contains('hidden') && !O.getPreview() && !O.SIM.paused; document.querySelector('#pvBar [data-pv="view"]').click();
        const t0 = O.SIM.t, wx0 = O.WX.type, open = venster && !!O.getPreview() && O.SIM.paused;
        const sl = document.querySelector('#pvBar [data-pvh]'); sl.value = '22'; sl.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('#pvBar [data-pvwx="sneeuw"]').click(); const se = document.querySelector('#pvBar [data-pvs]'); se.value = 'winter'; se.dispatchEvent(new Event('change', { bubbles: true }));
        const kijk = Math.abs(O.viewHour() - 22) < 0.1 && Math.abs(O.SIM.t - t0) < 0.01 && O.WX.type === 'sneeuw';
        O.computeFlows(); const simEcht = Math.abs((O.SIM.t / 60) % 24 - 11) < 0.1;
        document.querySelector('#pvBar [data-pv="back"]').click(); const nogOpen = !document.querySelector('#pvBar').classList.contains('hidden'); O.closeWT();
        return { open, kijk, simEcht, nogOpen, terug: O.WX.type === wx0 && Math.abs(O.viewHour() - O.SIM.t / 60 % 24) < 0.01 && !O.getPreview(), seizoen: O.GAME.season === 'zomer', loopt: !O.SIM.paused, dicht: document.querySelector('#pvBar').classList.contains('hidden') }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'muisbesturing overzicht: kaart/klassiek, zoomen naar de muis, toetsen schuiven, grenzen, dubbelklik', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(async () => { const O = OS, c = O.controls, M = { ROTATE: 0, DOLLY: 1, PAN: 2 };
        localStorage.removeItem('osz-mouse'); O.setMouseMode('kaart');
        const kaart = c.mouseButtons.LEFT === M.PAN && c.mouseButtons.RIGHT === M.ROTATE && c.zoomToCursor && !c.screenSpacePanning;
        O.setMouseMode('klassiek'); const klassiek = c.mouseButtons.LEFT === M.ROTATE && c.mouseButtons.RIGHT === M.PAN && localStorage.getItem('osz-mouse') === 'klassiek'; O.setMouseMode('kaart');
        const t0 = c.target.clone(); O.OVK.KeyW = true; O.cameraKeys(0.1); O.OVK.KeyW = false; const toets = c.target.distanceTo(t0) > 1 && Math.abs(c.target.y - t0.y) < 1e-6;
        c.target.set(5000, 80, 5000); O.camera.position.set(5010, 120, 5010); await T.sleep(300); const grens = c.target.x <= 1300 && c.target.z <= 1300 && c.target.y <= 30;
        const v = O.VIEWPOS[0]; O.camera.position.copy(v[0]); c.target.copy(v[1]); c.update(); await T.sleep(200);
        const cv = document.querySelector('canvas'), rc = cv.getBoundingClientRect(), d0 = O.camera.position.distanceTo(c.target);
        cv.dispatchEvent(new MouseEvent('dblclick', { clientX: rc.left + rc.width * 0.5, clientY: rc.top + rc.height * 0.62, bubbles: true }));
        await T.sleep(1600); const dubbel = O.camera.position.distanceTo(c.target) < d0 * 0.8;
        return { kaart, klassiek, toets, grens, dubbel }; });
      for (const [k, v] of Object.entries(r)) assert(v === true, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'leven in de wijk: ramen per station, auto\'s en buren bij uitval', query: '?autostart&t=21&night&season=winter', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); const O = OS, s1 = O.RING.stations[0]; O.SIM.paused = false; T.step(0.2); O.updateWindows();
        const aan = s1.winMats.some(m => m.opacity > 0.3), autos = O.CARS.filter(c => c.g.visible).length;
        O.D['V-F3'].state = 0; O.computeFlows(); T.step(5); O.updateWindows(); O.updateLife(0.1);
        return { aan, uit: s1.winMats.every(m => m.opacity === 0), anderAan: O.RING.stations.filter(s => s.ring !== s1.ring).some(s => [...(s.winMats || []), ...(s.winApt || [])].some(m => m.opacity > 0.3)), autos, buren: (s1.crowd || []).length }; });
      for (const [k, v] of Object.entries(r)) assert(v, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  ...[['pinksteren', 'overspanning in de woonwijk', () => { for (let k = 0; k < 36; k++) T.step(5); return (OS.GAME.stats.pvTrips || 0) > 30 || !OS.LVG.every(g => !g.U || g.U <= 253); }],
    ['aardonweer', 'een aardfout die niet vanzelf verdwijnt', () => { for (let k = 0; k < 12; k++) T.step(5); return OS.GAME.obj[0].state === 'fail' && !!OS.EF.on; }],
    ['kraan', 'importgrens L2', () => { T.step(95); return OS.FLOW.P110 > OS.GAME.flags.lineLimit || (OS.GAME.flags.overMin || 0) > 5; }],
    ['evenement', 'MS6 overbelast', () => { T.step(80); const s = OS.RING.stations.find(x => x.id === 'MS6'); return OS.GAME.stats.fuses > 0 || s.trLoad > 1.2; }],
    ['laadpiek', 'congestie in de woonwijk', () => { T.step(110); return OS.GAME.stats.fuses > 0 || OS.RING.stations.some(s => s.trLoad > 1.2) || OS.RING.secs.some(s => s.load > 1); }]]
    .map(([id, wat, f]) => ({ name: `scenario ${id}: zonder ingrijpen ontstaat ${wat}`, query: `?play=${id}`, async run(p) {
      const r = await p.evaluate(`(${f.toString()})()`); assert(r === true, `geen uitdaging: ${wat} treedt niet op`); } })),
  { name: 'instellingen: prestaties, weer, geluid en tabblad Kabels', query: '?autostart&t=18', async run(p) {
      const r = await p.evaluate(() => { const O = OS, $ = q => document.querySelector(q); O.openSettings();
        O.setGfx('preset', 'laag'); const laag = O.GFX.fps === 30 && O.GFX.shadows === 'uit' && !O.GFX.life && JSON.parse(localStorage.getItem('osz-gfx')).preset === 'laag';
        $('#settings [data-wx="sneeuw"]').click(); const weer = O.WX.type === 'sneeuw' && O.WX.lock;
        $('#settings [data-wx="auto"]').click(); const auto = !O.WX.lock;
        const sl = $('#settings [data-av="alarm"]'); sl.value = '0.3'; sl.dispatchEvent(new Event('input', { bubbles: true }));
        const geluid = O.AudioSys.busVol.alarm === 0.3 && JSON.parse(localStorage.getItem('osz-audio')).alarm === 0.3;
        O.closeSettings(); O.setGfx('preset', 'hoog'); O.setTab('K'); O.renderCables();
        return { laag, weer, auto, geluid, rijen: document.querySelectorAll('#cabG .cab').length, dicht: $('#settings').classList.contains('hidden') }; });
      for (const [k, v] of Object.entries(r)) if (k !== 'rijen') assert(v, `${k} klopt niet: ${JSON.stringify(r)}`);
      assert(r.rijen === 29, `tabblad Kabels toont ${r.rijen} rijen in plaats van 29`);
  } },
  { name: 'vrije dienst: incidenten starten vanzelf', query: '?autostart&t=10', async run(p) {
      const r = await p.evaluate(() => { const O = OS; O.SIM.nextEvent = 1e9; O.SIM.nextTaskAt = 1e9; O.SIM.paused = false; T.step(0.5); O.INC.next = O.SIM.t;
        T.step(0.5); return { actief: O.INC.active?.def.id || null, kop: !!document.querySelector('#taskBody .gh.inc') || (O.renderTasks?.(), !!document.querySelector('#taskBody .gh.inc')) }; });
      assert(r.actief, 'er startte geen incident');
  } },
  ...['zkh', 'storm', 'dubbel', 'hitte', 'aanrijding', 'cyber', 'water', 'zon', 'kraan', 'brand', 'datacenter', 'concert', 'laden', 'blackout'].map(id => ({ name: `incident ${id}: start en ruimt zichzelf op`, query: '?autostart&t=17.5', async run(p) {
    const r = await p.evaluate(id => { const O = OS, D = O.D; O.SIM.nextEvent = 1e9; O.SIM.nextTaskAt = 1e9; O.SIM.paused = false; T.step(0.3);
      const base = O.LVG.map(g => g.base).join(), g1 = O.FEEDERS.find(f => f.id === 'G1').base;
      const ok = O.startIncident(id, true); const actief = !!O.INC.active; T.step(0.5);
      for (let k = 0; k < 60 && O.INC.active; k++) T.step(5);
      return { ok, actief, klaar: !O.INC.active, scada: !O.GAME.flags.scadaDown, brand: !O.FIRE.on, leds: O.SVM.led.opacity === 1, grens: !O.GAME.flags.lineLimit, dicht: !(O.GAME.flags.mustOpen || []).length,
        belast: O.LVG.map(g => g.base).join() === base && O.FEEDERS.find(f => f.id === 'G1').base === g1, stations: O.RING.stations.every(s => !s.damaged && !s.evac),
        lijnen: O.SIM.lines.L1.avail && O.SIM.lines.L2.avail, koeling: !D.T1.fanFail, flex: !O.FLEX.some(f => f.id === 'MS6-G2') }; }, id);
    for (const [k, v] of Object.entries(r)) assert(v, `${k} klopt niet: ${JSON.stringify(r)}`);
  } })),
  { name: 'SCADA-tabbladen lichten op bij een storing', query: '?autostart&t=11', async run(p) {
      const r = await p.evaluate(() => { T.quiet(); const O = OS, aan = () => [...document.querySelectorAll('#sldTabs button.alarm')].map(b => b.dataset.t).join(','); O.SIM.paused = false; T.step(0.3); O.updateTabAlarms();
        const rust = aan(); O.feederFault('F6', 10); T.step(0.2); O.updateTabAlarms(); const f6 = aan();
        O.ringFault(O.FEEDERS.find(f => f.id === 'F3'), O.RING.secs.find(s => s.id === 'K23'), 30); T.step(0.2); O.updateTabAlarms(); const ring = aan();
        O.busFault('RD', 20); T.step(0.2); O.updateTabAlarms(); const rail = aan(); const tip = document.querySelector('#sldTabs button[data-t="20"]').title;
        return { rust, f6, ring, rail, tip }; });
      assert(r.rust === '', `tabbladen lichten op zonder storing: ${r.rust}`);
      assert(r.f6 === '10', `kabelfout F6 moet alleen 10 kV laten oplichten: ${r.f6}`);
      assert(r.ring === '10,R', `ringfout moet ook Ring laten oplichten: ${r.ring}`);
      assert(r.rail === '10,20,R' && /railfout rail C2/.test(r.tip), `railfout C2: ${r.rail} · ${r.tip}`);
  } },
  { name: 'kabeltemperatuur: kort overbelasten mag, lang niet', query: '?autostart&t=16.5&season=winter', async run(p) {
      const r = await p.evaluate(() => { T.quiet(); const O = OS, s = O.RING.secs.find(x => x.id === 'K12'); O.SIM.paused = false; T.step(0.5);
        const t0 = s.temp, rate0 = s.rate; s.rate = s.I / 1.4; T.step(10); const kort = { temp: Math.round(s.temp), heel: !s.fault && !O.GAME.stats.burn };
        T.step(70); return { t0: Math.round(t0), kort, lang: { burn: O.GAME.stats.burn || 0 }, normaal: t0 < 70 }; });
      assert(r.normaal, `kabel te warm in de normale toestand: ${r.t0} °C`);
      assert(r.kort.heel && r.kort.temp > r.t0 && r.kort.temp < 105, `na 10 min 140%: ${JSON.stringify(r.kort)}`);
      assert(r.lang.burn > 0, 'kabel brandde niet door na langdurige overbelasting');
  } },
  { name: 'OS Meppel: eigen velden, koppelkabel en geen parallelbedrijf', query: '?autostart&t=18', async run(p) {
      const r = await p.evaluate(async () => { T.quiet(); const O = OS, D = O.D, EN = () => O.EN(); O.SIM.paused = false; T.step(0.5);
        const klanten = EN().has('MP1') && EN().has('MP2'), model = O.checkModel(true).length === 0; O.operate('MS5-K', 1); const weigert = D['MS5-K'].state === 0;
        await T.op('V-F4', 0); await T.op('MS4-R', 0); T.step(0.2); await T.op('MS5-K', 1); T.step(0.3); const terug = EN().has('M5') && O.FD('MP3').P > 0.3;
        await T.op('MS4-R', 1); await T.op('V-F4', 1); T.step(0.5); const afgeschakeld = D['M-MP3'].state === 0;
        O.meppelFault(); T.step(0.2); O.updateTabAlarms(); const tab = document.querySelector('#sldTabs [data-t="M"]').classList.contains('alarm') && !EN().has('MP1');
        return { klanten, weigert, terug, afgeschakeld, tab, model }; });
      for (const [k, v] of Object.entries(r)) assert(v, `${k} klopt niet: ${JSON.stringify(r)}`);
  } },
  { name: 'opslaan en later verder spelen', query: '?play=free&t=11', async run(p) {
      const voor = await p.evaluate(async () => { T.quiet(); const O = OS, D = O.D; O.closeHandover?.(); O.SIM.paused = false; T.step(1);
        await T.op('V-F6', 0); O.startTask('stationTask', 'MS2'); T.step(9); O.feederFault('F5', 30); O.ringFault(O.FEEDERS.find(f => f.id === 'F3'), O.RING.secs.find(s => s.id === 'K23'), 60);
        O.D['V-F2'].wear = 0.9; O.setFlex('MS5-G2', 1); O.GAME.score = 1234; T.step(1); const ok = O.saveGame(true);
        return { ok, t: Math.round(O.SIM.t), f6: D['V-F6'].state, task: O.task().code + '/' + O.task().i + '/' + O.task().title, f5: O.FEEDERS.find(f => f.id === 'F5').fault?.stage,
          k23: O.RING.secs.find(s => s.id === 'K23').fault, score: Math.round(O.GAME.score), wear: D['V-F2'].wear, flex: O.FLEX.find(f => f.id === 'MS5-G2').req, rec: O.REC.samples.length }; });
      assert(voor.ok, 'opslaan mislukt');
      await p.goto(pageUrl + '?resume&lite', { waitUntil: 'load', timeout: 180000 });
      for (let i = 0; i < 120 && !(await p.evaluate(() => !!window.OS)); i++) await sleep(500);
      await p.evaluate(PAGE_HELPERS);
      const na = await p.evaluate(() => { const O = OS, D = O.D;
        return { t: Math.round(O.SIM.t), f6: D['V-F6'].state, task: O.task() ? O.task().code + '/' + O.task().i + '/' + O.task().title : null, f5: O.FEEDERS.find(f => f.id === 'F5').fault?.stage,
          k23: O.RING.secs.find(s => s.id === 'K23').fault, score: Math.round(O.GAME.score), wear: D['V-F2'].wear, flex: O.FLEX.find(f => f.id === 'MS5-G2').req, rec: O.REC.samples.length,
          menu: document.querySelector('#intro').classList.contains('hidden'), loopt: !O.SIM.paused, mode: O.GAME.mode }; });
      assert(Math.abs(na.score - voor.score) <= 5 && Math.abs(na.t - voor.t) <= 1, `score/tijd wijken af: ${na.score}/${na.t} ≠ ${voor.score}/${voor.t}`);   // het spel liep nog even door na het opslaan
      for (const k of ['f6', 'task', 'f5', 'k23', 'wear', 'flex']) assert(JSON.stringify(na[k]) === JSON.stringify(voor[k]), `${k} na hervatten ${JSON.stringify(na[k])} ≠ ${JSON.stringify(voor[k])}`);
      assert(na.rec >= voor.rec && na.menu && na.loopt && na.mode === 'free', `hervatten niet compleet: ${JSON.stringify(na)}`);
      const later = await p.evaluate(() => { const O = OS; for (let k = 0; k < 30; k++) T.step(5); return { f5: !O.FEEDERS.find(f => f.id === 'F5').fault, k23: !O.RING.secs.find(s => s.id === 'K23').fault }; });
      assert(later.f5 && later.k23, `storingen worden na hervatten niet meer gerepareerd: ${JSON.stringify(later)}`);
  } },
  { name: 'Esc opent pauzemenu en pauzeert', query: '?autostart', async run(p) {
      await p.keyboard.press('Escape'); await sleep(800);
      const r = await p.evaluate(() => ({ menu: !document.querySelector('#pauseMenu').classList.contains('hidden'), paused: OS.SIM.paused }));
      assert(r.menu && r.paused, `menu ${r.menu}, pauze ${r.paused}`);
  } },
];

// parallel: elke werker heeft een eigen browser (achtergrondtabbladen in één browser krijgen afgeremde timers)
const todo = TESTS.filter(t => !only || t.name.includes(only));
const jobs = Math.max(1, Math.min(todo.length, +process.env.TEST_JOBS || (process.env.CI ? 2 : Math.min(3, Math.max(1, Math.floor(os.cpus().length / 4))))));
const launch = () => puppeteer.launch({ executablePath: chrome, headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--window-size=1280,800',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--num-raster-threads=1', '--renderer-process-limit=2', '--disable-gpu-compositing', '--disable-gpu-rasterization', '--disable-accelerated-2d-canvas', '--mute-audio', '--disable-extensions'],
  defaultViewport: { width: 1280, height: 800 } });
let failed = 0, next = 0;
const tStart = Date.now();
console.log(`${todo.length} test(s) met ${jobs} parallelle werker(s)\n`);
await Promise.all(Array.from({ length: jobs }, async (_, w) => {
  await sleep(w * 4000);   // werkers na elkaar laten starten: het opbouwen van de 3D-wereld is het zwaarste moment
  const browser = await launch();
  while (next < todo.length) {
    const t = todo[next++], t0 = Date.now(), seed = seedOf(t.name);
    let page, errors = [];
    try {
      ({ page, errors } = await openPage(browser, t.query, seed));
      await t.run(page);
      assert(errors.length === 0, 'paginafouten: ' + errors.join(' | '));
      console.log(`✓ ${t.name} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    } catch (e) {
      failed++; console.log(`✗ ${t.name}\n    ${e.message}\n    (seed ${seed} – herhalen: TEST_SEED=${seed} npm test -- "${t.name.slice(0, 30)}")`);
    } finally { if (page) await page.close().catch(() => {}); }
  }
  await browser.close();
}));
console.log(`\n${failed ? `${failed} test(s) mislukt` : 'Alle tests geslaagd'} in ${((Date.now() - tStart) / 1000).toFixed(0)} s`);
process.exit(failed ? 1 : 0);
