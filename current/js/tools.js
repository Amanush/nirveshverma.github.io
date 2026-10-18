/* GK Turbo on-screen pen: draw / highlight / underline / erase over the whole page while teaching.
   Press D to toggle. Temporary: kept in memory only, never saved. When off, the mouse works normally. */
(function (root) {
  const AL = {
    en: { pen: "Pen", hl: "Highlight", line: "Underline", erase: "Eraser", undo: "Undo", clear: "Clear", done: "Done", keep: "Keep on next slide", tip: "Draw on screen (D)" },
    hi: { pen: "पेन", hl: "हाइलाइट", line: "अंडरलाइन", erase: "मिटाएँ", undo: "पूर्ववत", clear: "साफ़", done: "हो गया", keep: "अगली स्लाइड पर रखें", tip: "स्क्रीन पर लिखें (D)" },
    hinglish: { pen: "Pen", hl: "Highlight", line: "Underline", erase: "Eraser", undo: "Undo", clear: "Clear", done: "Done", keep: "Next slide par rakho", tip: "Screen par likho (D)" } };
  const COLORS = ["#e53935", "#1e66d0", "#1f8a4c", "#222222", "#f6b73c"], SIZES = [3, 6, 10];
  const S = { active: false, tool: "pen", color: COLORS[0], si: 0, keep: false, strokes: [] };
  let cv, g, bar, cur = null, hideT = null, built = false;
  const L = () => AL[(root.GKApp && root.GKApp.lang) || "hinglish"] || AL.hinglish;
  const el = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [x, v] of Object.entries(a)) v == null || v === false ? 0 : v === true ? e.setAttribute(x, "") : x === "class" ? e.className = v : x.startsWith("on") ? e.addEventListener(x.slice(2), v) : e.setAttribute(x, v); k.flat().forEach(c => c != null && e.append(c)); return e; };

  function redraw() {
    if (!g) return; const d = devicePixelRatio || 1; g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.lineCap = g.lineJoin = "round";
    S.strokes.forEach(s => { g.globalAlpha = s.a; g.strokeStyle = s.color; g.lineWidth = s.w; g.beginPath(); s.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); if (s.pts.length === 1) g.lineTo(s.pts[0][0] + .1, s.pts[0][1]); g.stroke(); }); g.globalAlpha = 1;
  }
  function size() { const d = devicePixelRatio || 1; cv.width = innerWidth * d; cv.height = innerHeight * d; cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px"; redraw(); }
  const dist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy; let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)); };
  const hit = (s, x, y, r) => s.pts.length === 1 ? Math.hypot(x - s.pts[0][0], y - s.pts[0][1]) < r + s.w / 2 : s.pts.some((p, i) => i && dist(x, y, s.pts[i - 1][0], s.pts[i - 1][1], p[0], p[1]) < r + s.w / 2);
  function eraseAt(x, y) { const n = S.strokes.length; S.strokes = S.strokes.filter(s => !hit(s, x, y, 14)); if (S.strokes.length !== n) redraw(); }

  function paint() {
    if (!bar) return;
    bar.querySelectorAll("[data-tool]").forEach(b => b.classList.toggle("on", b.dataset.tool === S.tool));
    bar.querySelectorAll("[data-color]").forEach(b => b.classList.toggle("on", b.dataset.color === S.color));
    bar.querySelectorAll("[data-size]").forEach(b => b.classList.toggle("on", +b.dataset.size === S.si));
    cv.style.cursor = S.tool === "erase" ? "cell" : "crosshair";
  }
  function flash() { bar.classList.add("show"); clearTimeout(hideT); hideT = setTimeout(() => bar.classList.remove("show"), 2800); }

  function build() {
    const l = L(), b = (t, title, fn, a = {}) => el("button", Object.assign({ class: "an-b", type: "button", title, onclick: fn }, a), t);
    cv = el("canvas", { class: "an-canvas", "aria-hidden": "true" }); g = cv.getContext("2d");
    cv.addEventListener("pointerdown", e => {
      if (!S.active) return; cv.setPointerCapture(e.pointerId); const x = e.clientX, y = e.clientY, w = SIZES[S.si];
      if (S.tool === "erase") { cur = { erase: true }; eraseAt(x, y); return; }
      cur = { tool: S.tool, color: S.color, w: S.tool === "hl" ? w * 4 : w, a: S.tool === "hl" ? .38 : 1, pts: [[x, y]], x0: x, y0: y }; S.strokes.push(cur); redraw();
    });
    cv.addEventListener("pointermove", e => {
      if (!cur) return;
      if (cur.erase) return eraseAt(e.clientX, e.clientY);
      if (cur.tool === "line") { let x = e.clientX, y = e.clientY; if (Math.abs(y - cur.y0) < 14) y = cur.y0; else if (Math.abs(x - cur.x0) < 14) x = cur.x0; cur.pts = [[cur.x0, cur.y0], [x, y]]; }
      else cur.pts.push([e.clientX, e.clientY]);
      redraw();
    });
    ["pointerup", "pointercancel"].forEach(t => cv.addEventListener(t, () => { cur = null; }));
    bar = el("div", { class: "an-bar", role: "toolbar", "aria-label": l.tip, hidden: true },
      b("🖊 " + l.pen, l.pen + " (1)", () => setTool("pen"), { "data-tool": "pen" }), b("🖍 " + l.hl, l.hl + " (2)", () => setTool("hl"), { "data-tool": "hl" }),
      b("▁ " + l.line, l.line + " (3)", () => setTool("line"), { "data-tool": "line" }), b("⌫ " + l.erase, l.erase + " (4)", () => setTool("erase"), { "data-tool": "erase" }),
      el("span", { class: "an-sep" }), ...COLORS.map(c => el("button", { class: "an-sw", type: "button", title: c, "data-color": c, style: "background:" + c, onclick: () => { S.color = c; if (S.tool === "erase") S.tool = "pen"; paint(); } })),
      el("span", { class: "an-sep" }), ...SIZES.map((s, i) => el("button", { class: "an-sz", type: "button", "data-size": i, title: s + "px", onclick: () => { S.si = i; paint(); } }, el("i", { style: "width:" + (s + 2) + "px;height:" + (s + 2) + "px" }))),
      el("span", { class: "an-sep" }), b("↶", l.undo + " (Z)", undo), b(l.clear, l.clear + " (C)", clear),
      el("label", { class: "an-keep" }, el("input", { type: "checkbox", onchange: e => { S.keep = e.target.checked; } }), l.keep), b("✓ " + l.done, l.done + " (D / Esc)", () => activate(false)));
    const handle = el("button", { class: "an-handle", type: "button", "aria-label": "Pen tools", onclick: flash }); document.body.append(cv, bar, handle); built = true;
    addEventListener("resize", size);
    document.addEventListener("pointermove", e => { if (S.active && !cur) { const r = bar.getBoundingClientRect(); if (e.clientY < r.bottom + 50 && e.clientX > r.left - 40 && e.clientX < r.right + 40) flash(); } });
    size();
  }
  function setTool(t) { if (!built) build(); S.tool = t; paint(); }
  const undo = () => { S.strokes.pop(); redraw(); };
  const clear = () => { S.strokes = []; redraw(); };
  function activate(on) {
    if (on && !built) build(); if (!built) return; S.active = on; if (on && S.tool === "erase") S.tool = "pen"; cv.style.display = on ? "block" : "none"; bar.hidden = !on; document.body.classList.toggle("annotating", on);
    document.querySelectorAll(".pen-btn").forEach(x => x.classList.toggle("active", on)); if (on) { size(); paint(); flash(); }
  }
  root.GKAnnotate = { activate, toggle: () => activate(!S.active), setTool, undo, clear, onSlide() { if (S.strokes.length && !S.keep) clear(); },
    get active() { return S.active; }, L, state: () => ({ active: S.active, tool: S.tool, strokes: S.strokes.length, color: S.color }) };
})(window);
/* GK Turbo theme engine: presets + custom colours/outlines/shape, applied as CSS variables. Saved in this browser; exportable as a small JSON file. */
(function (root) {
  const KEY = "gk.theme";
  const FONTS = { poppins: "'Poppins','Noto Sans Devanagari','Nirmala UI',system-ui,sans-serif", system: "system-ui,'Segoe UI','Noto Sans Devanagari','Nirmala UI',Roboto,sans-serif", serif: "Georgia,'Noto Serif Devanagari','Nirmala UI',serif" };
  const PRESETS = {
    sky: { name: "Sky Quiz", bg1: "#c9e2ff", bg2: "#f6faff", ink: "#0f1b3d", card: "#ffffff", primary: "#0f1b3d", accent: "#9db9f4", accent2: "#f6c31c", pink: "#f8b8ec", ok: "#2faa5a", ow: 2, sy: 4, r: 20, ts: 1, rays: true, font: "poppins" },
    saffron: { name: "Saffron Classic", bg1: "#fff1d0", bg2: "#fffaf0", ink: "#2b1a14", card: "#ffffff", primary: "#7a1230", accent: "#f6b73c", accent2: "#f6b73c", pink: "#f3b9c6", ok: "#1f8a4c", ow: 1, sy: 0, r: 16, ts: 1, rays: false, font: "poppins" },
    midnight: { name: "Midnight", bg1: "#141f4a", bg2: "#0a0f26", ink: "#eef2ff", card: "#1b2550", primary: "#9db9f4", accent: "#3f58b8", accent2: "#f6c31c", pink: "#b8509f", ok: "#3fbf70", ow: 2, sy: 4, r: 20, ts: 1, rays: true, font: "poppins" },
    mint: { name: "Mint Candy", bg1: "#c6f1dc", bg2: "#f4fffa", ink: "#10332a", card: "#ffffff", primary: "#10332a", accent: "#7fd8b0", accent2: "#ffd166", pink: "#ffb3c7", ok: "#2e9e5e", ow: 2, sy: 4, r: 22, ts: 1, rays: true, font: "poppins" },
    contrast: { name: "High Contrast", bg1: "#ffffff", bg2: "#ffffff", ink: "#000000", card: "#ffffff", primary: "#000000", accent: "#ffe14d", accent2: "#ffe14d", pink: "#ffd0e6", ok: "#0a7d36", ow: 3, sy: 5, r: 14, ts: 1.1, rays: false, font: "system" } };
  const HEX = /^#[0-9a-f]{6}$/i, COLOR_KEYS = ["bg1", "bg2", "ink", "card", "primary", "accent", "accent2", "pink", "ok"], NUM = { ow: [0, 4], sy: [0, 8], r: [4, 30], ts: [.8, 1.4] };
  let T = Object.assign({ preset: "sky" }, PRESETS.sky);
  const lum = h => { const n = parseInt(h.slice(1), 16); return (.299 * (n >> 16 & 255) + .587 * (n >> 8 & 255) + .114 * (n & 255)) / 255; };
  function sanitize(t) {
    const o = {}; COLOR_KEYS.forEach(k => { if (HEX.test(t[k])) o[k] = t[k]; });
    Object.entries(NUM).forEach(([k, [a, b]]) => { const v = +t[k]; if (isFinite(v) && t[k] !== "" && t[k] != null) o[k] = Math.min(b, Math.max(a, v)); });
    if (typeof t.rays === "boolean") o.rays = t.rays; if (FONTS[t.font]) o.font = t.font; if (PRESETS[t.preset] || t.preset === "custom") o.preset = t.preset; return o;
  }
  function apply() {
    const s = document.documentElement.style, set = (k, v) => s.setProperty(k, v);
    COLOR_KEYS.forEach(k => set("--" + k, T[k])); set("--ow", T.ow + "px"); set("--sy", T.sy + "px"); set("--r", T.r + "px"); set("--rs", Math.max(4, Math.round(T.r * .7)) + "px"); set("--ts", T.ts); set("--font", FONTS[T.font] || FONTS.poppins);
    set("--on-primary", lum(T.primary) > .6 ? T.ink : "#ffffff"); set("--on-accent2", lum(T.accent2) > .55 ? "#16213f" : "#ffffff");
    document.body.classList.toggle("rays", !!T.rays); const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = T.bg1;
  }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(T)); } catch (e) {} };
  function init() { let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} if (saved) T = Object.assign({}, PRESETS.sky, sanitize(saved)); else if (matchMedia("(max-width:699px), (max-height:520px)").matches) T.ts = 1.15; apply(); }
  function set(patch) { T = Object.assign({}, T, sanitize(patch)); if (!("preset" in patch) && COLOR_KEYS.some(k => k in patch)) T.preset = "custom"; apply(); persist(); }
  function preset(id) { if (!PRESETS[id]) return; T = Object.assign({ preset: id }, PRESETS[id]); apply(); persist(); }
  function exportJSON() { return JSON.stringify(Object.assign({ schema: "gkturbo.theme/1" }, T), null, 2); }
  function importJSON(text) {
    let o; try { o = JSON.parse(text); } catch (e) { return { ok: false, error: "Not valid JSON" }; }
    if (!o || o.schema !== "gkturbo.theme/1") return { ok: false, error: 'Not a GK Turbo theme file (schema must be "gkturbo.theme/1")' };
    const c = sanitize(o); if (!COLOR_KEYS.every(k => c[k])) return { ok: false, error: "Theme file is missing valid colours" }; T = Object.assign({}, PRESETS.sky, c, { preset: "custom" }); apply(); persist(); return { ok: true };
  }
  root.GKTheme = { init, set, preset, apply, exportJSON, importJSON, presets: PRESETS, fonts: Object.keys(FONTS), get: () => Object.assign({}, T), sanitize };
  
})(typeof window !== "undefined" ? window : globalThis);
/* ===== Settings dialog, forgiving JSON import, wake lock ===== */
(function (root) {
  const SL = {
    en: { settings: "Settings", theme: "Theme", colors: "Colours", bg1: "Background (top)", bg2: "Background (bottom)", ink: "Text & outlines", card: "Cards", primary: "Main buttons", accent: "Selected items", accent2: "Highlight", tsize: "Slide text size", tsizeS: "Bigger text means more pages for long lists", minScale: "Smallest text before a new page", minS: "Long lists split onto extra pages instead of shrinking", outline: "Outline thickness", round: "Roundness", shadow: "Shadow depth", rays: "Sunburst background", language: "Language", timer: "Quiz countdown", safe: "Safe margins (9:16)", safeS: "Keeps text away from the Shorts / Reels buttons", audio: "Audio bar", exportT: "Export theme", importT: "Import theme", reset: "Reset theme", done: "Done", bad: "That file is not a valid theme." },
    hi: { settings: "सेटिंग्स", theme: "थीम", colors: "रंग", tsize: "स्लाइड टेक्स्ट आकार", tsizeS: "बड़ा टेक्स्ट = लंबी सूची के ज़्यादा पेज", minScale: "नया पेज बनने से पहले सबसे छोटा टेक्स्ट", rays: "सनबर्स्ट बैकग्राउंड", safe: "सुरक्षित मार्जिन (9:16)", audio: "ऑडियो बार", exportT: "थीम निर्यात", importT: "थीम आयात", reset: "थीम रीसेट", done: "हो गया" },
    hinglish: { settings: "Settings", theme: "Theme", colors: "Colours", tsize: "Slide text size", tsizeS: "Bada text = lambi list ke zyada pages", minScale: "Naya page banne se pehle sabse chhota text", rays: "Sunburst background", safe: "Safe margins (9:16)", audio: "Audio bar", exportT: "Theme export", importT: "Theme import", reset: "Theme reset", done: "Done" } };
  const t = k => (SL[root.GKApp && root.GKApp.lang] || {})[k] || SL.en[k];
  const el = (n, a = {}, ...k) => { const e = document.createElement(n); for (const [x, v] of Object.entries(a)) v == null || v === false ? 0 : v === true ? e.setAttribute(x, "") : x === "class" ? e.className = v : x.startsWith("on") ? e.addEventListener(x.slice(2), v) : e.setAttribute(x, v); k.flat().forEach(c => c != null && e.append(c)); return e; };
  let rt = null; const relayout = () => { clearTimeout(rt); rt = setTimeout(() => root.GKPlayer && root.GKPlayer.relayout(), 180); };

  function open() {
    const T = GKTheme.get(), P = GKPlayer;
    const row = (title, sub, ctl) => el("div", { class: "srow" }, el("div", {}, el("b", {}, title), sub ? el("small", {}, sub) : null), ctl);
    const sw = (on, fn) => el("label", { class: "sw" }, el("input", { type: "checkbox", checked: on, onchange: e => fn(e.target.checked) }), el("i"));
    const rng = (min, max, step, val, fn, unit) => { const o = el("output", {}, val + unit); return el("div", { class: "rng" }, el("input", { type: "range", min, max, step, value: val, oninput: e => { o.textContent = e.target.value + unit; fn(+e.target.value); } }), o); };
    const chips = el("div", { class: "chips" }, ...Object.entries(GKTheme.presets).map(([id, p]) => el("button", { class: "chip" + (T.preset === id ? " on" : ""), type: "button", title: p.name, onclick: () => { GKTheme.preset(id); relayout(); d.close(); d.remove(); open(); } },
      el("span", { class: "dots" }, ...[p.bg1, p.primary, p.accent2].map(c => el("i", { style: "background:" + c }))), p.name)));
    const colors = el("div", { class: "cgrid" }, ...["bg1", "bg2", "ink", "card", "primary", "accent", "accent2"].map(k => el("label", {}, t(k), el("input", { type: "color", value: T[k], onchange: e => { GKTheme.set({ [k]: e.target.value }); relayout(); } }))));
    const file = el("input", { type: "file", accept: ".json", hidden: true, onchange: async e => { const f = e.target.files[0]; if (!f) return; const r = GKTheme.importJSON(await f.text()); if (!r.ok) return root.GKApp.warn(r.error || t("bad")); relayout(); d.close(); d.remove(); open(); } });
    const d = el("dialog", { class: "dlg settings" }, el("h3", {}, "⚙ " + t("settings")),
      el("h4", {}, t("theme")), chips, el("h4", {}, t("colors")), colors,
      row(t("tsize"), t("tsizeS"), rng(80, 160, 5, Math.round(T.ts * 100), v => { GKTheme.set({ ts: v / 100 }); relayout(); }, "%")),
      row(t("minScale"), t("minS"), rng(60, 100, 5, Math.round(P.cfg.minScale * 100), v => P.setCfg("minScale", v / 100), "%")),
      row(t("outline"), "", rng(0, 4, 1, T.ow, v => { GKTheme.set({ ow: v }); relayout(); }, "px")), row(t("round"), "", rng(4, 30, 2, T.r, v => { GKTheme.set({ r: v }); relayout(); }, "px")), row(t("shadow"), "", rng(0, 8, 1, T.sy, v => GKTheme.set({ sy: v }), "px")),
      row(t("rays"), "", sw(T.rays, v => GKTheme.set({ rays: v }))), row(t("safe"), t("safeS"), sw(P.prefs.view.safe, v => P.setView("safe", v))), row(t("language"), "", el("select", { onchange: e => GKApp.setLang(e.target.value) }, ...[["en", "English"], ["hi", "हिन्दी"], ["hinglish", "Hinglish"]].map(([v, n]) => { const o = el("option", { value: v }, n); if (v === GKApp.lang) o.selected = true; return o; }))),
      row(t("timer"), "", rng(3, 30, 1, GKQuiz.settings.seconds, v => { GKQuiz.settings.seconds = v; try { localStorage.setItem("gk.quiz", JSON.stringify(GKQuiz.settings)); } catch (e) {} }, "s")),
      el("div", { class: "row" }, el("button", { class: "btn", type: "button", onclick: () => { const a = el("a", { href: URL.createObjectURL(new Blob([GKTheme.exportJSON()], { type: "application/json" })), download: "gkturbo-theme.json" }); a.click(); } }, t("exportT")),
        el("button", { class: "btn", type: "button", onclick: () => file.click() }, t("importT")), file, el("button", { class: "btn", type: "button", onclick: () => { GKTheme.preset("sky"); relayout(); d.close(); d.remove(); open(); } }, t("reset")),
        el("button", { class: "btn primary", type: "button", onclick: () => { d.close(); d.remove(); } }, t("done"))));
    d.addEventListener("close", () => d.remove()); document.body.append(d); d.showModal();
  }

  /* Forgiving importer: accepts messy / partial JSON (missing schema, id, types, question lists) and tells you what it fixed. */
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const str = v => v == null ? "" : typeof v === "object" ? Object.values(v).join(" — ") : String(v);
  const toArr = v => Array.isArray(v) ? v : v == null || v === "" ? [] : [v];
  function normalizeImport(text, fname) {
    let o; try { o = JSON.parse(text); } catch (e) { return { error: "Not valid JSON: " + e.message }; }
    const notes = [], base = String(fname || "").replace(/\.json$/i, "");
    if (Array.isArray(o)) {
      if (o.length && o[0] && typeof o[0] === "object" && o[0].q !== undefined && root.GKDecks) { const d = root.GKDecks.build({ id: "import", name: base || "Imported" }, o, { count: o.length, shuffle: false }); o = { title: base || "Imported questions", slides: d.slides, category: "Practice" }; notes.push("question list converted to quiz slides (wrong options were generated)"); }
      else { o = { slides: o }; notes.push("a plain list of slides was wrapped into a topic"); }
    }
    if (!o || typeof o !== "object") return { error: "Expected a topic object." };
    if (!Array.isArray(o.slides)) { const alt = o.questions || o.items || o.cards; if (Array.isArray(alt)) { o.slides = alt; notes.push("used the list found in the file as slides"); } else return { error: "No \"slides\" list found in this file." }; }
    if (o.schema !== "gkturbo.topic/1") { o.schema = "gkturbo.topic/1"; notes.push("added schema"); }
    if (!o.title) { o.title = o.name || base || "Imported topic"; notes.push("title set to \"" + o.title + "\""); }
    const id = slug(o.id || o.title) || "topic-" + Date.now().toString(36); if (o.id !== id) { if (o.id) notes.push("id made URL-safe"); o.id = id; }
    if (!o.category) o.category = "General"; if (typeof o.exams === "string") o.exams = o.exams.split(/[\/,|]/).map(s => s.trim()).filter(Boolean); if (!Array.isArray(o.exams)) o.exams = [];
    if (!["en", "hi", "hinglish"].includes(o.language)) { o.language = /[\u0900-\u097F]/.test(text) ? "hi" : "en"; notes.push("language set to " + o.language); }
    const TYPES = ["title", "overview", "facts", "map", "timeline", "compare", "trick", "quiz", "summary"]; let fixed = 0;
    o.slides = o.slides.map((s, i) => {
      if (!s || typeof s !== "object") { fixed++; return { type: "overview", heading: "Slide " + (i + 1), points: [str(s)] }; }
      const h = s.heading || s.title || s.name || "Slide " + (i + 1), ty = TYPES.includes(s.type) ? s.type : null;
      if (ty === "quiz" || (!ty && (s.statement || s.question || s.q))) {
        const opts = toArr(s.options || s.opts || s.choices).map(str); let a = s.answer; if (a === undefined) a = s.ans !== undefined ? s.ans : s.correct;
        if (typeof a === "string") { const li = "ABCDEFGH".indexOf(a.trim().toUpperCase()); a = a.trim().length === 1 && li >= 0 ? li : opts.findIndex(x => x.trim().toLowerCase() === a.trim().toLowerCase()); }
        if (typeof a === "number" && a >= opts.length && a - 1 < opts.length && a >= 1) a = a - 1; if (!(a >= 0 && a < opts.length)) a = 0;
        if (!ty) fixed++; return { ...s, type: "quiz", statement: str(s.statement || s.question || s.q), options: opts, answer: a, explain: toArr(s.explain || s.explanation || s.sol).map(str), trick: str(s.trick || s.mnemonic || ""), pyq: toArr(s.pyq) };
      }
      if (ty) { if (ty !== "quiz" && !s.heading) { s.heading = h; fixed++; } if ((ty === "overview" || ty === "summary") && !Array.isArray(s.points)) { s.points = toArr(s.points || s.items || s.text).map(str); fixed++; } return s; }
      fixed++;
      if (s.events) return { ...s, type: "timeline", heading: h, events: toArr(s.events).map(e => ({ when: str(e.when || e.year || e.date), what: str(e.what || e.text || e.event || e)})) };
      if (s.labels) return { ...s, type: "map", heading: h, labels: toArr(s.labels).map(e => ({ text: str(e.text || e.name), note: str(e.note || e.desc) })) };
      if (s.left && s.right) return { ...s, type: "compare", heading: h };
      if (s.mnemonic) return { ...s, type: "trick", heading: h, decode: toArr(s.decode).map(e => ({ key: str(e.key), meaning: str(e.meaning) })) };
      if (Array.isArray(s.items) && s.items.length && typeof s.items[0] === "object") return { ...s, type: "facts", heading: h, items: s.items.map(e => ({ label: str(e.label || e.title || e.name || e.key || Object.values(e)[0]), value: str(e.value || e.text || e.desc || e.description || e.meaning || Object.values(e)[1]) })) };
      return { ...s, type: "overview", heading: h, points: toArr(s.points || s.items || s.text || s.body).map(str) };
    });
    if (fixed) notes.push(fixed + " slide(s) auto-completed");
    return { obj: o, notes };
  }
  /* keep the phone screen awake while presenting / recording */
  let wl = null, want = false;
  async function wake(on) { want = on; try { if (on && navigator.wakeLock) wl = await navigator.wakeLock.request("screen"); else if (wl) { await wl.release(); wl = null; } } catch (e) {} }
  document.addEventListener("visibilitychange", () => { if (want && document.visibilityState === "visible") wake(true); });
  /* export: local images are embedded, so one JSON file carries everything (import it on any device) */
  const toURL = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
  async function exportWithImages(topic) {
    const t = JSON.parse(JSON.stringify(topic));
    for (const s of t.slides) { const im = typeof s.image === "string" ? (s.image = { src: s.image, alt: "", source: "" }) : s.image;
      if (im && /^assets\//.test(im.src)) { try { const a = await GK.Storage.getAsset(im.src); if (a) im.src = await toURL(a.blob); } catch (e) {} } }
    return JSON.stringify(t, null, 2);
  }
  /* paste (Ctrl+V / long-press paste) or drop an image anywhere: it goes onto the current slide and is saved */
  document.addEventListener("paste", e => { if (document.querySelector("dialog[open]") || (e.target && e.target.closest && e.target.closest("input,textarea,[contenteditable=true]"))) return; const it = [...((e.clipboardData && e.clipboardData.items) || [])].find(x => x.type.startsWith("image/")); if (it) { e.preventDefault(); GKApp.addImageBlob(it.getAsFile(), "pasted"); } });
  document.addEventListener("drop", e => { const f = e.dataTransfer && [...e.dataTransfer.files].find(x => x.type.startsWith("image/")); if (f) { e.preventDefault(); GKApp.addImageBlob(f, f.name); } });
  document.body.append(el("button", { class: "pen-fab", type: "button", "aria-label": "Pen", onclick: () => root.GKAnnotate.activate(true) }));
  root.GKSettings = { open }; root.GKTools = { normalizeImport, wake, exportWithImages, wakeState: () => !!wl };
})(window);
