import {getJSON,availability} from './core.js';
export function updateAvailability(now=new Date()){
  for(const node of document.querySelectorAll('[data-hours]')){
    let hours=null;try{hours=JSON.parse(node.dataset.hours);}catch{}
    const status=availability(hours,now,navigator.onLine);
    node.textContent=status.text;node.className=`availability ${status.state}`;
    node.title='حسب الجدول المعروض بتوقيت الجزائر؛ لا يؤكد توفر موعد.';
  }
}
export function initMetrics(){
  let data=null;
  function refresh(){
    const now=new Date();updateAvailability(now);if(!data)return;
    const stats={total:data.doctors,specialties:Object.values(data.bySpecialty).filter(n=>n>0).length,wilayas:data.coveredWilayas,initial:data.initialDoctors,verified:data.verifiedDoctors,bySpecialty:data.bySpecialty,open:navigator.onLine?data.schedules.reduce((n,g)=>n+(g.hours.some(h=>availability(h,now,true).state==='open')?g.count:0),0):'—'};
    for(const node of document.querySelectorAll('[data-specialty-count]')){const count=stats.bySpecialty[node.dataset.specialtyCount]||0;node.querySelector('b').textContent=String(count).padStart(2,'0');node.setAttribute('aria-label',`${count} طبيب في هذا التخصص، بما فيها السجلات الأولية`);}
    for(const node of document.querySelectorAll('[data-stat]'))node.textContent=String(stats[node.dataset.stat]);
  }
  refresh();
  // Only pages displaying aggregate counters need the directory dataset.
  if(document.querySelector('[data-stat],[data-specialty-count]'))getJSON('data/stats.json').then(result=>{data=result;refresh();}).catch(()=>{});
  setInterval(()=>{if(!document.hidden)refresh();},30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  window.addEventListener('online',refresh);window.addEventListener('offline',refresh);
}
