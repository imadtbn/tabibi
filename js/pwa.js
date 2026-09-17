import {BASE,url,toast} from './core.js';
let promptEvent=null;const install=document.getElementById('install-app');const status=document.getElementById('install-status');
function standalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}
if(standalone()&&status)status.textContent='تستخدم طبيبي الآن كتطبيق مستقل.';
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;if(install&&!standalone())install.hidden=false;});
install?.addEventListener('click',async()=>{if(!promptEvent)return;await promptEvent.prompt();const choice=await promptEvent.userChoice;promptEvent=null;install.hidden=true;if(status)status.textContent=choice.outcome==='accepted'?'تم قبول التثبيت. تابع من الشاشة الرئيسية.':'يمكنك التثبيت لاحقًا من قائمة المتصفح.';});
window.addEventListener('appinstalled',()=>{if(install)install.hidden=true;if(status)status.textContent='تم تثبيت طبيبي.';});
if('serviceWorker' in navigator && window.isSecureContext){
  let reloadRequested=false;let reloaded=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloadRequested&&!reloaded){reloaded=true;location.reload();}});
  const register=async()=>{
    try{
      const registration=await navigator.serviceWorker.register(url('sw.js'),{scope:BASE.pathname,updateViaCache:'none'});
      const banner=document.getElementById('update-banner');
      const offer=()=>{if(registration.waiting&&navigator.serviceWorker.controller)banner.hidden=false;};offer();
      registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed')offer();});});
      document.getElementById('update-app')?.addEventListener('click',()=>{if(registration.waiting){reloadRequested=true;registration.waiting.postMessage({type:'SKIP_WAITING'});}});
      document.getElementById('dismiss-update')?.addEventListener('click',()=>{banner.hidden=true;});
      window.addEventListener('online',()=>registration.update().catch(()=>{}));
    }catch{if(status)status.textContent='يمكنك تصفح الموقع، لكن تعذر تجهيز العمل دون اتصال. أعد المحاولة عند توفر الإنترنت.';}
  };
  if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true});
}
