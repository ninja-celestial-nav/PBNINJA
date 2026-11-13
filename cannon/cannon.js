/* Cannon mode: a ball machine on your side of the court, one sculpted ninja across the net. Put any face on him
   (the photo is read in the browser and never leaves the device), tap to fire, and keep at it until he gives up. */
(function () {
  "use strict";
  var V3 = THREE.Vector3, $ = function (s) { return document.querySelector(s); };
  function col(h) { return new THREE.Color(h).convertSRGBToLinear(); }
  var canvas = $("#c"), renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.62;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  var scene = new THREE.Scene(); scene.background = col(0x071E3D); scene.fog = new THREE.Fog(col(0x071E3D), 22, 60);
  var cam = new THREE.PerspectiveCamera(55, 1, 0.05, 120);

  /* lights: night session under floodlights */
  scene.add(new THREE.HemisphereLight(col(0xbcd4ff), col(0x0b2a3a), 1.1));
  var key = new THREE.DirectionalLight(col(0xffffff), 2.4); key.position.set(4, 9, 5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); var sc = key.shadow.camera; sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -5; sc.near = 1; sc.far = 25; key.shadow.bias = -0.0005;
  scene.add(key); key.target.position.set(0, 0, -3); scene.add(key.target);
  var fill = new THREE.DirectionalLight(col(0x9fc4ff), 0.8); fill.position.set(-5, 4, -6); scene.add(fill);

  /* court: 6.1 m x 13.4 m, kitchen 2.13 m each side of the net */
  function box(w, h, d, c, x, y, z, rough) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: col(c), roughness: rough || 0.85 })); m.position.set(x, y, z); scene.add(m); return m; }
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 50), new THREE.MeshStandardMaterial({ color: col(0x1d6b5c), roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  function slab(w, d, z, c, y) { var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.9 })); m.rotation.x = -Math.PI / 2; m.position.set(0, y, z); m.receiveShadow = true; scene.add(m); }
  slab(6.1, 13.4, 0, 0x2f7fd6, 0.003); slab(6.1, 4.26, 0, 0x55cfa0, 0.0045);
  function line(w, d, x, z) { var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0xf3f7fb })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.006, z); scene.add(m); }
  [-6.7, -2.13, 2.13, 6.7].forEach(function (z) { line(6.1, 0.05, 0, z); }); line(0.05, 13.4, -3.05, 0); line(0.05, 13.4, 3.05, 0); line(0.05, 4.57, 0, -4.415); line(0.05, 4.57, 0, 4.415);
  /* net */
  var netT = (function () { var c = document.createElement("canvas"); c.width = 256; c.height = 64; var x = c.getContext("2d"); x.strokeStyle = "rgba(230,240,255,.55)"; x.lineWidth = 1;
    for (var i = 0; i <= 256; i += 6) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 64); x.stroke(); } for (var j = 0; j <= 64; j += 6) { x.beginPath(); x.moveTo(0, j); x.lineTo(256, j); x.stroke(); }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 1); return t; })();
  var net = new THREE.Mesh(new THREE.PlaneGeometry(6.7, 0.86), new THREE.MeshBasicMaterial({ map: netT, transparent: true, side: THREE.DoubleSide, depthWrite: false })); net.position.set(0, 0.45, 0); scene.add(net);
  box(6.7, 0.06, 0.03, 0xf3f7fb, 0, 0.9, 0); box(0.07, 0.95, 0.07, 0x1b2430, -3.35, 0.47, 0); box(0.07, 0.95, 0.07, 0x1b2430, 3.35, 0.47, 0);
  /* back fence and floodlights for depth */
  box(16, 3.2, 0.05, 0x0d2440, 0, 1.6, -9.5); box(16, 0.18, 0.06, 0xE4F23F, 0, 2.2, -9.46);
  [-6, 6].forEach(function (x) { box(0.12, 7, 0.12, 0x1b2430, x, 3.5, -9.2); var s = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 10), new THREE.MeshBasicMaterial({ color: 0xfff6d8 })); s.position.set(x, 7, -9.1); scene.add(s); });

  /* the ball machine on our side */
  var machine = new THREE.Group(); scene.add(machine); machine.position.set(0, 0, 5.6); machine.scale.setScalar(0.8);
  var mBody = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.6), new THREE.MeshStandardMaterial({ color: col(0x1c2a47), roughness: 0.5, metalness: 0.2 })); mBody.position.y = 0.42; mBody.castShadow = true; machine.add(mBody);
  var hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.18, 0.32, 18, 1, true), new THREE.MeshStandardMaterial({ color: col(0xE4F23F), roughness: 0.5, side: THREE.DoubleSide })); hopper.position.y = 0.8; machine.add(hopper);
  var barrel = new THREE.Group(); barrel.position.set(0, 0.62, -0.25); machine.add(barrel);
  var tube = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.5, 18), new THREE.MeshStandardMaterial({ color: col(0x2e302d), roughness: 0.4, metalness: 0.4 })); tube.rotation.x = Math.PI / 2; tube.position.z = -0.2; barrel.add(tube);
  [-0.22, 0.22].forEach(function (x) { var w = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16), new THREE.MeshStandardMaterial({ color: col(0x111111), roughness: 0.8 })); w.rotation.z = Math.PI / 2; w.position.set(x, 0.11, 0.18); machine.add(w); });

  /* the opponent */
  var paddleG = new THREE.Group(), pm = new THREE.MeshStandardMaterial({ color: col(0x3c3e3a), roughness: 0.6 });
  var ph = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.29, 0.016), pm); ph.position.y = 0.01; ph.castShadow = true; paddleG.add(ph);
  var pg = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.13, 8), new THREE.MeshStandardMaterial({ color: col(0x8f918a), roughness: 0.9 })); pg.position.y = -0.2; paddleG.add(pg);
  var rig = NinjaRig.create(THREE, scene, { col: col, cloth: 0xd9472f, shade: 0x8f2a1a, accent: 0x0b1e3b, paddle: paddleG });
  var skel = null, faceG = new THREE.Group(); faceG.matrixAutoUpdate = false; scene.add(faceG);

  /* face sticker: a round photo with a white rim, on the head bone, in front of the sculpted face */
  var FACE_C = new V3(0, 1.25, -0.44), FACE_R = 0.24;
  var faceMat = new THREE.MeshStandardMaterial({ roughness: 0.6, transparent: true }), rimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  var face = new THREE.Group(); face.position.copy(FACE_C); face.rotation.y = Math.PI; face.visible = false; faceG.add(face);
  var disc = new THREE.Mesh(new THREE.CircleGeometry(FACE_R, 48), faceMat); disc.position.z = 0.002; face.add(disc);
  var rim = new THREE.Mesh(new THREE.RingGeometry(FACE_R, FACE_R + 0.018, 48), rimMat); face.add(rim);
  var tearMat = new THREE.MeshBasicMaterial({ color: 0x8fe3ff, transparent: true, opacity: 0.9 });

  function setPhoto(img) {
    var c = document.createElement("canvas"), S = 512; c.width = c.height = S; var x = c.getContext("2d");
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, s = Math.min(w, h);
    x.save(); x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); x.clip();
    /* centre crop, nudged up a little since faces sit high in most portraits */
    x.drawImage(img, (w - s) / 2, Math.max(0, (h - s) / 2 - s * 0.08), s, s, 0, 0, S, S); x.restore();
    if (faceMat.map) faceMat.map.dispose();
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; faceMat.map = t; faceMat.needsUpdate = true; face.visible = true;
  }
  $("#file").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    var url = URL.createObjectURL(f), img = new Image();
    img.onload = function () { setPhoto(img); URL.revokeObjectURL(url); };
    img.src = url; e.target.value = "";
  });
  $("#clear").addEventListener("click", function () { face.visible = false; });

  /* opponent movement: shuffles to a new spot every second or two, faster as he gets angrier */
  var opp = { x: 0, z: -2.5, tx: 0, next: 0, vel: new V3(), gait: 0, react: 0, hits: 0, faces: 0, pain: 0, done: false, doneT: 0, bubble: null, bubbleT: 0 };
  var LINES = ["啊！", "好痛！", "不要打臉！", "饒了我吧～", "我錯了！", "嗚嗚嗚…", "住手！！", "我投降…", "救命啊！", "臉好腫…"];
  function bubble(txt) {
    if (opp.bubble) { opp.bubble.parent.remove(opp.bubble); opp.bubble.material.map.dispose(); }
    var c = document.createElement("canvas"); c.width = 512; c.height = 160; var x = c.getContext("2d");
    x.fillStyle = "#fff"; x.strokeStyle = "#071E3D"; x.lineWidth = 8; x.beginPath(); x.roundRect ? x.roundRect(8, 8, 496, 120, 40) : x.rect(8, 8, 496, 120); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(230, 124); x.lineTo(256, 156); x.lineTo(282, 124); x.fill();
    x.fillStyle = "#d9472f"; x.font = "900 68px 'Noto Sans TC','PingFang TC',sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(txt, 256, 70);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(1.2, 0.375, 1); s.renderOrder = 10; scene.add(s);
    opp.bubble = s; opp.bubbleT = 1.4;
  }

  /* balls */
  var G = -9.81, BR = 0.037, balls = [], ballGeo = new THREE.SphereGeometry(BR, 16, 12), ballMat = new THREE.MeshStandardMaterial({ color: col(0xE4F23F), roughness: 0.8, emissive: col(0xE4F23F), emissiveIntensity: 0.25 });
  var tears = [];
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), aimPlane = new THREE.Plane(new V3(0, 0, 1), 3.2);
  function fire(cx, cy) {
    var r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam); aimPlane.constant = -opp.z;
    var aim = new V3(); if (!ray.ray.intersectPlane(aimPlane, aim)) return;
    aim.y = Math.max(0.15, Math.min(2.4, aim.y));
    var S = new V3(0, 0.5, 5.2), T = 0.6, v = aim.clone().sub(S).multiplyScalar(1 / T); v.y -= 0.5 * G * T;
    var m = new THREE.Mesh(ballGeo, ballMat); m.castShadow = true; m.position.copy(S); scene.add(m);
    balls.push({ m: m, v: v, age: 0, hit: false });
    if (balls.length > 24) { var o = balls.shift(); scene.remove(o.m); }
    barrel.lookAt(barrel.localToWorld(new V3()).add(v)); barrel.rotateY(Math.PI); recoil = 1; snd("pop");
  }
  var recoil = 0;
  var down = null;
  canvas.addEventListener("pointerdown", function (e) { down = [e.clientX, e.clientY]; ensureAudio(); });
  canvas.addEventListener("pointerup", function (e) { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 12 && !opp.done) fire(e.clientX, e.clientY); down = null; });

  /* tiny synth sounds */
  var AC = null;
  function ensureAudio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === "suspended") AC.resume(); }
  function snd(kind) {
    if (!AC) return; var t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.connect(g); g.connect(AC.destination);
    if (kind === "pop") { o.type = "triangle"; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.08); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1); o.start(t); o.stop(t + 0.11); }
    else if (kind === "hit") { o.type = "square"; o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.18); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.start(t); o.stop(t + 0.21); }
    else { o.type = "sawtooth"; o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(260, t + 0.5); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55); o.start(t); o.stop(t + 0.56); }
  }

  function hud() {
    $("#hits").textContent = opp.hits; $("#faces").textContent = opp.faces;
    var p = Math.min(100, Math.round(opp.pain)); $("#pct").textContent = p + "%"; $("#meter i").style.width = p + "%";
  }
  function surrender() {
    opp.done = true; opp.doneT = 0; bubble("我投降！別打了！"); snd("wail");
    $("#winTxt").textContent = "命中 " + opp.hits + " 球，其中打臉 " + opp.faces + " 球"; $("#win").hidden = false; $("#hint").hidden = true;
  }
  $("#again").addEventListener("click", function () { opp.hits = opp.faces = 0; opp.pain = 0; opp.done = false; $("#win").hidden = true; $("#hint").hidden = false; hud(); });

  /* ---------- frame ---------- */
  var clock = 0, last = performance.now(), _p = new V3(), _q = new THREE.Quaternion(), headPos = new V3(), facePos = new V3();
  function resize() { var w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < h ? 62 : 40; cam.updateProjectionMatrix(); }
  addEventListener("resize", resize); resize();

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    /* move */
    var speed = opp.done ? 0 : 1.2 + opp.pain / 60;
    if (!opp.done && clock > opp.next) { opp.tx = (Math.random() * 2 - 1) * 2.3; opp.next = clock + 0.9 + Math.random() * 1.3 - opp.pain / 200; }
    var dx = opp.tx - opp.x, step = Math.sign(dx) * Math.min(Math.abs(dx), speed * dt); opp.x += step;
    opp.vel.set(step / (dt || 1e-3), 0, 0); opp.gait += Math.abs(step);
    opp.react = Math.max(0, opp.react - dt * 1.8);
    var root = new V3(opp.x, 0, opp.z), yaw = Math.PI, f = new V3(0, 0, 1), r = new V3(-1, 0, 0);
    var hand, hold = false, ballP;
    var near = null, nd = 1e9; balls.forEach(function (b) { if (!b.hit && b.v.z < 0) { var d = b.m.position.distanceTo(root); if (d < nd) { nd = d; near = b; } } });
    ballP = near ? near.m.position.clone() : new V3(0, 1.0, 4.8);
    if (opp.done) {                                             /* both arms up */
      var u = Math.min(1, opp.doneT / 0.4); opp.doneT += dt;
      hand = root.clone().addScaledVector(r, 0.28).addScaledVector(f, 0.1); hand.y = 0.9 + 0.95 * u;
      hold = true; ballP = root.clone().addScaledVector(r, -0.28).addScaledVector(f, 0.1); ballP.y = 0.95 + 0.95 * u;
    } else if (opp.react > 0) {                                 /* hands up to cover the face */
      var k = Math.min(1, opp.react * 1.6);
      hand = root.clone().addScaledVector(f, 0.32 - 0.12 * k).addScaledVector(r, 0.18 - 0.14 * k); hand.y = 0.85 + 0.35 * k;
      hold = k > 0.4; if (hold) { ballP = root.clone().addScaledVector(f, 0.2).addScaledVector(r, -0.06); ballP.y = 1.18; }
    } else { hand = root.clone().addScaledVector(f, 0.32).addScaledVector(r, 0.18); hand.y = 0.85; }
    _q.setFromAxisAngle(new V3(1, 0, 0), -0.2);
    rig.update({ root: root, yaw: yaw, vel: opp.vel, gait: opp.gait, t: clock, hand: hand, pPos: hand.clone().add(new V3(0, 0.25, 0).applyQuaternion(_q)), pQ: _q,
      w: opp.react > 0 ? 0.9 : 0, bh: false, ball: ballP, hold: hold, hop: opp.react > 0.45 ? 0.05 * Math.sin(opp.react * 20) : 0, split: 0 });
    if (skel) {
      faceG.matrix.multiplyMatrices(skel.bones[2].matrixWorld, skel.boneInverses[2]); faceG.matrixWorldNeedsUpdate = true; faceG.updateMatrixWorld(true);
      headPos.setFromMatrixPosition(skel.bones[2].matrixWorld); facePos.copy(FACE_C).applyMatrix4(faceG.matrixWorld);
      /* the sticker squashes on a hit and springs back */
      var sq = opp.react > 0.7 ? Math.sin((1 - opp.react) * 30) * opp.react * 0.25 : 0; face.scale.set(1 + sq, 1 - sq, 1);
      rimMat.color.setRGB(1, 1 - opp.react * 0.7, 1 - opp.react * 0.7);
    }
    /* balls */
    for (var i = balls.length - 1; i >= 0; i--) {
      var b = balls[i]; b.age += dt; b.v.y += G * dt; b.m.position.addScaledVector(b.v, dt);
      var p = b.m.position;
      if (p.y < BR) { p.y = BR; b.v.y = -b.v.y * 0.62; b.v.x *= 0.85; b.v.z *= 0.85; }
      if (Math.abs(p.z) < 0.04 && p.y < 0.9 && b.v.z < 0) { b.v.z = -b.v.z * 0.25; b.v.x *= 0.5; }      /* net */
      if (!b.hit && skel && !opp.done) {
        var dHead = p.distanceTo(headPos), J = rig.J;
        _p.copy(J.hipC).lerp(J.waist, 0.5);
        var dBody = Math.hypot(p.x - J.hipC.x, p.z - J.hipC.z), inBody = dBody < 0.3 && p.y > 0.1 && p.y < J.hd.y - 0.2;
        if (dHead < 0.42 || inBody) {
          b.hit = true; var faceHit = dHead < 0.42;
          b.v.set((Math.random() - 0.5) * 3, 2.5 + Math.random() * 1.5, 3 + Math.random() * 2);
          opp.hits++; if (faceHit) opp.faces++; opp.pain += faceHit ? 12 : 6; opp.react = 1; snd("hit");
          bubble(LINES[(Math.random() * LINES.length) | 0]);
          if (faceHit) for (var k2 = 0; k2 < 6; k2++) { var tm = new THREE.Mesh(ballGeo, tearMat); tm.scale.setScalar(0.4); tm.position.copy(facePos).add(new V3((k2 % 2 ? 1 : -1) * 0.1, 0.02, 0.05)); scene.add(tm); tears.push({ m: tm, v: new V3((k2 % 2 ? 1 : -1) * (0.6 + Math.random()), 1 + Math.random(), 0.8 + Math.random() * 0.6), age: 0 }); }
          hud(); if (opp.pain >= 100) surrender();
        }
      }
      if (b.age > 4) { scene.remove(b.m); balls.splice(i, 1); }
    }
    for (var j = tears.length - 1; j >= 0; j--) { var tr = tears[j]; tr.age += dt; tr.v.y += G * 0.6 * dt; tr.m.position.addScaledVector(tr.v, dt); if (tr.age > 0.9 || tr.m.position.y < 0) { scene.remove(tr.m); tears.splice(j, 1); } }
    if (opp.bubble) { opp.bubbleT -= dt; opp.bubble.position.set(rig.J.hd.x, rig.J.hd.y + 0.6, rig.J.hd.z); if (opp.bubbleT <= 0 && !opp.done) { scene.remove(opp.bubble); opp.bubble.material.map.dispose(); opp.bubble = null; } }
    recoil = Math.max(0, recoil - dt * 6); tube.position.z = -0.2 + recoil * 0.08;
    /* camera behind and above the machine */
    if (cam.aspect < 1) { cam.position.set(opp.x * 0.12, 1.9, 6.3); cam.lookAt(opp.x * 0.4, 0.55, -2.5); } else { cam.position.set(opp.x * 0.12, 2.15, 7.4); cam.lookAt(opp.x * 0.35, 0.75, -2.5); }
    renderer.render(scene, cam);
    requestAnimationFrame(frame);
  }

  NinjaMascot.load(THREE, function (m) {
    if (!m) { $("#hint").textContent = "角色載入失敗，請重新整理頁面"; return; }
    var a = NinjaMascot.attach(rig, "opp"); skel = a.skeleton;
  });
  requestAnimationFrame(frame);
  window.__cannon = { surrender: surrender, opp: opp, rig: rig, fire: fire, setPhoto: setPhoto, cam: cam };
})();
