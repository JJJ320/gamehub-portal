import { cp, mkdir, rm, copyFile } from "node:fs/promises";

const root = process.cwd();
const distServer = `${root}/dist/server`;
const pagesPublic = `${root}/.output/public`;

await rm(pagesPublic, { recursive: true, force: true });
await mkdir(pagesPublic, { recursive: true });
await copyFile(`${distServer}/index.js`, `${pagesPublic}/_worker.js`);
await cp(`${distServer}/assets`, `${pagesPublic}/assets`, { recursive: true });
console.log("Pages SSR output preparado em .output/public");
