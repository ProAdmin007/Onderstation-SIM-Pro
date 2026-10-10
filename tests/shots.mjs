// Screenshots van de wijk met het echte 3D-beeld (voor het beoordelen van de vormgeving).
// Gebruik: node tests/shots.mjs [map]   → schrijft woonwijk-lucht.png, straat-*.png, centrum.png
import puppeteer from 'puppeteer-core';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { pathToFileURL, fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || path.join(root, 'shots'));
mkdirSync(out, { recursive: true });
const chrome = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => existsSync(p));
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', protocolTimeout: 600000,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--window-size=1280,720', '--mute-audio'],
  defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto(pathToFileURL(path.join(root, 'index.html')).href + '?autostart&t=' + (process.env.T || '14') + (process.env.Q || ''), { waitUntil: 'load', timeout: 180000 });
for (let i = 0; i < 120 && !(await page.evaluate(() => !!window.OS)); i++) await new Promise(r => setTimeout(r, 500));
await page.evaluate(() => { OS.SIM.paused = true; document.querySelectorAll('#scada,#tasks,#alarms,#devpanel,#hud,nav,header,#notice').forEach(e => e && (e.style.display = 'none')); });
// [naam, camerapositie, kijkpunt]
const views = [['woonwijk-lucht', [-20, 70, 60], [-40, 0, 170]], ['straat-woonwijk', [-97, 1.7, 112], [-97, 1.5, 200]], ['straat-zijkant', [-60, 1.7, 101], [20, 2, 101]],
  ['straat-oost', [63, 1.7, 110], [63, 2, 200]], ['centrum', [-30, 25, 250], [-60, 5, 320]], ['centrum-straat', [-61, 1.7, 280], [-61, 3, 380]], ['daken-zuid', [-30, 40, 255], [-45, 0, 175]], ['woonerf', [-90, 1.7, 161.5], [0, 1.6, 161.5]], ['ms1', [-60, 6, 95], [-60, 1, 112]]];
for (const [name, p, t] of views) {
  await page.evaluate((p, t) => { const O = OS; O.camera.position.set(...p); O.controls.target.set(...t); O.controls.update(); }, p, t);
  await new Promise(r => setTimeout(r, 9000));   // een paar beelden in software-grafiek
  await page.screenshot({ path: path.join(out, name + '.png') });
  console.log('✓', name);
}
await browser.close();
