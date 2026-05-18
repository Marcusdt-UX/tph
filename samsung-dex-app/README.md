# FoldDex — Samsung DeX for Windows

A Windows desktop app that brings Samsung DeX-style controls to your PC using **scrcpy** and **ADB**.

## Features

| Feature | Description |
|---|---|
| **Screen Mirror** | Launch scrcpy to mirror your Fold 7 screen (60fps, 8Mbps, 1920px cap) |
| **Samsung DeX** | Enable/disable DeX mode via ADB broadcast |
| **App Launcher** | Browse all installed apps, launch or force-stop them remotely |
| **File Manager** | Browse device storage, upload from PC, download to PC |
| **Notifications** | Mirror phone notifications to the desktop |
| **Quick Controls** | Toggle WiFi/Bluetooth, set volume & brightness |
| **ADB Shell** | Built-in terminal for custom ADB shell commands |
| **WiFi ADB** | Connect wirelessly — no cable needed |

## Prerequisites

1. **Node.js 18+** — https://nodejs.org
2. **ADB** — Install via [Android SDK Platform Tools](https://developer.android.com/tools/releases/platform-tools) and add to PATH  
   *or* place `adb.exe` in the `bin/` folder next to the app
3. **scrcpy** — https://github.com/Genymobile/scrcpy/releases  
   Add to PATH *or* place `scrcpy.exe` (and its DLLs) in `bin/`

### Enable USB debugging on your Fold 7

1. Settings → About phone → Tap **Build number** 7 times
2. Settings → Developer options → Enable **USB debugging**
3. For wireless: enable **Wireless debugging** and note the IP

## Development

```bash
cd samsung-dex-app
npm install
npm start
```

## Build Windows EXE

```bash
npm run build        # NSIS installer + portable exe → dist/
npm run build:portable   # portable exe only
```

The build bundles everything into a single installer. Place `adb.exe` and
`scrcpy.exe` in `bin/` before building to include them in the installer.

## DeX tips for Fold 7

- **Best experience**: enable DeX mode via the app, then mirror with *"Target DeX virtual display"* checked. This mirrors the virtual desktop display rather than the phone screen.
- **Without DeX**: uncheck that option to mirror the main phone screen (inner display).
- **Fold position**: for DeX, unfold the device and keep it flat on a desk. The inner display shows the phone UI; our mirror window shows the desktop.
- **Resolution**: scrcpy targets display ID 1 (DeX virtual display) at up to 1920px wide.

## Project structure

```
samsung-dex-app/
├── main.js          # Electron main process + IPC handlers
├── preload.js       # contextBridge API surface
├── src/
│   ├── adb.js       # ADB wrapper (getDevices, shell, file transfer, apps, notifications)
│   ├── scrcpy.js    # scrcpy process manager with Fold 7 flags
│   └── dex.js       # Samsung DeX enable/disable via ADB broadcasts
├── renderer/
│   ├── index.html   # Desktop-mode UI shell
│   ├── styles.css   # Samsung DeX-inspired dark theme
│   └── app.js       # All UI logic (panels, launcher, files, notifications, settings)
└── bin/             # Drop adb.exe + scrcpy.exe here (not in repo)
```
