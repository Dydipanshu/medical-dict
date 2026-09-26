import { useState } from "react";
import { Search, Settings as Cog, Trash2 } from "lucide-react";
import { TEMPLATES } from "@medical-dict/core";
import { deleteReport, loadReports, newReport, saveReport, type Settings } from "./storage";
import { navigate } from "./nav";
import { Logo } from "./Logo";

function when(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

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
      <header className="bar">
        <a className="brand" href="/" title="USGScribe website">
          <Logo />
        </a>
        <span className="bar-clinic">{settings.clinicName}</span>
        <div className="bar-actions">
          <button className="ghost-btn" onClick={() => navigate("settings")} aria-label="Settings" title="Settings">
            <Cog size={18} />
          </button>
        </div>
      </header>

      <main className="home-main">
        <section className="new-report" aria-labelledby="new-title">
          <h1 id="new-title">New report</h1>
          <p className="muted">Choose a format. Press F2 in the report to start dictating.</p>
          <ul className="template-list">
            {TEMPLATES.map((t) => (
              <li key={t.id}>
                <button onClick={() => create(t.id)}>
                  <span className="t-name">{t.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="recent" aria-labelledby="recent-title">
          <div className="recent-head">
            <h2 id="recent-title">Recent</h2>
            {reports.length > 0 && (
              <label className="search">
                <Search size={16} aria-hidden />
                <input placeholder="Patient name or ID" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search reports" />
              </label>
            )}
          </div>
          {reports.length === 0 ? (
            <p className="empty">Reports you write are saved here, in this browser. Print or download the ones you need to keep.</p>
          ) : shown.length === 0 ? (
            <p className="empty">No report matches “{query}”.</p>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th scope="col">Patient</th>
                  <th scope="col">Scan</th>
                  <th scope="col">Edited</th>
                  <th scope="col">
                    <span className="sr">Delete</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <a href={`#/report/${r.id}`}>{r.patient.name || "Untitled patient"}</a>
                    </td>
                    <td className="muted">{r.title}</td>
                    <td className="muted num">{when(r.updatedAt)}</td>
                    <td className="row-actions">
                      <button className="ghost-btn" aria-label={`Delete report for ${r.patient.name || "untitled patient"}`} onClick={() => remove(r.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
