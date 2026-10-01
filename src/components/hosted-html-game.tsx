import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";

type HostedHtmlGameProps = {
  url: string;
  type: "html" | "zip";
  title: string;
};

function guessMime(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    html: "text/html", htm: "text/html", css: "text/css",
    js: "text/javascript", mjs: "text/javascript", json: "application/json",
    wasm: "application/wasm", png: "image/png", jpg: "image/jpeg",
    jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
    svg: "image/svg+xml", ico: "image/x-icon", mp3: "audio/mpeg",
    wav: "audio/wav", ogg: "audio/ogg", mp4: "video/mp4",
    webm: "video/webm", woff: "font/woff", woff2: "font/woff2",
    ttf: "font/ttf", otf: "font/otf",
  };
  return map[extension ?? ""] ?? "application/octet-stream";
}

function normalizePath(path: string): string {
  const parts: string[] = [];
  for (const part of path.replaceAll("\\", "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") { parts.pop(); continue; }
    parts.push(part);
  }
  return parts.join("/");
}

function resolveAsset(reference: string, fromFile: string): string | null {
  const clean = reference.trim().split("#")[0].split("?")[0];
  if (!clean || clean.startsWith("#") || /^(data:|blob:|https?:|mailto:|javascript:|tel:)/i.test(clean)) return null;
  const base = fromFile.includes("/") ? fromFile.slice(0, fromFile.lastIndexOf("/") + 1) : "";
  return normalizePath(clean.startsWith("/") ? clean.slice(1) : base + clean);
}

function isTextPath(path: string): boolean {
  return /\.(html?|css|js|mjs|json)$/i.test(path);
}

function toDataUrl(bytes: ArrayBuffer, mime: string): string {
  const view = new Uint8Array(bytes);
  let binary = "";
  for (let offset = 0; offset < view.length; offset += 0x8000) {
    binary += String.fromCharCode(...view.subarray(offset, offset + 0x8000));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

async function buildZipHtml(url: string): Promise<string> {
  const response = await fetch(url, { credentials: "omit" });
  if (!response.ok) throw new Error(`Falha ao baixar o pacote do jogo (${response.status}).`);
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const files = Object.values(zip.files).filter((file) => !file.dir);
  const fileMap = new Map<string, JSZip.JSZipObject>();
  for (const file of files) fileMap.set(normalizePath(file.name), file);

  const htmlCandidates = [...fileMap.keys()].filter((path) => /\.html?$/i.test(path));
  const entry = htmlCandidates.find((path) => path.toLowerCase() === "index.html")
    ?? htmlCandidates.find((path) => path.toLowerCase().endsWith("/index.html"))
    ?? htmlCandidates.find((path) => path.toLowerCase().endsWith("/game.html"))
    ?? htmlCandidates[0];
  if (!entry) throw new Error("O ZIP não contém nenhum arquivo HTML.");

  const assetUrls = new Map<string, string>();
  for (const [path, file] of fileMap) {
    assetUrls.set(path, toDataUrl(await file.async("arraybuffer"), guessMime(path)));
  }

  const rewriteReference = (reference: string, fromFile: string): string => {
    const resolved = resolveAsset(reference, fromFile);
    return resolved && assetUrls.has(resolved) ? assetUrls.get(resolved)! : reference;
  };

  const rewriteText = (text: string, fromFile: string): string => {
    let output = text;
    for (const assetPath of fileMap.keys()) {
      const assetUrl = assetUrls.get(assetPath);
      if (!assetUrl) continue;
      const basename = assetPath.split("/").pop() ?? assetPath;
      for (const reference of [assetPath, `./${assetPath}`, `/${assetPath}`, basename, `./${basename}`]) {
        output = output.split(`"${reference}"`).join(`"${assetUrl}"`);
        output = output.split(`'${reference}'`).join(`'${assetUrl}'`);
        output = output.split(`url(${reference})`).join(`url(${assetUrl})`);
        output = output.split(`url("${reference}")`).join(`url("${assetUrl}")`);
        output = output.split(`url('${reference}')`).join(`url('${assetUrl}')`);
      }
    }
    return output;
  };

  // Inline resource loading must work from an opaque srcdoc origin. In
  // particular, XHR cannot reliably read data: URLs and the old cache-buster
  // appended by this game's util.js corrupts those URLs.
  for (const [path, file] of fileMap) {
    if (!isTextPath(path) || path === entry) continue;
    let original = await file.async("string");
    if (path.split("/").pop()?.toLowerCase() === "util.js") {
      original = original.replace(
        /var loadTextResource\s*=\s*function\s*\(url,\s*callback\)\s*\{[\s\S]*?\n\};/,
        `var loadTextResource = function (url, callback) {
  fetch(url).then(function (response) {
    if (!response.ok) throw new Error('HTTP ' + response.status + ' on resource ' + url);
    return response.text();
  }).then(function (text) { callback(null, text); })
    .catch(function (error) { callback(error); });
};`,
      );
    }
    assetUrls.set(path, toDataUrl(new TextEncoder().encode(rewriteText(original, path)).buffer, guessMime(path)));
  }

  const htmlFile = fileMap.get(entry);
  if (!htmlFile) throw new Error("Arquivo HTML principal não encontrado.");
  let html = rewriteText(await htmlFile.async("string"), entry);

  html = html.replace(
    /(<(?:script|img|audio|video|source|iframe|embed|object)[^>]+(?:src|data)=["'])([^"']+)(["'])/gi,
    (_match, prefix, reference, suffix) => `${prefix}${rewriteReference(reference, entry)}${suffix}`,
  );
  html = html.replace(
    /(<link[^>]+href=["'])([^"']+)(["'])/gi,
    (_match, prefix, reference, suffix) => `${prefix}${rewriteReference(reference, entry)}${suffix}`,
  );
  html = html.replace(
    /(<[^>]+style=["'][^"']*)(["'])/gi,
    (match, prefix, suffix) => prefix.replace(
      /url\((['"]?)([^'")]+)\1\)/gi,
      (_urlMatch: string, quote: string, reference: string) => `url(${quote}${rewriteReference(reference, entry)}${quote})`,
    ) + suffix,
  );
  return html;
}

async function buildHtmlDocument(url: string): Promise<string> {
  const response = await fetch(url, { credentials: "omit" });
  if (!response.ok) throw new Error(`Falha ao carregar o HTML (${response.status}).`);
  let html = await response.text();
  if (!/<base\b/i.test(html)) {
    const base = new URL("./", url).href;
    html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${base}">`);
  }
  return html;
}

export function HostedHtmlGame({ url, type, title }: HostedHtmlGameProps) {
  const [srcDoc, setSrcDoc] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setSrcDoc(""); setError("");
    const load = async () => {
      try {
        const html = type === "zip" ? await buildZipHtml(url) : await buildHtmlDocument(url);
        if (!cancelled) setSrcDoc(html);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o jogo.");
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [url, type]);
  const frameTitle = useMemo(() => `${title} — GameHub`, [title]);
  if (error) return <div className="grid size-full place-items-center p-6 text-center text-sm text-muted-foreground"><div><p className="font-semibold text-foreground">Não foi possível carregar o jogo.</p><p className="mt-2">{error}</p></div></div>;
  if (!srcDoc) return <div className="grid size-full place-items-center text-sm text-muted-foreground">Carregando jogo...</div>;
  return <iframe title={frameTitle} srcDoc={srcDoc} className="size-full border-0 bg-black" allow="fullscreen; autoplay; gamepad" sandbox="allow-scripts allow-pointer-lock allow-forms allow-modals allow-popups" />;
}
