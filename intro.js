'use strict';
(() => {
const DEBUG = true;
const $ = id => document.getElementById(id), body = document.body, root = document.documentElement;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ramp = (x, a, b) => b === a ? (x >= b ? 1 : 0) : clamp((x - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI * 2;

function showErr(e){
  if (!DEBUG) return;
  try {
    let el = document.getElementById('dbg');
    if (!el) {
      el = document.createElement('pre'); el.id = 'dbg';
      const s = el.style;
      s.position = 'fixed'; s.left = '8px'; s.right = '8px'; s.bottom = '8px'; s.zIndex = '99';
      s.margin = '0'; s.padding = '8px'; s.font = '12px monospace'; s.color = '#ffb4a8';
      s.background = 'rgba(0,0,0,.85)'; s.whiteSpace = 'pre-wrap'; s.maxHeight = '40vh'; s.overflow = 'auto';
      body.append(el);
    }
    el.textContent += String((e && (e.stack || e.message)) || e).slice(0, 500) + '\n';
  } catch {}
}
addEventListener('error', ev => showErr(ev.error || ev.message));

// timing (ms) and camera setup
const T_IGN = 900, T_FLY = 2400, T_CRACK = 420;
const D = 14, ZEND = D - 2.25, YPAD = -3.85, YG = YPAD - 2.15;
const FOC = () => .8 * H;

let launching = false, pushed = false, last = '', lastP = -1;
let raf = 0, prevTs = 0, simT = 0, phase = 'scroll', tPhase = 0, maxScroll = 1, scrollP = 0, atEnd = false;
let timers = [];
let sky, ctx, W = 0, H = 0, dpr = 1, nb = null, vig = null, sprites = null, stars = [];
let sceneReady = false, snap = null, cracks = [];
let roll = 0, accF = 0, accS = 0;
const parts = [], POS = [0, 0, 0], PREV = [0, 0, 0], VEL = [0, 0, 0];
try { history.scrollRestoration = 'manual'; } catch {}

const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

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

/* ---------- navigation between intro and chat ---------- */
function reveal(push = true){
  clearTimers();
  launching = true; phase = 'done';
  body.classList.remove('launching', 'ready');
  body.classList.add('launched');
  try { sessionStorage.setItem('seen', '1'); } catch {}
  root.style.overflow = ''; scrollTo(0, 0);
  void body.offsetHeight;
  later(() => {
    if (!body.classList.contains('launched')) return;
    body.classList.remove('flash');
    body.classList.add('ready');
  }, 1200);
  if (push && !reduce && !pushed) { try { history.pushState({ chat: 1 }, ''); pushed = true; } catch {} }
}
function fail(e){
  showErr(e); stop();
  if (!body.classList.contains('launched')) reveal(false);
}
// back to the launch scene (rocket on the pad, ready to fly again)
function toIntro(){
  clearTimers();
  launching = false; last = ''; lastP = -1; phase = 'scroll';
  parts.length = 0; snap = null; accF = accS = 0;
  const old = document.getElementById('fx'); if (old) old.remove();
  body.classList.remove('launched', 'launching', 'flash', 'ready');
  root.style.overflow = '';
  try { ensureScene(); resizeScene(); } catch (e) { showErr(e); }
  requestAnimationFrame(() => { scrollTo(0, Math.round(maxScroll * .9)); start(); });
}

/* ---------- neural network overlay (DOM) ---------- */
const NS = 'http://www.w3.org/2000/svg';
const mk = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); $('nn').append(e); return e; };
const L = [3, 5, 5, 3], X = [90, 230, 370, 510];
const P = L.map((n, i) => Array.from({ length: n }, (_, j) => [X[i], 200 + (j - (n - 1) / 2) * 64]));
const E = [[], [], []], N = P.map(() => []);
for (let i = 0; i < 3; i++) for (const a of P[i]) for (const b of P[i + 1])
  E[i].push(mk('path', { d: `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`, pathLength: 1, class: 'ed' }));
P.forEach((l, i) => l.forEach(a => N[i].push(mk('circle', { cx: a[0], cy: a[1], r: 7, class: 'nd' }))));
const caps = [...document.querySelectorAll('.cap')].map(el => ({ el, r: el.dataset.r.split(',').map(Number) }));

function domFrame(p){
  const q = ramp(p, .04, .5) * 4, f = ramp(p, .5, .7);
  N.forEach((l, i) => l.forEach(n => { n.style.opacity = clamp(q - i); }));
  E.forEach((l, i) => l.forEach(e => { e.style.strokeDashoffset = 1 - clamp(q - i - .5); }));
  $('nn').style.opacity = 1 - f;
  $('nn').style.transform = `translate(-50%,-50%) scale(${1 + f * .25})`;
  caps.forEach(({ el, r }) => {
    const i = ramp(p, r[0], r[1]), o = ramp(p, r[2], r[3]);
    el.style.opacity = i * (1 - o);
    el.style.transform = `translateY(${(1 - i) * 30 - o * 30}px)`;
  });
  const n = p < .8 ? '' : p < .87 ? '3' : p < .94 ? '2' : '1';
  if (n !== last) { $('count').textContent = n; last = n; }
  $('bar').style.transform = `scaleY(${p})`;
}

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

/* ---------- space background ---------- */
const BANDA = .9;
function buildNebula(){
  const bw = 170, bh = clamp(Math.round(bw * H * 1.4 / W), 140, 520);
  const c = document.createElement('canvas'); c.width = bw; c.height = bh;
  const g = c.getContext('2d'), img = g.createImageData(bw, bh), d = img.data;
  const sA = Math.sin(BANDA), cA = Math.cos(BANDA);
  let k = 0;
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++, k += 4) {
    const u = x / bw * 3, v = y / bw * 3;
    const wx = fbm(u + 5.2, v + 1.3, 11, 3), wy = fbm(u + 8.1, v + 3.7, 17, 3);
    const n1 = fbm(u + wx * 1.9, v + wy * 1.9, 3, 5);
    const n2 = fbm(u * 1.7 - wy * 1.5 + 20, v * 1.7 + wx * 1.5, 29, 4);
    const dd = (x / bw - .5) * sA - (y / bh - .5) * cA;
    const band = Math.exp(-dd * dd * 10);
    const a1 = Math.pow(clamp((n1 - .42) * 2.6), 1.7) * (.3 + band);
    const a2 = Math.pow(clamp((n2 - .48) * 3.2), 2) * (.2 + .8 * band);
    const dust = clamp((fbm(u * 2.4 + 40, v * 2.4 + 9, 41, 3) - .5) * 4) * band;
    const m = a1 * a2, dk = 1 - dust * .75;
    d[k] = clamp((4 + a1 * 120 + a2 * 30 + m * 260 + band * a1 * 40) * dk, 0, 255);
    d[k + 1] = clamp((6 + a1 * 55 + a2 * 150 + m * 40 + band * a1 * 25) * dk, 0, 255);
    d[k + 2] = clamp((18 + a1 * 200 + a2 * 210 + m * 130) * dk, 0, 255);
    d[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  nb = c;
}
function mkSprite(r, g, b, a){
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${r},${g},${b},${a})`);
  gr.addColorStop(.4, `rgba(${r},${g},${b},${a * .45})`);
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return c;
}
function planet(x, y, r, c0, c1, c2, glow, ring, bands){
  if (y - r * 2 > H || y + r * 2 < 0) return;
  const g1 = ctx.createRadialGradient(x, y, r * .9, x, y, r * 1.55);
  g1.addColorStop(0, glow); g1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(x, y, r * 1.55, 0, TAU); ctx.fill();
  const drawRing = front => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-.32);
    ctx.lineWidth = r * .2; ctx.strokeStyle = front ? 'rgba(225,215,255,.4)' : 'rgba(225,215,255,.22)';
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.75, r * .42, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); ctx.stroke();
    ctx.lineWidth = r * .05; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
    ctx.restore();
  };
  if (ring) drawRing(false);
  const g = ctx.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r);
  g.addColorStop(0, c0); g.addColorStop(.55, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  if (bands) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-.2);
    for (let i = -4; i <= 4; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.07)' : 'rgba(30,10,80,.14)';
      ctx.fillRect(-r, i * r * .2, r * 2, r * .11);
    }
    ctx.restore();
  }
  const t = ctx.createRadialGradient(x - r * .55, y - r * .55, r * .6, x - r * .55, y - r * .55, r * 2.1);
  t.addColorStop(0, 'rgba(0,0,12,0)'); t.addColorStop(.55, 'rgba(0,0,12,.15)'); t.addColorStop(1, 'rgba(0,0,12,.9)');
  ctx.fillStyle = t; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
  ctx.lineWidth = 1.5; ctx.strokeStyle = glow; ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 1.05, Math.PI * 1.65); ctx.stroke();
  if (ring) drawRing(true);
}
function drawSky(p, tt, warp){
  const cx = W / 2, cy = H / 2;
  ctx.fillStyle = '#02030b'; ctx.fillRect(-20, -20, W + 40, H + 40);
  const s = Math.max(W / nb.width, H * 1.4 / nb.height) * 1.06, nw = nb.width * s, nh = nb.height * s;
  ctx.save(); ctx.translate(cx, cy); const k = 1 + warp * .5; ctx.scale(k, k);
  ctx.drawImage(nb, -nw / 2, -cy - (nh - H) * p, nw, nh);
  ctx.restore();
  for (const st of stars) {
    let y = (st.y - p * .3 * st.z) % 1; if (y < 0) y += 1;
    let x = st.x * W; y *= H;
    if (warp) {
      const w = 1 + warp * (.6 + 3 * st.z);
      x = cx + (x - cx) * w; y = cy + (y - cy) * w;
      if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
    }
    const a = (.55 + .45 * Math.sin(tt * st.sp + st.ph)) * (.5 + .5 * st.z);
    const z = st.s * (1 + warp * .8);
    ctx.globalAlpha = a; ctx.fillStyle = st.c;
    ctx.fillRect(x - z / 2, y - z / 2, z, z);
    if (st.s > 1.4) { ctx.globalAlpha = a * .35; ctx.drawImage(sprites.glow, x - z * 4, y - z * 4, z * 8, z * 8); }
  }
  ctx.globalAlpha = 1;
  const m = Math.min(W, H), w = 1 + warp * 1.3;
  const at = (x, y) => [cx + (x - cx) * w, cy + (y - cy) * w];
  let [px, py] = at(W * .8 - p * W * .18, H * .68 - p * H * .66);
  planet(px, py, m * .2 * w, 'rgb(255,226,246)', 'rgb(139,123,255)', 'rgb(24,16,80)', 'rgba(139,123,255,.45)', true, true);
  [px, py] = at(W * .14 + p * W * .12, H * 1.1 - p * H * 1.0);
  planet(px, py, m * .13 * w, 'rgb(220,252,255)', 'rgb(70,200,235)', 'rgb(8,50,80)', 'rgba(93,228,255,.4)', false, false);
}
function drawPad(alpha){
  if (alpha <= .01) return;
  const k = FOC() / D, px = W / 2, py = H / 2 - (YPAD - 2.1) * k, rx = 2.3 * k;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(px, py); ctx.scale(1, .3);
  const g = ctx.createRadialGradient(0, 0, rx * .2, 0, 0, rx * 1.6);
  g.addColorStop(0, 'rgba(93,228,255,.5)'); g.addColorStop(1, 'rgba(93,228,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx * 1.6, 0, TAU); ctx.fill();
  const g2 = ctx.createRadialGradient(0, -rx * .2, 0, 0, 0, rx);
  g2.addColorStop(0, '#5662c8'); g2.addColorStop(1, '#262b66');
  ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(160,215,255,.7)'; ctx.str
