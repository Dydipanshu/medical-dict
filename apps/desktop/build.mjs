// Bundles the main process, preload and the two renderer pages with esbuild.
import { build } from "esbuild";
import { cpSync, mkdirSync } from "node:fs";

mkdirSync("out", { recursive: true });
const common = { bundle: true, sourcemap: true, logLevel: "info", target: "es2022" };
await Promise.all([
  build({ ...common, entryPoints: ["src/main.ts"], outfile: "out/main.cjs", platform: "node", format: "cjs", external: ["electron"] }),
  build({ ...common, entryPoints: ["src/preload.ts"], outfile: "out/preload.cjs", platform: "node", format: "cjs", external: ["electron"] }),
  build({ ...common, entryPoints: ["src/overlay.ts", "src/settings.ts"], outdir: "out", platform: "browser", format: "iife" }),
]);
for (const f of ["overlay.html", "settings.html", "ui.css"]) cpSync(`src/${f}`, `out/${f}`);
cpSync("assets", "out/assets", { recursive: true });
