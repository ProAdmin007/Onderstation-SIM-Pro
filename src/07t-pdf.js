
// ============================================================ dienstrapport als PDF (jsPDF wordt pas bij het klikken via de CDN geladen)
let JSPDF_P=null;
function loadJsPDF(){if(window.jspdf)return Promise.resolve(window.jspdf);
  return JSPDF_P??=new Promise((ok,ko)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload=()=>ok(window.jspdf);s.onerror=()=>{JSPDF_P=null;ko(new Error('jsPDF kon niet worden geladen (geen internet?)'));};document.head.appendChild(s);});}
// standaardlettertypen in een PDF kennen alleen Latijnse tekens: symbolen omzetten
const pdfTxt=t=>String(t??'').replace(/<[^>]+>/g,'').replace(/✓/g,'OK').replace(/✕|✗/g,'X').replace(/★/g,'*').replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/→/g,'->').replace(/[↔⇄]/g,'<->')
  .replace(/×/g,'x').replace(/·/g,'-').replace(/[^\x20-\xFF€–—‘’“”…•]/g,'').replace(/\s+/g,' ').trim();
// tijdlijn uit het rapport als PNG, met lichte kleuren voor op papier
function timelinePNG(){const svg=$('#report svg.tl');if(!svg)return Promise.resolve(null);
  let x=new XMLSerializer().serializeToString(svg).replace(/var\(--accent\)/g,'#e08a1e').replace(/var\(--green\)/g,'#2f9e57').replace(/var\(--muted\)/g,'#666').replace(/rgba\(255,255,255,/g,'rgba(0,0,0,');
  if(!/<svg[^>]*xmlns=/.test(x))x=x.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"');x=x.replace(/(<svg[^>]*>)/,'$1<style>.tl-ax{font:10px monospace;fill:#555}</style>');
  const vb=svg.viewBox.baseVal,W=vb.width*3,H=vb.height*3;
  return new Promise(ok=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,H);g.drawImage(img,0,0,W,H);ok({url:c.toDataURL('image/jpeg',0.88),ratio:H/W});};
    img.onerror=()=>ok(null);img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(x);});}
async function reportPDF(onlyBytes){const {jsPDF}=await loadJsPDF(),doc=new jsPDF({unit:'mm',format:'a4',compress:true}),R=$('#report');
  const W=210,M=16,CW=W-2*M;let y=0;
  const need=h=>{if(y+h>282){doc.addPage();y=18;}};
  const h=(t)=>{need(12);y+=4;doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(30,40,55);doc.text(pdfTxt(t),M,y);y+=2;doc.setDrawColor(240,164,58);doc.setLineWidth(0.5);doc.line(M,y,M+CW,y);y+=5;};
  const p=(t,size=9.5,color=[40,40,40],bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);const ls=doc.splitTextToSize(pdfTxt(t),CW);ls.forEach(l=>{need(5);doc.text(l,M,y);y+=size*0.42+0.6;});};
  // kopband
  doc.setFillColor(13,17,22);doc.rect(0,0,W,24,'F');doc.setFillColor(240,164,58);doc.rect(0,24,W,1.2,'F');
  doc.setTextColor(240,164,58);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('ONDERSTATION SIMULATOR - OS ZUIDWOLDE 110/10/20 kV',M,10);
  doc.setTextColor(255,255,255);doc.setFontSize(16);doc.text(pdfTxt(R.querySelector('h2')?.textContent||'Dienstrapport'),M,19);
  y=33;p(`${R.querySelector('.eyebrow')?.textContent||''} - gespeeld van ${fmtClock(GAME.t0)} tot ${fmtClock(SIM.t)} - rapport gemaakt op ${new Date().toLocaleString('nl-NL',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}`,9,[90,90,90]);
  // cijfer en score
  y+=2;const g=R.querySelector('.grade')?.textContent||'',sc=R.querySelector('.rs')?.textContent||'',stEl=R.querySelector('.stars'),st=stEl?(stEl.textContent.length-(stEl.querySelector('span')?.textContent.length||0)):0;
  doc.setFillColor(240,164,58);doc.roundedRect(M,y,22,18,2,2,'F');doc.setTextColor(26,18,6);doc.setFont('helvetica','bold');doc.setFontSize(20);doc.text(pdfTxt(g),M+11,y+12.5,{align:'center'});
  doc.setTextColor(30,40,55);doc.setFontSize(15);doc.text(pdfTxt(sc),M+28,y+8);doc.setFontSize(11);doc.setTextColor(224,138,30);doc.text(`${'*'.repeat(st)}  (${st} van 5 sterren)`,M+28,y+15);
  const extra=[...R.querySelectorAll('.rep-top .prev,.rep-top .rec')].map(e=>pdfTxt(e.textContent)).join(' - ');if(extra){doc.setFontSize(8.5);doc.setTextColor(100,100,100);doc.text(extra,M+70,y+15);}
  y+=26;
  // doelen
  const goals=[...R.querySelectorAll('.step')];if(goals.length){h('Doelen');goals.forEach(s=>{const ok=s.classList.contains('done'),txt=pdfTxt(s.textContent.replace(/^[✓✕]/,''));need(6);doc.setFillColor(...(ok?[47,158,87]:[229,72,77]));doc.circle(M+1.6,y-1.2,1.4,'F');
    doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(40,40,40);doc.text(doc.splitTextToSize(txt,CW-40),M+5,y);doc.setFont('helvetica','bold');doc.setTextColor(...(ok?[47,158,87]:[229,72,77]));doc.text(ok?'behaald':'niet behaald',M+CW,y,{align:'right'});y+=5.2;});}
  // statistieken in twee kolommen
  const rows=[...R.querySelectorAll('.rep-grid .row')].map(r=>[pdfTxt(r.querySelector('span')?.textContent),pdfTxt(r.querySelector('b')?.textContent)]);
  if(rows.length){h('Statistieken');doc.setFontSize(9);const half=Math.ceil(rows.length/2),colW=CW/2;
    for(let i=0;i<half;i++){need(6);[rows[i],rows[i+half]].forEach((r,c)=>{if(!r)return;const x=M+c*colW;doc.setFont('helvetica','normal');doc.setTextColor(90,90,90);doc.text(r[0],x,y);doc.setFont('helvetica','bold');doc.setTextColor(30,40,55);doc.text(r[1],x+colW-4,y,{align:'right'});});
      doc.setDrawColor(230,230,230);doc.setLineWidth(0.2);doc.line(M,y+1.6,M+CW,y+1.6);y+=5.6;}}
  // tijdlijn
  const tl=await timelinePNG();if(tl){h('Tijdlijn');p('Rood: klanten zonder stroom - oranje: score - rode driehoek: storing - streepje: jouw handeling - groen: doel behaald of werk voltooid',8,[110,110,110]);const ih=CW*tl.ratio;need(ih+2);doc.addImage(tl.url,'JPEG',M,y,CW,ih);y+=ih+3;}
  // leermomenten en badges
  const ins=[...R.querySelectorAll('.tl-i')];if(ins.length){h('Leermomenten');ins.forEach(i=>{p('•  '+i.textContent,9.5);y+=1;});}
  const bad=[...R.querySelectorAll('.badge')];if(bad.length){h('Badges');bad.forEach(b=>p(`${b.querySelector('b')?.textContent}: ${b.querySelector('span')?.textContent}`,9.5));}
  // voettekst
  const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(7.5);doc.setTextColor(140,140,140);doc.setFont('helvetica','normal');
    doc.text('Onderstation Simulator - github.com/ProAdmin007/Onderstation-SIM-Pro - CC BY-NC-SA 4.0',M,290);doc.text(`pagina ${i} van ${n}`,W-M,290,{align:'right'});}
  if(onlyBytes==='data')return doc.output('datauristring');if(onlyBytes)return doc.output('arraybuffer').byteLength;
  doc.save(`dienstrapport-${GAME.mode}-${new Date().toISOString().slice(0,10)}.pdf`);return true;}
$('#report').addEventListener('click',e=>{const b=e.target.closest('[data-r="pdf"]');if(!b)return;const t=b.textContent;b.disabled=true;b.textContent='PDF maken…';
  reportPDF().catch(err=>deny(err.message)).finally(()=>{b.disabled=false;b.textContent=t;});});
