import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Loader2, Maximize2, Minimize2 } from "lucide-react";

import { cn } from "@/lib/utils";

type GamePlayerProps = {
  children: ReactNode;
  className?: string;
};

export function GamePlayer({ children, className }: GamePlayerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Keep keyboard input directed at the active game surface. Browsers normally
  // focus an iframe on click, but this is inconsistent for canvas-based games.
  const focusGameSurface = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement instanceof HTMLSelectElement ||
      (activeElement instanceof HTMLElement && activeElement.isContentEditable)
    ) {
      return;
    }

    const frame = wrapper.querySelector("iframe");
    if (frame) {
      frame.focus({ preventScroll: true });
      return;
    }

    const canvas = wrapper.querySelector("canvas");
    if (canvas) {
      if (!canvas.hasAttribute("tabindex")) canvas.tabIndex = 0;
      canvas.focus({ preventScroll: true });
      return;
    }

    // Some React games listen on the document/window rather than a canvas.
    wrapper.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreen = document.fullscreenElement === wrapperRef.current;
      setIsFullscreen(fullscreen);
      if (fullscreen) {
        // Wait until the browser finishes changing fullscreen layout before
        // restoring focus to the game. Do not intercept F11 or Escape.
        window.requestAnimationFrame(focusGameSurface);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [focusGameSurface]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Do not steal focus from the GameHub fullscreen/exit button.
    if ((event.target as HTMLElement).closest("button")) return;
    // Focus after the pointer interaction has reached the actual game surface.
    window.requestAnimationFrame(focusGameSurface);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === wrapperRef.current) {
        await document.exitFullscreen();
        return;
      }

      await wrapperRef.current?.requestFullscreen();
      window.requestAnimationFrame(focusGameSurface);
    } catch (error) {
      console.error("Não foi possível alternar para tela cheia:", error);
    }
  };

  return (
    <div
      ref={wrapperRef}
      tabIndex={-1}
      onPointerDown={handlePointerDown}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-card",
        isFullscreen
          ? "h-[100dvh] w-screen rounded-none border-0 bg-black"
          : "aspect-[4/5] sm:aspect-[16/10] lg:aspect-[16/9]",
        className,
      )}
      style={{ touchAction: "none" }}
    >
      <div
        className={cn(
          "relative size-full overflow-hidden bg-black",
          isFullscreen && "flex items-center justify-center",
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
        aria-label={isFullscreen ? "Sair da tela cheia" : "Entrar em tela cheia"}
        title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
      >
        {isFullscreen ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
      </button>
    </div>
  );
}
