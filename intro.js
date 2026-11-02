'use strict';
(() => {
const $ = id => document.getElementById(id), body = document.body, root = document.documentElement;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ramp = (x, a, b) => clamp((x - a) / (b - a));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let launching = false, raf = 0, last = '', pushed = false, t1 = 0, t2 = 0, t3 = 0;
try { history.scrollRestoration = 'manual'; } catch {}

function reveal(push = true){
  clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
  launching = true;
  body.classList.remove('launching', 'ready');
  body.classList.add('launched');
  try { sessionStorage.setItem('seen', '1'); } catch {}
  root.style.overflow = ''; scrollTo(0, 0);
  void body.offsetHeight;
  // after the entrance animation, make sure the chat is fully visible and clean up
  t3 = setTimeout(() => {
    if (!body.classList.contains('launched')) return;
    body.classList.remove('flash');
    body.classList.add('ready');
  }, 1200);
  if (push && !reduce && !pushed) { try { history.pushState({ chat: 1 }, ''); pushed = true; } catch {} }
}
// go back to the launch scene (rocket on the pad, ready to fly again)
function toIntro(){
  clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
  launching = false; last = '';
  body.classList.remove('launched', 'launching', 'flash', 'ready');
  root.style.overflow = '';
  requestAnimationFrame(() => {
    const max = $('intro').offsetHeight - innerHeight;
    scrollTo(0, Math.round(max * .9));
    frame();
  });
}

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
  $('bar').style.transform = `scaleY(${p})`;
  if (p >= .995) launch();
}
function launch(){
  if (launching) return; launching = true;
  root.style.overflow = 'hidden';
  $('flame').classList.add('on'); $('rk').style.transform = 'translate(-50%,0)';
  body.classList.add('launching');
  t1 = setTimeout(() => body.classList.add('flash'), 1200);
  t2 = setTimeout(() => reveal(), 1750);
}

addEventListener('scroll', () => { raf || (raf = requestAnimationFrame(frame)); }, { passive: true });
addEventListener('resize', frame);

// if the page was hidden in the middle of the launch, finish it when it comes back
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && launching && !body.classList.contains('launched')) reveal();
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
if (seen || reduce) reveal(); else frame();
})();
