import { concat, encodeWav, SAMPLE_RATE } from "./recorder.ts";

export const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
export const GROQ_MODEL = "whisper-large-v3-turbo";

export interface TranscribeConfig {
  /** Our server's /api/transcribe (keeps the API key off the client). */
  endpoint?: string;
  /** Or call Groq directly with the user's own key (desktop app, self-hosting). */
  groqApiKey?: string;
  prompt?: string;
  language?: string;
}

export class TranscribeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterMs?: number,
  ) {
    super(message);
  }
}

export async function transcribe(audio: Blob, cfg: TranscribeConfig): Promise<string> {
  const form = new FormData();
  form.append("file", audio, "audio.wav");
  form.append("model", GROQ_MODEL);
  form.append("response_format", "json");
  form.append("temperature", "0");
  if (cfg.language) form.append("language", cfg.language);
  if (cfg.prompt) form.append("prompt", cfg.prompt);

  const url = cfg.groqApiKey ? GROQ_URL : cfg.endpoint;
  if (!url) throw new TranscribeError("No transcription service configured", 0);
  const res = await fetch(url, {
    method: "POST",
    body: form,
    headers: cfg.groqApiKey ? { Authorization: `Bearer ${cfg.groqApiKey}` } : undefined,
  });
  if (!res.ok) {
    let msg = `Transcription failed (${res.status})`;
    try {
      const body = await res.json();
      msg = body?.error?.message ?? body?.error ?? msg;
    } catch {
      /* not JSON */
    }
    const ra = Number(res.headers.get("retry-after"));
    throw new TranscribeError(String(msg), res.status, Number.isFinite(ra) && ra > 0 ? ra * 1000 : undefined);
  }
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

export interface QueueEvents {
  onText: (text: string) => void;
  onBusy?: (busy: boolean) => void;
  onError?: (err: TranscribeError | Error) => void;
}

/**
 * Sends segments one request at a time, in order. Segments that arrive while a
 * request is in flight are merged into the next request, which keeps us well
 * within free-tier rate limits. Rate-limited requests are retried.
 */
export class TranscriptionQueue {
  private pending: Float32Array[] = [];
  private running = false;
  private idleWaiters: (() => void)[] = [];

  constructor(
    private cfg: () => TranscribeConfig,
    private ev: QueueEvents,
    /** Swap out the network call (the desktop app sends it via the main process). */
    private send: (audio: Blob, cfg: TranscribeConfig) => Promise<string> = transcribe,
  ) {}

  push(pcm: Float32Array) {
    this.pending.push(pcm);
    void this.run();
  }

  /** Resolves once everything queued so far has been transcribed. */
  idle(): Promise<void> {
    if (!this.running && this.pending.length === 0) return Promise.resolve();
    return new Promise((r) => this.idleWaiters.push(r));
  }

  private async run() {
    if (this.running) return;
    this.running = true;
    this.ev.onBusy?.(true);
    try {
      while (this.pending.length) {
        const batch = this.pending;
        this.pending = [];
        // A short gap of silence between merged segments helps Whisper punctuate.
        const gap = new Float32Array(SAMPLE_RATE * 0.4);
        const pcm = concat(batch.flatMap((b, i) => (i ? [gap, b] : [b])));
        const text = await this.sendWithRetry(pcm);
        if (text) this.ev.onText(text);
      }
    } finally {
      this.running = false;
      this.ev.onBusy?.(false);
      this.idleWaiters.splice(0).forEach((r) => r());
    }
  }

  private async sendWithRetry(pcm: Float32Array): Promise<string> {
    const wav = encodeWav(pcm);
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.send(wav, this.cfg());
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        const status = err instanceof TranscribeError ? err.status : 0;
        const retryable = status === 429 || status >= 500 || status === 0;
        if (!retryable || attempt >= 3 || (err instanceof TranscribeError && err.message.startsWith("No transcription"))) {
          this.ev.onError?.(err);
          return "";
        }
        const wait = (err instanceof TranscribeError && err.retryAfterMs) || 1500 * 2 ** attempt;
        await new Promise((r) => setTimeout(r, Math.min(wait, 20000)));
      }
    }
  }
}
