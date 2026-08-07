import { AlertTriangle, LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatFechaBO, precioPlanLabel, precioRenovacionDefault } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";

export function PlanVencido() {
  const { profile, subscription } = useAuth();
  const navigate = useNavigate();
  const precio =
    subscription.suscripcion != null
      ? precioPlanLabel(subscription.suscripcion)
      : precioRenovacionDefault("mensual");

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    toast.message("Sesión cerrada");
    void navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">
      <div className="panel w-full max-w-lg p-6 text-center sm:p-8">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Plan vencido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La suscripción de{" "}
          <strong>{subscription.suscripcion?.empresa_nombre ?? "su empresa"}</strong>{" "}
          no está vigente
          {subscription.fechaFin ? (
            <>
              {" "}
              (venció el <strong>{formatFechaBO(subscription.fechaFin)}</strong>)
            </>
          ) : null}
          .
        </p>
        <div className="mt-4 rounded-md border border-border bg-muted/40 p-4 text-left text-sm">
          <p className="font-medium text-foreground">Para reactivar el acceso:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
            <li>
              Realice la transferencia/QR de <strong>{precio}</strong> (plan Esencial).
            </li>
            <li>Envíe el comprobante por WhatsApp o correo.</li>
            <li>Al confirmar el pago, se extenderá su plan automáticamente.</li>
          </ol>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Usuario: {profile?.correo ?? "—"}
        </p>
        <Button variant="outline" className="mt-6 gap-2" onClick={() => void cerrarSesion()}>
          <LogOut className="size-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
