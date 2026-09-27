import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type WorkerEnv = {
  GAMEHUB_GAMES?: R2Bucket;
};

const FIREBASE_PROJECT_ID = "gamehub-portal";
const FIREBASE_DATABASE_ID = "gamehub-portal";
const FIREBASE_API_KEY = "AIzaSyA0Uy-AkpUlXFpXKar4nmdB9t7bFm__kxA";

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

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

async function isGameOwner(idToken: string): Promise<boolean> {
  const verifyUrl =
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents/owners?key=${FIREBASE_API_KEY}`;

  const tokenInfo = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup", {
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

  const ownerUrl = `${verifyUrl}/${encodeURIComponent(uid)}`;
  const ownerResponse = await fetch(ownerUrl, {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  return ownerResponse.ok;
}

async function handleGameAsset(request: Request, env: WorkerEnv): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/game-upload")) {
    if (request.method !== "PUT") {
      return new Response("Method Not Allowed", { status: 405, headers: { Allow: "PUT" } });
    }

    if (!env.GAMEHUB_GAMES) {
      return json({ error: "R2 não está configurado no Worker." }, 503);
    }

    const authorization = request.headers.get("Authorization");
    const idToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : "";

    if (!idToken || !(await isGameOwner(idToken))) {
      return json({ error: "Apenas contas de dono podem enviar jogos." }, 403);
    }

    if (!request.body) {
      return json({ error: "Arquivo ausente." }, 400);
    }

    const slug = sanitizeSegment(url.searchParams.get("slug") ?? "");
    const filename = sanitizeSegment(url.searchParams.get("filename") ?? "game.zip");

    if (!slug || !filename) {
      return json({ error: "Slug ou nome de arquivo inválido." }, 400);
    }

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    const maxBytes = 100 * 1024 * 1024;
    if (contentLength > maxBytes) {
      return json({ error: "Arquivo muito grande. O limite atual é 100 MB." }, 413);
    }

    const key = `games/${slug}/${filename}`;
    await env.GAMEHUB_GAMES.put(key, request.body, {
      httpMetadata: {
        contentType: request.headers.get("content-type") || "application/octet-stream",
        contentDisposition: "inline",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    return json({
      url: `${url.origin}/game-assets/${encodeURIComponent(slug)}/${encodeURIComponent(filename)}`,
      key,
    }, 201);
  }

  if (url.pathname.startsWith("/game-assets/")) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    if (!env.GAMEHUB_GAMES) {
      return new Response("R2 não está configurado no Worker.", { status: 503 });
    }

    const key = decodeURIComponent(url.pathname.slice("/game-assets/".length));
    if (!key || key.includes("..")) {
      return new Response("Arquivo inválido.", { status: 400 });
    }

    const object = await env.GAMEHUB_GAMES.get(key);
    if (!object) {
      return new Response("Arquivo não encontrado.", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    headers.set("access-control-allow-origin", "*");

    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }

    return new Response(object.body, { status: 200, headers });
  }

  return null;
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: unknown) {
    try {
      const assetResponse = await handleGameAsset(request, env);
      if (assetResponse) return assetResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
