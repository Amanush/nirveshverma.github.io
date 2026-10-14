/* GK Turbo data layer: validation, bank adapter, undo/redo, IndexedDB save + snapshots, export/import. */
(function (root) {
  const SLIDE_TYPES = ["title","overview","facts","map","timeline","compare","trick","quiz","summary"];
  const LANGS = ["en","hi","hinglish"];

  function validateTopic(t) {
    const e = [];
    if (!t || typeof t !== "object") return ["File is not a JSON object"];
    if (t.schema !== "gkturbo.topic/1") e.push('schema must be "gkturbo.topic/1"');
    if (!/^[a-z0-9-]+$/.test(t.id || "")) e.push("id must be lowercase letters, digits, hyphens");
    if (!t.title) e.push("title is missing");
    if (t.language && !LANGS.includes(t.language)) e.push("language must be en, hi or hinglish");
    if (!Array.isArray(t.slides) || !t.slides.length) e.push("slides must be a non-empty list");
    (t.slides || []).forEach((s, i) => {
      const p = "slide " + (i + 1) + ": ";
      if (!SLIDE_TYPES.includes(s.type)) return e.push(p + "unknown type " + s.type);
      if (s.image != null && !(typeof s.image === "string" || (typeof s.image === "object" && typeof s.image.src === "string"))) e.push(p + "image must be a path or {src, alt, source}");
      if (s.narration != null && typeof s.narration !== "object") e.push(p + "narration must be an object");
      if (s.type === "quiz") {
        if (!s.statement) e.push(p + "statement missing");
        if (!Array.isArray(s.options) || s.options.length < 2) e.push(p + "needs 2+ options");
        else if (!Number.isInteger(s.answer) || s.answer < 0 || s.answer >= s.options.length) e.push(p + "answer must be a valid option index");
      } else if (!s.heading) e.push(p + "heading missing");
    });
    return e;
  }

  /* Bank item -> quiz slide. qa banks have no options (built later from same-topic answers). */
  function bankToQuiz(item) {
    if (Array.isArray(item.opts)) {
      return { type: "quiz", statement: item.q, options: item.opts.slice(), answer: item.ans, explain: item.sol ? [item.sol] : [], trick: "", pyq: [], tag: item.topic || "" };
    }
    return { type: "quiz", statement: item.q, options: null, answerText: item.a, explain: [], trick: "", pyq: [], tag: item.t || "" };
  }

  class History {
    constructor(initial, limit = 100) { this.limit = limit; this.stack = [JSON.stringify(initial)]; this.i = 0; }
    get current() { return JSON.parse(this.stack[this.i]); }
    push(state) {
      const s = JSON.stringify(state);
      if (s === this.stack[this.i]) return false;
      this.stack = this.stack.slice(0, this.i + 1); this.stack.push(s);
      if (this.stack.length > this.limit) this.stack.shift();
      this.i = this.stack.length - 1; return true;
    }
    get canUndo() { return this.i > 0; }
    get canRedo() { return this.i < this.stack.length - 1; }
    undo() { if (this.canUndo) this.i--; return this.current; }
    redo() { if (this.canRedo) this.i++; return this.current; }
  }

  /* Topic-level edits touch only the targeted slide; everything else is preserved. */
  function updateSlide(topic, index, patch) {
    const next = JSON.parse(JSON.stringify(topic));
    next.slides[index] = Object.assign({}, next.slides[index], patch);
    return next;
  }
  const moveSlide = (t, from, to) => { const n = JSON.parse(JSON.stringify(t)); n.slides.splice(to, 0, n.slides.splice(from, 1)[0]); return n; };
  const duplicateSlide = (t, i) => { const n = JSON.parse(JSON.stringify(t)); n.slides.splice(i + 1, 0, JSON.parse(JSON.stringify(n.slides[i]))); return n; };
  const deleteSlide = (t, i) => { const n = JSON.parse(JSON.stringify(t)); if (n.slides.length > 1) n.slides.splice(i, 1); return n; };

  /* IndexedDB: stores "topics" (latest saved) and "snapshots" (versioned backups). */
  const DB = "gkturbo", MAX_SNAPSHOTS = 20;
  function open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 2);
      r.onupgradeneeded = () => { const d = r.result;
        if (!d.objectStoreNames.contains("topics")) d.createObjectStore("topics", { keyPath: "id" });
        if (!d.objectStoreNames.contains("snapshots")) d.createObjectStore("snapshots", { keyPath: "key" }).createIndex("topic", "topicId");
        if (!d.objectStoreNames.contains("assets")) d.createObjectStore("assets", { keyPath: "path" }); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  const tx = (db, store, mode, fn) => new Promise((res, rej) => { const t = db.transaction(store, mode); const out = fn(t.objectStore(store)); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); });

  const Storage = {
    async save(topic) {
      const db = await open(), ts = Date.now();
      await tx(db, "topics", "readwrite", s => s.put({ id: topic.id, savedAt: ts, data: topic }));
      await tx(db, "snapshots", "readwrite", s => s.put({ key: topic.id + ":" + ts, topicId: topic.id, ts, data: topic }));
      const all = await Storage.snapshots(topic.id);
      if (all.length > MAX_SNAPSHOTS) { const d2 = await open(); for (const old of all.slice(MAX_SNAPSHOTS)) await tx(d2, "snapshots", "readwrite", s => s.delete(old.key)); }
      return ts;
    },
    async load(id) { const db = await open(); return tx(db, "topics", "readonly", s => s.get(id)); },
    async putAsset(rec) { const db = await open(); return tx(db, "assets", "readwrite", s => s.put(rec)); },
    async getAsset(path) { const db = await open(); return tx(db, "assets", "readonly", s => s.get(path)); },
    async allAssets() { const db = await open(); return (await tx(db, "assets", "readonly", s => s.getAll())) || []; },
    async all() { const db = await open(); return (await tx(db, "topics", "readonly", s => s.getAll())) || []; },
    async snapshots(id) { const db = await open(); const all = await tx(db, "snapshots", "readonly", s => s.index("topic").getAll(id)); return (all || []).sort((a, b) => b.ts - a.ts); }
  };

  /* Export / import */
  const toJSON = t => JSON.stringify(t, null, 2);
  function parseImport(text) {
    let obj; try { obj = JSON.parse(text); } catch (x) { return { ok: false, errors: ["Not valid JSON: " + x.message] }; }
    const errors = validateTopic(obj); return errors.length ? { ok: false, errors } : { ok: true, topic: obj };
  }

  root.GK = { validateTopic, bankToQuiz, History, updateSlide, moveSlide, duplicateSlide, deleteSlide, Storage, toJSON, parseImport, SLIDE_TYPES };
  if (typeof module !== "undefined") module.exports = root.GK;
})(typeof window !== "undefined" ? window : globalThis);
