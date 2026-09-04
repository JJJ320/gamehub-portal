import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Moldura padrão para jogos HTML5 internos do GameHub.
 * Mantém proporção grande, bordas do design system e evita scroll acidental.
 */
export function GamePlayer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-card",
        "aspect-[4/5] sm:aspect-[16/10] lg:aspect-[16/9]",
        className,
      )}
      style={{ touchAction: "none" }}
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
  );
}
