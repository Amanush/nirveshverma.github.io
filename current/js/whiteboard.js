/* Temporary whiteboard: floating, draggable, resizable text + pen overlay.
   Lives only in memory. It never touches the topic JSON, IndexedDB or localStorage. */
(function (root) {
  const WL = {
    en: { title: "Whiteboard", text: "Text", pen: "Pen", undo: "Undo stroke", clear: "Clear", hide: "Hide (W)", close: "Close", auto: "Clear on next slide", tip: "Open whiteboard (W)" },
    hi: { title: "व्हाइटबोर्ड", text: "टेक्स्ट", pen: "पेन", undo: "स्ट्रोक पूर्ववत", clear: "साफ़ करें", hide: "छिपाएँ (W)", close: "बंद करें", auto: "अगली स्लाइड पर साफ़ करें", tip: "व्हाइटबोर्ड खोलें (W)" },
    hinglish: { title: "Whiteboard", text: "Text", pen: "Pen", undo: "Stroke undo", clear: "Clear karo", hide: "Hide (W)", close: "Band karo", auto: "Next slide par clear", tip: "Whiteboard kholo (W)" } };
  const COLORS = ["#2b1a14", "#7a1230", "#1f8a4c", "#1b5fb0", "#d9730d"];
  const S = { open: false, hidden: false, pen: false, color: COLORS[0], fs: 36, strokes: [], autoClear: false };
  let box, txt, cv, g, built = false, cur = null;
  const L = () => WL[(root.GKApp && root.GKApp.lang) || "hinglish"] || WL.hinglish;
  const el = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [x, v] of Object.entries(a)) v == null || v === false ? 0 : v === true ? e.setAttribute(x, "") : x === "class" ? e.className = v : x.startsWith("on") ? e.addEventListener(x.slice(2), v) : e.setAttribute(x, v); k.flat().forEach(c => c != null && e.append(c)); return e; };

  function redraw() {
    if (!g) return; const d = devicePixelRatio || 1; g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.lineCap = g.lineJoin = "round";
    S.strokes.forEach(s => { g.strokeStyle = s.color; g.lineWidth = s.w; g.beginPath(); s.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); if (s.pts.length === 1) g.lineTo(s.pts[0][0] + .1, s.pts[0][1]); g.stroke(); });
  }
  function sizeCanvas() { const b = cv.parentElement, d = devicePixelRatio || 1; cv.width = b.clientWidth * d; cv.height = b.clientHeight * d; cv.style.width = b.clientWidth + "px"; cv.style.height = b.clientHeight + "px"; redraw(); }
  function mode(pen) { S.pen = pen; cv.style.pointerEvents = pen ? "auto" : "none"; box.classList.toggle("pen", pen); box.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("on", (b.dataset.mode === "pen") === pen)); }
  const fs = d => { S.fs = Math.max(16, Math.min(140, S.fs + d)); txt.style.fontSize = S.fs + "px"; };

  function build() {
    const l = L(), btn = (t, title, fn, o = {}) => el("button", Object.assign({ class: "wb-b", type: "button", title, onclick: fn }, o), t);
    txt = el("div", { class: "wb-text", contenteditable: "true", spellcheck: "false", "aria-label": l.title });
    txt.addEventListener("paste", e => { e.preventDefault(); document.execCommand("insertText", false, (e.clipboardData || root.clipboardData).getData("text/plain")); });
    cv = el("canvas", { class: "wb-draw" }); g = cv.getContext("2d");
    let pts = null;
    cv.addEventListener("pointerdown", e => { if (!S.pen) return; cv.setPointerCapture(e.pointerId); const r = cv.getBoundingClientRect(); pts = { color: S.color, w: Math.max(3, S.fs / 9), pts: [[e.clientX - r.left, e.clientY - r.top]] }; S.strokes.push(pts); redraw(); });
    cv.addEventListener("pointermove", e => { if (!pts) return; const r = cv.getBoundingClientRect(); pts.pts.push([e.clientX - r.left, e.clientY - r.top]); redraw(); });
    ["pointerup", "pointercancel"].forEach(t => cv.addEventListener(t, () => { pts = null; }));
    const bar = el("div", { class: "wb-bar" }, el("b", { class: "wb-title" }, l.title), el("span", { class: "grow" }), btn("◐", l.hide, () => hide()), btn("✕", l.close, () => close()));
    const tools = el("div", { class: "wb-tools", onmousedown: e => { if (!e.target.closest("input,select")) e.preventDefault(); } },
      btn(l.text, l.text, () => mode(false), { "data-mode": "text" }), btn(l.pen, l.pen, () => mode(true), { "data-mode": "pen" }),
      btn("B", "Bold", () => document.execCommand("bold")), btn("A−", "A−", () => fs(-4)), btn("A+", "A+", () => fs(4)),
      ...COLORS.map(c => el("button", { class: "wb-sw", type: "button", title: c, style: "background:" + c, onclick: () => { S.color = c; if (!S.pen) { document.execCommand("styleWithCSS", false, true); document.execCommand("foreColor", false, c); } } })),
      btn("↶", l.undo, () => { S.strokes.pop(); redraw(); }), btn(l.clear, l.clear, clear),
      el("label", { class: "wb-auto" }, el("input", { type: "checkbox", onchange: e => { S.autoClear = e.target.checked; } }), l.auto));
    box = el("div", { class: "wb", role: "dialog", "aria-label": l.title, hidden: true }, bar, tools, el("div", { class: "wb-body" }, txt, cv));
    document.body.append(box); built = true;
    new ResizeObserver(sizeCanvas).observe(box);
    bar.addEventListener("pointerdown", e => {      // drag by the header
      if (e.target.closest("button")) return; const r = box.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top; bar.setPointerCapture(e.pointerId);
      const mv = ev => { box.style.left = Math.max(0, Math.min(innerWidth - 80, ev.clientX - dx)) + "px"; box.style.top = Math.max(0, Math.min(innerHeight - 40, ev.clientY - dy)) + "px"; };
      const up = () => { bar.removeEventListener("pointermove", mv); bar.removeEventListener("pointerup", up); }; bar.addEventListener("pointermove", mv); bar.addEventListener("pointerup", up);
    });
  }
  function place() {
    const st = document.querySelector(".stage"), r = st ? st.getBoundingClientRect() : { left: 80, top: 80, width: 900, height: 500 }, port = r.height > r.width;
    const w = Math.max(320, Math.round(port ? r.width * .92 : r.width * .6)), h = Math.max(240, Math.round(r.height * (port ? .4 : .55)));
    Object.assign(box.style, { width: w + "px", height: h + "px", left: Math.round(r.left + (port ? r.width * .04 : r.width * .08)) + "px", top: Math.round(r.top + r.height * .16) + "px" });
  }
  function clear() { txt.innerHTML = ""; S.strokes = []; redraw(); }
  function open() { if (!built) build(); S.open = true; S.hidden = false; clear(); S.fs = 36; txt.style.fontSize = "36px"; mode(false); place(); box.hidden = false; sizeCanvas(); txt.focus(); sync(); }
  function close() { if (!built) return; clear(); S.open = false; S.hidden = false; box.hidden = true; sync(); }          // discards everything
  function hide() { if (!S.open) return; S.hidden = true; box.hidden = true; sync(); }                                     // keeps content
  function show() { if (!S.open) return; S.hidden = false; box.hidden = false; sizeCanvas(); sync(); }
  function toggle() { !S.open ? open() : S.hidden ? show() : hide(); }
  const sync = () => document.querySelectorAll(".wb-btn").forEach(b => b.classList.toggle("active", S.open && !S.hidden));

  root.GKWhiteboard = { open, close, hide, show, toggle, onSlide() { if (S.open && S.autoClear) clear(); }, tip: () => L().tip, sync,
    state: () => ({ open: S.open, hidden: S.hidden, pen: S.pen, fs: S.fs, text: built ? txt.innerText.trim() : "", strokes: S.strokes.length }) };
})(window);
