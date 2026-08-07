import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatFechaBO, precioPlanLabel, precioRenovacionDefault } from "@/lib/subscription";

/** Banner visible cuando faltan 3 días o menos para el vencimiento. */
export function SubscriptionBanner() {
  const { subscription, isSuperAdmin } = useAuth();

  if (isSuperAdmin || !subscription.avisoPronto || !subscription.fechaFin) {
    return null;
  }

  const dias = subscription.diasRestantes;
  const textoDias =
    dias === 0 ? "hoy" : dias === 1 ? "en 1 día" : `en ${dias} días`;

  const precio =
    subscription.suscripcion != null
      ? precioPlanLabel(subscription.suscripcion)
      : precioRenovacionDefault("mensual");

  return (
    <div
      role="status"
      className="border-b border-warning/40 bg-warning/15 px-3 py-2.5 text-sm text-warning-foreground sm:px-4"
    >
      <div className="mx-auto flex max-w-6xl items-start gap-2 sm:items-center">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 sm:mt-0" />
        <p>
          <strong>Su plan se vence {textoDias}</strong> ({formatFechaBO(subscription.fechaFin)}
          ). Renueve con transferencia/QR de <strong>{precio}</strong> y envíe el comprobante para
          no perder el acceso.
        </p>
      </div>
    </div>
  );
}
