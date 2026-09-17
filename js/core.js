export const BASE = new URL('../', import.meta.url);
export const url = path => new URL(path, BASE).href;
export const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f\u064B-\u065F\u0670ـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').toLowerCase().trim();
export function distance(a, b) {
  if (!a || !b || ![a.lat, a.lng, b.lat, b.lng].every(Number.isFinite)) return null;
  const rad = v => v * Math.PI / 180;
  const n = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(Math.min(1,n)), Math.sqrt(Math.max(0,1-n)));
}
export function openStatus(hours, now = new Date(), online = true) {
  if (!online || !hours || !Object.keys(hours).length) return 'المواعيد غير مؤكدة';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Algiers', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value]));
  const spans = hours[parts.weekday.toLowerCase()];
  if (!Array.isArray(spans)) return 'المواعيد غير متوفرة';
  const time = `${parts.hour}:${parts.minute}`;
  return spans.some(([start,end]) => start <= time && time < end) ? 'مفتوح حسب المواعيد المنشورة' : 'مغلق حسب المواعيد المنشورة';
}
export const storage = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem(`tabibi:${key}`)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(`tabibi:${key}`, JSON.stringify(value)); return true; } catch { return false; } }
};
export function favorites() { const value = storage.get('favorites', []); return new Set(Array.isArray(value) ? value.filter(x => typeof x === 'string') : []); }
export function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
export function toast(message) { const target=document.getElementById('toast'); if(!target) return; target.textContent=message;target.hidden=false; clearTimeout(toast.timer);toast.timer=setTimeout(()=>{target.hidden=true;},4500); }
const requests=new Map();
export async function getJSON(path, fresh=false){
  if(fresh)requests.delete(path);
  if(!requests.has(path))requests.set(path,fetch(url(path),{cache:fresh?'no-cache':'default'}).then(async response=>{if(!response.ok)throw new Error(`تعذر تحميل ${path}`);return response.json();}).catch(error=>{requests.delete(path);throw error;}));
  return requests.get(path);
}
export async function loadSpecialty(id,fresh=false){
  if(!/^[a-z]+$/.test(id))throw new Error('تخصص غير صالح');
  const rows=await getJSON(`data/doctors/${id}.json`,fresh);
  if(!Array.isArray(rows))throw new Error('صيغة ملف التخصص غير صالحة');
  return rows;
}
export async function loadData(specialty=''){
  const [specialties,wilayas,communes,index]=await Promise.all(['specialties','wilayas','locations','search-index'].map(name=>getJSON(`data/${name}.json`)));
  const doctors=specialty?await loadSpecialty(specialty):index;
  return {doctors,specialties,wilayas,communes,index};
}
export async function hydrateRows(rows){
  const ids=[...new Set(rows.map(row=>row.doctor.specialtyIds[0]))];
  const full=new Map((await Promise.all(ids.map(id=>loadSpecialty(id)))).flat().map(d=>[d.id,d]));
  return rows.map(row=>{const doctor=full.get(row.doctor.id);if(!doctor)throw new Error('تغيرت البيانات. أعد تحميل الصفحة.');const n=row.doctor.practices.indexOf(row.practice);return {...row,doctor,practice:doctor.practices[n]||doctor.practices[0]};});
}
export function locate() {
  return new Promise((resolve,reject) => {
    if (!navigator.geolocation) return reject(new Error('لا يدعم متصفحك تحديد الموقع. اختر الولاية يدويًا.'));
    navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude}),()=>reject(new Error('تعذر تحديد الموقع. يمكنك السماح به أو اختيار الولاية يدويًا.')),{enableHighAccuracy:false,timeout:10000,maximumAge:120000});
  });
}
// Select a matching practice before calculating distance: a multi-location doctor's
// unrelated practice must never supply the address/distance for filtered results.
export function selectDoctors(data, filters, location = null, saved = null) {
  const terms=normalize(filters.q).split(/\s+/).filter(Boolean);
  const index=new Map(data.index.map(x=>[x.id,normalize(x.text)]));
  const result=[];
  for(const doctor of data.doctors) {
    if(saved && !saved.has(doctor.id)) continue;
    if(filters.spec && !doctor.specialtyIds.includes(filters.spec)) continue;
    if(!terms.every(t=>(index.get(doctor.id)||normalize(doctor.name)).includes(t))) continue;
    const practices=doctor.practices.filter(p=>(!filters.wilaya||p.wilayaCode===filters.wilaya)&&(!filters.commune||p.communeId===filters.commune));
    if(!practices.length)continue;
    const matches=practices.map(practice=>({practice,km:distance(location,practice.coordinates)})).sort((a,b)=>(a.km??Infinity)-(b.km??Infinity));
    result.push({doctor,...matches[0]});
  }
  return result.sort((a,b)=>filters.sort==='distance' ? ((a.km??Infinity)-(b.km??Infinity)||a.doctor.name.localeCompare(b.doctor.name,'ar')) : filters.sort==='recent' ? (b.doctor.verifiedAt||b.doctor.updatedAt||'').localeCompare(a.doctor.verifiedAt||a.doctor.updatedAt||'') : a.doctor.name.localeCompare(b.doctor.name,'ar'));
}

export function availability(hours, now = new Date(), online = true) {
  const text=openStatus(hours,now,online);
  if(text.startsWith('مفتوح'))return {state:'open',text:'متوفر الآن'};
  if(text.startsWith('مغلق'))return {state:'closed',text:'غير متوفر الآن'};
  return {state:'unknown',text:online?'المواعيد غير متوفرة':'التوفر غير مؤكد دون اتصال'};
}
export function summarize(data,now=new Date(),online=true){
  const bySpecialty=Object.fromEntries(data.specialties.map(s=>[s.id,0]));const wilayas=new Set();let open=0,initial=0;
  for(const d of data.doctors){for(const id of new Set(d.specialtyIds))bySpecialty[id]=(bySpecialty[id]||0)+1;for(const p of d.practices)wilayas.add(p.wilayaCode);if(d.practices.some(p=>availability(p.openingHours,now,online).state==='open'))open++;if(d.verificationStatus!=='verified')initial++;}
  return {total:data.doctors.length,specialties:Object.values(bySpecialty).filter(n=>n>0).length,wilayas:wilayas.size,open:online?open:'—',initial,verified:data.doctors.filter(d=>d.verificationStatus==='verified').length,bySpecialty};
}
export function scheduleText(hours){
  const names={sun:'الأحد',mon:'الإثنين',tue:'الثلاثاء',wed:'الأربعاء',thu:'الخميس',fri:'الجمعة',sat:'السبت'};
  const days=Object.keys(names).filter(k=>hours?.[k]?.length);
  const ranges=[...new Set(Object.values(hours||{}).flat().map(span=>span.join(' – ')))];
  return {days:days.join(',')==='sun,mon,tue,wed,thu'?'الأحد – الخميس':days.map(d=>names[d]).join('، ')||'غير محدد',hours:ranges.join(' / ')||'غير محدد'};
}
