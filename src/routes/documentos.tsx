import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2, FileText, FileSpreadsheet, FileArchive, PenTool, File } from "lucide-react";
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
import { useStore, usePermisos, fecha, type DocCategoria } from "@/lib/store";

export const Route = createFileRoute("/documentos")({
  head: () => ({
    meta: [
      { title: "Documentos técnicos — SIGEPROC" },
      {
        name: "description",
        content:
          "Repositorio digital de planos, contratos, memorias de cálculo, licitaciones, informes, APU y actas por proyecto.",
      },
      { property: "og:title", content: "Documentos — SIGEPROC" },
      {
        property: "og:description",
        content: "Carga y clasificación de documentación técnica en PDF, Word, Excel, DWG y ZIP.",
      },
    ],
  }),
  component: DocumentosPage,
});

const categorias: DocCategoria[] = [
  "Planos",
  "Contratos",
  "Memorias",
  "Licitaciones",
  "Informes",
  "APU",
  "Actas",
];

const iconoPorArchivo = (nombre: string) => {
  const ext = nombre.split(".").pop()?.toLowerCase();
  if (ext === "dwg") return PenTool;
  if (ext === "xlsx" || ext === "xls") return FileSpreadsheet;
  if (ext === "zip") return FileArchive;
  if (ext === "pdf" || ext === "docx") return FileText;
  return File;
};

function DocumentosPage() {
  const { documentos, projects, addDocumento, removeDocumento } = useStore();
  const { puedeVer, puedeEditar } = usePermisos();
  const editable = puedeEditar("documentos");
  const [cat, setCat] = useState<string>("todas");
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    categoria: "Planos" as DocCategoria,
    proyectoId: projects[0]?.id ?? "",
    archivo: "",
    descripcion: "",
  });

  const errores: Record<string, string> = {};
  if (form.nombre.trim().length < 4) errores["nombre"] = "Mínimo 4 caracteres.";
  if (!form.archivo) errores["archivo"] = "Seleccione un archivo (PDF, Word, Excel, DWG o ZIP).";

  const lista = documentos.filter((d) => cat === "todas" || d.categoria === cat);

  const guardar = () => {
    if (Object.keys(errores).length) {
      setTouched(true);
      toast.error("❌ Error al guardar los datos. Revise los campos marcados.");
      return;
    }
    addDocumento(form);
    toast.success("📄 Documento cargado correctamente.");
    setOpen(false);
    setTouched(false);
    setForm((f) => ({ ...f, nombre: "", archivo: "", descripcion: "" }));
  };

  if (!puedeVer("documentos")) return <AccesoDenegado modulo="Documentos" />;

  return (
    <div>
      <PageHeader
        kicker="Archivo digital"
        title="Documentos"
        description="Formatos admitidos: PDF, Word, Excel, DWG y ZIP, clasificados por categoría y proyecto."
        action={
          editable ? (
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="size-4" /> Subir Documento
            </Button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          variant={cat === "todas" ? "default" : "outline"}
          size="sm"
          onClick={() => setCat("todas")}
        >
          Todas
        </Button>
        {categorias.map((c) => (
          <Button
            key={c}
            variant={cat === c ? "default" : "outline"}
            size="sm"
            onClick={() => setCat(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lista.map((d) => {
          const Icono = iconoPorArchivo(d.archivo);
          return (
            <article key={d.id} className="panel flex gap-4 p-5">
              <div className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <Icono className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-medium text-foreground">{d.nombre}</p>
                  <Badge variant="outline">{d.categoria}</Badge>
                </div>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                  {d.archivo} · {d.peso}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{d.descripcion}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {projects.find((p) => p.id === d.proyectoId)?.codigo ?? "—"} · {fecha(d.fecha)}
                  </span>
                  {editable ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => {
                        removeDocumento(d.id);
                        toast.success("🗑️ Documento eliminado correctamente.");
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!lista.length ? (
        <p className="panel p-10 text-center text-sm text-muted-foreground">
          No hay documentos en esta categoría.
        </p>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide uppercase">
              Subir Documento
            </DialogTitle>
            <DialogDescription>Clasifique el archivo por categoría y proyecto.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Documento" error={touched ? errores["nombre"] : undefined} full>
              <Input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </Field>
            <Field label="Categoría">
              <Select
                value={form.categoria}
                onValueChange={(v) => setForm((f) => ({ ...f, categoria: v as DocCategoria }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Proyecto">
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
                      {p.codigo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Archivo" error={touched ? errores["archivo"] : undefined} full>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.zip"
                onChange={(e) =>
                  setForm((f) => ({ ...f, archivo: e.target.files?.[0]?.name ?? "" }))
                }
              />
            </Field>
            <Field label="Descripción" full>
              <Textarea
                rows={3}
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
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
