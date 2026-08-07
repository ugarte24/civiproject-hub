import packageJson from "../../package.json";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

/** Versión semántica desde package.json (ej. 1.1.0 → v1.1). */
export function getAppVersionLabel(): string {
  const raw = typeof packageJson.version === "string" ? packageJson.version : "0.0.0";
  const [major = "0", minor = "0"] = raw.split(".");
  return `v${major}.${minor}`;
}

/** Mes y año actuales (se actualizan solos). */
export function getAppPeriodLabel(date = new Date()): string {
  return `${MESES[date.getMonth()]} ${date.getFullYear()}`;
}

/** Texto del pie del menú: SIGOC v1.1 · Agosto 2026 */
export function getAppFooterLabel(date = new Date()): string {
  return `SIGOC ${getAppVersionLabel()} · ${getAppPeriodLabel(date)}`;
}
