
// ============================================================ scenario's rond congestie, flex en veroudering: kraan, brand, evenement, laadpiek
// rookpluim: elke aanroep één wolk die opstijgt en uitdijt (FX-lus)
function smokePuff(x,y,z,k=1){const m=new THREE.SpriteMaterial({map:smokeTex,color:0x4a4a4a,transparent:true,opacity:0.55,depthWrite:false});const s=new THREE.Sprite(m);
  s.position.set(x+rnd(-1.5,1.5),y,z+rnd(-1.5,1.5));s.scale.setScalar(3*k);scene.add(s);const vx=rnd(-0.4,0.4),life=rnd(7,10);
  FX.push({t:0,update(dt){this.t+=dt;s.position.y+=dt*2.2;s.position.x+=vx*dt+dt*0.6;s.scale.multiplyScalar(1+dt*0.22);m.opacity=0.55*(1-this.t/life);if(this.t>life){scene.remove(s);m.dispose();return false;}return true;}});}
const FIRE={on:false,acc:0,glow:null};
function fireTick(dt){if(!FIRE.on)return;FIRE.acc+=dt;const b=VIEWS.MS.box;
  if(FIRE.acc>0.35){FIRE.acc=0;smokePuff((b.min.x+b.max.x)/2-8+rnd(-6,6),b.max.y+0.5,(b.min.z+b.max.z)/2,1.2);}
  if(FIRE.glow){FIRE.glow.material.opacity=0.55+0.35*Math.sin(performance.now()/90)*Math.sin(performance.now()/37);}}
const p110Over=()=>{const lim=GAME.flags.lineLimit;return lim&&FLOW.P110>lim;};
Object.assign(MODES,{
  kraan:{scen:true,name:'Kraan raakt de 110 kV-lijn',tag:'Scenario · moeilijk',start:16.5,dur:100,season:'herfst',weather:'helder',
    desc:'Een mobiele kraan raakt lijn L1 Hoogeveen. De mast is beschadigd: L1 blijft urenlang uit en TenneT kan via L2 maar beperkt leveren. Kom de avondpiek door zonder klanten af te schakelen.',
    setup(){pushAlarm('Bouwverkeer langs de A28 – een mobiele kraan werkt vlak bij lijn L1','info');
      at(3,()=>{lineFault('L1',true);setTimeout(()=>{const ln=SIM.lines.L1;ln.reason='mast beschadigd door kraan';SIM.timers=SIM.timers.filter(t=>!/lineRestore/.test(String(t.fn)));addTimer(75,()=>lineRestore('L1'));},2500);
        GAME.flags.lineLimit=33;GAME.flags.limitAt=SIM.t;
        pushAlarm('TenneT: mast van L1 beschadigd door een kraan – herstel duurt uren. L2 draait in noodbedrijf: neem maximaal 33 MW af!','crit');
        pushAlarm('Tip: kijk op het tabblad Prognose naar de avondpiek en zet op tijd flexibel vermogen in (C) – de kassen, het transportbedrijf, het koelhuis en de batterij van het distributiecentrum.','info');});},
    tick(dm){if(p110Over())GAME.flags.overMin=(GAME.flags.overMin||0)+dm;},
    obj:()=>[{t:'Via L2 nooit langer dan 5 min boven 33 MW',check:()=>(GAME.flags.overMin||0)>5?'fail':null,final:()=>true},
      {t:'Ziekenhuis (F5) blijft onder spanning',check:()=>GAME.flags.hospRun>1?'fail':null,final:()=>true},
      {t:'Minder dan 3.000 klantminuten',check:()=>SIM.cml>3000?'fail':null,final:()=>SIM.cml<=3000},noIncidents]},
  brand:{scen:true,name:'Brand in het 10 kV-gebouw',tag:'Scenario · moeilijk',start:14,dur:90,season:'herfst',weather:'bewolkt',
    desc:'De rookmelders in het 10 kV-gebouw slaan aan. De brandweer gaat pas naar binnen als de hele 10 kV-installatie spanningsloos is – ook het ziekenhuis gaat dan op noodstroom.',
    setup(){at(2,()=>{FIRE.on=true;const b=VIEWS.MS.box;FIRE.glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xff7a1a,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
        FIRE.glow.position.set((b.min.x+b.max.x)/2-8,b.min.y+2.5,b.min.z-0.4);FIRE.glow.scale.set(6,4,1);scene.add(FIRE.glow);
        pushAlarm('BRANDMELDING: rookmelders 10 kV-gebouw OS Zuidwolde – brandweer onderweg','crit');
        crewDispatch({box:VIEWS.MS.box,say:'Brandweer: verkenning',until:()=>!FIRE.on});
        at(5,()=>{GAME.flags.fireReq=SIM.t;GAME.flags.mustOpen=['V-T1','V-T3'];GAME.countdown={label:'Brandweer wacht: 10 kV spanningsloos',until:SIM.t+10};
          pushAlarm('Brandweer: maak de hele 10 kV-installatie spanningsloos (V-T1 en V-T3 UIT) – pas dan gaan we binnen blussen','crit');
          pushAlarm('Tip: het ziekenhuis gaat op noodstroom (±60 min brandstof). De 20 kV-installatie in het andere gebouw kan gewoon in bedrijf blijven.','info');});});},
    tick(dm){const r=GAME.flags.fireReq;if(r==null)return;const dead=!EN.has('RA')&&!EN.has('RB');
      if(dead&&!GAME.flags.deadAt){GAME.flags.deadAt=SIM.t;GAME.countdown={label:'Noodstroom ziekenhuis',until:SIM.t+60};pushAlarm('Brandweer: 10 kV spanningsloos bevestigd – we gaan naar binnen','ok');
        at(SIM.t-GAME.t0+30,()=>{FIRE.on=false;if(FIRE.glow){scene.remove(FIRE.glow);FIRE.glow=null;}GAME.flags.mustOpen=null;GAME.flags.outAt=SIM.t;D['V-F6'].stuck=true;
          readyNotice('Brandweer: brand geblust, rook afgezogen. De 10 kV mag weer onder spanning – V-F6 heeft rookschade en blijft defect',null);});}
      if(GAME.flags.deadAt&&!GAME.flags.outAt&&!dead&&!GAME.flags.danger){GAME.flags.danger=true;incident();pushAlarm('Brandweer: er staat weer spanning op de installatie terwijl wij binnen zijn! Iedereen naar buiten!','crit');}},
    obj:()=>[{t:'10 kV spanningsloos binnen 10 min na het verzoek',check:()=>GAME.flags.fireReq==null?null:GAME.flags.deadAt?'done':SIM.t>GAME.flags.fireReq+10?'fail':null},
      {t:'Geen spanning terwijl de brandweer binnen is',check:()=>GAME.flags.danger?'fail':null,final:()=>true},
      {t:'Ziekenhuis terug vóór de noodstroom op is',check:()=>!GAME.flags.outAt?null:EN.has('F5')?'done':SIM.t>GAME.flags.deadAt+60?'fail':null,final:()=>EN.has('F5')},
      {t:'Alle stations in de ringen binnen 25 min na het blussen terug',check:()=>!GAME.flags.outAt?null:RING.stations.every(s=>EN.has(s.node))?'done':SIM.t>GAME.flags.outAt+25?'fail':null,final:()=>RING.stations.every(s=>EN.has(s.node))}]},
  evenement:{scen:true,name:'Concert op het Marktplein',tag:'Scenario · gemiddeld',start:18.5,dur:150,season:'zomer',weather:'helder',
    desc:'Een groot zomerconcert op het Marktplein: podium, lichtshow en foodtrucks op het net van MS6. Houd het concert in de lucht zonder dat de zekeringen doorslaan.',
    setup(){const g=LVG.find(x=>x.id==='MS6-G2');GAME.flags.evBase=g.base;FLEX.push({id:'MS6-G2',name:'Concert Marktplein',how:'podium deels op eigen aggregaat',max:0.75,eur:240,c:g,req:0,at:0});
      pushAlarm('Vanavond concert op het Marktplein (19:15–22:00) – de organisatie heeft een flexcontract voor het podium','info');},
    // publiek en podium bouwen in een half uur op
    tick(){const g=LVG.find(x=>x.id==='MS6-G2'),h=hourOf(),on=h>=19.25&&h<22;g.base=GAME.flags.evBase+(on?2.6*clamp((h-19.25)/0.5,0,1):0);
      if(on&&!GAME.flags.evStart){GAME.flags.evStart=SIM.t;pushAlarm('Het concert begint – de belasting op MS6 Marktplein stijgt sterk','warn');}
      if(on&&!EN.has('M6'))GAME.flags.evOff=true;},
    obj:()=>[{t:'Geen doorgeslagen zekeringen',check:()=>GAME.stats.fuses?'fail':null,final:()=>true},
      {t:'Het concert blijft onder spanning',check:()=>GAME.flags.evOff?'fail':null,final:()=>true},
      {t:'Geen kabel doorgebrand',check:()=>GAME.stats.burn?'fail':null,final:()=>true},noIncidents]},
  laadpiek:{scen:true,name:'Laadpiek op een winteravond',tag:'Scenario · gemiddeld',start:16.5,dur:120,season:'winter',weather:'bewolkt',
    desc:'Het laadplein in Zuiderveld is uitgebreid en half de wijk heeft een thuislader. Iedereen komt tegelijk thuis: de woonwijk loopt tegen de grenzen van het net aan.',
    setup(){LVG.find(x=>x.id==='MS4-G3').base=2.6;LVG.filter(g=>RINGS[0].stations.includes(g.st)&&g.kind==='res').forEach(g=>{g.base*=1.3;});
      pushAlarm('Laadplein Zuiderveld uitgebreid tot 40 snelladers; 45% van de woningen in de woonwijk heeft een thuislader','info');
      pushAlarm('Tip: kijk in het overzicht Flex (C) welke trafo’s en kabels het zwaarst belast zijn. Het laadplein kan slim laden.','info');},
    obj:()=>[{t:'Geen doorgeslagen zekeringen',check:()=>GAME.stats.fuses?'fail':null,final:()=>true},
      {t:'Geen kabel doorgebrand',check:()=>GAME.stats.burn?'fail':null,final:()=>true},
      {t:'Minder dan 3.000 klantminuten',check:()=>SIM.cml>3000?'fail':null,final:()=>SIM.cml<=3000},noIncidents]},
});
