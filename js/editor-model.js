// Pure data checks shared by the editor and automated tests. No network or DOM.
export const DAYS=['sun','mon','tue','wed','thu','fri','sat'];
export function normalizePhone(value){
  let phone=String(value||'').trim().replace(/[\s().-]/g,'');
  if(phone.startsWith('00213'))phone='+'+phone.slice(2);
  if(/^0\d{8,9}$/.test(phone))phone='+213'+phone.slice(1);
  return phone;
}
export function validateRecord(d,specialty,validWilayas){
  const fail=msg=>{throw new Error(msg);};
  if(!d||typeof d!=='object'||Array.isArray(d))fail('السجل ليس كائن بيانات صالحًا.');
  if(typeof d.id!=='string'||!d.id||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug||''))fail('المعرّف أو رابط الطبيب غير صالح.');
  if(typeof d.name!=='string'||d.name.trim().length<3||d.name.length>120)fail('أدخل اسمًا من 3 إلى 120 حرفًا.');
  if(!Array.isArray(d.specialtyIds)||d.specialtyIds.length!==1||d.specialtyIds[0]!==specialty)fail('السجل لا يطابق ملف التخصص المحدد.');
  if(!['unverified','verified'].includes(d.verificationStatus))fail('حالة التحقق غير صالحة.');
  if(d.sourceUrl){let source;try{source=new URL(d.sourceUrl);}catch{fail('رابط المصدر غير صالح.');}if(source.protocol!=='https:'||source.username||source.password)fail('المصدر يجب أن يكون رابط HTTPS علنيًا.');}
  if(d.verificationStatus==='verified'){
    if(d.isPlaceholder||!d.sourceUrl||!/^\d{4}-\d{2}-\d{2}$/.test(d.verifiedAt||'')||Number.isNaN(Date.parse(d.verifiedAt))||d.verifiedAt>new Date().toISOString().slice(0,10))fail('السجل الموثق يتطلب مصدرًا وتاريخ تحقق صحيحًا ولا يمكن أن يكون نموذجًا.');
  }else if(d.verifiedAt)fail('السجل غير المتحقق منه لا يحمل تاريخ توثيق.');
  if(!Array.isArray(d.practices)||!d.practices.length)fail('أضف عنوان عيادة واحدًا على الأقل.');
  for(const p of d.practices){
    if(!validWilayas.includes(p.wilayaCode)||typeof p.address!=='string'||p.address.trim().length<3||p.address.length>240)fail('الولاية أو عنوان الشارع غير صالح.');
    if(!p.communeId&&!(typeof p.communeName==='string'&&p.communeName.trim()))fail('أدخل البلدية.');
    if(!Array.isArray(p.phones)||!p.phones.length)fail('أدخل رقم هاتف واحدًا على الأقل.');
    for(const n of p.phones){if(typeof n!=='string'||!/^\+213[1-9]\d{7,8}$/.test(n)){if(!(d.isPlaceholder&&/^\+213000000\d{3}$/.test(n)))fail('رقم الهاتف الجزائري غير صالح. استخدم 0… أو +213… .');}}
    if(p.coordinates!==null&&p.coordinates!==undefined){const {lat,lng}=p.coordinates;if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)fail('الإحداثيات غير صالحة. أدخل خط العرض والطول معًا.');}
    if(p.openingHours!==null&&p.openingHours!==undefined){
      if(typeof p.openingHours!=='object'||Array.isArray(p.openingHours))fail('جدول العمل غير صالح.');
      for(const [day,spans] of Object.entries(p.openingHours)){
        if(!DAYS.includes(day)||!Array.isArray(spans))fail('يوم عمل غير صالح.');let previous='';
        for(const span of spans){if(!Array.isArray(span)||span.length!==2||!span.every(t=>typeof t==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t))||span[0]>=span[1]||(previous&&span[0]<previous))fail('الفترات يجب أن تكون صحيحة، مرتبة وغير متداخلة.');previous=span[1];}
      }
    }
  }
  return d;
}
export function validateCollection(rows,specialty,wilayas){
  if(!Array.isArray(rows)||rows.length>5000)throw new Error('الملف يجب أن يحتوي مصفوفة لا تتجاوز 5000 سجل.');
  const ids=new Set(),slugs=new Set();for(const row of rows){validateRecord(row,specialty,wilayas);if(ids.has(row.id)||slugs.has(row.slug))throw new Error('يوجد معرّف أو رابط مكرر في الملف.');ids.add(row.id);slugs.add(row.slug);}return rows;
}
export function mergeRecords(base,changes){const merged=new Map(base.map(d=>[d.id,d]));for(const d of changes)merged.set(d.id,d);return [...merged.values()];}
export function conflictingDrafts(base,drafts){const current=new Map(base.map(d=>[d.id,JSON.stringify(d)]));return drafts.filter(d=>(current.get(d.record.id)||null)!==d.base&&current.get(d.record.id)!==JSON.stringify(d.record));}
