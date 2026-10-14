import {url,toast} from './core.js';

// Shared navigation for all generated pages, including nested doctor/specialty URLs.
// Inline decorative SVGs avoid a network dependency and retain readable link text.
const menu=document.getElementById('menu-toggle');
const nav=document.getElementById('main-nav');
const NAV_ICONS={
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  specialties:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 7v10M7 12h10"/>',
  doctors:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  map:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  favorites:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  add:'<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M19 8v6m-3-3h6"/>'
};
const svg=paths=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+paths+'</svg>';
function navKind(path){
  if(path.endsWith('/specialties/index.html'))return 'specialties';
  if(path.endsWith('/doctors.html'))return 'doctors';
  if(path.endsWith('/map.html'))return 'map';
  if(path.endsWith('/favorites.html'))return 'favorites';
  if(path.endsWith('/add-doctor.html'))return 'add';
  if(path.endsWith('/index.html')||path.endsWith('/tabibi/'))return 'home';
  return null;
}
nav?.querySelectorAll('a').forEach(link=>{
  const kind=navKind(new URL(link.href).pathname);
  if(!kind||link.querySelector('svg'))return;
  link.insertAdjacentHTML('afterbegin',svg(NAV_ICONS[kind]));
  link.classList.add('has-nav-icon');
});
const MENU_ICONS={
  open:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  close:'<path d="M6 6l12 12M18 6 6 18"/>'
};
function setMenuState(open){
  nav?.classList.toggle('is-open',open);
  if(!menu)return;
  menu.setAttribute('aria-expanded',String(open));
  menu.setAttribute('aria-label',open?'إغلاق القائمة':'فتح القائمة');
  menu.innerHTML=svg(MENU_ICONS[open?'close':'open']);
}
function closeMenu(){setMenuState(false);}
setMenuState(false);
menu?.addEventListener('click',()=>setMenuState(menu.getAttribute('aria-expanded')!=='true'));
nav?.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}
});
document.addEventListener('click',event=>{
  if(menu?.getAttribute('aria-expanded')==='true'&&!event.target.closest('.site-header'))closeMenu();
});
matchMedia('(min-width:1081px)').addEventListener('change',event=>{if(event.matches)closeMenu();});
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

import {initMetrics} from './metrics.js';
initMetrics();

if(document.getElementById('doctor-editor'))import('./editor.js').then(m=>m.initEditor()).catch(()=>toast('تعذر تشغيل محرر البيانات. أعد المحاولة.'));
