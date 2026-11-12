/* NinjaRig: a jointed little ninja. Every frame the whole body is solved from where the paddle hand has to be:
   hips sink and shift, the trunk coils and leans, both arms and both legs are two-bone IK chains, the feet step
   or set a stance, and the head tracks the ball. Local "front" of every part is -z. */
(function (root) {
  "use strict";
  var HIP = 0.55, TH = 0.27, SH = 0.27, ANK = 0.06, UA = 0.23, FA = 0.22, TORSO = 0.38, SHO = 0.2, GAIT = 0.2;

  function create(THREE, scene, o) {
    var V3 = THREE.Vector3, UP = new V3(0, 1, 0), col = o.col;
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
    function basis(yaw) { return { r: new V3(Math.cos(yaw), 0, -Math.sin(yaw)), f: new V3(-Math.sin(yaw), 0, -Math.cos(yaw)) }; }
    function angDiff(a, b) { var d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
    var cloth = new THREE.MeshStandardMaterial({ color: col(o.cloth), roughness: 0.78 });
    var shade = new THREE.MeshStandardMaterial({ color: col(o.shade), roughness: 0.7 });
    var accent = new THREE.MeshStandardMaterial({ color: col(o.accent), roughness: 0.55 });
    var skin = new THREE.MeshStandardMaterial({ color: col(0xf2c9a4), roughness: 0.7 });
    var dark = new THREE.MeshStandardMaterial({ color: col(0x0a1220), roughness: 0.5 });
    var white = new THREE.MeshStandardMaterial({ color: col(0xffffff), roughness: 0.35 });
    var g = new THREE.Group(); scene.add(g);
    var body = new THREE.Group(), upper = new THREE.Group(); g.add(body); g.add(upper);   /* upper = what first person hides */
    var sph = new THREE.SphereGeometry(1, 24, 16);
    function mesh(geo, mat, parent, sx, sy, sz) { var m = new THREE.Mesh(geo, mat); if (sx) m.scale.set(sx, sy, sz); m.castShadow = true; (parent || body).add(m); return m; }
    function bone(r0, r1, mat, parent) { var geo = new THREE.CylinderGeometry(r1, r0, 1, 14); geo.translate(0, 0.5, 0); return mesh(geo, mat, parent); }
    function band(m, r, y0, y1, mat) { var geo = new THREE.CylinderGeometry(r, r, y1 - y0, 14); geo.translate(0, (y0 + y1) / 2, 0); var b = new THREE.Mesh(geo, mat); b.castShadow = true; m.add(b); }
    function ball(r, mat, parent) { return mesh(sph, mat, parent, r, r, r); }
    function put(m, A, B) { var d = B.clone().sub(A), len = d.length(); m.position.copy(A); m.scale.set(1, len, 1); m.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / len)); }
    function lathe(pts, sz) { var geo = new THREE.LatheGeometry(pts.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 24); geo.scale(1, 1, sz); return geo; }

    /* round, soft, slightly clueless: big hooded head, bean body, stubby limbs, mitten hands */
    var blush = new THREE.MeshStandardMaterial({ color: col(0xff9d8a), roughness: 0.9 });
    var L = {}, R = {};
    [L, R].forEach(function (s) {
      s.thigh = bone(0.092, 0.082, cloth); s.knee = ball(0.083, cloth);
      s.shin = bone(0.082, 0.07, cloth); band(s.shin, 0.078, 0.72, 0.98, accent);
      s.foot = new THREE.Group(); body.add(s.foot);
      mesh(sph, dark, s.foot, 0.082, 0.062, 0.115).position.set(0, -0.005, -0.035);
      s.sho = ball(0.085, cloth, s === R ? body : upper);
      s.up = bone(0.078, 0.07, cloth); s.elb = ball(0.071, cloth);
      s.fore = bone(0.07, 0.062, cloth); band(s.fore, 0.068, 0.7, 0.98, accent);
      s.hand = mesh(sph, skin, null, 0.066, 0.066, 0.066);
    });
    var pelvis = new THREE.Group(); body.add(pelvis);
    mesh(lathe([[0.001, -0.15], [0.1, -0.135], [0.175, -0.06], [0.2, 0.03], [0.19, 0.1]], 0.86), cloth, pelvis);
    var sashG = new THREE.Group(); sashG.scale.set(1, 1, 0.86); sashG.position.y = 0.075; pelvis.add(sashG);
    var sash = mesh(new THREE.TorusGeometry(0.192, 0.03, 10, 30), accent, sashG); sash.rotation.x = Math.PI / 2;
    ball(0.042, accent, pelvis).position.set(-0.08, 0.075, -0.168);
    var sashTails = new THREE.Group(); sashTails.position.set(-0.08, 0.05, -0.175); pelvis.add(sashTails);
    [-1, 1].forEach(function (s) { var t = mesh(sph, accent, sashTails, 0.022, 0.07, 0.012); t.position.set(0.02 * s, -0.06, 0); t.rotation.z = 0.2 * s; });
    var chest = new THREE.Group(); upper.add(chest);
    mesh(lathe([[0.185, -0.03], [0.2, 0.06], [0.19, 0.16], [0.15, 0.25], [0.08, 0.3], [0.001, 0.31]], 0.86), cloth, chest);
    var scarfG = new THREE.Group(); scarfG.position.y = 0.285; scarfG.scale.set(1, 1, 0.9); chest.add(scarfG);
    mesh(new THREE.TorusGeometry(0.115, 0.05, 10, 24), accent, scarfG).rotation.x = Math.PI / 2;
    var head = new THREE.Group(); upper.add(head);
    mesh(sph, cloth, head, 0.31, 0.29, 0.3);
    var face = mesh(sph, skin, head, 0.2, 0.125, 0.07); face.position.set(0, -0.03, -0.245); face.castShadow = false;
    [-1, 1].forEach(function (s) {
      var eye = mesh(sph, dark, head, 0.034, 0.046, 0.02); eye.position.set(0.085 * s, -0.02, -0.31); eye.castShadow = false;
      var hi = mesh(sph, new THREE.MeshBasicMaterial({ color: 0xffffff }), head, 0.012, 0.014, 0.008); hi.position.set(0.094 * s - 0.004, -0.004, -0.328); hi.castShadow = false;
      var ck = mesh(sph, blush, head, 0.034, 0.02, 0.012); ck.position.set(0.15 * s, -0.075, -0.285); ck.castShadow = false;
    });
    var mouth = mesh(sph, dark, head, 0.014, 0.008, 0.008); mouth.position.set(0, -0.085, -0.312); mouth.castShadow = false;
    var hb = mesh(new THREE.TorusGeometry(0.297, 0.03, 10, 36), accent, head); hb.rotation.x = Math.PI / 2 - 0.06; hb.position.y = 0.105; hb.scale.set(1.03, 1, 1);
    ball(0.05, accent, head).position.set(0, 0.125, 0.3);
    var tails = new THREE.Group(); tails.position.set(0, 0.125, 0.31); head.add(tails);
    [-1, 1].forEach(function (s) { var t = mesh(sph, accent, tails, 0.03, 0.012, 0.1); t.position.set(0.035 * s, 0, 0.1); t.rotation.y = 0.25 * s; });
    var tag = new THREE.Group(); g.add(tag);
    var paddle = o.paddle; g.add(paddle);

    function ik(S, T, a, b, pole) {
      var d = T.clone().sub(S), len = d.length(), Lc = clamp(len, Math.abs(a - b) + 0.01, (a + b) * 0.999), dir = d.multiplyScalar(1 / (len || 1));
      var ca = clamp((a * a + Lc * Lc - b * b) / (2 * a * Lc), -1, 1), perp = pole.clone().addScaledVector(dir, -pole.dot(dir));
      if (perp.lengthSq() < 1e-6) perp.set(0, 0, 1); perp.normalize();
      return { mid: S.clone().addScaledVector(dir, a * ca).addScaledVector(perp, a * Math.sqrt(1 - ca * ca)), end: S.clone().addScaledVector(dir, Lc) };
    }

    var rig = { group: g, tag: tag, paddle: paddle, eye: new V3(0, 1.45, 0) };
    rig.setFP = function (on) { upper.visible = !on; };
    /* p: root (V3 on the floor), yaw, vel (V3), gait (metres run), t, hand (V3 grip), pPos, pQ, w (0..1 swing), bh, ball (V3), hold, hop, split */
    rig.update = function (p) {
      var b = basis(p.yaw), m = p.bh ? -1 : 1, w = p.w, speed = p.vel.length(), k = clamp(speed / 1.6, 0, 1), gph = p.gait / GAIT;
      var rel = p.hand.clone().sub(p.root), lx = rel.dot(b.r), lz = rel.dot(b.f), hy = p.hand.y;
      /* trunk rotation follows the hand around the body: coil on the backswing, uncoil through contact */
      var twist = clamp((Math.atan2(lx * m, lz) - 0.35) * 0.6, -0.65, 1.0) * m * (0.3 + 0.7 * w);
      var low = clamp((1.0 - hy) / 0.7, 0, 1) * w;
      var chestYaw = p.yaw - twist, hipYaw = p.yaw - twist * 0.4, cb = basis(chestYaw), hbz = basis(hipYaw);
      var hipC = p.root.clone().addScaledVector(b.f, clamp(lz - 0.35, -0.3, 0.4) * 0.32 * w).addScaledVector(b.r, clamp(lx - 0.25 * m, -0.35, 0.35) * 0.3 * w);
      hipC.y = HIP - 0.02 - 0.2 * low - 0.06 * p.split * (1 - k) - 0.03 * k + Math.abs(Math.sin(gph)) * 0.035 * k + p.hop;
      var dir = UP.clone().addScaledVector(hbz.f, Math.tan(0.07 + 0.4 * low + 0.17 * k)).addScaledVector(b.r, clamp(lx, -0.5, 0.6) * 0.2 * w).normalize();
      /* feet: a stance that opens with the trunk, or a running gait */
      var half = 0.15 + 0.08 * low + 0.06 * p.split, st = 0.18 * twist, vdir = speed > 0.05 ? p.vel.clone().multiplyScalar(1 / speed) : b.f;
      var feet = [-1, 1].map(function (s) {
        var stance = p.root.clone().addScaledVector(hbz.r, s * half).addScaledVector(b.f, -s * st + (s * m < 0 ? 0.5 : 0.15) * clamp(lz - 0.35, -0.3, 0.4) * w);
        var run = p.root.clone().addScaledVector(hbz.r, s * 0.1).addScaledVector(vdir, -s * Math.sin(gph) * GAIT * 0.9);
        var f = stance.lerp(run, k); f.y = ANK + Math.max(0, -s * Math.cos(gph)) * 0.13 * k + p.hop; return f;
      });
      function build() {
        var neck = hipC.clone().addScaledVector(dir, TORSO), xr = cb.r.clone().addScaledVector(dir, -cb.r.dot(dir)).normalize();
        return { neck: neck, xr: xr, sR: neck.clone().addScaledVector(dir, -0.11).addScaledVector(xr, SHO), sL: neck.clone().addScaledVector(dir, -0.11).addScaledVector(xr, -SHO) };
      }
      var T = build(), d = p.hand.clone().sub(T.sR), ex = d.length() - (UA + FA) * 0.97;
      if (ex > 0) { hipC.addScaledVector(d.normalize(), Math.min(ex, 0.45)); T = build(); }             /* reach with the body, not just the arm */
      var hj = [-1, 1].map(function (s) { return hipC.clone().addScaledVector(hbz.r, s * 0.1).addScaledVector(UP, -0.07); });
      var over = 0; hj.forEach(function (h, i) { var f = feet[i], hd = Math.hypot(h.x - f.x, h.z - f.z), maxY = f.y + Math.sqrt(Math.max(0.02, Math.pow((TH + SH) * 0.992, 2) - hd * hd)); over = Math.max(over, h.y - maxY); });
      if (over > 0) { if (ex > 0 && d.y > 0.5) feet.forEach(function (f) { f.y += over; }); else { hipC.y -= over; hj.forEach(function (h) { h.y -= over; }); T = build(); } }
      /* place the trunk */
      pelvis.position.copy(hipC); pelvis.rotation.set(0, hipYaw, 0);
      var waist = hipC.clone().addScaledVector(dir, 0.07), Z = new V3().crossVectors(T.xr, dir);
      chest.position.copy(waist); chest.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(T.xr, dir, Z));
      sashTails.rotation.x = 0.15 + 0.5 * k + Math.sin(p.t * 7) * 0.08;
      /* legs */
      [L, R].forEach(function (s, i) {
        var kn = ik(hj[i], feet[i], TH, SH, hbz.f.clone().addScaledVector(hbz.r, (i ? 1 : -1) * 0.3));
        put(s.thigh, hj[i], kn.mid); s.knee.position.copy(kn.mid); put(s.shin, kn.mid, kn.end);
        s.foot.position.copy(kn.end); s.foot.rotation.set(0, hipYaw + (i ? -1 : 1) * 0.16 * (1 - k), 0);
      });
      /* paddle arm */
      function arm(s, S, target, pole) {
        var dist = target.distanceTo(S), sc = Math.max(1, dist / ((UA + FA) * 0.998)), e = ik(S, target, UA * sc, FA * sc, pole);
        s.sho.position.copy(S); put(s.up, S, e.mid); s.elb.position.copy(e.mid); put(s.fore, e.mid, e.end); s.hand.position.copy(e.end);
      }
      var hi = clamp((p.hand.y - T.sR.y + 0.05) / 0.3, 0, 1);
      arm(R, T.sR, p.hand, new V3().addScaledVector(UP, -0.9 + 0.7 * hi).addScaledVector(T.xr, 0.5 + 0.4 * hi).addScaledVector(cb.f, -0.35));
      /* free arm: holds the ball for the serve, points and counter-balances on the swing, pumps when running */
      var tw = twist * m, lt;
      if (p.hold) lt = p.ball.clone().addScaledVector(UP, -0.06);
      else lt = T.sL.clone().addScaledVector(cb.f, 0.2 + 0.24 * Math.max(0, tw) - Math.sin(gph) * 0.16 * k).addScaledVector(UP, -0.2 + 0.26 * Math.max(0, tw) + 0.05 * k)
        .addScaledVector(T.xr, 0.02 + 0.2 * Math.max(0, -tw) - 0.06 * Math.max(0, tw));
      arm(L, T.sL, lt, new V3().addScaledVector(UP, -0.9).addScaledVector(T.xr, -0.5).addScaledVector(cb.f, -0.35));
      /* head: stays level and watches the ball */
      var hd = T.neck.clone().addScaledVector(dir.clone().add(UP).normalize(), 0.24), look = p.ball.clone().sub(hd), ll = look.length() || 1;
      var want = Math.atan2(-look.x, -look.z);
      head.position.copy(hd); head.rotation.order = "YXZ";
      head.rotation.set(clamp(Math.asin(clamp(look.y / ll, -1, 1)), -0.55, 0.5), chestYaw + clamp(angDiff(chestYaw, want), -1.0, 1.0), 0);
      tails.rotation.x = 0.55 + Math.sin(p.t * 8) * 0.12 - k * 0.45; tails.rotation.y = Math.sin(p.t * 5.3) * 0.2;
      paddle.position.copy(p.pPos); paddle.quaternion.copy(p.pQ);
      tag.position.set(hd.x, hd.y + 0.5, hd.z);
      rig.eye.copy(hd).addScaledVector(UP, 0.22);
      return rig;
    };
    return rig;
  }
  root.NinjaRig = { create: create };
})(window);
