
// ============================================================ updatecontrole in het hoofdmenu: is er op GitHub een nieuwere versie?
// De build zet een vingerafdruk in BUILD_ID (tests/stamp.mjs) en houdt version.json bij met eerdere versies.
// Staat onze versie bij de eerdere versies op GitHub, dan is er een update; staat hij er niet in, dan is het eigen (nieuwer) werk.
const BUILD_ID='__OS_BUILD__';
const UPD_REPO='https://github.com/ProAdmin007/Onderstation-SIM-Pro';
const UPD_URL='https://raw.githubusercontent.com/ProAdmin007/Onderstation-SIM-Pro/main/version.json';
// toestand van de controle: idle, bezig, actueel, nieuw, eigen of fout
const UPD={state:'idle',remote:null,open:false,auto:false,msg:'',busy:false,reload:()=>location.reload()};
const UPD_HTML='https://raw.githubusercontent.com/ProAdmin007/Onderstation-SIM-Pro/main/index.html';
// na een installatie: is de nieuwe versie echt geladen? (staat in de browseropslag tot de volgende start)
(()=>{let exp=null;try{exp=localStorage.getItem('osz-upd-expect');localStorage.removeItem('osz-upd-expect');}catch(e){}
  if(!exp)return;UPD.open=true;UPD.msg=exp===BUILD_ID?`✓ Bijgewerkt naar versie ${BUILD_ID}. Veel plezier!`:'Het nieuwe bestand is ergens anders opgeslagen dan het spel dat nu draait. Open dat bestand, of installeer opnieuw en kies dan de <code>index.html</code> in de map van het spel.';})();
// de nieuwe index.html ophalen en (Chrome/Edge) over de huidige heen zetten en herstarten; anders als download
async function installUpdate(url=UPD_HTML){if(UPD.busy)return;UPD.busy=true;UPD.msg='⏳ Nieuwe versie ophalen…';renderUpdate();
  try{const r=await fetch(url+(url.startsWith('http')?`?t=${Date.now()}`:''),{cache:'no-store'});if(!r.ok)throw new Error('download mislukt ('+r.status+')');const html=await r.text(),nb=(html.match(/BUILD_ID='([0-9a-f]{12})'/)||[])[1];
    if(!nb||!/OS Zuidwolde/.test(html))throw new Error('het gedownloade bestand is geen geldige versie');
    if(window.showSaveFilePicker){UPD.msg='Kies in het venster de <code>index.html</code> in de map van het spel en bevestig het vervangen.';renderUpdate();
      const h=await showSaveFilePicker({suggestedName:'index.html',types:[{description:'Onderstation Simulator (HTML)',accept:{'text/html':['.html']}}]}),w=await h.createWritable();await w.write(new Blob([html],{type:'text/html'}));await w.close();
      try{localStorage.setItem('osz-upd-expect',nb);}catch(e){}UPD.msg='✓ Opgeslagen – het spel herstart in de nieuwe versie…';renderUpdate();setTimeout(()=>UPD.reload(),700);}
    else{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));a.download='index.html';document.body.appendChild(a);a.click();a.remove();
      UPD.msg='✓ <code>index.html</code> is gedownload. Zet hem in de map van het spel (over de oude heen) en open hem: dan start de nieuwe versie. Je opgeslagen spellen blijven bewaard.';}}
  catch(e){UPD.msg=e.name==='AbortError'?'Installatie geannuleerd.':`⚠ Bijwerken mislukt: ${e.message}`;}
  UPD.busy=false;renderUpdate();}
async function checkUpdate(url=UPD_URL){if(UPD.state==='bezig')return;UPD.state='bezig';renderUpdate();
  try{const r=await fetch(url+(url.startsWith('http')?`?t=${Date.now()}`:''),{cache:'no-store'});if(!r.ok)throw new Error(r.status);const v=await r.json();UPD.remote=v;
    UPD.state=v.build===BUILD_ID?'actueel':(v.previous||[]).includes(BUILD_ID)?'nieuw':'eigen';}
  catch(e){UPD.state='fout';}
  renderUpdate();}
function updateHtml(){const v=UPD.remote,d=v?.date?new Date(v.date).toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'}):'';
  const label={idle:'🔄 Controleer op update',bezig:'⏳ Controleren…',actueel:'✓ Je hebt de nieuwste versie',nieuw:'⬆ Nieuwe versie beschikbaar!',eigen:'✓ Eigen versie (nog niet op GitHub)',fout:'⚠ Controle mislukt – opnieuw proberen'}[UPD.state];
  return `<div class="upd-row"><button id="updBtn" class="mini ${UPD.state==='nieuw'?'upd-new':''}" title="Vergelijkt deze versie met die op GitHub">${label}</button>
    <span class="upd-v">versie ${BUILD_ID}${v&&UPD.state==='nieuw'?` · nieuw op GitHub: ${v.build} (${d})`:''}</span></div>
    ${UPD.open&&(UPD.state==='nieuw'||UPD.msg)?`<div class="upd-box">${UPD.state==='nieuw'?`<b>Er staat een nieuwere versie op GitHub</b> (${d}).<br><small>${window.showSaveFilePicker?'Het spel haalt de nieuwe <code>index.html</code> op. Kies in het venster dat opent de huidige <code>index.html</code> in de map van het spel: die wordt vervangen en het spel herstart meteen in de nieuwe versie.':'Het spel downloadt de nieuwe <code>index.html</code>. Zet die over de oude heen en open hem.'} Je opgeslagen spellen blijven bewaard.</small>
      <div class="upd-act"><button class="mini primary" data-upd="install" ${UPD.busy?'disabled':''}>${window.showSaveFilePicker?'⬇ Nieuwe versie installeren':'⬇ Download index.html'}</button><a class="mini" href="${UPD_REPO}/commits/main" target="_blank" rel="noopener">Wat is er nieuw?</a></div>`:''}
      ${UPD.msg?`<div class="upd-msg">${UPD.msg}</div>`:''}</div>`:''}`;}
function renderUpdate(){const el=$('#updWrap');if(el)el.innerHTML=updateHtml();}
// in het hoofdmenu: één keer per bezoek automatisch controleren (niet in de testmodus of bij direct starten)
function menuUpdate(){if(!$('#updWrap'))$('#menu').insertAdjacentHTML('afterbegin','<div id="updWrap"></div>');renderUpdate();
  if(!UPD.auto&&!LITE&&!params.has('autostart')&&navigator.onLine!==false){UPD.auto=true;checkUpdate();}}
document.addEventListener('click',e=>{if(e.target.closest('[data-upd="install"]'))return installUpdate();if(!e.target.closest('#updBtn'))return;if(UPD.state==='nieuw'){UPD.open=!UPD.open;renderUpdate();}else checkUpdate();});
