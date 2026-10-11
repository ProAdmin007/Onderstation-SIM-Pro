
// ============================================================ storingsschrijver (toets R): golfvormen van stroom en spanning rond elke storing
let recSel=0;
const recOpen=()=>!$('#recWin').classList.contains('hidden');
function openRec(i){if(i!=null)recSel=i;if(!recOpen()){modalOpen('rec');if(FP.on)unlockPointer();$('#recWin').classList.remove('hidden');}renderRec();}
function closeRec(){$('#recWin').classList.add('hidden');modalClose('rec');}
// golfvorm per fase (stroom in A, spanning in p.u.) op tijdstip t (s) na het begin van de fout
function recWave(r,t){const w=2*Math.PI*50,ph=[0,-2*Math.PI/3,2*Math.PI/3],out={I:[0,0,0],U:[0,0,0],U0:0};
  const tOff=r.tTrip==null?Infinity:r.tTrip,tInc=r.inc?r.tInc+0.06:Infinity;
  for(let k=0;k<3;k++){const faulted=r.kind==='kortsluiting'&&k<r.phases;let Ia=Math.SQRT2*r.Ipre,Ua=1;
    if(t>=0&&t<tOff){if(faulted){Ia=Math.SQRT2*r.Ik;Ua=0.3;}else if(r.kind==='kortsluiting')Ua=0.85;if(r.kind==='overbelasting')Ia=Math.SQRT2*r.Ik;}
    if(t>=tOff)Ia=0;if(t>=tOff&&t<tOff+0.04)Ua=0.9;if(t>=tInc)Ua=0;
    if(r.kind==='aardfout'&&t>=0){Ua=k===0?0.02:Math.sqrt(3);}
    const dc=faulted&&k===0&&t>=0&&t<tOff?Math.SQRT2*r.Ik*Math.exp(-t/0.035):0;   // gelijkstroomcomponent bij het ontstaan van de fout
    out.I[k]=Ia*Math.sin(w*t+ph[k])+dc;out.U[k]=Ua*Math.sin(w*t+ph[k]+(r.kind==='aardfout'&&k&&t>=0?(k===1?-0.52:0.52):0));}
  if(r.kind==='aardfout'&&t>=0)out.U0=Math.sin(w*t+Math.PI);
  return out;}
function recPlot(r){const W=560,Hh=118,L=40,t0=-0.06,t1=Math.max(0.2,(r.inc?r.tInc:r.tTrip??0.25)+0.12),N=700,X=t=>L+(W-L-6)*(t-t0)/(t1-t0);
  const col=['#f0a43a','#4aa3ff','#c07cff'],samp=[];for(let i=0;i<=N;i++){const t=t0+(t1-t0)*i/N;samp.push([t,recWave(r,t)]);}
  const Imax=Math.max(...samp.map(([,v])=>Math.max(...v.I.map(Math.abs))),1)*1.05;
  const pl=(get,y0,sc,c,dash='')=>`<polyline fill="none" stroke="${c}" stroke-width="1.3" ${dash} points="${samp.map(([t,v])=>`${X(t).toFixed(1)},${(y0-get(v)*sc).toFixed(1)}`).join(' ')}"/>`;
  const panel=(y,title,body,unit)=>`<rect x="${L}" y="${y}" width="${W-L-6}" height="${Hh}" fill="rgba(255,255,255,.02)" stroke="rgba(255,255,255,.08)"/><line x1="${L}" x2="${W-6}" y1="${y+Hh/2}" y2="${y+Hh/2}" stroke="rgba(255,255,255,.12)"/>
    <text x="${L-4}" y="${y+12}" text-anchor="end" class="ax">${unit}</text><rect x="${L+2}" y="${y+2}" width="${title.length*5.6+8}" height="13" fill="#0f1418"/><text x="${L+6}" y="${y+12}" class="ax" style="fill:#d6dde4">${title}</text>${body}`;
  const mark=(t,txt,c,row=0)=>{if(t==null||t>t1)return '';const right=X(t)>W-170;return `<line x1="${X(t)}" x2="${X(t)}" y1="6" y2="${2*Hh+20}" stroke="${c}" stroke-dasharray="3 3"/><text x="${X(t)+(right?-3:3)}" y="${2*Hh+30+row*10}" text-anchor="${right?'end':'start'}" class="ax" style="fill:${c}">${txt}</text>`;};
  const yI=6,yU=Hh+14,sI=(Hh/2-6)/Imax,sU=(Hh/2-6)/1.85;
  const ticks=[];const stp=t1-t0>0.6?0.2:t1-t0>0.3?0.1:0.05;for(let t=Math.ceil(t0/stp)*stp;t<=t1;t+=stp)ticks.push(`<text x="${X(t)}" y="${2*Hh+46}" text-anchor="middle" class="ax">${Math.round(t*1000)} ms</text>`);
  return `<svg class="selc" viewBox="0 0 ${W} ${2*Hh+52}">${panel(yI,'Stroom per fase',[0,1,2].map(k=>pl(v=>v.I[k],yI+Hh/2,sI,col[k])).join(''),`±${Imax>=1000?(Imax/1000).toFixed(1).replace('.',',')+' kA':Math.round(Imax)+' A'}`)}
    ${panel(yU,'Spanning per fase'+(r.kind==='aardfout'?' en U0 (geel)':''),[0,1,2].map(k=>pl(v=>v.U[k],yU+Hh/2,sU,col[k])).join('')+(r.kind==='aardfout'?pl(v=>v.U0,yU+Hh/2,sU,'#e8c547','stroke-dasharray="4 2"'):''),'±1,8 pu')}
    ${mark(0,r.kind==='overbelasting'?'I> afgelopen':'fout','#e5484d')}${mark(r.tTrip,`${r.dev} uit (${Math.round((r.tTrip||0)*1000)} ms)`,'#3fcf72')}${mark(r.inc?r.tInc+0.06:null,`${r.inc} uit – niet selectief`,'#ff6b3d',1)}${ticks.join('')}</svg>`;}
function renderRec(){if(!recOpen())return;const r=FREC[Math.min(recSel,FREC.length-1)];
  const list=FREC.length?FREC.map((x,i)=>`<button class="rec-it ${i===recSel?'on':''}" data-rec="${i}"><b>${fmtClock(x.t)} · ${x.dev}</b><span>${x.kind}${x.Ik?` · ${(x.Ik/1000).toFixed(1).replace('.',',')} kA`:''}${x.inc?' · niet selectief':''}</span></button>`).join(''):'<p class="dl">Nog geen registraties.</p>';
  const info=r?`<p class="bf-desc"><b>${r.dev} ${r.name}</b> · ${r.kind}${r.kind==='kortsluiting'?` (${r.phases===2?'tweefasig':'driefasig'}) · foutstroom ${(r.Ik/1000).toFixed(2).replace('.',',')} kA · uitgeschakeld na ${Math.round(r.tTrip*1000)} ms`:r.kind==='aardfout'?' · geen afschakeling (gecompenseerd net): één fasespanning zakt in, de andere twee stijgen naar √3, U0 komt op':` · stroom ${Math.round(r.Ik)} A`}${r.inc?` · <span class="bad">${r.inc} schakelde ook af na ${Math.round((r.tInc+0.06)*1000)} ms (niet selectief)</span>`:''}</p>${recPlot(r)}`:'';
  $('#recWin').innerHTML=`<div class="card pr"><div class="eyebrow">Storingsschrijver · laatste ${FREC.length} registraties</div><h2>Storingsregistratie</h2>
    <div class="rec-grid"><div class="rec-list">${list}</div><div>${info||'<p class="bf-desc">Bij elke kortsluiting, overbelastingstrip of aardfout legt de storingsschrijver de stromen en spanningen per fase vast.</p>'}</div></div>
    <div class="rep-btns"><button class="primary" data-recclose>Sluiten <kbd>R</kbd></button></div></div>`;}
$('#recWin').addEventListener('click',e=>{if(e.target.closest('[data-recclose]')||e.target.id==='recWin')return closeRec();const b=e.target.closest('[data-rec]');if(b){recSel=+b.dataset.rec;renderRec();}});
$('#recBtn').addEventListener('click',()=>recOpen()?closeRec():openRec(0));
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.ctrlKey||e.metaKey)return;if((e.key==='r'||e.key==='R')&&$('#intro').classList.contains('hidden'))recOpen()?closeRec():openRec(0);});
