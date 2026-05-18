const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const os = require('os');
const AdbWrapper = require('./src/adb');
const ScrcpyManager = require('./src/scrcpy');
const DexManager = require('./src/dex');

let mainWindow;
const adb = new AdbWrapper();
const scrcpy = new ScrcpyManager();
const dex = new DexManager(adb);

let devicePollInterval = null;
let notifPollInterval = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    backgroundColor: '#0f0f14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    title: 'FoldDex',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    startDevicePolling();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startDevicePolling() {
  let lastSerials = '';

  devicePollInterval = setInterval(async () => {
    try {
      const devices = await adb.getDevices();
      const serials = devices.map(d => d.serial).join(',');

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('devices-updated', devices);
        if (serials !== lastSerials) {
          lastSerials = serials;
          mainWindow.webContents.send('device-changed', devices[0] || null);
        }
      }
    } catch (_) { /* adb not found yet */ }
  }, 2500);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (devicePollInterval) clearInterval(devicePollInterval);
  if (notifPollInterval) clearInterval(notifPollInterval);
  scrcpy.stop();
  if (process.platform !== 'darwin') app.quit();
});

// ── Window controls ──────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());

// ── Device ───────────────────────────────────────────────────────────────────
ipcMain.handle('get-devices', () => adb.getDevices());

ipcMain.handle('get-device-info', (_, serial) => adb.getDeviceInfo(serial));

ipcMain.handle('get-battery', (_, serial) => adb.getBattery(serial));

ipcMain.handle('connect-wifi', (_, { host, port }) => adb.connectWifi(host, port || 5555));

ipcMain.handle('disconnect-wifi', (_, { host, port }) => adb.disconnectWifi(host, port || 5555));

// ── DeX ───────────────────────────────────────────────────────────────────────
ipcMain.handle('enable-dex', (_, serial) => dex.enable(serial));
ipcMain.handle('disable-dex', (_, serial) => dex.disable(serial));
ipcMain.handle('get-dex-state', (_, serial) => dex.getState(serial));
ipcMain.handle('get-displays', (_, serial) => dex.listDisplays(serial));

// ── Scrcpy ───────────────────────────────────────────────────────────────────
ipcMain.handle('start-mirror', (_, { serial, options }) => scrcpy.launch(serial, options));
ipcMain.handle('stop-mirror', () => { scrcpy.stop(); return { success: true }; });
ipcMain.handle('is-mirroring', () => scrcpy.isRunning());

// ── Apps ──────────────────────────────────────────────────────────────────────
ipcMain.handle('list-apps', (_, serial) => adb.listApps(serial));

ipcMain.handle('launch-app', (_, { serial, packageName }) =>
  adb.launchApp(serial, packageName));

ipcMain.handle('force-stop-app', (_, { serial, packageName }) =>
  adb.shell(serial, `am force-stop ${packageName}`));

ipcMain.handle('uninstall-app', (_, { serial, packageName }) =>
  adb.shell(serial, `pm uninstall ${packageName}`));

// ── Files ─────────────────────────────────────────────────────────────────────
ipcMain.handle('list-files', (_, { serial, remotePath }) =>
  adb.listFiles(serial, remotePath));

ipcMain.handle('pull-file', async (_, { serial, remotePath }) => {
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(os.homedir(), 'Downloads', path.basename(remotePath))
  });
  if (canceled || !filePath) return { cancelled: true };
  const result = await adb.pullFile(serial, remotePath, filePath);
  if (result.success) shell.showItemInFolder(filePath);
  return result;
});

ipcMain.handle('push-file', async (_, { serial, remotePath }) => {
  const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    title: `Upload to ${remotePath}`
  });
  if (canceled || !filePaths?.length) return { cancelled: true };
  const results = [];
  for (const fp of filePaths) {
    const dest = `${remotePath}/${path.basename(fp)}`.replace('//', '/');
    results.push(await adb.pushFile(serial, fp, dest));
  }
  return { success: true, count: filePaths.length, results };
});

ipcMain.handle('delete-file', (_, { serial, remotePath }) =>
  adb.shell(serial, `rm -rf "${remotePath}"`));

// ── Notifications ─────────────────────────────────────────────────────────────
ipcMain.handle('get-notifications', (_, serial) => adb.getNotifications(serial));

// ── Screenshot ────────────────────────────────────────────────────────────────
ipcMain.handle('take-screenshot', async (_, serial) => {
  const ts = Date.now();
  const remote = `/sdcard/folddex_${ts}.png`;
  const local = path.join(os.homedir(), 'Pictures', `FoldDex_${ts}.png`);

  await adb.shell(serial, `screencap -p ${remote}`);
  const result = await adb.pullFile(serial, remote, local);
  await adb.shell(serial, `rm ${remote}`);

  if (result.success) {
    shell.showItemInFolder(local);
    return { success: true, path: local };
  }
  return result;
});

// ── Quick settings ────────────────────────────────────────────────────────────
ipcMain.handle('toggle-wifi', (_, { serial, enable }) =>
  adb.shell(serial, `svc wifi ${enable ? 'enable' : 'disable'}`));

ipcMain.handle('toggle-bluetooth', (_, { serial, enable }) =>
  adb.shell(serial, enable
    ? 'am broadcast -a android.bluetooth.adapter.action.REQUEST_ENABLE'
    : 'service call bluetooth_manager 8'));

ipcMain.handle('set-volume', (_, { serial, level }) => {
  const vol = Math.round((level / 100) * 15);
  return adb.shell(serial, `media volume --stream 3 --set ${vol}`);
});

ipcMain.handle('set-brightness', (_, { serial, level }) => {
  const b = Math.round((level / 100) * 255);
  return adb.shell(serial,
    `settings put system screen_brightness_mode 0 && settings put system screen_brightness ${b}`);
});

ipcMain.handle('adb-shell', (_, { serial, command }) =>
  adb.shell(serial, command));
