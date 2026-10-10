import { TEMPLATES } from "@medical-dict/core";
import { esc, page, siteUrl, SITE_NAME } from "./layout.ts";
import { FORMATS } from "./formats.ts";

const shortName = (h1: string) => {
  const n = h1.replace(/^USG /, "").replace(/ report format/, "");
  return n.charAt(0).toUpperCase() + n.slice(1);
};

export const WINDOWS_DOWNLOAD = "/download/windows";

// Pairs observed from real transcriptions (and covered by core unit tests).
const DETAILS: [string, string][] = [
  ["sixteen point two centimetres", "16.2 cm"],
  ["ten point four by four point six centimetres", "10.4 x 4.6 cm"],
  ["grade one fatty liver", "grade I fatty liver"],
  ["impression colon", "Impression:"],
  ["insert clinical correlation", "Kindly correlate clinically."],
  ["replace liver …", "Rewrites the LIVER line with what you say next"],
  ["insert normal kidneys", "Both kidneys are normal in size, shape, position and echotexture. Corticomedullary differentiation is maintained. No calculus or hydronephrosis seen on either side."],
];

const FAQ: [string, string][] = [
  [
    "How is this different from the Dictate button in Word?",
    "Word’s Dictate is general-purpose. USGScribe is set up for ultrasound reports: it knows the vocabulary (echotexture, hydronephrosis, BPD, AFI), writes measurements as 10.4 x 4.6 cm, uses Roman numerals for grades, and turns short phrases like “insert normal kidneys” into your full standard sentences.",
  ],
  [
    "Does it understand Indian English accents?",
    "Yes. It uses Whisper, a speech model trained on millions of hours of speech in many accents, set up for Indian English and British spelling. There is no voice training step.",
  ],
  [
    "Does it work in software other than Word?",
    "Yes. The Windows app types wherever your cursor is, so it also works in your clinic or hospital software, email and browsers.",
  ],
  [
    "Is it free?",
    "Yes, during early access. No card, no sign-up, no trial timer.",
  ],
  [
    "What happens to patient data?",
    "Reports written in the web app stay in your browser. The Windows app types straight into your document. Only the audio of your dictation is sent to be turned into text, and USGScribe does not store it. If you press Structure, the report text (not the patient details at the top) is sent to an AI model to be organised. Details are on the privacy page.",
  ],
  [
    "Does it need internet?",
    "Yes. Speech recognition runs on a server, so a normal internet connection is needed while you dictate.",
  ],
  [
    "Windows says “Windows protected your PC”. Is it safe?",
    "Windows shows that for new apps that are not yet code-signed. Choose “More info”, then “Run anyway”. The installer comes from USGScribe’s official download page on GitHub.",
  ],
  [
    "Is there a Mac version?",
    "The web app works in Chrome or Edge on a Mac today. A Mac version of the Word app is in progress.",
  ],
];

function landing(): string {
  const body = `
<section class="hero">
  <div class="wrap">
    <h1>Stop typing<br>USG reports.</h1>
    <div class="hero-sub">
      <p class="lede">Speak the findings. USGScribe writes them into MS Word or its own report editor, with the ultrasound terms and measurements right.</p>
      <div class="cta-row">
        <a class="btn btn-dark" href="/download/windows">Download for Windows</a>
        <a class="btn" href="/app">Try it in the browser</a>
      </div>
      <p class="fine">Free during early access. Windows 10 and 11, or Chrome and Edge on any computer.</p>
    </div>
  </div>
  <figure class="film wrap">
    <div class="film-frame">
      <video id="film" src="/media/app-dictation.webm" poster="/media/app-dictation-poster.jpg" width="1440" height="1080" muted playsinline loop preload="metadata" aria-describedby="film-note">
        <track kind="captions" src="/media/app-dictation.vtt" srclang="en" label="What the doctor says" default>
      </video>
    </div>
    <figcaption>
      <p class="said" id="said" aria-hidden="true"></p>
      <div class="film-meta">
        <button class="film-toggle" type="button" id="film-toggle" aria-label="Play video">Play</button>
        <p class="film-note" id="film-note">Unedited recording of the web app at normal speed. The doctor never touches the mouse: “replace liver” and “replace impression” move the cursor.</p>
      </div>
    </figcaption>
  </figure>
</section>

<section class="rate" aria-labelledby="rate-title">
  <div class="wrap">
    <h2 id="rate-title" class="sr">Speaking is faster than typing</h2>
    <p class="rate-line">You speak at <span class="num">150</span> words a minute. You type at <span class="num">52</span>.</p>
    <p class="source">Averages from the <a href="https://virtualspeech.com/blog/average-speaking-rate-words-per-minute">National Center for Voice and Speech</a> and a <a href="https://userinterfaces.aalto.fi/136Mkeystrokes/">study of 168,000 typists</a> at Aalto University.</p>
  </div>
</section>

<section id="word" class="section" aria-labelledby="word-title">
  <div class="wrap">
    <div class="section-intro">
      <h2 id="word-title">Keep your Word templates.</h2>
      <p>The Windows app types at your cursor, in MS Word or any other program. Your letterhead, your formats, your printer stay the same.</p>
    </div>
    <ol class="steps">
      <li><span class="step-n">1</span><p>Click where the finding goes.</p></li>
      <li><span class="step-n">2</span><p>Press <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>Space</kbd> and speak.</p></li>
      <li><span class="step-n">3</span><p>Press it again to stop. Text appears each time you pause.</p></li>
    </ol>
    <figure class="shot">
      <div class="shot-tabs" role="tablist" aria-label="Word screenshots">
        <button role="tab" id="tab-listening" aria-selected="false" aria-controls="shot-img" data-src="/media/word-listening.webp" data-alt="MS Word with a KUB report, the cursor after Right kidney, and the USGScribe Listening indicator in the corner.">Before</button>
        <button role="tab" id="tab-done" aria-selected="true" aria-controls="shot-img" data-src="/media/word-impression.webp" data-alt="The same Word report after dictation: the right kidney finding and the impression have been typed in by USGScribe.">After dictation</button>
      </div>
      <img id="shot-img" src="/media/word-impression.webp" width="1920" height="974" loading="lazy" alt="The same Word report after dictation: the right kidney finding and the impression have been typed in by USGScribe.">
      <figcaption>Screenshots from MS Word 365 on Windows. The right kidney finding and the impression were dictated.</figcaption>
    </figure>
  </div>
</section>

<section class="section section-line" aria-labelledby="details-title">
  <div class="wrap">
    <div class="section-intro">
      <h2 id="details-title">It writes it the way reports are written.</h2>
      <p>Numbers become measurements, spoken punctuation becomes punctuation, and short phrases become your standard sentences.</p>
    </div>
    <table class="details">
      <thead><tr><th scope="col">You say</th><th scope="col">In the report</th></tr></thead>
      <tbody>
        ${DETAILS.map(([said, out]) => `<tr><td>${esc(said)}</td><td>${esc(out)}</td></tr>`).join("")}
      </tbody>
    </table>
  </div>
</section>

<section class="section section-line" aria-labelledby="formats-title">
  <div class="wrap formats">
    <div class="section-intro">
      <h2 id="formats-title">Formats to start from.</h2>
      <p>Pre-filled with normal findings, so you only dictate what’s different. Each one is free to read and copy.</p>
    </div>
    <ul class="format-links">
      ${FORMATS.map((f) => `<li><a href="/usg-report-format/${f.slug}">${esc(shortName(f.h1))}</a></li>`).join("")}
    </ul>
  </div>
</section>

<section id="faq" class="section section-line" aria-labelledby="faq-title">
  <div class="wrap faq-wrap">
    <h2 id="faq-title">Questions</h2>
    <div class="faq">
      ${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}
    </div>
  </div>
</section>

<section class="closing">
  <div class="wrap">
    <p class="closing-line">Dictate your next report.</p>
    <div class="cta-row">
      <a class="btn btn-light" href="/download/windows">Download for Windows</a>
      <a class="btn btn-outline-light" href="/app">Try it in the browser</a>
    </div>
  </div>
</section>
`;
  return page({
    path: "/",
    title: "USGScribe – Voice Dictation for Ultrasound (USG) Reports in MS Word",
    description:
      "Stop typing USG reports. Speak the findings and USGScribe writes them into MS Word or its own editor, with ultrasound terms and measurements right. Free during early access.",
    body,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "MedicalApplication",
        operatingSystem: "Windows, Web",
        description: "Voice dictation for ultrasound (USG) reports that types into MS Word and a web report editor.",
        url: siteUrl() + "/",
        offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      },
      {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: "Dictating an ultrasound report with USGScribe",
        description: "Unedited recording of a whole-abdomen report being dictated in the USGScribe web app.",
        thumbnailUrl: siteUrl() + "/media/app-dictation-poster.jpg",
        contentUrl: siteUrl() + "/media/app-dictation.webm",
        uploadDate: "2026-09-26",
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      },
    ],
  });
}

function formatsIndex(): string {
  const body = `
<section class="band page-top">
  <div class="wrap narrow">
    <h1>USG report formats</h1>
    <p class="section-lede">Normal-study ultrasound report formats used in Indian USG clinics. Read and copy them for free, or open one in USGScribe and dictate the findings.</p>
    <ul class="format-index">
      ${FORMATS.map(
        (f) => `<li><a href="/usg-report-format/${f.slug}"><h2>${esc(f.h1)}</h2><p>${esc(f.description)}</p></a></li>`,
      ).join("")}
    </ul>
  </div>
</section>`;
  return page({
    path: "/usg-report-format",
    title: "USG Report Formats – Whole Abdomen, KUB, Obstetric, Thyroid | USGScribe",
    description:
      "Free normal ultrasound report formats: USG whole abdomen (male and female), KUB, female pelvis, early pregnancy, obstetric growth scan and thyroid.",
    body,
    jsonLd: [breadcrumbs([["USG report formats", "/usg-report-format"]])],
  });
}

function formatPage(slug: string): string {
  const f = FORMATS.find((x) => x.slug === slug)!;
  const t = TEMPLATES.find((x) => x.id === f.templateId)!;
  // Labels as real text (so copying into Word keeps them), blanks highlighted.
  const html = t.html
    .replace(/<p data-label="IMPRESSION">/g, '<p class="finding impression"><b class="f-label">IMPRESSION :</b> ')
    .replace(/<p data-label="([^"]+)">/g, '<p class="finding"><b class="f-label">$1 :</b> ')
    .replace(/__/g, '<span class="blank">__</span>');
  const others = FORMATS.filter((x) => x.slug !== slug);
  const body = `
<section class="band page-top">
  <div class="wrap format-grid">
    <div class="format-main">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/usg-report-format">USG report formats</a></nav>
      <h1>${esc(f.h1)}</h1>
      <p class="section-lede">${esc(f.intro)}</p>
      <div class="sheet sheet-static" id="format-text">
        <p class="sheet-title">${esc(t.title)}</p>
        ${html}
      </div>
      <div class="cta-row">
        <a class="btn btn-dark" href="/app#/new/${t.id}">Dictate this report in USGScribe</a>
        <button class="btn" type="button" data-copy="#format-text">Copy the format</button>
      </div>
      <p class="fine">This is a normal-study starting point. Edit it to match your findings and your clinic’s style, and always review before signing.</p>
    </div>
    <aside class="format-side">
      <h2>Dictate it instead</h2>
      <p>Open this format in USGScribe, click a line and speak. Say “insert normal kidneys” for the full normal sentence, or “ten point two by four point five centimetres” to get 10.2&nbsp;x&nbsp;4.5&nbsp;cm.</p>
      <h2>Other formats</h2>
      <ul>${others.map((o) => `<li><a href="/usg-report-format/${o.slug}">${esc(shortName(o.h1))}</a></li>`).join("")}</ul>
    </aside>
  </div>
</section>`;
  return page({
    path: `/usg-report-format/${slug}`,
    title: f.title,
    description: f.description,
    body,
    jsonLd: [
      breadcrumbs([
        ["USG report formats", "/usg-report-format"],
        [f.h1, `/usg-report-format/${slug}`],
      ]),
    ],
  });
}

function privacy(): string {
  const body = `
<section class="band page-top">
  <div class="wrap narrow prose">
    <h1>Privacy</h1>
    <p class="section-lede">USGScribe is built so that patient reports stay with you.</p>
    <h2>Your reports</h2>
    <p>Reports written in the web app are saved in your own browser on your own computer. They are not uploaded to USGScribe. Clearing your browser data deletes them, so print or download reports you need to keep.</p>
    <p>The Windows app types into your document, such as your MS Word file. It does not keep a copy of what it types.</p>
    <h2>Your dictation audio</h2>
    <p>To turn speech into text, the audio of your dictation is sent over an encrypted connection to our speech recognition service (the Whisper model, run by Groq). USGScribe does not store the audio or the text. Avoid saying details you do not want processed, such as a patient’s phone number, while dictating.</p>
    <h2>Structure report (AI)</h2>
    <p>The web app has an optional Structure button. Only when you press it, the text of the report body is sent over an encrypted connection to Anthropic’s Claude model, which moves your dictation into the right lines and drafts the impression. The patient details at the top of the report (name, age, sex, ID and referring doctor) are not sent, so avoid dictating them into the report body. USGScribe does not store the text, and under Anthropic’s API terms it is not used to train their models by default. Nothing changes in your report until you review the result and press Apply.</p>
    <h2>Settings</h2>
    <p>Your letterhead, phrases and preferences are stored in your browser or on your computer.</p>
  </div>
</section>`;
  return page({
    path: "/privacy",
    title: "Privacy | USGScribe",
    description: "How USGScribe handles patient reports, dictation audio and AI structuring.",
    body,
  });
}

function breadcrumbs(items: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: siteUrl() + path })),
  };
}

/** Every static page: output path (relative, .html) -> HTML. */
export function sitePages(): Map<string, string> {
  const pages = new Map<string, string>();
  pages.set("index.html", landing());
  pages.set("usg-report-format.html", formatsIndex());
  for (const f of FORMATS) pages.set(`usg-report-format/${f.slug}.html`, formatPage(f.slug));
  pages.set("privacy.html", privacy());
  return pages;
}

export function sitemap(): string {
  const paths = ["/", "/usg-report-format", ...FORMATS.map((f) => `/usg-report-format/${f.slug}`), "/privacy"];
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${siteUrl()}${p === "/" ? "/" : p}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`;
}

export function robots(): string {
  return `User-agent: *
Allow: /
Disallow: /app
Disallow: /api/

Sitemap: ${siteUrl()}/sitemap.xml
`;
}
