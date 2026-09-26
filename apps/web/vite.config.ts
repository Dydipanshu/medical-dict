import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { GET, POST } from "./api/transcribe.ts";
import { sendWebResponse, toWebRequest } from "./server.ts";

// Serves /api/transcribe during `vite dev` with the same handler as production.
function api(): Plugin {
  return {
    name: "api",
    configureServer(server) {
      server.middlewares.use("/api/transcribe", async (req, res) => {
        const handler = req.method === "POST" ? POST : GET;
        await sendWebResponse(res, await handler(await toWebRequest(req)));
      });
    },
  };
}

// The marketing site (landing, report formats, privacy) is generated as static
// HTML from site/pages.ts: emitted as files at build, rendered per request in dev.
function site(): Plugin {
  type SiteModule = typeof import("./site/pages.ts");
  const files = (m: SiteModule) => {
    const out = new Map(m.sitePages());
    out.set("sitemap.xml", m.sitemap());
    out.set("robots.txt", m.robots());
    return out;
  };
  return {
    name: "site",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url ?? "/").split(/[?#]/)[0];
        // Match vercel.json: /app serves the app like /app/.
        if (path === "/app") req.url = "/app/" + (req.url ?? "").slice(4);
        if (path.startsWith("/app") || path.startsWith("/@") || path.startsWith("/src/") || path.startsWith("/node_modules/")) return next();
        const m = (await server.ssrLoadModule("/site/pages.ts")) as SiteModule;
        const all = files(m);
        const key = path === "/" ? "index.html" : path.slice(1).replace(/\/$/, "");
        const body = all.get(key) ?? all.get(`${key}.html`);
        if (body === undefined) return next();
        res.setHeader("content-type", key.endsWith(".xml") ? "application/xml" : key.endsWith(".txt") ? "text/plain" : "text/html; charset=utf-8");
        res.end(body);
      });
    },
    async generateBundle() {
      const m = (await import("./site/pages.ts")) as SiteModule;
      for (const [fileName, source] of files(m)) this.emitFile({ type: "asset", fileName, source });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Accept GROQ_API_KEY / SITE_URL from apps/web/.env or the repo-root .env.
  Object.assign(process.env, loadEnv(mode, "../..", ""), loadEnv(mode, ".", ""));
  return {
    appType: "mpa",
    plugins: [react(), api(), site()],
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: { input: { app: "app/index.html" } },
    },
  };
});
