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
let dataPromise;
export function loadData() {
  if (!dataPromise) dataPromise = Promise.all(['doctors','specialties','wilayas','communes','search-index'].map(async name => {
    const response=await fetch(url(`data/${name}.json`));
    if (!response.ok) throw new Error(`Data unavailable: ${name}`);
    const data=await response.json();if(!Array.isArray(data)) throw new Error('Invalid data');return data;
  })).then(([doctors,specialties,wilayas,communes,index]) => ({doctors,specialties,wilayas,communes,index})).catch(error => {dataPromise=null;throw error;});
  return dataPromise;
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
  return result.sort((a,b)=>filters.sort==='distance' ? ((a.km??Infinity)-(b.km??Infinity)||a.doctor.name.localeCompare(b.doctor.name,'ar')) : filters.sort==='recent' ? b.doctor.verifiedAt.localeCompare(a.doctor.verifiedAt) : a.doctor.name.localeCompare(b.doctor.name,'ar'));
}
