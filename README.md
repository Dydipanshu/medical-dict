# USGScribe

Voice dictation for ultrasound reports. Doctors speak and the report writes itself,
either **straight into MS Word** (desktop app) or in a **Docs-style web editor**
with templates, printing and .docx export.

```
apps/web       Website + web app. site/ = static marketing & SEO pages (landing, USG report
               formats, privacy, sitemap), generated at build. src/ = the report editor at /app/.
apps/desktop   Tray app for Windows / Mac / Linux: hotkey → speak → text typed into Word (or any app)
packages/core  Shared: mic capture + pause detection, Whisper client, voice commands, macros, templates
```

## How it works

1. The microphone is captured in the browser/Electron and cut into segments at natural pauses,
   so text appears while the doctor is still talking.
2. Segments go to **Whisper large-v3-turbo on Groq**. The free tier needs no card and allows
   2,000 requests/day and 8 audio-hours/day. A medical prompt biases it toward ultrasound
   vocabulary and Indian/British spelling. Segments that pile up are merged into one request,
   which keeps usage inside the free limits.
3. The text is cleaned up in `packages/core/src/postprocess.ts`:
   - Voice commands: "new line", "new paragraph", "full stop", "comma", "colon", "open/close bracket".
   - Measurements: "10.2 by 4.5 centimetres" → `10.2 x 4.5 cm`, and likewise mm, ml, cc, g, bpm, cm/s.
   - Quick phrases: "insert normal liver" → the full normal-liver sentence (editable in settings).
   - Capitalisation and spacing that fit the text around the cursor. Selecting a `__` blank and
     saying "12" gives `(12 mm)`.
4. The web app inserts the text at the cursor. The desktop app pastes it into the focused window
   and then restores the user's clipboard.

## Setup

```bash
npm install
cp .env.example .env        # put a free key from https://console.groq.com/keys in GROQ_API_KEY
npm test                    # core unit tests
```

With no key, the web app falls back to the browser's built-in speech recognition
(Chrome/Edge only, less accurate).

### Web app

```bash
npm run dev:web             # site on http://localhost:5173, app on http://localhost:5173/app/
npm run build:web && npm run start:web   # production server on :3000
```

**Hosting:** Vercel free tier. `SITE_URL` (env var) sets canonical URLs, the sitemap and share
images; it defaults to https://usgscribe.com.
The project is connected to this GitHub repo, so every push to `main` redeploys automatically.
Its root directory is `apps/web`, and `GROQ_API_KEY` is set as a Vercel environment variable.
`api/transcribe.ts` runs as a serverless function, so the key never reaches the browser, and a
per-IP rate limit stops a public demo from using up the quota.

Reports and settings are stored in the browser's localStorage. Only the audio leaves the device.

### Desktop app (MS Word)

```bash
npm run dev:desktop         # run from source
npm run dist -w @medical-dict/desktop -- --win   # installer in apps/desktop/release (run on Windows)
npm run dist -w @medical-dict/desktop -- --mac   # .dmg (must be built on a Mac)
```

On first launch the settings window opens. Paste in a Groq key, or a deployed web app's
`/api/transcribe` URL under *Advanced*. Then:

1. Click in Word where the text should go.
2. Press **Ctrl+Shift+Space** (Cmd+Shift+Space on Mac) and speak. Text appears at each pause.
3. Press it again to stop. Dictation also stops by itself after 90 seconds of silence.

- The shortcut can be changed in settings. A USB foot pedal that sends a key works too.
- `USGScribe --toggle` starts/stops dictation from a script (AutoHotkey, Stream Deck, pedal software).
- **Mac:** allow Microphone and **Accessibility** (System Settings → Privacy & Security) so it can paste.
- **Linux:** needs `xdotool` (X11) or `wtype` (Wayland).
- **Word:** Word shows a small "Paste Options" button after each paste. To hide it:
  File → Options → Advanced → untick *Show Paste Options button when content is pasted*.

## Tested so far

- Core text processing: unit tests (`npm test`).
- Web: automated Chromium run with a fake microphone. Covers dictation → commands/macros/units,
  filling a `__` blank, print to A4 PDF, .docx export, and mobile layout.
- Desktop: the Windows build was run against real MS Word 365. Three dictated segments were pasted
  in order with correct paragraphs, and the user's clipboard was restored afterwards.
- Not yet tested: real Groq transcription (needs a key), the Mac build (needs a Mac).

## Next ideas

- An LLM clean-up pass ("make this a formal report"), also on Groq's free tier.
- Voice navigation between template fields ("next field", "go to impression").
- Clinic accounts and cloud sync. Code signing for the Windows/Mac installers.
