import { useState } from "react";
import { FileText, Mic, Plus, Settings as Cog, Trash2 } from "lucide-react";
import { TEMPLATES } from "@medical-dict/core";
import { APP_NAME, deleteReport, loadReports, newReport, saveReport, type Settings } from "./storage";
import { navigate } from "./nav";

export function ReportList({ settings }: { settings: Settings }) {
  const [reports, setReports] = useState(loadReports);
  const [query, setQuery] = useState("");

  const create = (templateId: string) => {
    const r = newReport(templateId);
    saveReport(r);
    navigate(`report/${r.id}`);
  };

  const remove = (id: string) => {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    deleteReport(id);
    setReports(loadReports());
  };

  const q = query.trim().toLowerCase();
  const shown = q
    ? reports.filter((r) => [r.patient.name, r.patient.patientId, r.title].some((f) => f.toLowerCase().includes(q)))
    : reports;

  return (
    <div className="home">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Mic size={18} />
          </span>
          <span>{APP_NAME}</span>
          <span className="brand-clinic">{settings.clinicName}</span>
        </div>
        <button className="btn ghost" onClick={() => navigate("settings")}>
          <Cog size={16} /> Settings
        </button>
      </header>

      <main className="home-main">
        <section>
          <h1 className="home-title">New report</h1>
          <p className="muted">Pick a template, then just speak. Press <kbd>F2</kbd> to start and stop dictation.</p>
          <div className="template-grid">
            {TEMPLATES.map((t) => (
              <button key={t.id} className="template-card" onClick={() => create(t.id)}>
                <span className="template-icon">{t.id === "blank" ? <Plus size={18} /> : <FileText size={18} />}</span>
                <span className="template-name">{t.name}</span>
                <span className="template-sub">{t.title}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="section-head">
            <h2>Recent reports</h2>
            {reports.length > 0 && (
              <input className="search" placeholder="Search patient or ID" value={query} onChange={(e) => setQuery(e.target.value)} />
            )}
          </div>
          {reports.length === 0 ? (
            <p className="empty">No reports yet. They're saved in this browser as you type.</p>
          ) : (
            <ul className="report-list">
              {shown.map((r) => (
                <li key={r.id}>
                  <a href={`#/report/${r.id}`} className="report-row">
                    <span className="report-patient">{r.patient.name || "Unnamed patient"}</span>
                    <span className="report-type">{r.title}</span>
                    <span className="report-date">{r.patient.date}</span>
                  </a>
                  <button className="icon-btn" aria-label="Delete report" onClick={() => remove(r.id)}>
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
