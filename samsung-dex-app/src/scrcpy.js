const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class ScrcpyManager {
  constructor() {
    this.process = null;
    this.scrcpyPath = this._findScrcpy();
  }

  _findScrcpy() {
    const candidates = [
      path.join(process.resourcesPath || '', 'bin', 'scrcpy.exe'),
      path.join(__dirname, '..', 'bin', 'scrcpy.exe'),
      path.join(__dirname, '..', 'bin', 'scrcpy'),
    ];
    for (const c of candidates) {
      try { if (fs.existsSync(c)) return c; } catch (_) {}
    }
    return process.platform === 'win32' ? 'scrcpy.exe' : 'scrcpy';
  }

  // Build optimised flags for the Samsung Galaxy Z Fold 7
  _buildFlags(serial, options = {}) {
    const flags = [];

    if (serial) flags.push('--serial', serial);

    // Fold 7 inner display is ~7.6" 2208×1812 — cap at 1920 for performance
    flags.push('--max-size', '1920');
    flags.push('--bit-rate', options.bitrate || '8M');
    flags.push('--max-fps', String(options.maxFps || 60));
    flags.push('--stay-awake');
    flags.push('--show-touches');
    flags.push('--window-title', 'FoldDex — Samsung Fold 7');

    // DeX virtual display is usually display ID 1 when DeX is active
    if (options.dexDisplay) {
      flags.push('--display-id', '1');
      flags.push('--turn-screen-off');   // phone screen off while using DeX
    }

    if (options.noAudio !== false) {
      flags.push('--no-audio');
    }

    if (options.record) {
      const ts = Date.now();
      const dir = path.join(os.homedir(), 'Videos');
      try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
      flags.push('--record', path.join(dir, `FoldDex_${ts}.mp4`));
    }

    if (options.borderless) flags.push('--window-borderless');
    if (options.alwaysOnTop) flags.push('--always-on-top');

    // Power-off device display while streaming (DeX/productivity mode)
    if (options.turnScreenOff && !options.dexDisplay) flags.push('--turn-screen-off');

    return flags;
  }

  async launch(serial, options = {}) {
    this.stop(); // kill any existing session

    const flags = this._buildFlags(serial, options);

    return new Promise((resolve) => {
      let settled = false;

      const settle = (result) => {
        if (!settled) { settled = true; resolve(result); }
      };

      try {
        this.process = spawn(this.scrcpyPath, flags, {
          detached: false,
          windowsHide: false,
          stdio: ['ignore', 'pipe', 'pipe']
        });

        this.process.stdout.on('data', (data) => {
          const out = data.toString();
          // scrcpy prints device info once connected
          if (out.includes('Device:') || out.includes('[server]') || out.includes('INFO')) {
            settle({ success: true, pid: this.process?.pid });
          }
        });

        this.process.stderr.on('data', (data) => {
          const err = data.toString();
          if (err.includes('ERROR') || err.includes('error:')) {
            settle({ success: false, error: err.trim() });
          }
        });

        this.process.on('error', (err) => {
          this.process = null;
          settle({ success: false, error: err.message });
        });

        this.process.on('exit', (code) => {
          this.process = null;
          if (!settled && code !== 0) {
            settle({ success: false, error: `scrcpy exited with code ${code}` });
          }
        });

        // Assume success after 4 s if no explicit error
        setTimeout(() => {
          if (this.process) {
            settle({ success: true, pid: this.process.pid });
          } else {
            settle({ success: false, error: 'scrcpy did not start' });
          }
        }, 4000);

      } catch (err) {
        this.process = null;
        settle({ success: false, error: err.message });
      }
    });
  }

  stop() {
    if (this.process) {
      try { this.process.kill('SIGTERM'); } catch (_) {}
      this.process = null;
    }
  }

  isRunning() {
    return !!(this.process && this.process.exitCode === null);
  }
}

module.exports = ScrcpyManager;
