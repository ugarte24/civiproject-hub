import { HardHat } from "lucide-react";
import { cn } from "@/lib/utils";

type SigocLogoProps = {
  className?: string;
  /** Tamaño del contenedor en px (default 44 = login). */
  size?: number;
  title?: string;
};

/**
 * Marca SIGOC del sistema: casco sobre accent-surface.
 * Usar en login, menú, carga y cualquier punto de marca.
 */
export function SigocLogo({ className, size = 44, title = "SIGOC" }: SigocLogoProps) {
  const iconSize = Math.max(14, Math.round(size * 0.45));
  return (
    <div
      className={cn(
        "accent-surface grid shrink-0 place-items-center rounded-md",
        className,
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-label={title}
    >
      <HardHat style={{ width: iconSize, height: iconSize }} className="shrink-0" aria-hidden />
    </div>
  );
}

type SigocBrandProps = {
  className?: string;
  logoSize?: number;
  subtitle?: string;
  titleClassName?: string;
};

/** Logo + texto SIGOC (cabeceras). */
export function SigocBrand({
  className,
  logoSize = 44,
  subtitle,
  titleClassName,
}: SigocBrandProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <SigocLogo size={logoSize} />
      <div className="min-w-0 leading-tight">
        <p
          className={cn(
            "font-display font-semibold tracking-wide text-foreground",
            titleClassName ?? "text-2xl",
          )}
        >
          SIGOC
        </p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

type LoadingScreenProps = {
  message?: string;
};

/** Pantalla de carga con la marca del sistema. */
export function LoadingScreen({ message = "Cargando…" }: LoadingScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4">
      <div className="relative">
        <SigocLogo size={72} className="rounded-xl shadow-sm" />
        <span
          className="absolute -inset-2 animate-pulse rounded-2xl border border-accent/40"
          aria-hidden
        />
      </div>
      <div className="text-center">
        <p className="font-display text-xl font-semibold tracking-wide text-foreground">SIGOC</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
