import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Pencil,
  FileText,
  FileSpreadsheet,
  FileArchive,
  PenTool,
  File,
  Paperclip,
  X,
} from "lucide-react";
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
import { usePermisos, fecha, type DocCategoria, type Documento } from "@/lib/store";
import {
  signedUrl,
  useAddDocumento,
  useDeleteDocumento,
  useDocumentos,
  useProyectos,
  useUpdateDocumento,
} from "@/lib/obra/hooks";
import { setFilePickingBusy } from "@/lib/ui-busy";
import { compressAttachment, formatCompressInfo } from "@/lib/compress-attachment";

export const Route = createFileRoute("/documentos")({
  validateSearch: (s: Record<string, unknown>) => ({
    proyecto: typeof s["proyecto"] === "string" ? s["proyecto"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Documentos técnicos — SIGOC" },
      {
        name: "description",
        content:
          "Repositorio digital de planos, contratos, memorias de cálculo, licitaciones, informes, APU y actas por proyecto.",
      },
      { property: "og:title", content: "Documentos — SIGOC" },
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
  if (ext === "pdf" || ext === "docx" || ext === "doc") return FileText;
  return File;
};

function DocumentosPage() {
  const search = useSearch({ from: "/documentos" });
  const navigate = useNavigate({ from: "/documentos" });
  const { data: projects = [] } = useProyectos();
  const { data: documentos = [] } = useDocumentos();
  const addMut = useAddDocumento();
  const updateMut = useUpdateDocumento();
  const delMut = useDeleteDocumento();
  const { puedeVer, puedeEditar } = usePermisos();
  const editable = puedeEditar("documentos");
  const [cat, setCat] = useState<string>("todas");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Documento | null>(null);
  const [touched, setTouched] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileSizeInfo, setFileSizeInfo] = useState("");
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");
  const [quitarArchivo, setQuitarArchivo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickingFileRef = useRef(false);
  const [form, setForm] = useState({
    nombre: "",
    categoria: "Planos" as DocCategoria,
    proyectoId: "",
    descripcion: "",
  });

  useEffect(() => {
    const pref =
      search.proyecto && projects.some((p) => p.id === search.proyecto)
        ? search.proyecto
        : projects[0]?.id ?? "";
    setForm((f) => ({ ...f, proyectoId: f.proyectoId || pref }));
  }, [projects, search.proyecto]);

  const mostrarArchivo = Boolean(file || (editing && !quitarArchivo));
  const errores: Record<string, string> = {};
  if (form.nombre.trim().length < 4) errores["nombre"] = "Mínimo 4 caracteres.";
  if (!form.proyectoId) errores["proyectoId"] = "Seleccione un proyecto.";
  if (!mostrarArchivo) {
    errores["archivo"] = "Seleccione un archivo (PDF, Word, Excel, DWG o ZIP).";
  }

  const lista = documentos.filter(
    (d) =>
      (cat === "todas" || d.categoria === cat) &&
      (!search.proyecto || d.proyectoId === search.proyecto),
  );
  const filtroProyecto = search.proyecto ?? "todos";

  const clearLocalPreview = () => {
    setLocalPreviewUrl((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return "";
    });
  };

  const resetForm = () => {
    setEditing(null);
    setTouched(false);
    setFile(null);
    setFileSizeInfo("");
    setQuitarArchivo(false);
    clearLocalPreview();
    setForm((f) => ({ ...f, nombre: "", descripcion: "", categoria: "Planos" }));
  };

  const abrirNuevo = () => {
    resetForm();
    setOpen(true);
  };

  const abrirEditar = (d: Documento) => {
    setEditing(d);
    setForm({
      nombre: d.nombre,
      categoria: d.categoria,
      proyectoId: d.proyectoId,
      descripcion: d.descripcion,
    });
    setFile(null);
    setFileSizeInfo("");
    setQuitarArchivo(false);
    clearLocalPreview();
    setTouched(false);
    setOpen(true);
  };

  const quitarArchivoActual = () => {
    setFile(null);
    setFileSizeInfo("");
    clearLocalPreview();
    if (editing) setQuitarArchivo(true);
  };

  const pickFile = async (f: File | null) => {
    setOpen(true);
    if (!f) {
      setFile(null);
      setFileSizeInfo("");
      clearLocalPreview();
      window.setTimeout(() => {
        pickingFileRef.current = false;
        setFilePickingBusy(false);
      }, 800);
      return;
    }

    setFile(f);
    setFileSizeInfo("Procesando archivo…");
    setLocalPreviewUrl((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
    if (!form.nombre.trim()) {
      setForm((prev) => ({
        ...prev,
        nombre: f.name.replace(/\.[^.]+$/, ""),
      }));
    }

    try {
      const result = await compressAttachment(f);
      if (result.previewUrl.startsWith("blob:")) URL.revokeObjectURL(result.previewUrl);
      setFile(result.file);
      setLocalPreviewUrl((prev) => {
        if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(result.file);
      });
      setFileSizeInfo(formatCompressInfo(result));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo procesar el archivo";
      toast.error(msg);
      setFileSizeInfo("");
    } finally {
      window.setTimeout(() => {
        pickingFileRef.current = false;
        setFilePickingBusy(false);
      }, 800);
    }
  };

  const guardar = () => {
    if (Object.keys(errores).length) {
      setTouched(true);
      toast.error("Revise los campos marcados.");
      return;
    }
    if (editing) {
      void updateMut
        .mutateAsync({
          id: editing.id,
          nombre: form.nombre.trim(),
          categoria: form.categoria,
          proyectoId: form.proyectoId,
          descripcion: form.descripcion.trim(),
          archivo: editing.archivo,
          ...(file ? { file } : {}),
        })
        .then(() => {
          toast.success(file ? "Documento y archivo actualizados." : "Documento actualizado.");
          setOpen(false);
          resetForm();
        })
        .catch((err: Error) => toast.error(err.message));
      return;
    }
    void addMut
      .mutateAsync({
        nombre: form.nombre.trim(),
        categoria: form.categoria,
        proyectoId: form.proyectoId,
        descripcion: form.descripcion.trim(),
        file: file!,
      })
      .then(() => {
        toast.success("Documento cargado correctamente.");
        setOpen(false);
        resetForm();
      })
      .catch((err: Error) => toast.error(err.message));
  };

  const abrirDocumento = (path: string) => {
    void signedUrl("documentos", path)
      .then((url) => window.open(url, "_blank", "noopener,noreferrer"))
      .catch((err: Error) => toast.error(err.message));
  };

  if (!puedeVer("documentos")) return <AccesoDenegado modulo="Documentos" />;

  const editingFileName = editing ? editing.archivo.split("/").pop() || editing.nombre : "";
  const displayFileName = file?.name || editingFileName;
  const displayPeso = file
    ? fileSizeInfo || `${(file.size / 1024).toFixed(1)} KB`
    : editing?.peso || "";

  const abrirArchivoForm = () => {
    if (file && localPreviewUrl) {
      window.open(localPreviewUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (editing && !quitarArchivo) abrirDocumento(editing.archivo);
  };

  return (
    <div>
      <PageHeader
        kicker="Archivo digital"
        title="Documentos"
        description="Formatos admitidos: PDF, Word, Excel, DWG y ZIP, clasificados por categoría y proyecto."
        action={
          editable ? (
            <Button onClick={abrirNuevo} className="gap-2" disabled={!projects.length}>
              <Plus className="size-4" /> Subir Documento
            </Button>
          ) : null
        }
      />

      <div className="mb-4 max-w-xl">
        <Select
          value={filtroProyecto}
          onValueChange={(v) => {
            void navigate({
              search: { proyecto: v === "todos" ? undefined : v },
              replace: true,
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por proyecto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los proyectos</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.codigo} — {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
          const fileName = d.archivo.split("/").pop() || d.nombre;
          const Icono = iconoPorArchivo(fileName);
          return (
            <article key={d.id} className="panel flex gap-4 p-5">
              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                title="Abrir documento"
                onClick={() => abrirDocumento(d.archivo)}
              >
                <Icono className="size-5" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="truncate text-left font-medium text-foreground hover:underline"
                    onClick={() => abrirDocumento(d.archivo)}
                  >
                    {d.nombre}
                  </button>
                  <Badge variant="outline">{d.categoria}</Badge>
                </div>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                  {fileName} · {d.peso}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{d.descripcion}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {projects.find((p) => p.id === d.proyectoId)?.codigo ?? "—"} · {fecha(d.fecha)}
                  </span>
                  {editable ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => abrirEditar(d)}
                        aria-label="Editar documento"
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
                            .mutateAsync({ id: d.id, archivo: d.archivo })
                            .then(() => toast.success("Documento eliminado."))
                            .catch((err: Error) => toast.error(err.message));
                        }}
                        aria-label="Eliminar documento"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!lista.length ? (
        <p className="panel p-10 text-center text-sm text-muted-foreground">
          {search.proyecto
            ? "No hay documentos para este proyecto en la categoría seleccionada."
            : "No hay documentos en esta categoría."}
        </p>
      ) : null}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          // En móvil, el selector de archivos puede disparar el cierre del diálogo.
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
              {editing ? "Editar Documento" : "Subir Documento"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Actualice los metadatos. El archivo original se conserva."
                : "Clasifique el archivo por categoría y proyecto."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Proyecto" error={touched ? errores["proyectoId"] : undefined} full>
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
            <Field label="Archivo" error={touched ? errores["archivo"] : undefined} full>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.zip,image/*"
                className="sr-only"
                onChange={(e) => {
                  void pickFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
              {mostrarArchivo ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-sm font-medium text-primary underline-offset-2 hover:underline"
                    onClick={abrirArchivoForm}
                    title="Abrir archivo"
                  >
                    {displayFileName}
                  </button>
                  {displayPeso ? (
                    <span className="shrink-0 text-xs text-muted-foreground">{displayPeso}</span>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Quitar archivo"
                    onClick={quitarArchivoActual}
                  >
                    <X className="size-4" strokeWidth={2.5} />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onPointerDown={() => {
                      pickingFileRef.current = true;
                      setFilePickingBusy(true);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="size-4" />
                    Seleccionar archivo
                  </Button>
                  <span className="text-sm text-muted-foreground">Ningún archivo seleccionado</span>
                </div>
              )}
              {fileSizeInfo && file ? (
                <p className="mt-1 text-xs text-muted-foreground">{fileSizeInfo}</p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                {editing
                  ? "Pulse el nombre para abrir. Use la X para quitarlo y cargar otro."
                  : "Formatos: PDF, Word, Excel, DWG o ZIP (PDF e imágenes se comprimen)"}
              </p>
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
            <Button onClick={guardar} disabled={addMut.isPending || updateMut.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
