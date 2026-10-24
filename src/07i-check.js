
// ============================================================ modelcontrole bij het opstarten: vangt verkeerde of vergeten namen direct af
// (een fout geeft een consolefout; de eerste test faalt dan meteen)
function checkModel(silent){const err=[],has=id=>!!D[id],SW=['cb','ds','es','lbs','lvs'];
  Object.values(D).forEach(d=>{
    if(SW.concat(['tr','mstr']).includes(d.type)&&(!d.a||(d.type!=='es'&&!d.b)))err.push(`${d.id}: aansluitknooppunt ontbreekt`);
    for(const k of ['cb','es','ds','other','tr'])if(typeof d[k]==='string'&&!has(d[k]))err.push(`${d.id}.${k} verwijst naar onbekend apparaat ${d[k]}`);
    if(SW.includes(d.type)&&!SLD.devs[d.id]&&!VIEWS[d.id])err.push(`${d.id} is nergens te bedienen (niet in SCADA en niet in 3D)`);});
  FEEDERS.forEach(f=>{if(!has(f.cb))err.push(`veld ${f.id}: vermogenschakelaar ${f.cb} ontbreekt`);if(!BUSES[f.bus])err.push(`veld ${f.id}: onbekende rail ${f.bus}`);});
  Object.values(TR_LV).flat().forEach(id=>has(id)||err.push(`incomer ${id} ontbreekt`));
  Object.keys(COUPLERS).forEach(id=>has(id)||err.push(`koppeling ${id} ontbreekt`));
  Object.entries(SEL_BAYS).forEach(([b,v])=>['QA','QB'].forEach(q=>has(b+'-'+q)||err.push(`railkeuzescheider ${b}-${q} ontbreekt`)));
  RINGS.forEach(rg=>has(rg.nop)||err.push(`${rg.name}: normaal-open punt ${rg.nop} ontbreekt`));
  Object.entries(LESSONS).forEach(([id,l])=>l.steps.forEach((s,i)=>[...(s.hl||[]),...(s.act?[s.act[0]]:[]),...(s.acts||[]).map(a=>a[0])]
    .forEach(x=>has(x)||err.push(`${id} stap ${i+1}: onbekend apparaat ${x}`))));
  [...PANELS,...PANELS20].forEach(p=>{if(p.id&&!has(p.id))err.push(`schakelpaneel ${p.id} hoort bij geen apparaat`);});
  computeFlows();BUS_IDS.forEach(b=>EN.has(b)||err.push(`rail ${b} is in de normale toestand spanningsloos`));
  CONS.forEach(c=>{if(!EN.has(c.node))err.push(`${c.id} heeft in de normale toestand geen spanning`);});
  if(err.length&&!silent)console.error(`Modelcontrole: ${err.length} probleem/problemen\n`+err.join('\n'));return err;}
// ---- plaatsingscontrole: staat er ergens een object in een ander object (auto in een station, boom op de weg …)?
const LAYOUT_BAD={kiosk:['car','house','apt','hall','tree','road','woonerf','lamp','kk','kast','hedge','shed','parkeer'],
  car:['house','apt','hall','tree','lamp','kk','kast','hedge','shed','road','stoep'],tree:['road','woonerf','house','apt','hall','kk','kast','shed','lamp','parkeer'],
  kk:['road','woonerf','house','apt','hall','kast','shed','hedge','parkeer','stoep','small','car'],lamp:['road','woonerf','house','apt','hall','kast','shed','parkeer','hedge'],
  house:['road','woonerf','apt','hall','parkeer','stoep'],apt:['road','woonerf','parkeer','stoep','hall'],hall:['road','woonerf','stoep'],kast:['road','woonerf','parkeer','house','apt','hall','small','stoep','hedge','tree','kiosk','shed','car'],hedge:['road','woonerf','stoep'],halte:['road','house','apt','hall','small','tree','lamp','kk','kast','kiosk','car','hedge','shed']};
function layoutCheck(){const inWijk=o=>o.r[2]>-210&&o.r[0]<260&&o.r[3]>60&&o.r[1]<450,L=LAYOUT.filter(inWijk),out=[];
  const ov=(a,b)=>rectsOverlap(a,b,-0.05);
  for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const a=L[i],b=L[j];if(!(LAYOUT_BAD[a.kind]?.includes(b.kind)||LAYOUT_BAD[b.kind]?.includes(a.kind)))continue;
    if(ov(a.r,b.r))out.push(`${a.kind} [${a.r.map(v=>v.toFixed(1)).join(',')}] ↔ ${b.kind} [${b.r.map(v=>v.toFixed(1)).join(',')}]`);}
  return out;}
