/* GK Turbo studio: real-time voice enhancer (GKVoice) + screen recorder (GKRecorder).
   The voice chain is a live version of the Voice Studio chain: noise suppression -> 80 Hz high-pass -> adaptive gate (5 ms look-ahead) ->
   leveler -> 250 Hz mud cut -> compressor 3:1 -> presence EQ -> tone -> limiter at -1.5 dBFS. Everything runs in the browser; nothing is uploaded. */
(function (root) {
  /* ======================= GKVoice ======================= */
  const VL = {
    en: { off: "Off (raw mic)", clean: "Clean voice", warm: "Warm voice", podcast: "Podcast sound", voice: "Voice", check: "Mic check", checkT: "Microphone check", start: "Record 5 seconds", speak: "Speak now…", close: "Close", micFail: "Microphone not available or permission denied.", noise: "Room noise", quiet: "quiet, great", ok: "a little noisy, the enhancer will handle it", loud: "noisy, move somewhere quieter if you can", play: "Playback (enhanced)", hint: "Say a sentence. The bar shows your level.", fallback: "Enhancer unavailable on this browser: recording the plain microphone." },
    hi: { off: "बंद (सीधा माइक)", clean: "साफ़ आवाज़", warm: "गर्म आवाज़", podcast: "पॉडकास्ट साउंड", voice: "आवाज़", check: "माइक जाँच", checkT: "माइक्रोफ़ोन की जाँच", start: "5 सेकंड रिकॉर्ड करें", speak: "अब बोलिए…", close: "बंद करें", micFail: "माइक्रोफ़ोन उपलब्ध नहीं या अनुमति नहीं मिली।", noise: "कमरे का शोर", quiet: "शांत, बढ़िया", ok: "थोड़ा शोर, एन्हांसर संभाल लेगा", loud: "शोर ज़्यादा है, हो सके तो शांत जगह जाएँ", play: "प्लेबैक (एन्हांस्ड)", hint: "एक वाक्य बोलिए। बार आपका स्तर दिखाता है।", fallback: "इस ब्राउज़र में एन्हांसर नहीं चला: सादा माइक रिकॉर्ड हो रहा है।" },
    hinglish: { off: "Off (seedha mic)", clean: "Clean voice", warm: "Warm voice", podcast: "Podcast sound", voice: "Voice", check: "Mic check", checkT: "Microphone check", start: "5 second record karo", speak: "Ab boliye…", close: "Close", micFail: "Microphone available nahi ya permission nahi mili.", noise: "Room noise", quiet: "quiet, badhiya", ok: "thoda noisy, enhancer sambhal lega", loud: "noisy hai, ho sake to quiet jagah jao", play: "Playback (enhanced)", hint: "Ek sentence bolo. Bar aapka level dikhata hai.", fallback: "Is browser mein enhancer nahi chala: plain mic record ho raha hai." } };
  const PRESETS = {
    off: null,
    clean: { tone: [], ratio: 3, target: -20 },
    warm: { tone: [["lowshelf", 200, 2], ["peaking", 3500, -1, 1]], ratio: 3, target: -20 },
    podcast: { tone: [["lowshelf", 120, 3], ["peaking", 3000, 2.5, 1], ["highshelf", 9000, 1.5]], ratio: 3.5, target: -18 } };
  const VKEY = "gk.voice", V = Object.assign({ preset: "clean" }, (() => { try { return JSON.parse(localStorage.getItem(VKEY)) || {}; } catch (e) { return {}; } })());
  if (!(V.preset in PRESETS)) V.preset = "clean";
  const vsave = () => { try { localStorage.setItem(VKEY, JSON.stringify(V)); } catch (e) {} };
  const VLang = () => VL[(root.GKApp && root.GKApp.lang) || "hinglish"] || VL.hinglish;
  const el = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [x, v] of Object.entries(a)) v == null || v === false ? 0 : v === true ? e.setAttribute(x, "") : x === "class" ? e.className = v : x.startsWith("on") ? e.addEventListener(x.slice(2), v) : e.setAttribute(x, v); k.flat().forEach(c => c != null && e.append(c)); return e; };
  const CTX = () => root.AudioContext || root.webkitAudioContext;
  const constraints = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false, channelCount: 1 } };

  /* adaptive gate (expander) + leveler, runs on the audio thread */
  const WK = "class GKVoiceProc extends AudioWorkletProcessor{constructor(o){super();var p=(o&&o.processorOptions)||{},sr=sampleRate;this.sr=sr;this.ratio=p.ratio||2.5;this.maxCut=p.maxCut||-24;this.look=Math.max(1,Math.round(.005*sr));this.buf=new Float32Array(this.look);this.w=0;" +
    "this.cA=1-Math.exp(-1/(.002*sr));this.cR=1-Math.exp(-1/(.15*sr));this.eA=Math.exp(-1/(.002*sr));this.eR=Math.exp(-1/(.15*sr));this.env=0;this.floor=.001;this.g=1;this.sq=.01;this.lev=1;this.thr=-50;" +
    "this.target=Math.pow(10,(p.target||-20)/20);this.maxBoost=Math.pow(10,(p.maxBoost||15)/20);this.leveler=p.leveler!==false;this.cnt=0;this.sqk=1/(.3*sr);this.gmin=Math.pow(10,this.maxCut/20);}" +
    "process(inputs,outputs){var i=inputs[0]&&inputs[0][0],o=outputs[0]&&outputs[0][0];if(!o)return true;if(!i){o.fill(0);return true;}var n=i.length,k,envSum=0,envMax=0,a,x;" +
    "for(k=0;k<n;k++){x=i[k];a=x<0?-x:x;this.env=a>this.env?this.eA*this.env+(1-this.eA)*a:this.eR*this.env+(1-this.eR)*a;envSum+=this.env;if(this.env>envMax)envMax=this.env;}" +
    "var mean=envSum/n,fo=20*Math.log10(this.floor+1e-9),db=20*Math.log10(mean+1e-9);if(mean<this.floor)this.floor=Math.max(3e-4,mean);else if(db<fo+6)this.floor+=(mean-this.floor)*(n/(this.sr*2));else this.floor+=(mean-this.floor)*(n/(this.sr*30));" +
    "var fdb=20*Math.log10(this.floor+1e-9);this.thr=fdb+9;var kn=(fdb+9-db)/6;kn=kn<0?0:kn>1?1:kn;var tg=Math.pow(10,this.maxCut*kn/20);var speech=db>fdb+13;" +
    "for(k=0;k<n;k++){var d=this.buf[this.w];this.buf[this.w]=i[k];this.w=(this.w+1)%this.look;this.g+=(tg-this.g)*(tg>this.g?this.cA:this.cR);var y=d*this.g;if(speech)this.sq+=(y*y-this.sq)*this.sqk;var op=(this.g-this.gmin)/(1-this.gmin);op=op<0?0:op>1?1:op;o[k]=y*(1+(this.lev-1)*op);}" +
    "if(this.leveler&&speech){var des=Math.min(this.maxBoost,Math.max(.4,this.target/Math.sqrt(this.sq+1e-9)));this.lev+=(des-this.lev)*(des>this.lev?n/(this.sr*2):n/(this.sr*.4));}" +
    "this.cnt+=n;if(this.cnt>=sampleRate/10){this.cnt=0;this.port.postMessage({floorDb:20*Math.log10(this.floor+1e-9),thrDb:this.thr,open:this.g>.9,levDb:20*Math.log10(this.lev)});}return true;}}registerProcessor('gk-voice',GKVoiceProc);";
  let wkURL = null; const clipCurve = (() => { const c = new Float32Array(4097); for (let i = 0; i < c.length; i++) { const x = i / 2048 - 1; c[i] = Math.max(-.841, Math.min(.841, x)); } return c; })();
  async function ensureWorklet(ctx) { if (!ctx.audioWorklet) throw new Error("no worklet"); if (!wkURL) wkURL = URL.createObjectURL(new Blob([WK], { type: "application/javascript" })); if (!ctx.__gkv) ctx.__gkv = ctx.audioWorklet.addModule(wkURL); await ctx.__gkv; }

  /* Build the chain on any AudioContext (live or offline). Returns { out, info(), poll(cb), close(), enhanced }. */
  async function build(ctx, src, key) {
    key = key || V.preset; const P = PRESETS[key]; let floorDb = null, thrDb = null, open = true, levDb = 0;
    const an = ctx.createAnalyser(); an.fftSize = 1024; const buf = new Float32Array(1024), nodes = [];
    const info = () => { an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; return { rmsDb: 10 * Math.log10(s / buf.length + 1e-12), floorDb, thrDb, open, levDb }; };
    if (!P) { src.connect(an); return { out: src, info, poll: cb => { const t = setInterval(() => cb(info()), 100); return () => clearInterval(t); }, close() { try { src.disconnect(an); } catch (e) {} }, enhanced: false }; }
    let node = src; const add = n => { node.connect(n); node = n; nodes.push(n); return n; };
    const bq = (type, f, g = 0, q = .707) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.gain.value = g; b.Q.value = q; return add(b); };
    bq("highpass", 80);
    try { await ensureWorklet(ctx); const w = new AudioWorkletNode(ctx, "gk-voice", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], processorOptions: { ratio: 2.5, maxCut: -24, target: P.target, maxBoost: 15 } });
      w.port.onmessage = e => { floorDb = e.data.floorDb; thrDb = e.data.thrDb; open = e.data.open; levDb = e.data.levDb; }; add(w); } catch (e) { /* no AudioWorklet: continue without the adaptive gate */ }
    bq("peaking", 250, -1.5, 1);
    const c = ctx.createDynamicsCompressor(); c.threshold.value = -24; c.knee.value = 12; c.ratio.value = P.ratio; c.attack.value = .005; c.release.value = .12; add(c);
    bq("peaking", 3000, 1.5, 1); P.tone.forEach(t => bq(...t));
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .001; lim.release.value = .08; add(lim);
    const ws = ctx.createWaveShaper(); ws.curve = clipCurve; add(ws); node.connect(an);
    return { out: node, info, poll: cb => { const t = setInterval(() => cb(info()), 100); return () => clearInterval(t); }, close() { nodes.forEach(n => { try { n.disconnect(); } catch (e) {} }); }, enhanced: true };
  }
  /* mic MediaStream -> processed MediaStream (for MediaRecorder) */
  async function processStream(stream, key) {
    const AC = CTX(); const ctx = new AC(); if (ctx.state === "suspended") { try { await ctx.resume(); } catch (e) {} }
    const dest = ctx.createMediaStreamDestination(), chain = await build(ctx, ctx.createMediaStreamSource(stream), key); chain.out.connect(dest);
    return { stream: dest.stream, ctx, chain, close() { chain.close(); stream.getTracks().forEach(t => t.stop()); ctx.close().catch(() => {}); } };
  }
  function selector(onChange) {
    const l = VLang(), s = el("select", { class: "vsel", "aria-label": l.voice, title: l.voice, onchange: e => { V.preset = e.target.value; vsave(); onChange && onChange(V.preset); } },
      ...Object.keys(PRESETS).map(k => { const o = el("option", { value: k }, (k === "off" ? "🎙 " : "🎙✨ ") + l[k]); if (k === V.preset) o.selected = true; return o; })); return s;
  }
  async function micCheck() {
    const l = VLang(); let ps = null, stopPoll = null, mr = null, url = null;
    const meter = el("div", { class: "meter" }, el("i")), status = el("p", { class: "note" }, l.hint), aud = el("audio", { controls: true, hidden: true });
    const startBtn = el("button", { class: "btn primary", type: "button" }, "● " + l.start);
    const d = el("dialog", { class: "dlg" }, el("h3", {}, "🎙 " + l.checkT), el("label", {}, l.voice, selector(() => open())), meter, status, aud, el("div", { class: "row" }, startBtn, el("button", { class: "btn", type: "button", onclick: () => { end(); d.close(); d.remove(); } }, l.close)));
    function end() { if (stopPoll) stopPoll(); stopPoll = null; if (mr && mr.state !== "inactive") { try { mr.stop(); } catch (e) {} } if (ps) ps.close(); ps = null; }
    async function open() {
      end(); let st; try { st = await navigator.mediaDevices.getUserMedia(constraints); } catch (e) { status.textContent = l.micFail; return; }
      try { ps = await processStream(st); } catch (e) { status.textContent = l.fallback; ps = null; st.getTracks().forEach(t => t.stop()); return; }
      stopPoll = ps.chain.poll(i => { meter.firstChild.style.width = Math.max(0, Math.min(100, (i.rmsDb + 60) * 100 / 60)) + "%";
        if (i.floorDb != null && i.floorDb > -120) { const f = Math.round(i.floorDb); status.textContent = l.noise + ": " + f + " dB — " + (f < -55 ? l.quiet : f < -45 ? l.ok : l.loud); } });
    }
    startBtn.onclick = async () => {
      if (!ps) await open(); if (!ps || !root.MediaRecorder) return; aud.hidden = true; startBtn.disabled = true; status.textContent = l.speak; const chunks = [];
      mr = new MediaRecorder(ps.stream); mr.ondataavailable = e => e.data.size && chunks.push(e.data);
      mr.onstop = () => { if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType || "audio/webm" })); aud.src = url; aud.hidden = false; startBtn.disabled = false; status.textContent = l.play; };
      mr.start(); setTimeout(() => { if (mr && mr.state === "recording") mr.stop(); }, 5000);
    };
    d.addEventListener("close", () => { end(); d.remove(); }); document.body.append(d); d.showModal(); open();
  }
  root.GKVoice = { build, processStream, selector, micCheck, constraints, presets: PRESETS, options: V, saveOptions: vsave, L: VLang, workletSource: WK, supported: () => !!(CTX() && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) };

  /* ======================= GKRecorder ======================= */
  const RL = {
    en: { rec: "Record", title: "Record screen", tab: "This tab (best for slides)", tabS: "Pick the tab named GK Turbo when the browser asks", mic: "Include my microphone", micS: "Your voice is enhanced live (see Voice below)", tabAudio: "Include sound from the tab", tabAudioS: "Captures narration, ticking and effects", crop: "Crop to the slide only", cropS: "Chrome/Edge, this tab only. Removes everything around the slide", count: "3-second countdown", countS: "Stay quiet during it: the enhancer learns your room noise", start: "Start recording", cancel: "Cancel", pause: "Pause", resume: "Resume", stop: "Stop & save", saved: "Recording saved as", unsupported: "Screen recording is not supported in this browser. Use Chrome or Edge on a computer.", denied: "Recording was cancelled or blocked by the browser.", micFail: "Microphone not available. Recording without it.", empty: "Nothing was recorded.", keys: "F9 start / stop · F10 pause" },
    hi: { rec: "रिकॉर्ड", title: "स्क्रीन रिकॉर्ड करें", tab: "यही टैब (स्लाइड के लिए सबसे अच्छा)", tabS: "ब्राउज़र पूछे तो GK Turbo वाला टैब चुनें", mic: "मेरा माइक्रोफ़ोन जोड़ें", micS: "आपकी आवाज़ लाइव सुधारी जाती है (नीचे Voice देखें)", tabAudio: "टैब की आवाज़ जोड़ें", tabAudioS: "नैरेशन, टिक और इफ़ेक्ट रिकॉर्ड होंगे", crop: "सिर्फ़ स्लाइड क्रॉप करें", cropS: "Chrome/Edge, सिर्फ़ यही टैब", count: "3 सेकंड की उलटी गिनती", countS: "इस दौरान चुप रहें: एन्हांसर कमरे का शोर सीखता है", start: "रिकॉर्डिंग शुरू करें", cancel: "रद्द करें", pause: "रोकें", resume: "जारी रखें", stop: "रोकें और सहेजें", saved: "रिकॉर्डिंग सहेजी गई:", unsupported: "यह ब्राउज़र स्क्रीन रिकॉर्डिंग नहीं करता। कंप्यूटर पर Chrome या Edge चलाएँ।", denied: "रिकॉर्डिंग रद्द हुई या ब्राउज़र ने रोकी।", micFail: "माइक्रोफ़ोन उपलब्ध नहीं। बिना उसके रिकॉर्ड हो रहा है।", empty: "कुछ रिकॉर्ड नहीं हुआ।", keys: "F9 शुरू / बंद · F10 रोकें" },
    hinglish: { rec: "Record", title: "Screen record karo", tab: "Ye tab (slides ke liye best)", tabS: "Browser pooche to GK Turbo wala tab chuno", mic: "Meri mic add karo", micS: "Aapki awaaz live enhance hoti hai (neeche Voice dekho)", tabAudio: "Tab ki awaaz add karo", tabAudioS: "Narration, tick aur effects record honge", crop: "Sirf slide crop karo", cropS: "Chrome/Edge, sirf ye tab", count: "3 second countdown", countS: "Is dauraan chup raho: enhancer room noise seekhta hai", start: "Recording start karo", cancel: "Cancel", pause: "Pause", resume: "Resume", stop: "Stop & save", saved: "Recording save hui:", unsupported: "Ye browser screen recording nahi karta. Computer par Chrome ya Edge use karo.", denied: "Recording cancel hui ya browser ne block ki.", micFail: "Mic available nahi. Bina mic ke record ho raha hai.", empty: "Kuch record nahi hua.", keys: "F9 start / stop · F10 pause" } };
  const RKEY = "gk.rec", O = Object.assign({ tab: true, mic: true, tabAudio: true, crop: true, count: true }, (() => { try { return JSON.parse(localStorage.getItem(RKEY)) || {}; } catch (e) { return {}; } })());
  const rsave = () => { try { localStorage.setItem(RKEY, JSON.stringify(O)); } catch (e) {} };
  let st = "idle", mr = null, chunks = [], streams = [], ac = null, chain = null, stopPoll = null, acc = 0, t0 = 0, tick = null, mime = "", aborted = false, last = null, hasAudio = false, pill, timeEl, pauseBtn, meterEl, cropEl;
  const RLang = () => RL[(root.GKApp && root.GKApp.lang) || "hinglish"] || RL.hinglish;
  const note = (m, ok) => { if (root.GKApp) ok ? root.GKApp.note(m) : root.GKApp.warn(m); };
  const supported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia && root.MediaRecorder);
  const pickMime = () => !root.MediaRecorder ? "" : ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(m => MediaRecorder.isTypeSupported(m)) || "";
  const fmt = ms => { const s = Math.floor(ms / 1000); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); };
  const elapsed = () => acc + (st === "recording" ? Date.now() - t0 : 0);
  function ui() {
    if (pill) return; const l = RLang();
    timeEl = el("b", { class: "rt" }, "00:00"); pauseBtn = el("button", { class: "btn sm", type: "button", onclick: pause }, l.pause); meterEl = el("span", { class: "meter sm", title: "🎙" }, el("i"));
    pill = el("div", { class: "rec-pill", role: "status", hidden: true }, el("span", { class: "rd" }), timeEl, meterEl, pauseBtn, el("button", { class: "btn sm primary", type: "button", onclick: stop }, "■ " + l.stop));
    cropEl = el("div", { class: "crop-box", "aria-hidden": "true" }); document.body.append(pill, cropEl);
  }
  function paint() { if (!pill) return; const l = RLang(), on = st === "recording" || st === "paused"; pill.hidden = !on; pill.classList.toggle("paused", st === "paused"); timeEl.textContent = fmt(elapsed()); pauseBtn.textContent = st === "paused" ? l.resume : l.pause; document.body.classList.toggle("recording", on); }
  function syncCrop() { const s = document.querySelector(".stage"); if (!s || !cropEl) return; const r = s.getBoundingClientRect(); Object.assign(cropEl.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" }); }
  function countdown() { return new Promise(res => { const d = el("div", { class: "rec-count", "aria-live": "assertive" }); document.body.append(d); let n = 3; st = "countdown"; const step = () => { if (aborted) { d.remove(); return res(false); } if (n === 0) { d.remove(); return res(true); } d.textContent = n--; setTimeout(step, 1000); }; step(); }); }
  function cleanup() { clearInterval(tick); if (stopPoll) stopPoll(); stopPoll = null; if (chain) chain.close(); chain = null; streams.forEach(s => s.getTracks().forEach(t => t.stop())); streams = []; if (ac) { ac.close().catch(() => {}); ac = null; } st = "idle"; mr = null; paint(); }

  async function begin() {
    const l = RLang(); if (st !== "idle") return; if (!supported()) return note(l.unsupported);
    ui(); aborted = false; let disp;
    try { disp = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: O.tabAudio, preferCurrentTab: O.tab, selfBrowserSurface: "include", systemAudio: "include" }); } catch (e) { return note(l.denied); }
    streams = [disp]; st = "countdown"; const vt = disp.getVideoTracks()[0]; vt.addEventListener("ended", () => { aborted = true; stop(); });
    let mic = null; if (O.mic) { try { mic = await navigator.mediaDevices.getUserMedia(constraints); streams.push(mic); } catch (e) { note(l.micFail); } }
    if (O.crop && O.tab && root.CropTarget && vt.cropTo) { syncCrop(); try { await vt.cropTo(await root.CropTarget.fromElement(cropEl)); } catch (e) { /* not this tab / unsupported: whole tab is recorded */ } }
    const out = new MediaStream(disp.getVideoTracks()), AC = CTX(); ac = new AC(); if (ac.state === "suspended") { try { await ac.resume(); } catch (e) {} }
    const dest = ac.createMediaStreamDestination(); let any = false;
    if (disp.getAudioTracks().length) { ac.createMediaStreamSource(new MediaStream(disp.getAudioTracks())).connect(dest); any = true; }
    if (mic && mic.getAudioTracks().length) { chain = await build(ac, ac.createMediaStreamSource(mic), V.preset); chain.out.connect(dest); any = true; stopPoll = chain.poll(i => { if (meterEl) meterEl.firstChild.style.width = Math.max(0, Math.min(100, (i.rmsDb + 60) * 100 / 60)) + "%"; }); }
    if (any) dest.stream.getAudioTracks().forEach(t => out.addTrack(t)); hasAudio = any;
    if (O.count && !(await countdown())) return cleanup(); if (aborted) return cleanup();
    mime = pickMime(); chunks = [];
    try { mr = new MediaRecorder(out, Object.assign(mime ? { mimeType: mime } : {}, { videoBitsPerSecond: 6e6 })); } catch (e) { cleanup(); return note(l.unsupported); }
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); }; mr.onstop = finish; mr.start(1000);
    st = "recording"; acc = 0; t0 = Date.now(); last = null; tick = setInterval(() => { paint(); syncCrop(); }, 400); paint();
  }
  function pause() { if (st === "recording") { mr.pause(); acc += Date.now() - t0; st = "paused"; } else if (st === "paused") { mr.resume(); t0 = Date.now(); st = "recording"; } paint(); }
  function stop() { if (st === "idle") return; if (mr && mr.state !== "inactive") mr.stop(); else cleanup(); }
  function finish() {
    const type = /mp4/.test(mime) ? "mp4" : "webm", blob = new Blob(chunks, { type: mime || "video/webm" }), ms = elapsed(), voice = chain && chain.enhanced ? V.preset : "off"; cleanup();
    if (!blob.size) return note(RLang().empty);
    const t = root.GKApp && root.GKApp.topic, d = new Date(), p = n => String(n).padStart(2, "0"), name = (t ? t.id : "gkturbo") + "-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + "." + type;
    const a = el("a", { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    last = { name, size: blob.size, type: blob.type, ms, audio: hasAudio, voice }; note(RLang().saved + " " + name + " (" + (blob.size / 1048576).toFixed(1) + " MB)", true);
  }
  function open() {
    if (st !== "idle") return; const l = RLang();
    const sw = k => el("label", { class: "sw" }, el("input", { type: "checkbox", checked: O[k], onchange: e => { O[k] = e.target.checked; rsave(); } }), el("i"));
    const row = (t, s, c) => el("div", { class: "srow" }, el("div", {}, el("b", {}, t), el("small", {}, s)), c);
    const vl = VLang(), d = el("dialog", { class: "dlg" }, el("h3", {}, "● " + l.title), row(l.tab, l.tabS, sw("tab")), row(l.mic, l.micS, sw("mic")),
      row("✨ " + vl.voice, "", el("div", { class: "vrow" }, selector(), el("button", { class: "btn sm", type: "button", onclick: () => micCheck() }, "🎙 " + vl.check))), row(l.tabAudio, l.tabAudioS, sw("tabAudio")), row(l.crop, l.cropS, sw("crop")), row(l.count, l.countS, sw("count")),
      el("p", { class: "note" }, l.keys), el("div", { class: "row" }, el("button", { class: "btn", type: "button", onclick: () => { d.close(); d.remove(); } }, l.cancel), el("button", { class: "btn primary", type: "button", onclick: () => { d.close(); d.remove(); begin(); } }, "● " + l.start)));
    document.body.append(d); d.showModal();
  }
  root.GKRecorder = { open, quick() { st === "idle" ? begin() : stop(); }, pause, stop, begin, supported, L: RLang, options: O, saveOptions: rsave, state: () => st, info: () => last, elapsed };
})(window);
