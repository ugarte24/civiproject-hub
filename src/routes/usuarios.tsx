import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { useStore, usePermisos, type Role, type Usuario } from "@/lib/store";

export const Route = createFileRoute("/usuarios")({
  head: () => ({
    meta: [
      { title: "Gestión de usuarios y roles — SIGEPROC" },
      {
        name: "description",
        content:
          "Administración de usuarios con roles de Administrador, Ingeniero, Supervisor, Contabilidad y Consulta.",
      },
      { property: "og:title", content: "Usuarios — SIGEPROC" },
      {
        property: "og:description",
        content: "Control de acceso por roles y permisos del sistema.",
      },
    ],
  }),
  component: UsuariosPage,
});

const roles: Role[] = [
  "Administrador",
  "Ingeniero Residente",
  "Supervisor",
  "Contabilidad",
  "Consulta",
];

function UsuariosPage() {
  const { usuarios, addUsuario, updateUsuario, removeUsuario } = useStore();
  const { puedeVer, puedeEditar } = usePermisos();
  const editable = puedeEditar("usuarios");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [touched, setTouched] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    password: "",
    rol: "Consulta" as Role,
    estado: "Activo" as "Activo" | "Inactivo",
  });

  const errores: Record<string, string> = {};
  if (form.nombre.trim().length < 4) errores["nombre"] = "Mínimo 4 caracteres.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) errores["correo"] = "Correo no válido.";
  if (!/^\d{7,15}$/.test(form.telefono)) errores["telefono"] = "Teléfono de 7 a 15 dígitos.";
  if (!editing && form.password.length < 8) errores["password"] = "Mínimo 8 caracteres.";

  if (!puedeVer("usuarios")) return <AccesoDenegado modulo="Usuarios" />;

  const abrir = (u?: Usuario) => {
    setEditing(u ?? null);
    setForm({
      nombre: u?.nombre ?? "",
      correo: u?.correo ?? "",
      telefono: u?.telefono ?? "",
      password: "",
      rol: u?.rol ?? "Consulta",
      estado: u?.estado ?? "Activo",
    });
    setTouched(false);
    setOpen(true);
  };

  const guardar = () => {
    if (Object.keys(errores).length) {
      setTouched(true);
      toast.error("❌ Error al guardar los datos. Revise los campos marcados.");
      return;
    }
    const { password: _p, ...rest } = form;
    if (editing) {
      updateUsuario(editing.id, rest);
      toast.success("✏️ Usuario actualizado correctamente.");
    } else {
      addUsuario(rest);
      toast.success("✅ Usuario registrado correctamente.");
    }
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        kicker="Seguridad"
        title="Usuarios y roles"
        description="Cada rol accede únicamente a los módulos autorizados. Cambie el rol activo desde la barra superior para verificar los permisos."
        action={
          editable ? (
            <Button onClick={() => abrir()} className="gap-2">
              <Plus className="size-4" /> Nuevo Usuario
            </Button>
          ) : null
        }
      />

      <div className="panel overflow-x-auto">
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
                <TableCell className="font-medium">{u.nombre}</TableCell>
                <TableCell className="text-sm">{u.correo}</TableCell>
                <TableCell className="text-sm">{u.telefono}</TableCell>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          removeUsuario(u.id);
                          toast.success("🗑️ Usuario eliminado correctamente.");
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide uppercase">
              {editing ? "Editar Usuario" : "Nuevo Usuario"}
            </DialogTitle>
            <DialogDescription>Asigne el rol que define los permisos de acceso.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre" error={touched ? errores["nombre"] : undefined} full>
              <Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
            </Field>
            <Field label="Correo" error={touched ? errores["correo"] : undefined}>
              <Input value={form.correo} onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))} />
            </Field>
            <Field label="Teléfono" error={touched ? errores["telefono"] : undefined}>
              <Input value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} />
            </Field>
            <Field label="Contraseña" error={touched ? errores["password"] : undefined}>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={editing ? "Dejar vacío para mantener" : "Mínimo 8 caracteres"}
              />
            </Field>
            <Field label="Rol">
              <Select value={form.rol} onValueChange={(v) => setForm((f) => ({ ...f, rol: v as Role }))}>
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
            <Field label="Estado" full>
              <Select
                value={form.estado}
                onValueChange={(v) => setForm((f) => ({ ...f, estado: v as "Activo" | "Inactivo" }))}
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
