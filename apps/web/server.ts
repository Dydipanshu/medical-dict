// Production server: serves the built app from dist/ plus /api/transcribe.
// Usage: npm run build && GROQ_API_KEY=... npm start
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { GET, POST } from "./api/transcribe.ts";

const DIST = join(fileURLToPath(new URL(".", import.meta.url)), "dist");
const PORT = Number(process.env.PORT ?? 3000);
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

loadDotEnv();

export async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
  if (!headers.has("x-forwarded-for") && req.socket.remoteAddress) headers.set("x-forwarded-for", req.socket.remoteAddress);
  return new Request(`http://localhost${req.url}`, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks),
  });
}

export async function sendWebResponse(res: ServerResponse, r: Response) {
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}

async function serveStatic(url: string, res: ServerResponse) {
  const path = normalize(decodeURIComponent(url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  let file = join(DIST, path);
  if (!file.startsWith(DIST) || !(await stat(file).catch(() => null))?.isFile()) file = join(DIST, "index.html");
  const body = await readFile(file);
  const immutable = file.includes(`${DIST}/assets/`);
  res.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
  });
  res.end(body);
}

function loadDotEnv() {
  for (const dir of [".", "../.."]) {
    try {
      process.loadEnvFile(join(fileURLToPath(new URL(dir, import.meta.url)), ".env"));
    } catch {
      /* no .env there */
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer(async (req, res) => {
    try {
      if (req.url?.startsWith("/api/transcribe")) {
        const handler = req.method === "POST" ? POST : GET;
        return await sendWebResponse(res, await handler(await toWebRequest(req)));
      }
      await serveStatic(req.url ?? "/", res);
    } catch (e) {
      console.error(e);
      res.writeHead(500).end("Internal error");
    }
  }).listen(PORT, () => console.log(`SonoScribe on http://localhost:${PORT}`));
}
