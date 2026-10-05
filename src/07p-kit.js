
// ============================================================ testkoffer: secundaire injectie op het relais van een veld (toets K)
let kitPrev=false;
const kitOpen=()=>!$('#kit').classList.contains('hidden');
const kitReady=()=>!!TASK&&!!TASK.relayF&&!TASK.aborted&&!!TASK.steps[TASK.i]?.kit;
function openKit(){if(kitOpen())return;if(!kitReady())return deny('De testkoffer is pas aangesloten tijdens de stap "Test het relais" van een relaistest');
  kitPrev=SIM.paused;SIM.paused=true;syncSpeed();if(FP.on)unlockPointer();$('#kit').classList.remove('hidden');renderKit();}
function closeKit(){$('#kit').classList.add('hidden');SIM.paused=kitPrev;syncSpeed();}
const fmtA=v=>v.toFixed(v<10?2:1).replace('.',',')+' A';
const fmtS=v=>v.toFixed(2).replace('.',',')+' s';
function kitRun(id){if(!kitReady())return;const f=FD(TASK.relayF),test=kitTests(f).find(x=>x.id===id);
  TASK.kit.res[id]=kitMeasure(f,test);AudioSys.click?.();computeFlows();refreshAll();renderKit();renderTasks();}
function renderKit(){if(!kitOpen())return;if(!kitReady())return closeKit();
  const f=FD(TASK.relayF),ps=PROT.f[f.id],k=TASK.kit,tests=kitTests(f),all=tests.every(x=>k.res[x.id]);
  const rows=tests.map(x=>{const r=k.res[x.id],exp=x.expectT!=null?`${fmtS(x.expectT)} <span>tolerantie ±10%</span>`:x.expect;
    const dev=r&&x.expectT!=null&&r.t!=null?` <span>${r.t>=x.expectT?'+':''}${Math.round((r.t/x.expectT-1)*100)}%</span>`:'';
    const blocked=x.id==='trip'&&D[f.cb].state!==1&&!r;
    return `<tr><td><b>${x.name}</b><span>${fmtA(x.inj)} secundair · ${Math.round(x.inj*CT_PRIM)} A primair</span></td><td>${exp}</td>
      <td class="pv">${r?r.txt+dev:'–'}</td><td><button class="mini" data-kinj="${x.id}" ${blocked?`disabled title="Schakel ${f.cb} eerst in"`:''}>${r?'Opnieuw':'Injecteren'}</button></td></tr>`;}).join('');
  $('#kit').innerHTML=`<div class="card pr"><div class="eyebrow">Testkoffer · secundaire injectie · veld ${f.id}</div><h2>Relaistest ${f.cb}</h2>
    <p class="bf-desc">Het testblok is open: de stroomtransformator (${CT_PRIM}/1 A) is kortgesloten en de testkoffer stuurt een teststroom direct in het relais.
      Instelling: I> <b>${Math.round(ps.pick*100)}%</b> van ${Math.round(f.rate*kA(f.bus))} A = <b>${Math.round(ps.pick*f.rate*kA(f.bus))} A</b> primair, kromme IEC standaard-invers, tijdfactor <b>× ${String(ps.tms).replace('.',',')}</b>.
      Voer alle proeven uit, vergelijk de meting met de verwachte waarde en beoordeel het relais.</p>
    <table><tr><th>Proef</th><th>Verwacht</th><th>Gemeten</th><th></th></tr>${rows}</table>
    ${k.verdict?`<div class="bf-status ok">Oordeel gegeven: ${k.verdict==='ok'?'goedgekeurd':'afgekeurd – relais wordt vervangen'}</div>`:
      `<div class="rep-btns"><button class="primary" data-kv="ok" ${all?'':'disabled title="Voer eerst alle proeven uit"'}>✓ Goedkeuren</button><button data-kv="reject" ${all?'':'disabled title="Voer eerst alle proeven uit"'}>✗ Afkeuren – relais vervangen</button><button data-kclose>Sluiten <kbd>K</kbd></button></div>`}
    ${k.verdict?'<div class="rep-btns"><button class="primary" data-kclose>Sluiten <kbd>K</kbd></button></div>':''}</div>`;}
$('#kit').addEventListener('click',e=>{if(e.target.closest('[data-kclose]')||e.target.id==='kit')return closeKit();
  const b=e.target.closest('[data-kinj]');if(b)return kitRun(b.dataset.kinj);
  const v=e.target.closest('[data-kv]');if(v&&kitReady()&&!TASK.kit.verdict){kitVerdict(TASK,v.dataset.kv);renderKit();}});
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;if((e.key==='k'||e.key==='K')&&$('#intro').classList.contains('hidden'))kitOpen()?closeKit():openKit();});
