'use strict';
if (!window.NRP_A || !window.NRP_B) {
  const miss = [!window.NRP_A && 'fx3d.js', !window.NRP_B && 'space.js'].filter(Boolean).join(', ');
  document.body.classList.add('launched', 'ready');
  const pre = document.createElement('pre');
  pre.textContent = 'INCOMPLETE FILE: ' + miss + ' did not load completely. Re-paste the full file.';
  pre.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:99999;margin:0;padding:8px;font:12px monospace;color:#ffb4a8;background:rgba(0,0,0,.9);white-space:pre-wrap';
  document.body.append(pre);
} else {
(() => {
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FLY_IGN = 600, FLY_T = 1800;
const DUR = [0, 2800, 3800, 3600, 4200, 3400];
let launching = false, pushed = false, raf = 0, prevTs = 0, simT = 0, phase = 'scroll', tPhase = 0;
let S = 0, tg = 0, wantL = 0, arrT = 0, bgP = 0, lastW = 0, ty0 = null, lastQ = -1, lastBar = -1;
let perfN = 0, perfSum = 0, perfDone = false, timers = [], PL = null, DEB = null, MET = null;
try { history.scrollRestoration = 'manual'; } catch {}
const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
const eio = t => t * t * (3 - 2 * t), eout = t => 1 - Math.pow(1 - t, 3);
const stateOf = s => { const a = s <= 1e-6 ? 0 : Math.min(5, Math.ceil(s - 1e-9)); return [a, a ? clamp(s - (a - 1)) : 1]; };

/* ================= realistic planets (procedural textures, lit sphere) ================= */
planet = () => {};
const cyl = (lon, v, sc, s, o, k) => fbm(Math.cos(lon) * sc + s * 3.7, Math.sin(lon) * sc + v * sc * (k || 1) + s * 1.9, s, o);
const KIND = [
  { rs: 224, rate: .018, crate: 0, tilt: -.1, atm: [255, 225, 180, .3], g: 'rgba(255,210,150,.38)', ring: 1, ec: [0, 0, 0], fb: [200, 170, 130] },
  { rs: 224, rate: .014, crate: .006, tilt: .4, atm: [100, 170, 255, 1], g: 'rgba(100,170,255,.5)', ec: [255, 205, 130], fb: [40, 100, 170] },
  { rs: 176, rate: .01, crate: 0, tilt: .15, atm: [255, 120, 40, .7], g: 'rgba(255,120,50,.5)', emDay: 1, ec: [255, 110, 25], fb: [90, 40, 30] },
  { rs: 176, rate: .012, crate: 0, tilt: .3, atm: [255, 170, 120, .5], g: 'rgba(255,160,110,.4)', ec: [0, 0, 0], fb: [170, 100, 60] }
];
const GP = [[238, 222, 190], [214, 176, 124], [168, 118, 76], [244, 236, 214], [126, 92, 66]];

function mkPlanet(k){
  const K = KIND[k], TW = 384, TH = 192, n = TW * TH, R = K.rs;
  const o = { k, K, TW, TH, h: new Float32Array(n), rgb: new Uint8ClampedArray(n * 3), cl: new Uint8Array(n), em: new Uint8Array(n), sp: new Uint8Array(n),
    pass: 0, row: 0, done: false, seed: 11 + k * 17, lsh: -9, ring: null, t0: 0, avg: K.fb };
  const cv = document.createElement('canvas'); cv.width = cv.height = R;
  o.cv = cv; o.g = cv.getContext('2d'); o.img = o.g.createImageData(R, R);
  const PX = [], U = [], VR = [], LIT = [], RIM = [], HS = [], AL = [];
  const ll = Math.hypot(-.5, .55, .67), Lx = -.5 / ll, Ly = .55 / ll, Lz = .67 / ll;
  const hl = Math.hypot(Lx, Ly, Lz + 1), hx = Lx / hl, hy = Ly / hl, hz = (Lz + 1) / hl, ct = Math.cos(K.tilt), st = Math.sin(K.tilt);
  for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
    const x = (i + .5) / R * 2 - 1, y = 1 - (j + .5) / R * 2, r2 = x * x + y * y;
    if (r2 >= 1) continue;
    const z = Math.sqrt(1 - r2), xr = x * ct + y * st, yr = -x * st + y * ct;
    const nd = x * Lx + y * Ly + z * Lz;
    PX.push(j * R + i); U.push((Math.atan2(xr, z) / TAU + .5) * TW);
    VR.push(Math.min(TH - 1, Math.max(0, ((1 - yr) * .5 * TH) | 0)) * TW);
    LIT.push(Math.pow(clamp((nd + .1) / 1.1), 1.2));
    RIM.push(Math.pow(1 - z, 2.4) * (.2 + .8 * clamp(nd + .55)));
    HS.push(Math.pow(Math.max(0, x * hx + y * hy + z * hz), 70));
    AL.push(clamp((1 - Math.sqrt(r2)) * R / 1.4) * 255);
  }
  o.n = PX.length; o.PX = Int32Array.from(PX); o.U = Float32Array.from(U); o.VR = Int32Array.from(VR);
  o.LIT = Float32Array.from(LIT); o.RIM = Float32Array.from(RIM); o.HS = Float32Array.from(HS); o.AL = Uint8Array.from(AL);
  return o;
}
function genRow(o, y){
  const { TW, TH, h, k, seed: s } = o, v = 1 - 2 * (y + .5) / TH;
  for (let x = 0; x < TW; x++) {
    const lon = x / TW * TAU; let q;
    if (k === 0) { const w = cyl(lon, v, 2.2, s, 4, .7), b = Math.sin(v * 11 + w * 5.5) * .5 + .5; q = b * .7 + cyl(lon, v * 5, 6, s + 3, 3, 1) * .3; }
    else q = cyl(lon, v, k === 1 ? 2.6 : k === 2 ? 3.4 : 3, s, 6, 1);
    h[y * TW + x] = q;
  }
}
function craters(o){
  const { TW, TH, h } = o, r = rng(o.seed + 5);
  for (let c = 0; c < 95; c++) {
    const cx = r() * TW, cy = TH * (.12 + r() * .76), R = 2 + Math.pow(r(), 2.4) * 17;
    for (let dy = -Math.ceil(R * 1.4); dy <= R * 1.4; dy++) for (let dx = -Math.ceil(R * 1.4); dx <= R * 1.4; dx++) {
      const d = Math.hypot(dx, dy) / R; if (d > 1.4) continue;
      const yy = (cy + dy) | 0; if (yy < 0 || yy >= TH) continue;
      const i = yy * TW + (((cx + dx) | 0) + TW) % TW;
      h[i] += (d < 1 ? -.1 * (1 - d * d) : 0) + .055 * Math.exp(-((d - 1) * (d - 1)) / .015);
    }
  }
}
function colRow(o, y){
  const { TW, TH, h, rgb, cl, em, sp, k, seed: s } = o, v = 1 - 2 * (y + .5) / TH, av = Math.abs(v), yo = y * TW;
  for (let x = 0; x < TW; x++) {
    const i = yo + x, lon = x / TW * TAU, q = h[i], sh = clamp(1 + (h[yo + (x + TW - 1) % TW] - h[yo + (x + 1) % TW]) * 5, .55, 1.5);
    let r, g, b, e = 0, s2 = 0;
    if (k === 0) {
      const t = Math.min(3.999, q * 4), a = t | 0, f = t - a, A = GP[a], B = GP[a + 1];
      r = A[0] + (B[0] - A[0]) * f; g = A[1] + (B[1] - A[1]) * f; b = A[2] + (B[2] - A[2]) * f;
      const ld = Math.atan2(Math.sin(lon - 2.2), Math.cos(lon - 2.2)), st = Math.exp(-(ld * ld * 6 + (v + .32) * (v + .32) * 110)) * .75;
      r += (190 - r) * st; g += (92 - g) * st; b += (60 - b) * st;
      const dk = 1 - av * av * .3; r *= dk; g *= dk; b *= dk;
    } else if (k === 1) {
      if (q < .5) { const d = q / .5; r = 8 + 36 * d * d; g = 30 + 70 * d * d; b = 80 + 80 * d; s2 = 255; }
      else {
        const el = (q - .5) * 2.2, mo = cyl(lon, v, 4, s + 9, 4, 1), dry = mo < .46 || (av < .35 && mo < .52);
        r = dry ? 196 : 58; g = dry ? 166 : 112; b = dry ? 108 : 54;
        const rk = clamp((el - .28) * 3); r += (128 - r) * rk; g += (112 - g) * rk; b += (96 - b) * rk;
        const sn = clamp((el - .55) * 8); r += (240 - r) * sn; g += (242 - g) * sn; b += (248 - b) * sn;
        r *= sh; g *= sh; b *= sh;
        if (av < .75 && cyl(lon, v, 40, s + 5, 2, 1) > .64) e = 190;
      }
      const ic = clamp((av - .86 - cyl(lon, v, 6, s + 2, 3, 1) * .06) * 30);
      if (ic > 0) { r += (240 - r) * ic; g += (244 - g) * ic; b += (250 - b) * ic; s2 = 0; e = 0; }
      cl[i] = clamp((cyl(lon, v, 3.4, s + 21, 5, 2.6) - .47) * 3.4) * 235;
    } else if (k === 2) {
      const rr = 1 - Math.abs(q * 2 - 1), cr = clamp((rr - .86) * 14), pl = q < .35 ? (.35 - q) * 1.2 : 0;
      r = (34 + 50 * q) * sh; g = (26 + 34 * q) * sh; b = (24 + 28 * q) * sh; e = clamp(cr + pl) * 255;
    } else {
      const lo = clamp((.46 - q) * 6), hi = clamp((q - .55) * 4);
      r = 176 + (88 - 176) * lo + (208 - 176) * hi; g = 98 + (54 - 98) * lo + (146 - 98) * hi; b = 58 + (42 - 58) * lo + (96 - 58) * hi;
      const pc = clamp((av - .9) * 20); r += (236 - r) * pc; g += (232 - g) * pc; b += (238 - b) * pc;
      const du = .92 + .16 * cyl(lon, v, 14, s + 4, 2, 1); r *= sh * du; g *= sh * du; b *= sh * du;
    }
    const j = i * 3; rgb[j] = r; rgb[j + 1] = g; rgb[j + 2] = b; em[i] = e; sp[i] = s2;
  }
}
function finish(o){
  o.done = true; o.t0 = simT;
  let a = 0, b = 0, c = 0, m = 0; for (let i = 0; i < o.TW * o.TH; i += 37) { a += o.rgb[i * 3]; b += o.rgb[i * 3 + 1]; c += o.rgb[i * 3 + 2]; m++; }
  o.avg = [a / m, b / m, c / m];
  if (o.k === 0) {
    const RS = 512, c2 = document.createElement('canvas'); c2.width = c2.height = RS;
    const g = c2.getContext('2d'), im = g.createImageData(RS, RS), pf = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const t = i / 255; let a2 = clamp(fbm(t * 38, .5, 31, 3) * 1.15) * (t < .14 ? .3 : 1);
      if (t > .46 && t < .52) a2 *= .06; if (t > .78 && t < .795) a2 *= .1;
      pf[i] = a2 * clamp(t * 12) * clamp((1 - t) * 14);
    }
    for (let y = 0; y < RS; y++) for (let x = 0; x < RS; x++) {
      const d = Math.hypot(x - RS / 2 + .5, y - RS / 2 + .5) / (RS / 2), t = (d - .578) / .422; if (t < 0 || t > 1) continue;
      const al = pf[(t * 255) | 0], w = .8 + .35 * fbm(t * 90, 2, 7, 2), p = (y * RS + x) * 4;
      im.data[p] = 214 * w; im.data[p + 1] = 190 * w; im.data[p + 2] = 150 * w; im.data[p + 3] = al * 235;
    }
    g.putImageData(im, 0, 0); o.ring = c2;
  }
}
function texTick(budget){
  const t0 = performance.now(); let all = true;
  for (const o of PL) {
    if (o.done) continue; all = false;
    while (!o.done && performance.now() - t0 < budget) {
      if (o.pass === 0) { genRow(o, o.row++); if (o.row >= o.TH) { o.pass = 1; o.row = 0; } }
      else if (o.pass === 1) { if (o.k === 3) craters(o); o.pass = 2; o.row = 0; }
      else { colRow(o, o.row++); if (o.row >= o.TH) finish(o); }
    }
    break;
  }
  return all;
}
function renderPl(o, sh, csh){
  const { TW, rgb, cl, em, sp, K, n, U, VR, LIT, RIM, HS, AL, PX } = o, d = o.img.data, ia = K.atm, ec = K.ec, hasC = o.k === 1;
  for (let j = 0; j < n; j++) {
    let u = U[j] + sh; u -= TW * Math.floor(u / TW);
    const i0 = u | 0, f = u - i0, i1 = i0 + 1 === TW ? 0 : i0 + 1, a = VR[j] + i0, b = VR[j] + i1, a3 = a * 3, b3 = b * 3, f1 = 1 - f;
    let r = rgb[a3] * f1 + rgb[b3] * f, g = rgb[a3 + 1] * f1 + rgb[b3 + 1] * f, bl = rgb[a3 + 2] * f1 + rgb[b3 + 2] * f, c = 0;
    if (hasC) {
      let uc = U[j] + csh; uc -= TW * Math.floor(uc / TW);
      const c0 = uc | 0, cf = uc - c0, ca = VR[j] + c0, cb = VR[j] + (c0 + 1 === TW ? 0 : c0 + 1);
      c = (cl[ca] * (1 - cf) + cl[cb] * cf) / 255;
      r += (238 - r) * c; g += (242 - g) * c; bl += (248 - bl) * c;
    }
    const L = LIT[j], sd = .03 + L; let R = r * sd, G = g * sd, B = bl * sd;
    const e = em[a] / 255;
    if (e > 0) { const w = K.emDay ? e : e * (1 - Math.min(1, L * 5)) * (1 - c); R += ec[0] * w; G += ec[1] * w; B += ec[2] * w; }
    if (sp[a]) { const q = HS[j] * (1 - c) * .9 * 255; R += q; G += q; B += q; }
    const rm = RIM[j] * ia[3]; R += ia[0] * rm; G += ia[1] * rm; B += ia[2] * rm;
    const p = PX[j] * 4; d[p] = R > 255 ? 255 : R; d[p + 1] = G > 255 ? 255 : G; d[p + 2] = B > 255 ? 255 : B; d[p + 3] = AL[j];
  }
  o.g.putImageData(o.img, 0, 0);
}
function drawPlanet(o, x, y, r, al, tt){
  if (al <= .01 || r < 1) return;
  const K = o.K; ctx.save(); ctx.globalAlpha = al;
  let g = ctx.createRadialGradient(x, y, r * .92, x, y, r * 1.4);
  g.addColorStop(0, K.g); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.4, 0, TAU); ctx.fill();
  const RR = r * 2.25, ring = front => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-.32); ctx.scale(1, .3);
    ctx.beginPath(); ctx.rect(-RR, front ? 0 : -RR, RR * 2, RR); ctx.clip();
    ctx.drawImage(o.ring, -RR, -RR, RR * 2, RR * 2); ctx.restore();
  };
  if (K.ring && o.ring) ring(false);
  if (o.done) {
    const sh = tt * K.rate * o.TW;
    if (Math.abs(sh - o.lsh) > .45) { renderPl(o, sh, tt * (K.rate + K.crate) * o.TW); o.lsh = sh; }
    ctx.globalAlpha = al * Math.min(1, (simT - o.t0) / 500);
    ctx.drawImage(o.cv, x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = al;
  } else {
    const f = K.fb; g = ctx.createRadialGradient(x - r * .4, y - r * .4, r * .1, x, y, r);
    g.addColorStop(0, `rgb(${f[0]},${f[1]},${f[2]})`); g.addColorStop(1, 'rgb(4,6,16)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  if (K.ring && o.ring) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    ctx.translate(x, y + r * .2); ctx.rotate(-.32); ctx.scale(1, .3); ctx.globalAlpha = al * .4;
    ctx.strokeStyle = 'rgb(0,0,10)'; ctx.lineWidth = r * .9; ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, TAU); ctx.stroke(); ctx.restore();
    ring(true);
  }
  ctx.restore();
}

/* ================= acts: all states are pure functions of (act, p) so they can play in reverse ================= */
const HOME = (k, m) => [[W * .8, H * .68, m * .2], [W * .15, H * .9, m * .13], [W * .2, H * .27, m * .14], [W * .83, H * .3, m * .1]][k];
const actsShake = (a, p) => a === 2 && p >= .5 ? 16 * Math.max(0, 1 - (p - .5) / .14) : 0;
function initFx(){
  let r = rng(77); DEB = [];
  for (let i = 0; i < 240; i++) { const sp = i >= 150 ? 1 : 0; DEB.push({ k: i % 2, a: r() * TAU, rf: Math.sqrt(r()), j: (r() - .5) * 1.2,
    v: (.05 + r() * .6) * (sp ? 1.8 : 1), s: sp ? 1.2 + r() * 1.6 : 1.5 + r() * 4.5, sp, life: 1 + r() * 1.4, dl: r() * .45, sw: (r() - .5) * .5 }); }
  r = rng(5); MET = [];
  for (let i = 0; i < 85; i++) { const big = r() < .12; MET.push({ ts: r() * 2.2, fx: .35 + r() * .9, fy: -.05 - r() * .3, ang: 2.55 + (r() - .5) * .25,
    sp: 1.2 + r() * 1.6, len: (.18 + r() * .3) * (big ? 1.6 : 1), w: big ? 3.2 : 1.3, big, z: .5 + r() * .5 }); }
}
function actsFrame(act, p, tt, vis){
  const m = Math.min(W, H), hx = W * .5, hy = H * .46;
  if (!PL) { PL = [0, 1, 2, 3].map(mkPlanet); initFx(); }
  const drf = k => { const h = HOME(k, m); return [h[0] + Math.sin(tt * .15 + k * 2) * m * .012, h[1] + Math.cos(tt * .2 + k) * m * .01, h[2]]; };
  const tb = act < 2 ? -1 : act === 2 ? (p - .5) * DUR[2] / 1000 : act === 3 ? (DUR[2] * .5 + p * DUR[3]) / 1000 : 99;
  const H0 = HOME(0, m), H1 = HOME(1, m), dx = H0[0] - H1[0], dy = H0[1] - H1[1], dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl;
  const bp = [[hx + ux * H0[2] * .85, hy + uy * H0[2] * .85, H0[2]], [hx - ux * H1[2] * .85, hy - uy * H1[2] * .85, H1[2]]];

  if (act < 3 && tb <= 0) {
    const e = act < 2 ? 0 : Math.pow(clamp(p / .5), 2.4);
    for (const k of [0, 1]) { const a = drf(k); drawPlanet(PL[k], lerp(a[0], bp[k][0], e), lerp(a[1], bp[k][1], e), a[2], vis, tt); }
    const gl = act === 2 ? ramp(p, .38, .5) : 0;
    if (gl > 0) { const s = m * (.08 + .3 * gl); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = gl * vis;
      ctx.drawImage(sprites.f1, hx - s, hy - s, s * 2, s * 2); ctx.drawImage(sprites.f0, hx - s * .4, hy - s * .4, s * .8, s * .8); ctx.restore(); }
  }

  if (tb > 0 && act < 4) {
    ctx.save(); ctx.globalAlpha = vis;
    for (const d of DEB) {
      const sp = d.sp; if (sp && tb > d.life) continue;
      const P = bp[d.k], bx = P[0] + Math.cos(d.a) * d.rf * P[2], by = P[1] + Math.sin(d.a) * d.rf * P[2];
      const ang = Math.atan2(by - hy, bx - hx) + d.j, dist = d.v * m * (1 - Math.exp(-.25 * tb)) / .25;
      let x = bx + Math.cos(ang) * dist, y = by + Math.sin(ang) * dist, sz = d.s;
      if (act === 3 && !sp) {
        const pull = ramp(p, d.dl, d.dl + .5); if (pull >= .97) continue;
        const e = eio(pull), T = HOME(2 + d.k, m), sw = Math.sin(Math.PI * pull) * d.sw * m * .4;
        x = lerp(x, T[0], e) - (T[1] - y) * 0 + sw; y = lerp(y, T[1], e) + sw * .6; sz *= 1 - e * .5;
      }
      const h = sp ? 1 - tb / d.life : Math.max(0, 1 - tb / 3.2);
      if (sp) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,${(120 + 110 * h) | 0},${(50 + 60 * h) | 0},${h})`; ctx.beginPath(); ctx.arc(x, y, sz * h, 0, TAU); ctx.fill(); }
      else {
        const c = PL[d.k].avg; ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgb(${c[0] * .45 | 0},${c[1] * .4 | 0},${c[2] * .4 | 0})`; ctx.beginPath(); ctx.arc(x, y, sz, 0, TAU); ctx.fill();
        if (h > .3) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = vis * h * .8; const s = sz * 3; ctx.drawImage(sprites.f1, x - s, y - s, s * 2, s * 2); ctx.globalAlpha = vis; }
      }
    }
    ctx.restore();
  }
  if (tb > 0 && tb < 2) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = vis;
    const fb = Math.max(0, 1 - tb / 1.6), s = m * (.12 + .5 * eout(Math.min(1, tb / 1.2)));
    ctx.globalAlpha = fb * vis; ctx.drawImage(sprites.f1, hx - s, hy - s, s * 2, s * 2); ctx.drawImage(sprites.f0, hx - s * .45, hy - s * .45, s * .9, s * .9);
    const a = 1 - tb / 1.3; ctx.globalAlpha = vis;
    if (a > 0) {
      ctx.strokeStyle = `rgba(255,215,160,${a * .8})`; ctx.lineWidth = 2 + tb * 18; ctx.beginPath(); ctx.arc(hx, hy, tb * m * .9, 0, TAU); ctx.stroke();
      ctx.strokeStyle = `rgba(139,160,255,${a * .5})`; ctx.lineWidth = 2 + tb * 10; ctx.beginPath(); ctx.arc(hx, hy, tb * m * .55, 0, TAU); ctx.stroke();
    }
    const fl = Math.max(0, 1 - tb * 1.3);
    if (fl > 0) { const R = m * (.4 + fl * .5), g = ctx.createRadialGradient(hx, hy, 0, hx, hy, R);
      g.addColorStop(0, `rgba(255,240,215,${fl})`); g.addColorStop(1, 'rgba(255,140,60,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }

  if (act >= 3) {
    const e = act === 3 ? eio(ramp(p, .4, 1)) : 1;
    for (const k of [2, 3]) {
      const h = drf(k); drawPlanet(PL[k], h[0], h[1], h[2] * (.55 + .45 * e), e * vis, tt);
      const f = act === 3 ? Math.max(0, 1 - Math.abs(p - .92) * 12) : 0;
      if (f > 0) { const s = h[2] * 4; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = f * vis; ctx.drawImage(sprites.glow, h[0] - s, h[1] - s, s * 2, s * 2); ctx.restore(); }
    }
  }

  if (act === 4) {
    const t = p * DUR[4] / 1000; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < MET.length; i++) {
      const q = MET[i], dt = t - q.ts; if (dt < 0) continue;
      const vx = Math.cos(q.ang) * q.sp * m, vy = Math.sin(q.ang) * q.sp * m, x = W * q.fx + vx * dt, y = H * q.fy + vy * dt;
      if (x < -q.len * m * 2 || y > H + q.len * m * 2) continue;
      const L = q.len * m, sp = Math.hypot(vx, vy), tx = x - vx / sp * L, ty = y - vy / sp * L;
      const g = ctx.createLinearGradient(x, y, tx, ty);
      g.addColorStop(0, 'rgba(255,250,235,.95)'); g.addColorStop(.25, 'rgba(255,175,95,.5)'); g.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.globalAlpha = vis * q.z; ctx.strokeStyle = g; ctx.lineWidth = q.w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.lineWidth = q.w * 3.2; ctx.globalAlpha = vis * q.z * .15; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (tx - x) * .5, y + (ty - y) * .5); ctx.stroke();
      const s = q.big ? 26 : 9; ctx.globalAlpha = vis * q.z; ctx.drawImage(q.big ? sprites.f1 : sprites.f0, x - s, y - s, s * 2, s * 2);
      if (q.big) for (let f = 1; f <= 4; f++) { const a = f * .2, h = hash(i, f, 3), px = x + (tx - x) * a + (h - .5) * 14, py = y + (ty - y) * a + (hash(f, i, 9) - .5) * 14;
        ctx.globalAlpha = vis * q.z * (1 - a) * .8; ctx.fillStyle = 'rgb(255,170,90)'; ctx.beginPath(); ctx.arc(px, py, 1.6, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }
}

/* ================= navigation between intro and chat ================= */
function reveal(push = true){
  clearTimers();
  const instant = phase === 'crack';
  launching = true; phase = 'done';
  body.classList.remove('launching', 'ready'); body.classList.add('launched');
  if (instant) body.classList.add('ready');
  try { sessionStorage.setItem('seen', '1'); } catch {}
  root.style.overflow = ''; body.style.touchAction = ''; scrollTo(0, 0);
  void body.offsetHeight;
  later(() => { if (!body.classList.contains('launched')) return; body.classList.remove('flash'); body.classList.add('ready'); }, instant ? 400 : 1200);
  if (push && !reduce && !pushed) { try { history.pushState({ chat: 1 }, ''); pushed = true; } catch {} }
}
window.NRP_reveal = reveal;
function fail(e){ showErr(e); stopLoop(); if (!body.classList.contains('launched')) reveal(false); }
function toIntro(){
  clearTimers();
  launching = false; phase = 'scroll'; lastQ = -1; lastBar = -1; wantL = 0;
  parts.length = 0; snap = null; snapC = null; shardList = null; accF = 0; accS = 0;
  S = 5; tg = 5; arrT = simT; bgP = 1;
  const old = document.getElementById('fx'); if (old) old.remove();
  body.classList.remove('launched', 'launching', 'flash', 'ready');
  root.style.overflow = 'hidden'; body.style.touchAction = 'none';
  try { ensureScene(); resizeScene(); } catch (e) { showErr(e); }
  startLoop();
}

/* ================= overlay (neural net + captions) ================= */
const NS = 'http://www.w3.org/2000/svg';
const mk = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); byId('nn').append(e); return e; };
const L = [3, 5, 5, 3], X = [90, 230, 370, 510];
const P = L.map((n, i) => Array.from({ length: n }, (_, j) => [X[i], 200 + (j - (n - 1) / 2) * 64]));
const E = [[], [], []], N = P.map(() => []);
for (let i = 0; i < 3; i++) for (const a of P[i]) for (const b of P[i + 1])
  E[i].push(mk('path', { d: `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`, pathLength: 1, class: 'ed' }));
P.forEach((l, i) => l.forEach(a => N[i].push(mk('circle', { cx: a[0], cy: a[1], r: 7, class: 'nd' }))));
const caps = [...document.querySelectorAll('.cap')].map(el => ({ el, o: 0 }));
function domFrame(dt, act, p){
  const q = act === 0 ? 0 : act === 1 ? ramp(p, 0, .85) * 4 : 4;
  if (Math.abs(q - lastQ) > .002) {
    N.forEach((l, i) => l.forEach(n => { n.style.opacity = clamp(q - i); }));
    E.forEach((l, i) => l.forEach(e => { e.style.strokeDashoffset = 1 - clamp(q - i - .5); }));
    lastQ = q;
  }
  const f = act < 2 ? 0 : act === 2 ? ramp(p, 0, .3) : 1;
  byId('nn').style.opacity = 1 - f; byId('nn').style.transform = `translate(-50%,-50%) scale(${1 + f * .2})`;
  const T = [act === 0 ? 1 : 0, (act === 1 && p > .3) || (act === 2 && p < .2) ? 1 : 0,
    (act === 3 && p > .3) || (act === 4 && p < .2) ? 1 : 0, act === 5 && p > .75 && !launching ? 1 : 0];
  const k = 1 - Math.exp(-dt * 7);
  caps.forEach((c, i) => { c.o += (T[i] - c.o) * k; c.el.style.opacity = c.o; c.el.style.transform = `translateY(${(1 - c.o) * 24}px)`; });
  const b = S / 5; if (Math.abs(b - lastBar) > .003) { byId('bar').style.transform = `scaleY(${b})`; lastBar = b; }
}

/* ================= gestures: down = next act, up = previous act (played in reverse) ================= */
function go(d){
  if (phase !== 'scroll' || launching || body.classList.contains('launched')) return;
  if (d > 0 && tg >= 5) {
    if (S >= 4.999) { if (simT - arrT > 150) launch(); } else if (S > 4.3) wantL = 1;
    return;
  }
  if (d < 0) wantL = 0;
  tg = clamp(tg + d, Math.floor(S + 1e-6) - 1, Math.ceil(S - 1e-6) + 1); tg = clamp(tg, 0, 5);
}
const inIntro = () => !body.classList.contains('launched');
addEventListener('wheel', e => {
  if (!inIntro()) return; e.preventDefault();
  const n = performance.now(), fresh = n - lastW > 140; lastW = n;
  if (fresh && Math.abs(e.deltaY) > 4) go(e.deltaY > 0 ? 1 : -1);
}, { passive: false });
addEventListener('touchstart', e => { ty0 = e.touches[0].clientY; }, { passive: true });
addEventListener('touchmove', e => { if (inIntro()) e.preventDefault(); }, { passive: false });
addEventListener('touchend', e => {
  if (ty0 == null || !inIntro()) return;
  const d = ty0 - e.changedTouches[0].clientY; ty0 = null;
  if (d > 28) go(1); else if (d < -28) go(-1);
});
addEventListener('keydown', e => {
  if (!inIntro()) return;
  if (['ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); go(e.shiftKey ? -1 : 1); }
  else if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); }
});

/* ================= main loop ================= */
function startLoop(){ if (!raf) { prevTs = performance.now(); raf = requestAnimationFrame(step); } }
function stopLoop(){ cancelAnimationFrame(raf); raf = 0; }
function launch(){ if (launching) return; launching = true; phase = 'flight'; tPhase = simT; body.classList.add('launching'); }
function step(ts){
  raf = requestAnimationFrame(step);
  if (body.classList.contains('launched')) { stopLoop(); return; }
  try { if (!sceneReady) { ensureScene(); if (!sceneReady) return; } frameStep(ts); } catch (e) { fail(e); }
}
function frameStep(ts){
  const rdt = Math.min(.25, Math.max(0, (ts - prevTs) / 1000)), dt = Math.min(.05, rdt);
  prevTs = ts; simT += rdt * 1000;
  if (phase === 'crack') { crackFrame(); return; }
  const texDone = PL ? texTick(5) : false;
  if (phase === 'scroll' && !perfDone && texDone && ++perfN > 5) {
    perfSum += rdt;
    if (perfN >= 55) { perfDone = true; if (perfSum / 50 > .034) { lowQ = true; W = 0; resizeScene(); } }
  }
  const tt = simT / 1000, pos = POS;
  let warp = 0, fi = 0, padA = 0, shake = 0, pitch = .2, bank = 0, u = 0, vis = 1, act = 5, p = 1;
  PREV[0] = pos[0]; PREV[1] = pos[1]; PREV[2] = pos[2];

  if (phase === 'scroll') {
    if (S !== tg) {
      const fw = tg > S, k = clamp(fw ? Math.floor(S + 1e-9) + 1 : Math.ceil(S - 1e-9), 1, 5), st = rdt * 1000 / DUR[k], was = S;
      S = fw ? Math.min(tg, S + st) : Math.max(tg, S - st);
      if (S >= 5 && was < 5) arrT = simT;
    }
    if (wantL && S >= 4.999 && simT - arrT > 220) { wantL = 0; launch(); }
    [act, p] = stateOf(S);
    domFrame(dt, act, p);
    const r = act < 5 ? 0 : ramp(p, .05, .7);
    pos[0] = 0; pos[1] = YPAD - Math.pow(1 - r, 3) * 16.5; pos[2] = 0;
    fi = act < 5 ? 0 : ramp(p, .6, .95) * (.55 + .08 * Math.sin(simT * .02) + .05 * Math.sin(simT * .047));
    padA = act < 5 ? 0 : ramp(p, 0, .5); shake = fi * 1.4; roll += dt * .7;
  } else if (phase === 'flight') {
    const t = simT - tPhase, ig = ramp(t, 0, FLY_IGN);
    u = clamp((t - FLY_IGN) / FLY_T);
    fi = u > 0 ? 1 : .55 + .45 * ig; shake = u > 0 ? 3 + 14 * u * u * u : 2.5 + 2 * ig;
    padA = 1 - ramp(u, 0, .25); vis = 1 - ramp(u, 0, .35);
    pos[0] = 2.2 * Math.sin(Math.PI * u) * (1 - u) * smooth(ramp(u, 0, .25));
    pos[1] = lerp(YPAD, 0, 1 - Math.pow(1 - smooth(u), 1.8)); pos[2] = ZEND * u * u * u;
    pitch = lerp(.2, Math.PI / 2, smooth(ramp(u, .1, .93)));
    bank = Math.sin(u * Math.PI * 1.5) * .14 * (1 - u); roll += dt * (.7 + 12 * u * u); warp = Math.pow(ramp(u, .5, 1), 2);
  }
  const bt = phase === 'scroll' ? S / 5 : 1;
  bgP += (bt - bgP) * (1 - Math.exp(-dt * 2.5));
  for (let i = 0; i < 3; i++) VEL[i] = dt > 0 ? (pos[i] - PREV[i]) / dt : 0;
  setMat(pitch, bank, roll);
  updateParts(dt, fi, pos, VEL);
  const cap = lowQ ? 110 : 240; if (parts.length > cap) parts.length = cap;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.save();
  const sh = shake + actsShake(act, p); ctx.translate(rn() * sh, rn() * sh);
  drawSky(bgP, tt, warp); drawPad(padA); actsFrame(act, p, tt, vis); drawParts(); drawRocket(pos, fi);
  ctx.restore(); ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
  if (phase === 'flight' && u >= 1) impact();
}

/* ================= impact -> cracks -> shatter ================= */
function impact(){
  const cw = sky.width, ch = sky.height;
  snap = document.createElement('canvas'); snap.width = cw; snap.height = ch;
  const sc = snap.getContext('2d'); sc.drawImage(sky, 0, 0); sc.setTransform(dpr, 0, 0, dpr, 0, 0);
  const R = Math.hypot(W, H) * .22, bg = sc.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, R);
  bg.addColorStop(0, 'rgba(255,255,255,.95)'); bg.addColorStop(.35, 'rgba(255,210,150,.55)'); bg.addColorStop(1, 'rgba(255,140,60,0)');
  sc.fillStyle = bg; sc.fillRect(0, 0, W, H);
  makeCracks();
  snapC = document.createElement('canvas'); snapC.width = cw; snapC.height = ch;
  const cc = snapC.getContext('2d'); cc.drawImage(snap, 0, 0); cc.setTransform(dpr, 0, 0, dpr, 0, 0); drawCracks(cc, 1);
  shardList = buildShards(snapC); phase = 'crack'; tPhase = simT; body.classList.add('flash');
}
function crackFrame(){
  const t = simT - tPhase, g = ramp(t, 0, T_CRACK), e = 1 - Math.pow(1 - g, 2), sh = 9 * (1 - g) + 1.5, ox = rn() * sh, oy = rn() * sh;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#02030b'; ctx.fillRect(0, 0, sky.width, sky.height);
  ctx.drawImage(snap, Math.round(ox * dpr), Math.round(oy * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr); drawCracks(ctx, e);
  if (t >= T_CRACK) shatter();
}

/* ================= events ================= */
addEventListener('resize', () => { if (sceneReady && !body.classList.contains('launched')) { try { resizeScene(); } catch (e) { showErr(e); } } });
if (!reduce) {
  addEventListener('popstate', e => {
    const inChat = body.classList.contains('launched');
    if (e.state && e.state.chat) { if (!inChat) { pushed = true; reveal(false); } }
    else if (inChat) { pushed = false; toIntro(); }
  });
  addEventListener('keydown', e => {
    if (e.key !== 'Backspace' || !body.classList.contains('launched')) return;
    const el = e.target, tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable || document.querySelector('dialog[open]')) return;
    e.preventDefault(); if (pushed) history.back(); else toIntro();
  });
}
let seen = false; try { seen = sessionStorage.getItem('seen') === '1'; } catch {}
if (seen || reduce) reveal();
else { root.style.overflow = 'hidden'; body.style.touchAction = 'none'; try { ensureScene(); } catch (e) { showErr(e); } startLoop(); }
})();
}
