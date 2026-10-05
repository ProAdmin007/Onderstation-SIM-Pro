
// ============================================================ toetsenoverzicht (toets H of ?)
const KEY_HELP=[
  ['Spel',[['Spatie','Pauze aan/uit (ook P)'],['Esc','Venster of paneel sluiten, anders het pauzemenu'],['Ctrl+S','Spel opslaan (vrije dienst, dag- en avonddienst)'],['M','Geluid aan/uit'],['H of ?','Dit overzicht']]],
  ['Camera en kijken',[['1 – 9','Camerastandpunten (6 = binnen 10 kV, 7 = binnen 20 kV, 8 = woonwijk, 9 = centrum)'],['L','Labels aan/uit'],['+ / −','SCADA in- en uitzoomen (ook Ctrl + scrollwiel op het schema)']]],
  ['Rondlopen',[['V','Rondlopen starten of stoppen'],['W A S D','Lopen'],['Shift / Q','Rennen / sprinten'],['Spatie','Springen'],['F','Schakelaar in het vizier direct bedienen'],['E','Cursor vrij (paneel open van wat je ziet); nog eens E = verder lopen'],['Z','Zaklamp aan/uit']]],
  ['Vensters',[['B','Beveiligingsinstellingen'],['C','Flex en netcongestie'],['O','Onderhoud: conditie van schakelaars en relaistests'],['K','Testkoffer (tijdens een relaistest)'],['I','Instellingen: prestaties, weer en geluid']]]];
let keysPrev=false;
const keysOpen=()=>!$('#keys').classList.contains('hidden');
function openKeys(){if(keysOpen())return;keysPrev=SIM.paused;SIM.paused=true;syncSpeed();if(FP.on)unlockPointer();
  $('#keys').innerHTML=`<div class="card pr"><div class="eyebrow">Hulp</div><h2>Toetsenoverzicht</h2><div class="keys-grid">${KEY_HELP.map(([h,rows])=>`<div><h4>${h}</h4><table>${rows.map(([k,t])=>`<tr><td class="kk">${k.split(' / ').map(x=>x.split(' of ').map(y=>`<kbd>${y}</kbd>`).join(' of ')).join(' / ')}</td><td>${t}</td></tr>`).join('')}</table></div>`).join('')}</div>
    <p class="bf-desc">Alle vensters openen ook met de knoppen bovenin. Klik op een schakelaar in het SCADA-schema of in 3D voor zijn paneel.</p>
    <div class="rep-btns"><button class="primary" data-kclose2>Sluiten <kbd>H</kbd></button></div></div>`;
  $('#keys').classList.remove('hidden');}
function closeKeys(){$('#keys').classList.add('hidden');SIM.paused=keysPrev;syncSpeed();}
$('#keys').addEventListener('click',e=>{if(e.target.closest('[data-kclose2]')||e.target.id==='keys')closeKeys();});
$('#keysBtn').addEventListener('click',()=>keysOpen()?closeKeys():openKeys());
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.ctrlKey||e.metaKey)return;if((e.key==='h'||e.key==='H'||e.key==='?')&&$('#intro').classList.contains('hidden'))keysOpen()?closeKeys():openKeys();});
// eenmalige tip bij het eerste spel
function keysHint(){let seen=false;try{seen=!!localStorage.getItem('osz-keyhint');localStorage.setItem('osz-keyhint','1');}catch(e){}
  if(!seen&&!LITE)pushAlarm('Tip: druk op H (of ?) voor een overzicht van alle toetsen','info');}
