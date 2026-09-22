#!/usr/bin/env python3
"""Build deterministic, progressively enhanced GitHub Pages HTML using stdlib only."""
from pathlib import Path
import json, html, hashlib, re
from datetime import date
from urllib.parse import urlparse
R=Path(__file__).resolve().parents[1]
BASE='https://imadtbn.github.io/tabibi/'
def load(p): return json.loads((R/p).read_text())
def dump(p,v): (R/p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def esc(s):return html.escape(str(s),quote=True)
specs=load('data/specialties.json'); wilayas=load('data/wilayas.json'); communes=load('data/communes.json')
doctors=[]
for spec in specs:
    group=load(f'data/doctors/{spec["id"]}.json')
    assert all(d.get('specialtyIds')==[spec['id']] for d in group),'Each record belongs to its specialty file'
    doctors.extend(group)
verified_doctors=[d for d in doctors if d.get('verificationStatus')=='verified']
initial_doctors=[d for d in doctors if d.get('verificationStatus')!='verified']

spec_by={s['id']:s for s in specs}; wilaya_by={w['code']:w for w in wilayas}; commune_by={c['id']:c for c in communes}
for d in doctors:
    for p in d.get('practices',[]):
        if p.get('communeName') and p.get('communeId'):
            existing=commune_by.get(p['communeId'])
            assert not existing or existing['wilayaCode']==p['wilayaCode'],'Commune belongs to another wilaya'
            commune_by[p['communeId']]={'id':p['communeId'],'wilayaCode':p['wilayaCode'],'nameAr':p['communeName']}
dump('data/locations.json',list(commune_by.values()))
def validate_records(records):
    ids=set();slugs=set()
    for d in records:
        assert isinstance(d.get('id'),str) and d['id'] and d['id'] not in ids,'Duplicate/missing doctor ID'
        assert re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',d.get('slug','')),'Invalid doctor slug'
        assert d['slug'] not in slugs,'Duplicate doctor slug'
        ids.add(d['id']);slugs.add(d['slug'])
        assert d.get('name') and d.get('specialtyIds') and all(s in spec_by for s in d['specialtyIds']),'Invalid specialty'
        assert d.get('verificationStatus') in ['unverified','verified'],'Invalid verification state'
        if d.get('verificationStatus')=='verified':
            assert not d.get('isPlaceholder'),'Placeholder cannot be verified'
            assert urlparse(d.get('sourceUrl','')).scheme=='https' and urlparse(d['sourceUrl']).netloc,'Source URL required'
            assert re.fullmatch(r'\d{4}-\d{2}-\d{2}',d.get('verifiedAt','')),'Verification date required'
            assert date.fromisoformat(d['verifiedAt']) <= date.today(),'Verification date cannot be in the future'
        else:
            assert not d.get('verifiedAt'),'Unverified records cannot claim verification date'
        assert not d.get('sourceUrl') or (urlparse(d['sourceUrl']).scheme=='https' and urlparse(d['sourceUrl']).netloc),'Source must use HTTPS'
        assert d.get('practices'),'Practice required'
        for p in d['practices']:
            assert p.get('wilayaCode') in wilaya_by and p.get('address'),'Invalid address'
            assert not p.get('communeId') or (p['communeId'] in commune_by and commune_by[p['communeId']]['wilayaCode']==p['wilayaCode']),'Invalid commune'
            geo=p.get('coordinates')
            assert geo is None or (isinstance(geo.get('lat'),(float,int)) and isinstance(geo.get('lng'),(float,int)) and -90<=geo['lat']<=90 and -180<=geo['lng']<=180),'Invalid coordinates'
            for phone in p.get('phones',[]):assert re.fullmatch(r'\+213\d{8,9}',phone),'Use international Algerian phone format'
            assert all(day in ['mon','tue','wed','thu','fri','sat','sun'] for day in (p.get('openingHours') or {})),'Invalid day'
            for spans in (p.get('openingHours') or {}).values():
                for start,end in spans:assert re.fullmatch(r'(?:[01]\d|2[0-3]):[0-5]\d',start) and re.fullmatch(r'(?:[01]\d|2[0-3]):[0-5]\d',end) and start<end,'Hours must be same-day intervals'
validate_records(doctors)
ICON='<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M10 7v9a9 9 0 0 0 18 0V7M8 7h4m14 0h4M19 25v3a7 7 0 0 0 14 0v-5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="33" cy="20" r="3" stroke="currentColor" stroke-width="3"/></svg>'
def spec_cards(prefix='',subset=None):
    return '<div class="specialties-grid">'+''.join(f'<a class="specialty-card" href="{prefix}specialties/{s["slug"]}.html"><span class="spec-symbol">{ICON}</span><h3>{esc(s["nameAr"])}</h3><span class="latin" lang="fr">{esc(s["nameFr"])}</span><span class="specialty-count" data-specialty-count="{s["id"]}" aria-live="polite"><b>{sum(s["id"] in d["specialtyIds"] for d in doctors):02d}</b> طبيب</span></a>' for s in (subset or specs))+'</div>'
def options(items,key,label):return ''.join(f'<option value="{esc(x[key])}">{esc(x[label])}</option>' for x in items)
def filters(spec=None,home=False):
    return f'''<form class="search-panel {'home-search' if home else ''}" {'action="doctors.html"' if home else 'id="filters"'} method="get" role="search">
<label class="field"><span>اسم الطبيب أو البلدية</span><input name="q" id="query" type="search" placeholder="عمّن تبحث؟" autocomplete="off" maxlength="120"></label>
<label class="field"><span>التخصص الطبي</span><select name="spec" id="spec" {'disabled' if spec else ''}><option value="">جميع التخصصات</option>{options(specs,'id','nameAr').replace('value="'+spec+'"','value="'+spec+'" selected') if spec else options(specs,'id','nameAr')}</select></label>
<label class="field"><span>الولاية</span><select name="wilaya" id="wilaya"><option value="">كل الولايات المتاحة</option>{options(wilayas,'code','nameAr')}</select></label>
{'<button class="btn primary" type="submit">ابحث عن طبيب <span aria-hidden="true">←</span></button>' if home else '<button class="btn primary" type="submit">بحث</button>'}</form>'''
DAY_NAMES={'sun':'الأحد','mon':'الإثنين','tue':'الثلاثاء','wed':'الأربعاء','thu':'الخميس','fri':'الجمعة','sat':'السبت'}
def schedule(p):
    hours=p.get('openingHours') or {}; days=[DAY_NAMES[k] for k in DAY_NAMES if hours.get(k)]
    days_text='الأحد – الخميس' if days==[DAY_NAMES[k] for k in ['sun','mon','tue','wed','thu']] else '، '.join(days) or 'غير محدد'
    spans=list(dict.fromkeys(tuple(span) for intervals in hours.values() for span in intervals))
    return days_text,' / '.join(' – '.join(span) for span in spans) or 'غير محدد'
def static_doctor(d,prefix='',practice=None):
    p=practice or d['practices'][0];days,times=schedule(p);unverified=d.get('verificationStatus')!='verified'
    status='بيانات أولية · غير متحقق منها' if unverified else 'بيانات موثقة المصدر'
    address='، '.join([wilaya_by[p['wilayaCode']]['nameAr'],p.get('communeName') or commune_by.get(p.get('communeId'),{}).get('nameAr',''),p['address']])
    phones=''.join(f'<a class="phone-link" href="tel:{esc(n)}"><span aria-hidden="true">☎</span><bdi dir="ltr">{esc(n)}</bdi></a>' for n in p.get('phones',[]))
    geo=p.get('coordinates');route=f'<a class="btn primary route-button" href="https://www.google.com/maps/dir/?api=1&amp;destination={geo["lat"]},{geo["lng"]}&amp;travelmode=driving" target="_blank" rel="noopener noreferrer">⌖ تكوين المسار على Google Maps</a>' if geo else ''
    return f'''<article class="doctor-card"><span class="badge {'unverified-badge' if unverified else ''}">{status}</span><div class="doctor-identity"><span class="doctor-avatar">{ICON}</span><div><h2><a href="{prefix}doctors/{d['slug']}.html">{esc(d['name'])}</a></h2><span class="specialty-chip">{esc(' • '.join(spec_by[x]['nameAr'] for x in d['specialtyIds']))}</span></div></div>
<span class="availability unknown" data-hours="{esc(json.dumps(p.get('openingHours')))}">التوفر حسب توقيت الجزائر</span><p class="doctor-address">⌖ {esc(address)}</p><dl class="doctor-schedule"><div><dt>أيام العمل</dt><dd>{esc(days)}</dd></div><div><dt>توقيت العمل</dt><dd><bdi dir="ltr">{esc(times)}</bdi></dd></div></dl>{phones}{'<small class="verification-note">العنوان والهاتف غير متحقق منهما؛ السجلات المسماة «نموذج» تحتاج استبدالًا.</small>' if unverified else '<small>آخر تحقق: '+esc(d['verifiedAt'])+'</small>'}<div class="card-actions">{route}</div></article>'''
def statistics():
    counts=[('total',len(doctors),'سجل طبيب'),('specialties',len({x for d in doctors for x in d['specialtyIds']}),'تخصص به أطباء'),('wilayas',len({p['wilayaCode'] for d in doctors for p in d['practices']}),'ولاية في العرض'),('open','—','متوفر الآن حسب الجدول'),('initial',len(initial_doctors),'سجل بانتظار التحقق'),('verified',len(verified_doctors),'سجل حقيقي موثق')]
    return '<section class="stats-grid section" aria-label="إحصائيات عامة">'+''.join(f'<article><span data-stat="{key}">{value}</span><h2>{label}</h2></article>' for key,value,label in counts)+'</section><p class="muted">تشمل الإحصائيات السجلات الأولية والموثقة كلًا على حدة. يُحدّث التوفر كل 30 ثانية بتوقيت الجزائر.</p>'
def listing(spec=None,favorites=False):
    records=[d for d in doctors if not spec or spec in d['specialtyIds']]
    initial=''.join(static_doctor(d,'../' if spec else '') for d in records[:12]) if not favorites else ''
    count_text=f'{len(records)} طبيب' if not favorites else '0 طبيب'
    return f'''<section class="section" data-directory="true" data-spec="{spec or ''}" data-favorites="{'true' if favorites else 'false'}">
{filters(spec)}<div class="filter-tools"><label class="field compact">البلدية<select id="commune"><option value="">كل البلديات المتاحة</option></select></label><label class="field compact">الترتيب<select id="sort"><option value="name">حسب الاسم</option><option value="recent">آخر تحديث</option><option value="distance">الأقرب إليّ</option></select></label><button class="btn secondary" id="locate" type="button">⌖ الأقرب إليّ</button><button class="text-button" id="reset" type="button">مسح الفلاتر</button></div>
<p class="muted" id="location-note">يمكنك البحث بالولاية دون مشاركة موقعك. المسافة المعروضة تقديرية بخط مستقيم.</p>
<div class="results-heading"><h2>{'الأطباء المحفوظون' if favorites else 'نتائج البحث'}</h2><span id="result-count" class="results-count" role="status" aria-live="polite">{count_text}</span></div>
<div id="results" class="doctors-grid">{initial}</div>
<div id="empty" class="empty-state" {'hidden' if initial else ''}><span class="empty-icon" aria-hidden="true">⌕</span><h2>{'مفضلتك تبدأ من هنا' if favorites else 'نعمل على تجهيز الدليل الموثّق'}</h2><p>{'احفظ الطبيب من نتائج البحث لتصل إلى بياناته بسهولة لاحقًا.' if favorites else 'لا توجد سجلات أطباء موثقة منشورة حاليًا. ستظهر البيانات بعد التحقق من مصادرها، دون أرقام أو عناوين تجريبية.'}</p></div>
<p id="data-error" class="notice" role="alert" hidden>تعذر تحميل بيانات البحث. <button type="button" class="text-button" id="retry">إعادة المحاولة</button></p><button class="btn secondary load-more" id="load-more" hidden type="button">عرض 12 طبيبًا إضافيًا</button>
<noscript><p class="notice">المعلومات المنشورة متاحة للقراءة. فعّل JavaScript لاستخدام الفلاتر والمفضلة.</p></noscript></section>'''
def heading(title,desc,kicker='دليل طبيبي',specialty_id=None):
    count=sum(specialty_id in d['specialtyIds'] for d in doctors) if specialty_id else None
    counter=f'<span class="page-heading-count" data-specialty-heading-count="{esc(specialty_id)}" aria-live="polite"><b>{count}</b> طبيب في هذا التخصص</span>' if specialty_id else ''
    return f'<section class="page-heading"><span class="eyebrow">{kicker}</span><h1>{title}</h1><p>{desc}</p>{counter}</section>'
pages={}
def page(path,title,desc,body,active='',noindex=False,extra_schema=None):
    prefix=BASE if path=='404.html' else ('../' if '/' in path else '')
    if initial_doctors and (path in ['doctors.html','map.html','stats.html'] or (path.startswith('specialties/') and path!='specialties/index.html')): noindex=True
    canonical=BASE+('' if path=='index.html' else path)
    nav=[('index.html','الرئيسية','home'),('specialties/index.html','التخصصات','specialties'),('doctors.html','الأطباء','doctors'),('map.html','الخريطة','map'),('favorites.html','المفضلة','favorites'),('add-doctor.html','إضافة طبيب','add')]
    links=''.join(f'<a href="{prefix}{url}" {"aria-current=\"page\"" if key==active else ""}>{label}</a>' for url,label,key in nav)
    schema=[{'@context':'https://schema.org','@type':'WebSite','name':'طبيبي','url':BASE,'inLanguage':'ar-DZ'}] if path=='index.html' else [{'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'الرئيسية','item':BASE},{'@type':'ListItem','position':2,'name':title,'item':canonical}]}]
    if extra_schema:schema.append(extra_schema)
    markup=json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')
    content=f'''<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)} | طبيبي</title>
<meta name="description" content="{esc(desc)}"><meta name="robots" content="{'noindex,follow' if noindex else 'index,follow'}"><link rel="canonical" href="{canonical}">
<meta name="theme-color" content="#103f3a"><meta name="color-scheme" content="light dark"><meta name="application-name" content="طبيبي"><meta name="apple-mobile-web-app-title" content="طبيبي"><meta name="apple-mobile-web-app-capable" content="yes">
<meta property="og:type" content="website"><meta property="og:locale" content="ar_DZ"><meta property="og:site_name" content="طبيبي"><meta property="og:title" content="{esc(title)} | طبيبي"><meta property="og:description" content="{esc(desc)}"><meta property="og:url" content="{canonical}"><meta property="og:image" content="{BASE}assets/social-card.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="طبيبي — دليل الأطباء في الجزائر"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{prefix}assets/icons/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="{prefix}assets/icons/apple-touch-icon.png"><link rel="manifest" href="{prefix}manifest.webmanifest"><link rel="stylesheet" href="{prefix}css/style.css">
<script src="{prefix}js/theme.js"></script><script type="application/ld+json">{markup}</script><script type="module" src="{prefix}js/app.js"></script></head>
<body><a class="skip-link" href="#main">تجاوز إلى المحتوى</a><div class="topline">دليل الأطباء في الجزائر <span>بحث أوضح. وصول أسهل.</span></div>
<header class="site-header"><div class="container header-inner"><a class="brand" href="{prefix}index.html" aria-label="طبيبي — الرئيسية"><span class="brand-icon">{ICON}</span><span>طبيبي<small>TABIBI</small></span></a>
<button id="menu-toggle" class="icon-btn menu-toggle" aria-label="فتح القائمة" aria-expanded="false" aria-controls="main-nav">☰</button><nav id="main-nav" class="nav" aria-label="التنقل الرئيسي">{links}</nav><div class="header-actions"><button class="icon-btn" id="theme-toggle" aria-label="تبديل المظهر" aria-pressed="false">◐</button><a class="btn small secondary desktop-install" href="{prefix}install.html">تثبيت التطبيق</a></div></div></header>
<div id="offline-banner" class="connection-banner" role="status" hidden>أنت دون اتصال. تُعرض النسخة المحفوظة وقد لا تعكس أحدث البيانات.</div>
<main id="main" class="container">{f'<aside class="notice-banner" role="note"><span class="notice-banner-icon" aria-hidden="true">i</span><div><strong>بيانات الدليل قيد المراجعة المستمرة</strong><p>تُعرض بعض السجلات بوصفها «بيانات أولية» ولم تُتحقق معلوماتها بعد. راجع حالة السجل واتصل بالعيادة لتأكيد العنوان والمواعيد قبل الزيارة.</p></div><a href="{prefix}about.html">منهجية التحقق ←</a></aside>' if initial_doctors else ''}{body}</main>
<section class="app-strip container"><div><span class="eyebrow">طبيبي أقرب إليك</span><h2>احتفظ بالدليل على هاتفك</h2><p>ثبّت التطبيق وافتح الصفحات المحفوظة حتى عند انقطاع الإنترنت.</p></div><a class="btn primary" href="{prefix}install.html">طريقة التثبيت <span aria-hidden="true">←</span></a></section>
<footer><div class="container footer-grid"><div><a class="brand" href="{prefix}index.html">طبيبي</a><p>دليل للعثور على معلومات الأطباء والتواصل معهم.<br>اتصل بالعيادة لتأكيد المواعيد قبل الزيارة.</p></div><div><h2>اكتشف</h2><a href="{prefix}specialties/index.html">التخصصات الطبية</a><a href="{prefix}map.html">الخريطة</a><a href="{prefix}stats.html">إحصائيات الدليل</a></div><div><h2>عن طبيبي</h2><a href="{prefix}about.html">عن المنصة والتحقق</a><a href="{prefix}contact.html">التواصل وتصحيح البيانات</a><a href="{prefix}privacy.html">الخصوصية</a><a href="{prefix}terms.html">شروط الاستخدام</a></div></div><div class="container footer-bottom"><span>© طبيبي — دليل الأطباء في الجزائر</span><span>المعلومات للاستدلال، وليست تشخيصًا أو خدمة طوارئ.</span></div></footer>
<div class="update-banner" id="update-banner" role="status" hidden><span>نسخة جديدة من طبيبي جاهزة.</span><button class="btn primary small" id="update-app">تحديث الآن</button><button class="text-button" id="dismiss-update">لاحقًا</button></div><div id="toast" class="toast" role="status" aria-live="polite" hidden></div></body></html>'''
    target=R/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(content+'\n');pages[path]=not noindex
home=f'''<section class="hero"><div class="hero-copy"><span class="eyebrow"><span class="live-dot"></span> دليلك الطبي في الجزائر</span><h1>خطوتك الأولى<br>إلى <em>طبيبك المناسب.</em></h1><p>ابحث حسب التخصص والولاية، واطّلع على معلومات العيادة قبل الاتصال أو الزيارة.</p><div class="hero-points"><span>✓ بحث حسب التخصص</span><span>✓ وصول مباشر للمعلومات</span><span>✓ خصوصية موقعك</span></div></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="medical-tile">{ICON}</div><div class="art-label label-one">صحتك تستحق الاهتمام <span>+</span></div><div class="art-label label-two"><span>⌖</span> ابحث في ولايتك</div><div class="art-dot"></div></div></section>{filters(home=True)}
<div class="trust-line"><span>بيانات أولية قابلة للتحديث</span><span>تحديث تلقائي للتوفر</span><span>لا حاجة إلى إنشاء حساب</span></div>{statistics()}
<section class="section"><div class="section-head"><div><span class="eyebrow">ابدأ من هنا</span><h2>لكل احتياج، تخصص</h2></div><a class="text-link" href="specialties/index.html">جميع التخصصات ←</a></div>{spec_cards(subset=specs[:8])}</section>
<section class="how-section section"><div><span class="eyebrow">رحلة أبسط</span><h2>من البحث إلى العيادة<br>في ثلاث خطوات</h2><p class="muted">خذ وقتك في الاختيار، وتأكد من الموعد مباشرة مع العيادة.</p></div><ol class="steps"><li><span>01</span><div><h3>اختر التخصص والمكان</h3><p>ابدأ بالولاية، أو استخدم موقعك للبحث عن الأقرب.</p></div></li><li><span>02</span><div><h3>راجع معلومات الطبيب</h3><p>اطّلع على العنوان ووسائل الاتصال وتاريخ التحقق.</p></div></li><li><span>03</span><div><h3>اتصل قبل الزيارة</h3><p>أكد المواعيد والتوفر، ثم افتح الاتجاهات.</p></div></li></ol></section>
<section class="notice editorial"><h2>نبني دليلًا يستحق ثقتك</h2><p>أضف معلومات الأطباء أو صحح السجلات الأولية من صفحة إضافة طبيب. تُحفظ التعديلات محليًا، ثم يصدر ملف التخصص لتحديث الموقع.</p><a class="text-link" href="about.html">كيف نتحقق من المعلومات؟ ←</a></section>'''
page('index.html','دليل الأطباء في الجزائر','ابحث في دليل طبيبي حسب التخصص والولاية. معلومات اتصال وعناوين موثقة المصدر، بحث بالقرب منك، ومفضلة على جهازك دون إنشاء حساب.',home,'home')
page('specialties/index.html','التخصصات الطبية','تصفح التخصصات الطبية في دليل طبيبي، واختر تخصصًا للبحث عن الأطباء حسب الولاية والبلدية.',heading('التخصصات الطبية','اختر التخصص المناسب لبحثك، ثم حدّد الولاية أو البلدية.')+spec_cards('../'),'specialties')
for s in specs:
    body=f'<nav class="breadcrumbs" aria-label="مسار التصفح"><a href="../index.html">الرئيسية</a><span>/</span><a href="index.html">التخصصات</a><span>/</span><span>{esc(s["nameAr"])}</span></nav>'+heading(f'أطباء {s["nameAr"]}',esc(s['description']),esc(s['nameFr']),s['id'])+listing(s['id'])
    related=[x for x in specs if x['id']!=s['id']][:4]
    body+='<section class="section"><div class="section-head"><h2>تصفح تخصصات أخرى</h2><a class="text-link" href="index.html">جميع التخصصات ←</a></div>'+spec_cards('../',related)+'</section>'
    page(f'specialties/{s["slug"]}.html',f'أطباء {s["nameAr"]} في الجزائر',s['description'],body,'specialties')
page('doctors.html','البحث عن طبيب','ابحث عن طبيب في الجزائر حسب الاسم والتخصص والولاية والبلدية، وراجع مصادر بياناته ووسائل الاتصال.',heading('ابحث عن طبيبك','كل المعلومات التي تحتاجها للخطوة التالية، في مكان واحد.')+listing(),'doctors')
page('favorites.html','الأطباء المفضلون','الأطباء الذين تحفظهم على هذا الجهاز للوصول السريع إلى بياناتهم.',heading('أطباؤك المفضلون','اختياراتك محفوظة على هذا الجهاز فقط، دون حساب.')+listing(favorites=True),'favorites',True)
page('map.html','خريطة الأطباء','استعرض مواقع عيادات الأطباء الموثقة على الخريطة، وصفّها حسب التخصص والولاية.',heading('ابحث على الخريطة','اختر تخصصًا وولاية لاستعراض مواقع العيادات المنشورة.')+filters()+'''<section class="section"><div class="map-toolbar"><button class="btn primary" id="load-map">عرض الخريطة</button><button class="btn secondary" id="map-locate" disabled>⌖ موقعي</button><span class="muted" id="map-status" role="status">تُحمّل الخريطة عند الطلب لتوفير البيانات.</span></div><div id="map" class="map-panel" aria-label="خريطة العيادات"><div class="empty-state"><span class="empty-icon">⌖</span><h2>نظرة أقرب على أماكن الرعاية</h2><p>اضغط «عرض الخريطة» للاتصال بخدمة الخرائط.</p></div></div><p class="muted">تحتاج خلفية الخريطة إلى الإنترنت. لا تُرسل إحداثياتك إلى خادم طبيبي؛ قد يستنتج مزود الخرائط المنطقة المعروضة من طلبات البلاطات.</p><a class="text-link" href="doctors.html">استخدم عرض القائمة بدل الخريطة ←</a></section>''','map')
covered=len({p['wilayaCode'] for d in doctors for p in d['practices']})
page('stats.html','إحصائيات الدليل','إحصائيات الأطباء والتخصصات والولايات، مع فصل السجلات الأولية عن الموثقة.',heading('الدليل بالأرقام','عدادات من البيانات المعروضة؛ لا تمثل إحصاءً طبيًا رسميًا.')+statistics())
articles={
'about.html':('عن طبيبي والتحقق من البيانات','تعرف على هدف دليل طبيبي وكيفية قبول المعلومات وتحديثها.','''<h2>معلومات أوضح، واختيار أسهل</h2><p>طبيبي دليل يساعد المستخدم في الجزائر على العثور على معلومات الأطباء والعيادات حسب التخصص والمكان. لا يقدم تشخيصًا طبيًا أو حجز مواعيد مباشرًا.</p><h2>كيف تُنشر المعلومات؟</h2><ol><li>الحصول على المعلومات من مصدر علني موثوق أو من العيادة مباشرة.</li><li>التحقق من الاسم والتخصص والعنوان ووسائل الاتصال.</li><li>إرفاق مصدر وتاريخ تحقق بالسجل قبل نشره.</li><li>مراجعة التصحيحات وتحديث المعلومات عند ثبوت التغيير.</li></ol><h2>حالة الدليل</h2><p>بدأنا بتنظيم التخصصات وتجهيز البحث. تُدار بيانات الأطباء بملف مستقل لكل تخصص. بعض السجلات أولية ومسماة «نموذج»، ويجب استبدالها بمعلومات حقيقية. لا تمثل حالة «غير متحقق منها» توثيقًا لصحة المعلومات.</p><p>وصف «موثق المصدر» يتعلق بمصدر بيانات الاتصال، ولا يمثل اعتمادًا طبيًا أو تقييمًا لكفاءة الطبيب.</p>'''),
'contact.html':('التواصل وتصحيح البيانات','أرسل ملاحظات تقنية أو طلب تصحيح بيانات منشورة في دليل طبيبي.','''<h2>لديك ملاحظة أو تصحيح؟</h2><p>يمكن إرسال ملاحظات المشروع عبر صفحة النقاشات التقنية في GitHub. يتطلب إنشاء طلب حسابًا هناك، وتكون المشاركات علنية.</p><a class="btn primary" href="https://github.com/imadtbn/tabibi/issues" target="_blank" rel="noopener noreferrer">فتح صفحة ملاحظات المشروع ↗</a><h2>ماذا تذكر في طلب التصحيح؟</h2><ul><li>رابط الصفحة المعنية.</li><li>المعلومة المطلوب تعديلها ومصدر علني يؤكد التصحيح.</li></ul><p class="notice">لا تنشر تفاصيل صحية شخصية أو ملفات طبية أو أرقام أشخاص دون موافقتهم. للاستفسار عن موعد أو علاج، اتصل بالعيادة مباشرة. هذه الصفحة لا ترسل رسائل إلى الأطباء.</p>'''),
'privacy.html':('سياسة الخصوصية','كيف يستخدم طبيبي التخزين المحلي والموقع الجغرافي وخدمات الخرائط.','''<h2>الموقع الجغرافي</h2><p>لا نطلب موقعك إلا عند الضغط على زر تحديد الموقع. تُستخدم الإحداثيات داخل الصفحة لحساب المسافة، ولا نحفظها في التخزين الدائم أو نرسلها إلى خادم طبيبي.</p><h2>التخزين على جهازك</h2><p>نحفظ تفضيل المظهر ومعرّفات الأطباء المفضلين ومسودات محرر بيانات الأطباء محليًا على هذا المتصفح. لا تغادر المسودة جهازك إلا عند ضغط زر «إرسال للمراجعة». يخزن التطبيق صفحات وملفات عامة للعمل دون اتصال. يمكنك حذفها من إعدادات بيانات الموقع في المتصفح.</p><h2>طلبات إضافة وتصحيح الأطباء</h2><p>عند الإرسال، تنتقل معلومات الطبيب والعيادة والمصدر إلى Google Sheets خاص بفريق الدليل لغرض المراجعة. لا ترسل معلومات مرضى أو ملفات طبية أو بيانات غير مخصصة للنشر.</p><h2>الخدمات الخارجية</h2><p>الاستضافة عبر GitHub Pages. عند فتح الخريطة، تتصل الصفحة بخدمة OpenStreetMap للحصول على بلاطات المنطقة المعروضة. لا تُحمّل الخريطة قبل طلبك. تستخدم صفحة المساهمة Google Apps Script وGoogle Sheets لمعالجة الطلبات. روابط GitHub والاتجاهات تنقلك إلى خدمات تخضع لسياساتها الخاصة.</p><h2>التحليلات والإعلانات</h2><p>هذا الإصدار لا يفعّل أدوات تحليل زيارات أو إعلانات خارجية. ستُراجع هذه السياسة قبل إضافة خدمات جديدة.</p><h2>المعلومات الصحية</h2><p>لا يطلب طبيبي ملفات طبية أو معلومات عن حالتك الصحية، ولا يوفر حسابات للمرضى.</p>'''),
 'terms.html':('شروط الاستخدام','حدود استخدام دليل طبيبي وبيانات العيادات المنشورة.','''<h2>استخدام الدليل</h2><p>طبيبي دليل معلومات، وليس منشأة صحية أو وسيط حجز أو خدمة للطوارئ. اتصل بالعيادة لتأكيد البيانات والمواعيد قبل الزيارة.</p><h2>الدقة والتحديث</h2><p>نرفق مصادر المعلومات وتواريخ التحقق عند توفر السجلات. قد تتغير العناوين والمواعيد بعد نشرها. المسافات تقديرية بخط مستقيم، وليست زمن الرحلة أو طول الطريق.</p><h2>المعلومات المنشورة</h2><p>لا تعني إضافة طبيب تزكية لخدماته أو ضمانًا لتوفره. لا يعرض هذا الإصدار تقييمات أو ترتيبًا مدفوعًا للأطباء.</p><h2>التصحيحات</h2><p>يمكن طلب تصحيح معلومة من صفحة التواصل مع إرفاق مصدر مناسب. لا تُرسل معلومات مرضى أو بيانات سرية.</p>''')}
for path,(title,desc,body) in articles.items():page(path,title,desc,heading(title,desc)+f'<article class="prose section">{body}</article>')
editor=(R/'tools/editor.html').read_text().replace('__SPECIALTIES__',options(specs,'id','nameAr')).replace('__WILAYAS__',options(wilayas,'code','nameAr'))
page('add-doctor.html','إضافة أو تصحيح بيانات طبيب','أرسل بيانات طبيب أو تصحيح معلومات عيادة إلى لوحة مراجعة دليل طبيبي قبل اعتمادها ونشرها حسب الاختصاص.',heading('أضف طبيبًا أو اقترح تصحيحًا','مساهمتك تمر بمراجعة بشرية قبل أن تصبح جزءًا من الدليل المنشور.')+editor,'add',True)
page('install.html','تثبيت تطبيق طبيبي','ثبّت طبيبي على هاتفك أو حاسوبك، وتعرف على استخدام الصفحات المحفوظة دون اتصال.',heading('طبيبي، على شاشتك الرئيسية','تجربة خفيفة تفتح مباشرة من هاتفك، دون متجر تطبيقات.')+'''<section class="prose section"><button class="btn primary" id="install-app" hidden>تثبيت طبيبي</button><p id="install-status" role="status">إذا كان متصفحك يدعم التثبيت سيظهر زر التثبيت هنا.</p><h2>على Android والحاسوب</h2><p>افتح قائمة المتصفح واختر «تثبيت التطبيق» أو «الإضافة إلى الشاشة الرئيسية»، إذا كان الخيار متاحًا.</p><h2>على iPhone وiPad</h2><p>افتح الموقع في Safari، واضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية».</p><h2>ماذا يعمل دون اتصال؟</h2><p>الصفحات الأساسية والمفضلة، وصفحات التخصصات وبيانات الأطباء التي سبق فتحها وحفظها على الجهاز. تحتاج خلفية الخريطة وفتح الاتجاهات الخارجية إلى الإنترنت.</p><h2>تحديث التطبيق</h2><p>عند توفر إصدار جديد سيظهر إشعار «تحديث الآن». أثناء انقطاع الإنترنت تظهر النسخة المحفوظة مع تنبيه واضح؛ لا تعتمد عليها لتأكيد ساعات العمل.</p></section>''')
page('offline.html','أنت دون اتصال','تصفح الصفحات المحفوظة في تطبيق طبيبي.',heading('الاتصال غير متاح الآن','هذه الصفحة غير محفوظة على جهازك. يمكنك العودة إلى الدليل أو المحاولة عند عودة الاتصال.')+'<div class="section"><a class="btn primary" href="index.html">العودة إلى الرئيسية</a> <a class="btn secondary" href="specialties/index.html">التخصصات المحفوظة</a></div>',noindex=True)
page('404.html','الصفحة غير موجودة','الرابط المطلوب غير موجود في دليل طبيبي.',heading('لم نجد هذه الصفحة','قد يكون الرابط قد تغيّر. ابدأ من الرئيسية أو تصفح التخصصات.')+f'<p class="section"><a class="btn primary" href="{BASE}">العودة إلى طبيبي</a></p>',noindex=True)
page('specialty.html','اختيار التخصص','انتقل إلى الصفحة المستقلة للتخصص الطبي.',heading('نوصلك إلى التخصص المطلوب','يمكنك أيضًا اختيار التخصص من القائمة التالية.')+spec_cards(),noindex=True)
# Remove obsolete generated doctor profiles before rebuilding.
for p in (R/'doctors').glob('*.html'):p.unlink()
for d in doctors:
    unverified=d.get('verificationStatus')!='verified'
    body=heading(esc(d['name']),esc(' • '.join(spec_by[x]['nameAr'] for x in d['specialtyIds'])))+'<div class="section profile-cards">'+''.join(static_doctor(d,'../',p) for p in d['practices'])+'</div>'
    schema=None
    if not unverified:
        p=d['practices'][0]
        body+=f'<a class="text-link" href="{esc(d["sourceUrl"])}" target="_blank" rel="noopener noreferrer">مصدر المعلومات ↗</a>'
        schema={'@context':'https://schema.org','@type':'Physician','name':d['name'],'url':BASE+f'doctors/{d["slug"]}.html','address':{'@type':'PostalAddress','streetAddress':p['address'],'addressRegion':wilaya_by[p['wilayaCode']]['nameAr'],'addressCountry':'DZ'}}
        if p.get('phones'):schema['telephone']=p['phones'][0]
        if p.get('coordinates'):schema['geo']={'@type':'GeoCoordinates','latitude':p['coordinates']['lat'],'longitude':p['coordinates']['lng']}
    page(f'doctors/{d["slug"]}.html',d['name'],'سجل أولي غير متحقق منه، قابل للتحديث اليدوي.' if unverified else f'عنوان ووسائل اتصال {d["name"]}',body,'doctors',noindex=unverified,extra_schema=schema)
dump('data/stats.json',{'doctors':len(doctors),'coveredWilayas':covered,'specialties':len(specs),'initialDoctors':len(initial_doctors),'verifiedDoctors':len(verified_doctors),'bySpecialty':{s['id']:sum(s['id'] in d['specialtyIds'] for d in doctors) for s in specs}})
stats=load('data/stats.json'); groups={}
for d in doctors:
    key=json.dumps([p.get('openingHours') for p in d['practices']],sort_keys=True)
    groups[key]=groups.get(key,0)+1
stats['schedules']=[{'hours':json.loads(key),'count':n} for key,n in groups.items()]
dump('data/stats.json',stats)
def norm(t):return re.sub('[\u064b-\u065f\u0670ـ]','',t).translate(str.maketrans('أإآى','اااي')).casefold()
index=[]
for d in doctors:
    terms=[d['name']]+[term for sid in d['specialtyIds'] for term in [spec_by[sid]['nameAr'],spec_by[sid]['nameFr'],*spec_by[sid]['aliases']]]+[term for p in d['practices'] for term in [p['address'],wilaya_by[p['wilayaCode']]['nameAr'],p.get('communeName') or commune_by.get(p.get('communeId'),{}).get('nameAr','')]]
    index.append({'id':d['id'],'name':d['name'],'slug':d['slug'],'specialtyIds':d['specialtyIds'],'verificationStatus':d['verificationStatus'],'isPlaceholder':d.get('isPlaceholder',False),'updatedAt':d.get('updatedAt',''),'verifiedAt':d.get('verifiedAt',''),'text':norm(' '.join(terms)),'practices':[{'wilayaCode':p['wilayaCode'],'communeId':p.get('communeId'),'communeName':p.get('communeName') or commune_by.get(p.get('communeId'),{}).get('nameAr',''),'coordinates':p.get('coordinates')} for p in d['practices']]})
dump('data/search-index.json',index)
dump('manifest.webmanifest',{'id':'./','name':'طبيبي — دليل الأطباء في الجزائر','short_name':'طبيبي','description':'ابحث عن معلومات الأطباء حسب التخصص والولاية.','lang':'ar','dir':'rtl','start_url':'./','scope':'./','display':'standalone','background_color':'#f7faf8','theme_color':'#103f3a','icons':[{'src':f'assets/icons/icon-{size}.png','sizes':f'{size}x{size}','type':'image/png','purpose':'any'} for size in [192,512]]+[{'src':'assets/icons/maskable-512.png','sizes':'512x512','type':'image/png','purpose':'maskable'}],'shortcuts':[{'name':'التخصصات','url':'./specialties/index.html'},{'name':'المفضلة','url':'./favorites.html'}]})
urls=[BASE+('' if p=='index.html' else p) for p,indexable in pages.items() if indexable]
(R/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'  <url><loc>{esc(u)}</loc></url>\n' for u in urls)+'</urlset>\n')
(R/'robots.txt').write_text('# For crawlers this file must also be placed at the ORIGIN root.\n# GitHub project path /tabibi/robots.txt is not the origin robots file.\nUser-agent: *\nAllow: /tabibi/\n\nSitemap: '+BASE+'sitemap.xml\n')
# Cache only public app files, never build sources, tests, or external map tiles.
assets=sorted(set(list(pages)+[str(p.relative_to(R)) for folder in ['css','js','assets','data'] for p in (R/folder).rglob('*') if p.is_file()]+['manifest.webmanifest']))
precache=[p for p in assets if not p.startswith('data/doctors/') and not p.startswith('doctors/') and not (p.startswith('specialties/') and p!='specialties/index.html')]
worker_template=(R/'tools/sw-template.js').read_text()
version=hashlib.sha256(worker_template.encode()+b''.join(p.encode()+(R/p).read_bytes() for p in assets)).hexdigest()[:12]
(R/'sw.js').write_text(worker_template.replace('__VERSION__',version).replace('__PRECACHE__',json.dumps(precache,ensure_ascii=False)).replace('__ALL_FILES__',json.dumps(assets,ensure_ascii=False)))
(R/'.nojekyll').touch()
print(f'Built {len(pages)} pages; {len(urls)} sitemap URLs; {len(doctors)} doctors ({len(initial_doctors)} unverified); cache {version}')
