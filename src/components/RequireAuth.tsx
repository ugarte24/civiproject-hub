import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { LoadingScreen } from "@/components/SigocLogo";
import { PlanVencido } from "@/components/PlanVencido";

/** Rutas permitidas al SuperAdmin de plataforma (no opera obra). */
const SUPERADMIN_PATHS = new Set(["/admin"]);

/** Protege rutas: sesión + suscripción vigente (SuperAdmin siempre pasa). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, profile, subscription, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) {
      void navigate({ to: "/login" });
    }
  }, [loading, session, navigate]);

  useEffect(() => {
    if (loading || !session || !isSuperAdmin) return;
    if (!SUPERADMIN_PATHS.has(pathname)) {
      void navigate({ to: "/admin" });
    }
  }, [loading, session, isSuperAdmin, pathname, navigate]);

  // Solo bloquear en la carga INICIAL (aún no hay perfil).
  // Tras eso, ni en desktop ni en móvil un refresh de token debe desmontar
  // diálogos, selectores de archivo ni formularios.
  if (!profile && (loading || subscription.loading || Boolean(session))) {
    return <LoadingScreen message="Cargando sesión…" />;
  }

  if (!session) {
    // Redirigiendo a /login: no dejar un frame vacío / contenido residual
    return <LoadingScreen message="Redirigiendo…" />;
  }

  // SuperAdmin puede entrar a /admin aunque no tenga suscripción de cliente
  if (!subscription.vigente && !isSuperAdmin) {
    return <PlanVencido />;
  }

  if (isSuperAdmin && !SUPERADMIN_PATHS.has(pathname)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Redirigiendo al panel SaaS…</p>
      </div>
    );
  }

  return <>{children}</>;
}
