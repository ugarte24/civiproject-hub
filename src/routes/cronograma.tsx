import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, AccesoDenegado } from "@/components/AppShell";
import { useStore, usePermisos, fecha } from "@/lib/store";

export const Route = createFileRoute("/cronograma")({
  head: () => ({
    meta: [
      { title: "Cronograma de obra (Gantt) — SIGOC" },
      {
        name: "description",
        content:
          "Cronograma tipo Gantt con actividades, fechas de inicio y fin, duración, responsable y estado de avance.",
      },
      { property: "og:title", content: "Cronograma — SIGOC" },
      {
        property: "og:description",
        content: "Planificación y seguimiento de actividades de obra en vista Gantt.",
      },
    ],
  }),
  component: CronogramaPage,
});

const dias = (a: string, b: string) =>
  Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

function CronogramaPage() {
  const { projects, actividades } = useStore();
  const { puedeVer } = usePermisos();
  const [proyectoId, setProyectoId] = useState(projects[0]?.id ?? "");

  if (!puedeVer("cronograma")) return <AccesoDenegado modulo="Cronograma" />;

  const lista = actividades.filter((a) => a.proyectoId === proyectoId);
  const inicioMin = lista.length
    ? Math.min(...lista.map((a) => new Date(a.inicio).getTime()))
    : Date.now();
  const finMax = lista.length ? Math.max(...lista.map((a) => new Date(a.fin).getTime())) : Date.now();
  const span = Math.max(1, finMax - inicioMin);

  const tono = (estado: string) =>
    estado === "Concluida"
      ? "bg-success"
      : estado === "En curso"
        ? "bg-accent"
        : "bg-primary/40";

  return (
    <div>
      <PageHeader
        kicker="Planificación"
        title="Cronograma de obra"
        description="Vista Gantt de actividades con duración, responsable y grado de avance."
      />

      <div className="mb-4">
        <Select value={proyectoId} onValueChange={setProyectoId}>
          <SelectTrigger className="w-full bg-card sm:w-[420px]">
            <SelectValue placeholder="Seleccione un proyecto" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.codigo} — {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="panel overflow-x-auto p-3 sm:p-5">
        <p className="mb-3 text-xs text-muted-foreground md:hidden">
          Desliza horizontalmente para ver el Gantt completo.
        </p>
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[minmax(230px,1.4fr)_repeat(4,minmax(80px,1fr))_2.5fr] gap-3 border-b border-border pb-2">
            <span className="label-kicker">Actividad</span>
            <span className="label-kicker">Inicio</span>
            <span className="label-kicker">Fin</span>
            <span className="label-kicker">Duración</span>
            <span className="label-kicker">Responsable</span>
            <span className="label-kicker">Barra de programación</span>
          </div>

          {lista.map((a) => {
            const offset = ((new Date(a.inicio).getTime() - inicioMin) / span) * 100;
            const width = ((new Date(a.fin).getTime() - new Date(a.inicio).getTime()) / span) * 100;
            return (
              <div
                key={a.id}
                className="grid grid-cols-[minmax(230px,1.4fr)_repeat(4,minmax(80px,1fr))_2.5fr] items-center gap-3 border-b border-border/60 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{a.nombre}</p>
                  <Badge variant="outline" className="mt-1">
                    {a.estado}
                  </Badge>
                </div>
                <span>{fecha(a.inicio)}</span>
                <span>{fecha(a.fin)}</span>
                <span>{dias(a.inicio, a.fin)} días</span>
                <span className="truncate">{a.responsable}</span>
                <div className="relative h-7 rounded-md bg-muted">
                  <div
                    className={`absolute top-1 h-5 rounded-md ${tono(a.estado)}`}
                    style={{ left: `${offset}%`, width: `${Math.max(width, 4)}%` }}
                    title={`${a.avance}% de avance`}
                  />
                </div>
              </div>
            );
          })}

          {!lista.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              El proyecto seleccionado no tiene actividades programadas.
            </p>
          ) : null}
        </div>
      </div>

      {lista.length ? (
        <div className="panel mt-4 p-4 sm:p-5">
          <p className="label-kicker">Avance por actividad</p>
          <div className="mt-4 space-y-4">
            {lista.map((a) => (
              <div key={a.id}>
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0 text-foreground">{a.nombre}</span>
                  <span className="shrink-0 text-muted-foreground">{a.avance}%</span>
                </div>
                <Progress value={a.avance} className="mt-1.5" />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
