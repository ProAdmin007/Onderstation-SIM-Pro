
// ============================================================ updatecontrole in het hoofdmenu: is er op GitHub een nieuwere versie?
// De build zet een vingerafdruk in BUILD_ID (tests/stamp.mjs) en houdt version.json bij met eerdere versies.
// Staat onze versie bij de eerdere versies op GitHub, dan is er een update; staat hij er niet in, dan is het eigen (nieuwer) werk.
const BUILD_ID='__OS_BUILD__';
const UPD_REPO='https://github.com/ProAdmin007/Onderstation-SIM-Pro';
const UPD_URL='https://raw.githubusercontent.com/ProAdmin007/Onderstation-SIM-Pro/main/version.json';
const UPD={state:'idle',remote:null,open:false,auto:false};   // idle, bezig, actueel, nieuw, eigen, fout
async function checkUpdate(url=UPD_URL){if(UPD.state==='bezig')return;UPD.state='bezig';renderUpdate();
  try{const r=await fetch(url+(url.startsWith('http')?`?t=${Date.now()}`:''),{cache:'no-store'});if(!r.ok)throw new Error(r.status);const v=await r.json();UPD.remote=v;
    UPD.state=v.build===BUILD_ID?'actueel':(v.previous||[]).includes(BUILD_ID)?'nieuw':'eigen';}
  catch(e){UPD.state='fout';}
  renderUpdate();}
function updateHtml(){const v=UPD.remote,d=v?.date?new Date(v.date).toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'}):'';
  const label={idle:'🔄 Controleer op update',bezig:'⏳ Controleren…',actueel:'✓ Je hebt de nieuwste versie',nieuw:'⬆ Nieuwe versie beschikbaar!',eigen:'✓ Eigen versie (nog niet op GitHub)',fout:'⚠ Controle mislukt – opnieuw proberen'}[UPD.state];
  return `<div class="upd-row"><button id="updBtn" class="mini ${UPD.state==='nieuw'?'upd-new':''}" title="Vergelijkt deze versie met die op GitHub">${label}</button>
    <span class="upd-v">versie ${BUILD_ID}${v&&UPD.state==='nieuw'?` · nieuw op GitHub: ${v.build} (${d})`:''}</span></div>
    ${UPD.open&&UPD.state==='nieuw'?`<div class="upd-box"><b>Er staat een nieuwere versie op GitHub</b> (${d}).<br><small>Download de nieuwe versie, pak hem uit en open <code>index.html</code>. Je opgeslagen spellen blijven bewaard zolang je de nieuwe versie op dezelfde plek zet.</small>
      <div class="upd-act"><a class="mini primary" href="${UPD_REPO}/archive/refs/heads/main.zip" target="_blank" rel="noopener">⬇ Download (ZIP)</a><a class="mini" href="${UPD_REPO}/commits/main" target="_blank" rel="noopener">Wat is er nieuw?</a><a class="mini" href="${UPD_REPO}" target="_blank" rel="noopener">Naar GitHub</a></div></div>`:''}`;}
function renderUpdate(){const el=$('#updWrap');if(el)el.innerHTML=updateHtml();}
// in het hoofdmenu: één keer per bezoek automatisch controleren (niet in de testmodus of bij direct starten)
function menuUpdate(){if(!$('#updWrap'))$('#menu').insertAdjacentHTML('afterbegin','<div id="updWrap"></div>');renderUpdate();
  if(!UPD.auto&&!LITE&&!params.has('autostart')&&navigator.onLine!==false){UPD.auto=true;checkUpdate();}}
document.addEventListener('click',e=>{if(!e.target.closest('#updBtn'))return;if(UPD.state==='nieuw'){UPD.open=!UPD.open;renderUpdate();}else checkUpdate();});
