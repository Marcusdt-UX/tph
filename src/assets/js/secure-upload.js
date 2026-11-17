// TPH Secure Upload: encrypts each file in the browser with the TPH Secure
// Uploads public key (OpenPGP), then streams the ciphertext to the server in
// small chunks. Plaintext never leaves this tab.
import * as openpgp from '/assets/js/vendor/openpgp.min.mjs';

const API = '/api/secure-upload/upload.php';
const CHUNK = 3 * 1024 * 1024;          // 3 MB per request (server allows 4)
const MAX_FILES = 25;
const MAX_TOTAL = 2 * 1024 * 1024 * 1024;

const $ = (id) => document.getElementById(id);
const form = $('su-form');
const input = $('su-files');
const drop = $('su-drop');
const list = $('su-list');
const errBox = $('su-error');
const submit = $('su-submit');
const progress = $('su-progress');
const bar = $('su-bar-fill');
const statusEl = $('su-status');

let files = [];
let keyPromise = openpgp.readKey({ armoredKey: $('su-key').textContent.trim() });

const fmt = (n) => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : n < 1073741824 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1073741824).toFixed(2)} GB`;

function render() {
  list.innerHTML = '';
  files.forEach((f, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="su-name"></span><span class="su-size">${fmt(f.size)}</span><button type="button" aria-label="Remove">&times;</button>`;
    li.querySelector('.su-name').textContent = f.name;
    li.querySelector('button').onclick = () => { files.splice(i, 1); render(); };
    list.appendChild(li);
  });
}

function addFiles(fileList) {
  for (const f of fileList) {
    if (!files.some((x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified)) files.push(f);
  }
  $('su-files-error').classList.remove('visible');
  render();
}

input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
['dragenter', 'dragover'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (ev) => addFiles(ev.dataTransfer.files));

function showError(msg) { errBox.textContent = msg; errBox.hidden = false; }

async function post(params, body, headers = {}, tries = 4) {
  const url = `${API}?${new URLSearchParams(params)}`;
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { method: 'POST', body, headers, cache: 'no-store' });
    } catch (e) {
      if (attempt >= tries) throw new Error('Connection lost. Check your internet and try again.');
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      continue;
    }
    let json = {};
    try { json = await res.json(); } catch {}
    if (res.ok && json.ok) return json;
    if (res.status >= 500 && attempt < tries) { await new Promise((r) => setTimeout(r, 1000 * attempt)); continue; }
    throw new Error(json.error || `Upload failed (${res.status}).`);
  }
}

function validate() {
  let ok = true;
  const req = [['su-code', 'su-code-error'], ['su-name', 'su-name-error']];
  for (const [id, err] of req) {
    const bad = !$(id).value.trim();
    $(id).classList.toggle('invalid', bad);
    $(err).classList.toggle('visible', bad);
    if (bad) ok = false;
  }
  if (!files.length) { $('su-files-error').classList.add('visible'); ok = false; }
  if (files.length > MAX_FILES) { showError(`Please send ${MAX_FILES} files or fewer at a time.`); ok = false; }
  const total = files.reduce((s, f) => s + f.size, 0);
  if (total > MAX_TOTAL) { showError('That is more than 2 GB. Please split it into a few uploads.'); ok = false; }
  return ok;
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  errBox.hidden = true;
  if (!validate()) return;

  submit.disabled = true;
  progress.hidden = false;
  const totalBytes = files.reduce((s, f) => s + f.size, 0) || 1;
  let sentBytes = 0;
  const setProgress = (msg) => {
    bar.style.width = `${Math.min(99, (sentBytes / totalBytes) * 100).toFixed(1)}%`;
    if (msg) statusEl.textContent = msg;
  };

  try {
    const key = await keyPromise;
    setProgress('Checking your code...');
    const start = await post({ action: 'start' }, JSON.stringify({ code: $('su-code').value, fileCount: files.length }), { 'Content-Type': 'application/json' });
    const auth = { 'X-SU-Token': start.token, 'Content-Type': 'application/octet-stream' };

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setProgress(`Encrypting and sending ${f.name} (${i + 1} of ${files.length})...`);
      const message = await openpgp.createMessage({ binary: f.stream(), filename: f.name, date: new Date(f.lastModified || Date.now()), format: 'binary' });
      const encrypted = await openpgp.encrypt({ message, encryptionKeys: key, format: 'binary' });
      const reader = encrypted.getReader();

      let buf = new Uint8Array(CHUNK);
      let len = 0;
      let seq = 0;
      const flush = async () => {
        if (!len) return;
        await post({ action: 'chunk', id: start.id, f: i, seq }, buf.slice(0, len), auth);
        seq++;
        sentBytes += len;
        len = 0;
        setProgress();
      };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        let off = 0;
        while (off < value.length) {
          const n = Math.min(CHUNK - len, value.length - off);
          buf.set(value.subarray(off, off + n), len);
          len += n; off += n;
          if (len === CHUNK) await flush();
        }
      }
      await flush();
      list.children[i]?.classList.add('done');
    }

    setProgress('Finishing up...');
    const meta = {
      name: $('su-name').value.trim(),
      email: $('su-email').value.trim(),
      note: $('su-note').value.trim(),
      sentAt: new Date().toISOString(),
      files: files.map((f, i) => ({ index: i, name: f.name, size: f.size, type: f.type, lastModified: f.lastModified })),
    };
    const metaMsg = await openpgp.encrypt({ message: await openpgp.createMessage({ text: JSON.stringify(meta) }), encryptionKeys: key });
    await post({ action: 'meta', id: start.id }, metaMsg, auth);
    await post({ action: 'finish', id: start.id }, '', { 'X-SU-Token': start.token });

    bar.style.width = '100%';
    $('su-success-text').textContent = `${files.length} file${files.length === 1 ? '' : 's'} (${fmt(totalBytes)}) encrypted and delivered to TPH. We'll reach out if we need anything else.`;
    form.style.display = 'none';
    $('su-success').classList.add('show');
  } catch (e) {
    console.error(e);
    showError(e.message || 'Something went wrong. Please try again.');
  } finally {
    submit.disabled = false;
    progress.hidden = true;
  }
});

$('su-again').addEventListener('click', () => {
  files = [];
  render();
  $('su-note').value = '';
  $('su-success').classList.remove('show');
  form.style.display = '';
});

// Prefill the code from a link like /secure-upload?code=ABCD-EFGH-JKLM
const pre = new URLSearchParams(location.search).get('code');
if (pre) $('su-code').value = pre;
