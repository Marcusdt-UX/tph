'use strict';

// ── State ────────────────────────────────────────────────────────────────────
let currentSerial   = null;
let currentFilePath = '/sdcard';
let allApps         = [];
let contextApp      = null;
let contextFile     = null;
let isMirroring     = false;
let dexEnabled      = false;

// ── Utilities ────────────────────────────────────────────────────────────────
function $(id)  { return document.getElementById(id); }
function qsa(s) { return [...document.querySelectorAll(s)]; }

let toastTimer;
function toast(msg, type = '') {
  const el = $('toast');
  el.textContent = msg;
  el.className = 'show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 3500);
}

function formatBytes(n) {
  if (n < 1024)      return `${n} B`;
  if (n < 1048576)   return `${(n/1024).toFixed(1)} KB`;
  if (n < 1073741824)return `${(n/1048576).toFixed(1)} MB`;
  return `${(n/1073741824).toFixed(2)} GB`;
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000)  return 'just now';
  if (diff < 3600000)return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000)return `${Math.floor(diff/3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

// App colour based on first letter
function appColor(name) {
  const palette = ['#1a73e8','#34a853','#fbbc04','#ea4335','#9c27b0','#00bcd4','#ff5722','#607d8b'];
  const i = (name.charCodeAt(0) || 0) % palette.length;
  return palette[i];
}

// ── Panel navigation ─────────────────────────────────────────────────────────
function showPanel(name) {
  qsa('.panel').forEach(p => p.classList.remove('active'));
  qsa('.tb-nav-btn').forEach(b => b.classList.remove('active'));

  const panel = $(`panel-${name}`);
  const navBtn = $(`nav-${name}`);
  if (panel) panel.classList.add('active');
  if (navBtn) navBtn.classList.add('active');

  // Auto-load panel data
  if (name === 'launcher' && currentSerial) loadApps();
  if (name === 'files'    && currentSerial) loadFiles(currentFilePath);
  if (name === 'notif'    && currentSerial) loadNotifications();
  if (name === 'settings' && currentSerial) loadDeviceInfo();
}

document.addEventListener('DOMContentLoaded', () => {
  initWindowControls();
  initClock();
  initNavigation();
  initDeviceEvents();
  initConnectPanel();
  initAppLauncher();
  initFileManager();
  initNotifications();
  initSettings();
  initContextMenus();
  initialDeviceScan();
});

// ── Window controls ──────────────────────────────────────────────────────────
function initWindowControls() {
  $('btn-minimize').onclick = () => window.foldDex.minimize();
  $('btn-maximize').onclick = () => window.foldDex.maximize();
  $('btn-close').onclick    = () => window.foldDex.close();
}

// ── Clock ────────────────────────────────────────────────────────────────────
function initClock() {
  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    $('clock-time').textContent = `${h}:${m}`;
    $('clock-date').textContent = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;
  }
  tick();
  setInterval(tick, 10000);
}

// ── Navigation ───────────────────────────────────────────────────────────────
function initNavigation() {
  qsa('[data-panel]').forEach(btn => {
    btn.onclick = () => {
      const name = btn.dataset.panel;
      if (!currentSerial && !['connect','settings'].includes(name)) {
        toast('Connect a device first', 'err'); return;
      }
      showPanel(name);
    };
  });
}

// ── Device events (from main process) ────────────────────────────────────────
function initDeviceEvents() {
  window.foldDex.on('devices-updated', (devices) => {
    updateDeviceStrip(devices);
  });

  window.foldDex.on('device-changed', (device) => {
    if (device) {
      currentSerial = device.serial;
      onDeviceConnected(device);
    } else {
      currentSerial = null;
      onDeviceDisconnected();
    }
  });
}

function updateDeviceStrip(devices) {
  const el = $('strip-device');
  if (!devices.length) {
    el.textContent = 'No device';
    $('strip-bat').classList.add('hidden');
    return;
  }
  el.textContent = devices[0].model || devices[0].serial;
  refreshBattery();
}

async function refreshBattery() {
  if (!currentSerial) return;
  const bat = await window.foldDex.getBattery(currentSerial);
  if (!bat) return;

  $('strip-bat').classList.remove('hidden');
  $('strip-bat-level').textContent = bat.level;
  $('strip-bat-icon').textContent  = bat.level > 20 ? '🔋' : '🪫';
  if (bat.charging) $('strip-charging').classList.remove('hidden');
  else              $('strip-charging').classList.add('hidden');
}

function onDeviceConnected(device) {
  // Enable taskbar action buttons
  ['tb-screenshot','tb-dex','tb-mirror'].forEach(id => {
    const el = $(id);
    if (el) el.disabled = false;
  });
  toast(`Connected: ${device.model || device.serial}`, 'ok');
  refreshBattery();
  setInterval(refreshBattery, 15000);
}

function onDeviceDisconnected() {
  ['tb-screenshot','tb-dex','tb-mirror'].forEach(id => {
    const el = $(id);
    if (el) el.disabled = true;
  });
  toast('Device disconnected', 'err');
  showPanel('connect');
}

async function initialDeviceScan() {
  const devices = await window.foldDex.getDevices();
  if (devices.length) {
    currentSerial = devices[0].serial;
    onDeviceConnected(devices[0]);
    updateDeviceStrip(devices);
  }
}

// ── Connect panel ────────────────────────────────────────────────────────────
function initConnectPanel() {
  $('btn-usb-scan').onclick = async () => {
    $('btn-usb-scan').textContent = 'Scanning…';
    const devices = await window.foldDex.getDevices();
    $('btn-usb-scan').textContent = 'Scan for Devices';
    renderDeviceList(devices);
  };

  $('btn-wifi-connect').onclick = async () => {
    const host = $('wifi-host').value.trim();
    const port = $('wifi-port').value.trim() || '5555';
    if (!host) { toast('Enter an IP address', 'err'); return; }

    $('btn-wifi-connect').disabled = true;
    const statusEl = $('wifi-status');
    statusEl.textContent = `Connecting to ${host}:${port}…`;
    statusEl.className = 'status-msg';
    statusEl.classList.remove('hidden');

    const result = await window.foldDex.connectWifi(host, parseInt(port));
    $('btn-wifi-connect').disabled = false;

    if (result.success && !result.stdout.includes('failed')) {
      statusEl.textContent = `Connected! ${result.stdout}`;
      statusEl.classList.add('ok');
      toast('WiFi connection established', 'ok');
      setTimeout(() => window.foldDex.getDevices().then(renderDeviceList), 1500);
    } else {
      statusEl.textContent = result.stderr || result.error || 'Connection failed';
      statusEl.classList.add('err');
    }
  };
}

function renderDeviceList(devices) {
  const list = $('usb-device-list');
  if (!devices.length) {
    list.innerHTML = '<div class="empty-state" style="padding:12px;font-size:11px">No devices found. Check USB cable and USB debugging.</div>';
    return;
  }
  list.innerHTML = devices.map(d => `
    <div class="device-item" data-serial="${d.serial}" title="Select device">
      <div>
        <div>${d.model || 'Android Device'}</div>
        <div class="device-serial">${d.serial}</div>
      </div>
      <button class="btn-primary" style="font-size:11px;padding:4px 10px"
        onclick="selectDevice('${d.serial}','${d.model || 'Android Device'}')">Select</button>
    </div>
  `).join('');
}

function selectDevice(serial, model) {
  currentSerial = serial;
  onDeviceConnected({ serial, model });
  showPanel('launcher');
}

// ── App launcher ─────────────────────────────────────────────────────────────
function initAppLauncher() {
  $('btn-refresh-apps').onclick = () => loadApps(true);
  $('app-search').oninput = filterApps;
}

async function loadApps(force = false) {
  if (!currentSerial) return;
  const grid    = $('app-grid');
  const loading = $('apps-loading');
  const empty   = $('apps-empty');

  loading.classList.remove('hidden');
  grid.innerHTML = '';
  empty.classList.add('hidden');

  const apps = await window.foldDex.listApps(currentSerial);
  allApps = apps;
  loading.classList.add('hidden');

  if (!apps.length) { empty.classList.remove('hidden'); return; }
  renderAppGrid(apps);
}

function renderAppGrid(apps) {
  const grid = $('app-grid');
  grid.innerHTML = apps.map(app => {
    const color = appColor(app.displayName);
    const letter = app.displayName.charAt(0).toUpperCase();
    return `
      <div class="app-tile"
        data-pkg="${app.packageName}"
        data-name="${app.displayName}"
        title="${app.packageName}">
        <div class="app-icon-wrap" style="background:${color}22;color:${color}">
          ${letter}
        </div>
        <div class="app-name">${app.displayName}</div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.app-tile').forEach(tile => {
    tile.addEventListener('dblclick', () => {
      launchApp(tile.dataset.pkg, tile.dataset.name);
    });
    tile.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      contextApp = { pkg: tile.dataset.pkg, name: tile.dataset.name };
      showCtxMenu('ctx-menu', e.clientX, e.clientY);
    });
  });
}

function filterApps() {
  const q = $('app-search').value.toLowerCase();
  const filtered = q ? allApps.filter(a =>
    a.displayName.toLowerCase().includes(q) ||
    a.packageName.toLowerCase().includes(q)
  ) : allApps;
  renderAppGrid(filtered);
}

async function launchApp(pkg, name) {
  if (!currentSerial) return;
  toast(`Launching ${name}…`);
  const result = await window.foldDex.launchApp(currentSerial, pkg);
  if (!result.success) toast(`Failed to launch ${name}`, 'err');
}

// ── File manager ─────────────────────────────────────────────────────────────
function initFileManager() {
  $('btn-file-up').onclick   = () => navigateTo(parentPath(currentFilePath));
  $('btn-push-file').onclick = () => pushFileToDevice();
}

function parentPath(p) {
  const parts = p.replace(/\/$/, '').split('/');
  return parts.length <= 2 ? '/' : parts.slice(0, -1).join('/');
}

async function loadFiles(remotePath) {
  if (!currentSerial) return;
  currentFilePath = remotePath;
  $('breadcrumb').textContent = remotePath;
  $('breadcrumb').title = remotePath;

  const loading = $('file-loading');
  const list    = $('file-list');
  const empty   = $('files-empty');

  loading.classList.remove('hidden');
  list.innerHTML = '';
  empty.classList.add('hidden');

  const files = await window.foldDex.listFiles(currentSerial, remotePath);
  loading.classList.add('hidden');

  if (!files.length) { empty.classList.remove('hidden'); return; }
  renderFileList(files);
}

function renderFileList(files) {
  const list = $('file-list');
  list.innerHTML = files.map(f => {
    const icon = f.isDirectory ? '📁' : fileIcon(f.name);
    const size = f.isDirectory ? '' : formatBytes(f.size);
    return `
      <div class="file-row" data-path="${f.path}" data-dir="${f.isDirectory}">
        <span class="file-icon">${icon}</span>
        <span class="file-name">${f.name}</span>
        <span class="file-size">${size}</span>
        <div class="file-actions">
          ${!f.isDirectory ? `<button class="file-act-btn" onclick="pullFileItem('${f.path}','${f.name}')">⬇</button>` : ''}
          <button class="file-act-btn danger" onclick="deleteFileItem('${f.path}','${f.name}')">🗑</button>
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('.file-row').forEach(row => {
    row.addEventListener('dblclick', () => {
      if (row.dataset.dir === 'true') {
        loadFiles(row.dataset.path);
      }
    });
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      contextFile = { path: row.dataset.path, isDir: row.dataset.dir === 'true' };
      showCtxMenu('file-ctx-menu', e.clientX, e.clientY);
    });
  });
}

function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const map = {
    jpg:'🖼',jpeg:'🖼',png:'🖼',gif:'🖼',webp:'🖼',heic:'🖼',
    mp4:'🎬',mkv:'🎬',avi:'🎬',mov:'🎬',
    mp3:'🎵',aac:'🎵',flac:'🎵',ogg:'🎵',m4a:'🎵',
    pdf:'📄', doc:'📝',docx:'📝',xls:'📊',xlsx:'📊',ppt:'📋',pptx:'📋',
    txt:'📄',md:'📄',
    zip:'🗜',rar:'🗜','7z':'🗜',tar:'🗜',
    apk:'📦',
  };
  return map[ext] || '📄';
}

async function pullFileItem(path, name) {
  toast(`Downloading ${name}…`);
  const result = await window.foldDex.pullFile(currentSerial, path);
  if (result?.cancelled) return;
  if (result?.success) toast(`Downloaded ${name}`, 'ok');
  else toast(`Download failed`, 'err');
}

async function deleteFileItem(path, name) {
  if (!confirm(`Delete "${name}" from device?`)) return;
  const result = await window.foldDex.deleteFile(currentSerial, path);
  if (result?.success) {
    toast(`Deleted ${name}`, 'ok');
    loadFiles(currentFilePath);
  } else {
    toast('Delete failed', 'err');
  }
}

async function pushFileToDevice() {
  if (!currentSerial) { toast('No device connected', 'err'); return; }
  const result = await window.foldDex.pushFile(currentSerial, currentFilePath);
  if (result?.cancelled) return;
  if (result?.success) {
    toast(`Uploaded ${result.count} file(s)`, 'ok');
    loadFiles(currentFilePath);
  } else {
    toast('Upload failed', 'err');
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────
function initNotifications() {
  $('btn-refresh-notif').onclick = () => loadNotifications();
}

async function loadNotifications() {
  if (!currentSerial) return;
  $('notif-loading').classList.remove('hidden');
  $('notif-list').innerHTML = '';

  const notifs = await window.foldDex.getNotifications(currentSerial);
  $('notif-loading').classList.add('hidden');

  if (!notifs.length) {
    $('notif-list').innerHTML = '<div class="empty-state">No notifications</div>';
    $('notif-badge').classList.add('hidden');
    return;
  }

  $('notif-list').innerHTML = notifs.map(n => `
    <div class="notif-card">
      <div class="notif-app-icon">${n.app.charAt(0)}</div>
      <div class="notif-body">
        <div class="notif-app">${n.app}</div>
        ${n.title ? `<div class="notif-title">${sanitize(n.title)}</div>` : ''}
        ${n.text  ? `<div class="notif-text">${sanitize(n.text)}</div>` : ''}
      </div>
      <div class="notif-time">${relativeTime(n.time)}</div>
    </div>`).join('');

  const badge = $('notif-badge');
  badge.textContent = notifs.length;
  badge.classList.remove('hidden');
}

function sanitize(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Settings / controls ───────────────────────────────────────────────────────
function initSettings() {
  // DeX
  $('btn-enable-dex').onclick  = enableDex;
  $('btn-disable-dex').onclick = disableDex;
  $('btn-check-dex').onclick   = checkDexState;
  $('btn-list-displays').onclick = listDisplays;

  // Mirror
  $('btn-start-mirror').onclick = startMirror;
  $('btn-stop-mirror').onclick  = stopMirror;
  $('tb-mirror').onclick        = () => isMirroring ? stopMirror() : startMirror();
  $('tb-dex').onclick           = () => dexEnabled ? disableDex() : enableDex();
  $('tb-screenshot').onclick    = takeScreenshot;

  // Quick toggles
  $('sw-wifi').onchange = (e) => {
    if (!currentSerial) return;
    window.foldDex.toggleWifi(currentSerial, e.target.checked);
    toast(`WiFi ${e.target.checked ? 'enabled' : 'disabled'}`);
  };
  $('sw-bt').onchange = (e) => {
    if (!currentSerial) return;
    window.foldDex.toggleBluetooth(currentSerial, e.target.checked);
    toast(`Bluetooth ${e.target.checked ? 'enabled' : 'disabled'}`);
  };

  $('sl-volume').oninput = (e) => {
    $('lbl-vol').textContent = e.target.value;
  };
  $('sl-volume').onchange = (e) => {
    if (!currentSerial) return;
    window.foldDex.setVolume(currentSerial, parseInt(e.target.value));
  };

  $('sl-bright').oninput = (e) => {
    $('lbl-bright').textContent = e.target.value;
  };
  $('sl-bright').onchange = (e) => {
    if (!currentSerial) return;
    window.foldDex.setBrightness(currentSerial, parseInt(e.target.value));
  };

  // ADB Shell
  $('btn-run-cmd').onclick = runAdbShell;
  $('shell-cmd').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runAdbShell();
  });
}

async function loadDeviceInfo() {
  if (!currentSerial) return;
  const info = await window.foldDex.getDeviceInfo(currentSerial);
  $('di-model').textContent   = info.model;
  $('di-brand').textContent   = info.brand;
  $('di-android').textContent = info.androidVersion;
  $('di-sdk').textContent     = info.sdkVersion;
  $('di-build').textContent   = info.buildId;
  $('di-serial').textContent  = currentSerial;
  checkDexState();
}

async function enableDex() {
  if (!currentSerial) { toast('No device connected', 'err'); return; }
  toast('Enabling Samsung DeX…');
  const r = await window.foldDex.enableDex(currentSerial);
  if (r.success) {
    dexEnabled = true;
    toast('DeX enabled — connect to an external display or use scrcpy', 'ok');
    updateDexBadge(true);
  } else {
    toast('Failed to enable DeX', 'err');
  }
}

async function disableDex() {
  if (!currentSerial) return;
  const r = await window.foldDex.disableDex(currentSerial);
  if (r.success) {
    dexEnabled = false;
    toast('DeX disabled', 'ok');
    updateDexBadge(false);
  }
}

async function checkDexState() {
  if (!currentSerial) return;
  const state = await window.foldDex.getDexState(currentSerial);
  dexEnabled = state.enabled;
  updateDexBadge(state.enabled);
}

function updateDexBadge(on) {
  const badge = $('dex-state-badge');
  badge.textContent = `Status: ${on ? 'ON' : 'OFF'}`;
  badge.className = `state-badge ${on ? 'on' : 'off'}`;
  const btn = $('tb-dex');
  if (on) btn.classList.add('active'); else btn.classList.remove('active');
}

async function listDisplays() {
  if (!currentSerial) return;
  const result = await window.foldDex.getDisplays(currentSerial);
  const out = $('dex-output');
  out.classList.remove('hidden');
  out.textContent = result.raw || '(no output)';
}

async function startMirror() {
  if (!currentSerial) { toast('No device connected', 'err'); return; }
  if (isMirroring)    { toast('Already mirroring'); return; }

  const options = {
    dexDisplay:  $('opt-dex-disp')?.checked,
    record:      $('opt-record')?.checked,
    borderless:  $('opt-borderless')?.checked,
    alwaysOnTop: $('opt-ontop')?.checked,
    turnScreenOff: $('opt-screen-off')?.checked
  };

  toast('Starting scrcpy…');
  $('btn-start-mirror').disabled = true;

  const result = await window.foldDex.startMirror(currentSerial, options);

  $('btn-start-mirror').disabled = false;

  if (result.success) {
    isMirroring = true;
    $('btn-stop-mirror').disabled = false;
    $('tb-mirror').classList.add('active');
    setMirrorStatus('Mirroring active', true);
    toast('Screen mirror started', 'ok');
  } else {
    toast(`Mirror failed: ${result.error || 'scrcpy not found — install scrcpy and add to PATH or place in bin/'}`, 'err');
    setMirrorStatus(result.error || 'Failed', false);
  }
}

async function stopMirror() {
  await window.foldDex.stopMirror();
  isMirroring = false;
  $('btn-stop-mirror').disabled = true;
  $('tb-mirror').classList.remove('active');
  setMirrorStatus('', false);
  toast('Mirror stopped');
}

function setMirrorStatus(msg, active) {
  const el = $('mirror-status-msg');
  if (!el) return;
  if (msg) {
    el.textContent = msg;
    el.className = `status-msg ${active ? 'ok' : 'err'}`;
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

async function takeScreenshot() {
  if (!currentSerial) return;
  toast('Capturing screenshot…');
  const result = await window.foldDex.screenshot(currentSerial);
  if (result?.success) toast('Screenshot saved to ~/Pictures', 'ok');
  else toast('Screenshot failed', 'err');
}

async function runAdbShell() {
  if (!currentSerial) { toast('No device connected', 'err'); return; }
  const cmd = $('shell-cmd').value.trim();
  if (!cmd) return;

  const out = $('shell-output');
  out.textContent += `$ ${cmd}\n`;

  const result = await window.foldDex.adbShell(currentSerial, cmd);
  out.textContent += (result.stdout || result.stderr || '(no output)') + '\n\n';
  out.scrollTop = out.scrollHeight;
  $('shell-cmd').value = '';
}

// ── Context menus ─────────────────────────────────────────────────────────────
function initContextMenus() {
  $('ctx-launch').onclick   = () => { hideCtxMenus(); if (contextApp) launchApp(contextApp.pkg, contextApp.name); };
  $('ctx-stop').onclick     = () => { hideCtxMenus(); forceStopApp(); };
  $('ctx-uninstall').onclick= () => { hideCtxMenus(); uninstallApp(); };

  $('fctx-pull').onclick    = () => { hideCtxMenus(); if (contextFile) pullFileItem(contextFile.path, contextFile.path.split('/').pop()); };
  $('fctx-delete').onclick  = () => { hideCtxMenus(); if (contextFile) deleteFileItem(contextFile.path, contextFile.path.split('/').pop()); };

  document.addEventListener('click', hideCtxMenus);
}

function showCtxMenu(id, x, y) {
  hideCtxMenus();
  const menu = $(id);
  menu.style.left = `${Math.min(x, window.innerWidth - 170)}px`;
  menu.style.top  = `${Math.min(y, window.innerHeight - 120)}px`;
  menu.classList.remove('hidden');
}

function hideCtxMenus() {
  $('ctx-menu').classList.add('hidden');
  $('file-ctx-menu').classList.add('hidden');
}

async function forceStopApp() {
  if (!currentSerial || !contextApp) return;
  const result = await window.foldDex.forceStopApp(currentSerial, contextApp.pkg);
  toast(result.success ? `Stopped ${contextApp.name}` : 'Force stop failed');
}

async function uninstallApp() {
  if (!currentSerial || !contextApp) return;
  if (!confirm(`Uninstall "${contextApp.name}" from device?`)) return;
  toast(`Uninstalling ${contextApp.name}…`);
  const result = await window.foldDex.uninstallApp(currentSerial, contextApp.pkg);
  if (result.success) {
    toast(`${contextApp.name} uninstalled`, 'ok');
    loadApps();
  } else {
    toast('Uninstall failed', 'err');
  }
}

// Expose functions needed by inline HTML handlers
window.selectDevice    = selectDevice;
window.pullFileItem    = pullFileItem;
window.deleteFileItem  = deleteFileItem;
