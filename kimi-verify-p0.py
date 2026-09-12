#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P0 acceptance for the two new tool pages + site-wide regression."""
import io, os, re, json

ROOT = r"E:\pokemen\Random-Pokemon-Generator"
PASS, FAIL = [], []

def ok(name, cond, info=""):
    (PASS if cond else FAIL).append((name, info))
    print(("PASS " if cond else "FAIL ") + name + ((" | " + str(info)) if info else ""))

AI = ['additionally','moreover','furthermore','unlock','seamless','testament','vibrant','boast','delve','pivotal','landscape','journey','empower','tapestry','game-changer','leverage','elevate','foster','underscore','enduring','breathtaking','nestled',"It's not just"]

def word_count(html):
    m = re.search(r'<main[^>]*>(.*?)</main>', html, re.S)
    if not m:
        return 0
    body = re.sub(r'<script.*?</script>', ' ', m.group(1), flags=re.S)
    body = re.sub(r'<style.*?</style>', ' ', body, flags=re.S)
    body = re.sub(r'<[^>]+>', ' ', body)
    body = re.sub(r'&[a-z]+;', ' ', body)
    return len(re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", body))

def norm(t):
    return re.sub(r"\s+", " ", t.replace("&amp;", "&").replace("&#39;", "'").strip())

PAGES = [
    ("random-pokemon-type-generator", "Random Pokemon Type Generator"),
    ("random-legendary-pokemon-generator", "Random Legendary Pokemon Generator"),
]

for slug, name in PAGES:
    d = os.path.join(ROOT, slug)
    hp = os.path.join(d, "index.html")
    html = io.open(hp, encoding="utf-8").read()
    url = "https://www.random-pokemon-generator.co/%s/" % slug
    print("\n=== %s ===" % slug)

    t = re.search(r"<title>(.*?)</title>", html).group(1)
    ok("title <=60", len(t) <= 60, "%d" % len(t))
    ok("title has keyword", "Random" in t and "Generator" in t)
    dsc = re.search(r'<meta name="description" content="(.*?)"', html).group(1)
    ok("desc 100-160", 100 <= len(dsc) <= 160, "%d" % len(dsc))
    ok("canonical", ('rel="canonical" href="%s"' % url) in html)
    ok("og:url", ('property="og:url" content="%s"' % url) in html)
    ok("og:image", ('property="og:image" content="%sog-image.png"' % url) in html)
    ok("twitter:image", ('name="twitter:image" content="%sog-image.png"' % url) in html)

    h1s = re.findall(r"<h1[^>]*>(.*?)</h1>", html, re.S)
    ok("exactly 1 h1", len(h1s) == 1, h1s[0] if h1s else "")
    ok("h1 = name", h1s and norm(h1s[0]) == name)

    wc = word_count(html)
    ok("main words >=1200", wc >= 1200, wc)

    # heading order
    lv = [int(m.group(1)) for m in re.finditer(r"<h([1-4])[^>]*>", html)]
    skip = any(lv[i + 1] - lv[i] > 1 for i in range(len(lv) - 1))
    ok("heading order no skip", not skip, lv[:12])

    # JSON-LD
    blocks = re.findall(r'<script type="application/ld\+json">\s*(\{.*?\})\s*</script>', html, re.S)
    ok("5 LD blocks", len(blocks) == 5, len(blocks))
    types = set()
    parsed = {}
    for b in blocks:
        try:
            j = json.loads(b)
            types.add(j.get("@type"))
            parsed[j.get("@type")] = j
        except Exception as e:
            ok("LD json parse", False, str(e)[:80])
    want = {"SoftwareApplication", "BreadcrumbList", "FAQPage", "Organization", "WebSite"}
    ok("LD types", types == want, sorted(types))
    sa = parsed.get("SoftwareApplication", {})
    ok("LD app url", sa.get("url") == url)
    bc = parsed.get("BreadcrumbList", {})
    items = bc.get("itemListElement", [])
    ok("LD breadcrumb", len(items) == 2 and items[-1].get("item") == url)

    # FAQ visible vs LD
    faq = re.search(r'<section id="faq".*?</section>', html, re.S).group(0)
    ok("faq details count 6", faq.count("<details") == 6, faq.count("<details"))
    nested = re.search(r"<details[^>]*>(?:(?!</?details)[\s\S])*<details", faq)
    ok("faq no nesting", nested is None)
    vis = re.findall(r"<details[^>]*>\s*<summary>(.*?)</summary>\s*<p>(.*?)</p>\s*</details>", faq, re.S)
    ok("faq pairs 6", len(vis) == 6, len(vis))
    ld_faq = parsed.get("FAQPage", {}).get("mainEntity", [])
    ok("ld faq 6", len(ld_faq) == 6)
    for i, (q, a) in enumerate(vis):
        if i >= len(ld_faq):
            break
        ok("faq %d q match" % (i + 1), norm(q) == norm(ld_faq[i].get("name", "")))
        ok("faq %d a match" % (i + 1), norm(a) == norm(ld_faq[i].get("acceptedAnswer", {}).get("text", "")))

    # links resolve
    hrefs = re.findall(r'href="([^"]+)"', html)
    bad = []
    for h in hrefs:
        if h.startswith(("http://", "https://", "#", "mailto:")):
            continue
        if "index.html" in h:
            bad.append(h + " (index.html)")
            continue
        h_clean = h.split("?")[0]
        target = os.path.normpath(os.path.join(d, h_clean))
        if h_clean.endswith("/"):
            t2 = os.path.join(target, "index.html")
            if not os.path.exists(t2):
                bad.append(h)
        else:
            if not os.path.exists(target):
                bad.append(h)
    ok("all internal links resolve", not bad, bad[:6])

    # no 'free' + AI words in visible text
    body = re.sub(r"<script[\s\S]*?</script>", " ", html)
    body = re.sub(r"<style[\s\S]*?</style>", " ", body)
    text = re.sub(r"<[^>]+>", " ", body)
    hits = [w for w in AI if w.lower() in text.lower()]
    ok("no AI words", not hits, hits)
    ok("no 'free'", not re.search(r"\bfree\b", text, re.I))

    # assets + js
    ok("og-image 1200x630", os.path.exists(os.path.join(d, "og-image.png")))
    from PIL import Image
    im = Image.open(os.path.join(d, "og-image.png"))
    ok("og size", im.size == (1200, 630), im.size)
    jsf = "type-generator.js" if "type" in slug else "legendary-generator.js"
    js = io.open(os.path.join(d, jsf), encoding="utf-8").read()
    ok("js no placeholders", "__TYPES_BLOCK__" not in js and "__CHART_BLOCK__" not in js)
    ok("js ES5 (no arrow)", "=>" not in js)
    ok("js has TYPES", "var TYPES = [" in js)
    if "type-generator" in jsf:
        ok("js has TYPE_CHART", "var TYPE_CHART = {" in js)
    ok("js no 'free'", not re.search(r"\bfree\b", js, re.I))
    ok("scoped style present", (".tw-hub" in html) if "type-generator" in jsf else (".lgx-card" in html))
    ok("nav self entry", ('<li><a href="./" class="nav-link nav-link-active">%s</a></li>' % name) in html)

# ---------- site-wide ----------
print("\n=== SITE-WIDE ===")
pages = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    if "index.html" in filenames and not os.path.relpath(dirpath, ROOT).startswith("_"):
        pages.append(os.path.join(dirpath, "index.html"))
ok("page count 31", len(pages) == 31, len(pages))

missing_nav = []
for hp in pages:
    s = io.open(hp, encoding="utf-8").read()
    c1 = s.count(">Random Pokemon Type Generator</a>")
    c2 = s.count(">Random Legendary Pokemon Generator</a>")
    if c1 < 2 or c2 < 2:
        missing_nav.append((os.path.relpath(hp, ROOT), c1, c2))
ok("every page has both new tools (>=2)", not missing_nav, missing_nav[:8])

# sitemap
sp = io.open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8").read()
locs = re.findall(r"<loc>(.*?)</loc>", sp)
ok("sitemap 31 urls", len(locs) == 31, len(locs))
ok("sitemap new urls", "random-pokemon-type-generator/" in sp and "random-legendary-pokemon-generator/" in sp)
unresolved = []
for l in locs:
    p = l.replace("https://www.random-pokemon-generator.co/", "")
    tgt = os.path.join(ROOT, p, "index.html")
    if not os.path.exists(tgt):
        unresolved.append(l)
ok("sitemap urls resolve on disk", not unresolved, unresolved[:5])

# vercel
vj = json.loads(io.open(os.path.join(ROOT, "vercel.json"), encoding="utf-8").read())
vs = json.dumps(vj)
ok("vercel new redirects", "random-pokemon-type-generator" in vs and "random-legendary-pokemon-generator" in vs)

# README
rd = io.open(os.path.join(ROOT, "README.md"), encoding="utf-8").read()
ok("readme rows", "| 🎡 Type Generator |" in rd and "| 🌟 Legendary Generator |" in rd)
ok("readme tree", "├── random-pokemon-type-generator/" in rd and "├── random-legendary-pokemon-generator/" in rd)

# word regression across site (info only for old pages, hard for new)
low = []
for hp in pages:
    s = io.open(hp, encoding="utf-8").read()
    wc = word_count(s)
    if wc < 1200:
        low.append((os.path.relpath(hp, ROOT), wc))
print("info: pages under 1200 words:", low if low else "none")

print("\n=====================================")
print("PASSED: %d | FAILED: %d" % (len(PASS), len(FAIL)))
if FAIL:
    for n, i in FAIL:
        print("  FAILED:", n, i)
    print("RESULT: FAILURES PRESENT")
else:
    print("RESULT: ALL CHECKS PASSED")
