import { cp, mkdir } from "node:fs/promises";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const docsRoot = path.join(root, "apps/docs");
const publicDir = path.join(docsRoot, "public");
const distDir = path.join(docsRoot, "dist");

await mkdir(distDir, { recursive: true });
await cp(publicDir, distDir, { recursive: true });

await build({
  entryPoints: [path.join(docsRoot, "src/setup-wizard.ts")],
  bundle: true,
  format: "esm",
  outfile: path.join(distDir, "assets/setup-wizard.js"),
  target: "es2020",
});
