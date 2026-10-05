import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = path.join(root, "api");

const excluded = new Map([
  ["server/create-activation-code.mjs", "exécute une commande et ouvre une connexion DB à l'import"],
  ["server/migrate.mjs", "exécute la migration DB à l'import"],
]);

async function collectJs(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectJs(fullPath));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(fullPath);
  }
  return files;
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

async function main() {
  const files = (await collectJs(apiRoot)).sort();
  let failed = false;

  for (const file of files) {
    try {
      await import(pathToFileURL(file).href);
    } catch (error) {
      failed = true;
      console.error(`ERREUR ${relative(file)}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`${files.length} modules chargés`);
  for (const [file, reason] of excluded) {
    console.log(`Exclus: ${file} — ${reason}`);
  }

  if (failed) process.exitCode = 1;
}

await main();
