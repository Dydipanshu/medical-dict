# USGScribe

Voice dictation for ultrasound reports. Doctors speak and the report writes itself, either
**straight into MS Word** through a small desktop app, or in a **Docs-style web editor** with
templates, printing and .docx export.

**Live:** [usgscribe.tunedloop.com](https://usgscribe.tunedloop.com)

## Features

- **Dictate into Word or any app.** A tray app on Windows and Linux: press a hotkey, speak, and the
  text is typed where the cursor is. Your clipboard is restored after every paste.
- **Web editor.** Report templates, fill-in blanks, print to A4, export to .docx.
- **Live text.** Speech is cut at natural pauses, so text appears while you are still talking.
- **Built for ultrasound.** Measurements are formatted for you ("10.2 by 4.5 centimetres" becomes
  `10.2 x 4.5 cm`), and voice commands and quick phrases ("insert normal liver") save typing.
- **AI structuring.** Dictate findings in any order, press **Structure**, and review a clean report
  before applying it.
- **Private by design.** Reports stay in your browser. Patient details are never sent anywhere.

## How it works

1. The microphone is captured in the browser or Electron and cut into segments at natural pauses.
2. Segments are transcribed by **Whisper large-v3-turbo on Groq**. A medical prompt biases it toward
   ultrasound vocabulary and Indian/British spelling. Segments that pile up while a request is in
   flight are merged into one request, which keeps usage within Groq's free tier
   (2,000 requests and 8 audio-hours per day).
3. The text is cleaned up in `packages/core/src/postprocess.ts`:
   - Voice commands: "new line", "new paragraph", "full stop", "comma", "colon", "open/close bracket".
   - Measurements: mm, cm, ml, cc, g, bpm and cm/s are written in report style.
   - Quick phrases, editable in settings.
   - Capitalisation and spacing that fit the text around the cursor. Selecting a `__` blank and
     saying "12" gives `(12 mm)`.
4. The web app inserts the text at the cursor. The desktop app pastes it into the focused window
   and then restores the user's clipboard.

### Structure report (AI)

In the web editor the doctor can dictate findings anywhere and press **Structure**. Claude
(`claude-sonnet-5-5` by default, set `STRUCTURE_MODEL` to change it) moves each finding into the
right organ line, fills blanks with the dictated measurements and drafts the impression.

- Only the report body is sent, through `api/structure.ts`. The patient details at the top are not.
- The answer is checked in the browser by `checkStructured()` in `packages/core/src/structure.ts`
  before the doctor sees it. A line with a number that was never dictated is reverted. A dictated
  number missing from the result, a lost organ line or an unknown label raises a warning.
- Nothing changes until the doctor reviews the result and presses Apply. Ctrl+Z undoes it.
- The button appears only when `ANTHROPIC_API_KEY` is set on the server.

## Project layout

```
apps/web       Website and web app. site/ holds the static marketing and SEO pages (landing,
               USG report formats, privacy, sitemap), generated at build. src/ is the report
               editor served at /app/. api/ holds the serverless functions.
apps/desktop   Electron tray app for Windows and Linux.
packages/core  Shared code: mic capture and pause detection, Whisper client and request queue,
               voice commands, macros, templates, report structuring checks.
```

Tech: TypeScript, React, Vite, Electron, Node.js, Whisper (Groq), Claude API, Vercel.

## Getting started

Requirements: Node.js 22.6 or newer.

```bash
npm install
cp .env.example .env        # add a free key from https://console.groq.com/keys as GROQ_API_KEY
npm test                    # core unit tests
```

Without a key, the web app falls back to the browser's built-in speech recognition
(Chrome and Edge only, less accurate).

### Web app

```bash
npm run dev:web                            # site on http://localhost:5173, app on /app/
npm run build:web && npm run start:web     # production server on :3000
```

### Desktop app

```bash
npm run dev:desktop                               # run from source
npm run dist -w @medical-dict/desktop -- --win    # Windows installer in apps/desktop/release
npm run dist -w @medical-dict/desktop -- --linux  # Linux AppImage
```

On first launch the settings window opens. Paste in a Groq key, or a deployed web app's
`/api/transcribe` URL under *Advanced*. Then:

1. Click in Word where the text should go.
2. Press **Ctrl+Shift+Space** and speak. Text appears at each pause.
3. Press it again to stop. Dictation also stops by itself after 90 seconds of silence.

- The shortcut can be changed in settings. A USB foot pedal that sends a key works too.
- `USGScribe --toggle` starts or stops dictation from a script (AutoHotkey, Stream Deck, pedal software).
- On Linux, pasting needs `xdotool` (X11) or `wtype` (Wayland).
- Word shows a small "Paste Options" button after each paste. To hide it: File → Options →
  Advanced → untick *Show Paste Options button when content is pasted*.

## Configuration

| Variable | Where | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | server | Whisper transcription |
| `ANTHROPIC_API_KEY` | server | enables the Structure button |
| `STRUCTURE_MODEL` | server | model used for structuring (optional) |
| `SITE_URL` | build | canonical URLs, sitemap and share images (default https://usgscribe.com) |

## Deployment

The web app runs on Vercel's free tier with `apps/web` as the root directory, and every push to
`main` redeploys it. `api/transcribe.ts` runs as a serverless function, so the API key never
reaches the browser, and a per-IP rate limit stops a public demo from using up the quota.

## Development

```bash
npm test                    # unit tests for packages/core
npm run typecheck           # type-check every workspace
node --experimental-strip-types apps/web/scripts/eval-structure.ts   # check AI structuring on sample dictations
```

## Roadmap

- An LLM clean-up pass ("make this a formal report").
- Voice navigation between template fields ("next field", "go to impression").
- Clinic accounts and cloud sync.
- Code signing for the Windows installer.
