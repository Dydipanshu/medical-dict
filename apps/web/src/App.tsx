import { useEffect, useState } from "react";
import { ReportList } from "./ReportList";
import { ReportEditor } from "./ReportEditor";
import { SettingsPage } from "./SettingsPage";
import { loadSettings, newReport, saveReport, saveSettings, type Settings } from "./storage";

type Route = { page: "list" } | { page: "report"; id: string } | { page: "settings" };

// Deep link from the website's report-format pages: #/new/<templateId> creates
// the report once and swaps the URL to it, so reloading doesn't make another.
function consumeNewReportLink() {
  const m = location.hash.match(/^#\/?new\/([\w-]+)$/);
  if (!m) return;
  const r = newReport(m[1]);
  saveReport(r);
  history.replaceState(null, "", `#/report/${r.id}`);
}
consumeNewReportLink();

function parseHash(): Route {
  const h = location.hash.replace(/^#\/?/, "");
  if (h.startsWith("report/")) return { page: "report", id: h.slice(7) };
  if (h === "settings") return { page: "settings" };
  return { page: "list" };
}

export function App() {
  const [route, setRoute] = useState<Route>(parseHash);
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    const on = () => {
      consumeNewReportLink();
      setRoute(parseHash());
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const updateSettings = (s: Settings) => {
    setSettings(s);
    saveSettings(s);
  };

  if (route.page === "report") return <ReportEditor key={route.id} id={route.id} settings={settings} />;
  if (route.page === "settings") return <SettingsPage settings={settings} onChange={updateSettings} />;
  return <ReportList settings={settings} />;
}
