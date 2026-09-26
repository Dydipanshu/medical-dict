// USGScribe desktop: lives in the tray. Press the hotkey anywhere (MS Word,
// an EMR, Notepad…), speak, and the report text is typed where the cursor is.
import { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeImage, Notification, screen, session, shell, systemPreferences, Tray } from "electron";
import { join } from "node:path";
import { transcribe, TranscribeError, type TranscribeConfig } from "@medical-dict/core";
import { isConfigured, isFirstRun, loadSettings, saveSettings, type DesktopSettings } from "./store";
import { disposePaste, typeText } from "./paste";

type DictationState = "idle" | "starting" | "listening" | "finishing";

const asset = (name: string) => join(__dirname, "assets", name);

// Test hook: feed a WAV file as the microphone (used by the automated Word test).
if (process.env.USGSCRIBE_USER_DATA) app.setPath("userData", process.env.USGSCRIBE_USER_DATA);
if (process.env.USGSCRIBE_FAKE_AUDIO) {
  app.commandLine.appendSwitch("use-fake-device-for-media-stream");
  app.commandLine.appendSwitch("use-file-for-fake-audio-capture", process.env.USGSCRIBE_FAKE_AUDIO);
}

let settings: DesktopSettings;
let overlay: BrowserWindow | undefined;
let settingsWin: BrowserWindow | undefined;
let tray: Tray | undefined;
let state: DictationState = "idle";
let hideTimer: NodeJS.Timeout | undefined;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // `USGScribe --toggle` starts/stops dictation, so foot-pedal software,
  // AutoHotkey or a Stream Deck button can drive it. Plain relaunch opens settings.
  app.on("second-instance", (_e, argv) => (argv.includes("--toggle") ? toggle() : openSettings()));
  app.whenReady().then(start);
}

async function start() {
  const firstRun = isFirstRun();
  settings = loadSettings();
  if (firstRun) saveSettings(settings);
  if (process.platform === "darwin") app.dock?.hide();

  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === "media"));
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === "media");
  if (process.platform === "darwin") {
    await systemPreferences.askForMediaAccess("microphone");
    // Prompts for Accessibility, which is needed to paste into other apps.
    systemPreferences.isTrustedAccessibilityClient(true);
  }

  createOverlay();
  createTray();
  registerHotkey();
  // The settings window doubles as the welcome screen (it shows how to dictate).
  if (firstRun || !isConfigured(settings)) openSettings();
  else notify(`USGScribe is running. Press ${prettyHotkey(settings.hotkey)} to dictate.`);
}

function createOverlay() {
  overlay = new BrowserWindow({
    width: 300,
    height: 64,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    // Never take focus away from Word: the text must land where the doctor's cursor is.
    focusable: false,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      backgroundThrottling: false,
    },
  });
  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.loadFile(join(__dirname, "overlay.html"));
}

function positionOverlay() {
  if (!overlay) return;
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { x, y, width, height } = display.workArea;
  const [w, h] = overlay.getSize();
  overlay.setPosition(Math.round(x + (width - w) / 2), Math.round(y + height - h - 24));
}

function createTray() {
  const icon =
    process.platform === "darwin" ? nativeImage.createFromPath(asset("trayTemplate.png")) : nativeImage.createFromPath(asset("tray.png"));
  if (process.platform === "darwin") icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.on("click", () => toggle());
  updateTray();
}

function prettyHotkey(accel: string) {
  return accel.replace("CommandOrControl", process.platform === "darwin" ? "Cmd" : "Ctrl");
}

function updateTray() {
  if (!tray) return;
  const listening = state === "listening" || state === "starting";
  tray.setToolTip(listening ? "USGScribe – listening" : `USGScribe – press ${prettyHotkey(settings.hotkey)} to dictate`);
  if (process.platform !== "darwin") tray.setImage(asset(listening ? "tray-rec.png" : "tray.png"));
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: listening ? "Stop dictation" : "Start dictation", accelerator: settings.hotkey, click: () => toggle() },
      { type: "separator" },
      { label: "Settings…", click: () => openSettings() },
      { label: "Get a free Groq key…", click: () => shell.openExternal("https://console.groq.com/keys") },
      { type: "separator" },
      { label: "Quit USGScribe", role: "quit" },
    ]),
  );
}

function registerHotkey() {
  globalShortcut.unregisterAll();
  const ok = settings.hotkey && globalShortcut.register(settings.hotkey, () => toggle());
  if (!ok) notify(`Could not use ${prettyHotkey(settings.hotkey)} as the dictation key. Pick another in Settings.`);
  return !!ok;
}

function toggle() {
  if (!isConfigured(settings)) {
    notify("Add your free Groq API key in Settings first.");
    openSettings();
    return;
  }
  overlay?.webContents.send("dictation:toggle");
}

function setState(next: DictationState) {
  state = next;
  updateTray();
  if (!overlay) return;
  clearTimeout(hideTimer);
  if (next === "idle") {
    hideTimer = setTimeout(() => overlay?.hide(), 800);
  } else if (!overlay.isVisible()) {
    positionOverlay();
    overlay.showInactive();
  }
}

function notify(body: string) {
  if (Notification.isSupported()) new Notification({ title: "USGScribe", body }).show();
}

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 560,
    height: 760,
    title: "USGScribe Settings",
    icon: asset("icon.png"),
    autoHideMenuBar: true,
    webPreferences: { preload: join(__dirname, "preload.cjs") },
  });
  // Links (e.g. "get one free") open in the browser, not inside the settings window.
  settingsWin.webContents.on("will-navigate", (e, url) => {
    if (url.startsWith("http")) {
      e.preventDefault();
      void shell.openExternal(url);
    }
  });
  settingsWin.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  settingsWin.loadFile(join(__dirname, "settings.html"));
}

// ---------- IPC ----------

ipcMain.handle("settings:get", () => ({ settings, platform: process.platform }));

ipcMain.handle("settings:set", (_e, next: DesktopSettings) => {
  const prevHotkey = settings.hotkey;
  settings = { ...settings, ...next };
  saveSettings(settings);
  let hotkeyOk = true;
  if (settings.hotkey !== prevHotkey) hotkeyOk = registerHotkey();
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: settings.openAtLogin });
  updateTray();
  overlay?.webContents.send("settings:changed", settings);
  return { hotkeyOk };
});

ipcMain.handle("transcribe", async (_e, wav: ArrayBuffer, cfg: TranscribeConfig) => {
  try {
    const conf: TranscribeConfig = {
      ...cfg,
      groqApiKey: settings.groqApiKey || undefined,
      endpoint: settings.serverUrl || undefined,
    };
    return { text: await transcribe(new Blob([wav], { type: "audio/wav" }), conf) };
  } catch (e) {
    const err = e as Error;
    return {
      error: err.message,
      status: e instanceof TranscribeError ? e.status : 0,
      retryAfterMs: e instanceof TranscribeError ? e.retryAfterMs : undefined,
    };
  }
});

ipcMain.handle("type-text", async (_e, text: string) => {
  if (process.env.USGSCRIBE_DEBUG) console.log("type-text:", JSON.stringify(text));
  try {
    await typeText(text);
    return { ok: true };
  } catch (e) {
    notify(`${(e as Error).message} The text is on your clipboard – press Ctrl+V.`);
    return { ok: false };
  }
});

ipcMain.on("state", (_e, next: DictationState) => setState(next));
ipcMain.on("error", (_e, message: string) => notify(message));
ipcMain.on("open-settings", () => openSettings());

app.on("window-all-closed", () => {
  /* keep running in the tray */
});
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  disposePaste();
});
