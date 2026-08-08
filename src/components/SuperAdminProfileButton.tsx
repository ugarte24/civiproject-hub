import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/Field";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function SuperAdminProfileTrigger({
  className,
  onClick,
}: {
  className?: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        className,
      )}
      onClick={onClick}
    >
      <UserCircle className="size-4 shrink-0" />
      <span className="truncate">Mi perfil</span>
    </Button>
  );
}

export function SuperAdminProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    password: "",
    password2: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      nombre: profile?.nombre ?? "",
      telefono: profile?.telefono ?? "",
      password: "",
      password2: "",
    });
    setTouched(false);
  }, [open, profile?.nombre, profile?.telefono]);

  const errores: Record<string, string> = {};
  if (form["nombre"].trim().length < 4) errores["nombre"] = "Mínimo 4 caracteres.";
  if (form["telefono"] && !/^\d{7,15}$/.test(form["telefono"])) {
    errores["telefono"] = "Teléfono de 7 a 15 dígitos.";
  }
  if (form["password"]) {
    if (form["password"].length < 8) errores["password"] = "Mínimo 8 caracteres.";
    if (form["password"] !== form["password2"]) errores["password2"] = "Las contraseñas no coinciden.";
  }

  const guardar = async () => {
    if (!profile?.id) return;
    if (Object.keys(errores).length) {
      setTouched(true);
      toast.error("Revise los campos marcados.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nombre: form["nombre"].trim(),
          telefono: form["telefono"].trim() || null,
        })
        .eq("id", profile.id);
      if (error) throw error;

      if (form["password"]) {
        const { error: authErr } = await supabase.auth.updateUser({
          password: form["password"],
          data: { nombre: form["nombre"].trim() },
        });
        if (authErr) throw authErr;
      } else {
        const { error: metaErr } = await supabase.auth.updateUser({
          data: { nombre: form["nombre"].trim() },
        });
        if (metaErr) console.warn("No se pudo actualizar metadata Auth:", metaErr.message);
      }

      await refreshProfile();
      toast.success("Perfil actualizado.");
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide uppercase">
            Mi perfil
          </DialogTitle>
          <DialogDescription>
            Actualice su nombre, teléfono o contraseña. El correo de acceso no se modifica aquí.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre" error={touched ? errores["nombre"] : undefined} full>
            <Input
              value={form["nombre"]}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            />
          </Field>
          <Field label="Correo">
            <Input value={profile?.correo ?? ""} disabled />
          </Field>
          <Field label="Teléfono" error={touched ? errores["telefono"] : undefined} full>
            <Input
              value={form["telefono"]}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              placeholder="Opcional"
            />
          </Field>
          <Field label="Nueva contraseña" error={touched ? errores["password"] : undefined}>
            <Input
              type="password"
              value={form["password"]}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Dejar vacío para no cambiar"
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirmar contraseña" error={touched ? errores["password2"] : undefined}>
            <Input
              type="password"
              value={form["password2"]}
              onChange={(e) => setForm((f) => ({ ...f, password2: e.target.value }))}
              placeholder="Repetir si cambia"
              autoComplete="new-password"
            />
          </Field>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void guardar()} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
