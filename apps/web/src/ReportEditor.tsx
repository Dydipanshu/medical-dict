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
import { joinWithContext, processTranscript } from "@medical-dict/core";
import { loadReports, saveReport, type Patient, type Report, type Settings } from "./storage";
import { useDictation } from "./useDictation";
import { insertDictation } from "./insert";
import { navigate } from "./nav";

const PATIENT_FIELDS: { key: keyof Patient; label: string; wide?: boolean }[] = [
  { key: "name", label: "Patient name", wide: true },
  { key: "date", label: "Date" },
  { key: "age", label: "Age" },
  { key: "sex", label: "Sex" },
  { key: "patientId", label: "Patient ID" },
  { key: "referredBy", label: "Referred by", wide: true },
];

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
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder: "Press F2 and start speaking, or type here…" }),
    ],
    content: report?.html ?? "",
    autofocus: "end",
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

  return (
    <div className="editor-page">
      <header className="topbar no-print">
        <div className="topbar-left">
          <button className="btn ghost" onClick={() => navigate("")}>
            <ArrowLeft size={16} /> Reports
          </button>
          <span className="save-state">{saved ? "Saved" : "Saving…"}</span>
        </div>
        <div className="topbar-right">
          <button className="btn" onClick={async () => editor && (await import("./exportDocx")).exportDocx(report, editor.getJSON(), settings)}>
            <Download size={16} /> Word (.docx)
          </button>
          <button className="btn primary" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </button>
        </div>
      </header>

      <div className="workspace">
        <div className="paper-column">
          {editor && <Toolbar editor={editor} />}
          <article className="paper">
            <header className="letterhead">
              <div className="clinic-name">{settings.clinicName}</div>
              <div className="clinic-line">{settings.clinicAddress}</div>
              <div className="clinic-line">{settings.clinicContact}</div>
            </header>

            <section className="patient-grid">
              {PATIENT_FIELDS.map((f) => (
                <label key={f.key} className={f.wide ? "wide" : ""}>
                  <span>{f.label}</span>
                  <input
                    data-dictate={f.key}
                    value={report.patient[f.key]}
                    onChange={(e) => setPatient(f.key, e.target.value)}
                  />
                </label>
              ))}
            </section>

            <input className="report-title" data-dictate="title" value={report.title} onChange={(e) => update({ title: e.target.value })} />

            <EditorContent editor={editor} className="report-body" />

            <footer className="signature">
              <div className="sig-name">{settings.doctorName}</div>
              <div className="sig-qual">{settings.doctorQualification}</div>
            </footer>
          </article>
        </div>

        <aside className="side no-print">
          <DictationCard dictation={dictation} />

          <div className="card">
            <h3>Quick phrases</h3>
            <p className="hint">
              Say <em>“insert normal liver”</em> or click:
            </p>
            <div className="chips">
              {settings.macros.map((m) => (
                <button key={m.name} className="chip" onMouseDown={(e) => e.preventDefault()} onClick={() => insertMacro(m.text)} title={m.text}>
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <div className="card commands-card">
            <h3>Voice commands</h3>
            <dl className="commands">
              <dt>“new line”</dt>
              <dd>next line</dd>
              <dt>“new paragraph”</dt>
              <dd>blank line</dd>
              <dt>“full stop” / “comma”</dt>
              <dd>. ,</dd>
              <dt>“colon” / “open bracket”</dt>
              <dd>: (</dd>
              <dt>“4.5 by 3.2 centimetres”</dt>
              <dd>4.5 x 3.2 cm</dd>
            </dl>
            <p className="hint">Tip: select a “__” blank, then speak the value to fill it in. Ctrl+Z undoes the last dictation.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function DictationCard({ dictation: d }: { dictation: ReturnType<typeof useDictation> }) {
  const listening = d.state === "listening";
  const engineLabel =
    d.engine === "whisper" ? "Whisper (high accuracy)" : d.engine === "browser" ? "Browser speech (basic)" : d.engine === "none" ? "Not available" : "…";
  return (
    <div className={`card dictation ${listening ? "on" : ""}`}>
      <button
        className="mic"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => void d.toggle()}
        disabled={d.state === "starting" || !d.engine}
        aria-label={listening ? "Stop dictation" : "Start dictation"}
      >
        {d.state === "starting" ? <Loader2 className="spin" size={30} /> : listening ? <Square size={26} /> : <Mic size={30} />}
      </button>
      <div className="dictation-text">
        <div className="dictation-status">{listening ? "Listening…" : "Click or press F2 to dictate"}</div>
        <div className="meter" aria-hidden>
          <div className="meter-fill" style={{ transform: `scaleX(${listening ? Math.max(0.03, d.level) : 0})` }} />
        </div>
        <div className="engine">
          {engineLabel}
          {d.busy && (
            <span className="busy">
              <Loader2 className="spin" size={12} /> writing…
            </span>
          )}
        </div>
      </div>
      {d.interim && <p className="interim">{d.interim}</p>}
      {d.error && (
        <p className="error" role="alert">
          {d.error}{" "}
          <button className="linklike" onClick={d.clearError}>
            dismiss
          </button>
        </p>
      )}
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
    <div className="toolbar no-print">
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
