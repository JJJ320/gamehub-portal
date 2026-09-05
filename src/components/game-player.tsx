import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Loader2, Maximize2, Minimize2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Moldura padrão para jogos HTML5 internos do GameHub.
 * Mantém proporção grande, bordas do design system e evita scroll acidental.
 */

type GamePlayerProps = {
  children: ReactNode;
  className?: string;
};

export function GamePlayer({
  children,
  className,
}: GamePlayerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        document.fullscreenElement === wrapperRef.current,
      );
    };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange,
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === wrapperRef.current) {
        await document.exitFullscreen();
        return;
      }

      await wrapperRef.current?.requestFullscreen();
    } catch (error) {
      console.error("Não foi possível alternar para tela cheia:", error);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-card",
        isFullscreen
          ? "flex h-[100dvh] w-screen items-center justify-center rounded-none border-0"
          : "aspect-[4/5] sm:aspect-[16/10] lg:aspect-[16/9]",

        className,
      )}
      style={{ touchAction: "none" }}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-black",
          isFullscreen
            ? "h-full max-h-full w-auto max-w-full"
            : "size-full",
        )}
      >
        <Suspense
          fallback={
            <div className="grid size-full place-items-center gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          }
        >
          {children}
        </Suspense>
      </div>

      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute right-3 top-3 z-20 inline-flex size-10 items-center justify-center rounded-xl border border-white/20 bg-black/60 text-white shadow-lg backdrop-blur transition hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label={
          isFullscreen
            ? "Sair da tela cheia"
            : "Entrar em tela cheia"
        }
        title={
          isFullscreen
            ? "Sair da tela cheia"
            : "Tela cheia"
        }
      >
        {isFullscreen ? (
          <Minimize2 className="size-5" />
        ) : (
          <Maximize2 className="size-5" />
        )}
      </button>
    </div>
  );
}

