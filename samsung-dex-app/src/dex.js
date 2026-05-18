/**
 * Samsung DeX mode manager.
 *
 * DeX is triggered through a combination of Samsung-specific ADB broadcasts
 * and AOSP freeform-window settings. Multiple methods are tried because the
 * exact broadcast has changed across Android 12 → 15.
 */
class DexManager {
  constructor(adb) {
    this.adb = adb;
  }

  async enable(serial) {
    const results = [];

    // 1. Samsung DeX broadcast (Android 12–15, primary method)
    results.push(await this.adb.shell(serial,
      'am broadcast -a com.samsung.android.dex.action.DEX_MODE_CHANGED ' +
      '--ei android.intent.extra.VALUE 1 com.samsung.android.dex'));

    // 2. Global DeX setting
    results.push(await this.adb.shell(serial,
      'settings put global enable_dex 1'));

    // 3. AOSP freeform window support (required for windowed apps)
    results.push(await this.adb.shell(serial,
      'settings put global enable_freeform_support 1'));

    // 4. Desktop mode on external/virtual display
    results.push(await this.adb.shell(serial,
      'settings put global force_desktop_mode_on_external_displays 1'));

    // 5. Restart launcher so freeform takes effect without reboot
    results.push(await this.adb.shell(serial,
      'am broadcast -a android.intent.action.BOOT_COMPLETED'));

    return { success: true, results };
  }

  async disable(serial) {
    const results = [];

    results.push(await this.adb.shell(serial,
      'am broadcast -a com.samsung.android.dex.action.DEX_MODE_CHANGED ' +
      '--ei android.intent.extra.VALUE 0 com.samsung.android.dex'));

    results.push(await this.adb.shell(serial,
      'settings put global enable_dex 0'));

    return { success: true, results };
  }

  async getState(serial) {
    const result = await this.adb.shell(serial, 'settings get global enable_dex');
    return {
      enabled: result.stdout === '1',
      raw: result.stdout
    };
  }

  // List active logical displays (DeX creates a virtual display when active)
  async listDisplays(serial) {
    const result = await this.adb.shell(serial,
      'dumpsys display | grep -E "(Display #|DisplayDeviceInfo)"');
    if (!result.success) return { displays: [], raw: '' };

    const displays = [];
    const lines = result.stdout.split('\n');
    for (const line of lines) {
      const m = line.match(/Display #(\d+)/);
      if (m) displays.push({ id: parseInt(m[1]), info: line.trim() });
    }
    return { displays, raw: result.stdout };
  }

  // Override display resolution/density (useful for testing DeX layouts)
  async setResolution(serial, width, height, dpi) {
    await this.adb.shell(serial, `wm size ${width}x${height}`);
    if (dpi) await this.adb.shell(serial, `wm density ${dpi}`);
    return { success: true };
  }

  async resetResolution(serial) {
    await this.adb.shell(serial, 'wm size reset');
    await this.adb.shell(serial, 'wm density reset');
    return { success: true };
  }
}

module.exports = DexManager;
