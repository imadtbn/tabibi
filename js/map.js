import {url,loadData,el,locate,toast} from './core.js';
export function initMap(){
  let map=null,layer=null,data=null;const button=document.getElementById('load-map');const status=document.getElementById('map-status');const spec=document.getElementById('spec');const wilaya=document.getElementById('wilaya');const query=document.getElementById('query');
  const form=document.getElementById('filters');const params=new URLSearchParams(location.search);spec.value=params.get('spec')||'';wilaya.value=params.get('wilaya')||'';query.value=params.get('q')||'';
  async function leaflet(){
    if(window.L)return;
    if(!document.getElementById('leaflet-css')){const css=document.createElement('link');css.id='leaflet-css';css.rel='stylesheet';css.href=url('assets/vendor/leaflet/leaflet.css');document.head.append(css);}
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=url('assets/vendor/leaflet/leaflet.js');script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('Map library failed'));};document.head.append(script);});
  }
  async function render(){
    if(!map||!data)return;layer.clearLayers();let count=0;const bounds=[];
    const {selectDoctors}=await import('./core.js');
    const rows=selectDoctors(data,{q:query.value,spec:spec.value,wilaya:wilaya.value});
    for(const {doctor} of rows)for(const practice of doctor.practices){
      if(wilaya.value&&practice.wilayaCode!==wilaya.value)continue;
      const geo=practice.coordinates;if(!geo)continue;
      const popup=el('div',undefined,'map-popup');popup.append(el('strong',doctor.name),el('p',practice.address));if(doctor.isDemo)popup.append(el('p','نموذج وهمي — نقطة بمركز المدينة وليست عيادة')); const link=el('a','تفاصيل الطبيب');link.href=url(`doctors/${doctor.slug}.html`);popup.append(link);
      window.L.circleMarker([geo.lat,geo.lng],{radius:8,color:'#fff',weight:2,fillColor:'#176954',fillOpacity:1}).bindPopup(popup).addTo(layer);bounds.push([geo.lat,geo.lng]);count++;
    }
    status.textContent=count?`${count} موقع عيادة`:'لا توجد مواقع عيادات موثقة مطابقة حاليًا.';
    if(bounds.length)map.fitBounds(bounds,{padding:[35,35],maxZoom:13});
  }
  button.addEventListener('click',async()=>{
    if(map){render();return;}
    if(!navigator.onLine){toast('تحتاج خلفية الخريطة إلى الإنترنت. استخدم قائمة الأطباء المحفوظة.');return;}
    button.disabled=true;status.textContent='جاري تحميل الخريطة…';
    try{
      const results=await Promise.all([leaflet(),loadData()]);data=results[1];document.getElementById('map').replaceChildren();map=window.L.map('map').setView([28.2,2.6],5);
      window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map).on('tileerror',()=>{status.textContent='تعذر تحميل بعض أجزاء الخريطة. يمكنك استخدام عرض القائمة.';});
      layer=window.L.layerGroup().addTo(map);button.hidden=true;document.getElementById('map-locate').disabled=false;await render();
    }catch{status.textContent='تعذر تحميل الخريطة. تحقق من الاتصال وأعد المحاولة.';button.disabled=false;}
  });
  form.addEventListener('submit',e=>{e.preventDefault();render();});for(const node of [spec,wilaya])node.addEventListener('change',render);
  document.getElementById('map-locate').addEventListener('click',async()=>{try{const p=await locate();map.setView([p.lat,p.lng],12);}catch(error){toast(error.message);}});
}
