// Controle op verborgen fouten in src/ die een gewone syntaxcontrole per bestand niet vindt:
//  1. een //-commentaar dat de rest van een regel code uitschakelt (de code blijft vaak geldig, dus geen SyntaxError)
//  2. dubbele declaraties tussen bestanden: alles wordt samengevoegd tot één module
//  3. een syntaxfout per bestand
// Gebruik: node tests/lint.mjs   (draait ook automatisch bij het bouwen)
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const files = fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));   // ordinaal, zoals build.ps1
const problems = [];

// ---- 1. tokenizer: vindt //-commentaren buiten strings, template literals en reguliere expressies
const REGEX_AFTER = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);
const REGEX_KW = /(?:^|[^\w$.])(return|typeof|case|do|else|in|of|new|delete|void|throw|yield|await)$/;
function lineComments(src) {
  const out = []; let i = 0, line = 1, prev = '';   // prev: laatste betekenisvolle teken
  const tpl = [];   // stapel van open template literals (diepte van ${ … } per niveau)
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { let j = i + 2; while (j < n && src[j] !== '\n') j++; out.push({ line, text: src.slice(i + 2, j) }); i = j; continue; }
    if (c === '/' && src[i + 1] === '*') { const j = src.indexOf('*/', i + 2); for (let k = i; k < j; k++) if (src[k] === '\n') line++; i = j + 2; continue; }
    if (c === "'" || c === '"') { let j = i + 1; while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; } i = j + 1; prev = 'a'; continue; }
    if (c === '`' || (c === '}' && tpl.length && tpl[tpl.length - 1] === 0)) {   // begin van een template, of terug ín de template na ${ … }
      if (c === '}') tpl.pop();
      let j = i + 1;
      while (j < n && src[j] !== '`') { if (src[j] === '\\') j++; else if (src[j] === '\n') line++; else if (src[j] === '$' && src[j + 1] === '{') break; j++; }
      if (src[j] === '`') { i = j + 1; prev = 'a'; continue; }
      tpl.push(0); i = j + 2; prev = '('; continue;
    }
    if (c === '{' && tpl.length) tpl[tpl.length - 1]++;
    if (c === '}' && tpl.length) tpl[tpl.length - 1]--;
    if (c === '/') {
      const before = src.slice(Math.max(0, i - 12), i).replace(/\s+$/, '');
      if (REGEX_AFTER.has(prev) || prev === '' || REGEX_KW.test(before)) {   // reguliere expressie
        let j = i + 1, cls = false;
        while (j < n && (cls || src[j] !== '/')) { if (src[j] === '\\') j++; else if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; else if (src[j] === '\n') break; j++; }
        j++; while (/[a-z]/.test(src[j] || '')) j++; i = j; prev = 'a'; continue;
      }
    }
    prev = /[\w$]/.test(c) ? 'a' : c === ')' || c === ']' ? 'a' : c; i++;
  }
  return out;
}
// commentaartekst die naar code ruikt: een ; met iets erachter, een pijlfunctie, een sluitende } of een aanroep met ;
const CODEY = [/;\s*([\w$.]+\s*(\(|\[|=[^=]|\+\+|--)|(if|for|while|return|const|let|var|else|switch|break|continue)\b|[})\]])/, /=>/, /\}\s*\)?\s*;?\s*$/, /\)\s*;\s*$/, /\b(const|let|var)\s+[\w$]+\s*=/, /\bfunction\s*[\w$]*\s*\(/, /\b[\w$]+\([^)]*\)\s*\{/, /\b(if|for|while)\s*\(.*\)\s*[\w${]/];
// commentaren die bewust code tonen (uitleg of uitgezette voorbeeldcode): markeer met "// lint-ok"
for (const f of files) {
  const src = fs.readFileSync(path.join(SRC, f), 'utf8');
  for (const c of lineComments(src)) {
    if (/lint-ok/.test(c.text)) continue;
    const hit = CODEY.find(re => re.test(c.text));
    if (hit) problems.push(`${f}:${c.line}  commentaar lijkt code uit te schakelen: //${c.text.slice(0, 110)}`);
  }
}

// ---- 2 en 3. syntaxcontrole per bestand en van de samengevoegde module
const check = file => { try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); return null; } catch (e) { return String(e.stderr || e.message).split('\n').filter(l => l.trim()).slice(0, 5).join('\n    '); } };
for (const f of files) { const e = check(path.join(SRC, f)); if (e) problems.push(`${f}: syntaxfout\n    ${e}`); }
if (!problems.some(p => p.includes('syntaxfout'))) {
  // regelnummers van de samengevoegde module terugvertalen naar bestand:regel
  const map = []; let all = '';
  for (const f of files) { const s = fs.readFileSync(path.join(SRC, f), 'utf8'); map.push({ f, from: all.split('\n').length }); all += s + '\n'; }
  const tmp = path.join(os.tmpdir(), `osz-lint-${process.pid}.mjs`); fs.writeFileSync(tmp, all);
  const e = check(tmp); fs.rmSync(tmp, { force: true });
  if (e) {
    const m = e.match(/:(\d+)/), ln = m ? +m[1] : 0, part = map.filter(x => x.from <= ln).pop();
    problems.push(`samengevoegde module: ${part ? `${part.f}:${ln - part.from + 1}` : '?'} – waarschijnlijk dubbele declaratie tussen bestanden\n    ${e.replace(tmp, '(module)')}`);
  }
}

// ---- 4. index.html moet overeenkomen met src/ (vergeten te bouwen?) – niet tijdens het bouwen zelf
if (!process.argv.includes('--build')) {
  const parts = fs.readdirSync(SRC).filter(f => /\.(html|js)$/.test(f)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const norm = s => s.replace(/\r\n/g, '\n');
  const want = norm(parts.map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n'));
  if (norm(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')) !== want) problems.push('index.html loopt niet gelijk met src/ – bouw opnieuw met npm run build');
}

if (problems.length) { console.log(`Lint: ${problems.length} probleem/problemen gevonden\n` + problems.map(p => '  ✗ ' + p).join('\n')); process.exit(1); }
console.log(`Lint: ${files.length} bestanden in orde`);
