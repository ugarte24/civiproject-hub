import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Paperclip, ImageIcon, Camera, Trash2, ExternalLink, Pencil } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
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
import { usePermisos, money, fecha, type Movimiento, type MovimientoTipo } from "@/lib/store";
import {
  signedUrl,
  useAddMovimiento,
  useDeleteMovimiento,
  useMovimientos,
  useProyectos,
  useUpdateMovimiento,
} from "@/lib/obra/hooks";

export const Route = createFileRoute("/contabilidad")({
  head: () => ({
    meta: [
      { title: "Contabilidad — SIGOC" },
      {
        name: "description",
        content:
          "Registro de ingresos, egresos, facturas, pagos, retenciones y planillas de los proyectos civiles.",
      },
      { property: "og:title", content: "Contabilidad — SIGOC" },
      {
        property: "og:description",
        content: "Módulo económico con acceso exclusivo para el rol Contabilidad.",
      },
    ],
  }),
  component: ContabilidadPage,
});

const tabs: MovimientoTipo[] = ["Ingreso", "Egreso", "Factura", "Pago", "Retencion", "Planilla"];

function ContabilidadPage() {
  const { data: projects = [] } = useProyectos();
  const { data: movimientos = [] } = useMovimientos();
  const addMut = useAddMovimiento();
  const updateMut = useUpdateMovimiento();
  const delMut = useDeleteMovimiento();
  const { puedeVer, puedeEditar } = usePermisos();
  const editable = puedeEditar("contabilidad");
  const [tab, setTab] = useState<MovimientoTipo>("Factura");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Movimiento | null>(null);
  const [touched, setTouched] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState("");
  const pickingFileRef = useRef(false);
  const [form, setForm] = useState({
    proveedor: "",
    nit: "",
    numero: "",
    monto: "",
    fecha: "",
    observacion: "",
    proyectoId: "",
    tipo: "Factura" as MovimientoTipo,
  });

  useEffect(() => {
    if (!form.proyectoId && projects[0]?.id) {
      setForm((f) => ({ ...f, proyectoId: projects[0]!.id }));
    }
  }, [projects, form.proyectoId]);

  const errores: Record<string, string> = {};
  if (form.proveedor.trim().length < 3) errores["proveedor"] = "Mínimo 3 caracteres.";
  if (!/^\d{5,15}$/.test(form.nit)) errores["nit"] = "NIT numérico de 5 a 15 dígitos.";
  if (!form.numero.trim()) errores["numero"] = "Número requerido.";
  if (!form.monto || Number(form.monto) <= 0) errores["monto"] = "Monto mayor a cero.";
  if (!form.fecha) errores["fecha"] = "Fecha requerida.";
  if (!form.proyectoId) errores["proyectoId"] = "Seleccione un proyecto.";

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const clearImgPreview = () => {
    setImgPreview((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return "";
    });
  };

  const pickImage = (file: File | null) => {
    setOpen(true);
    setImgPreview((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : "";
    });
    setImgFile(file);
    if (file) setPdfFile(null);
    window.setTimeout(() => {
      pickingFileRef.current = false;
    }, 800);
  };

  const beginPickFile = () => {
    pickingFileRef.current = true;
  };

  const resetForm = () => {
    setEditing(null);
    setPdfFile(null);
    setImgFile(null);
    clearImgPreview();
    setTouched(false);
    setForm((f) => ({
      ...f,
      proveedor: "",
      nit: "",
      numero: "",
      monto: "",
      fecha: "",
      observacion: "",
      tipo: tab,
    }));
  };

  const abrirNuevo = (tipo?: MovimientoTipo) => {
    resetForm();
    setForm((f) => ({ ...f, tipo: tipo ?? tab }));
    setOpen(true);
  };

  const abrirEditar = (m: Movimiento) => {
    setEditing(m);
    setForm({
      proveedor: m.proveedor,
      nit: m.nit,
      numero: m.numero,
      monto: String(m.monto),
      fecha: m.fecha,
      observacion: m.observacion,
      proyectoId: m.proyectoId,
      tipo: m.tipo,
    });
    setPdfFile(null);
    setImgFile(null);
    clearImgPreview();
    setTouched(false);
    setOpen(true);
  };

  const guardar = () => {
    if (Object.keys(errores).length) {
      setTouched(true);
      toast.error("Revise los campos marcados.");
      return;
    }
    const file = pdfFile ?? imgFile;
    const payload = {
      tipo: form.tipo,
      proyectoId: form.proyectoId,
      proveedor: form.proveedor.trim(),
      nit: form.nit.trim(),
      numero: form.numero.trim(),
      monto: Number(form.monto),
      fecha: form.fecha,
      observacion: form.observacion.trim(),
      ...(file ? { file } : {}),
    };
    const mut = editing
      ? updateMut.mutateAsync({
          id: editing.id,
          ...payload,
          ...(editing.adjuntoPath ? { adjuntoPath: editing.adjuntoPath } : {}),
        })
      : addMut.mutateAsync(payload);
    void mut
      .then(() => {
        toast.success(editing ? "Movimiento actualizado." : `${form.tipo} registrado correctamente.`);
        setOpen(false);
        resetForm();
      })
      .catch((err: Error) => toast.error(err.message));
  };

  const verAdjunto = async (path: string) => {
    try {
      const url = await signedUrl("documentos", path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo abrir el adjunto.");
    }
  };

  if (!puedeVer("contabilidad")) return <AccesoDenegado modulo="Contabilidad" />;

  const ingresos = movimientos.filter((m) => m.tipo === "Ingreso").reduce((a, m) => a + m.monto, 0);
  const egresos = movimientos
    .filter((m) => ["Egreso", "Pago", "Factura"].includes(m.tipo))
    .reduce((a, m) => a + m.monto, 0);

  return (
    <div>
      <PageHeader
        kicker="Módulo económico"
        title="Contabilidad"
        description="Movimientos financieros del portafolio. Este módulo no expone planos, APU ni memorias de cálculo."
        action={
          editable ? (
            <Button onClick={() => abrirNuevo()} className="gap-2" disabled={!projects.length}>
              <Plus className="size-4" /> Nuevo movimiento
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="panel p-5">
          <p className="label-kicker">Ingresos registrados</p>
          <p className="stat-value mt-2 text-success">{money(ingresos)}</p>
        </div>
        <div className="panel p-5">
          <p className="label-kicker">Egresos y pagos</p>
          <p className="stat-value mt-2 text-destructive">{money(egresos)}</p>
        </div>
        <div className="panel p-5">
          <p className="label-kicker">Resultado</p>
          <p className="stat-value mt-2">{money(ingresos - egresos)}</p>
        </div>
      </div>

      <div className="panel mt-4 p-3 sm:p-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as MovimientoTipo)}>
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="inline-flex h-auto min-w-full w-max flex-nowrap justify-start gap-1">
              {tabs.map((t) => (
                <TabsTrigger key={t} value={t} className="shrink-0">
                  {t === "Retencion" ? "Retenciones" : `${t}s`}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {tabs.map((t) => {
            const lista = movimientos.filter((m) => m.tipo === t);
            return (
              <TabsContent key={t} value={t} className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Número</TableHead>
                      <TableHead>Proveedor / concepto</TableHead>
                      <TableHead>NIT</TableHead>
                      <TableHead>Proyecto</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Observación</TableHead>
                      <TableHead>Adjunto</TableHead>
                      {editable ? <TableHead /> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lista.map((m) => (
                      <TableRow key={m.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs">{m.numero}</TableCell>
                        <TableCell className="font-medium">{m.proveedor}</TableCell>
                        <TableCell className="text-sm">{m.nit}</TableCell>
                        <TableCell className="text-sm">
                          {projects.find((p) => p.id === m.proyectoId)?.codigo ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">{fecha(m.fecha)}</TableCell>
                        <TableCell className="text-right font-medium">{money(m.monto)}</TableCell>
                        <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                          {m.observacion}
                        </TableCell>
                        <TableCell>
                          {m.adjuntoPath ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void verAdjunto(m.adjuntoPath!)}
                              aria-label="Ver adjunto"
                            >
                              <ExternalLink className="size-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        {editable ? (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => abrirEditar(m)}
                                aria-label="Editar"
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
                                    .mutateAsync({
                                      id: m.id,
                                      ...(m.adjuntoPath ? { adjuntoPath: m.adjuntoPath } : {}),
                                    })
                                    .then(() => toast.success("Registro eliminado."))
                                    .catch((err: Error) => toast.error(err.message));
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
                        <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                          Sin registros en esta sección.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v && pickingFileRef.current) {
            setOpen(true);
            return;
          }
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
          onPointerDownOutside={(e) => {
            if (pickingFileRef.current) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (pickingFileRef.current) e.preventDefault();
          }}
          onFocusOutside={(e) => {
            if (pickingFileRef.current) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide uppercase">
              {editing ? "Editar movimiento" : "Registrar movimiento"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Puede reemplazar el adjunto si lo desea."
                : "Adjunte el respaldo digital del comprobante (opcional)."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tipo" full>
              <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tabs.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === "Retencion" ? "Retención" : t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Proveedor / concepto" error={touched ? errores["proveedor"] : undefined} full>
              <Input value={form.proveedor} onChange={(e) => set("proveedor", e.target.value)} />
            </Field>
            <Field label="NIT" error={touched ? errores["nit"] : undefined}>
              <Input value={form.nit} onChange={(e) => set("nit", e.target.value)} />
            </Field>
            <Field label="Número" error={touched ? errores["numero"] : undefined}>
              <Input value={form.numero} onChange={(e) => set("numero", e.target.value)} />
            </Field>
            <Field label="Monto (Bs)" error={touched ? errores["monto"] : undefined}>
              <Input type="number" value={form.monto} onChange={(e) => set("monto", e.target.value)} />
            </Field>
            <Field label="Fecha" error={touched ? errores["fecha"] : undefined}>
              <DateInput value={form.fecha} onChange={(v) => set("fecha", v)} />
            </Field>
            <Field label="Proyecto" full error={touched ? errores["proyectoId"] : undefined}>
              <Select value={form.proyectoId} onValueChange={(v) => set("proyectoId", v)}>
                <SelectTrigger>
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
            </Field>
            <Field label="Adjuntar PDF">
              <label
                className="flex cursor-pointer flex-col gap-1 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                onPointerDown={beginPickFile}
              >
                <span className="flex items-center gap-2">
                  <Paperclip className="size-4" /> Seleccionar PDF
                </span>
                <span className="truncate text-xs">
                  {pdfFile?.name || "Ningún archivo seleccionado"}
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setPdfFile(f);
                    if (f) pickImage(null);
                    else pickingFileRef.current = false;
                    e.target.value = "";
                  }}
                />
              </label>
            </Field>
            <Field label="Adjuntar imagen o foto" full>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label
                  className="flex cursor-pointer flex-col gap-1 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                  onPointerDown={beginPickFile}
                >
                  <span className="flex items-center gap-2">
                    <ImageIcon className="size-4" /> Galería
                  </span>
                  <span className="text-xs">Seleccionar imagen</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      pickImage(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                </label>
                <label
                  className="flex cursor-pointer flex-col gap-1 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                  onPointerDown={beginPickFile}
                >
                  <span className="flex items-center gap-2">
                    <Camera className="size-4" /> Cámara
                  </span>
                  <span className="text-xs">Tomar foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      pickImage(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <p className="mt-1.5 truncate text-xs text-muted-foreground">
                {imgFile?.name || "Ningún archivo seleccionado"}
              </p>
              <div className="mt-2 flex min-h-[10rem] max-h-[40vh] items-center justify-center overflow-auto rounded-md border border-dashed border-border bg-muted/50 p-2">
                {imgPreview ? (
                  <img
                    src={imgPreview}
                    alt="Vista previa"
                    className="max-h-[36vh] w-auto max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">Sin imagen seleccionada</span>
                )}
              </div>
            </Field>
            <Field label="Observación" full>
              <Textarea
                rows={3}
                value={form.observacion}
                onChange={(e) => set("observacion", e.target.value)}
              />
            </Field>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={addMut.isPending || updateMut.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
