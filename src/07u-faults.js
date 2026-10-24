
// ============================================================ paneel Lopende storingen: wat er nu speelt (uit de toestand van de installatie, niet uit het logboek)
const FSEEN={};   // sleutel → eerste keer gezien (SIM.t), voor 'sinds' en de duur
const tabOfFeeder=f=>f.bus==='MP'?'M':is20(f.bus)?'20':'10';
const offOf=cs=>cs.reduce((n,c)=>n+custOff(c),0);
function activeFaults(){const o=[],add=(key,sev,title,detail,go,cust=0)=>o.push({key,sev,title,detail,go,cust});
  // een groot incident staat al in de eigen balk bovenin; hier alleen wat er in de installatie speelt
  LINES.forEach(L=>{const ln=SIM.lines[L];if(!ln.avail&&!ln.maint)add('ln'+L,'crit',`Lijn ${L} ${ln.name} spanningsloos`,ln.reason||'TenneT herstelt',{tab:'10',dev:L+'-Q0'});});
  TR.forEach(T=>{const t=D[T];if(t.blocked)add('tr'+T,'crit',`${T} geblokkeerd (relais 86)`,`${t.blockText||'beveiliging'}${t.resettable?' · reset mogelijk':' · inspectie loopt'}`,{tab:T==='T2'?'20':'10',dev:T});
    else if(t.oil>95&&EN.has(T+'h'))add('to'+T,'warn',`${T} warm`,`olie ${Math.round(t.oil)} °C – verlaag de belasting`,{tab:T==='T2'?'20':'10',dev:T});});
  BUS_IDS.forEach(b=>{if(b==='MP')return;const nm=BUSES[b].nm,tab=is20(b)?'20':'10';
    if(BUSF[b])add('bf'+b,'crit',`Railfout rail ${nm}`,'rail spanningsloos tot de monteur klaar is',{tab});else if(!EN.has(b))add('bd'+b,'crit',`Rail ${nm} spanningsloos`,'',{tab});});
  if(EF.on){const r=efRails();add('ef','crit',`Aardfout 10 kV · U0 ${efU0().toFixed(1).replace('.',',')} kV`,r.length?`op rail ${r.map(b=>BUSES[b].nm).join(' en ')} – zoek door te schakelen`:'',{tab:'10'});}
  if(!SIM.meppel.avail)add('mp','warn','OS Meppel: storing Netbeheer Noord',SIM.meppel.reason||'herstel door Netbeheer Noord',{tab:'M'},offOf(FEEDERS.filter(f=>f.bus==='MP')));
  // afnemers met een eigen plek in de wereld: knop 'bekijk' (camerastandpunt)
  const SITE_VIEW={F5:9,F6:10,G4:11};
  FEEDERS.forEach(f=>{if(f.ring)return;const go={tab:tabOfFeeder(f),dev:f.cb,view:SITE_VIEW[f.id]};
    if(f.fault)add('ff'+f.id,'crit',`Kabelfout ${f.id} ${f.name}`,f.fault.stage==='search'?'storingsdienst zoekt – veld nog niet inschakelen':'weggeschakeld – veld mag weer in, wacht op reparatie',go,custOff(f));
    else if(f.cust>0&&!f.backfed&&!EN.has(f.node)&&f.unplanned)add('fd'+f.id,'warn',`${f.id} ${f.name} spanningsloos`,'',go,f.cust);
    if((f.temp||0)>CABLE.max)add('ft'+f.id,'warn',`Kabel ${f.cb} te warm`,`${Math.round(f.temp)} °C (max. ${CABLE.max} °C)`,{tab:'K'});});
  // stations die door een kabelfout in hun ring spanningsloos zijn, staan bij die kabelfout (oorzaak, niet elk gevolg apart)
  const ringDead=rg=>rg.stations.filter(st=>!st.damaged&&!st.fuse&&!stationLive(st)),told=new Set();
  RING.secs.forEach(s=>{if(s.fault){let det=s.spot?.known?`fout op ${Math.round(s.spot.d)} m vanaf ${s.a||'OS'} – graafploeg bezig`:s.located?(s.meas?'gevonden – meetwagen meet de foutplaats':'gevonden – isoleer de kabel, voed terug en bepaal de foutplaats (tablet G)'):'storingsdienst zoekt – kijk naar de verklikkers ⚑',cust=0;
      if(!told.has(s.ring)){told.add(s.ring);const dd=ringDead(s.ring);if(dd.length){det+=` · zonder stroom: ${dd.map(x=>x.id).join(', ')}`;cust=offOf(dd.flatMap(x=>x.groups));}}
      add('rs'+s.id,'crit',`Kabelfout ${secName(s)}`,det,{tab:'R'},cust);}
    else if((s.temp||0)>CABLE.max)add('rt'+s.id,'warn',`Kabel ${secName(s)} te warm`,`${Math.round(s.temp)} °C – verleg het normaal-open punt of zet flex in`,{tab:'K'});});
  RING.stations.forEach(s=>{const go={tab:'R',dev:s.id},off=offOf(s.groups);
    if(s.damaged)add('sd'+s.id,'crit',`${s.id} ${s.name} beschadigd`,s.damaged,go,off);
    else if(s.fuse)add('sf'+s.id,'warn',`${s.id}: zekeringen doorgeslagen`,'monteur onderweg met nieuwe zekeringen',go,off);
    else if(!stationLive(s)&&s.unplanned&&!told.has(s.ring)&&!s.burn)add('sx'+s.id,'warn',`${s.id} ${s.name} spanningsloos`,'',go,off);
    const hi=s.groups.filter(g=>g.U>U_MAX).length,lo=s.groups.filter(g=>g.U>0&&g.U<U_MIN).length;
    if(hi)add('lh'+s.id,'warn',`${s.id}: overspanning`,`${hi} straat${hi>1?'en':''} boven 253 V – verlaag de vaste trap (N)`,{tab:'L'});
    if(lo)add('ll'+s.id,'warn',`${s.id}: onderspanning`,`${lo} straat${lo>1?'en':''} onder 207 V`,{tab:'L'});
    if(s.gs?.state==='trip')add('gs'+s.id,'crit',`Noodaggregaat ${s.id} uitgevallen`,'overbelast – schakel straten af en herstart (N)',{tab:'L'});});
  stationFaults(add);   // koperdiefstal en trafobrand
  KLIC.jobs.forEach(j=>{if(!j.marked)add('kl'+j.id,'warn',`Graafwerk bij ${j.where}: ${j.c.name}`,`${j.firm} ${j.state==='plan'?`begint ${fmtClock(j.start)}`:'graaft nu'} – ${j.order?'monteur onderweg om aan te wijzen':'laat de kabels aanwijzen (tablet G)'}`,null);});
  const now=new Set(o.map(x=>x.key));for(const k in FSEEN)if(!now.has(k))delete FSEEN[k];o.forEach(x=>{FSEEN[x.key]??=SIM.t;x.since=FSEEN[x.key];});
  return o.sort((a,b)=>(a.sev==='crit'?0:1)-(b.sev==='crit'?0:1)||a.since-b.since);}
function renderFaults(){const el=$('#faultList');if(!el)return;const fs=activeFaults(),crit=fs.filter(f=>f.sev==='crit').length;
  const html=fs.length?fs.map(f=>`<div class="fl ${f.sev}${f.go?' go':''}" ${f.go?`data-fgo="${f.go.tab}|${f.go.dev||''}"`:''} title="${f.go?'Klik om in SCADA te tonen':''}"><span class="tm">${fmtClock(f.since)}</span><span class="lv"></span>
      <span><b>${f.title}</b> <i>· ${Math.max(0,Math.round(SIM.t-f.since))} min</i>${f.go?.view!=null?` <button class="mini fl-view" data-fview="${f.go.view}" title="Bekijk ter plaatse">👁 bekijk</button>`:''}${f.detail||f.cust?`<br><small>${f.detail||''}${f.cust?`${f.detail?' · ':''}${f.cust.toLocaleString('nl-NL')} klant${f.cust>1?'en':''} zonder stroom`:''}</small>`:''}</span></div>`).join('')
    :'<div class="fl-none">✓ Geen lopende storingen</div>';
  if(el._h!==html){el._h=html;el.innerHTML=html;}
  const c=$('#faultCnt');c.textContent=fs.length;c.classList.toggle('bad',crit>0);$('#faults').classList.toggle('has-crit',crit>0);
  const h=$('#faults').offsetHeight;if(h!==renderFaults.h){renderFaults.h=h;document.documentElement.style.setProperty('--faultH',(h?h+8:0)+'px');}}
$('#faultList').addEventListener('click',e=>{const v=e.target.closest('[data-fview]');if(v){const p=VIEWPOS[+v.dataset.fview];return flyTo(p[0].clone(),p[1].clone(),2.5);}const f=e.target.closest('[data-fgo]');if(!f)return;const [tab,dev]=f.dataset.fgo.split('|');setTab(tab);$('#scada').classList.remove('min');if(dev&&D[dev])selectDevice(dev);});
