
// ============================================================ weer en tijd (toets T)
// Tijdens de simulatie: het échte weer kiezen (of automatisch laten wisselen), een bui laten overtrekken en de tijd doorspoelen.
// Doorspoelen laat de simulatie in kleine stappen snel vooruitlopen: alle gebeurtenissen gebeuren gewoon, en bij een nieuwe storing stopt het.
// 'Alleen bekijken': klok, weer en seizoen schuiven om te kijken; de simulatie staat dan stil en alles komt terug zoals het was.
let PV_LAPSE=false,WT_OPEN=false,WT_SIG='',WT_T=0;
const FF={to:null,crit:0};
const pvOpen=()=>WT_OPEN;
const wetNow=()=>['regen','onweer','sneeuw'].includes(WX.type)||WX.cur.rain>0.3||WX.cur.thunder>0.3||WX.cur.snow>0.3;
const wtMode=()=>MODES[GAME.mode]||{};
const wtWeatherOk=()=>!wtMode().les&&!wtMode().scen;   // in lessen en scenario's hoort het weer bij de opdracht
const wtTimeOk=()=>!wtMode().les&&!GAME.ended;
function openWT(){if(WT_OPEN)return;if(!$('#intro').classList.contains('hidden'))return;WT_OPEN=true;WT_SIG='';renderWT();$('#pvBar').classList.remove('hidden');}
function closeWT(){if(PREVIEW)closePreview();WT_OPEN=false;$('#pvBar').classList.add('hidden');}
// ---- alleen bekijken
function openPreview(){if(PREVIEW)return;if(!$('#intro').classList.contains('hidden'))return;ffStop();WT_OPEN=true;
  PREVIEW={h:hourOf(),wx:JSON.parse(JSON.stringify({type:WX.type,lock:WX.lock,next:WX.next,cur:WX.cur,cover:WX.cover})),season:Object.keys(SEASONS).find(k=>SEASONS[k]===SEASON)};
  modalOpen('preview');if(FP.on)unlockPointer();PV_LAPSE=false;WT_SIG='';renderWT();$('#pvBar').classList.remove('hidden');document.body.classList.add('previewing');}
function closePreview(){if(!PREVIEW)return;const p=PREVIEW;PREVIEW=null;PV_LAPSE=false;
  Object.assign(WX,{type:p.wx.type,lock:p.wx.lock,next:p.wx.next,cover:p.wx.cover});Object.assign(WX.cur,p.wx.cur);
  if(SEASONS[p.season]!==SEASON){setSeason(p.season);applySnowCover?.();}
  lastEnvElev=-999;updateSky(hourOf());computeFlows();refreshAll();document.body.classList.remove('previewing');modalClose('preview');WT_SIG='';renderWT();}
// ---- het échte weer
function setRealWeather(k){if(!wtWeatherOk())return deny('In lessen en scenario\'s hoort het weer bij de opdracht');setWeather(k,true,false);pushAlarm(`Weer ingesteld: ${WX_TYPES[k].name.toLowerCase()} (verandert geleidelijk)`,'op');renderWT();}
function autoWeather(){WX.lock=false;WX.next=SIM.t+rnd(20,60);pushAlarm('Weer wisselt weer automatisch','op');renderWT();}
function skipRain(){if(!wtWeatherOk())return deny('In lessen en scenario\'s hoort het weer bij de opdracht');if(!wetNow())return deny('Het is droog');
  const dry=Object.keys(SEASON.wx).filter(k=>!['regen','onweer','sneeuw'].includes(k)),n=dry.includes('bewolkt')?'bewolkt':dry[0]||'helder';
  setWeather(n,false,false);WX.next=SIM.t+rnd(120,240);WX.cur.rain*=0.15;WX.cur.thunder=0;WX.cur.snow*=0.3;
  pushAlarm('⏭ De bui trekt over – het wordt droog','op');renderWT();updateHUD();}
// ---- doorspoelen tot een tijdstip (speltijd in minuten)
function ffStart(min){if(!wtTimeOk())return deny('Doorspoelen kan niet tijdens een les');if(PREVIEW)closePreview();
  FF.to=(FF.to??SIM.t)+min;if(GAME.endT)FF.to=Math.min(FF.to,GAME.endT);FF.crit=ALARM_CRIT;if(SIM.paused&&!menuOpen?.())SIM.paused=false;renderWT();}
function ffStop(why){if(FF.to==null)return;FF.to=null;if(why)pushAlarm(`⏩ Doorspoelen gestopt om ${fmtClock(SIM.t)}: ${why}`,'warn');renderWT();}
// in de hoofdlus in plaats van één gewone simulatiestap: zoveel kleine stappen als in het tijdbudget passen
function ffTick(){const end=performance.now()+(LITE?40:9),step=0.25*60/SIM.speed;
  while(FF.to!=null&&SIM.t<FF.to&&performance.now()<end){if(SIM.paused||GAME.ended)return ffStop(GAME.ended?'de dienst is afgelopen':null);simStep(step);
    if(ALARM_CRIT>FF.crit)return ffStop('er is een storing');}
  if(FF.to!=null&&SIM.t>=FF.to){FF.to=null;pushAlarm(`⏩ Doorgespoeld tot ${fmtClock(SIM.t)}`,'op');renderWT();}}
// ---- venster
const pvClock=h=>`${String(Math.floor(h)).padStart(2,'0')}:${String(Math.floor((h%1)*60)).padStart(2,'0')}`;
function renderWT(){if(!WT_OPEN)return;const el=$('#pvBar');
  if(PREVIEW){const cur=Object.keys(SEASONS).find(k=>SEASONS[k]===SEASON);
    el.innerHTML=`<div class="pv-t"><b>👁 Alleen bekijken</b><span>de simulatie staat stil · bij terugkeren is alles weer zoals het was</span></div>
    <div class="pv-time"><button class="mini" data-pv="lapse" title="Tijd versneld laten lopen">${PV_LAPSE?'⏸':'▶'}</button><input type="range" min="0" max="24" step="0.0833" value="${PREVIEW.h.toFixed(3)}" data-pvh><b id="pvClock">${pvClock(PREVIEW.h)}</b></div>
    <div class="pv-wx">${Object.entries(WX_TYPES).map(([k,t])=>`<button class="mini ${WX.type===k?'on':''}" data-pvwx="${k}" title="${t.name}">${t.icon}</button>`).join('')}</div>
    <select data-pvs>${Object.entries(SEASONS).map(([k,s])=>`<option value="${k}" ${k===cur?'selected':''}>${s.name}</option>`).join('')}</select>
    <button class="primary" data-pv="back">Terug naar de dienst</button>`;return;}
  const wOk=wtWeatherOk(),tOk=wtTimeOk();WT_SIG=wtSig();
  el.innerHTML=`<div class="pv-t"><b>🌤 Weer en tijd</b><span id="wtNow">${wtNowText()}</span></div>
    <div class="pv-row"><span class="pv-l">Weer</span><div class="pv-wx">${Object.entries(WX_TYPES).map(([k,t])=>`<button class="mini ${WX.type===k&&WX.lock?'on':''}" data-wt="${k}" title="${t.name}" ${wOk?'':'disabled'}>${t.icon}</button>`).join('')}</div>
      <button class="mini ${WX.lock?'':'on'}" data-wt="auto" title="Het weer wisselt vanzelf" ${wOk?'':'disabled'}>🔄 Automatisch</button>
      ${wetNow()&&wOk?'<button class="mini primary" data-wt="skip" title="Regen, onweer of sneeuw laten overtrekken">⏭ Bui laten overtrekken</button>':''}</div>
    <div class="pv-row"><span class="pv-l">Tijd</span>${FF.to!=null?`<b class="pv-ff">⏩ doorspoelen tot ${fmtClock(FF.to)}…</b><button class="mini" data-ff="stop">⏹ Stop</button>`
      :[[15,'+15 min'],[60,'+1 uur'],[180,'+3 uur']].map(([m,l])=>`<button class="mini" data-ff="${m}" ${tOk?'':'disabled'} title="De simulatie snel laten doorlopen; stopt bij een nieuwe storing">⏩ ${l}</button>`).join('')}</div>
    ${wOk?'':'<small class="pv-note">In lessen en scenario\'s hoort het weer bij de opdracht.</small>'}
    <div class="pv-row"><button class="mini" data-pv="view" title="Klok, weer en seizoen schuiven om te kijken; de simulatie staat dan stil">👁 Alleen bekijken…</button>
      <button class="primary" data-pv="close">Sluiten <kbd>T</kbd></button></div>`;}
const wtSig=()=>[WX.type,WX.lock,wetNow(),FF.to,wtWeatherOk(),wtTimeOk()].join();
const wtNowText=()=>`${fmtClock(SIM.t)} · ${WX_TYPES[WX.type].name}${WX.lock?' (vast)':''} · ${Math.round(ambient())} °C`;
// elke frame: versneld bekijken; het venster bijwerken als er iets veranderd is
function previewTick(dt){if(PREVIEW&&PV_LAPSE){PREVIEW.h=(PREVIEW.h+dt*1.5)%24;const r=$('#pvBar [data-pvh]');if(r)r.value=PREVIEW.h.toFixed(3);$('#pvClock').textContent=pvClock(PREVIEW.h);}
  if(WT_OPEN&&!PREVIEW&&(WT_T+=dt)>0.4){WT_T=0;if(wtSig()!==WT_SIG)renderWT();else{const n=$('#wtNow');if(n)n.textContent=wtNowText();}}}
$('#pvBar').addEventListener('input',e=>{if(!PREVIEW)return;if(e.target.matches('[data-pvh]')){PREVIEW.h=+e.target.value;$('#pvClock').textContent=pvClock(PREVIEW.h);updateSky(PREVIEW.h);}});
$('#pvBar').addEventListener('change',e=>{if(!PREVIEW)return;const s=e.target.closest('[data-pvs]');if(s){setSeason(s.value);applySnowCover?.();updateSky(PREVIEW.h);}});
$('#pvBar').addEventListener('click',e=>{const b=e.target.closest('[data-pv],[data-wt],[data-ff],[data-pvwx]');if(!b)return;const d=b.dataset;
  if(d.pv==='close')return closeWT();if(d.pv==='view')return openPreview();if(d.pv==='back')return closePreview();if(d.pv==='lapse'){PV_LAPSE=!PV_LAPSE;return renderWT();}
  if(d.pvwx&&PREVIEW){setWeather(d.pvwx,true,true);applySnowCover?.();updateSky(PREVIEW.h);return renderWT();}
  if(d.wt==='auto')return autoWeather();if(d.wt==='skip')return skipRain();if(d.wt)return setRealWeather(d.wt);
  if(d.ff==='stop')return ffStop();if(d.ff)return ffStart(+d.ff);});
$('#pvBtn').addEventListener('click',()=>WT_OPEN?closeWT():openWT());
$('#wx').addEventListener('click',()=>WT_OPEN?closeWT():openWT());
$('#wxSkip').addEventListener('click',e=>{e.stopPropagation();skipRain();});
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'&&e.target.type!=='range'||e.target.tagName==='SELECT'||e.ctrlKey||e.metaKey)return;if((e.key==='t'||e.key==='T')&&$('#intro').classList.contains('hidden'))WT_OPEN?closeWT():openWT();});
