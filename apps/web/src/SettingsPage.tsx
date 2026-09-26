import type { ReactNode } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { DEFAULT_MACROS } from "@medical-dict/core";
import type { Engine, Settings } from "./storage";
import { navigate } from "./nav";
import { useEngine } from "./useDictation";

function Section({ title, hint, children }: { title: string; hint: ReactNode; children: ReactNode }) {
  return (
    <section className="settings-section">
      <div className="s-head">
        <h2>{title}</h2>
        <p>{hint}</p>
      </div>
      <div className="s-body">{children}</div>
    </section>
  );
}

export function SettingsPage({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value });
  const engine = useEngine(settings);

  const text = (
    key: "clinicName" | "clinicAddress" | "clinicContact" | "doctorName" | "doctorQualification" | "doctorDesignation" | "registrationNo",
    label: string,
  ) => (
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

  const engineName = engine === "whisper" ? "Whisper" : engine === "browser" ? "your browser's speech recognition" : engine === "none" ? "nothing (no engine available)" : "…";

  return (
    <div className="settings">
      <header className="bar">
        <button className="ghost-btn" onClick={() => navigate("")} aria-label="All reports">
          <ArrowLeft size={18} />
        </button>
        <div className="bar-title">
          <span className="bar-name">Settings</span>
          <span className="bar-sub">
            <span>Changes save automatically</span>
          </span>
        </div>
      </header>

      <main className="settings-main">
        <Section title="Letterhead" hint="Printed at the top of every report.">
          <label className="check">
            <input type="checkbox" checked={settings.preprintedLetterhead} onChange={(e) => set("preprintedLetterhead", e.target.checked)} />
            I print on paper that already has our letterhead
          </label>
          {settings.preprintedLetterhead ? (
            <label className="field field-narrow">
              <span>Space to leave at the top (mm)</span>
              <input
                type="number"
                min={0}
                max={120}
                value={settings.letterheadSpaceMm}
                onChange={(e) => set("letterheadSpaceMm", Math.max(0, Math.min(120, Number(e.target.value) || 0)))}
              />
            </label>
          ) : (
            <>
              {text("clinicName", "Clinic name")}
              {text("clinicAddress", "Address")}
              {text("clinicContact", "Phone or email")}
            </>
          )}
        </Section>

        <Section title="Signature" hint="Printed at the bottom right of every report.">
          <div className="field-row">
            {text("doctorName", "Doctor's name")}
            {text("doctorQualification", "Qualification")}
          </div>
          <div className="field-row">
            {text("doctorDesignation", "Designation")}
            {text("registrationNo", "Medical council registration no.")}
          </div>
          <label className="field">
            <span>Note at the foot of the report</span>
            <textarea rows={2} value={settings.disclaimer} onChange={(e) => set("disclaimer", e.target.value)} />
            <small>Leave empty to print no note. Obstetric reports also carry the PCPNDT declaration automatically.</small>
          </label>
        </Section>

        <Section title="Speech" hint={<>Now using {engineName}.</>}>
          <label className="field">
            <span>Recognition</span>
            <select value={settings.engine} onChange={(e) => set("engine", e.target.value as Engine)}>
              <option value="auto">Best available</option>
              <option value="whisper">Whisper (most accurate)</option>
              <option value="browser">Browser built-in (Chrome and Edge only)</option>
            </select>
          </label>
          <label className="field">
            <span>Accent</span>
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
              placeholder="adenomyosis, TIRADS, Dr. Mehrotra"
              value={settings.vocabulary}
              onChange={(e) => set("vocabulary", e.target.value)}
            />
            <small>Names of referring doctors and rare terms, separated by commas.</small>
          </label>
          <label className="field">
            <span>Your own Groq API key</span>
            <input
              type="password"
              autoComplete="off"
              placeholder="Optional"
              value={settings.groqApiKey}
              onChange={(e) => set("groqApiKey", e.target.value.trim())}
            />
            <small>
              Not needed. A free key from{" "}
              <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
                console.groq.com
              </a>{" "}
              gives you your own quota. Stored only in this browser.
            </small>
          </label>
        </Section>

        <Section
          title="Quick phrases"
          hint={
            <>
              Say “insert” and the name while dictating, for example “insert normal liver”.{" "}
              <button className="linklike" onClick={() => confirm("Restore the default phrases? Your edits will be lost.") && set("macros", DEFAULT_MACROS)}>
                Restore defaults
              </button>
            </>
          }
        >
          <div className="macro-list">
            {settings.macros.map((m, i) => (
              <div className="macro-row" key={i}>
                <input className="macro-name" value={m.name} onChange={(e) => setMacro(i, { name: e.target.value })} aria-label="Phrase name" />
                <textarea rows={2} value={m.text} onChange={(e) => setMacro(i, { text: e.target.value })} aria-label={`Text for ${m.name}`} />
                <button className="ghost-btn" aria-label={`Delete ${m.name}`} onClick={() => set("macros", settings.macros.filter((_, j) => j !== i))}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button className="btn" onClick={() => set("macros", [...settings.macros, { name: "new phrase", text: "" }])}>
            <Plus size={16} /> Add phrase
          </button>
        </Section>
      </main>
    </div>
  );
}
