import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import type { CheckedReport } from "@medical-dict/core";
import { buildDoc, requestStructure, snapshot, worthStructuring, type Snapshot } from "./structure";

type State = { kind: "empty" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; result: CheckedReport };

/** Review step for AI structuring. Nothing reaches the report until the doctor presses Apply. */
export function StructurePanel({ editor, title, templateId, onClose }: { editor: Editor; title: string; templateId: string; onClose: () => void }) {
  const snap = useRef<Snapshot>(snapshot(editor.getJSON(), templateId));
  const [state, setState] = useState<State>(() => (worthStructuring(snap.current.lines) ? { kind: "loading" } : { kind: "empty" }));
  const [addUnplaced, setAddUnplaced] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!worthStructuring(snap.current.lines)) return;
    const ctl = new AbortController();
    setState({ kind: "loading" });
    requestStructure(title, snap.current.lines, ctl.signal)
      .then((result) => setState({ kind: "ready", result }))
      .catch((e: Error) => !ctl.signal.aborted && setState({ kind: "error", message: e.message }));
    return () => ctl.abort();
  }, [title, attempt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    dialog.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const apply = (result: CheckedReport) => {
    editor.chain().focus().setContent(buildDoc(snap.current, result, addUnplaced)).run();
    onClose();
  };

  const changes = state.kind === "ready" ? state.result.lines.filter((l) => l.changed).length : 0;

  return (
    <div className="sp-backdrop no-print" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sp" role="dialog" aria-modal="true" aria-labelledby="sp-title" tabIndex={-1} ref={dialog}>
        <header className="sp-head">
          <div>
            <h2 id="sp-title">Structure report</h2>
            <p className="muted">Claude moves your dictation into the right lines and writes the impression. Check every line before you apply it.</p>
          </div>
          <button className="ghost-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="sp-body" aria-live="polite">
          {state.kind === "empty" && (
            <p className="sp-note">
              There is nothing to structure yet. Dictate your findings anywhere in the report, for example “liver is mildly enlarged, sixteen point two
              centimetres, grade one fatty”, then press Structure again.
            </p>
          )}
          {state.kind === "loading" && (
            <p className="sp-note">
              <Loader2 className="spin" size={16} /> Structuring the report…
            </p>
          )}
          {state.kind === "error" && (
            <div className="sp-note">
              <p>{state.message}</p>
              <button className="btn" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </button>
            </div>
          )}
          {state.kind === "ready" && (
            <>
              {state.result.warnings.length > 0 && (
                <div className="sp-warn" role="note">
                  <p className="sp-warn-title">
                    <AlertTriangle size={16} /> Check before applying
                  </p>
                  <ul>
                    {state.result.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="sp-count muted">
                {changes === 0 ? "No lines changed." : `${changes} line${changes > 1 ? "s" : ""} changed, marked in the margin.`}
              </p>
              <ol className="sp-lines">
                {state.result.lines.map((l, i) => (
                  <li key={i} className={l.changed ? "is-changed" : l.reverted ? "is-reverted" : ""}>
                    {l.label && <span className="sp-label">{l.label} :</span>}
                    <span className="sp-text">
                      {l.text}
                      {l.reverted && <em className="sp-tag"> Kept as it was</em>}
                    </span>
                  </li>
                ))}
              </ol>
              {state.result.unplaced.length > 0 && (
                <div className="sp-unplaced">
                  <p className="sp-warn-title">Could not be placed in a line</p>
                  <ul>
                    {state.result.unplaced.map((u) => (
                      <li key={u}>{u}</li>
                    ))}
                  </ul>
                  <label className="sp-check">
                    <input type="checkbox" checked={addUnplaced} onChange={(e) => setAddUnplaced(e.target.checked)} /> Add these to the report, before the impression
                  </label>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="sp-foot">
          <p className="muted">Only the report text is sent, not the patient details at the top. Undo with Ctrl+Z.</p>
          <div className="sp-actions">
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-dark" disabled={state.kind !== "ready"} onClick={() => state.kind === "ready" && apply(state.result)}>
              Apply to report
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
