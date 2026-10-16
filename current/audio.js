/* GK Turbo audio status bar: sequence display (question -> countdown -> answer -> explanation) + optional narration file / recording.
   Timer and narration are independent. No microphone is needed unless you press Record. */
(function (root) {
  const AL = {
    en: { audio: "Audio", q: "Question narration", c: "Countdown", a: "Answer", e: "Explanation", n: "Narration", play: "▶ Play", pause: "❚❚ Pause", replay: "↺ Replay", mute: "Mute", unmute: "Unmute", auto: "Auto-play", up: "Upload audio", rec: "● Record", stop: "■ Stop", rm: "Remove audio", none: "No narration file for this slide", script: "Narration script (not spoken, a note for you)…", micErr: "Microphone unavailable or permission denied. You can upload an audio file instead.", missing: "Audio file not found" },
    hi: { audio: "ऑडियो", q: "प्रश्न वाचन", c: "उलटी गिनती", a: "उत्तर", e: "व्याख्या", n: "वाचन", play: "▶ चलाएँ", pause: "❚❚ रोकें", replay: "↺ फिर से", mute: "म्यूट", unmute: "अनम्यूट", auto: "ऑटो-प्ले", up: "ऑडियो अपलोड", rec: "● रिकॉर्ड", stop: "■ रोकें", rm: "ऑडियो हटाएँ", none: "इस स्लाइड के लिए वाचन फ़ाइल नहीं है", script: "वाचन स्क्रिप्ट (बोली नहीं जाती, आपके लिए नोट)…", micErr: "माइक्रोफ़ोन उपलब्ध नहीं या अनुमति नहीं मिली। आप ऑडियो फ़ाइल अपलोड कर सकते हैं।", missing: "ऑडियो फ़ाइल नहीं मिली" },
    hinglish: { audio: "Audio", q: "Question narration", c: "Countdown", a: "Answer", e: "Explanation", n: "Narration", play: "▶ Play", pause: "❚❚ Pause", replay: "↺ Replay", mute: "Mute", unmute: "Unmute", auto: "Auto-play", up: "Audio upload", rec: "● Record", stop: "■ Stop", rm: "Audio hatao", none: "Is slide ke liye narration file nahi hai", script: "Narration script (bola nahi jata, aapke liye note)…", micErr: "Microphone available nahi ya permission nahi mili. Audio file upload kar sakte ho.", missing: "Audio file nahi mili" } };
  const S = { muted: false, auto: false };
  let cur = null, R = {}, rec = null, bad = false;
  const L = () => AL[(root.GKApp && root.GKApp.lang) || "hinglish"] || AL.hinglish;
  const el = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [x, v] of Object.entries(a)) v == null || v === false ? 0 : v === true ? e.setAttribute(x, "") : x === "class" ? e.className = v : x.startsWith("on") ? e.addEventListener(x.slice(2), v) : e.setAttribute(x, v); k.flat().forEach(c => c != null && e.append(c)); return e; };
  const audioEl = () => cur && cur.el;

  function refresh() {
    if (!R.bar || !R.bar.isConnected) return; const a = audioEl(), l = L(), playing = !!a && !a.paused && !a.ended;
    if (R.play) { R.play.textContent = playing ? l.pause : l.play; R.play.disabled = !a || bad; R.replay.disabled = !a || bad; R.play.title = a ? "" : l.none; }
    if (R.mute) R.mute.textContent = S.muted ? l.unmute : l.mute;
    const quiz = R.quiz, ph = quiz ? (root.GKQuiz ? root.GKQuiz.phase() : "question") : "narration";
    R.bar.querySelectorAll(".ph").forEach(p => { const on = quiz ? p.dataset.ph === ph : playing; p.classList.toggle("on", on); p.classList.toggle("playing", on && playing); });
  }
  function toggle() { const a = audioEl(); if (!a || bad) return; a.paused || a.ended ? a.play().catch(() => {}) : a.pause(); refresh(); }
  function replay() { const a = audioEl(); if (!a || bad) return; a.currentTime = 0; a.play().catch(() => {}); refresh(); }
  function mute() { S.muted = !S.muted; if (audioEl()) audioEl().muted = S.muted; refresh(); }
  function off() { if (audioEl()) audioEl().pause(); R = {}; }

  async function saveBlob(blob, i, name) {
    const t = root.GKApp.topic, ext = /ogg/.test(blob.type) ? "ogg" : /mp4|m4a|aac/.test(blob.type) ? "m4a" : /mpeg|mp3/.test(blob.type) ? "mp3" : /wav/.test(blob.type) ? "wav" : "webm";
    const path = "assets/audio/" + t.id + "-s" + (i + 1) + "-" + Date.now().toString(36) + "." + ext;
    await GK.Storage.putAsset({ path, blob, type: blob.type, name, onDisk: false }); root.GKImages.cache.set(path, URL.createObjectURL(blob)); root.GKApp.setAudio(i, path);
  }
  async function record(i) {
    if (rec) { rec.stop(); return; }
    try {
      const V = root.GKVoice, st = await navigator.mediaDevices.getUserMedia(V ? V.constraints : { audio: true }); let ps = null;
      if (V) { try { ps = await V.processStream(st); } catch (e) { ps = null; } }                 // live voice enhancement; falls back to the plain mic
      const mr = new MediaRecorder(ps ? ps.stream : st), chunks = [];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = async () => { if (ps) ps.close(); else st.getTracks().forEach(t => t.stop()); rec = null; await saveBlob(new Blob(chunks, { type: mr.mimeType || "audio/webm" }), i, "recording"); };
      mr.start(); rec = mr; if (R.rec) R.rec.textContent = L().stop;
    } catch (e) { if (R.msg) R.msg.textContent = L().micErr; }
  }

  /* Returns true when a bar was inserted (so the player can account for its height). */
  function attach(stage, c) {
    const s = c.slide, l = L(), path = s.narration && s.narration.audio, quiz = s.type === "quiz", ed = !!(root.GKEdit && root.GKEdit.mode), tid = root.GKApp && root.GKApp.topic ? root.GKApp.topic.id : "";
    if (!cur || cur.idx !== c.idx || cur.path !== path || cur.tid !== tid) {
      if (cur && cur.el) cur.el.pause(); bad = false; cur = { idx: c.idx, path, tid, el: null };
      if (path) { const a = new Audio(root.GKImages.resolve(path)); a.muted = S.muted; a.preload = "auto"; ["play", "pause", "ended"].forEach(t => a.addEventListener(t, refresh)); a.addEventListener("error", () => { bad = true; if (R.msg) R.msg.textContent = AL[(root.GKApp && root.GKApp.lang) || "hinglish"].missing + ": " + path; refresh(); }); cur.el = a; if (S.auto) a.play().catch(() => {}); }
    }
    R = {}; if (!(quiz || path || ed)) return false;
    const btn = (t, fn, o = {}) => el("button", Object.assign({ class: "btn sm", type: "button", onclick: fn }, o), t);
    const SH = { question: "Q", countdown: "⏱", answer: "A", explanation: "Why", narration: "♪" }, pill = (k, t) => el("span", { class: "ph", "data-ph": k }, el("span", { class: "long" }, t), el("span", { class: "short" }, SH[k])), arrow = () => el("i", {}, "→");
    const seq = quiz ? [pill("question", l.q), arrow(), pill("countdown", l.c), arrow(), pill("answer", l.a), arrow(), pill("explanation", l.e)] : [pill("narration", l.n)];
    R.quiz = quiz; R.play = btn(l.play, toggle); R.replay = btn(l.replay, replay); R.mute = btn(l.mute, mute); R.msg = el("span", { class: "amsg" });
    const ctl = [R.play, R.replay, R.mute, el("label", { class: "tg", title: l.auto }, el("input", { type: "checkbox", checked: S.auto, onchange: e => { S.auto = e.target.checked; } }), el("span", { class: "lbl" }, l.auto))];
    if (ed) {
      const f = el("input", { type: "file", accept: "audio/*", hidden: true, onchange: e => e.target.files[0] && saveBlob(e.target.files[0], c.idx, e.target.files[0].name) });
      R.rec = btn(rec ? l.stop : l.rec, () => record(c.idx));
      ctl.push(btn(l.up, () => f.click()), f, R.rec); if (root.GKVoice) ctl.push(root.GKVoice.selector(), btn("🎙 " + root.GKVoice.L().check, () => root.GKVoice.micCheck())); if (path) ctl.push(btn("✕ " + l.rm, () => root.GKApp.setAudio(c.idx, null), { title: l.rm }));
    }
    R.bar = el("div", { class: "st-audio" }, el("span", { class: "ai", "aria-hidden": "true" }, "🔊"), el("b", {}, l.audio + ":"), el("span", { class: "seq" }, seq), el("span", { class: "grow" }), R.msg, el("span", { class: "actl ctl" }, ctl),
      ed ? el("span", { class: "nscript", "data-path": "slides." + c.idx + ".narration.script", "data-ph": l.script }, (s.narration && s.narration.script) || "") : null);
    if (bad && path) R.msg.textContent = l.missing + ": " + path;
    stage.insertBefore(R.bar, stage.querySelector(".qctl") || stage.querySelector(".st-bar")); refresh(); return true;
  }
  root.GKAudio = { attach, refresh, toggle, replay, mute, off, state: () => ({ has: !!audioEl(), paused: audioEl() ? audioEl().paused : true, muted: S.muted, time: audioEl() ? audioEl().currentTime : 0, bad }) };
})(window);
