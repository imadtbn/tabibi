import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeSource} from '../js/metrics.js';

const specialties=[{id:'cardio'},{id:'dental'}];
const hours={sun:[['09:00','15:00']]};
const doctors=[
  {id:'dr-1',specialtyIds:['cardio'],isPlaceholder:true,verificationStatus:'verified',sourceUrl:'https://example.org/doctor',verifiedAt:'2026-09-01',practices:[{wilayaCode:'16'}]},
  {id:'dr-1',specialtyIds:['cardio'],isPlaceholder:true,verificationStatus:'unverified',practices:[{wilayaCode:'16'}]},
  {id:'dr-2',specialtyIds:['cardio'],isPlaceholder:false,verificationStatus:'verified',sourceUrl:'https://example.org/doctor2',verifiedAt:'2026-09-01',practices:[{wilayaCode:'31',openingHours:hours}]}
];
const dentist={id:'dr-3',specialtyIds:['dental'],verificationStatus:'unverified',practices:[{wilayaCode:'31'}]};

test('specialty counters use doctor IDs instead of duplicated JSON rows',()=>{
  const summary=summarizeSource([doctors,[dentist]],specialties,new Date('2026-09-20T09:00:00Z'));
  assert.equal(summary.total,3);
  assert.deepEqual(summary.bySpecialty,{cardio:2,dental:1});
  assert.equal(summary.specialties,2);
  assert.equal(summary.wilayas,2);
  assert.equal(summary.verified,1);
  assert.equal(summary.initial,2);
  assert.equal(summary.open,1);
});

test('offline summary keeps specialty totals but never claims live availability',()=>{
  const summary=summarizeSource([doctors,[dentist]],specialties,new Date('2026-09-20T09:00:00Z'),false);
  assert.deepEqual(summary.bySpecialty,{cardio:2,dental:1});
  assert.equal(summary.open,'—');
});

test('incomplete specialty group fetch must not present a partial count',()=>{
  assert.throws(()=>summarizeSource([doctors],specialties),TypeError);
});
