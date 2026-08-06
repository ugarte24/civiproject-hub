import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, FileText, Camera, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader, AccesoDenegado } from "@/components/AppShell";
import {
  useStore,
  usePermisos,
  money,
  fecha,
  type Project,
  type ProjectStatus,
} from "@/lib/store";

export const Route = createFileRoute("/proyectos")({
  head: () => ({
    meta: [
      { title: "Proyectos — SIGEPROC" },
      {
        name: "description",
        content:
          "Registro y control de proyectos civiles: código, entidad, empresa contratista, responsable, plazos, estado y presupuesto.",
      },
      { property: "og:title", content: "Proyectos — SIGEPROC" },
      {
        property: "og:description",
        content: "Alta, edición y seguimiento de proyectos de construcción.",
      },
    ],
  }),
  component: ProyectosPage,
});

const estados: ProjectStatus[] = ["Activo", "Suspendido", "Finalizado"];

const estadoBadge = (e: ProjectStatus) =>
  e === "Activo"
    ? "border-success/40 bg-success/10 text-success"
    : e === "Suspendido"
      ? "border-warning/50 bg-warning/15 text-warning-foreground"
      : "border-border bg-muted text-muted-foreground";

interface FormState {
  codigo: string;
  nombre: string;
  entidad: string;
  empresa: string;
  responsable: string;
  presupuesto: string;
  fechaInicio: string;
  fechaFinal: string;
  estado: ProjectStatus;
}

const emptyForm: FormState = {
  codigo: "",
  nombre: "",
  entidad: "",
  empresa: "",
  responsable: "",
  presupuesto: "",
  fechaInicio: "",
  fechaFinal: "",
  estado: "Activo",
};

function ProyectosPage() {
  const { projects, addProject, updateProject, removeProject } = useStore();
  const { puedeVer, puedeEditar } = usePermisos();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [detalle, setDetalle] = useState<Project | null>(null);
  const [borrar, setBorrar] = useState<Project | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<string>("todos");

  const editable = puedeEditar("proyectos");

  const errores = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.codigo.trim()) e.codigo = "El código es obligatorio.";
    if (form.nombre.trim().length < 5) e.nombre = "Mínimo 5 caracteres.";
    if (!form.entidad.trim()) e.entidad = "Indique la entidad contratante.";
    if (!form.empresa.trim()) e.empresa = "Indique la empresa contratista.";
    if (!form.responsable.trim()) e.responsable = "Indique el ingeniero responsable.";
    if (!form.presupuesto || Number(form.presupuesto) <= 0)
      e.presupuesto = "Monto mayor a cero.";
    if (!form.fechaInicio) e.fechaInicio = "Requerida.";
    if (!form.fechaFinal) e.fechaFinal = "Requerida.";
    if (form.fechaInicio && form.fechaFinal && form.fechaFinal <= form.fechaInicio)
      e.fechaFinal = "Debe ser posterior a la fecha de inicio.";
    return e;
  }, [form]);

  const lista = projects.filter((p) => {
    const okEstado = filtro === "todos" || p.estado === filtro;
    const t = q.toLowerCase();
    const okQ =
      !t ||
      [p.codigo, p.nombre, p.empresa, p.responsable].some((v) => v.toLowerCase().includes(t));
    return okEstado && okQ;
  });

  const abrirNuevo = () => {
    setEditing(null);
    setForm(emptyForm);
    setTouched({});
    setOpen(true);
  };

  const abrirEditar = (p: Project) => {
    setEditing(p);
    setForm({
      codigo: p.codigo,
      nombre: p.nombre,
      entidad: p.entidad,
      empresa: p.empresa,
      responsable: p.responsable,
      presupuesto: String(p.presupuesto),
      fechaInicio: p.fechaInicio,
      fechaFinal: p.fechaFinal,
      estado: p.estado,
    });
    setTouched({});
    setOpen(true);
  };

  const guardar = () => {
    if (Object.keys(errores).length) {
      setTouched(
        Object.fromEntries(Object.keys(form).map((k) => [k, true])) as Record<string, boolean>,
      );
      toast.error("❌ Error al guardar los datos. Revise los campos marcados.");
      return;
    }
    const payload = { ...form, presupuesto: Number(form.presupuesto) };
    if (editing) {
      updateProject(editing.id, payload);
      toast.success("✏️ Proyecto actualizado correctamente.");
    } else {
      addProject(payload);
      toast.success("✅ Proyecto registrado correctamente.");
    }
    setOpen(false);
  };

  const err = (k: keyof FormState) => (touched[k] ? errores[k] : undefined);
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const blur = (k: keyof FormState) => setTouched((t) => ({ ...t, [k]: true }));

  if (!puedeVer("proyectos")) return <AccesoDenegado modulo="Proyectos" />;

  return (
    <div>
      <PageHeader
        kicker="Gestión"
        title="Proyectos"
        description="Cartera completa de proyectos con su información técnica, administrativa y presupuestaria."
        action={
          editable ? (
            <Button onClick={abrirNuevo} className="gap-2">
              <Plus className="size-4" /> Nuevo Proyecto
            </Button>
          ) : null
        }
      />

      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por código, nombre, empresa o responsable"
              className="pl-9"
            />
          </div>
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {estados.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Final</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Presupuesto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/40">
                  <TableCell className="font-mono text-xs font-medium">{p.codigo}</TableCell>
                  <TableCell className="max-w-[240px]">
                    <p className="truncate font-medium text-foreground">{p.nombre}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.entidad}</p>
                  </TableCell>
                  <TableCell className="text-sm">{p.empresa}</TableCell>
                  <TableCell className="text-sm">{p.responsable}</TableCell>
                  <TableCell className="text-sm">{fecha(p.fechaInicio)}</TableCell>
                  <TableCell className="text-sm">{fecha(p.fechaFinal)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={estadoBadge(p.estado)}>
                      {p.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{money(p.presupuesto)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <IconBtn label="Ver" onClick={() => setDetalle(p)}>
                        <Eye className="size-4" />
                      </IconBtn>
                      <IconBtn label="Documentos" to="/documentos">
                        <FileText className="size-4" />
                      </IconBtn>
                      <IconBtn label="Fotografías" to="/fotografias">
                        <Camera className="size-4" />
                      </IconBtn>
                      {editable ? (
                        <>
                          <IconBtn label="Editar" onClick={() => abrirEditar(p)}>
                            <Pencil className="size-4" />
                          </IconBtn>
                          <IconBtn label="Eliminar" onClick={() => setBorrar(p)} destructive>
                            <Trash2 className="size-4" />
                          </IconBtn>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!lista.length ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    No se encontraron proyectos con los filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ---------- Modal Nuevo / Editar Proyecto ---------- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide uppercase">
              {editing ? "Editar Proyecto" : "Nuevo Proyecto"}
            </DialogTitle>
            <DialogDescription>
              Complete la información del proyecto. Los campos se validan de forma inmediata.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Código" error={err("codigo")}>
              <Input
                value={form.codigo}
                onChange={(e) => set("codigo", e.target.value)}
                onBlur={() => blur("codigo")}
                placeholder="PRY-2026-004"
              />
            </Field>
            <Field label="Presupuesto (Bs)" error={err("presupuesto")}>
              <Input
                type="number"
                value={form.presupuesto}
                onChange={(e) => set("presupuesto", e.target.value)}
                onBlur={() => blur("presupuesto")}
                placeholder="0.00"
              />
            </Field>
            <Field label="Nombre del proyecto" error={err("nombre")} full>
              <Input
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                onBlur={() => blur("nombre")}
                placeholder="Construcción de..."
              />
            </Field>
            <Field label="Entidad contratante" error={err("entidad")} full>
              <Input
                value={form.entidad}
                onChange={(e) => set("entidad", e.target.value)}
                onBlur={() => blur("entidad")}
              />
            </Field>
            <Field label="Empresa contratista" error={err("empresa")}>
              <Input
                value={form.empresa}
                onChange={(e) => set("empresa", e.target.value)}
                onBlur={() => blur("empresa")}
              />
            </Field>
            <Field label="Ingeniero responsable" error={err("responsable")}>
              <Input
                value={form.responsable}
                onChange={(e) => set("responsable", e.target.value)}
                onBlur={() => blur("responsable")}
              />
            </Field>
            <Field label="Fecha de inicio" error={err("fechaInicio")}>
              <Input
                type="date"
                value={form.fechaInicio}
                onChange={(e) => set("fechaInicio", e.target.value)}
                onBlur={() => blur("fechaInicio")}
              />
            </Field>
            <Field label="Fecha final" error={err("fechaFinal")}>
              <Input
                type="date"
                value={form.fechaFinal}
                onChange={(e) => set("fechaFinal", e.target.value)}
                onBlur={() => blur("fechaFinal")}
              />
            </Field>
            <div className="sm:col-span-2">
              <Label className="label-kicker">Estado</Label>
              <RadioGroup
                value={form.estado}
                onValueChange={(v) => set("estado", v)}
                className="mt-2 flex flex-wrap gap-4"
              >
                {estados.map((e) => (
                  <label key={e} className="flex cursor-pointer items-center gap-2 text-sm">
                    <RadioGroupItem value={e} /> {e}
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar}>{editing ? "Guardar cambios" : "Guardar Proyecto"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Modal Detalle ---------- */}
      <Dialog open={!!detalle} onOpenChange={(o) => !o && setDetalle(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide uppercase">
              Ficha del proyecto
            </DialogTitle>
            <DialogDescription>{detalle?.codigo}</DialogDescription>
          </DialogHeader>
          {detalle ? (
            <div className="space-y-4">
              <p className="text-base font-medium">{detalle.nombre}</p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Dato k="Entidad" v={detalle.entidad} />
                <Dato k="Empresa" v={detalle.empresa} />
                <Dato k="Responsable" v={detalle.responsable} />
                <Dato k="Estado" v={detalle.estado} />
                <Dato k="Inicio" v={fecha(detalle.fechaInicio)} />
                <Dato k="Final" v={fecha(detalle.fechaFinal)} />
                <Dato k="Presupuesto" v={money(detalle.presupuesto)} />
                <Dato k="Ejecutado" v={money(detalle.ejecutado)} />
              </dl>
              <div>
                <p className="label-kicker">Avance físico</p>
                <Progress value={detalle.avanceFisico} className="mt-2" />
                <p className="mt-1 text-xs text-muted-foreground">{detalle.avanceFisico}%</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ---------- Confirmar eliminación ---------- */}
      <AlertDialog open={!!borrar} onOpenChange={(o) => !o && setBorrar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el proyecto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{borrar?.nombre}</strong> del sistema. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (borrar) removeProject(borrar.id);
                toast.success("🗑️ Proyecto eliminado correctamente.");
                setBorrar(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function Field({
  label,
  error,
  children,
  full,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <Label className="label-kicker">{label}</Label>
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="label-kicker">{k}</dt>
      <dd className="text-foreground">{v}</dd>
    </div>
  );
}

function IconBtn({
  label,
  children,
  onClick,
  to,
  destructive,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  to?: string;
  destructive?: boolean;
}) {
  const cls = destructive ? "text-destructive hover:text-destructive" : "";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {to ? (
          <Button asChild variant="ghost" size="icon" className={cls}>
            <a href={to}>{children}</a>
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className={cls} onClick={onClick}>
            {children}
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
