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
    for b in ['free', 'seo-optimized']:
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
    # matrix coverage in main
    main = re.search(r'<main[^>]*>(.*?)</main>', html, re.S).group(1)
    main = re.sub(r'<script.*?</script>', '', main, flags=re.S)
    hrefs = set(re.findall(r'href="([^"]*)"', main))
    missing = []
    for d in TOOLS:
        key = d + '/'
        if d == '':
            okd = any(h in ('../../', '/') for h in hrefs)
        else:
            okd = any(key in h for h in hrefs)
        if not okd: missing.append(d or 'HOME')
    if missing: errors.append('[%s] matrix missing %s' % (label, ','.join(missing))); ok = False
    print('  %-10s title=%d desc=%d words=%d faq=%d links_ok=%s' % (label, len(title), len(desc), words, len(faq_vis), 'pass' if ok else 'FAIL'))

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
