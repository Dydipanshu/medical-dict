// Shared shell for the static marketing pages (landing, report formats, privacy).
// Pages are plain HTML so they load fast and search engines read everything.

export const SITE_NAME = "USGScribe";

export function siteUrl(): string {
  return (process.env.SITE_URL || "https://usgscribe.com").replace(/\/$/, "");
}

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface PageOptions {
  path: string; // "/", "/usg-report-format/kub"
  title: string;
  description: string;
  body: string;
  jsonLd?: object[];
}

const NAV = [
  { href: "/usg-report-format", label: "Report formats" },
  { href: "/#faq", label: "FAQ" },
  { href: "/app", label: "Web app" },
];

export function page(o: PageOptions): string {
  const url = siteUrl() + (o.path === "/" ? "/" : o.path);
  const ld = (o.jsonLd ?? []).map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n");
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${siteUrl()}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@600;700;800&family=Funnel+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap">
<link rel="stylesheet" href="/site.css">
${ld}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap head-row">
    <a class="logo" href="/" aria-label="${SITE_NAME} home">${logoMark()}<span>USGScribe</span></a>
    <nav aria-label="Main">
      <ul>${NAV.map((n) => `<li><a href="${n.href}">${n.label}</a></li>`).join("")}</ul>
    </nav>
    <a class="btn btn-dark btn-small" href="/download/windows">Download</a>
  </div>
</header>
<main id="main">
${o.body}
</main>
<footer class="site-foot">
  <div class="wrap foot-row">
    <a class="logo" href="/">${logoMark()}<span>USGScribe</span></a>
    <p>Voice dictation for ultrasound reports, made for USG clinics in India.</p>
    <ul>
      <li><a href="/download/windows">Windows app</a></li>
      <li><a href="/app">Web app</a></li>
      <li><a href="/usg-report-format">USG report formats</a></li>
      <li><a href="/privacy">Privacy</a></li>
    </ul>
  </div>
</footer>
<script src="/site.js" defer></script>
</body>
</html>`;
}

// The ultrasound probe's sector (fan) with a sound wave: the brand mark.
export function logoMark(): string {
  return `<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 5 L6.5 24 A21.3 21.3 0 0 0 25.5 24 Z" fill="currentColor" opacity=".16"/><path d="M16 5 L6.5 24 A21.3 21.3 0 0 0 25.5 24 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12.75 12.3 A8 8 0 0 0 19.25 12.3 M10.3 17.8 A14 14 0 0 0 21.7 17.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
}
