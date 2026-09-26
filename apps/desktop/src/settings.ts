import type { SonoApi } from "./preload";
import type { DesktopSettings } from "./store";

const sono = (window as unknown as { sono: SonoApi }).sono;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let current: DesktopSettings;
let platform = "";

const pretty = (accel: string) => accel.replace("CommandOrControl", platform === "darwin" ? "Cmd" : "Ctrl");

function macrosToText(s: DesktopSettings) {
  return s.macros.map((m) => `${m.name}: ${m.text}`).join("\n");
}

function textToMacros(t: string) {
  return t
    .split("\n")
    .map((line) => line.match(/^\s*([^:]+?)\s*:\s*(.+)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ name: m[1], text: m[2].trim() }));
}

function fill(s: DesktopSettings) {
  $<HTMLInputElement>("groqApiKey").value = s.groqApiKey;
  $<HTMLInputElement>("serverUrl").value = s.serverUrl;
  $<HTMLInputElement>("hotkey").value = pretty(s.hotkey);
  $<HTMLInputElement>("hotkey").dataset.accel = s.hotkey;
  $("hk-inline").textContent = pretty(s.hotkey);
  $<HTMLSelectElement>("locale").value = s.locale;
  $<HTMLTextAreaElement>("vocabulary").value = s.vocabulary;
  $<HTMLTextAreaElement>("macros").value = macrosToText(s);
  $<HTMLInputElement>("openAtLogin").checked = s.openAtLogin;
}

// Turns a keydown into an Electron accelerator string, e.g. "CommandOrControl+Shift+Space".
function toAccelerator(e: KeyboardEvent): string | undefined {
  const mods: string[] = [];
  if (e.ctrlKey || e.metaKey) mods.push("CommandOrControl");
  if (e.altKey) mods.push("Alt");
  if (e.shiftKey) mods.push("Shift");
  const k = e.key;
  if (["Control", "Shift", "Alt", "Meta"].includes(k)) return;
  let key: string;
  if (/^F\d{1,2}$/.test(k)) key = k;
  else if (k === " ") key = "Space";
  else if (k.length === 1) key = k.toUpperCase();
  else if (["Insert", "Home", "End", "PageUp", "PageDown", "Pause", "ScrollLock"].includes(k)) key = k;
  else return;
  // Plain letters would hijack typing; require a modifier unless it's a function-style key.
  if (!mods.length && key.length === 1) return;
  return [...mods, key].join("+");
}

async function init() {
  const res = await sono.getSettings();
  current = res.settings;
  platform = res.platform;
  fill(current);

  const hk = $<HTMLInputElement>("hotkey");
  hk.addEventListener("focus", () => {
    hk.classList.add("recording");
    hk.value = "Press keys…";
  });
  hk.addEventListener("blur", () => {
    hk.classList.remove("recording");
    hk.value = pretty(hk.dataset.accel ?? current.hotkey);
  });
  hk.addEventListener("keydown", (e) => {
    e.preventDefault();
    if (e.key === "Tab") return hk.blur();
    const accel = toAccelerator(e);
    if (!accel) return;
    hk.dataset.accel = accel;
    hk.blur();
  });

  $("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const next: DesktopSettings = {
      ...current,
      groqApiKey: $<HTMLInputElement>("groqApiKey").value.trim(),
      serverUrl: $<HTMLInputElement>("serverUrl").value.trim(),
      hotkey: hk.dataset.accel ?? current.hotkey,
      locale: $<HTMLSelectElement>("locale").value,
      vocabulary: $<HTMLTextAreaElement>("vocabulary").value,
      macros: textToMacros($<HTMLTextAreaElement>("macros").value),
      openAtLogin: $<HTMLInputElement>("openAtLogin").checked,
    };
    const { hotkeyOk } = await sono.setSettings(next);
    current = next;
    $("hk-inline").textContent = pretty(next.hotkey);
    const msg = $("msg");
    msg.textContent = hotkeyOk
      ? next.groqApiKey || next.serverUrl
        ? `Saved. Press ${pretty(next.hotkey)} in Word to dictate.`
        : "Saved. Add a Groq key to start dictating."
      : "Saved, but that shortcut is taken by another app. Try a different one.";
  });
}

void init();
