import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Pencil, Plus, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { usePermisos, ROLES_EMPRESA, type Role } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { createAppUserFn } from "@/lib/create-user.functions";

export const Route = createFileRoute("/usuarios")({
  head: () => ({
    meta: [
      { title: "Gestión de usuarios y roles — SIGOC" },
      {
        name: "description",
        content:
          "Administración de usuarios con roles de Administrador, Ingeniero, Supervisor, Contabilidad y Consulta.",
      },
      { property: "og:title", content: "Usuarios — SIGOC" },
      {
        property: "og:description",
        content: "Control de acceso por roles y permisos del sistema.",
      },
    ],
  }),
  component: UsuariosPage,
});

const roles: Role[] = ROLES_EMPRESA;

type ProfileRow = {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  rol: Role;
  estado: "Activo" | "Inactivo";
  es_superadmin: boolean;
  empresa_id: string | null;
};

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (roles as string[]).includes(value);
}

function UsuariosPage() {
  const { puedeVer, puedeEditar } = usePermisos();
  const { profile, isSuperAdmin } = useAuth();
  const editable = puedeEditar("usuarios");
  const puedeVerUsuarios = puedeVer("usuarios");
  const [usuarios, setUsuarios] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    password: "",
    rol: "Consulta" as Role,
    estado: "Activo" as "Activo" | "Inactivo",
  });

  const empresaId = profile?.empresa_id ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("id, nombre, correo, telefono, rol, estado, es_superadmin, empresa_id")
        .order("nombre");

      if (!isSuperAdmin && empresaId) {
        query = query.eq("empresa_id", empresaId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows: ProfileRow[] = (data ?? []).map((r) => ({
        id: r.id as string,
        nombre: (r.nombre as string) || "—",
        correo: (r.correo as string) || "—",
        telefono: (r.telefono as string) || "",
        rol: isRole(r.rol) ? r.rol : "Consulta",
        estado: r.estado === "Inactivo" ? "Inactivo" : "Activo",
        es_superadmin: Boolean(r.es_superadmin),
        empresa_id: (r.empresa_id as string | null) ?? null,
      }));
      setUsuarios(rows);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudieron cargar usuarios";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, empresaId]);

  useEffect(() => {
    if (!puedeVerUsuarios) return;
    void load();
  }, [puedeVerUsuarios, load]);

  const errores: Record<string, string> = {};
  if (form.nombre.trim().length < 4) errores["nombre"] = "Mínimo 4 caracteres.";
  if (form.telefono && !/^\d{7,15}$/.test(form.telefono)) {
    errores["telefono"] = "Teléfono de 7 a 15 dígitos.";
  }
  if (!editing) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) errores["correo"] = "Correo no válido.";
    if (form.password.length < 8) errores["password"] = "Mínimo 8 caracteres.";
  }

  if (!puedeVerUsuarios) return <AccesoDenegado modulo="Usuarios" />;

  const abrirNuevo = () => {
    setEditing(null);
    setForm({
      nombre: "",
      correo: "",
      telefono: "",
      password: "",
      rol: "Consulta",
      estado: "Activo",
    });
    setTouched(false);
    setOpen(true);
  };

  const abrir = (u: ProfileRow) => {
    setEditing(u);
    setForm({
      nombre: u.nombre,
      correo: u.correo,
      telefono: u.telefono,
      password: "",
      rol: u.rol,
      estado: u.estado,
    });
    setTouched(false);
    setOpen(true);
  };

  const guardar = async () => {
    if (Object.keys(errores).length) {
      setTouched(true);
      toast.error("Revise los campos marcados.");
      return;
    }

    setSaving(true);
    try {
      if (!editing) {
        if (isSuperAdmin) {
          toast.error("Para un cliente nuevo use Panel SaaS → Nuevo cliente.");
          return;
        }
        if (profile?.rol !== "Administrador") {
          toast.error("No tiene permiso para crear usuarios.");
          return;
        }
        const { data: sess } = await supabase.auth.getSession();
        const accessToken = sess.session?.access_token;
        if (!accessToken) throw new Error("Sesión no válida");

        await createAppUserFn({
          data: {
            accessToken,
            nombre: form.nombre.trim(),
            correo: form.correo.trim(),
            telefono: form.telefono.trim() || undefined,
            password: form.password,
            rol: form.rol,
            empresaId,
          },
        });
        toast.success("Usuario creado correctamente.");
      } else {
        if (editing.es_superadmin && form.rol !== "Administrador") {
          toast.error("No se puede cambiar el rol de un SuperAdmin desde aquí.");
          return;
        }
        const { error } = await supabase
          .from("profiles")
          .update({
            nombre: form.nombre.trim(),
            telefono: form.telefono.trim() || null,
            rol: form.rol,
            estado: form.estado,
          })
          .eq("id", editing.id);

        if (error) throw error;
        toast.success("Usuario actualizado correctamente.");
      }
      setOpen(false);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        kicker="Seguridad"
        title={isSuperAdmin ? "Usuarios de plataforma" : "Usuarios y roles"}
        description={
          isSuperAdmin
            ? "Perfiles de todas las empresas. Para alta de cliente nuevo use Panel SaaS → Nuevo cliente."
            : "Usuarios de su empresa. Cada rol accede solo a los módulos autorizados. Usuarios ilimitados en la empresa."
        }
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="outline" className="gap-2" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            {profile?.rol === "Administrador" && !isSuperAdmin ? (
              <Button onClick={abrirNuevo} className="gap-2">
                <Plus className="size-4" /> Nuevo Usuario
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="panel overflow-hidden">
        <div className="space-y-3 p-3 md:hidden">
          {usuarios.map((u) => (
            <article key={u.id} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{u.nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.correo}</p>
                </div>
                <Badge variant="outline">{u.rol}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">{u.telefono || "Sin teléfono"}</span>
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
                {u.es_superadmin ? (
                  <Badge variant="outline" className="border-primary/40 text-primary">
                    SuperAdmin
                  </Badge>
                ) : null}
              </div>
              {editable ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full gap-2"
                  onClick={() => abrir(u)}
                >
                  <Pencil className="size-4" /> Editar
                </Button>
              ) : null}
            </article>
          ))}
          {!loading && !usuarios.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay usuarios para mostrar.
            </p>
          ) : null}
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando usuarios…</p>
          ) : null}
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
                {editable ? <TableHead className="text-right">Acciones</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/40">
                  <TableCell className="font-medium">
                    <div className="flex flex-wrap items-center gap-2">
                      {u.nombre}
                      {u.es_superadmin ? (
                        <Badge variant="outline" className="border-primary/40 text-primary">
                          SuperAdmin
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{u.correo}</TableCell>
                  <TableCell className="text-sm">{u.telefono || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{u.rol}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        u.estado === "Activo"
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-border bg-muted text-muted-foreground"
                      }
                    >
                      {u.estado}
                    </Badge>
                  </TableCell>
                  {editable ? (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => abrir(u)}>
                          <Pencil className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
              {!loading && !usuarios.length ? (
                <TableRow>
                  <TableCell
                    colSpan={editable ? 6 : 5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No hay usuarios para mostrar.
                  </TableCell>
                </TableRow>
              ) : null}
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={editable ? 6 : 5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Cargando usuarios…
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {isSuperAdmin
          ? "Solo consulta y edición. Para un cliente nuevo use Panel SaaS → Nuevo cliente."
          : profile?.rol === "Administrador"
            ? "Puede crear usuarios con correo y contraseña (usuarios ilimitados en la empresa)."
            : "Solo el Administrador de la empresa puede crear usuarios nuevos."}
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide uppercase">
              {editing ? "Editar Usuario" : "Nuevo Usuario"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? `${editing.correo} — asigne el rol que define los permisos de acceso.`
                : "Crea acceso de login (Auth) y perfil con rol. Usuarios ilimitados por empresa."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre" error={touched ? errores["nombre"] : undefined} full>
              <Input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </Field>
            {!editing ? (
              <Field label="Correo" error={touched ? errores["correo"] : undefined}>
                <Input
                  type="email"
                  value={form.correo}
                  onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
                />
              </Field>
            ) : null}
            <Field label="Teléfono" error={touched ? errores["telefono"] : undefined}>
              <Input
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                placeholder="Opcional"
              />
            </Field>
            {!editing ? (
              <Field label="Contraseña" error={touched ? errores["password"] : undefined}>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                />
              </Field>
            ) : null}
            <Field label="Rol">
              <Select
                value={form.rol}
                onValueChange={(v) => setForm((f) => ({ ...f, rol: v as Role }))}
                disabled={editing?.es_superadmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {editing ? (
              <Field label="Estado">
                <Select
                  value={form.estado}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, estado: v as "Activo" | "Inactivo" }))
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
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void guardar()} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
