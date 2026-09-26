import { DEFAULT_MACROS, TEMPLATES, type Macro } from "@medical-dict/core";

// Everything is stored in this browser only (no patient data leaves the device
// except the audio sent for transcription).

export const APP_NAME = "SonoScribe";

export interface Patient {
  name: string;
  age: string;
  sex: string;
  patientId: string;
  referredBy: string;
  date: string;
}

export interface Report {
  id: string;
  title: string;
  templateId: string;
  patient: Patient;
  html: string;
  createdAt: number;
  updatedAt: number;
}

export type Engine = "auto" | "whisper" | "browser";

export interface Settings {
  clinicName: string;
  clinicAddress: string;
  clinicContact: string;
  doctorName: string;
  doctorQualification: string;
  engine: Engine;
  groqApiKey: string;
  locale: string;
  vocabulary: string;
  macros: Macro[];
}

export const DEFAULT_SETTINGS: Settings = {
  clinicName: "Your Clinic Name",
  clinicAddress: "Clinic address, City",
  clinicContact: "Phone: 00000 00000",
  doctorName: "Dr. Your Name",
  doctorQualification: "MBBS, MD (Radiodiagnosis)",
  engine: "auto",
  groqApiKey: "",
  locale: "en-IN",
  vocabulary: "",
  macros: DEFAULT_MACROS,
};

const REPORTS_KEY = "sonoscribe.reports.v1";
const SETTINGS_KEY = "sonoscribe.settings.v1";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Could not save", e);
  }
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(SETTINGS_KEY, {}) };
}

export function saveSettings(s: Settings) {
  write(SETTINGS_KEY, s);
}

export function loadReports(): Report[] {
  return read<Report[]>(REPORTS_KEY, []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveReport(r: Report) {
  const all = read<Report[]>(REPORTS_KEY, []).filter((x) => x.id !== r.id);
  write(REPORTS_KEY, [r, ...all]);
}

export function deleteReport(id: string) {
  write(REPORTS_KEY, read<Report[]>(REPORTS_KEY, []).filter((x) => x.id !== id));
}

export function today(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function newReport(templateId: string): Report {
  const t = TEMPLATES.find((x) => x.id === templateId) ?? TEMPLATES[0];
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: t.title,
    templateId: t.id,
    patient: { name: "", age: "", sex: "", patientId: "", referredBy: "", date: today() },
    html: t.html,
    createdAt: now,
    updatedAt: now,
  };
}
