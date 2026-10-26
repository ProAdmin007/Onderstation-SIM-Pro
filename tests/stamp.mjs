// Versie-stempel na het bouwen: vervangt __OS_BUILD__ in index.html door een vingerafdruk van de broncode
// en houdt version.json bij (huidige versie, datum en eerdere versies). Het spel vergelijkt dit met version.json op GitHub.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PLACEHOLDER = '__OS_BUILD__';
// vingerafdruk van de samengevoegde bron (met de plaatshouder, regeleinden genormaliseerd): elke clone geeft dezelfde waarde
export const buildHash = text => crypto.createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex').slice(0, 12);
export const stamp = text => text.replace(PLACEHOLDER, buildHash(text));

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = path.join(ROOT, 'index.html'), raw = fs.readFileSync(file, 'utf8');
  if (!raw.includes(PLACEHOLDER)) { console.error('stamp: geen ' + PLACEHOLDER + ' in index.html'); process.exit(1); }
  const build = buildHash(raw);
  fs.writeFileSync(file, raw.replace(PLACEHOLDER, build));
  const vf = path.join(ROOT, 'version.json');
  let v = { build: null, date: null, previous: [] };
  try { v = { ...v, ...JSON.parse(fs.readFileSync(vf, 'utf8')) }; } catch (e) {}
  if (v.build !== build) {
    if (v.build) v.previous = [v.build, ...v.previous.filter(b => b !== v.build && b !== build)].slice(0, 200);
    v.build = build; v.date = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(vf, JSON.stringify(v, null, 2) + '\n');
  }
  console.log('versie ' + build);
}
