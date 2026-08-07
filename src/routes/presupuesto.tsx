import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import { useStore, usePermisos, money } from "@/lib/store";

export const Route = createFileRoute("/presupuesto")({
  head: () => ({
    meta: [
      { title: "Presupuesto por partidas — SIGOC" },
      {
        name: "description",
        content:
          "Control de partidas presupuestarias por proyecto: monto contratado, ejecutado y saldo disponible.",
      },
      { property: "og:title", content: "Presupuesto — SIGOC" },
      {
        property: "og:description",
        content: "Partidas de obra, ejecución y saldo por proyecto civil.",
      },
    ],
  }),
  component: PresupuestoPage,
});

function PresupuestoPage() {
  const { projects, partidas, addPartida, removePartida } = useStore();
  const { puedeVer, puedeEditar } = usePermisos();
  const [proyectoId, setProyectoId] = useState(projects[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [touched, setTouched] = useState(false);

  const editable = puedeEditar("presupuesto");
  const lista = partidas.filter((p) => p.proyectoId === proyectoId);
  const proyecto = projects.find((p) => p.id === proyectoId);

  const errores = useMemo(() => {
    const e: Record<string, string> = {};
    if (nombre.trim().length < 4) e["nombre"] = "Mínimo 4 caracteres.";
    if (!monto || Number(monto) <= 0) e["monto"] = "Monto mayor a cero.";
    return e;
  }, [nombre, monto]);

  const total = lista.reduce((a, p) => a + p.monto, 0);
  const ejec = lista.reduce((a, p) => a + p.ejecutado, 0);

  const guardar = () => {
    if (Object.keys(errores).length) {
      setTouched(true);
      toast.error("❌ Error al guardar los datos. Revise los campos marcados.");
      return;
    }
    addPartida({ proyectoId, nombre, monto: Number(monto), descripcion });
    toast.success("✅ Partida registrada correctamente.");
    setOpen(false);
    setNombre("");
    setMonto("");
    setDescripcion("");
    setTouched(false);
  };

  if (!puedeVer("presupuesto")) return <AccesoDenegado modulo="Presupuesto" />;

  return (
    <div>
      <PageHeader
        kicker="Control económico"
        title="Presupuesto"
        description="Partidas presupuestarias por proyecto con seguimiento de ejecución y saldo."
        action={
          editable ? (
            <Button onClick={() => setOpen(true)} className="gap-2">
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

      <div className="panel mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Partida</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Ejecutado</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="w-[110px]">Avance</TableHead>
              {editable ? <TableHead /> : null}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => {
                        removePartida(p.id);
                        toast.success("🗑️ Partida eliminada correctamente.");
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide uppercase">
              Nueva Partida
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
            <Button onClick={guardar}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
