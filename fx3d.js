'use strict';
const DEBUG = true;
const byId = id => document.getElementById(id);
const body = document.body, root = document.documentElement;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ramp = (x, a, b) => b === a ? (x >= b ? 1 : 0) : clamp((x - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const TAU = Math.PI * 2;

function showErr(e){
  if (!DEBUG) return;
  try {
    let el = document.getElementById('dbg');
    if (!el) {
      el = document.createElement('pre'); el.id = 'dbg';
      const s = el.style;
      s.position = 'fixed'; s.left = '8px'; s.right = '8px'; s.top = '8px'; s.zIndex = '99998';
      s.margin = '0'; s.padding = '8px'; s.font = '12px monospace'; s.color = '#ffb4a8';
      s.background = 'rgba(0,0,0,.85)'; s.whiteSpace = 'pre-wrap'; s.maxHeight = '30vh'; s.overflow = 'auto';
      body.append(el);
    }
    el.textContent += String((e && (e.stack || e.message)) || e).slice(0, 500) + '\n';
  } catch {}
}

// timing (ms) and camera setup
const T_IGN = 900, T_FLY = 2400, T_CRACK = 420;
const D = 14, ZEND = D - 2.25, YPAD = -3.85, YG = YPAD - 2.15;

// shared scene state
let sky, ctx, W = 0, H = 0, dpr = 1, nb = null, vig = null, sprites = null;
let sceneReady = false, snap = null, cracks = [], maxScroll = 1;
let roll = 0, accF = 0, accS = 0;
const stars = [], parts = [], POS = [0, 0, 0], PREV = [0, 0, 0], VEL = [0, 0, 0];
const FOC = () => .8 * H;

/* ---------- random + noise ---------- */
function rng(seed){
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const hash = (x, y, s) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177) | 0;
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
};
const vnoise = (x, y, s) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x, y, s, o) => {
  let v = 0, a = .5, f = 1;
  for (let i = 0; i < o; i++) { v += a * vnoise(x * f, y * f, s + i); f *= 2.03; a *= .5; }
  return v;
};

/* ---------- 3D rocket mesh (surface of revolution + fins + windows) ---------- */
const SEG = 28;
const V = [], F = [];
const BAND = [[58, 62, 92], [40, 44, 76], [86, 92, 150], [139, 123, 255], [233, 236, 255], [122, 108, 240]];
const SPEC = [.6, .3, .4, .5, .6, .75];
{
  const rings = [[-2.05, .42], [-1.95, .34], [-1.75, .27], [-1.62, .30], [-1.60, .5], [-1.25, .5], [-1.18, .5], [.2, .5], [.3, .5], [.9, .5]];
  [.2, .4, .55, .68, .8, .9, .96, 1].forEach(t => rings.push([.9 + 1.1 * t, .5 * Math.pow(1 - t * t, .7)]));
  const bands = [0, 0, 0, 1, 2, 3, 4, 3, 4, 5, 5, 5, 5, 5, 5, 5, 5];
  rings.forEach(([y, r]) => {
    for (let j = 0; j < SEG; j++) { const a = j / SEG * TAU; V.push(r * Math.cos(a), y, r * Math.sin(a)); }
  });
  const vi = (i, j) => i * SEG + (j % SEG);
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < SEG; j++) {
    const A = vi(i, j), B = vi(i, j + 1), C = vi(i + 1, j + 1), Dd = vi(i + 1, j);
    const ax = V[A * 3], ay = V[A * 3 + 1], az = V[A * 3 + 2];
    const ux = V[Dd * 3] - ax, uy = V[Dd * 3 + 1] - ay, uz = V[Dd * 3 + 2] - az;
    const wx = V[B * 3] - ax, wy = V[B * 3 + 1] - ay, wz = V[B * 3 + 2] - az;
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const l = Math.hypot(nx, ny, nz) || 1;
    F.push({ i: [A, B, C, Dd], n: [nx / l, ny / l, nz / l], c: BAND[bands[i]], spec: SPEC[bands[i]], em: 0, two: false, decal: false, bias: 0 });
  }
  for (let k = 0; k < 4; k++) {
    const ph = k * TAU / 4 + .785, c = Math.cos(ph), s = Math.sin(ph), base = V.length / 3;
    [[.5, -.2], [1.35, -1.45], [1.35, -1.95], [.5, -1.6]].forEach(([r, y]) => V.push(r * c, y, r * s));
    F.push({ i: [base, base + 1, base + 2, base + 3], n: [-s, 0, c], c: [105, 90, 230], spec: .5, em: 0, two: true, decal: false, bias: 0 });
  }
  const decal = (th, yc, rad, col, em, bias) => {
    const base = V.length / 3, idx = [];
    for (let q = 0; q < 16; q++) {
      const a = q / 16 * TAU, th2 = th + Math.cos(a) * rad / .5, y = yc + Math.sin(a) * rad;
      V.push(.51 * Math.cos(th2), y, .51 * Math.sin(th2)); idx.push(base + q);
    }
    F.push({ i: idx, n: [Math.cos(th), 0, Math.sin(th)], c: col, spec: .9, em, two: false, decal: true, bias });
  };
  decal(.5, .62, .2, [205, 210, 240], 0, -.02);
  decal(.5, .62, .145, [93, 228, 255], .45, -.04);
}
const NV = V.length / 3;
const WX = new Float32Array(NV), WY = new Float32Array(NV), WZ = new Float32Array(NV);
const DD = new Float32Array(NV), SX = new Float32Array(NV), SY = new Float32Array(NV);
const KEY = new Float32Array(F.length), COL = new Array(F.length), order = [];
const mat = new Float32Array(9);
const L1 = [-.55, .6, .58], L2 = [.913, -.183, .365];

function setMat(pitch, bank, rl){
  const ca = Math.cos(pitch), sa = Math.sin(pitch), cb = Math.cos(bank), sb = Math.sin(bank), cr = Math.cos(rl), sr = Math.sin(rl);
  const a00 = cb * cr, a01 = -sb, a02 = cb * sr, a10 = sb * cr, a11 = cb, a12 = sb * sr, a20 = -sr, a22 = cr;
  mat[0] = a00; mat[1] = a01; mat[2] = a02;
  mat[3] = ca * a10 - sa * a20; mat[4] = ca * a11; mat[5] = ca * a12 - sa * a22;
  mat[6] = sa * a10 + ca * a20; mat[7] = sa * a11; mat[8] = sa * a12 + ca * a22;
}

function drawRocket(pos, fi){
  const f = FOC(), cx = W / 2, cy = H / 2;
  for (let i = 0; i < NV; i++) {
    const x = V[i * 3], y = V[i * 3 + 1], z = V[i * 3 + 2];
    const X1 = mat[0] * x + mat[1] * y + mat[2] * z + pos[0];
    const Y1 = mat[3] * x + mat[4] * y + mat[5] * z + pos[1];
    const Z1 = mat[6] * x + mat[7] * y + mat[8] * z + pos[2];
    const d = D - Z1;
    WX[i] = X1; WY[i] = Y1; WZ[i] = Z1; DD[i] = d;
    if (d > .12) { SX[i] = cx + X1 * f / d; SY[i] = cy - Y1 * f / d; }
  }
  order.length = 0;
  const adx = -mat[1], ady = -mat[4], adz = -mat[7];
  for (let q = 0; q < F.length; q++) {
    const fc = F[q], idx = fc.i, k = idx.length;
    let mx = 0, my = 0, mz = 0, bad = false;
    for (let m = 0; m < k; m++) {
      const v = idx[m];
      if (DD[v] <= .12) { bad = true; break; }
      mx += WX[v]; my += WY[v]; mz += WZ[v];
    }
    if (bad) continue;
    mx /= k; my /= k; mz /= k;
    let nx = mat[0] * fc.n[0] + mat[1] * fc.n[1] + mat[2] * fc.n[2];
    let ny = mat[3] * fc.n[0] + mat[4] * fc.n[1] + mat[5] * fc.n[2];
    let nz = mat[6] * fc.n[0] + mat[7] * fc.n[1] + mat[8] * fc.n[2];
    const vx = -mx, vy = -my, vz = D - mz, vl = Math.hypot(vx, vy, vz) || 1;
    let ndv = (nx * vx + ny * vy + nz * vz) / vl;
    if (fc.two) { if (ndv < 0) { nx = -nx; ny = -ny; nz = -nz; ndv = -ndv; } }
    else if (ndv <= (fc.decal ? .25 : 0)) continue;
    const diff = Math.max(0, nx * L1[0] + ny * L1[1] + nz * L1[2]);
    const fill = Math.max(0, nx * L2[0] + ny * L2[1] + nz * L2[2]);
    const hx = L1[0] + vx / vl, hy = L1[1] + vy / vl, hz = L1[2] + vz / vl, hl = Math.hypot(hx, hy, hz) || 1;
    const sp = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / hl), 36) * fc.spec;
    const rim = Math.pow(1 - Math.min(1, ndv), 3) * .5;
    const warm = fi * Math.max(0, nx * adx + ny * ady + nz * adz) * .8;
    const c = fc.c, lit = .14 + .9 * diff + fc.em;
    const r = c[0] * lit + 32 * fill + 60 * rim + 255 * sp + 255 * warm;
    const g = c[1] * lit + 24 * fill + 190 * rim + 255 * sp + 140 * warm;
    const b = c[2] * lit + 80 * fill + 255 * rim + 255 * sp + 40 * warm;
    KEY[q] = vl + fc.bias;
    COL[q] = 'rgb(' + (r > 255 ? 255 : r | 0) + ',' + (g > 255 ? 255 : g | 0) + ',' + (b > 255 ? 255 : b | 0) + ')';
    order.push(q);
  }
  order.sort((a, b) => KEY[b] - KEY[a]);
  ctx.lineWidth = 1; ctx.lineJoin = 'round';
  for (let o = 0; o < order.length; o++) {
    const q = order[o], fc = F[q], idx = fc.i, col = COL[q];
    ctx.beginPath(); ctx.moveTo(SX[idx[0]], SY[idx[0]]);
    for (let m = 1; m < idx.length; m++) ctx.lineTo(SX[idx[m]], SY[idx[m]]);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    if (!fc.decal) { ctx.strokeStyle = col; ctx.stroke(); }
  }
}

/* ---------- exhaust particles ---------- */
const rn = () => Math.random() * 2 - 1;
function updateParts(dt, fi, pos, vel){
  if (fi > 0) {
    const nx = mat[1] * -2.05 + pos[0], ny = mat[4] * -2.05 + pos[1], nz = mat[7] * -2.05 + pos[2];
    const ax = -mat[1], ay = -mat[4], az = -mat[7];
    accF += fi * 260 * dt; accS += fi * 70 * dt;
    while (accF >= 1 && parts.length < 300) {
      accF--;
      const sp = 6 + Math.random() * 5;
      parts.push({ x: nx + rn() * .1, y: ny + rn() * .1, z: nz + rn() * .1,
        vx: ax * sp + rn() * 1.1 + vel[0] * .25, vy: ay * sp + rn() * 1.1 + vel[1] * .25, vz: az * sp + rn() * 1.1 + vel[2] * .25,
        age: 0, life: .3 + Math.random() * .35, s: .35 + Math.random() * .35, k: 0, g: 0 });
    }
    while (accS >= 1 && parts.length < 300) {
      accS--;
      const sp = 2 + Math.random() * 2;
      parts.push({ x: nx + rn() * .2, y: ny + rn() * .2, z: nz + rn() * .2,
        vx: ax * sp + rn() * 1.6 + vel[0] * .15, vy: ay * sp + rn() * 1.6 + vel[1] * .15, vz: az * sp + rn() * 1.6 + vel[2] * .15,
        age: 0, life: 1.2 + Math.random() * 1.2, s: .5 + Math.random() * .3, k: 1, g: 0 });
    }
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.age += dt;
    if (p.age >= p.life) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
    const dr = Math.max(0, 1 - (p.k ? 1.2 : 2.2) * dt);
    p.vx *= dr; p.vy *= dr; p.vz *= dr;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.y < YG) {
      p.y = YG;
      if (!p.g) { p.g = 1; p.vy = Math.abs(p.vy) * .1; p.vx *= 2.6; p.vz *= 2.6; }
    }
  }
}
function drawParts(){
  const f = FOC(), cx = W / 2, cy = H / 2;
  for (let pass = 1; pass >= 0; pass--) {
    ctx.globalCompositeOperation = pass ? 'source-over' : 'lighter';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.k !== pass) continue;
      const d = D - p.z; if (d < .3) continue;
      const a = 1 - p.age / p.life, sx = cx + p.x * f / d, sy = cy - p.y * f / d;
      const rad = Math.max(.6, p.s * (p.k ? 1 + p.age * 1.6 : 1 - .45 * (1 - a)) * f / d);
      if (p.k) { ctx.globalAlpha = a * .3; ctx.drawImage(sprites.sm, sx - rad, sy - rad, rad * 2, rad * 2); }
      else {
        ctx.globalAlpha = Math.min(1, a * 1.4);
        const sp = a > .65 ? sprites.f0 : a > .3 ? sprites.f1 : sprites.f2;
        ctx.drawImage(sp, sx - rad, sy - rad, rad * 2, rad * 2);
      }
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

window.NRP_A = 1;
