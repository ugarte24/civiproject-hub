import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, AccesoDenegado } from "@/components/AppShell";
import { Field } from "@/components/Field";
import { DateInput } from "@/components/DateInput";
import { usePermisos, fecha, type Actividad } from "@/lib/store";
import {
  useActividades,
  useDeleteActividad,
  useProyectos,
  useUpsertActividad,
} from "@/lib/obra/hooks";

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

const formVacio = {
  nombre: "",
  inicio: "",
  fin: "",
  responsable: "",
  estado: "Pendiente" as Actividad["estado"],
  avance: "0",
};

function CronogramaPage() {
  const { data: projects = [] } = useProyectos();
  const { data: actividades = [] } = useActividades();
  const upsertMut = useUpsertActividad();
  const delMut = useDeleteActividad();
  const { puedeVer, puedeEditar } = usePermisos();
  const editable = puedeEditar("cronograma");
  const [proyectoId, setProyectoId] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [form, setForm] = useState(formVacio);

  useEffect(() => {
    if (!proyectoId && projects[0]?.id) setProyectoId(projects[0].id);
  }, [projects, proyectoId]);

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

  const errores: Record<string, string> = {};
  if (form.nombre.trim().length < 3) errores["nombre"] = "Mínimo 3 caracteres.";
  if (!form.inicio) errores["inicio"] = "Inicio requerido.";
  if (!form.fin) errores["fin"] = "Fin requerido.";
  if (form.inicio && form.fin && form.fin < form.inicio) errores["fin"] = "Fin debe ser ≥ inicio.";
  if (!proyectoId) errores["proyecto"] = "Seleccione un proyecto.";

  const resetForm = () => {
    setEditingId(null);
    setForm(formVacio);
    setTouched(false);
  };

  const abrirNueva = () => {
    resetForm();
    setOpen(true);
  };

  const abrirEditar = (a: Actividad) => {
    setEditingId(a.id);
    setForm({
      nombre: a.nombre,
      inicio: a.inicio,
      fin: a.fin,
      responsable: a.responsable,
      estado: a.estado,
      avance: String(a.avance),
    });
    setTouched(false);
    setOpen(true);
  };

  const guardar = () => {
    if (Object.keys(errores).length) {
      setTouched(true);
      toast.error("Revise los campos marcados.");
      return;
    }
    void upsertMut
      .mutateAsync({
        ...(editingId ? { id: editingId } : {}),
        proyectoId,
        nombre: form.nombre.trim(),
        inicio: form.inicio,
        fin: form.fin,
        responsable: form.responsable.trim(),
        estado: form.estado,
        avance: Math.min(100, Math.max(0, Number(form.avance) || 0)),
      })
      .then(() => {
        toast.success(editingId ? "Actividad actualizada." : "Actividad registrada.");
        setOpen(false);
        resetForm();
      })
      .catch((err: Error) => toast.error(err.message));
  };

  return (
    <div>
      <PageHeader
        kicker="Planificación"
        title="Cronograma de obra"
        description="Vista Gantt de actividades con duración, responsable y grado de avance."
        action={
          editable ? (
            <Button onClick={abrirNueva} className="gap-2" disabled={!proyectoId}>
              <Plus className="size-4" /> Nueva actividad
            </Button>
          ) : null
        }
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

      {/* Vista móvil: tarjetas */}
      <div className="space-y-3 md:hidden">
        {lista.map((a) => {
          const offset = ((new Date(a.inicio).getTime() - inicioMin) / span) * 100;
          const width = ((new Date(a.fin).getTime() - new Date(a.inicio).getTime()) / span) * 100;
          return (
            <article key={a.id} className="panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-medium leading-snug text-foreground">{a.nombre}</h3>
                  <Badge variant="outline" className="mt-1.5">
                    {a.estado}
                  </Badge>
                </div>
                {editable ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => abrirEditar(a)}
                      aria-label="Editar actividad"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      disabled={delMut.isPending}
                      onClick={() => {
                        void delMut
                          .mutateAsync(a.id)
                          .then(() => toast.success("Actividad eliminada."))
                          .catch((err: Error) => toast.error(err.message));
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ) : null}
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Inicio</dt>
                  <dd className="font-medium">{fecha(a.inicio)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fin</dt>
                  <dd className="font-medium">{fecha(a.fin)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Duración</dt>
                  <dd className="font-medium">{dias(a.inicio, a.fin)} días</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Responsable</dt>
                  <dd className="truncate font-medium">{a.responsable || "—"}</dd>
                </div>
              </dl>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Programación</span>
                  <span className="tabular-nums text-muted-foreground">{a.avance}%</span>
                </div>
                <div className="relative h-7 rounded-md bg-muted">
                  <div
                    className={`absolute top-1 h-5 rounded-md ${tono(a.estado)}`}
                    style={{ left: `${offset}%`, width: `${Math.max(width, 8)}%` }}
                    title={`${a.avance}% de avance`}
                  />
                </div>
                <Progress value={a.avance} className="mt-2" />
              </div>
            </article>
          );
        })}
        {!lista.length ? (
          <p className="panel py-10 text-center text-sm text-muted-foreground">
            El proyecto seleccionado no tiene actividades programadas.
          </p>
        ) : null}
      </div>

      {/* Vista desktop: Gantt */}
      <div className="panel hidden overflow-x-auto p-3 sm:p-5 md:block">
        <div className="min-w-[720px]">
          <div
            className={`grid gap-3 border-b border-border pb-2 ${
              editable
                ? "grid-cols-[minmax(200px,1.3fr)_repeat(4,minmax(70px,1fr))_2fr_70px]"
                : "grid-cols-[minmax(230px,1.4fr)_repeat(4,minmax(80px,1fr))_2.5fr]"
            }`}
          >
            <span className="label-kicker">Actividad</span>
            <span className="label-kicker">Inicio</span>
            <span className="label-kicker">Fin</span>
            <span className="label-kicker">Duración</span>
            <span className="label-kicker">Responsable</span>
            <span className="label-kicker">Barra de programación</span>
            {editable ? <span className="label-kicker">Acciones</span> : null}
          </div>

          {lista.map((a) => {
            const offset = ((new Date(a.inicio).getTime() - inicioMin) / span) * 100;
            const width = ((new Date(a.fin).getTime() - new Date(a.inicio).getTime()) / span) * 100;
            return (
              <div
                key={a.id}
                className={`grid items-center gap-3 border-b border-border/60 py-3 text-sm ${
                  editable
                    ? "grid-cols-[minmax(200px,1.3fr)_repeat(4,minmax(70px,1fr))_2fr_70px]"
                    : "grid-cols-[minmax(230px,1.4fr)_repeat(4,minmax(80px,1fr))_2.5fr]"
                }`}
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
                {editable ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => abrirEditar(a)}
                      aria-label="Editar actividad"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      disabled={delMut.isPending}
                      onClick={() => {
                        void delMut
                          .mutateAsync(a.id)
                          .then(() => toast.success("Actividad eliminada."))
                          .catch((err: Error) => toast.error(err.message));
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ) : null}
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
        <div className="panel mt-4 hidden p-4 sm:p-5 md:block">
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

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide uppercase">
              {editingId ? "Editar actividad" : "Nueva actividad"}
            </DialogTitle>
            <DialogDescription>Programe una actividad en el cronograma del proyecto.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre" error={touched ? errores["nombre"] : undefined} full>
              <Input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </Field>
            <Field label="Responsable">
              <Input
                value={form.responsable}
                onChange={(e) => setForm((f) => ({ ...f, responsable: e.target.value }))}
              />
            </Field>
            <Field label="Inicio" error={touched ? errores["inicio"] : undefined}>
              <DateInput
                value={form.inicio}
                onChange={(v) => setForm((f) => ({ ...f, inicio: v }))}
              />
            </Field>
            <Field label="Fin" error={touched ? errores["fin"] : undefined}>
              <DateInput value={form.fin} onChange={(v) => setForm((f) => ({ ...f, fin: v }))} />
            </Field>
            <Field label="Estado">
              <Select
                value={form.estado}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, estado: v as Actividad["estado"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="En curso">En curso</SelectItem>
                  <SelectItem value="Concluida">Concluida</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Avance (%)">
              <Input
                type="number"
                min={0}
                max={100}
                value={form.avance}
                onChange={(e) => setForm((f) => ({ ...f, avance: e.target.value }))}
              />
            </Field>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={upsertMut.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
