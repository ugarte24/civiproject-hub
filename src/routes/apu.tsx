import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, AccesoDenegado } from "@/components/AppShell";
import { Field } from "@/components/Field";
import { usePermisos, apuPrecioUnitario, money2, type Apu, type ApuInsumo } from "@/lib/store";
import {
  useAddApu,
  useApus,
  useConfigEmpresa,
  useDeleteApu,
  useUpdateApu,
} from "@/lib/obra/hooks";

export const Route = createFileRoute("/apu")({
  head: () => ({
    meta: [
      { title: "APU — Análisis de Precios Unitarios | SIGOC" },
      {
        name: "description",
        content:
          "Análisis de precios unitarios con materiales, equipos, mano de obra, costo directo, indirectos, utilidad y precio unitario.",
      },
      { property: "og:title", content: "Análisis de Precios Unitarios — SIGOC" },
      {
        property: "og:description",
        content: "Cálculo detallado del precio unitario de cada ítem de obra.",
      },
    ],
  }),
  component: ApuPage,
});

const filaVacia: ApuInsumo = { descripcion: "", unidad: "", cantidad: 0, precio: 0 };

function TablaInsumos({
  items,
  onChange,
}: {
  items: ApuInsumo[];
  onChange: (items: ApuInsumo[]) => void;
}) {
  const set = (i: number, k: keyof ApuInsumo, v: string) =>
    onChange(
      items.map((it, idx) =>
        idx === i
          ? { ...it, [k]: k === "cantidad" || k === "precio" ? Number(v) : v }
          : it,
      ),
    );

  const quitar = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div>
      {/* Vista móvil: tarjetas */}
      <div className="space-y-3 md:hidden">
        {items.map((it, i) => (
          <article key={i} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Fila {i + 1}</p>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-destructive"
                onClick={() => quitar(i)}
                aria-label="Eliminar fila"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="mt-2 space-y-3">
              <Field label="Descripción">
                <Input
                  value={it.descripcion}
                  onChange={(e) => set(i, "descripcion", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Unidad">
                  <Input
                    value={it.unidad}
                    onChange={(e) => set(i, "unidad", e.target.value)}
                  />
                </Field>
                <Field label="Cantidad">
                  <Input
                    type="number"
                    inputMode="decimal"
                    className="tabular-nums"
                    value={it.cantidad}
                    onChange={(e) => set(i, "cantidad", e.target.value)}
                  />
                </Field>
                <Field label="P. unitario">
                  <Input
                    type="number"
                    inputMode="decimal"
                    className="tabular-nums"
                    value={it.precio}
                    onChange={(e) => set(i, "precio", e.target.value)}
                  />
                </Field>
                <div>
                  <p className="label-kicker">Parcial</p>
                  <p className="mt-2 text-sm font-semibold tabular-nums">
                    {money2(it.cantidad * it.precio)}
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}
        {!items.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin filas. Agregue el primer insumo.
          </p>
        ) : null}
      </div>

      {/* Vista desktop: tabla */}
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descripción</TableHead>
              <TableHead className="min-w-[6rem]">Unidad</TableHead>
              <TableHead className="min-w-[7rem]">Cant.</TableHead>
              <TableHead className="min-w-[8rem]">P. unit.</TableHead>
              <TableHead className="min-w-[7rem] text-right">Parcial</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Input
                    value={it.descripcion}
                    onChange={(e) => set(i, "descripcion", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={it.unidad}
                    onChange={(e) => set(i, "unidad", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    inputMode="decimal"
                    className="min-w-[6rem] tabular-nums"
                    value={it.cantidad}
                    onChange={(e) => set(i, "cantidad", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    inputMode="decimal"
                    className="min-w-[7rem] tabular-nums"
                    value={it.precio}
                    onChange={(e) => set(i, "precio", e.target.value)}
                  />
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {money2(it.cantidad * it.precio)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => quitar(i)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-3 gap-2"
        onClick={() => onChange([...items, { ...filaVacia }])}
      >
        <Plus className="size-4" /> Agregar fila
      </Button>
    </div>
  );
}

function ApuPage() {
  const { data: apus = [] } = useApus();
  const { data: config } = useConfigEmpresa();
  const addMut = useAddApu();
  const updateMut = useUpdateApu();
  const delMut = useDeleteApu();
  const { puedeVer, puedeEditar } = usePermisos();
  const editable = puedeEditar("apu");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const indirectosDef = String(config?.costo_indirecto_pct ?? 12);
  const utilidadDef = String(config?.utilidad_pct ?? 10);
  const formVacio = () => ({
    codigo: "",
    descripcion: "",
    unidad: "",
    cantidad: "1",
    indirectos: indirectosDef,
    utilidad: utilidadDef,
  });
  const [general, setGeneral] = useState(formVacio);
  const [materiales, setMateriales] = useState<ApuInsumo[]>([{ ...filaVacia }]);
  const [equipos, setEquipos] = useState<ApuInsumo[]>([{ ...filaVacia }]);
  const [manoObra, setManoObra] = useState<ApuInsumo[]>([{ ...filaVacia }]);

  if (!puedeVer("apu")) return <AccesoDenegado modulo="APU" />;

  const borrador = {
    id: editingId ?? "draft",
    codigo: general.codigo,
    descripcion: general.descripcion,
    unidad: general.unidad,
    cantidad: Number(general.cantidad) || 1,
    materiales,
    equipos,
    manoObra,
    indirectos: Number(general.indirectos) || 0,
    utilidad: Number(general.utilidad) || 0,
  };
  const calc = apuPrecioUnitario(borrador);

  const resetForm = () => {
    setEditingId(null);
    setGeneral(formVacio());
    setMateriales([{ ...filaVacia }]);
    setEquipos([{ ...filaVacia }]);
    setManoObra([{ ...filaVacia }]);
  };

  const abrirNuevo = () => {
    resetForm();
    setOpen(true);
  };

  const abrirEditar = (a: Apu) => {
    setEditingId(a.id);
    setGeneral({
      codigo: a.codigo,
      descripcion: a.descripcion,
      unidad: a.unidad,
      cantidad: String(a.cantidad),
      indirectos: String(a.indirectos),
      utilidad: String(a.utilidad),
    });
    setMateriales(a.materiales.length ? a.materiales : [{ ...filaVacia }]);
    setEquipos(a.equipos.length ? a.equipos : [{ ...filaVacia }]);
    setManoObra(a.manoObra.length ? a.manoObra : [{ ...filaVacia }]);
    setOpen(true);
  };

  const guardar = () => {
    if (!general.codigo.trim() || general.descripcion.trim().length < 5 || !general.unidad.trim()) {
      toast.error("Complete código, descripción y unidad.");
      return;
    }
    const { id: _id, ...rest } = borrador;
    const mut = editingId
      ? updateMut.mutateAsync({ id: editingId, ...rest })
      : addMut.mutateAsync(rest);
    void mut
      .then(() => {
        toast.success(editingId ? "APU actualizado." : "APU registrado correctamente.");
        setOpen(false);
        resetForm();
      })
      .catch((err: Error) => toast.error(err.message));
  };

  const saving = addMut.isPending || updateMut.isPending;

  return (
    <div>
      <PageHeader
        kicker="Ingeniería de costos"
        title="Análisis de Precios Unitarios"
        description="Composición de costos por ítem: materiales, equipos, mano de obra, indirectos y utilidad."
        action={
          editable ? (
            <Button onClick={abrirNuevo} className="gap-2">
              <Plus className="size-4" /> Nuevo APU
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {apus.map((a) => {
          const c = apuPrecioUnitario(a);
          return (
            <div key={a.id} className="panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{a.codigo}</p>
                  <p className="font-medium text-foreground">{a.descripcion}</p>
                  <p className="text-xs text-muted-foreground">
                    Unidad: {a.unidad} · Cantidad: {a.cantidad}
                  </p>
                </div>
                {editable ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => abrirEditar(a)}
                      aria-label="Editar APU"
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
                          .then(() => toast.success("APU eliminado."))
                          .catch((err: Error) => toast.error(err.message));
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="label-kicker">Costo directo</dt>
                  <dd>{money2(c.directo)}</dd>
                </div>
                <div>
                  <dt className="label-kicker">Costo indirecto ({a.indirectos}%)</dt>
                  <dd>{money2(c.indirecto)}</dd>
                </div>
                <div>
                  <dt className="label-kicker">Utilidad ({a.utilidad}%)</dt>
                  <dd>{money2(c.utilidad)}</dd>
                </div>
                <div>
                  <dt className="label-kicker">Precio unitario</dt>
                  <dd className="font-display text-lg font-semibold text-primary">
                    Bs {money2(c.precio)}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide uppercase">
              {editingId ? "Editar APU" : "Nuevo Análisis de Precio Unitario"}
            </DialogTitle>
            <DialogDescription>
              Complete cada pestaña; el resumen calcula el precio unitario en tiempo real.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general">
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <TabsList className="inline-flex h-auto min-w-full w-max flex-nowrap justify-start gap-1">
                <TabsTrigger value="general" className="shrink-0">
                  General
                </TabsTrigger>
                <TabsTrigger value="materiales" className="shrink-0">
                  Materiales
                </TabsTrigger>
                <TabsTrigger value="equipos" className="shrink-0">
                  Equipos
                </TabsTrigger>
                <TabsTrigger value="mano" className="shrink-0">
                  Mano de obra
                </TabsTrigger>
                <TabsTrigger value="resumen" className="shrink-0">
                  Resumen
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="general" className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Código">
                <Input
                  value={general.codigo}
                  onChange={(e) => setGeneral((g) => ({ ...g, codigo: e.target.value }))}
                  placeholder="APU-003"
                />
              </Field>
              <Field label="Unidad">
                <Input
                  value={general.unidad}
                  onChange={(e) => setGeneral((g) => ({ ...g, unidad: e.target.value }))}
                  placeholder="m³, m², ml, kg"
                />
              </Field>
              <Field label="Descripción" full>
                <Input
                  value={general.descripcion}
                  onChange={(e) => setGeneral((g) => ({ ...g, descripcion: e.target.value }))}
                />
              </Field>
              <Field label="Cantidad">
                <Input
                  type="number"
                  value={general.cantidad}
                  onChange={(e) => setGeneral((g) => ({ ...g, cantidad: e.target.value }))}
                />
              </Field>
              <Field label="Costo indirecto (%)">
                <Input
                  type="number"
                  value={general.indirectos}
                  onChange={(e) => setGeneral((g) => ({ ...g, indirectos: e.target.value }))}
                />
              </Field>
              <Field label="Utilidad (%)">
                <Input
                  type="number"
                  value={general.utilidad}
                  onChange={(e) => setGeneral((g) => ({ ...g, utilidad: e.target.value }))}
                />
              </Field>
            </TabsContent>

            <TabsContent value="materiales" className="mt-4">
              <TablaInsumos items={materiales} onChange={setMateriales} />
            </TabsContent>
            <TabsContent value="equipos" className="mt-4">
              <TablaInsumos items={equipos} onChange={setEquipos} />
            </TabsContent>
            <TabsContent value="mano" className="mt-4">
              <TablaInsumos items={manoObra} onChange={setManoObra} />
            </TabsContent>

            <TabsContent value="resumen" className="mt-4">
              <dl className="grid grid-cols-2 gap-4">
                <div className="panel p-4">
                  <dt className="label-kicker">Costo directo</dt>
                  <dd className="stat-value mt-1">Bs {money2(calc.directo)}</dd>
                </div>
                <div className="panel p-4">
                  <dt className="label-kicker">Costo indirecto</dt>
                  <dd className="stat-value mt-1">Bs {money2(calc.indirecto)}</dd>
                </div>
                <div className="panel p-4">
                  <dt className="label-kicker">Utilidad</dt>
                  <dd className="stat-value mt-1">Bs {money2(calc.utilidad)}</dd>
                </div>
                <div className="panel p-4">
                  <dt className="label-kicker">Precio unitario</dt>
                  <dd className="stat-value mt-1 text-primary">Bs {money2(calc.precio)}</dd>
                </div>
              </dl>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={saving}>
              Guardar APU
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
