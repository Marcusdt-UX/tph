const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('foldDex', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),

  // Device discovery
  getDevices:    ()             => ipcRenderer.invoke('get-devices'),
  getDeviceInfo: (serial)       => ipcRenderer.invoke('get-device-info', serial),
  getBattery:    (serial)       => ipcRenderer.invoke('get-battery', serial),
  connectWifi:   (host, port)   => ipcRenderer.invoke('connect-wifi', { host, port }),
  disconnectWifi:(host, port)   => ipcRenderer.invoke('disconnect-wifi', { host, port }),

  // Samsung DeX
  enableDex:   (serial) => ipcRenderer.invoke('enable-dex', serial),
  disableDex:  (serial) => ipcRenderer.invoke('disable-dex', serial),
  getDexState: (serial) => ipcRenderer.invoke('get-dex-state', serial),
  getDisplays: (serial) => ipcRenderer.invoke('get-displays', serial),

  // Screen mirroring
  startMirror: (serial, options) => ipcRenderer.invoke('start-mirror', { serial, options }),
  stopMirror:  ()                => ipcRenderer.invoke('stop-mirror'),
  isMirroring: ()                => ipcRenderer.invoke('is-mirroring'),

  // App management
  listApps:     (serial)                    => ipcRenderer.invoke('list-apps', serial),
  launchApp:    (serial, packageName)       => ipcRenderer.invoke('launch-app', { serial, packageName }),
  forceStopApp: (serial, packageName)       => ipcRenderer.invoke('force-stop-app', { serial, packageName }),
  uninstallApp: (serial, packageName)       => ipcRenderer.invoke('uninstall-app', { serial, packageName }),

  // File manager
  listFiles:  (serial, remotePath)          => ipcRenderer.invoke('list-files', { serial, remotePath }),
  pullFile:   (serial, remotePath)          => ipcRenderer.invoke('pull-file', { serial, remotePath }),
  pushFile:   (serial, remotePath)          => ipcRenderer.invoke('push-file', { serial, remotePath }),
  deleteFile: (serial, remotePath)          => ipcRenderer.invoke('delete-file', { serial, remotePath }),

  // Notifications
  getNotifications: (serial) => ipcRenderer.invoke('get-notifications', serial),

  // Screenshot
  screenshot: (serial) => ipcRenderer.invoke('take-screenshot', serial),

  // Quick settings
  toggleWifi:      (serial, enable) => ipcRenderer.invoke('toggle-wifi',      { serial, enable }),
  toggleBluetooth: (serial, enable) => ipcRenderer.invoke('toggle-bluetooth', { serial, enable }),
  setVolume:       (serial, level)  => ipcRenderer.invoke('set-volume',       { serial, level }),
  setBrightness:   (serial, level)  => ipcRenderer.invoke('set-brightness',   { serial, level }),
  adbShell:        (serial, cmd)    => ipcRenderer.invoke('adb-shell',        { serial, command: cmd }),

  // IPC events (renderer listens to main-process pushes)
  on(channel, callback) {
    const allowed = ['devices-updated', 'device-changed'];
    if (allowed.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args));
    }
  },
  off(channel, callback) {
    ipcRenderer.removeListener(channel, callback);
  }
});
