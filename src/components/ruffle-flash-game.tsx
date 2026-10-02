import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

type Props = {
  url: string;
  title: string;
};

declare global {
  interface Window {
    RufflePlayer?: {
      newest(): {
        createPlayer(): HTMLElement & {
          load(options: string | { url: string }): Promise<void>;
        };
      } | null;
    };
  }
}

let ruffleLoadPromise: Promise<void> | null = null;

function loadRuffle(): Promise<void> {
  if (window.RufflePlayer?.newest()) return Promise.resolve();
  if (ruffleLoadPromise) return ruffleLoadPromise;

  ruffleLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-gamehub-ruffle="true"]',
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Falha ao carregar o Ruffle.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "/ruffle/ruffle.js";
    script.async = true;
    script.dataset.gamehubRuffle = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar o Ruffle."));
    document.head.appendChild(script);
  });

  return ruffleLoadPromise;
}

export function RuffleFlashGame({ url, title }: Props) {
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    let player: HTMLElement | null = null;

    const start = async () => {
      try {
        setError("");
        setLoading(true);

        await loadRuffle();

        if (disposed || !playerHostRef.current) return;

        const source = window.RufflePlayer?.newest();
        if (!source) {
          throw new Error("RufflePlayer não foi registrado na página.");
        }

        player = source.createPlayer();
        player.style.width = "100%";
        player.style.height = "100%";
        player.setAttribute("aria-label", title);
        player.setAttribute("allowfullscreen", "true");

        playerHostRef.current.replaceChildren(player);

        await (player as HTMLElement & {
          load(options: string | { url: string }): Promise<void>;
        }).load(url);

        if (!disposed) setLoading(false);
      } catch (cause) {
        console.error("Falha ao iniciar o Ruffle:", cause);
        player?.remove();
        if (!disposed) {
          setLoading(false);
          setError(
            "Não foi possível carregar este jogo Flash. Verifique se o arquivo SWF é compatível.",
          );
        }
      }
    };

    void start();

    return () => {
      disposed = true;
      player?.remove();
      if (playerHostRef.current) playerHostRef.current.replaceChildren();
    };
  }, [url, title]);

  return (
    <div className="relative size-full bg-black">
      <div ref={playerHostRef} className="size-full" />

      {loading && !error && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center gap-2 text-white/70">
          <Loader2 className="size-6 animate-spin" />
          <span className="text-xs">Carregando Flash...</span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white">
          {error}
        </div>
      )}
    </div>
  );
}
