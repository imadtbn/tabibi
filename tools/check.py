#!/usr/bin/env python3
"""Check public links, assets, metadata, manifest, sitemap, and data gate."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json,re,xml.etree.ElementTree as ET,subprocess
R=Path(__file__).resolve().parents[1];errors=[]
class Doc(HTMLParser):
 def __init__(self,text):super().__init__();self.tags=[];self.feed(text)
 def handle_starttag(self,tag,attrs):self.tags.append((tag,dict(attrs)))
files=list(R.glob('*.html'))+list((R/'specialties').glob('*.html'))+list((R/'doctors').glob('*.html'))
canonicals=set()
for p in files:
 text=p.read_text();doc=Doc(text)
 assert sum(t=='h1' for t,a in doc.tags)==1,p
 assert any(t=='html' and a.get('lang')=='ar' and a.get('dir')=='rtl' for t,a in doc.tags),p
 assert any(t=='meta' and a.get('name')=='description' and a.get('content') for t,a in doc.tags),p
 canon=[a['href'] for t,a in doc.tags if t=='link' and a.get('rel')=='canonical'];assert len(canon)==1 and canon[0] not in canonicals,p;canonicals.update(canon)
 for t,a in doc.tags:
  if t not in ('a','link','script','img'):continue
  u=a.get('src') or a.get('href') or '';parts=urlsplit(u)
  if parts.scheme or parts.netloc or not parts.path:continue
  target=(p.parent/unquote(parts.path)).resolve()
  if not target.is_relative_to(R) or not target.exists():errors.append(f'{p.relative_to(R)}: missing {u}')
 for payload in re.findall(r'<script type="application/ld\+json">(.*?)</script>',text,re.S):json.loads(payload)
for p in (R/'css').glob('*.css'):
 for u in re.findall(r'url\([\'"]?([^\)\'\"]+)',p.read_text()):
  if not urlsplit(u).scheme and not (p.parent/u).exists():errors.append(f'{p}: missing CSS asset {u}')
manifest=json.loads((R/'manifest.webmanifest').read_text());assert manifest['scope']=='./' and manifest['start_url']=='./'
for icon in manifest['icons']:assert (R/icon['src']).exists(),icon
for loc in ET.parse(R/'sitemap.xml').iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
 path=loc.text.removeprefix('https://imadtbn.github.io/tabibi/') or 'index.html';assert (R/path).exists(),path
 assert 'noindex' not in (R/path).read_text(),path
for p in (R/'js').glob('*.js'):subprocess.run(['node','--check',str(p)],check=True)
subprocess.run(['node','--check',str(R/'sw.js')],check=True)
assert not errors,'\n'.join(errors)
print(f'PASS: {len(files)} HTML pages; local links, metadata, JSON-LD, CSS assets, manifest, sitemap, JS syntax')
