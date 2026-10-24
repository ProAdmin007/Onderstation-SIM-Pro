
// ============================================================ instellingen (toets I): prestaties, weer en seizoen, geluid
const AUDIO_LABELS={master:'Hoofdvolume',omgeving:'Omgeving (brom, verkeer, vogels, regen)',schakel:'Schakelen (vermogenschakelaars, motoren, vlambogen)',alarm:'Meldingen en alarmen',telefoon:'Telefoon'};
// geluidsvolumes uit de browser terugzetten (werkt ook vóór het eerste geluid)
try{const v=JSON.parse(localStorage.getItem('osz-audio')||'{}');if(v.master!=null)AudioSys.vol=v.master;AUDIO_BUSES.forEach(k=>{if(v[k]!=null)AudioSys.busVol[k]=v[k];});}catch(e){}
const DYN={k:1,low:0,high:0,t:0,told:false,env:GFX.env};
const applyRes=()=>{renderer.setPixelRatio(Math.min(devicePixelRatio,1.75)*GFX.scale*(GFX.autoRes!==false?DYN.k:1));renderer.setSize(innerWidth,innerHeight);};
const saveGfx=()=>{try{localStorage.setItem('osz-gfx',JSON.stringify(GFX));}catch(e){}};
const saveAudio=()=>{try{localStorage.setItem('osz-audio',JSON.stringify({master:AudioSys.vol,...AudioSys.busVol}));}catch(e){}};
// grafische instellingen direct toepassen
function applyGfx(){saveGfx();if(LITE)return;
  applyRes();
  const sh=GFX.shadows!=='uit',size=shadowSize();
  if(renderer.shadowMap.enabled!==sh){renderer.shadowMap.enabled=sh;scene.traverse(o=>{if(o.material)[].concat(o.material).forEach(m=>m.needsUpdate=true);});}
  if(sun.shadow.mapSize.x!==size){sun.shadow.mapSize.set(size,size);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}}
  if(GFX.env&&!DYN.env)lastEnvElev=-999;DYN.env=GFX.env;SHADOW_DIRTY=true;$('#fps').classList.toggle('on',!!GFX.meter);}
function setGfx(k,v){if(k==='preset'){Object.assign(GFX,GFX_PRESETS[v]);GFX.preset=v;}else{GFX[k]=v;GFX.preset='eigen';}applyGfx();renderSettings();}
// beeldfrequentie-meter en automatische resolutie: haalt de computer de beeldfrequentie niet, dan gaat de resolutie in stapjes omlaag
// (tot 60%); is er weer ruim marge, dan stap voor stap terug omhoog. Niet bewaard: elke keer opnieuw bepaald.
let fpsN=0,fpsT=0;function fpsTick(dt){fpsN++;fpsT+=dt;if(fpsT<0.5)return;const fps=fpsN/fpsT;
  if(GFX.meter)$('#fps').textContent=`${Math.round(fps)} fps${DYN.k<1?` · ${Math.round(DYN.k*100)}%`:''}`;fpsN=0;fpsT=0;
  if(LITE&&!DYN.test||GFX.autoRes===false||document.hidden||!$('#intro').classList.contains('hidden'))return;const goal=Math.min(60,GFX.fps||60);DYN.t+=0.5;
  DYN.low=fps<goal*0.72?DYN.low+1:0;DYN.high=fps>goal*0.95?DYN.high+1:0;
  if(DYN.low>=4&&DYN.k>0.6&&DYN.t>4){DYN.k=Math.max(0.6,+(DYN.k-0.1).toFixed(2));DYN.low=0;DYN.t=0;applyRes();
    if(!DYN.told){DYN.told=true;pushAlarm(`Het beeld haperde: de resolutie is automatisch verlaagd naar ${Math.round(DYN.k*100)}%. Uitzetten of zelf kiezen: Instellingen (I) → Prestaties`,'info');}}
  else if(DYN.high>=12&&DYN.k<1&&DYN.t>8){DYN.k=Math.min(1,+(DYN.k+0.1).toFixed(2));DYN.high=0;DYN.t=0;applyRes();}}
// ---- venster
let setPrev=false;
const setOpen=()=>!$('#settings').classList.contains('hidden');
function openSettings(){if(setOpen())return;modalOpen('set');if(FP.on)unlockPointer();$('#settings').classList.remove('hidden');renderSettings();}
function closeSettings(){$('#settings').classList.add('hidden');modalClose('set');}
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
    <div class="st-tgs">${tog('env','Omgevingslicht volgt de zon','Herberekent de lichtreflecties als de zon beweegt (zwaar op trage computers)')}${tog('life','Verkeer en buren in de wijk')}${tog('particles','Regen en sneeuw')}${tog('autoRes','Resolutie automatisch verlagen bij haperen','Haalt de computer de beeldfrequentie niet, dan gaat de resolutie vanzelf een stapje omlaag (tot 60%)')}${tog('meter','Toon beelden per seconde')}</div>
    <div class="mh">Weer en seizoen</div>
    <div class="st-row"><span>Muis</span><div class="seg"><button data-mouse="kaart" class="${MOUSE_MODE==='kaart'?'on':''}" title="Links slepen schuift, rechts slepen draait (zoals een online kaart)">🗺 Kaart</button><button data-mouse="klassiek" class="${MOUSE_MODE==='klassiek'?'on':''}" title="Links slepen draait, rechts slepen schuift">↻ Klassiek</button></div></div>
    <div class="st-row"><span>Weer en tijd</span><div class="seg"><button data-pvopen title="Weer kiezen, een bui laten overtrekken, de tijd doorspoelen of alleen bekijken">🌤 Weer en tijd <kbd>T</kbd></button></div></div>
    <div class="st-row"><span>Weer</span><div class="seg">${Object.entries(WX_TYPES).map(([k,t])=>`<button data-wx="${k}" class="${WX.lock&&WX.type===k?'on':''}" title="${t.name}">${t.icon} ${t.name}</button>`).join('')}<button data-wx="auto" class="${WX.lock?'':'on'}">🔄 Automatisch</button></div></div>
    <div class="st-row"><span>Seizoen</span><div class="seg">${Object.entries(SEASONS).map(([k,s])=>`<button data-season="${k}" class="${SEASON===s?'on':''}">${s.name}</button>`).join('')}</div></div>
    <p class="bf-desc">Het weer verandert geleidelijk (direct: dubbelklik). Automatisch laat het weer vanzelf wisselen. Een ander seizoen verandert ook de datum, de zon, de temperatuur en de belasting.${MODES[GAME.mode]?.scen?' <b class="warnc">Let op: in een scenario kan dit de opgave makkelijker of moeilijker maken.</b>':''}</p>
    <div class="mh">Geluid</div>${['master',...AUDIO_BUSES].map(vol).join('')}
    <div class="st-tgs"><label class="st-tog"><input type="checkbox" data-mute ${AudioSys.muted?'checked':''}><span>Geluid uit (M)</span></label></div>
    <div class="rep-btns"><button class="primary" data-sclose>Sluiten <kbd>I</kbd></button><button data-sreset>Standaardwaarden</button></div></div>`;}
$('#settings').addEventListener('click',e=>{const mm=e.target.closest('[data-mouse]');if(mm){setMouseMode(mm.dataset.mouse);return renderSettings();}if(e.target.closest('[data-pvopen]')){closeSettings();return openWT();}if(e.target.closest('[data-sclose]')||e.target.id==='settings')return closeSettings();
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
