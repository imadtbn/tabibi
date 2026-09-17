import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('contribution page uses the professional review workflow',async()=>{
  const html=await readFile(new URL('../add-doctor.html',import.meta.url),'utf8');
  assert.match(html,/class="notice-banner"/);
  assert.match(html,/مساهمة مجتمعية خاضعة للمراجعة/);
  assert.match(html,/id="submit-review"/);
  assert.match(html,/من المراجعة إلى النشر/);
  assert.doesNotMatch(html,/demo-banner|كيف تظهر الإضافة للجميع/);
});

test('Google Apps Script validates submissions and exports one JSON file per specialty',async()=>{
  const script=await readFile(new URL('../tools/google-apps-script/Code.gs',import.meta.url),'utf8');
  assert.match(script,/function doPost\(e\)/);
  assert.match(script,/function exportApprovedJson\(\)/);
  assert.match(script,/\['منشور','مقبول'\]/);
  assert.match(script,/folder\.createFile\(id \+ '\.json'/);
  const specialties=JSON.parse(await readFile(new URL('../data/specialties.json',import.meta.url),'utf8'));
  for(const {id} of specialties)assert.match(script,new RegExp(`['"]${id}['"]`));
});

test('submission endpoint is isolated in a deploy-time configuration module',async()=>{
  const config=await readFile(new URL('../js/submission-config.js',import.meta.url),'utf8');
  assert.match(config,/export const SUBMISSION_ENDPOINT=/);
  assert.match(config,/export const SUBMISSION_VERSION='tabibi-v1'/);
});
