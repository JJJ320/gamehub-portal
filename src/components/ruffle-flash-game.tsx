import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

type Props = { url: string; title: string };

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

export function RuffleFlashGame({ url, title }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    let player: HTMLElement | null = null;

    const start = async () => {
      try {
        setError("");
        setLoading(true);

        // @ruffle-rs/ruffle is the self-hosted web package. It registers
        // the public API on window instead of exporting RufflePlayer as ESM.
        await import("@ruffle-rs/ruffle/ruffle.js");

        if (disposed || !containerRef.current) return;

        const source = window.RufflePlayer?.newest();
        if (!source) {
          throw new Error("RufflePlayer não foi registrado na página.");
        }

        player = source.createPlayer();
        player.style.width = "100%";
        player.style.height = "100%";
        player.setAttribute("aria-label", title);
        player.setAttribute("allowfullscreen", "true");
        containerRef.current.replaceChildren(player);

        await player.load(url);

        if (!disposed) setLoading(false);
      } catch (cause) {
        console.error("Falha ao iniciar o Ruffle:", cause);
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
    };
  }, [url, title]);

  return (
    <div ref={containerRef} className="relative size-full bg-black">
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
