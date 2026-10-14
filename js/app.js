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
// Decorative footer icons: preserve the original link text for accessibility and SEO.
// The links remain functional when JavaScript or external icon fonts are unavailable.
const FOOTER_ICONS={
  'specialties/index.html':'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 7v10M7 12h10"/>',
  'index.html':'<path d="M7 3v7a5 5 0 0 0 10 0V3M5 3h4m6 0h4M12 15v2a4 4 0 0 0 8 0v-2"/><circle cx="20" cy="13" r="2"/>',
  'map.html':'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>',
  'stats.html':'<path d="M4 20v-9h4v9M10 20V4h4v16M16 20v-7h4v7"/>',
  'about.html':'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  'contact.html':'<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5A9 9 0 1 1 21 11.5Z"/><path d="M8.5 10h7M8.5 14h5"/>',
  'privacy.html':'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1"/>',
  'terms.html':'<path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v6h5M9 14h6M9 18h6"/>'
};
const footer=document.querySelector('footer');
footer?.querySelectorAll('.footer-grid a[href]').forEach(link=>{
  const pathname=new URL(link.href).pathname;
  const kind=Object.keys(FOOTER_ICONS).find(path=>pathname.endsWith('/'+path));
  if(!kind||link.querySelector('.footer-link-icon,.footer-brand-mark'))return;
  const iconClass=link.classList.contains('brand')?'footer-brand-mark':'footer-link-icon';
  link.insertAdjacentHTML('afterbegin',`<span class="${iconClass}" aria-hidden="true">${svg(FOOTER_ICONS[kind])}</span>`);
  link.classList.add('has-footer-icon');
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
