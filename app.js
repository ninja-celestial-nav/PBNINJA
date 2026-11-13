/* NinjaPB 3D: first-person pickleball court for the first five shots. Needs THREE (r128) and window.NINJAPB from scenes.js. */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var CH = window.NINJAPB.CH, SW = window.NINJAPB.SWINGS, INFO = window.NINJAPB.INFO, DIM = window.NINJAPB.DIM;
  var BL = DIM.BL, KL = DIM.KL, HW = DIM.HW, POST = 3.353;
  function netH(x) { return 0.864 + 0.05 * Math.pow(Math.min(1, Math.abs(x) / POST), 2); }
  var G = 9.81, BR = 0.05, EYE = 1.5;
  var V3 = THREE.Vector3;
  var UP = new V3(0, 1, 0);
  var C = { court: 0x1463B8, line: 0xF3F7FB, ball: 0xE4F23F, danger: 0xFF6A4D, ice: 0x8FE3FF, ink: 0x071E3D };

  var canvas = $("#stage"), renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true }); }
  catch (e) { $("#nogl").hidden = false; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.62;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  function col(h) { return new THREE.Color(h).convertSRGBToLinear(); }
  var scene = new THREE.Scene();
  var cam = new THREE.PerspectiveCamera(68, 1, 0.05, 260);
  cam.rotation.order = "YXZ";
  /* night sky with stadium glow: used as background and as reflection environment */
  (function () {
    var c = document.createElement("canvas"); c.width = 1024; c.height = 512; var g = c.getContext("2d");
    var gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#020814"); gr.addColorStop(0.42, "#0a2348"); gr.addColorStop(0.5, "#1b4a86"); gr.addColorStop(0.56, "#0a2038"); gr.addColorStop(1, "#040d1c");
    g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
    for (var i = 0; i < 420; i++) { g.fillStyle = "rgba(255,255,255," + (0.25 + Math.random() * 0.7) + ")"; var r = Math.random() * 1.2 + 0.3; g.beginPath(); g.arc(Math.random() * 1024, Math.pow(Math.random(), 1.6) * 215, r, 0, 7); g.fill(); }
    for (i = 0; i < 90; i++) { g.fillStyle = "rgba(255,225,150," + (0.3 + Math.random() * 0.5) + ")"; g.fillRect(Math.random() * 1024, 250 + Math.random() * 12, 2, 2); }
    [130, 380, 640, 900].forEach(function (x) { var rg = g.createRadialGradient(x, 120, 2, x, 120, 90); rg.addColorStop(0, "rgba(255,252,230,1)"); rg.addColorStop(0.15, "rgba(255,250,220,.55)"); rg.addColorStop(1, "rgba(255,250,220,0)"); g.fillStyle = rg; g.fillRect(x - 90, 30, 180, 180); });
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = t;
    try { var pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(t).texture; pm.dispose(); } catch (e) {}
  })();
  scene.fog = new THREE.Fog(col(0x071E3D), 45, 120);
  scene.add(new THREE.HemisphereLight(0xd6e6ff, 0x0b2a52, 0.6));
  var sun = new THREE.DirectionalLight(0xfff3dc, 1.2); sun.position.set(7, 17, 9); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02;
  var sc0 = sun.shadow.camera; sc0.left = -8; sc0.right = 8; sc0.top = 11; sc0.bottom = -11; sc0.near = 1; sc0.far = 50; scene.add(sun);
  var fill = new THREE.DirectionalLight(0x9cc8ff, 0.35); fill.position.set(-8, 10, -9); scene.add(fill);
  /* rim light: sits behind whatever the camera looks at, low and cool, so every ninja gets a bright outline */
  var rim = new THREE.DirectionalLight(0xcfe6ff, 1.3); scene.add(rim); scene.add(rim.target);

  /* ---------- helpers ---------- */
  function canvasTex(w, h, draw) { var c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); var t = new THREE.CanvasTexture(c); t.anisotropy = 8; t.encoding = THREE.sRGBEncoding; return t; }
  function label(text, color, size) {
    var fs = 44, pad = 16, c = document.createElement("canvas"), g = c.getContext("2d");
    var font = "700 " + fs + "px 'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
    g.font = font; var w = Math.ceil(g.measureText(text).width) + pad * 2; c.width = w; c.height = fs + pad * 2;
    g.font = font; g.fillStyle = "rgba(7,30,61,.78)"; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = color || "#F3F7FB"; g.textBaseline = "middle"; g.fillText(text, pad, c.height / 2 + 2);
    var lt = new THREE.CanvasTexture(c); lt.encoding = THREE.sRGBEncoding;
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: lt, depthTest: false, transparent: true, fog: false, toneMapped: false }));
    var hgt = size || 0.34; sp.scale.set(hgt * c.width / c.height, hgt, 1); sp.renderOrder = 10; return sp;
  }
  function plane(w, h, mat) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); }
  function flat(w, d, color, op) { var m = plane(w, d, new THREE.MeshBasicMaterial({ color: col(color), transparent: op < 1, opacity: op, depthWrite: false, toneMapped: false })); m.rotation.x = -Math.PI / 2; return m; }
  function ss(a, b, x) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
  function angDiff(a, b) { var d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
  function basis(yaw) { return { r: new V3(Math.cos(yaw), 0, -Math.sin(yaw)), f: new V3(-Math.sin(yaw), 0, -Math.cos(yaw)) }; }
  function toWorld(v, b) { return new V3().addScaledVector(b.r, v[0]).addScaledVector(UP, v[1]).addScaledVector(b.f, v[2]); }
  function quatFrom(nW, hW, keepN) {
    var Y, Z;
    if (keepN) { Z = nW.clone().normalize(); Y = hW.clone().addScaledVector(Z, -hW.dot(Z)); if (Y.lengthSq() < 1e-6) Y.set(0, 1, 0); Y.normalize(); }
    else { Y = hW.clone().normalize(); Z = nW.clone().addScaledVector(Y, -nW.dot(Y)); if (Z.lengthSq() < 1e-6) Z.set(0, 0, 1); Z.normalize(); }
    var X = new V3().crossVectors(Y, Z);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  }

  /* ---------- court ---------- */
  var STEEL = new THREE.MeshStandardMaterial({ color: col(0x24364f), metalness: 0.75, roughness: 0.38 });
  (function buildCourt() {
    function acrylic(base, w, h) {
      var t = canvasTex(256, 256, function (g) {
        g.fillStyle = base; g.fillRect(0, 0, 256, 256);
        for (var i = 0; i < 5200; i++) { g.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,.03)" : "rgba(0,10,30,.05)"; g.fillRect(Math.random() * 256, Math.random() * 256, 1.4, 1.4); }
      });
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w, h); return t;
    }
    function slab(w, d, base, y, z, rep) { var m = plane(w, d, new THREE.MeshStandardMaterial({ map: acrylic(base, rep[0], rep[1]), roughness: 0.86, metalness: 0, envMapIntensity: 0.25 })); m.rotation.x = -Math.PI / 2; m.position.set(0, y, z || 0); m.receiveShadow = true; scene.add(m); return m; }
    slab(46, 56, "#082338", -0.03, 0, [23, 28]);
    slab(12.4, 20.8, "#0E4A45", -0.015, 0, [8, 14]);                 /* out-of-bounds surround */
    slab(2 * HW, 2 * BL, "#1463B8", 0, 0, [4, 9]);                    /* service courts */
    [-1, 1].forEach(function (s) { slab(2 * HW, KL, "#1E9A6C", 0.002, s * KL / 2, [4, 1.5]); });   /* kitchen */
    var lineM = new THREE.MeshStandardMaterial({ color: col(0xF3F7FB), roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    function line(w, d, x, z) { var l = plane(w, d, lineM); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.005, z); l.receiveShadow = true; scene.add(l); }
    var LW = 0.05;
    [-1, 1].forEach(function (s) {
      line(LW, 2 * BL + LW, s * HW, 0);                               /* sidelines */
      line(2 * HW + LW, LW, 0, s * BL);                               /* baselines */
      line(2 * HW, LW, 0, s * KL);                                    /* kitchen (NVZ) lines */
      line(LW, BL - KL, 0, s * (BL + KL) / 2);                        /* centre lines */
    });
    /* net: 34 in (0.864 m) at the centre, 36 in (0.914 m) at the posts, posts 1 ft outside the sidelines */
    var netTex = canvasTex(64, 64, function (g) { g.clearRect(0, 0, 64, 64); g.strokeStyle = "rgba(16,20,28,.9)"; g.lineWidth = 5; g.strokeRect(0, 0, 64, 64); });
    netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping; netTex.repeat.set(96, 13);
    var ng = new THREE.PlaneGeometry(2 * POST, 0.9, 24, 1), np = ng.attributes.position;
    for (var i = 0; i < np.count; i++) { if (np.getY(i) > 0) np.setY(i, netH(np.getX(i)) - 0.45); }
    var net = new THREE.Mesh(ng, new THREE.MeshBasicMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.9 })); net.position.y = 0.45; scene.add(net);
    var bandM = new THREE.MeshStandardMaterial({ color: col(0xF3F7FB), roughness: 0.7 }), seg = 2 * POST / 20;
    for (i = 0; i < 20; i++) { var xc = -POST + (i + 0.5) * seg; var band = new THREE.Mesh(new THREE.BoxGeometry(seg + 0.01, 0.06, 0.03), bandM); band.position.set(xc, netH(xc) - 0.02, 0); band.rotation.z = Math.atan2(netH(xc + seg / 2) - netH(xc - seg / 2), seg); band.castShadow = true; scene.add(band); }
    var strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.86, 0.035), bandM); strap.position.y = 0.43; scene.add(strap);
    [-POST, POST].forEach(function (x) { var p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.95, 12), STEEL); p.position.set(x, 0.475, 0); p.castShadow = true; scene.add(p);
      var foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.7), STEEL); foot.position.set(x, 0.02, 0); scene.add(foot); });
    /* chain-link fences down both sides, low boards behind each baseline */
    var linkT = canvasTex(32, 32, function (g) { g.clearRect(0, 0, 32, 32); g.strokeStyle = "rgba(150,170,196,.7)"; g.lineWidth = 1.8; g.beginPath(); g.moveTo(0, 16); g.lineTo(16, 0); g.lineTo(32, 16); g.lineTo(16, 32); g.closePath(); g.stroke(); });
    linkT.wrapS = linkT.wrapT = THREE.RepeatWrapping; linkT.repeat.set(20.8 * 7, 3 * 7);
    function beam(w, h, d, x, y, z) { var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), STEEL); b.position.set(x, y, z); b.castShadow = true; scene.add(b); }
    [-1, 1].forEach(function (sx) {
      var f = plane(20.8, 3, new THREE.MeshBasicMaterial({ map: linkT, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.6 })); f.position.set(6.2 * sx, 1.5, 0); f.rotation.y = Math.PI / 2; scene.add(f);
      for (var k = 0; k <= 8; k++) beam(0.06, 3, 0.06, 6.24 * sx, 1.5, -10.4 + k * 2.6);
      beam(0.05, 0.05, 20.8, 6.24 * sx, 3, 0);
    });
    /* floodlights */
    var lampM = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.7, 4.1), toneMapped: false });   /* brighter than white: the only things that bloom are lamps, the ball and its trail */
    var shaftT = canvasTex(8, 256, function (g) { var r = g.createLinearGradient(0, 0, 0, 256); r.addColorStop(0, "rgba(255,246,220,.9)"); r.addColorStop(0.55, "rgba(255,246,220,.22)"); r.addColorStop(1, "rgba(255,246,220,0)"); g.fillStyle = r; g.fillRect(0, 0, 8, 256); });
    var shaftM = new THREE.MeshBasicMaterial({ map: shaftT, transparent: true, opacity: 0.028, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false, toneMapped: false });
    var flare = canvasTex(128, 128, function (g) { var r = g.createRadialGradient(64, 64, 2, 64, 64, 64); r.addColorStop(0, "rgba(255,252,235,1)"); r.addColorStop(0.2, "rgba(255,248,215,.5)"); r.addColorStop(1, "rgba(255,248,215,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
    [[-6.6, -9.6], [6.6, -9.6], [-6.6, 9.6], [6.6, 9.6], [-6.6, 0], [6.6, 0]].forEach(function (p) {
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 7.0, 10), STEEL); pole.position.set(p[0], 3.5, p[1]); pole.castShadow = true; scene.add(pole);
      var headBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 1.3), STEEL); headBox.position.set(p[0] * 0.94, 7.05, p[1]); scene.add(headBox);
      var lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 1.2), lampM); lamp.position.set(p[0] * 0.94, 6.93, p[1]); scene.add(lamp);
      var fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flare, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); fl.material.toneMapped = false; fl.material.color.setScalar(1.6); fl.scale.set(2.6, 2.6, 1); fl.position.set(p[0] * 0.94, 6.9, p[1]); scene.add(fl);
      /* a soft cone of light aimed at the court, like haze under stadium floods */
      var aim = new V3(p[0] * 0.25, 0, p[1] * 0.55), top = new V3(p[0] * 0.94, 6.9, p[1]), len = top.distanceTo(aim);
      var cg = new THREE.CylinderGeometry(0.3, 2.2, len * 0.8, 28, 1, true); cg.translate(0, -len * 0.4, 0);
      var shaft = new THREE.Mesh(cg, shaftM); shaft.position.copy(top); shaft.quaternion.setFromUnitVectors(new V3(0, -1, 0), aim.clone().sub(top).normalize()); shaft.renderOrder = 2; scene.add(shaft);
      var pl = new THREE.PointLight(0xfff3d6, 0.22, 34, 1.6); pl.position.set(p[0] * 0.9, 6.8, p[1]); scene.add(pl);
    });
    /* boards behind each end, carrying the deck's own wordmark */
    var boardT = canvasTex(2048, 128, function (g) { g.fillStyle = "#071E3D"; g.fillRect(0, 0, 2048, 128); g.fillStyle = "#E4F23F"; g.fillRect(0, 0, 2048, 8); g.textBaseline = "middle"; for (var k = 0; k < 3; k++) { g.font = "900 74px 'Big Shoulders Display','Arial Narrow',sans-serif"; g.fillStyle = "#F3F7FB"; g.fillText("NINJAPB", 50 + k * 683, 70); var w = g.measureText("NINJAPB").width; g.font = "700 26px 'Noto Sans TC','Arial Narrow',sans-serif"; g.fillStyle = "#E4F23F"; g.fillText("前五拍黃金決策", 50 + k * 683 + w + 22, 56); g.font = "600 24px 'Big Shoulders Display','Arial Narrow',sans-serif"; g.fillStyle = "#A9C2DE"; g.fillText("COACH NINJA · CODE NINJA", 50 + k * 683 + w + 22, 90); } });
    [-1, 1].forEach(function (s) { var b = new THREE.Mesh(new THREE.BoxGeometry(12.4, 1.0, 0.12), new THREE.MeshStandardMaterial({ map: boardT, roughness: 0.6 })); b.position.set(0, 0.5, 10.4 * s); if (s > 0) b.rotation.y = Math.PI; b.castShadow = true; scene.add(b); });
  })();

  /* ---------- actors: jointed ninjas (rig.js) and their paddles ---------- */
  function makePaddle(withArrow) {
    /* elongated 16 mm paddle: raw-carbon graphite face, raised edge guard, tapered throat, octagonal handle with a
       spiral-wrapped overgrip and flared butt cap. Long axis +Y, face normal +Z, origin at the sweet spot.
       Size: 19 cm wide, 42.5 cm long, 13 cm handle. The hand holds it 25 cm below the origin. */
    var g = new THREE.Group(), W = 0.095, TOP = 0.155, R = 0.05, TH = 0.008;
    var sh = new THREE.Shape();
    sh.moveTo(-W + R, TOP); sh.lineTo(W - R, TOP); sh.quadraticCurveTo(W, TOP, W, TOP - R); sh.lineTo(0.09, -0.07);
    sh.bezierCurveTo(0.088, -0.118, 0.032, -0.112, 0.021, -0.14); sh.lineTo(-0.021, -0.14);
    sh.bezierCurveTo(-0.032, -0.112, -0.088, -0.118, -0.09, -0.07); sh.lineTo(-W, TOP - R); sh.quadraticCurveTo(-W, TOP, -W + R, TOP);
    function tracePath(c, k, ox, oy, inset) {           /* the outline drawn into a canvas, shrunk by inset metres */
      var pts = sh.getPoints(40), cx = 0, cy = 0.01; c.beginPath();
      pts.forEach(function (p, i) { var dx = p.x - cx, dy = p.y - cy, l = Math.hypot(dx, dy) || 1, x = p.x - dx / l * inset, y = p.y - dy / l * inset; var X = ox + x * k, Y = oy - y * k; if (i) c.lineTo(X, Y); else c.moveTo(X, Y); });
      c.closePath();
    }
    /* face: a fine twill weave with a lime pinstripe set inside the guard */
    var TW = 512, TH2 = Math.round(TW * 0.295 / 0.19), K = TW / 0.19;
    var faceT = canvasTex(TW, TH2, function (c) {
      c.fillStyle = "#4b4e4a"; c.fillRect(0, 0, TW, TH2);
      for (var y = 0; y < TH2; y += 4) for (var x = 0; x < TW; x += 4) {
        var on = ((x >> 2) + (y >> 2)) % 4 < 2; c.fillStyle = on ? "rgba(255,255,255,.055)" : "rgba(0,0,0,.08)"; c.fillRect(x, y, 4, 4);
      }
      for (var i = 0; i < 4000; i++) { c.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.05)"; c.fillRect(Math.random() * TW, Math.random() * TH2, 1, 1); }
      var ox = TW / 2, oy = TOP * K;
      c.strokeStyle = "rgba(20,22,20,.35)"; c.lineWidth = 10; tracePath(c, K, ox, oy, 0.006); c.stroke();
      c.strokeStyle = "rgba(207,224,74,.55)"; c.lineWidth = 1.4; tracePath(c, K, ox, oy, 0.014); c.stroke();
    });
    faceT.repeat.set(1 / 0.19, 1 / 0.295); faceT.offset.set(0.5, 0.14 / 0.295); faceT.anisotropy = 8;
    var faceM = new THREE.MeshPhysicalMaterial({ map: faceT, roughness: 0.62, metalness: 0.05, clearcoat: 0.25, clearcoatRoughness: 0.5 });
    var guardM = new THREE.MeshStandardMaterial({ color: col(0x3c3e3a), roughness: 0.45, metalness: 0.15 });
    var hg = new THREE.ExtrudeGeometry(sh, { depth: TH * 2 - 0.002, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 1, curveSegments: 24 }); hg.translate(0, 0, -TH + 0.001);
    var head = new THREE.Mesh(hg, [faceM, guardM]); head.castShadow = true; g.add(head);
    /* edge guard: a rounded rim from throat to throat over the top */
    var op = sh.getPoints(60).filter(function (p) { return p.y > -0.138; });
    var start = 0, gap = 0; op.forEach(function (p, i) { var d = p.distanceTo(op[(i + op.length - 1) % op.length]); if (d > gap) { gap = d; start = i; } });
    var ring = start > 0 ? op.slice(start).concat(op.slice(0, start)) : op;
    var gc = new THREE.CatmullRomCurve3(ring.map(function (p) { return new V3(p.x, p.y, 0); }));
    var guard = new THREE.Mesh(new THREE.TubeGeometry(gc, 160, TH + 0.0012, 8, false), guardM); guard.scale.set(1, 1, 1); guard.castShadow = true; g.add(guard);
    /* brand on both faces: a large satin-silver foil NINJA with a soft debossed shadow and a lime hairline, and a
       small gloss-on-matte shuriken above the sweet spot */
    function wordmark(c, W2, H2, shadow) {
      c.clearRect(0, 0, W2, H2);
      var fs = H2 * 0.9, letters = "NINJA".split(""), track = fs * 0.16;
      c.font = "800 " + fs + "px 'Big Shoulders Display','Arial Narrow',sans-serif"; c.textBaseline = "alphabetic";
      var widths = letters.map(function (l) { return c.measureText(l).width; }), total = widths.reduce(function (x, y) { return x + y; }, 0) + track * (letters.length - 1);
      var sc = Math.min(1, (W2 * 0.94) / total), x = (W2 - total * sc) / 2;
      c.save(); c.translate(x, H2 * 0.88); c.scale(sc, 1);
      if (shadow) { c.filter = "blur(" + Math.round(H2 * 0.035) + "px)"; }
      c.fillStyle = "#fff"; var px = 0;
      letters.forEach(function (l, i) { c.fillText(l, px, 0); px += widths[i] + track; });
      c.restore(); c.filter = "none";
    }
    function brandTex(shadow) {
      var t = canvasTex(1024, 256, function (c) { wordmark(c, 1024, 256, shadow); });
      if (document.fonts && document.fonts.load) document.fonts.load("800 100px 'Big Shoulders Display'").then(function () { wordmark(t.image.getContext("2d"), 1024, 256, shadow); t.needsUpdate = true; }).catch(function () {});
      return t;
    }
    var foilM = new THREE.MeshPhysicalMaterial({ color: col(0xdfe2dc), emissive: col(0x30322f), alphaMap: brandTex(false), transparent: true, metalness: 0.55, roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.25, depthWrite: false });
    var dbM = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: brandTex(true), transparent: true, opacity: 0.45, depthWrite: false });
    var lineM = new THREE.MeshStandardMaterial({ color: col(0xE4F23F), roughness: 0.5 });
    var shurT = canvasTex(256, 256, function (c) {
      c.clearRect(0, 0, 256, 256); c.translate(128, 128); c.fillStyle = "#fff"; c.beginPath();
      for (var i = 0; i < 8; i++) { var a3 = i * Math.PI / 4 - Math.PI / 2, r3 = i % 2 ? 34 : 118; c.lineTo(Math.cos(a3) * r3, Math.sin(a3) * r3); }
      c.closePath(); c.moveTo(18, 0); c.arc(0, 0, 18, 0, Math.PI * 2, true); c.fill("evenodd");
    });
    var shurM = new THREE.MeshPhysicalMaterial({ color: col(0x3a3d39), alphaMap: shurT, transparent: true, roughness: 0.18, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, depthWrite: false });
    [1, -1].forEach(function (s) {
      var z = (TH + 0.0003) * s;
      function decal(w, h, m, x, y, dz) { var d = plane(w, h, m); d.position.set(x, y, z + dz * s); if (s < 0) d.rotation.y = Math.PI; d.renderOrder = 2; g.add(d); return d; }
      decal(0.168, 0.052, dbM, 0.0007, -0.0567, 0);           /* debossed shadow, a hair low and right */
      decal(0.168, 0.052, foilM, 0, -0.056, 0.0002);
      decal(0.06, 0.0013, lineM, 0, -0.0905, 0.0002);
      decal(0.036, 0.036, shurM, 0, 0.088, 0.0002);
    });
    /* throat collar and handle (flattened octagon) */
    var gripT = canvasTex(64, 256, function (c) {
      c.fillStyle = "#8f918a"; c.fillRect(0, 0, 64, 256);
      for (var i = 0; i < 700; i++) { c.fillStyle = "rgba(40,42,40,.35)"; c.beginPath(); c.arc(Math.random() * 64, Math.random() * 256, 0.9, 0, 7); c.fill(); }
    });
    gripT.wrapS = gripT.wrapT = THREE.RepeatWrapping; gripT.repeat.set(1, 1);
    var gripM = new THREE.MeshStandardMaterial({ map: gripT, roughness: 0.92 }), darkM = new THREE.MeshStandardMaterial({ color: col(0x2e302d), roughness: 0.5, metalness: 0.2 });
    var collar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.0185, 0.028, 8), darkM); collar.scale.z = 0.62; collar.position.y = -0.138; collar.rotation.y = Math.PI / 8; g.add(collar);
    var handle = new THREE.Mesh(new THREE.CylinderGeometry(0.0172, 0.0176, 0.128, 8, 1), gripM); handle.scale.z = 0.8; handle.position.y = -0.214; handle.rotation.y = Math.PI / 8; handle.castShadow = true; g.add(handle);
    /* overgrip seam: an elliptical helix */
    var hp = []; for (var j = 0; j <= 220; j++) { var u = j / 220, a2 = u * Math.PI * 2 * 5.2; hp.push(new V3(Math.cos(a2) * 0.0181, -0.152 - u * 0.118, Math.sin(a2) * 0.0181 * 0.8)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp), 400, 0.0011, 5, false), new THREE.MeshStandardMaterial({ color: col(0x6c6e68), roughness: 0.9 })));
    /* collar tape printed NINJA all the way round, and a shuriken on the butt cap */
    var tapeT = canvasTex(512, 48, function (c) {
      c.fillStyle = "#E4F23F"; c.fillRect(0, 0, 512, 48); c.fillStyle = "#0b1e3b"; c.font = "800 34px 'Big Shoulders Display','Arial Narrow',sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      for (var q = 0; q < 4; q++) c.fillText("NINJA", 64 + q * 128, 26);
    });
    var tape = new THREE.Mesh(new THREE.CylinderGeometry(0.0187, 0.0187, 0.014, 16, 1, true), new THREE.MeshStandardMaterial({ map: tapeT, roughness: 0.6 })); tape.scale.z = 0.8; tape.position.y = -0.155; g.add(tape);
    var capT = canvasTex(128, 128, function (c) {
      c.fillStyle = "#2e302d"; c.fillRect(0, 0, 128, 128); c.translate(64, 64); c.fillStyle = "#E4F23F"; c.beginPath();
      for (var q = 0; q < 8; q++) { var a4 = q * Math.PI / 4 - Math.PI / 2, r4 = q % 2 ? 13 : 46; c.lineTo(Math.cos(a4) * r4, Math.sin(a4) * r4); }
      c.closePath(); c.moveTo(7, 0); c.arc(0, 0, 7, 0, 7, true); c.fill("evenodd");
    });
    var capEnd = new THREE.Mesh(new THREE.CircleGeometry(0.0165, 24), new THREE.MeshStandardMaterial({ map: capT, roughness: 0.5 })); capEnd.rotation.x = Math.PI / 2; capEnd.scale.y = 0.8; capEnd.position.y = -0.2868; g.add(capEnd);
    var cap = new THREE.Mesh(new THREE.LatheGeometry([[0.0001, -0.2865], [0.017, -0.2862], [0.0215, -0.282], [0.0205, -0.277], [0.0176, -0.274]].map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 16), darkM);
    cap.scale.z = 0.8; cap.castShadow = true; g.add(cap);
    if (withArrow) {
      var arrow = new THREE.ArrowHelper(new V3(0, 0, 1), new V3(0, 0, 0.012), 0.42, 0xE4F23F, 0.12, 0.07);
      arrow.line.material.toneMapped = false; arrow.cone.material = new THREE.MeshBasicMaterial({ color: col(0xE4F23F) }); arrow.line.material.color = col(0xE4F23F); g.add(arrow); g.userData.arrow = arrow;
    }
    return g;
  }
  var IDS = ["you", "partner", "o1", "o2"], BASE_YAW = { you: 0, partner: 0, o1: Math.PI, o2: Math.PI }, TEAM = { you: 0, partner: 0, o1: 1, o2: 1 }, tagSprites = {};
  function rigOf(cloth, shadeC, accent, arrow) { return NinjaRig.create(THREE, scene, { col: col, cloth: cloth, shade: shadeC, accent: accent, paddle: makePaddle(arrow) }); }
  var A = { you: rigOf(0x1c2a47, 0x101a30, 0xE4F23F, true), partner: rigOf(0xe9eef5, 0xb9c4d4, 0xE4F23F), o1: rigOf(0xd9472f, 0x8f2a1a, 0x0b1e3b), o2: rigOf(0xd9472f, 0x8f2a1a, 0x0b1e3b) };
  var racket = A.you.paddle;
  function arrowSize(w) { var a = racket.userData.arrow; if (a) a.scale.setScalar((0.35 + 0.65 * w) * (S.view === "fp" ? 0.6 : 1)); }
  /* the sculpted ninja (TRELLIS mesh, skinned in mascot.js) takes over from the procedural one once the model has
     loaded */
  var mascotGate = null;   /* the cover stays up until the ninjas have loaded */
  mascotGate = new Promise(function (ok) {
    NinjaMascot.load(THREE, function (m) {
      if (m) { NinjaMascot.attach(A.you, "you"); NinjaMascot.attach(A.partner, "partner"); NinjaMascot.attach(A.o1, "opp"); NinjaMascot.attach(A.o2, "opp"); if (TL) update(0); wake(); ok(); }
      else { var l = $("#loading span"); if (l) l.textContent = "角色載入失敗，請重新整理頁面"; }
    });
  });
  /* soft contact shadow under every ninja so their feet sit on the court */
  var contactT = canvasTex(128, 128, function (g) { var r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, "rgba(0,8,24,.55)"); r.addColorStop(0.55, "rgba(0,8,24,.22)"); r.addColorStop(1, "rgba(0,8,24,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
  IDS.forEach(function (id) { var m = plane(0.95, 0.95, new THREE.MeshBasicMaterial({ map: contactT, transparent: true, depthWrite: false, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.renderOrder = 1; scene.add(m); A[id].contact = m; });

  /* ball */
  var ballTex = canvasTex(256, 128, function (g) { g.fillStyle = "#E4F23F"; g.fillRect(0, 0, 256, 128); g.fillStyle = "#59640c";
    for (var r = 0; r < 5; r++) for (var c = 0; c < 10; c++) { g.beginPath(); g.ellipse(c * 25.6 + (r % 2 ? 12.8 : 0) + 6, 14 + r * 25, 5.2 / Math.max(0.45, Math.sin((14 + r * 25) / 128 * Math.PI)), 5.2, 0, 0, 7); g.fill(); } });
  var ball = new THREE.Mesh(new THREE.SphereGeometry(BR, 20, 14), new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.95, emissive: col(0xE4F23F), emissiveIntensity: 0.35 })); ball.castShadow = true; scene.add(ball);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(64, 64, function (g) { var r = g.createRadialGradient(32, 32, 2, 32, 32, 32); r.addColorStop(0, "rgba(228,242,63,.55)"); r.addColorStop(1, "rgba(228,242,63,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }), depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, toneMapped: false })); glow.material.color.setScalar(1.9); glow.scale.set(0.5, 0.5, 1); scene.add(glow);
  var bShadow = flat(0.22, 0.22, 0x000000, 0.4); bShadow.geometry = new THREE.CircleGeometry(0.11, 20); scene.add(bShadow);
  /* trail: a glowing ribbon that always faces the camera, wide and hot at the ball, fading to nothing */
  var TRAIL = 46, trailPos = new Float32Array(TRAIL * 3), trailGeo = new THREE.BufferGeometry();
  var ribPos = new Float32Array(TRAIL * 2 * 3), ribCol = new Float32Array(TRAIL * 2 * 3), ribIdx = [];
  for (var ti = 0; ti < TRAIL - 1; ti++) { var a0 = ti * 2; ribIdx.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2); }
  trailGeo.setAttribute("position", new THREE.BufferAttribute(ribPos, 3)); trailGeo.setAttribute("color", new THREE.BufferAttribute(ribCol, 3)); trailGeo.setIndex(ribIdx);
  var trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
  trail.frustumCulled = false; scene.add(trail);
  var TC = new THREE.Color(C.ball).convertSRGBToLinear();
  function ribbon(n) {
    var p = trailPos, k, prev = new V3(), cur = new V3(), dir = new V3(), side = new V3(), view = new V3();
    for (k = 0; k < TRAIL; k++) {
      var j = Math.min(k, Math.max(0, n - 1)); cur.set(p[j * 3], p[j * 3 + 1], p[j * 3 + 2]);
      var jn = Math.min(j + 1, Math.max(0, n - 1)), jp = Math.max(j - 1, 0);
      dir.set(p[jp * 3] - p[jn * 3], p[jp * 3 + 1] - p[jn * 3 + 1], p[jp * 3 + 2] - p[jn * 3 + 2]);
      view.copy(cam.position).sub(cur); side.crossVectors(dir, view); if (side.lengthSq() < 1e-9) side.set(0, 1, 0); side.normalize();
      var f = k < n ? 1 - k / Math.max(1, n - 1) : 0, w = 0.045 * Math.pow(f, 0.7);
      ribPos.set([cur.x + side.x * w, cur.y + side.y * w, cur.z + side.z * w, cur.x - side.x * w, cur.y - side.y * w, cur.z - side.z * w], k * 6);
      var near = Math.min(1, Math.max(0.15, (view.length() - 0.5) / 2.2)), c = 1.7 * f * f * near; ribCol.set([TC.r * c, TC.g * c, TC.b * c, TC.r * c, TC.g * c, TC.b * c], k * 6);
    }
    trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.color.needsUpdate = true;
  }
  var pathGroup = new THREE.Group(), markGroup = new THREE.Group(), fxGroup = new THREE.Group(); scene.add(pathGroup); scene.add(markGroup); scene.add(fxGroup);

  /* ---------- sound: synthesised pickleball impacts (paddle pock, hard-court bounce, net) ---------- */
  var Snd = (function () {
    var AC = null, out = null, noise = null, on = true;
    function init() {
      if (AC || !on) return;
      try {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        var comp = AC.createDynamicsCompressor(); out = AC.createGain(); out.gain.value = 0.9; out.connect(comp); comp.connect(AC.destination);
        noise = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); var d = noise.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { AC = null; }
    }
    function env(g, t, peak, a, dcy) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy); }
    function osc(dst, t, type, f0, f1, peak, a, dcy) { var o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + a + dcy); env(g, t, peak, a, dcy); o.connect(g); g.connect(dst); o.start(t); o.stop(t + a + dcy + 0.05); }
    function nz(dst, t, ftype, freq, q, peak, a, dcy) { var s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = noise; s.loop = true; f.type = ftype; f.frequency.value = freq; f.Q.value = q; env(g, t, peak, a, dcy); s.connect(f); f.connect(g); g.connect(dst); s.start(t, Math.random() * 0.5); s.stop(t + a + dcy + 0.05); }
    function play(kind, power, pos) {
      if (!AC || !on) return;
      if (AC.state === "suspended") { try { AC.resume(); } catch (e) {} }
      var t = AC.currentTime + 0.005, d = pos.distanceTo(cam.position), vol = Math.min(1, power) / (1 + d * 0.085);
      var bus = AC.createGain(); bus.gain.value = vol;
      var far = AC.createBiquadFilter(); far.type = "lowpass"; far.frequency.value = Math.max(1800, 16000 - d * 600);
      bus.connect(far);
      if (AC.createStereoPanner) { var p = AC.createStereoPanner(), right = new V3(1, 0, 0).applyQuaternion(cam.quaternion); p.pan.value = Math.max(-0.9, Math.min(0.9, pos.clone().sub(cam.position).dot(right) / 7)); far.connect(p); p.connect(out); } else far.connect(out);
      if (kind === "racket") {          /* pickleball paddle: bright hollow "pock", harder hits ring higher */
        osc(bus, t, "triangle", 1050 + 420 * power, 780, 0.9, 0.001, 0.028 + 0.02 * power);
        osc(bus, t, "sine", 330 + 80 * power, 190, 0.55, 0.002, 0.05);
        nz(bus, t, "bandpass", 2300 + 900 * power, 1.6, 0.55 * power + 0.12, 0.001, 0.022);
      } else if (kind === "floor") {    /* hard acrylic court: short plastic tick */
        osc(bus, t, "triangle", 640, 360, 0.6, 0.001, 0.035);
        osc(bus, t, "sine", 170, 90, 0.45, 0.002, 0.05);
        nz(bus, t, "bandpass", 1800, 1.0, 0.3, 0.001, 0.02);
      } else if (kind === "net") {      /* ball dying in the net: soft thud and tape rustle */
        nz(bus, t, "lowpass", 700, 0.6, 0.8, 0.004, 0.16);
        osc(bus, t, "sine", 110, 60, 0.5, 0.004, 0.12);
      }
    }
    return { init: init, play: play, set: function (v) { on = v; if (v) init(); }, ready: function () { return !!AC; }, isOn: function () { return on; } };
  })();
  function surfaceOf(n) {
    if (n.hit || n.by) return "racket";
    if (n.net) return "net";
    if (n.p[1] === 0) return "floor";
    return null;
  }
  var pulses = [], prevT = -9;

  /* ---------- state ---------- */
  var S = { ci: 0, vi: 0, t: 0, playing: true, speed: 1, view: "fp", freeze: true, showPath: true, yawOff: 0, pitchOff: 0 };
  var TL = null, camYaw = 0, camPitch = 0, camSnap = true, lastCap = "", lastHitKey = "";

  function track(start) { return [{ t: -1, x: start[0], z: start[1] }]; }
  function evalTrack(k, t) {
    if (t <= k[0].t) return k[0];
    for (var i = 1; i < k.length; i++) if (t <= k[i].t) { var a = k[i - 1], b = k[i], s = ss(a.t, b.t, t); return { x: a.x + (b.x - a.x) * s, z: a.z + (b.z - a.z) * s }; }
    return k[k.length - 1];
  }

  function build(v) {
    var N = v.path.map(function (n) { var o = {}; for (var k in n) o[k] = n[k]; o.pos = new V3(n.p[0], n.p[1] + BR, n.p[2]); o.floor = n.p[1] === 0; o.surf = surfaceOf(n); return o; });
    var t = N[0].T || 0; N[0].t = t;
    /* each flight is solved with drag and spin (core.js) so it still lands exactly where and when the scene says */
    var segs = [], mine = false, spin = null, i;
    for (i = 1; i < N.length; i++) {
      var a = N[i - 1], b = N[i];
      if (a.hit || a.by) { mine = !!a.hit; spin = SW[a.hit || a.sw || "ret"].spin; } else if (a.floor && spin !== "top" && spin !== "back") spin = null;
      var sol = PBCore.solve([a.pos.x, a.pos.y, a.pos.z], [b.pos.x, b.pos.y, b.pos.z], b.T, spin);
      segs.push({ t0: t, T: b.T, a: a.pos, b: b.pos, sol: sol, speed: Math.hypot(sol.v0[0], sol.v0[1], sol.v0[2]), mine: mine, spin: spin });
      t += b.T; b.t = t;
    }
    N.forEach(function (n, idx) { var sg = segs[idx] || segs[idx - 1], sp = sg ? sg.speed : 8; n.power = Math.max(0.28, Math.min(1, sp / 22)); });
    var sides = PBCore.planSides(v, SW);
    /* every strike, by anyone, becomes a full swing: where the feet are, which way the body faces, the paddle face */
    var ah = { you: [], partner: [], o1: [], o2: [] }, start = {};
    N.forEach(function (n, idx) {
      var who = n.hit ? "you" : n.by; if (!who || idx === N.length - 1) return;
      var key = n.hit || n.sw || "ret", sw = SW[key], d = N[idx + 1].pos.clone().sub(n.pos); d.y = 0; d.normalize();
      var yaw = Math.atan2(-d.x, -d.z), b = basis(yaw), open = (n.open === undefined ? sw.open : n.open) * Math.PI / 180, m = sides[idx] || 1;
      var h = { t: n.t, sw: sw, key: key, yaw: yaw, b: b, ball: n.pos, open: open, bh: m < 0, idx: idx,
        pos: [n.pos.x - b.r.x * sw.R * m - b.f.x * sw.F, n.pos.z - b.r.z * sw.R * m - b.f.z * sw.F],
        nW: d.clone().multiplyScalar(Math.cos(open)).addScaledVector(UP, Math.sin(open)) };
      ah[who].push(h); if (idx === 0) start[who] = h.pos;
    });
    var hits = ah.you;
    /* actor tracks */
    var ev = { you: [], partner: [], o1: [], o2: [] };
    IDS.forEach(function (id) { ah[id].forEach(function (h) { if (h.idx > 0) ev[id].push({ t: h.t - 0.14, to: h.pos, hold: 0.36 }); }); });
    (v.moves || []).forEach(function (m) { ev[m.who].push({ t: N[m.after].t + (m.delay || 0), to: m.to, dur: m.dur }); });
    var tr = {}, dist = {};
    IDS.forEach(function (id) {
      if (!v[id]) { tr[id] = null; return; }
      var k = track(start[id] || v[id]);
      ev[id].sort(function (p, q) { return p.t - q.t; }).forEach(function (e) {
        var last = k[k.length - 1];
        if (e.dur) { var t0 = Math.max(e.t, last.t + 0.01); k.push({ t: t0, x: last.x, z: last.z }); k.push({ t: t0 + e.dur, x: e.to[0], z: e.to[1] }); }
        else { var ta = Math.max(e.t, last.t + 0.25); if (ta - 0.9 > last.t) k.push({ t: ta - 0.9, x: last.x, z: last.z }); k.push({ t: ta, x: e.to[0], z: e.to[1] }); k.push({ t: ta + e.hold, x: e.to[0], z: e.to[1] }); }
      });
      tr[id] = k;
      var acc = [0], prev = evalTrack(k, -1); for (var q = 1; q <= (t + 4) * 50; q++) { var c = evalTrack(k, -1 + q / 50); acc.push(acc[q - 1] + Math.hypot(c.x - prev.x, c.z - prev.z)); prev = c; }
      dist[id] = acc;
    });
    var caps = [{ t: -1, text: v.intro || "" }];
    N.forEach(function (n) { if (n.cap) caps.push({ t: n.t, text: n.cap }); });
    (v.caps || []).forEach(function (c) { caps.push({ t: N[c.after].t + (c.delay || 0), text: c.text }); });
    caps.sort(function (p, q) { return p.t - q.t; });
    return { N: N, segs: segs, hits: hits, ah: ah, dist: dist, tr: tr, caps: caps, end: t, dur: t + (v.end || 1.4), start: N[0].t };
  }

  var tmpA = [0, 0, 0];
  function ballAt(t) {
    var s = TL.segs;
    if (t <= TL.start) return { p: TL.N[0].pos.clone(), seg: null };
    for (var i = 0; i < s.length; i++) { var g = s[i]; if (t <= g.t0 + g.T) { PBCore.at(g.sol, t - g.t0, g.T, tmpA); return { p: new V3(tmpA[0], tmpA[1], tmpA[2]), seg: g }; } }
    return { p: TL.N[TL.N.length - 1].pos.clone(), seg: null };
  }
  function actorState(id, t) {
    var k = TL.tr[id], p = evalTrack(k, t), q = evalTrack(k, t - 0.04), base = BASE_YAW[id], best = 0, hy = base;
    var vel = new V3((p.x - q.x) / 0.04, 0, (p.z - q.z) / 0.04), sp = vel.length();
    TL.ah[id].forEach(function (h) { var w = Math.min(ss(h.t - 0.6, h.t - 0.15, t), 1 - ss(h.t + 0.3, h.t + 0.8, t)); if (w > best) { best = w; hy = h.yaw; } });
    var run = sp > 0.3 ? Math.max(-0.9, Math.min(0.9, angDiff(base, Math.atan2(-vel.x, -vel.z)))) * Math.min(1, sp / 2.5) : 0;
    if (Math.abs(angDiff(base, Math.atan2(-vel.x, -vel.z))) > 1.9) run = 0;                    /* backpedal: keep facing the net */
    var i = Math.max(0, Math.min(TL.dist[id].length - 2, (t + 1) * 50)), i0 = Math.floor(i), acc = TL.dist[id];
    return { x: p.x, z: p.z, yaw: base + best * angDiff(base, hy) + (1 - best) * run, vel: vel, gait: acc[i0] + (acc[i0 + 1] - acc[i0]) * (i - i0) };
  }
  function racketPose(id, t, ys) {
    var b = basis(ys.yaw), org = new V3(ys.x, 0, ys.z), R = SW.ready, h = null, bd = 1e9;
    function mir(a, m) { return [a[0] * m, a[1], a[2]]; }
    function pose(k, dy, m) { var p = org.clone().add(toWorld(mir(k.pos, m || 1), b)); p.y += dy || 0; return { pos: p, q: quatFrom(toWorld(mir(k.n, m || 1), b), toWorld(mir(k.h, m || 1), b)) }; }
    var ready = pose(R, A[id].readyDy || 0);                 /* a shorter body carries the ready paddle lower; contacts are unchanged */
    TL.ah[id].forEach(function (x) { var d = Math.abs(t - x.t); if (t >= x.t + x.sw.pre.dt - 0.3 && t <= x.t + x.sw.post.dt + 0.4 && d < bd) { bd = d; h = x; } });
    if (!h) return { pos: ready.pos, q: ready.q, hit: null, w: 0 };
    var sw = h.sw, m = h.bh ? -1 : 1, dy = sw.ry === undefined ? 0 : (h.ball.y - BR - sw.ry), a = h.t + sw.pre.dt - 0.3, bT = h.t + sw.pre.dt, c = h.t, d2 = h.t + sw.post.dt, e = d2 + 0.4;
    var contact = { pos: h.ball.clone(), q: quatFrom(h.nW, toWorld(mir(sw.hc, m), h.b), true) };
    var p0, p1, s, w;
    if (t < bT) { p0 = ready; p1 = pose(sw.pre, dy, m); s = ss(a, bT, t); w = s; }
    else if (t < c) { p0 = pose(sw.pre, dy, m); p1 = contact; s = (t - bT) / (c - bT); s = s * s; w = 1; }
    else if (t < d2) { p0 = contact; p1 = pose(sw.post, dy, m); s = (t - c) / (d2 - c); s = 1 - (1 - s) * (1 - s); w = 1; }
    else { p0 = pose(sw.post, dy, m); p1 = ready; s = ss(d2, e, t); w = 1 - s; }
    return { pos: p0.pos.clone().lerp(p1.pos, s), q: p0.q.clone().slerp(p1.q, s), hit: h, w: w };
  }

  /* ---------- load a variant ---------- */
  function clearGroup(g) { while (g.children.length) { var o = g.children.pop(); if (o.geometry) o.geometry.dispose(); } }
  function fromHash() {
    var m = /^#s(\d\d)-([\w-]+)$/.exec(location.hash || ""); if (!m) return null;
    for (var i = 0; i < CH.length; i++) if (CH[i].no === m[1]) for (var j = 0; j < CH[i].v.length; j++) if (CH[i].v[j].id === m[2]) return { ci: i, vi: j };
    return null;
  }
  window.addEventListener("hashchange", function () { var h = fromHash(); if (h && (h.ci !== S.ci || h.vi !== S.vi)) load(h.ci, h.vi); });
  function load(ci, vi, keepView) {
    S.ci = ci; S.vi = vi; var ch = CH[ci], v = ch.v[vi];
    try { history.replaceState(null, "", "#s" + ch.no + "-" + v.id); } catch (e) {}
    wake();
    TL = build(v); TL.ask = Quiz.plan(ci, vi); if (TL.ask) TL.ask.t = TL.N[TL.ask.idx].t; TL.asked = false; Quiz.hide(); prevT = -9; S.t = -0.6; S.playing = true; S.yawOff = S.pitchOff = 0; camSnap = true; lastCap = ""; lastHitKey = "";
    if (!keepView) S.view = ch.view || "fp";
    for (var i = 0; i < TRAIL * 3; i++) trailPos[i] = 0; trail.userData.n = 0;
    /* trajectory preview */
    clearGroup(pathGroup);
    TL.segs.forEach(function (g) {
      var pts = []; for (var k = 0; k <= 30; k++) { PBCore.at(g.sol, g.T * k / 30, g.T, tmpA); pts.push(new V3(tmpA[0], tmpA[1], tmpA[2])); }
      var l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ toneMapped: false, color: col(g.mine ? C.ball : C.line), dashSize: 0.22, gapSize: 0.16, transparent: true, opacity: g.mine ? 0.9 : 0.4 }));
      l.computeLineDistances(); pathGroup.add(l);
    });
    TL.N.forEach(function (n, idx) { if (!n.floor || idx === 0) return; var r = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.19, 28), new THREE.MeshBasicMaterial({ toneMapped: false, color: col(C.ball), transparent: true, opacity: 0.8, depthWrite: false })); r.rotation.x = -Math.PI / 2; r.position.set(n.pos.x, 0.012, n.pos.z); pathGroup.add(r); });
    /* impact pulses: one expanding ring per contact with floor, net or paddle */
    clearGroup(fxGroup); pulses = [];
    TL.N.forEach(function (n) {
      if (!n.surf) return;
      var c = n.surf === "net" ? 0xFF6A4D : 0xE4F23F;
      var r = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.2, 36), new THREE.MeshBasicMaterial({ toneMapped: false, color: col(c), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      r.position.copy(n.pos);
      if (n.surf === "floor") { r.rotation.x = -Math.PI / 2; r.position.y = 0.02; }
      else if (n.surf === "racket") r.userData.face = true;
      r.visible = false; fxGroup.add(r); pulses.push({ m: r, t: n.t, big: n.surf === "racket" ? 3 : 6 });
    });
    /* marks */
    clearGroup(markGroup);
    (v.marks || []).forEach(function (m) {
      if (m.type === "zone") {
        var z = flat(m.x1 - m.x0, m.z1 - m.z0, m.color, m.on ? 0.36 : 0.12); z.position.set((m.x0 + m.x1) / 2, 0.008, (m.z0 + m.z1) / 2); markGroup.add(z);
        if (m.label) { var l = label(m.label, m.color, m.on ? 0.3 : 0.22); l.position.set(m.lx === undefined ? -1.7 : m.lx, m.ly || 0.4, (m.z0 + m.z1) / 2); markGroup.add(l); }
      } else if (m.type === "label") { var s = label(m.text, m.color, 0.24); s.position.set(m.p[0], m.p[1], m.p[2]); markGroup.add(s); }
      else if (m.type === "line") {
        var p = new V3(m.pts[0][0], m.pts[0][1], m.pts[0][2]), q = new V3(m.pts[1][0], m.pts[1][1], m.pts[1][2]), len = p.distanceTo(q);
        var bar = flat(m.w || 0.12, len, m.color, m.w > 1 ? 0.3 : 0.85); bar.position.copy(p).lerp(q, 0.5); bar.rotation.z = Math.atan2(q.x - p.x, q.z - p.z); markGroup.add(bar);
        if (m.label) { var ll = label(m.label, m.color, 0.36); ll.position.copy(p).lerp(q, m.w > 1 ? 0.5 : 0.92); ll.position.y = 0.7; markGroup.add(ll); }
      }
    });
    /* actors */
    ["partner", "o1", "o2"].forEach(function (id) {
      A[id].group.visible = !!v[id];
      if (tagSprites[id]) { A[id].tag.remove(tagSprites[id]); tagSprites[id] = null; }
      var txt = (v.tags && v.tags[id]) || (id === "partner" ? "搭檔" : "");
      if (txt && v[id]) { var s = label(txt, id === "partner" ? "#F3F7FB" : "#FF6A4D", 0.24); A[id].tag.add(s); tagSprites[id] = s; }
    });
    ui.sync(); update(0);
  }

  /* ---------- per-frame ---------- */
  var tmpQ = new THREE.Quaternion();
  function update(dt) {
    var t = S.t, v = CH[S.ci].v[S.vi];
    var B = ballAt(t), bp = B.p, ys = null, rp = null;
    IDS.forEach(function (id) {
      if (!TL.tr[id]) return;
      var st = actorState(id, t), pose = racketPose(id, t, st), fig = A[id];
      /* split-step: a small hop that lands as the other side strikes the ball */
      var hop = 0, split = 0; TL.N.forEach(function (n) { var who = n.hit ? "you" : n.by; if (!who || TEAM[who] === TEAM[id]) return; var u = (t - (n.t - 0.28)) / 0.28; if (u > 0 && u < 1) hop = Math.max(hop, Math.sin(u * Math.PI) * 0.05); split = Math.max(split, 1 - Math.min(1, Math.abs(t - n.t) / 0.45)); });
      var first = TL.ah[id][0], hold = !!first && first.key === "serve" && t < first.t - 0.1;
      fig.update({ root: new V3(st.x, 0, st.z), yaw: st.yaw, vel: st.vel, gait: st.gait, t: t, hand: pose.pos.clone().add(new V3(0, -0.25, 0).applyQuaternion(pose.q)), pPos: pose.pos, pQ: pose.q,
        w: pose.w, bh: !!(pose.hit && pose.hit.bh), ball: bp, hold: hold, hop: hop * (1 - pose.w), split: split * (1 - pose.w) });
      if (id === "you") arrowSize(pose.w);
      fig.contact.position.set(st.x, 0.011, st.z); fig.contact.visible = fig.group.visible && !(id === "you" && S.view === "fp");
      if (id === "you") { ys = st; rp = pose; }
    });
    var lift = A.you.eye.y - 1.5;
    ball.position.copy(bp); glow.position.copy(bp); bShadow.position.set(bp.x, 0.01, bp.z);
    var sc = Math.max(0.5, 1.5 - bp.y * 0.12); bShadow.scale.set(sc, sc, 1); bShadow.material.opacity = Math.max(0.12, 0.45 - bp.y * 0.05);
    if (B.seg && B.seg.spin && B.seg.spin !== "flat") {
      var d = B.seg.b.clone().sub(B.seg.a); d.y = 0; d.normalize(); var right = new V3().crossVectors(d, UP);
      var axis = B.seg.spin === "side" ? UP : right, sign = B.seg.spin === "back" ? 1 : -1;
      ball.quaternion.setFromAxisAngle(axis, sign * t * 26);
    }
    /* trail */
    if (dt > 0 && t > TL.start && t < TL.end + 0.1) { trailPos.copyWithin(3, 0, (TRAIL - 1) * 3); trailPos[0] = bp.x; trailPos[1] = bp.y; trailPos[2] = bp.z; trail.userData.n = Math.min(TRAIL, (trail.userData.n || 0) + 1); }
    if (dt === 0) trail.userData.n = 0;
    ribbon(trail.userData.n || 0);
    pathGroup.visible = S.showPath;
    /* impact pulses */
    pulses.forEach(function (p) { var s = (t - p.t) / 0.45; if (s < 0 || s > 1) { p.m.visible = false; return; } p.m.visible = true; var k2 = 1 + s * p.big; p.m.scale.set(k2, k2, k2); p.m.material.opacity = 0.9 * (1 - s); if (p.m.userData.face) p.m.quaternion.copy(cam.quaternion); });
    var nW = new V3(0, 0, 1).applyQuaternion(rp.q), faceDeg = Math.asin(Math.max(-1, Math.min(1, nW.y))) * 180 / Math.PI;
    /* camera */
    var k = camSnap ? 1 : 1 - Math.exp(-dt * 7), eye = A.you.eye.clone(), live = t > TL.start - 0.4 && t < TL.end + 0.6;
    if (S.view === "fp" && rp.hit) {
      /* low strike: step the eye back and up a little, so the paddle meets the ball above the control dock */
      var lowW = rp.w * Math.max(0, Math.min(1, (0.8 - (rp.hit.ball.y - BR)) / 0.45)), fb = basis(ys.yaw);
      eye.addScaledVector(fb.f, -0.4 * lowW); eye.y += 0.18 * lowW;
    }
    A.you.setFP(S.view === "fp");
    if (S.view === "fp") {
      var tgt = live ? bp : new V3(ys.x * 0.4, 1.0, ys.z - 10), dd = tgt.clone().sub(eye), dl = dd.length(); dd.normalize();
      var wantYaw = Math.atan2(-dd.x, -dd.z), wantPitch = Math.max(-1.25, Math.min(1.3, Math.asin(dd.y)));
      var kk = camSnap ? 1 : 1 - Math.exp(-dt * 9 * Math.max(0.2, Math.min(1, dl / 2.5)));
      camYaw += angDiff(camYaw, wantYaw) * kk; camPitch += (wantPitch - camPitch) * kk;
      cam.position.copy(eye); cam.rotation.set(Math.max(-1.5, Math.min(1.5, camPitch + S.pitchOff)), camYaw + S.yawOff, 0);
    } else {
      var pos, look;
      if (S.view === "shoulder") { pos = new V3(ys.x + 1.3, 3.0, ys.z + 4.4); look = new V3(ys.x, 1.5, ys.z).lerp(bp, live ? 0.3 : 0); }
      else if (S.view === "side") { pos = new V3(ys.x + 4.6, 1.45, ys.z - 0.7); look = rp.pos.clone().lerp(new V3(ys.x, 0.85 + lift, ys.z), 0.55); }
      else { var hgt = Math.max(24, 9 / cam.aspect) / Math.tan(cam.fov * Math.PI / 360) / 2 * 1.08; pos = new V3(0, hgt, 0.01); look = new V3(0, 0, 0); }
      if (S.view !== "top") { var off = pos.clone().sub(new V3(ys.x, 1.3, ys.z)); off.applyAxisAngle(UP, S.yawOff); pos = new V3(ys.x, 1.3, ys.z).add(off); pos.y = Math.max(0.4, pos.y + S.pitchOff * 3); }
      cam.position.lerp(pos, k); cam.up.set(0, 1, 0);
      if (S.view === "top") { cam.position.copy(pos); cam.rotation.set(-Math.PI / 2, 0, 0); } else cam.lookAt(look);
      camYaw = cam.rotation.y; camPitch = cam.rotation.x;
    }
    if (window.__camDbg) { cam.position.fromArray(window.__camDbg, 0); cam.up.set(0, 1, 0); cam.lookAt(new V3().fromArray(window.__camDbg, 3)); }
    camSnap = false;
    var bd = ball.position.distanceTo(cam.position), nearK = Math.min(1, Math.max(0, (bd - 0.5) / 2.2));
    glow.material.color.setScalar(0.35 + 1.55 * nearK); glow.material.opacity = 0.35 + 0.65 * nearK;
    var back = new V3(0, 0, -1).applyQuaternion(cam.quaternion); back.y = 0; if (back.lengthSq() < 1e-6) back.set(0, 0, -1); back.normalize();
    rim.target.position.copy(cam.position).addScaledVector(back, 6); rim.target.position.y = 0.8;
    rim.position.copy(rim.target.position).addScaledVector(back, 8); rim.position.y = 3.2;
    ui.tick(t, rp.hit, faceDeg);
  }

  /* ---------- post-processing: MSAA, bloom on the hot lamps / ball / trail, colour grade and vignette ---------- */
  var FX = (function () {
    var ok = !!(THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass && THREE.ShaderPass && renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget);
    var on = ok, composer = null, bloom = null, grade = null;
    var GRADE = {
      uniforms: { tDiffuse: { value: null }, vig: { value: 0.3 }, sat: { value: 1.18 }, aspect: { value: 1 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: [
        "uniform sampler2D tDiffuse; uniform float vig; uniform float sat; uniform float aspect; varying vec2 vUv;",
        "vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }",
        "void main(){",
        "  vec3 c = toSRGB(clamp(texture2D(tDiffuse, vUv).rgb, 0.0, 1.0));",
        "  float l = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l), c, sat);",
        "  c = mix(c, c * c * (3.0 - 2.0 * c), 0.12);",
        "  vec2 d = (vUv - 0.5) * vec2(aspect, 1.0); float v = smoothstep(1.05, 0.35, length(d) / max(aspect, 1.0) * 1.35);",
        "  c *= mix(1.0 - vig, 1.0, v);",
        "  gl_FragColor = vec4(c, 1.0);",
        "}"].join("\n")
    };
    function build() {
      var mobile = matchMedia("(pointer: coarse)").matches || Math.min(innerWidth, innerHeight) < 600;
      var rt = new THREE.WebGLMultisampleRenderTarget(4, 4, { type: THREE.HalfFloatType, format: THREE.RGBAFormat });
      rt.samples = mobile ? 2 : 4;
      composer = new THREE.EffectComposer(renderer, rt);
      composer.addPass(new THREE.RenderPass(scene, cam));
      bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.62, 0.5, 1.02); composer.addPass(bloom);
      grade = new THREE.ShaderPass(GRADE); composer.addPass(grade);
    }
    if (ok) { try { build(); } catch (e) { ok = on = false; } }
    return {
      ok: function () { return ok; }, on: function () { return on; },
      set: function (v) { on = ok && v; },
      size: function (w, h) { if (!composer) return; composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); bloom.setSize(w * renderer.getPixelRatio() / 2, h * renderer.getPixelRatio() / 2); grade.uniforms.aspect.value = w / h; },
      render: function () { if (on && composer) composer.render(); else renderer.render(scene, cam); }
    };
  })();

  /* D2: when nothing moves, stop drawing. Any input wakes the loop for a moment so the camera can settle. */
  var wakeUntil = 0;
  function wake() { wakeUntil = performance.now() + 1600; }
  ["pointerdown", "pointermove", "keydown", "input", "click", "wheel", "touchstart"].forEach(function (n) { document.addEventListener(n, wake, { passive: true, capture: true }); });
  window.addEventListener("resize", wake);
  /* D1: if the effects pass makes the page slow on this device, switch it off once and say so */
  var perf = { n: 0, sum: 0, done: false };
  function watchPerf(raw) {
    if (perf.done || !FX.on() || !S.playing || raw > 250 || document.hidden) return;
    perf.n++; if (perf.n < 45) return;
    perf.sum += raw; if (perf.n < 45 + 90) return;
    perf.done = true;
    if (perf.sum / 90 > 42) { FX.set(false); var c = $("#tFx"); if (c) c.checked = false; toast("這台裝置畫面較慢，已自動關閉高畫質特效"); }
  }
  var last = 0;
  function frame(now) {
    var raw = now - last, dt = Math.min(0.05, raw / 1000 || 0); last = now;
    if (!S.playing && !Rec.on && now > wakeUntil) { requestAnimationFrame(frame); return; }
    watchPerf(raw);
    if (S.playing) {
      var rate = S.speed;
      if (S.freeze) TL.hits.forEach(function (h) { if (Math.abs(S.t - h.t) < 0.045) rate *= 0.07; });
      if (TL.ask && !TL.asked && S.t + dt * rate >= TL.ask.t - 0.32) { S.t = TL.ask.t - 0.32; S.playing = false; TL.asked = true; Quiz.ask(); }
      else S.t += dt * rate;
      if (prevT > -5) TL.N.forEach(function (n) { if (n.surf && n.t > prevT && n.t <= S.t) Snd.play(n.surf, n.surf === "racket" ? n.power : n.power * 0.8, n.pos); });
      prevT = S.t;
      if (S.t >= TL.dur) { S.t = TL.dur; S.playing = false; ui.sync(); }
    }
    if (!S.playing) prevT = S.t; else if (prevT < -5) prevT = S.t;
    update(S.playing ? dt : 0.016);
    FX.render();
    if (Rec.on) Rec.frame();
    requestAnimationFrame(frame);
  }
  function resize() { var w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); FX.size(w, h); cam.aspect = w / h; cam.fov = w < h ? 82 : 68;
    /* lift the optical centre above the control dock so the contact point is not hidden behind it */
    var bar = document.querySelector(".bar"), bh = bar ? bar.offsetHeight : 160;
    var D = Math.round(Math.min(h * 0.3, 210, bh * 1.2)); cam.setViewOffset(w, h + D, 0, D, w, h); cam.updateProjectionMatrix(); }
  (function () {
    var more = $("#more"), bar = document.querySelector(".bar"); if (!more || !bar) return;
    more.addEventListener("click", function () { var on = bar.classList.toggle("open"); more.setAttribute("aria-expanded", String(on)); more.textContent = on ? "收合" : "⋯ 更多"; resize(); wake(); });
  })();
  window.addEventListener("resize", resize);

  function toast(msg) { var el = $("#toast"); el.textContent = msg; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 2600); }

  /* ---------- A1: guess first, then watch ---------- */
  var Quiz = (function () {
    var on = false, score = { n: 0, ok: 0 }, cur = null;
    function anti(v) { return /^✕/.test(v.label); }
    function strip(l) { return l.replace(/^(GO|ALT|STOP)\s+/, ""); }
    /* the strike the chapter is about: your first strike after the other side has played, else your first strike */
    function keyHit(v) {
      var P = v.path, seen = false, first = -1;
      for (var i = 0; i < P.length - 1; i++) { if (P[i].by && P[i].by !== "partner") seen = true; if (P[i].hit) { if (first < 0) first = i; if (seen) return i; } }
      return first;
    }
    function eligible(ci) { var ch = CH[ci]; return ch.ask && ch.quiz !== false; }
    function plan(ci, vi) {
      if (!on || !eligible(ci)) return null;
      var ch = CH[ci], v = ch.v[vi]; if (anti(v)) return null;
      var idx = keyHit(v); if (idx < 0) return null;
      var pool = ch.v.filter(function (x) { return !anti(x); }), opts, ans;
      if (ch.quiz === "label") { opts = pool.map(function (x) { return strip(x.label); }); ans = strip(v.label); }
      else { opts = []; pool.forEach(function (x) { var n = SW[x.path[keyHit(x)].hit].name; if (opts.indexOf(n) < 0) opts.push(n); }); ans = SW[v.path[idx].hit].name; }
      for (var i = opts.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp; }
      cur = { ci: ci, vi: vi, opts: opts, ans: ans, q: ch.ask };
      return { idx: idx };
    }
    function hide() { $("#quiz").hidden = true; document.body.classList.remove("quiz-ask"); }
    function head() { $("#qScore").textContent = score.n ? "答對 " + score.ok + " / " + score.n : "決策挑戰"; }
    function ask() {
      if (!cur) return;
      document.body.classList.add("quiz-ask");
      $("#qAsk").textContent = cur.q; head();
      $("#qOpts").innerHTML = cur.opts.map(function (o) { return "<button>" + o + "</button>"; }).join("");
      $("#qResult").hidden = true; $("#qNext").hidden = true; $("#quiz").hidden = false; ui.sync();
    }
    function answer(btn) {
      var ok = btn.textContent === cur.ans, v = CH[cur.ci].v[cur.vi];
      score.n++; if (ok) score.ok++; head();
      [].forEach.call($("#qOpts").children, function (b) { b.disabled = true; if (b.textContent === cur.ans) b.classList.add("ok"); });
      if (!ok) btn.classList.add("no");
      var r = $("#qResult"); r.innerHTML = "<b>" + (ok ? "✔ 答對！" : "✘ 正解是：" + cur.ans) + "</b>" + (v.why ? "原因：" + v.why : "");
      r.hidden = false; $("#qNext").hidden = false;
      document.body.classList.remove("quiz-ask"); S.playing = true; ui.sync();
    }
    function next() {
      var pool = [];
      CH.forEach(function (ch, ci) { if (eligible(ci)) ch.v.forEach(function (v, vi) { if (!anti(v) && !(ci === S.ci && vi === S.vi)) pool.push([ci, vi]); }); });
      var p = pool[Math.floor(Math.random() * pool.length)]; load(p[0], p[1]);
    }
    function set(v) { on = v; if (on) { score = { n: 0, ok: 0 }; next(); } else { hide(); TL.ask = null; } ui.sync(); }
    return { plan: function (ci, vi) { var p = plan(ci, vi); if (!p) cur = null; return p; }, ask: ask, answer: answer, next: next, set: set, hide: hide, on: function () { return on; } };
  })();

  /* ---------- B4: record the current play as a short video, in the viewer's own browser ---------- */
  var Rec = (function () {
    var ok = !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream), mr = null, rc = null, cx = null, chunks = [], endAt = 0;
    var mime = ok ? ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].filter(function (m) { try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } })[0] : null;
    if (!mime) ok = false;
    function wrap(text, max) { var lines = [], line = ""; for (var i = 0; i < text.length; i++) { var t = line + text[i]; if (cx.measureText(t).width > max && line) { lines.push(line); line = text[i]; } else line = t; } if (line) lines.push(line); return lines; }
    function frame() {
      if (!mr) return;
      var W = rc.width, H = rc.height, u = Math.min(W, H) / 1080;
      cx.drawImage(canvas, 0, 0, W, H);
      var ch = CH[S.ci];
      cx.fillStyle = "rgba(7,30,61,.82)"; cx.fillRect(28 * u, 28 * u, 620 * u, 96 * u);
      cx.fillStyle = "#E4F23F"; cx.font = "800 " + (24 * u) + "px 'Big Shoulders Display','Noto Sans TC',sans-serif"; cx.textBaseline = "top"; cx.fillText(ch.en.toUpperCase(), 48 * u, 42 * u);
      cx.fillStyle = "#F3F7FB"; cx.font = "900 " + (36 * u) + "px 'Noto Sans TC',sans-serif"; cx.fillText(ch.title, 48 * u, 74 * u);
      if (lastCap) {
        cx.font = "900 " + (40 * u) + "px 'Noto Sans TC',sans-serif"; var ls = wrap(lastCap, W - 160 * u), lh = 56 * u, y = H - 150 * u - ls.length * lh;
        ls.forEach(function (l, i) { var w = cx.measureText(l).width; cx.fillStyle = "rgba(7,30,61,.85)"; cx.fillRect((W - w) / 2 - 18 * u, y + i * lh - 6 * u, w + 36 * u, lh); cx.fillStyle = "#F3F7FB"; cx.fillText(l, (W - w) / 2, y + i * lh); });
      }
      cx.font = "800 " + (26 * u) + "px 'Big Shoulders Display','Noto Sans TC',sans-serif"; cx.fillStyle = "#E4F23F"; var wm = "PBNINJA.VERCEL.APP · COACH NINJA"; cx.fillText(wm, W - cx.measureText(wm).width - 36 * u, H - 64 * u);
      if (!S.playing && S.t >= TL.dur - 0.01) { if (!endAt) endAt = performance.now() + 600; else if (performance.now() > endAt) stop(); }
    }
    function start() {
      var w = canvas.width, h = canvas.height, sc = Math.min(1, 1920 / Math.max(w, h));
      rc = document.createElement("canvas"); rc.width = Math.round(w * sc / 2) * 2; rc.height = Math.round(h * sc / 2) * 2; cx = rc.getContext("2d");
      chunks = []; endAt = 0;
      try { mr = new MediaRecorder(rc.captureStream(30), { mimeType: mime, videoBitsPerSecond: 8e6 }); } catch (e) { mr = null; toast("這個瀏覽器無法錄影"); return; }
      mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = function () {
        var blob = new Blob(chunks, { type: mime.split(";")[0] }), a = document.createElement("a"), ch = CH[S.ci], v = ch.v[S.vi];
        if (!blob.size) { toast("這次沒有錄到畫面，請換用 Chrome 或 Safari 再試一次"); return; }
        a.href = URL.createObjectURL(blob); a.download = "NinjaPB-" + ch.no + "-" + v.id + (mime.indexOf("mp4") >= 0 ? ".mp4" : ".webm");
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
        toast("短片已下載" + (mime.indexOf("mp4") >= 0 ? "（MP4）" : "（WebM）"));
      };
      mr.start(500); api.on = true;
      S.t = -0.6; S.playing = true; trail.userData.n = 0; camSnap = true; ui.sync(); toast("錄影中：會從頭播到這一球結束");
    }
    function stop() { if (mr && mr.state !== "inactive") mr.stop(); mr = null; api.on = false; ui.sync(); }
    var api = { ok: ok, on: false, start: start, stop: stop, frame: frame };
    return api;
  })();

  /* ---------- UI ---------- */
  var ui = (function () {
    var elCh = $("#chapters"), elVar = $("#variants"), elCap = $("#caption"), elScrub = $("#scrub"), elPlay = $("#play"), elBadge = $("#badge");
    CH.forEach(function (c, i) { var b = document.createElement("button"); b.id = "ch" + i; b.innerHTML = "<b>" + c.no + "</b><span>" + c.title + "</span>"; b.addEventListener("click", function () { load(i, 0); }); elCh.appendChild(b); });
    function seg(el, key, cb) { el.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; cb(b.dataset.v); sync(); }); }
    seg($("#views"), "view", function (v) { S.view = v; S.yawOff = S.pitchOff = 0; camSnap = true; });
    seg($("#speeds"), "speed", function (v) { S.speed = +v; });
    elVar.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) load(S.ci, +b.dataset.v, true); });
    elPlay.addEventListener("click", function () { if (S.t >= TL.dur - 0.01) { S.t = -0.6; trail.userData.n = 0; } S.playing = !S.playing; sync(); });
    $("#replay").addEventListener("click", function () { S.t = -0.6; S.playing = true; trail.userData.n = 0; camSnap = true; sync(); });
    $("#tPath").addEventListener("change", function (e) { S.showPath = e.target.checked; });
    $("#tFreeze").addEventListener("change", function (e) { S.freeze = e.target.checked; });
    var elSnd = $("#sound");
    function sndLabel() { elSnd.textContent = !Snd.isOn() ? "音效：關" : (Snd.ready() ? "音效：開" : "點一下開啟音效"); elSnd.setAttribute("aria-pressed", String(Snd.isOn() && Snd.ready())); }
    var wasReady = false;
    elSnd.addEventListener("pointerdown", function () { wasReady = Snd.ready(); });
    elSnd.addEventListener("click", function () { if (!wasReady) { Snd.set(true); wasReady = true; } else Snd.set(!Snd.isOn()); sndLabel(); });
    document.addEventListener("pointerdown", function once() { Snd.init(); sndLabel(); document.removeEventListener("pointerdown", once); });
    sndLabel();
    $("#tArrow").addEventListener("change", function (e) { racket.userData.arrow.visible = e.target.checked; });
    var elFx = $("#tFx"); elFx.checked = FX.on(); elFx.disabled = !FX.ok(); if (!FX.ok()) elFx.parentNode.title = "這個瀏覽器不支援高畫質特效";
    elFx.addEventListener("change", function (e) { FX.set(e.target.checked); });
    $("#quizBtn").addEventListener("click", function () { Quiz.set(!Quiz.on()); });
    $("#qOpts").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b && !b.disabled) Quiz.answer(b); });
    $("#qNext").addEventListener("click", function () { Quiz.next(); });
    $("#qStop").addEventListener("click", function () { Quiz.set(false); });
    $("#copyLink").addEventListener("click", function () {
      var url = location.href;
      try { navigator.clipboard.writeText(url).then(function () { toast("已複製這一球的連結"); }, function () { toast(url); }); } catch (e) { toast(url); }
    });
    var elRec = $("#recBtn"); elRec.hidden = !Rec.ok;
    elRec.addEventListener("click", function () { if (Rec.on) Rec.stop(); else Rec.start(); });
    $("#panelToggle").addEventListener("click", function () { document.body.classList.toggle("panel-open"); });
    $("#prev").addEventListener("click", function () { load((S.ci + CH.length - 1) % CH.length, 0); });
    $("#next").addEventListener("click", function () { load((S.ci + 1) % CH.length, 0); });
    elScrub.addEventListener("input", function () { S.t = +elScrub.value; S.playing = false; trail.userData.n = 0; sync(); });
    /* drag to look */
    var drag = null;
    canvas.addEventListener("pointerdown", function (e) { drag = { x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} });
    canvas.addEventListener("pointermove", function (e) { if (!drag) return; S.yawOff -= (e.clientX - drag.x) * 0.005; S.pitchOff = Math.max(-1.2, Math.min(1.2, S.pitchOff - (e.clientY - drag.y) * 0.004)); drag.x = e.clientX; drag.y = e.clientY; });
    ["pointerup", "pointercancel"].forEach(function (n) { canvas.addEventListener(n, function () { drag = null; }); });
    canvas.addEventListener("dblclick", function () { S.yawOff = S.pitchOff = 0; });
    document.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT") return;
      if (e.key === " ") { e.preventDefault(); elPlay.click(); }
      else if (e.key === "ArrowRight") { S.t = Math.min(TL.dur, S.t + 0.05); S.playing = false; sync(); }
      else if (e.key === "ArrowLeft") { S.t = Math.max(-0.6, S.t - 0.05); S.playing = false; trail.userData.n = 0; sync(); }
    });

    /* coaching and gear sheet (deck slides 13–15) */
    (function () {
      var c = INFO.coach, g = INFO.gear, h = "";
      h += '<section><span class="eyebrow">Coach Ninja</span><h2>' + c.title + "</h2><p class=\"sub\">" + c.sub + "</p><ul>" + c.facts.map(function (f) { return "<li>" + f + "</li>"; }).join("") + "</ul>";
      h += '<p class="where">' + c.where + '</p><ol class="plans">' + c.plans.map(function (p) { return "<li><b>" + p[0] + "</b><div><strong>" + p[1] + "</strong><span>" + p[2] + "</span></div></li>"; }).join("") + "</ol></section>";
      h += '<section><span class="eyebrow">Six Zero · Official Gear Partner</span><h2>' + g.title + "</h2><p class=\"sub\">" + g.sub + '</p><ul class="gear">' + g.paddles.map(function (p) { return "<li><strong>" + p[0] + "</strong><em>" + p[1] + "</em><span>" + p[2] + "</span><small>強化拍數：" + p[3] + "</small></li>"; }).join("") + "</ul>";
      h += '<p class="code"><b>' + g.code + "</b><span>" + g.deal + "</span></p></section>";
      h += '<section class="links">' + INFO.links.map(function (l) { return '<a href="' + l[2] + '" target="_blank" rel="noopener"><span>' + l[0] + "</span><b>" + l[1] + "</b></a>"; }).join("") + "</section>";
      $("#infoBody").innerHTML = h;
      function toggle(open) { $("#info").hidden = !open; if (open) { S.playing = false; sync(); $("#infoClose").focus(); } }
      $("#infoBtn").addEventListener("click", function () { toggle(true); });
      $("#infoClose").addEventListener("click", function () { toggle(false); });
      $("#info").addEventListener("click", function (e) { if (e.target.id === "info") toggle(false); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("#info").hidden) toggle(false); });
    })();

    function press(el, val) { [].forEach.call(el.querySelectorAll("button"), function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === String(val))); }); }
    function sync() {
      var ch = CH[S.ci];
      [].forEach.call(elCh.children, function (b, i) { b.setAttribute("aria-current", i === S.ci ? "true" : "false"); });
      var cur = elCh.children[S.ci]; if (elCh.scrollWidth > elCh.clientWidth) elCh.scrollLeft = cur.offsetLeft - 60;
      $("#chNo").textContent = ch.no; $("#chTitle").textContent = ch.title; $("#chEn").textContent = ch.en;
      elVar.innerHTML = ch.v.map(function (v, i) { return '<button data-v="' + i + '" aria-pressed="' + (i === S.vi) + '">' + v.label + "</button>"; }).join("");
      elVar.hidden = ch.v.length < 2;
      $("#points").innerHTML = ch.pts.map(function (p) { return "<li>" + p + "</li>"; }).join("");
      $("#key").textContent = ch.key || "";
      var cv = ch.v[S.vi], lb = $("#light");
      lb.hidden = !cv.light;
      if (cv.light) { lb.dataset.light = cv.light; $("#ltTag").textContent = { go: "GO", alt: "ALT", stop: "STOP" }[cv.light]; $("#ltTitle").textContent = cv.lt; $("#ltWhen").textContent = cv.when; $("#ltWhy").textContent = cv.why; }
      var vb = $("#vidBox"); vb.hidden = !ch.vids;
      if (ch.vids) $("#vids").innerHTML = ch.vids.map(function (x) { var t = "<b>" + x[0] + "</b>" + x[1]; return "<li>" + (x[2] ? '<a href="' + x[2] + '" target="_blank" rel="noopener">' + t + "<em>▶ 在 YouTube 觀看</em></a>" : t) + "</li>"; }).join("");
      press($("#views"), S.view); press($("#speeds"), S.speed);
      elScrub.min = -0.6; elScrub.max = TL.dur.toFixed(2); elScrub.step = 0.01;
      $("#quizBtn").setAttribute("aria-pressed", String(Quiz.on()));
      elRec.textContent = Rec.on ? "■ 停止錄影" : "錄製短片"; elRec.classList.toggle("on", Rec.on);
      elPlay.textContent = S.playing ? "暫停" : (S.t >= TL.dur - 0.01 ? "重播" : "播放");
    }
    function tick(t, hit, faceDeg) {
      if (document.activeElement !== elScrub) elScrub.value = t;
      var cap = ""; TL.caps.forEach(function (c) { if (c.t <= t) cap = c.text; });
      if (cap !== lastCap) { elCap.textContent = cap; lastCap = cap; }
      /* technique card: the swing in progress, else the next one, else ready */
      var h = hit; if (!h) TL.hits.forEach(function (x) { if (!h && x.t > t) h = x; });
      var sw = h ? h.sw : SW.ready, key = h ? h.key + h.t : "ready";
      if (key !== lastHitKey) {
        lastHitKey = key;
        $("#swName").textContent = sw.name; $("#tGrip").textContent = sw.grip; $("#tFace").textContent = sw.face; $("#tPoint").textContent = sw.point; $("#tPath2").textContent = sw.pathTxt; $("#tSpin").textContent = sw.spinTxt;
        $("#tHeight").textContent = h ? (h.ball.y - BR).toFixed(2) + " m" : "—";
        $("#tOpen").textContent = h ? fmt(h.open * 180 / Math.PI) : "—";
      }
      /* live dial: face normal elevation */
      var a = faceDeg * Math.PI / 180, cx = 60, cy = 62, L = 34, nx = Math.cos(a), ny = -Math.sin(a);
      $("#dFace").setAttribute("x1", cx + ny * L); $("#dFace").setAttribute("y1", cy - nx * L); $("#dFace").setAttribute("x2", cx - ny * L); $("#dFace").setAttribute("y2", cy + nx * L);
      $("#dNorm").setAttribute("x2", cx + nx * 40); $("#dNorm").setAttribute("y2", cy + ny * 40);
      $("#dTxt").textContent = fmt(faceDeg);
      var near = false; TL.hits.forEach(function (x) { if (Math.abs(t - x.t) < 0.045) near = true; });
      elBadge.hidden = !near; if (near) elBadge.textContent = "擊球瞬間 · 拍面 " + fmt(faceDeg);
    }
    function fmt(d) { var r = Math.round(d); return (r > 3 ? "開放 +" : r < -3 ? "關閉 " : "垂直 ") + r + "°"; }
    return { sync: sync, tick: tick };
  })();

  /* keep place across republish */
  var hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(function () { return { ci: S.ci, vi: S.vi }; });
  function start(d) { (mascotGate || Promise.resolve()).then(function () { requestAnimationFrame(function () { requestAnimationFrame(function () { var l = $("#loading"); if (l) { l.classList.add("done"); setTimeout(function () { l.remove(); }, 600); } }); }); });
    var hsh = fromHash(); if (hsh) d = hsh;
    resize(); load(Math.min(CH.length - 1, (d && d.ci) || 0), 0); if (d && d.vi && CH[S.ci].v[d.vi]) load(S.ci, d.vi); requestAnimationFrame(frame); }
  window.__pb = { snap: function () { camSnap = true; wake(); }, update: function (dt) { update(dt); }, TL: function () { return TL; }, cam: cam, A: A, FX: FX, renderer: renderer, Quiz: Quiz, Rec: Rec, S: S, load: load, Snd: Snd };
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
})();
