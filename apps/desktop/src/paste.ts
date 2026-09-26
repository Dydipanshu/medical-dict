// Puts dictated text into whatever app has focus (MS Word, an EMR, Notepad…)
// by placing it on the clipboard, sending the OS paste shortcut, and then
// restoring what the user had on the clipboard.
import { clipboard, ClipboardItem } from "electron";
import { spawn, execFile, type ChildProcessWithoutNullStreams } from "node:child_process";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// One long-lived PowerShell: starting a new one per paste takes ~0.5 s.
let ps: ChildProcessWithoutNullStreams | undefined;
function windowsPaste(): Promise<void> {
  if (!ps || ps.exitCode !== null || ps.killed) {
    ps = spawn("powershell.exe", ["-NoProfile", "-NoLogo", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", "-"], {
      windowsHide: true,
    });
    ps.on("error", (e) => console.error("powershell", e));
    ps.stdout.resume();
    ps.stderr.on("data", (d) => console.error("powershell:", String(d)));
    ps.stdin.write("$w = New-Object -ComObject WScript.Shell\n");
  }
  // The echo tells us PowerShell has actually sent the keys.
  return new Promise((resolve) => {
    const onData = (d: Buffer) => {
      if (String(d).includes("__pasted__")) {
        ps?.stdout.off("data", onData);
        resolve();
      }
    };
    ps!.stdout.on("data", onData);
    ps!.stdin.write("$w.SendKeys('^v'); Write-Output '__pasted__'\n");
    setTimeout(() => {
      ps?.stdout.off("data", onData);
      resolve();
    }, 3000);
  });
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => execFile(cmd, args, (err) => (err ? reject(err) : resolve())));
}

async function sendPasteShortcut(): Promise<void> {
  if (process.platform === "win32") return windowsPaste();
  if (process.platform === "darwin") {
    // Needs Accessibility permission (System Settings → Privacy & Security → Accessibility).
    return run("osascript", ["-e", 'tell application "System Events" to keystroke "v" using command down']);
  }
  // Linux: X11 via xdotool, Wayland via wtype or ydotool.
  const attempts: [string, string[]][] = process.env.WAYLAND_DISPLAY
    ? [["wtype", ["-M", "ctrl", "v", "-m", "ctrl"]], ["ydotool", ["key", "29:1", "47:1", "47:0", "29:0"]], ["xdotool", ["key", "--clearmodifiers", "ctrl+v"]]]
    : [["xdotool", ["key", "--clearmodifiers", "ctrl+v"]]];
  for (const [cmd, args] of attempts) {
    try {
      return await run(cmd, args);
    } catch {
      /* try the next tool */
    }
  }
  throw new Error("Install xdotool (X11) or wtype (Wayland) so USGScribe can type for you.");
}

// Copies every format on the clipboard (text, Word's rich formats, images) so it
// can be put back after pasting. Items from read() can't be written back directly.
async function snapshotClipboard(): Promise<ClipboardItem[]> {
  const items = await clipboard.read();
  const copies = await Promise.all(
    items.map(async (item) => {
      const data: Record<string, Blob> = {};
      // Standard MIME types only (text, html, rtf, png): writing Electron's raw
      // OS-format entries back can hang.
      for (const type of item.types.filter((t) => !t.startsWith("electron "))) {
        try {
          const v = await item.getType(type);
          if (v instanceof Blob) data[type] = v;
        } catch {
          /* format vanished; skip it */
        }
      }
      return Object.keys(data).length ? new ClipboardItem(data) : undefined;
    }),
  );
  return copies.filter((c): c is ClipboardItem => !!c);
}

let chain: Promise<unknown> = Promise.resolve();

// The user's clipboard is put back only after pasting has been quiet for a while.
// Restoring right after each paste is unsafe: a slow app (Word's first paste,
// a busy EMR) can read the clipboard late and paste the OLD content instead.
const RESTORE_AFTER_MS = 2500;
let saved: ClipboardItem[] | undefined;
let lastPasted = "";
let restoreTimer: NodeJS.Timeout | undefined;

async function restoreClipboard() {
  restoreTimer = undefined;
  const items = saved;
  saved = undefined;
  if (!items) return;
  // Don't clobber something the user copied in the meantime.
  if ((await clipboard.readText()).replace(/\r\n/g, "\n") !== lastPasted) return;
  const restore = items.length ? clipboard.write(items) : Promise.resolve(clipboard.clear());
  await Promise.race([restore.catch(() => {}), delay(2000)]);
}

/** Pastes text into the focused app. Calls are serialised so segments stay in order. */
export function typeText(text: string): Promise<void> {
  const job = chain.then(async () => {
    clearTimeout(restoreTimer);
    // Snapshot only at the start of a burst; mid-burst the clipboard holds our own text.
    saved ??= await Promise.race([snapshotClipboard().catch(() => []), delay(1500).then(() => [])]);
    await clipboard.writeText(process.platform === "win32" ? text.replace(/\r?\n/g, "\r\n") : text);
    lastPasted = text;
    // If sending the shortcut fails the text stays on the clipboard for a manual Ctrl+V.
    await sendPasteShortcut();
    await delay(150);
    restoreTimer = setTimeout(() => void (chain = chain.then(restoreClipboard).catch(() => {})), RESTORE_AFTER_MS);
  });
  chain = job.catch(() => {});
  return job;
}

export function disposePaste() {
  ps?.kill();
}
