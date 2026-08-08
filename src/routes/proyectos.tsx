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
import { Field } from "@/components/Field";
import { DateInput } from "@/components/DateInput";
import { ProyectoMiembrosPanel } from "@/components/ProyectoMiembros";
import { cn } from "@/lib/utils";
import {
  usePermisos,
  money,
  fecha,
  type Project,
  type ProjectStatus,
} from "@/lib/store";
import {
  useDeleteProyecto,
  useProyectos,
  useUpsertProyecto,
  useConfigEmpresa,
} from "@/lib/obra/hooks";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/proyectos")({
  head: () => ({
    meta: [
      { title: "Proyectos — SIGOC" },
      {
        name: "description",
        content:
          "Registro y control de proyectos civiles: código, entidad, empresa contratista, responsable, plazos, estado y presupuesto.",
      },
      { property: "og:title", content: "Proyectos — SIGOC" },
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
  ejecutado: string;
  avanceFisico: string;
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
  ejecutado: "0",
  avanceFisico: "0",
  fechaInicio: "",
  fechaFinal: "",
  estado: "Activo",
};

/** Genera el siguiente código numérico AAAANNN (ej. 2026001). */
function siguienteCodigo(projects: Project[]): string {
  const year = String(new Date().getFullYear());
  let max = 0;
  for (const p of projects) {
    const c = p.codigo.trim();
    if (/^\d+$/.test(c) && c.startsWith(year) && c.length > year.length) {
      const n = Number(c.slice(year.length));
      if (Number.isFinite(n) && n > max) max = n;
      continue;
    }
    // Compatibilidad con códigos antiguos PRY-AAAA-NNN
    const legacy = `PRY-${year}-`;
    if (c.startsWith(legacy)) {
      const n = Number(c.slice(legacy.length));
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return `${year}${String(max + 1).padStart(3, "0")}`;
}

function ProyectosPage() {
  const { data: projects = [], isLoading } = useProyectos();
  const { data: config } = useConfigEmpresa();
  const { subscription } = useAuth();
  const upsert = useUpsertProyecto();
  const remove = useDeleteProyecto();
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
  const empresaLogueada =
    config?.nombre_empresa?.trim() ||
    subscription.suscripcion?.empresa_nombre?.trim() ||
    "";

  const errores = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.codigo.trim()) e["codigo"] = "El código es obligatorio.";
    if (form.nombre.trim().length < 5) e["nombre"] = "Mínimo 5 caracteres.";
    if (!form.entidad.trim()) e["entidad"] = "Indique la entidad contratante.";
    if (!form.empresa.trim()) e["empresa"] = "Indique la empresa contratista.";
    if (!form.responsable.trim()) e["responsable"] = "Indique el ingeniero responsable.";
    if (!form.presupuesto || Number(form.presupuesto) <= 0)
      e["presupuesto"] = "Monto mayor a cero.";
    if (form.ejecutado === "" || Number(form.ejecutado) < 0)
      e["ejecutado"] = "Ejecutado ≥ 0.";
    if (Number(form.ejecutado) > Number(form.presupuesto || 0))
      e["ejecutado"] = "No puede superar el presupuesto.";
    const avance = Number(form.avanceFisico);
    if (form.avanceFisico === "" || !Number.isFinite(avance) || avance < 0 || avance > 100)
      e["avanceFisico"] = "Entre 0 y 100.";
    if (!form.fechaInicio) e["fechaInicio"] = "Requerida.";
    if (!form.fechaFinal) e["fechaFinal"] = "Requerida.";
    if (form.fechaInicio && form.fechaFinal && form.fechaFinal <= form.fechaInicio)
      e["fechaFinal"] = "Debe ser posterior a la fecha de inicio.";
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
    setForm({
      ...emptyForm,
      codigo: siguienteCodigo(projects),
      empresa: empresaLogueada,
    });
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
      ejecutado: String(p.ejecutado),
      avanceFisico: String(p.avanceFisico),
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
      toast.error("Error al guardar. Revise los campos marcados.");
      return;
    }
    const payload = {
      codigo: (editing ? editing.codigo : form.codigo || siguienteCodigo(projects)).trim(),
      nombre: form.nombre.trim(),
      entidad: form.entidad.trim(),
      empresa: form.empresa.trim(),
      responsable: form.responsable.trim(),
      presupuesto: Number(form.presupuesto),
      ejecutado: Number(form.ejecutado) || 0,
      avanceFisico: Math.min(100, Math.max(0, Number(form.avanceFisico) || 0)),
      fechaInicio: form.fechaInicio,
      fechaFinal: form.fechaFinal,
      estado: form.estado,
    };
    void upsert
      .mutateAsync(editing ? { id: editing.id, ...payload } : payload)
      .then(() => {
        toast.success(editing ? "Proyecto actualizado." : "Proyecto registrado.");
        setOpen(false);
      })
      .catch((err: Error) => toast.error(err.message));
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
        <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:flex-wrap sm:items-center sm:p-4">
          <div className="relative w-full min-w-0 flex-1 sm:min-w-[220px]">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por código, nombre, empresa…"
              className="pl-9"
            />
          </div>
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-full sm:w-[180px]">
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

        {/* Vista móvil: tarjetas */}
        <div className="space-y-3 p-3 md:hidden">
          {lista.map((p) => (
            <article key={p.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-medium text-muted-foreground">{p.codigo}</p>
                  <h3 className="mt-0.5 text-sm font-semibold leading-snug text-foreground">{p.nombre}</h3>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{p.entidad}</p>
                </div>
                <Badge variant="outline" className={cn("shrink-0", estadoBadge(p.estado))}>
                  {p.estado}
                </Badge>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Empresa</dt>
                  <dd className="truncate font-medium">{p.empresa}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Presupuesto</dt>
                  <dd className="font-medium">{money(p.presupuesto)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Responsable</dt>
                  <dd className="truncate">{p.responsable}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Periodo</dt>
                  <dd>
                    {fecha(p.fechaInicio)} – {fecha(p.fechaFinal)}
                  </dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap justify-end gap-1 border-t border-border pt-3">
                <IconBtn label="Ver" onClick={() => setDetalle(p)}>
                  <Eye className="size-4" />
                </IconBtn>
                <IconBtn label="Documentos" to={`/documentos?proyecto=${p.id}`}>
                  <FileText className="size-4" />
                </IconBtn>
                <IconBtn label="Fotografías" to={`/fotografias?proyecto=${p.id}`}>
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
            </article>
          ))}
          {!lista.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No se encontraron proyectos con los filtros aplicados.
            </p>
          ) : null}
        </div>

        {/* Vista desktop: tabla */}
        <div className="hidden overflow-x-auto md:block">
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
                      <IconBtn label="Documentos" to={`/documentos?proyecto=${p.id}`}>
                        <FileText className="size-4" />
                      </IconBtn>
                      <IconBtn label="Fotografías" to={`/fotografias?proyecto=${p.id}`}>
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
              {editing
                ? "Actualice la información del proyecto. El código no se modifica."
                : "El código se asigna automáticamente. Complete el resto de la información."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Código" error={err("codigo")}>
              <Input
                value={form.codigo}
                readOnly
                tabIndex={-1}
                className="bg-muted/50 font-mono text-sm"
                title="Código generado automáticamente"
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
            <Field label="Ejecutado (Bs)" error={err("ejecutado")}>
              <Input
                type="number"
                min={0}
                value={form.ejecutado}
                onChange={(e) => set("ejecutado", e.target.value)}
                onBlur={() => blur("ejecutado")}
              />
            </Field>
            <Field label="Avance físico (%)" error={err("avanceFisico")}>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.avanceFisico}
                onChange={(e) => set("avanceFisico", e.target.value)}
                onBlur={() => blur("avanceFisico")}
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
              <DateInput
                value={form.fechaInicio}
                onChange={(v) => set("fechaInicio", v)}
                onBlur={() => blur("fechaInicio")}
              />
            </Field>
            <Field label="Fecha final" error={err("fechaFinal")}>
              <DateInput
                value={form.fechaFinal}
                onChange={(v) => set("fechaFinal", v)}
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
              <ProyectoMiembrosPanel proyectoId={detalle.id} />
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
                if (!borrar) return;
                void remove.mutateAsync(borrar.id).then(
                  () => {
                    toast.success("Proyecto eliminado.");
                    setBorrar(null);
                  },
                  (err: Error) => toast.error(err.message),
                );
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
