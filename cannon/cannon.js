/* Cannon mode: a ball machine on your side, one or two sculpted ninjas across the net. Put any face on them
   (photos are read in the browser and never leave the device), tap to fire, hold to charge, and keep at it until
   they give up. Modes: free play, a 60-second score attack, and five levels ending in a helmeted, shielded boss. */
(function () {
  "use strict";
  var V3 = THREE.Vector3, $ = function (s) { return document.querySelector(s); }, $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };
  function col(h) { return new THREE.Color(h).convertSRGBToLinear(); }
  function rnd(a) { return a[(Math.random() * a.length) | 0]; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  var store = { get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

  /* ---------- renderer, scene ---------- */
  var canvas = $("#c"), renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.62;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  var scene = new THREE.Scene(); scene.background = col(0x071E3D); scene.fog = new THREE.Fog(col(0x071E3D), 22, 60);
  var cam = new THREE.PerspectiveCamera(55, 1, 0.05, 120);
  scene.add(new THREE.HemisphereLight(col(0xbcd4ff), col(0x0b2a3a), 1.1));
  var key = new THREE.DirectionalLight(col(0xffffff), 2.4); key.position.set(4, 9, 5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); var sc = key.shadow.camera; sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -5; sc.near = 1; sc.far = 25; key.shadow.bias = -0.0005;
  scene.add(key); key.target.position.set(0, 0, -3); scene.add(key.target);
  var fill = new THREE.DirectionalLight(col(0x9fc4ff), 0.8); fill.position.set(-5, 4, -6); scene.add(fill);

  /* court: 6.1 m x 13.4 m, kitchen 2.13 m each side of the net */
  function box(w, h, d, c, x, y, z) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.85 })); m.position.set(x, y, z); scene.add(m); return m; }
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 50), new THREE.MeshStandardMaterial({ color: col(0x1d6b5c), roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  function slab(w, d, z, c, y) { var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.9 })); m.rotation.x = -Math.PI / 2; m.position.set(0, y, z); m.receiveShadow = true; scene.add(m); }
  slab(6.1, 13.4, 0, 0x2f7fd6, 0.003); slab(6.1, 4.26, 0, 0x55cfa0, 0.0045);
  function line(w, d, x, z) { var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0xf3f7fb })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.006, z); scene.add(m); }
  [-6.7, -2.13, 2.13, 6.7].forEach(function (z) { line(6.1, 0.05, 0, z); }); line(0.05, 13.4, -3.05, 0); line(0.05, 13.4, 3.05, 0); line(0.05, 4.57, 0, -4.415); line(0.05, 4.57, 0, 4.415);
  var netT = (function () { var c = document.createElement("canvas"); c.width = 256; c.height = 64; var x = c.getContext("2d"); x.strokeStyle = "rgba(230,240,255,.55)"; x.lineWidth = 1;
    for (var i = 0; i <= 256; i += 6) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 64); x.stroke(); } for (var j = 0; j <= 64; j += 6) { x.beginPath(); x.moveTo(0, j); x.lineTo(256, j); x.stroke(); }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 1); return t; })();
  var net = new THREE.Mesh(new THREE.PlaneGeometry(6.7, 0.86), new THREE.MeshBasicMaterial({ map: netT, transparent: true, side: THREE.DoubleSide, depthWrite: false })); net.position.set(0, 0.45, 0); scene.add(net);
  box(6.7, 0.06, 0.03, 0xf3f7fb, 0, 0.9, 0); box(0.07, 0.95, 0.07, 0x1b2430, -3.35, 0.47, 0); box(0.07, 0.95, 0.07, 0x1b2430, 3.35, 0.47, 0);
  box(16, 3.2, 0.05, 0x0d2440, 0, 1.6, -9.5); box(16, 0.18, 0.06, 0xE4F23F, 0, 2.2, -9.46);
  [-6, 6].forEach(function (x) { box(0.12, 7, 0.12, 0x1b2430, x, 3.5, -9.2); var s = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 10), new THREE.MeshBasicMaterial({ color: 0xfff6d8 })); s.position.set(x, 7, -9.1); scene.add(s); });

  /* ball machine (moves with you when you dodge) */
  var machine = new THREE.Group(); scene.add(machine); machine.position.set(0, 0, 5.6); machine.scale.setScalar(0.8);
  var mBody = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.6), new THREE.MeshStandardMaterial({ color: col(0x1c2a47), roughness: 0.5, metalness: 0.2 })); mBody.position.y = 0.42; mBody.castShadow = true; machine.add(mBody);
  var hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.18, 0.32, 18, 1, true), new THREE.MeshStandardMaterial({ color: col(0xE4F23F), roughness: 0.5, side: THREE.DoubleSide })); hopper.position.y = 0.8; machine.add(hopper);
  var barrel = new THREE.Group(); barrel.position.set(0, 0.62, -0.25); machine.add(barrel);
  var tube = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.5, 18), new THREE.MeshStandardMaterial({ color: col(0x2e302d), roughness: 0.4, metalness: 0.4 })); tube.rotation.x = Math.PI / 2; tube.position.z = -0.2; barrel.add(tube);

  /* ---------- faces: a round sticker drawn from the photo (or a default mug) plus damage ---------- */
  function defaultFace(kind) {
    var c = document.createElement("canvas"), S = 512; c.width = c.height = S; var x = c.getContext("2d");
    x.fillStyle = kind ? "#ffe0b8" : "#f6d2a8"; x.fillRect(0, 0, S, S);
    x.fillStyle = kind ? "#2b2b2b" : "#5a3a22"; x.fillRect(0, 0, S, 120);                                   /* hair */
    x.lineCap = "round"; x.strokeStyle = "#222"; x.lineWidth = 16;
    if (kind) {                                                                                                  /* smug, sunglasses */
      x.fillStyle = "#111"; x.beginPath(); x.ellipse(185, 220, 70, 42, 0, 0, 7); x.ellipse(327, 220, 70, 42, 0, 0, 7); x.fill(); x.fillRect(240, 210, 32, 12);
      x.beginPath(); x.moveTo(190, 345); x.quadraticCurveTo(290, 395, 340, 320); x.stroke();
    } else {                                                                                                     /* angry, moustache */
      x.beginPath(); x.moveTo(130, 160); x.lineTo(225, 200); x.moveTo(382, 160); x.lineTo(287, 200); x.stroke();
      x.fillStyle = "#222"; x.beginPath(); x.arc(190, 232, 20, 0, 7); x.arc(322, 232, 20, 0, 7); x.fill();
      x.fillStyle = "#5a3a22"; x.beginPath(); x.ellipse(215, 330, 60, 22, -0.2, 0, 7); x.ellipse(297, 330, 60, 22, 0.2, 0, 7); x.fill();
      x.beginPath(); x.moveTo(200, 395); x.quadraticCurveTo(256, 370, 312, 395); x.stroke();
    }
    return c;
  }
  function photoCanvas(img) {
    var c = document.createElement("canvas"), S = 512; c.width = c.height = S; var x = c.getContext("2d");
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, s = Math.min(w, h);
    x.drawImage(img, (w - s) / 2, Math.max(0, (h - s) / 2 - s * 0.08), s, s, 0, 0, S, S); return c;
  }
  /* damage stages by pain: 1 swollen cheeks, 2 plaster, 3 black eye, 4 bruises and a second black eye, 5 pig nose */
  function drawFace(o) {
    var S = 512, x = o.faceCtx, st = o.stage;
    x.save(); x.clearRect(0, 0, S, S); x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); x.clip();
    x.drawImage(o.photo || o.defFace, 0, 0, S, S);
    if (st >= 1) { [[150, 330], [362, 330]].forEach(function (p) { var g = x.createRadialGradient(p[0], p[1], 5, p[0], p[1], 90 + st * 10); g.addColorStop(0, "rgba(235,40,40," + (0.25 + st * 0.07) + ")"); g.addColorStop(1, "rgba(235,40,40,0)"); x.fillStyle = g; x.fillRect(0, 0, S, S); }); }
    function eyeRing(cx, cy) { var g = x.createRadialGradient(cx, cy, 20, cx, cy, 70); g.addColorStop(0, "rgba(40,10,60,.0)"); g.addColorStop(0.45, "rgba(50,15,70,.85)"); g.addColorStop(1, "rgba(80,30,90,0)"); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, 72, 0, 7); x.fill(); }
    function plaster(cx, cy, a) { x.save(); x.translate(cx, cy); x.rotate(a); x.fillStyle = "#f1d3a6"; x.strokeStyle = "rgba(120,80,40,.5)"; x.lineWidth = 3; x.fillRect(-90, -24, 180, 48); x.strokeRect(-90, -24, 180, 48); x.fillStyle = "#e2bb85"; x.fillRect(-30, -24, 60, 48); x.fillStyle = "rgba(120,80,40,.35)"; for (var i = -2; i <= 2; i++) for (var j = -1; j <= 1; j++) { x.beginPath(); x.arc(i * 9, j * 12, 2.2, 0, 7); x.fill(); } x.restore(); }
    if (st >= 3) eyeRing(190, 225);
    if (st >= 4) { eyeRing(322, 225); x.fillStyle = "rgba(110,40,140,.45)"; [[110, 150, 34], [400, 390, 40], [300, 120, 26]].forEach(function (b) { x.beginPath(); x.arc(b[0], b[1], b[2], 0, 7); x.fill(); }); plaster(360, 380, 0.5); }
    if (st >= 2) { plaster(170, 130, -0.6); plaster(170, 130, 0.6); }
    if (st >= 5) {
      x.fillStyle = "#ff9fb6"; x.strokeStyle = "#d35a7a"; x.lineWidth = 6; x.beginPath(); x.ellipse(256, 310, 78, 56, 0, 0, 7); x.fill(); x.stroke();
      x.fillStyle = "#7a2440"; x.beginPath(); x.ellipse(228, 310, 13, 22, 0, 0, 7); x.ellipse(284, 310, 13, 22, 0, 0, 7); x.fill();
      x.fillStyle = "#ff9fb6"; [[70, 60, -0.5], [442, 60, 0.5]].forEach(function (e) { x.save(); x.translate(e[0], e[1]); x.rotate(e[2]); x.beginPath(); x.moveTo(-50, 40); x.lineTo(0, -60); x.lineTo(50, 40); x.closePath(); x.fill(); x.stroke(); x.restore(); });
    }
    x.restore(); o.faceTex.needsUpdate = true;
  }

  /* ---------- opponents ---------- */
  var FACE_C = new V3(0, 1.25, -0.44), FACE_R = 0.24;
  var helmetM = new THREE.MeshStandardMaterial({ color: col(0x9aa3ad), roughness: 0.3, metalness: 0.75 });
  var shieldM = new THREE.MeshStandardMaterial({ color: col(0x2b3a55), roughness: 0.4, metalness: 0.5 });
  function makeOpp(i) {
    var pg = new THREE.Group(), pm = new THREE.MeshStandardMaterial({ color: col(0x3c3e3a), roughness: 0.6 });
    var ph = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.29, 0.016), pm); ph.castShadow = true; pg.add(ph);
    var pgr = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.13, 8), new THREE.MeshStandardMaterial({ color: col(0x8f918a), roughness: 0.9 })); pgr.position.y = -0.2; pg.add(pgr);
    var rig = NinjaRig.create(THREE, scene, { col: col, cloth: 0xd9472f, shade: 0x8f2a1a, accent: 0x0b1e3b, paddle: pg });
    var faceG = new THREE.Group(); faceG.matrixAutoUpdate = false; scene.add(faceG);
    var fc = document.createElement("canvas"); fc.width = fc.height = 512;
    var ft = new THREE.CanvasTexture(fc); ft.encoding = THREE.sRGBEncoding;
    var face = new THREE.Group(); face.position.copy(FACE_C); face.rotation.y = Math.PI; faceG.add(face);
    var rimM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    face.add(new THREE.Mesh(new THREE.RingGeometry(FACE_R, FACE_R + 0.018, 48), rimM));
    var disc = new THREE.Mesh(new THREE.CircleGeometry(FACE_R, 48), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.6, transparent: true })); disc.position.z = 0.002; face.add(disc);
    /* boss kit: helmet on the head bone, shield in the free hand */
    var helmet = new THREE.Group(); helmet.position.set(0, 1.27, 0.0); faceG.add(helmet);
    var dome = new THREE.Mesh(new THREE.SphereGeometry(0.45, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), helmetM); dome.scale.set(1.1, 0.95, 1.1); dome.castShadow = true; helmet.add(dome);
    var stripe = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.025, 8, 40), new THREE.MeshStandardMaterial({ color: col(0xE4F23F), roughness: 0.5 })); stripe.rotation.x = Math.PI / 2; stripe.position.y = 0.03; stripe.scale.set(1.04, 1, 1.0); helmet.add(stripe);
    helmet.visible = false;
    var shield = new THREE.Group(); scene.add(shield); shield.visible = false;
    var sd = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 28), shieldM); sd.rotation.x = Math.PI / 2; sd.castShadow = true; shield.add(sd);
    var knob = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 20), new THREE.MeshStandardMaterial({ color: col(0xE4F23F), roughness: 0.4 })); knob.rotation.x = Math.PI / 2; knob.position.z = 0.03; shield.add(knob);
    var o = { i: i, rig: rig, skel: null, faceG: faceG, face: face, rimM: rimM, faceCtx: fc.getContext("2d"), faceTex: ft, photo: null, defFace: defaultFace(i), stage: 0,
      helmet: helmet, helmetHP: 0, helmetFly: null, shield: shield, x: 0, z: -2.5, tx: 0, next: 0, vel: new V3(), gait: 0, react: 0, pain: 0, done: false, doneT: 0, flee: 0, fleeDir: 1,
      bubble: null, bubbleT: 0, swing: 0, swung: false, counterT: 4, dodge: 0, duckT: 0, block: null, active: i === 0, headPos: new V3(), facePos: new V3(), lastIn: null, idle: 0 };
    drawFace(o);
    return o;
  }
  var opps = [makeOpp(0), makeOpp(1)];

  /* ---------- game state ---------- */
  var LEVELS = [
    { speed: 1.0, smart: 0.0, counter: 0, name: "慢吞吞的小忍者" },
    { speed: 1.4, smart: 0.25, counter: 9, name: "會閃的小忍者" },
    { speed: 1.8, smart: 0.45, counter: 7, name: "會反擊的忍者" },
    { speed: 2.2, smart: 0.65, counter: 5.5, name: "忍者菁英" },
    { speed: 2.4, smart: 0.8, counter: 4.5, name: "BOSS：鐵頭盾牌忍者", boss: true }
  ];
  var G = { mode: "free", duo: false, score: 0, combo: 0, hits: 0, faces: 0, time: 60, level: 0, playing: false, ammo: "normal", px: 0, ptx: 0,
    mg: { unlocked: false, on: false, left: 0, cd: 0 }, hitStop: 0, shake: 0, replay: null, rounds: 0, pendingNext: false };
  var TAUNT = ["打不到啦～", "就這樣？", "你瞄哪裡啊？", "太慢了！", "哈！沒中～", "練好再來！"];
  var BEG = ["好痛！", "不要打臉！", "饒了我吧～", "我錯了！", "住手！！", "臉好腫…"];
  var CRY = ["嗚嗚嗚…", "救命啊！", "我投降…", "嗚哇啊啊啊", "媽媽～", "再也不敢了…"];
  var GLOAT = ["哈哈哈！", "活該～", "打得好！", "嘻嘻嘻", "再打他！"];
  var FLEE = ["別打了啦！！", "嗚哇啊啊", "救命～～", "我投降了啊！"];
  var BEGK = ["求求你…", "放過我吧…", "我真的錯了…"];
  var custom = store.get("pbninja.cannon.lines", []);
  $("#custom").value = custom.join("，");
  $("#custom").addEventListener("change", function (e) { custom = e.target.value.split(/[,，、\n]/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 20); store.set("pbninja.cannon.lines", custom); });
  function hurtLine(o) { if (custom.length && Math.random() < 0.5) return rnd(custom); return rnd(o.pain < 35 ? BEG.slice(0, 3) : o.pain < 70 ? BEG : CRY); }

  /* ---------- sound ---------- */
  var AC = null;
  function ensureAudio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === "suspended") AC.resume(); }
  function tone(type, f0, f1, dur, vol) {
    if (!AC) return; var t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.connect(g); g.connect(AC.destination);
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.start(t); o.stop(t + dur + 0.01);
  }
  var snd = { pop: function () { tone("triangle", 320, 120, 0.09, 0.22); }, hit: function () { tone("square", 600, 180, 0.18, 0.15); }, boom: function () { tone("sawtooth", 160, 40, 0.35, 0.3); tone("square", 900, 200, 0.12, 0.1); },
    clank: function () { tone("square", 1800, 1200, 0.15, 0.12); tone("triangle", 2400, 1600, 0.25, 0.08); }, wail: function () { tone("sawtooth", 520, 240, 0.6, 0.12); }, ouch: function () { tone("sawtooth", 200, 70, 0.4, 0.25); },
    combo: function (n) { tone("triangle", 500 + n * 40, 900 + n * 40, 0.12, 0.12); } };

  /* ---------- UI helpers ---------- */
  function popText(txt, wp, small) {
    var p = wp.clone().project(cam), r = canvas.getBoundingClientRect(), d = document.createElement("div");
    d.className = "pop" + (small ? " sm" : ""); d.textContent = txt; d.style.left = (r.left + (p.x + 1) / 2 * r.width) + "px"; d.style.top = (r.top + (1 - p.y) / 2 * r.height) + "px";
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, 950);
  }
  function bubble(o, txt, dur) {
    if (o.bubble) { scene.remove(o.bubble); o.bubble.material.map.dispose(); }
    var c = document.createElement("canvas"); c.width = 640; c.height = 160; var x = c.getContext("2d");
    x.font = "900 64px 'Noto Sans TC','PingFang TC',sans-serif"; var w = Math.min(620, x.measureText(txt).width + 80);
    x.fillStyle = "#fff"; x.strokeStyle = "#071E3D"; x.lineWidth = 8; x.beginPath(); if (x.roundRect) x.roundRect(320 - w / 2, 8, w, 120, 40); else x.rect(320 - w / 2, 8, w, 120); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(294, 124); x.lineTo(320, 156); x.lineTo(346, 124); x.fill();
    x.fillStyle = "#d9472f"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(txt, 320, 70);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(1.5, 0.375, 1); s.renderOrder = 10; scene.add(s);
    o.bubble = s; o.bubbleT = dur || 1.4;
  }
  function hud() {
    $("#score").textContent = Math.round(G.score); $("#hf").textContent = G.hits + " / " + G.faces;
    $("#pains").innerHTML = opps.filter(function (o) { return o.active; }).map(function (o) { var p = Math.min(100, Math.round(o.pain));
      return '<div class="row"><span>' + (G.duo ? (o.i ? "B " : "A ") : "") + "哀嚎值</span><span>" + p + '%</span></div><div class="meter"><i style="width:' + p + '%"></i></div>'; }).join("");
    $("#timer").textContent = Math.ceil(G.time); $("#level").textContent = (G.level + 1) + " / 5";
  }
  var comboTimer = 0;
  function mult() { return 1 + Math.min(G.combo, 20) * 0.1; }
  function showCombo() {
    var el = $("#combo"); if (G.combo < 2) { el.hidden = true; return; }
    el.hidden = false; el.innerHTML = G.combo + " 連擊！<small>分數 ×" + mult().toFixed(1) + "</small>"; el.classList.add("pop"); clearTimeout(comboTimer); comboTimer = setTimeout(function () { el.classList.remove("pop"); }, 120);
  }
  function flash() { var f = $("#flash"); f.classList.add("on"); setTimeout(function () { f.classList.remove("on"); }, 60); }
  function banner(t) { var d = document.createElement("div"); d.className = "pop"; d.style.left = "50%"; d.style.top = "34%"; d.style.fontSize = "32px"; d.style.animationDuration = "1.8s"; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 1850); }

  /* ---------- balls ---------- */
  var GR = -9.81, balls = [], piles = [];
  var ballGeo = new THREE.SphereGeometry(1, 16, 12);
  var matN = new THREE.MeshStandardMaterial({ color: col(0xE4F23F), roughness: 0.8, emissive: col(0xE4F23F), emissiveIntensity: 0.25 });
  var matF = new THREE.MeshStandardMaterial({ color: col(0xffffff), roughness: 0.5, emissive: col(0x8fe3ff), emissiveIntensity: 0.6 });
  var matS = new THREE.MeshStandardMaterial({ color: col(0xff9f3d), roughness: 0.6, emissive: col(0xff9f3d), emissiveIntensity: 0.35 });
  var matB = new THREE.MeshStandardMaterial({ color: col(0x4fe39b), roughness: 0.6, emissive: col(0x4fe39b), emissiveIntensity: 0.3 });
  var matC = new THREE.MeshStandardMaterial({ color: col(0xff3b2f), roughness: 0.5, emissive: col(0xff3b2f), emissiveIntensity: 0.8 });
  var tearMat = new THREE.MeshBasicMaterial({ color: 0x8fe3ff, transparent: true, opacity: 0.9 }), tears = [];
  var AMMO = { normal: { r: 0.037, T: 0.6, dmg: 1, m: matN }, big: { r: 0.09, T: 0.78, dmg: 0.7, m: matN }, fast: { r: 0.037, T: 0.3, dmg: 1.3, m: matF }, split: { r: 0.04, T: 0.66, dmg: 0.9, m: matS }, bounce: { r: 0.045, T: 0.62, dmg: 1.1, m: matB } };
  function spawn(type, pos, v, charge) {
    var A = AMMO[type], m = new THREE.Mesh(ballGeo, A.m); m.scale.setScalar(A.r); m.castShadow = true; m.position.copy(pos); scene.add(m);
    var b = { m: m, v: v, type: type, r: A.r, dmg: A.dmg * (1 + (charge || 0)), charge: charge || 0, age: 0, hit: false, counted: false, bounced: 0, split: type !== "split" };
    balls.push(b); if (balls.length > 70) { var o = balls.shift(); scene.remove(o.m); }
    return b;
  }
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), aimPlane = new THREE.Plane(new V3(0, 0, 1), 2.5);
  function aimAt(cx, cy) {
    var r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam); var aim = new V3(); if (!ray.ray.intersectPlane(aimPlane, aim)) return null;
    aim.y = clamp(aim.y, 0.12, 2.6); return aim;
  }
  var recoil = 0;
  function fire(cx, cy, charge, typeOverride) {
    var aim = aimAt(cx, cy); if (!aim) return;
    var type = typeOverride || G.ammo, A = AMMO[type], S = new V3(G.px, 0.5, 5.2), T = A.T * (1 - 0.4 * (charge || 0)), v;
    if (type === "bounce") { var gp = new V3(aim.x, 0, -1.1); v = gp.sub(S).multiplyScalar(1 / T); v.y = (0 - S.y) / T - 0.5 * GR * T; }
    else { v = aim.clone().sub(S).multiplyScalar(1 / T); v.y -= 0.5 * GR * T; }
    spawn(type, S, v, charge);
    barrel.lookAt(barrel.localToWorld(new V3()).add(v)); barrel.rotateY(Math.PI); recoil = 1; snd.pop();
  }

  /* ---------- input: tap to fire, hold to charge, machine gun while held ---------- */
  var press = null, pointer = { x: 0, y: 0 }, chargeEl = $("#charge"), mgNext = 0;
  canvas.addEventListener("pointerdown", function (e) { ensureAudio(); if (!G.playing || G.replay) return; press = { t: performance.now() }; pointer.x = e.clientX; pointer.y = e.clientY; mgNext = 0; });
  canvas.addEventListener("pointermove", function (e) { pointer.x = e.clientX; pointer.y = e.clientY; });
  canvas.addEventListener("pointerup", function (e) {
    if (!press) return; var held = (performance.now() - press.t) / 1000; press = null; chargeEl.hidden = true;
    if (!G.playing || G.replay || G.mg.on) return;
    fire(e.clientX, e.clientY, held > 0.18 ? clamp((held - 0.18) / 0.9, 0, 1) : 0);
  });
  canvas.addEventListener("pointercancel", function () { press = null; chargeEl.hidden = true; });
  $$("#ammo [data-a]").forEach(function (b) { b.addEventListener("click", function () { G.ammo = b.dataset.a; $$("#ammo [data-a]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); }); });
  $("#mg").addEventListener("click", function () { if (G.mg.cd > 0 || G.mg.on) return; G.mg.on = true; G.mg.left = 5; $("#mg").classList.add("on"); $("#hint").textContent = "連發中！按住畫面掃射"; });
  function dodge(d) { G.ptx = clamp(G.ptx + d * 1.3, -2.2, 2.2); }
  $("#dl").addEventListener("click", function () { dodge(-1); }); $("#dr").addEventListener("click", function () { dodge(1); });
  addEventListener("keydown", function (e) { if (e.key === "ArrowLeft" || e.key === "a") dodge(-1); if (e.key === "ArrowRight" || e.key === "d") dodge(1); });

  /* ---------- photos (read here, never uploaded) ---------- */
  function upload(o, f) {
    var url = URL.createObjectURL(f), img = new Image();
    img.onload = function () { o.photo = photoCanvas(img); drawFace(o); URL.revokeObjectURL(url); };
    img.src = url;
  }
  $("#fileA").addEventListener("change", function (e) { var f = e.target.files && e.target.files[0]; if (f) upload(opps[0], f); e.target.value = ""; });
  $("#fileB").addEventListener("change", function (e) { var f = e.target.files && e.target.files[0]; if (f) upload(opps[1], f); e.target.value = ""; });
  $("#clear").addEventListener("click", function () { opps.forEach(function (o) { o.photo = null; drawFace(o); }); });

  /* ---------- rounds and modes ---------- */
  function lv() { return G.mode === "levels" ? LEVELS[G.level] : G.mode === "timed" ? LEVELS[Math.min(4, 1 + G.rounds)] : { speed: 1.3, smart: 0.2, counter: 8 }; }
  function resetOpp(o, x) {
    o.pain = 0; o.stage = 0; o.done = false; o.doneT = 0; o.flee = 0; o.react = 0; o.swing = 0; o.x = o.tx = x; o.next = 0; o.counterT = 3 + Math.random() * 3; o.idle = 0; o.block = null; o.duckT = 0;
    var L = lv();
    if (o.helmet.parent !== o.faceG) o.faceG.add(o.helmet);
    o.helmetHP = L.boss ? 6 : 0; o.helmet.visible = !!L.boss; o.helmet.position.set(0, 1.37, 0.03); o.helmet.rotation.set(0, 0, 0); o.helmetFly = null; o.shield.visible = !!L.boss;
    if (o.bubble) { scene.remove(o.bubble); o.bubble = null; }
    drawFace(o);
  }
  function startRound() {
    var duo = G.duo && G.mode !== "levels";
    opps[0].active = true; opps[1].active = duo;
    opps[1].rig.group.visible = duo; opps[1].faceG.visible = duo;
    resetOpp(opps[0], duo ? -1.2 : 0); resetOpp(opps[1], 1.2); if (!duo) opps[1].shield.visible = false;
    piles.forEach(function (b) { scene.remove(b.m); }); piles = []; G.keep = false;
    G.mg.unlocked = false; G.mg.on = false; $("#mg").hidden = true; $("#mg").classList.remove("on");
    $("#upBWrap").hidden = !duo; $("#upA").textContent = duo ? "A" : "對手";
    if (G.mode === "levels") banner("第 " + (G.level + 1) + " 關：" + LEVELS[G.level].name);
    hud();
  }
  function stopReplay() {
    if (!G.replay) return; G.replay = null; $("#replayTag").hidden = true;
    repBalls.forEach(function (m) { m.visible = false; }); balls.forEach(function (b) { b.m.visible = true; });
  }
  function start(mode) {
    stopReplay(); clearTimeout(G.replayWait);
    G.mode = mode; G.duo = $("#duo").checked; G.score = 0; G.combo = 0; G.hits = 0; G.faces = 0; G.time = 60; G.level = 0; G.rounds = 0; G.px = G.ptx = 0; G.playing = true; G.mg.cd = 0; G.pendingNext = false;
    $("#menu").hidden = true; $("#result").hidden = true; $("#timerRow").hidden = mode !== "timed"; $("#levelRow").hidden = mode !== "levels";
    $("#hint").textContent = "點一下發射，按住蓄力再放開更強！"; $("#hint").hidden = false;
    startRound(); showCombo();
  }
  $$("#menu [data-m]").forEach(function (b) { b.addEventListener("click", function () { ensureAudio(); start(b.dataset.m); }); });
  $("#menuBtn").addEventListener("click", function () { G.playing = false; $("#result").hidden = true; showBoard(); $("#menu").hidden = false; });
  $("#resMenu").addEventListener("click", function () { $("#result").hidden = true; showBoard(); $("#menu").hidden = false; });
  $("#resAgain").addEventListener("click", function () {
    if (G.mode === "levels" && G.pendingNext) { G.pendingNext = false; G.level++; G.playing = true; $("#result").hidden = true; $("#hint").hidden = false; startRound(); return; }
    start(G.mode);
  });
  $("#resKeep").addEventListener("click", function () { $("#result").hidden = true; G.playing = true; G.keep = true; $("#hint").hidden = false; $("#hint").textContent = "繼續修理他！（按選單或再玩一次結束）"; });

  /* leaderboard (this device only) */
  function board() { return store.get("pbninja.cannon.best", { timed: [], levels: [] }); }
  function record(mode, s, title) {
    var b = board(), list = b[mode] || [], d = new Date(), entry = { s: Math.round(s), t: title, d: (d.getMonth() + 1) + "/" + d.getDate(), k: Date.now() };
    list.push(entry); list.sort(function (a, c) { return c.s - a.s; }); b[mode] = list.slice(0, 5); store.set("pbninja.cannon.best", b);
    var rk = b[mode].indexOf(entry) + 1; return rk || "5 名外";
  }
  function showBoard() {
    var b = board();
    ["timed", "levels"].forEach(function (m) { var el = $(m === "timed" ? "#lbTimed" : "#lbLevels"), l = b[m] || [];
      el.innerHTML = l.length ? l.map(function (e) { return "<li><b>" + e.s + "</b>　" + e.t + "　" + e.d + "</li>"; }).join("") : "<li>還沒有紀錄</li>"; });
  }
  function titleFor(s) { return s < 600 ? "手下留情的教練" : s < 1500 ? "認真的砲手" : s < 3000 ? "冷血砲手" : s < 5000 ? "匹克球惡魔" : "傳說中的砲台之神"; }
  function results(head, txt, opts) {
    G.playing = false; press = null; $("#resHead").textContent = head; $("#resScore").textContent = Math.round(G.score); $("#resTxt").textContent = txt;
    $("#resTitle").textContent = opts.title || ""; $("#resAgain").textContent = opts.again || "再玩一次"; $("#resKeep").hidden = !opts.keep; $("#result").hidden = false; $("#hint").hidden = true;
  }
  showBoard();

  /* ---------- hits ---------- */
  function nearest(p) { var best = null, bd = 1e9; opps.forEach(function (o) { if (!o.active) return; var d = Math.abs(o.x - p.x); if (d < bd) { bd = d; best = o; } }); return best; }
  function onHit(o, b, kind) {
    b.hit = true; b.counted = true;
    if (kind === "face" && o.helmetHP > 0) {
      o.helmetHP--; snd.clank(); popText(o.helmetHP ? "鏘！" : "安全帽飛了！", o.headPos, !!o.helmetHP);
      b.v.set((Math.random() - 0.5) * 4, 3, 4); G.combo++; G.hits++; G.score += 8 * mult(); o.react = Math.max(o.react, 0.5);
      if (!o.helmetHP) { o.helmet.updateMatrixWorld(true); scene.attach(o.helmet); o.helmetFly = { v: new V3((Math.random() - 0.5) * 2, 4.5, -1.5), w: new V3(3, 5, 2) }; }
      showCombo(); hud(); return;
    }
    var base = kind === "face" ? 25 : kind === "leg" ? 15 : 10, pain = (kind === "face" ? 12 : kind === "leg" ? 8 : 6) * b.dmg;
    G.combo++; G.hits++; if (kind === "face") G.faces++;
    G.score += base * mult() * (1 + b.charge); if (G.combo > 1) snd.combo(G.combo);
    if (!o.done) o.pain += pain;
    o.react = 1; b.v.set((Math.random() - 0.5) * 3, 2.5 + Math.random() * 1.5, 3 + Math.random() * 2);
    if (kind === "face") {
      snd.boom(); G.hitStop = 0.09; G.shake = 0.07 + 0.05 * b.charge; flash();
      popText(rnd(b.charge > 0.6 ? ["超級暴擊！", "爆頭！！"] : ["BOOM!", "暴擊！", "爆頭！", "正中紅心！"]), o.facePos);
      for (var k = 0; k < 6; k++) { var tm = new THREE.Mesh(ballGeo, tearMat); tm.scale.setScalar(0.015); tm.position.copy(o.facePos).add(new V3((k % 2 ? 1 : -1) * 0.12, 0.03, 0.05)); scene.add(tm); tears.push({ m: tm, v: new V3((k % 2 ? 1 : -1) * (0.6 + Math.random()), 1 + Math.random(), 0.8 + Math.random() * 0.6), age: 0 }); }
    } else { snd.hit(); popText(kind === "leg" ? "打腳！" : "命中！", b.m.position, true); }
    if (o.done) { o.flee = 2.2; o.fleeDir = o.x > 0 ? -1 : 1; bubble(o, rnd(FLEE)); }
    else bubble(o, hurtLine(o));
    var other = opps[1 - o.i]; if (other.active && !other.done && other.react < 0.2 && Math.random() < 0.6) setTimeout(function () { bubble(other, rnd(GLOAT), 1.1); }, 350);
    var st = Math.min(5, Math.floor(o.pain / 20)); if (st !== o.stage && !o.done) { o.stage = st; drawFace(o); }
    if (o.pain >= 50 && !G.mg.unlocked) { G.mg.unlocked = true; $("#mg").hidden = false; popText("連發模式解鎖！", o.headPos.clone().add(new V3(0, 0.7, 0)), true); }
    if (!o.done && o.pain >= 100) surrender(o);
    showCombo(); hud();
  }
  function miss(b) {
    b.counted = true; if (G.combo >= 3) popText("連擊中斷", new V3(G.px, 1.2, 3), true);
    G.combo = 0; showCombo();
    var o = nearest(b.m.position); if (o && !o.done && o.react < 0.2 && Math.random() < 0.35) bubble(o, custom.length && Math.random() < 0.2 ? rnd(custom) : rnd(TAUNT), 1.1);
  }
  function surrender(o) {
    o.done = true; o.doneT = 0; o.idle = 0; o.stage = 5; drawFace(o); bubble(o, "我投降！別打了！", 2.2); snd.wail();
    if (G.keep) return;
    startReplay(function () {
      if (!opps.every(function (x) { return !x.active || x.done; })) return;
      if (G.mode === "timed") { G.score += 500; banner("對手投降！+500　下一位！"); G.rounds++; hud(); setTimeout(function () { if (G.playing && G.mode === "timed") startRound(); }, 1600); }
      else if (G.mode === "levels") {
        G.score += 300 * (G.level + 1); hud();
        if (G.level >= 4) { var rk = record("levels", G.score, titleFor(G.score)); results("全破！BOSS 投降了", "五關全部打完，排行榜第 " + rk + " 名", { title: titleFor(G.score), keep: true }); }
        else { G.pendingNext = true; results("第 " + (G.level + 1) + " 關過關！", "命中 " + G.hits + " 球，打臉 " + G.faces + " 球", { again: "下一關 →", keep: true }); }
      } else results("對手投降了！", "命中 " + G.hits + " 球，其中打臉 " + G.faces + " 球", { again: "再來一輪", keep: true });
    });
  }

  /* ---------- slow-motion replay of the last two seconds ---------- */
  var buf = [], BUF_N = 150, repBalls = [];
  function cloneIn(p) { var c = {}; for (var k in p) c[k] = p[k] && p[k].clone ? p[k].clone() : p[k]; return c; }
  function snapshot(dt) {
    buf.push({ dt: dt, o: opps.map(function (o) { return o.active && o.lastIn ? { inp: cloneIn(o.lastIn), sx: o.face.scale.x, sy: o.face.scale.y } : null; }),
      b: balls.map(function (b) { return [b.m.position.x, b.m.position.y, b.m.position.z, b.r, b.m.material]; }) });
    if (buf.length > BUF_N) buf.shift();
  }
  function startReplay(after) {
    var tsum = 0, k0 = buf.length; while (k0 > 0 && tsum < 1.2) { k0--; tsum += buf[k0].dt; }          /* the last 1.2 s of play */
    var frames = buf.slice(k0); if (frames.length < 8) { after(); return; }
    clearTimeout(G.replayWait); G.replayWait = setTimeout(function () {
      G.replay = { frames: frames, i: 0, acc: 0, after: after }; $("#replayTag").hidden = false;
      balls.forEach(function (b) { b.m.visible = false; });
    }, 650);
  }
  function stepReplay(dt) {
    var R = G.replay; R.acc += dt * 0.4;
    while (R.i < R.frames.length - 1 && R.acc >= R.frames[R.i].dt) { R.acc -= R.frames[R.i].dt; R.i++; }
    var f = R.frames[R.i];
    f.o.forEach(function (s, k) { if (!s) return; var o = opps[k]; o.rig.update(s.inp); o.face.scale.set(s.sx, s.sy, 1); faceFollow(o); });
    while (repBalls.length < f.b.length) { var m = new THREE.Mesh(ballGeo, matN); scene.add(m); repBalls.push(m); }
    repBalls.forEach(function (m, k) { var d = f.b[k]; m.visible = !!d; if (d) { m.position.set(d[0], d[1], d[2]); m.scale.setScalar(d[3]); m.material = d[4]; } });
    var o = opps.filter(function (x) { return x.done; })[0] || opps[0], h = o.headPos;
    cam.position.set(h.x + 2.3, 1.6, h.z + 3.4); cam.lookAt(h.x, 0.95, h.z);
    if (R.i >= R.frames.length - 1) {
      repBalls.forEach(function (m) { m.visible = false; }); balls.forEach(function (b) { b.m.visible = true; });
      $("#replayTag").hidden = true; var a = R.after; G.replay = null; a();
    }
  }
  function faceFollow(o) {
    if (!o.skel) return;
    o.faceG.matrix.multiplyMatrices(o.skel.bones[2].matrixWorld, o.skel.boneInverses[2]); o.faceG.matrixWorldNeedsUpdate = true; o.faceG.updateMatrixWorld(true);
    o.headPos.setFromMatrixPosition(o.skel.bones[2].matrixWorld); o.facePos.copy(FACE_C).applyMatrix4(o.faceG.matrixWorld);
  }

  /* ---------- opponent brain ---------- */
  function predict(b, z) { var t = (z - b.m.position.z) / b.v.z; if (!(t > 0)) return null; return { t: t, x: b.m.position.x + b.v.x * t, y: b.m.position.y + b.v.y * t + 0.5 * GR * t * t }; }
  function thinkOpp(o, dt, clock) {
    var L = lv(), duo = opps[1].active, lo = duo ? (o.i ? 0.35 : -2.7) : -2.5, hi = duo ? (o.i ? 2.7 : -0.35) : 2.5;
    var speed = L.speed + o.pain / 80, root = new V3(o.x, 0, o.z), f = new V3(0, 0, 1), r = new V3(-1, 0, 0);
    var hand, hold = false, ballP = null, look = null, duck = 0, w = 0;
    o.react = Math.max(0, o.react - dt * 1.8); o.swing = Math.max(0, o.swing - dt);
    /* incoming ball: maybe side-step, duck or put the paddle up (smarter on later levels) */
    var inc = null; balls.forEach(function (b) { if (b.hit || b.v.z >= 0 || b.counted || b.counter) return; var p = predict(b, o.z); if (p && p.t < 0.55 && Math.abs(p.x - o.x) < 0.7 && (!inc || p.t < inc.t)) inc = { b: b, t: p.t, x: p.x, y: p.y }; });
    if (inc && !o.done && o.react < 0.3 && !inc.b["seen" + o.i]) {
      inc.b["seen" + o.i] = true;
      var roll = Math.random();
      if (roll < L.smart * 0.45) { o.tx = clamp(o.x + (inc.x > o.x ? -1.3 : 1.3), lo, hi); o.next = clock + 0.8; o.dodge = 0.4; }
      else if (roll < L.smart * 0.75) o.block = { t: 0.5, y: inc.y, x: inc.x };
      else if (roll < L.smart * 0.95 && inc.y > 1.0) o.duckT = 0.5;
    }
    o.duckT = Math.max(0, o.duckT - dt); if (o.duckT > 0) duck = 1;
    if (o.done) {
      o.doneT += dt;
      if (o.flee > 0) {                                                       /* runs off holding his head */
        o.flee -= dt; speed = 3.2; o.idle = 0;
        if (Math.abs(o.tx - o.x) < 0.2 || clock > o.next) { o.tx = o.fleeDir > 0 ? hi : lo; o.fleeDir *= -1; o.next = clock + 1.2; }
        hand = root.clone().add(new V3(-0.15, 1.45, 0.15)); hold = true; ballP = root.clone().add(new V3(0.15, 1.45, 0.15));
      } else {
        o.idle += dt; speed = 0; o.tx = o.x;
        var u = Math.min(1, o.doneT / 0.4);
        if (o.idle > 2.2) {                                                   /* kneels and begs */
          duck = Math.min(1, (o.idle - 2.2) * 2); hand = root.clone().addScaledVector(f, 0.35).addScaledVector(r, 0.08); hand.y = 0.7; hold = true; ballP = root.clone().addScaledVector(f, 0.35).addScaledVector(r, -0.08); ballP.y = 0.73;
          if (o.bubbleT <= 0 && Math.random() < dt * 0.5) bubble(o, rnd(BEGK), 1.3);
        } else { hand = root.clone().addScaledVector(r, 0.28).addScaledVector(f, 0.1); hand.y = 0.9 + 0.95 * u; hold = true; ballP = root.clone().addScaledVector(r, -0.28).addScaledVector(f, 0.1); ballP.y = 0.95 + 0.95 * u; }
      }
    } else if (o.swing > 0) {                                                 /* counter-attack swing */
      var s = 1 - o.swing / 0.45; w = 1;
      hand = root.clone().addScaledVector(f, -0.15 + 0.6 * s).addScaledVector(r, 0.35 - 0.2 * s); hand.y = 0.7 + 0.5 * s;
      if (s > 0.55 && !o.swung) { o.swung = true; counterBall(o, hand); }
    } else if (o.react > 0) {                                                 /* hands up to cover the face */
      var k = Math.min(1, o.react * 1.6); w = 0.9;
      hand = root.clone().addScaledVector(f, 0.32 - 0.12 * k).addScaledVector(r, 0.18 - 0.14 * k); hand.y = 0.85 + 0.35 * k;
      if (k > 0.4) { hold = true; ballP = root.clone().addScaledVector(f, 0.2).addScaledVector(r, -0.06); ballP.y = 1.18; }
    } else if (o.block) {                                                     /* paddle up where the ball is going */
      o.block.t -= dt; hand = new V3(clamp(o.block.x, o.x - 0.5, o.x + 0.5), clamp(o.block.y - 0.22, 0.5, 1.6), o.z + 0.35); w = 0.8;
      if (o.block.t <= 0) o.block = null;
    } else { hand = root.clone().addScaledVector(f, 0.32).addScaledVector(r, 0.18); hand.y = 0.85; }
    if (o.shield.visible && !hold) { hold = true; ballP = root.clone().addScaledVector(f, 0.38).addScaledVector(r, -0.12); ballP.y = 0.85; }   /* boss: shield across the body */
    if (!hold) { var nb = null, nd = 1e9; balls.forEach(function (b) { if (!b.hit && b.v.z < 0) { var d = b.m.position.distanceTo(root); if (d < nd) { nd = d; nb = b; } } }); ballP = nb ? nb.m.position.clone() : new V3(G.px, 1.0, 4.8); }
    else look = new V3(G.px, 1.0, 4.8);
    if (!o.done) {
      if (clock > o.next) { o.tx = lo + Math.random() * (hi - lo); o.next = clock + 0.8 + Math.random() * 1.3 - Math.min(0.5, o.pain / 200); }
      if (L.counter && G.playing && o.swing <= 0 && o.react <= 0) { o.counterT -= dt; if (o.counterT <= 0) { o.swing = 0.45; o.swung = false; o.counterT = L.counter * (0.7 + Math.random() * 0.6); showWarn(); } }
    }
    var spd = o.dodge > 0 ? 3.4 : speed; o.dodge = Math.max(0, o.dodge - dt);
    var dx = o.tx - o.x, step = Math.sign(dx) * Math.min(Math.abs(dx), spd * dt); o.x = clamp(o.x + step, -2.8, 2.8);
    o.vel.set(step / (dt || 1e-3), 0, 0); o.gait += Math.abs(step);
    var q = new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), o.swing > 0 ? -0.6 : -0.2);
    var inp = { root: root, yaw: Math.PI, vel: o.vel.clone(), gait: o.gait, t: clock, hand: hand, pPos: hand.clone().add(new V3(0, 0.25, 0).applyQuaternion(q)), pQ: q,
      w: w, bh: false, ball: ballP, look: look, hold: hold, hop: o.react > 0.45 ? 0.05 * Math.sin(o.react * 20) : 0, split: 0, duck: duck };
    o.rig.update(inp); o.lastIn = inp;
    var sq = o.react > 0.7 ? Math.sin((1 - o.react) * 30) * o.react * 0.25 : 0, puff = 1 + o.stage * 0.04; o.face.scale.set(puff + sq, puff - sq, 1);
    o.rimM.color.setRGB(1, 1 - o.react * 0.7, 1 - o.react * 0.7);
    faceFollow(o);
    if (o.shield.visible) { o.shield.position.copy(o.rig.J.arm[0].hand).add(new V3(0, 0, 0.08)); }
    if (o.helmetFly) { var hf = o.helmetFly; hf.v.y += GR * dt; o.helmet.position.addScaledVector(hf.v, dt); o.helmet.rotation.x += hf.w.x * dt; o.helmet.rotation.z += hf.w.z * dt; if (o.helmet.position.y < 0.2) { o.helmet.position.y = 0.2; hf.v.multiplyScalar(0.5); hf.v.y = Math.abs(hf.v.y) * 0.4; hf.w.multiplyScalar(0.6); } }
  }
  function showWarn() { var w = $("#warn"); w.hidden = false; clearTimeout(w._t); w._t = setTimeout(function () { w.hidden = true; }, 900); }
  function counterBall(o, from) {
    var S = from.clone().add(new V3(0, 0.25, 0.2)), target = new V3(G.px, 1.5, 6.4), T = 1.0, v = target.sub(S).multiplyScalar(1 / T); v.y -= 0.5 * GR * T;
    var m = new THREE.Mesh(ballGeo, matC); m.scale.setScalar(0.045); m.position.copy(S); scene.add(m);
    balls.push({ m: m, v: v, type: "counter", r: 0.045, dmg: 0, charge: 0, age: 0, hit: true, counted: true, counter: true, from: o, bounced: 0, split: true }); tone("square", 300, 500, 0.12, 0.12);
  }

  /* ---------- frame ---------- */
  var clock = 0, last = performance.now();
  function resize() { var w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < h ? 62 : 40; cam.updateProjectionMatrix(); }
  addEventListener("resize", resize); resize();

  function frame(now) {
    var real = Math.min(0.25, (now - last) / 1000), rdt = Math.min(0.05, real); last = now;
    if (G.replay) { stepReplay(real); renderer.render(scene, cam); requestAnimationFrame(frame); return; }
    var ts = G.hitStop > 0 ? 0.06 : 1; G.hitStop = Math.max(0, G.hitStop - rdt);
    var dt = rdt * ts; clock += dt;
    if (G.playing && G.mode === "timed") {
      G.time -= rdt;
      if (G.time <= 0) { G.time = 0; hud(); var t = titleFor(G.score), rk = record("timed", G.score, t); results("時間到！", "命中 " + G.hits + " 球、打臉 " + G.faces + " 球，排行榜第 " + rk + " 名", { title: t }); }
      else $("#timer").textContent = Math.ceil(G.time);
    }
    if (G.mg.cd > 0) { G.mg.cd -= rdt; $("#mg").disabled = G.mg.cd > 0; $("#mg").textContent = G.mg.cd > 0 ? "冷卻 " + Math.ceil(G.mg.cd) : "🔥 連發"; }
    if (G.mg.on) {
      G.mg.left -= rdt; $("#mg").textContent = "🔥 " + Math.max(0, G.mg.left).toFixed(1);
      if (press && G.playing) { mgNext -= rdt; if (mgNext <= 0) { fire(pointer.x, pointer.y, 0, "normal"); mgNext = 0.085; } }
      if (G.mg.left <= 0) { G.mg.on = false; G.mg.cd = 12; $("#mg").classList.remove("on"); $("#hint").textContent = "點一下發射，按住蓄力再放開更強！"; }
    }
    if (press && !G.mg.on) { var held = (now - press.t) / 1000; if (held > 0.18) { chargeEl.hidden = false; chargeEl.style.left = pointer.x + "px"; chargeEl.style.top = pointer.y + "px"; chargeEl.style.setProperty("--k", clamp((held - 0.18) / 0.9, 0, 1)); } }
    G.px += (G.ptx - G.px) * Math.min(1, rdt * 10); machine.position.x = G.px;
    opps.forEach(function (o) { if (o.active && o.skel) thinkOpp(o, dt, clock); });
    for (var i = balls.length - 1; i >= 0; i--) {
      var b = balls[i]; b.age += dt; b.v.y += GR * dt; b.m.position.addScaledVector(b.v, dt); var p = b.m.position;
      if (p.y < b.r) { p.y = b.r; if (b.type === "bounce" && !b.bounced) { b.v.y = 3.4; b.v.z *= 0.9; } else { b.v.y = -b.v.y * 0.55; b.v.x *= 0.8; b.v.z *= 0.8; } b.bounced++; }
      if (Math.abs(p.z) < 0.04 && p.y < 0.9 && !b.counter) { b.v.z = -b.v.z * 0.25; b.v.x *= 0.5; }
      if (!b.split && b.age > 0.22) { b.split = true; [-1, 1].forEach(function (s) { var c = spawn("normal", p, b.v.clone().add(new V3(s * 1.4, 0.2, 0)), b.charge); c.m.material = matS; c.dmg = b.dmg; }); }
      if (b.counter) {
        if (!b.done && p.z > 6.2) { b.done = true; if (Math.abs(p.x - G.px) < 0.5) { G.score = Math.max(0, G.score - 50); G.combo = 0; showCombo(); flash(); snd.ouch(); popText("被反擊！ -50", new V3(G.px, 1.3, 5.2)); bubble(b.from, "哈！打中你了！", 1.1); hud(); } else popText("閃過了！", new V3(G.px, 1.3, 5.2), true); }
      } else if (!b.hit && G.playing) {
        opps.forEach(function (o) {
          if (b.hit || !o.active || !o.skel) return;
          var J = o.rig.J;
          if (o.block && p.distanceTo(o.rig.paddle.position) < 0.2 + b.r) { b.hit = true; b.counted = true; b.v.set(b.v.x * 0.3, 2, -b.v.z * 0.5); snd.clank(); popText("被擋下！", p, true); G.combo = 0; showCombo(); return; }
          if (o.shield.visible && p.distanceTo(o.shield.position) < 0.3 + b.r && Math.abs(p.z - o.shield.position.z) < 0.12) { b.hit = true; b.counted = true; b.v.set(b.v.x * 0.3, 2, 3); snd.clank(); popText("盾擋！", p, true); G.combo = 0; showCombo(); return; }
          var dHead = p.distanceTo(o.headPos), dBody = Math.hypot(p.x - J.hipC.x, p.z - J.hipC.z);
          if (dHead < 0.42 + b.r) onHit(o, b, "face");
          else if (dBody < 0.3 + b.r && p.y > 0.05 && p.y < J.hd.y - 0.2) onHit(o, b, p.y < 0.35 ? "leg" : "body");
        });
        if (!b.counted && (p.z < -3.4 || (b.bounced && p.z < 0 && b.type !== "bounce") || b.bounced > 1 || b.age > 2.4)) miss(b);
      }
      if (b.age > 4) {
        balls.splice(i, 1);
        if (opps.some(function (o) { return o.active && o.done; }) && !b.counter && piles.length < 160) piles.push(b);   /* balls pile up around a beaten ninja */
        else scene.remove(b.m);
      }
    }
    for (var j = tears.length - 1; j >= 0; j--) { var tr = tears[j]; tr.age += dt; tr.v.y += GR * 0.6 * dt; tr.m.position.addScaledVector(tr.v, dt); if (tr.age > 0.9 || tr.m.position.y < 0) { scene.remove(tr.m); tears.splice(j, 1); } }
    opps.forEach(function (o) { if (!o.bubble) return; o.bubbleT -= rdt; o.bubble.position.set(o.rig.J.hd.x, o.rig.J.hd.y + 0.62, o.rig.J.hd.z); if (o.bubbleT <= 0 && !(o.done && o.doneT < 2)) { scene.remove(o.bubble); o.bubble.material.map.dispose(); o.bubble = null; } });
    recoil = Math.max(0, recoil - rdt * 6); tube.position.z = -0.2 + recoil * 0.08;
    G.shake = Math.max(0, G.shake - rdt * 0.35); var sx = (Math.random() - 0.5) * G.shake, sy = (Math.random() - 0.5) * G.shake;
    var cx = opps[1].active ? 0 : opps[0].x;
    if (cam.aspect < 1) { cam.position.set(G.px * 0.8 + cx * 0.12 + sx, 1.9 + sy, 6.3); cam.lookAt(G.px * 0.5 + cx * 0.4, 0.55, -2.5); }
    else { cam.position.set(G.px * 0.8 + cx * 0.12 + sx, 2.15 + sy, 7.4); cam.lookAt(G.px * 0.5 + cx * 0.35, 0.75, -2.5); }
    if (G.playing) snapshot(dt);
    renderer.render(scene, cam);
    requestAnimationFrame(frame);
  }

  NinjaMascot.load(THREE, function (m) {
    if (!m) { $("#hint").textContent = "角色載入失敗，請重新整理頁面"; return; }
    opps.forEach(function (o) { var a = NinjaMascot.attach(o.rig, "opp"); o.skel = a.skeleton; });
    opps[1].rig.group.visible = false; opps[1].faceG.visible = false;
  });
  requestAnimationFrame(frame);
  window.__cannon = { G: G, opps: opps, fire: fire, start: start, cam: cam, drawFace: drawFace, onHit: onHit, surrender: surrender, balls: balls };
})();
