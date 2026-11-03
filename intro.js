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
let launching = false, pushed = false, last = '', lastP = -1;
let raf = 0, prevTs = 0, simT = 0, phase = 'scroll', tPhase = 0, scrollP = 0, atEnd = false;
let timers = [];
try { history.scrollRestoration = 'manual'; } catch {}

const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

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
window.NRP_reveal = reveal;

function fail(e){
  showErr(e); stopLoop();
  if (!body.classList.contains('launched')) reveal(false);
}
// back to the launch scene (rocket on the pad, ready to fly again)
function toIntro(){
  clearTimers();
  launching = false; last = ''; lastP = -1; phase = 'scroll';
  parts.length = 0; snap = null; accF = 0; accS = 0;
  const old = document.getElementById('fx'); if (old) old.remove();
  body.classList.remove('launched', 'launching', 'flash', 'ready');
  root.style.overflow = '';
  try { ensureScene(); resizeScene(); } catch (e) { showErr(e); }
  requestAnimationFrame(() => { scrollTo(0, Math.round(maxScroll * .9)); startLoop(); });
}

/* ---------- neural network overlay (DOM) ---------- */
const NS = 'http://www.w3.org/2000/svg';
const mk = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); byId('nn').append(e); return e; };
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
  byId('nn').style.opacity = 1 - f;
  byId('nn').style.transform = `translate(-50%,-50%) scale(${1 + f * .25})`;
  caps.forEach(({ el, r }) => {
    const i = ramp(p, r[0], r[1]), o = ramp(p, r[2], r[3]);
    el.style.opacity = i * (1 - o);
    el.style.transform = `translateY(${(1 - i) * 30 - o * 30}px)`;
  });
  const n = p < .8 ? '' : p < .87 ? '3' : p < .94 ? '2' : '1';
  if (n !== last) { byId('count').textContent = n; last = n; }
  byId('bar').style.transform = `scaleY(${p})`;
}

/* ---------- main loop ---------- */
function startLoop(){ if (!raf) { prevTs = performance.now(); raf = requestAnimationFrame(step); } }
function stopLoop(){ cancelAnimationFrame(raf); raf = 0; }

function launch(){
  if (launching) return;
  launching = true; phase = 'flight'; tPhase = simT;
  root.style.overflow = 'hidden';
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
  const dt = Math.min(.05, Math.max(0, (ts - prevTs) / 1000)); prevTs = ts; simT += dt * 1000;
  if (phase === 'crack') { crackFrame(); return; }
  const tt = simT / 1000, pos = POS;
  let p = scrollP, warp = 0, fi = 0, padA = 1, shake = 0, pitch = .2, bank = 0, u = 0;
  PREV[0] = pos[0]; PREV[1] = pos[1]; PREV[2] = pos[2];

  if (phase === 'scroll') {
    p = clamp(scrollY / maxScroll);
    atEnd = scrollY >= root.scrollHeight - innerHeight - 4;
    if (Math.abs(p - lastP) > .0004) { domFrame(p); lastP = p; }
    scrollP = p;
    const r = ramp(p, .5, .8);
    pos[0] = 0; pos[1] = YPAD - Math.pow(1 - r, 3) * 16.5; pos[2] = 0;
    fi = p > .8 ? .35 + .65 * ramp(p, .8, .97) : 0;
    shake = p > .88 ? ramp(p, .88, 1) * 2.2 : 0;
    padA = ramp(p, .55, .75);
    roll += dt * .7;
    if (p >= .97 || (p > .9 && atEnd)) launch();
  } else if (phase === 'flight') {
    const t = simT - tPhase, ig = ramp(t, 0, T_IGN);
    u = clamp((t - T_IGN) / T_FLY);
    fi = u > 0 ? 1 : .55 + .45 * ig;
    shake = u > 0 ? 3 + 14 * u * u * u : 2.5 + 2 * ig;
    padA = 1 - ramp(u, 0, .25);
    pos[0] = 2.2 * Math.sin(Math.PI * u) * (1 - u) * smooth(ramp(u, 0, .25));
    pos[1] = lerp(YPAD, 0, 1 - Math.pow(1 - smooth(u), 1.8));
    pos[2] = ZEND * u * u * u;
    pitch = lerp(.2, Math.PI / 2, smooth(ramp(u, .1, .93)));
    bank = Math.sin(u * Math.PI * 1.5) * .14 * (1 - u);
    roll += dt * (.7 + 12 * u * u);
    warp = Math.pow(ramp(u, .5, 1), 2);
  }

  for (let i = 0; i < 3; i++) VEL[i] = dt > 0 ? (pos[i] - PREV[i]) / dt : 0;
  setMat(pitch, bank, roll);
  updateParts(dt, fi, pos, VEL);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.save();
  ctx.translate(rn() * shake, rn() * shake);
  drawSky(p, tt, warp);
  drawPad(padA);
  drawParts();
  drawRocket(pos, fi);
  ctx.restore();
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

  if (phase === 'flight' && u >= 1) impact();
}

/* ---------- impact -> cracks -> shatter ---------- */
function impact(){
  snap = document.createElement('canvas'); snap.width = sky.width; snap.height = sky.height;
  snap.getContext('2d').drawImage(sky, 0, 0);
  makeCracks();
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

/* ---------- events ---------- */
addEventListener('resize', () => {
  if (sceneReady && !body.classList.contains('launched')) { try { resizeScene(); } catch (e) { showErr(e); } }
});

if (!reduce) {
  // Android back / browser back
  addEventListener('popstate', e => {
    const inChat = body.classList.contains('launched');
    if (e.state && e.state.chat) { if (!inChat) { pushed = true; reveal(false); } }
    else if (inChat) { pushed = false; toIntro(); }
  });
  // Backspace key (when not typing)
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
else { try { ensureScene(); } catch (e) { showErr(e); } startLoop(); }
})();
}
