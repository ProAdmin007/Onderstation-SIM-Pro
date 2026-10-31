// Korte samenvatting bij de huidige versie zetten (voor de updateknop in het menu: "Wat is er nieuw?").
// Gebruik na het bouwen, vóór de commit: node tests/note.mjs "Datacenter realistischer met koude gang en gasblussing"
// Samenvattingen van versies die niet meer in version.json staan, worden opgeruimd.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const vf = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'version.json');
const text = process.argv.slice(2).join(' ').trim();
if (!text) { console.error('gebruik: node tests/note.mjs "korte samenvatting"'); process.exit(1); }
const v = JSON.parse(fs.readFileSync(vf, 'utf8')), keep = new Set([v.build, ...(v.previous || [])]);
v.notes = Object.fromEntries(Object.entries(v.notes || {}).filter(([b]) => keep.has(b)));
v.notes[v.build] = { date: v.date, text };
fs.writeFileSync(vf, JSON.stringify(v, null, 2) + '\n');
console.log(`samenvatting bij ${v.build}: ${text}`);
