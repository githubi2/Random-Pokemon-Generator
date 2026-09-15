#!/usr/bin/env python
# kimi-verify-pokedex: 4 新页专项 + 全站词数 + 矩阵 + SA + AI 词
import re, io, glob, os, json, xml.etree.ElementTree as ET

root = os.path.abspath('.')
errors = []
NEW = [('pokemon', 'hub'), ('pokemon/bulbasaur', 'bulbasaur'), ('pokemon/charizard', 'charizard'), ('pokemon/pikachu', 'pikachu')]

def read(p):
    return io.open(p, encoding='utf-8').read()

def word_count(html):
    m = re.search(r'<main[^>]*>(.*?)</main>', html, re.S)
    if not m:
        return 0
    body = re.sub(r'<script.*?</script>', ' ', m.group(1), flags=re.S)
    body = re.sub(r'<style.*?</style>', ' ', body, flags=re.S)
    body = re.sub(r'<[^>]+>', ' ', body)
    body = re.sub(r'&[a-z]+;', ' ', body)
    return len(re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", body))

print('=== 1. 全站词数 ===')
words_map = {}
bad = []
for path in sorted(glob.glob(os.path.join(root, '**', 'index.html'), recursive=True)):
    rel = os.path.relpath(path, root).replace(os.sep, '/')
    w = word_count(read(path))
    words_map[rel] = w
    if w < 1200:
        bad.append((rel, w))
        print('  [差] %-40s %d' % (rel, w))
if bad: errors.extend(['[词数] %s %d' % (b[0], b[1]) for b in bad])
else: print('  全部 ≥1200 (%d 页)' % len(words_map))

print()
print('=== 2. 新页专项 ===')
for rel, label in NEW:
    html = read(os.path.join(rel, 'index.html'))
    title = re.search(r'<title>([^<]*)</title>', html).group(1)
    desc = re.search(r'<meta name="description" content="([^"]*)"', html).group(1)
    h1s = re.findall(r'<h1[^>]*>(.*?)</h1>', html, re.S)
    canon = re.search(r'<link rel="canonical" href="([^"]*)"', html).group(1)
    words = word_count(html)
    ok = True
    if len(title) > 60: errors.append('[%s] title %d' % (label, len(title))); ok = False
    if not (100 <= len(desc) <= 160): errors.append('[%s] desc %d' % (label, len(desc))); ok = False
    if len(h1s) != 1: errors.append('[%s] H1!=1' % label); ok = False
    if 'www.' not in canon or ('/pokemon/' not in canon if label != 'hub' else '/pokemon/' not in canon):
        errors.append('[%s] canonical %s' % (label, canon)); ok = False
    if words < 1200: errors.append('[%s] words %d' % (label, words)); ok = False
    lds = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
    types = []
    for ld in lds:
        try: types.append(json.loads(ld).get('@type'))
        except Exception as ex: errors.append('[%s] LD 解析: %s' % (label, ex)); ok = False
    # 必须是 WebPage + FAQPage + BreadcrumbList + Organization + WebSite（不套 SoftwareApplication）
    if 'WebPage' not in types: errors.append('[%s] 缺 WebPage' % label); ok = False
    if 'SoftwareApplication' in types: errors.append('[%s] 误用 SoftwareApplication' % label); ok = False
    need = {'FAQPage', 'BreadcrumbList', 'Organization', 'WebSite'}
    if not need.issubset(set(types)): errors.append('[%s] 缺 %s' % (label, need - set(types))); ok = False
    faq_sec = re.search(r'<section id="faq"[^>]*>(.*?)</section>', html, re.S)
    faq_vis = [re.sub(r'<[^>]+>', '', q).strip() for q in re.findall(r'<summary>(.*?)</summary>', faq_sec.group(1), re.S)] if faq_sec else []
    faq_ld = None
    for ld in lds:
        try:
            d = json.loads(ld)
            if d.get('@type') == 'FAQPage': faq_ld = [q['name'] for q in d['mainEntity']]
        except Exception: pass
    if faq_ld is not None and faq_vis != faq_ld:
        errors.append('[%s] FAQ 可见(%d) vs LD(%d)' % (label, len(faq_vis), len(faq_ld))); ok = False
    text = re.sub(r'<script.*?</script>', ' ', html, flags=re.S)
    text = re.sub(r'<style.*?</style>', ' ', text, flags=re.S)
    text = re.sub(r'<[^>]+>', ' ', text)
    for b in ['SEO-optimized']:
        if re.search(r'\b' + re.escape(b) + r'\b', text, re.I):
            errors.append('[%s] 敏感词 %s' % (label, b)); ok = False
    ogimg = os.path.join(root, rel, 'og-image.png')
    if not os.path.exists(ogimg): errors.append('[%s] 缺 og-image' % label); ok = False
    print('  %-14s title=%d desc=%d h1=%d words=%d faq=%d ld=%s %s' % (label, len(title), len(desc), len(h1s), words, len(faq_vis), types, 'OK' if ok else 'ISSUE'))

print()
print('=== 3. 相关链抽检（pokedex 4 页：核心相关集 + 无重复 + 单段<=5，2026-09-15 新口径） ===')
REQ = {
    'pokemon': ['pokemon/bulbasaur', 'pokemon/charizard', 'pokemon/pikachu', 'pokemon-type-chart', 'search', 'blog'],
    'pokemon/bulbasaur': ['pokemon', 'pokemon/charizard', 'pokemon/pikachu', 'pokemon-type-chart', 'pokemon-team-picker'],
    'pokemon/charizard': ['pokemon', 'pokemon/bulbasaur', 'pokemon/pikachu', 'pokemon-type-chart', 'pokemon-team-picker'],
    'pokemon/pikachu': ['pokemon', 'pokemon/bulbasaur', 'pokemon/charizard', 'pokemon-type-chart', 'pokemon-team-picker'],
}
for rel, label in NEW:
    html = read(os.path.join(rel, 'index.html'))
    m = re.search(r'<main[^>]*>(.*?)</main>', html, re.S)
    main = re.sub(r'<script.*?</script>', '', m.group(1), flags=re.S) if m else ''
    tg = []
    for h in re.findall(r'<a\s[^>]*href="([^"]*)"[^>]*>', main):
        if h.startswith(('http', 'mailto', '#')):
            continue
        t = os.path.normpath(os.path.join(rel, h.split('#')[0])).replace('\\', '/')
        tg.append(t)
    dups = [t for t in set(tg) if tg.count(t) > 1]
    maxp = 0
    for pm in re.finditer(r'<p[^>]*>.*?</p>', main, re.S):
        c = len(re.findall(r'<a\s[^>]*href="([^"]*)"', pm.group(0)))
        if c > maxp:
            maxp = c
    missing = [d for d in REQ.get(rel, []) if d not in tg]
    n = len(set(t for t in tg if t))
    problems = []
    if dups:
        problems.append('dup ' + ','.join(dups[:3]))
    if maxp > 5:
        problems.append('para links %d' % maxp)
    if missing:
        problems.append('missing ' + ','.join(missing))
    if n > 16:
        problems.append('total links %d' % n)
    if problems:
        errors.append('[相关链] %s %s' % (label, '; '.join(problems)[:80]))
        print('  [差] %-10s %s' % (label, '; '.join(problems)[:80]))
    else:
        print('  [OK] %-10s 相关链完整（%d 条，无重复，单段<=5）' % (label, n))

print()
print('=== 4. sitemap / vercel ===')
try:
    tree = ET.parse(os.path.join(root, 'sitemap.xml'))
    locs = [e.text for e in tree.getroot().iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    for u in ['https://www.random-pokemon-generator.co/pokemon/', 'https://www.random-pokemon-generator.co/pokemon/bulbasaur/', 'https://www.random-pokemon-generator.co/pokemon/charizard/', 'https://www.random-pokemon-generator.co/pokemon/pikachu/']:
        if u not in locs: errors.append('[sitemap] 缺 %s' % u)
    print('  sitemap urls:', len(locs))
except Exception as ex: errors.append('[sitemap] %s' % ex)
try:
    vj = json.loads(read('vercel.json'))
    sources = [r['source'] for r in vj['redirects']]
    if '/pokemon/index.html' not in sources or '/pokemon/:name/index.html' not in sources:
        errors.append('[vercel] 缺 pokedex redirect')
    print('  vercel redirects:', len(sources))
except Exception as ex: errors.append('[vercel] %s' % ex)

print()
print('=== 5. AI 词 ===')
AI = ['additionally','moreover','furthermore','unlock','seamless','testament','vibrant','boast','delve','pivotal','landscape','journey','empower','tapestry','game-changer','leverage','elevate','foster','underscore','enduring','breathtaking','nestled','It\'s not just']
hits = {}
for rel, label in NEW:
    txt = read(os.path.join(rel, 'index.html'))
    txt = re.sub(r'<script.*?</script>', ' ', txt, flags=re.S)
    txt = re.sub(r'<[^>]+>', ' ', txt)
    low = txt.lower()
    for w in AI:
        c = len(re.findall(r'\b' + re.escape(w) + r'\b', low))
        if c: hits[w] = hits.get(w, 0) + c
print('  AI 词命中:', hits if hits else 'NONE')
for w, c in hits.items():
    for rel, label in NEW:
        txt = read(os.path.join(rel, 'index.html'))
        if re.search(r'\b' + re.escape(w) + r'\b', txt, re.I):
            for m in re.finditer(r'.{50}' + re.escape(w) + r'.{30}', txt, re.I):
                print('   [%s] ...%s...' % (label, m.group(0).replace('\n', ' ')[:130]))
            break

print()
print('==== RESULT ====')
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors: print('  !!', e)
else:
    print('ALL CHECKS PASSED')
