import { cn } from "@/lib/utils";

type SigocLogoProps = {
  className?: string;
  size?: number;
  /** Con fondo amber (icono completo). Sin fondo solo el casco no aplica: siempre el asset. */
  title?: string;
};

/** Logo oficial SIGOC para pantalla de carga e iconos de app (/favicon.svg). */
export function SigocLogo({ className, size = 40, title = "SIGOC" }: SigocLogoProps) {
  return (
    <img
      src="/favicon.svg"
      alt={title}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-md", className)}
      draggable={false}
    />
  );
}

type LoadingScreenProps = {
  message?: string;
};

/** Pantalla de carga con logo de marca. */
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
