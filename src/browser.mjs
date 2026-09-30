import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// No browser is launched, no Mac is awakened and no source/app content is read.
const execute = (file, args, options = {}) => spawnSync(file, args, { encoding: 'utf8', timeout: 5000, maxBuffer: 2_000_000, ...options });
export function createMacBrowserAdapter({ platform = process.platform, run = execute } = {}) {
  let app = null;
  const adapter = {
    async sessionProbe() {
      if (platform !== 'darwin') return { available: false, locked: null, online: false, browserAvailable: false };
      try {
        const registry = run('/usr/sbin/ioreg', ['-a', '-n', 'Root', '-d', '1']);
        // Read only the public console session/lock metadata; never capture a screen.
        const parsed = run('/usr/bin/plutil', ['-convert', 'json', '-o', '-', '-'], { input: registry.stdout });
        const decoded = JSON.parse(parsed.stdout); const registryRoot = Array.isArray(decoded) ? decoded[0] : decoded;
        const sessions = registryRoot?.IOConsoleUsers;
        const console = sessions?.find(session => session.CGSSessionOnConsoleKey === true || session.kCGSSessionOnConsoleKey === true);
        const locked = typeof registryRoot?.IOConsoleLocked === 'boolean' ? registryRoot.IOConsoleLocked : console?.CGSSessionScreenIsLocked;
        if (!console || typeof locked !== 'boolean') return { available: Boolean(console), locked: null, online: false, browserAvailable: false };
        const network = run('/usr/sbin/scutil', ['--nwi']);
        const online = network.status === 0 && /Network interfaces:\s*\S+/.test(network.stdout) && !/Network interfaces:\s*none/i.test(network.stdout);
        const defaultApp = run('/usr/bin/osascript', ['-l', 'JavaScript', '-e', "ObjC.import('AppKit'); ObjC.unwrap($.NSWorkspace.sharedWorkspace.URLForApplicationToOpenURL($.NSURL.URLWithString('https://example.invalid')).lastPathComponent)"]);
        app = defaultApp.status === 0 ? defaultApp.stdout.trim() : null;
        if (!['Google Chrome.app', 'Safari.app'].includes(app)) return { available: true, locked, online, browserAvailable: false };
        const running = run('/usr/bin/pgrep', ['-x', app === 'Safari.app' ? 'Safari' : 'Google Chrome']);
        return { available: true, locked, online, browserAvailable: running.status === 0 };
      } catch { return { available: false, locked: null, online: false, browserAvailable: false }; }
    },
    async opener({ path, wake, unlock }) {
      if (wake !== false || unlock !== false || !app) return { status: 'skipped' };
      const current = await adapter.sessionProbe();
      if (!current.available || current.locked !== false || !current.online || !current.browserAvailable) return { status: 'skipped' };
      const url = JSON.stringify(pathToFileURL(path).href);
      const browser = app === 'Safari.app' ? 'Safari' : app === 'Google Chrome.app' ? 'Google Chrome' : null;
      if (!browser) return { status: 'skipped' };
      const safari = `tell application "Safari"
if not running or (count of windows) is 0 then return "skipped"
repeat with w in windows
repeat with t in tabs of w
if URL of t is reportURL then
set URL of t to reportURL
set current tab of w to t
set index of w to 1
activate
if URL of current tab of front window is reportURL then return "reused"
return "failed"
end if
end repeat
end repeat
tell front window
set t to make new tab with properties {URL:reportURL}
set current tab to t
end tell
activate
if URL of current tab of front window is reportURL then return "opened"
end tell`;
      const chrome = `tell application "Google Chrome"
if not running or (count of windows) is 0 then return "skipped"
repeat with w in windows
repeat with i from 1 to count of tabs of w
set t to tab i of w
if URL of t is reportURL then
set URL of t to reportURL
set active tab index of w to i
set index of w to 1
activate
if URL of active tab of front window is reportURL then return "reused"
return "failed"
end if
end repeat
end repeat
tell front window
set t to make new tab with properties {URL:reportURL}
set active tab index to count of tabs
end tell
activate
if URL of active tab of front window is reportURL then return "opened"
end tell`;
      const result = run('/usr/bin/osascript', ['-e', `set reportURL to ${url}\n${browser === 'Safari' ? safari : chrome}`]);
      if (result.status !== 0) return { status: 'failed' };
      const receipt = result.stdout.trim();
      return ['opened', 'reused'].includes(receipt) ? { status: 'opened', reused: receipt === 'reused' } : { status: receipt === 'skipped' ? 'skipped' : 'failed' };
    },
  };
  return adapter;
}
