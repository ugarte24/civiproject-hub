import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Building2, CalendarClock, Plus, RefreshCw, Shield, Users, ArrowLeftRight, Pencil } from "lucide-react";
import { PageHeader, AccesoDenegado } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Field } from "@/components/Field";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { createAppUserFn } from "@/lib/create-user.functions";
import { ROLES_EMPRESA, type Role } from "@/lib/store";
import {
  daysUntil,
  formatFechaBO,
  precioPlanLabel,
  type Suscripcion,
  type SuscripcionPeriodo,
} from "@/lib/subscription";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Panel SuperAdmin — SIGOC SaaS" }],
  }),
  component: AdminPage,
});

type Row = Suscripcion & { empresa_nombre: string };

type EmpresaUsuario = {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  rol: Role;
  estado: "Activo" | "Inactivo";
  es_superadmin: boolean;
};

function isEmpresaRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES_EMPRESA as string[]).includes(value);
}

function AdminPage() {
  const { isSuperAdmin, refreshSubscription } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [onboardSaving, setOnboardSaving] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersEmpresa, setUsersEmpresa] = useState("");
  const [usersEmpresaId, setUsersEmpresaId] = useState<string | null>(null);
  const [users, setUsers] = useState<EmpresaUsuario[]>([]);
  const [editUser, setEditUser] = useState<EmpresaUsuario | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editTouched, setEditTouched] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre: "",
    telefono: "",
    rol: "Consulta" as Role,
    estado: "Activo" as "Activo" | "Inactivo",
  });
  const [planOpen, setPlanOpen] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [planRow, setPlanRow] = useState<Row | null>(null);
  const [planPeriodo, setPlanPeriodo] = useState<SuscripcionPeriodo>("mensual");
  const [form, setForm] = useState({
    empresa: "",
    nit: "",
    periodo: "mensual" as SuscripcionPeriodo,
    adminNombre: "",
    adminCorreo: "",
    adminPassword: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("suscripciones")
        .select(
          "id, empresa_id, plan, periodo, precio_mensual, precio_anual, max_usuarios, fecha_inicio, fecha_fin, estado, notas, empresas!inner(nombre, es_plataforma)",
        )
        .eq("empresas.es_plataforma", false)
        .order("fecha_fin", { ascending: true });

      if (error) throw error;

      const mapped: Row[] = (data ?? []).map((r) => {
        const empresas = r.empresas as
          | { nombre?: string; es_plataforma?: boolean }
          | { nombre?: string; es_plataforma?: boolean }[]
          | null;
        const emp = Array.isArray(empresas) ? empresas[0] : empresas;
        return {
          id: r.id as string,
          empresa_id: r.empresa_id as string,
          plan: r.plan as string,
          periodo: r.periodo === "anual" ? "anual" : "mensual",
          precio_mensual: Number(r.precio_mensual),
          precio_anual: Number(r.precio_anual ?? 5500),
          max_usuarios: Number(r.max_usuarios),
          fecha_inicio: r.fecha_inicio as string,
          fecha_fin: r.fecha_fin as string,
          estado: r.estado as Suscripcion["estado"],
          notas: (r.notas as string | null) ?? null,
          empresa_nombre: emp?.nombre || "Sin nombre",
        };
      });
      setRows(mapped);
    } catch (err) {
      // Fallback si aún no existe la columna es_plataforma
      try {
        const { data, error } = await supabase
          .from("suscripciones")
          .select(
            "id, empresa_id, plan, periodo, precio_mensual, precio_anual, max_usuarios, fecha_inicio, fecha_fin, estado, notas, empresas(nombre)",
          )
          .order("fecha_fin", { ascending: true });
        if (error) throw error;

        const { data: supers } = await supabase
          .from("profiles")
          .select("empresa_id")
          .eq("es_superadmin", true);

        const exclude = new Set(
          (supers ?? [])
            .map((p) => p.empresa_id as string | null)
            .filter((id): id is string => Boolean(id)),
        );

        const mapped: Row[] = (data ?? [])
          .map((r) => {
            const empresas = r.empresas as { nombre?: string } | { nombre?: string }[] | null;
            const nombre = Array.isArray(empresas)
              ? empresas[0]?.nombre
              : empresas?.nombre;
            return {
              id: r.id as string,
              empresa_id: r.empresa_id as string,
              plan: r.plan as string,
              periodo: r.periodo === "anual" ? "anual" : "mensual",
              precio_mensual: Number(r.precio_mensual),
              precio_anual: Number(r.precio_anual ?? 5500),
              max_usuarios: Number(r.max_usuarios),
              fecha_inicio: r.fecha_inicio as string,
              fecha_fin: r.fecha_fin as string,
              estado: r.estado as Suscripcion["estado"],
              notas: (r.notas as string | null) ?? null,
              empresa_nombre: nombre || "Sin nombre",
            };
          })
          .filter(
            (r) =>
              !exclude.has(r.empresa_id) &&
              !/cuenta propia/i.test(r.empresa_nombre),
          );
        setRows(mapped);
      } catch (err2) {
        const msg = err2 instanceof Error ? err2.message : "No se pudieron cargar suscripciones";
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) void load();
  }, [isSuperAdmin, load]);

  const porVencer = useMemo(
    () =>
      rows.filter((r) => {
        const d = daysUntil(r.fecha_fin);
        return d >= 0 && d <= 3;
      }),
    [rows],
  );

  const marcarPagado = async (id: string) => {
    setBusyId(id);
    try {
      const { data, error } = await supabase.rpc("marcar_pagado_suscripcion", {
        p_suscripcion_id: id,
      });
      if (error) throw error;
      const row = data as { fecha_fin?: string } | null;
      toast.success(
        `Pago registrado. Nueva vigencia hasta ${formatFechaBO(row?.fecha_fin ?? "")}.`,
      );
      await load();
      await refreshSubscription();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo marcar el pago";
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  const abrirCambiarPlan = (r: Row) => {
    setPlanRow(r);
    setPlanPeriodo(r.periodo);
    setPlanOpen(true);
  };

  const guardarPlan = async () => {
    if (!planRow) return;
    if (planPeriodo === planRow.periodo) {
      setPlanOpen(false);
      return;
    }
    setPlanSaving(true);
    try {
      const { error } = await supabase.rpc("cambiar_periodo_suscripcion", {
        p_suscripcion_id: planRow.id,
        p_periodo: planPeriodo,
      });
      if (error) throw error;
      toast.success(
        planPeriodo === "anual"
          ? "Plan cambiado a Anual (Bs 5.500). El próximo pago sumará +365 días."
          : "Plan cambiado a Mensual (Bs 500). El próximo pago sumará +30 días.",
      );
      setPlanOpen(false);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo cambiar el plan";
      toast.error(msg);
    } finally {
      setPlanSaving(false);
    }
  };

  const cargarUsuariosEmpresa = async (empresaId: string) => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nombre, correo, telefono, rol, estado, es_superadmin")
        .eq("empresa_id", empresaId)
        .order("nombre");
      if (error) throw error;
      setUsers(
        (data ?? []).map((u) => ({
          id: u.id as string,
          nombre: (u.nombre as string) || "—",
          correo: (u.correo as string) || "—",
          telefono: (u.telefono as string | null) ?? null,
          rol: isEmpresaRole(u.rol) ? u.rol : "Consulta",
          estado: u.estado === "Inactivo" ? "Inactivo" : "Activo",
          es_superadmin: Boolean(u.es_superadmin),
        })),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudieron cargar usuarios";
      toast.error(msg);
      throw err;
    } finally {
      setUsersLoading(false);
    }
  };

  const verUsuarios = async (r: Row) => {
    setUsersEmpresa(r.empresa_nombre);
    setUsersEmpresaId(r.empresa_id);
    setEditUser(null);
    setUsersOpen(true);
    setUsers([]);
    try {
      await cargarUsuariosEmpresa(r.empresa_id);
    } catch {
      setUsersOpen(false);
    }
  };

  const abrirEditarUsuario = (u: EmpresaUsuario) => {
    setEditUser(u);
    setEditForm({
      nombre: u.nombre,
      telefono: u.telefono ?? "",
      // SuperAdmin solo gestiona el Administrador del cliente
      rol: "Administrador",
      estado: u.estado,
    });
    setEditTouched(false);
  };

  const editErrores: Record<string, string> = {};
  if (editForm.nombre.trim().length < 4) editErrores.nombre = "Mínimo 4 caracteres.";
  if (editForm.telefono && !/^\d{7,15}$/.test(editForm.telefono)) {
    editErrores.telefono = "Teléfono de 7 a 15 dígitos.";
  }

  const guardarUsuario = async () => {
    if (!editUser) return;
    if (Object.keys(editErrores).length) {
      setEditTouched(true);
      toast.error("Revise los campos marcados.");
      return;
    }
    if (editUser.es_superadmin && editForm.rol !== "Administrador") {
      toast.error("No se puede cambiar el rol de un SuperAdmin.");
      return;
    }
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nombre: editForm.nombre.trim(),
          telefono: editForm.telefono.trim() || null,
          rol: "Administrador",
          estado: editForm.estado,
        })
        .eq("id", editUser.id);
      if (error) throw error;
      toast.success("Usuario actualizado.");
      setEditUser(null);
      if (usersEmpresaId) await cargarUsuariosEmpresa(usersEmpresaId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar";
      toast.error(msg);
    } finally {
      setEditSaving(false);
    }
  };

  const onboard = async () => {
    if (form.empresa.trim().length < 2) {
      toast.error("Indique el nombre de la empresa");
      return;
    }
    if (form.adminNombre.trim().length < 4 || !form.adminCorreo.includes("@") || form.adminPassword.length < 8) {
      toast.error("Complete los datos del Administrador (nombre, correo, contraseña ≥ 8)");
      return;
    }

    setOnboardSaving(true);
    try {
      const { data: empresaRows, error } = await supabase.rpc("onboard_empresa", {
        p_nombre_empresa: form.empresa.trim(),
        p_periodo: form.periodo,
        p_nit: form.nit.trim() || null,
      });
      if (error) throw error;

      const row = Array.isArray(empresaRows) ? empresaRows[0] : empresaRows;
      const empresaId = (row as { empresa_id?: string })?.empresa_id;
      if (!empresaId) throw new Error("No se obtuvo empresa_id");

      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;
      if (!accessToken) throw new Error("Sesión no válida");

      await createAppUserFn({
        data: {
          accessToken,
          nombre: form.adminNombre.trim(),
          correo: form.adminCorreo.trim(),
          password: form.adminPassword,
          rol: "Administrador",
          empresaId,
          modoOnboard: true,
        },
      });

      toast.success(
        `Cliente creado. Vigencia hasta ${formatFechaBO((row as { fecha_fin?: string }).fecha_fin ?? "")}.`,
      );
      setOnboardOpen(false);
      setForm({
        empresa: "",
        nit: "",
        periodo: "mensual",
        adminNombre: "",
        adminCorreo: "",
        adminPassword: "",
      });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo dar de alta el cliente";
      toast.error(msg);
    } finally {
      setOnboardSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return <AccesoDenegado modulo="Panel SuperAdmin" />;
  }

  return (
    <div>
      <PageHeader
        kicker="SaaS"
        title="Panel SuperAdmin"
        description="Gestión de clientes y suscripciones. Mensual Bs 500 · Anual Bs 5.500 · usuarios ilimitados."
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="outline" className="gap-2" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            <Button className="gap-2" onClick={() => setOnboardOpen(true)}>
              <Plus className="size-4" /> Nuevo cliente
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="panel p-4 sm:p-5">
          <p className="label-kicker">Clientes</p>
          <p className="stat-value mt-2">{rows.length}</p>
        </div>
        <div className="panel p-4 sm:p-5">
          <p className="label-kicker">Vencen en ≤ 3 días</p>
          <p className="stat-value mt-2 text-warning-foreground">{porVencer.length}</p>
        </div>
        <div className="panel p-4 sm:p-5">
          <p className="label-kicker">Plan Esencial</p>
          <p className="mt-2 text-sm text-muted-foreground">
            <strong>Bs 500/mes</strong> o <strong>Bs 5.500/año</strong>
            <br />
            Usuarios ilimitados
          </p>
        </div>
      </div>

      {porVencer.length > 0 ? (
        <div className="panel mt-4 border-warning/40 bg-warning/10 p-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4" />
            <p className="font-medium">Avisar por WhatsApp (vencen pronto)</p>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {porVencer.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>{r.empresa_nombre}</strong> — vence {formatFechaBO(r.fecha_fin)} (
                  {daysUntil(r.fecha_fin)} d)
                </span>
                <Badge variant="outline">{precioPlanLabel(r)}</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Mensaje sugerido: “Su plan SIGOC vence el DD/MM. Renueve (Bs 500/mes o Bs 5.500/año)
            con QR/transferencia y envíe el comprobante.”
          </p>
        </div>
      ) : null}

      <div className="panel mt-4 overflow-hidden">
        <div className="space-y-3 p-3 md:hidden">
          {rows.map((r) => {
            const dias = daysUntil(r.fecha_fin);
            const vencida = dias < 0;
            return (
              <article key={r.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium">
                      <Building2 className="size-3.5 shrink-0" />
                      <span className="truncate">{r.empresa_nombre}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.periodo === "anual" ? "Anual" : "Mensual"} · {precioPlanLabel(r)} ·
                      ilimitado
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      vencida
                        ? "border-destructive text-destructive"
                        : dias <= 3
                          ? "border-warning text-warning-foreground"
                          : ""
                    }
                  >
                    {vencida ? "Vencida" : dias <= 3 ? `Vence en ${dias}d` : "Activa"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm">
                  Vigencia: {formatFechaBO(r.fecha_inicio)} → {formatFechaBO(r.fecha_fin)}
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => void verUsuarios(r)}
                  >
                    <Users className="size-4" />
                    Ver usuarios
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => abrirCambiarPlan(r)}
                  >
                    <ArrowLeftRight className="size-4" />
                    Cambiar plan
                  </Button>
                  <Button
                    className="w-full gap-2"
                    disabled={busyId === r.id}
                    onClick={() => void marcarPagado(r.id)}
                  >
                    <Shield className="size-4" />
                    {busyId === r.id
                      ? "Procesando…"
                      : r.periodo === "anual"
                        ? "Marcar pagado (+365 días)"
                        : "Marcar pagado (+30 días)"}
                  </Button>
                </div>
              </article>
            );
          })}
          {!loading && !rows.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay suscripciones. Use “Nuevo cliente”.
            </p>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Empresa</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Días</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const dias = daysUntil(r.fecha_fin);
                const vencida = dias < 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.empresa_nombre}</TableCell>
                    <TableCell className="capitalize">{r.periodo}</TableCell>
                    <TableCell>{precioPlanLabel(r)}</TableCell>
                    <TableCell>{formatFechaBO(r.fecha_inicio)}</TableCell>
                    <TableCell>{formatFechaBO(r.fecha_fin)}</TableCell>
                    <TableCell>{dias}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          vencida
                            ? "border-destructive text-destructive"
                            : dias <= 3
                              ? "border-warning text-warning-foreground"
                              : ""
                        }
                      >
                        {vencida ? "Vencida" : r.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => void verUsuarios(r)}
                        >
                          <Users className="size-3.5" />
                          Usuarios
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => abrirCambiarPlan(r)}
                        >
                          <ArrowLeftRight className="size-3.5" />
                          Plan
                        </Button>
                        <Button
                          size="sm"
                          disabled={busyId === r.id}
                          onClick={() => void marcarPagado(r.id)}
                        >
                          {busyId === r.id
                            ? "…"
                            : r.periodo === "anual"
                              ? "Pagado (+365d)"
                              : "Pagado (+30d)"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && !rows.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No hay suscripciones. Use “Nuevo cliente”.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide uppercase">
              Nuevo cliente
            </DialogTitle>
            <DialogDescription>
              Crea empresa, suscripción y el primer Administrador del cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre empresa" full>
              <Input
                value={form.empresa}
                onChange={(e) => setForm((f) => ({ ...f, empresa: e.target.value }))}
              />
            </Field>
            <Field label="NIT (opcional)">
              <Input
                value={form.nit}
                onChange={(e) => setForm((f) => ({ ...f, nit: e.target.value }))}
              />
            </Field>
            <Field label="Periodo" full>
              <Select
                value={form.periodo}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, periodo: v as SuscripcionPeriodo }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensual">Mensual — Bs 500</SelectItem>
                  <SelectItem value="anual">Anual — Bs 5.500</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Admin — nombre" full>
              <Input
                value={form.adminNombre}
                onChange={(e) => setForm((f) => ({ ...f, adminNombre: e.target.value }))}
              />
            </Field>
            <Field label="Admin — correo">
              <Input
                type="email"
                value={form.adminCorreo}
                onChange={(e) => setForm((f) => ({ ...f, adminCorreo: e.target.value }))}
              />
            </Field>
            <Field label="Admin — contraseña">
              <Input
                type="password"
                value={form.adminPassword}
                onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
                placeholder="Mínimo 8 caracteres"
              />
            </Field>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setOnboardOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void onboard()} disabled={onboardSaving}>
              {onboardSaving ? "Creando…" : "Crear cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={usersOpen}
        onOpenChange={(open) => {
          setUsersOpen(open);
          if (!open) setEditUser(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide uppercase">
              {editUser ? "Editar usuario" : "Usuarios del cliente"}
            </DialogTitle>
            <DialogDescription>
              {editUser ? (
                <>
                  {editUser.correo} — <strong>{usersEmpresa}</strong>
                </>
              ) : (
                <>
                  Perfiles de <strong>{usersEmpresa}</strong>. Puede editar nombre, teléfono, rol y
                  estado.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {editUser ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Nombre"
                error={editTouched ? editErrores.nombre : undefined}
                full
              >
                <Input
                  value={editForm.nombre}
                  onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                />
              </Field>
              <Field label="Correo">
                <Input value={editUser.correo} disabled />
              </Field>
              <Field
                label="Teléfono"
                error={editTouched ? editErrores.telefono : undefined}
              >
                <Input
                  value={editForm.telefono}
                  onChange={(e) => setEditForm((f) => ({ ...f, telefono: e.target.value }))}
                  placeholder="Opcional"
                />
              </Field>
              <Field label="Rol">
                <Select value="Administrador" disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administrador">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  El SuperAdmin solo gestiona Administradores de cliente. El resto de roles los crea el
                  Admin de la empresa.
                </p>
              </Field>
              <Field label="Estado" full>
                <Select
                  value={editForm.estado}
                  onValueChange={(v) =>
                    setEditForm((f) => ({
                      ...f,
                      estado: v as "Activo" | "Inactivo",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          ) : usersLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando usuarios…</p>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Esta empresa no tiene usuarios registrados.
            </p>
          ) : (
            <div className="max-h-[min(60dvh,420px)] overflow-y-auto">
              <div className="space-y-3 md:hidden">
                {users.map((u) => (
                  <article key={u.id} className="rounded-lg border border-border p-3">
                    <p className="font-medium">{u.nombre}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.correo}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">{u.rol}</Badge>
                      <Badge
                        variant="outline"
                        className={
                          u.estado === "Activo"
                            ? "border-success/40 bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {u.estado}
                      </Badge>
                    </div>
                    {u.telefono ? (
                      <p className="mt-1 text-xs text-muted-foreground">{u.telefono}</p>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full gap-2"
                      onClick={() => abrirEditarUsuario(u)}
                    >
                      <Pencil className="size-4" /> Editar
                    </Button>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Nombre</TableHead>
                      <TableHead>Correo</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.nombre}</TableCell>
                        <TableCell>{u.correo}</TableCell>
                        <TableCell>{u.telefono || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{u.rol}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              u.estado === "Activo"
                                ? "border-success/40 bg-success/10 text-success"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {u.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => abrirEditarUsuario(u)}
                          >
                            <Pencil className="size-3.5" />
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {editUser ? (
              <>
                <Button variant="outline" onClick={() => setEditUser(null)} disabled={editSaving}>
                  Volver
                </Button>
                <Button onClick={() => void guardarUsuario()} disabled={editSaving}>
                  {editSaving ? "Guardando…" : "Guardar"}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setUsersOpen(false)}>
                Cerrar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide uppercase">
              Cambiar plan
            </DialogTitle>
            <DialogDescription>
              {planRow
                ? `Cliente: ${planRow.empresa_nombre}. La vigencia actual no se modifica; el próximo “Marcar pagado” usará el nuevo periodo.`
                : "Seleccione el periodo de cobro."}
            </DialogDescription>
          </DialogHeader>
          <Field label="Periodo de pago" full>
            <Select
              value={planPeriodo}
              onValueChange={(v) => setPlanPeriodo(v as SuscripcionPeriodo)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensual">Mensual — Bs 500</SelectItem>
                <SelectItem value="anual">Anual — Bs 5.500</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setPlanOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void guardarPlan()} disabled={planSaving}>
              {planSaving ? "Guardando…" : "Guardar plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
