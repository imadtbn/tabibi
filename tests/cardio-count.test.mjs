import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async p=>JSON.parse(await readFile(new URL('../data/'+p,import.meta.url),'utf8'));
test('cardiology index and dynamic counters match source doctor IDs',async()=>{
 const doctors=await read('doctors/cardio.json');
 const index=await read('search-index.json');
 const stats=await read('stats.json');
 assert.equal(new Set(doctors.map(d=>d.id)).size,doctors.length);
 assert.equal(new Set(doctors.map(d=>d.slug)).size,doctors.length);
 assert.equal(index.filter(d=>d.specialtyIds.includes('cardio')).length,doctors.length);
 assert.equal(stats.bySpecialty.cardio,doctors.length);
 const html=await readFile(new URL('../specialties/index.html',import.meta.url),'utf8');
 const match=html.match(/data-specialty-count="cardio"[^>]*><b>(\d+)<\/b>/);
 assert.ok(match);assert.equal(Number(match[1]),doctors.length);
});
test('placeholder doctors never claim verified credentials',async()=>{
 for(const doctor of await read('doctors/cardio.json'))if(doctor.isPlaceholder)
   assert.equal(doctor.verificationStatus,'unverified');
});
