import { TEMPLATES } from "@medical-dict/core";
import { esc, page, siteUrl, SITE_NAME } from "./layout.ts";
import { FORMATS } from "./formats.ts";

const shortName = (h1: string) => {
  const n = h1.replace(/^USG /, "").replace(/ report format/, "");
  return n.charAt(0).toUpperCase() + n.slice(1);
};

export const WINDOWS_DOWNLOAD = "/download/windows";

// Spoken input and the text USGScribe writes, taken from the real processing rules.
const EXAMPLES: [string, string][] = [
  ["“right kidney measures ten point two by four point five centimetres”", "Right kidney measures <m>10.2 x 4.5 cm</m>"],
  ["“insert normal liver”", "Liver is normal in size, shape and echotexture. No focal lesion seen. Intrahepatic biliary radicles are not dilated."],
  ["“FHR one forty two beats per minute”", "FHR <m>142 bpm</m>"],
  ["“impression colon grade one fatty liver”", "Impression: grade I fatty liver"],
  ["“calculus open bracket six millimetres close bracket”", "Calculus (<m>6 mm</m>)"],
  ["<em>Select a __ blank, then say</em> “twelve”", "Normal in calibre (<m>12</m> mm)"],
];

const FAQ: [string, string][] = [
  [
    "Does it understand Indian English accents?",
    "Yes. USGScribe uses Whisper, a speech model trained on millions of hours of speech in many accents, and it is set up for Indian English and British spelling (calibre, oedema, centimetre). There is no voice training step.",
  ],
  [
    "Does it work inside MS Word?",
    "Yes. Install the Windows app, click in your Word report where the text should go, press Ctrl+Shift+Space and speak. The text is typed at your cursor, the same as if you had typed it. It also works in any other program you type into, such as your clinic software.",
  ],
  [
    "Do I need to train it or learn commands?",
    "No training. Speak normally. A few optional words help: “new line”, “new paragraph”, “full stop”, “comma”, “colon”, and “insert” followed by a phrase name such as “insert normal kidneys”.",
  ],
  [
    "How accurate is it with ultrasound terms?",
    "It is primed with ultrasound vocabulary: hepatomegaly, cholelithiasis, corticomedullary differentiation, hydronephrosis, BPD, HC, AC, FL, AFI and more. You can add your own words, such as a referring doctor’s name, in settings. Always read the report before signing it.",
  ],
  [
    "Is it free?",
    "Yes, USGScribe is free during early access. There is no card to enter and no trial timer.",
  ],
  [
    "What happens to patient data?",
    "Reports you write in the web app are saved in your own browser. The Windows app types straight into your Word file. Only the audio of your dictation is sent to our speech service to be turned into text, and USGScribe does not keep it. Read the privacy page for details.",
  ],
  [
    "Does it need internet?",
    "Yes. The speech recognition runs on a server, so a normal clinic internet connection is needed while you dictate.",
  ],
  [
    "Does it work on Mac?",
    "The web app works in Chrome or Edge on any computer. A Mac version of the Word app is in progress.",
  ],
];

function landing(): string {
  const body = `
<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <h1>Dictate your USG reports instead of typing them.</h1>
      <p class="lede">Say the findings the way you would tell a colleague. USGScribe writes them into MS Word, or into its own report editor, with measurements formatted and your normal-study sentences one phrase away.</p>
      <div class="cta-row">
        <a class="btn" href="/app">Try it free in your browser</a>
        <a class="btn btn-quiet" href="#download">Get the Word app for Windows</a>
      </div>
      <p class="fine">Free during early access. No sign-up. Works in Chrome and Edge.</p>
    </div>
    ${heroDemo()}
  </div>
</section>

<section class="band" aria-labelledby="say-title">
  <div class="wrap">
    <h2 id="say-title">It knows how a USG report is written</h2>
    <p class="section-lede">General dictation writes down every word. USGScribe turns speech into report text: numbers become measurements, spoken punctuation becomes punctuation, and your standard sentences come out in full.</p>
    <table class="say-table">
      <thead><tr><th scope="col">You say</th><th scope="col">USGScribe writes</th></tr></thead>
      <tbody>
        ${EXAMPLES.map(([said, out]) => `<tr><td class="said-cell">${said}</td><td class="out-cell">${out.replace(/<m>/g, '<span class="m">').replace(/<\/m>/g, "</span>")}</td></tr>`).join("")}
      </tbody>
    </table>
  </div>
</section>

<section id="how-it-works" class="band band-tint" aria-labelledby="how-title">
  <div class="wrap two-col">
    <div>
      <h2 id="how-title">Keep using MS Word</h2>
      <p class="section-lede">Your letterhead, your formats, your printer. The Windows app sits in the corner of the screen and types wherever your cursor is.</p>
      <ol class="steps">
        <li><span class="step-n">1</span><div><h3>Open your report in Word</h3><p>Click where the findings go, the same as you would before typing.</p></div></li>
        <li><span class="step-n">2</span><div><h3>Press Ctrl+Shift+Space and speak</h3><p>Text appears each time you pause, so you can check it as you go. A foot pedal can be set up as the key.</p></div></li>
        <li><span class="step-n">3</span><div><h3>Press it again to stop</h3><p>Read through, sign, print. Ctrl+Z in Word undoes anything you want to redo.</p></div></li>
      </ol>
    </div>
    <figure class="word-mock" aria-label="MS Word with USGScribe listening">
      <div class="word-bar"><span></span><span></span><span></span><b>Report - Mrs Sunita Sharma.docx - Word</b></div>
      <div class="word-page">
        <p class="wp-title">USG KUB</p>
        <p><b>Right kidney:</b> Measures <span class="m">10.4 x 4.6 cm</span>. Normal in size and echotexture. A <span class="m">6 mm</span> calculus is seen in the lower pole. No hydronephrosis.</p>
        <p><b>Left kidney:</b> Measures <span class="m">10.1 x 4.4 cm</span>. Normal in size and echotexture.<span class="caret"></span></p>
      </div>
      <div class="pill"><span class="pill-dot"></span><span>Listening…</span><small>Ctrl+Shift+Space to stop</small></div>
    </figure>
  </div>
</section>

<section class="band" aria-labelledby="web-title">
  <div class="wrap two-col two-col-flip">
    <div>
      <h2 id="web-title">Or write the whole report in the browser</h2>
      <p class="section-lede">No installation. Pick a format, fill in the patient details, dictate, and print on A4 with your clinic’s letterhead, or download it as a Word file.</p>
      <ul class="plain-list">
        <li>Ready formats for whole abdomen, KUB, pelvis, early pregnancy, obstetric growth scans and thyroid, pre-filled with normal findings</li>
        <li>Say “insert normal kidneys” and similar phrases for the sentences you use every day, and add your own</li>
        <li>Select a blank and speak the value to fill it in</li>
        <li>Patient name, age and referring doctor can be dictated too</li>
      </ul>
      <p><a class="text-link" href="/app">Open the report editor</a></p>
    </div>
    <div class="formats-list">
      <h3>Formats included</h3>
      <ul>
        ${FORMATS.map((f) => `<li><a href="/usg-report-format/${f.slug}">${esc(shortName(f.h1))}</a></li>`).join("")}
      </ul>
      <p class="fine">Each format is free to read and copy, even without the app.</p>
    </div>
  </div>
</section>

<section id="compare" class="band band-tint" aria-labelledby="compare-title">
  <div class="wrap">
    <h2 id="compare-title">How it compares</h2>
    <p class="section-lede">What USG clinics use today, side by side.</p>
    <div class="table-scroll">
      <table class="compare">
        <thead><tr><th scope="col"><span class="sr">Feature</span></th><th scope="col" class="us">USGScribe</th><th scope="col">Word’s built-in Dictate</th><th scope="col">Dragon Medical One</th><th scope="col">Typing</th></tr></thead>
        <tbody>
          <tr><th scope="row">Ultrasound vocabulary</th><td class="us">Built in, plus your own words</td><td>General vocabulary</td><td>Medical vocabulary</td><td>—</td></tr>
          <tr><th scope="row">“10.2 by 4.5 cm” written as 10.2 x 4.5 cm</th><td class="us">Yes</td><td>No</td><td>With setup</td><td>—</td></tr>
          <tr><th scope="row">Normal-study sentences by voice</th><td class="us">Yes, ready-made and editable</td><td>No</td><td>Yes, set up per user</td><td>Copy and paste</td></tr>
          <tr><th scope="row">Works inside MS Word</th><td class="us">Yes, and in other programs</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
          <tr><th scope="row">USG formats and printing</th><td class="us">Yes, in the web app</td><td>No</td><td>No</td><td>Your own</td></tr>
          <tr><th scope="row">Voice training needed</th><td class="us">No</td><td>No</td><td>No</td><td>—</td></tr>
          <tr><th scope="row">Price</th><td class="us">Free during early access</td><td>Included with Microsoft 365</td><td>About US$79–99 per user per month, plus setup</td><td>Your time</td></tr>
        </tbody>
      </table>
    </div>
    <p class="fine">Dragon Medical One pricing from public 2026 price listings; check with the vendor for current rates.</p>
  </div>
</section>

<section id="download" class="band" aria-labelledby="download-title">
  <div class="wrap download">
    <div>
      <h2 id="download-title">Get started in two minutes</h2>
      <p class="section-lede">Try it in the browser first. When you are happy, install the Windows app to dictate into Word.</p>
    </div>
    <div class="download-actions">
      <a class="btn" href="/app">Open the web app</a>
      <a class="btn btn-quiet" href="${WINDOWS_DOWNLOAD}">Download for Windows</a>
      <p class="fine">Windows 10 and 11. Windows may show a “Windows protected your PC” notice while the app is new: choose “More info”, then “Run anyway”.</p>
    </div>
  </div>
</section>

<section id="faq" class="band band-tint" aria-labelledby="faq-title">
  <div class="wrap narrow">
    <h2 id="faq-title">Questions doctors ask</h2>
    <div class="faq">
      ${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}
    </div>
  </div>
</section>
`;
  return page({
    path: "/",
    title: "USGScribe – Voice Dictation for Ultrasound (USG) Reports in MS Word",
    description:
      "Dictate ultrasound reports instead of typing. USGScribe understands USG terms, formats measurements and types into MS Word. Free USG report formats for abdomen, KUB, obstetric and thyroid scans.",
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
        "@type": "FAQPage",
        mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      },
    ],
  });
}

function heroDemo(): string {
  // Final state is in the HTML (readable without JavaScript and by search engines);
  // site.js replays it as a typing animation.
  return `
<figure class="demo" aria-label="Example: a doctor’s spoken words becoming report text">
  <div class="voice" aria-hidden="true">
    <span class="voice-dot"></span>
    <p class="voice-said" id="demo-said">right renal calculus full stop</p>
  </div>
  <div class="sheet">
    <div class="sheet-head">
      <p class="sheet-clinic">Sunrise Imaging Centre</p>
      <p class="sheet-meta">Mrs Sunita Sharma, 42 Y / F. Ref: Dr R. Mehta</p>
    </div>
    <p class="sheet-title">USG WHOLE ABDOMEN</p>
    <p><b>Liver:</b> <span data-step="0">Normal in size, measuring <span class="m">14.5 cm</span>. No focal lesion.</span></p>
    <p><b>Gall bladder:</b> <span data-step="1">Well distended. Wall thickness is normal. No calculus or sludge seen within.</span></p>
    <p><b>Right kidney:</b> <span data-step="2">Measures <span class="m">10.2 x 4.5 cm</span>. A <span class="m">6 mm</span> calculus is seen in the lower pole.</span></p>
    <p><b>Impression:</b> <span data-step="3">Right renal calculus.</span></p>
  </div>
</figure>`;
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
  const html = t.html.replace(/__/g, '<span class="blank">__</span>');
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
        <a class="btn" href="/app#/new/${t.id}">Dictate this report in USGScribe</a>
        <button class="btn btn-quiet" type="button" data-copy="#format-text">Copy the format</button>
      </div>
      <p class="fine">This is a normal-study starting point. Edit it to match your findings and your clinic’s style, and always review before signing.</p>
    </div>
    <aside class="format-side">
      <h2>Dictate it instead</h2>
      <p>Open this format in USGScribe, click a line and speak. Say “insert normal kidneys” for the full normal sentence, or “ten point two by four point five centimetres” to get 10.2 x 4.5 cm.</p>
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
    <h2>Settings</h2>
    <p>Your letterhead, phrases and preferences are stored in your browser or on your computer.</p>
  </div>
</section>`;
  return page({
    path: "/privacy",
    title: "Privacy | USGScribe",
    description: "How USGScribe handles patient reports and dictation audio.",
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
