import {url,loadData,el,favorites,storage,toast,locate,selectDoctors,openStatus} from './core.js';
export async function initDirectory(){
  const root=document.querySelector('[data-directory]');const form=document.getElementById('filters');const nodes={};
  for(const id of ['query','spec','wilaya','commune','sort','results','empty','load-more','result-count','data-error'])nodes[id]=document.getElementById(id);
  const locked=root.dataset.spec;const savedOnly=root.dataset.favorites==='true';let data,limit=12,userLocation=null;
  function readURL(){const p=new URLSearchParams(location.search);nodes.query.value=(p.get('q')||'').slice(0,120);nodes.spec.value=locked||p.get('spec')||'';nodes.wilaya.value=p.get('wilaya')||'';nodes.sort.value=['name','recent'].includes(p.get('sort'))?p.get('sort'):'name';populateCommunes();nodes.commune.value=p.get('commune')||'';}
  function filters(){return {q:nodes.query.value,spec:locked||nodes.spec.value,wilaya:nodes.wilaya.value,commune:nodes.commune.value,sort:nodes.sort.value};}
  function syncURL(){const p=new URLSearchParams();Object.entries(filters()).forEach(([k,v])=>{if(v&&!(k==='spec'&&locked)&&!(k==='sort'&&v==='name'))p.set(k,v);});history.replaceState(null,'',location.pathname+(p.size?'?'+p:''));}
  function populateCommunes(){const previous=nodes.commune.value;nodes.commune.replaceChildren(new Option('كل البلديات المتاحة',''));for(const c of data?.communes||[])if(!nodes.wilaya.value||c.wilayaCode===nodes.wilaya.value)nodes.commune.add(new Option(c.nameAr,c.id));nodes.commune.value=previous;}
  function card({doctor,practice,km}){
    const article=el('article',undefined,'doctor-card');article.append(el('span','بيانات موثقة المصدر','badge'));
    const h=el('h2');const link=el('a',doctor.name);link.href=url(`doctors/${doctor.slug}.html`);h.append(link);article.append(h);
    article.append(el('p',doctor.specialtyIds.map(id=>data.specialties.find(s=>s.id===id)?.nameAr||'').join(' • ')),el('p',`${data.wilayas.find(w=>w.code===practice.wilayaCode)?.nameAr||''} — ${practice.address}`));
    article.append(el('small',openStatus(practice.openingHours,new Date(),navigator.onLine)),el('small',`آخر تحقق: ${doctor.verifiedAt}`));
    if(km!==null)article.append(el('p',`${km.toFixed(1)} كم تقريبًا بخط مستقيم`));
    const actions=el('div',undefined,'card-actions');if(practice.phones?.length){const call=el('a','اتصال','btn primary');call.href=`tel:${practice.phones[0]}`;actions.append(call);}
    if(practice.coordinates){const dir=el('a','الاتجاهات ↗','btn secondary');dir.href=`https://www.google.com/maps/dir/?api=1&destination=${practice.coordinates.lat},${practice.coordinates.lng}`;dir.target='_blank';dir.rel='noopener noreferrer';actions.append(dir);}
    const save=el('button',favorites().has(doctor.id)?'♥ محفوظ':'♡ حفظ','btn secondary');save.type='button';save.setAttribute('aria-pressed',String(favorites().has(doctor.id)));save.setAttribute('aria-label',`حفظ ${doctor.name} في المفضلة`);
    save.addEventListener('click',()=>{const list=favorites();if(list.has(doctor.id))list.delete(doctor.id);else list.add(doctor.id);if(!storage.set('favorites',[...list])){toast('تعذر حفظ المفضلة. تحقق من إعدادات التخزين في المتصفح.');return;}render();});actions.append(save);article.append(actions);return article;
  }
  function render(){if(!data)return;const rows=selectDoctors(data,filters(),userLocation,savedOnly?favorites():null);nodes.results.replaceChildren(...rows.slice(0,limit).map(card));nodes['result-count'].textContent=`${rows.length} نتيجة`;nodes.empty.hidden=rows.length>0;nodes['load-more'].hidden=rows.length<=limit;
    if(!rows.length){nodes.empty.querySelector('h2').textContent=savedOnly?'لا توجد نتائج محفوظة مطابقة':data.doctors.length?'لا توجد نتائج مطابقة':'نعمل على تجهيز الدليل الموثّق';nodes.empty.querySelector('p').textContent=savedOnly?'احفظ الأطباء من نتائج البحث، أو غيّر الفلاتر لإظهار اختياراتك.':data.doctors.length?'جرّب ولاية أخرى أو امسح الفلاتر.':'لا توجد سجلات أطباء موثقة منشورة حاليًا. ستظهر البيانات بعد التحقق من مصادرها.';}}
  async function getLocation(){const btn=document.getElementById('locate');btn.disabled=true;btn.textContent='جاري تحديد الموقع…';try{userLocation=await locate();nodes.sort.value='distance';document.getElementById('location-note').textContent='تُحسب المسافة على جهازك بخط مستقيم. موقعك لا يُحفظ بعد مغادرة الصفحة.';limit=12;syncURL();render();}catch(error){nodes.sort.value='name';toast(error.message);}finally{btn.disabled=false;btn.textContent='⌖ الأقرب إليّ';}}
  async function start(){nodes['data-error'].hidden=true;try{data=await loadData();readURL();render();}catch{nodes['data-error'].hidden=false;}}
  form.addEventListener('submit',e=>{e.preventDefault();limit=12;syncURL();render();});let timer;
  nodes.query.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{limit=12;syncURL();render();},180);});
  for(const id of ['spec','wilaya','commune','sort'])nodes[id].addEventListener('change',()=>{if(id==='wilaya'){nodes.commune.value='';populateCommunes();}if(id==='sort'&&nodes.sort.value==='distance'&&!userLocation){getLocation();return;}limit=12;syncURL();render();});
  document.getElementById('locate').addEventListener('click',getLocation);
  document.getElementById('reset').addEventListener('click',()=>{form.reset();nodes.spec.value=locked||'';nodes.sort.value='name';nodes.commune.value='';populateCommunes();limit=12;syncURL();render();});
  nodes['load-more'].addEventListener('click',()=>{limit+=12;render();});document.getElementById('retry').addEventListener('click',start);
  window.addEventListener('popstate',()=>{readURL();render();});window.addEventListener('storage',render);window.addEventListener('offline',render);window.addEventListener('online',render);
  await start();
}
