import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Building2, CalendarClock, Plus, RefreshCw, Shield, Users, Pencil, Receipt, Printer, Download } from "lucide-react";
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
import {
  buildReciboHtml,
  descargarReciboPdf,
  imprimirIframeRecibo,
  imprimirRecibo,
  type ReciboPago,
} from "@/lib/recibo";

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

type PagoRow = ReciboPago & {
  empresa_id: string;
  suscripcion_id: string;
};

function AdminPage() {
  const { isSuperAdmin, refreshSubscription } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [pagos, setPagos] = useState<PagoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagosLoading, setPagosLoading] = useState(true);
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
  const [pagoConfirm, setPagoConfirm] = useState<Row | null>(null);
  const [pagoPeriodo, setPagoPeriodo] = useState<SuscripcionPeriodo>("mensual");
  const [reciboVista, setReciboVista] = useState<ReciboPago | null>(null);
  const [reciboPdfBusy, setReciboPdfBusy] = useState(false);
  const reciboIframeRef = useRef<HTMLIFrameElement | null>(null);
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

  const loadPagos = useCallback(async () => {
    setPagosLoading(true);
    try {
      const { data, error } = await supabase
        .from("pagos")
        .select(
          "id, empresa_id, suscripcion_id, numero, periodo, monto, moneda, fecha_pago, vigencia_desde, vigencia_hasta, metodo, empresas(nombre)",
        )
        .order("fecha_pago", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;

      setPagos(
        (data ?? []).map((p) => {
          const empresas = p.empresas as { nombre?: string } | { nombre?: string }[] | null;
          const nombre = Array.isArray(empresas) ? empresas[0]?.nombre : empresas?.nombre;
          return {
            id: p.id as string,
            empresa_id: p.empresa_id as string,
            suscripcion_id: p.suscripcion_id as string,
            numero: p.numero as string,
            periodo: p.periodo === "anual" ? "anual" : "mensual",
            monto: Number(p.monto),
            moneda: (p.moneda as string) || "BOB",
            fecha_pago: p.fecha_pago as string,
            vigencia_desde: p.vigencia_desde as string,
            vigencia_hasta: p.vigencia_hasta as string,
            metodo: (p.metodo as string | null) ?? null,
            empresa_nombre: nombre || "Sin nombre",
          };
        }),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo cargar el historial de pagos";
      toast.error(msg);
    } finally {
      setPagosLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void load();
    void loadPagos();
  }, [isSuperAdmin, load, loadPagos]);

  const porVencer = useMemo(
    () =>
      rows.filter((r) => {
        const d = daysUntil(r.fecha_fin);
        return d >= 0 && d <= 3;
      }),
    [rows],
  );

  const abrirRecibo = (pago: ReciboPago) => {
    setReciboVista(pago);
  };

  const imprimirReciboVista = () => {
    try {
      imprimirIframeRecibo(reciboIframeRef.current);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo imprimir el recibo";
      toast.error(msg);
    }
  };

  const abrirReciboPestana = () => {
    if (!reciboVista) return;
    try {
      imprimirRecibo(reciboVista);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo abrir el recibo";
      toast.error(msg);
    }
  };

  const descargarPdfRecibo = async () => {
    if (!reciboVista) return;
    setReciboPdfBusy(true);
    try {
      await descargarReciboPdf(reciboVista);
      toast.success(`PDF ${reciboVista.numero}.pdf descargado. Ya puede enviarlo por WhatsApp.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo descargar el PDF";
      toast.error(msg);
    } finally {
      setReciboPdfBusy(false);
    }
  };

  const pedirConfirmarPago = (r: Row) => {
    if (daysUntil(r.fecha_fin) >= 0) {
      toast.error("Solo puede marcar pagado cuando el plan está vencido.");
      return;
    }
    setPagoPeriodo("mensual");
    setPagoConfirm(r);
  };

  const marcarPagado = async (id: string, periodo: SuscripcionPeriodo) => {
    const row = rows.find((r) => r.id === id) ?? pagoConfirm;
    if (row && daysUntil(row.fecha_fin) >= 0) {
      toast.error("Solo puede marcar pagado cuando el plan está vencido.");
      setPagoConfirm(null);
      return;
    }
    setBusyId(id);
    setPagoConfirm(null);
    try {
      const empresaNombre =
        rows.find((r) => r.id === id)?.empresa_nombre ??
        pagoConfirm?.empresa_nombre ??
        "Cliente";
      const { data, error } = await supabase.rpc("marcar_pagado_suscripcion", {
        p_suscripcion_id: id,
        p_periodo: periodo,
      });
      if (error) throw error;
      const pago = data as {
        id: string;
        numero: string;
        periodo: string;
        monto: number;
        moneda: string;
        fecha_pago: string;
        vigencia_desde: string;
        vigencia_hasta: string;
        metodo: string | null;
        empresa_id: string;
        suscripcion_id: string;
      } | null;
      if (!pago) throw new Error("No se obtuvo el pago registrado");

      toast.success(
        `Pago ${pago.numero} registrado. Vigencia hasta ${formatFechaBO(pago.vigencia_hasta)}.`,
      );
      await load();
      await loadPagos();
      await refreshSubscription();
      abrirRecibo({
        id: pago.id,
        numero: pago.numero,
        empresa_nombre: empresaNombre,
        periodo: pago.periodo === "anual" ? "anual" : "mensual",
        monto: Number(pago.monto),
        moneda: pago.moneda || "BOB",
        fecha_pago: pago.fecha_pago,
        vigencia_desde: pago.vigencia_desde,
        vigencia_hasta: pago.vigencia_hasta,
        metodo: pago.metodo,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo marcar el pago";
      toast.error(msg);
    } finally {
      setBusyId(null);
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
      const pagoId = (row as { pago_id?: string })?.pago_id;
      const pagoNumero = (row as { pago_numero?: string })?.pago_numero;
      const empresaNombreAlta = form.empresa.trim();
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
        `Cliente creado${pagoNumero ? ` · recibo ${pagoNumero}` : ""}. Vigencia hasta ${formatFechaBO((row as { fecha_fin?: string }).fecha_fin ?? "")}.`,
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
      await loadPagos();

      if (pagoId) {
        const { data: pagoRow } = await supabase
          .from("pagos")
          .select(
            "id, numero, periodo, monto, moneda, fecha_pago, vigencia_desde, vigencia_hasta, metodo",
          )
          .eq("id", pagoId)
          .maybeSingle();
        if (pagoRow) {
          abrirRecibo({
            id: pagoRow.id as string,
            numero: pagoRow.numero as string,
            empresa_nombre: empresaNombreAlta || "Cliente",
            periodo: pagoRow.periodo === "anual" ? "anual" : "mensual",
            monto: Number(pagoRow.monto),
            moneda: (pagoRow.moneda as string) || "BOB",
            fecha_pago: pagoRow.fecha_pago as string,
            vigencia_desde: pagoRow.vigencia_desde as string,
            vigencia_hasta: pagoRow.vigencia_hasta as string,
            metodo: (pagoRow.metodo as string | null) ?? null,
          });
        }
      }
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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                void load();
                void loadPagos();
              }}
              disabled={loading || pagosLoading}
            >
              <RefreshCw className={`size-4 ${loading || pagosLoading ? "animate-spin" : ""}`} />
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
          <p className="label-kicker">Pagos registrados</p>
          <p className="stat-value mt-2">{pagos.length}</p>
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
                    className="w-full gap-2"
                    disabled={!vencida || busyId === r.id}
                    onClick={() => pedirConfirmarPago(r)}
                    title={vencida ? undefined : "Solo disponible cuando el plan está vencido"}
                  >
                    <Shield className="size-4" />
                    {busyId === r.id
                      ? "Procesando…"
                      : !vencida
                        ? "Plan vigente"
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
                          disabled={!vencida || busyId === r.id}
                          onClick={() => pedirConfirmarPago(r)}
                          title={vencida ? undefined : "Solo disponible cuando el plan está vencido"}
                        >
                          {busyId === r.id
                            ? "…"
                            : !vencida
                              ? "Vigente"
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

      <div className="panel mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <p className="font-medium">Historial de pagos</p>
            <p className="text-xs text-muted-foreground">
              Cada “Marcar pagado” genera un recibo (REC-AAAA-#####) que puede reimprimir.
            </p>
          </div>
          <Badge variant="outline">{pagos.length} registros</Badge>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {pagos.map((p) => (
            <article key={p.id} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{p.numero}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.empresa_nombre}</p>
                </div>
                <Badge variant="outline">{p.periodo === "anual" ? "Anual" : "Mensual"}</Badge>
              </div>
              <p className="mt-2 text-sm">
                {formatFechaBO(p.fecha_pago)} · Bs {p.monto.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                Vigencia {formatFechaBO(p.vigencia_desde)} → {formatFechaBO(p.vigencia_hasta)}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full gap-2"
                onClick={() => abrirRecibo(p)}
              >
                <Receipt className="size-4" />
                Generar recibo
              </Button>
            </article>
          ))}
          {!pagosLoading && !pagos.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aún no hay pagos. Use “Marcar pagado” en un cliente.
            </p>
          ) : null}
          {pagosLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando pagos…</p>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nº recibo</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead className="text-right">Recibo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.numero}</TableCell>
                  <TableCell>{p.empresa_nombre}</TableCell>
                  <TableCell>{formatFechaBO(p.fecha_pago)}</TableCell>
                  <TableCell className="capitalize">{p.periodo}</TableCell>
                  <TableCell>Bs {p.monto.toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatFechaBO(p.vigencia_desde)} → {formatFechaBO(p.vigencia_hasta)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => abrirRecibo(p)}
                    >
                      <Receipt className="size-3.5" />
                      Recibo
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!pagosLoading && !pagos.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Aún no hay pagos. Use “Marcar pagado” en un cliente.
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

      <Dialog
        open={Boolean(pagoConfirm)}
        onOpenChange={(open) => {
          if (!open) setPagoConfirm(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide uppercase">
              Confirmar pago
            </DialogTitle>
            <DialogDescription>
              {pagoConfirm ? (
                <>
                  Registrar pago de <strong>{pagoConfirm.empresa_nombre}</strong>. Elija el plan;
                  por defecto es mensual.
                </>
              ) : (
                "Confirme el registro del pago."
              )}
            </DialogDescription>
          </DialogHeader>
          <Field label="Plan a pagar" full>
            <Select
              value={pagoPeriodo}
              onValueChange={(v) => setPagoPeriodo(v as SuscripcionPeriodo)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensual">Mensual — Bs 500 (+30 días)</SelectItem>
                <SelectItem value="anual">Anual — Bs 5.500 (+365 días)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <p className="text-xs text-muted-foreground">
            Se generará un recibo y se reactivará la vigencia con el plan elegido.
          </p>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              disabled={Boolean(busyId)}
              onClick={() => setPagoConfirm(null)}
            >
              Cancelar
            </Button>
            <Button
              disabled={!pagoConfirm || Boolean(busyId)}
              onClick={() => {
                if (pagoConfirm) void marcarPagado(pagoConfirm.id, pagoPeriodo);
              }}
            >
              {busyId ? "Procesando…" : "Confirmar pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reciboVista)}
        onOpenChange={(open) => {
          if (!open) setReciboVista(null);
        }}
      >
        <DialogContent className="flex max-h-[92dvh] flex-col gap-3 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide uppercase">
              Recibo {reciboVista?.numero ?? ""}
            </DialogTitle>
            <DialogDescription>
              Vista previa del comprobante. Descargue el PDF para enviarlo por WhatsApp.
            </DialogDescription>
          </DialogHeader>
          {reciboVista ? (
            <iframe
              ref={reciboIframeRef}
              title={`Recibo ${reciboVista.numero}`}
              className="min-h-[420px] w-full flex-1 rounded-md border border-border bg-white"
              srcDoc={buildReciboHtml(reciboVista, { embed: true })}
            />
          ) : null}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setReciboVista(null)}>
              Cerrar
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-1.5" onClick={abrirReciboPestana}>
                Abrir pestaña
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={imprimirReciboVista}>
                <Printer className="size-4" />
                Imprimir
              </Button>
              <Button
                className="gap-1.5"
                disabled={reciboPdfBusy || !reciboVista}
                onClick={() => void descargarPdfRecibo()}
              >
                <Download className="size-4" />
                {reciboPdfBusy ? "Generando…" : "Descargar PDF"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
