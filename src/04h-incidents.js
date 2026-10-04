
// ============================================================ vrije dienst: willekeurige incidenten uit de scenario's (passend bij moment, seizoen en weer)
// Elk incident ruimt zichzelf op (reparatie, blussen, SCADA terug), want de vrije dienst heeft geen einde.
const INC={active:null,next:null,done:0};
const isSeason=(...k)=>k.some(x=>SEASON===SEASONS[x]);
const hIn=(a,b)=>{const h=hourOf();return h>=a&&h<b;};
let INC_WATER=null;
const INCIDENTS=[
  {id:'zkh',name:'Kabelstoring ziekenhuis en trip T1',desc:'Een mofstoring in de kabel naar het ziekenhuis en tegelijk spreekt de beveiliging van T1 aan.',w:1,dur:45,
    ok:()=>canFeeder('F5')&&!D.T1.blocked&&D['T1-Q0'].state===1,start(){feederFault('F5',14);trafoFault('T1');}},
  {id:'storm',name:'Onweersbuien boven Drenthe',desc:'Een onweersfront trekt over de lijnen: reken op blikseminslagen en kabelstoringen.',w:2,dur:60,ok:()=>!isSeason('winter')||Math.random()<0.3,
    start(){setWeather('onweer',false);[4,11,19,27,38].forEach((m,i)=>addTimer(m+rnd(0,4),()=>INC.active?.def.id==='storm'&&(i%2?feederFault():lineFault())));}},
  {id:'dubbel',name:'Twee kabelfouten in de woonwijk',desc:'Graafwerk op twee plekken: twee kabelfouten in de ring van de woonwijk tegelijk.',w:1,dur:70,ok:()=>canRing(),
    start(){const sec=id=>RING.secs.find(s=>s.id===id);ringFault(FD('F3'),sec('K12'),35);ringFault(FD('F4'),sec('K45'),65);}},
  {id:'hitte',name:'Ventilatoren T1 defect',desc:'Op een hete middag valt de koeling van T1 uit – alleen natuurlijke koeling.',w:1,dur:120,ok:()=>isSeason('zomer')&&hIn(11,16)&&!D.T1.fanFail&&!D.T1.blocked,
    start(){D.T1.fanFail=true;D.T1.fans=false;pushAlarm('T1: ventilatorgroep defect – alleen natuurlijke koeling. Tip: zet T3 parallel (V-T3)','crit');},
    end(){D.T1.fanFail=false;pushAlarm('T1: ventilatorgroep gerepareerd – koeling weer normaal','ok');}},
  {id:'aanrijding',name:'Aanrijding MS-station',desc:'Een vrachtwagen rijdt tegen een MS-station. De schakelinstallatie is kapot.',w:1,dur:100,ok:()=>canRing(),
    start(){const s=pick(RING.stations.filter(x=>!x.ring.nop.startsWith(x.id+'-')));this.s=s;stationDamage(s,'aanrijding, RMU beschadigd');
      pushAlarm(`112-melding: vrachtwagen tegen MS-station ${s.id} ${s.name}! Isoleer het station vanaf de buren en voed terug via het normaal-open punt`,'crit');
      addTimer(25,()=>{s.groups.forEach(g=>g.backfed=true);s.genset=true;pushAlarm(`Noodaggregaat bij ${s.id} draait – de klanten hebben weer stroom`,'ok');});},
    end(){const s=this.s;s.damaged=false;s.groups.forEach(g=>g.backfed=false);s.genset=false;readyNotice(`${s.id}: schakelinstallatie vervangen – het station mag weer in bedrijf`,null);}},
  {id:'cyber',name:'Cyberaanval op SCADA',desc:'De verbinding met het station valt weg: bedienen kan alleen nog lokaal (V).',w:1,dur:30,ok:()=>!GAME.flags.scadaDown,
    start(){GAME.flags.scadaDown=true;$('#scada').classList.add('down');pushAlarm('CERT: cyberaanval – SCADA-verbinding verbroken! Bedien lokaal: loop het station in (V)','crit');addTimer(rnd(8,14),()=>feederFault());},
    end(){GAME.flags.scadaDown=false;$('#scada').classList.remove('down');readyNotice('SCADA-verbinding hersteld',null);}},
  {id:'water',name:'Wateroverlast bij De Vaart Zuid',desc:'Het water stijgt bij MS9: maak het station binnen 20 min spanningsloos zonder MS8 te verliezen.',w:1,dur:75,ok:()=>canRing()&&WX.cur.rain>0.3,
    start(){const s=RING.stations.find(x=>x.id==='MS9');this.s=s;s.evac=true;this.t0=SIM.t;
      if(!INC_WATER){INC_WATER=new THREE.Mesh(new THREE.CircleGeometry(26,40),new THREE.MeshStandardMaterial({color:0x4a6470,transparent:true,opacity:0.78,roughness:0.08,metalness:0.2}));INC_WATER.rotation.x=-Math.PI/2;INC_WATER.userData.noBake=true;scene.add(INC_WATER);}
      INC_WATER.position.set(s.pos[0],-0.2,s.pos[1]);INC_WATER.visible=true;
      addTimer(20,()=>{if(EN.has(s.node)){stationDamage(s,'onder water gelopen');award(-80,'MS9 onder water onder spanning');pushAlarm('MS9 stond nog onder spanning toen het water binnenkwam – kortsluiting!','crit');}else{award(40,'MS9 tijdig spanningsloos');pushAlarm('MS9 staat onder water, maar is spanningsloos – geen schade','ok');}});},
    tick(){const t=SIM.t-this.t0,h=t<20?t/20*0.7:t<60?0.7:Math.max(0,0.7-(t-60)/12*0.7);if(INC_WATER)INC_WATER.position.y=h-0.2;},
    end(){const s=this.s;s.evac=false;s.damaged=false;if(INC_WATER)INC_WATER.visible=false;readyNotice('Water gezakt, MS9 geïnspecteerd en droog – het station mag weer in bedrijf',null);}},
  {id:'zon',name:'Recordopbrengst zonnepark',desc:'Strakblauwe lucht: het zonnepark levert meer terug dan T2 alleen aankan.',w:1,dur:150,ok:()=>isSeason('lente','zomer')&&hIn(9.5,12.5)&&WX.type==='helder',
    start(){const g=FD('G1');this.b=g.base;g.base=58;pushAlarm('Zonnepark De Hoeve draait vandaag op volle kracht – houd T2 in de gaten (Prognose)','warn');},end(){FD('G1').base=this.b;}},
  {id:'kraan',name:'Kraan raakt een 110 kV-lijn',desc:'Een mobiele kraan beschadigt een mast. TenneT kan via de andere lijn maar beperkt leveren.',w:1,dur:75,ok:()=>canLine(),
    start(){const L=pick(LINES);this.L=L;lineFault(L,true);setTimeout(()=>{SIM.lines[L].reason='mast beschadigd door kraan';SIM.timers=SIM.timers.filter(t=>!/lineRestore/.test(String(t.fn)));},2500);
      GAME.flags.lineLimit=Math.round(FLOW.P110*0.85);pushAlarm(`TenneT: lijn ${L} uren uit door een kraan – neem via de andere lijn maximaal ${GAME.flags.lineLimit} MW af (flex: C)`,'crit');},
    tick(dm){const lim=GAME.flags.lineLimit;if(lim&&FLOW.P110>lim){GAME.score-=dm*2;if(!this.warn){this.warn=true;pushAlarm(`TenneT: u neemt ${Math.round(FLOW.P110)} MW af, de grens is ${lim} MW – verlaag de afname`,'warn');}}else this.warn=false;},
    end(){GAME.flags.lineLimit=null;lineRestore(this.L);}},
  {id:'brand',name:'Brand in het 10 kV-gebouw',desc:'Rookmelders slaan aan. De brandweer gaat pas naar binnen als de 10 kV spanningsloos is.',w:0.6,dur:90,ok:()=>!FIRE.on&&!D.T1.blocked,
    start(){this.t0=SIM.t;this.dead=null;FIRE.on=true;const b=VIEWS.MS.box;FIRE.glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xff7a1a,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
      FIRE.glow.position.set((b.min.x+b.max.x)/2-8,b.min.y+2.5,b.min.z-0.4);FIRE.glow.scale.set(6,4,1);scene.add(FIRE.glow);crewDispatch({box:b,say:'Brandweer: verkenning',until:()=>!FIRE.on});
      pushAlarm('BRANDMELDING 10 kV-gebouw – brandweer onderweg','crit');
      addTimer(5,()=>{GAME.flags.mustOpen=['V-T1','V-T3'];pushAlarm('Brandweer: maak de 10 kV spanningsloos (V-T1 en V-T3 UIT) – dan gaan we blussen','crit');});},
    tick(){const dead=!EN.has('RA')&&!EN.has('RB'),t=SIM.t-this.t0;
      if(t>5&&dead&&this.dead==null){this.dead=SIM.t;pushAlarm('Brandweer: 10 kV spanningsloos – we gaan naar binnen','ok');}
      if(t>20&&this.dead==null){['V-T1','V-T3'].forEach(tripBreaker);this.dead=SIM.t;incident();pushAlarm('Brandweer: niemand reageerde – wij hebben de 10 kV zelf afgeschakeld','crit');}
      if(this.dead!=null&&!this.out&&SIM.t>this.dead+30){this.out=true;FIRE.on=false;if(FIRE.glow){scene.remove(FIRE.glow);FIRE.glow=null;}GAME.flags.mustOpen=null;D['V-F6'].stuck=true;
        readyNotice('Brandweer: brand geblust – de 10 kV mag weer onder spanning. V-F6 heeft rookschade (revisie nodig)',null);INC.active.until=SIM.t+25;}
      if(this.dead!=null&&!this.out&&!dead&&!this.danger){this.danger=true;incident();pushAlarm('Brandweer: er staat weer spanning op terwijl wij binnen zijn!','crit');}},
    end(){FIRE.on=false;if(FIRE.glow){scene.remove(FIRE.glow);FIRE.glow=null;}GAME.flags.mustOpen=null;}},
  {id:'concert',name:'Concert op het Marktplein',desc:'Podium, lichtshow en foodtrucks op het net van MS6 – houd het concert in de lucht.',w:1,dur:200,ok:()=>isSeason('lente','zomer')&&hIn(17.5,19),
    start(){const g=LVG.find(x=>x.id==='MS6-G2');this.g=g;this.b=g.base;if(!FLEX.some(f=>f.id==='MS6-G2'))FLEX.push({id:'MS6-G2',name:'Concert Marktplein',how:'podium deels op eigen aggregaat',max:0.75,eur:240,c:g,req:0,at:0});
      pushAlarm('Vanavond concert op het Marktplein (19:15–22:00) – het podium heeft een flexcontract','info');},
    tick(){const h=hourOf(),on=h>=19.25&&h<22;this.g.base=this.b+(on?2.6*LOAD_SCALE*clamp((h-19.25)/0.5,0,1):0);},
    end(){this.g.base=this.b;const i=FLEX.findIndex(f=>f.id==='MS6-G2');if(i>=0){FLEX[i].c.cut=0;FLEX.splice(i,1);}}},
  {id:'laden',name:'Laadpiek in de woonwijk',desc:'Iedereen komt tegelijk thuis en laadt de auto: de woonwijk loopt tegen de grenzen van het net aan.',w:1,dur:240,ok:()=>isSeason('herfst','winter')&&hIn(15,17.5),
    start(){this.keep=LVG.filter(g=>RINGS[0].stations.includes(g.st)&&(g.kind==='res'||g.id==='MS4-G3')).map(g=>[g,g.base]);this.keep.forEach(([g,b])=>g.base=g.id==='MS4-G3'?b*4:b*1.3);
      pushAlarm('Koude avond: veel thuisladers en het laadplein vol – let op de trafo\'s en kabels in de woonwijk (Kabels, Flex)','warn');},end(){this.keep.forEach(([g,b])=>g.base=b);}},
  {id:'blackout',name:'Landelijke storing',desc:'Een storing in het 380 kV-net: het station is volledig spanningsloos. Bouw alles weer op.',w:0.4,dur:40,ok:()=>canLine(),
    start(){LINES.forEach(L=>Object.assign(SIM.lines[L],{avail:false,reason:'landelijke storing (black-out)'}));Object.values(D).forEach(d=>{if(d.type==='cb')d.state=0;});
      pushAlarm('BLACK-OUT: landelijke storing – OS Zuidwolde volledig spanningsloos. Wacht op TenneT en bouw dan veld voor veld op','crit');
      addTimer(rnd(4,8),()=>{SIM.lines.L2.avail=true;SIM.lines.L2.reason='';readyNotice('TenneT: lijn L2 onder spanning – start het herstel (let op koude-lastopname)','L2-Q0',()=>!D['L2-Q0'].state);});
      addTimer(rnd(15,22),()=>{SIM.lines.L1.avail=true;SIM.lines.L1.reason='';pushAlarm('TenneT: lijn L1 onder spanning','ok');});}},
];
// start een incident (force: zonder de voorwaarden te controleren, voor tests)
function startIncident(id,force){const def=INCIDENTS.find(d=>d.id===id);if(!def||INC.active||(!force&&!def.ok()))return false;const inst=Object.create(def);
  INC.active={def:inst,t0:SIM.t,until:SIM.t+def.dur,off0:SIM.cml};pushAlarm(`⚠ Incident: ${def.name} – ${def.desc}`,'crit');inst.start();refreshAll();renderTasks();return true;}
function endIncident(){const a=INC.active;if(!a)return;a.def.end&&a.def.end();INC.active=null;INC.done++;INC.next=SIM.t+rnd(90,200);
  if(SIM.off===0){award(100,'Incident afgehandeld');pushAlarm(`Incident “${a.def.name}” afgehandeld – alle klanten hebben stroom`,'ok');}else pushAlarm(`Incident “${a.def.name}” voorbij – nog ${SIM.off.toLocaleString('nl-NL')} klanten zonder stroom`,'warn');refreshAll();renderTasks();}
function incidentTick(dm){if(GAME.mode!=='free'||!GAME.events)return;if(INC.next==null)INC.next=SIM.t+rnd(60,120);
  if(INC.active){INC.active.def.tick&&INC.active.def.tick(dm);if(SIM.t>=INC.active.until)endIncident();return;}
  if(SIM.t<INC.next)return;const c=INCIDENTS.filter(d=>d.ok());if(!c.length){INC.next=SIM.t+15;return;}
  let r=Math.random()*c.reduce((a,d)=>a+d.w,0);for(const d of c){r-=d.w;if(r<=0){startIncident(d.id);return;}}}
function incidentHeader(){const a=INC.active;if(!a)return '';return `<div class="gh inc"><div class="gt"><span>⚠ Incident · ${a.def.name}</span><span class="tag">nog ${fmtDur(a.until-SIM.t)}</span></div><p>${a.def.desc}</p></div>`;}
