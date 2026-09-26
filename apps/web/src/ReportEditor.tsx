import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import Placeholder from "@tiptap/extension-placeholder";
import {
  AlignCenter,
  AlignLeft,
  ArrowLeft,
  Bold,
  Download,
  Heading3,
  Italic,
  List,
  Loader2,
  Mic,
  Printer,
  Redo2,
  Square,
  Underline,
  Undo2,
} from "lucide-react";
import { joinWithContext, pcpndtDeclaration, processTranscript } from "@medical-dict/core";
import { FindingLabel } from "./findingLabel";
import { loadReports, saveReport, type Patient, type Report, type Settings } from "./storage";
import { useDictation } from "./useDictation";
import { insertDictation } from "./insert";
import { navigate } from "./nav";

/** How many "__" blanks are still in the report. */
function countBlanks(html: string): number {
  return (html.replace(/<[^>]+>/g, " ").match(/_{2,}/g) ?? []).length;
}

export function ReportEditor({ id, settings }: { id: string; settings: Settings }) {
  const [report, setReport] = useState<Report | undefined>(() => loadReports().find((r) => r.id === id));
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef<number>(undefined);
  const reportRef = useRef(report);
  reportRef.current = report;

  const scheduleSave = useCallback(() => {
    setSaved(false);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      if (reportRef.current) saveReport({ ...reportRef.current, updatedAt: Date.now() });
      setSaved(true);
    }, 400);
  }, []);

  // Flush a pending save when leaving the page.
  useEffect(
    () => () => {
      window.clearTimeout(saveTimer.current);
      if (reportRef.current) saveReport({ ...reportRef.current, updatedAt: Date.now() });
    },
    [],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      FindingLabel,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder: "Press F2 and start speaking, or type here…" }),
    ],
    content: report?.html ?? "",
    autofocus: "end",
    // Keep the cursor clear of the sticky toolbar and the floating record bar.
    editorProps: {
      scrollThreshold: { top: 130, bottom: 150, left: 0, right: 0 },
      scrollMargin: { top: 150, bottom: 170, left: 0, right: 0 },
    },
    onUpdate: ({ editor }) => {
      setReport((r) => (r ? { ...r, html: editor.getHTML() } : r));
      scheduleSave();
    },
  });

  const update = (patch: Partial<Report>) => {
    setReport((r) => (r ? { ...r, ...patch } : r));
    scheduleSave();
  };
  const setPatient = (key: keyof Patient, value: string) => {
    setReport((r) => (r ? { ...r, patient: { ...r.patient, [key]: value } } : r));
    scheduleSave();
  };

  // Dictation goes to whichever box the doctor is in: a header field or the report body.
  const onText = useCallback(
    (raw: string) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement && el.dataset.dictate) {
        const text = processTranscript(raw).replace(/\n+/g, " ").replace(/\.$/, "");
        if (!text) return;
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const joined = joinWithContext(text, el.value.slice(0, start), el.value.slice(end));
        const value = el.value.slice(0, start) + joined + el.value.slice(end);
        const field = el.dataset.dictate;
        if (field === "title") update({ title: value });
        else setPatient(field as keyof Patient, value);
        requestAnimationFrame(() => el.setSelectionRange(start + joined.length, start + joined.length));
        return;
      }
      if (editor) insertDictation(editor, raw, settings.macros);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, settings.macros],
  );

  const dictation = useDictation(settings, onText);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        void dictation.toggle();
      } else if (e.key === "Escape" && dictation.state !== "idle") {
        void dictation.stop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dictation]);

  if (!report) {
    return (
      <div className="notfound">
        <p>This report doesn't exist in this browser.</p>
        <button className="btn" onClick={() => navigate("")}>
          Back to reports
        </button>
      </div>
    );
  }

  const insertMacro = (text: string) => editor && insertDictation(editor, text, []);

  const title = report.patient.name.trim() || "Untitled patient";

  const print = () => {
    const blanks = countBlanks(report.html);
    if (blanks && !confirm(`${blanks} blank${blanks > 1 ? "s" : ""} (__) not filled in yet. Print anyway?`)) return;
    window.print();
  };

  const field = (key: keyof Patient, placeholder = "") => (
    <input data-dictate={key} value={report.patient[key]} placeholder={placeholder} onChange={(e) => setPatient(key, e.target.value)} />
  );

  return (
    <div className="editor-page">
      <header className="bar no-print">
        <button className="ghost-btn" onClick={() => navigate("")} aria-label="All reports">
          <ArrowLeft size={18} />
        </button>
        <div className="bar-title">
          <span className="bar-name">{title}</span>
          <span className="bar-sub">
            <span>{report.title}</span>
            <span className={saved ? "save-ok" : "save-pending"}>{saved ? "Saved" : "Saving…"}</span>
          </span>
        </div>
        <div className="bar-actions">
          <button className="btn" onClick={async () => editor && (await import("./exportDocx")).exportDocx(report, editor.getJSON(), settings)}>
            <Download size={16} /> Word file
          </button>
          <button className="btn btn-dark" onClick={print}>
            <Printer size={16} /> Print
          </button>
        </div>
      </header>

      {editor && <Toolbar editor={editor} />}

      <main className="canvas">
        <article className="paper">
          {settings.preprintedLetterhead ? (
            <div className="letterhead-space" style={{ height: `${settings.letterheadSpaceMm}mm` }} aria-label="Space for pre-printed letterhead" />
          ) : (
            <header className="letterhead">
              <div className="clinic-name">{settings.clinicName}</div>
              <div className="clinic-line">{settings.clinicAddress}</div>
              <div className="clinic-line">{settings.clinicContact}</div>
            </header>
          )}

          <table className="patient-table">
            <tbody>
              <tr>
                <th scope="row">Name</th>
                <td>{field("name")}</td>
                <th scope="row">Age / Sex</th>
                <td className="age-sex">
                  {field("age", "Age")}
                  <span aria-hidden>/</span>
                  {field("sex", "Sex")}
                </td>
              </tr>
              <tr>
                <th scope="row">Ref. by</th>
                <td>{field("referredBy")}</td>
                <th scope="row">Date</th>
                <td>{field("date")}</td>
              </tr>
              <tr>
                <th scope="row">Reg. No.</th>
                <td>{field("patientId")}</td>
                <th />
                <td />
              </tr>
            </tbody>
          </table>

          <input className="report-title" data-dictate="title" value={report.title} onChange={(e) => update({ title: e.target.value })} />

          <EditorContent editor={editor} className="report-body" />

          {report.pcpndt && (
            <p className="pcpndt">
              <strong>Declaration (PCPNDT Act):</strong> {pcpndtDeclaration(settings.doctorName, report.patient.name)}
            </p>
          )}

          <footer className="signature">
            <div className="sig-space" />
            <div className="sig-name">{settings.doctorName}</div>
            <div className="sig-qual">{settings.doctorQualification}</div>
            {settings.doctorDesignation && <div className="sig-qual">{settings.doctorDesignation}</div>}
            {settings.registrationNo && <div className="sig-qual">Reg. No. {settings.registrationNo}</div>}
          </footer>
          {settings.disclaimer.trim() && <p className="disclaimer">{settings.disclaimer}</p>}
        </article>
      </main>

      <RecBar dictation={dictation} macros={settings.macros} onPhrase={insertMacro} />
    </div>
  );
}

type Dictation = ReturnType<typeof useDictation>;

/** Floating record bar: the web app's version of the desktop app's "Listening" pill. */
function RecBar({ dictation: d, macros, onPhrase }: { dictation: Dictation; macros: Settings["macros"]; onPhrase: (text: string) => void }) {
  const [panel, setPanel] = useState<"none" | "phrases" | "commands">("none");
  const listening = d.state === "listening";
  const starting = d.state === "starting";
  const toggle = (p: "phrases" | "commands") => setPanel((cur) => (cur === p ? "none" : p));

  useEffect(() => {
    if (panel === "none") return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setPanel("none");
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [panel]);

  let status: string;
  if (d.error) status = d.error;
  else if (starting) status = "Starting microphone…";
  else if (listening) status = d.interim || (d.busy ? "Writing…" : "Listening. Pause to see text.");
  else if (d.busy) status = "Writing…";
  else status = "Press F2 or click to dictate";

  return (
    <div className="rec-dock no-print">
      {panel !== "none" && (
        <div className="rec-panel" role="dialog" aria-label={panel === "phrases" ? "Quick phrases" : "Voice commands"}>
          {panel === "phrases" ? (
            <>
              <p className="rec-panel-hint">
                Say “insert” and the name, or click one. Edit them in Settings.
              </p>
              <ul className="phrase-list">
                {macros.map((m) => (
                  <li key={m.name}>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => onPhrase(m.text)} title={m.text}>
                      <span className="phrase-name">{m.name}</span>
                      <span className="phrase-text">{m.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <dl className="commands">
              <dt>replace liver</dt>
              <dd>Replaces the LIVER line with what you say next</dd>
              <dt>go to impression</dt>
              <dd>Moves to the end of the IMPRESSION line</dd>
              <dt>new line</dt>
              <dd>Starts the next line</dd>
              <dt>new paragraph</dt>
              <dd>Leaves a blank line</dd>
              <dt>full stop, comma, colon</dt>
              <dd>. , :</dd>
              <dt>open bracket, close bracket</dt>
              <dd>( )</dd>
              <dt>10.2 by 4.5 centimetres</dt>
              <dd>10.2 x 4.5 cm</dd>
              <dt>insert normal liver</dt>
              <dd>The full normal-liver sentence</dd>
              <dt>Select a __ and speak</dt>
              <dd>Fills in the blank</dd>
            </dl>
          )}
        </div>
      )}
      <div className={`rec-bar ${listening ? "is-on" : ""} ${d.error ? "has-error" : ""}`}>
        <button
          className="rec-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void d.toggle()}
          aria-label={listening || starting ? "Stop dictation" : "Start dictation"}
          aria-pressed={listening}
        >
          {starting ? <Loader2 className="spin" size={18} /> : listening ? <Square size={14} fill="currentColor" /> : <Mic size={18} />}
        </button>
        <div className="rec-status" aria-live="polite">
          <span className={d.interim ? "rec-interim" : ""}>{status}</span>
          {d.error && (
            <button className="linklike" onClick={d.clearError}>
              Dismiss
            </button>
          )}
        </div>
        <div className="rec-meter" aria-hidden>
          <span style={{ transform: `scaleX(${listening ? Math.max(0.04, d.level) : 0})` }} />
        </div>
        <div className="rec-tools">
          <button className={panel === "phrases" ? "on" : ""} onMouseDown={(e) => e.preventDefault()} onClick={() => toggle("phrases")}>
            Phrases
          </button>
          <button className={panel === "commands" ? "on" : ""} onMouseDown={(e) => e.preventDefault()} onClick={() => toggle("commands")}>
            Commands
          </button>
        </div>
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      h3: e.isActive("heading", { level: 3 }),
      list: e.isActive("bulletList"),
      center: e.isActive({ textAlign: "center" }),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const b = (label: string, active: boolean, onClick: () => void, icon: React.ReactNode, disabled = false) => (
    <button className={`tool ${active ? "active" : ""}`} aria-label={label} title={label} onMouseDown={(e) => e.preventDefault()} onClick={onClick} disabled={disabled}>
      {icon}
    </button>
  );
  const c = () => editor.chain().focus();
  return (
    <div className="toolbar no-print" role="toolbar" aria-label="Formatting">
      {b("Undo", false, () => c().undo().run(), <Undo2 size={16} />, !s.canUndo)}
      {b("Redo", false, () => c().redo().run(), <Redo2 size={16} />, !s.canRedo)}
      <span className="sep" />
      {b("Bold", s.bold, () => c().toggleBold().run(), <Bold size={16} />)}
      {b("Italic", s.italic, () => c().toggleItalic().run(), <Italic size={16} />)}
      {b("Underline", s.underline, () => c().toggleUnderline().run(), <Underline size={16} />)}
      <span className="sep" />
      {b("Heading", s.h3, () => c().toggleHeading({ level: 3 }).run(), <Heading3 size={16} />)}
      {b("Bullet list", s.list, () => c().toggleBulletList().run(), <List size={16} />)}
      {b("Align left", !s.center, () => c().setTextAlign("left").run(), <AlignLeft size={16} />)}
      {b("Center", s.center, () => c().setTextAlign("center").run(), <AlignCenter size={16} />)}
    </div>
  );
}
