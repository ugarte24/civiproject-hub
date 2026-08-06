import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
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
  HardHat,
  Menu,
  Bell,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore, usePermisos, type Role } from "@/lib/store";

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

const roles: Role[] = [
  "Administrador",
  "Ingeniero Residente",
  "Supervisor",
  "Contabilidad",
  "Consulta",
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { puedeVer } = usePermisos();

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {nav.map((item) => {
        const visible = puedeVer(item.key);
        const active = pathname === item.to;
        if (!visible)
          return (
            <div
              key={item.key}
              className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/35"
              title="Sin permiso para este módulo"
            >
              <item.icon className="size-4" />
              <span className="flex-1">{item.label}</span>
              <ShieldCheck className="size-3.5" />
            </div>
          );
        return (
          <Link
            key={item.key}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_0_var(--sidebar-primary)]"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon
              className={cn(
                "size-4 transition-colors",
                active ? "text-sidebar-primary" : "text-sidebar-foreground/60",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
      <div className="accent-surface grid size-10 place-items-center rounded-md">
        <HardHat className="size-5" />
      </div>
      <div className="leading-tight">
        <p className="font-display text-lg font-semibold tracking-wide text-sidebar-accent-foreground">
          SIGEPROC
        </p>
        <p className="text-[11px] text-sidebar-foreground/60">Gestión de Proyectos Civiles</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { role, setRole, usuarios } = useStore();
  const [open, setOpen] = useState(false);
  const perfil = usuarios.find((u) => u.rol === role);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <NavList />
        </div>
        <div className="border-t border-sidebar-border px-5 py-4 text-[11px] text-sidebar-foreground/50">
          SIGEPROC v1.0 · Agosto 2026
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/85 px-4 backdrop-blur lg:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
              <Brand />
              <NavList onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="relative hidden max-w-sm flex-1 md:block">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar proyecto, documento o factura…" className="bg-background pl-9" />
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="label-kicker">Rol activo</p>
              <p className="text-xs font-medium text-foreground">{perfil?.nombre ?? "Usuario demo"}</p>
            </div>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger className="w-[170px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="relative">
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-accent" />
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="label-kicker">{kicker}</p>
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function AccesoDenegado({ modulo }: { modulo: string }) {
  const { role } = useStore();
  return (
    <div className="panel mx-auto max-w-lg p-10 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <ShieldCheck className="size-6" />
      </div>
      <h2 className="mt-4 text-xl font-semibold">Acceso restringido</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        El rol <strong>{role}</strong> no tiene permisos para el módulo{" "}
        <strong>{modulo}</strong>. Solicite autorización al Administrador del sistema.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Volver al dashboard</Link>
      </Button>
    </div>
  );
}
