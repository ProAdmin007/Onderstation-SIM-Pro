
// ============================================================ dienstoverdracht: wat staat er anders dan normaal bij het begin van de dienst
const PREV_OP=['Jeroen','Sanne','Mehmet','Ilse','Kees','Fatima'];
// afwijkingen die bij het begin van een dag- of avonddienst kunnen bestaan (setup zet de installatie in die toestand)
const HO_POOL=[
  {id:'ar',setup(){const L=pick(LINES);this.L=L;SIM.lines[L].ar=false;},note(){return `AR van <b>${this.L}</b> staat nog UIT na een relaistest vannacht. De test is goed afgerond: AR mag weer IN.`;},fix(){return SIM.lines[this.L].ar;}},
  {id:'avr',setup(){D.T1.avr='hand';},note:()=>'De spanningsregelaar van <b>T1</b> staat op HAND (meting trappenschakelaar). Zet hem terug op AUTO.',fix:()=>D.T1.avr==='auto'},
  {id:'nop',setup(){D['MS2-R'].state=0;D['MS3-R'].state=1;},note:()=>'Ring Woonwijk: het normaal-open punt is na kabelwerk verlegd naar <b>MS2-R</b> (MS3-R is dicht). Leg het terug naar MS3-R.',fix:()=>D['MS3-R'].state===0&&D['MS2-R'].state===1},
  {id:'sel',setup(){D['F5-QA'].state=1;D['F5-QB'].state=0;},note:()=>'Veld <b>F5</b> (ziekenhuis) staat tijdelijk op rail A na een inspectie van rail B. Zet hem terug op rail B (onder last via V-K).',fix:()=>D['F5-QB'].state===1&&D['F5-QA'].state===0},
  {id:'t3',setup(){D.T3.ratio='20';D.T3.tap=9;},note:()=>'Reservetrafo <b>T3</b> staat nog op <b>20 kV</b> na een proef. Als warme reserve hoort hij op 10 kV.',fix:()=>D.T3.ratio==='10'},
  {id:'f6',setup(){this.until=SIM.t+rnd(35,60);D['V-F6'].state=0;const f=FD('F6');f.interruptible=true;GAME.hold={'V-F6':this.until};},
    note(){return `<b>V-F6</b> (kassen) is uit op verzoek van de teler. Afspraak: pas om <b>${fmtClock(this.until)}</b> weer inschakelen.`;},fix(){return SIM.t>=this.until&&D['V-F6'].state===1;}},
  {id:'line',setup(){const L='L2',ln=SIM.lines[L];TASK=lineTask(L);TASK.code='WV-2026-'+(taskSeq++);TASK.i=5;TASK.steps[5].wait=Math.round(rnd(20,35));
      Object.assign(D[L+'-Q0'],{state:0});D[L+'-Q9'].state=0;D[L+'-Q1'].state=0;D[L+'-Q8'].state=1;Object.assign(ln,{maint:true,avail:false,reason:'vrijgeschakeld voor werkzaamheden'});},
    note:()=>'<b>L2</b> is vrijgeschakeld en geaard voor onderhoud aan scheider L2-Q9. De ploeg is bezig; de werkopdracht loopt door in jouw dienst. Het station draait op één lijn.'}];
// alle afwijkingen van de normale toestand, afgeleid uit de installatie zelf
function deviations(){const out=[],sw=(id,norm)=>D[id]&&D[id].state!==norm;
  for(const L of LINES){const ln=SIM.lines[L];if(!ln.avail)out.push(`Lijn <b>${L}</b> spanningsloos (${ln.reason||'onbekend'})`);else if(!D[L+'-Q0'].state)out.push(`<b>${L}-Q0</b> staat UIT`);if(!ln.ar)out.push(`AR van <b>${L}</b> UIT${ln.arBroken?' (relais defect)':''}`);}
  TR.forEach(T=>{const t=D[T];if(t.blocked)out.push(`<b>${T}</b> geblokkeerd: ${t.blockText}`);if(t.avr!=='auto')out.push(`Regelaar <b>${T}</b> op HAND`);if(t.fanFail)out.push(`Ventilatoren <b>${T}</b> defect`);});
  if(D.T3.ratio!=='10')out.push(`T3 staat op <b>${D.T3.ratio} kV</b>`);if(D['V-T3'].state)out.push('T3 in bedrijf op <b>10 kV</b> (V-T3)');if(D['W-T3'].state)out.push('T3 in bedrijf op <b>20 kV</b> (W-T3)');
  if(sw('V-K',1))out.push('Railkoppeling <b>V-K</b> open');if(sw('W-K',1))out.push('Railkoppeling <b>W-K</b> open');
  Object.entries(SEL_BAYS).forEach(([b,v])=>{const a=D[b+'-QA'].state,c=D[b+'-QB'].state,home=BUSES[v.home].nm;if((home==='A'?!a||c:!c||a))out.push(`Veld <b>${b}</b> staat op ${a&&c?'rail A én B':a?'rail A':c?'rail B':'geen rail'} (normaal ${home})`);});
  RINGS.forEach(rg=>{const open=rg.stations.flatMap(s=>[s.id+'-L',s.id+'-R']).filter(id=>D[id].state===0);if(open.join()!==rg.nop)out.push(`${rg.name}: open lastscheiders <b>${open.join(', ')||'geen (ring gesloten)'}</b> (normaal ${rg.nop})`);});
  FEEDERS.forEach(f=>{if(!D[f.cb].state)out.push(`Veld <b>${f.cb}</b> (${f.name}) UIT`);});
  Object.values(D).forEach(d=>{if(d.type==='es'&&d.state)out.push(`Aardschakelaar <b>${d.id}</b> gesloten`);});
  CB_IDS.forEach(id=>{const d=D[id];if(d.stuck)out.push(`<b>${id}</b> zit vast na een weigering`);else if(cond(d)<0.3)out.push(`<b>${id}</b> in slechte conditie (${Math.round(cond(d)*100)}%) – revisie aanbevolen`);});
  if(TASK)out.push(`Lopende werkopdracht <b>${TASK.code}</b>: ${TASK.title}`);return out;}
function handoverInit(m){const op=pick(PREV_OP),items=[];
  if(!m.scen){const n=2+(Math.random()<0.5?1:0);HO_POOL.slice().sort(()=>Math.random()-0.5).slice(0,n).forEach(it=>{const o=Object.create(it);o.setup();items.push(o);});}
  computeFlows();GAME.handover={op,items,open:true,dev:deviations()};}
function openHandover(){const h=GAME.handover;if(!h)return;const m=MODES[GAME.mode];h.prev=SIM.paused;SIM.paused=true;syncSpeed();
  let pk='';try{const a=progAdvice();pk=a.out.slice(0,2).map(o=>o.t).join('<br>');}catch(e){}
  $('#handover').innerHTML=`<div class="card ho"><div class="eyebrow">Dienstoverdracht · ${fmtClock(SIM.t)}</div><h2>${m.name}</h2>
    <p class="ho-from"><b>${h.op}</b> (vorige dienst): “${m.scen?m.desc:'Hier is de stand van zaken. Succes met je dienst!'}”</p>
    <div class="mh">Afwijkingen van de normale toestand</div>${h.dev.length?`<ul class="ho-list">${h.dev.slice(0,9).map(d=>`<li>${d}</li>`).join('')}${h.dev.length>9?`<li>… en nog ${h.dev.length-9} andere</li>`:''}</ul>`:'<div class="idle">Alles staat normaal.</div>'}
    ${h.items.length?`<div class="mh">Notities van ${h.op}</div><ul class="ho-list ho-n">${h.items.map(i=>`<li>${i.note()}</li>`).join('')}</ul>`:''}
    <div class="mh">Weer en prognose</div><p class="ho-p">${wxLabel()} · ${pk}</p>
    ${h.items.some(i=>i.fix)?'<p class="ho-p">Open punten staan links bij je dienst; elk netjes afgehandeld punt levert +25 op.</p>':''}
    <div class="rep-btns"><button class="primary" data-ho="ok">Dienst overnemen</button></div></div>`;
  $('#handover').classList.remove('hidden');}
function closeHandover(){const h=GAME.handover;if(!h||!h.open)return;h.open=false;$('#handover').classList.add('hidden');SIM.paused=false;syncSpeed();pushAlarm(`Dienst overgenomen van ${h.op} – ${h.dev.length} afwijking${h.dev.length===1?'':'en'} genoteerd`,'ok');renderTasks();}
function handoverTick(){const h=GAME.handover;if(!h||h.open)return;
  h.items.forEach(i=>{if(i.fix&&!i.done&&i.fix()){i.done=true;award(25,'Overdrachtspunt afgehandeld');pushAlarm('Overdrachtspunt afgehandeld ✓','ok');}});
  const hold=GAME.hold||{};for(const id in hold)if(D[id].state&&SIM.t<hold[id]&&!h['early'+id]){h['early'+id]=true;award(-20,'Afspraak overdracht niet nagekomen');pushAlarm(`${id} ingeschakeld vóór de afgesproken tijd (${fmtClock(hold[id])}) – de teler is boos`,'warn');}}
function handoverPanel(){const h=GAME.handover,it=h&&h.items.filter(i=>i.fix);if(!it||!it.length)return '';
  return `<div class="ho-open"><div class="mh">Open punten overdracht</div>${it.map(i=>`<div class="step ${i.done?'done':''}"><span class="b">${i.done?'✓':''}</span><span>${i.note().replace(/<[^>]+>/g,'')}</span></div>`).join('')}</div>`;}
$('#handover').addEventListener('click',e=>{if(e.target.closest('[data-ho="ok"]'))closeHandover();});
