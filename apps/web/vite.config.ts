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

export default defineConfig(({ mode }) => {
  // Accept GROQ_API_KEY from apps/web/.env or the repo-root .env.
  Object.assign(process.env, loadEnv(mode, "../..", ""), loadEnv(mode, ".", ""));
  return { plugins: [react(), api()], build: { chunkSizeWarningLimit: 1000 } };
});
