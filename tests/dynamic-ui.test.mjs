import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';

const root=new URL('../',import.meta.url);

test('mobile statistics keep two cards per row with CSS-only styling',async()=>{
  const css=await readFile(new URL('../css/style.css',import.meta.url),'utf8');
  assert.match(css,/@media\(max-width:700px\)[\s\S]*?\.stats-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.results-count,\.page-heading-count\{/);
  assert.match(css,/@keyframes countPop/);
});

test('specialty pages expose dynamic heading and filtered-result counters',async()=>{
  const specialties=JSON.parse(await readFile(new URL('../data/specialties.json',import.meta.url),'utf8'));
  for(const spec of specialties){
    const html=await readFile(new URL(`../specialties/${spec.slug}.html`,import.meta.url),'utf8');
    assert.match(html,new RegExp(`data-specialty-heading-count="${spec.id}"`));
    assert.match(html,/id="result-count" class="results-count"/);
  }
});

test('directory and stats pages use live counter hooks',async()=>{
  const doctors=await readFile(new URL('../doctors.html',import.meta.url),'utf8');
  const stats=await readFile(new URL('../stats.html',import.meta.url),'utf8');
  const metrics=await readFile(new URL('../js/metrics.js',import.meta.url),'utf8');
  assert.match(doctors,/id="result-count" class="results-count"/);
  for(const key of ['total','specialties','wilayas','open','initial','verified'])assert.match(stats,new RegExp(`data-stat="${key}"`));
  assert.match(metrics,/data\/search-index\.json/);
  assert.match(metrics,/data-specialty-heading-count/);
});

test('technical demo prefix is removed from doctor identifiers and generated profiles',async()=>{
  const files=await readdir(new URL('../data/doctors/',import.meta.url));
  for(const file of files){
    const text=await readFile(new URL(`../data/doctors/${file}`,import.meta.url),'utf8');
    assert.doesNotMatch(text,/demo-/);
  }
  const profiles=await readdir(new URL('../doctors/',import.meta.url));
  assert.ok(profiles.every(name=>!name.startsWith('demo-')));
});
