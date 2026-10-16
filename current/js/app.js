(function () {
const $ = s => document.querySelector(s), L = () => GK_LANG[lang], E = () => GKEdit.L(lang);
let lang = localStorage.getItem("gk.lang") || "hinglish", topic = null, saved = null, hist = null, topics = [], banks = [], sel = null, lastIdx = -1;
let app, hdr, aside, H = {};
const bankCache = {}, clone = x => JSON.parse(JSON.stringify(x));
const el = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [x, v] of Object.entries(a)) v == null || v === false ? 0 : v === true ? e.setAttribute(x, "") : x === "class" ? e.className = v : x.startsWith("on") ? e.addEventListener(x.slice(2), v) : e.setAttribute(x, v); k.flat().forEach(c => c != null && e.append(c)); return e; };
const dirty = () => topic && JSON.stringify(topic) !== JSON.stringify(saved);
const getJSON = async u => { const r = await fetch(u); if (!r.ok) throw new Error(u + " → " + r.status); return r.json(); };
const download = (name, text) => { const a = el("a", { href: URL.createObjectURL(new Blob([text], { type: "application/json" })), download: name }); a.click(); URL.revokeObjectURL(a.href); };
function showError(msg, ok) { const b = $("#err"); if (!b) return; b.textContent = msg || ""; b.className = "err" + (ok ? " ok" : ""); b.hidden = !msg; }
const label = s => ((s.heading || s.statement || s.type) + "").slice(0, 34);

/* ---------- shell: header / aside / main are rendered independently so the stage never loses focus ---------- */
const BL = { en: { tools: "Tools", menu: "Menu", slides: "Slides" }, hi: { tools: "औज़ार", menu: "मेन्यू", slides: "स्लाइड" }, hinglish: { tools: "Tools", menu: "Menu", slides: "Slides" } }, bl = () => BL[lang] || BL.hinglish;
const wide = () => matchMedia("(min-width:1100px)").matches, autoAspect = () => (innerWidth < innerHeight && innerWidth < 700) ? "9:16" : "16:9";
let bnav;
function shell() {
  const root = $("#root"); root.replaceChildren();
  hdr = el("header"); aside = el("aside"); bnav = el("nav", { class: "bnav", "aria-label": "Main" });
  app = el("div", { class: "app" + (localStorage.getItem("gk.sb") === "0" ? " collapsed" : "") }, hdr, aside,
    el("main", {}, el("div", { id: "err", class: "err", hidden: true }), el("div", { id: "toolbar" }), el("div", { class: "stagewrap", id: "stage-host" })),
    el("div", { class: "backdrop", onclick: () => setSheet(null) }), bnav);
  root.append(app);
}
const sheetIs = n => app.classList.contains(n);
function setSheet(name) { ["drawer", "sheet-tools", "sheet-menu"].forEach(c => app.classList.remove(c)); if (name) app.classList.add(name); renderBnav(); }
function toggleDrawer() { if (wide()) { localStorage.setItem("gk.sb", app.classList.contains("collapsed") ? "1" : "0"); app.classList.toggle("collapsed"); } else setSheet(sheetIs("drawer") ? null : "drawer"); }
function toggleEdit() { GKEdit.mode = !GKEdit.mode; sel = null; refresh(); restage(); }
function renderBnav() {
  const tab = (ic, txt, fn, on) => el("button", { class: on ? "on" : "", type: "button", onclick: fn, "aria-label": txt }, el("span", { class: "ic", "aria-hidden": "true" }, ic), el("span", {}, txt));
  bnav.replaceChildren(tab("☰", bl().slides, toggleDrawer, sheetIs("drawer")), tab("✎", GKEdit.mode ? E().editing : E().edit, () => topic && toggleEdit(), GKEdit.mode), tab("▶", E().present, () => topic && setPresent(true), false),
    tab("⚙", bl().tools, () => setSheet(sheetIs("sheet-tools") ? null : "sheet-tools"), sheetIs("sheet-tools")), tab("⋯", bl().menu, () => setSheet(sheetIs("sheet-menu") ? null : "sheet-menu"), sheetIs("sheet-menu")));
}
function refresh() { renderHeader(); renderAside(); renderToolbar(); renderBnav(); }
function restage() {
  const h = $("#stage-host"); if (!h) return;
  if (!topic) return h.replaceChildren(el("div", { class: "empty" }, el("h2", {}, L().emptyTitle), el("p", {}, L().emptyBody)));
  const go = () => GKPlayer.mount(h, topic, L(), lang);
  GKImages.needsPrime(topic) ? GKImages.prime(topic).then(go) : go();
}
function renderHeader() {
  const hb = (ic, txt, fn, o = {}) => el("button", { class: "btn hb" + (o.cls ? " " + o.cls : "") + (o.primary ? " primary" : ""), type: "button", title: txt, "aria-label": txt, disabled: o.dis, onclick: fn }, el("span", { class: "ic", "aria-hidden": "true" }, ic), el("span", { class: "t" }, txt));
  const sb = el("button", { class: "btn hb-menu", type: "button", "aria-label": "Toggle sidebar", onclick: toggleDrawer }, "☰");
  H.status = el("span", { class: "status" }); H.undo = hb("↶", L().undo, () => { topic = hist.undo(); refresh(); restage(); });
  H.redo = hb("↷", L().redo, () => { topic = hist.redo(); refresh(); restage(); }); H.save = hb("💾", L().save, save, { primary: true, cls: "keep" });
  const sel_ = el("select", { "aria-label": L().language, onchange: e => { lang = e.target.value; localStorage.setItem("gk.lang", lang); refresh(); restage(); } },
    ...[["en", "English"], ["hi", "हिन्दी"], ["hinglish", "Hinglish"]].map(([v, n]) => { const o = el("option", { value: v }, n); if (v === lang) o.selected = true; return o; }));
  const recOk = window.GKRecorder && GKRecorder.supported();
  hdr.replaceChildren(sb, el("div", { class: "brand" }, el("div", { class: "mark" }, "GK"), el("div", {}, el("div", { class: "logo" }, "GK Turbo"), el("div", { class: "tag" }, "Learn • Recall • Crack"))), el("div", { class: "grow" }), H.status,
    el("div", { class: "hactions" },
      hb("▭", GKPlayer.view.aspect, () => { GKPlayer.view.aspect = GKPlayer.view.aspect === "16:9" ? "9:16" : "16:9"; localStorage.setItem("gk.aspect", GKPlayer.view.aspect); refresh(); restage(); }, { dis: !topic }),
      hb("✎", GKEdit.mode ? E().editing : E().edit, toggleEdit, { dis: !topic, primary: GKEdit.mode }),
      ...(recOk ? [hb("●", GKRecorder.L().rec, () => { setSheet(null); GKRecorder.open(); })] : []),
      hb("▶", E().present, () => { setSheet(null); setPresent(true); }, { dis: !topic, cls: "keep" }), H.undo, H.redo, H.save, sel_));
  updateQuiet();
}
function updateQuiet() {            // in-place patch: never replaces a node the user might be clicking
  if (!H.status) return; const d = dirty();
  H.status.textContent = topic ? (d ? L().unsaved : L().saved) : ""; H.status.className = "status" + (d ? " dirty" : ""); H.status.hidden = !topic;
  if (H.reset) H.reset.disabled = !d;
  H.undo.disabled = !hist || !hist.canUndo; H.redo.disabled = !hist || !hist.canRedo; H.save.disabled = !topic || !d;
  if (topic) document.querySelectorAll(".sl-item .lbl").forEach((n, i) => { if (topic.slides[i]) n.textContent = (i + 1) + ". " + label(topic.slides[i]); });
}
function renderAside() {
  const f = el("input", { type: "file", accept: ".json", hidden: true, onchange: e => e.target.files[0] && importFile(e.target.files[0]) });
  const b = (t, fn, dis) => el("button", { class: "btn item", disabled: dis, onclick: fn }, t);
  aside.replaceChildren(
    ...(topic ? [el("h3", {}, E().slides), ...topic.slides.map((s, i) => el("button", { class: "btn item sl-item" + (i === GKPlayer.view.idx ? " on" : ""), "data-i": i, onclick: () => { GKPlayer.goto(i); setSheet(null); } }, el("span", { class: "lbl" }, (i + 1) + ". " + label(s)), el("small", {}, s.type)))] : []),
    el("h3", {}, L().topics), ...topics.map(t => el("button", { class: "btn item" + (topic && topic.id === t.id ? " on" : ""), onclick: () => openTopic(t.meta) }, t.meta.title, el("small", {}, t.meta.slides.length + " " + L().slides))),
    el("h3", {}, L().banks), ...banks.map(bk => el("button", { class: "btn item", onclick: () => openBank(bk) }, bk.name, el("small", {}, bk.count))),
    el("h3", {}, " "), b(L().import, () => f.click()), f, b(L().export, () => download(topic.id + ".json", GK.toJSON(topic)), !topic),
    b(E().saveAssets, async () => { try { showError(await GKImages.saveAssets(), true); } catch (er) { if (er.name !== "AbortError") showError(er.message); } }),
    b(L().backup, () => download(topic.id + "-backup-" + Date.now() + ".json", GK.toJSON(topic)), !topic), b(L().restore, restore, !topic), (H.reset = b(L().reset, reset, !dirty())));
}
function renderToolbar() {
  const tb = $("#toolbar"); if (!tb) return; tb.replaceChildren(); if (!topic) return;
  const e = E(), pr = GKPlayer.prefs, i = GKPlayer.view.idx, s = topic.slides[i] || {};
  const btn = (t, title, fn, o = {}) => el("button", { class: "btn" + (o.on ? " on" : ""), title, disabled: o.dis, onclick: fn }, t);
  const vg = (t, key) => el("label", { class: "tg" }, el("input", { type: "checkbox", checked: !!pr.view[key], onchange: ev => GKPlayer.setView(key, ev.target.checked) }), t);
  const tg = (t, key) => el("label", { class: "tg" }, el("input", { type: "checkbox", checked: !pr.hide[key], onchange: ev => GKPlayer.setPref(key, !ev.target.checked) }), t);
  tb.append(el("div", { class: "tbrow" }, el("b", {}, e.panels), tg(e.explain, "explain"), tg(e.trick, "trick"), tg(e.pyq, "pyq"), el("span", { class: "sep" }), vg(e.safe, "safe"), vg(e.guides, "guides"), vg(e.audio, "audio"), el("span", { class: "sep" }),
    btn("⏮ " + e.resetPres, e.resetPres + " (Shift+R)", resetPresentation), btn("✎ " + e.wb, e.wb + " (W)", () => GKWhiteboard.toggle()),
    btn("⌂ " + e.homeKey + ": " + GKPlayer.homeKey, e.homeKey, ev => captureHomeKey(ev.currentTarget, e)), btn("↺ " + e.resetLayout, e.resetLayout, resetLayout)));
  if (!GKEdit.mode) return;
  const go = (next, idx) => { GKPlayer.view.idx = idx; GKPlayer.view.page = 0; GKPlayer.view.step = 0; edit(next); };
  const typeSel = el("select", {}, ...GK.SLIDE_TYPES.map(t => el("option", { value: t }, t)));
  tb.append(el("div", { class: "tbrow" }, el("b", {}, e.slide + " " + (i + 1)), typeSel, btn("＋ " + e.add, e.add, () => go(GKEdit.addSlide(topic, i, typeSel.value), i + 1)),
    btn("⧉ " + e.dup, e.dup, () => go(GK.duplicateSlide(topic, i), i + 1)), btn("✕ " + e.del, e.del, () => confirm(e.confirmDel) && go(GK.deleteSlide(topic, i), Math.max(0, Math.min(i, topic.slides.length - 2))), { dis: topic.slides.length < 2 }),
    btn("↑", e.up, () => go(GK.moveSlide(topic, i, i - 1), i - 1), { dis: i === 0 }), btn("↓", e.down, () => go(GK.moveSlide(topic, i, i + 1), i + 1), { dis: i >= topic.slides.length - 1 }),
    el("span", { class: "sep" }), btn(e.addItem, e.addItem, () => { GKPlayer.view.step = 0; edit(GKEdit.addItem(topic, i)); }), btn(e.delItem, e.delItem, () => edit(GKEdit.removeItem(topic, i)))));
  const im = GKEdit.imgObj(s.image), cropBtn = (k, name) => el("span", { class: "crop" }, name, btn("−", e.crop + " " + name, () => edit(GKEdit.setCrop(topic, i, { [k]: ((im.crop || {})[k] || 0) - 5 }))), btn("+", e.crop + " " + name, () => edit(GKEdit.setCrop(topic, i, { [k]: ((im.crop || {})[k] || 0) + 5 }))));
  tb.append(el("div", { class: "tbrow" }, el("b", {}, "🖼"), btn(e.img, e.img, () => GKImages.dialog({ topic, idx: i, lang, fallbackAlt: label(s), onPlace: o => edit(GKEdit.setImage(topic, i, o)) })),
    ...(im && im.src ? [btn("✕ " + e.imgRemove, e.imgRemove, () => edit(GKEdit.removeImage(topic, i))), el("span", { class: "sep" }), el("b", {}, e.crop), cropBtn("l", "L"), cropBtn("t", "T"), cropBtn("r", "R"), cropBtn("b", "B"), btn("↺ " + e.cropReset, e.cropReset, () => edit(GKEdit.setCrop(topic, i, { l: 0, t: 0, r: 0, b: 0 })))] : [])));
  const rp = sel && sel.startsWith("slides." + i + ".") ? GKEdit.rel(sel, i) : null, st = (rp && s.style && s.style[rp]) || {}, asp = GKPlayer.view.aspect;
  const fmt = patch => rp && edit(GKEdit.setStyle(topic, i, rp, patch)), mv = (dx, dy) => rp && edit(GKEdit.nudge(topic, i, asp, rp, dx, dy)), d = !rp;
  const lh = el("select", { disabled: d, onchange: ev => fmt({ lh: ev.target.value ? +ev.target.value : null }) }, ...[["", "—"], ["1.1", "1.1"], ["1.3", "1.3"], ["1.5", "1.5"], ["1.8", "1.8"]].map(([v, n]) => { const o = el("option", { value: v }, n); if (String(st.lh || "") === v) o.selected = true; return o; }));
  const col = el("input", { type: "color", disabled: d, value: st.color || "#2b1a14", onchange: ev => fmt({ color: ev.target.value }) });
  tb.append(el("div", { class: "tbrow" }, el("span", { class: "slot", title: e.none }, rp ? e.sel + ": " + rp : e.none),
    btn("A−", "−", () => fmt({ size: Math.max(.5, +((st.size || 1) - .1).toFixed(2)) }), { dis: d }), btn("A+", "+", () => fmt({ size: Math.min(2.5, +((st.size || 1) + .1).toFixed(2)) }), { dis: d }),
    btn("B", e.bold, () => fmt({ weight: st.weight === 800 ? 400 : 800 }), { dis: d, on: st.weight === 800 }),
    btn("⇤", "left", () => fmt({ align: "left" }), { dis: d, on: st.align === "left" }), btn("⇔", "center", () => fmt({ align: "center" }), { dis: d, on: st.align === "center" }), btn("⇥", "right", () => fmt({ align: "right" }), { dis: d, on: st.align === "right" }),
    el("label", { class: "tg" }, e.lh, lh), el("label", { class: "tg" }, e.color, col), el("span", { class: "sep" }), el("b", {}, e.move),
    btn("←", "", () => mv(-.5, 0), { dis: d }), btn("↑", "", () => mv(0, -.5), { dis: d }), btn("↓", "", () => mv(0, .5), { dis: d }), btn("→", "", () => mv(.5, 0), { dis: d }),
    btn("↺ " + e.resetEl, e.resetEl, () => edit(GKEdit.resetElement(topic, i, rp)), { dis: d })));
}
/* ---------- presentation mode / recording ---------- */
let presenting = false, mt = null;
function setPresent(on) {
  if (on && !topic) return; presenting = on; document.body.classList.toggle("present", on);
  if (on) { GKEdit.mode = false; sel = null; try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {} }
  else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  refresh(); restage();
}
function resetPresentation() { GKWhiteboard.close(); GKQuiz.leave(); GKPlayer.reset(); GKPlayer.goto(0); }
function captureHomeKey(b, e) {
  b.textContent = e.pressKey; const h = ev => { ev.preventDefault(); ev.stopPropagation(); document.removeEventListener("keydown", h, true); if (ev.key !== "Escape") GKPlayer.homeKey = ev.key; renderToolbar(); };
  document.addEventListener("keydown", h, true);
}
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && presenting) setPresent(false); });
const showNav = () => { document.body.classList.add("moving"); clearTimeout(mt); mt = setTimeout(() => document.body.classList.remove("moving"), 2000); };
document.addEventListener("mousemove", showNav); document.addEventListener("pointerdown", showNav);
document.addEventListener("keydown", e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest("input,textarea,select,[contenteditable=true]")) return;
  if (e.key === "F9" && window.GKRecorder) { GKRecorder.quick(); e.preventDefault(); }
  else if (e.key === "F10" && window.GKRecorder) { GKRecorder.pause(); e.preventDefault(); }
  else if (e.key === "Escape" && presenting) { setPresent(false); e.preventDefault(); }
  else if (e.key === "p" || e.key === "P") { if (topic) { setPresent(!presenting); e.preventDefault(); } }
  else if (e.key === "w" || e.key === "W") { GKWhiteboard.toggle(); e.preventDefault(); }
  else if (e.key === "n" || e.key === "N") { GKAudio.toggle(); e.preventDefault(); }
  else if (e.key === "m" || e.key === "M") { GKAudio.mute(); e.preventDefault(); }
  else if (e.key === "R" && e.shiftKey && topic) { resetPresentation(); e.preventDefault(); }
});
function resetLayout() { localStorage.removeItem("gk.aspect"); GKPlayer.view.aspect = autoAspect(); localStorage.removeItem("gk.sb"); app.classList.remove("collapsed"); GKPlayer.resetPrefs(); refresh(); restage(); }

/* ---------- editing ---------- */
function edit(next, quiet) { if (hist.push(next)) topic = next; if (quiet) updateQuiet(); else { refresh(); restage(); } }
GKEdit.api = {
  /* narration audio is stored as a path, like images */
  get: p => GKEdit.get(topic, p), sel: () => sel,
  select: p => { sel = p; renderToolbar(); },
  commitText: (p, v) => { const cur = GKEdit.get(topic, p); if (v === cur || (!v && /(heading|statement)$/.test(p))) return; edit(GKEdit.setPath(topic, p, v), true); },
  afterBlur: () => setTimeout(() => { const a = document.activeElement; if (!(a && a.closest && a.closest("[data-path]"))) restage(); }, 0),
  setAnswer: k => edit(GKEdit.setPath(topic, "slides." + GKPlayer.view.idx + ".answer", k)) };
GKPlayer.onChange = () => {
  if (GKPlayer.view.idx !== lastIdx && lastIdx !== -1) GKWhiteboard.onSlide();
  document.querySelectorAll(".sl-item").forEach(b => b.classList.toggle("on", +b.dataset.i === GKPlayer.view.idx));
  if (GKPlayer.view.idx !== lastIdx) { lastIdx = GKPlayer.view.idx; sel = null; renderToolbar(); }
};

/* ---------- topics, banks, save/import ---------- */
let rzT = null;
addEventListener("resize", () => { clearTimeout(rzT); rzT = setTimeout(() => { if (!localStorage.getItem("gk.aspect")) { const a = autoAspect(); if (a !== GKPlayer.view.aspect) { GKPlayer.view.aspect = a; refresh(); restage(); } } }, 200); });
async function init() {
  GKPlayer.view.aspect = localStorage.getItem("gk.aspect") || autoAspect();
  shell();
  try { topics = await Promise.all((await getJSON("topics/index.json")).map(async x => ({ ...x, meta: await getJSON("topics/" + x.file) }))); }
  catch (e) { showError("Could not load topics. Run the app through a local server (see README). " + e.message); }
  try { (await GK.Storage.all()).forEach(r => { const ex = topics.find(t => t.id === r.id); ex ? ex.meta = r.data : topics.push({ id: r.id, meta: r.data }); }); } catch (e) {}
  try { banks = await getJSON("banks/manifest.json"); } catch (e) { banks = []; }
  refresh(); restage();
}
function setTopic(t, savedCopy) { GKImages.normalizeTopic(t); GKPlayer.reset(); sel = null; lastIdx = -1; topic = t; saved = savedCopy; hist = new GK.History(topic); showError(""); refresh(); restage(); }
async function openTopic(t) { setSheet(null); const rec = await GK.Storage.load(t.id).catch(() => null); const d = GKImages.normalizeTopic(clone(rec ? rec.data : t)); setTopic(d, clone(d)); }
async function save() {
  const v = GK.validateTopic(topic); if (v.length) return showError(v.join("\n"));
  await GK.Storage.save(topic); saved = clone(topic); const ex = topics.find(t => t.id === topic.id); ex ? ex.meta = clone(topic) : topics.push({ id: topic.id, meta: clone(topic) }); showError(""); refresh();
}
function reset() { if (!dirty() || !confirm(L().confirmReset)) return; topic = clone(saved); hist = new GK.History(topic); refresh(); restage(); }
async function importFile(f) {
  const r = GK.parseImport(await f.text()); if (!r.ok) return showError(L().invalid + ":\n" + r.errors.join("\n"));
  if (topics.find(t => t.id === r.topic.id) && !confirm(L().confirmImport)) return;
  topics = topics.filter(t => t.id !== r.topic.id).concat({ id: r.topic.id, meta: r.topic }); setTopic(r.topic, null);
}
async function restore() {
  if (!topic) return; const s = await GK.Storage.snapshots(topic.id); if (!s.length) return showError("No backups yet. Save once to create one.");
  const pick = prompt(s.map((x, i) => (i + 1) + ". " + new Date(x.ts).toLocaleString()).join("\n"), "1"), x = s[(+pick || 0) - 1];
  if (x && confirm(L().confirmReset)) { topic = x.data; hist = new GK.History(topic); refresh(); restage(); }
}
async function openBank(b) {
  setSheet(null);
  try {
    if (!bankCache[b.id]) { const raw = await getJSON("banks/" + b.file); bankCache[b.id] = Array.isArray(raw) ? raw : Object.values(raw).find(Array.isArray) || []; }
    const items = bankCache[b.id];
    GKDecks.dialog(b, items, lang, o => { const t = GKDecks.build(b, items, o); if (!t.slides.length) return showError("No questions matched.");
      topics = topics.filter(x => x.id !== t.id).concat({ id: t.id, meta: t }); setTopic(t, null); });
  } catch (e) { showError("Could not load bank " + b.name + ": " + e.message); }
}
window.GKApp = { note: m => showError(m, true), warn: m => showError(m), setAudio(i, path) { edit(GKEdit.setPath(topic, "slides." + i + ".narration.audio", path)); }, get lang() { return lang; }, setPresent, resetPresentation, get topic() { return topic; }, get saved() { return saved; }, edit, render() { refresh(); restage(); }, save, restage };
init();
})();
