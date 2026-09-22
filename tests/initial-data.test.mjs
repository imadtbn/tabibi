import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {availability,summarize,scheduleText,selectDoctors} from '../js/core.js';

const read=name=>JSON.parse(fs.readFileSync(new URL('../data/'+name+'.json',import.meta.url),'utf8'));
const specialties=read('specialties');
const doctors=specialties.flatMap(s=>read('doctors/'+s.id));
const data={doctors,specialties,index:read('search-index')};
const stats=read('stats');

test('doctor IDs and profile slugs stay unique when specialty files grow',()=>{
  assert.equal(new Set(doctors.map(d=>d.id)).size,doctors.length);
  assert.equal(new Set(doctors.map(d=>d.slug)).size,doctors.length);
  for(const spec of specialties)for(const doctor of read('doctors/'+spec.id))
    assert.ok(doctor.specialtyIds.includes(spec.id));
  for(const doctor of doctors){
    assert.ok(['verified','unverified'].includes(doctor.verificationStatus));
    if(doctor.isPlaceholder)assert.equal(doctor.verificationStatus,'unverified');
    if(doctor.verificationStatus==='verified'){
      assert.equal(doctor.isPlaceholder,false);
      assert.match(doctor.sourceUrl||'',/^https:\/\//);
      assert.match(doctor.verifiedAt||'',/^\d{4}-\d{2}-\d{2}$/);
    }
  }
});

test('Algeria time boundaries are computed from working hours',()=>{
  const hours={sun:[['09:00','15:00']],mon:[['09:00','15:00']],tue:[['09:00','15:00']],wed:[['09:00','15:00']],thu:[['09:00','15:00']],fri:[],sat:[]};
  for(const [iso,expected] of [['2026-09-20T07:59:59Z','closed'],['2026-09-20T08:00:00Z','open'],['2026-09-17T13:59:59Z','open'],['2026-09-17T14:00:00Z','closed'],['2026-09-18T09:00:00Z','closed'],['2026-09-19T09:00:00Z','closed']])
    assert.equal(availability(hours,new Date(iso)).state,expected);
  assert.equal(availability(hours,new Date(),false).state,'unknown');
  assert.deepEqual(scheduleText(hours),{days:'الأحد – الخميس',hours:'09:00 – 15:00'});
});

test('built index and aggregate stats match all specialty source files',()=>{
  assert.equal(data.index.length,doctors.length);
  assert.deepEqual(new Set(data.index.map(d=>d.id)),new Set(doctors.map(d=>d.id)));
  const actual=summarize(data,new Date('2026-09-20T09:00:00Z'));
  assert.equal(stats.doctors,doctors.length);
  assert.equal(stats.coveredWilayas,actual.wilayas);
  assert.equal(stats.specialties,specialties.length);
  assert.equal(stats.initialDoctors,actual.initial);
  assert.equal(stats.verifiedDoctors,actual.verified);
  assert.deepEqual(stats.bySpecialty,actual.bySpecialty);
  assert.equal(summarize(data,new Date(),false).open,'—');
});

test('individual profiles and sitemap respect verification state',()=>{
  const sitemap=fs.readFileSync(new URL('../sitemap.xml',import.meta.url),'utf8');
  for(const doctor of doctors){
    const html=fs.readFileSync(new URL('../doctors/'+doctor.slug+'.html',import.meta.url),'utf8');
    if(doctor.verificationStatus==='verified'){
      assert.match(html,/\"@type\": \"Physician\"/);
    }else{
      assert.match(html,/noindex,follow/);
      assert.doesNotMatch(html,/\"@type\": \"Physician\"/);
      assert.ok(!sitemap.includes('/doctors/'+doctor.slug+'.html'));
    }
    assert.match(html,/data-hours=/);
  }
});

test('search filters and recent sorting cover updated datasets',()=>{
  assert.equal(selectDoctors(data,{sort:'recent'}).length,doctors.length);
  const cardio=doctors.filter(d=>d.specialtyIds.includes('cardio')).length;
  assert.equal(selectDoctors(data,{spec:'cardio'}).length,cardio);
  assert.equal(selectDoctors(data,{q:'Cardiologie'}).length,cardio);
});
