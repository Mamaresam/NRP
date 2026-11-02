'use strict';
const $ = s => document.querySelector(s);
const API = 'https://openrouter.ai/api/v1/chat/completions';
const log = $('#log'), input = $('#input'), sendBtn = $('#send'), statusEl = $('#status');
let history = [], busy = false, ctrl = null;

const store = {
  get(k){ try { return sessionStorage.getItem(k) ?? localStorage.getItem(k) ?? ''; } catch { return ''; } },
  set(k,v,persist){ try { (persist ? localStorage : sessionStorage).setItem(k,v); (persist ? sessionStorage : localStorage).removeItem(k); } catch {} },
  del(k){ try { sessionStorage.removeItem(k); localStorage.removeItem(k); } catch {} }
};

function cfg(){
  return { key: store.get('key'), model: store.get('model'), sys: store.get('sys'), deny: store.get('deny') !== '0' };
}
function refreshLabel(){ $('#modelLabel').textContent = cfg().model; }

// Render text safely: only textContent, never innerHTML. Fenced code becomes <pre>.
function render(el, text){
  el.replaceChildren();
  text.split('```').forEach((part, i) => {
    if (i % 2) {
      const pre = document.createElement('pre'), code = document.createElement('code');
      code.textContent = part.replace(/^[^\n]*\n/, '');
      pre.append(code); el.append(pre);
    } else if (part) {
      const d = document.createElement('div'); d.className = 't'; d.dir = 'auto'; d.textContent = part; el.append(d);
    }
  });
}
function addMsg(role, text){
  $('#empty')?.remove();
  const el = document.createElement('div'); el.className = 'msg ' + role;
  if (role === 'assistant') render(el, text); else { el.dir = 'auto'; el.textContent = text; }
  log.append(el); log.scrollTop = log.scrollHeight; return el;
}
function setBusy(b){ busy = b; sendBtn.textContent = b ? 'توقف' : 'ارسال'; }

async function send(){
  if (busy) { ctrl?.abort(); return; }
  const text = input.value.trim(); if (!text) return;
  const c = cfg();
  if (!c.key || !c.model) { $('#dlg').showModal(); statusEl.textContent = 'ابتدا کلید و مدل را وارد کن.'; return; }
  input.value = ''; input.style.height = 'auto'; statusEl.textContent = '';
  history.push({ role: 'user', content: text }); addMsg('user', text);
  const out = addMsg('assistant', ''); let acc = '';
  ctrl = new AbortController(); setBusy(true);
  try {
    const msgs = (c.sys ? [{ role: 'system', content: c.sys }] : []).concat(history);
    const body = { model: c.model, messages: msgs, stream: true };
    if (c.deny) body.provider = { data_collection: 'deny' };
    const res = await fetch(API, {
      method: 'POST', signal: ctrl.signal, referrerPolicy: 'no-referrer', credentials: 'omit', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.key },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      let m = ''; try { m = (await res.json()).error?.message || ''; } catch {}
      throw new Error(res.status + (m ? ': ' + m : ''));
    }
    const reader = res.body.getReader(), dec = new TextDecoder(); let buf = '';
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop();
      for (const l of lines) {
        if (!l.startsWith('data: ')) continue;
        const d = l.slice(6).trim(); if (d === '[DONE]') continue;
        try {
          const j = JSON.parse(d);
          if (j.error) throw new Error(j.error.message || 'خطا');
          const t = j.choices?.[0]?.delta?.content;
          if (t) { acc += t; render(out, acc); log.scrollTop = log.scrollHeight; }
        } catch (e) { if (e.message && !(e instanceof SyntaxError)) throw e; }
      }
    }
    if (acc) history.push({ role: 'assistant', content: acc }); else out.remove();
  } catch (e) {
    if (acc) history.push({ role: 'assistant', content: acc });
    if (e.name === 'AbortError') { if (!acc) out.remove(); }
    else { if (!acc) out.remove(); const er = addMsg('assistant', ''); er.className = 'msg error'; er.textContent = 'خطا: ' + e.message + (/^40[13]/.test(e.message) ? ' (کلید یا اعتبار را بررسی کن)' : ''); }
  } finally { setBusy(false); ctrl = null; }
}

sendBtn.addEventListener('click', send);
input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; });

$('#newBtn').addEventListener('click', () => { ctrl?.abort(); history = []; log.replaceChildren(); statusEl.textContent = ''; });
$('#setBtn').addEventListener('click', () => {
  const c = cfg();
  $('#key').value = c.key; $('#model').value = c.model; $('#sys').value = c.sys; $('#deny').checked = c.deny;
  $('#remember').checked = !!(() => { try { return localStorage.getItem('key'); } catch { return ''; } })();
  $('#dlg').showModal();
});
$('#save').addEventListener('click', () => {
  const persist = $('#remember').checked;
  store.set('key', $('#key').value.trim(), persist);
  store.set('model', $('#model').value.trim(), persist);
  store.set('sys', $('#sys').value, persist);
  store.set('deny', $('#deny').checked ? '1' : '0', persist);
  refreshLabel(); $('#dlg').close();
});
$('#wipe').addEventListener('click', () => { store.del('key'); $('#key').value = ''; $('#remember').checked = false; });
$('#dlg').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

refreshLabel();
if (!cfg().key) statusEl.textContent = 'کلید API تنظیم نشده است.';
