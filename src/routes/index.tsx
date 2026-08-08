import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Building2,
  Activity,
  Wallet,
  TrendingUp,
  PiggyBank,
  HardHat,
  CalendarClock,
  ArrowUpRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { PageHeader } from "@/components/AppShell";
import { money, usePermisos, fecha, type Actividad } from "@/lib/store";
import {
  useActividades,
  useFotografias,
  useMovimientos,
  useProyectos,
} from "@/lib/obra/hooks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard SIGOC — Control de Proyectos Civiles" },
      {
        name: "description",
        content:
          "Panel de indicadores: presupuesto total, ejecutado, saldo disponible, avance físico y financiero de los proyectos civiles.",
      },
      { property: "og:title", content: "Dashboard SIGOC" },
      {
        property: "og:description",
        content: "Indicadores en tiempo real del portafolio de proyectos civiles.",
      },
    ],
  }),
  component: Dashboard,
});

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
  tone?: "primary" | "accent" | "success" | "info";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/20 text-accent-foreground",
    success: "bg-success/15 text-success",
    info: "bg-info/15 text-info",
  };
  return (
    <div className="panel p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="label-kicker">{label}</p>
        <span className={`grid size-9 place-items-center rounded-md ${tones[tone]}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="stat-value mt-3 break-words">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function buildChartAvance(
  projects: { fechaInicio: string; presupuesto: number; ejecutado: number; avanceFisico: number }[],
  actividades: Actividad[],
  movimientos: { fecha: string; tipo: string; monto: number }[],
) {
  const now = new Date();
  const meses: { mes: string; fisico: number; financiero: number }[] = [];
  const presupuesto = projects.reduce((a, p) => a + p.presupuesto, 0) || 1;
  const egresoTipos = new Set(["Egreso", "Pago", "Factura"]);

  for (let i = 5; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const fin = endOfMonth(ref);
    const finIso = isoDate(fin);
    const label = ref.toLocaleDateString("es-BO", { month: "short" });

    const proyectosIniciados = projects.filter((p) => p.fechaInicio <= finIso);
    const fisico = proyectosIniciados.length
      ? Math.round(
          proyectosIniciados.reduce((a, p) => a + p.avanceFisico, 0) / proyectosIniciados.length,
        )
      : actividades.length
        ? Math.round(
            actividades
              .filter((a) => a.inicio <= finIso)
              .reduce((a, act) => a + act.avance, 0) /
              Math.max(1, actividades.filter((a) => a.inicio <= finIso).length),
          )
        : 0;

    const gasto = movimientos
      .filter((m) => egresoTipos.has(m.tipo) && m.fecha <= finIso)
      .reduce((a, m) => a + m.monto, 0);
    const financieroProyectos = proyectosIniciados.reduce((a, p) => a + p.ejecutado, 0);
    const financiero = Math.min(
      100,
      Math.round(((gasto > 0 ? gasto : financieroProyectos) / presupuesto) * 100),
    );

    meses.push({
      mes: label.charAt(0).toUpperCase() + label.slice(1).replace(".", ""),
      fisico,
      financiero,
    });
  }
  return meses;
}

function Dashboard() {
  const { puedeVer } = usePermisos();
  const { data: proyectos = [] } = useProyectos();
  const { data: movimientos = [] } = useMovimientos({
    enabled: puedeVer("contabilidad"),
  });
  const { data: actividades = [] } = useActividades();
  const { data: fotografias = [] } = useFotografias({
    enabled: puedeVer("fotografias"),
  });
  const [diaSel, setDiaSel] = useState<Date | undefined>(new Date());

  const projects = proyectos;

  const presupuesto = projects.reduce((a, p) => a + p.presupuesto, 0);
  const ejecutado = projects.reduce((a, p) => a + p.ejecutado, 0);
  const saldo = presupuesto - ejecutado;
  const activos = projects.filter((p) => p.estado === "Activo").length;
  const avanceFisico = projects.length
    ? Math.round(projects.reduce((a, p) => a + p.avanceFisico, 0) / projects.length)
    : 0;
  const avanceFinanciero = presupuesto ? Math.round((ejecutado / presupuesto) * 100) : 0;

  const chartPresupuesto = projects.map((p) => ({
    name: p.codigo,
    Presupuesto: p.presupuesto,
    Ejecutado: p.ejecutado,
  }));

  const chartAvance = useMemo(
    () => buildChartAvance(projects, actividades, movimientos),
    [projects, actividades, movimientos],
  );

  const diasObra = useMemo(() => {
    const set = new Set<string>();
    for (const a of actividades) {
      const start = parseLocalDate(a.inicio);
      const end = parseLocalDate(a.fin);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        set.add(isoDate(d));
      }
    }
    return [...set].map((iso) => parseLocalDate(iso));
  }, [actividades]);

  const actividadesDelDia = useMemo(() => {
    if (!diaSel) return [];
    const iso = isoDate(diaSel);
    return actividades.filter((a) => a.inicio <= iso && a.fin >= iso);
  }, [actividades, diaSel]);

  const vencimientos = projects
    .filter((p) => p.estado !== "Finalizado")
    .sort((a, b) => a.fechaFinal.localeCompare(b.fechaFinal))
    .slice(0, 3);

  const actividad = [
    ...movimientos.slice(0, 3).map((m) => ({
      titulo: `${m.tipo} ${m.numero} · ${m.proveedor}`,
      detalle: money(m.monto),
      fecha: m.fecha,
    })),
    ...fotografias.slice(0, 2).map((f) => ({
      titulo: `Fotografía: ${f.descripcion}`,
      detalle: f.ubicacion,
      fecha: f.fecha,
    })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div>
      <PageHeader
        kicker="Panel de control"
        title="Dashboard general"
        description="Resumen consolidado del portafolio de proyectos civiles, ejecución presupuestaria y avance de obra."
        action={
          <Link
            to="/proyectos"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ver proyectos <ArrowUpRight className="size-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total de proyectos" value={String(projects.length)} hint={`${activos} activos en ejecución`} icon={Building2} />
        <StatCard label="Presupuesto total" value={money(presupuesto)} hint="Contratos vigentes" icon={Wallet} tone="info" />
        <StatCard label="Presupuesto ejecutado" value={money(ejecutado)} hint={`${avanceFinanciero}% del total`} icon={TrendingUp} tone="accent" />
        <StatCard label="Saldo disponible" value={money(saldo)} hint="Por ejecutar" icon={PiggyBank} tone="success" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="panel p-5">
          <div className="flex items-center gap-2">
            <HardHat className="size-4 text-accent-foreground" />
            <p className="label-kicker">Avance físico promedio</p>
          </div>
          <p className="stat-value mt-3">{avanceFisico}%</p>
          <Progress value={avanceFisico} className="mt-3" />
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <p className="label-kicker">Avance financiero</p>
          </div>
          <p className="stat-value mt-3">{avanceFinanciero}%</p>
          <Progress value={avanceFinanciero} className="mt-3" />
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-destructive" />
            <p className="label-kicker">Próximos vencimientos</p>
          </div>
          <ul className="mt-3 space-y-2">
            {vencimientos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-foreground">{p.codigo}</span>
                <Badge variant="outline">{fecha(p.fechaFinal)}</Badge>
              </li>
            ))}
            {!vencimientos.length ? (
              <li className="text-sm text-muted-foreground">Sin vencimientos próximos.</li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="panel p-5 xl:col-span-2">
          <p className="label-kicker">Presupuesto vs ejecutado por proyecto</p>
          <div className="mt-4 h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartPresupuesto} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                <YAxis
                  width={40}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  tickFormatter={(v: number) => `${v / 1000000}M`}
                />
                <Tooltip
                  formatter={(v: number) => money(v)}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="Presupuesto" radius={[4, 4, 0, 0]} fill="var(--color-chart-1)" />
                <Bar dataKey="Ejecutado" radius={[4, 4, 0, 0]}>
                  {chartPresupuesto.map((_, i) => (
                    <Cell key={i} fill="var(--color-chart-2)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5">
          <p className="label-kicker">Curva de avance</p>
          <div className="mt-4 h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartAvance} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="gf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                <YAxis width={36} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} unit="%" />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="fisico" name="Físico" stroke="var(--color-chart-1)" fill="url(#gf)" strokeWidth={2} />
                <Area type="monotone" dataKey="financiero" name="Financiero" stroke="var(--color-chart-2)" fill="url(#gm)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <p className="label-kicker">Actividad reciente</p>
          <ul className="mt-4 divide-y divide-border">
            {actividad.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground">{a.detalle}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{fecha(a.fecha)}</span>
              </li>
            ))}
            {!actividad.length ? (
              <li className="py-6 text-center text-sm text-muted-foreground">Sin actividad reciente.</li>
            ) : null}
          </ul>
        </div>
        <div className="panel flex flex-col overflow-x-auto p-4 sm:p-5">
          <p className="label-kicker">Calendario de obra</p>
          <Calendar
            mode="single"
            selected={diaSel}
            onSelect={setDiaSel}
            modifiers={{ obra: diasObra }}
            modifiersClassNames={{
              obra: "bg-accent/40 font-semibold text-accent-foreground",
            }}
            className="mt-2 w-full max-w-[320px] self-center"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {actividades.filter((a) => a.estado === "En curso").length} actividades en curso · días
            marcados tienen programación
          </p>
          {diaSel ? (
            <ul className="mt-3 space-y-2 border-t border-border pt-3">
              {actividadesDelDia.length ? (
                actividadesDelDia.map((a) => (
                  <li key={a.id} className="text-sm">
                    <span className="font-medium">{a.nombre}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {a.estado} · {a.avance}%
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-xs text-muted-foreground">Sin actividades este día.</li>
              )}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
