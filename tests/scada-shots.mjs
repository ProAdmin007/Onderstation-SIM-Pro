import puppeteer from 'puppeteer-core';
import path from 'path';
import { pathToFileURL } from 'url';
// Screenshots van alle SCADA-tabbladen (voor het beoordelen van de opmaak). Gebruik: node tests/scada-shots.mjs [map]
import { mkdirSync } from 'fs';
const out = process.argv[2] || 'shots'; mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', protocolTimeout: 600000,
  args: ['--no-sandbox', '--window-size=1600,1000', '--mute-audio'], defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 1.5 } });
const page = await browser.newPage();
await page.goto(pathToFileURL(path.resolve('index.html')).href + '?autostart&t=18&lite', { waitUntil: 'load', timeout: 180000 });
for (let i = 0; i < 120 && !(await page.evaluate(() => !!window.OS)); i++) await new Promise(r => setTimeout(r, 500));
for (const t of ['10', '20', 'R', 'M', 'K', 'L', 'P']) {
  await page.evaluate(t => { OS.setTab(t); OS.renderLS?.(); }, t); await new Promise(r => setTimeout(r, 1200));
  const el = await page.$('#scada'); await el.screenshot({ path: `${out}/scada-${t}.png` }); console.log('✓', t);
}
await browser.close();
