import { app } from "electron";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_MACROS, type Macro } from "@medical-dict/core";

export interface DesktopSettings {
  /** Your own free Groq key (console.groq.com/keys). */
  groqApiKey: string;
  /** Or a USGScribe server, e.g. https://your-app.vercel.app/api/transcribe */
  serverUrl: string;
  hotkey: string;
  locale: string;
  vocabulary: string;
  macros: Macro[];
  openAtLogin: boolean;
}

export const DEFAULTS: DesktopSettings = {
  groqApiKey: "",
  serverUrl: "",
  hotkey: "CommandOrControl+Shift+Space",
  locale: "en-IN",
  vocabulary: "",
  macros: DEFAULT_MACROS,
  openAtLogin: false,
};

const file = () => join(app.getPath("userData"), "settings.json");

export function loadSettings(): DesktopSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(readFileSync(file(), "utf8")) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: DesktopSettings) {
  writeFileSync(file(), JSON.stringify(s, null, 2));
}

export const isConfigured = (s: DesktopSettings) => !!(s.groqApiKey || s.serverUrl);
