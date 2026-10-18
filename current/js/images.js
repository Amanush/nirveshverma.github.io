/* GK Turbo images: fetch/upload/paste/drop -> local asset (IndexedDB blob + relative path in JSON), figures, crop, save-to-folder. */
(function (root) {
  const IL = {
    en: { title: "Add or replace image", url: "Image URL", fetch: "Fetch", file: "Upload file", paste: "Paste from clipboard", drop: "Drop an image here, or press Ctrl+V", alt: "Alt text (describe the image)", source: "Source / credit (optional)", use: "Use this image", linked: "Use linked URL", cancel: "Cancel", current: "Current image", fetching: "Fetching…",
      failed: "Could not download this image. The site may block downloads (CORS), the link may be wrong, or you may be offline. Your current image was not changed.", open: "Open image in new tab", tip: "Tip: open it, right-click → Copy image, return here and press Ctrl+V.",
      linkedNote: "The image displays but cannot be saved locally. You can link to it (needs internet while presenting).", notimg: "That is not an image.", notUrl: "Enter a full http(s) address.", clipFail: "Clipboard access was blocked. Click in this box and press Ctrl+V instead.", noClip: "No image found on the clipboard.",
      saved: "Saved {n} file(s) into your folder.", none: "Nothing to save: no new images or audio.", downloads: "Downloading {n} file(s). Move them into the assets/ folder.", missing: "Image not found:" },
    hi: { title: "चित्र जोड़ें या बदलें", url: "चित्र URL", fetch: "लाएँ", file: "फ़ाइल अपलोड", paste: "क्लिपबोर्ड से चिपकाएँ", drop: "चित्र यहाँ छोड़ें, या Ctrl+V दबाएँ", alt: "Alt टेक्स्ट (चित्र का वर्णन)", source: "स्रोत / श्रेय (वैकल्पिक)", use: "यह चित्र लगाएँ", linked: "लिंक की गई URL लगाएँ", cancel: "रद्द करें", current: "वर्तमान चित्र", fetching: "ला रहे हैं…",
      failed: "यह चित्र डाउनलोड नहीं हो सका। साइट डाउनलोड रोक सकती है (CORS), लिंक गलत हो सकता है या आप ऑफ़लाइन हो सकते हैं। आपका वर्तमान चित्र नहीं बदला।", open: "चित्र नए टैब में खोलें", tip: "सुझाव: उसे खोलें, राइट-क्लिक → Copy image, फिर यहाँ आकर Ctrl+V दबाएँ।",
      linkedNote: "चित्र दिख रहा है पर स्थानीय रूप से सहेजा नहीं जा सकता। आप लिंक कर सकते हैं (प्रस्तुति के समय इंटरनेट चाहिए)।", notimg: "यह चित्र नहीं है।", notUrl: "पूरा http(s) पता लिखें।", clipFail: "क्लिपबोर्ड एक्सेस रोका गया। इस बॉक्स में क्लिक करके Ctrl+V दबाएँ।", noClip: "क्लिपबोर्ड में कोई चित्र नहीं मिला।",
      saved: "{n} फ़ाइल आपके फ़ोल्डर में सहेजी गईं।", none: "सहेजने को कुछ नहीं: कोई नया चित्र या ऑडियो नहीं।", downloads: "{n} फ़ाइल डाउनलोड हो रही हैं। उन्हें assets/ फ़ोल्डर में रखें।", missing: "चित्र नहीं मिला:" },
    hinglish: { title: "Image add ya replace karo", url: "Image URL", fetch: "Fetch karo", file: "File upload", paste: "Clipboard se paste", drop: "Image yahan drop karo, ya Ctrl+V dabao", alt: "Alt text (image ka description)", source: "Source / credit (optional)", use: "Ye image lagao", linked: "Linked URL lagao", cancel: "Cancel", current: "Abhi ki image", fetching: "Fetch ho raha hai…",
      failed: "Ye image download nahi ho saki. Site download block kar sakti hai (CORS), link galat ho sakta hai ya aap offline ho sakte ho. Aapki current image nahi badli.", open: "Image new tab mein kholo", tip: "Tip: kholo, right-click → Copy image, wapas aakar Ctrl+V dabao.",
      linkedNote: "Image dikh rahi hai par local save nahi ho sakti. Link kar sakte ho (presentation ke time internet chahiye).", notimg: "Ye image nahi hai.", notUrl: "Poora http(s) address likho.", clipFail: "Clipboard access block hua. Is box mein click karke Ctrl+V dabao.", noClip: "Clipboard mein image nahi mili.",
      saved: "{n} file aapke folder mein save ho gayi.", none: "Save karne ko kuch nahi: koi nayi image ya audio nahi.", downloads: "{n} file download ho rahi hain. Unhe assets/ folder mein rakho.", missing: "Image nahi mili:" } };
  const REMOTE = /^(https?:|data:|blob:)/, MAXW = 1600, EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg" };
  const cache = new Map(), ratios = new Map();
  const IM = () => IL[(root.GKApp && root.GKApp.lang) || "hinglish"] || IL.hinglish;
  const el = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [x, v] of Object.entries(a)) v == null || v === false ? 0 : v === true ? e.setAttribute(x, "") : x === "class" ? e.className = v : x.startsWith("on") ? e.addEventListener(x.slice(2), v) : e.setAttribute(x, v); k.flat().forEach(c => c != null && e.append(c)); return e; };
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const norm = im => !im ? null : typeof im === "string" ? { src: im, alt: "", source: "" } : im;
  const resolve = src => REMOTE.test(src) ? src : (cache.get(src) || src);
  const paths = t => [...new Set(t.slides.flatMap(s => [norm(s.image) && norm(s.image).src, s.narration && s.narration.audio]).filter(x => x && !REMOTE.test(x)))];
  const needsPrime = t => paths(t).some(p => !cache.has(p));
  async function prime(t) { for (const p of paths(t).filter(p => !cache.has(p))) { try { const r = await GK.Storage.getAsset(p); cache.set(p, r ? URL.createObjectURL(r.blob) : null); } catch (e) { cache.set(p, null); } } }
  function normalizeTopic(t) { t.slides.forEach(s => { if (typeof s.image === "string") s.image = { src: s.image, alt: "", source: "" }; }); return t; }

  function figure(s, i) {
    const im = norm(s.image); if (!im || !im.src) return null;
    const path = "slides." + i + ".image", fig = el("figure", { class: "fig", "data-img": path }), img = el("img", { alt: im.alt || "", src: resolve(im.src), draggable: "false" });
    const apply = () => {
      const r = ratios.get(im.src); if (!r) return; const c = im.crop;
      if (!c) { fig.style.aspectRatio = r.w + " / " + r.h; return; }
      const cw = 1 - (c.l + c.r) / 100, ch = 1 - (c.t + c.b) / 100; fig.style.aspectRatio = (r.w * cw) + " / " + (r.h * ch); fig.classList.add("cropped");
      Object.assign(img.style, { left: (-c.l / cw) + "%", top: (-c.t / ch) + "%", width: (100 / cw) + "%", height: (100 / ch) + "%" });
    };
    apply();
    img.addEventListener("load", () => { if (!ratios.has(im.src)) { ratios.set(im.src, { w: img.naturalWidth || 4, h: img.naturalHeight || 3 }); apply(); if (Math.abs(img.naturalWidth / img.naturalHeight - 4 / 3) > .01 && root.GKImages.onRatio) root.GKImages.onRatio(); } });
    img.addEventListener("error", () => { fig.classList.add("missing"); fig.style.aspectRatio = ""; fig.replaceChildren(el("div", { class: "img-missing" }, IM().missing + " " + im.src)); });
    fig.append(img); if (im.source) fig.append(el("figcaption", { "data-path": path + ".source" }, im.source)); return fig;
  }

  async function prepare(blob) {
    if (!/^image\/(png|jpeg|webp)$/.test(blob.type)) return blob;
    try { const bmp = await createImageBitmap(blob); if (bmp.width <= MAXW) return blob;
      const c = document.createElement("canvas"); c.width = MAXW; c.height = Math.round(bmp.height * MAXW / bmp.width); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      return await new Promise(r => c.toBlob(b => r(b || blob), blob.type === "image/png" ? "image/png" : "image/jpeg", .9)); } catch (e) { return blob; }
  }
  async function fromURL(url) { const r = await fetch(url, { mode: "cors" }); if (!r.ok) throw new Error("HTTP " + r.status); const b = await r.blob(); if (!/^image\//.test(b.type)) throw new Error(IM().notimg); return b; }
  const probe = url => new Promise(res => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = url; });

  function dialog(o) {
    const l = IL[o.lang] || IL.hinglish, ex = norm(o.topic.slides[o.idx].image); let pending = null;
    const urlIn = el("input", { type: "url", placeholder: "https://…", "aria-label": l.url }), fetchBtn = el("button", { class: "btn", type: "button" }, l.fetch);
    const fileIn = el("input", { type: "file", accept: "image/*", "aria-label": l.file }), pasteBtn = el("button", { class: "btn", type: "button" }, l.paste);
    const drop = el("div", { class: "drop", tabindex: "0" }, l.drop), prev = el("div", { class: "prev" }), msg = el("div", { class: "msg", role: "status" });
    const alt = el("input", { type: "text", placeholder: l.alt, value: ex ? ex.alt || "" : "", "aria-label": l.alt }), src = el("input", { type: "text", placeholder: l.source, value: ex ? ex.source || "" : "", "aria-label": l.source });
    const useBtn = el("button", { class: "btn primary", type: "button", disabled: true }, l.use), linkBtn = el("button", { class: "btn", type: "button", hidden: true }, l.linked), cancel = el("button", { class: "btn", type: "button" }, l.cancel);
    const bigCb = el("input", { type: "checkbox", checked: !ex || ex.layout !== "side" }), bigLbl = el("label", { class: "tg" }, bigCb, "Big picture (best for charts)");
    const d = el("dialog", { class: "dlg imgdlg" }, el("h3", {}, l.title), ex ? el("p", { class: "note" }, l.current + ": " + ex.src) : null,
      el("div", { class: "row2" }, urlIn, fetchBtn), el("div", { class: "row2" }, fileIn, pasteBtn), drop, prev, msg, alt, src, bigLbl, el("div", { class: "row" }, cancel, linkBtn, useBtn));
    const close = () => { document.removeEventListener("paste", onPaste); d.close(); d.remove(); };
    const show = u => prev.replaceChildren(el("img", { src: u, alt: "" }));
    async function setBlob(blob, name, url) { const b = await prepare(blob); pending = { blob: b, name: name || "image", url }; show(URL.createObjectURL(b)); msg.textContent = ""; useBtn.disabled = false; linkBtn.hidden = true; }
    async function fail(url, err) {
      pending = null; useBtn.disabled = true; linkBtn.hidden = true; prev.replaceChildren(); msg.replaceChildren(el("div", { class: "bad" }, l.failed + (err ? " (" + err.message + ")" : "")), el("a", { href: url, target: "_blank", rel: "noopener" }, l.open), el("div", {}, l.tip));
      if (await probe(url)) { show(url); pending = { linked: url }; linkBtn.hidden = false; msg.append(el("div", {}, l.linkedNote)); }
    }
    async function doFetch() {
      const u = urlIn.value.trim(); if (!/^https?:\/\//i.test(u)) { msg.textContent = l.notUrl; return; } msg.textContent = l.fetching; linkBtn.hidden = true;
      try { await setBlob(await fromURL(u), u.split("/").pop().split("?")[0], u); } catch (e) { await fail(u, e); }
    }
    const onPaste = e => { const it = [...((e.clipboardData && e.clipboardData.items) || [])].find(x => x.type.startsWith("image/")); if (it) { e.preventDefault(); setBlob(it.getAsFile(), "pasted"); } };
    document.addEventListener("paste", onPaste);
    fetchBtn.onclick = doFetch; urlIn.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); doFetch(); } };
    fileIn.onchange = () => { const f = fileIn.files[0]; if (f) f.type.startsWith("image/") ? setBlob(f, f.name) : msg.textContent = l.notimg; };
    pasteBtn.onclick = async () => { try { for (const it of await navigator.clipboard.read()) { const t = it.types.find(x => x.startsWith("image/")); if (t) return setBlob(await it.getType(t), "pasted"); } msg.textContent = l.noClip; } catch (e) { msg.textContent = l.clipFail; } };
    drop.ondragover = e => e.preventDefault();
    drop.ondrop = e => { e.preventDefault(); const f = [...e.dataTransfer.files].find(x => x.type.startsWith("image/")); if (f) return setBlob(f, f.name); const u = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain"); if (/^https?:/i.test(u)) { urlIn.value = u.trim(); doFetch(); } };
    useBtn.onclick = async () => {
      if (!pending || !pending.blob) return; const a = alt.value.trim() || o.fallbackAlt || "", ext = EXT[pending.blob.type] || "png";
      const path = "assets/" + slug(o.topic.id) + "-s" + (o.idx + 1) + "-" + Date.now().toString(36) + "." + ext;
      await GK.Storage.putAsset({ path, blob: pending.blob, type: pending.blob.type, name: pending.name, from: pending.url || "", onDisk: false }); cache.set(path, URL.createObjectURL(pending.blob));
      o.onPlace({ src: path, alt: a, source: src.value.trim(), layout: bigCb.checked ? "big" : "side" }); close();
    };
    linkBtn.onclick = () => { if (pending && pending.linked) { o.onPlace({ src: pending.linked, alt: alt.value.trim() || o.fallbackAlt || "", source: src.value.trim(), layout: bigCb.checked ? "big" : "side" }); close(); } };
    cancel.onclick = close; d.addEventListener("cancel", () => close());
    document.body.append(d); d.showModal(); urlIn.focus();
  }

  async function saveAssets() {
    const l = IM(), all = (await GK.Storage.allAssets()).filter(a => !a.onDisk); if (!all.length) return l.none;
    if (root.showDirectoryPicker) {
      const dir = await root.showDirectoryPicker({ mode: "readwrite" });
      for (const a of all) {
        const parts = a.path.split("/"), sub = dir.name === "assets" ? parts.slice(1, -1) : parts.slice(0, -1); let h = dir;
        for (const p of sub) h = await h.getDirectoryHandle(p, { create: true });
        const w = await (await h.getFileHandle(parts[parts.length - 1], { create: true })).createWritable(); await w.write(a.blob); await w.close(); a.onDisk = true; await GK.Storage.putAsset(a);
      }
      return l.saved.replace("{n}", all.length);
    }
    all.forEach(a => el("a", { href: URL.createObjectURL(a.blob), download: a.path.split("/").pop() }).click()); return l.downloads.replace("{n}", all.length);
  }
  root.GKImages = { cache, resolve, norm, prime, needsPrime, normalizeTopic, figure, dialog, saveAssets, prepare, fromURL, onRatio: null, ratios };
})(window);
