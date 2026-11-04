'use strict';
(() => {
const doc = document, body = doc.body;
const wrap = doc.getElementById('lang');
if (!wrap) return;
const cv = doc.getElementById('langfx'), hit = wrap.querySelector('.lang-hit'), x = cv.getContext('2d');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const eout = k => 1 - Math.pow(1 - k, 3), eio = k => k * k * (3 - 2 * k);
const rnd = (a, b) => a + Math.random() * (b - a);
const rng = seed => () => { seed = seed + 0x6D2B79F5 | 0; let k = Math.imul(seed ^ seed >>> 15, 1 | seed); k = k + Math.imul(k ^ k >>> 7, 61 | k) ^ k; return ((k ^ k >>> 14) >>> 0) / 4294967296; };
const mkc = (w, h) => { const c = doc.createElement('canvas'); c.width = w; c.height = h; return c; };
const CW = 260, CH = 220, CX = 112, CY = 108, ER = 30;
const dpr = Math.min(window.devicePixelRatio || 1, 2);
cv.width = Math.round(CW * dpr); cv.height = Math.round(CH * dpr);
let now = 0;

/* ---------- noise ---------- */
const hsh = (a, b, s) => { let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(s, 1274126177) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
const vn = (a, b, s) => { const xi = Math.floor(a), yi = Math.floor(b), xf = a - xi, yf = b - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const p = hsh(xi, yi, s), q = hsh(xi + 1, yi, s), r = hsh(xi, yi + 1, s), w = hsh(xi + 1, yi + 1, s); return p + (q - p) * u + (r - p) * v + (p - q - r + w) * u * v; };
const fb = (a, b, s, o) => { let v = 0, am = .5, f = 1; for (let i = 0; i < o; i++) { v += am * vn(a * f, b * f, s + i); f *= 2.03; am *= .5; } return v; };
const cyl = (lon, v, sc, s, o, k) => fb(Math.cos(lon) * sc + s * 3.7, Math.sin(lon) * sc + v * sc * (k || 1) + s * 1.9, s, o);

/* ---------- sprites ---------- */
function spr(r, g, b, a){
  const c = mkc(64, 64), q = c.getContext('2d'), gr = q.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${r},${g},${b},${a})`); gr.addColorStop(.4, `rgba(${r},${g},${b},${a * .42})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  q.fillStyle = gr; q.fillRect(0, 0, 64, 64); return c;
}
const GL = spr(255, 238, 205, 1), GO = spr(255, 140, 50, .95), SMK = spr(60, 52, 50, .55);

/* ---------- realistic Earth: procedural texture + lit sphere ---------- */
const TW = 256, TH = 128, S = Math.round(ER * 2 * dpr);
const mix = (a, b, k) => a + (b - a) * k;
const E = { rgb: new Uint8ClampedArray(TW * TH * 3), oc: new Uint8Array(TW * TH), em: new Uint8Array(TW * TH), cl: new Uint8Array(TW * TH) };
(function gen(){
  for (let y = 0; y < TH; y++) {
    const v = 1 - 2 * (y + .5) / TH, av = Math.abs(v);
    for (let xx = 0; xx < TW; xx++) {
      const i = y * TW + xx, lon = xx / TW * TAU, q = cyl(lon, v, 2.1, 7, 5, 1), det = .88 + .24 * cyl(lon, v, 16, 5, 2, 1);
      let r, g, b, oc = 0, em = 0;
      if (q < .54) {
        const d = clamp((.54 - q) / .2), e2 = Math.pow(d, .7);
        r = mix(36, 6, eio(d)); g = mix(122, 24, e2); b = mix(165, 72, e2); oc = 1;
        if (d < .07) { const c = 1 - d / .07; r += 18 * c; g += 42 * c; b += 26 * c; }
      } else {
        const el = (q - .54) * 4.2, mo = cyl(lon, v, 3.6, 19, 4, 1);
        const dry = clamp((.5 - mo) * 5 + (1 - Math.abs(av - .32) * 4) * .35 - .15), gk = clamp(mo * 1.4);
        r = mix(46, 92, gk); g = mix(104, 132, gk); b = mix(48, 62, gk);
        r = mix(r, 204, dry); g = mix(g, 172, dry); b = mix(b, 112, dry);
        const rk = clamp((el - .45) * 2.2); r = mix(r, 122, rk); g = mix(g, 108, rk); b = mix(b, 94, rk);
        const sn = clamp((el - .85) * 8); r = mix(r, 244, sn); g = mix(g, 246, sn); b = mix(b, 250, sn);
      }
      const ic = clamp((av - .84 - cyl(lon, v, 6, 2, 3, 1) * .07) * 28);
      if (ic > 0) { r = mix(r, 238, ic); g = mix(g, 244, ic); b = mix(b, 250, ic); if (ic > .5) oc = 0; }
      if (!oc && ic < .3 && hsh(xx, y, 3) > .982 && cyl(lon, v, 9, 41, 3, 1) > .52) em = 170 + hsh(y, xx, 8) * 85;
      const j = i * 3; E.rgb[j] = r * det; E.rgb[j + 1] = g * det; E.rgb[j + 2] = b * det; E.oc[i] = oc; E.em[i] = em;
      E.cl[i] = clamp((cyl(lon, v, 3.2, 33, 5, 2.4) - .47) * 3.4) * 235;
    }
  }
})();
const ec = mkc(S, S), ex = ec.getContext('2d'), EIMG = ex.createImageData(S, S);
const EP = (() => {
  const K = .41, ct = Math.cos(K), st = Math.sin(K), ll = Math.hypot(-.5, .55, .67), Lx = -.5 / ll, Ly = .55 / ll, Lz = .67 / ll;
  const hl = Math.hypot(Lx, Ly, Lz + 1), hx = Lx / hl, hy = Ly / hl, hz = (Lz + 1) / hl;
  const PX = [], U = [], VR = [], LIT = [], RIM = [], HS = [], AL = [];
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const px = (i + .5) / S * 2 - 1, py = 1 - (j + .5) / S * 2, r2 = px * px + py * py; if (r2 >= 1) continue;
    const z = Math.sqrt(1 - r2), xr = px * ct + py * st, yr = -px * st + py * ct, nd = px * Lx + py * Ly + z * Lz;
    PX.push(j * S + i); U.push((Math.atan2(xr, z) / TAU + .5) * TW); VR.push(Math.min(TH - 1, Math.max(0, ((1 - yr) * .5 * TH) | 0)) * TW);
    LIT.push(Math.pow(clamp((nd + .1) / 1.1), 1.2)); RIM.push(Math.pow(1 - z, 2.4) * (.2 + .8 * clamp(nd + .55)));
    HS.push(Math.pow(Math.max(0, px * hx + py * hy + z * hz), 70)); AL.push(clamp((1 - Math.sqrt(r2)) * S / 2 / 1.4) * 255);
  }
  return { n: PX.length, PX: Int32Array.from(PX), U: Float32Array.from(U), VR: Int32Array.from(VR), LIT: Float32Array.from(LIT), RIM: Float32Array.from(RIM), HS: Float32Array.from(HS), AL: Uint8Array.from(AL) };
})();
function renderEarth(sh, csh){
  const d = EIMG.data, n = EP.n;
  for (let j = 0; j < n; j++) {
    let u = EP.U[j] + sh; u -= TW * Math.floor(u / TW);
    const i0 = u | 0, f = u - i0, i1 = i0 + 1 === TW ? 0 : i0 + 1, a = EP.VR[j] + i0, b = EP.VR[j] + i1, f1 = 1 - f, a3 = a * 3, b3 = b * 3;
    let r = E.rgb[a3] * f1 + E.rgb[b3] * f, g = E.rgb[a3 + 1] * f1 + E.rgb[b3 + 1] * f, bl = E.rgb[a3 + 2] * f1 + E.rgb[b3 + 2] * f;
    let uc = EP.U[j] + csh; uc -= TW * Math.floor(uc / TW);
    const c0 = uc | 0, cf = uc - c0, ca = EP.VR[j] + c0, cb = EP.VR[j] + (c0 + 1 === TW ? 0 : c0 + 1);
    const c = (E.cl[ca] * (1 - cf) + E.cl[cb] * cf) / 255;
    r += (240 - r) * c; g += (244 - g) * c; bl += (250 - bl) * c;
    const L = EP.LIT[j], sd = .035 + L; let R = r * sd, G = g * sd, B = bl * sd;
    const em = E.em[a] / 255;
    if (em > 0) { const w = em * (1 - Math.min(1, L * 5)) * (1 - c); R += 255 * w; G += 205 * w; B += 120 * w; }
    if (E.oc[a]) { const q = EP.HS[j] * (1 - c) * .9 * 255; R += q; G += q * .98; B += q * .9; }
    const rm = EP.RIM[j]; R += 95 * rm; G += 165 * rm; B += 255 * rm;
    const p = EP.PX[j] * 4; d[p] = R; d[p + 1] = G; d[p + 2] = B; d[p + 3] = EP.AL[j];
  }
  ex.putImageData(EIMG, 0, 0);
}
let lsh = -99;
function earthTick(force){
  const sh = now * 3.7, csh = now * 5.4;
  if (force || Math.abs(sh - lsh) > .5) { renderEarth(sh, csh); lsh = sh; }
}
const drawEarth = (ox = 0, oy = 0) => x.drawImage(ec, CX - ER + ox, CY - ER + oy, ER * 2, ER * 2);
function atmosphere(a){
  const g = x.createRadialGradient(CX, CY, ER * .92, CX, CY, ER * 1.55);
  g.addColorStop(0, `rgba(110,175,255,${.5 * a})`); g.addColorStop(1, 'rgba(110,175,255,0)');
  x.fillStyle = g; x.beginPath(); x.arc(CX, CY, ER * 1.55, 0, TAU); x.fill();
}

/* ---------- "Language" text orbiting the Earth ---------- */
const RXT = 60, RYT = 17, PHI = -.28, cphi = Math.cos(PHI), sphi = Math.sin(PHI), RMT = 46;
let items = [], U = 0, TF = '';
const place = th => { const a = RXT * Math.cos(th), b = RYT * Math.sin(th); return [CX + a * cphi - b * sphi, CY + a * sphi + b * cphi, Math.sin(th)]; };
function layoutText(){
  const fa = lang === 'fa', txt = t('language');
  TF = fa ? '700 15px Vazirmatn, Tahoma, Inter, sans-serif' : '700 13px Inter, Vazirmatn, system-ui, sans-serif';
  items = [];
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.font = TF;
  if (fa) items = [{ ch: txt, th0: 0, f: 0 }, { ch: txt, th0: Math.PI, f: 1 }];
  else {
    const parts = [...txt], ws = parts.map(p => x.measureText(p).width); let cum = 0;
    parts.forEach((p, i) => { const w = ws[i] * 1.75; items.push({ ch: p, off: cum + w / 2, f: i / Math.max(1, parts.length - 1) }); cum += w; });
    items.forEach(it => { it.off -= cum / 2; });
  }
  x.restore();
}
function textPass(front, a){
  if (a <= .01) return;
  const fa = lang === 'fa';
  x.font = TF; x.textAlign = 'center'; x.textBaseline = 'middle'; if ('direction' in x) x.direction = fa ? 'rtl' : 'ltr';
  for (const it of items) {
    const p = place(fa ? -U + it.th0 : U - it.off / RMT); if ((p[2] >= 0) !== front) continue;
    const k = (p[2] + 1) / 2, s = .82 + .3 * k;
    x.save(); x.translate(p[0], p[1]); x.scale(s, s); x.globalAlpha = (.3 + .7 * k) * a; x.fillStyle = `hsl(${190 + it.f * 70},90%,84%)`;
    if (front) { x.shadowColor = 'rgba(93,228,255,.8)'; x.shadowBlur = 9; }
    x.fillText(it.ch, 0, 0); x.restore();
  }
  x.globalAlpha = 1;
}

/* ---------- the two language chunks ---------- */
let chunks = [];
function chunkFont(){ return lang === 'fa' ? '700 14px Vazirmatn, Tahoma, Inter, sans-serif' : '700 13px Inter, Vazirmatn, system-ui, sans-serif'; }
function buildChunks(){
  const names = [t('langEn'), t('langFa')];
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.font = chunkFont();
  chunks = names.map((name, i) => {
    const w = Math.max(72, x.measureText(name).width + 30), h = 32, r = rng(500 + i * 37), poly = [], N = 9, cracks = [];
    for (let k = 0; k < N; k++) { const a = k / N * TAU + (r() - .5) * .35, j = .86 + r() * .2; poly.push([Math.cos(a) * w / 2 * j * 1.02, Math.sin(a) * h / 2 * j * 1.05]); }
    for (let k = 0; k < 3; k++) cracks.push([(r() - .5) * w * .6, (r() - .5) * h * .5, (r() - .5) * w * .4, (r() - .5) * h * .5]);
    return { name, l: i ? 'fa' : 'en', w, h, poly, cracks, trail: [] };
  });
  x.restore();
}
function drawChunk(c, px, py, sc, al, cur, hot){
  x.save(); x.translate(px, py); x.scale(sc, sc); x.globalAlpha = al;
  x.beginPath(); c.poly.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.closePath();
  const g = x.createLinearGradient(-c.w / 2, -c.h / 2, c.w / 2, c.h / 2);
  g.addColorStop(0, '#a8968a'); g.addColorStop(.5, '#6b5b50'); g.addColorStop(1, '#2d2520');
  x.fillStyle = g; x.fill();
  x.save(); x.clip();
  x.globalAlpha = al * .32; x.fillStyle = '#fff'; x.beginPath(); x.ellipse(-c.w * .18, -c.h * .28, c.w * .3, c.h * .16, -.2, 0, TAU); x.fill();
  x.globalAlpha = al * .5; x.strokeStyle = '#1a130e'; x.lineWidth = 1;
  c.cracks.forEach(k => { x.beginPath(); x.moveTo(k[0], k[1]); x.lineTo(k[0] + k[2], k[1] + k[3]); x.stroke(); });
  x.restore();
  x.globalAlpha = al; x.lineWidth = 1; x.strokeStyle = 'rgba(0,0,0,.55)'; x.stroke();
  if (hot > .02) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = al * hot; x.lineWidth = 2; x.strokeStyle = 'rgb(255,150,60)'; x.stroke(); x.globalCompositeOperation = 'source-over'; }
  if (cur) { x.globalAlpha = al; x.lineWidth = 2; x.strokeStyle = 'rgb(93,228,255)'; x.shadowColor = 'rgba(93,228,255,.9)'; x.shadowBlur = 8; x.stroke(); x.shadowBlur = 0; }
  x.font = chunkFont(); x.textAlign = 'center'; x.textBaseline = 'middle'; if ('direction' in x) x.direction = lang === 'fa' ? 'rtl' : 'ltr';
  x.globalAlpha = al; x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,.85)'; x.shadowBlur = 3; x.fillText(c.name, 0, 1); x.shadowBlur = 0;
  x.restore();
}
const RM = 72;
function mpos(i, tm, col){
  const em = eout(clamp(tm / 1.0)), th = i * Math.PI + 2.1 * tm + (1 - em) * 5;
  const rho = (.775 + .225 * Math.sin(.9 * tm + i * 2.1)) * em * (1 - col), R = rho * RM;
  const x3 = R * Math.cos(th), z3 = R * Math.sin(th), y3 = 22 * Math.sin(.65 * tm + i * 2.4) * em * (1 - col);
  const sx = x3, sy = y3 + z3 * .42, T = -.28, c = Math.cos(T), s = Math.sin(T);
  return { x: CX + sx * c - sy * s, y: CY + sx * s + sy * c, z: z3 / RM, em };
}

/* ---------- state + effects ---------- */
const ST = { mode: 'idle', t0: 0, t1: 0, tmClose: 0, det: false, frags: [], sparks: [], smoke: [], embers: [], mp: [], reformT: -9 };
function buildFrags(){
  const r = rng((Math.random() * 1e9) | 0), N = 7, a0 = r() * TAU, R = ER, r1 = [], r2 = [], out = [];
  for (let i = 0; i < N; i++) {
    const a = a0 + (i + (r() - .5) * .5) / N * TAU, k1 = R * (.34 + r() * .12), b = a + (r() - .5) * .15, k2 = R * (1.02 + r() * .06);
    r1.push([Math.cos(a) * k1, Math.sin(a) * k1]); r2.push([Math.cos(b) * k2, Math.sin(b) * k2]);
  }
  const add = pts => {
    let cx = 0, cy = 0; pts.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= pts.length; cy /= pts.length;
    const m = Math.hypot(cx, cy), dir = m > 4 ? [cx / m, cy / m] : [Math.cos(r() * TAU), Math.sin(r() * TAU)], sp = (m > 4 ? 100 : 55) + r() * 70, ta = (r() - .5) * .5;
    out.push({ p: pts.map(p => [p[0] - cx, p[1] - cy]), cx, cy, vx: dir[0] * sp - dir[1] * sp * ta, vy: dir[1] * sp + dir[0] * sp * ta, r0: (r() - .5) * 1.2, sp: (r() - .5) * 6 });
  };
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N, mid = [(r2[i][0] + r2[j][0]) / 2 * (1.05 + r() * .06), (r2[i][1] + r2[j][1]) / 2 * (1.05 + r() * .06)];
    add([[0, 0], r1[i], r1[j]]); add([r1[i], r2[i], mid, r2[j], r1[j]]);
  }
  return out;
}
function drawFragAt(f, px, py, rot, a, hot){
  if (a <= .01) return;
  x.save(); x.translate(px, py); x.rotate(rot);
  x.beginPath(); f.p.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.closePath();
  x.save(); x.clip(); x.globalAlpha = a; x.drawImage(ec, -ER - f.cx, -ER - f.cy, ER * 2, ER * 2);
  if (hot > 0) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = a * hot * .55; x.fillStyle = 'rgb(255,110,30)'; x.fill(); }
  x.restore();
  if (hot > 0) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = a * hot; x.lineWidth = 1.6; x.strokeStyle = 'rgb(255,170,80)'; x.stroke(); }
  x.restore();
}
function ring(R, w, rgb, a){
  if (a < .005) return;
  const g = x.createRadialGradient(CX, CY, Math.max(0, R - w), CX, CY, R + w);
  g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(.5, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g; x.beginPath(); x.arc(CX, CY, R + w, 0, TAU); x.fill();
}
function detonate(){
  ST.det = true; earthTick(true); ST.frags = buildFrags();
  for (let i = 0; i < 70; i++) { const a = rnd(0, TAU), v = rnd(90, 420) * (Math.random() < .2 ? 1.5 : 1); ST.sparks.push({ x: CX, y: CY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: rnd(.35, 1.1) }); }
  for (let i = 0; i < 12; i++) { const a = rnd(0, TAU), d = rnd(0, ER * .7); ST.smoke.push({ x: CX + Math.cos(a) * d, y: CY + Math.sin(a) * d, vx: Math.cos(a) * rnd(10, 40), vy: Math.sin(a) * rnd(10, 40), s0: rnd(12, 22), s1: rnd(40, 70), life: rnd(1.2, 2), age: 0, dk: rnd(.5, 1) }); }
  for (let i = 0; i < 14; i++) { const a = rnd(0, TAU), v = rnd(20, 110); ST.embers.push({ x: CX, y: CY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: rnd(1.2, 2.4), ph: rnd(0, TAU) }); }
}
function drawBlast(td, dt){
  x.globalCompositeOperation = 'source-over';
  for (let i = ST.smoke.length - 1; i >= 0; i--) {
    const s = ST.smoke[i]; s.age += dt; if (s.age > s.life) { ST.smoke.splice(i, 1); continue; }
    const k = s.age / s.life, dr = Math.exp(-1.6 * dt); s.vx *= dr; s.vy *= dr; s.x += s.vx * dt; s.y += s.vy * dt;
    const r = lerp(s.s0, s.s1, eout(k)); x.globalAlpha = .36 * (1 - k) * s.dk * clamp(k * 10); x.drawImage(SMK, s.x - r, s.y - r, r * 2, r * 2);
  }
  x.globalAlpha = 1;
  for (const f of ST.frags) {
    const e = (1 - Math.exp(-2.2 * td)) / 2.2;
    drawFragAt(f, CX + f.cx + f.vx * e, CY + f.cy + f.vy * e, f.r0 + f.sp * td, 1 - clamp((td - .7) / .9), clamp(1 - td / 1));
  }
  x.globalCompositeOperation = 'lighter';
  const fb2 = td / .95;
  if (fb2 < 1) {
    const s = ER * (1.1 + 3.1 * eout(fb2)); x.globalAlpha = Math.pow(1 - fb2, 1.3); x.drawImage(GO, CX - s, CY - s, s * 2, s * 2);
    const s2 = s * .55; x.globalAlpha = Math.pow(1 - fb2, 2); x.drawImage(GL, CX - s2, CY - s2, s2 * 2, s2 * 2);
  }
  x.globalAlpha = 1;
  const rt = td / 1.0;
  if (rt < 1) { const a = 1 - rt, R = ER * .8 + 120 * eout(rt), w = 6 + 10 * rt; ring(R - 2.5, w, '255,130,120', .28 * a); ring(R, w, '255,235,200', .5 * a); ring(R + 2.5, w, '120,160,255', .28 * a); ring(R * .62, w * .8, '170,140,255', .25 * a); }
  x.lineCap = 'round';
  for (let i = ST.sparks.length - 1; i >= 0; i--) {
    const p = ST.sparks[i]; p.age += dt; if (p.age > p.life) { ST.sparks.splice(i, 1); continue; }
    const dr = Math.exp(-1.9 * dt); p.vx *= dr; p.vy *= dr; p.x += p.vx * dt; p.y += p.vy * dt;
    const k = p.age / p.life, a = 1 - k; x.globalAlpha = a; x.lineWidth = 1.8 * a + .5; x.strokeStyle = `rgb(255,${(240 - 170 * k) | 0},${(200 - 170 * k) | 0})`;
    x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x - p.vx * .05, p.y - p.vy * .05); x.stroke();
  }
  for (let i = ST.embers.length - 1; i >= 0; i--) {
    const e = ST.embers[i]; e.age += dt; if (e.age > e.life) { ST.embers.splice(i, 1); continue; }
    const dr = Math.exp(-1.1 * dt); e.vx *= dr; e.vy *= dr; e.x += e.vx * dt; e.y += e.vy * dt;
    const k = e.age / e.life, s = 8 * (1 - k * .4); x.globalAlpha = (1 - k) * (.6 + .4 * Math.sin(now * 14 + e.ph)); x.drawImage(GO, e.x - s, e.y - s, s * 2, s * 2);
  }
  const fl = Math.max(0, 1 - td / .26);
  if (fl > 0) { const s = ER * 4.5; x.globalAlpha = fl; x.drawImage(GL, CX - s, CY - s, s * 2, s * 2); }
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
}
function drawMeteors(tm, col){
  const arr = chunks.map((c, i) => Object.assign({ c, i }, mpos(i, tm, col))).sort((a, b) => a.z - b.z);
  ST.mp = [];
  for (const o of arr) {
    if (o.em < .02) continue;
    const sc = (1 + .2 * o.z) * (.45 + .55 * o.em) * (1 - col * .75), al = (.62 + .38 * (o.z + 1) / 2) * o.em * (1 - col * .9);
    const tr = o.c.trail; tr.push([o.x, o.y]); if (tr.length > 16) tr.shift();
    x.globalCompositeOperation = 'lighter';
    for (let k = 0; k < tr.length; k++) { const q = tr[k], f = k / tr.length, s = 2 + f * 5; x.globalAlpha = f * .28 * al; x.drawImage(GO, q[0] - s, q[1] - s, s * 2, s * 2); }
    x.globalCompositeOperation = 'source-over';
    drawChunk(o.c, o.x, o.y, sc, al, o.c.l === lang, clamp(1 - tm / 1.2) * .9);
    ST.mp.push({ l: o.c.l, x: o.x, y: o.y, w: o.c.w * sc, h: o.c.h * sc });
  }
  x.globalAlpha = 1;
}
function drawIdle(){
  earthTick(false);
  const ta = clamp((now - ST.reformT) / .6);
  atmosphere(1); textPass(false, ta); drawEarth(); textPass(true, ta);
  const pt = now - ST.reformT;
  if (pt >= 0 && pt < .7) {
    const k = pt / .7; x.globalCompositeOperation = 'lighter';
    const s = ER * 2.3; x.globalAlpha = .55 * (1 - k); x.drawImage(GL, CX - s, CY - s, s * 2, s * 2);
    ring(ER * (1 + 1.5 * eout(k)), 5, '170,210,255', .5 * (1 - k)); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  }
}
function drawOpen(dt){
  const tau = now - ST.t0;
  if (!ST.det && tau < .2) {
    const k = tau / .2;
    earthTick(false); atmosphere(1 + k); textPass(false, 1 - k); drawEarth(rnd(-1, 1) * 2 * k, rnd(-1, 1) * 2 * k); textPass(true, 1 - k);
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = k * .7; const s = ER * 2.2; x.drawImage(GO, CX - s, CY - s, s * 2, s * 2);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; return;
  }
  if (!ST.det) detonate();
  const td = reduce ? 9 : tau - .2;
  drawBlast(td, dt);
  drawMeteors(reduce ? 3 : td - .12, 0);
}
function drawClosing(dt){
  const tc = now - ST.t1; earthTick(false);
  const q = eio(clamp((tc - .1) / .72)), a = clamp(tc / .15);
  for (const f of ST.frags) {
    const off = .414 * (1 - q), e = 1;
    drawFragAt(f, CX + f.cx + f.vx * off * e, CY + f.cy + f.vy * off * e, f.r0 * (1 - q) + f.sp * 1.1 * (1 - q), a, (1 - q) * .5);
  }
  const col = eio(clamp(tc / .6));
  drawMeteors(ST.tmClose + tc, col);
  if (tc > .45) { x.globalCompositeOperation = 'lighter'; const g = clamp((tc - .45) / .4), s = ER * 2.6 * g; x.globalAlpha = .55 * g; x.drawImage(GL, CX - s, CY - s, s * 2, s * 2); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
  if (tc >= .85) { ST.mode = 'idle'; ST.reformT = now; }
}
function draw(dt){
  x.setTransform(dpr, 0, 0, dpr, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, CW, CH);
  if (!reduce) U += dt * .5;
  if (ST.mode === 'idle') drawIdle(); else if (ST.mode === 'open') drawOpen(dt); else drawClosing(dt);
}

/* ---------- interaction ---------- */
function open(){
  if (ST.mode !== 'idle') return;
  ST.mode = 'open'; ST.t0 = now; ST.det = false; ST.sparks = []; ST.smoke = []; ST.embers = []; ST.frags = [];
  chunks.forEach(c => { c.trail = []; });
  wrap.classList.add('open'); hit.setAttribute('aria-expanded', 'true');
  if (reduce) { ST.t0 = now - 6; ST.det = true; }
}
function close(){
  if (ST.mode !== 'open') return;
  wrap.classList.remove('open'); hit.setAttribute('aria-expanded', 'false');
  if (reduce) { ST.mode = 'idle'; ST.reformT = now - 1; return; }
  ST.mode = 'closing'; ST.t1 = now; ST.tmClose = Math.max(0, now - ST.t0 - .32);
  earthTick(true); ST.frags = buildFrags();
}
function choose(l){ setLang(l); if (ST.mode === 'open') close(); }
function onTap(cx, cy, kb){
  if (body.classList.contains('launched')) return;
  const r = cv.getBoundingClientRect(), px = cx - r.left, py = cy - r.top;
  if (ST.mode === 'idle') { if (kb || Math.hypot(px - CX, py - CY) <= ER + 16) open(); return; }
  if (ST.mode === 'open') {
    if (kb) { close(); return; }
    for (const m of ST.mp) if (Math.abs(px - m.x) <= m.w / 2 + 10 && Math.abs(py - m.y) <= m.h / 2 + 12) { choose(m.l); return; }
    close();
  }
}
hit.addEventListener('click', e => { e.stopPropagation(); onTap(e.clientX, e.clientY, e.detail === 0); });
wrap.querySelectorAll('.sr').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); choose(b.dataset.l); }));
addEventListener('click', e => { if (e.target instanceof Element && e.target.closest('.sr')) return; onTap(e.clientX, e.clientY, false); });
addEventListener('keydown', e => { if (e.key === 'Escape' && ST.mode === 'open') close(); });
addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || body.classList.contains('launched')) return;
  const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top; let h = false;
  if (ST.mode === 'idle') h = Math.hypot(px - CX, py - CY) <= ER + 16;
  else if (ST.mode === 'open') h = ST.mp.some(m => Math.abs(px - m.x) <= m.w / 2 + 10 && Math.abs(py - m.y) <= m.h / 2 + 12);
  doc.documentElement.style.cursor = h ? 'pointer' : '';
}, { passive: true });
function reset(){
  if (ST.mode === 'idle') return;
  ST.mode = 'idle'; ST.reformT = -9; wrap.classList.remove('open'); hit.setAttribute('aria-expanded', 'false'); doc.documentElement.style.cursor = '';
}
doc.addEventListener('nrp-lang', () => { layoutText(); buildChunks(); });

/* ---------- loop ---------- */
let last = performance.now();
function frame(ts){
  requestAnimationFrame(frame);
  const dt = Math.min(.05, Math.max(0, (ts - last) / 1000)); last = ts;
  if (body.classList.contains('launched')) { reset(); return; }
  if (doc.hidden) return;
  now += dt;
  try { draw(dt); } catch (e) { if (typeof showErr === 'function') showErr(e); }
}
layoutText(); buildChunks(); earthTick(true);
requestAnimationFrame(frame);
})();
