'use strict';
(() => {
const doc = document, root = doc.documentElement, bodyEl = doc.body;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const rnd = (a, b) => a + Math.random() * (b - a);
const rng = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const mkc = (w, h) => { const c = doc.createElement('canvas'); c.width = w; c.height = h; return c; };
const bgc = doc.getElementById('bgfx'), cmc = doc.getElementById('cmpfx'), orc = doc.getElementById('orbit'), inputEl = doc.getElementById('input');
if (!bgc || !cmc) return;
let LOW = false, dead = false;

/* ---------- sprites ---------- */
function glowSpr(r, g, b, a){
  const c = mkc(64, 64), x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${r},${g},${b},${a})`); gr.addColorStop(.4, `rgba(${r},${g},${b},${a * .4})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return c;
}
const GLOW = glowSpr(210, 225, 255, .7);
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

/* ---------- full-screen space background (stars, tap shockwaves, starbursts) ---------- */
const BG = { x: bgc.getContext('2d'), W: 0, H: 0, dpr: 1, stars: [], waves: [], flares: [], sparks: [], shoot: [], tShoot: 3, px: 0, py: 0, tpx: 0, tpy: 0 };
{
  const r = rng(42), SC = ['#ffffff', '#cfe0ff', '#ffe9d0', '#bcd0ff', '#ffd7f4'];
  for (let i = 0; i < 190; i++) BG.stars.push({ x: r(), y: r(), z: .25 + r() * .75, s: .5 + Math.pow(r(), 4) * 2, c: SC[(r() * 5) | 0], ph: r() * TAU, sp: .6 + r() * 2.2, v: 2 + r() * 9 });
}
function sizeBG(){
  BG.W = innerWidth; BG.H = innerHeight; BG.dpr = Math.min(devicePixelRatio || 1, LOW ? 1 : 1.5);
  bgc.width = Math.round(BG.W * BG.dpr); bgc.height = Math.round(BG.H * BG.dpr);
}
function drawFlare(c, x, y, k, rot){
  const a = 1 - k, e = 1 - Math.pow(1 - k, 3), L = 40 + 120 * e, gR = 90 * (.4 + e);
  c.save(); c.translate(x, y); c.rotate(rot);
  const g0 = c.createRadialGradient(0, 0, 0, 0, 0, gR); g0.addColorStop(0, `rgba(255,240,215,${.8 * a})`); g0.addColorStop(1, 'rgba(255,170,90,0)');
  c.fillStyle = g0; c.beginPath(); c.arc(0, 0, gR, 0, TAU); c.fill();
  [[0, L, 2.2], [Math.PI / 2, L, 2.2], [Math.PI / 4, L * .55, 1.4], [-Math.PI / 4, L * .55, 1.4]].forEach(([an, len, lw]) => {
    c.save(); c.rotate(an);
    const lg = c.createLinearGradient(-len, 0, len, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.5, `rgba(255,255,255,${.95 * a})`); lg.addColorStop(1, 'rgba(255,255,255,0)');
    c.strokeStyle = lg; c.lineWidth = lw * a + .4; c.beginPath(); c.moveTo(-len, 0); c.lineTo(len, 0); c.stroke(); c.restore();
  });
  c.restore();
}
function drawBG(dt, tt){
  const c = BG.x, W = BG.W, H = BG.H, N = LOW ? 100 : BG.stars.length, ws = BG.waves;
  c.setTransform(BG.dpr, 0, 0, BG.dpr, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, W, H);
  const pk = Math.min(1, dt * 3); BG.px += (BG.tpx - BG.px) * pk; BG.py += (BG.tpy - BG.py) * pk;
  for (let i = ws.length - 1; i >= 0; i--) { ws[i].t += dt; if (ws[i].t > 2.6) ws.splice(i, 1); }
  for (let i = 0; i < N; i++) {
    const s = BG.stars[i];
    let x = ((s.x * W + tt * s.v * s.z - BG.px * s.z * 18) % W + W) % W, y = s.y * H - BG.py * s.z * 18, boost = 0;
    for (let k = 0; k < ws.length; k++) {
      const w = ws[k], dx = x - w.x, dy = y - w.y, d = Math.hypot(dx, dy) || 1, R = w.t * 460, env = Math.exp(-w.t * 1.5);
      const ring = Math.exp(-((d - R) * (d - R)) / (2 * 70 * 70)), push = 30 * env * ring * s.z, zone = R * .7 + 50;
      x += dx / d * push; y += dy / d * push; boost += ring * env;
      if (d < zone) { const q = 1 - d / zone, sh = 4.5 * env * q * s.z; x += Math.sin(tt * 58 + i * 1.7) * sh; y += Math.cos(tt * 51 + i * 2.3) * sh; boost += .3 * env * q; }
    }
    const a = clamp((.5 + .5 * Math.sin(tt * s.sp + s.ph)) * (.45 + .55 * s.z) + boost * .7), z = s.s * (1 + boost * 1.2);
    c.globalAlpha = a; c.fillStyle = s.c; c.fillRect(x - z / 2, y - z / 2, z, z);
    if (!LOW && (s.s > 1.5 || boost > .5)) { c.globalAlpha = a * .35; c.globalCompositeOperation = 'lighter'; c.drawImage(GLOW, x - z * 4, y - z * 4, z * 8, z * 8); c.globalCompositeOperation = 'source-over'; }
  }
  c.globalCompositeOperation = 'lighter';
  for (const w of ws) {
    const a = 1 - w.t / 2.6, R = w.t * 460; if (a <= 0) continue;
    c.globalAlpha = 1; c.lineWidth = 1.5 + w.t * 5 * a; c.strokeStyle = `rgba(170,200,255,${.35 * a})`; c.beginPath(); c.arc(w.x, w.y, R, 0, TAU); c.stroke();
    c.lineWidth = 1.2; c.strokeStyle = `rgba(255,200,150,${.22 * a})`; c.beginPath(); c.arc(w.x, w.y, R * .62, 0, TAU); c.stroke();
  }
  c.globalAlpha = 1;
  for (let i = BG.flares.length - 1; i >= 0; i--) { const f = BG.flares[i]; f.t += dt; if (f.t >= 1) { BG.flares.splice(i, 1); continue; } drawFlare(c, f.x, f.y, f.t, f.rot); }
  c.lineCap = 'round';
  for (let i = BG.sparks.length - 1; i >= 0; i--) {
    const p = BG.sparks[i]; p.age += dt; if (p.age > p.life) { BG.sparks.splice(i, 1); continue; }
    const dr = Math.exp(-1.8 * dt); p.vx *= dr; p.vy *= dr; p.x += p.vx * dt; p.y += p.vy * dt;
    const a = 1 - p.age / p.life; c.lineWidth = 1.6 * a + .4;
    c.strokeStyle = p.h < .6 ? `rgba(255,${(180 + 60 * a) | 0},120,${a})` : `rgba(170,205,255,${a})`;
    c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * .045, p.y - p.vy * .045); c.stroke();
  }
  BG.tShoot -= dt; if (BG.tShoot <= 0) { BG.tShoot = rnd(4, 9); BG.shoot.push({ x: rnd(W * .35, W * 1.05), y: rnd(0, H * .4), t: 0 }); }
  for (let i = BG.shoot.length - 1; i >= 0; i--) {
    const s = BG.shoot[i]; s.t += dt; if (s.t > .8) { BG.shoot.splice(i, 1); continue; }
    const x = s.x - 900 * s.t, y = s.y + 380 * s.t, a = Math.sin(Math.PI * s.t / .8), g = c.createLinearGradient(x, y, x + 170, y - 72);
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.strokeStyle = g; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 170, y - 72); c.stroke();
  }
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
}
function burst(x, y){
  BG.waves.push({ x, y, t: 0 }); if (BG.waves.length > 4) BG.waves.shift();
  BG.flares.push({ x, y, t: 0, rot: rnd(0, 1) });
  for (let i = 0; i < (LOW ? 16 : 30); i++) { const a = rnd(0, TAU), v = rnd(110, 480); BG.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: rnd(.5, 1.2), h: Math.random() }); }
  if (BG.sparks.length > 120) BG.sparks.splice(0, BG.sparks.length - 120);
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
      x.save(); x.translate(p[0], p[1]); x.scale(s, s); x.globalAlpha = .3 + .7 * k; x.fillStyle = `hsl(${190 + it.f * 70},90%,${84 - it.f * 12}%)`;
      if (front) { x.shadowColor = 'rgba(93,228,255,.75)'; x.shadowBlur = 12; }
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
window.NRP_onLang = layoutOrbit;

/* ---------- loop ---------- */
let last = performance.now(), tt = 0, nf = 0, fsum = 0, skip = 0;
function fail(e){ dead = true; root.classList.remove('fx-on'); if (typeof showErr === 'function') showErr(e); }
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
