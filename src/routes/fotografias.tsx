import { useEffect, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, MapPin, Camera as CameraIcon, User } from "lucide-react";
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
  return <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />;
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
    if (!file) return;
    try {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      const result = await compressImage(file);
      setCompressedFile(result.file);
      setPreview(result.previewUrl);
      setSizeInfo(
        `${formatBytes(result.originalBytes)} → ${formatBytes(result.compressedBytes)} (comprimida)`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo comprimir";
      toast.error(msg);
    }
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
            <div className="relative aspect-video bg-muted">
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
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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
                <Field label="Seleccionar imagen" full error={touched ? errores["imagen"] : undefined}>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void onPickFile(e.target.files?.[0])}
                  />
                  {sizeInfo ? (
                    <p className="mt-1 text-xs text-muted-foreground">{sizeInfo}</p>
                  ) : null}
                </Field>
                <div className="sm:col-span-2">
                  <p className="label-kicker">Vista previa</p>
                  <div className="mt-2 grid aspect-video place-items-center overflow-hidden rounded-md border border-dashed border-border bg-muted/50">
                    {preview ? (
                      <img src={preview} alt="Vista previa" className="h-full w-full object-cover" />
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
