'use strict';
const $ = s => document.querySelector(s);
const API = 'https://openrouter.ai/api/v1/chat/completions';
const log = $('#log'), input = $('#input'), sendBtn = $('#send'), statusEl = $('#status'), emptyEl = $('#empty');
let messages = [], busy = false, ctrl = null, statusKey = '';

const I18N = {
  fa: {
    title: 'ماده‌ی تاریک', new: 'گفتگوی جدید', settings: 'تنظیمات', language: 'زبان',
    askAnything: 'هر چیزی بپرس.',
    placeholder: 'پیام خود را بنویس', send: 'ارسال', stop: 'توقف',
    secLang: 'زبان', secApi: 'اتصال', secPrivacy: 'حریم خصوصی',
    langEn: 'انگلیسی', langFa: 'فارسی',
    toLight: 'تم روشن', toDark: 'تم تیره',
    apiKey: 'کلید API (OpenRouter)', model: 'مدل',
    deny: 'فقط providerهایی که داده ذخیره نمی‌کنند',
    remember: 'کلید را در این مرورگر نگه دار',
    note: 'پیش‌فرض: کلید فقط تا بسته شدن تب می‌ماند. هیچ داده‌ای به جز درخواست مستقیم به openrouter.ai ارسال نمی‌شود.',
    wipe: 'پاک کردن کلید', save: 'ذخیره',
    needSetup: 'ابتدا کلید و مدل را وارد کن.',
    error: 'خطا', checkKey: ' (کلید یا اعتبار را بررسی کن)'
  },
  en: {
    title: 'Dark Matter', new: 'New chat', settings: 'Settings', language: 'Language',
    askAnything: 'Ask anything.',
    placeholder: 'Type your message', send: 'Send', stop: 'Stop',
    secLang: 'Language', secApi: 'Connection', secPrivacy: 'Privacy',
    langEn: 'English', langFa: 'Persian',
    toLight: 'Light theme', toDark: 'Dark theme',
    apiKey: 'API key (OpenRouter)', model: 'Model',
    deny: 'Only providers that do not store data',
    remember: 'Remember the key in this browser',
    note: 'By default the key lasts only until the tab is closed. Nothing is sent anywhere except directly to openrouter.ai.',
    wipe: 'Clear key', save: 'Save',
    needSetup: 'Enter your key and model first.',
    error: 'Error', checkKey: ' (check your key or credits)'
  }
};
let lang = 'en';
try { if (localStorage.getItem('lang') === 'fa') lang = 'fa'; } catch {}
// a right-to-left mark keeps trailing punctuation on the correct side of Persian text inside the left-to-right layout
const t = k => { const s = I18N[lang][k]; return lang === 'fa' ? s.replace(/([.…:!؟?])$/, '$1\u200F') : s; };

function updateSend(){
  sendBtn.classList.toggle('busy', busy);
  const l = busy ? t('stop') : t('send');
  sendBtn.setAttribute('aria-label', l); sendBtn.title = l;
}
function updateThemeBtn(){
  const light = document.documentElement.dataset.theme === 'light', l = t(light ? 'toDark' : 'toLight');
  const b = $('#themeBtn'); b.setAttribute('aria-label', l); b.title = l;
}
function applyLang(){
  const r = document.documentElement;
  r.lang = lang; r.dir = 'ltr';   // layout never flips: Persian is shown inside the same left-to-right layout
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-label]').forEach(el => { const l = t(el.dataset.i18nLabel); el.setAttribute('aria-label', l); el.title = l; });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.l === lang)));
  updateThemeBtn(); updateSend();
  statusEl.textContent = statusKey ? t(statusKey) : '';
  document.dispatchEvent(new Event('nrp-lang'));
}
function setLang(l){
  if (l === lang) return;
  lang = l;
  try { localStorage.setItem('lang', lang); } catch {}
  applyLang();
}
function setStatus(k){ statusKey = k; statusEl.textContent = k ? t(k) : ''; }

function applyTheme(th, anim){
  const r = document.documentElement;
  if (anim) { r.classList.add('theming'); setTimeout(() => r.classList.remove('theming'), 700); }
  if (th === 'light') r.dataset.theme = 'light'; else delete r.dataset.theme;
  try { localStorage.setItem('theme', th); } catch {}
  updateThemeBtn();
  document.dispatchEvent(new Event('nrp-theme'));
}
$('#themeBtn').addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light', true));
document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.l)));

const store = {
  get(k){ try { return sessionStorage.getItem(k) ?? localStorage.getItem(k) ?? ''; } catch { return ''; } },
  set(k,v,persist){ try { (persist ? localStorage : sessionStorage).setItem(k,v); (persist ? sessionStorage : localStorage).removeItem(k); } catch {} },
  del(k){ try { sessionStorage.removeItem(k); localStorage.removeItem(k); } catch {} }
};
function cfg(){ return { key: store.get('key'), model: store.get('model'), deny: store.get('deny') !== '0' }; }
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
function setBusy(b){ busy = b; updateSend(); }

async function send(){
  if (busy) { ctrl?.abort(); return; }
  const text = input.value.trim(); if (!text) return;
  const c = cfg();
  if (!c.key || !c.model) { $('#dlg').showModal(); setStatus('needSetup'); return; }
  input.value = ''; input.style.height = 'auto'; setStatus('');
  messages.push({ role: 'user', content: text }); addMsg('user', text);
  const out = addMsg('assistant', ''); let acc = '';
  ctrl = new AbortController(); setBusy(true);
  try {
    const body = { model: c.model, messages: messages, stream: true };
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
          if (j.error) throw new Error(j.error.message || t('error'));
          const tx = j.choices?.[0]?.delta?.content;
          if (tx) { acc += tx; render(out, acc); log.scrollTop = log.scrollHeight; }
        } catch (e) { if (e.message && !(e instanceof SyntaxError)) throw e; }
      }
    }
    if (acc) messages.push({ role: 'assistant', content: acc }); else out.remove();
  } catch (e) {
    if (acc) messages.push({ role: 'assistant', content: acc });
    if (e.name === 'AbortError') { if (!acc) out.remove(); }
    else {
      if (!acc) out.remove();
      const er = addMsg('assistant', ''); er.className = 'msg error'; er.dir = 'auto';
      er.textContent = t('error') + ': ' + e.message + (/^40[13]/.test(e.message) ? t('checkKey') : '');
    }
  } finally { setBusy(false); ctrl = null; }
}

sendBtn.addEventListener('click', send);
input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; });

$('#newBtn').addEventListener('click', () => { ctrl?.abort(); messages = []; log.replaceChildren(emptyEl); setStatus(''); });
$('#setBtn').addEventListener('click', () => {
  const c = cfg();
  $('#key').value = c.key; $('#model').value = c.model; $('#deny').checked = c.deny;
  $('#remember').checked = !!(() => { try { return localStorage.getItem('key'); } catch { return ''; } })();
  $('#dlg').showModal();
});
$('#save').addEventListener('click', () => {
  const persist = $('#remember').checked;
  store.set('key', $('#key').value.trim(), persist);
  store.set('model', $('#model').value.trim(), persist);
  store.set('deny', $('#deny').checked ? '1' : '0', persist);
  store.del('sys');
  refreshLabel(); $('#dlg').close(); setStatus('');
});
$('#wipe').addEventListener('click', () => { store.del('key'); $('#key').value = ''; $('#remember').checked = false; });
$('#dlg').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

refreshLabel();
applyLang();
