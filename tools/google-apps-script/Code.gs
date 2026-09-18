const VERSION = 'tabibi-v1';
const SPREADSHEET_ID = '1FXerDOnLHokGICOeRt2RKfTdQZNMcfhOE5YiN_5CT_c';
const SPECIALTIES = ['general','cardio','pediatrics','derma','ophtalmo','dental','gyneco','ortho','ent','neuro','internal','psychiatry','gastro','pneumo','uro','onco','endo','rhemato','nephro','radio'];
const DAYS = ['sun','mon','tue','wed','thu','fri','sat'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('طبيبي')
    .addItem('تصدير ملفات JSON المعتمدة', 'exportApprovedJson')
    .addToUi();
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error('طلب فارغ');
    if (e.postData.contents.length > 20000) throw new Error('حجم الطلب أكبر من المسموح');
    const body = JSON.parse(e.postData.contents);
    if (body.website) throw new Error('طلب غير صالح');
    if (body.version !== VERSION) throw new Error('إصدار النموذج غير مدعوم');
    if (!/^[0-9a-f-]{20,50}$/i.test(body.requestId || '')) throw new Error('معرّف الطلب غير صالح');
    if (body.type === 'contact') return saveContact_(body);
    if (!SPECIALTIES.includes(body.specialtyId)) throw new Error('الاختصاص غير صالح');
    validateRecord_(body.record, body.specialtyId);
    lock.waitLock(15000);
    const cache = CacheService.getScriptCache();
    if (cache.get(body.requestId)) return json_({ok:true, requestId:body.requestId, duplicate:true});
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(body.specialtyId);
    if (!sheet) throw new Error('تبويب الاختصاص غير موجود');
    if (sheet.getLastRow() > 1 && sheet.getRange(2, 3, sheet.getLastRow() - 1, 1).createTextFinder(body.requestId).matchEntireCell(true).findNext()) {
      return json_({ok:true, requestId:body.requestId, duplicate:true});
    }
    sheet.appendRow(rowFromRecord_('قيد المراجعة', body.requestId, body.specialtyName, body.record));
    cache.put(body.requestId, '1', 21600);
    return json_({ok:true, requestId:body.requestId});
  } catch (error) {
    return json_({ok:false, error:String(error.message || error)});
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function saveContact_(body) {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const subject = String(body.subject || '').trim();
  const message = String(body.message || '').trim();
  if (name.length < 2 || name.length > 120) throw new Error('الاسم غير صالح');
  if (email && (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('البريد الإلكتروني غير صالح');
  if (subject.length < 3 || subject.length > 180) throw new Error('الموضوع غير صالح');
  if (message.length < 10 || message.length > 5000) throw new Error('الرسالة غير صالحة');
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName('contact') || spreadsheet.insertSheet('contact');
  if (sheet.getLastRow() === 0) sheet.appendRow(['الحالة', 'التاريخ', 'معرّف الطلب', 'الاسم', 'البريد الإلكتروني', 'الموضوع', 'الرسالة', 'الرابط']);
  if (sheet.getLastRow() > 1 && sheet.getRange(2, 3, sheet.getLastRow() - 1, 1).createTextFinder(body.requestId).matchEntireCell(true).findNext()) return json_({ok:true, requestId:body.requestId, duplicate:true});
  sheet.appendRow(['جديدة', new Date(), safe_(body.requestId), safe_(name), safe_(email), safe_(subject), safe_(message), safe_(body.pageUrl || '')]);
  return json_({ok:true, requestId:body.requestId});
}

function validateRecord_(record, specialtyId) {
  if (!record || typeof record !== 'object') throw new Error('سجل الطبيب غير صالح');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id || '')) throw new Error('معرّف الطبيب غير صالح');
  if (String(record.name || '').trim().length < 3) throw new Error('اسم الطبيب غير صالح');
  if (typeof record.name !== 'string' || record.name.length > 160 || record.id.length > 100) throw new Error('بيانات الطبيب طويلة جدًا');
  if (!Array.isArray(record.specialtyIds) || record.specialtyIds.length !== 1 || record.specialtyIds[0] !== specialtyId) throw new Error('الاختصاص لا يطابق السجل');
  if (record.verificationStatus !== 'unverified' || record.isPlaceholder !== false) throw new Error('يجب إرسال بيانات فعلية غير موثقة');
  const practice = record.practices && record.practices[0];
  if (!practice || !/^\d{2}$/.test(practice.wilayaCode || '') || !practice.address || !practice.phones || !practice.phones[0]) throw new Error('بيانات العيادة ناقصة');
  if (record.sourceUrl && !/^https:\/\//i.test(record.sourceUrl)) throw new Error('رابط المصدر يجب أن يستخدم HTTPS');
  DAYS.forEach(day => {
    const periods = (practice.openingHours || {})[day] || [];
    if (!Array.isArray(periods) || periods.length > 4 || periods.some(period => !Array.isArray(period) || period.length !== 2 || period.some(time => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) || period[0] >= period[1])) throw new Error('أوقات العمل غير صالحة');
  });
}

function rowFromRecord_(status, requestId, specialtyName, record) {
  const practice = record.practices[0];
  const dayText = day => (practice.openingHours && practice.openingHours[day] || []).map(period => period.join('–')).join(' / ');
  const coordinates = practice.coordinates || {};
  return [status, new Date(), safe_(requestId), safe_(record.name), record.specialtyIds[0], safe_(specialtyName), safe_(practice.wilayaCode), '', safe_(practice.communeName || ''), safe_(practice.address), safe_(practice.phones[0] || ''), safe_(practice.phones[1] || ''), coordinates.lat == null ? '' : coordinates.lat, coordinates.lng == null ? '' : coordinates.lng]
    .concat(DAYS.map(dayText), [safe_(record.sourceUrl || ''), 'نعم', '', JSON.stringify(record)]);
}

function safe_(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function recordFromRow_(row) {
  const original = JSON.parse(row[24]);
  const practice = original.practices[0];
  const periods = text => String(text || '').split('/').map(value => value.trim()).filter(Boolean).map(value => value.split(/[–-]/).map(x => x.trim())).filter(value => value.length === 2);
  original.name = String(row[3] || original.name).trim();
  original.specialtyIds = [String(row[4])];
  original.verificationStatus = 'unverified';
  original.isPlaceholder = row[22] !== 'نعم';
  original.updatedAt = Utilities.formatDate(new Date(), 'Africa/Algiers', 'yyyy-MM-dd');
  delete original.verifiedAt;
  practice.wilayaCode = String(row[6]).padStart(2, '0');
  const communeName = String(row[8] || '').trim();
  if (communeName) {
    practice.communeName = communeName;
    practice.communeId = practice.wilayaCode + ':' + communeName.toLowerCase().replace(/\s+/g, '-');
  }
  practice.address = String(row[9] || '').trim();
  practice.phones = [row[10], row[11]].filter(Boolean).map(String);
  practice.coordinates = row[12] === '' || row[13] === '' ? null : {lat:Number(row[12]), lng:Number(row[13])};
  practice.openingHours = Object.fromEntries(DAYS.map((day, index) => [day, periods(row[14 + index])]));
  if (row[21]) original.sourceUrl = String(row[21]); else delete original.sourceUrl;
  return original;
}

function exportApprovedJson() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const stamp = Utilities.formatDate(new Date(), 'Africa/Algiers', 'yyyyMMdd-HHmmss');
  const folder = DriveApp.createFolder('tabibi-approved-json-' + stamp);
  let files = 0;
  SPECIALTIES.forEach(id => {
    const sheet = spreadsheet.getSheetByName(id);
    if (!sheet || sheet.getLastRow() < 2) return;
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 25).getValues();
    const records = new Map();
    values.forEach(row => {
      if (!['منشور','مقبول'].includes(row[0]) || !row[24]) return;
      const record = recordFromRow_(row);
      records.set(record.id, record);
    });
    folder.createFile(id + '.json', JSON.stringify(Array.from(records.values()), null, 2) + '\n', MimeType.PLAIN_TEXT);
    files++;
  });
  SpreadsheetApp.getUi().alert('تم إنشاء ' + files + ' ملفًا داخل مجلد Drive:\n' + folder.getName() + '\n\nنزّل الملفات واستبدلها داخل data/doctors/.');
}
