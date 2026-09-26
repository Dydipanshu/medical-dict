// Hidden-until-needed pill at the bottom of the screen. Owns the microphone,
// sends segments for transcription and hands finished text to the main
// process to type into the focused app.
import {
  buildPrompt,
  DictationRecorder,
  joinWithContext,
  processTranscript,
  TranscribeError,
  TranscriptionQueue,
} from "@medical-dict/core";
import type { SonoApi } from "./preload";
import type { DesktopSettings } from "./store";

const sono = (window as unknown as { sono: SonoApi }).sono;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const pill = $("pill");
const status = $("status");
const meter = $("meter");
const hint = $("hint");

const AUTO_STOP_MS = 90_000; // stop if nobody speaks for this long

let settings: DesktopSettings;
let recorder: DictationRecorder | undefined;
let listening = false;
let starting = false;
let busy = false;
let typedSoFar = "";
let lastSpeech = 0;
let idleTimer: number | undefined;

const queue = new TranscriptionQueue(
  () => ({ prompt: buildPrompt(settings.vocabulary), language: settings.locale.split("-")[0] }),
  {
    onText: (raw) => {
      const processed = processTranscript(raw, { macros: settings.macros });
      if (!processed) return;
      const text = joinWithContext(processed, typedSoFar);
      typedSoFar = (typedSoFar + text).slice(-200);
      void sono.typeText(text);
    },
    onBusy: (b) => {
      busy = b;
      render();
    },
    onError: (e) => sono.error(`Transcription failed: ${e.message}`),
  },
  async (wav, cfg) => {
    const r = await sono.transcribe(await wav.arrayBuffer(), cfg);
    if (r.error !== undefined) throw new TranscribeError(r.error, r.status ?? 0, r.retryAfterMs);
    return r.text ?? "";
  },
);

function render(level = 0) {
  pill.dataset.state = listening ? "listening" : busy || starting ? "busy" : "idle";
  status.textContent = starting ? "Starting mic…" : listening ? "Listening…" : busy ? "Typing…" : "Done";
  meter.style.transform = `scaleX(${listening ? Math.max(0.04, level) : 0})`;
}

async function startDictation() {
  if (listening) return;
  typedSoFar = "";
  starting = true;
  render();
  sono.setState("starting");
  recorder = new DictationRecorder({
    onSegment: (pcm) => queue.push(pcm),
    onLevel: (level, speaking) => {
      if (speaking) lastSpeech = Date.now();
      render(level);
    },
  });
  try {
    await recorder.start();
  } catch (e) {
    starting = false;
    recorder = undefined;
    sono.setState("idle");
    sono.error(`Microphone unavailable: ${(e as Error).message}`);
    return;
  }
  starting = false;
  listening = true;
  lastSpeech = Date.now();
  render();
  sono.setState("listening");
  idleTimer = window.setInterval(() => {
    if (Date.now() - lastSpeech > AUTO_STOP_MS) void stopDictation();
  }, 5000);
}

async function stopDictation() {
  if (!listening || !recorder) return;
  listening = false;
  clearInterval(idleTimer);
  const r = recorder;
  recorder = undefined;
  sono.setState("finishing");
  render();
  await r.stop();
  await queue.idle();
  render();
  sono.setState("idle");
}

async function init() {
  const res = await sono.getSettings();
  settings = res.settings;
  const key = settings.hotkey.replace("CommandOrControl", res.platform === "darwin" ? "⌘" : "Ctrl");
  hint.textContent = `${key} to stop`;
  sono.onSettingsChanged((s) => {
    settings = s;
    hint.textContent = `${s.hotkey.replace("CommandOrControl", res.platform === "darwin" ? "⌘" : "Ctrl")} to stop`;
  });
  sono.onToggle(() => void (listening ? stopDictation() : startDictation()));
  $("stop").addEventListener("click", () => void stopDictation());
  render();
}

void init();
