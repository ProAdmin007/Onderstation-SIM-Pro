
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
  if(!exp)return;UPD.open=true;setTimeout(()=>{if(UPD.state!=='nieuw'){UPD.msg='';UPD.open=false;renderUpdate();}},30000);   // melding na een halve minuut weg
  if(exp!==BUILD_ID)UPD_DB.del('gameFile').catch(()=>{});UPD.msg=exp===BUILD_ID?`✓ Bijgewerkt naar versie ${BUILD_ID}. Veel plezier!`:'Het bijgewerkte bestand is niet het bestand dat nu draait. Open dat bestand, of installeer opnieuw en wijs dan de <code>index.html</code> aan waarmee je het spel opent.';})();
// ---- het bestand van het spel onthouden (Chrome/Edge): één keer aanwijzen, daarna schrijft de update er direct overheen
// De koppeling (FileSystemFileHandle) staat in IndexedDB; de browser vraagt zo nodig toestemming om het bestand te wijzigen.
const UPD_DB={open:()=>new Promise((ok,no)=>{const q=indexedDB.open('osz-update',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);}),
  async get(k){const db=await this.open();return new Promise(ok=>{const q=db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>ok(q.result);q.onerror=()=>ok(null);});},
  async set(k,v){const db=await this.open();return new Promise(ok=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>ok(true);t.onerror=()=>ok(false);});},
  async del(k){const db=await this.open();return new Promise(ok=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').delete(k);t.oncomplete=()=>ok(true);});}};
UPD.store=UPD_DB;
// is dit bestand de simulator? (dan mag hij overschreven worden)
async function isGameFile(h){try{const t=await (await h.getFile()).text();return /OS Zuidwolde/.test(t)&&/BUILD_ID=/.test(t);}catch(e){return false;}}
async function writeOverGame(html,nb){let h=null;try{h=await UPD.store.get('gameFile');}catch(e){}
  // bewaarde koppeling: toestemming vragen (één klik, of niets als je eerder 'altijd toestaan' koos)
  if(h){let p='prompt';try{p=await h.queryPermission({mode:'readwrite'});if(p!=='granted')p=await h.requestPermission({mode:'readwrite'});}catch(e){p='denied';}
    if(p!=='granted'||!await isGameFile(h))h=null;}
  if(!h){UPD.msg='Wijs één keer de <code>index.html</code> van het spel aan (in de map waar je het spel opent). Daarna gaan updates vanzelf.';renderUpdate();
    [h]=await showOpenFilePicker({types:[{description:'Onderstation Simulator (index.html)',accept:{'text/html':['.html']}}],excludeAcceptAllOption:false,multiple:false});
    if(await h.requestPermission({mode:'readwrite'})!=='granted')throw new Error('geen toestemming om het bestand te wijzigen');
    if(!await isGameFile(h))throw new Error('dit bestand is niet de simulator – kies de index.html van het spel');
    try{await UPD.store.set('gameFile',h);}catch(e){}}
  const w=await h.createWritable();await w.write(new Blob([html],{type:'text/html'}));await w.close();
  try{localStorage.setItem('osz-upd-expect',nb);}catch(e){}UPD.msg='✓ Bijgewerkt – het spel herstart in de nieuwe versie…';renderUpdate();setTimeout(()=>UPD.reload(),700);}
// de nieuwe index.html ophalen en (Chrome/Edge) over het spel heen schrijven en herstarten; anders als download
async function installUpdate(url=UPD_HTML){if(UPD.busy)return;UPD.busy=true;UPD.msg='⏳ Nieuwe versie ophalen…';renderUpdate();
  try{const r=await fetch(url+(url.startsWith('http')?`?t=${Date.now()}`:''),{cache:'no-store'});if(!r.ok)throw new Error('download mislukt ('+r.status+')');const html=await r.text(),nb=(html.match(/BUILD_ID='([0-9a-f]{12})'/)||[])[1];
    if(!nb||!/OS Zuidwolde/.test(html))throw new Error('het gedownloade bestand is geen geldige versie');
    if(window.showOpenFilePicker){await writeOverGame(html,nb);}
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
    <span class="upd-v" title="Versie-ID van dit bestand. Het spel vergelijkt hem bij het openen van het menu met de versie op GitHub; is er een nieuwere, dan knippert de knop en installeer je hem met één klik.">versie ${BUILD_ID}${v&&UPD.state==='nieuw'?` · nieuw op GitHub: ${v.build} (${d})`:''}</span></div>
    ${UPD.open&&(UPD.state==='nieuw'||UPD.msg)?`<div class="upd-box">${UPD.state==='nieuw'?`<b>Er staat een nieuwere versie op GitHub</b> (${d}).<br><small>${window.showOpenFilePicker?'Het spel haalt de nieuwe <code>index.html</code> op, schrijft hem over het huidige bestand heen en herstart meteen. De eerste keer wijs je één keer de <code>index.html</code> van het spel aan; daarna gaat het vanzelf (de browser vraagt hooguit om toestemming).':'Het spel downloadt de nieuwe <code>index.html</code>. Zet die over de oude heen en open hem.'} Je opgeslagen spellen blijven bewaard.</small>
      <div class="upd-act"><button class="mini primary" data-upd="install" ${UPD.busy?'disabled':''}>${window.showOpenFilePicker?'⬇ Nieuwe versie installeren':'⬇ Download index.html'}</button><a class="mini" href="${UPD_REPO}/commits/main" target="_blank" rel="noopener">Wat is er nieuw?</a></div>`:''}
      ${UPD.msg?`<div class="upd-msg">${UPD.msg}</div>`:''}</div>`:''}`;}
function renderUpdate(){const el=$('#updWrap');if(el)el.innerHTML=updateHtml();}
// in het hoofdmenu: één keer per bezoek automatisch controleren (niet in de testmodus of bij direct starten)
function menuUpdate(){if(!$('#updWrap'))$('#menu').insertAdjacentHTML('afterbegin','<div id="updWrap"></div>');renderUpdate();
  if(!UPD.auto&&!LITE&&!params.has('autostart')&&navigator.onLine!==false){UPD.auto=true;checkUpdate();}}
document.addEventListener('click',e=>{if(e.target.closest('[data-upd="install"]'))return installUpdate();if(!e.target.closest('#updBtn'))return;if(UPD.state==='nieuw'){UPD.open=!UPD.open;renderUpdate();}else checkUpdate();});
