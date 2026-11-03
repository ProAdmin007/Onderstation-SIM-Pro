
// ============================================================ venster netcongestie en flexibel vermogen (toets C)
let flexPrev=false;
const flexOpen=()=>!$('#flex').classList.contains('hidden');
function openFlex(){if(flexOpen())return;modalOpen('flex');if(FP.on)unlockPointer();$('#flex').classList.remove('hidden');renderFlex();}
function closeFlex(){$('#flex').classList.add('hidden');modalClose('flex');}
// keuzes in het afroepformulier blijven staan als het venster opnieuw wordt opgebouwd
const FLEXUI={id:'F6',from:null,dur:2,frac:1};
function flexStatus(f){const t=SIM.t,h=((t/60)%24+24)%24,cur=(f.calls||[]).find(c=>t>=c.from&&t<c.to),nxt=(f.calls||[]).find(c=>c.from>t);
  if(f.type==='blokstroom')return f.viol?'<span class="bad">laadt buiten het blok</span>':inHours(h,0,6)?'nachtladen (blok actief)':'vast deel, laadt 00:00–06:00';
  if(f.type==='nonfirm')return MODES[GAME.mode]?.firmPV?'uitbreiding met vast transportrecht':f.nf>0?`<span class="warnc">automatisch −${Math.round(f.nf*100)}%</span>`:'vol vermogen (net heeft ruimte)';
  if(f.type==='blok')return inHours(h,f.blk[0],f.blk[1])?`<span class="ok">tijdsblok actief tot ${String(f.blk[1]).padStart(2,'0')}:00</span>`:`tijdsblok elke dag ${String(f.blk[0]).padStart(2,'0')}–${String(f.blk[1]).padStart(2,'0')} u`;
  if(cur)return `<span class="ok">afroep actief tot ${fmtClock(cur.to)}</span>`;if(nxt)return `afroep gepland ${fmtClock(nxt.from)}–${fmtClock(nxt.to)}`;return f.type?'geen afroep':'alleen intraday';}
function renderFlex(){if(!flexOpen())return;const pct=v=>Math.round(v*100)+'%',cls=k=>k>1?'bad':k>0.9?'warnc':'',t=SIM.t;
  const rows=FLEX.map(f=>{const c=f.c,on=EN.has(c.node),now=Math.abs(c.demand||0),act=c.cut||0,pend=f.req!==(f.live||0);
    const ctl=flexIntra(f)?[0,0.25,0.5,0.75,1].map(v=>`<button class="mini fx ${f.req===v?'on':''}" data-fx="${f.id}:${v}">${v?'−'+pct(v*f.max):'uit'}</button>`).join('')
      :f.type==='blokstroom'?(f.viol?`<button class="mini fx on" data-fwarn="${f.id}">klant aanspreken</button>`:'<span class="dl">—</span>'):'<span class="dl">automatisch</span>';
    const eff=act>0?`−${fx1(flexSaved(f))} MW`:act<0?`+${fx1(now-now/(1-act))} MW`:pend?'<span class="warnc">wordt actief…</span>':'—';
    const price=f.type==='blokstroom'?'korting tarief':f.type==='nonfirm'?'geen':`${f.type?`€ ${f.type==='blok'?Math.round(f.eur*0.6):f.eur} · `:''}intraday € ${intraEur(f)}`;
    return `<tr><td><b>${f.name}</b><span>${f.id} · ${f.how}</span></td><td><b>${FLEX_TYPE[f.type]||'flexcontract'}</b><span>${flexStatus(f)}</span></td><td class="pv">${on?fx1(now)+' MW':'<span class="bad">geen spanning</span>'}</td>
      <td>${ctl}</td><td class="pv">${eff}</td><td class="pv">${price}</td></tr>`;}).join('');
  const cg=congestion().map(x=>`<div class="cg"><span>${x.t}</span><i><b class="${cls(x.k)}" style="width:${Math.min(100,x.k*80)}%"></b></i><em class="${cls(x.k)}">${pct(x.k)}</em></div>`).join('');
  // afroepformulier: begin op een heel uur, minstens FLEX_LEAD vooraf
  const first=Math.ceil((t+FLEX_LEAD)/60)*60,starts=[...Array(12)].map((_,i)=>first+i*60);if(FLEXUI.from==null||FLEXUI.from<first)FLEXUI.from=first;
  const af=FLEX.filter(f=>f.type==='afroep'),opt=(v,l,sel)=>`<option value="${v}"${sel?' selected':''}>${l}</option>`;
  const calls=af.flatMap(f=>f.calls.map((c,i)=>({f,c,i}))).sort((a,b)=>a.c.from-b.c.from).map(({f,c,i})=>{const st=t>=c.to?'afgerond':t>=c.from?'<span class="ok">actief</span>':t>c.from-FLEX_LEAD?'vast (binnen afroeptermijn)':`gepland · <button class="mini" data-fcancel="${f.id}:${i}">annuleren</button>`;
    return `<tr><td><b>${f.name}</b></td><td class="pv">${fmtClock(c.from)}–${fmtClock(c.to)}</td><td class="pv">−${Math.round(c.frac*f.max*100)}%</td><td>${st}</td></tr>`;}).join('');
  $('#flex').innerHTML=`<div class="card pr"><div class="eyebrow">Netcongestie · congestiemanagement</div><h2>Flexcontracten</h2>
    <p class="bf-desc">Zit een kabel of transformator straks aan zijn grens? Kijk op het tabblad <b>Prognose</b> en <b>roep tijdig af</b>: een CSC-afroep moet minstens ${FLEX_LEAD/60} uur vooraf (in het echt de dag ervoor, bij Enexis vóór 07:00) en is het goedkoopst. Te laat? Dan kan alleen nog <b>intraday</b> (redispatch): actief na ±${FLEX_DELAY} min, maar voor het dubbele tarief. Blokstroom en non-firm werken vanzelf. Kosten gaan van je score af (1 punt per € 100).</p>
    <div class="mh">Zwaarst belaste netdelen</div><div class="cgs">${cg}</div>
    <div class="mh">CSC-afroep plannen</div>
    <div class="fcall"><select data-fui="id">${af.map(f=>opt(f.id,f.name,f.id===FLEXUI.id)).join('')}</select>
      <select data-fui="from">${starts.map(v=>opt(v,'vanaf '+fmtClock(v),v===FLEXUI.from)).join('')}</select>
      <select data-fui="dur">${[1,2,3,4].map(v=>opt(v,v+' uur',v===FLEXUI.dur)).join('')}</select>
      <select data-fui="frac">${[0.5,1].map(v=>opt(v,v===1?'volledig':'half',v===FLEXUI.frac)).join('')}</select>
      <button class="primary" data-fcall>Afroepen</button></div>
    ${calls?`<table><tr><th>Klant</th><th>Tijdvak</th><th>Omvang</th><th>Status</th></tr>${calls}</table>`:'<p class="bf-desc">Nog geen afroepen.</p>'}
    <div class="mh">Contracten</div><table><tr><th>Klant</th><th>Contract</th><th>Nu</th><th>Intraday</th><th>Effect</th><th>Vergoeding (€/MWh)</th></tr>${rows}</table>
    <p class="bf-desc">Flexkosten deze dienst: <b>€ ${Math.round(GAME.stats.flexEur||0).toLocaleString('nl-NL')}</b></p>
    <div class="rep-btns"><button class="primary" data-fclose>Sluiten <kbd>C</kbd></button><button data-fall>Intraday alles vrijgeven</button></div></div>`;}
$('#flex').addEventListener('click',e=>{if(e.target.closest('[data-fclose]')||e.target.id==='flex')return closeFlex();
  const b=e.target.closest('[data-fx]');if(b){const [id,v]=b.dataset.fx.split(':');setFlex(id,+v);return;}
  const w=e.target.closest('[data-fwarn]');if(w)return flexWarn(w.dataset.fwarn);
  const x=e.target.closest('[data-fcancel]');if(x){const [id,i]=x.dataset.fcancel.split(':');flexCancel(id,+i);return;}
  if(e.target.closest('[data-fcall]')){flexCall(FLEXUI.id,FLEXUI.from,FLEXUI.from+FLEXUI.dur*60,FLEXUI.frac);return;}
  if(e.target.closest('[data-fall]'))FLEX.forEach(f=>f.req&&setFlex(f.id,0));});
$('#flex').addEventListener('change',e=>{const k=e.target.dataset?.fui;if(k)FLEXUI[k]=k==='id'?e.target.value:+e.target.value;});
$('#flexBtn').addEventListener('click',()=>flexOpen()?closeFlex():openFlex());
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;if((e.key==='c'||e.key==='C')&&$('#intro').classList.contains('hidden'))flexOpen()?closeFlex():openFlex();});
