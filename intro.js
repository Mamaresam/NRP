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
const DUR = [0, 2800, 3800, 3600, 4200, 3400];   // length of each act (ms)
let launching = false, pushed = false, last = '', raf = 0, prevTs = 0, simT = 0, phase = 'scroll', tPhase = 0;
let actI = 0, actS = 0, queued = false, bgP = 0, lastW = 0, ty0 = null, lastQ = -1, lastBar = -1;
let perfN = 0, perfSum = 0, perfDone = false, timers = [];
try { history.scrollRestoration = 'manual'; } catch {}
const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
const curP = () => DUR[actI] ? clamp((simT - actS) / DUR[actI]) : 1;
const eio = t => t * t * (3 - 2 * t), eout = t => 1 - Math.pow(1 - t, 3);

/* ================= planets, collision, rebirth, meteors ================= */
planet = () => {};   // the static planets of drawSky() are replaced by the live ones below
const PAL = [
  { g: 'rgba(139,123,255,.45)', bands: ['#a99bff', '#6f5be8', '#d9c8ff', '#4a3bb8'], ring: 1, spin: .012 },
  { g: 'rgba(93,228,255,.4)', bands: ['#7fe6ff', '#2aa6d0', '#bff6ff', '#1a7aa0'], spin: .02 },
  { g: 'rgba(255,150,70,.45)', bands: ['#ffc27a', '#e0702d', '#ffe3b0', '#b8481c'], spin: .016 },
  { g: 'rgba(80,230,170,.4)', bands: ['#8cf5c8', '#2eaa82', '#c8ffe6', '#1d7a60'], spin: .024 }
];
const AC = { last: -1, deb: [], met: [], hit: false, flash: 0, ring: -1, sp: 0 };
let PL = null;
const HOME = (k, m) => [[W * .8, H * .68, m * .2], [W * .15, H * .9, m * .13], [W * .2, H * .27, m * .14], [W * .83, H * .3, m * .1]][k];

function mkTex(pal, seed){
  const r = rng(seed), c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = pal.bands[0]; g.fillRect(0, 0, 256, 128);
  for (let y = 0; y < 128; y += 3) { g.globalAlpha = .35 + r() * .4; g.fillStyle = pal.bands[(r() * 4) | 0]; g.fillRect(0, y, 256, 3 + (r() * 5 | 0)); }
  for (let k = 0; k < 46; k++) {
    const x = r() * 256, y = r() * 128, rx = 6 + r() * 26, ry = 2 + r() * 7;
    g.globalAlpha = .12 + r() * .22; g.fillStyle = r() < .5 ? '#fff' : '#000';
    for (const o of [-256, 0, 256]) { g.beginPath(); g.ellipse(x + o, y, rx, ry, 0, 0, TAU); g.fill(); }
  }
  return c;
}
function drawPlanet(d, x, y, r, al, tt){
  if (al <= .01 || r < 1) return;
  ctx.save(); ctx.globalAlpha = al;
  let g = ctx.createRadialGradient(x, y, r * .9, x, y, r * 1.7);
  g.addColorStop(0, d.g); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, TAU); ctx.fill();
  const ring = f => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-.32); ctx.lineWidth = r * .2;
    ctx.strokeStyle = f ? 'rgba(225,215,255,.42)' : 'rgba(225,215,255,.2)';
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.75, r * .42, 0, f ? 0 : Math.PI, f ? Math.PI : TAU); ctx.stroke(); ctx.restore();
  };
  if (d.ring) ring(0);
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  const w = r * 4, ox = x - r - ((tt * d.spin) % 1) * w;
  ctx.drawImage(d.tex, ox, y - r, w, r * 2); ctx.drawImage(d.tex, ox + w, y - r, w, r * 2);
  g = ctx.createRadialGradient(x - r * .5, y - r * .5, r * .5, x - r * .5, y - r * .5, r * 2.2);
  g.addColorStop(0, 'rgba(0,0,12,0)'); g.addColorStop(.5, 'rgba(0,0,12,.25)'); g.addColorStop(1, 'rgba(0,0,12,.95)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
  ctx.lineWidth = 1.5; ctx.strokeStyle = d.g; ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 1.05, Math.PI * 1.65); ctx.stroke();
  if (d.ring) ring(1);
  ctx.restore();
}
function explode(L, hx, hy, m){
  AC.hit = true; AC.flash = 1; AC.ring = 0;
  for (const [x, y, r, c] of L) for (let i = 0; i < 110; i++) {
    const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * r, px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    const s = i >= 80 ? 1 : 0, sp = m * (.05 + Math.random() * .6) * (s ? 1.8 : 1);
    const ang = Math.atan2(py - hy, px - hx) + (Math.random() - .5) * 1.2;
    AC.deb.push({ x: px, y: py, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, s: s ? 1.2 + Math.random() * 1.6 : 1.5 + Math.random() * 4.5,
      sp: s, k: i % 2, c, age: 0, life: 1 + Math.random() * 1.4, dl: Math.random() * .4 });
  }
}
function actsShake(a, p){ return a === 2 && p >= .5 ? 16 * Math.max(0, 1 - (p - .5) / .14) : 0; }

function actsFrame(act, p, tt, dt, vis){
  const m = Math.min(W, H);
  if (!PL) PL = PAL.map((d, i) => Object.assign({}, d, { tex: mkTex(d, 7 + i * 13) }));
  if (AC.last !== act) {
    if (act === 2) { AC.hit = false; AC.deb.length = 0; AC.ring = -1; AC.flash = 0; }
    if (act === 4) { AC.deb.length = 0; AC.met.length = 0; AC.sp = 0; }
    AC.last = act;
  }
  const dr = k => { const h = HOME(k, m); return [h[0] + Math.sin(tt * .15 + k * 2) * m * .012, h[1] + Math.cos(tt * .2 + k) * m * .01, h[2]]; };
  const hx = W * .5, hy = H * .46;

  // old planets: drift, then rush into each other
  if (act < 3 && !AC.hit) {
    const a = dr(0), b = dr(1), e = act < 2 ? 0 : Math.pow(clamp(p / .5), 2.4);
    const dx = a[0] - b[0], dy = a[1] - b[1], dl = Math.hypot(dx, dy) || 1;
    const ax = lerp(a[0], hx + dx / dl * a[2] * .85, e), ay = lerp(a[1], hy + dy / dl * a[2] * .85, e);
    const bx = lerp(b[0], hx - dx / dl * b[2] * .85, e), by = lerp(b[1], hy - dy / dl * b[2] * .85, e);
    drawPlanet(PL[0], ax, ay, a[2], vis, tt); drawPlanet(PL[1], bx, by, b[2], vis, tt);
    if (act === 2 && p >= .5) explode([[ax, ay, a[2], 0], [bx, by, b[2], 1]], hx, hy, m);
  }

  // debris: drifts after the blast, then gets pulled into the two new planets
  const tg = [HOME(2, m), HOME(3, m)];
  for (let i = AC.deb.length - 1; i >= 0; i--) {
    const d = AC.deb[i]; d.age += dt;
    if (d.sp && d.age > d.life) { AC.deb.splice(i, 1); continue; }
    if (act === 3 && !d.sp) {
      const t = tg[d.k], pull = ramp(p, d.dl, d.dl + .45), ex = t[0] - d.x, ey = t[1] - d.y;
      d.vx += ex * pull * dt * 8; d.vy += ey * pull * dt * 8;
      const dm = 1 - Math.min(1, dt * (1 + 4 * pull)); d.vx *= dm; d.vy *= dm;
      if (pull > .5 && Math.hypot(ex, ey) < t[2] * .7) { AC.deb.splice(i, 1); continue; }
    } else { const dm = 1 - Math.min(1, dt * .25); d.vx *= dm; d.vy *= dm; }
    d.x += d.vx * dt; d.y += d.vy * dt;
  }
  ctx.save(); ctx.globalAlpha = vis;
  for (const d of AC.deb) {
    const h = d.sp ? 1 - d.age / d.life : Math.max(0, 1 - d.age / 3.2);
    if (d.sp || h > .35) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,${(120 + 110 * h) | 0},${(50 + 60 * h) | 0},${d.sp ? h : .5 + h * .4})`; }
    else { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = PAL[d.c].bands[1]; }
    ctx.beginPath(); ctx.arc(d.x, d.y, d.s * (d.sp ? h : 1), 0, TAU); ctx.fill();
  }
  ctx.restore();

  // shockwave and flash
  if (AC.ring >= 0) {
    AC.ring += dt; AC.flash = Math.max(0, AC.flash - dt * 1.3);
    const a = 1 - AC.ring / 1.3;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (a > 0) {
      ctx.strokeStyle = `rgba(255,215,160,${a * .8})`; ctx.lineWidth = 2 + AC.ring * 18;
      ctx.beginPath(); ctx.arc(hx, hy, AC.ring * m * .9, 0, TAU); ctx.stroke();
      ctx.strokeStyle = `rgba(139,123,255,${a * .5})`; ctx.lineWidth = 2 + AC.ring * 10;
      ctx.beginPath(); ctx.arc(hx, hy, AC.ring * m * .55, 0, TAU); ctx.stroke();
    }
    if (AC.flash > 0) {
      const R = m * (.4 + AC.flash * .5), g = ctx.createRadialGradient(hx, hy, 0, hx, hy, R);
      g.addColorStop(0, `rgba(255,240,215,${AC.flash})`); g.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
    if (a <= 0 && AC.flash <= 0) AC.ring = -1;
  }

  // reborn planets
  if (act >= 3) {
    const e = act === 3 ? eio(ramp(p, .4, 1)) : 1;
    for (const k of [2, 3]) {
      const h = dr(k);
      drawPlanet(PL[k], h[0], h[1], h[2] * (.55 + .45 * e), e * vis, tt);
      const f = act === 3 ? Math.max(0, 1 - Math.abs(p - .92) * 12) : 0;
      if (f > 0) {
        const s = h[2] * 4; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = f * vis;
        ctx.drawImage(sprites.glow, h[0] - s, h[1] - s, s * 2, s * 2); ctx.restore();
      }
    }
  }

  // meteor shower
  if (act === 4 && p < .85) {
    AC.sp += dt * (16 + 8 * Math.sin(tt * 2));
    while (AC.sp >= 1) {
      AC.sp--;
      const ang = 2.55 + (Math.random() - .5) * .25, sp = m * (1.2 + Math.random() * 1.6), big = Math.random() < .12;
      AC.met.push({ x: W * (.35 + Math.random() * .9), y: -40 - Math.random() * H * .3, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        len: m * (.18 + Math.random() * .3) * (big ? 1.6 : 1), w: big ? 3.2 : 1.3, big, z: .5 + Math.random() * .5 });
    }
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = AC.met.length - 1; i >= 0; i--) {
    const q = AC.met[i]; q.x += q.vx * dt; q.y += q.vy * dt;
    if (q.x < -q.len * 2 || q.y > H + q.len * 2) { AC.met.splice(i, 1); continue; }
    const sp = Math.hypot(q.vx, q.vy), tx = q.x - q.vx / sp * q.len, tyy = q.y - q.vy / sp * q.len;
    const g = ctx.createLinearGradient(q.x, q.y, tx, tyy);
    g.addColorStop(0, 'rgba(255,248,230,.95)'); g.addColorStop(.3, 'rgba(255,170,90,.45)'); g.addColorStop(1, 'rgba(255,100,40,0)');
    ctx.globalAlpha = vis * q.z; ctx.strokeStyle = g; ctx.lineWidth = q.w;
    ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(tx, tyy); ctx.stroke();
    const s = q.big ? 26 : 9; ctx.drawImage(q.big ? sprites.f1 : sprites.f0, q.x - s, q.y - s, s * 2, s * 2);
  }
  ctx.restore();
}

/* ================= navigation between intro and chat ================= */
function reveal(push = true){
  clearTimers();
  const instant = phase === 'crack';
  launching = true; phase = 'done';
  body.classList.remove('launching', 'ready');
  body.classList.add('launched');
  if (instant) body.classList.add('ready');
  try { sessionStorage.setItem('seen', '1'); } catch {}
  root.style.overflow = ''; body.style.touchAction = ''; scrollTo(0, 0);
  void body.offsetHeight;
  later(() => {
    if (!body.classList.contains('launched')) return;
    body.classList.remove('flash'); body.classList.add('ready');
  }, instant ? 400 : 1200);
  if (push && !reduce && !pushed) { try { history.pushState({ chat: 1 }, ''); pushed = true; } catch {} }
}
window.NRP_reveal = reveal;
function fail(e){ showErr(e); stopLoop(); if (!body.classList.contains('launched')) reveal(false); }

// back to the "ready for launch" scene: rocket on the pad with its fire on
function toIntro(){
  clearTimers();
  launching = false; phase = 'scroll'; lastQ = -1; lastBar = -1; queued = false;
  parts.length = 0; snap = null; snapC = null; shardList = null; accF = 0; accS = 0;
  AC.deb.length = 0; AC.met.length = 0; AC.hit = true; AC.ring = -1;
  actI = 5; actS = simT - DUR[5] - 10; bgP = 1;
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

function domFrame(dt, p){
  const q = actI === 0 ? 0 : actI === 1 ? ramp(p, 0, .85) * 4 : 4;
  if (Math.abs(q - lastQ) > .002) {
    N.forEach((l, i) => l.forEach(n => { n.style.opacity = clamp(q - i); }));
    E.forEach((l, i) => l.forEach(e => { e.style.strokeDashoffset = 1 - clamp(q - i - .5); }));
    lastQ = q;
  }
  const f = actI < 2 ? 0 : actI === 2 ? ramp(p, 0, .3) : 1;
  byId('nn').style.opacity = 1 - f;
  byId('nn').style.transform = `translate(-50%,-50%) scale(${1 + f * .2})`;
  const T = [actI === 0 ? 1 : 0, (actI === 1 && p > .3) || (actI === 2 && p < .2) ? 1 : 0,
    (actI === 3 && p > .3) || (actI === 4 && p < .2) ? 1 : 0, actI === 5 && p > .75 && !launching ? 1 : 0];
  const k = 1 - Math.exp(-dt * 7);
  caps.forEach((c, i) => { c.o += (T[i] - c.o) * k; c.el.style.opacity = c.o; c.el.style.transform = `translateY(${(1 - c.o) * 24}px)`; });
  const b = (actI + p) / 5;
  if (Math.abs(b - lastBar) > .003) { byId('bar').style.transform = `scaleY(${b})`; lastBar = b; }
}

/* ================= scroll gestures: one gesture = next act ================= */
function advance(){
  if (phase !== 'scroll' || launching || body.classList.contains('launched')) return;
  const p = curP();
  if (p >= 1) { queued = false; if (actI < 5) { actI++; actS = simT; } else launch(); }
  else if (p > .7) queued = true;
}
const inIntro = () => !body.classList.contains('launched');
addEventListener('wheel', e => {
  if (!inIntro()) return;
  e.preventDefault();
  const n = performance.now(), fresh = n - lastW > 140; lastW = n;
  if (fresh && e.deltaY > 4) advance();
}, { passive: false });
addEventListener('touchstart', e => { ty0 = e.touches[0].clientY; }, { passive: true });
addEventListener('touchmove', e => { if (inIntro()) e.preventDefault(); }, { passive: false });
addEventListener('touchend', e => {
  if (ty0 == null || !inIntro()) return;
  const d = ty0 - e.changedTouches[0].clientY; ty0 = null;
  if (d > 28) advance();
});
addEventListener('keydown', e => {
  if (!inIntro() || !['ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) return;
  e.preventDefault(); advance();
});

/* ================= main loop ================= */
function startLoop(){ if (!raf) { prevTs = performance.now(); raf = requestAnimationFrame(step); } }
function stopLoop(){ cancelAnimationFrame(raf); raf = 0; }
function launch(){
  if (launching) return;
  launching = true; phase = 'flight'; tPhase = simT;
  body.classList.add('launching');
}
function step(ts){
  raf = requestAnimationFrame(step);
  if (body.classList.contains('launched')) { stopLoop(); return; }
  try {
    if (!sceneReady) { ensureScene(); if (!sceneReady) return; }
    frameStep(ts);
  } catch (e) { fail(e); }
}
function frameStep(ts){
  const rdt = Math.min(.25, Math.max(0, (ts - prevTs) / 1000)), dt = Math.min(.05, rdt);
  prevTs = ts; simT += rdt * 1000;
  if (phase === 'crack') { crackFrame(); return; }

  if (phase === 'scroll' && !perfDone && ++perfN > 5) {
    perfSum += rdt;
    if (perfN >= 55) { perfDone = true; if (perfSum / 50 > .034) { lowQ = true; W = 0; resizeScene(); } }
  }

  const tt = simT / 1000, pos = POS;
  let warp = 0, fi = 0, padA = 0, shake = 0, pitch = .2, bank = 0, u = 0, vis = 1;
  const p = phase === 'scroll' ? curP() : 1;
  PREV[0] = pos[0]; PREV[1] = pos[1]; PREV[2] = pos[2];

  if (phase === 'scroll') {
    domFrame(dt, p);
    if (queued && p >= 1 && simT - actS > DUR[actI] + 220) advance();
    const r = actI < 5 ? 0 : ramp(p, .05, .7);
    pos[0] = 0; pos[1] = YPAD - Math.pow(1 - r, 3) * 16.5; pos[2] = 0;
    fi = actI < 5 ? 0 : ramp(p, .6, .95) * (.55 + .08 * Math.sin(simT * .02) + .05 * Math.sin(simT * .047));
    padA = actI < 5 ? 0 : ramp(p, 0, .5);
    shake = fi * 1.4; roll += dt * .7;
  } else if (phase === 'flight') {
    const t = simT - tPhase, ig = ramp(t, 0, FLY_IGN);
    u = clamp((t - FLY_IGN) / FLY_T);
    fi = u > 0 ? 1 : .55 + .45 * ig;
    shake = u > 0 ? 3 + 14 * u * u * u : 2.5 + 2 * ig;
    padA = 1 - ramp(u, 0, .25); vis = 1 - ramp(u, 0, .35);
    pos[0] = 2.2 * Math.sin(Math.PI * u) * (1 - u) * smooth(ramp(u, 0, .25));
    pos[1] = lerp(YPAD, 0, 1 - Math.pow(1 - smooth(u), 1.8));
    pos[2] = ZEND * u * u * u;
    pitch = lerp(.2, Math.PI / 2, smooth(ramp(u, .1, .93)));
    bank = Math.sin(u * Math.PI * 1.5) * .14 * (1 - u);
    roll += dt * (.7 + 12 * u * u);
    warp = Math.pow(ramp(u, .5, 1), 2);
  }

  const bt = phase === 'scroll' ? clamp((actI + p) / 5) : 1;
  bgP += (bt - bgP) * (1 - Math.exp(-dt * 2.5));
  for (let i = 0; i < 3; i++) VEL[i] = dt > 0 ? (pos[i] - PREV[i]) / dt : 0;
  setMat(pitch, bank, roll);
  updateParts(dt, fi, pos, VEL);
  const cap = lowQ ? 110 : 240;
  if (parts.length > cap) parts.length = cap;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.save();
  const sh = shake + actsShake(actI, p);
  ctx.translate(rn() * sh, rn() * sh);
  drawSky(bgP, tt, warp);
  drawPad(padA);
  actsFrame(actI, p, tt, dt, vis);
  drawParts();
  drawRocket(pos, fi);
  ctx.restore();
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

  if (phase === 'flight' && u >= 1) impact();
}

/* ================= impact -> cracks -> shatter ================= */
function impact(){
  const cw = sky.width, ch = sky.height;
  snap = document.createElement('canvas'); snap.width = cw; snap.height = ch;
  const sc = snap.getContext('2d');
  sc.drawImage(sky, 0, 0);
  sc.setTransform(dpr, 0, 0, dpr, 0, 0);
  const R = Math.hypot(W, H) * .22;
  const bg = sc.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, R);
  bg.addColorStop(0, 'rgba(255,255,255,.95)'); bg.addColorStop(.35, 'rgba(255,210,150,.55)'); bg.addColorStop(1, 'rgba(255,140,60,0)');
  sc.fillStyle = bg; sc.fillRect(0, 0, W, H);
  makeCracks();
  snapC = document.createElement('canvas'); snapC.width = cw; snapC.height = ch;
  const cc = snapC.getContext('2d');
  cc.drawImage(snap, 0, 0);
  cc.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawCracks(cc, 1);
  shardList = buildShards(snapC);
  phase = 'crack'; tPhase = simT;
  body.classList.add('flash');
}
function crackFrame(){
  const t = simT - tPhase, g = ramp(t, 0, T_CRACK), e = 1 - Math.pow(1 - g, 2), sh = 9 * (1 - g) + 1.5;
  const ox = rn() * sh, oy = rn() * sh;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#02030b'; ctx.fillRect(0, 0, sky.width, sky.height);
  ctx.drawImage(snap, Math.round(ox * dpr), Math.round(oy * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
  drawCracks(ctx, e);
  if (t >= T_CRACK) shatter();
}

/* ================= events ================= */
addEventListener('resize', () => {
  if (sceneReady && !body.classList.contains('launched')) { try { resizeScene(); } catch (e) { showErr(e); } }
});
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
    e.preventDefault();
    if (pushed) history.back(); else toIntro();
  });
}

let seen = false; try { seen = sessionStorage.getItem('seen') === '1'; } catch {}
if (seen || reduce) reveal();
else {
  root.style.overflow = 'hidden'; body.style.touchAction = 'none';
  try { ensureScene(); } catch (e) { showErr(e); }
  startLoop();
}
})();
}
