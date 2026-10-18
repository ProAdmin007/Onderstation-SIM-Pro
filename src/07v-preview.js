
// ============================================================ weer en tijd bekijken (toets T): klok schuiven, weer en seizoen kiezen – alleen visueel
// De simulatie staat stil en rekent door op de echte tijd; bij terugkeren staan weer en seizoen weer zoals ze waren.
let PV_LAPSE=false;
const pvOpen=()=>!!PREVIEW;
function openPreview(){if(PREVIEW)return;if(!$('#intro').classList.contains('hidden'))return;
  PREVIEW={h:hourOf(),wx:JSON.parse(JSON.stringify({type:WX.type,lock:WX.lock,next:WX.next,cur:WX.cur,cover:WX.cover})),season:Object.keys(SEASONS).find(k=>SEASONS[k]===SEASON)};
  modalOpen('preview');if(FP.on)unlockPointer();PV_LAPSE=false;renderPreview();$('#pvBar').classList.remove('hidden');document.body.classList.add('previewing');}
function closePreview(){if(!PREVIEW)return;const p=PREVIEW;PREVIEW=null;PV_LAPSE=false;
  Object.assign(WX,{type:p.wx.type,lock:p.wx.lock,next:p.wx.next,cover:p.wx.cover});Object.assign(WX.cur,p.wx.cur);
  if(SEASONS[p.season]!==SEASON){setSeason(p.season);applySnowCover?.();}
  lastEnvElev=-999;updateSky(hourOf());computeFlows();refreshAll();
  $('#pvBar').classList.add('hidden');document.body.classList.remove('previewing');modalClose('preview');}
const pvClock=h=>`${String(Math.floor(h)).padStart(2,'0')}:${String(Math.floor((h%1)*60)).padStart(2,'0')}`;
function renderPreview(){if(!PREVIEW)return;const cur=Object.keys(SEASONS).find(k=>SEASONS[k]===SEASON);
  $('#pvBar').innerHTML=`<div class="pv-t"><b>🌤 Weer en tijd bekijken</b><span>alleen kijken · de simulatie staat stil</span></div>
    <div class="pv-time"><button class="mini" data-pv="lapse" title="Tijd versneld laten lopen">${PV_LAPSE?'⏸':'▶'}</button><input type="range" min="0" max="24" step="0.0833" value="${PREVIEW.h.toFixed(3)}" data-pvh><b id="pvClock">${pvClock(PREVIEW.h)}</b></div>
    <div class="pv-wx">${Object.entries(WX_TYPES).map(([k,t])=>`<button class="mini ${WX.type===k?'on':''}" data-pvwx="${k}" title="${t.name}">${t.icon}</button>`).join('')}</div>
    <select data-pvs>${Object.entries(SEASONS).map(([k,s])=>`<option value="${k}" ${k===cur?'selected':''}>${s.name}</option>`).join('')}</select>
    <button class="primary" data-pv="close">Terug naar de dienst <kbd>T</kbd></button>`;}
function previewTick(dt){if(!PREVIEW||!PV_LAPSE)return;PREVIEW.h=(PREVIEW.h+dt*1.5)%24;const r=$('#pvBar [data-pvh]');if(r)r.value=PREVIEW.h.toFixed(3);$('#pvClock').textContent=pvClock(PREVIEW.h);}
$('#pvBar').addEventListener('input',e=>{if(!PREVIEW)return;if(e.target.matches('[data-pvh]')){PREVIEW.h=+e.target.value;$('#pvClock').textContent=pvClock(PREVIEW.h);updateSky(PREVIEW.h);}});
$('#pvBar').addEventListener('change',e=>{if(!PREVIEW)return;const s=e.target.closest('[data-pvs]');if(s){setSeason(s.value);applySnowCover?.();updateSky(PREVIEW.h);}});
$('#pvBar').addEventListener('click',e=>{if(!PREVIEW)return;const b=e.target.closest('[data-pv]');
  if(b?.dataset.pv==='close')return closePreview();if(b?.dataset.pv==='lapse'){PV_LAPSE=!PV_LAPSE;return renderPreview();}
  const w=e.target.closest('[data-pvwx]');if(w){setWeather(w.dataset.pvwx,true,true);applySnowCover?.();updateSky(PREVIEW.h);renderPreview();}});
$('#pvBtn').addEventListener('click',()=>PREVIEW?closePreview():openPreview());
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'&&e.target.type!=='range'||e.target.tagName==='SELECT'||e.ctrlKey||e.metaKey)return;if((e.key==='t'||e.key==='T')&&$('#intro').classList.contains('hidden'))PREVIEW?closePreview():openPreview();});
