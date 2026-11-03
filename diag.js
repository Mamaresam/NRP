'use strict';
(() => {
const lines = [];
const box = document.createElement('pre');
const s = box.style;
s.position = 'fixed'; s.left = '8px'; s.right = '8px'; s.bottom = '8px'; s.zIndex = '99999';
s.margin = '0'; s.padding = '8px'; s.font = '12px/1.5 monospace'; s.color = '#c8ffd0';
s.background = 'rgba(0,0,0,.88)'; s.whiteSpace = 'pre-wrap'; s.maxHeight = '45vh';
s.overflow = 'auto'; s.direction = 'ltr'; s.textAlign = 'left';

const add = t => {
  lines.push(t);
  box.textContent = lines.join('\n');
  if (!box.isConnected && document.body) document.body.append(box);
};
const name = u => String(u || '').split('/').pop();

addEventListener('error', ev => {
  const tg = ev.target;
  if (tg && tg !== window && (tg.src || tg.href)) { add('LOAD FAIL: ' + name(tg.src || tg.href)); return; }
  add('ERROR ' + name(ev.filename) + ':' + ev.lineno + ':' + ev.colno + ' ' + ev.message);
}, true);
addEventListener('unhandledrejection', ev => {
  add('PROMISE ERROR: ' + String((ev.reason && ev.reason.message) || ev.reason));
});

function report(){
  const sky = document.getElementById('sky');
  const st = document.querySelector('.stage');
  add('--- report ---');
  add('canvas#sky: ' + (sky
    ? sky.width + 'x' + sky.height + (sky.width === 300 && sky.height === 150 ? ' (never initialized)' : ' (initialized)')
    : 'MISSING'));
  add('old intro elements (la/lb/rk): ' + (document.getElementById('la') ? 'PRESENT (old index.html)' : 'absent'));
  add('stage background: ' + (st ? getComputedStyle(st).backgroundColor : 'no .stage'));
  add('body class: "' + document.body.className + '"');
  add('page height: ' + document.documentElement.scrollHeight + ' / window: ' + innerHeight + ' / scrollY: ' + Math.round(scrollY));
  const files = performance.getEntriesByType('resource')
    .filter(r => /\.(js|css)(\?|$)/.test(r.name))
    .map(r => name(r.name) + (r.transferSize === 0 ? ' (cache)' : ''));
  add('files: ' + files.join(', '));
}
addEventListener('load', () => setTimeout(report, 3000));
})();
