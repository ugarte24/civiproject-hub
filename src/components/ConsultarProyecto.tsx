import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Project } from "@/lib/store";

type ProyectoLite = Pick<Project, "id" | "codigo" | "nombre" | "empresa">;

export function ConsultarProyectoPanel({
  projects,
  hint = "Escriba el código (ej. 001) o parte del nombre del proyecto.",
  onSelect,
}: {
  projects: ProyectoLite[];
  hint?: string;
  onSelect: (id: string) => void;
}) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.codigo.toLowerCase().includes(q) ||
        p.nombre.toLowerCase().includes(q) ||
        p.empresa.toLowerCase().includes(q),
    );
  }, [projects, busqueda]);

  return (
    <div className="panel p-4 sm:p-6">
      <p className="label-kicker">Consultar proyecto</p>
      <h2 className="mt-1 text-lg font-semibold">Busque por código o nombre</h2>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Código o nombre del proyecto…"
          className="pl-9"
          autoFocus
        />
      </div>
      <div className="mt-4 max-h-[min(50vh,420px)] space-y-2 overflow-y-auto">
        {filtrados.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className="flex w-full flex-col gap-0.5 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50"
          >
            <span className="font-mono text-xs text-muted-foreground">{p.codigo}</span>
            <span className="font-medium text-foreground">{p.nombre}</span>
            <span className="truncate text-xs text-muted-foreground">{p.empresa}</span>
          </button>
        ))}
        {!projects.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay proyectos registrados.
          </p>
        ) : !filtrados.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Ningún proyecto coincide con «{busqueda.trim()}».
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function ProyectoSeleccionadoBar({
  proyecto,
  onChange,
}: {
  proyecto: Pick<Project, "codigo" | "nombre"> | undefined;
  onChange: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-muted-foreground">{proyecto?.codigo}</p>
          <p className="truncate text-sm font-medium">{proyecto?.nombre}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={onChange}
          aria-label="Cambiar proyecto"
        >
          <X className="size-4" />
        </Button>
      </div>
      <Button type="button" variant="outline" onClick={onChange}>
        Cambiar proyecto
      </Button>
    </div>
  );
}
