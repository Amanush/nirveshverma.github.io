(function () {
const $ = s => document.querySelector(s), L = () => GK_LANG[lang], E = () => GKEdit.L(lang);
let lang = localStorage.getItem("gk.lang") || "hinglish", topic = null, saved = null, hist = null, topics = [], sel = null, lastIdx = -1;
let app, hdr, aside, H = {};
const clone = x => JSON.parse(JSON.stringify(x));
const el = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [x, v] of Object.entries(a)) v == null || v === false ? 0 : v === true ? e.setAttribute(x, "") : x === "class" ? e.className = v : x.startsWith("on") ? e.addEventListener(x.slice(2), v) : e.setAttribute(x, v); k.flat().forEach(c => c != null && e.append(c)); return e; };
const dirty = () => topic && JSON.stringify(topic) !== JSON.stringify(saved);
const getJSON = async u => { const r = await fetch(u); if (!r.ok) throw new Error(u + " → " + r.status); return r.json(); };
const download = (name, text) => { const a = el("a", { href: URL.createObjectURL(new Blob([text], { type: "application/json" })), download: name }); a.click(); URL.revokeObjectURL(a.href); };
function showError(msg, ok) { const b = $("#err"); if (!b) return; b.textContent = msg || ""; b.className = "err" + (ok ? " ok" : ""); b.hidden = !msg; }
const label = s => ((s.heading || s.statement || s.type) + "").slice(0, 34);

/* ---------- shell: header / aside / main are rendered independently so the stage never loses focus ---------- */
const BL = { en: { tools: "Tools", menu: "Menu", slides: "Slides", pen: "Pen", settings: "Settings", image: "Image" }, hi: { tools: "औज़ार", menu: "मेन्यू", slides: "स्लाइड", pen: "पेन", settings: "सेटिंग्स", image: "चित्र" }, hinglish: { tools: "Tools", menu: "Menu", slides: "Slides", pen: "Pen", settings: "Settings", image: "Image" } }, bl = () => BL[lang] || BL.hinglish;
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
function togglePen() { GKAnnotate.toggle(); renderBnav(); }
function toggleEdit() { GKEdit.mode = !GKEdit.mode; sel = null; refresh(); restage(); }
function renderBnav() {
  const tab = (ic, txt, fn, on) => el("button", { class: on ? "on" : "", type: "button", onclick: fn, "aria-label": txt }, el("span", { class: "ic", "aria-hidden": "true" }, ic), el("span", {}, txt));
  bnav.replaceChildren(tab("☰", bl().slides, toggleDrawer, sheetIs("drawer")), tab("✎", GKEdit.mode ? E().editing : E().edit, () => topic && toggleEdit(), GKEdit.mode), tab("🖊", bl().pen, () => topic && togglePen(), GKAnnotate.active), tab("▶", E().present, () => topic && setPresent(true), false), tab("⋯", bl().menu, () => setSheet(sheetIs("sheet-menu") ? null : "sheet-menu"), sheetIs("sheet-menu")));
}
function refresh() { renderHeader(); renderAside(); renderToolbar(); renderBnav(); }
function restage() {
  const h = $("#stage-host"); if (!h) return;
  if (!topic) return h.replaceChildren(el("div", { class: "empty" }, el("h2", {}, L().emptyTitle), el("p", {}, L().emptyBody), el("div", { class: "row" }, el("button", { class: "btn primary", type: "button", onclick: () => document.querySelector("aside input[type=file]").click() }, "📂 " + L().import), topics[0] ? el("button", { class: "btn", type: "button", onclick: () => openTopic(topics[0].meta) }, "▶ " + topics[0].meta.title) : null)));
  const go = () => GKPlayer.mount(h, topic, L(), lang);
  GKImages.needsPrime(topic) ? GKImages.prime(topic).then(go) : go();
}
function renderHeader() {
  const hb = (ic, txt, fn, o = {}) => el("button", { class: "btn hb" + (o.cls ? " " + o.cls : "") + (o.primary ? " primary" : ""), type: "button", title: txt, "aria-label": txt, disabled: o.dis, onclick: fn }, el("span", { class: "ic", "aria-hidden": "true" }, ic), el("span", { class: "t" }, txt));
  const sb = el("button", { class: "btn hb-menu", type: "button", "aria-label": "Toggle sidebar", onclick: toggleDrawer }, "☰");
  H.status = el("span", { class: "status" }); H.undo = hb("↶", L().undo, () => { topic = hist.undo(); refresh(); restage(); }); H.redo = hb("↷", L().redo, () => { topic = hist.redo(); refresh(); restage(); });
  H.save = hb("💾", L().save, save, { primary: true, cls: "keep" });
  hdr.replaceChildren(sb, el("div", { class: "brand" }, el("div", { class: "mark" }, "GK"), el("div", {}, el("div", { class: "logo" }, "GK Turbo"), el("div", { class: "tag" }, "Learn • Recall • Crack"))), el("div", { class: "grow" }), H.status,
    el("div", { class: "hactions" },
      hb("📂", L().import, () => { setSheet(null); document.querySelector("aside input[type=file]").click(); }),
      hb("▭", GKPlayer.view.aspect, () => { GKPlayer.view.aspect = GKPlayer.view.aspect === "16:9" ? "9:16" : "16:9"; localStorage.setItem("gk.aspect", GKPlayer.view.aspect); refresh(); restage(); }, { dis: !topic }),
      hb("🖼", bl().image, () => { setSheet(null); addImage(); }, { dis: !topic }),
      hb("🖊", bl().pen, () => { setSheet(null); togglePen(); }, { dis: !topic }),
      hb("▶", E().present, () => { setSheet(null); setPresent(true); }, { dis: !topic, cls: "keep", primary: true }),
      hb("✎", GKEdit.mode ? E().editing : E().edit, () => { setSheet(null); toggleEdit(); }, { dis: !topic }),
      H.save, hb("⚙", bl().settings, () => { setSheet(null); GKSettings.open(); }), hb("🧰", bl().tools, () => setSheet("sheet-tools"), { cls: "only-compact" })));
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
  const f = el("input", { type: "file", accept: ".json,application/json", hidden: true, onchange: e => { const x = e.target.files[0]; e.target.value = ""; x && importFile(x); } });
  const b = (t, fn, dis) => el("button", { class: "btn item", disabled: dis, onclick: fn }, t);
  aside.replaceChildren(
    ...(topic ? [el("h3", {}, E().slides), ...topic.slides.map((s, i) => el("button", { class: "btn item sl-item" + (i === GKPlayer.view.idx ? " on" : ""), "data-i": i, onclick: () => { GKPlayer.goto(i); setSheet(null); } }, el("span", { class: "lbl" }, (i + 1) + ". " + label(s)), el("small", {}, s.type)))] : []),
    el("h3", {}, L().topics), ...topics.map(t => el("button", { class: "btn item" + (topic && topic.id === t.id ? " on" : ""), onclick: () => openTopic(t.meta) }, t.meta.title, el("small", {}, t.meta.slides.length + " " + L().slides))),
    el("h3", {}, " "), b("📂 " + L().import, () => f.click()), f, b("⬇ " + L().export, exportJSON, !topic));
}
function renderToolbar() {
  const tb = $("#toolbar"); if (!tb) return; tb.replaceChildren(); if (!topic || !GKEdit.mode) return;
  const e = E(), i = GKPlayer.view.idx, s = topic.slides[i] || {}, btn = (t, title, fn, o = {}) => el("button", { class: "btn", type: "button", title, disabled: o.dis, onclick: fn }, t);
  const go = (next, idx) => { GKPlayer.view.idx = idx; GKPlayer.view.page = 0; GKPlayer.view.step = 0; edit(next); }, im = GKEdit.imgObj(s.image);
  const typeSel = el("select", {}, ...GK.SLIDE_TYPES.map(t => el("option", { value: t }, t)));
  tb.append(el("div", { class: "tbrow" }, el("b", {}, e.slide + " " + (i + 1)), typeSel, btn("＋ " + e.add, e.add, () => go(GKEdit.addSlide(topic, i, typeSel.value), i + 1)),
    btn("⧉ " + e.dup, e.dup, () => go(GK.duplicateSlide(topic, i), i + 1)), btn("✕ " + e.del, e.del, () => confirm(e.confirmDel) && go(GK.deleteSlide(topic, i), Math.max(0, Math.min(i, topic.slides.length - 2))), { dis: topic.slides.length < 2 }),
    btn("↑", e.up, () => go(GK.moveSlide(topic, i, i - 1), i - 1), { dis: i === 0 }), btn("↓", e.down, () => go(GK.moveSlide(topic, i, i + 1), i + 1), { dis: i >= topic.slides.length - 1 }),
    el("span", { class: "sep" }), btn(e.addItem, e.addItem, () => { GKPlayer.view.step = 0; edit(GKEdit.addItem(topic, i)); }), btn(e.delItem, e.delItem, () => edit(GKEdit.removeItem(topic, i))),
    el("span", { class: "sep" }), H.undo, H.redo, ...(im && im.src ? [el("span", { class: "sep" }), btn("✕ " + e.imgRemove, e.imgRemove, () => edit(GKEdit.removeImage(topic, i)))] : [])));
}
/* ---------- presentation mode ---------- */
let presenting = false, mt = null;
function setPresent(on) {
  if (on && !topic) return; presenting = on; document.body.classList.toggle("present", on); GKTools.wake(on);
  if (on) { GKEdit.mode = false; sel = null; try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {} }
  else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  refresh(); restage();
}
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && presenting) setPresent(false); });
const showNav = () => { document.body.classList.add("moving"); clearTimeout(mt); mt = setTimeout(() => document.body.classList.remove("moving"), 2000); };
document.addEventListener("mousemove", showNav); document.addEventListener("pointerdown", showNav);
document.addEventListener("keydown", e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest("input,textarea,select,[contenteditable=true]")) return;
  if (GKAnnotate.active && ["1", "2", "3", "4", "z", "Z", "c", "C", "x", "X", "d", "D"].includes(e.key)) { const m = { 1: "pen", 2: "hl", 3: "line", 4: "erase" }; if (m[e.key]) GKAnnotate.setTool(m[e.key]); else if (/z/i.test(e.key)) GKAnnotate.undo(); else if (/c/i.test(e.key)) GKAnnotate.clear(); else { GKAnnotate.activate(false); renderBnav(); } e.preventDefault(); return; }
  if (e.key === "Escape" && GKAnnotate.active) { GKAnnotate.activate(false); renderBnav(); e.preventDefault(); }
  else if ((e.key === "d" || e.key === "D") && topic) { togglePen(); e.preventDefault(); }
  else if (e.key === "Escape" && presenting) { setPresent(false); e.preventDefault(); }
  else if ((e.key === "p" || e.key === "P") && topic) { setPresent(!presenting); e.preventDefault(); }
});

/* ---------- editing ---------- */
function edit(next, quiet) { if (hist.push(next)) topic = next; if (quiet) updateQuiet(); else { refresh(); restage(); } }
GKEdit.api = {
  get: p => GKEdit.get(topic, p), sel: () => sel,
  select: p => { sel = p; renderToolbar(); },
  commitText: (p, v) => { const cur = GKEdit.get(topic, p); if (v === cur || (!v && /(heading|statement)$/.test(p))) return; edit(GKEdit.setPath(topic, p, v), true); },
  afterBlur: () => setTimeout(() => { const a = document.activeElement; if (!(a && a.closest && a.closest("[data-path]"))) restage(); }, 0),
  setAnswer: k => edit(GKEdit.setPath(topic, "slides." + GKPlayer.view.idx + ".answer", k)) };
GKPlayer.onChange = () => {
  if (GKPlayer.view.idx !== lastIdx && lastIdx !== -1) GKAnnotate.onSlide();
  document.querySelectorAll(".sl-item").forEach(b => b.classList.toggle("on", +b.dataset.i === GKPlayer.view.idx));
  if (GKPlayer.view.idx !== lastIdx) { lastIdx = GKPlayer.view.idx; sel = null; renderToolbar(); }
};

/* ---------- topics, banks, save/import ---------- */
let rzT = null;
addEventListener("resize", () => { clearTimeout(rzT); rzT = setTimeout(() => { if (!localStorage.getItem("gk.aspect")) { const a = autoAspect(); if (a !== GKPlayer.view.aspect) { GKPlayer.view.aspect = a; refresh(); restage(); } } }, 200); });
async function init() {
  GKTheme.init();
  GKPlayer.view.aspect = localStorage.getItem("gk.aspect") || autoAspect();
  shell();
  try { topics = await Promise.all((await getJSON("topics/index.json")).map(async x => ({ ...x, meta: await getJSON("topics/" + x.file) }))); }
  catch (e) { showError("Could not load topics. Run the app through a local server (see README). " + e.message); }
  try { (await GK.Storage.all()).forEach(r => { const ex = topics.find(t => t.id === r.id); ex ? ex.meta = r.data : topics.push({ id: r.id, meta: r.data }); }); } catch (e) {}
  refresh(); restage();
}
function setTopic(t, savedCopy) { GKImages.normalizeTopic(t); GKPlayer.reset(); sel = null; lastIdx = -1; topic = t; saved = savedCopy; hist = new GK.History(topic); showError(""); refresh(); restage(); }
async function openTopic(t) { setSheet(null); const rec = await GK.Storage.load(t.id).catch(() => null); const d = GKImages.normalizeTopic(clone(rec ? rec.data : t)); setTopic(d, clone(d)); }
async function save() {
  const v = GK.validateTopic(topic); if (v.length) return showError(v.join("\n"));
  await GK.Storage.save(topic); saved = clone(topic); const ex = topics.find(t => t.id === topic.id); ex ? ex.meta = clone(topic) : topics.push({ id: topic.id, meta: clone(topic) }); showError(""); refresh();
}
async function importFile(f) {
  const n = GKTools.normalizeImport(await f.text(), f.name); if (n.error) return showError(L().invalid + ":\n" + n.error);
  const r = GK.parseImport(JSON.stringify(n.obj)); if (!r.ok) return showError(L().invalid + ":\n" + r.errors.join("\n"));
  if (topics.find(t => t.id === r.topic.id) && !confirm(L().confirmImport)) return;
  topics = topics.filter(t => t.id !== r.topic.id).concat({ id: r.topic.id, meta: r.topic }); setTopic(r.topic, null); setSheet(null);
  showError(n.notes.length ? "Imported. Auto-fixed: " + n.notes.join("; ") + "." : "Imported \"" + r.topic.title + "\" (" + r.topic.slides.length + " slides).", true);
}
document.addEventListener("dragover", e => e.preventDefault());
document.addEventListener("drop", e => { const f = e.dataTransfer && [...e.dataTransfer.files].find(x => /\.json$/i.test(x.name)); if (f) { e.preventDefault(); importFile(f); } });
/* ---------- images (paste / upload), export, language ---------- */
function addImage() { if (!topic) return; const i = GKPlayer.view.idx; GKImages.dialog({ topic, idx: i, lang, fallbackAlt: label(topic.slides[i]), onPlace: async o => { edit(GKEdit.setImage(topic, i, o)); await save(); } }); }
async function addImageBlob(blob, name) {
  if (!topic) return showError("Open or import a topic first, then paste the image.");
  const i = GKPlayer.view.idx, b = await GKImages.prepare(blob), ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" }[b.type] || "png";
  const path = "assets/" + topic.id + "-s" + (i + 1) + "-" + Date.now().toString(36) + "." + ext;
  await GK.Storage.putAsset({ path, blob: b, type: b.type, name: name || "pasted", onDisk: false }); GKImages.cache.set(path, URL.createObjectURL(b));
  edit(GKEdit.setImage(topic, i, { src: path, alt: label(topic.slides[i]), source: "", layout: "big" })); await save(); showError("Image added to slide " + (i + 1) + " and saved.", true);
}
async function exportJSON() { if (!topic) return; download(topic.id + ".json", await GKTools.exportWithImages(topic)); }
function setLang(v) { lang = v; localStorage.setItem("gk.lang", lang); refresh(); restage(); }
window.GKApp = { note: m => showError(m, true), warn: m => showError(m), get lang() { return lang; }, setLang, setPresent, get topic() { return topic; }, get saved() { return saved; }, edit, render() { refresh(); restage(); }, save, restage, addImage, addImageBlob };
init();
})();
