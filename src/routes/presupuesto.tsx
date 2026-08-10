import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, AccesoDenegado } from "@/components/AppShell";
import { Field } from "@/components/Field";
import { usePermisos, money, type Partida } from "@/lib/store";
import {
  useAddPartida,
  useDeletePartida,
  usePartidas,
  useProyectos,
  useUpdatePartida,
} from "@/lib/obra/hooks";

export const Route = createFileRoute("/presupuesto")({
  head: () => ({
    meta: [
      { title: "Presupuesto por partidas — SIGOC" },
      {
        name: "description",
        content:
          "Control de partidas presupuestarias por proyecto: monto contratado, ejecutado y saldo disponible.",
      },
    ],
  }),
  component: PresupuestoPage,
});

function PresupuestoPage() {
  const { data: projects = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const addMut = useAddPartida();
  const updateMut = useUpdatePartida();
  const delMut = useDeletePartida();
  const { puedeVer, puedeEditar } = usePermisos();
  const [proyectoId, setProyectoId] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partida | null>(null);
  const [nombre, setNombre] = useState("");
  const [monto, setMonto] = useState("");
  const [ejecutado, setEjecutado] = useState("0");
  const [descripcion, setDescripcion] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!proyectoId && projects[0]?.id) setProyectoId(projects[0].id);
  }, [projects, proyectoId]);

  const editable = puedeEditar("presupuesto");
  const lista = partidas.filter((p) => p.proyectoId === proyectoId);
  const proyecto = projects.find((p) => p.id === proyectoId);

  const errores = useMemo(() => {
    const e: Record<string, string> = {};
    if (nombre.trim().length < 4) e["nombre"] = "Mínimo 4 caracteres.";
    if (!monto || Number(monto) <= 0) e["monto"] = "Monto mayor a cero.";
    if (ejecutado === "" || Number(ejecutado) < 0) e["ejecutado"] = "Ejecutado ≥ 0.";
    if (Number(ejecutado) > Number(monto || 0)) e["ejecutado"] = "No puede superar el monto.";
    return e;
  }, [nombre, monto, ejecutado]);

  const total = lista.reduce((a, p) => a + p.monto, 0);
  const ejec = lista.reduce((a, p) => a + p.ejecutado, 0);

  const resetForm = () => {
    setEditing(null);
    setNombre("");
    setMonto("");
    setEjecutado("0");
    setDescripcion("");
    setTouched(false);
  };

  const abrirNueva = () => {
    resetForm();
    setOpen(true);
  };

  const abrirEditar = (p: Partida) => {
    setEditing(p);
    setNombre(p.nombre);
    setMonto(String(p.monto));
    setEjecutado(String(p.ejecutado));
    setDescripcion(p.descripcion);
    setTouched(false);
    setOpen(true);
  };

  const guardar = () => {
    if (Object.keys(errores).length) {
      setTouched(true);
      toast.error("Revise los campos marcados.");
      return;
    }
    const payload = {
      nombre: nombre.trim(),
      monto: Number(monto),
      ejecutado: Number(ejecutado) || 0,
      descripcion: descripcion.trim(),
    };
    const mut = editing
      ? updateMut.mutateAsync({ id: editing.id, ...payload })
      : addMut.mutateAsync({ proyectoId, ...payload });
    void mut
      .then(() => {
        toast.success(editing ? "Partida actualizada." : "Partida registrada.");
        setOpen(false);
        resetForm();
      })
      .catch((err: Error) => toast.error(err.message));
  };

  if (!puedeVer("presupuesto")) return <AccesoDenegado modulo="Presupuesto" />;

  const saving = addMut.isPending || updateMut.isPending;

  return (
    <div>
      <PageHeader
        kicker="Control económico"
        title="Presupuesto"
        description="Partidas presupuestarias por proyecto con seguimiento de ejecución y saldo."
        action={
          editable ? (
            <Button onClick={abrirNueva} className="gap-2" disabled={!proyectoId}>
              <Plus className="size-4" /> Nueva Partida
            </Button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="panel p-5">
          <p className="label-kicker">Presupuesto del proyecto</p>
          <p className="stat-value mt-2">{money(proyecto?.presupuesto ?? 0)}</p>
        </div>
        <div className="panel p-5">
          <p className="label-kicker">Total en partidas</p>
          <p className="stat-value mt-2">{money(total)}</p>
        </div>
        <div className="panel p-5">
          <p className="label-kicker">Ejecutado / saldo</p>
          <p className="stat-value mt-2">{money(total - ejec)}</p>
          <Progress value={total ? (ejec / total) * 100 : 0} className="mt-3" />
        </div>
      </div>

      <div className="panel mt-4 p-3 sm:p-4">
        {/* Vista móvil: tarjetas */}
        <div className="space-y-3 md:hidden">
          {lista.map((p) => {
            const saldo = p.monto - p.ejecutado;
            const avance = p.monto ? (p.ejecutado / p.monto) * 100 : 0;
            return (
              <article key={p.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium leading-snug text-foreground">{p.nombre}</h3>
                    {p.descripcion ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {p.descripcion}
                      </p>
                    ) : null}
                  </div>
                  {editable ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => abrirEditar(p)}
                        aria-label="Editar partida"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        disabled={delMut.isPending}
                        onClick={() => {
                          void delMut.mutateAsync(p.id).then(
                            () => toast.success("Partida eliminada."),
                            (err: Error) => toast.error(err.message),
                          );
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Monto</dt>
                    <dd className="font-medium tabular-nums">{money(p.monto)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Ejecutado</dt>
                    <dd className="font-medium tabular-nums">{money(p.ejecutado)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Saldo</dt>
                    <dd className="font-semibold tabular-nums">{money(saldo)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Avance</dt>
                    <dd className="font-medium tabular-nums">{avance.toFixed(0)}%</dd>
                  </div>
                </dl>
                <Progress value={avance} className="mt-3" />
              </article>
            );
          })}
          {!lista.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Este proyecto todavía no tiene partidas registradas.
            </p>
          ) : null}
          {lista.length ? (
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="font-display text-xs uppercase tracking-wide text-muted-foreground">
                Totales
              </p>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Monto</dt>
                  <dd className="font-semibold tabular-nums">{money(total)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Ejecutado</dt>
                  <dd className="font-semibold tabular-nums">{money(ejec)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Saldo</dt>
                  <dd className="font-semibold tabular-nums">{money(total - ejec)}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>

        {/* Vista desktop: tabla */}
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Partida</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Ejecutado</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="w-[110px]">Avance</TableHead>
                {editable ? <TableHead className="w-[90px]" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/40">
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground">
                    {p.descripcion}
                  </TableCell>
                  <TableCell className="text-right">{money(p.monto)}</TableCell>
                  <TableCell className="text-right">{money(p.ejecutado)}</TableCell>
                  <TableCell className="text-right">{money(p.monto - p.ejecutado)}</TableCell>
                  <TableCell>
                    <Progress value={p.monto ? (p.ejecutado / p.monto) * 100 : 0} />
                  </TableCell>
                  {editable ? (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirEditar(p)}
                          aria-label="Editar partida"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          disabled={delMut.isPending}
                          onClick={() => {
                            void delMut.mutateAsync(p.id).then(
                              () => toast.success("Partida eliminada."),
                              (err: Error) => toast.error(err.message),
                            );
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
              {!lista.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Este proyecto todavía no tiene partidas registradas.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
            {lista.length ? (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-display uppercase">
                    Totales
                  </TableCell>
                  <TableCell className="text-right font-medium">{money(total)}</TableCell>
                  <TableCell className="text-right font-medium">{money(ejec)}</TableCell>
                  <TableCell className="text-right font-medium">{money(total - ejec)}</TableCell>
                  <TableCell colSpan={editable ? 2 : 1} />
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide uppercase">
              {editing ? "Editar Partida" : "Nueva Partida"}
            </DialogTitle>
            <DialogDescription>
              {proyecto ? `Proyecto ${proyecto.codigo}` : "Seleccione un proyecto"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            <Field label="Nombre" error={touched ? errores["nombre"] : undefined}>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="Excavación, hormigón, acero…"
              />
            </Field>
            <Field label="Monto (Bs)" error={touched ? errores["monto"] : undefined}>
              <Input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                onBlur={() => setTouched(true)}
              />
            </Field>
            <Field label="Ejecutado (Bs)" error={touched ? errores["ejecutado"] : undefined}>
              <Input
                type="number"
                min={0}
                value={ejecutado}
                onChange={(e) => setEjecutado(e.target.value)}
                onBlur={() => setTouched(true)}
              />
            </Field>
            <Field label="Descripción">
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
              />
            </Field>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={saving}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
