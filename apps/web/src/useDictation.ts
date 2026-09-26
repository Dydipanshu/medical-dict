import { useCallback, useEffect, useRef, useState } from "react";
import { buildPrompt, DictationRecorder, TranscriptionQueue } from "@medical-dict/core";
import type { Settings } from "./storage";

export type DictationState = "idle" | "starting" | "listening";
export type ActiveEngine = "whisper" | "browser" | "none";

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

function speechRecognitionCtor(): (new () => SpeechRecognitionLike) | undefined {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | undefined;
}

let serverConfigured: Promise<boolean> | undefined;
function checkServer(): Promise<boolean> {
  serverConfigured ??= fetch("/api/transcribe")
    .then((r) => (r.ok ? r.json() : { configured: false }))
    .then((j: { configured?: boolean }) => !!j.configured)
    .catch(() => false);
  return serverConfigured;
}

/** Picks the engine: Whisper (accurate) when available, else the browser's own. */
export function useEngine(settings: Settings): ActiveEngine | undefined {
  const [engine, setEngine] = useState<ActiveEngine>();
  useEffect(() => {
    let cancelled = false;
    const browserOk = !!speechRecognitionCtor();
    (async () => {
      let e: ActiveEngine;
      if (settings.engine === "browser") e = browserOk ? "browser" : "none";
      else if (settings.groqApiKey) e = "whisper";
      else if (await checkServer()) e = "whisper";
      else e = settings.engine === "whisper" ? "none" : browserOk ? "browser" : "none";
      if (!cancelled) setEngine(e);
    })();
    return () => {
      cancelled = true;
    };
  }, [settings.engine, settings.groqApiKey]);
  return engine;
}

export function useDictation(settings: Settings, onText: (raw: string) => void) {
  const engine = useEngine(settings);
  const [state, setState] = useState<DictationState>("idle");
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState(0);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");

  const onTextRef = useRef(onText);
  onTextRef.current = onText;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const recorder = useRef<DictationRecorder>(undefined);
  const recognition = useRef<SpeechRecognitionLike>(undefined);
  const wantListening = useRef(false);

  const queue = useRef<TranscriptionQueue>(undefined);
  queue.current ??= new TranscriptionQueue(
    () => {
      const s = settingsRef.current;
      return {
        endpoint: "/api/transcribe",
        groqApiKey: s.groqApiKey || undefined,
        prompt: buildPrompt(s.vocabulary),
        language: s.locale.split("-")[0],
      };
    },
    {
      onText: (t) => onTextRef.current(t),
      onBusy: setBusy,
      onError: (e) => setError(e.message),
    },
  );

  const stop = useCallback(async () => {
    pendingStart.current = false;
    wantListening.current = false;
    setLevel(0);
    setInterim("");
    if (recorder.current) {
      const r = recorder.current;
      recorder.current = undefined;
      await r.stop();
    }
    recognition.current?.stop();
    recognition.current = undefined;
    setState("idle");
  }, []);

  const pendingStart = useRef(false);

  const start = useCallback(async () => {
    if (wantListening.current) return;
    if (!engine) {
      // Still checking which engine to use: start as soon as we know.
      pendingStart.current = true;
      setState("starting");
      return;
    }
    pendingStart.current = false;
    setError("");
    if (engine === "none") {
      setError("No speech engine available. Add a free Groq API key in Settings, or use Chrome / Edge.");
      return;
    }
    wantListening.current = true;
    setState("starting");
    try {
      if (engine === "whisper") {
        const r = new DictationRecorder({
          onSegment: (pcm) => queue.current!.push(pcm),
          onLevel: (l) => setLevel(l),
        });
        recorder.current = r;
        await r.start();
      } else {
        const Ctor = speechRecognitionCtor()!;
        const rec = new Ctor();
        rec.lang = settingsRef.current.locale;
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e) => {
          let partial = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i];
            if (res.isFinal) onTextRef.current(res[0].transcript);
            else partial += res[0].transcript;
          }
          setInterim(partial);
          setLevel(partial ? 0.6 : 0.1);
        };
        rec.onerror = (e) => {
          if (e.error === "no-speech" || e.error === "aborted") return;
          setError(e.error === "not-allowed" ? "Microphone permission was denied." : `Speech error: ${e.error}`);
          wantListening.current = false;
        };
        // Chrome ends recognition after a while; keep it going until the user stops.
        rec.onend = () => {
          if (wantListening.current && recognition.current === rec) rec.start();
          else setState("idle");
        };
        recognition.current = rec;
        rec.start();
      }
      if (wantListening.current) setState("listening");
    } catch (e) {
      const err = e as Error;
      setError(err.name === "NotAllowedError" ? "Microphone permission was denied." : err.message || "Could not start the microphone.");
      await stop();
    }
  }, [engine, stop]);

  const toggle = useCallback(
    () => (wantListening.current || pendingStart.current ? stop() : start()),
    [start, stop],
  );

  useEffect(() => {
    if (engine && pendingStart.current) void start();
  }, [engine, start]);

  useEffect(() => () => void stop(), [stop]);

  return { engine, state, busy, level, interim, error, start, stop, toggle, clearError: () => setError("") };
}
