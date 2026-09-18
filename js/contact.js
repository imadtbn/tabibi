import {SUBMISSION_ENDPOINT,SUBMISSION_VERSION} from './submission-config.js';

const form=document.getElementById('contact-form');
const state=document.getElementById('contact-state');
const button=form?.querySelector('button[type="submit"]');

function show(message, kind='') {
  state.textContent=message;
  state.className=`submission-state${kind?' '+kind:''}`;
}

form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!SUBMISSION_ENDPOINT) { show('قناة الاستقبال غير مفعّلة حاليًا.', 'error'); return; }
  const data=new FormData(form);
  if (String(data.get('website') || '').trim()) return;
  const name=String(data.get('name') || '').trim();
  const email=String(data.get('email') || '').trim();
  const subject=String(data.get('subject') || '').trim();
  const message=String(data.get('message') || '').trim();
  if (name.length<2 || subject.length<3 || message.length<10) { show('يرجى إكمال الحقول المطلوبة بشكل صحيح.', 'error'); return; }
  button.disabled=true;
  show('جارٍ إرسال رسالتك…', 'sending');
  try {
    const response=await fetch(SUBMISSION_ENDPOINT,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({
      version:SUBMISSION_VERSION, type:'contact', requestId:crypto.randomUUID(), name, email, subject, message,
      pageUrl:location.href, website:''
    })});
    if (!response.ok) throw new Error('تعذر الوصول إلى خدمة الاستقبال.');
    const result=await response.json();
    if (!result.ok) throw new Error(result.error || 'لم تقبل خدمة الاستقبال الرسالة.');
    form.reset();
    show('تم استلام رسالتك بنجاح. شكرًا لمساعدتنا على تحسين طبيبي.', 'success');
  } catch (error) {
    show(error.message || 'تعذر إرسال الرسالة. حاول لاحقًا.', 'error');
  } finally {
    button.disabled=false;
  }
});
