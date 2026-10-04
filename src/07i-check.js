
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
