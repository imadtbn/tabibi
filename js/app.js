import {url,toast} from './core.js';
const menu=document.getElementById('menu-toggle');const nav=document.getElementById('main-nav');
function closeMenu(){nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','فتح القائمة');}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';nav.classList.toggle('is-open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'إغلاق القائمة':'فتح القائمة');});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
document.addEventListener('click',event=>{if(!event.target.closest('.site-header'))closeMenu();});
matchMedia('(min-width:701px)').addEventListener('change',event=>{if(event.matches)closeMenu();});
const theme=document.getElementById('theme-toggle');
function themeLabel(){theme?.setAttribute('aria-pressed',String(document.documentElement.dataset.theme==='dark'));}
themeLabel();theme?.addEventListener('click',()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';try{localStorage.setItem('tabibi:theme',dark?'dark':'light');}catch{}themeLabel();});
const connection=document.getElementById('offline-banner');
function connectionState(){if(connection)connection.hidden=navigator.onLine;}
connectionState();window.addEventListener('online',connectionState);window.addEventListener('offline',connectionState);
if(document.querySelector('[data-directory]'))import('./directory.js').then(m=>m.initDirectory()).catch(()=>toast('تعذر تشغيل البحث. أعد تحميل الصفحة.'));
if(document.getElementById('map'))import('./map.js').then(m=>m.initMap()).catch(()=>toast('تعذر تشغيل الخريطة. استخدم عرض القائمة.'));
if(location.pathname.endsWith('/specialty.html')){
  const legacy=new URLSearchParams(location.search).get('spec');
  if(legacy)fetch(url('data/specialties.json')).then(r=>{if(!r.ok)throw Error();return r.json();}).then(specs=>{const spec=specs.find(s=>s.id===legacy);if(spec){const params=new URLSearchParams(location.search);params.delete('spec');location.replace(url(`specialties/${spec.slug}.html`)+(params.size?'?'+params:''));}}).catch(()=>toast('اختر التخصص من القائمة.'));
}
import('./pwa.js').catch(()=>{});
