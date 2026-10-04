
// ============================================================ belastingprognose: verwachte belasting komende 8 uur tegen de transformatorcapaciteit
const PROG={hist:[],lastQ:-1,warned:{}};
// verwachte vraag per spanningsniveau op uur h (zonder storingen, met seizoen en het huidige weer)
function demandAt(h){let p10=0,p20=0;h=((h%24)+24)%24;
  CONS.forEach(c=>{if(c.bus==='MP')return;const v=c.base*profile(c.kind,h)*(c.gen?1:seasonMul(c.kind));if(!c.st&&is20(c.bus))p20+=v;else p10+=v;});return {p10,p20};}
const trCap=T=>(D[T].fanFail?D[T].rON:D[T].rAF)*0.95;
function capNow(){const on=id=>D[id].state===1&&!D[D[id].tr].blocked;
  const c10=(on('V-T1')?trCap('T1'):0)+(on('V-T3')?trCap('T3'):0),c20=(on('W-T2')?trCap('T2'):0)+(on('W-T3')?trCap('T3'):0);
  const t3free=!D.T3.blocked&&!D['V-T3'].state&&!D['W-T3'].state;return {c10,c20,t3:t3free?trCap('T3'):0};}
function forecast(hours=8){const h0=SIM.t/60,pts=[];for(let k=0;k<=hours*4;k++){const h=h0+k/4;pts.push({h,...demandAt(h)});}return pts;}
// advies: eerste moment waarop de vraag boven de capaciteit uitkomt
function progAdvice(){const f=forecast(),cap=capNow(),out=[];
  const pk10=f.reduce((a,p)=>p.p10>a.p10?p:a),pk20=f.reduce((a,p)=>Math.abs(p.p20)>Math.abs(a.p20)?p:a);
  const over10=f.find(p=>p.p10>cap.c10*0.97),over20=f.find(p=>Math.abs(p.p20)>cap.c20*0.97);
  out.push({lvl:'info',t:`Piek 10 kV: <b>${fx1(pk10.p10)} MW</b> om ${fmtClock(pk10.h*60)} (${cap.c10?Math.round(pk10.p10/cap.c10*100)+'% van '+fx1(cap.c10)+' MW':'geen voeding'})`});
  out.push({lvl:'info',t:`Piek 20 kV: <b>${fx1(pk20.p20)} MW</b>${pk20.p20<0?' (teruglevering zonnepark)':''} om ${fmtClock(pk20.h*60)} (${cap.c20?Math.round(Math.abs(pk20.p20)/cap.c20*100)+'% van '+fx1(cap.c20)+' MW':'geen voeding'})`});
  if(over10)out.push({lvl:'warn',key:'10',at:over10.h,t:cap.c10?`Om <b>${fmtClock(over10.h*60)}</b> komt de 10 kV-vraag boven de capaciteit. ${cap.t3?'Neem T3 tijdig bij op 10 kV (V-T3)':'T3 is niet vrij'} of schakel de kassen (F6) af.`:`Rail A/B heeft nu <b>geen transformator</b> in bedrijf. ${cap.t3?`T3 kan ${fx1(cap.t3)} MW leveren`:'T3 is niet vrij'}.`});
  if(over20)out.push({lvl:'warn',key:'20',at:over20.h,t:cap.c20?`Om <b>${fmtClock(over20.h*60)}</b> komt de 20 kV-belasting${over20.p20<0?' (teruglevering)':''} boven de capaciteit. ${cap.t3?'Zet T3 op 20 kV parallel (W-T3)':'T3 is niet vrij'}.`:`Rail C1/C2 heeft nu <b>geen transformator</b> in bedrijf. ${cap.t3?'Zet T3 op 20 kV in (W-T3)':'T3 is niet vrij'}.`});
  if(!over10&&cap.c10&&D['V-T1'].state&&pk10.p10>trCap('T3'))out.push({lvl:'tip',t:`N-1: valt T1 uit, dan kan T3 (${fx1(trCap('T3'))} MW) de piek van ${fx1(pk10.p10)} MW niet alleen dragen – houd de kassen als afschakelbare reserve achter de hand.`});
  if(!over10&&!over20)out.push({lvl:'ok',t:'Geen overbelasting verwacht in de komende 8 uur met de huidige transformatoren.'});
  return {f,cap,out};}
const fx1=v=>v.toFixed(1).replace('.',',');
// elke 15 min: geschiedenis bijhouden en tijdig waarschuwen (eenmalig per dreigende overbelasting)
function progTick(){const q=Math.floor(SIM.t/15);if(q===PROG.lastQ)return;PROG.lastQ=q;
  PROG.hist.push({h:SIM.t/60,p10:FLOW.load,p20:FLOW.load20});if(PROG.hist.length>12)PROG.hist.shift();
  if(!GAME.mode||SIM.paused&&!GAME.ended)return;const {out}=progAdvice();
  for(const k of ['10','20']){const w=out.find(o=>o.key===k);
    if(w&&w.at-SIM.t/60<=1.5&&!PROG.warned[k]){PROG.warned[k]=true;pushAlarm(`Prognose: over ${Math.max(0,Math.round((w.at-SIM.t/60)*60))} min dreigt overbelasting op ${k} kV – zie het tabblad Prognose`,'warn');}
    if(!w)PROG.warned[k]=false;}}
function renderProg(){const g=$('#progG');if(!g||SLD.tab!=='P')return;const {f,cap,out}=progAdvice(),h0=SIM.t/60,X0=44,X1=456,Y0=58,Y1=300;
  const all=f.flatMap(p=>[p.p10,p.p20]).concat(PROG.hist.flatMap(p=>[p.p10,p.p20]),[cap.c10,cap.c20,cap.c10+cap.t3]);
  const top=Math.ceil(Math.max(...all)*1.1/10)*10||10,bot=Math.min(0,Math.floor(Math.min(...all)*1.1/10)*10);
  const x=h=>X0+(h-(h0-2))/10*(X1-X0),y=v=>Y1-(v-bot)/(top-bot)*(Y1-Y0),pl=(pts,k)=>pts.map(p=>`${x(p.h).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ');
  const o=[`<text x="235" y="22" text-anchor="middle" class="h">BELASTINGSPROGNOSE · KOMENDE 8 UUR</text>`,`<text x="235" y="36" text-anchor="middle" class="fs dl">verwachte vraag (seizoen + huidig weer) · stippel = capaciteit in bedrijf</text>`];
  for(let v=bot;v<=top;v+=10)o.push(`<line x1="${X0}" x2="${X1}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(255,255,255,${v===0?0.25:0.07})"/><text x="${X0-5}" y="${y(v)+3}" text-anchor="end" class="fs dl">${v}</text>`);
  for(let hh=Math.ceil(h0-2);hh<=h0+8;hh++)if(hh%2===0)o.push(`<line x1="${x(hh)}" x2="${x(hh)}" y1="${Y0}" y2="${Y1}" stroke="rgba(255,255,255,0.06)"/><text x="${x(hh)}" y="${Y1+13}" text-anchor="middle" class="fs dl">${String(((hh%24)+24)%24).padStart(2,'0')}:00</text>`);
  o.push(`<text x="${X0-5}" y="${Y0-6}" text-anchor="end" class="fs dl">MW</text>`);
  const capL=(v,col,lbl,dash,right,dy=-4)=>{if(v>0||v<0)o.push(`<line x1="${x(h0)}" x2="${X1}" y1="${y(v)}" y2="${y(v)}" style="stroke:${col}" stroke-width="1.6" stroke-dasharray="${dash}"/><text x="${right?X1:x(h0)+4}" y="${y(v)+dy}" text-anchor="${right?'end':'start'}" class="fs" style="fill:${col}">${lbl} ${fx1(Math.abs(v))}</text>`);};
  const same=Math.abs(cap.c10-cap.c20)<1.5;
  if(cap.c10)capL(cap.c10,'var(--mv)','cap. 10 kV','6 4',false);if(cap.t3)capL(cap.c10+cap.t3,'rgba(74,163,255,.5)','10 kV met T3','2 4',false);
  if(cap.c20)capL(cap.c20,'var(--mv20)','cap. 20 kV','3 5',true,same?12:-4);if(bot<0&&cap.c20)capL(-cap.c20,'var(--mv20)','max. teruglevering','3 5',true);
  o.push(`<line x1="${x(h0)}" x2="${x(h0)}" y1="${Y0-4}" y2="${Y1}" stroke="var(--accent)" stroke-width="1.2"/><text x="${x(h0)}" y="${Y0-8}" text-anchor="middle" class="fs" style="fill:var(--accent)">nu</text>`);
  const hist=PROG.hist.concat([{h:h0,p10:FLOW.load,p20:FLOW.load20}]);
  for(const [k,col] of [['p10','var(--mv)'],['p20','var(--mv20)']]){o.push(`<polyline fill="none" style="stroke:${col}" stroke-width="2.6" points="${pl(hist,k)}"/>`,`<polyline fill="none" style="stroke:${col}" stroke-width="2" opacity="0.75" stroke-dasharray="1 0" points="${pl(f,k)}"/>`);}
  o.push(`<text x="${X0}" y="${Y1+30}" class="fs" style="fill:var(--mv)">━ 10 kV (rail A+B)</text><text x="${X0+120}" y="${Y1+30}" class="fs" style="fill:var(--mv20)">━ 20 kV (C1+C2, netto)</text><text x="${X1}" y="${Y1+30}" text-anchor="end" class="fs dl">dik = gemeten · dun = prognose</text>`);
  out.forEach((a,i)=>{const col={warn:'var(--accent)',tip:'#9fd0ff',ok:'var(--green)',info:'#c4ccd4'}[a.lvl];
    o.push(`<foreignObject x="18" y="${344+i*44}" width="436" height="44"><div xmlns="http://www.w3.org/1999/xhtml" class="pg-row" style="border-left-color:${col}">${a.lvl==='warn'?'⚠ ':''}${a.t}</div></foreignObject>`);});
  g.innerHTML=o.join('');}
