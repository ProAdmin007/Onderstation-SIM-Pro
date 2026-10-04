// Automatische tests voor de Onderstation Simulator.
// Start index.html in headless Chrome (software-rendering) en stuurt de simulatie via window.OS.
// Gebruik: npm test   (optioneel CHROME_PATH=/pad/naar/chrome)
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';

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
    async op(id,to){ const O=window.OS,d=O.D[id]; if(d.state===to) return true; if(d.springAt>performance.now()) await T.sleep(d.springAt-performance.now()+50); for(let i=0;d.busy&&i<60;i++) await T.sleep(100);
      O.operate(id,to); const r=document.querySelector('#radio'); if(!r.classList.contains('hidden')){ r.querySelector('[data-rd="meld"]').click(); await T.sleep(1700); } return d.state===to; },
  };`;

async function openPage(browser, query) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
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
          f.rate = f.P / 1.6; T.step(min); return { uit: O.D['V-F6'].state === 0, schade: !!f.fault }; };
        const standaard = run(1.3, 1, 9), ruim = run(1.5, 2, 12);
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
  ...['les1', 'les2', 'les3', 'les4', 'les5'].map(les => ({ name: `leerscenario ${les} is uit te spelen`, query: `?play=${les}`, async run(p) {
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
        return { omgezet, bDood, geweigerd1, geweigerd2, klaar: !O.task(), maxOff, normaal: rail('F5') === 'RB' && D['V-K'].state === 1 }; });
      for (const [k, v] of Object.entries(r)) if (k !== 'maxOff') assert(v, `${k} klopt niet: ${JSON.stringify(r)}`);
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
  { name: 'Esc opent pauzemenu en pauzeert', query: '?autostart', async run(p) {
      await p.keyboard.press('Escape'); await sleep(800);
      const r = await p.evaluate(() => ({ menu: !document.querySelector('#pauseMenu').classList.contains('hidden'), paused: OS.SIM.paused }));
      assert(r.menu && r.paused, `menu ${r.menu}, pauze ${r.paused}`);
  } },
];

// parallel: elke werker heeft een eigen browser (achtergrondtabbladen in één browser krijgen afgeremde timers)
const todo = TESTS.filter(t => !only || t.name.includes(only));
const jobs = Math.max(1, Math.min(todo.length, +process.env.TEST_JOBS || Math.min(4, Math.floor(os.cpus().length / 2))));
const launch = () => puppeteer.launch({ executablePath: chrome, headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--window-size=1280,800',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  defaultViewport: { width: 1280, height: 800 } });
let failed = 0, next = 0;
const tStart = Date.now();
console.log(`${todo.length} test(s) met ${jobs} parallelle werker(s)\n`);
await Promise.all(Array.from({ length: jobs }, async () => {
  const browser = await launch();
  while (next < todo.length) {
    const t = todo[next++], t0 = Date.now();
    let page, errors = [];
    try {
      ({ page, errors } = await openPage(browser, t.query));
      await t.run(page);
      assert(errors.length === 0, 'paginafouten: ' + errors.join(' | '));
      console.log(`✓ ${t.name} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    } catch (e) {
      failed++; console.log(`✗ ${t.name}\n    ${e.message}`);
    } finally { if (page) await page.close().catch(() => {}); }
  }
  await browser.close();
}));
console.log(`\n${failed ? `${failed} test(s) mislukt` : 'Alle tests geslaagd'} in ${((Date.now() - tStart) / 1000).toFixed(0)} s`);
process.exit(failed ? 1 : 0);
