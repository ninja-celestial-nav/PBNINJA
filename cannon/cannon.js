/* Cannon mode: a ball machine on your side, up to four sculpted ninjas across the net. Put any face on them
   (photos are read in the browser and never leave the device), tap to fire, hold to charge, and keep at it until
   they give up. Six modes, items, weather, cover, a boss that loses its temper, and a few cheap tricks of theirs. */
(function () {
  "use strict";
  var V3 = THREE.Vector3, $ = function (s) { return document.querySelector(s); }, $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };
  var FX = window.CannonFX, sfx = FX.sfx, store = FX.store;
  function col(h) { return new THREE.Color(h).convertSRGBToLinear(); }
  function rnd(a) { return a[(Math.random() * a.length) | 0]; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function ss(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  /* ================= renderer, scene, court ================= */
  var canvas = $("#c"), renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.62;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  var scene = new THREE.Scene(); scene.background = col(0x071E3D); scene.fog = new THREE.Fog(col(0x071E3D), 22, 60);
  var cam = new THREE.PerspectiveCamera(55, 1, 0.05, 120);
  var hemi = new THREE.HemisphereLight(col(0xbcd4ff), col(0x0b2a3a), 1.1); scene.add(hemi);
  var key = new THREE.DirectionalLight(col(0xffffff), 2.4); key.position.set(4, 9, 5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); var sc = key.shadow.camera; sc.left = -6; sc.right = 6; sc.top = 6; sc.bottom = -6; sc.near = 1; sc.far = 28; key.shadow.bias = -0.0005;
  scene.add(key); key.target.position.set(0, 0, -3); scene.add(key.target);
  var fill = new THREE.DirectionalLight(col(0x9fc4ff), 0.8); fill.position.set(-5, 4, -6); scene.add(fill);
  var spots = [0, 1].map(function () { var s = new THREE.SpotLight(col(0xfff2d0), 0, 14, 0.42, 0.5, 1.2); scene.add(s); scene.add(s.target); return s; });

  function box(w, h, d, c, x, y, z) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.85 })); m.position.set(x, y, z); scene.add(m); return m; }
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 50), new THREE.MeshStandardMaterial({ color: col(0x1d6b5c), roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  var courtMats = [];
  function slab(w, d, z, c, y) { var mt = new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.9 }), m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mt); m.rotation.x = -Math.PI / 2; m.position.set(0, y, z); m.receiveShadow = true; scene.add(m); courtMats.push(mt); }
  slab(6.1, 13.4, 0, 0x2f7fd6, 0.003); slab(6.1, 4.26, 0, 0x55cfa0, 0.0045); courtMats.push(ground.material);
  function line(w, d, x, z) { var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0xf3f7fb })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.006, z); scene.add(m); }
  [-6.7, -2.13, 2.13, 6.7].forEach(function (z) { line(6.1, 0.05, 0, z); }); line(0.05, 13.4, -3.05, 0); line(0.05, 13.4, 3.05, 0); line(0.05, 4.57, 0, -4.415); line(0.05, 4.57, 0, 4.415);
  var netT = (function () { var c = document.createElement("canvas"); c.width = 256; c.height = 64; var x = c.getContext("2d"); x.strokeStyle = "rgba(230,240,255,.55)"; x.lineWidth = 1;
    for (var i = 0; i <= 256; i += 6) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 64); x.stroke(); } for (var j = 0; j <= 64; j += 6) { x.beginPath(); x.moveTo(0, j); x.lineTo(256, j); x.stroke(); }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 1); return t; })();
  var net = new THREE.Mesh(new THREE.PlaneGeometry(6.7, 0.86), new THREE.MeshBasicMaterial({ map: netT, transparent: true, side: THREE.DoubleSide, depthWrite: false })); net.position.set(0, 0.45, 0); scene.add(net);
  box(6.7, 0.06, 0.03, 0xf3f7fb, 0, 0.9, 0); box(0.07, 0.95, 0.07, 0x1b2430, -3.35, 0.47, 0); box(0.07, 0.95, 0.07, 0x1b2430, 3.35, 0.47, 0);
  box(16, 3.2, 0.05, 0x0d2440, 0, 1.6, -9.5); box(16, 0.18, 0.06, 0xE4F23F, 0, 2.2, -9.46);
  var lampMat = new THREE.MeshBasicMaterial({ color: 0xfff6d8 });
  [-6, 6].forEach(function (x) { box(0.12, 7, 0.12, 0x1b2430, x, 3.5, -9.2); var s = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 10), lampMat); s.position.set(x, 7, -9.1); scene.add(s); });

  /* wind flag beside the net */
  var flagPole = box(0.05, 2.4, 0.05, 0xdfe6ee, 3.75, 1.2, 0.2);
  var flagG = new THREE.Group(); flagG.position.set(3.75, 2.25, 0.2); scene.add(flagG);
  var flagGeo = new THREE.PlaneGeometry(0.7, 0.36, 8, 1); flagGeo.translate(0.35, 0, 0);
  var flagMesh = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: col(0xE4F23F), side: THREE.DoubleSide, roughness: 0.7 })); flagG.add(flagMesh);
  var flagBase = flagGeo.attributes.position.array.slice();
  /* rain */
  var RAIN_N = 700, rainGeo = new THREE.BufferGeometry(), rainPos = new Float32Array(RAIN_N * 6);
  for (var ri = 0; ri < RAIN_N; ri++) { var rx = (Math.random() - 0.5) * 14, ry = Math.random() * 8, rz = -9 + Math.random() * 17; rainPos.set([rx, ry, rz, rx + 0.02, ry + 0.35, rz], ri * 6); }
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
  var rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0 })); rain.frustumCulled = false; rain.visible = false; scene.add(rain);

  /* ball machine (moves with you when you dodge) */
  var machine = new THREE.Group(); scene.add(machine); machine.position.set(0, 0, 5.6); machine.scale.setScalar(0.8);
  var mBody = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.6), new THREE.MeshStandardMaterial({ color: col(0x1c2a47), roughness: 0.5, metalness: 0.2 })); mBody.position.y = 0.42; mBody.castShadow = true; machine.add(mBody);
  var hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.18, 0.32, 18, 1, true), new THREE.MeshStandardMaterial({ color: col(0xE4F23F), roughness: 0.5, side: THREE.DoubleSide })); hopper.position.y = 0.8; machine.add(hopper);
  var barrel = new THREE.Group(); barrel.position.set(0, 0.62, -0.25); machine.add(barrel);
  var tube = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.5, 18), new THREE.MeshStandardMaterial({ color: col(0x2e302d), roughness: 0.4, metalness: 0.4 })); tube.rotation.x = Math.PI / 2; tube.position.z = -0.2; barrel.add(tube);

  /* ================= faces ================= */
  function defaultFace(kind) {
    var c = document.createElement("canvas"), S = 512; c.width = c.height = S; var x = c.getContext("2d");
    x.fillStyle = kind ? "#ffe0b8" : "#f6d2a8"; x.fillRect(0, 0, S, S);
    x.fillStyle = kind ? "#2b2b2b" : "#5a3a22"; x.fillRect(0, 0, S, 120);
    x.lineCap = "round"; x.strokeStyle = "#222"; x.lineWidth = 16;
    if (kind) {
      x.fillStyle = "#111"; x.beginPath(); x.ellipse(185, 220, 70, 42, 0, 0, 7); x.ellipse(327, 220, 70, 42, 0, 0, 7); x.fill(); x.fillRect(240, 210, 32, 12);
      x.beginPath(); x.moveTo(190, 345); x.quadraticCurveTo(290, 395, 340, 320); x.stroke();
    } else {
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
  var photos = [null, null];
  /* damage: 1 swollen, 2 plasters, 3 black eye, 4 bruises + second black eye, 5 pig nose; a pie covers it in cream */
  function drawFace(o) {
    var S = 512, x = o.faceCtx, st = o.stage;
    x.save(); x.clearRect(0, 0, S, S); x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); x.clip();
    x.drawImage(photos[o.i % 2] || o.defFace, 0, 0, S, S);
    if (st >= 1) [[150, 330], [362, 330]].forEach(function (p) { var g = x.createRadialGradient(p[0], p[1], 5, p[0], p[1], 90 + st * 10); g.addColorStop(0, "rgba(235,40,40," + (0.25 + st * 0.07) + ")"); g.addColorStop(1, "rgba(235,40,40,0)"); x.fillStyle = g; x.fillRect(0, 0, S, S); });
    function eyeRing(cx, cy) { var g = x.createRadialGradient(cx, cy, 20, cx, cy, 70); g.addColorStop(0, "rgba(40,10,60,0)"); g.addColorStop(0.45, "rgba(50,15,70,.85)"); g.addColorStop(1, "rgba(80,30,90,0)"); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, 72, 0, 7); x.fill(); }
    function plaster(cx, cy, a) { x.save(); x.translate(cx, cy); x.rotate(a); x.fillStyle = "#f1d3a6"; x.strokeStyle = "rgba(120,80,40,.5)"; x.lineWidth = 3; x.fillRect(-90, -24, 180, 48); x.strokeRect(-90, -24, 180, 48); x.fillStyle = "#e2bb85"; x.fillRect(-30, -24, 60, 48); x.fillStyle = "rgba(120,80,40,.35)"; for (var i = -2; i <= 2; i++) for (var j = -1; j <= 1; j++) { x.beginPath(); x.arc(i * 9, j * 12, 2.2, 0, 7); x.fill(); } x.restore(); }
    if (st >= 3) eyeRing(190, 225);
    if (st >= 4) { eyeRing(322, 225); x.fillStyle = "rgba(110,40,140,.45)"; [[110, 150, 34], [400, 390, 40], [300, 120, 26]].forEach(function (b) { x.beginPath(); x.arc(b[0], b[1], b[2], 0, 7); x.fill(); }); plaster(360, 380, 0.5); }
    if (st >= 2) { plaster(170, 130, -0.6); plaster(170, 130, 0.6); }
    if (st >= 5) {
      x.fillStyle = "#ff9fb6"; x.strokeStyle = "#d35a7a"; x.lineWidth = 6; x.beginPath(); x.ellipse(256, 310, 78, 56, 0, 0, 7); x.fill(); x.stroke();
      x.fillStyle = "#7a2440"; x.beginPath(); x.ellipse(228, 310, 13, 22, 0, 0, 7); x.ellipse(284, 310, 13, 22, 0, 0, 7); x.fill();
      x.fillStyle = "#ff9fb6"; [[70, 60, -0.5], [442, 60, 0.5]].forEach(function (e) { x.save(); x.translate(e[0], e[1]); x.rotate(e[2]); x.beginPath(); x.moveTo(-50, 40); x.lineTo(0, -60); x.lineTo(50, 40); x.closePath(); x.fill(); x.stroke(); x.restore(); });
    }
    if (o.blindT > 0) {                                                             /* cream pie */
      x.fillStyle = "#fffaf0"; x.strokeStyle = "rgba(200,180,150,.6)"; x.lineWidth = 4;
      [[256, 250, 190], [150, 200, 90], [370, 210, 95], [250, 360, 110], [140, 330, 70], [380, 340, 75]].forEach(function (b) { x.beginPath(); x.arc(b[0], b[1], b[2], 0, 7); x.fill(); });
      for (var d = 0; d < 7; d++) { var dx = 110 + d * 48; x.fillRect(dx - 14, 380, 28, 70 + (d * 37) % 60); x.beginPath(); x.arc(dx, 450 + (d * 37) % 60, 14, 0, 7); x.fill(); }
      x.fillStyle = "#e8452f"; x.beginPath(); x.arc(256, 140, 22, 0, 7); x.fill();
    }
    x.restore(); o.faceTex.needsUpdate = true;
  }

  /* ================= costumes ================= */
  var COSTUMES = {
    red: { team: "opp" },
    green: { team: "c_green", spec: { cloth: [55, 160, 90], lo: 0.08, gain: 0.95, trim: null } },
    pink: { team: "c_pink", spec: { cloth: [236, 112, 165], lo: 0.1, gain: 0.95, trim: [255, 255, 255] } },
    fat: { team: "c_orange", spec: { cloth: [238, 138, 38], lo: 0.08, gain: 0.95, trim: [18, 40, 78] }, fat: true },
    suit: { team: "c_suit", spec: { cloth: [58, 62, 72], lo: 0.25, gain: 0.7, trim: [235, 235, 235] }, tie: true },
    shades: { team: "c_black", spec: { cloth: [30, 30, 34], lo: 0.2, gain: 0.55, trim: [226, 176, 60] }, shades: true },
    boss: { team: "c_armor", spec: { cloth: [112, 128, 152], lo: 0.3, gain: 0.9, trim: [230, 180, 60] } }
  };
  var RANDOM_COSTUMES = ["red", "green", "pink", "fat", "suit", "shades"];
  for (var cn in COSTUMES) if (COSTUMES[cn].spec) NinjaMascot.defineTeam(COSTUMES[cn].team, COSTUMES[cn].spec);

  /* ================= opponents ================= */
  var FACE_C = new V3(0, 1.25, -0.44), FACE_R = 0.24;
  var helmetM = new THREE.MeshStandardMaterial({ color: col(0x9aa3ad), roughness: 0.3, metalness: 0.75 });
  var shieldM = new THREE.MeshStandardMaterial({ color: col(0x2b3a55), roughness: 0.4, metalness: 0.5 });
  var limeM = new THREE.MeshStandardMaterial({ color: col(0xE4F23F), roughness: 0.5 });
  var iceM = new THREE.MeshPhysicalMaterial({ color: col(0xbfefff), roughness: 0.1, metalness: 0, transparent: true, opacity: 0.42, clearcoat: 1, depthWrite: false });
  var glassM = new THREE.MeshStandardMaterial({ color: col(0x0a0a0c), roughness: 0.15, metalness: 0.6 });
  var tieM = new THREE.MeshStandardMaterial({ color: col(0xc9242f), roughness: 0.5 });
  function boneGroup() { var g = new THREE.Group(); g.matrixAutoUpdate = false; scene.add(g); return g; }
  function makeOpp(i) {
    var pg = new THREE.Group(), pm = new THREE.MeshStandardMaterial({ color: col(0x3c3e3a), roughness: 0.6 });
    var ph = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.29, 0.016), pm); ph.castShadow = true; pg.add(ph);
    var pgr = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.13, 8), new THREE.MeshStandardMaterial({ color: col(0x8f918a), roughness: 0.9 })); pgr.position.y = -0.2; pg.add(pgr);
    var rig = NinjaRig.create(THREE, scene, { col: col, cloth: 0xd9472f, shade: 0x8f2a1a, accent: 0x0b1e3b, paddle: pg });
    var faceG = boneGroup(), chestG = boneGroup();
    var fc = document.createElement("canvas"); fc.width = fc.height = 512;
    var ft = new THREE.CanvasTexture(fc); ft.encoding = THREE.sRGBEncoding;
    var face = new THREE.Group(); face.position.copy(FACE_C); face.rotation.y = Math.PI; faceG.add(face);
    var rimM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    face.add(new THREE.Mesh(new THREE.RingGeometry(FACE_R, FACE_R + 0.018, 48), rimM));
    var disc = new THREE.Mesh(new THREE.CircleGeometry(FACE_R, 48), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.6, transparent: true })); disc.position.z = 0.002; face.add(disc);
    /* sunglasses sit on the sticker */
    var shades = new THREE.Group(); shades.position.z = 0.014; face.add(shades);
    [-1, 1].forEach(function (s) { var l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.055, 0.012), glassM); l.position.set(0.064 * s, 0.03, 0); shades.add(l); });
    var br = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.01), glassM); br.position.set(0, 0.045, 0); shades.add(br); shades.visible = false;
    /* necktie on the chest bone */
    var tie = new THREE.Group(); tie.position.set(0, 0.78, -0.375); tie.rotation.x = 0.18; chestG.add(tie);
    var knot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.03), tieM); tie.add(knot);
    var bs = new THREE.Shape(); bs.moveTo(-0.022, 0); bs.lineTo(0.022, 0); bs.lineTo(0.045, -0.2); bs.lineTo(0, -0.25); bs.lineTo(-0.045, -0.2); bs.closePath();
    var blade = new THREE.Mesh(new THREE.ExtrudeGeometry(bs, { depth: 0.012, bevelEnabled: false }), tieM); blade.position.set(0, -0.02, -0.012); tie.add(blade); tie.visible = false;
    /* boss kit */
    var helmet = new THREE.Group(); faceG.add(helmet);
    var dome = new THREE.Mesh(new THREE.SphereGeometry(0.45, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), helmetM); dome.scale.set(1.1, 0.95, 1.1); dome.castShadow = true; helmet.add(dome);
    var stripe = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.025, 8, 40), limeM); stripe.rotation.x = Math.PI / 2; stripe.position.y = 0.03; stripe.scale.set(1.04, 1, 1); helmet.add(stripe);
    helmet.visible = false;
    var shield = new THREE.Group(); scene.add(shield); shield.visible = false;
    var sd = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 28), shieldM); sd.rotation.x = Math.PI / 2; sd.castShadow = true; shield.add(sd);
    var knob = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 20), limeM); knob.rotation.x = Math.PI / 2; knob.position.z = 0.03; shield.add(knob);
    /* ice block, white flag */
    var ice = new THREE.Mesh(new THREE.BoxGeometry(1, 1.9, 0.9), iceM); ice.visible = false; scene.add(ice);
    var flag = new THREE.Group(); scene.add(flag); flag.visible = false;
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.75, 8), new THREE.MeshStandardMaterial({ color: col(0x8a6a44) })); pole.position.y = 0.3; flag.add(pole);
    var cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.28), new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.8 })); cloth.position.set(0.22, 0.55, 0); flag.add(cloth);
    var o = { i: i, rig: rig, skel: null, mesh: null, arm: null, costume: "red", faceG: faceG, chestG: chestG, face: face, rimM: rimM, faceCtx: fc.getContext("2d"), faceTex: ft, defFace: defaultFace(i % 2), stage: 0,
      shades: shades, tie: tie, helmet: helmet, helmetHP: 0, helmetFly: null, shield: shield, ice: ice, flag: flag, cloth: cloth,
      x: 0, z: -2.5, zHome: -2.5, tx: 0, next: 0, vel: new V3(), gait: 0, react: 0, pain: 0, done: false, doneT: 0, flee: 0, fleeDir: 1, idle: 0,
      bubble: null, bubbleT: 0, swing: 0, swung: false, counterT: 4, dodge: 0, duckT: 0, block: null, hideT: 0, hideX: 0, blindT: 0, freezeT: 0, ko: null, slip: null,
      fakeShow: false, fakeDone: false, betrayT: 0, betrayShots: 0, rage: false, fat: false, lo: -2.5, hi: 2.5, active: false,
      headPos: new V3(), facePos: new V3(), pelvisPos: new V3(), chestPos: new V3(), lastIn: null, xform: new THREE.Matrix4(), xfQ: new THREE.Quaternion(), hasXf: false };
    drawFace(o);
    return o;
  }
  var opps = [0, 1, 2, 3].map(makeOpp);
  function active() { return opps.filter(function (o) { return o.active; }); }
  function setCostume(o, name) {
    var C = COSTUMES[name] || COSTUMES.red; o.costume = name; o.fat = !!C.fat; o.shades.visible = !!C.shades; o.tie.visible = !!C.tie;
    if (o.mesh) { var m = NinjaMascot.material(C.team); o.mesh.material = m; o.arm.material = m; }
  }

  /* ================= game state ================= */
  var LEVELS = [
    { speed: 1.0, smart: 0.0, counter: 0, name: "慢吞吞的小忍者", costume: "red" },
    { speed: 1.4, smart: 0.25, counter: 9, name: "胖胖忍者（颳風了）", costume: "fat", wind: true },
    { speed: 1.8, smart: 0.45, counter: 7, name: "西裝上司（下雨＋掩體）", costume: "suit", rain: true, cover: true },
    { speed: 2.2, smart: 0.65, counter: 5.5, name: "墨鏡老大（停電＋掩體）", costume: "shades", dark: true, cover: true },
    { speed: 2.4, smart: 0.8, counter: 4.5, name: "BOSS：鐵頭盾牌忍者", costume: "boss", boss: true }
  ];
  var DAILY = [
    { name: "彈跳球限定", desc: "只能用彈跳球，今天是打腳專家", ammo: "bounce" },
    { name: "全員盾牌", desc: "每個對手都拿著盾牌", shield: true },
    { name: "颱風天", desc: "全程強風，球會被吹偏", wind: true },
    { name: "停電夜", desc: "全場只剩聚光燈", dark: true },
    { name: "雙打雨戰", desc: "兩個對手，還下著大雨", duo: true, rain: true },
    { name: "超快對決", desc: "只能用超快球，對手速度加倍", ammo: "fast", fast: true },
    { name: "掩體戰", desc: "場上滿是紙箱掩體", cover: true },
    { name: "沒有道具", desc: "道具箱不出現，但流星雨充得特別快", noItems: true, ult2: true }
  ];
  function today() { var d = new Date(Date.now() + 8 * 3600e3); return d.toISOString().slice(0, 10); }
  var dayIdx = Math.floor((Date.now() + 8 * 3600e3) / 86400e3), DAY = DAILY[dayIdx % DAILY.length];
  var MODE_NAME = { free: "自由練習", timed: "計時挑戰", levels: "關卡模式", endless: "無盡模式", versus: "雙人輪流", daily: "每日挑戰" };
  var G = { mode: "free", playing: false, paused: false, score: 0, combo: 0, maxCombo: 0, hits: 0, faces: 0, time: 60, level: 0, wave: 0, rounds: 0, lives: 3,
    ammo: "normal", px: 0, ptx: 0, mg: { unlocked: false, on: false, left: 0, cd: 0 }, hitStop: 0, shake: 0, replay: null, keep: false,
    heat: 0, jam: 0, ult: 0, meteor: null, btT: 0, items: [], armed: false, itemT: 8, evT: 20, ev: null, mods: {}, pending: [],
    dodges: 0, roundHits: 0, roundDodges: 0, newAch: [], vs: null, levelStartScore: 0, onAgain: null };
  var W = { wind: 0, rain: 0, dark: 0, rainT: 0, darkT: 0 };

  /* lines */
  var TAUNT = ["打不到啦～", "就這樣？", "你瞄哪裡啊？", "太慢了！", "哈！沒中～", "練好再來！"];
  var BEG = ["好痛！", "不要打臉！", "饒了我吧～", "我錯了！", "住手！！", "臉好腫…"];
  var CRY = ["嗚嗚嗚…", "救命啊！", "我投降…", "嗚哇啊啊啊", "媽媽～", "再也不敢了…"];
  var GLOAT = ["哈哈哈！", "活該～", "打得好！", "嘻嘻嘻", "再打他！"];
  var FLEE = ["別打了啦！！", "嗚哇啊啊", "救命～～", "我投降了啊！"];
  var BEGK = ["求求你…", "放過我吧…", "我真的錯了…"];
  var custom = store.get("pbninja.cannon.lines", []);
  function hurtLine(o) { if (custom.length && Math.random() < 0.5) return rnd(custom); return rnd(o.pain < 35 ? BEG.slice(0, 3) : o.pain < 70 ? BEG : CRY); }

  /* ================= achievements ================= */
  var ACH = [
    ["first", "🏳", "第一次投降", "讓對手投降"], ["combo20", "🔥", "連擊 20", "一次打出 20 連擊"], ["combo50", "💥", "連擊 50", "一次打出 50 連擊"],
    ["face30", "🎯", "打臉狂", "一局打臉 30 次"], ["bullet", "⏱", "子彈時間", "觸發子彈時間"], ["meteor", "☄", "流星雨", "施放流星雨"],
    ["helmet", "⛑", "鋼盔殺手", "把 Boss 的鋼盔打飛"], ["rage", "😡", "惹毛 Boss", "讓 Boss 進入狂暴"], ["boss", "👑", "全破", "打完五關"],
    ["dodge10", "💨", "閃避大師", "一局閃過 10 次反擊"], ["flawless", "🛡", "毫髮無傷", "閃過反擊、自己沒被打中就讓對手投降"],
    ["freeze", "🧊", "冰封", "用冰凍球命中"], ["pie", "🥧", "奶油派", "奶油派糊臉"], ["banana", "🍌", "香蕉皮", "讓對手滑倒"], ["mega", "🟡", "巨無霸", "巨無霸球命中"],
    ["cover", "📦", "拆遷大隊", "打爛一個掩體"], ["air", "🪂", "空中追擊", "對手被打飛時再命中他"], ["ruthless", "😈", "冷血無情", "對手求饒時選繼續打"],
    ["betrayed", "🤡", "心軟的代價", "放過他然後被偷襲"], ["wave10", "🌊", "撐過十波", "無盡模式到第 10 波"], ["timed3000", "⭐", "計時 3000", "計時挑戰拿到 3000 分"],
    ["versus", "🤝", "雙人對決", "完成一場雙人輪流"], ["daily", "📅", "每日挑戰", "完成今天的每日挑戰"]
  ];
  var got = store.get("pbninja.cannon.ach", {});
  function unlock(k) {
    if (got[k]) return; var a = ACH.filter(function (x) { return x[0] === k; })[0]; if (!a) return;
    got[k] = today(); store.set("pbninja.cannon.ach", got); G.newAch.push(k); sfx.achieve();
    var t = document.createElement("div"); t.className = "toast box"; t.innerHTML = "<b>" + a[1] + "</b><span><em>成就解鎖</em>" + a[2] + "</span>"; $("#toasts").appendChild(t); setTimeout(function () { t.remove(); }, 3300);
  }
  function showBadges() {
    var n = ACH.filter(function (a) { return got[a[0]]; }).length; $("#badgeCount").textContent = "已解鎖 " + n + " / " + ACH.length;
    $("#badges").innerHTML = ACH.map(function (a) { var g = got[a[0]]; return '<div class="badge' + (g ? " got" : "") + '"><b>' + a[1] + "</b><strong>" + (g ? a[2] : "？？？") + "</strong>" + a[3] + "</div>"; }).join("");
  }

  /* ================= UI helpers ================= */
  function popText(txt, wp, small) {
    var p = wp.clone().project(cam), r = canvas.getBoundingClientRect(), d = document.createElement("div");
    d.className = "pop" + (small ? " sm" : ""); d.textContent = txt; d.style.left = (r.left + (p.x + 1) / 2 * r.width) + "px"; d.style.top = (r.top + (1 - p.y) / 2 * r.height) + "px";
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, 950);
  }
  function banner(t) { var d = document.createElement("div"); d.className = "pop"; d.style.left = "50%"; d.style.top = "34%"; d.style.fontSize = "30px"; d.style.animationDuration = "1.9s"; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 1950); }
  function bubble(o, txt, dur, speak) {
    if (o.bubble) { scene.remove(o.bubble); o.bubble.material.map.dispose(); }
    var c = document.createElement("canvas"); c.width = 640; c.height = 160; var x = c.getContext("2d");
    x.font = "900 64px 'Noto Sans TC','PingFang TC',sans-serif"; var w = Math.min(620, x.measureText(txt).width + 80);
    x.fillStyle = "#fff"; x.strokeStyle = "#071E3D"; x.lineWidth = 8; x.beginPath(); if (x.roundRect) x.roundRect(320 - w / 2, 8, w, 120, 40); else x.rect(320 - w / 2, 8, w, 120); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(294, 124); x.lineTo(320, 156); x.lineTo(346, 124); x.fill();
    x.fillStyle = "#d9472f"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(txt, 320, 70);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(1.5, 0.375, 1); s.renderOrder = 10; scene.add(s);
    o.bubble = s; o.bubbleT = dur || 1.4;
    if (speak !== false) FX.Voice.say(txt, speak === "big");
  }
  function hud() {
    $("#score").textContent = Math.round(G.score); $("#hf").textContent = G.hits + " / " + G.faces;
    var L = Math.max(0, G.lives); $("#hearts").innerHTML = "❤".repeat(L) + "<i>" + "❤".repeat(Math.max(0, 3 - L)) + "</i>";
    $("#pains").innerHTML = active().map(function (o, k, arr) { var p = Math.min(100, Math.round(o.pain));
      return '<div class="row"><span>' + (arr.length > 1 ? String.fromCharCode(65 + k) + " " : "") + "哀嚎值</span><span>" + (o.done ? "投降" : p + "%") + '</span></div><div class="meter"><i style="width:' + p + '%"></i></div>'; }).join("");
    $("#timer").textContent = Math.ceil(G.time);
    $("#level").textContent = G.mode === "levels" ? (G.level + 1) + " / 5" : G.mode === "endless" ? "第 " + G.wave + " 波" : G.mode === "versus" ? "玩家 " + (G.vs ? G.vs.turn : 1) : "";
  }
  var comboTimer = 0;
  function mult() { return 1 + Math.min(G.combo, 20) * 0.1; }
  function showCombo() {
    var el = $("#combo"); if (G.combo < 2) { el.hidden = true; return; }
    el.hidden = false; el.innerHTML = G.combo + " 連擊！<small>分數 ×" + mult().toFixed(1) + (G.btT > 0 ? "　打臉 ×2" : "") + "</small>"; el.classList.add("pop"); clearTimeout(comboTimer); comboTimer = setTimeout(function () { el.classList.remove("pop"); }, 120);
  }
  function flash() { var f = $("#flash"); f.classList.add("on"); setTimeout(function () { f.classList.remove("on"); }, 60); }
  function showWarn(t) { var w = $("#warn"); w.textContent = t || "⚠ 對手反擊！快閃！"; w.hidden = false; clearTimeout(w._t); w._t = setTimeout(function () { w.hidden = true; }, 1000); }
  function later(t, fn) { G.pending.push({ t: t, fn: fn }); }

  /* ================= items ================= */
  var ITEMS = { homing: ["🎯", "追蹤球"], ice: ["🧊", "冰凍球"], pie: ["🥧", "奶油派"], banana: ["🍌", "香蕉皮"], mega: ["🟡", "巨無霸球"], heart: ["❤", "補血"] };
  function itemUI() {
    var b = $("#item"); if (!G.items.length) { b.hidden = true; G.armed = false; return; }
    var it = ITEMS[G.items[0]]; b.hidden = false; $("#itemIcon").textContent = it[0]; $("#itemName").textContent = it[1];
    $("#itemMore").textContent = G.armed ? "下一發" : (G.items.length > 1 ? "還有 " + (G.items.length - 1) + " 個" : "點一下裝填"); b.classList.toggle("armed", G.armed);
  }
  $("#item").addEventListener("click", function () { if (!G.items.length) return; G.armed = !G.armed; itemUI(); });
  function grant(k) {
    sfx.item();
    if (k === "heart") { G.lives = Math.min(5, G.lives + 1); sfx.heart(); popText("+1 生命！", new V3(G.px, 1.6, 3), false); hud(); return; }
    if (G.items.length >= 3) G.items.shift(); G.items.push(k); popText("獲得：" + ITEMS[k][1] + "！", new V3(0, 2.2, -1), false); itemUI();
  }

  /* ================= balls ================= */
  var GR = -9.81, balls = [], piles = [], debris = [], peels = [], crates = [], covers = [], smoke = [];
  var ballGeo = new THREE.SphereGeometry(1, 16, 12);
  function em(c, i) { return new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.6, emissive: col(c), emissiveIntensity: i }); }
  var matN = em(0xE4F23F, 0.25), matF = em(0x8fe3ff, 0.6), matS = em(0xff9f3d, 0.35), matB = em(0x4fe39b, 0.3), matC = em(0xff3b2f, 0.8), matH = em(0xb57bff, 0.7), matI = em(0x9fe8ff, 0.9), matM = em(0xffa64d, 0.9);
  matF.color.set(0xffffff);
  var tearMat = new THREE.MeshBasicMaterial({ color: 0x8fe3ff, transparent: true, opacity: 0.9 }), tears = [];
  var pieProto = (function () { var g = new THREE.Group(); var cr = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.05, 20), new THREE.MeshStandardMaterial({ color: col(0xc98b4a), roughness: 0.8 })); g.add(cr);
    var cm = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: col(0xfffaf0), roughness: 0.5 })); cm.scale.y = 0.45; cm.position.y = 0.02; g.add(cm);
    var ch = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), new THREE.MeshStandardMaterial({ color: col(0xe8452f) })); ch.position.y = 0.07; g.add(ch); return g; })();
  var bananaProto = (function () { var g = new THREE.Group(), m = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.028, 8, 16, Math.PI * 0.9), new THREE.MeshStandardMaterial({ color: col(0xffd84a), roughness: 0.6 })); m.rotation.z = Math.PI * 0.05; g.add(m); return g; })();
  var AMMO = {
    normal: { r: 0.037, T: 0.6, dmg: 1, m: matN, heat: 0.11 }, big: { r: 0.09, T: 0.78, dmg: 0.7, m: matN, heat: 0.14 }, fast: { r: 0.037, T: 0.3, dmg: 1.3, m: matF, heat: 0.13 },
    split: { r: 0.04, T: 0.66, dmg: 0.9, m: matS, heat: 0.14 }, bounce: { r: 0.045, T: 0.62, dmg: 1.1, m: matB, heat: 0.12 },
    homing: { r: 0.05, T: 0.75, dmg: 1.3, m: matH, heat: 0 }, ice: { r: 0.055, T: 0.66, dmg: 0.8, m: matI, heat: 0 }, pie: { r: 0.12, T: 0.8, dmg: 0.6, heat: 0 },
    banana: { r: 0.08, T: 0.7, dmg: 0, heat: 0 }, mega: { r: 0.38, T: 0.95, dmg: 3, m: matN, heat: 0 }, meteor: { r: 0.06, T: 1, dmg: 0.45, m: matM, heat: 0 }
  };
  function spawn(type, pos, v, charge) {
    var A = AMMO[type], m;
    if (type === "pie") m = pieProto.clone(); else if (type === "banana") m = bananaProto.clone();
    else { m = new THREE.Mesh(ballGeo, A.m); m.scale.setScalar(A.r); m.castShadow = type !== "meteor"; }
    m.position.copy(pos); scene.add(m);
    var b = { m: m, v: v, type: type, r: A.r, dmg: A.dmg * (1 + (charge || 0)), charge: charge || 0, age: 0, hit: false, counted: false, bounced: 0, split: type !== "split", spin: Math.random() * 6 };
    balls.push(b); if (balls.length > 140) { var o = balls.shift(); scene.remove(o.m); }
    return b;
  }
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), aimPlane = new THREE.Plane(new V3(0, 0, 1), 2.5);
  function avgZ() { var a = active().filter(function (o) { return !o.ko; }); return a.length ? a.reduce(function (s, o) { return s + o.z; }, 0) / a.length : -2.5; }
  function aimAt(cx, cy) {
    var r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam); aimPlane.constant = -avgZ(); var aim = new V3(); if (!ray.ray.intersectPlane(aimPlane, aim)) return null;
    aim.y = clamp(aim.y, 0.12, 2.6); return aim;
  }
  var recoil = 0;
  function fire(cx, cy, charge, typeOverride) {
    if (G.paused) return;
    if (G.jam > 0) { popText("卡彈中！", new V3(G.px, 1.2, 4.6), true); return; }
    var aim = aimAt(cx, cy); if (!aim) return;
    var type = typeOverride || G.ammo;
    if (!typeOverride && G.armed && G.items.length) { type = G.items.shift(); G.armed = false; itemUI(); charge = 0; }
    var A = AMMO[type], S = new V3(G.px, 0.5, 5.2), T = A.T * (1 - 0.4 * (charge || 0)), v;
    if (type === "bounce" || type === "banana") { var gp = new V3(aim.x, 0, avgZ() + (type === "banana" ? 0.2 : 1.4)); v = gp.sub(S).multiplyScalar(1 / T); v.y = (0 - S.y) / T - 0.5 * GR * T; }
    else { v = aim.clone().sub(S).multiplyScalar(1 / T); v.y -= 0.5 * GR * T; }
    spawn(type, S, v, charge);
    G.heat += A.heat * (typeOverride === "normal" && G.mg.on ? 0.3 : 1) + 0.08 * (charge || 0);
    if (G.heat >= 1) { G.jam = 2; G.heat = 1; sfx.hiss(); popText("過熱卡彈！", new V3(G.px, 1.3, 4.6)); $("#heat").classList.add("jam"); }
    barrel.lookAt(barrel.localToWorld(new V3()).add(v)); barrel.rotateY(Math.PI); recoil = 1; sfx.pop();
  }

  /* ================= input ================= */
  var press = null, pointer = { x: 0, y: 0 }, chargeEl = $("#charge"), mgNext = 0;
  canvas.addEventListener("pointerdown", function (e) { FX.audio(); if (!G.playing || G.replay || G.paused) return; press = { t: performance.now() }; pointer.x = e.clientX; pointer.y = e.clientY; mgNext = 0; });
  canvas.addEventListener("pointermove", function (e) { pointer.x = e.clientX; pointer.y = e.clientY; });
  canvas.addEventListener("pointerup", function (e) {
    if (!press) return; var held = (performance.now() - press.t) / 1000; press = null; chargeEl.hidden = true;
    if (!G.playing || G.replay || G.paused || G.mg.on) return;
    fire(e.clientX, e.clientY, held > 0.18 ? clamp((held - 0.18) / 0.9, 0, 1) : 0);
  });
  canvas.addEventListener("pointercancel", function () { press = null; chargeEl.hidden = true; });
  function setAmmo(a) { G.ammo = a; $$("#ammo [data-a]").forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.a === a)); }); }
  $$("#ammo [data-a]").forEach(function (b) { b.addEventListener("click", function () { if (G.mods.ammo && b.dataset.a !== G.mods.ammo) return; setAmmo(b.dataset.a); }); });
  $("#mg").addEventListener("click", function () { if (G.mg.cd > 0 || G.mg.on) return; G.mg.on = true; G.mg.left = 5; $("#mg").classList.add("on"); $("#hint").textContent = "連發中！按住畫面掃射"; });
  $("#ult").addEventListener("click", function () { if (G.ult < 1 || G.meteor || !G.playing) return; G.ult = 0; G.meteor = { t: 0, dur: 2.6 }; sfx.meteor(); FX.crowd(1); banner("☄ 流星雨！"); unlock("meteor"); FX.vibe([60, 40, 60, 40, 120]); });
  function dodge(d) { G.ptx = clamp(G.ptx + d * 1.3, -2.2, 2.2); }
  $("#dl").addEventListener("click", function () { dodge(-1); }); $("#dr").addEventListener("click", function () { dodge(1); });
  addEventListener("keydown", function (e) { if (e.key === "ArrowLeft" || e.key === "a") dodge(-1); if (e.key === "ArrowRight" || e.key === "d") dodge(1); });

  /* photos (read here, never uploaded) */
  function upload(slot, f) { var url = URL.createObjectURL(f), img = new Image(); img.onload = function () { photos[slot] = photoCanvas(img); opps.forEach(drawFace); URL.revokeObjectURL(url); }; img.src = url; }
  $("#fileA").addEventListener("change", function (e) { var f = e.target.files && e.target.files[0]; if (f) upload(0, f); e.target.value = ""; });
  $("#fileB").addEventListener("change", function (e) { var f = e.target.files && e.target.files[0]; if (f) upload(1, f); e.target.value = ""; });
  $("#clear").addEventListener("click", function () { photos = [null, null]; opps.forEach(drawFace); });

  /* settings */
  $("#custom").value = custom.join("，");
  $("#custom").addEventListener("change", function (e) { custom = e.target.value.split(/[,，、\n]/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 20); store.set("pbninja.cannon.lines", custom); });
  [["optVoice", "voice"], ["optMusic", "music"], ["optVibe", "vibe"]].forEach(function (p) { var el = $("#" + p[0]); el.checked = !!FX.opt[p[1]]; el.addEventListener("change", function () { FX.setOpt(p[1], el.checked); musicUI(); }); });
  function musicUI() { $("#musicBtn").setAttribute("aria-pressed", String(!!FX.opt.music)); $("#musicBtn").textContent = FX.opt.music ? "♪ 音樂" : "♪ 關"; $("#optMusic").checked = !!FX.opt.music; }
  $("#musicBtn").addEventListener("click", function () { FX.setOpt("music", !FX.opt.music); musicUI(); }); musicUI();
  function recUI() { var r = FX.Voice.recording(); $("#recBtn").textContent = r ? "⏹ 錄音中…點一下停止" : (FX.Voice.has() ? "🎙 重新錄音" : "🎙 錄音（最多 3 秒）"); $("#recPlay").disabled = !FX.Voice.has(); $("#recClear").disabled = !FX.Voice.has(); }
  $("#recBtn").addEventListener("click", function () { var p = FX.Voice.record(); recUI(); p.then(recUI).catch(function (e) { recUI(); alertish("沒辦法錄音：" + (e && e.message || "麥克風被拒絕")); }); });
  $("#recPlay").addEventListener("click", function () { FX.Voice.preview(); });
  $("#recClear").addEventListener("click", function () { FX.Voice.clear(); recUI(); });
  function alertish(t) { var d = document.createElement("div"); d.className = "toast box"; d.innerHTML = "<b>⚠</b><span>" + t + "</span>"; $("#toasts").appendChild(d); setTimeout(function () { d.remove(); }, 3300); }
  $$(".tabs [data-t]").forEach(function (b) { b.addEventListener("click", function () { $$(".tabs [data-t]").forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); }); $$("#menu section").forEach(function (s) { s.hidden = s.dataset.p !== b.dataset.t; }); if (b.dataset.t === "badges") showBadges(); if (b.dataset.t === "board") showBoard(); }); });
  $("#dailyName").textContent = DAY.name; $("#dailyTxt").textContent = "今日挑戰（" + today().slice(5).replace("-", "/") + "）：" + DAY.name + "，" + DAY.desc + "。60 秒拚分數。";

  /* ================= covers, crates ================= */
  var boxT = (function () { var c = document.createElement("canvas"); c.width = c.height = 128; var x = c.getContext("2d"); x.fillStyle = "#c49a5e"; x.fillRect(0, 0, 128, 128); x.fillStyle = "rgba(90,60,20,.25)"; for (var i = 0; i < 40; i++) x.fillRect(Math.random() * 128, Math.random() * 128, 30, 1);
    x.fillStyle = "#d9c08a"; x.fillRect(0, 56, 128, 16); x.strokeStyle = "#7a5524"; x.lineWidth = 3; x.strokeRect(2, 2, 124, 124); var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; })();
  var cardM = new THREE.MeshStandardMaterial({ map: boxT, roughness: 0.9 });
  var crateT = (function () { var c = document.createElement("canvas"); c.width = c.height = 128; var x = c.getContext("2d"); x.fillStyle = "#3b2a16"; x.fillRect(0, 0, 128, 128); x.fillStyle = "#E4F23F"; x.fillRect(8, 8, 112, 112); x.fillStyle = "#071E3D"; x.font = "900 96px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("?", 64, 70); var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; })();
  var crateM = new THREE.MeshStandardMaterial({ map: crateT, roughness: 0.5, emissive: col(0x3a3d10), emissiveIntensity: 0.6 });
  function spawnCover(x) {
    var g = new THREE.Group(); g.position.set(x, 0, -1.7); scene.add(g);
    [[0, 0.33, 0.9, 0.66], [0.04, 0.98, 0.8, 0.64]].forEach(function (b) { var m = new THREE.Mesh(new THREE.BoxGeometry(b[2], b[3], 0.5), cardM); m.position.set(b[0], b[1], 0); m.castShadow = true; m.receiveShadow = true; g.add(m); });
    covers.push({ g: g, x: x, z: -1.7, w: 0.9, h: 1.3, d: 0.5, hp: 5, shake: 0 });
  }
  function breakAt(pos, mat, n, size) {
    for (var i = 0; i < n; i++) { var m = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.7, size * 0.4), mat); m.position.copy(pos).add(new V3((Math.random() - 0.5) * 0.4, Math.random() * 0.5, (Math.random() - 0.5) * 0.3)); m.castShadow = true; scene.add(m);
      debris.push({ m: m, v: new V3((Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.3) * 3), w: new V3(Math.random() * 8, Math.random() * 8, Math.random() * 8), age: 0 }); }
  }
  function spawnCrate() {
    var m = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), crateM); m.castShadow = true; scene.add(m);
    crates.push({ m: m, x0: (Math.random() - 0.5) * 2.4, z: -0.9 - Math.random() * 0.5, t: Math.random() * 6, life: 11 });
  }

  /* ================= modes and rounds ================= */
  function L() {
    if (G.mode === "levels") return LEVELS[G.level];
    if (G.mode === "endless") { var w = G.wave; return { speed: 1.1 + 0.12 * w, smart: Math.min(0.8, 0.08 * w), counter: Math.max(4, 10 - 0.6 * w) }; }
    if (G.mode === "timed" || G.mode === "daily" || G.mode === "versus") { var b = LEVELS[Math.min(3, 1 + G.rounds)]; return { speed: b.speed * (G.mods.fast ? 1.6 : 1), smart: b.smart, counter: b.counter }; }
    return { speed: 1.3, smart: 0.2, counter: 8 };
  }
  function resetOpp(o, x, costume) {
    o.pain = 0; o.stage = 0; o.done = false; o.doneT = 0; o.flee = 0; o.react = 0; o.swing = 0; o.x = o.tx = x; o.z = o.zHome = -2.5; o.next = 0; o.counterT = 3 + Math.random() * 3; o.idle = 0; o.block = null; o.duckT = 0;
    o.hideT = 0; o.blindT = 0; o.freezeT = 0; o.ko = null; o.slip = null; o.fakeShow = false; o.fakeDone = false; o.betrayT = 0; o.betrayShots = 0; o.rage = false; o.hasXf = false; o.rig.xform = null;
    o.ice.visible = false; o.flag.visible = false; o.rig.paddle.visible = true;
    setCostume(o, costume);
    var boss = costume === "boss";
    if (o.helmet.parent !== o.faceG) o.faceG.add(o.helmet);
    o.helmetHP = boss ? 6 : 0; o.helmet.visible = boss; o.helmet.position.set(0, 1.37, 0.03); o.helmet.rotation.set(0, 0, 0); o.helmetFly = null;
    o.shield.visible = boss || !!G.mods.shield;
    if (o.bubble) { scene.remove(o.bubble); o.bubble = null; }
    drawFace(o);
  }
  function layout(n) {
    var list = opps.slice(0, n), w = 5.4 / n;
    opps.forEach(function (o, k) { var on = k < n; o.active = on; o.rig.group.visible = on; o.faceG.visible = on; o.chestG.visible = on; if (!on) { o.shield.visible = false; o.ice.visible = false; o.flag.visible = false; if (o.bubble) { scene.remove(o.bubble); o.bubble = null; } o.rig.paddle.visible = false; } });
    list.forEach(function (o, k) { var c = n === 1 ? 0 : -2.7 + w * (k + 0.5); o.lo = n === 1 ? -2.5 : c - w * 0.42; o.hi = n === 1 ? 2.5 : c + w * 0.42; o.home = c; });
    return list;
  }
  function startRound() {
    var lv = L(), n = G.mode === "endless" ? Math.min(4, 1 + Math.floor((G.wave - 1) / 2)) : (G.mode === "free" || G.mode === "timed") && G.duo ? 2 : G.mods.duo ? 2 : 1;
    var list = layout(n);
    list.forEach(function (o) { resetOpp(o, o.home, lv.costume || (G.mode === "free" && G.rounds === 0 ? "red" : rnd(RANDOM_COSTUMES))); });
    covers.forEach(function (c) { scene.remove(c.g); }); covers = [];
    if (lv.cover || G.mods.cover || (G.mode === "endless" && G.wave >= 3 && Math.random() < 0.5)) { spawnCover(-1.3 + (Math.random() - 0.5) * 0.6); spawnCover(1.3 + (Math.random() - 0.5) * 0.6); }
    piles.forEach(function (b) { scene.remove(b.m); }); piles = []; peels.forEach(function (p) { scene.remove(p.m); }); peels = [];
    G.keep = false; G.roundHits = 0; G.roundDodges = 0; G.roundTaken = false;
    G.mg.unlocked = false; G.mg.on = false; $("#mg").hidden = true; $("#mg").classList.remove("on");
    /* weather for this round */
    W.wind = lv.wind || G.mods.wind ? (Math.random() < 0.5 ? -1 : 1) * (1.8 + Math.random() * 1.2) : 0; W.rainT = lv.rain || G.mods.rain ? 1 : 0; W.darkT = lv.dark || G.mods.dark ? 1 : 0;
    G.ev = null; G.evT = 18 + Math.random() * 10;
    var bossMat = NinjaMascot.material("c_armor"); if (bossMat) bossMat.emissive.setRGB(0, 0, 0);
    $("#upBWrap").hidden = n < 2; $("#upA").textContent = n > 1 ? "A" : "對手";
    if (G.mode === "levels") banner("第 " + (G.level + 1) + " 關：" + lv.name);
    if (G.mode === "endless") banner("第 " + G.wave + " 波：" + n + " 個對手");
    hud();
  }
  function start(mode, keepScore, lvl) {
    stopReplay(); G.pending = [];
    G.mode = mode; G.mods = mode === "daily" ? DAY : {}; G.duo = $("#duo").checked;
    if (!keepScore) { G.score = 0; G.newAch = []; G.maxCombo = 0; G.hits = 0; G.faces = 0; G.dodges = 0; }
    G.combo = 0; G.time = mode === "versus" ? 30 : 60; G.level = lvl || 0; G.wave = 1; G.rounds = 0; G.lives = 3; G.px = G.ptx = 0;
    G.playing = true; G.paused = false; G.mg.cd = 0; G.heat = 0; G.jam = 0; G.ult = 0; G.meteor = null; G.btT = 0; G.items = []; G.armed = false; G.itemT = 8; G.levelStartScore = G.score;
    setAmmo(G.mods.ammo || "normal"); $$("#ammo [data-a]").forEach(function (b) { b.disabled = !!G.mods.ammo && b.dataset.a !== G.mods.ammo; });
    $("#menu").hidden = true; $("#result").hidden = true; $("#cardView").hidden = true; $("#fake").hidden = true;
    $("#timerRow").hidden = !(mode === "timed" || mode === "daily" || mode === "versus"); $("#levelRow").hidden = !(mode === "levels" || mode === "endless" || mode === "versus");
    $("#levelLab").textContent = mode === "endless" ? "波數" : mode === "versus" ? "輪到" : "關卡";
    $("#hint").textContent = mode === "daily" ? "今日挑戰：" + DAY.name + "　" + DAY.desc : "點一下發射，按住蓄力再放開更強！"; $("#hint").hidden = false;
    itemUI(); startRound(); showCombo(); hud();
  }
  $$("#menu [data-m]").forEach(function (b) { b.addEventListener("click", function () { FX.audio(); if (b.dataset.m === "versus") { G.vs = { turn: 1, p1: 0 }; } start(b.dataset.m); }); });
  $("#menuBtn").addEventListener("click", function () { G.playing = false; G.paused = false; $("#fake").hidden = true; $("#result").hidden = true; showBoard(); $("#menu").hidden = false; });
  $("#resMenu").addEventListener("click", function () { $("#result").hidden = true; showBoard(); $("#menu").hidden = false; });
  $("#resAgain").addEventListener("click", function () { var f = G.onAgain; G.onAgain = null; $("#result").hidden = true; if (f) f(); else start(G.mode); });
  $("#resKeep").addEventListener("click", function () {
    $("#result").hidden = true; G.playing = true; G.keep = true; $("#hint").hidden = false; $("#hint").textContent = "繼續修理他！10 秒後回到結算";
    var again = G.lastResult; later(10, function () { if (G.keep && again) results(again.head, again.txt, again.opts); });
  });

  /* leaderboards (this device only) */
  function board() { return store.get("pbninja.cannon.best", { timed: [], levels: [], endless: [] }); }
  function record(mode, s, title) {
    var entry = { s: Math.round(s), t: title, d: today().slice(5).replace("-", "/"), k: Date.now() }, list;
    if (mode === "daily") { var dl = store.get("pbninja.cannon.daily", { date: "", list: [] }); if (dl.date !== today()) dl = { date: today(), list: [] }; list = dl.list; list.push(entry); list.sort(function (a, c) { return c.s - a.s; }); dl.list = list.slice(0, 5); store.set("pbninja.cannon.daily", dl); return (dl.list.indexOf(entry) + 1) || "5 名外"; }
    var b = board(); list = b[mode] || []; list.push(entry); list.sort(function (a, c) { return c.s - a.s; }); b[mode] = list.slice(0, 5); store.set("pbninja.cannon.best", b);
    return (b[mode].indexOf(entry) + 1) || "5 名外";
  }
  function showBoard() {
    var b = board(), dl = store.get("pbninja.cannon.daily", { date: "", list: [] });
    [["timed", b.timed], ["levels", b.levels], ["endless", b.endless], ["daily", dl.date === today() ? dl.list : []]].forEach(function (p) {
      var l = p[1] || []; $("#lb-" + p[0]).innerHTML = l.length ? l.map(function (e) { return "<li><b>" + e.s + "</b>　" + e.t + "　" + e.d + "</li>"; }).join("") : "<li>還沒有紀錄</li>"; });
  }
  function titleFor(s) { return s < 600 ? "手下留情的教練" : s < 1500 ? "認真的砲手" : s < 3000 ? "冷血砲手" : s < 5000 ? "匹克球惡魔" : "傳說中的砲台之神"; }
  function results(head, txt, opts) {
    G.playing = false; press = null; G.keep = false; G.lastResult = { head: head, txt: txt, opts: opts };
    $("#resHead").textContent = head; $("#resScore").textContent = Math.round(G.score); $("#resTxt").textContent = txt;
    $("#resTitle").textContent = opts.title || ""; $("#resAgain").textContent = opts.again || "再玩一次"; $("#resKeep").hidden = !opts.keep; G.onAgain = opts.onAgain || null;
    $("#resBadges").innerHTML = G.newAch.map(function (k) { var a = ACH.filter(function (x) { return x[0] === k; })[0]; return "<span>" + a[1] + " " + a[2] + "</span>"; }).join("");
    $("#result").hidden = false; $("#hint").hidden = true; $("#fake").hidden = true;
  }
  function endTimed(reason) {
    var t = titleFor(G.score), lost = reason === "dead";
    if (G.mode === "versus") {
      if (G.vs.turn === 1) { G.vs.p1 = G.score; results(lost ? "玩家 1 倒下了！" : "玩家 1 時間到！", "玩家 1 拿到 " + Math.round(G.score) + " 分。把手機交給玩家 2！", { title: "換人", again: "玩家 2 開始 →", onAgain: function () { G.vs.turn = 2; start("versus"); } }); }
      else { var p1 = G.vs.p1, p2 = G.score, w = p1 === p2 ? "平手！" : p1 > p2 ? "玩家 1 獲勝！" : "玩家 2 獲勝！"; unlock("versus");
        results(w, "玩家 1：" + Math.round(p1) + " 分　玩家 2：" + Math.round(p2) + " 分", { title: w, again: "再比一場", onAgain: function () { G.vs = { turn: 1, p1: 0 }; start("versus"); } }); }
      return;
    }
    if (G.mode === "timed" && G.score >= 3000) unlock("timed3000");
    if (G.mode === "daily") unlock("daily");
    var rk = record(G.mode, G.score, t);
    results(lost ? "你倒下了！" : "時間到！", "命中 " + G.hits + " 球、打臉 " + G.faces + " 球、最高 " + G.maxCombo + " 連擊，排行榜第 " + rk + " 名", { title: t });
  }
  function gameOver() {
    if (G.mode === "timed" || G.mode === "daily" || G.mode === "versus") { G.time = 0; endTimed("dead"); return; }
    if (G.mode === "endless") { var rk = record("endless", G.score, "撐到第 " + G.wave + " 波"); results("你倒下了！", "撐到第 " + G.wave + " 波，排行榜第 " + rk + " 名", { title: titleFor(G.score) }); return; }
    if (G.mode === "levels") { var lvl = G.level; results("你倒下了！", "第 " + (lvl + 1) + " 關失敗，再挑戰一次", { again: "重打這一關", onAgain: function () { var s = G.levelStartScore; G.score = s; start("levels", true, lvl); G.levelStartScore = s; } }); return; }
    results("你倒下了！", "被反擊打倒了，再來一次！", { title: "" });
  }
  showBoard();

  /* ================= hits ================= */
  function nearest(p) { var best = null, bd = 1e9; active().forEach(function (o) { var d = Math.abs(o.x - p.x) + Math.abs(o.z - p.z) * 0.3; if (d < bd) { bd = d; best = o; } }); return best; }
  function onHit(o, b, kind) {
    b.hit = true; b.counted = true;
    if (b.type === "banana") return;
    if (kind === "face" && o.helmetHP > 0 && b.type !== "mega") {
      o.helmetHP--; sfx.clank(); popText(o.helmetHP ? "鏘！" : "安全帽飛了！", o.headPos, !!o.helmetHP);
      b.v.set((Math.random() - 0.5) * 4, 3, 4); G.combo++; G.hits++; G.score += 8 * mult(); o.react = Math.max(o.react, 0.5);
      if (!o.helmetHP) knockHelmet(o);
      showCombo(); hud(); return;
    }
    if (kind === "face" && o.helmetHP > 0) knockHelmet(o);
    var base = kind === "face" ? 25 : kind === "leg" ? 15 : 10, pain = (kind === "face" ? 12 : kind === "leg" ? 8 : 6) * b.dmg;
    if (o.freezeT > 0) pain *= 1.5;
    if (G.btT > 0 && kind === "face") base *= 2;
    G.combo++; G.hits++; G.roundHits++; if (kind === "face") G.faces++; G.maxCombo = Math.max(G.maxCombo, G.combo);
    G.score += base * mult() * (1 + b.charge); if (G.combo > 1) sfx.combo(G.combo % 24);
    G.ult = Math.min(1, G.ult + (kind === "face" ? 0.05 : 0.025) * (G.mods.ult2 ? 2 : 1) * (b.type === "meteor" ? 0 : 1));
    if (o.ko && o.ko.t < 1.9) { G.score += 50; popText("空中追擊！+50", o.headPos.clone().add(new V3(0, 0.5, 0)), true); unlock("air"); }
    if (!o.done) o.pain += pain;
    if (b.type !== "meteor" || Math.random() < 0.3) o.react = 1;
    b.v.set((Math.random() - 0.5) * 3, 2.5 + Math.random() * 1.5, 3 + Math.random() * 2);
    /* item effects */
    if (b.type === "ice") { o.freezeT = 2.5; sfx.freeze(); popText("凍住了！", o.headPos, false); unlock("freeze"); }
    if (b.type === "pie") { sfx.splat(); if (kind === "face") { o.blindT = 4; drawFace(o); popText("奶油派糊臉！", o.headPos, false); unlock("pie"); bubble(o, "看不到啦！！"); } }
    if (b.type === "mega") { unlock("mega"); G.shake = 0.18; }
    if (kind === "face") {
      if (b.type !== "pie") sfx.boom(); G.hitStop = b.type === "meteor" ? 0 : 0.09; G.shake = Math.max(G.shake, 0.07 + 0.05 * b.charge); if (b.type !== "meteor") flash();
      if (b.type !== "meteor" && b.type !== "pie") popText(rnd(b.charge > 0.6 ? ["超級暴擊！", "爆頭！！"] : ["BOOM!", "暴擊！", "爆頭！", "正中紅心！"]), o.facePos);
      for (var k = 0; k < (b.type === "meteor" ? 2 : 6); k++) { var tm = new THREE.Mesh(ballGeo, tearMat); tm.scale.setScalar(0.015); tm.position.copy(o.facePos).add(new V3((k % 2 ? 1 : -1) * 0.12, 0.03, 0.05)); scene.add(tm); tears.push({ m: tm, v: new V3((k % 2 ? 1 : -1) * (0.6 + Math.random()), 1 + Math.random(), 0.8 + Math.random() * 0.6), age: 0 }); }
      FX.vibe(40); if (G.combo >= 5 && b.type !== "meteor") FX.crowd(0.2 + G.combo / 40);
      if (G.faces >= 30) unlock("face30");
    } else { if (b.type !== "meteor") { sfx.hit(); popText(kind === "leg" ? "打腳！" : "命中！", b.m.position, true); } FX.vibe(20); }
    if (G.combo >= 20) unlock("combo20"); if (G.combo >= 50) unlock("combo50");
    if (G.combo > 0 && G.combo % 10 === 0 && b.type !== "meteor") bulletTime();
    if (o.done) { if (!o.ko && !o.slip) { o.flee = 2.2; o.fleeDir = o.x > (o.lo + o.hi) / 2 ? -1 : 1; if (b.type !== "meteor" || Math.random() < 0.1) bubble(o, rnd(FLEE)); } }
    else if (b.type !== "meteor" || Math.random() < 0.12) { if (o.freezeT <= 0 && b.type !== "pie") bubble(o, hurtLine(o)); }
    var others = active().filter(function (x) { return x !== o && !x.done && x.react < 0.2; }); if (others.length && Math.random() < 0.5 && b.type !== "meteor") { var ot = rnd(others); later(0.35, function () { bubble(ot, rnd(GLOAT), 1.1); }); }
    var st = Math.min(5, Math.floor(o.pain / 20)); if (st !== o.stage && !o.done) { o.stage = st; drawFace(o); }
    if (o.pain >= 50 && !G.mg.unlocked) { G.mg.unlocked = true; $("#mg").hidden = false; popText("連發模式解鎖！", o.headPos.clone().add(new V3(0, 0.7, 0)), true); }
    if (o.costume === "boss" && o.pain >= 70 && !o.rage && !o.done) { o.rage = true; bubble(o, "我生氣了！！", 1.6, "big"); banner("😡 BOSS 狂暴化！"); unlock("rage"); FX.crowd(0.6); }
    if (!o.done && !o.fakeDone && o.costume !== "boss" && o.pain >= 55 && o.pain < 95 && Math.random() < 0.5 && G.mode !== "versus") fakeSurrender(o);
    else if (!o.done && !o.fakeDone && o.pain >= 55) o.fakeDone = true;
    if (!o.done && o.pain >= 100) surrender(o, b);
    showCombo(); hud();
  }
  function knockHelmet(o) {
    o.helmetHP = 0; o.helmet.updateMatrixWorld(true); scene.attach(o.helmet); o.helmetFly = { v: new V3((Math.random() - 0.5) * 2, 4.5, -1.5), w: new V3(3, 5, 2) };
    unlock("helmet"); FX.crowd(0.7); bubble(o, "我的安全帽！", 1.2);
  }
  function miss(b) {
    b.counted = true; if (G.combo >= 3) popText("連擊中斷", new V3(G.px, 1.2, 3), true);
    G.combo = 0; showCombo();
    var o = nearest(b.m.position); if (o && !o.done && o.react < 0.2 && o.freezeT <= 0 && Math.random() < 0.35) bubble(o, custom.length && Math.random() < 0.2 ? rnd(custom) : rnd(TAUNT), 1.1);
  }

  /* fake surrender: a white flag, then either mercy (and a cheap shot) or no mercy */
  var fakeOpp = null;
  function fakeSurrender(o) {
    o.fakeDone = true; o.fakeShow = true; fakeOpp = o; bubble(o, "等一下！我投降！", 2, false);
    G.paused = true; press = null; $("#fake").hidden = false;
  }
  $("#spare").addEventListener("click", function () {
    var o = fakeOpp; $("#fake").hidden = true; G.paused = false; if (!o) return; o.fakeShow = false;
    bubble(o, "謝謝你～", 1.2); o.betrayT = 1.5;
  });
  $("#nospare").addEventListener("click", function () {
    var o = fakeOpp; $("#fake").hidden = true; G.paused = false; if (!o) return; o.fakeShow = false;
    bubble(o, "你好狠…", 1.3); G.score += 100; popText("無情加分 +100", o.headPos.clone().add(new V3(0, 0.6, 0)), false); unlock("ruthless"); hud();
  });

  /* the final blow: thrown off his feet, a slow-motion replay where it fits, then he gives up */
  function surrender(o, b) {
    o.done = true; o.doneT = 0; o.idle = 0; o.stage = 5; drawFace(o); o.fakeShow = false;
    o.ko = { t: 0, z0: o.z, dir: b && b.m.position.x < o.x ? 1 : -1 }; o.betrayT = 0; o.betrayShots = 0; o.swing = 0; o.blindT = 0; o.freezeT = 0; o.ice.visible = false; o.hideT = 0;
    sfx.launch(); FX.crowd(0.9); FX.vibe(150); unlock("first");
    if (G.roundHits > 0 && G.roundDodges > 0 && !G.roundTaken) unlock("flawless");
    later(0.95, function () { bubble(o, "我投降！別打了！", 2.4, "big"); sfx.wail(); });
    if (G.keep) return;
    var all = active().every(function (x) { return x.done; });
    if (!all) return;
    if (G.mode === "free" || G.mode === "levels") { var hitT = clock; later(1.35, function () { startReplay(hitT, afterSurrender); }); }
    else later(3.4, afterSurrender);
  }
  function afterSurrender() {
    if (!active().every(function (x) { return x.done; })) return;
    if (G.mode === "timed" || G.mode === "daily" || G.mode === "versus") { var n = active().length; G.score += 500 * n; banner("對手投降！+" + 500 * n + "　下一位！"); G.rounds++; hud(); later(1.2, function () { if (G.playing) startRound(); }); }
    else if (G.mode === "endless") { G.score += 200 * G.wave; banner("第 " + G.wave + " 波完成！+" + 200 * G.wave); G.wave++; if (G.wave > 10) unlock("wave10"); hud(); later(1.6, function () { if (G.playing) startRound(); }); }
    else if (G.mode === "levels") {
      G.score += 300 * (G.level + 1); hud();
      if (G.level >= 4) { unlock("boss"); var rk = record("levels", G.score, titleFor(G.score)); results("全破！BOSS 投降了", "五關全部打完，排行榜第 " + rk + " 名", { title: titleFor(G.score), keep: true }); }
      else results("第 " + (G.level + 1) + " 關過關！", "命中 " + G.hits + " 球，打臉 " + G.faces + " 球", { again: "下一關 →", keep: true, onAgain: function () { G.level++; G.levelStartScore = G.score; G.playing = true; $("#hint").hidden = false; startRound(); } });
    } else results("對手投降了！", "命中 " + G.hits + " 球，其中打臉 " + G.faces + " 球，最高 " + G.maxCombo + " 連擊", { again: "再來一輪", keep: true, onAgain: function () { G.rounds++; G.playing = true; $("#hint").hidden = false; startRound(); } });
  }

  function bulletTime() { if (G.btT > 0) return; G.btT = 3; sfx.bullet(); FX.crowd(0.5); $("#btTag").hidden = false; unlock("bullet"); }

  /* ================= slow-motion replay ================= */
  var buf = [], BUF_N = 400, repBalls = [];
  function cloneIn(p) { var c = {}; for (var k in p) c[k] = p[k] && p[k].clone ? p[k].clone() : p[k]; return c; }
  function snapshot(dt) {
    buf.push({ t: clock, dt: dt, o: opps.map(function (o) { return o.active && o.lastIn ? { inp: cloneIn(o.lastIn), xf: o.hasXf ? o.xform.clone() : null, sx: o.face.scale.x, sy: o.face.scale.y } : null; }),
      b: balls.map(function (b) { return [b.m.position.x, b.m.position.y, b.m.position.z, b.r, b.m.material || matN]; }) });
    if (buf.length > BUF_N) buf.shift();
  }
  function stopReplay() { if (!G.replay) return; G.replay = null; $("#replayTag").hidden = true; repBalls.forEach(function (m) { m.visible = false; }); balls.forEach(function (b) { b.m.visible = true; }); }
  function startReplay(hitT, after) {
    var frames = buf.filter(function (f) { return f.t >= hitT - 0.35 && f.t <= hitT + 1.25; });
    if (frames.length < 8) { after(); return; }
    G.replay = { frames: frames, i: 0, acc: 0, after: after }; $("#replayTag").hidden = false; balls.forEach(function (b) { b.m.visible = false; });
  }
  function stepReplay(real) {
    var R = G.replay; R.acc += real * 0.45;
    while (R.i < R.frames.length - 1 && R.acc >= R.frames[R.i].dt) { R.acc -= R.frames[R.i].dt; R.i++; }
    var f = R.frames[R.i];
    f.o.forEach(function (s, k) { if (!s) return; var o = opps[k]; o.rig.xform = s.xf; o.rig.update(s.inp); o.face.scale.set(s.sx, s.sy, 1); follow(o, s.xf); });
    while (repBalls.length < f.b.length) { var m = new THREE.Mesh(ballGeo, matN); scene.add(m); repBalls.push(m); }
    repBalls.forEach(function (m, k) { var d = f.b[k]; m.visible = !!d; if (d) { m.position.set(d[0], d[1], d[2]); m.scale.setScalar(d[3]); m.material = d[4]; } });
    var o = active().filter(function (x) { return x.done; })[0] || opps[0], h = o.pelvisPos;
    cam.position.set(h.x + 2.6, 1.7, h.z + 3.8); cam.lookAt(h.x, 0.9, h.z - 0.5);
    if (R.i >= R.frames.length - 1) { var a = R.after; stopReplay(); a(); }
  }

  /* ================= opponent ================= */
  var _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new V3(), XA = new V3(1, 0, 0);
  function lieY(a) { return 0.25 + 0.45 * Math.abs(Math.cos(a)); }
  /* the whole body's transform for this frame: thrown, slipping, and/or a wider build */
  function bodyXform(o, root, dt) {
    var ang = 0, cy = 0.7, any = false;
    if (o.ko) {
      var K = o.ko; K.t += dt; var t = K.t;
      if (t < 0.9) { var u = t / 0.9; o.z = K.z0 - 3.0 * u; ang = -2.2 * Math.PI * u; cy = Math.max(lieY(ang), 0.7 + 2.2 * 4 * u * (1 - u)); }
      else if (t < 1.9) { var e = 1 - Math.pow(1 - (t - 0.9), 2); o.z = K.z0 - 3.0 - 0.9 * e; ang = -2.2 * Math.PI - 2.3 * Math.PI * e; cy = lieY(ang); }
      else if (t < 2.7) { ang = -4.5 * Math.PI; cy = lieY(ang); }
      else if (t < 3.3) { ang = -4.5 * Math.PI + 0.5 * Math.PI * ss(0, 1, (t - 2.7) / 0.6); cy = lieY(ang); }
      else o.ko = null;
      root.z = o.z; any = !!o.ko;
    } else if (o.slip) {
      var S = o.slip; S.t += dt;
      if (S.t < 0.35) { ang = -Math.PI / 2 * ss(0, 1, S.t / 0.35); o.z += 0.9 * dt; }
      else if (S.t < 2.2) ang = -Math.PI / 2;
      else if (S.t < 2.8) ang = -Math.PI / 2 * (1 - ss(0, 1, (S.t - 2.2) / 0.6));
      else o.slip = null;
      cy = lieY(ang); root.z = o.z; any = !!o.slip;
    }
    o.xform.identity(); o.xfQ.identity();
    if (o.fat) { _m.makeTranslation(root.x, 0, root.z).multiply(_m2.makeScale(1.28, 1, 1.22)).multiply(new THREE.Matrix4().makeTranslation(-root.x, 0, -root.z)); o.xform.copy(_m); any = true; }
    if (ang !== 0 || cy !== 0.7) {
      _m.makeTranslation(root.x, cy, root.z).multiply(_m2.makeRotationX(ang)).multiply(new THREE.Matrix4().makeTranslation(-root.x, -0.7, -root.z));
      o.xform.premultiply(_m); o.xfQ.setFromAxisAngle(XA, ang); any = true;
    }
    o.hasXf = any; o.rig.xform = any ? o.xform : null;
  }
  /* things that ride on bones: face sticker, helmet, tie; plus paddle, shield, ice and flag */
  function follow(o, xf) {
    if (!o.skel) return;
    var B = o.skel.bones, I = o.skel.boneInverses;
    o.faceG.matrix.multiplyMatrices(B[2].matrixWorld, I[2]); o.faceG.matrixWorldNeedsUpdate = true; o.faceG.updateMatrixWorld(true);
    o.chestG.matrix.multiplyMatrices(B[1].matrixWorld, I[1]); o.chestG.matrixWorldNeedsUpdate = true; o.chestG.updateMatrixWorld(true);
    o.headPos.setFromMatrixPosition(B[2].matrixWorld); o.pelvisPos.setFromMatrixPosition(B[0].matrixWorld); o.chestPos.setFromMatrixPosition(B[1].matrixWorld);
    o.facePos.copy(FACE_C).applyMatrix4(o.faceG.matrixWorld);
    if (xf) { var pd = o.rig.paddle; pd.position.applyMatrix4(xf); _q.setFromRotationMatrix(_m.extractRotation(xf)); pd.quaternion.premultiply(_q); }
    if (o.shield.visible) { o.shield.position.copy(o.rig.J.arm[0].hand).add(_v.set(0, 0, 0.08)); if (xf) o.shield.position.applyMatrix4(xf); }
    if (o.ice.visible) { o.ice.position.copy(o.pelvisPos).add(_v.set(0, 0.45, 0)); }
    if (o.flag.visible) { o.flag.position.copy(o.rig.J.arm[1].hand); o.flag.rotation.set(0, 0, Math.sin(clock * 9) * 0.15); o.cloth.rotation.y = Math.sin(clock * 11) * 0.4; }
  }
  function predict(b, z) { var t = (z - b.m.position.z) / b.v.z; if (!(t > 0)) return null; return { t: t, x: b.m.position.x + b.v.x * t, y: b.m.position.y + b.v.y * t + 0.5 * GR * t * t }; }
  function think(o, dt) {
    var lv = L(), lo = o.lo, hi = o.hi, rage = o.rage ? 1.6 : 1;
    var speed = (lv.speed + o.pain / 80) * rage, root = new V3(o.x, 0, o.z), f = new V3(0, 0, 1), r = new V3(-1, 0, 0);
    var hand, hold = false, ballP = null, look = null, duck = 0, w = 0;
    o.react = Math.max(0, o.react - dt * 1.8); o.swing = Math.max(0, o.swing - dt); o.hideT = Math.max(0, o.hideT - dt);
    if (o.blindT > 0) { o.blindT -= dt; if (o.blindT <= 0) drawFace(o); }
    /* frozen: no thought, no motion; the pose holds */
    if (o.freezeT > 0) { o.freezeT -= dt; o.ice.visible = o.freezeT > 0; follow(o, o.hasXf ? o.xform : null); return; }
    var busy = o.ko || o.slip || o.done || o.fakeShow || o.blindT > 0;
    /* incoming ball: maybe side-step, duck, hide or put the paddle up (smarter on later levels) */
    if (!busy && o.react < 0.3) {
      var inc = null; balls.forEach(function (b) { if (b.hit || b.v.z >= 0 || b.counted || b.counter) return; var p = predict(b, o.z); if (p && p.t < 0.55 && Math.abs(p.x - o.x) < 0.7 && (!inc || p.t < inc.t)) inc = { b: b, t: p.t, x: p.x, y: p.y }; });
      if (inc && !inc.b["seen" + o.i]) {
        inc.b["seen" + o.i] = true; var roll = Math.random(), cv = coverNear(o);
        if (cv && roll < lv.smart * 0.3) { o.hideT = 2.4; o.hideX = cv.x; }
        else if (roll < lv.smart * 0.45) { o.tx = clamp(o.x + (inc.x > o.x ? -1.3 : 1.3), lo, hi); o.next = clock + 0.8; o.dodge = 0.4; }
        else if (roll < lv.smart * 0.75) o.block = { t: 0.5, y: inc.y, x: inc.x };
        else if (roll < lv.smart * 0.95 && inc.y > 1.0) o.duckT = 0.5;
      }
    }
    o.duckT = Math.max(0, o.duckT - dt); if (o.duckT > 0) duck = 1;
    if (o.ko || o.slip) {                                                     /* flailing */
      var fl = Math.sin(clock * 22); hand = root.clone().add(new V3(-0.35 + 0.1 * fl, 1.35 + 0.15 * fl, 0.1)); hold = true; ballP = root.clone().add(new V3(0.35 - 0.1 * fl, 1.35 - 0.15 * fl, 0.1));
      if (o.slip && o.slip.t > 0.4 && o.slip.t < 2.1 && Math.random() < dt * 1.2 && o.bubbleT <= 0) bubble(o, rnd(["哎唷！", "我的腰…", "香蕉皮！！"]), 0.9);
    } else if (o.fakeShow) {                                                  /* white flag up */
      hand = root.clone().addScaledVector(r, 0.25).addScaledVector(f, 0.1); hand.y = 1.75; hold = true; ballP = root.clone().addScaledVector(r, -0.28).addScaledVector(f, 0.1); ballP.y = 1.7;
    } else if (o.done) {
      o.doneT += dt;
      if (o.flee > 0) {
        o.flee -= dt; speed = 3.2; o.idle = 0;
        if (Math.abs(o.tx - o.x) < 0.2 || clock > o.next) { o.tx = o.fleeDir > 0 ? hi : lo; o.fleeDir *= -1; o.next = clock + 1.2; }
        hand = root.clone().add(new V3(-0.15, 1.45, 0.15)); hold = true; ballP = root.clone().add(new V3(0.15, 1.45, 0.15));
        if (Math.random() < dt * 0.8 && o.bubbleT <= 0) bubble(o, rnd(FLEE), 0.9);
      } else {
        o.idle += dt; speed = 0; o.tx = o.x;
        var u = Math.min(1, o.doneT / 0.4);
        if (o.idle > 3.4) { duck = Math.min(1, (o.idle - 3.4) * 2); hand = root.clone().addScaledVector(f, 0.35).addScaledVector(r, 0.08); hand.y = 0.7; hold = true; ballP = root.clone().addScaledVector(f, 0.35).addScaledVector(r, -0.08); ballP.y = 0.73;
          if (o.bubbleT <= 0 && Math.random() < dt * 0.5) bubble(o, rnd(BEGK), 1.3); }
        else { hand = root.clone().addScaledVector(r, 0.28).addScaledVector(f, 0.1); hand.y = 0.9 + 0.95 * u; hold = true; ballP = root.clone().addScaledVector(r, -0.28).addScaledVector(f, 0.1); ballP.y = 0.95 + 0.95 * u; }
      }
    } else if (o.swing > 0) {                                                 /* counter-attack swing */
      var sw = 1 - o.swing / 0.45; w = 1;
      hand = root.clone().addScaledVector(f, -0.15 + 0.6 * sw).addScaledVector(r, 0.35 - 0.2 * sw); hand.y = 0.7 + 0.5 * sw;
      if (sw > 0.55 && !o.swung) { o.swung = true; counterBall(o, hand, o.rage ? 3 : 1); }
    } else if (o.react > 0) {                                                 /* hands up to cover the face */
      var k = Math.min(1, o.react * 1.6); w = 0.9;
      hand = root.clone().addScaledVector(f, 0.32 - 0.12 * k).addScaledVector(r, 0.18 - 0.14 * k); hand.y = 0.85 + 0.35 * k;
      if (k > 0.4) { hold = true; ballP = root.clone().addScaledVector(f, 0.2).addScaledVector(r, -0.06); ballP.y = 1.18; }
    } else if (o.blindT > 0) {                                                /* pie in the face: blind and flailing */
      speed = 2.6; var fl2 = Math.sin(clock * 14); hand = root.clone().addScaledVector(f, 0.3).addScaledVector(r, 0.2 * fl2); hand.y = 1.2 + 0.2 * fl2; hold = true; ballP = root.clone().addScaledVector(f, 0.3).addScaledVector(r, -0.2 * fl2); ballP.y = 1.25;
      if (Math.random() < dt * 0.7 && o.bubbleT <= 0) bubble(o, rnd(["看不到啦！", "誰丟的！", "好甜…", "救命，奶油！"]), 1);
    } else if (o.block) {
      o.block.t -= dt; hand = new V3(clamp(o.block.x, o.x - 0.5, o.x + 0.5), clamp(o.block.y - 0.22, 0.5, 1.6), o.z + 0.35); w = 0.8;
      if (o.block.t <= 0) o.block = null;
    } else { hand = root.clone().addScaledVector(f, 0.32).addScaledVector(r, 0.18); hand.y = 0.85; }
    if (o.shield.visible && !hold) { hold = true; ballP = root.clone().addScaledVector(f, 0.38).addScaledVector(r, -0.12); ballP.y = 0.85; }
    if (!hold) { var nb = null, nd = 1e9; balls.forEach(function (b) { if (!b.hit && b.v.z < 0) { var d = b.m.position.distanceTo(root); if (d < nd) { nd = d; nb = b; } } }); ballP = nb ? nb.m.position.clone() : new V3(G.px, 1.0, 4.8); }
    else look = new V3(G.px, 1.0, 4.8);
    /* where to go */
    if (!o.done && !o.ko && !o.slip && !o.fakeShow) {
      if (o.hideT > 0) { o.tx = o.hideX; if (Math.abs(o.x - o.hideX) < 0.25) duck = 1; }
      else if (o.blindT > 0) { if (clock > o.next) { o.tx = lo + Math.random() * (hi - lo); o.next = clock + 0.4; } }
      else if (clock > o.next) {
        var pl = peels.filter(function (p) { return p.x > lo && p.x < hi; })[0], cv2 = coverNear(o);
        o.tx = pl && Math.random() < 0.45 ? pl.x : cv2 && Math.random() < lv.smart * 0.4 ? (o.hideT = 2.2, o.hideX = cv2.x) : lo + Math.random() * (hi - lo);
        o.next = clock + (0.8 + Math.random() * 1.3 - Math.min(0.5, o.pain / 200)) / rage;
      }
      if (lv.counter && G.playing && o.swing <= 0 && o.react <= 0 && o.blindT <= 0) { o.counterT -= dt; if (o.counterT <= 0) { o.swing = 0.45; o.swung = false; o.counterT = lv.counter * (o.rage ? 0.45 : 1) * (0.7 + Math.random() * 0.6); showWarn(o.rage ? "⚠ BOSS 三連發！快閃！" : null); } }
    }
    /* betrayal after mercy */
    if (o.betrayT > 0) { o.betrayT -= dt; if (o.betrayT <= 0) { bubble(o, "騙你的！！", 1.4, "big"); o.betrayShots = 3; o.betrayNext = 0; showWarn("⚠ 他偷襲你！快閃！"); unlock("betrayed"); } }
    if (o.betrayShots > 0) { o.betrayNext -= dt; if (o.betrayNext <= 0) { o.betrayShots--; o.betrayNext = 0.28; counterBall(o, root.clone().add(new V3(0, 1.0, 0.3)), 1); } }
    var spd = o.dodge > 0 ? 3.4 : speed; o.dodge = Math.max(0, o.dodge - dt);
    var dx = o.tx - o.x, step = o.ko || o.slip ? 0 : Math.sign(dx) * Math.min(Math.abs(dx), spd * dt); o.x = clamp(o.x + step, -2.8, 2.8);
    var dz = 0; if (!o.ko && !o.slip) { dz = clamp(o.zHome - o.z, -1.4 * dt, 1.4 * dt); o.z += dz; }
    o.vel.set(step / (dt || 1e-3), 0, dz / (dt || 1e-3)); o.gait += Math.hypot(step, dz);
    root.set(o.x, 0, o.z);
    /* banana peels */
    if (!o.ko && !o.slip) peels.forEach(function (p) { if (!p.gone && Math.abs(p.x - o.x) < 0.32 && Math.abs(p.z - o.z) < 0.5) { p.gone = true; scene.remove(p.m); o.slip = { t: 0 }; o.hideT = 0; sfx.slip(); popText("滑倒了！", o.headPos, false); unlock("banana"); bubble(o, "哇啊啊！", 1); FX.crowd(0.6); } });
    bodyXform(o, root, dt);
    var q = new THREE.Quaternion().setFromAxisAngle(XA, o.swing > 0 ? -0.6 : -0.2);
    var inp = { root: root, yaw: Math.PI, vel: o.vel.clone(), gait: o.gait, t: clock, hand: hand, pPos: hand.clone().add(new V3(0, 0.25, 0).applyQuaternion(q)), pQ: q,
      w: w, bh: false, ball: ballP, look: look, hold: hold, hop: o.react > 0.45 && !o.ko ? 0.05 * Math.sin(o.react * 20) : 0, split: 0, duck: duck };
    o.rig.update(inp); o.lastIn = inp;
    var sq = o.react > 0.7 ? Math.sin((1 - o.react) * 30) * o.react * 0.25 : 0, puff = 1 + o.stage * 0.04; o.face.scale.set(puff + sq, puff - sq, 1);
    o.rimM.color.setRGB(1, 1 - o.react * 0.7, 1 - o.react * 0.7);
    o.rig.paddle.visible = !o.fakeShow; o.flag.visible = o.fakeShow;
    follow(o, o.hasXf ? o.xform : null);
    if (o.helmetFly) { var hf = o.helmetFly; hf.v.y += GR * dt; o.helmet.position.addScaledVector(hf.v, dt); o.helmet.rotation.x += hf.w.x * dt; o.helmet.rotation.z += hf.w.z * dt; if (o.helmet.position.y < 0.2) { o.helmet.position.y = 0.2; hf.v.multiplyScalar(0.5); hf.v.y = Math.abs(hf.v.y) * 0.4; hf.w.multiplyScalar(0.6); } }
  }
  function coverNear(o) { return covers.filter(function (c) { return c.hp > 0 && c.x > o.lo - 0.3 && c.x < o.hi + 0.3; })[0] || null; }
  function counterBall(o, from, n) {
    for (var k = 0; k < n; k++) {
      var S = from.clone().add(new V3(0, 0.25, 0.2)), target = new V3(G.px + (k - (n - 1) / 2) * 1.0, 1.5, 6.4), T = 1.0, v = target.sub(S).multiplyScalar(1 / T); v.y -= 0.5 * GR * T;
      var m = new THREE.Mesh(ballGeo, matC); m.scale.setScalar(0.045); m.position.copy(S); scene.add(m);
      balls.push({ m: m, v: v, type: "counter", r: 0.045, dmg: 0, charge: 0, age: 0, hit: true, counted: true, counter: true, from: o, bounced: 0, split: true });
    }
    FX.tone("square", 300, 500, 0.12, 0.12);
  }

  /* ================= weather ================= */
  function weather(rdt) {
    if (G.playing && !G.paused && (G.mode === "free" || G.mode === "timed" || G.mode === "endless")) {
      G.evT -= rdt;
      if (G.evT <= 0 && !G.ev) { G.ev = { k: rnd(["wind", "rain", "dark", "cover"]), t: 14 }; G.evT = 26 + Math.random() * 12;
        var k = G.ev.k; if (k === "wind") { W.wind = (Math.random() < 0.5 ? -1 : 1) * (1.8 + Math.random() * 1.4); banner("🌬 起風了！球會被吹偏"); }
        else if (k === "rain") { W.rainT = 1; banner("🌧 下大雨了！球彈不高"); } else if (k === "dark") { W.darkT = 1; banner("🌑 停電了！"); }
        else { if (covers.length < 2) { spawnCover(-1.4 + Math.random() * 0.4); spawnCover(1.0 + Math.random() * 0.6); } banner("📦 對手搬來掩體了！"); G.ev.t = 0.1; } }
      if (G.ev) { G.ev.t -= rdt; if (G.ev.t <= 0) { if (G.ev.k === "wind" && !G.mods.wind) W.wind = 0; if (G.ev.k === "rain" && !G.mods.rain) W.rainT = 0; if (G.ev.k === "dark" && !G.mods.dark) W.darkT = 0; G.ev = null; } }
    }
    W.rain += (W.rainT - W.rain) * Math.min(1, rdt * 1.5); W.dark += (W.darkT - W.dark) * Math.min(1, rdt * 2);
    var flick = W.darkT > 0 && W.dark < 0.9 ? (Math.random() < 0.3 ? 0.3 : 1) : 1, d = W.dark;
    hemi.intensity = (1.1 - 0.98 * d) * flick; key.intensity = (2.4 - 2.15 * d) * flick; fill.intensity = 0.8 * (1 - d); lampMat.color.setScalar(1 - 0.85 * d);
    var act = active(), halves = act.length > 1 ? [act.slice(0, Math.ceil(act.length / 2)), act.slice(Math.ceil(act.length / 2))] : [act, []];
    spots.forEach(function (s, k) { var g = halves[k]; s.intensity = g.length ? 9 * d : 0; if (g.length) { var mx = g.reduce(function (a, o) { return a + o.x; }, 0) / g.length, mz = g.reduce(function (a, o) { return a + o.z; }, 0) / g.length; s.angle = g.length > 1 ? 0.62 : 0.42; s.position.set(mx, 6, mz + 2.5); s.target.position.set(mx, 0.8, mz); } });
    rain.visible = W.rain > 0.03; rain.material.opacity = 0.45 * W.rain;
    if (rain.visible) { var a = rainGeo.attributes.position.array; for (var i = 0; i < RAIN_N; i++) { var o6 = i * 6, y = a[o6 + 1] - 15 * rdt; if (y < 0) y += 8; a[o6 + 1] = y; a[o6 + 4] = y + 0.35; a[o6] += W.wind * 0.02; a[o6 + 3] = a[o6] + 0.02 + W.wind * 0.04; if (a[o6] > 7) { a[o6] -= 14; a[o6 + 3] -= 14; } if (a[o6] < -7) { a[o6] += 14; a[o6 + 3] += 14; } } rainGeo.attributes.position.needsUpdate = true; }
    courtMats.forEach(function (m) { m.roughness = 0.9 - 0.55 * W.rain; });
    /* flag: limp in calm air, streams out in the wind */
    var p = flagGeo.attributes.position.array, s = Math.min(1, Math.abs(W.wind) / 2.5);
    for (var j = 0; j < p.length; j += 3) { var bx = flagBase[j], by = flagBase[j + 1]; p[j] = bx * (0.35 + 0.65 * s); p[j + 1] = by - bx * (1 - s) * 0.9; p[j + 2] = Math.sin(clock * 9 + bx * 9) * 0.05 * bx * (0.3 + s); }
    flagGeo.attributes.position.needsUpdate = true; flagG.rotation.y = W.wind < 0 ? Math.PI : 0;
    $("#windRow").hidden = !W.wind; if (W.wind) $("#wind").textContent = (W.wind > 0 ? "→ " : "← ") + Math.abs(W.wind).toFixed(1);
  }

  /* ================= bullet time: render to a target, grey everything that is not ball-yellow ================= */
  var bt = null;
  function btRender(k) {
    var w = renderer.domElement.width, h = renderer.domElement.height;
    if (!bt) {
      var mat = new THREE.ShaderMaterial({ uniforms: { tex: { value: null }, k: { value: 0 } }, depthTest: false, depthWrite: false,
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
        fragmentShader: "uniform sampler2D tex; uniform float k; varying vec2 vUv; void main(){ vec3 c = texture2D(tex, vUv).rgb; float g = dot(c, vec3(.299,.587,.114));" +
          "float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)); float sat = (mx - mn) / (mx + 1e-4);" +
          "float yel = smoothstep(.35,.6,sat) * smoothstep(.08,.2, min(c.r,c.g) - c.b) * (1.0 - smoothstep(.2,.4, abs(c.r - c.g)));" +
          "vec3 grey = vec3(g) * vec3(.93, 1.0, 1.1); vec3 o = mix(c, mix(grey, c, yel), k); float v = smoothstep(.9, .3, length(vUv - .5)); o *= mix(1.0, .5 + .5 * v, k); gl_FragColor = vec4(o, 1.0); }" });
      bt = { mat: mat, scene: new THREE.Scene(), cam: new THREE.Camera(), rt: null };
      var q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); q.frustumCulled = false; bt.scene.add(q);
    }
    if (!bt.rt || bt.rt.width !== w || bt.rt.height !== h) {
      if (bt.rt) bt.rt.dispose();
      bt.rt = renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget ? new THREE.WebGLMultisampleRenderTarget(w, h) : new THREE.WebGLRenderTarget(w, h);
      bt.rt.texture.encoding = THREE.sRGBEncoding; bt.mat.uniforms.tex.value = bt.rt.texture;
    }
    renderer.setRenderTarget(bt.rt); renderer.render(scene, cam); renderer.setRenderTarget(null);
    bt.mat.uniforms.k.value = k; renderer.render(bt.scene, bt.cam);
  }

  /* ================= score card ================= */
  function makeCard() {
    var W2 = 1080, H2 = 1350, c = document.createElement("canvas"); c.width = W2; c.height = H2; var x = c.getContext("2d");
    var g = x.createLinearGradient(0, 0, 0, H2); g.addColorStop(0, "#0b2a55"); g.addColorStop(1, "#071E3D"); x.fillStyle = g; x.fillRect(0, 0, W2, H2);
    /* a picture of the beaten ninja, his own sculpted face (no photo on the card) */
    var o = active()[0] || opps[0], hide = [];
    opps.forEach(function (p) { if (p.face.visible) { p.face.visible = false; hide.push(p.face); } if (p.bubble) { p.bubble.visible = false; hide.push(p.bubble); } });
    var sp = cam.position.clone(), sq = cam.quaternion.clone(), h = o.pelvisPos.clone().lerp(o.headPos, 0.5);
    cam.position.set(h.x + 1.7, Math.max(1.2, h.y + 0.5), h.z + 3.1); cam.lookAt(h.x, h.y - 0.05, h.z); renderer.render(scene, cam);
    var src = renderer.domElement, iw = src.width, ih = src.height, ar = 1080 / 640, cw = Math.min(iw, ih * ar), ch = cw / ar;
    x.drawImage(src, (iw - cw) / 2, (ih - ch) / 2, cw, ch, 0, 150, 1080, 640);
    cam.position.copy(sp); cam.quaternion.copy(sq); hide.forEach(function (m) { m.visible = true; });
    var F = "'Big Shoulders Display','Noto Sans TC',sans-serif", T = "'Noto Sans TC','PingFang TC',sans-serif";
    x.fillStyle = "#E4F23F"; x.font = "900 34px " + F; x.fillText("NINJAPB · 砲台模式", 60, 72);
    x.fillStyle = "#F3F7FB"; x.font = "900 54px " + T; x.fillText(MODE_NAME[G.mode] + (G.mode === "daily" ? "：" + DAY.name : ""), 60, 128);
    x.strokeStyle = "#E4F23F"; x.lineWidth = 6; x.strokeRect(3, 150, 1074, 640);
    x.fillStyle = "#E4F23F"; x.font = "900 170px " + F; var sw2 = x.measureText(String(Math.round(G.score))).width; x.fillText(String(Math.round(G.score)), 60, 960);
    x.fillStyle = "#A9C2DE"; x.font = "700 36px " + T; x.fillText("分", 72 + sw2, 958);
    x.fillStyle = "#F3F7FB"; x.font = "900 52px " + T; x.fillText(titleFor(G.score), 60, 1060);
    var stats = [["命中", G.hits], ["打臉", G.faces], ["最高連擊", G.maxCombo], G.mode === "endless" ? ["波數", G.wave] : G.mode === "levels" ? ["關卡", G.level + 1] : ["生命", Math.max(0, G.lives)]];
    stats.forEach(function (s, i) { var sx = 60 + i * 250; x.fillStyle = "#A9C2DE"; x.font = "700 28px " + T; x.fillText(s[0], sx, 1130); x.fillStyle = "#F3F7FB"; x.font = "900 64px " + F; x.fillText(String(s[1]), sx, 1195); });
    var na = G.newAch.slice(0, 6); if (na.length) { x.font = "700 28px " + T; x.fillStyle = "#E4F23F"; x.fillText("本局成就：" + na.map(function (k) { var a = ACH.filter(function (y) { return y[0] === k; })[0]; return a[1] + a[2]; }).join("　"), 60, 1262, 960); }
    x.fillStyle = "#A9C2DE"; x.font = "700 26px " + T; x.fillText("pbninja.vercel.app/cannon　" + today(), 60, 1316);
    return c;
  }
  $("#resCard").addEventListener("click", function () {
    var c = makeCard(), url = c.toDataURL("image/png"); $("#cardImg").src = url; $("#cardDl").href = url; $("#cardView").hidden = false;
    $("#cardShare").onclick = function () {
      c.toBlob(function (blob) {
        var file = new File([blob], "ninjapb-cannon.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: "NINJAPB 砲台模式戰績" }).catch(function () {});
        else { var a = $("#cardDl"); a.click(); }
      });
    };
  });
  $("#cardClose").addEventListener("click", function () { $("#cardView").hidden = true; });

  /* ================= frame ================= */
  var clock = 0, last = performance.now(), smokeM = new THREE.MeshBasicMaterial({ color: 0x9aa3ad, transparent: true, opacity: 0.6, depthWrite: false });
  function resize() { var w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < h ? 62 : 40; cam.updateProjectionMatrix(); }
  addEventListener("resize", resize); resize();
  FX.Music.level(function () { if (!G.playing) return 0; if (G.meteor) return 4; if (G.btT > 0 || G.combo >= 15 || active().some(function (o) { return o.rage; })) return 3; if (G.combo >= 5) return 2; return 1; });

  function frame(now) {
    var real = Math.min(0.25, (now - last) / 1000), rdt = Math.min(0.05, real); last = now;
    if (G.replay) { stepReplay(real); renderer.render(scene, cam); requestAnimationFrame(frame); return; }
    if (G.paused) rdt = 0;
    var ts = (G.hitStop > 0 ? 0.06 : 1) * (G.btT > 0 ? 0.35 : 1); G.hitStop = Math.max(0, G.hitStop - rdt);
    var dt = rdt * ts; clock += dt;
    for (var pi = G.pending.length - 1; pi >= 0; pi--) { var pe = G.pending[pi]; pe.t -= rdt; if (pe.t <= 0) { G.pending.splice(pi, 1); pe.fn(); } }
    if (G.btT > 0) { G.btT -= real * (G.paused ? 0 : 1); if (G.btT <= 0) { $("#btTag").hidden = true; } }
    if (G.playing && G.time > 0 && (G.mode === "timed" || G.mode === "daily" || G.mode === "versus")) { G.time -= rdt; $("#timer").textContent = Math.ceil(Math.max(0, G.time)); if (G.time <= 0) { G.time = 0; endTimed("time"); } }
    if (G.mg.cd > 0) { G.mg.cd -= rdt; $("#mg").disabled = G.mg.cd > 0; $("#mg").querySelector("span").textContent = G.mg.cd > 0 ? "冷卻 " + Math.ceil(G.mg.cd) : "連發"; }
    if (G.mg.on) {
      G.mg.left -= rdt; $("#mg").querySelector("span").textContent = Math.max(0, G.mg.left).toFixed(1);
      if (press && G.playing) { mgNext -= rdt; if (mgNext <= 0) { fire(pointer.x, pointer.y, 0, "normal"); mgNext = 0.085; } }
      if (G.mg.left <= 0) { G.mg.on = false; G.mg.cd = 12; $("#mg").classList.remove("on"); $("#hint").textContent = "點一下發射，按住蓄力再放開更強！"; }
    }
    /* heat */
    if (G.jam > 0) { G.jam -= rdt; if (Math.random() < 0.6) { var sm = new THREE.Mesh(ballGeo, smokeM); sm.scale.setScalar(0.05); sm.position.set(G.px + (Math.random() - 0.5) * 0.1, 0.62, 5.0); scene.add(sm); smoke.push({ m: sm, age: 0 }); }
      if (G.jam <= 0) { G.heat = 0.45; $("#heat").classList.remove("jam"); } }
    else G.heat = Math.max(0, G.heat - rdt * 0.38);
    $("#heat i").style.width = (G.heat * 100).toFixed(0) + "%";
    var uf = $("#ult .fillbar"); uf.style.width = (G.ult * 100).toFixed(0) + "%"; var ub = $("#ult"); ub.disabled = G.ult < 1 || !!G.meteor || !G.playing; ub.classList.toggle("ready", G.ult >= 1 && !G.meteor);
    if (press && !G.mg.on) { var held = (now - press.t) / 1000; if (held > 0.18) { chargeEl.hidden = false; chargeEl.style.left = pointer.x + "px"; chargeEl.style.top = pointer.y + "px"; chargeEl.style.setProperty("--k", clamp((held - 0.18) / 0.9, 0, 1)); } }
    weather(rdt);
    G.px += (G.ptx - G.px) * Math.min(1, rdt * 10); machine.position.x = G.px;
    /* boss temper glow */
    var bm = NinjaMascot.material("c_armor"); if (bm) { var rg = active().some(function (o) { return o.rage && !o.done; }); bm.emissive.setRGB(rg ? 0.35 + 0.3 * Math.sin(clock * 10) : 0, 0, 0); }
    active().forEach(function (o) { if (o.skel) think(o, dt); });
    /* item crates */
    if (G.playing && !G.mods.noItems) { G.itemT -= rdt; if (G.itemT <= 0 && crates.length < 1) { spawnCrate(); G.itemT = 11 + Math.random() * 6; } }
    for (var ci = crates.length - 1; ci >= 0; ci--) { var cr = crates[ci]; cr.t += dt; cr.life -= dt; cr.m.position.set(cr.x0 + Math.sin(cr.t * 0.8) * 1.6, 1.85 + Math.sin(cr.t * 2.2) * 0.12, cr.z); cr.m.rotation.set(cr.t * 0.7, cr.t, 0); if (cr.life <= 0) { scene.remove(cr.m); crates.splice(ci, 1); } }
    /* meteor shower */
    if (G.meteor) { G.meteor.t += dt; var tg = active(); for (var mi = 0; mi < 70 * dt; mi++) { var to = rnd(tg); if (!to) break; spawn("meteor", new V3(to.x + (Math.random() - 0.5) * 2.2, 6.5 + Math.random() * 2, to.z + (Math.random() - 0.5) * 1.6), new V3((Math.random() - 0.5) * 0.6, -5 - Math.random() * 3, (Math.random() - 0.5) * 0.4), 0).counted = true; }
      G.shake = Math.max(G.shake, 0.03); if (G.meteor.t >= G.meteor.dur) G.meteor = null; }
    /* balls */
    var rest = 0.55 - 0.25 * W.rain;
    for (var i = balls.length - 1; i >= 0; i--) {
      var b = balls[i]; b.age += dt; b.v.y += GR * dt; if (!b.counter && b.type !== "meteor") b.v.x += W.wind * dt;
      if (b.type === "homing" && !b.hit) { var tgt = active().filter(function (o) { return !o.done; })[0]; if (tgt && b.m.position.z > tgt.z + 0.2) { var want = tgt.facePos.clone().sub(b.m.position).normalize().multiplyScalar(b.v.length()); b.v.lerp(want, Math.min(1, 3.5 * dt)); } }
      b.m.position.addScaledVector(b.v, dt); var p = b.m.position;
      if (b.type === "pie" || b.type === "banana") { b.m.rotation.x += 8 * dt; b.m.rotation.z += 3 * dt; }
      if (p.y < b.r * (b.type === "banana" ? 0.3 : 1)) {
        if (b.type === "banana") { var pm = bananaProto.clone(); pm.position.set(p.x, 0.02, p.z); pm.rotation.x = -Math.PI / 2; scene.add(pm); peels.push({ m: pm, x: p.x, z: p.z, age: 0 }); scene.remove(b.m); balls.splice(i, 1); continue; }
        p.y = b.r; if (b.type === "bounce" && !b.bounced) { b.v.y = 3.4 - 1.0 * W.rain; b.v.z *= 0.9; } else { b.v.y = -b.v.y * rest; b.v.x *= 0.8; b.v.z *= 0.8; } b.bounced++;
      }
      if (Math.abs(p.z) < 0.04 && p.y < 0.9 && !b.counter && b.type !== "meteor") { b.v.z = -b.v.z * 0.25; b.v.x *= 0.5; }
      if (!b.split && b.age > 0.22) { b.split = true; [-1, 1].forEach(function (s) { var c2 = spawn("normal", p, b.v.clone().add(new V3(s * 1.4, 0.2, 0)), b.charge); c2.m.material = matS; c2.dmg = b.dmg; }); }
      if (b.counter) {
        if (!b.done && p.z > 6.2) { b.done = true;
          if (Math.abs(p.x - G.px) < 0.5 && G.playing) { G.lives--; G.roundTaken = true; G.combo = 0; showCombo(); flash(); sfx.ouch(); FX.vibe([80, 40, 80]); popText("被反擊！ -1 ❤", new V3(G.px, 1.3, 5.2)); bubble(b.from, "哈！打中你了！", 1.1); hud(); if (G.lives <= 0 && G.playing) gameOver(); }
          else { G.dodges++; G.roundDodges++; popText("閃過了！", new V3(G.px, 1.3, 5.2), true); if (G.dodges >= 10) unlock("dodge10"); } }
      } else if (!b.hit && (G.playing || G.keep)) {
        /* crates */
        for (var cj = crates.length - 1; cj >= 0; cj--) { var ck = crates[cj]; if (p.distanceTo(ck.m.position) < 0.3 + b.r) { b.hit = true; b.counted = true; b.v.multiplyScalar(-0.2); sfx.crate(); breakAt(ck.m.position, crateM, 8, 0.12); scene.remove(ck.m); crates.splice(cj, 1); grant(rnd(["homing", "ice", "pie", "banana", "mega", "heart", "homing", "ice", "pie", "banana", "mega"])); break; } }
        /* cover */
        if (!b.hit) covers.forEach(function (c) { if (b.hit || c.hp <= 0) return; if (Math.abs(p.x - c.x) < c.w / 2 + b.r && p.y < c.h + b.r && Math.abs(p.z - c.z) < c.d / 2 + b.r) {
          b.hit = true; b.counted = true; b.v.set(b.v.x * 0.3, 1.5, -b.v.z * 0.3); c.hp -= b.type === "mega" ? 5 : b.type === "meteor" ? 0.25 : 1; c.shake = 0.3; sfx.crate(); if (b.type !== "meteor") popText("啪！", p, true);
          if (c.hp <= 0) { breakAt(new V3(c.x, 0.7, c.z), cardM, 14, 0.22); scene.remove(c.g); popText("掩體被打爛了！", new V3(c.x, 1.4, c.z), false); unlock("cover"); FX.crowd(0.5); active().forEach(function (o) { if (o.hideX === c.x) o.hideT = 0; }); } } });
        covers = covers.filter(function (c) { return c.hp > 0; });
        if (!b.hit) active().forEach(function (o) {
          if (b.hit || !o.skel) return;
          if (o.block && p.distanceTo(o.rig.paddle.position) < 0.2 + b.r && b.type !== "mega") { b.hit = true; b.counted = true; b.v.set(b.v.x * 0.3, 2, -b.v.z * 0.5); sfx.clank(); popText("被擋下！", p, true); G.combo = 0; showCombo(); return; }
          if (o.shield.visible && b.type !== "mega" && p.distanceTo(o.shield.position) < 0.3 + b.r && Math.abs(p.z - o.shield.position.z) < 0.12) { b.hit = true; b.counted = true; b.v.set(b.v.x * 0.3, 2, 3); sfx.clank(); if (b.type !== "meteor") { popText("盾擋！", p, true); G.combo = 0; showCombo(); } return; }
          var fat = o.fat ? 1.3 : 1, dHead = p.distanceTo(o.headPos), A = o.pelvisPos, Bc = o.chestPos, ab = _v.subVectors(Bc, A), tt = clamp(p.clone().sub(A).dot(ab) / Math.max(1e-6, ab.lengthSq()), 0, 1), dBody = p.distanceTo(A.clone().addScaledVector(ab, tt));
          if (dHead < 0.42 + b.r) onHit(o, b, "face");
          else if (dBody < 0.3 * fat + b.r) onHit(o, b, "body");
          else if (p.y < 0.4 && Math.hypot(p.x - o.x, p.z - o.z) < 0.28 * fat + b.r && !o.ko && !o.slip) onHit(o, b, "leg");
        });
        if (!b.counted && (p.z < Math.min(-3.4, avgZ() - 1) || (b.bounced && p.z < 0 && b.type !== "bounce") || b.bounced > 1 || b.age > 2.6)) miss(b);
      }
      if (b.age > 4) {
        balls.splice(i, 1);
        if (active().some(function (o) { return o.done; }) && !b.counter && b.type !== "meteor" && piles.length < 160) piles.push(b); else scene.remove(b.m);
      }
    }
    for (var j = tears.length - 1; j >= 0; j--) { var tr = tears[j]; tr.age += dt; tr.v.y += GR * 0.6 * dt; tr.m.position.addScaledVector(tr.v, dt); if (tr.age > 0.9 || tr.m.position.y < 0) { scene.remove(tr.m); tears.splice(j, 1); } }
    for (var di = debris.length - 1; di >= 0; di--) { var db = debris[di]; db.age += dt; db.v.y += GR * dt; db.m.position.addScaledVector(db.v, dt); db.m.rotation.x += db.w.x * dt; db.m.rotation.y += db.w.y * dt; if (db.m.position.y < 0.05) { db.m.position.y = 0.05; db.v.multiplyScalar(0.4); db.v.y = Math.abs(db.v.y) * 0.3; db.w.multiplyScalar(0.5); } if (db.age > 3) { scene.remove(db.m); debris.splice(di, 1); } }
    for (var si = smoke.length - 1; si >= 0; si--) { var s = smoke[si]; s.age += rdt; s.m.position.y += rdt * 0.8; s.m.scale.setScalar(0.05 + s.age * 0.25); if (s.age > 1.2) { scene.remove(s.m); smoke.splice(si, 1); } }
    covers.forEach(function (c) { if (c.shake > 0) { c.shake -= rdt; c.g.position.x = c.x + Math.sin(c.shake * 60) * 0.03 * c.shake; } });
    peels.forEach(function (pl) { pl.age += dt; }); peels = peels.filter(function (pl) { if (pl.gone) return false; if (pl.age > 14) { scene.remove(pl.m); return false; } return true; });
    opps.forEach(function (o) { if (!o.bubble) return; o.bubbleT -= rdt; o.bubble.position.copy(o.headPos).add(_v.set(0, 0.62, 0)); if (o.bubbleT <= 0 && !(o.done && o.doneT < 2.4)) { scene.remove(o.bubble); o.bubble.material.map.dispose(); o.bubble = null; } });
    recoil = Math.max(0, recoil - rdt * 6); tube.position.z = -0.2 + recoil * 0.08;
    /* camera */
    G.shake = Math.max(0, G.shake - rdt * 0.35); var sx = (Math.random() - 0.5) * G.shake, sy = (Math.random() - 0.5) * G.shake;
    var act = active(), cx = act.length === 1 ? act[0].x : 0, cz = avgZ() + 2.5;
    if (cam.aspect < 1) { cam.position.set(G.px * 0.8 + cx * 0.12 + sx, 1.9 + sy, 6.3); cam.lookAt(G.px * 0.5 + cx * 0.4, 0.55, -2.5 + cz * 0.5); }
    else { cam.position.set(G.px * 0.8 + cx * 0.12 + sx, 2.15 + sy, 7.4); cam.lookAt(G.px * 0.5 + cx * 0.35, 0.75, -2.5 + cz * 0.5); }
    if (G.playing && !G.paused) snapshot(dt);
    if (G.btT > 0) btRender(Math.min(1, G.btT * 2, (3 - G.btT) * 4)); else renderer.render(scene, cam);
    requestAnimationFrame(frame);
  }

  NinjaMascot.load(THREE, function (m) {
    if (!m) { $("#hint").textContent = "角色載入失敗，請重新整理頁面"; return; }
    opps.forEach(function (o) { var a = NinjaMascot.attach(o.rig, "opp"); o.skel = a.skeleton; o.mesh = a.mesh; o.arm = a.arm; });
    layout(1); resetOpp(opps[0], 0, "red");
  });
  layout(1);
  requestAnimationFrame(frame);
  window.__cannon = { G: G, W: W, opps: opps, fire: fire, start: start, cam: cam, drawFace: drawFace, onHit: onHit, surrender: surrender, balls: balls, grant: grant, bulletTime: bulletTime,
    spawnCover: spawnCover, spawnCrate: spawnCrate, crates: crates, covers: function () { return covers; }, unlock: unlock, makeCard: makeCard, fakeSurrender: fakeSurrender, setCostume: setCostume, startRound: startRound, peels: function () { return peels; } };
})();
