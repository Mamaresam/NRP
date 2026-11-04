'use strict';
(() => {
const doc = document, root = doc.documentElement, bodyEl = doc.body;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const eout = k => 1 - Math.pow(1 - k, 3);
const rnd = (a, b) => a + Math.random() * (b - a);
const rng = seed => () => { seed = seed + 0x6D2B79F5 | 0; let k = Math.imul(seed ^ seed >>> 15, 1 | seed); k = k + Math.imul(k ^ k >>> 7, 61 | k) ^ k; return ((k ^ k >>> 14) >>> 0) / 4294967296; };
const mkc = (w, h) => { const c = doc.createElement('canvas'); c.width = w; c.height = h; return c; };
const bgc = doc.getElementById('bgfx'), cmc = doc.getElementById('cmpfx'), orc = doc.getElementById('orbit'), inputEl = doc.getElementById('input');
if (!bgc || !cmc) return;
let LOW = false, dead = false, LIGHT = root.dataset.theme === 'light';
doc.addEventListener('nrp-theme', () => { LIGHT = root.dataset.theme === 'light'; });

/* ---------- sprites ---------- */
function glowSpr(r, g, b, a){
  const c = mkc(64, 64), q = c.getContext('2d'), gr = q.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${r},${g},${b},${a})`); gr.addColorStop(.4, `rgba(${r},${g},${b},${a * .4})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  q.fillStyle = gr; q.fillRect(0, 0, 64, 64); return c;
}
const GLOW = glowSpr(210, 225, 255, .7), GLOWW = glowSpr(255, 244, 225, 1), GLOWB = glowSpr(110, 160, 255, .85), GLOWV = glowSpr(130, 95, 255, .9), GLOWO = glowSpr(255, 150, 70, .95);
const softCache = {};
const SOFT = c => { const k = c.join(','); return softCache[k] || (softCache[k] = glowSpr(c[0], c[1], c[2], .9)); };
const PALS = [
  { kind: 'bands', base: '#d9b27a', cols: ['#f2dcae', '#d9a86a', '#b5763e', '#f6ecd2', '#8a5a38'], atm: 'rgba(255,210,150,.35)', rim: 'rgba(255,225,180,.6)' },
  { kind: 'bands', base: '#5a9bd8', cols: ['#bfe6ff', '#6fb4e8', '#3b7fc0', '#e3f4ff', '#2a5f98'], atm: 'rgba(110,180,255,.4)', rim: 'rgba(170,215,255,.7)' },
  { kind: 'earth', base: '#16508f', cols: ['#3f8f4f', '#2f7a45', '#9a8a52', '#c9bd8a'], cloud: 1, atm: 'rgba(100,170,255,.5)', rim: 'rgba(150,210,255,.8)' },
  { kind: 'lava', base: '#241816', cols: ['#ff7a2a'], atm: 'rgba(255,110,40,.4)', rim: 'rgba(255,150,80,.7)' },
  { kind: 'bands', base: '#8f7ae8', cols: ['#d8c8ff', '#9a86f0', '#6a56d6', '#efe6ff', '#4a3bb8'], ring: 1, atm: 'rgba(160,140,255,.35)', rim: 'rgba(210,195,255,.7)' },
  { kind: 'desert', base: '#b4603c', cols: ['#d9885a', '#e8b088', '#8a3e28'], atm: 'rgba(255,150,110,.3)', rim: 'rgba(255,190,150,.6)' }
];
function mkPlanet(S, p, seed){
  const r = rng(seed), C = Math.ceil(p.ring ? S * 2.6 : S * 1.5), cv = mkc(C, C), g = cv.getContext('2d'), cx = C / 2, R = S / 2;
  let gr = g.createRadialGradient(cx, cx, R * .9, cx, cx, R * 1.45);
  gr.addColorStop(0, p.atm); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, C, C);
  const ring = front => {
    g.save(); g.translate(cx, cx); g.rotate(-.3); g.scale(1, .3);
    g.beginPath(); g.rect(-C, front ? 0 : -C, C * 2, C); g.clip();
    [[1.45, .2, .5], [1.72, .12, .32], [1.95, .16, .42]].forEach(([k, w, a]) => { g.lineWidth = R * w; g.strokeStyle = `rgba(235,225,255,${a})`; g.beginPath(); g.arc(0, 0, R * k, 0, TAU); g.stroke(); });
    g.restore();
  };
  if (p.ring) ring(false);
  g.save(); g.beginPath(); g.arc(cx, cx, R, 0, TAU); g.clip();
  g.fillStyle = p.base; g.fillRect(cx - R, cx - R, S, S);
  const col = () => p.cols[(r() * p.cols.length) | 0];
  if (p.kind === 'bands') {
    for (let i = 0; i < 26; i++) { const hh = R * (.04 + r() * .15); g.globalAlpha = .3 + r() * .5; g.fillStyle = col(); g.save(); g.translate(cx, cx - R + r() * S); g.rotate(-.08); g.fillRect(-R * 1.2, -hh / 2, R * 2.4, hh); g.restore(); }
  } else if (p.kind === 'lava') {
    g.strokeStyle = '#ff7a2a'; g.shadowColor = '#ff6a1a'; g.shadowBlur = R * .12; g.lineWidth = Math.max(1, R * .035);
    for (let i = 0; i < 16; i++) { let x = cx + (r() - .5) * S, y = cx + (r() - .5) * S; g.globalAlpha = .6 + r() * .4; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - .5) * R * .6; y += (r() - .5) * R * .6; g.lineTo(x, y); } g.stroke(); }
    g.shadowBlur = 0;
  } else {
    for (let i = 0; i < 16; i++) { g.globalAlpha = .55 + r() * .4; g.fillStyle = col(); g.beginPath(); g.ellipse(cx + (r() - .5) * S, cx + (r() - .5) * S, R * (.1 + r() * .32), R * (.06 + r() * .2), r() * 3, 0, TAU); g.fill(); }
    if (p.kind === 'desert') for (let i = 0; i < 14; i++) { g.globalAlpha = .35; g.strokeStyle = 'rgba(40,10,5,.8)'; g.lineWidth = 1; g.beginPath(); g.arc(cx + (r() - .5) * S, cx + (r() - .5) * S, R * (.04 + r() * .1), 0, TAU); g.stroke(); }
    if (p.cloud) for (let i = 0; i < 12; i++) { g.globalAlpha = .28 + r() * .25; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx + (r() - .5) * S, cx + (r() - .5) * S, R * (.15 + r() * .35), R * (.03 + r() * .07), r() * .6 - .3, 0, TAU); g.fill(); }
  }
  g.globalAlpha = 1;
  gr = g.createRadialGradient(cx - R * .45, cx - R * .45, R * .2, cx - R * .45, cx - R * .45, R * 2.1);
  gr.addColorStop(0, 'rgba(0,0,12,0)'); gr.addColorStop(.5, 'rgba(0,0,12,.2)'); gr.addColorStop(1, 'rgba(0,0,12,.93)');
  g.fillStyle = gr; g.fillRect(cx - R, cx - R, S, S); g.restore();
  g.lineWidth = 1.4; g.strokeStyle = p.rim; g.beginPath(); g.arc(cx, cx, R, Math.PI * 1.05, Math.PI * 1.65); g.stroke();
  if (p.ring) ring(true);
  return { cv, C, S };
}
function mkGalaxy(S, seed, tint){
  const r = rng(seed), cv = mkc(S, S), g = cv.getContext('2d'), c = S / 2;
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(c, c, 0, c, c, S * .5);
  gr.addColorStop(0, 'rgba(255,240,215,.95)'); gr.addColorStop(.1, 'rgba(255,205,150,.5)');
  gr.addColorStop(.45, `rgba(${tint[0]},${tint[1]},${tint[2]},.1)`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2000; i++) {
    const f = Math.pow(r(), .85), th = f * Math.PI * 3.3, rad = f * S * .46, a = th + (i & 1) * Math.PI + (r() + r() - 1) * (.35 + f * .5);
    const x = c + Math.cos(a) * rad, y = c + Math.sin(a) * rad, w = .12 + (1 - f) * .3, z = .8 + r() * 1.6;
    g.fillStyle = `rgba(${lerp(255, tint[0], f) | 0},${lerp(225, tint[1], f) | 0},${lerp(190, tint[2], f) | 0},${w * (.3 + r() * .7)})`;
    g.fillRect(x, y, z, z);
  }
  return cv;
}
function mkNeb(S, seed, col){
  const r = rng(seed), cv = mkc(S, S), g = cv.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const x = S * (.25 + r() * .5), y = S * (.25 + r() * .5), R = S * (.18 + r() * .25), gr = g.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},.22)`); gr.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
  }
  return cv;
}
const SPR = {
  planets: PALS.map((p, i) => mkPlanet(p.ring ? 80 : 96, p, 100 + i * 7)),
  gal: [[140, 170, 255], [210, 150, 255], [255, 170, 200]].map((c, i) => mkGalaxy(170, 300 + i * 11, c)),
  neb: [[80, 60, 200], [40, 120, 200], [160, 60, 150]].map((c, i) => mkNeb(256, 400 + i * 13, c))
};

/* ---------- full-screen space background ---------- */
const BG = { x: bgc.getContext('2d'), W: 0, H: 0, dpr: 1, stars: [], shoot: [], tShoot: 3, px: 0, py: 0, tpx: 0, tpy: 0 };
const FX = { waves: [], puffs: [], flares: [], sparks: [], embers: [] };
const JL = { x: 0, y: 0, vx: 0, vy: 0, s: 0, vs: 0, k: 0, vk: 0, last: '' };
{
  const r = rng(42), SC = ['#ffffff', '#cfe0ff', '#ffe9d0', '#bcd0ff', '#ffd7f4'], LC = ['#3f4cb0', '#5a4ac0', '#2f6ab0', '#7a4aa8'];
  for (let i = 0; i < 190; i++) BG.stars.push({ x: r(), y: r(), z: .25 + r() * .75, s: .5 + Math.pow(r(), 4) * 2, c: SC[(r() * 5) | 0], lc: LC[(r() * 4) | 0], ph: r() * TAU, sp: .6 + r() * 2.2, v: 2 + r() * 9 });
}
function sizeBG(){
  BG.W = innerWidth; BG.H = innerHeight; BG.dpr = Math.min(devicePixelRatio || 1, LOW ? 1 : 1.5);
  bgc.width = Math.round(BG.W * BG.dpr); bgc.height = Math.round(BG.H * BG.dpr);
}
function softRing(c, x, y, R, w, rgb, a){
  if (a < .005 || R < 1) return;
  const g = c.createRadialGradient(x, y, Math.max(0, R - w), x, y, R + w);
  g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(.5, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, R + w, 0, TAU); c.fill();
}
function drawFlare(c, x, y, k, rot){
  const a = 1 - k, e = eout(k), L = 60 + 130 * e;
  c.save(); c.translate(x, y);
  if (!LIGHT) {
    c.globalCompositeOperation = 'lighter';
    let s = 36 * (1 + 1.2 * e); c.globalAlpha = .9 * a; c.drawImage(GLOWW, -s, -s, s * 2, s * 2);
    s = 70 * (.5 + e); c.globalAlpha = .4 * a; c.drawImage(GLOWB, -s, -s, s * 2, s * 2);
    c.globalAlpha = .55 * a; c.drawImage(GLOWB, -L * 1.6, -5, L * 3.2, 10);
    c.globalAlpha = 1; c.rotate(rot);
    [[0, L], [Math.PI / 2, L * .8], [Math.PI / 4, L * .45], [-Math.PI / 4, L * .45]].forEach(([an, len]) => {
      c.save(); c.rotate(an);
      const g = c.createLinearGradient(-len, 0, len, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, `rgba(255,250,240,${.9 * a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(-len, 0); c.lineTo(0, -1.6 * a - .3); c.lineTo(len, 0); c.lineTo(0, 1.6 * a + .3); c.closePath(); c.fill(); c.restore();
    });
    c.rotate(-rot);
    [[0, '255,90,90'], [.06, '120,255,140'], [.12, '110,150,255']].forEach(([o, col]) => { c.globalAlpha = .14 * a; c.strokeStyle = `rgb(${col})`; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, (42 + 110 * e) * (1 + o), 0, TAU); c.stroke(); });
  } else {
    let s = 40 * (1 + 1.1 * e); c.globalAlpha = .55 * a; c.drawImage(GLOWV, -s, -s, s * 2, s * 2);
    c.globalAlpha = .4 * a; c.drawImage(GLOWV, -L * 1.5, -5, L * 3, 10);
    c.globalAlpha = 1; c.rotate(rot);
    [[0, L], [Math.PI / 2, L * .8]].forEach(([an, len]) => {
      c.save(); c.rotate(an);
      const g = c.createLinearGradient(-len, 0, len, 0);
      g.addColorStop(0, 'rgba(90,70,220,0)'); g.addColorStop(.5, `rgba(90,70,220,${.7 * a})`); g.addColorStop(1, 'rgba(90,70,220,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(-len, 0); c.lineTo(0, -1.5 * a - .3); c.lineTo(len, 0); c.lineTo(0, 1.5 * a + .3); c.closePath(); c.fill(); c.restore();
    });
  }
  c.restore();
}
function drawBG(dt, tt){
  const c = BG.x, W = BG.W, H = BG.H, N = LOW ? 100 : BG.stars.length, ws = FX.waves, add = LIGHT ? 'source-over' : 'lighter';
  c.setTransform(BG.dpr, 0, 0, BG.dpr, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, W, H);
  const pk = Math.min(1, dt * 3); BG.px += (BG.tpx - BG.px) * pk; BG.py += (BG.tpy - BG.py) * pk;
  for (let i = ws.length - 1; i >= 0; i--) { ws[i].t += dt; if (ws[i].t > 3.2) ws.splice(i, 1); }

  for (let i = 0; i < N; i++) {
    const s = BG.stars[i];
    let px = ((s.x * W + tt * s.v * s.z - BG.px * s.z * 18) % W + W) % W, py = s.y * H - BG.py * s.z * 18, boost = 0;
    for (let k = 0; k < ws.length; k++) {
      const w = ws[k], dx = px - w.x, dy = py - w.y, d = Math.hypot(dx, dy) || 1, R = w.t * 520, env = Math.exp(-w.t * 1.15), dd = R - d;
      if (dd > -40) {
        const lead = clamp((dd + 40) / 40), tail = Math.exp(-Math.max(0, dd) / 150), ph = Math.sin(dd / 20 - w.t * 6), push = 44 * env * s.z * lead * tail * ph;
        px += dx / d * push; py += dy / d * push; boost += Math.abs(ph) * lead * tail * env * .6;
      }
      const zone = R * .75 + 40;
      if (d < zone) { const q = 1 - d / zone, sh = 7.5 * env * q * s.z; px += Math.sin(tt * 58 + i * 1.7) * sh; py += Math.cos(tt * 51 + i * 2.3) * sh; boost += .35 * env * q; }
    }
    const a = clamp((.5 + .5 * Math.sin(tt * s.sp + s.ph)) * (.45 + .55 * s.z) + boost * .7), z = s.s * (1 + boost * 1.2);
    c.globalAlpha = LIGHT ? a * .85 : a; c.fillStyle = LIGHT ? s.lc : s.c; c.fillRect(px - z / 2, py - z / 2, z, z);
    if (!LOW && !LIGHT && (s.s > 1.5 || boost > .5)) { c.globalAlpha = a * .35; c.globalCompositeOperation = 'lighter'; c.drawImage(GLOW, px - z * 4, py - z * 4, z * 8, z * 8); c.globalCompositeOperation = 'source-over'; }
  }

  c.globalCompositeOperation = add;
  for (let i = FX.puffs.length - 1; i >= 0; i--) {
    const p = FX.puffs[i]; p.age += dt; if (p.age > p.life) { FX.puffs.splice(i, 1); continue; }
    const k = p.age / p.life, dr = Math.exp(-1.2 * dt); p.vx *= dr; p.vy *= dr; p.x += p.vx * dt; p.y += p.vy * dt;
    const r = lerp(p.s0, p.s1, eout(k)), a = (LIGHT ? .2 : .3) * (1 - k) * clamp(k * 9), sp = SOFT(p.c);
    c.globalAlpha = a;
    for (let l = 0; l < 3; l++) { const o = p.s1 * .18 * k + 4, an = p.rot + l * 2.1 + k * .8; c.drawImage(sp, p.x + Math.cos(an) * o - r, p.y + Math.sin(an) * o - r, r * 2, r * 2); }
  }
  c.globalAlpha = 1;
  for (const w of ws) {
    const R = w.t * 520, a = Math.exp(-w.t * 1.4), wd = 14 + w.t * 10;
    if (LIGHT) softRing(c, w.x, w.y, R, wd, '106,86,232', .22 * a);
    else { softRing(c, w.x, w.y, R - 3, wd, '255,120,110', .13 * a); softRing(c, w.x, w.y, R, wd, '170,210,255', .26 * a); softRing(c, w.x, w.y, R + 3, wd, '120,150,255', .13 * a); softRing(c, w.x, w.y, R * .62, wd * .8, '255,200,150', .1 * a); }
  }
  c.globalAlpha = 1;
  for (let i = FX.flares.length - 1; i >= 0; i--) { const f = FX.flares[i]; f.t += dt / 1.15; if (f.t >= 1) { FX.flares.splice(i, 1); continue; } drawFlare(c, f.x, f.y, f.t, f.rot); }
  c.globalCompositeOperation = add; c.lineCap = 'round';
  for (let i = FX.sparks.length - 1; i >= 0; i--) {
    const p = FX.sparks[i]; p.age += dt; if (p.age > p.life) { FX.sparks.splice(i, 1); continue; }
    const dr = Math.exp(-1.8 * dt); p.vx *= dr; p.vy *= dr; p.x += p.vx * dt; p.y += p.vy * dt;
    const k = p.age / p.life, a = 1 - k; c.globalAlpha = a; c.lineWidth = 1.7 * a + .4;
    c.strokeStyle = LIGHT ? `hsl(${255 + p.h * 70},80%,55%)` : `rgb(255,${(245 - 175 * k) | 0},${(215 - 185 * k) | 0})`;
    c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * .05, p.y - p.vy * .05); c.stroke();
  }
  for (let i = FX.embers.length - 1; i >= 0; i--) {
    const e = FX.embers[i]; e.age += dt; if (e.age > e.life) { FX.embers.splice(i, 1); continue; }
    const dr = Math.exp(-1.1 * dt); e.vx *= dr; e.vy *= dr; e.x += e.vx * dt; e.y += e.vy * dt;
    const k = e.age / e.life, s = 9 * (1 - k * .5); c.globalAlpha = (1 - k) * (.6 + .4 * Math.sin(tt * 13 + e.ph)) * (LIGHT ? .7 : 1);
    c.drawImage(LIGHT ? GLOWV : GLOWO, e.x - s, e.y - s, s * 2, s * 2);
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  BG.tShoot -= dt; if (BG.tShoot <= 0) { BG.tShoot = rnd(4, 9); BG.shoot.push({ x: rnd(W * .35, W * 1.05), y: rnd(0, H * .4), t: 0 }); }
  for (let i = BG.shoot.length - 1; i >= 0; i--) {
    const s = BG.shoot[i]; s.t += dt; if (s.t > .8) { BG.shoot.splice(i, 1); continue; }
    const x = s.x - 900 * s.t, y = s.y + 380 * s.t, a = Math.sin(Math.PI * s.t / .8), g = c.createLinearGradient(x, y, x + 170, y - 72), col = LIGHT ? '80,90,190' : '255,255,255';
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); c.strokeStyle = g; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 170, y - 72); c.stroke();
  }
  // jelly: the whole background behaves like a wobbling gel
  const k1 = 120, c1 = 6.5;
  JL.vx += (-k1 * JL.x - c1 * JL.vx) * dt; JL.x += JL.vx * dt;
  JL.vy += (-k1 * JL.y - c1 * JL.vy) * dt; JL.y += JL.vy * dt;
  JL.vs += (-140 * JL.s - 7 * JL.vs) * dt; JL.s += JL.vs * dt;
  JL.vk += (-110 * JL.k - 6.5 * JL.vk) * dt; JL.k += JL.vk * dt;
  const tf = `translate(${JL.x.toFixed(2)}px,${JL.y.toFixed(2)}px) scale(${(1.05 + JL.s).toFixed(4)},${(1.05 - JL.s * .7).toFixed(4)}) skew(${JL.k.toFixed(3)}deg,${(JL.k * .4).toFixed(3)}deg)`;
  if (tf !== JL.last) { bgc.style.transform = tf; JL.last = tf; }
}
function burst(x, y){
  const W = BG.W, H = BG.H, dxn = (W / 2 - x) / (W / 2), dyn = (H / 2 - y) / (H / 2);
  FX.waves.push({ x, y, t: 0 }); if (FX.waves.length > 4) FX.waves.shift();
  FX.flares.push({ x, y, t: 0, rot: rnd(-.25, .25) });
  const pc = LIGHT ? [[120, 90, 255], [255, 110, 170], [90, 170, 255]] : [[255, 160, 80], [150, 110, 255], [90, 200, 255], [255, 120, 160]];
  for (let i = 0; i < (LOW ? 5 : 9); i++) { const a = rnd(0, TAU), d = rnd(0, 26), v = rnd(18, 70); FX.puffs.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s0: rnd(30, 50), s1: rnd(90, 170), life: rnd(1.6, 2.6), age: 0, c: pc[(Math.random() * pc.length) | 0], rot: rnd(0, TAU) }); }
  for (let i = 0; i < (LOW ? 18 : 36); i++) { const a = rnd(0, TAU), v = rnd(90, 460); FX.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: rnd(.45, 1.2), h: Math.random() }); }
  for (let i = 0; i < 12; i++) { const a = rnd(0, TAU), v = rnd(15, 90); FX.embers.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: rnd(1.2, 2.4), ph: rnd(0, TAU) }); }
  if (FX.sparks.length > 130) FX.sparks.splice(0, FX.sparks.length - 130);
  if (FX.puffs.length > 36) FX.puffs.splice(0, FX.puffs.length - 36);
  if (FX.embers.length > 40) FX.embers.splice(0, FX.embers.length - 40);
  JL.vx = clamp(JL.vx + dxn * 55, -110, 110); JL.vy = clamp(JL.vy + dyn * 55, -110, 110);
  JL.vs = clamp(JL.vs + .35, -.6, .6); JL.vk = clamp(JL.vk - dxn * 14, -26, 26);
}

/* ---------- composer strip: horizontal flight past planets, galaxies, nebulae ---------- */
const CF = { x: cmc.getContext('2d'), w: 0, h: 0, dpr: 1, stars: [], objs: [], tP: .2, tG: 1.2, tN: .4, init: false };
function spawn(kind, rx){
  const w = CF.w, h = CF.h, pick = a => a[(Math.random() * a.length) | 0]; let o;
  if (kind === 'planet') { const sp = pick(SPR.planets), s = rnd(.5, 1.15) * h * (Math.random() < .2 ? 1.6 : 1); o = { k: 'p', sp, s, y: rnd(.1, .9) * h, v: rnd(120, 200), al: .92, half: s * sp.C / sp.S / 2 }; }
  else if (kind === 'galaxy') { const s = rnd(80, 150); o = { k: 'g', sp: pick(SPR.gal), s, y: rnd(.1, .9) * h, v: rnd(70, 120), rot: rnd(0, TAU), rv: rnd(-.3, .3), tilt: rnd(.35, .7), al: .8, half: s / 2 }; }
  else { const s = rnd(140, 260); o = { k: 'n', sp: pick(SPR.neb), s, y: rnd(.1, .9) * h, v: rnd(45, 85), al: rnd(.55, .9), half: s / 2 }; }
  o.x = rx !== undefined ? rx : w + o.half + 10; CF.objs.push(o);
}
function sizeCF(){
  const r = cmc.parentElement.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
  if (!w || !h) return;
  const dpr = Math.min(devicePixelRatio || 1, LOW ? 1 : 1.5);
  if (CF.w && (CF.w !== w || CF.h !== h)) { const sx = w / CF.w, sy = h / CF.h; CF.stars.forEach(s => { s.x *= sx; s.y *= sy; }); CF.objs.forEach(o => { o.y *= sy; }); }
  cmc.width = Math.round(w * dpr); cmc.height = Math.round(h * dpr); CF.w = w; CF.h = h; CF.dpr = dpr;
  if (!CF.init) {
    CF.init = true;
    for (let i = 0; i < 70; i++) CF.stars.push({ x: rnd(0, w), y: rnd(0, h), z: rnd(.2, 1) });
    spawn('neb', rnd(0, w)); spawn('neb', rnd(0, w)); spawn('galaxy', rnd(0, w)); spawn('planet', rnd(0, w * .5)); spawn('planet', rnd(w * .5, w));
  }
}
function drawCF(dt){
  const c = CF.x, w = CF.w, h = CF.h; if (!w) return;
  const mul = reduce ? 0 : (typeof busy !== 'undefined' && busy ? 2.6 : (doc.activeElement === inputEl ? 1.35 : 1));
  c.setTransform(CF.dpr, 0, 0, CF.dpr, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, w, h);
  c.fillStyle = 'rgba(4,6,22,.8)'; c.fillRect(0, 0, w, h);
  if (!reduce) {
    CF.tP -= dt * mul; CF.tG -= dt * mul; CF.tN -= dt * mul;
    if (CF.tP <= 0) { CF.tP = rnd(1.3, 3); spawn('planet'); }
    if (CF.tG <= 0) { CF.tG = rnd(3.5, 6.5); spawn('galaxy'); }
    if (CF.tN <= 0) { CF.tN = rnd(2.5, 5); spawn('neb'); }
  }
  const O = CF.objs;
  for (let i = O.length - 1; i >= 0; i--) { const o = O[i]; o.x -= o.v * dt * mul; if (o.k === 'g') o.rot += o.rv * dt; if (o.x < -o.half - 12) O.splice(i, 1); }
  c.globalCompositeOperation = 'lighter';
  for (const o of O) if (o.k === 'n') { c.globalAlpha = o.al; c.drawImage(o.sp, o.x - o.half, o.y - o.half, o.s, o.s); }
  c.globalCompositeOperation = 'source-over'; c.fillStyle = '#e8eeff';
  for (const s of CF.stars) {
    const v = 40 + s.z * 260; s.x -= v * dt * mul; if (s.x < -8) { s.x += w + 16; s.y = rnd(0, h); }
    c.globalAlpha = .25 + .65 * s.z; c.fillRect(s.x, s.y, Math.max(1.2, v * .028 * Math.max(1, mul)), s.z > .7 ? 1.4 : 1);
  }
  c.globalCompositeOperation = 'lighter';
  for (const o of O) if (o.k === 'g') { c.save(); c.translate(o.x, o.y); c.rotate(o.rot); c.scale(1, o.tilt); c.globalAlpha = o.al; c.drawImage(o.sp, -o.half, -o.half, o.s, o.s); c.restore(); }
  c.globalCompositeOperation = 'source-over';
  for (const o of O) if (o.k === 'p') { const d = o.s * o.sp.C / o.sp.S; c.globalAlpha = o.al; c.drawImage(o.sp.cv, o.x - d / 2, o.y - d / 2, d, d); }
  c.globalAlpha = 1;
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(4,6,22,.7)'); g.addColorStop(.16, 'rgba(4,6,22,0)'); g.addColorStop(.84, 'rgba(4,6,22,0)'); g.addColorStop(1, 'rgba(4,6,22,.7)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
}

/* ---------- "Ask anything." text orbiting a planet inside a rock belt ---------- */
const OR = { x: orc ? orc.getContext('2d') : null, w: 0, dpr: 1, items: [], rocks: [], u: 0, fa: false, font: '', tex: null };
const RX = 210, RY = 58, PHI = -.17, CX = 260, CY = 125, RM = 138, PR = 34, cphi = Math.cos(PHI), sphi = Math.sin(PHI);
function mkOrbTex(){
  const r = rng(21), cv = mkc(256, 128), g = cv.getContext('2d'), cs = ['#d8c8ff', '#9a86f0', '#4a3bb8', '#8fe6ff', '#efe6ff', '#5de4ff'];
  g.fillStyle = '#6a56d6'; g.fillRect(0, 0, 256, 128);
  for (let y = 0; y < 128; y += 2) { g.globalAlpha = .3 + r() * .5; g.fillStyle = cs[(r() * cs.length) | 0]; g.fillRect(0, y, 256, 2 + ((r() * 5) | 0)); }
  for (let k = 0; k < 26; k++) {
    g.globalAlpha = .15 + r() * .25; g.fillStyle = r() < .5 ? '#fff' : '#12083a';
    const x = r() * 256, y = r() * 128, rx = 6 + r() * 24, ry = 2 + r() * 6;
    for (const o of [-256, 0, 256]) { g.beginPath(); g.ellipse(x + o, y, rx, ry, 0, 0, TAU); g.fill(); }
  }
  return cv;
}
function layoutOrbit(){
  if (!orc || !OR.x) return;
  const x = OR.x, fa = lang === 'fa', txt = t('askAnything');
  OR.fa = fa; OR.font = fa ? '700 30px Vazirmatn, Inter, Tahoma, system-ui, sans-serif' : '700 34px Inter, Vazirmatn, system-ui, sans-serif';
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.font = OR.font;
  const parts = fa ? txt.split(/(\s+)/).filter(Boolean) : [...txt], ws = parts.map(p => x.measureText(p).width);
  x.restore();
  const tot = ws.reduce((a, b) => a + b, 0), k = Math.min(2.3, TAU * RM * .78 / tot);
  let cum = 0; OR.items = [];
  parts.forEach((p, i) => { const w = ws[i] * k; if (p.trim()) OR.items.push({ ch: p, off: cum + w / 2, f: i / Math.max(1, parts.length - 1) }); cum += w; });
  const span = cum / RM; OR.u = fa ? span / 2 - Math.PI / 2 : Math.PI / 2 + span / 2;
  orc.setAttribute('aria-label', txt);
}
function drawOrbit(dt, tt){
  const w = orc.getBoundingClientRect().width; if (!w) return;
  if (Math.abs(w - OR.w) > 1) { OR.w = w; OR.dpr = Math.min(devicePixelRatio || 1, 2); orc.width = Math.round(w * OR.dpr); orc.height = Math.round(w * 250 / 520 * OR.dpr); }
  const x = OR.x, fa = OR.fa, sc0 = w / 520 * OR.dpr;
  if (!reduce) OR.u += dt * .4;
  x.setTransform(sc0, 0, 0, sc0, 0, 0); x.globalAlpha = 1; x.clearRect(0, 0, 520, 250);
  const place = (th, k, dy) => { const ex = RX * k * Math.cos(th), ey = RY * k * Math.sin(th); return [CX + ex * cphi - ey * sphi, CY + ex * sphi + ey * cphi + dy, Math.sin(th)]; };
  const pass = front => {
    for (const r of OR.rocks) {
      const p = place(r.a + (fa ? -1 : 1) * OR.u * r.v * 1.1, r.rr, r.dy); if ((p[2] >= 0) !== front) continue;
      const k = (p[2] + 1) / 2, s = r.s * (.7 + .5 * k), tn = r.tone * (.55 + .45 * k);
      x.globalAlpha = .45 + .55 * k; x.fillStyle = `rgb(${(165 * tn) | 0},${(145 * tn) | 0},${(128 * tn) | 0})`; x.beginPath(); x.arc(p[0], p[1], s, 0, TAU); x.fill();
      if (s > 1.6) { x.fillStyle = `rgba(255,235,210,${.35 * k})`; x.beginPath(); x.arc(p[0] - s * .3, p[1] - s * .3, s * .45, 0, TAU); x.fill(); }
    }
    x.font = OR.font; x.textAlign = 'center'; x.textBaseline = 'middle'; if ('direction' in x) x.direction = fa ? 'rtl' : 'ltr';
    for (const it of OR.items) {
      const p = place(fa ? -OR.u + it.off / RM : OR.u - it.off / RM, 1, 0); if ((p[2] >= 0) !== front) continue;
      const k = (p[2] + 1) / 2, s = .78 + .3 * k;
      x.save(); x.translate(p[0], p[1]); x.scale(s, s); x.globalAlpha = .3 + .7 * k;
      x.fillStyle = LIGHT ? `hsl(${238 + it.f * 60},58%,36%)` : `hsl(${190 + it.f * 70},90%,${84 - it.f * 12}%)`;
      if (front && !LIGHT) { x.shadowColor = 'rgba(93,228,255,.75)'; x.shadowBlur = 12; }
      x.fillText(it.ch, 0, 0); x.restore();
    }
  };
  let g = x.createRadialGradient(CX, CY, PR * .9, CX, CY, PR * 2.1);
  g.addColorStop(0, 'rgba(150,130,255,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(CX - PR * 2.2, CY - PR * 2.2, PR * 4.4, PR * 4.4);
  pass(false);
  x.save(); x.beginPath(); x.arc(CX, CY, PR, 0, TAU); x.clip(); x.globalAlpha = 1;
  const ww = PR * 4, ox = CX - PR - ((tt * .012) % 1) * ww;
  x.drawImage(OR.tex, ox, CY - PR, ww, PR * 2); x.drawImage(OR.tex, ox + ww, CY - PR, ww, PR * 2);
  g = x.createRadialGradient(CX - PR * .5, CY - PR * .5, PR * .2, CX - PR * .5, CY - PR * .5, PR * 2.2);
  g.addColorStop(0, 'rgba(0,0,12,0)'); g.addColorStop(.5, 'rgba(0,0,12,.25)'); g.addColorStop(1, 'rgba(0,0,12,.95)');
  x.fillStyle = g; x.fillRect(CX - PR, CY - PR, PR * 2, PR * 2); x.restore();
  x.lineWidth = 1.5; x.strokeStyle = 'rgba(190,210,255,.6)'; x.beginPath(); x.arc(CX, CY, PR, Math.PI * 1.05, Math.PI * 1.65); x.stroke();
  pass(true);
}

/* ---------- events ---------- */
const IGN = 'button,input,textarea,dialog,a,label,.msg,.composer';
let pd = null;
addEventListener('pointerdown', e => { pd = { x: e.clientX, y: e.clientY, t: performance.now() }; }, { passive: true });
addEventListener('pointerup', e => {
  const p = pd; pd = null;
  if (!p || reduce || dead || !bodyEl.classList.contains('launched')) return;
  if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 12 || performance.now() - p.t > 600) return;
  if (e.target instanceof Element && e.target.closest(IGN)) return;
  burst(e.clientX, e.clientY);
}, { passive: true });
addEventListener('pointermove', e => { BG.tpx = e.clientX / innerWidth - .5; BG.tpy = e.clientY / innerHeight - .5; }, { passive: true });
addEventListener('resize', () => { sizeBG(); sizeCF(); });
doc.addEventListener('nrp-lang', layoutOrbit);

/* ---------- loop ---------- */
let last = performance.now(), tt = 0, nf = 0, fsum = 0, skip = 0;
function fail(e){ dead = true; root.classList.remove('fx-on'); bgc.style.transform = ''; if (typeof showErr === 'function') showErr(e); }
function loop(ts){
  if (dead) return;
  requestAnimationFrame(loop);
  const raw = Math.min(.1, Math.max(0, (ts - last) / 1000)); last = ts;
  if (doc.hidden || !bodyEl.classList.contains('launched')) return;
  if (reduce && (skip++ % 24)) return;
  try {
    const dt = reduce ? 0 : raw; tt += dt;
    drawBG(dt, tt); drawCF(dt);
    if (orc && orc.isConnected && OR.x) drawOrbit(dt, tt);
    if (!LOW && !reduce && ++nf > 12 && nf <= 100) { fsum += raw; if (nf === 100 && fsum / 88 > .036) { LOW = true; sizeBG(); sizeCF(); } }
  } catch (e) { fail(e); }
}
try {
  OR.tex = mkOrbTex();
  OR.rocks = Array.from({ length: 120 }, () => ({ a: rnd(0, TAU), rr: .86 + Math.random() * .3, dy: (Math.random() - .5) * 12, s: .7 + Math.pow(Math.random(), 2) * 2.6, v: .8 + Math.random() * .5, tone: .5 + Math.random() * .6 }));
  layoutOrbit(); sizeBG(); sizeCF();
  if ('ResizeObserver' in window) new ResizeObserver(sizeCF).observe(cmc.parentElement);
  root.classList.add('fx-on');
  requestAnimationFrame(loop);
} catch (e) { fail(e); }
})();
