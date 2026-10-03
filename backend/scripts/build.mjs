import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { build } from "esbuild";

const backendRoot = fileURLToPath(new URL("..", import.meta.url));
const frontendRoot = path.resolve(backendRoot, "../frontend");
const outputRoot = path.join(backendRoot, "dist");

await rm(outputRoot, { force: true, recursive: true });
await mkdir(outputRoot, { recursive: true });
await build({
  bundle: true,
  entryPoints: [path.join(backendRoot, "index.ts")],
  format: "esm",
  outfile: path.join(outputRoot, "index.js"),
  packages: "external",
  platform: "node",
  sourcemap: true,
  target: "node22",
});
await cp(path.join(frontendRoot, "dist"), path.join(outputRoot, "public"), { recursive: true });
