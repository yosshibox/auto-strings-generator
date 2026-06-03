import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const runDir = join(projectRoot, ".ableton-run");

rmSync(runDir, { recursive: true, force: true });
mkdirSync(join(runDir, "dist"), { recursive: true });

copyFileSync(join(projectRoot, "manifest.json"), join(runDir, "manifest.json"));
copyFileSync(join(projectRoot, "dist", "extension.js"), join(runDir, "dist", "extension.js"));
copyFileSync(join(projectRoot, "dist", "extension.js.map"), join(runDir, "dist", "extension.js.map"));

writeFileSync(
  join(runDir, "package.json"),
  `${JSON.stringify(
    {
      name: "auto-strings-generator-run",
      version: "0.1.0",
      type: "commonjs",
    },
    null,
    2,
  )}\n`,
);

console.log(`Prepared Ableton run directory: ${runDir}`);
