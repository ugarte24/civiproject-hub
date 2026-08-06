import { createFileRoute, Link } from "@tanstack/react-router";
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
import { money, useStore, fecha } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard SIGEPROC — Control de Proyectos Civiles" },
      {
        name: "description",
        content:
          "Panel de indicadores: presupuesto total, ejecutado, saldo disponible, avance físico y financiero de los proyectos civiles.",
      },
      { property: "og:title", content: "Dashboard SIGEPROC" },
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
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="label-kicker">{label}</p>
        <span className={`grid size-9 place-items-center rounded-md ${tones[tone]}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="stat-value mt-3">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Dashboard() {
  const { projects, movimientos, actividades, fotografias } = useStore();

  const presupuesto = projects.reduce((a, p) => a + p.presupuesto, 0);
  const ejecutado = projects.reduce((a, p) => a + p.ejecutado, 0);
  const saldo = presupuesto - ejecutado;
  const activos = projects.filter((p) => p.estado === "Activo").length;
  const avanceFisico = projects.length
    ? Math.round(projects.reduce((a, p) => a + p.avanceFisico, 0) / projects.length)
    : 0;
  const avanceFinanciero = presupuesto ? Math.round((ejecutado / presupuesto) * 100) : 0;

  const chartPresupuesto = projects.map((p) => ({
    name: p.codigo.replace("PRY-", ""),
    Presupuesto: p.presupuesto,
    Ejecutado: p.ejecutado,
  }));

  const chartAvance = [
    { mes: "Mar", fisico: 12, financiero: 8 },
    { mes: "Abr", fisico: 24, financiero: 19 },
    { mes: "May", fisico: 35, financiero: 28 },
    { mes: "Jun", fisico: 44, financiero: 37 },
    { mes: "Jul", fisico: 53, financiero: 46 },
    { mes: "Ago", fisico: avanceFisico, financiero: avanceFinanciero },
  ];

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
          </ul>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="panel p-5 xl:col-span-2">
          <p className="label-kicker">Presupuesto vs ejecutado por proyecto</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartPresupuesto}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
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
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartAvance}>
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
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} unit="%" />
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
          </ul>
        </div>
        <div className="panel flex flex-col items-center p-5">
          <p className="label-kicker self-start">Calendario de obra</p>
          <Calendar mode="single" className="mt-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            {actividades.filter((a) => a.estado === "En curso").length} actividades en curso
          </p>
        </div>
      </div>
    </div>
  );
}
