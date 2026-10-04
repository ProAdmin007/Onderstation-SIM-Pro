
// ============================================================ venster onderhoud: conditie van de vermogenschakelaars en revisies inplannen (toets O)
let assPrev=false;
const assOpen=()=>!$('#assets').classList.contains('hidden');
function openAssets(){if(assOpen())return;assPrev=SIM.paused;SIM.paused=true;syncSpeed();if(FP.on)unlockPointer();$('#assets').classList.remove('hidden');renderAssets();}
function closeAssets(){$('#assets').classList.add('hidden');SIM.paused=assPrev;syncSpeed();}
function renderAssets(){if(!assOpen())return;const rows=CB_IDS.map(id=>D[id]).sort((a,b)=>cond(a)-cond(b)).map(d=>{const c=cond(d),cls=d.stuck||c<0.25?'bad':c<0.4?'warnc':'';
  const can=MAINT_CBS.includes(d.id),plan=GAME.planCb===d.id||(TASK&&TASK.cbm===d.id);
  return `<tr><td><b>${d.id}</b><span>${d.label}</span></td><td><div class="cg"><i><b class="${cls}" style="width:${Math.round(c*100)}%;background:${cls?'':'var(--green)'}"></b></i></div></td>
    <td class="pv ${cls}">${d.stuck?'VAST':Math.round(c*100)+'%'}</td><td class="pv">${d.ops.toLocaleString('nl-NL')}</td><td class="pv">${d.year}</td>
    <td>${can?(plan?'<span class="warnc">ingepland</span>':`<button class="mini" data-plan="${d.id}" ${GAME.tasks?'':'disabled title="Geen werkopdrachten in dit scenario"'}>Revisie inplannen</button>`):'<span class="dl">alleen met rail vrij</span>'}</td></tr>`;}).join('');
  $('#assets').innerHTML=`<div class="card pr"><div class="eyebrow">Assetmanagement · vermogenschakelaars</div><h2>Onderhoud</h2>
    <p class="bf-desc">Elke schakeling slijt het mechanisme een beetje, het afschakelen van een foutstroom veel meer. Onder ±28% conditie kan een schakelaar <b>weigeren</b> bij een storing: de reservebeveiliging (50BF) schakelt dan de hele rail af. Plan revisies op tijd – bij voorkeur op een rustig moment.</p>
    <table><tr><th>Schakelaar</th><th style="width:28%">Conditie</th><th></th><th>Schakelingen</th><th>Revisie</th><th></th></tr>${rows}</table>
    <div class="rep-btns"><button class="primary" data-aclose>Sluiten <kbd>O</kbd></button></div></div>`;}
$('#assets').addEventListener('click',e=>{if(e.target.closest('[data-aclose]')||e.target.id==='assets')return closeAssets();
  const b=e.target.closest('[data-plan]');if(b){GAME.planCb=b.dataset.plan;if(!TASK)SIM.nextTaskAt=Math.min(SIM.nextTaskAt,SIM.t+1);pushAlarm(`Revisie ${b.dataset.plan} ingepland – volgt als eerstvolgende werkopdracht`,'op');renderAssets();}});
$('#assetsBtn').addEventListener('click',()=>assOpen()?closeAssets():openAssets());
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;if((e.key==='o'||e.key==='O')&&$('#intro').classList.contains('hidden'))assOpen()?closeAssets():openAssets();});
