import {getJSON,availability,url} from './core.js';

export function updateAvailability(now=new Date()){
  for(const node of document.querySelectorAll('[data-hours]')){
    let hours=null;try{hours=JSON.parse(node.dataset.hours);}catch{}
    const status=availability(hours,now,navigator.onLine);
    node.textContent=status.text;node.className='availability '+status.state;
    node.title='حسب الجدول المعروض بتوقيت الجزائر؛ لا يؤكد توفر موعد.';
  }
}

function setCounter(node,value){
  if(!node||node.textContent===String(value))return;
  node.textContent=String(value);
  node.classList.remove('count-pop');
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>node.classList.add('count-pop'));
}

/* The specialty JSON files are the source of truth. Generated indexes are only
   a fast fallback for offline visits and initial rendering. Count distinct IDs
   so accidental duplicate records cannot inflate public statistics. */
export function summarizeSource(groups,specialties,now=new Date(),online=true){
  if(!Array.isArray(groups)||!Array.isArray(specialties)||groups.length!==specialties.length||
     !groups.every(Array.isArray))throw new TypeError('Incomplete specialty data');
  const bySpecialty=Object.fromEntries(specialties.map(s=>[s.id,0]));
  const unique=new Map();
  for(const group of groups)for(const doctor of group){
    if(!doctor||typeof doctor.id!=='string'||!doctor.id)continue;
    if(!unique.has(doctor.id))unique.set(doctor.id,doctor);
  }
  const wilayas=new Set();let initial=0,verified=0,open=0;
  for(const doctor of unique.values()){
    for(const id of new Set(doctor.specialtyIds||[]))
      if(Object.hasOwn(bySpecialty,id))bySpecialty[id]++;
    const practices=Array.isArray(doctor.practices)?doctor.practices:[];
    for(const practice of practices)if(practice.wilayaCode)wilayas.add(practice.wilayaCode);
    // A placeholder or a record without a traceable source is never verified.
    if(doctor.verificationStatus==='verified'&&!doctor.isPlaceholder&&doctor.sourceUrl&&doctor.verifiedAt)verified++;
    else initial++;
    if(online&&practices.some(p=>availability(p.openingHours,now,true).state==='open'))open++;
  }
  return {
    total:unique.size,
    specialties:Object.values(bySpecialty).filter(n=>n>0).length,
    wilayas:wilayas.size,initial,verified,bySpecialty,
    open:online?open:'—'
  };
}

/* Each visit fetches the original specialty files with revalidation. The
   generated search-index and stats files may lag until the next site build. */
export async function loadSourceGroups(load=getJSON){
  const specialties=await load('data/specialties.json',true);
  if(!Array.isArray(specialties))throw new TypeError('Invalid specialties');
  const groups=await Promise.all(specialties.map(s=>load('data/doctors/'+s.id+'.json',true)));
  if(groups.some(g=>!Array.isArray(g)))throw new TypeError('Invalid specialty records');
  return {groups,specialties};
}

function fallbackSummary(index,summary,now,online){
  if(!Array.isArray(index)){
    if(!summary)return null;
    return {
      total:summary.doctors||0,
      specialties:Object.values(summary.bySpecialty||{}).filter(n=>n>0).length,
      wilayas:summary.coveredWilayas||0,
      initial:summary.initialDoctors||0,
      verified:summary.verifiedDoctors||0,
      bySpecialty:summary.bySpecialty||{},
      open:online&&summary.schedules?summary.schedules.reduce((n,g)=>
        n+(g.hours.some(hours=>availability(hours,now,true).state==='open')?g.count:0),0):'—'
    };
  }
  const specs=Object.keys(summary?.bySpecialty||{}).map(id=>({id}));
  if(!specs.length)return null;
  const stats=summarizeSource([index], [{id:'_all'}],now,online);
  const bySpecialty=Object.fromEntries(specs.map(s=>[s.id,0]));
  for(const d of index)for(const id of new Set(d.specialtyIds||[]))
    if(Object.hasOwn(bySpecialty,id))bySpecialty[id]++;
  stats.bySpecialty=bySpecialty;
  stats.specialties=Object.values(bySpecialty).filter(n=>n>0).length;
  stats.open=online&&summary?.schedules?summary.schedules.reduce((n,g)=>
    n+(g.hours.some(hours=>availability(hours,now,true).state==='open')?g.count:0),0):'—';
  return stats;
}

/* Specialty distribution uses the same unique-doctor summary as the headline
   counters. Build DOM nodes safely; do not insert database strings as HTML. */
export function renderSpecialtyBreakdown(root,stats,catalog,order='most'){
  if(!root||!stats||!Array.isArray(catalog))return;
  const entries=catalog.filter(s=>s&&s.id&&s.slug).map((s,i)=>({
    ...s,index:i,count:stats.bySpecialty?.[s.id]||0
  }));
  if(order==='most')entries.sort((a,b)=>b.count-a.count||a.index-b.index);
  const max=Math.max(1,...entries.map(s=>s.count));
  const fragment=document.createDocumentFragment();
  for(const specialty of entries){
    const card=document.createElement('a');
    card.className='specialty-stat-card';
    card.href=url('specialties/'+specialty.slug+'.html');
    card.setAttribute('aria-label',specialty.nameAr+': '+specialty.count+' طبيب. عرض الأطباء');
    const top=document.createElement('div');top.className='specialty-stat-top';
    const names=document.createElement('div');names.className='specialty-stat-names';
    const title=document.createElement('strong');title.textContent=specialty.nameAr;
    const latin=document.createElement('small');latin.lang='fr';latin.textContent=specialty.nameFr||'';
    names.append(title,latin);
    const number=document.createElement('span');number.className='specialty-stat-number';
    const digit=document.createElement('b');digit.textContent=String(specialty.count);
    number.append(digit,document.createTextNode(' طبيب'));
    top.append(names,number);
    const track=document.createElement('span');track.className='specialty-stat-track';
    track.setAttribute('aria-hidden','true');
    const fill=document.createElement('span');fill.className='specialty-stat-fill';
    fill.style.width=(specialty.count/max*100).toFixed(2)+'%';
    track.append(fill);
    const action=document.createElement('span');action.className='specialty-stat-action';
    action.textContent='عرض أطباء التخصص ←';
    card.append(top,track,action);fragment.append(card);
  }
  root.replaceChildren(fragment);
  root.setAttribute('aria-busy','false');
}

export function initMetrics(){
  if(!document.querySelector('[data-stat],[data-specialty-count],[data-specialty-heading-count]')){
    updateAvailability();return;
  }
  let groups=null,specialties=null,catalog=null,index=null,summary=null,lastRequested=0,loading=null;
  const breakdown=document.getElementById('specialty-stats-list');
  const status=document.getElementById('specialty-stats-status');
  const order=document.getElementById('specialty-stats-order');
  let lastBreakdown='';
  function refresh(){
    const now=new Date(),online=navigator.onLine;
    updateAvailability(now);
    const stats=groups?summarizeSource(groups,specialties,now,online):
      fallbackSummary(index,summary,now,online);
    if(!stats)return;
    for(const node of document.querySelectorAll('[data-specialty-count]')){
      const count=stats.bySpecialty[node.dataset.specialtyCount]||0;
      setCounter(node.querySelector('b'),String(count).padStart(2,'0'));
      node.setAttribute('aria-label',count+' طبيب في هذا التخصص');
    }
    for(const node of document.querySelectorAll('[data-specialty-heading-count]')){
      const count=stats.bySpecialty[node.dataset.specialtyHeadingCount]||0;
      setCounter(node.querySelector('b'),count);
      node.setAttribute('aria-label',count+' طبيب في هذا التخصص');
    }
    for(const node of document.querySelectorAll('[data-stat]'))setCounter(node,stats[node.dataset.stat]);
    if(breakdown&&catalog){
      const signature=JSON.stringify([stats.bySpecialty,order?.value||'most',!!groups]);
      if(signature!==lastBreakdown){
        renderSpecialtyBreakdown(breakdown,stats,catalog,order?.value||'most');
        lastBreakdown=signature;
      }
      if(status)status.textContent=!online?'بيانات محفوظة دون اتصال؛ قد تكون أحدث التعديلات غير ظاهرة.':
        groups?'الأعداد محسوبة من ملفات الأطباء حسب الاختصاص، مع استبعاد تكرار المعرّف.':
        'أعداد مبدئية من الفهرس المحفوظ؛ جارٍ التحقق من ملفات الاختصاصات.';
    }
  }
  order?.addEventListener('change',()=>{lastBreakdown='';refresh();});
  function loadOriginals(){
    if(loading)return loading;
    lastRequested=Date.now();
    loading=loadSourceGroups().then(result=>{
      groups=result.groups;specialties=result.specialties;catalog=result.specialties;refresh();
    }).catch(error=>{
      console.warn('تعذر تحديث العدادات من ملفات التخصصات؛ تُعرض البيانات المحفوظة إن وُجدت.',error);
    }).finally(()=>{
      loading=null;
      if(breakdown&&!groups&&!index&&!summary&&status)
        status.textContent='تعذر تحميل بيانات الإحصائيات حاليًا. أعد تحميل الصفحة عند عودة الاتصال.';
    });
    return loading;
  }
  Promise.allSettled([
    getJSON('data/search-index.json',true),
    getJSON('data/stats.json',true),
    ...(breakdown?[getJSON('data/specialties.json')]:[])
  ]).then(results=>{
    if(results[0].status==='fulfilled')index=results[0].value;
    if(results[1].status==='fulfilled')summary=results[1].value;
    if(results[2]?.status==='fulfilled'&&!catalog)catalog=results[2].value;
    refresh();
  });
  loadOriginals();
  function recentRefresh(){
    refresh();
    if(navigator.onLine&&!loading&&Date.now()-lastRequested>60000)loadOriginals();
  }
  setInterval(()=>{if(!document.hidden)recentRefresh();},30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)recentRefresh();});
  window.addEventListener('online',()=>{refresh();loadOriginals();});
  window.addEventListener('offline',refresh);
  window.addEventListener('pageshow',recentRefresh);
}
