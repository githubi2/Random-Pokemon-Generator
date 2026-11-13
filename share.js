/* ============================================================
   Share panel — one file shared by every tool page.

     window.RPShare.open({ text: 'The Pokemon wheel decided: X!', url: 'https://…' });

   text  = the message without the link (the link is added per platform)
   url   = the link that reproduces the current result
   title = optional, defaults to document.title

   No dependencies, no network calls. Icons are inlined so the
   panel works with a single script tag.
   ============================================================ */
(function () {
  'use strict';

  var LANG = /^ja/i.test(document.documentElement.lang || 'en') ? 'ja' : 'en';

  var STR = {
    en: {
      title: 'Share this result',
      more: 'More apps…',
      copy: 'Copy',
      close: 'Close',
      note: 'Opens in a new tab',
      copied: 'Copied!',
      longCopied: 'Long link copied — paste it into the post.',
      manualTitle: 'Copy your share text',
      manualNote: 'Auto-copy blocked by this browser — select and copy manually'
    },
    ja: {
      title: 'この結果をシェア',
      more: 'その他のアプリ…',
      copy: 'コピー',
      close: '閉じる',
      note: '新しいタブで開きます',
      copied: 'コピーしました',
      longCopied: '長いリンクはコピーしました — 貼り付けてください',
      manualTitle: 'シェア文をコピー',
      manualNote: 'ブラウザが自動コピーをブロックしました — 選択して手動でコピーしてください'
    }
  };

  var ORDER = {
    en: ['x', 'facebook', 'reddit', 'whatsapp', 'telegram', 'pinterest'],
    ja: ['x', 'line', 'facebook', 'reddit', 'whatsapp', 'telegram']
  };

  var LABEL = {
    x: 'X',
    facebook: 'Facebook',
    reddit: 'Reddit',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    pinterest: 'Pinterest',
    line: 'LINE'
  };

  /* simple-icons paths, inlined (24x24 grid, single colour) */
  var PATH = {"x": "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z", "facebook": "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z", "reddit": "M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z", "whatsapp": "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z", "telegram": "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z", "pinterest": "M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z", "line": "M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"};

  var LONG_URL = 1400;
  var state = { text: '', url: '', title: '', image: '' };
  var built = false;
  var overlay, card, previewEl, noteEl, moreBtn, copyBtn, copyLbl, manual;

  function t(key) { return STR[LANG][key]; }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function svg(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + PATH[name] + '"/></svg>';
  }

  function ogImage() {
    var m = document.querySelector('meta[property="og:image"]');
    return m ? m.getAttribute('content') : '';
  }

  /* ---------- platform links ---------- */
  function href(slug, text, url, long) {
    var u = encodeURIComponent(url);
    var tx = encodeURIComponent(text);
    if (slug === 'x') {
      return long ? 'https://x.com/intent/post?text=' + tx
                  : 'https://x.com/intent/post?text=' + tx + '&url=' + u;
    }
    if (slug === 'facebook') {
      return long ? 'https://www.facebook.com/' : 'https://www.facebook.com/sharer/sharer.php?u=' + u;
    }
    if (slug === 'reddit') {
      return long ? 'https://www.reddit.com/submit?title=' + tx
                  : 'https://www.reddit.com/submit?url=' + u + '&title=' + tx;
    }
    if (slug === 'whatsapp') {
      return 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url);
    }
    if (slug === 'telegram') {
      return 'https://t.me/share/url?url=' + u + '&text=' + tx;
    }
    if (slug === 'pinterest') {
      return long ? 'https://www.pinterest.com/' : 'https://www.pinterest.com/pin/create/button/?url=' + u + '&media=' + encodeURIComponent(ogImage()) + '&description=' + tx;
    }
    if (slug === 'line') {
      return 'https://social-plugins.line.me/lineit/share?url=' + u + '&text=' + tx;
    }
    return url;
  }

  /* ---------- styles ---------- */
  var CSS = [
    '.rp-overlay{position:fixed;inset:0;z-index:80;background:rgba(18,20,15,.72);display:flex;align-items:center;justify-content:center;padding:16px;}',
    '.rp-overlay[hidden]{display:none;}',
    '.rp-card{max-width:520px;width:100%;background:var(--surface,#fff);border:1px solid var(--line-2,#d8d2c2);border-radius:16px;padding:24px;',
    'box-shadow:0 28px 54px -28px rgba(28,34,24,.28);max-height:92vh;overflow-y:auto;scrollbar-width:none;}',
    '.rp-card::-webkit-scrollbar{display:none;}',
    '.rp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}',
    '.rp-bar{display:block;width:20px;height:4px;border-radius:2px;background:#e4ff4f;margin-bottom:10px;}',
    '.rp-h3{font-family:var(--font-display,Inter,sans-serif);font-size:23px;font-weight:900;letter-spacing:-.02em;margin:0;color:var(--ink,#12140f);}',
    '.rp-x{border:0;background:none;font:600 17px/1 var(--font-body,Inter,sans-serif);color:var(--text-3,#70776e);cursor:pointer;padding:6px 8px;border-radius:10px;margin:-2px -4px 0 0;}',
    '.rp-x:hover{color:var(--ink,#12140f);background:var(--surface-2,#f5f2ea);}',
    '.rp-preview{margin:16px 0;padding:10px 12px;border:1px solid var(--line,#e9e5d9);border-radius:12px;background:var(--surface-2,#f5f2ea);',
    'font:400 13px/1.55 var(--font-body,Inter,sans-serif);color:var(--text-2,#5b6259);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.rp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}',
    '.rp-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;padding:17px 8px 14px;border:1px solid var(--line-2,#d8d2c2);',
    'border-radius:14px;background:var(--surface,#fff);color:var(--ink,#12140f);font:600 12.5px/1.2 var(--font-body,Inter,sans-serif);',
    'text-decoration:none;transition:background .15s ease,border-color .15s ease,transform .15s ease;}',
    '.rp-tile:hover,.rp-tile:focus-visible{background:var(--surface-2,#f5f2ea);border-color:var(--ink,#12140f);transform:translateY(-1px);}',
    '.rp-tile svg{width:22px;height:22px;display:block;fill:currentColor;}',
    '.rp-more{width:100%;display:none;align-items:center;justify-content:center;gap:9px;margin-bottom:12px;padding:13px 16px;border:1px solid var(--line-2,#d8d2c2);',
    'border-radius:14px;background:var(--surface,#fff);font:600 13.5px/1.2 var(--font-body,Inter,sans-serif);color:var(--ink,#12140f);cursor:pointer;}',
    '.rp-more:hover{background:var(--surface-2,#f5f2ea);}',
    '.rp-more svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;}',
    '.rp-copy{width:100%;margin-top:16px;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--line-2,#d8d2c2);border-radius:14px;',
    'background:var(--surface,#fff);padding:13px 18px;font:500 13.5px/1.2 var(--font-body,Inter,sans-serif);color:var(--ink,#12140f);cursor:pointer;}',
    '.rp-copy:hover{background:var(--surface-2,#f5f2ea);}',
    '.rp-copy svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;}',
    '.rp-foot{display:flex;align-items:center;justify-content:center;margin-top:10px;font:400 12px/1.5 var(--font-body,Inter,sans-serif);color:var(--text-3,#70776e);text-align:center;}',
    '.rp-manual-card{max-width:520px;width:100%;background:var(--surface,#fff);border:1px solid var(--line-2,#d8d2c2);border-radius:16px;padding:24px;}',
    '.rp-manual-meta{font:400 12.5px/1.5 var(--font-body,Inter,sans-serif);color:var(--text-3,#70776e);margin-bottom:6px;}',
    '.rp-manual-ta{display:block;width:100%;margin:10px 0 14px;padding:10px 12px;font:500 12px/1.6 var(--font-body,Inter,sans-serif);color:var(--ink,#12140f);',
    'border:1px solid var(--line-2,#d8d2c2);border-radius:12px;background:var(--surface,#fff);resize:vertical;}',
    '@media(max-width:560px){',
    '.rp-overlay{padding:12px;align-items:flex-end;}',
    '.rp-card{border-radius:18px;padding:20px 18px 22px;max-height:94vh;}',
    '.rp-h3{font-size:21px;}',
    '.rp-tile{padding:15px 6px 12px;}',
    '}'
  ].join('');

  /* ---------- build ---------- */
  function build() {
    var style = document.createElement('style');
    style.id = 'rp-share-css';
    style.textContent = CSS;
    document.head.appendChild(style);

    var tiles = '';
    for (var i = 0; i < ORDER[LANG].length; i++) {
      var slug = ORDER[LANG][i];
      tiles += '<a class="rp-tile" data-p="' + slug + '" href="#" target="_blank" rel="noopener" aria-label="' +
        LABEL[slug] + '">' + svg(slug) + '<span>' + LABEL[slug] + '</span></a>';
    }

    var shareIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v11"/><path d="M7.5 8 12 3.5 16.5 8"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/></svg>';
    var copyIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';

    overlay = document.createElement('div');
    overlay.className = 'rp-overlay';
    overlay.id = 'rp-share-overlay';
    overlay.setAttribute('hidden', '');
    overlay.innerHTML =
      '<div class="rp-card" role="dialog" aria-modal="true" aria-labelledby="rp-title">' +
        '<div class="rp-head"><div><span class="rp-bar"></span><h3 class="rp-h3" id="rp-title">' + t('title') + '</h3></div>' +
        '<button type="button" class="rp-x" data-rp="close" aria-label="' + t('close') + '">✕</button></div>' +
        '<p class="rp-preview" id="rp-preview"></p>' +
        '<button type="button" class="rp-more" data-rp="more">' + shareIcon + '<span>' + t('more') + '</span></button>' +
        '<div class="rp-grid" id="rp-grid">' + tiles + '</div>' +
        '<button type="button" class="rp-copy" data-rp="copy">' + copyIcon + '<span id="rp-copy-lbl">' + t('copy') + '</span></button>' +
        '<div class="rp-foot" id="rp-foot" aria-live="polite">' + t('note') + '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    manual = document.createElement('div');
    manual.className = 'rp-overlay';
    manual.id = 'rp-copy-overlay';
    manual.setAttribute('hidden', '');
    manual.innerHTML =
      '<div class="rp-manual-card" role="dialog" aria-modal="true">' +
        '<p class="rp-manual-meta">' + t('manualNote') + '</p>' +
        '<h3 class="rp-h3">' + t('manualTitle') + '</h3>' +
        '<textarea class="rp-manual-ta" id="rp-manual-ta" rows="5" readonly></textarea>' +
        '<button type="button" class="rp-copy" data-rp="mclose">' + t('close') + '</button>' +
      '</div>';
    document.body.appendChild(manual);

    previewEl = document.getElementById('rp-preview');
    noteEl = document.getElementById('rp-foot');
    copyLbl = document.getElementById('rp-copy-lbl');
    moreBtn = overlay.querySelector('[data-rp="more"]');
    copyBtn = overlay.querySelector('[data-rp="copy"]');

    if (navigator.share) moreBtn.style.display = 'flex';

    overlay.addEventListener('click', onOverlayClick);
    manual.addEventListener('click', onManualClick);
    document.addEventListener('keydown', onKey);
    built = true;
  }

  function onOverlayClick(e) {
    var act = e.target.closest ? e.target.closest('[data-rp]') : null;
    if (act) {
      var what = act.getAttribute('data-rp');
      if (what === 'close') return close();
      if (what === 'copy') return copyState();
      if (what === 'more') return nativeShare();
      return;
    }
    var tile = e.target.closest ? e.target.closest('.rp-tile') : null;
    if (tile) {
      e.preventDefault();
      go(tile.getAttribute('data-p'));
      return;
    }
    if (e.target === overlay) close();
  }

  function onManualClick(e) {
    var act = e.target.closest ? e.target.closest('[data-rp]') : null;
    if (act && act.getAttribute('data-rp') === 'mclose') {
      manual.setAttribute('hidden', '');
      document.body.style.overflow = '';
    }
  }

  function onKey(e) {
    if (e.key !== 'Escape') return;
    if (manual && !manual.hasAttribute('hidden')) {
      manual.setAttribute('hidden', '');
      document.body.style.overflow = '';
      return;
    }
    if (overlay && !overlay.hasAttribute('hidden')) close();
  }

  /* ---------- open / close ---------- */
  function open(opts) {
    if (!built) build();
    state.text = (opts && opts.text) || document.title;
    state.url = (opts && opts.url) || location.href;
    /* 老的调用方把链接粘在文案尾巴上，这里拆掉，避免平台上出现两次 */
    if (state.text.indexOf(state.url) > -1) {
      state.text = state.text.split(state.url).join('').replace(/\s+$/, '');
    }
    /* 有的页面把「origin+path」粘进文案，而链接后面还带了参数：直接砍掉结尾的网址 */
    state.text = state.text.replace(/\s*https?:\/\/\S+$/, '');
    state.title = (opts && opts.title) || document.title;
    var shown = state.text;
    if (shown.length > 110) shown = shown.slice(0, 110) + '…';
    previewEl.textContent = shown;
    setLinks();
    noteEl.textContent = t('note');
    copyLbl.textContent = t('copy');
    overlay.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    track('share_open', {});
    var x = overlay.querySelector('[data-rp="close"]');
    if (x) x.focus({ preventScroll: true });
  }

  function setLinks() {
    var long = state.url.length > LONG_URL;
    var tiles = overlay.querySelectorAll('.rp-tile');
    for (var i = 0; i < tiles.length; i++) {
      var slug = tiles[i].getAttribute('data-p');
      tiles[i].setAttribute('href', href(slug, state.text, state.url, long));
    }
  }

  function close() {
    overlay.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  function track(kind, extra) {
    try {
      if (typeof window.gtag !== 'function') return;
      var p = { page_path: location.pathname };
      for (var k in extra) if (extra.hasOwnProperty(k)) p[k] = extra[k];
      window.gtag('event', kind, p);
    } catch (e) { /* ignore */ }
  }

  /* ---------- actions ---------- */
  function go(slug) {
    var long = state.url.length > LONG_URL;
    var link = href(slug, state.text, state.url, long);
    track('share_platform', { platform: slug });
    if (long && (slug === 'x' || slug === 'facebook' || slug === 'reddit' || slug === 'pinterest')) {
      copyText(state.url, function () {});
      noteEl.textContent = t('longCopied');
    }
    var w = window.open(link, '_blank', 'noopener,width=640,height=620');
    if (!w) location.href = link;
  }

  function nativeShare() {
    track('share_native', {});
    if (!navigator.share) return;
    navigator.share({ title: state.title, text: state.text, url: state.url }).catch(function () {});
  }

  function copyState() {
    var payload = state.text ? state.text + '\n' + state.url : state.url;
    copyText(payload, function (ok) {
      copyLbl.textContent = ok ? t('copied') : t('copy');
      track('share_copy', {});
      setTimeout(function () { copyLbl.textContent = t('copy'); }, 1600);
    });
  }

  function copyText(text, done) {
    function legacy() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
      return ok;
    }
    function manualFallback() {
      var ta = document.getElementById('rp-manual-ta');
      if (ta) {
        ta.value = text;
        var m = document.getElementById('rp-copy-overlay');
        m.removeAttribute('hidden');
        document.body.style.overflow = 'hidden';
        ta.focus();
        ta.select();
      }
      done(false);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () {
        if (legacy()) done(true); else manualFallback();
      });
    } else {
      if (legacy()) done(true); else manualFallback();
    }
  }

  window.RPShare = { open: open, copy: copyText };
})();
