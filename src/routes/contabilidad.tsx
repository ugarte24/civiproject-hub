import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Paperclip, ImageIcon, Camera, Trash2, ExternalLink, Pencil, X } from "lucide-react";
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
import { ConsultarProyectoPanel, ProyectoSeleccionadoBar } from "@/components/ConsultarProyecto";
import { Field } from "@/components/Field";
import { DateInput } from "@/components/DateInput";
import { usePermisos, money, fecha, type Movimiento, type MovimientoTipo } from "@/lib/store";
import { compressImage, formatBytes } from "@/lib/compress-image";
import { compressPdf } from "@/lib/compress-pdf";
import { setFilePickingBusy } from "@/lib/ui-busy";
import {
  signedUrl,
  useAddMovimiento,
  useDeleteMovimiento,
  useMovimientos,
  useProyectos,
  useUpdateMovimiento,
} from "@/lib/obra/hooks";

export const Route = createFileRoute("/contabilidad")({
  validateSearch: (s: Record<string, unknown>) => ({
    proyecto: typeof s["proyecto"] === "string" ? s["proyecto"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Contabilidad — SIGOC" },
      {
        name: "description",
        content:
          "Registro de ingresos, egresos, facturas, pagos y planillas de los proyectos civiles.",
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

const tabs: MovimientoTipo[] = ["Ingreso", "Egreso", "Factura", "Pago", "Planilla"];

function ContabilidadPage() {
  const search = useSearch({ from: "/contabilidad" });
  const navigate = useNavigate({ from: "/contabilidad" });
  const { data: projects = [] } = useProyectos();
  const { data: movimientos = [] } = useMovimientos();
  const addMut = useAddMovimiento();
  const updateMut = useUpdateMovimiento();
  const delMut = useDeleteMovimiento();
  const { puedeVer, puedeEditar } = usePermisos();
  const editable = puedeEditar("contabilidad");
  const [tab, setTab] = useState<MovimientoTipo>("Ingreso");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Movimiento | null>(null);
  const [touched, setTouched] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfSizeInfo, setPdfSizeInfo] = useState("");
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState("");
  const [imgSizeInfo, setImgSizeInfo] = useState("");
  const pickingFileRef = useRef(false);
  const [form, setForm] = useState({
    proveedor: "",
    nit: "",
    numero: "",
    monto: "",
    fecha: "",
    observacion: "",
    proyectoId: "",
    tipo: "Ingreso" as MovimientoTipo,
  });

  useEffect(() => {
    if (search.proyecto && projects.some((p) => p.id === search.proyecto)) {
      setForm((f) => (f.proyectoId === search.proyecto ? f : { ...f, proyectoId: search.proyecto! }));
    }
  }, [projects, search.proyecto]);

  // Si cancelan cámara/galería sin onChange, el candado queda pegado y el X no cerraba.
  useEffect(() => {
    const onReturn = () => {
      window.setTimeout(() => {
        if (!pickingFileRef.current) return;
        if (pdfSizeInfo.startsWith("Procesando") || imgSizeInfo.startsWith("Procesando")) return;
        pickingFileRef.current = false;
        setFilePickingBusy(false);
      }, 900);
    };
    window.addEventListener("focus", onReturn);
    const onVis = () => {
      if (document.visibilityState === "visible") onReturn();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pdfSizeInfo, imgSizeInfo]);

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

  const pickImage = async (file: File | null) => {
    setOpen(true);
    if (!file) {
      setImgPreview((prev) => {
        if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return "";
      });
      setImgFile(null);
      setImgSizeInfo("");
      window.setTimeout(() => {
        pickingFileRef.current = false;
        setFilePickingBusy(false);
      }, 800);
      return;
    }

    setPdfFile(null);
    setPdfSizeInfo("");
    // Vista previa inmediata mientras se comprime
    setImgPreview((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setImgFile(file);
    setImgSizeInfo("Procesando imagen…");

    try {
      const result = await compressImage(file);
      setImgPreview((prev) => {
        if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return result.previewUrl;
      });
      setImgFile(result.file);
      if (result.savedRatio > 0.01) {
        const pct = Math.round(result.savedRatio * 100);
        setImgSizeInfo(
          `${formatBytes(result.originalBytes)} → ${formatBytes(result.compressedBytes)} (−${pct}%)`,
        );
      } else {
        setImgSizeInfo(
          `${formatBytes(result.originalBytes)} (ya era liviana; se mantiene el original)`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo comprimir";
      toast.error(msg);
      setImgSizeInfo("");
    } finally {
      window.setTimeout(() => {
        pickingFileRef.current = false;
        setFilePickingBusy(false);
      }, 800);
    }
  };

  const beginPickFile = () => {
    pickingFileRef.current = true;
    setFilePickingBusy(true);
  };

  const pickPdf = async (file: File | null) => {
    setOpen(true);
    if (!file) {
      setPdfFile(null);
      setPdfSizeInfo("");
      window.setTimeout(() => {
        pickingFileRef.current = false;
        setFilePickingBusy(false);
      }, 800);
      return;
    }

    setImgFile(null);
    clearImgPreview();
    setImgSizeInfo("");
    setPdfFile(file);
    setPdfSizeInfo("Procesando PDF…");

    try {
      const result = await compressPdf(file);
      setPdfFile(result.file);
      if (result.previewUrl.startsWith("blob:")) URL.revokeObjectURL(result.previewUrl);
      if (result.savedRatio > 0.01) {
        const pct = Math.round(result.savedRatio * 100);
        setPdfSizeInfo(
          `${formatBytes(result.originalBytes)} → ${formatBytes(result.compressedBytes)} (−${pct}%)`,
        );
      } else {
        setPdfSizeInfo(
          `${formatBytes(result.originalBytes)} (ya era liviano; se mantiene el original)`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo comprimir el PDF";
      toast.error(msg);
      setPdfSizeInfo("");
    } finally {
      window.setTimeout(() => {
        pickingFileRef.current = false;
        setFilePickingBusy(false);
      }, 800);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setPdfFile(null);
    setPdfSizeInfo("");
    setImgFile(null);
    clearImgPreview();
    setImgSizeInfo("");
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
    setForm((f) => ({
      ...f,
      tipo: tipo ?? tab,
      proyectoId: search.proyecto && projects.some((p) => p.id === search.proyecto)
        ? search.proyecto
        : f.proyectoId,
    }));
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
    setPdfSizeInfo("");
    setImgFile(null);
    clearImgPreview();
    setImgSizeInfo("");
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
    const tipoGuardado = form.tipo;
    void mut
      .then(() => {
        toast.success(
          editing ? "Movimiento actualizado." : `${tipoGuardado} registrado correctamente.`,
        );
        setTab(tipoGuardado);
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

  const proyectoId =
    search.proyecto && projects.some((p) => p.id === search.proyecto) ? search.proyecto : "";
  const proyecto = projects.find((p) => p.id === proyectoId);
  const filtrados = movimientos.filter((m) => m.proyectoId === proyectoId);
  const ingresos = filtrados.filter((m) => m.tipo === "Ingreso").reduce((a, m) => a + m.monto, 0);
  const egresos = filtrados
    .filter((m) => ["Egreso", "Pago", "Factura"].includes(m.tipo))
    .reduce((a, m) => a + m.monto, 0);

  const seleccionarProyecto = (id: string) => {
    setForm((f) => ({ ...f, proyectoId: id }));
    void navigate({ search: { proyecto: id }, replace: true });
  };

  const cambiarProyecto = () => {
    setOpen(false);
    resetForm();
    setForm((f) => ({ ...f, proyectoId: "" }));
    void navigate({ search: { proyecto: undefined }, replace: true });
  };

  return (
    <div>
      <PageHeader
        kicker="Módulo económico"
        title="Contabilidad"
        description="Movimientos financieros del portafolio. Este módulo no expone planos, APU ni memorias de cálculo."
        action={
          editable && proyectoId ? (
            <Button onClick={() => abrirNuevo()} className="gap-2">
              <Plus className="size-4" /> Nuevo movimiento
            </Button>
          ) : null
        }
      />

      {!proyectoId ? (
        <ConsultarProyectoPanel
          projects={projects}
          hint="Escriba el código (ej. 001) o parte del nombre del proyecto para ver su contabilidad."
          onSelect={seleccionarProyecto}
        />
      ) : (
        <>
          <ProyectoSeleccionadoBar proyecto={proyecto} onChange={cambiarProyecto} />

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
                  {`${t}s`}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {tabs.map((t) => {
            const lista = filtrados.filter((m) => m.tipo === t);
            return (
              <TabsContent key={t} value={t} className="mt-4">
                {/* Vista móvil: tarjetas */}
                <div className="space-y-3 md:hidden">
                  {lista.map((m) => {
                    const proyecto = projects.find((p) => p.id === m.proyectoId);
                    return (
                      <article
                        key={m.id}
                        className="rounded-lg border border-border bg-card p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium leading-snug text-foreground">
                              {m.proveedor}
                            </p>
                            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                              N.º {m.numero}
                              {m.nit ? ` · NIT ${m.nit}` : ""}
                            </p>
                          </div>
                          <p className="shrink-0 text-right text-sm font-semibold tabular-nums">
                            {money(m.monto)}
                          </p>
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <dt className="text-muted-foreground">Proyecto</dt>
                            <dd className="truncate font-medium">
                              {proyecto
                                ? `${proyecto.codigo} — ${proyecto.nombre}`
                                : "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Fecha</dt>
                            <dd className="font-medium">{fecha(m.fecha)}</dd>
                          </div>
                          {m.observacion ? (
                            <div className="col-span-2">
                              <dt className="text-muted-foreground">Observación</dt>
                              <dd className="line-clamp-2">{m.observacion}</dd>
                            </div>
                          ) : null}
                        </dl>
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                          {m.adjuntoPath ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => void verAdjunto(m.adjuntoPath!)}
                            >
                              <ExternalLink className="size-3.5" />
                              Adjunto
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin adjunto</span>
                          )}
                          {editable ? (
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
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                  {!lista.length ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      Sin registros de este proyecto en esta sección.
                    </p>
                  ) : null}
                </div>

                {/* Vista desktop: tabla */}
                <div className="hidden overflow-x-auto md:block">
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
                          <TableCell
                            colSpan={9}
                            className="py-10 text-center text-sm text-muted-foreground"
                          >
                            Sin registros de este proyecto en esta sección.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
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
          className="sm:max-w-xl"
          onCloseClick={() => {
            pickingFileRef.current = false;
            setFilePickingBusy(false);
          }}
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
              {proyecto
                ? `${proyecto.codigo} — ${proyecto.nombre}`
                : editing
                  ? "Puede reemplazar el adjunto si lo desea."
                  : "Adjunte el respaldo digital del comprobante (opcional)."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Proyecto" full>
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                {proyecto
                  ? `${proyecto.codigo} — ${proyecto.nombre}`
                  : "—"}
              </div>
            </Field>
            <Field label="Tipo" full>
              <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tabs.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
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
            <Field label="Fecha" error={touched ? errores["fecha"] : undefined} full>
              <DateInput value={form.fecha} onChange={(v) => set("fecha", v)} />
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
                    void pickPdf(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </label>
              {pdfSizeInfo ? (
                <p className="mt-1 text-xs text-muted-foreground">{pdfSizeInfo}</p>
              ) : null}
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
                      void pickImage(e.target.files?.[0] ?? null);
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
                      void pickImage(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <p className="mt-1.5 truncate text-xs text-muted-foreground">
                {imgFile?.name || "Ningún archivo seleccionado"}
              </p>
              {imgSizeInfo ? (
                <p className="mt-1 text-xs text-muted-foreground">{imgSizeInfo}</p>
              ) : null}
              <div className="relative mt-2 flex min-h-[10rem] max-h-[40vh] items-center justify-center overflow-auto rounded-md border border-dashed border-border bg-muted/50 p-2">
                {imgPreview ? (
                  <>
                    <img
                      src={imgPreview}
                      alt="Vista previa"
                      className="max-h-[36vh] w-auto max-w-full object-contain"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute top-2 right-2 size-8 rounded-full border border-border bg-background/90 text-destructive shadow-sm hover:bg-background hover:text-destructive"
                      onClick={() => void pickImage(null)}
                      aria-label="Quitar foto"
                    >
                      <X className="size-4" />
                    </Button>
                  </>
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
        </>
      )}
    </div>
  );
}
