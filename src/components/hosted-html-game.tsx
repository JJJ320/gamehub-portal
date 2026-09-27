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
    html: "text/html", htm: "text/html", css: "text/css", js: "text/javascript", mjs: "text/javascript",
    json: "application/json", wasm: "application/wasm", png: "image/png", jpg: "image/jpeg",
    jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", mp4: "video/mp4", webm: "video/webm",
    ico: "image/x-icon", woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf",
  };
  return map[extension ?? ""] ?? "application/octet-stream";
}

function normalizePath(path: string): string {
  const parts: string[] = [];
  for (const part of path.replaceAll("\\", "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}

function resolveAsset(reference: string, fromFile: string): string | null {
  const clean = reference.split("#")[0].split("?")[0].trim();
  if (!clean || clean.startsWith("#") || clean.startsWith("data:") || clean.startsWith("blob:")) return null;
  if (/^(https?:|mailto:|javascript:|tel:)/i.test(clean)) return null;
  const base = fromFile.includes("/") ? fromFile.slice(0, fromFile.lastIndexOf("/") + 1) : "";
  return normalizePath(clean.startsWith("/") ? clean.slice(1) : base + clean);
}

async function buildZipHtml(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao baixar o pacote do jogo (${response.status}).`);

  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const files = Object.values(zip.files).filter((file) => !file.dir);
  const fileMap = new Map<string, JSZip.JSZipObject>();

  for (const file of files) fileMap.set(normalizePath(file.name), file);

  const htmlCandidates = [...fileMap.keys()].filter((path) => /\.html?$/i.test(path));
  const entry =
    htmlCandidates.find((path) => path.toLowerCase() === "index.html") ??
    htmlCandidates.find((path) => path.toLowerCase().endsWith("/index.html")) ??
    htmlCandidates.find((path) => path.toLowerCase().endsWith("/game.html")) ??
    htmlCandidates[0];

  if (!entry) throw new Error("O ZIP não contém nenhum arquivo HTML.");

  const blobUrls = new Map<string, string>();
  for (const [path, file] of fileMap) {
    const data = await file.async("blob");
    blobUrls.set(path, URL.createObjectURL(new Blob([data], { type: guessMime(path) })));
  }

  const htmlFile = fileMap.get(entry);
  if (!htmlFile) throw new Error("Arquivo HTML principal não encontrado.");
  let html = await htmlFile.async("string");

  const rewrite = (reference: string) => {
    const resolved = resolveAsset(reference, entry);
    return resolved && blobUrls.has(resolved) ? blobUrls.get(resolved)! : reference;
  };

  html = html.replace(
    /(<(?:script|img|audio|video|source|iframe|embed|object)[^>]+(?:src|data)=["'])([^"']+)(["'])/gi,
    (_match, prefix, reference, suffix) => `${prefix}${rewrite(reference)}${suffix}`,
  );
  html = html.replace(
    /(<link[^>]+href=["'])([^"']+)(["'])/gi,
    (_match, prefix, reference, suffix) => ${prefix}${rewrite(reference)}${suffix},
  );
  html = html.replace(
    /(<[^>]+style=["'][^"']*)(["'])/gi,
    (match, prefix, suffix) => {
      const rewritten = prefix.replace(
        /url\((['"]?)([^'")]+)\1\)/gi,
        (_urlMatch: string, quote: string, reference: string) => `url(${quote}${rewrite(reference)}${quote})`,
      );
      return rewritten + suffix;
    },
  );

  return html;
}

export function HostedHtmlGame({ url, type, title }: HostedHtmlGameProps) {
  const [srcDoc, setSrcDoc] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setSrcDoc("");
    setError("");

    const load = async () => {
      try {
        let html: string;
        if (type === "zip") {
          html = await buildZipHtml(url);
        } else {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Falha ao carregar o HTML (${response.status}).`);
          html = await response.text();
          if (!/<base\b/i.test(html)) {
            const base = new URL("./", url).href;
            html = html.replace(/<head([^>]*)>/i, `<head${1}><base href="${base}">`);
          }
        }
        if (!cancelled) setSrcDoc(html);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o jogo.");
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [url, type]);

  const frameTitle = useMemo(() => `${title} — GameHub`, [title]);

  if (error) {
    return (
      <div className="grid size-full place-items-center p-6 text-center text-sm text-muted-foreground">
        <div><p className="font-semibold text-foreground">Não foi possível carregar o jogo.</p><p className="mt-2">{error}</p></div>
      </div>
    );
  }

  if (!srcDoc) return <div className="grid size-full place-items-center text-sm text-muted-foreground">Carregando jogo...</div>;

  return <iframe title={frameTitle} srcDoc={srcDoc} className="size-full border-0 bg-black" allow="fullscreen; autoplay; gamepad" />;
}