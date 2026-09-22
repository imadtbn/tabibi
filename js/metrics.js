import {getJSON,availability} from './core.js';

export function updateAvailability(now=new Date()){
  for(const node of document.querySelectorAll('[data-hours]')){
    let hours=null;try{hours=JSON.parse(node.dataset.hours);}catch{}
    const status=availability(hours,now,navigator.onLine);
    node.textContent=status.text;node.className=`availability ${status.state}`;
    node.title='حسب الجدول المعروض بتوقيت الجزائر؛ لا يؤكد توفر موعد.';
  }
}

function setCounter(node,text){
  if(!node||node.textContent===String(text))return;
  node.textContent=String(text);
  node.classList.remove('count-pop');
  requestAnimationFrame(()=>node.classList.add('count-pop'));
}

function liveSummary(index,summary,now){
  if(!Array.isArray(index)||!index.length){
    return {
      total:summary?.doctors||0,
      specialties:Object.values(summary?.bySpecialty||{}).filter(n=>n>0).length,
      wilayas:summary?.coveredWilayas||0,
      initial:summary?.initialDoctors||0,
      verified:summary?.verifiedDoctors||0,
      bySpecialty:summary?.bySpecialty||{},
      open:navigator.onLine&&summary?.schedules?summary.schedules.reduce((n,g)=>n+(g.hours.some(h=>availability(h,now,true).state==='open')?g.count:0),0):'—'
    };
  }
  const bySpecialty={};const wilayas=new Set();let initial=0,verified=0;
  for(const doctor of index){
    for(const id of doctor.specialtyIds||[])bySpecialty[id]=(bySpecialty[id]||0)+1;
    for(const practice of doctor.practices||[])if(practice.wilayaCode)wilayas.add(practice.wilayaCode);
    if(doctor.verificationStatus==='verified')verified++;else initial++;
  }
  return {
    total:index.length,
    specialties:Object.values(bySpecialty).filter(n=>n>0).length,
    wilayas:wilayas.size,
    initial,verified,bySpecialty,
    open:navigator.onLine&&summary?.schedules?summary.schedules.reduce((n,g)=>n+(g.hours.some(h=>availability(h,now,true).state==='open')?g.count:0),0):'—'
  };
}

export function initMetrics(){
  let summary=null,index=null;
  function refresh(){
    const now=new Date();updateAvailability(now);
    if(!summary&&!index)return;
    const stats=liveSummary(index,summary,now);
    for(const node of document.querySelectorAll('[data-specialty-count]')){
      const count=stats.bySpecialty[node.dataset.specialtyCount]||0;
      setCounter(node.querySelector('b'),String(count).padStart(2,'0'));
      node.setAttribute('aria-label',`${count} طبيب في هذا التخصص`);
    }
    for(const node of document.querySelectorAll('[data-specialty-heading-count]')){
      const count=stats.bySpecialty[node.dataset.specialtyHeadingCount]||0;
      setCounter(node.querySelector('b'),count);
      node.setAttribute('aria-label',`${count} طبيب في هذا التخصص`);
    }
    for(const node of document.querySelectorAll('[data-stat]'))setCounter(node,stats[node.dataset.stat]);
  }
  refresh();
  const selector='[data-stat],[data-specialty-count],[data-specialty-heading-count]';
  if(document.querySelector(selector)){
    Promise.all([getJSON('data/stats.json'),getJSON('data/search-index.json')])
      .then(([stats,rows])=>{summary=stats;index=rows;refresh();})
      .catch(()=>getJSON('data/stats.json').then(stats=>{summary=stats;refresh();}).catch(()=>{}));
  }
  setInterval(()=>{if(!document.hidden)refresh();},30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  window.addEventListener('online',refresh);window.addEventListener('offline',refresh);
}
