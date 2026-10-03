
// ============================================================ seizoenen en weer
const SEASONS={
  lente:{name:'Lente',date:new Date(2026,3,18),rise:6.6,set:20.6,maxEl:45,az:[80,280],amb:[11,6],pv:0.85,
    load:{res:0.98,city:1.0,ind:1,hosp:1,green:0.9},wx:{helder:4,bewolkt:3,regen:3,onweer:1,mist:1}},
  zomer:{name:'Zomer',date:new Date(2026,6,18),rise:5.6,set:21.9,maxEl:59,az:[55,305],amb:[21,7],pv:1.0,
    load:{res:0.88,city:1.1,ind:1.05,hosp:1.08,green:0.7},wx:{helder:6,bewolkt:2,regen:2,onweer:2,hitte:2}},
  herfst:{name:'Herfst',date:new Date(2026,9,3),rise:7.85,set:19.2,maxEl:33,az:[105,255],amb:[11,5],pv:0.6,
    load:{res:1.0,city:1,ind:1,hosp:1,green:1},wx:{helder:3,bewolkt:4,regen:4,onweer:1,mist:2}},
  winter:{name:'Winter',date:new Date(2026,0,15),rise:8.7,set:16.9,maxEl:15,az:[125,235],amb:[3,3],pv:0.25,
    load:{res:1.22,city:1.12,ind:1.02,hosp:1.05,green:1.15},wx:{helder:3,bewolkt:4,regen:2,sneeuw:3,mist:2}}};
let SEASON=SEASONS.herfst;
const WX_TYPES={
  helder:{icon:'☀',name:'Helder',cloud:0.1},bewolkt:{icon:'☁',name:'Bewolkt',cloud:0.75},
  regen:{icon:'🌧',name:'Regen',cloud:0.92,rain:0.8},onweer:{icon:'⛈',name:'Onweer',cloud:1,rain:1,thunder:1},
  sneeuw:{icon:'❄',name:'Sneeuw',cloud:0.85,snow:1,dT:-3},mist:{icon:'🌫',name:'Mist',cloud:0.6,fog:1},
  hitte:{icon:'🔥',name:'Hittegolf',cloud:0,dT:8}};
const WX={type:'bewolkt',lock:false,next:0,cur:{cloud:0.5,rain:0,snow:0,thunder:0,fog:0,dT:0},cover:0};
function setSeason(id){SEASON=SEASONS[id]||SEASONS.herfst;lastEnvElev=-999;}
function setWeather(type,lock=false,instant=false){const t=WX_TYPES[type]||WX_TYPES.helder;WX.type=type;WX.lock=lock;WX.next=SIM.t+rnd(90,240);
  if(instant){Object.assign(WX.cur,{cloud:t.cloud,rain:t.rain||0,snow:t.snow||0,thunder:t.thunder||0,fog:t.fog||0,dT:t.dT||0});WX.cover=t.snow?0.8:0;}lastEnvElev=-999;}
function pickWeather(){const w=SEASON.wx;let tot=0;for(const k in w)tot+=w[k];let r=Math.random()*tot;for(const k in w){r-=w[k];if(r<=0)return k;}return 'helder';}
const ambient=(h=hourOf())=>SEASON.amb[0]+SEASON.amb[1]*Math.sin((h-9)/24*2*Math.PI)+WX.cur.dT-WX.cur.cloud*2;
const isDark=(h,m=0.3)=>h<SEASON.rise-m||h>SEASON.set+m;
// belastingfactor per soort afnemer: seizoen, en extra verwarming bij kou
const seasonMul=kind=>(SEASON.load[kind]??1)*(kind==='res'?1+Math.max(0,(5-ambient())/40):1)*(kind==='city'||kind==='ind'?1+Math.max(0,(ambient()-24)/60):1);
function weatherTick(dm){
  if(!WX.lock&&SIM.t>=WX.next){const n=pickWeather();WX.next=SIM.t+rnd(90,240);if(n!==WX.type){setWeather(n);pushAlarm(`KNMI: ${WX_TYPES[n].name.toLowerCase()} op komst`,'info');}}
  const t=WX_TYPES[WX.type],k=1-Math.exp(-dm/20);
  for(const key of['cloud','rain','snow','thunder','fog','dT'])WX.cur[key]+=((t[key]||0)-WX.cur[key])*k;
  WX.cover=clamp(WX.cover+(WX.cur.snow>0.3?dm/120:-dm/(ambient()>2?120:600)),0,1);   // sneeuwdek groeit en smelt
}
// sneeuwdek op gras, grind en daken
const SNOW_WHITE=new THREE.Color(0xe9eef2);
const SNOWMATS=[MAT.grass,MAT.grassLight,MAT.grassDark,MAT.stubble,MAT.soil,MAT.gravel,MAT.gravelDark,MAT.roof,MAT.roofTile,...DM.roof];
SNOWMATS.forEach(m=>{m.userData.c0=m.color.clone();m.userData.map0=m.map;});
const SNOWTEX=(()=>{const s=256,c=cnv(s),g=c.getContext('2d');g.fillStyle='#eef2f5';g.fillRect(0,0,s,s);
  for(let i=0;i<2600;i++){g.fillStyle=`rgba(${R()<0.5?'170,185,200':'255,255,255'},${0.25+R()*0.4})`;g.fillRect(R()*s,R()*s,1+R()*2,1+R()*2);}
  for(let i=0;i<120;i++){g.fillStyle='rgba(90,105,80,0.18)';g.fillRect(R()*s,R()*s,1.5,1.5);}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=MAXANISO;return t;})();
let lastCover=-1,lastEnvCloud=-1;
function applySnowCover(){if(Math.abs(WX.cover-lastCover)<0.02)return;lastCover=WX.cover;const snowy=WX.cover>0.3;
  SNOWMATS.forEach(m=>{if(m.userData.map0){m.map=snowy?SNOWTEX:m.userData.map0;m.color.copy(snowy?SNOW_WHITE:m.userData.c0);if(snowy)m.color.multiplyScalar(0.8+0.2*WX.cover);}
    else m.color.copy(m.userData.c0).lerp(SNOW_WHITE,WX.cover*0.85);});}
function wxLabel(){const t=WX_TYPES[WX.type];return `${t.icon} ${t.name} · ${Math.round(ambient())} °C`;}
