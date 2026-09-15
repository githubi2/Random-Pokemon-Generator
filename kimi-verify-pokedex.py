#!/usr/bin/env python
# kimi-verify-pokedex: 4 新页专项 + 全站词数 + 矩阵 + SA + AI 词
import re, io, glob, os, json, xml.etree.ElementTree as ET

root = os.path.abspath('.')
errors = []
NEW = [('pokemon', 'hub'), ('pokemon/bulbasaur', 'bulbasaur'), ('pokemon/charizard', 'charizard'), ('pokemon/pikachu', 'pikachu'),
    ('eevee-evolutions', 'eevee-evolutions')]

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
    expect = 'https://www.random-pokemon-generator.co/' + rel.strip('/') + ('/' if rel else '/')
    if canon != expect:
        errors.append('[%s] canonical %s (expect %s)' % (label, canon, expect)); ok = False
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
print('=== 6. nav 自指项（2026-09-15 规则 14：href="."=0 + 自指条目 ./+高亮 恰 1 个） ===')
NAV_SELF_PAGES = [
    'index.html', 'nuzlocke-generator/index.html', 'pokemon-smash-or-pass/index.html',
    'random-pokemon-generator-wheel/index.html', 'whos-that-pokemon/index.html',
    'pokemon-team-picker/index.html', 'random-pokemon-picker/index.html',
    'pokemon-type-chart/index.html', 'random-mega-pokemon-generator/index.html',
    'pokemon-shiny-odds/index.html', 'random-pokemon-type-generator/index.html',
    'random-legendary-pokemon-generator/index.html', 'pokemon/index.html',
    'blog/index.html', 'about/index.html', 'privacy-policy/index.html', 'terms-of-use/index.html',
]
dot_pages = []
for path in sorted(glob.glob(os.path.join(root, '**', 'index.html'), recursive=True)):
    if 'href="."' in read(path):
        dot_pages.append(os.path.relpath(path, root).replace(os.sep, '/'))
if dot_pages:
    errors.append('[nav] href="." 残留: %s' % ', '.join(dot_pages))
    print('  [差] href="." 残留:', ', '.join(dot_pages))
else:
    print('  href="." 全站 = 0')
for rel in NAV_SELF_PAGES:
    fp = os.path.join(root, rel)
    frag = '<a href="#generator" class="nav-link nav-link-active">' if rel == 'index.html' else '<a href="./" class="nav-link nav-link-active">'
    html = read(fp)
    n = html.count('nav-link-active')
    if frag in html and n == 1:
        print('  [OK] %s' % rel)
    else:
        errors.append('[nav] %s 自指条目异常 (active=%d)' % (rel, n))
        print('  [差] %-44s active=%d' % (rel, n))

print()
print('=== 7. FAQ details nesting（2026-09-15 修复沉淀：物种页第 6 条曾嵌在第 5 条内） ===')
nest_bad = []
for path in sorted(glob.glob(os.path.join(root, '**', 'index.html'), recursive=True)):
    html = read(path)
    depth = 0; issues = 0
    for m in re.finditer(r'<details\b|</details>', html):
        if not m.group(0).startswith('</'):
            depth += 1
            if depth > 1: issues += 1
        else:
            depth -= 1
            if depth < 0: issues += 1
    if depth != 0 or issues:
        nest_bad.append((os.path.relpath(path, root).replace(os.sep, '/'), depth, issues))
if nest_bad:
    for rel2, d2, i2 in nest_bad:
        errors.append('[details] %s depth=%d issues=%d' % (rel2, d2, i2))
        print('  [差] %-44s depth=%d issues=%d' % (rel2, d2, i2))
else:
    print('  全站 details 嵌套 = OK (%d pages)' % len(glob.glob(os.path.join(root, '**', 'index.html'), recursive=True)))

print()
print('=== 8. FAQ 重复度（2026-09-15 沉淀：pikachu/bulbasaur 第 4~6 条曾同页事实重复） ===')
# 严格规则（errors，三信号经新旧版回测校准）：
#   A) 答案 Jaccard >= 0.40（同答重复，如 bulbasaur 旧 0.56）
#   B) 答案间最长逐字连续段 >= 10 词
#   C) 问句词集 Jaccard >= 0.6 且答案 Jaccard >= 0.25（近同问重复，如 pikachu 旧 0.67/0.30）
# 另有 [FAQ vs 正文] >= 12 词逐字段：仅打印复核清单（不阻断；存量项待内容批清理）
STOP8 = set('the a an is it and or of to in for with that this its as on at by be are was from you your what does do how why which who when where'.split())
def _st8(s):
    out = set()
    for w in re.findall(r"[a-z]+", s.lower()):
        if len(w) < 3 or w in STOP8: continue
        if w.endswith('ies'): w = w[:-3] + 'y'
        elif w.endswith('s') and len(w) > 3: w = w[:-1]
        out.add(w)
    return out
def _jac8(a, b):
    A, B = _st8(a), _st8(b)
    return len(A & B) / max(1, len(A | B))
def _lcs8(a, b, capB=2400):
    A = re.findall(r"[a-z']+", a.lower())[:240]
    B = re.findall(r"[a-z']+", b.lower())[:capB]
    best = 0; prev = [0] * (len(B) + 1)
    for i in range(1, len(A) + 1):
        cur = [0] * (len(B) + 1)
        for j in range(1, len(B) + 1):
            if A[i-1] == B[j-1]:
                cur[j] = prev[j-1] + 1
                if cur[j] > best: best = cur[j]
        prev = cur
    return best
_dup8 = []; _warn8 = []
for path in sorted(glob.glob(os.path.join(root, '**', 'index.html'), recursive=True)):
    html = read(path)
    rel8 = os.path.relpath(path, root).replace(os.sep, '/')
    sec8 = re.search(r'<section id="faq"[^>]*>(.*?)</section>', html, re.S)
    if not sec8: continue
    items8 = [(re.sub(r'<[^>]+>', ' ', q).strip(), re.sub(r'<[^>]+>', ' ', a).strip())
              for q, a in re.findall(r'<summary>(.*?)</summary>\s*<p>(.*?)</p>', sec8.group(1), re.S)]
    for i in range(len(items8)):
        for j in range(i + 1, len(items8)):
            q1, a1 = items8[i]; q2, a2 = items8[j]
            qj = _jac8(q1, q2); aj = _jac8(a1, a2); lw = _lcs8(a1, a2)
            if aj >= 0.40 or lw >= 10 or (qj >= 0.6 and aj >= 0.25):
                _dup8.append((rel8, '%d~%d' % (i + 1, j + 1), round(qj, 2), round(aj, 2), lw))
    body8 = re.sub(r'<script[\s\S]*?</script>', ' ', html)
    body8 = re.sub(r'<style[\s\S]*?</style>', ' ', body8)
    body8 = re.sub(r'<details[\s\S]*?</details>', ' ', body8)
    bo8 = re.findall(r"[a-z']+", re.sub(r'<[^>]+>', ' ', body8).lower())
    g8 = set(tuple(bo8[k:k + 8]) for k in range(max(0, len(bo8) - 7)))
    for i8, (q1, a1) in enumerate(items8, 1):
        wa = re.findall(r"[a-z']+", a1.lower())
        if any(tuple(wa[k:k + 8]) in g8 for k in range(max(0, len(wa) - 7))):
            lw2 = _lcs8(a1, ' '.join(bo8))
            if lw2 >= 12:
                _warn8.append((rel8, i8, lw2))
if _dup8:
    for rel8, pj, qj, aj2, lw in _dup8:
        errors.append('[faq-dup] %s %s qj=%.2f aj=%.2f lcs=%d' % (rel8, pj, qj, aj2, lw))
        print('  [重复] %-46s %-16s qj=%.2f aj=%.2f lcs=%d' % (rel8, pj, qj, aj2, lw))
else:
    print('  全站 FAQ 重复度 = OK')
if _warn8:
    print('  [FAQ vs 正文 ≥12 词逐字段：复核清单（不阻断）] %d 处' % len(_warn8))
    for rel8, i8, lw2 in _warn8[:30]:
        print('     %-46s #%d lcs=%d' % (rel8, i8, lw2))

print()
print('=== 9. 图片本地化（2026-09-15：sprite 不再直连 raw.githubusercontent） ===')
_ext9 = []
_miss9 = []
for path in sorted(glob.glob(os.path.join(root, '**', 'index.html'), recursive=True)):
    html = read(path)
    rel9 = os.path.relpath(path, root).replace(os.sep, '/')
    for m in re.finditer(r'<img[^>]+src="([^"]+)"', html):
        src = m.group(1)
        if src.startswith('http'):
            _host9 = src.split('/')[2] if '//' in src else ''
            if any(h in _host9 for h in ('stork.ai', 'startupinspire.com', 'productwatch.io')):
                continue  # 目录验证徽章（第三方动态 SVG，有意保留）
            _ext9.append((rel9, src[:90]))
        elif not src.startswith('data:'):
            if not os.path.exists(os.path.join(os.path.dirname(path), src)):
                _miss9.append((rel9, src))
if _ext9 or _miss9:
    for rel9, src in _ext9:
        errors.append('[ext-img] %s %s' % (rel9, src))
        print('  [外链图] %-46s %s' % (rel9, src))
    for rel9, src in _miss9:
        errors.append('[missing-img] %s %s' % (rel9, src))
        print('  [缺文件] %-46s %s' % (rel9, src))
else:
    print('  全站 img 全部本地且存在 = OK')

print()
print('==== RESULT ====')
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors: print('  !!', e)
else:
    print('ALL CHECKS PASSED')
