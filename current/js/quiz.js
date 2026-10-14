/* GK Turbo quiz engine: countdown, sound, staged reveal, auto-advance. Attaches to the player's quiz slides. */
(function (root) {
  const KEY = "gk.quiz", D = { seconds: 5, tick: true, sound: true, anim: true, auto: false, delay: 4 };
  const S = Object.assign({}, D, (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const QL = {
    en: { start: "Start", pause: "Pause", resume: "Resume", reset: "Reset", reveal: "Reveal answer", hide: "Hide answer", secs: "Seconds", tick: "Tick", sound: "Sound", motion: "Animations", auto: "Auto-next" },
    hi: { start: "शुरू", pause: "रोकें", resume: "जारी रखें", reset: "रीसेट", reveal: "उत्तर दिखाएँ", hide: "उत्तर छिपाएँ", secs: "सेकंड", tick: "टिक", sound: "आवाज़", motion: "एनिमेशन", auto: "ऑटो-नेक्स्ट" },
    hinglish: { start: "Start", pause: "Pause", resume: "Resume", reset: "Reset", reveal: "Answer dikhao", hide: "Answer chhupao", secs: "Seconds", tick: "Tick", sound: "Sound", motion: "Animation", auto: "Auto-next" } };
  const h = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [x, v] of Object.entries(a)) v == null || v === false ? 0 : v === true ? e.setAttribute(x, "") : x === "class" ? e.className = v : x.startsWith("on") ? e.addEventListener(x.slice(2), v) : e.setAttribute(x, v); k.flat().forEach(c => c != null && e.append(c)); return e; };

  let ac; function beep(f, ms, g) { if (!S.sound) return; try { ac = ac || new (root.AudioContext || root.webkitAudioContext)(); const o = ac.createOscillator(), v = ac.createGain(); o.frequency.value = f; v.gain.value = g; o.connect(v); v.connect(ac.destination); o.start(); v.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + ms / 1000); o.stop(ac.currentTime + ms / 1000); } catch (e) {} }
  const applyMotion = () => document.body.classList.toggle("noanim", !S.anim);

  const T = { idx: -1, left: S.seconds, running: false, id: null, seq: [], autoStart: false };
  let C = null, R = {};
  const Lb = () => QL[C && C.lang] || QL.hinglish;
  const stop = () => { clearInterval(T.id); T.id = null; T.running = false; };
  const clearSeq = () => { T.seq.forEach(clearTimeout); T.seq = []; };
  const leave = () => { stop(); clearSeq(); T.idx = -1; C = null; };

  function paint() { paint0(); if (root.GKAudio) root.GKAudio.refresh(); }
  const phase = () => { if (C) { const st = C.view.step; if (st >= 2) return "explanation"; if (st === 1) return "answer"; if (T.running || T.left < S.seconds) return "countdown"; } return "question"; };
  function paint0() {
    if (!R.label || !C) return; const lb = Lb(), done = C.view.step >= 1;
    R.label.textContent = String(Math.max(0, T.left)).padStart(2, "0") + "s";
    R.bar.style.width = (Math.max(0, T.left) / S.seconds * 100) + "%";
    R.go.textContent = T.running ? lb.pause : (T.left < S.seconds && !done ? lb.resume : lb.start); R.go.disabled = done;
    R.rev.textContent = done ? lb.hide : lb.reveal;
  }
  function start() {
    if (!C || C.view.step >= 1) return; if (T.left <= 0) T.left = S.seconds; stop(); T.running = true; beep(660, 60, .15);
    T.id = setInterval(() => { T.left--; if (T.left > 0 && S.tick) beep(880, 40, .1); paint(); if (T.left <= 0) { stop(); beep(523, 350, .2); reveal(); } }, 1000); paint();
  }
  function reveal() {
    const s = C.slide, v = C.view, idx = v.idx, rm = C.remount, jump = C.jump, last = C.last;
    const P = (root.GKPlayer && root.GKPlayer.prefs.hide) || {}, steps = [1, !P.explain && s.explain && s.explain.length ? 2 : 0, !P.trick && s.trick ? 3 : 0, !P.pyq && s.pyq && s.pyq.length ? 4 : 0].filter(Boolean), gap = S.anim ? 900 : 300;
    stop(); clearSeq(); T.left = 0;
    steps.forEach((n, k) => { const f = () => { if (v.idx !== idx) return; v.step = Math.max(v.step, n); rm(); }; k ? T.seq.push(setTimeout(f, k * gap)) : f(); });
    if (S.auto && !last) T.seq.push(setTimeout(() => { if (v.idx === idx) { T.autoStart = true; jump(idx + 1); } }, (steps.length - 1) * gap + S.delay * 1000));
  }
  function hide() { clearSeq(); stop(); C.view.step = 0; T.left = S.seconds; C.remount(); }

  function attach(stage, ctx) {
    C = ctx; const v = ctx.view;
    if (T.idx !== v.idx) { stop(); clearSeq(); T.idx = v.idx; T.left = S.seconds; }
    if (v.step >= 1) { stop(); T.left = 0; } else if (T.left <= 0) T.left = S.seconds;
    const lb = Lb(); R = {};
    R.label = h("b", { class: "tl" }); R.bar = h("div");
    R.go = h("button", { class: "btn primary", onclick: () => T.running ? (stop(), paint()) : start() });
    R.rev = h("button", { class: "btn", onclick: () => ctx.view.step >= 1 ? hide() : reveal() });
    const reset = h("button", { class: "btn", onclick: hide }, lb.reset);
    const num = h("input", { type: "number", min: 1, max: 120, value: S.seconds, "aria-label": lb.secs, onchange: e => { S.seconds = Math.min(120, Math.max(1, +e.target.value || D.seconds)); e.target.value = S.seconds; save(); if (!T.running && v.step === 0) T.left = S.seconds; paint(); } });
    const tog = (k, text, fn) => h("label", { class: "tg" }, h("input", { type: "checkbox", checked: S[k], onchange: e => { S[k] = e.target.checked; save(); fn && fn(); } }), text);
    const q = stage.querySelector(".quiz");
    q.insertBefore(h("div", { class: "timer" }, h("span", { class: "ti" }, "⏱"), R.label, h("div", { class: "tbar" }, R.bar)), q.querySelector(".cards"));
    stage.insertBefore(h("div", { class: "qctl ctl" }, R.go, reset, R.rev, h("label", { class: "tg" }, lb.secs, num), tog("tick", lb.tick), tog("sound", lb.sound), tog("anim", lb.motion, applyMotion), tog("auto", lb.auto)), stage.querySelector(".st-bar"));
    paint();
    if (T.autoStart && S.auto && v.step === 0) { T.autoStart = false; T.seq.push(setTimeout(start, 700)); } else T.autoStart = false;
  }
  const key = e => { if (!C || (e.key !== "s" && e.key !== "S")) return false; T.running ? (stop(), paint()) : start(); e.preventDefault(); return true; };
  if (typeof document !== "undefined") applyMotion();
  root.GKQuiz = { attach, leave, cancel: clearSeq, key, phase, settings: S };
})(typeof window !== "undefined" ? window : globalThis);
