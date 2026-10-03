import { cp, mkdir, rm, copyFile, readdir } from "node:fs/promises";

const root = process.cwd();
const distServer = `${root}/dist/server`;
const distClient = `${root}/dist/client`;
const pagesPublic = `${root}/.output/public`;
const pagesAssets = `${pagesPublic}/assets`;

await rm(pagesPublic, { recursive: true, force: true });
await mkdir(pagesAssets, { recursive: true });
await copyFile(`${distServer}/index.js`, `${pagesPublic}/_worker.js`);
await cp(`${distServer}/assets`, pagesAssets, { recursive: true });
await cp(`${distClient}/assets`, pagesAssets, { recursive: true, force: true });

for (const filename of await readdir(`${distClient}/assets`)) {
  if (filename.endsWith(".css")) {
    await copyFile(`${distClient}/assets/${filename}`, `${pagesPublic}/${filename}`);
  }
}

console.log("Pages SSR output preparado com assets do SSR + client e fallback de CSS");
