/* GK Turbo editing: pure topic operations (testable in Node) + click-to-edit wiring for the stage. */
(function (root) {
  const clone = x => JSON.parse(JSON.stringify(x));
  const get = (o, p) => p.split(".").reduce((a, k) => a == null ? a : a[k], o);
  function setPath(t, path, val) { const n = clone(t), ks = path.split("."); let o = n; for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; } o[ks[ks.length - 1]] = val; return n; }
  const rel = (path, i) => path.replace(new RegExp("^slides\\." + i + "\\."), "");

  const SKEL = {
    title: () => ({ type: "title", heading: "New title", tagline: "", image: null }),
    overview: () => ({ type: "overview", heading: "New slide", points: ["Point 1", "Point 2"] }),
    facts: () => ({ type: "facts", heading: "Key Facts", items: [{ label: "Label", value: "Value" }] }),
    map: () => ({ type: "map", heading: "Map", image: null, labels: [{ text: "Place", note: "Note" }] }),
    timeline: () => ({ type: "timeline", heading: "Timeline", events: [{ when: "When", what: "What" }] }),
    compare: () => ({ type: "compare", heading: "Compare", left: { title: "A", points: ["Point"] }, right: { title: "B", points: ["Point"] } }),
    trick: () => ({ type: "trick", heading: "Memory Trick", mnemonic: "Your mnemonic", decode: [{ key: "Key", meaning: "Meaning" }] }),
    quiz: () => ({ type: "quiz", statement: "Write the statement with a ____ blank.", options: ["Option A", "Option B", "Option C", "Option D"], answer: 0, explain: ["Why it is right"], trick: "", pyq: [] }),
    summary: () => ({ type: "summary", heading: "Revise in 30 seconds", points: ["Point 1"] }) };
  const LISTS = { overview: s => [s.points, () => "New point"], summary: s => [s.points, () => "New point"], facts: s => [s.items, () => ({ label: "Label", value: "Value" })],
    timeline: s => [s.events, () => ({ when: "When", what: "What" })], map: s => [s.labels, () => ({ text: "Place", note: "Note" })],
    compare: s => [s.left.points, () => "New point"], trick: s => [s.decode = s.decode || [], () => ({ key: "Key", meaning: "Meaning" })], quiz: s => [s.options, () => "New option"] };

  const addSlide = (t, after, type) => { const n = clone(t); n.slides.splice(after + 1, 0, SKEL[type]()); return n; };
  function addItem(t, i) { const n = clone(t), f = LISTS[n.slides[i].type]; if (f) { const [a, mk] = f(n.slides[i]); a.push(mk()); } return n; }
  function removeItem(t, i) {
    const n = clone(t), s = n.slides[i], f = LISTS[s.type]; if (!f) return n; const [a] = f(s), min = s.type === "quiz" ? 2 : 1;
    if (a.length > min) { a.pop(); if (s.type === "quiz" && s.answer >= a.length) s.answer = a.length - 1; } return n;
  }
  function setStyle(t, i, rp, patch) {
    const n = clone(t), s = n.slides[i]; s.style = s.style || {}; const c = Object.assign({}, s.style[rp], patch);
    Object.keys(c).forEach(k => (c[k] == null || c[k] === "") && delete c[k]);
    Object.keys(c).length ? s.style[rp] = c : delete s.style[rp]; if (!Object.keys(s.style).length) delete s.style; return n;
  }
  function nudge(t, i, asp, rp, dx, dy) {
    const n = clone(t), s = n.slides[i]; s.layout = s.layout || {}; const a = s.layout[asp] = s.layout[asp] || {}, c = a[rp] || { dx: 0, dy: 0 };
    a[rp] = { dx: +(c.dx + dx).toFixed(2), dy: +(c.dy + dy).toFixed(2) }; return n;
  }
  function resetElement(t, i, rp) {
    const n = clone(t), s = n.slides[i]; if (s.style) { delete s.style[rp]; if (!Object.keys(s.style).length) delete s.style; }
    if (s.layout) { for (const a of Object.keys(s.layout)) { delete s.layout[a][rp]; if (!Object.keys(s.layout[a]).length) delete s.layout[a]; } if (!Object.keys(s.layout).length) delete s.layout; } return n;
  }

  const imgObj = im => !im ? null : typeof im === "string" ? { src: im, alt: "", source: "" } : im;
  const setImage = (t, i, im) => { const n = clone(t); n.slides[i].image = im; return n; };
  function removeImage(t, i) { const n = resetElement(t, i, "image"); n.slides[i].image = null; return n; }
  function setCrop(t, i, patch) {
    const n = clone(t), im = imgObj(n.slides[i].image); if (!im) return n;
    const c = Object.assign({ l: 0, t: 0, r: 0, b: 0 }, im.crop, patch); ["l", "t", "r", "b"].forEach(k => c[k] = Math.max(0, Math.min(70, c[k])));
    if (c.l + c.r > 85 || c.t + c.b > 85) return n; if (!c.l && !c.t && !c.r && !c.b) delete im.crop; else im.crop = c; n.slides[i].image = im; return n;
  }
  /* ---- DOM side ---- */
  const INLINE = ["SPAN", "B", "I", "EM", "MARK"];
  function style(container, slide, i, aspect) {       // apply stored font/position tweaks
    container.querySelectorAll("[data-path],[data-img]").forEach(e => {
      const rp = rel(e.dataset.path || e.dataset.img, i), st = slide.style && slide.style[rp];
      if (st) { if (st.size) e.style.zoom = st.size; if (st.weight) e.style.fontWeight = st.weight; if (st.align) e.style.textAlign = st.align; if (st.lh) e.style.lineHeight = st.lh; if (st.color) e.style.color = st.color; }
      const l = slide.layout && slide.layout[aspect] && slide.layout[aspect][rp];
      if (l && (l.dx || l.dy)) { if (INLINE.includes(e.tagName)) e.style.display = "inline-block"; e.style.transform = "translate(" + l.dx + "cqw," + l.dy + "cqw)"; }
    });
  }
  function enable(stage) {
    const A = GKEdit.api; stage.classList.add("editmode");
    stage.querySelectorAll("[data-img]").forEach(f => { f.classList.add("ed-img"); if (A.sel() === f.dataset.img) f.classList.add("sel"); f.addEventListener("click", () => A.select(f.dataset.img)); });
    stage.querySelectorAll("[data-path]").forEach(e => {
      const path = e.dataset.path; e.contentEditable = "true"; e.spellcheck = false; if (A.sel() === path) e.classList.add("sel");
      e.addEventListener("focus", () => { A.select(path); e.textContent = String(A.get(path) == null ? "" : A.get(path)); e.classList.add("editing"); });
      e.addEventListener("blur", () => { e.classList.remove("editing"); A.commitText(path, e.innerText.replace(/\u00a0/g, " ").trim()); A.afterBlur(); });
      e.addEventListener("keydown", ev => { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); e.blur(); } else if (ev.key === "Escape") { e.textContent = String(A.get(path) == null ? "" : A.get(path)); e.blur(); } });
      e.addEventListener("paste", ev => { ev.preventDefault(); document.execCommand("insertText", false, (ev.clipboardData || root.clipboardData).getData("text/plain")); });
    });
    stage.querySelectorAll(".opt i[data-k]").forEach(i => { i.classList.add("pickable"); i.addEventListener("click", () => A.setAnswer(+i.dataset.k)); });
  }

  const EL = {
    en: { edit: "Edit", editing: "Editing", panels: "Panels", explain: "Explanation", trick: "Memory trick", pyq: "PYQ", resetLayout: "Reset layout", slide: "Slide", add: "Add", dup: "Duplicate", del: "Delete", up: "Up", down: "Down", addItem: "+ Item", delItem: "− Item", none: "Click any text to select it. Click a letter badge to set the correct answer.", sel: "Selected", bold: "Bold", lh: "Spacing", color: "Color", move: "Move", resetEl: "Reset element", slides: "Slides", confirmDel: "Delete this slide?", present: "Present", exit: "Exit", resetPres: "Reset presentation", safe: "Safe margins", guides: "Guides", homeKey: "Home key", pressKey: "Press a key…", wb: "Whiteboard", audio: "Audio bar", saveAssets: "Save images & audio…", img: "Image…", imgRemove: "Remove image", crop: "Crop", cropReset: "Reset crop" },
    hi: { edit: "संपादन", editing: "संपादन चालू", panels: "पैनल", explain: "व्याख्या", trick: "याद रखने की ट्रिक", pyq: "PYQ", resetLayout: "लेआउट रीसेट", slide: "स्लाइड", add: "जोड़ें", dup: "प्रतिलिपि", del: "हटाएँ", up: "ऊपर", down: "नीचे", addItem: "+ आइटम", delItem: "− आइटम", none: "चुनने के लिए किसी भी टेक्स्ट पर क्लिक करें। सही उत्तर तय करने के लिए अक्षर पर क्लिक करें।", sel: "चयनित", bold: "बोल्ड", lh: "पंक्ति दूरी", color: "रंग", move: "खिसकाएँ", resetEl: "तत्व रीसेट", slides: "स्लाइड", confirmDel: "यह स्लाइड हटाएँ?", present: "प्रस्तुति", exit: "बाहर", resetPres: "प्रस्तुति रीसेट", safe: "सुरक्षित मार्जिन", guides: "गाइड", homeKey: "होम कुंजी", pressKey: "कोई कुंजी दबाएँ…", wb: "व्हाइटबोर्ड", audio: "ऑडियो बार", saveAssets: "चित्र व ऑडियो सहेजें…", img: "चित्र…", imgRemove: "चित्र हटाएँ", crop: "क्रॉप", cropReset: "क्रॉप रीसेट" },
    hinglish: { edit: "Edit", editing: "Editing on", panels: "Panels", explain: "Explanation", trick: "Memory trick", pyq: "PYQ", resetLayout: "Layout reset", slide: "Slide", add: "Add", dup: "Duplicate", del: "Delete", up: "Upar", down: "Neeche", addItem: "+ Item", delItem: "− Item", none: "Select karne ke liye kisi text par click karo. Sahi answer set karne ke liye letter par click karo.", sel: "Selected", bold: "Bold", lh: "Spacing", color: "Color", move: "Move", resetEl: "Element reset", slides: "Slides", confirmDel: "Ye slide delete karein?", present: "Present", exit: "Exit", resetPres: "Presentation reset", safe: "Safe margins", guides: "Guides", homeKey: "Home key", pressKey: "Koi key dabao…", wb: "Whiteboard", audio: "Audio bar", saveAssets: "Images & audio save karo…", img: "Image…", imgRemove: "Image hatao", crop: "Crop", cropReset: "Crop reset" } };

  root.GKEdit = { mode: false, api: null, get, setPath, rel, addSlide, addItem, removeItem, setStyle, nudge, resetElement, setImage, removeImage, setCrop, imgObj, style, enable, L: l => EL[l] || EL.hinglish, SKEL };
  if (typeof module !== "undefined") module.exports = root.GKEdit;
})(typeof window !== "undefined" ? window : globalThis);
