
// ============================================================ venster netcongestie en flexibel vermogen (toets C)
let flexPrev=false;
const flexOpen=()=>!$('#flex').classList.contains('hidden');
function openFlex(){if(flexOpen())return;flexPrev=SIM.paused;SIM.paused=true;syncSpeed();if(FP.on)unlockPointer();$('#flex').classList.remove('hidden');renderFlex();}
function closeFlex(){$('#flex').classList.add('hidden');SIM.paused=flexPrev;syncSpeed();}
function renderFlex(){if(!flexOpen())return;const pct=v=>Math.round(v*100)+'%',cls=k=>k>1?'bad':k>0.9?'warnc':'';
  const rows=FLEX.map(f=>{const c=f.c,on=EN.has(c.node),now=Math.abs(c.demand||0),act=c.cut||0,pend=f.req*f.max!==act;
    return `<tr><td><b>${f.name}</b><span>${f.id} · ${f.how}</span></td><td class="pv">${on?fx1(now)+' MW':'<span class="bad">geen spanning</span>'}</td>
      <td>${[0,0.25,0.5,0.75,1].map(v=>`<button class="mini fx ${f.req===v?'on':''}" data-fx="${f.id}:${v}">${v?'−'+pct(v*f.max):'uit'}</button>`).join('')}</td>
      <td class="pv">${act?`−${fx1(flexSaved(f))} MW`:pend?'<span class="warnc">wordt actief…</span>':'—'}</td><td class="pv">€ ${f.eur}/MWh</td></tr>`;}).join('');
  const cg=congestion().map(x=>`<div class="cg"><span>${x.t}</span><i><b class="${cls(x.k)}" style="width:${Math.min(100,x.k*80)}%"></b></i><em class="${cls(x.k)}">${pct(x.k)}</em></div>`).join('');
  $('#flex').innerHTML=`<div class="card pr"><div class="eyebrow">Netcongestie · flexibel vermogen</div><h2>Flexmarkt</h2>
    <p class="bf-desc">Zit een kabel of transformator aan zijn grens? Vraag klanten met een flexcontract om tijdelijk minder af te nemen (of het zonnepark om minder terug te leveren). Na ±${FLEX_DELAY} min is het actief; de vergoeding gaat van je score af (1 punt per € 100) – meestal veel goedkoper dan uitval.</p>
    <div class="mh">Zwaarst belaste netdelen</div><div class="cgs">${cg}</div>
    <div class="mh">Flexcontracten</div><table><tr><th>Klant</th><th>Nu</th><th>Terugregelen</th><th>Effect</th><th>Vergoeding</th></tr>${rows}</table>
    <p class="bf-desc">Flexkosten deze dienst: <b>€ ${Math.round(GAME.stats.flexEur||0).toLocaleString('nl-NL')}</b></p>
    <div class="rep-btns"><button class="primary" data-fclose>Sluiten <kbd>C</kbd></button><button data-fall>Alles vrijgeven</button></div></div>`;}
$('#flex').addEventListener('click',e=>{if(e.target.closest('[data-fclose]')||e.target.id==='flex')return closeFlex();
  const b=e.target.closest('[data-fx]');if(b){const [id,v]=b.dataset.fx.split(':');setFlex(id,+v);return;}
  if(e.target.closest('[data-fall]'))FLEX.forEach(f=>f.req&&setFlex(f.id,0));});
$('#flexBtn').addEventListener('click',()=>flexOpen()?closeFlex():openFlex());
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;if((e.key==='c'||e.key==='C')&&$('#intro').classList.contains('hidden'))flexOpen()?closeFlex():openFlex();});
