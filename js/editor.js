import {getJSON,loadSpecialty,storage,el,toast,normalize} from './core.js';
import {DAYS,normalizePhone,validateRecord,validateCollection,mergeRecords,conflictingDrafts} from './editor-model.js';
import {SUBMISSION_ENDPOINT,SUBMISSION_VERSION} from './submission-config.js';
export async function initEditor(){
  const $=id=>document.getElementById(id);let spec='',base=[],drafts=[],current=null,dirty=false,sequence=0;
  const [wilayas,communes]=await Promise.all([getJSON('data/wilayas.json'),getJSON('data/locations.json')]);const codes=wilayas.map(w=>w.code);
  const submitButton=$('submit-review');const submissionState=$('submission-state');
  function progress(stage='start'){
    const saved=stage==='saved'||stage==='received';
    $('progress-title').textContent=stage==='received'?'وصل طلبك إلى المراجعة':saved?'مسودتك محفوظة':stage==='editing'?'أكمل البيانات ثم احفظ المسودة':'اختر الاختصاص للبدء';
    $('progress-detail').textContent=stage==='received'?'استلام الطلب لا يعني اعتماده أو نشره. يراجع المشرف البيانات قبل تحديث الدليل.':!SUBMISSION_ENDPOINT?'الإرسال غير مفعّل حاليًا. يمكنك تجهيز البيانات وحفظ مسودتك على هذا الجهاز.':saved?'راجع المعاينة وأكّد صحة البيانات، ثم اضغط «إرسال للمراجعة».':'أدخل اسم الطبيب والعنوان والهاتف وأوقات العمل. الحفظ المحلي لا يرسل البيانات.';
    $('connection-badge').textContent=SUBMISSION_ENDPOINT?'قناة الإرسال مُعدّة':'الإرسال غير مفعّل';
    for(const id of ['step-draft','step-review','step-publish'])$(id).removeAttribute('aria-current');
    $(stage==='received'?'step-publish':saved?'step-review':'step-draft').setAttribute('aria-current','step');
    $('step-draft').classList.toggle('is-complete',saved);$('step-review').classList.toggle('is-complete',stage==='received');
  }
  progress();
  if(!SUBMISSION_ENDPOINT){submitButton.disabled=true;submissionState.classList.add('pending');submissionState.lastElementChild.textContent='قناة Google Sheets بانتظار نشر رابط Apps Script من إعدادات المشروع.';}
  const names={sun:'الأحد',mon:'الإثنين',tue:'الثلاثاء',wed:'الأربعاء',thu:'الخميس',fri:'الجمعة',sat:'السبت'};
  for(const day of DAYS){
    const row=el('div',undefined,'hours-row');const label=el('label',undefined,'checkbox-field');const enabled=el('input');enabled.type='checkbox';enabled.id=`day-${day}`;label.append(enabled,document.createTextNode(names[day]));row.append(label);
    for(let period=0;period<2;period++)for(const edge of ['start','end']){const field=el('label',undefined,'field');field.append(el('span',`${period?'الفترة الثانية — ':''}${edge==='start'?'من':'إلى'}`));const time=el('input');time.type='time';time.id=`${day}-${period}-${edge}`;time.setAttribute('aria-label',`${names[day]} ${period+1} ${edge==='start'?'من':'إلى'}`);field.append(time);row.append(field);}
    const toggle=()=>row.querySelectorAll('input[type=time]').forEach(input=>{input.disabled=!enabled.checked;});enabled.addEventListener('change',toggle);toggle();$('hours-editor').append(row);
  }
  const key=()=>`editor:${spec}`;
  function status(msg,error=false){$('editor-message').textContent=msg;$('editor-message').className=error?'editor-error':'editor-success';}
  function persist(next){if(!storage.set(key(),next))throw new Error('تعذر حفظ المسودة. ربما امتلأ التخزين أو منعه المتصفح.');drafts=next;}
  function rows(){return mergeRecords(base,drafts.map(x=>x.record));}
  function renderList(){
    $('editor-records').replaceChildren();for(const d of rows()){
      const row=el('div',undefined,'editor-record');row.append(el('span',d.name));if(drafts.some(x=>x.record.id===d.id))row.append(el('small','تعديل محلي'));
      const edit=el('button','تعديل','text-button');edit.type='button';edit.setAttribute('aria-label',`تعديل ${d.name}`);edit.addEventListener('click',()=>{if(dirty&&!confirm('يوجد تعديل غير محفوظ. هل تريد تركه وفتح السجل؟'))return;fill(d);});row.append(edit);$('editor-records').append(row);
    }
    $('editor-load-status').textContent=`${rows().length} سجل في الملف، ${drafts.length} تعديل محفوظ محليًا. الحفظ لا ينشر للجميع.`;
  }
  function fill(d=null){
    current=d?structuredClone(d):null;$('doctor-editor').hidden=false;$('editor-preview').hidden=true;$('doctor-editor').reset();
    $('editor-title').textContent=d?'تعديل بيانات الطبيب':'إضافة طبيب';$('doctor-id').value=d?.id||'';$('doctor-slug').value=d?.slug||'';$('doctor-name').value=d?.name||'';
    const p=d?.practices[0];$('doctor-wilaya').value=p?.wilayaCode||'';$('doctor-commune').value=p?.communeName||communes.find(c=>c.id===p?.communeId)?.nameAr||'';$('doctor-address').value=p?.address||'';
    $('doctor-phone').value=p?.phones?.[0]||'';$('doctor-phone2').value=p?.phones?.[1]||'';$('doctor-lat').value=p?.coordinates?.lat??'';$('doctor-lng').value=p?.coordinates?.lng??'';$('doctor-source').value=d?.sourceUrl||'';$('confirm-real').checked=!!d&&!d.isPlaceholder;
    for(const day of DAYS){const spans=p?.openingHours?.[day]??(!d&&['sun','mon','tue','wed','thu'].includes(day)?[['09:00','15:00']]:[]);$(`day-${day}`).checked=spans.length>0;
      for(let n=0;n<2;n++)for(const [edge,index] of [['start',0],['end',1]]){const input=$(`${day}-${n}-${edge}`);input.value=spans[n]?.[index]||'';input.disabled=!spans.length;}}
    $('discard-local').disabled=!d||!drafts.some(x=>x.record.id===d.id);dirty=false;status(d?.practices.length>1?'يُعدّل النموذج العنوان الأول فقط؛ تبقى العناوين الإضافية محفوظة.':'');
    progress(drafts.some(x=>x.record.id===d?.id)?'saved':'editing');
    submissionState.className='submission-state'+(!SUBMISSION_ENDPOINT?' pending':'');submissionState.lastElementChild.textContent=SUBMISSION_ENDPOINT?'احفظ التغييرات قبل إرسالها للمراجعة.':'الإرسال غير مفعّل حاليًا؛ المسودات محفوظة على هذا الجهاز فقط.';
  }
  async function load(){
    const version=++sequence;const next=$('edit-specialty').value;spec=next;base=[];drafts=[];current=null;$('doctor-editor').hidden=true;$('editor-preview').hidden=true;$('editor-records').replaceChildren();
    progress();
    for(const id of ['reload-specialty','new-doctor','export-specialty','import-specialty'])$(id).disabled=true;
    if(!spec){$('editor-load-status').textContent='اختر التخصص لتحميل ملفه فقط.';return;}
    $('editor-load-status').textContent='جاري تحميل ملف التخصص…';
    try{const fetched=await loadSpecialty(next,true);if(version!==sequence)return;validateCollection(fetched,spec,codes);base=fetched;const saved=storage.get(key(),[]);
      if(!Array.isArray(saved))throw new Error('صيغة المسودات المحلية غير صالحة.');for(const entry of saved){validateRecord(entry.record,spec,codes);if(entry.base!==null&&typeof entry.base!=='string')throw new Error('مسودة غير صالحة.');}drafts=saved;
      renderList();for(const id of ['reload-specialty','new-doctor','export-specialty','import-specialty'])$(id).disabled=false;dirty=false;
    }catch(error){if(version!==sequence)return;$('editor-load-status').textContent=error.message;$('reload-specialty').disabled=false;}
  }
  $('edit-specialty').addEventListener('change',()=>{if(dirty&&!confirm('هل تريد ترك التعديل غير المحفوظ وتغيير التخصص؟')){$('edit-specialty').value=spec;return;}load();});
  $('reload-specialty').addEventListener('click',()=>{if(!dirty||confirm('هل تريد إعادة التحميل وترك التعديل غير المحفوظ؟'))load();});
  $('new-doctor').addEventListener('click',()=>{if(!dirty||confirm('هل تريد ترك التعديل غير المحفوظ؟'))fill();});
  $('doctor-editor').addEventListener('input',()=>{dirty=true;progress('editing');});
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  $('doctor-editor').addEventListener('submit',event=>{
    event.preventDefault();try{
      const id=$('doctor-id').value||`doctor-${crypto.randomUUID()}`;const commune=$('doctor-commune').value.trim();const wilaya=$('doctor-wilaya').value;const lat=$('doctor-lat').value,lng=$('doctor-lng').value;
      if((lat==='')!==(lng===''))throw new Error('أدخل خط العرض والطول معًا، أو اتركهما فارغين.');
      const hours={};for(const day of DAYS){hours[day]=[];if($(`day-${day}`).checked){for(let n=0;n<2;n++){const start=$(`${day}-${n}-start`).value,end=$(`${day}-${n}-end`).value;if(n===0||start||end)hours[day].push([start,end]);}hours[day].push(...(current?.practices[0]?.openingHours?.[day]?.slice(2)||[]));}}
      const practice={...current?.practices[0],wilayaCode:wilaya,communeId:`${wilaya}:${normalize(commune)}`,communeName:commune,address:$('doctor-address').value.trim(),phones:[$('doctor-phone').value,$('doctor-phone2').value].filter(v=>v.trim()).map(normalizePhone).concat(current?.practices[0]?.phones?.slice(2)||[]),coordinates:lat===''?null:{lat:Number(lat),lng:Number(lng)},openingHours:hours};
      delete practice.coordinateNote;
      const record={...current,id,slug:$('doctor-slug').value||id,name:$('doctor-name').value.trim(),specialtyIds:[spec],verificationStatus:'unverified',isPlaceholder:!$('confirm-real').checked,updatedAt:new Date().toISOString().slice(0,10),practices:[practice,...(current?.practices.slice(1)||[])]};
      delete record.verifiedAt;delete record.sourceUrl;if($('doctor-source').value.trim())record.sourceUrl=$('doctor-source').value.trim();
      validateRecord(record,spec,codes);
      const existing=drafts.find(d=>d.record.id===id);const baseline=base.find(d=>d.id===id);const next=drafts.filter(d=>d.record.id!==id);next.push({record,base:existing?.base??(baseline?JSON.stringify(baseline):null)});
      persist(next);fill(record);renderList();status(SUBMISSION_ENDPOINT?'حُفظت المسودة على هذا الجهاز. يمكنك الآن إرسالها للمراجعة.':'حُفظت المسودة على هذا الجهاز. الإرسال للمراجعة غير مفعّل حاليًا.');
      const preview=$('preview-content');preview.replaceChildren(el('h3',record.name),el('span','غير متحقق منها','badge'),el('p',[wilayas.find(w=>w.code===wilaya)?.nameAr,commune,practice.address].join('، ')),el('p',practice.phones.join(' / ')));$('editor-preview').hidden=false;
    }catch(error){status(error.message,true);}
  });
  submitButton.addEventListener('click',async()=>{
    if(!SUBMISSION_ENDPOINT){status('قناة الإرسال غير مفعلة بعد. يجب نشر Google Apps Script وإضافة رابطه في js/submission-config.js.',true);return;}
    if(dirty){status('احفظ المسودة الحالية قبل إرسالها للمراجعة.',true);return;}
    if(!current||!drafts.some(x=>x.record.id===current.id)){status('أنشئ أو عدّل سجلًا واحفظه أولًا.',true);return;}
    if(!$('confirm-real').checked||current.isPlaceholder){status('يجب تأكيد أن البيانات حقيقية ومخصصة للنشر قبل الإرسال.',true);return;}
    submitButton.disabled=true;submissionState.className='submission-state sending';submissionState.lastElementChild.textContent='جاري إرسال الطلب إلى لوحة المراجعة…';
    try{
      validateRecord(current,spec,codes);const requestId=crypto.randomUUID();const specialtyName=$('edit-specialty').selectedOptions[0]?.textContent?.trim()||spec;
      const sender=document.createElement('form');sender.method='post';sender.action=SUBMISSION_ENDPOINT;sender.target='doctor-submit-frame';sender.hidden=true;
      const fields={version:SUBMISSION_VERSION,type:'doctor',requestId,specialtyId:spec,specialtyName,record:JSON.stringify(current),website:$('doctor-website').value};
      for(const [name,value] of Object.entries(fields)){const input=document.createElement('input');input.name=name;input.value=value;sender.append(input);}
      document.body.append(sender);sender.submit();sender.remove();
      submissionState.className='submission-state success';submissionState.lastElementChild.textContent=`تم إرسال الطلب رقم ${requestId}. سيُراجع قبل النشر.`;status('أُرسل الطلب إلى Google Sheets للمراجعة.');
      progress('received');
    }catch(error){submissionState.className='submission-state error';submissionState.lastElementChild.textContent='تعذر تجهيز الطلب للإرسال. المسودة محفوظة على هذا الجهاز.';status(error.message,true);}
    finally{submitButton.disabled=!SUBMISSION_ENDPOINT;}
  });
  $('discard-local').addEventListener('click',()=>{if(!current)return;try{const id=current.id;persist(drafts.filter(d=>d.record.id!==id));const original=base.find(d=>d.id===id);fill(original);renderList();status(original?'أُلغي التعديل المحلي وعاد السجل المنشور.':'حُذفت المسودة المحلية. لم يتغير الموقع المنشور.');}catch(error){status(error.message,true);}});
  $('import-specialty').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file||!spec)return;const selected=spec;try{
      if(file.size>2*1024*1024)throw new Error('حجم الملف يجب ألا يتجاوز 2 ميغابايت.');const incoming=JSON.parse(await file.text());if(selected!==spec)return;validateCollection(incoming,spec,codes);
      const next=new Map(drafts.map(d=>[d.record.id,d]));for(const record of incoming){const original=base.find(d=>d.id===record.id);next.set(record.id,{record,base:original?JSON.stringify(original):null});}validateCollection(mergeRecords(base,[...next.values()].map(d=>d.record)),spec,codes);
      persist([...next.values()]);renderList();toast('تم استيراد الملف إلى المسودات المحلية فقط.');
    }catch(error){toast(error.message);}finally{event.target.value='';}
  });
  $('export-specialty').addEventListener('click',async()=>{
    const selected=spec;if(dirty){toast('احفظ التعديل الحالي قبل التصدير.');return;}$('export-specialty').disabled=true;
    try{const latest=await loadSpecialty(selected,true);if(selected!==spec)return;validateCollection(latest,spec,codes);
      if(conflictingDrafts(latest,drafts).length)throw new Error('تغيرت سجلات في المستودع منذ بدء التعديل. أعد تحميل الملف، وألغِ التعديل المحلي المتعارض ثم أعد إدخاله بعد مراجعة السجل المنشور.');
      const result=mergeRecords(latest,drafts.map(d=>d.record));validateCollection(result,spec,codes);
      const blob=new Blob([JSON.stringify(result,null,2)+'\n'],{type:'application/json;charset=utf-8'});const objectURL=URL.createObjectURL(blob);const link=el('a');link.href=objectURL;link.download=`${spec}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(objectURL),30000);toast('نُزّل ملف التخصص. لم يُنشر بعد؛ اتبع خطوات النشر أسفل النموذج.');
    }catch(error){toast(error.message);}finally{if(selected===spec)$('export-specialty').disabled=false;}
  });
}
