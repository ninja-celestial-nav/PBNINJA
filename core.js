/* PBCore: the rules both the 3D page and the scene checker share.
   - Ball flight with air drag and spin, solved so each segment still lands where and when the scene says.
   - Forehand or backhand: a player takes whichever side needs less running, with a bias for the forehand.
   Works in the browser (window.PBCore) and in Node (require). */
(function (root) {
  "use strict";
  var G = 9.81;
  var KD = 0.034;   /* drag: 0.5 * rho * Cd * A / m for a perforated pickleball, per metre */
  var KM = 0.011;   /* spin (Magnus) acceleration per (m/s)^2; topspin pushes down, backspin lifts */
  var HZ = 240;     /* integration rate */

  function spinSign(spin) { return spin === "top" ? 1 : spin === "back" ? -1 : 0; }

  /* acceleration for velocity v with spin sign s */
  function acc(v, s, out) {
    var sp = Math.hypot(v[0], v[1], v[2]) || 1e-9;
    out[0] = -KD * sp * v[0]; out[1] = -G - KD * sp * v[1]; out[2] = -KD * sp * v[2];
    if (s) {
      /* direction perpendicular to the flight, in its vertical plane, pointing "up" relative to the ball's path */
      var hx = v[0] / sp, hy = v[1] / sp, hz = v[2] / sp;
      var sx = -hz, sz = hx, sl = Math.hypot(sx, sz);                 /* side = dir x up (horizontal) */
      if (sl > 1e-6) {
        sx /= sl; sz /= sl;
        var ux = -sz * hy, uy = sz * hx - sx * hz, uz = sx * hy;       /* up' = side x dir */
        var k = -s * KM * sp * sp;
        out[0] += k * ux; out[1] += k * uy; out[2] += k * uz;
      }
    }
    return out;
  }

  /* fly from p with velocity v for time T; returns samples (x,y,z per step) */
  function fly(p, v, T, s, keep) {
    var n = Math.max(12, Math.ceil(T * HZ)), dt = T / n, x = p.slice(), u = v.slice(), a = [0, 0, 0], m = [0, 0, 0], um = [0, 0, 0];
    var out = keep ? new Float32Array((n + 1) * 3) : null;
    if (out) out.set(x, 0);
    for (var i = 1; i <= n; i++) {
      acc(u, s, a);
      um[0] = u[0] + a[0] * dt / 2; um[1] = u[1] + a[1] * dt / 2; um[2] = u[2] + a[2] * dt / 2;
      acc(um, s, m);
      x[0] += um[0] * dt; x[1] += um[1] * dt; x[2] += um[2] * dt;
      u[0] += m[0] * dt; u[1] += m[1] * dt; u[2] += m[2] * dt;
      if (out) out.set(x, i * 3);
    }
    return { end: x, samples: out, n: n };
  }

  /* find the launch velocity that reaches b from a in exactly T seconds */
  function solve(a, b, T, spin) {
    var s = spinSign(spin);
    var v = [(b[0] - a[0]) / T, (b[1] - a[1] + 0.5 * G * T * T) / T, (b[2] - a[2]) / T];
    for (var it = 0; it < 14; it++) {
      var e = fly(a, v, T, s, false).end, dx = b[0] - e[0], dy = b[1] - e[1], dz = b[2] - e[2];
      if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < 1e-4) break;
      v[0] += dx / T * 1.15; v[1] += dy / T * 1.15; v[2] += dz / T * 1.15;
    }
    var f = fly(a, v, T, s, true);
    return { v0: v, samples: f.samples, n: f.n, spin: s };
  }

  /* position at time u (0..T) inside a solved segment */
  function at(seg, u, T, out) {
    var k = Math.max(0, Math.min(1, u / T)) * seg.n, i = Math.min(seg.n - 1, Math.floor(k)), f = k - i, s = seg.samples;
    out[0] = s[i * 3] + (s[i * 3 + 3] - s[i * 3]) * f;
    out[1] = s[i * 3 + 1] + (s[i * 3 + 4] - s[i * 3 + 1]) * f;
    out[2] = s[i * 3 + 2] + (s[i * 3 + 5] - s[i * 3 + 2]) * f;
    return out;
  }

  /* where a player stands to strike a ball at bp toward heading yaw, on side m (+1 forehand, -1 backhand) */
  function standAt(bp, yaw, sw, m) {
    var rx = Math.cos(yaw), rz = -Math.sin(yaw), fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    return [bp[0] - rx * sw.R * m - fx * sw.F, bp[2] - rz * sw.R * m - fz * sw.F];
  }
  var NET_KEYS = { punch: 1, roll: 1, flick: 1, reset: 1, dink: 1 };
  var FH_BIAS = 0.35; /* metres of extra running a player accepts to keep the forehand */
  function pickSide(from, bp, yaw, sw, key, n) {
    if (n.bh) return -1;
    if (n.fh || key === "serve" || key === "smash") return 1;
    /* at the net, a ball at the body or to the left is a backhand: that side covers the body */
    if (NET_KEYS[key]) {
      var off = (bp[0] - from[0]) * Math.cos(yaw) + (bp[2] - from[1]) * -Math.sin(yaw);
      return off < 0.25 ? -1 : 1;
    }
    var f = standAt(bp, yaw, sw, 1), b = standAt(bp, yaw, sw, -1);
    var df = Math.hypot(f[0] - from[0], f[1] - from[1]), db = Math.hypot(b[0] - from[0], b[1] - from[1]);
    return db + FH_BIAS < df ? -1 : 1;
  }

  /* decide forehand / backhand for every strike in a variant. Returns { idx: m }.
     A player's "from" point is where they last struck, else where a scripted move last took them, else their start. */
  function planSides(v, SW) {
    var P = v.path, last = {}, out = {};
    ["you", "partner", "o1", "o2"].forEach(function (id) { if (v[id]) last[id] = v[id].slice(); });
    for (var i = 0; i < P.length - 1; i++) {
      (v.moves || []).forEach(function (mv) { if (mv.after === i - 1 || (mv.after < i && !mv._used)) { if (mv.after < i) { last[mv.who] = mv.to.slice(); } } });
      var n = P[i], who = n.hit ? "you" : n.by; if (!who) continue;
      var key = n.hit || n.sw || "ret", sw = SW[key], nx = P[i + 1].p, dx = nx[0] - n.p[0], dz = nx[2] - n.p[2], yaw = Math.atan2(-dx, -dz);
      var m = i === 0 ? (n.bh ? -1 : 1) : pickSide(last[who] || [n.p[0], n.p[2]], n.p, yaw, sw, key, n);
      out[i] = m; last[who] = standAt(n.p, yaw, sw, m);
    }
    return out;
  }

  var api = { planSides: planSides, G: G, KD: KD, KM: KM, spinSign: spinSign, solve: solve, at: at, standAt: standAt, pickSide: pickSide };
  root.PBCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
