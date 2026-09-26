import { contextBridge, ipcRenderer } from "electron";
import type { TranscribeConfig } from "@medical-dict/core";
import type { DesktopSettings } from "./store";

const api = {
  getSettings: (): Promise<{ settings: DesktopSettings; platform: string }> => ipcRenderer.invoke("settings:get"),
  setSettings: (s: DesktopSettings): Promise<{ hotkeyOk: boolean }> => ipcRenderer.invoke("settings:set", s),
  onSettingsChanged: (cb: (s: DesktopSettings) => void) => ipcRenderer.on("settings:changed", (_e, s) => cb(s)),
  onToggle: (cb: () => void) => ipcRenderer.on("dictation:toggle", () => cb()),
  transcribe: (wav: ArrayBuffer, cfg: TranscribeConfig): Promise<{ text?: string; error?: string; status?: number; retryAfterMs?: number }> =>
    ipcRenderer.invoke("transcribe", wav, cfg),
  typeText: (text: string): Promise<{ ok: boolean }> => ipcRenderer.invoke("type-text", text),
  setState: (state: string) => ipcRenderer.send("state", state),
  error: (message: string) => ipcRenderer.send("error", message),
  openSettings: () => ipcRenderer.send("open-settings"),
};

contextBridge.exposeInMainWorld("sono", api);
export type SonoApi = typeof api;
