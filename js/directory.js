import {url,loadData,el,favorites,storage,toast,locate,selectDoctors,scheduleText,hydrateRows} from './core.js';
import {updateAvailability} from './metrics.js';
export async function initDirectory(){
  const root=document.querySelector('[data-directory]');const form=document.getElementById('filters');const nodes={};
  for(const id of ['query','spec','wilaya','commune','sort','results','empty','load-more','result-count','data-error'])nodes[id]=document.getElementById(id);
  const locked=root.dataset.spec;const savedOnly=root.dataset.favorites==='true';let data,limit=12,userLocation=null,renderVersion=0;
  function readURL(){const p=new URLSearchParams(location.search);nodes.query.value=(p.get('q')||'').slice(0,120);nodes.spec.value=locked||p.get('spec')||'';nodes.wilaya.value=p.get('wilaya')||'';nodes.sort.value=['name','recent'].includes(p.get('sort'))?p.get('sort'):'name';populateCommunes();nodes.commune.value=p.get('commune')||'';}
  function filters(){return {q:nodes.query.value,spec:locked||nodes.spec.value,wilaya:nodes.wilaya.value,commune:nodes.commune.value,sort:nodes.sort.value};}
  function syncURL(){const p=new URLSearchParams();Object.entries(filters()).forEach(([k,v])=>{if(v&&!(k==='spec'&&locked)&&!(k==='sort'&&v==='name'))p.set(k,v);});history.replaceState(null,'',location.pathname+(p.size?'?'+p:''));}
  function populateCommunes(){const previous=nodes.commune.value;nodes.commune.replaceChildren(new Option('كل البلديات المتاحة',''));for(const c of data?.communes||[])if(!nodes.wilaya.value||c.wilayaCode===nodes.wilaya.value)nodes.commune.add(new Option(c.nameAr,c.id));nodes.commune.value=previous;}
  function card({doctor,practice,km}){
    const article=el('article',undefined,'doctor-card');article.append(el('span',doctor.verificationStatus==='verified'?'بيانات موثقة المصدر':'بيانات أولية · غير متحقق منها',doctor.verificationStatus==='verified'?'badge':'badge unverified-badge'));
    const identity=el('div',undefined,'doctor-identity');const avatar=el('span',undefined,'doctor-avatar');avatar.setAttribute('aria-hidden','true');
    // Clone the site's existing vector stethoscope rather than fetching a font icon.
    const icon=el('i',undefined,'fa-solid fa-stethoscope');icon.setAttribute('aria-hidden','true');avatar.append(icon);
    const info=el('div');const h=el('h2');const link=el('a',doctor.name);link.href=url(`doctors/${doctor.slug}.html`);h.append(link);info.append(h,el('span',doctor.specialtyIds.map(id=>data.specialties.find(s=>s.id===id)?.nameAr||'').join(' • '),'specialty-chip'));identity.append(avatar,info);article.append(identity);
    const status=el('span','التوفر حسب توقيت الجزائر','availability unknown');status.dataset.hours=JSON.stringify(practice.openingHours||null);article.append(status);
    const commune=practice.communeName||data.communes.find(c=>c.id===practice.communeId)?.nameAr;
    article.append(el('p','⌖ '+[data.wilayas.find(w=>w.code===practice.wilayaCode)?.nameAr,commune,practice.address].filter(Boolean).join('، '),'doctor-address'));
    const hours=scheduleText(practice.openingHours);const dl=el('dl',undefined,'doctor-schedule');
    for(const [label,value] of [['أيام العمل',hours.days],['توقيت العمل',hours.hours]]){const row=el('div');const dd=el('dd');if(label==='توقيت العمل'){const bdi=el('bdi',value);bdi.dir='ltr';dd.append(bdi);}else dd.textContent=value;row.append(el('dt',label),dd);dl.append(row);}article.append(dl);
    for(const phone of practice.phones||[]){const call=el('a',undefined,'phone-link');call.href=`tel:${phone}`;const ico=el('span','☎');ico.setAttribute('aria-hidden','true');const number=el('bdi',phone);number.dir='ltr';call.append(ico,number);article.append(call);}
    article.append(el('small',doctor.verificationStatus==='verified'?`آخر تحقق: ${doctor.verifiedAt}`:'العنوان والهاتف غير متحقق منهما؛ السجلات المسماة «نموذج» تحتاج استبدالًا.','verification-note'));
    if(km!==null)article.append(el('p',`${km.toFixed(1)} كم تقريبًا بخط مستقيم`));
    const actions=el('div',undefined,'card-actions');
    if(practice.coordinates){const dir=el('a','⌖ تكوين المسار على Google Maps','btn primary route-button');dir.href=`https://www.google.com/maps/dir/?api=1&destination=${practice.coordinates.lat},${practice.coordinates.lng}&travelmode=driving`;dir.target='_blank';dir.rel='noopener noreferrer';actions.append(dir);}
    const save=el('button',favorites().has(doctor.id)?'♥ محفوظ':'♡ حفظ','btn secondary');save.type='button';save.setAttribute('aria-pressed',String(favorites().has(doctor.id)));save.setAttribute('aria-label',`حفظ ${doctor.name} في المفضلة`);
    save.addEventListener('click',()=>{const list=favorites();if(list.has(doctor.id))list.delete(doctor.id);else list.add(doctor.id);if(!storage.set('favorites',[...list])){toast('تعذر حفظ المفضلة. تحقق من إعدادات التخزين في المتصفح.');return;}render();});actions.append(save);article.append(actions);return article;
  }
  async function render(){
    if(!data)return;const version=++renderVersion;nodes.results.setAttribute('aria-busy','true');nodes['data-error'].hidden=true;
    try{
      const rows=selectDoctors(data,filters(),userLocation,savedOnly?favorites():null);
      const visible=locked?rows.slice(0,limit):await hydrateRows(rows.slice(0,limit));
      if(version!==renderVersion)return;
      nodes.results.replaceChildren(...visible.map(card));nodes['result-count'].textContent=`${rows.length} طبيب`;nodes['result-count'].dataset.count=String(rows.length);nodes.empty.hidden=rows.length>0;nodes['load-more'].hidden=rows.length<=limit;updateAvailability();
      if(!rows.length){nodes.empty.querySelector('h2').textContent='لا توجد نتائج مطابقة';nodes.empty.querySelector('p').textContent='جرّب تغيير الفلاتر أو البحث في تخصص آخر.';}
    }catch{if(version===renderVersion){nodes['data-error'].hidden=false;nodes.results.replaceChildren();nodes['result-count'].textContent='تعذر تحميل النتائج';}}
    finally{if(version===renderVersion)nodes.results.removeAttribute('aria-busy');}
  }
  async function getLocation(){const btn=document.getElementById('locate');btn.disabled=true;btn.textContent='جاري تحديد الموقع…';try{userLocation=await locate();nodes.sort.value='distance';document.getElementById('location-note').textContent='تُحسب المسافة على جهازك بخط مستقيم. موقعك لا يُحفظ بعد مغادرة الصفحة.';limit=12;syncURL();render();}catch(error){nodes.sort.value='name';toast(error.message);}finally{btn.disabled=false;btn.textContent='⌖ الأقرب إليّ';}}
  async function start(){nodes['data-error'].hidden=true;try{data=await loadData(locked);readURL();render();}catch{nodes['data-error'].hidden=false;}}
  form.addEventListener('submit',e=>{e.preventDefault();limit=12;syncURL();render();});let timer;
  nodes.query.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{limit=12;syncURL();render();},180);});
  for(const id of ['spec','wilaya','commune','sort'])nodes[id].addEventListener('change',()=>{if(id==='wilaya'){nodes.commune.value='';populateCommunes();}if(id==='sort'&&nodes.sort.value==='distance'&&!userLocation){getLocation();return;}limit=12;syncURL();render();});
  document.getElementById('locate').addEventListener('click',getLocation);
  document.getElementById('reset').addEventListener('click',()=>{form.reset();nodes.spec.value=locked||'';nodes.sort.value='name';nodes.commune.value='';populateCommunes();limit=12;syncURL();render();});
  nodes['load-more'].addEventListener('click',()=>{limit+=12;render();});document.getElementById('retry').addEventListener('click',start);
  window.addEventListener('popstate',()=>{readURL();render();});window.addEventListener('storage',render);window.addEventListener('offline',render);window.addEventListener('online',render);
  await start();
}
