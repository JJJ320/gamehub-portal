import { cp, mkdir, rm, copyFile, readdir, access } from "node:fs/promises";

const root = process.cwd();
const distServer = `${root}/dist/server`;
const distClient = `${root}/dist/client`;
const publicDir = `${root}/public`;
const pagesPublic = `${root}/.output/public`;
const pagesAssets = `${pagesPublic}/assets`;

await rm(pagesPublic, { recursive: true, force: true });
await mkdir(pagesAssets, { recursive: true });

try {
  await access(publicDir);
  await cp(publicDir, pagesPublic, { recursive: true, force: true });
} catch {
  // O projeto pode não ter uma pasta public.
}

await copyFile(`${distServer}/index.js`, `${pagesPublic}/_worker.js`);
await cp(`${distServer}/assets`, pagesAssets, { recursive: true });
await cp(`${distClient}/assets`, pagesAssets, { recursive: true, force: true });

for (const filename of await readdir(`${distClient}/assets`)) {
  if (filename.endsWith(".css")) {
    await copyFile(`${distClient}/assets/${filename}`, `${pagesPublic}/${filename}`);
  }
}

const deployRedirect = `${root}/.wrangler/deploy/config.json`;
await rm(deployRedirect, { force: true });

console.log("Pages SSR output preparado com assets do SSR + client e arquivos public");
