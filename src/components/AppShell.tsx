import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderKanban,
  Wallet,
  Calculator,
  FileText,
  Camera,
  CalendarRange,
  Layers,
  BarChart3,
  Users,
  Settings,
  Menu,
  LogOut,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setDefaultCurrency, usePermisos } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import {
  SuperAdminProfileDialog,
  SuperAdminProfileTrigger,
} from "@/components/SuperAdminProfileButton";
import { getAppFooterLabel } from "@/lib/app-version";
import { SigocLogo } from "@/components/SigocLogo";
import { useConfigEmpresa } from "@/lib/obra/hooks";

function CurrencySync() {
  const { data: config } = useConfigEmpresa();
  useEffect(() => {
    if (config?.moneda) setDefaultCurrency(config.moneda);
  }, [config?.moneda]);
  return null;
}

const nav = [
  { key: "dashboard", to: "/", label: "Dashboard", icon: LayoutDashboard },
  { key: "proyectos", to: "/proyectos", label: "Proyectos", icon: FolderKanban },
  { key: "presupuesto", to: "/presupuesto", label: "Presupuesto", icon: Wallet },
  { key: "contabilidad", to: "/contabilidad", label: "Contabilidad", icon: Calculator },
  { key: "documentos", to: "/documentos", label: "Documentos", icon: FileText },
  { key: "fotografias", to: "/fotografias", label: "Fotografías", icon: Camera },
  { key: "cronograma", to: "/cronograma", label: "Cronograma", icon: CalendarRange },
  { key: "apu", to: "/apu", label: "APU", icon: Layers },
  { key: "reportes", to: "/reportes", label: "Reportes", icon: BarChart3 },
  { key: "usuarios", to: "/usuarios", label: "Usuarios", icon: Users },
  { key: "configuracion", to: "/configuracion", label: "Configuración", icon: Settings },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { puedeVer } = usePermisos();
  const { isSuperAdmin } = useAuth();

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {isSuperAdmin ? (
        <Link
          to="/admin"
          onClick={onNavigate}
          className={cn(
            "group flex min-w-0 items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-semibold transition-all",
            pathname === "/admin"
              ? "border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground"
              : "border-sidebar-primary/50 text-sidebar-primary hover:bg-sidebar-accent/60",
          )}
        >
          <Shield className="size-4 shrink-0" />
          <span className="truncate">Panel SaaS</span>
        </Link>
      ) : (
        nav
          .filter((item) => puedeVer(item.key))
          .map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.key}
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "group flex min-w-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.99]",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_0_var(--sidebar-primary)]"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    active ? "text-sidebar-primary" : "text-sidebar-foreground/60",
                  )}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })
      )}
    </nav>
  );
}

function Brand({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-sidebar-border px-5 py-4",
        className,
      )}
    >
      <SigocLogo size={40} />
      <div className="min-w-0 leading-tight">
        <p className="font-display text-lg font-semibold tracking-wide text-sidebar-accent-foreground">
          SIGOC
        </p>
        <p className="truncate text-[11px] text-sidebar-foreground/60">
          Gestión de Proyectos Civiles
        </p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { role } = usePermisos();
  const { profile, isSuperAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const navigate = useNavigate();

  const cerrarSesion = async () => {
    setCerrando(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Sesión cerrada");
      void navigate({ to: "/login" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo cerrar la sesión";
      toast.error(msg);
    } finally {
      setCerrando(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-full max-w-[100vw] overflow-x-hidden bg-background">
      <CurrencySync />
      <div className="hidden w-64 shrink-0 lg:block" aria-hidden />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col overflow-hidden bg-sidebar lg:flex">
        <Brand />
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <NavList />
        </div>
        <div className="shrink-0 space-y-1 border-t border-sidebar-border px-4 py-4">
          <SuperAdminProfileTrigger onClick={() => setProfileOpen(true)} />
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            disabled={cerrando}
            onClick={() => void cerrarSesion()}
          >
            <LogOut className="size-4 shrink-0" />
            <span className="truncate">{cerrando ? "Cerrando…" : "Cerrar sesión"}</span>
          </Button>
          <p className="px-1 pt-2 text-[11px] text-sidebar-foreground/50">{getAppFooterLabel()}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card/90 px-3 backdrop-blur sm:h-16 sm:gap-3 sm:px-4 lg:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 lg:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="flex h-full w-[min(100vw-2.5rem,18rem)] flex-col gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
            >
              <Brand className="pr-12" />
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                <NavList onNavigate={() => setOpen(false)} />
              </div>
              <div className="shrink-0 space-y-1 border-t border-sidebar-border px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="mb-2 px-1">
                  <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
                    {profile?.nombre ?? "Usuario"}
                  </p>
                  <p className="truncate text-[11px] text-sidebar-foreground/60">
                    {isSuperAdmin ? "SuperAdmin" : role}
                  </p>
                </div>
                <SuperAdminProfileTrigger
                  onClick={() => {
                    setOpen(false);
                    setProfileOpen(true);
                  }}
                />
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-sidebar-foreground/80"
                  disabled={cerrando}
                  onClick={() => {
                    setOpen(false);
                    void cerrarSesion();
                  }}
                >
                  <LogOut className="size-4" />
                  {cerrando ? "Cerrando…" : "Cerrar sesión"}
                </Button>
                <p className="px-1 pt-2 text-[11px] text-sidebar-foreground/50">
                  {getAppFooterLabel()}
                </p>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <SigocLogo size={32} />
            <div className="min-w-0">
              <p className="font-display text-base font-semibold leading-none tracking-wide">
                SIGOC
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {isSuperAdmin ? "SuperAdmin" : role}
              </p>
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
            {isSuperAdmin ? (
              <Button
                variant="default"
                size="sm"
                className="hidden gap-1.5 sm:inline-flex"
                onClick={() => void navigate({ to: "/admin" })}
              >
                <Shield className="size-4" />
                SaaS
              </Button>
            ) : null}
            <div className="hidden text-right md:block">
              <p className="max-w-[160px] truncate text-xs font-medium text-foreground">
                {profile?.nombre ?? "Usuario"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isSuperAdmin ? "SuperAdmin" : role}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="sm:hidden"
              disabled={cerrando}
              onClick={() => void cerrarSesion()}
              title="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hidden gap-2 sm:inline-flex"
              disabled={cerrando}
              onClick={() => void cerrarSesion()}
              title="Cerrar sesión"
            >
              <LogOut className="size-4" />
              <span>{cerrando ? "Cerrando…" : "Salir"}</span>
            </Button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SubscriptionBanner />
          <div className="px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>

      <SuperAdminProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="label-kicker">{kicker}</p>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="w-full shrink-0 sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">{action}</div> : null}
    </div>
  );
}

export function AccesoDenegado({ modulo }: { modulo: string }) {
  const { role } = usePermisos();
  const { isSuperAdmin } = useAuth();
  return (
    <div className="panel mx-auto max-w-lg p-6 text-center sm:p-10">
      <SigocLogo size={48} className="mx-auto" />
      <h2 className="mt-4 text-xl font-semibold">Acceso restringido</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        El rol <strong>{isSuperAdmin ? "SuperAdmin" : role}</strong> no tiene permisos para el módulo{" "}
        <strong>{modulo}</strong>.
        {isSuperAdmin
          ? " El SuperAdmin solo gestiona clientes, cobros y usuarios de plataforma."
          : " Solicite autorización al Administrador del sistema."}
      </p>
      <Button asChild className="mt-6 w-full sm:w-auto">
        <Link to={isSuperAdmin ? "/admin" : "/"}>
          {isSuperAdmin ? "Ir al panel SaaS" : "Volver al dashboard"}
        </Link>
      </Button>
    </div>
  );
}
