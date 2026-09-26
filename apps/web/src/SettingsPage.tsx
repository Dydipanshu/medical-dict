import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { DEFAULT_MACROS } from "@medical-dict/core";
import type { Engine, Settings } from "./storage";
import { navigate } from "./nav";
import { useEngine } from "./useDictation";

export function SettingsPage({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value });
  const engine = useEngine(settings);

  const text = (key: "clinicName" | "clinicAddress" | "clinicContact" | "doctorName" | "doctorQualification", label: string) => (
    <label className="field">
      <span>{label}</span>
      <input value={settings[key]} onChange={(e) => set(key, e.target.value)} />
    </label>
  );

  const setMacro = (i: number, patch: Partial<{ name: string; text: string }>) =>
    set(
      "macros",
      settings.macros.map((m, j) => (i === j ? { ...m, ...patch } : m)),
    );

  return (
    <div className="settings">
      <header className="topbar">
        <button className="btn ghost" onClick={() => navigate("")}>
          <ArrowLeft size={16} /> Reports
        </button>
        <span className="save-state">Changes save automatically</span>
      </header>

      <main className="settings-main">
        <h1>Settings</h1>

        <section className="card">
          <h2>Letterhead</h2>
          <p className="hint">Printed at the top and bottom of every report.</p>
          {text("clinicName", "Clinic name")}
          {text("clinicAddress", "Address")}
          {text("clinicContact", "Phone / email")}
          {text("doctorName", "Doctor name (signature)")}
          {text("doctorQualification", "Qualification")}
        </section>

        <section className="card">
          <h2>Speech recognition</h2>
          <label className="field">
            <span>Engine</span>
            <select value={settings.engine} onChange={(e) => set("engine", e.target.value as Engine)}>
              <option value="auto">Automatic (best available)</option>
              <option value="whisper">Whisper via Groq — accurate, free tier</option>
              <option value="browser">Browser built-in — Chrome / Edge only, basic</option>
            </select>
          </label>
          <p className="hint">
            Currently using:{" "}
            <strong>{engine === "whisper" ? "Whisper" : engine === "browser" ? "Browser speech" : engine === "none" ? "none available" : "…"}</strong>
          </p>
          <label className="field">
            <span>Your own Groq API key (optional)</span>
            <input
              type="password"
              autoComplete="off"
              placeholder="gsk_…  — only needed if the server has no key"
              value={settings.groqApiKey}
              onChange={(e) => set("groqApiKey", e.target.value.trim())}
            />
          </label>
          <p className="hint">
            Free at{" "}
            <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
              console.groq.com/keys
            </a>
            , no card needed. Stored only in this browser.
          </p>
          <label className="field">
            <span>Accent / language</span>
            <select value={settings.locale} onChange={(e) => set("locale", e.target.value)}>
              <option value="en-IN">English (India)</option>
              <option value="en-GB">English (UK)</option>
              <option value="en-US">English (US)</option>
            </select>
          </label>
          <label className="field">
            <span>Extra words to recognise</span>
            <textarea
              rows={3}
              placeholder="e.g. adenomyosis, Dr. Mehrotra, TIRADS, hepatosplenomegaly"
              value={settings.vocabulary}
              onChange={(e) => set("vocabulary", e.target.value)}
            />
          </label>
        </section>

        <section className="card">
          <div className="section-head">
            <h2>Quick phrases</h2>
            <button className="btn ghost small" onClick={() => confirm("Restore the default phrases? Your edits will be lost.") && set("macros", DEFAULT_MACROS)}>
              Restore defaults
            </button>
          </div>
          <p className="hint">
            Say <em>“insert</em> + name<em>”</em> while dictating to drop in the text.
          </p>
          <div className="macro-list">
            {settings.macros.map((m, i) => (
              <div className="macro-row" key={i}>
                <input className="macro-name" value={m.name} onChange={(e) => setMacro(i, { name: e.target.value })} aria-label="Phrase name" />
                <textarea rows={2} value={m.text} onChange={(e) => setMacro(i, { text: e.target.value })} aria-label="Phrase text" />
                <button className="icon-btn" aria-label="Delete phrase" onClick={() => set("macros", settings.macros.filter((_, j) => j !== i))}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button className="btn" onClick={() => set("macros", [...settings.macros, { name: "new phrase", text: "" }])}>
            <Plus size={16} /> Add phrase
          </button>
        </section>
      </main>
    </div>
  );
}
