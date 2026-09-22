import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('contribution page uses the professional review workflow',async()=>{
  const html=await readFile(new URL('../add-doctor.html',import.meta.url),'utf8');
  assert.match(html,/class="notice-banner"/);
  assert.match(html,/مساهمة مجتمعية خاضعة للمراجعة/);
  assert.match(html,/id="submit-review"/);
  assert.match(html,/من المراجعة إلى النشر/);
  assert.doesNotMatch(html,/legacy-banner|كيف تظهر الإضافة للجميع/);
});

test('Google Apps Script validates submissions and exports one JSON file per specialty',async()=>{
  const script=await readFile(new URL('../tools/google-apps-script/Code.gs',import.meta.url),'utf8');
  assert.match(script,/function doPost\(e\)/);
  assert.match(script,/body\.type === 'contact'/);
  assert.match(script,/function saveContact_\(body\)/);
  assert.match(script,/function exportApprovedJson\(\)/);
  assert.match(script,/\['منشور','مقبول'\]/);
  assert.match(script,/folder\.createFile\(id \+ '\.json'/);
  const specialties=JSON.parse(await readFile(new URL('../data/specialties.json',import.meta.url),'utf8'));
  for(const {id} of specialties)assert.match(script,new RegExp(`['"]${id}['"]`));
});

test('contact page posts a message through the shared intake endpoint',async()=>{
  const html=await readFile(new URL('../contact.html',import.meta.url),'utf8');
  const client=await readFile(new URL('../js/contact.js',import.meta.url),'utf8');
  assert.match(html,/id="contact-form"/);
  assert.match(html,/js\/contact\.js/);
  assert.match(client,/'contact'/);
  assert.match(client,/contact-submit-frame/);
  assert.match(client,/data\.get\('name'\)/);
  assert.match(client,/data\.get\('subject'\)/);
  assert.match(client,/data\.get\('message'\)/);
});

test('doctor submissions use a native form target instead of CORS fetch',async()=>{
  const html=await readFile(new URL('../add-doctor.html',import.meta.url),'utf8');
  const editor=await readFile(new URL('../js/editor.js',import.meta.url),'utf8');
  const script=await readFile(new URL('../tools/google-apps-script/Code.gs',import.meta.url),'utf8');
  assert.match(html,/doctor-submit-frame/);
  assert.match(editor,/target='doctor-submit-frame'/);
  assert.match(editor,/type:'doctor'/);
  assert.match(script,/body\.type === 'doctor'/);
  assert.doesNotMatch(editor,/fetch\(SUBMISSION_ENDPOINT/);
});

test('submission endpoint is isolated in a deploy-time configuration module',async()=>{
  const config=await readFile(new URL('../js/submission-config.js',import.meta.url),'utf8');
  assert.match(config,/export const SUBMISSION_ENDPOINT=/);
  assert.match(config,/export const SUBMISSION_VERSION='tabibi-v1'/);
});
