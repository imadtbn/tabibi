import {SUBMISSION_ENDPOINT} from './submission-config.js';

const form=document.getElementById('contact-form');
const state=document.getElementById('contact-state');
const button=form?.querySelector('button[type="submit"]');
let requestIdInput;

function show(message, kind='') {
  state.textContent=message;
  state.className=`submission-state${kind?' '+kind:''}`;
}

form?.addEventListener('submit', event => {
  if (!SUBMISSION_ENDPOINT) {
    event.preventDefault();
    show('قناة الاستقبال غير مفعّلة حاليًا.', 'error');
    return;
  }
  const data=new FormData(form);
  if (String(data.get('website') || '').trim()) {
    event.preventDefault();
    return;
  }
  const name=String(data.get('name') || '').trim();
  const subject=String(data.get('subject') || '').trim();
  const message=String(data.get('message') || '').trim();
  if (name.length<2 || subject.length<3 || message.length<10) {
    event.preventDefault();
    show('يرجى إكمال الحقول المطلوبة بشكل صحيح.', 'error');
    return;
  }
  button.disabled=true;
  if (requestIdInput) requestIdInput.value=crypto.randomUUID();
  show('جارٍ إرسال رسالتك…', 'sending');
  window.setTimeout(() => {
    form.reset();
    button.disabled=false;
    show('تم إرسال رسالتك. شكرًا لمساعدتنا على تحسين طبيبي.', 'success');
  }, 700);
});

if (form && SUBMISSION_ENDPOINT) {
  form.action=SUBMISSION_ENDPOINT;
  form.method='post';
  form.target='contact-submit-frame';
  for (const [name,value] of [['requestId',crypto.randomUUID()],['version','tabibi-v1'],['type','contact'],['pageUrl',location.href]]) {
    const input=document.createElement('input');
    input.type='hidden'; input.name=name; input.value=value; form.append(input);
    if (name==='requestId') requestIdInput=input;
  }
}
