import { useEffect, useRef, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, MapPin, Camera as CameraIcon, User, ImageIcon, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
import { usePermisos, fecha, type Fotografia } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { compressImage, formatBytes } from "@/lib/compress-image";
import { setFilePickingBusy } from "@/lib/ui-busy";
import {
  signedUrl,
  useAddFotografia,
  useDeleteFotografia,
  useFotografias,
  useProyectos,
  useUpdateFotografia,
} from "@/lib/obra/hooks";

export const Route = createFileRoute("/fotografias")({
  validateSearch: (s: Record<string, unknown>) => ({
    proyecto: typeof s["proyecto"] === "string" ? s["proyecto"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Fotografías de avance de obra — SIGOC" },
      {
        name: "description",
        content:
          "Galería fotográfica del avance de obra con fecha, ubicación, autor y descripción por proyecto.",
      },
    ],
  }),
  component: FotografiasPage,
});

function FotoImg({ path, alt }: { path: string; alt: string }) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    let alive = true;
    if (!path || path.startsWith("data:") || path.startsWith("blob:")) {
      setSrc(path);
      return;
    }
    void signedUrl("fotografias", path)
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        if (alive) setSrc("");
      });
    return () => {
      alive = false;
    };
  }, [path]);
  if (!src) {
    return (
      <div className="brand-surface flex h-full w-full flex-col items-center justify-center gap-2 opacity-90">
        <CameraIcon className="size-7" />
        <span className="text-xs">Avance de obra</span>
      </div>
    );
  }
  return <img src={src} alt={alt} className="h-full w-full object-contain" loading="lazy" />;
}

function FotografiasPage() {
  const search = useSearch({ from: "/fotografias" });
  const { profile } = useAuth();
  const { data: projects = [], isLoading: loadingProj } = useProyectos();
  const { data: fotografias = [], isLoading } = useFotografias();
  const addFoto = useAddFotografia();
  const updateFoto = useUpdateFotografia();
  const delFoto = useDeleteFotografia();
  const { puedeVer, puedeEditar, role } = usePermisos();
  const editable = puedeEditar("fotografias");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Fotografia | null>(null);
  const [touched, setTouched] = useState(false);
  const [preview, setPreview] = useState("");
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [sizeInfo, setSizeInfo] = useState("");
  const pickingFileRef = useRef(false);
  const [form, setForm] = useState({
    proyectoId: "",
    fecha: "",
    descripcion: "",
    ubicacion: "",
    autor: "",
  });

  useEffect(() => {
    const pref = search.proyecto && projects.some((p) => p.id === search.proyecto)
      ? search.proyecto
      : projects[0]?.id ?? "";
    setForm((f) => ({
      ...f,
      proyectoId: f.proyectoId || pref,
      autor: f.autor || profile?.nombre || role,
    }));
  }, [projects, search.proyecto, profile?.nombre, role]);

  const errores: Record<string, string> = {};
  if (!form.proyectoId) errores["proyectoId"] = "Seleccione un proyecto.";
  if (!form.fecha) errores["fecha"] = "Fecha requerida.";
  if (form.descripcion.trim().length < 5) errores["descripcion"] = "Mínimo 5 caracteres.";
  if (!editing && !compressedFile) errores["imagen"] = "Seleccione una imagen.";

  const onPickFile = async (file: File | undefined) => {
    if (!file) {
      pickingFileRef.current = false;
      setFilePickingBusy(false);
      return;
    }
    pickingFileRef.current = true;
    setFilePickingBusy(true);
    setOpen(true);

    // Vista previa inmediata (antes de comprimir) para no “perder” la foto en móvil.
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    const quickUrl = URL.createObjectURL(file);
    setPreview(quickUrl);
    setCompressedFile(file);
    setSizeInfo("Procesando imagen…");

    try {
      const result = await compressImage(file);
      if (quickUrl.startsWith("blob:")) URL.revokeObjectURL(quickUrl);
      setCompressedFile(result.file);
      setPreview(result.previewUrl);
      if (result.savedRatio > 0.01) {
        const pct = Math.round(result.savedRatio * 100);
        setSizeInfo(
          `${formatBytes(result.originalBytes)} → ${formatBytes(result.compressedBytes)} (−${pct}%)`,
        );
      } else {
        setSizeInfo(
          `${formatBytes(result.originalBytes)} (ya era liviana; se mantiene el original)`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo comprimir";
      toast.error(msg);
      setSizeInfo("");
    } finally {
      // Mantener el diálogo protegido un poco más tras volver de la cámara.
      window.setTimeout(() => {
        pickingFileRef.current = false;
        setFilePickingBusy(false);
      }, 2000);
    }
  };

  const beginPickFile = () => {
    pickingFileRef.current = true;
    setFilePickingBusy(true);
  };

  // Cancelar cámara/galería sin onChange dejaba el X bloqueado en móvil.
  useEffect(() => {
    const onReturn = () => {
      window.setTimeout(() => {
        if (!pickingFileRef.current) return;
        if (sizeInfo.startsWith("Procesando")) return;
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
  }, [sizeInfo]);

  const quitarFoto = () => {
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview("");
    setCompressedFile(null);
    setSizeInfo("");
  };

  const resetForm = () => {
    setEditing(null);
    setTouched(false);
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview("");
    setCompressedFile(null);
    setSizeInfo("");
    setForm((f) => ({ ...f, fecha: "", descripcion: "", ubicacion: "" }));
  };

  const abrirNuevo = () => {
    resetForm();
    setOpen(true);
  };

  const abrirEditar = (f: Fotografia) => {
    setEditing(f);
    setForm({
      proyectoId: f.proyectoId,
      fecha: f.fecha,
      descripcion: f.descripcion,
      ubicacion: f.ubicacion,
      autor: f.autor,
    });
    setCompressedFile(null);
    setPreview("");
    setSizeInfo("");
    setTouched(false);
    setOpen(true);
  };

  const guardar = async () => {
    if (Object.keys(errores).length) {
      setTouched(true);
      toast.error("Revise los campos marcados.");
      return;
    }
    try {
      if (editing) {
        await updateFoto.mutateAsync({
          id: editing.id,
          proyectoId: form.proyectoId,
          fecha: form.fecha,
          descripcion: form.descripcion.trim(),
          ubicacion: form.ubicacion.trim(),
          autor: form.autor || profile?.nombre || role,
        });
        toast.success("Fotografía actualizada.");
      } else {
        await addFoto.mutateAsync({
          proyectoId: form.proyectoId,
          fecha: form.fecha,
          descripcion: form.descripcion.trim(),
          ubicacion: form.ubicacion.trim(),
          autor: form.autor || profile?.nombre || role,
          file: compressedFile!,
        });
        toast.success("Fotografía subida correctamente.");
      }
      setOpen(false);
      resetForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar";
      toast.error(msg);
    }
  };

  if (!puedeVer("fotografias")) return <AccesoDenegado modulo="Fotografías" />;

  return (
    <div>
      <PageHeader
        kicker="Registro visual"
        title="Fotografías"
        description="Evidencia fotográfica del avance físico (imágenes comprimidas automáticamente)."
        action={
          editable ? (
            <Button onClick={abrirNuevo} className="gap-2" disabled={!projects.length}>
              <Plus className="size-4" /> Nueva Fotografía
            </Button>
          ) : null
        }
      />

      {isLoading || loadingProj ? (
        <p className="text-sm text-muted-foreground">Cargando fotografías…</p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {fotografias.map((f) => (
          <figure key={f.id} className="panel overflow-hidden">
            <div className="relative flex aspect-video items-center justify-center bg-muted">
              <FotoImg path={f.imagen} alt={f.descripcion} />
              <Badge variant="outline" className="absolute top-3 left-3 bg-card">
                {projects.find((p) => p.id === f.proyectoId)?.codigo ?? "—"}
              </Badge>
            </div>
            <figcaption className="p-4">
              <p className="font-medium text-foreground">{f.descripcion}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" /> {f.ubicacion || "Sin ubicación"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <User className="size-3.5" /> {f.autor}
                </span>
                <span>{fecha(f.fecha)}</span>
              </div>
              {editable ? (
                <div className="mt-2 flex flex-wrap gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 px-0 hover:bg-transparent"
                    onClick={() => abrirEditar(f)}
                  >
                    <Pencil className="size-4" /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 px-0 text-destructive hover:bg-transparent"
                    onClick={() => {
                      void delFoto.mutateAsync(f).then(
                        () => toast.success("Fotografía eliminada."),
                        (err: Error) => toast.error(err.message),
                      );
                    }}
                  >
                    <Trash2 className="size-4" /> Eliminar
                  </Button>
                </div>
              ) : null}
            </figcaption>
          </figure>
        ))}
        {!isLoading && !fotografias.length ? (
          <p className="text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
            Aún no hay fotografías. Suba la primera evidencia de avance.
          </p>
        ) : null}
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          // En móvil, abrir la cámara dispara dismiss del diálogo; no resetear ni cerrar.
          if (!v && pickingFileRef.current) {
            setOpen(true);
            return;
          }
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent
          className="sm:max-w-lg"
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
              {editing ? "Editar Fotografía" : "Nueva Fotografía"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Actualice fecha, ubicación y descripción. La imagen se conserva."
                : "La imagen se comprime automáticamente antes de guardarla."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Proyecto" full error={touched ? errores["proyectoId"] : undefined}>
              <Select
                value={form.proyectoId}
                onValueChange={(v) => setForm((f) => ({ ...f, proyectoId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione" />
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
            <Field label="Fecha" error={touched ? errores["fecha"] : undefined}>
              <DateInput
                value={form.fecha}
                onChange={(v) => setForm((f) => ({ ...f, fecha: v }))}
              />
            </Field>
            <Field label="Ubicación">
              <Input
                value={form.ubicacion}
                onChange={(e) => setForm((f) => ({ ...f, ubicacion: e.target.value }))}
                placeholder="Km 2+400 / Eje 3"
              />
            </Field>
            <Field label="Descripción" error={touched ? errores["descripcion"] : undefined} full>
              <Textarea
                rows={3}
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              />
            </Field>
            {!editing ? (
              <>
                <Field label="Imagen o foto" full error={touched ? errores["imagen"] : undefined}>
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
                          void onPickFile(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <label
                      className="flex cursor-pointer flex-col gap-1 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                      onPointerDown={beginPickFile}
                    >
                      <span className="flex items-center gap-2">
                        <CameraIcon className="size-4" /> Cámara
                      </span>
                      <span className="text-xs">Tomar foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          void onPickFile(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <p className="mt-1.5 truncate text-xs text-muted-foreground">
                    {compressedFile?.name || "Ningún archivo seleccionado"}
                  </p>
                  {sizeInfo ? (
                    <p className="mt-1 text-xs text-muted-foreground">{sizeInfo}</p>
                  ) : null}
                </Field>
                <div className="sm:col-span-2">
                  <p className="label-kicker">Vista previa</p>
                  <div className="relative mt-2 flex min-h-[12rem] max-h-[50vh] items-center justify-center overflow-auto rounded-md border border-dashed border-border bg-muted/50 p-2">
                    {preview ? (
                      <>
                        <img
                          src={preview}
                          alt="Vista previa"
                          className="max-h-[46vh] w-auto max-w-full object-contain"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="absolute top-2 right-2 size-8 rounded-full border border-border bg-background/90 text-destructive shadow-sm hover:bg-background hover:text-destructive"
                          onClick={quitarFoto}
                          aria-label="Quitar foto"
                        >
                          <X className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin imagen seleccionada</span>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void guardar()}
              disabled={addFoto.isPending || updateFoto.isPending}
            >
              {addFoto.isPending || updateFoto.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
