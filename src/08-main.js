
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
  else if(e.key==='Escape'){if(menuOpen()){if(performance.now()-menuAt>350)closeMenu();}else if(SEL&&!document.pointerLockElement)selectDevice(null);else openMenu();}});
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
  $('#pauseMenu').classList.remove('hidden');document.body.classList.add('menu');}
function closeMenu(){$('#pauseMenu').classList.add('hidden');document.body.classList.remove('menu');SIM.paused=menuPrev;syncSpeed();if(FP.on)canvasEl.requestPointerLock?.();}
$('#pauseMenu').addEventListener('click',e=>{const b=e.target.closest('[data-pm]');if(!b)return;const a=b.dataset.pm;
  if(a==='resume')closeMenu();
  else if(a==='end'){$('#pauseMenu').classList.add('hidden');document.body.classList.remove('menu');if(FP.on)exitFP();endGame();}
  else if(a==='menu'){finalizeGame();saveBest();location.search='';}});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function startGame(id){$('#intro').classList.add('hidden');AudioSys.init();controls.autoRotate=false;
  applyMode(id);pushAlarm(`Dienst overgenomen – ${MODES[id]?.name||'Vrije dienst'} (${DIFFS[GAME.diff].label})`,'ok');setSpeed(60);
  const v=VIEWPOS[0];flyTo(v[0].clone(),v[1].clone(),2);}
$('#menu').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(b)startGame(b.dataset.mode);});
$('#diff').addEventListener('click',e=>{const b=e.target.closest('[data-d]');if(b){GAME.diff=b.dataset.d;renderMenu();}});
$('#season').addEventListener('click',e=>{const b=e.target.closest('[data-s]');if(b){GAME.season=b.dataset.s;setSeason(GAME.season);updateSky(hourOf());renderMenu();}});
addEventListener('pointerdown',()=>AudioSys.init(),{once:true});

// ============================================================ start
buildSLD();buildLabels();buildColliders();initTaps();updateSky(hourOf());updateSLD();updateHUD();renderTasks();
document.querySelectorAll('#speed button').forEach(b=>b.classList.remove('on'));
$('#loading').remove();
if(DIFFS[params.get('diff')])GAME.diff=params.get('diff');if(SEASONS[params.get('season')])GAME.season=params.get('season');setSeason(GAME.season);
if(params.get('weer')&&WX_TYPES[params.get('weer')])setWeather(params.get('weer'),true,true);
if(params.has('play'))startGame(params.get('play'));
else if(params.has('autostart')){$('#intro').classList.add('hidden');applyMode('free');setSpeed(60);}
else{renderMenu();$('#intro').classList.remove('hidden');controls.autoRotate=true;controls.autoRotateSpeed=0.35;}
if(params.has('night'))updateSky(22);
if(params.has('view')){const v=VIEWPOS[+params.get('view')];camera.position.copy(v[0]);controls.target.copy(v[1]);controls.autoRotate=false;controls.update();}

window.OS={SIM,D,task:()=>TASK,briefSubmit,briefCheck,actKey,taskActs,crewNear,boxOf:id=>VIEWS[id]&&VIEWS[id].box,AudioSys,updateAudio,WX,setWeather,setSeason,SEASONS,ambient,enterKiosk,ROOMS,blockedAt,RING,NPCS,crewDispatch,ringFault,FP,enterFP,exitFP,pickCenter,camera,camInside,setRatio,setTab,GAME,MODES,applyMode,endGame,EN:()=>EN,FLOW,operate,tapStep,setAVR,resetLockout,toggleAR,regulate,computeFlows,randomEvent,lineFault,feederFault,trafoFault,offerTask,simStep,FEEDERS};
const clock=new THREE.Clock();let hudT=0,skyT=0;
renderer.setAnimationLoop(()=>{
  const dt=Math.min(0.1,clock.getDelta());
  simStep(dt);
  for(const v of Object.values(VIEWS))if(v.update)v.update(dt);
  for(let i=FX.length-1;i>=0;i--)if(!FX[i].update(dt))FX.splice(i,1);
  ROTORS.forEach(r=>r.r.rotation.z+=r.s*dt);
  const blink=(performance.now()%1500)<300?NIGHT:0;BEACONS.forEach(b=>b.material.opacity=blink);
  if(FP.on)updateFP(dt);
  else{if(fly){fly.t+=dt;const k=easeIO(clamp(fly.t/fly.dur,0,1));camera.position.lerpVectors(fly.p0,fly.p1,k);controls.target.lerpVectors(fly.t0,fly.t1,k);if(fly.t>=fly.dur)fly=null;}
  controls.minDistance=camInside()?1.2:4;controls.update();}
  if((skyT+=dt)>0.25){skyT=0;if(!params.has('night'))updateSky(hourOf());}
  if((hudT+=dt)>0.25){hudT=0;updateHUD();updateSLD();refreshDevPanel();updateAudio();drawPanelScreens();renderTasks();updateStreetLights();}
  updateHover();updateLabels();updateRain(dt);updateNPCs(dt);updateKioskLight();
  let off=null;if(shake>0.01){off=V3((Math.random()-0.5)*shake,(Math.random()-0.5)*shake,(Math.random()-0.5)*shake);camera.position.add(off);shake*=Math.pow(0.02,dt);}
  renderer.render(scene,camera);
  if(off)camera.position.sub(off);
});
