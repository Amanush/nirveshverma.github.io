/* Turns a question bank (q/a/t or q/opts/ans) into a playable gkturbo.topic deck. */
(function (root) {
  const DL = {
    en: { title: "Play deck", topic: "Topic", all: "All topics", count: "Questions", shuffle: "Shuffle", start: "Start", cancel: "Cancel", note: "Options for this bank are generated from other answers in the same topic." },
    hi: { title: "डेक चलाएँ", topic: "विषय", all: "सभी विषय", count: "प्रश्न", shuffle: "शफ़ल", start: "शुरू करें", cancel: "रद्द करें", note: "इस बैंक के विकल्प उसी विषय के अन्य उत्तरों से बनाए गए हैं।" },
    hinglish: { title: "Deck chalao", topic: "Topic", all: "Saare topics", count: "Questions", shuffle: "Shuffle", start: "Start karo", cancel: "Cancel", note: "Is bank ke options usi topic ke dusre answers se bante hain." } };
  const tagOf = i => i.t || i.topic || "";
  const shuffle = (a, r = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  function distractors(item, pool, all, r) {
    const ans = String(item.a), len = ans.length;
    const uniq = list => [...new Set(list.map(x => String(x.a)))].filter(x => x && x !== ans);
    let c = uniq(pool).filter(x => x.length <= len * 2 + 4 && x.length >= len / 2 - 2);          // plausible length
    if (c.length < 3) c = c.concat(uniq(pool).filter(x => !c.includes(x)));
    if (c.length < 3) c = c.concat(uniq(all).filter(x => !c.includes(x)));
    return shuffle(c, r).slice(0, 3);
  }

  function build(bank, items, o = {}) {
    const r = o.rand || Math.random, tag = o.tag || "", n = Math.max(1, o.count || 20);
    let sel = items.filter(i => i && i.q && (!tag || tagOf(i) === tag));
    sel = (o.shuffle === false ? sel : shuffle(sel, r)).slice(0, n);
    const slides = sel.map(i => {
      if (Array.isArray(i.opts)) return { type: "quiz", statement: i.q, options: i.opts.slice(), answer: i.ans, explain: i.sol ? [String(i.sol)] : [], trick: "", pyq: [], tag: tagOf(i) };
      const pool = items.filter(x => tagOf(x) === tagOf(i) && x.a != null), opts = shuffle([String(i.a), ...distractors(i, pool, items.filter(x => x.a != null), r)], r);
      return { type: "quiz", statement: i.q, options: opts, answer: opts.indexOf(String(i.a)), explain: [], trick: "", pyq: [], tag: tagOf(i), autoOptions: true };
    }).filter(s => s.options.length >= 2);
    return { schema: "gkturbo.topic/1", id: "deck-" + slug(bank.id) + "-" + slug(tag || "mixed").slice(0, 24) + "-" + Date.now().toString(36),
      title: bank.name + (tag ? ": " + tag : " — Mixed"), subtitle: slides.length + " questions", category: bank.name, exams: ["Practice"], language: bank.id === "hindi" ? "hi" : "en", slides };
  }

  function dialog(bank, items, lang, onStart) {
    const L = DL[lang] || DL.hinglish, counts = {}; items.forEach(i => { const t = tagOf(i); if (t) counts[t] = (counts[t] || 0) + 1; });
    const el = (t, a = {}, ...k) => { const e = document.createElement(t); Object.entries(a).forEach(([x, v]) => v === true ? e.setAttribute(x, "") : v != null && e.setAttribute(x, v)); k.flat().forEach(c => e.append(c)); return e; };
    const sel = el("select", {}, el("option", { value: "" }, L.all + " (" + items.length + ")"), ...Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t, c]) => el("option", { value: t }, t + " (" + c + ")")));
    const cnt = el("input", { type: "number", min: 1, max: 200, value: 20 }), sh = el("input", { type: "checkbox", checked: true });
    const d = el("dialog", { class: "dlg" }, el("h3", {}, L.title + ": " + bank.name),
      el("label", {}, L.topic, sel), el("label", {}, L.count, cnt), el("label", { class: "tg" }, sh, L.shuffle),
      !items.some(i => Array.isArray(i.opts)) ? el("p", { class: "note" }, L.note) : null,
      el("div", { class: "row" }, el("button", { class: "btn", type: "button" }, L.cancel), el("button", { class: "btn primary", type: "button" }, L.start)));
    const [bc, bs] = d.querySelectorAll("button"); bc.onclick = () => { d.close(); d.remove(); };
    bs.onclick = () => { onStart({ tag: sel.value, count: +cnt.value || 20, shuffle: sh.checked }); d.close(); d.remove(); };
    document.body.append(d); d.showModal();
  }
  root.GKDecks = { build, dialog, shuffle };
  if (typeof module !== "undefined") module.exports = root.GKDecks;
})(typeof window !== "undefined" ? window : globalThis);
