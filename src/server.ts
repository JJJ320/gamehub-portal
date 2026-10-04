import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import handler from "@tanstack/react-start/server-entry";

type WorkerEnv = {
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ASSETS?: { fetch(request: Request): Promise<Response> };
};

const FIREBASE_PROJECT_ID = "gamehub-portal";
const FIREBASE_DATABASE_ID = "gamehub-portal";
const FIREBASE_API_KEY = "AIzaSyA0Uy-AkpUlXFpXKar4nmdB9t7bFm__kxA";
const SUPABASE_URL = "https://zijhmkurzpdlwzvpumdd.supabase.co";
const SUPABASE_BUCKET = "gamehub-games";
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const LARGE_GAME_THRESHOLD_BYTES = 50 * 1024 * 1024;
const LARGE_GAME_CHUNK_BYTES = 20 * 1024 * 1024;
const MAX_LARGE_GAME_PARTS = 48;

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function sanitizeSegment(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 180);
}

function getBearerToken(request: Request): string {
  const authorization = request.headers.get("Authorization");
  return authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
}

async function isGameOwner(idToken: string): Promise<boolean> {
  const tokenInfo = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!tokenInfo.ok) return false;

  const tokenData = (await tokenInfo.json()) as {
    users?: Array<{ localId?: string }>;
  };
  const uid = tokenData.users?.[0]?.localId;
  if (!uid) return false;

  const ownerUrl =
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents/owners/${encodeURIComponent(uid)}?key=${FIREBASE_API_KEY}`;

  const ownerResponse = await fetch(ownerUrl, {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  return ownerResponse.ok;
}

function getStoredFilename(kind: "cover" | "hero" | "game" | "game-mobile", filename: string): string {
  if (kind === "cover") return "cover" + getExtension(filename);
  if (kind === "hero") return "hero" + getExtension(filename);
  if (kind === "game-mobile") return "game-mobile" + getExtension(filename);
  return "game" + getExtension(filename);
}

function getExtension(filename: string): string {
  const extension = filename.toLowerCase().split(".").pop() ?? "";
  return /^[a-z0-9]{1,10}$/.test(extension) ? `.${extension}` : ".bin";
}

function publicSupabaseUrl(path: string): string {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${encodedPath}`;
}

function getChunkObjectPath(slug: string, kind: "game" | "game-mobile", index: number): string {
  return "games/" + slug + "/chunks/" + kind + "/part-" + String(index).padStart(5, "0") + ".part";
}

function publicGameChunkUrl(slug: string, kind: "game" | "game-mobile", index: number): string {
  return publicSupabaseUrl(getChunkObjectPath(slug, kind, index));
}

async function uploadGameChunkToSupabase(
  request: Request,
  slug: string,
  kind: "game" | "game-mobile",
  index: number,
  serviceRoleKey: string,
): Promise<Response> {
  if (!request.body) return json({ error: "Parte ausente." }, 400);
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > LARGE_GAME_CHUNK_BYTES) {
    return json({ error: "Parte muito grande. O máximo por parte é 20 MB." }, 413);
  }

  const objectPath = getChunkObjectPath(slug, kind, index);
  const storageUrl =
    SUPABASE_URL + "/storage/v1/object/" + SUPABASE_BUCKET + "/" +
    objectPath.split("/").map(encodeURIComponent).join("/");

  const uploadResponse = await fetch(storageUrl, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + serviceRoleKey,
      apikey: serviceRoleKey,
      "Content-Type": request.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "x-upsert": "true",
    },
    body: request.body,
  });

  if (!uploadResponse.ok) {
    console.error("Supabase chunk upload failed:", await uploadResponse.text());
    return json({ error: "Falha ao enviar uma parte do jogo para o Storage." }, 502);
  }

  return json({ ok: true, index, url: publicGameChunkUrl(slug, kind, index) }, 201);
}

function parsePositiveInt(value: string | null, fallback = 0): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

async function streamLargeGameFile(
  slug: string,
  kind: "game" | "game-mobile",
  parts: number,
  filename: string,
  mime: string,
): Promise<Response> {
  if (!parts || parts > MAX_LARGE_GAME_PARTS) {
    return json({ error: "Quantidade de partes inválida. O máximo é " + MAX_LARGE_GAME_PARTS + "." }, 400);
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (let index = 0; index < parts; index += 1) {
          const response = await fetch(publicGameChunkUrl(slug, kind, index), {
            headers: { Accept: "application/octet-stream" },
          });
          if (!response.ok || !response.body) {
            throw new Error("Parte " + (index + 1) + "/" + parts + " indisponível.");
          }

          const reader = response.body.getReader();
          try {
            while (true) {
              const result = await reader.read();
              if (result.done) break;
              if (result.value) controller.enqueue(result.value);
            }
          } finally {
            reader.releaseLock();
          }
        }
        controller.close();
      } catch (error) {
        console.error("Large game stream failed:", error);
        controller.error(error);
      }
    },
  });

  const headers = new Headers({
    "Content-Type": mime || "application/octet-stream",
    "Content-Disposition": "inline; filename=\"" + filename.replace(/["\\]/g, "_") + "\"",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
    "X-GameHub-Large-Game": "1",
  });

  return new Response(stream, { status: 200, headers });
}

async function uploadToSupabase(
  request: Request,
  slug: string,
  kind: "cover" | "hero" | "game" | "game-mobile",
  filename: string,
  serviceRoleKey: string,
): Promise<Response> {
  if (!request.body) return json({ error: "Arquivo ausente." }, 400);

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_UPLOAD_BYTES) {
    return json({ error: "Arquivo muito grande. O limite atual é 50 MB." }, 413);
  }

  const objectPath = `games/${slug}/${getStoredFilename(kind, filename)}`;
  const storageUrl =
    `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${objectPath
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;

  const uploadResponse = await fetch(storageUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": request.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "x-upsert": "true",
    },
    body: request.body,
  });

  if (!uploadResponse.ok) {
    const details = await uploadResponse.text();
    console.error("Supabase upload failed:", details);
    return json({ error: "Falha ao enviar o arquivo para o Supabase Storage." }, 502);
  }

  return json({ url: publicSupabaseUrl(objectPath), key: objectPath }, 201);
}

async function deleteSupabaseObjectsWithPrefix(prefix: string, serviceRoleKey: string): Promise<void> {
  const listResponse = await fetch(
    `${SUPABASE_URL}/storage/v1/object/list/${SUPABASE_BUCKET}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefix, limit: 100, offset: 0 }),
    },
  );

  if (!listResponse.ok) {
    throw new Error("Não foi possível listar os arquivos do jogo no Supabase.");
  }

  const objects = (await listResponse.json()) as Array<{ name?: string }>;
  const paths = objects
    .map((object) => object.name?.replace(/^\/+/, ""))
    .filter((name): name is string => Boolean(name))
    .map((name) => name.startsWith(prefix) ? name : prefix + name);

  if (!paths.length) return;

  const deleteResponse = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: paths }),
    },
  );

  if (!deleteResponse.ok) {
    console.error("Supabase delete failed:", await deleteResponse.text());
    throw new Error("Não foi possível excluir os arquivos do jogo no Supabase.");
  }
}

async function deleteSupabaseGameAssets(slug: string, serviceRoleKey: string): Promise<void> {
  await deleteSupabaseObjectsWithPrefix("games/" + slug + "/", serviceRoleKey);
}

async function handleGameAsset(request: Request, env: WorkerEnv): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === "/api/owner-check") {
    if (request.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET" } });
    }

    const idToken = getBearerToken(request);
    if (!idToken) return json({ owner: false }, 401);

    return json({ owner: await isGameOwner(idToken) });
  }

  if (url.pathname === "/api/game-chunk") {
    if (request.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET" } });
    }
    const slug = sanitizeSegment(url.searchParams.get("slug") ?? "");
    const kind = url.searchParams.get("kind");
    const index = parsePositiveInt(url.searchParams.get("index"), -1);
    if (!slug || !["game", "game-mobile"].includes(kind ?? "") || index < 0) {
      return json({ error: "Parâmetros inválidos." }, 400);
    }
    const chunkUrl = publicGameChunkUrl(slug, kind as "game" | "game-mobile", index);
    const response = await fetch(chunkUrl);
    if (!response.ok) return new Response("Parte não encontrada.", { status: response.status });
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-GameHub-Chunk", String(index));
    return new Response(response.body, { status: response.status, headers });
  }

  if (url.pathname === "/api/game-file") {
    if (request.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET" } });
    }
    const slug = sanitizeSegment(url.searchParams.get("slug") ?? "");
    const kind = url.searchParams.get("kind");
    const parts = parsePositiveInt(url.searchParams.get("parts"), 0);
    const filename = sanitizeSegment(url.searchParams.get("filename") ?? "game.bin");
    const mime = url.searchParams.get("mime") ?? "application/octet-stream";
    if (!slug || !["game", "game-mobile"].includes(kind ?? "") || !parts) {
      return json({ error: "Arquivo grande inválido." }, 400);
    }
    return streamLargeGameFile(slug, kind as "game" | "game-mobile", parts, filename, mime);
  }

  if (url.pathname === "/api/game-upload") {
    if (request.method !== "PUT") {
      return new Response("Method Not Allowed", { status: 405, headers: { Allow: "PUT" } });
    }

    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Supabase Storage não está configurado no Worker." }, 503);
    }

    const idToken = getBearerToken(request);
    if (!idToken || !(await isGameOwner(idToken))) {
      return json({ error: "Apenas contas de dono podem enviar arquivos." }, 403);
    }

    const slug = sanitizeSegment(url.searchParams.get("slug") ?? "");
    const kind = url.searchParams.get("kind");
    const filename = sanitizeSegment(url.searchParams.get("filename") ?? "game.bin");
    const chunkIndex = url.searchParams.get("chunkIndex");
    const totalParts = url.searchParams.get("totalParts");

    if (!slug || !["cover", "hero", "game", "game-mobile"].includes(kind ?? "")) {
      return json({ error: "Slug inválido." }, 400);
    }

    if ((kind === "game" || kind === "game-mobile") && chunkIndex !== null) {
      const index = parsePositiveInt(chunkIndex, -1);
      const parts = parsePositiveInt(totalParts, 0);
      const reset = url.searchParams.get("reset") === "1";
      if (index === 0 && reset) {
        await deleteSupabaseObjectsWithPrefix(
          "games/" + slug + "/chunks/" + kind + "/",
          env.SUPABASE_SERVICE_ROLE_KEY,
        );
      }
      if (index < 0 || !parts || parts > MAX_LARGE_GAME_PARTS || index >= parts) {
        return json({ error: "Informações de partes inválidas." }, 400);
      }
      return uploadGameChunkToSupabase(
        request,
        slug,
        kind as "game" | "game-mobile",
        index,
        env.SUPABASE_SERVICE_ROLE_KEY,
      );
    }

    return uploadToSupabase(
      request,
      slug,
      kind as "cover" | "hero" | "game" | "game-mobile",
      filename,
      env.SUPABASE_SERVICE_ROLE_KEY,
    );
  }

  if (url.pathname === "/api/game-assets") {
    if (request.method !== "DELETE") {
      return new Response("Method Not Allowed", { status: 405, headers: { Allow: "DELETE" } });
    }

    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Supabase Storage não está configurado no Worker." }, 503);
    }

    const idToken = getBearerToken(request);
    if (!idToken || !(await isGameOwner(idToken))) {
      return json({ error: "Apenas contas de dono podem excluir arquivos." }, 403);
    }

    const slug = sanitizeSegment(url.searchParams.get("slug") ?? "");
    if (!slug) return json({ error: "Slug inválido." }, 400);

    try {
      await deleteSupabaseGameAssets(slug, env.SUPABASE_SERVICE_ROLE_KEY);
      return json({ ok: true });
    } catch (error) {
      console.error(error);
      return json({ error: "Falha ao excluir os arquivos do jogo." }, 502);
    }
  }

  return null;
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: unknown) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/googlee3f4f8287dc580ce.html") {
        return new Response("google-site-verification: googlee3f4f8287dc580ce.html", {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600" },
        });
      }

      const assetResponse = await handleGameAsset(request, env);
      if (assetResponse) return assetResponse;

      if (env.ASSETS) {
        const staticResponse = await env.ASSETS.fetch(request);
        if (staticResponse.status !== 404) return staticResponse;

        if (url.pathname.startsWith("/assets/")) {
          const filename = url.pathname.slice("/assets/".length);
          if (filename && !filename.includes("/")) {
            const fallbackUrl = new URL(request.url);
            fallbackUrl.pathname = `/${filename}`;
            const fallbackResponse = await env.ASSETS.fetch(new Request(fallbackUrl, request));
            if (fallbackResponse.status !== 404) return fallbackResponse;
          }
        }
      }

      const response = await handler.fetch(request);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      const contentType = normalized.headers.get("content-type") ?? "";
      if (contentType.toLowerCase().startsWith("text/html") && !contentType.toLowerCase().includes("charset=")) {
        const headers = new Headers(normalized.headers);
        headers.set("content-type", "text/html; charset=utf-8");
        return new Response(normalized.body, {
          status: normalized.status,
          statusText: normalized.statusText,
          headers,
        });
      }
      return normalized;    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};