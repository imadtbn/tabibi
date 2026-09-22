import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {loadData,hydrateRows,selectDoctors} from '../js/core.js';
test('specialty page fetches one specialty; general results hydrate only displayed specialties',async()=>{
 const original=globalThis.fetch;const calls=[];
 globalThis.fetch=async input=>{const u=new URL(input);calls.push(u.pathname);const path=u.pathname.split('/data/')[1];const data=fs.readFileSync(new URL('../data/'+path,import.meta.url),'utf8');return new Response(data,{status:200,headers:{'Content-Type':'application/json'}});};
 try{const cardio=await loadData('cardio');assert.equal(cardio.doctors.length,2);assert.equal(calls.filter(p=>p.includes('/data/doctors/')).length,1);assert.ok(calls.some(p=>p.endsWith('/data/doctors/cardio.json')));const all=await loadData();assert.equal(all.doctors.length,40);assert.equal(calls.filter(p=>p.includes('/data/doctors/')).length,1);const dental=selectDoctors(all,{spec:'dental'}).slice(0,1);const full=await hydrateRows(dental);assert.equal(full.length,1);assert.ok(full[0].practice.phones.length);assert.equal(calls.filter(p=>p.includes('/data/doctors/')).length,2);assert.ok(!calls.some(p=>p.endsWith('/legacy-doctors.json')));}finally{globalThis.fetch=original;}
});
