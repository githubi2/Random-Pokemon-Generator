# -*- coding: utf-8 -*-
"""图鉴页数口径体检：把"页面上说现在有多少个物种页"的句子全站抓出来，与 pokemon/ 目录实际数对账。

只读，不改任何文件。
用法：  python check-counts.py            # 看报告
        python check-counts.py --strict   # 有过期数字则退出码 1（发布前必跑）

什么时候必须跑：任何一次新增/删除物种页的批次，发布前。
数字会过期的位置只有两类，脚本盯这两类：
  ① 断言"线上有多少页"的句子（英日各说一次，含结构化数据里的那一份）
  ② 全国图鉴总数 1,025（DEX_TOTAL，出新世代时才改，改完同步这里）
"""
import os, re, sys, glob

ROOT = os.path.dirname(os.path.abspath(__file__))
SP = os.path.join(ROOT, "pokemon")
ACTUAL = len([d for d in os.listdir(SP) if os.path.isdir(os.path.join(SP, d))])
DEX_TOTAL = 1025

NUMW = {"ten": 10, "eleven": 11, "twelve": 12, "fifteen": 15, "twenty": 20,
        "twenty-five": 25, "thirty": 30, "thirty-five": 35, "forty": 40,
        "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "hundred": 100}

CLAIMS = [
    ("EN are-live",        re.compile(r"\b(\d{1,4})\s+are\s+live\b", re.I)),
    ("EN runs-N",          re.compile(r"\bruns\s+([a-z\-]+|\d{1,4})\s+species\b", re.I)),
    ("EN N-species-pages", re.compile(r"\b([a-z\-]+|\d{1,4})\s+(?:in-depth\s+)?species\s+pages?\b", re.I)),
    ("JA N種が公開",        re.compile(r"(\d{1,4})\s*種が公開")),
]


def scan_files():
    out = []
    for p in glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True):
        rel = os.path.relpath(p, ROOT).replace("\\", "/")
        if rel.split("/")[0].startswith(("_", ".")) or "/_" in rel:
            continue
        out.append((rel, p))
    rp = os.path.join(ROOT, "README.md")
    if os.path.exists(rp):
        out.append(("README.md", rp))
    return sorted(out)


def main():
    hits = []
    for rel, path in scan_files():
        h = open(path, encoding="utf-8", errors="replace").read()
        for name, rx in CLAIMS:
            for m in rx.finditer(h):
                raw = m.group(1).lower()
                num = int(raw) if raw.isdigit() else NUMW.get(raw)
                if num is None:
                    continue
                line = h.count("\n", 0, m.start()) + 1
                snip = re.sub(r"<[^>]+>", "", h[max(0, m.start() - 45):m.end() + 55])
                hits.append((rel, line, name, num, re.sub(r"\s+", " ", snip).strip()))

    sm = open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8").read()
    en_sp = len(re.findall(r"<loc>https://www\.random-pokemon-generator\.co/pokemon/[^<]+/</loc>", sm))
    ja_sp = len(re.findall(r"<loc>https://www\.random-pokemon-generator\.co/ja/pokemon/[^<]+/</loc>", sm))
    dex_refs = sum(open(p, encoding="utf-8", errors="replace").read().count("1,025")
                   for _, p in scan_files())

    print("真相源① 物种页目录数       = %d" % ACTUAL)
    print("真相源① 英文物种页 URL 数  = %d   （两数必须相等）" % en_sp)
    print("真相源① 日文物种页 URL 数  = %d" % ja_sp)
    print("真相源② 全国图鉴总数       = %d   （出新世代才改）" % DEX_TOTAL)
    print("参考    全站提到 1,025 次数 = %d   （固定数字，不参与活页数对账）" % dex_refs)
    print()

    bad = [x for x in hits if x[3] != ACTUAL]
    print("【断言活页数的句子】共 %d 处，其中 %d 处过期" % (len(hits), len(bad)))
    for rel, line, name, num, snip in hits:
        print("  %s %-38s 行%-4s %-18s = %-4s | %s"
              % ("x" if num != ACTUAL else "v", rel, line, name, num, snip[:70]))

    problems = bool(bad) or en_sp != ACTUAL or ja_sp != ACTUAL
    print()
    if en_sp != ACTUAL:
        print("x 目录数与 sitemap 不一致：%d vs %d" % (ACTUAL, en_sp))
    if ja_sp != ACTUAL:
        print("x 日文 sitemap 条数与目录不一致：%d vs %d" % (ja_sp, ACTUAL))
    print("x 有过期数字，发布前必须清零。" if problems else "v 全部与实际情况一致。")
    return 1 if ("--strict" in sys.argv and problems) else 0


if __name__ == "__main__":
    sys.exit(main())
