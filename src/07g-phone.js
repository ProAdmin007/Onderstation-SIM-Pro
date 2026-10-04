
// ============================================================ telefoon: klantmeldingen en LS-storingen die SCADA niet ziet
const PHONE={queue:[],cur:null,lastRing:0,cd:{},nextHouse:0,stats:{ok:0,bad:0,missed:0}};
const CALLERS=['mevrouw De Vries','meneer Jansen','mevrouw Bakker','meneer Visser','mevrouw Smit','meneer Mulder','mevrouw Bos','meneer Dekker','mevrouw Hendriks','meneer Van Dijk','mevrouw Meijer','meneer De Boer'];
const placeOf=g=>{const m=g.name.match(/^(Woningen|Appartementen) (.+)$/);return m?{addr:`${m[2]} ${Math.floor(rnd(2,140))}`,biz:false}:{addr:g.name,biz:true};};
function lvFault(force){const c=LVG.filter(g=>g.cust>1&&!g.lvf&&EN.has(g.node)&&g.kind!=='ovl'&&(!force||g.id===force));if(!c.length)return feederFault();
  const g=pick(c);g.lvf={at:SIM.t,frac:rnd(0.2,0.55)};g.outFrac=g.lvf.frac;GAME.stats.lvf=(GAME.stats.lvf||0)+1;
  addTimer(rnd(2,5),()=>g.lvf&&callFrom(g,'lv'));addTimer(rnd(7,11),()=>g.lvf&&callFrom(g,'lv'));
  addTimer(150,()=>{if(!g.lvf)return;g.lvf=null;g.outFrac=0;pushAlarm(`Storingsdienst (0800-nummer): LS-storing ${g.st.id} ${g.name} na veel klachten alsnog verholpen`,'warn');});}
function callFrom(g,kind){if(PHONE.queue.length>=3||(PHONE.cd[g.id]||-99)>SIM.t-12)return;PHONE.cd[g.id]=SIM.t;const pl=placeOf(g);
  const who=pl.biz?`de bedrijfsleider van ${g.name}`:pick(CALLERS);
  const say=kind==='house'?pick(['Ik heb geen stroom, maar de buren wel.','Bij mij is alles uit, bij de overburen brandt gewoon licht.','Mijn aardlekschakelaar springt steeds en nu doet niks het meer.'])
    :kind==='lv'?pick(['Bij ons is de stroom uit, de buren hebben het ook.','Halve straat zit zonder stroom, het licht flikkerde eerst.','Wij hebben geen stroom meer, de straatverlichting doet het nog wel.'])
    :pick(['Alles is uit hier, de hele buurt is donker.','We zitten zonder stroom! Weet u hoe lang het duurt?','Mijn vriezer staat uit, wanneer komt de stroom terug?']);
  PHONE.queue.push({g,kind,who,addr:pl.addr,biz:pl.biz,say,t:SIM.t,wait:0});renderPhone();}
// gesprekken laten ontstaan bij echte uitval (zichtbaar in SCADA) en af en toe een losse woning
function phoneTick(dtReal){if(SIM.paused||GAME.ended||GAME.lesson)return;
  const dm=dtReal*SIM.speed/60;
  LVG.forEach(g=>{if(g.cust>1&&g.kind!=='ovl'&&!g.backfed&&!EN.has(g.node)&&g.offSince!=null&&SIM.t-g.offSince>1.5&&Math.random()<dm*0.02)callFrom(g,'mv');});
  if(GAME.events&&SIM.t>PHONE.nextHouse){if(PHONE.nextHouse)callFrom(pick(LVG.filter(g=>g.cust>1&&g.kind!=='ovl'&&EN.has(g.node)&&!g.outFrac)),'house');PHONE.nextHouse=SIM.t+rnd(50,110);}
  PHONE.queue.forEach(c=>{if(c!==PHONE.cur)c.wait+=dtReal;});
  const gone=PHONE.queue.filter(c=>c!==PHONE.cur&&c.wait>45);gone.forEach(c=>{PHONE.stats.missed++;award(-5,'Klant hing op');pushAlarm(`☎ ${c.who} (${c.addr}) hing op – niemand nam op`,'warn');});
  if(gone.length){PHONE.queue=PHONE.queue.filter(c=>!gone.includes(c));renderPhone();}
  if(PHONE.queue.some(c=>c!==PHONE.cur)&&performance.now()-PHONE.lastRing>3200){PHONE.lastRing=performance.now();AudioSys.tone({f:440,gain:0.045,dur:0.35});setTimeout(()=>AudioSys.tone({f:480,gain:0.045,dur:0.35}),420);}}
function stationOptions(){return RING.stations.map(s=>`<option value="${s.id}">${s.id} ${s.name}</option>`).join('');}
function renderPhone(){const el=$('#phone');const c=PHONE.cur,w=PHONE.queue.filter(x=>x!==c);
  if(!c&&!w.length){el.className='hidden';el.innerHTML='';return;}
  if(!c){el.className='ring';el.innerHTML=`<span class="ph-i">☎</span><span><b>Inkomend gesprek${w.length>1?` (${w.length})`:''}</b><br>${w[0].who} · ${w[0].addr}</span><button class="primary" data-ph="take">Opnemen</button>`;return;}
  el.className='open';el.innerHTML=`<div class="ph-h">☎ ${c.who}<span>${c.addr}</span></div><div class="ph-q">“${c.say}”</div>
    <div class="ph-a"><label>Monteur sturen naar <select data-ph="st"><option value="">– kies MS-station –</option>${stationOptions()}</select></label><button data-ph="send">Stuur monteur</button></div>
    <div class="ph-a"><button data-ph="known">“Dat is bekend, we werken eraan”</button><button data-ph="own">“Laat uw installateur kijken”</button></div>
    <div class="ph-n">Tip: klik in het ringschema op een station om te zien welke straten en bedrijven erop zitten.</div>`;}
// antwoord op het lopende gesprek
function phoneAnswer(choice,st){const c=PHONE.cur;if(!c)return;PHONE.queue=PHONE.queue.filter(x=>x!==c);PHONE.cur=null;
  const mvOut=!EN.has(c.g.node)&&!c.g.backfed,lv=!!c.g.lvf&&!mvOut,good=(p,t)=>{PHONE.stats.ok++;award(p,t);},bad=(p,t)=>{PHONE.stats.bad++;award(p,t);};
  pushAlarm(`☎ ${c.who} (${c.addr}): “${c.say}”`,'radio');
  if(choice==='known'){if(mvOut)good(5,'Klant goed geïnformeerd');else bad(-10,'Klant verkeerd geïnformeerd');}
  else if(choice==='own'){if(c.kind==='house'&&!mvOut&&!lv)good(10,'Juist advies: eigen installatie');else bad(-15,'Klant ten onrechte doorverwezen');}
  else if(choice==='send'&&st){dispatchLV(st,c);}
  renderPhone();}
function dispatchLV(stId,c){const s=RING.stations.find(x=>x.id===stId);if(!s)return;
  pushAlarm(`Monteur onderweg naar ${s.id} ${s.name} voor een LS-storing${c?` (melding ${c.addr})`:''}`,'op');
  const v=VIEWS[s.id];if(v)crewDispatch({box:v.box,n:1,say:`LS-storing zoeken ${s.id}`,from:V3(s.pos[0]+6,0,s.pos[1]-8),until:()=>SIM.t>t0+rep+2});
  const t0=SIM.t,rep=rnd(14,22);
  addTimer(rep,()=>{const g=s.groups.find(x=>x.lvf);
    if(!EN.has(s.node)&&!g){award(-10,'Monteur voor niets gestuurd');return pushAlarm(`Monteur bij ${s.id}: het hele station is spanningsloos – de storing zit in het MS-net, niet in de LS`,'warn');}
    if(!g){PHONE.stats.bad++;award(-20,'Monteur naar verkeerd station');return pushAlarm(`Monteur bij ${s.id}: alle LS-velden in orde – hier zit de storing niet`,'warn');}
    const n=Math.round(g.cust*g.lvf.frac),fast=SIM.t-g.lvf.at<45;g.lvf=null;g.outFrac=0;PHONE.stats.ok++;award(fast?60:30,'LS-storing verholpen');
    readyNotice(`Monteur bij ${s.id}: doorgebrande zekering in LS-veld ${g.id} (${g.name}) vervangen – ${n} klanten weer aan`,null);});}
$('#phone').addEventListener('click',e=>{const b=e.target.closest('button[data-ph]');if(!b)return;const a=b.dataset.ph;
  if(a==='take'){PHONE.cur=PHONE.queue[0];renderPhone();return;}
  if(a==='send'){const st=$('#phone [data-ph="st"]').value;if(!st)return deny('Kies eerst een MS-station');phoneAnswer('send',st);}else phoneAnswer(a);});
