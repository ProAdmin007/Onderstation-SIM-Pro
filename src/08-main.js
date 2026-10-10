
// ============================================================ HUD + bediening
function updateHUD(){
  $('#clock').textContent=fmtClock(SIM.t);
  $('#wx').textContent=wxLabel();
  const dt=new Date(SEASON.date.getTime()+Math.floor(SIM.t/1440)*864e5);
  $('#date').textContent=dt.toLocaleDateString('nl-NL',{weekday:'short',day:'numeric',month:'short'})+(SIM.paused&&!$('#intro').classList.contains('hidden')?'':SIM.paused?' · PAUZE':'');
  $('#kOff').textContent=SIM.off.toLocaleString('nl-NL');$('#kpiOff').classList.toggle('bad',SIM.off>0);
  $('#kCml').textContent=Math.round(SIM.cml).toLocaleString('nl-NL');
  $('#kScore').textContent=Math.round(GAME.score).toLocaleString('nl-NL');$('#kInc').textContent=SIM.incidents;$('#kpiInc').classList.toggle('bad',SIM.incidents>0);
}
function setSpeed(s){if(GAME.ended)return;if(s===0)SIM.paused=!SIM.paused;else{SIM.speed=s;SIM.paused=false;}syncSpeed();}
function syncSpeed(){document.querySelectorAll('#speed button').forEach(b=>{const v=+b.dataset.s;b.classList.toggle('on',v===0?SIM.paused:(!SIM.paused&&v===SIM.speed));});updateHUD();}
$('#speed').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setSpeed(+b.dataset.s);});
$('#interlock').addEventListener('change',e=>{SIM.interlock=e.target.checked;pushAlarm(SIM.interlock?'Vergrendelingen ingeschakeld':'Let op: vergrendelingen UITGESCHAKELD – verkeerde handelingen worden niet tegengehouden',SIM.interlock?'info':'warn');refreshDevPanel();});
$('#mute').addEventListener('click',()=>{const m=AudioSys.toggleMute();$('#mute').style.opacity=m?0.45:1;});
$('#scadaToggle').addEventListener('click',()=>{const s=$('#scada');s.classList.toggle('min');$('#scadaToggle').textContent=s.classList.contains('min')?'+':'–';});
$('#views').addEventListener('click',e=>{const b=e.target.closest('button');if(b&&b.dataset.v){const v=VIEWPOS[+b.dataset.v];flyTo(v[0].clone(),v[1].clone());}});
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;
  if(e.key>='1'&&e.key<='9'){const v=VIEWPOS[+e.key-1];flyTo(v[0].clone(),v[1].clone());}
  else if(e.code==='Space'&&!FP.on){e.preventDefault();if($('#intro').classList.contains('hidden'))setSpeed(0);}
  else if(e.code==='KeyP'){if($('#intro').classList.contains('hidden'))setSpeed(0);}
  else if(e.key==='l'||e.key==='L')document.body.classList.toggle('nolabels');
  else if(e.key==='m'||e.key==='M')$('#mute').click();
  else if(e.key==='Escape'){if(GAME.handover?.open)closeHandover();else if(setOpen())closeSettings();else if(flexOpen())closeFlex();else if(assOpen())closeAssets();else if(kitOpen())closeKit();else if(keysOpen())closeKeys();else if(protOpen())closeProt();else if(menuOpen()){if(performance.now()-menuAt>350)closeMenu();}else if(SEL&&!document.pointerLockElement)selectDevice(null);else openMenu();}});
// ---------- SCADA-zoom
let SLDZ=1;try{SLDZ=+localStorage.getItem('osz-sldz')||1;}catch(e){}
function setZoom(z){SLDZ=clamp(Math.round(z*4)/4,0.75,2.5);document.documentElement.style.setProperty('--sldz',SLDZ);$('#zVal').textContent=Math.round(SLDZ*100)+'%';try{localStorage.setItem('osz-sldz',SLDZ);}catch(e){}}
$('#zIn').addEventListener('click',()=>setZoom(SLDZ+0.25));$('#zOut').addEventListener('click',()=>setZoom(SLDZ-0.25));
$('#scada').addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();setZoom(SLDZ+(e.deltaY<0?0.25:-0.25));},{passive:false});
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(e.key==='+'||e.key==='=')setZoom(SLDZ+0.25);else if(e.key==='-'||e.key==='_')setZoom(SLDZ-0.25);});
setZoom(SLDZ);
// ---------- pauzemenu (Esc)
let menuPrev=false,menuAt=0;
const menuOpen=()=>!$('#pauseMenu').classList.contains('hidden');
function openMenu(){if(GAME.ended||menuOpen()||!$('#intro').classList.contains('hidden'))return;menuPrev=SIM.paused;menuAt=performance.now();SIM.paused=true;syncSpeed();unlockPointer();
  const m=MODES[GAME.mode]||MODES.free;$('#pmMode').textContent=`${m.name} · ${DIFFS[GAME.diff].label}`;$('#pmScore').textContent=Math.round(GAME.score).toLocaleString('nl-NL');
  $('#pmBest').textContent=getBest(GAME.mode,GAME.diff)?`beste: ${getBest(GAME.mode,GAME.diff).toLocaleString('nl-NL')}`:'nog geen beste score';
  $('#pmSave').disabled=!canSave();$('#pmSave').title=canSave()?'':'Opslaan kan in de vrije dienst en in de dag- en avonddienst (niet in scenario\'s en lessen)';
  $('#pmMenu').textContent=canSave()?'Opslaan en naar hoofdmenu':'Score opslaan en naar hoofdmenu';
  $('#pauseMenu').classList.remove('hidden');document.body.classList.add('menu');}
function closeMenu(){$('#pauseMenu').classList.add('hidden');document.body.classList.remove('menu');SIM.paused=menuPrev;syncSpeed();if(FP.on)canvasEl.requestPointerLock?.();}
$('#pauseMenu').addEventListener('click',e=>{const b=e.target.closest('[data-pm]');if(!b)return;const a=b.dataset.pm;
  if(a==='resume')closeMenu();
  else if(a==='settings'){closeMenu();openSettings();}
  else if(a==='keys'){closeMenu();openKeys();}
  else if(a==='save'){if(saveGame())closeMenu();else deny('Opslaan kan in de vrije dienst en in de dag- en avonddienst');}
  else if(a==='end'){$('#pauseMenu').classList.add('hidden');document.body.classList.remove('menu');if(FP.on)exitFP();endGame();}
  else if(a==='menu'){if(canSave())saveGame(true);else{finalizeGame();saveBest();}location.search='';}});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function startGame(id){$('#intro').classList.add('hidden');AudioSys.init();controls.autoRotate=false;
  applyMode(id);pushAlarm(`${MODES[id]?.name||'Vrije dienst'} gestart (${DIFFS[GAME.diff].label})`,'ok');setSpeed(60);if(GAME.handover)openHandover();
  const v=VIEWPOS[0];flyTo(v[0].clone(),v[1].clone(),2);}
$('#menu').addEventListener('click',e=>{if(e.target.closest('[data-resume]'))return void(location.search='?resume');if(e.target.closest('[data-delsave]')){deleteSave();return renderMenu();}const b=e.target.closest('[data-mode]');if(b)startGame(b.dataset.mode);});
$('#diff').addEventListener('click',e=>{const b=e.target.closest('[data-d]');if(b){GAME.diff=b.dataset.d;renderMenu();}});
$('#season').addEventListener('click',e=>{const b=e.target.closest('[data-s]');if(b){GAME.season=b.dataset.s;setSeason(GAME.season);updateSky(hourOf());renderMenu();}});
addEventListener('pointerdown',()=>AudioSys.init(),{once:true});

// ============================================================ start
buildSLD();checkModel();buildLabels();buildColliders();initTaps();updateSky(hourOf());updateSLD();updateHUD();renderTasks();
document.querySelectorAll('#speed button').forEach(b=>b.classList.remove('on'));
$('#loading').remove();
if(DIFFS[params.get('diff')])GAME.diff=params.get('diff');if(SEASONS[params.get('season')])GAME.season=params.get('season');setSeason(GAME.season);
if(params.get('weer')&&WX_TYPES[params.get('weer')])setWeather(params.get('weer'),true,true);
if(params.has('resume')&&readSave())resumeGame(readSave());
else if(params.has('play'))startGame(params.get('play'));
else if(params.has('autostart')){$('#intro').classList.add('hidden');applyMode('free');setSpeed(60);}
else{renderMenu();$('#intro').classList.remove('hidden');controls.autoRotate=true;controls.autoRotateSpeed=0.35;}
if(params.has('night'))updateSky(22);
if(params.has('view')){const v=VIEWPOS[+params.get('view')];camera.position.copy(v[0]);controls.target.copy(v[1]);controls.autoRotate=false;controls.update();}

window.OS={refreshDevPanel,updateSLD,openKeys,closeKeys,KEY_HELP,RELAY_BAYS,relayTask,relayDue,relayDefect,initRelays,kitTests,kitMeasure,kitVerdict,kitRun,openKit,closeKit,saveGame,readSave,deleteSave,resumeGame,canSave,specOf,CABLE,soilT,FD,meppelFault,linkTick,tabAlarms,updateTabAlarms,renderTasks,INC,INCIDENTS,startIncident,endIncident,incidentTick,setTab,renderCables,GFX,setGfx,applyGfx,openSettings,closeSettings,WX_TYPES,renderer,scene,FIRE,CARS,updateWindows,updateLife,stationLive,cbMaintTask,worstCb,cond,breakerFails,CB_IDS,FLEX,setFlex,flexTick,congestion,openFlex,closeFlex,checkModel,homeBus,BUSES,SEL_BAYS,TORCH,setTorch,HO_POOL,handoverTick,REC,RP,startReplay,stopReplay,analyse,stationDamage,closeHandover,deviations,PHONE,lvFault,callFrom,phoneAnswer,dispatchLV,LVG,forecast,progAdvice,PROG,startTask:(k,...a)=>{TASK={relayTask,cbMaintTask,railTask,railBTask,stationTask,thermoTask,ringTask,feederTask,lineTask,reserveTask}[k](...a);TASK.i=0;TASK.code='WV-TEST';briefInit(TASK);renderTasks();},SIM,D,LESSONS,lessonGo,selectDevice,abortTask,railTask,stationTask,thermoTask,nearDev,VIEWS,PROT,setProt,openProt,closeProt,busFault,BUSF,RINGS,task:()=>TASK,briefSubmit,briefCheck,briefWatch,actKey,taskActs,crewNear,boxOf:id=>VIEWS[id]&&VIEWS[id].box,AudioSys,updateAudio,WX,setWeather,setSeason,SEASONS,ambient,enterKiosk,ROOMS,blockedAt,RING,NPCS,crewDispatch,ringFault,FP,enterFP,exitFP,pickCenter,camera,camInside,setRatio,setTab,GAME,MODES,applyMode,endGame,EN:()=>EN,FLOW,operate,tapStep,setAVR,resetLockout,toggleAR,regulate,computeFlows,randomEvent,lineFault,feederFault,trafoFault,offerTask,simStep,FEEDERS};
const clock=new THREE.Clock();let hudT=0,skyT=0,progT=0;
let liteAcc=0;
function frame(){
  // testmodus (?lite): de hele lus 15× per seconde in plaats van 60× – elke wijziging aan de pagina kost een compositie in software-grafiek
  // (en in het spel bij een ingestelde maximale beeldfrequentie)
  const raw=clock.getDelta(),cap=LITE?1/15:GFX.fps?1/GFX.fps:0;liteAcc+=raw;if(cap&&liteAcc<cap*0.9)return;
  const dt=Math.min(0.1,liteAcc);liteAcc=0;fpsTick(dt);
  simStep(dt);
  for(const v of Object.values(VIEWS))if(v.update)v.update(dt);
  for(let i=FX.length-1;i>=0;i--)if(!FX[i].update(dt))FX.splice(i,1);
  ROTORS.forEach(r=>r.r.rotation.z+=r.s*dt);
  const blink=(performance.now()%1500)<300?NIGHT:0;BEACONS.forEach(b=>b.material.opacity=blink);
  if(FP.on)updateFP(dt);
  else{if(fly){fly.t+=dt;const k=easeIO(clamp(fly.t/fly.dur,0,1));camera.position.lerpVectors(fly.p0,fly.p1,k);controls.target.lerpVectors(fly.t0,fly.t1,k);if(fly.t>=fly.dur)fly=null;}
  controls.minDistance=camInside()?1.2:4;controls.update();}
  if((skyT+=dt)>0.25){skyT=0;if(!params.has('night'))updateSky(hourOf());}
  if((hudT+=dt)>0.25){hudT=0;if(!RP.on)updateHUD();updateSLD();refreshDevPanel();updateAudio();if(!LITE)drawPanelScreens();renderTasks();updateStreetLights();updateWindows();progTick();if((progT+=1)%4===0)renderProg();if(progT%2===0)renderCables();}
  if(!LITE){updateHover();updateLabels();}if(GFX.particles)updateRain(dt);else RAIN.ls.visible=SNOW.p.visible=false;updateNPCs(dt);updateKioskLight();updateHotspot();phoneTick(dt);replayTick(dt);updateLife(dt);fireTick(dt);
  let off=null;if(shake>0.01){off=V3((Math.random()-0.5)*shake,(Math.random()-0.5)*shake,(Math.random()-0.5)*shake);camera.position.add(off);shake*=Math.pow(0.02,dt);}
  // en het 3D-beeld helemaal niet tekenen: zonder grafische kaart kost één beeld ±2 kernseconden software-grafiek,
  // terwijl de tests alleen de simulatie en de panelen controleren (aanwijzen gaat met raycasting, niet met pixels)
  if(!LITE)renderer.render(scene,camera);
  if(off)camera.position.sub(off);
}
// een fout in één beeld mag het spel niet stilzetten: three.js vraagt het volgende beeld pas na dit beeld aan
const LOOP_ERR=new Map();window.LOOP_ERR=LOOP_ERR;
function loopError(e){const msg=String(e&&e.message||e),where=(String(e&&e.stack||'').split('\n').find(l=>/index\.html|\.js/.test(l))||'').trim().replace(/^at /,'');
  const n=(LOOP_ERR.get(msg)||0)+1;LOOP_ERR.set(msg,n);console.error('Fout in de hoofdlus:',e);
  if(n===1)pushAlarm(`⚠ Interne fout (het spel loopt door): ${msg}${where?` – ${where.slice(-80)}`:''}. Meld dit graag, met wat je net deed.`,'crit');}
renderer.setAnimationLoop(()=>{try{frame();}catch(e){loopError(e);}});
