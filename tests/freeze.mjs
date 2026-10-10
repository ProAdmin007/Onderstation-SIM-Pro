// Speelt de vrije dienst mét 3D-beeld (zonder ?lite) en vuurt storingen af: loopt de hoofdlus vast of komt er een paginafout?
// Gebruik: node tests/freeze.mjs [minuten-echte-tijd]
import puppeteer from 'puppeteer-core';
import path from 'path';
import { existsSync } from 'fs';
import { pathToFileURL, fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chrome = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => existsSync(p));
const mins = +process.argv[2] || 3;
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', protocolTimeout: 600000,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--window-size=1280,800', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 4).join(' | ')));
page.on('console', async m => { if (m.type() !== 'error') return; let st = ''; try { st = await m.args()[1]?.evaluate(e => e.stack); } catch (e) {} errors.push('console: ' + m.text().slice(0, 200) + (st ? ' STACK ' + st : '')); });
await page.goto(pathToFileURL(path.join(root, 'index.html')).href + '?play=free&t=11', { waitUntil: 'load', timeout: 180000 });
for (let i = 0; i < 120 && !(await page.evaluate(() => !!window.OS)); i++) await new Promise(r => setTimeout(r, 500));
await page.evaluate((norender) => { OS.closeHandover?.(); OS.SIM.paused = false; OS.SIM.speed = 60;
  if (norender) OS.renderer.render = () => {};   // alleen de JS-kosten per beeld meten
  window.__fr = 0; window.__worst = 0; let prev = performance.now(); const tick = () => { const n = performance.now(); window.__worst = Math.max(window.__worst, n - prev); prev = n; window.__fr++; requestAnimationFrame(tick); }; requestAnimationFrame(tick); }, !!process.env.NORENDER);
const end = Date.now() + mins * 60000; let last = null, stuck = 0, k = 0;
while (Date.now() < end) {
  await new Promise(r => setTimeout(r, 3000));
  let s;
  try { s = await Promise.race([page.evaluate((k) => { const O = OS;
      // af en toe een storing erbij, zoals in een drukke vrije dienst
      // plus wat een speler doet: camera, selecteren, tabbladen, vensters, telefoon
      const ids = Object.keys(O.D), pk = a => a[Math.floor(Math.random() * a.length)];
      const acts = [() => { const f = pk(['randomEvent', 'feederFault', 'busFault', 'meppelFault', 'lvFault']); (O[f] || window[f])?.(); },
        () => { if (!O.INC.active) O.startIncident(pk(O.INCIDENTS).id, true); },
        () => document.dispatchEvent(new KeyboardEvent('keydown', { key: String(1 + Math.floor(Math.random() * 9)), bubbles: true })),
        () => O.selectDevice(pk(ids)), () => O.setTab(pk(['10', '20', 'R', 'M', 'K', 'P'])),
        () => { O.openFlex(); O.closeFlex?.(); }, () => { O.openProt(); O.closeProt?.(); },
        () => { const c = O.PHONE.queue[0]; if (c) { O.PHONE.cur = c; O.phoneAnswer(pk(['known', 'own'])); } },
        () => { if (O.SIM.paused) O.SIM.paused = false; },
        () => { O.openLS(pk(O.RING.stations).id); O.renderLS(); O.closeLS(); }, () => O.setTab('L'),
        () => O.gsSend(pk(O.RING.stations)), () => { const d = pk([...O.LS_LINKS, ...O.LVG.map(g => O.D[g.id])]); O.lsSwitchOrder(d.id, d.state ? 0 : 1); }];
      try { pk(acts)(); pk(acts)(); } catch (e) { return { err: 'actie: ' + e.stack }; }
      const r = { t: Math.round(O.SIM.t), inc: O.INC.active?.def.id || '-', off: O.SIM.off, fps: Math.round(window.__fr / 3), worstMs: Math.round(window.__worst), heapMB: Math.round((performance.memory?.usedJSHeapSize || 0) / 1e6), scene: O.scene?.children.length, npcs: O.NPCS?.length, fx: O.FX?.length, dom: document.getElementsByTagName('*').length, timers: O.SIM.timers?.length, rec: O.REC?.samples?.length, loopErr: [...(window.LOOP_ERR || new Map()).keys()].join(' ## ') };
      window.__fr = 0; window.__worst = 0; return r; }, k++),
    new Promise((_, rej) => setTimeout(() => rej(new Error('evaluate hangt (hoofdthread bezet)')), 20000))]); }
  catch (e) { console.log('✗', e.message); errors.push(e.message); break; }
  console.log(JSON.stringify(s));
  if (last != null && s.t === last && !s.paused) { if (++stuck >= 2) { errors.push('SIM.t staat stil op ' + s.t); break; } } else stuck = 0;
  last = s.t;
  if (s.loopErr) { errors.push('lusfout: ' + s.loopErr); break; }
  if (errors.length) break;
}
console.log(errors.length ? 'FOUTEN:\n' + [...new Set(errors)].join('\n') : 'geen vastloper of paginafout');
await browser.close();
process.exit(errors.length ? 1 : 0);
