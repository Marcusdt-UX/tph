const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execFileAsync = promisify(execFile);

class AdbWrapper {
  constructor() {
    this.adbPath = this._findAdb();
  }

  _findAdb() {
    // Check next to app resources first (bundled), then fall back to PATH
    const candidates = [
      path.join(process.resourcesPath || '', 'bin', 'adb.exe'),
      path.join(__dirname, '..', 'bin', 'adb.exe'),
      path.join(__dirname, '..', 'bin', 'adb'),
    ];
    for (const c of candidates) {
      try { if (fs.existsSync(c)) return c; } catch (_) {}
    }
    return process.platform === 'win32' ? 'adb.exe' : 'adb';
  }

  async _run(args, timeoutMs = 15000) {
    try {
      const { stdout, stderr } = await execFileAsync(this.adbPath, args, {
        timeout: timeoutMs,
        windowsHide: true
      });
      return { success: true, stdout: (stdout || '').trim(), stderr: (stderr || '').trim() };
    } catch (err) {
      const out = (err.stdout || '').trim();
      const errMsg = (err.stderr || err.message || '').trim();
      // Some adb commands write useful output to stderr
      return { success: !errMsg.includes('error:') && !errMsg.includes('failed'), stdout: out, stderr: errMsg, error: errMsg };
    }
  }

  // Run a command against a specific device serial
  async _device(serial, ...args) {
    return this._run(['-s', serial, ...args]);
  }

  // ── Device listing ────────────────────────────────────────────────────────
  async getDevices() {
    const result = await this._run(['devices', '-l']);
    if (!result.success && !result.stdout) return [];

    const devices = [];
    const lines = result.stdout.split('\n').slice(1);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('*') ) continue;

      const [serial, state, ...rest] = trimmed.split(/\s+/);
      if (!serial || state === 'offline' || state === 'unauthorized') continue;
      if (state !== 'device') continue;

      const extra = rest.join(' ');
      const modelMatch = extra.match(/model:(\S+)/);
      const productMatch = extra.match(/product:(\S+)/);
      const transportMatch = extra.match(/transport_id:(\S+)/);

      devices.push({
        serial,
        state,
        model: modelMatch  ? modelMatch[1].replace(/_/g, ' ') : 'Android Device',
        product: productMatch ? productMatch[1] : '',
        transportId: transportMatch ? transportMatch[1] : null
      });
    }

    return devices;
  }

  // ── Device info ───────────────────────────────────────────────────────────
  async getDeviceInfo(serial) {
    const props = await Promise.all([
      this._device(serial, 'shell', 'getprop ro.product.model'),
      this._device(serial, 'shell', 'getprop ro.product.brand'),
      this._device(serial, 'shell', 'getprop ro.build.version.release'),
      this._device(serial, 'shell', 'getprop ro.build.version.sdk'),
      this._device(serial, 'shell', 'getprop ro.build.display.id'),
      this._device(serial, 'shell', 'getprop ro.product.device')
    ]);

    return {
      model:          props[0].stdout || 'Unknown',
      brand:          props[1].stdout || 'Unknown',
      androidVersion: props[2].stdout || 'Unknown',
      sdkVersion:     props[3].stdout || 'Unknown',
      buildId:        props[4].stdout || 'Unknown',
      device:         props[5].stdout || 'Unknown'
    };
  }

  // ── Battery ───────────────────────────────────────────────────────────────
  async getBattery(serial) {
    const result = await this._device(serial, 'shell', 'dumpsys battery');
    if (!result.success) return null;

    const out = result.stdout;
    const statusMap = { '1': 'Unknown', '2': 'Charging', '3': 'Discharging', '4': 'Not charging', '5': 'Full' };

    return {
      level:       parseInt(out.match(/level:\s*(\d+)/)?.[1] ?? 0),
      status:      statusMap[out.match(/status:\s*(\d+)/)?.[1]] ?? 'Unknown',
      temperature: ((parseInt(out.match(/temperature:\s*(\d+)/)?.[1] ?? 0)) / 10).toFixed(1),
      charging:    out.includes('AC powered: true') || out.includes('USB powered: true')
    };
  }

  // ── Generic shell ─────────────────────────────────────────────────────────
  async shell(serial, command) {
    return this._device(serial, 'shell', command);
  }

  // ── Apps ──────────────────────────────────────────────────────────────────
  async listApps(serial) {
    const result = await this._device(serial, 'shell', 'pm list packages -3 -f');
    if (!result.success && !result.stdout) return [];

    const apps = [];
    for (const line of result.stdout.split('\n')) {
      // format: package:/data/app/.../base.apk=com.example.app
      const eq = line.lastIndexOf('=');
      if (eq === -1 || !line.startsWith('package:')) continue;
      const packageName = line.slice(eq + 1).trim();
      if (!packageName) continue;
      apps.push({ packageName, displayName: this._pkgToName(packageName) });
    }

    return apps.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  _pkgToName(pkg) {
    const known = {
      'com.whatsapp':                           'WhatsApp',
      'com.whatsapp.w4b':                       'WhatsApp Business',
      'com.instagram.android':                  'Instagram',
      'com.google.android.youtube':             'YouTube',
      'com.google.android.gm':                  'Gmail',
      'com.google.android.apps.maps':           'Google Maps',
      'com.spotify.music':                      'Spotify',
      'com.netflix.mediaclient':                'Netflix',
      'com.twitter.android':                    'X (Twitter)',
      'com.facebook.katana':                    'Facebook',
      'com.snapchat.android':                   'Snapchat',
      'com.discord':                            'Discord',
      'com.microsoft.teams':                    'Microsoft Teams',
      'com.microsoft.office.word':              'Word',
      'com.microsoft.office.excel':             'Excel',
      'com.microsoft.office.powerpoint':        'PowerPoint',
      'com.microsoft.office.outlook':           'Outlook',
      'com.microsoft.skydrive':                 'OneDrive',
      'com.samsung.android.email.provider':     'Samsung Email',
      'com.sec.android.app.camera':             'Camera',
      'com.google.android.apps.photos':         'Google Photos',
      'com.samsung.android.gallery3d':          'Gallery',
      'com.google.android.chrome':              'Chrome',
      'com.samsung.android.app.notes':          'Samsung Notes',
      'com.samsung.android.contacts':           'Contacts',
      'com.samsung.android.messaging':          'Messages',
      'com.samsung.android.dialer':             'Phone',
      'com.samsung.android.calendar':           'Calendar',
      'com.samsung.android.app.reminder':       'Reminder',
      'com.samsung.android.smartswitch':        'Smart Switch',
      'com.samsung.android.dex.service':        'Samsung DeX',
      'com.samsung.android.bixby.wakeup':       'Bixby',
      'com.google.android.keep':                'Google Keep',
      'com.google.android.apps.docs':           'Google Docs',
      'com.google.android.apps.sheets':         'Google Sheets',
      'com.google.android.apps.slides':         'Google Slides',
      'com.google.android.apps.drive':          'Google Drive',
      'com.amazon.mShop.android.shopping':      'Amazon',
      'com.ubercab':                            'Uber',
      'com.paypal.android.p2pmobile':           'PayPal',
      'com.zhiliaoapp.musically':               'TikTok',
      'com.google.android.apps.tachyon':        'Google Meet',
      'org.telegram.messenger':                 'Telegram',
      'com.viber.voip':                         'Viber',
      'com.skype.raider':                       'Skype',
      'com.google.android.apps.messaging':      'Google Messages',
      'com.android.chrome':                     'Chrome',
      'com.opera.browser':                      'Opera',
      'org.mozilla.firefox':                    'Firefox',
    };

    if (known[pkg]) return known[pkg];

    const parts = pkg.split('.');
    const raw = parts[parts.length - 1];
    // Convert camelCase/underscores to title case words
    return raw
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, c => c.toUpperCase())
      .trim();
  }

  async launchApp(serial, packageName) {
    return this._device(serial, 'shell',
      `monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`);
  }

  // ── Files ─────────────────────────────────────────────────────────────────
  async listFiles(serial, remotePath) {
    const clean = remotePath.replace(/\/+$/, '') || '/sdcard';
    const result = await this._device(serial, 'shell', `ls -la "${clean}" 2>/dev/null`);
    if (!result.success && !result.stdout) return [];

    const files = [];
    for (const line of result.stdout.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('total')) continue;

      // Parse ls -la output: permissions links owner group size date time name
      const match = trimmed.match(/^([\-dlrwxt]+)\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\S+\s+\S+\s+\S+)\s+(.+)$/);
      if (!match) continue;

      const [, perms, size, , name] = match;
      if (name === '.' || name === '..') continue;

      const isDir = perms.startsWith('d');
      const isLink = perms.startsWith('l');
      const displayName = isLink ? name.split(' -> ')[0] : name;

      files.push({
        name: displayName,
        path: `${clean}/${displayName}`,
        isDirectory: isDir || isLink,
        size: parseInt(size) || 0,
        permissions: perms
      });
    }

    return files.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  async pullFile(serial, remotePath, localPath) {
    return this._run(['-s', serial, 'pull', remotePath, localPath], 60000);
  }

  async pushFile(serial, localPath, remotePath) {
    return this._run(['-s', serial, 'push', localPath, remotePath], 60000);
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  async getNotifications(serial) {
    const result = await this._device(serial, 'shell', 'dumpsys notification --noredact');
    if (!result.success && !result.stdout) return [];
    return this._parseNotifications(result.stdout);
  }

  _parseNotifications(output) {
    const notifs = [];
    const blocks = output.split(/\n\s{4}NotificationRecord\{/);

    for (const block of blocks.slice(1)) {
      try {
        const pkgMatch   = block.match(/pkg=(\S+)/);
        const titleMatch = block.match(/android\.title=([^\n,}]+)/);
        const textMatch  = block.match(/android\.text=([^\n,}]+)/);
        const whenMatch  = block.match(/when=(\d+)/);

        if (!pkgMatch) continue;

        const pkg = pkgMatch[1];
        const title = (titleMatch?.[1] || '').trim();
        const text  = (textMatch?.[1]  || '').trim();

        // Skip empty/system notifications
        if (!title && !text) continue;

        notifs.push({
          id:      Math.random().toString(36).slice(2),
          package: pkg,
          app:     this._pkgToName(pkg),
          title,
          text,
          time:    whenMatch ? parseInt(whenMatch[1]) : Date.now()
        });
      } catch (_) { /* skip malformed blocks */ }
    }

    // Newest first, cap at 30
    return notifs
      .sort((a, b) => b.time - a.time)
      .slice(0, 30);
  }

  // ── WiFi pairing ──────────────────────────────────────────────────────────
  async connectWifi(host, port = 5555) {
    return this._run(['connect', `${host}:${port}`], 10000);
  }

  async disconnectWifi(host, port = 5555) {
    return this._run(['disconnect', `${host}:${port}`]);
  }
}

module.exports = AdbWrapper;
