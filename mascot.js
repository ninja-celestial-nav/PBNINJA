/* NinjaMascot: the sculpted ninja (models/ninja-mascot.glb) skinned onto NinjaRig.
   The GLB is one static mesh with no skeleton. Bones and weights are built here from joint positions measured
   on the model; every frame each bone takes the swing that carries its bind direction onto the segment the rig
   just solved, so the same footwork, strokes and head tracking drive the sculpt. Team colours are a texture
   recolour (cloth and trim swapped, skin, eyes and soles kept). */
(function (root) {
  "use strict";
  var URL = "/models/ninja-mascot.glb", K = 1.5;          /* model height in metres */
  /* bind joints in metres: feet on the floor, front -z, the paddle (right) side at +x */
  var B = {
    hipC: [0, 0.315, 0], waist: [0, 0.375, 0], hd: [0, 1.11, 0],
    leg: [[0.13, 0.255, 0], [0.13, 0.18, 0], [0.15, 0.105, 0]],
    arm: [[0.30, 0.645, 0], [0.42, 0.555, 0], [0.525, 0.51, 0]]
  };
  /* rig proportions for this body: own trunk and head, legs and arms a little longer than the sculpt so the
     strokes still reach the contact points the ball flights were solved for */
  var PROP = { HIP: 0.38, TH: 0.1, SH: 0.1, ANK: 0.105, UA: 0.205, FA: 0.185, TORSO: 0.465, SHO: 0.3, SHD: 0.135, HJX: 0.13, HJY: 0.06, WST: 0.06, HEAD: 0.33, EYE: 0.2, GAIT: 0.13, JUMP: 1.75 };
  /* bone order */
  var PELVIS = 0, CHEST = 1, HEAD = 2, LEG = [3, 6], ARM = [9, 12], N = 15;

  var THREE, base = null, waiting = [];
  function load(T, cb) {
    THREE = T;
    if (base) return cb(base);
    waiting.push(cb); if (waiting.length > 1) return;
    new THREE.GLTFLoader().load(URL, function (g) {
      var src = null; g.scene.traverse(function (o) { if (o.isMesh && !src) src = o; });
      var geo = src.geometry.clone();
      geo.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI));        /* model faces +z; the rig's front is -z */
      geo.computeBoundingBox(); var bb = geo.boundingBox, k = K / (bb.max.y - bb.min.y);
      geo.translate(0, -bb.min.y, 0); geo.scale(k, k, k);
      geo.deleteAttribute("normal"); geo.computeVertexNormals();
      skinWeights(geo);
      base = { geo: geo, armIndex: armOnly(geo), img: src.material.map.image, mats: {} };
      waiting.forEach(function (f) { f(base); }); waiting = [];
    });
  }

  function ss(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  /* region weights: head over the neck, arms outboard of the flanks, legs under the hem, trunk split at the belt */
  function skinWeights(geo) {
    var pos = geo.attributes.position, n = pos.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), acc = new Float32Array(N);
    for (var v = 0; v < n; v++) {
      var x = pos.getX(v), y = pos.getY(v), ax = Math.abs(x), side = x < 0 ? 0 : 1;
      acc.fill(0);
      var head = ss(0.74, 0.83, y), body = 1 - head; acc[HEAD] += head;
      var arm = body * ss(0.29, 0.345, ax) * (y > 0.33 ? 1 : 0), A = ARM[side];
      var fore = ss(0.38, 0.44, ax), hand = ss(0.47, 0.5, ax);
      acc[A] += arm * (1 - fore); acc[A + 1] += arm * fore * (1 - hand); acc[A + 2] += arm * fore * hand;
      var rest = body - arm, leg = rest * (1 - ss(0.25, 0.31, y)), trunk = rest - leg;
      var sR = ss(-0.035, 0.035, x);
      [0, 1].forEach(function (s) {
        var w = leg * (s ? sR : 1 - sR), L = LEG[s], foot = 1 - ss(0.1, 0.14, y), thigh = ss(0.17, 0.22, y);
        acc[L] += w * thigh * (1 - foot); acc[L + 1] += w * (1 - thigh) * (1 - foot); acc[L + 2] += w * foot;
      });
      var chest = ss(0.4, 0.52, y); acc[CHEST] += trunk * chest; acc[PELVIS] += trunk * (1 - chest);
      /* keep the four largest */
      var idx = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].sort(function (a, b) { return acc[b] - acc[a]; }), sum = 0;
      for (var j = 0; j < 4; j++) sum += acc[idx[j]];
      for (j = 0; j < 4; j++) { si[v * 4 + j] = idx[j]; sw[v * 4 + j] = sum > 0 ? acc[idx[j]] / sum : (j ? 0 : 1); }
    }
    geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
  }
  /* first person: only the triangles that belong to the paddle arm */
  function armOnly(geo) {
    var si = geo.attributes.skinIndex.array, sw = geo.attributes.skinWeight.array, ix = geo.index.array, out = [], A = ARM[1];
    function armW(v) { var w = 0; for (var j = 0; j < 4; j++) { var b = si[v * 4 + j]; if (b >= A && b <= A + 2) w += sw[v * 4 + j]; } return w; }
    for (var t = 0; t < ix.length; t += 3) if (armW(ix[t]) > 0.5 && armW(ix[t + 1]) > 0.5 && armW(ix[t + 2]) > 0.5) out.push(ix[t], ix[t + 1], ix[t + 2]);
    return out;
  }

  /* team recolour: dark navy cloth and yellow-green trim, scaled by how bright each texel is against the
     original swatch so folds and highlights survive */
  var TEAMS = {
    you: null,
    partner: { cloth: [236, 240, 246], lo: 0.42, gain: 0.5, trim: null },
    opp: { cloth: [214, 66, 44], lo: 0.05, gain: 0.95, trim: [18, 40, 78] }
  };
  function material(team) {
    if (base.mats[team]) return base.mats[team];
    var map, T = TEAMS[team];
    if (!T) map = null;
    else {
      var img = base.img, c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      var x = c.getContext("2d"); x.drawImage(img, 0, 0); var d = x.getImageData(0, 0, c.width, c.height), p = d.data;
      for (var i = 0; i < p.length; i += 4) {
        var r = p[i], g = p[i + 1], b = p[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), lum = 0.3 * r + 0.59 * g + 0.11 * b;
        if (b > r + 6 && b >= g && mx < 150) {                          /* navy cloth */
          var f = Math.min(1.15, T.lo + T.gain * lum / 40);
          p[i] = Math.min(255, T.cloth[0] * f); p[i + 1] = Math.min(255, T.cloth[1] * f); p[i + 2] = Math.min(255, T.cloth[2] * f);
        } else if (T.trim && g > 90 && g >= r && b < g * 0.72 && mx - mn > 50) {   /* yellow-green trim */
          var h = lum / 190;
          p[i] = Math.min(255, T.trim[0] * h * 1.6); p[i + 1] = Math.min(255, T.trim[1] * h * 1.6); p[i + 2] = Math.min(255, T.trim[2] * h * 1.6);
        }
      }
      x.putImageData(d, 0, 0);
      map = new THREE.CanvasTexture(c); map.flipY = false; map.encoding = THREE.sRGBEncoding; map.anisotropy = 4;
    }
    if (!map) { map = new THREE.Texture(base.img); map.flipY = false; map.encoding = THREE.sRGBEncoding; map.anisotropy = 4; map.needsUpdate = true; }
    var m = new THREE.MeshStandardMaterial({ map: map, roughness: 0.55, metalness: 0, envMapIntensity: 0.7, skinning: true });
    return (base.mats[team] = m);
  }

  /* bind data shared by every instance */
  var bind = null;
  function bindData() {
    if (bind) return bind;
    var V3 = THREE.Vector3, v = function (a) { return new V3(a[0], a[1], a[2]); };
    bind = { pos: [], dir: [] };
    bind.pos[PELVIS] = v(B.hipC); bind.pos[CHEST] = v(B.waist); bind.pos[HEAD] = v(B.hd);
    [0, 1].forEach(function (s) {
      var m = s ? 1 : -1, l = B.leg.map(function (p) { return new V3(p[0] * m, p[1], p[2]); }), a = B.arm.map(function (p) { return new V3(p[0] * m, p[1], p[2]); });
      bind.pos[LEG[s]] = l[0]; bind.pos[LEG[s] + 1] = l[1]; bind.pos[LEG[s] + 2] = l[2];
      bind.dir[LEG[s]] = l[1].clone().sub(l[0]); bind.dir[LEG[s] + 1] = l[2].clone().sub(l[1]);
      bind.pos[ARM[s]] = a[0]; bind.pos[ARM[s] + 1] = a[1]; bind.pos[ARM[s] + 2] = a[2];
      bind.dir[ARM[s]] = a[1].clone().sub(a[0]); bind.dir[ARM[s] + 1] = a[2].clone().sub(a[1]);
    });
    bind.len = bind.dir.map(function (d) { return d ? d.length() : 0; });
    bind.unit = bind.dir.map(function (d) { return d ? d.clone().normalize() : null; });
    bind.inv = bind.pos.map(function (p) { return new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z); });
    return bind;
  }

  /* attach a skinned sculpt to a rig; the procedural body is hidden and the rig takes this body's proportions */
  function attach(rig, team) {
    var bd = bindData(), V3 = THREE.Vector3, Q = THREE.Quaternion;
    var bones = [], inv = [];
    for (var i = 0; i < N; i++) { var b = new THREE.Bone(); b.matrixAutoUpdate = false; bones.push(b); inv.push(bd.inv[i].clone()); }
    var skel = new THREE.Skeleton(bones, inv), mat = material(team);
    function make(geo) {
      var m = new THREE.SkinnedMesh(geo, mat); m.bind(skel, new THREE.Matrix4()); m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true;
      rig.group.add(m); return m;
    }
    var main = make(base.geo), armGeo = base.geo.clone(); armGeo.setIndex(base.armIndex);
    var arm = make(armGeo); arm.visible = false;
    rig.body.visible = false; rig.upper.visible = false;
    rig.setProp(PROP); rig.readyDy = -0.3;

    var _q = new Q(), _q2 = new Q(), _d = new V3(), _m = new THREE.Matrix4(), _s = new THREE.Matrix4(), _e = new THREE.Euler(0, 0, 0, "YXZ"), Y = new V3(0, 1, 0);
    var qPel = new Q(), qUp = new Q();
    function set(i, pos, q, stretch) {
      var M = bones[i].matrixWorld;
      M.makeRotationFromQuaternion(q);
      if (stretch && Math.abs(stretch - 1) > 1e-3) {                  /* scale along the bind direction only */
        var u = bd.unit[i], k = stretch - 1, e = _s.elements;
        _s.set(1 + k * u.x * u.x, k * u.x * u.y, k * u.x * u.z, 0, k * u.y * u.x, 1 + k * u.y * u.y, k * u.y * u.z, 0, k * u.z * u.x, k * u.z * u.y, 1 + k * u.z * u.z, 0, 0, 0, 0, 1);
        M.multiply(_s);
      }
      M.setPosition(pos);
    }
    /* swing the child from its bind direction to the solved one, measured in the parent's frame */
    function swing(out, parentQ, i, from, to) {
      _d.subVectors(to, from); var len = _d.length() || 1e-6; _d.multiplyScalar(1 / len);
      _q2.copy(parentQ).invert(); _d.applyQuaternion(_q2);
      out.copy(parentQ).multiply(_q.setFromUnitVectors(bd.unit[i], _d));
      return len / bd.len[i];
    }
    var qa = new Q(), qb = new Q();
    rig.onUpdate = function (J) {
      qPel.setFromAxisAngle(Y, J.hipYaw); set(PELVIS, J.hipC, qPel);
      set(CHEST, J.waist, J.chestQ);
      _e.set(J.pitch * 0.45, J.yaw, 0); _q2.setFromEuler(_e); qa.copy(_q2); set(HEAD, J.hd, qa);
      for (var s = 0; s < 2; s++) {
        var l = J.leg[s], L = LEG[s];
        var k1 = swing(qa, qPel, L, l.hip, l.knee); set(L, l.hip, qa, k1);
        var k2 = swing(qb, qa, L + 1, l.knee, l.ank); set(L + 1, l.knee, qb, k2);
        _q2.setFromAxisAngle(Y, l.yaw); set(L + 2, l.ank, _q2);
        var a = J.arm[s], A = ARM[s];
        var k3 = swing(qUp, J.chestQ, A, a.sho, a.elb); set(A, a.sho, qUp, k3);
        var k4 = swing(qb, qUp, A + 1, a.elb, a.hand); set(A + 1, a.elb, qb, k4);
        set(A + 2, a.hand, qb);
      }
    };
    rig.onFP = function (on) { main.visible = !on; arm.visible = on; };
    if (rig.fp) rig.onFP(true);
    return { mesh: main, arm: arm, skeleton: skel };
  }

  root.NinjaMascot = { load: load, attach: attach, PROP: PROP };
})(window);
