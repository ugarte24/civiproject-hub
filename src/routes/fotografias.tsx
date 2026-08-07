import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2, MapPin, Camera as CameraIcon, User } from "lucide-react";
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
import { useStore, usePermisos, fecha } from "@/lib/store";

export const Route = createFileRoute("/fotografias")({
  head: () => ({
    meta: [
      { title: "Fotografías de avance de obra — SIGOC" },
      {
        name: "description",
        content:
          "Galería fotográfica del avance de obra con fecha, ubicación, autor y descripción por proyecto.",
      },
      { property: "og:title", content: "Fotografías — SIGOC" },
      {
        property: "og:description",
        content: "Registro visual del avance físico de cada proyecto civil.",
      },
    ],
  }),
  component: FotografiasPage,
});

function FotografiasPage() {
  const { fotografias, projects, addFotografia, removeFotografia, role } = useStore();
  const { puedeVer, puedeEditar } = usePermisos();
  const editable = puedeEditar("fotografias");
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [preview, setPreview] = useState("");
  const [form, setForm] = useState({
    proyectoId: projects[0]?.id ?? "",
    fecha: "",
    descripcion: "",
    ubicacion: "",
    autor: role,
    imagen: "",
  });

  const errores: Record<string, string> = {};
  if (!form.fecha) errores["fecha"] = "Fecha requerida.";
  if (form.descripcion.trim().length < 5) errores["descripcion"] = "Mínimo 5 caracteres.";

  const guardar = () => {
    if (Object.keys(errores).length) {
      setTouched(true);
      toast.error("❌ Error al guardar los datos. Revise los campos marcados.");
      return;
    }
    addFotografia({ ...form, imagen: preview });
    toast.success("📷 Fotografía subida correctamente.");
    setOpen(false);
    setTouched(false);
    setPreview("");
    setForm((f) => ({ ...f, fecha: "", descripcion: "", ubicacion: "", imagen: "" }));
  };

  if (!puedeVer("fotografias")) return <AccesoDenegado modulo="Fotografías" />;

  return (
    <div>
      <PageHeader
        kicker="Registro visual"
        title="Fotografías"
        description="Evidencia fotográfica del avance físico, georreferenciada por ubicación y autor."
        action={
          editable ? (
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="size-4" /> Nueva Fotografía
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {fotografias.map((f) => (
          <figure key={f.id} className="panel overflow-hidden">
            <div className="relative aspect-video bg-muted">
              {f.imagen ? (
                <img
                  src={f.imagen}
                  alt={f.descripcion}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="brand-surface flex h-full w-full flex-col items-center justify-center gap-2 opacity-90">
                  <CameraIcon className="size-7" />
                  <span className="text-xs">Avance de obra</span>
                </div>
              )}
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 gap-2 px-0 text-destructive hover:bg-transparent"
                  onClick={() => {
                    removeFotografia(f.id);
                    toast.success("🗑️ Fotografía eliminada correctamente.");
                  }}
                >
                  <Trash2 className="size-4" /> Eliminar
                </Button>
              ) : null}
            </figcaption>
          </figure>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide uppercase">
              Nueva Fotografía
            </DialogTitle>
            <DialogDescription>Adjunte la imagen del avance y su descripción.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Proyecto" full>
              <Select
                value={form.proyectoId}
                onValueChange={(v) => setForm((f) => ({ ...f, proyectoId: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
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
            <Field label="Seleccionar imagen" full>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPreview(URL.createObjectURL(file));
                }}
              />
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
