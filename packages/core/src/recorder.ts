// Microphone capture with pause detection. Speech is cut into segments at natural
// pauses so text can appear while the doctor is still dictating.
// Browser-only (used by the web app and the Electron renderer).

export const SAMPLE_RATE = 16000;
const FRAME = 1600; // 100 ms at 16 kHz

export interface RecorderOptions {
  /** Called with 16 kHz mono PCM for each spoken segment. */
  onSegment: (pcm: Float32Array) => void;
  /** 0..1 input level, ~10 times a second (for a meter). */
  onLevel?: (level: number, speaking: boolean) => void;
  deviceId?: string;
  /** Pause length that ends a segment once it has at least `minSegmentMs` of audio. */
  silenceMs?: number;
  /** A shorter segment is only cut on a longer pause (keeps request count low). */
  minSegmentMs?: number;
  longSilenceMs?: number;
  maxSegmentMs?: number;
}

const WORKLET = `
class Tap extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(${FRAME}); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) for (let i = 0; i < ch.length; i++) {
      this.buf[this.n++] = ch[i];
      if (this.n === ${FRAME}) { this.port.postMessage(this.buf.slice(0)); this.n = 0; }
    }
    return true;
  }
}
registerProcessor("tap", Tap);
`;

export class DictationRecorder {
  private opts: Required<Omit<RecorderOptions, "onLevel" | "deviceId">> & RecorderOptions;
  private ctx?: AudioContext;
  private stream?: MediaStream;
  private node?: AudioWorkletNode;

  private preroll: Float32Array[] = [];
  private segment: Float32Array[] = [];
  private inSpeech = false;
  private silentFrames = 0;
  private noiseFloor = 0.005;

  constructor(opts: RecorderOptions) {
    this.opts = {
      silenceMs: 900,
      minSegmentMs: 3000,
      longSilenceMs: 1800,
      maxSegmentMs: 28000,
      ...opts,
    };
  }

  get running(): boolean {
    return !!this.ctx;
  }

  async start(): Promise<void> {
    if (this.ctx) return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: this.opts.deviceId ? { exact: this.opts.deviceId } : undefined,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    // Chromium resamples the mic to the context rate for us.
    const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
    await ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    const src = ctx.createMediaStreamSource(this.stream);
    const node = new AudioWorkletNode(ctx, "tap");
    node.port.onmessage = (e: MessageEvent<Float32Array>) => this.onFrame(e.data);
    src.connect(node);
    // Worklets only run when connected to the graph; route to a muted sink.
    const mute = ctx.createGain();
    mute.gain.value = 0;
    node.connect(mute).connect(ctx.destination);
    this.ctx = ctx;
    this.node = node;
  }

  /** Stops the mic and emits whatever was being spoken. */
  async stop(): Promise<void> {
    if (!this.ctx) return;
    this.node?.port.close();
    this.stream?.getTracks().forEach((t) => t.stop());
    await this.ctx.close();
    this.ctx = undefined;
    this.flush(true);
    this.preroll = [];
    this.inSpeech = false;
  }

  private onFrame(frame: Float32Array) {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
    const rms = Math.sqrt(sum / frame.length);
    const threshold = Math.max(0.012, this.noiseFloor * 3);
    const speaking = rms > threshold;
    if (!speaking) this.noiseFloor = this.noiseFloor * 0.95 + rms * 0.05;
    this.opts.onLevel?.(Math.min(1, rms * 8), speaking);

    if (!this.inSpeech) {
      this.preroll.push(frame);
      if (this.preroll.length > 3) this.preroll.shift();
      if (speaking) {
        this.inSpeech = true;
        this.segment = this.preroll;
        this.preroll = [];
        this.silentFrames = 0;
      }
      return;
    }

    this.segment.push(frame);
    this.silentFrames = speaking ? 0 : this.silentFrames + 1;
    const segMs = this.segment.length * 100;
    const silentMs = this.silentFrames * 100;
    if (
      (silentMs >= this.opts.silenceMs && segMs >= this.opts.minSegmentMs) ||
      silentMs >= this.opts.longSilenceMs ||
      segMs >= this.opts.maxSegmentMs
    ) {
      this.flush(false);
    }
  }

  private flush(final: boolean) {
    const frames = this.segment;
    this.segment = [];
    this.inSpeech = false;
    // Keep ~300 ms of the trailing pause, drop the rest.
    const drop = Math.max(0, this.silentFrames - 3);
    this.silentFrames = 0;
    const kept = frames.slice(0, frames.length - drop);
    const speechFrames = kept.length - 3; // minus pre-roll
    if (speechFrames < (final ? 2 : 3)) return; // clicks / coughs
    this.opts.onSegment(concat(kept));
  }
}

export function concat(parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function encodeWav(pcm: Float32Array, sampleRate = SAMPLE_RATE): Blob {
  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + pcm.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) {
    const x = Math.max(-1, Math.min(1, pcm[i]));
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}
