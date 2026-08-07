export type SuscripcionEstado = "activa" | "vencida" | "gracia" | "cancelada";
export type SuscripcionPeriodo = "mensual" | "anual";

export interface Suscripcion {
  id: string;
  empresa_id: string;
  plan: string;
  periodo: SuscripcionPeriodo;
  precio_mensual: number;
  precio_anual: number;
  max_usuarios: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: SuscripcionEstado;
  notas: string | null;
  empresa_nombre?: string;
}

export function precioPlanLabel(sub: Pick<Suscripcion, "periodo" | "precio_mensual" | "precio_anual">): string {
  if (sub.periodo === "anual") {
    return `Bs ${sub.precio_anual}/año`;
  }
  return `Bs ${sub.precio_mensual}/mes`;
}

export function precioRenovacionDefault(periodo: SuscripcionPeriodo = "mensual"): string {
  return periodo === "anual" ? "Bs 5.500/año" : "Bs 500/mes";
}

export interface SubscriptionStatus {
  /** SuperAdmin no se bloquea por suscripción */
  bypass: boolean;
  loading: boolean;
  suscripcion: Suscripcion | null;
  /** true si puede usar la app */
  vigente: boolean;
  /** días restantes (negativo si venció) */
  diasRestantes: number;
  /** aviso si faltan 1–3 días y aún vigente */
  avisoPronto: boolean;
  fechaFin: string | null;
}

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function todayLocal(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function daysUntil(fechaFin: string): number {
  const fin = parseDateOnly(fechaFin);
  const hoy = todayLocal();
  return Math.round((fin.getTime() - hoy.getTime()) / 86400000);
}

export function computeSubscriptionStatus(
  suscripcion: Suscripcion | null,
  options?: { bypass?: boolean },
): Omit<SubscriptionStatus, "loading"> {
  if (options?.bypass) {
    return {
      bypass: true,
      suscripcion,
      vigente: true,
      diasRestantes: suscripcion ? daysUntil(suscripcion.fecha_fin) : 999,
      avisoPronto: false,
      fechaFin: suscripcion?.fecha_fin ?? null,
    };
  }

  if (!suscripcion) {
    return {
      bypass: false,
      suscripcion: null,
      vigente: false,
      diasRestantes: -999,
      avisoPronto: false,
      fechaFin: null,
    };
  }

  const dias = daysUntil(suscripcion.fecha_fin);
  const vigente =
    dias >= 0 && (suscripcion.estado === "activa" || suscripcion.estado === "gracia");

  return {
    bypass: false,
    suscripcion,
    vigente,
    diasRestantes: dias,
    avisoPronto: vigente && dias <= 3,
    fechaFin: suscripcion.fecha_fin,
  };
}

export function formatFechaBO(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
