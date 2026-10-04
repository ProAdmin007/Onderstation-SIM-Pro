
// ============================================================ schakelbrieven (optioneel): zelf opstellen en laten controleren voor bonuspunten
const CHIEF='Marieke (wachtchef)';
const actKey=a=>a[0]+':'+a[1];
function actLabel(key){const [id,v]=key.split(':'),to=+v,d=D[id];if(!d)return key;
  if(d.type==='cb'||d.type==='lvs')return `Schakel ${id} ${to?'IN':'UIT'}`;
  return `${to?'Sluit':'Open'} ${{ds:'scheider',es:'aardschakelaar',lbs:'lastscheider'}[d.type]||''} ${id}`;}
const taskActs=t=>t.steps.filter(s=>s.act);
function briefInit(t){const acts=taskActs(t);if(!acts.length)return;t.brief=[];t.approved=false;t.tries=0;t.nobrief=false;
  const keys=acts.map(s=>actKey(s.act)),devs=new Set(acts.map(s=>s.act[0]));t.devs=devs;
  // afleiders: verkeerde handelingen die er plausibel uitzien
  const cand=[...new Set(acts.map(s=>s.act[0]+':'+(1-s.act[1])))].filter(k=>!keys.includes(k))
    .concat(['V-K:0','W-K:0','T3-Q0:0','L1-Q0:0','MS4-T:0','V-F5:0','L2-Q8:1'].filter(k=>!keys.includes(k)&&!devs.has(k.split(':')[0])));
  const extra=cand.sort(()=>Math.random()-0.5).slice(0,3);
  t.pool=[...new Set(keys)].concat(extra).sort(()=>Math.random()-0.5);}
// controle: volgorde moet kloppen; stappen binnen dezelfde groep mogen in willekeurige volgorde
function briefCheck(t){const exp=taskActs(t),got=t.brief;let gi=0;
  for(let i=0;i<exp.length;){const g=exp[i].grp;let j=i+1;while(g&&j<exp.length&&exp[j].grp===g)j++;
    const want=exp.slice(i,j).map(s=>actKey(s.act)),have=got.slice(gi,gi+want.length);
    if(have.length<want.length||!want.every(w=>have.includes(w)))return {ok:false,pos:gi+1,why:exp[i].why,next:want[0]};gi+=want.length;i=j;}
  if(got.length>gi)return {ok:false,pos:gi+1,why:'Deze handeling hoort niet in deze schakelbrief.'};return {ok:true};}
let briefPrev=false;
function briefOpen(){if(!TASK||!TASK.pool)return;TASK.briefMode=true;briefPrev=SIM.paused;SIM.paused=true;syncSpeed();if(FP.on)unlockPointer();briefRender();$('#brief').classList.remove('hidden');}
function briefClose(){$('#brief').classList.add('hidden');SIM.paused=briefPrev;syncSpeed();}
function briefRender(msg=''){const t=TASK;if(!t)return briefClose();
  const left=t.pool.filter(k=>!t.brief.includes(k));
  $('#brief').innerHTML=`<div class="card bf"><div class="eyebrow">Schakelbrief · ${t.code}</div><h2>${t.title}</h2><p class="bf-desc">${t.desc}</p>
    <div class="bf-cols"><div><div class="mh">Mogelijke handelingen</div>${left.map(k=>`<button class="bf-act" data-add="${k}">${actLabel(k)}</button>`).join('')||'<div class="idle">Alles is gebruikt.</div>'}</div>
    <div><div class="mh">Jouw schakelbrief</div><ol class="bf-list">${t.brief.map((k,i)=>`<li><span>${actLabel(k)}</span><button class="mini" data-up="${i}" title="Omhoog">↑</button><button class="mini" data-del="${i}" title="Verwijderen">✕</button></li>`).join('')||'<div class="idle">Klik links op handelingen om ze in volgorde toe te voegen.</div>'}</ol></div></div>
    ${msg?`<div class="bf-msg">${msg}</div>`:''}
    <div class="rep-btns"><button class="primary" data-bf="submit">Indienen bij ${CHIEF.split(' ')[0]}</button><button data-bf="hint">Hint (−5)</button><button data-bf="close">Later</button></div></div>`;}
function briefSubmit(){const t=TASK,r=briefCheck(t);
  if(r.ok){t.approved=true;award(t.tries?15:40,'Schakelbrief goedgekeurd');pushAlarm(`${CHIEF}: schakelbrief ${t.code} goedgekeurd – voer hem stap voor stap uit`,'ok');AudioSys.chime();briefClose();renderTasks();return true;}
  t.tries++;award(-10,'Schakelbrief afgekeurd');briefRender(`<b>${CHIEF}:</b> stap ${r.pos} klopt niet. ${r.why}`);return false;}
$('#brief').addEventListener('click',e=>{const t=TASK;if(!t)return;const b=e.target.closest('button');if(!b)return;
  if(b.dataset.add){t.brief.push(b.dataset.add);briefRender();}
  else if(b.dataset.del!=null){t.brief.splice(+b.dataset.del,1);briefRender();}
  else if(b.dataset.up!=null){const i=+b.dataset.up;if(i>0)[t.brief[i-1],t.brief[i]]=[t.brief[i],t.brief[i-1]];briefRender();}
  else if(b.dataset.bf==='submit')briefSubmit();
  else if(b.dataset.bf==='hint'){const r=briefCheck(t);award(-5,'Hint');briefRender(r.ok?'De schakelbrief is compleet – dien hem in.':`<b>Hint:</b> stap ${r.pos} moet zijn: <b>${actLabel(r.next||'')}</b>`);}
  else if(b.dataset.bf==='close')briefClose();});
// tijdens uitvoeren: schakelen buiten of afwijkend van de schakelbrief kost punten
function briefWatch(id,to){const t=TASK;if(!t||!t.devs||!t.devs.has(id))return;const key=id+':'+to;
  if(!t.approved)return;   // zonder eigen schakelbrief: vrij schakelen volgens de stappen
  let i=t.i;while(i<t.steps.length&&!t.steps[i].act)i++;if(i>=t.steps.length)return;
  const g=t.steps[i].grp,group=[t.steps[i]];for(let j=i+1;g&&j<t.steps.length&&t.steps[j].grp===g;j++)group.push(t.steps[j]);
  if(!group.some(s=>actKey(s.act)===key)){award(-25,'Afwijking van de schakelbrief');pushAlarm(`${CHIEF}: afwijking van de schakelbrief – volgende stap is „${actLabel(actKey(t.steps[i].act))}”`,'warn');}}
$('#taskBody').addEventListener('click',e=>{if(e.target.closest('[data-brief]'))briefOpen();});
