
// ============================================================ scenario's met laagspanning en aardfout: pinksterzondag en aardfout tijdens onweer
const lvBandOk=()=>LVG.every(g=>!g.U||(g.U<=U_MAX&&g.U>=U_MIN));
Object.assign(MODES,{
  pinksteren:{scen:true,name:'Zonnige pinksterzondag',tag:'Scenario · gemiddeld',start:11,dur:180,season:'zomer',weather:'helder',
    desc:'Een stralende pinksterzondag: weinig afname, en sinds vorig jaar liggen er op veel meer daken zonnepanelen. In de lange straten loopt de spanning op en vallen de omvormers uit.',
    setup(){WX.lock=true;LVG.filter(g=>g.pv).forEach(g=>{g.pv*=1.6;});CONS.filter(c=>!c.gen&&c.kind!=='hosp').forEach(c=>{c.base*=0.8;});
      pushAlarm('Pinksterzondag: veel minder afname dan op een werkdag, en ±50% meer zonnepanelen dan vorig jaar','info');
      pushAlarm('Tip: open het LS-tabblad of het LS-venster (N). Verlaag de vaste trap van stations met overspanning. Dat kan alleen spanningsloos: open MSx-T pas als de monteur er bijna is, of voed de straat tijdelijk via een kabelkast','info');},
    obj:()=>[{t:'Om 14:00 alle straten binnen 207–253 V',check:()=>null,final:()=>lvBandOk()},
      {t:'Niet meer dan 30 keer omvormers uit door overspanning',check:()=>(GAME.stats.pvTrips||0)>30?'fail':null,final:()=>(GAME.stats.pvTrips||0)<=30},
      {t:'Minder dan 10.000 klantminuten',check:()=>SIM.cml>10000?'fail':null,final:()=>SIM.cml<=10000},noIncidents]},
  aardonweer:{scen:true,name:'Aardfout tijdens onweer',tag:'Scenario · moeilijk',start:15,dur:150,season:'zomer',weather:'onweer',
    desc:'Een onweersfront trekt over. Tussen de blikseminslagen door meldt het 10 kV-net een aardfout. Vind hem op tijd, voordat er een tweede aardsluiting bij komt.',
    setup(){
      at(4,()=>lineFault('L1',false));
      at(10,()=>{earthFault('K45');GAME.flags.efAt=SIM.t;});
      at(38,()=>lineFault('L2',true));
      at(70,()=>feederFault('F6',18));},
    obj:()=>[{t:'Aardfout binnen 30 minuten gevonden',check:()=>{const a=GAME.flags.efAt;if(a==null)return null;const f=GAME.flags.efFoundAt;return f!=null&&f>=a?(f-a<=30?'done':'fail'):SIM.t>a+30?'fail':null;},final:()=>GAME.flags.efFoundAt!=null&&GAME.flags.efFoundAt-GAME.flags.efAt<=30},
      {t:'Geen dubbele aardfout',check:()=>GAME.stats.efDouble?'fail':null,final:()=>!GAME.stats.efDouble},
      {t:'Minder dan 25.000 klantminuten',check:()=>SIM.cml>25000?'fail':null,final:()=>SIM.cml<=25000},noIncidents]},
});
