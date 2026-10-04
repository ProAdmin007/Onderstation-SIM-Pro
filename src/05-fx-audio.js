
// ============================================================ effecten
const FX=[];let shake=0;
function spawnArc(pos,k=1){
  if(!pos)pos=V3(0,3,45);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));glow.position.copy(pos);scene.add(glow);
  const N=240,P=new Float32Array(N*3),Vv=[];
  for(let i=0;i<N;i++){P.set([pos.x,pos.y,pos.z],i*3);Vv.push(V3(Math.random()-0.5,Math.random()*0.9-0.15,Math.random()-0.5).normalize().multiplyScalar(3+Math.random()*10*k));}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(P,3));
  const pts=new THREE.Points(geo,new THREE.PointsMaterial({color:0xffc27a,size:0.14,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false}));scene.add(pts);
  const smokes=[];for(let i=0;i<8;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:smokeTex,color:0x777777,transparent:true,opacity:0,depthWrite:false}));
    s.position.copy(pos).add(V3(Math.random()-0.5,Math.random()*0.5,Math.random()-0.5));s.scale.setScalar(1.4);s.userData.v=V3((Math.random()-0.5)*0.6,0.7+Math.random()*0.8,(Math.random()-0.5)*0.6);scene.add(s);smokes.push(s);}
  arcLight.position.copy(pos);
  FX.push({t:0,update(dt){this.t+=dt;const t=this.t,live=t<0.6;
    arcLight.intensity=live?(0.5+Math.random())*5000*k*(1-t/0.6):0;
    glow.material.opacity=live?0.5+Math.random()*0.5:Math.max(0,1-(t-0.6)*4);glow.scale.setScalar(8*k*(0.7+Math.random()*0.5));
    const p=geo.attributes.position.array;
    for(let i=0;i<N;i++){const v=Vv[i];v.y-=9.8*dt;p[i*3]+=v.x*dt;p[i*3+1]+=v.y*dt;p[i*3+2]+=v.z*dt;if(p[i*3+1]<0.06){p[i*3+1]=0.06;v.multiplyScalar(0.3);v.y=Math.abs(v.y);}}
    geo.attributes.position.needsUpdate=true;pts.material.opacity=Math.max(0,1-t/1.8);
    smokes.forEach(s=>{s.position.addScaledVector(s.userData.v,dt);s.scale.multiplyScalar(1+dt*0.5);s.material.opacity=t<0.3?t/0.3*0.6:Math.max(0,0.6*(1-(t-0.3)/5));});
    if(t>5.5){[glow,pts,...smokes].forEach(o=>{scene.remove(o);o.material.dispose();});geo.dispose();arcLight.intensity=0;return false;}return true;}});
  shake=Math.max(shake,0.5*k);AudioSys.arc(k*distGain(pos));
}
function lightning(L){lightningAt(V3(BAYS[L].x,27.5,-360));}
function lightningAt(target,thunderDelay=1300){
  const start=V3(target.x+rnd(-80,80),430,target.z+rnd(-120,40)),pts=[];
  for(let i=0;i<=22;i++){const q=start.clone().lerp(target,i/22);if(i>0&&i<22){q.x+=rnd(-16,16);q.z+=rnd(-16,16);}pts.push(q);}
  const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,false,'catmullrom',0.05),160,0.9,5,false),new THREE.MeshBasicMaterial({color:0xeef3ff,fog:false,transparent:true}));scene.add(m);
  const g=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));g.position.copy(target);g.scale.setScalar(70);scene.add(g);
  FX.push({t:0,update(dt){this.t+=dt;const t=this.t;const on=(t<0.09)||(t>0.15&&t<0.32)||(t>0.4&&t<0.46);
    m.visible=g.visible=on;flashLight.intensity=on?7:0;
    if(t>0.6){scene.remove(m,g);m.geometry.dispose();m.material.dispose();g.material.dispose();flashLight.intensity=0;return false;}return true;}});
  setTimeout(()=>AudioSys.thunder(),thunderDelay);
}

// ============================================================ geluid (Web Audio, volledig synthetisch)
const AUDIO_BUSES=['omgeving','schakel','alarm','telefoon'];
const AudioSys={ctx:null,muted:false,vol:0.9,busVol:{},route:null,
  out(){return this.route||this.bus?.schakel||this.master;},   // eenmalige geluiden gaan naar het kanaal van wie ze afspeelt (standaard: schakelen)
  setVol(k,v){if(k==='master'){this.vol=v;if(this.master&&!this.muted)this.master.gain.value=v;}else{this.busVol[k]=v;if(this.bus?.[k])this.bus[k].gain.value=v;}},
  init(){if(this.ctx){this.ctx.resume();return;}const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const c=this.ctx=new AC();
    this.master=c.createGain();this.master.gain.value=this.vol;this.master.connect(c.destination);
    // geluidskanalen, elk met een eigen volume (instellingen): omgeving, schakelen, alarmen, telefoon
    this.bus={};for(const k of AUDIO_BUSES){const g=c.createGain();g.gain.value=this.busVol[k]??1;g.connect(this.master);this.bus[k]=g;}
    const len=c.sampleRate*2,b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;this.nbuf=b;
    this.hum=c.createGain();this.hum.gain.value=0;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=700;this.hum.connect(lp);lp.connect(this.bus.omgeving);
    [[100,1],[200,0.5],[300,0.22],[400,0.12],[500,0.05]].forEach(([f,a])=>{const o=c.createOscillator();o.frequency.value=f+(Math.random()-0.5)*0.4;const g=c.createGain();g.gain.value=a;o.connect(g);g.connect(this.hum);o.start();});
    this.fan=this.loopNoise('bandpass',380,0.8,0);this.wind=this.loopNoise('lowpass',320,0.5,0.03);this.rain=this.loopNoise('highpass',1100,0.4,0);
    // plek-geluiden: brom binnen (installatie/trafo), verkeer in de wijk, corona op het hoogspanningsterrein
    this.room=c.createGain();this.room.gain.value=0;const rl=c.createBiquadFilter();rl.type='lowpass';rl.frequency.value=900;this.room.connect(rl);rl.connect(this.bus.omgeving);
    [[100,1],[200,0.35],[300,0.18],[50,0.25]].forEach(([f,a])=>{const o=c.createOscillator();o.frequency.value=f+(Math.random()-0.5)*0.3;const g=c.createGain();g.gain.value=a;o.connect(g);g.connect(this.room);o.start();});
    this.vent=this.loopNoise('bandpass',700,0.5,0);this.traffic=this.loopNoise('lowpass',170,0.7,0);this.corona=this.loopNoise('highpass',5200,0.6,0);},
  loopNoise(type,f,q,gain){const c=this.ctx,s=c.createBufferSource();s.buffer=this.nbuf;s.loop=true;const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=c.createGain();g.gain.value=gain;s.connect(fl);fl.connect(g);g.connect(this.bus.omgeving);s.start();return g;},
  set(g,v){if(this.ctx)g.gain.setTargetAtTime(v,this.ctx.currentTime,0.3);},
  burst({type='bandpass',f=1000,q=1,gain=0.5,dur=0.3,attack=0.003,delay=0}={}){if(!this.ctx||gain<=0.001)return;const c=this.ctx,t=c.currentTime+delay;const s=c.createBufferSource();s.buffer=this.nbuf;
    const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+attack);g.gain.exponentialRampToValueAtTime(0.0005,t+dur);
    s.connect(fl);fl.connect(g);g.connect(this.out());s.start(t,Math.random()*1.5);s.stop(t+dur+0.05);},
  tone({f=440,f2=null,type='sine',gain=0.2,dur=0.2,delay=0}={}){if(!this.ctx||gain<=0.001)return;const c=this.ctx,t=c.currentTime+delay;const o=c.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);
    const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+0.005);g.gain.exponentialRampToValueAtTime(0.0005,t+dur);o.connect(g);g.connect(this.out());o.start(t);o.stop(t+dur+0.05);},
  breaker(v=1){this.tone({f:95,f2:38,gain:0.9*v,dur:0.35});this.burst({type:'highpass',f:2500,gain:0.35*v,dur:0.09});this.burst({f:700,q:0.8,gain:0.45*v,dur:0.25,delay:0.01});this.burst({f:3200,q:3,gain:0.12*v,dur:0.5,delay:0.05});},
  motor(dur=2.8,v=0.5){const c=this.ctx;if(!c)return;const t=c.currentTime;const o=c.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(60,t);o.frequency.linearRampToValueAtTime(92,t+0.4);
    const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=480;const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.07*v,t+0.2);g.gain.setValueAtTime(0.07*v,t+dur-0.3);g.gain.linearRampToValueAtTime(0,t+dur);
    o.connect(fl);fl.connect(g);g.connect(this.out());o.start(t);o.stop(t+dur+0.1);this.burst({f:1500,gain:0.25*v,dur:0.15,delay:dur-0.1});this.tone({f:120,f2:60,gain:0.3*v,dur:0.2,delay:dur-0.1});},
  arc(k=1){for(let i=0;i<16;i++)this.burst({f:1500+Math.random()*3500,q:0.6,gain:0.55*k*Math.random(),dur:0.05+Math.random()*0.1,delay:i*0.035});
    this.burst({type:'lowpass',f:500,gain:1.1*k,dur:1.3});this.tone({f:130,f2:30,gain:0.8*k,dur:0.7});this.burst({type:'highpass',f:4000,gain:0.3*k,dur:0.7});},
  thunder(){this.burst({type:'lowpass',f:170,gain:1.3,dur:4.8,attack:0.1});this.burst({type:'lowpass',f:700,gain:0.5,dur:1.6,attack:0.02});this.burst({type:'lowpass',f:260,gain:0.7,dur:3,attack:0.4,delay:0.7});},
  alarm(level){if(level==='crit'){[0,0.18,0.36].forEach((d,i)=>this.tone({f:i%2?660:880,gain:0.1,dur:0.14,delay:d}));}else if(level==='warn')this.tone({f:740,gain:0.07,dur:0.16});},
  ready(){[523,659,784,1047].forEach((f,i)=>this.tone({f,type:'triangle',gain:0.13,dur:0.55,delay:i*0.12}));this.tone({f:1568,gain:0.05,dur:0.9,delay:0.48});},
  chirp(v=1){const b=2600+Math.random()*2400,n=2+Math.floor(Math.random()*4);for(let i=0;i<n;i++)this.tone({f:b*(0.9+Math.random()*0.25),f2:b*(1.15+Math.random()*0.3),gain:0.018*v,dur:0.07+Math.random()*0.05,delay:i*(0.1+Math.random()*0.06)});},
  carPass(v=1){this.burst({type:'lowpass',f:420,q:0.6,gain:0.07*v,dur:3.6,attack:1.6});this.tone({f:95,f2:72,type:'sawtooth',gain:0.012*v,dur:3.2,delay:0.4});},
  cricket(v=1){for(let i=0;i<4;i++)this.tone({f:4300+Math.random()*200,gain:0.007*v,dur:0.035,delay:i*0.065});},
  chime(){this.tone({f:660,gain:0.08,dur:0.3});this.tone({f:990,gain:0.07,dur:0.4,delay:0.12});},
  deny(){this.tone({f:200,type:'square',gain:0.045,dur:0.2});},
  ring(){this.tone({f:440,gain:0.045,dur:0.35});this.tone({f:480,gain:0.045,dur:0.35,delay:0.42});},
  toggleMute(){this.muted=!this.muted;if(this.master)this.master.gain.value=this.muted?0:this.vol;return this.muted;}};
// welke geluiden bij welk kanaal horen
for(const [bus,names] of [['alarm',['alarm','ready','chime','deny']],['omgeving',['chirp','carPass','cricket','thunder']],['telefoon',['ring']]])
  names.forEach(n=>{const f=AudioSys[n];AudioSys[n]=function(...a){const prev=this.route;this.route=this.bus?.[bus]||null;try{return f.apply(this,a);}finally{this.route=prev;}};});
function distGain(p){const d=camera.position.distanceTo(p);return clamp(1.2/(1+(d/35)**2)+0.12,0.12,1);}
// ---- geluid per plek (elke 0,25 s)
function updatePlaceAudio(){const A=AudioSys,ins=camInside(),r=ins&&ROOMS[ins-1],kiosk=!!(r&&r.kiosk),p=camera.position,F=FENCE;
  const inYard=!ins&&p.x>F.x0&&p.x<F.x1&&p.z>F.z0&&p.z<F.z1&&p.y<40,district=!ins&&!inYard&&p.y<70&&p.z>60;
  let kload=0;if(kiosk){const st=RING.stations.find(s=>s.id===r.kioskId);kload=st&&EN.has(st.node)?0.6+0.4*Math.min(1,st.P/1.5):0;}
  A.set(A.room,kiosk?0.16*kload:ins?0.035:0);A.set(A.vent,ins&&!kiosk?0.02:0);
  A.set(A.traffic,district?(NIGHT>0.5?0.01:0.03)*(1-0.5*WX.cur.snow):0);
  A.corona.gain.setTargetAtTime(inYard?(0.006+0.05*WX.cur.rain+0.03*WX.cur.fog)*(0.5+Math.random()):0,A.ctx.currentTime,0.05);
  const quiet=WX.cur.rain<0.3&&WX.cur.snow<0.3;
  if(!ins&&NIGHT<0.3&&quiet&&p.y<80&&Math.random()<0.25/(district?3:7))A.chirp(district?1:0.6);
  if(district&&NIGHT<0.8&&Math.random()<0.25/9)A.carPass(NIGHT>0.4?0.6:1);
  if(!ins&&NIGHT>0.6&&quiet&&(SEASON===SEASONS.zomer||SEASON===SEASONS.lente)&&Math.random()<0.25/1.2)A.cricket();}
function updateAudio(){if(!AudioSys.ctx)return;updatePlaceAudio();let hum=0,fan=0;
  TR.forEach(T=>{const v=VIEWS[T];if(!v)return;const d=camera.position.distanceTo(v.center),att=1/(1+(d/16)**2);
    if(EN.has(T+'h'))hum+=(0.35+0.65*D[T].S/D[T].rAF)*att;if(D[T].fans&&EN.has(T+'h'))fan+=att;});
  AudioSys.set(AudioSys.hum,clamp(hum*0.2,0,0.3));AudioSys.set(AudioSys.fan,clamp(fan*0.12,0,0.15));AudioSys.set(AudioSys.rain,WX.cur.rain*(camInside()?0.025:0.08));AudioSys.set(AudioSys.wind,0.025+0.05*WX.cur.cloud+0.05*WX.cur.thunder);}

// regen (alleen tijdens storm)
const RAIN=(()=>{const N=3500,pos=new Float32Array(N*6),drops=[];for(let i=0;i<N;i++)drops.push([rnd(-70,70),rnd(0,45),rnd(-70,70),rnd(24,32)]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const ls=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x9aa6b4,transparent:true,opacity:0.3,depthWrite:false}));ls.frustumCulled=false;ls.visible=false;scene.add(ls);return{N,pos,drops,g,ls};})();
// sneeuw
const SNOW=(()=>{const N=2600,pos=new Float32Array(N*3),fl=[];for(let i=0;i<N;i++)fl.push([rnd(-60,60),rnd(0,35),rnd(-60,60),rnd(0.7,1.4),Math.random()*6]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const p=new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:0.11,transparent:true,opacity:0.9,depthWrite:false}));p.frustumCulled=false;p.visible=false;scene.add(p);return{N,pos,fl,g,p};})();
function updateSnow(dt){const s=SNOW;s.p.visible=WX.cur.snow>0.08&&!camInside();if(!s.p.visible)return;s.p.material.opacity=0.9*Math.min(1,WX.cur.snow*1.3);s.p.position.set(camera.position.x,0,camera.position.z);const t=performance.now()/1000;
  for(let i=0;i<s.N;i++){const f=s.fl[i];f[1]-=f[3]*dt;if(f[1]<0){f[1]+=35;f[0]=rnd(-60,60);f[2]=rnd(-60,60);}const k=i*3;s.pos[k]=f[0]+Math.sin(t*0.8+f[4])*0.6;s.pos[k+1]=f[1];s.pos[k+2]=f[2]+Math.cos(t*0.6+f[4])*0.6;}
  s.g.attributes.position.needsUpdate=true;}
function updateRain(dt){updateSnow(dt);const r=RAIN;r.ls.visible=WX.cur.rain>0.08&&!camInside();if(!r.ls.visible)return;r.ls.material.opacity=0.32*Math.min(1,WX.cur.rain*1.2);r.ls.position.set(camera.position.x,0,camera.position.z);
  for(let i=0;i<r.N;i++){const d=r.drops[i];d[1]-=d[3]*dt;d[0]+=4*dt;if(d[1]<0){d[1]+=45;d[0]=rnd(-70,70);}if(d[0]>70)d[0]-=140;
    const k=i*6;r.pos[k]=d[0];r.pos[k+1]=d[1];r.pos[k+2]=d[2];r.pos[k+3]=d[0]-0.12;r.pos[k+4]=d[1]+0.9;r.pos[k+5]=d[2];}
  r.g.attributes.position.needsUpdate=true;}
