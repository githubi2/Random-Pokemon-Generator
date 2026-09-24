#!/usr/bin/env python
# kimi-verify-pokedex-wave1: wave-1 7 pages vertical + full-site regression
import re, io, glob, os, json, xml.etree.ElementTree as ET

root = os.path.abspath('.')
errors = []
WAVE1 = ['charmander', 'squirtle', 'eevee', 'gengar', 'mewtwo', 'lucario', 'greninja']
NEW = [('pokemon/' + n, n) for n in WAVE1]
TOOLS = ['', 'nuzlocke-generator', 'pokemon-smash-or-pass', 'random-pokemon-generator-wheel', 'whos-that-pokemon',
         'pokemon-team-picker', 'random-pokemon-picker', 'random-pokemon-name-generator', 'random-mega-pokemon-generator',
         'random-shiny-pokemon-generator', 'pokemon-shiny-odds', 'pokemon-nature-chart', 'pokemon-type-chart',
         'pokemon-iv-calculator', 'pokemon-card-generator', 'pokemon-trainer-card-generator', 'search', 'pokemon']
AI = ['additionally', 'moreover', 'furthermore', 'unlock', 'seamless', 'testament', 'vibrant', 'boast', 'delve',
      'pivotal', 'landscape', 'journey', 'empower', 'tapestry', 'game-changer', 'leverage', 'elevate', 'foster',
      'underscore', 'enduring', 'breathtaking', 'nestled', "it's not just"]


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


print('=== 1. full-site words ===')
n_pages = 0
for path in sorted(glob.glob(os.path.join(root, '**', 'index.html'), recursive=True)):
    rel = os.path.relpath(path, root).replace(os.sep, '/')
    if rel.startswith('links/'):
        continue  # noindex partner page (exempt)
    w = word_count(read(path))
    n_pages += 1
    if w < 1200:
        errors.append('[words] %s %d' % (rel, w))
        print('  [BAD] %-42s %d' % (rel, w))
print('  checked %d pages, all >=1200' % n_pages if not errors else '  pages below 1200 found')

print('=== 2. wave-1 page checks ===')
for rel, label in NEW:
    html = read(os.path.join(root, rel, 'index.html'))
    slug = label
    title = re.search(r'<title>([^<]*)</title>', html).group(1)
    desc = re.search(r'<meta name="description" content="([^"]*)"', html).group(1)
    h1s = re.findall(r'<h1[^>]*>(.*?)</h1>', html, re.S)
    canon = re.search(r'<link rel="canonical" href="([^"]*)"', html).group(1)
    exp_canon = 'https://www.random-pokemon-generator.co/pokemon/%s/' % slug
    words = word_count(html)
    ok = True
    if len(title) > 60: errors.append('[%s] title %d' % (label, len(title))); ok = False
    if not (100 <= len(desc) <= 160): errors.append('[%s] desc %d' % (label, len(desc))); ok = False
    if len(h1s) != 1: errors.append('[%s] H1!=1' % label); ok = False
    if canon != exp_canon: errors.append('[%s] canonical %s' % (label, canon)); ok = False
    if words < 1200: errors.append('[%s] words %d' % (label, words)); ok = False
    # LD
    types = []
    for ld in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try:
            types.append(json.loads(ld).get('@type'))
        except Exception as ex:
            errors.append('[%s] LD parse %s' % (label, ex)); ok = False
    need = {'WebPage', 'FAQPage', 'BreadcrumbList', 'Organization', 'WebSite'}
    if set(types) != need: errors.append('[%s] LD types %s' % (label, types)); ok = False
    # FAQ vis == LD
    faq_sec = re.search(r'<section id="faq"[^>]*>(.*?)</section>', html, re.S)
    faq_vis = [re.sub(r'<[^>]+>', '', q).strip() for q in re.findall(r'<summary>(.*?)</summary>', faq_sec.group(1), re.S)] if faq_sec else []
    faq_vis_answers = [re.sub(r'<[^>]+>', '', a).strip() for a in re.findall(r'<details[^>]*>\s*<summary>.*?</summary>\s*<p>(.*?)</p>', faq_sec.group(1), re.S)] if faq_sec else []
    faq_ld = None; faq_ld_a = None
    for ld in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try:
            d = json.loads(ld)
            if d.get('@type') == 'FAQPage':
                faq_ld = [q['name'] for q in d['mainEntity']]
                faq_ld_a = [q['acceptedAnswer']['text'] for q in d['mainEntity']]
        except Exception:
            pass
    if faq_ld is None: errors.append('[%s] no FAQ LD' % label); ok = False
    elif faq_vis != faq_ld:
        errors.append('[%s] FAQ vis(%d)!=LD(%d)' % (label, len(faq_vis), len(faq_ld))); ok = False
    elif faq_ld_a != faq_vis_answers:
        errors.append('[%s] FAQ answers mismatch' % label); ok = False
    if len(faq_vis) < 5: errors.append('[%s] FAQ count %d' % (label, len(faq_vis))); ok = False
    # sensitive & AI words
    text = re.sub(r'<script.*?</script>', ' ', html, flags=re.S)
    text = re.sub(r'<style.*?</style>', ' ', text, flags=re.S)
    text = re.sub(r'<[^>]+>', ' ', text)
    low = text.lower()
    for b in ['seo-optimized']:
        if re.search(r'\b' + re.escape(b) + r'\b', low):
            errors.append('[%s] banned word %s' % (label, b)); ok = False
    for b in AI:
        if re.search(r'\b' + re.escape(b) + r'\b', low):
            errors.append('[%s] AI word %s' % (label, b)); ok = False
    # keywords meta
    if re.search(r'name="keywords"', html): errors.append('[%s] keywords meta' % label); ok = False
    # og image
    if not os.path.exists(os.path.join(root, rel, 'og-image.png')): errors.append('[%s] og-image missing' % label); ok = False
    # details nesting
    depth = 0; maxd = 0
    for m in re.finditer(r'<details|</details>', html):
        depth += 1 if m.group(0) == '<details' else -1
        maxd = max(maxd, depth)
    if maxd > 1: errors.append('[%s] details nesting depth %d' % (label, maxd)); ok = False
    # heading sequence
    hs = re.findall(r'<h([1-6])[^>]*>', html)
    prev = 1
    for h in hs:
        h = int(h)
        if h > prev + 1:
            errors.append('[%s] heading skip %d->%d' % (label, prev, h)); ok = False
            break
        prev = h
    # href rules + broken links
    for href in re.findall(r'href="([^"]+)"', html):
        h = href.split('?')[0].split('#')[0]
        if not h or h.startswith(('http', 'mailto')):
            continue
        if h.endswith(('.css', '.js', '.png', '.svg', '.ico', '.wav', '.xml', '.txt')):
            continue
        if 'index.html' in h:
            errors.append('[%s] index.html in href %s' % (label, href)); ok = False
        if h.startswith('/'):
            errors.append('[%s] absolute href %s' % (label, href)); ok = False
        tgt = os.path.normpath(os.path.join(rel, h))
        cand = os.path.join(root, tgt, 'index.html')
        if not (os.path.exists(cand) or os.path.exists(os.path.join(root, tgt))):
            errors.append('[%s] broken link %s (-> %s)' % (label, href, tgt)); ok = False
    # related-links check (2026-09-15: N×N mesh retired; no dups, <=5 links/para, core set)
    main2 = re.search(r'<main[^>]*>(.*?)</main>', html, re.S).group(1)
    main2 = re.sub(r'<script.*?</script>', '', main2, flags=re.S)
    tg = []
    for h in re.findall(r'<a\s[^>]*href="([^"]*)"[^>]*>', main2):
        if h.startswith(('http', 'mailto', '#')):
            continue
        t = os.path.normpath(os.path.join(rel, h.split('#')[0])).replace('\\', '/')
        tg.append(t)
    dups = [t for t in set(tg) if tg.count(t) > 1]
    maxp = 0
    for pm in re.finditer(r'<p[^>]*>.*?</p>', main2, re.S):
        c = len(re.findall(r'<a\s[^>]*href="([^"]*)"', pm.group(0)))
        if c > maxp:
            maxp = c
    core = sum(1 for key in ['nuzlocke-generator', 'pokemon-team-picker', 'pokemon-type-chart', 'random-pokemon-picker', 'pokemon'] if key in tg)
    if dups: errors.append('[%s] dup targets %s' % (label, dups[:4])); ok = False
    if maxp > 5: errors.append('[%s] para with %d links' % (label, maxp)); ok = False
    if core < 3: errors.append('[%s] core links %d < 3' % (label, core)); ok = False
    print('  %-10s title=%d desc=%d words=%d faq=%d links_ok=%s' % (label, len(title), len(desc), words, len(faq_vis), 'pass' if ok else 'FAIL'))

print('=== 2b. desc & weakness assertions (2026-09-24 fix batch) ===')
# 断言 ④（定形）：弱点三方一致性 = 集合相等 + 计数互证（写死，不留自由发挥）：
#   desc_set = set(description "weak to ..." 列出的类型)
#   card_set = set(弱点卡类型 chips)
#   faq_n    = 全页文本扫描 "n weaknesses" 中的整数 n（不得只扫 FAQ 区块）
#   断言：desc_set == card_set 且 len(card_set) == faq_n
TYPES18 = ['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying',
           'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy']
NUMWORD = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9}
STOPTAIL = ('and', 'the', 'of', 'with', 'to', 'for', 'a', 'but', 'or')
for rel, label in NEW:
    html = read(os.path.join(root, rel, 'index.html'))
    descs = re.findall(r'<meta (?:name|property)="(?:description|og:description|twitter:description)" content="([^"]*)"', html)
    if not descs:
        errors.append('[%s] desc missing' % label)
        continue
    d = descs[0]
    tail = re.sub(r'[."]+$', '', d).split()[-1].lower() if d.split() else ''
    if not d.endswith('.') or tail in STOPTAIL:
        errors.append('[%s] desc tail suspicious: ...%s' % (label, d[-30:]))
    if len(descs) != 3 or len(set(descs)) != 1:
        errors.append('[%s] desc three-place mismatch (%d, %d unique)' % (label, len(descs), len(set(descs))))
    if not (120 <= len(d) <= 160):
        errors.append('[%s] desc len %d not in [120,160]' % (label, len(d)))
    ms = re.search(r'weak to ([^.]+)\.', d)
    desc_set = set(x.strip() for x in re.split(r',\s*|\s+and\s+', ms.group(1))) if ms else set()
    i = html.find('Weakness (2x)')
    j = html.find('</article>', i) if i >= 0 else -1
    seg = html[i:j] if (i >= 0 and j > i) else ''
    card_set = set(x for x in TYPES18 if re.search(r'>\s*' + x + r'\s*<', seg))
    faq_n = None
    for w in re.findall(r'\b([A-Za-z]+|\d+) weaknesses\b', html, re.I):
        v = NUMWORD.get(w.lower()) or (int(w) if w.isdigit() else None)
        if v:
            faq_n = v
            break
    if desc_set != card_set or (faq_n is not None and faq_n != len(card_set)):
        errors.append('[%s] weakness tri-check: desc=%s card=%s faq_n=%s' % (label, sorted(desc_set), sorted(card_set), faq_n))
    else:
        print('  %-10s desc %d-tail OK | 3-place OK | weakness set %s (n=%s) OK' % (label, len(d), sorted(card_set), faq_n))

print('=== 3. sitemap ===')
try:
    tree = ET.parse(os.path.join(root, 'sitemap.xml'))
    locs = [e.text for e in tree.getroot().iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    for n in WAVE1:
        u = 'https://www.random-pokemon-generator.co/pokemon/%s/' % n
        if u not in locs: errors.append('[sitemap] missing %s' % n)
    print('  sitemap urls:', len(locs))
except Exception as ex:
    errors.append('[sitemap] %s' % ex)

print('=== 4. vercel ===')
try:
    vj = json.loads(read('vercel.json'))
    srcs = [r['source'] for r in vj['redirects']]
    if '/pokemon/:name/index.html' not in srcs: errors.append('[vercel] missing species wildcard')
    print('  redirects:', len(srcs))
except Exception as ex:
    errors.append('[vercel] %s' % ex)

print()
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors: print('  !!', e)
else:
    print('ALL CHECKS PASSED')
