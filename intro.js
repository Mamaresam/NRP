'use strict';
(() => {
const $ = id => document.getElementById(id), body = document.body;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ramp = (x, a, b) => clamp((x - a) / (b - a));
let launching = false, raf = 0, last = '';
function reveal(){
  launching = true; body.classList.add('launched');
  try { sessionStorage.setItem('seen', '1'); } catch {}
  document.documentElement.style.overflow = ''; scrollTo(0, 0);
}
let seen = false; try { seen = sessionStorage.getItem('seen') === '1'; } catch {}
if (seen || matchMedia('(prefers-reduced-motion: reduce)').matches) { reveal(); return; }

// neural network
const NS = 'http://www.w3.org/2000/svg';
const mk = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); $('nn').append(e); return e; };
const L = [3, 5, 5, 3], X = [90, 230, 370, 510];
const P = L.map((n, i) => Array.from({ length: n }, (_, j) => [X[i], 200 + (j - (n - 1) / 2) * 64]));
const E = [[], [], []], N = P.map(() => []);
for (let i = 0; i < 3; i++) for (const a of P[i]) for (const b of P[i + 1])
  E[i].push(mk('path', { d: `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`, pathLength: 1, class: 'ed' }));
P.forEach((l, i) => l.forEach(a => N[i].push(mk('circle', { cx: a[0], cy: a[1], r: 7, class: 'nd' }))));

const caps = [...document.querySelectorAll('.cap')].map(el => ({ el, r: el.dataset.r.split(',').map(Number) }));

function frame(){
  raf = 0; if (launching) return;
  const max = $('intro').offsetHeight - innerHeight;
  const p = max > 0 ? clamp(scrollY / max) : 0;
  $('la').style.transform = `translateY(${-p * 30}vh)`;
  $('lb').style.transform = `translateY(${-p * 70}vh)`;
  $('p1').style.transform = `translate(${-p * 20}vw,${-p * 60}vh) rotate(${p * 90}deg)`;
  $('p2').style.transform = `translate(${p * 15}vw,${-p * 95}vh)`;
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
  const r = ramp(p, .5, .8);
  $('rk').style.transform = `translate(-50%,${Math.pow(1 - r, 3) * 90}vh)`;
  $('rs').classList.toggle('shake', p > .88);
  $('flame').classList.toggle('on', p > .8);
  $('pad').style.opacity = ramp(p, .55, .75);
  $('goBtn').classList.toggle('show', p > .74);
  $('bar').style.transform = `scaleY(${p})`;
  if (p >= .995) launch();
}
function launch(){
  if (launching) return; launching = true;
  document.documentElement.style.overflow = 'hidden';
  $('flame').classList.add('on'); $('rk').style.transform = 'translate(-50%,0)';
  body.classList.add('launching');
  setTimeout(() => body.classList.add('flash'), 1200);
  setTimeout(reveal, 1750);
}
addEventListener('scroll', () => { raf || (raf = requestAnimationFrame(frame)); }, { passive: true });
addEventListener('resize', frame);
$('goBtn').addEventListener('click', launch);
$('skipBtn').addEventListener('click', reveal);
$('langBtn2').addEventListener('click', () => $('langBtn').click());
frame();
})();
