
// ============================================================ instellingen (toets I): prestaties, weer en seizoen, geluid
const AUDIO_LABELS={master:'Hoofdvolume',omgeving:'Omgeving (brom, verkeer, vogels, regen)',schakel:'Schakelen (vermogenschakelaars, motoren, vlambogen)',alarm:'Meldingen en alarmen',telefoon:'Telefoon'};
// geluidsvolumes uit de browser terugzetten (werkt ook vóór het eerste geluid)
try{const v=JSON.parse(localStorage.getItem('osz-audio')||'{}');if(v.master!=null)AudioSys.vol=v.master;AUDIO_BUSES.forEach(k=>{if(v[k]!=null)AudioSys.busVol[k]=v[k];});}catch(e){}
const saveGfx=()=>{try{localStorage.setItem('osz-gfx',JSON.stringify(GFX));}catch(e){}};
const saveAudio=()=>{try{localStorage.setItem('osz-audio',JSON.stringify({master:AudioSys.vol,...AudioSys.busVol}));}catch(e){}};
// grafische instellingen direct toepassen
function applyGfx(){saveGfx();if(LITE)return;
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75)*GFX.scale);renderer.setSize(innerWidth,innerHeight);
  const sh=GFX.shadows!=='uit',size=shadowSize();
  if(renderer.shadowMap.enabled!==sh){renderer.shadowMap.enabled=sh;scene.traverse(o=>{if(o.material)[].concat(o.material).forEach(m=>m.needsUpdate=true);});}
  if(sun.shadow.mapSize.x!==size){sun.shadow.mapSize.set(size,size);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}}
  if(GFX.env)lastEnvElev=-999;$('#fps').classList.toggle('on',!!GFX.meter);}
function setGfx(k,v){if(k==='preset'){Object.assign(GFX,GFX_PRESETS[v]);GFX.preset=v;}else{GFX[k]=v;GFX.preset='eigen';}applyGfx();renderSettings();}
// beeldfrequentie-meter
let fpsN=0,fpsT=0;function fpsTick(dt){fpsN++;fpsT+=dt;if(fpsT>=0.5){if(GFX.meter)$('#fps').textContent=`${Math.round(fpsN/fpsT)} fps`;fpsN=0;fpsT=0;}}
// ---- venster
let setPrev=false;
const setOpen=()=>!$('#settings').classList.contains('hidden');
function openSettings(){if(setOpen())return;setPrev=SIM.paused;SIM.paused=true;syncSpeed();if(FP.on)unlockPointer();$('#settings').classList.remove('hidden');renderSettings();}
function closeSettings(){$('#settings').classList.add('hidden');SIM.paused=setPrev;syncSpeed();}
function renderSettings(){if(!setOpen())return;
  const seg=(k,opts)=>`<div class="seg">${opts.map(([v,l])=>`<button data-g="${k}:${v}" class="${String(GFX[k])===String(v)?'on':''}">${l}</button>`).join('')}</div>`;
  const tog=(k,l,tip)=>`<label class="st-tog" title="${tip||''}"><input type="checkbox" data-gt="${k}" ${GFX[k]?'checked':''}><span>${l}</span></label>`;
  const vol=k=>{const v=k==='master'?AudioSys.vol:(AudioSys.busVol[k]??1);return `<div class="st-row"><span>${AUDIO_LABELS[k]}</span><input type="range" min="0" max="${k==='master'?1:1.5}" step="0.05" value="${v}" data-av="${k}"><em>${Math.round(v*100)}%</em></div>`;};
  $('#settings').innerHTML=`<div class="card pr st"><div class="eyebrow">Instellingen</div><h2>Instellingen</h2>
    <div class="mh">Prestaties</div>
    <div class="st-row"><span>Voorinstelling</span>${seg('preset',[['laag','Laag'],['midden','Midden'],['hoog','Hoog']])}${GFX.preset==='eigen'?'<em class="warnc">eigen</em>':''}</div>
    <div class="st-row"><span>Resolutie</span><input type="range" min="0.4" max="1" step="0.05" value="${GFX.scale}" data-gs="scale"><em>${Math.round(GFX.scale*100)}%</em></div>
    <div class="st-row"><span>Schaduwen</span>${seg('shadows',[['uit','Uit'],['laag','Laag'],['hoog','Hoog']])}</div>
    <div class="st-row"><span>Max. beelden per seconde</span>${seg('fps',[[30,'30'],[60,'60'],[0,'onbeperkt']])}</div>
    <div class="st-tgs">${tog('env','Omgevingslicht volgt de zon','Herberekent de lichtreflecties als de zon beweegt (zwaar op trage computers)')}${tog('life','Verkeer en buren in de wijk')}${tog('particles','Regen en sneeuw')}${tog('meter','Toon beelden per seconde')}</div>
    <div class="mh">Weer en seizoen</div>
    <div class="st-row"><span>Weer</span><div class="seg">${Object.entries(WX_TYPES).map(([k,t])=>`<button data-wx="${k}" class="${WX.lock&&WX.type===k?'on':''}" title="${t.name}">${t.icon} ${t.name}</button>`).join('')}<button data-wx="auto" class="${WX.lock?'':'on'}">🔄 Automatisch</button></div></div>
    <div class="st-row"><span>Seizoen</span><div class="seg">${Object.entries(SEASONS).map(([k,s])=>`<button data-season="${k}" class="${SEASON===s?'on':''}">${s.name}</button>`).join('')}</div></div>
    <p class="bf-desc">Het weer verandert geleidelijk (direct: dubbelklik). Automatisch laat het weer vanzelf wisselen. Een ander seizoen verandert ook de datum, de zon, de temperatuur en de belasting.${MODES[GAME.mode]?.scen?' <b class="warnc">Let op: in een scenario kan dit de opgave makkelijker of moeilijker maken.</b>':''}</p>
    <div class="mh">Geluid</div>${['master',...AUDIO_BUSES].map(vol).join('')}
    <div class="st-tgs"><label class="st-tog"><input type="checkbox" data-mute ${AudioSys.muted?'checked':''}><span>Geluid uit (M)</span></label></div>
    <div class="rep-btns"><button class="primary" data-sclose>Sluiten <kbd>I</kbd></button><button data-sreset>Standaardwaarden</button></div></div>`;}
$('#settings').addEventListener('click',e=>{if(e.target.closest('[data-sclose]')||e.target.id==='settings')return closeSettings();
  const g=e.target.closest('[data-g]');if(g){const [k,v]=g.dataset.g.split(':');return setGfx(k,k==='fps'?+v:v);}
  const w=e.target.closest('[data-wx]');if(w){const k=w.dataset.wx;if(k==='auto'){WX.lock=false;WX.next=SIM.t;pushAlarm('Weer: weer automatisch wisselen','op');}else{setWeather(k,true,e.detail>1);pushAlarm(`Weer ingesteld: ${WX_TYPES[k].icon} ${WX_TYPES[k].name}`,'op');}updateSky(hourOf());renderSettings();return;}
  const s=e.target.closest('[data-season]');if(s){setSeason(s.dataset.season);GAME.season=s.dataset.season;applySnowCover?.();updateSky(hourOf());refreshAll();updateHUD();pushAlarm(`Seizoen: ${SEASON.name}`,'op');renderSettings();return;}
  if(e.target.closest('[data-sreset]')){Object.assign(GFX,GFX_PRESETS.hoog,{preset:'hoog',meter:false});applyGfx();AudioSys.setVol('master',0.9);AUDIO_BUSES.forEach(k=>AudioSys.setVol(k,1));saveAudio();renderSettings();}});
$('#settings').addEventListener('input',e=>{const t=e.target;
  if(t.dataset.av){AudioSys.setVol(t.dataset.av,+t.value);t.nextElementSibling.textContent=Math.round(t.value*100)+'%';saveAudio();}
  if(t.dataset.gs){GFX[t.dataset.gs]=+t.value;GFX.preset='eigen';t.nextElementSibling.textContent=Math.round(t.value*100)+'%';applyGfx();}});
$('#settings').addEventListener('change',e=>{const t=e.target;if(t.dataset.gt){GFX[t.dataset.gt]=t.checked;GFX.preset='eigen';applyGfx();renderSettings();}if(t.hasAttribute('data-mute'))$('#mute').click();});
$('#settingsBtn').addEventListener('click',()=>setOpen()?closeSettings():openSettings());
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;if((e.key==='i'||e.key==='I')&&$('#intro').classList.contains('hidden'))setOpen()?closeSettings():openSettings();});
applyGfx();
