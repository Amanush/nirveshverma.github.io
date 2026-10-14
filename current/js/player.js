/* GK Turbo slide player: step-by-step reveal, 16:9 / 9:16, keyboard nav. Quiz timer arrives in Batch 4. */
(function (root) {
  const PL = {
    en:{correct:"Correct Answer",why:"Why it's right",trick:"Memory Trick",pyq:"PYQ Reference",aspect:"16:9 / 9:16"},
    hi:{correct:"सही उत्तर",why:"यह सही क्यों है",trick:"याद रखने की ट्रिक",pyq:"पिछले वर्ष के प्रश्न",aspect:"16:9 / 9:16"},
    hinglish:{correct:"Sahi Answer",why:"Ye sahi kyun hai",trick:"Yaad rakhne ki Trick",pyq:"PYQ Reference",aspect:"16:9 / 9:16"}};

  const PK = "gk.panels", prefs = { hide: { explain: false, trick: false, pyq: false } };
  try { Object.assign(prefs.hide, JSON.parse(localStorage.getItem(PK) || "{}")); } catch (e) {}
  const VK = "gk.view", HK = "gk.homeKey"; prefs.view = { safe: true, guides: false, audio: true };
  try { Object.assign(prefs.view, JSON.parse(localStorage.getItem(VK) || "{}")); } catch (e) {}
  const homeKey = () => { try { return localStorage.getItem(HK) || "Home"; } catch (e) { return "Home"; } };
  const presenting = () => typeof document !== "undefined" && document.body.classList.contains("present");
  const editing = () => !!(root.GKEdit && root.GKEdit.mode), hid = k => !editing() && prefs.hide[k];
  const stepsOf = s => ({ overview:()=>s.points.length, facts:()=>s.items.length, timeline:()=>s.events.length, map:()=>s.labels.length,
    compare:()=>s.left.points.length+s.right.points.length, trick:()=>1+(s.decode||[]).length, summary:()=>s.points.length, quiz:()=>!hid("pyq")&&s.pyq&&s.pyq.length?4:!hid("trick")&&s.trick?3:!hid("explain")&&s.explain&&s.explain.length?2:1 }[s.type]||(()=>0))();

  /* Pure navigation: Next reveals one more step, then moves to the next slide. */
  function advance(topic, v, dir) {
    const n = topic.slides.length, max = i => stepsOf(topic.slides[i]);
    let { idx, step } = v;
    if (dir > 0) { if (step < max(idx)) step++; else if (idx < n - 1) { idx++; step = 0; } }
    else if (dir < 0) { if (step > 0) step--; else if (idx > 0) { idx--; step = max(idx); } }
    return Object.assign(v, { idx, step });
  }

  const cancelQ = () => root.GKQuiz && root.GKQuiz.cancel();
  const el = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [x, v] of Object.entries(a)) v == null || v === false ? 0 : v === true ? e.setAttribute(x, "") : x === "class" ? e.className = v : x.startsWith("on") ? e.addEventListener(x.slice(2), v) : e.setAttribute(x, v); k.flat().forEach(c => c != null && e.append(c)); return e; };
  const T = (tag, text, path, cls = "") => el(tag, { class: cls, "data-path": path }, text);
  const rv = (on, node) => { node.classList.add("rv"); if (on) node.classList.add("on"); return node; };

  function slideBody(s, step, i, lang, V) {
    const p = "slides." + i + ".", L = PL[lang] || PL.hinglish;
    const head = () => T("h2", s.heading, p + "heading", "h");
    switch (s.type) {
      case "title": return el("div", { class: "s-title" }, T("h1", s.heading, p + "heading"), T("p", s.tagline, p + "tagline"), null);
      case "overview": case "summary": return el("div", {}, head(), el("ul", { class: "pts" }, s.points.map((x, k) => rv(step > k, T("li", x, p + "points." + k)))));
      case "facts": return el("div", {}, head(), el("div", { class: "facts" }, s.items.map((x, k) => rv(step > k, el("div", { class: "fact" }, T("b", x.label, p + "items." + k + ".label"), T("span", x.value, p + "items." + k + ".value"))))));
      case "timeline": return el("div", {}, head(), el("ol", { class: "tl" }, s.events.map((x, k) => rv(step > k, el("li", {}, T("b", x.when, p + "events." + k + ".when"), T("span", x.what, p + "events." + k + ".what"))))));
      case "map": return el("div", {}, head(), el("div", { class: "map" },
        el("ul", { class: "pts" }, s.labels.map((x, k) => rv(step > k, el("li", {}, T("b", x.text, p + "labels." + k + ".text"), " — ", T("span", x.note, p + "labels." + k + ".note")))))));
      case "compare": { const nl = s.left.points.length, col = (c, side, off) => el("div", { class: "col" }, T("h3", c.title, p + side + ".title"), el("ul", { class: "pts" }, c.points.map((x, k) => rv(step > off + k, T("li", x, p + side + ".points." + k)))));
        return el("div", {}, head(), el("div", { class: "cmp" }, col(s.left, "left", 0), col(s.right, "right", nl))); }
      case "trick": return el("div", {}, head(), rv(step > 0, el("div", { class: "card trick" }, T("p", s.mnemonic, p + "mnemonic", "mn"))),
        el("ul", { class: "pts" }, (s.decode || []).map((x, k) => rv(step > k + 1, el("li", {}, T("b", x.key, p + "decode." + k + ".key"), " = ", T("span", x.meaning, p + "decode." + k + ".meaning"))))));
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

  /* Auto-fit: measure the slide fully revealed (so size stays constant across steps), shrink text until it fits. */
  const fitK = {};
  function fit(stage, s, i, max, lang) {
    const body = stage.querySelector(".st-body"), key = cur.topic.id + "|" + i + "|" + view.aspect + "|" + (prefs.view.safe ? 1 : 0) + "|" + (stage.querySelector(".st-audio") ? 1 : 0) + (editing() ? "e" : "") + (presenting() ? "p" : "") + "|" + JSON.stringify(s).length;
    let k = fitK[key];
    if (k == null) {
      const probe = body.cloneNode(false); probe.removeAttribute("data-slide");
      probe.style.cssText = "position:absolute;visibility:hidden;flex:none;left:" + body.offsetLeft + "px;top:" + body.offsetTop + "px;width:" + body.clientWidth + "px;height:" + body.clientHeight + "px";
      const content = render(s, max, i, lang); probe.append(content); if (root.GKEdit) root.GKEdit.style(probe, s, i, view.aspect);
      if (s.type === "quiz") { const q = content.classList.contains("quiz") ? content : content.querySelector(".quiz"); q.insertBefore(el("div", { class: "timer" }, el("span", { class: "ti" }, "⏱"), el("b", { class: "tl" }, "00s"), el("div", { class: "tbar" }, el("div"))), q.querySelector(".cards")); }
      stage.append(probe); k = 1;
      const cs = getComputedStyle(probe), room = () => probe.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 3;
      while (content.offsetHeight > room() && k > .4) { k -= .05; probe.style.setProperty("--u", "calc(var(--base) * " + k.toFixed(2) + ")"); }
      probe.remove(); fitK[key] = k;
    }
    if (k < 1) body.style.setProperty("--u", "calc(var(--base) * " + k.toFixed(2) + ")");
  }

  const stepNav = (topic, d) => { if (editing()) { view.idx = Math.max(0, Math.min(topic.slides.length - 1, view.idx + d)); view.step = 0; } else advance(topic, view, d); };
  const render = (s, step, i, lang) => { const b = slideBody(s, step, i, lang, view), f = root.GKImages && root.GKImages.figure(s, i); return f ? el("div", { class: "imgwrap" + (s.type === "title" ? " col" : "") }, b, f) : b; };
  const cur = { host: null, topic: null, labels: null, lang: "en" };
  const view = { idx: 0, step: 0, aspect: "16:9" };

  function mount(host, topic, labels, lang) {
    Object.assign(cur, { host, topic, labels, lang });
    if (root.GKImages && !root.GKImages.onRatio) root.GKImages.onRatio = () => { if (cur.host) mount(cur.host, cur.topic, cur.labels, cur.lang); };
    view.idx = Math.min(view.idx, topic.slides.length - 1);
    const n = topic.slides.length, s = topic.slides[view.idx], max = stepsOf(s);
    const go = d => { cancelQ(); stepNav(topic, d); mount(host, topic, labels, lang); };
    const stage = el("div", { class: "stage a" + view.aspect.replace(":", "x") + (prefs.view.safe && view.aspect === "9:16" ? " safe" : "") },
      el("div", { class: "st-top" }, el("span", { class: "st-logo" }, "GK Turbo"), el("span", { class: "badge" }, topic.category), el("span", { class: "badge tagx" }, (topic.exams || []).join(" / ")), el("button", { class: "wb-btn", type: "button", title: root.GKWhiteboard ? root.GKWhiteboard.tip() : "", "aria-label": "Whiteboard", onclick: () => root.GKWhiteboard && root.GKWhiteboard.toggle() }, "✎"), el("span", { class: "grow" }), el("span", { class: "count" }, (view.idx + 1) + " / " + n)),
      el("div", { class: "st-body", "data-slide": view.idx }, render(s, editing() ? max : view.step, view.idx, topic.language || lang)),
      el("div", { class: "st-bar" }, el("div", { style: "width:" + ((view.idx + (max ? view.step / max : 1)) / n * 100) + "%" })),
      el("div", { class: "st-nav" },
        el("button", { class: "btn", onclick: () => { cancelQ(); view.idx = 0; view.step = 0; mount(host, topic, labels, lang); } }, labels.home), presenting() ? el("button", { class: "btn", title: "Esc", onclick: () => root.GKApp.setPresent(false) }, "✕") : null,
        el("span", { class: "grow" }),
        el("button", { class: "btn", onclick: () => go(-1), disabled: view.idx === 0 && view.step === 0 }, "←  " + labels.prev),
        el("button", { class: "btn primary", onclick: () => go(1), disabled: view.idx === n - 1 && view.step === max }, labels.next + "  →")));
    host.replaceChildren(stage);
    if (prefs.view.guides && view.aspect === "9:16" && !presenting()) stage.append(el("div", { class: "safe-guide" }));
    if (root.GKWhiteboard) root.GKWhiteboard.sync();
    if (root.GKEdit) root.GKEdit.style(stage, s, view.idx, view.aspect);
    if (root.GKQuiz) { if (s.type === "quiz" && !editing()) { const rm = () => mount(host, topic, labels, lang); root.GKQuiz.attach(stage, { slide: s, view, lang: topic.language || lang, remount: rm, last: view.idx === n - 1, jump: i => { view.idx = i; view.step = 0; rm(); } }); } else root.GKQuiz.leave(); }
    if (root.GKAudio) { if (prefs.view.audio !== false) root.GKAudio.attach(stage, { slide: s, view, idx: view.idx }); else root.GKAudio.off(); }
    fit(stage, s, view.idx, max, topic.language || lang);
    if (editing()) root.GKEdit.enable(stage);
    if (root.GKPlayer && root.GKPlayer.onChange) root.GKPlayer.onChange();
  }

  if (typeof document !== "undefined") document.addEventListener("keydown", e => {
    if (!cur.host || e.target.closest("input,textarea,select,[contenteditable=true]") || e.ctrlKey || e.metaKey) return;
    if (root.GKQuiz && root.GKQuiz.key(e)) return;
    const go = d => { cancelQ(); stepNav(cur.topic, d); mount(cur.host, cur.topic, cur.labels, cur.lang); e.preventDefault(); };
    if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") go(1);
    else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
    else if (e.key === "Home" || e.key === homeKey()) { cancelQ(); view.idx = 0; view.step = 0; mount(cur.host, cur.topic, cur.labels, cur.lang); e.preventDefault(); }
  });

  root.GKPlayer = { mount, view, advance, stepsOf, prefs, onChange: null,
    reset() { view.idx = 0; view.step = 0; },
    goto(i) { cancelQ(); view.idx = i; view.step = 0; if (cur.host) mount(cur.host, cur.topic, cur.labels, cur.lang); },
    setPref(k, hidden) { prefs.hide[k] = hidden; try { localStorage.setItem(PK, JSON.stringify(prefs.hide)); } catch (e) {} view.step = Math.min(view.step, stepsOf(cur.topic.slides[view.idx])); if (cur.host) mount(cur.host, cur.topic, cur.labels, cur.lang); },
    setView(k, v) { prefs.view[k] = v; try { localStorage.setItem(VK, JSON.stringify(prefs.view)); } catch (e) {} if (cur.host) mount(cur.host, cur.topic, cur.labels, cur.lang); },
    get homeKey() { return homeKey(); }, set homeKey(k) { try { localStorage.setItem(HK, k); } catch (e) {} },
    resetPrefs() { Object.keys(prefs.hide).forEach(k => prefs.hide[k] = false); prefs.view.safe = true; prefs.view.guides = false; prefs.view.audio = true; try { localStorage.removeItem(PK); localStorage.removeItem(VK); localStorage.removeItem(HK); } catch (e) {} view.aspect = "16:9"; } };
  if (typeof module !== "undefined") module.exports = root.GKPlayer;
})(typeof window !== "undefined" ? window : globalThis);
