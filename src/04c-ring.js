
// ============================================================ 10 kV-ring: voeding, kabelfouten, verklikkers, werkopdracht
const RBUSES=new Set(['RA','RB','RC']);
// welke MS-rail en welk uitgaand veld voedt elk knooppunt (breedte-eerst vanaf de rails)
function supplyTags(){const tag={},q=[];
  for(const b of RBUSES)if(EN.has(b)){tag[b]={bus:b,cb:null};q.push(b);}
  for(let i=0;i<q.length;i++){const n=q[i],t=tag[n];
    for(const d of ADJ[n]||[]){if(d.type==='tr'||!conducts(d))continue;const m=d.a===n?d.b:d.a;if(RBUSES.has(m)||tag[m])continue;
      tag[m]={bus:t.bus,cb:t.cb||(d.type==='cb'?d.id:null)};q.push(m);}}
  return tag;}
const secName=s=>`${s.a||'OS'} – ${s.b||'OS'}`;
const isoSwitches=s=>[s.a&&s.a+'-R',s.b&&s.b+'-L'].filter(Boolean);
// stations waar de foutstroom doorheen liep (tussen voedingspunt en fout)
function ringPathStations(from,to){const prev={[from]:null},q=[from];
  for(let i=0;i<q.length&&!(to in prev);i++){const n=q[i];for(const d of ADJ[n]||[]){if(d.type==='tr'||!conducts(d))continue;const m=d.a===n?d.b:d.a;if(m in prev)continue;prev[m]=n;q.push(m);}}
  const out=[];if(!(to in prev))return out;for(let n=to;n!=null;n=prev[n]){const s=RING.stations.find(s=>s.node===n);if(s)out.unshift(s.id);}return out;}
function ringFault(f){
  const c=RING.secs.filter(s=>!s.fault&&EN.has(s.node)&&FLOW.TAG[s.node]?.cb===f.cb);if(!c.length)return;
  const s=pick(c),flagged=ringPathStations(f.node,s.node);
  s.fault=true;s.located=false;RING.stations.forEach(x=>x.flag=flagged.includes(x.id));
  tripFrom(s.node);
  pushAlarm(`${f.cb} ${f.name}: I>> – kabelfout in de 10 kV-ring. Kortsluitverklikkers aangesproken: ${flagged.length?flagged.join(', '):'geen'}`,'crit');
  pushAlarm(`Tip: de fout zit achter het laatste station met een aangesproken verklikker. Isoleer die kabel met de lastscheiders aan beide kanten, voed de rest terug via het normaal-open punt ${s.ring.nop} en schakel ${f.cb} weer in.`,'info');
  addTimer(rnd(10,18),()=>{if(!s.fault)return;s.located=true;const open=isoSwitches(s).filter(id=>D[id].state===1);
    readyNotice(`Storingsdienst: kabelfout gevonden tussen ${secName(s)}${open.length?` – isoleer met ${open.join(' en ')}`:' – kabel is al geïsoleerd'}, herstel daarna via het normaal-open punt`,
      open[0]||null,()=>!!open[0]&&D[open[0]].state===1);
    const st=RING.stations.find(x=>x.id===(s.a||s.b));if(st)crewDispatch({box:VIEWS[st.id].box,say:`Kabelfout ${secName(s)} graven`,until:()=>!s.fault,from:V3(st.pos[0]+6,0,st.pos[1]-8)});});
  addTimer(rnd(70,130),()=>{s.fault=false;s.located=false;RING.stations.forEach(x=>x.flag=false);
    pushAlarm(`Storingsdienst: kabel ${secName(s)} gerepareerd – normaliseer de ring (normaal-open punt ${s.ring.nop} weer open)`,'ok');refreshAll();});
  refreshAll();}
// een kabel met fout die weer onder spanning komt: beveiliging schakelt direct af
function ringProtection(){RING.secs.forEach(s=>{if(!s.fault||!EN.has(s.node))return;const t=FLOW.TAG[s.node];tripFrom(s.node);GAME.stats.recloseFault++;award(-40,'Ingeschakeld op kabelfout');
  pushAlarm(`Kabel ${secName(s)} met fout onder spanning gebracht – ${t&&t.cb?t.cb:'beveiliging'} schakelt af`,'warn');});}
function ringTask(){const s=pick(RING.secs.filter(x=>x.a&&x.b&&x.a+'-R'!==x.ring.nop)),l=s.a+'-R',r=s.b+'-L',st=RING.stations.find(x=>x.id===s.a),nop=s.ring.nop;
  return{title:`Kabelwerk ring: ${secName(s)}`,crew:()=>({box:VIEWS[st.id].box,say:`Mof leggen ${secName(s)}`,from:V3(st.pos[0]+6,0,st.pos[1]-8)}),
    desc:`Een kabelploeg legt een nieuwe mof in de kabel tussen ${secName(s)}. Sluit eerst het normaal-open punt, zodat niemand zonder stroom komt, en schakel dan de kabel vrij.`,steps:[
    {t:`Sluit het normaal-open punt ${nop}`,ok:()=>D[nop].state===1},
    {t:`Open lastscheider ${l}`,ok:()=>D[l].state===0},
    {t:`Open lastscheider ${r}`,ok:()=>D[r].state===0,done:()=>pushAlarm(`Werkvergunning afgegeven – kabelwerk ${secName(s)} gestart`,'info')},
    {t:'Kabelwerk in uitvoering…',wait:35},
    {t:`Werk gereed – sluit ${r}`,ok:()=>D[r].state===1},
    {t:`Sluit ${l}`,ok:()=>D[l].state===1},
    {t:`Open het normaal-open punt ${nop} weer`,ok:()=>D[nop].state===0}]};}
