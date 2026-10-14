import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const footerTargets=[
  'index.html','specialties/index.html','map.html','stats.html',
  'about.html','contact.html','privacy.html','terms.html'
];

test('every published Tabibi page includes the shared footer navigation',async()=>{
  const paths=[
    ...(await readdir(root)).filter(name=>name.endsWith('.html')),
    ...(await readdir(new URL('../specialties/',import.meta.url))).filter(name=>name.endsWith('.html')).map(name=>'specialties/'+name),
    ...(await readdir(new URL('../doctors/',import.meta.url))).filter(name=>name.endsWith('.html')).map(name=>'doctors/'+name)
  ];
  assert.ok(paths.length>40,'Expected generated pages in root and nested folders');
  for(const path of paths){
    const html=await readFile(new URL('../'+path,import.meta.url),'utf8');
    const footer=html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)?.[1];
    assert.ok(footer,'Missing footer: '+path);
    for(const target of footerTargets){
      assert.ok(footer.includes('href="'+(path.includes('/')?'../':'')+target+'"') ||
        (path==='404.html'&&footer.includes('href="https://imadtbn.github.io/tabibi/'+target+'"')),
        'Missing '+target+' in footer: '+path);
    }
  }
});

test('footer icons cover every navigation link, including brand, without hiding text',async()=>{
  const app=await readFile(new URL('../js/app.js',import.meta.url),'utf8');
  for(const path of footerTargets)assert.ok(app.includes("'"+path+"'"),'Icon missing for '+path);
  assert.match(app,/footer\?\.querySelectorAll\('\.footer-grid a\[href\]'\)/);
  assert.match(app,/aria-hidden="true"/);
  assert.match(app,/link\.classList\.add\('has-footer-icon'\)/);
  assert.match(app,/!kind\|\|link\.querySelector/);
});

test('footer layout supports light and dark colors, RTL and small screens',async()=>{
  const css=await readFile(new URL('../css/style.css',import.meta.url),'utf8');
  assert.match(css,/footer \.footer-grid \.footer-link-icon/);
  assert.match(css,/footer \.footer-grid>div>a:not\(\.brand\)\{display:flex;align-items:center/);
  assert.match(css,/background:var\(--accent-soft\);color:var\(--accent\)/);
  assert.match(css,/@media\(max-width:880px\)/);
  assert.match(css,/@media\(max-width:440px\)/);
  assert.match(css,/min-height:44px/);
});
