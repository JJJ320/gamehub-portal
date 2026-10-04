import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import { isLargeGameUrl, prepareLargeGameCache } from "@/lib/large-game-cache";

type HostedHtmlGameProps = {
  url: string;
  type: "html" | "zip" | "js" | "jar";
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

function optimizeSubwayIndex(text: string): string {
  const start = text.indexOf("  loadJSONResource('./tracks.json'");
  const firstBody = text.indexOf("  var speed =", start);
  if (start === -1) return text;

  const drawMarker = "  // Draw the scene repeatedly";
  const end = text.indexOf(drawMarker, start);
  if (end === -1) return text;

  const replacement = `  // The original game loads all twelve model JSON files through deeply nested
  // callbacks. That makes the GameHub data-URL loader wait for them one by one.
  // Load the local resources in parallel instead.
  var loadModelPromise = function (url) {
    return new Promise(function (resolve, reject) {
      loadJSONResource(url, function (err, result) {
        if (err) reject(err);
        else resolve(result);
      });
    });
  };

  Promise.all([
    loadModelPromise('./tracks.json'),
    loadModelPromise('./train.json'),
    loadModelPromise('./player.json'),
    loadModelPromise('./inspector.json'),
    loadModelPromise('./coin.json'),
    loadModelPromise('./roadbarrier.json'),
    loadModelPromise('./jetpack.json'),
    loadModelPromise('./boots.json'),
    loadModelPromise('./cone.json'),
    loadModelPromise('./barrel.json'),
    loadModelPromise('./mystery.json'),
    loadModelPromise('./dog.json')
  ]).then(function (models) {
    var modelTrack = models[0];
    var modelTrain = models[1];
    var modelPlayer = models[2];
    var modelInspector = models[3];
    var modelCoin = models[4];
    var modelBarrier = models[5];
    var modelJetpack = models[6];
    var modelBoot = models[7];
    var modelCone = models[8];
    var modelBarrel = models[9];
    var modelMystery = models[10];
    var modelDog = models[11];

`;

  // Keep everything from the first JSON load through the callback chain's
  // closing braces, but preserve the actual game initialization body.
  const bodyStart = text.indexOf("                          textureDog =", start);
  if (bodyStart === -1 || bodyStart > end) return text;

  return text.slice(0, start) + replacement + text.slice(bodyStart, end) + "  });\n" + text.slice(end);
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

  // Read the archive in parallel. The previous implementation awaited every
  // file one by one, which was especially expensive for a WebGL package.
  const entries = await Promise.all(
    [...fileMap.entries()].map(async ([path, file]) => [path, await file.async("arraybuffer")] as const),
  );

  const rawBytes = new Map<string, ArrayBuffer>(entries);
  const assetUrls = new Map<string, string>();
  for (const [path, bytes] of entries) {
    assetUrls.set(path, toDataUrl(bytes, guessMime(path)));
  }

  const rewriteReference = (reference: string, fromFile: string): string => {
    const resolved = resolveAsset(reference, fromFile);
    return resolved && assetUrls.has(resolved) ? assetUrls.get(resolved)! : reference;
  };

  const rewriteText = (text: string, fromFile: string): string => {
    let output = text;
    if (fromFile.split("/").pop()?.toLowerCase() === "index.js") {
      output = optimizeSubwayIndex(output);
    }

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

  for (const [path] of fileMap) {
    if (!isTextPath(path) || path === entry) continue;
    let original = new TextDecoder().decode(rawBytes.get(path)!);

    if (path.split("/").pop()?.toLowerCase() === "util.js") {
      original = original.replace(
        /var loadTextResource\s*=\s*function\s*\(url,\s*callback\)\s*\{[\s\S]*?\n\};/,
        `var loadTextResource = function (url, callback) {
  fetch(url, { cache: 'force-cache' }).then(function (response) {
    if (!response.ok) throw new Error('HTTP ' + response.status + ' on resource ' + url);
    return response.text();
  }).then(function (text) { callback(null, text); })
    .catch(function (error) { callback(error); });
};`,
      );
    }

    const rewritten = rewriteText(original, path);
    assetUrls.set(
      path,
      toDataUrl(new TextEncoder().encode(rewritten).buffer, guessMime(path)),
    );
  }

  const htmlFile = fileMap.get(entry);
  if (!htmlFile) throw new Error("Arquivo HTML principal não encontrado.");

  let html = rewriteText(new TextDecoder().decode(rawBytes.get(entry)!), entry);

  // The source archive references ../webgl.css, but that file is not included.
  // Remove the dead request and give the canvas predictable full-size styling.
  html = html.replace(
    /<link\s+[^>]*href=["']\.\.\/webgl\.css["'][^>]*>/i,
    '<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#000}canvas{display:block;width:100%;height:100%;}</style>',
  );

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

async function buildJsDocument(url: string): Promise<string> {
  const response = await fetch(url, { credentials: "omit" });
  if (!response.ok) throw new Error(`Falha ao carregar o JavaScript (${response.status}).`);
  const script = await response.text();
  const safeScript = script.replace(/<\\/script/gi, "<\\\\/script");
  const base = new URL("./", url).href;
  return `<!doctype html><html><head><meta charset="utf-8"><base href="${base}"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#000}canvas{display:block;max-width:100%;max-height:100%}</style></head><body><script>${safeScript}</script></body></html>`;
}

async function buildJarDocument(url: string, title: string): Promise<string> {
  const encodedUrl = JSON.stringify(url);
  const encodedTitle = JSON.stringify(title);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${encodedTitle} — GameHub</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#000;color:#fff;font-family:system-ui,sans-serif}#status{position:absolute;inset:0;display:grid;place-items:center;padding:24px;text-align:center}#status p{max-width:620px;line-height:1.5}</style><script src="https://cjrtnc.leaningtech.com/4.2/loader.js"></script></head><body><div id="status"><p>Carregando jogo Java...</p></div><script>
(async function () {
  const status = document.getElementById("status");
  try {
    if (typeof cheerpjInit !== "function" || typeof cheerpjRunJar !== "function") {
      throw new Error("O emulador Java não foi carregado.");
    }
    await cheerpjInit();
    status.remove();
    await cheerpjRunJar(${encodedUrl});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    status.innerHTML = "<p><strong>Não foi possível executar este JAR no navegador.</strong><br>" +
      "O arquivo pode exigir uma versão específica do Java ou recursos nativos incompatíveis.<br><br>" +
      message + "</p>";
    console.error("GameHub JAR:", error);
  }
})();
</script></body></html>`;
}

export function HostedHtmlGame({ url, type, title }: HostedHtmlGameProps) {
  const [srcDoc, setSrcDoc] = useState("");
  const [error, setError] = useState("");
  const [largeGameProgress, setLargeGameProgress] = useState<{ completed: number; total: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrcDoc("");
    setError("");

    const load = async () => {
      try {
        if (isLargeGameUrl(url)) {
          setLargeGameProgress({ completed: 0, total: Number(new URL(url, window.location.origin).searchParams.get("parts") || "0") });
          await prepareLargeGameCache(url, (progress) => {
            if (!cancelled) {
              setLargeGameProgress({ completed: progress.completed, total: progress.total });
            }
          });
          if (!cancelled) setLargeGameProgress(null);
        }

        const html = type === "zip" ? await buildZipHtml(url) : type === "js" ? await buildJsDocument(url) : type === "jar" ? await buildJarDocument(url, title) : await buildHtmlDocument(url);
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
        <div>
          <p className="font-semibold text-foreground">Não foi possível carregar o jogo.</p>
          <p className="mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!srcDoc) {
    if (largeGameProgress) {
      const percent = largeGameProgress.total > 0
        ? Math.round((largeGameProgress.completed / largeGameProgress.total) * 100)
        : 0;
      return (
        <div className="grid size-full place-items-center p-6 text-center">
          <div className="w-full max-w-md">
            <p className="text-sm font-semibold text-foreground">Preparando jogo grande...</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {largeGameProgress.completed} de {largeGameProgress.total} partes baixadas · {percent}%
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: percent + "%" }} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">As partes ficam armazenadas no cache deste navegador para as próximas partidas.</p>
          </div>
        </div>
      );
    }
    return <div className="grid size-full place-items-center text-sm text-muted-foreground">Carregando jogo...</div>;
  }

  return (
    <iframe
      title={frameTitle}
      srcDoc={srcDoc}
      className="size-full border-0 bg-black"
      allow="fullscreen; autoplay; gamepad; accelerometer; gyroscope; magnetometer"
      sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-modals allow-popups"
    />
  );
}