/* Scene checker. Runs on every Vercel build (see vercel.json); a failed rule fails the deploy.
   Uses the same flight model and forehand/backhand choice as the page (core.js).
   Rules: every ball that crosses the net clears it and passes between the posts; bounces land in the court;
   serves are struck from behind the baseline and land in the diagonal service box beyond the kitchen;
   nobody volleys with their feet inside the kitchen; flights stay plausible (speed, apex height).
   Usage: node tools/validate.js [-v] */
"use strict";
const path = require("path");
const C = require(path.join(__dirname, "..", "core.js"));
const { CH, SWINGS, DIM } = require(path.join(__dirname, "..", "scenes.js"));
const { BL, KL, HW } = DIM, POST = 3.353, BR = 0.05;
const verbose = process.argv.includes("-v");
const netH = x => 0.864 + 0.05 * Math.pow(Math.min(1, Math.abs(x) / POST), 2);
let bad = 0, segs = 0;
const fail = (tag, msg) => { bad++; console.log("FAIL", tag.padEnd(16), msg); };

CH.forEach(ch => ch.v.forEach(v => {
  const tag = ch.no + "/" + v.id, N = v.path, sides = C.planSides(v, SWINGS);
  let spin = null;
  for (let i = 1; i < N.length; i++) {
    const a = N[i - 1], b = N[i], T = b.T;
    if (a.hit || a.by) spin = SWINGS[a.hit || a.sw || "ret"].spin; else if (a.p[1] === 0) spin = spin === "top" || spin === "back" ? spin : null;
    const A = [a.p[0], a.p[1] + BR, a.p[2]], B = [b.p[0], b.p[1] + BR, b.p[2]];
    const s = C.solve(A, B, T, a.p[1] === 0 && !(a.hit || a.by) ? (spin ? spin : null) : spin), S = s.samples;
    segs++;
    let apex = 0, cross = null;
    for (let k = 0; k <= s.n; k++) {
      apex = Math.max(apex, S[k * 3 + 1]);
      if (k && cross === null && Math.sign(S[k * 3 + 2]) !== Math.sign(S[k * 3 - 1]) && S[k * 3 - 1] !== 0) {
        const f = S[k * 3 - 1] / (S[k * 3 - 1] - S[k * 3 + 2]);
        cross = [S[k * 3 - 3] + (S[k * 3] - S[k * 3 - 3]) * f, S[k * 3 - 2] + (S[k * 3 + 1] - S[k * 3 - 2]) * f];
      }
    }
    const sp = Math.hypot(...s.v0);
    let note = (a.hit || a.by || (a.p[1] === 0 ? "bounce" : "-")).padEnd(8) + " v0 " + sp.toFixed(1) + " apex " + (apex - BR).toFixed(2);
    if (cross && !b.net) {
      const c = cross[1] - BR - netH(cross[0]);
      note += " net+" + c.toFixed(2);
      if (c < 0.06) fail(tag + " #" + i, "too close to the net tape (" + c.toFixed(2) + " m)");
      if (Math.abs(cross[0]) > POST) fail(tag + " #" + i, "goes around the post");
    }
    if (b.p[1] === 0 && (Math.abs(b.p[0]) > HW || Math.abs(b.p[2]) > BL)) fail(tag + " #" + i, "bounce is out");
    if (b.net && b.p[1] > netH(b.p[0])) fail(tag + " #" + i, "net ball is above the tape");
    if (sp > 24) fail(tag + " #" + i, "launch speed " + sp.toFixed(1) + " m/s is not plausible");
    if (apex - BR > 3.8) fail(tag + " #" + i, "apex " + (apex - BR).toFixed(2) + " m is a lob, not a rally ball");
    if (a.hit === "serve") {
      if (Math.abs(a.p[2]) < BL) fail(tag, "serve struck inside the baseline");
      if (!(Math.abs(b.p[2]) > KL && Math.abs(b.p[2]) <= BL && a.p[0] * b.p[0] < 0)) fail(tag, "serve misses the diagonal service box");
    }
    const striker = b.hit ? "you" : b.by;
    if (striker && b.p[1] !== 0 && a.p[1] !== 0 && i < N.length - 1 && b.hit !== "serve") {
      const nx = N[i + 1].p, yaw = Math.atan2(-(nx[0] - b.p[0]), -(nx[2] - b.p[2]));
      const feet = C.standAt(b.p, yaw, SWINGS[b.hit || b.sw], sides[i] || 1);
      if (Math.abs(feet[1]) < KL + 0.05) fail(tag + " #" + i, "volley with feet in the kitchen (z=" + feet[1].toFixed(2) + ")");
      note += " volley" + (sides[i] < 0 ? " BH" : "") + " feet z=" + feet[1].toFixed(2);
    } else if (striker && sides[i] < 0) note += " BH";
    if (verbose) console.log("    ", (tag + " #" + i).padEnd(16), note);
  }
}));
console.log(bad ? "scene check: " + bad + " problem(s) in " + segs + " flights" : "scene check: all " + segs + " flights pass");
process.exit(bad ? 1 : 0);
