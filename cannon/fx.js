/* CannonFX: everything the cannon game plays out loud. Synth sound effects, a crowd, a backing track that
   gets busier as the combo climbs, wails read by the browser's speech voice or your own recording, and phone
   vibration. Nothing here leaves the device: the recording lives in memory for this visit only. */
window.CannonFX = (function () {
  "use strict";
  var store = { get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  var opt = store.get("pbninja.cannon.opts", { voice: true, music: true, vibe: true });
  var AC = null, out = null, noise = null;
  function audio() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); out = AC.createGain(); out.gain.value = 0.9; out.connect(AC.destination); } catch (e) { AC = null; } }
    if (AC && AC.state === "suspended") AC.resume();
    if (AC && !noise) { noise = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); var d = noise.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    if (AC && opt.music) Music.start();
    return AC;
  }
  function setOpt(k, v) { opt[k] = v; store.set("pbninja.cannon.opts", opt); if (k === "music") { if (v) { audio(); Music.start(); } else Music.stop(); } }

  /* ---------- effects ---------- */
  function tone(type, f0, f1, dur, vol, when) {
    if (!AC) return; var t = when || AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.connect(g); g.connect(out);
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.start(t); o.stop(t + dur + 0.02);
  }
  function burst(freq, q, dur, vol, when, type) {
    if (!AC || !noise) return; var t = when || AC.currentTime, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = noise; f.type = type || "bandpass"; f.frequency.value = freq; f.Q.value = q; s.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  var sfx = {
    pop: function () { tone("triangle", 320, 120, 0.09, 0.22); },
    hit: function () { tone("square", 600, 180, 0.18, 0.15); burst(2500, 1, 0.08, 0.2); },
    boom: function () { tone("sawtooth", 160, 40, 0.35, 0.3); tone("square", 900, 200, 0.12, 0.1); burst(600, 0.7, 0.3, 0.35, 0, "lowpass"); },
    clank: function () { tone("square", 1800, 1200, 0.15, 0.12); tone("triangle", 2400, 1600, 0.25, 0.08); },
    wail: function () { tone("sawtooth", 520, 240, 0.6, 0.12); },
    ouch: function () { tone("sawtooth", 200, 70, 0.4, 0.25); },
    combo: function (n) { tone("triangle", 500 + n * 40, 900 + n * 40, 0.12, 0.12); },
    hiss: function () { burst(5000, 0.5, 1.2, 0.18, 0, "highpass"); },
    crate: function () { burst(900, 1.2, 0.25, 0.4); tone("square", 220, 90, 0.15, 0.12); },
    item: function () { [660, 880, 1320].forEach(function (f, i) { tone("triangle", f, f * 1.01, 0.12, 0.13, AC && AC.currentTime + i * 0.07); }); },
    freeze: function () { tone("sine", 2400, 600, 0.5, 0.12); burst(7000, 2, 0.4, 0.12); },
    splat: function () { burst(400, 0.6, 0.25, 0.5, 0, "lowpass"); tone("sine", 180, 60, 0.2, 0.25); },
    slip: function () { tone("sine", 300, 1400, 0.25, 0.15); tone("sine", 1400, 120, 0.4, 0.15, AC && AC.currentTime + 0.25); },
    launch: function () { tone("sawtooth", 120, 1200, 0.7, 0.18); burst(1200, 0.5, 0.6, 0.3); },
    meteor: function () { tone("sawtooth", 80, 40, 2.4, 0.25); burst(300, 0.5, 2.4, 0.3, 0, "lowpass"); },
    heart: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone("sine", f, f, 0.15, 0.14, AC && AC.currentTime + i * 0.08); }); },
    bullet: function () { tone("sine", 600, 80, 0.9, 0.25); },
    achieve: function () { [784, 988, 1175, 1568].forEach(function (f, i) { tone("square", f, f, 0.1, 0.08, AC && AC.currentTime + i * 0.09); }); }
  };
  /* a crowd: filtered noise for the roar, a few detuned saws for the "woo" */
  function crowd(amt) {
    if (!AC) return; amt = Math.max(0.15, Math.min(1, amt)); var t = AC.currentTime;
    burst(1100, 0.5, 0.8 + amt * 1.2, 0.18 + amt * 0.3, t);
    burst(500, 0.8, 0.6 + amt, 0.12 + amt * 0.2, t + 0.05);
    for (var i = 0; i < 3; i++) { var o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter(); o.type = "sawtooth"; f.type = "lowpass"; f.frequency.value = 1400;
      o.frequency.setValueAtTime(260 + i * 37, t + 0.1); o.frequency.linearRampToValueAtTime(430 + i * 41, t + 0.5 + amt * 0.4); o.frequency.linearRampToValueAtTime(300, t + 1 + amt);
      o.connect(f); f.connect(g); g.connect(out); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.025 * amt, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1 + amt); o.start(t); o.stop(t + 1.3 + amt); }
  }
  function vibe(p) { if (opt.vibe && navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} }

  /* ---------- backing track: layers come in as the game heats up (level 0..4) ---------- */
  var Music = (function () {
    var timer = null, bus = null, next = 0, step = 0, getLevel = function () { return 0; };
    var BASS = [45, 45, 48, 45, 50, 48, 43, 43], LEAD = [69, 72, 74, 76, 79, 76, 74, 72];
    function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
    function kick(t) { var o = AC.createOscillator(), g = AC.createGain(); o.connect(g); g.connect(bus); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22); o.start(t); o.stop(t + 0.25); }
    function hat(t, v) { var s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = noise; f.type = "highpass"; f.frequency.value = 8000; s.connect(f); f.connect(g); g.connect(bus); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); s.start(t, Math.random()); s.stop(t + 0.06); }
    function clap(t) { var s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = noise; f.type = "bandpass"; f.frequency.value = 1500; f.Q.value = 0.8; s.connect(f); f.connect(g); g.connect(bus); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15); s.start(t, Math.random()); s.stop(t + 0.16); }
    function note(t, m, type, dur, v, cut) { var o = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain(); o.type = type; o.frequency.value = hz(m); f.type = "lowpass"; f.frequency.value = cut; o.connect(f); f.connect(g); g.connect(bus); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.start(t); o.stop(t + dur + 0.02); }
    function sched() {
      if (!AC) return; var lv = getLevel();
      bus.gain.setTargetAtTime(lv > 0 ? 0.13 + lv * 0.015 : 0.05, AC.currentTime, 0.3);
      var spb = 60 / (108 + lv * 9) / 4;
      while (next < AC.currentTime + 0.15) {
        var t = next, s = step % 16;
        if (s % 4 === 0 && (lv >= 2 || s % 8 === 0)) kick(t);
        if (lv >= 1 && s % 2 === 1) hat(t, 0.08 + 0.03 * lv);
        if (lv >= 2 && (s === 4 || s === 12)) clap(t);
        if (lv >= 1 && s % 2 === 0) note(t, BASS[(step >> 2) % 8] + (s % 4 === 2 ? 12 : 0), "sawtooth", spb * 1.8, 0.12, 300 + lv * 350);
        if (lv >= 3) note(t, LEAD[(step + (step >> 4)) % 8] + (lv >= 4 ? 12 : 0), "square", spb * 0.9, 0.035, 2600);
        if (lv === 0 && s === 0) note(t, BASS[(step >> 4) % 8] + 24, "triangle", spb * 12, 0.05, 1200);
        next += spb; step++;
      }
    }
    return {
      start: function () { if (!AC || timer || !opt.music) return; bus = AC.createGain(); bus.gain.value = 0; bus.connect(out); next = AC.currentTime + 0.1; timer = setInterval(sched, 40); },
      stop: function () { clearInterval(timer); timer = null; if (bus) { bus.gain.setTargetAtTime(0, AC.currentTime, 0.1); bus = null; } },
      level: function (f) { getLevel = f; }
    };
  })();

  /* ---------- voice: the browser's speech voice, or your own recording ---------- */
  var Voice = (function () {
    var buf = null, rec = null, zh = null, lastSpeak = 0;
    function pickVoice() { if (zh || !window.speechSynthesis) return zh; var v = speechSynthesis.getVoices(); zh = v.filter(function (x) { return /zh[-_]TW/i.test(x.lang); })[0] || v.filter(function (x) { return /^zh/i.test(x.lang); })[0] || null; return zh; }
    if (window.speechSynthesis) speechSynthesis.onvoiceschanged = function () { zh = null; pickVoice(); };
    function playBuf(rate) { if (!AC || !buf) return false; var s = AC.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate; s.connect(out); s.start(); return true; }
    return {
      say: function (txt, big) {
        var now = performance.now(); if (now - lastSpeak < 450 && !big) return; lastSpeak = now;
        if (buf && (big || Math.random() < 0.65)) { playBuf(big ? 0.85 : 0.9 + Math.random() * 0.45); return; }
        if (!opt.voice || !window.speechSynthesis) return;
        try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(txt.replace(/[～~！!…]+/g, "！")); var v = pickVoice(); if (v) u.voice = v; u.lang = v ? v.lang : "zh-TW";
          u.pitch = big ? 1.2 : 1.5 + Math.random() * 0.4; u.rate = big ? 1.0 : 1.25; u.volume = 1; speechSynthesis.speak(u); } catch (e) {}
      },
      has: function () { return !!buf; },
      clear: function () { buf = null; },
      preview: function () { audio(); playBuf(1); },
      recording: function () { return !!rec; },
      /* resolves when recording stops (tap again, or after 3 seconds) */
      record: function () {
        audio();
        if (rec) { rec.stop(); return Promise.resolve("stopping"); }
        if (!navigator.mediaDevices || !window.MediaRecorder) return Promise.reject(new Error("這個瀏覽器不支援錄音"));
        return navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
          return new Promise(function (ok, bad) {
            var chunks = []; rec = new MediaRecorder(stream);
            rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
            rec.onstop = function () {
              stream.getTracks().forEach(function (t) { t.stop(); }); rec = null;
              new Blob(chunks).arrayBuffer().then(function (ab) { return new Promise(function (r, j) { AC.decodeAudioData(ab, r, j); }); }).then(function (b) { buf = b; ok("done"); }).catch(bad);
            };
            rec.start(); setTimeout(function () { if (rec && rec.state === "recording") rec.stop(); }, 3000);
          });
        });
      }
    };
  })();

  return { audio: audio, opt: opt, setOpt: setOpt, sfx: sfx, tone: tone, crowd: crowd, vibe: vibe, Music: Music, Voice: Voice, store: store };
})();
