
// ============================================================ SCADA-tabblad Kabels: belasting per kabel, per veldkabel en per distributietrafo
const tC=t=>t==null?'':`<tspan style="fill:${t>CABLE.max?'var(--red)':t>CABLE.warn?'var(--accent)':'inherit'}">${Math.round(t)}°C</tspan>`;
function renderCables(){const g=$('#cabG');if(!g||SLD.tab!=='K')return;const o=[],X0=16,XB=262,XW=150,XP=456;let y=22;
  const fx2=v=>v.toFixed(2).replace('.',','),col=k=>k>1?'var(--red)':k>0.85?'var(--accent)':'var(--green)';
  const row=(name,sub,info,k,extra='',tip='')=>{const w=Math.max(0,Math.min(1.25,k))/1.25*XW;
    o.push(`<g class="cab" ${extra}>${tip?`<title>${tip}</title>`:''}<rect x="${X0-4}" y="${y-11}" width="452" height="15" rx="3" fill="transparent"/>`,
      `<text x="${X0}" y="${y}" class="fs" style="fill:#d6dde4">${name}</text>`,sub?`<text x="${X0+122}" y="${y}" class="fs dl">${sub}</text>`:'',
      `<text x="${XB-6}" y="${y}" text-anchor="end" class="fs">${info}</text>`,
      `<rect x="${XB}" y="${y-8}" width="${XW}" height="8" rx="2" fill="rgba(255,255,255,.07)"/><line x1="${XB+XW/1.25}" x2="${XB+XW/1.25}" y1="${y-10}" y2="${y+2}" stroke="rgba(255,255,255,.35)"/>`,
      k>0?`<rect x="${XB}" y="${y-8}" width="${w.toFixed(1)}" height="8" rx="2" style="fill:${col(k)}"/>`:'',
      `<text x="${XP}" y="${y}" text-anchor="end" class="fs" style="fill:${k>0?col(k):'var(--muted)'}">${k>0?Math.round(k*100)+'%':'—'}</text></g>`);y+=16;};
  const head=t=>{y+=6;o.push(`<text x="${X0-4}" y="${y}" class="h">${t}</text>`);y+=14;};
  o.push(`<text x="235" y="${y-6}" text-anchor="middle" class="h">BELASTING PER KABEL</text>`,`<text x="235" y="${y+7}" text-anchor="middle" class="fs dl">stroom/rating · spanning · temperatuur (max. 90 °C) · streep = 100%</text>`);y+=14;
  RINGS.forEach(rg=>{head(`${rg.name.toUpperCase()} · normaal-open ${rg.nop}`);
    RING.secs.filter(s=>s.ring===rg).forEach(s=>{const on=EN.has(s.node),u=FLOW.UN?.[s.node],st=s.b||s.a;
      const info=s.fault?'<tspan style="fill:var(--red)">⚡ kabelfout</tspan>':on?`${Math.round(s.I)}/${s.rate} A · ${u?fx2(u)+' kV':''} · ${tC(s.temp)}`:'<tspan style="fill:var(--muted)">spanningsloos</tspan>';
      row(`${s.a||'OS'} – ${s.b||'OS'}${s.a&&s.b?'':' (kop)'}`,'',info,on&&!s.fault?s.load:0,`data-cab="${st}"`,`Kabel ${secName(s)}: ${Math.round(s.I)} A van ${s.rate} A`);});});
  head('UITGAANDE VELDKABELS');
  FEEDERS.filter(f=>!f.ring).forEach(f=>{const on=EN.has(f.node),I=D[f.cb].I,rA=f.rate*kA(f.bus),k=on?I/rA:0;
    row(`${f.cb} ${f.short}`,'',on?`${Math.round(I)}/${Math.round(rA)} A${f.gen?(f.P<0?' (terug)':''):' · '+tC(f.temp)}`:'<tspan style="fill:var(--muted)">uit</tspan>',k,`data-dev="${f.cb}"`);});
  head('DISTRIBUTIETRAFO\'S IN DE MS-STATIONS');
  RING.stations.forEach(s=>{const on=EN.has(s.node+'v');row(`${s.id} ${s.short}`,'',on?`${Math.round(s.P*1000)} kW / ${s.kva} kVA`:'<tspan style="fill:var(--muted)">spanningsloos</tspan>',on?s.trLoad||0:0,`data-cab="${s.id}"`);});
  g.innerHTML=o.join('');}
$('#sld').addEventListener('click',e=>{const c=e.target.closest('[data-cab]');if(c)return selectDevice(c.dataset.cab);const d=e.target.closest('.cab[data-dev]');if(d)selectDevice(d.dataset.dev);});
