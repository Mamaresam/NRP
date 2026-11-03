'use strict';

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
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(160,215,255,.7)'; ctx.stroke();
  ctx.restore();
}

/* ---------- scene setup ---------- */
function resizeScene(){
  if (!sky) return;
  const st = sky.parentElement, w = st.clientWidth, h = st.clientHeight;
  maxScroll = Math.max(1, byId('intro').offsetHeight - innerHeight);
  if (!w || !h) return;
  if (Math.abs(w - W) < 2 && Math.abs(h - H) < 2) return;
  W = w; H = h; dpr = Math.min(devicePixelRatio || 1, 1.5);
  sky.width = Math.round(W * dpr); sky.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.hypot(W, H) * .6);
  vig.addColorStop(0, 'rgba(0,0,10,0)'); vig.addColorStop(1, 'rgba(0,0,10,.55)');
}
function ensureScene(){
  if (sceneReady) return;
  sky = byId('sky');
  if (!sky) throw new Error('canvas #sky not found: index.html is outdated');
  ctx = sky.getContext('2d');
  resizeScene();
  if (!W) return;
  buildNebula();
  const r = rng(99), cols = ['#ffffff', '#cfe0ff', '#ffe9d0', '#bcd0ff', '#ffd7f4'];
  for (let i = 0; i < 340; i++)
    stars.push({ x: r(), y: r(), z: .3 + r() * .7, s: .35 + Math.pow(r(), 5) * 1.9, c: cols[(r() * cols.length) | 0], ph: r() * TAU, sp: .6 + r() * 2 });
  sprites = { f0: mkSprite(255, 246, 210, 1), f1: mkSprite(255, 150, 50, .9), f2: mkSprite(255, 70, 30, .7), sm: mkSprite(150, 158, 200, .5), glow: mkSprite(200, 220, 255, .6) };
  sceneReady = true;
}

/* ---------- cracks and shatter ---------- */
function makeCracks(){
  const r = rng((Math.random() * 1e9) | 0), diag = Math.hypot(W, H), cx = W / 2, cy = H / 2;
  cracks = [];
  const branch = (x, y, a, len, s) => {
    const pts = [[x, y]]; let d = 0;
    while (d < len) {
      a += (r() - .5) * .6; const st = 14 + r() * 22;
      x += Math.cos(a) * st; y += Math.sin(a) * st; d += st; pts.push([x, y]);
    }
    pts.s = s; cracks.push(pts);
  };
  for (let k = 0; k < 18; k++) {
    let a = k / 18 * TAU + (r() - .5) * .3, x = cx, y = cy, d = 0;
    const len = diag * (.3 + r() * .5), pts = [[x, y]];
    while (d < len) {
      a += (r() - .5) * .45; const st = 18 + r() * 26;
      x += Math.cos(a) * st; y += Math.sin(a) * st; d += st; pts.push([x, y]);
      if (r() < .14) branch(x, y, a + (r() < .5 ? -1 : 1) * (.5 + r() * .6), len * .35, Math.min(.9, d / len));
    }
    cracks.push(pts);
  }
  [.06, .14, .26].forEach(f => {
    const n = 20, ring = [];
    for (let j = 0; j <= n; j++) {
      const a = j / n * TAU, rr = diag * f * (.9 + r() * .2);
      ring.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    for (let j = 0; j < n; j++) if (r() > .3) { const seg = [ring[j], ring[j + 1]]; seg.s = .25 + f * 1.4; cracks.push(seg); }
  });
}
function drawCracks(c, g){
  const cx = W / 2, cy = H / 2, diag = Math.hypot(W, H);
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  const gr = c.createRadialGradient(cx, cy, 0, cx, cy, diag * .1);
  gr.addColorStop(0, `rgba(255,255,255,${.85 * (1 - g * .4)})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, diag * .1, 0, TAU); c.fill();
  [[3.4, 'rgba(0,0,20,.4)'], [1.3, 'rgba(255,255,255,.95)']].forEach(([w, s]) => {
    c.lineWidth = w; c.strokeStyle = s; c.beginPath();
    for (const pts of cracks) {
      const st = pts.s || 0; if (g <= st) continue;
      const gg = (g - st) / (1 - st), n = Math.min(pts.length - 1, Math.ceil(gg * (pts.length - 1)));
      if (n < 1) continue;
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i <= n; i++) c.lineTo(pts[i][0], pts[i][1]);
    }
    c.stroke();
  });
  c.restore();
}
function buildShards(){
  const r = rng((Math.random() * 1e9) | 0), cx = W / 2, cy = H / 2, diag = Math.hypot(W, H), NN = 12;
  const radii = [0, .07, .17, .32, .55, 1.05].map(v => v * diag);
  const pts = radii.map((rad, k) => k === 0 ? [[cx, cy]] : Array.from({ length: NN }, (_, s) => {
    const a = (s + (r() - .5) * .5) / NN * TAU, rr = rad * (k === radii.length - 1 ? 1 : .88 + r() * .24);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  }));
  const tris = [];
  for (let s = 0; s < NN; s++) tris.push([pts[0][0], pts[1][s], pts[1][(s + 1) % NN]]);
  for (let k = 1; k < radii.length - 1; k++) for (let s = 0; s < NN; s++) {
    const a = pts[k][s], b = pts[k][(s + 1) % NN], c = pts[k + 1][(s + 1) % NN], d = pts[k + 1][s];
    if (r() < .5) tris.push([a, b, c], [a, c, d]); else tris.push([a, b, d], [b, c, d]);
  }
  const out = [];
  for (const t of tris) {
    const mx = (t[0][0] + t[1][0] + t[2][0]) / 3, my = (t[0][1] + t[1][1] + t[2][1]) / 3;
    const x0 = clamp(Math.min(t[0][0], t[1][0], t[2][0]) - 2, 0, W), x1 = clamp(Math.max(t[0][0], t[1][0], t[2][0]) + 2, 0, W);
    const y0 = clamp(Math.min(t[0][1], t[1][1], t[2][1]) - 2, 0, H), y1 = clamp(Math.max(t[0][1], t[1][1], t[2][1]) + 2, 0, H);
    if (x1 - x0 < 1 || y1 - y0 < 1) continue;
    const dx = mx - cx, dy = my - cy, dist = Math.hypot(dx, dy) || 1;
    const sp = (220 + 700 * Math.exp(-dist / (diag * .22))) * (.6 + r() * .8);
    out.push({ t, mx, my, x0, y0, w: x1 - x0, h: y1 - y0,
      vx: dx / dist * sp * .55 + (r() - .5) * 120, vy: dy / dist * sp * .55 - 60 - r() * 140,
      rot: (r() - .5) * 6, delay: dist / diag * 220 });
  }
  return out;
}
function shatter(){
  const sc = snap.getContext('2d');
  sc.setTransform(dpr, 0, 0, dpr, 0, 0); drawCracks(sc, 1);
  const fx = document.createElement('canvas'); fx.id = 'fx'; fx.width = snap.width; fx.height = snap.height;
  body.append(fx);
  const f = fx.getContext('2d'), shards = buildShards(), t0 = performance.now();
  const tick = now => {
    const el = now - t0;
    f.setTransform(1, 0, 0, 1, 0, 0); f.clearRect(0, 0, fx.width, fx.height);
    f.setTransform(dpr, 0, 0, dpr, 0, 0);
    let alive = 0;
    for (const s of shards) {
      const t = Math.max(0, el - s.delay) / 1000, alpha = 1 - ramp(t, .7, 1.25);
      if (alpha <= 0) continue;
      alive++;
      const sc2 = 1 - .25 * ramp(t, 0, 1.2);
      f.save(); f.globalAlpha = alpha;
      f.translate(s.mx + s.vx * t, s.my + s.vy * t + 1000 * t * t);
      f.rotate(s.rot * t); f.scale(sc2, sc2); f.translate(-s.mx, -s.my);
      f.beginPath(); f.moveTo(s.t[0][0], s.t[0][1]); f.lineTo(s.t[1][0], s.t[1][1]); f.lineTo(s.t[2][0], s.t[2][1]); f.closePath();
      f.clip();
      f.drawImage(snap, s.x0 * dpr, s.y0 * dpr, s.w * dpr, s.h * dpr, s.x0, s.y0, s.w, s.h);
      f.strokeStyle = 'rgba(255,255,255,.4)'; f.lineWidth = 1; f.stroke();
      f.restore();
    }
    if (alive && el < 2600) requestAnimationFrame(tick); else fx.remove();
  };
  tick(t0);
  window.NRP_reveal();
}

window.NRP_B = 1;
