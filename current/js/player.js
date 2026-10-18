/* GK Turbo slide player: step-by-step reveal, 16:9 / 9:16, auto page-splitting for long lists (no scrolling), keyboard + swipe. */
(function (root) {
  const PL = {
    en: { correct: "Correct Answer", why: "Why it's right", trick: "Memory Trick", pyq: "PYQ Reference" },
    hi: { correct: "सही उत्तर", why: "यह सही क्यों है", trick: "याद रखने की ट्रिक", pyq: "पिछले वर्ष के प्रश्न" },
    hinglish: { correct: "Sahi Answer", why: "Ye sahi kyun hai", trick: "Yaad rakhne ki Trick", pyq: "PYQ Reference" } };
  const PK = "gk.panels", VK = "gk.view", HK = "gk.homeKey", CK = "gk.cfg";
  const prefs = { hide: { explain: false, trick: false, pyq: false }, view: { safe: true, guides: false, audio: true } };
  const cfg = { minScale: .85 };                        // smallest text scale before a long list is split onto another page
  const load = (k, o) => { try { Object.assign(o, JSON.parse(localStorage.getItem(k) || "{}")); } catch (e) {} };
  load(PK, prefs.hide); load(VK, prefs.view); load(CK, cfg);
  const homeKey = () => { try { return localStorage.getItem(HK) || "Home"; } catch (e) { return "Home"; } };
  const presenting = () => typeof document !== "undefined" && document.body.classList.contains("present");
  const editing = () => !!(root.GKEdit && root.GKEdit.mode), hid = k => !editing() && prefs.hide[k];
  const ALL = { from: 0, to: Infinity }, LISTY = { overview: 1, summary: 1, facts: 1, timeline: 1, map: 1, compare: 1, trick: 1 };

  const listLen = s => ({ overview: () => s.points.length, summary: () => s.points.length, facts: () => s.items.length, timeline: () => s.events.length, map: () => s.labels.length,
    compare: () => Math.max(s.left.points.length, s.right.points.length), trick: () => (s.decode || []).length }[s.type] || (() => 0))();
  function stepsOnPage(s, pg) {
    const n = a => Math.max(0, Math.min(a.length, pg.to) - pg.from);
    switch (s.type) {
      case "overview": case "summary": return n(s.points); case "facts": return n(s.items); case "timeline": return n(s.events); case "map": return n(s.labels);
      case "compare": return n(s.left.points) + n(s.right.points); case "trick": return (pg.from === 0 ? 1 : 0) + n(s.decode || []);
      case "quiz": return !hid("pyq") && s.pyq && s.pyq.length ? 4 : !hid("trick") && s.trick ? 3 : !hid("explain") && s.explain && s.explain.length ? 2 : 1;
      default: return 0;
    }
  }
  const stepsOf = s => stepsOnPage(s, ALL);

  /* Pure navigation. Order: step -> page -> slide. pg(i) returns the known pages of slide i, or null if not measured yet. */
  function advance(topic, v, dir, pg) {
    const n = topic.slides.length, P = i => (pg && pg(i)) || null, pages = i => P(i) || [ALL];
    const st = (i, p) => { const ps = pages(i); return stepsOnPage(topic.slides[i], ps[Math.min(p, ps.length - 1)]); };
    let { idx, step } = v, page = v.page || 0;
    page = Math.min(page, pages(idx).length - 1); step = Math.min(step, st(idx, page));      // normalise "last page / last step" markers
    if (dir > 0) { if (step < st(idx, page)) step++; else if (page < pages(idx).length - 1) { page++; step = 0; } else if (idx < n - 1) { idx++; page = 0; step = 0; } }
    else if (dir < 0) { if (step > 0) step--; else if (page > 0) { page--; step = st(idx, page); } else if (idx > 0) { idx--; const ps = P(idx); if (ps) { page = ps.length - 1; step = st(idx, page); } else { page = Infinity; step = Infinity; } } }
    return Object.assign(v, { idx, page, step });
  }

  const cancelQ = () => root.GKQuiz && root.GKQuiz.cancel();
  const el = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [x, v] of Object.entries(a)) v == null || v === false ? 0 : v === true ? e.setAttribute(x, "") : x === "class" ? e.className = v : x.startsWith("on") ? e.addEventListener(x.slice(2), v) : e.setAttribute(x, v); k.flat().forEach(c => c != null && e.append(c)); return e; };
  const T = (tag, text, path, cls = "") => el(tag, { class: cls, "data-path": path }, text);
  const rv = (on, node) => { node.classList.add("rv"); if (on) node.classList.add("on"); return node; };

  function slideBody(s, step, i, lang, rg) {
    rg = rg || ALL; const p = "slides." + i + ".", L = PL[lang] || PL.hinglish, sl = a => a.map((x, k) => [x, k]).slice(rg.from, rg.to);
    const head = () => T("h2", s.heading, p + "heading", "h");
    switch (s.type) {
      case "title": return el("div", { class: "s-title" }, T("h1", s.heading, p + "heading"), T("p", s.tagline, p + "tagline"));
      case "overview": case "summary": return el("div", {}, head(), el("ul", { class: "pts" }, sl(s.points).map(([x, k], j) => rv(step > j, T("li", x, p + "points." + k)))));
      case "facts": return el("div", {}, head(), el("div", { class: "facts" }, sl(s.items).map(([x, k], j) => rv(step > j, el("div", { class: "fact" }, T("b", x.label, p + "items." + k + ".label"), T("span", x.value, p + "items." + k + ".value"))))));
      case "timeline": return el("div", {}, head(), el("ol", { class: "tl" }, sl(s.events).map(([x, k], j) => rv(step > j, el("li", {}, T("b", x.when, p + "events." + k + ".when"), T("span", x.what, p + "events." + k + ".what"))))));
      case "map": return el("div", {}, head(), el("div", { class: "map" }, el("ul", { class: "pts" }, sl(s.labels).map(([x, k], j) => rv(step > j, el("li", {}, T("b", x.text, p + "labels." + k + ".text"), " — ", T("span", x.note, p + "labels." + k + ".note")))))));
      case "compare": {
        const A = sl(s.left.points), B = sl(s.right.points);
        const col = (c, side, items, off) => el("div", { class: "col" }, T("h3", c.title, p + side + ".title"), el("ul", { class: "pts" }, items.map(([x, k], j) => rv(step > off + j, T("li", x, p + side + ".points." + k)))));
        return el("div", {}, head(), el("div", { class: "cmp" }, col(s.left, "left", A, 0), col(s.right, "right", B, A.length)));
      }
      case "trick": { const base = rg.from === 0 ? 1 : 0;
        return el("div", {}, head(), rg.from === 0 ? rv(step > 0, el("div", { class: "card trick" }, T("p", s.mnemonic, p + "mnemonic", "mn"))) : null,
          el("ul", { class: "pts" }, sl(s.decode || []).map(([x, k], j) => rv(step > base + j, el("li", {}, T("b", x.key, p + "decode." + k + ".key"), " = ", T("span", x.meaning, p + "decode." + k + ".meaning")))))); }
      case "quiz": {
        const ans = s.options && s.options[s.answer], parts = s.statement.split(/_{2,}/);
        const stmt = el("p", { class: "q" + (s.statement.length > 260 ? " xl" : s.statement.length > 140 ? " long" : s.statement.length > 70 ? " mid" : ""), "data-path": p + "statement" }, parts.flatMap((x, k) => k < parts.length - 1 ? [x, step >= 1 ? el("mark", {}, ans) : el("span", { class: "blank" }, "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0")] : [x]));
        const opts = el("div", { class: "opts" }, (s.options || []).map((o, k) => el("div", { class: "opt" + (step >= 1 && k === s.answer ? " ok" : "") },
          el("i", { "data-k": k }, String.fromCharCode(65 + k)), T("span", o, p + "options." + k), step >= 1 && k === s.answer ? el("em", {}, "✓") : null)));
        const cards = [];
        if (step >= 1) cards.push(el("div", { class: "card ok" }, el("small", {}, L.correct), el("b", {}, String.fromCharCode(65 + s.answer) + ". " + ans)));
        if (step >= 2 && !hid("explain") && (s.explain || []).length) cards.push(el("div", { class: "card why" }, el("small", {}, L.why), el("ul", {}, s.explain.map((x, k) => T("li", x, p + "explain." + k)))));
        if (step >= 3 && !hid("trick") && s.trick) cards.push(el("div", { class: "card trick" }, el("small", {}, L.trick), T("p", s.trick, p + "trick")));
        if (step >= 4 && !hid("pyq") && (s.pyq || []).length) cards.push(el("div", { class: "card pyq" }, el("small", {}, L.pyq), el("ul", {}, s.pyq.map((x, k) => el("li", {}, T("span", x.exam, p + "pyq." + k + ".exam"), " ", T("span", x.year, p + "pyq." + k + ".year"))))));
        return el("div", { class: "quiz" }, el("div", { class: "qrow" }, el("span", { class: "qb" }, "Q"), stmt), opts, el("div", { class: "cards" }, cards));
      }
    }
    return el("div");
  }
  const view = { idx: 0, page: 0, step: 0, aspect: "16:9" };
  const cur = { host: null, topic: null, labels: null, lang: "en" };
  const known = new Map(), fitK = {}; let curSig = "", curPages = [ALL], ro = null, rt = null, lastW = 0, lastH = 0;

  const render = (s, step, i, lang, rg) => { const b = slideBody(s, step, i, lang, rg), f = root.GKImages && root.GKImages.figure(s, i); const im = root.GKImages && root.GKImages.norm(s.image); return f ? el("div", { class: "imgwrap" + (s.type === "title" ? " col" : "") + (im && im.layout === "big" ? " big" : "") }, b, f) : b; };
  function makeProbe(stage, body) {
    const probe = body.cloneNode(false), r = body.getBoundingClientRect(); probe.removeAttribute("data-slide");      // exact (fractional) size: a 0.4px difference can flip a line wrap
    probe.style.cssText = "position:absolute;visibility:hidden;flex:none;left:" + body.offsetLeft + "px;top:" + body.offsetTop + "px;width:" + r.width + "px;height:" + r.height + "px";
    stage.append(probe); return probe;
  }
  const roomOf = probe => { const cs = getComputedStyle(probe); return () => probe.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 4; };

  /* Split a long list into pages that each fit at a readable size, instead of shrinking to nothing or scrolling. */
  function paginate(stage, s, i, lang) {
    const n = listLen(s), body = stage.querySelector(".st-body"); if (n < 2 || !body.clientHeight) return [ALL];
    const probe = makeProbe(stage, body), room = roomOf(probe); probe.style.setProperty("--u", "calc(var(--base) * var(--ts) * " + cfg.minScale + ")");
    const fits = (a, b) => { const rg = { from: a, to: b }, c = render(s, stepsOnPage(s, rg), i, lang, rg); probe.replaceChildren(c); if (root.GKEdit) root.GKEdit.style(probe, s, i, view.aspect); return c.offsetHeight <= room(); };
    let pages = [], from = 0;
    while (from < n) { let lo = from + 1, hi = n, best = from + 1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (fits(from, mid)) { best = mid; lo = mid + 1; } else hi = mid - 1; } pages.push({ from, to: best }); from = best; }
    if (pages.length > 1) { const per = Math.ceil(n / pages.length), bal = []; let ok = true; for (let a = 0; a < n; a += per) { const b = Math.min(n, a + per); if (!fits(a, b)) { ok = false; break; } bal.push({ from: a, to: b }); } if (ok && bal.length === pages.length) pages = bal; }
    probe.remove(); return pages;
  }
  /* Auto-fit: scale text down (never below 40%) until the revealed slide fits. On very small screens a quiz hides its option list once the
     explanation appears (the answer card already shows the answer), instead of shrinking everything to unreadable. Cached per slide + size. */
  function fit(stage, s, i, max, lang, rg) {
    const body = stage.querySelector(".st-body"), isQ = s.type === "quiz" && !editing();
    const key = [cur.topic.id, i, view.aspect, body.clientWidth, body.clientHeight, prefs.view.safe ? 1 : 0, editing() ? "e" : "", rg.from, rg.to, JSON.stringify(s).length].join("|");
    const calc = (step, tight) => {
      const probe = makeProbe(stage, body), room = roomOf(probe), content = render(s, step, i, lang, rg); probe.append(content); if (root.GKEdit) root.GKEdit.style(probe, s, i, view.aspect);
      if (s.type === "quiz") { const q = content.classList.contains("quiz") ? content : content.querySelector(".quiz"); if (tight) q.classList.add("tight"); q.insertBefore(el("div", { class: "timer" }, el("span", { class: "ti" }, "⏱"), el("b", { class: "tl" }, "00s"), el("div", { class: "tbar" }, el("div"))), q.querySelector(".cards")); }
      let k = 1; while (content.offsetHeight > room() && k > .4) { k -= .05; probe.style.setProperty("--u", "calc(var(--base) * var(--ts) * " + k.toFixed(2) + ")"); }
      probe.remove(); return k;
    };
    let e = fitK[key];
    if (!e) { const all = calc(max, false); e = { k1: all, k2: all, tight: false }; if (isQ && all < .55 && max >= 2) e = { k1: calc(1, false), k2: calc(max, true), tight: true }; fitK[key] = e; }
    const tightNow = isQ && e.tight && view.step >= 2, k = tightNow ? e.k2 : e.k1;
    if (tightNow) { const q = body.querySelector(".quiz"); if (q) q.classList.add("tight"); }
    if (k < 1) body.style.setProperty("--u", "calc(var(--base) * var(--ts) * " + k.toFixed(2) + ")");
  }
  const pagesNow = () => curPages;
  function pageNav(topic, d) {       // edit mode: move page by page / slide by slide (everything is revealed while editing)
    const n = topic.slides.length;
    if (d > 0) { if (view.page < pagesNow().length - 1) view.page++; else if (view.idx < n - 1) { view.idx++; view.page = 0; } }
    else if (view.page > 0) view.page--; else if (view.idx > 0) { view.idx--; view.page = Infinity; }
    view.step = 0;
  }
  const stepNav = (topic, d) => editing() ? pageNav(topic, d) : advance(topic, view, d, i => { const e = known.get(i), s = topic.slides[i]; return e && e.sig === curSig && e.json === JSON.stringify(s) ? e.pages : null; });

  function watch(host) {             // re-layout when the screen size / orientation changes
    if (typeof ResizeObserver === "undefined" || (ro && ro.host === host)) return; lastW = host.clientWidth; lastH = host.clientHeight;
    ro = new ResizeObserver(() => { const w = host.clientWidth, h = host.clientHeight; if (Math.abs(w - lastW) < 2 && Math.abs(h - lastH) < 2) return; lastW = w; lastH = h; clearTimeout(rt);
      rt = setTimeout(() => { const a = document.activeElement; if (a && a.isContentEditable) return; if (cur.host) mount(cur.host, cur.topic, cur.labels, cur.lang); }, 140); });
    ro.observe(host); ro.host = host;
  }

  function mount(host, topic, labels, lang) {
    Object.assign(cur, { host, topic, labels, lang }); watch(host);
    if (root.GKImages && !root.GKImages.onRatio) root.GKImages.onRatio = () => { if (cur.host) mount(cur.host, cur.topic, cur.labels, cur.lang); };
    const n = topic.slides.length; view.idx = Math.max(0, Math.min(view.idx, n - 1));
    const s = topic.slides[view.idx], lg = topic.language || lang, again = () => mount(host, topic, labels, lang), go = d => { cancelQ(); stepNav(topic, d); again(); };
    const body = el("div", { class: "st-body", "data-slide": view.idx }), fill = el("div"), pgc = el("span", { class: "pgc", hidden: true });
    /* the nav bar is built first so every measurement below sees the real body height */
    const prevB = el("button", { class: "btn", type: "button", onclick: () => go(-1) }, "←  " + labels.prev), nextB = el("button", { class: "btn primary", type: "button", onclick: () => go(1) }, labels.next + "  →");
    const nav = el("div", { class: "st-nav" }, el("button", { class: "btn", type: "button", onclick: () => { cancelQ(); view.idx = 0; view.page = 0; view.step = 0; again(); } }, labels.home),
      presenting() ? el("button", { class: "btn", type: "button", title: "Esc", onclick: () => root.GKApp.setPresent(false) }, "✕") : null, el("button", { class: "btn", type: "button", title: "Pen (D)", onclick: () => root.GKAnnotate && root.GKAnnotate.toggle() }, "🖊"), el("span", { class: "grow" }), prevB, nextB);
    const stage = el("div", { class: "stage a" + view.aspect.replace(":", "x") + (prefs.view.safe && view.aspect === "9:16" ? " safe" : "") },
      el("div", { class: "st-top" }, el("span", { class: "badge" }, topic.category), (topic.exams || []).length ? el("span", { class: "badge tagx" }, topic.exams.join(" / ")) : null,
        el("span", { class: "grow" }), pgc, el("span", { class: "count" }, (view.idx + 1) + " / " + n)),
      body, el("div", { class: "st-bar" }, fill), nav);
    host.replaceChildren(stage);
    if (prefs.view.guides && view.aspect === "9:16" && !presenting()) stage.append(el("div", { class: "safe-guide" }));
    if (root.GKWhiteboard) root.GKWhiteboard.sync();
    if (root.GKAudio) { if (prefs.view.audio !== false) root.GKAudio.attach(stage, { slide: s, view, idx: view.idx }); else root.GKAudio.off(); }

    /* pages: measured once per slide + screen size, so the layout can adapt to phones, tablets and desktops */
    const json = JSON.stringify(s); curSig = [topic.id, view.aspect, body.clientWidth, body.clientHeight, prefs.view.safe ? 1 : 0, cfg.minScale, editing() ? 1 : 0].join("|");
    let ent = known.get(view.idx); if (!(ent && ent.sig === curSig && ent.json === json)) { ent = { sig: curSig, json, pages: LISTY[s.type] ? paginate(stage, s, view.idx, lg) : [ALL] }; known.set(view.idx, ent); }
    curPages = ent.pages; view.page = Math.max(0, Math.min(view.page || 0, curPages.length - 1));
    const rg = curPages[view.page], max = stepsOnPage(s, rg); view.step = Math.max(0, Math.min(view.step, max));
    body.replaceChildren(render(s, editing() ? max : view.step, view.idx, lg, rg));
    if (curPages.length > 1) { pgc.hidden = false; pgc.textContent = (view.page + 1) + "/" + curPages.length; }
    fill.style.width = ((view.idx + (curPages.length === 1 && !max ? 1 : (view.page + (max ? view.step / max : 1)) / curPages.length)) / n * 100) + "%";

    if (root.GKEdit) root.GKEdit.style(stage, s, view.idx, view.aspect);
    if (root.GKQuiz) { if (s.type === "quiz" && !editing()) root.GKQuiz.attach(stage, { slide: s, view, lang: lg, remount: again, last: view.idx === n - 1, jump: i => { view.idx = i; view.page = 0; view.step = 0; again(); } }); else root.GKQuiz.leave(); }
    fit(stage, s, view.idx, max, lg, rg);
    const first = view.idx === 0 && view.page === 0 && (editing() || view.step === 0), last = view.idx === n - 1 && view.page === curPages.length - 1 && (editing() || view.step === max);
    prevB.disabled = first; nextB.disabled = last;
    if (editing()) root.GKEdit.enable(stage);
    let sx = 0, sy = 0, down = false;   // swipe left / right on touch screens
    stage.addEventListener("pointerdown", e => { if (e.pointerType !== "touch" || e.target.closest("button,input,select,textarea,[contenteditable=true]")) return; sx = e.clientX; sy = e.clientY; down = true; });
    stage.addEventListener("pointercancel", () => { down = false; });
    stage.addEventListener("pointerup", e => { if (!down) return; down = false; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) > 60 && Math.abs(dy) < 60 && Math.abs(dx) > 1.5 * Math.abs(dy) && !editing()) go(dx < 0 ? 1 : -1);
      else if (presenting() && !editing() && Math.abs(dx) < 10 && Math.abs(dy) < 10) { const r = stage.getBoundingClientRect(); go(e.clientX - r.left > r.width * .35 ? 1 : -1); } });   // recording mode: tap right = next, tap left = back
    if (root.GKPlayer && root.GKPlayer.onChange) root.GKPlayer.onChange();
  }

  if (typeof document !== "undefined") document.addEventListener("keydown", e => {
    if (!cur.host || e.target.closest("input,textarea,select,[contenteditable=true]") || e.ctrlKey || e.metaKey) return;
    if (root.GKQuiz && root.GKQuiz.key(e)) return;
    const go = d => { cancelQ(); stepNav(cur.topic, d); mount(cur.host, cur.topic, cur.labels, cur.lang); e.preventDefault(); };
    if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") go(1);
    else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
    else if (e.key === "Home" || e.key === homeKey()) { cancelQ(); view.idx = 0; view.page = 0; view.step = 0; mount(cur.host, cur.topic, cur.labels, cur.lang); e.preventDefault(); }
  });
  const remount = () => { if (cur.host) mount(cur.host, cur.topic, cur.labels, cur.lang); };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  root.GKPlayer = { mount, view, advance, stepsOf, stepsOnPage, prefs, cfg, onChange: null,
    reset() { view.idx = 0; view.page = 0; view.step = 0; },
    goto(i) { cancelQ(); view.idx = i; view.page = 0; view.step = 0; remount(); },
    setPref(k, hidden) { prefs.hide[k] = hidden; save(PK, prefs.hide); remount(); },
    setView(k, v) { prefs.view[k] = v; save(VK, prefs.view); remount(); },
    setCfg(k, v) { cfg[k] = v; save(CK, cfg); remount(); },
    pages: () => curPages.slice(), relayout: remount,
    get homeKey() { return homeKey(); }, set homeKey(k) { try { localStorage.setItem(HK, k); } catch (e) {} },
    resetPrefs() { Object.keys(prefs.hide).forEach(k => prefs.hide[k] = false); prefs.view.safe = true; prefs.view.guides = false; prefs.view.audio = true; cfg.minScale = .8; try { [PK, VK, HK, CK].forEach(k => localStorage.removeItem(k)); } catch (e) {} } };
  if (typeof module !== "undefined") module.exports = root.GKPlayer;
})(typeof window !== "undefined" ? window : globalThis);
