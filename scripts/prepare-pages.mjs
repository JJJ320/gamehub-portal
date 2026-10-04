import { cp, mkdir, rm, copyFile, readdir, access } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const distServer = join(root, "dist/server");
const distClient = join(root, "dist/client");
const publicDir = join(root, "public");
const pagesPublic = join(root, ".output/public");
const pagesAssets = join(pagesPublic, "assets");

await rm(pagesPublic, { recursive: true, force: true });
await mkdir(pagesAssets, { recursive: true });

try {
  await access(publicDir);
  await cp(publicDir, pagesPublic, { recursive: true, force: true });
} catch {
  // O projeto pode não ter uma pasta public.
}

// O TanStack Start/Vite atual gera dist/server/server.js.
// Mantemos index.js como fallback para versões/configurações anteriores.
const serverCandidates = ["server.js", "index.js"];
let serverEntry = null;

for (const filename of serverCandidates) {
  try {
    await access(join(distServer, filename));
    serverEntry = filename;
    break;
  } catch {
    // Tenta o próximo nome.
  }
}

if (!serverEntry) {
  throw new Error(
    `Bundle SSR não encontrado em ${distServer}. Esperado: ${serverCandidates.join(", ")}.`,
  );
}

await copyFile(join(distServer, serverEntry), join(pagesPublic, "_worker.js"));
await cp(join(distServer, "assets"), pagesAssets, {
  recursive: true,
  force: true,
});
await cp(join(distClient, "assets"), pagesAssets, {
  recursive: true,
  force: true,
});

for (const filename of await readdir(join(distClient, "assets"))) {
  if (filename.endsWith(".css")) {
    await copyFile(
      join(distClient, "assets", filename),
      join(pagesPublic, filename),
    );
  }
}

const deployRedirect = join(root, ".wrangler/deploy/config.json");
await rm(deployRedirect, { force: true });

console.log(
  `Pages SSR output preparado usando dist/server/${serverEntry}, com assets do SSR + client e arquivos public`,
);
